import { describe, it, expect } from 'vitest';
import { normalizeText, checkFillAnswer, checkAnswer } from './answer.js';
import type { Exercise } from '../domain/types.js';

describe('normalizeText', () => {
  it('remove acentos, espacos extra e maiusculas', () => {
    expect(normalizeText('  Três   Sílabas ')).toBe('tres silabas');
    expect(normalizeText('CÃO')).toBe('cao');
  });
});

describe('checkFillAnswer', () => {
  it('aceita match exato apos normalizar', () => {
    expect(checkFillAnswer(['três', '3'], 'Tres')).toBe(true);
    expect(checkFillAnswer(['42'], '42')).toBe(true);
  });

  it('aceita inclusao parcial com 3+ caracteres', () => {
    expect(checkFillAnswer(['cavalo'], 'um cavalo castanho')).toBe(true);
  });

  it('rejeita resposta errada', () => {
    expect(checkFillAnswer(['42'], '43')).toBe(false);
    expect(checkFillAnswer(['cao'], '')).toBe(false);
  });
});

const mc: Exercise = {
  id: 'm', subject: 'p', topic: 't', type: 'mc', difficulty: 1,
  question: 'q', options: ['a', 'b', 'c'], answer: 1,
};
const tf: Exercise = {
  id: 't', subject: 'p', topic: 't', type: 'tf', difficulty: 1,
  question: 'q', answer: true,
};
const fill: Exercise = {
  id: 'f', subject: 'p', topic: 't', type: 'fill', difficulty: 1,
  question: 'q', answer: ['três', '3'],
};

describe('checkAnswer', () => {
  it('mc: indice correto', () => {
    expect(checkAnswer(mc, 1)).toBe(true);
    expect(checkAnswer(mc, 0)).toBe(false);
  });

  it('tf: boolean correto', () => {
    expect(checkAnswer(tf, true)).toBe(true);
    expect(checkAnswer(tf, false)).toBe(false);
  });

  it('fill: texto tolerante', () => {
    expect(checkAnswer(fill, 'TRÊS')).toBe(true);
    expect(checkAnswer(fill, '3')).toBe(true);
    expect(checkAnswer(fill, 'quatro')).toBe(false);
  });

  it('rejeita tipo de resposta errado para o exercicio', () => {
    expect(checkAnswer(mc, 'texto')).toBe(false);
    expect(checkAnswer(tf, 1)).toBe(false);
  });
});
