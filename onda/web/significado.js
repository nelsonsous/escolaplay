// Significado: o interpretador de referencia da Onda (subconjunto puro, o que corre na GPU).
// E lento e obviamente correto. Nao otimiza nada: e o juiz contra o qual todas as formas rapidas sao medidas.
const Significado = (() => {
  const WS = c => c === 32 || c === 9 || c === 10 || c === 13;
  const DG = c => c >= 48 && c <= 57;
  const erro = m => new Error('significado: ' + m);

  // tokens com posicao no texto (as mesmas regras do lexer do compilador)
  function tokens(src) {
    const t = [], n = src.length;
    let i = 0;
    while (i < n) {
      const c = src.charCodeAt(i);
      if (WS(c)) { i++; continue; }
      if (c === 35) { while (i < n && src.charCodeAt(i) !== 10) i++; continue; }
      const s = i;
      if (c === 34) {
        i++;
        while (i < n && src.charCodeAt(i) !== 34) { if (src.charCodeAt(i) === 92) i++; i++; }
        if (i >= n) throw erro('texto sem fim');
        i++;
        t.push({ k: 3, x: src.slice(s, i), s, e: i });
        continue;
      }
      while (i < n && !WS(src.charCodeAt(i))) i++;
      const x = src.slice(s, i), l = i - s;
      let k;
      if (DG(c) || (c === 45 && l > 1 && DG(src.charCodeAt(s + 1)))) k = x.includes('.') ? 2 : 1;
      else if (c === 39) k = 4;
      else if ((c >= 97 && c <= 122) || c === 95) k = 0;
      else k = 5;
      t.push({ k, x, s, e: i });
    }
    return t;
  }

  const num = x => (x[0] === '-' ? -Number(x.slice(1)) : Number(x));
  const M1 = { Sq: Math.sqrt, Sn: Math.sin, Cs: Math.cos, Ex: Math.exp, Lg: Math.log, Fl: Math.floor, Ab: Math.abs };
  const M2 = { Pw: Math.pow, At: Math.atan2 };
  const BV = new DataView(new ArrayBuffer(8));
  const BI = { Bh: x => { BV.setFloat64(0, x); return BV.getInt32(0); }, Bl: x => { BV.setFloat64(0, x); return BV.getUint32(4); } };
  const BW = (h, l) => { BV.setInt32(0, h); BV.setUint32(4, l); return BV.getFloat64(0); };
  const BIN = { '+': 10, '-': 11, '*': 12, '/': 13, '%': 15, '&': 16, '|': 17, '^': 18, '<<': 19, '>>': 20 };
  const CMP = { '<': 21, '>': 22, '<=': 23, '>=': 24, '==': 25, '!=': 26 };
  const CPU = new Set(['@', '!', '@f', '!f', 'A', 'P', 'R', 'N', 'G', 'O', 'Ac', 'Av', 'X', 'T', 'E', 'D', 'Y']);

  function definicoes(T) {
    const F = new Map();
    let i = 0;
    while (i < T.length) {
      if (T[i].x === ':') {
        if (i + 2 >= T.length) throw erro('definicao incompleta');
        const sig = T[i + 2].x, g = sig.indexOf('>');
        if (g < 0 || sig.length !== g + 2) throw erro('assinatura invalida: ' + sig);
        const tipo = ch => { if (ch !== 'i' && ch !== 'f') throw erro('tipo invalido: ' + sig); return ch === 'f' ? 1 : 0; };
        const nome = T[i + 1].x;
        if (T[i + 1].k !== 0) throw erro('nome invalido: ' + nome);
        if (F.has(nome)) throw erro('funcao repetida: ' + nome);
        F.set(nome, { nome, pt: [...sig.slice(0, g)].map(tipo), ret: tipo(sig[g + 1]), par: T.slice(i + 3, i + 3 + g).map(t => t.x), em: i + 3 + g, corpo: null, nl: 0, aler: false });
        i = i + 3 + g;
      } else {
        if (!F.size) throw erro('codigo fora de definicao');
        i++;
      }
    }
    return F;
  }

  function construir(src) {
    const T = tokens(src), F = definicoes(T);
    const fn = nome => { const f = F.get(nome); if (!f) throw erro('nome desconhecido: ' + nome); if (!f.corpo && !f.aler) analisar(f); return f; };
    function analisar(f) {
      f.aler = true;
      const loc = new Map();
      f.par.forEach((p, j) => loc.set(p, { s: j, y: f.pt[j] }));
      let pos = f.em;
      const mesmo = (a, b) => { if (a.y !== b.y) throw erro('tipos diferentes'); };
      const int = a => { if (a.y !== 0) throw erro('esperava inteiro'); };
      const real = a => { if (a.y !== 1) throw erro('esperava real'); };
      function args(g, de) {
        const a = [];
        for (let j = de; j < g.pt.length; j++) { const n = ex(); if (n.y !== g.pt[j]) throw erro('argumento com tipo errado'); a.push(n); }
        return a;
      }
      function ex() {
        if (pos >= T.length) throw erro('fim inesperado');
        const t = T[pos++], x = t.x;
        if (t.k === 1) return { o: 0, y: 0, v: num(x) };
        if (t.k === 2) return { o: 0, y: 1, v: num(x) };
        if (t.k === 4) { if (x.length < 2) throw erro('caracter invalido'); return { o: 0, y: 0, v: new TextEncoder().encode(x)[1] }; }
        if (t.k === 3) throw erro('texto so existe na CPU');
        if (t.k === 0) {
          const l = loc.get(x);
          if (l) return { o: 1, y: l.y, s: l.s };
          const g = F.get(x);
          if (!g) throw erro('nome desconhecido: ' + x);
          const a = args(g, 0);
          fn(x);
          return { o: 2, y: g.ret, f: g, a };
        }
        if (x in BIN) {
          const a = ex(), b = ex(); mesmo(a, b);
          const op = BIN[x];
          if (op >= 15) int(a);
          return { o: op === 13 && a.y === 0 ? 14 : op, y: a.y, a, b };
        }
        if (x in CMP) { const a = ex(), b = ex(); mesmo(a, b); return { o: CMP[x], y: 0, a, b }; }
        if (x in M1) { const a = ex(); real(a); return { o: 32, y: 1, f: M1[x], a }; }
        if (x in M2) { const a = ex(), b = ex(); real(a); real(b); return { o: 33, y: 1, f: M2[x], a, b }; }
        if (x in BI) { const a = ex(); real(a); return { o: 41, y: 0, f: BI[x], a }; }
        if (x === 'Bw') { const a = ex(), b = ex(); int(a); int(b); return { o: 42, y: 1, a, b }; }
        if (CPU.has(x)) throw erro('operacao so de CPU: ' + x);
        switch (x) {
          case '&&': case '||': { const a = ex(); int(a); const b = ex(); int(b); return { o: x === '&&' ? 27 : 28, y: 0, a, b }; }
          case '~': { const a = ex(); int(a); return { o: 29, y: 0, a }; }
          case 'F': { const a = ex(); int(a); return { o: 30, y: 1, a }; }
          case 'I': { const a = ex(); real(a); return { o: 31, y: 0, a }; }
          case 'Mn': case 'Mx': { const a = ex(), b = ex(); mesmo(a, b); return { o: x === 'Mn' ? 34 : 35, y: a.y, a, b }; }
          case '?': { const c = ex(); int(c); const a = ex(), b = ex(); if (a.y !== b.y) throw erro('ramos com tipos diferentes'); return { o: 36, y: a.y, c, a, b }; }
          case 'W': { const c = ex(); int(c); const b = ex(); return { o: 37, y: 0, c, b }; }
          case '{': {
            const xs = [];
            for (;;) { if (pos >= T.length) throw erro('falta }'); if (T[pos].x === '}') break; xs.push(ex()); }
            pos++;
            return xs.length ? { o: 38, y: xs[xs.length - 1].y, xs } : { o: 0, y: 0, v: 0 };
          }
          case '=': {
            const nt = T[pos];
            if (!nt || nt.k !== 0) throw erro('= precisa de nome');
            pos++;
            const e = ex(); let l = loc.get(nt.x);
            if (!l) { l = { s: loc.size, y: e.y }; loc.set(nt.x, l); } else if (l.y !== e.y) throw erro('tipo de variavel mudou');
            return { o: 39, y: e.y, s: l.s, e };
          }
          case 'S': {
            const n = ex(); int(n);
            const ft = T[pos++];
            const g = ft && ft.k === 0 ? F.get(ft.x) : null;
            if (!g) throw erro('S precisa de uma funcao');
            if (g.pt.length < 1 || g.pt[0] !== 0) throw erro('indice deve ser inteiro');
            const a = args(g, 1);
            fn(g.nome);
            return { o: 40, y: g.ret, n, f: g, a };
          }
        }
        throw erro('operacao desconhecida: ' + x);
      }
      f.corpo = ex();
      if (f.corpo.y !== f.ret) throw erro('tipo de retorno errado em ' + f.nome);
      if (pos < T.length && T[pos].x !== ':') throw erro('tokens a mais em ' + f.nome);
      f.nl = loc.size;
      f.aler = false;
    }
    return { F, fn };
  }

  function ev(n, e) {
    switch (n.o) {
      case 0: return n.v;
      case 1: return e[n.s];
      case 2: { const f = n.f, q = new Array(f.nl).fill(0); for (let j = 0; j < n.a.length; j++) q[j] = ev(n.a[j], e); return ev(f.corpo, q); }
      case 10: return ev(n.a, e) + ev(n.b, e);
      case 11: return ev(n.a, e) - ev(n.b, e);
      case 12: return ev(n.a, e) * ev(n.b, e);
      case 13: return ev(n.a, e) / ev(n.b, e);
      case 14: { const a = ev(n.a, e), b = ev(n.b, e); return Math.trunc(a / b); }
      case 15: return ev(n.a, e) % ev(n.b, e);
      case 16: return ev(n.a, e) & ev(n.b, e);
      case 17: return ev(n.a, e) | ev(n.b, e);
      case 18: return ev(n.a, e) ^ ev(n.b, e);
      case 19: return ev(n.a, e) << ev(n.b, e);
      case 20: return ev(n.a, e) >> ev(n.b, e);
      case 21: return ev(n.a, e) < ev(n.b, e) ? 1 : 0;
      case 22: return ev(n.a, e) > ev(n.b, e) ? 1 : 0;
      case 23: return ev(n.a, e) <= ev(n.b, e) ? 1 : 0;
      case 24: return ev(n.a, e) >= ev(n.b, e) ? 1 : 0;
      case 25: return ev(n.a, e) === ev(n.b, e) ? 1 : 0;
      case 26: return ev(n.a, e) !== ev(n.b, e) ? 1 : 0;
      case 27: return ev(n.a, e) !== 0 ? (ev(n.b, e) !== 0 ? 1 : 0) : 0;
      case 28: return ev(n.a, e) === 0 ? (ev(n.b, e) !== 0 ? 1 : 0) : 1;
      case 29: return ev(n.a, e) === 0 ? 1 : 0;
      case 30: return ev(n.a, e);
      case 31: return Math.trunc(ev(n.a, e));
      case 32: return n.f(ev(n.a, e));
      case 33: { const a = ev(n.a, e); return n.f(a, ev(n.b, e)); }
      case 34: { const a = ev(n.a, e), b = ev(n.b, e); return a < b ? a : b; }
      case 35: { const a = ev(n.a, e), b = ev(n.b, e); return a > b ? a : b; }
      case 36: return ev(n.c, e) !== 0 ? ev(n.a, e) : ev(n.b, e);
      case 37: { while (ev(n.c, e) !== 0) ev(n.b, e); return 0; }
      case 38: { let r = 0; for (let j = 0; j < n.xs.length; j++) r = ev(n.xs[j], e); return r; }
      case 39: return (e[n.s] = ev(n.e, e));
      case 41: return n.f(ev(n.a, e));
      case 42: { const a = ev(n.a, e); return BW(a, ev(n.b, e)); }
      case 40: {
        const nn = ev(n.n, e), ex = n.a.map(x => ev(x, e)), f = n.f;
        let acc = 0;
        for (let i = 0; i < nn; i++) { const q = new Array(f.nl).fill(0); q[0] = i; for (let j = 0; j < ex.length; j++) q[j + 1] = ex[j]; acc += ev(f.corpo, q); }
        return acc;
      }
    }
    throw erro('no desconhecido ' + n.o);
  }

  // Devolve a funcao `nome` do programa como funcao JS que avalia o significado.
  function funcao(src, nome) {
    const p = construir(src), f = p.fn(nome);
    const call = (...args) => { const q = new Array(f.nl).fill(0); for (let j = 0; j < f.pt.length; j++) q[j] = args[j]; return ev(f.corpo, q); };
    call.assinatura = { pt: f.pt, ret: f.ret };
    call.tem = nm => p.F.has(nm);
    call.outra = nm => { const g = p.fn(nm); return (...a) => { const q = new Array(g.nl).fill(0); a.forEach((v, j) => { q[j] = v; }); return ev(g.corpo, q); }; };
    return call;
  }

  return { tokens, funcao };
})();
if (typeof module !== 'undefined') module.exports = Significado;
