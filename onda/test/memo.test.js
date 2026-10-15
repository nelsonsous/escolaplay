// Memoizacao persistente (ex/memo.onda): o fib fica guardado no armazem (K) e sobrevive entre execucoes
// e entre formas. Uma forma calcula, as outras leem o mesmo ficheiro.
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const R = path.join(__dirname, '..');
const ondac = path.join(R, 'build/ondac');
const t = fs.mkdtempSync(path.join(os.tmpdir(), 'onda-memo-'));
const src = fs.readFileSync(path.join(R, 'ex/memo.onda'));
fs.writeFileSync(path.join(t, 'm.c'), execFileSync(ondac, [], { input: src }));
execFileSync('cc', ['-O2', '-fwrapv', '-w', path.join(t, 'm.c'), '-o', path.join(t, 'mc'), '-lm']);
fs.writeFileSync(path.join(t, 'mx'), execFileSync(ondac, ['-x'], { input: src }), { mode: 0o755 });
fs.writeFileSync(path.join(t, 'm.wasm'), execFileSync(ondac, ['-w'], { input: src }));
const C = (n, env) => execFileSync(path.join(t, 'mc'), [String(n)], { env }).toString();
const X = (n, env) => execFileSync(path.join(t, 'mx'), [String(n)], { env }).toString();
const W = (n, env) => execFileSync('node', [path.join(R, 'wasm/host.js'), path.join(t, 'm.wasm'), String(n)], { env }).toString();
const env = f => ({ ...process.env, ONDA_ARM: f });
const fibv = s => s.match(/= (-?\d+) /)[1];
// valores de referencia (fib com int64, 0-indexado: fib(90)=2880067194370816120)
const REF = { 10: '55', 50: '12586269025', 90: '2880067194370816120', 92: '7540113804746346429' };

test('memo volatil (sem ONDA_ARM): da os valores certos do fib', () => {
  for (const n of [10, 50, 90, 92]) assert.strictEqual(fibv(C(n, process.env)), REF[n], 'fib ' + n);
});

test('memo persiste entre execucoes e entre formas (C calcula, x86 e WebAssembly leem o mesmo ficheiro)', () => {
  const f = path.join(t, 'fib.arm');
  assert.strictEqual(fibv(C(92, env(f))), REF[92]);          // C calcula e guarda ate 92
  const antes = fs.statSync(f).mtimeMs;
  assert.strictEqual(fibv(X(90, env(f))), REF[90]);          // x86 le do armazem
  assert.strictEqual(fibv(W(90, env(f))), REF[90]);          // WebAssembly le do armazem
  // o armazem ja tinha tudo ate 92, por isso ler 90 nao reescreve o ficheiro
  assert.strictEqual(fs.statSync(f).mtimeMs, antes, 'ler nao devia reescrever');
});

test('o armazem guarda cada fib intermedio (nao so o pedido)', () => {
  const f = path.join(t, 'fib2.arm');
  C(92, env(f));
  const m = fs.readFileSync(f);
  // marca em m[0], depois fib(n) em m[1+n]; confirmar fib(50) gravado
  assert.strictEqual(m.readBigInt64LE(0), 6942n, 'marca');
  assert.strictEqual(m.readBigInt64LE((1 + 50) * 8), 12586269025n, 'fib(50) guardado');
});
