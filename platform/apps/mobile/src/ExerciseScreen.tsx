import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, StatusBar, Pressable, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { checkAnswer, xpForCorrect } from '@escolaplay/core';
import type { Exercise, CurriculumPack, UserAnswer } from '@escolaplay/core';
import { colors } from './theme';

export function ExerciseScreen({
  pack,
  subjectKey,
  onExit,
}: {
  pack: CurriculumPack;
  subjectKey: string;
  onExit: (xpGained: number) => void;
}) {
  const subject = pack.subjects.find((s) => s.key === subjectKey)!;
  const items = useMemo(
    () => pack.exercises.filter((e) => e.subject === subjectKey),
    [pack, subjectKey],
  );

  const [idx, setIdx] = useState(0);
  const [choice, setChoice] = useState<number | boolean | null>(null);
  const [text, setText] = useState('');
  const [answered, setAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [xpGained, setXpGained] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);

  const ex: Exercise | undefined = items[idx];

  function submit() {
    if (!ex || answered) return;
    const answer: UserAnswer | null = ex.type === 'fill' ? text : choice;
    if (answer === null || (ex.type === 'fill' && !text.trim())) return;
    const ok = checkAnswer(ex, answer);
    setIsCorrect(ok);
    setAnswered(true);
    if (ok) {
      setXpGained((x) => x + xpForCorrect(ex.difficulty));
      setCorrectCount((c) => c + 1);
    }
  }

  function next() {
    if (idx + 1 >= items.length) {
      setFinished(true);
      return;
    }
    setIdx((i) => i + 1);
    setChoice(null);
    setText('');
    setAnswered(false);
    setIsCorrect(false);
  }

  if (finished || !ex) {
    return (
      <View style={[s.screen, s.center]}>
        <Text style={{ fontSize: 64 }}>{correctCount === items.length ? '🏆' : '🎉'}</Text>
        <Text style={s.summaryTitle}>Treino concluído!</Text>
        <Text style={s.summaryLine}>{correctCount} de {items.length} certas</Text>
        <Text style={[s.summaryLine, { color: colors.primaryDark, fontWeight: '900' }]}>+{xpGained} XP</Text>
        <Pressable style={s.primaryBtn} onPress={() => onExit(xpGained)}>
          <Text style={s.primaryBtnText}>Voltar ao início</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[s.topBar, { backgroundColor: subject.color }]}>
        <StatusBar barStyle="light-content" />
        <Pressable onPress={() => onExit(xpGained)} hitSlop={12}>
          <Text style={s.close}>✕</Text>
        </Pressable>
        <View style={s.progressBg}>
          <View style={[s.progressFill, { width: `${(idx / items.length) * 100}%` }]} />
        </View>
        <Text style={s.counter}>{idx + 1}/{items.length}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
        <Text style={s.topic}>{subject.icon} {ex.topic}</Text>
        <Text style={s.question}>{ex.question}</Text>

        {ex.type === 'mc' && ex.options?.map((opt, i) => {
          const showState = answered && (i === ex.answer || i === choice);
          const right = i === ex.answer;
          return (
            <Pressable
              key={i}
              disabled={answered}
              onPress={() => setChoice(i)}
              style={[
                s.option,
                choice === i && !answered && s.optionSelected,
                showState && (right ? s.optionRight : s.optionWrong),
              ]}
            >
              <Text style={s.optionText}>{opt}</Text>
            </Pressable>
          );
        })}

        {ex.type === 'tf' && [true, false].map((v) => {
          const showState = answered && (v === ex.answer || v === choice);
          const right = v === ex.answer;
          return (
            <Pressable
              key={String(v)}
              disabled={answered}
              onPress={() => setChoice(v)}
              style={[
                s.option,
                choice === v && !answered && s.optionSelected,
                showState && (right ? s.optionRight : s.optionWrong),
              ]}
            >
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
            placeholder="Escreve a tua resposta"
            placeholderTextColor={colors.textLight}
            autoCapitalize="none"
            autoCorrect={false}
          />
        )}

        {answered && (
          <View style={[s.feedback, { backgroundColor: isCorrect ? colors.successBg : colors.dangerBg }]}>
            <Text style={[s.feedbackTitle, { color: isCorrect ? colors.success : colors.danger }]}>
              {isCorrect ? '✓ Certo!' : '✗ Quase!'}
            </Text>
            {ex.explanation && <Text style={s.feedbackText}>{ex.explanation}</Text>}
          </View>
        )}
      </ScrollView>

      <View style={s.footer}>
        {!answered ? (
          <Pressable style={[s.primaryBtn, { backgroundColor: subject.color }]} onPress={submit}>
            <Text style={s.primaryBtnText}>Responder</Text>
          </Pressable>
        ) : (
          <Pressable style={[s.primaryBtn, { backgroundColor: subject.color }]} onPress={next}>
            <Text style={s.primaryBtnText}>{idx + 1 >= items.length ? 'Terminar' : 'Próximo'}</Text>
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14 },
  close: { color: colors.white, fontSize: 20, fontWeight: '700' },
  progressBg: { flex: 1, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)', overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: colors.white },
  counter: { color: colors.white, fontWeight: '800', fontSize: 13 },
  topic: { fontSize: 13, fontWeight: '700', color: colors.textLight },
  question: { fontSize: 22, fontWeight: '800', color: colors.text, lineHeight: 30 },
  option: { backgroundColor: colors.card, borderRadius: 14, padding: 16, borderWidth: 2, borderColor: '#e5e7eb' },
  optionSelected: { borderColor: colors.primary },
  optionRight: { borderColor: colors.success, backgroundColor: colors.successBg },
  optionWrong: { borderColor: colors.danger, backgroundColor: colors.dangerBg },
  optionText: { fontSize: 16, fontWeight: '600', color: colors.text },
  input: { backgroundColor: colors.card, borderRadius: 14, padding: 16, borderWidth: 2, borderColor: '#e5e7eb', fontSize: 18, color: colors.text },
  inputRight: { borderColor: colors.success, backgroundColor: colors.successBg },
  inputWrong: { borderColor: colors.danger, backgroundColor: colors.dangerBg },
  feedback: { borderRadius: 14, padding: 16, gap: 6 },
  feedbackTitle: { fontSize: 16, fontWeight: '800' },
  feedbackText: { fontSize: 14, color: colors.text, lineHeight: 20 },
  footer: { padding: 16, paddingBottom: 32 },
  primaryBtn: { backgroundColor: colors.primary, borderRadius: 14, padding: 16, alignItems: 'center' },
  primaryBtnText: { color: colors.white, fontSize: 17, fontWeight: '800' },
  summaryTitle: { fontSize: 24, fontWeight: '900', color: colors.text },
  summaryLine: { fontSize: 17, color: colors.textLight, fontWeight: '600' },
});
