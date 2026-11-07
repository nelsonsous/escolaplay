// node --test mercados/tests/analise-onda-c.test.mjs
// Fase C: o resto do analise.js em Onda (analise-onda.js, gerado de onda/*.onda) tem de dar o mesmo que o JS em tudo:
// tom das notícias, sentimento do mercado, €/L, labelOf, riskOf, indicadores, teste no passado, imposto da cripto,
// avisos. Comparação exata: as mesmas chaves pela mesma ordem, os mesmos textos e os números iguais ao bit
// (Object.is: o -0 e o NaN contam); quando o JS lança uma exceção, a Onda lança uma do mesmo tipo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const A = require('../analise.js');
const O = require('../analise-onda.js');
await O.ready;

// ---------- utilitários ----------
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
const show = (v) => (typeof v === 'string' ? JSON.stringify(v) : Object.is(v, -0) ? '-0' : typeof v === 'object' && v ? JSON.stringify(v) : String(v));
function diff(a, b, path = '') {
    if (typeof a === 'number' && typeof b === 'number') return Object.is(a, b) ? null : { path, a, b };
    if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return a === b ? null : { path, a, b };
    if (Array.isArray(a) !== Array.isArray(b)) return { path, a, b };
    if (Array.isArray(a)) {
        if (a.length !== b.length) return { path: path + '.length', a: a.length, b: b.length };
        for (let i = 0; i < a.length; i++) { const d = diff(a[i], b[i], `${path}[${i}]`); if (d) return d; }
        return null;
    }
    const ka = Object.keys(a), kb = Object.keys(b);
    if (ka.join() !== kb.join()) return { path: (path ? path + '.' : '') + '{chaves}', a: ka.join(), b: kb.join() };
    for (const k of ka) { const d = diff(a[k], b[k], path ? `${path}.${k}` : k); if (d) return d; }
    return null;
}
// corre as duas e compara (resultado, ou o tipo da exceção)
function both(fa, fb) {
    let ra, rb, ea = null, eb = null;
    try { ra = fa(); } catch (e) { ea = e; }
    try { rb = fb(); } catch (e) { eb = e; }
    if (ea || eb) return ea && eb && ea.constructor === eb.constructor ? null : { path: 'exceção', a: ea && String(ea), b: eb && String(eb) };
    return diff(ra, rb);
}
const check = (what, d, input) => { if (d) assert.fail(`${what}: ${d.path || '(raiz)'}: JS ${show(d.a)} ≠ Onda ${show(d.b)} — entrada ${String(JSON.stringify(input)).slice(0, 400)}`); };

// ---------- notícias: um corpus de títulos PT/EN realistas e outro adversário ----------
const CO = ['Galp', 'EDP', 'BCP', 'Jerónimo Martins', 'Navigator', 'Sonae', 'NOS', 'CTT', 'Mota-Engil', 'Tesla', 'Nvidia', 'Apple', 'Microsoft', 'Bitcoin', 'Ether', 'Solana', 'XRP', 'ASML', 'SAP', 'LVMH', 'Novo Nordisk', 'Allianz', 'TotalEnergies', 'Rheinmetall', 'TSMC', 'Caixa Geral', 'Banco de Portugal', 'BCE', 'Fed', 'S&P 500', 'Euro Stoxx 50', 'PSI', 'Brent', 'WTI', 'ouro', 'petróleo', 'gás natural', 'Nasdaq', 'DAX', 'Shell', 'Amazon', 'Meta', 'Palantir', 'JPMorgan'];
const PT = ['sobe', 'sobem', 'subida', 'subir', 'dispara', 'disparam', 'recorde', 'máximo histórico', 'lucro', 'lucros', 'supera', 'acima das expectativas', 'melhora', 'melhoria', 'aprovado', 'aprovação', 'parceria', 'acordo', 'cresce', 'crescimento', 'ganha', 'ganhos', 'valoriza', 'valorização', 'recupera', 'eleva', 'aumenta dividendo', 'recompra', 'otimista', 'otimismo', 'cai', 'caem', 'queda', 'afunda', 'tomba', 'derrapa', 'prejuízo', 'perdas', 'abaixo das expectativas', 'corta', 'corte', 'despedimento', 'investigação', 'multa', 'processo judicial', 'falência', 'insolvência', 'alerta', 'recua', 'crise', 'desvaloriza', 'pessimista', 'tarifas', 'caixa', 'cair', 'caiu', 'eleva-se', 'apresenta', 'resultados', 'trimestre', 'ações', 'bolsa', 'investidores', 'juros', 'inflação', 'dívida', 'câmbio'];
const EN = ['beat', 'beats', 'surge', 'surges', 'surged', 'soar', 'soars', 'jump', 'jumps', 'rally', 'rallies', 'record high', 'all-time high', 'profit', 'gains', 'gain', 'raises guidance', 'raises forecast', 'approval', 'approved', 'wins', 'rises', 'rise', 'bullish', 'buyback', 'outperform', 'strong demand', 'partnership', 'deal', 'tops estimates', 'rebound', 'climbs', 'upbeat', 'upgrade', 'downgrade', 'plunge', 'plunges', 'falls', 'fall', 'drop', 'drops', 'slump', 'tumble', 'sinks', 'miss', 'misses', 'loss', 'losses', 'lawsuit', 'probe', 'fined', 'layoffs', 'cuts', 'bankruptcy', 'recall', 'warning', 'warns', 'bearish', 'hack', 'hacked', 'sell-off', 'selloff', 'crash', 'slides', 'lowers guidance', 'underperform', 'weak demand', 'fraud', 'tariff', 'shares', 'earnings', 'investors', 'misstep', 'dealer', 'risers', 'cutsy', 'drops-off'];
const ODD = ['😀', '📉', '🚀', '中', '国', 'привет', 'Κρίση', 'ﬁ', 'ß', 'ẞ', 'İ', 'ı', 'K', 'Å', 'ǅ', '́', '̧', '̃', '€', '$', '%', '·', '—', '«', '»', '"', '\'', '\\', '\n', '\t', ' ', '​', '﻿', '\uD83D', '\uDE00', '\u0000', ';', '`', '≠', 'ｃａｉ', 'Ç', 'Ã', 'Õ', 'É', 'Ê', 'Í', 'Ó', 'Ú', 'ñ', 'ü', 'ø', 'æ', 'Œ', 'þ', 'K'];
const PUNCT = [' ', ' ', ' ', ', ', ': ', ' — ', ' - ', '. ', '; ', '! ', '? ', ' (', ') ', ' "', '" ', ' «', '» ', '/', '-', '…', ' · '];
const ACC = { a: 'áàâãäåāăą', c: 'çćĉċč', e: 'éèêëēĕėęě', i: 'íìîïĩīĭįİ', n: 'ñńņňṅ', o: 'óòôõöōŏőơ', u: 'úùûüũūŭůűųư', s: 'śŝşšṡ', y: 'ýÿŷỳ', z: 'źżžẑ', k: 'ḱǩK', g: 'ĝğġģǧ' };
function headline(r) {
    const pick = (a) => a[Math.floor(r() * a.length)];
    const words = r() < 0.5 ? PT : EN, parts = [];
    for (let j = 2 + Math.floor(r() * 9); j > 0; j--) {
        const u = r();
        let w = u < 0.35 ? pick(words) : u < 0.55 ? pick(CO) : u < 0.65 ? Math.floor(r() * 100) + (r() < 0.5 ? '%' : ',' + Math.floor(r() * 10) + '%') : u < 0.75 ? pick(r() < 0.5 ? PT : EN) : u < 0.8 ? pick(ODD) : pick(words);
        const v = r();
        if (v < 0.08) w = w.toUpperCase(); else if (v < 0.16) w = w[0].toUpperCase() + w.slice(1);
        if (r() < 0.06) { const i = Math.floor(r() * w.length), c = w[i].toLowerCase(); if (ACC[c]) { let x = ACC[c][Math.floor(r() * ACC[c].length)]; if (r() < 0.3) x = x.toUpperCase(); w = w.slice(0, i) + x + w.slice(i + 1); } }
        if (r() < 0.04) { const i = Math.floor(r() * (w.length + 1)); w = w.slice(0, i) + pick(ODD) + w.slice(i); }
        if (r() < 0.03) w = w.normalize('NFD');
        parts.push(w, pick(PUNCT));
    }
    return parts.join('').trim();
}
function adversarial(r) {
    let s = '';
    for (let j = Math.floor(r() * 40); j > 0; j--) {
        const u = r();
        let cp;
        if (u < 0.4) cp = 32 + Math.floor(r() * 95);
        else if (u < 0.6) cp = 0xC0 + Math.floor(r() * 400);
        else if (u < 0.7) cp = 0x1E00 + Math.floor(r() * 256);
        else if (u < 0.8) cp = 0x300 + Math.floor(r() * 112);
        else if (u < 0.85) cp = Math.floor(r() * 0x110000);
        else if (u < 0.9) cp = 0xD800 + Math.floor(r() * 0x800);
        else { s += ['cai', 'sobe', 'beat', 'hack', 'all-time high', 'sell-off', 'otimis', 'surge', 'miss', 'gain', 'deal', 'loss'][Math.floor(r() * 12)]; continue; }
        s += cp >= 0xD800 && cp <= 0xDFFF ? String.fromCharCode(cp) : String.fromCodePoint(cp);
    }
    return s;
}

test('norm: cada um dos 1 114 112 pontos de código e unidades sozinhas dá o mesmo que o toLowerCase + NFD do JS', () => {
    // a Onda não guarda o texto inteiro: só onde ficam os caracteres ASCII; o resto é uma fronteira (\u0080), como
    // o [^a-z0-9] do JS vê cada unidade não-ASCII. Por isso compara-se com as corridas não-ASCII do JS juntas numa só.
    const norm = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const junta = (s) => s.replace(/[^\x00-\x7f]+/g, '\x80');
    let n = 0;
    for (let start = 0; start <= 0x10FFFF; start += 65536) {
        const list = [];
        for (let cp = start; cp < start + 65536; cp++) list.push(cp >= 0xD800 && cp <= 0xDFFF ? String.fromCharCode(cp) : String.fromCodePoint(cp));
        const got = O._norm(list);
        for (let i = 0; i < list.length; i++, n++) if (got[i] !== junta(norm(list[i]))) assert.fail(`U+${(start + i).toString(16)}: JS ${JSON.stringify(junta(norm(list[i])))} ≠ Onda ${JSON.stringify(got[i])}`);
    }
    assert.equal(n, 0x110000);
});

test('sentiment: 40 000 títulos (PT/EN realistas e adversários) e casos de fronteira iguais ao JS', () => {
    const r = rng(7);
    const titles = Array.from({ length: 40000 }, () => (r() < 0.75 ? headline(r) : adversarial(r)));
    titles.push(null, undefined, 0, 1, 123, -0, NaN, true, false, {}, [], ['cai'], { toString() { return 'Tesla plunges'; } }, 'cai', 'CAI', 'Caí', 'caí!', 'x-cai', 'cai-x',
        '1cai', 'cai1', '_cai', 'cai_', 'cái', 'çai', 'otimista', 'otim', 'sell-offs', 'sell–off', 'all time high', 'all-time-high', 'record  high', 'raises\tguidance',
        'raises\nguidance', 'ﬁ cai', 'Kai', 'hacK', 'İnvestigação', 'ßcai', '😀cai😀', 'приветcai', '中cai', 'surges surge', '\uD800cai\uDC00', 'Ações da Galp disparam após lucros recorde',
        'Tesla shares plunge after earnings miss', 'BCP cai 6% com investigação da CMVM', 'Caixa Geral apresenta resultados', 'Nvidia beats estimates and raises guidance', 'x'.repeat(5000) + ' cai');
    const got = O.sentimentMany(titles);
    const tones = { up: 0, down: 0, flat: 0 };
    titles.forEach((t, i) => { const js = A.sentiment(t); tones[js.tone]++; check(`sentiment(${i})`, diff(js, got[i]), t); });
    assert.ok(tones.up > 5000 && tones.down > 5000 && tones.flat > 5000, JSON.stringify(tones));
    // uma chamada por texto dá o mesmo que o lote
    for (let i = 0; i < 1500; i++) check(`sentiment(${i}) só`, diff(A.sentiment(titles[i]), O.sentiment(titles[i])), titles[i]);
});

test('newsTone: 5 000 listas de notícias (vazias, sem título, com buracos, mais de 8)', () => {
    const r = rng(8), pool = Array.from({ length: 3000 }, () => headline(r));
    for (let i = 0; i < 5000; i++) {
        const items = [];
        for (let j = Math.floor(r() * 14); j > 0; j--) { const u = r(); items.push(u < 0.85 ? { title: pool[Math.floor(r() * pool.length)] } : u < 0.92 ? {} : { title: [null, 0, 5, true, ''][Math.floor(r() * 5)] }); }
        if (r() < 0.05 && items.length) delete items[Math.floor(r() * items.length)];
        check('newsTone', both(() => A.newsTone(items), () => O.newsTone(items)), items);
    }
    for (const x of [null, undefined, [], '', 0, [{ title: 'Apple sobe' }, { title: 'Apple surges' }]]) check('newsTone', both(() => A.newsTone(x), () => O.newsTone(x)), x);
});

// ---------- números de toda a espécie ----------
const SPECIAL = [0, -0, NaN, Infinity, -Infinity, 1, -1, 0.5, -0.5, 1.5, 2.5, -1.5, 15.5, 16, 15.999999999999998, 16.000000000000004, 25, 25.000000000000004, 24.5, 0.55,
    0.5499999999999999, 0.3, 0.30000000000000004, 0.005, 0.015, 0.2, 0.19999999999999998, 0.4, 0.7, 0.6999999999999999, 70, 58, 42, 30, 69.99999999999999, 42.00000000000001,
    1e300, -1e300, 5e-324, 2 ** 53, 2 ** 53 + 2, 2 ** 64, 1e21, 123456789.5, 347274322062730800];
const rnum = (r) => { const u = r(); return u < 0.3 ? SPECIAL[Math.floor(r() * SPECIAL.length)] : u < 0.6 ? (r() - 0.3) * 60 : u < 0.8 ? r() : u < 0.9 ? Math.round(r() * 400) / 4 : (r() - 0.5) * 10 ** (Math.floor(r() * 40) - 20); };
const rval = (r) => (r() < 0.8 ? rnum(r) : [undefined, null, '20', true, false, {}, [], ''][Math.floor(r() * 8)]);

test('marketMood: 20 000 contextos (resultados do analyse, métricas soltas, VIX e amplitude de toda a espécie)', () => {
    const r = rng(11);
    const an = [];
    for (let i = 0; i < 40; i++) { let x = 100; const c = []; for (let k = 30 + Math.floor(r() * 300); k > 0; k--) { x *= 1 + (r() - 0.5) * 0.05; c.push(x); } an.push(A.analyse(c)); }
    const idx = () => { const u = r(); return u < 0.2 ? undefined : u < 0.25 ? null : u < 0.5 ? an[Math.floor(r() * an.length)] : { metrics: { price: rnum(r), sma50: r() < 0.2 ? null : r() < 0.1 ? undefined : rnum(r) } }; };
    for (let i = 0; i < 20000; i++) {
        const ctx = {};
        if (r() < 0.9) ctx.spx = idx();
        if (r() < 0.9) ctx.stoxx = idx();
        if (r() < 0.9) ctx.btc = idx();
        if (r() < 0.8) ctx.vix = rval(r);
        if (r() < 0.8) ctx.breadth = r() < 0.5 ? r() : rval(r);
        check('marketMood', both(() => A.marketMood(ctx), () => O.marketMood(ctx)), ctx);
    }
    for (const ctx of [{}, { spx: 0 }, { vix: '20' }, { spx: {} }, null]) check('marketMood', both(() => A.marketMood(ctx), () => O.marketMood(ctx)), ctx);
});

test('usdGalToEurL, labelOf e riskOf: 20 000 casos cada e as fronteiras', () => {
    const r = rng(12);
    for (let i = 0; i < 20000; i++) {
        const a = rval(r), b = rval(r), s = rval(r), v = rval(r);
        const hz = [undefined, 'mid', 'short', 'long', 'x', null, 0, 'LONG', ['short'], Symbol('s')][Math.floor(r() * 10)];
        check('usdGalToEurL', both(() => A.usdGalToEurL(a, b), () => O.usdGalToEurL(a, b)), [a, b]);
        check('labelOf', both(() => A.labelOf(s, hz), () => O.labelOf(s, hz)), [s, String(hz)]);
        check('riskOf', both(() => A.riskOf(v), () => O.riskOf(v)), v);
    }
    for (let s = -5; s <= 105; s += 0.25) for (const hz of [undefined, 'mid', 'short', 'long']) check('labelOf', both(() => A.labelOf(s, hz), () => O.labelOf(s, hz)), [s, hz]);
    for (let v = -0.1; v <= 1; v += 0.0025) check('riskOf', both(() => A.riskOf(v), () => O.riskOf(v)), v);
});

test('indicadores sma, emaSeries, rsi, macd e volatility: 6 000 vetores com NaN, ±Infinity, zeros e n de toda a espécie', () => {
    const r = rng(23), pick = (a) => a[Math.floor(r() * a.length)];
    const BAD = [NaN, Infinity, -Infinity, 0, -0, -1, -5.5, null, undefined, true, false];
    const NS = [undefined, 0, -0, 1, 2, 3, 5, 9, 12, 14, 20, 26, 34, 35, 50, 200, 2.5, 0.5, -1, -3, -2.5, NaN, null, 1e9, Infinity, 13.999999999999998, 4.000000000000001];
    for (let i = 0; i < 6000; i++) {
        const n0 = pick([0, 1, 2, 9, 10, 11, 12, 13, 14, 15, 16, 25, 26, 27, 34, 35, 36, 60, 61, 62, 63, 100]) + (r() < 0.4 ? Math.floor(r() * 300) : 0);
        let x = Math.exp((r() - 0.4) * 20);
        const mode = r(), v = [];
        for (let k = 0; k < n0; k++) { x *= mode < 0.1 ? 1 : Math.exp((r() - 0.5) * 0.1); v.push(mode < 0.05 ? (r() - 0.5) * 10 : x); }
        if (r() < 0.25) for (let m = 1 + Math.floor(r() * 5); m > 0 && n0; m--) v[Math.floor(r() * n0)] = pick(BAD);
        if (r() < 0.1) for (let k = 0; k < n0; k++) v[k] = Math.round(v[k]);
        const n = pick(NS), days = pick([undefined, 252, 365, 0, -1, 1.5, NaN]), lb = pick([undefined, 60, 0, 5, 9, 10, 20, 100, -5, 2.5, -2.5, NaN, null, Infinity, -Infinity]);
        check('sma', both(() => A.sma(v, n), () => O.sma(v, n)), [v.length, n]);
        check('emaSeries', both(() => A.emaSeries(v, n), () => O.emaSeries(v, n)), [v.length, n]);
        check('rsi', both(() => A.rsi(v, n), () => O.rsi(v, n)), [v.length, n]);
        check('rsi(14)', both(() => A.rsi(v), () => O.rsi(v)), v.length);
        check('macd', both(() => A.macd(v), () => O.macd(v)), v.length);
        check('volatility', both(() => A.volatility(v, days, lb), () => O.volatility(v, days, lb)), [v.length, days, lb]);
    }
});

// ---------- cripto: datas ----------
const p2 = (n) => String(n).padStart(2, '0'), p4 = (n) => String(n).padStart(4, '0');
function date(r, valid = 0.9) {
    const pick = (a) => a[Math.floor(r() * a.length)];
    if (r() < valid) {
        const u = r(), y = u < 0.7 ? 2018 + Math.floor(r() * 10) : u < 0.8 ? pick([0, 1, 1600, 1900, 2000, 2024, 9998, 9999]) : Math.floor(r() * 10000);
        return `${p4(y)}-${p2(1 + Math.floor(r() * 12))}-${p2(r() < 0.2 ? pick([28, 29, 30, 31]) : 1 + Math.floor(r() * 31))}`;
    }
    return pick(['2026-13-01', '2026-00-10', '2026-01-00', '2026-01-32', '2026-1-01', '2026/01/01', 'x', '', '20260101', '2026-01-01T00:00:00Z', ' 2026-01-01', '2026-01-01 ', '٢٠٢٦-٠١-٠١', '2026-02-30', '2026-04-31', '2025-02-29', '2024-02-29']);
}

test('planLots: 20 000 planos (datas inválidas, mês 00 e 13+, anos 0000 e 9999, dias fora de 1–28, frações, textos)', () => {
    const r = rng(31), pick = (a) => a[Math.floor(r() * a.length)];
    for (let i = 0; i < 20000; i++) {
        const since = r() < 0.85 ? date(r) : pick([undefined, null, '', 0]);
        const today = r() < 0.9 ? (r() < 0.5 ? date(r, 0.95) : '2026-11-05') : pick([undefined, null, '', 'x']);
        const days = r() < 0.9 ? Array.from({ length: Math.floor(r() * 4) }, () => pick([1, 2, 5, 9, 10, 15, 16, 20, 25, 28, 29, 0, 31, -1, 1.5, 27.999999999999996, 28.000000000000004, '16', '2', null, undefined, NaN, '', 'x', true, 2.25, 9.5])) : pick([undefined, null, []]);
        check('planLots', both(() => A.planLots(since, days, today), () => O.planLots(since, days, today)), [since, days, today]);
    }
    assert.deepEqual(O.planLots('2026-09-10', [16, 2], '2026-11-05').map((x) => x.d), ['2026-09-16', '2026-10-02', '2026-10-16', '2026-11-02']);
    assert.equal(O.planLots('2020-01-01', [2], '2026-11-05').length, 83);
});

test('cryptoTax: 20 000 carteiras (até 300 compras; fins de mês e de ano, 29 de fevereiro, ano 9999, datas que o Date.parse recusa)', () => {
    const r = rng(32), pick = (a) => a[Math.floor(r() * a.length)];
    let throws = 0;
    const TODAY = () => (r() < 0.75 ? date(r, 1) : pick(['2026-11-05', '2024-02-29', '2025-12-31', '2026-01-01', '9999-12-31', '0000-01-01', '2026-11-05T10:00:00Z', '2026-11-05T00:00:00.000Z',
        '2026-11-05T23:59:59+01:00', '2026', '2026-11', '+002026-11-05', 'x', '', '2026-13-01', '2026-02-30', undefined, null, 20261105]));
    for (let i = 0; i < 20000; i++) {
        const lots = Array.from({ length: r() < 0.05 ? 300 : Math.floor(r() * 12) }, () => {
            if (r() < 0.03) return pick([null, undefined, 0, false]);
            const x = { d: date(r, 0.92) };
            if (r() < 0.7) x.e = pick([100, 200, 90.5, 0, -0, -5, '150', '', null, undefined, NaN, Infinity, 1e308, 'abc', true, 0.1, 0.2, 1e-320]);
            if (r() < 0.3) x.plan = pick([1, 0, true, false, 'x', null]);
            if (r() < 0.03) x.d = pick([20260101, null, undefined, {}]);
            return x;
        });
        if (r() < 0.02 && lots.length) delete lots[Math.floor(r() * lots.length)];
        const today = TODAY();
        try { A.cryptoTax(lots, today); } catch { throws++; }
        check('cryptoTax', both(() => A.cryptoTax(lots, today), () => O.cryptoTax(lots, today)), [lots.slice(0, 6), today]);
    }
    assert.ok(throws > 200, `o RangeError do JS (datas inválidas) também tem de ser testado: ${throws}`);
    for (const x of [undefined, null, []]) check('cryptoTax', both(() => A.cryptoTax(x, '2026-11-05'), () => O.cryptoTax(x, '2026-11-05')), x);
    // 365 dias certos já conta; 9999-12-31 + 365 dias passa a 10000 (o toISOString escreve +010000-12)
    const t = O.cryptoTax([{ d: '2025-11-05', e: 200 }, { d: '2025-11-06' }], '2026-11-05');
    assert.deepEqual([t.exempt, t.next], [1, { d: '2025-11-06', free: '2026-11-06', days: 1 }]);
    const y = O.cryptoTax([{ d: '9999-12-31', e: 1 }, { d: '9999-01-01' }], '9999-12-31');
    assert.deepEqual(y, A.cryptoTax([{ d: '9999-12-31', e: 1 }, { d: '9999-01-01' }], '9999-12-31'));
    assert.deepEqual([y.lots[0].free, y.lots[1].free], ['+010000-01', '+010000-12']);
    assert.throws(() => O.cryptoTax([{ d: '2026-02-32' }], '2026-11-05'), RangeError);
});

test('groupAlert e isQuiet: 20 000 casos cada (empates, ±0, NaN e ±Infinity nas variações, aspas e substitutos nos nomes)', () => {
    const r = rng(41), pick = (a) => a[Math.floor(r() * a.length)];
    const NAMES = ['Ether', 'Solana', 'Bitcoin', 'XRP', 'Nvidia', 'Tesla', 'S&P 500', 'Petróleo Brent', 'Gasóleo (ULSD)', 'a"b', 'c\\d', 'tab\there', 'nl\nhere', '\uD800x', 'x\uDFFF', '😀', '中文', '', '\u0000\u001f\u007f'];
    for (let i = 0; i < 20000; i++) {
        const nan = r() < 0.15;
        // com NaN o comparador do sort deixa de ser consistente: o resultado é o do TimSort do V8 (uma só corrida até 63)
        const items = Array.from({ length: r() < 0.1 ? 10 + Math.floor(r() * 54) : Math.floor(r() * 10) }, () => {
            const pct = nan && r() < 0.3 ? NaN : pick([5, -5, 7.63, -7.63, 6.46, 12.3, -12.5, 0, -0, 4, 4, -4, Infinity, -Infinity, 9.1, 8.2, 1e-9]) * (r() < 0.5 ? 1 : 1 + Math.floor(r() * 3) / 10);
            return { name: r() < 0.7 ? pick(NAMES) : (r() < 0.5 ? headline(r) : adversarial(r)).slice(0, 30), pct, pctTxt: (pct > 0 ? '+' : '−') + Math.abs(pct).toFixed(2).replace('.', ',') + '%', px: pick(['1 991,93 €', '79,52 €', '', '0,00 $', '\uD83D']) };
        });
        const held = pick([undefined, true, false, 1, 0, 'x']);
        check('groupAlert', both(() => A.groupAlert(items, held), () => O.groupAlert(items, held)), [items.map((x) => x.pct), held]);
    }
    for (const x of [undefined, null, []]) check('groupAlert', both(() => A.groupAlert(x), () => O.groupAlert(x)), x);
    for (let i = 0; i < 20000; i++) {
        const args = [pick([-1, 0, 1, 5, 9, 9.5, 10, 10.5, 12, 21, 21.999, 22, 22.5, 23, 24, 25, NaN, '23', null])];
        if (r() < 0.6) { args.push(pick([undefined, 22, 10, 0, 23, 9, 12, 22.5, NaN, 24])); if (r() < 0.6) args.push(pick([undefined, 10, 22, 0, 7, 12, 9.5, NaN, 24])); }
        check('isQuiet', both(() => A.isQuiet(...args), () => O.isQuiet(...args)), args);
    }
});

// ---------- teste no passado ----------
function gauss(r) { let u = 0; while (u === 0) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); }
const iso = (t) => new Date(t).toISOString().slice(0, 10);
const T0 = Date.UTC(2019, 0, 1);
function series(r, n, crypto) {
    const pick = (a) => a[Math.floor(r() * a.length)];
    let x = Math.exp((r() - 0.3) * 8), t = T0 + Math.floor(r() * 400) * 864e5;
    const c = [], d = [], vol = pick([0.004, 0.01, 0.02, 0.04]), drift = (r() - 0.45) * 0.003;
    for (let k = 0; k < n; k++) { x *= Math.exp(drift + vol * gauss(r)); if (r() < 0.005) x *= pick([0.5, 1.5]); c.push(x); d.push(iso(t)); t += 864e5 * (crypto ? 1 : pick([1, 1, 1, 1, 3])); }
    if (r() < 0.1) for (let m = 1 + Math.floor(r() * 5); m > 0 && n; m--) c[Math.floor(r() * n)] = pick([NaN, 0, -1, null, undefined, Infinity]);
    if (r() < 0.1) for (let k = 0; k < n; k++) c[k] = Math.round(c[k] * 100) / 100;
    return { c, d };
}
function asset(r, i) {
    const pick = (a) => a[Math.floor(r() * a.length)];
    const kind = pick(['fund', 'stock', 'crypto', 'index', undefined, 'other']);
    const { c, d } = series(r, r() < 0.1 ? Math.floor(r() * 260) : 220 + Math.floor(r() * 500), kind === 'crypto');
    const a = { key: 'K' + i, kind, closes: c, days: d }, u = r();
    if (u < 0.05) delete a.days; else if (u < 0.1) a.days = d.slice(0, Math.floor(d.length * r())); else if (u < 0.13) a.days = d.map((x) => (r() < 0.05 ? pick([undefined, null, 5]) : x));
    return a;
}
function benchOf(r) {
    const n = 300 + Math.floor(r() * 600), { c, d } = series(r, n, false), b = { days: d, closes: c }, u = r();
    if (u < 0.1) for (let k = 0; k < 20; k++) b.days[Math.floor(r() * n)] = b.days[Math.floor(r() * n)]; // datas repetidas
    else if (u < 0.15) b.days = b.days.slice().sort(() => r() - 0.5); // fora de ordem
    else if (u < 0.2) b.closes = b.closes.slice(0, Math.floor(n * 0.9)); // menos fechos do que datas
    return b;
}

test('backtestAsset, summarize e benchFn: 120 testes (ativos curtos e longos, fechos inválidos, referência baralhada, warm/step/cost estranhos, acc já com dados)', () => {
    const r = rng(51), pick = (a) => a[Math.floor(r() * a.length)];
    let calls = 0, modes = [0, 0, 0];
    for (let run = 0; run < 120; run++) {
        const assets = Array.from({ length: 1 + Math.floor(r() * 6) }, (_, i) => asset(r, i));
        const bench = r() < 0.15 ? null : benchOf(r);
        const bfJ = A.benchFn(bench), u = r();
        // a referência: o benchFn da Onda (corre lá dentro), o do JS (chamado pela Onda) ou outra função qualquer
        let sF = 1000 + run;
        const r2 = () => (sF = (sF * 16807) % 2147483647) / 2147483647;
        const foreign = bench ? (x, y) => (r2() < 0.1 ? null : x && y ? (x < y ? 0.01 : -0.02) : undefined) : null;
        const bfO = u < 0.7 ? O.benchFn(bench) : u < 0.85 ? bfJ : foreign, bfJs = u < 0.7 ? bfJ : bfO;
        modes[u < 0.7 ? 0 : u < 0.85 ? 1 : 2]++;
        const accJ = {}, accO = {};
        if (r() < 0.2) for (const acc of [accJ, accO]) { acc.wait = A.newAcc(); acc.wait.n21 = 3; acc.wait.s21 = 0.1; acc.foo = A.newAcc(); }
        const opts = assets.map(() => {
            const o = {};
            if (r() < 0.5) o.cost = pick([0, 1 / 90, 0.01, NaN, -0, 0.5, undefined]);
            if (r() < 0.3) o.warm = pick([200, 230, 250.5, 0, 100, 30, -10, undefined, NaN, 600]);
            if (r() < 0.3) o.step = pick([5, 1, 3, 7.5, 21, 0, undefined, 2.5, 100]);
            return r() < 0.1 ? undefined : o;
        });
        const perJ = [], perO = [];
        sF = 1000 + run;
        assets.forEach((a, i) => perJ.push(A.backtestAsset(a, bfJs, accJ, opts[i])));
        sF = 1000 + run;
        assets.forEach((a, i) => perO.push(O.backtestAsset(a, bfO, accO, opts[i])));
        calls += assets.length;
        check(`backtestAsset per (teste ${run})`, diff(perJ, perO), opts);
        check(`backtestAsset acc (teste ${run})`, diff(accJ, accO), opts);
        check(`summarize (teste ${run})`, both(() => A.summarize(accJ), () => O.summarize(accO)), null);
        if (bench && u < 0.7) {
            const q = () => { const v = r(); return v < 0.5 ? pick(bench.days) : v < 0.8 ? iso(T0 + Math.floor((r() - 0.1) * 1500) * 864e5) : pick([undefined, null, '', 'x', '2019', '2019-01-01T00:00', 5, '9999-12-31', '0000-01-01']); };
            for (let k = 0; k < 100; k++) { const d0 = q(), d1 = q(); check('benchFn', diff(bfJ(d0, d1), bfO(d0, d1)), [d0, d1]); }
        }
    }
    assert.ok(calls > 300 && modes.every((m) => m > 10), `${calls} ${modes}`);
    assert.equal(O.benchFn(null), null);
    assert.equal(O.benchFn(undefined), null);
    check('newAcc', diff(A.newAcc(), O.newAcc()));
    check('summarize({})', diff(A.summarize({}), O.summarize({})));
    // um passo que não avança: o JS ficava preso num ciclo; a Onda recusa-o
    assert.throws(() => O.backtestAsset({ closes: Array(300).fill(1), kind: 'fund' }, null, {}, { step: -1 }), RangeError);
});

test('teste no passado como na app: 40 ativos × 500 dias com o VWCE de referência (e o backtestMany)', () => {
    const r = rng(52), assets = [];
    for (let i = 0; i < 40; i++) {
        let x = 100, t = Date.UTC(2021, 0, 4);
        const closes = [], days = [], cr = i % 8 === 7;
        for (let k = 0; k < 500; k++) { x *= Math.exp(0.0003 + [0.008, 0.015, 0.03][i % 3] * gauss(r)); closes.push(x); days.push(iso(t)); t += 864e5 * (cr ? 1 : k % 5 === 4 ? 3 : 1); }
        assets.push({ key: 'A' + i, kind: cr ? 'crypto' : i % 4 === 0 ? 'fund' : 'stock', closes, days });
    }
    const cost = (a) => ({ cost: a.kind === 'fund' ? 0 : 1 / 90 });
    const bfJ = A.benchFn(assets[0]), accJ = {}, perJ = assets.map((a) => A.backtestAsset(a, bfJ, accJ, cost(a)));
    const bfO = O.benchFn(assets[0]), accO = {}, perO = O.backtestMany(assets.map((a) => ({ a, opt: cost(a) })), bfO, accO);
    check('per', diff(perJ, perO));
    check('acc', diff(accJ, accO));
    check('summarize', diff(A.summarize(accJ), O.summarize(accO)));
    assert.ok(Object.keys(accO).length >= 5, Object.keys(accO).join());
    // o byKind da app chama a referência diretamente, dia a dia
    for (const a of assets) for (let i = 200; i + 63 < a.closes.length; i += 5) check('bf', diff(bfJ(a.days[i], a.days[i + 63]), bfO(a.days[i], a.days[i + 63])), [a.key, i]);
});

test('reentrância: getters e valueOf que chamam a própria API a meio não estragam a chamada', () => {
    const name = { toString: () => { O.sentiment('a cair'); O.labelOf(80); return 'Ether'; } };
    const items = [{ name, pct: { valueOf: () => (O.isQuiet(23), -7.63) }, pctTxt: '−7,63%', px: '1 991,93 €' }, { name: 'Solana', pct: -6.46, pctTxt: '−6,46%', px: '79,52 €' }];
    assert.deepEqual(O.groupAlert(items), A.groupAlert(items));
    const ctx = { get spx() { O.sentimentMany(['sobe', 'cai']); return { metrics: { price: 10, sma50: 9 } }; }, vix: 30, breadth: 0.2 };
    assert.deepEqual(O.marketMood(ctx), A.marketMood(ctx));
    const v = Array.from({ length: 80 }, (_, i) => ({ valueOf: () => (O.riskOf(0.3), 100 + Math.sin(i)) }));
    assert.deepEqual(O.macd(v), A.macd(v));
    const lots = [{ d: '2025-01-01', get e() { O.cryptoTax([{ d: '2020-01-01' }], '2026-11-05'); return 50; } }, { d: '2026-03-01', e: 10 }];
    assert.deepEqual(O.cryptoTax(lots, '2026-11-05'), A.cryptoTax(lots, '2026-11-05'));
});

test('desempenho (Onda vs JS): teste no passado 40 × 500 e o tom de 1 000 títulos bem mais rápidos', (t) => {
    const med = (f, n) => { f(); const ts = []; for (let i = 0; i < n; i++) { const s = performance.now(); f(); ts.push(performance.now() - s); } ts.sort((a, b) => a - b); return ts[n >> 1]; };
    const r = rng(53), titles = Array.from({ length: 1000 }, () => headline(r));
    const assets = Array.from({ length: 40 }, (_, i) => { let x = 100; const closes = [], days = []; for (let k = 0; k < 500; k++) { x *= Math.exp(0.0003 + 0.015 * gauss(r)); closes.push(x); days.push(iso(T0 + k * 864e5)); } return { key: 'A' + i, kind: ['fund', 'stock', 'crypto'][i % 3], closes, days }; });
    const run = (M) => () => { const bf = M.benchFn(assets[0]), acc = {}; for (const a of assets) M.backtestAsset(a, bf, acc, {}); return acc; };
    const sj = med(() => titles.map(A.sentiment), 5), so = med(() => O.sentimentMany(titles), 7);
    const bj = med(run(A), 3), bo = med(run(O), 5);
    t.diagnostic(`sentiment × 1000: JS ${sj.toFixed(1)} ms, Onda ${so.toFixed(1)} ms · backtest 40 × 500: JS ${bj.toFixed(1)} ms, Onda ${bo.toFixed(1)} ms`);
    assert.ok(so * 3 < sj, `sentiment: Onda ${so.toFixed(1)} ms vs JS ${sj.toFixed(1)} ms`);
    assert.ok(bo * 3 < bj, `backtest: Onda ${bo.toFixed(1)} ms vs JS ${bj.toFixed(1)} ms`);
});

test('a API da Onda é a do analise.js (mais ready, analyseMany, sentimentMany, backtestMany, os auxiliares dos testes e o ecrã)', () => {
    const js = Object.keys(A).sort(), onda = Object.keys(O).filter((k) => !['ready', 'analyseMany', 'sentimentMany', 'backtestMany', '_texto', '_norm', '_vista', '_ordena', 'ecra'].includes(k)).sort();
    assert.deepEqual(onda, js);
    for (const k of js) assert.equal(typeof O[k], 'function', k);
});
