// Radar no ponto (RainViewer): cores → dBZ → mm/h, PNG, leitura no ponto, deslocamento, chegada e o "agora" do motor.
// Sem rede: imagens sintéticas (tests/fixtures/radar.mjs) e 13 imagens reais de Santo Tirso (7 nov 2026, 13:10–15:10 UTC).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { colorToDbz, dbzColor, decodeFrame, dbzToMmh, mmhToDbz, rainLabel, tileGeo, analyzeRadar, radarFrames, radarTileUrl, coverageUrl, coveredAt, NO_ECHO, RADAR } from '../lib/radar.js';
import { decodePng } from '../lib/png.js';
import { buildForecast, buildSummary, withReport, reportActive, radarWeight } from '../lib/engine.js';
import { synthFrames, framePng, encodePng, coveragePng, mapsJson } from './fixtures/radar.mjs';

const fx = (f) => new URL(`./fixtures/${f}`, import.meta.url);
const raw = JSON.parse(readFileSync(fx('lisboa-2026-11-06.json'), 'utf8'));
const NOW = Date.parse('2026-11-06T15:45:00Z'), LAT = 38.7223, LON = -9.1393;
const LAST = NOW - 5 * 6e4; // última imagem às 15:40 (há 5 min)
const SW = Math.SQRT1_2;
// modelos 2 h atrasados (como em Santo Tirso a 6 nov às 20:33): sem chuva até às 18:00, todos com chuva das 18:00 às 21:00
// (cenário explícito: não depende dos pesos que a aprendizagem dá a cada modelo)
const LATE_WET = (t) => t >= '2026-11-06T18:00' && t <= '2026-11-06T21:00';
function lateModels() {
    const r = structuredClone(raw), H = r.det.hourly, M = r.det.minutely_15;
    for (const k of Object.keys(H)) {
        if (k.startsWith('precipitation_')) H[k] = H[k].map((v, i) => (H.time[i] < '2026-11-06T18:00' ? 0 : LATE_WET(H.time[i]) ? Math.max(v ?? 0, 1.2) : v));
        if (k.startsWith('weather_code_')) H[k] = H[k].map((v, i) => (H.time[i] < '2026-11-06T18:00' ? 3 : LATE_WET(H.time[i]) ? 61 : v));
    }
    for (const k of Object.keys(M)) if (k.startsWith('precipitation_')) M[k] = M[k].map(() => 0);
    return r;
}
// todos os modelos com chuva moderada agora e nas próximas 2 h (cenário explícito, como acima)
function wetModels() {
    const r = structuredClone(raw), H = r.det.hourly, M = r.det.minutely_15;
    const wet = (t) => t >= '2026-11-06T15:00' && t <= '2026-11-06T18:00';
    for (const k of Object.keys(H)) {
        if (k.startsWith('precipitation_')) H[k] = H[k].map((v, i) => (wet(H.time[i]) ? Math.max(v ?? 0, 2) : v));
        if (k.startsWith('weather_code_')) H[k] = H[k].map((v, i) => (wet(H.time[i]) ? 63 : v));
    }
    for (const k of Object.keys(M)) if (k.startsWith('precipitation_')) M[k] = M[k].map((v, j) => (wet(M.time[j]) ? Math.max(v ?? 0, 0.5) : v));
    return r;
}
const wraw = wetModels();

test('radar: cor da tabela Universal Blue → dBZ, e dBZ → mm/h (Marshall-Palmer, Z = 200·R^1,6)', () => {
    for (let d = -10; d <= 64; d++) assert.equal(colorToDbz(...dbzColor(d)), d, `${d} dBZ`);
    assert.equal(colorToDbz(255, 255, 255, 255), 65, 'branco: 65–74 dBZ');
    assert.equal(colorToDbz(0, 255, 0, 255), null, 'verde (≥ 75 dBZ) não é chuva');
    assert.equal(colorToDbz(0, 0, 0, 0), null, 'transparente: sem eco');
    // o canvas guarda as cores pré-multiplicadas: nos níveis semitransparentes o RGB muda, a opacidade não
    for (let d = -10; d <= 14; d++) {
        const [r, g, b, a] = dbzColor(d);
        assert.equal(colorToDbz(Math.min(255, r + 6), Math.max(0, g - 5), b + 3, a), d, `${d} dBZ com o RGB arredondado`);
    }
    assert.equal(colorToDbz(0x00 + 2, 0x77 - 3, 0xaa + 1, 255), 25, 'ruído pequeno nas cores opacas');
    assert.equal(colorToDbz(120, 40, 200, 255), null, 'cor fora da tabela');
    assert.ok(Math.abs(dbzToMmh(23) - 1) < 0.01, `23 dBZ ≈ 1 mm/h (${dbzToMmh(23)})`);
    assert.ok(Math.abs(dbzToMmh(7) - 0.1) < 0.005, '7 dBZ ≈ 0,1 mm/h (o limiar da chuva)');
    assert.ok(Math.abs(dbzToMmh(19) - 0.56) < 0.01, '19 dBZ ≈ 0,6 mm/h');
    assert.ok(Math.abs(mmhToDbz(1) - 23) < 0.05);
    assert.equal(dbzToMmh(70), dbzToMmh(55), 'acima de 55 dBZ (granizo, ecos fixos) não cresce');
    assert.ok(dbzToMmh(55) > 95 && dbzToMmh(55) < 105);
    assert.equal(dbzToMmh(NO_ECHO), 0);
    assert.deepEqual([0.5, 3, 12, 60].map(rainLabel), ['fraca', 'moderada', 'forte', 'muito forte']);
    // píxeis → grelha de dBZ (conta as cores desconhecidas, para o browser trocar o canvas pelo PNG)
    const px = new Uint8Array([...dbzColor(23), 0, 0, 0, 0, 120, 40, 200, 255, 0, 255, 0, 255]);
    const f = decodeFrame(px);
    assert.deepEqual([...f.dbz], [23, NO_ECHO, NO_ECHO, NO_ECHO]);
    assert.deepEqual([f.echoes, f.unknown], [1, 1]);
});

test('radar: endereços, lista das imagens e geometria da imagem centrada no ponto', () => {
    const { frames } = synthFrames(LAT, LON, () => [], { lastMs: LAST, n: 3 });
    const m = mapsJson(frames);
    m.radar.past.push({ time: 123, path: '/../../evil' });
    const r = radarFrames({ ...m, host: 'https://evil.example' });
    assert.equal(r.host, 'https://tilecache.rainviewer.com', 'só anfitriões do RainViewer');
    assert.equal(r.frames.length, 3, 'caminhos estranhos ficam de fora');
    assert.deepEqual(r.frames.map((f) => f.ms), frames.map((f) => f.ms), 'da mais antiga para a mais recente');
    assert.equal(radarTileUrl(r.host, r.frames[0].path, 41.3354, -8.4745), `https://tilecache.rainviewer.com${r.frames[0].path}/256/7/41.3354/-8.4745/2/0_0.png`);
    assert.equal(coverageUrl(r.host, 41.3354, -8.4745), 'https://tilecache.rainviewer.com/v2/coverage/0/256/7/41.3354/-8.4745/0/0_0.png');
    // Santo Tirso: verificado contra as imagens x/y/z do mesmo instante (o ponto no píxel 127,6; 128,0)
    const g = tileGeo(41.3354, -8.4745);
    assert.ok(Math.abs(g.cx - 127.63) < 0.01 && Math.abs(g.cy - 128.02) < 0.01, `${g.cx}, ${g.cy}`);
    assert.ok(Math.abs(g.kmPx - 0.918) < 0.002, `${g.kmPx} km por píxel`);
});

test('PNG: o descodificador lê as imagens reais do radar (filtros PNG) e as de cobertura, sem cores desconhecidas', async () => {
    const dir = fx('radar-santo-tirso/');
    const files = readdirSync(dir).filter((f) => f.endsWith('.png')).sort();
    assert.equal(files.length, 13);
    const last = await decodePng(readFileSync(new URL(files.at(-1), dir)));
    assert.deepEqual([last.width, last.height], [256, 256]);
    assert.equal(createHash('md5').update(last.data).digest('hex'), '5ec465f4a3c7bb7a4a531b2f6742779b', 'igual ao Pillow, byte a byte');
    for (const f of files) {
        const d = decodeFrame((await decodePng(readFileSync(new URL(f, dir)))).data);
        assert.equal(d.unknown, 0, `${f}: todas as cores estão na tabela`);
        assert.ok(d.echoes > 5000, `${f}: ${d.echoes} píxeis com eco`);
    }
    // o encoder dos testes e o descodificador dão o mesmo; cobertura transparente = há radar
    const rgba = new Uint8Array(4 * 6 * 5).map((_, i) => (i * 37) % 256);
    assert.deepEqual([...(await decodePng(encodePng(rgba, 6, 5))).data], [...rgba]);
    const geo = tileGeo(41.3354, -8.4745);
    assert.equal(coveredAt((await decodePng(coveragePng(true))).data, geo), true);
    assert.equal(coveredAt((await decodePng(coveragePng(false))).data, geo), false);
    await assert.rejects(decodePng(new Uint8Array([1, 2, 3])), /PNG inválida/);
});

test('radar real (Santo Tirso, 7 nov 15:10): sem chuva no ponto, os ecos fixos do radar de Arouca não "chegam" ao ponto', async () => {
    const dir = fx('radar-santo-tirso/');
    const frames = [];
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.png')).sort()) {
        frames.push({ ms: Number(f.replace('.png', '')) * 1000, dbz: decodeFrame((await decodePng(readFileSync(new URL(f, dir)))).data).dbz });
    }
    const R = analyzeRadar({ frames, geo: tileGeo(41.3354, -8.4745), nowMs: Date.parse('2026-11-07T15:16:00Z') });
    assert.equal(R.time, '2026-11-07T15:10');
    assert.deepEqual([R.ageMin, R.fresh, R.frames, R.covered], [6, true, 13, true]);
    assert.equal(R.atPoint.raining, false);
    assert.ok(R.last2h.every((x) => x.mmh === 0), 'seco no ponto nas últimas 2 h');
    assert.ok(R.rings[3].wet > 0 && R.rings[3].max > 10, 'aguaceiros fortes entre 30 e 60 km');
    assert.deepEqual([R.nearest.bearing, Object.keys(R.nearest)], ['SO', ['distanceKm', 'bearing', 'deg', 'mmh']]);
    assert.ok(R.nearest.distanceKm > 15 && R.nearest.distanceKm < 30);
    assert.equal(R.approach, null, 'nada a chegar ao ponto');
    assert.ok(!R.motion?.used, 'os ecos mudam mais do que andam: deslocamento não fiável');
    assert.match(R.text, /^Sem chuva no radar; a chuva mais perto está a \d+ km a sudoeste\.$/);
});

test('radar a chover no ponto: manda no "agora" e nos primeiros passos (prob. 90+), mesmo com os modelos 2 h atrasados', () => {
    const late = lateModels();
    const base = buildForecast(late, { lat: LAT, lon: LON, now: NOW });
    assert.equal(base.nowcast.text, 'Sem chuva prevista nas próximas 2 horas.', 'só os modelos: nada');
    assert.ok(base.now.code < 50, 'só os modelos: sem chuva agora');
    // chove no ponto desde as 15:20 (19 dBZ ≈ 0,6 mm/h, numa mancha de 15 km)
    const radar = synthFrames(LAT, LON, (t) => (t >= -20 ? [{ e: 0, n: 0, r: 15, dbz: 19 }] : []), { lastMs: LAST });
    const fc = buildForecast({ ...late, radar }, { lat: LAT, lon: LON, now: NOW });
    const R = fc.radar;
    assert.deepEqual([R.time, R.ageMin, R.fresh], ['2026-11-06T15:40', 5, true]);
    assert.deepEqual([R.atPoint.mmh, R.atPoint.dbz, R.atPoint.raining, R.atPoint.label], [0.56, 19, true, 'fraca']);
    assert.deepEqual(R.last2h.map((x) => x.mmh), [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.56, 0.56, 0.56]);
    assert.equal(fc.now.code, 61, 'chuva fraca agora');
    assert.equal(fc.now.precip, 0.6);
    assert.equal(fc.now.rainSource, 'radar');
    const S = fc.nowcast.steps;
    assert.equal(S.length, 8);
    for (const s of S.slice(0, 3)) {
        assert.ok(s.prob >= 90, `${s.time}: ${s.prob}%`);
        assert.ok(Math.abs(s.precip - 0.14) < 0.01, `${s.time}: ${s.precip} mm em 15 min`);
        assert.equal(s.radar, 1);
    }
    assert.ok(S.at(-1).radar < S[3].radar, 'depois volta aos modelos');
    assert.equal(fc.nowcast.source, 'radar+modelos');
    assert.equal(fc.nowcast.text, 'A chover agora (fraca, 0,6 mm/h); os modelos só a davam a partir das 18:00.');
    assert.equal(fc.nowcast.modelText, 'Sem chuva prevista nas próximas 2 horas.');
    assert.equal(R.compare.lagMin, 160);
    assert.equal(R.compare.text, 'O radar tem chuva no ponto desde as 15:20; os modelos só a dão às 18:00 (~2,5 h de atraso).');
    assert.ok(fc.sources.includes('RainViewer (radar)'));
    assert.ok(JSON.stringify(fc).length < 60000, 'resposta compacta');
    // imagem com mais de 20 min: não mexe no "agora" (fica a informação)
    const old = synthFrames(LAT, LON, (t) => (t >= -20 ? [{ e: 0, n: 0, r: 15, dbz: 19 }] : []), { lastMs: NOW - 35 * 6e4 });
    const fo = buildForecast({ ...late, radar: old }, { lat: LAT, lon: LON, now: NOW });
    assert.equal(fo.radar.fresh, false);
    assert.deepEqual(fo.nowcast, base.nowcast);
    assert.equal(fo.now.code, base.now.code);
    // fora da cobertura do radar, ou sem radar: como antes
    const fu = buildForecast({ ...late, radar: { ...radar, covered: false } }, { lat: LAT, lon: LON, now: NOW });
    assert.deepEqual([fu.radar.covered, fu.nowcast], [false, base.nowcast]);
    assert.equal(buildForecast({ ...late, radar: null }, { lat: LAT, lon: LON, now: NOW }).radar, null);
});

test('radar sem chuva no ponto nem à volta: abafa a chuva dos modelos nos primeiros 30–45 min e depois volta a eles', () => {
    const base = buildForecast(wraw, { lat: LAT, lon: LON, now: NOW });
    assert.match(base.nowcast.text, /^Chuva moderada/);
    const radar = synthFrames(LAT, LON, () => [], { lastMs: LAST });
    const fc = buildForecast({ ...wraw, radar }, { lat: LAT, lon: LON, now: NOW });
    assert.equal(fc.radar.nearest, null);
    assert.ok(fc.now.code < 50 || fc.now.code === 45, `sem chuva agora (${fc.now.code})`);
    assert.equal(fc.now.precip, 0);
    const [a, b] = fc.nowcast.steps, [ma, mb] = base.nowcast.steps;
    assert.ok(a.precip <= ma.precip * 0.15 && b.precip <= mb.precip * 0.15, 'chuva dos modelos abafada');
    assert.ok(a.prob < 15 && b.prob < 15);
    const w = fc.nowcast.steps.map((s) => s.radar);
    assert.ok(w[0] >= 0.85 && w.at(-1) <= 0.2 && w.every((x, i) => !i || x <= w[i - 1]), `peso do radar a cair: ${w}`);
    assert.match(fc.nowcast.text, /^Sem chuva no radar até 40 km; /);
    assert.equal(fc.radar.compare.text, 'Os modelos dão chuva às 15:45, mas o radar não a vê no ponto nem a chegar.');
    // pesos: inteiro até 30 min (15 sem deslocamento), zero aos 120 (75); sem chuva no ponto, no máximo 90%
    assert.deepEqual([radarWeight(20, { raining: true, moving: true }), radarWeight(75, { raining: true, moving: true }), radarWeight(120, { raining: true, moving: true })], [1, 0.5, 0]);
    assert.deepEqual([radarWeight(10, { raining: false, moving: false }), radarWeight(75, { raining: false, moving: false })], [0.9, 0]);
});

test('radar: chuva a aproximar-se de sudoeste a 36 km/h — deslocamento, hora de chegada e frase; ecos fixos não contam', () => {
    // célula de 10 km de raio; na última imagem o centro está a 25 km a SO (a borda a 15 km); um eco fixo a NE
    const approach = (t) => [{ e: (-25 + 0.6 * t) * SW, n: (-25 + 0.6 * t) * SW, r: 10, dbz: 30 }, { e: 22, n: 22, box: 5, dbz: 25 }];
    const radar = synthFrames(LAT, LON, approach, { lastMs: LAST });
    const R = analyzeRadar({ ...radar, nowMs: NOW });
    // os modelos dão chuva já (cenário explícito); o radar só a vê chegar daqui a ~20 min
    assert.equal(R.atPoint.raining, false);
    assert.ok(R.motion.used && Math.abs(R.motion.speedKmh - 36) <= 4, `${R.motion.speedKmh} km/h`);
    assert.deepEqual([R.motion.toDir, R.motion.fromDir], ['NE', 'SO']);
    assert.ok(R.motion.corr > 0.8);
    assert.equal(R.approach.fromDir, 'SO');
    assert.ok(Math.abs(R.approach.etaMin - 20) <= 5, `chega daqui a ${R.approach.etaMin} min (≈ 15 km a 36 km/h, menos 5 min de idade)`);
    assert.ok(Math.abs(R.approach.distanceKm - 15) <= 2, `${R.approach.distanceKm} km`);
    assert.ok(R.approach.mmh >= 2 && R.approach.mmh <= 3, `${R.approach.mmh} mm/h`);
    assert.equal(R.nearest.bearing, 'SO');
    assert.ok(R.fixedKm2 > 50, `eco fixo a NE (${R.fixedKm2} km²) fica de fora`);
    assert.match(R.text, /^Sem chuva no radar; chuva a 1[4-6] km a sudoeste, deve chegar por volta das 16:0[05]\.$/);
    const fc = buildForecast({ ...wraw, radar }, { lat: LAT, lon: LON, now: NOW });
    assert.equal(fc.nowcast.text, R.text, 'a frase das próximas 2 h é a do radar');
    const S = fc.nowcast.steps, at = (hhmm) => S.find((s) => s.time.endsWith(hhmm));
    assert.ok(at('16:00').prob < 15, 'antes de chegar: sem chuva');
    assert.ok(at('16:15').prob >= 80 && at('16:15').precip >= 0.4, 'depois de chegar: chuva');
    assert.match(fc.radar.compare.text, /^Os modelos dão chuva já, mas o radar só a vê chegar às 16:0[05] \(~(15|20) min\)\.$/);
    // a mesma célula a afastar-se para nordeste: não chega; a frase diz que se afasta
    const away = synthFrames(LAT, LON, (t) => [{ e: (25 + 0.6 * t) * SW, n: (25 + 0.6 * t) * SW, r: 10, dbz: 30 }], { lastMs: LAST });
    const A = analyzeRadar({ ...away, nowMs: NOW });
    assert.equal(A.approach, null);
    assert.equal(A.text, 'Sem chuva no radar; a chuva mais perto está a 15 km a nordeste e afasta-se para nordeste.');
    // a chover no ponto há mais de 30 min, com a mancha (20 km de raio) a sair para nordeste: hora do fim
    const ending = synthFrames(LAT, LON, (t) => [{ e: (16 + 0.6 * t) * SW, n: (16 + 0.6 * t) * SW, r: 20, dbz: 30 }], { lastMs: LAST });
    const E = analyzeRadar({ ...ending, nowMs: NOW });
    assert.equal(E.atPoint.raining, true);
    assert.ok(E.ends && E.ends.etaMin >= 0 && E.ends.etaMin <= 10, `para daqui a ${E.ends?.etaMin} min (a borda de trás está a ~4 km)`);
    assert.match(E.text, /^A chover agora \(moderada, 2,7 mm\/h\); pelo deslocamento dos ecos deve parar por volta das 15:[45]\d\.$/);
});

test('aviso do utilizador: o mais forte no "agora" durante 45 min; depois do aviso perde peso; resumo para o Claude', () => {
    const radar = synthFrames(LAT, LON, (t) => [{ e: (-25 + 0.6 * t) * SW, n: (-25 + 0.6 * t) * SW, r: 10, dbz: 30 }], { lastMs: LAST });
    const fc = buildForecast({ ...wraw, radar }, { lat: LAT, lon: LON, now: NOW, name: 'Lisboa' });
    const at = (min) => new Date(NOW - min * 6e4).toISOString();
    // chove (o radar não vê): agora é chuva; os primeiros passos 95%
    const c = withReport(fc, { kind: 'chuva', time: at(3), lat: LAT, lon: LON }, NOW);
    assert.notEqual(c, fc);
    assert.deepEqual([c.now.code, c.now.rainSource, c.report.label, c.report.ageMin], [61, 'aviso', 'Chuva', 3]);
    assert.ok(c.nowcast.steps[0].prob >= 95 && c.nowcast.steps[0].report === 1);
    assert.match(c.nowcast.text, /^Está a chover \(o teu aviso das 15:42\); /);
    assert.equal(fc.now.code < 50, true, 'a previsão original fica igual');
    // não chove (o radar dizia que vinha aí): agora seco; a chegada pelo radar continua
    const n = withReport(fc, { kind: 'nao-chove', time: at(1), lat: LAT, lon: LON }, NOW);
    assert.ok(n.now.code < 50);
    assert.equal(n.now.precip, 0);
    assert.match(n.nowcast.text, /^Não está a chover \(o teu aviso das 15:44\); chuva a \d+ km a sudoeste, deve chegar por volta das 16:0\d\.$/);
    assert.deepEqual(['nevoeiro', 'granizo', 'trovoada', 'chuva-forte'].map((k) => withReport(fc, { kind: k, time: at(1) }, NOW).now.code), [45, 89, 95, 65]);
    // fora de prazo, longe ou desconhecido: nada muda
    assert.equal(withReport(fc, { kind: 'chuva', time: at(50) }, NOW), fc);
    assert.equal(withReport(fc, { kind: 'chuva', time: at(1), lat: 38.9, lon: -9.14 }, NOW), fc);
    assert.equal(withReport(fc, { kind: 'neve', time: at(1) }, NOW), fc);
    assert.equal(reportActive({ kind: 'chuva', time: at(44) }, { nowMs: NOW }), true);
    // resumo: radar no ponto, radar vs modelos, aviso ativo e avisos recentes do conector
    const txt = buildSummary(c, { reports: [{ kind: 'chuva', time: at(3), lat: LAT, lon: LON, distanceKm: 0.1 }, { kind: 'nao-chove', time: at(200) }] });
    for (const s of ['Aviso do utilizador no ponto: Chuva às 15:42 (há 3 min)', '## Radar no ponto (RainViewer', 'Última imagem: 2026-11-06 15:40 (há 5 min), 13 imagens',
        'Últimas 2 h no ponto (mm/h): 13:40 0.0', 'Deslocamento dos ecos: para NE a 3', 'km/h (vêm de SO; confiança 0.', 'Chegada ao ponto pelo radar: ~16:0', 'Radar vs modelos: Os modelos dão chuva já',
        '## Avisos do utilizador', '2026-11-06 15:42 — Chuva (a 0.1 km do ponto)', '2026-11-06 12:25 — Não chove']) assert.ok(txt.includes(s), `falta "${s}"`);
    assert.ok(txt.indexOf('## Radar no ponto') > txt.indexOf('## Agora') && txt.indexOf('## Radar no ponto') < txt.indexOf('## Das 12 às 48 h'));
});

test('radar: chove no ponto a partir de 0,1 mm/h na média de 3×3 píxeis (~2,8 km): um píxel fraco isolado não chega', () => {
    const g = tileGeo(LAT, LON), i0 = Math.floor(g.cx), j0 = Math.floor(g.cy);
    const one = synthFrames(LAT, LON, () => [], { lastMs: LAST, n: 2 });
    one.frames.at(-1).dbz[j0 * g.w + i0] = 23; // 1 mm/h num só píxel → 0,11 mm/h de média
    let R = analyzeRadar({ ...one, nowMs: NOW });
    assert.equal(R.atPoint.raining, true, '1 mm/h num píxel dá 0,11 mm/h de média');
    one.frames.at(-1).dbz[j0 * g.w + i0] = 15; // 0,32 mm/h num só píxel → 0,035 mm/h
    R = analyzeRadar({ ...one, nowMs: NOW });
    assert.equal(R.atPoint.raining, false);
    assert.ok(R.atPoint.mmh > 0 && R.atPoint.mmh < RADAR.wetMmh);
});
