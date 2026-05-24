// Card de lição mostrado dentro da bubble do tutor quando há
// errorAnalysis. Mostra:
//  - Disseste / Correto (lado a lado)
//  - Título da regra + lição pedagógica em PT-PT
//  - Exemplos wrong→right
//  - Botão para praticar 3 exercícios mc focados na regra
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import type { TutorErrorAnalysis } from '@escolaplay/core';
import { colors, radius, space, shadow, shadowSoft, tint } from './theme';
import { PressScale } from './ui';

const TUTOR_COLOR = '#0d9488';

// Cores por categoria para o chip + acentos.
const CATEGORY_COLORS: Record<string, { bg: string; fg: string; border: string }> = {
  tempos_verbais:   { bg: '#fef3c7', fg: '#92400e', border: '#fbbf24' },
  conectores:       { bg: '#ddd6fe', fg: '#5b21b6', border: '#a78bfa' },
  preposicoes:      { bg: '#bfdbfe', fg: '#1e40af', border: '#60a5fa' },
  vocabulario:      { bg: '#bbf7d0', fg: '#14532d', border: '#4ade80' },
  estrutura_frase:  { bg: '#fbcfe8', fg: '#9d174d', border: '#f472b6' },
  artigos:          { bg: '#fed7aa', fg: '#9a3412', border: '#fb923c' },
  modais:           { bg: '#a5f3fc', fg: '#155e75', border: '#22d3ee' },
  outro:            { bg: '#e5e7eb', fg: '#374151', border: '#9ca3af' },
};

function catColors(cat: string) {
  return CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.outro;
}

export function LessonCard({
  analysis,
  originalText,
  correctedText,
  onPractice,
}: {
  analysis: TutorErrorAnalysis;
  originalText: string;
  correctedText: string;
  onPractice?: () => void;
}) {
  const c = catColors(analysis.category);
  const hasPractice = analysis.practice.length > 0;

  return (
    <View style={[s.card, shadow]}>
      <View style={s.head}>
        <View style={s.headIcon}>
          <FontAwesome5 name="book-open" size={13} color={TUTOR_COLOR} solid />
        </View>
        <Text style={s.eyebrow}>VAMOS CORRIGIR</Text>
        <View style={[s.catChip, { backgroundColor: c.bg, borderColor: c.border }]}>
          <Text style={[s.catChipText, { color: c.fg }]}>{analysis.categoryLabel}</Text>
        </View>
      </View>

      {!!originalText && (
        <View style={s.compareBox}>
          <View style={s.compareRow}>
            <View style={[s.compareTag, { backgroundColor: '#fee2e2' }]}>
              <FontAwesome5 name="comment" size={9} color="#991b1b" solid />
              <Text style={[s.compareTagText, { color: '#991b1b' }]}>Disseste</Text>
            </View>
            <Text style={[s.compareText, { color: '#7f1d1d' }]}>{originalText}</Text>
          </View>
          <View style={s.compareDivider} />
          <View style={s.compareRow}>
            <View style={[s.compareTag, { backgroundColor: '#dcfce7' }]}>
              <FontAwesome5 name="check" size={9} color="#166534" solid />
              <Text style={[s.compareTagText, { color: '#166534' }]}>Correto</Text>
            </View>
            <Text style={[s.compareText, { color: '#14532d', fontWeight: '700' }]}>{correctedText}</Text>
          </View>
        </View>
      )}

      <Text style={s.title}>{analysis.title}</Text>
      <Text style={s.lesson}>{analysis.lesson}</Text>

      {analysis.examples.length > 0 && (
        <View style={s.examplesBox}>
          <Text style={s.examplesLabel}>EXEMPLOS</Text>
          {analysis.examples.map((ex, i) => (
            <View key={i} style={s.exampleRow}>
              <View style={[s.exMark, s.exMarkWrong]}><FontAwesome5 name="times" size={9} color="#991b1b" solid /></View>
              <Text style={s.exTextWrong}>{ex.wrong}</Text>
            </View>
          ))}
          {analysis.examples.map((ex, i) => (
            <View key={'r' + i} style={s.exampleRow}>
              <View style={[s.exMark, s.exMarkRight]}><FontAwesome5 name="check" size={9} color="#166534" solid /></View>
              <Text style={s.exTextRight}>{ex.right}</Text>
              {ex.note && <Text style={s.exNote}> · {ex.note}</Text>}
            </View>
          ))}
        </View>
      )}

      {hasPractice && onPractice && (
        <PressScale onPress={onPractice} style={{ width: '100%' }} scale={0.97}>
          <View style={[s.practiceBtn, shadowSoft(TUTOR_COLOR)]}>
            <FontAwesome5 name="dumbbell" size={13} color={colors.white} solid />
            <Text style={s.practiceBtnText}>Praticar agora · {analysis.practice.length} {analysis.practice.length === 1 ? 'exercício' : 'exercícios'}</Text>
            <FontAwesome5 name="arrow-right" size={11} color={colors.white} solid />
          </View>
        </PressScale>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: space.md,
    gap: 10,
    borderLeftWidth: 4,
    borderLeftColor: TUTOR_COLOR,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headIcon: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: tint(TUTOR_COLOR, 0.12),
    alignItems: 'center', justifyContent: 'center',
  },
  eyebrow: { flex: 1, fontSize: 10, fontWeight: '900', letterSpacing: 0.8, color: TUTOR_COLOR },
  catChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, borderWidth: 1 },
  catChipText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.3 },

  compareBox: {
    backgroundColor: '#fafafa',
    borderRadius: radius.sm,
    padding: 10,
    gap: 8,
    borderWidth: 1, borderColor: '#eef0f3',
  },
  compareRow: { gap: 4 },
  compareDivider: { height: 1, backgroundColor: '#e5e7eb' },
  compareTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: radius.pill,
  },
  compareTagText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.3 },
  compareText: { fontSize: 14, lineHeight: 20, fontWeight: '600' },

  title: { fontSize: 15, fontWeight: '900', color: colors.text, marginTop: 4 },
  lesson: { fontSize: 13, lineHeight: 19, fontWeight: '500', color: colors.textLight },

  examplesBox: {
    backgroundColor: tint(TUTOR_COLOR, 0.05),
    borderRadius: radius.sm,
    padding: 10,
    gap: 5,
  },
  examplesLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 0.7, color: TUTOR_COLOR, marginBottom: 4 },
  exampleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  exMark: {
    width: 16, height: 16, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 2,
  },
  exMarkWrong: { backgroundColor: '#fee2e2' },
  exMarkRight: { backgroundColor: '#dcfce7' },
  exTextWrong: { flex: 1, fontSize: 13, fontWeight: '500', color: '#7f1d1d', textDecorationLine: 'line-through' },
  exTextRight: { flex: 1, fontSize: 13, fontWeight: '700', color: '#14532d' },
  exNote: { fontSize: 11, fontWeight: '500', color: colors.textLight },

  practiceBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: TUTOR_COLOR,
    borderRadius: radius.md,
    paddingVertical: 13,
    paddingHorizontal: space.md,
  },
  practiceBtnText: { color: colors.white, fontSize: 14, fontWeight: '900' },
});
