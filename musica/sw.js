// Música — service worker (abrir a app sem Internet; os dados vêm sempre do conector). Mudar CACHE a cada versão.
//
// O domínio é partilhado com a EscolaPlay, a Mercados e a Meteo (/escolaplay/): este SW só mexe nas
// caches "musica-*" e só trata pedidos dentro da sua pasta (/escolaplay/musica/) e o anfitrião das apps Onda.
// O conector e o Tidal (outros domínios) nunca passam por aqui.
const CACHE = 'musica-v13'; // 2.11.0 — sem letras explícitas, como correu, atualizar sozinha
const ASSETS = [
    './', './index.html', './musica.css', './musica.js', './manifest.webmanifest', './app/musica.wasm', '../onda/rt/anfitriao.js',
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
        await Promise.all(keys.filter((k) => k.startsWith('musica-') && k !== CACHE).map((k) => caches.delete(k)));
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
    const anfitriao = new URL('../onda/rt/anfitriao.js', scope).pathname;
    if (url.origin !== scope.origin || !(url.pathname.startsWith(scope.pathname) || url.pathname === anfitriao)) return;
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
