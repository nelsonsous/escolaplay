// Pedidos ao conector de dados (Cloudflare Worker, como na app Mercados) e memória do telemóvel.
// O endereço do conector vem de ./lib/data.js (setProxy/getProxy): Ajustes ou ?proxy=URL.
import { getProxy } from './lib/data.js';

export class ApiError extends Error {
  constructor(message, { status = 0, code = '' } = {}) { super(message); this.status = status; this.code = code; }
}

async function call(path, { method = 'GET', body, timeout = 20000 } = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeout);
  let res;
  try {
    res = await fetch(getProxy() + path, {
      method,
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: ctl.signal,
    });
  } catch (e) {
    throw new ApiError(e.name === 'AbortError' ? 'O conector demorou demasiado a responder.' : 'Sem ligação ao conector.', { code: 'rede' });
  } finally { clearTimeout(t); }
  if (res.status === 204) return null;
  let data = null;
  try { data = await res.json(); } catch { /* sem corpo JSON */ }
  if (!res.ok) throw new ApiError(data?.message || `Erro ${res.status} do conector.`, { status: res.status, code: data?.error || '' });
  return data;
}

const q = (o) => new URLSearchParams(Object.entries(o).filter(([, v]) => v != null && v !== '')).toString();
export const r4 = (v) => Math.round(v * 1e4) / 1e4;

export const getAnalysis = (lat, lon) => call(`/api/analysis?${q({ lat: r4(lat), lon: r4(lon) })}`);
export const getStatus = () => call('/api/status', { timeout: 8000 });
export const getPlaces = async () => (await call('/api/places')) || [];
export const addPlace = (name, lat, lon) => call('/api/places', { method: 'POST', body: { name, lat: r4(lat), lon: r4(lon) } });
export const deletePlace = (id) => call(`/api/places/${encodeURIComponent(id)}`, { method: 'DELETE' });
export async function geocode(text) {
  const r = await call(`/api/geocode?${q({ q: text })}`, { timeout: 10000 });
  return Array.isArray(r) ? r : [];
}
export const satUrl = (layer, lat, lon, km = 600, w = 720, h = 540) => `${getProxy()}/api/sat?${q({ layer, lat: r4(lat), lon: r4(lon), km, w, h })}`;

// ---------- memória local (pode falhar: modo privado, armazenamento cheio) ----------
export const store = {
  get(key, fallback = null) {
    try { const v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
  },
  del(key) { try { localStorage.removeItem(key); } catch { /* ignorar */ } },
};

const fcKey = (lat, lon) => `meteo:fc:${r4(lat)},${r4(lon)}`;
/** Guarda a última previsão de cada local (máx. 3) para abrir logo e sem rede. */
export function saveForecast(lat, lon, fc) {
  const key = fcKey(lat, lon);
  const idx = store.get('meteo:fc-index', []).filter((k) => k !== key);
  idx.unshift(key);
  for (const old of idx.splice(3)) store.del(old);
  store.set('meteo:fc-index', idx);
  if (!store.set(key, { savedAt: Date.now(), fc })) {
    for (const k of idx.slice(1)) store.del(k);
    store.set('meteo:fc-index', [key]);
    store.set(key, { savedAt: Date.now(), fc });
  }
}
export const loadSavedForecast = (lat, lon) => store.get(fcKey(lat, lon));
const anKey = (lat, lon) => `meteo:an:${r4(lat)},${r4(lon)}`;
export const saveAnalysis = (lat, lon, data) => store.set(anKey(lat, lon), { savedAt: Date.now(), data });
export const loadSavedAnalysis = (lat, lon) => store.get(anKey(lat, lon));
