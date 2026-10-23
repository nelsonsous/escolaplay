// Derivada composta / VJP do mapa (ex/vjp.onda): o operador V gera d[i] = f'(a[i]) * y[i] -- a regra da cadeia
// do backward, que propaga o gradiente a montante (y) para a entrada do mapa. Dois testes: (1) o VJP bate as
// diferencas finitas centradas (d[i] e o gradiente de L = sum(y*f(a)) em ordem a a[i]); (2) e bit a bit igual
// em C, x86 e WebAssembly -- V compila para um laco em RI determinista, igual em qualquer backend.
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const R = path.join(__dirname, '..');
const ondac = path.join(R, 'build/ondac');
const t = fs.mkdtempSync(path.join(os.tmpdir(), 'onda-vjp-'));
const src = fs.readFileSync(path.join(R, 'ex/vjp.onda'));
fs.writeFileSync(path.join(t, 'v.c'), execFileSync(ondac, [], { input: src }));
execFileSync('cc', ['-O2', '-fwrapv', '-w', path.join(t, 'v.c'), '-o', path.join(t, 'vc'), '-lm']);
fs.writeFileSync(path.join(t, 'vx'), execFileSync(ondac, ['-x'], { input: src }), { mode: 0o755 });
fs.writeFileSync(path.join(t, 'v.wasm'), execFileSync(ondac, ['-w'], { input: src }));
const C = (...a) => execFileSync(path.join(t, 'vc'), a).toString();
const X = (...a) => execFileSync(path.join(t, 'vx'), a).toString();
const W = (...a) => execFileSync('node', [path.join(R, 'wasm/host.js'), path.join(t, 'v.wasm'), ...a]).toString();
const rows = s => s.trim().split('\n').map(l => {
  const m = l.match(/vjp=(\S+) fd=(\S+)/);
  return { vjp: m[1], fd: Number(m[2]) };
});

test('vjp: a derivada composta (operador V) bate as diferencas finitas', () => {
  for (const r of rows(C())) {
    const rel = Math.abs(Number(r.vjp) - r.fd) / (1 + Math.abs(r.fd));
    assert.ok(rel < 1e-5, 'vjp=' + r.vjp + ' vs fd=' + r.fd + ' (rel ' + rel + ')');
  }
});

test('vjp: a derivada composta e bit a bit igual em C, x86 e WebAssembly', () => {
  for (const n of ['8', '64', '101']) {
    const c = rows(C(n)), x = rows(X(n)), w = rows(W(n));
    for (let i = 0; i < c.length; i++) {
      assert.strictEqual(x[i].vjp, c[i].vjp, 'x86 vs C (n=' + n + ', i=' + i + ')');
      assert.strictEqual(w[i].vjp, c[i].vjp, 'wasm vs C (n=' + n + ', i=' + i + ')');
    }
  }
});
