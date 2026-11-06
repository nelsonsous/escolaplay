// Service worker da Meteo: app disponível sem rede + última análise e imagens de satélite em cache.
// Pedidos a outros domínios (Open-Meteo, IPMA, Nominatim…) não são intercetados.
const VERSION = 'meteo-1.0.0';
const SHELL = `shell-${VERSION}`;
const DATA = 'meteo-data-v1';
const SAT = 'meteo-sat-v1';
const SHELL_FILES = [
  '/', '/index.html', '/styles.css', '/app.js', '/api.js', '/charts.js', '/icons.js', '/format.js',
  '/manifest.webmanifest', '/favicon.svg', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/apple-touch-icon.png',
];
// motor de previsão (pasta lib/): em cache se existir, sem bloquear a instalação
const OPTIONAL = ['/lib/data.js', '/lib/engine.js', '/lib/sources.js', '/lib/stats.js', '/lib/analysis.js'];
const SAT_FRESH_MS = 10 * 60 * 1000;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const c = await caches.open(SHELL);
    await c.addAll(SHELL_FILES);
    await Promise.all(OPTIONAL.map((u) => c.add(u).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = new Set([SHELL, DATA, SAT]);
    for (const k of await caches.keys()) if (!keep.has(k)) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // outros domínios: direto à rede
  if (url.pathname === '/api/analysis') return event.respondWith(networkFirst(req, DATA, 12000));
  if (url.pathname === '/api/sat') return event.respondWith(satellite(req));
  if (url.pathname.startsWith('/api/')) return; // restantes pedidos ao Worker: só rede
  if (req.mode === 'navigate') return event.respondWith(page(req));
  event.respondWith(staleWhileRevalidate(req));
});

async function page(req) {
  try {
    const res = await fetch(req);
    if (res.ok) (await caches.open(SHELL)).put('/index.html', res.clone());
    return res;
  } catch {
    const c = await caches.open(SHELL);
    return (await c.match('/index.html')) || (await c.match('/')) || Response.error();
  }
}

async function staleWhileRevalidate(req) {
  const c = await caches.open(SHELL);
  const hit = await c.match(req, { ignoreSearch: true });
  const net = fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => null);
  return hit || (await net) || Response.error();
}

const stamp = (res) => {
  const h = new Headers(res.headers);
  h.set('x-sw-fetched-at', String(Date.now()));
  return res.blob().then((b) => new Response(b, { status: res.status, statusText: res.statusText, headers: h }));
};

async function networkFirst(req, cacheName, timeoutMs) {
  const c = await caches.open(cacheName);
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeoutMs);
    const res = await fetch(req, { signal: ctl.signal });
    clearTimeout(t);
    if (res.ok) { await c.put(req, await stamp(res.clone())); trim(c, 20); }
    return res;
  } catch {
    const hit = await c.match(req);
    if (!hit) return new Response(JSON.stringify({ error: 'offline', message: 'Sem ligação e sem dados guardados.' }), { status: 503, headers: { 'content-type': 'application/json' } });
    const h = new Headers(hit.headers);
    h.set('x-meteo-offline', '1');
    h.set('x-meteo-cached-at', hit.headers.get('x-sw-fetched-at') || '');
    return new Response(await hit.blob(), { status: 200, headers: h });
  }
}

async function satellite(req) {
  const c = await caches.open(SAT);
  const hit = await c.match(req);
  const age = hit ? Date.now() - Number(hit.headers.get('x-sw-fetched-at') || 0) : Infinity;
  if (hit && age < SAT_FRESH_MS) return hit;
  try {
    const res = await fetch(req);
    if (res.ok) { await c.put(req, await stamp(res.clone())); trim(c, 40); }
    return res.ok || !hit ? res : hit;
  } catch {
    return hit || Response.error();
  }
}

async function trim(cache, max) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}
