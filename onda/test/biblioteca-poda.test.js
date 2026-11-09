// A biblioteca toda (onda/lib) não custa nada a uma app que só usa uma parte: os nomes dela começam por _ (privados no
// -w), por isso só entram as funções que a app alcança, e o módulo sai igual ao byte ao que se faz juntando só os
// módulos precisos. Mede quanto pesa cada parte quando se usa.
const { test } = require('node:test');
const assert = require('node:assert');
const { compilar, fonte, MODULOS } = require('./lib/sonda.js');

// quantas funções tem o módulo, o tamanho do código e o que exporta
function modulo(b) {
  let p = 8, nf = 0, codigo = 0;
  const u = () => { let r = 0, s = 0, c; do { c = b[p++]; r |= (c & 127) << s; s += 7; } while (c & 128); return r >>> 0; };
  while (p < b.length) { const id = b[p++], len = u(), st = p; if (id === 10) { codigo = len; nf = u(); } p = st + len; }
  return { bytes: b.length, nf, codigo, ex: WebAssembly.Module.exports(new WebAssembly.Module(b)).map((e) => e.name).sort() };
}
const APP = {
  nada: ': main >i { "ola" 0 }',
  numero: ': main >i { _nu_ps / 1. 3. 0 }',
  intl: ': main >i { _nu_intl 1234567.891 2 0 }',
  json: ': main >i { _js_pj _js_parse $"{\\"a\\":[1,2.5]}" 0 0 0 }',
  data: ': main >i { _dt_piso 1700000000000. 0 }',
  ordenar: ': main >i { = w A 2 = k A 2 !f k 2. !f + k 1 1. ! + w 1 1 _or_power w 2 k k 1 N @ w 0 }',
};
const SO = { nada: [], numero: ['memoria', 'texto', 'numero'], intl: ['memoria', 'texto', 'numero'], json: ['memoria', 'texto', 'numero', 'valor', 'json'], data: ['memoria', 'texto', 'numero', 'data'], ordenar: ['ordenar'] };

test('a biblioteca toda junta não muda o módulo: igual ao byte ao que só leva os módulos precisos (e nada sem uso)', () => {
  const linhas = [];
  const zero = modulo(compilar(APP.nada + '\n'));
  for (const [nome, app] of Object.entries(APP)) {
    const toda = compilar(fonte() + '\n' + app + '\n'), so = compilar((SO[nome].length ? fonte(SO[nome]) : '') + '\n' + app + '\n');
    assert.ok(Buffer.compare(toda, so) === 0, `${nome}: o módulo com a biblioteca toda é o mesmo que com ${SO[nome].join('+') || 'nada'}`);
    const m = modulo(toda);
    assert.deepStrictEqual(m.ex, ['_fl', '_ini', '_oa', '_start', 'main', 'memory'], `${nome}: a biblioteca não exporta nada`);
    linhas.push(`${nome}: ${m.bytes} bytes (+${m.bytes - zero.bytes}), ${m.nf} funções`);
  }
  // e a biblioteca toda viva (todas as funções como entradas): o que pesaria sem a poda
  const nomes = [...fonte().matchAll(/^: (_[a-z]{2}_[a-zA-Z0-9_]+) /gm)].map((x) => x[1]);
  const tudo = modulo(compilar(fonte() + '\n: main >i 0\n', nomes));
  linhas.push(`a biblioteca toda viva: ${tudo.bytes} bytes, ${tudo.nf} funções (${nomes.length} da biblioteca, em ${MODULOS.length} módulos)`);
  assert.ok(tudo.bytes > 100000);
  console.log('# ' + linhas.join('\n# '));
});
