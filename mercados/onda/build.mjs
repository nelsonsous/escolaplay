// Compila o motor de análise em Onda (mercados/onda/analise.onda → WebAssembly, com o ondac -w) e gera
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

// o compilador da Onda: se ainda não existe, arranca-o (onda/build.sh, ~1 s)
if (!existsSync(ondac)) execFileSync('sh', [path.join(raiz, 'onda/build.sh')], { stdio: 'inherit' });

let wasm;
try {
    wasm = execFileSync(ondac, ['-w'], { input: readFileSync(path.join(here, 'analise.onda')), maxBuffer: 64 << 20 });
} catch (e) {
    process.stderr.write(String(e.stdout || '') + String(e.stderr || ''));
    process.exit(1);
}
if (wasm.subarray(0, 4).toString('latin1') !== '\0asm') { process.stderr.write(wasm.toString()); process.exit(1); }
await WebAssembly.compile(wasm); // valida o módulo antes de o escrever

// o anfitrião vai como texto: só as portas que o módulo usa (stdout, stdin vazio, saída, relógio, memória)
const anfitriao = String.raw`(function (root) {
    'use strict';
    const WASM = '@WASM@';
    const KIND = { fund: 1, stock: 2, crypto: 3, index: 4 };
    const isNode = typeof process !== 'undefined' && !!(process.versions && process.versions.node);
    const bytes = () => {
        if (isNode) return Buffer.from(WASM, 'base64');
        const s = atob(WASM), u = new Uint8Array(s.length);
        for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
        return u;
    };
    const dec = isNode ? null : new TextDecoder();
    const utf8 = (u, n) => (isNode ? Buffer.from(u.buffer, 0, n).toString('utf8') : dec.decode(u.subarray(0, n)));
    let mod = null;
    // no Node compila já (síncrono); no browser compila em fundo e o ready resolve quando acabar
    const ready = isNode ? Promise.resolve((mod = new WebAssembly.Module(bytes()))).then(() => undefined)
        : WebAssembly.compile(bytes()).then((m) => { mod = m; });

    // Uma instância nova (memória nova) por chamada: nada se acumula entre lotes.
    // Memória da Onda: M[p] é a palavra de 64 bits no byte (p + 16) * 8.
    function abrir() {
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
                case 1: return -1n; // stdin vazio: o main não faz nada; o lote vai direto para a memória
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
        const vai = (f) => { try { f(); } catch (e) { if (!e || e.ondaExit === undefined) throw e; } };
        const saida = () => {
            vai(() => ex._fl());
            const t = utf8(out, total);
            total = 0;
            return t;
        };
        vai(() => ex._start());
        saida();
        return { ex, mem: () => mem, vai, saida };
    }

    // list: [{ closes, opts }] → [null | resultado de analyse(closes, opts)]
    function analyseMany(list) {
        const L = Array.from(list || []);
        let T = 2;
        for (const it of L) { const c = it && it.closes; T += 5 + (c ? c.length >>> 0 : 0); }
        const k = abrir();
        const p = Number(k.ex._oa(BigInt(T)));
        const buf = k.mem().buffer, i64 = new BigInt64Array(buf, (p + 16) * 8, T), f64 = new Float64Array(buf, (p + 16) * 8, T);
        // o lote: T, N; por série L, tipo, cripto, há notícias, notícias e os L fechos (o que não é número vai como NaN:
        // o Number.isFinite do JS também os recusa); a Onda filtra os fechos como o analyse
        i64[0] = BigInt(T); i64[1] = BigInt(L.length);
        const semOpts = [];
        let q = 2;
        L.forEach((it, j) => {
            const c = (it && it.closes) || [], n = c.length >>> 0, o = it.opts === undefined ? {} : it.opts;
            i64[q] = BigInt(n);
            if (o === null) { semOpts.push(j); i64[q + 1] = 0n; i64[q + 2] = 0n; i64[q + 3] = 0n; f64[q + 4] = 0; }
            else {
                i64[q + 1] = BigInt(KIND[o.kind] || 0);
                i64[q + 2] = o.crypto ? 1n : 0n;
                const hn = o.news != null;
                i64[q + 3] = hn ? 1n : 0n;
                f64[q + 4] = hn ? +o.news : 0;
            }
            q += 5;
            for (let i = 0; i < n; i++) { const x = c[i]; f64[q + i] = typeof x === 'number' ? x : NaN; }
            q += n;
        });
        k.vai(() => k.ex.lote(BigInt(p)));
        const out = JSON.parse(k.saida());
        // analyse(closes, null) só falha quando chega às opções (com 30 fechos válidos ou mais)
        for (const j of semOpts) if (out[j] !== null) throw new TypeError("Cannot read properties of null (reading 'crypto')");
        return out;
    }
    const analyse = (closes, opts) => analyseMany([{ closes, opts }])[0];
    // para os testes: o que a função 'nome' da Onda imprime para cada real de xs (ex.: 'pct', 'pnum')
    function _texto(nome, xs) {
        const k = abrir();
        k.vai(() => k.ex.lote(k.ex._oa(2n))); // lote vazio: prepara a área de trabalho
        k.saida();
        return xs.map((x) => { k.vai(() => k.ex[nome](x)); return k.saida(); });
    }

    const api = { ready, analyseMany, analyse, _texto };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.AnaliseOnda = api;
})(typeof self !== 'undefined' ? self : this);
`;

const cabeca = `// GERADO a partir de mercados/onda/analise.onda por \`node mercados/onda/build.mjs\` — não editar à mão.
// Mercados — o motor de análise (analyse de analise.js) escrito em Onda e compilado para WebAssembly (${wasm.length} bytes).
// Dá o mesmo resultado que o analise.js, ao bit (mercados/tests/analise-onda.test.mjs). Corre no browser
// (window.AnaliseOnda) e no Node (module.exports). Depois do ready, analyseMany e analyse são síncronos.
`;
writeFileSync(destino, cabeca + anfitriao.replace('@WASM@', wasm.toString('base64')));
console.log(`analise-onda.js: ${wasm.length} bytes de WASM → ${path.relative(raiz, destino)}`);
