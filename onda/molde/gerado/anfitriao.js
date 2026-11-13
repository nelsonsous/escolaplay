// Anfitrião de apps Onda — browser e Node. Corre um módulo WebAssembly gerado pela Onda (ondac -w) como uma app:
// o `main` corre uma vez (preparar o estado); depois cada evento chama uma função exportada da Onda (o ondac -w
// exporta todas as funções com o seu nome). A memória do módulo fica viva entre chamadas: é o estado da app.
//
// Portas para apps (Y c a b), além das do runtime (0–9). Um TEXTO é um endereço t com M[t] = fim, e os bytes
// (UTF-8, um por palavra) em M[t+1 .. M[t]-1] — exatamente o que o `O t` deixa ao desviar a saída para a memória.
//   100 html     sel txt  → innerHTML do primeiro elemento `sel` (seletor CSS) = txt          → 1 se existe, 0 se não
//   101 ouvir    tipo fn  → em cada evento `tipo` ("click", "input"…) num elemento com data-onda, chama a função
//                           fn(t), com t = valor de data-onda (+ "\t" + valor do campo, nos eventos de campos)
//   102 buscar   url fn   → fetch(url); no fim chama fn(t, estado): t = corpo (texto), estado = HTTP (0 = falhou)
//   103 relogio  ms fn    → chama fn(0) a cada ms milissegundos; devolve o id (para 104)
//   104 parar    id 0     → para um relógio
//   105 ler      chave 0  → texto guardado (localStorage no browser, memória no Node) ou 0 se não há
//   106 gravar   chave t  → guarda t (0 apaga)
//   107 log      t 0      → console.log(t)
//   108 agora    0 0      → milissegundos desde 1970 (Date.now)
//   109 aleat    n 0      → inteiro aleatório em [0, n)
//   110 titulo   t 0      → document.title
//   111 som      url 0    → toca a url (um só leitor para a app); se já é ela a tocar, pára        → 1 a tocar, 0 parado
//   112 somfim   fn 0     → chama fn(0) quando o som pára sem ser pela app (acabou, erro, o sistema parou-o)
//   113 guardar  chave t  → guarda t na memória do anfitrião (some ao fechar a app), com a hora
//   114 lembrar  chave ms → o texto guardado há menos de ms milissegundos, ou 0
//   115 esquecer 0 0      → apaga tudo o que se guardou com 113
//   116 soma     0 0      → a url que está a tocar (texto), ou 0
//   117 buscam   u fn     → u = "url\tms": como o 102, mas se a resposta está guardada (113) há menos de ms, dá-a já
//                           (estado 200, sem ir à rede); senão vai à rede e guarda-a, se vier 200. A app decide o quê e o
//                           prazo; 115 esquece
// Os nomes de funções (fn) são textos com o nome de uma função da Onda (ex.: "clique").
// Memória: cada texto que o anfitrião entrega é reservado com o alocador do runtime (_oa). Para não crescer sem fim,
// a app marca o monte antes de um evento e solta-o no fim (ver `marca`/`solta` em lib/app.onda).
(function (raiz) {
    'use strict';
    const enc = new TextEncoder(), dec = new TextDecoder();

    function dig15(x) {
        const dv = new DataView(new ArrayBuffer(8)); dv.setFloat64(0, x);
        const hi = dv.getUint32(0), lo = dv.getUint32(4), ex = (hi >>> 20) & 2047;
        let mt = (BigInt(hi & 0xfffff) << 32n) | BigInt(lo), q;
        if (ex) { mt |= 1n << 52n; q = ex - 1075; } else q = -1074;
        let na = mt, nb = 1n;
        if (q >= 0) na <<= BigInt(q); else nb <<= BigInt(-q);
        let e = Number(x.toExponential(14).split('e')[1]);
        if (e >= 0) nb *= 10n ** BigInt(e); else na *= 10n ** BigInt(-e);
        if (na < nb) { na *= 10n; e--; }
        if (na >= 10n * nb) { nb *= 10n; e++; }
        const num = na * 10n ** 14n;
        let D = num / nb; const r = num % nb;
        if (2n * r > nb || (2n * r === nb && (D & 1n))) D += 1n;
        if (D >= 10n ** 15n) { D /= 10n; e++; }
        return [D.toString(), e];
    }
    // o %.15g do C (o runtime da Onda pede-o ao anfitrião para imprimir reais com G)
    function cfmt(x) {
        if (Number.isNaN(x)) return 'nan';
        if (!Number.isFinite(x)) return x < 0 ? '-inf' : 'inf';
        if (x === 0) return Object.is(x, -0) ? '-0' : '0';
        const sg = x < 0 ? '-' : '';
        const [d, e] = dig15(Math.abs(x));
        const tira = (t) => (t.includes('.') ? t.replace(/0+$/, '').replace(/\.$/, '') : t);
        if (e >= -4 && e < 15) return sg + tira(e >= 0 ? d.slice(0, e + 1) + '.' + d.slice(e + 1) : '0.' + '0'.repeat(-e - 1) + d);
        return sg + tira(d[0] + '.' + d.slice(1)) + 'e' + (e < 0 ? '-' : '+') + String(Math.abs(e)).padStart(2, '0');
    }

    // Cria a app. `bytes`: o módulo (Uint8Array) ou um WebAssembly.Module já compilado.
    // opcoes: { documento, armazem (objeto chave→texto), buscar (fetch), registo (função de log), prefixo (localStorage) }
    function criar(bytes, opcoes = {}) {
        const doc = opcoes.documento || (typeof document !== 'undefined' ? document : null);
        const mem0 = {};
        const ls = opcoes.armazem || (typeof localStorage !== 'undefined' ? null : mem0);
        const pre = opcoes.prefixo || 'onda:';
        const buscar = opcoes.buscar || (typeof fetch !== 'undefined' ? fetch.bind(raiz) : null);
        const registo = opcoes.registo || ((t) => console.log(t));
        let mem = null, ex = null, saida = [], m8 = null, m32 = null;
        const W = (a, n) => new BigInt64Array(mem.buffer, (Number(a) + 16) * 8, n);
        // vistas de bytes e de inteiros de 32 bits sobre a memória (refeitas quando ela cresce): o byte de um texto é o
        // byte baixo da sua palavra, e lê-se e escreve-se sem um BigInt por byte
        const vistas = () => { if (!m8 || m8.buffer !== mem.buffer) { m8 = new Uint8Array(mem.buffer); m32 = new Int32Array(mem.buffer); } };
        // n bytes, um por palavra, desde M[a]
        const bytesDe = (a, n) => { vistas(); const u = new Uint8Array(n); for (let i = 0, o = (a + 16) * 8; i < n; i++, o += 8) u[i] = m8[o]; return u; };
        const ler = (t) => {
            t = Number(t);
            if (!t) return '';
            const fim = Number(W(t, 1)[0]), n = Math.max(0, fim - t - 1);
            return dec.decode(bytesDe(t + 1, n));
        };
        // escreve um texto na memória da Onda (reservado com o _oa do runtime) e devolve o endereço
        const escrever = (s) => {
            const u = typeof s === 'string' ? enc.encode(s) : s;
            const t = Number(ex._oa(BigInt(u.length + 1)));
            vistas();
            W(t, 1)[0] = BigInt(t + 1 + u.length);
            for (let i = 0, w = (t + 17) * 2; i < u.length; i++, w += 2) { m32[w] = u[i]; m32[w + 1] = 0; }
            return BigInt(t);
        };
        const chamar = (nome, ...args) => {
            const f = ex[nome];
            if (typeof f !== 'function') { registo(`onda: não há a função ${nome}`); return; }
            try { f(...args); } catch (e) { if (!e || e.ondaExit === undefined) throw e; }
            if (ex._fl) ex._fl();
            if (saida.length) { registo(saida.join('')); saida = []; }
        };
        const relogios = new Map();
        let nr = 0;
        // o som (111/112/116): um leitor só, criado ao primeiro uso (ou o das opções, p. ex. num teste)
        let leitor = opcoes.som || null, somFim = '';
        const som = () => {
            if (!leitor && typeof Audio !== 'undefined') leitor = new Audio();
            if (leitor && !leitor.__onda) {
                leitor.__onda = true;
                if ('preload' in leitor) leitor.preload = 'none';
                if (leitor.addEventListener) for (const ev of ['ended', 'pause', 'error']) leitor.addEventListener(ev, () => { if (somFim) chamar(somFim, 0n); });
            }
            return leitor;
        };
        const aTocar = () => (leitor && !leitor.paused && leitor.__url ? leitor.__url : '');
        const memoria = new Map(); // 113/114/115
        const sys = (c, a, b) => {
            switch (Number(c)) {
                case 0: saida.push(dec.decode(bytesDe(Number(a), Number(b)))); return 0n;
                case 1: return -1n;
                case 2: throw { ondaExit: Number(a) };
                case 3: return 1n;
                case 4: return 0n;
                case 5: { const x = new Float64Array(new BigInt64Array([a]).buffer)[0], t = cfmt(x), v = W(b, t.length); for (let i = 0; i < t.length; i++) v[i] = BigInt(t.charCodeAt(i)); return BigInt(t.length); }
                case 6: return BigInt(Math.round((performance.timeOrigin + performance.now()) * 1000));
                case 7: { const need = (Number(a) + 16) * 8, cur = mem.buffer.byteLength; if (need > cur) mem.grow(Math.ceil((need - cur) / 65536)); return BigInt(mem.buffer.byteLength / 8 - 16); }
                case 100: { const el = doc && doc.querySelector(ler(a)); if (!el) return 0n; el.innerHTML = ler(b); return 1n; }
                case 101: {
                    const tipo = ler(a), fn = ler(b);
                    if (doc) doc.addEventListener(tipo, (e) => {
                        const el = e.target && e.target.closest ? e.target.closest('[data-onda]') : null;
                        if (!el) return;
                        const v = el.dataset.onda + ('value' in el && tipo !== 'click' ? '\t' + el.value : '');
                        chamar(fn, escrever(v));
                    });
                    return 0n;
                }
                case 102: {
                    const url = ler(a), fn = ler(b);
                    if (!buscar) { chamar(fn, escrever(''), 0n); return 0n; }
                    buscar(url).then(async (r) => chamar(fn, escrever(new Uint8Array(await r.arrayBuffer())), BigInt(r.status)))
                        .catch(() => chamar(fn, escrever(''), 0n));
                    return 0n;
                }
                case 103: { const fn = ler(b), id = ++nr; relogios.set(id, setInterval(() => chamar(fn, 0n), Number(a))); return BigInt(id); }
                case 104: { clearInterval(relogios.get(Number(a))); relogios.delete(Number(a)); return 0n; }
                case 105: { const k = pre + ler(a); const v = ls ? ls[k] : localStorage.getItem(k); return v == null ? 0n : escrever(v); }
                case 106: { const k = pre + ler(a); if (Number(b)) { const v = ler(b); if (ls) ls[k] = v; else localStorage.setItem(k, v); } else if (ls) delete ls[k]; else localStorage.removeItem(k); return 0n; }
                case 107: registo(ler(a)); return 0n;
                case 108: return BigInt(Date.now());
                case 109: return BigInt(Math.floor(Math.random() * Math.max(1, Number(a))));
                case 110: if (doc) doc.title = ler(a); return 0n;
                case 111: {
                    const url = ler(a), s = som();
                    if (!s || !url) return 0n;
                    if (aTocar() === url) { s.pause(); return 0n; }
                    s.__url = url; s.src = url;
                    const p = s.play && s.play();
                    if (p && p.catch) p.catch(() => { if (somFim) chamar(somFim, 0n); });
                    return 1n;
                }
                case 112: somFim = ler(a); return 0n;
                case 113: memoria.set(ler(a), { t: ler(b), em: Date.now() }); return 0n;
                case 114: { const m = memoria.get(ler(a)); return m && Date.now() - m.em < Number(b) ? escrever(m.t) : 0n; }
                case 115: memoria.clear(); return 0n;
                case 117: {
                    const [url, prazo] = ler(a).split('\t'), fn = ler(b), ms = Number(prazo) || 0;
                    const m = memoria.get(url);
                    if (m && Date.now() - m.em < ms) { Promise.resolve().then(() => chamar(fn, escrever(m.t), 200n)); return 1n; }
                    if (!buscar) { chamar(fn, escrever(''), 0n); return 0n; }
                    buscar(url).then(async (r) => {
                        const u = new Uint8Array(await r.arrayBuffer());
                        if (r.status === 200) memoria.set(url, { t: dec.decode(u), em: Date.now() });
                        chamar(fn, escrever(u), BigInt(r.status));
                    }).catch(() => chamar(fn, escrever(''), 0n));
                    return 0n;
                }
                case 116: { const u = aTocar(); return u ? escrever(u) : 0n; }
                // rolar: a página até ao elemento do seletor a (1 se existe); com 0, até ao topo (uma vista nova abre no topo)
                case 118: {
                    const el = Number(a) && doc ? doc.querySelector(ler(a)) : null;
                    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'start' });
                    else if (!Number(a) && typeof window !== 'undefined' && window.scrollTo) window.scrollTo(0, 0);
                    return el ? 1n : 0n;
                }
            }
            return 0n;
        };
        const m1 = (c, x) => [Math.sin, Math.cos, Math.exp, Math.log][Number(c)](x);
        const m2 = (c, x, y) => (Number(c) === 0 ? Math.pow(x, y) : Math.atan2(x, y));
        const mod = bytes instanceof WebAssembly.Module ? bytes : new WebAssembly.Module(bytes);
        const inst = new WebAssembly.Instance(mod, { env: { sys, m1, m2 } });
        ex = inst.exports; mem = ex.memory;
        chamar('_start');
        return { exports: ex, chamar, ler, escrever, get som() { return som(); }, parar: () => { for (const t of relogios.values()) clearInterval(t); relogios.clear(); } };
    }

    const api = { criar, cfmt };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else raiz.OndaApp = api;
})(typeof self !== 'undefined' ? self : this);
