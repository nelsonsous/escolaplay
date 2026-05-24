// Gera packs tipados a partir do content.js da PWA (fonte de verdade).
// Carrega o ficheiro num sandbox com um shim de `window`, extrai os dados
// por ano e escreve packages/core/src/content/generated.ts.
//
// Também processa SECRET_PACKS (content_secret.js) e COURSE_ENGLISH_PM
// (content_course_english.js) para incluir o pack "english-pm" do ano 99.
//
// Correr: node scripts/gen-content.mjs
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
// Por defeito procura no PWA principal em ~/Documents/Apps/EscolaPlay.
// Override via env var PWA_ROOT se estiver noutro sitio.
const PWA_ROOT = process.env.PWA_ROOT || '/Users/nelsondias/Documents/Apps/EscolaPlay';
const OUT = path.resolve(here, '../packages/core/src/content/generated.ts');

if (!fs.existsSync(path.join(PWA_ROOT, 'content.js'))) {
  console.error(`PWA_ROOT nao tem content.js: ${PWA_ROOT}`);
  console.error('Define a env var PWA_ROOT para o caminho correto.');
  process.exit(1);
}

const sandbox = { window: {}, console, Math, Date, JSON, Object, Array, String, Number };
vm.createContext(sandbox);

function loadIntoSandbox(relPath) {
  const full = path.join(PWA_ROOT, relPath);
  if (!fs.existsSync(full)) return false;
  const code = fs.readFileSync(full, 'utf8');
  vm.runInContext(code, sandbox, { timeout: 10000 });
  return true;
}

loadIntoSandbox('content.js');
loadIntoSandbox('content_secret.js');
loadIntoSandbox('content_course_english.js');

const w = sandbox.window;
const SECRET_PACKS = sandbox.SECRET_PACKS || w.SECRET_PACKS || [];

const SUPPORTED = new Set(['mc', 'tf', 'fill', 'speak']);

function normDifficulty(d) {
  const n = Number(d);
  return n === 1 || n === 2 || n === 3 ? n : 1;
}

// Converte um exercicio legado para o modelo tipado, ou null se nao for
// suportado (order/match/roleplay) ou estiver malformado.
function convert(e) {
  let type = e.type;
  // 'problem' = enunciado de problema; comporta-se como mc ou fill.
  if (type === 'problem') {
    type = Array.isArray(e.opts) && typeof e.ans === 'number' ? 'mc' : 'fill';
  }
  // 'speak' = traducao com prompt em PT, resposta em texto livre.
  // Tratamos como tipo proprio "speak"; a UI pode renderiza-lo como fill
  // mas com cor diferente / icone de microfone.
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
  if (e.tip !== undefined) base.tip = e.tip;
  if (e.lang !== undefined) base.lang = e.lang;

  if (type === 'mc') {
    if (!Array.isArray(e.opts) || typeof e.ans !== 'number') return null;
    if (e.ans < 0 || e.ans >= e.opts.length) return null;
    base.options = e.opts;
    base.answer = e.ans;
  } else if (type === 'tf') {
    if (typeof e.ans !== 'boolean') return null;
    base.answer = e.ans;
  } else {
    // fill / speak
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

// ============ Anos escolares (content.js) ============

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

// ============ Pack english-pm (ano 99, do content_secret.js) ============

const pmSecret = SECRET_PACKS.find((p) => p.id === 'english-pm');
if (pmSecret) {
  const payload = JSON.parse(pmSecret.payloadJSON);
  const pmExercises = [];
  let pmKept = 0, pmSkipped = 0;
  for (const e of payload.exercises) {
    const c = convert(e);
    if (c) { pmExercises.push(c); pmKept++; } else { pmSkipped++; }
  }

  // Modo curso (content_course_english.js).
  let course;
  const courseRaw = w.COURSE_ENGLISH_PM;
  if (courseRaw) {
    course = {
      subjectKey: courseRaw.subjectKey,
      title: courseRaw.title,
      units: courseRaw.units.map((u) => ({
        id: u.id,
        title: u.title,
        color: u.color,
        icon: u.icon,
        lessonIds: [...u.lessonIds],
      })),
      lessons: courseRaw.lessons.map((l) => {
        const lesson = {
          id: l.id,
          title: l.title,
          exerciseIds: [...l.exerciseIds],
        };
        if (l.subtitle !== undefined) lesson.subtitle = l.subtitle;
        if (l.unlocked !== undefined) lesson.unlocked = l.unlocked;
        return lesson;
      }),
    };
  }

  packs['en-PM.english-pm'] = {
    id: 'en-PM.english-pm',
    locale: 'en-US',
    grade: 99,
    label: payload.label || pmSecret.label || 'English for PMs',
    subjects: subjectsToArray(payload.subjects),
    curriculum: payload.curriculum,
    exercises: pmExercises,
    ...(course ? { course } : {}),
  };
  kept += pmKept;
  skipped += pmSkipped;
  console.log(`Pack english-pm: ${pmKept} exercicios (${pmSkipped} ignorados — roleplay/other)`);
}

const header = `// GERADO automaticamente por scripts/gen-content.mjs — NAO editar a mao.
// Fonte: content.js + content_secret.js + content_course_english.js da PWA.
// Reexecutar o script para atualizar.
import type { CurriculumPack } from '../domain/types.js';

export const GENERATED_PACKS: Record<string, CurriculumPack> = `;

fs.writeFileSync(OUT, header + JSON.stringify(packs) + ';\n', 'utf8');

const sizeKb = Math.round(fs.statSync(OUT).size / 1024);
console.log(`Packs: ${Object.keys(packs).join(', ')}`);
console.log(`Exercicios: ${kept} convertidos, ${skipped} ignorados (order/match/roleplay/malformados)`);
console.log(`Escrito ${OUT} (${sizeKb} KB)`);
