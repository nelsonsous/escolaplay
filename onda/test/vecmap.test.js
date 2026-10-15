// Mapa de campo vetorizavel (ex/vecmap.onda): b[i] = polinomio de grau 7 de a[i]. Nucleo puro de floats,
// uma fonte, sem ramos -- a forma que o emissor x86 vai vetorizar com AVX. Este teste fixa a REFERENCIA ao
// bit: C, x86 e WebAssembly tem de dar a MESMA soma, bit a bit. A vetorizacao (mulpd+addpd, sem FMA, por
// lane) nao reassocia nem contrai, por isso tem de preservar exatamente estes bits -- e este teste apanha-o
// se um dia os mudar.
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const R = path.join(__dirname, '..');
const ondac = path.join(R, 'build/ondac');
const t = fs.mkdtempSync(path.join(os.tmpdir(), 'onda-vm-'));
const src = fs.readFileSync(path.join(R, 'ex/vecmap.onda'));
fs.writeFileSync(path.join(t, 'v.c'), execFileSync(ondac, [], { input: src }));
execFileSync('cc', ['-O2', '-fwrapv', '-w', '-fopenmp', path.join(t, 'v.c'), '-o', path.join(t, 'vc'), '-lm']);
fs.writeFileSync(path.join(t, 'vx'), execFileSync(ondac, ['-x'], { input: src }), { mode: 0o755 });
fs.writeFileSync(path.join(t, 'v.wasm'), execFileSync(ondac, ['-w'], { input: src }));
const C = () => execFileSync(path.join(t, 'vc')).toString();
const X = () => execFileSync(path.join(t, 'vx')).toString();
const W = () => execFileSync('node', [path.join(R, 'wasm/host.js'), path.join(t, 'v.wasm')]).toString();
const soma = s => s.match(/soma = (\S+)/)[1];
const bits = s => s.match(/bits (\d+) (\d+)/).slice(1, 3).join(' ');

test('vecmap: C, x86 e WebAssembly dao a mesma soma, bit a bit', () => {
  const c = C(), x = X(), w = W();
  assert.strictEqual(bits(x), bits(c), 'x86 vs C');
  assert.strictEqual(bits(x), bits(w), 'x86 vs wasm');
  assert.strictEqual(soma(x), soma(c), 'soma x86 vs C');
});

test('vecmap: a soma tem o valor esperado', () => {
  // a[i] = (i%100)+1 em [1,100]; b[i] = 0.1 + x(0.2 + x(... + x*0.8)); soma de 8192 termos.
  const v = Number(soma(X()));
  assert.ok(v > 8.5e16 && v < 8.6e16, 'soma fora do esperado: ' + v);
});

// o laco AVX processa grupos de 4; n nao-multiplo-de-4 exercita a cauda escalar. Tem de bater o C ao bit.
test('vecmap: a cauda escalar (n nao multiplo de 4) bate o C ao bit', () => {
  for (const n of ['8190', '8191', '3', '1']) {
    const x = execFileSync(path.join(t, 'vx'), [n, '1']).toString();
    const c = execFileSync(path.join(t, 'vc'), [n, '1']).toString();
    assert.strictEqual(bits(x), bits(c), 'n=' + n + ' x86 vs C');
  }
});

// modo FMA opcional (-xf): nao e bit a bit (funde a*b+c num so arredondamento) mas tem de dar o MESMO valor
// que o modo bit-exato a ~15 digitos -- se divergir muito, a fusao FMA esta mal (ex. registos a mais).
test('vecmap: o modo -xf (FMA) da o mesmo valor que o -x, a ~15 digitos', () => {
  fs.writeFileSync(path.join(t, 'vxf'), execFileSync(ondac, ['-xf'], { input: src }), { mode: 0o755 });
  const sx = Number(soma(execFileSync(path.join(t, 'vx')).toString()));
  const sf = Number(soma(execFileSync(path.join(t, 'vxf')).toString()));
  assert.ok(Math.abs(sf - sx) / sx < 1e-12, 'FMA divergiu: -x=' + sx + ' -xf=' + sf);
});

// modo WASM SIMD (-wf): f64x2 (2 doubles/instr), corre no Safari 16.4+. Por-lane = escalar, logo BIT A BIT
// igual ao WASM escalar (-w) e ao C. Exercita tambem a cauda (n impar).
test('vecmap: WASM SIMD (-wf) e bit a bit igual ao WASM escalar e ao C', () => {
  fs.writeFileSync(path.join(t, 'v.wf.wasm'), execFileSync(ondac, ['-wf'], { input: src }));
  const WF = (...a) => execFileSync('node', [path.join(R, 'wasm/host.js'), path.join(t, 'v.wf.wasm'), ...a]).toString();
  assert.strictEqual(bits(WF()), bits(W()), '-wf vs -w');
  assert.strictEqual(bits(WF()), bits(C()), '-wf vs C');
  for (const n of ['8191', '3', '1']) assert.strictEqual(bits(WF(n, '1')), bits(execFileSync(path.join(t, 'vc'), [n, '1']).toString()), 'cauda n=' + n);
});

// modo AVX-512 (-x5): 8 doubles por instrucao; valor igual ao -x a ~15 digitos (apanha erros de EVEX).
test('vecmap: o modo -x5 (AVX-512) da o mesmo valor que o -x, a ~15 digitos', () => {
  fs.writeFileSync(path.join(t, 'vx5'), execFileSync(ondac, ['-x5'], { input: src }), { mode: 0o755 });
  const sx = Number(soma(execFileSync(path.join(t, 'vx')).toString()));
  const s5 = Number(soma(execFileSync(path.join(t, 'vx5')).toString()));
  assert.ok(Math.abs(s5 - sx) / sx < 1e-12, 'AVX-512 divergiu: -x=' + sx + ' -x5=' + s5);
  // e a cauda (n nao-multiplo-de-8) tem de continuar certa
  for (const n of ['8191', '8185', '5', '3']) {
    const v = Number(soma(execFileSync(path.join(t, 'vx5'), [n, '1']).toString()));
    const r = Number(soma(execFileSync(path.join(t, 'vx'), [n, '1']).toString()));
    assert.ok(Math.abs(v - r) / r < 1e-12, 'x5 cauda n=' + n + ': ' + v + ' vs ' + r);
  }
});
