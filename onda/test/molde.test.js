// O molde de app (onda/molde): monta-se e abre num browser a sério — a lista vem da rede, a procura, o filtro, a
// folha, os favoritos guardados, a falha de rede e a memória que não cresce com o uso.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { execFileSync } = require('child_process');
const R = path.join(__dirname, '..');

test('molde: a app monta-se e funciona no browser', async (t) => {
  const out = execFileSync('node', [path.join(R, 'molde/build.mjs')]).toString();
  assert.match(out, /gerado\/app\.wasm, \d+ bytes/);
  const wasm = fs.readFileSync(path.join(R, 'molde/gerado/app.wasm'));
  assert.ok(wasm.length < 60000, `o módulo tem ${wasm.length} bytes`);
  // só as funções dos eventos ficam à vista do anfitrião
  const nomes = WebAssembly.Module.exports(new WebAssembly.Module(wasm)).map((e) => e.name).filter((n) => !n.startsWith('_') && n !== 'memory');
  assert.deepStrictEqual(nomes.sort(), ['clique', 'escreve', 'lido', 'main']);
  assert.strictEqual(fs.readFileSync(path.join(R, 'molde/gerado/anfitriao.js'), 'utf8'), fs.readFileSync(path.join(R, 'rt/anfitriao.js'), 'utf8'));

  let pw;
  try { pw = require('playwright'); } catch { t.skip('sem playwright'); return; }
  const tipos = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
  let falha = false;
  const srv = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split('?')[0]);
    const f = path.join(R, u);
    if ((falha && u.endsWith('dados.json')) || !f.startsWith(R) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(falha ? 503 : 404); return res.end(); }
    res.writeHead(200, { 'Content-Type': tipos[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  }).listen(0);
  const br = await pw.chromium.launch();
  try {
    const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'pt-PT' });
    const pg = await ctx.newPage();
    const erros = [];
    pg.on('pageerror', (e) => erros.push(e.message));
    pg.on('console', (m) => { if (m.type() === 'error' && !/503/.test(m.text())) erros.push(m.text()); });
    const url = `http://127.0.0.1:${srv.address().port}/molde/index.html`;
    const dados = JSON.parse(fs.readFileSync(path.join(R, 'molde/dados.json'), 'utf8')).itens;
    const nf = (x) => new Intl.NumberFormat('pt-PT').format(x);
    const linhas = () => pg.locator('#lista .linha').count();
    await pg.goto(url);
    await pg.waitForSelector('#lista .linha');
    // tudo: uma linha por item, os números como o Intl pt-PT, o total
    assert.strictEqual(await linhas(), dados.length);
    assert.strictEqual(await pg.textContent('#lista .linha >> nth=0'), `${dados[0].nome}${dados[0].grupo}${nf(dados[0].valor)}`);
    assert.strictEqual(await pg.textContent('#lista .total'), `${dados.length} lugares · ${nf(dados.reduce((s, d) => s + d.valor, 0))} habitantes`);
    // um botão por grupo, pela ordem em que aparecem
    const grupos = [...new Set(dados.map((d) => d.grupo))];
    assert.deepStrictEqual(await pg.locator('#filtros button').allTextContents(), ['Todos', ...grupos]);
    await pg.click('#filtros button:has-text("Norte")');
    assert.strictEqual(await linhas(), dados.filter((d) => d.grupo === 'Norte').length);
    assert.strictEqual(await pg.textContent('#filtros button.on'), 'Norte');
    // a procura (sem olhar a maiúsculas) junta-se ao filtro, e o campo não perde o cursor ao escrever
    await pg.fill('header input', 'PO');
    assert.deepStrictEqual(await pg.locator('#lista .linha b').allTextContents(), ['Porto']);
    await pg.type('header input', 'rt');
    assert.strictEqual(await pg.inputValue('header input'), 'POrt');
    await pg.fill('header input', 'zzz');
    assert.strictEqual(await pg.textContent('#lista'), 'Nada por aqui.');
    await pg.fill('header input', '');
    await pg.click('#filtros button:has-text("Todos")');
    assert.strictEqual(await linhas(), dados.length);
    // a folha: o texto dos dados aparece escapado (não vira HTML)
    await pg.click('.linha:has-text("Funchal")');
    await pg.waitForSelector('#folha .cartao.entra');
    assert.match(await pg.textContent('#folha .cartao'), /<entre o mar & a serra>/);
    assert.strictEqual(await pg.textContent('#folha .grande'), `${nf(106000)} habitantes`);
    // guardar: o botão muda sem a folha voltar a entrar, a aba conta, a linha ganha a estrela
    await pg.click('#folha [data-onda^="fav:"]');
    assert.strictEqual(await pg.textContent('#folha [data-onda^="fav:"]'), '★ Guardado');
    assert.strictEqual(await pg.locator('#folha .cartao.entra').count(), 0);
    await pg.keyboard.press('Escape');
    assert.strictEqual(await pg.locator('#folha .cartao').count(), 0);
    await pg.click('.linha:has-text("Évora")');
    await pg.click('#folha [data-onda^="fav:"]');
    await pg.tap('#folha .veu', { position: { x: 20, y: 20 } });
    assert.strictEqual(await pg.locator('#folha .cartao').count(), 0);
    assert.strictEqual(await pg.textContent('#abas button >> nth=1'), 'Favoritos · 2');
    await pg.click('#abas button >> nth=1');
    assert.deepStrictEqual(await pg.locator('#lista .linha b').allTextContents(), ['Évora', 'Funchal']);
    // ficam guardados: ao voltar a abrir, lá estão
    assert.strictEqual(await pg.evaluate(() => localStorage.getItem('molde:favoritos')), 'evora,funchal,');
    await pg.reload();
    await pg.waitForSelector('#lista .linha');
    assert.strictEqual(await pg.textContent('#abas button >> nth=1'), 'Favoritos · 2');
    assert.strictEqual(await pg.locator('#lista .num i').count(), 2);
    // memória: 300 eventos não fazem crescer o monte (cada evento solta o que reservou)
    const topo = () => pg.evaluate(() => Number(new BigInt64Array(window.app.exports.memory.buffer, 15 * 8, 1)[0]));
    await pg.click('.linha >> nth=0'); await pg.keyboard.press('Escape');
    const h0 = await topo();
    await pg.evaluate(() => {
      const c = document.querySelector('header input');
      const escreve = (v) => { c.value = v; c.dispatchEvent(new Event('input', { bubbles: true })); };
      for (let i = 0; i < 100; i++) {
        escreve('é'.repeat(i)); escreve(''); // mais do que cabe no lugar fixo da procura: corta sem partir um carácter
        document.querySelector('.linha').click(); document.querySelector('#folha [data-onda^="fav:"]').click(); document.querySelector('#folha .veu').click();
      }
    });
    assert.strictEqual(await topo(), h0);
    assert.strictEqual(await linhas(), dados.length);
    // sem rede: diz que falhou e deixa tentar outra vez
    falha = true;
    await pg.reload();
    await pg.waitForSelector('[data-onda="tenta:0"]');
    assert.match(await pg.textContent('#lista'), /Sem ligação/);
    falha = false;
    await pg.click('[data-onda="tenta:0"]');
    await pg.waitForSelector('#lista .linha');
    assert.strictEqual(await linhas(), dados.length);
    assert.deepStrictEqual(erros, []);
  } finally { await br.close(); srv.close(); }
});
