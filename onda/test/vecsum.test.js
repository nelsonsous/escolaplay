// Reducao de campo vetorizavel (ex/vecsum.onda): S = soma de um polinomio de grau 7 sobre a[i].
// Modo -x: em serie, bit a bit igual ao C sequencial. Modo -xf: acumulador de 4 em ymm (reassocia, por isso
// difere no ultimo bit mas concorda a ~15 digitos) -- e e onde o gcc -O2 nao vetoriza e a Onda sim.
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const R = path.join(__dirname, '..');
const ondac = path.join(R, 'build/ondac');
const t = fs.mkdtempSync(path.join(os.tmpdir(), 'onda-vs-'));
const src = fs.readFileSync(path.join(R, 'ex/vecsum.onda'));
fs.writeFileSync(path.join(t, 's.c'), execFileSync(ondac, [], { input: src }));
execFileSync('cc', ['-O2', '-fwrapv', '-w', path.join(t, 's.c'), '-o', path.join(t, 'sc'), '-lm']); // sem openmp: serie
fs.writeFileSync(path.join(t, 'sx'), execFileSync(ondac, ['-x'], { input: src }), { mode: 0o755 });
fs.writeFileSync(path.join(t, 'sxf'), execFileSync(ondac, ['-xf'], { input: src }), { mode: 0o755 });
const soma = s => s.match(/soma = (\S+)/)[1];
const bits = s => s.match(/bits (\d+) (\d+)/).slice(1, 3).join(' ');
const run = f => execFileSync(path.join(t, f)).toString();

test('vecsum: modo -x (em serie) bate o C sequencial ao bit', () => {
  assert.strictEqual(bits(run('sx')), bits(run('sc')), '-x vs C seq');
  assert.strictEqual(soma(run('sx')), soma(run('sc')), 'soma -x vs C seq');
});

test('vecsum: modo -xf (AVX, reassocia) da o mesmo valor a ~15 digitos', () => {
  const sx = Number(soma(run('sx'))), sf = Number(soma(run('sxf')));
  assert.ok(Math.abs(sf - sx) / sx < 1e-12, '-xf divergiu: -x=' + sx + ' -xf=' + sf);
});
