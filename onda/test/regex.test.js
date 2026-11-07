// Mini expressoes regulares (ex/regex.onda, o matcher do Kernighan: . * ^ $). Confere casos conhecidos e exige
// o mesmo veredicto em C, x86 e WebAssembly.
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const R = path.join(__dirname, '..');
const ondac = path.join(R, 'build/ondac');
const t = fs.mkdtempSync(path.join(os.tmpdir(), 'onda-rx-'));
const src = fs.readFileSync(path.join(R, 'ex/regex.onda'));
fs.writeFileSync(path.join(t, 'r.c'), execFileSync(ondac, [], { input: src }));
execFileSync('cc', ['-O2', '-fwrapv', '-w', path.join(t, 'r.c'), '-o', path.join(t, 'rc'), '-lm']);
fs.writeFileSync(path.join(t, 'rx'), execFileSync(ondac, ['-x'], { input: src }), { mode: 0o755 });
fs.writeFileSync(path.join(t, 'r.wasm'), execFileSync(ondac, ['-w'], { input: src }));
const bin = { C: [path.join(t, 'rc')], x86: [path.join(t, 'rx')], wasm: ['node', path.join(R, 'wasm/host.js'), path.join(t, 'r.wasm')] };
const run = (form, pat, linhas) => execFileSync(bin[form][0], [...bin[form].slice(1), pat], { input: linhas.join('\n') + '\n' }).toString().trim().split('\n').map(Number);

const casos = [
  ['a*b', ['b', 'ab', 'aaab', 'ac', 'xaaab'], [1, 1, 1, 0, 1]],
  ['^ab.d$', ['abcd', 'abXd', 'abcde', 'xabcd'], [1, 1, 0, 0]],
  ['.*c', ['abc', 'xyzc', 'ab'], [1, 1, 0]],
  ['^a*$', ['', 'a', 'aaa', 'aab'], [1, 1, 1, 0]],
  ['c.t', ['cat', 'cot', 'ct', 'cart'], [1, 1, 0, 0]],
];

test('regex: casos conhecidos (forma C)', () => {
  for (const [pat, linhas, esperado] of casos) assert.deepStrictEqual(run('C', pat, linhas), esperado, pat);
});

test('regex: C, x86 e WebAssembly dao o mesmo veredicto', () => {
  for (const [pat, linhas] of casos) {
    const c = run('C', pat, linhas);
    assert.deepStrictEqual(run('x86', pat, linhas), c, 'x86 ' + pat);
    assert.deepStrictEqual(run('wasm', pat, linhas), c, 'wasm ' + pat);
  }
});
