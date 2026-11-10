// O mar perto do ponto (lib/marine.js), com uma resposta real da Open-Meteo Marine (Matosinhos, 10 nov 2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { marineSummary, waterFeel, seaState, SEA_MAX_KM } from '../lib/marine.js';
import { omQueries } from '../lib/sources.js';

const RAW = JSON.parse(readFileSync(new URL('./fixtures/marine-matosinhos.json', import.meta.url)));

test('mar: na praia, a água e as ondas de agora e os próximos dias; no interior (mar a > 12 km), nada', () => {
    const m = marineSummary(RAW, { lat: 41.176, lon: -8.693, nowIso: '2026-11-10T00:30' });
    assert.ok(m.distanceKm > 3 && m.distanceKm < 5, `a ${m.distanceKm} km`);
    assert.deepEqual([m.now.sst, m.now.wave, m.now.period], [15.9, 3.6, 10.3]);
    assert.equal(m.days.length, 7);
    assert.equal(m.days[0].date, '2026-11-10');
    assert.ok(m.days.every((d) => d.sstMin <= d.sstMax && d.sstMin > 10 && d.sstMax < 25));
    assert.ok(m.days.every((d) => d.waveMax > 0));
    // a hora conta: ao meio-dia, os valores do meio-dia
    const i = RAW.hourly.time.indexOf('2026-11-10T12:00');
    assert.equal(marineSummary(RAW, { lat: 41.176, lon: -8.693, nowIso: '2026-11-10T12:10' }).now.wave, Math.round(RAW.hourly.wave_height[i] * 10) / 10);
    // Santo Tirso: a célula de mar mais perto está a ~15 km → sem cartão
    assert.equal(marineSummary(RAW, { lat: 41.34, lon: -8.47, nowIso: '2026-11-10T00:30' }), null);
    assert.equal(SEA_MAX_KM, 12);
    assert.equal(marineSummary(null, { lat: 41, lon: -8 }), null);
    assert.equal(marineSummary({ ...RAW, hourly: { ...RAW.hourly, sea_surface_temperature: RAW.hourly.time.map(() => null) } }, { lat: 41.176, lon: -8.693 }), null, 'sem temperatura da água: nada');
});

test('mar: palavras para a água e para as ondas; o pedido escolhe a célula de mar', () => {
    assert.deepEqual([13, 15.9, 18, 20.5, 23, 26].map(waterFeel), ['muito fria', 'fria', 'fresca', 'agradável', 'amena', 'quente']);
    assert.deepEqual([0.3, 1, 2, 3.6, 5].map(seaState), ['mar calmo', 'ondas pequenas', 'ondulação moderada', 'mar agitado', 'mar muito agitado']);
    const q = new URLSearchParams(omQueries(41.176, -8.693).marine);
    assert.equal(q.get('cell_selection'), 'sea');
    assert.match(q.get('hourly'), /sea_surface_temperature/);
});
