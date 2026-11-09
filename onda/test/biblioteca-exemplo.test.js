// O exemplo da biblioteca (ex/carteira/carteira.onda): um script do anfitrião Node que usa sete módulos (JSON, valores,
// o sort do Node, os números e as moedas do Intl pt-PT, a hora de Lisboa, as portas do anfitrião). Tem de escrever o
// mesmo que o JS escreve com os mesmos dados (o exemplo e 300 carteiras ao acaso), e o módulo só leva o que usa.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const { compilar, fonte, gerador, R } = require('./lib/sonda.js');
const { correr } = require(path.join(R, 'rt/anfitriao-node.js'));

const SRC = fs.readFileSync(path.join(R, 'ex/carteira/carteira.onda'), 'utf8');
const wasm = compilar(fonte() + '\n' + SRC);
const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'onda-carteira-'));

// corre o script com o ficheiro f: o stdout, o stderr e o código
function corre(f) {
  return new Promise((ok) => {
    const out = { 1: [], 2: [] };
    correr(wasm, { args: [f], saida: { 1: (u) => out[1].push(Buffer.from(u)), 2: (u) => out[2].push(Buffer.from(u)) }, sair: (c) => ok({ c, o: Buffer.concat(out[1]).toString(), e: Buffer.concat(out[2]).toString() }) });
    setImmediate(() => ok({ c: 0, o: Buffer.concat(out[1]).toString(), e: Buffer.concat(out[2]).toString() }));
  });
}
// o mesmo em JS
function referencia(d) {
  const nf = (x, k) => new Intl.NumberFormat('pt-PT', { minimumFractionDigits: k, maximumFractionDigits: k }).format(x);
  const moeda = (x, c) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: c, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(x);
  const quando = new Intl.DateTimeFormat('pt-PT', { timeZone: 'Europe/Lisbon', weekday: 'long', hour: '2-digit', minute: '2-digit' });
  const l = d.ativos, w = l.map((_, i) => i).sort((a, b) => Number(l[b].dia) - Number(l[a].dia));
  let s = 'Carteira — ' + quando.format(d.agora) + '\n', tot = 0;
  w.forEach((j, i) => {
    const a = l[j], eur = Number(a.qtd) * Number(a.preco) * Number(a.cambio);
    tot += eur;
    s += `${i + 1}. ${String(a.nome)}  ${Number(a.dia) >= 0 ? '+' : ''}${nf(Number(a.dia) * 100, 2)} %  ${nf(Number(a.qtd), 2)} × ${moeda(Number(a.preco), a.moeda)} = ${moeda(eur, 'EUR')}\n`;
  });
  return s + 'Total: ' + moeda(tot, 'EUR') + '\n' + JSON.stringify({ ordem: w.map((j) => l[j].nome), total: tot }) + '\n';
}

test('o exemplo (ex/carteira): o mesmo que o JS, no ficheiro do exemplo e em 300 carteiras ao acaso', async () => {
  const ex = path.join(R, 'ex/carteira/carteira.json');
  const r = await corre(ex);
  assert.strictEqual(r.o, referencia(JSON.parse(fs.readFileSync(ex, 'utf8'))));
  assert.strictEqual(r.c, 0);
  const G = gerador(7);
  const MO = ['EUR', 'USD', 'GBP', 'JPY', 'DKK', 'CHF', 'BRL', 'XOF'];
  for (let i = 0; i < 300; i++) {
    const d = {
      agora: 828234000000 + G.int(4102444800000 - 828234000000),
      ativos: Array.from({ length: G.int(25) }, (_, j) => ({ nome: G.pick(['Apple', 'Ações & Cª', 'Ünï "x"', '😀 cripto', 'N' + j]), qtd: G.pick([1, 0.5, 0.015, 1234.5678, 1e-7, 3]), preco: G.R() * 10 ** G.int(7), moeda: G.pick(MO), cambio: G.pick([1, 0.865, 0.0057, 1.17]), dia: G.pick([0, -0, 0.05, -0.0345, 0.005, -0.005, (G.R() - 0.5) / 5]) })),
    };
    const f = path.join(pasta, 'c' + i + '.json');
    fs.writeFileSync(f, JSON.stringify(d));
    assert.strictEqual((await corre(f)).o, referencia(JSON.parse(JSON.stringify(d))), JSON.stringify(d).slice(0, 300));
  }
});

test('o exemplo: os erros vão para o stderr com o código 1, e o módulo só leva o que usa', async () => {
  const r = await corre(path.join(pasta, 'nao-ha.json'));
  assert.deepStrictEqual([r.c, r.e], [1, 'não li o ficheiro\n']);
  fs.writeFileSync(path.join(pasta, 'mau.json'), '{"ativos": [');
  const m = await corre(path.join(pasta, 'mau.json'));
  assert.deepStrictEqual([m.c, m.e], [1, 'JSON inválido\n']);
  const so = compilar(fonte(['memoria', 'texto', 'numero', 'valor', 'json', 'data', 'ordenar', 'anfitriao']) + '\n' + SRC);
  assert.ok(Buffer.compare(so, wasm) === 0, 'com a biblioteca toda ou só com os módulos que usa, o mesmo módulo');
  console.log(`# carteira.wasm: ${wasm.length} bytes`);
});
