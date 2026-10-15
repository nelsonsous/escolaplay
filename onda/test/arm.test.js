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
