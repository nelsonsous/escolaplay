// A biblioteca (onda/lib/texto.onda, html.onda) contra o JavaScript do Node: as vistas UTF-16 (o length, o slice e o
// < do JS, com emoji e substitutos sozinhos), o JSON.stringify de um texto, o encodeURIComponent, o TextDecoder, o
// trim, o toUpperCase/toLowerCase no ASCII e no Latim-1 (todos os códigos) e o HTML escapado. TEXTOS=… muda quantos.
const { test } = require('node:test');
const assert = require('node:assert');
const { criar, gerador } = require('./lib/sonda.js');

const N = +process.env.TEXTOS || 20000;
const S = criar();
const G = gerador(4242);
const CH = ['a', 'Z', '"', '\\', '\n', '\u0001', 'é', 'É', '€', '😀', '𝄞', '\ud83d', '\ude00', '\ud800', '\udfff', ' ', ' ', '﻿', '￿', '\u{10000}', ' ', '\t', '&', '<', "'", 'ß', 'ÿ', 'µ', '-', '~', '!', '*', '(', '%'];
const texto = (m = 10) => { let s = ''; for (let k = G.int(m); k > 0; k--) s += G.pick(CH); return s; };
const T = (s) => BigInt(S.texto(s));

test(`UTF-16: length, slice(a, b) e a ordem do < (dois caminhos: textos e textos UTF-16) — ${N} textos`, () => {
  const ss = Array.from({ length: N }, () => texto());
  // o length do texto (WTF-8) que o JSON.parse dá
  const len = S.lt(4, ss);
  ss.forEach((s, i) => assert.strictEqual(len[i], String(s.length), JSON.stringify(s)));
  for (let i = 0; i < N; i++) {
    const s = ss[i], a = G.int(s.length + 2), b = a + G.int(s.length + 2), t = ss[(i + 1) % N];
    assert.strictEqual(S.chamar('t_s16', T(JSON.stringify(s)), BigInt(a), BigInt(b)), JSON.stringify(s.slice(a, b)), `${JSON.stringify(s)}.slice(${a}, ${b})`);
    const c = s < t ? '-1' : s > t ? '1' : '0';
    assert.strictEqual(S.chamar('t_cmp', T(JSON.stringify(s)), T(JSON.stringify(t))), c, JSON.stringify([s, t]));
    assert.strictEqual(S.chamar('t_c16', T(JSON.stringify(s)), T(JSON.stringify(t))), c, JSON.stringify([s, t]));
  }
  // o texto UTF-16 em JSON (com o não-ASCII em \uXXXX): o JSON.parse dá o mesmo texto
  const p16 = S.lt(14, ss);
  ss.forEach((s, i) => assert.strictEqual(JSON.parse(p16[i]), s, JSON.stringify(s)));
});

test('JSON.stringify de um texto, encodeURIComponent, trim, TextDecoder e HTML escapado', () => {
  const ss = Array.from({ length: N }, () => texto());
  const pj = S.lt(9, ss), uri = S.lt(5, ss), br = S.lt(7, ss), ht = S.lt(8, ss);
  const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  ss.forEach((s, i) => {
    assert.strictEqual(pj[i], JSON.stringify(s), 'JSON ' + JSON.stringify(s));
    let u; try { u = encodeURIComponent(s); } catch { u = 'URIError'; }
    assert.strictEqual(uri[i], u, 'URI ' + JSON.stringify(s));
    assert.strictEqual(br[i], s.trim() ? '0' : '1', 'trim ' + JSON.stringify(s));
    assert.strictEqual(ht[i], esc(s), 'html ' + JSON.stringify(s));
  });
  // todos os espaços do JS
  const esp = Array.from({ length: 0x3001 }, (_, c) => String.fromCharCode(c)).concat(['﻿', ' ', ' ']);
  const r = S.lt(7, esp);
  esp.forEach((s, i) => assert.strictEqual(r[i], s.trim() ? '0' : '1', 'espaço U+' + s.charCodeAt(0).toString(16)));
  // bytes ao acaso (BOM, sequências cortadas, substitutos, bytes soltos) como o TextDecoder os lê
  const bs = [];
  for (let i = 0; i < N; i++) bs.push(Buffer.from(Array.from({ length: G.int(10) }, () => G.pick([G.int(256), 0xef, 0xbb, 0xbf, 0xed, 0xa0, 0xf0, 0x9f, 0x98, 0x80, 0xc2, 0xe2, 0x82, 0xac, 0xf4, 0x90]))));
  const td = new TextDecoder(), nm = S.lt(6, bs);
  bs.forEach((b, i) => assert.strictEqual(nm[i], JSON.stringify(td.decode(b)), 'TextDecoder ' + b.toString('hex')));
});

test('toUpperCase e toLowerCase de cada código do ASCII e do Latim-1, e o HTML de um código', () => {
  const cs = Array.from({ length: 256 }, (_, c) => c);
  const ma = S.li(4, cs), mi = S.li(5, cs), hc = S.li(6, cs);
  const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  cs.forEach((c, i) => {
    const s = String.fromCodePoint(c);
    assert.strictEqual(ma[i], s.toUpperCase(), 'toUpperCase U+' + c.toString(16));
    assert.strictEqual(mi[i], s.toLowerCase(), 'toLowerCase U+' + c.toString(16));
    assert.strictEqual(hc[i], esc(s), 'html U+' + c.toString(16));
  });
  // o _ht_min de um texto: o toLowerCase do ASCII e do Latim-1, escapado
  const ss = Array.from({ length: 5000 }, () => texto() + 'ÀÉÎÕÜÇÑÞ×ÝABC');
  const r = S.lt(15, ss);
  ss.forEach((s, i) => assert.strictEqual(r[i], esc(s.replace(/[A-ZÀ-ÖØ-Þ]/g, (c) => c.toLowerCase())), JSON.stringify(s)));
});

test('textos: abrir um dentro de outro, campos, procurar, e as regiões de memória', () => {
  assert.strictEqual(S.chamar('t_abre'), 'um|dois|tres', 'o dois fecha-se dentro do um e a saída volta ao um');
  const t = T('a\tbb\t\tccc');
  assert.deepStrictEqual([0, 1, 2, 3, 4].map((i) => S.chamar('t_campo', t, BigInt(i), 9n)), ['a', 'bb', '', 'ccc', '']);
  const h = T('abcabc');
  assert.deepStrictEqual([['bc', 0], ['bc', 2], ['x', 0], ['', 3], ['abc', 4]].map(([p, i]) => S.chamar('t_acha', h, T(p), BigInt(i))), ['1', '4', '-1', '3', '-1']);
  assert.strictEqual(S.chamar('t_ini'), '0', 'o _me_solta repõe o monte na marca');
});
