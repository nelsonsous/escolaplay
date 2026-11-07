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
import { synthFrames, framePng, coveragePng, mapsJson } from './fixtures/radar.mjs';

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
// relevo à volta do ponto (o ponto + 12 rumos a 1,5 km e a 4 km): altitudes reais de Santo Tirso, um vale
const TERRAIN = JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures/terrain.json'), 'utf8'))['santo-tirso'].elevation;
const distKm = (a, b, c, d) => { const t = Math.PI / 180, x = Math.sin(((c - a) * t) / 2) ** 2 + Math.cos(a * t) * Math.cos(c * t) * Math.sin(((d - b) * t) / 2) ** 2; return 12742 * Math.asin(Math.sqrt(x)); };
// radar (RainViewer) simulado: 13 imagens até às 15:40; chove no ponto desde as 15:20 (19 dBZ ≈ 0,6 mm/h). As imagens são
// centradas no ponto pedido, por isso servem para qualquer local.
const RADAR = synthFrames(LAT, LON, (t) => (t >= -20 ? [{ e: 0, n: 0, r: 15, dbz: 19 }] : []), { lastMs: Date.parse(NOW) - 5 * 6e4 });
const RV_MAPS = mapsJson(RADAR.frames);
const RV_PNG = new Map(RV_MAPS.radar.past.map((f, i) => [f.path, framePng(RADAR.frames[i].dbz)]));
const RV_COVER = coveragePng(true);

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
    let failModels = false, refreshBody = null, elevCalls = 0, terrainCalls = 0, patchBody = null;
    const rvCalls = [], reportPosts = [], serverReports = [];

    // tudo o que não for simulado abaixo fica bloqueado (sem rede real)
    await ctx.route(/.*/, (route) => {
        const u = route.request().url();
        if (u.startsWith(origin)) return route.continue();
        unexpected.push(u);
        return route.abort('failed');
    });
    const fulfill = (route, json) => route.fulfill({ json, headers: CORS });
    await ctx.route(/^https:\/\/api\.open-meteo\.com\/v1\/forecast/, (r) => (failModels ? r.abort('failed') : fulfill(r, RAW.det)));
    // altitudes num só pedido (latitude=a,b,c): as estações perto, ou o relevo à volta do ponto (25 pontos: o 2.º a 1,5 km para norte)
    await ctx.route(/^https:\/\/api\.open-meteo\.com\/v1\/elevation/, (r) => {
        const sp = new URL(r.request().url()).searchParams, la = sp.get('latitude').split(',').map(Number), lo = sp.get('longitude').split(',').map(Number);
        if (la.length === 25 && Math.abs(distKm(la[0], lo[0], la[1], lo[1]) - 1.5) < 0.05) { terrainCalls++; return fulfill(r, { elevation: TERRAIN }); }
        elevCalls++;
        return fulfill(r, { elevation: Array(la.length).fill(77) });
    });
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
    await ctx.route('https://api.rainviewer.com/public/weather-maps.json', (r) => { rvCalls.push('maps'); return fulfill(r, RV_MAPS); });
    await ctx.route(/^https:\/\/tilecache\.rainviewer\.com\//, (r) => {
        const u = r.request().url(), png = (body) => r.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'image/png' }, body });
        if (u.includes('/v2/coverage/0/256/7/')) { rvCalls.push('coverage'); return png(RV_COVER); }
        const m = /\/v2\/radar\/(\w+)\/(256|512)\/(\d)\/-?[\d.]+\/-?[\d.]+\/2\/(\d)_(\d)\.png$/.exec(u);
        const f = m && RV_PNG.get(`/v2/radar/${m[1]}`);
        if (!f) return r.fulfill({ status: 404, headers: CORS, body: '' });
        rvCalls.push(`${m[2]}/${m[3]}/${m[4]}_${m[5]}`);
        return png(f);
    });
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
        if (p === '/api/analysis') { // como o conector: o local registado mais próximo até 10 km
            const la = Number(u.searchParams.get('lat')), lo = Number(u.searchParams.get('lon'));
            const near = places.map((x) => ({ ...x, distanceKm: Math.round(distKm(la, lo, x.lat, x.lon) * 10) / 10 })).filter((x) => x.distanceKm <= 10).sort((a, b) => a.distanceKm - b.distanceKm)[0];
            return fulfill(r, { analysis: near ? MOCK_ANALYSIS : null, place: near || null, ageMin: near ? 140 : null, schedule: SCHEDULE, onDemand: true });
        }
        if (p === '/api/analysis/refresh' && m === 'POST') {
            refreshBody = JSON.parse(req.postData() || '{}');
            return fulfill(r, { analysis: { ...MOCK_ANALYSIS, by: 'claude-api', generatedAt: NOW, titulo: 'Análise a pedido: frente fria no domingo' } });
        }
        if (p === '/api/places' && m === 'GET') return fulfill(r, places);
        if (p === '/api/places' && m === 'POST') { const b = JSON.parse(req.postData()); const pl = { id: 'casa', name: b.name, lat: b.lat, lon: b.lon, createdAt: NOW }; places.push(pl); return r.fulfill({ status: 201, json: pl, headers: CORS }); }
        if (p.startsWith('/api/places/') && m === 'DELETE') { places = places.filter((x) => x.id !== decodeURIComponent(p.slice(12))); return r.fulfill({ status: 204, headers: CORS, body: '' }); }
        if (p.startsWith('/api/places/') && m === 'PATCH') {
            patchBody = JSON.parse(req.postData());
            const id = decodeURIComponent(p.slice(12)), cur = places.find((x) => x.id === id);
            if (!cur) return r.fulfill({ status: 404, json: { error: 'nao_encontrado' }, headers: CORS });
            const moved = { ...cur, lat: patchBody.lat, lon: patchBody.lon, ...(patchBody.name ? { name: patchBody.name } : {}) };
            places = places.map((x) => (x.id === id ? moved : x));
            return fulfill(r, moved);
        }
        if (p === '/api/reports' && m === 'GET') return fulfill(r, { place: null, reports: serverReports });
        if (p === '/api/reports' && m === 'POST') { const b = JSON.parse(req.postData()); reportPosts.push(b); return r.fulfill({ status: 201, json: { report: b, place: null, count: 1 }, headers: CORS }); }
        if (p === '/api/geocode') return fulfill(r, [{ name: 'Porto', admin1: 'Porto', country: 'Portugal', lat: 41.1496, lon: -8.611, elevation: 85 }, { name: '<img src=x onerror=alert(1)>', admin1: 'XSS', country: 'Teste', lat: 40, lon: -8 },
            { name: 'Amadora', admin1: 'Lisboa', country: 'Portugal', lat: 38.7536, lon: -9.2302, elevation: 150 }]);
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
    assert.equal(terrainCalls, 1, 'relevo à volta do ponto num só pedido');
    assert.match(nowTxt, /Vale · 70 m abaixo do relevo à volta/, 'linha do relevo no Agora');
    assert.equal(await page.locator('.tile').count(), 12, 'indicadores');
    assert.ok(await page.locator('#nc-chart svg').count(), 'gráfico das 2 horas');
    const teaser = await page.locator('#cl-teaser').textContent();
    assert.match(teaser, new RegExp(MOCK_ANALYSIS.titulo.slice(0, 30)));
    assert.match(teaser, /Para Lisboa · 38,7223, −9,1393 · no ponto selecionado/, 'para que ponto é a análise');
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
    // radar no ponto (RainViewer): a chover desde as 15:20 → o "agora" e as próximas 2 h vêm do radar
    assert.match(nowTxt, /Radar no ponto: 0,6 mm\/h \(fraca\) · há 5 min/, 'linha do radar no Agora');
    assert.equal(await page.locator('.now .rad-strip .rs-bars i').count(), 13, '13 imagens nas últimas 2 h');
    assert.equal(await page.locator('.now .rad-strip .rs-bars i.r1').count(), 3, 'chuva nas 3 últimas');
    assert.match(await page.locator('.now .rad-strip').getAttribute('aria-label'), /^Radar no ponto nas últimas 2 horas: 13:40 0,0 mm\/h, .* 15:40 0,6 mm\/h$/);
    const ncSec = page.locator('.sec:has(h2:text("Próximas 2 horas"))');
    assert.match(await ncSec.locator('.lead').textContent(), /^A chover agora \(fraca, 0,6 mm\/h\); /);
    assert.equal(await ncSec.locator('.sec-h .sub').textContent(), 'radar e modelos');
    assert.match(await page.locator('.now-c').textContent(), /Chuva fraca/);
    assert.deepEqual(rvCalls.slice(0, 2).sort(), ['coverage', 'maps']);
    assert.equal(rvCalls.filter((c) => c === '256/7/0_0').length, 13, '13 imagens centradas no ponto (z7, cores exatas)');
    await noOverflow('Agora');
    await shot('02-agora.png');
    console.log('✓ Agora:', temp, '|', (await page.locator('.now-c').textContent()), '| radar no ponto, 72 h, 2 h, 12 indicadores, análise do Claude');

    // 2b) "Está a chover?": o aviso manda no agora (45 min) e segue para o conector
    await page.click('.now [data-act="report"]');
    await page.waitForSelector('#mt-sheet:not([hidden]) .rpt-grid');
    assert.equal(await page.locator('#mt-sheet-title').textContent(), 'Está a chover?');
    assert.deepEqual(await page.locator('.rpt-grid button span').allTextContents(), ['Chuva', 'Chuva forte', 'Não chove', 'Nevoeiro', 'Granizo', 'Trovoada']);
    await noOverflow('folha do aviso');
    await shot('02b-aviso.png');
    await page.click('.rpt-grid [data-report="nao-chove"]');
    await toastIs(/Obrigado! «Não chove» conta no agora durante 45 min/);
    await page.waitForFunction(() => /O teu aviso: Não chove/.test(document.querySelector('.now').textContent));
    assert.deepEqual(reportPosts, [{ kind: 'nao-chove', time: NOW.replace('Z', '.000Z'), lat: LAT, lon: LON }], 'POST /api/reports');
    assert.match(await page.locator('.now').textContent(), /O teu aviso: Não chove · agora mesmo · conta até às 16:30/);
    assert.match(await ncSec.locator('.lead').textContent(), /^Não está a chover \(o teu aviso das 15:45\); /);
    assert.equal(await ncSec.locator('.sec-h .sub').textContent(), 'com o teu aviso');
    assert.doesNotMatch(await page.locator('.now-c').textContent(), /Chuva/);
    assert.match(await page.locator('.now [data-act="report"]').textContent(), /Mudar o aviso/);
    // outro aviso substitui-o
    await page.click('.now [data-act="report"]');
    await page.click('.rpt-grid [data-report="chuva"]');
    await page.waitForFunction(() => /O teu aviso: Chuva ·/.test(document.querySelector('.now').textContent));
    assert.match(await ncSec.locator('.lead').textContent(), /^Está a chover \(o teu aviso das 15:45\); /);
    assert.equal(reportPosts.length, 2);
    console.log('✓ "Está a chover?": aviso no agora (45 min) e no conector');

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
    // camada Radar: a última imagem sobre as nuvens, centrada no ponto; z7/z6; as últimas 2 h a andar
    await page.click('.chips [data-layer="radar"]');
    await page.waitForSelector('#rad-img');
    const rsrc = await page.locator('#rad-img').getAttribute('src');
    assert.match(rsrc, new RegExp(`^https://tilecache\\.rainviewer\\.com${RV_MAPS.radar.past.at(-1).path}/512/7/38\\.7223/-9\\.1393/2/1_1\\.png$`), rsrc);
    assert.match(await page.locator('#sat-img').getAttribute('src'), /layer=geocolour&lat=38\.7223&lon=-9\.1393&km=244&/, 'nuvens por baixo, com a mesma largura');
    assert.equal(await page.locator('#rad-time').textContent(), '15:40 · há 5 min');
    assert.deepEqual(await page.locator('[data-rz]').allTextContents(), ['240 km', '490 km']);
    assert.match(await page.locator('.rad-leg').textContent(), /fraca.*moderada.*forte.*muito forte.*granizo/);
    await page.click('[data-act="rad-play"]');
    await page.waitForFunction(() => /Parar/.test(document.querySelector('[data-act="rad-play"]').textContent));
    await page.waitForFunction(() => /^13:\d0/.test(document.querySelector('#rad-time').textContent) || /^14:/.test(document.querySelector('#rad-time').textContent));
    await page.click('[data-act="rad-play"]');
    await page.waitForFunction(() => document.querySelector('#rad-time').textContent === '15:40 · há 5 min' && /Últimas 2 h/.test(document.querySelector('[data-act="rad-play"]').textContent));
    await page.click('[data-rz="6"]');
    await page.waitForFunction(() => /\/512\/6\//.test(document.querySelector('#rad-img').src));
    assert.ok(rvCalls.filter((c) => c === '512/7/1_1').length >= 13, 'as 13 imagens pré-carregadas para a animação');
    await noOverflow('Satélite (radar)');
    await shot('05b-radar.png');
    await page.click('[data-rz="7"]');
    await page.click('.chips [data-layer="geocolour"]');
    console.log('✓ Satélite: camadas e zoom pelo conector; radar (última imagem, z7/z6, últimas 2 h); incêndios (IPMA, FIRMS, ANEPC)');

    // 5) Análise: análise do Claude, ligar/desligar a análise diária, análise a pedido
    await tab('analise');
    assert.equal(await page.locator('.today .cl-head').textContent(), MOCK_ANALYSIS.titulo);
    assert.match(await page.locator('.today .cl-for').textContent(), /^Para Lisboa · 38,7223, −9,1393 · no ponto selecionado$/);
    assert.equal(await page.locator('.far-pt').count(), 0, 'análise deste ponto: sem aviso');
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
    assert.match(prec, /Relevo: Vale · 70 m abaixo do relevo à volta/);
    assert.match(await page.locator('.sec:has(h2:text("Estado das fontes"))').textContent(), /Relevo à volta do ponto/);
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
    console.log('✓ Ajustes: conector ligado, estado de', srcRows, 'fontes, relevo, letra grande');

    // 6b) ponto a 8,6 km do local com análise diária: a análise diz que é de outro ponto e oferece mudar (PATCH, mesmo id)
    await page.click('.form [data-act="place"]');
    await page.waitForSelector('#f-q');
    await page.fill('#f-q', 'Ama');
    await page.waitForSelector('#f-res [data-pick="2"]');
    await page.click('#f-res [data-pick="2"]');
    await tab('agora');
    await page.waitForFunction(() => document.querySelector('h1.pg-t').textContent.trim() === 'Amadora' && document.querySelector('#cl-teaser.far'));
    assert.match(await page.locator('#cl-teaser').textContent(), /Para Lisboa · 38,7223, −9,1393 · a 8,6 km do ponto selecionado.*Esta análise é para um ponto a 8,6 km daqui/s);
    assert.equal(await page.locator('#cl-teaser [data-act="place-move"]').count(), 1, 'oferece mudar no cartão');
    await tab('analise');
    const far = page.locator('.far-pt');
    assert.match(await far.textContent(), /Esta análise é para outro ponto, a 8,6 km daqui.*Para Lisboa · 38,7223, −9,1393 · a 8,6 km do ponto selecionado/s);
    assert.ok(await page.locator('[data-act="place-off"].on').count(), 'a análise diária não está neste ponto');
    await noOverflow('Análise (de outro ponto)');
    await shot('07a-analise-outro-ponto.png');
    await far.locator('[data-act="place-move"]').click();
    await toastIs(/A análise diária de Lisboa passa a ser para este ponto/);
    assert.ok(calls.includes('PATCH /api/places/casa'), 'mesmo id: a análise e as lições ficam');
    assert.deepEqual(patchBody, { lat: 38.7536, lon: -9.2302 }, 'só as coordenadas (o nome fica)');
    await page.waitForFunction(() => /já passou para este ponto/.test(document.querySelector('.far-pt').textContent));
    assert.equal(await page.locator('.far-pt [data-act="place-move"]').count(), 0);
    assert.ok(await page.locator('[data-act="place-on"].on').count(), 'análise diária ligada para este ponto');
    // Desfazer: volta ao ponto anterior
    await page.click('#mt-toast .t-undo');
    await toastIs(/voltou ao ponto anterior/);
    assert.deepEqual(patchBody, { lat: 38.7223, lon: -9.1393 });
    await page.waitForSelector('.far-pt [data-act="place-move"]');
    // e mudar a partir do cartão do Agora
    await tab('agora');
    await page.click('#cl-teaser [data-act="place-move"]');
    await toastIs(/passa a ser para este ponto/);
    await page.waitForFunction(() => /já passou para este ponto/.test(document.querySelector('#cl-teaser').textContent));
    assert.equal(calls.filter((c) => c === 'PATCH /api/places/casa').length, 3);
    await noOverflow('Agora (análise de outro ponto)');
    await shot('07b-outro-ponto.png');
    await tab('ajustes');
    console.log('✓ análise de outro ponto (8,6 km): aviso, mudar para este ponto (PATCH) e desfazer');

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
