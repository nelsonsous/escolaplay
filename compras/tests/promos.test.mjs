// «🔥 Promoções da semana para ti» (17/11/2026): as promoções dos tipos que a casa compra (a lista, o histórico, os
// talões), nas lojas da casa, as maiores descidas primeiro; o cartão fecha-se até à semana seguinte e «+ Juntar» põe o
// tipo na lista com esse produto.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import worker from '../proxy/src/worker.js';
import { semanaDe } from '../proxy/src/promos.js';
import { esquecerTipos } from '../proxy/src/sugerir.js';
import { kv } from './kv.mjs';
import { d1 } from './d1.mjs';

let pw = null;
try { pw = createRequire(import.meta.url)('playwright'); } catch { /* sem playwright */ }

const DADOS = (agora) => `INSERT INTO tipo (k, nome, n, casa) VALUES ('azeite', 'Azeite', 3, 1), ('arroz', 'Arroz', 2, 1), ('vinho-tinto', 'Vinho tinto', 1, 1);
    INSERT INTO preco (cadeia, id, url, nome, cent, antes, promo, tipo, visto, falhas) VALUES
    ('continente', 'z1', 'https://www.continente.pt/z1', 'Azeite Virgem Extra Gallo', 699, 999, NULL, 'azeite', '${agora}', 0),
    ('auchan', 'z2', 'https://www.auchan.pt/z2', 'AZEITE OLIVEIRA DA SERRA', 799, NULL, 1, 'azeite', '${agora}', 0),
    ('pingodoce', 'z3', 'https://www.pingodoce.pt/z3', 'Azeite Pingo Doce', 599, NULL, NULL, 'azeite', '${agora}', 0),
    ('continente', 'r1', 'https://www.continente.pt/r1', 'Arroz Carolino', 129, 159, NULL, 'arroz', '${agora}', 0),
    ('continente', 'v1', 'https://www.continente.pt/v1', 'Vinho Tinto Douro', 299, 599, NULL, 'vinho-tinto', '${agora}', 0);`;

test('a semana como «2026-W47»', () => {
    assert.equal(semanaDe(new Date('2026-11-17T12:00:00Z')), '2026-W47');
    assert.equal(semanaDe(new Date('2026-11-23T12:00:00Z')), '2026-W48');
});

test('GET /api/promos: só os tipos da casa (a lista e os talões), com o preço de antes e a percentagem', async () => {
    const env = { KV: kv(), DB: d1(), ALLOWED_ORIGINS: '' };
    const agora = new Date().toISOString();
    env.DB.sql.exec(DADOS(agora));
    esquecerTipos();
    const { chave } = await (await worker.fetch(new Request('https://x/api/aparelho', { method: 'POST' }), env)).json();
    const api = async (c, corpo) => (await worker.fetch(new Request('https://x' + c, corpo ? { method: 'POST', headers: { authorization: 'Bearer ' + chave }, body: JSON.stringify(corpo) } : { headers: { authorization: 'Bearer ' + chave } }), env)).json();
    await api('/api/lista', { ops: [{ o: 'j', id: 'aze1', t: 'azeite', e: { k: 'azeite', n: 'Azeite' } }] });
    const casa = env.DB.sql.prepare('SELECT id FROM casa LIMIT 1').get().id;
    env.DB.sql.prepare('INSERT INTO talao (id, casa, loja, dia, total, linhas, criado) VALUES (?, ?, ?, ?, ?, ?, ?)').run('t1', casa, 'continente', agora.slice(0, 10), 129,
        JSON.stringify([{ t: 'ARROZ CAROLINO 1KG', q: 1, cent: 129 }]), agora);
    const r = await api('/api/promos');
    assert.equal(r.semana, semanaDe(new Date()));
    // o azeite (a lista) e o arroz (o talão), as maiores descidas primeiro; o vinho não (a casa não o compra); o azeite
    // sem promoção (Pingo Doce) não; o rótulo «Promoção» sem riscado no fim
    assert.deepEqual(r.promos.map((p) => [p.k, p.c, p.cent, p.antes ?? null, p.pct ?? null]),
        [['azeite', 'continente', 699, 999, 30], ['arroz', 'continente', 129, 159, 19], ['azeite', 'auchan', 799, null, null]]);
    // os filtros: as lojas e os produtos destas promoções, os de mais primeiro
    assert.deepEqual(r.lojas, [{ c: 'continente', cn: 'Continente', n: 2 }, { c: 'auchan', cn: 'Auchan', n: 1 }]);
    assert.deepEqual(r.tipos, [{ k: 'azeite', tn: 'Azeite', n: 2 }, { k: 'arroz', tn: 'Arroz', n: 1 }]);
    // guardado 3 h na KV
    assert.ok([...env.KV.m.keys()].some((k) => k.startsWith(`promos:${casa}:`)));
});

test('na app: o cartão das promoções, «+ Juntar» e fechar até à semana seguinte', { skip: !pw && 'sem playwright' }, async () => {
    const { abrir } = await import('./servidor.mjs');
    const s = await abrir();
    const br = await pw.chromium.launch();
    try {
        const a = await (await br.newContext({ viewport: { width: 390, height: 844 }, locale: 'pt-PT' })).newPage();
        const erros = [];
        a.on('pageerror', (e) => erros.push(e.message));
        await a.goto(s.url());
        await a.waitForFunction(() => localStorage.getItem('compras:chave'));
        const chave = await a.evaluate(() => localStorage.getItem('compras:chave'));
        s.env.DB.sql.exec(DADOS(new Date().toISOString()).replace("('azeite', 'Azeite', 3, 1), ", '').replace(/INSERT INTO tipo \(k, nome, n, casa\) VALUES /, "INSERT OR IGNORE INTO tipo (k, nome, n, casa) VALUES ('azeite', 'Azeite', 3, 1), "));
        esquecerTipos();
        await s.api('/api/lista', chave, { ops: [{ o: 'j', id: 'aze1', t: 'azeite', e: { k: 'azeite', n: 'Azeite' } }] });
        await a.reload();
        await a.waitForSelector('.promos li');
        assert.match(await a.textContent('.promos li'), /Azeite Virgem Extra Gallo.*Continente.*6,99 €9,99 € −30%/);
        await a.click('.promos li .tlj');
        await a.waitForSelector('.toast:has-text("Azeite na lista (Continente: 6,99 €)")');
        await a.waitForFunction(() => !localStorage.getItem('compras:pend') && !localStorage.getItem('compras:envio'));
        const l = await s.api('/api/lista', chave);
        const novo = l.itens.find((i) => i.id !== 'aze1');
        assert.deepEqual([novo.e.k, novo.p.continente.id], ['azeite', 'z1']);
        // fechar: não volta esta semana (nem ao reabrir)
        await a.click('.promos-x');
        await a.waitForSelector('.promos', { state: 'detached' });
        await a.reload();
        await a.waitForSelector('.item');
        await a.waitForTimeout(400);
        assert.equal(await a.locator('.promos').count(), 0);
        assert.deepEqual(erros, []);
    } finally { await br.close(); await s.fechar(); }
});

test('na app: três promoções à vista; «Ver mais» abre todas com os filtros por loja e por produto; «Ver menos» fecha', { skip: !pw && 'sem playwright' }, async () => {
    const { abrir } = await import('./servidor.mjs');
    const s = await abrir();
    const br = await pw.chromium.launch();
    try {
        const a = await (await br.newContext({ viewport: { width: 390, height: 844 }, locale: 'pt-PT' })).newPage();
        const erros = [];
        a.on('pageerror', (e) => erros.push(e.message));
        await a.goto(s.url());
        await a.waitForFunction(() => localStorage.getItem('compras:chave'));
        const chave = await a.evaluate(() => localStorage.getItem('compras:chave'));
        const agora = new Date().toISOString();
        s.env.DB.sql.exec(DADOS(agora).replace(/INSERT INTO tipo \(k, nome, n, casa\) VALUES /, 'INSERT OR IGNORE INTO tipo (k, nome, n, casa) VALUES ')
            + `INSERT INTO preco (cadeia, id, url, nome, cent, antes, promo, tipo, visto, falhas) VALUES
            ('auchan', 'z4', 'https://www.auchan.pt/z4', 'AZEITE GALLO', 650, 900, NULL, 'azeite', '${agora}', 0),
            ('pingodoce', 'r2', 'https://www.pingodoce.pt/r2', 'Arroz Agulha', 99, 139, NULL, 'arroz', '${agora}', 0);`);
        esquecerTipos();
        await s.api('/api/lista', chave, { ops: [{ o: 'j', id: 'aze1', t: 'azeite', e: { k: 'azeite', n: 'Azeite' } }, { o: 'j', id: 'arr1', t: 'arroz', e: { k: 'arroz', n: 'Arroz' } }] });
        await a.reload();
        await a.waitForSelector('.promos li');
        // fechado: três e «Ver mais 2 promoções», sem filtros
        assert.equal(await a.locator('.promos li').count(), 3);
        assert.equal(await a.textContent('.promos-mais'), 'Ver mais 2 promoções ▾');
        assert.equal(await a.locator('.promos .promos-f').count(), 0);
        // aberto: as cinco e os filtros
        await a.click('.promos-mais');
        await a.waitForSelector('.promos .promos-f');
        assert.equal(await a.locator('.promos li').count(), 5);
        assert.deepEqual(await a.locator('.promos .promos-f >> nth=0 >> .chip').allTextContents(), ['Todas as lojas', 'Auchan 2', 'Continente 2', 'Pingo Doce 1']);
        // só o Auchan: os dois azeites dele
        await a.click('.promos .promos-f >> nth=0 >> .chip:has-text("Auchan")');
        await a.waitForFunction(() => document.querySelectorAll('.promos li').length === 2);
        assert.match(await a.textContent('.promos'), /AZEITE GALLO.*AZEITE OLIVEIRA DA SERRA/s);
        // e só o arroz: nenhuma no Auchan
        await a.click('.promos .promos-f >> nth=1 >> .chip:has-text("Arroz")');
        await a.waitForSelector('.promos .nota:has-text("Nenhuma promoção com estes filtros.")');
        await a.click('.promos .promos-f >> nth=0 >> .chip:has-text("Todas as lojas")');
        await a.waitForFunction(() => document.querySelectorAll('.promos li').length === 2);
        // «Ver menos»: volta às três, sem filtros
        await a.click('.promos-mais:has-text("Ver menos")');
        await a.waitForSelector('.promos .promos-f', { state: 'detached' });
        assert.equal(await a.locator('.promos li').count(), 3);
        // «+ Juntar» com o filtro: junta a promoção certa (o índice é o da lista toda)
        await a.click('.promos-mais');
        await a.click('.promos .promos-f >> nth=1 >> .chip:has-text("Arroz")');
        await a.waitForFunction(() => document.querySelectorAll('.promos li').length === 2);
        await a.click('.promos li:has-text("Arroz Agulha") .tlj');
        await a.waitForSelector('.toast:has-text("Pingo Doce: 0,99 €")');
        assert.deepEqual(erros, []);
    } finally { await br.close(); await s.fechar(); }
});
