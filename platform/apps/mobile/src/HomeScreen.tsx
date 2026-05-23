import React, { useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, StatusBar, Animated, Easing } from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { levelInfo, levelProgressPercent, subjectAccuracy, subjectMastery } from '@escolaplay/core';
import type { Profile, CurriculumPack, Subject } from '@escolaplay/core';
import { colors, radius, space, shadow, shadowSoft, shadowStrong, tint } from './theme';
import { ProgressBar, StatPill, PressScale, DecorOrb } from './ui';
import { subjectIconName } from './Icon';
import { TAB_BAR_HEIGHT } from './TabBar';

function Header({ profile }: { profile: Profile }) {
  const lvl = levelInfo(profile.xp);
  const pct = levelProgressPercent(profile.xp);
  const totalCorrect = Object.values(profile.subjects).reduce((a, s) => a + s.correct, 0);
  const totalAttempts = Object.values(profile.subjects).reduce((a, s) => a + s.attempts, 0);
  const acc = totalAttempts ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

  // Flicker subtil na chama (streak emoji).
  const flame = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(flame, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(flame, { toValue: 0, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [flame]);
  const flameScale = flame.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });

  return (
    <View style={s.header}>
      <StatusBar barStyle="light-content" />
      <DecorOrb size={210} top={-70} right={-50} color={colors.white} opacity={0.15} />
      <DecorOrb size={80} top={40} right={70} color={colors.white} opacity={0.10} />
      <DecorOrb size={160} bottom={-60} left={-40} color={colors.primaryDeep} opacity={0.30} />
      <DecorOrb size={90} top={120} left={-20} color="#facc15" opacity={0.10} />

      <View style={s.headerTop}>
        <View style={s.headerLeft}>
          <View style={s.avatarHalo}>
            <View style={s.avatarRing}>
              <View style={s.avatar}><Text style={{ fontSize: 32 }}>{profile.avatar}</Text></View>
            </View>
          </View>
          <View style={{ gap: 3 }}>
            <Text style={s.hello}>Olá,</Text>
            <Text style={s.name}>{profile.name}</Text>
          </View>
        </View>
        <PressScale onPress={() => {}} style={s.gear} hitSlop={10}>
          <Ionicons name="settings-sharp" size={20} color={colors.white} />
        </PressScale>
      </View>

      <View style={s.statRow}>
        <StatPill icon={<FontAwesome5 name="star" size={12} color="#fde047" solid />}>{profile.xp}</StatPill>
        <View style={s.streakPill}>
          <Animated.View style={{ transform: [{ scale: flameScale }] }}>
            <FontAwesome5 name="fire" size={13} color="#fdba74" solid />
          </Animated.View>
          <Text style={s.streakPillText}>{profile.streakDays} dias</Text>
        </View>
        <StatPill icon={<FontAwesome5 name="bullseye" size={12} color="#bbf7d0" solid />}>{acc}%</StatPill>
      </View>

      <View style={s.levelCard}>
        <View style={s.levelRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={s.levelBadge}>
              <Text style={s.levelBadgeText}>{lvl.number}</Text>
            </View>
            <Text style={s.levelName}>{lvl.name}</Text>
          </View>
          <Text style={s.levelNext}>{lvl.next ? `→ ${lvl.next}` : 'Máximo'}</Text>
        </View>
        <ProgressBar percent={pct} height={12} fill="#fde047" track="rgba(255,255,255,0.25)" shine shineColor="rgba(255,255,255,0.85)" />
        <Text style={s.levelCaption}>
          {lvl.next ? `Faltam ${lvl.span - lvl.into} XP para subir` : 'Nível máximo atingido!'}
        </Text>
      </View>
    </View>
  );
}

function DailyGoal({ done, target }: { done: number; target: number }) {
  const pct = Math.min(100, Math.round((done / target) * 100));
  const complete = done >= target;
  const tintColor = complete ? colors.success : colors.accent;
  return (
    <View style={[s.dailyCard, shadow]}>
      <View style={[s.dailyIcon, { backgroundColor: tint(tintColor, 0.14), borderColor: tint(tintColor, 0.30) }]}>
        <FontAwesome5 name={complete ? 'check' : 'bolt'} size={20} color={tintColor} solid />
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <View style={s.dailyTop}>
          <Text style={s.dailyTitle}>Meta diária</Text>
          <Text style={[s.dailyCount, { color: tintColor }]}>{done}/{target}</Text>
        </View>
        <ProgressBar percent={pct} height={10} track="#f1f3f5" fill={tintColor} />
        <Text style={s.dailySub}>{complete ? 'Concluída! Parabéns 🎉' : `Faltam ${target - done} exercícios hoje`}</Text>
      </View>
    </View>
  );
}

function Recommended({ subject, onPress }: { subject: Subject; onPress: () => void }) {
  return (
    <PressScale onPress={onPress} style={{ borderRadius: radius.lg }} scale={0.98}>
      <View style={[s.recCard, { backgroundColor: subject.color }, shadowStrong(subject.color)]}>
        <DecorOrb size={140} top={-40} right={-20} color={colors.white} opacity={0.14} />
        <DecorOrb size={60} bottom={-20} right={50} color={colors.white} opacity={0.10} />
        <View style={s.recIcon}>
          <FontAwesome5 name={subjectIconName(subject.icon) as any} size={26} color={colors.white} solid />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.recLabel}>SUGESTÃO DE HOJE</Text>
          <Text style={s.recTitle}>Treinar {subject.name}</Text>
        </View>
        <View style={s.recPlay}>
          <FontAwesome5 name="play" size={14} color={subject.color} solid />
        </View>
      </View>
    </PressScale>
  );
}

function SubjectCard({ subject, count, mastery, accuracy, onPress }: {
  subject: Subject; count: number; mastery: number; accuracy: number; onPress: () => void;
}) {
  return (
    <PressScale onPress={onPress} style={{ flex: 1 }}>
      <View style={[s.card, shadow]}>
        <View style={[s.cardStripe, { backgroundColor: subject.color }]} />
        <View style={s.cardTop}>
          <View style={[s.cardIcon, { backgroundColor: subject.color }, shadowSoft(subject.color)]}>
            <FontAwesome5 name={subjectIconName(subject.icon) as any} size={20} color={colors.white} solid />
          </View>
          {accuracy > 0 && (
            <View style={[s.accBadge, { backgroundColor: tint(subject.color, 0.12) }]}>
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
      </View>
    </PressScale>
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

  const recommended = [...pack.subjects]
    .filter((sub) => countFor(sub.key) > 0)
    .sort((a, b) => subjectMastery(profile.subjects[a.key], countFor(a.key)) - subjectMastery(profile.subjects[b.key], countFor(b.key)))[0];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + 24 }}>
        <Header profile={profile} />

        <View style={{ paddingHorizontal: space.lg, marginTop: -18 }}>
          <DailyGoal done={daily.done} target={daily.target} />
        </View>

        {recommended && (
          <View style={{ paddingHorizontal: space.lg, paddingTop: space.lg }}>
            <Recommended subject={recommended} onPress={() => onOpenSubject(recommended.key)} />
          </View>
        )}

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
    shadowColor: colors.primaryDeep,
    shadowOpacity: 0.30,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  avatarHalo: {
    padding: 4,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(253,224,71,0.20)',
    shadowColor: '#fde047',
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  avatarRing: { padding: 3, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.40)' },
  avatar: { width: 62, height: 62, borderRadius: 31, backgroundColor: 'rgba(255,255,255,0.30)', alignItems: 'center', justifyContent: 'center' },
  hello: { color: 'rgba(255,255,255,0.88)', fontSize: 13, fontWeight: '700' },
  name: { color: colors.white, fontSize: 24, fontWeight: '900', letterSpacing: -0.4 },
  gear: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.30)' },
  statRow: { flexDirection: 'row', gap: space.sm, marginTop: space.lg },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(251,146,60,0.28)',
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(254,215,170,0.45)',
  },
  streakPillText: { color: colors.white, fontWeight: '900', fontSize: 13 },
  levelCard: {
    marginTop: space.lg,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: radius.lg,
    padding: space.md,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
  },
  levelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  levelBadge: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#fde047',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#fde047', shadowOpacity: 0.55, shadowRadius: 10, shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  levelBadgeText: { color: colors.primaryDeep, fontWeight: '900', fontSize: 13 },
  levelName: { color: colors.white, fontSize: 15, fontWeight: '900' },
  levelNext: { color: 'rgba(255,255,255,0.88)', fontSize: 12, fontWeight: '800' },
  levelCaption: { color: 'rgba(255,255,255,0.92)', fontSize: 11, fontWeight: '700' },

  dailyCard: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  dailyIcon: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  dailyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dailyTitle: { fontSize: 15, fontWeight: '900', color: colors.text },
  dailyCount: { fontSize: 15, fontWeight: '900' },
  dailySub: { fontSize: 12, fontWeight: '600', color: colors.textLight },

  recCard: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    borderRadius: radius.lg, padding: space.lg, overflow: 'hidden',
  },
  recIcon: {
    width: 54, height: 54, borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.30)',
  },
  recLabel: { color: 'rgba(255,255,255,0.88)', fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
  recTitle: { color: colors.white, fontSize: 18, fontWeight: '900', marginTop: 2, letterSpacing: -0.3 },
  recPlay: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },

  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 22, fontWeight: '900', color: colors.text, letterSpacing: -0.5 },
  sectionBadge: { fontSize: 12, fontWeight: '900', color: colors.primaryDark, backgroundColor: colors.primaryLight, paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.pill, overflow: 'hidden' },

  row: { flexDirection: 'row', gap: space.md },
  card: {
    backgroundColor: colors.card, borderRadius: radius.lg,
    padding: space.lg, gap: 10,
    borderWidth: 1, borderColor: colors.border,
    overflow: 'hidden',
  },
  cardStripe: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: 4,
    borderTopLeftRadius: radius.lg,
    borderBottomLeftRadius: radius.lg,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardIcon: { width: 50, height: 50, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  accBadge: { borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 3 },
  accText: { fontSize: 11, fontWeight: '900' },
  cardName: { fontSize: 16, fontWeight: '900', color: colors.text, letterSpacing: -0.2 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  cardMeta: { fontSize: 12, fontWeight: '700', color: colors.textLight },
});
