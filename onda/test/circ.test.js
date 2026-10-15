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
    m = l.match(/assign w\[(\d+)\] = (.+) ([&^]) (.+);/);
    if (m) { w.set(+m[1], m[3] === '&' ? ref(m[2]) & ref(m[4]) : ref(m[2]) ^ ref(m[4])); continue; }
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

// oraculo quantico (onda -q f) em OpenQASM 3: so X, CNOT e Toffoli, por isso e uma permutacao dos estados de base
// e simula-se classicamente, exato. Prova: y = y0 xor f(x), auxiliares voltam a 0, entradas intactas.
function simulaQasm(q, regs) {
  const tudo = (1n << BigInt(N)) - 1n;
  const v = new Map();
  const g = s => { const m = s.trim().match(/^([a-z_][a-z0-9_]*)\[(\d+)\]$/); return m[1] + '#' + m[2]; };
  for (const [nome, vals] of Object.entries(regs)) vals.forEach((w, i) => v.set(nome + '#' + i, w));
  const get = k => v.get(k) || 0n;
  let toff = 0;
  for (const l of q.split('\n')) {
    let m = l.match(/^x (.+);$/); if (m) { const k = g(m[1]); v.set(k, get(k) ^ tudo); continue; }
    m = l.match(/^cx (.+), (.+);$/); if (m) { const a = g(m[1]), b = g(m[2]); v.set(b, get(b) ^ get(a)); continue; }
    m = l.match(/^ccx (.+), (.+), (.+);$/); if (m) { const a = g(m[1]), b = g(m[2]), c = g(m[3]); v.set(c, get(c) ^ (get(a) & get(b))); toff++; continue; }
  }
  return { v, toff };
}
test('oraculo quantico (-q): y = y0 xor f(x), auxiliares a 0, entradas intactas (maj, soma, dif, dv)', () => {
  const src = fs.readFileSync(path.join(R, 'test/c/portas.onda'), 'utf8');
  for (const [f, nomes] of [['maj', ['a', 'b', 'c']], ['soma', ['a', 'b']], ['dif', ['a', 'b']], ['dv', ['a', 'b']]]) {
    const q = execFileSync(ondac, ['-q', f], { input: src, maxBuffer: 1 << 28 }).toString();
    assert.match(q, /^OPENQASM 3\.0;/);
    const regs = {}, ent = [];
    for (const nm of nomes) { regs[nm] = []; for (let i = 0; i < 64; i++) { const w = rnd64() | (rnd64() << 64n) | (rnd64() << 128n) | (rnd64() << 192n); regs[nm].push(w); ent.push(w); } }
    regs.y = []; for (let i = 0; i < 64; i++) regs.y.push(rnd64() | (rnd64() << 64n) | (rnd64() << 128n) | (rnd64() << 192n));
    const fx = simula(execFileSync(ondac, ['-c', f], { input: src, maxBuffer: 1 << 28 }).toString(), ent);
    const { v } = simulaQasm(q, regs);
    for (let i = 0; i < 64; i++) assert.strictEqual(v.get('y#' + i), regs.y[i] ^ fx[i], f + ': y[' + i + ']');
    for (const nm of nomes) for (let i = 0; i < 64; i++) assert.strictEqual(v.get(nm + '#' + i), regs[nm][i], f + ': entrada ' + nm + '[' + i + '] mudou');
    for (const [k, w] of v) if (k.startsWith('t#')) assert.strictEqual(w, 0n, f + ': auxiliar ' + k + ' ficou sujo');
  }
});

// o programa de Grover de ex/oraculo.onda (: gro >i 1): estrutura e oraculo verificados nas 2^20 entradas de uma vez
test('Grover (-q com : gro): 804 iteracoes, difusao, e o oraculo marca so x = 777777 em todas as 2^20 entradas', () => {
  const src = fs.readFileSync(path.join(R, 'ex/oraculo.onda'), 'utf8');
  const q = execFileSync(ondac, ['-q', 'alvo'], { input: src, maxBuffer: 1 << 28 }).toString();
  assert.match(q, /for uint i in \[0:803\] \{/);
  assert.match(q, /ctrl\(19\) @ z x\[0\], x\[1\],[^;]*x\[19\];/);
  assert.match(q, /r_x = measure x;/);
  const corpo = q.slice(q.indexOf('// calcular'), q.indexOf('// difusao'));
  const T = 1 << 20, tudo = (1n << BigInt(T)) - 1n;
  const v = new Map();
  for (let i = 0; i < 20; i++) {           // x[i] nas 2^20 colunas: bit j de x[i] = bit i de j
    let w = ((1n << (1n << BigInt(i))) - 1n) << (1n << BigInt(i)), len = 1 << (i + 1);
    while (len < T) { w |= w << BigInt(len); len *= 2; }
    v.set('x#' + i, w);
  }
  const g = s => { const m = s.trim().match(/^([a-z_][a-z0-9_]*)\[(\d+)\]$/); return m[1] + '#' + m[2]; };
  const get = k => v.get(k) || 0n;
  for (const l of corpo.split('\n')) {
    let m = l.match(/^x (.+);$/); if (m) { const k = g(m[1]); v.set(k, get(k) ^ tudo); continue; }
    m = l.match(/^cx (.+), (.+);$/); if (m) { const a = g(m[1]), b = g(m[2]); v.set(b, get(b) ^ get(a)); continue; }
    m = l.match(/^ccx (.+), (.+), (.+);$/); if (m) { const a = g(m[1]), b = g(m[2]), c = g(m[3]); v.set(c, get(c) ^ (get(a) & get(b))); }
  }
  assert.strictEqual(get('y#0'), 1n << 777777n, 'o oraculo tem de marcar exatamente x = 777777');
  for (const [k, w] of v) if (k.startsWith('t#')) assert.strictEqual(w, 0n, 'auxiliar ' + k + ' ficou sujo');
});

// o ciclo quantico fechado na propria Onda: predicado -> programa de Grover (-q) -> simulador de vetor de estado
// escrito em Onda (ex/qasm.onda, compilado para x86-64) -> mede o alvo com a probabilidade exata de Grover
test('simulador Onda (ex/qasm.onda em x86-64) corre o Grover de 8 bits: alvo com p = sin^2(25 asin(1/16)), auxiliares limpos', () => {
  const q = execFileSync(ondac, ['-q', 'alvo'], { input: ': bit >i 8\n: gro >i 1\n: alvo i>i x == x 177\n' }).toString();
  const sim = path.join(t, 'qasm');
  fs.writeFileSync(sim, execFileSync(ondac, ['-x'], { input: fs.readFileSync(path.join(R, 'ex/qasm.onda')) }), { mode: 0o755 });
  const out = execFileSync(sim, [], { input: q }).toString();
  assert.match(out, /^simulado: 16 qubits/m);
  assert.match(out, / t 0 y 0\.5/, 'auxiliares sujos ou y fora de |->');
  const m = out.match(/^  (\d+)  p=(\S+)$/m);
  assert.strictEqual(+m[1], 177);
  assert.ok(Math.abs(+m[2] - Math.sin(25 * Math.asin(1 / 16)) ** 2) < 1e-12, out);
});

// fim provado: o predicado "vivo" de um ciclo e simulado em todas as combinacoes das suas entradas (ate 16 bits);
// quando da 0 em todas, o ciclo acabou de facto. O limite declarado deixa de mudar o circuito.
test('ciclos: com : lim >i 1000 o circuito e o mesmo que com 24 (o fim e provado, nao truncado)', () => {
  const src = fs.readFileSync(path.join(R, 'test/c/portas.onda'), 'utf8');
  assert.match(src, /: lim >i 24/);
  for (const f of ['mdc', 'col']) {
    const a = execFileSync(ondac, ['-c', f], { input: src, maxBuffer: 1 << 28 }).toString();
    const b = execFileSync(ondac, ['-c', f], { input: src.replace(': lim >i 24', ': lim >i 1000'), maxBuffer: 1 << 28 }).toString();
    assert.strictEqual(b, a, f + ': o limite mudou o circuito');
    assert.doesNotMatch(a, /truncado/, f + ': ciclo truncado');
  }
});
