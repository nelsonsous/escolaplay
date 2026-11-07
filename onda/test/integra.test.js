// Integracao de Simpson pelo paradigma de campo (ex/integra.onda): a soma dos pesos e um S. Verifica o VALOR
// (contra 2 e pi). Nota: o S de floats paraleliza em C (OpenMP), por isso soma noutra ordem que o x86/WASM (serie);
// como a soma de floats nao e associativa, os ultimos bits de C podem diferir -- mas x86 e WASM (ambos serie) batem.
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const R = path.join(__dirname, '..');
const ondac = path.join(R, 'build/ondac');
const t = fs.mkdtempSync(path.join(os.tmpdir(), 'onda-int-'));
const src = fs.readFileSync(path.join(R, 'ex/integra.onda'));
fs.writeFileSync(path.join(t, 'i.c'), execFileSync(ondac, [], { input: src }));
execFileSync('cc', ['-O2', '-fwrapv', '-w', '-fopenmp', path.join(t, 'i.c'), '-o', path.join(t, 'ic'), '-lm']);
fs.writeFileSync(path.join(t, 'ix'), execFileSync(ondac, ['-x'], { input: src }), { mode: 0o755 });
fs.writeFileSync(path.join(t, 'i.wasm'), execFileSync(ondac, ['-w'], { input: src }));
const C = () => execFileSync(path.join(t, 'ic')).toString();
const X = () => execFileSync(path.join(t, 'ix')).toString();
const W = () => execFileSync('node', [path.join(R, 'wasm/host.js'), path.join(t, 'i.wasm')]).toString();
const vals = s => [...s.matchAll(/= (\d\.\d+)/g)].map(m => Number(m[1]));
const bits = s => s.match(/bits: (.+)/)[1];

test('integra: Simpson aproxima 2 e pi (todas as formas, dentro da tolerancia)', () => {
  for (const out of [C(), X(), W()]) {
    const [isin, iatan] = vals(out);
    assert.ok(Math.abs(isin - 2) < 1e-10, 'sin: ' + isin);
    assert.ok(Math.abs(iatan - Math.PI) < 1e-10, 'atan: ' + iatan);
  }
});

test('integra: x86 e WebAssembly (ambos em serie) sao bit a bit iguais', () => {
  assert.strictEqual(bits(X()), bits(W()), 'x86 vs wasm');
});
