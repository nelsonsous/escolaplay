// Compras — a casca: só a ponte entre o browser e a Onda. A app (ecrãs, estado, a lista e as mudanças por enviar) é
// Onda (app/compras.onda → app/compras.wasm), corrida pelo anfitrião das apps Onda (onda/rt/anfitriao.js).
// Aqui fica só o que o browser só dá ao JavaScript:
//   - o link de convite (?casa=CÓDIGO) e outro conector (?proxy=…), antes de a app arrancar;
//   - o "buscar" da porta 102: põe a chave do aparelho nos pedidos ao conector e aceita, além de "caminho" (GET),
//     "MÉTODO caminho" + nova linha + corpo JSON (POST);
//   - o Enter nos campos (juntar, entrar) e o Esc (fechar a folha);
//   - a fotografia do talão (reduzida aqui e mandada ao conector).
// O armazém da app (portas 105/106) usa o prefixo "compras:".
(function () {
    'use strict';
    const PROXY = 'https://compras.compras-nelson.workers.dev';
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
        const ir = (b) => fetch((ls.get('proxy') || PROXY) + alvo, { method: metodo, headers, body: b || undefined });
        if (alvo === '/api/receita') return legendaAqui(corpo).then(ir, () => ir(corpo));
        return ir(corpo);
    }
    // a receita de um vídeo do TikTok: a legenda lê-se aqui, no telemóvel, pela ligação oficial (oEmbed), porque o
    // TikTok responde sem ela ao conector (um centro de dados); se não der, o conector tenta e diz-o
    function legendaAqui(corpo) {
        const c = JSON.parse(corpo || '{}');
        if (!c.url || !/^https:\/\/([a-z]+\.)?tiktok\.com\//i.test(c.url)) return Promise.resolve(corpo);
        return fetch('https://www.tiktok.com/oembed?url=' + encodeURIComponent(c.url), { signal: AbortSignal.timeout(8000) })
            .then((r) => (r.ok ? r.json() : {}))
            .then((o) => (o && o.title ? JSON.stringify({ ...c, legenda: o.title, autor: o.author_name }) : corpo), () => corpo);
    }

    fetch('app/compras.wasm?v=0.52.0')
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
    // as folhas (.cartao) fecham-se também a puxar para baixo, como no telemóvel: só quando a folha está no topo (senão
    // é rolar) e o gesto é mais vertical do que horizontal (as filas de escolhas rolam para o lado); a folha acompanha o
    // dedo e, passados 90 px (ou um puxão rápido), fecha
    let puxa = null;
    document.addEventListener('touchstart', (e) => {
        const c = e.target && e.target.closest ? e.target.closest('.cartao') : null;
        puxa = c && c.scrollTop <= 0 && e.touches.length === 1 ? { c, x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now(), dy: 0, ativo: false } : null;
    }, { passive: true });
    document.addEventListener('touchmove', (e) => {
        if (!puxa) return;
        const dx = e.touches[0].clientX - puxa.x, dy = e.touches[0].clientY - puxa.y;
        if (!puxa.ativo) {
            if (Math.abs(dy) < 8 && Math.abs(dx) < 8) return;
            if (dy <= 0 || Math.abs(dx) > Math.abs(dy) || puxa.c.scrollTop > 0) { puxa = null; return; }
            puxa.ativo = true;
            puxa.c.style.transition = 'none';
        }
        e.preventDefault();
        puxa.dy = Math.max(0, dy);
        puxa.c.style.transform = `translateY(${puxa.dy}px)`;
    }, { passive: false });
    document.addEventListener('touchend', () => {
        if (!puxa || !puxa.ativo) { puxa = null; return; }
        const { c, dy, t } = puxa;
        puxa = null;
        c.style.transition = 'transform 0.18s ease-out';
        if (dy > 90 || (dy > 30 && Date.now() - t < 250)) {
            c.style.transform = 'translateY(100%)';
            // cada folha tem a sua forma de fechar: a do ✕ dela (fecha, fechat, ntf, rcf)
            const x = c.querySelector('.fechar[data-onda]');
            setTimeout(() => evento(x ? x.dataset.onda : 'fecha:0'), 150);
        } else c.style.transform = '';
    });

    // na lista, deslizar uma coisa para a esquerda tira-a (como o 🗑): a linha acompanha o dedo e, passados 100 px,
    // sai; só se o gesto for mais horizontal do que vertical (senão é rolar a lista)
    let desliza = null;
    document.addEventListener('touchstart', (e) => {
        const li = e.target && e.target.closest ? e.target.closest('.lista .item, li.item') : null;
        desliza = li && e.touches.length === 1 ? { li, x: e.touches[0].clientX, y: e.touches[0].clientY, dx: 0, ativo: false } : null;
    }, { passive: true });
    document.addEventListener('touchmove', (e) => {
        if (!desliza) return;
        const dx = e.touches[0].clientX - desliza.x, dy = e.touches[0].clientY - desliza.y;
        if (!desliza.ativo) {
            if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
            if (dx >= 0 || Math.abs(dy) > Math.abs(dx)) { desliza = null; return; }
            desliza.ativo = true;
            desliza.li.style.transition = 'none';
        }
        e.preventDefault();
        desliza.dx = Math.min(0, dx);
        desliza.li.style.transform = `translateX(${desliza.dx}px)`;
        desliza.li.style.background = 'rgba(220, 60, 60, 0.18)';
    }, { passive: false });
    document.addEventListener('touchend', () => {
        if (!desliza || !desliza.ativo) { desliza = null; return; }
        const { li, dx } = desliza;
        desliza = null;
        li.style.transition = 'transform 0.18s ease-out';
        const b = li.querySelector('.tira[data-onda]');
        if (dx < -100 && b) {
            li.style.transform = 'translateX(-110%)';
            setTimeout(() => evento(b.dataset.onda), 150);
        } else { li.style.transform = ''; li.style.background = ''; }
    });

    // o talão: a fotografia reduz-se aqui (no máximo 1600 px, JPEG) e vai para o conector; a app só mostra o resultado
    function reduzir(ficheiro) {
        return new Promise((ok, falha) => {
            const img = new Image();
            img.onload = () => {
                const f = Math.min(1, 1600 / Math.max(img.width, img.height));
                const c = document.createElement('canvas');
                c.width = Math.round(img.width * f); c.height = Math.round(img.height * f);
                c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
                URL.revokeObjectURL(img.src);
                ok(c.toDataURL('image/jpeg', 0.75));
            };
            img.onerror = () => falha(new Error('não é uma imagem'));
            img.src = URL.createObjectURL(ficheiro);
        });
    }
    document.addEventListener('change', (e) => {
        const campo = e.target;
        if (!campo || !campo.matches || !campo.matches('[data-talao]') || !campo.files || !campo.files[0]) return;
        const ficheiro = campo.files[0];
        campo.value = '';
        evento('talao:0');
        reduzir(ficheiro)
            .then((imagem) => buscar('POST /api/talao\n' + JSON.stringify({ imagem })))
            .then((r) => r.text())
            .catch((err) => JSON.stringify({ erro: String((err && err.message) || err) }))
            .then((t) => { ls.set('talao', t); evento('talao:1'); });
    });
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js');
})();
