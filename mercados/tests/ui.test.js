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
    if (p === '/movers') return { gainers: [{ symbol: 'XYZ', name: 'Xyz Therapeutics', price: 12.3, changePct: 38.2, volume: 9e6, currency: 'USD' }], losers: [{ symbol: 'ABCD', name: 'Abcd Corp', price: 4.1, changePct: -22.5, volume: 3e6, currency: 'USD' }], actives: [] };
    if (p === '/fuel' && u.searchParams.get('list') === '1') return { fuels: [{ id: +u.searchParams.get('tipos'), name: 'Gasolina simples 95', n: 3, median: 1.739, max: 1.799, updated: '2026-11-05 09:30',
        stations: [{ price: 1.589, name: 'Prio Torres Novas', brand: 'Prio', addr: 'Rua A, Torres Novas', lat: 39.48, lon: -8.54 }, { price: 1.739, name: 'Galp Centro', brand: 'Galp', addr: 'Av. B', lat: null, lon: null }, { price: 1.799, name: 'BP Norte', brand: 'BP', place: 'Porto, Porto' }] }] };
    if (p === '/fuel') return { fuels: [
        { id: 2101, name: 'Gasóleo simples', n: 3012, avg: 1.611, median: 1.599, min: 1.449, max: 1.899, cheapest: [{ price: 1.449, name: 'Intermarché', brand: 'Intermarché', place: 'Leiria, Leiria' }], updated: '2026-11-05 09:30' },
        { id: 3201, name: 'Gasolina simples 95', n: 2987, avg: 1.751, median: 1.739, min: 1.589, max: 2.049, cheapest: [{ price: 1.589, name: 'Prio Torres Novas', brand: 'Prio', place: 'Torres Novas, Santarém' }], updated: '2026-11-05 09:30' }] };
    if (p === '/fuel/distritos') return { items: [{ id: 11, name: 'Lisboa' }, { id: 13, name: 'Porto' }] };
    if (p === '/cryptoglobal') return { mcap: 2.1e12, mcapChg: -3.2, vol: 9.5e10, btcDom: 58.4, ethDom: 11.2, fng: { v: 24, label: 'Extreme Fear', prev: 30 } };
    if (p === '/fuel/municipios') return { items: [{ id: 1316, name: 'Santo Tirso' }, { id: 1312, name: 'Porto' }] };
    if (p === '/advice') return { date: '2026-11-06', generatedAt: '2026-11-06T07:16:00Z', headline: 'Mercado nervoso: manter o plano no VWCE', market: 'Texto de mercado.', planNote: '900 € em 2 execuções', plan: [{ s: 'VWCE.DE', amount: '810 €', why: 'núcleo' }, { s: 'c:BTC', amount: '90 €', why: 'cripto · todos os meses' }], actions: [{ s: 'c:BTC', key: 'wait', action: 'Esperar', why: 'abaixo das médias', plan: 'entrar acima de 71 000 €' }], movers: [{ s: 'TSLA', why: 'Cai depois de resultados abaixo do esperado.' }], tldr: ['Mercado: venda em tecnologia, VIX 24.', 'Plano: manter 810 € VWCE + 90 € BTC.', 'Atenção: XRP −9%, sem reforço.'], risks: ['S&P na média de 200 dias'], review: 'Primeiro dia.', lessons: ['Não perseguir subidas'] };
    if (p === '/calendar') return { items: u.searchParams.get('symbols').split(',').map((s) => s === 'NVDA' ? { symbol: s, earnings: Math.floor(Date.now() / 1000) + 5 * 86400, exDividend: null } : { symbol: s, earnings: null, exDividend: null }) };
    if (p === '/search') return { items: [{ symbol: 'EGL.LS', name: 'Mota-Engil', exchange: 'Lisbon', type: 'Equity' }] };
    return null;
}

(async () => {
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
    const lotPosts = [];
    await ctx.route(/proxy\.test/, (route) => {
        const u = new URL(route.request().url());
        if (u.pathname === '/journal') {
            if (route.request().method() === 'POST') { const b = JSON.parse(route.request().postData()); if (b.date) { JDOC.days[b.date] = b.items; jPosts++; } if (b.lots) lotPosts.push(b.lots); return route.fulfill({ json: { ok: true }, headers: { 'Access-Control-Allow-Origin': '*' } }); }
            return route.fulfill({ json: JDOC, headers: { 'Access-Control-Allow-Origin': '*' } });
        }
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

    // 1) sem conector: cripto funciona e aparece o aviso
    let page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    await page.goto(url);
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
    await page.click('#mk-nav [data-tab="ajustes"]');
    const firstW = await page.evaluate(() => window.__mk.cfg.watch[0]), secondW = await page.evaluate(() => window.__mk.cfg.watch[1]);
    await page.click(`[data-mv="${secondW}"][data-dir="-1"]`);
    assert.deepEqual(await page.evaluate(() => window.__mk.cfg.watch.slice(0, 2)), [secondW, firstW], 'seta ↑ troca a ordem');
    assert.equal(await page.evaluate(() => window.__mk.cfg.sort), 'mine');
    await page.click('#mk-nav [data-tab="painel"]');
    assert.equal(await page.locator(stockSec + ' .row').first().getAttribute('data-key'), secondW, 'Painel segue a minha ordem');
    await page.click(stockSec + ' [data-sort="up"]');
    console.log('✓ ordenar ações: desce, bolsa (' + grps.length + ' grupos), minha ordem');
    console.log('✓ painel: Brent', brent, '| 1.ª ação', firstStock);
    const firstSec = await page.locator('#mk-body .sec h2').first().textContent();
    assert.equal(firstSec, 'Os meus ativos', 'os meus ativos em primeiro');
    assert.equal(await page.locator('.sec:has(h2:text("Os meus ativos")) .row').count(), 5, 'VWCE + 4 cripto');
    // "Hoje": a análise do Claude e o resumo num só cartão; análise nova → aberto
    await page.waitForSelector('.today .cl-head', { timeout: 15000 });
    assert.equal(await page.locator('details.today[open]').count(), 1, 'análise nova do Claude → aberto');
    assert.equal(await page.locator('.claude, .brief, .ideas.cl').count(), 0, 'sem cartões repetidos');
    assert.match(await page.locator('.today > summary').textContent(), /Hoje/);
    assert.equal(await page.locator('.today .i-h:has-text("Plano do mês")').count(), 1, 'um só plano do mês');
    await page.waitForSelector('.today .i-h:has-text("Agenda")');
    assert.match(await page.locator('.today').textContent(), /Nvidia: apresenta resultados/);
    console.log('✓ agenda no Hoje:', (await page.locator('.today .i-blk:has-text("Agenda") .idea').allTextContents()).length, 'eventos');
    await page.click('.today button.idea:has-text("Nvidia")');
    await page.waitForSelector('.advice .adv-ev');
    assert.match(await page.locator('.advice .adv-ev').textContent(), /Resultados daqui a 5 dias/);
    await page.click('[data-act="close"] >> nth=-1');
    await page.waitForFunction(() => document.querySelector('#mk-sheet').hidden);
    console.log('✓ aviso de resultados no conselho');
    assert.match(await page.locator('.today').textContent(), /manter o plano no VWCE/);
    assert.match(await page.locator('.today > summary').textContent(), /Análise do Claude · feita às \d\d:\d\d de \d\d\/\d\d · próxima (hoje|amanhã) às (07:14|15:14)/);
    assert.equal(await page.locator('.today .plan-blk .idea').count(), 2, 'plano do Claude');
    assert.match(await page.locator('.sec:has(h2:text("Os meus ativos")) .row[data-key="c:BTC"] .badge').textContent(), /Esperar/, 'conselho do Claude no ativo');
    assert.equal(await page.locator('.sec:has(h2:text-is("Cripto"))').count(), 0, 'cripto que tenho não se repete');
    assert.equal(await page.locator('#mk-body h1.pg-t').textContent(), 'Painel');
    console.log('✓ Hoje: análise do Claude + plano | conselho nos meus ativos');
    assert.equal(await page.locator('.today .tldr li').count(), 3, 'resumo em 3 linhas');
    assert.match(await page.locator('.today .tldr').textContent(), /Plano: manter 810/);
    await page.waitForSelector('.sec:has(h2:text("Cripto hoje")) .cg');
    const cgTxt = await page.locator('.sec:has(h2:text("Cripto hoje"))').textContent();
    assert.match(cgTxt, /Medo e ganância\s*24\s*Medo extremo · ontem 30/);
    assert.match(cgTxt, /Dominância do Bitcoin\s*58,4%/);
    console.log('✓ resumo em 3 linhas e Cripto hoje (medo e ganância 24)');
    // ao vivo: cada preço da Binance entra no gráfico do dia
    const tail0 = await page.evaluate(() => { const s = window.__mk.Q['c:BTC'].series; return s[s.length - 1][0]; });
    await page.waitForFunction((t0) => { const s = window.__mk.Q['c:BTC'].series; return s[s.length - 1][0] > t0; }, tail0, { timeout: 15000 });
    console.log('✓ gráfico do dia recebe os preços ao vivo');
    // Agora: pulso do mercado e o que mexe, com o porquê (notícia ou Claude)
    await page.waitForSelector('.sec:has(h2:text("Agora")) .idea.why');
    const nowTxt = await page.locator('.sec:has(h2:text("Agora"))').textContent();
    assert.match(nowTxt, /S&P 500 [−+]/);
    assert.match(nowTxt, /Tesla/, 'Tesla (−7,4%) aparece no que mexe');
    assert.match(nowTxt, /resultados abaixo do esperado/, 'motivo do Claude para a Tesla');
    console.log('✓ Agora: pulso do mercado e o que mexe com o porquê');
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
    const tIdx = await page.locator('.sec:has(h2:text("Índices")) .row .r-t').first().textContent();
    assert.match(tIdx, /^\d{1,2}:\d{2}$|^\d{1,2}\/\d{1,2}$|^ontem$/, 'hora do último preço: ' + tIdx);
    assert.equal(await page.locator('.row[data-key="c:BTC"] .r-t').count(), 0, 'cripto ao vivo sem hora');
    const nv = await page.locator('.row[data-key="NVDA"] .px').first().textContent();
    assert.match(nv, /€/, 'ações americanas em euros: ' + nv);
    assert.match(await page.locator('.row[data-key="NOVO-B.CO"] .px').first().textContent(), /€/, 'coroas dinamarquesas em euros');
    console.log('✓ fundos e euros: VWCE', fund, '| Nvidia', nv);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, '1-painel.png') });
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, '1b-painel-completo.png'), fullPage: true });

    // destaques
    await page.click('#mk-nav [data-tab="destaques"]');
    await page.waitForFunction(() => document.querySelectorAll('.news1').length >= 2);
    assert.equal(await page.locator('[data-lim]').count(), 0, 'sem filtros de ±X%');
    const mineH = await page.locator('.sec:has(h2:text("Os meus ativos hoje")) .row .r-name').allTextContents();
    assert.ok(mineH.some((t) => /FTSE All-World/.test(t)) && mineH.includes('Bitcoin'), 'os meus ativos: ' + mineH);
    const ups = await page.locator('.sec:has(h2:text("Mais sobem hoje")) .row .r-name').allTextContents();
    const downs = await page.locator('.sec:has(h2:text("Mais caem hoje")) .row .r-name').allTextContents();
    assert.ok(ups.includes('Allianz') && ups.includes('Nvidia'), 'subidas: ' + ups);
    assert.ok(downs.includes('Tesla') && downs.includes('TotalEnergies'), 'descidas: ' + downs);
    assert.ok(ups.indexOf('Allianz') < ups.indexOf('Nvidia'));
    await page.waitForSelector('text=Xyz Therapeutics');
    console.log('✓ destaques: sobem', ups.join(', '), '| caem', downs.join(', '));
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, '2-destaques.png') });

    assert.ok(await page.locator('.mood').isVisible(), 'sentimento do mercado nos Destaques');
    // análise
    await page.click('#mk-nav [data-tab="analise"]');
    await page.waitForSelector('.chips [data-filter="plan"].on');
    const planRows = await page.locator('.list .row').evaluateAll((els) => els.map((e) => e.dataset.open));
    assert.ok(planRows.length >= 8 && planRows.every((k) => /^c:|\.DE$/.test(k)), 'filtro ETF + cripto: ' + planRows);
    await page.click('.chips [data-filter="all"]');
    await page.waitForFunction(() => document.querySelectorAll('.sec:has(h2) .list .row').length > 20);
    assert.equal(await page.locator('.mood').count(), 0, 'sentimento só nos Destaques');
    const scores = await page.locator('.r-score .val').allTextContents();
    const nums = scores.map(Number);
    assert.deepEqual(nums, [...nums].sort((a, b) => b - a), 'classificação ordenada');
    assert.ok(nums.every((n) => n >= 0 && n <= 100));
    console.log('✓ análise: top', (await page.locator('.top3 .c-name').allTextContents()).join(', '), '| n =', nums.length);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, '3-analise.png') });
    const allKeys = await page.locator('.list .row').evaluateAll((els) => els.map((e) => e.dataset.open));
    assert.ok(!allKeys.some((k) => /=F$|^\^/.test(k)), '"Tudo" só com o que se compra na TR: ' + allKeys.filter((k) => /=F$|^\^/.test(k)));
    assert.ok(allKeys.includes('SXR8.DE') && allKeys.includes('c:BTC'));
    assert.deepEqual(await page.locator('h2.grp').allTextContents(), ['Comparar ativos', 'Resultados']);
    assert.match(await page.locator('.cl-box').textContent(), /Primeiro dia/);
    assert.match(await page.locator('.cl-box').textContent(), /aprendeu até agora \(1\)/);
    assert.equal(await page.locator('details.auto:not([open])').count(), 1, 'algoritmo fechado');
    console.log('✓ análise: comparar ativos + resultados (conselhos do Claude, diário, teste)');
    await page.click('.chips [data-filter="crypto"]');
    assert.equal(await page.locator('.list .row').count(), 4);
    await page.click('.chips [data-filter="all"]');
    await page.click('.seg.hz [data-hz="long"]');
    await page.waitForSelector('h2:text("Mais fortes a longo prazo")');
    const longScores = (await page.locator('.r-score .val').allTextContents()).map(Number);
    assert.deepEqual(longScores, [...longScores].sort((a, b) => b - a), 'ordenado pelo longo prazo');
    console.log('✓ análise por prazo: longo, n =', longScores.length);
    await page.click('.seg.hz [data-hz="disc"]');
    await page.waitForSelector('h2:text("Maiores oportunidades (desconto)")');
    const dScores = (await page.locator('.r-score .val').allTextContents()).map(Number);
    assert.deepEqual(dScores, [...dScores].sort((a, b) => b - a), 'ordenado pela oportunidade');
    assert.match(await page.locator('.list .row .r-sub').first().textContent(), /do máx\./);
    console.log('✓ modo desconto: n =', dScores.length);
    await page.click('.seg.hz [data-hz="mid"]');

    // detalhe da Bitcoin
    await page.click('#mk-nav [data-tab="painel"]');
    await page.locator('.row[data-open="c:BTC"]').first().click();
    await page.waitForSelector('#mk-sheet:not([hidden]) .news li');
    await page.waitForFunction(() => { const c = document.querySelector('#d-cv'); return c && c.width > 0 && document.querySelector('#d-load').hidden; });
    const inked = await page.evaluate(() => { const c = document.querySelector('#d-cv'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return n; });
    assert.ok(inked > 500, 'gráfico desenhado');
    assert.equal(await page.locator('.news a[href^="javascript"]').count(), 0, 'links javascript: bloqueados');
    assert.equal(await page.locator('.news img').count(), 0, 'HTML das notícias escapado');
    assert.ok(await page.locator('.box:has-text("Análise técnica") .reasons li').count() >= 4);
    assert.equal(await page.locator('.box:has-text("Análise técnica") .hzb').count(), 3, 'três prazos na folha');
    assert.ok(await page.locator('.disc-box .range52 .bar i').count(), 'barra mínimo–máximo do ano');
    assert.ok(await page.locator('.advice .adv-act').count(), 'o que fazer na TR');
    assert.match(await page.locator('.advice .adv-src').textContent(), /Análise do Claude/);
    assert.match(await page.locator('.advice .adv-act').textContent(), /Esperar/);
    assert.ok(await page.locator('.advice details.algo').count(), 'algoritmo como referência');
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

    // puxar para baixo fecha a folha
    const cdp = await ctx.newCDPSession(page);
    await page.evaluate(() => { document.querySelector('#mk-sheet-card').scrollTop = 0; });
    await page.waitForTimeout(100);
    const g = await page.locator('#mk-sheet-card .grab').boundingBox();
    const tp = (y) => [{ x: g.x + g.width / 2, y }];
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: tp(g.y + 2) });
    for (let i = 1; i <= 10; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: tp(g.y + 2 + i * 25) });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForFunction(() => document.querySelector('#mk-sheet').hidden, null, { timeout: 2000 });
    console.log('✓ puxar para baixo fecha a folha');
    // puxar pouco não fecha
    await page.locator('.row[data-open="c:ETH"]').first().click();
    await page.waitForSelector('#mk-sheet:not([hidden])');
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: tp(g.y + 2) });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: tp(g.y + 40) });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(400);
    assert.equal(await page.locator('#mk-sheet').isHidden(), false, 'puxão curto não fecha');
    await page.click('[data-act="close"] >> nth=-1');
    await page.waitForFunction(() => document.querySelector('#mk-sheet').hidden);

    // arrastar uma linha para a esquerda → Retirar (com Desfazer e Repor)
    await page.click('#mk-nav [data-tab="painel"]');
    const idxSel = '.sec:has(h2:text("Índices")) .sw-wrap';
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
    await page.click('.sec:has(h2:text("Índices")) [data-unhide="index"]');
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
    await page.waitForSelector('.box:has-text("Diário real") .tt');
    const jt = await page.locator('.box:has-text("Diário real") .tt').textContent();
    assert.match(jt, /Comprar/); assert.match(jt, /Evitar/);
    console.log('✓ diário: gravado e avaliado');
    await page.click('[data-act="backtest"]');
    await page.waitForSelector('.box:has-text("Teste no passado") .tt', { timeout: 30000 });
    assert.match(await page.locator('.box:has-text("Teste no passado")').textContent(), /vs VWCE/);
    console.log('✓ teste no passado:', await page.locator('.box:has-text("Teste no passado") .tt tbody tr').count(), 'linhas');

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
    const exTxt = await page.locator('.today .exec .ex-a').textContent();
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
    console.log('✓ período da variação: 1D', d1, '| 1M', m1);
    // os gráficos pequenos ficam todos na mesma coluna
    const sparkX = await page.evaluate(() => [...document.querySelectorAll('.sec:first-of-type .sw-list canvas.spark')].map((c) => Math.round(c.getBoundingClientRect().right)));
    assert.ok(sparkX.length >= 4 && new Set(sparkX).size === 1, 'gráficos alinhados: ' + sparkX);
    const wSpark = await page.evaluate(() => Math.round(document.querySelector('.row.wide canvas.spark').getBoundingClientRect().width));
    assert.equal(wSpark, 84, 'gráfico à direita, 84 px: ' + wSpark);
    assert.doesNotMatch(await page.locator('.sec:has(h2:text("Os meus ativos"))').textContent(), /24 h|Acc · sem dividendos/, 'sem texto que não interessa');
    assert.equal(await page.locator('.sec:has(h2:text("Índices")) .row .r-sub').count(), 0, 'listas só com nome, preço e variação');

    // migração: as portuguesas da lista antiga saem; as que o utilizador juntou ficam
    await page.evaluate(() => { const c = JSON.parse(localStorage.getItem('mercados:v1')); c.watch = ['EDP.LS', 'NVDA', 'EGL.LS']; delete c.watchVer; localStorage.setItem('mercados:v1', JSON.stringify(c)); });
    // conselho anterior do Claude para um ativo que hoje não comentou (Ether)
    await page.evaluate(() => { const d = new Date(Date.now() - 2 * 864e5); const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        localStorage.setItem('mercados:clmem', JSON.stringify({ 'c:ETH': { s: 'c:ETH', key: 'hold', action: 'Manter', why: 'tendência longa ainda a subir', date: iso } })); });
    await page.reload();
    await page.waitForFunction(() => window.__mk && window.__mk.cfg.watchVer === 3);
    await page.waitForSelector('.today .cl-head', { state: 'attached' });
    assert.equal(await page.locator('details.today[open]').count(), 0, 'análise já lida → condensada');
    assert.match(await page.locator('.today .teaser').textContent(), /Plano: manter 810/, 'condensado mostra o resumo em 3 linhas');
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
        const mk = window.__mk, A = window.Analise, isQ = A.isQuiet;
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
    await page.waitForSelector('h2:text("Combustíveis em Santo Tirso")');
    console.log('✓ combustíveis no concelho de Santo Tirso');
    // tocar no combustível → lista de postos, do mais barato
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

    assert.deepEqual(errors, [], 'sem erros na consola');
    console.log('✓ sem erros na consola');
    await browser.close();
    server.close();
    console.log('UI OK');
})().catch((e) => { console.error('FALHOU:', e); process.exit(1); });
