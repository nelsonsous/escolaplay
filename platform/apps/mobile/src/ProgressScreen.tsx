import React from 'react';
import { View, Text, ScrollView, StyleSheet, StatusBar } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { levelInfo, subjectAccuracy, subjectMastery } from '@escolaplay/core';
import type { Profile, CurriculumPack } from '@escolaplay/core';
import { colors, radius, space, shadow, shadowSoft, tint } from './theme';
import { ProgressBar, DecorOrb } from './ui';
import { subjectIconName } from './Icon';
import { TAB_BAR_HEIGHT } from './TabBar';

function StatCard({ icon, color, value, label }: { icon: string; color: string; value: string; label: string }) {
  return (
    <View style={[s.statCard, shadow]}>
      <View style={[s.statStripe, { backgroundColor: color }]} />
      <View style={[s.statIcon, { backgroundColor: tint(color, 0.12), borderColor: tint(color, 0.25) }]}>
        <FontAwesome5 name={icon as any} size={18} color={color} solid />
      </View>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

export function ProgressScreen({ profile, pack }: { profile: Profile; pack: CurriculumPack }) {
  const lvl = levelInfo(profile.xp);
  const subjectsArr = Object.values(profile.subjects);
  const totalCorrect = subjectsArr.reduce((a, s) => a + s.correct, 0);
  const totalAttempts = subjectsArr.reduce((a, s) => a + s.attempts, 0);
  const acc = totalAttempts ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={s.header}>
        <StatusBar barStyle="light-content" />
        <DecorOrb size={200} top={-70} right={-50} color={colors.white} opacity={0.13} />
        <DecorOrb size={140} bottom={-50} left={-30} color={colors.primaryDeep} opacity={0.28} />
        <DecorOrb size={70} top={50} left={40} color="#fde047" opacity={0.12} />
        <Text style={s.headerTitle}>O teu progresso</Text>
        <View style={s.headerSubRow}>
          <View style={s.levelBadge}>
            <Text style={s.levelBadgeText}>Lv {lvl.number}</Text>
          </View>
          <Text style={s.headerSub}>{lvl.name}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: space.lg, paddingBottom: TAB_BAR_HEIGHT + 24, gap: space.lg }}>
        <View style={s.statGrid}>
          <StatCard icon="star" color={colors.accent} value={`${profile.xp}`} label="XP total" />
          <StatCard icon="fire" color="#f97316" value={`${profile.streakDays}`} label="dias seguidos" />
          <StatCard icon="check-double" color={colors.success} value={`${totalCorrect}`} label="acertos" />
          <StatCard icon="bullseye" color={colors.primary} value={`${acc}%`} label="precisão" />
        </View>

        <Text style={s.sectionTitle}>Por disciplina</Text>
        <View style={{ gap: space.md }}>
          {pack.subjects.map((sub) => {
            const prog = profile.subjects[sub.key];
            const total = pack.exercises.filter((e) => e.subject === sub.key).length;
            const mastery = subjectMastery(prog, total);
            return (
              <View key={sub.key} style={[s.subjRow, shadow]}>
                <View style={[s.subjStripe, { backgroundColor: sub.color }]} />
                <View style={[s.subjIcon, { backgroundColor: sub.color }, shadowSoft(sub.color)]}>
                  <FontAwesome5 name={subjectIconName(sub.icon) as any} size={18} color={colors.white} solid />
                </View>
                <View style={{ flex: 1, gap: 6 }}>
                  <View style={s.subjTop}>
                    <Text style={s.subjName}>{sub.name}</Text>
                    <Text style={[s.subjPct, { color: sub.color }]}>{mastery}%</Text>
                  </View>
                  <ProgressBar percent={mastery} height={8} track="#eef0f3" fill={sub.color} />
                  <Text style={s.subjMeta}>
                    {prog ? `${prog.correct}/${prog.attempts} certas · ${subjectAccuracy(prog)}% precisão` : 'Ainda sem treinos'}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: space.lg, paddingTop: 60, paddingBottom: 26,
    borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl,
    overflow: 'hidden',
    shadowColor: colors.primaryDeep,
    shadowOpacity: 0.28, shadowRadius: 20, shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  headerTitle: { color: colors.white, fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  headerSubRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  levelBadge: {
    backgroundColor: '#fde047',
    paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: radius.pill,
    shadowColor: '#fde047', shadowOpacity: 0.50, shadowRadius: 8, shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  levelBadgeText: { color: colors.primaryDeep, fontWeight: '900', fontSize: 12 },
  headerSub: { color: 'rgba(255,255,255,0.92)', fontSize: 14, fontWeight: '800' },

  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  statCard: {
    width: '47%', flexGrow: 1,
    backgroundColor: colors.card, borderRadius: radius.lg,
    padding: space.lg, gap: 6,
    borderWidth: 1, borderColor: colors.border,
    overflow: 'hidden',
  },
  statStripe: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  statIcon: { width: 42, height: 42, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: 4, borderWidth: 1.5 },
  statValue: { fontSize: 26, fontWeight: '900', color: colors.text, letterSpacing: -0.5 },
  statLabel: { fontSize: 12, fontWeight: '700', color: colors.textLight },

  sectionTitle: { fontSize: 20, fontWeight: '900', color: colors.text, letterSpacing: -0.4 },

  subjRow: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    backgroundColor: colors.card, borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: 1, borderColor: colors.border,
    overflow: 'hidden',
  },
  subjStripe: {
    position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
  },
  subjIcon: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  subjTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subjName: { fontSize: 16, fontWeight: '900', color: colors.text },
  subjPct: { fontSize: 15, fontWeight: '900' },
  subjMeta: { fontSize: 12, fontWeight: '600', color: colors.textLight },
});
