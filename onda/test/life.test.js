// Jogo da Vida de Conway pelo paradigma de campo (ex/life.onda): cada geracao e um E (stencil de 8 vizinhos),
// grelha toroidal. Confere contra uma referencia em JavaScript e exige a mesma grelha em C, x86 e WebAssembly.
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const R = path.join(__dirname, '..');
const ondac = path.join(R, 'build/ondac');
const t = fs.mkdtempSync(path.join(os.tmpdir(), 'onda-life-'));
const src = fs.readFileSync(path.join(R, 'ex/life.onda'));
fs.writeFileSync(path.join(t, 'l.c'), execFileSync(ondac, [], { input: src }));
execFileSync('cc', ['-O2', '-fwrapv', '-w', '-fopenmp', path.join(t, 'l.c'), '-o', path.join(t, 'lc'), '-lm']);
fs.writeFileSync(path.join(t, 'lx'), execFileSync(ondac, ['-x'], { input: src }), { mode: 0o755 });
fs.writeFileSync(path.join(t, 'l.wasm'), execFileSync(ondac, ['-w'], { input: src }));
const C = g => execFileSync(path.join(t, 'lc'), [String(g)]).toString();
const X = g => execFileSync(path.join(t, 'lx'), [String(g)]).toString();
const W = g => execFileSync('node', [path.join(R, 'wasm/host.js'), path.join(t, 'l.wasm'), String(g)]).toString();

// referencia: mesma grelha 10x10 toroidal, mesmo planador inicial
const WD = 10, HT = 10;
function ref(ger) {
  let g = new Array(WD * HT).fill(0);
  for (const [x, y] of [[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]]) g[y * WD + x] = 1;
  for (let s = 0; s < ger; s++) {
    const h = new Array(WD * HT).fill(0);
    for (let y = 0; y < HT; y++) for (let x = 0; x < WD; x++) {
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy)
        n += g[((y + dy + HT) % HT) * WD + ((x + dx + WD) % WD)];
      h[y * WD + x] = g[y * WD + x] ? (n === 2 || n === 3 ? 1 : 0) : (n === 3 ? 1 : 0);
    }
    g = h;
  }
  return g.map((v, i) => (v ? '#' : '.') + ((i + 1) % WD === 0 ? '\n' : '')).join('');
}

test('Vida: planador move-se como a referencia (0, 1, 4, 8 geracoes)', () => {
  for (const ger of [0, 1, 4, 8]) assert.strictEqual(C(ger), ref(ger), 'geracao ' + ger);
});

test('Vida: C, x86 e WebAssembly dao a mesma grelha', () => {
  for (const ger of [1, 4, 9]) {
    const c = C(ger);
    assert.strictEqual(X(ger), c, 'x86 ger ' + ger);
    assert.strictEqual(W(ger), c, 'wasm ger ' + ger);
  }
});
