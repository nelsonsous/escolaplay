// Música — a casca. A app em si é Onda (app/musica.onda → app/musica.wasm), corrida pelo anfitrião das apps Onda
// (onda/rt/anfitriao.js): ecrãs, estado, navegação e o motor de curadoria. Aqui só fica o que a Onda não tem como
// porta:
//   - o regresso do login do Tidal (#chave=, #ligado=, #erro=) e o link de ligação (?ligar=), antes de a app arrancar;
//   - o "buscar" da porta 102: põe a chave do aparelho nos pedidos ao conector e aceita, além de "caminho" (GET),
//     "MÉTODO caminho" + nova linha + corpo JSON (POST, DELETE) e "IR url" (sair para o login do Tidal);
//   - tocar 30 s de uma faixa (o ▶ com data-previa);
//   - guardar 10 min em memória as faixas e as pré-escutas de cada playlist, e a animação de fechar a folha.
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
    // o fuso do aparelho, para a app saber se é de dia ou de noite pela hora local (a Onda só tem a hora UTC)
    ls.set('fuso', String(-new Date().getTimezoneOffset()));
    const h = new URLSearchParams(location.hash.slice(1)), q = new URLSearchParams(location.search);
    if (h.has('chave')) { ls.set('chave', h.get('chave')); ls.del('codigo'); ls.set('aviso', 'Tidal ligado — este aparelho fica com acesso.'); }
    else if (h.has('ligado')) ls.set('aviso', 'Tidal ligado outra vez.');
    else if (h.has('erro')) ls.set('aviso', 'Não liguei ao Tidal: ' + h.get('erro'));
    if (q.get('ligar')) { ls.set('codigo', q.get('ligar')); q.delete('ligar'); }
    if (q.get('proxy')) { ls.set('proxy', q.get('proxy').replace(/\/+$/, '')); q.delete('proxy'); }
    const resto = q.toString() ? `?${q}` : '';
    if (location.hash || location.search !== resto) history.replaceState(null, '', location.pathname + resto);

    // as faixas e as pré-escutas de cada playlist ficam 10 minutos em memória: abrir outra vez é imediato e não vai à
    // rede (as capas, essas, o navegador já as guarda). Uma mudança na playlist (POST, DELETE) apaga-as.
    const memoria = new Map();
    const MEMORIA_MS = 10 * 60 * 1000;
    const daPlaylist = (alvo) => (/^\/api\/playlists\/([^/?]+)/.exec(alvo) || [])[1];
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
        const ir = () => fetch((ls.get('proxy') || PROXY).replace(/\/+$/, '') + alvo, { method: metodo, headers, body: corpo || undefined });
        const pid = daPlaylist(alvo);
        if (pid && metodo !== 'GET') for (const k of [...memoria.keys()]) if (daPlaylist(k) === pid) memoria.delete(k);
        if (metodo !== 'GET' || !/^\/api\/playlists\/[^/?]+(\/previas)?$/.test(alvo)) return ir();
        const m = memoria.get(alvo);
        if (m && Date.now() - m.em < MEMORIA_MS) return Promise.resolve(new Response(m.texto, { status: 200 }));
        return ir().then(async (r) => { if (r.ok) memoria.set(alvo, { texto: await r.clone().text(), em: Date.now() }); return r; });
    }

    fetch('app/musica.wasm')
        .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.arrayBuffer(); })
        .then((b) => WebAssembly.compile(b))
        .then((mod) => { window.app = window.OndaApp.criar(mod, { buscar, prefixo: PRE }); })
        .catch((e) => {
            document.getElementById('mu-body').innerHTML = '<p class="mu-erro">Não consegui abrir a app: ' + String(e && e.message || e).replace(/[<&]/g, '') + '</p>';
        });
    // ouvir 30 s de uma faixa: o ▶ das faixas na lista (data-previa = a pré-escuta do Deezer que o conector
    // encontrou). Um só leitor para a app toda; tocar outra vez pára. A Onda volta a desenhar o ecrã, por isso a marca de
    // «a tocar» repõe-se depois de cada mudança. (O som não é uma porta da Onda: fica aqui, na casca.)
    const leitor = new Audio();
    leitor.preload = 'none';
    const marcar = () => document.querySelectorAll('[data-previa]').forEach((b) => b.classList.toggle('a-tocar', !leitor.paused && b.dataset.previa === leitor.dataset.src));
    document.addEventListener('click', (e) => {
        const b = e.target.closest && e.target.closest('[data-previa]');
        if (!b) return;
        e.preventDefault();
        e.stopPropagation();
        if (!leitor.paused && leitor.dataset.src === b.dataset.previa) leitor.pause();
        else { leitor.dataset.src = b.dataset.previa; leitor.src = b.dataset.previa; leitor.play().catch(() => {}); }
        marcar();
    }, true);
    for (const ev of ['play', 'pause', 'ended']) leitor.addEventListener(ev, marcar);
    const corpo = document.getElementById('mu-body');
    if (corpo) new MutationObserver(marcar).observe(corpo, { childList: true, subtree: true });
    window.musicaLeitor = leitor; // (para os testes)
    // fechar a folha de uma playlist: primeiro desce (a animação do CSS), depois a Onda fecha-a
    let aFechar = false;
    document.addEventListener('click', (e) => {
        const b = e.target.closest && e.target.closest('.mu-fechar');
        const folha = b && b.closest('.mu-folha');
        if (!folha || aFechar || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        e.preventDefault();
        e.stopPropagation();
        aFechar = true;
        folha.classList.add('a-fechar');
        let feito = false;
        const fim = () => {
            if (feito) return;
            feito = true;
            (document.querySelector('.mu-fechar') || b).click();
            aFechar = false;
        };
        folha.addEventListener('animationend', fim, { once: true });
        setTimeout(fim, 320);
    }, true);
    // a folha é um diálogo: ao abrir, o foco vai para o «fechar»; o Esc fecha; ao fechar, o foco volta ao cartão
    let folhaAberta = null;
    const seguirFolha = () => {
        const f = document.querySelector('.mu-folha .mu-fechar');
        const id = f ? f.dataset.onda : null;
        if (id === folhaAberta) return;
        if (id) f.focus({ preventScroll: true });
        else if (folhaAberta) { const c = document.querySelector(`.mu-pl-a[data-onda="${CSS.escape(folhaAberta)}"]`); if (c) c.focus({ preventScroll: true }); }
        folhaAberta = id;
    };
    if (corpo) new MutationObserver(seguirFolha).observe(corpo, { childList: true, subtree: true });
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        const f = document.querySelector('.mu-folha .mu-fechar');
        if (f) { e.preventDefault(); f.click(); }
    });
    // no iOS, o :active (o botão a afundar quando se toca) só funciona com um touchstart registado
    document.addEventListener('touchstart', () => {}, { passive: true });
    // ao abrir outra vez, começa no topo (o iOS repunha o scroll e o título ficava por baixo das horas)
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
