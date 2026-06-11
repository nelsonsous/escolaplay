// EscolaPlay — build pipeline
//
// Produz uma pasta dist/ pronta para deploy estático com tudo minificado:
// - JS: terser (mangle + compress)
// - CSS: csso (estrutural + dead-code)
// - HTML: html-minifier-terser (collapse whitespace, mantém attrs)
//
// Workflow:
//   npm install              # uma vez
//   npm run build            # produz dist/ (pronto para upload)
//   npm run build:report     # build + tabela de tamanhos antes/depois
//
// O HTML de entrada é index.html. As referências aos .js/.css mantêm-se
// inalteradas (apenas o conteúdo é minificado in-place na dist/).

import { promises as fs } from 'node:fs';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { minify as minifyJS } from 'terser';
import { minify as minifyHTML } from 'html-minifier-terser';
import * as csso from 'csso';

const ROOT = path.resolve('.');
const DIST = path.resolve('./dist');
const REPORT = process.argv.includes('--report');

const stats = [];

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function clean() {
  await fs.rm(DIST, { recursive: true, force: true });
  await ensureDir(DIST);
}

async function listFiles(dir, predicate) {
  const out = [];
  for (const ent of await fs.readdir(dir, { withFileTypes: true })) {
    if (ent.name === 'dist' || ent.name === 'node_modules' || ent.name.startsWith('.')) continue;
    if (ent.name === 'tts-proxy') continue; // o worker tem o seu próprio deploy
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      const sub = await listFiles(full, predicate);
      out.push(...sub);
    } else if (predicate(ent.name)) {
      out.push(full);
    }
  }
  return out;
}

async function copyDir(src, dst) {
  await ensureDir(dst);
  for (const ent of await fs.readdir(src, { withFileTypes: true })) {
    const a = path.join(src, ent.name);
    const b = path.join(dst, ent.name);
    if (ent.isDirectory()) await copyDir(a, b);
    else await fs.copyFile(a, b);
  }
}

function track(name, before, after) {
  stats.push({ name, before, after, saved: before - after });
}

async function minifyJsFile(rel) {
  const src = await fs.readFile(rel, 'utf8');
  const before = Buffer.byteLength(src);
  try {
    const out = await minifyJS(src, {
      compress: {
        passes: 2,
        drop_console: false,        // mantemos console.* — útil em produção
        dead_code: true,
        unused: true,
      },
      mangle: true,
      format: { comments: /^!|@preserve|@license|@cc_on/i },
    });
    const code = out.code || src;
    const dst = path.join(DIST, path.relative(ROOT, rel));
    await ensureDir(path.dirname(dst));
    await fs.writeFile(dst, code);
    track(path.relative(ROOT, rel), before, Buffer.byteLength(code));
  } catch (e) {
    console.warn(`[js] falhou ${rel}, copia plain:`, e.message);
    const dst = path.join(DIST, path.relative(ROOT, rel));
    await ensureDir(path.dirname(dst));
    await fs.copyFile(rel, dst);
    track(path.relative(ROOT, rel), before, before);
  }
}

async function minifyCssFile(rel) {
  const src = await fs.readFile(rel, 'utf8');
  const before = Buffer.byteLength(src);
  let code = src;
  try {
    code = csso.minify(src, { restructure: true }).css;
  } catch (e) {
    console.warn(`[css] falhou ${rel}:`, e.message);
  }
  const dst = path.join(DIST, path.relative(ROOT, rel));
  await ensureDir(path.dirname(dst));
  await fs.writeFile(dst, code);
  track(path.relative(ROOT, rel), before, Buffer.byteLength(code));
}

async function minifyHtmlFile(rel) {
  const src = await fs.readFile(rel, 'utf8');
  const before = Buffer.byteLength(src);
  let code = src;
  try {
    code = await minifyHTML(src, {
      collapseWhitespace: true,
      removeComments: true,
      conservativeCollapse: false,
      minifyCSS: false,        // já minificamos os .css externos
      minifyJS: false,         // idem para os .js externos
      removeRedundantAttributes: true,
      removeAttributeQuotes: false, // segurança: alguns parsers HTML são frágeis
    });
  } catch (e) {
    console.warn(`[html] falhou ${rel}:`, e.message);
  }
  const dst = path.join(DIST, path.relative(ROOT, rel));
  await ensureDir(path.dirname(dst));
  await fs.writeFile(dst, code);
  track(path.relative(ROOT, rel), before, Buffer.byteLength(code));
}

async function main() {
  console.log('🔧 Build EscolaPlay...');
  await clean();

  // 1) JS — todos os .js no root
  const jsFiles = await listFiles(ROOT, n => n.endsWith('.js') && n !== 'build.mjs');
  for (const f of jsFiles) await minifyJsFile(f);

  // 2) CSS — todos os .css no root
  const cssFiles = await listFiles(ROOT, n => n.endsWith('.css'));
  for (const f of cssFiles) await minifyCssFile(f);

  // 3) HTML
  const htmlFiles = await listFiles(ROOT, n => n.endsWith('.html'));
  for (const f of htmlFiles) await minifyHtmlFile(f);

  // 4) Assets estáticos — manifest, ícones, imagens
  if (existsSync(path.join(ROOT, 'manifest.json'))) {
    await fs.copyFile(path.join(ROOT, 'manifest.json'), path.join(DIST, 'manifest.json'));
  }
  if (existsSync(path.join(ROOT, 'icons'))) {
    await copyDir(path.join(ROOT, 'icons'), path.join(DIST, 'icons'));
  }

  // Sumário
  const totalBefore = stats.reduce((s, x) => s + x.before, 0);
  const totalAfter = stats.reduce((s, x) => s + x.after, 0);
  const pct = totalBefore ? Math.round((1 - totalAfter / totalBefore) * 100) : 0;
  console.log(`✅ dist/ pronto.`);
  console.log(`📦 ${(totalBefore / 1024).toFixed(0)} KB → ${(totalAfter / 1024).toFixed(0)} KB (-${pct}%)`);

  if (REPORT) {
    const sorted = stats.slice().sort((a, b) => b.saved - a.saved);
    console.log('\nTop 15 ficheiros (por bytes poupados):');
    console.log('   antes   depois  poupou  ficheiro');
    for (const s of sorted.slice(0, 15)) {
      const bef = (s.before / 1024).toFixed(0).padStart(6) + ' KB';
      const aft = (s.after / 1024).toFixed(0).padStart(6) + ' KB';
      const sav = (s.saved / 1024).toFixed(0).padStart(5) + ' KB';
      console.log(`  ${bef}  ${aft}  ${sav}   ${s.name}`);
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
