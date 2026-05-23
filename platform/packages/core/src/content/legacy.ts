// Adaptador do formato legado (content.js) para o modelo tipado.
//
// O objetivo e REUTILIZAR os ~35.000 linhas de conteudo existente sem
// reescrever nada: os ficheiros content_*.js continuam a ser a fonte de
// verdade, e este adaptador converte-os em CurriculumPack tipados.

import type {
  CurriculumPack,
  Curriculum,
  Exercise,
  ExerciseType,
  Difficulty,
  Subject,
} from '../domain/types.js';

/** Forma de uma disciplina no content.js legado. */
export interface LegacySubject {
  name: string;
  icon: string;
  color: string;
}

/** Mapa legado: chave de disciplina -> definicao. */
export type LegacySubjects = Record<string, LegacySubject>;

/** Exercicio no formato legado (chaves curtas). */
export interface LegacyExercise {
  id: string;
  s: string;
  t: string;
  type: string;
  diff: number;
  q: string;
  opts?: string[];
  ans: number | boolean | string[] | number[];
  exp?: string;
}

const VALID_TYPES: ReadonlySet<string> = new Set([
  'mc',
  'tf',
  'fill',
  'order',
  'match',
]);

function normalizeType(type: string): ExerciseType {
  if (!VALID_TYPES.has(type)) {
    throw new Error(`Tipo de exercicio desconhecido: "${type}"`);
  }
  return type as ExerciseType;
}

function normalizeDifficulty(diff: number): Difficulty {
  if (diff === 1 || diff === 2 || diff === 3) return diff;
  throw new Error(`Dificuldade fora do intervalo 1-3: ${diff}`);
}

/** Converte um exercicio legado para o modelo tipado. */
export function fromLegacyExercise(raw: LegacyExercise): Exercise {
  const exercise: Exercise = {
    id: raw.id,
    subject: raw.s,
    topic: raw.t,
    type: normalizeType(raw.type),
    difficulty: normalizeDifficulty(raw.diff),
    question: raw.q,
    answer: raw.ans,
  };
  if (raw.opts !== undefined) exercise.options = raw.opts;
  if (raw.exp !== undefined) exercise.explanation = raw.exp;
  return exercise;
}

function fromLegacySubjects(subjects: LegacySubjects): Subject[] {
  return Object.entries(subjects).map(([key, def]) => ({
    key,
    name: def.name,
    icon: def.icon,
    color: def.color,
  }));
}

export interface BuildPackInput {
  locale: string;
  grade: number;
  label: string;
  subjects: LegacySubjects;
  curriculum: Curriculum;
  exercises: LegacyExercise[];
}

/**
 * Constroi um CurriculumPack a partir das estruturas legadas de um ano.
 * Ex: buildPackFromLegacy({ locale:'pt-PT', grade:2, label:'2.º ano',
 *       subjects: SUBJECTS_2, curriculum: CURRICULUM_2, exercises: EXERCISES_2 })
 */
export function buildPackFromLegacy(input: BuildPackInput): CurriculumPack {
  return {
    id: `${input.locale}.grade-${input.grade}`,
    locale: input.locale,
    grade: input.grade,
    label: input.label,
    subjects: fromLegacySubjects(input.subjects),
    curriculum: input.curriculum,
    exercises: input.exercises.map(fromLegacyExercise),
  };
}
