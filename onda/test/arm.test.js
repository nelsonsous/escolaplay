// Armazem persistente (K n): o mesmo programa em C, x86-64 e WebAssembly partilha o mesmo ficheiro (ONDA_ARM).
// Sem ONDA_ARM o armazem e memoria volatil; com ele sobrevive entre execucoes e entre formas, bit a bit.
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const R = path.join(__dirname, '..');
const ondac = path.join(R, 'build/ondac');
const t = fs.mkdtempSync(path.join(os.tmpdir(), 'onda-arm-'));
const src = fs.readFileSync(path.join(R, 'ex/arm.onda'));
fs.writeFileSync(path.join(t, 'a.c'), execFileSync(ondac, [], { input: src }));
execFileSync('cc', ['-O2', '-fwrapv', '-w', path.join(t, 'a.c'), '-o', path.join(t, 'ac'), '-lm']);
fs.writeFileSync(path.join(t, 'ax'), execFileSync(ondac, ['-x'], { input: src }), { mode: 0o755 });
fs.writeFileSync(path.join(t, 'a.wasm'), execFileSync(ondac, ['-w'], { input: src }));
const formas = {
  C: (args, env) => execFileSync(path.join(t, 'ac'), args, { env }).toString(),
  x86: (args, env) => execFileSync(path.join(t, 'ax'), args, { env }).toString(),
  wasm: (args, env) => execFileSync('node', [path.join(R, 'wasm/host.js'), path.join(t, 'a.wasm'), ...args], { env }).toString(),
};
const env = f => ({ ...process.env, ONDA_ARM: f });
const semArm = () => { const e = { ...process.env }; delete e.ONDA_ARM; return e; };
const chaves = s => Number(s.match(/o armazem tem (\d+) chaves/)[1]);

test('sem ONDA_ARM o armazem e volatil (cada execucao comeca vazia)', () => {
  for (const [nome, f] of Object.entries(formas)) {
    assert.strictEqual(chaves(f(['poe', '1000'], semArm())), 1000, nome);
    assert.strictEqual(chaves(f(['conta'], semArm())), 0, nome);
  }
});

test('o mesmo ficheiro passa entre C, x86 e WebAssembly e sobrevive entre execucoes', () => {
  const f = path.join(t, 'kv.arm');
  assert.match(formas.x86(['poe', '5000'], env(f)), /poe: 5000 chaves/);
  assert.match(formas.C(['le', '5000'], env(f)), /le: 5000 de 5000 certas/);
  assert.match(formas.wasm(['poe', '7000'], env(f)), /o armazem tem 7000 chaves/);
  assert.match(formas.x86(['le', '7000'], env(f)), /le: 7000 de 7000 certas/);
  assert.match(formas.C(['poe', '9000'], env(f)), /o armazem tem 9000 chaves/);
  assert.match(formas.wasm(['le', '9000'], env(f)), /le: 9000 de 9000 certas/);
});

test('as tres formas escrevem ficheiros iguais bit a bit para as mesmas operacoes', () => {
  const fx = {};
  for (const [nome, f] of Object.entries(formas)) {
    const p = path.join(t, nome + '.arm');
    f(['poe', '3000'], env(p));
    f(['poe', '4000'], env(p));
    fx[nome] = fs.readFileSync(p);
  }
  assert.ok(fx.C.equals(fx.x86), 'C e x86 diferem');
  assert.ok(fx.C.equals(fx.wasm), 'C e WebAssembly diferem');
});

// quedas: o ficheiro so muda pelo diario (ficheiro.j). ONDA_ARM_FALHA (so no C) simula uma queda num ponto exato.
const conta = (f) => Number(fs.readFileSync(f).readBigInt64LE(16));
const cai = (args, f, ponto) => assert.throws(() => execFileSync(path.join(t, 'ac'), args, { env: { ...env(f), ONDA_ARM_FALHA: ponto } }), e => e.status === 9);

test('queda depois do diario (C): o ficheiro ainda nao mudou, e o x86 reaplica o diario ao abrir', () => {
  const f = path.join(t, 'q1.arm');
  formas.C(['poe', '1000'], env(f));
  cai(['poe', '3000'], f, '1');
  assert.ok(fs.existsSync(f + '.j'), 'o diario devia ficar');
  assert.strictEqual(conta(f), 1000, 'o ficheiro mudou antes do diario estar aplicado');
  assert.match(formas.x86(['le', '3000'], env(f)), /le: 3000 de 3000 certas/);
  assert.ok(!fs.existsSync(f + '.j'));
});

test('queda a meio do diario (C): o WebAssembly deita-o fora e fica o estado anterior', () => {
  const f = path.join(t, 'q2.arm');
  formas.C(['poe', '1000'], env(f));
  cai(['poe', '3000'], f, '2');
  assert.ok(fs.existsSync(f + '.j'));
  assert.match(formas.wasm(['le', '1000'], env(f)), /le: 1000 de 1000 certas.*tem 1000 chaves/);
  assert.ok(!fs.existsSync(f + '.j'));
});

test('kill -9 a meio: o armazem fica sempre no ultimo Kc, com duas paginas coerentes (x86 e C)', () => {
  // dois contadores em paginas diferentes, confirmados juntos a cada milhao; uma escrita a meio deixava-os diferentes
  const p = ': main >i {\n  = k K 2048\n  ? == Ac 1\n    { "valores " N @ k " " N @ + k 600 "\\n" 0 }\n' +
    '    { W 1 { ! k + @ k 1 ! + k 600 + @ + k 600 1 ? == % @ k 1000000 0 Kc 0 } 0 } }\n';
  fs.writeFileSync(path.join(t, 'k.c'), execFileSync(ondac, [], { input: p }));
  execFileSync('cc', ['-O2', '-fwrapv', '-w', path.join(t, 'k.c'), '-o', path.join(t, 'kc'), '-lm']);
  fs.writeFileSync(path.join(t, 'kx'), execFileSync(ondac, ['-x'], { input: p }), { mode: 0o755 });
  for (const b of ['kx', 'kc']) {
    const f = path.join(t, 'k' + b + '.arm');
    let antes = 0;
    for (let volta = 0; volta < 3; volta++) {
      assert.throws(() => execFileSync(path.join(t, b), ['corre'], { env: env(f), timeout: 250, killSignal: 'SIGKILL' }));
      const [, a, c] = execFileSync(path.join(t, b), [], { env: env(f) }).toString().match(/valores (\d+) (\d+)/).map(Number);
      assert.strictEqual(a, c, b + ': paginas incoerentes depois da queda');
      assert.strictEqual(a % 1000000, 0, b + ': escrita por confirmar chegou ao ficheiro');
      assert.ok(a > antes, b + ': nada foi confirmado');
      antes = a;
    }
  }
});
