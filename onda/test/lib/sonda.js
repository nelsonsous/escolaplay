// A biblioteca da Onda (onda/lib) num módulo WebAssembly, para os testes onda/test/biblioteca-*.test.js: compila os
// módulos todos com a sonda (test/lib/sonda.onda: as funções t_* que o JS chama) e dá um anfitrião mínimo —
// chamar(nome, ...args) devolve o que a Onda escreveu; texto(s), reais(xs) e inteiros(xs) põem dados na memória;
// marca()/solta() repõem o monte entre lotes.
'use strict';
const { execFileSync } = require('node:child_process');
const fs = require('node:fs'), path = require('node:path');
const R = path.join(__dirname, '..', '..');
const ondac = path.join(R, 'build/ondac');
// a ordem pela qual os módulos se juntam (ver lib/LEIA.md)
const MODULOS = ['memoria', 'texto', 'numero', 'valor', 'json', 'arvore', 'data', 'ordenar', 'html', 'anfitriao'];
const fonte = (mods = MODULOS) => mods.map((m) => fs.readFileSync(path.join(R, 'lib', m + '.onda'), 'utf8')).join('\n');

function compilar(src, nomes = []) {
  const w = execFileSync(ondac, ['-w', ...nomes], { input: src, maxBuffer: 64 << 20 });
  if (w.subarray(0, 4).toString('latin1') !== '\0asm') throw new Error(w.toString().slice(0, 2000));
  return w;
}

// WTF-8: o UTF-8 em que um substituto sozinho do UTF-16 fica nos seus 3 bytes (é o que a Onda guarda; o Buffer do
// Node troca-o por U+FFFD), nos dois sentidos
function wtf8(s) {
  const u = [];
  for (let i = 0; i < s.length; i++) {
    let c = s.charCodeAt(i);
    if (c >= 0xd800 && c < 0xdc00 && i + 1 < s.length) { const d = s.charCodeAt(i + 1); if (d >= 0xdc00 && d < 0xe000) { c = 0x10000 + ((c - 0xd800) << 10) + (d - 0xdc00); i++; } }
    if (c < 0x80) u.push(c); else if (c < 0x800) u.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) u.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else u.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return Buffer.from(u);
}
function dewtf8(b) {
  let s = '';
  for (let i = 0; i < b.length;) {
    const c = b[i];
    if (c < 0x80) { s += String.fromCharCode(c); i++; continue; }
    const n = c >= 0xf0 ? 3 : c >= 0xe0 ? 2 : c >= 0xc0 ? 1 : 0;
    let u = n === 3 ? c & 7 : n === 2 ? c & 15 : c & 31;
    if (n === 0 || i + n >= b.length) { s += String.fromCharCode(0xfffd); i++; continue; }
    for (let k = 1; k <= n; k++) u = (u << 6) | (b[i + k] & 63);
    s += String.fromCodePoint(u); i += n + 1;
  }
  return s;
}

function criar(extra = '') {
  // o main reserva já o bloco da biblioteca: fica abaixo das marcas dos lotes
  const wasm = compilar(fonte() + '\n' + fs.readFileSync(path.join(__dirname, 'sonda.onda'), 'utf8') + '\n' + extra + '\n: main >i { _me_lb 0 }\n');
  let mem = null, out = [], u8 = null, i32 = null, f64 = null, i64 = null;
  const vistas = () => { if (!u8 || u8.buffer !== mem.buffer) { u8 = new Uint8Array(mem.buffer); i32 = new Int32Array(mem.buffer); f64 = new Float64Array(mem.buffer); i64 = new BigInt64Array(mem.buffer); } };
  const sys = (c, a, b) => {
    switch (Number(c)) {
      case 0: { vistas(); const n = Number(b), o = (Number(a) + 16) * 8, u = new Uint8Array(n); for (let i = 0; i < n; i++) u[i] = u8[o + 8 * i]; out.push(u); return 0n; }
      case 1: return -1n;
      case 2: throw { ondaExit: Number(a) };
      case 6: return BigInt(Date.now() * 1000);
      case 7: { const need = (Number(a) + 16) * 8, cur = mem.buffer.byteLength; if (need > cur) mem.grow(Math.ceil((need - cur) / 65536)); return BigInt(mem.buffer.byteLength / 8 - 16); }
    }
    throw new Error('sonda: porta ' + c);
  };
  const m1 = (c, x) => [Math.sin, Math.cos, Math.exp, Math.log][Number(c)](x);
  const m2 = (c, x, y) => (Number(c) === 0 ? Math.pow(x, y) : Math.atan2(x, y));
  const ex = new WebAssembly.Instance(new WebAssembly.Module(wasm), { env: { sys, m1, m2 } }).exports;
  mem = ex.memory;
  const vai = (f) => { try { return f(); } catch (e) { if (!e || e.ondaExit === undefined) throw e; } };
  vai(() => ex._start());
  const saida = () => { vai(() => ex._fl()); const t = Buffer.concat(out.map((u) => Buffer.from(u))); out = []; return t; };
  saida();
  const S = {
    ex, wasm,
    // o que a função nome escreveu (texto UTF-8; bytes: S.bytes)
    // os inteiros vão como BigInt (1n), os reais como number
    chamar: (nome, ...a) => { vai(() => ex[nome](...a)); return dewtf8(saida()); },
    bytes: (nome, ...a) => { vai(() => ex[nome](...a)); return saida(); },
    // um lote: os elementos vêm separados pelo byte 255 (não há em UTF-8)
    lote: (f, b) => { vai(() => ex[f](BigInt(b))); const u = saida(), r = []; let i = 0; for (let j = 0; j < u.length; j++) if (u[j] === 255) { r.push(dewtf8(u.subarray(i, j))); i = j + 1; } return r; },
    reserva: (n) => Number(ex._oa(BigInt(n))),
    // um texto (UTF-8 de uma string, ou os bytes de um Buffer)
    texto: (s) => {
      const u = Buffer.isBuffer(s) ? s : wtf8(s);
      const t = S.reserva(u.length + 1); vistas();
      let w = (t + 16) * 2; i32[w] = t + 1 + u.length; i32[w + 1] = 0;
      for (let i = 0; i < u.length; i++) { w += 2; i32[w] = u[i]; i32[w + 1] = 0; }
      return t;
    },
    pi: (p, x) => { vistas(); i64[p + 16] = BigInt(x); },
    pf: (p, x) => { vistas(); f64[p + 16] = x; },
    gi: (p) => { vistas(); return Number(i64[p + 16]); },
    gf: (p) => { vistas(); return f64[p + 16]; },
    marca: () => { vistas(); return Number(i64[15]); },
    solta: (m) => { vistas(); const t = Number(i64[15]); if (t > m) new Uint8Array(mem.buffer, (m + 16) * 8, (t - m) * 8).fill(0); i64[15] = BigInt(m); },
    // um lote de reais para a t_lf: uma linha por x
    lf: (op, xs, a = 0) => {
      const m = S.marca(), b = S.reserva(3 + xs.length);
      S.pi(b, op); S.pi(b + 1, xs.length); S.pi(b + 2, a); vistas(); f64.set(xs, b + 3 + 16);
      const r = S.lote('t_lf', b); S.solta(m); return r;
    },
    l2: (op, xs, ys) => {
      const m = S.marca(), b = S.reserva(2 + 2 * xs.length);
      S.pi(b, op); S.pi(b + 1, xs.length); vistas(); xs.forEach((x, i) => { f64[b + 2 + 2 * i + 16] = x; f64[b + 3 + 2 * i + 16] = ys[i]; });
      const r = S.lote('t_l2', b); S.solta(m); return r;
    },
    lt: (op, ss) => {
      const m = S.marca(), ts = ss.map((s) => S.texto(s)), b = S.reserva(2 + ts.length);
      S.pi(b, op); S.pi(b + 1, ts.length); ts.forEach((t, i) => S.pi(b + 2 + i, t));
      const r = S.lote('t_lt', b); S.solta(m); return r;
    },
    li: (op, xs) => {
      const m = S.marca(), b = S.reserva(2 + xs.length);
      S.pi(b, op); S.pi(b + 1, xs.length); xs.forEach((x, i) => S.pi(b + 2 + i, x));
      const r = S.lote('t_li', b); S.solta(m); return r;
    },
  };
  return S;
}

// os 64 bits de um real como a t_bits os escreve ("alto baixo", alto com sinal)
function bits(x) { const v = new DataView(new ArrayBuffer(8)); v.setFloat64(0, x); return `${v.getInt32(0)} ${v.getUint32(4)}`; }
// o real que a t_bits escreveu é x? (o Object.is: o NaN é o NaN, seja qual for o padrão dos bits — no JS não se vê —, e o -0 não é o 0)
function mesmo(r, x) { const [h, l] = r.split(' ').map(Number), v = new DataView(new ArrayBuffer(8)); v.setInt32(0, h); v.setUint32(4, l); return Object.is(v.getFloat64(0), x); }
// gerador ao acaso com semente (para os testes darem sempre o mesmo)
function gerador(seed) {
  let s = seed >>> 0;
  const R = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const dv = new DataView(new ArrayBuffer(8));
  return {
    R, int: (n) => Math.floor(R() * n), pick: (a) => a[Math.floor(R() * a.length)],
    // um real com 64 bits ao acaso (todos os expoentes, NaN e infinitos incluídos)
    bits: () => { dv.setUint32(0, Math.floor(R() * 2 ** 32)); dv.setUint32(4, Math.floor(R() * 2 ** 32)); return dv.getFloat64(0); },
    // o real ao lado (d ulps)
    ulp: (x, d) => { dv.setFloat64(0, x); const lo = dv.getUint32(4) + d; if (lo < 0 || lo > 0xffffffff) return x; dv.setUint32(4, lo); return dv.getFloat64(0); },
  };
}

module.exports = { criar, compilar, fonte, bits, mesmo, gerador, wtf8, dewtf8, MODULOS, R, ondac };
