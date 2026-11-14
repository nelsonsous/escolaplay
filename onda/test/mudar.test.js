// O mudar do anfitrião de apps (rt/anfitriao.js, porta 119): pôr um HTML novo num elemento mexendo só no que mudou.
// Num browser a sério (Chromium): o resultado é o mesmo do innerHTML, mas os nós que continuam iguais são os mesmos
// — as imagens não voltam a carregar, uma lista com chaves aguenta tirar, trocar e mudar de ordem, um campo fica com
// o que se escreveu se a app o acompanha, e o <details> fica como a pessoa o deixou.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const R = path.join(__dirname, '..');

test('mudar: o mesmo resultado do innerHTML, com os nós que continuam iguais a ficarem os mesmos', async (t) => {
  let pw;
  try { pw = require('playwright'); } catch { t.skip('sem playwright'); return; }
  const browser = await pw.chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.setContent('<!doctype html><div id="a"></div><div id="ref"></div>');
  await page.addScriptTag({ content: fs.readFileSync(path.join(R, 'rt/anfitriao.js'), 'utf8') });
  // põe `antes` com innerHTML, marca os nós, muda para `depois` e diz: se ficou igual ao innerHTML e que nós são os mesmos
  const caso = (antes, depois, sel) => page.evaluate(([antes, depois, sel]) => {
    const a = document.getElementById('a'), ref = document.getElementById('ref');
    a.innerHTML = antes;
    const marcados = sel ? [...a.querySelectorAll(sel)] : [];
    marcados.forEach((n, i) => { n.__n = i; });
    OndaApp.mudar(a, depois);
    ref.innerHTML = depois;
    return { igual: a.innerHTML === ref.innerHTML, html: a.innerHTML, mesmos: sel ? [...a.querySelectorAll(sel)].map((n) => (n.__n === undefined ? 'novo' : n.__n)) : [] };
  }, [antes, depois, sel]);

  // texto e atributos: o nó fica, muda só o que é diferente
  let r = await caso('<p class="x" title="t">olá <b>mundo</b></p>', '<p class="y">adeus <b>mundo</b><i>!</i></p>', 'p, b');
  assert.deepStrictEqual([r.igual, r.mesmos], [true, [0, 1]]);
  // outro elemento no mesmo sítio: troca-se um pelo outro, e os seguintes continuam
  r = await caso('<h1>t</h1><p>a</p><p>b</p>', '<h2>t</h2><p>a</p><p>c</p>', 'p');
  assert.deepStrictEqual([r.igual, r.mesmos], [true, [0, 1]]);
  // uma lista com chaves: tirar o do meio, pôr um novo no início, trocar a ordem — os que ficam são os mesmos nós
  const li = (ks) => ks.map((k) => `<li data-chave="${k}"><img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" alt=""><span>${k}</span></li>`).join('');
  r = await caso(`<ul>${li(['a', 'b', 'c', 'd'])}</ul>`, `<ul>${li(['a', 'c', 'd'])}</ul>`, 'img');
  assert.deepStrictEqual([r.igual, r.mesmos], [true, [0, 2, 3]], 'tirar: as imagens das outras linhas são as mesmas');
  r = await caso(`<ul>${li(['a', 'b', 'c'])}</ul>`, `<ul>${li(['z', 'a', 'b', 'c'])}</ul>`, 'img');
  assert.deepStrictEqual([r.igual, r.mesmos], [true, ['novo', 0, 1, 2]], 'pôr no início');
  r = await caso(`<ul>${li(['a', 'b', 'c', 'd'])}</ul>`, `<ul>${li(['d', 'b', 'x', 'a'])}</ul>`, 'img');
  assert.deepStrictEqual([r.igual, r.mesmos], [true, [3, 1, 'novo', 0]], 'mudar de ordem, com um novo e um a sair');
  // sem chaves, tirar o do meio reescreve os seguintes no sítio (o resultado é o mesmo; as chaves é que poupam)
  r = await caso('<ul><li>a</li><li>b</li><li>c</li></ul>', '<ul><li>a</li><li>c</li></ul>', 'li');
  assert.deepStrictEqual([r.igual, r.mesmos], [true, [0, 1]]);
  // chaves repetidas e ids: não se perde nada nem se repete
  r = await caso('<i data-chave="k">1</i><i data-chave="k">2</i><b id="z">3</b>', '<b id="z">3</b><i data-chave="k">2</i><i data-chave="k">1</i>', 'i, b');
  assert.strictEqual(r.igual, true);
  // o SVG (dentro de um elemento de HTML) muda como o resto
  r = await caso('<svg viewBox="0 0 10 10"><path class="l" d="M0 0L1 1"/></svg>', '<svg viewBox="0 0 10 10"><path class="alvo" d="M0 1"/><path class="l" d="M0 0L2 2"/></svg>', 'svg');
  assert.deepStrictEqual([r.igual, r.mesmos], [true, [0]]);
  assert.strictEqual(await page.evaluate(() => document.querySelector('#a path').namespaceURI), 'http://www.w3.org/2000/svg');

  // os campos: o valor é o que a app escreve. Se a app acompanha o que se escreveu, fica (com o foco); se o limpa, limpa
  const campo = await page.evaluate(() => {
    const a = document.getElementById('a');
    a.innerHTML = '<input id="c" value=""><textarea id="t"></textarea><input id="livre">';
    const c = a.querySelector('#c'), tx = a.querySelector('#t'), livre = a.querySelector('#livre');
    c.focus(); c.value = 'jazz'; tx.value = 'mais calma'; livre.value = 'fica';
    const out = [];
    OndaApp.mudar(a, '<input id="c" value="jazz"><textarea id="t">mais calma</textarea><input id="livre"><p>novo</p>'); // a app acompanhou
    out.push([a.querySelector('#c') === c, c.value, document.activeElement === c, tx.value, livre.value]);
    OndaApp.mudar(a, '<input id="c" value=""><textarea id="t"></textarea><input id="livre">'); // a app limpou os dois
    out.push([c.value, tx.value, livre.value]);
    return out;
  });
  assert.deepStrictEqual(campo, [[true, 'jazz', true, 'mais calma', 'fica'], ['', '', 'fica']]);
  // o <details> aberto pela pessoa continua aberto; o que o HTML abre, abre
  const det = await page.evaluate(() => {
    const a = document.getElementById('a');
    a.innerHTML = '<details><summary>s</summary><p>1</p></details>';
    a.querySelector('details').open = true;
    OndaApp.mudar(a, '<details><summary>s</summary><p>2</p></details>');
    const um = [a.querySelector('details').open, a.querySelector('p').textContent];
    OndaApp.mudar(a, '<details open><summary>s</summary><p>3</p></details><details><summary>outro</summary></details>');
    return [um, [...a.querySelectorAll('details')].map((d) => d.open)];
  });
  assert.deepStrictEqual(det, [[true, '2'], [true, false]]);
  // muitas voltas ao acaso: o resultado é sempre o do innerHTML
  const acaso = await page.evaluate(() => {
    let s = 7;
    const rnd = (n) => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s % n; };
    const no = (p) => {
      const k = rnd(6);
      if (p > 2 || k === 0) return 'texto' + rnd(5);
      const tag = ['div', 'span', 'p', 'b', 'li'][rnd(5)], chave = rnd(3) ? '' : ` data-chave="k${rnd(6)}"`, cls = rnd(2) ? ` class="c${rnd(4)}"` : '';
      let f = ''; for (let i = rnd(4); i > 0; i--) f += no(p + 1);
      return `<${tag}${chave}${cls}>${f}</${tag}>`;
    };
    const a = document.getElementById('a'), ref = document.getElementById('ref');
    a.innerHTML = '';
    let maus = 0;
    for (let v = 0; v < 400; v++) {
      let h = ''; for (let i = rnd(6); i > 0; i--) h += no(0);
      OndaApp.mudar(a, h);
      ref.innerHTML = h;
      if (a.innerHTML !== ref.innerHTML) maus++;
    }
    return maus;
  });
  assert.strictEqual(acaso, 0, '400 árvores ao acaso, cada uma mudada a partir da anterior');
});
