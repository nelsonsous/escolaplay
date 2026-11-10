// node --test mercados/tests/ecra-painel.test.mjs     (MK_ROOT=dist/mercados: a mesma coisa na pasta minificada)
// O Painel desenhado pela Onda (AnaliseOnda.ecra.painel, de mercados/onda/ecra-painel.onda), com a app a correr no
// Chromium. Desde a 4.9.0 é a Onda a referência desta vista (o viewDashboard, o todayCard e o briefParts do JS saíram): o
// teste confere no DOM o que a vista promete, em estados ao acaso com valores estranhos — o dono e as outras apps, com o
// Claude, sem ele e com uma análise atrasada, todos os períodos e todas as ordens, listas vazias, nomes e símbolos
// estranhos, preços que faltam, com e sem combustíveis, ativos retirados —, contra as regras de antes (as do JS, aqui
// reescritas a partir do estado da app) e os números do browser (fmtPx, fmtPct, fmtPct1) e o ico() de sempre.
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

// Corre na página: monta o estado n.º i (pseudo-aleatório, o mesmo em todas as corridas) — a configuração, os ativos
// (REG), as cotações, os fechos (os períodos), as análises do motor, a análise do Claude e a memória dela, toda a TR, os
// combustíveis, o arrastar e as dobras —, desenha com a Onda e confere no DOM: a ordem dos blocos, cada lista (quem entra,
// por que ordem, os grupos por bolsa, o vazio, o Repor e o Juntar), cada linha (os data-* que os eventos, o arrastar e o
// patchLive usam, o ícone igual ao do ico(), o nome, a linha de baixo, a hora, o preço e a variação no período com os
// números do browser), o período e a ordem (a escolha), o cartão Hoje (de onde vem, as 3 linhas do Claude, a próxima
// execução, e na dobra o sentimento, o plano do mês — o do Claude ou o automático —, o que mais seguir, o porquê dos
// movimentos, os riscos, a agenda e as notas) e as linhas fechadas no fim (o resumo e o que têm dentro).
function verificar({ de, ate, seed }) {
    const mk = window.__mk, AO = window.AnaliseOnda;
    const rng = (s) => () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    // as análises: o motor sobre séries ao acaso (uma vez por página)
    if (!window.__pnPool) {
        const R = rng(29), L = [];
        for (let j = 0; j < 160; j++) {
            const n = 30 + Math.floor(R() * 330), drift = (R() - 0.5) * 0.008, vol = 0.002 + R() * 0.05, cl = [];
            let x = 10 + R() * 500;
            for (let i = 0; i < n; i++) { x *= 1 + drift + (R() - 0.5) * vol; cl.push(x); }
            L.push({ closes: cl, opts: { crypto: j % 4 === 0, kind: ['crypto', 'stock', 'fund', 'stock'][j % 4], news: null } });
        }
        window.__pnPool = AO.analyseMany(L).filter(Boolean);
    }
    const POOL = window.__pnPool;
    const ODD = ['<b>&amp;</b>', '"aspas"', "o'neil", 'Ação & Cª', '😀 emoji 🇵🇹', 'tab\tnova\nlinha', '  espaços  ', '', 'ÇÃÕ ñ ü ß', ' nbsp ', '<script>alert(1)</script>', 'a"b\'c<d>e&f', '—…→×≡⤒', '&#39;&lt;', 'nul\u0000 c1\u0085 del\u007f', 'Muito comprido '.repeat(30), 'ÿsland ßtraße', 'µ ÷ × þorn', '<img src=x onerror=alert(1)>', 'cr\r\nlf'];
    const NOMES = ['Apple', 'Microsoft', 'FTSE All-World USD (Acc)', 'Mota-Engil', 'LVMH Moët Hennessy', 'Novo Nordisk A/S', 'Bitcoin', 'Ouro', 'J.P. Morgan', 'ébano élan', 'Zebra', 'zebra', 'Ábaco', 'abaco'];
    const CRIPTO = [['c:BTC', 'BTC', 'Bitcoin'], ['c:ETH', 'ETH', 'Ether'], ['c:SOL', 'SOL', 'Solana'], ['c:XRP', 'XRP', 'XRP']];
    const ENERGIA = [['BZ=F', 'Petróleo Brent', 'barril', 0], ['CL=F', 'Petróleo WTI', 'barril', 0], ['RB=F', 'Gasolina (RBOB)', 'galão', 1], ['HO=F', 'Gasóleo (ULSD)', 'galão', 1], ['NG=F', 'Gás natural', 'MMBtu', 0]];
    const INDICES = [['^GSPC', 'S&P 500', 1], ['^IXIC', 'Nasdaq', 1], ['^STOXX50E', 'Euro Stoxx 50', 1], ['PSI20.LS', 'PSI (Lisboa)', 1], ['^VIX', 'VIX (medo)', 1], ['EURUSD=X', 'EUR/USD', 1, 4], ['GC=F', 'Ouro', 0, undefined, 'onça']];
    const ACOES = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'BRK-B', 'ASML.AS', 'SAP.DE', 'MC.PA', 'NOVO-B.CO', 'ALV.DE', 'RHM.DE', 'TSM', 'EGL.LS', 'RACE.MI', 'ITX.MC', 'NESN.SW', 'BP.L', '7203.T', '0700.HK', 'X.YY', 'Z.Q',
        'A&B', '<X>', '"Q"', "S'", 'ÇA.LS', '😀', 'X Y', '7', 'a<b>"c"&d\'e', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6'];
    const FUNDOS = ['VWCE.DE', 'EUNL.DE', 'SXR8.DE', 'SXRV.DE', 'IS3N.DE', 'EXSA.DE', '4GLD.DE', 'IWDA.AS', 'F&<"'];
    const MOEDAS = ['EUR', 'EUR', 'USD', 'GBp', 'DKK', 'GBP', 'CHF', '', undefined, 'ZZZ', 'usd'];
    // as tabelas do mercados.js
    const MKT = { LS: 'Portugal · PSI', DE: 'Alemanha · DAX', F: 'Alemanha · DAX', PA: 'França · CAC 40', AS: 'Países Baixos · AEX', MI: 'Itália · FTSE MIB', MC: 'Espanha · IBEX 35', L: 'Reino Unido · FTSE 100', CO: 'Dinamarca · OMX', SW: 'Suíça · SMI', BR: 'Bélgica · BEL 20', HE: 'Finlândia', ST: 'Suécia', OL: 'Noruega', T: 'Japão · Nikkei', HK: 'Hong Kong' };
    const mktOf = (k) => { const m = /\.([A-Z]{1,3})$/.exec(k); return m ? MKT[m[1]] || 'Outras bolsas' : 'EUA · S&P 500 / Nasdaq'; };
    // o rótulo (4.11): entrar Comprar / Reforçar, ficar Aguardar / Manter, sair Evitar / Vender — conforme já tem o ativo
    const SHORT = { buy: 1, scale: 1, hold: 1, wait: 1, neutral: 1, turn: 1, reduce: 1, avoid: 1, sell: 1, up: 1, flat: 1, down: 1 };
    const lbl = (k, own) => ({ buy: 1, scale: 1 }[k] ? (own ? 'Reforçar' : 'Comprar') : { hold: 1, wait: 1, neutral: 1, turn: 1 }[k] ? (own ? 'Manter' : 'Aguardar')
        : { reduce: 1, sell: 1, avoid: 1 }[k] ? (own ? (k === 'reduce' ? 'Vender parte' : 'Vender') : 'Evitar') : { up: 'Em alta', flat: 'Lateral', down: 'Em queda' }[k]);
    const CL_TONE = { buy: 'up', scale: 'up', hold: 'flat', wait: 'flat', neutral: 'flat', turn: 'flat', reduce: 'down', avoid: 'down', sell: 'down', up: 'up', flat: 'flat', down: 'down' };
    const tab = (t, k) => (typeof k === 'string' && Object.prototype.hasOwnProperty.call(t, k) ? t[k] : undefined);
    const fin = (x) => typeof x === 'number' && Number.isFinite(x);
    const toneOf = (v) => (!fin(v) ? 'flat' : v > 0.005 ? 'up' : v < -0.005 ? 'down' : 'flat');
    const vverd = (v) => !!v;
    const isObj = (o) => !!o && typeof o === 'object' && !Array.isArray(o);
    // o esc(v) do JS, como o DOM o lê: sem os NUL, e o \r (sozinho ou antes do \n) passa a \n
    const txt = (v) => String(v ?? '').replace(/\u0000/g, '').replace(/\r\n?/g, '\n');
    const atr = (v) => String(v ?? '').replace(/\u0000/g, '�').replace(/\r\n?/g, '\n'); // … e num atributo (o NUL fica U+FFFD)
    const eurNum = (s) => { const m = String(s || '').replace(/[\s  ]/g, '').replace(/\./g, '').match(/(\d+(?:,\d+)?)€/); return m ? +m[1].replace(',', '.') : NaN; };
    const clone = (o) => JSON.parse(JSON.stringify(o));
    const real = { REG: Object.entries(mk.REG), AN: Object.entries(mk.AN), Q: Object.entries(mk.Q), D: Object.entries(mk.D), PS: { '1w': Object.entries(mk.PS['1w']), '1m': Object.entries(mk.PS['1m']) },
        cfg: clone(mk.cfg), fold: { ...mk.st.fold }, swipe: mk.st.swipe, fuelErr: mk.st.fuelErr, claude: mk.claude, uni: mk.uni, fuel: mk.fuel, dist: mk.distritos, munic: Object.entries(mk.MUNIC), clmem: localStorage.getItem('mercados:clmem') };
    const out = { estados: 0, dif: [], ndif: 0, linhas: 0, icones: 0, bytes: 0,
        tipos: { dono: 0, outra: 0, claude: 0, semClaude: 0, atrasada: 0, tldr: 0, etiqueta: 0, linhaSimples: 0, titulo: 0, planoClaude: 0, planoAuto: 0, etf: 0, mix: 0, orcamento: 0, percentagem: 0,
            execucao: 0, semValores: 0, prazo: 0, outros: 0, porque: 0, riscos: 0, agenda: 0, notas: 0, evitar: 0, mexe: 0, sentimento: 0, semHoje: 0,
            p1d: 0, p1w: 0, p1m: 0, p1y: 0, pOutro: 0, oSobe: 0, oDesce: 0, oBolsa: 0, oNome: 0, oMinha: 0, grupos: 0,
            meusVazio: 0, acoesVazio: 0, fundosVazio: 0, semFundos: 0, cripto: 0, retirados: 0, aberta: 0, arrastada: 0,
            fuel: 0, fuelCarrega: 0, fuelErro: 0, semConector: 0, skel: 0, hora: 0, badgeClaude: 0, badgeAuto: 0, desconto: 0, imposto: 0, litro: 0 } };
    const T = out.tipos;
    const DIA = 864e5;
    const isoDia = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
    try {
        for (let i = de; i < ate; i++) {
            const R = rng(seed + i * 7919), pick = (a) => a[Math.floor(R() * a.length)], sim = (p) => R() < p;
            const sub = (a, n) => { const b = a.slice(); for (let j = b.length - 1; j > 0; j--) { const k = Math.floor(R() * (j + 1)); [b[j], b[k]] = [b[k], b[j]]; } return b.slice(0, n); };
            const varia = () => pick([(R() - 0.5) * 20, (R() - 0.5) * 20, (R() - 0.5) * 6, 0, -0, 0.005, -0.005, 0.004999, NaN, undefined, null, 1.5, -1.5, 1, -1, 5, -5]);
            const agora = Date.now(), nowS = agora / 1000;
            // ---- a configuração ----
            const c = mk.cfg;
            const set = (k, v) => { if (v === undefined) delete c[k]; else c[k] = v; };
            set('proxy', pick(['', 'https://proxy.test', 'https://proxy.test', 'https://proxy.test']));
            set('fiat', pick(['EUR', 'EUR', 'USD']));
            set('eur', false); // o qv devolve a cotação tal e qual (as contas dos euros são do JS, antes do instantâneo)
            set('owner', pick([true, false, false]));
            set('claude', pick([true, false]));
            set('per', pick(['1d', '1d', '1w', '1m', '1y', undefined, '', 'x', 7]));
            set('sort', pick(['up', 'down', 'mkt', 'name', 'mine', 'chg', undefined, 'x']));
            set('profile', pick(['prud', 'bal', 'dyn', undefined, 'x']));
            set('strategy', pick(['etfcrypto', 'etfcrypto', 'mix', 'mix', undefined]));
            set('budget', pick([0, 900, 900, 1234.5, 0.5, NaN, undefined, '', 2.5, 99999.5, 1e21, 450]));
            set('cryptoPct', pick([0, 5, 10, 10, 15, NaN, undefined, 12.5, 100, 5e-324]));
            set('cryptoMix', pick(['btc', 'btceth', 'btceth', undefined]));
            c.saveDays = pick([[2], [2], [2, 16], [9, 23], [2, 9, 16, 23], [16]]);
            set('distrito', pick(['', '', '11', '13', undefined]));
            set('municipio', pick(['', '1316', '1312', undefined]));
            // ---- os ativos (o REG: os de sempre e os das listas, às vezes com nomes estranhos) ----
            for (const k of Object.keys(mk.REG)) delete mk.REG[k];
            const reg = (k, a) => { mk.REG[k] = { key: k, ...a }; };
            for (const [k, s, n] of CRIPTO) if (!sim(0.03)) reg(k, { kind: 'crypto', sym: pick([s, s, s, pick(ODD)]), name: pick([n, n, n, pick(ODD)]) });
            for (const [k, n, u, pl] of ENERGIA) if (!sim(0.03)) reg(k, { kind: 'energy', sym: k, name: pick([n, n, pick(ODD)]), unit: pick([u, u, u, '', pick(ODD)]), perLitre: pl ? true : undefined });
            for (const [k, n, pts, dec, unit] of INDICES) if (!sim(0.03)) reg(k, { kind: 'index', sym: k, name: n, points: pts ? true : undefined, decimals: dec, unit });
            const watch = sub(ACOES, pick([0, 1, 3, 8, 15, 23, 36]));
            const funds = sub(FUNDOS, pick([0, 1, 3, 7, 9, 9]));
            for (const k of watch) reg(k, { kind: 'stock', sym: k, name: pick([k, k, pick(NOMES), pick(NOMES), pick(ODD)]) });
            for (const k of funds) reg(k, { kind: 'fund', sym: k, name: pick([k, pick(NOMES), pick(NOMES), pick(ODD)]) });
            if (sim(0.3)) reg('TEMP1', { kind: 'stock', sym: 'TEMP1', name: 'Temporário', temp: true });
            if (sim(0.3)) reg('VWCE.MU', { kind: 'aux', sym: 'VWCE.MU', name: 'VWCE.MU' });
            c.watch = watch; c.funds = funds;
            const keys = Object.keys(mk.REG);
            c.holdings = sub(['c:BTC', 'c:ETH', 'c:SOL', 'c:XRP', 'c:BTC', 'FORA'].concat(funds, watch.slice(0, 3)), pick([0, 1, 3, 5, 5, 7])).filter((k, j, a) => a.indexOf(k) === j);
            c.hidden = sub(CRIPTO.map((x) => x[0]).concat(ENERGIA.map((x) => x[0]), INDICES.map((x) => x[0]), ['NVDA', 'FORA']), pick([0, 0, 0, 1, 2, 4]));
            set('coreFund', pick(funds.concat(['X', undefined, 'VWCE.DE'])));
            // ---- as cotações, os fechos diários (1A) e as séries de 1S e 1M ----
            for (const k of Object.keys(mk.Q)) delete mk.Q[k];
            for (const k of Object.keys(mk.D)) delete mk.D[k];
            for (const p of ['1w', '1m']) for (const k of Object.keys(mk.PS[p])) delete mk.PS[p][k];
            const serie = (n, passo, x0) => { let x = x0; return Array.from({ length: n }, (_, j) => [Math.floor(nowS - (n - j) * passo), (x *= 1 + (R() - 0.5) * 0.04)]); };
            for (const k of keys) {
                const kind = mk.REG[k].kind;
                if (sim(0.93)) mk.Q[k] = { price: sim(0.9) ? pick([1 + R() * 900, R() * 2, 10000 + R() * 90000, 0.00123, 17.2]) : pick([null, undefined, NaN, '12']), changePct: varia(),
                    currency: kind === 'crypto' ? pick([c.fiat, undefined]) : pick(MOEDAS), name: pick([undefined, undefined, pick(NOMES), pick(ODD)]),
                    time: kind === 'crypto' ? Math.floor(nowS) : pick([undefined, Math.floor(nowS - 60), Math.floor(nowS - 3600 * 5), Math.floor(nowS - 86400 * 1.2), Math.floor(nowS - 86400 * 4)]) };
                const x0 = 5 + R() * 300;
                if (sim(0.5)) mk.D[k] = serie(pick([1, 30, 260, 400]), 86400, x0);
                if (sim(0.4)) mk.PS['1w'][k] = serie(pick([1, 40, 160]), 3600, x0);
                if (sim(0.4)) mk.PS['1m'][k] = serie(pick([1, 30, 180]), 4 * 3600, x0);
            }
            if (mk.Q['^VIX']) mk.Q['^VIX'].price = pick([12, 17.2, 26, 40, 15.5, 25.5, null, NaN]);
            if (sim(0.5)) mk.Q['EURUSD=X'] = { ...(mk.Q['EURUSD=X'] || {}), price: pick([1.152, 1.08, null, 0]) };
            // ---- as análises do motor (pela ordem de Object.keys(AN), que é a do resumo automático) ----
            for (const k of Object.keys(mk.AN)) delete mk.AN[k];
            for (const k of sub(keys.concat(['FORA2']), keys.length + 1)) if (sim(0.72)) {
                const r = clone(pick(POOL));
                if (sim(0.08)) r.discount = null;
                if (sim(0.08)) r.advice = null;
                if (sim(0.12) && r.horizons) r.horizons.long = null;
                if (sim(0.25) && r.advice) r.advice.key = pick(['buy', 'scale', 'avoid', 'hold', 'wait']);
                mk.AN[k] = r;
            }
            // o ramo mais raro: ainda sem análises (o motor a compilar, sem histórico): sem o Claude, não há cartão Hoje
            if (i % 12 === 5) for (const k of Object.keys(mk.AN)) delete mk.AN[k];
            // ---- o Claude: a análise (o dono e as outras apps), a memória dos conselhos e toda a TR ----
            const tl = () => pick(['Mercado: venda em tecnologia, VIX 24.', 'Plano: manter 810 € VWCE + 90 € BTC.', 'Atenção: XRP −9%, sem reforço.', 'Sem dois pontos', 'A: curto demais', 'Muito comprido demais: x',
                'Quinze letras!!: y', 'Catorze letras: z', 'Nova\nlinha: ok', 'Mercado:\n depois', 'Mercado: a\nb', 'Mercado: a\rb', 'Mercado:    　﻿ espaços', 'Mercado: x', 'Mercado:\u0085x',
                '😀😀😀: emoji', '😀😀😀😀😀😀😀: sete emojis', '😀😀😀😀😀😀😀😀: oito', 'x:y', 'ab:', ':início', 'a:b:c', 'Tab\t: z', pick(ODD), null, undefined, 7, ['ab:c', 'd'], { a: 1 }, '<b>X</b>: <i>y</i>', 'Mer&ado: a&b', 'Já: ok']);
            const planItem = () => (sim(0.9) ? { s: pick(keys.concat(['FORA', 'PUM.DE'])), amount: pick(['810 €', '90 €', '1.234,50 €', '45€', ' 1 234 € ', '€ 45', 'abc', '', undefined, 7, '12,5,3€', '0 €', '-5 €', '810 € / mês', '1 234,5 €']),
                why: pick(['núcleo', 'cripto · todos os meses', '', undefined, pick(ODD)]), name: pick([undefined, undefined, 'Nome do Claude', pick(ODD), '']) } : pick([null, 7, 'x']));
            const acao = (s) => ({ s, key: pick(['buy', 'scale', 'hold', 'wait', 'avoid', 'sell', 'reduce', 'up', 'x', undefined]), action: pick(['Comprar', 'Comprar aos poucos', 'Manter', 'Evitar', '', undefined, pick(ODD)]),
                why: pick(['porque sim', '', undefined, pick(ODD)]), mid: pick([88, 50, 20, 76, 76, NaN, null, undefined, '60']), long: pick([81, 50, 30, 76, undefined, null]) });
            const gen = pick([new Date(agora - 3600e3).toISOString(), new Date(agora - 2 * DIA).toISOString(), new Date(agora - 20 * 60e3).toISOString(), 'lixo', undefined]);
            const doc = { headline: pick(['Mercado nervoso: manter o plano no VWCE', 'Mercado nervoso: manter o plano no VWCE', pick(ODD)]), market: pick(['Texto de mercado.', '', undefined, pick(ODD)]),
                planNote: pick(['900 € em 2 execuções', '', undefined, pick(ODD)]), tldr: pick([undefined, [], 'x', Array.from({ length: pick([1, 3, 3, 4]) }, tl)]),
                plan: pick([undefined, [], Array.from({ length: pick([1, 2, 3, 4]) }, planItem)]),
                movers: pick([undefined, [], Array.from({ length: pick([1, 2, 4]) }, () => (sim(0.9) ? { s: pick(keys.concat(['FORA', 'XYZ'])), why: pick(['Cai depois de resultados abaixo do esperado.', '', undefined, pick(ODD)]) } : pick([null, 5])))]),
                risks: pick([undefined, [], ['S&P na média de 200 dias'], [pick(ODD), null, 7]]),
                actions: pick([undefined, 'x', sub(keys.concat(['PUM.DE', 'ADA-EUR', 'ZZZ']), pick([0, 3, 12, 40])).map(acao).concat(sim(0.2) ? [null, 7] : [])]),
                generatedAt: gen, date: pick(['2026-11-06', isoDia(agora), isoDia(agora - 3 * DIA), undefined]) };
            mk.claude = pick([null, null, doc, doc, doc, doc, { missing: true, off: true }, { missing: true }, { ...doc, headline: '' }]);
            const mem = {};
            for (const k of c.holdings) if (sim(0.4)) mem[k] = { s: k, key: pick(['hold', 'buy', 'avoid', 'x']), action: pick(['Manter', 'Comprar', '', pick(ODD)]), date: isoDia(agora - Math.floor(R() * 20) * DIA) };
            localStorage.setItem('mercados:clmem', JSON.stringify(mem));
            mk.uni = pick([null, { at: Date.now(), rows: [{ s: 'PUM.DE', n: 'PUMA', t: 'stock' }, { s: 'ADA-EUR', n: 'Cardano', t: 'crypto' }, { s: 'NVDA', n: 'NVIDIA Corp', t: 'stock' }, { s: 'ZZZ', n: '', t: '' }] }, { at: Date.now(), error: 'x' }]);
            // as compras de cripto (o imposto aos 365 dias)
            c.lots = {};
            for (const k of ['c:BTC', 'c:ETH', 'c:SOL']) if (sim(0.3)) c.lots[k] = { plan: pick(['', isoDia(agora - 500 * DIA)]), buys: [{ d: isoDia(agora - pick([30, 400, 800]) * DIA), e: 100 }] };
            // ---- os combustíveis ----
            const fl = () => (sim(0.15) ? { id: 9, name: pick(['Gasóleo', pick(ODD)]), error: pick(['HTTP 500', pick(ODD)]) } : { id: pick([2101, 3201, '<x>', undefined]), name: pick(['Gasóleo simples', 'Gasolina simples 95', pick(ODD)]),
                n: pick([3012, 2987, 12345, 1, 0, null, undefined, NaN, 1e21]), avg: pick([1.611, 1.751, null]), median: pick([1.599, 1.739, 1.0005, NaN, undefined]), max: pick([1.899, 2.049, Infinity]),
                cheapest: pick([undefined, [], [null], [{ price: 1.449, name: pick(['Intermarché', '', undefined]), brand: pick(['Intermarché', 'Prio', '', undefined, 7]), place: pick(['Leiria, Leiria', '', undefined, pick(ODD)]) }]]),
                updated: pick(['2026-11-05 09:30', '', undefined, pick(ODD)]) });
            mk.fuel = pick([null, null, { fuels: [fl(), fl()] }, { fuels: [fl(), fl()] }, { fuels: [fl()] }, { fuels: [] }, {}]);
            mk.st.fuelErr = pick(['', '', 'HTTP 502', pick(ODD)]);
            mk.distritos = pick([null, [{ id: 11, name: 'Lisboa' }, { id: 13, name: pick(['Porto', pick(ODD)]) }]]);
            for (const k of Object.keys(mk.MUNIC)) delete mk.MUNIC[k];
            if (sim(0.5)) mk.MUNIC['13'] = [{ id: 1316, name: pick(['Santo Tirso', pick(ODD)]) }, { id: '1312', name: 'Porto' }];
            // ---- o arrastar e as dobras ----
            mk.st.swipe = sim(0.2) ? pick(keys) : null;
            for (const k of Object.keys(mk.st.fold)) delete mk.st.fold[k];
            for (const f of ['hoje', 'pn-idx', 'pn-en', 'pn-fuel']) if (sim(0.35)) mk.st.fold[f] = pick([true, false, 1, 0]);

            // ---- o desenho (o que é do browser — as datas da execução, a agenda, a hora da análise — vem já feito no
            // instantâneo: às vezes troca-se por valores estranhos, a vista escreve o que lá está) ----
            const snap = mk.panelSnap();
            const H = snap.hoje;
            if (sim(0.5)) H.agenda = Array.from({ length: pick([0, 1, 3, 7]) }, () => (sim(0.9) ? { k: pick([undefined, '', 'NVDA', pick(ODD)]), txt: pick(['Nvidia: apresenta resultados', 'Fed decide os juros (EUA)', pick(ODD)]), quando: pick(['12/11 · daqui a 5 dias', '08/11 · hoje', pick(ODD)]) } : null));
            if (sim(0.3)) H.ex = pick([null, { quando: pick(ODD), dl: '01/12', exec: true }, { quando: 'sábado, 7 de novembro', dl: '06/11', prazo: true }, { quando: 'x', dl: pick(ODD) }, { quando: 'terça-feira, 2 de dezembro', dl: '01/12', exec: false, prazo: false }]);
            if (sim(0.2)) H.when = pick(['', '07:16', pick(ODD), 7, null]);
            if (sim(0.2)) H.old = pick([true, false, 1, 0]);
            const html = AO.ecra.painel(snap);
            const D = new DOMParser().parseFromString(html, 'text/html');
            out.estados++; out.bytes += html.length;
            const erro = (m) => { out.ndif++; if (out.dif.length < 10) out.dif.push(`estado ${i}: ${m}`); };
            const REG = mk.REG, AN = mk.AN, Q = mk.Q, st = mk.st, C = mk.claude;
            const nameOf = (k) => (REG[k] && REG[k].name !== REG[k].sym ? REG[k].name : null) || (Q[k] && Q[k].name) || (REG[k] && REG[k].name) || k;
            const listed = (k) => !!REG[k] && !REG[k].temp && REG[k].kind !== 'aux';
            const investable = (k) => listed(k) && ['stock', 'fund', 'crypto'].includes(REG[k].kind);
            const sa = new Map(snap.assets.map((x) => [x.k, x]));
            const mine = (c.holdings || []).filter((k) => REG[k]);
            const hid = (k) => c.hidden.includes(k);
            // ---- o instantâneo: o que vai já feito do JS é o que a app sabe ----
            if (JSON.stringify(snap.mine) !== JSON.stringify(mine)) erro('instantâneo: mine');
            for (const k of keys) {
                const x = sa.get(k), q = Q[k] || {};
                if (!x) { erro(`instantâneo: falta ${k}`); continue; }
                if (x.name !== nameOf(k)) erro(`instantâneo ${k}: nome`);
                if (!Object.is(x.pc, mk.perData(k).pct)) erro(`instantâneo ${k}: pc`);
                if (x.mkt !== mktOf(k)) erro(`instantâneo ${k}: mkt`);
                const pl = REG[k].perLitre && Q[k] ? AO.usdGalToEurL(q.price, Q['EURUSD=X'] && Q['EURUSD=X'].price) : undefined;
                if (!Object.is(x.pl, pl)) erro(`instantâneo ${k}: €/L`);
                const cl = mine.includes(k) ? mk.claudeFor(k) : null;
                if (JSON.stringify(x.cl) !== JSON.stringify(cl ? { key: cl.key, action: cl.action } : cl)) erro(`instantâneo ${k}: claudeFor`);
                if (x.tax !== (mine.includes(k) && REG[k].kind === 'crypto' ? mk.taxLine(k) : undefined)) erro(`instantâneo ${k}: taxLine`);
            }
            const inv = Object.keys(AN).filter(investable);
            if (JSON.stringify(H.inv) !== JSON.stringify(inv)) erro('instantâneo: inv');

            // ---- uma linha de lista: o sw-wrap, o Retirar, a linha (data-*), o ícone, o nome, a linha de baixo, a hora, o
            // preço e a variação no período ----
            const icone = (row, k) => {
                const sy = REG[k] && REG[k].sym;
                if (REG[k].kind === 'crypto' && (typeof sy !== 'string' || /[\ud800-\udfff]/.test(sy))) return;
                const js = new DOMParser().parseFromString(mk.ico(k), 'text/html').body.firstChild, on = row.querySelector('.r-ico');
                out.icones++;
                if (!on || on.textContent !== js.textContent || on.getAttribute('style') !== js.getAttribute('style')) erro(`${k}: ícone ${on && on.outerHTML} em vez de ${js.outerHTML}`);
            };
            const linha = (w, k, md, g) => {
                out.linhas++;
                const x = sa.get(k), q = Q[k] || {}, a = REG[k];
                if (!w || w.className !== 'sw-wrap' + (st.swipe === k ? ' open' : '') || w.dataset.swk !== atr(k) || w.dataset.grp !== g) { erro(`${k}: sw-wrap ${w && w.outerHTML.slice(0, 120)}`); return; }
                if (st.swipe === k) T.arrastada++;
                const del = w.children[0], row = w.children[1];
                if (!del || del.className !== 'sw-del' || del.dataset.hide !== atr(k) || del.dataset.grp !== g || del.textContent !== 'Retirar' || del.getAttribute('tabindex') !== '-1') erro(`${k}: Retirar`);
                if (!row || row.className !== 'row' + (md === 2 ? ' wide' : '') || row.dataset.open !== atr(k) || row.dataset.key !== atr(k)) { erro(`${k}: a linha ${row && row.outerHTML.slice(0, 120)}`); return; }
                const cv = row.querySelector('canvas.spark');
                if (!cv || cv.dataset.key !== atr(k)) erro(`${k}: canvas.spark`);
                if (row.querySelector('.r-name').textContent !== txt(nameOf(k))) erro(`${k}: nome ${JSON.stringify(row.querySelector('.r-name').textContent)}`);
                icone(row, k);
                // a linha de baixo
                const sub = row.querySelector('.r-sub'), note = row.querySelector('.r-note');
                if (md === 2) {
                    const cl = x.cl, r = AN[k];
                    const badge = cl && cl.action ? [(tab(SHORT, cl.key) && lbl(cl.key, true)) || cl.action, tab(CL_TONE, cl.key) || 'flat'] : r && r.advice ? [(tab(SHORT, r.advice.key) && lbl(r.advice.key, true)) || r.advice.action, 'auto'] : null;
                    const items = [r && r.discount ? `${mk.fmtPct1(r.discount.dd * 100)} do máximo` : '', a.kind === 'crypto' ? mk.taxLine(k) : ''].filter(Boolean);
                    if (badge) T[badge[1] === 'auto' ? 'badgeAuto' : 'badgeClaude']++;
                    if (items.length && r && r.discount) T.desconto++;
                    if (a.kind === 'crypto' && mk.taxLine(k)) T.imposto++;
                    if (!!sub !== !!(badge || items.length)) erro(`${k}: a linha de baixo ${sub ? 'a mais' : 'falta'}`);
                    if (sub) {
                        const b = sub.querySelector('.badge');
                        if (badge ? !b || b.className !== 'badge ' + badge[1] || b.textContent !== txt(badge[0]) : b) erro(`${k}: o conselho ${b && b.outerHTML} em vez de ${JSON.stringify(badge)}`);
                        const nb = [...sub.querySelectorAll('.nb')].map((e) => e.textContent);
                        if (JSON.stringify(nb) !== JSON.stringify(items.map(txt))) erro(`${k}: ${JSON.stringify(nb)} em vez de ${JSON.stringify(items)}`);
                        if (sub.querySelectorAll('.dotsep').length !== Math.max(0, items.length - 1)) erro(`${k}: os separadores`);
                    }
                    if (note) erro(`${k}: r-note nos meus`);
                } else if (md === 1) {
                    const sq = a.unit ? txt('por ' + a.unit) : null;
                    if ((sub ? sub.textContent : null) !== sq) erro(`${k}: a unidade ${sub && sub.textContent} em vez de ${sq}`);
                    const nq = x.pl ? `≈ ${mk.fmtPx(x.pl, { decimals: 3 }, 'EUR')}/L sem impostos` : null;
                    if (nq) T.litro++;
                    if ((note ? note.textContent : null) !== nq) erro(`${k}: o €/L ${note && note.textContent} em vez de ${nq}`);
                } else if (sub || note) erro(`${k}: linha de baixo a mais`);
                // a hora, o preço e a variação no período
                const t = row.querySelector('.r-t');
                if ((t ? t.textContent : null) !== (x.t ? txt(x.t) : null)) erro(`${k}: a hora ${t && t.textContent} em vez de ${x.t}`);
                if (x.t) T.hora++;
                const px = row.querySelector('.r-px .px');
                const skel = q.price == null;
                if (skel) T.skel++;
                const pxq = skel ? '0000,00' : mk.fmtPx(q.price, a, q.currency);
                if (!px || px.className !== (skel ? 'px skel' : 'px') || px.textContent !== pxq) erro(`${k}: o preço ${px && px.outerHTML} em vez de ${pxq}`);
                const pc = mk.perData(k).pct, ch = row.querySelector('.r-px .chg');
                if (!ch || ch.textContent !== mk.fmtPct(pc) || ch.className !== 'chg ' + toneOf(pc)) erro(`${k}: a variação ${ch && ch.outerHTML} em vez de ${mk.fmtPct(pc)}`);
            };
            const linhas = (cont, ks, md, g, onde) => {
                const ws = cont ? [...cont.querySelectorAll(':scope > .sw-wrap')] : [];
                if (ws.map((w) => w.dataset.swk).join('\n') !== ks.map(atr).join('\n')) { erro(`${onde}: ${JSON.stringify(ws.map((w) => w.dataset.swk))} em vez de ${JSON.stringify(ks)}`); return; }
                ws.forEach((w, j) => linha(w, ks[j], md, g));
            };
            const pe = (sec, ad, u, n, onde) => {
                const f = sec.querySelector(':scope > .sec-f');
                const quer = ad || n ? [ad ? ['+ Juntar', 'act', ad] : null, n ? [`Repor ${n}`, 'unhide', u] : null].filter(Boolean) : null;
                const tem = f ? [...f.querySelectorAll('button.lnk')].map((b) => [b.textContent, b.dataset.act ? 'act' : 'unhide', b.dataset.act || b.dataset.unhide]) : null;
                if (JSON.stringify(tem) !== JSON.stringify(quer)) erro(`${onde}: o rodapé ${JSON.stringify(tem)} em vez de ${JSON.stringify(quer)}`);
                if (n) T.retirados++;
            };
            // ---- a ordem dos blocos ----
            const cv = !!(C && !C.missing && C.headline);
            const filhos = [...D.body.children];
            const blocos = filhos.map((e) => (e.tagName === 'SECTION' ? e.querySelector('h2').textContent : e.dataset.fold));
            const cripto = CRIPTO.map((x) => x[0]), crypt = cripto.filter((k) => REG[k] && !mine.includes(k) && !hid(k)), nhc = cripto.filter(hid).length;
            const fundos = funds.filter((k) => REG[k] && !mine.includes(k));
            const querBlocos = ['Os meus ativos', inv.length || cv ? 'hoje' : null, crypt.length || nhc ? 'Cripto' : null, fundos.length || !funds.length ? 'Fundos e ETF' : null, 'Ações que sigo', 'pn-idx', 'pn-en', c.proxy ? 'pn-fuel' : null].filter(Boolean);
            if (JSON.stringify(blocos) !== JSON.stringify(querBlocos)) erro(`os blocos ${JSON.stringify(blocos)} em vez de ${JSON.stringify(querBlocos)}`);
            const sec = (t) => filhos.find((e) => e.tagName === 'SECTION' && e.querySelector('h2').textContent === t);
            const dob = (f) => filhos.find((e) => e.tagName === 'DETAILS' && e.dataset.fold === f);
            // ---- os meus ativos e o período ----
            const sm = sec('Os meus ativos');
            if (sm) {
                const pr = [...sm.querySelectorAll('.sec-h .seg.per button')].map((b) => [b.dataset.per, b.textContent, b.className]);
                const p = c.per || '1d';
                T[p === '1d' ? 'p1d' : p === '1w' ? 'p1w' : p === '1m' ? 'p1m' : p === '1y' ? 'p1y' : 'pOutro']++;
                const prq = [['1d', '1D'], ['1w', '1S'], ['1m', '1M'], ['1y', '1A']].map(([v, l]) => [v, l, p === v ? 'on' : '']);
                if (JSON.stringify(pr) !== JSON.stringify(prq)) erro(`o período ${JSON.stringify(pr)}`);
                const l = sm.querySelector(':scope > .list.sw-list'), e = sm.querySelector(':scope > .empty');
                if (mine.length ? !l || e : l || !e || e.textContent !== 'Escolhe em Ajustes → O que tenho.') erro('os meus: a lista ou o vazio');
                if (!mine.length) T.meusVazio++;
                linhas(l, mine, 2, 'hold', 'os meus');
                pe(sm, 'go-hold', null, 0, 'os meus');
            }
            // ---- a cripto e os fundos ----
            const sc = sec('Cripto');
            if (sc) { T.cripto++; linhas(sc.querySelector(':scope > .list.sw-list'), crypt, 1, 'fixed', 'cripto'); pe(sc, null, 'crypto', nhc, 'cripto'); }
            const sf = sec('Fundos e ETF');
            if (sf) {
                const e = sf.querySelector(':scope > .empty');
                if (fundos.length ? e : !e || e.textContent !== 'Sem fundos. Junta em Ajustes (ex.: VWCE, IWDA).') erro('fundos: o vazio');
                if (!fundos.length) T.fundosVazio++;
                if (fundos.length) linhas(sf.querySelector(':scope > .list.sw-list'), fundos, 1, 'list', 'fundos');
                pe(sf, 'go-add', null, 0, 'fundos');
            } else T.semFundos++;
            // ---- as ações: a ordem escolhida (o sort do browser, com o comparador de sempre) e os grupos por bolsa ----
            const sx = sec('Ações que sigo');
            if (sx) {
                const sortBy = c.sort === 'chg' ? 'up' : c.sort;
                T[sortBy === 'up' ? 'oSobe' : sortBy === 'down' ? 'oDesce' : sortBy === 'mkt' ? 'oBolsa' : sortBy === 'name' ? 'oNome' : 'oMinha']++;
                const ch = [...sx.querySelectorAll('.chips.sort button')].map((b) => [b.dataset.sort, b.textContent, b.className]);
                const chq = [['up', '↑ Sobe'], ['down', '↓ Desce'], ['mkt', 'Bolsa'], ['name', 'Nome'], ['mine', 'Minha']].map(([v, l]) => [v, l, sortBy === v ? 'on' : '']);
                if (JSON.stringify(ch) !== JSON.stringify(chq)) erro(`a ordem: ${JSON.stringify(ch)}`);
                const st0 = watch.filter((k) => REG[k]);
                const pc = (k) => { const v = mk.perData(k).pct; return fin(v) ? v : null; };
                if (sortBy === 'up' || sortBy === 'mkt') st0.sort((a, b) => (pc(b) ?? -1e9) - (pc(a) ?? -1e9));
                else if (sortBy === 'down') st0.sort((a, b) => (pc(a) ?? 1e9) - (pc(b) ?? 1e9));
                else if (sortBy === 'name') st0.sort((a, b) => nameOf(a).localeCompare(nameOf(b), 'pt'));
                const e = sx.querySelector(':scope > .empty');
                if (st0.length ? e : !e || e.textContent !== 'Sem ações na lista. Junta em Ajustes.') erro('ações: o vazio');
                if (!st0.length) T.acoesVazio++;
                if (st0.length && sortBy === 'mkt') {
                    const g = {};
                    for (const k of st0) (g[mktOf(k)] = g[mktOf(k)] || []).push(k);
                    const ord = snap.mktOrder.filter((m) => g[m]).concat(Object.keys(g).filter((m) => !snap.mktOrder.includes(m)));
                    const hs = [...sx.querySelectorAll(':scope > .grp-h')], ls = [...sx.querySelectorAll(':scope > .list.sw-list')];
                    if (JSON.stringify(hs.map((h) => h.textContent)) !== JSON.stringify(ord.map((m) => m + g[m].length))) erro(`ações: os grupos ${JSON.stringify(hs.map((h) => h.textContent))} em vez de ${JSON.stringify(ord)}`);
                    else { T.grupos++; ord.forEach((m, j) => { if (hs[j].querySelector('small').textContent !== String(g[m].length)) erro('ações: o número do grupo'); linhas(ls[j], g[m], 0, 'list', 'ações ' + m); }); }
                } else if (st0.length) {
                    if (sx.querySelector('.grp-h')) erro('ações: grupos fora da bolsa');
                    linhas(sx.querySelector(':scope > .list.sw-list'), st0, 0, 'list', 'ações');
                }
                pe(sx, 'go-add', null, 0, 'ações');
            }
            // ---- as linhas fechadas no fim: o resumo (os três primeiros com a variação no período) e as linhas ----
            const resumo = (ks) => ks.filter((k) => fin(mk.perData(k).pct)).slice(0, 3).map((k) => `${nameOf(k)} ${mk.fmtPct(mk.perData(k).pct)}`).join(' · ');
            const fecha = (f, titulo, todos, md, u) => {
                const d = dob(f);
                if (!d) return;
                const ks = todos.filter((k) => REG[k] && !hid(k)), sm1 = d.querySelector('summary .f-t small');
                if (d.className !== 'an-f pn-f' || d.querySelector('summary .f-t').firstChild.textContent !== titulo) erro(`${f}: o título`);
                if ((sm1 ? sm1.textContent : '') !== txt(resumo(ks))) erro(`${f}: o resumo ${JSON.stringify(sm1 && sm1.textContent)} em vez de ${JSON.stringify(resumo(ks))}`);
                if (sm1) for (const s of sm1.querySelectorAll('span')) if (!/^(up|down|flat)-t$/.test(s.className)) erro(`${f}: a cor no resumo`);
                if (d.hasAttribute('open') !== vverd(st.fold[f])) erro(`${f}: aberta/fechada`);
                if (d.hasAttribute('open')) T.aberta++;
                linhas(d.querySelector(':scope > .list.sw-list'), ks, md, 'fixed', f);
                pe(d, null, u, todos.filter(hid).length, f);
            };
            fecha('pn-idx', 'Índices, câmbio e ouro', INDICES.map((x) => x[0]), 0, 'index');
            fecha('pn-en', 'Petróleo e energia', ENERGIA.map((x) => x[0]), 1, 'energy');
            // ---- os combustíveis ----
            const df = dob('pn-fuel');
            if (!c.proxy) T.semConector++;
            if (df) {
                const F = mk.fuel, fu = F && F.fuels;
                const dn = c.distrito && mk.distritos ? (mk.distritos.find((d) => String(d.id) === String(c.distrito)) || {}).name : '';
                const mn = c.municipio && mk.MUNIC[c.distrito] ? (mk.MUNIC[c.distrito].find((m) => String(m.id) === String(c.municipio)) || {}).name : '';
                if (df.querySelector('summary .f-t').firstChild.textContent !== 'Combustíveis em ' + txt(mn || dn || 'Portugal')) erro('combustíveis: o título');
                if (df.hasAttribute('open') !== vverd(st.fold['pn-fuel'])) erro('combustíveis: aberta/fechada');
                const smf = df.querySelector('summary small');
                if (!F || !fu) {
                    T[st.fuelErr ? 'fuelErro' : 'fuelCarrega']++;
                    if (!smf || smf.textContent !== (st.fuelErr ? 'Indisponível' : 'A carregar…')) erro('combustíveis: o resumo sem preços');
                    const e = df.querySelector('.empty');
                    if (!e || e.textContent !== (st.fuelErr ? 'Não deu para ler a DGEG: ' + txt(st.fuelErr) : 'A carregar os preços da DGEG…')) erro('combustíveis: o aviso');
                } else {
                    T.fuel++;
                    const ok = fu.filter((f) => isObj(f) && !f.error);
                    const rq = ok.map((f) => `${f.name ?? ''} ${mk.fmtPx(f.median, { decimals: 3 }, 'EUR')}`).join(' · ');
                    if ((smf ? smf.textContent : '') !== txt(rq)) erro(`combustíveis: o resumo ${JSON.stringify(smf && smf.textContent)} em vez de ${JSON.stringify(rq)}`);
                    const NF = new Intl.NumberFormat('pt-PT'), e3 = (v) => mk.fmtPx(v, { decimals: 3 }, 'EUR');
                    const cards = [...df.querySelectorAll('.grid > .card.fuel')], fs = fu.filter(isObj);
                    if (cards.length !== fs.length) erro(`combustíveis: ${cards.length} cartões em vez de ${fs.length}`);
                    else fs.forEach((f, j) => {
                        const el = cards[j];
                        if (f.error) { if (el.tagName !== 'DIV' || el.querySelector('.c-name').textContent !== txt(f.name) || el.querySelector('.c-sub').textContent !== txt(f.error)) erro('combustíveis: o cartão com erro'); return; }
                        const c0 = Array.isArray(f.cheapest) && f.cheapest[0];
                        const quer = `${f.name ?? ''}${e3(f.median)}/Lmediana · média ${e3(f.avg)}${NF.format(f.n)} postos · máx. ${e3(f.max)}` +
                            (c0 ? `Mais barato: ${e3(c0.price)}${[c0.brand, c0.name].filter(Boolean).join(' — ')}${c0.place ? String(c0.place) : ''}` : '') + `Ver os ${NF.format(f.n)} postos ›`;
                        if (el.tagName !== 'BUTTON' || el.dataset.fuel !== atr(`${f.id}`) || el.getAttribute('aria-label') !== atr('Ver os preços nos postos: ' + (f.name ?? ''))) erro(`combustíveis: o botão ${el.outerHTML.slice(0, 160)}`);
                        if (el.textContent !== txt(quer)) erro(`combustíveis: o cartão ${JSON.stringify(el.textContent)} em vez de ${JSON.stringify(quer)}`);
                    });
                    const nt = df.querySelector('p.note');
                    const ntq = `Fonte: DGEG — Preços dos Combustíveis Online. Preço mediano por litro${mn ? ' no concelho de ' + mn : dn ? ' no distrito de ' + dn : ' em Portugal'}${fu[0] && fu[0].updated ? ' · última atualização ' + fu[0].updated : ''}.`;
                    if (!nt || nt.textContent !== txt(ntq)) erro(`combustíveis: a nota ${nt && JSON.stringify(nt.textContent)}`);
                }
            }

            // ---- o cartão Hoje: as regras do todayCard e do briefParts de antes ----
            const V = (k) => Q[k] || {};
            const adv = (k) => (AN[k] && AN[k].advice) || { key: '', action: '' };
            const L = (k) => (AN[k].horizons.long || AN[k].horizons.mid).score;
            const PROFILES = { prud: ['Prudente', 0.9, 0.1, 0], bal: ['Equilibrado', 0.7, 0.2, 0.1], dyn: ['Dinâmico', 0.55, 0.3, 0.15] };
            const B = +c.budget || 0, nE = Math.max(1, c.saveDays.length), etf = c.strategy !== 'mix';
            const amt = (f) => (B ? mk.fmtPx(B * f, { decimals: 0 }, 'EUR') : Math.round(f * 100) + '%');
            const amtX = (f) => (B ? mk.fmtPx(B / nE * f, { decimals: 0 }, 'EUR') : Math.round(f * 100) + '%');
            let b = null;
            if (inv.length) {
                const movers = inv.filter((k) => fin(V(k).changePct)).sort((x, y) => V(y).changePct - V(x).changePct);
                const up = movers.slice(0, 2).filter((k) => V(k).changePct > 1), dn = movers.slice(-2).reverse().filter((k) => V(k).changePct < -1);
                const [pName, , pSat, pCry] = tab(PROFILES, c.profile) || PROFILES.bal;
                const funds0 = inv.filter((k) => REG[k].kind === 'fund' && L(k) >= 50).sort((x, y) => (y === 'VWCE.DE') - (x === 'VWCE.DE') || L(y) - L(x));
                let core = funds0[0];
                const sats = inv.filter((k) => k !== core && REG[k].kind !== 'crypto' && ['buy', 'scale'].includes(adv(k).key))
                    .sort((x, y) => (adv(y).key === 'scale' ? (AN[y].discount || {}).score : L(y)) - (adv(x).key === 'scale' ? (AN[x].discount || {}).score : L(x))).slice(0, 2);
                const cryp = ['c:BTC', 'c:ETH'].filter((k) => AN[k] && REG[k] && ['buy', 'scale'].includes(adv(k).key));
                const avoid = inv.filter((k) => adv(k).key === 'avoid').sort((x, y) => L(x) - L(y)).slice(0, 4);
                let cS = sats.length ? pSat : 0, cC = cryp.length ? pCry : 0, cCore = 1 - cS - cC;
                const notes = [];
                if (!etf) {
                    if (!sats.length && pSat) notes.push('Sem ações em boa altura: a parte dos satélites fica no núcleo este mês.');
                    if (!cryp.length && pCry) notes.push('Cripto sem sinal de compra: essa parte fica no núcleo este mês.');
                }
                if (etf) {
                    core = REG[c.coreFund] ? c.coreFund : core;
                    sats.length = 0; cS = 0;
                    cryp.length = 0; cryp.push(...(c.cryptoMix === 'btceth' ? ['c:BTC', 'c:ETH'] : ['c:BTC']));
                    cC = (+c.cryptoPct || 0) / 100; cCore = 1 - cC;
                    if (!cC) cryp.length = 0;
                }
                const cShare = (k) => (c.cryptoMix === 'btceth' && cryp.length === 2 ? cC * (k === 'c:BTC' ? 0.7 : 0.3) : cC / cryp.length);
                const lines = [];
                if (core) lines.push([core, cCore, `núcleo · ${adv(core).action.toLowerCase()}`]);
                sats.forEach((k) => lines.push([k, cS / sats.length, `satélite · ${adv(k).action.toLowerCase()}`]));
                cryp.forEach((k) => lines.push([k, cShare(k), etf ? 'cripto · todos os meses, manter ≥ 1 ano' : `cripto · ${adv(k).action.toLowerCase()}`]));
                const nm = (k) => (REG[k] ? nameOf(k) : k);
                b = { up, dn, avoid, notes, lines, nm,
                    exec: lines.map(([k, f]) => `${amtX(f)} ${nm(k)}`).join(' + '),
                    planSub: `${etf ? `ETF + cripto (${100 - (+c.cryptoPct || 0)}/${+c.cryptoPct || 0})` : 'perfil ' + pName.toLowerCase()}${B ? ` · ${mk.fmtPx(B, { decimals: 0 }, 'EUR')}/mês` : ' · define o valor em Ajustes'}` };
            }
            const dh = dob('hoje');
            if (!!dh !== !!(b || cv)) erro('o cartão Hoje: ' + (dh ? 'a mais' : 'falta'));
            if (!dh) T.semHoje++;
            if (dh) {
                if (c.owner) T.dono++; else T.outra++;
                T[cv ? 'claude' : 'semClaude']++;
                if (dh.className !== 'today' || dh.hasAttribute('open') !== vverd(st.fold.hoje)) erro('Hoje: aberto/fechado');
                const sum = dh.querySelector(':scope > summary');
                // de onde vem
                const src = sum.querySelector('.hj-t > .hj-src');
                const claudeOn = !!(c.owner || c.claude);
                const srcq = cv ? `Claude${vverd(H.when) ? ' · ' + txt(H.when) : ''}${vverd(H.old) ? ' · atrasada' : ''}`
                    : `Resumo automático${!claudeOn ? '' : C && C.off ? ' · análise do Claude em pausa' : ' · a análise do Claude chega às 07:14 e 15:14'}`;
                if (cv && vverd(H.old)) T.atrasada++;
                if (sum.querySelector('.hj-t').firstChild.textContent !== 'Hoje' || !src || src.textContent !== srcq || src.className !== (cv ? 'hj-src cl' : 'hj-src')) erro(`Hoje: a fonte ${src && src.outerHTML} em vez de ${srcq}`);
                // as 3 linhas do Claude (o regex de sempre), ou o título dele
                const tls = [...sum.querySelectorAll('.tldr > .tl')];
                if (cv) {
                    const tld = Array.isArray(C.tldr) && C.tldr.length ? C.tldr : null;
                    T[tld ? 'tldr' : 'titulo']++;
                    const quer = tld ? tld.map((t) => { const m = /^([^:]{2,14}):\s*(.*)$/.exec(t); return m ? [txt(m[1]) + ':', txt(m[1]) + ': ' + txt(m[2])] : [null, txt(t)]; }) : [[null, txt(C.headline)]];
                    const tem = tls.map((e) => [e.querySelector('b') ? e.querySelector('b').textContent : null, e.textContent]);
                    for (const [bq] of quer) T[bq ? 'etiqueta' : 'linhaSimples']++;
                    if (JSON.stringify(tem) !== JSON.stringify(quer)) erro(`Hoje: as linhas ${JSON.stringify(tem)} em vez de ${JSON.stringify(quer)}`);
                } else if (sum.querySelector('.tldr')) erro('Hoje: linhas do Claude sem o Claude');
                // a próxima execução, com os valores (do plano do Claude ou do automático)
                const cplan = cv && Array.isArray(C.plan) && C.plan.length ? C.plan : null;
                const execTxt = cplan ? cplan.filter(isObj).map((p) => [p.s, eurNum(p.amount) / nE]).filter(([, v]) => fin(v) && v > 0).map(([s, v]) => `${mk.fmtPx(v, { decimals: 0 }, 'EUR')} ${nameOf(s)}`).join(' + ') : b ? b.exec : '';
                const ex = sum.querySelector('.hj-ex'), X = H.ex;
                if (!!ex !== vverd(X)) erro('Hoje: a execução ' + (ex ? 'a mais' : 'falta'));
                if (ex && X) {
                    T.execucao++;
                    if (vverd(X.prazo)) T.prazo++;
                    const tit = vverd(X.exec) ? 'Hoje executam os planos' : vverd(X.prazo) ? 'Hoje é o último dia para ajustar os planos' : 'Próxima execução';
                    const et = ex.querySelector('.ex-t'), ea = ex.querySelector('.ex-a');
                    if (ex.className !== 'hj-ex' + (vverd(X.prazo) ? ' hot' : '') || !et || et.textContent !== `${tit}: ${txt(X.quando)}` || et.querySelector('b').textContent !== txt(X.quando)) erro(`Hoje: a execução ${ex.outerHTML.slice(0, 200)}`);
                    if ((ea ? ea.textContent : '') !== txt(execTxt)) erro(`Hoje: os valores ${JSON.stringify(ea && ea.textContent)} em vez de ${JSON.stringify(execTxt)}`);
                    if (!execTxt) T.semValores++;
                }
                // a dobra: bloco a bloco
                const fold = [...dh.querySelector(':scope > .hj-in').children];
                const quer = [];
                const mood = b ? H.mood : null;
                if (b && mood) T.sentimento++;
                const idx = [['S&P 500', 0], ['Nasdaq', 1], ['Euro Stoxx 50', 2], ['PSI', 3]].filter(([, j]) => fin(H.ind[j])).map(([n, j]) => `${n} ${mk.fmtPct(H.ind[j])}`);
                const vx = H.vix, head = b ? idx.concat(fin(vx) ? [`VIX ${Math.round(vx)}${vx > 25 ? ' (medo)' : vx < 16 ? ' (calma)' : ''}`] : []).join(' · ') : '';
                if (mood || head) quer.push(['P.t-mk', (mood ? txt(mood.label) + (head ? ' · ' : '') : '') + head]);
                if (cv) {
                    if (Array.isArray(C.tldr) && C.tldr.length) quer.push(['DIV.cl-head', txt(C.headline)]);
                    if (C.market) quer.push(['P', txt(C.market)]);
                } else if (mood) quer.push(['P.muted', txt(mood.hint)]);
                if (!cv && b && (b.up.length || b.dn.length)) {
                    T.mexe++;
                    quer.push(['P', (b.up.length ? 'Sobem: ' + b.up.map((k) => `${txt(nameOf(k))} ${mk.fmtPct(V(k).changePct)}`).join(', ') : '') + (b.dn.length ? 'Caem: ' + b.dn.map((k) => `${txt(nameOf(k))} ${mk.fmtPct(V(k).changePct)}`).join(', ') : '')]);
                }
                // o plano do mês: o do Claude; o automático só sem ele
                let pt = 'Plano do mês na Trade Republic' + (cv && C.planNote ? txt(C.planNote) : b ? b.planSub : '');
                const itens = [];
                if (cplan) { T.planoClaude++; for (const p of cplan.filter(isObj)) itens.push([REG[p.s] ? 'BUTTON' : 'DIV', REG[p.s] ? atr(p.s) : null, txt(p.name || nameOf(p.s)) + txt(p.why || '') + txt(p.amount || '')]); }
                else if (b) {
                    T.planoAuto++; T[etf ? 'etf' : 'mix']++; T[B ? 'orcamento' : 'percentagem']++;
                    for (const [k, f, extra] of b.lines) itens.push(['BUTTON', atr(k), txt(b.nm(k)) + txt(extra) + amt(f)]);
                }
                for (const it of itens) pt += it[2];
                if (X) {
                    const aj = !vverd(X.exec) && !vverd(X.prazo);
                    pt += (aj || nE > 1 ? (aj ? `Ajustar até ${txt(X.dl)}` : '') + (aj && nE > 1 ? ' · ' : '') + (nE > 1 ? `${nE} execuções por mês` : '') : '') + 'Lembretes no calendário';
                }
                quer.push(['DIV.i-blk.plan-blk', pt, (el) => {
                    const its = [...el.querySelectorAll(':scope > .idea')].map((e) => [e.tagName, e.dataset.open ?? null, e.textContent]);
                    if (JSON.stringify(its) !== JSON.stringify(itens)) erro(`Hoje: os itens do plano ${JSON.stringify(its)} em vez de ${JSON.stringify(itens)}`);
                    const exb = el.querySelector('.exec');
                    if (X ? !exb || exb.className !== 'exec' + (vverd(X.prazo) ? ' hot' : '') || !exb.querySelector('[data-act="ics"]') : exb) erro('Hoje: a caixa da execução');
                }]);
                if (cv) {
                    // fora do que tenho: as ideias de maior convicção do Claude
                    const rest = Array.isArray(C.actions) ? C.actions.filter((a) => isObj(a) && !mine.includes(a.s)) : [];
                    const pull = (a) => { const m = (fin(a.mid) ? a.mid : 50) + (fin(a.long) ? a.long : 50); return ['buy', 'scale'].includes(a.key) ? m : ['sell', 'reduce'].includes(a.key) ? 200 - m : -1; };
                    const others = rest.some((a) => fin(a.mid)) ? rest.filter((a) => pull(a) >= 0).sort((x, y) => pull(y) - pull(x)).slice(0, 6) : rest.slice(0, 6);
                    const U = mk.uni && Array.isArray(mk.uni.rows) ? mk.uni.rows : [], uRow = (s) => U.find((x) => x && x.s === s) || {};
                    const oName = (s) => (REG[s] ? nameOf(s) : uRow(s).n || s);
                    if (others.length) {
                        T.outros++;
                        quer.push(['DIV.i-blk', 'Também a seguir' + others.map((a) => txt(oName(a.s)) + txt(a.why || '') + txt(a.action || '')).join(''), (el) => {
                            const bs = [...el.querySelectorAll('.idea')];
                            others.forEach((a, j) => {
                                const e = bs[j];
                                if (!e || e.dataset.open !== atr(a.s) || e.dataset.name !== atr(oName(a.s)) || e.dataset.ut !== atr(uRow(a.s).t || '') || e.querySelector('.i-t').className !== `i-t ${tab(CL_TONE, a.key) || 'flat'}-t`) erro(`Hoje: a ideia ${a.s} ${e && e.outerHTML.slice(0, 200)}`);
                            });
                        }]);
                    }
                    if (Array.isArray(C.movers) && C.movers.length) {
                        T.porque++;
                        const ms = C.movers.filter(isObj);
                        quer.push(['DIV.i-blk', 'Porque sobem ou descem' + ms.map((m) => txt(REG[m.s] ? nameOf(m.s) : m.s) + txt(m.why) + (REG[m.s] && fin(V(m.s).changePct) ? mk.fmtPct(V(m.s).changePct) : '')).join(''), (el) => {
                            const bs = [...el.querySelectorAll('.idea')];
                            ms.forEach((m, j) => { const e = bs[j]; if (!e || e.className !== 'idea why' || e.tagName !== (REG[m.s] ? 'BUTTON' : 'DIV') || (REG[m.s] && e.dataset.open !== atr(m.s))) erro(`Hoje: o porquê de ${m.s}`); });
                        }]);
                    }
                    if (Array.isArray(C.risks) && C.risks.length) { T.riscos++; quer.push(['DIV.i-blk', 'Riscos a vigiar' + C.risks.map(txt).join('')]); }
                }
                const ag = Array.isArray(H.agenda) ? H.agenda : [];
                if (ag.length) {
                    T.agenda++;
                    const ais = ag.filter(isObj);
                    quer.push(['DIV.i-blk', 'Agenda — próximos 14 dias' + ais.map((e) => txt(e.txt) + txt(e.quando)).join(''), (el) => {
                        const bs = [...el.querySelectorAll('.idea')];
                        ais.forEach((e, j) => { const x = bs[j]; if (!x || x.tagName !== (e.k ? 'BUTTON' : 'DIV') || (e.k && x.dataset.open !== atr(e.k))) erro('Hoje: a agenda'); });
                    }]);
                }
                if (b) {
                    for (const n of b.notes) { T.notas++; quer.push(['P.note', n]); }
                    if (!cv && b.avoid.length) { T.evitar++; quer.push(['P.note', `Evitar por agora: ${b.avoid.map((k) => txt(nameOf(k))).join(', ')}.`]); }
                }
                const tem = fold.map((e) => [e.tagName + (e.className ? '.' + e.className.split(' ').join('.') : ''), e.textContent]);
                if (JSON.stringify(tem) !== JSON.stringify(quer.map((q) => [q[0], q[1]]))) erro(`Hoje: a dobra ${JSON.stringify(tem).slice(0, 900)}\n   em vez de ${JSON.stringify(quer.map((q) => [q[0], q[1]])).slice(0, 900)}`);
                else quer.forEach((q, j) => { if (q[2]) q[2](fold[j]); });
            }
            // nada do que vem nos dados vira HTML; e nada de parágrafos fora das linhas que abrem
            if (D.querySelector('script, img, iframe, .row b, .r-name *')) erro('HTML dos dados no ecrã');
            if ([...D.querySelectorAll('.note, p')].some((e) => !e.closest('details'))) erro('um parágrafo fora das linhas que abrem');
        }
    } finally {
        for (const [o, a] of [[mk.REG, real.REG], [mk.AN, real.AN], [mk.Q, real.Q], [mk.D, real.D], [mk.PS['1w'], real.PS['1w']], [mk.PS['1m'], real.PS['1m']], [mk.MUNIC, real.munic]]) { for (const k of Object.keys(o)) delete o[k]; for (const [k, v] of a) o[k] = v; }
        for (const k of Object.keys(mk.cfg)) delete mk.cfg[k];
        Object.assign(mk.cfg, real.cfg);
        for (const k of Object.keys(mk.st.fold)) delete mk.st.fold[k];
        Object.assign(mk.st.fold, real.fold); mk.st.swipe = real.swipe; mk.st.fuelErr = real.fuelErr;
        mk.claude = real.claude; mk.uni = real.uni; mk.fuel = real.fuel; mk.distritos = real.dist;
        if (real.clmem === null) localStorage.removeItem('mercados:clmem'); else localStorage.setItem('mercados:clmem', real.clmem);
    }
    return out;
}

test(`Painel: as listas, cada linha, a ordem, o cartão Hoje e as linhas fechadas certos em ${ESTADOS} estados`, async () => {
    const tot = { estados: 0, ndif: 0, dif: [], linhas: 0, icones: 0, tipos: {}, bytes: 0 };
    for (let de = 0; de < ESTADOS; de += 50) {
        const r = await page.evaluate(verificar, { de, ate: Math.min(ESTADOS, de + 50), seed: 4909 });
        tot.estados += r.estados; tot.ndif += r.ndif; tot.linhas += r.linhas; tot.icones += r.icones; tot.bytes += r.bytes;
        for (const [k, v] of Object.entries(r.tipos)) tot.tipos[k] = (tot.tipos[k] || 0) + v;
        tot.dif.push(...r.dif);
    }
    for (const d of tot.dif.slice(0, 10)) console.log('  ' + d);
    console.log(`# ${tot.estados} estados, ${tot.linhas} linhas e ${tot.icones} ícones conferidos (${(tot.bytes / tot.estados / 1024).toFixed(1)} KB de HTML em média) — ${JSON.stringify(tot.tipos)}`);
    assert.equal(tot.ndif, 0, `${tot.ndif} diferenças`);
    assert.equal(tot.estados, ESTADOS);
    // cobertura: os ramos todos apareceram muitas vezes
    for (const [k, v] of Object.entries(tot.tipos)) assert.ok(v >= ESTADOS / 40, `poucos estados do tipo ${k}: ${v}`);
    assert.deepEqual(erros, []);
});

test('Painel: a app desenha-o com a Onda (e, se a Onda falhar, um aviso curto); a vista não mexe no estado', async () => {
    const r = await page.evaluate(() => {
        const mk = window.__mk, ecra = window.AnaliseOnda.ecra, orig = ecra.painel;
        let n = 0;
        ecra.painel = (s) => { n++; return orig(s); };
        mk.cfg.tab = 'painel';
        const cfg0 = localStorage.getItem('mercados:v1');
        mk.render();
        const html = document.querySelector('#mk-body').innerHTML, usou = n, igual = localStorage.getItem('mercados:v1') === cfg0;
        ecra.painel = () => { throw new Error('teste'); };
        const ce = console.error; let logs = 0; console.error = () => { logs++; };
        const p = mk.cfg.proxy; mk.cfg.proxy = 'https://proxy.test';
        const recurso = mk.panelHtml();
        mk.cfg.proxy = p;
        console.error = ce; ecra.painel = orig;
        mk.render();
        return { usou, temLista: html.includes('<h2>Os meus ativos</h2>'), recurso, logs, igual, seen: 'seen' in mk.cfg };
    });
    assert.ok(r.usou >= 1, 'o render do Painel chamou a Onda');
    assert.ok(r.temLista, 'as listas estão no ecrã');
    assert.equal(r.recurso, '<div class="empty">Não deu para mostrar o painel.</div>', 'sem a vista da Onda, um aviso');
    assert.equal(r.logs, 1, 'e o erro na consola');
    assert.ok(r.igual, 'desenhar não grava a configuração (o firstView saiu)');
    assert.equal(r.seen, false, 'sem o cfg.seen');
});

test('Painel: desempenho (mediana de 50 desenhos no Chromium)', async () => {
    const r = await page.evaluate(() => {
        const mk = window.__mk, AO = window.AnaliseOnda;
        const med = (f) => { const t = []; for (let i = 0; i < 60; i++) { const a = performance.now(); for (let j = 0; j < 10; j++) f(); t.push((performance.now() - a) / 10); } t.splice(0, 10); t.sort((x, y) => x - y); return t[25]; };
        // a app com as listas por omissão (23 ações, 7 fundos, 4 cripto, os futuros e os índices), cada ativo com a cotação
        // e a análise do motor; a análise do Claude (3 linhas, o plano, as ideias, os motivos, os riscos) e os combustíveis
        let s = 13;
        const R = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
        const pool = window.__pnPool || AO.analyseMany(Array.from({ length: 60 }, () => { let x = 100; return { closes: Array.from({ length: 300 }, () => (x *= 1 + (R() - 0.49) * 0.03)), opts: { kind: 'stock' } }; })).filter(Boolean);
        const antes = { cfg: JSON.parse(JSON.stringify(mk.cfg)), claude: mk.claude, fuel: mk.fuel, AN: Object.entries(mk.AN), Q: Object.entries(mk.Q) };
        const keys = Object.keys(mk.REG).filter((k) => !mk.REG[k].temp && mk.REG[k].kind !== 'aux');
        keys.forEach((k, j) => {
            mk.AN[k] = JSON.parse(JSON.stringify(pool[j % pool.length]));
            mk.Q[k] = { ...(mk.Q[k] || {}), currency: 'EUR', price: 10 + R() * 500, changePct: (R() - 0.5) * 8 };
        });
        mk.claude = { headline: 'Mercado nervoso: manter o plano no VWCE', market: 'Texto de mercado.', planNote: '900 € em 2 execuções', generatedAt: new Date().toISOString(),
            tldr: ['Mercado: venda em tecnologia, VIX 24.', 'Plano: manter 810 € VWCE + 90 € BTC.', 'Atenção: XRP −9%, sem reforço.'], plan: [{ s: 'VWCE.DE', amount: '810 €', why: 'núcleo' }, { s: 'c:BTC', amount: '90 €', why: 'cripto' }],
            movers: keys.slice(0, 3).map((k) => ({ s: k, why: 'Sobe com resultados acima do esperado.' })), risks: ['S&P na média de 200 dias'],
            actions: keys.map((k, j) => ({ s: k, key: ['buy', 'hold', 'avoid', 'scale'][j % 4], action: 'Comprar', why: 'Porque sim.', mid: 40 + j % 50, long: 30 + j % 60 })) };
        mk.fuel = { fuels: [{ id: 2101, name: 'Gasóleo simples', n: 3012, avg: 1.611, median: 1.599, max: 1.899, cheapest: [{ price: 1.449, name: 'Intermarché', brand: 'Intermarché', place: 'Leiria, Leiria' }], updated: '2026-11-05 09:30' },
            { id: 3201, name: 'Gasolina simples 95', n: 2987, avg: 1.751, median: 1.739, max: 2.049, cheapest: [{ price: 1.589, name: 'Prio Torres Novas', brand: 'Prio', place: 'Torres Novas, Santarém' }], updated: '2026-11-05 09:30' }] };
        Object.assign(mk.cfg, { proxy: 'https://proxy.test', owner: true, budget: 900, sort: 'up', per: '1d' });
        const snap = mk.panelSnap(), html = AO.ecra.painel(snap);
        const res = { onda: med(() => AO.ecra.painel(mk.panelSnap())), instantaneo: med(() => mk.panelSnap()), soOnda: med(() => AO.ecra.painel(snap)),
            kb: html.length / 1024, linhas: (html.match(/class="row/g) || []).length };
        for (const k of Object.keys(mk.cfg)) delete mk.cfg[k];
        Object.assign(mk.cfg, antes.cfg);
        mk.claude = antes.claude; mk.fuel = antes.fuel;
        for (const [o, a] of [[mk.AN, antes.AN], [mk.Q, antes.Q]]) { for (const k of Object.keys(o)) delete o[k]; for (const [k, v] of a) o[k] = v; }
        return res;
    });
    console.log(`# ${r.linhas} linhas, ${r.kb.toFixed(1)} KB: Onda ${r.onda.toFixed(3)} ms (instantâneo ${r.instantaneo.toFixed(3)} ms + desenho ${r.soOnda.toFixed(3)} ms)`);
    assert.ok(r.linhas >= 40, 'as listas desenhadas');
    assert.ok(r.onda < 25, `a Onda demora ${r.onda} ms`);
});
