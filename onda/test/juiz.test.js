// O juiz unico como ferramenta (tools/juiz.mjs): compila um programa por todas as formas (C, x86, WASM, ARM64)
// e verifica que concordam, ao bit. Aqui, um smoke test: num programa determinista (SHA-256) o veredito tem de
// ser "todas concordam" (sai com codigo 0; uma divergencia faria o juiz sair com 1 e este execFileSync lancar).
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const R = path.join(__dirname, '..');

test('juiz: todas as formas concordam num programa determinista (SHA-256)', () => {
  const out = execFileSync('node', [path.join(R, 'tools', 'juiz.mjs'), path.join(R, 'ex', 'sha256.onda')]).toString();
  assert.match(out, /todas as formas que correram concordam/);
  assert.match(out, /x86-64 nativo \(-x\)\s+concorda/);
  assert.match(out, /WebAssembly \(-w\)\s+concorda/);
});
