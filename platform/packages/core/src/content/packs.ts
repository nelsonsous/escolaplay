// Registo de packs de curriculo. Os packs reais sao gerados a partir do
// content.js (ver scripts/gen-content.mjs) e acedidos por id ou por ano.

import type { CurriculumPack } from '../domain/types.js';
import { GENERATED_PACKS } from './generated.js';

/** Todos os packs disponiveis. */
export function listPacks(): CurriculumPack[] {
  return Object.values(GENERATED_PACKS);
}

/** Pack por id (ex: "pt-PT.grade-2"), ou undefined. */
export function getPack(id: string): CurriculumPack | undefined {
  return GENERATED_PACKS[id];
}

/** Pack por locale + ano (ex: "pt-PT", 2). */
export function getPackByGrade(locale: string, grade: number): CurriculumPack | undefined {
  return GENERATED_PACKS[`${locale}.grade-${grade}`];
}

/** Anos disponiveis para um locale, ordenados. */
export function availableGrades(locale: string): number[] {
  return listPacks()
    .filter((p) => p.locale === locale)
    .map((p) => p.grade)
    .sort((a, b) => a - b);
}
