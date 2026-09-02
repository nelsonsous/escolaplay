const CACHE_NAME = 'escolaplay-v579';
// Núcleo: TEM de existir — se falhar, o SW não instala (evita servir uma
// app incompleta). Bump do CACHE_NAME a cada release = novo cache limpo.
const CORE = [
    '/escolaplay/',
    '/escolaplay/index.html',
    '/escolaplay/styles.css',
    '/escolaplay/app.js',
    '/escolaplay/content.js',
    '/escolaplay/mascot.js',
    '/escolaplay/manifest.json',
    // NOTA (v439): os ficheiros content_<ano>_*.js já não estão no precache.
    // São lazy-loaded por _loadScript() quando o utilizador ativa um perfil
    // desse ano; o fetch handler faz cache on-demand → ficam offline depois.
    '/escolaplay/content_course_english.js',
    '/escolaplay/content_course_ge.js'
];
// Opcionais: cacheados um a um; se algum faltar, a instalação NÃO falha.
const OPTIONAL = [
    // Fora do caminho crítico desde a v571 — não bloqueiam a instalação
    '/escolaplay/escape.js', '/escolaplay/escape.css', '/escolaplay/gsap.min.js',
    // Bancos base por ano (v571) + secret: em segundo plano, para offline
    ...['y2','y3','y5','y6','y7'].map(n => `/escolaplay/content_${n}.js`),
    '/escolaplay/content_secret.js',
    // Avatares Disney (uso pessoal)
    ...['alice','anna','ariel','aurora','aurora2','belle','cinderella','eilonwy','elsa','esmeralda','giselle','jasmine','jessica','kida','megara','merida','mirabel','moana','mulan','pocahontas','rapunzel','raya','snowwhite','stitch','tarzan','tiana','tinkerbell'].map(n => `/escolaplay/icons/disney/${n}.png`),
    // Diário de um Vampiro
    ...['anna','bonnie','caroline','damon','elena','elijah','jeremy','klaus','matt','rebekah','stefan','tyler'].map(n => `/escolaplay/icons/vampire/${n}.png`),
    // Stranger Things
    ...['billy','dustin','eleven','erica','hopper','jonathan','joyce','lucas','max','mayor','mike','murray','nancy','robin','steve','will'].map(n => `/escolaplay/icons/stranger/${n}.png`)
];

self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        await cache.addAll(CORE);
        await Promise.all(OPTIONAL.map(u => cache.add(u).catch(() => {})));
    })());
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
        await self.clients.claim(); // o controllerchange na página trata do reload (num deploy)
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

// Estratégia (v570):
//  - Pedidos a OUTROS domínios (Firebase, fontes, CDN): não intercetar — o
//    browser usa o seu cache HTTP normal (antes forçávamos no-store em tudo).
//  - Navegações / index.html: network-first (para apanhar versões novas),
//    com fallback ao cache offline.
//  - Assets estáticos do site (JS/CSS/imagens/JSON): CACHE-FIRST. O cache é
//    versionado pelo CACHE_NAME, por isso uma release nova instala um cache
//    novo e limpo — sem risco de misturar versões. Antes era network-first
//    com no-store: cada arranque voltava a descarregar ~1 MB.
self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return; // deixa o browser tratar
    const isNav = req.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname === '/escolaplay/';
    if (isNav) {
        event.respondWith((async () => {
            try {
                const fresh = await fetch(req, { cache: 'no-cache' });
                if (!fresh || !fresh.ok) throw new Error('bad status ' + (fresh && fresh.status));
                const cache = await caches.open(CACHE_NAME);
                cache.put(req, fresh.clone()).catch(() => {});
                return fresh;
            } catch {
                return (await caches.match(req)) || (await caches.match('/escolaplay/index.html')) || new Response('Offline', { status: 503 });
            }
        })());
        return;
    }
    event.respondWith((async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        try {
            const fresh = await fetch(req);
            if (fresh && fresh.ok) {
                const cache = await caches.open(CACHE_NAME);
                cache.put(req, fresh.clone()).catch(() => {});
            }
            return fresh;
        } catch {
            return new Response('Offline', { status: 503 });
        }
    })());
});
