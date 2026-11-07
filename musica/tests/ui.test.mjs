// A app no Chromium, de ponta a ponta: o Worker a sério (Tidal simulado, KV em memória), a ligação ao Tidal pelo
// link de ligação, montar uma playlist a partir de uma proposta do Claude com o motor Onda a correr no browser (WASM),
// afinar, enviar para o Tidal, o gosto e os ajustes. Sem rede.
//   MUSICA_SHOTS=/pasta node --test musica/tests/ui.test.mjs   (com capturas de ecrã)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import worker from '../proxy/src/worker.js';
import { simulador, kv } from './simulador.mjs';

let chromium = null;
try { chromium = createRequire(import.meta.url)('playwright').chromium; } catch { /* sem Playwright: o teste salta */ }
const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const SHOTS = process.env.MUSICA_SHOTS || null;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.wasm': 'application/wasm', '.webmanifest': 'application/manifest+json' };

let estatico, conector, APP, WORKER, env, sim, browser;
const ouvir = (srv) => new Promise((ok) => srv.listen(0, '127.0.0.1', () => ok(`http://127.0.0.1:${srv.address().port}`)));

before(async () => {
    if (!chromium) return;
    sim = simulador();
    globalThis.fetch = sim.fetch;
    estatico = http.createServer((req, res) => {
        const u = new URL(req.url, 'http://x');
        if (!u.pathname.startsWith('/escolaplay/musica/')) { res.writeHead(404); return res.end(); }
        let f = path.join(ROOT, decodeURIComponent(u.pathname.slice('/escolaplay/musica/'.length)) || 'index.html');
        if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(ROOT, 'index.html');
        res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
        res.end(fs.readFileSync(f));
    });
    conector = http.createServer(async (req, res) => {
        const corpo = await new Promise((ok) => { const b = []; req.on('data', (c) => b.push(c)); req.on('end', () => ok(Buffer.concat(b))); });
        const r = await worker.fetch(new Request(WORKER + req.url, { method: req.method, headers: req.headers, body: ['GET', 'HEAD', 'OPTIONS'].includes(req.method) ? undefined : corpo }), env, { waitUntil() {} });
        res.writeHead(r.status, Object.fromEntries(r.headers));
        res.end(Buffer.from(await r.arrayBuffer()));
    });
    APP = (await ouvir(estatico)) + '/escolaplay/musica/';
    WORKER = await ouvir(conector);
    env = { KV: kv(), APP_URL: APP }; // sem Client ID: cola-se na app, como na primeira vez
    await env.KV.put('codigo:ligacao', createHash('sha256').update('LIGAR-123').digest('hex'));
    browser = await chromium.launch();
});
after(async () => { await browser?.close(); estatico?.close(); conector?.close(); });

const PROPOSTA = {
    nome: 'Som para o carro', descricao: 'Gravações de referência.', resumo: 'Jazz modal, soul e eletrónica bem gravados — para ouvir o sistema de som.',
    tendencias: ['Teardrop volta às listas com a reedição em Hi-Res'], opcoes: { faixas: 5, maxArtista: 1, estilo: 'equilibrado', arco: 'onda' },
    candidatas: [
        { artista: 'Miles Davis', titulo: 'So What', ano: 1959, genero: 'jazz', nota: 98, energia: 40, motivo: 'Kind of Blue: referência de gravação.' },
        { artista: 'Nina Simone', titulo: 'Feeling Good', ano: 1965, genero: 'soul', nota: 95, energia: 50, motivo: 'Voz e metais.' },
        { artista: 'Daft Punk', titulo: 'Get Lucky', ano: 2013, genero: 'disco', nota: 88, energia: 80, motivo: 'Graves limpos.' },
        { artista: 'Amália Rodrigues', titulo: 'Barco Negro', ano: 1955, genero: 'fado', nota: 93, energia: 35, motivo: 'Fado essencial.' },
        { artista: 'Massive Attack', titulo: 'Teardrop', ano: 1998, genero: 'trip-hop', nota: 94, energia: 30, motivo: 'Espaço e graves profundos.' },
        { artista: 'Ninguém', titulo: 'Não existe', ano: 2020, genero: 'pop', nota: 60, energia: 50, motivo: 'Não está no Tidal.' },
    ],
};

test('ligar, montar com o motor Onda no browser, afinar, enviar para o Tidal, gosto e ajustes', { skip: !chromium && 'sem Playwright' }, async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: SHOTS ? 2 : 1, serviceWorkers: 'block' });
    const page = await ctx.newPage();
    const erros = [];
    page.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
    page.on('pageerror', (e) => erros.push(String(e)));
    // a página de login do Tidal autoriza logo e volta ao conector com o código
    await page.route('https://login.tidal.com/**', (route) => {
        const u = new URL(route.request().url());
        assert.equal(u.searchParams.get('client_id'), 'ClienteTidal123');
        assert.equal(u.searchParams.get('code_challenge_method'), 'S256');
        route.fulfill({ status: 302, headers: { location: `${WORKER}/tidal/retorno?code=CODIGO-BOM&state=${u.searchParams.get('state')}` } });
    });
    const foto = async (n) => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${n}.png`), fullPage: false }); };

    // 1) o link de ligação → Ligar ao Tidal → volta com a chave
    await page.goto(`${APP}?ligar=LIGAR-123&proxy=${encodeURIComponent(WORKER)}`);
    await page.getByRole('heading', { name: 'Primeiro: a tua app no Tidal' }).waitFor();
    assert.ok(!page.url().includes('ligar='), 'o código sai do endereço');
    assert.ok(await page.getByText(`${WORKER}/tidal/retorno`).count(), 'mostra o Redirect URI a registar');
    await foto('0-client-id');
    await page.locator('#cfg-id').fill('ClienteTidal123');
    await page.getByRole('button', { name: 'Guardar e continuar' }).click();
    await page.getByRole('heading', { name: 'Liga o teu Tidal' }).waitFor();
    assert.equal(await env.KV.get('config:tidal_client_id'), 'ClienteTidal123');
    await foto('1-ligar');
    await page.getByRole('button', { name: 'Ligar ao Tidal' }).click();
    await page.getByText('Ainda não há playlists').waitFor();
    await page.locator('#mu-toast.on').filter({ hasText: 'Tidal ligado' }).waitFor();
    assert.ok(await page.evaluate(() => JSON.parse(localStorage.getItem('musica:chave') || 'null')), 'guarda a chave');
    assert.equal(await page.evaluate(() => localStorage.getItem('musica:codigo')), null, 'esquece o código');
    assert.match(await page.locator('.mu-pill').textContent(), /nelson/);

    // 2) importar uma proposta do Claude: o browser encontra no Tidal e o motor Onda (WASM) escolhe e ordena
    await page.locator('.mu-nav a[data-tab="pedir"]').click();
    await page.locator('#im-json').fill('Aqui está:\n' + JSON.stringify(PROPOSTA));
    await page.getByRole('button', { name: 'Montar playlist' }).click();
    await page.getByRole('heading', { name: 'Som para o carro' }).waitFor();
    assert.equal(await page.locator('#faixas .mu-faixa').count(), 5);
    assert.match(await page.locator('.mu-resumo').textContent(), /sistema de som/);
    const artistas = await page.locator('#faixas .mu-faixa .a').allTextContents();
    assert.equal(new Set(artistas).size, 5, 'máx. 1 por artista');
    assert.ok(!artistas.includes('Ninguém'));
    await foto('2-playlist');

    // 3) afinar: o motor corre no browser a cada mudança
    await page.getByRole('button', { name: 'Afinar no telemóvel' }).click();
    await page.locator('#af-motor').filter({ hasText: 'motor Onda (WASM): 5 faixas de 5' }).waitFor();
    await page.locator('[data-seg="estilo"] button', { hasText: 'Audiófilo' }).click();
    await page.locator('[data-seg="arco"] button', { hasText: 'Acalma' }).click();
    await page.locator('#faixas [data-tirar]').first().click();
    await page.locator('#af-motor').filter({ hasText: '4 faixas de 4' }).waitFor();
    await foto('3-afinar');
    await page.getByRole('button', { name: 'Guardar e enviar para o Tidal' }).click();
    await page.getByRole('link', { name: 'Abrir no Tidal' }).waitFor();
    assert.equal(sim.criadas.length, 1);
    assert.equal(sim.criadas[0].name, 'Som para o carro · afinada');
    assert.equal(sim.itens.length, 4);
    assert.equal(await page.locator('#faixas .mu-faixa').count(), 4);

    // 4) a biblioteca, o gosto e os ajustes
    await page.locator('.mu-nav a[data-tab="playlists"]').click();
    await page.locator('.mu-pl').nth(1).waitFor();
    assert.deepEqual(await page.locator('.mu-pl .nm').allTextContents(), ['Som para o carro · afinada', 'Som para o carro']);
    await page.locator('.mu-nav a[data-tab="gosto"]').click();
    await page.getByRole('heading', { name: 'Artistas que mais aparecem' }).waitFor();
    assert.ok(await page.getByText('So What').count());
    await foto('4-gosto');
    await page.locator('.mu-nav a[data-tab="ajustes"]').click();
    await page.getByText('nelson (PT)').waitFor();
    await page.getByRole('button', { name: 'Testar o motor' }).click();
    await page.locator('#aj-motor-r').filter({ hasText: 'faixas escolhidas de 60' }).waitFor();
    await foto('5-ajustes');

    // 5) um pedido ao Curador
    await page.locator('.mu-nav a[data-tab="pedir"]').click();
    await page.locator('[data-sug]').first().click();
    await page.getByRole('button', { name: 'Pedir ao Curador' }).click();
    await page.getByText('Os teus pedidos').waitFor();
    const pedidos = JSON.parse(await env.KV.get('pedidos'));
    assert.equal(pedidos[0].texto, 'Faixas bem gravadas para testar o som do carro');

    assert.deepEqual(erros, [], 'sem erros na consola');
    await ctx.close();
});
