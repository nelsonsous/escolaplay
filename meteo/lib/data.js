// Recolha de dados para um local e cálculo da previsão (browser e Node).
// Open-Meteo, IPMA e Nominatim são chamados diretamente (CORS aberto); METAR, FIRMS e fogos.pt passam pelo Worker.
import { omQueries, climateQueries, OM, IPMA, ipmaAggregateUrl, inPortugal, inEuropeFirms } from './sources.js';
import { buildForecast, buildSummary, perModelTable, pickStation, nearStations, nearestIpmaLocal, terrainPoints } from './engine.js';
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
// HTTP 429 (limite por minuto do Open-Meteo, também devolvido pelo conector): tenta de novo ao fim de ~1,5 s e ~4 s
export const RETRY_429_MS = [1500, 4000];
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
async function request(url, { timeout = 15000, as = 'json', headers, retries = RETRY_429_MS } = {}) {
    for (let attempt = 0; ; attempt++) {
        const ctl = new AbortController();
        const id = setTimeout(() => ctl.abort(), timeout);
        let status = 0;
        try {
            const r = await fetch(url, { signal: ctl.signal, headers });
            status = r.status;
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            if (as === 'text') return await r.text();
            const j = await r.json();
            if (j && j.error === true) throw new Error(j.reason || 'erro da fonte');
            return j;
        } catch (e) {
            if (status === 429 && attempt < retries.length) { await sleep(retries[attempt]); continue; }
            throw new Error(e.name === 'AbortError' ? 'tempo esgotado' : e.message);
        } finally { clearTimeout(id); }
    }
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

// Altitude de várias estações num só pedido (guardada 1 ano por ponto). points: [{ id, lat, lon }] → { id: metros }
async function elevations(points, ctx) {
    const out = {}, miss = [];
    const key = (p) => `elev:${cell(p.lat, 4)},${cell(p.lon, 4)}`;
    for (const p of points) { const v = cacheGet(key(p), 365 * 864e5); if (v != null) out[p.id] = v; else miss.push(p); }
    for (let i = 0; i < miss.length; i += 90) {
        const part = miss.slice(i, i + 90);
        const j = await om('elevation', `latitude=${part.map((p) => cell(p.lat, 4)).join(',')}&longitude=${part.map((p) => cell(p.lon, 4)).join(',')}`, ctx, 10000);
        const e = Array.isArray(j?.elevation) && j.elevation.length === part.length ? j.elevation : null;
        if (!e) throw new Error('altitudes em falta');
        part.forEach((p, k) => { if (Number.isFinite(e[k])) { out[p.id] = e[k]; cacheSet(key(p), e[k]); } });
    }
    return out;
}

// Relevo à volta do ponto: altitudes do ponto e de 24 pontos à volta (1,5 e 4 km) num só pedido, guardadas para sempre
// (o terreno não muda). A chave tem a versão da geometria (engine.TERRAIN): mudar os anéis = pedir de novo.
export async function pointTerrain(lat, lon, ctx = { base: PROXY, preferProxy: false }) {
    const key = `terrain:v1:${cell(lat, 4)},${cell(lon, 4)}`;
    const hit = cacheGet(key, Infinity);
    if (hit) return hit;
    const pts = terrainPoints(lat, lon);
    const j = await om('elevation', `latitude=${pts.map((p) => cell(p[0], 4)).join(',')}&longitude=${pts.map((p) => cell(p[1], 4)).join(',')}`, ctx, 10000);
    const e = Array.isArray(j?.elevation) && j.elevation.length === pts.length && j.elevation.every(Number.isFinite) ? j.elevation : null;
    if (!e) throw new Error('altitudes à volta em falta');
    const v = { elevation: e };
    cacheSet(key, v);
    return v;
}

// Previsão oficial do IPMA: concelho mais próximo (lista guardada 7 dias) e a sua previsão (30 min)
async function ipmaOfficial(lat, lon) {
    const locs = await cached('ipma:locations', 7 * 864e5, async () => {
        const j = await request(IPMA.locations, { timeout: 12000 });
        return Array.isArray(j) ? j.map((x) => ({ globalIdLocal: x.globalIdLocal, local: x.local, latitude: x.latitude, longitude: x.longitude, idAreaAviso: x.idAreaAviso, idDistrito: x.idDistrito })) : null;
    });
    const local = nearestIpmaLocal(locs, lat, lon);
    if (!local) return { local: null, data: null, reason: 'sem concelho do IPMA a menos de 15 km' };
    const data = await cached(`ipma:agg:${local.id}`, 30 * 60e3, () => request(ipmaAggregateUrl(local.id), { timeout: 12000 }));
    if (!Array.isArray(data) || !data.length) throw new Error('previsão do IPMA vazia');
    return { local, data };
}

/**
 * Previsão completa para um local (formato em docs/API.md, "Previsão").
 * ipmaPrev (opcional, tarefa agendada): previsões do IPMA de há ~1 dia { times, temp } para a verificação local.
 * O relevo à volta do ponto (pointTerrain) dá location.terrain e o efeito local (fc.local).
 * @param {{lat:number, lon:number, name?:string, base?:string, preferProxy?:boolean, withRaw?:boolean, now?:number|string, ipmaPrev?:object}} o
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
        terrain: settle(pointTerrain(lat, lon, ctx)),
        ...(pt ? {
            stations: settle(cached('ipma:stations', 864e5, () => request(IPMA.stations))),
            obs: settle(request(IPMA.obs, { timeout: 20000 })),
            warnings: settle(request(IPMA.warnings)),
            rcm0: settle(cached(`ipma:rcm0:${new Date().toISOString().slice(0, 13)}`, 36e5, () => request(IPMA.rcm0))),
            rcm1: settle(cached(`ipma:rcm1:${new Date().toISOString().slice(0, 13)}`, 36e5, () => request(IPMA.rcm1))),
            districts: settle(cached('ipma:districts', 7 * 864e5, () => request(IPMA.districts))),
            fogos: settle(request(`${B}/api/raw/fogos`, { timeout: 10000 })),
            ipmaFc: settle(ipmaOfficial(lat, lon)),
        } : {}),
        ...(eu ? { firms: settle(Promise.all(['n20', 'n21', 'snpp', 'modis'].map((k) => request(`${B}/api/raw/firms?sat=${k}`, { as: 'text', timeout: 15000 }).then((t) => [k, t]).catch(() => [k, null])))) } : {}),
    };
    const nowMs = o.now ? new Date(o.now).getTime() : Date.now();
    // segunda fase, logo que haja estações e observações: altitudes de todas as estações perto (um só pedido),
    // histórico guardado das estações IPMA e 7 dias do METAR mais próximo (até 30 km), para a verificação local
    const phase2 = (async () => {
        const [s, ob, me] = await Promise.all([T.stations || null, T.obs || null, T.metar]);
        const none = { station: null, el: { ok: true, v: {} }, mh: { ok: false }, hist: {}, histIds: [], hs: [] };
        try {
            const ipmaStations = s?.ok ? s.v : null, ipmaObs = ob?.ok ? ob.v : null, metar = me?.ok && Array.isArray(me.v) ? me.v : [];
            const cands = nearStations({ ipmaStations, ipmaObs, metar, lat, lon, nowMs });
            const station = pickStation({ ipmaStations, ipmaObs, metar, lat, lon, nowMs });
            const ipmaC = cands.filter((c) => c.source === 'IPMA');
            if (station?.source === 'IPMA' && !ipmaC.some((c) => c.id === station.id)) ipmaC.push(station);
            const histIds = ipmaC.slice(0, 6).map((c) => c.id);
            if (station?.source === 'IPMA' && !histIds.includes(station.id)) histIds.push(station.id);
            const metarNear = metar.map((m) => ({ id: m.icaoId, d: haversine(lat, lon, m.lat, m.lon) })).filter((m) => m.id && m.d <= 30).sort((a, b) => a.d - b.d)[0];
            const [el, mh, ...hs] = await Promise.all([
                settle(ipmaC.length ? elevations(ipmaC.map((c) => ({ id: c.id, lat: c.lat, lon: c.lon })), ctx) : {}),
                settle(metarNear ? cached(`metarh:${metarNear.id}:${new Date().toISOString().slice(0, 13)}`, 36e5, () => request(`${B}/api/raw/metar-history?id=${metarNear.id}`, { timeout: 12000 })) : null),
                ...histIds.map((id) => settle(request(`${B}/api/obs-history?station=${id}`, { timeout: 6000 }))),
            ]);
            const hist = Object.fromEntries(histIds.map((id, i) => [id, hs[i].ok && Array.isArray(hs[i].v) ? hs[i].v : null]).filter(([, x]) => x?.length));
            return { station, el, mh, hist, histIds, hs };
        } catch (e) { return { ...none, el: { ok: false, e } }; }
    })();
    const R = {};
    for (const [k, p] of Object.entries(T)) R[k] = await p;
    const v = (k) => (R[k]?.ok ? R[k].v : null);
    if (!v('det')) throw new Error('Não foi possível obter os modelos meteorológicos. Tenta de novo daqui a pouco.');
    const p2 = await phase2;

    const metarList = Array.isArray(v('metar')) ? v('metar') : [];
    const ofc = v('ipmaFc');
    const ipma = pt ? { stations: v('stations'), obs: v('obs'), warnings: v('warnings'), rcm0: v('rcm0'), rcm1: v('rcm1'), districts: v('districts'),
        forecast: ofc?.local && ofc.data ? ofc : null } : null;
    const elevs = p2.el.ok ? p2.el.v || {} : {};
    const station = p2.station;
    const raw = {
        det: v('det'), ens: v('ens'), prev: v('prev'), ipma, metar: metarList, metarHistory: p2.mh.ok ? p2.mh.v : null,
        obsHistory: station && p2.hist[station.id] ? p2.hist[station.id] : null, obsHistories: p2.hist, station,
        stationElev: station ? elevs[station.id] ?? null : null, stationElevs: elevs, ipmaPrev: o.ipmaPrev || null,
        firms: R.firms?.ok ? Object.fromEntries(R.firms.v.filter(([, t]) => t)) : null, fogos: v('fogos'),
        place: v('place'), clim: v('clim'), terrain: v('terrain'),
    };
    const fc = buildForecast(raw, { lat, lon, name: o.name, now: nowMs });
    const status = Object.fromEntries(Object.entries(R).map(([k, r]) => [k, r.ok ? 'ok' : (r.e?.message || 'falhou')]));
    if (status.ipmaFc === 'ok' && !ipma?.forecast) status.ipmaFc = ofc?.reason || 'sem previsão';
    if (pt || metarList.length) {
        status.elev = p2.el.ok ? 'ok' : (p2.el.e?.message || 'falhou');
        status.obsHist = p2.histIds.length ? (p2.hs.some((h) => h.ok) ? 'ok' : (p2.hs[0]?.e?.message || 'falhou')) : 'sem estações IPMA perto';
    }
    fc.status = status;
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
