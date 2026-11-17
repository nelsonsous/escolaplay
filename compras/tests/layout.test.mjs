// O layout a 390 px (volta 2 das melhorias, 17/11/2026): a lista não transborda para o lado, o preço de cada coisa
// lê-se inteiro, as filas de filtros da folha ficam numa linha que rola, e uma coisa que não há em lado nenhum diz-o
// numa frase só.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { abrir } from './servidor.mjs';

let pw = null;
try { pw = createRequire(import.meta.url)('playwright'); } catch { /* sem playwright */ }

test('a 390 px: sem transbordo, filtros numa linha, e «não encontrei» numa frase', { skip: !pw && 'sem playwright' }, async () => {
    const s = await abrir();
    const br = await pw.chromium.launch();
    try {
        const a = await (await br.newContext({ viewport: { width: 390, height: 844 }, locale: 'pt-PT' })).newPage();
        const erros = [];
        a.on('pageerror', (e) => erros.push(e.message));
        await a.goto(s.url());
        await a.waitForFunction(() => localStorage.getItem('compras:chave'));
        const chave = await a.evaluate(() => localStorage.getItem('compras:chave'));
        // a folha da água: cada fila de filtros (tamanho, variante, marca) numa linha só, que rola para o lado
        await a.fill('[data-onda="junta"]', 'agua');
        await a.click('#sug .chip:has-text("Água sem gás")');
        await a.waitForSelector('#folha [data-onda="juntat:0"]');
        const filas = await a.locator('#folha .chips.n4, #folha .chips.n3, #folha .chips.n5').evaluateAll((l) => l.map((x) => [x.clientHeight, getComputedStyle(x).flexWrap, x.scrollWidth >= x.clientWidth]));
        assert.ok(filas.length >= 2);
        for (const [alt, quebra] of filas) { assert.ok(alt < 64, `a fila tem ${alt} px de altura`); assert.equal(quebra, 'nowrap'); }
        // escolher um tamanho ao fundo da fila: continua à vista depois de redesenhar
        const ultimo = a.locator('#folha .chips.n4 .chip >> nth=-1');
        const txt = await ultimo.textContent();
        await ultimo.click();
        await a.waitForSelector(`#folha .chips.n4 .chip.on:has-text("${txt}")`);
        await a.waitForTimeout(100);
        assert.ok(await a.locator('#folha .chips.n4 .chip.on').evaluate((x) => { const p = x.parentElement; return x.offsetLeft >= p.scrollLeft && x.offsetLeft + x.offsetWidth <= p.scrollLeft + p.clientWidth + 1; }));
        await a.click('#folha .fechar');
        // a lista com uma coisa de nome comprido e o «Costumas comprar»: nada passa da largura do ecrã
        const casa = s.env.DB.sql.prepare('SELECT id FROM casa LIMIT 1').get().id;
        s.env.DB.sql.prepare('INSERT INTO talao (id, casa, loja, dia, total, linhas, criado) VALUES (?, ?, ?, ?, ?, ?, ?)').run('t1', casa, 'spar', '2026-11-17', 384,
            JSON.stringify([{ t: 'Mini Pizza York Cheddar un com um nome mesmo muito comprido', q: 1, cent: 199 }]), new Date().toISOString());
        await s.api('/api/lista', chave, { ops: [{ o: 'j', id: 'pilh', t: 'pilhas alcalinas recarregáveis AAA de longa duração' }, { o: 'j', id: 'leit', t: 'leite' }] });
        await a.reload();
        await a.waitForSelector('.item >> nth=1');
        await a.waitForSelector('.cost-par .costx');
        assert.ok(await a.evaluate(() => document.documentElement.scrollWidth) <= 390, 'a lista transborda para o lado');
        // o ✕ da sugestão fica na mesma linha da sugestão, com 44 px
        const par = await a.locator('.cost-par').first().evaluate((x) => { const c = x.querySelector('.chip').getBoundingClientRect(), b = x.querySelector('.costx').getBoundingClientRect(); return [Math.abs(c.top - b.top) < 2, Math.round(b.width), b.height >= 44]; });
        assert.deepEqual(par, [true, 44, true]);
        // uma coisa que não há em nenhum supermercado: uma frase só
        await a.click('.item:has-text("pilhas") .texto');
        await a.waitForSelector('#folha .nota:has-text("Não encontrei «pilhas alcalinas")');
        assert.equal(await a.locator('#folha .nota:has-text("Nada parecido")').count(), 0);
        assert.deepEqual(erros, []);
    } finally { await br.close(); await s.fechar(); }
});
