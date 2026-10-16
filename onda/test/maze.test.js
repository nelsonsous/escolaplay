// BFS do caminho mais curto num labirinto (ex/maze.onda). Confere contra uma BFS de referencia em JavaScript
// e exige o mesmo numero de passos em C, x86 e WebAssembly. '#' parede, 'S' inicio, 'E' fim.
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const R = path.join(__dirname, '..');
const ondac = path.join(R, 'build/ondac');
const t = fs.mkdtempSync(path.join(os.tmpdir(), 'onda-maze-'));
const src = fs.readFileSync(path.join(R, 'ex/maze.onda'));
fs.writeFileSync(path.join(t, 'm.c'), execFileSync(ondac, [], { input: src }));
execFileSync('cc', ['-O2', '-fwrapv', '-w', path.join(t, 'm.c'), '-o', path.join(t, 'mc'), '-lm']);
fs.writeFileSync(path.join(t, 'mx'), execFileSync(ondac, ['-x'], { input: src }), { mode: 0o755 });
fs.writeFileSync(path.join(t, 'm.wasm'), execFileSync(ondac, ['-w'], { input: src }));
const bin = { C: [path.join(t, 'mc')], x86: [path.join(t, 'mx')], wasm: ['node', path.join(R, 'wasm/host.js'), path.join(t, 'm.wasm')] };
const bfs = (form, maze) => Number(execFileSync(bin[form][0], bin[form].slice(1), { input: maze }).toString().trim());
function ref(maze) {
  const g = maze.replace(/\n$/, '').split('\n'), h = g.length, w = Math.max(...g.map(r => r.length));
  const at = (y, x) => (g[y] || '')[x] || '#';
  let sy, sx; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (at(y, x) === 'S') { sy = y; sx = x; }
  const dist = {}, q = [[sy, sx]]; dist[sy + ',' + sx] = 0;
  while (q.length) { const [y, x] = q.shift(); if (at(y, x) === 'E') return dist[y + ',' + x];
    for (const [dy, dx] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { const ny = y + dy, nx = x + dx;
      if (ny >= 0 && ny < h && nx >= 0 && nx < w && at(ny, nx) !== '#' && dist[ny + ',' + nx] === undefined) { dist[ny + ',' + nx] = dist[y + ',' + x] + 1; q.push([ny, nx]); } } }
  return -1;
}
const mazes = ['S..#\n.#.#\n.#.E\n....\n', 'S.\n.E\n', 'S#E\n', 'S....\n.###.\n...#.\n.#.#.\n.#..E\n', 'SE\n', 'S\n.\n.\n.\nE\n'];

test('maze: BFS = referencia (forma C)', () => {
  for (const m of mazes) assert.strictEqual(bfs('C', m), ref(m), JSON.stringify(m));
});
test('maze: C, x86 e WebAssembly dao o mesmo numero de passos', () => {
  for (const m of mazes) { const c = bfs('C', m); assert.strictEqual(bfs('x86', m), c, 'x86'); assert.strictEqual(bfs('wasm', m), c, 'wasm'); }
});
