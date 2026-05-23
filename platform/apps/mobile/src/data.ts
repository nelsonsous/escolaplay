// Dados de demonstracao para o layout. Exercicios reais de 2.º ano
// (content.js) convertidos pelo core. Foco: aspeto — perguntas reais
// vêm depois.
import { buildPackFromLegacy } from '@escolaplay/core';
import type { Profile, CurriculumPack } from '@escolaplay/core';

export const demoPack: CurriculumPack = buildPackFromLegacy({
  locale: 'pt-PT',
  grade: 2,
  label: '2.º ano',
  subjects: {
    portugues: { name: 'Português', icon: 'fa-book', color: '#e11d48' },
    matematica: { name: 'Matemática', icon: 'fa-calculator', color: '#2563eb' },
    estudo_meio: { name: 'Estudo do Meio', icon: 'fa-globe', color: '#16a34a' },
    ingles: { name: 'Inglês', icon: 'fa-language', color: '#7c3aed' },
  },
  curriculum: {
    portugues: ['Vogais e consoantes', 'Sílabas', 'Sinónimos', 'Antónimos'],
    matematica: ['Números até 100', 'Dezenas e unidades', 'Adição até 100'],
    estudo_meio: ['O meu corpo', 'Os sentidos'],
    ingles: ['Cores'],
  },
  exercises: [
    { id: '2p1', s: 'portugues', t: 'Vogais e consoantes', type: 'mc', diff: 1, q: 'Quais são as vogais?', opts: ['a, e, i, o, u', 'a, b, c, d, e', 'b, c, d, f, g', 'i, j, k, l, m'], ans: 0, exp: 'As vogais são 5: a, e, i, o, u.' },
    { id: '2p2', s: 'portugues', t: 'Sílabas', type: 'fill', diff: 1, q: 'Quantas sílabas tem a palavra "menina"?', ans: ['3', 'três'], exp: 'Me-ni-na = 3 sílabas.' },
    { id: '2p4', s: 'portugues', t: 'Sinónimos', type: 'mc', diff: 2, q: 'Qual é o sinónimo de "bonito"?', opts: ['feio', 'belo', 'triste', 'rápido'], ans: 1, exp: 'Bonito e belo significam o mesmo.' },
    { id: '2p6', s: 'portugues', t: 'Antónimos', type: 'fill', diff: 1, q: 'O antónimo de "quente" é ___.', ans: ['frio'], exp: 'Quente ≠ frio.' },
    { id: '2m1', s: 'matematica', t: 'Números até 100', type: 'mc', diff: 2, q: 'Quantas dezenas tem o número 47?', opts: ['4', '7', '47', '40'], ans: 0, exp: '47 = 4 dezenas + 7 unidades.' },
    { id: '2m2', s: 'matematica', t: 'Dezenas e unidades', type: 'fill', diff: 2, q: 'O número que tem 6 dezenas e 3 unidades é ___.', ans: ['63'], exp: '6 dezenas = 60. 60 + 3 = 63.' },
    { id: '2m3', s: 'matematica', t: 'Adição até 100', type: 'fill', diff: 2, q: '25 + 13 = ___', ans: ['38'], exp: '5+3=8. 2+1=3. Resultado: 38.' },
    { id: '2e1', s: 'estudo_meio', t: 'O meu corpo', type: 'mc', diff: 2, q: 'Quais são as 3 grandes partes do corpo humano?', opts: ['cabeça, tronco, membros', 'braços, pernas, mãos', 'olhos, nariz, boca', 'músculos, ossos, pele'], ans: 0, exp: 'Cabeça, tronco e membros.' },
    { id: '2e2', s: 'estudo_meio', t: 'Os sentidos', type: 'mc', diff: 1, q: 'Com que sentido ouvimos os sons?', opts: ['visão', 'audição', 'olfato', 'tato'], ans: 1, exp: 'Audição = ouvir, com os ouvidos.' },
    { id: '2i1', s: 'ingles', t: 'Cores', type: 'mc', diff: 1, q: '🔴 Que cor é esta em inglês?', opts: ['red', 'blue', 'yellow'], ans: 0, exp: '🔴 = red.' },
    { id: '2i2', s: 'ingles', t: 'Cores', type: 'mc', diff: 1, q: '🔵 Que cor é esta em inglês?', opts: ['green', 'blue', 'pink'], ans: 1, exp: '🔵 = blue.' },
  ],
});

export const demoProfile: Profile = {
  id: 'demo',
  name: 'Laura',
  avatar: '🦊',
  packId: demoPack.id,
  xp: 1750,
  streakDays: 7,
  subjects: {
    portugues: { xp: 320, seenIds: ['2p1', '2p2', '2p4'], correct: 14, attempts: 16 },
    matematica: { xp: 210, seenIds: ['2m1'], correct: 8, attempts: 12 },
    estudo_meio: { xp: 90, seenIds: ['2e1', '2e2'], correct: 5, attempts: 6 },
    ingles: { xp: 40, seenIds: [], correct: 2, attempts: 2 },
  },
};

// Meta diaria (demo).
export const dailyGoal = { done: 3, target: 5 };
