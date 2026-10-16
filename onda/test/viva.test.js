// Testes da Onda Viva, integrados no node:test: formas CPU vs significado, erro injetado apanhado, o significado
// recusa codigo mal tipado, e o compilador verifica-se a si proprio dentro do WebAssembly (ponto fixo).
const { test, before } = require('node:test');
const assert = require('node:assert');
const fs = require('fs'), path = require('path');
const R = path.join(__dirname, '..');
global.Significado = require(R + '/web/significado.js');
const OndaC = require(R + '/web/ondac.js'), Viva = require(R + '/web/viva.js');
const W = 960, H = 540;

before(async () => { await OndaC.load(fs.readFileSync(R + '/seed/ondac.wasm')); });

for (const [ex, t] of [['julia', 2.0], ['ondas', 1.0]]) {
  test(ex + ': forma CPU igual ao significado, bit a bit, em 3000 pixeis', async () => {
    const src = fs.readFileSync(R + '/ex/' + ex + '.onda', 'utf8');
    const sig = Significado.funcao(src, 'px');
    const f = await Viva.formaCPU(OndaC, src, 'px');
    assert.ok(f.fn, f.erro);
    const v = Viva.verificar(f.fn, sig, Viva.amostras(3000, W, H, 1), t, W, H, 0);
    assert.strictEqual(v.falhas.length, 0, v.falhas[0] && JSON.stringify(v.falhas[0]));
  });

  test(ex + ': erro injetado e apanhado pelo significado', async () => {
    const src = fs.readFileSync(R + '/ex/' + ex + '.onda', 'utf8');
    const sig = Significado.funcao(src, 'px');
    const m = Viva.mutar(src, 'px');
    assert.ok(m, 'sem constante para mutar');
    const f = await Viva.formaCPU(OndaC, m.src, 'px');
    const v = Viva.verificar(f.fn, sig, Viva.amostras(64, W, H, 2), t, W, H, 0);
    assert.ok(v.falhas.length > 0, 'mutante passou pela verificacao');
  });
}

test('o significado recusa um programa mal tipado', () => {
  assert.throws(() => Significado.funcao(': px fffff>i x y t w h + 1 2.5\n: main >i 0', 'px'));
});

test('o compilador verifica-se a si proprio dentro do WebAssembly (ponto fixo)', async () => {
  const r = await OndaC.compile(fs.readFileSync(R + '/build/ondac.onda', 'utf8'), null);
  const h = await Viva.sha256(r.text), seed = await Viva.sha256(fs.readFileSync(R + '/seed/ondac.c', 'utf8'));
  assert.strictEqual(h, seed, 'o WebAssembly nao reproduziu a semente C');
});
