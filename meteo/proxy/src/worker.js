// Conector da app Meteo (Cloudflare Worker), como o mercados/proxy: cache/proxy das fontes que o browser não lê
// diretamente, imagens de satélite, locais, avisos do utilizador e análises do Claude (KV). A app está no GitHub Pages.
// Plano gratuito (10 ms de CPU por pedido, 1000 gravações no KV por dia): aqui não se faz cálculo pesado — o motor
// (../../lib) corre no telemóvel — e grava-se pouco.
// Sem contas: cada instalação da app tem um id e um segredo aleatórios (cabeçalho x-meteo-device: <id>.<segredo>),
// registados na primeira utilização (dev:<id>); o dono da app é quem envia o código do segredo OWNER_CODE
// (x-meteo-owner). Cada local é de um telemóvel (ou do dono) e só esse o vê; o dono vê todos, sem as coordenadas exatas
// dos outros.
import Anthropic from '@anthropic-ai/sdk';
import { OM, FIRMS, FOGOS_URL, SAT_LAYERS, satUrl, satBbox, metarBboxUrl, metarHistoryUrl, REPORT_KINDS } from '../../lib/sources.js';
import { ANALYSIS_SCHEMA, SYSTEM_PROMPT, userPrompt, validateAnalysis } from '../../lib/analysis.js';
import { OWNER, GUEST_MAX, ANALYSED_MAX, OTHERS, STATS_TTL, SHARE_KM, placeOwner, placeMembers, lastSeenOfPlace, isOwnerPlace, placeKind, othersMode, approx, lisbon,
    placeStatus, bumpStats, recentReports, usageSummary, addDays, shortId, cleanName } from '../../lib/places.js';
import { validSubscription, validTime, validTz, duePush, pushMessage, newVapidKeys, sendPush, localParts, PUSH_DEFAULT_TIME } from './push.js';

const VERSION = '1.8.0';
const SCHEDULE = ['07:34', '17:34']; // 2× por dia (a das 17:34 vai nas notificações das 19:00)
const UA = 'meteo-preciso/1.0 (app pessoal; Cloudflare Worker)';
const REPORTS_MAX = 50, REPORTS_TTL = 30 * 86400; // avisos do utilizador: os últimos 50 de cada local (ou telemóvel), 30 dias
const INSTANT_DAY_MAX = 20; // análises imediatas por dia (todas juntas)
// Dados públicos: qualquer origem pode ler; escrever (locais, avisos, análise imediata) só a app (ALLOWED_ORIGINS) ou o
// próprio conector. Os pedidos da app levam a identidade do telemóvel (e do dono) em cabeçalhos próprios.
const CORS = { 'access-control-allow-origin': '*', 'access-control-expose-headers': 'x-sat-layer, x-sat-bbox, x-cache' };
const ALLOW_HEADERS = 'content-type, x-meteo-device, x-meteo-owner';
const OM_TTL = { forecast: 900, ensemble: 3600, previous: 3600, archive: 2592000, elevation: 2592000, geocoding: 86400, marine: 3600 };

export default {
    async fetch(req, env, ctx) {
        const url = new URL(req.url);
        if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...CORS, 'access-control-allow-methods': 'GET, POST, PATCH, DELETE, OPTIONS',
            'access-control-allow-headers': ALLOW_HEADERS, 'access-control-max-age': '86400' } });
        // a app está no GitHub Pages; quem abrir o endereço do conector vai lá parar
        if (url.pathname === '/' && req.method === 'GET') return Response.redirect(env.APP_URL || 'https://nelsonsous.github.io/escolaplay/meteo/', 302);
        let res;
        try {
            res = url.pathname.startsWith('/api/') ? await route(req, env, ctx, url) : json({ error: 'nao_encontrado', message: 'Pedido desconhecido.' }, 404);
        } catch (e) {
            console.error(e);
            res = json({ error: 'interno', message: 'Erro interno do servidor.' }, 500);
        }
        const out = new Response(res.body, res);
        for (const [k, v] of Object.entries(CORS)) out.headers.set(k, v);
        return out;
    },
    // de 15 em 15 min (wrangler.toml → [triggers]): envia as notificações do fim do dia que chegaram à hora
    async scheduled(event, env, ctx) {
        ctx.waitUntil(runPush(env, event?.scheduledTime || Date.now()).catch((e) => console.error('notificações', e)));
    },
};

async function route(req, env, ctx, url) {
    const p = url.pathname, m = req.method;
    const q = url.searchParams;
    if (m === 'GET' && p === '/api/status') return status(req, env, url);
    // --- fontes (passagem com cache; o Worker não interpreta os dados nem precisa de saber quem pede) ---
    if (m === 'GET' && p.startsWith('/api/raw/om/')) {
        const api = p.slice('/api/raw/om/'.length);
        if (!OM[api]) return bad('fonte desconhecida');
        const s = url.search.slice(1);
        if (s.length > 4000 || (api !== 'geocoding' && !(q.has('latitude') && q.has('longitude')))) return bad('pedido inválido');
        return passthrough(ctx, `${OM[api]}?${s}`, { ttl: OM_TTL[api], type: 'application/json' });
    }
    if (m === 'GET' && p === '/api/raw/metar') {
        const c = coords(q);
        if (!c) return bad('coordenadas inválidas');
        return passthrough(ctx, metarBboxUrl(c.lat, c.lon, 3), { ttl: 600, type: 'application/json' });
    }
    if (m === 'GET' && p === '/api/raw/metar-history') {
        const id = (q.get('id') || '').toUpperCase();
        if (!/^[A-Z0-9]{4}$/.test(id)) return bad('estação inválida');
        return passthrough(ctx, metarHistoryUrl(id), { ttl: 1800, type: 'application/json' });
    }
    if (m === 'GET' && p === '/api/raw/firms') {
        const f = FIRMS[q.get('sat')];
        if (!f) return bad('satélite inválido');
        return passthrough(ctx, f.url, { ttl: 1800, type: 'text/csv; charset=utf-8' });
    }
    if (m === 'GET' && p === '/api/raw/fogos') {
        const r = await passthrough(ctx, FOGOS_URL, { ttl: 180, type: 'application/json', ua: 'Mozilla/5.0 (compatible; meteo-preciso/1.0)' });
        // se a fonte recusar o Worker, usa a última cópia guardada pela tarefa agendada (até 6 h)
        if (r.ok || !env.KV) return r;
        const saved = await env.KV.get('fogos:latest', 'json');
        return saved && Date.now() - Date.parse(saved.savedAt) < 6 * 36e5 ? json({ ...saved.data, savedAt: saved.savedAt }, 200, { 'x-cache': 'KV' }) : r;
    }
    if (m === 'GET' && p === '/api/sat') {
        const c = coords(q);
        const layer = SAT_LAYERS[q.get('layer')] ? q.get('layer') : 'geocolour';
        if (!c) return bad('coordenadas inválidas');
        const km = clampInt(q.get('km'), 100, 4000, 600), w = clampInt(q.get('w'), 200, 1200, 720), h = clampInt(q.get('h'), 200, 1200, 540);
        const b = satBbox(c.lat, c.lon, km, w, h);
        return passthrough(ctx, satUrl(layer, c.lat, c.lon, { km, w, h }), { ttl: 600, type: 'image/png',
            headers: { 'x-sat-layer': layer, 'x-sat-bbox': `${b.west},${b.south},${b.east},${b.north}`, 'access-control-expose-headers': 'x-sat-layer, x-sat-bbox' } });
    }
    if (m === 'GET' && p === '/api/geocode') {
        const name = (q.get('q') || '').trim().slice(0, 80);
        if (name.length < 2) return json([]);
        const r = await fetch(`${OM.geocoding}?name=${encodeURIComponent(name)}&count=8&language=pt&format=json`, { headers: { 'user-agent': UA }, cf: { cacheTtl: 86400, cacheEverything: true } }).catch(() => null);
        if (!r || !r.ok) return json({ error: 'fonte', message: 'Pesquisa indisponível.' }, 502);
        const j = await r.json();
        return json((j.results || []).map((x) => ({ name: x.name, admin1: x.admin1 || null, admin2: x.admin2 || null, country: x.country || null,
            countryCode: x.country_code || null, lat: x.latitude, lon: x.longitude, elevation: x.elevation ?? null })), 200, { 'cache-control': 'public, max-age=86400' });
    }
    if (m === 'GET' && p === '/api/obs-history') {
        const id = q.get('station') || '';
        if (!/^\d{3,9}$/.test(id) || !env.KV) return json([]);
        return json((await env.KV.get('obs:' + id, 'json')) || [], 200, { 'cache-control': 'public, max-age=600' });
    }
    // --- análises, locais e avisos: dependem de quem pede (cabeçalhos x-meteo-device / x-meteo-owner) ---
    if (m === 'GET' && p === '/api/analysis') return getAnalysis(req, env, url);
    if (m === 'GET' && p === '/api/learning') return getLearning(req, env, url);
    if (m === 'GET' && p === '/api/push/key') return pushKey(env);
    if (p === '/api/push') {
        if (m === 'GET') return getPush(req, env, url);
        if (m === 'POST') return savePush(req, env, url);
        if (m === 'DELETE') return deletePush(req, env, url);
    }
    if (m === 'POST' && p === '/api/push/test') return testPush(req, env, url);
    if (m === 'POST' && p === '/api/analysis/refresh') return refresh(req, env, url);
    if (p === '/api/places') {
        if (m === 'GET') return listPlaces(req, env, url);
        if (m === 'POST') return addPlace(req, env, url);
    }
    if (p === '/api/reports') {
        if (m === 'GET') return listReports(req, env, url);
        if (m === 'POST') return addReport(req, env, url);
    }
    if (m === 'DELETE' && p.startsWith('/api/places/')) return deletePlace(req, env, url, decodeURIComponent(p.slice('/api/places/'.length)));
    if (m === 'PATCH' && p.startsWith('/api/places/')) return updatePlace(req, env, url, decodeURIComponent(p.slice('/api/places/'.length)));
    // --- só o dono ---
    if (m === 'GET' && p === '/api/usage') return usage(req, env, url);
    if (m === 'PATCH' && p === '/api/me') return setMe(req, env, url);
    if (p === '/api/settings' && (m === 'GET' || m === 'PATCH')) return settings(req, env, url);
    return json({ error: 'nao_encontrado', message: 'Pedido desconhecido.' }, 404);
}

// ---------- utilitários ----------
function json(body, status = 200, headers = {}) {
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });
}
const bad = (message) => json({ error: 'pedido_invalido', message }, 400);
const noKv = () => json({ error: 'kv', message: 'Base de dados por configurar.' }, 501);
const notTrusted = () => json({ error: 'origem', message: 'Pedido não autorizado.' }, 403);
const notFound = () => json({ error: 'nao_encontrado', message: 'Local não encontrado.' }, 404);
function coords(q) {
    const lat = Number(q.get('lat')), lon = Number(q.get('lon'));
    return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? { lat, lon } : null;
}
const validLatLon = (lat, lon) => Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
function clampInt(v, a, b, d) { const n = parseInt(v, 10); return Number.isFinite(n) ? Math.min(b, Math.max(a, n)) : d; }
function distKm(a, b, c, d) {
    const t = Math.PI / 180, x = Math.sin(((c - a) * t) / 2) ** 2 + Math.cos(a * t) * Math.cos(c * t) * Math.sin(((d - b) * t) / 2) ** 2;
    return 12742 * Math.asin(Math.sqrt(x));
}
const r1 = (x) => Math.round(x * 10) / 10;
const r4 = (x) => Math.round(x * 1e4) / 1e4;
function trusted(req, env, url) {
    const o = req.headers.get('origin');
    return !!o && [url.origin, ...String(env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean)].includes(o);
}

async function passthrough(ctx, upstream, { ttl, type, headers = {}, ua = UA }) {
    const cache = typeof caches !== 'undefined' ? caches.default : null;
    const key = new Request(upstream, { method: 'GET' });
    const hit = cache && (await cache.match(key).catch(() => null));
    if (hit) { const r = new Response(hit.body, hit); r.headers.set('x-cache', 'HIT'); return r; }
    let up;
    try {
        up = await fetch(upstream, { headers: { 'user-agent': ua, accept: '*/*' }, cf: { cacheTtl: ttl, cacheEverything: true } });
    } catch {
        return json({ error: 'fonte', message: 'Fonte de dados indisponível.' }, 502);
    }
    if (!up.ok) return json({ error: 'fonte', status: up.status, message: up.status === 429 ? 'A fonte está a limitar pedidos; tenta daqui a pouco.' : 'Fonte de dados indisponível.' }, up.status === 429 ? 429 : 502);
    const out = new Response(up.body, { status: 200, headers: { 'content-type': type || up.headers.get('content-type') || 'application/octet-stream',
        'cache-control': `public, max-age=${ttl}`, 'x-cache': 'MISS', ...headers } });
    if (cache) ctx.waitUntil(cache.put(key, out.clone()).catch(() => {}));
    return out;
}

// ---------- identidade (sem contas) ----------
// x-meteo-device: <id>.<segredo>, gerados ao acaso no telemóvel na primeira utilização. O conector guarda só o hash do
// segredo (dev:<id>: confiança na primeira utilização) e recusa um segredo errado para um id conhecido. Só fica registado
// quando a pessoa diz o nome (PATCH /api/me): abrir a app (ou o site no browser) não regista nada. lastSeen é
// gravado no máximo 1× por dia; os metadados { s: dia de Lisboa, o: 1 se é do dono } deixam o painel do dono contar os
// telemóveis com uma só listagem. Só a app (origem de confiança) regista telemóveis novos e grava o lastSeen. O registo
// expira ao fim de 400 dias sem abrir a app (cada gravação do lastSeen renova o prazo).
const DEVICE = /^([a-z0-9]{16,40})\.([A-Za-z0-9_-]{32,128})$/;
const DEV_TTL = 400 * 86400;
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const sha256 = async (s) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
/** Comparação em tempo constante (os hashes têm sempre 64 caracteres). */
function sameHash(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
    let x = 0;
    for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return x === 0;
}
let ownerHash = null; // { code, hash }: o hash do segredo OWNER_CODE, calculado uma vez por isolate
/** O pedido traz o código do dono (x-meteo-owner, com encodeURIComponent)? Sem o segredo OWNER_CODE não há dono. */
async function ownerCode(req, env) {
    const code = typeof env.OWNER_CODE === 'string' ? env.OWNER_CODE.trim() : '';
    const raw = req.headers.get('x-meteo-owner');
    if (!raw) return null;
    if (!code) return 'sem_codigo';
    let got;
    try { got = decodeURIComponent(raw).trim(); } catch { return 'errado'; }
    if (ownerHash?.code !== code) ownerHash = { code, hash: await sha256(code) };
    return sameHash(await sha256(got), ownerHash.hash) ? 'ok' : 'errado';
}
const noDevice = (message = 'Este telemóvel não foi reconhecido pelo conector. Abre a app de novo.') => json({ error: 'dispositivo', message }, 403);
// telemóvel ainda sem registo: o nome é obrigatório para ligar a análise diária, as notificações ou dar avisos
const needName = () => json({ error: 'sem_nome', message: 'Escreve primeiro o teu nome (Ajustes → Este telemóvel): é assim que o dono da app sabe quem a usa.' }, 403);
// Pedidos ao mesmo tempo do mesmo telemóvel leem o mesmo registo: neste isolate só o primeiro grava (durante 60 s, o
// tempo que o KV pode levar a mostrar a gravação). A chave é o que se leu, por isso um registo diferente grava sempre.
const writing = new Map();
function firstWriter(key) {
    const t = writing.get(key);
    if (t && Date.now() - t < 60e3) return false;
    if (writing.size > 2000) writing.clear();
    writing.set(key, Date.now());
    return true;
}
async function putDevice(env, wkey, key, value, meta) {
    try { await env.KV.put(key, JSON.stringify(value), meta); } catch (e) { writing.delete(wkey); throw e; }
}

/** Quem pede: { id, owner, code } (id null sem registo; unknown = { id, th } de um telemóvel ainda sem registo) ou { error }
 *  quando o segredo não bate certo. */
async function who(req, env, url) {
    const code = await ownerCode(req, env), owner = code === 'ok';
    const m = DEVICE.exec(req.headers.get('x-meteo-device') || '');
    if (!m || !env.KV) return { id: null, owner, code };
    const [, id, token] = m, key = 'dev:' + id;
    const [rec, th] = await Promise.all([env.KV.get(key, 'json'), sha256(token)]);
    if (rec && !sameHash(rec.tokenHash, th)) return { error: noDevice() };
    const canWrite = trusted(req, env, url);
    const nowIso = new Date().toISOString(), day = lisbon().date;
    const meta = { metadata: { s: day, o: owner ? 1 : 0, ...(rec?.name ? { n: rec.name } : {}) }, expirationTtl: DEV_TTL };
    if (!rec) return { id: null, owner, code, ...(canWrite ? { unknown: { id, th } } : {}) };
    const seenDay = Number.isFinite(Date.parse(rec.lastSeen)) ? lisbon(Date.parse(rec.lastSeen)).date : '';
    const wkey = `${id}:${rec.lastSeen}:${owner ? 1 : 0}`;
    if (canWrite && (seenDay !== day || !!rec.owner !== owner) && firstWriter(wkey)) {
        const upd = { ...rec, lastSeen: nowIso };
        if (owner) upd.owner = true; else delete upd.owner;
        await putDevice(env, wkey, key, upd, meta);
        // este telemóvel passou a ser do dono: os locais que ligou antes passam a ser do dono
        if (owner && !rec.owner) await adoptPlaces(env, id);
    }
    return { id, owner, code, name: rec.name || null };
}
async function adoptPlaces(env, id) {
    const places = await getPlaces(env);
    if (places.some((p) => p.owner === id)) await savePlaces(env, places.map((p) => (p.owner === id ? { ...p, owner: OWNER } : p)));
}

// ---------- locais ----------
// Cada local tem dono: place.owner = id do telemóvel que o ligou, ou "owner" (o dono da app; também os de antes, sem
// dono). Os outros telemóveis têm no máximo 1 (ligar noutro sítio muda-o: PATCH, o mesmo id); o dono não tem limite.
// Desligar não apaga: o local fica com off (e offBy), para voltar a ligar com o mesmo id (a última análise e as lições
// ficam). Os ids dos outros telemóveis levam sempre um sufixo ao acaso: nunca herdam a análise guardada de outro local.
async function getPlaces(env) { const v = env.KV && (await env.KV.get('places', 'json')); return Array.isArray(v) ? v : []; }
const savePlaces = (env, places) => env.KV.put('places', JSON.stringify(places));
const getSettings = async (env) => (env.KV && (await env.KV.get('settings', 'json'))) || {};
const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'local';
const rand = (n) => { const a = new Uint8Array(n); crypto.getRandomValues(a); return [...a].map((b) => 'abcdefghijkmnpqrstuvwxyz23456789'[b % 32]).join(''); };
// 1 análise por pessoa, não por telemóvel: limpar o histórico ou instalar noutro browser dá um registo novo, mas com o
// mesmo nome é a mesma pessoa (o nome é obrigatório no registo). O local guarda o nome de quem o ligou (ownerName).
const personKey = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
const samePerson = (me, p) => !isOwnerPlace(p) && !!me.name && !!p.ownerName && personKey(me.name) === personKey(p.ownerName);
/** É deste telemóvel? (o dono: os do dono; os outros: os deste telemóvel e os da mesma pessoa, noutro registo) */
const mine = (me, p) => (me.owner && isOwnerPlace(p)) || (!!me.id && placeOwner(p) === me.id) || (!me.owner && samePerson(me, p));
/** O local passa para o registo que o está a usar agora (o antigo deixa de abrir a app: senão ficava em pausa) */
const claim = (me, p) => (!me.owner && me.id && !isOwnerPlace(p) && placeOwner(p) !== me.id && mine(me, p)
    ? { ...p, owner: me.id, members: placeMembers(p).filter((x) => x !== me.id) } : p);
/** Juntou-se a este local (outro telemóvel ligou-o na mesma cidade): vê e usa a análise, mas não o muda de sítio */
const member = (me, p) => !mine(me, p) && !!me.id && placeMembers(p).includes(me.id);
const uses = (me, p) => mine(me, p) || member(me, p);
const canSee = (me, p) => me.owner || uses(me, p);
/** Sai dos locais a que se tinha juntado (cada telemóvel acompanha 1 análise) */
const leave = (p, id) => (placeMembers(p).includes(id) ? { ...p, members: placeMembers(p).filter((x) => x !== id) } : p);
/** As coordenadas como as pode ver quem pede: as exatas só nos seus locais; nos dos outros (só o dono os vê), ~1 km. */
const seenAt = (me, p) => (mine(me, p) ? { lat: p.lat, lon: p.lon } : { lat: approx(p.lat), lon: approx(p.lon) });
function placeView(me, p, extra = {}) {
    const own = mine(me, p), shared = member(me, p), c = seenAt(me, p);
    return { id: p.id, name: p.name, ...c, ...(own ? {} : { approx: true }), mine: own || shared, ...(shared ? { shared: true } : {}), kind: placeKind(p), createdAt: p.createdAt || null,
        ...(p.movedAt ? { movedAt: p.movedAt } : {}), ...(p.off ? { off: true, offBy: p.offBy || 'device' } : {}), ...extra };
}
/** lastSeen dos telemóveis (KV dev:<id>) → { id: ISO } */
async function lastSeenOf(env, ids) {
    const u = [...new Set(ids)];
    const recs = await Promise.all(u.map((id) => env.KV.get('dev:' + id, 'json').catch(() => null)));
    return Object.fromEntries(u.map((id, i) => [id, recs[i]?.lastSeen || null]));
}
/** O local (em uso) de quem pede mais perto do ponto, até maxKm (distância às coordenadas que pode ver). */
function nearestOf(me, places, lat, lon, maxKm) {
    return places.filter((p) => !p.off && canSee(me, p)).map((p) => { const c = seenAt(me, p); return { p, d: distKm(lat, lon, c.lat, c.lon) }; })
        .filter((o) => o.d <= maxKm).sort((a, b) => a.d - b.d)[0] || null;
}
// O que impede outro telemóvel de ligar (ou voltar a ligar) a análise diária: a análise dos outros desligada pelo dono,
// um local desligado pelo dono, ou já haver 15 locais em análise (os do dono e os dos outros em uso).
async function guestBlock(env, places, cur) {
    if (othersMode(await getSettings(env)) === 'off') return json({ error: 'convidados_desligados', message: 'O dono da app desligou, por agora, a análise diária do Claude nos outros telemóveis.' }, 403);
    if (cur?.off && cur.offBy === 'owner') return json({ error: 'desligado_pelo_dono', message: 'A análise diária deste telemóvel foi desligada pelo dono da app.' }, 403);
    const rest = places.filter((p) => p.id !== cur?.id && !p.off);
    const seen = await lastSeenOf(env, rest.filter((p) => !isOwnerPlace(p)).flatMap((p) => [placeOwner(p), ...placeMembers(p)]));
    if (rest.filter((p) => placeStatus(p, lastSeenOfPlace(p, (id) => seen[id])) === 'active').length >= ANALYSED_MAX) {
        return json({ error: 'cheio', message: `De momento não há vagas para a análise diária do Claude (máx. ${ANALYSED_MAX} locais). Tenta mais tarde.` }, 409);
    }
    return null;
}

async function listPlaces(req, env, url) {
    const me = await who(req, env, url);
    if (me.error) return me.error;
    // o dono não vê os locais que o próprio telemóvel desligou (eram dele; se os voltar a ligar, aparecem)
    const vis = (await getPlaces(env)).filter((p) => canSee(me, p) && !(me.owner && p.off && p.offBy !== 'owner' && !mine(me, p)));
    const seen = me.owner ? await lastSeenOf(env, vis.filter((p) => !mine(me, p)).flatMap((p) => [placeOwner(p), ...placeMembers(p)])) : {};
    const now = new Date().toISOString();
    return json(vis.map((p) => placeView(me, p, { status: placeStatus(p, uses(me, p) ? now : lastSeenOfPlace(p, (id) => seen[id])) })), 200);
}

async function addPlace(req, env, url) {
    if (!env.KV) return noKv();
    if (!trusted(req, env, url)) return notTrusted();
    const me = await who(req, env, url);
    if (me.error) return me.error;
    if (!me.id && !me.owner) return needName();
    const b = await req.json().catch(() => null);
    const lat = Number(b?.lat), lon = Number(b?.lon), name = String(b?.name || '').trim().slice(0, 40);
    if (!name || !validLatLon(lat, lon)) return bad('Dados do local inválidos.');
    const places = await getPlaces(env);
    const own = places.filter((p) => mine(me, p)).sort((a, b) => Number(!!a.off) - Number(!!b.off)); // o ligado primeiro
    const near = own.filter((p) => distKm(p.lat, p.lon, lat, lon) < 0.5);
    const on = near.find((p) => !p.off);
    if (on) {
        const c = claim(me, on);
        if (c !== on) await savePlaces(env, places.map((x) => (x.id === on.id ? c : x)));
        return json(placeView(me, c), 200);
    }
    const off = near.find((p) => p.off) || null;
    const nowIso = new Date().toISOString();
    // O dono a ligar uma cidade onde outro telemóvel já tem análise diária (≤ 5 km): não se cria outra — o local passa a
    // ser do dono (sem pausas nem limites) e quem o ligou junta-se a ele (continua a vê-lo, com a mesma análise e lições)
    if (me.owner && !off) {
        const dk = (p) => distKm(p.lat, p.lon, lat, lon);
        const g = places.filter((p) => !p.off && !isOwnerPlace(p) && dk(p) <= SHARE_KM).sort((a, b) => dk(a) - dk(b))[0];
        if (g) {
            const next = { ...g, owner: OWNER, members: [...new Set([...placeMembers(g), placeOwner(g)])], adoptedAt: nowIso };
            await savePlaces(env, places.map((p) => (p.id === g.id ? next : p)));
            return json(placeView(me, next, { adopted: true }), 200);
        }
    }
    // Na mesma cidade (≤ 5 km) já há uma análise diária (de preferência a do dono): este telemóvel junta-se a ela em vez
    // de criar outra. Acompanha só essa (sai de outra a que se tinha juntado; o seu local, se tiver, fica desligado).
    if (!me.owner) {
        const dk = (p) => distKm(p.lat, p.lon, lat, lon);
        const join = places.filter((p) => !p.off && !mine(me, p) && dk(p) <= SHARE_KM)
            .sort((a, b) => Number(isOwnerPlace(b)) - Number(isOwnerPlace(a)) || dk(a) - dk(b))[0];
        if (join) {
            if (othersMode(await getSettings(env)) === 'off') return json({ error: 'convidados_desligados', message: 'O dono da app desligou, por agora, a análise diária do Claude nos outros telemóveis.' }, 403);
            const next = places.map((p) => (p.id === join.id ? { ...p, members: [...placeMembers(p).filter((x) => x !== me.id), me.id] }
                : mine(me, p) && !p.off ? { ...leave(p, me.id), off: true, offAt: nowIso, offBy: 'device' } : leave(p, me.id)));
            if (JSON.stringify(next) !== JSON.stringify(places)) await savePlaces(env, next);
            return json(placeView(me, next.find((p) => p.id === join.id)), 200);
        }
    }
    if (!me.owner) {
        // 1 local por telemóvel: noutro sítio, a app muda-o (PATCH /api/places/<id>)
        if (!off && own.length >= GUEST_MAX) return json({ error: 'limite', message: 'Cada pessoa tem 1 local com análise diária: muda-o para aqui.', place: placeView(me, own[0]) }, 409);
        const block = await guestBlock(env, places, off);
        if (block) return block;
    }
    if (off) { // voltar a ligar: o mesmo id (a última análise e as lições continuam)
        const back = { ...claim(me, off), onAt: nowIso };
        delete back.off; delete back.offAt; delete back.offBy;
        await savePlaces(env, places.map((x) => (x.id === off.id ? back : leave(x, me.id))));
        return json(placeView(me, back), 200);
    }
    const base = slug(name);
    let id = me.owner ? base : `${base.slice(0, 17)}-${rand(6)}`;
    while (places.some((x) => x.id === id)) id = `${base.slice(0, 17)}-${rand(6)}`;
    const place = { id, name, lat: r4(lat), lon: r4(lon), createdAt: nowIso, owner: me.owner ? OWNER : me.id, ...(!me.owner && me.name ? { ownerName: me.name } : {}) };
    await savePlaces(env, [...places.map((x) => leave(x, me.id)), place]);
    return json(placeView(me, place), 201);
}

// Desligar (a análise e as lições ficam guardadas). O dono pode desligar qualquer local; o dos outros fica offBy "owner"
// e só o dono o volta a ligar.
async function deletePlace(req, env, url, id) {
    if (!env.KV) return noKv();
    if (!trusted(req, env, url)) return notTrusted();
    const me = await who(req, env, url);
    if (me.error) return me.error;
    const places = await getPlaces(env);
    const cur = places.find((x) => x.id === id);
    if (!cur || !canSee(me, cur)) return notFound();
    // juntou-se a este local: desligar é sair (a análise continua para os outros)
    if (member(me, cur) && !me.owner) { await savePlaces(env, places.map((x) => (x.id === id ? leave(x, me.id) : x))); return new Response(null, { status: 204 }); }
    if (!cur.off) await savePlaces(env, places.map((x) => (x.id === id ? { ...cur, off: true, offAt: new Date().toISOString(), offBy: mine(me, cur) ? 'device' : 'owner' } : x)));
    return new Response(null, { status: 204 });
}

// Mudar um local para outro ponto ({ lat, lon, name? } — na app: "Mudar a análise diária para este ponto", ou ligar
// noutro sítio o único local de um telemóvel) e/ou ligar/desligar ({ on }). O id fica o mesmo, por isso a última análise
// (analysis:<id>) e as lições (lessons:<id>) continuam; a próxima análise já é do ponto novo. Só o telemóvel do local
// (ou o dono, nos do dono) o muda de sítio; o dono pode ligar/desligar qualquer um.
async function updatePlace(req, env, url, id) {
    if (!env.KV) return noKv();
    if (!trusted(req, env, url)) return notTrusted();
    const me = await who(req, env, url);
    if (me.error) return me.error;
    const places = await getPlaces(env);
    const cur = places.find((x) => x.id === id);
    if (!cur || !canSee(me, cur)) return notFound();
    const own = mine(me, cur);
    const b = (await req.json().catch(() => null)) || {};
    if (member(me, cur) && !me.owner) { // juntou-se: só pode sair (on: false); não o muda de sítio
        if (b.lat != null || b.lon != null) return json({ error: 'so_o_proprio', message: 'Esta análise é partilhada: só o telemóvel que a ligou a muda de sítio.' }, 403);
        if (b.on === false) { const next = leave(cur, me.id); await savePlaces(env, places.map((x) => (x.id === id ? next : x))); return json({ ...placeView(me, next), off: true }, 200); }
        return json(placeView(me, cur), 200);
    }
    const move = b.lat != null || b.lon != null;
    let next = claim(me, { ...cur });
    if (move) {
        if (!own) return json({ error: 'so_o_proprio', message: 'Só o telemóvel deste local o pode mudar de sítio.' }, 403);
        const lat = Number(b.lat), lon = Number(b.lon);
        if (!validLatLon(lat, lon)) return bad('Coordenadas inválidas.');
        const name = b.name == null ? cur.name : String(b.name).trim().slice(0, 40);
        if (!name) return bad('Nome inválido.');
        const other = places.find((x) => x.id !== id && !x.off && mine(me, x) && distKm(x.lat, x.lon, lat, lon) < 0.5);
        if (other) return json({ error: 'duplicado', message: `Já tens análise diária para este ponto (${other.name}).` }, 409);
        next = { ...next, name, lat: r4(lat), lon: r4(lon), movedAt: new Date().toISOString() };
    }
    if (b.on === true && cur.off) {
        if (!own && cur.offBy !== 'owner') return json({ error: 'so_o_proprio', message: 'Este local foi desligado no próprio telemóvel.' }, 403);
        if (!me.owner) { const block = await guestBlock(env, places, cur); if (block) return block; }
        next.onAt = new Date().toISOString();
        delete next.off; delete next.offAt; delete next.offBy;
    } else if (b.on === false && !cur.off) {
        next = { ...next, off: true, offAt: new Date().toISOString(), offBy: own ? 'device' : 'owner' };
    }
    if (!move && b.on == null) return bad('Nada a mudar.');
    // sem mudanças (ligar o que já está ligado…): não grava
    if (move || (b.on === true && cur.off) || (b.on === false && !cur.off) || next.owner !== cur.owner) await savePlaces(env, places.map((x) => (x.id === id ? next : x)));
    return json(placeView(me, next), 200);
}

// ---------- avisos do utilizador ("Está a chover?") ----------
// Ficam com quem os deu: no local (em uso) deste telemóvel a ≤ 2 km (reports:<id>, que a tarefa agendada mostra ao
// Claude) ou, longe dos seus locais, só deste telemóvel (reports:dev:<id>). Os últimos 50, 30 dias; coordenadas com 3
// casas (~100 m). Ninguém lê os avisos dos outros.
async function reportKey(env, me, lat, lon) {
    const near = nearestOf(me, (await getPlaces(env)).filter((p) => uses(me, p)), lat, lon, 2)?.p || null;
    return near ? { key: `reports:${near.id}`, place: { id: near.id, name: near.name } } : { key: `reports:dev:${me.id}`, place: null };
}
const r3 = (x) => Math.round(x * 1e3) / 1e3;

async function addReport(req, env, url) {
    if (!env.KV) return noKv();
    if (!trusted(req, env, url)) return notTrusted();
    const me = await who(req, env, url);
    if (me.error) return me.error;
    if (!me.id) return needName();
    const b = await req.json().catch(() => null);
    const lat = Number(b?.lat), lon = Number(b?.lon), kind = String(b?.kind || '');
    if (!Object.hasOwn(REPORT_KINDS, kind) || !validLatLon(lat, lon)) return bad('Aviso inválido.');
    // a hora do telemóvel (até 3 h para trás); fora disso, a do conector
    const now = Date.now(), t = Date.parse(b?.time);
    const time = new Date(Number.isFinite(t) && t <= now + 5 * 6e4 && t >= now - 3 * 36e5 ? t : now).toISOString();
    const { key, place } = await reportKey(env, me, lat, lon);
    const old = (await env.KV.get(key, 'json')) || [];
    const report = { kind, time, lat: r3(lat), lon: r3(lon), receivedAt: new Date(now).toISOString() };
    const keep = [report, ...(Array.isArray(old) ? old : []).filter((x) => now - Date.parse(x.time) <= REPORTS_TTL * 1000)]
        .sort((a, c) => Date.parse(c.time) - Date.parse(a.time)).slice(0, REPORTS_MAX);
    await env.KV.put(key, JSON.stringify(keep), { expirationTtl: REPORTS_TTL });
    return json({ report, place, count: keep.length }, 201);
}

async function listReports(req, env, url) {
    const c = coords(url.searchParams);
    if (!c) return bad('coordenadas inválidas');
    const me = await who(req, env, url);
    if (me.error) return me.error;
    if (!me.id || !env.KV) return json({ place: null, reports: [] });
    const { key, place } = await reportKey(env, me, c.lat, c.lon);
    const reports = recentReports(await env.KV.get(key, 'json'), c.lat, c.lon, { hours: clampInt(url.searchParams.get('hours'), 1, 720, 720), maxKm: 10 });
    return json({ place, reports }, 200);
}

// ---------- análise do Claude ----------
// Só para o telemóvel do local (ou o dono): o local em uso de quem pede mais perto (≤ 10 km) — nunca a de outras pessoas
// por estar perto. A análise imediata feita fora dos seus locais fica só para esse telemóvel (analysis:dev:<id>, 24 h).
const adhocKey = (id) => `analysis:dev:${id}`;
const onDemandFor = (env, me, mode) => !!env.ANTHROPIC_API_KEY && (me.owner || mode === 'on');

async function getAnalysis(req, env, url) {
    const c = coords(url.searchParams);
    if (!c) return bad('coordenadas inválidas');
    const me = await who(req, env, url);
    if (me.error) return me.error;
    const [places, mode] = await Promise.all([getPlaces(env), getSettings(env).then(othersMode)]);
    const near = nearestOf(me, places, c.lat, c.lon, 10);
    let analysis = near && env.KV ? await env.KV.get('analysis:' + near.p.id, 'json') : null;
    // a de um local de outro telemóvel (só o dono a vê): sem as coordenadas exatas
    if (analysis?.place && !mine(me, near.p)) analysis = { ...analysis, place: { ...analysis.place, lat: approx(analysis.place.lat), lon: approx(analysis.place.lon) } };
    // análise imediata deste telemóvel para este ponto (≤ 2 km), fora dos seus locais: mostra-se se for mais recente
    const adhoc = me.id && env.KV ? await env.KV.get(adhocKey(me.id), 'json') : null;
    if (adhoc?.place && distKm(c.lat, c.lon, adhoc.place.lat, adhoc.place.lon) <= 2 && (!analysis || Date.parse(adhoc.generatedAt) > Date.parse(analysis.generatedAt))) analysis = adhoc;
    const ageMin = analysis?.generatedAt ? Math.round((Date.now() - Date.parse(analysis.generatedAt)) / 6e4) : null;
    return json({ analysis: analysis || null, place: near ? placeView(me, near.p, { distanceKm: r1(near.d) }) : null, ageMin, schedule: SCHEDULE,
        onDemand: onDemandFor(env, me, mode), others: mode }, 200);
}

// Memória da aprendizagem (lib/learn.js) do local deste telemóvel mais perto do ponto (≤ 3 km), que a tarefa agendada
// atualiza 3× por dia (learn:<id>). Só a de um local do próprio (o dono: os seus) — a memória traz as coordenadas do local.
// Devolve o texto guardado tal como está (sem o ler: poupa CPU).
async function getLearning(req, env, url) {
    const c = coords(url.searchParams);
    if (!c) return bad('coordenadas inválidas');
    const me = await who(req, env, url);
    if (me.error) return me.error;
    if (!env.KV) return json({ place: null, memory: null });
    const near = nearestOf(me, (await getPlaces(env)).filter((p) => mine(me, p)), c.lat, c.lon, 3);
    const text = near ? await env.KV.get('learn:' + near.p.id, 'text') : null;
    const memory = text && text.startsWith('{') ? text : 'null';
    return new Response(`{"place":${JSON.stringify(near ? { id: near.p.id, distanceKm: r1(near.d) } : null)},"memory":${memory}}`,
        { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}

// ---------- notificações do fim do dia (Web Push; cifra e VAPID em push.js) ----------
// push:vapid = par de chaves (criado no primeiro uso); push:index = uma entrada por telemóvel:
// { id, ep, k: { p256dh, auth }, time: 'HH:MM', tz, sunday, place, last: dia local da última enviada }.
// A notificação traz a última análise do Claude do local escolhido (um local do próprio telemóvel, com a análise diária).
const PUSH_MAX = 300, PUSH_PER_RUN = 25;
const appUrl = (env) => env.APP_URL || 'https://nelsonsous.github.io/escolaplay/meteo/';
async function vapid(env) {
    let k = await env.KV.get('push:vapid', 'json');
    if (!k?.publicKey || !k.privateJwk) { k = await newVapidKeys(); await env.KV.put('push:vapid', JSON.stringify(k)); }
    return k;
}
async function pushIndex(env) { const v = await env.KV.get('push:index', 'json'); return Array.isArray(v) ? v : []; }
const pushView = (e) => (e ? { on: true, time: e.time, sunday: !!e.sunday, place: e.place || null, tz: e.tz, last: e.last || null }
    : { on: false, time: PUSH_DEFAULT_TIME, sunday: true, place: null });
async function pushKey(env) {
    if (!env.KV) return noKv();
    return json({ publicKey: (await vapid(env)).publicKey }, 200, { 'cache-control': 'public, max-age=3600' });
}
async function getPush(req, env, url) {
    const me = await who(req, env, url);
    if (me.error) return me.error;
    if (!env.KV || !me.id) return json(pushView(null));
    return json(pushView((await pushIndex(env)).find((e) => e.id === me.id)));
}
async function pushWriter(req, env, url) {
    if (!env.KV) return { error: noKv() };
    if (!trusted(req, env, url)) return { error: notTrusted() };
    const me = await who(req, env, url);
    if (me.error) return { error: me.error };
    if (!me.id) return { error: needName() };
    return { me };
}
async function savePush(req, env, url) {
    const { me, error } = await pushWriter(req, env, url);
    if (error) return error;
    const b = await req.json().catch(() => null);
    const sub = validSubscription(b?.subscription), time = validTime(b?.time);
    if (!sub || !time) return bad('Notificação inválida.');
    const place = (await getPlaces(env)).find((p) => p.id === b?.place && !p.off && uses(me, p));
    if (!place) return json({ error: 'sem_local', message: 'As notificações trazem a análise diária do Claude: liga-a primeiro para um local teu (Análise → Análise diária).' }, 409);
    const idx = await pushIndex(env), old = idx.find((e) => e.id === me.id), rest = idx.filter((e) => e.id !== me.id);
    if (rest.length >= PUSH_MAX) return json({ error: 'cheio', message: 'De momento não há vagas para mais notificações.' }, 409);
    const entry = { id: me.id, ep: sub.endpoint, k: sub.keys, time, tz: validTz(b?.tz) || 'Europe/Lisbon', sunday: b?.sunday !== false, place: place.id,
        last: old?.last || null, at: new Date().toISOString() };
    await env.KV.put('push:index', JSON.stringify([...rest, entry]));
    return json(pushView(entry), 201);
}
async function deletePush(req, env, url) {
    const { me, error } = await pushWriter(req, env, url);
    if (error) return error;
    const idx = await pushIndex(env);
    if (idx.some((e) => e.id === me.id)) await env.KV.put('push:index', JSON.stringify(idx.filter((e) => e.id !== me.id)));
    return new Response(null, { status: 204 });
}
async function deliver(env, e, { keys, places, analyses, weekly, nowMs }) {
    if (!analyses.has(e.place)) analyses.set(e.place, await env.KV.get('analysis:' + e.place, 'json').catch(() => null));
    const place = places.find((p) => p.id === e.place);
    const msg = pushMessage(analyses.get(e.place), { name: place?.name, weekly, url: `${appUrl(env)}?tab=analise`, nowMs });
    return sendPush({ endpoint: e.ep, keys: e.k }, msg, keys, { subject: appUrl(env) });
}
const testAt = new Map(); // por telemóvel, neste isolado: um teste por minuto
async function testPush(req, env, url) {
    const { me, error } = await pushWriter(req, env, url);
    if (error) return error;
    const e = (await pushIndex(env)).find((x) => x.id === me.id);
    if (!e) return json({ error: 'sem_notificacoes', message: 'Liga primeiro as notificações.' }, 409);
    if (Date.now() - (testAt.get(me.id) || 0) < 60e3) return json({ error: 'espera', message: 'Espera um minuto entre testes.' }, 429);
    testAt.set(me.id, Date.now());
    const nowMs = Date.now(), weekly = !!e.sunday && localParts(nowMs, e.tz).dow === 0;
    const status = await deliver(env, e, { keys: await vapid(env), places: await getPlaces(env), analyses: new Map(), weekly, nowMs });
    if (status === 404 || status === 410) {
        await env.KV.put('push:index', JSON.stringify((await pushIndex(env)).filter((x) => x.id !== me.id)));
        return json({ error: 'caducada', message: 'A autorização de notificações deste telemóvel caducou: desliga e volta a ligar.' }, 410);
    }
    return status >= 200 && status < 300 ? json({ ok: true, weekly }) : json({ error: 'servico', message: `O serviço de notificações respondeu ${status || 'sem ligação'}.` }, 502);
}
/** Volta do relógio (de 15 em 15 min): envia as que chegaram à hora; tira as assinaturas caducadas. */
export async function runPush(env, nowMs = Date.now()) {
    if (!env.KV) return { sent: 0, gone: 0 };
    const idx = await pushIndex(env);
    const due = duePush(idx, nowMs).slice(0, PUSH_PER_RUN);
    if (!due.length) return { sent: 0, gone: 0 };
    const [keys, places] = await Promise.all([vapid(env), getPlaces(env)]);
    const analyses = new Map(), done = new Map(), gone = new Set();
    for (const e of due) {
        const status = await deliver(env, e, { keys, places, analyses, weekly: e.weekly, nowMs });
        if (status === 404 || status === 410) gone.add(e.id);
        else if (status >= 200 && status < 500) done.set(e.id, localParts(nowMs, e.tz).date); // 4xx não se resolve hoje: não insistir
    }
    if (done.size || gone.size) {
        await env.KV.put('push:index', JSON.stringify(idx.filter((e) => !gone.has(e.id)).map((e) => (done.has(e.id) ? { ...e, last: done.get(e.id) } : e))));
    }
    return { sent: [...done.keys()].length, gone: gone.size };
}

async function status(req, env, url) {
    const me = await who(req, env, url);
    if (me.error) return me.error;
    const [places, mode] = await Promise.all([getPlaces(env), getSettings(env).then(othersMode)]);
    return json({ version: VERSION, onDemand: onDemandFor(env, me, mode), places: places.filter((p) => !p.off && canSee(me, p)).length, schedule: SCHEDULE,
        device: !!me.id, ...(me.id ? { id: shortId(me.id), name: me.name || null } : {}), owner: me.owner, ...(me.code ? { ownerCode: me.code } : {}), others: mode, limit: me.owner ? null : GUEST_MAX });
}

// ---------- só o dono: painel "Utilização" e "Análise dos outros" ----------
const notOwner = () => json({ error: 'dono', message: 'Só para o dono da app.' }, 403);
async function listDevices(env) {
    const out = [];
    let cursor;
    do {
        const r = await env.KV.list({ prefix: 'dev:', ...(cursor ? { cursor } : {}) });
        for (const k of r.keys) out.push({ id: k.name.slice(4), s: k.metadata?.s || null, o: k.metadata?.o ? 1 : 0, n: k.metadata?.n || null });
        cursor = r.list_complete ? null : r.cursor;
    } while (cursor && out.length < 20000);
    return out;
}
// O nome que a pessoa quer mostrar ao dono (opcional; vazio apaga). Fica no registo do telemóvel e na metadata (n),
// que o painel "Utilização" lê de uma vez.
async function setMe(req, env, url) {
    if (!env.KV) return noKv();
    if (!trusted(req, env, url)) return notTrusted();
    const me = await who(req, env, url);
    if (me.error) return me.error;
    const b = await req.json().catch(() => null);
    const name = cleanName(b?.name);
    if (name === null) return bad('Nome inválido.');
    if (!name) return json({ error: 'sem_nome', message: 'O nome é obrigatório.' }, 400);
    // o registo do telemóvel: só com nome (o 1.º pedido que grava algo dele)
    if (!me.id && me.unknown) {
        const nowIso = new Date().toISOString(), day = lisbon().date;
        await env.KV.put('dev:' + me.unknown.id, JSON.stringify({ tokenHash: me.unknown.th, firstSeen: nowIso, lastSeen: nowIso, name, ...(me.owner ? { owner: true } : {}) }),
            { metadata: { s: day, o: me.owner ? 1 : 0, n: name }, expirationTtl: DEV_TTL });
        if (me.owner) await adoptPlaces(env, me.unknown.id);
        return json({ id: shortId(me.unknown.id), name, device: true });
    }
    if (!me.id) return noDevice('Atualiza a app: este telemóvel não tem identificação.');
    const key = 'dev:' + me.id, rec = await env.KV.get(key, 'json');
    if (!rec) return noDevice();
    const upd = { ...rec, name };
    const seen = Number.isFinite(Date.parse(rec.lastSeen)) ? lisbon(Date.parse(rec.lastSeen)).date : lisbon().date;
    await env.KV.put(key, JSON.stringify(upd), { metadata: { s: seen, o: rec.owner ? 1 : 0, n: name }, expirationTtl: DEV_TTL });
    return json({ id: shortId(me.id), name, device: true });
}
async function usage(req, env, url) {
    const me = await who(req, env, url);
    if (me.error) return me.error;
    if (!me.owner) return notOwner();
    if (!env.KV) return noKv();
    const today = lisbon().date, days = Array.from({ length: 7 }, (_, i) => addDays(today, -i));
    const [devices, places, mode, st, pidx] = await Promise.all([listDevices(env), getPlaces(env), getSettings(env).then(othersMode),
        Promise.all(days.map((d) => env.KV.get('stats:' + d, 'json'))), pushIndex(env)]);
    return json(usageSummary({ devices, places, others: mode, stats: Object.fromEntries(days.map((d, i) => [d, st[i]])), push: pidx.map((e) => e.id) }), 200);
}
async function settings(req, env, url) {
    const me = await who(req, env, url);
    if (me.error) return me.error;
    if (!me.owner) return notOwner();
    if (!env.KV) return noKv();
    const cur = await getSettings(env);
    if (req.method === 'GET') return json({ others: othersMode(cur), updatedAt: cur.updatedAt || null });
    if (!trusted(req, env, url)) return notTrusted();
    const b = await req.json().catch(() => null);
    if (!b || !Object.hasOwn(OTHERS, b.others)) return bad('Valor inválido: on, 1x ou off.');
    const next = { ...cur, others: b.others, updatedAt: new Date().toISOString() };
    await env.KV.put('settings', JSON.stringify(next));
    return json({ others: next.others, updatedAt: next.updatedAt });
}

// ---------- análise imediata pela API do Claude (opcional: precisa do segredo ANTHROPIC_API_KEY) ----------
async function refresh(req, env, url) {
    if (!env.ANTHROPIC_API_KEY) return json({ error: 'sem_chave', message: 'A análise imediata precisa de uma chave da API do Claude no Worker. As análises agendadas continuam a funcionar.' }, 503);
    if (!trusted(req, env, url)) return notTrusted();
    const me = await who(req, env, url);
    if (me.error) return me.error;
    if (!me.id && !me.owner) return noDevice();
    if (!me.owner && othersMode(await getSettings(env)) !== 'on') return json({ error: 'convidados_desligados', message: 'A análise imediata está, por agora, só disponível para o dono da app.' }, 403);
    const c = coords(url.searchParams);
    const b = await req.json().catch(() => null);
    const summary = typeof b?.summary === 'string' ? b.summary : '';
    if (!c || summary.length < 400 || summary.length > 60000) return bad('Resumo da previsão em falta ou demasiado grande.');
    const statsKey = 'stats:' + lisbon().date, cellKey = `rl:${c.lat.toFixed(2)},${c.lon.toFixed(2)}`;
    const [last, day] = await Promise.all([env.KV.get(cellKey), env.KV.get(statsKey, 'json')]);
    if (last) return json({ error: 'limite', message: 'Já há uma análise recente para este local (máx. 1 a cada 30 min).' }, 429);
    if (bumpStats(day).instant >= INSTANT_DAY_MAX) return json({ error: 'limite', message: `Limite diário de análises imediatas atingido (${INSTANT_DAY_MAX}).` }, 429);
    await env.KV.put(cellKey, '1', { expirationTtl: 1800 });

    // só conta como análise de um local se for um dos seus, para o mesmo ponto (≤ 2 km, como na app); senão fica à parte
    const place = nearestOf(me, (await getPlaces(env)).filter((p) => mine(me, p)), c.lat, c.lon, 2)?.p || null;
    const previous = place ? await env.KV.get('analysis:' + place.id, 'json') : null;
    const lessons = place ? (await env.KV.get('lessons:' + place.id, 'json')) || [] : [];
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    const model = env.CLAUDE_MODEL;
    let msg;
    try {
        msg = await client.beta.messages.create({
            model, max_tokens: 16000,
            betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default',
            output_config: { effort: 'high', format: { type: 'json_schema', schema: ANALYSIS_SCHEMA } },
            system: SYSTEM_PROMPT,
            messages: [{ role: 'user', content: [
                { type: 'text', text: 'Imagem 1: Meteosat MTG cor natural de perto (~280 km de largura, 100 píxeis ≈ 39 km, norte para cima, o ponto no centro exato).' },
                { type: 'image', source: { type: 'url', url: satUrl('geocolour', c.lat, c.lon, { km: 280 }) } },
                { type: 'text', text: 'Imagem 2: Meteosat MTG cor natural (~1200 km, o ponto no centro).' },
                { type: 'image', source: { type: 'url', url: satUrl('geocolour', c.lat, c.lon, { km: 1200 }) } },
                { type: 'text', text: 'Imagem 3: massas de ar RGB (~2500 km, o ponto ao centro): vermelho/laranja = ar seco de altitude e frentes, verde = massa de ar quente, azul/violeta = ar frio.' },
                { type: 'image', source: { type: 'url', url: satUrl('airmass', c.lat, c.lon, { km: 2500 }) } },
                { type: 'text', text: userPrompt(summary, { previous, lessons }) },
            ] }],
        });
    } catch (e) {
        if (e instanceof Anthropic.AuthenticationError) return json({ error: 'chave', message: 'A chave da API do Claude é inválida.' }, 502);
        if (e instanceof Anthropic.RateLimitError) return json({ error: 'limite', message: 'A API do Claude está ocupada; tenta daqui a pouco.' }, 429);
        if (e instanceof Anthropic.APIError) return json({ error: 'api', message: `Erro da API do Claude (${e.status}).` }, 502);
        throw e;
    }
    if (msg.stop_reason === 'refusal') return json({ error: 'recusa', message: 'O Claude não conseguiu fazer esta análise.' }, 502);
    const text = msg.content.filter((x) => x.type === 'text').map((x) => x.text).join('');
    let parsed;
    try { parsed = JSON.parse(text); } catch { return json({ error: 'formato', message: 'Resposta do Claude em formato inesperado.' }, 502); }
    const { value } = validateAnalysis(parsed);
    // place = o ponto analisado (as coordenadas do pedido), com o id e o nome do local quando é um dos seus
    const analysis = { ...value, generatedAt: new Date().toISOString(), by: 'claude-api', model: msg.model || model,
        place: place ? { id: place.id, name: place.name, lat: c.lat, lon: c.lon } : { id: null, name: typeof b?.name === 'string' ? b.name.slice(0, 40) : null, lat: c.lat, lon: c.lon } };
    if (place) {
        await env.KV.put('analysis:' + place.id, JSON.stringify(analysis));
        if (value.licoes.length) await env.KV.put('lessons:' + place.id, JSON.stringify(value.licoes));
    } else if (me.id) await env.KV.put(adhocKey(me.id), JSON.stringify(analysis), { expirationTtl: 86400 });
    // contador do dia (painel "Utilização"): lido de novo, a tarefa agendada pode ter contado entretanto
    await env.KV.put(statsKey, JSON.stringify(bumpStats(await env.KV.get(statsKey, 'json'), { kind: 'instant', guest: !me.owner })), { expirationTtl: STATS_TTL });
    return json({ analysis });
}
