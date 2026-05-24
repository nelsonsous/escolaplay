// "Falar com o Professor" — card no Home que resolve perguntas em
// linguagem natural contra o pack ativo. Migra a ask card do PWA.
import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Animated, Easing } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { askLocalResolve, askSuggestions, exercisesForTopic } from '@escolaplay/core';
import type { AskResult, CurriculumPack } from '@escolaplay/core';
import { colors, radius, space, shadow, shadowSoft, tint } from './theme';
import { PressScale } from './ui';
import { subjectIconName } from './Icon';

export function AskCard({
  pack,
  onOpenSubject,
}: {
  pack: CurriculumPack;
  onOpenSubject?: (subjectKey: string) => void;
}) {
  const [q, setQ] = useState('');
  const [result, setResult] = useState<AskResult | null>(null);
  const suggestions = useMemo(() => askSuggestions(pack, 3), [pack]);

  const resultFade = React.useRef(new Animated.Value(0)).current;

  function ask(question?: string) {
    const query = (question ?? q).trim();
    if (!query) return;
    setQ(query);
    const r = askLocalResolve(pack, query);
    setResult(r);
    resultFade.setValue(0);
    Animated.timing(resultFade, {
      toValue: 1, duration: 360,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      useNativeDriver: true,
    }).start();
  }

  return (
    <View style={[s.card, shadow]}>
      <View style={s.header}>
        <View style={s.iconWrap}>
          <FontAwesome5 name="comments" size={18} color={colors.primary} solid />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.eyebrow}>FALAR COM O PROFESSOR</Text>
          <Text style={s.title}>Tens uma dúvida?</Text>
          <Text style={s.sub}>Pergunta em linguagem normal — eu procuro no teu curso.</Text>
        </View>
      </View>

      <View style={s.inputRow}>
        <TextInput
          style={s.input}
          value={q}
          onChangeText={setQ}
          placeholder="Ex: o que significa narrativa?"
          placeholderTextColor={colors.textMuted}
          maxLength={200}
          returnKeyType="search"
          onSubmitEditing={() => ask()}
        />
        <PressScale onPress={() => ask()} style={s.sendBtn} scale={0.94}>
          <FontAwesome5 name="paper-plane" size={16} color={colors.white} solid />
        </PressScale>
      </View>

      {!result && suggestions.length > 0 && (
        <View style={s.examplesRow}>
          {suggestions.map((sug) => (
            <PressScale key={sug} onPress={() => ask(sug)} style={s.exampleChip} scale={0.96}>
              <Text style={s.exampleText} numberOfLines={1}>{sug}</Text>
            </PressScale>
          ))}
        </View>
      )}

      {result && (
        <Animated.View style={[s.result, { opacity: resultFade, transform: [{ translateY: resultFade.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }]}>
          <View style={s.resultQuote}>
            <FontAwesome5 name="quote-left" size={11} color={colors.textMuted} solid />
            <Text style={s.resultQuoteText} numberOfLines={2}>{result.query}</Text>
          </View>
          <Text style={s.resultAnswer}>{result.answer}</Text>

          {result.topMatch && (
            <View style={s.tagsRow}>
              <View style={[s.tag, { backgroundColor: tint(result.topMatch.subject.color, 0.14), borderColor: tint(result.topMatch.subject.color, 0.35) }]}>
                <FontAwesome5
                  name={subjectIconName(result.topMatch.subject.icon) as any}
                  size={11}
                  color={result.topMatch.subject.color}
                  solid
                />
                <Text style={[s.tagText, { color: result.topMatch.subject.color }]}>
                  {result.topMatch.subject.name}
                </Text>
              </View>
              {result.matches.slice(0, 2).map((m) => (
                <View key={m.topic} style={s.topicTag}>
                  <Text style={s.topicTagText} numberOfLines={1}>{m.topic}</Text>
                </View>
              ))}
            </View>
          )}

          {result.topMatch && onOpenSubject && (
            <PressScale
              onPress={() => onOpenSubject(result.topMatch!.subjectKey)}
              style={[s.cta, { backgroundColor: result.topMatch.subject.color }, shadowSoft(result.topMatch.subject.color)]}
              scale={0.98}
            >
              <FontAwesome5 name="dumbbell" size={13} color={colors.white} solid />
              <Text style={s.ctaText}>
                Treinar {result.topMatch.subject.name}
                {result.topMatch.topic ? ` · ${exercisesForTopic(pack, result.topMatch.subjectKey, result.topMatch.topic)} exercícios` : ''}
              </Text>
            </PressScale>
          )}

          <Text style={s.footer}>Pesquisa local no currículo (sem IA)</Text>
        </Animated.View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    gap: space.md,
    overflow: 'hidden',
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  iconWrap: {
    width: 44, height: 44, borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: tint(colors.primary, 0.30),
  },
  eyebrow: { fontSize: 10, fontWeight: '900', letterSpacing: 0.8, color: colors.primaryDark, textTransform: 'uppercase' },
  title: { fontSize: 17, fontWeight: '900', color: colors.text, letterSpacing: -0.3, marginTop: 2 },
  sub: { fontSize: 12, fontWeight: '600', color: colors.textLight, marginTop: 2 },

  inputRow: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  input: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: space.md,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary, shadowOpacity: 0.40, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },

  examplesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  exampleChip: {
    backgroundColor: '#f3f4f6',
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  exampleText: { fontSize: 12, fontWeight: '700', color: colors.textLight },

  result: { gap: 10, marginTop: 4 },
  resultQuote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fafafa',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  resultQuoteText: { flex: 1, fontSize: 12, fontWeight: '700', color: colors.textLight, fontStyle: 'italic' },
  resultAnswer: { fontSize: 14, fontWeight: '600', color: colors.text, lineHeight: 20 },

  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: radius.pill, borderWidth: 1,
  },
  tagText: { fontSize: 11, fontWeight: '900' },
  topicTag: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: radius.pill,
  },
  topicTagText: { fontSize: 11, fontWeight: '700', color: colors.textLight },

  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 12, borderRadius: radius.md,
  },
  ctaText: { color: colors.white, fontSize: 14, fontWeight: '900' },

  footer: { fontSize: 10, fontWeight: '700', color: colors.textMuted, textAlign: 'center', marginTop: 4 },
});
