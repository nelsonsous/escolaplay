// O tamanho certo para a casa (volta 12): com as pessoas da casa, no talho e na peixaria, o mais barato escolhe-se
// entre as embalagens até 2 refeições por pessoa, e não o pacote de 2 kg só por ser o mais barato ao quilo
import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../proxy/src/worker.js';
import { limiteGramas, gramasDe, cabe } from '../proxy/src/porcoes.js';
import { melhores } from '../proxy/src/escolhas.js';
import { produtosDoTipo, esquecerTipos } from '../proxy/src/sugerir.js';
import { guardarCatalogo } from '../proxy/src/catalogo.js';
import { kv } from './kv.mjs';
import { d1 } from './d1.mjs';

test('o limite e o peso das embalagens', () => {
    assert.equal(limiteGramas('frango', 2), 800);
    assert.equal(limiteGramas('frango', 1), 400);
    assert.equal(limiteGramas('frango', null), null);
    assert.equal(limiteGramas('agua-sem-gas', 2), null); // só no talho e na peixaria
    assert.equal(gramasDe({ ub: 'kg', q: 2 }), 2000);
    assert.equal(gramasDe({ emb: '500 g' }), 500);
    assert.equal(gramasDe({ emb: '1,2 kg' }), 1200);
    assert.equal(gramasDe({ emb: '1 un' }), null);
    assert.ok(cabe({ emb: '1 un' }, 800)); // sem peso, cabe
    assert.ok(!cabe({ ub: 'kg', q: 2 }, 800));
});

test('a lista e a folha: para 2 pessoas, o bife de frango de 500 g e não o pacote de 2 kg; sem pessoas, o de 2 kg', async () => {
    const env = { KV: kv(), DB: d1(), ALLOWED_ORIGINS: '' };
    const { chave } = await (await worker.fetch(new Request('https://x/api/aparelho', { method: 'POST' }), env)).json();
    const api = async (c, corpo) => (await worker.fetch(new Request('https://x' + c, corpo ? { method: 'POST', headers: { authorization: 'Bearer ' + chave }, body: JSON.stringify(corpo) } : { headers: { authorization: 'Bearer ' + chave } }), env)).json();
    env.DB.sql.exec(`INSERT INTO tipo (k, nome, n, casa) VALUES ('frango', 'Frango', 2, 1);`);
    const p = (id, nome, preco, emb) => ({ id, nome, preco, emb, url: 'https://www.continente.pt/' + id });
    const agora = new Date();
    await guardarCatalogo(env.DB, 'continente', 'frango', [p('g', 'Bife de Frango Pack Familiar', 11.98, '2 kg'), p('m', 'Bife de Frango', 3.49, '500 g')], agora);
    esquecerTipos();
    assert.equal((await melhores(env.DB, { k: 'frango' }, agora)).continente.id, 'g'); // sem pessoas: o mais barato ao quilo
    assert.equal((await melhores(env.DB, { k: 'frango' }, agora, new Set(), 2)).continente.id, 'm');
    assert.equal((await melhores(env.DB, { k: 'frango' }, agora, new Set(), 6)).continente.id, 'g'); // 6 pessoas: 2,4 kg
    assert.equal((await melhores(env.DB, { k: 'frango', emb: '2 kg' }, agora, new Set(), 2)).continente.id, 'g'); // o tamanho escolhido manda
    // a casa grava as pessoas (1 a 12) e a folha do tipo traz o limite e o peso de cada embalagem
    assert.equal((await api('/api/casa/pessoas', { n: 2 })).pessoas, 2);
    assert.equal((await api('/api/casa')).pessoas, 2);
    const tp = await api('/api/tipo?k=frango');
    assert.deepEqual([tp.lim, tp.pes], [800, 2]);
    assert.deepEqual(tp.produtos.map((x) => [x.id, x.g]), [['g', 2000], ['m', 500]]);
    assert.equal((await api('/api/casa/pessoas', { n: null })).pessoas, undefined);
    assert.equal((await api('/api/tipo?k=frango')).lim, undefined);
});
