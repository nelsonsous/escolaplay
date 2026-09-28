// Damas — service worker (jogar sem Internet). Mudar CACHE a cada versão.
//
// O domínio é partilhado com a EscolaPlay (/escolaplay/): as caches são do
// domínio, por isso este SW só mexe nas caches "damas-*" e só trata pedidos
// dentro da sua pasta (/escolaplay/damas/).
const CACHE = 'damas-v1';
const ASSETS = [
    './', './index.html', './damas.css', './damas.js', './manifest.webmanifest',
    './icon.svg', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
    // cache: 'reload' — nunca guardar cópias antigas que estejam na cache HTTP do browser
    event.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' })))));
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(keys.filter(k => k.startsWith('damas-') && k !== CACHE).map(k => caches.delete(k)));
        await self.clients.claim();
    })());
});

// Navegação: rede primeiro (apanha versões novas), cache se não houver rede.
// Resto: cache primeiro (a cache é versionada por CACHE) e, se faltar, rede
// — e guarda, para voltar a haver cópia offline.
self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    const scope = new URL(self.registration.scope);
    if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
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
