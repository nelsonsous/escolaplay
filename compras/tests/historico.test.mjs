// O histórico dos preços (volta 13): o gatilho da D1 regista cada mudança de preço, e a folha do tipo diz quanto
// desceu ou subiu desde o preço anterior
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { d1 } from './d1.mjs';
import { guardarCatalogo } from '../proxy/src/catalogo.js';
import { produtosDoTipo, esquecerTipos, variacoes } from '../proxy/src/sugerir.js';

test('cada mudança de preço fica no histórico (e só quando muda), e a folha mostra ↓ ou ↑', async () => {
    const db = d1();
    db.sql.exec(`INSERT INTO tipo (k, nome, n, casa) VALUES ('arroz', 'Arroz', 2, 1);`);
    const p = (id, preco) => ({ id, nome: `Arroz Carolino ${id}`, preco, emb: '1 kg', url: 'https://www.continente.pt/' + id });
    const dia = (d) => new Date(`2026-11-${String(d).padStart(2, '0')}T10:00:00Z`);
    await guardarCatalogo(db, 'continente', 'arroz', [p('a', 1.0), p('b', 1.0)], dia(10));
    await guardarCatalogo(db, 'continente', 'arroz', [p('a', 1.0), p('b', 1.0)], dia(11)); // igual: não regista
    await guardarCatalogo(db, 'continente', 'arroz', [p('a', 0.79), p('b', 1.15)], dia(12));
    const h = db.linhas("SELECT id, cent FROM preco_historico WHERE cadeia = 'continente' ORDER BY id, quando");
    assert.deepEqual(h.map((x) => [x.id, x.cent]), [['a', 100], ['a', 79], ['b', 100], ['b', 115]]);
    assert.deepEqual([...(await variacoes(db, 'arroz', dia(1).toISOString()))], [['continente a', -21], ['continente b', 15]]);
    esquecerTipos();
    const tp = await produtosDoTipo(db, 'arroz', dia(13));
    const a = tp.produtos.find((x) => x.id === 'a'), b = tp.produtos.find((x) => x.id === 'b');
    assert.deepEqual([a.vd, a.vs, b.vs, b.vd], [21, undefined, 15, undefined]);
    // passados 30 dias, já não se mostra
    esquecerTipos();
    const tarde = await variacoes(db, 'arroz', new Date('2026-12-15T10:00:00Z').toISOString());
    assert.equal(tarde.size, 0);
});
