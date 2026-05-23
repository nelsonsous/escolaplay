// Teste de integracao: prova o pipeline completo que a Home usa —
// conteudo legado -> pack tipado -> dados de nivel/XP.

import { describe, it, expect } from 'vitest';
import { buildPackFromLegacy, levelInfo, levelProgressPercent } from './index.js';

const SUBJECTS_2 = {
  portugues: { name: 'Português', icon: 'fa-book', color: '#e11d48' },
  matematica: { name: 'Matemática', icon: 'fa-calculator', color: '#2563eb' },
  estudo_meio: { name: 'Estudo do Meio', icon: 'fa-globe', color: '#16a34a' },
  ingles: { name: 'Inglês', icon: 'fa-language', color: '#7c3aed' },
};

const EXERCISES_2 = [
  { id: '2p1', s: 'portugues', t: 'Vogais e consoantes', type: 'mc', diff: 1, q: 'Quais são as vogais?', opts: ['a, e, i, o, u', 'b, c, d', 'x, y, z', 'p, q, r'], ans: 0, exp: 'São 5.' },
  { id: '2m1', s: 'matematica', t: 'Adição até 100', type: 'fill', diff: 2, q: '23 + 19 = ?', ans: ['42'], exp: '42.' },
];

describe('pipeline Home (conteudo legado -> pack -> nivel)', () => {
  it('constroi o pack e expõe disciplinas para a grelha da Home', () => {
    const pack = buildPackFromLegacy({
      locale: 'pt-PT',
      grade: 2,
      label: '2.º ano',
      subjects: SUBJECTS_2,
      curriculum: { portugues: ['Vogais e consoantes'], matematica: ['Adição até 100'] },
      exercises: EXERCISES_2,
    });

    expect(pack.id).toBe('pt-PT.grade-2');
    expect(pack.subjects.map((s) => s.key)).toEqual([
      'portugues',
      'matematica',
      'estudo_meio',
      'ingles',
    ]);
    // dados que o cabecalho da Home renderiza para um perfil com 1750 XP
    const lvl = levelInfo(1750);
    expect(lvl.name).toBe('Explorador');
    expect(levelProgressPercent(1750)).toBe(17); // 250/1500
  });
});
