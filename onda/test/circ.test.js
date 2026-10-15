// Circuitos (onda -c f): cada funcao de test/c/portas.onda vira um AIG em AIGER; o teste simula o circuito
// (bit-paralelo: cada fio e um BigInt com um bit por vetor de teste) e compara com a funcao compilada em C.
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const R = path.join(__dirname, '..');
const ondac = path.join(R, 'build/ondac');
const t = fs.mkdtempSync(path.join(os.tmpdir(), 'onda-circ-'));
const N = 256;
let seed = 99n;
const rnd64 = () => { seed = (seed * 6364136223846793005n + 1442695040888963407n) & ((1n << 64n) - 1n); return seed; };
const sgn = v => (v >= 1n << 63n ? v - (1n << 64n) : v);
// AIGER ascii -> simulacao de N vetores ao mesmo tempo
function simula(aag, entradas) {
  const L = aag.split('\n');
  const [, M, I, , O, A] = L[0].split(' ').map(Number);
  const val = new Array(M + 1).fill(0n);
  const tudo = (1n << BigInt(N)) - 1n;
  const lit = l => (l & 1 ? tudo ^ val[l >> 1] : val[l >> 1]);
  for (let i = 0; i < I; i++) val[i + 1] = entradas[i];
  const outs = L.slice(1 + I, 1 + I + O).map(Number);
  for (let a = 0; a < A; a++) { const [x, y, z] = L[1 + I + O + a].split(' ').map(Number); val[x >> 1] = lit(y) & lit(z); }
  return outs.map(lit);
}
for (const fich of ['portas.onda', 'rapido.onda']) {
const src = fs.readFileSync(path.join(R, 'test/c', fich), 'utf8');
const funcs = [...src.matchAll(/^: ([a-z0-9]+) (i+)>i/gm)].map(m => [m[1], m[2].length]);
for (const [f, np] of funcs) {
  test(fich + ': circuito ' + f + ' = funcao compilada (' + N + ' vetores)', () => {
    const aag = execFileSync(ondac, ['-c', f], { input: src, maxBuffer: 1 << 28 }).toString();
    assert.match(aag, /^aag /);
    const vs = [];
    for (let k = 0; k < N; k++) { const v = []; for (let j = 0; j < np; j++) v.push(k < 8 ? [0n, 1n, (1n << 64n) - 1n, 1n << 63n, 63n, 64n, 2n, 3n][(k + j) % 8] : rnd64()); vs.push(v); }
    // entradas do circuito: fio i do parametro j, um bit por vetor
    const ent = [];
    for (let j = 0; j < np; j++) for (let i = 0n; i < 64n; i++) { let w = 0n; for (let k = 0; k < N; k++) w |= ((vs[k][j] >> i) & 1n) << BigInt(k); ent.push(w); }
    const out = simula(aag, ent);
    const got = [];
    for (let k = 0; k < N; k++) { let r = 0n; for (let i = 0; i < 64; i++) r |= ((out[i] >> BigInt(k)) & 1n) << BigInt(i); got.push(sgn(r)); }
    // referencia: a mesma funcao compilada em C
    const drv = src + '\n: rn >i { = c R = s 1 W || == c 32 == c 10 = c R ? == c 45 { = s -1 = c R } 0 = v 0 W && >= c 48 <= c 57 { = v + * v 10 - c 48 = c R } * s v }\n' +
      ': main >i { = n rn = k 0 W < k n { N ' + f + ' ' + Array(np).fill('rn').join(' ') + ' "\\n" = k + k 1 } 0 }\n';
    const nm = fich.replace('.onda', '') + '_' + f;
    fs.writeFileSync(path.join(t, nm + '.c'), execFileSync(ondac, { input: drv }));
    execFileSync('cc', ['-O2', '-fwrapv', '-w', path.join(t, nm + '.c'), '-o', path.join(t, nm), '-lm']);
    const ref = execFileSync(path.join(t, nm), { input: N + '\n' + vs.map(v => v.map(x => sgn(x).toString()).join(' ')).join('\n') + '\n' }).toString().trim().split('\n').map(BigInt);
    let dif = 0;
    for (let k = 0; k < N; k++) if (got[k] !== ref[k]) dif++;
    assert.strictEqual(dif, 0, f + ': ' + dif + ' vetores diferentes');
  });
}
}

// o mesmo circuito em Verilog estrutural (onda -v f): avaliado aqui e comparado com o AIGER
function simulaVerilog(v, np, entradas) {
  const tudo = (1n << BigInt(N)) - 1n;
  const w = new Map(); w.set(0, 0n);
  const ent = new Map();
  [...v.matchAll(/input \[63:0\] (i_[a-z0-9_]+)/g)].forEach((m, j) => ent.set(m[1], j));
  const ref = s => { const m = s.trim().match(/^(~?)w\[(\d+)\]$/); const x = w.get(+m[2]); return m[1] ? tudo ^ x : x; };
  const out = new Array(64).fill(0n);
  for (const l of v.split('\n')) {
    let m = l.match(/assign w\[(\d+)\] = (i_[a-z0-9_]+)\[(\d+)\];/);
    if (m) { w.set(+m[1], entradas[ent.get(m[2]) * 64 + +m[3]]); continue; }
    m = l.match(/assign w\[(\d+)\] = (.+) & (.+);/);
    if (m) { w.set(+m[1], ref(m[2]) & ref(m[3])); continue; }
    m = l.match(/assign o\[(\d+)\] = (.+);/);
    if (m) out[+m[1]] = ref(m[2]);
  }
  return out;
}
test('Verilog (-v) igual ao AIGER (-c) em maj, soma, mul e dv', () => {
  const src = fs.readFileSync(path.join(R, 'test/c/portas.onda'), 'utf8');
  for (const [f, np] of [['maj', 3], ['soma', 2], ['mul', 2], ['dv', 2]]) {
    const ent = []; for (let i = 0; i < np * 64; i++) ent.push(rnd64() | (rnd64() << 64n) | (rnd64() << 128n) | (rnd64() << 192n));
    const a = simula(execFileSync(ondac, ['-c', f], { input: src, maxBuffer: 1 << 28 }).toString(), ent);
    const v = execFileSync(ondac, ['-v', f], { input: src, maxBuffer: 1 << 28 }).toString();
    assert.match(v, new RegExp('^// gerado pela Onda[^\\n]*\\nmodule ' + f + '\\('));
    const b = simulaVerilog(v, np, ent);
    for (let i = 0; i < 64; i++) assert.strictEqual(b[i], a[i], f + ': saida ' + i);
  }
});
