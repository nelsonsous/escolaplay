// Armazem enderecado por conteudo (ex/cas.onda): une SHA-256 + armazem persistente. put guarda um blob indexado
// pelo seu hash; get recupera-o. Deduplica por conteudo, persiste, e o que o x86 guarda o WebAssembly le.
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const R = path.join(__dirname, '..');
const ondac = path.join(R, 'build/ondac');
const t = fs.mkdtempSync(path.join(os.tmpdir(), 'onda-cas-'));
const src = fs.readFileSync(path.join(R, 'ex/cas.onda'));
fs.writeFileSync(path.join(t, 'c.c'), execFileSync(ondac, [], { input: src }));
execFileSync('cc', ['-O2', '-fwrapv', '-w', path.join(t, 'c.c'), '-o', path.join(t, 'cc'), '-lm']);
fs.writeFileSync(path.join(t, 'cx'), execFileSync(ondac, ['-x'], { input: src }), { mode: 0o755 });
fs.writeFileSync(path.join(t, 'c.wasm'), execFileSync(ondac, ['-w'], { input: src }));
const bin = { C: [path.join(t, 'cc')], x86: [path.join(t, 'cx')], wasm: ['node', path.join(R, 'wasm/host.js'), path.join(t, 'c.wasm')] };
const put = (form, f, blob) => execFileSync(bin[form][0], [...bin[form].slice(1), 'put'], { input: blob, env: { ...process.env, ONDA_ARM: f } }).toString().trim();
const get = (form, f, h) => execFileSync(bin[form][0], [...bin[form].slice(1), 'get', h], { env: { ...process.env, ONDA_ARM: f } });
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const entradas = f => Number(fs.readFileSync(f).readBigInt64LE(16));

test('cas: put devolve o SHA-256 do blob e get recupera-o (varios tamanhos)', () => {
  const f = path.join(t, 'a.cas');
  for (const b of [Buffer.from('abc'), Buffer.from('hello world'), Buffer.from('x'.repeat(5000)), Buffer.alloc(200, 7)]) {
    const h = put('C', f, b);
    assert.strictEqual(h, sha(b), 'hash de ' + b.length + ' bytes');
    assert.ok(get('C', f, h).equals(b), 'get de ' + b.length + ' bytes');
  }
});

test('cas: deduplica por conteudo (o mesmo blob duas vezes = uma entrada)', () => {
  const f = path.join(t, 'd.cas');
  put('C', f, Buffer.from('conteudo repetido'));
  put('C', f, Buffer.from('conteudo repetido'));
  assert.strictEqual(entradas(f), 1);
  put('C', f, Buffer.from('outro'));
  assert.strictEqual(entradas(f), 2);
});

test('cas: o que o x86 guarda, o C e o WebAssembly recuperam do mesmo ficheiro', () => {
  const f = path.join(t, 'x.cas');
  const b = Buffer.from('escrito pelo x86, lido pelos outros');
  const h = put('x86', f, b);
  assert.strictEqual(h, sha(b));
  assert.ok(get('C', f, h).equals(b), 'C le o do x86');
  assert.ok(get('wasm', f, h).equals(b), 'WebAssembly le o do x86');
});
