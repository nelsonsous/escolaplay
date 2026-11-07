// Saida de texto em WebAssembly: ~27 KB de HTML feitos de textos literais e numeros (bench/saida.onda), como uma vista
// de app. Mede, em Node, com os modulos dados (p.ex. o de um compilador antigo e o do atual), alternados no mesmo
// processo: render(230) para o stdout (com a copia do anfitriao e o UTF-8 para um texto do JS, como as apps fazem),
// rtexto(230) para um texto do O (so o WebAssembly) e, para comparar, o mesmo HTML feito em JavaScript.
//   build/ondac -w < bench/saida.onda > /tmp/novo.wasm && node bench/saida.mjs /tmp/novo.wasm [outro.wasm ...]
import { readFileSync } from 'node:fs';
const N = 230, R = +(process.env.R || 3000);
function inst(file) {
  const bytes = readFileSync(file);
  let mem, total = 0, out = new Uint8Array(1 << 20);
  const sys = (c, a, b) => {
    switch (Number(c)) {
      case 0: { const n = Number(b), m8 = new Uint8Array(mem.buffer, (Number(a) + 16) * 8, n * 8); for (let i = 0; i < n; i++) out[total + i] = m8[i << 3]; total += n; return 0n; }
      case 1: return -1n;
      case 2: throw { ondaExit: Number(a) };
      case 7: { const need = (Number(a) + 16) * 8, cur = mem.buffer.byteLength; if (need > cur) mem.grow(Math.ceil((need - cur) / 65536)); return BigInt(mem.buffer.byteLength / 8 - 16); }
    }
    return 0n;
  };
  const ex = new WebAssembly.Instance(new WebAssembly.Module(bytes), { env: { sys, m1: Math.sin, m2: Math.pow } }).exports;
  mem = ex.memory;
  try { ex._start(); } catch (e) { if (e.ondaExit === undefined) throw e; }
  const top0 = new BigInt64Array(mem.buffer, 15 * 8, 1)[0];
  const reset = () => { total = 0; new BigInt64Array(mem.buffer, 15 * 8, 1)[0] = top0; };
  return { file, size: bytes.length, ex, reset, texto: () => Buffer.from(out.buffer, 0, total).toString('utf8'), ta: [], tb: [] };
}
const js = (n) => { let s = ''; for (let i = 0; i < n; i++) s += `<tr class="linha" data-i="${i}"><td class="nome">Ativo ${i}</td><td class="num">${i * 37}</td><td>${(i * 7919) % 1000} €</td><td>ok</td></tr>\n`; return s; };
const M = process.argv.slice(2).map(inst), tj = [];
let html = '';
for (let r = 0; r < R; r++) {
  for (const m of M) {
    m.reset(); let t0 = performance.now(); m.ex.render(BigInt(N)); m.ex._fl(); const s = m.texto(); m.ta.push(performance.now() - t0);
    if (r === 0) m.html = s;
    m.reset(); t0 = performance.now(); m.len = Number(m.ex.rtexto(BigInt(N))); m.tb.push(performance.now() - t0);
  }
  const t0 = performance.now(); html = js(N); html.charCodeAt(html.length >> 1); tj.push(performance.now() - t0);
}
const st = (a) => { a.sort((x, y) => x - y); return `${(a[a.length >> 1] * 1000).toFixed(1)} us (min ${(a[0] * 1000).toFixed(1)})`; };
for (const m of M) console.log(`${m.file}: ${m.size} B; stdout -> texto do JS: ${st(m.ta)}; O t (${m.len} B): ${st(m.tb)}; igual ao JS: ${m.html === html}`);
console.log(`JavaScript (template + concatenacao, ${html.length} car.): ${st(tj)}`);
