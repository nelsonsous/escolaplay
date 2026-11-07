// Rotas do Worker com fetch e KV simulados.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../proxy/src/worker.js';
import { validateAnalysis, ANALYSIS_SCHEMA, SYSTEM_PROMPT, regionalPhrases } from '../lib/analysis.js';
import { lisbon } from '../lib/places.js';

const ORIGIN = 'https://meteo.example.workers.dev';
const CODE = 'código-do-dono-2026-ç'; // com acentos: vai no cabeçalho com encodeURIComponent
// KV simulado: valores, opções (TTL), metadados, listagem por prefixo e o número de gravações
function kv() {
    const m = new Map(), opts = new Map(), meta = new Map();
    const db = { m, opts, meta, writes: 0,
        get: async (k, t) => (m.has(k) ? (t === 'json' ? JSON.parse(m.get(k)) : m.get(k)) : null),
        put: async (k, v, o) => { db.writes++; m.set(k, v); opts.set(k, o || null); if (o?.metadata) meta.set(k, o.metadata); else meta.delete(k); },
        delete: async (k) => { m.delete(k); meta.delete(k); },
        list: async ({ prefix = '', cursor, limit = 1000 } = {}) => {
            const names = [...m.keys()].filter((k) => k.startsWith(prefix)).sort();
            const i = cursor ? Number(cursor) : 0, page = names.slice(i, i + limit), end = i + page.length;
            return { keys: page.map((name) => ({ name, ...(meta.has(name) ? { metadata: meta.get(name) } : {}) })), list_complete: end >= names.length, ...(end < names.length ? { cursor: String(end) } : {}) };
        } };
    return db;
}
let env, upstream, seq = 0;
const ctx = { waitUntil() {} };
beforeEach(() => {
    env = { KV: kv() };
    upstream = [];
    globalThis.fetch = async (u) => { upstream.push(String(u)); return new Response(String(u).includes('metar') ? '[{"icaoId":"LPPT"}]' : 'latitude,longitude\n', { status: 200 }); };
});
const call = (path, init = {}) => worker.fetch(new Request(ORIGIN + path, init), env, ctx);
// um telemóvel novo: id e segredo ao acaso, como a app (api.js)
const device = () => { seq++; return { id: `tel${String(seq).padStart(13, '0')}`, token: `segredo-${String(seq).padStart(4, '0')}-${'x'.repeat(30)}` }; };
function api(method, path, { d, owner, body, origin = ORIGIN } = {}) {
    const headers = {};
    if (origin) headers.origin = origin;
    if (d) headers['x-meteo-device'] = `${d.id}.${d.token}`;
    if (owner) headers['x-meteo-owner'] = encodeURIComponent(owner);
    if (body !== undefined) headers['content-type'] = 'application/json';
    return call(path, { method, headers, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
}
const J = async (method, path, o) => { const r = await api(method, path, o); return { status: r.status, body: r.status === 204 ? null : await r.json() }; };
const kvj = (k) => JSON.parse(env.KV.m.get(k));
const ANALISE = { titulo: 'Chuva sábado', resumo: 'r', agora: 'a', hoje: 'h', amanha: 'm', dias: [{ data: '2026-11-08', texto: 't', confianca: 'alta' }],
    tendencia: 't', alertas: [{ tipo: 'chuva', nivel: 'amarelo', quando: 'sáb', texto: 'x' }], incendios: '', satelite: '', conselhos: ['Leva guarda-chuva'],
    fiabilidade: { curto: 'alta', medio: 'media', texto: 'ok' }, tecnica: 't', verificacao: '', licoes: [] };

test('estado, CORS (com os cabeçalhos da identidade) e endereço da app', async () => {
    const r = await call('/api/status');
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.equal(j.onDemand, false);
    assert.equal(j.version, '1.5.0');
    assert.deepEqual(j.schedule, ['07:34', '13:34', '20:34']);
    assert.deepEqual([j.device, j.owner, j.others, j.limit, j.places], [false, false, 'on', 1, 0]);
    assert.equal(r.headers.get('access-control-allow-origin'), '*');
    const root = await call('/');
    assert.equal(root.status, 302);
    assert.equal(root.headers.get('location'), 'https://nelsonsous.github.io/escolaplay/meteo/');
    assert.equal((await call('/nada.txt')).status, 404);
    const pre = await call('/api/places', { method: 'OPTIONS', headers: { origin: 'https://nelsonsous.github.io' } });
    assert.equal(pre.status, 204);
    assert.match(pre.headers.get('access-control-allow-methods'), /POST/);
    assert.match(pre.headers.get('access-control-allow-methods'), /PATCH/, 'o browser pode mudar um local de sítio');
    for (const h of ['content-type', 'x-meteo-device', 'x-meteo-owner']) assert.match(pre.headers.get('access-control-allow-headers'), new RegExp(h));
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

test('identidade sem contas: regista na 1.ª utilização (só o hash do segredo), recusa um segredo errado, lastSeen no máx. 1× por dia', async () => {
    const a = device();
    const s = await J('GET', '/api/status', { d: a });
    assert.deepEqual([s.status, s.body.device, s.body.owner], [200, true, false]);
    const rec = kvj('dev:' + a.id);
    assert.match(rec.tokenHash, /^[0-9a-f]{64}$/);
    assert.ok(!env.KV.m.get('dev:' + a.id).includes(a.token), 'o segredo não fica guardado');
    assert.equal(rec.firstSeen, rec.lastSeen);
    assert.deepEqual(env.KV.meta.get('dev:' + a.id), { s: lisbon().date, o: 0 }, 'metadados para o painel do dono');
    assert.equal(env.KV.opts.get('dev:' + a.id).expirationTtl, 400 * 86400);
    // mais pedidos no mesmo dia: nenhuma gravação (o plano gratuito só dá 1000 por dia)
    const w = env.KV.writes;
    for (const p of ['/api/status', '/api/places', '/api/analysis?lat=41&lon=-8', '/api/reports?lat=41&lon=-8']) assert.equal((await api('GET', p, { d: a })).status, 200, p);
    assert.equal(env.KV.writes, w, 'sem gravações no mesmo dia');
    // o mesmo id com outro segredo: recusado em todas as rotas que dependem de quem pede
    const thief = { id: a.id, token: 'outro-segredo-'.padEnd(40, 'y') };
    for (const [m, p, body] of [['GET', '/api/status'], ['GET', '/api/places'], ['GET', '/api/analysis?lat=41&lon=-8'], ['GET', '/api/reports?lat=41&lon=-8'],
        ['POST', '/api/places', { name: 'X', lat: 41, lon: -8 }], ['POST', '/api/reports', { kind: 'chuva', lat: 41, lon: -8 }], ['DELETE', '/api/places/x']]) {
        const r = await J(m, p, { d: thief, body });
        assert.deepEqual([r.status, r.body.error], [403, 'dispositivo'], `${m} ${p}`);
    }
    assert.equal(env.KV.writes, w, 'nada gravado com o segredo errado');
    assert.equal(kvj('dev:' + a.id).tokenHash, rec.tokenHash);
    // no dia seguinte: 1 gravação (lastSeen e o dia nos metadados), mesmo com vários pedidos
    env.KV.m.set('dev:' + a.id, JSON.stringify({ ...rec, lastSeen: new Date(Date.now() - 1.5 * 864e5).toISOString() }));
    await api('GET', '/api/status', { d: a });
    await api('GET', '/api/places', { d: a });
    assert.equal(env.KV.writes, w + 1);
    assert.ok(Date.now() - Date.parse(kvj('dev:' + a.id).lastSeen) < 5000);
    assert.equal(kvj('dev:' + a.id).firstSeen, rec.firstSeen);
    assert.deepEqual(env.KV.meta.get('dev:' + a.id), { s: lisbon().date, o: 0 });
    // de outra origem, sem origem ou com um cabeçalho mal formado: anónimo e nada gravado (só a app regista telemóveis)
    const b = device();
    assert.equal((await J('GET', '/api/status', { d: b, origin: 'https://evil.example' })).body.device, false);
    assert.equal((await J('GET', '/api/status', { d: b, origin: '' })).body.device, false);
    assert.ok(!env.KV.m.has('dev:' + b.id));
    assert.equal((await (await call('/api/status', { headers: { origin: ORIGIN, 'x-meteo-device': 'abc.def' } })).json()).device, false);
    assert.equal(env.KV.writes, w + 1);
    // a app ao abrir faz vários pedidos ao mesmo tempo: um telemóvel novo (ou o 1.º pedido do dia) grava uma só vez
    const c = device();
    const many = await Promise.all(['/api/status', '/api/places', '/api/analysis?lat=41&lon=-8', '/api/reports?lat=41&lon=-8'].map((p) => api('GET', p, { d: c })));
    assert.ok(many.every((r) => r.status === 200));
    assert.equal(env.KV.writes, w + 2, 'pedidos simultâneos: 1 gravação');
    env.KV.m.set('dev:' + c.id, JSON.stringify({ ...kvj('dev:' + c.id), lastSeen: new Date(Date.now() - 2 * 864e5).toISOString() }));
    await Promise.all(['/api/status', '/api/places', '/api/places'].map((p) => api('GET', p, { d: c })));
    assert.equal(env.KV.writes, w + 3);
});

test('dono: sem o segredo OWNER_CODE não há dono; com ele, o código certo vê e gere tudo, sem limite; os locais de antes (sem dono) são do dono', async () => {
    const legacy = { id: 'santo-tirso', name: 'Santo Tirso', lat: 41.3354, lon: -8.4745, createdAt: '2026-11-01T10:00:00Z' };
    env.KV.m.set('places', JSON.stringify([legacy]));
    env.KV.m.set('analysis:santo-tirso', JSON.stringify({ titulo: 'Nevoeiro no vale', generatedAt: new Date().toISOString(), place: legacy }));
    const nelson = device(), me = { d: nelson, owner: CODE };
    // sem OWNER_CODE ninguém é dono, nem com um código
    let s = (await J('GET', '/api/status', me)).body;
    assert.deepEqual([s.owner, s.ownerCode, s.limit, s.places], [false, 'sem_codigo', 1, 0]);
    assert.deepEqual((await J('GET', '/api/places', me)).body, [], 'o local de antes é do dono');
    assert.equal((await J('GET', '/api/analysis?lat=41.3354&lon=-8.4745', me)).body.analysis, null);
    assert.equal((await J('GET', '/api/usage', me)).status, 403);
    assert.equal((await J('PATCH', '/api/settings', { ...me, body: { others: 'off' } })).status, 403);
    assert.equal((await api('DELETE', '/api/places/santo-tirso', me)).status, 404);
    // com o segredo: um código errado não serve
    env.OWNER_CODE = CODE;
    s = (await J('GET', '/api/status', { d: nelson, owner: 'código-do-dono-2025-ç' })).body;
    assert.deepEqual([s.owner, s.ownerCode], [false, 'errado']);
    assert.equal(kvj('dev:' + nelson.id).owner, undefined);
    s = (await J('GET', '/api/status', me)).body;
    assert.deepEqual([s.owner, s.ownerCode, s.limit, s.places], [true, 'ok', null, 1]);
    assert.equal(kvj('dev:' + nelson.id).owner, true, 'ser dono muda o registo (1 gravação)');
    assert.equal(env.KV.meta.get('dev:' + nelson.id).o, 1);
    const pl = (await J('GET', '/api/places', me)).body;
    assert.deepEqual(pl.map((p) => [p.id, p.lat, p.lon, p.mine, p.kind, p.status]), [['santo-tirso', 41.3354, -8.4745, true, 'owner', 'active']]);
    assert.equal((await J('GET', '/api/analysis?lat=41.3354&lon=-8.4745', me)).body.analysis.titulo, 'Nevoeiro no vale');
    // sem limite de locais
    for (let i = 1; i <= 6; i++) assert.equal((await J('POST', '/api/places', { ...me, body: { name: `Sítio ${i}`, lat: 40 + i / 10, lon: -8 } })).status, 201);
    const saved = kvj('places');
    assert.equal(saved.length, 7);
    assert.ok(saved.slice(1).every((p) => p.owner === 'owner'));
    assert.deepEqual(saved.slice(1, 3).map((p) => p.id), ['sitio-1', 'sitio-2'], 'os do dono mantêm o id pelo nome');
    assert.equal(saved[0].owner, undefined, 'a migração não grava nada: sem dono = do dono');
    // um telemóvel que já tinha um local e depois recebe o código: o local passa a ser do dono
    const tablet = device();
    const t = (await J('POST', '/api/places', { d: tablet, body: { name: 'Tablet', lat: 38.7, lon: -9.1 } })).body;
    assert.equal(kvj('places').find((p) => p.id === t.id).owner, tablet.id);
    await J('GET', '/api/status', { d: tablet, owner: CODE });
    assert.equal(kvj('places').find((p) => p.id === t.id).owner, 'owner');
    assert.equal((await J('GET', '/api/places', { d: tablet, owner: CODE })).body.find((p) => p.id === t.id).lat, 38.7);
});

test('convidado: 1 local por telemóvel; ligar noutro sítio muda-o (PATCH, o mesmo id: a análise e as lições ficam); desligar não apaga', async () => {
    const g = device();
    const post = (b, d = g, origin = ORIGIN) => J('POST', '/api/places', { d, body: b, origin });
    assert.equal((await post({ name: 'Casa', lat: 41.5, lon: -8.4 }, g, 'https://evil.example')).status, 403);
    assert.equal((await post({ name: 'Casa', lat: 41.5, lon: -8.4 }, g, 'https://nelsonsous.github.io')).status, 403, 'sem ALLOWED_ORIGINS só o próprio conector grava');
    assert.equal((await post({ name: 'Casa', lat: 41.5, lon: -8.4 }, null)).status, 403, 'sem identidade não liga');
    assert.equal((await post({ name: '', lat: 41.5, lon: -8.4 })).status, 400);
    // a análise guardada de um local antigo com o mesmo nome nunca passa para outro telemóvel
    env.KV.m.set('analysis:casa', JSON.stringify({ titulo: 'De outra pessoa', generatedAt: new Date().toISOString() }));
    env.ALLOWED_ORIGINS = 'https://nelsonsous.github.io';
    const r1 = await post({ name: 'Casa', lat: 41.5454, lon: -8.4265 }, g, 'https://nelsonsous.github.io');
    assert.equal(r1.status, 201);
    const casa = r1.body;
    assert.match(casa.id, /^casa-[a-z2-9]{6}$/, 'id com sufixo ao acaso');
    assert.deepEqual([casa.mine, casa.kind, casa.lat, casa.lon], [true, 'guest', 41.5454, -8.4265]);
    assert.equal(kvj('places')[0].owner, g.id);
    assert.equal((await J('GET', '/api/analysis?lat=41.5454&lon=-8.4265', { d: g })).body.analysis, null);
    // no mesmo sítio devolve o que já existe; noutro sítio: 409 com o local a mudar
    assert.deepEqual([(await post({ name: 'Outra', lat: 41.5455, lon: -8.4266 })).status, kvj('places').length], [200, 1]);
    const far = await post({ name: 'Praia', lat: 41.36, lon: -8.76 });
    assert.deepEqual([far.status, far.body.error, far.body.place.id], [409, 'limite', casa.id]);
    // a app muda-o (PATCH, o mesmo id): a última análise e as lições ficam
    env.KV.m.set('analysis:' + casa.id, JSON.stringify({ titulo: 'Sol em Braga', generatedAt: new Date().toISOString(), place: { id: casa.id, name: 'Casa', lat: 41.5454, lon: -8.4265 } }));
    env.KV.m.set('lessons:' + casa.id, JSON.stringify(['O vale arrefece nas noites calmas']));
    const mv = await J('PATCH', `/api/places/${casa.id}`, { d: g, body: { lat: 41.36, lon: -8.76, name: 'Praia', on: true } });
    assert.equal(mv.status, 200);
    assert.deepEqual([mv.body.id, mv.body.name, mv.body.lat, mv.body.lon], [casa.id, 'Praia', 41.36, -8.76]);
    assert.ok(env.KV.m.has('analysis:' + casa.id) && env.KV.m.has('lessons:' + casa.id));
    assert.equal(kvj('places').length, 1, 'continua 1 local');
    assert.equal((await J('GET', '/api/analysis?lat=41.36&lon=-8.76', { d: g })).body.analysis.titulo, 'Sol em Braga', 'a última, até à próxima');
    // desligar: fica guardado (off), sem análise; ligar de novo no mesmo sítio volta ao mesmo id
    assert.equal((await api('DELETE', `/api/places/${casa.id}`, { d: g })).status, 204);
    assert.deepEqual([kvj('places')[0].off, kvj('places')[0].offBy], [true, 'device']);
    assert.equal((await J('GET', '/api/places', { d: g })).body[0].off, true);
    assert.equal((await J('GET', '/api/analysis?lat=41.36&lon=-8.76', { d: g })).body.analysis, null, 'desligado: sem análise');
    const back = await post({ name: 'Praia', lat: 41.36, lon: -8.76 });
    assert.deepEqual([back.status, back.body.id, back.body.off], [200, casa.id, undefined]);
    assert.equal((await J('GET', '/api/analysis?lat=41.36&lon=-8.76', { d: g })).body.analysis.titulo, 'Sol em Braga');
    // "Desfazer" na app: PATCH { on: true }
    await api('DELETE', `/api/places/${casa.id}`, { d: g });
    assert.equal((await J('PATCH', `/api/places/${casa.id}`, { d: g, body: { on: true } })).body.off, undefined);
    const w0 = env.KV.writes;
    assert.equal((await J('PATCH', `/api/places/${casa.id}`, { d: g, body: { on: true } })).status, 200);
    assert.equal(env.KV.writes, w0, 'ligar o que já está ligado não grava');
    assert.equal((await J('PATCH', `/api/places/${casa.id}`, { d: g, body: {} })).status, 400, 'nada a mudar');
    // a "análise dos outros" desligada pelo dono: nenhum telemóvel liga um local
    env.KV.m.set('settings', JSON.stringify({ others: 'off' }));
    const h = device();
    const no = await post({ name: 'Porto', lat: 41.15, lon: -8.61 }, h);
    assert.deepEqual([no.status, no.body.error], [403, 'convidados_desligados']);
    env.KV.m.delete('settings');
    // limite de segurança: 15 locais em análise (os do dono e os dos outros em uso)
    const others = Array.from({ length: 14 }, (_, i) => ({ id: `d${i}`, name: `D${i}`, lat: 37 + i / 10, lon: -8, owner: 'owner' }));
    env.KV.m.set('places', JSON.stringify([...kvj('places'), ...others]));
    const full = await post({ name: 'Porto', lat: 41.15, lon: -8.61 }, h);
    assert.deepEqual([full.status, full.body.error], [409, 'cheio']);
    // um local em pausa (telemóvel sem abrir a app há 20 dias) não conta
    env.KV.m.set('dev:' + g.id, JSON.stringify({ ...kvj('dev:' + g.id), lastSeen: new Date(Date.now() - 20 * 864e5).toISOString() }));
    assert.equal((await post({ name: 'Porto', lat: 41.15, lon: -8.61 }, h)).status, 201);
});

test('privacidade: cada telemóvel só vê os seus locais e a sua análise; o dono vê todos, só com o nome e a localização arredondada (~1 km)', async () => {
    env.OWNER_CODE = CODE;
    const o = device(), a = device(), b = device(), owner = { d: o, owner: CODE };
    const st = { id: 'santo-tirso', name: 'Santo Tirso', lat: 41.3354, lon: -8.4745, createdAt: '2026-11-01T10:00:00Z' };
    env.KV.m.set('places', JSON.stringify([st]));
    const pa = (await J('POST', '/api/places', { d: a, body: { name: 'Casa da Ana', lat: 41.5454, lon: -8.4265 } })).body;
    const pb = (await J('POST', '/api/places', { d: b, body: { name: 'Casa do Rui', lat: 41.1621, lon: -8.6219 } })).body;
    for (const p of [st, pa, pb]) env.KV.m.set('analysis:' + p.id, JSON.stringify({ titulo: `Análise ${p.id}`, generatedAt: new Date().toISOString(), place: { id: p.id, name: p.name, lat: p.lat, lon: p.lon } }));
    // GET /api/places: só os seus
    assert.deepEqual((await J('GET', '/api/places', { d: a })).body.map((p) => p.id), [pa.id]);
    assert.deepEqual((await J('GET', '/api/places', { d: b })).body.map((p) => p.id), [pb.id]);
    assert.deepEqual((await J('GET', '/api/places')).body, [], 'sem identidade: nada');
    // /api/analysis: a do seu local; nunca a dos outros por estar perto
    assert.equal((await J('GET', `/api/analysis?lat=${pb.lat}&lon=${pb.lon}`, { d: b })).body.analysis.titulo, `Análise ${pb.id}`);
    const nope = (await J('GET', `/api/analysis?lat=${pb.lat}&lon=${pb.lon}`, { d: a })).body;
    assert.deepEqual([nope.analysis, nope.place], [null, null]);
    assert.equal((await J('GET', '/api/analysis?lat=41.3354&lon=-8.4745', { d: a })).body.analysis, null, 'nem a do dono');
    assert.equal((await J('GET', `/api/analysis?lat=${pb.lat}&lon=${pb.lon}`)).body.analysis, null, 'nem sem identidade');
    // nem mexer nos locais dos outros (404: nem se sabe que existem)
    assert.equal((await api('DELETE', `/api/places/${pb.id}`, { d: a })).status, 404);
    assert.equal((await api('PATCH', `/api/places/${pb.id}`, { d: a, body: { on: false } })).status, 404);
    // o dono: todos; os dos outros só com o nome e ~1 km (e a distância a partir daí)
    const all = (await J('GET', '/api/places', owner)).body;
    assert.deepEqual(all.map((p) => [p.id, p.mine, p.kind]), [['santo-tirso', true, 'owner'], [pa.id, false, 'guest'], [pb.id, false, 'guest']]);
    const ob = all.find((p) => p.id === pb.id);
    assert.deepEqual([ob.name, ob.lat, ob.lon, ob.approx, ob.status], ['Casa do Rui', 41.16, -8.62, true, 'active']);
    assert.ok(!/41\.1621|8\.6219|41\.5454|8\.4265/.test(JSON.stringify(all)), 'nunca as coordenadas exatas dos outros');
    const oa = (await J('GET', `/api/analysis?lat=${ob.lat}&lon=${ob.lon}`, owner)).body;
    assert.equal(oa.analysis.titulo, `Análise ${pb.id}`);
    assert.deepEqual([oa.analysis.place.lat, oa.analysis.place.lon, oa.place.lat, oa.place.distanceKm, oa.place.mine], [41.16, -8.62, 41.16, 0, false]);
    assert.ok(!/41\.1621|8\.6219/.test(JSON.stringify(oa)));
    // o dono desliga o local de outro telemóvel; só o dono o volta a ligar, e não o muda de sítio
    assert.equal((await api('DELETE', `/api/places/${pb.id}`, owner)).status, 204);
    assert.equal(kvj('places').find((p) => p.id === pb.id).offBy, 'owner');
    for (const r of [await J('PATCH', `/api/places/${pb.id}`, { d: b, body: { on: true } }), await J('POST', '/api/places', { d: b, body: { name: 'Casa do Rui', lat: 41.1621, lon: -8.6219 } })]) {
        assert.deepEqual([r.status, r.body.error], [403, 'desligado_pelo_dono']);
    }
    assert.equal((await J('PATCH', `/api/places/${pb.id}`, { ...owner, body: { lat: 41, lon: -8 } })).status, 403);
    assert.equal((await J('PATCH', `/api/places/${pb.id}`, { ...owner, body: { on: true } })).status, 200);
    assert.equal((await J('GET', `/api/analysis?lat=${pb.lat}&lon=${pb.lon}`, { d: b })).body.analysis.titulo, `Análise ${pb.id}`);
    // perto do local de outro telemóvel liga-se à vontade (sem um 409 que diga de quem é)
    assert.equal((await J('PATCH', `/api/places/${pa.id}`, { d: a, body: { lat: 41.1622, lon: -8.622 } })).status, 200);
});

test('PATCH /api/places/<id>: muda o ponto, mantém o id (análise e lições ficam), só da própria origem', async () => {
    env.OWNER_CODE = CODE;
    const me = { d: device(), owner: CODE };
    const places = [{ id: 'santo-tirso', name: 'Santo Tirso', lat: 41.3354, lon: -8.4745, createdAt: '2026-11-01T10:00:00Z' },
        { id: 'porto', name: 'Porto', lat: 41.1496, lon: -8.611, createdAt: '2026-11-02T10:00:00Z' }];
    env.KV.m.set('places', JSON.stringify(places));
    env.KV.m.set('analysis:santo-tirso', JSON.stringify({ titulo: 'Nevoeiro no vale', generatedAt: new Date().toISOString(), place: places[0] }));
    env.KV.m.set('lessons:santo-tirso', JSON.stringify(['O vale arrefece mais nas noites calmas']));
    const patch = (id, b, origin = ORIGIN) => J('PATCH', `/api/places/${id}`, { ...me, origin, body: b });
    assert.equal((await patch('santo-tirso', { lat: 41.36, lon: -8.48 }, 'https://evil.example')).status, 403);
    assert.equal((await patch('santo-tirso', { lat: 41.36, lon: -8.48 }, '')).status, 403, 'sem origem não grava');
    assert.equal((await patch('nada', { lat: 41.36, lon: -8.48 })).status, 404);
    assert.equal((await patch('santo-tirso', { lat: 'x', lon: -8.48 })).status, 400);
    assert.equal((await patch('santo-tirso', { lat: 95, lon: -8.48 })).status, 400);
    assert.equal(kvj('places')[0].lat, 41.3354, 'nada mudou');
    // para o ponto selecionado (a 3 km): mesmo id e nome, coordenadas novas (4 casas)
    const r = await patch('santo-tirso', { lat: 41.361234, lon: -8.487681 });
    assert.equal(r.status, 200);
    const p = r.body;
    assert.deepEqual([p.id, p.name, p.lat, p.lon, p.createdAt], ['santo-tirso', 'Santo Tirso', 41.3612, -8.4877, '2026-11-01T10:00:00Z']);
    assert.ok(Date.parse(p.movedAt) > 0);
    const saved = kvj('places');
    assert.deepEqual(saved.map((x) => x.id), ['santo-tirso', 'porto'], 'a ordem e o outro local ficam');
    assert.equal(saved[0].lat, 41.3612);
    assert.ok(env.KV.m.has('analysis:santo-tirso') && env.KV.m.has('lessons:santo-tirso'), 'a análise e as lições ficam');
    const an = (await J('GET', '/api/analysis?lat=41.3612&lon=-8.4877', me)).body;
    assert.equal(an.place.id, 'santo-tirso');
    assert.equal(an.place.distanceKm, 0);
    assert.equal(an.analysis.titulo, 'Nevoeiro no vale', 'a última análise continua a aparecer até à próxima');
    // o nome é opcional; não pode ficar em cima de outro local seu
    assert.equal((await patch('santo-tirso', { lat: 41.3612, lon: -8.4877, name: '  Casa no vale ' })).body.name, 'Casa no vale');
    const dup = await patch('santo-tirso', { lat: 41.1497, lon: -8.6111 });
    assert.equal(dup.status, 409);
    assert.match(dup.body.message, /Porto/);
    assert.equal(kvj('places').length, 2);
});

test('análise: a do local do próprio telemóvel mais próximo (≤ 10 km)', async () => {
    const g = device();
    const pl = (await J('POST', '/api/places', { d: g, body: { name: 'Casa', lat: 38.72, lon: -9.14 } })).body;
    env.KV.m.set('analysis:' + pl.id, JSON.stringify({ titulo: 'Teste', generatedAt: new Date(Date.now() - 60e4).toISOString() }));
    const j = (await J('GET', '/api/analysis?lat=38.75&lon=-9.15', { d: g })).body;
    assert.deepEqual([j.place.id, j.place.mine, j.analysis.titulo, j.ageMin, j.place.distanceKm], [pl.id, true, 'Teste', 10, 3.4]);
    assert.equal((await J('GET', '/api/analysis?lat=41.15&lon=-8.61', { d: g })).body.analysis, null);
});

test('aprendizagem: a memória do local do próprio telemóvel (≤ 3 km), tal como a tarefa a guardou; a dos outros não', async () => {
    const a = device(), b = device();
    const pa = (await J('POST', '/api/places', { d: a, body: { name: 'Casa da Ana', lat: 41.5454, lon: -8.4265 } })).body;
    const mem = { v: 1, lat: 41.5454, lon: -8.4265, updated: '2026-11-07T08:00:00Z', days: { '2026-11-06': { h: 24, hr: 3, m: { ecmwf_ifs: { t: [[24, 0.8, 0.1], null, null] } } } } };
    env.KV.m.set('learn:' + pa.id, JSON.stringify(mem));
    const r = await J('GET', '/api/learning?lat=41.546&lon=-8.427', { d: a });
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.memory, mem);
    assert.equal(r.body.place.id, pa.id);
    assert.ok(r.body.place.distanceKm <= 0.2);
    assert.deepEqual((await J('GET', '/api/learning?lat=41.546&lon=-8.427', { d: b })).body, { place: null, memory: null }, 'outro telemóvel não a vê');
    assert.deepEqual((await J('GET', '/api/learning?lat=41.6&lon=-8.427', { d: a })).body, { place: null, memory: null }, 'a mais de 3 km não é deste ponto');
    assert.equal((await J('GET', '/api/learning?lat=x&lon=-8', { d: a })).status, 400);
    // sem memória guardada (local novo): memória vazia
    env.KV.m.delete('learn:' + pa.id);
    assert.equal((await J('GET', '/api/learning?lat=41.546&lon=-8.427', { d: a })).body.memory, null);
});

test('análise imediata sem chave responde 503 com explicação', async () => {
    const r = await call('/api/analysis/refresh?lat=38.7&lon=-9.1', { method: 'POST', headers: { origin: ORIGIN }, body: '{}' });
    assert.equal(r.status, 503);
    assert.equal((await r.json()).error, 'sem_chave');
});

test('análise imediata: no local do próprio (≤ 2 km) ou só para este telemóvel (24 h); conta no dia (stats:<data>); só o dono quando a análise dos outros não está ligada', async () => {
    env.ANTHROPIC_API_KEY = 'chave-de-teste';
    env.CLAUDE_MODEL = 'modelo-de-teste';
    const sent = [];
    globalThis.fetch = async (u, init) => {
        if (String(u?.url || u).startsWith('https://api.anthropic.com/')) {
            sent.push(JSON.parse(init?.body || '{}'));
            return new Response(JSON.stringify({ id: 'msg_1', type: 'message', role: 'assistant', model: 'modelo-de-teste', content: [{ type: 'text', text: JSON.stringify(ANALISE) }],
                stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 } }), { status: 200, headers: { 'content-type': 'application/json' } });
        }
        return new Response('{}', { status: 200 });
    };
    const g = device(), summary = 'x'.repeat(500), day = 'stats:' + lisbon().date;
    const refresh = (lat, lon, o = { d: g }) => J('POST', `/api/analysis/refresh?lat=${lat}&lon=${lon}`, { ...o, body: { summary, name: 'Aqui' } });
    assert.equal((await refresh(38.7, -9.1, {})).status, 403, 'sem identidade');
    // fora dos seus locais: fica só para este telemóvel
    const r = await refresh(38.75, -9.15);
    assert.equal(r.status, 200);
    assert.deepEqual([r.body.analysis.by, r.body.analysis.titulo, r.body.analysis.place.id], ['claude-api', ANALISE.titulo, null]);
    assert.deepEqual(env.KV.opts.get('analysis:dev:' + g.id), { expirationTtl: 86400 });
    assert.equal((await J('GET', '/api/analysis?lat=38.75&lon=-9.15', { d: g })).body.analysis.titulo, ANALISE.titulo);
    assert.equal((await J('GET', '/api/analysis?lat=38.75&lon=-9.15', { d: device() })).body.analysis, null, 'outro telemóvel no mesmo ponto não a vê');
    assert.deepEqual(kvj(day), { scheduled: 0, instant: 1, guest: 1 }, 'contador do dia: 1 imediata, de outro telemóvel');
    assert.equal(env.KV.opts.get(day).expirationTtl, 40 * 86400);
    assert.equal((await refresh(38.75, -9.15)).status, 429, '1 a cada 30 min no mesmo ponto');
    // no seu local (≤ 2 km): fica como análise do local
    const pl = (await J('POST', '/api/places', { d: g, body: { name: 'Casa', lat: 41.5454, lon: -8.4265 } })).body;
    assert.equal((await refresh(41.55, -8.43)).status, 200);
    assert.equal(kvj('analysis:' + pl.id).place.id, pl.id);
    assert.deepEqual(kvj(day), { scheduled: 0, instant: 2, guest: 2 });
    // análise dos outros "1×" ou desligada: a imediata é só do dono
    env.KV.m.set('settings', JSON.stringify({ others: '1x' }));
    const no = await refresh(40, -8);
    assert.deepEqual([no.status, no.body.error], [403, 'convidados_desligados']);
    assert.equal((await J('GET', '/api/status', { d: g })).body.onDemand, false);
    env.OWNER_CODE = CODE;
    assert.equal((await J('GET', '/api/status', { d: g, owner: CODE })).body.onDemand, true);
    assert.equal((await refresh(40, -8, { d: g, owner: CODE })).status, 200);
    assert.deepEqual(kvj(day), { scheduled: 0, instant: 3, guest: 2 });
    // limite diário (20)
    env.KV.m.set(day, JSON.stringify({ scheduled: 9, instant: 20, guest: 3 }));
    assert.equal((await refresh(39, -8, { d: g, owner: CODE })).status, 429);
    assert.equal(sent.length, 3, 'só 3 pedidos à API do Claude');
    assert.ok(sent.every((b) => b.model === 'modelo-de-teste' && b.system === SYSTEM_PROMPT));
});

test('em pausa: o local de outro telemóvel que não abre a app há 14 dias fica de fora e volta quando abre; painel "Utilização" só para o dono', async () => {
    env.OWNER_CODE = CODE;
    const o = device(), g = device(), h = device(), owner = { d: o, owner: CODE };
    await J('GET', '/api/status', owner);
    env.KV.m.set('places', JSON.stringify([{ id: 'santo-tirso', name: 'Santo Tirso', lat: 41.3354, lon: -8.4745 }]));
    await J('POST', '/api/places', { d: g, body: { name: 'Casa da Ana', lat: 41.5454, lon: -8.4265 } });
    const ph = (await J('POST', '/api/places', { d: h, body: { name: 'Praia do Rui', lat: 41.36, lon: -8.76 } })).body;
    // h não abre a app há 15 dias
    const old = new Date(Date.now() - 15 * 864e5).toISOString();
    env.KV.m.set('dev:' + h.id, JSON.stringify({ ...kvj('dev:' + h.id), lastSeen: old }));
    env.KV.meta.set('dev:' + h.id, { s: lisbon(Date.parse(old)).date, o: 0 });
    env.KV.m.set('stats:' + lisbon().date, JSON.stringify({ scheduled: 4, instant: 1, guest: 2 }));
    const u = (await J('GET', '/api/usage', owner)).body;
    assert.deepEqual(u.devices, { today: 2, d7: 2, d30: 3, total: 3, owner: 1 });
    assert.deepEqual(u.places.list.map((p) => [p.name, p.kind, p.status, p.analysed]),
        [['Santo Tirso', 'owner', 'active', true], ['Casa da Ana', 'guest', 'active', true], ['Praia do Rui', 'guest', 'paused', false]]);
    assert.equal(u.places.list[2].days, 15);
    assert.deepEqual([u.places.owner, u.places.guests, u.places.active, u.places.paused, u.places.analysed, u.places.cap], [1, 2, 2, 1, 2, 15]);
    assert.equal(u.analyses.length, 7);
    assert.deepEqual(u.analyses[0], { date: lisbon().date, scheduled: 4, instant: 1, guest: 2 });
    assert.deepEqual(u.analyses[1], { date: u.analyses[1].date, scheduled: 0, instant: 0, guest: 0 });
    assert.equal(u.others, 'on');
    assert.ok(!/41\.5454|8\.4265|41\.36|tel\d/.test(JSON.stringify(u)), 'só nomes e estados: sem coordenadas nem ids');
    assert.equal((await J('GET', '/api/places', owner)).body.find((p) => p.id === ph.id).status, 'paused');
    // h abre a app: volta a estar em uso
    await J('GET', '/api/status', { d: h });
    const u2 = (await J('GET', '/api/usage', owner)).body;
    assert.equal(u2.places.list.find((p) => p.name === 'Praia do Rui').status, 'active');
    assert.equal(u2.devices.today, 3);
    assert.equal((await J('GET', '/api/usage', { d: g })).status, 403, 'os outros não veem o painel');
});

test('análise dos outros (ligada, só 1× por dia ou desligada): só o dono a muda; os outros veem o estado', async () => {
    env.OWNER_CODE = CODE;
    const g = device(), owner = { d: device(), owner: CODE };
    assert.deepEqual((await J('GET', '/api/settings', owner)).body, { others: 'on', updatedAt: null });
    assert.equal((await J('PATCH', '/api/settings', { d: g, body: { others: 'off' } })).status, 403);
    assert.equal((await J('GET', '/api/settings', { d: g })).status, 403);
    assert.equal((await J('PATCH', '/api/settings', { ...owner, body: { others: 'sempre' } })).status, 400);
    assert.equal((await J('PATCH', '/api/settings', { ...owner, origin: 'https://evil.example', body: { others: 'off' } })).status, 403);
    assert.ok(!env.KV.m.has('settings'));
    const r = await J('PATCH', '/api/settings', { ...owner, body: { others: '1x' } });
    assert.deepEqual([r.status, r.body.others], [200, '1x']);
    assert.equal(kvj('settings').others, '1x');
    assert.equal((await J('GET', '/api/status', { d: g })).body.others, '1x');
    assert.equal((await J('GET', '/api/analysis?lat=41&lon=-8', { d: g })).body.others, '1x');
    await J('PATCH', '/api/settings', { ...owner, body: { others: 'off' } });
    assert.equal((await J('GET', '/api/settings', owner)).body.others, 'off');
});

test('validação da análise: limites, listas e valores permitidos', () => {
    assert.equal(validateAnalysis(ANALISE, { strict: true }).ok, true);
    const bad = validateAnalysis({ ...ANALISE, titulo: 'x'.repeat(91), alertas: [{ tipo: 'tornado', nivel: 'roxo', texto: 'x' }] }, { strict: true });
    assert.equal(bad.ok, false);
    assert.equal(bad.errors.length, 3);
    const soft = validateAnalysis({ ...ANALISE, titulo: 'x'.repeat(200) });
    assert.equal(soft.value.titulo.length, 90);
    assert.equal(ANALYSIS_SCHEMA.additionalProperties, false);
    assert.ok(ANALYSIS_SCHEMA.required.includes('licoes'));
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

test('avisos do utilizador: ficam com o telemóvel que os deu — no seu local (≤ 2 km) ou só dele; os últimos 50, 30 dias', async () => {
    const a = device(), b = device();
    const pa = (await J('POST', '/api/places', { d: a, body: { name: 'Santo Tirso', lat: 41.3354, lon: -8.4745 } })).body;
    const post = (body, d = a, origin = ORIGIN) => J('POST', '/api/reports', { d, origin, body });
    const now = Date.now(), iso = (min) => new Date(now - min * 6e4).toISOString();
    const n0 = env.KV.m.size;
    assert.equal((await post({ lat: 41.3354, lon: -8.4745, kind: 'chuva', time: iso(1) }, a, 'https://evil.example')).status, 403);
    assert.equal((await post({ lat: 41.3354, lon: -8.4745, kind: 'chuva' }, a, '')).status, 403, 'sem origem não grava');
    assert.equal((await post({ lat: 41.3354, lon: -8.4745, kind: 'chuva' }, null)).status, 403, 'sem identidade não grava');
    assert.equal((await post({ lat: 41.3354, lon: -8.4745, kind: 'neve' })).status, 400, 'tipo desconhecido');
    assert.equal((await post({ lat: 'x', lon: -8.4745, kind: 'chuva' })).status, 400);
    assert.equal((await post({ lat: 41.3354, lon: -8.4745, kind: '__proto__' })).status, 400);
    assert.equal(env.KV.m.size, n0, 'nada gravado');
    // a 0,3 km do seu local → reports:<id do local>, com a hora do telemóvel e 3 casas nas coordenadas
    const r = await post({ lat: 41.33765, lon: -8.47231, kind: 'chuva', time: iso(2) });
    assert.equal(r.status, 201);
    assert.deepEqual(r.body.place, { id: pa.id, name: 'Santo Tirso' });
    assert.deepEqual([r.body.report.kind, r.body.report.time, r.body.report.lat, r.body.report.lon, r.body.count], ['chuva', iso(2), 41.338, -8.472, 1]);
    assert.deepEqual(env.KV.opts.get('reports:' + pa.id), { expirationTtl: 30 * 86400 });
    // hora absurda (futuro ou mais de 3 h para trás): fica a do conector
    const f = (await post({ lat: 41.3354, lon: -8.4745, kind: 'nao-chove', time: new Date(now + 36e5).toISOString() })).body;
    assert.ok(Math.abs(Date.parse(f.report.time) - now) < 5000);
    // longe dos seus locais: só deste telemóvel
    assert.equal((await post({ lat: 38.7223, lon: -9.1393, kind: 'nevoeiro', time: iso(1) })).status, 201);
    assert.ok(env.KV.m.has('reports:dev:' + a.id));
    // outro telemóvel ao lado do local de a: o aviso fica com ele, não no local de a
    const rb = await post({ lat: 41.3354, lon: -8.4745, kind: 'granizo', time: iso(1) }, b);
    assert.deepEqual([rb.status, rb.body.place], [201, null]);
    assert.ok(env.KV.m.has('reports:dev:' + b.id) && !kvj('reports:' + pa.id).some((x) => x.kind === 'granizo'));
    // os últimos 50, o mais recente primeiro; os de mais de 30 dias saem
    const old = Array.from({ length: 60 }, (_, i) => ({ kind: 'chuva', time: iso(10 + i), lat: 41.335, lon: -8.475 }));
    env.KV.m.set('reports:' + pa.id, JSON.stringify([...old, { kind: 'granizo', time: new Date(now - 31 * 864e5).toISOString(), lat: 41.335, lon: -8.475 }]));
    const t = (await post({ lat: 41.3354, lon: -8.4745, kind: 'trovoada', time: iso(0) })).body;
    assert.equal(t.count, 50);
    const saved = kvj('reports:' + pa.id);
    assert.equal(saved.length, 50);
    assert.equal(saved[0].kind, 'trovoada');
    assert.ok(saved.every((x, i) => !i || Date.parse(x.time) <= Date.parse(saved[i - 1].time)), 'ordenados do mais recente');
    assert.ok(!saved.some((x) => x.kind === 'granizo'), 'o de há 31 dias saiu');
    // GET: só os seus, com idade e distância ao ponto pedido; hours limita
    const g = await api('GET', '/api/reports?lat=41.3354&lon=-8.4745&hours=1', { d: a });
    assert.equal(g.status, 200);
    assert.equal(g.headers.get('access-control-allow-origin'), '*');
    const gj = await g.json();
    assert.equal(gj.place.id, pa.id);
    assert.ok(gj.reports.length >= 5 && gj.reports.every((x) => x.ageMin <= 60));
    assert.deepEqual([gj.reports[0].kind, gj.reports[0].ageMin], ['trovoada', 0]);
    assert.ok(gj.reports[0].distanceKm <= 0.1, 'coordenadas guardadas com 3 casas (~100 m)');
    const gb = (await J('GET', '/api/reports?lat=41.3354&lon=-8.4745', { d: b })).body;
    assert.deepEqual([gb.place, gb.reports.map((x) => x.kind)], [null, ['granizo']], 'b só vê os seus');
    assert.deepEqual((await J('GET', '/api/reports?lat=41.3354&lon=-8.4745')).body, { place: null, reports: [] }, 'sem identidade: nenhum');
    assert.equal((await J('GET', '/api/reports?lat=40&lon=-8', { d: a })).body.reports.length, 0);
    assert.equal((await api('GET', '/api/reports?lat=x&lon=1', { d: a })).status, 400);
});
