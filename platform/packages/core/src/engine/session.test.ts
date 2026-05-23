import { describe, it, expect } from 'vitest';
import { buildSession } from './session.js';
import type { Exercise } from '../domain/types.js';

function ex(id: string, opts: Partial<Exercise> = {}): Exercise {
  return {
    id, subject: 'p', topic: 't', type: 'mc', difficulty: 1,
    question: `q-${id}`, options: ['a', 'b'], answer: 0, ...opts,
  };
}

const rng = () => 0.5; // deterministico

describe('buildSession', () => {
  it('prioriza nunca vistos antes de vistos', () => {
    const pool = [ex('seen'), ex('new')];
    const out = buildSession(pool, { count: 1, seen: { seen: 123 }, rng });
    expect(out[0]!.id).toBe('new');
  });

  it('depois dos novos, prioriza os errados sobre os ja certos', () => {
    const pool = [ex('ok'), ex('wrong')];
    const out = buildSession(pool, {
      count: 2,
      seen: { ok: 100, wrong: 100 },
      lastResult: { ok: true, wrong: false },
      rng,
    });
    expect(out.map((e) => e.id)).toEqual(['wrong', 'ok']);
  });

  it('dentro do balde, dificuldade maior vem primeiro', () => {
    const pool = [ex('d1', { difficulty: 1 }), ex('d3', { difficulty: 3 })];
    const out = buildSession(pool, { count: 2, rng });
    expect(out[0]!.id).toBe('d3');
  });

  it('respeita o limite count', () => {
    const pool = [ex('a'), ex('b'), ex('c')];
    expect(buildSession(pool, { count: 2, rng })).toHaveLength(2);
  });

  it('remove duplicados (mesmo enunciado + resposta)', () => {
    const pool = [
      ex('a', { question: 'Quanto é 1+1?', options: ['2', '3'], answer: 0 }),
      ex('b', { question: 'quanto é 1+1?', options: ['3', '2'], answer: 1 }),
    ];
    const out = buildSession(pool, { count: 5, rng });
    expect(out).toHaveLength(1);
  });
});
