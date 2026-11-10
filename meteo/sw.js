// Meteo — service worker (abrir a app sem Internet; os dados vêm sempre da rede). Mudar CACHE a cada versão.
//
// O domínio é partilhado com a EscolaPlay e a Mercados (/escolaplay/): este SW só mexe nas
// caches "meteo-*" e só trata pedidos dentro da sua pasta (/escolaplay/meteo/).
// A previsão, o radar (RainViewer) e o conector (outros domínios) nunca passam por aqui.
const CACHE = 'meteo-v34'; // 1.18.0
const ASSETS = [
    './', './index.html', './meteo.css', './meteo.js', './api.js', './format.js', './icons.js', './charts.js', './sky.js', './chuva.js', './onda/chuva-wasm.js', './onda/ceu-glsl.js', './manifest.webmanifest',
    './lib/data.js', './lib/engine.js', './lib/learn.js', './lib/marine.js', './lib/sources.js', './lib/stats.js', './lib/analysis.js', './lib/radar.js', './lib/png.js',
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

// Navegação: rede primeiro (apanha versões novas), cache se não houver rede. Guarda-se sem o "?…" do endereço (o
// ?dono=<código> do dono da app nunca fica na cache).
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
                if (fresh && fresh.ok) cache.put(url.search ? new Request(url.origin + url.pathname) : req, fresh.clone()).catch(() => {});
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

// Notificações do fim do dia (o conector envia-as cifradas à hora escolhida): mostra-a; ao tocar, abre a Análise
self.addEventListener('push', (event) => {
    let d = null;
    try { d = event.data ? event.data.json() : null; } catch { d = null; }
    event.waitUntil(self.registration.showNotification(d?.title || 'Meteo', {
        body: d?.body || 'Abre a app para ver a previsão de amanhã.', icon: 'icon-192.png', badge: 'icon-192.png',
        tag: d?.tag || 'meteo', data: { url: d?.url || './?tab=analise' },
    }));
});
// Tocar na notificação abre a análise completa. A app também lê o pedido numa cache à parte quando volta a ficar
// visível (no iPhone nem sempre se pode focar a janela ou mandar-lhe mensagens).
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const scope = self.registration.scope;
    // ao domingo (a da semana) abre já no resumo da semana
    const nav = { tab: 'analise', open: 'd-an', focus: event.notification.tag === 'meteo-semana' ? 'an-semana' : '', at: Date.now() };
    let url = scope + '?tab=analise&abrir=d-an';
    try { const u = new URL(event.notification.data?.url || '', scope); if (u.href.startsWith(scope)) { u.searchParams.set('tab', 'analise'); u.searchParams.set('abrir', 'd-an'); url = u.href; } } catch { /* fica a da Análise */ }
    if (nav.focus) url += (url.includes('?') ? '&' : '?') + 'foco=' + nav.focus;
    event.waitUntil((async () => {
        try { await (await caches.open('meteonav')).put('nav', new Response(JSON.stringify(nav))); } catch { /* sem cache */ }
        const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        const w = wins.find((c) => c.url.startsWith(scope));
        if (w) {
            try { await w.focus(); } catch { /* o sistema decide */ }
            try { w.postMessage({ type: 'tab', ...nav }); } catch { /* lê-se da cache */ }
            return;
        }
        await self.clients.openWindow(url);
    })());
});
