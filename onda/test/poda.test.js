// Poda do -w (it.138): o modulo WebAssembly so leva as funcoes que as raizes alcancam, e so exporta as entradas.
// Raizes: o arranque (main), as rotinas que os anfitrioes chamam (_oa, _fl, _ini) e as entradas -- sem nomes no
// comando, todas as funcoes cujo nome nao comeca por _; com `ondac -w f g`, so f e g.
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const R = path.join(__dirname, '..');
const ondac = path.join(R, 'build/ondac');
const t = fs.mkdtempSync(path.join(os.tmpdir(), 'onda-poda-'));

// quantas funcoes definidas tem o modulo (a seccao de codigo) e que nomes exporta
function modulo(b) {
  let p = 8, nf = 0;
  const u = () => { let r = 0, s = 0, c; do { c = b[p++]; r |= (c & 127) << s; s += 7; } while (c & 128); return r >>> 0; };
  while (p < b.length) { const id = b[p++], len = u(), st = p; if (id === 10) nf = u(); p = st + len; }
  return { nf, ex: WebAssembly.Module.exports(new WebAssembly.Module(b)).map((e) => e.name).sort() };
}
const w = (src, nomes = []) => execFileSync(ondac, ['-w', ...nomes], { input: src });
const corre = (b) => { fs.writeFileSync(path.join(t, 'p.wasm'), b); return execFileSync('node', [path.join(R, 'wasm/host.js'), path.join(t, 'p.wasm')]).toString(); };

const SRC = `
: _usada i>i x * x 2
: _morta i>i x + x 1
: _so_da_morta i>i x - x 1
: entrada i>i x _usada x
: outra i>i x x
: _elem ii>i i a * i a
: _so_no_e i>i x 0
: morta2 i>i x { _so_da_morta x }
: campo i>i n { = d A n E d n _elem 3 @ + d 2 }
: main >i { N entrada 21 P 32 N campo 4 0 }
`;

test('poda (-w): as funcoes _ que nada vivo usa ficam de fora; as outras sao entradas e exportam-se', () => {
  const m = modulo(w(SRC));
  assert.deepStrictEqual(m.ex, ['_fl', '_ini', '_oa', '_start', 'campo', 'entrada', 'main', 'memory', 'morta2', 'outra']);
  const tudo = modulo(w(SRC + ': _x >i { _morta 1 _so_no_e 2 }\n: usa_tudo >i _x\n'));
  assert.strictEqual(tudo.nf - m.nf, 4, '_x, _morta, _so_no_e e usa_tudo entram quando algo vivo os usa');
  assert.strictEqual(corre(w(SRC)), '42 6');
  // a matematica so entra se for usada: Lg nao traz o Sn, o Cs, o Ex, o Pw nem o At
  const lg = modulo(w(': main >i { G Lg 2.0 0 }\n')), sn = modulo(w(': main >i { G + Lg 2.0 Sn 1.0 0 }\n'));
  assert.ok(sn.nf > lg.nf, 'o Sn traz o _sn');
  assert.strictEqual(corre(w(': main >i { G Lg 2.0 0 }\n')), '0.693147180559945');
});

test('poda (-w f g): so f e g (e os do anfitriao) sao raizes e exportacoes; um nome que nao existe e um erro', () => {
  const m = modulo(w(SRC, ['entrada']));
  assert.deepStrictEqual(m.ex, ['_fl', '_ini', '_oa', '_start', 'entrada', 'memory']);
  assert.strictEqual(corre(w(SRC, ['entrada'])), '42 6', 'o main corre sempre');
  assert.ok(m.nf < modulo(w(SRC)).nf, 'outra, morta2 e _so_da_morta ficam de fora');
  let e = '';
  try { execFileSync(ondac, ['-w', 'entrada', 'naoha'], { input: SRC }); } catch (x) { e = String(x.stdout); }
  assert.match(e, /nao ha a funcao naoha para exportar/);
});

test('poda: o anfitriao de apps continua a chamar as funcoes de evento pelo nome', () => {
  const src = fs.readFileSync(path.join(R, 'lib/app.onda'), 'utf8') + `
: ola i>i t { O 0 "ola " tpor t 0 }
: main >i 0
`;
  const { criar } = require(path.join(R, 'rt/anfitriao.js'));
  const log = [];
  const app = criar(new Uint8Array(w(src)), { registo: (x) => log.push(x), armazem: {} });
  app.chamar('ola', app.escrever('mundo'));
  assert.deepStrictEqual(log, ['ola mundo']);
  // o _oa (os textos do anfitriao), o _fl e o _ini estao la
  for (const f of ['_oa', '_fl', '_ini', 'ola', 'tpor', 'json']) assert.strictEqual(typeof app.exports[f], 'function', f);
  assert.strictEqual(app.exports._jval, undefined, 'as _ da biblioteca sao privadas');
});

// it.142: os textos constantes de uma funcao morta nao entram na zona dos dados -- nem na dispersao dos textos. Antes,
// um texto igual numa funcao viva achava a entrada desfeita e ficava com um endereco sem dados (lia-se vazio).
test('poda: um texto constante usado numa funcao morta e, a seguir, numa viva tem os seus dados', () => {
  const src = `
: _morta >i { = a $"primeiro" = b $"segundo" = c $"terceiro" + + a b c }
: _outra >i $"segundo"
: pt i>i t { = j + t 1 W < j @ t { P @ j = j + j 1 } 0 }
: main >i {
  pt $"segundo" P 32 pt $"primeiro" P 32 pt $"terceiro" P 32 pt $"quarto" P 32
  N == $"segundo" $"segundo" N != $"primeiro" $"terceiro" P 10
  0 }`;
  assert.strictEqual(corre(w(src, ['main'])), 'segundo primeiro terceiro quarto 11\n');
  // com todas as funcoes vivas (sem nomes no comando as _ que nada usa ficam mortas na mesma) e no x86 da o mesmo
  assert.strictEqual(corre(w(src)), 'segundo primeiro terceiro quarto 11\n');
  fs.writeFileSync(path.join(t, 'px'), execFileSync(ondac, ['-x'], { input: src }), { mode: 0o755 });
  assert.strictEqual(execFileSync(path.join(t, 'px')).toString(), 'segundo primeiro terceiro quarto 11\n');
});
