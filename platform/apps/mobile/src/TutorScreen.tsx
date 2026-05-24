// English Tutor — chat conversacional com IA (Mistral).
// Migra a feature openTutor/_tutorRespond do PWA (app.js).
//
// Fluxo:
//  - Abre com mensagem fixa do tutor (TUTOR_OPENER)
//  - User escreve resposta no input do fundo
//  - Chama callTutor() → mostra reply + corrected + tip
//  - Botão de TTS lê o reply em inglês
//
// Sem key: mostra ecrã de configuração com instruções.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, StyleSheet, StatusBar,
  KeyboardAvoidingView, Platform, Animated, Easing,
} from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { callTutor, TUTOR_OPENER } from '@escolaplay/core';
import type { TutorMessage, TutorReply } from '@escolaplay/core';
import { colors, radius, space, shadow, shadowSoft, shadowStrong, tint } from './theme';
import { PressScale, DecorOrb } from './ui';
import { ttsAvailable, ttsSpeak, ttsStop } from './Tts';
import { MISTRAL_API_KEY } from './secrets';

interface TurnDisplay {
  id: string;
  role: 'student' | 'tutor';
  text: string;
  corrected?: string;
  tip?: string;
}

const TUTOR_COLOR = '#0d9488';
const TUTOR_DEEP = '#115e59';

export function TutorScreen({ onExit }: { onExit: () => void }) {
  const [turns, setTurns] = useState<TurnDisplay[]>([
    { id: 'opener', role: 'tutor', text: TUTOR_OPENER },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  // Auto-scroll quando muda turns.
  useEffect(() => {
    const id = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(id);
  }, [turns.length, busy]);

  useEffect(() => () => { ttsStop(); }, []);

  // Histórico que vai para a IA (sem o corrected/tip — só o que foi "dito").
  const apiHistory = useMemo<TutorMessage[]>(
    () => turns.map((t) => ({ role: t.role, text: t.text })),
    [turns],
  );

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    if (!MISTRAL_API_KEY) {
      setError('Configura a key Mistral em apps/mobile/src/secrets.ts');
      return;
    }
    setInput('');
    setBusy(true);
    setError(null);
    const studentTurn: TurnDisplay = { id: `s${Date.now()}`, role: 'student', text };
    setTurns((prev) => [...prev, studentTurn]);
    try {
      const r: TutorReply = await callTutor({
        apiKey: MISTRAL_API_KEY,
        history: apiHistory,
        userText: text,
      });
      const tutorTurn: TurnDisplay = {
        id: `t${Date.now()}`,
        role: 'tutor',
        text: r.reply,
        corrected: r.corrected || undefined,
        tip: r.tip || undefined,
      };
      setTurns((prev) => [...prev, tutorTurn]);
    } catch (e: any) {
      const msg = e?.message || String(e);
      setError(msg.slice(0, 200));
      setTurns((prev) => [...prev, {
        id: `err${Date.now()}`,
        role: 'tutor',
        text: "Sorry, I didn't catch that. Could you try again?",
      }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.header}>
        <StatusBar barStyle="light-content" />
        <DecorOrb size={180} top={-60} right={-40} color={colors.white} opacity={0.13} />
        <DecorOrb size={120} bottom={-40} left={-30} color="#000" opacity={0.15} />
        <PressScale onPress={onExit} style={s.backBtn} scale={0.92}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </PressScale>
        <View style={s.headerCenter}>
          <View style={s.headerAvatar}>
            <Text style={{ fontSize: 22 }}>🧑‍🏫</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>English Tutor</Text>
            <Text style={s.headerSub}>{busy ? 'A pensar…' : 'pronto para falar'}</Text>
          </View>
        </View>
        <View style={s.aiTag}>
          <FontAwesome5 name="bolt" size={10} color={TUTOR_DEEP} solid />
          <Text style={s.aiTagText}>IA</Text>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: space.lg, gap: space.md }}
        showsVerticalScrollIndicator={false}
      >
        {turns.map((t) => (
          <TurnView key={t.id} turn={t} />
        ))}
        {busy && (
          <View style={s.thinkingRow}>
            <View style={s.thinkingAvatar}><Text>🧑‍🏫</Text></View>
            <View style={s.thinkingBubble}>
              <ThinkingDots />
            </View>
          </View>
        )}
        {error && (
          <View style={s.errorBox}>
            <FontAwesome5 name="exclamation-triangle" size={12} color={colors.danger} solid />
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>

      <View style={s.composer}>
        <TextInput
          style={s.input}
          value={input}
          onChangeText={setInput}
          placeholder="Type in English…"
          placeholderTextColor={colors.textMuted}
          multiline
          editable={!busy}
          onSubmitEditing={send}
          returnKeyType="send"
          blurOnSubmit
        />
        <PressScale
          onPress={send}
          disabled={busy || !input.trim()}
          style={[
            s.sendBtn,
            { backgroundColor: (busy || !input.trim()) ? '#cbd5e1' : TUTOR_COLOR },
            ...(!busy && input.trim() ? [shadowStrong(TUTOR_COLOR)] : []),
          ]}
          scale={0.92}
        >
          <FontAwesome5 name="paper-plane" size={16} color={colors.white} solid />
        </PressScale>
      </View>
    </KeyboardAvoidingView>
  );
}

function TurnView({ turn }: { turn: TurnDisplay }) {
  if (turn.role === 'student') {
    return (
      <View style={s.studentRow}>
        <View style={[s.bubble, s.studentBubble]}>
          <Text style={s.studentText}>{turn.text}</Text>
        </View>
      </View>
    );
  }
  return (
    <View style={s.tutorRow}>
      <View style={s.tutorAvatar}><Text style={{ fontSize: 16 }}>🧑‍🏫</Text></View>
      <View style={{ flex: 1, gap: 6 }}>
        {turn.corrected && (
          <View style={s.correctedBox}>
            <Text style={s.correctedLabel}>✏️ Melhor assim:</Text>
            <Text style={s.correctedText}>{turn.corrected}</Text>
          </View>
        )}
        {turn.tip && (
          <View style={s.tipBox}>
            <Text style={s.tipText}>💡 {turn.tip}</Text>
          </View>
        )}
        <View style={[s.bubble, s.tutorBubble]}>
          <Text style={s.tutorText}>{turn.text}</Text>
          {ttsAvailable() && (
            <PressScale
              onPress={() => ttsSpeak(turn.text, 'en-US')}
              style={s.playBtn}
              scale={0.85}
            >
              <FontAwesome5 name="volume-up" size={12} color={colors.white} solid />
            </PressScale>
          )}
        </View>
      </View>
    </View>
  );
}

function ThinkingDots() {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  return (
    <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
      <Animated.View style={[s.dot, { opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }]} />
      <Animated.View style={[s.dot, { opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0.3] }) }]} />
      <Animated.View style={[s.dot, { opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0.4] }) }]} />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    backgroundColor: TUTOR_COLOR,
    paddingHorizontal: space.lg, paddingTop: 56, paddingBottom: space.md,
    borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg,
    overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.20, shadowRadius: 18, shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.30)' },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.30)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: colors.white, fontSize: 18, fontWeight: '900', letterSpacing: -0.3 },
  headerSub: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '700' },
  aiTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  aiTagText: { color: TUTOR_DEEP, fontSize: 11, fontWeight: '900' },

  tutorRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  tutorAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: tint(TUTOR_COLOR, 0.12),
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: tint(TUTOR_COLOR, 0.30),
    marginBottom: 4,
  },
  studentRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  bubble: { padding: 12, borderRadius: 16, ...shadow },
  tutorBubble: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 4,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  tutorText: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text, lineHeight: 21 },
  playBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: TUTOR_COLOR,
    alignItems: 'center', justifyContent: 'center',
  },
  studentBubble: {
    backgroundColor: TUTOR_COLOR,
    borderTopRightRadius: 4,
    maxWidth: '85%',
  },
  studentText: { color: colors.white, fontSize: 15, fontWeight: '700', lineHeight: 21 },

  correctedBox: {
    backgroundColor: '#fef3c7',
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
    padding: 10,
    borderRadius: 8,
  },
  correctedLabel: { fontSize: 11, fontWeight: '900', color: '#92400e', marginBottom: 2 },
  correctedText: { fontSize: 14, fontWeight: '700', color: '#78350f', lineHeight: 19 },
  tipBox: {
    backgroundColor: tint(TUTOR_COLOR, 0.10),
    paddingHorizontal: 10, paddingVertical: 8,
    borderRadius: 8,
  },
  tipText: { fontSize: 12, fontWeight: '700', color: TUTOR_DEEP, lineHeight: 17 },

  thinkingRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  thinkingAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: tint(TUTOR_COLOR, 0.12),
    alignItems: 'center', justifyContent: 'center',
  },
  thinkingBubble: {
    backgroundColor: colors.card,
    paddingHorizontal: 16, paddingVertical: 14,
    borderRadius: 16, borderTopLeftRadius: 4,
    ...shadow,
  },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: TUTOR_COLOR },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.dangerBg,
    padding: 10, borderRadius: 8,
    borderLeftWidth: 3, borderLeftColor: colors.danger,
  },
  errorText: { flex: 1, color: colors.dangerDeep, fontSize: 12, fontWeight: '700' },

  composer: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-end',
    padding: space.md,
    paddingBottom: 28,
    backgroundColor: colors.card,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    maxHeight: 100,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
});
