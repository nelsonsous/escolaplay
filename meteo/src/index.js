// Worker "meteo": serve a PWA, faz de cache/proxy das fontes sem CORS, guarda locais e análises do Claude (KV).
// Plano gratuito (10 ms de CPU por pedido): aqui não se faz cálculo pesado — o motor corre no telemóvel.
import Anthropic from '@anthropic-ai/sdk';
import { OM, FIRMS, FOGOS_URL, SAT_LAYERS, satUrl, satBbox, metarBboxUrl, metarHistoryUrl } from '../public/lib/sources.js';
import { ANALYSIS_SCHEMA, SYSTEM_PROMPT, userPrompt, validateAnalysis } from '../public/lib/analysis.js';
import { FILES, BUILD } from './static.gen.js';

const VERSION = '1.0.0';
const SCHEDULE = ['07:34', '13:34', '20:34'];
const UA = 'meteo-preciso/1.0 (app pessoal; Cloudflare Worker)';
const MAX_PLACES = 5;
const OM_TTL = { forecast: 900, ensemble: 3600, previous: 3600, archive: 2592000, elevation: 2592000, geocoding: 86400 };

export default {
    async fetch(req, env, ctx) {
        const url = new URL(req.url);
        if (!url.pathname.startsWith('/api/')) return serveStatic(req, url);
        try {
            return await route(req, env, ctx, url);
        } catch (e) {
            console.error(e);
            return json({ error: 'interno', message: 'Erro interno do servidor.' }, 500);
        }
    },
};

async function route(req, env, ctx, url) {
    const p = url.pathname, m = req.method;
    const q = url.searchParams;
    if (m === 'GET' && p === '/api/status') {
        const places = await getPlaces(env);
        return json({ version: VERSION, onDemand: !!env.ANTHROPIC_API_KEY, places: places.length, schedule: SCHEDULE });
    }
    // --- fontes (passagem com cache; o Worker não interpreta os dados) ---
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
    // --- análises e locais ---
    if (m === 'GET' && p === '/api/analysis') {
        const c = coords(q);
        if (!c) return bad('coordenadas inválidas');
        return json(await findAnalysis(env, c.lat, c.lon), 200, { 'cache-control': 'no-store' });
    }
    if (m === 'POST' && p === '/api/analysis/refresh') return refresh(req, env, url);
    if (p === '/api/places') {
        if (m === 'GET') return json(await getPlaces(env), 200, { 'cache-control': 'no-store' });
        if (m === 'POST') return addPlace(req, env, url);
    }
    if (m === 'DELETE' && p.startsWith('/api/places/')) return deletePlace(req, env, url, decodeURIComponent(p.slice('/api/places/'.length)));
    return json({ error: 'nao_encontrado', message: 'Pedido desconhecido.' }, 404);
}

// ---------- ficheiros da PWA (embutidos no Worker) ----------
const decoded = new Map();
function serveStatic(req, url) {
    if (req.method !== 'GET' && req.method !== 'HEAD') return new Response('Método não permitido', { status: 405 });
    let p = url.pathname;
    if (p.endsWith('/')) p += 'index.html';
    const f = FILES[p];
    if (!f) return new Response('Não encontrado', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
    const etag = `"${f.e}"`;
    // index, service worker e manifesto revalidam sempre; o resto fica 1 h em cache (o sw.js trata das versões)
    const fresh = p === '/index.html' || p === '/sw.js' || p.endsWith('.webmanifest');
    const headers = { 'content-type': f.t, etag, 'cache-control': fresh ? 'no-cache' : 'public, max-age=3600', 'x-build': BUILD,
        'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin' };
    if (req.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers });
    let body = f.d;
    if (f.b) {
        if (!decoded.has(p)) decoded.set(p, Uint8Array.from(atob(f.d), (c) => c.charCodeAt(0)));
        body = decoded.get(p);
    }
    return new Response(req.method === 'HEAD' ? null : body, { headers });
}

// ---------- utilitários ----------
function json(body, status = 200, headers = {}) {
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });
}
const bad = (message) => json({ error: 'pedido_invalido', message }, 400);
function coords(q) {
    const lat = Number(q.get('lat')), lon = Number(q.get('lon'));
    return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? { lat, lon } : null;
}
function clampInt(v, a, b, d) { const n = parseInt(v, 10); return Number.isFinite(n) ? Math.min(b, Math.max(a, n)) : d; }
function distKm(a, b, c, d) {
    const t = Math.PI / 180, x = Math.sin(((c - a) * t) / 2) ** 2 + Math.cos(a * t) * Math.cos(c * t) * Math.sin(((d - b) * t) / 2) ** 2;
    return 12742 * Math.asin(Math.sqrt(x));
}
const sameOrigin = (req, url) => req.headers.get('origin') === url.origin;

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

// ---------- locais ----------
async function getPlaces(env) { return (env.KV && (await env.KV.get('places', 'json'))) || []; }
const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'local';

async function addPlace(req, env, url) {
    if (!env.KV) return json({ error: 'kv', message: 'Base de dados por configurar.' }, 501);
    if (!sameOrigin(req, url)) return json({ error: 'origem', message: 'Pedido não autorizado.' }, 403);
    const b = await req.json().catch(() => null);
    const lat = Number(b?.lat), lon = Number(b?.lon), name = String(b?.name || '').trim().slice(0, 40);
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return bad('Dados do local inválidos.');
    const places = await getPlaces(env);
    const dup = places.find((x) => distKm(x.lat, x.lon, lat, lon) < 0.5);
    if (dup) return json(dup, 200);
    if (places.length >= MAX_PLACES) return json({ error: 'limite', message: `Máximo de ${MAX_PLACES} locais com análise diária. Remove um primeiro.` }, 409);
    let id = slug(name);
    while (places.some((x) => x.id === id)) id = `${slug(name).slice(0, 20)}-${Math.random().toString(36).slice(2, 5)}`;
    const place = { id, name, lat: Math.round(lat * 1e4) / 1e4, lon: Math.round(lon * 1e4) / 1e4, createdAt: new Date().toISOString() };
    await env.KV.put('places', JSON.stringify([...places, place]));
    return json(place, 201);
}

async function deletePlace(req, env, url, id) {
    if (!env.KV) return json({ error: 'kv', message: 'Base de dados por configurar.' }, 501);
    if (!sameOrigin(req, url)) return json({ error: 'origem', message: 'Pedido não autorizado.' }, 403);
    const places = await getPlaces(env);
    if (!places.some((x) => x.id === id)) return json({ error: 'nao_encontrado', message: 'Local não encontrado.' }, 404);
    await env.KV.put('places', JSON.stringify(places.filter((x) => x.id !== id)));
    await env.KV.delete('analysis:' + id);
    return new Response(null, { status: 204 });
}

const adhocKey = (lat, lon) => `analysis:@${lat.toFixed(2)},${lon.toFixed(2)}`;

async function findAnalysis(env, lat, lon) {
    const places = await getPlaces(env);
    const near = places.map((x) => ({ ...x, distanceKm: Math.round(distKm(lat, lon, x.lat, x.lon) * 10) / 10 })).filter((x) => x.distanceKm <= 10).sort((a, b) => a.distanceKm - b.distanceKm)[0] || null;
    let analysis = near && env.KV ? await env.KV.get('analysis:' + near.id, 'json') : null;
    if (!analysis && env.KV) analysis = await env.KV.get(adhocKey(lat, lon), 'json');
    const ageMin = analysis?.generatedAt ? Math.round((Date.now() - Date.parse(analysis.generatedAt)) / 6e4) : null;
    return { analysis: analysis || null, place: near, ageMin, schedule: SCHEDULE, onDemand: !!env.ANTHROPIC_API_KEY };
}

// ---------- análise imediata pela API do Claude (opcional: precisa do segredo ANTHROPIC_API_KEY) ----------
async function refresh(req, env, url) {
    if (!env.ANTHROPIC_API_KEY) return json({ error: 'sem_chave', message: 'A análise imediata precisa de uma chave da API do Claude no Worker. As análises agendadas continuam a funcionar.' }, 503);
    if (!sameOrigin(req, url)) return json({ error: 'origem', message: 'Pedido não autorizado.' }, 403);
    const c = coords(url.searchParams);
    const b = await req.json().catch(() => null);
    const summary = typeof b?.summary === 'string' ? b.summary : '';
    if (!c || summary.length < 400 || summary.length > 60000) return bad('Resumo da previsão em falta ou demasiado grande.');
    const day = new Date().toISOString().slice(0, 10);
    const cellKey = `rl:${c.lat.toFixed(2)},${c.lon.toFixed(2)}`, dayKey = `rl:day:${day}`;
    const [last, count] = await Promise.all([env.KV.get(cellKey), env.KV.get(dayKey)]);
    if (last) return json({ error: 'limite', message: 'Já há uma análise recente para este local (máx. 1 a cada 30 min).' }, 429);
    if (Number(count || 0) >= 20) return json({ error: 'limite', message: 'Limite diário de análises imediatas atingido (20).' }, 429);
    await Promise.all([env.KV.put(cellKey, '1', { expirationTtl: 1800 }), env.KV.put(dayKey, String(Number(count || 0) + 1), { expirationTtl: 172800 })]);

    const places = await getPlaces(env);
    const place = places.find((x) => distKm(c.lat, c.lon, x.lat, x.lon) <= 10) || null;
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
                { type: 'text', text: 'Imagem 1: Meteosat MTG cor natural (~1200 km, o local está no centro).' },
                { type: 'image', source: { type: 'url', url: satUrl('geocolour', c.lat, c.lon, { km: 1200 }) } },
                { type: 'text', text: 'Imagem 2: massas de ar RGB (~2500 km, local ao centro): vermelho/laranja = ar seco de altitude e frentes, verde = massa de ar quente, azul/violeta = ar frio.' },
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
    const analysis = { ...value, generatedAt: new Date().toISOString(), by: 'claude-api', model: msg.model || model,
        place: place ? { id: place.id, name: place.name, lat: place.lat, lon: place.lon } : { id: null, name: typeof b?.name === 'string' ? b.name.slice(0, 40) : null, lat: c.lat, lon: c.lon } };
    if (place) {
        await env.KV.put('analysis:' + place.id, JSON.stringify(analysis));
        if (value.licoes.length) await env.KV.put('lessons:' + place.id, JSON.stringify(value.licoes));
    } else await env.KV.put(adhocKey(c.lat, c.lon), JSON.stringify(analysis), { expirationTtl: 86400 });
    return json({ analysis });
}
