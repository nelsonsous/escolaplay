// Apps em Onda: o anfitriao (rt/anfitriao.js) corre o main uma vez e depois chama as funcoes exportadas em cada
// evento. Testa a app de exemplo (ex/app/contador.onda) num browser a serio: cliques, armazem e rede.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { execSync } = require('child_process');
const R = path.join(__dirname, '..');

test('biblioteca de apps: JSON, numeros pt-PT, HTML e regioes de memoria', () => {
  const src = fs.readFileSync(path.join(R, 'lib/app.onda'), 'utf8') + `
: main >i {
  = t tnovo 400
  O t "{\\"a\\": 1.5, \\"b\\": [1, -2.25e2, \\"x\\\\\\"y\\\\u00e9\\"], \\"c\\": {\\"d\\": true}, \\"f\\": 12345678.9}" O 0
  = r json t
  = k tnovo 4 O k "a" O 0 G jnum jget r k "|"
  = k tnovo 4 O k "b" O 0 = b jget r k N jn b "|" G jnum jidx b 1 "|" tpor jtxt jidx b 2 "|"
  = k tnovo 4 O k "f" O 0 pdec jnum jget r k 2 "|" pint 1234 "|" pint -1234567 "|"
  = h tnovo 40 O h "<a>&'" O 0 thtml h "|"
  = e tnovo 40 O e "mais\\t42" O 0 tpor tcampo e 0 "|" N tint tcampo e 1 "|"
  = m marca = x A 100 ! x 7 solta m = y A 10 N @ y
  0 }`;
  fs.mkdirSync(path.join(R, 'build'), { recursive: true });
  fs.writeFileSync(path.join(R, 'build/libteste.onda'), src);
  execSync(`${R}/build/ondac -w < ${R}/build/libteste.onda > ${R}/build/libteste.wasm`);
  const out = execSync(`node ${R}/wasm/host.js ${R}/build/libteste.wasm`).toString();
  const nf = (x, d) => new Intl.NumberFormat('pt-PT', d == null ? {} : { minimumFractionDigits: d, maximumFractionDigits: d }).format(x);
  assert.strictEqual(out, ['1.5', '3', '-225', 'x"yé', nf(12345678.9, 2), nf(1234), nf(-1234567), '&lt;a&gt;&amp;&#39;', 'mais', '42', '0'].join('|'));
});

test('app de exemplo no browser: cliques, armazem e rede', async (t) => {
  let pw;
  try { pw = require('playwright'); } catch { t.skip('sem playwright'); return; }
  execSync(`cat ${R}/lib/app.onda ${R}/ex/app/contador.onda | ${R}/build/ondac -w > ${R}/ex/app/contador.wasm`);
  const tipos = { '.html': 'text/html', '.js': 'text/javascript', '.wasm': 'application/wasm', '.json': 'application/json' };
  const srv = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split('?')[0]);
    if (u.endsWith('/dados.json')) { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end('{"valor": 1234.5}'); }
    const f = path.join(R, u);
    if (!f.startsWith(R) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': tipos[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  }).listen(0);
  const br = await pw.chromium.launch();
  try {
    const pg = await br.newPage();
    const erros = [];
    pg.on('pageerror', (e) => erros.push(e.message));
    const url = `http://127.0.0.1:${srv.address().port}/ex/app/index.html`;
    await pg.goto(url);
    await pg.waitForSelector('#n');
    await pg.waitForFunction(() => /1 234,50|1234,50/.test(document.querySelector('#rede').textContent));
    assert.match(await pg.textContent('#rede'), /valor 1[  ]?234,50 \(HTTP 200\)/);
    assert.strictEqual(await pg.textContent('#n'), '0');
    for (let i = 0; i < 3; i++) await pg.click('[data-onda="mais"]');
    await pg.click('[data-onda="menos"]');
    assert.strictEqual(await pg.textContent('#n'), '2');
    // o valor fica guardado: ao voltar a abrir, comeca em 2
    await pg.reload();
    await pg.waitForSelector('#n');
    assert.strictEqual(await pg.textContent('#n'), '2');
    // memoria: 300 cliques nao fazem crescer o monte (cada evento solta o que reservou)
    const h0 = await pg.evaluate(() => Number(new BigInt64Array(window.app.exports.memory.buffer, 15 * 8, 1)[0]));
    for (let i = 0; i < 300; i++) await pg.evaluate(() => document.querySelector('[data-onda="mais"]').click());
    const h1 = await pg.evaluate(() => Number(new BigInt64Array(window.app.exports.memory.buffer, 15 * 8, 1)[0]));
    assert.strictEqual(await pg.textContent('#n'), '302');
    assert.ok(h1 - h0 < 50, `o monte cresceu ${h1 - h0} palavras`);
    assert.deepStrictEqual(erros, []);
  } finally { await br.close(); srv.close(); }
});
