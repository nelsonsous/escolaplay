// Bottom sheet para escolher a voz do tutor.
// Mostra todas as vozes disponíveis (en-US por defeito), agrupadas por
// qualidade. Tocar numa voz selecciona-a; tocar no altifalante ao lado
// faz um sample.
import React, { useEffect, useState } from 'react';
import { View, Text, Modal, Pressable, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { colors, radius, space, shadow, tint } from './theme';
import { PressScale } from './ui';
import { ttsListVoices, ttsSpeak } from './Tts';

const SAMPLE = "Hi! This is how I sound. Let's practise for your meetings.";
const TUTOR_COLOR = '#0d9488';

interface VoiceEntry {
  identifier: string;
  name: string;
  quality: string;
}

export function VoicePicker({
  visible,
  selectedId,
  lang = 'en-US',
  onChoose,
  onClose,
}: {
  visible: boolean;
  selectedId: string | null;
  lang?: string;
  onChoose: (voiceId: string | null) => void;
  onClose: () => void;
}) {
  const [voices, setVoices] = useState<VoiceEntry[] | null>(null);

  useEffect(() => {
    if (!visible) return;
    setVoices(null);
    ttsListVoices(lang).then(setVoices).catch(() => setVoices([]));
  }, [visible, lang]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={s.handle} />
          <View style={s.head}>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>Voz do Tutor</Text>
              <Text style={s.sub}>Vozes em {lang}. Toca no altifalante para ouvir.</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={s.closeBtn}>
              <FontAwesome5 name="times" size={18} color={colors.textLight} />
            </Pressable>
          </View>

          {voices === null ? (
            <View style={s.loading}>
              <ActivityIndicator color={TUTOR_COLOR} />
              <Text style={s.loadingText}>A carregar vozes…</Text>
            </View>
          ) : voices.length === 0 ? (
            <View style={s.empty}>
              <FontAwesome5 name="exclamation-triangle" size={28} color={colors.textMuted} solid />
              <Text style={s.emptyText}>Nenhuma voz {lang} encontrada.</Text>
              <Text style={s.emptyHint}>
                Vai a Definições → Acessibilidade → Conteúdo Falado → Vozes → Inglês e descarrega pelo menos uma.
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ gap: 8, paddingBottom: 24 }}>
              <Row
                isAuto
                active={selectedId === null}
                onChoose={() => onChoose(null)}
              />
              {voices.map((v) => (
                <Row
                  key={v.identifier}
                  voice={v}
                  active={selectedId === v.identifier}
                  onChoose={() => onChoose(v.identifier)}
                />
              ))}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Row({
  voice, isAuto, active, onChoose,
}: {
  voice?: VoiceEntry;
  isAuto?: boolean;
  active: boolean;
  onChoose: () => void;
}) {
  const name = isAuto ? 'Automática (melhor disponível)' : voice!.name;
  const quality = isAuto ? 'AUTO' : voice!.quality.toUpperCase();
  const isPremium = quality === 'PREMIUM';
  const isEnhanced = quality === 'ENHANCED';

  return (
    <PressScale onPress={onChoose} scale={0.98} style={{}}>
      <View style={[
        s.row,
        active && { borderColor: TUTOR_COLOR, backgroundColor: tint(TUTOR_COLOR, 0.06) },
      ]}>
        <View style={[
          s.iconBox,
          isPremium && { backgroundColor: '#fef3c7', borderColor: '#fbbf24' },
          isEnhanced && { backgroundColor: '#e0e7ff', borderColor: '#818cf8' },
        ]}>
          <FontAwesome5
            name={isAuto ? 'magic' : 'microphone-alt'}
            size={14}
            color={isPremium ? '#b45309' : isEnhanced ? '#4338ca' : colors.textLight}
            solid
          />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.rowName}>{name}</Text>
          <View style={s.qualityRow}>
            <View style={[
              s.qualityChip,
              isPremium && { backgroundColor: '#fef3c7' },
              isEnhanced && { backgroundColor: '#e0e7ff' },
              !isPremium && !isEnhanced && !isAuto && { backgroundColor: '#f3f4f6' },
              isAuto && { backgroundColor: tint(TUTOR_COLOR, 0.12) },
            ]}>
              <Text style={[
                s.qualityText,
                { color: isPremium ? '#92400e' : isEnhanced ? '#3730a3' : isAuto ? TUTOR_COLOR : colors.textLight },
              ]}>{quality}</Text>
            </View>
          </View>
        </View>
        {active && (
          <View style={s.activeMark}>
            <FontAwesome5 name="check" size={14} color={TUTOR_COLOR} solid />
          </View>
        )}
        {!isAuto && voice && (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              // Bug-fix: testar EXACTAMENTE esta voz, não a preferida actual.
              ttsSpeak(SAMPLE, 'en-US', voice.identifier);
            }}
            style={s.playBtn}
            hitSlop={8}
          >
            <FontAwesome5 name="play" size={11} color={TUTOR_COLOR} solid />
          </Pressable>
        )}
      </View>
    </PressScale>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(20,12,40,0.50)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: space.lg,
    paddingBottom: 32,
    maxHeight: '85%',
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#d1d5db', alignSelf: 'center', marginBottom: space.md },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, marginBottom: space.md },
  title: { fontSize: 20, fontWeight: '900', color: colors.text, letterSpacing: -0.3 },
  sub: { fontSize: 12, fontWeight: '600', color: colors.textLight, marginTop: 2 },
  closeBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#f3f4f6' },

  loading: { padding: space.xxl, alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 13, fontWeight: '700', color: colors.textLight },

  empty: { padding: space.xxl, alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 15, fontWeight: '900', color: colors.text, textAlign: 'center' },
  emptyHint: { fontSize: 12, fontWeight: '600', color: colors.textLight, textAlign: 'center', lineHeight: 18 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    backgroundColor: colors.card,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    ...shadow,
  },
  iconBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#f3f4f6',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  rowName: { fontSize: 15, fontWeight: '900', color: colors.text },
  qualityRow: { flexDirection: 'row', gap: 6 },
  qualityChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill },
  qualityText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },

  activeMark: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: tint(TUTOR_COLOR, 0.12),
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: tint(TUTOR_COLOR, 0.30),
  },
  playBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: tint(TUTOR_COLOR, 0.10),
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: tint(TUTOR_COLOR, 0.30),
  },
});
