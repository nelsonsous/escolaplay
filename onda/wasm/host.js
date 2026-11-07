// Anfitriao minimo para correr um modulo WebAssembly gerado pela Onda (ondac -w).
// O runtime (saida, memoria, desvio de saida) esta escrito em Onda dentro do modulo;
// aqui so ha tres portas: sys (sistema), m1 e m2 (funcoes matematicas).
// Uso: node host.js prog.wasm [args...] < entrada
const fs = require('fs');
const bytes = fs.readFileSync(process.argv[2]);
const args = ['prog', ...process.argv.slice(3)].map(s => Buffer.from(s));
let mem = null, inbuf = null, ip = 0, kb = -1n;
const W = a => new BigInt64Array(mem.buffer, (Number(a) + 16) * 8);
// imita o printf("%.15g") do C, exatamente: os 15 algarismos sao calculados sobre o valor exato do real (BigInt) e
// arredondados ao mais proximo com empate para o par, como o printf (o toFixed/toExponential do JS arredonda os
// empates para cima). E o mesmo metodo do _od do runtime em Onda (x86/arm64), logo as tres formas imprimem igual.
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
function cfmt(x) {
  if (Number.isNaN(x)) return 'nan';
  if (!Number.isFinite(x)) return x < 0 ? '-inf' : 'inf';
  if (x === 0) return Object.is(x, -0) ? '-0' : '0';
  const sg = x < 0 ? '-' : '';
  const [d, e] = dig15(Math.abs(x));
  const tira = t => (t.includes('.') ? t.replace(/0+$/, '').replace(/\.$/, '') : t);
  if (e >= -4 && e < 15) return sg + tira(e >= 0 ? d.slice(0, e + 1) + '.' + d.slice(e + 1) : '0.' + '0'.repeat(-e - 1) + d);
  return sg + tira(d[0] + '.' + d.slice(1)) + 'e' + (e < 0 ? '-' : '+') + String(Math.abs(e)).padStart(2, '0');
}
function sys(c, a, b) {
  switch (Number(c)) {
    case 0: { const n = Number(b), v = new BigInt64Array(mem.buffer, (Number(a) + 16) * 8, n), u = Buffer.alloc(n); for (let i = 0; i < n; i++) u[i] = Number(v[i] & 255n); fs.writeSync(1, u); return 0n; }
    case 1: if (!inbuf) { try { inbuf = fs.readFileSync(0); } catch (e) { inbuf = Buffer.alloc(0); } } return ip < inbuf.length ? BigInt(inbuf[ip++]) : -1n;
    case 2: kcommit(); process.exit(Number(a));
    case 3: return BigInt(args.length);
    case 4: { const s = args[Number(a)]; const j = Number(b); return s && j >= 0 && j < s.length ? BigInt(s[j]) : 0n; }
    case 5: { const x = new Float64Array(new BigInt64Array([a]).buffer)[0], t = cfmt(x), v = W(b); for (let i = 0; i < t.length; i++) v[i] = BigInt(t.charCodeAt(i)); return BigInt(t.length); }
    case 6: return BigInt(Math.round((performance.timeOrigin + performance.now()) * 1000));
    case 7: { const need = (Number(a) + 16) * 8, cur = mem.buffer.byteLength; if (need > cur) mem.grow(Math.ceil((need - cur) / 65536)); return BigInt(mem.buffer.byteLength / 8 - 16); }
    case 8: return armazem(Number(a));
    case 9: return kcommit();
  }
  return 0n;
}
// armazem (K n): n palavras no monte (M[-1]). Com ONDA_ARM e o ficheiro, com o mesmo protocolo do C e do x86:
// Kc (ou a saida) poe as paginas mudadas no diario ficheiro.j (indice, pagina; rodape n, soma FNV-1a, marca), fsync,
// e so depois no ficheiro; ao abrir, um diario completo e reaplicado e um incompleto e deitado fora.
const PG = 4096, MAG = 0x314E524A41444E4Fn, M64 = (1n << 64n) - 1n;
let kz = 0, kf = null, kbase = null;
const fnv = (s, b) => { const v = new BigUint64Array(Uint8Array.from(b).buffer); for (const w of v) s = ((s ^ w) * 0x100000001b3n) & M64; return s; };
function krec(f) {
  const jf = f + '.j';
  if (!fs.existsSync(jf)) return;
  const b = fs.readFileSync(jf), l = b.length;
  if (l >= 24 && (l - 24) % (8 + PG) === 0) {
    const n = (l - 24) / (8 + PG);
    if (b.readBigUInt64LE(l - 24) === BigInt(n) && b.readBigUInt64LE(l - 8) === MAG && b.readBigUInt64LE(l - 16) === fnv(0xcbf29ce484222325n, b.subarray(0, l - 24))) {
      const d = fs.openSync(f, 'r+');
      for (let i = 0; i < n; i++) { const o = i * (8 + PG); fs.writeSync(d, b, o + 8, PG, Number(b.readBigUInt64LE(o)) * PG); }
      fs.fsyncSync(d); fs.closeSync(d);
    }
  }
  fs.unlinkSync(jf);
}
function armazem(n) {
  if (kb >= 0n) return kb;
  const f = process.env.ONDA_ARM;
  let z = Math.ceil(Math.max(n, 1) * 8 / PG) * PG;
  if (f) {
    if (fs.existsSync(f)) krec(f);
    const d = fs.openSync(f, fs.existsSync(f) ? 'r+' : 'w+');
    const l = fs.fstatSync(d).size;
    z = Math.max(z, Math.ceil(l / PG) * PG);
    if (l < z) fs.ftruncateSync(d, z);
    fs.closeSync(d);
    kbase = fs.readFileSync(f); kf = f;
  }
  kz = z / 8;
  kb = W(-16)[15];
  const top = Number(kb) + kz, need = (top + 16) * 8, cur = mem.buffer.byteLength;
  if (need > cur) mem.grow(Math.ceil((need - cur) / 65536));
  const s = W(-16); s[15] = BigInt(top); s[9] = BigInt(mem.buffer.byteLength / 8 - 16);
  if (kbase) new Uint8Array(mem.buffer, (Number(kb) + 16) * 8, z).set(kbase);
  return kb;
}
function kcommit() {
  if (!kf) return 0n;
  const m = new Uint8Array(mem.buffer, (Number(kb) + 16) * 8, kz * 8), np = kz * 8 / PG, suj = [];
  for (let i = 0; i < np; i++) if (Buffer.compare(m.subarray(i * PG, (i + 1) * PG), kbase.subarray(i * PG, (i + 1) * PG))) suj.push(i);
  if (!suj.length) return 0n;
  const rec = Buffer.alloc(suj.length * (8 + PG) + 24);
  suj.forEach((p, k) => { rec.writeBigUInt64LE(BigInt(p), k * (8 + PG)); rec.set(m.subarray(p * PG, (p + 1) * PG), k * (8 + PG) + 8); });
  const l = rec.length - 24;
  rec.writeBigUInt64LE(BigInt(suj.length), l); rec.writeBigUInt64LE(fnv(0xcbf29ce484222325n, rec.subarray(0, l)), l + 8); rec.writeBigUInt64LE(MAG, l + 16);
  const j = fs.openSync(kf + '.j', 'w'); fs.writeSync(j, rec); fs.fsyncSync(j); fs.closeSync(j);
  const d = fs.openSync(kf, 'r+');
  for (const p of suj) { fs.writeSync(d, m, p * PG, PG, p * PG); kbase.set(m.subarray(p * PG, (p + 1) * PG), p * PG); }
  fs.fsyncSync(d); fs.closeSync(d); fs.unlinkSync(kf + '.j');
  return BigInt(suj.length);
}
const m1 = (c, x) => [Math.sin, Math.cos, Math.exp, Math.log][Number(c)](x);
const m2 = (c, x, y) => (c === 0n ? Math.pow(x, y) : Math.atan2(x, y));
WebAssembly.instantiate(bytes, { env: { sys, m1, m2 } }).then(({ instance }) => { mem = instance.exports.memory; instance.exports._start(); })
  .catch(e => { console.error('onda/wasm:', e.message); process.exit(3); });
