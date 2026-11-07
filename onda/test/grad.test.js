// Autodiff automatico (ex/grad.onda): o operador B gera f'(x) de um elemento de mapa por diferenciacao
// simbolica (numeros duais) da arvore do xvan. Dois testes: (1) o f' automatico bate as diferencas finitas
// centradas (e e, de facto, EXATO -- as dif. finitas e que tem erro O(e^2)); (2) o f' automatico e bit a bit
// igual em C, x86 e WebAssembly -- B compila para um laco em RI determinista, igual em qualquer backend.
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const R = path.join(__dirname, '..');
const ondac = path.join(R, 'build/ondac');
const t = fs.mkdtempSync(path.join(os.tmpdir(), 'onda-gr-'));
const src = fs.readFileSync(path.join(R, 'ex/grad.onda'));
fs.writeFileSync(path.join(t, 'g.c'), execFileSync(ondac, [], { input: src }));
execFileSync('cc', ['-O2', '-fwrapv', '-w', path.join(t, 'g.c'), '-o', path.join(t, 'gc'), '-lm']);
fs.writeFileSync(path.join(t, 'gx'), execFileSync(ondac, ['-x'], { input: src }), { mode: 0o755 });
fs.writeFileSync(path.join(t, 'g.wasm'), execFileSync(ondac, ['-w'], { input: src }));
const C = (...a) => execFileSync(path.join(t, 'gc'), a).toString();
const X = (...a) => execFileSync(path.join(t, 'gx'), a).toString();
const W = (...a) => execFileSync('node', [path.join(R, 'wasm/host.js'), path.join(t, 'g.wasm'), ...a]).toString();
// devolve os pares {fp: string da derivada automatica, fd: numero da dif. finita} por linha
const rows = s => s.trim().split('\n').slice(1).map(l => {
  const m = l.match(/fprime=(\S+) fd=(\S+)/);
  return { fp: m[1], fd: Number(m[2]) };
});

test('grad: a derivada automatica (operador B) bate as diferencas finitas', () => {
  for (const r of rows(C())) {
    const rel = Math.abs(Number(r.fp) - r.fd) / (1 + Math.abs(r.fd));
    assert.ok(rel < 1e-5, 'f\'=' + r.fp + ' vs fd=' + r.fd + ' (rel ' + rel + ')');
  }
});

test('grad: a derivada automatica e bit a bit igual em C, x86 e WebAssembly', () => {
  for (const n of ['8', '256', '1000']) {
    const c = rows(C(n)), x = rows(X(n)), w = rows(W(n));
    for (let i = 0; i < c.length; i++) {
      assert.strictEqual(x[i].fp, c[i].fp, 'x86 vs C (n=' + n + ', i=' + i + ')');
      assert.strictEqual(w[i].fp, c[i].fp, 'wasm vs C (n=' + n + ', i=' + i + ')');
    }
  }
});
