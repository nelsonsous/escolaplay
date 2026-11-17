// O talão do SPAR (17/11/2026): o modelo devolveu «Qtd Total: 3.00» como linha, juntou duas linhas numa e leu «6lt»
// como «61t». Os totais saem, a linha junta não sugere nada, o «61t» é «6 lt», e as sugestões tiram-se com o ✕.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { arrumar, limpaLinha } from '../proxy/src/talao.js';
import { costume } from '../proxy/src/costume.js';

const LIDO = { loja: 'SPAR Santo Tirso', dia: '2026-11-17', total: 3.84, linhas: [
    { t: 'Agua SPAR Nascente 61t', q: 1, preco: 0.86 }, { t: 'Mini Pizza York Cheddar un', q: 1, preco: 1.99 },
    { t: 'Pao C/ Chourico un', q: 1, preco: 0.99 }, { t: 'Mini pizza cheddar un pao c/ chouriço 1un', q: 1, preco: 2.98 }, { t: 'Qtd Total: 3.00', q: 1, preco: 3 }] };

test('o talão: a loja SPAR, os totais fora e o «61t» é «6 lt»', () => {
    const t = arrumar(LIDO);
    assert.equal(t.loja, 'spar');
    assert.deepEqual(t.linhas.map((l) => l.t), ['Agua SPAR Nascente 6 lt', 'Mini Pizza York Cheddar un', 'Pao C/ Chourico un', 'Mini pizza cheddar un pao c/ chouriço 1un']);
    assert.equal(limpaLinha('Leite 1lt'), 'Leite 1 lt');
});

test('costumas comprar: sem os totais, sem a linha que junta duas, e sem as esquecidas', () => {
    const tl = [{ dia: '2026-11-17', linhas: LIDO.linhas.map((l) => ({ t: l.t, cent: Math.round(l.preco * 100) })) }];
    const agora = new Date('2026-11-17T15:00:00Z');
    const ts = costume(tl, [], agora).map((x) => x.t);
    assert.deepEqual(ts, ['Agua spar nascente 6 lt', 'Mini pizza york cheddar un', 'Pao c/ chourico un']);
    assert.ok(!ts.some((t) => /qtd/i.test(t)));
    assert.ok(!ts.some((t) => /pizza.*chouri/i.test(t)));
    const k = costume(tl, [], agora).find((x) => /agua/i.test(x.t)).k;
    assert.ok(!costume(tl, [], agora, new Set([k])).some((x) => /agua/i.test(x.t)));
});

test('na app: uma coisa sem tipo mostra «Que produto é?»; escolher o tipo abre a árvore e guarda por cima', async (t) => {
    let pw = null;
    try { pw = (await import('node:module')).createRequire(import.meta.url)('playwright'); } catch { return t.skip('sem playwright'); }
    const { abrir } = await import('./servidor.mjs');
    const { esquecerTipos } = await import('../proxy/src/sugerir.js');
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
        s.env.DB.sql.exec(`INSERT INTO tipo (k, nome, n, casa) VALUES ('pizza', 'Pizza', 2, 1);
            INSERT INTO preco (cadeia, id, url, nome, cent, tipo, visto, falhas) VALUES ('continente', 'p1', 'https://www.continente.pt/p1', 'Pizza Fiambre', 299, 'pizza', '${agora}', 0);`);
        esquecerTipos();
        await s.api('/api/lista', chave, { ops: [{ o: 'j', id: 'piz1', t: 'Mini pizza cheddar un' }] });
        await a.reload();
        await a.waitForSelector('.item');
        await a.click('.item .nome, .item b, .item >> nth=0');
        await a.waitForSelector('.subsug .chip:has-text("Pizza")');
        await a.click('.subsug .chip:has-text("Pizza")');
        await a.waitForSelector('#folha [data-onda="juntat:0"]');
        await a.click('#folha [data-onda="juntat:0"]');
        await a.waitForFunction(() => !localStorage.getItem('compras:pend') && !localStorage.getItem('compras:envio'));
        const l = await s.api('/api/lista', chave);
        assert.deepEqual(l.itens.map((i) => i.e?.k), ['pizza']);
        assert.deepEqual(erros, []);
    } finally { await br.close(); await s.fechar(); }
});
