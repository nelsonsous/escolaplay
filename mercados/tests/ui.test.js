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
    const s = daily ? series(sym, range === '2y' ? 505 : range === '1y' ? 252 : 126, 86400, drift) : series(sym, 78, 300, 0);
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
    if (p === '/fuel') return { fuels: [
        { id: 2101, name: 'Gasóleo simples', n: 3012, avg: 1.611, median: 1.599, min: 1.449, max: 1.899, cheapest: [{ price: 1.449, name: 'Intermarché', brand: 'Intermarché', place: 'Leiria, Leiria' }], updated: '2026-11-05 09:30' },
        { id: 3201, name: 'Gasolina simples 95', n: 2987, avg: 1.751, median: 1.739, min: 1.589, max: 2.049, cheapest: [{ price: 1.589, name: 'Prio Torres Novas', brand: 'Prio', place: 'Torres Novas, Santarém' }], updated: '2026-11-05 09:30' }] };
    if (p === '/fuel/distritos') return { items: [{ id: 11, name: 'Lisboa' }, { id: 13, name: 'Porto' }] };
    if (p === '/advice') return { date: '2026-11-06', headline: 'Mercado nervoso: manter o plano no VWCE', market: 'Texto de mercado.', planNote: '900 € em 2 execuções', plan: [{ s: 'VWCE.DE', amount: '810 €', why: 'núcleo' }, { s: 'AMZN', amount: '90 €', why: 'tendência forte' }], actions: [{ s: 'c:BTC', key: 'wait', action: 'Esperar', why: 'abaixo das médias', plan: 'entrar acima de 71 000 €' }], risks: ['S&P na média de 200 dias'], review: 'Primeiro dia.', lessons: ['Não perseguir subidas'] };
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
    await ctx.route(/proxy\.test/, (route) => {
        const u = new URL(route.request().url());
        if (u.pathname === '/journal') {
            if (route.request().method() === 'POST') { const b = JSON.parse(route.request().postData()); JDOC.days[b.date] = b.items; jPosts++; return route.fulfill({ json: { ok: true }, headers: { 'Access-Control-Allow-Origin': '*' } }); }
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
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
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
    console.log('✓ painel: Brent', brent, '| 1.ª ação', firstStock);
    await page.waitForSelector('.brief .idea', { timeout: 15000 });
    assert.match(await page.locator('.brief summary').textContent(), /Resumo do dia/);
    assert.ok(await page.locator('.brief .i-h:has-text("Plano do mês")').count());
    await page.waitForSelector('.brief .i-h:has-text("Agenda")');
    assert.match(await page.locator('.brief').textContent(), /Nvidia: apresenta resultados/);
    console.log('✓ agenda no resumo:', (await page.locator('.brief .i-blk:has-text("Agenda") .idea').allTextContents()).length, 'eventos');
    await page.click('.brief button.idea:has-text("Nvidia")');
    await page.waitForSelector('.advice .adv-ev');
    assert.match(await page.locator('.advice .adv-ev').textContent(), /Resultados daqui a 5 dias/);
    await page.click('[data-act="close"] >> nth=-1');
    await page.waitForFunction(() => document.querySelector('#mk-sheet').hidden);
    console.log('✓ aviso de resultados no conselho');
    await page.waitForSelector('.claude .cl-head');
    assert.match(await page.locator('.claude').textContent(), /manter o plano no VWCE/);
    assert.equal(await page.locator('.claude .i-blk:has-text("plano deste mês") .idea').count(), 2);
    console.log('✓ análise do Claude no painel');
    console.log('✓ resumo do dia:', (await page.locator('.brief .idea .i-n').allTextContents()).map((t) => t.split('núcleo')[0].split('satélite')[0].split('cripto')[0]).join(', '));
    const fund = await page.locator('.card[data-key="VWCE.DE"] .px').textContent();
    assert.match(fund, /163,80\s*€/, 'fundo com o preço da noite (Munique): ' + fund);
    assert.match(await page.locator('.card[data-key="VWCE.DE"] .chg').textContent(), /−3,5\d%/);
    const nv = await page.locator('.row[data-key="NVDA"] .px').first().textContent();
    assert.match(nv, /€/, 'ações americanas em euros: ' + nv);
    assert.match(await page.locator('.row[data-key="NOVO-B.CO"] .px').first().textContent(), /€/, 'coroas dinamarquesas em euros');
    console.log('✓ fundos e euros: VWCE', fund, '| Nvidia', nv);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, '1-painel.png') });
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, '1b-painel-completo.png'), fullPage: true });

    // destaques
    await page.click('#mk-nav [data-tab="destaques"]');
    await page.waitForFunction(() => document.querySelectorAll('.news1').length >= 2);
    const ups = await page.locator('.sec:has(h2:text("Grandes subidas")) .row .r-name').allTextContents();
    const downs = await page.locator('.sec:has(h2:text("Grandes descidas")) .row .r-name').allTextContents();
    assert.ok(ups.includes('Allianz') && ups.includes('Nvidia'), 'subidas: ' + ups);
    assert.ok(downs.includes('Tesla') && downs.includes('TotalEnergies'), 'descidas: ' + downs);
    assert.ok(ups.indexOf('Allianz') < ups.indexOf('Nvidia'));
    await page.waitForSelector('text=Xyz Therapeutics');
    console.log('✓ destaques: sobem', ups.join(', '), '| caem', downs.join(', '));
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, '2-destaques.png') });

    // análise
    await page.click('#mk-nav [data-tab="analise"]');
    await page.waitForFunction(() => document.querySelectorAll('.sec:has(h2) .list .row').length > 20);
    assert.ok(await page.locator('.mood').isVisible());
    const scores = await page.locator('.r-score .val').allTextContents();
    const nums = scores.map(Number);
    assert.deepEqual(nums, [...nums].sort((a, b) => b - a), 'classificação ordenada');
    assert.ok(nums.every((n) => n >= 0 && n <= 100));
    console.log('✓ análise:', await page.locator('.mood .m-v').textContent(), '| top', (await page.locator('.top3 .c-name').allTextContents()).join(', '), '| n =', nums.length);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, '3-analise.png') });
    const allKeys = await page.locator('.list .row').evaluateAll((els) => els.map((e) => e.dataset.open));
    assert.ok(!allKeys.some((k) => /=F$|^\^/.test(k)), '"Tudo" só com o que se compra na TR: ' + allKeys.filter((k) => /=F$|^\^/.test(k)));
    assert.ok(allKeys.includes('SXR8.DE') && allKeys.includes('c:BTC'));
    assert.ok(await page.locator('.ideas .idea').count() > 0, 'cartão de ideias para a TR');
    console.log('✓ ideias TR:', (await page.locator('.ideas .i-h').allTextContents()).map((t) => t.split(/[a-z]{3,}\s/)[0]).length, 'blocos');
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
    await page.click('.card[data-open="c:BTC"]');
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
    assert.match(await page.locator('.advice .adv-claude').textContent(), /Claude: Esperar/);
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
    await page.click('.card[data-open="c:ETH"]');
    await page.waitForSelector('#mk-sheet:not([hidden])');
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: tp(g.y + 2) });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: tp(g.y + 40) });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(400);
    assert.equal(await page.locator('#mk-sheet').isHidden(), false, 'puxão curto não fecha');
    await page.click('[data-act="close"] >> nth=-1');
    await page.waitForFunction(() => document.querySelector('#mk-sheet').hidden);

    // letra mais larga (como a do iOS): nada pode passar da largura do ecrã
    await page.addStyleTag({ content: 'body *{letter-spacing:.07em !important}' });
    for (const tab of ['painel', 'destaques', 'analise', 'ajustes']) {
        await page.click(`#mk-nav [data-tab="${tab}"]`); await page.waitForTimeout(250);
        const wide = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        assert.ok(wide <= 0, `${tab}: página mais larga que o ecrã (${wide}px)`);
    }
    await page.click('#mk-nav [data-tab="painel"]');
    await page.click('.card[data-open="c:BTC"]');
    await page.waitForSelector('#mk-sheet:not([hidden]) .news li');
    const sheetOver = await page.evaluate(() => { const c = document.querySelector('#mk-sheet-card').getBoundingClientRect(); const x = document.querySelector('#mk-sheet-card [data-act="close"]').getBoundingClientRect(); return { c: c.right - innerWidth, x: x.right - innerWidth }; });
    assert.ok(sheetOver.c <= 0 && sheetOver.x <= 0, 'folha e botão fechar dentro do ecrã ' + JSON.stringify(sheetOver));
    await page.click('[data-act="close"] >> nth=-1');
    await page.waitForFunction(() => document.querySelector('#mk-sheet').hidden);
    console.log('✓ letra larga: nada sai do ecrã');

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
    await page.click('[data-prof="bal"]');
    await page.click('#mk-nav [data-tab="painel"]');
    const amounts = await page.locator('.brief .i-blk:has-text("Plano do mês") .idea .i-t').allTextContents();
    const total = amounts.reduce((a, t) => a + Number(t.replace(/[^\d,]/g, '').replace(',', '.')), 0);
    assert.ok(Math.abs(total - 900) <= 3, 'plano soma 900 €: ' + amounts.join(' + '));
    console.log('✓ plano do mês 900 €:', amounts.join(' + '));
    // dias de execução: com 2 e 16, cada execução leva metade
    await page.click('#mk-nav [data-tab="ajustes"]');
    await page.click('[data-sday="16"]');
    await page.click('#mk-nav [data-tab="painel"]');
    const ex = await page.locator('.brief .exec .idea .i-t').allTextContents();
    const exTot = ex.reduce((a, t) => a + Number(t.replace(/[^\d,]/g, '').replace(',', '.')), 0);
    assert.ok(Math.abs(exTot - 450) <= 3, 'execução = 450 €: ' + ex.join(' + '));
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-act="ics"]')]);
    const icsPath = await dl.path(); const ics = fs.readFileSync(icsPath, 'utf8');
    assert.match(ics, /RRULE:FREQ=MONTHLY;BYMONTHDAY=1\r\n/); assert.match(ics, /BYMONTHDAY=15/);
    console.log('✓ execução', ex.join(' + '), '| lembretes .ics dias 1 e 15');

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

    // migração: as portuguesas da lista antiga saem; as que o utilizador juntou ficam
    await page.evaluate(() => { const c = JSON.parse(localStorage.getItem('mercados:v1')); c.watch = ['EDP.LS', 'NVDA', 'EGL.LS']; delete c.watchVer; localStorage.setItem('mercados:v1', JSON.stringify(c)); });
    await page.reload();
    await page.waitForFunction(() => window.__mk && window.__mk.cfg.watchVer === 3);
    const w = await page.evaluate(() => window.__mk.cfg.watch);
    assert.ok(!w.includes('EDP.LS') && w.includes('EGL.LS') && w.includes('JPM'), 'migração: ' + w.join(','));
    console.log('✓ migração da lista: sai EDP, fica Mota-Engil, entra JPMorgan');

    assert.deepEqual(errors, [], 'sem erros na consola');
    console.log('✓ sem erros na consola');
    await browser.close();
    server.close();
    console.log('UI OK');
})().catch((e) => { console.error('FALHOU:', e); process.exit(1); });
