// Motor de XP e niveis. Extraido de app.js (LEVELS, XP_BY_DIFF, levelInfo)
// como funcoes puras, sem DOM nem globais — testavel e partilhavel.

import type { Difficulty } from '../domain/types.js';

export interface Level {
  /** XP minimo para atingir este nivel. */
  min: number;
  name: string;
}

/** Tabela de niveis (igual a app.js). A ordem e crescente por `min`. */
export const LEVELS: readonly Level[] = [
  { min: 0, name: 'Aprendiz' },
  { min: 500, name: 'Aventureiro' },
  { min: 1500, name: 'Explorador' },
  { min: 3000, name: 'Cavaleiro' },
  { min: 5000, name: 'Mestre' },
  { min: 8000, name: 'Sábio' },
  { min: 12000, name: 'Lenda' },
] as const;

/** XP ganho por resposta certa, por dificuldade (igual a app.js). */
export const XP_BY_DIFFICULTY: Record<Difficulty, number> = {
  1: 10,
  2: 20,
  3: 30,
};

/** XP a creditar por uma resposta certa de dada dificuldade. */
export function xpForCorrect(difficulty: Difficulty): number {
  return XP_BY_DIFFICULTY[difficulty];
}

export interface LevelInfo {
  /** Indice 0-based na tabela LEVELS. */
  idx: number;
  /** Nome do nivel atual. */
  name: string;
  /** Numero 1-based do nivel (para mostrar ao utilizador). */
  number: number;
  /** XP acumulado dentro do nivel atual. */
  into: number;
  /** XP total necessario para passar do nivel atual ao seguinte. */
  span: number;
  /** Nome do proximo nivel, ou null se ja for o ultimo. */
  next: string | null;
}

/**
 * Calcula o nivel a partir do XP total. Replica exatamente o
 * comportamento de `levelInfo` em app.js (incluindo o span de +5000
 * para o nivel maximo).
 */
export function levelInfo(xp: number): LevelInfo {
  let idx = 0;
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i]!.min) {
      idx = i;
      break;
    }
  }
  const current = LEVELS[idx]!;
  const next = LEVELS[idx + 1];
  const base = current.min;
  const nextMin = next ? next.min : base + 5000;
  return {
    idx,
    name: current.name,
    number: idx + 1,
    into: xp - base,
    span: nextMin - base,
    next: next?.name ?? null,
  };
}

/** Percentagem (0-100) de progresso dentro do nivel atual. */
export function levelProgressPercent(xp: number): number {
  const info = levelInfo(xp);
  return Math.min(100, Math.round((info.into / info.span) * 100));
}
