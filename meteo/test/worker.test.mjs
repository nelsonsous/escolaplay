// Rotas do Worker com fetch e KV simulados.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';
import { validateAnalysis, ANALYSIS_SCHEMA } from '../public/lib/analysis.js';

const ORIGIN = 'https://meteo.example.workers.dev';
function kv() {
    const m = new Map();
    return { m, get: async (k, t) => (m.has(k) ? (t === 'json' ? JSON.parse(m.get(k)) : m.get(k)) : null), put: async (k, v) => { m.set(k, v); }, delete: async (k) => { m.delete(k); } };
}
let env, upstream;
const ctx = { waitUntil() {} };
beforeEach(() => {
    env = { KV: kv() };
    upstream = [];
    globalThis.fetch = async (u) => { upstream.push(String(u)); return new Response(String(u).includes('metar') ? '[{"icaoId":"LPPT"}]' : 'latitude,longitude\n', { status: 200 }); };
});
const call = (path, init = {}) => worker.fetch(new Request(ORIGIN + path, init), env, ctx);

test('estado e ficheiros estáticos', async () => {
    const r = await call('/api/status');
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.equal(j.onDemand, false);
    assert.deepEqual(j.schedule, ['07:34', '13:34', '20:34']);
    const idx = await call('/');
    assert.equal(idx.status, 200);
    assert.match(idx.headers.get('content-type'), /text\/html/);
    assert.equal(idx.headers.get('cache-control'), 'no-cache');
    const lib = await call('/lib/engine.js');
    assert.match(await lib.text(), /buildForecast/);
    assert.equal((await call('/lib/engine.js', { headers: { 'if-none-match': lib.headers.get('etag') } })).status, 304);
    assert.equal((await call('/nada.txt')).status, 404);
});

test('proxies só para as fontes previstas', async () => {
    assert.equal((await call('/api/raw/metar?lat=38.7&lon=-9.1')).status, 200);
    assert.match(upstream.at(-1), /aviationweather\.gov\/api\/data\/metar\?bbox=38\.25,-9\.70,39\.15,-8\.50/);
    assert.equal((await call('/api/raw/firms?sat=n20')).status, 200);
    assert.equal((await call('/api/raw/firms?sat=xpto')).status, 400);
    assert.equal((await call('/api/raw/om/forecast?latitude=1&longitude=2&hourly=x')).status, 200);
    assert.match(upstream.at(-1), /^https:\/\/api\.open-meteo\.com\/v1\/forecast\?latitude=1/);
    assert.equal((await call('/api/raw/om/evil?latitude=1&longitude=2')).status, 400);
    assert.equal((await call('/api/raw/metar-history?id=../x')).status, 400);
    const s = await call('/api/sat?layer=airmass&lat=38.7&lon=-9.1&km=800');
    assert.equal(s.status, 200);
    assert.equal(s.headers.get('x-sat-layer'), 'airmass');
    assert.match(upstream.at(-1), /view\.eumetsat\.int\/geoserver\/ows\?.*msg_fes%3Argb_airmass/);
});

test('locais: só da própria origem, máximo 5, sem duplicados, e apagar', async () => {
    const post = (b, origin = ORIGIN) => call('/api/places', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(b) });
    assert.equal((await post({ name: 'Casa', lat: 38.72, lon: -9.14 }, 'https://evil.example')).status, 403);
    const r = await post({ name: 'Casa', lat: 38.72, lon: -9.14 });
    assert.equal(r.status, 201);
    assert.equal((await r.json()).id, 'casa');
    assert.equal((await post({ name: 'Outra', lat: 38.7201, lon: -9.1401 })).status, 200, 'mesmo sítio devolve o existente');
    for (let i = 1; i <= 4; i++) assert.equal((await post({ name: `L${i}`, lat: 38 + i, lon: -9 })).status, 201);
    assert.equal((await post({ name: 'L6', lat: 30, lon: -9 })).status, 409);
    assert.equal((await call('/api/places/casa', { method: 'DELETE', headers: { origin: ORIGIN } })).status, 204);
    assert.equal((await (await call('/api/places')).json()).length, 4);
});

test('análise: devolve a do local registado mais próximo (≤ 10 km)', async () => {
    env.KV.m.set('places', JSON.stringify([{ id: 'casa', name: 'Casa', lat: 38.72, lon: -9.14 }]));
    env.KV.m.set('analysis:casa', JSON.stringify({ titulo: 'Teste', generatedAt: new Date(Date.now() - 60e4).toISOString() }));
    const j = await (await call('/api/analysis?lat=38.75&lon=-9.15')).json();
    assert.equal(j.place.id, 'casa');
    assert.equal(j.analysis.titulo, 'Teste');
    assert.equal(j.ageMin, 10);
    const far = await (await call('/api/analysis?lat=41.15&lon=-8.61')).json();
    assert.equal(far.analysis, null);
});

test('análise imediata sem chave responde 503 com explicação', async () => {
    const r = await call('/api/analysis/refresh?lat=38.7&lon=-9.1', { method: 'POST', headers: { origin: ORIGIN }, body: '{}' });
    assert.equal(r.status, 503);
    assert.equal((await r.json()).error, 'sem_chave');
});

test('validação da análise: limites, listas e valores permitidos', () => {
    const base = { titulo: 'Chuva sábado', resumo: 'r', agora: 'a', hoje: 'h', amanha: 'm', dias: [{ data: '2026-11-08', texto: 't', confianca: 'alta' }],
        tendencia: 't', alertas: [{ tipo: 'chuva', nivel: 'amarelo', quando: 'sáb', texto: 'x' }], incendios: '', satelite: '', conselhos: ['Leva guarda-chuva'],
        fiabilidade: { curto: 'alta', medio: 'media', texto: 'ok' }, tecnica: 't', verificacao: '', licoes: [] };
    assert.equal(validateAnalysis(base, { strict: true }).ok, true);
    const bad = validateAnalysis({ ...base, titulo: 'x'.repeat(91), alertas: [{ tipo: 'tornado', nivel: 'roxo', texto: 'x' }] }, { strict: true });
    assert.equal(bad.ok, false);
    assert.equal(bad.errors.length, 3);
    const soft = validateAnalysis({ ...base, titulo: 'x'.repeat(200) });
    assert.equal(soft.value.titulo.length, 90);
    assert.equal(ANALYSIS_SCHEMA.additionalProperties, false);
    assert.ok(ANALYSIS_SCHEMA.required.includes('licoes'));
});
