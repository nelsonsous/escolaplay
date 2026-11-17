// «Não chove» contra a previsão (1.26): o que a previsão dizia, a explicação e a correção da chuva fraca do local.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { forecastAt, saidRain, contradiction, cleanPrev, rainCalib, applyRainCalib, explainReport, RAIN_REPORT } from '../lib/avisos.js';
import { buildForecast, buildSummary } from '../lib/engine.js';

const NOW = Date.parse('2026-11-16T14:00:00Z');
const at = (h) => new Date(NOW - h * 36e5).toISOString();
const rep = (kind, h, prev, o = {}) => ({ kind, time: at(h), lat: 41.3, lon: -8.5, distanceKm: 0.2, prev, ...o });
const WET = { pop: 70, mm: 0.4, radar: 'seco', code: 61 }, DRY = { pop: 10, mm: 0, radar: 'seco', code: 3 };

test('o que a previsão dizia: probabilidade (o máximo do agora e da 1.ª hora), mm/h, radar e código', () => {
    const fc = { now: { precip: 0.2, code: 61 }, hourly: [{ pop: 55 }], nowcast: { steps: [{ prob: 62, precip: 0.05 }, { prob: 48, precip: 0.15 }, { prob: 90, precip: 2 }] },
        radar: { fresh: true, atPoint: { raining: false } } };
    assert.deepEqual(forecastAt(fc), { pop: 62, mm: 0.6, radar: 'seco', code: 61 });
    assert.equal(forecastAt({}), null);
    assert.equal(forecastAt({ now: { code: 3 }, hourly: [{ pop: 5 }] }).radar, null, 'sem radar');
});

test('dava chuva? e o aviso contradiz-a?', () => {
    assert.equal(saidRain(WET), true);
    assert.equal(saidRain({ pop: 50 }), true);
    assert.equal(saidRain({ pop: 20, mm: 0.2 }), true, 'chuva no agora');
    assert.equal(saidRain(DRY), false);
    assert.equal(saidRain({ pop: 40 }), null, 'no meio (35–45%): não se sabe');
    assert.equal(saidRain({ pop: 10, radar: 'chuva' }), null, 'o radar via chuva');
    assert.equal(saidRain(null), null);
    assert.equal(contradiction('nao-chove', WET), 'seco');
    assert.equal(contradiction('chuva', DRY), 'chuva');
    assert.equal(contradiction('chuva-forte', WET), null, 'confirma');
    assert.equal(contradiction('nao-chove', DRY), null, 'confirma');
    assert.equal(contradiction('nevoeiro', WET), null);
});

test('o prev que vem do telemóvel fica só com números e palavras conhecidas', () => {
    assert.deepEqual(cleanPrev({ pop: '62', mm: 0.43, radar: 'seco', code: 61, x: '<script>' }), { pop: 62, mm: 0.4, radar: 'seco', code: 61 });
    assert.deepEqual(cleanPrev({ pop: 900, radar: 'talvez' }), null);
    assert.equal(cleanPrev('chuva'), null);
});

test('a correção do local: «Não chove» com chuva prevista, 2+ em 30 dias e em metade ou mais das vezes', () => {
    assert.equal(rainCalib([rep('nao-chove', 2, WET)], { nowMs: NOW }), null, 'só um');
    const two = [rep('nao-chove', 2, WET), rep('nao-chove', 30, WET)];
    assert.deepEqual(rainCalib(two, { nowMs: NOW }), { factor: 0.84, dry: 2, n: 2, days: 30 }, '2 de 2: 1 − 0,4 × 1 × 2/5');
    // os que confirmaram a chuva prevista contam contra; abaixo de metade, nada
    assert.equal(rainCalib([...two, rep('chuva', 50, WET), rep('chuva', 70, WET), rep('chuva', 90, WET)], { nowMs: NOW }), null);
    // com 5 ou mais, a correção é inteira (até −40%)
    const five = [0, 1, 2, 3, 4].map((d) => rep('nao-chove', 24 * d + 2, WET));
    assert.equal(rainCalib(five, { nowMs: NOW }).factor, 0.6);
    // a mesma hora conta uma vez; previsões sem chuva, avisos de longe e com mais de 30 dias não contam
    assert.equal(rainCalib([rep('nao-chove', 1.5, WET), rep('nao-chove', 1.9, WET), rep('nao-chove', 31 * 24, WET), rep('nao-chove', 5, WET, { distanceKm: 8 }), rep('nao-chove', 6, DRY)], { nowMs: NOW }), null);
    assert.equal(rainCalib(null), null);
});

test('aplicar a correção: só a chuva fraca das próximas 48 h e o agora (sem chuva no radar)', () => {
    const fc = { hourly: [{ pop: 60, precip: 0.3 }, { pop: 80, precip: 3 }, { pop: 50, precip: 0.2 }], nowcast: { steps: [{ prob: 70, precip: 0.1 }, { prob: 90, precip: 1 }] }, radar: { fresh: true, atPoint: { raining: false } } };
    const out = applyRainCalib(fc, { factor: 0.84, dry: 2, n: 2, days: 30 });
    assert.deepEqual(out.hourly.map((h) => h.pop), [50, 80, 42], 'a chuva a sério (3 mm/h) fica');
    assert.deepEqual(out.nowcast.steps.map((s) => s.prob), [59, 90], '4 mm/h no 2.º passo: fica');
    assert.match(out.rainCalib.text, /disseste «Não chove» 2 vezes em 2 em que a previsão dava chuva: aqui a chuva fraca conta 16% menos/);
    assert.equal(applyRainCalib(fc, null), fc);
    const wetRadar = applyRainCalib({ ...fc, radar: { fresh: true, atPoint: { raining: true } } }, { factor: 0.84, dry: 2, n: 2, days: 30 });
    assert.deepEqual(wetRadar.nowcast.steps.map((s) => s.prob), [70, 90], 'com chuva no radar o agora não se mexe');
});

test('porque dizia chuva: modelos, radar, estações, veredicto e o que a aprendizagem faz', () => {
    const fc = { now: { precip: 0.4, code: 61, obs: { precip1h: 0, n: 3 } }, hourly: [{ pop: 70, agree: 0.7 }], nowcast: { steps: [] },
        radar: { fresh: true, ageMin: 6, atPoint: { raining: false, mmh: 0 }, rings: [{ km: 5, wet: 0 }, { km: 15, wet: 0.2 }, { km: 30, wet: 0.5 }, { km: 60, wet: 0.6 }] } };
    const r = rep('nao-chove', 0, forecastAt(fc));
    const w = explainReport(fc, r, [r]);
    assert.equal(w.kind, 'seco');
    assert.equal(w.title, 'Porque dizia chuva');
    assert.deepEqual(w.lines.slice(0, 5), ['A previsão dava 70% de chuva agora (0,4 mm/h).', 'Os modelos estavam quase todos de acordo.',
        'O radar não via chuva no ponto; a mais perto estava entre 5 e 15 km.', 'As estações perto (3) não mediram chuva na última hora.', 'Havia chuva perto: passou ao lado do ponto.']);
    assert.match(w.lines[5], /perdem peso na chuva deste local/);
    assert.match(w.lines[6], /Se voltar a acontecer \(2 vezes em 30 dias\)/);
    // o segundo em 30 dias: a correção entra
    const w2 = explainReport(fc, r, [r, rep('nao-chove', 26, WET)]);
    assert.match(w2.lines[6], /a chuva fraca conta 16% menos/);
    // sem chuva perto no radar: falso alarme
    const fcSeco = { ...fc, radar: { ...fc.radar, rings: fc.radar.rings.map((x) => ({ ...x, wet: 0 })) } };
    assert.ok(explainReport(fcSeco, r, [r]).lines.includes('Os modelos deram chuva que não estava a cair: um falso alarme.'));
    // o contrário: chuva sem estar prevista
    const fcDry = { now: { precip: 0, code: 3, obs: { precip1h: 0.2, n: 2 } }, hourly: [{ pop: 10 }], radar: { fresh: true, atPoint: { raining: false }, rings: [] } };
    const w3 = explainReport(fcDry, rep('chuva', 0, forecastAt(fcDry)), []);
    assert.equal(w3.title, 'Porque não dizia chuva');
    assert.ok(w3.lines.some((l) => /radar e os modelos falham/.test(l)));
    // a confirmar a previsão: nada a explicar
    assert.equal(explainReport(fc, rep('chuva', 0, forecastAt(fc)), []), null);
});

test('na previsão: os avisos com o que a previsão dizia corrigem a chuva fraca e aparecem no resumo da análise', () => {
    const raw = JSON.parse(readFileSync(new URL('./fixtures/lisboa-2026-11-06.json', import.meta.url), 'utf8'));
    const now = Date.parse('2026-11-06T15:45:00Z'), ago = (h) => new Date(now - h * 36e5).toISOString();
    const reports = [{ kind: 'nao-chove', time: ago(1), distanceKm: 0.3, prev: WET }, { kind: 'nao-chove', time: ago(30), distanceKm: 0.3, prev: WET }];
    // os mesmos avisos sem o que a previsão dizia: contam na aprendizagem dos modelos, mas não corrigem o local
    const base = buildForecast({ ...raw, reports: reports.map(({ prev, ...r }) => r) }, { lat: 38.7223, lon: -9.1393, now: '2026-11-06T15:45:00Z' });
    assert.equal(base.rainCalib, undefined);
    const fc = buildForecast({ ...raw, reports }, { lat: 38.7223, lon: -9.1393, now: '2026-11-06T15:45:00Z' });
    assert.deepEqual(fc.rainCalib && [fc.rainCalib.factor, fc.rainCalib.dry], [0.84, 2]);
    const light = base.hourly.map((h, i) => [h, fc.hourly[i]]).filter(([h], i) => i < RAIN_REPORT.hours && h.pop > 0 && !(h.precip >= 1));
    assert.ok(light.length, 'há horas de chuva fraca no dia de teste');
    for (const [a, b] of light) assert.equal(b.pop, Math.round(a.pop * 0.84));
    const s = buildSummary(fc, { reports });
    assert.match(s, /Não chove \(a 0\.3 km do ponto\); a previsão dava 70%, 0\.4 mm\/h, radar seco ← CONTRADIZ: previa-se chuva/);
    assert.match(s, /Avisos que contradizem a previsão: 2\. Explica em "verificacao"/);
    assert.match(s, /Correção do local já aplicada: Nos últimos 30 dias disseste «Não chove» 2 vezes em 2/);
});
