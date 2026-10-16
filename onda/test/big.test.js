// Aritmetica de precisao arbitraria (ex/big.onda): N! exato, para alem do int64. Confere contra o BigInt do
// JavaScript e exige o mesmo valor em C, x86 e WebAssembly.
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const R = path.join(__dirname, '..');
const ondac = path.join(R, 'build/ondac');
const t = fs.mkdtempSync(path.join(os.tmpdir(), 'onda-big-'));
const src = fs.readFileSync(path.join(R, 'ex/big.onda'));
fs.writeFileSync(path.join(t, 'b.c'), execFileSync(ondac, [], { input: src }));
execFileSync('cc', ['-O2', '-fwrapv', '-w', path.join(t, 'b.c'), '-o', path.join(t, 'bc'), '-lm']);
fs.writeFileSync(path.join(t, 'bx'), execFileSync(ondac, ['-x'], { input: src }), { mode: 0o755 });
fs.writeFileSync(path.join(t, 'b.wasm'), execFileSync(ondac, ['-w'], { input: src }));
const bin = { C: [path.join(t, 'bc')], x86: [path.join(t, 'bx')], wasm: ['node', path.join(R, 'wasm/host.js'), path.join(t, 'b.wasm')] };
const fact = (form, n) => execFileSync(bin[form][0], [...bin[form].slice(1), String(n)]).toString().match(/= (\d+)/)[1];
const ref = n => { let f = 1n; for (let i = 2n; i <= BigInt(n); i++) f *= i; return f.toString(); };

test('big: N! exato contra o BigInt (forma C)', () => {
  for (const n of [0, 1, 5, 20, 50, 100, 200]) assert.strictEqual(fact('C', n), ref(n), n + '!');
});

test('big: C, x86 e WebAssembly dao o mesmo N!', () => {
  for (const n of [25, 100, 200]) { const c = fact('C', n); assert.strictEqual(fact('x86', n), c, 'x86 ' + n); assert.strictEqual(fact('wasm', n), c, 'wasm ' + n); }
});
