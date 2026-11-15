// Compras — a casca: só a ponte entre o browser e a Onda. A app (ecrãs, estado, a lista e as mudanças por enviar) é
// Onda (app/compras.onda → app/compras.wasm), corrida pelo anfitrião das apps Onda (onda/rt/anfitriao.js).
// Aqui fica só o que o browser só dá ao JavaScript:
//   - o link de convite (?casa=CÓDIGO) e outro conector (?proxy=…), antes de a app arrancar;
//   - o "buscar" da porta 102: põe a chave do aparelho nos pedidos ao conector e aceita, além de "caminho" (GET),
//     "MÉTODO caminho" + nova linha + corpo JSON (POST);
//   - o Enter nos campos (juntar, entrar) e o Esc (fechar a folha).
// O armazém da app (portas 105/106) usa o prefixo "compras:".
(function () {
    'use strict';
    const PROXY = 'https://compras.mercados-proxy.workers.dev';
    const PRE = 'compras:';
    const ls = {
        get(k) { try { return localStorage.getItem(PRE + k); } catch { return null; } },
        set(k, v) { try { localStorage.setItem(PRE + k, v); } catch { /* modo privado */ } },
    };
    const q = new URLSearchParams(location.search);
    if (q.get('casa')) { ls.set('entrar', q.get('casa').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)); q.delete('casa'); }
    if (q.get('proxy')) { ls.set('proxy', q.get('proxy').replace(/\/+$/, '')); q.delete('proxy'); }
    const resto = q.toString() ? `?${q}` : '';
    if (location.search !== resto) history.replaceState(null, '', location.pathname + resto);
    ls.set('url', location.origin + location.pathname);

    function buscar(pedido) {
        const nl = pedido.indexOf('\n');
        const linha = nl < 0 ? pedido : pedido.slice(0, nl);
        const corpo = nl < 0 ? '' : pedido.slice(nl + 1);
        const esp = linha.indexOf(' ');
        const metodo = esp < 0 ? 'GET' : linha.slice(0, esp), alvo = esp < 0 ? linha : linha.slice(esp + 1);
        if (!/^(GET|POST)$/.test(metodo) || !alvo.startsWith('/api/')) return Promise.resolve(new Response('', { status: 400 }));
        const headers = {};
        const chave = ls.get('chave');
        if (chave) headers.authorization = `Bearer ${chave}`;
        if (corpo) headers['content-type'] = 'application/json';
        return fetch((ls.get('proxy') || PROXY) + alvo, { method: metodo, headers, body: corpo || undefined });
    }

    fetch('app/compras.wasm?v=0.5.0')
        .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.arrayBuffer(); })
        .then((b) => WebAssembly.compile(b))
        .then((mod) => { window.app = window.OndaApp.criar(mod, { buscar, prefixo: PRE }); })
        .catch((e) => {
            document.getElementById('vista').innerHTML = '<p class="vazio">Não consegui abrir a app: ' + String((e && e.message) || e).replace(/[<&]/g, '') + '</p>';
        });

    const evento = (t) => { if (window.app) window.app.chamar('clique', window.app.escrever(t)); };
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') evento('fecha:0');
        if (e.key !== 'Enter') return;
        const campo = e.target && e.target.getAttribute && e.target.getAttribute('data-onda');
        if (campo === 'junta') { e.preventDefault(); evento('juntar:0'); }
        if (campo === 'codigo') { e.preventDefault(); evento('entrar:0'); }
    });
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js');
})();
