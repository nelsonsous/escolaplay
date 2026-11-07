// Música — a casca. A app em si é Onda (app/musica.onda → app/musica.wasm), corrida pelo anfitrião das apps Onda
// (onda/rt/anfitriao.js): ecrãs, estado, navegação e o motor de curadoria. Aqui só fica o que a Onda não tem como
// porta:
//   - o regresso do login do Tidal (#chave=, #ligado=, #erro=) e o link de ligação (?ligar=), antes de a app arrancar;
//   - o "buscar" da porta 102: põe a chave do aparelho nos pedidos ao conector e aceita, além de "caminho" (GET),
//     "MÉTODO caminho" + nova linha + corpo JSON (POST, DELETE) e "IR url" (sair para o login do Tidal).
// O armazém da app (portas 105/106) usa o prefixo "musica:" — as mesmas chaves que a versão 1 guardava.
(function () {
    'use strict';
    const PROXY = 'https://musica.mercados-proxy.workers.dev';
    const PRE = 'musica:';
    const ls = {
        get(k) { try { return localStorage.getItem(PRE + k); } catch { return null; } },
        set(k, v) { try { localStorage.setItem(PRE + k, v); } catch { /* modo privado */ } },
        del(k) { try { localStorage.removeItem(PRE + k); } catch { /* modo privado */ } },
    };
    // a versão 1 guardava em JSON ("…"); a Onda lê texto simples
    for (const k of ['chave', 'codigo', 'proxy']) {
        const v = ls.get(k);
        if (v && v[0] === '"') { try { ls.set(k, JSON.parse(v)); } catch { ls.del(k); } }
    }
    const h = new URLSearchParams(location.hash.slice(1)), q = new URLSearchParams(location.search);
    if (h.has('chave')) { ls.set('chave', h.get('chave')); ls.del('codigo'); ls.set('aviso', 'Tidal ligado — este aparelho fica com acesso.'); }
    else if (h.has('ligado')) ls.set('aviso', 'Tidal ligado outra vez.');
    else if (h.has('erro')) ls.set('aviso', 'Não liguei ao Tidal: ' + h.get('erro'));
    if (q.get('ligar')) { ls.set('codigo', q.get('ligar')); q.delete('ligar'); }
    if (q.get('proxy')) { ls.set('proxy', q.get('proxy').replace(/\/+$/, '')); q.delete('proxy'); }
    const resto = q.toString() ? `?${q}` : '';
    if (location.hash || location.search !== resto) history.replaceState(null, '', location.pathname + resto);

    function buscar(pedido) {
        const nl = pedido.indexOf('\n');
        const linha = nl < 0 ? pedido : pedido.slice(0, nl), corpo = nl < 0 ? '' : pedido.slice(nl + 1);
        const esp = linha.indexOf(' ');
        const metodo = esp < 0 ? 'GET' : linha.slice(0, esp), alvo = esp < 0 ? linha : linha.slice(esp + 1);
        if (metodo === 'IR') { location.href = alvo; return Promise.resolve(new Response('')); }
        if (!/^(GET|POST|DELETE)$/.test(metodo) || !alvo.startsWith('/api/')) return Promise.resolve(new Response('', { status: 400 }));
        const headers = {};
        const chave = ls.get('chave');
        if (chave) headers.authorization = `Bearer ${chave}`;
        if (corpo) headers['content-type'] = 'application/json';
        return fetch((ls.get('proxy') || PROXY).replace(/\/+$/, '') + alvo, { method: metodo, headers, body: corpo || undefined });
    }

    fetch('app/musica.wasm')
        .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.arrayBuffer(); })
        .then((b) => WebAssembly.compile(b))
        .then((mod) => { window.app = window.OndaApp.criar(mod, { buscar, prefixo: PRE }); })
        .catch((e) => {
            document.getElementById('mu-body').innerHTML = '<p class="mu-erro">Não consegui abrir a app: ' + String(e && e.message || e).replace(/[<&]/g, '') + '</p>';
        });
    // no iOS, o :active (o botão a afundar quando se toca) só funciona com um touchstart registado
    document.addEventListener('touchstart', () => {}, { passive: true });
    // ao abrir outra vez, começa no topo (o iOS repunha o scroll e o título ficava por baixo das horas)
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
