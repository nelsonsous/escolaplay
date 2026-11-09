// A biblioteca (onda/lib/valor.onda, json.onda, arvore.onda) contra o JavaScript do Node: JSON.parse e
// JSON.stringify ao byte (números ao bit, \u, substitutos sozinhos e aos pares, chaves de índice primeiro, a
// indentação, o inválido), a árvore só de leitura, e os valores do JS (String, Number, a verdade, Object.keys, v[k],
// includes/indexOf, < e >=, join). VALORES=… muda quantos (por omissão 6 000 valores ao acaso, cada um de várias formas).
const { test } = require('node:test');
const assert = require('node:assert');
const { criar, mesmo, gerador } = require('./lib/sonda.js');

const N = +process.env.VALORES || 6000;
const S = criar();
const G = gerador(31337);

const CH = ['a', 'b', 'Z', ' ', '"', '\\', '/', '\n', '\r', '\t', '\b', '\f', '\u0000', '\u0001', '\u001f', '\u007f', 'é', '€', 'ç', ' ', ' ', ' ',
  '﻿', '😀', '𝄞', '\ud800', '\udbff', '\udc00', '\udfff', '1', '0', '-', '.', 'e', '{', '}', '[', ']', ',', ':'];
const texto = () => { let s = ''; for (let k = G.int(12); k > 0; k--) s += G.pick(CH); return s; };
const CHAVES = ['0', '1', '2', '10', '01', '-1', '1.5', '4294967294', '4294967295', 'length', 'a', 'b', '__proto__x', 'é', ''];
const NUMS = [0, -0, 1, -1, 0.1, 1e21, 1e-7, 5e-324, 1.7976931348623157e308, 2 ** 53 + 2, 123.456, -9.5e-300, 4294967295];
const numero = () => (G.R() < 0.4 ? G.pick(NUMS) : G.R() < 0.5 ? G.bits() : Number((G.R() * 10 ** (G.int(30) - 15)).toPrecision(1 + G.int(17))));
// um valor do JSON (com índices nas chaves, se ind)
function valor(d, ind) {
  const r = G.R();
  if (d > 3 || r < 0.35) return G.pick([null, true, false, texto(), texto(), numero(), numero()]);
  if (r < 0.65) return Array.from({ length: G.int(6) }, () => valor(d + 1, ind));
  const o = {};
  for (let k = G.int(6); k > 0; k--) o[ind && G.R() < 0.5 ? G.pick(CHAVES) : 'k' + texto()] = valor(d + 1, ind);
  return o;
}
const finito = (v) => JSON.parse(JSON.stringify(v, (k, x) => (typeof x === 'number' && !Number.isFinite(x) ? 0 : x)));
// o mesmo JSON escrito de outra maneira: tudo o que não é ASCII em \uXXXX (o não-ASCII só aparece dentro dos textos)
const escapado = (s) => s.replace(/[\u007f-\uffff]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));

test(`JSON.parse e JSON.stringify ao byte: ${N} valores, compactos, indentados e escapados`, () => {
  const ts = [];
  for (let i = 0; i < N; i++) {
    const v = finito(valor(0, true)), s = JSON.stringify(v);
    ts.push(s, JSON.stringify(v, null, 2), escapado(s));
  }
  const a = S.lt(1, ts), b = S.lt(2, ts);
  ts.forEach((s, i) => {
    const v = JSON.parse(s);
    assert.strictEqual(a[i], JSON.stringify(v), 'compacto: ' + s.slice(0, 200));
    assert.strictEqual(b[i], JSON.stringify(v, null, 2), 'indentado: ' + s.slice(0, 200));
  });
});

test('JSON inválido: o JS lança, a Onda dá 0 (cortes e trocas ao acaso em JSON válido, e os casos de sempre)', () => {
  const ts = ['', ' ', '[1,]', '{"a":1,}', '01', '1.', '.5', '-', '+1', '1e', '"\\x"', '"a\u0001"', '1 2', '﻿1', 'NaN', 'Infinity', 'nul', 'tru', '[', '{"a"}', '{"a":}', '{1:2}', "{'a':1}",
    '"\\u12"', '"\\ud800"', '[1]]', '{}{}', '"', '"abc', ' 1', '1 ', 'truefalse', '[-]', '-01', '0x10', '1e+', '[1,,2]'];
  for (let i = 0; i < N; i++) {
    const s = JSON.stringify(finito(valor(0, true)));
    const k = G.int(s.length + 1);
    ts.push(s.slice(0, k), s.slice(0, k) + G.pick(['', ',', '}', ']', '"', ':', 'x', ' ']) + s.slice(k + G.int(2)));
  }
  const a = S.lt(1, ts);
  let inval = 0;
  ts.forEach((s, i) => {
    let v, ok = true;
    try { v = JSON.parse(s); } catch { ok = false; }
    if (!ok) inval++;
    assert.strictEqual(a[i], ok ? JSON.stringify(v) : 'ERRO', JSON.stringify(s));
  });
  assert.ok(inval > N / 2);
});

test('a árvore só de leitura (_ar_json): os mesmos valores, pela ordem do texto', () => {
  const ts = [];
  for (let i = 0; i < N; i++) { const s = JSON.stringify(finito(valor(0, false))); ts.push(s, escapado(s)); }
  const a = S.lt(3, ts);
  ts.forEach((s, i) => assert.strictEqual(a[i], JSON.stringify(JSON.parse(s)), s.slice(0, 200)));
  assert.deepStrictEqual(S.lt(3, ['[1,]', '{"a":1,}', '', 'x', '"\\ud800"']), ['ERRO', 'ERRO', 'ERRO', 'ERRO', '"\\ud800"']);
});

test('valores do JS: String(v), Number(v), a verdade, Object.keys, v[k], includes/indexOf, < e >=, join', () => {
  const vs = [];
  for (let i = 0; i < N; i++) vs.push(finito(valor(1, true)));
  vs.push('', ' ', '12', ' 0x1f ', '1e3', 'abc', [], [5], ['3'], [1, [2, 3]], [null, undefined], {}, 0, -0, true, false, null);
  const ts = vs.map((v) => JSON.stringify(v === undefined ? null : v));
  const s = S.lt(10, ts), n = S.lt(11, ts), t = S.lt(12, ts), k = S.lt(13, ts.map((x, i) => (vs[i] && typeof vs[i] === 'object' && !Array.isArray(vs[i]) ? x : '{}')));
  vs.forEach((v0, i) => {
    const v = JSON.parse(ts[i]);
    assert.strictEqual(s[i], String(v), 'String ' + ts[i]);
    assert.ok(mesmo(n[i], Number(v)), 'Number ' + ts[i]);
    assert.strictEqual(t[i], v ? '1' : '0', 'verdade ' + ts[i]);
    if (v && typeof v === 'object' && !Array.isArray(v)) assert.strictEqual(k[i], JSON.stringify(Object.keys(v)), 'keys ' + ts[i]);
  });
  // v[k], com chaves de índice, length e as que não há
  for (let i = 0; i < 3000; i++) {
    const v = G.R() < 0.3 ? texto() : finito(valor(1, true)), kk = G.pick([...CHAVES, '3', '5', 'k']), j = JSON.stringify(v);
    const r = v === null || v === undefined ? undefined : v[kk];
    if (v === null) continue;
    assert.strictEqual(S.chamar('t_get', BigInt(S.texto(j)), BigInt(S.texto(kk))), r === undefined ? 'undefined' : JSON.stringify(r), `${j}[${kk}]`);
  }
  // includes / indexOf (o SameValueZero e o ===), com NaN que só a Onda escreve (o JSON não o tem: vem de 0/0 aqui não)
  for (let i = 0; i < 3000; i++) {
    const a = Array.from({ length: G.int(8) }, () => G.pick([0, -0, 1, '1', null, true, 'x', 2.5])), x = G.pick([0, -0, 1, '1', null, true, 'x', 2.5, 'y']);
    assert.strictEqual(S.chamar('t_inc', BigInt(S.texto(JSON.stringify(a))), BigInt(S.texto(JSON.stringify(x)))), `${a.includes(x) ? 1 : 0} ${a.indexOf(x)}`, JSON.stringify([a, x]));
  }
  // < e >= do JS: textos pela ordem UTF-16, o resto como números (listas e objetos pelo String deles)
  for (let i = 0; i < 4000; i++) {
    const p = () => G.pick([texto(), texto(), numero(), null, true, false, [], [G.int(9)], {}]), a = finito(p()), b = finito(p());
    assert.strictEqual(S.chamar('t_lt2', BigInt(S.texto(JSON.stringify(a))), BigInt(S.texto(JSON.stringify(b)))), `${a < b ? 1 : 0} ${a >= b ? 1 : 0}`, JSON.stringify([a, b]));
  }
  for (let i = 0; i < 2000; i++) {
    const l = Array.from({ length: G.int(6) }, () => finito(G.pick([texto(), numero(), null, true, [1, 2]]))), sep = G.pick([',', '/', '', ' · ', texto()]);
    assert.strictEqual(S.chamar('t_junta', BigInt(S.texto(JSON.stringify(l))), BigInt(S.texto(sep))), l.join(sep), JSON.stringify([l, sep]));
  }
});
