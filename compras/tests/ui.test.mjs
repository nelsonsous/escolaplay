// A app no browser (Chromium), com o conector a sério sobre uma KV simulada (tests/servidor.mjs): o aparelho e a casa,
// juntar à lista, a folha com os produtos de cada supermercado, riscar e limpar, sem rede, um segundo telemóvel que
// entra na casa pelo link, partilhar no WhatsApp, e a memória que não cresce com o uso.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { abrir } from './servidor.mjs';

const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = null; }

test('o app/compras.wasm está em dia com o app/compras.onda', () => {
    execFileSync('node', [new URL('../compilar.mjs', import.meta.url).pathname, '--verificar']);
});

test('a lista da casa no browser', { skip: !pw && 'sem playwright' }, async () => {
    const s = await abrir();
    const br = await pw.chromium.launch();
    try {
        const novo = async () => {
            const pg = await (await br.newContext({ viewport: { width: 390, height: 844 }, locale: 'pt-PT' })).newPage();
            pg.erros = [];
            pg.on('pageerror', (e) => pg.erros.push(e.message));
            return pg;
        };
        const a = await novo();
        const itens = (pg) => pg.locator('.item .texto b').allTextContents();
        const ls = (pg, k) => pg.evaluate((k) => localStorage.getItem('compras:' + k), k);
        const juntar = async (pg, t) => { await pg.fill('[data-onda="junta"]', t); await pg.press('[data-onda="junta"]', 'Enter'); };
        const servidor = () => JSON.parse(s.env.KV.m.get([...s.env.KV.m.keys()].find((k) => k.startsWith('lista:'))));

        await a.goto(s.url());
        await a.waitForSelector('.vazio:has-text("A lista está vazia")');
        // o aparelho fica registado numa casa nova, com código
        await a.waitForFunction(() => localStorage.getItem('compras:chave'));
        const codigo = await ls(a, 'codigo');
        assert.match(codigo, /^[A-Z2-9]{8}$/);

        // juntar: vírgulas e « e », a quantidade à frente; o campo volta vazio
        await juntar(a, '2 leites, pão de forma e ovos');
        assert.deepEqual(await itens(a), ['2 × leites', 'pão de forma', 'ovos']);
        assert.equal(await a.inputValue('[data-onda="junta"]'), '');
        await a.waitForFunction(() => !localStorage.getItem('compras:pend') && !localStorage.getItem('compras:envio'));
        assert.deepEqual(servidor().itens.map((i) => [i.t, i.q]), [['leites', 2], ['pão de forma', 1], ['ovos', 1]]);

        // a folha: os produtos parecidos em cada supermercado; escolher o do Continente e o do Lidl
        await a.click('.item .texto >> nth=0');
        await a.waitForSelector('#folha .prods >> nth=3');
        await a.waitForFunction(() => document.querySelectorAll('#folha .prod').length >= 5);
        assert.deepEqual(await a.locator('#folha h3').allTextContents(), ['Continente', 'Pingo Doce', 'Auchan', 'Lidl']);
        assert.equal(await a.textContent('#folha [data-onda="esc:0"]'), 'Leite uht meio gordo continente');
        await a.click('#folha [data-onda="esc:0"]');
        await a.click('#folha [data-onda="esc:300"]');
        assert.match(await a.textContent('#folha .prod.on >> nth=0'), /✓ Leite uht meio gordo continente/);
        await a.click('#folha [data-onda="mais:0"]');
        assert.equal(await a.textContent('#folha .qtd b'), '3');
        await a.keyboard.press('Escape');
        assert.equal(await a.locator('#folha .cartao').count(), 0);
        assert.equal(await a.textContent('.item .texto small >> nth=0'), 'Continente · Lidl');
        assert.deepEqual(await itens(a), ['3 × leites', 'pão de forma', 'ovos']);
        await a.waitForFunction(() => !localStorage.getItem('compras:pend') && !localStorage.getItem('compras:envio'));
        const leite = servidor().itens[0];
        assert.equal(leite.q, 3);
        assert.deepEqual(Object.keys(leite.p), ['continente', 'lidl']);
        assert.equal(leite.p.lidl.url, 'https://www.lidl.pt/p/mimosa-leite-meio-gordo/p701');

        // mais barato: quantos produtos escolhidos em cada um (os preços vêm na volta 3)
        await a.click('#abas button >> nth=1');
        assert.deepEqual(await a.locator('.cadeias li span').allTextContents(),
            ['1 de 3 produtos escolhidos', '0 de 3 produtos escolhidos', '0 de 3 produtos escolhidos', '1 de 3 produtos escolhidos']);
        await a.click('#abas button >> nth=0');

        // partilhar no WhatsApp: o que falta comprar
        assert.equal(await a.getAttribute('a.whats', 'href'), 'https://wa.me/?text=' + encodeURIComponent('Lista das compras:\n• 3 × leites\n• pão de forma\n• ovos'));

        // sem rede: riscar fica aqui e segue quando a rede voltar
        s.falhar(true);
        await a.click('.item .caixa >> nth=2');
        await a.waitForSelector('.rede');
        assert.equal(await a.locator('.item.feito').count(), 1);
        assert.match(await ls(a, 'pend'), /"o":"r"/);
        assert.equal(servidor().itens[2].f, 0);
        s.falhar(false);
        await juntar(a, 'azeite');
        await a.waitForFunction(() => !localStorage.getItem('compras:pend') && !localStorage.getItem('compras:envio'));
        assert.equal(await a.locator('.rede').count(), 0);
        assert.deepEqual(servidor().itens.map((i) => [i.t, i.f]), [['leites', 0], ['pão de forma', 0], ['ovos', 1], ['azeite', 0]]);

        // um segundo telemóvel entra pelo link do convite: a mesma lista; o que ele muda aparece no primeiro
        const conv = decodeURIComponent((await (async () => { await a.click('#abas button >> nth=2'); return a.getAttribute('a.whats', 'href'); })()).split('text=')[1]);
        assert.match(conv, new RegExp(`\\?casa=${codigo}$`));
        const b = await novo();
        await b.goto(s.url(`&casa=${codigo}`));
        await b.waitForFunction((c) => localStorage.getItem('compras:codigo') === c, codigo);
        await b.waitForFunction(() => document.querySelectorAll('.item').length === 4);
        assert.deepEqual(await itens(b), ['3 × leites', 'pão de forma', 'ovos', 'azeite']);
        await b.click('.item .caixa >> nth=0');
        await b.waitForFunction(() => !localStorage.getItem('compras:pend') && !localStorage.getItem('compras:envio'));
        await a.click('#abas button >> nth=0');
        await a.reload();
        await a.waitForFunction(() => document.querySelectorAll('.item.feito').length === 2);
        // tirar os riscados
        await a.click('[data-onda="limpar:0"]');
        assert.deepEqual(await itens(a), ['pão de forma', 'azeite']);
        // entrar com um código que não existe
        await a.click('#abas button >> nth=2');
        await a.fill('[data-onda="codigo"]', 'zzzz-zzzz');
        await a.press('[data-onda="codigo"]', 'Enter');
        await a.waitForSelector('.toast:has-text("Não há nenhuma casa com esse código")');

        // a memória: 200 eventos não fazem crescer o monte (cada evento solta o que reservou)
        await a.click('#abas button >> nth=0');
        await a.waitForFunction(() => !localStorage.getItem('compras:pend') && !localStorage.getItem('compras:envio'));
        const topo = () => a.evaluate(() => Number(new BigInt64Array(window.app.exports.memory.buffer, 15 * 8, 1)[0]));
        await a.click('.item .texto >> nth=0'); await a.keyboard.press('Escape');
        const h0 = await topo();
        await a.evaluate(() => {
            for (let i = 0; i < 50; i++) {
                document.querySelector('#abas button:nth-child(2)').click();
                document.querySelector('#abas button:nth-child(1)').click();
                document.querySelector('.item .texto').click();
                document.querySelector('#folha .veu').click();
            }
        });
        assert.equal(await topo(), h0);
        assert.deepEqual(a.erros, []);
        assert.deepEqual(b.erros, []);
    } finally { await br.close(); await s.fechar(); }
});
