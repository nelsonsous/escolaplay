// Modo Curso — caminho linear de lições agrupadas em unidades. Substitui
// o grid de disciplinas quando o pack ativo tem `course` (ex: English PM).
import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, StatusBar } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import type { Course, CurriculumPack, Profile, Subject } from '@escolaplay/core';
import { colors, radius, space, shadow, shadowSoft, tint } from './theme';
import { ProgressBar, PressScale, DecorOrb } from './ui';

/**
 * Determina se uma lição está desbloqueada.
 * Regra: a primeira lição está sempre desbloqueada; cada lição desbloqueia
 * quando a anterior tiver TODOS os seus exercícios respondidos
 * (`seenIds` cobre `exerciseIds`).
 * Lições com `unlocked: true` ignoram a regra.
 */
function isLessonUnlocked(
  course: Course,
  lessonIdx: number,
  seenIds: Set<string>,
): boolean {
  const lesson = course.lessons[lessonIdx];
  if (!lesson) return false;
  if (lesson.unlocked) return true;
  if (lessonIdx === 0) return true;
  const prev = course.lessons[lessonIdx - 1]!;
  return prev.exerciseIds.every((id) => seenIds.has(id));
}

function lessonProgress(lessonExerciseIds: string[], seenIds: Set<string>): number {
  if (lessonExerciseIds.length === 0) return 0;
  const seen = lessonExerciseIds.filter((id) => seenIds.has(id)).length;
  return Math.round((seen / lessonExerciseIds.length) * 100);
}

export function CourseScreen({
  pack,
  profile,
  onStartLesson,
  onOpenTutor,
}: {
  pack: CurriculumPack;
  profile: Profile;
  onStartLesson: (lesson: { id: string; subjectKey: string; title: string; exerciseIds: string[] }) => void;
  /** Opcional: abre o ecrã de chat com o tutor IA. */
  onOpenTutor?: () => void;
}) {
  const course = pack.course;
  if (!course) {
    return (
      <View style={s.empty}>
        <Text style={s.emptyText}>Este pack não tem modo curso.</Text>
      </View>
    );
  }

  const subject: Subject | undefined = pack.subjects.find((sub) => sub.key === course.subjectKey);
  const subjectColor = subject?.color ?? colors.primary;

  const seenIds = useMemo(() => {
    const p = profile.subjects[course.subjectKey];
    return new Set(p?.seenIds || []);
  }, [profile, course.subjectKey]);

  const lessonById = useMemo(() => {
    const m: Record<string, { lesson: typeof course.lessons[number]; idx: number; unlocked: boolean; progress: number }> = {};
    course.lessons.forEach((lesson, idx) => {
      m[lesson.id] = {
        lesson,
        idx,
        unlocked: isLessonUnlocked(course, idx, seenIds),
        progress: lessonProgress(lesson.exerciseIds, seenIds),
      };
    });
    return m;
  }, [course, seenIds]);

  // Métrica geral: % de lições completas (todos os exercícios respondidos).
  const completed = course.lessons.filter((l) => l.exerciseIds.every((id) => seenIds.has(id))).length;
  const overallPct = Math.round((completed / Math.max(1, course.lessons.length)) * 100);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[s.header, { backgroundColor: subjectColor }]}>
        <StatusBar barStyle="light-content" />
        <DecorOrb size={200} top={-70} right={-50} color={colors.white} opacity={0.13} />
        <DecorOrb size={140} bottom={-50} left={-30} color="#000" opacity={0.15} />
        <Text style={s.headerEyebrow}>CURSO</Text>
        <Text style={s.headerTitle}>{course.title}</Text>
        <Text style={s.headerSub}>
          {completed}/{course.lessons.length} lições · {overallPct}%
        </Text>
        <View style={{ marginTop: 12 }}>
          <ProgressBar percent={overallPct} height={10} track="rgba(255,255,255,0.25)" fill={colors.white} shine shineColor="rgba(255,255,255,0.7)" />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: space.lg, paddingBottom: 120, gap: space.xl }}
      >
        {onOpenTutor && (
          <PressScale onPress={onOpenTutor} scale={0.97} style={{ width: '100%' }}>
            <View style={[s.tutorCta, shadowSoft('#0d9488')]}>
              <View style={s.tutorCtaAvatar}>
                <Text style={{ fontSize: 22 }}>🧑‍🏫</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.tutorCtaEyebrow}>FALAR COM O PROFESSOR</Text>
                <Text style={s.tutorCtaTitle}>English Tutor</Text>
                <Text style={s.tutorCtaSub}>Conversa livre · corrige · ouve em inglês</Text>
              </View>
              <FontAwesome5 name="comments" size={20} color={colors.white} solid />
            </View>
          </PressScale>
        )}

        {course.units.map((unit) => (
          <View key={unit.id} style={{ gap: space.md }}>
            <View style={s.unitHead}>
              <View style={[s.unitIcon, { backgroundColor: unit.color }]}>
                <FontAwesome5 name={(unit.icon.replace(/^fa-/, '')) as any} size={18} color={colors.white} solid />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.unitTitle}>{unit.title}</Text>
                <Text style={s.unitMeta}>
                  {unit.lessonIds.length} lições
                </Text>
              </View>
            </View>

            {unit.lessonIds.map((lid) => {
              const info = lessonById[lid];
              if (!info) return null;
              const { lesson, unlocked, progress } = info;
              const done = progress === 100;
              return (
                <PressScale
                  key={lesson.id}
                  disabled={!unlocked}
                  onPress={() => unlocked && onStartLesson({
                    id: lesson.id,
                    subjectKey: course.subjectKey,
                    title: lesson.title,
                    exerciseIds: lesson.exerciseIds,
                  })}
                  style={{ width: '100%' }}
                >
                  <View style={[
                    s.lessonCard,
                    !unlocked && s.lessonLocked,
                    shadow,
                  ]}>
                    <View style={[s.lessonStripe, { backgroundColor: unit.color, opacity: unlocked ? 1 : 0.4 }]} />
                    <View style={[
                      s.lessonBubble,
                      { backgroundColor: unlocked ? unit.color : '#e5e7eb' },
                      unlocked && shadowSoft(unit.color),
                    ]}>
                      {!unlocked ? (
                        <FontAwesome5 name="lock" size={16} color="#9ca3af" solid />
                      ) : done ? (
                        <FontAwesome5 name="check" size={18} color={colors.white} solid />
                      ) : (
                        <Text style={s.lessonBubbleText}>{info.idx + 1}</Text>
                      )}
                    </View>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={[s.lessonTitle, !unlocked && { color: colors.textMuted }]} numberOfLines={1}>
                        {lesson.title}
                      </Text>
                      {lesson.subtitle && (
                        <Text style={s.lessonSubtitle} numberOfLines={1}>{lesson.subtitle}</Text>
                      )}
                      {unlocked && progress > 0 && progress < 100 && (
                        <View style={{ marginTop: 6 }}>
                          <ProgressBar percent={progress} height={4} track="#f1f3f5" fill={unit.color} />
                        </View>
                      )}
                    </View>
                    {unlocked && (
                      <FontAwesome5 name={done ? 'redo' : 'play'} size={12} color={colors.textMuted} solid />
                    )}
                  </View>
                </PressScale>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    paddingHorizontal: space.lg, paddingTop: 60, paddingBottom: 26,
    borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl,
    overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.20, shadowRadius: 20, shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  headerEyebrow: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
  headerTitle: { color: colors.white, fontSize: 24, fontWeight: '900', marginTop: 2, letterSpacing: -0.5 },
  headerSub: { color: 'rgba(255,255,255,0.92)', fontSize: 13, fontWeight: '700', marginTop: 6 },

  unitHead: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.sm },
  unitIcon: {
    width: 40, height: 40, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  unitTitle: { fontSize: 17, fontWeight: '900', color: colors.text, letterSpacing: -0.3 },
  unitMeta: { fontSize: 11, fontWeight: '700', color: colors.textLight, marginTop: 2 },

  lessonCard: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    backgroundColor: colors.card, borderRadius: radius.lg,
    padding: space.md, paddingLeft: space.lg,
    borderWidth: 1, borderColor: colors.border,
    overflow: 'hidden',
  },
  lessonLocked: { opacity: 0.65 },
  lessonStripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  lessonBubble: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  lessonBubbleText: { color: colors.white, fontWeight: '900', fontSize: 16 },
  lessonTitle: { fontSize: 15, fontWeight: '900', color: colors.text },
  lessonSubtitle: { fontSize: 12, fontWeight: '600', color: colors.textLight },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xxl },
  emptyText: { fontSize: 14, fontWeight: '700', color: colors.textLight },

  tutorCta: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    backgroundColor: '#0d9488',
    borderRadius: radius.lg,
    padding: space.md,
    overflow: 'hidden',
  },
  tutorCtaAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.30)',
  },
  tutorCtaEyebrow: { fontSize: 10, fontWeight: '900', letterSpacing: 0.7, color: 'rgba(255,255,255,0.85)' },
  tutorCtaTitle: { fontSize: 17, fontWeight: '900', color: colors.white, letterSpacing: -0.3, marginTop: 2 },
  tutorCtaSub: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.88)' },
});
