// Compila a análise da Mercados em Onda (mercados/onda/*.onda → WebAssembly, com o ondac -w) e gera
// mercados/analise-onda.js: um ficheiro UMD (window.AnaliseOnda no browser, module.exports no Node) com o WASM em
// base64 e o anfitrião mínimo. Uso: node mercados/onda/build.mjs
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(here, '../..');
const ondac = path.join(raiz, 'onda/build/ondac');
const destino = path.join(raiz, 'mercados/analise-onda.js');
// um só módulo: a biblioteca da Onda (onda/lib, toda: o -w só leva o que se usa), o motor (fase B), o resto do
// analise.js (fase C) e o ecrã (fase D: os utilitários das vistas e as vistas), por esta ordem. O conselheiro
// (mercados/conselheiro/onda/build.mjs) usa as mesmas listas BIBLIOTECA e ANALISE.
export const BIBLIOTECA = ['memoria', 'texto', 'numero', 'valor', 'json', 'arvore', 'data', 'ordenar', 'html', 'anfitriao', 'fala'].map((m) => `../../onda/lib/${m}.onda`);
export const ANALISE = ['analise.onda', 'comum.onda', 'noticias.onda', 'mercado.onda', 'avisos.onda', 'cripto.onda', 'passado.onda', 'decisao.onda'];
export const ECRA = ['ecra.onda', 'ajustes.onda', 'ecra-analise.onda', 'ecra-decisao.onda', 'ecra-destaques.onda', 'ecra-painel.onda', 'ecra-carteira.onda'];
export const FONTES = [...BIBLIOTECA, ...ANALISE, ...ECRA];
const ehMain = !!process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

// o compilador da Onda: se ainda não existe, arranca-o (onda/build.sh, ~1 s)
if (ehMain && !existsSync(ondac)) execFileSync('sh', [path.join(raiz, 'onda/build.sh')], { stdio: 'inherit' });

const fonte = FONTES.map((f) => readFileSync(path.join(here, f), 'utf8')).join('\n');
// O anfitrião vai como texto: só passa os dados para a memória da Onda e lê o que ela escreve (JSON, ou reais em
// M[59]); as contas, as regras e os textos são todos da Onda. Portas usadas: stdout, stdin vazio, saída, relógio, memória.
const anfitriao = String.raw`(function (root) {
    'use strict';
    const WASM = '@WASM@';
    // códigos da Onda: tipo do ativo e as chaves do conselho (a ordem do pconselho de analise.onda)
    const kindOf = (s) => (s === 'fund' ? 1 : s === 'stock' ? 2 : s === 'crypto' ? 3 : s === 'index' ? 4 : 0);
    const KEYS = ['hold', 'buy', 'scale', 'wait', 'neutral', 'turn', 'avoid'];
    const BENCH = typeof Symbol === 'function' ? Symbol('AnaliseOnda.bench') : '__ondaBench';
    const isNode = typeof process !== 'undefined' && !!(process.versions && process.versions.node);
    const bytes = () => {
        if (isNode) return Buffer.from(WASM, 'base64');
        const s = atob(WASM), u = new Uint8Array(s.length);
        for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
        return u;
    };
    const enc = new TextEncoder(), dec = isNode ? null : new TextDecoder();
    const utf8 = (u, n) => (isNode ? Buffer.from(u.buffer, 0, n).toString('utf8') : dec.decode(u.subarray(0, n)));
    // o NaN não tem forma em JSON: a Onda escreve-o como este texto (e avisa em M[60])
    const reviver = (k, v) => (v === '\u0000NaN' ? NaN : v);
    let mod = null;
    // no Node compila já (síncrono); no browser compila em fundo e o ready resolve quando acabar (e falha, sem
    // rebentar o resto da página, num browser sem WebAssembly, como o iPhone no modo de isolamento)
    const ready = isNode ? Promise.resolve((mod = new WebAssembly.Module(bytes()))).then(() => undefined)
        : typeof WebAssembly === 'undefined' ? Promise.reject(new Error('AnaliseOnda: este browser não tem WebAssembly'))
            : WebAssembly.compile(bytes()).then((m) => { mod = m; });
    ready.catch(() => {}); // o erro chega a quem espera pelo ready; sem ninguém à espera não suja a consola

    // Uma instância da Onda. A memória fica viva: o main prepara as tabelas (palavras das notícias, área de trabalho)
    // e cada chamada repõe o monte na marca (o que foi reservado depois volta a zero). M[p] é a palavra de 64 bits no
    // byte (p + 16) * 8; M[-1] (palavra 15) é o topo do monte.
    function instancia() {
        if (!mod) throw new Error('AnaliseOnda: o módulo ainda não está pronto (esperar por AnaliseOnda.ready)');
        let mem = null, out = new Uint8Array(1 << 16), total = 0;
        const sys = (c, a, b) => {
            switch (Number(c)) {
                case 0: { // escrever: b palavras desde M[a], um byte em cada
                    const n = Number(b), m8 = new Uint8Array(mem.buffer, (Number(a) + 16) * 8, n * 8);
                    if (total + n > out.length) { const o2 = new Uint8Array(Math.max(out.length * 2, total + n)); o2.set(out.subarray(0, total)); out = o2; }
                    const u = out, t = total;
                    for (let i = 0; i < n; i++) u[t + i] = m8[i << 3];
                    total = t + n;
                    return 0n;
                }
                case 1: return -1n; // stdin vazio: o main só prepara as tabelas; os dados vão direto para a memória
                case 2: throw { ondaExit: Number(a) };
                case 6: return BigInt(Math.round((performance.timeOrigin + performance.now()) * 1000));
                case 7: { // a memória tem de chegar a M[a]
                    const need = (Number(a) + 16) * 8, cur = mem.buffer.byteLength;
                    if (need > cur) mem.grow(Math.ceil((need - cur) / 65536));
                    return BigInt(mem.buffer.byteLength / 8 - 16);
                }
            }
            throw new Error('AnaliseOnda: porta sys ' + c + ' inesperada');
        };
        const m1 = (c, x) => [Math.sin, Math.cos, Math.exp, Math.log][Number(c)](x);
        const m2 = (c, x, y) => (Number(c) === 0 ? Math.pow(x, y) : Math.atan2(x, y));
        const ex = new WebAssembly.Instance(mod, { env: { sys, m1, m2 } }).exports;
        mem = ex.memory;
        const vai = (f) => { try { return f(); } catch (e) { if (!e || e.ondaExit === undefined) throw e; } };
        let buf = null, I64, F64, I32;
        const vistas = () => { if (buf !== mem.buffer) { buf = mem.buffer; I64 = new BigInt64Array(buf); F64 = new Float64Array(buf); I32 = new Int32Array(buf); } };
        const k = {
            ex, vai,
            saida() { vai(() => ex._fl()); const t = utf8(out, total); total = 0; return t; },
            // o JSON que a Onda escreveu (com o NaN de volta, se o houve)
            json() { const t = k.saida(); vistas(); return I64[16 + 60] ? JSON.parse(t, reviver) : JSON.parse(t); },
            marca() { vistas(); k.base = Number(I64[15]); },
            reset() {
                vistas();
                const top = Number(I64[15]);
                if (top > k.base) new Uint8Array(buf, (k.base + 16) * 8, (top - k.base) * 8).fill(0);
                I64[15] = BigInt(k.base);
                I64[13] = 0n; I64[14] = 0n; // nada por escrever, saída sem desvio
                I64[16 + 60] = 0n; I64[16 + 61] = 0n; // NaN no JSON, erro
                total = 0;
                return k;
            },
            // reserva n palavras (a zero) e devolve o endereço
            reserva(n) { const p = Number(ex._oa(BigInt(n))); vistas(); return p; },
            i(p, x) { vistas(); I32[(p + 16) * 2] = x; I32[(p + 16) * 2 + 1] = x < 0 ? -1 : 0; }, // inteiro pequeno
            f(p, x) { vistas(); F64[p + 16] = x; },
            gi(p) { vistas(); return Number(I64[p + 16]); },
            gf(p) { vistas(); return F64[p + 16]; },
            // reais seguidos (um Float64Array) a partir de M[p]
            put(p, v) { vistas(); F64.set(v, p + 16); },
            // um texto UTF-16 [n, unidades...]; devolve o endereço a seguir
            u16(p, s) { vistas(); const n = s.length; let w = (p + 16) * 2; I32[w] = n; for (let j = 0; j < n; j++) I32[w += 2] = s.charCodeAt(j); return p + 1 + n; },
            // um texto UTF-8 [n, bytes...] (os bytes vêm já codificados)
            u8(p, u) { vistas(); const n = u.length; let w = (p + 16) * 2; I32[w] = n; for (let j = 0; j < n; j++) I32[w += 2] = u[j]; return p + 1 + n; },
            // as vistas da memória, para escrever muito de seguida (sem chamar a Onda pelo meio)
            palavras() { vistas(); return [I32, F64]; },
        };
        vai(() => ex._start());
        k.saida();
        k.marca();
        return k;
    }
    // a instância partilhada (as funções sem estado próprio); cada benchFn tem a sua (o índice fica nela)
    let K0 = null;
    const k0 = () => (K0 || (K0 = instancia())).reset();

    // Regra de todas as funções: primeiro lê-se tudo o que vem do chamador (pode correr código dele: getters, valueOf,
    // toString — até uma chamada a esta API), e só depois se mexe na memória da Onda; no fim, lê-se tudo o que a Onda
    // escreveu antes de mexer nos objetos do chamador.
    // o +x do JS para cada elemento (os indicadores fazem contas com v[i])
    const nums = (v) => { const n = v.length >>> 0, r = new Float64Array(n); for (let j = 0; j < n; j++) r[j] = +v[j]; return r; };
    const num = (x) => (typeof x === 'number' ? x : NaN); // o Number.isFinite do JS recusa o que não é número

    // ---------- fase B: o analyse ----------
    // list: [{ closes, opts }] → [null | resultado de analyse(closes, opts)]
    function analyseMany(list) {
        // por série: L, tipo, cripto, há notícias, notícias e os L fechos (o que não é número vai como NaN: o
        // Number.isFinite do JS também os recusa); a Onda filtra os fechos como o analyse
        const S = Array.from(list || [], (it) => {
            const c = (it && it.closes) || [], n = c.length >>> 0, o = it.opts === undefined ? {} : it.opts, v = new Float64Array(n);
            for (let i = 0; i < n; i++) { const x = c[i]; v[i] = typeof x === 'number' ? x : NaN; }
            if (o === null) return { v, nulo: true, kind: 0, cr: 0, hn: 0, nw: 0 };
            const hn = o.news != null;
            return { v, nulo: false, kind: kindOf(o.kind), cr: o.crypto ? 1 : 0, hn: hn ? 1 : 0, nw: hn ? +o.news : 0 };
        });
        let T = 2;
        for (const x of S) T += 5 + x.v.length;
        const k = k0(), p = k.reserva(T);
        k.i(p, T); k.i(p + 1, S.length);
        let q = p + 2;
        for (const x of S) { k.i(q, x.v.length); k.i(q + 1, x.kind); k.i(q + 2, x.cr); k.i(q + 3, x.hn); k.f(q + 4, x.nw); k.put(q + 5, x.v); q += 5 + x.v.length; }
        k.vai(() => k.ex.lote(BigInt(p)));
        const out = JSON.parse(k.saida());
        // analyse(closes, null) só falha quando chega às opções (com 30 fechos válidos ou mais)
        S.forEach((x, j) => { if (x.nulo && out[j] !== null) throw new TypeError("Cannot read properties of null (reading 'crypto')"); });
        return out;
    }
    const analyse = (closes, opts) => analyseMany([{ closes, opts }])[0];

    // ---------- tom das notícias ----------
    // textos (já em bytes UTF-8) → [nt, (n, bytes)...] depois da cabeça (palavras inteiras)
    function textos(k, us, cabeca) {
        const p = k.reserva(cabeca.length + 1 + us.reduce((a, u) => a + 1 + u.length, 0));
        let q = p;
        for (const h of cabeca) k.i(q++, h);
        k.i(q++, us.length);
        for (const u of us) q = k.u8(q, u);
        return p;
    }
    const norm0 = (t) => enc.encode(String(t || '')); // o String(t || '') do norm, em UTF-8
    function sentimentMany(texts) {
        const us = Array.from(texts, norm0), k = k0(), p = textos(k, us, []);
        k.vai(() => k.ex.sent(BigInt(p)));
        return k.json();
    }
    const sentiment = (text) => sentimentMany([text])[0];
    function newsTone(items) {
        const us = [];
        let ln = 0;
        if (items && items.length) { const sl = items.slice(0, 8); ln = sl.length; sl.forEach((i) => us.push(norm0(i.title))); }
        const k = k0(), p = textos(k, us, [ln]);
        return k.vai(() => k.ex.tons(BigInt(p))) ? k.gf(59) : null;
    }

    // ---------- sentimento do mercado, €/L, labelOf, riskOf ----------
    function marketMood(ctx) {
        const v = new Float64Array(11);
        const idx = (a, j) => {
            if (!a || a.metrics.sma50 == null) return;
            v[3 * j] = 1; v[3 * j + 1] = +a.metrics.price; v[3 * j + 2] = +a.metrics.sma50;
        };
        idx(ctx.spx, 0); idx(ctx.stoxx, 1); idx(ctx.btc, 2);
        v[9] = num(ctx.vix); v[10] = num(ctx.breadth);
        const k = k0(), b = k.reserva(11);
        k.put(b, v);
        k.vai(() => k.ex.humor(BigInt(b)));
        return k.json();
    }
    function usdGalToEurL(usdGal, eurusd) {
        const a = num(usdGal), e = num(eurusd), k = k0();
        return k.vai(() => k.ex.galao(a, e)) ? k.gf(59) : null;
    }
    function labelOf(score, hz = 'mid') {
        const s = +score, h = typeof hz === 'symbol' ? '' : String(hz), k = k0();
        k.vai(() => k.ex.rotulo(s, h === 'short' ? 1n : h === 'long' ? 2n : 0n));
        return k.json();
    }
    function riskOf(vol) {
        const nulo = vol == null, x = nulo ? 0 : +vol, k = k0();
        k.vai(() => k.ex.risco(nulo ? 1n : 0n, x));
        return k.json();
    }

    // ---------- indicadores ----------
    // v na memória da Onda: [p, n]
    const vetor = (k, xs) => { const p = k.reserva(xs.length + 1); k.put(p, xs); return [BigInt(p), BigInt(xs.length)]; };
    const real = (k, f) => (k.vai(f) ? k.gf(59) : null);
    function sma(v, n) { const xs = nums(v), x = +n, k = k0(), [p, len] = vetor(k, xs); return real(k, () => k.ex.nsma(p, len, x)); }
    function rsi(v, n = 14) { const xs = nums(v), x = +n, k = k0(), [p, len] = vetor(k, xs); return real(k, () => k.ex.nrsi(p, len, x)); }
    function volatility(v, days = 252, lookback = 60) {
        const xs = nums(v), d = +days, lb = +lookback, k = k0(), [p, len] = vetor(k, xs);
        return real(k, () => k.ex.nvol(p, len, d, lb));
    }
    function emaSeries(v, n) {
        const xs = nums(v), x = +n, k = k0(), [p, len] = vetor(k, xs);
        const o = Number(k.vai(() => k.ex.nema(p, len, x)));
        const c = k.gi(o), r = new Array(c);
        for (let j = 0; j < c; j++) r[j] = k.gf(o + 1 + j);
        return r;
    }
    function macd(v) {
        const xs = nums(v), k = k0(), [p, len] = vetor(k, xs);
        if (!k.vai(() => k.ex.nmacd(p, len))) return null;
        return { line: k.gf(18), signal: k.gf(19), hist: k.gf(20), histPrev: k.gf(21) };
    }

    // ---------- teste no passado ----------
    const newAcc = () => { const k = k0(); k.vai(() => k.ex.nova()); return k.json(); };
    // o benchFn: a função (d0, d1) → retorno da referência de d0 a d1 (ou null), com o índice na sua instância
    function benchFn(bench) {
        if (!bench) return null;
        const ds = bench.days, cs = bench.closes, nb = ds.length >>> 0;
        const D = Array.from({ length: nb }, (_, j) => (typeof ds[j] === 'string' ? ds[j] : null)), C = Float64Array.from(D, (_, j) => +cs[j]);
        const k = instancia().reset(), b = k.reserva(1 + D.reduce((a, d) => a + 3 + (d === null ? 0 : d.length), 0));
        k.i(b, nb);
        let q = b + 1;
        D.forEach((d, j) => { k.i(q, d === null ? 0 : 1); k.f(q + 1, C[j]); q = k.u16(q + 2, d === null ? '' : d); });
        k.vai(() => k.ex.bix(BigInt(b)));
        k.marca(); // o índice fica abaixo da marca: as consultas não o apagam
        const f = (d0, d1) => {
            const s0 = typeof d0 === 'string', s1 = typeof d1 === 'string', t0 = s0 ? d0 : '', t1 = s1 ? d1 : '';
            k.reset();
            const q0 = k.reserva(4 + t0.length + t1.length);
            k.i(q0, s0 ? 1 : 0);
            const q1 = k.u16(q0 + 1, t0);
            k.i(q1, s1 ? 1 : 0); k.u16(q1 + 1, t1);
            return k.vai(() => k.ex.bfq(BigInt(q0))) ? k.gf(59) : null;
        };
        Object.defineProperty(f, BENCH, { value: k });
        return f;
    }
    const NOVO = () => ({ n21: 0, s21: 0, h21: 0, x21: 0, nx21: 0, n63: 0, s63: 0, h63: 0, x63: 0, nx63: 0 });
    const CAMPOS = ['n21', 's21', 'h21', 'x21', 'nx21', 'n63', 's63', 'h63', 'x63', 'nx63'];
    function backtestAsset(a, benchByDay, acc, opt = {}) {
        const c = a.closes, n = c.length >>> 0, days = a.days, kind = a.kind;
        const warm = +opt.warm, step = +opt.step, cost = +opt.cost;
        const kb = benchByDay ? benchByDay[BENCH] : undefined;
        const modo = !benchByDay || !days ? 0 : kb ? 1 : 2;
        // os fechos: para o analyse (o que não é número é recusado, como no Number.isFinite) e para as contas (o +x)
        const ca = new Float64Array(n);
        let todos = true;
        for (let j = 0; j < n; j++) { const x = c[j]; if (typeof x === 'number') ca[j] = x; else { ca[j] = NaN; todos = false; } }
        const cf = todos ? null : nums(c);
        const D = modo === 1 ? Array.from({ length: days.length >>> 0 }, (_, j) => (typeof days[j] === 'string' ? days[j] : null)) : null;
        const st = KEYS.map((key) => { const A = acc[key]; return A ? Float64Array.from(CAMPOS, (f) => +A[f]) : null; });
        // modo 2 (uma função de referência que não é do benchFn): chama-a o anfitrião, numa instância só desta chamada
        const k = modo === 1 ? kb.reset() : modo === 2 ? instancia().reset() : k0();
        const b = k.reserva(102);
        k.i(b, n); k.i(b + 1, kindOf(kind)); k.i(b + 2, kind === 'crypto' ? 1 : 0);
        k.f(b + 3, warm); k.f(b + 4, step); k.f(b + 5, cost); k.i(b + 6, modo);
        const pa = k.reserva(n + 1); k.put(pa, ca); k.i(b + 7, pa);
        if (cf) { const pf = k.reserva(n + 1); k.put(pf, cf); k.i(b + 8, pf); } else k.i(b + 8, pa);
        if (D) { // as datas: [nd, nd endereços] e os textos a seguir, num só bloco
            const dt = k.reserva(1 + D.length + D.reduce((x, d) => x + (d === null ? 0 : d.length + 1), 0));
            k.i(dt, D.length);
            let p = dt + 1 + D.length;
            D.forEach((d, j) => { if (d !== null) { k.i(dt + 1 + j, p); p = k.u16(p, d); } });
            k.i(b + 9, dt);
        }
        st.forEach((v, j) => { if (v) { k.i(b + 10 + 11 * j, 1); k.put(b + 11 + 11 * j, v); } });
        if (k.vai(() => k.ex.btk(BigInt(b)))) throw new RangeError('backtestAsset: o passo (opt.step) não faz avançar o dia (o JS ficava num ciclo sem fim)');
        if (modo === 2) { // o JS chama a referência nestes dias, por esta ordem
            const pr = k.gi(b + 100), pv = k.gi(b + 101), np = k.gi(pr), P = [];
            for (let j = 0; j < np; j++) P.push([k.gf(pr + 1 + 2 * j), k.gi(pr + 2 + 2 * j)]);
            const V = P.map(([i, h]) => benchByDay(days[i], days[i + h]));
            V.forEach((x, j) => { if (x != null) { k.i(pv + 2 * j, 1); k.f(pv + 2 * j + 1, +x); } });
        }
        k.vai(() => k.ex.bta(BigInt(b)));
        // o que a Onda escreveu: as chaves novas (pela ordem em que o JS as cria), as que mudaram e o per
        const novas = Array.from({ length: k.gi(b + 91) }, (_, j) => KEYS[k.gi(b + 92 + j)]);
        const mud = [];
        for (let j = 0; j < 7; j++) if (k.gi(b + 10 + 11 * j) === 2) mud.push([KEYS[j], CAMPOS.map((f, i) => k.gf(b + 11 + 11 * j + i))]);
        const per = { key: a.key, n: 0, s63: 0, buyN: k.gf(b + 87), buyS: k.gf(b + 88), avoidN: k.gf(b + 89), avoidS: k.gf(b + 90) };
        for (const key of novas) acc[key] = NOVO();
        for (const [key, v] of mud) { const A = acc[key]; CAMPOS.forEach((f, i) => { A[f] = v[i]; }); }
        return per;
    }
    // vários ativos de seguida com o mesmo acc (o ciclo do JS: for (const a of assets) per.push(backtestAsset(...)))
    function backtestMany(list, benchByDay, acc) { return Array.from(list, (x) => backtestAsset(x.a, benchByDay, acc, x.opt)); }
    function summarize(acc) {
        const es = Object.entries(acc).map(([key, A]) => [key, Float64Array.from(CAMPOS, (f) => +A[f])]);
        const k = k0(), b = k.reserva(1 + 10 * es.length);
        k.i(b, es.length);
        es.forEach(([, v], j) => k.put(b + 1 + 10 * j, v));
        k.vai(() => k.ex.resumo(BigInt(b)));
        const r = k.json(), out = {};
        es.forEach(([key], j) => { out[key] = r[j]; });
        return out;
    }

    // ---------- cripto: isenção aos 365 dias ----------
    function planLots(since, days, today) {
        const si = String(since || ''), to = String(today || ''), dd = [];
        (days || []).map(Number).forEach((d) => dd.push(d));
        const k = k0(), p = k.reserva(4 + si.length + to.length + dd.length);
        const p2 = k.u16(p, si), p3 = k.u16(p2, to);
        k.i(p3, dd.length); k.put(p3 + 1, Float64Array.from(dd));
        k.vai(() => k.ex.lotes(BigInt(p), BigInt(p2), BigInt(p3)));
        return k.json();
    }
    function cryptoTax(lots, today) {
        const L = [];
        (lots || []).forEach((x) => L.push(x ? { d: typeof x.d === 'string' ? x.d : String(x.d), e: +x.e, plan: x.plan ? 1 : 0 } : null));
        const ts = typeof today === 'string', to = ts ? today : '', T = ts ? Date.parse(today) : NaN; // o Date.parse(today) do JS
        const k = k0(), b = k.reserva(4 + to.length + L.reduce((a, x) => a + 4 + (x ? x.d.length : 0), 0));
        k.f(b, T); k.i(b + 1, ts ? 1 : 0);
        let q = k.u16(b + 2, to);
        k.i(q++, L.length);
        for (const x of L) { if (x) { k.i(q, 1); k.f(q + 1, x.e); k.i(q + 2, x.plan); } q = k.u16(q + 3, x ? x.d : ''); }
        k.vai(() => k.ex.imposto(BigInt(b)));
        if (k.gi(61)) throw new RangeError('Invalid time value'); // o toISOString de uma data que o Date.parse recusou
        return k.json();
    }

    // ---------- avisos ----------
    // o ToString dos template literals do JS (o groupAlert junta os textos assim)
    const txt = (x) => { if (typeof x === 'symbol') throw new TypeError('Cannot convert a Symbol value to a string'); return String(x); };
    function groupAlert(items, held) {
        const tx = (items || []).slice().map((x) => [+x.pct, txt(x.name), txt(x.pctTxt), txt(x.px)]), hd = held ? 1 : 0;
        const k = k0(), b = k.reserva(2 + tx.reduce((a, t) => a + 4 + t[1].length + t[2].length + t[3].length, 0));
        k.i(b, hd); k.i(b + 1, tx.length);
        let q = b + 2;
        for (const t of tx) { k.f(q, t[0]); q = k.u16(k.u16(k.u16(q + 1, t[1]), t[2]), t[3]); }
        k.vai(() => k.ex.aviso(BigInt(b)));
        return k.json();
    }
    function isQuiet(h, from = 22, to = 10) { const x = +h, f = +from, t = +to, k = k0(); return !!k.vai(() => k.ex.quieto(x, f, t)); }

    // ---------- fase D: o ecrã ----------
    // A Onda desenha uma vista (o HTML, igual ao byte ao que o JS desenhava) a partir de um instantâneo: dados simples
    // (objetos, listas, textos, números, booleanos, null), que vão direto para a memória da Onda já na árvore do json
    // de onda/lib/app.onda — nó [tipo, valor, chave, irmão, filho, n], textos com M[t] = fim e um byte UTF-8 por
    // palavra —, sem JSON pelo meio: os números vão ao bit (NaN, ±Infinity e -0 incluídos); um membro undefined fica
    // de fora e, numa lista, é um nó de tipo 0 (o undefined da Onda). Primeiro lê-se o instantâneo todo (uma cópia
    // simples), depois reserva-se um só bloco e escreve-se.
    // Uma lista marcada com ecra.fixa(lista) (as ~1 340 linhas de toda a Trade Republic, que só mudam de 30 em 30 min)
    // fica escrita abaixo da marca, como as tabelas do main: as chamadas seguintes só ligam o nó a ela enquanto o JS
    // passar a MESMA lista (a mesma referência, sem a mudar no lugar). Uma lista nova apaga a anterior; uma por
    // instantâneo.
    const FIXO = typeof Symbol === 'function' ? Symbol('AnaliseOnda.fixa') : '__ondaFixa';
    const fixa = (lista) => ({ [FIXO]: lista });
    let fixo = null;
    function fixar(k, v) {
        if (fixo && fixo.v === v) return fixo;
        if (fixo) { k.base = fixo.base; k.reset(); fixo = null; } // a anterior volta a zero
        const base = k.base, r = arvore(k, v);
        fixo = { v, base, filho: k.gi(r + 4), n: k.gi(r + 5) };
        k.marca();
        return fixo;
    }
    function arvore(k, v0) {
        // 1) lê o instantâneo uma só vez, em pré-ordem: tipo, valor (número ou texto), chave e quantos filhos
        const tp = [], vl = [], ch = [], nf = [];
        let T = 0, lf = null;
        const le = (v, key) => {
            const i = tp.length;
            let t = 0, x = 0;
            if (v === null) t = 1;
            else switch (typeof v) {
                case 'boolean': t = v ? 3 : 2; break;
                case 'number': t = 4; x = v; break;
                case 'string': t = 5; x = v; T += 1 + 3 * v.length; break;
                case 'object': t = Array.isArray(v) ? 6 : Array.isArray(v[FIXO]) ? 8 : 7; break;
            }
            if (t === 8) { if (lf !== null && lf !== v[FIXO]) throw new Error('AnaliseOnda: só uma lista fixa por instantâneo'); x = lf = v[FIXO]; }
            tp.push(t); vl.push(x); ch.push(key); nf.push(0);
            T += 6;
            if (key !== null) T += 1 + 3 * key.length;
            if (t === 6) { const n = v.length >>> 0; nf[i] = n; for (let j = 0; j < n; j++) le(v[j], null); }
            else if (t === 7) {
                let n = 0;
                for (const kk of Object.keys(v)) { const y = v[kk]; if (y === undefined || typeof y === 'function' || typeof y === 'symbol') continue; le(y, kk); n++; }
                nf[i] = n;
            }
        };
        le(v0, null);
        const fx = lf === null ? null : fixar(k, lf);
        // 2) escreve num só bloco (um texto ocupa no máximo 3 bytes por unidade UTF-16; um substituto sozinho dá U+FFFD,
        // como no TextEncoder). Palavra p: I32[(p + 16) * 2] (os 32 bits de cima ficam a zero) ou F64[p + 16].
        let q = k.reserva(T), i = 0;
        const [I32, F64] = k.palavras();
        const texto = (s) => {
            const t = q, n = s.length;
            let w = (t + 17) * 2;
            for (let j = 0; j < n; j++) {
                let c = s.charCodeAt(j);
                if (c < 0x80) { I32[w] = c; w += 2; continue; }
                if (c < 0x800) { I32[w] = 0xc0 | (c >> 6); I32[w + 2] = 0x80 | (c & 63); w += 4; continue; }
                if (c >= 0xd800 && c < 0xdc00 && j + 1 < n) {
                    const d = s.charCodeAt(j + 1);
                    if ((d & 0xfc00) === 0xdc00) {
                        j++; c = 0x10000 + ((c - 0xd800) << 10) + (d - 0xdc00);
                        I32[w] = 0xf0 | (c >> 18); I32[w + 2] = 0x80 | ((c >> 12) & 63); I32[w + 4] = 0x80 | ((c >> 6) & 63); I32[w + 6] = 0x80 | (c & 63); w += 8;
                        continue;
                    }
                }
                if (c >= 0xd800 && c < 0xe000) c = 0xfffd;
                I32[w] = 0xe0 | (c >> 12); I32[w + 2] = 0x80 | ((c >> 6) & 63); I32[w + 4] = 0x80 | (c & 63); w += 6;
            }
            q = w / 2 - 16;
            I32[(t + 16) * 2] = q;
            return t;
        };
        const escreve = () => {
            const a = q, t = tp[i], key = ch[i], x = vl[i], n = nf[i];
            i++; q += 6;
            I32[(a + 16) * 2] = t;
            if (key !== null) I32[(a + 18) * 2] = texto(key);
            if (t === 8) { I32[(a + 16) * 2] = 6; I32[(a + 20) * 2] = fx.filho; I32[(a + 21) * 2] = fx.n; } // a lista fixa
            else if (t === 4) F64[a + 17] = x;
            else if (t === 5) I32[(a + 17) * 2] = texto(x);
            else if (t >= 6) {
                let ant = a + 4; // o filho, e depois o irmão do anterior
                for (let j = 0; j < n; j++) { const b = escreve(); I32[(ant + 16) * 2] = b; ant = b + 3; }
                I32[(a + 21) * 2] = n;
            }
            return a;
        };
        return escreve();
    }
    // o HTML da vista nome (uma função da Onda: ajustes.onda…) para o instantâneo
    function vista(nome, snap) { const k = k0(), r = arvore(k, snap); k.vai(() => k.ex[nome](BigInt(r))); return k.saida(); }
    const ecra = { ajustes: (snap) => vista('ajustes', snap), analise: (snap) => vista('ecra_analise', snap), destaques: (snap) => vista('ecra_destaques', snap), painel: (snap) => vista('ecra_painel', snap), carteira: (snap) => vista('ecra_carteira', snap), decisao: (snap) => vista('ecra_decisao', snap), fixa };

    // ---------- a decisão consolidada (decisao.onda) ----------
    // list: [{ cl, an, tec, news }] → [null | { fam, forte, p, conf, manda, key, n, favor, contra, f: [fontes] }]
    function decisoes(list) { const k = k0(), r = arvore(k, Array.from(list || [])); k.vai(() => k.ex.decisoes(BigInt(r))); return JSON.parse(k.saida()); }
    const decisao = (d) => decisoes([d])[0];

    // ---------- para os testes ----------
    // o que a função 'nome' da Onda imprime para cada real de xs (ex.: 'pct', 'pnum')
    function _texto(nome, xs) { const k = k0(); return xs.map((x) => { k.vai(() => k.ex[nome](x)); return k.saida(); }); }
    // os textos normalizados pelo norm da Onda (as fronteiras não-ASCII saem como \u0080)
    function _norm(texts) { const us = Array.from(texts, (t) => enc.encode(String(t))), k = k0(), p = textos(k, us, []); k.vai(() => k.ex.nrmx(BigInt(p))); return k.json(); }
    // o que a função 'nome' da Onda (uma vista, ou o fm_teste de ecra.onda) escreve para um instantâneo
    const _vista = (nome, snap) => vista(nome, snap);
    // a ordem em que o sort da Onda (ts_ordena de ecra.onda, o do V8) põe os índices 0..n-1, com as chaves k1 e k2
    function _ordena(k1, k2, modo) {
        const n = k1.length, a = Float64Array.from(k1), b = Float64Array.from(k2), k = k0(), p = k.reserva(2 + 3 * n);
        k.i(p, n); k.i(p + 1, modo); k.put(p + 2, a); k.put(p + 2 + n, b);
        k.vai(() => k.ex.ts_teste(BigInt(p)));
        return Array.from({ length: n }, (_, j) => k.gi(p + 2 + 2 * n + j));
    }

    const api = {
        ready, analyseMany, analyse,
        groupAlert, isQuiet, sma, emaSeries, rsi, macd, volatility, sentiment, newsTone, marketMood, usdGalToEurL, labelOf, riskOf,
        backtestAsset, summarize, benchFn, newAcc, planLots, cryptoTax,
        sentimentMany, backtestMany, decisoes, decisao, _texto, _norm, _vista, _ordena, ecra,
    };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.AnaliseOnda = api;
})(typeof self !== 'undefined' ? self : this);
`;

// As entradas do módulo (ondac -w f g …: só elas são raízes e exportações; o resto que nada usa fica de fora, também a
// biblioteca que a app não chama): as funções que a ponte chama (k.ex.nome, e as vistas pelo nome em vista('…')) e as
// que os testes chamam pela ponte (AnaliseOnda._texto e _vista).
const TESTES = ['pct', 'pnum', 'fm_teste'];
export const ENTRADAS = [...new Set([...anfitriao.matchAll(/k\.ex\.([a-z_][a-z0-9_]*)/g), ...anfitriao.matchAll(/vista\('([a-z_][a-z0-9_]*)'/g)].map((m) => m[1]).concat(TESTES))].sort();
let wasm;
if (ehMain) {
    try {
        wasm = execFileSync(ondac, ['-w', ...ENTRADAS], { input: fonte, maxBuffer: 64 << 20 });
    } catch (e) {
        process.stderr.write(String(e.stdout || '') + String(e.stderr || ''));
        process.exit(1);
    }
    if (wasm.subarray(0, 4).toString('latin1') !== '\0asm') { process.stderr.write(wasm.toString()); process.exit(1); }
    await WebAssembly.compile(wasm); // valida o módulo antes de o escrever
}

// as linhas, como o wc -l dos ficheiros: as da app e as da biblioteca
const wc = (fs) => fs.reduce((n, f) => n + (readFileSync(path.join(here, f), 'utf8').match(/\n/g) || []).length, 0);
const linhas = wc([...ANALISE, ...ECRA]), linhasLib = wc(BIBLIOTECA);
if (ehMain) {
    const cabeca = `// GERADO a partir de mercados/onda/*.onda por \`node mercados/onda/build.mjs\` — não editar à mão.
// Mercados — a análise toda (a API de analise.js) e o ecrã (AnaliseOnda.ecra: as vistas já passadas para a Onda)
// escritos em Onda (${linhas} linhas, mais a biblioteca da Onda: onda/lib) e compilados para WebAssembly (${wasm.length} bytes).
// Dá o mesmo resultado que o analise.js (mercados/tests/analise-onda*.test.mjs) e o mesmo HTML que os Ajustes do
// mercados.js (mercados/tests/ecra-onda.test.mjs); a Análise, os Destaques e o Painel já são só da Onda
// (mercados/tests/ecra-analise.test.mjs, ecra-destaques.test.mjs e ecra-painel.test.mjs).
// Corre no browser (window.AnaliseOnda) e no Node (module.exports). Depois do ready, todas as funções são síncronas.
`;
    writeFileSync(destino, cabeca + anfitriao.replace('@WASM@', wasm.toString('base64')));
    console.log(`analise-onda.js: ${linhas} linhas de Onda (e ${linhasLib} da biblioteca), ${wasm.length} bytes de WASM → ${path.relative(raiz, destino)}`);
}
