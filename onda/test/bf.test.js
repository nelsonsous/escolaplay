// Interpretador de Brainfuck (ex/bf.onda): a Onda corre programas nao triviais, e o resultado e o mesmo
// em C, x86-64 e WebAssembly. Prova que a linguagem e usavel para programas a serio, bit a bit igual entre formas.
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const R = path.join(__dirname, '..');
const ondac = path.join(R, 'build/ondac');
const t = fs.mkdtempSync(path.join(os.tmpdir(), 'onda-bf-'));
const src = fs.readFileSync(path.join(R, 'ex/bf.onda'));
fs.writeFileSync(path.join(t, 'bf.c'), execFileSync(ondac, [], { input: src }));
execFileSync('cc', ['-O2', '-fwrapv', '-w', path.join(t, 'bf.c'), '-o', path.join(t, 'bfc'), '-lm']);
fs.writeFileSync(path.join(t, 'bfx'), execFileSync(ondac, ['-x'], { input: src }), { mode: 0o755 });
fs.writeFileSync(path.join(t, 'bf.wasm'), execFileSync(ondac, ['-w'], { input: src }));
const C = bf => execFileSync(path.join(t, 'bfc'), [], { input: bf }).toString();
const X = bf => execFileSync(path.join(t, 'bfx'), [], { input: bf }).toString();
const W = bf => execFileSync('node', [path.join(R, 'wasm/host.js'), path.join(t, 'bf.wasm')], { input: bf }).toString();

const HELLO = '++++++++[>++++[>++>+++>+++>+<<<<-]>+>+>->>+[<]<-]>>.>---.+++++++..+++.>>.<-.<.+++.------.--------.>>+.>++.';
// multiplica 6*7 com celulas e imprime o resultado como byte (42 = '*')
const MUL = '++++++[>+++++++<-]>.';

test('Brainfuck: "Hello World!" igual em C, x86 e WebAssembly', () => {
  assert.strictEqual(C(HELLO), 'Hello World!\n');
  assert.strictEqual(X(HELLO), 'Hello World!\n');
  assert.strictEqual(W(HELLO), 'Hello World!\n');
});

test('Brainfuck: um laco de multiplicacao (6*7) da o byte 42 nas tres formas', () => {
  for (const f of [C, X, W]) assert.strictEqual(f(MUL).charCodeAt(0), 42, 'esperava 42');
});
