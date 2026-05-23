// Seleccao de exercicios com repeticao espacada. Extraido de pickExercises
// (app.js) como funcao pura e testavel. A aleatoriedade e injectavel para
// os testes serem deterministicos.

import type { Exercise } from '../domain/types.js';

/** id do exercicio -> timestamp da ultima vez visto (ausente/0 = nunca). */
export type SeenMap = Record<string, number>;

/** id do exercicio -> ultima resposta foi certa? */
export type ResultMap = Record<string, boolean>;

export interface BuildSessionOptions {
  count: number;
  seen?: SeenMap;
  lastResult?: ResultMap;
  /** Gerador 0..1 injectavel (default Math.random). */
  rng?: () => number;
}

function normTxt(s: string): string {
  return (s || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N} ]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Chave de deduplicacao por enunciado + resposta normalizados. */
function dupKey(e: Exercise): string {
  let ans = '';
  if (e.type === 'mc') {
    ans = (e.options || []).map((o) => normTxt(String(o))).sort().join(',');
  } else if (e.type === 'tf') {
    ans = String(e.answer);
  } else {
    const a = Array.isArray(e.answer) ? e.answer : [e.answer];
    ans = a.map((x) => normTxt(String(x))).sort().join(',');
  }
  return `${e.subject}|${normTxt(e.question)}|${ans}`;
}

/**
 * Escolhe `count` exercicios do pool, por prioridade estrita:
 *   1.º nunca vistos  2.º errados na ultima vez  3.º ja acertados
 * Dentro de cada balde: dificuldade alta primeiro, depois mais antigo,
 * depois aleatorio. Remove duplicados (mesmo enunciado + resposta).
 */
export function buildSession(pool: Exercise[], options: BuildSessionOptions): Exercise[] {
  const { count, seen = {}, lastResult = {}, rng = Math.random } = options;

  const annotated = pool.map((e) => ({
    e,
    lastSeen: seen[e.id] ?? 0,
    wrongLast: lastResult[e.id] === false,
    difficulty: e.difficulty,
    rand: rng(),
  }));

  const cmp = (a: typeof annotated[number], b: typeof annotated[number]) => {
    if (a.difficulty !== b.difficulty) return b.difficulty - a.difficulty;
    if (a.lastSeen !== b.lastSeen) return a.lastSeen - b.lastSeen;
    return a.rand - b.rand;
  };

  const unseen = annotated.filter((x) => x.lastSeen === 0).sort(cmp);
  const wrong = annotated.filter((x) => x.lastSeen > 0 && x.wrongLast).sort(cmp);
  const seenOk = annotated.filter((x) => x.lastSeen > 0 && !x.wrongLast).sort(cmp);

  const ordered = [...unseen, ...wrong, ...seenOk];
  const pickedKeys = new Set<string>();
  const result: Exercise[] = [];
  for (const x of ordered) {
    const k = dupKey(x.e);
    if (pickedKeys.has(k)) continue;
    pickedKeys.add(k);
    result.push(x.e);
    if (result.length >= count) break;
  }
  return result;
}
