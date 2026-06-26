const CACHE_NAME = 'escolaplay-v510';
const ASSETS = [
    '/escolaplay/',
    '/escolaplay/index.html',
    '/escolaplay/styles.css',
    '/escolaplay/escape.css',
    '/escolaplay/app.js',
    '/escolaplay/content.js',
    '/escolaplay/escape.js',
    '/escolaplay/gsap.min.js',
    '/escolaplay/mascot.js',
    '/escolaplay/manifest.json',
    // NOTA (v439): os ficheiros content_<ano>_*.js já não estão no precache.
    // São lazy-loaded por _loadScript() quando o utilizador ativa um perfil
    // desse ano — fresh load fica ~2 MB mais leve. O fetch handler ainda os
    // faz cache on-demand, por isso ficam offline depois da 1ª visita ao ano.
    '/escolaplay/content_secret.js',
    '/escolaplay/content_course_english.js',
    '/escolaplay/content_course_ge.js',
    // Avatares Disney (uso pessoal)
    '/escolaplay/icons/disney/alice.png',
    '/escolaplay/icons/disney/anna.png',
    '/escolaplay/icons/disney/ariel.png',
    '/escolaplay/icons/disney/aurora.png',
    '/escolaplay/icons/disney/aurora2.png',
    '/escolaplay/icons/disney/belle.png',
    '/escolaplay/icons/disney/cinderella.png',
    '/escolaplay/icons/disney/eilonwy.png',
    '/escolaplay/icons/disney/elsa.png',
    '/escolaplay/icons/disney/esmeralda.png',
    '/escolaplay/icons/disney/giselle.png',
    '/escolaplay/icons/disney/jasmine.png',
    '/escolaplay/icons/disney/jessica.png',
    '/escolaplay/icons/disney/kida.png',
    '/escolaplay/icons/disney/megara.png',
    '/escolaplay/icons/disney/merida.png',
    '/escolaplay/icons/disney/mirabel.png',
    '/escolaplay/icons/disney/moana.png',
    '/escolaplay/icons/disney/mulan.png',
    '/escolaplay/icons/disney/pocahontas.png',
    '/escolaplay/icons/disney/rapunzel.png',
    '/escolaplay/icons/disney/raya.png',
    '/escolaplay/icons/disney/snowwhite.png',
    '/escolaplay/icons/disney/stitch.png',
    '/escolaplay/icons/disney/tarzan.png',
    '/escolaplay/icons/disney/tiana.png',
    '/escolaplay/icons/disney/tinkerbell.png',
    // Diário de um Vampiro
    '/escolaplay/icons/vampire/anna.png',
    '/escolaplay/icons/vampire/bonnie.png',
    '/escolaplay/icons/vampire/caroline.png',
    '/escolaplay/icons/vampire/damon.png',
    '/escolaplay/icons/vampire/elena.png',
    '/escolaplay/icons/vampire/elijah.png',
    '/escolaplay/icons/vampire/jeremy.png',
    '/escolaplay/icons/vampire/klaus.png',
    '/escolaplay/icons/vampire/matt.png',
    '/escolaplay/icons/vampire/rebekah.png',
    '/escolaplay/icons/vampire/stefan.png',
    '/escolaplay/icons/vampire/tyler.png',
    // Stranger Things
    '/escolaplay/icons/stranger/billy.png',
    '/escolaplay/icons/stranger/dustin.png',
    '/escolaplay/icons/stranger/eleven.png',
    '/escolaplay/icons/stranger/erica.png',
    '/escolaplay/icons/stranger/hopper.png',
    '/escolaplay/icons/stranger/jonathan.png',
    '/escolaplay/icons/stranger/joyce.png',
    '/escolaplay/icons/stranger/lucas.png',
    '/escolaplay/icons/stranger/max.png',
    '/escolaplay/icons/stranger/mayor.png',
    '/escolaplay/icons/stranger/mike.png',
    '/escolaplay/icons/stranger/murray.png',
    '/escolaplay/icons/stranger/nancy.png',
    '/escolaplay/icons/stranger/robin.png',
    '/escolaplay/icons/stranger/steve.png',
    '/escolaplay/icons/stranger/will.png'
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
