// SHA-256 escrito em Onda (ex/sha256.onda): confere vetores conhecidos e exige o mesmo resumo em C, x86 e WebAssembly.
// Exercita todos os operadores de bits (& | ^ << >>), que tem de dar os mesmos 32 bits em todas as formas.
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const R = path.join(__dirname, '..');
const ondac = path.join(R, 'build/ondac');
const t = fs.mkdtempSync(path.join(os.tmpdir(), 'onda-sha-'));
const src = fs.readFileSync(path.join(R, 'ex/sha256.onda'));
fs.writeFileSync(path.join(t, 's.c'), execFileSync(ondac, [], { input: src }));
execFileSync('cc', ['-O2', '-fwrapv', '-w', path.join(t, 's.c'), '-o', path.join(t, 'sc'), '-lm']);
fs.writeFileSync(path.join(t, 'sx'), execFileSync(ondac, ['-x'], { input: src }), { mode: 0o755 });
fs.writeFileSync(path.join(t, 's.wasm'), execFileSync(ondac, ['-w'], { input: src }));
const C = m => execFileSync(path.join(t, 'sc'), [], { input: m }).toString().trim();
const X = m => execFileSync(path.join(t, 'sx'), [], { input: m }).toString().trim();
const W = m => execFileSync('node', [path.join(R, 'wasm/host.js'), path.join(t, 's.wasm')], { input: m }).toString().trim();
const ref = m => crypto.createHash('sha256').update(m).digest('hex');

const casos = [
  Buffer.from(''),
  Buffer.from('abc'),
  Buffer.from('a'.repeat(55)),   // limite de um bloco
  Buffer.from('a'.repeat(56)),   // forca um segundo bloco so para o preenchimento
  Buffer.from('a'.repeat(100)),  // dois blocos
  Buffer.from('The quick brown fox jumps over the lazy dog'),
];

test('SHA-256: vetores conhecidos (forma C)', () => {
  for (const m of casos) assert.strictEqual(C(m), ref(m), JSON.stringify(m.toString().slice(0, 20)));
});

test('SHA-256: C, x86 e WebAssembly dao o mesmo resumo (bits identicos)', () => {
  for (const m of casos) {
    const r = ref(m);
    assert.strictEqual(X(m), r, 'x86: ' + m.length);
    assert.strictEqual(W(m), r, 'wasm: ' + m.length);
  }
});
