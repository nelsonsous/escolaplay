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

// Pw e At: as quatro formas sao comparadas com o significado (que interpreta o mesmo _pw da biblioteca);
// o pow e o do fdlibm 5.3 (o StrictMath do Java), nao o Math.pow do V8, que usa outro algoritmo.
// Ancoras: pares em que o fdlibm e o V8 diferem, com os bits do fdlibm (conferidos no Java 21).
const ANCORAS = [
  [2117592124,2281731484,1072693248,450359963,2117592232,2979084965],
  [1074921472,0,1073217536,0,1076041605,2793101941],
  [1074340347,1413754136,1072693247,3394247371,1074340347,603945045],
  [1074340347,1413754136,1074921472,0,1080399078,1489866352],
  [1070274962,0,-1071251456,0,1098441848,3985316191],
  [1075979019,0,1075100571,3489660928,1089891540,3693747791],
  [1082061191,1073741824,-1070674751,2147483648,928101993,3633620638],
  [1077159244,0,-1071562248,0,1033406294,285084999],
  [1063091917,2147483648,1076162735,2684354560,972503925,3771497321],
  [1065770878,0,-1071208526,2147483648,1150033874,1128555097],
  [1081459778,2147483648,-1071384510,3221225472,984204047,1228488500],
  [1072464295,2147483648,1074719503,0,1071937601,2568843721],
  [1061472960,0,1076774475,0,904037678,1705753238],
  [1073933714,0,-1070455195,805306368,1048959366,109240128],
  [1065534746,0,-1070399488,0,1207477651,408002158],
  [1073761545,3221225472,-1071266670,536870912,1060917401,3703856089],
  [1068818274,0,-1070530560,0,1137070160,2299414754],
  [1073602240,0,-1070621921,2147483648,1057700857,71425998],
  [1061795571,2147483648,1077018624,0,877919720,239841268],
  [1080488447,2147483648,1076916007,3758096384,1202194922,1046472017],
  [1067946162,0,-1070399488,0,1161096103,1327973973],
  [1076204391,3221225472,1075405097,3221225472,1095454701,4214066854],
  [1067894036,3221225472,-1070435952,1342177280,1159491001,3285648465],
  [1076045148,0,1076936928,2147483648,1129855851,1921780079]
];
const Sig = require(path.join(R, 'web/significado.js'));
const fsrc = ': f ff>f a b Pw a b\n: g ff>f a b At a b\n: fh ff>i a b Bh Pw a b\n: fl ff>i a b Bl Pw a b\n: gh ff>i a b Bh At a b\n: gl ff>i a b Bl At a b\n';
const pw = Sig.funcao(fsrc, 'f'), at = Sig.funcao(fsrc, 'g');
const val = (h, l) => { dv.setInt32(0, h); dv.setUint32(4, l); return dv.getFloat64(0); };
test('significado: o Pw e o pow do fdlibm (ancoras do Java)', () => {
  for (const [h1, l1, h2, l2, rh, rl] of ANCORAS) {
    const r = pw(val(h1, l1), val(h2, l2));
    assert.strictEqual(hi(r) + ' ' + lo(r), rh + ' ' + rl);
  }
});
const pares = [];
for (const a of [0, -0, 1, -1, 0.5, -2, 3, 1e-310, 1e300, Infinity, -Infinity, NaN, 1.0000001]) for (const b of [0, -0, 1, -1, 0.5, 2, -3, 1023, -1075, Infinity, -Infinity, NaN, 1e9])
  pares.push([a, b]);
for (let i = 0; i < 3000; i++) pares.push([(rnd() < 0.3 ? -1 : 1) * rnd() * Math.pow(2, Math.floor(rnd() * 20) - 10), rnd() < 0.2 ? Math.floor(rnd() * 40) - 20 : (rnd() - 0.5) * 40]);
const ent2 = pares.length + '\n' + pares.map(([a, b]) => [hi(a), lo(a), hi(b), lo(b)].join(' ')).join('\n') + '\n';
const nb = v => Number.isNaN(v) ? 'nan' : hi(v) + ' ' + lo(v);
const esp2 = pares.map(([a, b]) => nb(pw(a, b)) + ' ' + nb(at(a, b)));
const b2 = fs.readFileSync(path.join(R, 'test/m/bits2.onda'));
const norm2 = s => s.trim().split('\n').map(l => { const p = l.split(' '); const o = []; for (let j = 0; j < 4; j += 2) { const h = +p[j], q = +p[j + 1]; o.push(((h & 0x7ff00000) === 0x7ff00000 && ((h & 0xfffff) || q)) ? 'nan' : h + ' ' + q); } return o.join(' '); });
function confere2(nome, saida) {
  const a = norm2(saida);
  let dif = 0;
  for (let i = 0; i < esp2.length; i++) if (a[i] !== esp2[i]) dif++;
  assert.strictEqual(dif, 0, nome + ': ' + dif + ' valores diferentes do significado');
}
test('Pw e At: C, WebAssembly e x86 iguais ao significado', () => {
  fs.writeFileSync(path.join(t, 'c.c'), execFileSync(ondac, { input: b2 }));
  execFileSync('cc', ['-O2', '-fwrapv', '-w', path.join(t, 'c.c'), '-o', path.join(t, 'c'), '-lm']);
  confere2('C', execFileSync(path.join(t, 'c'), { input: ent2 }).toString());
  fs.writeFileSync(path.join(t, 'c.wasm'), execFileSync(ondac, ['-w'], { input: b2 }));
  confere2('WebAssembly', execFileSync('node', [path.join(R, 'wasm/host.js'), path.join(t, 'c.wasm')], { input: ent2 }).toString());
  if (process.platform === 'linux' && process.arch === 'x64') {
    fs.writeFileSync(path.join(t, 'cx'), execFileSync(ondac, ['-x'], { input: b2 }), { mode: 0o755 });
    confere2('x86', execFileSync(path.join(t, 'cx'), { input: ent2 }).toString());
  }
});
test('Pw e At: forma JavaScript igual ao significado', () => {
  const J = n => new Function(execFileSync(ondac, ['-j', n], { input: fsrc }).toString())();
  const fh = J('fh'), fl = J('fl'), gh = J('gh'), gl = J('gl');
  const fora = pares.map(([a, b]) => { const p = val(fh(a, b), fl(a, b)), q = val(gh(a, b), gl(a, b)); return nb(p) + ' ' + nb(q); });
  let dif = 0;
  for (let i = 0; i < esp2.length; i++) if (fora[i] !== esp2[i]) dif++;
  assert.strictEqual(dif, 0, 'forma JS: ' + dif + ' valores diferentes do significado');
});
