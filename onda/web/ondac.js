// Carrega o compilador Onda (WebAssembly) e compila codigo Onda -> C ou GLSL. Funciona no browser e no Node.
const OndaC = (() => {
  let mod = null;
  const fmtg = x => { if (!isFinite(x)) return isNaN(x) ? 'nan' : (x < 0 ? '-inf' : 'inf'); return String(parseFloat(x.toPrecision(15))); };
  async function load(bytes) { mod = await WebAssembly.compile(bytes); return mod; }
  async function compile(src, entry, mode) {
    let mem, code = 0; const out = [], err = [];
    const env = {
      jw: (fd, p, n) => (fd === 2 ? err : out).push(new Uint8Array(mem.buffer, p, n).slice()),
      jx: c => { code = c; throw { ondaExit: c }; },
      jg: (x, b, n) => { const s = new TextEncoder().encode(fmtg(x)).slice(0, n - 1); const m = new Uint8Array(mem.buffer, b, n); m.set(s); m[s.length] = 0; return s.length; },
      jm: (f, x, y) => f === 0 ? Math.sin(x) : f === 1 ? Math.cos(x) : f === 2 ? Math.exp(x) : f === 3 ? Math.log(x) : f === 4 ? Math.pow(x, y) : Math.atan2(x, y),
      jt: () => (typeof performance !== 'undefined' ? performance.timeOrigin + performance.now() : Date.now()),
    };
    const inst = await WebAssembly.instantiate(mod, { env });
    mem = inst.exports.memory;
    const s = new TextEncoder().encode(src);
    new Uint8Array(mem.buffer, inst.exports.inbuf(), s.length).set(s);
    const a = new Uint8Array(mem.buffer, inst.exports.argbuf(), 256); a.fill(0); if (entry) a.set(new TextEncoder().encode(entry).slice(0, 255));
    const t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    try { code = inst.exports.run(s.length, entry ? (mode === 'j' ? 2 : 1) : 0); } catch (x) { if (x.ondaExit === undefined) throw x; }
    const ms = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0;
    let n = 0; for (const c of out) n += c.length;
    const all = new Uint8Array(n); let o = 0; for (const c of out) { all.set(c, o); o += c.length; }
    return { code, ms, text: new TextDecoder().decode(all) };
  }
  return { load, compile };
})();
if (typeof module !== 'undefined') module.exports = OndaC;
