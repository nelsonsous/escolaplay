// Anfitriao minimo para correr um modulo WebAssembly gerado pela Onda (ondac -w).
// O runtime (saida, memoria, desvio de saida) esta escrito em Onda dentro do modulo;
// aqui so ha tres portas: sys (sistema), m1 e m2 (funcoes matematicas).
// Uso: node host.js prog.wasm [args...] < entrada
const fs = require('fs');
const bytes = fs.readFileSync(process.argv[2]);
const args = ['prog', ...process.argv.slice(3)].map(s => Buffer.from(s));
let mem = null, inbuf = null, ip = 0, kb = -1n;
const W = a => new BigInt64Array(mem.buffer, (Number(a) + 16) * 8);
// imita o printf("%.15g") do C
function cfmt(x) {
  if (Number.isNaN(x)) return 'nan';
  if (!Number.isFinite(x)) return x < 0 ? '-inf' : 'inf';
  if (x === 0) return Object.is(x, -0) ? '-0' : '0';
  const e = Number(x.toExponential(14).split('e')[1]);
  const tira = t => (t.includes('.') ? t.replace(/0+$/, '').replace(/\.$/, '') : t);
  if (e >= -4 && e < 15) return tira(x.toFixed(14 - e));
  let [m, ex] = x.toExponential(14).split('e');
  const n = Number(ex);
  return tira(m) + 'e' + (n < 0 ? '-' : '+') + String(Math.abs(n)).padStart(2, '0');
}
function sys(c, a, b) {
  switch (Number(c)) {
    case 0: { const n = Number(b), v = new BigInt64Array(mem.buffer, (Number(a) + 16) * 8, n), u = Buffer.alloc(n); for (let i = 0; i < n; i++) u[i] = Number(v[i] & 255n); fs.writeSync(1, u); return 0n; }
    case 1: if (!inbuf) { try { inbuf = fs.readFileSync(0); } catch (e) { inbuf = Buffer.alloc(0); } } return ip < inbuf.length ? BigInt(inbuf[ip++]) : -1n;
    case 2: process.exit(Number(a));
    case 3: return BigInt(args.length);
    case 4: { const s = args[Number(a)]; const j = Number(b); return s && j >= 0 && j < s.length ? BigInt(s[j]) : 0n; }
    case 5: { const x = new Float64Array(new BigInt64Array([a]).buffer)[0], t = cfmt(x), v = W(b); for (let i = 0; i < t.length; i++) v[i] = BigInt(t.charCodeAt(i)); return BigInt(t.length); }
    case 6: return BigInt(Math.round((performance.timeOrigin + performance.now()) * 1000));
    case 7: { const need = (Number(a) + 16) * 8, cur = mem.buffer.byteLength; if (need > cur) mem.grow(Math.ceil((need - cur) / 65536)); return BigInt(mem.buffer.byteLength / 8 - 16); }
    case 8: return armazem(Number(a));
  }
  return 0n;
}
// armazem (K n): reserva n palavras no monte (M[-1]) e, com ONDA_ARM, carrega o ficheiro e grava-o a saida (atomico: .tmp e rename)
function armazem(n) {
  if (kb >= 0n) return kb;
  const f = process.env.ONDA_ARM;
  const buf = f && fs.existsSync(f) ? fs.readFileSync(f) : null;
  const z = Math.max(n, 1, buf ? Math.floor(buf.length / 8) : 0);
  kb = W(-16)[15];
  const top = Number(kb) + z, need = (top + 16) * 8, cur = mem.buffer.byteLength;
  if (need > cur) mem.grow(Math.ceil((need - cur) / 65536));
  const s = W(-16); s[15] = BigInt(top); s[9] = BigInt(mem.buffer.byteLength / 8 - 16);
  if (buf) new Uint8Array(mem.buffer, (Number(kb) + 16) * 8, z * 8).set(buf.subarray(0, z * 8));
  if (f) process.on('exit', () => { fs.writeFileSync(f + '.tmp', new Uint8Array(mem.buffer, (Number(kb) + 16) * 8, z * 8)); fs.renameSync(f + '.tmp', f); });
  return kb;
}
const m1 = (c, x) => [Math.sin, Math.cos, Math.exp, Math.log][Number(c)](x);
const m2 = (c, x, y) => (c === 0n ? Math.pow(x, y) : Math.atan2(x, y));
WebAssembly.instantiate(bytes, { env: { sys, m1, m2 } }).then(({ instance }) => { mem = instance.exports.memory; instance.exports._start(); })
  .catch(e => { console.error('onda/wasm:', e.message); process.exit(3); });
