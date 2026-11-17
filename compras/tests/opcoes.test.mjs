// Escolher entre as opções (0.56.5): tocar num dos mais bem cotados escolhe-o e abre as opções dessa loja; escolher
// uma opção fecha a lista; no fim da lista, «✕ Fechar as opções».
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { abrir } from './servidor.mjs';
let pw = null;
try { pw = createRequire(import.meta.url)('playwright'); } catch { /* sem playwright */ }
test('os mais bem cotados abrem as opções da loja; escolher fecha-as', { skip: !pw && 'sem playwright' }, async () => {
    const s = await abrir();
    const { esquecerTipos } = await import('../proxy/src/sugerir.js');
    const agora = new Date().toISOString();
    s.env.DB.sql.prepare("INSERT INTO tipo (k, nome, n, casa) VALUES ('vinho-tinto', 'Vinho tinto', 4, 1)").run();
    const ins = (cadeia, id, nome, cent) => s.env.DB.sql.prepare(`INSERT INTO preco (cadeia, id, url, nome, cent, uc, ub, emb, q, tipo, visto, falhas)
        VALUES (?, ?, ?, ?, ?, ?, 'l', '75 cl', 0.75, 'vinho-tinto', ?, 0)`).run(cadeia, id, `https://www.${cadeia}.pt/p/${id}.html`, nome, cent, Math.round(cent / 0.75), agora);
    ins('continente', 'v1', 'Papa Figos Douro Vinho Tinto', 699); ins('continente', 'v2', 'Monte Velho Alentejo Vinho Tinto', 449);
    ins('auchan', 'v3', 'VINHO TINTO DOURO RESERVA 0.75L', 899); ins('auchan', 'v5', 'VINHO TINTO PAPA FIGOS 0.75L', 799); ins('auchan', 'v6', 'VINHO TINTO BARATO 0.75L', 199);
    ins('pingodoce', 'v4', 'Vinho Tinto Alentejo Pingo Doce', 299);
    s.env.DB.sql.prepare(`INSERT INTO vinho_nota (palavras, fora, nome, nota, n, resumo, fontes, visto) VALUES ('papa figos tinto', '', 'Papa Figos', 91, 1, 'Revista de Vinhos 17/20', '[]', ?)`).run(agora);
    s.env.DB.sql.exec("UPDATE preco SET antes = 999 WHERE id = 'v5'; UPDATE preco SET promo = 1 WHERE id = 'v6'");
    esquecerTipos();
    const br = await pw.chromium.launch();
    const a = await (await br.newContext({ viewport: { width: 390, height: 844 }, locale: 'pt-PT' })).newPage();
    const erros = [];
    a.on('pageerror', (e) => erros.push(e.message));
    await a.goto(s.url());
    await a.waitForFunction(() => localStorage.getItem('compras:chave'));
    await a.fill('[data-onda="junta"]', 'vinho');
    await a.click('#sug .chip:has-text("Vinho tinto")');
    await a.waitForSelector('#folha h3:has-text("Nota")');
    // pelo teclado: a caixa recebe o foco e o Enter escolhe-a (role=button)
    await a.focus('#folha ul.bc li:has-text("PAPA FIGOS 0.75L")');
    assert.equal(await a.getAttribute('#folha ul.bc li:has-text("PAPA FIGOS 0.75L")', 'role'), 'button');
    await a.keyboard.press('Enter');
    await a.waitForSelector('#cad2 .opcoes .op.on:has-text("PAPA FIGOS")');
    assert.match(await a.textContent('#cad2 .pnome'), /PAPA FIGOS/);
    // a promoção à vista: o preço riscado e a percentagem
    assert.equal(await a.textContent('#cad2 > .promo'), '🔥 Promoção · era 9,99 € (−20%)');
    // fechar no fim da lista
    await a.click('#cad2 .opcoes .op-f');
    await a.waitForSelector('#cad2 .opcoes', { state: 'detached' });
    // abrir e escolher outra: fica escolhida e a lista fecha
    await a.click('#cad2 [data-onda^="opc:"]');
    await a.click('#cad2 .opcoes .op:has-text("BARATO")');
    await a.waitForSelector('#cad2 .opcoes', { state: 'detached' });
    assert.match(await a.textContent('#cad2 .pnome'), /BARATO/);
    assert.equal(await a.textContent('#cad2 > .promo'), '🔥 Em promoção'); // só o rótulo, sem o riscado
    assert.equal(await a.locator('#cad2 .mao').count(), 1);
    // escondida, o relógio não pergunta à casa (GET /api/lista); visível, pergunta
    const pedidos = [];
    a.on('request', (r) => { if (r.method() === 'GET' && r.url().endsWith('/api/lista')) pedidos.push(r.url()); });
    await a.evaluate(() => { localStorage.setItem('compras:oculto', '1'); window.app.chamar('tique', 0n); });
    await a.waitForTimeout(300);
    assert.equal(pedidos.length, 0);
    await a.evaluate(() => { localStorage.setItem('compras:oculto', ''); window.app.chamar('tique', 0n); });
    await a.waitForTimeout(300);
    assert.equal(pedidos.length, 1);
    assert.deepEqual(erros, []);
    await br.close(); await s.fechar?.();
});
