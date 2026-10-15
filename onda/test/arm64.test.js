// Backend nativo ARM64 / aarch64 (-a): a Onda escreve o seu proprio codigo-maquina aarch64 (ELF estatico),
// sem C nem assembler -- o irmao do -x (x86-64), para o chip do Mac/iPhone (Apple Silicon). Esta primeira fatia
// e o nucleo inteiro. Corremos os executaveis sob o qemu-aarch64-static e conferimos o codigo de saida
// (resultado de main & 255). Salta-se (skip) onde o qemu nao esta instalado, por isso nao parte o `node --test`.
// (NB: "arm" noutro teste e "armazem"; aqui ARM = a arquitetura ARM64.)
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const R = path.join(__dirname, '..');
const ondac = path.join(R, 'build/ondac');
const t = fs.mkdtempSync(path.join(os.tmpdir(), 'onda-a64-'));

let qemu = null;
for (const q of ['qemu-aarch64-static', 'qemu-aarch64']) {
  try { execFileSync('sh', ['-c', 'command -v ' + q]); qemu = q; break; } catch (e) {}
}

const run = (src) => {
  const exe = path.join(t, 'a.out');
  fs.writeFileSync(exe, execFileSync(ondac, ['-a'], { input: Buffer.from(src) }), { mode: 0o755 });
  try { execFileSync(qemu, [exe]); return 0; }
  catch (e) { if (typeof e.status === 'number') return e.status; throw e; }
};
// verdade de terreno: o mesmo programa pelo backend C, corrido nativamente, devolve o seu codigo de saida
const runC = (src) => {
  const c = path.join(t, 'g.c'), exe = path.join(t, 'gc');
  fs.writeFileSync(c, execFileSync(ondac, [], { input: Buffer.from(src) }));
  execFileSync('cc', ['-O2', '-fwrapv', '-w', c, '-o', exe, '-lm']);
  try { execFileSync(exe); return 0; }
  catch (e) { if (typeof e.status === 'number') return e.status; throw e; }
};

test('arm64: o -a produz um ELF aarch64 valido', { skip: qemu ? false : 'qemu-aarch64 nao instalado' }, () => {
  const b = execFileSync(ondac, ['-a'], { input: Buffer.from(': main >i 0\n') });
  assert.strictEqual(b[0], 0x7f); assert.strictEqual(b[1], 0x45); // 0x7f 'E'
  assert.strictEqual(b[4], 2); // ELFCLASS64
  assert.strictEqual(b.readUInt16LE(18), 183); // e_machine = EM_AARCH64
});

test('arm64: aritmetica e ciclos inteiros corridos no qemu dao o resultado certo', { skip: qemu ? false : 'qemu-aarch64 nao instalado' }, () => {
  assert.strictEqual(run(': main >i 42\n'), 42);
  assert.strictEqual(run(': main >i { = a 7 = b 6 * a b }\n'), 42);
  assert.strictEqual(run(': main >i { = a 17 = b 5 - a b }\n'), 12);
  assert.strictEqual(run(': main >i { = a 100 = b 7 % a b }\n'), 2);
  assert.strictEqual(run(': main >i { = a 0xF0 = b 0x0F | a b }\n'), 255);
  assert.strictEqual(run(': main >i { = s 0 = i 0 W < i 100 { = s + s i = i + i 1 } s }\n'), 4950 & 255); // 86
  assert.strictEqual(run(': main >i { = r 1 = i 1 W < i 6 { = r * r i = i + i 1 } r }\n'), 120); // 5!
  assert.strictEqual(run(': main >i { = s 0 = i 1 W < i 11 { = s + s * i i = i + i 1 } % s 200 }\n'), 185); // 385%200
});

// reais (registos d, ldr/str, fadd/fmul/fdiv, scvtf/fcvtzs), arrays em M (A, @f/!f) e o operador de mapa E
// (elemento embutido). Tudo verificado contra o backend C nativo -- o -a tem de dar o mesmo codigo de saida.
test('arm64: reais, arrays e o mapa (-a) dao o mesmo que o C', { skip: qemu ? false : 'qemu-aarch64 nao instalado' }, () => {
  const soma = ': main >i { = n 64 = a A n = i 0 W < i n { !f + a i F + % i 7 1 = i + i 1 }\n' +
               '  = s 0.0 = i 0 W < i n { = x @f + a i = s + s + * 2.0 x 1.0 = i + i 1 } I s }\n';
  assert.strictEqual(run(soma), runC(soma));
  // o mapa E usa o caminho NEON (fmul.2d/fadd.2d, 2 doubles por instrucao) + cauda escalar para n impar.
  // Por-lane = escalar, logo bit-exato -> o codigo de saida tem de bater o C para n par e impar.
  const mapa = n => ': g ii>f i a { = x @f + a i + 0.1 * x + 0.2 * x + 0.3 * x + 0.4 * x + 0.5 * x + 0.6 * x + 0.7 * x 0.8 }\n' +
               ': main >i { = n ' + n + ' = a A n = i 0 W < i n { !f + a i F + % i 7 1 = i + i 1 }\n' +
               '  = b A n E b n g a = s 0.0 = i 0 W < i n { = s + s @f + b i = i + i 1 } I s }\n';
  for (const n of [64, 63, 100, 7, 1]) assert.strictEqual(run(mapa(n)), runC(mapa(n)), 'mapa n=' + n);
});
