// O histórico do que se compra (16/11/2026): riscar guarda a coisa com a loja (a de «Vou a este»; sem ela, a mais
// barata, estimada) e o preço desse dia; desriscar apaga-a; /api/gastos dá a semana, o mês e o que se poupou.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../proxy/src/worker.js';
import { linhaDaCompra } from '../proxy/src/compras.js';
import { kv } from './kv.mjs';
import { d1 } from './d1.mjs';

test('a linha da compra: na loja escolhida, ou na mais barata (estimada); o preço da mais cara para a poupança', () => {
    const i = { id: 'a1b2', t: 'leite', q: 2, e: { k: 'leite' }, p: { continente: { id: 'c', nome: 'Leite C', cent: 99 }, auchan: { id: 'a', nome: 'Leite A', cent: 85 }, lidl: { id: 'l', nome: 'Leite L', cent: 120, esgotado: 1 } } };
    const agora = new Date('2026-11-16T10:00:00Z');
    assert.deepEqual(linhaDaCompra(i, 'continente', agora), { item: 'a1b2', dia: '2026-11-16', quando: agora.toISOString(), texto: 'leite', tipo: 'leite', q: 2,
        cadeia: 'continente', nome: 'Leite C', cent: 99, mx: 99, estimada: 0 });
    assert.deepEqual([linhaDaCompra(i, null, agora).cadeia, linhaDaCompra(i, null, agora).estimada], ['auchan', 1]);
    assert.equal(linhaDaCompra(i, 'lidl', agora).cadeia, 'auchan'); // esgotado no Lidl: não há lá preço
});

test('riscar guarda, desriscar apaga, e /api/gastos soma a semana, o mês e o que se poupou', async () => {
    const env = { KV: kv(), DB: d1(), ALLOWED_ORIGINS: '' };
    const { chave } = await (await worker.fetch(new Request('https://x/api/aparelho', { method: 'POST' }), env)).json();
    const api = async (c, corpo) => (await worker.fetch(new Request('https://x' + c, corpo ? { method: 'POST', headers: { authorization: 'Bearer ' + chave }, body: JSON.stringify(corpo) } : { headers: { authorization: 'Bearer ' + chave } }), env)).json();
    const agora = new Date().toISOString();
    env.DB.sql.exec(`INSERT INTO preco (cadeia, id, url, nome, cent, visto, falhas) VALUES
        ('continente', 'c1', 'https://www.continente.pt/c1', 'Arroz Carolino', 129, '${agora}', 0),
        ('pingodoce', 'p1', 'https://www.pingodoce.pt/p1', 'Arroz Carolino PD', 149, '${agora}', 0);`);
    await api('/api/lista', { ops: [{ o: 'j', id: 'arroz1', t: 'arroz', q: 2 },
        { o: 'p', id: 'arroz1', c: 'continente', p: { id: 'c1', nome: 'Arroz Carolino', url: 'https://www.continente.pt/c1' } },
        { o: 'p', id: 'arroz1', c: 'pingodoce', p: { id: 'p1', nome: 'Arroz Carolino PD', url: 'https://www.pingodoce.pt/p1' } }] });
    assert.equal((await api('/api/gastos')).mes, 0);
    await api('/api/lista', { ops: [{ o: 'r', id: 'arroz1', f: 1, c: 'continente' }] });
    const g = await api('/api/gastos');
    assert.deepEqual([g.semana, g.mes, g.poupado_mes, g.coisas_mes, g.estimadas], [258, 258, 40, 1, 0]);
    assert.deepEqual(g.lojas, [{ c: 'continente', nome: 'Continente', cent: 258 }]);
    assert.deepEqual(g.ultimas[0].c, 'Continente');
    await api('/api/lista', { ops: [{ o: 'r', id: 'arroz1', f: 0 }] });
    assert.equal((await api('/api/gastos')).mes, 0);
});

test('na app: riscar o arroz e, no Mais barato, «📒 O que compraste» com a semana e o que se poupou', async (t) => {
    let pw = null;
    try { pw = (await import('node:module')).createRequire(import.meta.url)('playwright'); } catch { return t.skip('sem playwright'); }
    const { abrir } = await import('./servidor.mjs');
    const s = await abrir();
    const br = await pw.chromium.launch();
    try {
        const a = await (await br.newContext({ viewport: { width: 390, height: 844 }, locale: 'pt-PT' })).newPage();
        const erros = [];
        a.on('pageerror', (e) => erros.push(e.message));
        await a.goto(s.url());
        await a.waitForFunction(() => localStorage.getItem('compras:chave'));
        const chave = await a.evaluate(() => localStorage.getItem('compras:chave'));
        const agora = new Date().toISOString();
        s.env.DB.sql.exec(`INSERT INTO preco (cadeia, id, url, nome, cent, visto, falhas) VALUES
            ('continente', 'c1', 'https://www.continente.pt/c1', 'Arroz Carolino', 129, '${agora}', 0),
            ('pingodoce', 'p1', 'https://www.pingodoce.pt/p1', 'Arroz Carolino PD', 149, '${agora}', 0);`);
        await s.api('/api/lista', chave, { ops: [{ o: 'j', id: 'arroz1', t: 'arroz' },
            { o: 'p', id: 'arroz1', c: 'continente', p: { id: 'c1', nome: 'Arroz Carolino', url: 'https://www.continente.pt/c1' } },
            { o: 'p', id: 'arroz1', c: 'pingodoce', p: { id: 'p1', nome: 'Arroz Carolino PD', url: 'https://www.pingodoce.pt/p1' } }] });
        await a.reload();
        await a.waitForSelector('.item');
        await a.click('.item .caixa');
        await a.waitForFunction(() => !localStorage.getItem('compras:pend') && !localStorage.getItem('compras:envio'));
        await a.click('#abas button >> nth=1');
        await a.waitForSelector('.gastos');
        const txt = await a.textContent('.gastos');
        assert.match(txt, /Esta semana 1,29 €/);
        assert.match(txt, /Poupaste 0,20 €/);
        assert.match(txt, /sem loja escolhida/); // não disse a que loja ia: conta-se a mais barata
        assert.deepEqual(erros, []);
    } finally { await br.close(); await s.fechar(); }
});
