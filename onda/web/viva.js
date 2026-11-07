// Onda Viva: o nucleo que gera formas rapidas de um significado, verifica-as e escolhe a melhor por medicao.
const Viva = (() => {
  async function sha256(texto) {
    const d = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto)));
    return Array.from(d, x => x.toString(16).padStart(2, '0')).join('');
  }
  // gerador pseudo-aleatorio reprodutivel (mulberry32)
  function aleatorio(semente) {
    let a = semente >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function amostras(n, W, H, semente) {
    const r = aleatorio(semente), p = [];
    for (let i = 0; i < n; i++) p.push({ x: Math.floor(r() * W), y: Math.floor(r() * H) });
    return p;
  }
  const hex = c => '#' + ((c >>> 0) & 0xffffff).toString(16).padStart(6, '0');
  const canais = c => [(c >> 16) & 255, (c >> 8) & 255, c & 255];
  function perto(a, b, tol) {
    if (tol === 0) return a === b;
    const p = canais(a), q = canais(b);
    return Math.abs(p[0] - q[0]) <= tol && Math.abs(p[1] - q[1]) <= tol && Math.abs(p[2] - q[2]) <= tol;
  }
  // Gera a forma CPU (JavaScript) atraves do compilador embutido.
  async function formaCPU(OndaC, src, entrada) {
    const r = await OndaC.compile(src, entrada, 'j');
    if (r.code !== 0 || r.text.includes('#error')) return { erro: (r.text.match(/#error onda: (.*)/) || [, r.text.trim()])[1] };
    try { return { fn: new Function(r.text)(), texto: r.text, ms: r.ms }; } catch (e) { return { erro: String(e.message || e) }; }
  }
  // Compara uma forma com o significado num conjunto de pixeis. tol = 0 exige igualdade bit a bit.
  function verificar(forma, sig, pontos, t, W, H, tol) {
    const falhas = [];
    let iguais = 0;
    for (const p of pontos) {
      const e = sig(p.x, p.y, t, W, H), o = forma(p.x, p.y, t, W, H);
      if (perto(e, o, tol)) iguais++; else falhas.push({ x: p.x, y: p.y, t, esperado: e, obtido: o });
    }
    return { iguais, n: pontos.length, falhas };
  }
  function medir(fn, t, W, H, n) {
    const r = aleatorio(7);
    let acc = 0;
    const t0 = performance.now();
    for (let i = 0; i < n; i++) acc ^= fn(Math.floor(r() * W), Math.floor(r() * H), t, W, H);
    return { usPx: (performance.now() - t0) * 1000 / n, acc };
  }
  // Erro injetado de proposito: a primeira constante real da funcao de entrada passa a valer 10% mais.
  function mutar(src, entrada) {
    const T = Significado.tokens(src);
    let i = T.findIndex((t, j) => t.x === ':' && T[j + 1] && T[j + 1].x === entrada);
    if (i < 0) return null;
    for (i = i + 3; i < T.length && T[i].x !== ':'; i++) {
      const t = T[i];
      if (t.k === 2 && Number(t.x) !== 0) {
        const novo = String(Number((Number(t.x) * 1.1).toPrecision(6)));
        const txt = novo.includes('.') ? novo : novo + '.0';
        return { src: src.slice(0, t.s) + txt + src.slice(t.e), de: t.x, para: txt };
      }
    }
    return null;
  }
  return { sha256, amostras, hex, canais, perto, formaCPU, verificar, medir, mutar };
})();
if (typeof module !== 'undefined') module.exports = Viva;
