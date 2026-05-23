// Validacao de respostas. Extraida de app.js (submitAnswer + normalize)
// como funcoes puras. Cobre os tipos mc, tf e fill — os mais comuns.

import type { Exercise } from '../domain/types.js';

/** Resposta do utilizador conforme o tipo de exercicio. */
export type UserAnswer = number | boolean | string;

/**
 * Normaliza texto para comparacao tolerante (igual a app.js):
 * minusculas, sem acentos, espacos colapsados.
 */
export function normalizeText(s: string): string {
  return String(s)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Valida uma resposta de "fill" contra as respostas aceites, com a mesma
 * tolerancia da PWA: match exato apos normalizar, ou inclusao parcial
 * quando a resposta tem 3+ caracteres.
 */
export function checkFillAnswer(accepted: string[], userText: string): boolean {
  const n = normalizeText(userText);
  if (!n) return false;
  return accepted.some((a) => {
    const na = normalizeText(a);
    return na === n || (n.length >= 3 && (na.includes(n) || n.includes(na)));
  });
}

/**
 * Valida a resposta de um exercicio. Lanca se o tipo da resposta nao
 * corresponder ao tipo do exercicio (erro de programacao, nao de utilizador).
 */
export function checkAnswer(exercise: Exercise, userAnswer: UserAnswer): boolean {
  switch (exercise.type) {
    case 'mc': {
      if (typeof userAnswer !== 'number') return false;
      return userAnswer === exercise.answer;
    }
    case 'tf': {
      if (typeof userAnswer !== 'boolean') return false;
      return userAnswer === exercise.answer;
    }
    case 'fill': {
      if (typeof userAnswer !== 'string') return false;
      const accepted = Array.isArray(exercise.answer)
        ? (exercise.answer as unknown[]).map(String)
        : [String(exercise.answer)];
      return checkFillAnswer(accepted, userAnswer);
    }
    // order/match precisam de campos extra (items/pairs) ainda nao
    // modelados — tratados quando migrarmos esses tipos.
    default:
      return false;
  }
}
