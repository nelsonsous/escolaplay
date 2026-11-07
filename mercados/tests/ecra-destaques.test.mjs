// node --test mercados/tests/ecra-destaques.test.mjs     (MK_ROOT=dist/mercados: a mesma coisa na pasta minificada)
// Os Destaques desenhados pela Onda (AnaliseOnda.ecra.destaques, de mercados/onda/ecra-destaques.onda), com a app a correr
// no Chromium. Desde a 4.8.0 é a Onda a referência desta vista (o viewHighlights do JS saiu): o teste confere no DOM o que a
// vista promete, em estados ao acaso com valores estranhos. E o que ela trouxe para todas as vistas — o compacto do fmtBig
// e o Intl pt-PT com ATÉ d casas — tem de ser igual ao do browser, valor a valor.
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
// Corre na página: NUMEROS reais de toda a espécie por função (todas as grandezas, as fronteiras das escalas — 999,95 mil
// → 1 M —, metades exatas no decimal e não no binário, um ulp ao lado, inteiros grandes, subnormais, bits ao acaso, NaN,
// ±Infinity, -0) e compara a Onda (o fm_teste de ecra.onda) com o fmtBig do mercados.js e com o
// Intl.NumberFormat('pt-PT', { maximumFractionDigits: d }) do browser.
function numeros({ n, seed }) {
    const mk = window.__mk, AO = window.AnaliseOnda;
    let s = seed;
    const R = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const pick = (a) => a[Math.floor(R() * a.length)];
    const dv = new DataView(new ArrayBuffer(8));
    const bits = () => { dv.setUint32(0, Math.floor(R() * 2 ** 32)); dv.setUint32(4, Math.floor(R() * 2 ** 32)); return dv.getFloat64(0); };
    const ulp = (x, d) => { dv.setFloat64(0, x); const lo = dv.getUint32(4) + d; if (lo < 0 || lo > 0xffffffff) return x; dv.setUint32(4, lo); return dv.getFloat64(0); };
    // as fronteiras do compacto: 999,95 de cada escala (e um pouco antes e depois), 10^k e as metades da 1.ª casa
    const FRONT = [];
    for (let e = -3; e <= 22; e++) for (const m of [0.99995, 0.9995, 0.999949, 0.99994999, 1, 1.0005, 1.05, 1.049999, 1.25, 9.995, 9.9949, 99.95, 99.949]) FRONT.push(m * 10 ** e);
    const FIXOS = [0, -0, 0.05, 0.04999, 0.15, 0.25, 999.95, 999.94, 999950, 999949, 999950000, 999949999, 999.95e12, 1e15, 1e16, 1e21, 2 ** 53, 2 ** 60, 5e-324, 1.7976931348623157e308,
        1.005, 2.675, 9.95, 0.1 + 0.2, 1 / 3, 1234567, 9e6, 2.1e12, 9.5e10, 58.45, 11.2, 12345678901234567890];
    const val = () => {
        const t = Math.floor(R() * 10);
        let x;
        if (t === 0) x = (R() - 0.5) * 10 ** Math.floor(R() * 34 - 14);                                   // todas as grandezas
        else if (t === 1) x = pick(FRONT) * pick([1, -1]);
        else if (t === 2) x = bits();
        else if (t === 3) x = ulp(pick(FRONT), pick([-2, -1, 1, 2]));
        else if (t === 4) x = Math.floor(R() * 2 ** 64) * (R() < 0.5 ? 1 : -1);
        else if (t === 5) x = (Math.floor(R() * 1e9) + 0.5) / 10 ** Math.floor(R() * 10);
        else if (t === 6) x = R() * 1e13;                                                                 // valores e volumes
        else if (t === 7) x = Math.round(R() * 1e6) * 10 ** Math.floor(R() * 12 - 4);
        else if (t === 8) x = pick(FIXOS) * pick([1, -1, 10, 0.1, 1000]);
        else x = ulp(pick(FIXOS), pick([-1, 1]));
        return x;
    };
    const nf = {}, NF = (d) => nf[d] || (nf[d] = new Intl.NumberFormat('pt-PT', { maximumFractionDigits: d }));
    const out = { casos: 0, dif: [], ndif: 0, porTipo: { 5: 0, 6: 0 } };
    for (let feito = 0; feito < n;) {
        const L = [], js = [];
        for (let j = 0; j < 4000 && feito < n; j++, feito++) {
            const v = R() < 0.01 ? pick([NaN, Infinity, -Infinity, null, undefined, '12', true]) : val();
            L.push([5, v]); js.push(mk.fmtBig(v));
            if (typeof v === 'number' && Number.isFinite(v)) { const d = Math.floor(R() * 5); L.push([6, v, d]); js.push(NF(d).format(v)); }
        }
        const onda = AO._vista('fm_teste', L).split('\n');
        L.forEach((e, j) => {
            out.casos++; out.porTipo[e[0]]++;
            if (onda[j] === js[j]) return;
            out.ndif++;
            if (out.dif.length < 8) out.dif.push({ e: JSON.stringify(e, (k, x) => (typeof x === 'number' && !Number.isFinite(x) ? String(x) : Object.is(x, -0) ? '-0' : x === undefined ? '«undefined»' : x)), v: typeof e[1] === 'number' ? e[1].toPrecision(21) : '', js: js[j], onda: onda[j] });
        });
    }
    return out;
}

test(`números: o fmtBig (compacto pt-PT) e o Intl pt-PT com até 0 a 4 casas da Onda iguais aos do browser, em ${NUMEROS} reais`, async () => {
    const r = await page.evaluate(numeros, { n: NUMEROS, seed: 4808 });
    for (const d of r.dif) console.log(`  ${d.e} (${d.v})\n    JS:   ${JSON.stringify(d.js)}\n    Onda: ${JSON.stringify(d.onda)}`);
    console.log(`# ${r.casos - r.ndif}/${r.casos} iguais — fmtBig ${r.porTipo[5]}, até d casas ${r.porTipo[6]}`);
    assert.equal(r.ndif, 0);
    assert.ok(r.casos >= NUMEROS * 1.9);
});

// ---------- a vista ----------
// Corre na página: monta o estado n.º i (pseudo-aleatório, o mesmo em todas as corridas) — os ativos (REG), as cotações,
// as análises (do motor: dão o sentimento do mercado), as notícias, os motivos do Claude, a lista dos EUA, o mercado cripto,
// o que tenho e as dobras —, desenha com a Onda e confere no DOM: o sentimento (o tom, os índices do dia ou a frase, as
// razões), as listas (os meus pela ordem dos Ajustes; o que mais sobe e cai pela variação do dia, cinco de cada lado), cada
// linha (o ícone igual ao do Painel, o nome, o porquê — o motivo do Claude ou a 1.ª notícia, com o ponto certo — ou o
// símbolo, o preço e a variação do dia com os números do browser, os data-*), a lista dos EUA, a cripto e as dobras.
function verificar({ de, ate, seed }) {
    const mk = window.__mk, AO = window.AnaliseOnda;
    const rng = (s) => () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    // as análises: o motor sobre séries ao acaso (uma vez por página)
    if (!window.__hlPool) {
        const R = rng(17), L = [];
        for (let j = 0; j < 120; j++) {
            const n = 30 + Math.floor(R() * 300), drift = (R() - 0.5) * 0.006, vol = 0.002 + R() * 0.05, c = [];
            let x = 10 + R() * 500;
            for (let i = 0; i < n; i++) { x *= 1 + drift + (R() - 0.5) * vol; c.push(x); }
            L.push({ closes: c, opts: { crypto: j % 5 === 0, kind: ['stock', 'fund', 'crypto', 'index', 'energy'][j % 5], news: null } });
        }
        window.__hlPool = AO.analyseMany(L).filter(Boolean);
    }
    const POOL = window.__hlPool;
    const ODD = ['<b>&amp;</b>', '"aspas"', "o'neil", 'Ação & Cª', '😀 emoji 🇵🇹', 'tab\tnova\nlinha', '  espaços  ', '', 'ÇÃÕ ñ ü ß', ' nbsp ', '<script>alert(1)</script>', 'a"b\'c<d>e&f', '—…→×≡⤒', '&#39;&lt;', 'nul\u0000 c1\u0085 del\u007f', 'Muito comprido '.repeat(40), 'ÿsland ßtraße', 'µ ÷ × þorn', '<img src=x onerror=alert(1)>'];
    const NOMES = ['Apple', 'Microsoft', 'FTSE All-World USD (Acc)', 'Mota-Engil', 'LVMH Moët Hennessy', 'Novo Nordisk A/S', 'Bitcoin', 'Ouro', 'J.P. Morgan', 'ébano élan'];
    const SIMB = ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'TSLA', 'AVGO', 'JPM', 'V', 'LLY', 'BRK-B', 'PLTR', 'AMD', 'ASML.AS', 'SAP.DE', 'MC.PA', 'SIE.DE', 'NOVO-B.CO', 'ALV.DE', 'TTE.PA', 'RHM.DE', 'TSM',
        'VWCE.DE', 'EUNL.DE', 'SXR8.DE', 'SXRV.DE', 'IS3N.DE', 'EXSA.DE', '4GLD.DE', 'c:BTC', 'c:ETH', 'c:SOL', 'c:XRP', 'BZ=F', 'CL=F', 'RB=F', 'HO=F', 'NG=F', 'GC=F', '^GSPC', '^IXIC', '^STOXX50E', 'PSI20.LS', '^VIX', 'EURUSD=X',
        'VWCE.MU', 'EURDKK=X', 'A&B', '<X>', '"Q"', "S'", 'ÇA.LS', '😀', 'X Y', '7', '123', '0', 'a<b>"c"&d\'e', 'EGL.LS', 'RACE.MI'];
    const EUA = ['XYZ', 'ABCD', 'QQQX', 'TSLA', 'NVDA', 'A&B', '<X>', 'ZZZ', 'LONGNAME', 'c:BTC', '😀', 'GME', 'AMC', 'BBBY', 'MULN'];
    const TIPO = (k) => (k.startsWith('c:') ? 'crypto' : /=F$/.test(k) ? (k === 'GC=F' ? 'index' : 'energy') : k.startsWith('^') || k === 'PSI20.LS' || k === 'EURUSD=X' ? 'index' : /\.MU$|EURDKK/.test(k) ? 'aux' : /^(VWCE|EUNL|SXR|IS3N|EXSA|4GLD)/.test(k) ? 'fund' : 'stock');
    const MOEDAS = ['EUR', 'EUR', 'USD', 'GBp', 'DKK', 'GBP', 'CHF', '', undefined, 'ZZZ', 'usd'];
    const FNG = { 'Extreme Fear': 'Medo extremo', Fear: 'Medo', Neutral: 'Neutro', Greed: 'Ganância', 'Extreme Greed': 'Ganância extrema' };
    const fin = (x) => typeof x === 'number' && Number.isFinite(x);
    const toneOf = (v) => (!fin(v) ? 'flat' : v > 0.005 ? 'up' : v < -0.005 ? 'down' : 'flat');
    const tom = (t) => (t === 'up' || t === 'down' ? t : 'flat');
    const vnum = (v) => (typeof v === 'number' ? v : v === null ? 0 : typeof v === 'boolean' ? +v : NaN);
    const txt = (v) => String(v ?? '').replace(/\u0000/g, ''); // o esc(v) do JS, como o DOM o lê (sem os NUL)
    const atr = (v) => String(v ?? '').replace(/\u0000/g, '�'); // … e num atributo (o NUL fica U+FFFD)
    const NF1 = new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 1 });
    const clone = (o) => JSON.parse(JSON.stringify(o));
    const real = { REG: Object.entries(mk.REG), AN: Object.entries(mk.AN), Q: Object.entries(mk.Q), NEWS: Object.entries(mk.NEWS), cfg: clone(mk.cfg), fold: { ...mk.st.fold },
        moversErr: mk.st.moversErr, claude: mk.claude, movers: mk.movers, cg: mk.cg };
    const out = { estados: 0, dif: [], ndif: 0, linhas: 0, icones: 0, bytes: 0,
        tipos: { humor: 0, semHumor: 0, indices: 0, frase: 0, meus: 0, semMeus: 0, sobem: 0, nadaSobe: 0, caem: 0, nadaCai: 0, claude: 0, noticia: 0, simbolo: 0, eua: 0, euaCarrega: 0, euaErro: 0, semEua: 0, cripto: 0, semCripto: 0, aberta: 0 } };
    const T = out.tipos;
    try {
        for (let i = de; i < ate; i++) {
            const R = rng(seed + i * 7919), pick = (a) => a[Math.floor(R() * a.length)], sim = (p) => R() < p;
            const sub = (a, n) => { const b = a.slice(); for (let j = b.length - 1; j > 0; j--) { const k = Math.floor(R() * (j + 1)); [b[j], b[k]] = [b[k], b[j]]; } return b.slice(0, n); };
            const varia = () => pick([(R() - 0.5) * 20, (R() - 0.5) * 20, (R() - 0.5) * 6, 0, -0, 0.005, -0.005, 0.004999, NaN, undefined, null, '1.5', 1e21, -1e-7, 5, 5, -5]);
            // ---- a configuração e as dobras ----
            const c = mk.cfg;
            const set = (k, v) => { if (v === undefined) delete c[k]; else c[k] = v; };
            set('proxy', pick(['', 'https://proxy.test', 'https://proxy.test', 'https://proxy.test', undefined]));
            set('fiat', pick(['EUR', 'EUR', 'USD', undefined, 'GBP']));
            set('eur', false); // o qv devolve a cotação tal e qual (as contas dos euros são do JS, antes do instantâneo)
            const st = mk.st;
            for (const k of Object.keys(st.fold)) delete st.fold[k];
            for (const f of ['hl-mood', 'hl-eua', 'hl-cripto']) if (sim(0.35)) st.fold[f] = pick([true, false, 1, 0]);
            st.moversErr = pick(['', '', 'HTTP 502', pick(ODD)]);
            // ---- os ativos e as cotações ----
            for (const k of Object.keys(mk.REG)) delete mk.REG[k];
            for (const k of Object.keys(mk.AN)) delete mk.AN[k];
            for (const k of Object.keys(mk.Q)) delete mk.Q[k];
            for (const k of Object.keys(mk.NEWS)) delete mk.NEWS[k];
            const na = pick([0, 1, 3, 8, 20, 40, 60, 60]);
            const keys = sub(SIMB, na);
            if (sim(0.6)) for (const k of ['^GSPC', '^IXIC', '^STOXX50E', '^VIX', 'c:BTC']) if (!keys.includes(k) && sim(0.7)) keys.push(k);
            for (const k of keys) {
                const kind = sim(0.85) ? TIPO(k) : pick(['stock', 'fund', 'crypto', 'energy', 'index', 'aux']);
                const a = { key: k, kind, sym: pick([k, k, k.replace('c:', ''), pick(ODD), 7, null, undefined]), name: pick([k, pick(NOMES), pick(NOMES), pick(ODD)]), temp: sim(0.08) ? true : undefined };
                if (kind === 'index' && sim(0.7)) a.points = true;
                if (sim(0.12)) a.decimals = pick([0, 1, 2, 3, 4, null]);
                mk.REG[k] = a;
                if (sim(0.92)) mk.Q[k] = { currency: kind === 'crypto' ? pick([c.fiat, undefined]) : pick(MOEDAS), price: sim(0.9) ? pick([1 + R() * 900, R() * 2, 10000 + R() * 90000, 0.00123]) : pick([null, undefined, NaN, '12']), changePct: varia(), name: pick([undefined, pick(NOMES), pick(ODD)]) };
                if (sim(0.75)) mk.AN[k] = clone(pick(POOL));
                if (sim(0.35)) mk.NEWS[k] = pick([{ at: 1, items: [] }, { at: 1 }, { at: 1, items: [{ title: pick([pick(NOMES) + ' sobe 5% com lucros', pick(ODD), '', 7]), tone: pick([{ tone: 'up' }, { tone: 'down' }, { tone: 'flat' }, null, { tone: '<b>' }]) }] }]);
            }
            if (mk.Q['^VIX']) mk.Q['^VIX'].price = pick([12, 17.2, 26, 40, null, NaN]);
            // os ramos mais raros: o sentimento sem os índices do dia (fica a frase) e sem sentimento nenhum
            if (i % 9 === 4) for (const k of ['^GSPC', '^IXIC', '^STOXX50E']) if (mk.Q[k]) mk.Q[k].changePct = NaN;
            if (i % 11 === 6) { for (const k of Object.keys(mk.AN)) delete mk.AN[k]; if (mk.Q['^VIX']) mk.Q['^VIX'].price = null; }
            set('holdings', sub(keys.concat(['FORA', 'c:ETH', 'VWCE.DE']), Math.floor(R() * 7)));
            // ---- os motivos do Claude ----
            const mov = sub(keys.concat(EUA), Math.floor(R() * 8)).map((s) => ({ s, why: pick(['Cai depois de resultados abaixo do esperado.', 'Sobe com o petróleo.', '', pick(ODD), undefined, 7]) }));
            if (sim(0.2)) mov.splice(0, 0, pick([null, 5, 'x', [], { why: 'sem s' }]));
            mk.claude = pick([null, null, { movers: mov }, { movers: mov }, { movers: 'x' }, { missing: true }]);
            // ---- a lista dos EUA (o conector) ----
            const item = () => pick([{ symbol: pick(EUA), name: pick(['Xyz Therapeutics', 'Abcd Corp', pick(ODD), '', undefined]), price: pick([12.3, 4.1, 0.0512, 1234.5, null, NaN]), changePct: pick([38.2, -22.5, 12, -9, NaN, null, 0]),
                volume: pick([9e6, 3e6, 123456, 999950, 1.2e9, null, NaN, undefined]), currency: pick(['USD', 'USD', '', undefined, 'EUR']) }, null, 7]);
            const lista = () => Array.from({ length: pick([0, 1, 3, 6, 25]) }, item);
            mk.movers = pick([null, null, undefined, { gainers: lista(), losers: lista() }, { gainers: lista(), losers: lista() }, { gainers: lista() }, {}, 'x']);
            // ---- o mercado cripto ----
            const ou = (v, p) => (sim(p) ? v : pick([undefined, null, NaN, 'x']));
            if (sim(0.5)) mk.Q['EURUSD=X'] = { currency: undefined, price: pick([1.152, 1.08, null, 0]), changePct: 0 };
            mk.cg = pick([null, null, { fng: pick([{ v: pick([24, 50, 70, 45, 55, 44.9, 55.1, null, undefined, '30']), label: pick(['Extreme Fear', 'Fear', 'Neutral', 'Greed', 'Extreme Greed', pick(ODD), undefined]), prev: pick([30, null, 12.5, undefined]) }, null, undefined]),
                mcap: ou(R() * 3e12, 0.6), mcapUsd: ou(R() * 3e12, 0.6), mcapChg: ou((R() - 0.5) * 10, 0.7), vol: ou(R() * 2e11, 0.6), volUsd: ou(R() * 2e11, 0.6), btcDom: ou(40 + R() * 30, 0.7), ethDom: ou(5 + R() * 15, 0.7) }]);

            // ---- o desenho ----
            const snap = mk.highlightsSnap(), html = AO.ecra.destaques(snap);
            const D = new DOMParser().parseFromString(html, 'text/html');
            out.estados++; out.bytes += html.length;
            const erro = (m) => { out.ndif++; if (out.dif.length < 8) out.dif.push(`estado ${i}: ${m}`); };
            // ---- o que devia lá estar ----
            const REG = mk.REG, AN = mk.AN, Q = mk.Q, NEWS = mk.NEWS, C = mk.claude, M = mk.movers, G = mk.cg;
            const qv = (k) => Q[k] || {};
            const listed = (k) => !!REG[k] && !REG[k].temp && REG[k].kind !== 'aux';
            const investable = (k) => listed(k) && ['stock', 'fund', 'crypto'].includes(REG[k].kind);
            const sa = Object.fromEntries(snap.assets.map((x) => [x.k, x]));
            const clWhy = (k) => { const m = C && Array.isArray(C.movers) ? C.movers.find((x) => x && typeof x === 'object' && !Array.isArray(x) && x.s === k) : null; return m ? m.why : undefined; };
            // o porquê: [texto, classe do ponto] ou null
            const porque = (k, temNoticia) => {
                const w = clWhy(k);
                if (w) return [txt(w), 'hl-w cl'];
                const n = temNoticia && NEWS[k] && NEWS[k].items && NEWS[k].items[0];
                if (n && n.title) return [txt(n.title), 'hl-w ' + tom(n.tone && n.tone.tone)];
                return null;
            };
            const icone = (row, k) => {
                const sy = REG[k] && REG[k].sym;
                if (REG[k].kind === 'crypto' && (typeof sy !== 'string' || /[\ud800-\udfff]/.test(sy))) return;
                const js = new DOMParser().parseFromString(mk.ico(k), 'text/html').body.firstChild, on = row.querySelector('.r-ico');
                out.icones++;
                if (!on || on.textContent !== js.textContent || on.getAttribute('style') !== js.getAttribute('style')) erro(`${k}: ícone ${on && on.outerHTML} em vez de ${js.outerHTML}`);
            };
            // uma linha de um ativo das listas da app
            const linha = (row, k) => {
                out.linhas++;
                const q = qv(k), pq = porque(k, true), sub0 = row.querySelector('.r-sub'), w = sub0 && sub0.querySelector('.hl-w');
                if (row.dataset.open !== k || row.dataset.key !== k || row.dataset.chg !== 'day') erro(`${k}: data-open / data-key / data-chg`);
                if (row.querySelector('.r-name').textContent !== txt(sa[k].name)) erro(`${k}: nome ${JSON.stringify(row.querySelector('.r-name').textContent)}`);
                const subq = pq ? pq[0] : txt(REG[k].sym || k);
                if (!sub0 || sub0.textContent !== subq) erro(`${k}: linha de baixo ${JSON.stringify(sub0 && sub0.textContent)} em vez de ${JSON.stringify(subq)}`);
                if ((w ? w.className : null) !== (pq ? pq[1] : null)) erro(`${k}: ponto ${w && w.className} em vez de ${pq && pq[1]}`);
                if (pq) T[pq[1] === 'hl-w cl' ? 'claude' : 'noticia']++; else T.simbolo++;
                const pxq = mk.fmtPx(q.price, REG[k], q.currency), ch = row.querySelector('.chg');
                if (row.querySelector('.px').textContent !== pxq) erro(`${k}: preço ${row.querySelector('.px').textContent} em vez de ${pxq}`);
                if (!ch || ch.textContent !== mk.fmtPct(q.changePct) || ch.className !== 'chg ' + toneOf(q.changePct)) erro(`${k}: variação ${ch && ch.outerHTML}`);
                icone(row, k);
            };
            // ---- em cima: o sentimento do mercado ----
            const inv = Object.keys(AN).filter((k) => listed(k) && investable(k));
            const breadth = inv.length ? inv.filter((k) => AN[k].score >= 58).length / inv.length : NaN;
            const mood = AO.marketMood({ spx: AN['^GSPC'], stoxx: AN['^STOXX50E'], btc: AN['c:BTC'], vix: Q['^VIX'] && Q['^VIX'].price, breadth });
            const hm = D.querySelector('details.hl-mood');
            if (!!mood !== !!hm) erro('o sentimento: ' + (mood ? 'falta' : 'a mais'));
            if (mood && hm) {
                T.humor++;
                const ind = [['^GSPC', 'S&P 500'], ['^IXIC', 'Nasdaq'], ['^STOXX50E', 'Euro Stoxx']].filter(([k]) => REG[k] && fin(qv(k).changePct)).map(([k, n]) => `${n} ${mk.fmtPct(qv(k).changePct)}`).join(' · ');
                if (ind) T.indices++; else T.frase++;
                const sm = hm.querySelector('summary small'), fn = hm.querySelector('summary .f-n');
                if (sm.textContent !== (ind || txt(mood.hint))) erro(`sentimento: ${JSON.stringify(sm.textContent)} em vez de ${JSON.stringify(ind || mood.hint)}`);
                if (fn.textContent !== mood.label || fn.className !== `f-n ${tom(mood.tone)}-t`) erro(`sentimento: ${fn.outerHTML}`);
                const hint = hm.querySelector('.hl-hint');
                if (ind ? !hint || hint.textContent !== mood.hint : hint) erro('a frase do sentimento lá dentro');
                const li = [...hm.querySelectorAll('.hl-rz li')].map((e) => [e.className, e.textContent]);
                if (JSON.stringify(li) !== JSON.stringify(mood.reasons.map((r) => [tom(r.tone), r.txt]))) erro(`razões do sentimento: ${JSON.stringify(li)}`);
                if (hm.hasAttribute('open') !== !!st.fold['hl-mood']) erro('sentimento aberto/fechado');
                if (hm.hasAttribute('open')) T.aberta++;
            } else T.semHumor++;
            // ---- os meus ativos hoje ----
            const sec = (t) => [...D.querySelectorAll('section.sec')].find((s) => s.querySelector('h2').textContent === t);
            const mine = c.holdings.filter((k) => REG[k]);
            const sm = sec('Os meus ativos hoje');
            if (!!mine.length !== !!sm) erro('os meus ativos: ' + (mine.length ? 'falta' : 'a mais'));
            if (sm) {
                T.meus++;
                const rs = [...sm.querySelectorAll('.row')];
                if (rs.map((r) => r.dataset.key).join('\n') !== mine.join('\n')) erro(`os meus: ${JSON.stringify(rs.map((r) => r.dataset.key))} em vez de ${JSON.stringify(mine)}`);
                else rs.forEach((r, j) => linha(r, mine[j]));
            } else T.semMeus++;
            // ---- o que mais sobe e mais cai do que sigo ----
            const rest = Object.keys(REG).filter((k) => listed(k) && REG[k].kind !== 'index' && fin(qv(k).changePct) && !mine.includes(k));
            const ups = rest.filter((k) => qv(k).changePct > 0).sort((a, b) => qv(b).changePct - qv(a).changePct).slice(0, 5);
            const downs = rest.filter((k) => qv(k).changePct < 0).sort((a, b) => qv(a).changePct - qv(b).changePct).slice(0, 5);
            for (const [t, quer, vazio, ct] of [['Mais sobem', ups, 'Nada a subir hoje.', 'sobem'], ['Mais caem', downs, 'Nada a cair hoje.', 'caem']]) {
                const s = sec(t);
                if (!s) { erro(`falta ${t}`); continue; }
                const rs = [...s.querySelectorAll('.row')];
                if (rs.map((r) => r.dataset.key).join('\n') !== quer.join('\n')) erro(`${t}: ${JSON.stringify(rs.map((r) => r.dataset.key))} em vez de ${JSON.stringify(quer)}`);
                else rs.forEach((r, j) => linha(r, quer[j]));
                const e = s.querySelector('.empty');
                if (quer.length ? e : !e || e.textContent !== vazio) erro(`${t}: o vazio`);
                T[quer.length ? ct : ct === 'sobem' ? 'nadaSobe' : 'nadaCai']++;
            }
            if (D.querySelectorAll('section.sec').length !== (sm ? 3 : 2)) erro('secções a mais');
            // ---- a lista dos EUA (só com o conector) ----
            const eua = D.querySelector('details[data-fold="hl-eua"]');
            const objs = (l) => (Array.isArray(l) ? l.filter((x) => x && typeof x === 'object' && !Array.isArray(x)).slice(0, 5) : []);
            const g = M && typeof M === 'object' ? objs(M.gainers) : [], l = M && typeof M === 'object' ? objs(M.losers) : [];
            const querEua = !!c.proxy && (!M || g.length + l.length > 0);
            if (querEua !== !!eua) erro('a lista dos EUA: ' + (querEua ? 'falta' : 'a mais'));
            if (eua) {
                const sml = eua.querySelector('summary small').textContent;
                if (!M) {
                    const e = st.moversErr;
                    T[e ? 'euaErro' : 'euaCarrega']++;
                    if (sml !== (e ? 'Indisponível' : 'A carregar…')) erro(`EUA: ${sml}`);
                    if (eua.querySelector('.empty').textContent !== (e ? 'Não deu para ler a lista: ' + txt(e) : 'A carregar…')) erro('EUA: o aviso');
                } else {
                    T.eua++;
                    const res = (q) => `${txt(q.name || q.symbol)} ${mk.fmtPct(q.changePct)}`;
                    const quer = [g[0], l[0]].filter(Boolean).map(res).join(' · ');
                    if (sml !== quer) erro(`EUA: resumo ${JSON.stringify(sml)} em vez de ${JSON.stringify(quer)}`);
                    const gr = [...eua.querySelectorAll('.grp-h')].map((e) => e.textContent);
                    if (gr.join() !== [g.length ? 'Sobem' : '', l.length ? 'Caem' : ''].filter(Boolean).join()) erro(`EUA: grupos ${gr}`);
                    const rs = [...eua.querySelectorAll('.row')], qs = g.concat(l);
                    if (rs.length !== qs.length) erro(`EUA: ${rs.length} linhas em vez de ${qs.length}`);
                    else rs.forEach((row, j) => {
                        const q = qs[j], k = q.symbol, a = REG[k], nm = q.name || k, pq = porque(k, !!a), sub0 = row.querySelector('.r-sub'), w = sub0.querySelector('.hl-w');
                        out.linhas++;
                        if (row.dataset.open !== atr(k) || row.dataset.key !== atr(k) || row.dataset.chg !== 'day' || row.dataset.name !== (q.name ? atr(q.name) : '')) erro(`EUA ${k}: data-* ${JSON.stringify(row.dataset)}`);
                        if (row.querySelector('.r-name').textContent !== txt(nm)) erro(`EUA ${k}: nome`);
                        const subq = pq ? pq[0] : txt(a && a.sym ? a.sym : k) + (fin(q.volume) ? ' · vol. ' + mk.fmtBig(q.volume) : '');
                        if (sub0.textContent !== subq) erro(`EUA ${k}: linha de baixo ${JSON.stringify(sub0.textContent)} em vez de ${JSON.stringify(subq)}`);
                        if ((w ? w.className : null) !== (pq ? pq[1] : null)) erro(`EUA ${k}: ponto`);
                        const pxq = mk.fmtPx(q.price, a || { key: k }, q.currency), ch = row.querySelector('.chg');
                        if (row.querySelector('.px').textContent !== pxq) erro(`EUA ${k}: preço ${row.querySelector('.px').textContent} em vez de ${pxq}`);
                        if (ch.textContent !== mk.fmtPct(q.changePct) || ch.className !== 'chg ' + toneOf(q.changePct)) erro(`EUA ${k}: variação`);
                        // o ícone: o do Painel para um ativo com este nome (as iniciais do nome da lista, a cor da chave)
                        if (typeof k === 'string' && typeof nm === 'string') {
                            const antes = REG[k];
                            REG[k] = { key: k, kind: 'stock', sym: {}, name: nm };
                            try {
                                const js = new DOMParser().parseFromString(mk.ico(k), 'text/html').body.firstChild, on = row.querySelector('.r-ico');
                                out.icones++;
                                if (on.textContent !== js.textContent || on.getAttribute('style') !== js.getAttribute('style')) erro(`EUA ${k}: ícone ${on.outerHTML} em vez de ${js.outerHTML}`);
                            } finally { if (antes) REG[k] = antes; else delete REG[k]; }
                        }
                    });
                }
                if (eua.hasAttribute('open') !== !!st.fold['hl-eua']) erro('EUA aberta/fechada');
                if (eua.hasAttribute('open')) T.aberta++;
            } else T.semEua++;
            // ---- a cripto hoje ----
            const cg = D.querySelector('details[data-fold="hl-cripto"]');
            let quer = null;
            if (G) {
                const f = G.fng, eu = Q['EURUSD=X'] && Q['EURUSD=X'].price;
                // as do cryptoCard; um texto com um número ('12') não entra nas contas (o JS converte-o; a Onda dá NaN)
                const mcap = fin(G.mcap) ? G.mcap : fin(G.mcapUsd) && eu ? G.mcapUsd / vnum(eu) : null;
                const vol = fin(G.vol) ? G.vol : fin(G.volUsd) && eu ? G.volUsd / vnum(eu) : null;
                const fl = (x) => (typeof x === 'string' && Object.prototype.hasOwnProperty.call(FNG, x) ? FNG[x] : txt(x));
                const x = f ? vnum(f.v) : NaN, ft = x < 45 ? 'down' : x > 55 ? 'up' : 'flat';
                const cel = [];
                if (f) cel.push(['Medo e ganância', txt(f.v), fl(f.label) + (fin(f.prev) ? ' · ontem ' + f.prev : '')]);
                if (fin(mcap)) cel.push(['Valor do mercado', mk.fmtBig(mcap) + ' €', fin(G.mcapChg) ? mk.fmtPct(G.mcapChg) + ' em 24 h' : null]);
                if (fin(G.btcDom)) cel.push(['Dominância do Bitcoin', NF1.format(G.btcDom) + '%', fin(G.ethDom) ? 'Ether ' + NF1.format(G.ethDom) + '%' : null]);
                if (fin(vol)) cel.push(['Volume 24 h', mk.fmtBig(vol) + ' €', null]);
                if (cel.length) quer = { cel, ft, fn: f ? txt(f.v) : null,
                    resumo: f || fin(G.mcapChg) ? [f ? fl(f.label) : null, fin(G.mcapChg) ? 'mercado ' + mk.fmtPct(G.mcapChg) + ' em 24 h' : null].filter((s) => s !== null).join(' · ') : 'Valor, dominância e volume' };
            }
            if (!!quer !== !!cg) erro('a cripto: ' + (quer ? 'falta' : 'a mais'));
            if (quer && cg) {
                T.cripto++;
                const sml = cg.querySelector('summary small').textContent, fn = cg.querySelector('summary .f-n');
                if (sml !== quer.resumo) erro(`cripto: resumo ${JSON.stringify(sml)} em vez de ${JSON.stringify(quer.resumo)}`);
                if (quer.fn === null ? fn : !fn || fn.textContent !== quer.fn || fn.className !== `f-n ${quer.ft}-t`) erro(`cripto: ${fn && fn.outerHTML}`);
                const got = [...cg.querySelectorAll('.cg > div')].map((d) => [d.querySelector('small').textContent, d.querySelector('b').textContent, d.querySelector('em') ? d.querySelector('em').textContent : null]);
                if (JSON.stringify(got) !== JSON.stringify(quer.cel)) erro(`cripto: ${JSON.stringify(got)} em vez de ${JSON.stringify(quer.cel)}`);
                const fv = cg.querySelector('.cg > div b span');
                if (G.fng && (!fv || fv.className !== quer.ft + '-t')) erro('cripto: a cor do medo e ganância');
                if (cg.hasAttribute('open') !== !!st.fold['hl-cripto']) erro('cripto aberta/fechada');
                if (cg.hasAttribute('open')) T.aberta++;
            } else T.semCripto++;
            // nada do que vem nos dados vira HTML; e nada de parágrafos fora das linhas que abrem
            if (D.querySelector('script, img, iframe, .row b, summary b')) erro('HTML dos dados no ecrã');
            if ([...D.querySelectorAll('.note')].some((e) => !e.closest('details'))) erro('um parágrafo fora das linhas que abrem');
        }
    } finally {
        for (const [o, a] of [[mk.REG, real.REG], [mk.AN, real.AN], [mk.Q, real.Q], [mk.NEWS, real.NEWS]]) { for (const k of Object.keys(o)) delete o[k]; for (const [k, v] of a) o[k] = v; }
        for (const k of Object.keys(mk.cfg)) delete mk.cfg[k];
        Object.assign(mk.cfg, real.cfg);
        for (const k of Object.keys(mk.st.fold)) delete mk.st.fold[k];
        Object.assign(mk.st.fold, real.fold); mk.st.moversErr = real.moversErr;
        mk.claude = real.claude; mk.movers = real.movers; mk.cg = real.cg;
    }
    return out;
}

test(`Destaques: o sentimento, as listas, cada linha, a lista dos EUA, a cripto e as dobras certos em ${ESTADOS} estados`, async () => {
    const tot = { estados: 0, ndif: 0, dif: [], linhas: 0, icones: 0, tipos: {}, bytes: 0 };
    for (let de = 0; de < ESTADOS; de += 50) {
        const r = await page.evaluate(verificar, { de, ate: Math.min(ESTADOS, de + 50), seed: 4808 });
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

test('Destaques: a app desenha-os com a Onda (e, se a Onda falhar, um aviso curto)', async () => {
    const r = await page.evaluate(() => {
        const mk = window.__mk, ecra = window.AnaliseOnda.ecra, orig = ecra.destaques;
        let n = 0;
        ecra.destaques = (s) => { n++; return orig(s); };
        mk.cfg.tab = 'destaques'; mk.render();
        const html = document.querySelector('#mk-body').innerHTML, usou = n;
        ecra.destaques = () => { throw new Error('teste'); };
        const ce = console.error; let logs = 0; console.error = () => { logs++; };
        const p = mk.cfg.proxy; mk.cfg.proxy = 'https://proxy.test';
        const recurso = mk.highlightsHtml();
        mk.cfg.proxy = p;
        console.error = ce; ecra.destaques = orig;
        mk.cfg.tab = 'painel'; mk.render();
        return { usou, temLista: html.includes('<h2>Mais sobem</h2>'), recurso, logs };
    });
    assert.ok(r.usou >= 1, 'o render dos Destaques chamou a Onda');
    assert.ok(r.temLista, 'as listas estão no ecrã');
    assert.equal(r.recurso, '<div class="empty">Não deu para mostrar os destaques.</div>', 'sem a vista da Onda, um aviso');
    assert.equal(r.logs, 1, 'e o erro na consola');
});

test('como a Música: a zona das horas é uma faixa preta fixa e a app abre no topo', async () => {
    const r = await page.evaluate(() => { const s = getComputedStyle(document.body, '::before'); return { pos: s.position, cor: s.backgroundColor, z: s.zIndex, top: s.top, ev: s.pointerEvents, sr: history.scrollRestoration }; });
    assert.deepEqual(r, { pos: 'fixed', cor: 'rgb(0, 0, 0)', z: '15', top: '0px', ev: 'none', sr: 'manual' });
});

test('Destaques: desempenho (mediana de 50 desenhos no Chromium)', async () => {
    const r = await page.evaluate(() => {
        const mk = window.__mk, AO = window.AnaliseOnda;
        const med = (f) => { const t = []; for (let i = 0; i < 60; i++) { const a = performance.now(); for (let j = 0; j < 10; j++) f(); t.push((performance.now() - a) / 10); } t.splice(0, 10); t.sort((x, y) => x - y); return t[25]; };
        // a app com as listas por omissão (23 ações, 7 fundos, 4 cripto, os futuros e os índices), cada ativo com a cotação,
        // a análise do motor e uma notícia; os motivos do Claude, as 25 + 25 da lista dos EUA e o mercado cripto
        let s = 11;
        const R = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
        const pool = window.__hlPool || AO.analyseMany(Array.from({ length: 60 }, () => { let x = 100; return { closes: Array.from({ length: 300 }, () => (x *= 1 + (R() - 0.49) * 0.03)), opts: { kind: 'stock' } }; })).filter(Boolean);
        const antes = { cfg: { ...mk.cfg }, claude: mk.claude, movers: mk.movers, cg: mk.cg, AN: Object.entries(mk.AN), Q: Object.entries(mk.Q), NEWS: Object.entries(mk.NEWS) };
        const keys = Object.keys(mk.REG).filter((k) => !mk.REG[k].temp && mk.REG[k].kind !== 'aux');
        keys.forEach((k, j) => {
            mk.AN[k] = JSON.parse(JSON.stringify(pool[j % pool.length]));
            mk.Q[k] = { ...(mk.Q[k] || {}), currency: 'EUR', price: 10 + R() * 500, changePct: (R() - 0.5) * 8 };
            mk.NEWS[k] = { at: Date.now(), items: [{ title: `${k}: ações sobem depois de resultados acima do esperado`, tone: { tone: 'up' } }] };
        });
        mk.claude = { movers: keys.slice(0, 4).map((k) => ({ s: k, why: 'Sobe com resultados acima do esperado e a subida do setor.' })) };
        const q = (j, sg) => ({ symbol: 'US' + j, name: 'Empresa americana ' + j, price: 1 + R() * 50, changePct: sg * (5 + R() * 40), volume: R() * 5e7, currency: 'USD' });
        mk.movers = { gainers: Array.from({ length: 25 }, (_, j) => q(j, 1)), losers: Array.from({ length: 25 }, (_, j) => q(j + 25, -1)) };
        mk.cg = { mcap: 2.1e12, mcapChg: -3.2, vol: 9.5e10, btcDom: 58.4, ethDom: 11.2, fng: { v: 24, label: 'Extreme Fear', prev: 30 } };
        Object.assign(mk.cfg, { proxy: 'https://proxy.test' });
        const snap = mk.highlightsSnap(), html = AO.ecra.destaques(snap);
        const res = { onda: med(() => AO.ecra.destaques(mk.highlightsSnap())), instantaneo: med(() => mk.highlightsSnap()), soOnda: med(() => AO.ecra.destaques(snap)),
            kb: html.length / 1024, linhas: (html.match(/class="row/g) || []).length };
        for (const k of Object.keys(mk.cfg)) delete mk.cfg[k];
        Object.assign(mk.cfg, antes.cfg);
        mk.claude = antes.claude; mk.movers = antes.movers; mk.cg = antes.cg;
        for (const [o, a] of [[mk.AN, antes.AN], [mk.Q, antes.Q], [mk.NEWS, antes.NEWS]]) { for (const k of Object.keys(o)) delete o[k]; for (const [k, v] of a) o[k] = v; }
        return res;
    });
    console.log(`# ${r.linhas} linhas, ${r.kb.toFixed(1)} KB: Onda ${r.onda.toFixed(3)} ms (instantâneo ${r.instantaneo.toFixed(3)} ms + desenho ${r.soOnda.toFixed(3)} ms)`);
    assert.ok(r.linhas >= 20, 'as listas desenhadas');
    assert.ok(r.onda < 25, `a Onda demora ${r.onda} ms`);
});
