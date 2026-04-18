const CACHE_NAME = 'escolaplay-v53';
const ASSETS = [
    '/escolaplay/',
    '/escolaplay/index.html',
    '/escolaplay/styles.css',
    '/escolaplay/app.js',
    '/escolaplay/content.js',
    '/escolaplay/manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
        await self.clients.claim();
        const wins = await self.clients.matchAll({ type: 'window' });
        wins.forEach(c => { try { c.navigate(c.url); } catch {} });
    })());
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    event.respondWith((async () => {
        try {
            const fresh = await fetch(event.request, { cache: 'no-store' });
            const cache = await caches.open(CACHE_NAME);
            cache.put(event.request, fresh.clone()).catch(() => {});
            return fresh;
        } catch {
            return (await caches.match(event.request)) || new Response('Offline', { status: 503 });
        }
    })());
});
