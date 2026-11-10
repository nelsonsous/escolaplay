// Música — a casca: só a ponte entre o browser e a Onda. A app — ecrãs, estado, navegação, o motor de curadoria, o
// leitor dos 30 s e a memória de 10 min — é Onda (app/musica.onda → app/musica.wasm), corrida pelo anfitrião das apps
// Onda (onda/rt/anfitriao.js). As decisões dos gestos (que gesto é, quanto segue o dedo, se se confirma) são do motor de
// gestos comum à Música, à Meteo e aos Mercados, também em Onda (onda/rt/gestos.onda → gestos-onda.js).
// Aqui fica só o que o browser só dá ao JavaScript:
//   - o regresso do login do Tidal (#chave=, #ligado=, #erro=) e o link de ligação (?ligar=), antes de a app arrancar;
//   - o "buscar" da porta 102: põe a chave do aparelho nos pedidos ao conector e aceita, além de "caminho" (GET),
//     "MÉTODO caminho" + nova linha + corpo JSON (POST, DELETE) e "IR url" (sair para o login do Tidal);
//   - os toques: o que está debaixo do dedo e mexer no ecrã enquanto o gesto dura (a Onda decide);
//   - o foco da folha (é um diálogo) e o Esc.
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
    // o leitor dos 30 s é o do anfitrião (portas 111/112/116); para os testes, com o nome de antes
    Object.defineProperty(window, 'musicaLeitor', { get: () => (window.app ? window.app.som : null), configurable: true });

    const corpo = document.getElementById('mu-body');
    const calmo = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
    // pede à Onda uma ação (o que um botão com data-onda faria)
    const disparar = (valor) => {
        const t = document.createElement('button');
        t.type = 'button';
        t.hidden = true;
        t.dataset.onda = valor;
        document.body.appendChild(t);
        t.click();
        t.remove();
    };

    // fechar a folha de uma playlist: primeiro desce (a animação do CSS), depois a Onda fecha-a
    let aFechar = false;
    const fecharFolha = (folha, b) => {
        aFechar = true;
        let feito = false;
        const fim = () => {
            if (feito) return;
            feito = true;
            const x = document.querySelector('.mu-fechar') || b;
            if (x) x.click();
            aFechar = false;
        };
        return fim;
    };
    document.addEventListener('click', (e) => {
        const b = e.target.closest && e.target.closest('.mu-fechar');
        const folha = b && b.closest('.mu-folha');
        if (!folha || aFechar || calmo()) return;
        e.preventDefault();
        e.stopPropagation();
        const fim = fecharFolha(folha, b);
        folha.classList.add('a-fechar');
        folha.addEventListener('animationend', fim, { once: true });
        setTimeout(fim, 320);
    }, true);

    // ---------- gestos: a ponte do motor comum (onda/rt/gestos-onda.js) ----------
    // • folha aberta e no topo: puxar para baixo fecha-a;
    // • uma linha com data-esq (playlist, faixa, pedido): para a esquerda faz a ação (data-esq), com o rótulo a vermelho;
    // • na página: para os lados muda de separador; no topo, para baixo atualiza.
    // Os campos e o que já desliza para os lados ficam de fora; a borda esquerda, no Safari, é o «voltar» do browser.
    const G = window.OndaGestos;
    const CAMPO = 'input, textarea, select, .mu-range';
    const separadores = () => [...document.querySelectorAll('#mu-nav [data-onda^="ir"]')];
    const vizinho = (dx) => { const s = separadores(), i = s.findIndex((b) => b.getAttribute('aria-current') === 'page'); return i < 0 ? null : s[i + (dx < 0 ? 1 : -1)] || null; };
    const instalada = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    const deslizaX = (el, ate) => {
        for (; el && el !== ate && el !== document.body; el = el.parentElement) {
            if (el.scrollWidth > el.clientWidth + 2 && /auto|scroll/.test(getComputedStyle(el).overflowX)) return true;
        }
        return false;
    };
    // o indicador de «puxar para atualizar», por cima da página
    const ptr = document.createElement('div');
    ptr.id = 'mu-ptr';
    ptr.setAttribute('aria-hidden', 'true');
    ptr.innerHTML = '<span></span>';
    document.body.appendChild(ptr);
    const ptrPor = (hh, txt) => { ptr.style.height = hh + 'px'; ptr.firstChild.textContent = txt; corpo.style.transform = hh ? `translateY(${hh}px)` : ''; };
    let aAtualizar = false;
    // depois de um gesto, o dedo a sair não conta como toque no que estava debaixo dele
    let semClique = { ate: 0, x: 0, y: 0 };
    document.addEventListener('click', (e) => {
        if (e.isTrusted && Date.now() < semClique.ate && Math.abs(e.clientX - semClique.x) < 30 && Math.abs(e.clientY - semClique.y) < 30) { e.preventDefault(); e.stopPropagation(); }
    }, true);

    let g = null;
    const tempo = (e) => (e && e.timeStamp) || performance.now();
    function comecar(e) {
        g = null;
        if (!G || e.touches.length !== 1 || aFechar || !corpo) return;
        const t = e.target, p = e.touches[0];
        if (!t || !t.closest) return;
        const folha = document.querySelector('.mu-folha');
        if (folha && !folha.contains(t)) return;
        const borda = p.clientX < 24 || p.clientX > innerWidth - 24;
        const linha = !borda && t.closest('[data-esq]');
        let c = 0;
        if (t.closest(CAMPO)) c |= G.CAMPO;
        if (folha) { c |= G.FOLHA; if (folha.scrollTop <= 0) c |= G.TOPO; }
        else if (corpo.contains(t) || borda) {
            if (separadores().length) c |= G.SEPARADORES | G.ATUALIZA;
            if (window.scrollY <= 0) c |= G.TOPO;
        }
        if (linha) c |= G.LINHA;
        if (deslizaX(t, folha || corpo)) c |= G.DESLIZA;
        if (p.clientX < 20 && !instalada()) c |= G.BORDA;
        if (aAtualizar) c |= G.A_ATUALIZAR;
        g = { c, x0: p.clientX, y0: p.clientY, t0: tempo(e), dx: 0, dy: 0, modo: 0, linha, folha, h: 0 };
    }
    const efeito = {
        [1](G2) { const f = G2.folha; f.style.transition = 'none'; f.style.transform = `translateY(${G.segue(G.FECHAR, G2.dy)}px)`; },
        [3](G2) {
            const tem = !!vizinho(G2.dx);
            corpo.style.transition = 'none';
            corpo.style.transform = `translateX(${G.segue(G.SEPARADOR, G2.dx, 0, tem)}px)`;
            corpo.style.opacity = tem ? String(G.opacs(G2.dx)) : '';
        },
        [4](G2) {
            const l = G2.linha, w = l.clientWidth;
            l.classList.add('a-deslizar');
            l.style.transition = 'none';
            l.style.transform = `translateX(${G.segue(G.APAGAR, G2.dx, w)}px)`;
            l.classList.toggle('arma', G.arma(G2.dx, w));
        },
        [5](G2) {
            G2.h = G.segue(G.ATUALIZAR, G2.dy);
            corpo.style.transition = 'none';
            ptrPor(G2.h, G2.h > 49 ? 'Larga para atualizar' : 'Puxa para atualizar');
        },
    };
    function mover(e) {
        if (!g) return;
        const p = e.touches[0];
        g.dx = p.clientX - g.x0;
        g.dy = p.clientY - g.y0;
        if (!g.modo) {
            const m = G.modo(g.c, g.dx, g.dy);
            if (m === G.AINDA) {
                // na folha, no topo e a descer: segura já (no iPhone o deslizar nativo começa cedo e já não se trava)
                if ((g.c & G.FOLHA) && (g.c & G.TOPO) && !(g.c & (G.DESLIZA | G.CAMPO)) && g.dy > 0 && Math.abs(g.dy) >= Math.abs(g.dx) && e.cancelable) e.preventDefault();
                return;
            }
            if (m === G.NENHUM) { g = null; return; }
            g.modo = m;
        }
        if (g.modo !== G.ATUALIZAR && e.cancelable) e.preventDefault();
        efeito[g.modo](g);
    }
    function largar(e, ok = true) {
        if (!g) return;
        const G2 = g;
        g = null;
        if (!G2.modo) return;
        const ms = tempo(e) - G2.t0;
        if (G2.modo !== G.ATUALIZAR) semClique = { ate: Date.now() + 400, x: G2.x0 + G2.dx, y: G2.y0 + G2.dy };
        if (G2.modo === G.FECHAR) {
            const f = G2.folha;
            if (ok && G.fim(G.FECHAR, G2.dy, ms)) {
                const fim = fecharFolha(f, null);
                f.style.transition = 'transform .2s cubic-bezier(.4, 0, 1, 1)';
                f.style.transform = 'translateY(100%)';
                f.addEventListener('transitionend', fim, { once: true });
                setTimeout(fim, 260);
            } else {
                f.style.transition = 'transform .2s cubic-bezier(.2, .8, .2, 1)';
                f.style.transform = '';
                setTimeout(() => { f.style.transition = ''; }, 220);
            }
        } else if (G2.modo === G.SEPARADOR) {
            const alvo = ok && G.fim(G.SEPARADOR, G2.dx, ms) ? vizinho(G2.dx) : null;
            corpo.style.transition = 'transform .2s cubic-bezier(.2, .8, .2, 1), opacity .2s';
            corpo.style.transform = '';
            corpo.style.opacity = '';
            if (alvo) {
                corpo.style.transition = 'none';
                corpo.classList.remove('entra-esq', 'entra-dir');
                void corpo.offsetWidth;
                if (!calmo()) corpo.classList.add(G2.dx < 0 ? 'entra-dir' : 'entra-esq');
                alvo.click();
                setTimeout(() => corpo.classList.remove('entra-esq', 'entra-dir'), 300);
            }
            setTimeout(() => { corpo.style.transition = ''; }, 220);
        } else if (G2.modo === G.APAGAR) {
            const l = G2.linha;
            l.classList.remove('arma');
            if (ok && G.fim(G.APAGAR, G2.dx, ms, l.clientWidth)) {
                l.style.transition = 'transform .18s cubic-bezier(.4, 0, 1, 1)';
                l.style.transform = 'translateX(-35%)';
                setTimeout(() => {
                    disparar(l.dataset.esq);
                    // se a Onda não redesenhar esta linha (ex.: ficou à espera da resposta), volta ao sítio
                    setTimeout(() => { if (l.isConnected) { l.style.transition = 'transform .2s'; l.style.transform = ''; l.classList.remove('a-deslizar'); } }, 400);
                }, 180);
            } else {
                l.style.transition = 'transform .2s cubic-bezier(.2, .8, .2, 1)';
                l.style.transform = '';
                setTimeout(() => { l.style.transition = ''; l.classList.remove('a-deslizar'); }, 220);
            }
        } else if (G2.modo === G.ATUALIZAR) {
            corpo.style.transition = 'transform .2s';
            if (ok && G.fim(G.ATUALIZAR, G2.h, ms)) {
                aAtualizar = true;
                ptrPor(44, 'A atualizar…');
                const pronto = () => { aAtualizar = false; corpo.style.transition = 'transform .2s'; ptrPor(0, ''); };
                const ob = new MutationObserver(() => { ob.disconnect(); setTimeout(pronto, 150); });
                ob.observe(corpo, { childList: true });
                setTimeout(() => { ob.disconnect(); pronto(); }, 4000);
                disparar('recarregar');
            } else ptrPor(0, '');
        }
    }
    document.addEventListener('touchstart', comecar, { passive: true });
    document.addEventListener('touchmove', mover, { passive: false });
    document.addEventListener('touchend', (e) => largar(e, true), { passive: true });
    document.addEventListener('touchcancel', (e) => largar(e, false), { passive: true });
    // se a Onda redesenhar o que está debaixo do dedo a meio do gesto (chegaram as faixas, a lista…), o iOS continua a
    // enviar o gesto ao elemento antigo, que já não está na página e não o passa ao documento: liga-se a ele também
    document.addEventListener('touchstart', (e) => {
        const t = e.target;
        if (!t || !t.addEventListener) return;
        const so = (f) => (ev) => { if (!t.isConnected) f(ev); };
        const m = so(mover);
        const fim = (ev) => {
            so((x) => largar(x, ev.type === 'touchend'))(ev);
            t.removeEventListener('touchmove', m);
            t.removeEventListener('touchend', fim);
            t.removeEventListener('touchcancel', fim);
        };
        t.addEventListener('touchmove', m, { passive: false });
        t.addEventListener('touchend', fim);
        t.addEventListener('touchcancel', fim);
    }, { passive: true });

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
