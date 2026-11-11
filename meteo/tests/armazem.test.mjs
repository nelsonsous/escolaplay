// O localStorage do telemóvel (~5 MB para o endereço todo: a Meteo, a Música e a Mercados estão no mesmo). Cheio, a última
// previsão não se guardava e a app abria à espera da rede («A combinar os modelos…»). Até à 1.20 o risco de incêndio ficava
// numa chave nova por hora (~50 KB) que nunca se apagava.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { staleCacheKeys } from '../lib/data.js';

// um localStorage com limite (em caracteres), como o do Safari
function fakeStorage(limit) {
    const m = new Map();
    const size = () => [...m].reduce((a, [k, v]) => a + k.length + v.length, 0);
    return {
        get length() { return m.size; },
        key: (i) => [...m.keys()][i] ?? null,
        getItem: (k) => (m.has(k) ? m.get(k) : null),
        setItem(k, v) {
            const old = m.get(k);
            m.set(k, String(v));
            if (size() > limit) { if (old == null) m.delete(k); else m.set(k, old); throw Object.assign(new Error('QuotaExceededError'), { name: 'QuotaExceededError' }); }
        },
        removeItem: (k) => { m.delete(k); },
        _m: m,
    };
}
globalThis.localStorage = fakeStorage(2_400_000);
const api = await import('../api.js');

test('cache: as chaves de nome antigo (risco de incêndio por hora) saem sempre; as outras quando passam do que valem', () => {
    const now = Date.parse('2026-11-11T13:00:00Z'), h = (msAgo) => `{"t":${now - msAgo},"v":`;
    const keys = staleCacheKeys([
        ['ipma:rcm0:2026-11-10T09', h(1e3)], ['ipma:rcm1:2026-11-11T12', h(1e3)], // nome antigo: sempre
        ['ipma:rcm0', h(30 * 60e3)], ['ipma:rcm0x', h(2 * 864e5)], // o nome novo: fica enquanto vale
        ['ipma:agg:1131200', h(2 * 864e5)], ['ipma:stations', h(3600e3)],
        ['clim:41.3,-8.5:2026-W44', h(9 * 864e5)], ['clim:41.3,-8.5:2026-W46', h(864e5)],
        ['rev:41.34,-8.47', h(10 * 864e5)], ['rvcov:v1:41.335,-8.475', h(8 * 864e5)],
        ['outra:coisa', h(40 * 864e5)], ['estragada', 'não é JSON'],
    ], now);
    assert.deepEqual(keys, ['ipma:rcm0:2026-11-10T09', 'ipma:rcm1:2026-11-11T12', 'ipma:rcm0x', 'ipma:agg:1131200', 'clim:41.3,-8.5:2026-W44', 'rvcov:v1:41.335,-8.475', 'outra:coisa', 'estragada']);
});

test('previsão: sem espaço, a cache e as análises de outros locais saem para a previsão caber (abre logo na vez seguinte)', () => {
    const ls = globalThis.localStorage;
    ls._m.clear();
    // como estava o telemóvel: dezenas de horas de risco de incêndio guardadas (cada ~48 KB) e a análise de outro local
    const rcm = JSON.stringify({ t: Date.now(), v: { data: 'x'.repeat(48_000) } });
    for (let i = 0; i < 48; i++) ls.setItem(`mc:ipma:rcm0:2026-11-${String(1 + Math.floor(i / 24)).padStart(2, '0')}T${String(i % 24).padStart(2, '0')}`, rcm);
    api.store.set('meteo:an:38.7223,-9.1393', { savedAt: Date.now(), data: { text: 'y'.repeat(40_000) } });
    api.store.set('meteo:an:41.3354,-8.4745', { savedAt: Date.now(), data: { text: 'análise deste local' } });
    const fc = { v: 1, hourly: Array.from({ length: 72 }, (_, i) => ({ time: i, temp: 15 })), pad: 'z'.repeat(150_000) };
    assert.equal(api.store.set('teste', fc), false, 'cheio: a previsão não cabia');
    assert.equal(api.saveForecast(41.3354, -8.4745, fc), true);
    assert.equal(api.loadSavedForecast(41.3354, -8.4745).fc.pad.length, 150_000);
    assert.equal(api.store.keys('mc:').length, 0, 'a cache saiu');
    assert.deepEqual(api.store.keys('meteo:an:'), ['meteo:an:41.3354,-8.4745'], 'a análise deste local fica');
});

test('análises guardadas: as de locais por onde não se passa há mais de 14 dias saem', () => {
    globalThis.localStorage._m.clear();
    const now = Date.parse('2026-11-11T13:00:00Z');
    api.store.set('meteo:an:1,1', { savedAt: now - 15 * 864e5, data: {} });
    api.store.set('meteo:an:2,2', { savedAt: now - 2 * 864e5, data: {} });
    api.store.set('meteo:an:3,3', 'estragada');
    api.tidyAnalyses(now);
    assert.deepEqual(api.store.keys('meteo:an:'), ['meteo:an:2,2']);
});
