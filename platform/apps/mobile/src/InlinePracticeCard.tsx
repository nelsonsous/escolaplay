// Card de exercício prático que aparece INLINE no chat (em vez de modal).
// Cada turn de prática renderiza um destes; o estado vem do TurnDisplay.
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import type { TutorPracticeExercise } from '@escolaplay/core';
import { colors, radius, space, shadow, tint } from './theme';

const TUTOR_COLOR = '#0d9488';
const LETTERS = ['A', 'B', 'C', 'D', 'E'];

export function InlinePracticeCard({
  exercise,
  indexInBatch,
  totalInBatch,
  state,
  chosenIdx,
  onAnswer,
}: {
  exercise: TutorPracticeExercise;
  indexInBatch: number;
  totalInBatch: number;
  state: 'pending' | 'answered';
  chosenIdx?: number;
  onAnswer: (idx: number) => void;
}) {
  const answered = state === 'answered';
  const isCorrect = answered && chosenIdx === exercise.ans;

  return (
    <View style={[s.card, shadow, answered && (isCorrect ? s.cardRight : s.cardWrong)]}>
      <View style={s.header}>
        <FontAwesome5 name="dumbbell" size={11} color={TUTOR_COLOR} solid />
        <Text style={s.headerText}>
          EXERCÍCIO {indexInBatch + 1} / {totalInBatch}
        </Text>
        {answered && (
          <View style={[s.statusChip, { backgroundColor: isCorrect ? colors.successBg : colors.dangerBg }]}>
            <FontAwesome5
              name={isCorrect ? 'check' : 'times'}
              size={9}
              color={isCorrect ? colors.successDeep : colors.dangerDeep}
              solid
            />
            <Text style={[s.statusText, { color: isCorrect ? colors.successDeep : colors.dangerDeep }]}>
              {isCorrect ? 'Certo' : 'Errado'}
            </Text>
          </View>
        )}
      </View>

      <Text style={s.question}>{exercise.q}</Text>

      <View style={{ gap: 8 }}>
        {exercise.opts.map((opt, i) => {
          const showState = answered && (i === exercise.ans || i === chosenIdx);
          const right = i === exercise.ans;
          return (
            <Pressable
              key={i}
              disabled={answered}
              onPress={() => onAnswer(i)}
              style={({ pressed }) => [
                s.option,
                showState && (right ? s.optionRight : s.optionWrong),
                pressed && !answered && { transform: [{ scale: 0.99 }] },
              ]}
            >
              <View style={[
                s.badge,
                showState && {
                  backgroundColor: right ? colors.success : colors.danger,
                  borderColor: right ? colors.success : colors.danger,
                },
              ]}>
                {showState ? (
                  <FontAwesome5 name={right ? 'check' : 'times'} size={11} color={colors.white} />
                ) : (
                  <Text style={s.badgeText}>{LETTERS[i]}</Text>
                )}
              </View>
              <Text style={[
                s.optionText,
                showState && right && { color: colors.successDeep, fontWeight: '800' },
                showState && !right && { color: colors.dangerDeep },
              ]}>
                {opt}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {answered && exercise.exp && (
        <View style={[s.exp, { backgroundColor: isCorrect ? colors.successBg : colors.dangerBg }]}>
          <FontAwesome5
            name={isCorrect ? 'lightbulb' : 'graduation-cap'}
            size={11}
            color={isCorrect ? colors.successDeep : colors.dangerDeep}
            solid
          />
          <Text style={[s.expText, { color: isCorrect ? colors.successDeep : colors.dangerDeep }]}>
            {exercise.exp}
          </Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderTopLeftRadius: 4,
    padding: space.md,
    gap: 10,
    borderWidth: 1.5,
    borderColor: tint(TUTOR_COLOR, 0.25),
  },
  cardRight: { borderColor: tint(colors.success, 0.40) },
  cardWrong: { borderColor: tint(colors.danger, 0.40) },

  header: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerText: { flex: 1, fontSize: 10, fontWeight: '900', letterSpacing: 0.8, color: TUTOR_COLOR },
  statusChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: radius.pill,
  },
  statusText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.3 },

  question: { fontSize: 15, fontWeight: '800', color: colors.text, lineHeight: 21, letterSpacing: -0.2 },

  option: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fafafa',
    paddingHorizontal: 10, paddingVertical: 10,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: '#eef0f3',
  },
  optionRight: { borderColor: colors.success, backgroundColor: colors.successBg },
  optionWrong: { borderColor: colors.danger, backgroundColor: colors.dangerBg },
  optionText: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text },

  badge: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  badgeText: { fontSize: 11, fontWeight: '900', color: colors.textLight },

  exp: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    padding: 8,
    borderRadius: radius.sm,
  },
  expText: { flex: 1, fontSize: 12, fontWeight: '600', lineHeight: 17 },
});
