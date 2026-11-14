// O separador Carteira (mercados/onda/ecra-carteira.onda): o simulador do plano e do objetivo. As contas da Onda
// conferidas com uma conta independente, aqui em JS, e o HTML com os números que o utilizador lê.
//   node --test mercados/tests/ecra-carteira.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const AO = require('../analise-onda.js');
const { chromium } = require('playwright');

const TX = [[0.03, 0.0], [0.06, 0.10], [0.09, 0.25]];
const mes = (r) => (1 + r) ** (1 / 12) - 1;
function valor(s, n, m, c, st) {
    const ra = mes(TX[s][0]), rb = mes(TX[s][1]);
    let a = st * (1 - c), b = st * c;
    for (let i = 0; i < n; i++) { a = a * (1 + ra) + m * (1 - c); b = b * (1 + rb) + m * c; }
    return a + b;
}
function meta(s, m, c, st, g) {
    const ra = mes(TX[s][0]), rb = mes(TX[s][1]);
    let a = st * (1 - c), b = st * c, i = 0;
    while (i < 1200 && a + b < g) { a = a * (1 + ra) + m * (1 - c); b = b * (1 + rb) + m * c; i++; }
    return a + b >= g ? i : -1;
}
function imposto(n, m, c, st) {
    const ra = mes(TX[1][0]), rb = mes(TX[1][1]);
    let t = 0;
    for (let j = 0; j <= n; j++) {
        const v = j === 0 ? st : m, id = n - j;
        const ga = v * (1 - c) * ((1 + ra) ** id - 1), gb = v * c * ((1 + rb) ** id - 1);
        t += Math.max(0, ga) * (id < 24 ? 0.28 : id < 60 ? 0.252 : id < 96 ? 0.224 : 0.196);
        if (id < 12) t += Math.max(0, gb) * 0.28;
    }
    return t;
}
const eur = (x) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(x);
const tempo = (n) => { const a = Math.floor(n / 12), m = n % 12; return [a ? `${a} ${a === 1 ? 'ano' : 'anos'}` : '', m ? `${m} ${m === 1 ? 'mês' : 'meses'}` : ''].filter(Boolean).join(' e ') || 'já'; };
// lê o HTML num browser a sério: os textos, os valores dos campos e o que existe
async function ler(pg, html) {
    await pg.setContent(`<body>${html}</body>`);
    return pg.evaluate(() => {
        const t = (sel) => { const e = document.querySelector(sel); return e ? e.textContent.trim() : null; };
        return { big: t('.sim-big b'), rng: t('.sim-rng'), split: t('.sim-split'), meta: t('.sim-meta p'), temMeta: !!document.querySelector('.sim-meta'), vazio: t('.empty'),
            st: [...document.querySelectorAll('.sim-st b')].map((b) => b.textContent), anos: (document.querySelector('[data-cfg="simYears"]') || {}).value,
            graf: !!document.querySelector('svg.sim-g path.sim-base'), linhas: [...document.querySelectorAll('.sim-tab tbody tr')].map((r) => r.querySelector('td').textContent) };
    });
}

test('carteira: o simulador dá as contas certas', async () => {
    await AO.ready;
    const br = await chromium.launch(), pg = await br.newPage();
    try {
    const casos = [
        { budget: 900, cp: 10, core: 'FTSE All-World', start: 0, years: 20, goal: 300000 },
        { budget: 900, cp: 10, core: 'FTSE All-World', start: 25000, years: 30, goal: 1000000 },
        { budget: 250, cp: 0, core: 'S&P 500', start: 0, years: 1, goal: 0 },
        { budget: 50, cp: 35, core: 'MSCI World', start: 1000, years: 60, goal: 5e7 }, // o objetivo não chega em 100 anos
        { budget: 0, cp: 10, core: 'FTSE All-World', start: 50000, years: 12, goal: 60000 },
        { budget: 900, cp: 10, core: 'FTSE <b>"', start: 0, years: 99, goal: 0 }, // nome escapado; anos até 60
    ];
    for (const s of casos) {
        const d = await ler(pg, AO.ecra.carteira(s));
        const y = Math.min(60, Math.max(1, s.years)), n = y * 12, c = s.cp / 100;
        const vb = valor(1, n, s.budget, c, s.start), vp = valor(0, n, s.budget, c, s.start), vo = valor(2, n, s.budget, c, s.start);
        const inv = s.start + s.budget * n;
        assert.equal(d.big, eur(vb), `base em ${y} anos`);
        assert.equal(d.rng, `entre ${eur(vp)} e ${eur(vo)}`);
        assert.deepEqual(d.st, [eur(inv), eur(vb - inv), eur(vb / 1.02 ** y), eur(imposto(n, s.budget, c, s.start))], 'investido, ganho, euros de hoje, imposto');
        assert.equal(d.anos, String(y));
        assert.ok(d.graf, 'o gráfico');
        assert.ok(d.split.includes(s.core), 'o nome escapado do fundo');
        assert.equal(d.linhas[d.linhas.length - 1], `${y} ${y === 1 ? 'ano' : 'anos'}`, 'a última linha é o fim');
        if (s.goal) {
            const mb = meta(1, s.budget, c, s.start, s.goal);
            const p = d.meta;
            if (mb < 0) assert.match(p, /não chegas lá em 100 anos/);
            else assert.ok(p.startsWith(`Chegas lá em ${tempo(mb)} no cenário base`), p);
        } else assert.equal(d.temMeta, false);
    }
    // em euros de hoje: tudo dividido pela inflação até à data
    {
        const c0 = { budget: 900, cp: 10, core: 'FTSE All-World', start: 5000, years: 15, goal: 250000, hoje: true };
        const d = await ler(pg, AO.ecra.carteira(c0));
        const n = 180, c = 0.1, df = (k) => 1.02 ** (k / 12);
        const inv = (k) => { let e = 5000; for (let j = 1; j <= k; j++) e += 900 / df(j); return e; };
        assert.equal(d.big, eur(valor(1, n, 900, c, 5000) / df(n)));
        assert.equal(d.rng, `entre ${eur(valor(0, n, 900, c, 5000) / df(n))} e ${eur(valor(2, n, 900, c, 5000) / df(n))}`);
        assert.deepEqual(d.st, [eur(inv(n)), eur(valor(1, n, 900, c, 5000) / df(n) - inv(n)), eur(valor(1, n, 900, c, 5000)), eur(imposto(n, 900, c, 5000) / df(n))]);
        let i = 0; { const ra = mes(TX[1][0]), rb = mes(TX[1][1]); let a = 5000 * 0.9, b = 500; while (i < 1200 && (a + b) / df(i) < 250000) { a = a * (1 + ra) + 810; b = b * (1 + rb) + 90; i++; } }
        assert.ok(d.meta.startsWith(`Chegas lá em ${tempo(i)} no cenário base`), d.meta);
    }
    // a partir da carteira real: o que já tem divide-se pela parte real em cripto (c0); o dinheiro novo pela do plano
    {
        const c0 = 0.8, st0 = 4722, m0 = 900, c = 0.1, n = 240;
        const val0 = (s, n) => { const ra = mes(TX[s][0]), rb = mes(TX[s][1]); let a = st0 * (1 - c0), b = st0 * c0; for (let i = 0; i < n; i++) { a = a * (1 + ra) + m0 * (1 - c); b = b * (1 + rb) + m0 * c; } return a + b; };
        const d = await ler(pg, AO.ecra.carteira({ budget: m0, cp: 10, core: 'FTSE All-World', start: st0, years: 20, goal: 0, c0, startReal: true, temReal: true }));
        assert.equal(d.big, eur(val0(1, n)), 'o que já tem cresce com a divisão real');
        assert.equal(d.rng, `entre ${eur(val0(0, n))} e ${eur(val0(2, n))}`);
        const nota = await pg.evaluate(() => [document.querySelector('.sim-real').textContent, document.querySelector('[data-out="simStart"]').previousElementSibling.textContent]);
        assert.deepEqual(nota, ['O valor de hoje da tua carteira, com a divisão real: 80 % em cripto. O dinheiro novo segue o plano.', 'Já tens (a tua carteira)']);
    }
    // sem plano nem investido: pede os números
    const vazio = await ler(pg, AO.ecra.carteira({ budget: 0, cp: 10, core: 'X', start: 0, years: 20, goal: 0 }));
    assert.match(vazio.vazio, /quanto investes por mês/);
    assert.equal(vazio.big, null);
    } finally { await br.close(); }
});

// ---- o rendimento real (4.13) ----
const ANO = 31557600;
const pxEm = (h, t) => { if (t < h[0][0]) return h[0][1]; let r = h[0][1]; for (const [ti, p] of h) if (ti <= t) r = p; return r; };
const unid = (a) => a.b.reduce((u, [t, e]) => u + e / pxEm(a.h, t), 0);
function tir(as, V, T) {
    const fv = (r) => as.reduce((s, a) => s + a.b.reduce((x, [t, e]) => x + e * (1 + r) ** ((T - t) / ANO), 0), 0);
    let lo = -0.95, hi = 5;
    for (let k = 0; k < 90; k++) { const md = 0.5 * (lo + hi); if (fv(md) > V) hi = md; else lo = md; }
    return 0.5 * (lo + hi);
}
const pc = (x) => (x >= 0 ? '+' : '−') + new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(Math.abs(x) * 100) + ' %';
const sg = (x) => (x >= 0 ? '+' : '−') + eur(Math.abs(x));

test('carteira: o rendimento real dá as contas certas', async () => {
    await AO.ready;
    const T = Date.UTC(2026, 10, 10) / 1000, DIA = 86400;
    // preços semanais de 3 anos: o fundo a subir devagar, a cripto aos saltos
    const sem = (f) => Array.from({ length: 160 }, (_, i) => [T - (159 - i) * 7 * DIA, f(i)]);
    const hF = sem((i) => 100 * (1 + 0.0012 * i) + 3 * Math.sin(i / 5)), hC = sem((i) => 30000 * (1 + 0.006 * i) + 6000 * Math.sin(i / 7));
    const mensal = (desde, e) => { const out = []; for (let t = desde; t <= T; t += 30.4 * DIA) out.push([Math.round(t), e]); return out; };
    const fundo = { k: 'VWCE.DE', name: 'FTSE All-World', px: hF[hF.length - 1][1] * 1.01, h: hF, b: mensal(T - 2.5 * 365 * DIA, 810), plan: '2024-05-02', pm: 0, pmDef: 810 };
    const cripto = { k: 'c:BTC', name: 'Bitcoin', px: hC[hC.length - 1][1], h: hC, b: mensal(T - 200 * DIA, 90).concat([[T - 40 * DIA, 500]]), plan: '2026-04-24', pm: 90, pmDef: 90, hz: 'mid' };
    const vazio = { k: 'c:ETH', name: 'Ether', px: 3000, h: [], b: [], plan: '', pm: 0, pmDef: 0 };
    const real = { now: T, desde: '02/05/2024', loading: false, bench: { name: 'FTSE All-World', px: fundo.px, h: hF }, ativos: [fundo, cripto, vazio] };
    const br = await chromium.launch(), pg = await br.newPage();
    try {
        await pg.setContent(`<body>${AO.ecra.carteira({ budget: 900, cp: 10, core: 'FTSE All-World', start: 0, years: 20, goal: 0, real })}</body>`);
        const d = await pg.evaluate(() => {
            const r = document.querySelector('.real'), t = (e) => (e ? e.textContent.trim() : null);
            return { big: t(r.querySelector('.sim-big b')), rng: t(r.querySelector('.sim-rng')), sub: t(r.querySelector('.sec-h .sub')),
                st: [...r.querySelectorAll('.sim-st b')].map((b) => b.textContent), rows: [...r.querySelectorAll('.real-l .row')].map((x) => [x.dataset.open, t(x.querySelector('.px')), t(x.querySelector('.chg')), t(x.querySelector('.r-sub'))]),
                hits: r.querySelectorAll('.sim-hit').length, ult: (r.querySelectorAll('.sim-hit')[59] || {}).dataset, ed: [...r.querySelectorAll('[data-lot="pm"]')].map((i) => [i.dataset.k, i.value, i.placeholder]), hz: [...r.querySelectorAll('select[data-lot="hz"]')].map((i) => [i.dataset.k, i.value]),
                sim: !!document.querySelector('.sim .sim-big') };
        });
        const as = [fundo, cripto];
        const vF = unid(fundo) * fundo.px, vC = unid(cripto) * cripto.px, V = vF + vC;
        const E = as.reduce((s, a) => s + a.b.reduce((x, b) => x + b[1], 0), 0);
        assert.equal(d.big, eur(V), 'vale hoje');
        assert.equal(d.rng, `${sg(V - E)} (${pc(V / E - 1)}) · ${pc(tir(as, V, T))} por ano`);
        assert.equal(d.sub, 'desde 02/05/2024');
        const vb = as.reduce((s, a) => s + a.b.reduce((x, [t, e]) => x + e / pxEm(hF, t), 0), 0) * fundo.px;
        assert.deepEqual(d.st, [eur(E), sg(V - E), pc(tir(as, V, T)), eur(vb)], 'investido, ganho, por ano, tudo no fundo');
        const eC = cripto.b.reduce((x, b) => x + b[1], 0);
        assert.deepEqual(d.rows.map((x) => x[0]), ['VWCE.DE', 'c:BTC'], 'só os ativos com compras');
        assert.deepEqual(d.rows[1].slice(1), [eur(vC), pc(vC / eC - 1), `investido ${eur(eC)}`], 'a cripto: menos de 1 ano, sem o por ano');
        assert.ok(d.rows[0][3].endsWith(`${pc(tir([fundo], vF, T))} por ano`), d.rows[0][3]);
        assert.equal(d.hits, 60, 'o dedo: 60 pontos');
        assert.ok(d.ult.tx.startsWith(`Hoje: ${eur(V)} · investido ${eur(E)}`), d.ult.tx);
        assert.deepEqual(d.ed, [['VWCE.DE', '', '810'], ['c:BTC', '90', '90'], ['c:ETH', '', '']], 'o editor com todos os ativos');
        assert.deepEqual(d.hz, [['VWCE.DE', 'long'], ['c:BTC', 'mid'], ['c:ETH', 'long']], 'o prazo de cada ativo (por omissão, longo)');
        assert.ok(d.sim, 'o simulador continua por baixo');
        // o que tem hoje (quantidade e investido, como na TR): o Ether sem data, o Bitcoin com data
        {
            const eth = { ...vazio, px: 3000, q: 0.5, cost: 1200, qd: '', b: [] };
            const btc = { ...cripto, b: [[T - 400 * DIA, 2000, 0.05]], q: 0.05, cost: 2000, qd: '2025-10-06' };
            await pg.setContent(`<body>${AO.ecra.carteira({ budget: 900, cp: 10, core: 'X', start: 0, years: 20, goal: 0, real: { ...real, desde: null, ativos: [fundo, btc, eth] } })}</body>`);
            const r = await pg.evaluate(() => { const q = (x) => document.querySelector(x), t = (e) => (e ? e.textContent.trim() : null);
                return { big: t(q('.real .sim-big b')), rng: t(q('.real .sim-rng')), graf: !!q('.real svg'), st: [...document.querySelectorAll('.real .sim-st b')].map((b) => b.textContent),
                    rows: [...document.querySelectorAll('.real .real-l .row')].map((x) => [x.dataset.open, t(x.querySelector('.px')), t(x.querySelector('.chg'))]), nota: t(q('.real > .note')),
                    ed: [...document.querySelectorAll('[data-lot="qty"]')].map((i) => i.value) }; });
            const vF2 = unid(fundo) * fundo.px, vB = 0.05 * btc.px, vE = 0.5 * 3000, V2 = vF2 + vB + vE;
            const E2 = fundo.b.reduce((x, b) => x + b[1], 0) + 2000 + 1200;
            assert.equal(r.big, eur(V2), 'vale hoje: as quantidades contam');
            assert.equal(r.rng, `${sg(V2 - E2)} (${pc(V2 / E2 - 1)})`, 'sem o por ano (o Ether não tem data)');
            assert.equal(r.graf, false, 'sem gráfico quando falta uma data');
            assert.deepEqual(r.st.slice(0, 3), [eur(E2), sg(V2 - E2), '—']);
            assert.equal(r.st.length, 3, 'sem a referência');
            assert.deepEqual(r.rows.map((x) => x[0]), ['VWCE.DE', 'c:BTC', 'c:ETH']);
            assert.deepEqual(r.rows[2].slice(1), [eur(vE), pc(vE / 1200 - 1)], 'o Ether: 0,5 × 3000 face a 1200 €');
            assert.match(r.nota, /Põe a data em «Desde»/);
            assert.deepEqual(r.ed, ['', '0.05', '0.5'], 'as quantidades no editor');
            // todos com data: volta o gráfico, e o Bitcoin conta as 0,05 unidades desde a data
            await pg.setContent(`<body>${AO.ecra.carteira({ budget: 900, cp: 10, core: 'X', start: 0, years: 20, goal: 0, real: { ...real, ativos: [fundo, btc] } })}</body>`);
            const r2 = await pg.evaluate(() => ({ graf: !!document.querySelector('.real svg'), big: document.querySelector('.real .sim-big b').textContent }));
            assert.ok(r2.graf);
            assert.equal(r2.big, eur(vF2 + vB));
        }
        // sem compras: pede as datas, com o editor aberto
        await pg.setContent(`<body>${AO.ecra.carteira({ budget: 900, cp: 10, core: 'X', start: 0, years: 20, goal: 0, real: { ...real, desde: null, ativos: [vazio] } })}</body>`);
        assert.match(await pg.textContent('.real .empty'), /Diz desde quando compras/);
        assert.equal(await pg.getAttribute('.real details.real-ed', 'open'), '');
    } finally { await br.close(); }
});
