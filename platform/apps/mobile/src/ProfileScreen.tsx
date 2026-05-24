import React from 'react';
import { View, Text, ScrollView, StyleSheet, StatusBar } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { levelInfo, levelProgressPercent } from '@escolaplay/core';
import type { Profile } from '@escolaplay/core';
import { colors, radius, space, shadow, shadowSoft, tint } from './theme';
import { ProgressBar, DecorOrb, PressScale } from './ui';
import { TAB_BAR_HEIGHT } from './TabBar';
import type { Achievement } from './data';

function AchievementCard({ a }: { a: Achievement }) {
  return (
    <View style={[s.achCard, shadow, !a.unlocked && s.achLocked]}>
      <View style={[s.achStripe, { backgroundColor: a.unlocked ? a.color : '#e5e7eb' }]} />
      <View style={[
        s.achIcon,
        {
          backgroundColor: a.unlocked ? tint(a.color, 0.14) : '#f1f3f5',
          borderColor: a.unlocked ? tint(a.color, 0.30) : '#e5e7eb',
        },
        a.unlocked && shadowSoft(a.color),
      ]}>
        <FontAwesome5 name={(a.unlocked ? a.icon : 'lock') as any} size={20} color={a.unlocked ? a.color : colors.textMuted} solid />
      </View>
      <Text style={[s.achName, !a.unlocked && { color: colors.textMuted }]} numberOfLines={1}>{a.name}</Text>
      <Text style={s.achDesc} numberOfLines={2}>{a.desc}</Text>
    </View>
  );
}

export function ProfileScreen({
  profile, achievements, packLabel, onChangePack,
}: {
  profile: Profile;
  achievements: Achievement[];
  packLabel?: string;
  onChangePack?: () => void;
}) {
  const lvl = levelInfo(profile.xp);
  const pct = levelProgressPercent(profile.xp);
  const unlocked = achievements.filter((a) => a.unlocked).length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={s.header}>
        <StatusBar barStyle="light-content" />
        <DecorOrb size={220} top={-80} right={-60} color={colors.white} opacity={0.13} />
        <DecorOrb size={160} bottom={-60} left={-40} color={colors.primaryDeep} opacity={0.28} />
        <DecorOrb size={80} top={40} right={70} color="#fde047" opacity={0.12} />

        <View style={s.avatarHalo}>
          <View style={s.avatarRing}>
            <View style={s.avatar}><Text style={{ fontSize: 46 }}>{profile.avatar}</Text></View>
          </View>
        </View>
        <Text style={s.name}>{profile.name}</Text>
        <View style={s.levelChip}>
          <View style={s.levelBadge}>
            <Text style={s.levelBadgeText}>{lvl.number}</Text>
          </View>
          <Text style={s.levelChipText}>{lvl.name}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: space.lg, paddingBottom: TAB_BAR_HEIGHT + 24, gap: space.lg }}>
        {packLabel && onChangePack && (
          <PressScale onPress={onChangePack} style={{ width: '100%' }} scale={0.98}>
            <View style={[s.packRow, shadow]}>
              <View style={s.packIcon}>
                <FontAwesome5 name="graduation-cap" size={16} color={colors.primary} solid />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.packEyebrow}>CURSO ATIVO</Text>
                <Text style={s.packTitle}>{packLabel}</Text>
              </View>
              <FontAwesome5 name="chevron-right" size={12} color={colors.textMuted} />
            </View>
          </PressScale>
        )}

        <View style={[s.xpCard, shadow]}>
          <View style={s.xpStripe} />
          <View style={s.xpTop}>
            <View style={s.xpTitleRow}>
              <FontAwesome5 name="star" size={18} color={colors.accent} solid />
              <Text style={s.xpTitle}>{profile.xp} XP</Text>
            </View>
            <Text style={s.xpNext}>{lvl.next ? `${lvl.span - lvl.into} para ${lvl.next}` : 'Máximo'}</Text>
          </View>
          <ProgressBar percent={pct} height={12} track="#f1f3f5" fill={colors.primary} shine shineColor="rgba(255,255,255,0.7)" />
        </View>

        <View style={s.achHead}>
          <Text style={s.sectionTitle}>Conquistas</Text>
          <Text style={s.achCount}>{unlocked}/{achievements.length}</Text>
        </View>
        <View style={s.achGrid}>
          {achievements.map((a) => <AchievementCard key={a.id} a={a} />)}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    backgroundColor: colors.primary,
    paddingTop: 64, paddingBottom: 28,
    alignItems: 'center',
    borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl,
    overflow: 'hidden',
    shadowColor: colors.primaryDeep,
    shadowOpacity: 0.30, shadowRadius: 22, shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
  avatarHalo: {
    padding: 5,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(253,224,71,0.22)',
    shadowColor: '#fde047',
    shadowOpacity: 0.55, shadowRadius: 22, shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  avatarRing: { padding: 4, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.40)' },
  avatar: { width: 92, height: 92, borderRadius: 46, backgroundColor: 'rgba(255,255,255,0.30)', alignItems: 'center', justifyContent: 'center' },
  name: { color: colors.white, fontSize: 24, fontWeight: '900', marginTop: 12, letterSpacing: -0.4 },
  levelChip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6, marginTop: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.30)' },
  levelBadge: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#fde047',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#fde047', shadowOpacity: 0.50, shadowRadius: 6, shadowOffset: { width: 0, height: 0 },
  },
  levelBadgeText: { color: colors.primaryDeep, fontWeight: '900', fontSize: 11 },
  levelChipText: { color: colors.white, fontSize: 13, fontWeight: '800' },

  packRow: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    backgroundColor: colors.card, borderRadius: radius.lg,
    padding: space.md,
    borderWidth: 1, borderColor: colors.primaryLight,
  },
  packIcon: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: tint(colors.primary, 0.30),
  },
  packEyebrow: { fontSize: 10, fontWeight: '900', letterSpacing: 0.7, color: colors.primaryDark, textTransform: 'uppercase' },
  packTitle: { fontSize: 15, fontWeight: '900', color: colors.text, marginTop: 2 },

  xpCard: {
    backgroundColor: colors.card, borderRadius: radius.lg,
    padding: space.lg, gap: 12,
    borderWidth: 1, borderColor: colors.border,
    overflow: 'hidden',
  },
  xpStripe: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: colors.primary },
  xpTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  xpTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  xpTitle: { fontSize: 24, fontWeight: '900', color: colors.text, letterSpacing: -0.4 },
  xpNext: { fontSize: 12, fontWeight: '700', color: colors.textLight },

  achHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 20, fontWeight: '900', color: colors.text, letterSpacing: -0.4 },
  achCount: { fontSize: 13, fontWeight: '900', color: colors.primaryDark, backgroundColor: colors.primaryLight, paddingHorizontal: 12, paddingVertical: 4, borderRadius: radius.pill, overflow: 'hidden' },

  achGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  achCard: {
    width: '47%', flexGrow: 1,
    backgroundColor: colors.card, borderRadius: radius.lg,
    padding: space.lg, gap: 6,
    borderWidth: 1, borderColor: colors.border,
    overflow: 'hidden',
  },
  achStripe: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  achLocked: { opacity: 0.65 },
  achIcon: { width: 46, height: 46, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: 4, marginTop: 4, borderWidth: 1.5 },
  achName: { fontSize: 14, fontWeight: '900', color: colors.text },
  achDesc: { fontSize: 12, fontWeight: '600', color: colors.textLight, lineHeight: 16 },
});
