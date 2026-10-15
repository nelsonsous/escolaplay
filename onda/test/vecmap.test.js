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
