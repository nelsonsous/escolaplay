// Mini-linguagem interpretada em Onda (ex/mini.onda): expressoes com variaveis e atribuicao, ambiente proprio.
// Confere programas conhecidos e exige a mesma saida em C, x86 e WebAssembly.
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const R = path.join(__dirname, '..');
const ondac = path.join(R, 'build/ondac');
const t = fs.mkdtempSync(path.join(os.tmpdir(), 'onda-mini-'));
const src = fs.readFileSync(path.join(R, 'ex/mini.onda'));
fs.writeFileSync(path.join(t, 'm.c'), execFileSync(ondac, [], { input: src }));
execFileSync('cc', ['-O2', '-fwrapv', '-w', path.join(t, 'm.c'), '-o', path.join(t, 'mc'), '-lm']);
fs.writeFileSync(path.join(t, 'mx'), execFileSync(ondac, ['-x'], { input: src }), { mode: 0o755 });
fs.writeFileSync(path.join(t, 'm.wasm'), execFileSync(ondac, ['-w'], { input: src }));
const C = p => execFileSync(path.join(t, 'mc'), [], { input: p }).toString().trim().split('\n').join(' ');
const X = p => execFileSync(path.join(t, 'mx'), [], { input: p }).toString().trim().split('\n').join(' ');
const W = p => execFileSync('node', [path.join(R, 'wasm/host.js'), path.join(t, 'm.wasm')], { input: p }).toString().trim().split('\n').join(' ');

const casos = [
  ['x = 3\ny = 4\nx*x + y*y\n(x+y)*2\n', '25 14'],
  ['n = 10\nf = 1\nf = f * n\nn = n - 1\nf = f * n\nf\n', '90'],
  ['a = 2\nb = a*a*a\nb\nc = b - a\nc\n', '8 6'],
  ['area = 3 * 4\narea + area\n', '24'],
  ['x = 5\nx = x + 1\nx = x * x\nx\n', '36'],
  ['x = 5\n? x < 10 100 200\n? x > 10 100 200\n', '100 200'],
  ['x = 5\nmax = ? x > 3 x 3\nmax\n? x == 5 1 0\nx <= 5\nx != 5\n', '5 1 1 0'],
  ['a = -7\nabs = ? a < 0 (0 - a) a\nabs\n', '7'],
  ['n = 5\nf = 1\nW (n > 0) { f = f * n ; n = n - 1 }\nf\n', '120'],
  ['a = 0\nb = 1\ni = 0\nW (i < 10) { t = a + b ; a = b ; b = t ; i = i + 1 }\na\n', '55'],
  ['s = 0\nk = 1\nW (k <= 100) { s = s + k ; k = k + 1 }\ns\n', '5050'],
  ['n = 2\nc = 0\nW (n < 20) { d = 2 ; e = 1 ; W (d < n) { e = ? n % d == 0 0 e ; d = d + 1 } ; c = c + e ; n = n + 1 }\nc\n', '8'],
  ['F fat n = ? (n < 2) 1 (n * fat (n - 1))\nfat 6\n', '720'],
  ['F fib n = ? (n < 2) n (fib (n - 1) + fib (n - 2))\nfib 15\n', '610'],
  ['F par n = ? (n == 0) 1 (impar (n - 1))\nF impar n = ? (n == 0) 0 (par (n - 1))\npar 10\npar 7\n', '1 0'],
];

test('mini: programas com variaveis (forma C)', () => {
  for (const [p, v] of casos) assert.strictEqual(C(p), v, JSON.stringify(p));
});

test('mini: C, x86 e WebAssembly dao a mesma saida', () => {
  for (const [p] of casos) {
    const c = C(p);
    assert.strictEqual(X(p), c, 'x86: ' + JSON.stringify(p));
    assert.strictEqual(W(p), c, 'wasm: ' + JSON.stringify(p));
  }
});
