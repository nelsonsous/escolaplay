// Testes da Onda Viva (Node): formas CPU vs significado, erro injetado, ponto fixo dentro do WebAssembly.
const fs = require('fs'), path = require('path'), assert = require('assert');
const R = path.join(__dirname, '..');
global.Significado = require(R + '/web/significado.js');
const OndaC = require(R + '/web/ondac.js'), Viva = require(R + '/web/viva.js');
const W = 960, H = 540;
let falhou = 0;
const ok = (nome, f) => Promise.resolve().then(f).then(() => console.log('ok   ' + nome), e => { falhou++; console.log('FALHA ' + nome + ': ' + e.message); });
(async () => {
  await OndaC.load(fs.readFileSync(R + '/web/ondac.wasm'));
  for (const [ex, t] of [['julia', 2.0], ['ondas', 1.0]]) {
    const src = fs.readFileSync(R + '/ex/' + ex + '.onda', 'utf8');
    const sig = Significado.funcao(src, 'px');
    await ok(ex + ': forma CPU igual ao significado, bit a bit, em 3000 pixeis', async () => {
      const f = await Viva.formaCPU(OndaC, src, 'px');
      assert.ok(f.fn, f.erro);
      const v = Viva.verificar(f.fn, sig, Viva.amostras(3000, W, H, 1), t, W, H, 0);
      assert.strictEqual(v.falhas.length, 0, JSON.stringify(v.falhas[0]));
      const ms = Viva.medir(f.fn, t, W, H, 20000).usPx, mi = Viva.medir(sig, t, W, H, 1500).usPx;
      console.log(`      significado ${mi.toFixed(2)} us/px, forma CPU ${ms.toFixed(3)} us/px (${(mi / ms).toFixed(0)}x)`);
    });
    await ok(ex + ': erro injetado e apanhado pelo significado', async () => {
      const m = Viva.mutar(src, 'px');
      assert.ok(m, 'sem constante para mutar');
      const f = await Viva.formaCPU(OndaC, m.src, 'px');
      const v = Viva.verificar(f.fn, sig, Viva.amostras(64, W, H, 2), t, W, H, 0);
      assert.ok(v.falhas.length > 0, 'mutante passou');
      console.log(`      ${m.de} -> ${m.para}: ${v.falhas.length}/64 pixeis errados, ex. (${v.falhas[0].x},${v.falhas[0].y}) ${Viva.hex(v.falhas[0].esperado)} vs ${Viva.hex(v.falhas[0].obtido)}`);
    });
  }
  await ok('significado recusa programa mal tipado', () => assert.throws(() => Significado.funcao(': px fffff>i x y t w h + 1 2.5\n: main >i 0', 'px')));
  await ok('compilador verificado dentro do WebAssembly (ponto fixo)', async () => {
    const r = await OndaC.compile(fs.readFileSync(R + '/build/ondac.onda', 'utf8'), null);
    const h = await Viva.sha256(r.text), seed = await Viva.sha256(fs.readFileSync(R + '/seed/ondac.c', 'utf8'));
    assert.strictEqual(h, seed);
  });
  console.log(falhou ? `\n${falhou} teste(s) falharam` : '\ntodos os testes passaram');
  process.exit(falhou ? 1 : 0);
})();
