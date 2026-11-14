// A ordem das definições não importa: uma função pode chamar outra definida mais abaixo, e duas podem chamar-se uma
// à outra. Um local ou um parâmetro com o nome de uma função tapa-a dentro dessa função (o resto do programa continua
// a ver a função). Igual em WebAssembly e em x86-64. Está escrito no SPEC.md («Programa»).
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const R = path.join(__dirname, '..');
const ondac = path.join(R, 'build/ondac');
const t = fs.mkdtempSync(path.join(os.tmpdir(), 'onda-ordem-'));

test('ordem das definições e nomes tapados: iguais em -w e -x', () => {
  const src = `
: main >i { N par 10 N par 7 P 32 N dobro 4 P 32 N tapa 5 P 32 N tapap 9 P 32 N depois 3 P 10 0 }
: par i>i n ? == n 0 1 impar - n 1
: impar i>i n ? == n 0 0 par - n 1
# o local dobro tapa a função dobro (definida mais abaixo) só aqui dentro
: tapa i>i x { = dobro + x 1 * dobro 10 }
# um parâmetro também
: tapap i>i dobro + dobro 1
: dobro i>i x * x 2
# e uma função definida antes de quem lhe tapa o nome continua a ser chamada pelos outros
: depois i>i x + dobro x tapa 1
`;
  const w = execFileSync(ondac, ['-w', 'main'], { input: src });
  assert.strictEqual(w.subarray(0, 4).toString('latin1'), '\0asm', w.toString().slice(0, 500));
  fs.writeFileSync(path.join(t, 'o.wasm'), w);
  const saida = execFileSync('node', [path.join(R, 'wasm/host.js'), path.join(t, 'o.wasm')]).toString();
  assert.strictEqual(saida, '10 8 60 10 26\n');
  fs.writeFileSync(path.join(t, 'ox'), execFileSync(ondac, ['-x'], { input: src }), { mode: 0o755 });
  assert.strictEqual(execFileSync(path.join(t, 'ox')).toString(), saida, 'x86-64 igual ao WebAssembly');
});
