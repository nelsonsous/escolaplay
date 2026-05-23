// Gera packs tipados a partir do content.js da PWA (fonte de verdade).
// Carrega o ficheiro num sandbox com um shim de `window`, extrai os dados
// por ano e escreve packages/core/src/content/generated.ts.
//
// Correr: node scripts/gen-content.mjs
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const PWA_CONTENT = path.resolve(here, '../../content.js');
const OUT = path.resolve(here, '../packages/core/src/content/generated.ts');

const code = fs.readFileSync(PWA_CONTENT, 'utf8');
const sandbox = { window: {}, console, Math, Date, JSON, Object, Array, String, Number };
vm.createContext(sandbox);
vm.runInContext(code, sandbox, { timeout: 10000 });
const w = sandbox.window;

const SUPPORTED = new Set(['mc', 'tf', 'fill']);

function normDifficulty(d) {
  const n = Number(d);
  return n === 1 || n === 2 || n === 3 ? n : 1;
}

// Converte um exercicio legado para o modelo tipado, ou null se nao for
// suportado (order/match) ou estiver malformado.
function convert(e) {
  let type = e.type;
  // 'problem' = enunciado de problema; comporta-se como mc (se tem opcoes
  // e resposta numerica) ou como fill.
  if (type === 'problem') {
    type = Array.isArray(e.opts) && typeof e.ans === 'number' ? 'mc' : 'fill';
  }
  if (!SUPPORTED.has(type)) return null;

  const base = {
    id: e.id,
    subject: e.s,
    topic: e.t,
    type,
    difficulty: normDifficulty(e.diff),
    question: e.q,
  };
  if (e.exp !== undefined) base.explanation = e.exp;

  if (type === 'mc') {
    if (!Array.isArray(e.opts) || typeof e.ans !== 'number') return null;
    if (e.ans < 0 || e.ans >= e.opts.length) return null;
    base.options = e.opts;
    base.answer = e.ans;
  } else if (type === 'tf') {
    if (typeof e.ans !== 'boolean') return null;
    base.answer = e.ans;
  } else {
    // fill
    const arr = Array.isArray(e.ans) ? e.ans : [e.ans];
    base.answer = arr.map((a) => String(a));
  }
  return base;
}

function subjectsToArray(subjects) {
  return Object.entries(subjects).map(([key, def]) => ({
    key, name: def.name, icon: def.icon, color: def.color,
  }));
}

const YEARS = w.YEARS_AVAILABLE.filter((y) => (w.EXERCISES_BY_YEAR[y.year] || []).length > 0);
const packs = {};
let kept = 0, skipped = 0;

for (const { year, label } of YEARS) {
  const rawEx = w.EXERCISES_BY_YEAR[year] || [];
  const exercises = [];
  for (const e of rawEx) {
    const c = convert(e);
    if (c) { exercises.push(c); kept++; } else { skipped++; }
  }
  const id = `pt-PT.grade-${year}`;
  packs[id] = {
    id,
    locale: 'pt-PT',
    grade: year,
    label,
    subjects: subjectsToArray(w.SUBJECTS_BY_YEAR[year] || {}),
    curriculum: w.CURRICULUM_BY_YEAR[year] || {},
    exercises,
  };
}

const header = `// GERADO automaticamente por scripts/gen-content.mjs — NAO editar a mao.
// Fonte: content.js da PWA. Reexecutar o script para atualizar.
import type { CurriculumPack } from '../domain/types.js';

export const GENERATED_PACKS: Record<string, CurriculumPack> = `;

fs.writeFileSync(OUT, header + JSON.stringify(packs) + ';\n', 'utf8');

const sizeKb = Math.round(fs.statSync(OUT).size / 1024);
console.log(`Packs: ${Object.keys(packs).join(', ')}`);
console.log(`Exercicios: ${kept} convertidos, ${skipped} ignorados (order/match/malformados)`);
console.log(`Escrito ${OUT} (${sizeKb} KB)`);
