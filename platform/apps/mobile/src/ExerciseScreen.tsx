import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, StatusBar, Pressable, TextInput,
  KeyboardAvoidingView, Platform, Animated, Easing,
} from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { checkAnswer, xpForCorrect } from '@escolaplay/core';
import type { Exercise, CurriculumPack, UserAnswer } from '@escolaplay/core';
import { colors, radius, space, shadow, shadowSoft, shadowStrong, tint, ease } from './theme';
import { ProgressBar, DecorOrb, PressScale } from './ui';
import { subjectIconName } from './Icon';

const LETTERS = ['A', 'B', 'C', 'D', 'E'];

export function ExerciseScreen({ pack, subjectKey, exerciseIds, sessionTitle, onExit }: {
  pack: CurriculumPack;
  subjectKey: string;
  /** Se presente, restringe a sessão a estes exercícios (em ordem). Caso
   * contrário usa todos os exercícios do subject. Usado pelo modo Curso. */
  exerciseIds?: string[];
  /** Título opcional mostrado no topo (ex: nome da lição). */
  sessionTitle?: string;
  onExit: (xpGained: number, answered: number) => void;
}) {
  const subject = pack.subjects.find((s) => s.key === subjectKey)!;
  const items = useMemo(() => {
    if (exerciseIds && exerciseIds.length > 0) {
      const idSet = new Set(exerciseIds);
      // Mantém a ordem de exerciseIds
      const byId = new Map(pack.exercises.filter((e) => idSet.has(e.id)).map((e) => [e.id, e] as const));
      return exerciseIds.map((id) => byId.get(id)).filter(Boolean) as typeof pack.exercises;
    }
    return pack.exercises.filter((e) => e.subject === subjectKey);
  }, [pack, subjectKey, exerciseIds]);

  const [idx, setIdx] = useState(0);
  const [choice, setChoice] = useState<number | boolean | null>(null);
  const [text, setText] = useState('');
  const [answered, setAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [xpGained, setXpGained] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [finished, setFinished] = useState(false);

  // Animação de entrada da pergunta (slide+fade quando muda idx).
  const slide = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    slide.setValue(0);
    Animated.timing(slide, { toValue: 1, duration: 350, easing: ease.out, useNativeDriver: true }).start();
  }, [idx, slide]);
  const slideY = slide.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });
  const slideOp = slide.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  // Pulse no feedback ao responder.
  const fbScale = useRef(new Animated.Value(0.92)).current;
  useEffect(() => {
    if (!answered) { fbScale.setValue(0.92); return; }
    Animated.spring(fbScale, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 12 }).start();
  }, [answered, fbScale]);

  const ex: Exercise | undefined = items[idx];

  function submit() {
    if (!ex || answered) return;
    const answer: UserAnswer | null = ex.type === 'fill' ? text : choice;
    if (answer === null || (ex.type === 'fill' && !text.trim())) return;
    const ok = checkAnswer(ex, answer);
    setIsCorrect(ok);
    setAnswered(true);
    setAnsweredCount((c) => c + 1);
    if (ok) {
      setXpGained((x) => x + xpForCorrect(ex.difficulty));
      setCorrectCount((c) => c + 1);
    }
  }

  function next() {
    if (idx + 1 >= items.length) { setFinished(true); return; }
    setIdx((i) => i + 1);
    setChoice(null);
    setText('');
    setAnswered(false);
    setIsCorrect(false);
  }

  if (finished || !ex) {
    const perfect = correctCount === items.length;
    const acc = items.length ? Math.round((correctCount / items.length) * 100) : 0;
    return (
      <View style={[s.screen, s.center]}>
        <DecorOrb size={260} top={-40} right={-80} color={subject.color} opacity={0.10} />
        <DecorOrb size={200} bottom={40} left={-60} color={subject.color} opacity={0.07} />

        <View style={[s.summaryEmoji, { backgroundColor: tint(subject.color, 0.10), borderColor: tint(subject.color, 0.25) }]}>
          <Text style={{ fontSize: 60 }}>{perfect ? '🏆' : acc >= 50 ? '🎉' : '💪'}</Text>
        </View>
        <Text style={s.summaryTitle}>Treino concluído!</Text>
        <Text style={s.summaryLine}>{correctCount} de {items.length} certas · {acc}%</Text>
        <View style={[s.xpPill, { backgroundColor: tint(subject.color, 0.12), borderColor: tint(subject.color, 0.35) }]}>
          <FontAwesome5 name="star" size={16} color={subject.color} solid />
          <Text style={[s.xpPillText, { color: subject.color }]}>+{xpGained} XP</Text>
        </View>
        <PressScale
          onPress={() => onExit(xpGained, answeredCount)}
          style={{ alignSelf: 'stretch', marginTop: space.md }}
          scale={0.98}
        >
          <View style={[s.primaryBtn, { backgroundColor: subject.color }, shadowStrong(subject.color)]}>
            <Text style={s.primaryBtnText}>Voltar ao início</Text>
          </View>
        </PressScale>
      </View>
    );
  }

  const hasAnswer = ex.type === 'fill' ? text.trim().length > 0 : choice !== null;
  const progressPct = ((idx + (answered ? 1 : 0)) / items.length) * 100;

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[s.topBar, { backgroundColor: subject.color }]}>
        <StatusBar barStyle="light-content" />
        <DecorOrb size={140} top={-50} right={-30} color={colors.white} opacity={0.14} />
        <DecorOrb size={60} top={20} right={80} color={colors.white} opacity={0.10} />
        <Pressable onPress={() => onExit(xpGained, answeredCount)} hitSlop={12} style={s.closeBtn}>
          <Ionicons name="close" size={24} color={colors.white} />
        </Pressable>
        <View style={{ flex: 1, gap: 4 }}>
          <ProgressBar percent={progressPct} height={10} track="rgba(255,255,255,0.30)" fill={colors.white} shine shineColor="rgba(255,255,255,0.7)" />
          <Text style={s.progressTxt}>{idx + 1} / {items.length}</Text>
        </View>
        <View style={s.xpChip}>
          <FontAwesome5 name="star" size={11} color="#fde047" solid />
          <Text style={s.xpChipText}>{xpGained}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.lg }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Animated.View style={{ gap: space.lg, opacity: slideOp, transform: [{ translateY: slideY }] }}>
          {sessionTitle && (
            <Text style={s.sessionTitle}>{sessionTitle}</Text>
          )}
          <View style={[s.topicChip, { backgroundColor: tint(subject.color, 0.10), borderColor: tint(subject.color, 0.30) }]}>
            <FontAwesome5 name={subjectIconName(subject.icon) as any} size={12} color={subject.color} solid />
            <Text style={[s.topicText, { color: subject.color }]}>{ex.topic}</Text>
          </View>
          <Text style={s.question}>{ex.question}</Text>

          {ex.type === 'mc' && ex.options?.map((opt, i) => {
            const showState = answered && (i === ex.answer || i === choice);
            const right = i === ex.answer;
            const selected = choice === i && !answered;
            return (
              <Pressable
                key={i}
                disabled={answered}
                onPress={() => setChoice(i)}
                style={({ pressed }) => [
                  s.option,
                  selected && [s.optionSel, { borderColor: subject.color, backgroundColor: tint(subject.color, 0.06) }, shadowSoft(subject.color)],
                  showState && (right ? s.optionRight : s.optionWrong),
                  pressed && !answered && { transform: [{ scale: 0.99 }] },
                ]}
              >
                <View style={[
                  s.badge,
                  selected && { backgroundColor: subject.color, borderColor: subject.color },
                  showState && {
                    backgroundColor: right ? colors.success : colors.danger,
                    borderColor: right ? colors.success : colors.danger,
                  },
                ]}>
                  {showState
                    ? <FontAwesome5 name={right ? 'check' : 'times'} size={14} color={colors.white} />
                    : <Text style={[s.badgeText, selected && { color: colors.white }]}>{LETTERS[i]}</Text>}
                </View>
                <Text style={[s.optionText, showState && right && { color: colors.successDeep }, showState && !right && { color: colors.dangerDeep }]}>{opt}</Text>
                {showState && right && <FontAwesome5 name="check-circle" size={18} color={colors.success} solid />}
              </Pressable>
            );
          })}

          {ex.type === 'tf' && [true, false].map((v) => {
            const showState = answered && (v === ex.answer || v === choice);
            const right = v === ex.answer;
            const selected = choice === v && !answered;
            return (
              <Pressable
                key={String(v)}
                disabled={answered}
                onPress={() => setChoice(v)}
                style={({ pressed }) => [
                  s.option,
                  selected && [s.optionSel, { borderColor: subject.color, backgroundColor: tint(subject.color, 0.06) }, shadowSoft(subject.color)],
                  showState && (right ? s.optionRight : s.optionWrong),
                  pressed && !answered && { transform: [{ scale: 0.99 }] },
                ]}
              >
                <View style={[s.badge, { backgroundColor: v ? tint(colors.success, 0.15) : tint(colors.danger, 0.15), borderColor: v ? tint(colors.success, 0.30) : tint(colors.danger, 0.30) }]}>
                  <FontAwesome5 name={v ? 'check' : 'times'} size={14} color={v ? colors.success : colors.danger} />
                </View>
                <Text style={s.optionText}>{v ? 'Verdadeiro' : 'Falso'}</Text>
              </Pressable>
            );
          })}

          {(ex.type === 'fill' || ex.type === 'speak') && (
            <View style={{ gap: 8 }}>
              {ex.type === 'speak' && (
                <View style={[s.speakHint, { backgroundColor: tint(subject.color, 0.10), borderColor: tint(subject.color, 0.30) }]}>
                  <FontAwesome5 name="microphone-alt" size={12} color={subject.color} solid />
                  <Text style={[s.speakHintText, { color: subject.color }]}>
                    {ex.lang ? `Responde em ${ex.lang === 'en-US' ? 'inglês' : ex.lang}` : 'Responde por escrito'}
                  </Text>
                </View>
              )}
              <TextInput
                style={[s.input, answered && (isCorrect ? s.inputRight : s.inputWrong)]}
                value={text}
                onChangeText={setText}
                editable={!answered}
                placeholder={ex.type === 'speak' ? 'Escreve em inglês…' : 'Escreve a tua resposta…'}
                placeholderTextColor={colors.textMuted}
                autoCapitalize={ex.type === 'speak' ? 'sentences' : 'none'}
                autoCorrect={false}
                multiline={ex.type === 'speak'}
                onSubmitEditing={ex.type === 'speak' ? undefined : submit}
              />
              {ex.tip && !answered && (
                <Text style={s.tip}>
                  <FontAwesome5 name="lightbulb" size={10} color={colors.accent} solid /> {' '}
                  {ex.tip}
                </Text>
              )}
            </View>
          )}

          {answered && (
            <Animated.View style={[
              s.feedback,
              { backgroundColor: isCorrect ? colors.successBg : colors.dangerBg, borderColor: isCorrect ? tint(colors.success, 0.35) : tint(colors.danger, 0.35) },
              { transform: [{ scale: fbScale }] },
            ]}>
              <View style={s.feedbackHead}>
                <View style={[s.feedbackIcon, { backgroundColor: isCorrect ? colors.success : colors.danger }]}>
                  <FontAwesome5 name={isCorrect ? 'check' : 'lightbulb'} size={14} color={colors.white} solid />
                </View>
                <Text style={[s.feedbackTitle, { color: isCorrect ? colors.successDeep : colors.dangerDeep }]}>
                  {isCorrect ? 'Boa, acertaste!' : 'Não faz mal — fica a dica:'}
                </Text>
              </View>
              {ex.explanation && <Text style={s.feedbackText}>{ex.explanation}</Text>}
            </Animated.View>
          )}
        </Animated.View>
      </ScrollView>

      <View style={s.footer}>
        <PressScale
          disabled={!answered && !hasAnswer}
          onPress={answered ? next : submit}
          style={{ alignSelf: 'stretch' }}
          scale={0.98}
        >
          <View style={[
            s.primaryBtn,
            { backgroundColor: !answered && !hasAnswer ? '#cbd5e1' : subject.color },
            (answered || hasAnswer) && shadowStrong(subject.color),
          ]}>
            <Text style={s.primaryBtnText}>
              {!answered ? 'Responder' : idx + 1 >= items.length ? 'Terminar' : 'Próximo'}
            </Text>
            {(answered || hasAnswer) && (
              <FontAwesome5 name={answered ? 'arrow-right' : 'check'} size={14} color={colors.white} style={{ marginLeft: 8 }} />
            )}
          </View>
        </PressScale>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xxl },
  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    paddingHorizontal: space.lg, paddingTop: 56, paddingBottom: space.md,
    borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl,
    overflow: 'hidden',
  },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.20)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.30)' },
  progressTxt: { color: 'rgba(255,255,255,0.92)', fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },
  xpChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.30)' },
  xpChipText: { color: colors.white, fontWeight: '900', fontSize: 13 },

  sessionTitle: { fontSize: 13, fontWeight: '900', color: colors.textLight, letterSpacing: 0.4, textTransform: 'uppercase' },
  topicChip: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
  topicText: { fontSize: 13, fontWeight: '800' },
  question: { fontSize: 25, fontWeight: '900', color: colors.text, lineHeight: 33, letterSpacing: -0.4 },

  option: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    backgroundColor: colors.card,
    borderRadius: radius.md, padding: space.lg,
    borderWidth: 2, borderColor: colors.border,
    ...shadow,
  },
  optionSel: { transform: [{ scale: 1.005 }] },
  optionRight: { borderColor: colors.success, backgroundColor: colors.successBg },
  optionWrong: { borderColor: colors.danger, backgroundColor: colors.dangerBg },
  optionText: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.text },

  badge: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#f3f4f6',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#e5e7eb',
  },
  badgeText: { fontSize: 15, fontWeight: '900', color: colors.textLight },

  input: { backgroundColor: colors.card, borderRadius: radius.md, padding: space.lg, borderWidth: 2, borderColor: colors.border, fontSize: 20, fontWeight: '700', color: colors.text, ...shadow, minHeight: 60 },
  inputRight: { borderColor: colors.success, backgroundColor: colors.successBg },
  inputWrong: { borderColor: colors.danger, backgroundColor: colors.dangerBg },
  speakHint: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: radius.pill, borderWidth: 1,
  },
  speakHintText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.3 },
  tip: { fontSize: 12, fontWeight: '700', color: colors.textLight, lineHeight: 17, paddingHorizontal: 4 },

  feedback: { borderRadius: radius.md, padding: space.lg, gap: 10, borderWidth: 1.5 },
  feedbackHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  feedbackIcon: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  feedbackTitle: { fontSize: 16, fontWeight: '900', flex: 1 },
  feedbackText: { fontSize: 15, color: colors.text, lineHeight: 22, fontWeight: '500' },

  footer: { padding: space.lg, paddingBottom: 32 },
  primaryBtn: { flexDirection: 'row', borderRadius: radius.md, paddingVertical: 17, paddingHorizontal: space.xl, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: colors.white, fontSize: 17, fontWeight: '900', letterSpacing: 0.2 },

  summaryEmoji: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  summaryTitle: { fontSize: 26, fontWeight: '900', color: colors.text, letterSpacing: -0.5 },
  summaryLine: { fontSize: 16, color: colors.textLight, fontWeight: '700' },
  xpPill: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.pill, paddingHorizontal: 20, paddingVertical: 9, marginBottom: space.sm, borderWidth: 1.5 },
  xpPillText: { fontSize: 20, fontWeight: '900' },
});
