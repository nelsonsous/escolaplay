// O dia e a noite (0.59.0): Casa → Cores (Automático, como o iPhone; Dia; Noite). O <html> com data-theme="light", o
// fundo, a cor da barra e a barra das horas do iPhone («default» de dia, «black-translucent» à noite); ao abrir, o
// index.html já os acerta conforme o guardado.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { abrir } from './servidor.mjs';
let pw = null;
try { pw = createRequire(import.meta.url)('playwright'); } catch { /* sem playwright */ }

test('as cores: automático segue o iPhone; Dia e Noite na Casa; ao abrir já vem certo', { skip: !pw && 'sem playwright' }, async () => {
    const s = await abrir();
    const br = await pw.chromium.launch();
    try {
        const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, locale: 'pt-PT', colorScheme: 'dark' });
        const a = await ctx.newPage();
        const erros = [];
        a.on('pageerror', (e) => erros.push(e.message));
        const cores = () => a.evaluate(() => [document.documentElement.dataset.theme ?? 'noite', getComputedStyle(document.body).backgroundColor,
            document.querySelector('meta[name="theme-color"]').getAttribute('content'), document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]').getAttribute('content')]);
        await a.goto(s.url());
        await a.waitForFunction(() => localStorage.getItem('compras:chave'));
        assert.deepEqual(await cores(), ['noite', 'rgb(0, 0, 0)', '#000000', 'black-translucent'], 'o iPhone em escuro: noite');
        await a.click('#abas button >> nth=2');
        assert.equal(await a.getAttribute('[data-onda="tema:0"]', 'aria-pressed'), 'true', 'por omissão, automático');
        await a.click('[data-onda="tema:1"]');
        await a.waitForFunction(() => document.documentElement.dataset.theme === 'light');
        assert.deepEqual(await cores(), ['light', 'rgb(255, 255, 255)', '#ffffff', 'default'], 'Dia: claro, e a barra das horas clara');
        assert.equal(await a.getAttribute('[data-onda="tema:1"]', 'aria-pressed'), 'true');
        // ao abrir outra vez com «Dia» guardado, já vem claro do index.html (a barra que o iPhone lê ao abrir)
        await a.reload();
        assert.deepEqual((await cores()).slice(0, 4), ['light', 'rgb(255, 255, 255)', '#ffffff', 'default'], 'ao abrir: já de dia');
        await a.waitForFunction(() => localStorage.getItem('compras:chave'));
        await a.click('#abas button >> nth=2');
        await a.click('[data-onda="tema:2"]');
        await a.waitForFunction(() => document.documentElement.dataset.theme === undefined);
        assert.deepEqual(await cores(), ['noite', 'rgb(0, 0, 0)', '#000000', 'black-translucent'], 'Noite: escuro');
        // automático: o iPhone passa a claro e a app acompanha
        await a.click('[data-onda="tema:0"]');
        await a.emulateMedia({ colorScheme: 'light' });
        await a.waitForFunction(() => document.documentElement.dataset.theme === 'light');
        assert.equal((await cores())[3], 'default');
        assert.deepEqual(erros, []);
    } finally { await br.close(); await s.fechar(); }
});
