// Compras — service worker (abrir a app sem Internet; a lista e a procura vêm do conector). Mudar CACHE a cada versão.
// O domínio é partilhado com a EscolaPlay e as outras apps (/escolaplay/): este SW só mexe nas caches "compras-*" e só
// trata pedidos dentro da sua pasta (/escolaplay/compras/) e o anfitrião das apps Onda. O conector (outro domínio)
// nunca passa por aqui.
const CACHE = 'compras-v16'; // 0.14.0 — preços comparáveis
const ASSETS = [
    './', './index.html', './compras.css?v=0.12.0', './compras.js?v=0.12.0', './app/compras.wasm?v=0.12.0', './manifest.webmanifest',
    '../onda/rt/anfitriao.js', './icon.svg', './icon-192.png', './icon-512.png', './apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE).then((c) => Promise.all(ASSETS.map((u) => c.add(new Request(u, { cache: 'reload' })).catch(() => {})))));
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(keys.filter((k) => k.startsWith('compras-') && k !== CACHE).map((k) => caches.delete(k)));
        await self.clients.claim();
    })());
});

// A página: rede primeiro (apanha versões novas), cache se não houver rede. O resto: cache primeiro.
self.addEventListener('fetch', (event) => {
    const req = event.request;
    const url = new URL(req.url);
    if (req.method !== 'GET' || url.origin !== location.origin) return;
    const dentro = url.pathname.includes('/compras/') || url.pathname.endsWith('/onda/rt/anfitriao.js');
    if (!dentro) return;
    if (req.mode === 'navigate') {
        event.respondWith(fetch(req).then((r) => { const c = r.clone(); caches.open(CACHE).then((k) => k.put('./index.html', c)); return r; })
            .catch(() => caches.match('./index.html')));
        return;
    }
    event.respondWith(caches.match(req).then((r) => r || fetch(req).then((resp) => {
        if (resp.ok) { const c = resp.clone(); caches.open(CACHE).then((k) => k.put(req, c)); }
        return resp;
    })));
});
