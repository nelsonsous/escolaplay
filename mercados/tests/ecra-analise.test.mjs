// node --test mercados/tests/ecra-analise.test.mjs     (MK_ROOT=dist/mercados: a mesma coisa na pasta minificada)
// A Análise desenhada pela Onda (AnaliseOnda.ecra.analise, de mercados/onda/ecra-analise.onda), com a app a correr no
// Chromium. Desde a 4.7.0 é a Onda a referência desta vista (o viewAnalysis do JS saiu): o teste confere no DOM o que a
// vista promete, em estados ao acaso com valores estranhos. E o que ela usa e as outras vistas vão usar — os números do
// Intl pt-PT (fmtPx, fmtPct, fmtPct1) e a ordem do sort do V8 — tem de ser igual ao do browser, valor a valor.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(process.env.MK_ROOT || path.join(here, '..'));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const ESTADOS = +process.env.ESTADOS || 600;
const NUMEROS = +process.env.NUMEROS || 50000;

let browser, server, page;
const erros = [];
before(async () => {
    server = http.createServer((req, res) => {
        let f = decodeURIComponent(req.url.split('?')[0]).replace(/^\/escolaplay\/mercados\/?/, '/');
        if (f === '/') f = '/index.html';
        const fp = path.join(ROOT, f);
        if (!fp.startsWith(ROOT) || !fs.existsSync(fp)) { res.writeHead(404); return res.end(); }
        res.writeHead(200, { 'Content-Type': TYPES[path.extname(fp)] || 'application/octet-stream' });
        fs.createReadStream(fp).pipe(res);
    }).listen(0);
    browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'pt-PT', timezoneId: 'Europe/Lisbon' });
    // sem rede: o conector, a Binance e o resto falham (o teste põe o estado à mão)
    await ctx.route((u) => !u.href.startsWith('http://127.0.0.1'), (r) => r.abort());
    await ctx.routeWebSocket(/./, (ws) => ws.close());
    page = await ctx.newPage();
    page.on('pageerror', (e) => erros.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/escolaplay/mercados/`);
    await page.waitForFunction(() => window.__mk && window.AnaliseOnda);
    await page.evaluate(() => window.AnaliseOnda.ready);
});
after(async () => { if (browser) await browser.close(); if (server) server.close(); });

// ---------- os números ----------
// Corre na página: NUMEROS reais de toda a espécie (casas de 0 a 4, metades exatas no decimal e não no binário, um ulp
// ao lado, inteiros grandes, subnormais, bits ao acaso, NaN, ±Infinity, -0) por cada função, e compara a Onda (o
// fm_teste de ecra.onda) com as do mercados.js e com o Intl.NumberFormat('pt-PT').
function numeros({ n, seed }) {
    const mk = window.__mk, AO = window.AnaliseOnda;
    let s = seed;
    const R = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const pick = (a) => a[Math.floor(R() * a.length)];
    const dv = new DataView(new ArrayBuffer(8));
    const bits = () => { dv.setUint32(0, Math.floor(R() * 2 ** 32)); dv.setUint32(4, Math.floor(R() * 2 ** 32)); return dv.getFloat64(0); };
    const ulp = (x, d) => { dv.setFloat64(0, x); const lo = dv.getUint32(4) + d; if (lo < 0 || lo > 0xffffffff) return x; dv.setUint32(4, lo); return dv.getFloat64(0); };
    const FIXOS = [0, -0, 0.005, -0.005, 0.0049999999999999999, 0.015, 1.005, 2.675, 0.125, 0.5, 1.5, 2.5, -2.5, 1e21, 1e21 - 65536, 2 ** 53, 2 ** 53 + 2, 2 ** 60, 5e-324, 2.2250738585072014e-308,
        1.7976931348623157e308, 9999.995, 9999.5, 99999.5, 0.05, -0.05, 0.04999999999999999, 0.95, 9.995, 0.99995, 1e-7, 123456789.125, 4503599627370495.5, 0.1 + 0.2, 1 / 3, 2 / 3, -1e-300];
    const val = () => {
        const t = Math.floor(R() * 10);
        let x;
        if (t === 0) x = (R() - 0.5) * 10 ** Math.floor(R() * 34 - 14);                                   // todas as grandezas
        else if (t === 1) x = Math.round((R() - 0.5) * 2e6) / 10 ** Math.floor(R() * 5) + pick([0.005, 0.0005, 0.05, 0.00005, 0.5]); // metades
        else if (t === 2) x = bits();
        else if (t === 3) x = ulp(Math.round((R() - 0.5) * 2e7) / 10 ** Math.floor(R() * 7) + pick([0.5, 0.05, 0.005, 0.0005, 0.00005]) / 10 ** Math.floor(R() * 2), pick([-2, -1, 1, 2]));
        else if (t === 4) x = Math.floor(R() * 2 ** 64) * (R() < 0.5 ? 1 : -1);
        else if (t === 5) x = (Math.floor(R() * 1e9) + 0.5) / 10 ** Math.floor(R() * 10);
        else if (t === 6) x = (R() - 0.5) * 400;                                                          // variações em %
        else if (t === 7) x = R() * 120000;                                                                // preços
        else if (t === 8) x = pick(FIXOS) * pick([1, -1, 10, 0.1, 100]);
        else x = ulp(pick(FIXOS), pick([-1, 1]));
        return x;
    };
    const MOEDAS = ['EUR', 'USD', 'GBp', 'DKK', 'GBP', 'CHF', 'JPY', 'SEK', 'XOF', 'HKD', 'CAD', 'BRL', 'GBX', 'USDT', 'usd', '', 'EU', 'EURO', 'ZZZ', 'INR', 'THB', 'XAF'];
    const nf = {}, NF = (d) => nf[d] || (nf[d] = new Intl.NumberFormat('pt-PT', { minimumFractionDigits: d, maximumFractionDigits: d }));
    const out = { casos: 0, dif: [], ndif: 0, porTipo: [0, 0, 0, 0, 0] };
    const real = { fiat: mk.cfg.fiat, q: mk.Q.__fx };
    try {
        for (let feito = 0; feito < n;) {
            const L = [], js = [];
            for (let j = 0; j < 4000 && feito < n; j++, feito++) {
                const v = R() < 0.01 ? pick([NaN, Infinity, -Infinity, null, undefined, '12', true]) : val();
                L.push([0, v]); js.push(mk.fmtPct(v));
                L.push([1, v]); js.push(mk.fmtPct1(v));
                // fmtPx(v, a, cur): a com casas fixas, pontos, cripto (a moeda das cripto) ou com a moeda da cotação
                const qc = pick([undefined, 'USD', 'GBp', 'DKK', '', 'EUR']), fiat = pick(['EUR', 'USD', undefined, 'GBP']);
                const a = pick([undefined, null, { decimals: pick([0, 1, 2, 3, 4]) }, { points: true }, { points: true, decimals: 4 }, { kind: 'crypto', key: '__fx' }, { key: '__fx' }, { kind: 'stock', key: '__nada' }, {}]);
                const cur = pick([undefined, undefined, ...MOEDAS]);
                mk.Q.__fx = { currency: qc }; mk.cfg.fiat = fiat;
                L.push([2, v, a, cur, (mk.Q[a && a.key] && mk.Q[a.key].currency), fiat]); js.push(mk.fmtPx(v, a, cur));
                if (typeof v === 'number' && Number.isFinite(v)) { const d = Math.floor(R() * 5); L.push([3, v, d]); js.push(NF(d).format(v)); }
                if (typeof v === 'number') { L.push([4, v]); js.push(v.toFixed(1).replace('.', ',')); }
            }
            const onda = AO._vista('fm_teste', L).split('\n');
            L.forEach((e, j) => {
                out.casos++; out.porTipo[e[0]]++;
                if (onda[j] === js[j]) return;
                out.ndif++;
                if (out.dif.length < 8) out.dif.push({ e: JSON.stringify(e, (k, x) => (typeof x === 'number' && !Number.isFinite(x) ? String(x) : Object.is(x, -0) ? '-0' : x === undefined ? '«undefined»' : x)), v: typeof e[1] === 'number' ? e[1].toPrecision(21) : '', js: js[j], onda: onda[j] });
            });
        }
    } finally { mk.cfg.fiat = real.fiat; if (real.q === undefined) delete mk.Q.__fx; else mk.Q.__fx = real.q; }
    return out;
}

test(`números: fmtPct, fmtPct1, fmtPx e o Intl pt-PT com 0 a 4 casas (e o toFixed(1)) da Onda iguais aos do browser, em ${NUMEROS} reais cada`, async () => {
    const r = await page.evaluate(numeros, { n: NUMEROS, seed: 99 });
    for (const d of r.dif) console.log(`  ${d.e} (${d.v})\n    JS:   ${JSON.stringify(d.js)}\n    Onda: ${JSON.stringify(d.onda)}`);
    console.log(`# ${r.casos - r.ndif}/${r.casos} iguais — fmtPct ${r.porTipo[0]}, fmtPct1 ${r.porTipo[1]}, fmtPx ${r.porTipo[2]}, Intl ${r.porTipo[3]}, toFixed ${r.porTipo[4]}`);
    assert.equal(r.ndif, 0);
    assert.ok(r.casos >= NUMEROS * 4);
});

// ---------- a ordem ----------
// O V8 do Chromium ordena com o PowerSort (a inserção binária abaixo de 16 elementos); mas o código otimizado (Maglev,
// Turbofan) mete no lugar do sort uma inserção LINEAR até 16 elementos. Com um comparador que dá uma ordem, as duas dão o
// mesmo (são estáveis); com chaves NaN, o resultado do JS depende de a função já estar otimizada. A Onda segue o builtin;
// aqui chega-se a ele com uma lista com buracos (que o código otimizado não mete em linha).
test('ordem: o sort da Onda dá a mesma ordem que o sort do Chromium (empates, NaN, corridas, até 5 000 elementos)', async () => {
    const r = await page.evaluate(() => {
        const AO = window.AnaliseOnda;
        let s = 4242;
        const R = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
        const pick = (a) => a[Math.floor(R() * a.length)];
        let casos = 0, ndif = 0, maior = 0;
        const dif = [];
        for (let it = 0; it < 4000; it++) {
            const n = it < 2000 ? Math.floor(R() * 70) : it < 3700 ? Math.floor(R() * 600) : Math.floor(R() * 5000);
            const tipo = it % 6;
            const gen = () => (tipo === 0 ? Math.floor(R() * 10) : tipo === 1 ? (R() < 0.15 ? NaN : Math.floor(R() * 50)) : tipo === 2 ? pick([NaN, Infinity, -Infinity, 0, -0, 1, 2, 1e308, -1e308]) : tipo === 3 ? R() * 100 : Math.floor(R() * 1000));
            const k1 = Array.from({ length: n }, gen), k2 = Array.from({ length: n }, gen);
            if (tipo >= 4) { let i = 0; while (i < n) { const L = Math.floor(R() * 120) + 1, up = R() < 0.5, seg = k1.slice(i, i + L).sort((a, b) => (up ? a - b : b - a)); seg.forEach((x, j) => { k1[i + j] = x; }); i += L; } }
            if (tipo === 5) for (let i = 0; i < n; i++) if (R() < 0.05) k1[i] = NaN;
            const modo = Math.floor(R() * 8);
            const cmp = (a, b) => { let d = modo & 1 ? k1[a] - k1[b] : k1[b] - k1[a]; if (modo & 2 && !d) d = modo & 4 ? k2[a] - k2[b] : k2[b] - k2[a]; return d; };
            const js = new Array(n);
            for (let i = 0; i < n; i++) js[i] = i;
            js.sort(cmp);
            const onda = AO._ordena(k1, k2, modo);
            casos++; maior = Math.max(maior, n);
            if (js.join() !== onda.join()) { ndif++; if (dif.length < 3) dif.push({ n, tipo, modo }); }
        }
        return { casos, ndif, maior, dif };
    });
    console.log(`# ${r.casos - r.ndif}/${r.casos} ordens iguais (até ${r.maior} elementos)`, r.dif);
    assert.equal(r.ndif, 0);
});

// ---------- a vista ----------
// Corre na página: monta o estado n.º i (pseudo-aleatório, o mesmo em todas as corridas) — os ativos (REG), as análises
// (do motor, com valores estranhos à mistura), as cotações, o Claude, toda a Trade Republic, o diário e o teste no
// passado —, desenha com a Onda e confere no DOM: a ordem da lista (a convicção do Claude pelo prazo, nos empates a
// classificação dele; depois o algoritmo), o veredicto, a pontuação, a linha de baixo (símbolo, variação do dia ou
// desconto, ≠ algoritmo e auto), o ícone igual ao do Painel, a linha da fonte, toda a Trade Republic e as dobras.
function verificar({ de, ate, seed }) {
    const mk = window.__mk, AO = window.AnaliseOnda;
    const rng = (s) => () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    // as análises: o motor sobre séries ao acaso (uma vez por página)
    if (!window.__anPool) {
        const R = rng(7), L = [];
        for (let j = 0; j < 160; j++) {
            const n = 30 + Math.floor(R() * 400), drift = (R() - 0.5) * 0.006, vol = 0.002 + R() * 0.05, c = [];
            let x = 10 + R() * 500;
            for (let i = 0; i < n; i++) { x *= 1 + drift + (R() - 0.5) * vol; c.push(x); }
            L.push({ closes: c, opts: { crypto: j % 5 === 0, kind: ['stock', 'fund', 'crypto', 'index', 'energy'][j % 5], news: j % 3 ? null : (R() - 0.5) } });
        }
        window.__anPool = AO.analyseMany(L).filter(Boolean);
    }
    const POOL = window.__anPool;
    const ODD = ['<b>&amp;</b>', '"aspas"', "o'neil", 'Ação & Cª', '😀 emoji 🇵🇹', 'tab\tnova\nlinha', '  espaços  ', '', 'ÇÃÕ ñ ü ß', ' nbsp ', '<script>alert(1)</script>', 'a"b\'c<d>e&f', '—…→×≡⤒', '&#39;&lt;', 'nul\u0000 c1\u0085 del\u007f', 'Muito comprido '.repeat(60), 'ÿsland ßtraße', 'µ ÷ × þorn'];
    const ROT = ['Sinal forte de subida', 'Positivo', 'Neutro', 'Negativo', 'Fraco — evitar por agora', 'Pressão de venda', 'Favorável para investir a prazo', 'Cautela', 'Oportunidade (com cautela)', 'Barato, mas a cair',
        'ÇÃO ÓTIMO <b>&"\'', 'ÀÉÎÕÜ Ý Þ × ÿ', 'MiXeD CaSe ZZ', '', 'Á"\'<>&', '😀 ABC ß'];
    const NOMES = ['Apple', 'Microsoft', 'FTSE All-World USD (Acc)', 'Mota-Engil', 'LVMH Moët Hennessy', 'Novo Nordisk A/S', 'Bitcoin', 'Ouro', 'J.P. Morgan', 'ébano élan'];
    const SIMB = ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'TSLA', 'AVGO', 'JPM', 'V', 'LLY', 'BRK-B', 'PLTR', 'AMD', 'ASML.AS', 'SAP.DE', 'MC.PA', 'SIE.DE', 'NOVO-B.CO', 'ALV.DE', 'TTE.PA', 'RHM.DE', 'TSM',
        'VWCE.DE', 'EUNL.DE', 'SXR8.DE', 'SXRV.DE', 'IS3N.DE', 'EXSA.DE', '4GLD.DE', 'c:BTC', 'c:ETH', 'c:SOL', 'c:XRP', 'BZ=F', 'CL=F', 'RB=F', 'HO=F', 'NG=F', 'GC=F', '^GSPC', '^IXIC', '^STOXX50E', 'PSI20.LS', '^VIX', 'EURUSD=X',
        'VWCE.MU', 'EURDKK=X', 'A&B', '<X>', '"Q"', "S'", 'ÇA.LS', '😀', 'X Y', '7', '123', '0', 'a<b>"c"&d\'e', 'EGL.LS', 'RACE.MI'];
    const TIPO = (k) => (k.startsWith('c:') ? 'crypto' : /=F$/.test(k) ? (k === 'GC=F' ? 'index' : 'energy') : k.startsWith('^') || k === 'PSI20.LS' || k === 'EURUSD=X' ? 'index' : /\.MU$|EURDKK/.test(k) ? 'aux' : /^(VWCE|EUNL|SXR|IS3N|EXSA|4GLD)/.test(k) ? 'fund' : 'stock');
    const CHAVES = ['buy', 'scale', 'hold', 'wait', 'neutral', 'turn', 'reduce', 'avoid', 'sell', 'up', 'flat', 'down'];
    // as regras da vista (as do viewAnalysis de antes para a ordem; as da 4.7.0 para o veredicto e as marcas)
    const SHORT = { buy: 'Comprar', scale: 'Comprar aos poucos', hold: 'Manter', wait: 'Esperar', neutral: 'Não reforçar', turn: 'Esperar', reduce: 'Reduzir', avoid: 'Evitar', sell: 'Vender', up: 'Em alta', flat: 'Lateral', down: 'Em queda' };
    const FAM = { buy: 1, scale: 1, hold: 0, wait: 0, neutral: 0, turn: 0, reduce: -1, sell: -1, avoid: -1 };
    const tem = (o, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);
    const fin = (x) => typeof x === 'number' && Number.isFinite(x);
    const toneOf = (v) => (!fin(v) ? 'flat' : v > 0.005 ? 'up' : v < -0.005 ? 'down' : 'flat');
    const txt = (v) => String(v ?? '').replace(/\u0000/g, ''); // o esc(v) do JS, como o DOM o lê (sem os NUL)
    const clone = (o) => JSON.parse(JSON.stringify(o));
    const real = { REG: Object.entries(mk.REG), AN: Object.entries(mk.AN), Q: Object.entries(mk.Q), cfg: clone(mk.cfg), fold: { ...mk.st.fold }, uniN: mk.st.uniN, claude: mk.claude, uni: mk.uni, journal: mk.journal, bt: mk.bt };
    const out = { estados: 0, dif: [], ndif: 0, linhas: 0, icones: 0, tipos: { dono: 0, outro: 0, claude: 0, algoritmo: 0, desconto: 0, vazio: 0, toda: 0, verMais: 0, diferente: 0, auto: 0, diario: 0, btFeito: 0, ideias: 0 }, bytes: 0 };
    try {
        for (let i = de; i < ate; i++) {
            const R = rng(seed + i * 7919), pick = (a) => a[Math.floor(R() * a.length)], sim = (p) => R() < p;
            const sub = (a, n) => { const b = a.slice(); for (let j = b.length - 1; j > 0; j--) { const k = Math.floor(R() * (j + 1)); [b[j], b[k]] = [b[k], b[j]]; } return b.slice(0, n); };
            const num = () => pick([Math.round(R() * 100), Math.round(R() * 1000) / 10, R() * 100, 42, 58, 0, 100, -0, 41.5, 58.5]);
            // ---- a configuração ----
            const c = mk.cfg;
            const set = (k, v) => { if (v === undefined) delete c[k]; else c[k] = v; };
            const longa = i % 8 === 3;
            set('owner', longa ? true : pick([false, true, true, undefined, 1, 0, '']));
            set('claude', pick([false, true, undefined, 1]));
            set('proxy', pick(['', 'https://proxy.test', 'https://proxy.test', undefined]));
            set('filter', longa ? 'all' : pick(['plan', 'all', 'all', 'fund', 'crypto', 'stock', 'energy', 'x', undefined]));
            set('hz', pick(['short', 'mid', 'mid', 'long', 'long', 'disc', 'disc', 'x', undefined]));
            set('strategy', pick(['etfcrypto', 'etfcrypto', 'mix', undefined]));
            const st = mk.st;
            for (const k of Object.keys(st.fold)) delete st.fold[k];
            for (const f of ['an-auto', 'uni', 'an-res', 'an-sobre']) if (sim(0.4)) st.fold[f] = pick([true, false, 1, 0]);
            st.uniN = pick([undefined, undefined, 25, 75, 125, 1000]);
            // ---- os ativos ----
            for (const k of Object.keys(mk.REG)) delete mk.REG[k];
            for (const k of Object.keys(mk.AN)) delete mk.AN[k];
            const na = longa ? 60 : pick([0, 1, 3, 8, 20, 40, 45, 60]);
            const keys = sub(SIMB, na);
            for (const k of keys) {
                const kind = sim(0.85) ? TIPO(k) : pick(['stock', 'fund', 'crypto', 'energy', 'index', 'aux']);
                mk.REG[k] = { key: k, kind, sym: pick([k, k, k.replace('c:', ''), pick(ODD), 7, null]), name: pick([k, pick(NOMES), pick(ODD)]), temp: sim(0.08) ? true : undefined };
                if (sim(0.8)) {
                    const r = clone(pick(POOL));
                    for (const h of ['short', 'mid', 'long']) {
                        const x = r.horizons[h];
                        if (!x) continue;
                        if (sim(0.12)) x.score = pick([42, 58, 41, 59, 57.5, 42.5, -0, 0, 100, null, 1e21, -5, 70, 30, 1e-300]);
                        if (sim(0.1)) x.label = pick(ROT);
                        if (sim(0.05)) x.tone = pick(['up', 'down', 'flat', '<b>"', '']);
                    }
                    if (sim(0.1)) r.horizons.long = null;
                    if (sim(0.03)) r.horizons = null;
                    if (r.discount) {
                        const d = r.discount;
                        if (sim(0.12)) d.dd = pick([NaN, null, undefined, -0, 0, -1e-9, -0.00005, -0.99, 1e21, -0.000049999, -0.2345]);
                        if (sim(0.1)) d.tag = pick(ROT);
                        if (sim(0.12)) d.opp = pick([true, false, 1, 0, '', 'x', null]);
                        if (sim(0.12)) d.score = pick([null, 0, 100, 42, 58, -0, 33.3, 1e21]);
                        if (sim(0.05)) d.tone = pick(ODD);
                    }
                    if (sim(0.05)) r.discount = null;
                    if (sim(0.12)) r.advice = pick([null, { key: pick(CHAVES) }, { key: undefined }, { key: 7 }, { key: 'x' }]);
                    mk.AN[k] = r;
                }
                // a variação do dia (o qv devolve a cotação tal e qual: em euros e sem preço da noite)
                mk.Q[k] = { currency: 'EUR', price: sim(0.9) ? 1 + R() * 900 : pick([null, undefined, NaN]), changePct: pick([(R() - 0.5) * 20, (R() - 0.5) * 20, 0, -0, 0.005, -0.005, 0.004999, NaN, undefined, null, '1.5', 1e21, -1e-7]), name: pick([undefined, pick(NOMES), pick(ODD)]) };
            }
            // ---- o Claude ----
            const acao = (s) => {
                const a = { s, key: pick(CHAVES.concat(['x', undefined, 7])), action: pick(['Comprar', 'Manter e reforçar', '', undefined, pick(ODD), 0]), why: pick(['Porque sim.', '', undefined, pick(ODD)]) };
                for (const h of ['short', 'mid', 'long']) { const v = pick([num(), num(), num(), NaN, null, undefined, '50', 42, 58, 1e21, -0]); if (v !== undefined) a[h] = v; }
                return a;
            };
            const clKeys = sub(keys, Math.floor(R() * keys.length * 1.1)).concat(sim(0.3) ? ['ZZZ', 'UNI1', 'UNI2'] : []);
            const acts = clKeys.map(acao);
            if (sim(0.15)) acts.splice(Math.floor(R() * acts.length), 0, pick([null, 0, 'x', [], { s: keys[0], key: 'buy' }]));
            if (sim(0.15) && acts.length) acts.push({ ...acts[0], key: 'sell', why: 'repetido' });
            const rank = () => pick([undefined, sub(clKeys, clKeys.length), sub(clKeys, Math.floor(clKeys.length / 2)), [keys[0], keys[0], 7, null], 'x']);
            const doc = { date: pick(['2026-11-07', '', undefined]), generatedAt: pick(['2026-11-07T07:16:00Z', '2026-11-06T15:20:00Z', 'lixo', undefined, 1762500000000]), actions: acts,
                rank: pick([undefined, null, { short: rank(), mid: rank(), long: rank() }, 'x']), review: pick([undefined, '', 'Primeiro dia.', pick(ODD)]),
                lessons: pick([undefined, [], ['Não perseguir subidas'], ['a', pick(ODD), 7, null, ['x', 'y']], 'x']), off: pick([undefined, false, true]) };
            mk.claude = pick([null, null, doc, doc, doc, { missing: true, error: 'HTTP 403', off: pick([true, false]) }, { ...doc, actions: pick([undefined, null, 'x', {}]) }, { ...doc, missing: 1 }]);
            // ---- toda a Trade Republic ----
            const linha = () => ({ s: pick(SIMB.concat(['UNI1', 'UNI2', 'UNI3', 'PUM.DE', 'ADA-EUR'])), n: pick(NOMES.concat(ODD)), t: pick(['etf', 'crypto', 'stock', 'stock', 'stock', 'x', undefined]),
                m: pick([num(), num(), NaN, null, '50']), l: pick([num(), num(), num(), NaN, null, undefined]), o: pick([0, 0, 1, 1, null, true]),
                dd: pick([-Math.round(R() * 900) / 10, -Math.round(R() * 900) / 10, null, -0]), d: pick([Math.round((R() - 0.5) * 100) / 10, null, NaN, undefined]),
                y: pick([Math.round((R() - 0.5) * 2000) / 10, null, NaN]), rk: pick(['Risco baixo', 'Risco médio', 'Risco muito alto', undefined, '', '<b>']) });
            const nr = longa ? pick([300, 1400]) : pick([0, 1, 3, 25, 26, 80, 300, 1400]);
            const at = Date.now() - (sim(0.15) ? 31 * 60000 : 0);
            mk.uni = longa ? { at, date: '2026-11-07', generatedAt: '2026-11-07T07:20:00Z', rows: Array.from({ length: nr }, linha) } : pick([null, { at, error: pick(['ainda sem classificação', 'só para a app do dono', '<x>&']) }, { at }, { at, date: '2026-11-07', generatedAt: pick(['2026-11-07T07:20:00Z', 'lixo', undefined, 1762500000000]), rows: Array.from({ length: nr }, linha) },
                { at, date: '2026-11-07', generatedAt: '2026-11-07T07:20:00Z', rows: Array.from({ length: nr }, linha) }]);
            // ---- o diário (o evalJournal faz as contas com os preços de agora) ----
            const hoje = new Date(), dia = (n) => { const d = new Date(hoje); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
            const nd = pick([0, 1, 2, 5, 19, 20, 21, 40]), dias = {};
            if (sim(0.5)) mk.Q['VWCE.DE'] = { currency: 'EUR', price: 100 + R() * 50, changePct: 1 };
            for (let j = 0; j < nd; j++) dias[dia(j)] = sub(keys.concat(['VWCE.DE']), Math.floor(R() * 12)).map((s) => ({ s, p: 1 + R() * 800, a: pick(['buy', 'scale', 'hold', 'wait', 'neutral', 'turn', 'avoid', 'avoid', undefined, 'x']) }));
            mk.journal = pick([null, null, { days: {} }, {}, { days: dias }, { days: dias }, { days: dias }]);
            // ---- o teste no passado ----
            const soma = () => { const s = {}; for (const k of sub(['buy', 'scale', 'hold', 'wait', 'neutral', 'turn', 'avoid', 'xyz'], Math.floor(R() * 9))) s[k] = { n: 5, n63: pick([0, 3, 120, 1]), avg63: pick([(R() - 0.5) * 0.4, null, NaN, 0, -0, 0.00004]), hit63: pick([R(), null, NaN, 1]), ex63: pick([(R() - 0.5) * 0.2, null, NaN]) }; return s; };
            const nomes = () => sub(keys.concat(['FORA', 'VWCE.DE']), Math.floor(R() * 4)).map((k) => ({ k, a: pick([(R() - 0.5) * 0.5, null, NaN, 0]) }));
            const kinds = () => { const b = {}; for (const k of sub(['stock', 'fund', 'crypto', 'energy'], Math.floor(R() * 5))) b[k] = { s: (R() - 0.5) * 10, n: pick([0, 0, 5, 40]) }; return b; };
            mk.bt = pick([null, null, { running: true }, { error: pick(ODD) }, { at: 1, n: pick([0, 3, 40]), yrs: pick([5, 4.9, null, 0, 2]), ticket: pick([50, 90, 123.456, 900 * 0.1, 45.04999, 1e21, Infinity, NaN, 64.95]), sum: soma(), worst: nomes(), best: nomes(), byKind: pick([kinds(), kinds(), undefined, null]) }]);

            // ---- o desenho ----
            const snap = mk.analysisSnap(), html = AO.ecra.analise(snap);
            const D = new DOMParser().parseFromString(html, 'text/html');
            out.estados++; out.bytes += html.length;
            const erro = (m) => { out.ndif++; if (out.dif.length < 8) out.dif.push(`estado ${i}: ${m}`); };
            // ---- o que devia lá estar ----
            const REG = mk.REG, AN = mk.AN, C = mk.claude, hz = c.hz, f = c.filter, disc = hz === 'disc';
            const listed = (k) => !!REG[k] && !REG[k].temp && REG[k].kind !== 'aux';
            const investable = (k) => listed(k) && ['stock', 'fund', 'crypto'].includes(REG[k].kind);
            const clDoc = !!(c.owner || c.claude) && C && !C.missing && Array.isArray(C.actions) ? C : null;
            const clNow = (k) => (clDoc ? clDoc.actions.find((a) => a && a.s === k) || null : null);
            const hzOf = (k) => { const r = AN[k]; if (!r) return null; return disc ? r.discount || null : r.horizons && r.horizons[hz]; };
            const clScore = (k) => { const a = clNow(k); return a && fin(a[hz]) ? a[hz] : null; };
            const useCl = !disc && !!clDoc && clDoc.actions.some((a) => a && fin(a.mid));
            const ks = Object.keys(REG).filter((k) => listed(k) && REG[k].kind !== 'index' && (AN[k] || clNow(k)));
            const pool = ks.filter((k) => (f === 'all' ? investable(k) : f === 'plan' ? investable(k) && ['fund', 'crypto'].includes(REG[k].kind) : REG[k].kind === f));
            const rk = (k) => { const r = useCl && C.rank && C.rank[hz]; const j = Array.isArray(r) ? r.indexOf(k) : -1; return j < 0 ? 1e3 : j; };
            const clRows = useCl ? pool.filter((k) => clScore(k) != null).sort((a, b) => clScore(b) - clScore(a) || rk(a) - rk(b)) : [];
            const autoRows = pool.filter((k) => !clRows.includes(k) && hzOf(k)).sort((a, b) => hzOf(b).score - hzOf(a).score);
            const quer = clRows.concat(autoRows), sa = Object.fromEntries(snap.assets.map((x) => [x.k, x]));
            const T = out.tipos;
            if (c.owner) T.dono++; else T.outro++;
            if (disc) T.desconto++;
            if (!quer.length) T.vazio++; else if (useCl) T.claude++; else T.algoritmo++;
            // ---- a lista ----
            const rows = [...D.querySelectorAll('.an-list .row')];
            if (rows.map((r) => r.dataset.open).join('\n') !== quer.join('\n')) erro(`ordem: ${JSON.stringify(rows.map((r) => r.dataset.open).slice(0, 6))} em vez de ${JSON.stringify(quer.slice(0, 6))}`);
            if (!quer.length !== !!D.querySelector('.empty')) erro('o vazio');
            if (quer.length) {
                const fonte = (D.querySelector('.an-src') || {}).textContent;
                const fq = useCl ? 'Claude' + (snap.when ? ' · ' + snap.when : '') : 'Algoritmo' + (clDoc ? ' · veredicto do Claude' : '');
                if (fonte !== fq || !!D.querySelector('.an-src.cl') !== useCl) erro(`fonte: ${JSON.stringify(fonte)} em vez de ${JSON.stringify(fq)}`);
            }
            rows.forEach((row, j) => {
                const k = quer[j];
                if (row.dataset.open !== k) return;
                out.linhas++;
                const a = clNow(k), h = hzOf(k), adv = AN[k] && AN[k].advice && AN[k].advice.key, x = sa[k];
                const nota = j < clRows.length ? clScore(k) : +h.score;
                const ver = a ? (tem(SHORT, a.key) ? SHORT[a.key] : a.action ? txt(a.action) : '') : disc ? txt(h.tag) : tem(FAM, adv) ? SHORT[adv] : txt(h.label);
                const fc = a && tem(FAM, a.key) ? FAM[a.key] : null, fa = tem(FAM, adv) ? FAM[adv] : null;
                const marca = a ? (!disc && fc != null && fa != null && fc !== fa ? '≠ algoritmo' : '') : clDoc ? 'auto' : '';
                if (marca === '≠ algoritmo') T.diferente++; else if (marca) T.auto++;
                const meio = disc ? mk.fmtPct1(+AN[k].discount.dd * 100) + ' do máx.' : mk.fmtPct(x.chg);
                const subq = `${txt(x.sym)} · ${meio}${marca ? ' · ' + marca : ''}`;
                const v = row.querySelector('.r-score .val'), l = row.querySelector('.r-score .lbl'), s = row.querySelector('.r-sub'), nm = row.querySelector('.r-name');
                if (!v || v.textContent !== String(nota)) erro(`${k}: pontuação ${v && v.textContent} em vez de ${nota}`);
                if (!l || l.textContent !== ver) erro(`${k}: veredicto ${JSON.stringify(l && l.textContent)} em vez de ${JSON.stringify(ver)}`);
                if (!s || s.textContent !== subq) erro(`${k}: linha de baixo ${JSON.stringify(s && s.textContent)} em vez de ${JSON.stringify(subq)}`);
                if (!disc && (!s.querySelector('.chg') || s.querySelector('.chg').className !== 'chg ' + toneOf(x.chg))) erro(`${k}: cor da variação`);
                if (!nm || nm.textContent !== txt(x.name) || nm.children.length) erro(`${k}: nome ${JSON.stringify(nm && nm.textContent)}`);
                if (row.dataset.key !== k || row.dataset.chg !== 'day') erro(`${k}: data-key / data-chg`);
                // o ícone: o do Painel (o ico() do JS), menos na cripto com um símbolo que não é texto ou com caracteres fora do BMP
                const sy = REG[k].sym;
                if (REG[k].kind !== 'crypto' || (typeof sy === 'string' && !/[\ud800-\udfff]/.test(sy))) {
                    const js = new DOMParser().parseFromString(mk.ico(k), 'text/html').body.firstChild, on = row.querySelector('.r-ico');
                    out.icones++;
                    if (!on || on.textContent !== js.textContent || on.getAttribute('style') !== js.getAttribute('style')) erro(`${k}: ícone ${on && on.outerHTML} em vez de ${js.outerHTML}`);
                }
            });
            // ---- toda a Trade Republic (só na app do dono) ----
            const tipos = { plan: ['etf', 'crypto'], all: ['etf', 'crypto', 'stock'], fund: ['etf'], crypto: ['crypto'], stock: ['stock'] }, ty = tem(tipos, f) ? tipos[f] : null, U = mk.uni;
            const uni = D.querySelector('details.uni');
            if (c.owner && ty && U && U.rows) {
                const kk = hz === 'mid' ? 'm' : 'l';
                const rs = U.rows.filter((r) => ty.includes(r.t) && fin(r[kk]));
                rs.sort(disc ? (a, b) => b.o - a.o || a.dd - b.dd : (a, b) => b[kk] - a[kk]);
                const n = mk.st.uniN || 25;
                if (!rs.length) { if (uni) erro('toda a TR sem linhas, mas com a dobra'); } else if (!uni) erro('falta toda a TR');
                else {
                    T.toda++;
                    const got = [...uni.querySelectorAll('.row')].map((e) => e.dataset.open).join('\n'), want = rs.slice(0, n).map((r) => txt(r.s)).join('\n');
                    if (got !== want) erro('ordem de toda a TR');
                    if (uni.querySelector('.f-n').textContent !== String(rs.length)) erro(`toda a TR: ${uni.querySelector('.f-n').textContent} em vez de ${rs.length}`);
                    if (!!uni.querySelector('[data-act="uni-more"]') !== rs.length > n) erro('o "Ver mais"');
                    if (rs.length > n) T.verMais++;
                    if (uni.hasAttribute('open') !== !!mk.st.fold.uni) erro('toda a TR aberta/fechada');
                }
            } else if (uni) erro('toda a TR a mais');
            // ---- as dobras: ficam como o utilizador as deixou ----
            for (const fd of ['an-auto', 'an-res', 'an-sobre']) {
                const e = D.querySelector(`details[data-fold="${fd}"]`);
                if (!e) { if (fd !== 'an-auto') erro(`falta a dobra ${fd}`); continue; }
                if (e.hasAttribute('open') !== !!mk.st.fold[fd]) erro(`${fd} aberta/fechada`);
            }
            if (D.querySelector('details[data-fold="an-auto"]')) T.ideias++;
            if (/<th>Desde então<\/th>/.test(html)) T.diario++;
            if (/<th>3 meses<\/th>/.test(html)) T.btFeito++;
            // nada do que vem nos dados vira HTML
            if (D.querySelector('script, img, iframe, .an-list b, .r-sub b')) erro('HTML dos dados no ecrã');
        }
    } finally {
        for (const k of Object.keys(mk.REG)) delete mk.REG[k];
        for (const [k, v] of real.REG) mk.REG[k] = v;
        for (const k of Object.keys(mk.AN)) delete mk.AN[k];
        for (const [k, v] of real.AN) mk.AN[k] = v;
        for (const k of Object.keys(mk.Q)) delete mk.Q[k];
        for (const [k, v] of real.Q) mk.Q[k] = v;
        for (const k of Object.keys(mk.cfg)) delete mk.cfg[k];
        Object.assign(mk.cfg, real.cfg);
        for (const k of Object.keys(mk.st.fold)) delete mk.st.fold[k];
        Object.assign(mk.st.fold, real.fold); mk.st.uniN = real.uniN;
        mk.claude = real.claude; mk.uni = real.uni; mk.journal = real.journal; mk.bt = real.bt;
    }
    return out;
}

test(`Análise: a lista, os veredictos, as marcas, os ícones e as dobras certos em ${ESTADOS} estados`, async () => {
    const tot = { estados: 0, ndif: 0, dif: [], linhas: 0, icones: 0, tipos: {}, bytes: 0 };
    for (let de = 0; de < ESTADOS; de += 50) {
        const r = await page.evaluate(verificar, { de, ate: Math.min(ESTADOS, de + 50), seed: 2026 });
        tot.estados += r.estados; tot.ndif += r.ndif; tot.linhas += r.linhas; tot.icones += r.icones; tot.bytes += r.bytes;
        for (const [k, v] of Object.entries(r.tipos)) tot.tipos[k] = (tot.tipos[k] || 0) + v;
        tot.dif.push(...r.dif);
    }
    for (const d of tot.dif.slice(0, 8)) console.log('  ' + d);
    console.log(`# ${tot.estados} estados, ${tot.linhas} linhas e ${tot.icones} ícones conferidos (${(tot.bytes / tot.estados / 1024).toFixed(1)} KB de HTML em média) — ${JSON.stringify(tot.tipos)}`);
    assert.equal(tot.ndif, 0, `${tot.ndif} diferenças`);
    assert.equal(tot.estados, ESTADOS);
    // cobertura: os ramos todos apareceram muitas vezes
    for (const [k, v] of Object.entries(tot.tipos)) assert.ok(v >= ESTADOS / 40, `poucos estados do tipo ${k}: ${v}`);
    assert.deepEqual(erros, []);
});

test('Análise: a app desenha-a com a Onda (e, se a Onda falhar, um aviso curto)', async () => {
    const r = await page.evaluate(() => {
        const mk = window.__mk, ecra = window.AnaliseOnda.ecra, orig = ecra.analise;
        let n = 0;
        ecra.analise = (s) => { n++; return orig(s); };
        mk.cfg.tab = 'analise'; mk.render();
        const html = document.querySelector('#mk-body').innerHTML, usou = n;
        ecra.analise = () => { throw new Error('teste'); };
        const ce = console.error; let logs = 0; console.error = () => { logs++; };
        const recurso = mk.analysisHtml();
        console.error = ce; ecra.analise = orig;
        mk.cfg.tab = 'painel'; mk.render();
        return { usou, temPrazo: html.includes('<div class="seg hz" role="group" aria-label="Prazo">'), recurso, logs };
    });
    assert.ok(r.usou >= 1, 'o render da Análise chamou a Onda');
    assert.ok(r.temPrazo, 'os prazos estão no ecrã');
    assert.equal(r.recurso, '<div class="empty">Não deu para mostrar a análise.</div>', 'sem a vista da Onda, um aviso');
    assert.equal(r.logs, 1, 'e o erro na consola');
});

test('Análise: desempenho (mediana de 50 desenhos no Chromium)', async () => {
    const r = await page.evaluate(() => {
        const mk = window.__mk, AO = window.AnaliseOnda;
        const med = (f) => { const t = []; for (let i = 0; i < 60; i++) { const a = performance.now(); for (let j = 0; j < 10; j++) f(); t.push((performance.now() - a) / 10); } t.splice(0, 10); t.sort((x, y) => x - y); return t[25]; };
        // a app do dono com a lista toda por omissão (23 ações, 7 fundos, 4 cripto, os futuros e os índices), cada
        // ativo com a análise do motor e a do Claude, o diário de 60 dias, o teste no passado e toda a Trade Republic
        let s = 11;
        const R = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
        const pool = window.__anPool || AO.analyseMany(Array.from({ length: 60 }, (_, j) => { let x = 100; return { closes: Array.from({ length: 300 }, () => (x *= 1 + (R() - 0.49) * 0.03)), opts: { kind: 'stock' } }; })).filter(Boolean);
        const antes = { cfg: { ...mk.cfg }, claude: mk.claude, uni: mk.uni, journal: mk.journal, bt: mk.bt, AN: Object.entries(mk.AN), Q: Object.entries(mk.Q) };
        const keys = Object.keys(mk.REG).filter((k) => !mk.REG[k].temp && mk.REG[k].kind !== 'aux');
        keys.forEach((k, j) => { mk.AN[k] = JSON.parse(JSON.stringify(pool[j % pool.length])); mk.Q[k] = { ...(mk.Q[k] || {}), currency: 'EUR', price: 10 + R() * 500, changePct: (R() - 0.5) * 8 }; });
        const sc = () => Math.round(R() * 100);
        mk.claude = { date: '2026-11-07', generatedAt: '2026-11-07T07:16:00Z', review: 'Bom dia.', lessons: ['Não perseguir subidas', 'Reforçar nos suportes'],
            rank: { short: keys.slice().reverse(), mid: keys.slice(), long: keys.slice() }, actions: keys.map((k) => ({ s: k, key: ['buy', 'hold', 'wait', 'avoid'][Math.floor(R() * 4)], action: 'Manter', why: 'Tendência longa a favor, perto da média de 50 dias.', short: sc(), mid: sc(), long: sc() })) };
        const dias = {};
        for (let j = 1; j <= 60; j++) dias['2026-09-' + String(j).padStart(2, '0')] = keys.slice(0, 40).map((k) => ({ s: k, p: 100, a: ['buy', 'hold', 'avoid', 'scale'][j % 4] }));
        mk.journal = { days: dias };
        mk.bt = { at: 1, n: 40, yrs: 5, ticket: 90, sum: { buy: { n63: 120, avg63: 0.04, hit63: 0.6, ex63: 0.01 }, hold: { n63: 300, avg63: 0.02, hit63: 0.5, ex63: -0.01 }, avoid: { n63: 80, avg63: -0.01, hit63: 0.55, ex63: -0.03 } },
            worst: [{ k: 'TSLA', a: -0.1 }], best: [{ k: 'NVDA', a: 0.3 }], byKind: { stock: { s: 2, n: 100 }, crypto: { s: 1, n: 20 } } };
        const linhas = (n) => Array.from({ length: n }, (_, j) => ({ s: 'U' + j + '.DE', n: 'Empresa número ' + j, t: ['stock', 'stock', 'etf', 'crypto'][j % 4], m: sc(), l: sc(), o: j % 5 ? 0 : 1, dd: -R() * 50, d: (R() - 0.5) * 6, y: (R() - 0.3) * 60, rk: 'Risco médio' }));
        Object.assign(mk.cfg, { owner: true, proxy: 'https://proxy.test', filter: 'all', hz: 'mid', strategy: 'etfcrypto' });
        const res = {};
        for (const [nome, nr] of [['25 da lista toda', 25], ['1340 da lista toda', 1340]]) {
            mk.uni = { at: Date.now(), date: '2026-11-07', generatedAt: '2026-11-07T07:20:00Z', rows: linhas(nr) };
            const snap = mk.analysisSnap(), html = AO.ecra.analise(snap);
            res[nome] = { onda: med(() => AO.ecra.analise(mk.analysisSnap())), instantaneo: med(() => mk.analysisSnap()), soOnda: med(() => AO.ecra.analise(snap)),
                kb: html.length / 1024, linhas: (html.match(/class="row/g) || []).length };
        }
        for (const k of Object.keys(mk.cfg)) delete mk.cfg[k];
        Object.assign(mk.cfg, antes.cfg);
        mk.claude = antes.claude; mk.uni = antes.uni; mk.journal = antes.journal; mk.bt = antes.bt;
        for (const k of Object.keys(mk.AN)) delete mk.AN[k];
        for (const [k, v] of antes.AN) mk.AN[k] = v;
        for (const k of Object.keys(mk.Q)) delete mk.Q[k];
        for (const [k, v] of antes.Q) mk.Q[k] = v;
        return res;
    });
    for (const [k, v] of Object.entries(r)) {
        console.log(`# ${k} (${v.linhas} linhas, ${v.kb.toFixed(1)} KB): Onda ${v.onda.toFixed(3)} ms (instantâneo ${v.instantaneo.toFixed(3)} ms + desenho ${v.soOnda.toFixed(3)} ms)`);
        assert.ok(v.linhas > 30, `${k}: a lista desenhada`);
        assert.ok(v.onda < 25, `a Onda demora ${v.onda} ms`);
    }
});
