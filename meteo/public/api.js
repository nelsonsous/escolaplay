// Pedidos ao Worker (mesma origem) e memória local do telemóvel.
// A previsão em si é calculada no browser por ./lib/data.js (loadForecast).

export class ApiError extends Error {
  constructor(message, { status = 0, code = '' } = {}) { super(message); this.status = status; this.code = code; }
}

async function call(path, { method = 'GET', body, timeout = 20000 } = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeout);
  let res;
  try {
    res = await fetch(path, {
      method,
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: ctl.signal,
    });
  } catch (e) {
    throw new ApiError(e.name === 'AbortError' ? 'O servidor demorou demasiado a responder.' : 'Sem ligação à internet.', { code: 'rede' });
  } finally { clearTimeout(t); }
  if (res.status === 204) return null;
  let data = null;
  try { data = await res.json(); } catch { /* sem corpo JSON */ }
  if (!res.ok) throw new ApiError(data?.message || `Erro ${res.status} do servidor.`, { status: res.status, code: data?.error || '' });
  return { data, offline: res.headers.get('x-meteo-offline') === '1', cachedAt: Number(res.headers.get('x-meteo-cached-at')) || null };
}

const q = (o) => new URLSearchParams(Object.entries(o).filter(([, v]) => v != null && v !== '')).toString();
export const r4 = (v) => Math.round(v * 1e4) / 1e4;

export async function getAnalysis(lat, lon) {
  return call(`/api/analysis?${q({ lat: r4(lat), lon: r4(lon) })}`);
}
export async function getStatus() { return (await call('/api/status'))?.data ?? null; }
export async function getPlaces() { return (await call('/api/places'))?.data ?? []; }
export async function addPlace(name, lat, lon) { return (await call('/api/places', { method: 'POST', body: { name, lat: r4(lat), lon: r4(lon) } }))?.data; }
export async function deletePlace(id) { await call(`/api/places/${encodeURIComponent(id)}`, { method: 'DELETE' }); }
export async function geocode(text) {
  const r = await call(`/api/geocode?${q({ q: text })}`, { timeout: 10000 });
  return Array.isArray(r?.data) ? r.data : [];
}
export function satUrl(layer, lat, lon, km = 600, w = 720, h = 540) {
  return `/api/sat?${q({ layer, lat: r4(lat), lon: r4(lon), km, w, h })}`;
}

// ---------- memória local (pode falhar: modo privado, armazenamento cheio) ----------
const PFX = 'meteo:';
export const store = {
  get(key, fallback = null) {
    try { const v = localStorage.getItem(PFX + key); return v == null ? fallback : JSON.parse(v); } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(PFX + key, JSON.stringify(value)); return true; } catch { return false; }
  },
  del(key) { try { localStorage.removeItem(PFX + key); } catch { /* ignorar */ } },
};

const locKey = (lat, lon) => `fc:${r4(lat)},${r4(lon)}`;
/** Guarda a última previsão de cada local (máx. 3) para abrir instantaneamente e sem rede. */
export function saveForecast(lat, lon, fc) {
  const key = locKey(lat, lon);
  const idx = store.get('fc-index', []).filter((k) => k !== key);
  idx.unshift(key);
  for (const old of idx.splice(3)) store.del(old);
  store.set('fc-index', idx);
  if (!store.set(key, { savedAt: Date.now(), fc })) {
    // sem espaço: limpa as outras e tenta de novo
    for (const k of idx.slice(1)) store.del(k);
    store.set('fc-index', [key]);
    store.set(key, { savedAt: Date.now(), fc });
  }
}
export const loadSavedForecast = (lat, lon) => store.get(locKey(lat, lon));
