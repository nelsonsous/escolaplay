// Os dados da análise (volta 15): a lista com a pesquisa, os filtros e a escolha (à mão, automática, pela app), os
// preços com a variação do histórico, os totais por cadeia, as lojas online e o folheto do Lidl; e as rotas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dadosDaAnalise, filtrosLegiveis, comoEscolhido } from '../proxy/src/analise.js';
import worker from '../proxy/src/worker.js';
import { d1 } from './d1.mjs';
import { kv } from './kv.mjs';

test('os filtros legíveis e como se escolheu', () => {
    assert.deepEqual(filtrosLegiveis({ fa: 'islandia', far: 'Islândia', fp: 'especial', fes: '|1 kg|500 g|' }), ['Islândia', 'especial', '1 kg + 500 g']);
    assert.deepEqual([{ t: 'x' }, { e: { k: 'a', mao: 1 } }, { e: { k: 'a', au: 1 } }, { e: { k: 'a' } }].map(comoEscolhido), ['só texto', 'à mão', 'automática', 'pela app']);
});

test('a análise: a pesquisa, os filtros, a escolha, os preços com a variação, os totais, o online e o folheto; as rotas', async () => {
    const db = d1();
    const env = { KV: kv({}), DB: db, SONDA_TOKEN: 'segredo' };
    const { chave } = await (await worker.fetch(new Request('https://x/api/aparelho', { method: 'POST' }), env)).json();
    const auth = { authorization: 'Bearer ' + chave };
    const agora = new Date().toISOString();
    db.sql.prepare(`INSERT INTO preco (cadeia, id, url, nome, cent, uc, ub, emb, tipo, visto, falhas) VALUES
        ('continente', 'c1', 'https://www.continente.pt/produto/c1.html', 'Bacalhau Especial Islândia', 1999, 1999, 'kg', '1 kg', 'bacalhau', ?, 0),
        ('lidl', 'f123', 'https://www.lidl.pt/l/pt/folhetos/x', 'Bacalhau Graúdo', 1499, 1499, 'kg', '1 kg', 'bacalhau', ?, 0)`).run(agora, agora);
    db.sql.prepare(`UPDATE preco SET ate = '2099-01-01' WHERE id = 'f123'`).run();
    db.sql.prepare(`UPDATE preco SET cent = 1799 WHERE id = 'c1'`).run(); // o histórico regista a descida
    db.sql.prepare(`INSERT INTO produtor_artigo (loja, id, nome, url, variante, cent, emb, uc, ub, tipo, disponivel, visto) VALUES
        ('lugrade', 'l1', 'Especial', 'https://loja.lugrade.com/produto/especial/', 'islandia', 11448, '3,4 kg', 3392, 'kg', 'bacalhau', 1, ?)`).run(agora);
    const ops = [
        { o: 'j', id: 'item1', t: 'Bacalhau (Islândia, especial)', q: 2, e: { k: 'bacalhau', n: 'Bacalhau', q: 'bacalhau', f: { fa: 'islandia', far: 'Islândia', fp: 'especial' } } },
        { o: 'p', id: 'item1', c: 'continente', p: { id: 'c1', nome: 'Bacalhau Especial Islândia', url: 'https://www.continente.pt/produto/c1.html' } },
        { o: 'j', id: 'item2', t: 'pão', q: 1 },
    ];
    await worker.fetch(new Request('https://x/api/lista', { method: 'POST', headers: { ...auth, 'content-type': 'application/json' }, body: JSON.stringify({ ops }) }), env);
    const d = await (await worker.fetch(new Request('https://x/api/analise', { headers: auth }), env)).json();
    const b = d.itens.find((i) => i.texto.startsWith('Bacalhau'));
    assert.equal(b.pesquisa, 'bacalhau');
    assert.deepEqual(b.filtros, ['Islândia', 'especial']);
    assert.equal(b.escolha, 'à mão'); // escolheu o produto do Continente (sem «a»)
    assert.equal(b.quantidade, 2);
    assert.deepEqual(b.produtos.continente.mudou && [b.produtos.continente.mudou.de, b.produtos.continente.mudou.para], [1999, 1799]);
    assert.equal(b.online[0].loja, 'lugrade');
    assert.equal(b.online[0].portes, 0); // grátis acima de 100 €
    assert.equal(b.lidl_folheto[0].nome, 'Bacalhau Graúdo');
    assert.deepEqual(d.totais.continente, { nome: 'Continente', cent: 1799 * 2, coisas: 1 });
    assert.equal(d.itens.find((i) => i.texto === 'pão').escolha, 'só texto');
    // a sonda: pelo código da casa, com o segredo
    const { codigo } = await (await worker.fetch(new Request('https://x/api/casa', { headers: auth }), env)).json();
    assert.equal((await worker.fetch(new Request('https://x/sonda/analise?codigo=' + codigo), env)).status, 401);
    const s = await (await worker.fetch(new Request('https://x/sonda/analise?codigo=' + codigo, { headers: { authorization: 'Bearer segredo' } }), env)).json();
    assert.equal(s.coisas, 2);
});
