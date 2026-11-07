// Avaliador de expressoes por descida recursiva (ex/calc.onda): a Onda analisa e recorre. Confere resultados
// conhecidos e exige o mesmo valor em C, x86 e WebAssembly. Divisao e resto sao inteiros (como a Onda).
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const R = path.join(__dirname, '..');
const ondac = path.join(R, 'build/ondac');
const t = fs.mkdtempSync(path.join(os.tmpdir(), 'onda-calc-'));
const src = fs.readFileSync(path.join(R, 'ex/calc.onda'));
fs.writeFileSync(path.join(t, 'c.c'), execFileSync(ondac, [], { input: src }));
execFileSync('cc', ['-O2', '-fwrapv', '-w', path.join(t, 'c.c'), '-o', path.join(t, 'cc'), '-lm']);
fs.writeFileSync(path.join(t, 'cx'), execFileSync(ondac, ['-x'], { input: src }), { mode: 0o755 });
fs.writeFileSync(path.join(t, 'c.wasm'), execFileSync(ondac, ['-w'], { input: src }));
const C = e => execFileSync(path.join(t, 'cc'), [], { input: e }).toString().trim();
const X = e => execFileSync(path.join(t, 'cx'), [], { input: e }).toString().trim();
const W = e => execFileSync('node', [path.join(R, 'wasm/host.js'), path.join(t, 'c.wasm')], { input: e }).toString().trim();

const casos = [
  ['3+4*2', '11'], ['(3+4)*2', '14'], ['2*(3+4*(5-1))', '38'],
  ['100/7', '14'], ['100%7', '2'], ['-5+3', '-2'], ['2*-3+10', '4'],
  ['1+2+3+4+5', '15'], ['2*2*2*2*2*2*2*2*2*2', '1024'], [' 7 * ( 8 - 3 ) ', '35'],
];

test('calc: resultados conhecidos (forma C)', () => {
  for (const [e, v] of casos) assert.strictEqual(C(e), v, e);
});

test('calc: C, x86 e WebAssembly dao o mesmo valor', () => {
  for (const [e] of casos) {
    const c = C(e);
    assert.strictEqual(X(e), c, 'x86: ' + e);
    assert.strictEqual(W(e), c, 'wasm: ' + e);
  }
});
