// Teste da app no Chromium com todas as fontes simuladas (sem rede): o motor real (lib/data.js +
// lib/engine.js) corre sobre os dados reais de Lisboa de 6 nov 2026 (tests/fixtures/lisboa-2026-11-06.json),
// com o relógio fixo às 15:45 UTC.
//   node meteo/tests/ui.test.mjs [pasta-para-capturas]
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { MOCK_ANALYSIS } from './fixtures/mock.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(process.env.MT_ROOT || path.join(HERE, '..'));
const SHOTS = process.argv[2];
const RAW = JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures/lisboa-2026-11-06.json'), 'utf8'));
// previsão oficial do IPMA (locais reduzidos e a previsão de "Lisboa - Jardim Botânico", o local mais próximo)
const IPMA_LOCS = JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures/ipma-locations.json'), 'utf8'));
const IPMA_LX = JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures/ipma-lisboa.json'), 'utf8'));
const IPMA_ST = JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures/ipma-santo-tirso.json'), 'utf8'));
const NOW = '2026-11-06T15:45:00Z';
const PROXY = 'https://meteo.proxy.test';
const LAT = 38.7223, LON = -9.1393;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };
const CORS = { 'Access-Control-Allow-Origin': '*' };
const SCHEDULE = ['07:12', '13:12', '19:42'];

// ocorrências da ANEPC (formato fogos.pt v2): uma perto de Lisboa, outra longe (Braga)
const FOGOS = { success: true, data: [
    { id: '2026157601', lat: 38.905, lng: -9.165, dateTime: { sec: Date.parse('2026-11-06T15:20:00Z') / 1000 }, natureza: 'Mato', status: 'Em Curso', man: 24, terrain: 7, aerial: 1, location: 'Lisboa, Loures, Bucelas', important: false },
    { id: '2026157602', lat: 41.59, lng: -8.31, dateTime: { sec: Date.parse('2026-11-06T14:00:00Z') / 1000 }, natureza: 'Agrícola', status: 'Vigilância', man: 4, terrain: 1, aerial: 0, location: 'Braga, Póvoa de Lanhoso' },
] };
// normais recentes: 10 anos × janela de ±40 dias, valores suaves
function climate(u) {
    const s = Date.parse(u.searchParams.get('start_date') + 'T00:00:00Z'), e = Date.parse(u.searchParams.get('end_date') + 'T00:00:00Z');
    const time = [], tmax = [], tmin = [];
    for (let t = s; t <= e; t += 864e5) { const doy = new Date(t).getUTCDate(); time.push(new Date(t).toISOString().slice(0, 10)); tmax.push(19 + Math.sin(doy) * 0.8); tmin.push(12 + Math.cos(doy) * 0.6); }
    return { daily: { time, temperature_2m_max: tmax, temperature_2m_min: tmin } };
}
const nominatim = () => ({ name: RAW.place.name, address: { city: RAW.place.name, municipality: RAW.place.municipality, state: RAW.place.region, country_code: String(RAW.place.country || 'pt').toLowerCase() } });

(async () => {
    const server = http.createServer((req, res) => {
        let f = decodeURIComponent(req.url.split('?')[0]).replace(/^\/escolaplay\/meteo\/?/, '/');
        if (f === '/') f = '/index.html';
        const fp = path.join(ROOT, f);
        if (!fp.startsWith(ROOT) || /[\\/](proxy|node_modules)[\\/]/.test(fp) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); return res.end(); }
        res.writeHead(200, { 'Content-Type': TYPES[path.extname(fp)] || 'application/octet-stream' });
        fs.createReadStream(fp).pipe(res);
    }).listen(0);
    const origin = `http://127.0.0.1:${server.address().port}`;
    const url = `${origin}/escolaplay/meteo/`;
    const browser = await chromium.launch();
    const ctx = await browser.newContext({
        viewport: { width: 390, height: 844 }, deviceScaleFactor: SHOTS ? 2 : 1, isMobile: true, hasTouch: true,
        locale: 'pt-PT', timezoneId: 'Europe/Lisbon', serviceWorkers: 'block',
        geolocation: { latitude: LAT, longitude: LON, accuracy: 12 }, permissions: ['geolocation'],
    });
    const errors = [], unexpected = [], calls = [];
    let places = [{ id: 'lisboa', name: 'Lisboa', lat: LAT, lon: LON, createdAt: '2026-11-01T10:00:00Z' }];
    let failModels = false, refreshBody = null, elevCalls = 0;

    // tudo o que não for simulado abaixo fica bloqueado (sem rede real)
    await ctx.route(/.*/, (route) => {
        const u = route.request().url();
        if (u.startsWith(origin)) return route.continue();
        unexpected.push(u);
        return route.abort('failed');
    });
    const fulfill = (route, json) => route.fulfill({ json, headers: CORS });
    await ctx.route(/^https:\/\/api\.open-meteo\.com\/v1\/forecast/, (r) => (failModels ? r.abort('failed') : fulfill(r, RAW.det)));
    // altitudes de várias estações num só pedido (latitude=a,b,c)
    await ctx.route(/^https:\/\/api\.open-meteo\.com\/v1\/elevation/, (r) => { elevCalls++; const n = new URL(r.request().url()).searchParams.get('latitude').split(',').length; return fulfill(r, { elevation: Array(n).fill(77) }); });
    await ctx.route(/^https:\/\/ensemble-api\.open-meteo\.com\//, (r) => fulfill(r, RAW.ens));
    await ctx.route(/^https:\/\/previous-runs-api\.open-meteo\.com\//, (r) => fulfill(r, RAW.prev));
    await ctx.route(/^https:\/\/archive-api\.open-meteo\.com\//, (r) => fulfill(r, climate(new URL(r.request().url()))));
    await ctx.route(/^https:\/\/api\.ipma\.pt\//, (r) => {
        const p = new URL(r.request().url()).pathname;
        if (p === '/public-data/forecast/locations.json') return fulfill(r, IPMA_LOCS);
        if (p === '/public-data/forecast/aggregate/1110622.json') return fulfill(r, IPMA_LX);
        if (/^\/public-data\/forecast\/aggregate\/\d+\.json$/.test(p)) return fulfill(r, IPMA_ST); // outros concelhos (Porto): a de Santo Tirso, ali ao lado
        const k = /stations\.json$/.test(p) ? 'stations' : /observations\.json$/.test(p) ? 'obs' : /warnings_www/.test(p) ? 'warnings' : /rcm-d0/.test(p) ? 'rcm0' : /rcm-d1/.test(p) ? 'rcm1' : /distrits-islands/.test(p) ? 'districts' : null;
        return k ? fulfill(r, RAW.ipma[k]) : r.fulfill({ status: 404, headers: CORS, body: '' });
    });
    await ctx.route(/^https:\/\/nominatim\.openstreetmap\.org\//, (r) => fulfill(r, nominatim()));
    await ctx.route(new RegExp('^' + PROXY.replace(/\./g, '\\.')), async (r) => {
        const req = r.request(), u = new URL(req.url()), p = u.pathname, m = req.method();
        calls.push(`${m} ${p}`);
        if (failModels && p.startsWith('/api/raw/om/forecast')) return r.abort('failed');
        if (p === '/api/raw/metar') return fulfill(r, RAW.metar);
        if (p === '/api/raw/metar-history') return fulfill(r, RAW.metarHistory);
        if (p === '/api/raw/firms') return r.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'text/csv' }, body: RAW.firms[u.searchParams.get('sat')] || '' });
        if (p === '/api/raw/fogos') return fulfill(r, FOGOS);
        if (p === '/api/raw/om/forecast') return fulfill(r, RAW.det);
        if (p === '/api/obs-history') return fulfill(r, []);
        if (p === '/api/status') return fulfill(r, { version: '1.0.0', onDemand: true, places: places.length, schedule: SCHEDULE });
        if (p === '/api/analysis') {
            const near = places.find((x) => Math.abs(x.lat - Number(u.searchParams.get('lat'))) < 0.05 && Math.abs(x.lon - Number(u.searchParams.get('lon'))) < 0.05);
            return fulfill(r, { analysis: near ? MOCK_ANALYSIS : null, place: near ? { ...near, distanceKm: 0 } : null, ageMin: near ? 140 : null, schedule: SCHEDULE, onDemand: true });
        }
        if (p === '/api/analysis/refresh' && m === 'POST') {
            refreshBody = JSON.parse(req.postData() || '{}');
            return fulfill(r, { analysis: { ...MOCK_ANALYSIS, by: 'claude-api', generatedAt: NOW, titulo: 'Análise a pedido: frente fria no domingo' } });
        }
        if (p === '/api/places' && m === 'GET') return fulfill(r, places);
        if (p === '/api/places' && m === 'POST') { const b = JSON.parse(req.postData()); const pl = { id: 'casa', name: b.name, lat: b.lat, lon: b.lon, createdAt: NOW }; places.push(pl); return r.fulfill({ status: 201, json: pl, headers: CORS }); }
        if (p.startsWith('/api/places/') && m === 'DELETE') { places = places.filter((x) => x.id !== decodeURIComponent(p.slice(12))); return r.fulfill({ status: 204, headers: CORS, body: '' }); }
        if (p === '/api/geocode') return fulfill(r, [{ name: 'Porto', admin1: 'Porto', country: 'Portugal', lat: 41.1496, lon: -8.611, elevation: 85 }, { name: '<img src=x onerror=alert(1)>', admin1: 'XSS', country: 'Teste', lat: 40, lon: -8 }]);
        if (p === '/api/sat') return r.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'image/png' }, body: fs.readFileSync(path.join(ROOT, 'icon-192.png')) });
        return r.fulfill({ status: 404, json: { error: 'x' }, headers: CORS });
    });

    const page = await ctx.newPage();
    await page.clock.setFixedTime(new Date(NOW));
    page.on('pageerror', (e) => { errors.push('pageerror: ' + e.message); if (process.env.STACK) console.log(e.stack); });
    page.on('console', (m) => { if (m.type() === 'error' && !/ERR_FAILED|net::/.test(m.text())) errors.push('console: ' + m.text()); });
    page.on('dialog', (d) => { errors.push('dialog (XSS?): ' + d.message()); d.dismiss(); });
    const shot = async (name) => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, name), fullPage: true }); } };
    const noOverflow = async (where) => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `sem scroll horizontal em ${where}`);
    const tab = async (t) => { await page.click(`#mt-nav [data-tab="${t}"]`); await page.waitForFunction((x) => document.querySelector(`#mt-nav [data-tab="${x}"]`).classList.contains('on'), t); };
    const toastIs = async (re) => { await page.waitForFunction((s) => new RegExp(s).test(document.querySelector('#mt-toast').textContent) && document.querySelector('#mt-toast').classList.contains('show'), re.source); };

    // 1) primeiro arranque: ?proxy= guarda o conector e sai do endereço
    await page.goto(url + '?proxy=' + encodeURIComponent(PROXY));
    await page.waitForSelector('.welcome');
    assert.equal(await page.locator('h1.pg-t').textContent(), 'Meteo');
    assert.equal(await page.evaluate(() => window.__mt.cfg.proxy), PROXY);
    assert.equal(await page.evaluate(() => location.search), '');
    await shot('01-inicio.png');
    console.log('✓ primeiro arranque: boas-vindas e conector guardado (?proxy=)');

    // 2) GPS → previsão calculada no telemóvel (motor real)
    await page.click('.welcome [data-act="gps"]');
    await page.waitForSelector('.now');
    await page.waitForSelector('#h-chart svg');
    assert.equal((await page.locator('h1.pg-t').textContent()).trim(), RAW.place.name, 'nome do local (Nominatim)');
    assert.match(await page.locator('#mt-status').textContent(), /Atualizado às 15:45/);
    assert.match(await page.locator('#mt-status').textContent(), /38,7223, −9,1393 · \d+ m · GPS ±12 m/);
    const temp = await page.locator('.now-t').getAttribute('aria-label');
    assert.match(temp, /^\d+,\d°$/, 'temperatura agora: ' + temp);
    const nowTxt = await page.locator('.now').textContent();
    assert.match(nowTxt, /Sensação .*Máx\. .*Mín\./);
    assert.match(nowTxt, /Observado \d+,\d° em Lisboa \(Geofísico\), .+ e mais \d+ · ~\d+,\d km · há \d+ min \(IPMA \+ METAR\)/, 'linha da observação combinada');
    assert.equal(elevCalls, 1, 'altitudes de todas as estações num só pedido');
    assert.equal(await page.locator('.tile').count(), 12, 'indicadores');
    assert.ok(await page.locator('#nc-chart svg').count(), 'gráfico das 2 horas');
    assert.match(await page.locator('#cl-teaser').textContent(), new RegExp(MOCK_ANALYSIS.titulo.slice(0, 30)));
    await page.click('#h-chart .twin > summary');
    await page.waitForSelector('#h-chart .tbl tbody tr');
    assert.equal(await page.locator('#h-chart .tbl tbody tr').count(), 72, '72 horas na tabela');
    const firstH = await page.locator('#h-chart .tbl tbody tr').first().textContent();
    assert.match(firstH, /Sex 15h/, 'começa na hora atual: ' + firstH);
    await page.click('#h-chart .twin > summary');
    const cv = await page.locator('#h-chart .chart-canvas').boundingBox();
    await page.touchscreen.tap(cv.x + 150, cv.y + 100);
    await page.waitForSelector('#h-chart .chart-tip:not([hidden])');
    assert.match(await page.locator('#h-chart .chart-tip').textContent(), /temperatura.*chuva.*rajada/s);
    await noOverflow('Agora');
    await shot('02-agora.png');
    console.log('✓ Agora:', temp, '|', (await page.locator('.now-c').textContent()), '| 72 h, 2 h, 12 indicadores, análise do Claude');

    // 3) Dias: 16 dias; tocar num dia → folha com as horas
    await tab('dias');
    assert.equal(await page.locator('.row.day').count(), 16);
    assert.match(await page.locator('.row.day').first().textContent(), /Hoje/);
    assert.equal(await page.locator('.grp-h').count(), 1, 'separador do ensemble');
    await noOverflow('Dias');
    await shot('03-dias.png');
    await page.click('.row.day[data-day="2"]');
    await page.waitForSelector('#mt-sheet:not([hidden]) #d-chart svg');
    assert.match(await page.locator('#mt-sheet-title').textContent(), /Domingo, 8 nov/);
    assert.equal(await page.locator('#mt-sheet .stats > div').count(), 10);
    await shot('04-dia.png');
    await page.click('#mt-sheet-card [data-act="close"]');
    await page.waitForFunction(() => document.querySelector('#mt-sheet').hidden);
    await page.click('.row.day[data-day="10"]');
    await page.waitForSelector('#mt-sheet:not([hidden])');
    assert.match(await page.locator('#mt-sheet-card').textContent(), /próximas 72 horas/);
    assert.equal(await page.locator('#mt-sheet #d-chart').count(), 0);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.querySelector('#mt-sheet').hidden);
    console.log('✓ Dias: 16 dias, folha do domingo com as horas, dia 11 sem horas');

    // 4) Satélite e incêndios
    await tab('satelite');
    const src0 = await page.locator('#sat-img').getAttribute('src');
    assert.ok(src0.startsWith(`${PROXY}/api/sat?layer=geocolour&lat=${LAT}&lon=${LON}&km=600`), src0);
    await page.click('.chips [data-layer="lightning"]');
    await page.waitForFunction(() => /layer=lightning/.test(document.querySelector('#sat-img').src));
    await page.waitForFunction(() => { const i = document.querySelector('#sat-img'); return i.complete && i.naturalWidth > 0; });
    await page.click('[data-km="1200"]');
    await page.waitForFunction(() => /km=1200/.test(document.querySelector('#sat-img').src));
    const fireTxt = await page.locator('.sec:has(h2:text("Incêndios"))').textContent();
    assert.match(fireTxt, /Hoje.*(Reduzido|Moderado|Elevado|Muito elevado|Máximo)/s, 'risco IPMA');
    assert.match(fireTxt, /Mato · Em Curso/, 'ocorrência da ANEPC perto');
    assert.doesNotMatch(fireTxt, /Póvoa de Lanhoso/, 'ocorrência longe fica de fora');
    await noOverflow('Satélite');
    await shot('05-satelite.png');
    console.log('✓ Satélite: camadas e zoom pelo conector; incêndios (IPMA, FIRMS, ANEPC)');

    // 5) Análise: análise do Claude, ligar/desligar a análise diária, análise a pedido
    await tab('analise');
    assert.equal(await page.locator('.today .cl-head').textContent(), MOCK_ANALYSIS.titulo);
    assert.ok(await page.locator('.today .an-sec').count() >= 8, 'secções da análise');
    assert.ok(await page.locator('[data-act="place-on"].on').count(), 'análise diária ligada (Lisboa registada)');
    // desligar pede confirmação; "Cancelar" não apaga nada
    await page.click('[data-act="place-off"]');
    await page.waitForSelector('#mt-sheet:not([hidden]) [data-act="off-yes"]');
    assert.match(await page.locator('#mt-sheet-card').textContent(), /Desligar a análise diária de Lisboa\?.*A análise atual fica guardada\./s);
    await page.click('#mt-sheet-card .btns-col [data-act="close"]');
    await page.waitForFunction(() => document.querySelector('#mt-sheet').hidden);
    assert.ok(!calls.includes('DELETE /api/places/lisboa'), 'cancelar não desliga');
    // confirmar → DELETE e aviso com "Desfazer", que volta a ligar o mesmo local
    await page.click('[data-act="place-off"]');
    await page.click('#mt-sheet-card [data-act="off-yes"]');
    await toastIs(/desligada para Lisboa/);
    assert.ok(calls.includes('DELETE /api/places/lisboa'));
    await page.click('#mt-toast .t-undo');
    await toastIs(/ligada de novo/);
    assert.equal(calls.filter((c) => c === 'POST /api/places').length, 1, 'Desfazer volta a registar o local');
    assert.equal(places.at(-1).name, 'Lisboa');
    await page.waitForSelector('[data-act="place-on"].on');
    // desligar e voltar a ligar com "Sim"
    await page.click('[data-act="place-off"]');
    await page.click('#mt-sheet-card [data-act="off-yes"]');
    await toastIs(/desligada/);
    await page.click('[data-act="place-on"]');
    await toastIs(/Ligada/);
    assert.equal(calls.filter((c) => c === 'POST /api/places').length, 2);
    await page.click('[data-act="analyze"]');
    await toastIs(/Análise feita/);
    assert.ok(refreshBody && refreshBody.summary.length > 500, 'resumo enviado ao Claude');
    assert.match(await page.locator('.today .cl-head').textContent(), /Análise a pedido/);
    const nModels = await page.evaluate(() => window.__mt.st.fc.models.length);
    assert.equal(nModels, 10, '9 modelos + IPMA oficial');
    assert.equal(await page.locator('.sec:has(h2:text("Modelos")) .list .row').count(), nModels);
    assert.match(await page.locator('.sec:has(h2:text("Modelos"))').textContent(), /IPMA \(oficial\) oficial.*Lisboa - Jardim Botânico, a 1,0 km/s);
    // fontes lado a lado: consenso, IPMA, 9 modelos e ensemble em 3 dias, com o concelho do IPMA e a distância
    const cmp = page.locator('#fontes');
    assert.match(await cmp.locator('.sec-h .sub').textContent(), /^Previsão oficial IPMA: Lisboa - Jardim Botânico, 1,0 km$/);
    assert.equal(await cmp.locator('tbody tr').count(), 12);
    assert.deepEqual(await cmp.locator('thead th').allTextContents(), ['Fonte', 'Hoje', 'Amanhã', 'Dom 8']);
    assert.match(await cmp.locator('tbody tr').nth(1).textContent(), /^IPMAoficial18°\/12°chuva 100%/);
    assert.ok(await cmp.locator('.cmp-notes li').count() >= 3, 'resumo das divergências');
    assert.ok(await cmp.locator('td .hot, td .cold').count() >= 1, 'desvios de 2° ou mais destacados');
    // estações que entram na observação combinada
    assert.ok(await page.locator('.sec:has(h2:text("Observações usadas")) .row').count() >= 5);
    await noOverflow('Análise');
    await shot('06-analise.png');
    console.log(`✓ Análise: Claude, análise diária (DELETE/POST), a pedido, ${nModels} modelos`);

    // 6) Ajustes: conector, estado das fontes, tamanho da letra
    await tab('ajustes');
    assert.equal(await page.locator('#f-proxy').inputValue(), PROXY);
    await page.waitForFunction(() => /Ligado · versão 1\.0\.0/.test(document.querySelector('#f-proxy-msg').textContent));
    const srcRows = await page.locator('.sec:has(h2:text("Estado das fontes")) .row').count();
    assert.ok(srcRows >= 10, 'estado das fontes: ' + srcRows);
    assert.match(await page.locator('.sec:has(h2:text("Estado das fontes"))').textContent(), /Modelos determinísticos.*Previsão oficial do IPMA \(concelho\)/s);
    const prec = await page.locator('.prec').textContent();
    assert.match(prec, /Previsão oficial IPMA: Lisboa - Jardim Botânico, 1,0 km/);
    assert.match(prec, /Observações: \d+ estações até \d+(,\d)? km \(a mais próxima a 1,0 km\)/);
    // ✕ na lista também pede confirmação; Desfazer volta a ligar
    const posts0 = calls.filter((c) => c === 'POST /api/places').length;
    await page.click('[data-rmplace="casa"]');
    await page.waitForSelector('#mt-sheet:not([hidden]) [data-act="off-yes"]');
    await page.click('#mt-sheet-card [data-act="off-yes"]');
    await toastIs(/desligada para Lisboa/);
    assert.ok(calls.includes('DELETE /api/places/casa'));
    await page.click('#mt-toast .t-undo');
    await toastIs(/ligada de novo/);
    assert.equal(calls.filter((c) => c === 'POST /api/places').length, posts0 + 1);
    await page.waitForSelector('[data-rmplace="casa"]');
    await page.click('[data-fs="l"]');
    assert.equal(await page.evaluate(() => document.documentElement.dataset.fs), 'l');
    await noOverflow('Ajustes (letra grande)');
    await shot('07-ajustes.png');
    await page.click('[data-fs="n"]');
    console.log('✓ Ajustes: conector ligado, estado de', srcRows, 'fontes, letra grande');

    // 7) mudar de local (folha): pesquisa → Porto; nomes com HTML ficam como texto
    await page.click('.form [data-act="place"]');
    await page.waitForSelector('#f-q');
    await page.fill('#f-q', 'Por');
    await page.waitForSelector('#f-res [data-pick="1"]');
    assert.match(await page.locator('#f-res').textContent(), /<img src=x onerror=alert\(1\)>/, 'nome escapado');
    await page.click('#f-res [data-pick="0"]');
    await tab('agora');
    await page.waitForFunction(() => document.querySelector('h1.pg-t').textContent.trim() === 'Porto' && document.querySelector('.now'));
    await page.waitForFunction(() => !window.__mt.st.loading);
    console.log('✓ mudar de local: Porto');

    // 8) sem rede para os modelos: puxar para atualizar → fica a última previsão, com aviso
    await page.evaluate(() => window.scrollTo(0, 0));
    failModels = true;
    await page.evaluate(() => {
        const t = (y) => new Touch({ identifier: 1, target: document.body, clientX: 200, clientY: y });
        document.body.dispatchEvent(new TouchEvent('touchstart', { touches: [t(120)], bubbles: true }));
        for (const y of [160, 220, 300]) document.body.dispatchEvent(new TouchEvent('touchmove', { touches: [t(y)], bubbles: true }));
        document.body.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [t(300)], bubbles: true }));
    });
    await page.waitForSelector('.banner.warn');
    assert.match(await page.locator('.banner.warn').textContent(), /última previsão guardada/);
    assert.match(await page.locator('#mt-status').textContent(), /Sem ligação · dados de 15:45/);
    await shot('08-sem-rede.png');
    failModels = false;
    console.log('✓ puxar para atualizar sem rede: mantém a previsão com aviso');

    assert.deepEqual(unexpected, [], 'sem pedidos à rede real');
    assert.deepEqual(errors, [], 'sem erros na consola');
    console.log('✓ sem erros na consola e sem pedidos à rede real');
    await browser.close();
    server.close();
    console.log('UI OK');
})().catch((e) => { console.error('FALHOU:', e); process.exit(1); });
