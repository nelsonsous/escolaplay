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
    // sem plano nem investido: pede os números
    const vazio = await ler(pg, AO.ecra.carteira({ budget: 0, cp: 10, core: 'X', start: 0, years: 20, goal: 0 }));
    assert.match(vazio.vazio, /quanto investes por mês/);
    assert.equal(vazio.big, null);
    } finally { await br.close(); }
});
