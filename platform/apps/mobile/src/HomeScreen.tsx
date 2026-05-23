import React from 'react';
import { View, Text, ScrollView, StyleSheet, StatusBar, Pressable } from 'react-native';
import { levelInfo, levelProgressPercent } from '@escolaplay/core';
import type { Profile, CurriculumPack, Subject } from '@escolaplay/core';
import { colors } from './theme';

function Header({ profile }: { profile: Profile }) {
  const lvl = levelInfo(profile.xp);
  const pct = levelProgressPercent(profile.xp);
  return (
    <View style={s.header}>
      <StatusBar barStyle="light-content" />
      <View style={s.headerRow}>
        <View style={s.avatar}><Text style={{ fontSize: 28 }}>{profile.avatar}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={s.name}>{profile.name}</Text>
          <Text style={s.levelLabel}>{lvl.name} · 🔥 {profile.streakDays} dias</Text>
        </View>
        <Text style={s.xpBadge}>{profile.xp} XP</Text>
      </View>
      <View style={s.barBg}><View style={[s.barFill, { width: `${pct}%` }]} /></View>
      <Text style={s.barLabel}>{lvl.into}/{lvl.span} XP para {lvl.next ?? 'nível máximo'}</Text>
    </View>
  );
}

function SubjectCard({ subject, count, onPress }: { subject: Subject; count: number; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [s.card, { borderLeftColor: subject.color, opacity: pressed ? 0.85 : 1 }]}
      onPress={onPress}
    >
      <View style={[s.cardIcon, { backgroundColor: subject.color }]}>
        <Text style={{ fontSize: 20 }}>{subject.icon}</Text>
      </View>
      <Text style={s.cardName}>{subject.name}</Text>
      <Text style={s.cardMeta}>{count} exercícios</Text>
    </Pressable>
  );
}

export function HomeScreen({
  profile,
  pack,
  onOpenSubject,
}: {
  profile: Profile;
  pack: CurriculumPack;
  onOpenSubject: (subjectKey: string) => void;
}) {
  const countFor = (key: string) => pack.exercises.filter((e) => e.subject === key).length;
  const rows: Subject[][] = [];
  for (let i = 0; i < pack.subjects.length; i += 2) rows.push(pack.subjects.slice(i, i + 2));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header profile={profile} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text style={s.sectionTitle}>{pack.label} · Disciplinas</Text>
        {rows.map((row, i) => (
          <View key={i} style={s.row}>
            {row.map((sub) => (
              <SubjectCard key={sub.key} subject={sub} count={countFor(sub.key)} onPress={() => onOpenSubject(sub.key)} />
            ))}
            {row.length === 1 && <View style={{ flex: 1 }} />}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingTop: 52, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  avatar: { width: 58, height: 58, borderRadius: 29, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.45)' },
  name: { color: colors.white, fontSize: 18, fontWeight: '800' },
  levelLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 2 },
  xpBadge: { color: colors.white, fontWeight: '900', fontSize: 14 },
  barBg: { height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' },
  barFill: { height: 10, borderRadius: 5, backgroundColor: colors.white },
  barLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.primaryDark, marginBottom: 4 },
  row: { flexDirection: 'row', gap: 12 },
  card: { flex: 1, backgroundColor: colors.card, borderRadius: 14, padding: 14, gap: 6, borderLeftWidth: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardName: { fontSize: 13, fontWeight: '700', color: colors.text },
  cardMeta: { fontSize: 11, color: colors.textLight, fontWeight: '600' },
});
