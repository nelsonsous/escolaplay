// A zona do Continente: o nome da loja online («Valongo - WEB - Zn 2») não é onde a casa mora; a casa leva só a terra
// dessa loja (lz), e a app diz o código postal, a localidade da casa e de onde saem as entregas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../proxy/src/worker.js';
import { gravarCp, gravarLojas, casaDe } from '../proxy/src/casa.js';
import { kv } from './kv.mjs';
import { d1 } from './d1.mjs';

test('a casa: a terra da loja online que serve a zona, à parte da localidade', async () => {
    const env = { KV: kv(), DB: d1(), ALLOWED_ORIGINS: '' };
    const { chave } = await (await worker.fetch(new Request('https://x/api/aparelho', { method: 'POST' }), env)).json();
    const c = await (await worker.fetch(new Request('https://x/api/casa', { headers: { authorization: 'Bearer ' + chave } }), env)).json();
    const casa = env.DB.sql.prepare('SELECT id FROM casa WHERE codigo = ?').get(c.codigo).id;
    await gravarLojas(env.DB, { casa }, { local: 'Santo Tirso', lojas: null });
    await gravarCp(env.DB, { casa }, '4780-521', 'Valongo - WEB - Zn 2');
    const r = await casaDe(env.DB, { casa });
    assert.deepEqual([r.local, r.cp, r.zona, r.lz], ['Santo Tirso', '4780-521', 'Valongo - WEB - Zn 2', 'Valongo']);
});
