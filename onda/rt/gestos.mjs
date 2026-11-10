// Monta o motor de gestos comum: onda/rt/gestos.onda → WebAssembly → onda/rt/gestos-onda.js (o WASM em base64 e a ponte
// que o expõe às apps como OndaGestos). As apps (Música, Meteo, Mercados) carregam-no de ../onda/rt/gestos-onda.js.
//   node onda/rt/gestos.mjs [--verificar]      (--verificar: não grava; falha se o gerado não corresponder à fonte)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const AQUI = new URL('.', import.meta.url).pathname;
const COMPILADOR = process.env.ONDAC || join(AQUI, '..', 'seed', 'ondac.wasm');
const DESTINO = join(AQUI, 'gestos-onda.js');
const ENTRADAS = ['gmodo', 'gsegue', 'gfim', 'garma', 'gopac', 'gopacs', 'main'];
if (!existsSync(COMPILADOR)) { console.error('sem compilador Onda: ' + COMPILADOR); process.exit(1); }

// corre o compilador (onda/seed/ondac.wasm) com a fonte no stdin; devolve os bytes do WebAssembly
async function ondac(fonte, flags) {
    const input = new TextEncoder().encode(fonte), args = ['ondac', ...flags].map((s) => new TextEncoder().encode(s));
    const out = [];
    let ip = 0, mem = null;
    const words = (a, n) => new BigInt64Array(mem.buffer, (Number(a) + 16) * 8, n);
    const sys = (c, a, b) => {
        switch (Number(c)) {
            case 0: { const n = Number(b), v = words(a, n), u = new Uint8Array(n); for (let i = 0; i < n; i++) u[i] = Number(v[i] & 255n); out.push(u); return 0n; }
            case 1: return ip < input.length ? BigInt(input[ip++]) : -1n;
            case 2: throw { ondaExit: Number(a) };
            case 3: return BigInt(args.length);
            case 4: { const s = args[Number(a)], j = Number(b); return s && j >= 0 && j < s.length ? BigInt(s[j]) : 0n; }
            case 6: return BigInt(Date.now() * 1000);
            case 7: { const need = (Number(a) + 16) * 8, cur = mem.buffer.byteLength; if (need > cur) mem.grow(Math.ceil((need - cur) / 65536)); return BigInt(mem.buffer.byteLength / 8 - 16); }
        }
        return 0n;
    };
    const m1 = (c, x) => [Math.sin, Math.cos, Math.exp, Math.log][Number(c)](x);
    const m2 = (c, x, y) => (c === 0n ? Math.pow(x, y) : Math.atan2(x, y));
    const inst = await WebAssembly.instantiate(await WebAssembly.compile(readFileSync(COMPILADOR)), { env: { sys, m1, m2 } });
    mem = inst.exports.memory;
    try { inst.exports._start(); } catch (x) { if (x?.ondaExit === undefined) throw x; }
    const all = Buffer.concat(out.map((u) => Buffer.from(u)));
    if (!(all[0] === 0 && all[1] === 0x61 && all[2] === 0x73 && all[3] === 0x6d)) throw new Error('erro de compilação: ' + all.toString('utf8').trim());
    return all;
}

const fonte = readFileSync(join(AQUI, 'gestos.onda'), 'utf8');
const wasm = await ondac(fonte, ['-w', ...ENTRADAS]);
await WebAssembly.compile(wasm);
const linhas = fonte.split('\n').filter((l) => l.trim() && !l.trim().startsWith('#')).length;

const ponte = String.raw`// GERADO a partir de onda/rt/gestos.onda (@LINHAS@ linhas de Onda, @BYTES@ bytes de WebAssembly) por
// \`node onda/rt/gestos.mjs\` — não editar à mão. O motor de gestos comum às apps: as decisões (que gesto é, quanto segue o
// dedo, se se confirma) são da Onda; a ponte de cada app recebe os toques e mexe no ecrã.
(function (root) {
    'use strict';
    const WASM = '@WASM@';
    let X = null, mem = null;
    const sys = (c, a) => {
        switch (Number(c)) {
            case 2: throw { ondaExit: Number(a) };
            case 7: { const need = (Number(a) + 16) * 8, cur = mem.buffer.byteLength; if (need > cur) mem.grow(Math.ceil((need - cur) / 65536)); return BigInt(mem.buffer.byteLength / 8 - 16); }
        }
        return 0n;
    };
    const m1 = (c, x) => [Math.sin, Math.cos, Math.exp, Math.log][Number(c)](x);
    const m2 = (c, x, y) => (Number(c) === 0 ? Math.pow(x, y) : Math.atan2(x, y));
    const ligar = (inst) => { X = inst.exports; mem = X.memory; try { X._start(); } catch (e) { if (!e || e.ondaExit === undefined) throw e; } };
    const bytes = () => (typeof atob === 'function' ? Uint8Array.from(atob(WASM), (ch) => ch.charCodeAt(0)) : Uint8Array.from(Buffer.from(WASM, 'base64')));
    let pronto;
    if (typeof WebAssembly === 'undefined') pronto = Promise.reject(new Error('sem WebAssembly'));
    else {
        // o módulo é pequeno: compila-se já (os gestos funcionam desde o primeiro toque); se o browser não deixar, em fundo
        try { ligar(new WebAssembly.Instance(new WebAssembly.Module(bytes()), { env: { sys, m1, m2 } })); pronto = Promise.resolve(); }
        catch { pronto = WebAssembly.instantiate(bytes(), { env: { sys, m1, m2 } }).then((r) => ligar(r.instance)); }
    }
    pronto.catch(() => {});
    const N = (v) => Number(v);
    const api = {
        pronto,
        get ok() { return !!X; },
        // contexto (bits): junta-se no início do toque
        FOLHA: 1, TOPO: 2, DESLIZA: 4, CAMPO: 8, LINHA: 16, BORDA: 32, PAGINAS: 64, ATUALIZA: 128, A_PUXAR: 256, SEPARADORES: 512, A_ATUALIZAR: 1024,
        // modos
        AINDA: 0, NENHUM: -1, FECHAR: 1, PAGINA: 2, SEPARADOR: 3, APAGAR: 4, ATUALIZAR: 5,
        modo: (c, dx, dy) => (X ? N(X.gmodo(BigInt(c | 0), +dx, +dy)) : -1),
        segue: (m, d, w = 0, tem = true) => (X ? X.gsegue(BigInt(m | 0), +d, +w, tem ? 1n : 0n) : 0),
        fim: (m, d, ms, w = 0) => (X ? N(X.gfim(BigInt(m | 0), +d, BigInt(Math.max(0, Math.round(ms))), +w)) === 1 : false),
        arma: (d, w) => (X ? N(X.garma(+d, +w)) === 1 : false),
        opac: (d) => (X ? X.gopac(+d) : 1),
        opacs: (d) => (X ? X.gopacs(+d) : 1),
    };
    root.OndaGestos = api;
    if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
`;
const js = ponte.replace('@WASM@', wasm.toString('base64')).replace('@LINHAS@', linhas).replace('@BYTES@', wasm.length);
if (process.argv.includes('--verificar')) {
    const antes = existsSync(DESTINO) ? readFileSync(DESTINO, 'utf8') : '';
    if (antes !== js) { console.error('onda/rt/gestos-onda.js não corresponde a gestos.onda: corre node onda/rt/gestos.mjs'); process.exit(1); }
    console.log('gestos-onda.js em dia');
} else {
    writeFileSync(DESTINO, js);
    console.log(`onda/rt/gestos-onda.js: ${linhas} linhas de Onda, ${wasm.length} bytes de WebAssembly`);
}
