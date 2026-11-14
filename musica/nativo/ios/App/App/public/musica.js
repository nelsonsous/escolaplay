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
    // os avisos (Web Push): 1 = pode; ios = iPhone fora do ecrã principal (o Safari só os dá à app do ecrã principal);
    // nativo = a app de teste do Xcode (numa app nativa precisam do programa pago da Apple); 0 = este browser não pode
    const nativo = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
    const iOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const ecraPrincipal = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    const temPush = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    ls.set('avisos_ok', nativo ? 'nativo' : temPush ? '1' : iOS && !ecraPrincipal ? 'ios' : '0');
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
        const linha = nl < 0 ? pedido : pedido.slice(0, nl);
        let corpo = nl < 0 ? '' : pedido.slice(nl + 1);
        const esp = linha.indexOf(' ');
        const metodo = esp < 0 ? 'GET' : linha.slice(0, esp), alvo = esp < 0 ? linha : linha.slice(esp + 1);
        if (metodo === 'IR') { location.href = alvo; return Promise.resolve(new Response('')); }
        if (!/^(GET|POST|DELETE)$/.test(metodo) || !alvo.startsWith('/api/')) return Promise.resolve(new Response('', { status: 400 }));
        // a app nativa com os ficheiros lá dentro (capacitor://localhost): o login do Tidal tem de voltar à app, não ao site
        if (alvo === '/api/ligar' && location.protocol === 'capacitor:') { try { corpo = JSON.stringify({ ...JSON.parse(corpo || '{}'), voltar: 'app' }); } catch { /* fica como estava */ } }
        const headers = {};
        const chave = ls.get('chave');
        if (chave) headers.authorization = `Bearer ${chave}`;
        if (corpo) headers['content-type'] = 'application/json';
        emCurso++;
        const fim = () => { emCurso--; ultimaResposta = performance.now(); };
        return fetch((ls.get('proxy') || PROXY).replace(/\/+$/, '') + alvo, { method: metodo, headers, body: corpo || undefined })
            .then((r) => { fim(); return r; }, (e) => { fim(); throw e; });
    }
    // os pedidos à rede em curso: ao trocar de separador, a espreita só sai quando a página nova já tem os dados
    let emCurso = 0, ultimaResposta = 0;

    fetch('app/musica.wasm')
        .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.arrayBuffer(); })
        .then((b) => WebAssembly.compile(b))
        .then((mod) => { window.app = window.OndaApp.criar(mod, { buscar, prefixo: PRE }); verificarAvisos(); })
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

    // os avisos no telemóvel: a Onda desenha o cartão nos Ajustes; aqui fica o que só o browser faz — pedir autorização
    // (logo no toque), assinar no serviço de notificações do telemóvel e entregar a assinatura ao conector
    const b64uBytes = (s) => { const t = s.replace(/-/g, '+').replace(/_/g, '/'); return Uint8Array.from(atob(t + '='.repeat((4 - (t.length % 4)) % 4)), (c) => c.charCodeAt(0)); };
    const motivo = async (r) => { try { return (await r.json()).message || null; } catch { return null; } };
    async function assinatura(criar) {
        const reg = await navigator.serviceWorker.ready;
        let s = await reg.pushManager.getSubscription();
        if (!s && criar) {
            const r = await buscar('GET /api/push/chave');
            if (!r.ok) throw new Error((await motivo(r)) || 'O conector não respondeu.');
            s = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64uBytes((await r.json()).chave) });
        }
        return s;
    }
    function avisosLigar() {
        const perm = Notification.permission === 'granted' ? 'granted' : Notification.requestPermission();
        Promise.resolve(perm).then(async (p) => {
            if (p !== 'granted') throw new Error('Sem autorização: ativa as notificações da Música nas definições do telemóvel.');
            const r = await buscar('POST /api/push\n' + JSON.stringify({ subscription: (await assinatura(true)).toJSON() }));
            if (!r.ok) throw new Error((await motivo(r)) || 'Não consegui ligar os avisos.');
            ls.set('avisos', '1');
            disparar('avisos\tAvisos ligados neste telemóvel.');
        }).catch((e) => disparar('avisos\t' + ((e && e.message) || 'Não consegui ligar os avisos.')));
    }
    async function avisosDesligar() {
        try {
            const s = await assinatura(false);
            if (s) { await buscar('DELETE /api/push\n' + JSON.stringify({ endpoint: s.endpoint })); await s.unsubscribe(); }
        } catch { /* deste lado fica desligado na mesma */ }
        ls.del('avisos');
        disparar('avisos\tAvisos desligados.');
    }
    async function avisosTeste() {
        try {
            const r = await buscar('POST /api/push/teste\n{}');
            if (!r.ok) throw new Error((await motivo(r)) || 'Não consegui enviar.');
            disparar('avisos\tEnviado: deve chegar daqui a uns segundos.');
        } catch (e) { disparar('avisos\t' + ((e && e.message) || 'Não consegui enviar.')); }
    }
    function verificarAvisos() {
        if (!temPush || !ls.get('avisos')) return;
        navigator.serviceWorker.ready.then((reg) => reg.pushManager.getSubscription())
            .then((s) => { if (!s) { ls.del('avisos'); disparar('avisos'); } }).catch(() => {});
    }
    document.addEventListener('click', (e) => {
        const b = e.target.closest && e.target.closest('[data-avisos]');
        if (!b) return;
        e.preventDefault();
        const f = { ligar: avisosLigar, desligar: avisosDesligar, teste: avisosTeste }[b.dataset.avisos];
        if (f) f();
    }, true);

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

    // ---------- mudar de separador: a página segue o dedo e o separador ao lado espreita, colado a ela ----------
    // A marca da barra de baixo (o fundo do separador ativo) desliza com o dedo. Ao largar, a página continua o
    // movimento e o vizinho entra; ao desistir, volta ao sítio com um pequeno ressalto. Tocar na barra faz o mesmo.
    const nav = document.getElementById('mu-nav');
    const espreita = document.createElement('div');
    espreita.id = 'mu-espreita';
    espreita.setAttribute('aria-hidden', 'true');
    espreita.inert = true; // é só uma imagem da página: nada lá dentro se toca, foca ou conta como a página
    espreita.hidden = true; // só aparece durante a troca (sem isto, tapava a página ao abrir)
    document.body.appendChild(espreita);
    const indice = () => separadores().findIndex((b) => b.getAttribute('aria-current') === 'page');
    const marcaEm = (i, solta = true) => { if (!nav) return; nav.classList.toggle('a-arrastar', !solta); nav.style.setProperty('--i', String(i)); };
    if (nav) new MutationObserver(() => { const i = indice(); if (i >= 0 && !nav.classList.contains('a-arrastar')) marcaEm(i); }).observe(nav, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-current'] });
    // o que espreita é o próprio separador: a última vez que se viu (guardado sempre que a Onda o desenha), para não
    // haver nada a trocar quando ele chega. Um separador que ainda não se abriu mostra o cabeçalho dele (o mesmo da página)
    const retratos = new Map();
    let versao = 0, retratar = 0;
    const CABECALHOS = {
        'ir\t1': ['Música', 'Playlists de qualidade para o teu Tidal'],
        'ir\t3': ['Pedir', 'Ao Maestro, que pesquisa e cria no teu Tidal'],
        'ir\t5': ['Ajustes', ''],
    };
    // guarda o separador que está à vista (a folha aberta não conta: é por cima da página)
    const retratar_ = () => {
        const s = separadores()[indice()];
        if (!s || !corpo || document.querySelector('.mu-folha')) return false;
        retratos.set(s.dataset.onda, corpo.innerHTML);
        versao++;
        return true;
    };
    const retratarDepois = () => {
        clearTimeout(retratar);
        // a meio de um gesto ou de uma troca, tenta outra vez daqui a pouco (não se perde o último estado)
        retratar = setTimeout(() => { if (aTrocar || g) retratarDepois(); else retratar_(); }, 250);
    };
    // (o sinal de «a app desenhou» é o evento onda-desenho do anfitrião: a Onda muda só o que é diferente, e um
    // MutationObserver não daria por um desenho que deixou tudo igual)
    if (corpo) corpo.addEventListener('onda-desenho', retratarDepois);
    const prepararEspreita = (alvo) => {
        const k = alvo.dataset.onda, chave = k + '#' + (retratos.has(k) ? versao : 'cab');
        if (espreita.dataset.para === chave) return;
        espreita.dataset.para = chave;
        const pagina = document.createElement('div');
        pagina.className = 'mu-body mu-retrato';
        if (retratos.has(k)) pagina.innerHTML = retratos.get(k);
        else {
            const [t, sub] = CABECALHOS[k] || [alvo.textContent.trim(), ''];
            pagina.innerHTML = '<header class="mu-head"><div><h1></h1><div class="sub"></div></div></header>';
            pagina.querySelector('h1').textContent = t;
            pagina.querySelector('.sub').textContent = sub;
        }
        // é só uma imagem: sem ids repetidos, sem ações, sem foco
        pagina.querySelectorAll('[id]').forEach((e) => e.removeAttribute('id'));
        pagina.querySelectorAll('[data-onda], [data-esq], [tabindex], [autofocus]').forEach((e) => { e.removeAttribute('data-onda'); e.removeAttribute('data-esq'); e.removeAttribute('autofocus'); e.setAttribute('tabindex', '-1'); });
        pagina.querySelectorAll('input, textarea, select, button').forEach((e) => { e.disabled = true; });
        pagina.querySelectorAll('img[loading]').forEach((i) => { i.loading = 'eager'; }); // (as capas já estão em cache)
        espreita.replaceChildren(pagina);
    };
    const largura = () => window.innerWidth || 390;
    // x: onde a página está (px); o vizinho fica colado a ela, do lado de onde vem
    const porPagina = (x, dir, alvo) => {
        if (desvanecer) { desvanecer = null; espreita.getAnimations?.().forEach((a) => a.cancel()); }
        corpo.style.transform = x ? `translateX(${x}px) scale(${1 - Math.min(0.04, Math.abs(x) / largura() * 0.04)})` : '';
        if (alvo) {
            prepararEspreita(alvo);
            espreita.style.transform = `translateX(${x + dir * largura()}px)`;
            espreita.style.opacity = String(Math.min(1, 0.35 + Math.abs(x) / largura()));
            espreita.hidden = false;
        } else espreita.hidden = true;
    };
    const animar = (el, de, ate, ms, curva) => (el.animate && !calmo()
        ? el.animate([{ transform: de }, { transform: ate }], { duration: ms, easing: curva, fill: 'forwards' }).finished.catch(() => {})
        : Promise.resolve());
    let aTrocar = false, desvanecer = null, seguinte = null;
    // a página nova está pronta: sem «A carregar…» e sem pedidos à rede há 120 ms (no máximo 2 s à espera)
    const pronta = () => new Promise((ok) => {
        const t0 = performance.now();
        const ver = () => {
            const agora = performance.now();
            const quieta = emCurso === 0 && agora - ultimaResposta > 120 && agora - t0 > 60 && !corpo.querySelector('.mu-a-carregar');
            if (quieta || agora - t0 > 2000) ok(); else setTimeout(ver, 40);
        };
        setTimeout(ver, 40);
    });
    // larga para o separador alvo: a página sai pelo lado do dedo (à velocidade dele) e o vizinho entra
    async function trocarPara(alvo, dir, x = 0, v = 0) {
        if (aTrocar) return;
        aTrocar = true;
        const W = largura(), resto = W - Math.abs(x);
        const ms = Math.round(Math.max(170, Math.min(320, resto / Math.max(1.6, Math.abs(v)))));
        retratar_(); // o separador que se deixa fica guardado como está agora (para voltar a ele)
        prepararEspreita(alvo);
        espreita.hidden = false;
        espreita.style.opacity = '1';
        marcaEm(separadores().indexOf(alvo));
        corpo.style.transform = '';
        espreita.style.transform = '';
        await Promise.all([
            animar(corpo, `translateX(${x}px)`, `translateX(${-dir * W * 0.6}px) scale(.94)`, ms, 'cubic-bezier(.25, .7, .3, 1)'),
            animar(espreita, `translateX(${x + dir * W}px)`, 'translateX(0px)', ms, 'cubic-bezier(.25, .7, .3, 1)'),
        ]);
        alvo.click();
        corpo.getAnimations?.().forEach((a) => a.cancel());
        aTrocar = false; // já se pode arrastar outra vez: o resto é só a espreita a desvanecer
        // um toque noutro separador a meio da troca não se perde: vai-se para lá agora (a espreita passa a ser essa)
        const outro = seguinte && separadores().find((b) => b.dataset.onda === seguinte);
        seguinte = null;
        if (outro && outro.getAttribute('aria-current') !== 'page') { prepararEspreita(outro); marcaEm(separadores().indexOf(outro)); outro.click(); }
        // o separador novo desenha-se por baixo; a espreita (a mesma página) fica por cima até ele ter os dados, para
        // não se ver o «A carregar…» a piscar; depois desvanece (um arrasto novo interrompe-a)
        const vez = {};
        desvanecer = vez;
        await pronta();
        if (desvanecer !== vez) return;
        const f = espreita.animate && !calmo() ? espreita.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: 'ease-out', fill: 'forwards' }) : null;
        desvanecer = f;
        if (f) await f.finished.catch(() => {});
        if (desvanecer !== f) return;
        desvanecer = null;
        espreita.getAnimations?.().forEach((a) => a.cancel());
        espreita.hidden = true;
        espreita.style.transform = '';
    }
    // desistir: volta ao sítio com um pequeno ressalto
    function voltar(x, dir, alvo) {
        const W = largura();
        corpo.style.transform = '';
        espreita.style.transform = '';
        marcaEm(indice());
        animar(corpo, `translateX(${x}px)`, 'translateX(0px)', 340, 'cubic-bezier(.3, 1.35, .5, 1)').then(() => corpo.getAnimations?.().forEach((a) => a.cancel()));
        if (alvo) animar(espreita, `translateX(${x + dir * W}px)`, `translateX(${dir * W}px)`, 300, 'cubic-bezier(.3, 1.2, .5, 1)').then(() => { espreita.getAnimations?.().forEach((a) => a.cancel()); espreita.hidden = true; });
    }
    // tocar num separador da barra: a mesma troca (sem dedo)
    if (nav) nav.addEventListener('click', (e) => {
        const b = e.target.closest && e.target.closest('[data-onda^="ir"]');
        if (!b || !e.isTrusted) return;
        // a meio de uma troca, um toque na barra não conta (a página que se deixa ainda é a «atual»)
        if (aTrocar) { e.preventDefault(); e.stopPropagation(); seguinte = b.dataset.onda; return; }
        if (calmo() || document.querySelector('.mu-folha')) return;
        const s = separadores(), i = indice(), j = s.indexOf(b);
        if (i < 0 || j < 0 || i === j) return;
        e.preventDefault();
        e.stopPropagation();
        trocarPara(b, j > i ? 1 : -1);
    }, true);

    let g = null;
    const tempo = (e) => (e && e.timeStamp) || performance.now();
    function comecar(e) {
        g = null;
        if (!G || e.touches.length !== 1 || aFechar || aTrocar || !corpo) return;
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
            const alvo = vizinho(G2.dx), dir = G2.dx < 0 ? 1 : -1, x = G.segue(G.SEPARADOR, G2.dx, 0, !!alvo);
            corpo.style.transition = 'none';
            G2.x = x;
            G2.v = (x - (G2.xAnt ?? 0)) / Math.max(1, tempo(null) - (G2.tAnt ?? G2.t0));
            G2.xAnt = x; G2.tAnt = tempo(null);
            porPagina(x, dir, alvo);
            if (alvo) marcaEm(indice() + dir * Math.min(1, Math.abs(x) / largura()), false);
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
            const dir = G2.dx < 0 ? 1 : -1, perto = vizinho(G2.dx);
            const alvo = ok && G.fim(G.SEPARADOR, G2.dx, ms) ? perto : null;
            corpo.style.transition = '';
            if (alvo) trocarPara(alvo, dir, G2.x || 0, G2.v || 0);
            else voltar(G2.x || 0, dir, perto);
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
                let feito = false;
                const pronto = () => { if (feito) return; feito = true; aAtualizar = false; corpo.style.transition = 'transform .2s'; ptrPor(0, ''); };
                // acaba quando a app voltar a desenhar a página (com os dados novos), ou ao fim de 4 s
                corpo.addEventListener('onda-desenho', () => setTimeout(pronto, 150), { once: true });
                setTimeout(pronto, 4000);
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
