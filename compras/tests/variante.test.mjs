// «papel cozinha»: o «papel» é uma palavra genérica (umas cadeias escrevem-na, outras não), não uma variante; sem ela,
// o Continente («Rolo de Cozinha…») deixava de aparecer com o filtro «papel cozinha».
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sugerir, esquecerTipos } from '../proxy/src/sugerir.js';
import { d1 } from './d1.mjs';

test('as palavras genéricas não são variante: «papel cozinha» dá o rolo de cozinha todo', async () => {
    const db = d1(); const agora = new Date().toISOString();
    db.sql.exec(`INSERT INTO tipo (k, nome, n, casa) VALUES ('rolos-de-cozinha', 'Rolos de cozinha', 3, 0);
        INSERT INTO preco (cadeia, id, url, nome, cent, tipo, visto, falhas) VALUES ('continente', '1', 'u1', 'Rolo de Cozinha Clássico', 199, 'rolos-de-cozinha', '${agora}', 0),
        ('pingodoce', '2', 'u2', 'Papel de Cozinha PD', 149, 'rolos-de-cozinha', '${agora}', 0), ('pingodoce', '3', 'u3', 'Papel de Cozinha Renova', 249, 'rolos-de-cozinha', '${agora}', 0);`);
    esquecerTipos();
    const r = await sugerir(db, 'papel cozinha');
    assert.deepEqual(r.map((t) => [t.k, t.w]), [['rolos-de-cozinha', undefined]]);
});
