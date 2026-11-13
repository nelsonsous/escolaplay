// A biblioteca de gráficos (lib/grafico.onda): o caminho SVG de uma série, em linha quebrada e em curva suave, igual
// ao byte à mesma conta em JavaScript (só inteiros: as coordenadas em décimas), em WebAssembly e em x86-64.
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const R = path.join(__dirname, '..');
const ondac = path.join(R, 'build/ondac');
const t = fs.mkdtempSync(path.join(os.tmpdir(), 'onda-grafico-'));
const lib = (...ms) => ms.map((m) => fs.readFileSync(path.join(R, 'lib', m + '.onda'), 'utf8')).join('\n');

// a referência em JavaScript (a divisão é a dos inteiros: corta para zero)
const div = (a, b) => Math.trunc(a / b);
const X = (i, n, w, m) => (n > 1 ? m * 10 + div(i * (w - 2 * m) * 10, n - 1) : 5 * w);
const Y = (v, h, m, lo, hi) => { const a = Math.max(lo, Math.min(hi, v)); return hi > lo ? (h - m) * 10 - div((a - lo) * (h - 2 * m) * 10, hi - lo) : 5 * h; };
const D = (x) => { let s = ''; if (x < 0) { s = '-'; x = -x; } s += div(x, 10); if (x % 10) s += '.' + (x % 10); return s; };
const PT = (x, y) => D(x) + ' ' + D(y);
const fim = (n, w, h, m, fecha) => (fecha ? 'L' + PT(X(n - 1, n, w, m), (h - m) * 10) + 'L' + PT(X(0, n, w, m), (h - m) * 10) + 'Z' : '');
const um = (v, w, h, m, lo, hi, fecha) => { const y = Y(v[0], h, m, lo, hi); return 'M' + PT(m * 10, y) + 'L' + PT((w - m) * 10, y) + (fecha ? 'L' + PT((w - m) * 10, (h - m) * 10) + 'L' + PT(m * 10, (h - m) * 10) + 'Z' : ''); };
const linha = (v, w, h, m, lo, hi, fecha) => {
  const n = v.length;
  if (n < 1) return '';
  if (n === 1) return um(v, w, h, m, lo, hi, fecha);
  return v.map((x, i) => (i ? 'L' : 'M') + PT(X(i, n, w, m), Y(x, h, m, lo, hi))).join('') + fim(n, w, h, m, fecha);
};
const curva = (v, w, h, m, lo, hi, fecha) => {
  const n = v.length;
  if (n < 1) return '';
  if (n === 1) return um(v, w, h, m, lo, hi, fecha);
  const c = (i) => Math.max(0, Math.min(n - 1, i)), xi = (i) => X(c(i), n, w, m), yi = (i) => Y(v[c(i)], h, m, lo, hi);
  const tp = m * 10, b = (h - m) * 10, dentro = (y) => Math.max(tp, Math.min(b, y));
  let s = 'M' + PT(xi(0), yi(0));
  for (let i = 0; i < n - 1; i++) {
    const x1 = xi(i) + div(xi(i + 1) - xi(i - 1), 6), y1 = yi(i) + div(yi(i + 1) - yi(i - 1), 6);
    const x2 = xi(i + 1) - div(xi(i + 2) - xi(i), 6), y2 = yi(i + 1) - div(yi(i + 2) - yi(i), 6);
    s += 'C' + PT(x1, dentro(y1)) + ' ' + PT(x2, dentro(y2)) + ' ' + PT(xi(i + 1), yi(i + 1));
  }
  return s + fim(n, w, h, m, fecha);
};

test('gráficos: a linha e a curva de uma série são iguais ao byte à conta em JavaScript (-w e -x)', () => {
  let s = 12345;
  const rnd = (n) => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s % n; };
  const casos = [[[], 320, 80, 8, 0, 1000], [[500], 320, 80, 8, 0, 1000], [[0, 1000], 320, 80, 8, 0, 1000], [[5, 5, 5], 100, 40, 0, 5, 5],
    [[-50, 2000, 300], 200, 60, 4, 0, 1000], [[400, 450, 700, 650, 300, 350, 800], 320, 76, 8, 0, 1000]];
  for (let k = 0; k < 40; k++) casos.push([Array.from({ length: 2 + rnd(40) }, () => rnd(1200) - 100), 100 + rnd(400), 30 + rnd(120), rnd(12), rnd(200), 800 + rnd(400)]);
  const linhas = [], espera = [];
  casos.forEach(([v, w, h, m, lo, hi], k) => {
    const poe = v.map((x, i) => `! + v ${i} ${x}`).join(' ');
    for (const fecha of [0, 1]) {
      linhas.push(`: c${k}_${fecha} >i { = v A ${v.length + 1} ${poe} _gr_linha v ${v.length} ${w} ${h} ${m} ${lo} ${hi} ${fecha} P 10 _gr_curva v ${v.length} ${w} ${h} ${m} ${lo} ${hi} ${fecha} P 10 0 }`);
      espera.push(linha(v, w, h, m, lo, hi, fecha), curva(v, w, h, m, lo, hi, fecha));
    }
  });
  const src = lib('grafico') + '\n' + linhas.join('\n') + '\n: main >i { ' + casos.map((_, k) => `c${k}_0 c${k}_1`).join(' ') + ' 0 }\n';
  fs.writeFileSync(path.join(t, 'g.wasm'), execFileSync(ondac, ['-w', 'main'], { input: src, maxBuffer: 1 << 26 }));
  const w = execFileSync('node', [path.join(R, 'wasm/host.js'), path.join(t, 'g.wasm')], { maxBuffer: 1 << 26 }).toString();
  assert.strictEqual(w, espera.join('\n') + '\n');
  fs.writeFileSync(path.join(t, 'gx'), execFileSync(ondac, ['-x'], { input: src, maxBuffer: 1 << 26 }), { mode: 0o755 });
  assert.strictEqual(execFileSync(path.join(t, 'gx'), { maxBuffer: 1 << 26 }).toString(), w, 'x86-64 igual ao WebAssembly');
  // o que se espera de um caminho: começa em M, a curva não sai da caixa, fechado acaba em Z
  const [v, wd, h, m] = casos[5];
  const cv = curva(v, wd, h, m, 0, 1000, 1);
  assert.match(cv, /^M8 /);
  assert.match(cv, /Z$/);
  const ys = [...cv.matchAll(/[MCL ]-?[\d.]+ (-?[\d.]+)/g)].map((x) => Number(x[1]));
  assert.ok(ys.every((y) => y >= m && y <= h - m), 'os pontos e os controlos ficam dentro da caixa');
  console.log(`# ${casos.length * 2} séries, ${w.length} bytes iguais em -w, -x e JavaScript`);
});
