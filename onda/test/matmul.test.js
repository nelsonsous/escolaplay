// Multiplicacao de matrizes pelo paradigma de campo (ex/matmul.onda): E calcula cada elemento em paralelo,
// S faz o produto interno. Confere contra um triplo laço ingenuo, e da o mesmo resultado em C, x86 e WebAssembly.
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const R = path.join(__dirname, '..');
const ondac = path.join(R, 'build/ondac');
const t = fs.mkdtempSync(path.join(os.tmpdir(), 'onda-mm-'));

// o exemplo com n fixo e a imprimir toda a matriz resultado (para conferir por completo, nao so o traco)
const src = `
: mm iiii>f idx a b n { = row * / idx n n = col % idx n = s 0.0 = k 0 W < k n { = s + s * @f + a + row k @f + b + * k n col = k + k 1 } s }
: encher ii>i p n { = i 0 W < i n { !f + p i F + % i 13 1 = i + i 1 } p }
: main >i {
  = n 40
  = a encher A * n n * n n
  = b encher A * n n * n n
  = c A * n n
  E c * n n mm a b n
  = i 0 W < i * n n { N I @f + c i P 32 = i + i 1 } 0 }
`;
fs.writeFileSync(path.join(t, 'm.c'), execFileSync(ondac, [], { input: src }));
execFileSync('cc', ['-O2', '-fwrapv', '-w', '-fopenmp', path.join(t, 'm.c'), '-o', path.join(t, 'mc'), '-lm']);
fs.writeFileSync(path.join(t, 'mx'), execFileSync(ondac, ['-x'], { input: src }), { mode: 0o755 });
fs.writeFileSync(path.join(t, 'm.wasm'), execFileSync(ondac, ['-w'], { input: src }));
const nums = s => s.trim().split(/\s+/).map(Number);
const C = () => nums(execFileSync(path.join(t, 'mc'), []).toString());
const X = () => nums(execFileSync(path.join(t, 'mx'), []).toString());
const Wf = () => nums(execFileSync('node', [path.join(R, 'wasm/host.js'), path.join(t, 'm.wasm')]).toString());

// referencia ingenua em JavaScript
function ref(n) {
  const a = [], b = [], c = new Array(n * n).fill(0);
  for (let i = 0; i < n * n; i++) { a[i] = (i % 13) + 1; b[i] = (i % 13) + 1; }
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { let s = 0; for (let k = 0; k < n; k++) s += a[i * n + k] * b[k * n + j]; c[i * n + j] = Math.trunc(s); }
  return c;
}

test('matmul por campo = triplo laço ingenuo (n=40)', () => {
  const esperado = ref(40);
  assert.deepStrictEqual(C(), esperado);
});

test('matmul: C, x86 e WebAssembly dao o mesmo resultado', () => {
  const c = C();
  assert.deepStrictEqual(X(), c, 'x86 difere de C');
  assert.deepStrictEqual(Wf(), c, 'WebAssembly difere de C');
});
