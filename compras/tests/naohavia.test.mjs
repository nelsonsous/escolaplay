// «Não havia na loja» (ciclo 3): o produto fica em falta 3 dias nessa cadeia; a lista conta-o como esgotado, a troca de
// hora a hora passa ao seguinte, e «afinal havia» desfaz.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aplicar, emFalta } from '../proxy/src/casa.js';
import { juntarPrecos } from '../proxy/src/precos.js';
import { atualizarEscolhas } from '../proxy/src/escolhas.js';
import { d1 } from './d1.mjs';

const P = (id) => ({ id, nome: 'Leite ' + id, url: 'https://www.continente.pt/' + id });

test('a operação: marca, conta 3 dias, desfaz; e só em cadeias conhecidas', () => {
    const l = { versao: 1, itens: [{ id: 'abcdefgh', t: 'leite', q: 1, f: 0, p: { continente: P('a') }, e: { k: 'leite', emb: '1 L', mao: 1 } }] };
    assert.equal(aplicar(l, [{ o: 'n', id: 'abcdefgh', c: 'continente' }]), true);
    const i = l.itens[0];
    assert.equal(emFalta(i, 'continente'), 'a');
    assert.equal(i.e.mao, undefined); // passa a poder trocar-se
    assert.equal(emFalta(i, 'continente', new Date(Date.now() + 4 * 24 * 3600e3)), null); // passados 3 dias, já não conta
    aplicar(l, [{ o: 'n', id: 'abcdefgh', c: 'continente', f: 0 }]);
    assert.equal(i.nh, undefined);
    assert.throws(() => aplicar(l, [{ o: 'n', id: 'abcdefgh', c: 'nada' }]), /cadeia/);
});

test('na lista conta como esgotado; a troca de hora a hora passa ao seguinte mais barato', async () => {
    const db = d1();
    const v = new Date().toISOString();
    const ins = (id, cent) => db.sql.prepare(`INSERT INTO preco (cadeia, id, url, nome, cent, uc, ub, emb, q, tipo, visto, falhas) VALUES ('continente', ?, ?, ?, ?, ?, 'l', '1 L', 1, 'leite', ?, 0)`)
        .run(id, 'https://www.continente.pt/' + id, 'Leite ' + id, cent, cent, v);
    ins('a', 79); ins('b', 85);
    const nh = { continente: { id: 'a', ate: new Date(Date.now() + 3 * 24 * 3600e3).toISOString() } };
    const item = { id: 'abcdefgh', t: 'leite', q: 1, f: 0, p: { continente: P('a') }, e: { k: 'leite', emb: '1 L' }, nh };
    const l = await juntarPrecos(db, { itens: [item] });
    assert.equal(l.itens[0].p.continente.esgotado, 1);
    assert.match(l.itens[0].p.continente.nh, /^\d{4}-\d\d-\d\d$/);
    db.sql.prepare(`INSERT INTO casa (id, codigo, criada, versao, itens) VALUES ('c1', 'ABCD2345', ?, 1, ?)`).run(v, JSON.stringify([item]));
    await atualizarEscolhas(db);
    assert.equal(JSON.parse(db.linhas('SELECT itens FROM casa')[0].itens)[0].p.continente.id, 'b');
});
