// A análise do Claude a pedido (volta 16): o pedido (um à espera por casa, 6 por dia), a tarefa (os pendentes, os dados
// com a pergunta, gravar o resultado validado) e a chamada ao gatilho (no máximo 2 por pedido, 15 min entre elas).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../proxy/src/worker.js';
import { validarResultado, disparar, pedirAnalise } from '../proxy/src/pedidos.js';
import { d1 } from './d1.mjs';
import { kv } from './kv.mjs';

const RES = { resumo: 'Vai só ao Lidl esta semana: fica 4 € mais barato.', lojas: [{ loja: 'Lidl', porque: 'mais barato no total', coisas: ['leite', 'pão'] }],
    online: [{ loja: 'Vinha', o_que: 'Papa Figos', porque: '1 € mais barato', url: 'https://www.vinha.pt/vinho/x/' }], perguntas: ['O vinho é para peixe ou carne?'], avisos: ['<b>x</b>'] };

test('o resultado validado: corta, tira o que não é https e exige o resumo', () => {
    const v = validarResultado({ ...RES, online: [{ loja: 'X', url: 'javascript:alert(1)' }], lojas: [{ loja: '' }, ...RES.lojas] });
    assert.equal(v.online[0].url, undefined);
    assert.equal(v.lojas.length, 1);
    assert.throws(() => validarResultado({ lojas: [] }), /resumo/);
});

test('pedir, ver, a tarefa lê e grava; um à espera por casa e 6 por dia', async () => {
    const db = d1();
    const env = { KV: kv({}), DB: db, SONDA_TOKEN: 'segredo' };
    const { chave } = await (await worker.fetch(new Request('https://x/api/aparelho', { method: 'POST' }), env)).json();
    const auth = { authorization: 'Bearer ' + chave, 'content-type': 'application/json' };
    const pedir = (pergunta) => worker.fetch(new Request('https://x/api/analise/pedir', { method: 'POST', headers: auth, body: JSON.stringify({ pergunta }) }), env);
    const a = (await (await pedir('  um tinto   para peixe ')).json()).analise;
    assert.equal(a.estado, 'pendente');
    assert.equal(a.pergunta, 'um tinto para peixe');
    assert.equal((await (await pedir('outra')).json()).analise.id, a.id); // o que está à espera
    const sonda = (c, o) => worker.fetch(new Request('https://x' + c, { ...o, headers: { authorization: 'Bearer segredo', 'content-type': 'application/json' } }), env);
    const { pendentes } = await (await sonda('/sonda/analise/pendentes')).json();
    assert.equal(pendentes.length, 1);
    const dados = await (await sonda('/sonda/analise?pedido=' + a.id)).json();
    assert.equal(dados.pergunta, 'um tinto para peixe');
    assert.ok(Array.isArray(dados.itens));
    assert.equal((await sonda('/sonda/analise/resultado', { method: 'POST', body: JSON.stringify({ id: a.id, resultado: RES }) })).status, 200);
    assert.equal((await sonda('/sonda/analise/resultado', { method: 'POST', body: JSON.stringify({ id: a.id, resultado: RES }) })).status, 409); // já tratado
    const u = await (await worker.fetch(new Request('https://x/api/analise/ultima', { headers: auth }), env)).json();
    assert.equal(u.analise.estado, 'feita');
    assert.equal(u.analise.resultado.lojas[0].loja, 'Lidl');
    assert.equal(u.naHora, false);
    // 6 por dia
    const casa = db.sql.prepare('SELECT casa FROM analise').get().casa;
    for (let i = 0; i < 5; i++) db.sql.prepare("INSERT INTO analise (id, casa, estado, criado) VALUES (?, ?, 'feita', ?)").run('x' + i, casa, new Date().toISOString());
    assert.equal((await pedir('mais')).status, 429);
});

test('o gatilho: chama com o id e o texto fixo, no máximo 2 vezes por pedido e com 15 min entre elas', async () => {
    const db = d1();
    db.sql.exec("INSERT INTO casa (id, codigo, criada) VALUES ('c1', 'ABC', '2026-11-16')");
    const env = { ANALISE_FIRE_URL: 'https://api.anthropic.com/v1/claude_code/routines/trig_1/fire', ANALISE_TOKEN: 't' };
    const chamadas = [];
    const f0 = globalThis.fetch;
    globalThis.fetch = async (u, o) => { chamadas.push([u, JSON.parse(o.body).text]); return new Response('{}'); };
    try {
        const promessas = [];
        const r = await pedirAnalise(db, env, 'c1', 'x', (p) => promessas.push(p));
        await Promise.all(promessas);
        assert.equal(chamadas.length, 1);
        assert.equal(chamadas[0][1], `Corrida pedida pela app Compras: trata o pedido de análise ${r.analise.id}.`);
        assert.equal(await disparar(db, env, r.analise.id), false); // ainda não passaram 15 min
        assert.equal(await disparar(db, env, r.analise.id, Date.now() + 16 * 60e3), true);
        assert.equal(await disparar(db, env, r.analise.id, Date.now() + 40 * 60e3), false); // já foi chamado 2 vezes
    } finally { globalThis.fetch = f0; }
});
