// Pedidos ao conector de dados (Cloudflare Worker, como na app Mercados) e memória do telemóvel.
// O endereço do conector vem de ./lib/data.js (setProxy/getProxy): Ajustes ou ?proxy=URL.
// Sem contas: este telemóvel tem um id e um segredo aleatórios (criados na primeira vez, guardados aqui) que vão em todos
// os pedidos ao conector (x-meteo-device); o dono da app tem também o código (x-meteo-owner, de ?dono=<código>).
import { getProxy } from './lib/data.js';

export class ApiError extends Error {
  constructor(message, { status = 0, code = '', data = null } = {}) { super(message); this.status = status; this.code = code; this.data = data; }
}

async function call(path, { method = 'GET', body, timeout = 20000 } = {}, retried = false) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeout);
  let res;
  try {
    res = await fetch(getProxy() + path, {
      method,
      headers: { ...identityHeaders(), ...(body ? { 'content-type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctl.signal,
    });
  } catch (e) {
    throw new ApiError(e.name === 'AbortError' ? 'O conector demorou demasiado a responder.' : 'Sem ligação ao conector.', { code: 'rede' });
  } finally { clearTimeout(t); }
  if (res.status === 204) return null;
  let data = null;
  try { data = await res.json(); } catch { /* sem corpo JSON */ }
  // o conector não reconhece o segredo deste telemóvel (memória apagada ou estragada): identidade nova e tenta outra vez
  if (res.status === 403 && data?.error === 'dispositivo' && !retried) { resetDevice(); return call(path, { method, body, timeout }, true); }
  if (!res.ok) throw new ApiError(data?.message || `Erro ${res.status} do conector.`, { status: res.status, code: data?.error || '', data });
  return data;
}

const q = (o) => new URLSearchParams(Object.entries(o).filter(([, v]) => v != null && v !== '')).toString();
export const r4 = (v) => Math.round(v * 1e4) / 1e4;

export const getAnalysis = (lat, lon) => call(`/api/analysis?${q({ lat: r4(lat), lon: r4(lon) })}`);
export const getStatus = () => call('/api/status', { timeout: 8000 });
export const getPlaces = async () => (await call('/api/places')) || [];
export const addPlace = (name, lat, lon) => call('/api/places', { method: 'POST', body: { name, lat: r4(lat), lon: r4(lon) } });
/** Desliga a análise diária de um local (fica guardado, com a última análise e as lições). */
export const deletePlace = (id) => call(`/api/places/${encodeURIComponent(id)}`, { method: 'DELETE' });
/** Muda um local: { lat, lon, name? } (outro ponto; o id fica: a última análise e as lições continuam) e/ou { on }. */
export const updatePlace = (id, b) => call(`/api/places/${encodeURIComponent(id)}`, { method: 'PATCH',
  body: { ...b, ...(b.lat != null ? { lat: r4(b.lat), lon: r4(b.lon) } : {}) } });
export const movePlace = (id, lat, lon, name) => updatePlace(id, { lat, lon, ...(name ? { name } : {}) });
/** Só o dono: painel "Utilização" e a "análise dos outros" (on | 1x | off). */
export const getUsage = () => call('/api/usage', { timeout: 12000 });
export const setOthers = (others) => call('/api/settings', { method: 'PATCH', body: { others } });
export async function geocode(text) {
  const r = await call(`/api/geocode?${q({ q: text })}`, { timeout: 10000 });
  return Array.isArray(r) ? r : [];
}
export const satUrl = (layer, lat, lon, km = 600, w = 720, h = 540) => `${getProxy()}/api/sat?${q({ layer, lat: r4(lat), lon: r4(lon), km, w, h })}`;
/** Aviso do utilizador ("Está a chover?"): { kind, time, lat, lon } → o conector guarda-o para a análise do Claude. */
export const postReport = (r) => call('/api/reports', { method: 'POST', body: { kind: r.kind, time: r.time, lat: r4(r.lat), lon: r4(r.lon) }, timeout: 10000 });
/** Avisos recentes perto do ponto (o mais recente primeiro). */
export async function getReports(lat, lon, hours = 24) {
  const r = await call(`/api/reports?${q({ lat: r4(lat), lon: r4(lon), hours })}`, { timeout: 8000 });
  return Array.isArray(r?.reports) ? r.reports : [];
}

// ---------- notificações do fim do dia (Web Push; o conector envia-as à hora escolhida) ----------
export const getPushKey = () => call('/api/push/key', { timeout: 8000 });
/** { on, time, sunday, place } deste telemóvel */
export const getPush = () => call('/api/push', { timeout: 8000 });
export const savePush = (b) => call('/api/push', { method: 'POST', body: b, timeout: 10000 });
export const deletePush = () => call('/api/push', { method: 'DELETE', timeout: 10000 });
export const testPush = () => call('/api/push/test', { method: 'POST', body: {}, timeout: 15000 });

/** Memória da aprendizagem do local deste telemóvel perto do ponto (≤ 3 km), que a tarefa agendada guarda: { place, memory } */
export const getLearning = (lat, lon) => call(`/api/learning?${q({ lat: r4(lat), lon: r4(lon) })}`, { timeout: 6000 });

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

// ---------- identidade deste telemóvel (sem contas) e código do dono ----------
const DEVICE_KEY = 'meteo:device', OWNER_KEY = 'meteo:dono';
const hex = (n) => { const a = new Uint8Array(n); crypto.getRandomValues(a); return [...a].map((b) => b.toString(16).padStart(2, '0')).join(''); };
let dev = null; // sem memória (modo privado) fica só para esta sessão
/** { id, token }: criados ao acaso na primeira vez e guardados neste telemóvel. */
export function device() {
  if (dev) return dev;
  const s = store.get(DEVICE_KEY);
  if (s && /^[0-9a-f]{24}$/.test(s.id) && /^[0-9a-f]{48}$/.test(s.token)) return (dev = s);
  dev = { id: hex(12), token: hex(24), createdAt: new Date().toISOString() };
  store.set(DEVICE_KEY, dev);
  return dev;
}
export function resetDevice() { dev = null; store.del(DEVICE_KEY); return device(); }
export const ownerCode = () => { const c = store.get(OWNER_KEY); return typeof c === 'string' ? c : ''; };
/** Guarda o código do dono (de ?dono=<código>) só neste telemóvel; vazio = esquecer. */
export function setOwnerCode(code) {
  const c = String(code || '').trim().slice(0, 200);
  if (c) store.set(OWNER_KEY, c); else store.del(OWNER_KEY);
  return c;
}
/** Cabeçalhos de todos os pedidos da app ao conector (o código vai com encodeURIComponent: pode ter acentos). */
export function identityHeaders() {
  const d = device(), o = ownerCode();
  return { 'x-meteo-device': `${d.id}.${d.token}`, ...(o ? { 'x-meteo-owner': encodeURIComponent(o) } : {}) };
}

const fcKey = (lat, lon) => `meteo:fc:${r4(lat)},${r4(lon)}`;
/** Guarda a última previsão de cada local (máx. 3) para abrir logo e sem rede. */
export function saveForecast(lat, lon, fc) {
  const key = fcKey(lat, lon);
  const idx = store.get('meteo:fc-index', []).filter((k) => k !== key);
  idx.unshift(key);
  for (const old of idx.splice(3)) store.del(old);
  store.set('meteo:fc-index', idx);
  // os dias verificados agora já foram juntos à memória da aprendizagem: não se guardam duas vezes
  if (fc?.learning?.window) fc = { ...fc, learning: { ...fc.learning, window: null } };
  if (!store.set(key, { savedAt: Date.now(), fc })) {
    for (const k of idx.slice(1)) store.del(k);
    store.set('meteo:fc-index', [key]);
    store.set(key, { savedAt: Date.now(), fc });
  }
}
export const loadSavedForecast = (lat, lon) => store.get(fcKey(lat, lon));

// ---------- memória da aprendizagem neste telemóvel (lib/learn.js): até 4 sítios, cada uma vale até 3 km ----------
const LEARN_IDX = 'meteo:learn-index';
const kmBetween = (a, b, c, d) => {
  const t = Math.PI / 180, x = Math.sin(((c - a) * t) / 2) ** 2 + Math.cos(a * t) * Math.cos(c * t) * Math.sin(((d - b) * t) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(x));
};
const learnIdx = () => store.get(LEARN_IDX, []).filter((x) => x && typeof x.key === 'string' && Number.isFinite(x.lat) && Number.isFinite(x.lon));
const nearLearn = (lat, lon) => learnIdx().map((x) => ({ ...x, d: kmBetween(lat, lon, x.lat, x.lon) })).filter((x) => x.d <= 3).sort((a, b) => a.d - b.d)[0] || null;
export function loadLearning(lat, lon) {
  const n = nearLearn(lat, lon);
  return n ? store.get(n.key) : null;
}
export function saveLearning(lat, lon, memory) {
  if (!memory?.days) return;
  const n = nearLearn(lat, lon);
  const key = n?.key || `meteo:learn:${r4(lat)},${r4(lon)}`;
  const idx = [{ key, lat: n?.lat ?? lat, lon: n?.lon ?? lon, at: Date.now() }, ...learnIdx().filter((x) => x.key !== key)];
  for (const old of idx.splice(4)) store.del(old.key);
  store.set(LEARN_IDX, idx);
  if (!store.set(key, memory)) { // armazenamento cheio: fica só esta
    for (const x of idx.slice(1)) store.del(x.key);
    store.set(LEARN_IDX, idx.slice(0, 1));
    store.set(key, memory);
  }
}
const anKey = (lat, lon) => `meteo:an:${r4(lat)},${r4(lon)}`;
export const saveAnalysis = (lat, lon, data) => store.set(anKey(lat, lon), { savedAt: Date.now(), data });
export const loadSavedAnalysis = (lat, lon) => store.get(anKey(lat, lon));
// o último aviso deste telemóvel (vale 45 min e só perto do sítio onde foi dado)
export const saveReport = (r) => store.set('meteo:report', r);
export const loadReport = () => store.get('meteo:report');
