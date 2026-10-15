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

  // a biblioteca de matematica da Onda (gerada por tools/gerar_mat.py): o significado interpreta o mesmo _pw que as formas compilam
  // <mat>
  const MAT = "# matematica da Onda em Onda (fdlibm): igual ao bit em C, WebAssembly e x86, e igual ao Math do JavaScript\n: _mks ffi>f x y iy {\n  = ix & Bh x 0x7fffffff\n  ? && < ix 0x3e400000 == I x 0 x\n  { = z * x x\n    = v * z x\n    = r + Bw 0x3F811111 0x1110F8A6 * z + Bw 0xBF2A01A0 0x19C161D5 * z + Bw 0x3EC71DE3 0x57B1FE7D * z + Bw 0xBE5AE5E6 0x8A2B9CEB * z Bw 0x3DE5D93A 0x5ACFD57C\n    ? == iy 0 + x * v + Bw 0xBFC55555 0x55555549 * z r - x - - * z - * 0.5 y * v r y * v Bw 0xBFC55555 0x55555549 } }\n: _mkc ff>f x y {\n  = ix & Bh x 0x7fffffff\n  ? && < ix 0x3e400000 == I x 0 1.0\n  { = z * x x\n    = r * z + Bw 0x3FA55555 0x5555554C * z + Bw 0xBF56C16C 0x16C15177 * z + Bw 0x3EFA01A0 0x19CB1590 * z + Bw 0xBE927E4F 0x809C52AD * z + Bw 0x3E21EE9E 0xBDB4B1C4 * z Bw 0xBDA8FAE9 0xBE8838D4\n    ? < ix 0x3FD33333 - 1.0 - * 0.5 z - * z r * x y\n    { = qx ? > ix 0x3fe90000 0.28125 Bw - ix 0x00200000 0\n      = hz - * 0.5 z qx\n      = a - 1.0 qx\n      - a - hz - * z r * x y } } }\n: _sn f>f x {\n  = hx Bh x\n  = ix & hx 0x7fffffff\n  ? <= ix 0x3FE921FB _mks x 0.0 0\n  ? >= ix 0x7FF00000 - x x\n  ? > ix 0x413921FB Sn x\n  { = n 0\n    = y0 0.0\n    = y1 0.0\n    ? < ix 0x4002D97C { ? > hx 0\n        { = z - x Bw 0x3FF921FB 0x54400000\n          ? != ix 0x3FF921FB\n            { = y0 - z Bw 0x3DD0B461 0x1A626331 = y1 - - z y0 Bw 0x3DD0B461 0x1A626331 }\n            { = z - z Bw 0x3DD0B461 0x1A600000 = y0 - z Bw 0x3BA3198A 0x2E037073 = y1 - - z y0 Bw 0x3BA3198A 0x2E037073 }\n          = n 1 }\n        { = z + x Bw 0x3FF921FB 0x54400000\n          ? != ix 0x3FF921FB\n            { = y0 + z Bw 0x3DD0B461 0x1A626331 = y1 + - z y0 Bw 0x3DD0B461 0x1A626331 }\n            { = z + z Bw 0x3DD0B461 0x1A600000 = y0 + z Bw 0x3BA3198A 0x2E037073 = y1 + - z y0 Bw 0x3BA3198A 0x2E037073 }\n          = n -1 } } { = t Ab x\n      = n I + * t Bw 0x3FE45F30 0x6DC9C883 0.5\n      = fn F n\n      = r - t * fn Bw 0x3FF921FB 0x54400000\n      = w * fn Bw 0x3DD0B461 0x1A626331\n      ? && < n 32 != ix Bh * fn Bw 0x3FF921FB 0x54442D18\n        { = y0 - r w 0 }\n        { = j >> ix 20\n          = y0 - r w\n          = i - j & >> Bh y0 20 0x7FF\n          ? > i 16\n            { = t r\n              = w * fn Bw 0x3DD0B461 0x1A600000\n              = r - t w\n              = w - * fn Bw 0x3BA3198A 0x2E037073 - - t r w\n              = y0 - r w\n              = i - j & >> Bh y0 20 0x7FF\n              ? > i 49\n                { = t r\n                  = w * fn Bw 0x3BA3198A 0x2E000000\n                  = r - t w\n                  = w - * fn Bw 0x397B839A 0x252049C1 - - t r w\n                  = y0 - r w 0 } 0 } 0 }\n      = y1 - - r y0 w\n      ? < hx 0 { = y0 * -1.0 y0 = y1 * -1.0 y1 = n - 0 n } 0 }\n    = m & n 3\n    ? == m 0 _mks y0 y1 1 ? == m 1 _mkc y0 y1 ? == m 2 * -1.0 _mks y0 y1 1 * -1.0 _mkc y0 y1 } }\n: _cs f>f x {\n  = hx Bh x\n  = ix & hx 0x7fffffff\n  ? <= ix 0x3FE921FB _mkc x 0.0\n  ? >= ix 0x7FF00000 - x x\n  ? > ix 0x413921FB Cs x\n  { = n 0\n    = y0 0.0\n    = y1 0.0\n    ? < ix 0x4002D97C { ? > hx 0\n        { = z - x Bw 0x3FF921FB 0x54400000\n          ? != ix 0x3FF921FB\n            { = y0 - z Bw 0x3DD0B461 0x1A626331 = y1 - - z y0 Bw 0x3DD0B461 0x1A626331 }\n            { = z - z Bw 0x3DD0B461 0x1A600000 = y0 - z Bw 0x3BA3198A 0x2E037073 = y1 - - z y0 Bw 0x3BA3198A 0x2E037073 }\n          = n 1 }\n        { = z + x Bw 0x3FF921FB 0x54400000\n          ? != ix 0x3FF921FB\n            { = y0 + z Bw 0x3DD0B461 0x1A626331 = y1 + - z y0 Bw 0x3DD0B461 0x1A626331 }\n            { = z + z Bw 0x3DD0B461 0x1A600000 = y0 + z Bw 0x3BA3198A 0x2E037073 = y1 + - z y0 Bw 0x3BA3198A 0x2E037073 }\n          = n -1 } } { = t Ab x\n      = n I + * t Bw 0x3FE45F30 0x6DC9C883 0.5\n      = fn F n\n      = r - t * fn Bw 0x3FF921FB 0x54400000\n      = w * fn Bw 0x3DD0B461 0x1A626331\n      ? && < n 32 != ix Bh * fn Bw 0x3FF921FB 0x54442D18\n        { = y0 - r w 0 }\n        { = j >> ix 20\n          = y0 - r w\n          = i - j & >> Bh y0 20 0x7FF\n          ? > i 16\n            { = t r\n              = w * fn Bw 0x3DD0B461 0x1A600000\n              = r - t w\n              = w - * fn Bw 0x3BA3198A 0x2E037073 - - t r w\n              = y0 - r w\n              = i - j & >> Bh y0 20 0x7FF\n              ? > i 49\n                { = t r\n                  = w * fn Bw 0x3BA3198A 0x2E000000\n                  = r - t w\n                  = w - * fn Bw 0x397B839A 0x252049C1 - - t r w\n                  = y0 - r w 0 } 0 } 0 }\n      = y1 - - r y0 w\n      ? < hx 0 { = y0 * -1.0 y0 = y1 * -1.0 y1 = n - 0 n } 0 }\n    = m & n 3\n    ? == m 0 _mkc y0 y1 ? == m 1 * -1.0 _mks y0 y1 1 ? == m 2 * -1.0 _mkc y0 y1 _mks y0 y1 1 } }\n: _xp f>f x {\n  = hx Bh x\n  = xsb & >> hx 31 1\n  = ax & hx 0x7fffffff\n  ? && >= ax 0x7FF00000 != | & ax 0xfffff Bl x 0 + x x\n  ? >= ax 0x7FF00000 ? == xsb 0 x 0.0\n  ? && >= ax 0x40862E42 > x Bw 0x40862E42 0xFEFA39EF * Bw 0x7E37E43C 0x8800759C Bw 0x7E37E43C 0x8800759C\n  ? && >= ax 0x40862E42 < x Bw 0xC0874910 0xD52D3051 * Bw 0x01700000 0x00000000 Bw 0x01700000 0x00000000\n  ? < ax 0x3E300000 + 1.0 x\n  ? == x 1.0 Bw 0x4005BF0A 0x8B145769\n  { = k 0\n    = hi 0.0\n    = lo 0.0\n    = y x\n    ? > ax 0x3FD62E42\n      { ? < ax 0x3FF0A2B2\n          { = hi - x ? xsb Bw 0xBFE62E42 0xFEE00000 Bw 0x3FE62E42 0xFEE00000\n            = lo ? xsb Bw 0xBDEA39EF 0x35793C76 Bw 0x3DEA39EF 0x35793C76\n            = k - - 1 xsb xsb }\n          { = k I + * Bw 0x3FF71547 0x652B82FE x ? xsb -0.5 0.5\n            = t F k\n            = hi - x * t Bw 0x3FE62E42 0xFEE00000\n            = lo * t Bw 0x3DEA39EF 0x35793C76 0 }\n        = y - hi lo 0 } 0\n    = t * y y\n    = twopk ? >= k -1021 Bw + 0x3FF00000 << k 20 0 Bw + 0x3FF00000 << + k 1000 20 0\n    = c - y * t + Bw 0x3FC55555 0x5555553E * t + Bw 0xBF66C16C 0x16BEBD93 * t + Bw 0x3F11566A 0xAF25DE2C * t + Bw 0xBEBBBD41 0xC5D26BF1 * t Bw 0x3E663769 0x72BEA4D0\n    ? == k 0 - 1.0 - / * y c - c 2.0 y\n    { = yy - 1.0 - - lo / * y c - 2.0 c hi\n      ? >= k -1021 ? == k 1024 * * yy 2.0 Bw 0x7FE00000 0x00000000 * yy twopk * * yy twopk Bw 0x01700000 0x00000000 } } }\n: _lg f>f x0 {\n  = x x0\n  = hx Bh x\n  = lx Bl x\n  = k 0\n  ? && < hx 0x00100000 == | & hx 0x7fffffff lx 0 / * -1.0 Bw 0x43500000 0x00000000 0.0\n  ? && < hx 0x00100000 < hx 0 / - x x 0.0\n  { ? < hx 0x00100000 { = k - k 54 = x * x Bw 0x43500000 0x00000000 = hx Bh x } 0\n    ? >= hx 0x7FF00000 + x x\n    { = k + k - >> hx 20 1023\n      = hx & hx 0x000FFFFF\n      = i & + hx 0x95F64 0x100000\n      = x Bw | hx ^ i 0x3FF00000 Bl x\n      = k + k >> i 20\n      = f - x 1.0\n      ? < & 0x000FFFFF + 2 hx 3\n        { ? == f 0.0\n            ? == k 0 0.0 { = dk F k + * dk Bw 0x3FE62E42 0xFEE00000 * dk Bw 0x3DEA39EF 0x35793C76 }\n            { = rv * * f f - 0.5 * Bw 0x3FD55555 0x55555555 f\n              ? == k 0 - f rv { = dk F k - * dk Bw 0x3FE62E42 0xFEE00000 - - rv * dk Bw 0x3DEA39EF 0x35793C76 f } } }\n        { = s / f + 2.0 f\n          = dk F k\n          = z * s s\n          = i - hx 0x6147A\n          = w * z z\n          = j - 0x6B851 hx\n          = t1 * w + Bw 0x3FD99999 0x9997FA04 * w + Bw 0x3FCC71C5 0x1D8E78AF * w Bw 0x3FC39A09 0xD078C69F\n          = t2 * z + Bw 0x3FE55555 0x55555593 * w + Bw 0x3FD24924 0x94229359 * w + Bw 0x3FC74664 0x96CB03DE * w Bw 0x3FC2F112 0xDF3E5244\n          = i | i j\n          = rv + t2 t1\n          ? > i 0\n            { = hfsq * * 0.5 f f\n              ? == k 0 - f - hfsq * s + hfsq rv - * dk Bw 0x3FE62E42 0xFEE00000 - - hfsq + * s + hfsq rv * dk Bw 0x3DEA39EF 0x35793C76 f }\n            ? == k 0 - f * s - f rv - * dk Bw 0x3FE62E42 0xFEE00000 - - * s - f rv * dk Bw 0x3DEA39EF 0x35793C76 f } } } }\n: _mat f>f x0 {\n  = x x0\n  = hx Bh x\n  = ix & hx 0x7fffffff\n  ? >= ix 0x44100000\n    ? || > ix 0x7ff00000 && == ix 0x7ff00000 != Bl x 0 + x x\n    ? > hx 0 + Bw 0x3FF921FB 0x54442D18 Bw 0x3C91A626 0x33145C07 - * -1.0 Bw 0x3FF921FB 0x54442D18 Bw 0x3C91A626 0x33145C07\n  ? < ix 0x3e400000 x\n  { = id -1\n    ? >= ix 0x3fdc0000\n      { = x Ab x\n        ? < ix 0x3ff30000\n          ? < ix 0x3fe60000 { = id 0 = x / - * 2.0 x 1.0 + 2.0 x } { = id 1 = x / - x 1.0 + x 1.0 }\n          ? < ix 0x40038000 { = id 2 = x / - x 1.5 + 1.0 * 1.5 x } { = id 3 = x / -1.0 x } } 0.0\n    = z * x x\n    = w * z z\n    = s1 * z + Bw 0x3FD55555 0x5555550D * w + Bw 0x3FC24924 0x920083FF * w + Bw 0x3FB745CD 0xC54C206E * w + Bw 0x3FB10D66 0xA0D03D51 * w + Bw 0x3FA97B4B 0x24760DEB * w Bw 0x3F90AD3A 0xE322DA11\n    = s2 * w + Bw 0xBFC99999 0x9998EBC4 * w + Bw 0xBFBC71C6 0xFE231671 * w + Bw 0xBFB3B0F2 0xAF749A6D * w + Bw 0xBFADDE2D 0x52DEFD9A * w Bw 0xBFA2B444 0x2C6A6C2F\n    ? < id 0 - x * x + s1 s2\n    { = ah ? == id 0 Bw 0x3FDDAC67 0x0561BB4F ? == id 1 Bw 0x3FE921FB 0x54442D18 ? == id 2 Bw 0x3FEF730B 0xD281F69B Bw 0x3FF921FB 0x54442D18\n      = al ? == id 0 Bw 0x3C7A2B7F 0x222F65E2 ? == id 1 Bw 0x3C81A626 0x33145C07 ? == id 2 Bw 0x3C700788 0x7AF0CBBD Bw 0x3C91A626 0x33145C07\n      = z - ah - - * x + s1 s2 al x\n      ? < hx 0 * -1.0 z z } } }\n: _at ff>f y x {\n  ? || != x x != y y + x y\n  { = hx Bh x\n    = ix & hx 0x7fffffff\n    = lx Bl x\n    = hy Bh y\n    = iy & hy 0x7fffffff\n    = ly Bl y\n    ? == | - hx 0x3ff00000 lx 0 _mat y\n    { = m | & >> hy 31 1 & >> hx 30 2\n      ? == | iy ly 0 ? < m 2 y ? == m 2 + Bw 0x400921FB 0x54442D18 Bw 0x01A56E1F 0xC2F8F359 - * -1.0 Bw 0x400921FB 0x54442D18 Bw 0x01A56E1F 0xC2F8F359\n      ? == | ix lx 0 ? < hy 0 - * -1.0 Bw 0x3FF921FB 0x54442D18 Bw 0x01A56E1F 0xC2F8F359 + Bw 0x3FF921FB 0x54442D18 Bw 0x01A56E1F 0xC2F8F359\n      ? == ix 0x7ff00000\n        ? == iy 0x7ff00000\n          ? == m 0 + Bw 0x3FE921FB 0x54442D18 Bw 0x01A56E1F 0xC2F8F359 ? == m 1 - * -1.0 Bw 0x3FE921FB 0x54442D18 Bw 0x01A56E1F 0xC2F8F359 ? == m 2 + * 3.0 Bw 0x3FE921FB 0x54442D18 Bw 0x01A56E1F 0xC2F8F359 - * -3.0 Bw 0x3FE921FB 0x54442D18 Bw 0x01A56E1F 0xC2F8F359\n          ? == m 0 0.0 ? == m 1 * -1.0 0.0 ? == m 2 + Bw 0x400921FB 0x54442D18 Bw 0x01A56E1F 0xC2F8F359 - * -1.0 Bw 0x400921FB 0x54442D18 Bw 0x01A56E1F 0xC2F8F359\n      ? == iy 0x7ff00000 ? < hy 0 - * -1.0 Bw 0x3FF921FB 0x54442D18 Bw 0x01A56E1F 0xC2F8F359 + Bw 0x3FF921FB 0x54442D18 Bw 0x01A56E1F 0xC2F8F359\n      { = k >> - iy ix 20\n        = z 0.0\n        ? > k 60 { = z + Bw 0x3FF921FB 0x54442D18 * 0.5 Bw 0x3CA1A626 0x33145C07 = m & m 1 }\n          ? && < hx 0 < k -60 { = z 0.0 0 } { = z _mat Ab / y x 0 }\n        ? == m 0 z ? == m 1 * -1.0 z ? == m 2 - Bw 0x400921FB 0x54442D18 - z Bw 0x3CA1A626 0x33145C07 - - z Bw 0x3CA1A626 0x33145C07 Bw 0x400921FB 0x54442D18 } } } }\n: _msc fi>f z n ? >= n -1022 * z Bw + 0x3FF00000 << n 20 0 * * z Bw + 0x3FF00000 << + n 54 20 0 Bw 0x3C900000 0x00000000\n: _pw ff>f x y {\n  = hx Bh x\n  = lx Bl x\n  = hy Bh y\n  = ly Bl y\n  = ix & hx 0x7fffffff\n  = iy & hy 0x7fffffff\n  ? == | iy ly 0 1.0\n  ? || || > ix 0x7ff00000 && == ix 0x7ff00000 != lx 0 || > iy 0x7ff00000 && == iy 0x7ff00000 != ly 0 + x y\n  { = yisint 0\n    = k 0\n    = j 0\n    ? < hx 0\n      ? >= iy 0x43400000 = yisint 2\n      ? >= iy 0x3ff00000 ? == Fl y y ? == Fl * 0.5 y * 0.5 y = yisint 2 = yisint 1 0 0\n      0\n    = ax Ab x\n    ? && == ly 0 == iy 0x7ff00000\n      ? == | - ix 0x3ff00000 lx 0 - y y ? >= ix 0x3ff00000 ? >= hy 0 y 0.0 ? < hy 0 * -1.0 y 0.0\n    ? && == ly 0 == iy 0x3ff00000 ? < hy 0 / 1.0 x x\n    ? && == ly 0 == hy 0x40000000 * x x\n    ? && && == ly 0 == hy 0x3fe00000 >= hx 0 Sq x\n    ? && == lx 0 || || == ix 0x7ff00000 == ix 0 == ix 0x3ff00000\n      { = z ax\n        ? < hy 0 = z / 1.0 z 0.0\n        ? < hx 0 ? == | - ix 0x3ff00000 yisint 0 = z / - z z - z z ? == yisint 1 = z * -1.0 z 0.0 0.0\n        z }\n    { = n + >> hx 31 1\n      ? == | n yisint 0 / - x x - x x\n      { = s ? == | n - yisint 1 0 -1.0 1.0\n        ? && > iy 0x43f00000 <= ix 0x3fefffff ? < hy 0 * Bw 0x7E37E43C 0x8800759C Bw 0x7E37E43C 0x8800759C * Bw 0x01A56E1F 0xC2F8F359 Bw 0x01A56E1F 0xC2F8F359\n        ? && > iy 0x43f00000 >= ix 0x3ff00000 ? > hy 0 * Bw 0x7E37E43C 0x8800759C Bw 0x7E37E43C 0x8800759C * Bw 0x01A56E1F 0xC2F8F359 Bw 0x01A56E1F 0xC2F8F359\n        ? && > iy 0x41e00000 < ix 0x3fefffff ? < hy 0 * * s Bw 0x7E37E43C 0x8800759C Bw 0x7E37E43C 0x8800759C * * s Bw 0x01A56E1F 0xC2F8F359 Bw 0x01A56E1F 0xC2F8F359\n        ? && > iy 0x41e00000 > ix 0x3ff00000 ? > hy 0 * * s Bw 0x7E37E43C 0x8800759C Bw 0x7E37E43C 0x8800759C * * s Bw 0x01A56E1F 0xC2F8F359 Bw 0x01A56E1F 0xC2F8F359\n        { = t1 0.0\n          = t2 0.0\n          ? > iy 0x41e00000\n            { = t - ax 1.0\n              = w * * t t - 0.5 * t - Bw 0x3FD55555 0x55555555 * t 0.25\n              = u * Bw 0x3FF71547 0x60000000 t\n              = v - * t Bw 0x3E54AE0B 0xF85DDF44 * w Bw 0x3FF71547 0x652B82FE\n              = t1 Bw Bh + u v 0\n              = t2 - v - t1 u 0 }\n            { = n 0\n              ? < ix 0x00100000 { = ax * ax Bw 0x43400000 0x00000000 = n - n 53 = ix Bh ax } 0\n              = n + n - >> ix 20 0x3ff\n              = j & ix 0x000fffff\n              = ix | j 0x3ff00000\n              = k 0\n              ? <= j 0x3988E = k 0 ? < j 0xBB67A = k 1 { = k 0 = n + n 1 = ix - ix 0x00100000 }\n              = ax Bw ix Bl ax\n              = bk ? k 1.5 1.0\n              = u - ax bk\n              = v / 1.0 + ax bk\n              = ss * u v\n              = sh Bw Bh ss 0\n              = th Bw + + | >> ix 1 0x20000000 0x00080000 << k 18 0\n              = tl - ax - th bk\n              = sl * v - - u * sh th * sh tl\n              = s2 * ss ss\n              = r * * s2 s2 + Bw 0x3FE33333 0x33333303 * s2 + Bw 0x3FDB6DB6 0xDB6FABFF * s2 + Bw 0x3FD55555 0x518F264D * s2 + Bw 0x3FD17460 0xA91D4101 * s2 + Bw 0x3FCD864A 0x93C9DB65 * s2 Bw 0x3FCA7E28 0x4A454EEF\n              = r + r * sl + sh ss\n              = s2 * sh sh\n              = th Bw Bh + + 3.0 s2 r 0\n              = tl - r - - th 3.0 s2\n              = u * sh th\n              = v + * sl th * tl ss\n              = ph Bw Bh + u v 0\n              = pl - v - ph u\n              = zh * Bw 0x3FEEC709 0xE0000000 ph\n              = zl + + * Bw 0xBE3E2FE0 0x145B01F5 ph * pl Bw 0x3FEEC709 0xDC3A03FD ? k Bw 0x3E4CFDEB 0x43CFD006 0.0\n              = t F n\n              = dh ? k Bw 0x3FE2B803 0x40000000 0.0\n              = t1 Bw Bh + + + zh zl dh t 0\n              = t2 - zl - - - t1 t dh zh 0 }\n          = y1 Bw Bh y 0\n          = pl + * - y y1 t1 * y t2\n          = ph * y1 t1\n          = z + pl ph\n          = j Bh z\n          = i Bl z\n          = ovf && >= j 0x40900000 || || != j 0x40900000 != i 0 > + pl Bw 0x3C971547 0x652B82FE - z ph\n          = unf && < j 0x40900000 && >= & j 0x7fffffff 0x4090cc00 || || != j -1064252416 != i 0 <= pl - z ph\n          ? ovf * * s Bw 0x7E37E43C 0x8800759C Bw 0x7E37E43C 0x8800759C\n          ? unf * * s Bw 0x01A56E1F 0xC2F8F359 Bw 0x01A56E1F 0xC2F8F359\n          { = i & j 0x7fffffff\n            = k - >> i 20 0x3ff\n            = n 0\n            ? > i 0x3fe00000\n              { = n + j >> 0x00100000 + k 1\n                = k - >> & n 0x7fffffff 20 0x3ff\n                = t Bw & n ^ >> 0x000fffff k -1 0\n                = n >> | & n 0x000fffff 0x00100000 - 20 k\n                ? < j 0 = n - 0 n 0\n                = ph - ph t 0 } 0\n            = t Bw Bh + pl ph 0\n            = u * t Bw 0x3FE62E43 0x00000000\n            = v + * - pl - t ph Bw 0x3FE62E42 0xFEFA39EF * t Bw 0xBE205C61 0x0CA86C39\n            = z + u v\n            = w - v - z u\n            = t * z z\n            = t1 - z * t + Bw 0x3FC55555 0x5555553E * t + Bw 0xBF66C16C 0x16BEBD93 * t + Bw 0x3F11566A 0xAF25DE2C * t + Bw 0xBEBBBD41 0xC5D26BF1 * t Bw 0x3E663769 0x72BEA4D0\n            = r - / * z t1 - t1 2.0 + w * z w\n            = z - 1.0 - r z\n            = j + Bh z << n 20\n            = z ? <= >> j 20 0 _msc z n Bw j Bl z\n            * s z } } } } } }\n";
  // </mat>
  function construir(src0) {
    const T0 = tokens(src0), src = T0.some(t => t.x === 'Pw') ? src0 + '\n' + MAT : src0;
    const T = src === src0 ? T0 : tokens(src), F = definicoes(T);
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
        if (x === 'Pw') { const a = ex(), b = ex(); real(a); real(b); const g = F.get('_pw'); fn('_pw'); return { o: 2, y: 1, f: g, a: [a, b] }; }
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
