// Os preços (volta 3): lidos no site da cadeia quando se escolhe um produto e pelo cron, guardados na D1 e mandados
// para a app ao lado de cada produto escolhido. Os sites das cadeias são a fingir (cadeias.mjs).
import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import worker, { UA } from '../proxy/src/worker.js';
import { precisa, refrescar, VALE_H } from '../proxy/src/precos.js';
import { kv } from './kv.mjs';
import { d1 } from './d1.mjs';
import { PRECOS, instalar, desinstalar } from './cadeias.mjs';

const APP = 'https://nelsonsous.github.io';
let env, pedidos;
beforeEach(() => { env = { KV: kv(), DB: d1(), ALLOWED_ORIGINS: APP }; PRECOS.clear(); pedidos = instalar(); });
after(desinstalar);
const call = (path, { metodo = 'GET', chave, corpo } = {}) => worker.fetch(new Request('https://x' + path, {
    method: metodo, headers: { origin: APP, ...(chave ? { authorization: 'Bearer ' + chave } : {}) }, body: corpo ? JSON.stringify(corpo) : undefined,
}), env);
const novo = async () => (await call('/api/aparelho', { metodo: 'POST' })).json();
const ops = async (chave, l) => (await call('/api/lista', { metodo: 'POST', chave, corpo: { ops: l } })).json();
const P = {
    continente: { id: '4421406', nome: 'Leite uht meio gordo mimosa', url: 'https://www.continente.pt/produto/leite-uht-meio-gordo-mimosa-4421406.html' },
    pingodoce: { id: '501', nome: 'Leite uht meio gordo mimosa', url: 'https://www.pingodoce.pt/home/produtos/laticinios/leite/leite-uht-meio-gordo-mimosa-501.html' },
    auchan: { id: '601', nome: 'Leite mimosa uht meio gordo 1l', url: 'https://www.auchan.pt/pt/alimentacao/leite/leite-mimosa-uht-meio-gordo-1l/601.html' },
    lidl: { id: '701', nome: 'Mimosa leite meio gordo', url: 'https://www.lidl.pt/p/mimosa-leite-meio-gordo/p701' },
};
const escolher = (id, c) => ({ o: 'p', id, c, p: P[c] });

test('escolher um produto lê logo o preço no site da cadeia, e a lista vem com ele (em cêntimos)', async () => {
    PRECOS.set('continente 4421406', { preco: 0.95 });
    PRECOS.set('pingodoce 501', { preco: 0.89, antes: 1.05 });
    const { chave } = await novo();
    const l = await ops(chave, [{ o: 'j', id: 'aaaa', t: 'leite', q: 6 }, escolher('aaaa', 'continente'), escolher('aaaa', 'pingodoce')]);
    assert.deepEqual(l.itens[0].p.continente, { ...P.continente, cent: 95, visto: new Date().toISOString().slice(0, 10) });
    assert.equal(l.itens[0].p.pingodoce.cent, 89);
    assert.equal(l.itens[0].p.pingodoce.antes, 105); // o preço riscado da promoção
    assert.equal(pedidos.length, 2);
    assert.equal(pedidos[0].init.headers['user-agent'], UA); // identifica-se como é
    assert.equal(pedidos[0].init.redirect, 'manual');
    // ler a lista não volta aos sites: o preço vem da D1
    const g = await (await call('/api/lista', { chave })).json();
    assert.equal(g.itens[0].p.continente.cent, 95);
    assert.equal(pedidos.length, 2);
    // escolher outra vez o mesmo produto (noutra coisa) também não: o preço é recente
    await ops(chave, [{ o: 'j', id: 'bbbb', t: 'leite magro' }, escolher('bbbb', 'continente')]);
    assert.equal(pedidos.length, 2);
    // o preço guardado não leva nada da casa (é de todos)
    assert.deepEqual(Object.keys(env.DB.linhas('SELECT * FROM preco')[0]).sort(),
        ['antes', 'ate', 'cadeia', 'cent', 'emb', 'esgotado', 'falhas', 'id', 'marca', 'nome', 'tentado', 'unid', 'url', 'visto']);
});

test('o Auchan lê-se pelo JSON do produto (pelo número); no máximo dois produtos novos por pedido', async () => {
    PRECOS.set('auchan 601', { preco: 0.99 });
    PRECOS.set('lidl 701', { preco: 0.85 });
    PRECOS.set('continente 4421406', { preco: 0.95 });
    const { chave } = await novo();
    const l = await ops(chave, [{ o: 'j', id: 'aaaa', t: 'leite' }, escolher('aaaa', 'auchan'), escolher('aaaa', 'lidl'), escolher('aaaa', 'continente')]);
    assert.match(pedidos[0].url, /Product-Variation\?pid=601&quantity=1$/);
    assert.equal(l.itens[0].p.auchan.cent, 99);
    assert.equal(l.itens[0].p.lidl.cent, 85);
    assert.equal(l.itens[0].p.continente.cent, undefined); // fica para o cron
    assert.equal(pedidos.length, 2);
});

test('um produto que a cadeia já não tem: fica sem preço e não se volta a pedir logo', async () => {
    const { chave } = await novo();
    const l = await ops(chave, [{ o: 'j', id: 'aaaa', t: 'leite' }, escolher('aaaa', 'lidl')]);
    assert.equal(l.itens[0].p.lidl.cent, undefined);
    assert.deepEqual(env.DB.linhas('SELECT cadeia, falhas, cent FROM preco'), [{ cadeia: 'lidl', falhas: 1, cent: null }]);
    assert.equal(pedidos.length, 1);
    assert.equal((await refrescar(env.DB)).lidos, 0);
    assert.equal(pedidos.length, 1);
});

test('quando se volta a pedir: preço com mais de 20 h, e depois de uma falha espera-se cada vez mais', () => {
    const agora = new Date('2026-11-15T12:00:00Z');
    const h = (n) => new Date(agora.getTime() - n * 3600e3).toISOString();
    assert.equal(precisa(null, agora), true);
    assert.equal(precisa({ visto: h(VALE_H - 1), tentado: h(VALE_H - 1), falhas: 0 }, agora), false);
    assert.equal(precisa({ visto: h(VALE_H + 1), tentado: h(VALE_H + 1), falhas: 0 }, agora), true);
    assert.equal(precisa({ visto: null, tentado: h(0.4), falhas: 1 }, agora), false); // meia hora
    assert.equal(precisa({ visto: null, tentado: h(0.6), falhas: 1 }, agora), true);
    assert.equal(precisa({ visto: null, tentado: h(3), falhas: 4 }, agora), false); // quatro horas
    assert.equal(precisa({ visto: null, tentado: h(23), falhas: 20 }, agora), false); // no máximo um dia
    assert.equal(precisa({ visto: null, tentado: h(25), falhas: 20 }, agora), true);
});

test('o cron: os preços velhos dos produtos que estão nas listas, um por cadeia de cada vez', async () => {
    for (const [c, p] of Object.entries(P)) PRECOS.set(c + ' ' + p.id, { preco: 1 });
    PRECOS.set('continente 12', { preco: 2.5 });
    const { chave } = await novo();
    const arroz = { id: '12', nome: 'Arroz agulha', url: 'https://www.continente.pt/produto/arroz-agulha-cigala-12.html' };
    // sem rede quando se escolheram: ficam sem preço
    globalThis.fetch = async () => { throw new Error('sem rede'); };
    await ops(chave, [{ o: 'j', id: 'aaaa', t: 'leite' }, { o: 'j', id: 'bbbb', t: 'arroz' }, escolher('aaaa', 'continente'), escolher('aaaa', 'lidl'),
        { o: 'p', id: 'bbbb', c: 'continente', p: arroz }, escolher('aaaa', 'auchan')]);
    pedidos = instalar();
    // uma hora depois (a espera de meia hora de uma falha já passou)
    const depois = new Date(Date.now() + 3600e3);
    let r = await refrescar(env.DB, depois);
    assert.deepEqual(r, { lidos: 3, comPreco: 3 }); // continente, lidl, auchan: um de cada
    assert.equal(pedidos.filter((p) => p.url.includes('continente')).length, 1);
    r = await refrescar(env.DB, depois);
    assert.deepEqual(r, { lidos: 1, comPreco: 1 }); // o outro do Continente
    assert.deepEqual(await refrescar(env.DB, depois), { lidos: 0, comPreco: 0 }); // tudo em dia
    const l = await (await call('/api/lista', { chave })).json();
    assert.equal(l.itens[1].p.continente.cent, 250);
    // um dia depois volta a ler; um produto que saiu das listas já não se lê
    await ops(chave, [{ o: 'x', id: 'bbbb' }]);
    const amanha = new Date(depois.getTime() + 21 * 3600e3);
    pedidos.length = 0;
    assert.deepEqual(await refrescar(env.DB, amanha), { lidos: 3, comPreco: 3 });
    assert.deepEqual(await refrescar(env.DB, amanha), { lidos: 0, comPreco: 0 });
    assert.ok(!pedidos.some((p) => p.url.includes('arroz')));
});

test('o cron do Worker chama o refrescar', async () => {
    PRECOS.set('lidl 701', { preco: 0.85 });
    const { chave } = await novo();
    globalThis.fetch = async () => new Response('', { status: 503 });
    await ops(chave, [{ o: 'j', id: 'aaaa', t: 'leite' }, escolher('aaaa', 'lidl')]);
    pedidos = instalar();
    const espera = [];
    await worker.scheduled({ scheduledTime: Date.now() + 3600e3 }, env, { waitUntil: (p) => espera.push(p) });
    await Promise.all(espera);
    assert.equal(env.DB.linhas('SELECT cent FROM preco')[0].cent, 85);
});
