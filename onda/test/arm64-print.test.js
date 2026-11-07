// Impressao e leitura no backend nativo ARM64 (-a): a Onda escreve o seu runtime (escrever/ler/sair via syscalls
// svc #0, mais o controlo if/else e &&/|| curto-circuito) no proprio codigo-maquina aarch64. O que o programa
// imprime (N inteiros, G reais, chars) tem de dar, byte a byte, o MESMO que o backend C -- corrido no
// qemu-aarch64-static. Salta-se (skip) onde o qemu nao esta instalado. Prova que o -a ja nao precisa do C p/ I/O.
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const R = path.join(__dirname, '..');
const ondac = path.join(R, 'build/ondac');
const t = fs.mkdtempSync(path.join(os.tmpdir(), 'onda-a64p-'));

let qemu = null;
for (const q of ['qemu-aarch64-static', 'qemu-aarch64']) {
  try { execFileSync('sh', ['-c', 'command -v ' + q]); qemu = q; break; } catch (e) {}
}

// stdout do -a (sob qemu) e do backend C nativo, com o mesmo stdin -- tem de bater byte a byte
const outA = (src, input) => {
  const exe = path.join(t, 'a.out');
  fs.writeFileSync(exe, execFileSync(ondac, ['-a'], { input: Buffer.from(src) }), { mode: 0o755 });
  try { return execFileSync(qemu, [exe], { input: input || Buffer.alloc(0) }).toString(); }
  catch (e) { return (e.stdout || Buffer.alloc(0)).toString(); }
};
const outC = (src, input) => {
  const c = path.join(t, 'g.c'), exe = path.join(t, 'gc');
  fs.writeFileSync(c, execFileSync(ondac, [], { input: Buffer.from(src) }));
  execFileSync('cc', ['-O2', '-fwrapv', '-w', c, '-o', exe, '-lm']);
  try { return execFileSync(exe, { input: input || Buffer.alloc(0) }).toString(); }
  catch (e) { return (e.stdout || Buffer.alloc(0)).toString(); }
};

test('arm64: impressao de inteiros e reais (-a) bate o C', { skip: qemu ? false : 'qemu-aarch64 nao instalado' }, () => {
  for (const src of [
    ': main >i { N 42 N 7 N -13 N 0 0 }\n',
    ': main >i { G 3.5 G -0.25 G 100.0 G 0.0 0 }\n',
    ': main >i { = i 0 W < i 10 { N i = i + i 1 } 0 }\n',           // 0123456789
    ': main >i { = s 0.0 = i 1 W < i 6 { = s + s / 1.0 F i = i + i 1 } G s 0 }\n', // soma harmonica
  ]) assert.strictEqual(outA(src), outC(src), src.slice(0, 40));
});

test('arm64: controlo (if/else, &&/||, ciclos) no I/O (-a) bate o C', { skip: qemu ? false : 'qemu-aarch64 nao instalado' }, () => {
  for (const src of [
    ': main >i { = a 100 = b 7 ? < a b N a N b 0 }\n',              // 7
    ': main >i { = x 5 ? && > x 0 < x 10 N 1 N 0 0 }\n',            // 1
    ': main >i { = x 50 ? || < x 0 > x 10 N 1 N 0 0 }\n',           // 1
    ': fizz i>i n ? == % n 15 0 N 0 ? == % n 3 0 N 1 ? == % n 5 0 N 2 N n\n' +
    ': main >i { = i 1 W <= i 20 { fizz i = i + i 1 } 0 }\n',       // FizzBuzz via codigos
  ]) assert.strictEqual(outA(src), outC(src), src.slice(0, 40));
});

test('arm64: leitura de stdin (-a) bate o C', { skip: qemu ? false : 'qemu-aarch64 nao instalado' }, () => {
  // le bytes ate EOF (R devolve -1) e soma-os; stdin vazio -> 0; com dados -> soma dos codigos
  const src = ': main >i { = s 0 = c R W >= c 0 { = s + s c = c R } N s 0 }\n';
  assert.strictEqual(outA(src, Buffer.alloc(0)), outC(src, Buffer.alloc(0)), 'stdin vazio');
  assert.strictEqual(outA(src, Buffer.from('ABC')), outC(src, Buffer.from('ABC')), 'stdin ABC');
});
