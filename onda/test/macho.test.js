// Mach-O nativo do Mac (-m): o MESMO codigo-maquina aarch64 do -a, mas num executavel Mach-O que corre direto
// no Apple Silicon (sem Docker). Nao se consegue CORRER aqui (nao ha macOS), por isso o teste valida a ESTRUTURA:
// magico MH_MAGIC_64, cputype ARM64, filetype EXECUTE, e que o corpo NEON (fmul.2d) la esta. A execucao e o
// benchmark sao no Mac do utilizador (codesign -s - prog; ./prog).
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const R = require('path').join(__dirname, '..');
const ondac = require('path').join(R, 'build/ondac');
const macho = src => execFileSync(ondac, ['-m'], { input: Buffer.from(src) });

test('macho: -m produz um executavel Mach-O arm64 valido', () => {
  const b = macho(': main >i { = a 1071 = b 462 W b { = r % a b = a b = b r } a }\n');
  assert.strictEqual(b.readUInt32LE(0), 0xFEEDFACF, 'MH_MAGIC_64');
  assert.strictEqual(b.readUInt32LE(4), 0x0100000C, 'CPU_TYPE_ARM64');
  assert.strictEqual(b.readUInt32LE(12), 2, 'MH_EXECUTE');
  assert.strictEqual(b.readUInt32LE(16), 3, '3 load commands (PAGEZERO, TEXT, UNIXTHREAD)');
});

test('macho: o mapa vetorizado leva NEON (.2d) no Mach-O, como no ELF', () => {
  const src = ': g ii>f i a { = x @f + a i + 0.1 * x + 0.2 * x 0.3 }\n' +
              ': main >i { = n 64 = a A n = i 0 W < i n { !f + a i F + % i 7 1 = i + i 1 } = b A n E b n g a I @f + b 0 }\n';
  const b = macho(src);
  assert.strictEqual(b.readUInt32LE(0), 0xFEEDFACF);
  // fmul v?.2d (6E??DC??) ou fadd v?.2d (4E??D4??) nos bytes do codigo -- o nucleo NEON do mapa
  let neon = 0;
  for (let i = 0; i + 4 <= b.length; i += 4) { const w = b.readUInt32LE(i); if ((w & 0xFFE0FC00) === 0x6E60DC00 || (w & 0xFFE0FC00) === 0x4E60D400) neon++; }
  assert.ok(neon >= 3, 'tem instrucoes NEON .2d no Mach-O (encontrou ' + neon + ')');
});
