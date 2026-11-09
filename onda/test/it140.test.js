// it.140: (1) Sn Cs Ex Lg Pw At sao a matematica da Onda (fdlibm) tambem dentro das funcoes privadas (_): os mesmos
// bits em WebAssembly, x86 e arm64, e iguais ao Math do JavaScript; (2) no -w, uma funcao morta (podada) continua a
// ser verificada: um nome que nao existe da erro como nas outras formas.
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const R = path.join(__dirname, '..');
const ondac = path.join(R, 'build/ondac');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'onda140-'));
let qemu = null;
for (const q of ['qemu-aarch64-static', 'qemu-aarch64']) {
  try { execFileSync('sh', ['-c', 'command -v ' + q]); qemu = q; break; } catch (e) {}
}
// os 64 bits de cada resultado, em duas palavras (Bh com sinal, Bl), para comparar ao bit
// (acima de ~1,6e6 o seno e o coseno usam a primitiva do alvo: fora deste teste)
const XS = [2, 0.3, 1e-7, 123456.789, 0.5, 1, 7.25, 1000000, 3.141592653589793];
const SRC = `: _priv fi>f x k ? == k 0 Lg x ? == k 1 Sn x ? == k 2 Cs x ? == k 3 Ex / x 100.0 ? == k 4 At x 2.0 Pw x 1.5
: pub fi>f x k ? == k 0 Lg x ? == k 1 Sn x ? == k 2 Cs x ? == k 3 Ex / x 100.0 ? == k 4 At x 2.0 Pw x 1.5
: mostra f>i v { N Bh v P 32 N Bl v P 10 }
: main >i { = a A ${XS.length} ${XS.map((x, i) => `!f + a ${i} ${Number.isInteger(x) ? x + '.0' : String(x).replace(/e-7/, 'e-7')}`).join(' ')}
  = i 0 W < i ${XS.length} { = k 0 W < k 6 { mostra _priv @f + a i k mostra pub @f + a i k = k + k 1 } = i + i 1 } 0 }
`.replace('1e-7', '0.0000001').replace('1e10', '10000000000.0');
const bits = (v) => { const b = Buffer.alloc(8); b.writeDoubleBE(v); return b.readInt32BE(0) + ' ' + b.readUInt32BE(4); };

test('matematica: fdlibm tambem nas funcoes privadas, igual ao bit em -w, -x e -a e ao Math do JS', () => {
  const f = path.join(dir, 'm.onda');
  fs.writeFileSync(f, SRC);
  const src = fs.readFileSync(f);
  fs.writeFileSync(path.join(dir, 'm.wasm'), execFileSync(ondac, ['-w'], { input: src }));
  const w = execFileSync('node', [path.join(R, 'wasm/host.js'), path.join(dir, 'm.wasm')]).toString();
  const esperado = [];
  for (const x of XS) for (const g of [Math.log(x), Math.sin(x), Math.cos(x), Math.exp(x / 100), Math.atan2(x, 2), null]) { const s = g === null ? null : bits(g); esperado.push(s, s); }
  const lw = w.trim().split('\n');
  assert.strictEqual(lw.length, esperado.length);
  lw.forEach((l, i) => {
    if (esperado[i] !== null) assert.strictEqual(l, esperado[i], `resultado ${i} difere do JS`);
    if (i % 2) assert.strictEqual(l, lw[i - 1], 'a funcao privada e a publica dao o mesmo');
  });
  fs.writeFileSync(path.join(dir, 'm.x'), execFileSync(ondac, ['-x'], { input: src }), { mode: 0o755 });
  assert.strictEqual(execFileSync(path.join(dir, 'm.x')).toString(), w, '-x igual ao -w');
  if (qemu) {
    fs.writeFileSync(path.join(dir, 'm.a'), execFileSync(ondac, ['-a'], { input: src }), { mode: 0o755 });
    assert.strictEqual(execFileSync(qemu, [path.join(dir, 'm.a')]).toString(), w, '-a igual ao -w');
  }
});

test('-w: uma funcao morta tambem e verificada (nomes e tipos), como no -x', () => {
  const erro = (args, src) => { let out = ''; try { out = execFileSync(ondac, args, { input: src + '\n' }).toString(); } catch (e) { out = String(e.stdout); } const m = out.match(/#error onda: (.*) \(linha/); return m ? m[1] : ''; };
  for (const [src, msg] of [
    [': _morta i>i x naoexiste x 1\n: main >i 0', /nome desconhecido/],
    [': _morta i>i x + x 1.5\n: main >i 0', /tipos diferentes/],
    [': _a i>i x _b x\n: _b i>i x zzz x\n: main >i 0', /nome desconhecido/],
  ]) {
    assert.match(erro(['-w'], src), msg, '-w: ' + src);
    assert.match(erro(['-x'], src), msg, '-x: ' + src);
  }
  // mortas certas (que se chamam entre si) continuam fora do modulo, sem erro
  const ok = ': _a i>i x _b x\n: _b i>i x + x 1\n: viva i>i x * x 2\n: main >i 0\n';
  const comA = execFileSync(ondac, ['-w', 'viva'], { input: ok }).length;
  const semA = execFileSync(ondac, ['-w', 'viva'], { input: ': viva i>i x * x 2\n: main >i 0\n' }).length;
  assert.strictEqual(comA, semA, 'as mortas nao pesam no modulo');
});
