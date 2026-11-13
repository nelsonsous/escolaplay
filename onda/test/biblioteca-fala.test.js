// A fala das apps (lib/fala.onda): os nomes curtos dao o mesmo que o JavaScript faria com os mesmos valores.
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const R = path.join(__dirname, '..');
const ondac = path.join(R, 'build/ondac');
const t = fs.mkdtempSync(path.join(os.tmpdir(), 'onda-fala-'));
const lib = ['memoria', 'texto', 'numero', 'valor', 'json', 'arvore', 'fala'].map((m) => fs.readFileSync(path.join(R, 'lib', m + '.onda'), 'utf8')).join('\n');
const corre = (src) => {
  const f = path.join(t, 'p.wasm');
  fs.writeFileSync(f, execFileSync(ondac, ['-w', 'main'], { input: lib + '\n' + src, maxBuffer: 1 << 26 }));
  return execFileSync('node', [path.join(R, 'wasm/host.js'), f]).toString();
};
const escJS = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

test('fala: ler e escrever os valores de um JSON como o JavaScript', () => {
  const dados = { nome: 'A&B <"x"> \'y\'', n: 12.5, neg: -3.99, zero: 0, vazio: '', sim: true, nao: false, nulo: null, lista: [1, 'dois', null, true], obj: { k: 'v' }, grande: 1234567.891 };
  const src = `
: linha i>i n { esc n P '| cru n P '| N ha n P '| N tipo n P '| N int n P '| ? fin num n ate num n 3 "nan" P 10 }
: main >i {
  = r _ar_json $\`${JSON.stringify(dados).replace(/\\/g, '\\\\')}\`
  linha r.nome linha r.n linha r.neg linha r.zero linha r.vazio linha r.sim linha r.nao linha r.nulo linha r.falta
  linha r.lista linha r.obj linha r.obj.k linha r.grande
  N eh r.nome $\`A&B <"x"> 'y'\` N eh r.n $"12.5" N igual r.sim r.sim N igual r.n r.neg N igual r.obj.k (idx r.lista 9) P 10
  N quantos r.lista P 32 = c pri r.lista W c { cru c P ', = c seg c } P 32 cru idx r.lista 1 P 32 N tipo idx r.lista 7 P 10
  esct txt r.nome P '| crut txt r.nome P '| N txt r.n P '| N mesmo txt r.obj.k $"v" N mesmo txt r.obj.k $"w" P 10
  0 }`;
  const out = corre(src).split('\n');
  const tipo = (v) => (v === undefined ? 0 : v === null ? 1 : v === false ? 2 : v === true ? 3 : typeof v === 'number' ? 4 : typeof v === 'string' ? 5 : Array.isArray(v) ? 6 : 7);
  const nJS = (v) => (v === null ? 0 : typeof v === 'boolean' ? +v : typeof v === 'number' ? v : NaN);
  const ate3 = (x) => new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 3 }).format(x);
  // o esc de uma lista e o join(',') com o null e o undefined vazios, como o String() do JS
  const linha = (v) => `${escJS(v)}|${v === null ? 'null' : v === undefined ? 'undefined' : String(v)}|${v ? 1 : 0}|${tipo(v)}|${Number.isFinite(nJS(v)) ? Math.trunc(nJS(v)) : 0}|${Number.isFinite(nJS(v)) ? ate3(nJS(v)) : 'nan'}`;
  const esperado = [dados.nome, dados.n, dados.neg, dados.zero, dados.vazio, dados.sim, dados.nao, dados.nulo, undefined, dados.lista, dados.obj, dados.obj.k, dados.grande].map(linha);
  assert.deepStrictEqual(out.slice(0, esperado.length), esperado);
  assert.strictEqual(out[13], '10100');
  assert.strictEqual(out[14], '4 1,dois,null,true, dois 0');
  assert.strictEqual(out[15], `${escJS(dados.nome)}|${dados.nome}|0|10`);
});

test('fala: os numeros pt-PT, o plural e as acoes dos botoes', () => {
  const xs = [0, 1, 1234.5, -1234.567, 0.005, 1e6, 999.995, 12.3456];
  const src = `
: n1 f>i x { casas x 2 P '| ate x 2 P '| inteiro x P '| moeda x 2 $"EUR" P '| moeda x 0 $"USD" P 10 }
: main >i {
  ${xs.map((x) => `n1 ${Number.isInteger(x) ? x + '.' : x}`).join(' ')}
  plural 1 $"dia" $"dias" P '| plural 0 $"dia" $"dias" P '| plural 12 $"lugar" $"lugares" P 10
  = t $"abre:42" crut acao t P '| N arg t P '| N eacao t $"abre" N eacao t $"abr" N eacao t $"abre:" P 10
  = u $"fecha" crut acao u P '| N arg u P '| N arg $"x:-7" P '| N arg $"x:" P 10
  0 }`;
  const out = corre(src).split('\n');
  const f = (o) => new Intl.NumberFormat('pt-PT', o);
  xs.forEach((x, i) => assert.strictEqual(out[i], [f({ minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(x), f({ maximumFractionDigits: 2 }).format(x), f({ maximumFractionDigits: 0 }).format(x),
    f({ style: 'currency', currency: 'EUR' }).format(x), f({ style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(x)].join('|'), 'x = ' + x));
  assert.strictEqual(out[xs.length], '1 dia|0 dias|12 lugares');
  assert.strictEqual(out[xs.length + 1], 'abre|42|100');
  assert.strictEqual(out[xs.length + 2], 'fecha|0|-7|0');
});
