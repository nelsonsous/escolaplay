// Recolha de dados para um local e cálculo da previsão (browser e Node).
// Open-Meteo, IPMA, Nominatim e o radar (RainViewer) são chamados diretamente (CORS aberto); METAR, FIRMS e fogos.pt
// passam pelo Worker.
import { omQueries, climateQueries, OM, IPMA, ipmaAggregateUrl, inPortugal, inEuropeFirms } from './sources.js';
import { buildForecast, buildSummary, perModelTable, pickStation, nearStations, nearestIpmaLocal, terrainPoints, ipmaObsLatest, ipmaByPosition } from './engine.js';
import { RAINVIEWER, radarFrames, radarTileUrl, coverageUrl, tileGeo, decodeFrame, coveredAt } from './radar.js';
import { decodePng } from './png.js';
import { marineSummary } from './marine.js';
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
// Arrumar a cache ao abrir a app: o localStorage tem ~5 MB para o endereço todo (a Meteo, a Música e a Mercados estão no
// mesmo) e, cheio, a última previsão deixa de caber e a app abre sem nada à espera da rede. Até à 1.20 o risco de
// incêndio ficava numa chave nova por hora (~50 KB cada) que nunca se apagava.
const CACHE_MAX = [[/^ipma:rcm[01]:/, 0], [/^ipma:(rcm|agg|stations)/, 864e5], [/^clim:/, 8 * 864e5], [/^(ipma:locations|ipma:districts|rvcov:)/, 7 * 864e5], [/^rev:/, 30 * 864e5]];
const CACHE_DEFAULT = 31 * 864e5;
/** As chaves da cache (sem o "mc:") a apagar: as de nome antigo e as mais velhas do que valem. entries = [chave, início do valor]. */
export function staleCacheKeys(entries, now = Date.now()) {
    return entries.filter(([key, head]) => {
        const rule = CACHE_MAX.find(([re]) => re.test(key));
        const max = rule ? rule[1] : CACHE_DEFAULT;
        if (max === 0) return true;
        const t = Number((/^\{"t":(\d+)/.exec(head || '') || [])[1]);
        return !Number.isFinite(t) || now - t > max;
    }).map(([key]) => key);
}
/** Apaga do localStorage a cache velha (lê só o início de cada valor); devolve quantas chaves e caracteres saíram. */
export function tidyCache(now = Date.now()) {
    if (!isBrowser) return { removed: 0, chars: 0 };
    try {
        const entries = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k?.startsWith('mc:')) entries.push([k.slice(3), (localStorage.getItem(k) || '').slice(0, 32), k]);
        }
        let chars = 0;
        const stale = new Set(staleCacheKeys(entries, now));
        for (const [key, , k] of entries) if (stale.has(key)) { chars += (localStorage.getItem(k) || '').length; localStorage.removeItem(k); }
        return { removed: stale.size, chars };
    } catch { return { removed: 0, chars: 0 }; }
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

const FOGOS_OFF = 'meteo:fogos-off';
const fogosPaused = () => { try { return Date.now() < Number(globalThis.localStorage?.getItem(FOGOS_OFF) || 0); } catch { return false; } };
const pauseFogos = () => { try { globalThis.localStorage?.setItem(FOGOS_OFF, String(Date.now() + 12 * 36e5)); } catch { /* sem armazenamento */ } };
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

// ---------- radar no ponto (RainViewer) ----------
let mapsMemo = null;
/** Lista das imagens de radar (weather-maps.json: as últimas 2 h, de 10 em 10 min), guardada 1 min em memória. */
export async function radarMaps() {
    if (mapsMemo && Date.now() - mapsMemo.t < 60e3) return mapsMemo.v;
    const v = await request(RAINVIEWER.maps, { timeout: 8000, retries: [] });
    mapsMemo = { t: Date.now(), v };
    return v;
}
// Píxeis RGBA de uma imagem. No browser: canvas (crossOrigin anónimo; o RainViewer responde com CORS aberto).
// No Node, ou se o canvas falhar ou mexer nas cores: o descodificador PNG (lib/png.js), sobre o ficheiro original.
function canvasPixels(url, timeout = 12000) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const t = setTimeout(() => { img.src = ''; reject(new Error('tempo esgotado')); }, timeout);
        img.crossOrigin = 'anonymous';
        img.decoding = 'async';
        img.onload = () => {
            clearTimeout(t);
            try {
                const c = document.createElement('canvas');
                c.width = img.naturalWidth; c.height = img.naturalHeight;
                const g = c.getContext('2d', { willReadFrequently: true });
                g.drawImage(img, 0, 0);
                resolve({ width: c.width, height: c.height, data: g.getImageData(0, 0, c.width, c.height).data });
            } catch (e) { reject(e); }
        };
        img.onerror = () => { clearTimeout(t); reject(new Error('imagem do radar indisponível')); };
        img.src = url;
    });
}
async function pngPixels(url, timeout = 12000) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeout);
    try {
        const r = await fetch(url, { signal: ctl.signal });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return await decodePng(new Uint8Array(await r.arrayBuffer()));
    } catch (e) {
        throw new Error(e.name === 'AbortError' ? 'tempo esgotado' : e.message);
    } finally { clearTimeout(t); }
}
const pixels = (url) => (isBrowser ? canvasPixels(url).catch(() => pngPixels(url)) : pngPixels(url));
async function radarFrame(url) {
    if (isBrowser) {
        try {
            const f = decodeFrame((await canvasPixels(url)).data);
            // cores fora da tabela (proteção contra impressões digitais do browser, perfis de cor): lê o PNG original
            if (f.unknown <= Math.max(20, f.echoes * 0.02)) return f;
        } catch { /* tenta o PNG */ }
    }
    return decodeFrame((await pngPixels(url)).data);
}
/** Imagens de radar das últimas 2 h centradas no ponto (z7, ~0,92 km por píxel) para o motor (raw.radar). A cobertura
 *  do radar no ponto fica guardada 7 dias. */
export async function loadRadar(lat, lon) {
    const { host, frames } = radarFrames(await radarMaps());
    if (!frames.length) throw new Error('sem imagens de radar');
    const geo = tileGeo(lat, lon);
    const covered = await cached(`rvcov:v1:${cell(lat, 3)},${cell(lon, 3)}`, 7 * 864e5, async () => coveredAt((await pixels(coverageUrl(host, lat, lon))).data, geo))
        .catch(() => true);
    const got = await Promise.all(frames.map((f) => radarFrame(radarTileUrl(host, f.path, lat, lon)).then((d) => ({ ms: f.ms, dbz: d.dbz })).catch(() => null)));
    const ok = got.filter(Boolean);
    if (!ok.length) throw new Error('imagens do radar indisponíveis');
    return { frames: ok, geo, covered, host };
}

/**
 * Previsão completa para um local (formato em docs/API.md, "Previsão").
 * ipmaPrev (opcional, tarefa agendada): previsões do IPMA de há ~1 dia { times, temp } para a verificação local.
 * O relevo à volta do ponto (pointTerrain) dá location.terrain e o efeito local (fc.local); o radar das últimas 2 h
 * (loadRadar, RainViewer) dá fc.radar e corrige o "agora" e as próximas 2 h quando a imagem tem ≤ 20 min.
 * memory (opcional): a memória da aprendizagem deste ponto (lib/learn.js) — uma, várias (telemóvel + conector) ou uma
 * promessa delas (espera no máximo 6 s); fc.learning.window traz os dias verificados agora, para juntar e guardar.
 * reports (opcional): avisos do utilizador perto do ponto ({ kind, time, distanceKm }) — contam na verificação da chuva.
 * @param {{lat:number, lon:number, name?:string, base?:string, preferProxy?:boolean, withRaw?:boolean, now?:number|string, ipmaPrev?:object,
 *   memory?:object|object[]|Promise<object|object[]>, reports?:object[]}} o
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
    const q = omQueries(lat, lon, { prevDays: o.prevDays });
    const B = ctx.base;
    const T = {
        det: settle(om('forecast', q.forecast, ctx, 20000)),
        ens: settle(om('ensemble', q.ensemble, ctx, 20000)),
        prev: settle(om('previous', q.previous, ctx)),
        marine: settle(om('marine', q.marine, ctx)),
        metar: settle(request(`${B}/api/raw/metar?lat=${lat}&lon=${lon}`, { timeout: 10000 })),
        place: settle(reverseGeocode(lat, lon)),
        clim: settle(climate(lat, lon, ctx)),
        terrain: settle(pointTerrain(lat, lon, ctx)),
        radar: settle(loadRadar(lat, lon)),
        ...(pt ? {
            stations: settle(cached('ipma:stations', 864e5, () => request(IPMA.stations))),
            obs: settle(request(IPMA.obs, { timeout: 20000 })),
            warnings: settle(request(IPMA.warnings)),
            rcm0: settle(cached('ipma:rcm0', 36e5, () => request(IPMA.rcm0))),
            rcm1: settle(cached('ipma:rcm1', 36e5, () => request(IPMA.rcm1))),
            districts: settle(cached('ipma:districts', 7 * 864e5, () => request(IPMA.districts))),
            // a ANEPC recusa o conector e bloqueia pedidos de outros sites: depois de uma falha, pausa de 12 h
            // a tarefa da análise traz a sua cópia (vai diretamente ao fogos.pt, que recusa o conector)
            fogos: o.fogos ? { ok: true, v: o.fogos } : fogosPaused() ? { ok: false, e: new Error('em pausa: a ANEPC não aceita o conector (nova tentativa daqui a umas horas)') }
                : settle(request(`${B}/api/raw/fogos`, { timeout: 10000 }).catch((e) => { pauseFogos(); throw e; })),
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
            // estações IPMA perto pela posição, mesmo sem observações recentes (o IPMA às vezes falha): o histórico
            // guardado no conector continua a servir para a verificação e a aprendizagem
            for (const s of ipmaByPosition(ipmaStations, lat, lon)) if (ipmaC.length < 6 && !ipmaC.some((c) => c.id === s.id)) ipmaC.push(s);
            // o histórico das estações usadas e das outras até 40 km (até 10): as vizinhas servem para apanhar pluviómetros avariados
            const histIds = [...new Set([...ipmaC.slice(0, 6).map((c) => c.id), ...ipmaByPosition(ipmaStations, lat, lon, { radiusKm: 40, max: 10 }).map((x) => x.id)])].slice(0, 10);
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
    const memP = o.memory && typeof o.memory.then === 'function'
        ? Promise.race([o.memory.catch(() => null), new Promise((res) => setTimeout(() => res(null), 6000))]) : Promise.resolve(o.memory || null);
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
        place: v('place'), clim: v('clim'), terrain: v('terrain'), radar: v('radar'), reports: Array.isArray(o.reports) ? o.reports : null,
    };
    const memory = await memP;
    const fc = buildForecast(raw, { lat, lon, name: o.name, now: nowMs, memory });
    const status = Object.fromEntries(Object.entries(R).map(([k, r]) => [k, r.ok ? 'ok' : (r.e?.message || 'falhou')]));
    // o mar perto do ponto (só na costa: célula de mar a ≤ 12 km)
    const nowLocal = new Date(nowMs + (fc.location.utcOffsetSeconds || 0) * 1000).toISOString().slice(0, 16);
    fc.marine = R.marine?.ok ? marineSummary(R.marine.v, { lat, lon, nowIso: nowLocal }) : null;
    if (status.marine === 'ok' && !fc.marine) status.marine = 'mar longe do ponto (só na costa)';
    if (status.ipmaFc === 'ok' && !ipma?.forecast) status.ipmaFc = ofc?.reason || 'sem previsão';
    // o IPMA às vezes publica as horas sem valores (falha deles): diz desde quando, para não parecer que só há o METAR
    if (status.obs === 'ok') {
        const last = ipmaObsLatest(v('obs'));
        if (!last) status.obs = 'sem valores (falha do IPMA)';
        else if (nowMs - last > 3 * 36e5) status.obs = `em atraso: última observação ${new Date(last + fc.location.utcOffsetSeconds * 1000).toISOString().slice(0, 16).replace('T', ' ')}`;
    }
    if (status.radar === 'ok' && raw.radar && !raw.radar.covered) status.radar = 'ponto fora da cobertura do radar';
    if (pt || metarList.length) {
        status.elev = p2.el.ok ? 'ok' : (p2.el.e?.message || 'falhou');
        status.obsHist = p2.histIds.length ? (p2.hs.some((h) => h.ok) ? 'ok' : (p2.hs[0]?.e?.message || 'falhou')) : 'sem estações IPMA perto';
    }
    fc.status = status;
    return o.withRaw ? { fc, raw } : fc;
}

// Pede uma análise imediata ao Claude (só funciona se o Worker tiver chave da API). reports = avisos do utilizador perto;
// headers = a identidade do telemóvel (na app: identityHeaders() de api.js)
export async function requestAnalysis(fc, { base = PROXY, det, reports, headers = {} } = {}) {
    const summary = buildSummary(fc, { ...(det ? { perModel: perModelTable(det) } : {}), ...(reports?.length ? { reports } : {}) });
    const r = await fetch(`${base}/api/analysis/refresh?lat=${fc.location.lat}&lon=${fc.location.lon}`, {
        method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify({ summary, name: fc.location.name }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.message || 'A análise imediata não está disponível.');
    return j.analysis;
}

export { buildSummary, perModelTable };
