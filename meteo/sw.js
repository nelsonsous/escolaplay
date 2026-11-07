// Meteo — service worker (abrir a app sem Internet; os dados vêm sempre da rede). Mudar CACHE a cada versão.
//
// O domínio é partilhado com a EscolaPlay e a Mercados (/escolaplay/): este SW só mexe nas
// caches "meteo-*" e só trata pedidos dentro da sua pasta (/escolaplay/meteo/).
// A previsão, o radar (RainViewer) e o conector (outros domínios) nunca passam por aqui.
const CACHE = 'meteo-v4'; // 1.3.0
const ASSETS = [
    './', './index.html', './meteo.css', './meteo.js', './api.js', './format.js', './icons.js', './charts.js', './manifest.webmanifest',
    './lib/data.js', './lib/engine.js', './lib/sources.js', './lib/stats.js', './lib/analysis.js', './lib/radar.js', './lib/png.js',
    './icon.svg', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
    // cache: 'reload' — nunca guardar cópias antigas que estejam na cache HTTP do browser
    event.waitUntil(caches.open(CACHE).then((c) => Promise.all(ASSETS.map((u) => c.add(new Request(u, { cache: 'reload' })).catch(() => {})))));
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(keys.filter((k) => k.startsWith('meteo-') && k !== CACHE).map((k) => caches.delete(k)));
        await self.clients.claim();
    })());
});

// Navegação: rede primeiro (apanha versões novas), cache se não houver rede.
// Resto (só ficheiros da app): cache primeiro e, se faltar, rede — e guarda.
self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    const scope = new URL(self.registration.scope);
    if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
    if (url.pathname.startsWith(scope.pathname + 'api/')) return;
    if (req.mode === 'navigate') {
        event.respondWith((async () => {
            const cache = await caches.open(CACHE);
            try {
                const fresh = await fetch(req);
                if (fresh && fresh.ok) cache.put(req, fresh.clone()).catch(() => {});
                return fresh;
            } catch (e) {
                return (await cache.match(req, { ignoreSearch: true })) || (await cache.match('./')) || (await cache.match('./index.html'))
                    || new Response('Sem ligação à Internet.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
            }
        })());
        return;
    }
    event.respondWith((async () => {
        const cache = await caches.open(CACHE);
        const hit = await cache.match(req, { ignoreSearch: true });
        if (hit) return hit;
        try {
            const fresh = await fetch(req);
            if (fresh && fresh.ok) cache.put(req, fresh.clone()).catch(() => {});
            return fresh;
        } catch (e) {
            return new Response('', { status: 503 });
        }
    })());
});
