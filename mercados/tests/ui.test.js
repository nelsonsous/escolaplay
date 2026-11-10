// Teste da app no Chromium com todas as fontes simuladas (sem rede).
//   node mercados/tests/ui.test.js [pasta-para-capturas]
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');

const ROOT = path.resolve(process.env.MK_ROOT || path.join(__dirname, '..'));
const SHOTS = process.argv[2];
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

function rnd(seed) { let s = seed % 2147483647 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
const hash = (str) => [...str].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const BASE = { BTCEUR: 88000, ETHEUR: 3100, SOLEUR: 160, XRPEUR: 2.18, 'BZ=F': 64.2, 'CL=F': 60.1, 'RB=F': 1.98, 'HO=F': 2.31, 'NG=F': 3.4, '^GSPC': 6850, '^IXIC': 23500, '^STOXX50E': 5650, 'PSI20.LS': 8100, '^VIX': 17.2, 'EURUSD=X': 1.152, 'GC=F': 3980, 'ALV.DE': 17.4, 'NVDA': 196, 'TSLA': 455, 'VWCE.DE': 165.98, 'VWCE.MU': 163.8, 'EURDKK=X': 7.4742 };
// o servidor diz se esta app é a do dono (análise completa) ou outra (análise do Claude desligada por omissão)
const ME = { owner: true, others: true, advice: null };
const UNI = { date: '2026-11-07', generatedAt: '2026-11-07T07:20:00Z', n: 3, rows: [
    { s: 'SXRV.DE', n: 'iShares NASDAQ 100 ETF', t: 'etf', l: 90, m: 23, d: 0.5, y: 12.1, dd: -12.3, o: 0, rk: 'Risco baixo' },
    { s: 'PUM.DE', n: 'PUMA', t: 'stock', l: 84, m: 97, d: -1, y: 66, dd: -10.6, o: 0, rk: 'Risco médio' },
    { s: 'ADA-EUR', n: 'Cardano', t: 'crypto', l: 31, m: 40, d: 2.1, y: -35, dd: -60, o: 0, rk: 'Risco muito alto' },
] };
const DAYCHG = { 'VWCE.DE': -2.28, 'VWCE.MU': -3.9, 'EURUSD=X': 0, 'EURDKK=X': 0, 'ALV.DE': 6.8, 'NVDA': 5.2, 'TSLA': -7.4, 'TTE.PA': -4.6, 'BZ=F': 1.3 };

function series(sym, n, stepSec, drift) {
    const r = rnd(hash(sym) + n);
    const p0 = BASE[sym] || 20 + (hash(sym) % 400);
    let x = p0; const out = []; const t0 = 1762300000 - n * stepSec;
    for (let i = 0; i < n; i++) { x *= 1 + drift + (r() - 0.5) * 0.02; out.push([t0 + i * stepSec, +x.toFixed(4)]); }
    return out;
}
function quote(sym, range) {
    const daily = range !== '1d';
    const drift = ((hash(sym) % 9) - 4) / 1500;
    const s = daily ? series(sym, range === '5y' ? 1260 : range === '2y' ? 505 : range === '1y' ? 252 : 126, 86400, drift) : series(sym, 78, 300, 0);
    const chgPct = DAYCHG[sym] ?? (((hash(sym) % 600) - 300) / 100);
    const price = BASE[sym] || s[s.length - 1][1];
    if (!daily) { const k = price / s[s.length - 1][1]; s.forEach((p) => { p[1] = +(p[1] * k).toFixed(4); }); }
    const prev = +(price / (1 + chgPct / 100)).toFixed(4);
    return { symbol: sym, name: sym + ' Name', currency: /\.LS$|\.DE$|\.PA$|\.AS$|\.MU$/.test(sym) ? 'EUR' : /\.CO$/.test(sym) ? 'DKK' : 'USD', exchange: 'Test', price, prevClose: prev,
        change: +(price - prev).toFixed(4), changePct: chgPct, dayHigh: price * 1.01, dayLow: price * 0.97, volume: 1234567, high52: price * 1.4, low52: price * 0.6, time: sym === 'VWCE.MU' ? 1762309999 : 1762300000, open: true, series: s };
}
// análise do Claude do dono: o formato antigo (até à 3.x: o veredicto de alguns ativos) e o da 4.0, feito no arranque
// pelo publicar.mjs a partir de uma análise de teste (um veredicto por ativo, com convicção por prazo, níveis e porquê)
const ADV_BASE = { headline: 'Mercado nervoso: manter o plano no VWCE', market: 'Texto de mercado.', planNote: '900 € em 2 execuções', plan: [{ s: 'VWCE.DE', amount: '810 €', why: 'núcleo' }, { s: 'c:BTC', amount: '90 €', why: 'cripto · todos os meses' }], movers: [{ s: 'TSLA', why: 'Cai depois de resultados abaixo do esperado.' }], tldr: ['Mercado: venda em tecnologia, VIX 24.', 'Plano: manter 810 € VWCE + 90 € BTC.', 'Atenção: XRP −9%, sem reforço.'], risks: ['S&P na média de 200 dias'], review: 'Primeiro dia.', lessons: ['Não perseguir subidas'] };
const ADV_V1 = { date: '2026-11-06', generatedAt: '2026-11-06T07:16:00Z', ...ADV_BASE, actions: [{ s: 'c:BTC', key: 'wait', action: 'Esperar', why: 'abaixo das médias', plan: 'entrar acima de 71 000 €' }] };
const ADV = { doc: null };
const WATCH = ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'TSLA', 'AVGO', 'JPM', 'V', 'LLY', 'BRK-B', 'PLTR', 'AMD', 'ASML.AS', 'SAP.DE', 'MC.PA', 'SIE.DE', 'NOVO-B.CO', 'ALV.DE', 'TTE.PA', 'RHM.DE', 'TSM'];
const FUNDS = ['VWCE.DE', 'EUNL.DE', 'SXR8.DE', 'SXRV.DE', 'IS3N.DE', 'EXSA.DE', '4GLD.DE'];
const REFS = ['BZ=F', 'CL=F', 'RB=F', 'HO=F', 'NG=F', 'GC=F', '^GSPC', '^IXIC', '^STOXX50E', 'PSI20.LS', '^VIX', 'EURUSD=X'];
// sem veredicto hoje (ex.: sem dados nesse dia): o Ether fica com o último conselho; o XRP, a TSMC e a Rheinmetall com o algoritmo
const SKIP = ['c:ETH', 'c:XRP', 'TSM', 'RHM.DE'];
const SPECIAL = {
    NVDA: { key: 'scale', action: 'Comprar aos poucos', short: 48, mid: 88, long: 81, entry: 190, target: 230, stop: 172, why: 'Desconto de 22% com a tendência longa a favor; resultados a 17/11.', plan: 'Metade agora, metade depois dos resultados.' },
    'ALV.DE': { key: 'buy', action: 'Comprar', short: 70, mid: 84, long: 70, why: 'Sobe 6,8% com resultados acima do esperado.' },
    'VWCE.DE': { key: 'hold', action: 'Manter e reforçar', short: 40, mid: 82, long: 90, why: 'Núcleo do plano.' },
    MSFT: { key: 'hold', action: 'Manter', short: 50, mid: 76, long: 70, why: 'Tendência longa a favor.' },
    AAPL: { key: 'hold', action: 'Manter', short: 50, mid: 76, long: 60, why: 'Perto do máximo do ano.' },
    'c:BTC': { key: 'wait', action: 'Esperar', short: 40, mid: 45, long: 62, entry: 86000, target: 99000, stop: 80000, why: 'abaixo das médias', plan: 'entrar acima de 71 000 €' },
    'BZ=F': { key: 'up', action: 'Em alta', short: 66, mid: 77, long: 45, why: 'Brent acima da média de 50 dias.' },
};
function verdictOf(s) {
    if (SPECIAL[s]) return SPECIAL[s];
    const sc = (h) => 25 + (hash(s + h) % 51); // 25 a 75
    const mid = sc('m');
    const key = REFS.includes(s) ? (mid >= 58 ? 'up' : mid <= 42 ? 'down' : 'flat') : mid >= 60 ? 'buy' : mid <= 35 ? 'avoid' : 'hold';
    return { key, short: sc('c'), mid, long: sc('l'), why: `${s}: leitura de teste.` };
}
const NEWS = (q) => ({ q, items: [
    { title: `${q}: ações disparam após lucros recorde`, link: 'https://news.example/1', source: 'Jornal de Negócios', time: 1762299000 },
    { title: `${q} shares fall on weak demand`, link: 'https://news.example/2', source: 'Reuters', time: 1762290000 },
    { title: `<img src=x onerror=alert(1)> ${q} apresenta plano`, link: 'javascript:alert(1)', source: 'Eco', time: 1762280000 },
] });

function proxyBody(u) {
    const p = u.pathname;
    if (p === '/health') return { ok: true };
    if (p === '/quotes') return { quotes: u.searchParams.get('symbols').split(',').map((s) => quote(s, u.searchParams.get('range'))) };
    if (p === '/news') return NEWS(u.searchParams.get('q'));
    if (p === '/consensus') return { items: u.searchParams.get('symbols').split(',').map((s) => (s === 'NVDA' ? { symbol: s, key: 'strong_buy', mean: 1.4, n: 58, target: 230.5, low: 150, high: 300, price: 196, currency: 'USD', votes: [20, 30, 6, 1, 1] } : s === 'TSLA' ? { symbol: s, key: 'hold', mean: 2.8, n: 40, target: 300, low: 120, high: 500, price: 250, currency: 'USD', votes: [5, 10, 18, 5, 2] } : { symbol: s, none: true })) };
    if (p === '/movers') return { gainers: [{ symbol: 'XYZ', name: 'Xyz Therapeutics', price: 12.3, changePct: 38.2, volume: 9e6, currency: 'USD' }], losers: [{ symbol: 'ABCD', name: 'Abcd Corp', price: 4.1, changePct: -22.5, volume: 3e6, currency: 'USD' }], actives: [] };
    if (p === '/fuel' && u.searchParams.get('list') === '1') return { fuels: [{ id: +u.searchParams.get('tipos'), name: 'Gasolina simples 95', n: 3, median: 1.739, max: 1.799, updated: '2026-11-05 09:30',
        stations: [{ price: 1.589, name: 'Prio Torres Novas', brand: 'Prio', addr: 'Rua A, Torres Novas', lat: 39.48, lon: -8.54 }, { price: 1.739, name: 'Galp Centro', brand: 'Galp', addr: 'Av. B', lat: null, lon: null }, { price: 1.799, name: 'BP Norte', brand: 'BP', place: 'Porto, Porto' }] }] };
    if (p === '/fuel') return { fuels: [
        { id: 2101, name: 'Gasóleo simples', n: 3012, avg: 1.611, median: 1.599, min: 1.449, max: 1.899, cheapest: [{ price: 1.449, name: 'Intermarché', brand: 'Intermarché', place: 'Leiria, Leiria' }], updated: '2026-11-05 09:30' },
        { id: 3201, name: 'Gasolina simples 95', n: 2987, avg: 1.751, median: 1.739, min: 1.589, max: 2.049, cheapest: [{ price: 1.589, name: 'Prio Torres Novas', brand: 'Prio', place: 'Torres Novas, Santarém' }], updated: '2026-11-05 09:30' }] };
    if (p === '/fuel/distritos') return { items: [{ id: 11, name: 'Lisboa' }, { id: 13, name: 'Porto' }] };
    if (p === '/cryptoglobal') return { mcap: 2.1e12, mcapChg: -3.2, vol: 9.5e10, btcDom: 58.4, ethDom: 11.2, fng: { v: 24, label: 'Extreme Fear', prev: 30 } };
    if (p === '/fuel/municipios') return { items: [{ id: 1316, name: 'Santo Tirso' }, { id: 1312, name: 'Porto' }] };
    if (p === '/me') return { owner: ME.owner, others: ME.others };
    if (p === '/stats') return ME.owner ? { total: 5, d1: 2, d7: 4, d30: 5, claude: 1, others: ME.others, run: { at: '2026-11-07T07:20:00Z', queued: 1, done: 1, max: 20 } } : null;
    if (p === '/universe') return ME.owner ? UNI : null;
    if (p === '/owner') { ME.others = JSON.parse(u.searchParams.get('_b') || '{}').others ?? ME.others; return { ok: true }; }
    if (p === '/advice' && !ME.owner) return ME.advice;
    if (p === '/advice') return ADV.doc;
    if (p === '/calendar') return { items: u.searchParams.get('symbols').split(',').map((s) => s === 'NVDA' ? { symbol: s, earnings: Math.floor(Date.now() / 1000) + 5 * 86400, exDividend: null } : { symbol: s, earnings: null, exDividend: null }) };
    if (p === '/search') return { items: [{ symbol: 'EGL.LS', name: 'Mota-Engil', exchange: 'Lisbon', type: 'Equity' }] };
    return null;
}

(async () => {
    // a análise do dono no formato 4.0, exatamente como o publicar.mjs a grava no KV
    const { buildAdvice } = await import(require('url').pathToFileURL(path.join(__dirname, '../conselheiro/publicar.mjs')).href);
    const covered = [...FUNDS, 'c:BTC', 'c:ETH', 'c:SOL', 'c:XRP', ...WATCH, ...REFS].filter((s) => !SKIP.includes(s));
    const dadosRows = covered.map((s) => ({ s, kind: REFS.includes(s) ? 'ref' : 'x', price: s === 'NVDA' ? 196 : s === 'c:BTC' ? 88000 : null }));
    // mais um da lista toda da TR (fora das listas da app): a PUMA
    const pick = { s: 'PUM.DE', key: 'buy', action: 'Comprar', short: 60, mid: 70, long: 72, why: 'PUMA: tendência forte na lista da TR.' };
    const built = buildAdvice({ ...ADV_BASE, actions: covered.map((s) => ({ s, ...verdictOf(s) })).concat(pick), rank: { mid: ['NVDA', 'ALV.DE', 'VWCE.DE', 'MSFT', 'AAPL'] } }, { rows: dadosRows }, [{ s: 'PUM.DE' }]);
    assert.deepEqual(built.errs, [], 'a análise de teste passa na validação do publicar.mjs');
    ADV.doc = { ...built.out, date: '2026-11-06', generatedAt: '2026-11-06T07:16:00Z' };
    console.log('✓ análise de teste (formato 4.0) validada pelo publicar.mjs:', ADV.doc.actions.length, 'ativos');

    const server = http.createServer((req, res) => {
        let f = decodeURIComponent(req.url.split('?')[0]).replace(/^\/escolaplay\/mercados\/?/, '/');
        if (f === '/') f = '/index.html';
        const fp = path.join(ROOT, f);
        if (!fp.startsWith(ROOT) || !fs.existsSync(fp)) { res.writeHead(404); return res.end(); }
        res.writeHead(200, { 'Content-Type': TYPES[path.extname(fp)] || 'application/octet-stream' });
        fs.createReadStream(fp).pipe(res);
    }).listen(0);
    const url = `http://127.0.0.1:${server.address().port}/escolaplay/mercados/`;
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: SHOTS ? 2 : 1, isMobile: true, hasTouch: true, locale: 'pt-PT', timezoneId: 'Europe/Lisbon' });
    const errors = [];
    let wsMsgs = 0;

    const JDOC = { v: 1, days: { '2026-10-01': [{ s: 'NVDA', p: 150, a: 'buy' }, { s: 'TSLA', p: 500, a: 'avoid' }, { s: 'VWCE.DE', p: 150, a: 'buy' }] } };
    let jPosts = 0;
    const lotPosts = [], claudePosts = [], ownerPosts = [];
    await ctx.route(/proxy\.test/, (route) => {
        const u = new URL(route.request().url());
        if (u.pathname === '/journal') {
            if (route.request().method() === 'POST') { const b = JSON.parse(route.request().postData()); if ('claude' in b) claudePosts.push(b); if (b.date && b.items) { JDOC.days[b.date] = b.items; jPosts++; } if (b.lots) lotPosts.push(b.lots); return route.fulfill({ json: { ok: true }, headers: { 'Access-Control-Allow-Origin': '*' } }); }
            return route.fulfill({ json: JDOC, headers: { 'Access-Control-Allow-Origin': '*' } });
        }
        if (u.pathname === '/owner' && route.request().method() === 'POST') { const b = JSON.parse(route.request().postData()); ownerPosts.push(b); ME.others = b.others; return route.fulfill({ json: { ok: true }, headers: { 'Access-Control-Allow-Origin': '*' } }); }
        const body = proxyBody(u);
        return body ? route.fulfill({ json: body, headers: { 'Access-Control-Allow-Origin': '*' } }) : route.fulfill({ status: 404, json: { error: 'x' } });
    });
    await ctx.route(/binance\.(vision|com)\/api\/v3\/klines/, (route) => {
        const u = new URL(route.request().url());
        const n = +u.searchParams.get('limit');
        const sym = u.searchParams.get('symbol');
        const s = series(sym, n, 900, u.searchParams.get('interval') === '1d' ? 0.002 : 0);
        return route.fulfill({ json: s.map(([t, c]) => [t * 1000, String(c), String(c), String(c), String(c), '1000']), headers: { 'Access-Control-Allow-Origin': '*' } });
    });
    await ctx.route(/binance\.(vision|com)\/api\/v3\/ticker/, (route) => route.fulfill({ json: [], headers: { 'Access-Control-Allow-Origin': '*' } }));
    await ctx.route(/coingecko|fonts\./, (route) => route.abort());
    let fhSubs = 0;
    await ctx.routeWebSocket(/finnhub/, (ws) => {
        ws.onMessage((m) => { const d = JSON.parse(m); if (d.type === 'subscribe') { fhSubs++; if (d.symbol === 'NVDA') ws.send(JSON.stringify({ type: 'trade', data: [{ s: 'NVDA', p: 250, t: Date.now() + 60000, v: 10 }] })); } });
    });
    await ctx.routeWebSocket(/binance/, (ws) => {
        const px = { BTCEUR: 88123.45, ETHEUR: 3120.5, SOLEUR: 161.2, XRPEUR: 2.1873 };
        const send = () => { for (const [s, p] of Object.entries(px)) { const v = p * (1 + (Math.random() - 0.5) * 0.001); ws.send(JSON.stringify({ stream: s.toLowerCase() + '@ticker', data: { e: '24hrTicker', E: Date.now(), s, c: String(v), P: s === 'SOLEUR' ? '-5.12' : '2.31', p: '10', x: String(p * 0.98), h: String(p * 1.02), l: String(p * 0.97), q: '123456789' } })); wsMsgs++; } };
        send(); const t = setInterval(send, 400); ws.onClose(() => clearInterval(t));
    });

    // 0) instalação nova: já vem ligada ao conector do autor (no iPhone, a app do ecrã principal não vê o que o Safari guardou)
    await ctx.route(/mercados-proxy\.mercados-proxy\.workers\.dev/, (route) => route.fulfill({ status: 503, json: { error: 'teste' }, headers: { 'Access-Control-Allow-Origin': '*' } }));
    let page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/status of 503/.test(m.text())) errors.push('console: ' + m.text()); });
    await page.goto(url);
    await page.waitForFunction(() => { try { return JSON.parse(localStorage.getItem('mercados:v1')).proxy === 'https://mercados-proxy.mercados-proxy.workers.dev'; } catch { return false; } });
    console.log('✓ instalação nova: já ligada ao conector do autor');

    // 1) sem conector: cripto funciona e aparece o aviso
    await page.addInitScript(() => { const c = JSON.parse(localStorage.getItem('mercados:v1') || '{}'); c.proxy = ''; localStorage.setItem('mercados:v1', JSON.stringify(c)); });
    await page.reload();
    await page.waitForFunction(() => document.querySelector('[data-key="c:BTC"] .px') && /€/.test(document.querySelector('[data-key="c:BTC"] .px').textContent));
    assert.ok(await page.locator('.banner').isVisible(), 'aviso do conector');
    assert.match(await page.locator('#mk-status').textContent(), /Cripto ao vivo/);
    console.log('✓ sem conector: cripto ao vivo', await page.locator('[data-key="c:BTC"] .px').first().textContent());
    await page.close();

    // 2) com conector
    await ctx.addInitScript(() => { const c = JSON.parse(localStorage.getItem('mercados:v1') || '{}'); if (!c.proxySet) { c.proxy = 'https://proxy.test'; c.proxySet = 1; localStorage.setItem('mercados:v1', JSON.stringify(c)); } });
    page = await ctx.newPage();
    page.on('pageerror', (e) => { errors.push('pageerror: ' + e.message); if (process.env.STACK) console.log(e.stack); });
    page.on('console', (m) => { if (m.type() === 'error' && !/ERR_FAILED|net::/.test(m.text())) errors.push('console: ' + m.text()); });
    page.on('dialog', (d) => { errors.push('dialog (XSS?): ' + d.message()); d.dismiss(); });
    await page.goto(url);
    await page.waitForFunction(() => window.__mk && window.__mk.st.yahooAt > 0);
    await page.waitForFunction(() => document.body.textContent.includes('Gasóleo simples'));
    assert.equal(await page.locator('.banner').count(), 0);
    const brent = await page.locator('[data-key="BZ=F"] .px').first().textContent();
    assert.match(brent, /64,20/);
    assert.match(await page.locator('[data-key="RB=F"]').first().textContent(), /€.*\/L|\/L/);
    assert.equal(await page.locator('.sec:has(h2:text("Ações que sigo")) .row').count(), 23);
    const firstStock = await page.locator('.sec:has(h2:text("Ações que sigo")) .row .r-name').first().textContent();
    assert.equal(firstStock, 'Allianz', 'ordenado pela maior subida');
    assert.equal(await page.locator('.sec:has(h2:text("Ações que sigo")) .row[data-key$=".LS"]').count(), 0, 'sem ações portuguesas por omissão');
    // ordenar: desce → a maior descida primeiro; bolsa → grupos (EUA, Alemanha…); minha → setas em Ajustes
    const stockSec = '.sec:has(h2:text("Ações que sigo"))';
    await page.click(stockSec + ' [data-sort="down"]');
    assert.equal(await page.locator(stockSec + ' .row .r-name').first().textContent(), 'Tesla', 'maior descida primeiro');
    await page.click(stockSec + ' [data-sort="mkt"]');
    const grps = await page.locator(stockSec + ' .grp-h').allTextContents();
    assert.ok(grps.some((g) => /^EUA/.test(g)) && grps.some((g) => /^Alemanha/.test(g)), 'grupos por bolsa: ' + grps.join(' | '));
    // Carteira (4.12): o simulador do plano, desenhado pela Onda
    const orc0 = await page.evaluate(() => window.__mk.cfg.budget);
    await page.click('#mk-nav [data-tab="carteira"]');
    await page.waitForSelector('.sim');
    const campo = async (k, v) => { await page.evaluate(([k, v]) => { const i = document.querySelector(`.sim [data-cfg="${k}"]`); i.value = String(v); i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); }, [k, v]); };
    await campo('budget', 900);
    await page.waitForSelector('.sim-big b');
    assert.match(await page.locator('.sim-big b').textContent(), /^\d{1,3}(\s\d{3})*\s€$/, 'o valor no fim, em euros');
    assert.equal(await page.locator('.sim-meta').count(), 0, 'sem objetivo, sem caixa');
    await campo('simGoal', 300000);
    await page.waitForSelector('.sim-meta');
    assert.match(await page.locator('.sim-meta p').first().textContent(), /^Chegas lá em \d+ anos/);
    await campo('simYears', 10);
    assert.equal(await page.locator('.sim-tab tbody tr:last-child td').first().textContent(), '10 anos');
    // − e +: 10 → 11 anos; e de volta
    await page.click('.sim [data-act="sim-step"][data-k="simYears"][data-d="1"]');
    assert.equal(await page.locator('.sim [data-out="simYears"]').textContent(), '11 anos');
    await page.click('.sim [data-act="sim-step"][data-k="simYears"][data-d="-1"]');
    assert.equal(await page.locator('.sim [data-out="simYears"]').textContent(), '10 anos');
    // em euros de hoje: menos do que o valor no futuro
    const futuro = await page.locator('.sim-big b').textContent();
    await page.click('[data-act="sim-hoje"][data-v="1"]');
    if (SHOTS) { await page.locator('.sim').scrollIntoViewIfNeeded(); await page.locator('.sim').screenshot({ path: path.join(SHOTS, '8d-carteira-hoje.png') }); }
    const hoje = await page.locator('.sim-big b').textContent();
    const n = (x) => +x.replace(/[^\d]/g, '');
    assert.ok(n(hoje) < n(futuro) && Math.abs(n(hoje) * 1.02 ** 10 / n(futuro) - 1) < 0.001, `euros de hoje: ${hoje} vs ${futuro}`);
    assert.match(await page.locator('.sim-big small').textContent(), /em euros de hoje/);
    assert.match(await page.locator('.sim-infl').textContent(), /^Com 2 % de inflação por ano, 1000 € daqui a 10 anos compram o mesmo que 820\s€ hoje\.$/);
    await page.click('[data-act="sim-hoje"][data-v="0"]');
    await page.locator('.sim svg.sim-g').scrollIntoViewIfNeeded();
    const gb = await page.locator('.sim svg.sim-g').boundingBox();
    await page.mouse.move(gb.x + gb.width * 0.55, gb.y + gb.height / 2);
    assert.match(await page.locator('#sim-tip').textContent(), /^Em [56] anos: [\d\s]+€ · entre .+ · investido [\d\s]+€$/, 'o dedo no gráfico mostra o ano');
    await page.mouse.move(gb.x + gb.width * 0.99, gb.y + gb.height / 2);
    assert.match(await page.locator('#sim-tip').textContent(), /^Em 10 anos: /);
    if (SHOTS) { await page.mouse.move(gb.x + gb.width * 0.7, gb.y + gb.height / 2); await page.locator('.sim').screenshot({ path: path.join(SHOTS, '8b-carteira-dedo.png') }); }
    assert.equal(await page.locator('#mk-nav [data-tab="carteira"].on').count(), 1);
    console.log('✓ carteira:', (await page.locator('.sim-big').textContent()).replace(/\s+/g, ' ').trim(), '|', await page.locator('.sim-meta p').first().textContent());
    // o rendimento real (4.13): desde quando compra pelo plano
    // (o BTC já traz compras do teste das datas da cripto; o fundo ainda não)
    await page.click('.real [data-act="real-ed"]');
    assert.equal(await page.locator('details.real-ed[open]').count(), 1, 'Editar o que tenho abre o editor');
    await page.evaluate(() => window.__mk.render());
    assert.equal(await page.locator('details.real-ed[open]').count(), 1, 'continua aberto quando o ecrã se redesenha (preços novos)');
    assert.equal(await page.locator('.pg-t').textContent(), 'Carteira');
    await page.click('.sim details.how > summary');
    await page.evaluate(() => window.__mk.render());
    assert.equal(await page.locator('.sim details.how[open]').count(), 1, 'Como é feita a conta continua aberto');
    const desde = (k, iso) => page.evaluate(([k, iso]) => { const i = document.querySelector(`[data-lot="plan"][data-k="${k}"]`); i.value = iso; i.dispatchEvent(new Event('change', { bubbles: true })); }, [k, iso]);
    const isoAtras = (dias) => new Date(Date.now() - dias * 86400000).toISOString().slice(0, 10);
    await desde('VWCE.DE', isoAtras(300));
    await page.waitForSelector('.real .sim-big b', { timeout: 10000 });
    assert.match(await page.locator('.real .sim-big b').textContent(), /^\d[\d\s]*\s€$/, 'vale hoje (o pt-PT só agrupa a partir de 10 000)');
    assert.ok((await page.locator('.real .real-l .row').evaluateAll((rs) => rs.map((r) => r.dataset.open))).includes('VWCE.DE'), 'o fundo entra');
    assert.match(await page.locator('.real .sim-st div:first-child b').textContent(), /€$/, 'investido');
    assert.equal(await page.evaluate(() => window.__mk.cfg.lots['VWCE.DE'].plan), isoAtras(300), 'fica guardado');
    // colar de uma vez: uma linha por ativo (símbolo, quantidade, preço médio)
    await page.fill('#lot-imp', 'VWCE.DE 5,486463 169,86\nBTC 0,044679 73722,55\nSolana 3,488363 102,03\nxpto 1 2');
    await page.click('[data-act="lot-import"]');
    assert.deepEqual(await page.evaluate(() => ['VWCE.DE', 'c:BTC', 'c:SOL'].map((k) => [window.__mk.cfg.lots[k].qty, window.__mk.cfg.lots[k].avg, window.__mk.cfg.lots[k].cost])),
        [[5.486463, 169.86, 931.93], [0.044679, 73722.55, 3293.85], [3.488363, 102.03, 355.92]], 'importadas, com o investido calculado');
    assert.match(await page.locator('#mk-toast').textContent(), /3 posições importadas · não percebi: xpto/);
    await page.evaluate(() => { for (const k of ['c:BTC', 'c:SOL']) { delete window.__mk.cfg.lots[k].qty; delete window.__mk.cfg.lots[k].avg; delete window.__mk.cfg.lots[k].cost; } delete window.__mk.cfg.lots['VWCE.DE']; window.__mk.render(); });
    // o que tem hoje, sem plano: o Ether com quantidade e investido (sem data)
    const lot = (k, campo, v) => page.evaluate(([k, campo, v]) => { const i = document.querySelector(`[data-lot="${campo}"][data-k="${k}"]`); i.value = v; i.dispatchEvent(new Event('change', { bubbles: true })); }, [k, campo, v]);
    await lot('c:ETH', 'qty', '0,5'); await lot('c:ETH', 'avg', '2 400');
    assert.deepEqual(await page.evaluate(() => [window.__mk.cfg.lots['c:ETH'].qty, window.__mk.cfg.lots['c:ETH'].cost]), [0.5, 1200], 'a vírgula e o espaço do teclado do iPhone; o investido = quantidade × preço médio');
    await page.waitForSelector('.real .real-l .row[data-open="c:ETH"]');
    assert.equal(await page.locator('.real svg').count(), 0, 'sem data no Ether: sem gráfico');
    if (SHOTS) { await page.locator('.real-ed').evaluate((d) => { d.open = true; }); await page.locator('.real-ed').screenshot({ path: path.join(SHOTS, '8e-carteira-editor.png') }); }
    await lot('c:ETH', 'qd', isoAtras(500));
    await page.waitForSelector('.real svg');
    if (SHOTS) await page.locator('.real').screenshot({ path: path.join(SHOTS, '8c-carteira-real.png') });
    console.log('✓ carteira real:', (await page.locator('.real .sim-big').textContent()).replace(/\s+/g, ' ').trim());
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, '8-carteira.png'), fullPage: true });
    await page.evaluate((b) => { Object.assign(window.__mk.cfg, { budget: b, simGoal: 0, simYears: 20 }); delete window.__mk.cfg.lots['VWCE.DE']; delete window.__mk.cfg.lots['c:ETH']; }, orc0);
    await page.click('#mk-nav [data-tab="ajustes"]');
    const firstW = await page.evaluate(() => window.__mk.cfg.watch[0]), secondW = await page.evaluate(() => window.__mk.cfg.watch[1]);
    await page.click(`[data-mv="${secondW}"][data-dir="top"]`);
    assert.deepEqual(await page.evaluate(() => window.__mk.cfg.watch.slice(0, 2)), [secondW, firstW], '⤒ põe no topo');
    // arrastar pela pega: a 4.ª linha de ações vai para o 1.º lugar
    const w4 = await page.evaluate(() => window.__mk.cfg.watch.slice(0, 4));
    const hb = await page.locator(`.wl-i[data-wk="${w4[3]}"] .wl-h`).boundingBox();
    const tb = await page.locator(`.wl-i[data-wk="${w4[0]}"]`).boundingBox();
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
    await page.mouse.down();
    for (let i = 1; i <= 8; i++) await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2 + (tb.y + 4 - hb.y - hb.height / 2) * i / 8);
    await page.mouse.up();
    assert.deepEqual(await page.evaluate(() => window.__mk.cfg.watch.slice(0, 4)), [w4[3], w4[0], w4[1], w4[2]], 'arrastar pela pega muda a ordem');
    await page.click(`[data-mv="${secondW}"][data-dir="top"]`);
    assert.equal(await page.evaluate(() => window.__mk.cfg.sort), 'mine');
    await page.click('#mk-nav [data-tab="painel"]');
    assert.equal(await page.locator(stockSec + ' .row').first().getAttribute('data-key'), secondW, 'Painel segue a minha ordem');
    await page.click(stockSec + ' [data-sort="up"]');
    console.log('✓ ordenar ações: desce, bolsa (' + grps.length + ' grupos), minha ordem');
    console.log('✓ painel: Brent', brent, '| 1.ª ação', firstStock);
    const firstSec = await page.locator('#mk-body .sec h2').first().textContent();
    assert.equal(firstSec, 'Os meus ativos', 'os meus ativos em primeiro');
    assert.equal(await page.locator('.sec:has(h2:text("Os meus ativos")) .row').count(), 5, 'VWCE + 4 cripto');
    // "Hoje": a análise do Claude e o resumo num só cartão, compacto: as 3 linhas do Claude e a próxima execução à vista;
    // o resto numa dobra, fechada até se tocar (como as outras linhas que abrem)
    await page.waitForSelector('.today .tldr', { timeout: 15000 });
    assert.equal(await page.locator('details.today[open]').count(), 0, 'compacto: fechado');
    assert.ok(await page.locator('.today > summary .tldr').isVisible(), 'as 3 linhas do Claude à vista');
    assert.match(await page.locator('.today > summary .hj-ex').textContent(), /^(Próxima execução|Hoje executam os planos|Hoje é o último dia para ajustar os planos): .+810\s€ FTSE All-World USD \(Acc\) \+ 90\s€ Bitcoin$/, 'e a próxima execução, com os valores');
    assert.equal(await page.locator('.claude, .brief, .ideas.cl').count(), 0, 'sem cartões repetidos');
    assert.match(await page.locator('.today > summary').textContent(), /Hoje/);
    assert.equal(await page.locator('.today .i-h:has-text("Plano do mês")').count(), 1, 'um só plano do mês');
    assert.equal(await page.locator('.today .note').count(), 0, 'sem parágrafos a explicar no cartão');
    await page.waitForSelector('.today .i-h:has-text("Agenda")', { state: 'attached' });
    await page.click('.today > summary');
    assert.equal(await page.locator('details.today[open]').count(), 1, 'abre ao tocar');
    assert.match(await page.locator('.today').textContent(), /Nvidia: apresenta resultados/);
    console.log('✓ agenda no Hoje:', (await page.locator('.today .i-blk:has-text("Agenda") .idea').allTextContents()).length, 'eventos');
    // fora do que tem: as ideias de maior convicção do Claude (compras e vendas)
    assert.match(await page.locator('.today .i-blk:has-text("Também a seguir") .idea').first().textContent(), /^Nvidia[\s\S]*Comprar aos poucos$/);
    await page.click('.today .i-blk:has-text("Agenda") button.idea:has-text("Nvidia")');
    await page.waitForSelector('.advice .adv-ev');
    assert.match(await page.locator('.advice .adv-ev').textContent(), /Resultados daqui a 5 dias/);
    await page.click('[data-act="close"] >> nth=-1');
    await page.waitForFunction(() => document.querySelector('#mk-sheet').hidden);
    console.log('✓ aviso de resultados no conselho');
    assert.match(await page.locator('.today').textContent(), /manter o plano no VWCE/);
    assert.match(await page.locator('.today > summary .hj-src').textContent(), /^Claude · (\d\d\/\d\d )?\d\d:\d\d( · atrasada)?$/, 'de onde vem: o Claude e a hora');
    assert.equal(await page.locator('.today .plan-blk .idea').count(), 2, 'plano do Claude');
    assert.match(await page.locator('.sec:has(h2:text("Os meus ativos")) .row[data-key="c:BTC"] .badge').textContent(), /^Manter$/, 'conselho do Claude no ativo: tenho-o, por isso Manter (e não Aguardar)');
    assert.equal(await page.locator('.sec:has(h2:text-is("Cripto"))').count(), 0, 'cripto que tenho não se repete');
    assert.equal(await page.locator('#mk-body h1.pg-t').textContent(), 'Painel');
    console.log('✓ Hoje: análise do Claude + plano | conselho nos meus ativos');
    assert.equal(await page.locator('.today .tldr .tl').count(), 3, 'resumo em 3 linhas');
    assert.match(await page.locator('.today .tldr').textContent(), /Plano: manter 810/);
    assert.equal(await page.locator('.today .tldr .tl b').first().textContent(), 'Mercado:', 'a etiqueta de cada linha a negro');
    // o Cripto hoje e o Agora estão nos Destaques (conferidos lá), não no Painel
    assert.equal(await page.locator('#mk-body .sec:has(h2:text-is("Cripto hoje")), #mk-body .sec:has(h2:text-is("Agora")), #mk-body .cg, #mk-body .now-box').count(), 0, 'sem o Cripto hoje nem o Agora');
    console.log('✓ resumo em 3 linhas; o Cripto hoje e o Agora fora do Painel');
    // ao vivo: cada preço da Binance entra no gráfico do dia
    const tail0 = await page.evaluate(() => { const s = window.__mk.Q['c:BTC'].series; return s[s.length - 1][0]; });
    await page.waitForFunction((t0) => { const s = window.__mk.Q['c:BTC'].series; return s[s.length - 1][0] > t0; }, tail0, { timeout: 15000 });
    console.log('✓ gráfico do dia recebe os preços ao vivo');
    assert.match(await page.locator('.today .i-blk:has-text("Porque sobem ou descem")').textContent(), /Tesla[\s\S]*resultados abaixo do esperado/, 'motivo do movimento no Hoje');
    // letra: texto principal ≥ 16 px e notas ≥ 12,5 px (no iPhone a base é 17 px, aqui é 16 px)
    const fsz = await page.evaluate(() => Object.fromEntries([['nome', '.row .r-name'], ['nota', '.note'], ['título', 'h1.pg-t'], ['secção', '.sec-h h2']].map(([n, q]) => [n, parseFloat(getComputedStyle(document.querySelector(q)).fontSize)])));
    assert.ok(fsz.nome >= 16 && fsz.nota >= 12.5 && fsz['título'] >= 30, JSON.stringify(fsz));
    console.log('✓ tamanhos de letra (px):', JSON.stringify(fsz));
    const narrow = await page.evaluate(() => [...document.querySelectorAll('.sec .row')].filter((r) => r.offsetParent).map((r) => [r.dataset.key, Math.round(r.querySelector('.r-main').getBoundingClientRect().width)]).filter(([, w]) => w < 100));
    assert.deepEqual(narrow, [], 'nome com espaço suficiente nas linhas: ' + JSON.stringify(narrow));
    const fund = await page.locator('.row[data-key="VWCE.DE"] .px').first().textContent();
    assert.match(fund, /163,80\s*€/, 'fundo com o preço da noite (Munique): ' + fund);
    assert.match(await page.locator('.row[data-key="VWCE.DE"] .chg').first().textContent(), /−3,90%/, "variação face ao fecho de Munique (como a TR)");
    // ficha do VWCE: gráfico do dia = o do Painel (Munique), e no mês o "no período" bate com o número de cima
    await page.locator('.row[data-open="VWCE.DE"]').first().click();
    await page.waitForFunction(() => document.querySelector('#d-load') && document.querySelector('#d-load').hidden);
    // a ficha refaz o HTML quando chega a análise: espera pela dica do desenho novo
    await page.waitForFunction(() => /Último preço/.test((document.querySelector('#d-tip') || {}).textContent || ''), null, { timeout: 5000 }).catch(() => {});
    assert.match(await page.locator('#d-tip').textContent(), /Último preço (de ontem )?às \d\d:\d\d/, 'ficha: hora do último preço');
    // gráfico do dia dos fundos: Xetra (denso) + Munique depois do fecho da Xetra
    const md = await page.evaluate(() => { const t0 = Math.floor(new Date().setHours(9, 0, 0, 0) / 1000); const x = Array.from({ length: 10 }, (_, i) => [t0 + i * 300, 160 + i]); const g = [[t0 + 600, 161], [t0 + 9 * 3600, 170], [t0 + 12 * 3600, 171]]; return window.__mk.mergeDay(x, g).map((p) => p[1]); });
    assert.deepEqual(md, [160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171], 'Xetra até ao fecho e depois Munique');
    const dayEnd = await page.evaluate(() => { const mk = window.__mk; const s = mk.Q['VWCE.MU'].series; return [s[s.length - 1][1], mk.Q['VWCE.MU'].price]; });
    assert.ok(Math.abs(dayEnd[0] - dayEnd[1]) < 0.01, 'gráfico do dia acaba no preço de Munique');
    await page.click('.ranges [data-range="1mo"]');
    await page.waitForFunction(() => /No período/.test(document.querySelector('#d-tip').textContent));
    const top = (await page.locator('#d-px .chg').textContent()).trim();
    const per = (await page.locator('#d-tip .up-t, #d-tip .down-t, #d-tip .flat-t').first().textContent()).trim();
    assert.equal(per, top, 'no período = variação de cima');
    assert.doesNotMatch(await page.locator('#d-px .alt').textContent(), /-\d|,\d{3}\s*€/, 'diferença com sinal − e 2 casas');
    console.log('✓ ficha VWCE: 1 mês', top, '| diferença', (await page.locator('#d-px .alt').textContent()).trim());
    await page.click('[data-act="close"] >> nth=-1');
    await page.waitForFunction(() => document.querySelector('#mk-sheet').hidden);
    // preço que não é ao vivo: mostra a hora (ou o dia) do último preço; a cripto ao vivo não
    assert.deepEqual(await page.locator('#mk-body > details.pn-f > summary .f-t').evaluateAll((els) => els.map((e) => e.firstChild.textContent)), ['Índices, câmbio e ouro', 'Petróleo e energia', 'Combustíveis em Portugal'], 'no fim, fechados');
    assert.equal(await page.locator('#mk-body > details.pn-f[open]').count(), 0, 'todos fechados');
    assert.match(await page.locator('details[data-fold="pn-idx"] > summary small').textContent(), /^S&P 500 [−+]\d+,\d\d% · Nasdaq [−+]\d+,\d\d% · Euro Stoxx 50 [−+]\d+,\d\d%$/, 'uma linha de resumo');
    assert.match(await page.locator('details[data-fold="pn-fuel"] > summary small').textContent(), /^Gasóleo simples 1,599\s€ · Gasolina simples 95 1,739\s€$/);
    assert.equal(await page.evaluate(() => [...document.querySelectorAll('#mk-body .note, #mk-body p')].filter((e) => !e.closest('details')).length), 0, 'sem parágrafos a explicar');
    const tIdx = await page.locator('details[data-fold="pn-idx"] .row .r-t').first().textContent();
    assert.match(tIdx, /^\d{1,2}:\d{2}$|^\d{1,2}\/\d{1,2}$|^ontem$/, 'hora do último preço: ' + tIdx);
    assert.equal(await page.locator('.row[data-key="c:BTC"] .r-t').count(), 0, 'cripto ao vivo sem hora');
    const nv = await page.locator('.row[data-key="NVDA"] .px').first().textContent();
    assert.match(nv, /€/, 'ações americanas em euros: ' + nv);
    assert.match(await page.locator('.row[data-key="NOVO-B.CO"] .px').first().textContent(), /€/, 'coroas dinamarquesas em euros');
    console.log('✓ fundos e euros: VWCE', fund, '| Nvidia', nv);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, '1-painel.png') });
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, '1b-painel-completo.png'), fullPage: true });

    // destaques: simples como a Análise — o sentimento numa linha (com os índices do dia), uma lista por secção com as
    // linhas do Painel (o porquê numa linha pequena: o motivo do Claude ou a notícia) e o resto em linhas fechadas no fim
    await page.click('#mk-nav [data-tab="destaques"]');
    await page.waitForFunction(() => document.querySelectorAll('.hl-row .hl-w').length >= 4);
    assert.equal(await page.locator('[data-lim]').count(), 0, 'sem filtros de ±X%');
    assert.deepEqual(await page.locator('#mk-body .sec-h h2').allTextContents(), ['Os meus ativos hoje', 'Mais sobem', 'Mais caem'], 'uma lista por secção');
    const mineH = await page.locator('.sec:has(h2:text-is("Os meus ativos hoje")) .row .r-name').allTextContents();
    assert.deepEqual(mineH, ['FTSE All-World USD (Acc)', 'Bitcoin', 'Ether', 'Solana', 'XRP'], 'os meus ativos, pela ordem dos Ajustes');
    const ups = await page.locator('.sec:has(h2:text-is("Mais sobem")) .row .r-name').allTextContents();
    const downs = await page.locator('.sec:has(h2:text-is("Mais caem")) .row .r-name').allTextContents();
    assert.deepEqual(ups.slice(0, 2), ['Allianz', 'Nvidia'], 'subidas: ' + ups);
    assert.deepEqual(downs.slice(0, 2), ['Tesla', 'TotalEnergies'], 'descidas: ' + downs);
    assert.ok(ups.length === 5 && downs.length === 5, 'cinco de cada lado');
    // o porquê numa linha pequena: o motivo do Claude (Tesla), com o ponto dele, ou a notícia do dia, com o da cor do tom
    assert.equal(await page.locator('.row[data-key="TSLA"] .r-sub').textContent(), 'Cai depois de resultados abaixo do esperado.');
    assert.equal(await page.locator('.row[data-key="TSLA"] .hl-w.cl').count(), 1);
    assert.match(await page.locator('.row[data-key="ALV.DE"] .hl-w').getAttribute('class'), /^hl-w (up|down|flat)$/);
    assert.match(await page.locator('.row[data-key="VWCE.DE"] .px').textContent(), /^163,80\s€$/, 'o preço da noite (Munique), como no Painel');
    assert.equal(await page.locator('.row[data-key="VWCE.DE"] .chg').textContent(), '−3,90%', 'e a variação do dia face ao fecho de Munique');
    assert.equal(await page.evaluate(() => [...document.querySelectorAll('#mk-body .note')].filter((e) => !e.closest('details')).length), 0, 'sem parágrafos a explicar');
    // em cima o sentimento do mercado, com os índices do dia; no fim, fechados: o mercado dos EUA e a cripto hoje
    assert.match(await page.locator('details.hl-mood > summary').textContent(), /^Sentimento do mercadoS&P 500 [−+]?\d+,\d\d% · Nasdaq [−+]?\d+,\d\d% · Euro Stoxx [−+]?\d+,\d\d%(Otimista|Pessimista|Misto)$/);
    await page.waitForSelector('details[data-fold="hl-eua"] .row[data-key="XYZ"]', { state: 'attached' });
    assert.equal(await page.locator('details[data-fold="hl-eua"] > summary small').textContent(), 'Xyz Therapeutics +38,20% · Abcd Corp −22,50%');
    assert.equal(await page.locator('details[data-fold="hl-cripto"] > summary').textContent(), 'Cripto hojeMedo extremo · mercado −3,20% em 24 h24');
    assert.equal(await page.locator('#mk-body details[open]').count(), 0, 'as linhas do fim fechadas');
    console.log('✓ destaques: sobem', ups.join(', '), '| caem', downs.join(', '));
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, '2-destaques.png') });
    // abrir uma linha do fim: fica aberta quando o ecrã se atualiza (preços ao vivo); uma da lista dos EUA abre a ficha
    await page.click('details[data-fold="hl-eua"] > summary');
    await page.evaluate(() => window.__mk.render());
    assert.equal(await page.locator('details[data-fold="hl-eua"][open]').count(), 1, 'fica aberta ao atualizar');
    await page.click('details[data-fold="hl-eua"] .row[data-open="XYZ"]');
    await page.waitForFunction(() => !document.querySelector('#mk-sheet').hidden && /Xyz Therapeutics/.test(document.querySelector('#mk-sheet-card').textContent));
    await page.click('[data-act="close"] >> nth=-1');
    await page.waitForFunction(() => document.querySelector('#mk-sheet').hidden);
    await page.click('details[data-fold="hl-eua"] > summary');
    assert.equal(await page.locator('details[data-fold="hl-eua"][open]').count(), 0, 'e volta a fechar');
    console.log('✓ destaques: o sentimento numa linha, o porquê do Claude ou da notícia, os EUA e a cripto fechados');

    assert.ok(await page.locator('details.hl-mood').isVisible(), 'sentimento do mercado nos Destaques');
    // análise: simples como a Trade Republic — o prazo, o filtro e UMA lista (a convicção do Claude pelo prazo; o que ele
    // não analisou no fim, com o sinal automático, marcado "auto"); o resto em linhas fechadas no fim
    await page.click('#mk-nav [data-tab="analise"]');
    await page.waitForSelector('.chips [data-filter="plan"].on');
    const lst = '.an-list';
    const planRows = await page.locator(lst + ' .row').evaluateAll((els) => els.map((e) => e.dataset.open));
    assert.ok(planRows.length >= 8 && planRows.every((k) => /^c:|\.DE$/.test(k)), 'filtro ETF + cripto: ' + planRows);
    assert.deepEqual(await page.locator('.seg.hz button').allTextContents(), ['Curto', 'Médio', 'Longo', 'Desconto'], 'prazos, sem subtítulos');
    assert.deepEqual(await page.locator('.chips[aria-label="Filtro"] button').allTextContents(), ['ETF + cripto', 'Tudo', 'ETF', 'Cripto', 'Ações'], 'filtros, sem os futuros');
    await page.click('.chips [data-filter="all"]');
    await page.click('.seg.hz [data-hz="mid"]');
    await page.waitForFunction(() => document.querySelectorAll('.an-list .row').length > 20);
    assert.equal(await page.locator('.hl-mood').count(), 0, 'sentimento só nos Destaques');
    assert.match(await page.locator('.an-src').textContent(), /^Claude · (\d\d\/\d\d )?\d\d:\d\d$/, 'de onde vem a lista, numa linha pequena');
    assert.equal(await page.locator('#mk-body .top3, #mk-body .medal, #mk-body h2').count(), 0, 'sem pódio nem títulos repetidos');
    assert.equal(await page.evaluate(() => [...document.querySelectorAll('#mk-body .note')].filter((e) => !e.closest('details')).length), 0, 'sem parágrafos a explicar (só dentro das linhas que abrem)');
    const rowsOf = (sel) => page.locator(sel).evaluateAll((els) => els.map((e) => [e.dataset.open, +e.querySelector('.r-score .val').textContent, !!e.querySelector('.an-auto')]));
    const desc = (a) => a.every((x, i) => !i || a[i - 1][1] >= x[1]);
    const rows = await rowsOf(lst + ' .row'), rowsCl = rows.filter((x) => !x[2]), rowsAuto = rows.filter((x) => x[2]);
    assert.deepEqual(rows.slice(0, 3).map((x) => x[0]), ['NVDA', 'ALV.DE', 'VWCE.DE'], 'primeiro a convicção do Claude a médio prazo');
    assert.ok(desc(rowsCl) && desc(rowsAuto), 'ordenada pela convicção do Claude e depois pelo algoritmo');
    assert.deepEqual(rowsAuto.map((x) => x[0]).sort(), ['RHM.DE', 'TSM', 'c:ETH', 'c:XRP'], 'o que o Claude não analisou fica no fim, com o sinal automático (auto)');
    assert.equal(rows.findIndex((x) => x[2]), rowsCl.length, 'os automáticos todos no fim');
    const order = rowsCl.map((x) => x[0]);
    assert.equal(order.indexOf('MSFT') + 1, order.indexOf('AAPL'), 'empate (76): decide a classificação do Claude');
    assert.ok(rows.every(([, v]) => v >= 0 && v <= 100));
    // cada linha como as do Painel: o ícone redondo, o nome, o símbolo e a variação do dia; à direita a pontuação e o veredicto
    const nvr = lst + ' .row[data-open="NVDA"]';
    assert.equal(await page.locator(nvr + ' .r-ico').evaluate((e) => e.outerHTML), await page.evaluate(() => window.__mk.ico('NVDA')), 'o ícone do Painel');
    assert.equal(await page.locator(nvr + ' .r-name').textContent(), 'Nvidia');
    assert.match(await page.locator(nvr + ' .r-sub').textContent(), /^NVDA · \+5,20%/, 'símbolo e variação do dia');
    assert.equal(await page.locator(nvr + ' .r-score .val').textContent(), '88');
    assert.equal(await page.locator(nvr + ' .lbl').textContent(), 'Comprar', 'família entrar, sem o ativo: Comprar');
    assert.match(await page.locator(nvr + ' .lbl').getAttribute('class'), /\bup-t\b/, 'o veredicto com a cor do tom');
    // ≠ algoritmo: só onde o veredicto do Claude é de outra família (entrar, ficar, sair) que o do algoritmo
    const dif = await page.evaluate(() => {
        const mk = window.__mk, FAM = { buy: 1, scale: 1, hold: 0, wait: 0, neutral: 0, turn: 0, reduce: -1, sell: -1, avoid: -1 };
        const cl = Object.fromEntries(mk.claude.actions.map((a) => [a.s, a.key]));
        const rs = [...document.querySelectorAll('.an-list .row')];
        const want = rs.filter((r) => { const k = r.dataset.open, c = cl[k], a = mk.AN[k] && mk.AN[k].advice && mk.AN[k].advice.key; return c in FAM && a in FAM && FAM[c] !== FAM[a]; }).map((r) => r.dataset.open);
        const got = rs.filter((r) => r.querySelector('.alg-diff')).map((r) => r.dataset.open);
        return { want, got, txt: [...new Set(rs.map((r) => r.querySelector('.alg-diff')).filter(Boolean).map((e) => e.textContent))] };
    });
    assert.ok(dif.want.length >= 1, 'há discordâncias nos dados de teste');
    assert.deepEqual(dif.got, dif.want, '≠ algoritmo onde o Claude e o algoritmo discordam');
    assert.deepEqual(dif.txt, ['≠ algoritmo']);
    console.log('✓ análise: uma lista pela convicção do Claude, n =', rowsCl.length, '+', rowsAuto.length, 'automáticos;', dif.got.length, '≠ algoritmo');
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, '3-analise.png') });
    const allKeys = rows.map((x) => x[0]);
    assert.ok(!allKeys.some((k) => /=F$|^\^/.test(k)), '"Tudo" só com o que se compra na TR: ' + allKeys.filter((k) => /=F$|^\^/.test(k)));
    assert.ok(allKeys.includes('SXR8.DE') && allKeys.includes('c:BTC'));
    // o resto, em linhas fechadas no fim, cada uma com uma linha de resumo
    assert.deepEqual(await page.locator('details.an-f > summary .f-t').evaluateAll((els) => els.map((e) => e.firstChild.textContent)), ['Toda a Trade Republic', 'Sinais automáticos', 'Resultados', 'Sobre as pontuações']);
    assert.equal(await page.locator('details.an-f[open]').count(), 0, 'todas fechadas');
    const auto = 'details[data-fold="an-auto"]', res = 'details[data-fold="an-res"]';
    assert.match(await page.locator(auto + ' > summary small').textContent(), /^(Oportunidades: .+|Regras fixas, para comparar)$/);
    assert.match(await page.locator(auto).textContent(), /Pontuação automática a médio prazo/);
    await page.waitForFunction(() => window.__mk.journal);
    await page.evaluate(() => window.__mk.render());
    assert.match(await page.locator(res + ' > summary small').textContent(), /^Regras: comprar [+−]\d+,\d\d% vs VWCE · \d+ dias?$/, 'resultados: o "comprar" das regras face ao VWCE');
    // abrir "Sinais automáticos": fica aberto quando o ecrã se atualiza (preços ao vivo)
    await page.click(auto + ' > summary');
    await page.evaluate(() => window.__mk.render());
    assert.equal(await page.locator(auto + '[open]').count(), 1, 'fica aberto ao atualizar');
    await page.click(auto + ' > summary');
    // os resultados: lá dentro os conselhos do Claude, o diário e o teste no passado
    assert.match(await page.locator(res + ' .cl-box').textContent(), /Primeiro dia/);
    assert.match(await page.locator(res + ' .cl-box').textContent(), /aprendeu até agora \(1\)/);
    await page.click(res + ' > summary');
    assert.ok(await page.locator(res + ' .box:has-text("Diário real")').isVisible(), 'os resultados abrem ao tocar');
    await page.evaluate(() => window.__mk.render());
    assert.equal(await page.locator(res + '[open]').count(), 1, 'e ficam abertos ao atualizar');
    await page.click(res + ' > summary');
    console.log('✓ análise: o resto em linhas fechadas (toda a TR, sinais automáticos, resultados, sobre as pontuações)');
    await page.click('.chips [data-filter="crypto"]');
    assert.equal(await page.locator(lst + ' .row').count(), 4);
    assert.equal(await page.locator('details.uni .row').count(), 1, 'toda a TR filtrada: só cripto');
    assert.equal(await page.locator('details.uni .f-n').textContent(), '1');
    await page.click('.chips [data-filter="all"]');
    await page.click('.seg.hz [data-hz="long"]');
    await page.waitForSelector('.seg.hz [data-hz="long"].on');
    const longRows = await rowsOf(lst + ' .row'), longScores = longRows.filter((x) => !x[2]).map((x) => x[1]);
    assert.deepEqual(longScores, [...longScores].sort((a, b) => b - a), 'ordenado pela convicção a longo prazo');
    assert.equal(longRows[0][0], 'VWCE.DE', 'VWCE (90) à frente a longo prazo');
    console.log('✓ análise por prazo: longo, n =', longScores.length);
    await page.click('.seg.hz [data-hz="disc"]');
    await page.waitForSelector('.seg.hz [data-hz="disc"].on');
    const dScores = (await page.locator(lst + ' .r-score .val').allTextContents()).map(Number);
    assert.deepEqual(dScores, [...dScores].sort((a, b) => b - a), 'ordenado pela oportunidade');
    assert.match(await page.locator(lst + ' .row .r-sub').first().textContent(), /do máx\./);
    assert.equal(await page.locator('.an-src').textContent(), 'Algoritmo · veredicto do Claude');
    assert.equal(await page.locator(nvr + ' .lbl').textContent(), 'Comprar', 'o veredicto do Claude nas linhas');
    assert.equal(await page.locator(lst + ' .alg-diff').count(), 0, 'no desconto a lista já é a do algoritmo: sem ≠');
    console.log('✓ modo desconto: n =', dScores.length);
    await page.click('.seg.hz [data-hz="mid"]');
    // ficha a partir da lista: veredicto, convicção por prazo, níveis e porquê do Claude; o algoritmo fechado
    await page.click(lst + ' .row[data-open="NVDA"]');
    await page.waitForSelector('#mk-sheet:not([hidden]) .cl-adv');
    const adv = '#mk-sheet .advice.cl-adv';
    assert.equal(await page.locator(adv + ' .adv-act').textContent(), 'Comprar forte', 'rótulo da família, forte com convicção de 88');
    // o consenso dos analistas (4.14): a segunda opinião de fora, ao lado do veredicto do Claude
    await page.waitForSelector('#mk-sheet .cons-box');
    assert.match(await page.locator('#mk-sheet .cons-box .adv-act').textContent(), /^Compra forte\s+consenso de 58 analistas$/);
    assert.equal(await page.locator('#mk-sheet .cons-box .cons-bar i').count(), 5, 'os votos');
    assert.deepEqual(await page.locator('#mk-sheet .cons-box .cons-leg span').allTextContents(), ['50 comprar · 86 %', '6 manter · 10 %', '2 vender · 3 %'], 'por extenso');
    const cm = await page.locator('#mk-sheet .cons-box .adv-meta').allTextContents();
    assert.match(cm[0], /^As recomendações deste mês \(58\)\. A nota média é 1,4 numa escala de 1 \(compra forte\) a 5 \(venda\): compra forte\.$/);
    assert.match(cm[1], /^Preço-alvo médio a 12 meses: .+€ \(230,50\sUS\$\) \+17,60% face a hoje · o mais baixo .+€ \(150,00\sUS\$\), o mais alto .+€ \(300,00\sUS\$\)\.$/, 'em euros e em dólares: ' + cm[1]);
    assert.match(await page.locator('#mk-sheet .cons-box .adv-alg').textContent(), /Claude: Comprar · concorda com os analistas/);
    if (SHOTS) await page.locator('#mk-sheet .cons-box').screenshot({ path: path.join(SHOTS, '9-consenso.png') });
    assert.equal(await page.locator(adv + ' .adv-nu').textContent(), 'Comprar aos poucos', 'o pormenor do Claude por baixo');
    assert.match(await page.locator(adv + ' .adv-src').textContent(), /^Análise do Claude · feita às \d\d:\d\d de \d\d\/\d\d · próxima (hoje|amanhã) às (07:14|15:14)$/);
    assert.deepEqual(await page.locator(adv + ' .cl-conv .val').allTextContents(), ['48', '88', '81'], 'convicção curto/médio/longo');
    assert.deepEqual(await page.locator(adv + ' .cl-conv small').allTextContents(), ['Curto prazo', 'Médio prazo', 'Longo prazo']);
    const lv = await page.locator(adv + ' .cl-lv li').allTextContents();
    assert.match(lv[0], /^Entrada\s*164,93\s€\s*−3,06%$/, 'entrada em euros e a distância ao preço: ' + lv[0]);
    assert.match(lv[1], /^Alvo\s*199,65\s€\s*\+17,35%$/, lv[1]);
    assert.match(lv[2], /^Stop\s*149,31\s€\s*−12,24%$/, lv[2]);
    assert.match(await page.locator(adv).textContent(), /Desconto de 22%[\s\S]*Plano:\s*Metade agora/);
    assert.match(await page.locator(adv + ' .adv-ev').textContent(), /Resultados daqui a 5 dias/);
    // segunda opinião: o sinal automático ao lado, a dizer se o Claude concorda
    const algTx = (await page.locator(adv + ' .adv-alg').textContent()).replace(/\s+/g, ' ').trim();
    assert.match(algTx, /^Algoritmo: \S.+ — .+\(C\d+ · M\d+ · L\d+\) Claude: (concorda|discorda)/, 'a razão da regra, as pontuações e a do Claude: ' + algTx);
    if (SHOTS) await page.locator(adv).screenshot({ path: path.join(SHOTS, '3c-algoritmo.png') });
    const shAuto = '#mk-sheet details.sh-auto';
    assert.equal(await page.locator(shAuto + ':not([open])').count(), 1, 'sinais automáticos fechados na ficha');
    assert.equal(await page.locator(shAuto + ' .box:has-text("Análise técnica") .hzb').count(), 3, 'pontuações automáticas por prazo');
    assert.equal(await page.locator(shAuto + ' .algo-box .adv-act').count(), 1, 'sinal automático lá dentro');
    assert.equal(await page.locator('#mk-sheet .disc-box').count(), 1);
    if (SHOTS) { await page.locator(adv).scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(SHOTS, '3b-ficha-claude.png') }); }
    await page.click(shAuto + ' > summary');
    assert.ok(await page.locator(shAuto + ' .algo-box').isVisible(), 'abre ao tocar');
    await page.click(shAuto + ' > summary');
    await page.click('[data-act="close"] >> nth=-1');
    await page.waitForFunction(() => document.querySelector('#mk-sheet').hidden);
    console.log('✓ ficha da Nvidia: Comprar aos poucos', lv.map((x) => x.replace(/\s+/g, ' ')).join(' | '));

    // detalhe da Bitcoin
    await page.click('#mk-nav [data-tab="painel"]');
    await page.locator('.row[data-open="c:BTC"]').first().click();
    await page.waitForSelector('#mk-sheet:not([hidden]) .news li');
    await page.waitForFunction(() => { const c = document.querySelector('#d-cv'); return c && c.width > 0 && document.querySelector('#d-load').hidden; });
    const inked = await page.evaluate(() => { const c = document.querySelector('#d-cv'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return n; });
    assert.ok(inked > 500, 'gráfico desenhado');
    assert.equal(await page.evaluate(() => !!(window.GraficoOnda && GraficoOnda.ok)), true, 'gráfico vivo (Onda)');
    await page.waitForFunction(() => GraficoOnda.animando, null, { timeout: 5000 }); // os preços da Binance mexem-no
    assert.equal(await page.locator('.news a[href^="javascript"]').count(), 0, 'links javascript: bloqueados');
    assert.equal(await page.locator('.news img').count(), 0, 'HTML das notícias escapado');
    assert.ok(await page.locator('.box:has-text("Análise técnica") .reasons li').count() >= 4);
    assert.equal(await page.locator('.box:has-text("Análise técnica") .hzb').count(), 3, 'três prazos na folha');
    assert.ok(await page.locator('.disc-box .range52 .bar i').count(), 'barra mínimo–máximo do ano');
    assert.ok(await page.locator('.advice .adv-act').count(), 'o que fazer na TR');
    assert.match(await page.locator('.advice .adv-src').textContent(), /Análise do Claude/);
    assert.equal(await page.locator('.advice .adv-act').textContent(), 'Manter', 'tenho BTC: ficar = Manter');
    assert.equal(await page.locator('.advice .adv-nu').textContent(), 'Esperar', 'e a frase do Claude por baixo');
    assert.equal(await page.locator('#mk-sheet details.sh-auto').count(), 1, 'algoritmo como referência, à parte');
    assert.equal(await page.locator('.advice .cl-lv li').count(), 3, 'entrada, alvo e stop');
    assert.match(await page.locator('.advice').textContent(), /€/);
    assert.ok(await page.locator('.levels li').count() >= 2, 'níveis-chave');
    console.log('✓ conselho BTC:', await page.locator('.advice .adv-act').textContent(), '| níveis', await page.locator('.levels li').count());
    assert.match(await page.locator('.disc-box .dd-big').textContent(), /%/);
    assert.ok((await page.locator('.disc-box .verdict').textContent()).length > 10);
    const box = await page.locator('#d-cv').boundingBox();
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height / 2);
    await page.mouse.move(box.x + box.width * 0.6, box.y + box.height / 2, { steps: 3 });
    assert.match(await page.locator('#d-tip').textContent(), /€/);
    console.log('✓ detalhe: gráfico, análise e notícias; tooltip', await page.locator('#d-tip').textContent());
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, '4-detalhe-btc.png') });
    await page.click('.ranges [data-range="6mo"]');
    await page.waitForFunction(() => document.querySelector('#d-load').hidden);
    assert.match(await page.locator('#d-px .alt').textContent(), /6 meses/, 'variação do período escolhido');
    await page.waitForFunction(() => !GraficoOnda.animando, null, { timeout: 5000 });
    console.log('✓ gráfico vivo: anima com os preços e pára quando assenta');

    // puxar para baixo fecha a folha
    const cdp = await ctx.newCDPSession(page);
    await page.evaluate(() => { document.querySelector('#mk-sheet-card').scrollTop = 0; });
    await page.waitForTimeout(100);
    const g = await page.locator('#mk-sheet-card .grab').boundingBox();
    const tp = (y) => [{ x: g.x + g.width / 2, y }];
    // um gesto: os pontos (y) e a hora de cada toque (ms desde o início), mandados ao Chromium com o timestamp deles
    const puxa = async (ys, ms) => {
        const t0 = Date.now() / 1000;
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: tp(ys[0]), timestamp: t0 });
        for (let i = 1; i < ys.length; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: tp(ys[i]), timestamp: t0 + ms[i] / 1000 });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [], timestamp: t0 + ms[ms.length - 1] / 1000 + 0.01 });
    };
    // longo (250 px em 300 ms): fecha
    await puxa(Array.from({ length: 11 }, (_, i) => g.y + 2 + i * 25), Array.from({ length: 11 }, (_, i) => i * 30));
    await page.waitForFunction(() => document.querySelector('#mk-sheet').hidden, null, { timeout: 2000 });
    console.log('✓ puxar para baixo fecha a folha');
    // puxar pouco e devagar (38 px em 400 ms) não fecha
    await page.locator('.row[data-open="c:ETH"]').first().click();
    await page.waitForSelector('#mk-sheet:not([hidden])');
    await page.waitForTimeout(300); // a folha acabou de abrir (a animação)
    await puxa([g.y + 2, g.y + 40], [0, 400]);
    await page.waitForTimeout(400);
    assert.equal(await page.locator('#mk-sheet').isHidden(), false, 'puxão curto não fecha');
    // … e um puxão curto mas rápido (38 px em 40 ms, como um gesto de fechar) fecha
    await puxa([g.y + 2, g.y + 40], [0, 30]);
    await page.waitForFunction(() => document.querySelector('#mk-sheet').hidden, null, { timeout: 2000 });
    console.log('✓ puxão curto e devagar não fecha; curto e rápido fecha');
    // índice (referência): a leitura do Claude, sem conselho de compra nem impostos; o algoritmo fechado
    await page.click('#mk-nav [data-tab="painel"]');
    await page.click('details[data-fold="pn-idx"] > summary');
    await page.locator('.row[data-open="^GSPC"]').first().click();
    await page.waitForSelector('#mk-sheet:not([hidden]) .cl-adv');
    assert.equal(await page.locator('#mk-sheet .cl-adv h3').textContent(), 'Leitura do Claude');
    assert.match(await page.locator('#mk-sheet .cl-adv .adv-act').textContent(), /^(Em alta|Lateral|Em queda)$/);
    assert.equal(await page.locator('#mk-sheet .cl-adv .cl-conv .cv').count(), 3);
    assert.equal(await page.locator('#mk-sheet .cl-adv .adv-meta').count(), 0, 'sem impostos num índice');
    assert.equal(await page.locator('#mk-sheet details.sh-auto:not([open]) .hzb').count(), 3);
    await page.click('[data-act="close"] >> nth=-1');
    await page.waitForFunction(() => document.querySelector('#mk-sheet').hidden);
    console.log('✓ índice: leitura do Claude (referência)');

    // arrastar uma linha para a esquerda → Retirar (com Desfazer e Repor)
    await page.click('#mk-nav [data-tab="painel"]');
    const idxSel = 'details[data-fold="pn-idx"][open] .sw-wrap';
    const nIdx = await page.locator(idxSel).count();
    const swipeLeft = async (sel) => {
        const b = await page.locator(sel).first().boundingBox();
        const y = b.y + b.height / 2, p = (x) => [{ x, y }];
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: p(b.x + b.width - 30) });
        for (let i = 1; i <= 6; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: p(b.x + b.width - 30 - i * 25) });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await page.waitForTimeout(300);
    };
    await page.locator(idxSel).first().scrollIntoViewIfNeeded();
    const firstIdx = await page.locator(idxSel).first().getAttribute('data-swk');
    await swipeLeft(idxSel);
    assert.equal(await page.locator(idxSel + '.open').count(), 1, 'arrastar mostra Retirar');
    assert.equal(await page.locator('#mk-sheet').isHidden(), true, 'arrastar não abre a ficha');
    await page.locator(idxSel + '.open .sw-del').click();
    assert.equal(await page.locator(idxSel).count(), nIdx - 1, 'retirado da lista');
    assert.match(await page.locator('#mk-toast').textContent(), /retirado.*Desfazer/);
    await page.click('#mk-toast .t-undo');
    assert.equal(await page.locator(idxSel).count(), nIdx, 'desfazer repõe');
    await swipeLeft(idxSel); await page.locator(idxSel + '.open .sw-del').click();
    assert.ok(await page.evaluate((k) => window.__mk.cfg.hidden.includes(k), firstIdx));
    await page.click('details[data-fold="pn-idx"] [data-unhide="index"]');
    assert.equal(await page.locator(idxSel).count(), nIdx, 'Repor traz de volta');
    console.log('✓ arrastar para a esquerda: retirar, desfazer e repor (' + firstIdx + ')');

    // puxar para baixo no topo → atualizar
    await page.click('#mk-nav [data-tab="painel"]');
    await page.evaluate(() => window.scrollTo(0, 0));
    const r0 = await page.evaluate(() => window.__mk.st.lastRefresh || 0);
    const pt = (y) => [{ x: 200, y }];
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(160) });
    for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt(160 + i * 30) });
    assert.match(await page.locator('#mk-ptr').textContent(), /Larga para atualizar/);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForFunction((r) => (window.__mk.st.lastRefresh || 0) > r, r0);
    await page.waitForFunction(() => !window.__mk.st.pulling);
    assert.equal(await page.locator('.mk-top:visible').count(), 0, 'sem barra fixa');
    assert.match(await page.locator('#mk-body .pg-st').textContent(), /Cripto/);
    console.log('✓ puxar para baixo atualiza; estado por baixo do título');

    // letra mais larga (como a do iOS): nada pode passar da largura do ecrã
    await page.addStyleTag({ content: 'body *{letter-spacing:.07em !important}' });
    // e com a letra "Muito grande"
    await page.click('#mk-nav [data-tab="ajustes"]'); await page.click('[data-fs="xl"]');
    assert.equal(await page.evaluate(() => document.documentElement.dataset.fs), 'xl');
    for (const tab of ['painel', 'destaques', 'analise', 'ajustes']) {
        await page.click(`#mk-nav [data-tab="${tab}"]`); await page.waitForTimeout(250);
        const wide = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        assert.ok(wide <= 0, `${tab}: página mais larga que o ecrã (${wide}px)`);
    }
    await page.click('#mk-nav [data-tab="painel"]');
    await page.locator('.row[data-open="c:BTC"]').first().click();
    await page.waitForSelector('#mk-sheet:not([hidden]) .news li');
    const sheetOver = await page.evaluate(() => { const c = document.querySelector('#mk-sheet-card').getBoundingClientRect(); const x = document.querySelector('#mk-sheet-card [data-act="close"]').getBoundingClientRect(); return { c: c.right - innerWidth, x: x.right - innerWidth }; });
    assert.ok(sheetOver.c <= 0 && sheetOver.x <= 0, 'folha e botão fechar dentro do ecrã ' + JSON.stringify(sheetOver));
    await page.click('[data-act="close"] >> nth=-1');
    await page.waitForFunction(() => document.querySelector('#mk-sheet').hidden);
    await page.click('#mk-nav [data-tab="ajustes"]'); await page.click('[data-fs="n"]');
    console.log('✓ letra larga e "Muito grande": nada sai do ecrã');

    // diário: guardou as sugestões de hoje e avalia as antigas
    await page.waitForFunction(() => window.__mk.cfg.jLast, null, { timeout: 15000 });
    assert.ok(jPosts >= 1, 'diário gravado');
    await page.click('#mk-nav [data-tab="analise"]');
    await page.click('details[data-fold="an-res"] > summary');
    await page.waitForSelector('.box:has-text("Diário real") .tt');
    const jt = await page.locator('.box:has-text("Diário real") .tt').textContent();
    assert.match(jt, /Comprar/); assert.match(jt, /Evitar/);
    console.log('✓ diário: gravado e avaliado');
    await page.click('[data-act="backtest"]');
    await page.waitForSelector('.box:has-text("Teste no passado") .tt', { timeout: 30000 });
    assert.match(await page.locator('.box:has-text("Teste no passado")').textContent(), /vs VWCE/);
    console.log('✓ teste no passado:', await page.locator('.box:has-text("Teste no passado") .tt tbody tr').count(), 'linhas');
    await page.click('details[data-fold="an-res"] > summary');

    // plano: orçamento mensal reparte-se em euros
    await page.click('#mk-nav [data-tab="ajustes"]');
    await page.fill('#f-budget', '900');
    await page.locator('#f-budget').dispatchEvent('change');
    await page.click('#mk-nav [data-tab="painel"]');
    const amounts = await page.locator('.today .plan-blk .idea .i-t').allTextContents();
    const total = amounts.reduce((a, t) => a + Number(t.replace(/[^\d,]/g, '').replace(',', '.')), 0);
    assert.ok(Math.abs(total - 900) <= 3, 'plano soma 900 €: ' + amounts.join(' + '));
    assert.deepEqual(amounts.map((t) => t.replace(/\s/g, '')), ['810€', '90€'], 'VWCE 810 € + Bitcoin 90 €');
    assert.match(await page.locator('.today .plan-blk').textContent(), /Bitcoin/);
    assert.equal(await page.locator('details.stocks-fold').count(), 0, 'ações à vista no Painel (só informação)');
    console.log('✓ plano do mês 900 €:', amounts.join(' + '));
    // dias de execução: com 2 e 16, cada execução leva metade
    await page.click('#mk-nav [data-tab="ajustes"]');
    await page.click('[data-sday="16"]');
    await page.click('#mk-nav [data-tab="painel"]');
    const exTxt = await page.locator('.today > summary .hj-ex .ex-a').textContent();
    const ex = [...exTxt.matchAll(/(\d[\d\s\u00a0\u202f]*)\s*€/g)].map((m) => m[0].trim());
    const exTot = ex.reduce((a, t) => a + Number(t.replace(/[^\d,]/g, '').replace(',', '.')), 0);
    assert.ok(Math.abs(exTot - 450) <= 3, 'execução = 450 €: ' + ex.join(' + '));
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-act="ics"]')]);
    const icsPath = await dl.path(); const ics = fs.readFileSync(icsPath, 'utf8');
    assert.match(ics, /RRULE:FREQ=MONTHLY;BYMONTHDAY=1\r\n/); assert.match(ics, /BYMONTHDAY=15/);
    console.log('✓ execução', ex.join(' + '), '| lembretes .ics dias 1 e 15');

    // Finnhub: chave guardada → ações dos EUA em tempo real
    await page.click('#mk-nav [data-tab="ajustes"]');
    await page.fill('#f-fh', 'chave-teste');
    await page.click('[data-act="save-fh"]');
    await page.waitForFunction(() => window.__mk.Q.NVDA && window.__mk.Q.NVDA.price === 250, null, { timeout: 10000 });
    assert.ok(fhSubs >= 10, 'subscreveu as ações dos EUA: ' + fhSubs);
    console.log('✓ Finnhub: Nvidia em tempo real (', fhSubs, 'subscrições)');

    // ajustes: juntar uma ação
    await page.click('#mk-nav [data-tab="ajustes"]');
    await page.fill('#f-add', 'mota');
    await page.click('[data-add="EGL.LS"]');
    await page.waitForFunction(() => window.__mk.cfg.watch.includes('EGL.LS'));
    assert.ok(await page.locator('.wl-i:has-text("Mota-Engil")').count());
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, '5-ajustes.png') });
    console.log('✓ ajustes: Mota-Engil junta à lista');

    // ao vivo
    const before = wsMsgs; await page.waitForTimeout(1200);
    assert.ok(wsMsgs > before, 'WebSocket a mandar preços');

    // largura: sem scroll horizontal
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    assert.equal(overflow, false, 'sem scroll horizontal');

    // compras de cripto: isenção de IRS aos 365 dias
    await page.click('#mk-nav [data-tab="painel"]');
    await page.click('.sec:has(h2:text("Os meus ativos")) [data-open="c:SOL"]');
    await page.waitForSelector('.tax-box');
    assert.match(await page.locator('.tax-box').textContent(), /Indica quando compraste/);
    const iso = (n) => { const d = new Date(Date.now() - n * 864e5); return d.toISOString().slice(0, 10); };
    await page.fill('#lot-d', iso(400)); await page.fill('#lot-e', '200'); await page.click('[data-act="lot-add"]');
    await page.fill('#lot-d', iso(100)); await page.fill('#lot-e', '100'); await page.click('[data-act="lot-add"]');
    await page.waitForSelector('.tax-box .lots li >> nth=1');
    const tx = await page.locator('.tax-box .tx-head').textContent();
    assert.match(tx, /1 de 2 compras já isentas \(200\s€ de 300\s€\)\. A próxima fica isenta a \d\d\/\d\d\/\d{4} — faltam 26\d dias/, tx);
    assert.ok(lotPosts.length >= 2 && lotPosts.at(-1)['c:SOL'].buys.length === 2, 'compras enviadas ao conector (para o Claude)');
    await page.click('.tax-box [data-lotrm] >> nth=0');
    await page.waitForFunction(() => document.querySelectorAll('.tax-box .lots li').length === 1);
    await page.fill('#lot-plan', iso(500)); await page.click('[data-act="lot-plan"]');
    await page.waitForFunction(() => /Plano mensal desde/.test(document.querySelector('.tax-box').textContent));
    if (SHOTS) { await page.locator('.tax-box').scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(SHOTS, '6-compras-cripto.png') }); }
    console.log('✓ compras de cripto:', (await page.locator('.tax-box .tx-head').textContent()).trim());
    await page.click('[data-act="close"] >> nth=-1');
    await page.waitForFunction(() => document.querySelector('#mk-sheet').hidden);
    assert.match(await page.locator('.sec:has(h2:text("Os meus ativos")) [data-key="c:SOL"] .r-sub').textContent(), /isentas · próxima em \d+ d|isenta em \d+ d/);
    assert.match(await page.locator('.sec:has(h2:text("Os meus ativos")) [data-key="c:XRP"] .r-sub').textContent(), /[−+]?\d+,\d% do máximo$/, 'sem datas de compra: não há texto');
    // sem conselho do Claude: sinal automático marcado "auto"
    assert.equal(await page.locator('.sec:has(h2:text("Os meus ativos")) .row[data-key="c:XRP"] .badge.auto').count(), 1, 'XRP com sinal automático');
    assert.doesNotMatch(await page.locator('.sec:has(h2:text("Os meus ativos")) .row[data-key="c:XRP"] .badge.auto').textContent(), /\//, 'etiqueta curta');
    // ações (lista fechada): ao abrir, os gráficos pequenos aparecem
    const drawn = await page.evaluate(() => [...document.querySelectorAll('.sec:has(h2) .row canvas.spark')].filter((c) => c.closest('.sec').querySelector('h2').textContent === 'Ações que sigo').map((c) => { const g = c.getContext('2d'); if (!c.width) return 0; const d = g.getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) n += d[i] > 0; return n; }));
    assert.ok(drawn.length > 5 && drawn.filter((n) => n > 0).length === drawn.length, 'gráficos em todas as ações: ' + drawn.join(','));
    // período: 1M muda a variação (dados diários) e volta a 1D
    const d1 = await page.locator('.sec:has(h2:text("Os meus ativos")) .row[data-key="c:BTC"] .chg').textContent();
    await page.click('[data-per="1m"]');
    await page.waitForFunction(() => window.__mk.PS['1m']['c:BTC'], null, { timeout: 15000 });
    await page.evaluate(() => window.__mk.render());
    const m1 = await page.locator('.sec:has(h2:text("Os meus ativos")) .row[data-key="c:BTC"] .chg').textContent();
    assert.notEqual(m1, d1, '1M diferente de 1D');
    // a ficha abre no mesmo período do Painel
    await page.locator('.sec:has(h2:text("Os meus ativos")) .row[data-open="c:BTC"]').click();
    await page.waitForSelector('#mk-sheet:not([hidden]) .ranges button.on');
    assert.equal(await page.locator('.ranges button.on').textContent(), '1M', 'ficha no período do Painel');
    await page.waitForFunction(() => /1 mês/.test(document.querySelector('#d-px').textContent));
    const sheetM = await page.locator('#d-px .chg').textContent();
    const num = (t) => Number(t.replace('−', '-').replace('%', '').replace(',', '.'));
    assert.ok(Math.abs(num(sheetM) - num(m1)) < 0.2, `1M igual no Painel (${m1}) e na ficha (${sheetM})`);
    assert.deepEqual(await page.locator('.ranges button').allTextContents(), ['15m', '1H', '4H', '1D', '1S', '1M', '6M', '1A', '5A']);
    assert.match(await page.locator('.perf').textContent(), /Hoje[\s\S]*7 dias[\s\S]*30 dias[\s\S]*1 ano/, 'rendimentos por período');
    await page.click('.ranges [data-range="15m"]');
    await page.waitForFunction(() => /15 min/.test(document.querySelector('#d-px').textContent));
    await page.waitForFunction(() => document.querySelector('#d-load').hidden);
    await page.waitForFunction(() => [...document.querySelectorAll('#d-axis span')].every((e) => /^\d\d:\d\d$/.test(e.textContent)), null, { timeout: 10000 });
    const axis = await page.locator('#d-axis span').allTextContents();
    assert.equal(axis.length, 4, 'linha do tempo com 4 marcas');
    assert.ok(axis.every((t) => /^\d\d:\d\d$/.test(t)), '15 min: horas na linha do tempo ' + axis.join(' '));
    await page.click('[data-act="close"] >> nth=-1');
    await page.waitForFunction(() => document.querySelector('#mk-sheet').hidden);
    await page.click('[data-per="1d"]');
    // com 1A no Painel, os Destaques continuam a mostrar a variação do dia, mesmo com preços ao vivo
    await page.click('[data-per="1y"]');
    await page.click('#mk-nav [data-tab="destaques"]');
    await page.waitForSelector('.sec:has(h2:text("Os meus ativos hoje")) .row[data-key="c:ETH"] .chg');
    await page.evaluate(() => { const mk = window.__mk; const q = mk.Q['c:ETH']; mk.Q['c:ETH'] = { ...q, price: q.price * 1.001, changePct: 0.45 }; });
    await page.waitForTimeout(1500);
    const ethDay = await page.evaluate(() => { const q = window.__mk.Q['c:ETH']; return q.changePct; });
    const ethTxt = await page.locator('.sec:has(h2:text("Os meus ativos hoje")) .row[data-key="c:ETH"] .chg').textContent();
    assert.ok(Math.abs(Number(ethTxt.replace('−', '-').replace('%', '').replace(',', '.')) - ethDay) < 0.05, `Destaques mostra o dia (${ethTxt} vs ${ethDay.toFixed(2)})`);
    await page.click('#mk-nav [data-tab="painel"]');
    await page.click('[data-per="1d"]');
    console.log('✓ período da variação: 1D', d1, '| 1M', m1);
    // os gráficos pequenos ficam todos na mesma coluna
    const sparkX = await page.evaluate(() => [...document.querySelectorAll('.sec:first-of-type .sw-list canvas.spark')].map((c) => Math.round(c.getBoundingClientRect().right)));
    assert.ok(sparkX.length >= 4 && new Set(sparkX).size === 1, 'gráficos alinhados: ' + sparkX);
    const wSpark = await page.evaluate(() => Math.round(document.querySelector('.row.wide canvas.spark').getBoundingClientRect().width));
    assert.equal(wSpark, 84, 'gráfico à direita, 84 px: ' + wSpark);
    assert.doesNotMatch(await page.locator('.sec:has(h2:text("Os meus ativos"))').textContent(), /24 h|Acc · sem dividendos/, 'sem texto que não interessa');
    assert.equal(await page.locator('details[data-fold="pn-idx"] .row .r-sub').count(), 0, 'listas só com nome, preço e variação');

    // migração: as portuguesas da lista antiga saem; as que o utilizador juntou ficam
    await page.evaluate(() => { const c = JSON.parse(localStorage.getItem('mercados:v1')); c.watch = ['EDP.LS', 'NVDA', 'EGL.LS']; delete c.watchVer; localStorage.setItem('mercados:v1', JSON.stringify(c)); });
    // conselho anterior do Claude para um ativo que hoje não comentou (Ether)
    await page.evaluate(() => { const d = new Date(Date.now() - 2 * 864e5); const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        localStorage.setItem('mercados:clmem', JSON.stringify({ 'c:ETH': { s: 'c:ETH', key: 'hold', action: 'Manter', why: 'tendência longa ainda a subir', date: iso } })); });
    await page.reload();
    await page.waitForFunction(() => window.__mk && window.__mk.cfg.watchVer === 3);
    await page.waitForSelector('.today .cl-head', { state: 'attached' });
    assert.equal(await page.locator('details.today[open]').count(), 0, 'ao abrir a app: compacto');
    assert.match(await page.locator('.today > summary .tldr').textContent(), /Plano: manter 810/, 'compacto mostra o resumo em 3 linhas');
    if (SHOTS) { await page.evaluate(() => window.scrollTo(0, 0)); await page.screenshot({ path: path.join(SHOTS, '7-painel-condensado.png') }); }
    // tocar para abrir funciona mesmo com o ecrã a atualizar logo a seguir (preços ao vivo)
    await page.evaluate(() => { document.querySelector('.today > summary').click(); window.__mk.render(); });
    assert.equal(await page.locator('details.today[open]').count(), 1, 'Hoje abre ao tocar, mesmo já lido');
    await page.evaluate(() => { document.querySelector('.today > summary').click(); window.__mk.render(); });
    assert.equal(await page.locator('details.today[open]').count(), 0, 'e volta a fechar');
    console.log('✓ análise do Claude lida fica condensada');
    await page.click('#mk-nav [data-tab="painel"]');
    await page.waitForSelector('.sec:has(h2:text("Os meus ativos")) .row[data-key="c:ETH"] .badge');
    assert.match(await page.locator('.sec:has(h2:text("Os meus ativos")) .row[data-key="c:ETH"] .badge').textContent(), /Manter/);
    await page.locator('.row[data-open="c:ETH"]').first().click();
    await page.waitForSelector('.advice .adv-src');
    assert.match(await page.locator('.advice .adv-src').textContent(), /Análise do Claude de \d\d\/\d\d · último comentário/);
    await page.click('[data-act="close"] >> nth=-1');
    await page.waitForFunction(() => document.querySelector('#mk-sheet').hidden);
    console.log('✓ Ether sem comentário hoje: fica o último conselho do Claude');
    const w = await page.evaluate(() => window.__mk.cfg.watch);
    assert.ok(!w.includes('EDP.LS') && w.includes('EGL.LS') && w.includes('JPM'), 'migração: ' + w.join(','));
    console.log('✓ migração da lista: sai EDP, fica Mota-Engil, entra JPMorgan');

    // avisos: vários movimentos numa só notificação; à noite esperam pela manhã
    await page.click('#mk-nav [data-tab="ajustes"]');
    assert.equal(await page.locator('[data-act="quiet"][data-v="1"].on').count(), 1, 'silêncio à noite ligado por omissão');
    const notes = await page.evaluate(() => {
        const out = [];
        Object.defineProperty(navigator, 'serviceWorker', { value: undefined, configurable: true });
        window.Notification = function (t, o) { out.push(t + ' | ' + o.body); };
        window.Notification.permission = 'granted';
        const mk = window.__mk, A = window.AnaliseOnda, isQ = A.isQuiet;
        mk.cfg.notify = true; mk.cfg.alertPct = 4; mk.st.firstPoll = false;
        const set = (k, p) => { mk.Q[k] = { ...mk.Q[k], changePct: p }; };
        set('AMD', 12.3); mk.checkAlerts();
        const notMine = out.length; // AMD é da lista de origem: não avisa
        A.isQuiet = () => true; set('c:ETH', 9.1); set('c:SOL', 8.2); mk.checkAlerts();
        const night = out.length, held = JSON.parse(localStorage.getItem('mercados:held'));
        A.isQuiet = () => false; mk.checkAlerts();
        set('c:XRP', -12.5); mk.checkAlerts();
        A.isQuiet = isQ;
        return { night, held, out, notMine };
    });
    assert.equal(notes.notMine, 0, 'AMD (lista de origem) não gera aviso');
    assert.equal(notes.night, 0, 'nada à noite');
    assert.deepEqual(notes.held.sort(), ['c:ETH', 'c:SOL']);
    assert.match(notes.out[0], /^Durante a noite: 2 ativos a subir \| Ether \+9,1\d?% · Solana \+8,2\d?%/);
    assert.match(notes.out[1], /^XRP cai −12,5\d?% hoje \|/);
    assert.equal(notes.out.length, 2);
    console.log('✓ avisos:', notes.out.map((x) => x.split(' | ')[0]).join(' / '));

    // combustíveis por concelho (ex.: Santo Tirso)
    await page.click('#mk-nav [data-tab="ajustes"]');
    await page.waitForSelector('#f-dist option[value="13"]', { state: 'attached' });
    const fuelReq = page.waitForRequest((r) => /\/fuel\?distrito=13&municipio=1316/.test(r.url()), { timeout: 10000 });
    await page.selectOption('#f-dist', '13');
    await page.waitForSelector('#f-mun option[value="1316"]', { state: 'attached' });
    await page.selectOption('#f-mun', '1316');
    await fuelReq;
    await page.click('#mk-nav [data-tab="painel"]');
    await page.waitForSelector('details[data-fold="pn-fuel"] > summary:has-text("Combustíveis em Santo Tirso")');
    console.log('✓ combustíveis no concelho de Santo Tirso');
    // tocar no combustível → lista de postos, do mais barato
    await page.click('details[data-fold="pn-fuel"] > summary');
    await page.click('button.card.fuel[data-fuel="3201"]');
    await page.waitForSelector('.fu-list .st-row');
    assert.equal(await page.locator('.fu-list .st-row').count(), 3);
    assert.match(await page.locator('.fu-list .st-row').first().textContent(), /Prio Torres Novas[\s\S]*o mais barato/);
    assert.match(await page.locator('.fu-list .st-row').nth(1).textContent(), /\+0,150/);
    assert.match(await page.locator('.fu-list .st-row').first().getAttribute('href'), /maps\.apple\.com\/\?ll=39\.48,-8\.54/);
    assert.match(await page.locator('#mk-sheet-card').textContent(), /poupa cerca de 7,50/);
    await page.click('[data-act="close"] >> nth=-1');
    await page.waitForFunction(() => document.querySelector('#mk-sheet').hidden);
    console.log('✓ lista de postos ao tocar na gasolina');

    // app do dono: quantas apps se ligam, ligar/desligar o Claude para as outras, toda a Trade Republic
    await page.click('#mk-nav [data-tab="ajustes"]');
    await page.waitForSelector('.share-st');
    const shareTxt = await page.locator('.sec:has(h2:text("Partilha da app"))').textContent();
    assert.match(shareTxt, /2\s*hoje\s*4\s*7 dias\s*5\s*30 dias\s*1\s*com o Claude/);
    assert.match(shareTxt, /1 analisada/);
    assert.match(await page.locator('#f-share').inputValue(), /\?proxy=https%3A%2F%2Fproxy\.test$/);
    await page.click('[data-others="0"]');
    await page.waitForFunction(() => document.querySelector('[data-others="0"]').classList.contains('on'));
    assert.equal(ownerPosts.at(-1).others, false);
    await page.click('[data-others="1"]');
    await page.waitForFunction(() => document.querySelector('[data-others="1"]').classList.contains('on'));
    assert.equal(await page.locator('h2:text-is("Análise do Claude")').count(), 0, 'o dono não precisa de ligar');
    await page.click('#mk-nav [data-tab="analise"]');
    await page.click('[data-filter="all"]');
    await page.click('.seg.hz [data-hz="long"]');
    // toda a TR: classificação automática, fechada; abre ao tocar e fica aberta quando o ecrã se atualiza
    await page.waitForSelector('details.uni', { state: 'attached' });
    await page.click('details.uni > summary');
    await page.waitForSelector('details.uni[open] .row');
    await page.evaluate(() => window.__mk.render());
    assert.equal(await page.locator('details.uni[open]').count(), 1, 'toda a TR fica aberta ao atualizar');
    assert.deepEqual([await page.locator('details.uni .f-t').textContent(), await page.locator('details.uni .f-n').textContent()], ['Toda a Trade Republic', '3'], 'uma linha: toda a Trade Republic e quantos');
    const uniRows = await page.locator('details.uni .row .r-name').allTextContents();
    assert.deepEqual(uniRows, ['iShares NASDAQ 100 ETF', 'PUMA', 'Cardano'], 'ordenada pela pontuação a longo prazo');
    assert.equal(await page.locator('details.uni .row[data-open="PUM.DE"] .lbl').textContent(), 'Comprar', 'o que o Claude escolheu da lista toda traz o veredicto dele');
    assert.equal(await page.locator('details.uni .row[data-open="ADA-EUR"] .r-ico').textContent(), 'ADA', 'cripto: o símbolo no ícone');
    assert.equal(await page.locator('details.uni .row[data-open="ADA-EUR"] .r-sub').textContent(), 'ADA-EUR · +2,10%', 'símbolo e variação do dia');
    await page.click('details.uni .row[data-open="PUM.DE"]');
    await page.waitForFunction(() => !document.querySelector('#mk-sheet').hidden && /PUMA/.test(document.querySelector('#mk-sheet-card').textContent));
    assert.equal(await page.locator('#mk-sheet .cl-adv h3').textContent(), 'O que fazer na Trade Republic');
    assert.equal(await page.locator('#mk-sheet .cl-adv .adv-act').textContent(), 'Comprar forte', 'convicção de 70 a médio prazo: forte');
    assert.equal(await page.locator('#mk-sheet .cl-adv .adv-nu').count(), 0, 'sem pormenor quando a frase é o próprio rótulo');
    await page.click('[data-act="close"] >> nth=-1');
    await page.waitForFunction(() => document.querySelector('#mk-sheet').hidden);
    // um da lista toda que o Claude não analisou: o sinal automático, marcado (e os impostos da cripto)
    await page.click('details.uni .row[data-open="ADA-EUR"]');
    await page.waitForSelector('#mk-sheet:not([hidden]) .advice .adv-src');
    assert.match(await page.locator('#mk-sheet .advice .adv-src').textContent(), /^Sinal automático \(algoritmo\) · o Claude não analisou este ativo$/);
    assert.match(await page.locator('#mk-sheet .advice').textContent(), /365 dias ou mais está isento/);
    await page.click('[data-act="close"] >> nth=-1');
    await page.waitForFunction(() => document.querySelector('#mk-sheet').hidden);
    console.log('✓ dono: partilha (apps ligadas) e toda a Trade Republic em Análise (com as escolhas do Claude)');

    // sem avisos: nada de "não é aconselhamento" e afins; em Ajustes → Sobre só uma linha neutra
    const BANNED = /aconselhamento|não dizem o que comprar|só informação|valida antes|não garante|contabilista|confirma sempre|informação geral/i;
    for (const tab of ['painel', 'destaques', 'analise', 'ajustes']) {
        await page.click(`#mk-nav [data-tab="${tab}"]`); await page.waitForTimeout(150);
        assert.doesNotMatch(await page.locator('#mk-body').textContent(), BANNED, `${tab}: sem avisos`);
    }
    assert.equal(await page.locator('#sobre .about-own').textContent(), 'Ferramenta pessoal; as decisões e a execução são tuas.');
    assert.equal((await page.locator('#mk-body').textContent()).split('Ferramenta pessoal').length, 2, 'uma só vez');
    await page.click('#mk-nav [data-tab="painel"]');
    for (const k of ['c:SOL', 'VWCE.DE']) {
        await page.locator(`.row[data-open="${k}"]`).first().click();
        await page.waitForSelector('#mk-sheet:not([hidden]) .advice');
        assert.doesNotMatch(await page.locator('#mk-sheet-card').textContent(), BANNED, `ficha ${k}: sem avisos`);
        await page.click('[data-act="close"] >> nth=-1');
        await page.waitForFunction(() => document.querySelector('#mk-sheet').hidden);
    }
    console.log('✓ sem avisos nem ressalvas; em Sobre: "Ferramenta pessoal; as decisões e a execução são tuas."');

    // análise antiga no KV (formato até à 3.x, antes da primeira corrida nova): a app continua a funcionar
    ADV.doc = ADV_V1;
    await page.evaluate(() => localStorage.removeItem('mercados:clmem'));
    await page.reload();
    await page.waitForFunction(() => window.__mk && window.__mk.st.yahooAt > 0);
    await page.click('#mk-nav [data-tab="analise"]');
    await page.click('[data-filter="all"]');
    await page.click('.seg.hz [data-hz="mid"]');
    await page.waitForFunction(() => /^Algoritmo/.test((document.querySelector('.an-src') || {}).textContent || '') && document.querySelectorAll('.an-list .row').length > 20, null, { timeout: 15000 });
    assert.equal(await page.locator('.an-src').textContent(), 'Algoritmo · veredicto do Claude');
    const oldNums = (await page.locator(lst + ' .r-score .val').allTextContents()).map(Number);
    assert.deepEqual(oldNums, [...oldNums].sort((a, b) => b - a), 'sem convicção do Claude: ordenada pelo algoritmo');
    assert.equal(await page.locator(lst + ' .row[data-open="c:BTC"] .lbl').textContent(), 'Manter', 'o veredicto antigo aparece na linha');
    await page.locator(lst + ' .row[data-open="c:BTC"]').click();
    await page.waitForSelector('#mk-sheet:not([hidden]) .advice .adv-act');
    assert.equal(await page.locator('#mk-sheet .advice .adv-act').textContent(), 'Manter');
    assert.equal(await page.locator('#mk-sheet .cl-conv').count(), 0, 'formato antigo: sem convicção por prazo');
    await page.click('[data-act="close"] >> nth=-1');
    await page.waitForFunction(() => document.querySelector('#mk-sheet').hidden);
    console.log('✓ formato antigo da análise: veredicto na ficha, classificação pelo algoritmo (marcada)');

    // outra app: a análise do Claude vem desligada; liga-se em Ajustes e chega só a dela
    ME.owner = false;
    await page.evaluate(() => { const c = JSON.parse(localStorage.getItem('mercados:v1')); c.owner = false; c.claude = false; localStorage.setItem('mercados:v1', JSON.stringify(c)); localStorage.removeItem('mercados:clmem'); });
    await page.reload();
    await page.click('#mk-nav [data-tab="painel"]');
    await page.waitForSelector('.today > summary');
    await page.waitForTimeout(800);
    assert.match(await page.locator('.today > summary').textContent(), /Resumo automático/);
    assert.equal(await page.locator('.today .cl-head').count(), 0, 'sem a análise do dono');
    await page.click('#mk-nav [data-tab="analise"]');
    await page.waitForSelector('.an-list');
    assert.equal(await page.locator('details.uni').count(), 0, 'toda a TR só na app do dono');
    await page.click('#mk-nav [data-tab="ajustes"]');
    assert.equal(await page.locator('h2:text("Partilha da app")').count(), 0);
    ME.advice = { date: '2026-11-07', generatedAt: '2026-11-07T07:21:00Z', short: true, headline: 'Só os teus ativos', tldr: ['Mercado: calmo.', 'Os teus ativos: manter.', 'Atenção: nada.'], actions: [{ s: 'c:BTC', key: 'hold', action: 'Manter', why: 'tendência longa a subir' }], movers: [] };
    await page.click('[data-claude="1"]');
    assert.equal(claudePosts.at(-1).claude, true);
    assert.ok(claudePosts.at(-1).my.includes('VWCE.DE'), 'envia a lista desta app');
    await page.click('#mk-nav [data-tab="painel"]');
    await page.waitForSelector('.today .cl-head', { state: 'attached' });
    assert.equal(await page.locator('.today .cl-head').textContent(), 'Só os teus ativos');
    assert.equal(await page.locator('.today .tldr .tl').count(), 3);
    await page.click('#mk-nav [data-tab="ajustes"]');
    await page.click('[data-claude="0"]');
    assert.equal(claudePosts.at(-1).claude, false);
    await page.click('#mk-nav [data-tab="painel"]');
    await page.waitForFunction(() => !document.querySelector('.today .cl-head'));
    console.log('✓ outra app: Claude desligado por omissão, liga em Ajustes e recebe a análise dos seus ativos');

    assert.deepEqual(errors, [], 'sem erros na consola');
    console.log('✓ sem erros na consola');
    await browser.close();
    server.close();
    console.log('UI OK');
})().catch((e) => { console.error('FALHOU:', e); process.exit(1); });
