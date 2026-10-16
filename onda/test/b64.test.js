// Base64 (ex/b64.onda): codifica/descodifica. Confere vetores da RFC 4648, round-trip de dados binarios (todos
// os 256 bytes) e exige o mesmo resultado em C, x86 e WebAssembly.
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const R = path.join(__dirname, '..');
const ondac = path.join(R, 'build/ondac');
const t = fs.mkdtempSync(path.join(os.tmpdir(), 'onda-b64-'));
const src = fs.readFileSync(path.join(R, 'ex/b64.onda'));
fs.writeFileSync(path.join(t, 'b.c'), execFileSync(ondac, [], { input: src }));
execFileSync('cc', ['-O2', '-fwrapv', '-w', path.join(t, 'b.c'), '-o', path.join(t, 'bc'), '-lm']);
fs.writeFileSync(path.join(t, 'bx'), execFileSync(ondac, ['-x'], { input: src }), { mode: 0o755 });
fs.writeFileSync(path.join(t, 'b.wasm'), execFileSync(ondac, ['-w'], { input: src }));
const bin = { C: [path.join(t, 'bc')], x86: [path.join(t, 'bx')], wasm: ['node', path.join(R, 'wasm/host.js'), path.join(t, 'b.wasm')] };
const run = (form, arg, inp) => execFileSync(bin[form][0], [...bin[form].slice(1), arg], { input: inp });
const enc = (form, b) => run(form, 'e', b).toString().trim();

test('base64: vetores da RFC 4648 (forma C)', () => {
  for (const [m, e] of [['', ''], ['f', 'Zg=='], ['fo', 'Zm8='], ['foo', 'Zm9v'], ['foob', 'Zm9vYg=='], ['fooba', 'Zm9vYmE='], ['foobar', 'Zm9vYmFy']])
    assert.strictEqual(enc('C', Buffer.from(m)), e, JSON.stringify(m));
});

test('base64: round-trip de todos os 256 valores de byte', () => {
  const todos = Buffer.from(Array.from({ length: 256 }, (_, i) => i));
  const e = run('C', 'e', todos);
  const d = run('C', 'd', e);
  assert.ok(d.equals(todos), 'round-trip falhou');
});

test('base64: C, x86 e WebAssembly codificam igual', () => {
  for (const m of ['Onda', 'a mesma maquina', Buffer.from([0, 255, 128, 1, 2, 3]).toString('binary')]) {
    const b = Buffer.from(m, 'binary'), c = enc('C', b);
    assert.strictEqual(enc('x86', b), c, 'x86');
    assert.strictEqual(enc('wasm', b), c, 'wasm');
  }
});
