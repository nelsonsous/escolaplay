// Protótipo visual da Mercados — a casca. As imagens são campos calculados pela Onda (campo.onda → WebAssembly e,
// no fundo do "Hoje", GLSL na placa gráfica). Aqui só se trazem os dados (conector da app e Binance), se copiam os
// píxeis para o ecrã e se passam os gestos à Onda.
(async () => {
    'use strict';
    const P = window.PROTO;
    const $ = (s) => document.querySelector(s);
    const CONECTOR = 'https://mercados-proxy.mercados-proxy.workers.dev';
    const BN_WS = ['wss://data-stream.binance.vision/stream', 'wss://stream.binance.com:9443/stream'];
    const NF = (d) => new Intl.NumberFormat('pt-PT', { minimumFractionDigits: d, maximumFractionDigits: d });
    const pct = (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + NF(2).format(Math.abs(v)) + '%';
    const eur = (v) => NF(v >= 1000 ? 0 : 2).format(v) + ' €';

    // ---------- a Onda ----------
    let mem;
    const sys = (c, a) => {
        switch (Number(c)) {
            case 2: throw { ondaExit: Number(a) };
            case 6: return BigInt(Math.round(performance.now() * 1000));
            case 7: { const need = (Number(a) + 16) * 8, cur = mem.buffer.byteLength; if (need > cur) mem.grow(Math.ceil((need - cur) / 65536)); return BigInt(mem.buffer.byteLength / 8 - 16); }
        }
        return 0n;
    };
    const m1 = (c, x) => [Math.sin, Math.cos, Math.exp, Math.log][Number(c)](x);
    const m2 = (c, x, y) => (Number(c) === 0 ? Math.pow(x, y) : Math.atan2(x, y));
    const bytes = Uint8Array.from(atob(P.wasm), (ch) => ch.charCodeAt(0));
    const X = (await WebAssembly.instantiate(await WebAssembly.compile(bytes), { env: { sys, m1, m2 } })).exports;
    mem = X.memory;
    try { X._start(); } catch (e) { if (!e || e.ondaExit === undefined) throw e; }
    const reais = (end, n) => new Float64Array(mem.buffer, (Number(end) + 16) * 8, n);
    const inteiros = (end, n) => new BigInt64Array(mem.buffer, (Number(end) + 16) * 8, n);

    // qualidade: píxeis por píxel de ecrã (desce sozinha se a máquina não aguentar)
    let escala = Math.min(window.devicePixelRatio || 1, 2);
    const visiveis = new Set();
    const io = new IntersectionObserver((es) => { for (const e of es) (e.isIntersecting ? visiveis.add(e.target) : visiveis.delete(e.target)); });

    // um campo num canvas: a Onda devolve o endereço dos píxeis (uma palavra de 64 bits por píxel; os 4 bytes baixos são RGBA)
    function tela(canvas, desenha) {
        const ctx = canvas.getContext('2d');
        let img = null, w = 0, h = 0;
        io.observe(canvas);
        return {
            canvas,
            get w() { return w; }, get h() { return h; },
            pinta() {
                const cw = Math.max(2, Math.round(canvas.clientWidth * escala)), ch = Math.max(2, Math.round(canvas.clientHeight * escala));
                if (cw !== w || ch !== h) { w = cw; h = ch; canvas.width = w; canvas.height = h; img = ctx.createImageData(w, h); }
                const end = desenha(BigInt(w), BigInt(h));
                const src = new Uint32Array(mem.buffer, (Number(end) + 16) * 8, w * h * 2), dst = new Uint32Array(img.data.buffer);
                for (let i = 0, n = w * h; i < n; i++) dst[i] = src[i << 1];
                ctx.putImageData(img, 0, 0);
            },
        };
    }

    // ---------- gráficos vivos ----------
    function grafico(g, canvas) {
        const t = tela(canvas, (w, h) => X.gdesenha(g, w, h));
        return {
            tela: t,
            serie(pontos, base, vivo) {
                const max = 560, passo = Math.max(1, Math.ceil(pontos.length / max));
                const v = pontos.filter((_, i) => (pontos.length - 1 - i) % passo === 0);
                reais(X.galvo(g), v.length).set(v);
                X.gfixa(g, BigInt(v.length), base || 0, vivo ? 1n : 0n);
            },
            tique: (p) => X.gtique(g, p),
            junta: (p) => X.gjunta(g, p),
            passo: (dt) => X.gpasso(g, dt),
        };
    }
    const G1 = grafico(X.g1(), $('#c-btc')), G2 = grafico(X.g2(), $('#c-vwce'));
    const estado = { btc: null, btcBase: null, vivo: false, demo: false };
    function mostraBtc(p) {
        const el = $('#p-btc'), antes = estado.btc;
        estado.btc = p;
        el.textContent = eur(p);
        if (antes != null && p !== antes) { el.classList.remove('sobe', 'desce'); void el.offsetWidth; el.classList.add(p > antes ? 'sobe' : 'desce'); }
        if (estado.btcBase) { const v = (p / estado.btcBase - 1) * 100; const c = $('#v-btc'); c.textContent = pct(v) + ' hoje'; c.className = 'var ' + (v >= 0 ? 'verde' : 'vermelho'); }
    }
    async function cotacoes(simbolo, periodo) {
        const r = await fetch(`${CONECTOR}/quotes?symbols=${encodeURIComponent(simbolo)}&range=${periodo}`);
        const q = (await r.json()).quotes[0];
        if (!q || q.error || !q.series || q.series.length < 3) throw new Error('sem dados de ' + simbolo);
        return q;
    }
    let velaBtc = 0; // início (s) da vela de 5 minutos em curso
    cotacoes('BTC-EUR', '1d').then((q) => {
        const s = q.series;
        estado.btcBase = s[0][1]; // cripto: a variação conta 24 h
        G1.serie(s.map((p) => p[1]), estado.btcBase, true);
        velaBtc = Math.floor(s[s.length - 1][0] / 300) * 300;
        mostraBtc(q.price);
        estado.sigma = Math.sqrt(s.slice(1).reduce((a, p, i) => a + (p[1] / s[i][1] - 1) ** 2, 0) / (s.length - 1));
    }).catch((e) => { $('#p-btc').textContent = '—'; $('#v-btc').textContent = e.message; });
    cotacoes('VWCE.DE', '1mo').then((q) => {
        const s = q.series, p0 = s[0][1], v = (q.price / p0 - 1) * 100;
        G2.serie(s.map((p) => p[1]), 0, false);
        $('#p-vwce').textContent = eur(q.price);
        const c = $('#v-vwce'); c.textContent = pct(v) + ' num mês'; c.className = 'var ' + (v >= 0 ? 'verde' : 'vermelho');
    }).catch((e) => { $('#p-vwce').textContent = '—'; $('#v-vwce').textContent = e.message; });

    // ---------- mapa do mercado ----------
    const U = P.uni, N = U.s.length, M = X.mapa();
    reais(X.malvo(M), N).set(U.d);
    inteiros(X.mtipos(M), N).set(U.t.map(BigInt));
    const cMapa = $('#c-mapa');
    const COLS = 36;
    const linhas = Number(X.marruma(M, BigInt(N), BigInt(COLS)));
    const lado0 = () => cMapa.clientWidth / COLS;
    cMapa.style.height = Math.ceil(linhas * (cMapa.clientWidth / COLS)) + 'px';
    const vista = { z: 1, ox: 0, oy: 0 };
    function aplicaVista() {
        const L = lado0() * vista.z, wCss = cMapa.clientWidth, hCss = cMapa.clientHeight;
        vista.ox = Math.min(0, Math.max(wCss - COLS * L, vista.ox));
        vista.oy = Math.min(0, Math.max(hCss - linhas * L, vista.oy));
        X.mvista(M, L * escala, vista.ox * escala, vista.oy * escala);
        cMapa.style.touchAction = vista.z > 1.01 ? 'none' : 'pan-y';
        $('#m-repor').hidden = vista.z <= 1.01;
    }
    const TMapa = tela(cMapa, (w, h) => X.mdesenha(M, w, h));
    function zoom(fator, cx, cy) {
        const z = Math.min(9, Math.max(1, vista.z * fator)), k = z / vista.z;
        vista.ox = cx - (cx - vista.ox) * k; vista.oy = cy - (cy - vista.oy) * k; vista.z = z;
        aplicaVista(); etiqueta(-1);
    }
    function etiqueta(a, x, y) {
        const el = $('#m-etq');
        if (a < 0) { el.hidden = true; X.mtoque(M, -1, -1); return; }
        const d = reais(X.malvo(M), N)[a];
        el.innerHTML = `<b></b><small></small><span class="${d >= 0 ? 'verde' : 'vermelho'}">${pct(d)} hoje</span>${U.y[a] == null ? '' : `<i>${pct(U.y[a])} num ano</i>`}`;
        el.querySelector('b').textContent = U.n[a];
        el.querySelector('small').textContent = U.s[a] + ' · ' + ['ETF', 'Cripto', 'Ação'][U.t[a]];
        el.hidden = false;
        const larg = el.offsetWidth, alt = el.offsetHeight, wCss = cMapa.clientWidth;
        el.style.left = Math.min(wCss - larg, Math.max(0, x - larg / 2)) + 'px';
        el.style.top = (y - alt - 14 < 0 ? y + 18 : y - alt - 14) + 'px';
    }
    // gestos: um dedo arrasta (com o mapa aproximado) ou toca; dois dedos aproximam; a roda do rato também
    const dedos = new Map();
    let gesto = null;
    const pos = (e) => { const r = cMapa.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    cMapa.addEventListener('pointerdown', (e) => {
        dedos.set(e.pointerId, pos(e));
        if (dedos.size === 1) gesto = { tipo: 'toque', p0: pos(e), t0: performance.now(), mexeu: 0 };
        else if (dedos.size === 2) { const [a, b] = [...dedos.values()]; gesto = { tipo: 'pinca', d0: Math.hypot(a[0] - b[0], a[1] - b[1]) }; }
        try { cMapa.setPointerCapture(e.pointerId); } catch { /* sem captura */ }
    });
    cMapa.addEventListener('pointermove', (e) => {
        if (!dedos.has(e.pointerId) || !gesto) return;
        const ant = dedos.get(e.pointerId), p = pos(e);
        dedos.set(e.pointerId, p);
        if (gesto.tipo === 'pinca' && dedos.size === 2) {
            const [a, b] = [...dedos.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
            if (gesto.d0 > 0) zoom(d / gesto.d0, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
            gesto.d0 = d;
        } else if (gesto.tipo === 'toque') {
            gesto.mexeu += Math.abs(p[0] - ant[0]) + Math.abs(p[1] - ant[1]);
            if (vista.z > 1.01) { vista.ox += p[0] - ant[0]; vista.oy += p[1] - ant[1]; aplicaVista(); if (gesto.mexeu > 8) etiqueta(-1); }
        }
    });
    const larga = (e) => {
        const p = dedos.get(e.pointerId);
        dedos.delete(e.pointerId);
        if (gesto && gesto.tipo === 'toque' && p && gesto.mexeu < 8 && performance.now() - gesto.t0 < 600) {
            const a = Number(X.mtoque(M, p[0] * escala, p[1] * escala));
            etiqueta(a, p[0], p[1]);
        }
        if (!dedos.size) gesto = null;
    };
    cMapa.addEventListener('pointerup', larga);
    cMapa.addEventListener('pointercancel', (e) => { dedos.delete(e.pointerId); if (!dedos.size) gesto = null; });
    cMapa.addEventListener('wheel', (e) => { e.preventDefault(); const [x, y] = pos(e); zoom(Math.exp(-e.deltaY / 240), x, y); }, { passive: false });
    cMapa.addEventListener('dblclick', (e) => { const [x, y] = pos(e); zoom(vista.z > 1.5 ? 1 / vista.z : 3, x, y); });
    $('#m-repor').addEventListener('click', () => { vista.z = 1; vista.ox = 0; vista.oy = 0; aplicaVista(); etiqueta(-1); });
    aplicaVista();

    // ---------- "Hoje": o que o mapa diz, e o fundo que respira (placa gráfica) ----------
    const sobe = U.d.filter((v) => v > 0).length, ord = U.d.slice().sort((a, b) => a - b), med = ord[ord.length >> 1];
    const humor = Math.max(-1, Math.min(1, (sobe / N - 0.5) * 3));
    $('#h-humor').textContent = humor > 0.25 ? 'Otimista' : humor < -0.25 ? 'Pessimista' : 'Misto';
    $('#h-humor').className = humor > 0.25 ? 'verde' : humor < -0.25 ? 'vermelho' : '';
    $('#h-1').textContent = `${Math.round(sobe / N * 100)}% dos ${NF(0).format(N)} ativos sobem · mediana ${pct(med)}`;
    const maior = U.d.indexOf(Math.max(...U.d)), menor = U.d.indexOf(Math.min(...U.d));
    $('#h-2').textContent = `${U.n[maior]} ${pct(U.d[maior])} · ${U.n[menor]} ${pct(U.d[menor])}`;
    const cF = $('#c-fundo');
    const gl = cF.getContext('webgl2', { antialias: false });
    let uFundo = null;
    if (gl) {
        const sh = (tipo, src) => { const s = gl.createShader(tipo); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
        try {
            const pr = gl.createProgram();
            gl.attachShader(pr, sh(gl.VERTEX_SHADER, '#version 300 es\nin vec2 p;void main(){gl_Position=vec4(p,0.,1.);}'));
            gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, P.glsl));
            gl.linkProgram(pr); gl.useProgram(pr);
            gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
            gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
            uFundo = gl.getUniformLocation(pr, 'u');
            io.observe(cF);
        } catch (e) { console.warn('fundo sem placa gráfica:', e.message); }
    }
    function pintaFundo(t) {
        if (!uFundo || !visiveis.has(cF)) return;
        const w = Math.round(cF.clientWidth * escala), h = Math.round(cF.clientHeight * escala);
        if (cF.width !== w || cF.height !== h) { cF.width = w; cF.height = h; }
        gl.viewport(0, 0, w, h);
        gl.uniform1fv(uFundo, new Float32Array([t / 1000, w, h, humor, 0, 0, 0, 0]));
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    // ---------- preços ao vivo (Binance); sem ligação, uma demonstração com a volatilidade real do dia ----------
    const cripto = new Map(); // "BTC" → índice no mapa
    U.s.forEach((s, i) => { if (U.t[i] === 1) cripto.set(s.split('-')[0].replace(/\d+$/, ''), i); });
    let ultimoWs = 0, pendente = null;
    function tique(p, seg) {
        if (!velaBtc) return;
        if (seg >= velaBtc + 300) { velaBtc = Math.floor(seg / 300) * 300; G1.junta(p); } else pendente = p;
        mostraBtc(p);
    }
    function liga(i) {
        let ws;
        try { ws = new WebSocket(BN_WS[i % BN_WS.length] + '?streams=btceur@trade/!miniTicker@arr'); } catch { return; }
        ws.onmessage = (ev) => {
            const m = JSON.parse(ev.data), d = m.data;
            ultimoWs = performance.now();
            if (!estado.vivo) { estado.vivo = true; estado.demo = false; $('#e-vivo').textContent = 'ao vivo'; $('#e-vivo').className = 'vivo'; }
            if (Array.isArray(d)) {
                for (const k of d) {
                    const b = /^(.+)(EUR)$/.exec(k.s);
                    if (!b || !cripto.has(b[1])) continue;
                    const o = +k.o, c = +k.c;
                    if (o > 0) { const a = cripto.get(b[1]), v = (c / o - 1) * 100; if (Math.abs(reais(X.malvo(M), N)[a] - v) > 0.004) X.mpoe(M, BigInt(a), v); }
                }
            } else if (d && d.p) tique(+d.p, d.T / 1000);
        };
        ws.onclose = () => { estado.vivo = false; setTimeout(() => liga(i + 1), 2500); };
        ws.onerror = () => { try { ws.close(); } catch { /* já fechada */ } };
    }
    liga(0);
    setInterval(() => {
        if (estado.vivo || performance.now() - ultimoWs < 4000 || estado.btc == null) return;
        if (!estado.demo) { estado.demo = true; $('#e-vivo').textContent = 'demonstração (sem ligação à Binance)'; $('#e-vivo').className = 'demo'; }
    }, 1000);
    // demonstração: passos aleatórios com o desvio dos retornos de 5 minutos de hoje
    (function demo() {
        setTimeout(demo, 500 + Math.random() * 900);
        if (!estado.demo || estado.btc == null) return;
        const g = () => (Math.random() + Math.random() + Math.random() - 1.5) * 1.15;
        tique(estado.btc * (1 + g() * (estado.sigma || 0.001) * 0.45), Date.now() / 1000);
        for (let k = 0; k < 3; k++) {
            const a = [...cripto.values()][Math.floor(Math.random() * cripto.size)], v = reais(X.malvo(M), N)[a];
            X.mpoe(M, BigInt(a), v + g() * 0.25);
        }
    })();

    // ---------- o ciclo ----------
    let antes = performance.now(), custo = 0, quadros = 0, impar = false, medir = 0, fpsT = antes, fpsN = 0;
    function quadro(agora) {
        requestAnimationFrame(quadro);
        const dt = Math.min(100, agora - antes);
        antes = agora;
        if (document.hidden) return;
        const t0 = performance.now();
        if (pendente != null) { G1.tique(pendente); pendente = null; }
        G1.passo(dt); G2.passo(dt); X.mpasso(M, dt);
        if (visiveis.has(G1.tela.canvas)) G1.tela.pinta();
        if (visiveis.has(G2.tela.canvas)) G2.tela.pinta();
        impar = !impar;
        if (visiveis.has(cMapa) && (impar || gesto)) TMapa.pinta();
        pintaFundo(agora);
        const ms = performance.now() - t0;
        custo += ms; quadros++; fpsN++;
        // se a máquina não aguenta, menos píxeis (a imagem estica; o movimento fica fluido)
        if (++medir === 45) { const m = custo / quadros; if (m > 13 && escala > 1) { escala = Math.max(1, escala - 0.5); aplicaVista(); } medir = 0; custo = 0; quadros = 0; $('#rodape-ms').textContent = NF(1).format(m) + ' ms por imagem'; }
        if (agora - fpsT > 1000) { $('#rodape-fps').textContent = Math.round(fpsN * 1000 / (agora - fpsT)) + ' imagens/s'; fpsT = agora; fpsN = 0; }
    }
    requestAnimationFrame(quadro);
    // para os testes: o fundo desenhado agora, lido da placa gráfica (o canvas WebGL não guarda a imagem entre quadros)
    const fundoPx = () => { if (!uFundo) return null; visiveis.add(cF); pintaFundo(performance.now()); const w = cF.width, h = cF.height, px = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px); return { w, h, px }; };
    window.__proto = { X, estado, vista, zoom, fundoPx, get escala() { return escala; } };
})().catch((e) => { document.body.insertAdjacentHTML('beforeend', `<p class="erro">Não deu para arrancar: ${String(e && e.message || e)}</p>`); });
