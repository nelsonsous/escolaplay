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

test('macho: o mapa pelo amap (grau 7) da os mesmos bits que o WebAssembly no -m (sem FMA)', { skip: process.platform !== 'darwin' || process.arch !== 'arm64' }, () => {
  const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
  const t = fs.mkdtempSync(path.join(os.tmpdir(), 'onda-macho-a-'));
  const src = ': g ii>f i a { = x @f + a i + 0.1 * x + 0.2 * x + 0.3 * x + 0.4 * x + 0.5 * x + 0.6 * x + 0.7 * x 0.8 }\n: main >i { = n 37 = a A n = b A n = i 0 W < i n { !f + a i / F + 1 i 7.0 = i + i 1 } E b n g a = j 0 W < j n { N Bh @f + b j " " N Bl @f + b j " " = j + j 1 } 0 }\n';
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

test('macho: E, D e S inteiro em threads (funcoes puras) dao os mesmos bits que o WebAssembly; E no proprio vetor fica em serie', { skip: process.platform !== 'darwin' || process.arch !== 'arm64' }, () => {
  const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
  const t = fs.mkdtempSync(path.join(os.tmpdir(), 'onda-macho-p-'));
  const src = ': px ffff>i x y t w { = v Sn + * 0.01 * x y t I * 1000.0 + v / w 7.0 }\n' +
              ': st iiif>f i a w m { = v @f + a i - * 2.0 m ? == i w - 0.0 v v }\n' +
              ': ant iii>f i a n ? == i 0 @f + a 0 + @f + a i * 0.5 @f + a - i 1\n' +
              ': q ii>i i k * - i k + i 3\n' +
              ': main >i { = n 50000 = a A n = b A n = i 0 W < i n { !f + a i / F % * i 7919 1009 1009.0 = i + i 1 }\n' +
              '  E b n st a 4242 0.25 E a n ant a n = s 0.0 = i 0 W < i n { = s + s + @f + a i @f + b i = i + i 1 }\n' +
              '  G s " " N S 100000 q 17 "\\n" D 300 200 px 0.5 300.0 0 }\n';
  const o = execFileSync(ondac, ['-m'], { input: Buffer.from(src) });
  assert.ok(o.includes(Buffer.from('_pthread_create\0')), 'chama o pthread_create');
  fs.writeFileSync(path.join(t, 'p.o'), o);
  execFileSync('cc', [path.join(t, 'p.o'), '-o', path.join(t, 'p')]);
  fs.writeFileSync(path.join(t, 'p.wasm'), execFileSync(ondac, ['-w'], { input: Buffer.from(src) }));
  const w = execFileSync('node', [path.join(__dirname, '..', 'wasm/host.js'), path.join(t, 'p.wasm')]);
  for (let k = 0; k < 3; k++) assert.ok(execFileSync(path.join(t, 'p')).equals(w), 'corrida ' + k);
});

test('macho: S real em threads com -mf reparte em blocos fixos: o mesmo resultado em todas as corridas', { skip: process.platform !== 'darwin' || process.arch !== 'arm64' }, () => {
  const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
  const t = fs.mkdtempSync(path.join(os.tmpdir(), 'onda-macho-ps-'));
  const src = ': f ii>f i n { = x / + F i 0.5 F n / 4.0 + 1.0 * x x }\n: main >i { = n 3000000 G / S n f n F n " " G / S 7 f 7 7.0 "\\n" 0 }\n';
  fs.writeFileSync(path.join(t, 'p.o'), execFileSync(ondac, ['-mf'], { input: Buffer.from(src) }));
  execFileSync('cc', [path.join(t, 'p.o'), '-o', path.join(t, 'p')]);
  const r = execFileSync(path.join(t, 'p')).toString();
  assert.match(r, /^3\.14159265358\d* 3\.14\d+\n$/);
  for (let k = 0; k < 4; k++) assert.strictEqual(execFileSync(path.join(t, 'p')).toString(), r);
});

test('macho: S dentro de uma funcao pura chamada por um E paralelo fica em serie (os slots sao um so conjunto); 300 chamadas seguidas reutilizam as threads', { skip: process.platform !== 'darwin' || process.arch !== 'arm64' }, () => {
  const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
  const t = fs.mkdtempSync(path.join(os.tmpdir(), 'onda-macho-pn-'));
  const src = ': q ii>i i k * - i k + i 3\n: h ii>f i a F S 5000 q i\n' +
              ': main >i { = n 5000 = a A n = b A n E b n h a = s 0.0 = i 0 W < i n { = s + s @f + b i = i + i 1 } G s " "\n' +
              '  = u 0 = r 0 W < r 300 { = u + u S 20000 q r = r + r 1 } N u "\\n" 0 }\n';
  const o = execFileSync(ondac, ['-m'], { input: Buffer.from(src) });
  assert.ok(o.includes(Buffer.from('___ulock_wait\0')), 'as threads dormem no sistema quando nao ha trabalho');
  fs.writeFileSync(path.join(t, 'p.o'), o);
  execFileSync('cc', [path.join(t, 'p.o'), '-o', path.join(t, 'p')]);
  fs.writeFileSync(path.join(t, 'p.wasm'), execFileSync(ondac, ['-w'], { input: Buffer.from(src) }));
  const w = execFileSync('node', [path.join(__dirname, '..', 'wasm/host.js'), path.join(t, 'p.wasm')]);
  for (let k = 0; k < 3; k++) assert.ok(execFileSync(path.join(t, 'p')).equals(w), 'corrida ' + k);
});

test('macho: S real no -m (sem -mf) calcula os termos em threads e soma pela ordem: os bits do WebAssembly; num ciclo nao gasta memoria', { skip: process.platform !== 'darwin' || process.arch !== 'arm64' }, () => {
  const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
  const t = fs.mkdtempSync(path.join(os.tmpdir(), 'onda-macho-sq-'));
  const src = ': f ii>f i k { * Sn F + i k 0.001 }\n: g ii>f i k F + i k\n' +
              ': main >i { = t 0.0 = j 0 W < j 40 { = t + t S 300000 f j = j + j 1 } = u 0.0 = j 0 W < j 500 { = u + u S 7 g j = j + j 1 }\n' +
              '  N Bh t " " N Bl t " " N Bh u " " N Bl u " " N Bl S 4300000 g 1 "\\n" 0 }\n';
  fs.writeFileSync(path.join(t, 'p.o'), execFileSync(ondac, ['-m'], { input: Buffer.from(src) }));
  execFileSync('cc', [path.join(t, 'p.o'), '-o', path.join(t, 'p')]);
  fs.writeFileSync(path.join(t, 'p.wasm'), execFileSync(ondac, ['-w'], { input: Buffer.from(src) }));
  const w = execFileSync('node', [path.join(__dirname, '..', 'wasm/host.js'), path.join(t, 'p.wasm')]);
  for (let k = 0; k < 3; k++) assert.ok(execFileSync(path.join(t, 'p')).equals(w), 'corrida ' + k);
});

test('macho: -mx escreve o executavel do Mac ja assinado (sem clang): corre, passa no codesign e da o mesmo que o -m ligado pelo clang, com e sem threads', { skip: process.platform !== 'darwin' || process.arch !== 'arm64' }, () => {
  const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
  const t = fs.mkdtempSync(path.join(os.tmpdir(), 'onda-macho-mx-'));
  const progs = [': main >i { "ola" P 10 N Ac P 10 7 }\n',
                 ': q ii>i i k * - i k + i 3\n: f ii>f i k { * Sn F + i k 0.001 }\n: main >i { = n 100000 = a A n E a n q 5 N @ + a 777 " " N Bl S 300000 f 2 " " N S 200000 q 1 "\\n" 0 }\n'];
  progs.forEach((src, i) => {
    const x = path.join(t, 'x' + i), c = path.join(t, 'c' + i);
    fs.writeFileSync(x, execFileSync(ondac, ['-mx'], { input: Buffer.from(src) }), { mode: 0o755 });
    assert.equal(fs.readFileSync(x).readUInt32LE(12), 2, 'MH_EXECUTE');
    execFileSync('codesign', ['-v', x]);
    fs.writeFileSync(c + '.o', execFileSync(ondac, ['-m'], { input: Buffer.from(src) }));
    execFileSync('cc', [c + '.o', '-o', c]);
    const run = p => { try { return execFileSync(p, ['a', 'b']); } catch (e) { return Buffer.concat([e.stdout, Buffer.from(' st=' + e.status)]); } };
    assert.ok(run(x).equals(run(c)), 'programa ' + i);
  });
});

test('macho: Rb le blocos do stdin (NEON no -m) e da o mesmo que o C e o WebAssembly, com R pelo meio e blocos de todos os restos', { skip: process.platform !== 'darwin' || process.arch !== 'arm64' }, () => {
  const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
  const t = fs.mkdtempSync(path.join(os.tmpdir(), 'onda-macho-rb-'));
  const src = ': nl ii>i i b == @ + b i 10\n: sb ii>i i b * + i 1 @ + b i\n' +
              ': main >i { = b A 1000 = n 0 = l 0 = h 0 = z 1 = c R W >= c 0 { = h + h c = k Rb b z = n + n k = l + l S k nl b = h + h S k sb b = z + % * z 7 997 1 = c ? > k 0 R -1 }\n' +
              '  N n " " N l " " N h "\\n" 0 }\n';
  let inp = ''; for (let i = 0; i < 70000; i++) inp += String.fromCharCode(32 + (i * 7919) % 90) + (i % 61 === 0 ? '\n' : '');
  fs.writeFileSync(path.join(t, 'x'), execFileSync(ondac, ['-mx'], { input: Buffer.from(src) }), { mode: 0o755 });
  fs.writeFileSync(path.join(t, 'p.wasm'), execFileSync(ondac, ['-w'], { input: Buffer.from(src) }));
  fs.writeFileSync(path.join(t, 'p.c'), execFileSync(ondac, [], { input: Buffer.from(src) }));
  execFileSync('cc', ['-O2', '-w', path.join(t, 'p.c'), '-o', path.join(t, 'c'), '-lm']);
  const w = execFileSync('node', [path.join(__dirname, '..', 'wasm/host.js'), path.join(t, 'p.wasm')], { input: inp });
  assert.ok(execFileSync(path.join(t, 'x'), { input: inp }).equals(w), 'arm64 = WASM');
  assert.ok(execFileSync(path.join(t, 'c'), { input: inp }).equals(w), 'C = WASM');
});

test('macho: Rp le bytes crus (8 por palavra) igual no arm64, no C e no WebAssembly, depois de um Rb', { skip: process.platform !== 'darwin' || process.arch !== 'arm64' }, () => {
  const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
  const t = fs.mkdtempSync(path.join(os.tmpdir(), 'onda-macho-rp-'));
  const src = ': main >i { = b A 8 = k Rb b 5 = p A 20000 = n Rp p 70001 = s 0 = j 0 W < j / + n 7 8 { = s ^ * s 31 @ + p j = j + j 1 } N k " " N n " " N s "\\n" 0 }\n';
  let inp = Buffer.alloc(90000); for (let i = 0; i < inp.length; i++) inp[i] = (i * 7919 + 13) & 255;
  fs.writeFileSync(path.join(t, 'x'), execFileSync(ondac, ['-mx'], { input: Buffer.from(src) }), { mode: 0o755 });
  fs.writeFileSync(path.join(t, 'p.wasm'), execFileSync(ondac, ['-w'], { input: Buffer.from(src) }));
  fs.writeFileSync(path.join(t, 'p.c'), execFileSync(ondac, [], { input: Buffer.from(src) }));
  execFileSync('cc', ['-O2', '-w', path.join(t, 'p.c'), '-o', path.join(t, 'c'), '-lm']);
  const w = execFileSync('node', [path.join(__dirname, '..', 'wasm/host.js'), path.join(t, 'p.wasm')], { input: inp });
  assert.ok(execFileSync(path.join(t, 'x'), { input: inp }).equals(w), 'arm64 = WASM');
  assert.ok(execFileSync(path.join(t, 'c'), { input: inp }).equals(w), 'C = WASM');
});

test('macho: Qd (produto interno de 8 bits com sdot, escala por bloco de 32) da o mesmo que a conta direta, num E paralelo', { skip: process.platform !== 'darwin' || process.arch !== 'arm64' }, () => {
  const src = ': pk ii>i v k << & v 255 * 8 k\n' +
    ': mv i>f r { = c @ 3 Qd + @ 1 * r / c 8 @ 2 c }\n' +
    ': rf i>f r { = c @ 3 = s 0.0 = j 0 W < j c { = a >> << @ + + @ 1 * r / c 8 / j 8 - 56 * 8 % j 8 56 = b >> << @ + @ 2 / j 8 - 56 * 8 % j 8 56 = s + s * @f + + @ 2 / c 8 / j 32 F * a b = j + j 1 } s }\n' +
    ': main >i { = rr 300 = c 160 ! 3 c ! 1 A / * rr c 8 ! 2 A + / c 8 / c 32\n' +
    '  = j 0 W < j / * rr c 8 { ! + @ 1 j * + j 1 2654435761 = j + j 1 }\n' +
    '  = j 0 W < j / c 8 { ! + @ 2 j * + j 7 40503 = j + j 1 } = j 0 W < j / c 32 { !f + + @ 2 / c 8 j * 0.25 F + j 1 = j + j 1 }\n' +
    '  = y A rr = z A rr E y rr mv E z rr rf = d 0 = r 0 W < r rr { ? != @f + y r @f + z r = d + d 1 0 = r + r 1 } N d "\\n" 0 }\n';
  const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
  const t = fs.mkdtempSync(path.join(os.tmpdir(), 'onda-macho-qd-'));
  fs.writeFileSync(path.join(t, 'x'), execFileSync(ondac, ['-mx'], { input: Buffer.from(src) }), { mode: 0o755 });
  assert.equal(execFileSync(path.join(t, 'x')).toString(), '0\n');
});

test('macho: Pb escreve bytes crus da memoria pela ordem certa (depois do texto ja impresso) no arm64, no C e no WebAssembly', { skip: process.platform !== 'darwin' || process.arch !== 'arm64' }, () => {
  const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
  const t = fs.mkdtempSync(path.join(os.tmpdir(), 'onda-macho-pb-'));
  const src = ': main >i { = p A 20000 = n Rp p 100003 "<" Pb p n ">" 0 }\n';
  let inp = Buffer.alloc(100003); for (let i = 0; i < inp.length; i++) inp[i] = (i * 131 + 7) & 255;
  const want = Buffer.concat([Buffer.from('<'), inp, Buffer.from('>')]);
  fs.writeFileSync(path.join(t, 'x'), execFileSync(ondac, ['-mx'], { input: Buffer.from(src) }), { mode: 0o755 });
  fs.writeFileSync(path.join(t, 'p.wasm'), execFileSync(ondac, ['-w'], { input: Buffer.from(src) }));
  fs.writeFileSync(path.join(t, 'p.c'), execFileSync(ondac, [], { input: Buffer.from(src) }));
  execFileSync('cc', ['-O2', '-w', path.join(t, 'p.c'), '-o', path.join(t, 'c'), '-lm']);
  assert.ok(execFileSync(path.join(t, 'x'), { input: inp }).equals(want), 'arm64');
  assert.ok(execFileSync(path.join(t, 'c'), { input: inp }).equals(want), 'C');
  assert.ok(execFileSync('node', [path.join(__dirname, '..', 'wasm/host.js'), path.join(t, 'p.wasm')], { input: inp }).equals(want), 'WASM');
});

test('macho: Qe (pesos de 4 bits com escala bf16 por bloco, x de 8 bits) da o mesmo que a conta direta', { skip: process.platform !== 'darwin' || process.arch !== 'arm64' }, () => {
  const src = ': bfd i>f b { = e & >> b 7 255 ? == e 0 0.0 Bw | | << >> b 15 31 << + e 896 20 << & b 127 13 0 }\n: main >i {\n  = n 64 = c16 / n 16\n  = w A + c16 1 = x A + / n 8 / n 32\n  # pesos: nibble do peso g = (g*5+3) % 16; escalas bf16 0x3F80 (1.0) e 0x4000 (2.0)\n  = g 0 W < g n { = b / g 32 = j % g 32 = by + * b 16 % j 16 = sh + * 8 % by 8 ? < j 16 0 4\n    ! + w / by 8 | @ + w / by 8 << % + * g 5 3 16 sh = g + g 1 }\n  ! + w c16 | 16256 << 16384 16\n  = j 0 W < j n { ! + x / j 8 | @ + x / j 8 << & - % * j 7 11 5 255 * 8 % j 8 = j + j 1 }\n  !f + x / n 8 0.5 !f + + x / n 8 1 3.0\n  = ref 0.0 = g 0 W < g n { = b / g 32 = wv - % + * g 5 3 16 8 = xv - % * g 7 11 5\n    = sw ? == b 0 1.0 2.0 = sx ? == b 0 0.5 3.0 = ref + ref * * sw sx F * wv xv = g + g 1 }\n  G Qe w x n " " G ref "\\n" 0 }\n';
  const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
  const t = fs.mkdtempSync(path.join(os.tmpdir(), 'onda-macho-qe-'));
  fs.writeFileSync(path.join(t, 'x'), execFileSync(ondac, ['-mx'], { input: Buffer.from(src) }), { mode: 0o755 });
  assert.equal(execFileSync(path.join(t, 'x')).toString(), '238 238\n');
});

test('macho: Fm mapeia um ficheiro em M e le as suas palavras sem copia', { skip: process.platform !== 'darwin' || process.arch !== 'arm64' }, () => {
  const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
  const t = fs.mkdtempSync(path.join(os.tmpdir(), 'onda-macho-fm-'));
  const dados = path.join(t, 'd.bin');
  const buf = Buffer.alloc(24); buf.writeBigInt64LE(111n,0); buf.writeBigInt64LE(222n,8); buf.writeBigInt64LE(333n,16);
  fs.writeFileSync(dados, buf);
  const src = ': main >i { = pb A 4100 = j 0 = c Av 1 0 W != c 0 { ! + pb j c = j + j 1 = c Av 1 j } ! + pb j 0\n' +
              '  = b 1046512 = sz Fm pb b N sz " " N @ b " " N @ + b 1 " " N @ + b 2 "\\n" 0 }\n';
  fs.writeFileSync(path.join(t, 'x'), execFileSync(ondac, ['-mx'], { input: Buffer.from(src) }), { mode: 0o755 });
  assert.equal(execFileSync(path.join(t, 'x'), [dados]).toString(), '24 111 222 333\n');
});
