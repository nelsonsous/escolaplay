// A matematica da Onda (src/9mat.onda, fdlibm escrito em Onda) da os mesmos bits que o Math do JavaScript,
// em C, WebAssembly e x86 nativo. Corre com: node --test test/mat.test.js (depois de ./build.sh)
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const R = path.join(__dirname, '..');
const dv = new DataView(new ArrayBuffer(8));
const hi = x => { dv.setFloat64(0, x); return dv.getInt32(0); };
const lo = x => { dv.setFloat64(0, x); return dv.getUint32(4); };
let seed = 777;
const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const xs = [0, -0, 1, -1, 0.5, 2, Math.PI, Math.PI / 2, Math.PI / 4, 1e-9, 1e-300, 5e-324, 709.7, 710, -745, -746, 823549, Infinity, -Infinity, NaN];
for (let i = 0; i < 5000; i++) xs.push((rnd() < 0.5 ? -1 : 1) * rnd() * Math.pow(2, Math.floor(rnd() * 40) - 20));
for (let i = 0; i < 1000; i++) xs.push((rnd() - 0.5) * 1.6e6);
const entrada = xs.length + '\n' + xs.map(x => hi(x) + ' ' + lo(x)).join('\n') + '\n';
const esperado = xs.map(x => [Math.sin(x), Math.cos(x), Math.exp(x), Math.log(Math.abs(x))].map(v => Number.isNaN(v) ? 'nan' : hi(v) + ' ' + lo(v)).join(' '));
const t = fs.mkdtempSync(path.join(os.tmpdir(), 'onda-mat-'));
const src = fs.readFileSync(path.join(R, 'test/m/bits.onda'));
const ondac = path.join(R, 'build/ondac');
const norm = s => s.trim().split('\n').map(l => { const p = l.split(' '); const o = []; for (let j = 0; j < 8; j += 2) { const h = +p[j], q = +p[j + 1]; o.push(((h & 0x7ff00000) === 0x7ff00000 && ((h & 0xfffff) || q)) ? 'nan' : h + ' ' + q); } return o.join(' '); });
function confere(nome, saida) {
  const a = norm(saida);
  assert.strictEqual(a.length, esperado.length);
  let dif = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== esperado[i]) dif++;
  assert.strictEqual(dif, 0, nome + ': ' + dif + ' valores diferentes do Math');
}
test('C: seno, coseno, exp e log iguais ao bit ao Math', () => {
  fs.writeFileSync(path.join(t, 'b.c'), execFileSync(ondac, { input: src }));
  execFileSync('cc', ['-O2', '-fwrapv', '-w', path.join(t, 'b.c'), '-o', path.join(t, 'b'), '-lm']);
  confere('C', execFileSync(path.join(t, 'b'), { input: entrada }).toString());
});
test('WebAssembly: iguais ao bit ao Math', () => {
  fs.writeFileSync(path.join(t, 'b.wasm'), execFileSync(ondac, ['-w'], { input: src }));
  confere('WebAssembly', execFileSync('node', [path.join(R, 'wasm/host.js'), path.join(t, 'b.wasm')], { input: entrada }).toString());
});
test('x86-64 nativo: iguais ao bit ao Math', { skip: process.platform !== 'linux' || process.arch !== 'x64' }, () => {
  fs.writeFileSync(path.join(t, 'bx'), execFileSync(ondac, ['-x'], { input: src }), { mode: 0o755 });
  confere('x86', execFileSync(path.join(t, 'bx'), { input: entrada }).toString());
});
