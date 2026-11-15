// O que costumas comprar (volta 6): dos talões, o que se compra e de quanto em quanto tempo; o que está a acabar
// primeiro, o que já está na lista não aparece.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../proxy/src/worker.js';
import { costume, limpa, chave } from '../proxy/src/costume.js';
import { kv } from './kv.mjs';
import { d1 } from './d1.mjs';

const T = (dia, ls) => ({ dia, linhas: ls.map(([t, cent]) => ({ t, cent })) });
const AGORA = new Date('2026-11-15T10:00:00Z');

test('a linha sem a conta, e a chave sem números nem tamanhos', () => {
    assert.equal(limpa('LEITE UHT M/GORDO MIMOSA 1L 6 X 0,95'), 'LEITE UHT M/GORDO MIMOSA 1L');
    assert.equal(chave('LEITE UHT M/GORDO MIMOSA 1L 6 X 0,95'), 'leite uht gordo mimosa');
});

test('o ritmo de cada coisa: a cada quantos dias, há quantos, e se está a acabar', () => {
    const taloes = [
        T('2026-11-01', [['LEITE UHT MIMOSA 1L', 95], ['OVOS CLASSE M', 219], ['DETERGENTE SKIP', 899]]),
        T('2026-11-07', [['LEITE UHT MIMOSA 1L 6 X 0,95', 570], ['DESC. CARTAO', -50]]),
        T('2026-11-13', [['LEITE UHT MIMOSA 1L', 95], ['OVOS CLASSE M', 219]]),
    ];
    const c = costume(taloes, [{ t: 'detergente', f: 0 }], AGORA);
    assert.deepEqual(c, [
        { t: 'Leite uht mimosa 1l', k: 'leite uht mimosa', vezes: 3, ha: 2, cada: 6, falta: 0 },
        { t: 'Ovos classe m', k: 'ovos classe', vezes: 2, ha: 2, cada: 12, falta: 0 },
    ]);
    // doze dias depois o leite e os ovos estão a acabar (e passam para a frente)
    const d = costume(taloes, [], new Date('2026-11-25T10:00:00Z'));
    assert.deepEqual(d.map((x) => [x.k, x.falta]), [['leite uht mimosa', 1], ['ovos classe', 1], ['detergente skip', 0]]);
});

test('GET /api/costume: dos talões da casa', async () => {
    const env = { KV: kv(), DB: d1() };
    const { chave: k } = await (await worker.fetch(new Request('https://x/api/aparelho', { method: 'POST' }), env)).json();
    const casa = env.DB.linhas('SELECT casa FROM aparelho')[0].casa;
    env.DB.sql.prepare('INSERT INTO talao (id, casa, loja, dia, total, linhas, criado) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run('t1', casa, 'continente', '2026-11-10', 95, JSON.stringify([{ t: 'LEITE UHT', q: 1, cent: 95 }]), new Date().toISOString());
    const r = await (await worker.fetch(new Request('https://x/api/costume', { headers: { authorization: 'Bearer ' + k } }), env)).json();
    assert.deepEqual(r.coisas.map((x) => x.t), ['Leite uht']);
});
