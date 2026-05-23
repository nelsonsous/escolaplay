import React from 'react';
import { View, Text, ScrollView, StyleSheet, StatusBar } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { levelInfo, levelProgressPercent } from '@escolaplay/core';
import type { Profile } from '@escolaplay/core';
import { colors, radius, space, shadow, tint } from './theme';
import { ProgressBar } from './ui';
import { TAB_BAR_HEIGHT } from './TabBar';
import type { Achievement } from './data';

function AchievementCard({ a }: { a: Achievement }) {
  return (
    <View style={[s.achCard, shadow, !a.unlocked && s.achLocked]}>
      <View style={[s.achIcon, { backgroundColor: a.unlocked ? tint(a.color, 0.15) : '#f1f3f5' }]}>
        <FontAwesome5 name={(a.unlocked ? a.icon : 'lock') as any} size={20} color={a.unlocked ? a.color : colors.textMuted} solid />
      </View>
      <Text style={[s.achName, !a.unlocked && { color: colors.textMuted }]} numberOfLines={1}>{a.name}</Text>
      <Text style={s.achDesc} numberOfLines={2}>{a.desc}</Text>
    </View>
  );
}

export function ProfileScreen({ profile, achievements }: { profile: Profile; achievements: Achievement[] }) {
  const lvl = levelInfo(profile.xp);
  const pct = levelProgressPercent(profile.xp);
  const unlocked = achievements.filter((a) => a.unlocked).length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={s.header}>
        <StatusBar barStyle="light-content" />
        <View style={s.decor} />
        <View style={s.avatarRing}>
          <View style={s.avatar}><Text style={{ fontSize: 46 }}>{profile.avatar}</Text></View>
        </View>
        <Text style={s.name}>{profile.name}</Text>
        <View style={s.levelChip}>
          <FontAwesome5 name="star" size={11} color="#fde047" solid />
          <Text style={s.levelChipText}>{lvl.name} · Nível {lvl.number}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: space.lg, paddingBottom: TAB_BAR_HEIGHT + 24, gap: space.lg }}>
        <View style={[s.xpCard, shadow]}>
          <View style={s.xpTop}>
            <Text style={s.xpTitle}>{profile.xp} XP</Text>
            <Text style={s.xpNext}>{lvl.next ? `${lvl.span - lvl.into} para ${lvl.next}` : 'Máximo'}</Text>
          </View>
          <ProgressBar percent={pct} height={12} track="#f1f3f5" fill={colors.primary} />
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
  header: { backgroundColor: colors.primary, paddingTop: 64, paddingBottom: 28, alignItems: 'center', borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl, overflow: 'hidden' },
  decor: { position: 'absolute', top: -50, right: -40, width: 170, height: 170, borderRadius: 85, backgroundColor: 'rgba(255,255,255,0.12)' },
  avatarRing: { padding: 4, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.35)' },
  avatar: { width: 92, height: 92, borderRadius: 46, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  name: { color: colors.white, fontSize: 24, fontWeight: '900', marginTop: 12, letterSpacing: -0.4 },
  levelChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 6, marginTop: 8 },
  levelChipText: { color: colors.white, fontSize: 13, fontWeight: '800' },
  xpCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: space.lg, gap: 10, borderWidth: 1, borderColor: colors.border },
  xpTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  xpTitle: { fontSize: 22, fontWeight: '900', color: colors.text },
  xpNext: { fontSize: 12, fontWeight: '700', color: colors.textLight },
  achHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 20, fontWeight: '900', color: colors.text, letterSpacing: -0.4 },
  achCount: { fontSize: 13, fontWeight: '900', color: colors.primaryDark, backgroundColor: colors.primaryLight, paddingHorizontal: 12, paddingVertical: 4, borderRadius: radius.pill, overflow: 'hidden' },
  achGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  achCard: { width: '47%', flexGrow: 1, backgroundColor: colors.card, borderRadius: radius.lg, padding: space.lg, gap: 6, borderWidth: 1, borderColor: colors.border },
  achLocked: { opacity: 0.6 },
  achIcon: { width: 46, height: 46, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  achName: { fontSize: 14, fontWeight: '800', color: colors.text },
  achDesc: { fontSize: 12, fontWeight: '600', color: colors.textLight, lineHeight: 16 },
});
