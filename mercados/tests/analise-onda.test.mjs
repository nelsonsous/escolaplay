// node --test mercados/tests/analise-onda.test.mjs
// O motor em Onda (analise-onda.js, gerado de onda/analise.onda) tem de dar o mesmo que o analyse() de analise.js:
// textos, chaves, booleanos, nulls e comprimentos iguais; números iguais a 1e-12 (na prática, iguais ao bit).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const A = require('../analise.js');
const O = require('../analise-onda.js');
await O.ready;

// ---------- casos pseudo-aleatórios determinísticos ----------
function rng(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
const KINDS = [undefined, 'fund', 'stock', 'crypto', 'index'];
const NEWS = [undefined, null, 0, 0.1, -0.19, 0.2, -0.5, 1, -1, 0.35];
const VOLS = [0.003, 0.006, 0.01, 0.02, 0.035, 0.06, 0.1]; // de um ETF calmo a uma cripto agitada (por dia)
const EDGE = [29, 30, 31, 34, 35, 36, 49, 50, 51, 59, 60, 61, 63, 64, 119, 120, 121, 130, 131, 136, 199, 200, 201, 219, 220, 221, 252, 253, 272, 273];
const BAD = [NaN, Infinity, -Infinity, 0, -1, -0, -5.5, null, undefined, '7', true];
function gauss(r) { let u = 0; while (u === 0) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); }
function makeCase(i) {
    const r = rng(1000 + i * 7919);
    const pick = (a) => a[Math.floor(r() * a.length)];
    // comprimento 0–600, sobretudo 20–300, e os limites do JS (30, 35, 50, 60, 63, 120, 126, 200, 252…)
    const u = r();
    const n = u < 0.06 ? Math.floor(r() * 30) : u < 0.16 ? pick(EDGE) : u < 0.86 ? 20 + Math.floor(r() * 281) : Math.floor(r() * 601);
    const style = r();
    let x = Math.exp((r() - 0.4) * 30); // preços de ~1e-5 a ~1e8
    let closes = [];
    if (style < 0.05) for (let k = 0; k < n; k++) closes.push(x); // plana
    else if (style < 0.1) { const g = (r() - 0.5) * 0.02; for (let k = 0; k < n; k++) { x *= 1 + g; closes.push(x); } } // monótona
    else if (style < 0.3) {
        // tendência e um movimento forte no fim (descontos, oportunidades, ressaltos)
        const g = (r() - 0.3) * 0.008, j = (r() < 0.75 ? -1 : 1) * (0.05 + r() * 0.35), m = 1 + Math.floor(r() * 40), vol = pick(VOLS) / 3;
        for (let k = 0; k < n; k++) { x *= Math.exp((k >= n - m ? Math.log(1 + j) / m : g) + vol * gauss(r)); closes.push(x); }
    } else {
        // passeio aleatório por regimes, com saltos e, às vezes, um crash
        let drift = (r() - 0.5) * 0.01, vol = pick(VOLS);
        for (let k = 0; k < n; k++) {
            if (r() < 0.02) { drift = (r() - 0.5) * 0.02; vol = pick(VOLS); }
            x *= Math.exp(drift + vol * gauss(r));
            if (r() < 0.01) x *= pick([0.3, 0.5, 0.7, 1.3, 2, 4]);
            closes.push(x);
        }
        if (r() < 0.1) { const k0 = Math.floor(r() * n); for (let k = k0; k < n; k++) closes[k] *= 0.6; }
    }
    if (r() < 0.15) { const f = pick([1, 100, 10000]); closes = closes.map((c) => Math.round(c * f) / f); } // empates
    if (r() < 0.12 && n) { const m = 1 + Math.floor(r() * 6); for (let k = 0; k < m; k++) closes[Math.floor(r() * n)] = pick(BAD); }
    const opts = {};
    const kind = pick(KINDS);
    if (kind !== undefined) opts.kind = kind;
    if (r() < 0.5) opts.crypto = r() < 0.5;
    const nw = pick(NEWS);
    if (nw !== undefined || r() < 0.5) opts.news = nw;
    return { closes, opts: r() < 0.08 ? undefined : opts };
}

// ---------- comparação com caminho ----------
// textos, booleanos, nulls e comprimentos exatos; números a 1e-12 (relativo, ou absoluto perto de zero).
// st.inexact conta os números que não são iguais ao bit (Object.is).
function diff(a, b, path, st) {
    if (typeof a === 'number' && typeof b === 'number') {
        if (Object.is(a, b)) return null;
        st.inexact++;
        if (!st.firstInexact) st.firstInexact = { path, a, b };
        if (Math.abs(a - b) <= 1e-12 * Math.max(1, Math.abs(a), Math.abs(b))) return null;
        return { path, a, b };
    }
    if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return a === b ? null : { path, a, b };
    if (Array.isArray(a) !== Array.isArray(b)) return { path, a, b };
    if (Array.isArray(a)) {
        if (a.length !== b.length) return { path: path + '.length', a: a.length, b: b.length };
        for (let i = 0; i < a.length; i++) { const d = diff(a[i], b[i], `${path}[${i}]`, st); if (d) return d; }
        return null;
    }
    const ka = Object.keys(a), kb = Object.keys(b);
    if (ka.join() !== kb.join()) return { path: (path ? path + '.' : '') + '{chaves}', a: ka.join(), b: kb.join() };
    for (const k of ka) { const d = diff(a[k], b[k], path ? `${path}.${k}` : k, st); if (d) return d; }
    return null;
}
const show = (v) => (typeof v === 'string' ? JSON.stringify(v) : Object.is(v, -0) ? '-0' : String(v));

test('paridade com analise.js em 4000 séries (JS vs Onda, campo a campo)', () => {
    const N = 4000;
    const cases = Array.from({ length: N }, (_, i) => makeCase(i));
    const got = O.analyseMany(cases);
    assert.equal(got.length, N);
    const st = { inexact: 0 };
    const keys = new Set(), verdicts = new Set();
    let nulls = 0;
    for (let i = 0; i < N; i++) {
        const js = A.analyse(cases[i].closes, cases[i].opts);
        const d = diff(js, got[i], '', st);
        if (d) assert.fail(`caso ${i}: ${d.path || '(raiz)'}: JS ${show(d.a)} ≠ Onda ${show(d.b)}`);
        if (js) { keys.add(js.advice.key); verdicts.add(js.discount.verdict); } else nulls++;
    }
    // os números não só batem a 1e-12: são os mesmos bits
    assert.equal(st.inexact, 0, st.firstInexact && `não exato: ${st.firstInexact.path}: ${show(st.firstInexact.a)} vs ${show(st.firstInexact.b)}`);
    // o gerador cobre todos os conselhos e vereditos alcançáveis (e também séries curtas demais)
    assert.equal(keys.size, 7, [...keys].join());
    assert.equal(verdicts.size, 7, [...verdicts].join('|'));
    assert.ok(nulls > 100 && nulls < N / 2, `nulls ${nulls}`);
});

test('analyse() é o analyseMany de uma série; séries vazias e curtas dão null', () => {
    const c = makeCase(3).closes;
    assert.deepEqual(O.analyse(c, { kind: 'fund', news: 0.4 }), A.analyse(c, { kind: 'fund', news: 0.4 }));
    assert.deepEqual(O.analyse(c), A.analyse(c));
    assert.equal(O.analyse([1, 2, 3]), null);
    assert.equal(O.analyse(null), null);
    assert.deepEqual(O.analyseMany([]), []);
    assert.deepEqual(O.analyseMany([{ closes: [] }, { closes: Array(40).fill(NaN) }]), [null, null]);
    // opts = null: o JS só falha quando passa do filtro (30 fechos válidos)
    assert.equal(O.analyse([1, 2], null), A.analyse([1, 2], null));
    const long = Array.from({ length: 40 }, (_, i) => 10 + i);
    assert.throws(() => A.analyse(long, null), TypeError);
    assert.throws(() => O.analyse(long, null), TypeError);
});

test('entradas extremas (somas e razões que transbordam, subnormais, saltos de 10^19): igual ao JSON do JS', () => {
    const cases = Array.from({ length: 400 }, (_, i) => {
        const r = rng(99 + i), n = 30 + Math.floor(r() * 300), mode = i % 5;
        const closes = Array.from({ length: n }, (_, k) => [
            () => 10 ** ((r() - 0.5) * 600), () => 1.7e308 * (0.5 + r() / 2), () => 5e-324 * (1 + Math.floor(r() * 1000)),
            () => (r() < 0.5 ? 1e-15 : 100), () => (k % 2 ? 1e19 : 1) * (1 + r())][mode]());
        return { closes, opts: { kind: KINDS[i % 5], news: [0.3, -0.5, null][i % 3] } };
    });
    const got = O.analyseMany(cases);
    const st = { inexact: 0 };
    cases.forEach((c, i) => {
        // Infinity e NaN não existem em JSON: o JSON.stringify do JS escreve null, e a Onda também
        const js = JSON.parse(JSON.stringify(A.analyse(c.closes, c.opts)));
        const d = diff(js, got[i], '', st);
        if (d) assert.fail(`extremo ${i}: ${d.path}: JS ${show(d.a)} ≠ Onda ${show(d.b)}`);
    });
});

test('pct: o toFixed(1) do JS sobre o valor exato (metades, -0, minúsculos, grandes)', () => {
    const pct = (x) => (x >= 0 ? '+' : '') + (x * 100).toFixed(1).replace('.', ',') + '%'; // o de analise.js
    const xs = [0, -0, 0.0005, -0.0005, 0.00125, -0.00125, 1.005, -1.005, 0.0015, 0.0025, 0.0035, 0.00049999999999999999,
        -0.0004, -0.00049, 5e-324, -5e-324, 1e-300, 0.1, 0.2, 0.3, 1 / 3, -1 / 3, 0.07, 0.035, 12.345, 4.5e13, 9.2e16,
        1e17, 1.234e17, 9.9e18, 1e19 - 1e4, 1e19, 1.5e19, 2e20, 2 ** 64 / 100, NaN, Infinity, -Infinity, -1, 1, 2 ** 52 / 100,
        1.2345e19, 1e20 / 3, 2 ** 70, 7e300, 1.7976931348623157e306]; // os últimos: x*100 >= 1e21 dá o String(x*100) do JS
    for (let k = -12; k <= 9; k++) for (const m of [1, 1.5, 2.5, 4.999, 5, 5.0001, 9.95, 9.99]) xs.push(m * 10 ** k, -m * 10 ** k);
    for (let h = 0; h < 2000; h++) xs.push((h + 0.5) / 1000, -(h + 0.5) / 1000, h / 2000);
    const got = O._texto('pct', xs);
    xs.forEach((x, i) => assert.equal(got[i], pct(x), `pct(${show(x)})`));
});

test('números do JSON: os do JSON.stringify (o decimal mais curto que volta a dar o mesmo real)', () => {
    let xs = [0.1, 0.2, 1 / 3, 123.45, 100, 50, 0, 1e21, 1e22, 5e-324, Number.MAX_VALUE, Number.MIN_VALUE, Number.EPSILON, 2 ** 53 + 2];
    for (let e = -1074; e <= 1023; e += 1) xs.push(2 ** e, -(2 ** e), 2 ** e * 1.5, 2 ** e * (2 - 2 ** -52), 2 ** e * (1 + 2 ** -52));
    for (let k = -323; k <= 308; k++) for (const m of ['1', '5', '9.999999999999999', '1.2345', '4.9406564584124654']) xs.push(Number(m + 'e' + k));
    for (let i = 1; i < 3000; i++) xs.push(i, i / 1000, Math.round(i * 7.3) / 100, i * 1e15, 1 / i);
    xs = xs.filter(Number.isFinite);
    const r = rng(42), dv = new DataView(new ArrayBuffer(8));
    while (xs.length < 50000) { dv.setUint32(0, (r() * 2 ** 32) >>> 0); dv.setUint32(4, (r() * 2 ** 32) >>> 0); const x = dv.getFloat64(0); if (Number.isFinite(x)) xs.push(x); }
    const got = O._texto('pnum', xs);
    xs.forEach((x, i) => { if (got[i] !== String(x)) assert.fail(`pnum(${show(x)}): JS ${String(x)} ≠ Onda ${got[i]}`); });
    // como o JSON.stringify, menos o -0, que sai "-0" para o JSON.parse o devolver igual
    assert.deepEqual(O._texto('pnum', [NaN, Infinity, -Infinity, -0]), ['null', 'null', 'null', '-0']);
});

test('desempenho: 40 séries × 400 fechos bem abaixo de 50 ms', () => {
    const list = Array.from({ length: 40 }, (_, i) => {
        const r = rng(77 + i);
        let x = 100;
        return { closes: Array.from({ length: 400 }, () => (x *= Math.exp(0.0004 + 0.02 * gauss(r)))), opts: { kind: KINDS[i % 5], crypto: i % 5 === 3 } };
    });
    for (let k = 0; k < 3; k++) O.analyseMany(list); // aquecer
    const ts = [];
    for (let k = 0; k < 7; k++) { const t = performance.now(); O.analyseMany(list); ts.push(performance.now() - t); }
    ts.sort((a, b) => a - b);
    const med = ts[3];
    assert.ok(med < 25, `mediana ${med.toFixed(2)} ms`);
    assert.deepEqual(O.analyseMany(list.slice(0, 5)), list.slice(0, 5).map((c) => A.analyse(c.closes, c.opts)));
});
