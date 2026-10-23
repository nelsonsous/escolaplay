// Autodiff (ex/autodiff.onda): gradiente de uma regressao linear por modo-reverso (adjunto), conferido por
// diferencas finitas centradas. Dois testes: (1) o gradiente analitico bate o numerico a ~6 digitos -- se o
// adjunto estiver errado, divergem; (2) o gradiente adjunto e BIT A BIT igual em C, x86 e WebAssembly -- o
// backward e feito das mesmas operacoes de campo (mapa/reducao) deterministas, logo tem de dar os mesmos bits.
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const R = path.join(__dirname, '..');
const ondac = path.join(R, 'build/ondac');
const t = fs.mkdtempSync(path.join(os.tmpdir(), 'onda-ad-'));
const src = fs.readFileSync(path.join(R, 'ex/autodiff.onda'));
fs.writeFileSync(path.join(t, 'a.c'), execFileSync(ondac, [], { input: src }));
execFileSync('cc', ['-O2', '-fwrapv', '-w', '-fopenmp', path.join(t, 'a.c'), '-o', path.join(t, 'ac'), '-lm']);
fs.writeFileSync(path.join(t, 'ax'), execFileSync(ondac, ['-x'], { input: src }), { mode: 0o755 });
fs.writeFileSync(path.join(t, 'a.wasm'), execFileSync(ondac, ['-w'], { input: src }));
const C = (...a) => execFileSync(path.join(t, 'ac'), a).toString();
const X = (...a) => execFileSync(path.join(t, 'ax'), a).toString();
const W = (...a) => execFileSync('node', [path.join(R, 'wasm/host.js'), path.join(t, 'a.wasm'), ...a]).toString();
const grad = s => {
  const w = s.match(/dL\/dw adjunto=(\S+) numerico=(\S+)/);
  const b = s.match(/dL\/db adjunto=(\S+) numerico=(\S+)/);
  return { aw: w[1], nw: Number(w[2]), ab: b[1], nb: Number(b[2]) };
};

test('autodiff: o gradiente adjunto (modo reverso) bate o numerico a ~6 digitos', () => {
  const g = grad(C());
  const rel = (a, b) => Math.abs(a - b) / (1 + Math.abs(b));
  assert.ok(rel(Number(g.aw), g.nw) < 1e-5, 'dL/dw: adjunto=' + g.aw + ' numerico=' + g.nw);
  assert.ok(rel(Number(g.ab), g.nb) < 1e-5, 'dL/db: adjunto=' + g.ab + ' numerico=' + g.nb);
});

test('autodiff: o gradiente adjunto e bit a bit igual em C, x86 e WebAssembly', () => {
  for (const n of ['256', '1000', '777']) {
    const c = grad(C(n)), x = grad(X(n)), w = grad(W(n));
    assert.strictEqual(x.aw, c.aw, 'dL/dw x86 vs C (n=' + n + ')');
    assert.strictEqual(x.ab, c.ab, 'dL/db x86 vs C (n=' + n + ')');
    assert.strictEqual(w.aw, c.aw, 'dL/dw wasm vs C (n=' + n + ')');
    assert.strictEqual(w.ab, c.ab, 'dL/db wasm vs C (n=' + n + ')');
  }
});
