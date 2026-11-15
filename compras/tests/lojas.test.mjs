// A localidade e as lojas da casa (volta 6): a lista das lojas SPAR, a procura por localidade e o que se grava na casa.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import worker from '../proxy/src/worker.js';
import { lerLojasSpar, lojasDe } from '../proxy/src/lojas.js';
import { kv } from './kv.mjs';
import { d1 } from './d1.mjs';

const LOJAS = lerLojasSpar(readFileSync(new URL('./fontes/spar-lojas.html', import.meta.url), 'utf8'));

test('as lojas SPAR da página: nome, rua, código postal e localidade; a procura por localidade e por código postal', () => {
    assert.equal(LOJAS.length, 5);
    const { h, ...l0 } = LOJAS[0];
    assert.deepEqual(l0, { n: 'SPAR Portimão (M.Albuquerque)', r: 'R. Mouzinho de Albuquerque 18', cp: '8500-510', l: 'Portimão' });
    assert.deepEqual(lojasDe(LOJAS, 'portimao').map((l) => l.n), ['SPAR Portimão (M.Albuquerque)']);
    assert.deepEqual(lojasDe(LOJAS, '8200').map((l) => l.n), ['SPAR Albufeira (Alexandre Herculano)']);
    assert.deepEqual(lojasDe(LOJAS, 'a'), []);
});

test('as lojas SPAR do JSON da página (com as aspas escritas \\u0022), também as abertas há pouco', () => {
    const j = JSON.stringify([{ id: 607, nome: 'SPAR Santo Tirso', latitude: '41.3', rua: 'Rua do Picoto, 342,  4780-521 Santo Tirso', codpostal: '4780-521', tipo: 'lp' },
        { id: 1, nome: 'SPAR  Portimão (M.Albuquerque)', rua: 'R. Mouzinho de Albuquerque 18,', codpostal: '8500-510  Portimão' }]).replace(/"/g, '\\u0022');
    const l = lerLojasSpar(`<script>const lojas = ${j};</script>`);
    assert.deepEqual(l, [{ n: 'SPAR Santo Tirso', r: 'Rua do Picoto, 342', cp: '4780-521', l: 'Santo Tirso' },
        { n: 'SPAR Portimão (M.Albuquerque)', r: 'R. Mouzinho de Albuquerque 18', cp: '8500-510', l: 'Portimão' }]);
    assert.deepEqual(lojasDe(l, 'santo tirso').length, 1);
    assert.deepEqual(lojasDe(l, '4780').length, 1);
});

test('a casa grava a localidade e as lojas; só as cadeias conhecidas, e pelo menos uma', async () => {
    const env = { KV: kv({ 'lojas:spar': JSON.stringify(LOJAS) }), DB: d1() };
    const { chave } = await (await worker.fetch(new Request('https://x/api/aparelho', { method: 'POST' }), env)).json();
    const api = (c, corpo) => worker.fetch(new Request('https://x' + c, { method: corpo ? 'POST' : 'GET', headers: { authorization: 'Bearer ' + chave }, body: corpo ? JSON.stringify(corpo) : undefined }), env);
    assert.equal((await (await api('/api/casa')).json()).lojas, undefined);
    let c = await (await api('/api/casa/lojas', { local: ' Portimão ', cadeias: ['continente', 'spar', 'mercadona', 'nada'], spar: 'SPAR Portimão (M.Albuquerque)' })).json();
    assert.equal(c.local, 'Portimão');
    assert.deepEqual(c.lojas, { cadeias: ['continente', 'spar', 'mercadona'], spar: 'SPAR Portimão (M.Albuquerque)' });
    c = await (await api('/api/casa')).json();
    assert.deepEqual(c.lojas.cadeias, ['continente', 'spar', 'mercadona']);
    assert.equal((await api('/api/casa/lojas', { cadeias: [] })).status, 400);
    assert.deepEqual((await (await api('/api/lojas?q=Portim%C3%A3o')).json()).lojas.map((l) => l.l), ['Portimão']);
});

test('os horários das lojas SPAR (dias úteis, sábados, domingos), dos cartões da página', async () => {
    const { lerLojasSpar } = await import('../proxy/src/lojas.js');
    const { readFileSync } = await import('node:fs');
    const l = lerLojasSpar(readFileSync(new URL('./fontes/spar-lojas.html', import.meta.url), 'utf8')).find((x) => /Portim/.test(x.n));
    assert.deepEqual(l.h, { u: '8:30 - 13:30 | 15:30 - 20:00', s: '8:30 - 13:30 | 15:30 - 19:30', d: 'Encerrado' });
});
