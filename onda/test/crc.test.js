// CRC-32 (ex/crc.onda): constroi a tabela e processa o stdin. Confere valores conhecidos e contra o zlib do Node,
// e exige o mesmo CRC em C, x86 e WebAssembly (inteiro -> bit a bit igual).
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const zlib = require('node:zlib');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const R = path.join(__dirname, '..');
const ondac = path.join(R, 'build/ondac');
const t = fs.mkdtempSync(path.join(os.tmpdir(), 'onda-crc-'));
const src = fs.readFileSync(path.join(R, 'ex/crc.onda'));
fs.writeFileSync(path.join(t, 'c.c'), execFileSync(ondac, [], { input: src }));
execFileSync('cc', ['-O2', '-fwrapv', '-w', path.join(t, 'c.c'), '-o', path.join(t, 'cc'), '-lm']);
fs.writeFileSync(path.join(t, 'cx'), execFileSync(ondac, ['-x'], { input: src }), { mode: 0o755 });
fs.writeFileSync(path.join(t, 'c.wasm'), execFileSync(ondac, ['-w'], { input: src }));
const bin = { C: [path.join(t, 'cc')], x86: [path.join(t, 'cx')], wasm: ['node', path.join(R, 'wasm/host.js'), path.join(t, 'c.wasm')] };
const crc = (form, b) => execFileSync(bin[form][0], bin[form].slice(1), { input: b }).toString().trim();
const ref = b => (zlib.crc32 ? zlib.crc32(b) >>> 0 : parseInt(crc('C', b), 16)).toString(16).padStart(8, '0');

test('crc32: valores conhecidos (forma C)', () => {
  assert.strictEqual(crc('C', Buffer.from('123456789')), 'cbf43926');
  assert.strictEqual(crc('C', Buffer.from('')), '00000000');
  assert.strictEqual(crc('C', Buffer.from('The quick brown fox jumps over the lazy dog')), '414fa339');
});

test('crc32: C, x86 e WebAssembly dao o mesmo CRC', () => {
  for (const m of ['Onda', 'a mesma maquina', Buffer.from(Array.from({ length: 300 }, (_, i) => i % 256)).toString('binary')]) {
    const b = Buffer.from(m, 'binary'), c = crc('C', b);
    assert.strictEqual(crc('x86', b), c, 'x86');
    assert.strictEqual(crc('wasm', b), c, 'wasm');
    if (zlib.crc32) assert.strictEqual(c, ref(b), 'zlib ' + m.slice(0, 10));
  }
});
