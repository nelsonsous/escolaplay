// A biblioteca (onda/lib/numero.onda) contra o próprio JavaScript do Node, valor a valor: String(x), JSON.stringify,
// toFixed, toPrecision, Number(x.toPrecision(p)), Math.round/max/min, Number(texto) e o Intl.NumberFormat('pt-PT')
// (simples, até d casas, compacto, moedas). Reais de toda a espécie: 64 bits ao acaso (todos os expoentes,
// subnormais, NaN, infinitos), decimais curtos, metades exatas no decimal e não no binário, um ulp ao lado, inteiros
// de 2^53 a 2^64, e os casos de sempre. NUMEROS=… muda quantos (por omissão 120 000 por conjunto).
const { test } = require('node:test');
const assert = require('node:assert');
const { criar, mesmo, gerador } = require('./lib/sonda.js');

const N = +process.env.NUMEROS || 120000;
const S = criar();
const G = gerador(20261108);

const FIXOS = [0, -0, NaN, Infinity, -Infinity, 5e-324, -5e-324, 2.2250738585072014e-308, 2.225073858507201e-308, 1.7976931348623157e308,
  2 ** 53, 2 ** 53 + 2, 2 ** 53 - 1, 2 ** 60, 2 ** 63, 2 ** 64, 1e21, 1e21 - 65536, 999999999999999900000, 1e-7, 1e-6, 1.5e-7, 0.000001, 123e-20,
  0.1, 0.2, 0.3, 0.1 + 0.2, 1 / 3, 2 / 3, 0.5, 1.5, 2.5, -2.5, 0.125, 0.375, 1.005, 2.675, 1.45, 8.345, 1.0005, 0.0005, 0.005, 0.015, 0.025,
  9.995, 99.995, 999.95, 9999.5, 99999.5, 0.95, 0.05, -0.05, 0.04999999999999999, 0.0049999999999999999, 123456789.125, 4503599627370495.5,
  4503599627370496.5, 1e15 + 0.5, 1e16, 1e17, 1e20, 5e-310, 1.7976931348623157e300, 123456789012345680000, 0.000001234, 1e300 * 10, -1e-300];
// reais variados: n de cada espécie
function reais(n) {
  const xs = [...FIXOS];
  for (let i = 0; i < n; i++) {
    xs.push(G.bits());
    xs.push(Number((G.R() * 10 ** (G.int(40) - 20)).toPrecision(1 + G.int(17))) * (G.R() < 0.5 ? -1 : 1));
    // metades no decimal: (k + 0,5)·10^-d, e os vizinhos
    const d = G.int(8), h = (G.int(100000) + 0.5) / 10 ** d;
    xs.push(h, G.ulp(h, 1), G.ulp(h, -1));
    xs.push(2 ** 53 + G.int(2 ** 30) * 2 ** G.int(11));
    xs.push(G.R() * 2 ** (G.int(2100) - 1074));
  }
  return xs;
}
const XS = reais(N / 7);

test(`String(x) e JSON.stringify(x): ${XS.length} reais`, () => {
  const a = S.lf(0, XS), b = S.lf(8, XS);
  XS.forEach((x, i) => { assert.strictEqual(a[i], String(x), `String(${x})`); assert.strictEqual(b[i], JSON.stringify(x), `JSON ${x}`); });
});

test('x.toFixed(d): d de 0 a 2 em todos, e de 3 a 100 ao acaso (os valores exatos), também com a vírgula', () => {
  for (const d of [0, 1, 2]) { const r = S.lf(1, XS, d); XS.forEach((x, i) => assert.strictEqual(r[i], x.toFixed(d), `(${x}).toFixed(${d})`)); }
  const r1 = S.lf(9, XS, 1); XS.forEach((x, i) => assert.strictEqual(r1[i], x.toFixed(1).replace('.', ','), `toFixed(1) com vírgula ${x}`));
  let n = 0;
  for (let k = 0; k < 40; k++) {
    const d = 3 + G.int(98), xs = XS.filter(() => G.R() < 0.05);
    const r = S.lf(1, xs, d); xs.forEach((x, i) => assert.strictEqual(r[i], x.toFixed(d), `(${x}).toFixed(${d})`)); n += xs.length;
  }
  for (const d of [3, 4, 5, 10, 20, 100]) { const r = S.lf(1, FIXOS, d); FIXOS.forEach((x, i) => assert.strictEqual(r[i], x.toFixed(d), `(${x}).toFixed(${d})`)); }
  assert.ok(n > 10000);
});

test('x.toPrecision(p): p de 1 a 100 (os valores exatos) e Number(x.toPrecision(p)) de 1 a 17, ao bit', () => {
  for (let p = 1; p <= 21; p++) { const r = S.lf(2, FIXOS, p); FIXOS.forEach((x, i) => assert.strictEqual(r[i], x.toPrecision(p), `(${x}).toPrecision(${p})`)); }
  for (let k = 0; k < 60; k++) {
    const p = 1 + G.int(100), xs = XS.filter(() => G.R() < 0.03);
    const r = S.lf(2, xs, p); xs.forEach((x, i) => assert.strictEqual(r[i], x.toPrecision(p), `(${x}).toPrecision(${p})`));
  }
  for (let p = 1; p <= 17; p++) {
    const xs = XS.filter(() => G.R() < 0.1), r = S.lf(3, xs, p);
    xs.forEach((x, i) => assert.ok(mesmo(r[i], Number(x.toPrecision(p))), `Number((${x}).toPrecision(${p}))`));
  }
});

test('Math.round, Math.max, Math.min (o -0, o NaN), Number.isFinite e o ToIntegerOrInfinity', () => {
  const r = S.lf(4, XS); XS.forEach((x, i) => assert.ok(mesmo(r[i], Math.round(x)), `Math.round(${x})`));
  const f = S.lf(11, XS); XS.forEach((x, i) => assert.strictEqual(f[i], Number.isFinite(x) ? '1' : '0'));
  const t = S.lf(10, XS); XS.forEach((x, i) => assert.strictEqual(t[i], String(Number.isNaN(x) ? 0 : Math.trunc(x)), `ToIntegerOrInfinity(${x})`));
  const V = [0, -0, NaN, Infinity, -Infinity, 1, -1, 0.5, -0.5, 10, 11];
  const xs = [], ys = [];
  for (const a of V) for (const b of V) { xs.push(a); ys.push(b); }
  for (let i = 0; i < 20000; i++) { xs.push(G.pick(XS)); ys.push(G.R() < 0.2 ? G.pick(V) : G.pick(XS)); }
  const mx = S.l2(0, xs, ys), mn = S.l2(1, xs, ys), cl = S.l2(2, xs, ys);
  xs.forEach((x, i) => {
    assert.ok(mesmo(mx[i], Math.max(x, ys[i])), `max(${x}, ${ys[i]})`);
    assert.ok(mesmo(mn[i], Math.min(x, ys[i])), `min(${x}, ${ys[i]})`);
    assert.ok(mesmo(cl[i], Math.max(ys[i], Math.min(10, x))), `clamp(${x}, ${ys[i]}, 10)`);
  });
});

test('Number(texto): decimais curtos e compridos, perto das metades, expoentes, espaços, 0x 0o 0b, Infinity e o inválido', () => {
  const ts = ['', ' ', ' 12 ', '+5', '-5', '0x1F', '0X1f', '0b101', '0o17', '-0x1', '0x', '.5', '5.', '.', '+.e1', '1e', '1e+', '1e-7', 'Infinity', '-Infinity', '+Infinity',
    'infinity', 'NaN', '12abc', ' 12 ', '﻿ 3 \t\n', '1'.repeat(400), '0.' + '0'.repeat(400) + '1', '1e400', '-1e400', '1e-400', '2.4703282292062328e-324',
    '2.4703282292062327e-324', '2.2250738585072011e-308', '1.7976931348623158e308', '1.7976931348623157e308', '9007199254740993', '0x20000000000001', '00012', '1_000', '1,5'];
  for (let i = 0; i < N / 2; i++) {
    const x = G.pick(XS);
    if (!Number.isFinite(x)) continue;
    ts.push(String(x), x.toExponential(G.int(21)), x.toPrecision(1 + G.int(30)));
    // o meio exato entre dois reais seguidos, e um algarismo ao lado (o caso difícil do arredondamento)
    if (x !== 0 && Math.abs(x) < 1e300) {
      const y = G.ulp(x, 1);
      const meio = ((x + y) / 2).toPrecision(40);
      ts.push(meio, meio.replace(/(\d)(e|$)/, (s, d, e) => String((+d + 1) % 10) + e));
    }
  }
  for (let i = 0; i < 20000; i++) {
    const nd = 1 + G.int(30), dig = Array.from({ length: nd }, () => G.int(10)).join('');
    ts.push((G.R() < 0.5 ? '-' : '') + dig.slice(0, 1 + G.int(nd)) + '.' + dig.slice(1) + 'e' + (G.int(700) - 350));
  }
  const r = S.lt(0, ts);
  ts.forEach((t, i) => assert.ok(mesmo(r[i], Number(t)), `Number(${JSON.stringify(t.slice(0, 60))})`));
});

test("Intl.NumberFormat('pt-PT'): d casas (0 a 20), até d casas, compacto e moedas, iguais aos do Node", () => {
  const fin = XS.filter((x) => Number.isFinite(x) && Math.abs(x) < 1e300);
  for (const d of [0, 1, 2, 3, 4, 7, 20]) {
    const xs = d <= 4 ? fin : fin.filter(() => G.R() < 0.2);
    const a = new Intl.NumberFormat('pt-PT', { minimumFractionDigits: d, maximumFractionDigits: d }), b = new Intl.NumberFormat('pt-PT', { maximumFractionDigits: d });
    const ra = S.lf(5, xs, d), rb = S.lf(6, xs, d);
    xs.forEach((x, i) => { assert.strictEqual(ra[i], a.format(x), `${d} casas: ${x}`); assert.strictEqual(rb[i], b.format(x), `até ${d} casas: ${x}`); });
  }
  const c = new Intl.NumberFormat('pt-PT', { notation: 'compact', maximumFractionDigits: 1 });
  const rc = S.lf(7, fin); fin.forEach((x, i) => assert.strictEqual(rc[i], c.format(x), `compacto: ${x}`));
  // moedas: as 21 com símbolo próprio e outras
  const COD = ['EUR', 'USD', 'GBP', 'AUD', 'BRL', 'CAD', 'CNY', 'HKD', 'ILS', 'INR', 'JPY', 'KRW', 'MXN', 'NZD', 'THB', 'TWD', 'VND', 'XAF', 'XCD', 'XPF', 'XOF', 'CHF', 'SEK', 'DKK', 'NOK', 'PLN', 'ZAR'];
  let n = 0;
  for (const cod of COD) {
    const t = BigInt(S.texto(cod));
    for (const d of [0, 2, 4]) {
      const f = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: cod, minimumFractionDigits: d, maximumFractionDigits: d });
      for (let k = 0; k < 300; k++) { const x = G.pick(fin); assert.strictEqual(S.chamar('t_moeda', x, BigInt(d), t), f.format(x), `${cod} ${d} ${x}`); n++; }
    }
  }
  assert.ok(n > 20000);
});

test('os algarismos do decimal mais curto (_nu_dig) são os do String(x)', () => {
  for (const x of XS.filter((v) => Number.isFinite(v) && v !== 0).slice(0, 30000)) {
    const a = Math.abs(x), [k, n, ...d] = S.chamar('t_dig', a).split(' ');
    const s = a.toExponential().split('e'), dg = s[0].replace('.', '');
    assert.strictEqual(d.join(''), dg, `algarismos de ${a}`);
    assert.strictEqual(+k, dg.length); assert.strictEqual(+n, +s[1] + 1, `expoente de ${a}`);
  }
});
