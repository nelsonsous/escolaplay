import React from 'react';
import { View, Text, ScrollView, StyleSheet, StatusBar, Pressable } from 'react-native';
import { levelInfo, levelProgressPercent } from '@escolaplay/core';
import type { Profile, CurriculumPack, Subject } from '@escolaplay/core';
import { colors, radius, space, shadow, tint } from './theme';

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <View style={s.chip}>
      <Text style={s.chipText}>{children}</Text>
    </View>
  );
}

function Header({ profile }: { profile: Profile }) {
  const lvl = levelInfo(profile.xp);
  const pct = levelProgressPercent(profile.xp);
  return (
    <View style={s.header}>
      <StatusBar barStyle="light-content" />
      {/* circulos decorativos */}
      <View style={s.decorTop} />
      <View style={s.decorBottom} />

      <View style={s.headerRow}>
        <View style={s.avatarRing}>
          <View style={s.avatar}><Text style={{ fontSize: 30 }}>{profile.avatar}</Text></View>
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={s.name}>{profile.name}</Text>
          <View style={s.chipRow}>
            <Chip>⭐ {lvl.name}</Chip>
            <Chip>🔥 {profile.streakDays} dias</Chip>
          </View>
        </View>
      </View>

      <View style={s.xpHeaderRow}>
        <Text style={s.xpLabel}>Nível {lvl.number}</Text>
        <Text style={s.xpValue}>{profile.xp} XP</Text>
      </View>
      <View style={s.barBg}><View style={[s.barFill, { width: `${pct}%` }]} /></View>
      <Text style={s.barCaption}>
        {lvl.next ? `Faltam ${lvl.span - lvl.into} XP para ${lvl.next}` : 'Nível máximo atingido!'}
      </Text>
    </View>
  );
}

function SubjectCard({ subject, count, onPress }: { subject: Subject; count: number; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.card,
        { backgroundColor: tint(subject.color, 0.06) },
        pressed && { transform: [{ scale: 0.97 }] },
      ]}
    >
      <View style={[s.cardIcon, { backgroundColor: subject.color }, shadow]}>
        <Text style={{ fontSize: 24 }}>{subject.icon}</Text>
      </View>
      <Text style={s.cardName}>{subject.name}</Text>
      <View style={s.cardFooter}>
        <Text style={[s.cardMeta, { color: subject.color }]}>{count} exercícios</Text>
        <Text style={[s.cardArrow, { color: subject.color }]}>›</Text>
      </View>
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
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md }} showsVerticalScrollIndicator={false}>
        <Text style={s.sectionTitle}>{pack.label}</Text>
        <Text style={s.sectionSub}>Escolhe uma disciplina para treinar</Text>
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
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: space.lg,
    paddingTop: 56,
    paddingBottom: space.xl,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    overflow: 'hidden',
  },
  decorTop: { position: 'absolute', top: -50, right: -30, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.12)' },
  decorBottom: { position: 'absolute', bottom: -40, left: -20, width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(255,255,255,0.08)' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.lg },
  avatarRing: { padding: 3, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.35)' },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  name: { color: colors.white, fontSize: 22, fontWeight: '900', letterSpacing: -0.3 },
  chipRow: { flexDirection: 'row', gap: space.sm },
  chip: { backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { color: colors.white, fontSize: 12, fontWeight: '800' },
  xpHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 6 },
  xpLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '800' },
  xpValue: { color: colors.white, fontSize: 14, fontWeight: '900' },
  barBg: { height: 12, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.28)', overflow: 'hidden' },
  barFill: { height: 12, borderRadius: radius.pill, backgroundColor: colors.white },
  barCaption: { color: 'rgba(255,255,255,0.95)', fontSize: 12, fontWeight: '700', marginTop: 6 },
  sectionTitle: { fontSize: 24, fontWeight: '900', color: colors.text, letterSpacing: -0.5 },
  sectionSub: { fontSize: 14, color: colors.textLight, fontWeight: '600', marginTop: -6 },
  row: { flexDirection: 'row', gap: space.md },
  card: { flex: 1, borderRadius: radius.lg, padding: space.lg, gap: space.sm, borderWidth: 1, borderColor: colors.border, ...shadow },
  cardIcon: { width: 52, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: space.xs },
  cardName: { fontSize: 16, fontWeight: '800', color: colors.text },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardMeta: { fontSize: 12, fontWeight: '800' },
  cardArrow: { fontSize: 22, fontWeight: '900', marginTop: -4 },
});
