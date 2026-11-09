// Service worker do molde: a app abre sem rede. Os ficheiros da app vêm da cache (muda o nome da cache em cada
// versão, com os ?v= do index.html); os dados vêm da rede e só da cache quando ela falha.
const CACHE = 'molde-v1';
const APP = ['./', 'index.html', 'app.css?v=1', 'app.js?v=1', 'gerado/anfitriao.js?v=1', 'gerado/app.wasm?v=1', 'manifest.webmanifest', 'icone.svg'];

self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(APP)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
    e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
    const u = new URL(e.request.url);
    if (e.request.method !== 'GET' || u.origin !== location.origin) return;
    if (u.pathname.endsWith('.json')) {
        e.respondWith(fetch(e.request).then((r) => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then((k) => k.put(e.request, c)); } return r; })
            .catch(() => caches.match(e.request).then((r) => r || Response.error())));
        return;
    }
    e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});
