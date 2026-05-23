import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, StatusBar, Pressable, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { checkAnswer, xpForCorrect } from '@escolaplay/core';
import type { Exercise, CurriculumPack, UserAnswer } from '@escolaplay/core';
import { colors, radius, space, shadow, shadowStrong, tint } from './theme';
import { ProgressBar } from './ui';
import { subjectIconName } from './Icon';

const LETTERS = ['A', 'B', 'C', 'D', 'E'];

export function ExerciseScreen({ pack, subjectKey, onExit }: {
  pack: CurriculumPack;
  subjectKey: string;
  onExit: (xpGained: number, answered: number) => void;
}) {
  const subject = pack.subjects.find((s) => s.key === subjectKey)!;
  const items = useMemo(() => pack.exercises.filter((e) => e.subject === subjectKey), [pack, subjectKey]);

  const [idx, setIdx] = useState(0);
  const [choice, setChoice] = useState<number | boolean | null>(null);
  const [text, setText] = useState('');
  const [answered, setAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [xpGained, setXpGained] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [finished, setFinished] = useState(false);

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
        <View style={[s.summaryEmoji, { backgroundColor: tint(subject.color, 0.12) }]}>
          <Text style={{ fontSize: 60 }}>{perfect ? '🏆' : acc >= 50 ? '🎉' : '💪'}</Text>
        </View>
        <Text style={s.summaryTitle}>Treino concluído!</Text>
        <Text style={s.summaryLine}>{correctCount} de {items.length} certas · {acc}%</Text>
        <View style={[s.xpPill, { backgroundColor: tint(subject.color, 0.12) }]}>
          <FontAwesome5 name="star" size={16} color={subject.color} solid />
          <Text style={[s.xpPillText, { color: subject.color }]}>+{xpGained} XP</Text>
        </View>
        <Pressable
          style={({ pressed }) => [s.primaryBtn, { backgroundColor: subject.color }, shadowStrong(subject.color), pressed && { transform: [{ scale: 0.98 }] }]}
          onPress={() => onExit(xpGained, answeredCount)}
        >
          <Text style={s.primaryBtnText}>Voltar ao início</Text>
        </Pressable>
      </View>
    );
  }

  const hasAnswer = ex.type === 'fill' ? text.trim().length > 0 : choice !== null;
  const progressPct = ((idx + (answered ? 1 : 0)) / items.length) * 100;

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[s.topBar, { backgroundColor: subject.color }]}>
        <StatusBar barStyle="light-content" />
        <Pressable onPress={() => onExit(xpGained, answeredCount)} hitSlop={12} style={s.closeBtn}>
          <Ionicons name="close" size={24} color={colors.white} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <ProgressBar percent={progressPct} height={10} track="rgba(255,255,255,0.35)" fill={colors.white} />
        </View>
        <View style={s.xpChip}>
          <FontAwesome5 name="star" size={11} color="#fde047" solid />
          <Text style={s.xpChipText}>{xpGained}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.lg }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={[s.topicChip, { backgroundColor: tint(subject.color, 0.1) }]}>
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
                selected && { borderColor: subject.color, backgroundColor: tint(subject.color, 0.06) },
                showState && (right ? s.optionRight : s.optionWrong),
                pressed && !answered && { transform: [{ scale: 0.99 }] },
              ]}
            >
              <View style={[
                s.badge,
                selected && { backgroundColor: subject.color },
                showState && { backgroundColor: right ? colors.success : colors.danger },
              ]}>
                {showState
                  ? <FontAwesome5 name={right ? 'check' : 'times'} size={14} color={colors.white} />
                  : <Text style={[s.badgeText, selected && { color: colors.white }]}>{LETTERS[i]}</Text>}
              </View>
              <Text style={s.optionText}>{opt}</Text>
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
              style={[
                s.option,
                selected && { borderColor: subject.color, backgroundColor: tint(subject.color, 0.06) },
                showState && (right ? s.optionRight : s.optionWrong),
              ]}
            >
              <View style={[s.badge, { backgroundColor: v ? tint(colors.success, 0.15) : tint(colors.danger, 0.15) }]}>
                <FontAwesome5 name={v ? 'check' : 'times'} size={14} color={v ? colors.success : colors.danger} />
              </View>
              <Text style={s.optionText}>{v ? 'Verdadeiro' : 'Falso'}</Text>
            </Pressable>
          );
        })}

        {ex.type === 'fill' && (
          <TextInput
            style={[s.input, answered && (isCorrect ? s.inputRight : s.inputWrong)]}
            value={text}
            onChangeText={setText}
            editable={!answered}
            placeholder="Escreve a tua resposta…"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={submit}
          />
        )}

        {answered && (
          <View style={[s.feedback, { backgroundColor: isCorrect ? colors.successBg : colors.dangerBg }]}>
            <View style={s.feedbackHead}>
              <FontAwesome5 name={isCorrect ? 'check-circle' : 'lightbulb'} size={18} color={isCorrect ? colors.success : colors.danger} solid />
              <Text style={[s.feedbackTitle, { color: isCorrect ? colors.success : colors.danger }]}>
                {isCorrect ? 'Boa, acertaste!' : 'Não faz mal — fica a dica:'}
              </Text>
            </View>
            {ex.explanation && <Text style={s.feedbackText}>{ex.explanation}</Text>}
          </View>
        )}
      </ScrollView>

      <View style={s.footer}>
        <Pressable
          disabled={!answered && !hasAnswer}
          onPress={answered ? next : submit}
          style={({ pressed }) => [
            s.primaryBtn,
            { backgroundColor: !answered && !hasAnswer ? colors.textMuted : subject.color },
            (answered || hasAnswer) && shadowStrong(subject.color),
            pressed && { transform: [{ scale: 0.98 }] },
          ]}
        >
          <Text style={s.primaryBtnText}>
            {!answered ? 'Responder' : idx + 1 >= items.length ? 'Terminar' : 'Próximo'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xxl },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingTop: 56, paddingBottom: space.md, borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg },
  closeBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  xpChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  xpChipText: { color: colors.white, fontWeight: '900', fontSize: 13 },
  topicChip: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  topicText: { fontSize: 13, fontWeight: '800' },
  question: { fontSize: 25, fontWeight: '900', color: colors.text, lineHeight: 33, letterSpacing: -0.4 },
  option: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.card, borderRadius: radius.md, padding: space.lg, borderWidth: 2, borderColor: colors.border, ...shadow },
  optionRight: { borderColor: colors.success, backgroundColor: colors.successBg },
  optionWrong: { borderColor: colors.danger, backgroundColor: colors.dangerBg },
  optionText: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.text },
  badge: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#f1f3f5', alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 15, fontWeight: '900', color: colors.textLight },
  input: { backgroundColor: colors.card, borderRadius: radius.md, padding: space.lg, borderWidth: 2, borderColor: colors.border, fontSize: 20, fontWeight: '700', color: colors.text, ...shadow },
  inputRight: { borderColor: colors.success, backgroundColor: colors.successBg },
  inputWrong: { borderColor: colors.danger, backgroundColor: colors.dangerBg },
  feedback: { borderRadius: radius.md, padding: space.lg, gap: 8 },
  feedbackHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  feedbackTitle: { fontSize: 16, fontWeight: '900' },
  feedbackText: { fontSize: 15, color: colors.text, lineHeight: 22, fontWeight: '500' },
  footer: { padding: space.lg, paddingBottom: 32 },
  primaryBtn: { borderRadius: radius.md, paddingVertical: 17, paddingHorizontal: space.xl, alignItems: 'center', alignSelf: 'stretch' },
  primaryBtnText: { color: colors.white, fontSize: 17, fontWeight: '900', letterSpacing: 0.2 },
  summaryEmoji: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center' },
  summaryTitle: { fontSize: 26, fontWeight: '900', color: colors.text, letterSpacing: -0.5 },
  summaryLine: { fontSize: 16, color: colors.textLight, fontWeight: '700' },
  xpPill: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.pill, paddingHorizontal: 20, paddingVertical: 9, marginBottom: space.sm },
  xpPillText: { fontSize: 20, fontWeight: '900' },
});
