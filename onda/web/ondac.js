// Carrega o compilador Onda (WebAssembly escrito pela propria Onda) e compila codigo Onda para C, GLSL ou JavaScript.
// O anfitriao so oferece tres portas: sys (sistema), m1 e m2 (funcoes matematicas). Funciona no browser e no Node.
const OndaC = (() => {
  let mod = null;
  const enc = new TextEncoder();
  function cfmt(x) {
    if (Number.isNaN(x)) return 'nan';
    if (!Number.isFinite(x)) return x < 0 ? '-inf' : 'inf';
    if (x === 0) return Object.is(x, -0) ? '-0' : '0';
    const tira = t => (t.includes('.') ? t.replace(/0+$/, '').replace(/\.$/, '') : t);
    const [m, ex] = x.toExponential(14).split('e'), e = Number(ex);
    if (e >= -4 && e < 15) return tira(x.toFixed(14 - e));
    return tira(m) + 'e' + (e < 0 ? '-' : '+') + String(Math.abs(e)).padStart(2, '0');
  }
  async function load(bytes) { mod = await WebAssembly.compile(bytes); return mod; }
  async function compile(src, entry, mode) {
    const input = enc.encode(src);
    const flags = mode === 'w' ? ['-w'] : (entry ? ['-' + (mode === 'j' ? 'j' : 'g'), entry] : []);
    const args = ['ondac'].concat(flags).map(s => enc.encode(s));
    const out = [];
    let ip = 0, code = 0, mem = null, kb = -1n;
    const words = (a, n) => new BigInt64Array(mem.buffer, (Number(a) + 16) * 8, n);
    const sys = (c, a, b) => {
      switch (Number(c)) {
        case 0: { const n = Number(b), v = words(a, n), u = new Uint8Array(n); for (let i = 0; i < n; i++) u[i] = Number(v[i] & 255n); out.push(u); return 0n; }
        case 1: return ip < input.length ? BigInt(input[ip++]) : -1n;
        case 2: code = Number(a); throw { ondaExit: code };
        case 3: return BigInt(args.length);
        case 4: { const s = args[Number(a)], j = Number(b); return s && j >= 0 && j < s.length ? BigInt(s[j]) : 0n; }
        case 5: { const x = new Float64Array(new BigInt64Array([a]).buffer)[0], t = cfmt(x), v = words(b, t.length); for (let i = 0; i < t.length; i++) v[i] = BigInt(t.charCodeAt(i)); return BigInt(t.length); }
        case 6: return BigInt(Math.round((performance.timeOrigin + performance.now()) * 1000));
        case 7: { const need = (Number(a) + 16) * 8, cur = mem.buffer.byteLength; if (need > cur) mem.grow(Math.ceil((need - cur) / 65536)); return BigInt(mem.buffer.byteLength / 8 - 16); }
        case 8: { if (kb < 0n) { const z = Math.max(Number(a), 1); kb = words(-1, 1)[0]; const top = Number(kb) + z, need = (top + 16) * 8, cur = mem.buffer.byteLength; if (need > cur) mem.grow(Math.ceil((need - cur) / 65536)); words(-1, 1)[0] = BigInt(top); words(-7, 1)[0] = BigInt(mem.buffer.byteLength / 8 - 16); } return kb; }
      }
      return 0n;
    };
    const m1 = (c, x) => [Math.sin, Math.cos, Math.exp, Math.log][Number(c)](x);
    const m2 = (c, x, y) => (c === 0n ? Math.pow(x, y) : Math.atan2(x, y));
    const inst = await WebAssembly.instantiate(mod, { env: { sys, m1, m2 } });
    mem = inst.exports.memory;
    const t0 = performance.now();
    try { inst.exports._start(); } catch (x) { if (x.ondaExit === undefined) throw x; }
    const ms = performance.now() - t0;
    let n = 0;
    for (const c of out) n += c.length;
    const all = new Uint8Array(n);
    let o = 0;
    for (const c of out) { all.set(c, o); o += c.length; }
    return { code, ms, text: new TextDecoder().decode(all), bytes: all };
  }
  // corre um programa Onda ja compilado para WASM (bytes), com o mesmo anfitriao de 3 portas; devolve a saida.
  async function run(bytes, stdin) {
    const input = stdin instanceof Uint8Array ? stdin : enc.encode(stdin || '');
    const out = []; let ip = 0, code = 0, mem = null, kb = -1n;
    const words = (a, n) => new BigInt64Array(mem.buffer, (Number(a) + 16) * 8, n);
    const sys = (c, a, b) => {
      switch (Number(c)) {
        case 0: { const n = Number(b), v = words(a, n), u = new Uint8Array(n); for (let i = 0; i < n; i++) u[i] = Number(v[i] & 255n); out.push(u); return 0n; }
        case 1: return ip < input.length ? BigInt(input[ip++]) : -1n;
        case 2: code = Number(a); throw { ondaExit: code };
        case 5: { const x = new Float64Array(new BigInt64Array([a]).buffer)[0], t = cfmt(x), v = words(b, t.length); for (let i = 0; i < t.length; i++) v[i] = BigInt(t.charCodeAt(i)); return BigInt(t.length); }
        case 6: return BigInt(Math.round((performance.timeOrigin + performance.now()) * 1000));
        case 7: { const need = (Number(a) + 16) * 8, cur = mem.buffer.byteLength; if (need > cur) mem.grow(Math.ceil((need - cur) / 65536)); return BigInt(mem.buffer.byteLength / 8 - 16); }
        case 8: { if (kb < 0n) { const z = Math.max(Number(a), 1); kb = words(-1, 1)[0]; const top = Number(kb) + z, need = (top + 16) * 8, cur = mem.buffer.byteLength; if (need > cur) mem.grow(Math.ceil((need - cur) / 65536)); words(-1, 1)[0] = BigInt(top); words(-7, 1)[0] = BigInt(mem.buffer.byteLength / 8 - 16); } return kb; }
      }
      return 0n;
    };
    const m1 = (c, x) => [Math.sin, Math.cos, Math.exp, Math.log][Number(c)](x);
    const m2 = (c, x, y) => (c === 0n ? Math.pow(x, y) : Math.atan2(x, y));
    const inst = await WebAssembly.instantiate(await WebAssembly.compile(bytes), { env: { sys, m1, m2 } });
    mem = inst.exports.memory;
    const t0 = performance.now();
    try { inst.exports._start(); } catch (x) { if (x.ondaExit === undefined) throw x; }
    const ms = performance.now() - t0;
    let n = 0; for (const c of out) n += c.length; const all = new Uint8Array(n);
    let o = 0; for (const c of out) { all.set(c, o); o += c.length; }
    return { code, ms, text: new TextDecoder().decode(all) };
  }
  return { load, compile, run, cfmt };
})();
if (typeof module !== 'undefined') module.exports = OndaC;
