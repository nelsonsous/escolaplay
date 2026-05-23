import React from 'react';
import { View, Text, ScrollView, StyleSheet, StatusBar, Pressable } from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { levelInfo, levelProgressPercent, subjectAccuracy, subjectMastery } from '@escolaplay/core';
import type { Profile, CurriculumPack, Subject } from '@escolaplay/core';
import { colors, radius, space, shadow, tint } from './theme';
import { ProgressBar, StatPill } from './ui';
import { subjectIconName } from './Icon';

function Header({ profile }: { profile: Profile }) {
  const lvl = levelInfo(profile.xp);
  const pct = levelProgressPercent(profile.xp);
  const totalCorrect = Object.values(profile.subjects).reduce((a, s) => a + s.correct, 0);
  const totalAttempts = Object.values(profile.subjects).reduce((a, s) => a + s.attempts, 0);
  const acc = totalAttempts ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

  return (
    <View style={s.header}>
      <StatusBar barStyle="light-content" />
      <View style={s.decorTop} />
      <View style={s.decorMid} />
      <View style={s.decorBottom} />

      <View style={s.headerTop}>
        <View style={s.headerLeft}>
          <View style={s.avatarRing}>
            <View style={s.avatar}><Text style={{ fontSize: 32 }}>{profile.avatar}</Text></View>
          </View>
          <View style={{ gap: 3 }}>
            <Text style={s.hello}>Olá,</Text>
            <Text style={s.name}>{profile.name}</Text>
          </View>
        </View>
        <Pressable style={s.gear} hitSlop={10}>
          <Ionicons name="settings-sharp" size={20} color={colors.white} />
        </Pressable>
      </View>

      <View style={s.statRow}>
        <StatPill icon={<FontAwesome5 name="star" size={12} color="#fde047" solid />}>{profile.xp}</StatPill>
        <StatPill icon={<FontAwesome5 name="fire" size={12} color="#fdba74" solid />}>{profile.streakDays} dias</StatPill>
        <StatPill icon={<FontAwesome5 name="bullseye" size={12} color="#bbf7d0" solid />}>{acc}%</StatPill>
      </View>

      <View style={s.levelCard}>
        <View style={s.levelRow}>
          <Text style={s.levelName}>{lvl.name}</Text>
          <Text style={s.levelNext}>{lvl.next ? `→ ${lvl.next}` : 'Máximo'}</Text>
        </View>
        <ProgressBar percent={pct} height={12} fill={colors.white} track="rgba(255,255,255,0.3)" />
        <Text style={s.levelCaption}>
          {lvl.next ? `Faltam ${lvl.span - lvl.into} XP` : 'Nível máximo atingido!'}
        </Text>
      </View>
    </View>
  );
}

function DailyGoal({ done, target }: { done: number; target: number }) {
  const pct = Math.min(100, Math.round((done / target) * 100));
  const complete = done >= target;
  return (
    <View style={[s.dailyCard, shadow]}>
      <View style={[s.dailyIcon, { backgroundColor: complete ? tint(colors.success, 0.15) : tint(colors.accent, 0.15) }]}>
        <FontAwesome5 name={complete ? 'check' : 'bolt'} size={20} color={complete ? colors.success : colors.accent} solid />
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <View style={s.dailyTop}>
          <Text style={s.dailyTitle}>Meta diária</Text>
          <Text style={s.dailyCount}>{done}/{target}</Text>
        </View>
        <ProgressBar percent={pct} height={10} track="#f1f3f5" fill={complete ? colors.success : colors.accent} />
        <Text style={s.dailySub}>{complete ? 'Concluída! Parabéns 🎉' : `Faltam ${target - done} exercícios hoje`}</Text>
      </View>
    </View>
  );
}

function SubjectCard({ subject, count, mastery, accuracy, onPress }: {
  subject: Subject; count: number; mastery: number; accuracy: number; onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.card, pressed && { transform: [{ scale: 0.97 }] }]}
    >
      <View style={s.cardTop}>
        <View style={[s.cardIcon, { backgroundColor: subject.color }, shadow]}>
          <FontAwesome5 name={subjectIconName(subject.icon) as any} size={20} color={colors.white} solid />
        </View>
        {accuracy > 0 && (
          <View style={[s.accBadge, { backgroundColor: tint(subject.color, 0.1) }]}>
            <Text style={[s.accText, { color: subject.color }]}>{accuracy}%</Text>
          </View>
        )}
      </View>
      <Text style={s.cardName}>{subject.name}</Text>
      <ProgressBar percent={mastery} height={6} track="#eef0f3" fill={subject.color} />
      <View style={s.cardFooter}>
        <Text style={s.cardMeta}>{count} exercícios</Text>
        <FontAwesome5 name="chevron-right" size={11} color={colors.textMuted} />
      </View>
    </Pressable>
  );
}

export function HomeScreen({ profile, pack, daily, onOpenSubject }: {
  profile: Profile;
  pack: CurriculumPack;
  daily: { done: number; target: number };
  onOpenSubject: (subjectKey: string) => void;
}) {
  const countFor = (k: string) => pack.exercises.filter((e) => e.subject === k).length;
  const rows: Subject[][] = [];
  for (let i = 0; i < pack.subjects.length; i += 2) rows.push(pack.subjects.slice(i, i + 2));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
        <Header profile={profile} />

        <View style={{ paddingHorizontal: space.lg, marginTop: -18 }}>
          <DailyGoal done={daily.done} target={daily.target} />
        </View>

        <View style={{ paddingHorizontal: space.lg, paddingTop: space.xl, gap: space.md }}>
          <View style={s.sectionHead}>
            <Text style={s.sectionTitle}>Disciplinas</Text>
            <Text style={s.sectionBadge}>{pack.label}</Text>
          </View>
          {rows.map((row, i) => (
            <View key={i} style={s.row}>
              {row.map((sub) => {
                const prog = profile.subjects[sub.key];
                return (
                  <SubjectCard
                    key={sub.key}
                    subject={sub}
                    count={countFor(sub.key)}
                    mastery={subjectMastery(prog, countFor(sub.key))}
                    accuracy={subjectAccuracy(prog)}
                    onPress={() => onOpenSubject(sub.key)}
                  />
                );
              })}
              {row.length === 1 && <View style={{ flex: 1 }} />}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: space.lg,
    paddingTop: 58,
    paddingBottom: 34,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    overflow: 'hidden',
  },
  decorTop: { position: 'absolute', top: -60, right: -40, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.13)' },
  decorMid: { position: 'absolute', top: 40, right: 60, width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.08)' },
  decorBottom: { position: 'absolute', bottom: -50, left: -30, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(157,23,77,0.18)' },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  avatarRing: { padding: 3, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.35)' },
  avatar: { width: 62, height: 62, borderRadius: 31, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  hello: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '700' },
  name: { color: colors.white, fontSize: 24, fontWeight: '900', letterSpacing: -0.4 },
  gear: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  statRow: { flexDirection: 'row', gap: space.sm, marginTop: space.lg },
  levelCard: { marginTop: space.lg, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: radius.lg, padding: space.md, gap: 8 },
  levelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  levelName: { color: colors.white, fontSize: 15, fontWeight: '900' },
  levelNext: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '800' },
  levelCaption: { color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: '700' },
  dailyCard: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.card, borderRadius: radius.lg, padding: space.lg, borderWidth: 1, borderColor: colors.border },
  dailyIcon: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  dailyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dailyTitle: { fontSize: 15, fontWeight: '900', color: colors.text },
  dailyCount: { fontSize: 15, fontWeight: '900', color: colors.primaryDark },
  dailySub: { fontSize: 12, fontWeight: '600', color: colors.textLight },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 22, fontWeight: '900', color: colors.text, letterSpacing: -0.5 },
  sectionBadge: { fontSize: 12, fontWeight: '900', color: colors.primaryDark, backgroundColor: colors.primaryLight, paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.pill, overflow: 'hidden' },
  row: { flexDirection: 'row', gap: space.md },
  card: { flex: 1, backgroundColor: colors.card, borderRadius: radius.lg, padding: space.lg, gap: 10, borderWidth: 1, borderColor: colors.border, ...shadow },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardIcon: { width: 50, height: 50, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  accBadge: { borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 3 },
  accText: { fontSize: 11, fontWeight: '900' },
  cardName: { fontSize: 16, fontWeight: '900', color: colors.text, letterSpacing: -0.2 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  cardMeta: { fontSize: 12, fontWeight: '700', color: colors.textLight },
});
