import { describe, it, expect } from 'vitest';
import { getPack, getPackByGrade, listPacks, availableGrades } from './packs.js';
import { checkAnswer } from '../engine/answer.js';

describe('packs gerados (conteudo real)', () => {
  it('tem os 4 anos com exercicios', () => {
    expect(availableGrades('pt-PT')).toEqual([2, 3, 5, 6]);
  });

  it('o pack do 2.º ano tem disciplinas e muitos exercicios', () => {
    const pack = getPackByGrade('pt-PT', 2)!;
    expect(pack.label).toBe('2.º ano');
    expect(pack.subjects.length).toBeGreaterThan(0);
    expect(pack.exercises.length).toBeGreaterThan(100);
  });

  it('getPack por id', () => {
    expect(getPack('pt-PT.grade-5')!.grade).toBe(5);
    expect(getPack('inexistente')).toBeUndefined();
  });

  it('todos os exercicios tem tipo suportado e dificuldade valida', () => {
    for (const pack of listPacks()) {
      for (const e of pack.exercises) {
        expect(['mc', 'tf', 'fill']).toContain(e.type);
        expect([1, 2, 3]).toContain(e.difficulty);
        if (e.type === 'mc') {
          expect(Array.isArray(e.options)).toBe(true);
          expect(typeof e.answer).toBe('number');
        }
      }
    }
  });

  it('as respostas corretas validam com o motor', () => {
    const pack = getPackByGrade('pt-PT', 2)!;
    const mc = pack.exercises.find((e) => e.type === 'mc')!;
    expect(checkAnswer(mc, mc.answer as number)).toBe(true);
    const tf = pack.exercises.find((e) => e.type === 'tf')!;
    expect(checkAnswer(tf, tf.answer as boolean)).toBe(true);
  });
});
