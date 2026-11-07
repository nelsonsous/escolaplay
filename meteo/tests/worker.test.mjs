// Rotas do Worker com fetch e KV simulados.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../proxy/src/worker.js';
import { validateAnalysis, ANALYSIS_SCHEMA, SYSTEM_PROMPT, regionalPhrases } from '../lib/analysis.js';

const ORIGIN = 'https://meteo.example.workers.dev';
function kv() {
    const m = new Map(), opts = new Map();
    return { m, opts, get: async (k, t) => (m.has(k) ? (t === 'json' ? JSON.parse(m.get(k)) : m.get(k)) : null), put: async (k, v, o) => { m.set(k, v); opts.set(k, o || null); }, delete: async (k) => { m.delete(k); } };
}
let env, upstream;
const ctx = { waitUntil() {} };
beforeEach(() => {
    env = { KV: kv() };
    upstream = [];
    globalThis.fetch = async (u) => { upstream.push(String(u)); return new Response(String(u).includes('metar') ? '[{"icaoId":"LPPT"}]' : 'latitude,longitude\n', { status: 200 }); };
});
const call = (path, init = {}) => worker.fetch(new Request(ORIGIN + path, init), env, ctx);

test('estado, CORS e endereço da app', async () => {
    const r = await call('/api/status');
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.equal(j.onDemand, false);
    assert.equal(j.version, '1.3.0');
    assert.deepEqual(j.schedule, ['07:34', '13:34', '20:34']);
    assert.equal(r.headers.get('access-control-allow-origin'), '*');
    const root = await call('/');
    assert.equal(root.status, 302);
    assert.equal(root.headers.get('location'), 'https://nelsonsous.github.io/escolaplay/meteo/');
    assert.equal((await call('/nada.txt')).status, 404);
    const pre = await call('/api/places', { method: 'OPTIONS', headers: { origin: 'https://nelsonsous.github.io' } });
    assert.equal(pre.status, 204);
    assert.match(pre.headers.get('access-control-allow-methods'), /POST/);
    assert.match(pre.headers.get('access-control-allow-methods'), /PATCH/, 'o browser pode mudar um local de sítio');
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
    assert.equal((await post({ name: 'Pages', lat: 40, lon: -8 }, 'https://nelsonsous.github.io')).status, 403, 'sem ALLOWED_ORIGINS só o próprio conector grava');
    env.ALLOWED_ORIGINS = 'https://nelsonsous.github.io';
    const pg = await post({ name: 'Pages', lat: 40, lon: -8 }, 'https://nelsonsous.github.io');
    assert.equal(pg.status, 201);
    await call('/api/places/pages', { method: 'DELETE', headers: { origin: 'https://nelsonsous.github.io' } });
    const r = await post({ name: 'Casa', lat: 38.72, lon: -9.14 });
    assert.equal(r.status, 201);
    assert.equal((await r.json()).id, 'casa');
    assert.equal((await post({ name: 'Outra', lat: 38.7201, lon: -9.1401 })).status, 200, 'mesmo sítio devolve o existente');
    for (let i = 1; i <= 4; i++) assert.equal((await post({ name: `L${i}`, lat: 38 + i, lon: -9 })).status, 201);
    assert.equal((await post({ name: 'L6', lat: 30, lon: -9 })).status, 409);
    env.KV.m.set('analysis:casa', JSON.stringify({ titulo: 'Última análise', generatedAt: new Date().toISOString() }));
    assert.equal((await call('/api/places/casa', { method: 'DELETE', headers: { origin: ORIGIN } })).status, 204);
    assert.equal((await (await call('/api/places')).json()).length, 4);
    // desligar não apaga a análise: ao voltar a ligar o mesmo local (mesmo id) aparece de novo
    assert.ok(env.KV.m.has('analysis:casa'), 'a análise fica guardada');
    assert.equal((await (await call('/api/analysis?lat=38.72&lon=-9.14')).json()).analysis, null, 'sem local registado não é servida');
    const again = await post({ name: 'Casa', lat: 38.72, lon: -9.14 });
    assert.equal(again.status, 201);
    assert.equal((await again.json()).id, 'casa');
    assert.equal((await (await call('/api/analysis?lat=38.72&lon=-9.14')).json()).analysis.titulo, 'Última análise');
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

test('PATCH /api/places/<id>: muda o ponto, mantém o id (análise e lições ficam), só da própria origem', async () => {
    const places = [{ id: 'santo-tirso', name: 'Santo Tirso', lat: 41.3354, lon: -8.4745, createdAt: '2026-11-01T10:00:00Z' },
        { id: 'porto', name: 'Porto', lat: 41.1496, lon: -8.611, createdAt: '2026-11-02T10:00:00Z' }];
    env.KV.m.set('places', JSON.stringify(places));
    env.KV.m.set('analysis:santo-tirso', JSON.stringify({ titulo: 'Nevoeiro no vale', generatedAt: new Date().toISOString(), place: places[0] }));
    env.KV.m.set('lessons:santo-tirso', JSON.stringify(['O vale arrefece mais nas noites calmas']));
    const patch = (id, b, origin = ORIGIN) => call(`/api/places/${id}`, { method: 'PATCH', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(b) });
    assert.equal((await patch('santo-tirso', { lat: 41.36, lon: -8.48 }, 'https://evil.example')).status, 403);
    assert.equal((await patch('santo-tirso', { lat: 41.36, lon: -8.48 }, '')).status, 403, 'sem origem não grava');
    assert.equal((await patch('nada', { lat: 41.36, lon: -8.48 })).status, 404);
    assert.equal((await patch('santo-tirso', { lat: 'x', lon: -8.48 })).status, 400);
    assert.equal((await patch('santo-tirso', { lat: 95, lon: -8.48 })).status, 400);
    assert.equal(JSON.parse(env.KV.m.get('places'))[0].lat, 41.3354, 'nada mudou');
    // para o ponto selecionado (a 3 km): mesmo id e nome, coordenadas novas (4 casas)
    const r = await patch('santo-tirso', { lat: 41.361234, lon: -8.487681 });
    assert.equal(r.status, 200);
    const p = await r.json();
    assert.deepEqual([p.id, p.name, p.lat, p.lon, p.createdAt], ['santo-tirso', 'Santo Tirso', 41.3612, -8.4877, '2026-11-01T10:00:00Z']);
    assert.ok(Date.parse(p.movedAt) > 0);
    const saved = JSON.parse(env.KV.m.get('places'));
    assert.deepEqual(saved.map((x) => x.id), ['santo-tirso', 'porto'], 'a ordem e o outro local ficam');
    assert.equal(saved[0].lat, 41.3612);
    assert.ok(env.KV.m.has('analysis:santo-tirso') && env.KV.m.has('lessons:santo-tirso'), 'a análise e as lições ficam');
    const an = await (await call('/api/analysis?lat=41.3612&lon=-8.4877')).json();
    assert.equal(an.place.id, 'santo-tirso');
    assert.equal(an.place.distanceKm, 0);
    assert.equal(an.analysis.titulo, 'Nevoeiro no vale', 'a última análise continua a aparecer até à próxima');
    // o nome é opcional; não pode ficar em cima de outro local registado
    assert.equal((await (await patch('santo-tirso', { lat: 41.3612, lon: -8.4877, name: '  Casa no vale ' })).json()).name, 'Casa no vale');
    const dup = await patch('santo-tirso', { lat: 41.1497, lon: -8.6111 });
    assert.equal(dup.status, 409);
    assert.match((await dup.json()).message, /Porto/);
    assert.equal(JSON.parse(env.KV.m.get('places')).length, 2);
});

test('análise focada no ponto: regras e frases sobre a região', () => {
    for (const s of ['## O ponto', 'distância, direção e hora de chegada', 'a banda de chuva a 80 km a sudoeste deve chegar ao ponto por volta das 21h', 'num vale', 'de perto (~280 km)',
        'o radar no ponto (RainViewer', 'os avisos do utilizador', 'O "agora" vem primeiro do que se vê no ponto', '"Radar vs modelos"', 'erro de tempo dos modelos em "verificacao"', 'em "licoes"', 'ecos fixos'])
        assert.ok(SYSTEM_PROMPT.includes(s), `falta "${s}" nas regras`);
    const a = { titulo: 'Chuva no distrito do Porto', resumo: 'A banda de chuva a 80 km a sudoeste deve chegar ao ponto por volta das 21h.',
        hoje: 'Aguaceiros no Minho e Douro Litoral; mais frio no interior norte.', amanha: 'Vento de norte fraco; os modelos regionais concordam.',
        tecnica: 'A frente chega à região de madrugada.', dias: [{ data: '2026-11-08', texto: 'Sol em Santo Tirso, geada no vale.' }],
        alertas: [{ tipo: 'chuva', nivel: 'amarelo', quando: 'sáb', texto: 'Aviso amarelo para o distrito.' }], conselhos: ['Leva guarda-chuva às 21h'] };
    const f = regionalPhrases(a, { place: 'Santo Tirso' });
    assert.deepEqual([...new Set(f.map((x) => x.campo))], ['titulo', 'hoje', 'tecnica', 'alertas[0]']);
    assert.ok(f.some((x) => /distrito do Porto/.test(x.frase)) && f.some((x) => /Minho e Douro Litoral/.test(x.frase)) && f.some((x) => /interior norte/.test(x.frase)));
    assert.ok(!f.some((x) => x.campo === 'resumo' || x.campo === 'amanha' || x.campo.startsWith('dias')), 'sistemas a uma distância do ponto, "vento de norte" e "modelos regionais" passam');
    assert.deepEqual(regionalPhrases({ hoje: 'Chuva às 15h no Alentejo' }, { place: 'Alentejo' }), [], 'o nome do local não conta');
    assert.deepEqual(regionalPhrases(null), []);
});

test('análise: a imediata feita para este ponto aparece se for mais recente do que a do local registado', async () => {
    env.KV.m.set('places', JSON.stringify([{ id: 'casa', name: 'Casa', lat: 38.72, lon: -9.14 }]));
    env.KV.m.set('analysis:casa', JSON.stringify({ titulo: 'Diária', generatedAt: new Date(Date.now() - 2 * 36e5).toISOString(), place: { id: 'casa', lat: 38.72, lon: -9.14 } }));
    env.KV.m.set('analysis:@38.75,-9.15', JSON.stringify({ titulo: 'Aqui', generatedAt: new Date(Date.now() - 6e5).toISOString(), place: { id: null, lat: 38.75, lon: -9.15 } }));
    const j = await (await call('/api/analysis?lat=38.75&lon=-9.15')).json();
    assert.equal(j.analysis.titulo, 'Aqui');
    assert.equal(j.place.id, 'casa', 'o local registado perto continua indicado (para mudar a análise diária)');
    env.KV.m.set('analysis:@38.75,-9.15', JSON.stringify({ titulo: 'Aqui', generatedAt: new Date(Date.now() - 5 * 36e5).toISOString() }));
    assert.equal((await (await call('/api/analysis?lat=38.75&lon=-9.15')).json()).analysis.titulo, 'Diária', 'a diária é mais recente');
});

test('avisos do utilizador: POST /api/reports só da própria origem; guardados no local registado (≤ 2 km) ou na quadrícula, os últimos 50, 30 dias', async () => {
    env.KV.m.set('places', JSON.stringify([{ id: 'santo-tirso', name: 'Santo Tirso', lat: 41.3354, lon: -8.4745 }]));
    const post = (b, origin = ORIGIN) => call('/api/reports', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(b) });
    const now = Date.now(), iso = (min) => new Date(now - min * 6e4).toISOString();
    assert.equal((await post({ lat: 41.3354, lon: -8.4745, kind: 'chuva', time: iso(1) }, 'https://evil.example')).status, 403);
    assert.equal((await post({ lat: 41.3354, lon: -8.4745, kind: 'chuva' }, '')).status, 403, 'sem origem não grava');
    assert.equal((await post({ lat: 41.3354, lon: -8.4745, kind: 'neve' })).status, 400, 'tipo desconhecido');
    assert.equal((await post({ lat: 'x', lon: -8.4745, kind: 'chuva' })).status, 400);
    assert.equal((await post({ lat: 41.3354, lon: -8.4745, kind: '__proto__' })).status, 400);
    assert.equal(env.KV.m.size, 1, 'nada gravado');
    // a 0,3 km do local registado → reports:santo-tirso, com a hora do telemóvel e 3 casas nas coordenadas
    const r = await post({ lat: 41.33765, lon: -8.47231, kind: 'chuva', time: iso(2) });
    assert.equal(r.status, 201);
    const j = await r.json();
    assert.deepEqual(j.place, { id: 'santo-tirso', name: 'Santo Tirso' });
    assert.deepEqual([j.report.kind, j.report.time, j.report.lat, j.report.lon, j.count], ['chuva', iso(2), 41.338, -8.472, 1]);
    assert.deepEqual(env.KV.opts.get('reports:santo-tirso'), { expirationTtl: 30 * 86400 });
    // hora absurda (futuro ou mais de 3 h para trás): fica a do conector
    const f = await (await post({ lat: 41.3354, lon: -8.4745, kind: 'nao-chove', time: new Date(now + 36e5).toISOString() })).json();
    assert.ok(Math.abs(Date.parse(f.report.time) - now) < 5000);
    // longe dos locais: quadrícula de ~1 km
    assert.equal((await post({ lat: 38.7223, lon: -9.1393, kind: 'nevoeiro', time: iso(1) })).status, 201);
    assert.ok(env.KV.m.has('reports:@38.72,-9.14'));
    // os últimos 50, o mais recente primeiro; os de mais de 30 dias saem
    const old = Array.from({ length: 60 }, (_, i) => ({ kind: 'chuva', time: iso(10 + i), lat: 41.335, lon: -8.475 }));
    env.KV.m.set('reports:santo-tirso', JSON.stringify([...old, { kind: 'granizo', time: new Date(now - 31 * 864e5).toISOString(), lat: 41.335, lon: -8.475 }]));
    const t = await (await post({ lat: 41.3354, lon: -8.4745, kind: 'trovoada', time: iso(0) })).json();
    assert.equal(t.count, 50);
    const saved = JSON.parse(env.KV.m.get('reports:santo-tirso'));
    assert.equal(saved.length, 50);
    assert.equal(saved[0].kind, 'trovoada');
    assert.ok(saved.every((x, i) => !i || Date.parse(x.time) <= Date.parse(saved[i - 1].time)), 'ordenados do mais recente');
    assert.ok(!saved.some((x) => x.kind === 'granizo'), 'o de há 31 dias saiu');
    // GET (leitura livre): os do local registado, com idade e distância ao ponto pedido; hours limita
    const g = await call('/api/reports?lat=41.3354&lon=-8.4745&hours=1');
    assert.equal(g.status, 200);
    assert.equal(g.headers.get('access-control-allow-origin'), '*');
    const gj = await g.json();
    assert.equal(gj.place.id, 'santo-tirso');
    assert.ok(gj.reports.length >= 5 && gj.reports.every((x) => x.ageMin <= 60));
    assert.deepEqual([gj.reports[0].kind, gj.reports[0].ageMin], ['trovoada', 0]);
    assert.ok(gj.reports[0].distanceKm <= 0.1, 'coordenadas guardadas com 3 casas (~100 m)');
    assert.equal((await (await call('/api/reports?lat=40&lon=-8')).json()).reports.length, 0);
    assert.equal((await call('/api/reports?lat=x&lon=1')).status, 400);
});
