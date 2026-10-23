// Quicksort (ex/qsort.onda): le inteiros do stdin, ordena, imprime. Confere contra o sort do JavaScript
// (ordenacao + mesma multiplicidade) e exige a mesma saida em C, x86 e WebAssembly.
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const R = path.join(__dirname, '..');
const ondac = path.join(R, 'build/ondac');
const t = fs.mkdtempSync(path.join(os.tmpdir(), 'onda-qs-'));
const src = fs.readFileSync(path.join(R, 'ex/qsort.onda'));
fs.writeFileSync(path.join(t, 'q.c'), execFileSync(ondac, [], { input: src }));
execFileSync('cc', ['-O2', '-fwrapv', '-w', path.join(t, 'q.c'), '-o', path.join(t, 'qc'), '-lm']);
fs.writeFileSync(path.join(t, 'qx'), execFileSync(ondac, ['-x'], { input: src }), { mode: 0o755 });
fs.writeFileSync(path.join(t, 'q.wasm'), execFileSync(ondac, ['-w'], { input: src }));
const bin = { C: [path.join(t, 'qc')], x86: [path.join(t, 'qx')], wasm: ['node', path.join(R, 'wasm/host.js'), path.join(t, 'q.wasm')] };
const sort = (form, nums) => execFileSync(bin[form][0], bin[form].slice(1), { input: nums.join('\n') + '\n' }).toString().trim().split('\n').filter(Boolean).map(Number);
function rnd(n, seed) { let s = seed; const a = []; for (let i = 0; i < n; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; a.push((s % 2001) - 1000); } return a; }

test('quicksort = sort do JavaScript (varios casos, forma C)', () => {
  for (const nums of [[], [1], [3, 1, 2], [5, 5, 5], [9, 8, 7, 6, 5, 4, 3, 2, 1], rnd(2000, 7), rnd(2000, 99)])
    assert.deepStrictEqual(sort('C', nums), [...nums].sort((a, b) => a - b), 'n=' + nums.length);
});

test('quicksort: C, x86 e WebAssembly dao a mesma ordenacao', () => {
  const nums = rnd(3000, 42);
  const c = sort('C', nums);
  assert.deepStrictEqual(sort('x86', nums), c, 'x86');
  assert.deepStrictEqual(sort('wasm', nums), c, 'wasm');
});
