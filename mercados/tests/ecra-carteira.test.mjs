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

test('carteira: o PPR Evoluir (4.47) — as duas componentes como dois ativos, com as contas certas', async () => {
    await AO.ready;
    const T = Date.UTC(2026, 10, 20, 12) / 1000, DIA = 86400;
    // 500 dias de valores: a Proteção a subir devagar, o Dinâmico com altos e baixos; 15 prémios, cada um ao valor do dia seguinte
    const dias = (f) => Array.from({ length: 500 }, (_, i) => [T - (499 - i) * DIA, f(i)]);
    const hP = dias((i) => 105 + 0.01 * i), hD = dias((i) => 110 + 0.04 * i + 4 * Math.sin(i / 20));
    const prem = (h, e) => Array.from({ length: 15 }, (_, i) => { const t = T - (14 - i) * 30 * DIA; return [t, e, e / pxEm(h, t + DIA)]; });
    const pr = { k: 'ppr:7614', name: 'Proteção', px: hP[499][1], h: hP, b: prem(hP, 30) };
    const di = { k: 'ppr:7615', name: 'Dinâmico (ações)', px: hD[499][1], h: hD, b: prem(hD, 45) };
    const ppr = { now: T, at: '20/11/2026', loading: 0, erro: '', ed: 0, cfg: { de: '2025-08-20', pm: 75, din: 60, ur: 0, uc: 0 }, ativos: [pr, di] };
    const br = await chromium.launch(), pg = await br.newPage();
    try {
        await pg.setContent(`<body>${AO.ecra.carteira({ budget: 900, cp: 10, core: 'FTSE All-World', start: 0, years: 20, goal: 0, ppr })}</body>`);
        const d = await pg.evaluate(() => {
            const r = document.querySelector('section.ppr'), t = (e) => (e ? e.textContent.trim() : null);
            return { sub: t(r.querySelector('.sec-h .sub')), big: t(r.querySelector('.sim-big b')), rng: t(r.querySelector('.sim-rng')), st: [...r.querySelectorAll('.sim-st b')].map((b) => b.textContent),
                rows: [...r.querySelectorAll('.real-l .row')].map((x) => [t(x.querySelector('.r-name')), t(x.querySelector('.r-sub')), t(x.querySelector('.px')), t(x.querySelector('.chg'))]),
                hits: r.querySelectorAll('.sim-hit').length, ed: [...r.querySelectorAll('[data-ppr]')].map((i) => [i.dataset.ppr, i.value]), aberto: r.querySelector('details.ppr-ed').open,
                antes: !!document.querySelector('section.ppr + section.sim') };
        });
        const u = (a) => a.b.reduce((s, b) => s + b[2], 0), vP = u(pr) * pr.px, vD = u(di) * di.px, V = vP + vD;
        const E = 15 * 75, eP = 15 * 30, eD = 15 * 45, as = [pr, di];
        assert.equal(d.sub, 'Fidelidade · valores de 20/11/2026');
        assert.equal(d.big, eur(V), 'vale hoje: as unidades × o valor de hoje');
        assert.equal(d.rng, `${sg(V - E)} (${pc(V / E - 1)}) · ${pc(tir(as, V, T))} por ano`);
        assert.deepEqual(d.st, [eur(E), sg(V - E), pc(tir(as, V, T))], 'investido, ganho, por ano');
        const un = (x) => new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(x);
        const p2 = (x) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(x);
        assert.deepEqual(d.rows, [['Proteção', `${un(u(pr))} un. × ${p2(pr.px)} · investido ${eur(eP)}`, eur(vP), pc(vP / eP - 1)],
            ['Dinâmico (ações)', `${un(u(di))} un. × ${p2(di.px)} · investido ${eur(eD)}`, eur(vD), pc(vD / eD - 1)]], 'as duas componentes');
        assert.equal(d.hits, 60, 'o gráfico, com o dedo');
        assert.deepEqual(d.ed, [['pm', '75'], ['din', '60'], ['de', '2025-08-20'], ['ur', ''], ['uc', '']], 'o editor com o que escreveste');
        assert.equal(d.aberto, false, 'com o PPR feito, o editor fica fechado');
        assert.ok(d.antes, 'antes do simulador');
        // 4.53: ano a ano — o ganho de cada componente (e o total) em cada ano, com a % da unidade
        {
            await pg.setContent(`<body>${AO.ecra.carteira({ budget: 0, cp: 0, core: 'X', start: 0, years: 20, goal: 0, ppr: { ...ppr, custos: 'Comissões do PPR.' } })}</body>`);
            assert.equal(await pg.evaluate(() => document.querySelector('section.ppr .ppr-custos').textContent), 'Comissões do PPR.', 'as comissões do PPR');
            const anos = { cab: ['2025', '2026'], linhas: [{ n: 'Proteção', c: [{ g: 6.4, p: 0.0071, tp: 1 }, { g: 16.2, p: 0.0163, tp: 1 }] }, { n: 'Dinâmico (ações)', c: [{ g: 41.6, p: 0.06, tp: 1 }, { g: -3.1, p: -0.004, tp: 1 }] }, { n: 'Total', t: 1, c: [{ g: 48 }, { g: 13.1 }] }], nota: 'Em 2025, desde 07/07/2025; em 2026, até 20/11/2026.' };
            await pg.setContent(`<body>${AO.ecra.carteira({ budget: 0, cp: 0, core: 'X', start: 0, years: 20, goal: 0, ppr: { ...ppr, anos } })}</body>`);
            const t = await pg.evaluate(() => { const r = document.querySelector('section.ppr .ppr-anos'); return { cab: [...r.querySelectorAll('th')].map((x) => x.textContent), l: [...r.querySelectorAll('tbody tr')].map((tr) => [tr.className, ...[...tr.querySelectorAll('td')].map((x) => x.textContent)]), nota: r.querySelector('.note').textContent }; });
            assert.deepEqual(t.cab, ['', '2025', '2026']);
            assert.deepEqual(t.l, [['', 'Proteção', `+${eur(6.4)}${pc(0.0071)}`, `+${eur(16.2)}${pc(0.0163)}`], ['', 'Dinâmico (ações)', `+${eur(41.6)}${pc(0.06)}`, `−${eur(3.1)}${pc(-0.004)}`], ['ppr-tot', 'Total', `+${eur(48)}`, `+${eur(13.1)}`]]);
            assert.equal(t.nota, 'Em 2025, desde 07/07/2025; em 2026, até 20/11/2026.');
            await pg.setContent(`<body>${AO.ecra.carteira({ budget: 0, cp: 0, core: 'X', start: 0, years: 20, goal: 0, ppr: { ...ppr, anos, aviso: 'Falta uma entrega.' } })}</body>`);
            assert.equal(await pg.evaluate(() => document.querySelectorAll('section.ppr .ppr-anos').length), 0, 'com aviso, sem o ano a ano');
        }
        // 4.48: as entregas extra no editor (cada uma com ✕) e a linha para juntar outra (com o rascunho)
        {
            const ex = [{ d: '2025-12-15', l: '15/12/2025', e: 600 }, { d: '2026-03-02', l: '02/03/2026', e: 50.5 }];
            await pg.setContent(`<body>${AO.ecra.carteira({ budget: 900, cp: 10, core: 'X', start: 0, years: 20, goal: 0, ppr: { ...ppr, ed: 1, ex, xd: '2026-11-01', xe: '20' } })}</body>`);
            const e = await pg.evaluate(() => ({ l: [...document.querySelectorAll('section.ppr .ppr-x')].map((x) => [x.querySelector('span').textContent, x.querySelector('b').textContent, x.querySelector('[data-act="ppr-rm"]').dataset.i]),
                x: [...document.querySelectorAll('section.ppr [data-pprx]')].map((i) => [i.dataset.pprx, i.value]), j: !!document.querySelector('section.ppr [data-act="ppr-add"]') }));
            const e2 = (x) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(x);
            assert.deepEqual(e.l, [['15/12/2025', e2(600), '0'], ['02/03/2026', e2(50.5), '1']], 'as entregas extra, pela ordem');
            assert.deepEqual(e.x, [['d', '2026-11-01'], ['e', '20']], 'o rascunho da próxima');
            assert.ok(e.j, 'o botão de juntar');
        }
        // 4.48: a MyFidelidade longe dos prémios registados: o aviso, e sem o ganho (nem o por ano, nem o de cada componente)
        {
            const aviso = 'A MyFidelidade tem mais 664 € do que dão os prémios registados: falta alguma entrega extra? Junta-a em «O teu PPR» para veres o investido e o ganho certos.';
            await pg.setContent(`<body>${AO.ecra.carteira({ budget: 900, cp: 10, core: 'X', start: 0, years: 20, goal: 0, ppr: { ...ppr, aviso } })}</body>`);
            const a = await pg.evaluate(() => { const r = document.querySelector('section.ppr'); return { av: r.querySelector('.ppr-av').textContent, rng: !!r.querySelector('.sim-rng'), big: r.querySelector('.sim-big b').textContent,
                st: [...r.querySelectorAll('.sim-st b')].map((b) => [b.textContent, b.className]), chg: r.querySelectorAll('.real-l .chg').length, g: !!r.querySelector('svg.real-g') }; });
            assert.equal(a.av, aviso);
            assert.equal(a.rng, false, 'sem o ganho por baixo do valor');
            assert.equal(a.big, eur(V), 'o valor continua');
            assert.deepEqual(a.st, [[eur(E), 'num'], ['—', 'num'], ['—', 'num']], 'o investido; o ganho e o por ano: —');
            assert.equal(a.chg, 0, 'sem o ganho de cada componente');
            assert.ok(a.g, 'o gráfico continua');
        }
        // sem nada, a carregar ou sem os valores: a frase certa, sem gráfico, e o editor aberto
        for (const [x, re] of [[{}, /Põe desde quando pagas/], [{ loading: 1 }, /A carregar os valores da Fidelidade/], [{ erro: 'Não consegui ler os valores da Fidelidade agora. Tenta mais tarde.' }, /Não consegui ler/]]) {
            await pg.setContent(`<body>${AO.ecra.carteira({ budget: 0, cp: 0, core: 'X', start: 0, years: 20, goal: 0, ppr: { now: T, at: '', loading: 0, erro: '', ed: 1, cfg: { de: '', pm: 0, din: 0, ur: 0, uc: 0 }, ativos: [], ...x } })}</body>`);
            const v = await pg.evaluate(() => ({ e: document.querySelector('section.ppr .empty').textContent, o: document.querySelector('section.ppr details.ppr-ed').open, g: !!document.querySelector('section.ppr svg') }));
            assert.match(v.e, re); assert.equal(v.o, true); assert.equal(v.g, false);
        }
    } finally { await br.close(); }
});

test('carteira: o Fundo Viva (4.51) — as tuas UP × o valor da UP, o ano e o gráfico', async () => {
    await AO.ready;
    const pts = [{ x: 34, y: 120 }, { x: 93.2, y: 170 }, { x: 330, y: 20 }], hits = pts.map((p, i) => ({ x: i ? p.x - 5 : 34, w: 10, cx: p.x, tx: i === 2 ? 'Hoje: 10 409 €' : `${i}` }));
    const fut = { at: '23/11/2026', loading: 0, erro: '', ed: 0, cfg: { up: 567.3069 }, vv: 567.3069 * 18.3484, up: 18.3484, ytd: 18.3484 / 18.2705 - 1, custos: 'Custos do fundo.', anos: [{ l: '2026 (até hoje)', g: 109.18, p: 0.0106, tp: 1 }, { l: '2025', g: 600, p: 0.0622, tp: 1 }, { l: '2024', g: 510, p: 0.0564, tp: 1 }], gL: 'Ganho desde 2024', gV: 1219.18, pa: 0.0443, semN: '', meus: [{ a: '2023', v: 9000, c: 0 }, { a: '2024', v: 9600, c: 90 }, { a: '2025', v: -1, c: 100 }], xa: '', xv: '', xc: '', pts, hits, lo: 8000, hi: 10600, d0: '12/2021' };
    const br = await chromium.launch(), pg = await br.newPage();
    try {
        await pg.setContent(`<body>${AO.ecra.carteira({ budget: 900, cp: 10, core: 'X', start: 0, years: 20, goal: 0, fut })}</body>`);
        const d = await pg.evaluate(() => {
            const r = document.querySelector('section.fut'), t = (e) => (e ? e.textContent.trim() : null);
            return { sub: t(r.querySelector('.sec-h .sub')), big: t(r.querySelector('.sim-big b')), rng: t(r.querySelector('.sim-rng')), st: [...r.querySelectorAll('.sim-st b')].map((b) => b.textContent),
                lbl: [...r.querySelectorAll('.sim-st small')].map((b) => b.textContent), v: r.querySelector('path.real-v').getAttribute('d'), hits: [...r.querySelectorAll('.sim-hit')].map((h) => h.dataset.tx),
                eixo: [...r.querySelectorAll('.sim-t')].map((x) => x.textContent), custos: (r.querySelector('.fut-custos') || {}).textContent, anos: [...r.querySelectorAll('.ppr-anos tr')].map((tr) => [...tr.querySelectorAll('td')].map((x) => x.textContent)), ed: r.querySelector('[data-fut="up"]').value, aberto: r.querySelector('details.fut-ed').open, depois: !!document.querySelector('section.fut + section.sim'),
                meus: [...r.querySelectorAll('.fut-x')].map((x) => x.textContent), campos: [...r.querySelectorAll('[data-futx]')].map((x) => x.dataset.futx), junta: !!r.querySelector('[data-act="fut-add"]') };
        });
        const p4 = (x) => new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(x);
        assert.equal(d.sub, 'Futuro · valores de 23/11/2026');
        assert.equal(d.big, eur(567.3069 * 18.3484), 'vale hoje: as UP × o valor da UP');
        assert.equal(d.rng, `${pc(18.3484 / 18.2705 - 1)} este ano`);
        assert.deepEqual(d.lbl, ['As tuas UP', 'Valor da UP', 'Ganho desde 2024', 'Por ano']);
        assert.equal(d.custos, 'Custos do fundo.');
        // 4.58: o teu dinheiro ano a ano — o ganho em € e, por baixo, a % (o mais recente primeiro)
        assert.deepEqual(d.anos, [['2026 (até hoje)', `+${eur(109.18)}${pc(0.0106)}`], ['2025', `+${eur(600)}${pc(0.0622)}`], ['2024', `+${eur(510)}${pc(0.0564)}`]], 'o teu dinheiro ano a ano, o mais recente primeiro');
        const m2 = (x) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(x);
        assert.deepEqual(d.meus, [`2023${m2(9000)}✕`, `2024${m2(9600)}entrou ${m2(90)}✕`, `2025—entrou ${m2(100)}✕`], 'os teus anos no editor');
        assert.deepEqual([d.campos, d.junta], [['a', 'v', 'c'], true], 'a linha para juntar um ano');
        assert.deepEqual(d.st, [p4(567.3069), new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(18.3484), `+${eur(1219.18)}`, pc(0.0443)]);
        assert.equal(d.v, 'M34.0 120.0 L93.2 170.0 L330.0 20.0', 'o valor ao longo do tempo');
        assert.deepEqual(d.hits, ['0', '1', 'Hoje: 10 409 €'], 'o dedo, data a data');
        assert.equal(d.eixo[2], '12/2021');
        assert.equal(d.ed, '567.3069');
        assert.equal(d.aberto, false);
        assert.ok(d.depois, 'antes do simulador');
        // 4.58: sem os teus anos, a frase para os juntar (sem o ano a ano nem o ganho); e já sem a data de adesão (4.57)
        {
            await pg.setContent(`<body>${AO.ecra.carteira({ budget: 0, cp: 0, core: 'X', start: 0, years: 20, goal: 0, fut: { ...fut, anos: [], gL: '', meus: [], semN: 'Para veres quanto cresceu o teu dinheiro em cada ano, junta os teus anos.' } })}</body>`);
            const e = await pg.evaluate(() => ({ n: (document.querySelector('section.fut .fut-sem') || {}).textContent, t: document.querySelectorAll('section.fut .fut-anos').length, de: document.querySelectorAll('section.fut [data-fut="de"]').length, l: [...document.querySelectorAll('section.fut .sim-st small')].map((b) => b.textContent) }));
            assert.deepEqual(e, { n: 'Para veres quanto cresceu o teu dinheiro em cada ano, junta os teus anos.', t: 0, de: 0, l: ['As tuas UP', 'Valor da UP'] });
        }
        // sem as UP (ou a carregar, ou sem os valores): a frase certa, sem gráfico, e o editor aberto
        for (const [x, re] of [[{}, /Põe as tuas UP do Fundo Viva/], [{ loading: 1 }, /A carregar os valores da Futuro/], [{ erro: 'Não consegui ler os valores da Futuro agora. Tenta mais tarde.' }, /Não consegui ler/]]) {
            await pg.setContent(`<body>${AO.ecra.carteira({ budget: 0, cp: 0, core: 'X', start: 0, years: 20, goal: 0, fut: { at: '', loading: 0, erro: '', ed: 1, cfg: { up: 0 }, vv: 0, ...x } })}</body>`);
            const v = await pg.evaluate(() => ({ e: document.querySelector('section.fut .empty').textContent, o: document.querySelector('section.fut details.fut-ed').open, g: !!document.querySelector('section.fut svg') }));
            assert.match(v.e, re); assert.equal(v.o, true); assert.equal(v.g, false);
        }
    } finally { await br.close(); }
});

test('carteira: o simulador para o PPR e o Fundo Viva (4.52) — os cenários, o imposto e as linhas de cada um', async () => {
    await AO.ready;
    const mesr = (r) => (1 + r) ** (1 / 12) - 1;
    const val = (tx, s, n, m, c, st, c0) => { const ra = mesr(tx[2 * s]), rb = mesr(tx[2 * s + 1]); let a = st * (1 - c0), b = st * c0; for (let i = 0; i < n; i++) { a = a * (1 + ra) + m * (1 - c); b = b * (1 + rb) + m * c; } return a + b; };
    const tx = [0.01, 0.02, 0.02, 0.05, 0.025, 0.08], alvos = [{ v: 'ativos', l: 'Ativos', on: 0 }, { v: 'ppr', l: 'PPR', on: 1 }, { v: 'viva', l: 'Fundo Viva', on: 0 }];
    const ppr = { budget: 100, cp: 56, core: 'Proteção', nB: 'Dinâmico', start: 2432, c0: 0.55, startReal: true, temReal: true, years: 15, goal: 0, alvo: 'ppr', imp: 1, tx, sub: 'o teu PPR daqui a uns anos', repor: 'Usar o teu PPR', notaReal: 'O valor de hoje do teu PPR.', como: ['Linha um.', 'Linha dois.'], alvos };
    const br = await chromium.launch(), pg = await br.newPage();
    try {
        await pg.setContent(`<body>${AO.ecra.carteira(ppr)}</body>`);
        const d = await pg.evaluate(() => { const r = document.querySelector('.sim'), t = (e) => (e ? e.textContent.trim() : null);
            return { sub: t(r.querySelector('.sec-h .sub')), seg: [...r.querySelectorAll('.sim-alvo button')].map((b) => [b.dataset.v, b.textContent, b.className]), big: t(r.querySelector('.sim-big b')), split: t(r.querySelector('.sim-split')),
                st: [...r.querySelectorAll('.sim-st div')].map((x) => [t(x.querySelector('small')), t(x.querySelector('b'))]), como: [...r.querySelectorAll('.how li')].map((x) => x.textContent), nota: t(r.querySelector('.sim-real')),
                lbl: [...r.querySelectorAll('.sim-ch span')].map((x) => x.textContent) }; });
        const n = 15 * 12, vb = val(tx, 1, n, 100, 0.56, 2432, 0.55), inv = 2432 + 100 * n;
        assert.equal(d.sub, 'o teu PPR daqui a uns anos');
        assert.deepEqual(d.seg, [['ativos', 'Ativos', ''], ['ppr', 'PPR', 'on'], ['viva', 'Fundo Viva', '']], 'o que simular');
        assert.equal(d.big, eur(vb), 'o base, com as taxas do PPR');
        assert.equal(d.split, `${eur(100)} por mês · 44 % Proteção · 56 % Dinâmico`);
        assert.deepEqual(d.st.map((x) => x[0]), ['Investes', 'Ganho (base)', 'Em euros de hoje', 'Imposto no resgate (8 %)']);
        assert.equal(d.st[3][1], eur(0.08 * (vb - inv)), 'o imposto do PPR: 8 % das mais-valias');
        assert.deepEqual(d.como, ['Linha um.', 'Linha dois.']);
        assert.equal(d.nota, 'O valor de hoje do teu PPR.');
        assert.equal(d.lbl[1], 'Já tens (o teu PPR)');
        // o Fundo Viva: um só fundo, sem imposto (3 quadros)
        const viva = { ...ppr, cp: 0, c0: 0, core: 'Fundo Viva', nB: '', alvo: 'viva', imp: 2, tx: [0.01, 0, 0.04, 0, 0.06, 0], start: 10409, budget: 0, years: 21, alvos: alvos.map((x) => ({ ...x, on: x.v === 'viva' ? 1 : 0 })) };
        await pg.setContent(`<body>${AO.ecra.carteira(viva)}</body>`);
        const v = await pg.evaluate(() => { const r = document.querySelector('.sim'), t = (e) => (e ? e.textContent.trim() : null); return { big: t(r.querySelector('.sim-big b')), split: t(r.querySelector('.sim-split')), st: [...r.querySelectorAll('.sim-st small')].map((x) => x.textContent), lbl: [...r.querySelectorAll('.sim-ch span')].map((x) => x.textContent)[1] }; });
        assert.equal(v.big, eur(val(viva.tx, 1, 21 * 12, 0, 0, 10409, 0)));
        assert.equal(v.split, '100 % Fundo Viva');
        assert.deepEqual(v.st, ['Investes', 'Ganho (base)', 'Em euros de hoje'], 'sem imposto');
        assert.equal(v.lbl, 'Já tens (o teu Fundo Viva)');
    } finally { await br.close(); }
});
