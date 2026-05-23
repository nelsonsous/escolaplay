// Progresso e estatisticas por perfil. Funcoes puras que atualizam o
// progresso de uma disciplina e calculam metricas (precisao, dominio).

import type { Profile, SubjectProgress, Exercise } from '../domain/types.js';
import { xpForCorrect } from './xp.js';

export function emptySubjectProgress(): SubjectProgress {
  return { xp: 0, seenIds: [], correct: 0, attempts: 0 };
}

/**
 * Regista uma resposta no perfil (imutavel) e devolve o novo perfil + o XP
 * ganho. Atualiza XP total, progresso da disciplina e ids vistos.
 */
export function recordAnswer(
  profile: Profile,
  exercise: Exercise,
  correct: boolean,
): { profile: Profile; xpGained: number } {
  const gained = correct ? xpForCorrect(exercise.difficulty) : 0;
  const prev = profile.subjects[exercise.subject] ?? emptySubjectProgress();

  const seenIds = prev.seenIds.includes(exercise.id)
    ? prev.seenIds
    : [...prev.seenIds, exercise.id];

  const updated: SubjectProgress = {
    xp: prev.xp + gained,
    seenIds,
    correct: prev.correct + (correct ? 1 : 0),
    attempts: prev.attempts + 1,
  };

  return {
    profile: {
      ...profile,
      xp: profile.xp + gained,
      subjects: { ...profile.subjects, [exercise.subject]: updated },
    },
    xpGained: gained,
  };
}

/** Precisao (0-100) numa disciplina. 0 se ainda sem tentativas. */
export function subjectAccuracy(progress: SubjectProgress | undefined): number {
  if (!progress || progress.attempts === 0) return 0;
  return Math.round((progress.correct / progress.attempts) * 100);
}

/**
 * Dominio (0-100) de uma disciplina: percentagem de exercicios distintos
 * ja respondidos corretamente face ao total disponivel.
 */
export function subjectMastery(
  progress: SubjectProgress | undefined,
  totalExercises: number,
): number {
  if (!progress || totalExercises === 0) return 0;
  const distinctSeen = Math.min(progress.seenIds.length, totalExercises);
  return Math.round((distinctSeen / totalExercises) * 100);
}
