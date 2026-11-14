// A casa e a lista no conector (volta 2), com a KV simulada.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import worker, { esquecerIndices } from '../proxy/src/worker.js';
import { montarIndice } from '../proxy/src/indice.js';
import { aplicar, listaVazia, MAX_OPS } from '../proxy/src/casa.js';
import { kv } from './kv.mjs';

const ORIGIN = 'https://compras.example.workers.dev';
const APP = 'https://nelsonsous.github.io';
let env;
beforeEach(() => { env = { KV: kv(), ALLOWED_ORIGINS: APP }; esquecerIndices(); });
const call = (path, { metodo = 'GET', chave, corpo, origem = APP } = {}) => worker.fetch(new Request(ORIGIN + path, {
    method: metodo,
    headers: { ...(chave ? { authorization: 'Bearer ' + chave } : {}), ...(origem ? { origin: origem } : {}), ...(corpo ? { 'content-type': 'application/json' } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
}), env, { waitUntil() {} });
const novo = async () => (await call('/api/aparelho', { metodo: 'POST' })).json();
const ops = (chave, l) => call('/api/lista', { metodo: 'POST', chave, corpo: { ops: l } });

test('um aparelho novo fica numa casa nova, com um código para convidar', async () => {
    const r = await call('/api/aparelho', { metodo: 'POST' });
    assert.equal(r.status, 201);
    const a = await r.json();
    assert.match(a.chave, /^[a-f0-9]{16}\.[a-f0-9]{32}$/);
    assert.match(a.casa.codigo, /^[A-HJ-KM-NP-Z2-9]{8}$/);
    const c = await (await call('/api/casa', { chave: a.chave })).json();
    assert.deepEqual(c, { codigo: a.casa.codigo, aparelhos: 1 });
    // só o hash do segredo fica guardado
    const guardado = [...env.KV.m.values()].join(' ');
    assert.ok(!guardado.includes(a.chave.split('.')[1]));
    assert.equal(env.KV.gravacoes, 3);
});

test('só a app (a origem dela) cria aparelhos', async () => {
    assert.equal((await call('/api/aparelho', { metodo: 'POST', origem: 'https://outro.exemplo' })).status, 403);
    assert.equal((await call('/api/aparelho', { metodo: 'POST', origem: null })).status, 403);
    assert.equal(env.KV.gravacoes, 0);
});

test('sem chave, ou com uma chave errada, nada', async () => {
    const a = await novo();
    assert.equal((await call('/api/lista')).status, 401);
    assert.equal((await call('/api/lista', { chave: a.chave.slice(0, -1) + (a.chave.endsWith('0') ? '1' : '0') })).status, 401);
    assert.equal((await call('/api/lista', { chave: 'lixo' })).status, 401);
});

test('a lista: juntar, riscar, quantidade, produto, tirar e limpar os riscados', async () => {
    const { chave } = await novo();
    assert.deepEqual(await (await call('/api/lista', { chave })).json(), { versao: 0, itens: [] });
    let l = await (await ops(chave, [{ o: 'j', id: 'a1b2', t: '  leite   meio gordo ', q: 2 }, { o: 'j', id: 'c3d4', t: 'pão' }])).json();
    assert.equal(l.versao, 1);
    assert.deepEqual(l.itens, [{ id: 'a1b2', t: 'leite meio gordo', q: 2, f: 0, p: {} }, { id: 'c3d4', t: 'pão', q: 1, f: 0, p: {} }]);
    const p = { id: '4421406', nome: 'Leite uht meio gordo mimosa', url: 'https://www.continente.pt/produto/leite-uht-meio-gordo-mimosa-4421406.html' };
    l = await (await ops(chave, [{ o: 'p', id: 'a1b2', c: 'continente', p }, { o: 'r', id: 'c3d4', f: 1 }, { o: 'q', id: 'a1b2', q: 3 }])).json();
    assert.deepEqual(l.itens[0], { id: 'a1b2', t: 'leite meio gordo', q: 3, f: 0, p: { continente: p } });
    assert.equal(l.itens[1].f, 1);
    l = await (await ops(chave, [{ o: 'l' }])).json();
    assert.deepEqual(l.itens.map((i) => i.id), ['a1b2']);
    l = await (await ops(chave, [{ o: 'p', id: 'a1b2', c: 'continente', p: null }, { o: 'x', id: 'a1b2' }])).json();
    assert.deepEqual(l.itens, []);
    assert.equal(l.versao, 4);
});

test('reenviar as mesmas operações não muda nada nem grava outra vez (a app reenvia quando a rede falha)', async () => {
    const { chave } = await novo();
    const l1 = [{ o: 'j', id: 'a1b2', t: 'ovos' }, { o: 'r', id: 'a1b2', f: 1 }];
    await ops(chave, l1);
    const g = env.KV.gravacoes;
    const l = await (await ops(chave, l1)).json();
    assert.equal(l.versao, 1);
    assert.equal(l.itens.length, 1);
    assert.equal(env.KV.gravacoes, g);
    assert.equal((await ops(chave, [{ o: 'x', id: 'zzzz' }])).status, 200); // tirar o que já não está: nada
    assert.equal(env.KV.gravacoes, g);
});

test('operações inválidas são recusadas e a lista fica como estava', async () => {
    const { chave } = await novo();
    await ops(chave, [{ o: 'j', id: 'a1b2', t: 'ovos' }]);
    const p = (url) => ({ o: 'p', id: 'a1b2', c: 'continente', p: { id: '1', nome: 'x', url } });
    for (const mau of [[{ o: 'j', id: 'A!', t: 'x' }], [{ o: 'j', id: 'b1b1', t: '   ' }], [{ o: 'z', id: 'a1b2' }], [p('https://exemplo.com/x')],
        [p('http://www.continente.pt/x')], [{ o: 'p', id: 'a1b2', c: 'mercadona', p: null }], [null]]) {
        assert.equal((await ops(chave, mau)).status, 400, JSON.stringify(mau));
    }
    assert.equal((await call('/api/lista', { metodo: 'POST', chave, corpo: { ops: 'x' } })).status, 400);
    assert.throws(() => aplicar(listaVazia(), Array(MAX_OPS + 1).fill({ o: 'l' })), /no máximo/);
    const l = await (await call('/api/lista', { chave })).json();
    assert.deepEqual(l.itens.map((i) => i.t), ['ovos']);
});

test('entrar noutra casa com o código: a lista passa a ser a mesma, e o que se tinha não se perde', async () => {
    const a = await novo(), b = await novo();
    await ops(a.chave, [{ o: 'j', id: 'aaaa', t: 'leite' }]);
    await ops(b.chave, [{ o: 'j', id: 'bbbb', t: 'pão' }]);
    const codigo = a.casa.codigo.toLowerCase().replace(/^(....)/, '$1-'); // como se escreve à mão
    const r = await call('/api/casa/entrar', { metodo: 'POST', chave: b.chave, corpo: { codigo } });
    assert.equal(r.status, 200);
    const d = await r.json();
    assert.equal(d.codigo, a.casa.codigo);
    assert.deepEqual(d.lista.itens.map((i) => i.t), ['leite', 'pão']);
    // os dois veem a mesma lista; a casa de antes do b desapareceu
    await ops(b.chave, [{ o: 'r', id: 'aaaa', f: 1 }]);
    assert.equal((await (await call('/api/lista', { chave: a.chave })).json()).itens[0].f, 1);
    assert.deepEqual(await (await call('/api/casa', { chave: b.chave })).json(), { codigo: a.casa.codigo, aparelhos: 2 });
    assert.equal(env.KV.m.has('codigo:' + b.casa.codigo), false);
    assert.equal([...env.KV.m.keys()].filter((k) => k.startsWith('casa:')).length, 1);
});

test('um código que não existe', async () => {
    const a = await novo();
    const r = await call('/api/casa/entrar', { metodo: 'POST', chave: a.chave, corpo: { codigo: 'ZZZZ-ZZZZ' } });
    assert.equal(r.status, 404);
});

test('procurar: uma cadeia de cada vez, no índice guardado', async () => {
    env.KV.m.set('indice:continente', montarIndice('continente', ['https://www.continente.pt/produto/leite-uht-meio-gordo-mimosa-4421406.html', 'https://www.continente.pt/produto/arroz-agulha-cigala-12.html']));
    const { chave } = await novo();
    const d = await (await call('/api/procurar?cadeia=continente&q=Leite%20meio%20gordo', { chave })).json();
    assert.deepEqual(d, { cadeia: 'continente', q: 'Leite meio gordo', produtos: [{ id: '4421406', nome: 'Leite uht meio gordo mimosa', url: 'https://www.continente.pt/produto/leite-uht-meio-gordo-mimosa-4421406.html' }] });
    assert.deepEqual((await (await call('/api/procurar?cadeia=lidl&q=leite', { chave })).json()).produtos, []); // sem índice: nada
    assert.equal((await call('/api/procurar?cadeia=mercadona&q=leite', { chave })).status, 400);
    assert.equal((await call('/api/procurar?cadeia=continente&q=leite')).status, 401);
});

test('o browser pode perguntar antes (CORS) e as respostas deixam a app ler', async () => {
    const r = await worker.fetch(new Request(ORIGIN + '/api/lista', { method: 'OPTIONS' }), env);
    assert.equal(r.status, 204);
    assert.match(r.headers.get('access-control-allow-headers'), /authorization/);
    assert.equal((await call('/api/nada', { chave: (await novo()).chave })).headers.get('access-control-allow-origin'), '*');
});
