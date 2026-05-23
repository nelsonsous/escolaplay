import { describe, it, expect } from 'vitest';
import { buildPackFromLegacy, fromLegacyExercise } from './legacy.js';

// Exercicios reais copiados de content.js (2.º ano) — provam que o
// formato legado converte sem perda.
const REAL_EXERCISES = [
  {
    id: '2p1',
    s: 'portugues',
    t: 'Vogais e consoantes',
    type: 'mc',
    diff: 1,
    q: 'Quais são as vogais?',
    opts: ['a, e, i, o, u', 'a, b, c, d, e', 'b, c, d, f, g', 'i, j, k, l, m'],
    ans: 0,
    exp: 'As vogais são 5: a, e, i, o, u.',
  },
  {
    id: '2p2',
    s: 'portugues',
    t: 'Sílabas',
    type: 'fill',
    diff: 1,
    q: 'Quantas sílabas tem a palavra "menina"?',
    ans: ['3', 'três'],
    exp: 'Me-ni-na = 3 sílabas.',
  },
];

const REAL_SUBJECTS = {
  portugues: { name: 'Português', icon: 'fa-book', color: '#e11d48' },
  matematica: { name: 'Matemática', icon: 'fa-calculator', color: '#2563eb' },
};

const REAL_CURRICULUM = {
  portugues: ['Vogais e consoantes', 'Sílabas'],
  matematica: ['Dezenas e unidades'],
};

describe('fromLegacyExercise', () => {
  it('mapeia as chaves curtas para o modelo tipado', () => {
    const ex = fromLegacyExercise(REAL_EXERCISES[0]!);
    expect(ex.subject).toBe('portugues');
    expect(ex.topic).toBe('Vogais e consoantes');
    expect(ex.type).toBe('mc');
    expect(ex.difficulty).toBe(1);
    expect(ex.question).toBe('Quais são as vogais?');
    expect(ex.answer).toBe(0);
    expect(ex.options).toHaveLength(4);
  });

  it('omite options/explanation quando ausentes mas mantem fill answer', () => {
    const ex = fromLegacyExercise(REAL_EXERCISES[1]!);
    expect(ex.options).toBeUndefined();
    expect(ex.answer).toEqual(['3', 'três']);
  });

  it('rejeita tipos invalidos', () => {
    expect(() =>
      fromLegacyExercise({ ...REAL_EXERCISES[0]!, type: 'xyz' }),
    ).toThrow(/desconhecido/);
  });

  it('rejeita dificuldades fora de 1-3', () => {
    expect(() =>
      fromLegacyExercise({ ...REAL_EXERCISES[0]!, diff: 9 }),
    ).toThrow(/1-3/);
  });
});

describe('buildPackFromLegacy', () => {
  it('constroi um pack com id global a partir do ano', () => {
    const pack = buildPackFromLegacy({
      locale: 'pt-PT',
      grade: 2,
      label: '2.º ano',
      subjects: REAL_SUBJECTS,
      curriculum: REAL_CURRICULUM,
      exercises: REAL_EXERCISES,
    });
    expect(pack.id).toBe('pt-PT.grade-2');
    expect(pack.locale).toBe('pt-PT');
    expect(pack.grade).toBe(2);
    expect(pack.subjects).toHaveLength(2);
    expect(pack.subjects[0]!.key).toBe('portugues');
    expect(pack.exercises).toHaveLength(2);
  });
});
