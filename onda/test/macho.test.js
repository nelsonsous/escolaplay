// Mach-O nativo do Mac (-m): o MESMO codigo-maquina aarch64 do -a, mas num OBJETO Mach-O (MH_OBJECT) que o clang
// linka num executavel valido do Mac (clang prog.o -o prog) -- a toolchain trata da validacao estrita/assinatura.
// Nao se consegue CORRER aqui (nao ha macOS), por isso o teste valida a ESTRUTURA: magico MH_MAGIC_64, cputype
// ARM64, filetype OBJECT, e que o corpo NEON (fmul.2d) la esta. A linkagem e a corrida sao no Mac do utilizador.
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const R = require('path').join(__dirname, '..');
const ondac = require('path').join(R, 'build/ondac');
const macho = src => execFileSync(ondac, ['-m'], { input: Buffer.from(src) });

test('macho: -m produz um objeto Mach-O arm64 valido (linkavel pelo clang)', () => {
  const b = macho(': main >i { = a 1071 = b 462 W b { = r % a b = a b = b r } a }\n');
  assert.strictEqual(b.readUInt32LE(0), 0xFEEDFACF, 'MH_MAGIC_64');
  assert.strictEqual(b.readUInt32LE(4), 0x0100000C, 'CPU_TYPE_ARM64');
  assert.strictEqual(b.readUInt32LE(12), 1, 'MH_OBJECT');
  assert.strictEqual(b.readUInt32LE(16), 3, '3 load commands (SEGMENT_64, SYMTAB, BUILD_VERSION)');
  // o simbolo _main tem de estar na tabela de strings
  assert.ok(b.includes(Buffer.from('_main\0')), 'simbolo _main presente');
});

test('macho: no Mac M1 o objeto linka e corre (gcd, strings, Av, reais)', { skip: process.platform !== 'darwin' || process.arch !== 'arm64' }, () => {
  const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
  const t = fs.mkdtempSync(path.join(os.tmpdir(), 'onda-macho-'));
  fs.writeFileSync(path.join(t, 'p.o'), macho(': main >i { = a 1071 = b 462 W b { = r % a b = a b = b r } "gcd " N a " " N Av 1 0 " " G Sq 2.0 "\\n" 0 }\n'));
  execFileSync('cc', [path.join(t, 'p.o'), '-o', path.join(t, 'p')]);
  assert.strictEqual(execFileSync(path.join(t, 'p'), ['z']).toString(), 'gcd 21 122 1.4142135623731\n');
});

test('macho: S vetorizado em NEON (-mf) da o mesmo que o -m em serie nos restos, e usa .2d', { skip: process.platform !== 'darwin' || process.arch !== 'arm64' }, () => {
  const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
  const t = fs.mkdtempSync(path.join(os.tmpdir(), 'onda-macho-s-'));
  const src = ': g ifi>f i a m { = u * a F i = v + u F m - * u v / v 3.0 }\n: el iif>f i a s * s @f + a i\n: main >i { = a A 16 = i 0 W < i 16 { !f + a i + 0.5 F * i i = i + i 1 } = k 0 W < k 11 { G S k g 0.5 k " " G S k el a 1.5 " " = k + k 1 } 0 }\n';
  const run = f => { fs.writeFileSync(path.join(t, f + '.o'), execFileSync(ondac, [f], { input: Buffer.from(src) })); execFileSync('cc', [path.join(t, f + '.o'), '-o', path.join(t, f)]); return execFileSync(path.join(t, f)).toString(); };
  assert.strictEqual(run('-mf'), run('-m'));
  const o = execFileSync(ondac, ['-mf'], { input: Buffer.from(src) });
  let n = 0; for (let i = 0; i + 4 <= o.length; i += 4) if ((o.readUInt32LE(i) & 0xFFE0FC00) >>> 0 === 0x4E60D400) n++;
  assert.ok(n >= 4, 'fadd .2d no ciclo vetorial (' + n + ')');
});

test('macho: E vetorizado (com ? e comparacoes) da os mesmos bits que o WebAssembly em todos os restos', { skip: process.platform !== 'darwin' || process.arch !== 'arm64' }, () => {
  const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
  const t = fs.mkdtempSync(path.join(os.tmpdir(), 'onda-macho-e-'));
  const src = ': st iiif>f i a w m { = v @f + a i - * 2.0 m ? == i w - 0.0 v v }\n: cl iif>f i a s ? < @f + a i s s ? >= i 5 * 2.0 @f + a i / @f + a i 3.0\n: main >i { = a A 16 = b A 16 = i 0 W < i 16 { !f + a i + 0.5 F * i i = i + i 1 } = k 0 W < k 12 { E b k st a 3 1.25 E b k cl a 7.5 = j 0 W < j k { G @f + b j " " = j + j 1 } = k + k 1 } 0 }\n';
  fs.writeFileSync(path.join(t, 'p.o'), execFileSync(ondac, ['-m'], { input: Buffer.from(src) }));
  execFileSync('cc', [path.join(t, 'p.o'), '-o', path.join(t, 'p')]);
  fs.writeFileSync(path.join(t, 'p.wasm'), execFileSync(ondac, ['-w'], { input: Buffer.from(src) }));
  const w = execFileSync('node', [path.join(__dirname, '..', 'wasm/host.js'), path.join(t, 'p.wasm')]).toString();
  assert.strictEqual(execFileSync(path.join(t, 'p')).toString(), w);
});

test('macho: o mapa vetorizado leva NEON (.2d) no Mach-O, como no ELF', () => {
  const src = ': g ii>f i a { = x @f + a i + 0.1 * x + 0.2 * x 0.3 }\n' +
              ': main >i { = n 64 = a A n = i 0 W < i n { !f + a i F + % i 7 1 = i + i 1 } = b A n E b n g a I @f + b 0 }\n';
  const b = macho(src);
  assert.strictEqual(b.readUInt32LE(0), 0xFEEDFACF);
  // o nucleo funde em fmla v?.2d (4E??CC??); conta tambem fmul/fadd .2d caso algo nao funda
  let neon = 0;
  for (let i = 0; i + 4 <= b.length; i += 4) { const m = b.readUInt32LE(i) & 0xFFE0FC00; if (m === 0x4E60CC00 || m === 0x6E60DC00 || m === 0x4E60D400) neon++; }
  assert.ok(neon >= 3, 'tem instrucoes NEON .2d no Mach-O (encontrou ' + neon + ')');
});
