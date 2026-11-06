// Recolha de dados para um local e cálculo da previsão (browser e Node).
// Open-Meteo, IPMA e Nominatim são chamados diretamente (CORS aberto); METAR, FIRMS e fogos.pt passam pelo Worker.
import { omQueries, climateQueries, OM, IPMA, inPortugal, inEuropeFirms } from './sources.js';
import { buildForecast, buildSummary, perModelTable, pickStation } from './engine.js';
import { haversine } from './stats.js';

const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
const isMock = () => isBrowser && new URLSearchParams(location.search).has('mock');

// Conector de dados (Cloudflare Worker), como na app Mercados: muda-se nos Ajustes ou com ?proxy=URL
export const DEFAULT_PROXY = 'https://meteo.mercados-proxy.workers.dev';
let PROXY = DEFAULT_PROXY;
export function setProxy(url) { PROXY = String(url || '').trim().replace(/\/+$/, '') || DEFAULT_PROXY; return PROXY; }
export const getProxy = () => PROXY;

// ---------- cache simples (localStorage no browser, memória no Node) ----------
const mem = new Map();
function cacheGet(key, maxAgeMs) {
    try {
        const s = isBrowser ? localStorage.getItem('mc:' + key) : mem.get(key);
        if (!s) return null;
        const { t, v } = JSON.parse(s);
        return Date.now() - t <= maxAgeMs ? v : null;
    } catch { return null; }
}
function cacheSet(key, v) {
    try {
        const s = JSON.stringify({ t: Date.now(), v });
        if (isBrowser) localStorage.setItem('mc:' + key, s); else mem.set(key, s);
    } catch { /* quota cheia: ignora */ }
}
async function cached(key, maxAgeMs, fn) {
    const hit = cacheGet(key, maxAgeMs);
    if (hit != null) return hit;
    const v = await fn();
    if (v != null) cacheSet(key, v);
    return v;
}

// ---------- pedidos ----------
async function request(url, { timeout = 15000, as = 'json', headers } = {}) {
    const ctl = new AbortController();
    const id = setTimeout(() => ctl.abort(), timeout);
    try {
        const r = await fetch(url, { signal: ctl.signal, headers });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        if (as === 'text') return await r.text();
        const j = await r.json();
        if (j && j.error === true) throw new Error(j.reason || 'erro da fonte');
        return j;
    } catch (e) {
        throw new Error(e.name === 'AbortError' ? 'tempo esgotado' : e.message);
    } finally { clearTimeout(id); }
}

// Open-Meteo: direto (IP de quem usa a app) e, se falhar, pelo Worker (e vice-versa no Node)
function om(api, query, ctx, timeout = 15000) {
    const direct = `${OM[api]}?${query}`, proxy = `${ctx.base}/api/raw/om/${api}?${query}`;
    const [a, b] = ctx.preferProxy ? [proxy, direct] : [direct, proxy];
    return request(a, { timeout }).catch(() => request(b, { timeout }));
}

const settle = async (p) => { try { return { ok: true, v: await p }; } catch (e) { return { ok: false, e }; } };
const cell = (x, d = 2) => Number(x).toFixed(d);
const isoWeek = (d = new Date()) => { const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day); const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return `${t.getUTCFullYear()}-${Math.ceil(((t - y0) / 864e5 + 1) / 7)}`; };

export async function reverseGeocode(lat, lon) {
    return cached(`rev:${cell(lat)},${cell(lon)}`, 30 * 864e5, async () => {
        const u = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=jsonv2&zoom=14&accept-language=pt`;
        const j = await request(u, { timeout: 8000, headers: isBrowser ? undefined : { 'user-agent': 'meteo-preciso/1.0 (app pessoal)' } });
        const a = j?.address || {};
        return { name: a.village || a.town || a.city || a.suburb || a.hamlet || a.municipality || j?.name || null,
            municipality: a.municipality || a.city || a.town || a.county || null,
            region: a.state_district || a.county || a.state || null, country: (a.country_code || '').toUpperCase() || null };
    });
}

async function climate(lat, lon, ctx) {
    return cached(`clim:${cell(lat, 2)},${cell(lon, 2)}:${isoWeek()}`, 8 * 864e5, async () => {
        const qs = climateQueries(lat, lon);
        const res = await Promise.all(qs.map((q) => om('archive', q, ctx, 12000).catch(() => null)));
        const ok = res.filter((j) => j?.daily?.time).map((j) => ({ daily: { time: j.daily.time, temperature_2m_max: j.daily.temperature_2m_max, temperature_2m_min: j.daily.temperature_2m_min } }));
        return ok.length >= 6 ? ok : null;
    });
}

async function elevation(lat, lon, ctx) {
    return cached(`elev:${cell(lat, 4)},${cell(lon, 4)}`, 365 * 864e5, async () => {
        const j = await om('elevation', `latitude=${lat}&longitude=${lon}`, ctx, 8000);
        return Array.isArray(j?.elevation) ? j.elevation[0] : null;
    });
}

/**
 * Previsão completa para um local (formato em docs/API.md, "GET /api/forecast").
 * @param {{lat:number, lon:number, name?:string, base?:string, preferProxy?:boolean, withRaw?:boolean, now?:number|string}} o
 */
export async function loadForecast(o = {}) {
    const lat = Number(o.lat), lon = Number(o.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new Error('Coordenadas inválidas.');
    if (isMock()) {
        const q = new URLSearchParams({ lat, lon, ...(o.name ? { name: o.name } : {}) });
        const r = await fetch(new URL('api/forecast?' + q, location.href));
        if (!r.ok) throw new Error('Não foi possível obter a previsão (mock).');
        return r.json();
    }
    const ctx = { base: o.base ?? PROXY, preferProxy: !!o.preferProxy };
    const pt = inPortugal(lat, lon), eu = inEuropeFirms(lat, lon);
    const q = omQueries(lat, lon);
    const B = ctx.base;
    const T = {
        det: settle(om('forecast', q.forecast, ctx, 20000)),
        ens: settle(om('ensemble', q.ensemble, ctx, 20000)),
        prev: settle(om('previous', q.previous, ctx)),
        metar: settle(request(`${B}/api/raw/metar?lat=${lat}&lon=${lon}`, { timeout: 10000 })),
        place: settle(reverseGeocode(lat, lon)),
        clim: settle(climate(lat, lon, ctx)),
        ...(pt ? {
            stations: settle(cached('ipma:stations', 864e5, () => request(IPMA.stations))),
            obs: settle(request(IPMA.obs, { timeout: 20000 })),
            warnings: settle(request(IPMA.warnings)),
            rcm0: settle(cached(`ipma:rcm0:${new Date().toISOString().slice(0, 13)}`, 36e5, () => request(IPMA.rcm0))),
            rcm1: settle(cached(`ipma:rcm1:${new Date().toISOString().slice(0, 13)}`, 36e5, () => request(IPMA.rcm1))),
            districts: settle(cached('ipma:districts', 7 * 864e5, () => request(IPMA.districts))),
            fogos: settle(request(`${B}/api/raw/fogos`, { timeout: 10000 })),
        } : {}),
        ...(eu ? { firms: settle(Promise.all(['n20', 'n21', 'snpp', 'modis'].map((k) => request(`${B}/api/raw/firms?sat=${k}`, { as: 'text', timeout: 15000 }).then((t) => [k, t]).catch(() => [k, null])))) } : {}),
    };
    const R = {};
    for (const [k, p] of Object.entries(T)) R[k] = await p;
    const v = (k) => (R[k]?.ok ? R[k].v : null);
    if (!v('det')) throw new Error('Não foi possível obter os modelos meteorológicos. Tenta de novo daqui a pouco.');

    const nowMs = o.now ? new Date(o.now).getTime() : Date.now();
    const ipma = pt ? { stations: v('stations'), obs: v('obs'), warnings: v('warnings'), rcm0: v('rcm0'), rcm1: v('rcm1'), districts: v('districts') } : null;
    const station = pickStation({ ipmaStations: ipma?.stations, ipmaObs: ipma?.obs, metar: v('metar'), lat, lon, nowMs });
    // segunda fase: altitude da estação, histórico METAR (7 dias) e histórico IPMA guardado
    const metarList = Array.isArray(v('metar')) ? v('metar') : [];
    const metarNear = metarList.map((m) => ({ id: m.icaoId, d: haversine(lat, lon, m.lat, m.lon) })).filter((m) => m.d <= 20).sort((a, b) => a.d - b.d)[0];
    const [stElev, mh, oh] = await Promise.all([
        settle(station && station.source === 'IPMA' ? elevation(station.lat, station.lon, ctx) : null),
        settle(metarNear ? cached(`metarh:${metarNear.id}:${new Date().toISOString().slice(0, 13)}`, 36e5, () => request(`${B}/api/raw/metar-history?id=${metarNear.id}`, { timeout: 12000 })) : null),
        settle(station && station.source === 'IPMA' ? request(`${B}/api/obs-history?station=${station.id}`, { timeout: 6000 }) : null),
    ]);
    const raw = {
        det: v('det'), ens: v('ens'), prev: v('prev'), ipma, metar: metarList, metarHistory: mh.ok ? mh.v : null,
        obsHistory: oh.ok && Array.isArray(oh.v) ? oh.v : null, station, stationElev: stElev.ok ? stElev.v : null,
        firms: R.firms?.ok ? Object.fromEntries(R.firms.v.filter(([, t]) => t)) : null, fogos: v('fogos'),
        place: v('place'), clim: v('clim'),
    };
    const fc = buildForecast(raw, { lat, lon, name: o.name, now: nowMs });
    fc.status = Object.fromEntries(Object.entries(R).map(([k, r]) => [k, r.ok ? 'ok' : (r.e?.message || 'falhou')]));
    return o.withRaw ? { fc, raw } : fc;
}

// Pede uma análise imediata ao Claude (só funciona se o Worker tiver chave da API)
export async function requestAnalysis(fc, { base = PROXY, det } = {}) {
    const summary = buildSummary(fc, det ? { perModel: perModelTable(det) } : {});
    const r = await fetch(`${base}/api/analysis/refresh?lat=${fc.location.lat}&lon=${fc.location.lon}`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ summary, name: fc.location.name }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.message || 'A análise imediata não está disponível.');
    return j.analysis;
}

export { buildSummary, perModelTable };
