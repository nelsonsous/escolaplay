// A melhor forma de comprar a quantidade (ciclo 3): 6 soltos ou o pack; e a troca de hora a hora com uma palavra
// escolhida («picanha») fica com os produtos que a têm (antes estava ao contrário).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { melhorCombinacao, packsDaLista } from '../proxy/src/packs.js';
import { melhores } from '../proxy/src/escolhas.js';
import { juntarPrecos } from '../proxy/src/precos.js';
import { d1 } from './d1.mjs';

const L1 = { id: 'l1', nome: 'Leite 1 L', cent: 79, q: 1 }, L6 = { id: 'l6', nome: 'Leite Pack 6 × 1 L', cent: 429, q: 6 }, L4 = { id: 'l4', nome: 'Leite Pack 4 × 1 L', cent: 299, q: 4 };

test('a combinação mais barata para a quantidade: o pack, um pack e soltos, e nunca muito mais do que se pediu', () => {
    assert.deepEqual(melhorCombinacao([L1, L6], 6).itens.map((x) => [x.id, x.n]), [['l6', 1]]);
    assert.equal(melhorCombinacao([L1, L6], 6).cent, 429);
    assert.deepEqual(melhorCombinacao([L1, L4], 6).itens.map((x) => [x.id, x.n]), [['l4', 1], ['l1', 2]]); // 2,99 + 1,58
    assert.deepEqual(melhorCombinacao([L1, L6], 2).itens.map((x) => [x.id, x.n]), [['l1', 2]]); // o pack de 6 é demais para 2
    assert.equal(melhorCombinacao([L6], 2), null);
});

test('na lista: «6 × leite 1 L» no Continente diz que o pack poupa; com o pack já escolhido, nada', async () => {
    const db = d1();
    const v = new Date().toISOString();
    const ins = (id, nome, cent, q, marca = 'Mimosa') => db.sql.prepare(`INSERT INTO preco (cadeia, id, url, nome, marca, cent, uc, ub, q, emb, tipo, visto, falhas)
        VALUES ('continente', ?, ?, ?, ?, ?, ?, 'l', ?, ?, 'leite-meio-gordo', ?, 0)`).run(id, 'https://www.continente.pt/' + id, nome, marca, cent, Math.round(cent / q), q, q + ' L', v);
    ins('l1', 'Leite UHT Meio Gordo Mimosa 1 L', 79, 1); ins('l6', 'Leite UHT Meio Gordo Mimosa Pack 6 x 1 L', 429, 6); ins('x6', 'Leite UHT Meio Gordo Outro Pack 6 x 1 L', 399, 6, 'Outro');
    const item = (pid) => ({ id: 'i1', t: 'leite', q: 6, f: 0, e: { k: 'leite-meio-gordo', emb: '1 L', m: 'Mimosa' }, p: { continente: { id: pid, nome: 'x', url: 'https://www.continente.pt/' + pid } } });
    const pk = await packsDaLista(db, [item('l1')]);
    assert.deepEqual(pk.i1.continente.itens.map((x) => x.id), ['l6']); // da mesma marca (o «Outro» é mais barato, mas é outra marca)
    assert.equal(pk.i1.continente.poupa, 6 * 79 - 429);
    assert.match(pk.i1.continente.como, /^1 × Leite UHT Meio Gordo Mimosa Pack 6 x 1 L$/);
    assert.deepEqual(await packsDaLista(db, [item('l6')]), {});
    const l = await juntarPrecos(db, { itens: [item('l1')] });
    assert.equal(l.itens[0].pk.continente.cent, 429);
});

test('a troca de hora a hora com «picanha» escolhida fica com a picanha (não com o «para estufar», mais barato)', async () => {
    const db = d1();
    const v = new Date().toISOString();
    const ins = (id, nome, uc) => db.sql.prepare(`INSERT INTO preco (cadeia, id, url, nome, cent, uc, ub, tipo, visto, falhas) VALUES ('continente', ?, ?, ?, ?, ?, 'kg', 'carne-novilho', ?, 0)`)
        .run(id, 'https://www.continente.pt/' + id, nome, uc, uc, v);
    ins('a', 'Novilho para Estufar', 800); ins('b', 'Picanha de Novilho', 1500);
    assert.equal((await melhores(db, { k: 'carne-novilho', w: 'picanha' })).continente.id, 'b');
    assert.equal((await melhores(db, { k: 'carne-novilho' })).continente.id, 'a');
});
