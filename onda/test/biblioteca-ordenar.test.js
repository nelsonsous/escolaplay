// A biblioteca (onda/lib/ordenar.onda) contra o Array.prototype.sort do V8, comparação a comparação: o _or_tim contra o
// Node 22 (o TimSort clássico) e o _or_power contra o Chromium (o PowerSort; com o Playwright). As listas têm chaves
// que não dão uma ordem (NaN, que empata com tudo), corridas a subir e a descer, empates e até 5 000 elementos: aí só
// fazendo as mesmas comparações pela mesma ordem se chega ao mesmo resultado. O código otimizado do V8 (Maglev,
// Turbofan) troca o sort de listas pequenas por uma inserção linear; chega-se ao builtin com uma lista com buracos.
const { test } = require('node:test');
const assert = require('node:assert');
const { criar } = require('./lib/sonda.js');

const S = criar();
const LISTAS = +process.env.LISTAS || 3000;
// as listas (o mesmo código corre no Node e no browser: a mesma semente dá as mesmas listas)
const GERA = `(function (it, seed) {
  let s = (seed + it * 7919) >>> 0;
  const R = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const pick = (a) => a[Math.floor(R() * a.length)];
  const n = it % 10 < 5 ? Math.floor(R() * 70) : it % 10 < 9 ? Math.floor(R() * 600) : Math.floor(R() * 5000);
  const tipo = it % 6;
  const gen = () => (tipo === 0 ? Math.floor(R() * 10) : tipo === 1 ? (R() < 0.15 ? NaN : Math.floor(R() * 50)) : tipo === 2 ? pick([NaN, Infinity, -Infinity, 0, -0, 1, 2, 1e308, -1e308]) : tipo === 3 ? R() * 100 : Math.floor(R() * 1000));
  const k1 = Array.from({ length: n }, gen), k2 = Array.from({ length: n }, gen);
  if (tipo >= 4) { let i = 0; while (i < n) { const L = Math.floor(R() * 120) + 1, up = R() < 0.5, seg = k1.slice(i, i + L).sort((a, b) => (up ? a - b : b - a)); seg.forEach((x, j) => { k1[i + j] = x; }); i += L; } }
  if (tipo === 5) for (let i = 0; i < n; i++) if (R() < 0.05) k1[i] = NaN;
  return { k1, k2, modo: Math.floor(R() * 8) };
})`;
const gera = eval(GERA);
// o sort do JS: a ordem dos índices pelo comparador do código modo
const ORDEM_JS = `(function ({ k1, k2, modo }) {
  const cmp = (a, b) => { let d = modo & 1 ? k1[a] - k1[b] : k1[b] - k1[a]; if (modo & 2 && !d) d = modo & 4 ? k2[a] - k2[b] : k2[b] - k2[a]; return d; };
  const w = new Array(k1.length + 1);
  for (let i = 0; i < k1.length; i++) w[i] = i;
  w.length = k1.length; // uma lista com buracos (HOLEY): o builtin, e não a inserção do código otimizado
  return w.sort(cmp);
})`;
const ordemJs = eval(ORDEM_JS);
// a ordem da Onda (f = t_power ou t_tim)
function ordemOnda(f, { k1, k2, modo }) {
  const n = k1.length, m = S.marca(), w = S.reserva(n + 1), a = S.reserva(n + 1), b = S.reserva(n + 1);
  for (let i = 0; i < n; i++) { S.pi(w + i, i); S.pf(a + i, k1[i]); S.pf(b + i, k2[i]); }
  S.chamar(f, BigInt(w), BigInt(n), BigInt(a), BigInt(b), BigInt(modo));
  const r = Array.from({ length: n }, (_, i) => S.gi(w + i));
  S.solta(m);
  return r;
}

test(`_or_tim: a mesma ordem que o sort do Node 22 (TimSort) em ${LISTAS} listas com NaN, corridas e empates`, () => {
  let mal = 0, maior = 0;
  for (let it = 0; it < LISTAS; it++) {
    const L = gera(it, 77), js = ordemJs(L), onda = ordemOnda('t_tim', L);
    maior = Math.max(maior, L.k1.length);
    if (js.join() !== onda.join()) { mal++; if (mal < 4) console.log('diferente:', it, L.k1.length, L.modo); }
  }
  assert.strictEqual(mal, 0);
  assert.ok(maior > 1000);
});

test(`_or_power: a mesma ordem que o sort do Chromium (PowerSort) em ${LISTAS} listas`, async (t) => {
  let pw;
  try { pw = require('playwright'); } catch { t.skip('sem playwright'); return; }
  let browser;
  try { browser = await pw.chromium.launch(); } catch (e) { t.skip('sem Chromium: ' + e.message.split('\n')[0]); return; }
  try {
    const page = await browser.newPage();
    const js = await page.evaluate(({ GERA, ORDEM_JS, LISTAS }) => {
      const gera = eval(GERA), ordem = eval(ORDEM_JS), r = [];
      for (let it = 0; it < LISTAS; it++) r.push(ordem(gera(it, 77)).join());
      return { r, ua: navigator.userAgent };
    }, { GERA, ORDEM_JS, LISTAS });
    let mal = 0, difTim = 0;
    for (let it = 0; it < LISTAS; it++) {
      const L = gera(it, 77), onda = ordemOnda('t_power', L).join();
      if (js.r[it] !== onda) { mal++; if (mal < 4) console.log('diferente:', it, L.k1.length, L.modo); }
      if (onda !== ordemOnda('t_tim', L).join()) difTim++;
    }
    console.log(`# ${LISTAS - mal}/${LISTAS} iguais ao ${js.ua.match(/Chrome\/[\d.]+/)}; o PowerSort e o TimSort diferem em ${difTim} (as chaves NaN)`);
    assert.strictEqual(mal, 0);
    assert.ok(difTim > 0, 'as listas distinguem os dois algoritmos');
  } finally { await browser.close(); }
});
