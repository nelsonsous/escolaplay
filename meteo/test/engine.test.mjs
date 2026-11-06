// Motor de previsão com dados reais de Lisboa (6 nov 2026, 15:45 UTC).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildForecast, buildSummary, perModelTable, parseEns, nowcastText, pickStation } from '../public/lib/engine.js';
import { wquantile, robustMean, vecDir, haversine, bearing, compass, dewPoint, relHum, wfrac } from '../public/lib/stats.js';

const raw = JSON.parse(readFileSync(new URL('./fixtures/lisboa-2026-11-06.json', import.meta.url), 'utf8'));
const NOW = '2026-11-06T15:45:00Z';
const LAT = 38.7223, LON = -9.1393;
const fc = buildForecast(raw, { lat: LAT, lon: LON, now: NOW });

test('estatística: quantis, média robusta, direção, geo e humidade', () => {
    assert.equal(wquantile([1, 2, 3], [1, 1, 1], 0.5), 2);
    assert.equal(wquantile([5], [1], 0.9), 5);
    assert.ok(Math.abs(robustMean([17, 17.5, 18, 11.9], [1, 1, 1, 1.3], 2) - 17.5) < 0.01, 'rejeita o modelo discrepante');
    assert.ok(Math.abs(vecDir([350, 10], [10, 10]) - 0) < 1e-6 || Math.abs(vecDir([350, 10], [10, 10]) - 360) < 1e-6);
    assert.ok(Math.abs(haversine(38.7223, -9.1393, 41.1579, -8.6291) - 274) < 3, 'Lisboa-Porto ≈ 274 km');
    assert.equal(compass(bearing(38.7, -9.1, 41.1, -8.6)), 'N');
    const td = dewPoint(20, 50);
    assert.ok(Math.abs(td - 9.3) < 0.2);
    assert.ok(Math.abs(relHum(20, td) - 50) < 0.5);
    assert.equal(wfrac([0, 0.2, 1], [1, 1, 2], 0.1), 0.75);
});

test('previsão tem o formato do contrato', () => {
    assert.equal(fc.v, 1);
    assert.equal(fc.hourly.length, 72);
    assert.equal(fc.daily.length, 16);
    assert.equal(fc.hourly[0].time, '2026-11-06T15:00');
    assert.equal(fc.location.timezone, 'Europe/Lisbon');
    for (const k of ['now', 'nowcast', 'indicators', 'warnings', 'fire', 'models', 'ensemble', 'sources']) assert.ok(k in fc, `falta ${k}`);
    for (const h of fc.hourly) {
        assert.ok(h.pop == null || (h.pop >= 0 && h.pop <= 100));
        assert.ok(Number.isInteger(h.code));
        assert.ok(h.tempLo <= h.temp + 0.05 && h.temp <= h.tempHi + 0.05, `faixa incoerente às ${h.time}`);
    }
    for (const d of fc.daily) {
        assert.ok(d.tmin <= d.tmax, `mín > máx em ${d.date}`);
        assert.ok(d.tmaxP10 <= d.tmax && d.tmax <= d.tmaxP90);
        assert.ok(['alta', 'media', 'baixa'].includes(d.confidence));
    }
    assert.ok(JSON.stringify(fc).length < 60000, 'resposta compacta');
});

test('usa 9 modelos e 212 cenários de 6 ensembles', () => {
    assert.equal(fc.models.length, 9);
    assert.equal(fc.ensemble.members, 212);
    assert.equal(fc.ensemble.models.length, 6);
    const e = parseEns(raw.ens);
    assert.deepEqual(e.systems.map((s) => s.members).sort((a, b) => a - b), [18, 21, 31, 40, 51, 51]);
});

test('verificação local com 7 dias de METAR dá mais peso ao melhor modelo', () => {
    const v = fc.verification;
    assert.equal(v.source, 'METAR');
    assert.ok(v.n > 100);
    assert.equal(v.best, 'ecmwf_ifs');
    const ec = fc.models.find((m) => m.id === 'ecmwf_ifs'), gfs = fc.models.find((m) => m.id === 'gfs_seamless');
    assert.ok(ec.weight > 2 * gfs.weight, 'ECMWF (erro 0,9 °C) pesa mais do que o GFS (viés +1,1 °C)');
    assert.equal(v.biasApplied, true);
});

test('observação da estação IPMA a 1 km corrige as próximas horas e a correção decai', () => {
    const o = fc.now.obs;
    assert.equal(o.source, 'IPMA');
    assert.ok(o.distanceKm <= 2);
    assert.ok(fc.now.correction && fc.now.correction.temp < 0, 'modelos estavam mais quentes do que o observado');
    // com a altitude da estação conhecida, o "agora" fica quase igual ao observado
    const st = pickStation({ ipmaStations: raw.ipma.stations, ipmaObs: raw.ipma.obs, metar: raw.metar, lat: LAT, lon: LON, nowMs: Date.parse(NOW) });
    const fc2 = buildForecast({ ...raw, station: st, stationElev: 77 }, { lat: LAT, lon: LON, now: NOW });
    assert.ok(Math.abs(fc2.now.temp - o.temp) <= 0.6, `agora ${fc2.now.temp} vs observado ${o.temp}`);
});

test('avisos IPMA do distrito, risco de incêndio e focos de satélite', () => {
    assert.ok(fc.warnings.length >= 1);
    assert.ok(fc.warnings.every((w) => w.source === 'IPMA' && ['yellow', 'orange', 'red'].includes(w.level)));
    assert.equal(fc.fire.risk.dico, '1106');
    assert.equal(fc.fire.risk.label, 'Reduzido');
    assert.ok(fc.fire.hotspots.count >= 1 && fc.fire.hotspots.items.every((h) => h.distanceKm <= 50));
    assert.equal(fc.fire.rule30.hours, 0);
});

test('fora de Portugal não há IPMA nem incêndios PT, e o motor não falha', () => {
    const f = buildForecast({ det: raw.det, ens: raw.ens }, { lat: 48.85, lon: 2.35, now: NOW });
    assert.deepEqual(f.warnings, []);
    assert.equal(f.fire.risk, null);
    assert.equal(f.now.obs, null);
    assert.equal(f.verification, null);
});

test('sem ensemble usa só os modelos, com confiança pela dispersão entre eles', () => {
    const f = buildForecast({ det: raw.det }, { lat: LAT, lon: LON, now: NOW });
    assert.equal(f.ensemble.members, 0);
    assert.equal(f.daily.length, 16);
    assert.ok(f.daily.slice(0, 5).every((d) => d.source === 'multimodelo'));
});

test('frase das próximas 2 horas', () => {
    const s = (p, prob) => ({ time: '2026-11-06T16:00', precip: p, prob });
    assert.equal(nowcastText(Array(8).fill(s(0, 0))), 'Sem chuva prevista nas próximas 2 horas.');
    assert.match(nowcastText([s(0, 0), s(0, 0), s(0.5, 80), s(0.5, 80), s(0.5, 80), s(0.5, 80), s(0.5, 80), s(0.5, 80)]), /^Chuva moderada a partir das/);
    assert.match(nowcastText(Array(8).fill(s(0.05, 30))), /^Possibilidade de chuva fraca/);
});

test('resumo para o Claude inclui o essencial', () => {
    const txt = buildSummary(fc, { perModel: perModelTable(raw.det) });
    for (const s of ['## Agora', 'Lisboa (Geofísico)', '## 16 dias', '## Incêndios', '## Verificação local', 'ECMWF IFS', 'Precipitação']) assert.ok(txt.includes(s), `falta "${s}"`);
    assert.ok(txt.length < 20000);
});
