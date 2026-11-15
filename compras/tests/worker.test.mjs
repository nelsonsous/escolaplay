// O conector da Compras (volta 1: a sonda) com o fetch simulado.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import worker, { VERSION, UA, hostPermitido } from '../proxy/src/worker.js';

const ORIGIN = 'https://compras.example.workers.dev';
const TOKEN = 'segredo-da-sonda-' + 'x'.repeat(32);
let env, pedidos;
beforeEach(() => {
    env = { SONDA_TOKEN: TOKEN };
    pedidos = [];
    globalThis.fetch = async (u, init = {}) => {
        pedidos.push({ url: String(u), init });
        const h = new Headers({ 'content-type': 'text/html; charset=utf-8', server: 'exemplo', 'cf-ray': 'abc-LIS' });
        h.append('set-cookie', '__cf_bm=valor-secreto; path=/; expires=Sun, 15 Nov 2026 10:00:00 GMT');
        h.append('set-cookie', 'sessao=outro-valor; path=/');
        return new Response('<html>preço</html>', { status: 200, headers: h });
    };
});
const call = (path, init = {}) => worker.fetch(new Request(ORIGIN + path, init), env, { waitUntil() {} });
const sonda = (url, token = TOKEN) => call('/sonda?url=' + encodeURIComponent(url), token ? { headers: { authorization: 'Bearer ' + token } } : {});

test('a raiz diz a versão e a fase', async () => {
    const r = await call('/');
    assert.equal(r.status, 200);
    assert.deepEqual(await r.json(), { app: 'compras', conector: VERSION, fase: 'volta 6: estimativas explicadas' });
});

test('sem o segredo, ou com outro, a sonda recusa e não vai à rede', async () => {
    assert.equal((await sonda('https://www.continente.pt/', null)).status, 401);
    assert.equal((await sonda('https://www.continente.pt/', 'outro')).status, 401);
    assert.equal((await sonda('https://www.continente.pt/', TOKEN + 'x')).status, 401);
    assert.equal(pedidos.length, 0);
});

test('sem SONDA_TOKEN no Worker a sonda fica desligada', async () => {
    env = {};
    assert.equal((await sonda('https://www.continente.pt/')).status, 503);
    assert.equal(pedidos.length, 0);
});

test('só https e só os domínios das cadeias', async () => {
    assert.equal((await sonda('http://www.continente.pt/')).status, 400);
    assert.equal((await sonda('https://exemplo.com/')).status, 400);
    assert.equal((await sonda('https://continente.pt.exemplo.com/')).status, 400);
    assert.equal((await sonda('https://falsocontinente.pt/')).status, 400);
    assert.equal((await sonda('nada')).status, 400);
    assert.equal(pedidos.length, 0);
    assert.ok(hostPermitido('www.continente.pt') && hostPermitido('continente.pt') && hostPermitido('WORLD.openfoodfacts.org'));
    assert.ok(!hostPermitido('continente.pt.mal.com') && !hostPermitido('xcontinente.pt') && !hostPermitido(''));
});

test('só GET', async () => {
    const r = await call('/sonda?url=' + encodeURIComponent('https://www.continente.pt/'), { method: 'POST', headers: { authorization: 'Bearer ' + TOKEN } });
    assert.equal(r.status, 405);
    assert.equal(pedidos.length, 0);
});

test('passa a resposta tal e qual, com o estado, o tempo e os cabeçalhos que interessam', async () => {
    const r = await sonda('https://www.continente.pt/pesquisa/?q=leite');
    assert.equal(r.status, 200);
    assert.equal(await r.text(), '<html>preço</html>');
    assert.equal(r.headers.get('x-sonda-status'), '200');
    assert.match(r.headers.get('x-sonda-ms'), /^\d+$/);
    const cab = JSON.parse(r.headers.get('x-sonda-cabecalhos'));
    assert.equal(cab.server, 'exemplo');
    assert.equal(cab['cf-ray'], 'abc-LIS');
    assert.equal(cab['set-cookie'], '__cf_bm, sessao'); // só os nomes, nunca os valores
    assert.equal(pedidos.length, 1);
    assert.equal(pedidos[0].url, 'https://www.continente.pt/pesquisa/?q=leite');
    assert.equal(pedidos[0].init.headers['user-agent'], UA); // identifica-se como é
    assert.equal(pedidos[0].init.redirect, 'manual');
});

test('um redirecionamento fica à vista (não se segue)', async () => {
    globalThis.fetch = async (u) => { pedidos.push({ url: String(u) }); return new Response(null, { status: 302, headers: { location: 'https://www.continente.pt/outro' } }); };
    const r = await sonda('https://www.continente.pt/');
    assert.equal(r.headers.get('x-sonda-status'), '302');
    assert.equal(JSON.parse(r.headers.get('x-sonda-cabecalhos')).location, 'https://www.continente.pt/outro');
});

test('se a cadeia não responde, diz porquê', async () => {
    globalThis.fetch = async () => { throw new Error('ligação recusada'); };
    const r = await sonda('https://www.lidl.pt/');
    assert.equal(r.status, 502);
    assert.equal((await r.json()).motivo, 'ligação recusada');
});

test('caminhos que não existem dão 404', async () => {
    assert.equal((await call('/nada')).status, 404);
    assert.equal((await call('/api/nada')).status, 401); // a API pede sempre a chave do aparelho primeiro
});

// /sonda/produto: vai buscar um produto e lê-o com a fonte da cadeia
const fixture = (f) => readFileSync(new URL(`./fontes/${f}`, import.meta.url), 'utf8');
const produtoDe = (q, token = TOKEN) => call('/sonda/produto?' + new URLSearchParams(q), token ? { headers: { authorization: 'Bearer ' + token } } : {});

test('sonda/produto: lê a página com a fonte da cadeia', async () => {
    const url = 'https://www.pingodoce.pt/home/produtos/mercearia/arroz-massa-e-leguminosas/massa/massa-esparguete-nacional-10756.html';
    globalThis.fetch = async (u, init = {}) => { pedidos.push({ url: String(u), init }); return new Response(fixture('pingodoce-esparguete.html'), { status: 200 }); };
    const r = await produtoDe({ cadeia: 'pingodoce', url });
    assert.equal(r.status, 200);
    const d = await r.json();
    assert.equal(d.cadeia, 'pingodoce');
    assert.equal(d.estado, 200);
    assert.equal(d.produto.preco, 1.26);
    assert.equal(d.produto.url, url);
    assert.equal(pedidos[0].url, url);
    assert.equal(pedidos[0].init.headers['user-agent'], UA);
});

test('sonda/produto: pelo número, onde a cadeia tem endereço por número (Auchan, o JSON)', async () => {
    globalThis.fetch = async (u, init = {}) => { pedidos.push({ url: String(u), init }); return new Response(fixture('auchan-arroz-oriente.json'), { status: 200 }); };
    const d = await (await produtoDe({ cadeia: 'auchan', id: '3350' })).json();
    assert.equal(d.produto.ean, '5601228228013');
    assert.equal(pedidos[0].url, 'https://www.auchan.pt/on/demandware.store/Sites-AuchanPT-Site/pt_PT/Product-Variation?pid=3350&quantity=1');
    assert.match(pedidos[0].init.headers.accept, /application\/json/);
});

test('sonda/produto: a cadeia recusa — fica o estado, sem produto', async () => {
    globalThis.fetch = async () => new Response('<html>Access denied</html>', { status: 403 });
    const d = await (await produtoDe({ cadeia: 'lidl', url: 'https://www.lidl.pt/p/milbona-iogurte-grego/p11041532' })).json();
    assert.equal(d.estado, 403);
    assert.equal(d.produto, null);
});

test('sonda/produto: as mesmas regras da sonda (segredo, cadeia conhecida, domínio da lista)', async () => {
    assert.equal((await produtoDe({ cadeia: 'auchan', id: '3350' }, null)).status, 401);
    const r = await produtoDe({ cadeia: 'nenhuma', id: '1' });
    assert.equal(r.status, 400);
    assert.deepEqual((await r.json()).cadeias, ['continente', 'pingodoce', 'auchan', 'lidl']);
    assert.equal((await produtoDe({ cadeia: 'continente', url: 'https://exemplo.com/produto.html' })).status, 400);
    assert.equal((await produtoDe({ cadeia: 'continente', id: '4421406' })).status, 400); // o Continente precisa do endereço
    assert.equal(pedidos.length, 0);
});
