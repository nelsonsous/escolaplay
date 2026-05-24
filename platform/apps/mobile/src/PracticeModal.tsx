// Modal full-screen com 3 mini-exercícios mc gerados pelo tutor para
// drillar uma regra específica. Mostra um por vez, feedback imediato,
// e resumo no fim.
import React, { useEffect, useState } from 'react';
import { View, Text, Modal, Pressable, StyleSheet, ScrollView, StatusBar } from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import type { TutorPracticeExercise } from '@escolaplay/core';
import { colors, radius, space, shadow, shadowSoft, shadowStrong, tint } from './theme';
import { ProgressBar, PressScale, DecorOrb } from './ui';

const TUTOR_COLOR = '#0d9488';
const LETTERS = ['A', 'B', 'C', 'D', 'E'];

export function PracticeModal({
  visible,
  title,
  exercises,
  onClose,
}: {
  visible: boolean;
  title: string;
  exercises: TutorPracticeExercise[];
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [finished, setFinished] = useState(false);

  // Reset state quando modal abre/fecha.
  useEffect(() => {
    if (!visible) return;
    setIdx(0); setChoice(null); setAnswered(false); setCorrect(0); setFinished(false);
  }, [visible]);

  const ex = exercises[idx];
  if (!visible || !ex) {
    return null;
  }

  function submit() {
    if (answered || choice === null) return;
    setAnswered(true);
    if (choice === ex!.ans) setCorrect((c) => c + 1);
  }

  function next() {
    if (idx + 1 >= exercises.length) { setFinished(true); return; }
    setIdx((i) => i + 1);
    setChoice(null);
    setAnswered(false);
  }

  const pct = (idx / exercises.length) * 100;
  const isCorrect = answered && choice === ex.ans;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={s.screen}>
        <View style={s.header}>
          <StatusBar barStyle="light-content" />
          <DecorOrb size={160} top={-50} right={-30} color={colors.white} opacity={0.13} />
          <Pressable onPress={onClose} hitSlop={12} style={s.closeBtn}>
            <Ionicons name="close" size={22} color={colors.white} />
          </Pressable>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={s.headerEyebrow}>PRATICAR</Text>
            <Text style={s.headerTitle} numberOfLines={2}>{title}</Text>
          </View>
        </View>

        {!finished ? (
          <>
            <View style={{ paddingHorizontal: space.lg, paddingTop: space.md }}>
              <ProgressBar percent={pct + (answered ? 100 / exercises.length : 0)} height={8} track="#eef0f3" fill={TUTOR_COLOR} />
              <Text style={s.progressTxt}>Exercício {idx + 1} de {exercises.length}</Text>
            </View>

            <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg }} showsVerticalScrollIndicator={false}>
              <Text style={s.question}>{ex.q}</Text>

              {ex.opts.map((opt, i) => {
                const showState = answered && (i === ex.ans || i === choice);
                const right = i === ex.ans;
                const selected = choice === i && !answered;
                return (
                  <Pressable
                    key={i}
                    disabled={answered}
                    onPress={() => setChoice(i)}
                    style={({ pressed }) => [
                      s.option,
                      selected && [s.optionSel, { borderColor: TUTOR_COLOR, backgroundColor: tint(TUTOR_COLOR, 0.06) }, shadowSoft(TUTOR_COLOR)],
                      showState && (right ? s.optionRight : s.optionWrong),
                      pressed && !answered && { transform: [{ scale: 0.99 }] },
                    ]}
                  >
                    <View style={[
                      s.badge,
                      selected && { backgroundColor: TUTOR_COLOR, borderColor: TUTOR_COLOR },
                      showState && {
                        backgroundColor: right ? colors.success : colors.danger,
                        borderColor: right ? colors.success : colors.danger,
                      },
                    ]}>
                      {showState
                        ? <FontAwesome5 name={right ? 'check' : 'times'} size={13} color={colors.white} />
                        : <Text style={[s.badgeText, selected && { color: colors.white }]}>{LETTERS[i]}</Text>}
                    </View>
                    <Text style={[
                      s.optionText,
                      showState && right && { color: colors.successDeep },
                      showState && !right && { color: colors.dangerDeep },
                    ]}>{opt}</Text>
                  </Pressable>
                );
              })}

              {answered && ex.exp && (
                <View style={[s.exp, { backgroundColor: isCorrect ? colors.successBg : colors.dangerBg, borderColor: isCorrect ? tint(colors.success, 0.30) : tint(colors.danger, 0.30) }]}>
                  <FontAwesome5 name={isCorrect ? 'check-circle' : 'lightbulb'} size={14} color={isCorrect ? colors.success : colors.danger} solid />
                  <Text style={[s.expText, { color: isCorrect ? colors.successDeep : colors.dangerDeep }]}>{ex.exp}</Text>
                </View>
              )}
            </ScrollView>

            <View style={s.footer}>
              <PressScale
                disabled={!answered && choice === null}
                onPress={answered ? next : submit}
                style={{ width: '100%' }}
                scale={0.98}
              >
                <View style={[
                  s.primaryBtn,
                  { backgroundColor: (!answered && choice === null) ? '#cbd5e1' : TUTOR_COLOR },
                  (answered || choice !== null) && shadowStrong(TUTOR_COLOR),
                ]}>
                  <Text style={s.primaryBtnText}>
                    {!answered ? 'Responder' : (idx + 1 >= exercises.length ? 'Terminar' : 'Próximo')}
                  </Text>
                </View>
              </PressScale>
            </View>
          </>
        ) : (
          <View style={s.summary}>
            <View style={[s.summaryIcon, { backgroundColor: tint(TUTOR_COLOR, 0.12), borderColor: tint(TUTOR_COLOR, 0.30) }]}>
              <Text style={{ fontSize: 50 }}>{correct === exercises.length ? '🏆' : correct >= exercises.length / 2 ? '🎯' : '💪'}</Text>
            </View>
            <Text style={s.summaryTitle}>Sessão concluída!</Text>
            <Text style={s.summarySub}>{correct} de {exercises.length} certas</Text>
            <PressScale onPress={onClose} style={{ alignSelf: 'stretch', marginTop: space.lg }} scale={0.98}>
              <View style={[s.primaryBtn, { backgroundColor: TUTOR_COLOR }, shadowStrong(TUTOR_COLOR)]}>
                <Text style={s.primaryBtnText}>Voltar ao tutor</Text>
              </View>
            </PressScale>
          </View>
        )}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    backgroundColor: TUTOR_COLOR,
    paddingHorizontal: space.lg, paddingTop: 56, paddingBottom: space.md,
    borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl,
    overflow: 'hidden',
  },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.20)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.30)' },
  headerEyebrow: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
  headerTitle: { color: colors.white, fontSize: 18, fontWeight: '900', letterSpacing: -0.3 },

  progressTxt: { color: colors.textLight, fontSize: 11, fontWeight: '800', marginTop: 6, letterSpacing: 0.3, textAlign: 'center' },

  question: { fontSize: 21, fontWeight: '900', color: colors.text, lineHeight: 29, letterSpacing: -0.3 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    backgroundColor: colors.card,
    borderRadius: radius.md, padding: space.md,
    borderWidth: 2, borderColor: colors.border,
    ...shadow,
  },
  optionSel: {},
  optionRight: { borderColor: colors.success, backgroundColor: colors.successBg },
  optionWrong: { borderColor: colors.danger, backgroundColor: colors.dangerBg },
  optionText: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
  badge: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#e5e7eb',
  },
  badgeText: { fontSize: 13, fontWeight: '900', color: colors.textLight },

  exp: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: space.md, borderRadius: radius.md, borderWidth: 1.5 },
  expText: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 18 },

  footer: { padding: space.lg, paddingBottom: 28 },
  primaryBtn: { borderRadius: radius.md, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: colors.white, fontSize: 16, fontWeight: '900', letterSpacing: 0.2 },

  summary: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xxl, gap: 12 },
  summaryIcon: { width: 110, height: 110, borderRadius: 55, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  summaryTitle: { fontSize: 24, fontWeight: '900', color: colors.text, letterSpacing: -0.5 },
  summarySub: { fontSize: 15, fontWeight: '700', color: colors.textLight },
});
