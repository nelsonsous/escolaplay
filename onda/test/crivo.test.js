// Crivo de Eratostenes (ex/crivo.onda): conta primos ate N. Confere contagens conhecidas e exige o mesmo
// resultado em C, x86 e WebAssembly. Workload compute + memoria, sem chamadas no laço quente.
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const R = path.join(__dirname, '..');
const ondac = path.join(R, 'build/ondac');
const t = fs.mkdtempSync(path.join(os.tmpdir(), 'onda-crivo-'));
const src = fs.readFileSync(path.join(R, 'ex/crivo.onda'));
fs.writeFileSync(path.join(t, 'c.c'), execFileSync(ondac, [], { input: src }));
execFileSync('cc', ['-O2', '-fwrapv', '-w', path.join(t, 'c.c'), '-o', path.join(t, 'cc'), '-lm']);
fs.writeFileSync(path.join(t, 'cx'), execFileSync(ondac, ['-x'], { input: src }), { mode: 0o755 });
fs.writeFileSync(path.join(t, 'c.wasm'), execFileSync(ondac, ['-w'], { input: src }));
const num = s => Number(s.match(/^\d+/)[0]);
const C = n => num(execFileSync(path.join(t, 'cc'), [String(n)]).toString());
const X = n => num(execFileSync(path.join(t, 'cx'), [String(n)]).toString());
const W = n => num(execFileSync('node', [path.join(R, 'wasm/host.js'), path.join(t, 'c.wasm'), String(n)]).toString());
const casos = [[10, 4], [100, 25], [1000, 168], [10000, 1229], [100000, 9592]];

test('crivo: contagens de primos conhecidas (forma C)', () => {
  for (const [n, p] of casos) assert.strictEqual(C(n), p, 'ate ' + n);
});

test('crivo: C, x86 e WebAssembly dao a mesma contagem', () => {
  for (const [n] of casos) { const c = C(n); assert.strictEqual(X(n), c, 'x86 ' + n); assert.strictEqual(W(n), c, 'wasm ' + n); }
});
