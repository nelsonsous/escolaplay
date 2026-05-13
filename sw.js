const CACHE_NAME = 'escolaplay-v179';
const ASSETS = [
    '/escolaplay/',
    '/escolaplay/index.html',
    '/escolaplay/styles.css',
    '/escolaplay/app.js',
    '/escolaplay/content.js',
    '/escolaplay/manifest.json',
    // Bancos de exercícios (síncronos desde v148)
    '/escolaplay/content_2_extra.js',
    '/escolaplay/content_2_p_extra2.js',
    '/escolaplay/content_2_p_extra3.js',
    '/escolaplay/content_2_m_extra2.js',
    '/escolaplay/content_2_m_extra3.js',
    '/escolaplay/content_2_e_extra2.js',
    '/escolaplay/content_2_e_extra3.js',
    '/escolaplay/content_2_e_extra4.js',
    '/escolaplay/content_2_i_extra2.js',
    '/escolaplay/content_2_i_extra3.js',
    '/escolaplay/content_3_p_extra.js',
    '/escolaplay/content_3_m_extra.js',
    '/escolaplay/content_3_e_extra.js',
    '/escolaplay/content_3_i_extra.js',
    '/escolaplay/content_5_p_extra.js',
    '/escolaplay/content_5_m_extra.js',
    '/escolaplay/content_5_i_extra.js',
    '/escolaplay/content_5_c_extra.js',
    '/escolaplay/content_5_h_extra.js',
    '/escolaplay/content_6_p_extra.js',
    '/escolaplay/content_6_p_extra2.js',
    '/escolaplay/content_6_m_extra.js',
    '/escolaplay/content_6_m_extra2.js',
    '/escolaplay/content_6_i_extra.js',
    '/escolaplay/content_6_c_extra.js',
    '/escolaplay/content_6_c_extra2.js',
    '/escolaplay/content_6_h_extra.js',
    '/escolaplay/content_6_h_extra2.js',
    '/escolaplay/content_secret.js'
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

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil((async () => {
        const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        const url = '/escolaplay/';
        for (const c of all) {
            if (c.url.includes('/escolaplay/')) { try { await c.focus(); return; } catch {} }
        }
        await self.clients.openWindow(url);
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
