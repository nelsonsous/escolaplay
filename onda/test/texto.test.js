// Textos constantes ($"...") e saida de texto em bloco (it.138).
// $"..." vale o endereco de um texto fixo no formato do O t (M[t] = fim, um byte por palavra), posto uma vez na zona
// dos dados: tem de dar o mesmo em C, WebAssembly, x86 e arm64 (-a, no qemu, quando ha). A saida de textos literais,
// numeros e reais (para o stdout e para um texto do O) vai agora em bloco no runtime: o resultado tem de ser o mesmo,
// byte a byte, nos quatro, tambem a cavalo das 4096 palavras do buffer.
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const R = path.join(__dirname, '..');
const ondac = path.join(R, 'build/ondac');
const t = fs.mkdtempSync(path.join(os.tmpdir(), 'onda-texto-'));
let qemu = null;
for (const q of ['qemu-aarch64-static', 'qemu-aarch64']) {
  try { execFileSync('sh', ['-c', 'command -v ' + q]); qemu = q; break; } catch (e) {}
}
const corre = (src) => {
  const f = path.join(t, 'p.onda');
  fs.writeFileSync(f, src);
  const out = {};
  fs.writeFileSync(path.join(t, 'p.c'), execFileSync(ondac, [], { input: src }));
  execFileSync('cc', ['-O2', '-fwrapv', '-w', path.join(t, 'p.c'), '-o', path.join(t, 'pc'), '-lm']);
  out.c = execFileSync(path.join(t, 'pc')).toString();
  fs.writeFileSync(path.join(t, 'p.wasm'), execFileSync(ondac, ['-w'], { input: src }));
  out.w = execFileSync('node', [path.join(R, 'wasm/host.js'), path.join(t, 'p.wasm')]).toString();
  fs.writeFileSync(path.join(t, 'px'), execFileSync(ondac, ['-x'], { input: src }), { mode: 0o755 });
  out.x = execFileSync(path.join(t, 'px')).toString();
  if (qemu) {
    fs.writeFileSync(path.join(t, 'pa'), execFileSync(ondac, ['-a'], { input: src }), { mode: 0o755 });
    out.a = execFileSync(qemu, [path.join(t, 'pa')]).toString();
  }
  return out;
};
const iguais = (o, msg) => { for (const k of Object.keys(o)) assert.strictEqual(o[k], o.c, `${msg}: ${k} difere do C`); };

test('$"...": o endereco de um texto fixo no formato do O t, igual em C, WebAssembly, x86 e arm64', () => {
  const src = `
: pt i>i t { = j + t 1 W < j @ t { P @ j = j + j 1 } 0 }
: k >i $"abc"
: main >i {
  = a $"abc"
  = b $"Olá, \\"mundo\\"\\t!\\n"
  = d $""
  pt a P 10 pt b N - - @ b b 1 P 10
  N == a $"abc" P 32 N == a k P 32 N != a b P 10
  N - - @ d d 1 P 10
  pt $"com espaços # e um cardinal" P 10
  # o monte comeca depois dos dados: um A nao pisa os textos
  = x A 3 ! x 7 N >= x + b 1 P 32 N @ x P 10
  # um texto feito com O t e igual, byte a byte, ao constante
  = u A 40 ! u + u 1 O u "Olá, \\"mundo\\"\\t!\\n" O 0
  = r == - @ u u - @ b b = j 1 W && r < j - @ b b { = r == @ + u j @ + b j = j + j 1 } N r P 10
  0 }`;
  const o = corre(src);
  assert.strictEqual(o.c, 'abc\nOlá, "mundo"\t!\n16\n1 1 1\n0\ncom espaços # e um cardinal\n1 7\n1\n');
  iguais(o, '$"..."');
});

test('$"..." na GPU e no JavaScript: nao ha memoria, da o erro do texto; o significado recusa-o', () => {
  const g = execFileSync(ondac, ['-g', 'px'], { input: ': px ii>i x y { = t $"x" 0 }\n' }).toString();
  assert.match(g, /texto so em CPU/);
  const S = require(path.join(R, 'web/significado.js'));
  assert.throws(() => S.funcao(': f i>i x { = t $"a b" x }\n', 'f'), /texto so existe na CPU/);
  // o lexer do significado le o $"..." como um so token, como o do compilador
  assert.deepStrictEqual(S.tokens('$"a b" x').map((k) => [k.k, k.x]), [[6, '"a b"'], [0, 'x']]);
});

test('saida em bloco: textos longos, numeros e reais no stdout e num texto do O, iguais nos quatro', () => {
  const longo = 'x'.repeat(5000), medio = 'y'.repeat(4500);
  const src = `
: rep ii>i c n { = j 0 W < j n { P c = j + j 1 } 0 }
: pt i>i t { = j + t 1 W < j @ t { P @ j = j + j 1 } 0 }
: main >i {
  rep 46 4090 "0123456789abcdef" N -1234567 P 10
  "${longo}" P 10
  = t A 20000 ! t + t 1 O t "inicio " N 42 " " N -7 " " "${medio}" G 1.5 P 33 N 0 O 0
  N - - @ t t 1 P 10 pt t P 10
  N 0 P 32 N 9223372036854775807 P 32 G -0.25 P 32 G 12345.678 P 10
  0 }`;
  const o = corre(src);
  const txt = 'inicio 42 -7 ' + medio + '1.5!0';
  assert.strictEqual(o.c, '.'.repeat(4090) + '0123456789abcdef-1234567\n' + longo + '\n' + txt.length + '\n' + txt + '\n' +
    '0 9223372036854775807 -0.25 12345.678\n');
  iguais(o, 'saida em bloco');
});

test('Oc t n: o texto leva no maximo n bytes, o resto fica de fora (ate ao proximo O), igual em WebAssembly, x86 e arm64', () => {
  const src = `
: pt i>i t { = j + t 1 W < j @ t { P @ j = j + j 1 } 0 }
: main >i {
  = t A 11 ! t + t 1 = g A 1 ! g 777
  Oc t 10 "0123456789abcdef" N 12345 P 'x G 1.5 O 0
  pt t P 10 N @ g P 10
  = u A 6 ! u + u 1 = h A 1 ! h 555
  Oc u 5 N 42 "abc" P 'z "def" O 0 pt u P 10 N @ h P 10
  = v A 30 ! v + v 1
  Oc v 3 O v "sem guarda depois do O" O 0 pt v P 10
  = w A 9000 ! w + w 1 = q A 1 ! q 999
  Oc w 8000 "inicio" = i 0 W < i 810 { "0123456789" = i + i 1 } O 0 N - - @ w w 1 P 32 N @ q P 10
  0 }`;
  const out = {};
  fs.writeFileSync(path.join(t, 'oc.wasm'), execFileSync(ondac, ['-w'], { input: src }));
  out.w = execFileSync('node', [path.join(R, 'wasm/host.js'), path.join(t, 'oc.wasm')]).toString();
  fs.writeFileSync(path.join(t, 'ocx'), execFileSync(ondac, ['-x'], { input: src }), { mode: 0o755 });
  out.x = execFileSync(path.join(t, 'ocx')).toString();
  if (qemu) {
    fs.writeFileSync(path.join(t, 'oca'), execFileSync(ondac, ['-a'], { input: src }), { mode: 0o755 });
    out.a = execFileSync(qemu, [path.join(t, 'oca')]).toString();
  }
  // a palavra a seguir a cada texto (777, 555, 999) fica intacta
  for (const k of Object.keys(out)) assert.strictEqual(out[k], '0123456789\n777\n42abc\n555\nsem guarda depois do O\n8000 999\n', k);
  let e = '';
  try { execFileSync(ondac, [], { input: src }); } catch (x) { e = String(x.stdout); }
  assert.match(e, /Oc so no -w, -x e -a\/-m \(linha 5, coluna 3\)/);
});
