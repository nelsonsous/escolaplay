// A app — uma app em Onda (app/musica.onda + onda/lib/app.onda + motor.onda, corrida por onda/rt/anfitriao.js) — no
// Chromium, de ponta a ponta: o Worker a sério (Tidal simulado, KV em memória), ligar o Tidal pelo link de ligação,
// uma playlist publicada como o Maestro a publica, afinar (o motor Onda dentro da app) com o juiz a confirmar a
// ordem contra o curador.wasm em cada mudança, juntar uma faixa do Tidal, guardar e enviar, gosto, ajustes e pedir.
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
import { encontrar, preparar, afinar, paraGuardar } from '../lib/curadoria.js';
import { curar } from '../onda/onda.js';
import { qualidadeSom } from '../lib/tidal.js';

let chromium = null;
try { chromium = createRequire(import.meta.url)('playwright').chromium; } catch { /* sem Playwright: o teste salta */ }
const MUSICA = path.resolve(new URL('..', import.meta.url).pathname);
const RAIZ = path.resolve(MUSICA, '..');
const SHOTS = process.env.MUSICA_SHOTS || null;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.wasm': 'application/wasm', '.webmanifest': 'application/manifest+json' };
const CURADOR = fs.readFileSync(path.join(MUSICA, 'onda', 'curador.wasm'));

let estatico, conector, APP, WORKER, env, sim, browser;
const ouvir = (srv) => new Promise((ok) => srv.listen(0, '127.0.0.1', () => ok(`http://127.0.0.1:${srv.address().port}`)));

before(async () => {
    if (!chromium) return;
    sim = simulador();
    globalThis.fetch = sim.fetch;
    // o repositório servido em /escolaplay/ (a app em /escolaplay/musica/, o anfitrião em /escolaplay/onda/rt/)
    estatico = http.createServer((req, res) => {
        const u = new URL(req.url, 'http://x');
        if (!u.pathname.startsWith('/escolaplay/')) { res.writeHead(404); return res.end(); }
        let f = path.join(RAIZ, decodeURIComponent(u.pathname.slice('/escolaplay/'.length)));
        if (f.endsWith('/')) f = path.join(f, 'index.html');
        if (!f.startsWith(RAIZ) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
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

// a playlist publicada como o Maestro a publica (o mesmo pipeline do publicar.mjs)
async function publicarComoCurador() {
    const agente = await env.KV.get('agente:chave');
    const api = async (p, init = {}) => (await worker.fetch(new Request(WORKER + p, { ...init, headers: { authorization: `Bearer ${agente}`, 'content-type': 'application/json' } }), env, { waitUntil() {} })).json();
    const candidatas = [
        { artista: 'Miles Davis', titulo: 'So What', ano: 1959, genero: 'jazz', nota: 98, energia: 40, motivo: 'Kind of Blue: referência de gravação.' },
        { artista: 'Nina Simone', titulo: 'Feeling Good', ano: 1965, genero: 'soul', nota: 95, energia: 50, motivo: 'Voz e metais.' },
        { artista: 'Daft Punk', titulo: 'Get Lucky', ano: 2013, genero: 'disco', nota: 88, energia: 80, motivo: 'Graves limpos.' },
        { artista: 'Massive Attack', titulo: 'Teardrop', ano: 1998, genero: 'trip-hop', nota: 94, energia: 30, motivo: 'Espaço e graves profundos.' },
        { artista: 'Miles Davis', titulo: 'Faixa 3', ano: 1959, genero: 'jazz', nota: 80, energia: 45, motivo: 'Mais Miles.' },
        { artista: 'Miles Davis', titulo: 'Faixa 7', ano: 1959, genero: 'jazz', nota: 78, energia: 55, motivo: 'Ainda mais Miles.' },
        { artista: 'Ninguém', titulo: 'Não existe', ano: 2020, genero: 'pop', nota: 60, energia: 50, motivo: 'Não está no Tidal.' },
    ];
    const opcoes = { faixas: 5, maxArtista: 1, estilo: 'equilibrado', arco: 'onda' };
    const enc = await encontrar(candidatas, async (lote) => (await api('/api/resolver', { method: 'POST', body: JSON.stringify({ faixas: lote }) })).faixas);
    const perfil = await api('/api/perfil');
    const cands = preparar(enc, perfil);
    const { faixas, custo } = await afinar(opcoes, cands, CURADOR);
    return api('/api/playlists', { method: 'POST', body: JSON.stringify({ nome: 'Som para o carro', descricao: 'Gravações de referência.',
        resumo: 'Jazz modal, soul e eletrónica bem gravados — para ouvir o sistema de som.', tendencias: ['Teardrop volta às listas com a reedição em Hi-Res'],
        opcoes, faixas, custo, candidatas: paraGuardar(cands), tidal: false }) });
}

// o juiz: a ordem que a app (Onda, no browser) mostra tem de ser a do curador.wasm com as mesmas entradas
const sinaisJuntada = (f) => ({ artista: f.artistas[0] || '', genero: f.generos[0] || '', ano: f.ano, gosto: 0, qualidade: qualidadeSom(f.tags),
    tendencia: f.popularidade, claude: 700, novidade: 1000, energia: f.bpm ? Math.min(950, Math.max(100, Math.round(((f.bpm - 60) * 1000) / 110))) : 500,
    bpm: f.bpm, tom: f.tom, fixa: true });
async function esperado(doc, op, { tiradas = new Set(), fixas = new Set(), juntadas = [] } = {}) {
    const usadas = [];
    doc.candidatas.forEach((c, i) => { if (!tiradas.has(i)) usadas.push({ id: c.faixa.id, s: { ...c.sinais, fixa: c.sinais.fixa || fixas.has(i) } }); });
    juntadas.forEach((f) => usadas.push({ id: f.id, s: sinaisJuntada(f) }));
    const { ordem } = await curar(CURADOR, { k: Math.min(op.faixas, usadas.length), maxArtista: op.maxArtista, estilo: op.estilo, arco: op.arco }, usadas.map((u) => u.s));
    return ordem.map((o) => usadas[o.i].id);
}
const mostradas = (page) => page.$$eval('#faixas .mu-faixa .mu-tocar', (as) => as.map((a) => a.href.split('/').pop()));
const heap = (page) => page.evaluate(() => Number(new BigInt64Array(window.app.exports.memory.buffer, 15 * 8, 1)[0]));

test('a app em Onda: ligar, playlist do Maestro, afinar com o juiz, juntar, enviar, gosto, ajustes e pedir', { skip: !chromium && 'sem Playwright' }, async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: SHOTS ? 2 : 1, serviceWorkers: 'block' });
    const page = await ctx.newPage();
    const erros = [];
    page.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
    page.on('pageerror', (e) => erros.push(String(e)));
    if (process.env.MUSICA_DEBUG) { page.on('console', (m) => m.text() && console.log('consola:', m.type(), m.text().slice(0, 300))); page.on('pageerror', (e) => console.log('pageerror:', String(e).slice(0, 400))); }
    // as capas vêm do Tidal e do Deezer: no teste, uma imagem de 1 px (sem ir à rede)
    const PIXEL = Buffer.from('R0lGODlhAQABAIAAAP///wAAACwAAAAAAQABAAACAkQBADs=', 'base64');
    await page.route('https://cdn-images.dzcdn.net/**', (route) => route.fulfill({ status: 200, contentType: 'image/gif', body: PIXEL }));
    await page.route('https://resources.tidal.com/**', (route) => route.fulfill({ status: 200, contentType: 'image/gif', body: PIXEL }));
    await page.route('https://login.tidal.com/**', (route) => {
        const u = new URL(route.request().url());
        assert.equal(u.searchParams.get('client_id'), 'ClienteTidal123');
        assert.equal(u.searchParams.get('code_challenge_method'), 'S256');
        route.fulfill({ status: 302, headers: { location: `${WORKER}/tidal/retorno?code=CODIGO-BOM&state=${u.searchParams.get('state')}` } });
    });
    const foto = async (n) => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${n}.png`) }); };
    const nav = (v) => page.locator(`#mu-nav [data-onda="ir\t${v}"]`).click();

    // 1) o link de ligação: Client ID, ligar, voltar com a chave
    await page.goto(`${APP}?ligar=LIGAR-123&proxy=${encodeURIComponent(WORKER)}`);
    await page.getByRole('heading', { name: 'Primeiro: a tua app no Tidal' }).waitFor();
    assert.ok(!page.url().includes('ligar='), 'o código sai do endereço');
    assert.ok(await page.getByText(`${WORKER}/tidal/retorno`).count(), 'mostra o Redirect URI a registar');
    await foto('0-client-id');
    await page.locator('[data-onda="cid"]').fill('ClienteTidal123');
    await page.getByRole('button', { name: 'Guardar e continuar' }).click();
    await page.getByRole('heading', { name: 'Liga o teu Tidal' }).waitFor();
    assert.equal(await env.KV.get('config:tidal_client_id'), 'ClienteTidal123');
    await page.getByRole('button', { name: 'Ligar ao Tidal' }).click();
    await page.getByText('Ainda não há playlists').waitFor();
    await page.locator('#mu-aviso').getByText('Tidal ligado').waitFor();
    assert.ok(await page.evaluate(() => localStorage.getItem('musica:chave')), 'guarda a chave');
    assert.equal(await page.evaluate(() => localStorage.getItem('musica:codigo')), null, 'esquece o código');
    assert.match(await page.locator('.mu-pill').textContent(), /nelson/);

    // 2) o Maestro publica; a lista e a playlist
    const doc = await publicarComoCurador();
    assert.equal(doc.candidatas.length, 6);
    await nav(1);
    await page.locator('.mu-pl').getByText('Som para o carro').waitFor();
    // o cartão abre-se ali mesmo: as faixas, ouvir 30 s (as que têm pré-escuta), «não esta» e afinar; «Abrir» leva à playlist
    assert.ok(await page.locator('.mu-pl .chev').first().isVisible(), 'a seta mostra que o cartão abre');
    await page.locator('.mu-pl-a').click();
    // o cartão abre logo com o tamanho certo; as faixas e as pré-escutas chegam depois só para dentro dele (não treme,
    // e quem já está a escrever na caixa de afinar não perde o teclado)
    const caixa = await page.locator('.mu-pl.aberta [placeholder^="Ex.: menos eletrónica"]').elementHandle();
    await caixa.focus();
    await page.locator('.mu-pl.aberta .mu-xf li:not(.sk)').first().waitFor();
    assert.equal(await page.locator('.mu-pl.aberta .mu-xf li').count(), doc.faixas.length);
    await page.locator('.mu-pl.aberta [data-previa]').first().waitFor();
    assert.ok(await caixa.evaluate((el) => el.isConnected && document.activeElement === el), 'a caixa de afinar ficou (com o foco)');
    assert.equal(await page.getAttribute('.mu-pl.aberta .mu-pl-a', 'aria-expanded'), 'true');
    const previa = await page.locator('.mu-pl.aberta [data-previa]').first().getAttribute('data-previa');
    assert.match(previa, /^https:\/\/(audio|cdn\.deezer)\.example\//);
    await page.evaluate(() => { window.musicaLeitor.play = () => Promise.resolve(); }); // (sem ir à rede no teste)
    await page.locator('.mu-pl.aberta [data-previa]').first().click();
    assert.equal(await page.evaluate(() => window.musicaLeitor.dataset.src), previa, 'toca a pré-escuta');
    // as capas dos álbuns nas faixas: do Tidal, e do Deezer quando o Tidal não tem (as outras ficam com o quadrado cinzento)
    const srcs = await page.locator('.mu-pl.aberta .mu-xf .cp img').evaluateAll((l) => l.map((i) => i.getAttribute('src')));
    assert.ok(srcs.some((u) => /^https:\/\/resources\.tidal\.com\/images\/[0-9a-f/]+\/160x160\.jpg$/.test(u)), 'capas do Tidal');
    assert.ok(srcs.every((u) => /^https:\/\/(resources\.tidal\.com|cdn-images\.dzcdn\.net)\//.test(u)));
    assert.equal(await page.locator('.mu-pl.aberta .mu-xf .cp').count(), doc.faixas.length);
    await page.locator('.mu-pl.aberta [placeholder^="Ex.: menos eletrónica"]').waitFor();
    await page.locator('.mu-pl-a').click();
    assert.equal(await page.locator('.mu-pl.aberta').count(), 0, 'tocar outra vez fecha');
    await page.locator('.mu-pl-a').click();
    await page.getByRole('button', { name: 'Abrir' }).click();
    await page.getByRole('heading', { name: 'Som para o carro' }).waitFor();
    assert.equal(await page.locator('#faixas .mu-faixa').count(), doc.faixas.length);
    assert.deepEqual(await mostradas(page), doc.faixas.map((f) => f.id), 'a ordem guardada');
    assert.match(await page.locator('.mu-resumo').textContent(), /sistema de som/);
    await foto('1-playlist');

    // 3) afinar: o motor Onda dentro da app, e o juiz em cada mudança
    const op = { faixas: 5, maxArtista: 1, estilo: 'equilibrado', arco: 'onda' };
    const tiradas = new Set(), fixas = new Set(), juntadas = [];
    const juiz = async (msg) => assert.deepEqual(await mostradas(page), await esperado(doc, op, { tiradas, fixas, juntadas }), msg);
    await page.getByRole('button', { name: 'Afinar no telemóvel' }).click();
    await page.locator('#af-motor').filter({ hasText: 'motor Onda (WASM): 4 faixas de 6' }).waitFor();
    await juiz('afinar: as opções guardadas');
    await page.locator('[data-onda="af-mx\t2"]').click(); op.maxArtista = 2;
    await page.locator('#af-motor').filter({ hasText: '5 faixas de 6' }).waitFor();
    await juiz('máximo 2 por artista');
    await page.locator('[data-onda="af-es\t4"]').click(); op.estilo = 'audiofilo';
    await page.locator('[data-onda="af-ar\t2"]').click(); op.arco = 'desce';
    await juiz('audiófilo, a acalmar');
    const primeira = await page.locator('#faixas [data-onda^="tirar"]').first().getAttribute('data-onda');
    await page.locator(`#faixas [data-onda="${primeira}"]`).click(); tiradas.add(Number(primeira.split('\t')[1]));
    await page.locator('#af-motor').filter({ hasText: 'faixas de 5' }).waitFor();
    await juiz('sem a primeira');
    const ultima = await page.locator('#faixas [data-onda^="fixar"]').last().getAttribute('data-onda');
    await page.locator(`#faixas [data-onda="${ultima}"]`).click(); fixas.add(Number(ultima.split('\t')[1]));
    assert.equal(await page.locator('#faixas .mu-faixa.fixa').count(), 1);
    await juiz('com uma fixada');
    // juntar uma faixa do Tidal
    await page.locator('[data-onda="q"]').fill('Amália Barco Negro');
    await page.getByRole('button', { name: 'Procurar no Tidal' }).click();
    await page.locator('[data-onda="juntar\t0"]').click();
    await page.locator('#mu-aviso').getByText('entra (fixada)').waitFor();
    const barco = (await worker.fetch(new Request(WORKER + '/api/pesquisa?q=barco%20negro', { headers: { authorization: `Bearer ${await env.KV.get('agente:chave')}` } }), env, {}).then((r) => r.json())).faixas[0];
    juntadas.push(barco);
    op.faixas = Math.min(op.faixas + 1, doc.candidatas.length - tiradas.size + juntadas.length);
    await juiz('com a faixa juntada');
    assert.ok((await mostradas(page)).includes(barco.id));
    // o deslizador (eventos "input", entre 5 e o número de candidatas): o motor corre a cada passo; e o monte não cresce
    const h0 = await heap(page);
    for (let i = 0; i < 60; i++) await page.evaluate((v) => { const e = document.querySelector('[data-onda="af-n"]'); e.value = String(v); e.dispatchEvent(new Event('input', { bubbles: true })); }, 6 - (i % 2));
    await page.evaluate(() => { const e = document.querySelector('[data-onda="af-n"]'); e.value = '5'; e.dispatchEvent(new Event('input', { bubbles: true })); });
    op.faixas = 5;
    await page.locator('#af-motor').filter({ hasText: 'motor Onda (WASM): 5 faixas de 6' }).waitFor();
    await juiz('5 faixas pelo deslizador');
    assert.ok((await heap(page)) - h0 < 200, `o monte cresceu ${(await heap(page)) - h0} palavras em 61 eventos`);
    await foto('2-afinar');

    // 4) guardar e enviar para o Tidal: a app manda a decisão; o Worker monta a versão
    const ordemFinal = await mostradas(page);
    await page.getByRole('button', { name: 'Guardar e enviar para o Tidal' }).click();
    await page.getByRole('link', { name: 'Ouvir no Tidal', exact: true }).waitFor();
    await page.locator('#mu-aviso').getByText('Guardada no Tidal').waitFor();
    assert.equal(sim.criadas.length, 1);
    assert.equal(sim.criadas[0].name, 'Som para o carro', 'a mesma playlist, sem «· afinada»');
    assert.deepEqual(sim.itens, ordemFinal, 'o Tidal recebe a ordem do motor Onda');
    assert.deepEqual(await mostradas(page), ordemFinal);
    const idx = JSON.parse(await env.KV.get('playlists'));
    const nova = JSON.parse(await env.KV.get('playlist:' + idx[0].id));
    assert.equal(idx.length, 1, 'sem cópias na biblioteca');
    assert.ok(nova.afinadaEm);
    assert.deepEqual(nova.opcoes, { faixas: 5, maxArtista: 2, estilo: 'audiofilo', arco: 'desce' });
    assert.equal(nova.faixas.find((f) => f.id === barco.id).motivo, 'Escolhida por ti.');
    assert.equal(nova.candidatas.length, 7, 'as candidatas da original e a juntada');

    // 5) a biblioteca, o gosto e os ajustes — com a playlist descida, a vista nova abre no topo
    await page.evaluate(() => window.scrollTo(0, 300));
    assert.ok((await page.evaluate(() => window.scrollY)) > 0, 'a playlist dá para descer');
    await nav(5);
    await page.getByRole('heading', { name: 'Este aparelho' }).waitFor();
    assert.ok(await page.evaluate(() => document.documentElement.scrollHeight - innerHeight >= 300), 'os Ajustes também dão para descer');
    assert.equal(await page.evaluate(() => window.scrollY), 0, 'a vista nova abre no topo');
    await nav(1);
    await page.locator('.mu-pl').first().waitFor();
    assert.deepEqual(await page.locator('.mu-pl .nm').allTextContents(), ['Som para o carro']);
    // depois de aberta uma vez, a playlist tem capa: o mosaico de 4 capas pequenas
    assert.equal(await page.locator('.mu-pl .mu-pl-capa.m4 img').count(), 4);
    assert.match(await page.locator('.mu-pl .mu-pl-capa img').first().getAttribute('src'), /\/80x80\.jpg$|\/56x56-/);
    // como correu (o conector avalia-a: ainda é cedo) e atualizar sozinha (liga-se aqui; o Maestro renova-a)
    const agente = await env.KV.get('agente:chave');
    assert.equal((await worker.fetch(new Request(WORKER + '/api/avaliacoes', { headers: { authorization: `Bearer ${agente}` } }), env, { waitUntil() {} })).status, 200);
    await page.locator('.mu-pl').first().locator('.mu-pl-a').click();
    await page.getByRole('button', { name: 'Abrir' }).click();
    await page.getByRole('heading', { name: 'Como correu' }).waitFor();
    await page.getByText('Ainda é cedo.').waitFor();
    await page.getByRole('button', { name: 'Desligado' }).click();
    await page.getByRole('button', { name: 'Ligado' }).waitFor();
    await page.locator('#mu-aviso').getByText('Passa a atualizar-se sozinha').waitFor();
    assert.equal(JSON.parse(await env.KV.get('playlist:' + JSON.parse(await env.KV.get('playlists'))[0].id)).renovar, true);
    // mudar o nome: na app e no Tidal (o mesmo link)
    await page.getByRole('button', { name: 'Mudar o nome' }).click();
    await page.locator('[data-onda="rn-nome"]').fill('Som do BMW');
    await page.locator('[data-onda="rn-desc"]').fill('Para testar o carro.');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await page.locator('#mu-aviso').getByText(/Nome mudado/).waitFor();
    await page.getByRole('heading', { name: 'Som do BMW' }).waitFor();
    const renomeada = JSON.parse(await env.KV.get('playlist:' + JSON.parse(await env.KV.get('playlists'))[0].id));
    assert.deepEqual([renomeada.nome, renomeada.descricao], ['Som do BMW', 'Para testar o carro.']);
    if (renomeada.tidal) assert.equal(sim.renomeadas.at(-1).name, 'Som do BMW');
    await nav(1);
    await page.locator('.mu-pl').first().getByText('↻').waitFor();
    // mais como esta: toca-se numa faixa e cria-se logo no Tidal uma playlist de parecidas
    await page.locator('.mu-pl').first().locator('.mu-pl-a').click();
    await page.getByRole('button', { name: 'Abrir' }).click();
    await page.locator('#faixas .mu-faixa-a').first().waitFor();
    await page.locator('#faixas .mu-faixa-a').first().click();
    await page.getByRole('button', { name: 'Mais como esta' }).click();
    await page.getByRole('heading', { name: /^Parecidas com / }).waitFor();
    await page.locator('#mu-aviso').getByText('Criada no Tidal').waitFor();
    assert.equal(sim.criadas.length, 2);
    assert.match(sim.criadas[1].name, /^Parecidas com /);
    await nav(1);
    await page.locator('.mu-pl').nth(1).waitFor();
    // as tendências: 9 dias de tabelas (a Nina Simone, que segues, a subir em Portugal)
    const { recolher } = await import('../proxy/src/tendencias.js');
    for (let d = 0; d < 9; d++) {
        const lista = Array.from({ length: 30 }, (_, i) => [`Artista ${i}`, `Canção ${i}`, 'Pop']);
        lista.splice(d < 2 ? 25 : 25 - (d - 1) * 3, 0, ['Nina Simone', 'Feeling Good', 'Jazz']);
        sim.tabelas.pt = lista;
        await recolher(env, Date.parse('2026-11-01T04:23:00Z') + d * 864e5);
    }
    await nav(4);
    await page.getByRole('heading', { name: 'Artistas que mais aparecem' }).waitFor();
    assert.ok(await page.getByText('So What').count());
    await page.getByRole('heading', { name: 'O que se está a ouvir' }).waitFor();
    const paraTi = page.locator('.mu-card', { has: page.getByRole('heading', { name: 'Para ti' }) });
    assert.match(await paraTi.locator('.mu-faixa').first().innerText(), /Feeling Good[\s\S]*Nina Simone[\s\S]*Portugal \(Apple Music\) · n\.º 5 · a subir \(era 26\.º\) · segues/);
    assert.equal(await paraTi.locator('.mu-tocar').first().getAttribute('href'), 'https://tidal.com/search?q=Nina%20Simone+Feeling%20Good');
    assert.ok(await page.getByRole('heading', { name: 'Mundo (Deezer)' }).count());
    await foto('3-gosto');
    await nav(5);
    await page.getByText('nelson (PT)').waitFor();
    await page.getByRole('button', { name: 'Testar o motor' }).click();
    await page.locator('#aj-motor-r').filter({ hasText: 'faixas escolhidas de 60' }).waitFor();
    await foto('4-ajustes');

    // 6) um pedido ao Maestro
    await nav(3);
    // o botão logo a seguir ao texto, antes das ideias: com o teclado do iPhone aberto fica à vista
    await page.locator('[data-onda="sug\t0"]').waitFor();
    await page.waitForLoadState('networkidle');
    const [fimTexto, botao, ideia] = await page.evaluate(() => [document.querySelector('[data-onda="ptx"]').getBoundingClientRect().bottom,
        document.querySelector('[data-onda="pedir"]').getBoundingClientRect().top, document.querySelector('[data-onda="sug\t0"]').getBoundingClientRect().top]);
    assert.ok(botao > fimTexto && botao - fimTexto < 40, `o botão está a ${botao - fimTexto}px do texto`);
    assert.ok(ideia > botao, 'as ideias vêm depois do botão');
    if (SHOTS) {
        await page.setViewportSize({ width: 390, height: 420 }); // o que fica à vista com o teclado aberto
        await page.locator('[data-onda="ptx"]').focus();
        await page.evaluate(() => document.querySelector('[data-onda="ptx"]').scrollIntoView({ block: 'start' }));
        await page.evaluate(() => window.scrollBy(0, -70));
        await page.screenshot({ path: path.join(SHOTS, 'pedir-teclado.png') });
        await page.setViewportSize({ width: 390, height: 844 });
    }
    await page.locator('[data-onda="sug\t0"]').click();
    assert.equal(await page.locator('[data-onda="ptx"]').inputValue(), 'Faixas bem gravadas para testar o som do carro');
    // sem letras explícitas (para os mais novos): nas opções
    await page.getByRole('button', { name: 'Mudar' }).click();
    await page.getByRole('button', { name: 'Sem letras explícitas' }).click();
    assert.equal(await page.getByRole('button', { name: 'Sem letras explícitas' }).getAttribute('aria-pressed'), 'true');
    await page.getByRole('button', { name: 'Fechar' }).click();
    await page.getByText(/· sem letras explícitas/).waitFor();
    await page.getByRole('button', { name: 'Pedir ao Maestro' }).click();
    await page.getByText('Os teus pedidos').waitFor();
    const pedido = JSON.parse(await env.KV.get('pedidos'))[0];
    assert.equal(pedido.texto, 'Faixas bem gravadas para testar o som do carro');
    assert.equal(pedido.opcoes.limpa, true);

    // 7) as ideias do Maestro (as do momento), as propostas para escolher, «não esta» e afinar com o Maestro
    const agente7 = await env.KV.get('agente:chave');
    const api7 = async (p, corpo) => (await worker.fetch(new Request(WORKER + p, { method: 'POST', headers: { authorization: `Bearer ${agente7}`, 'content-type': 'application/json' }, body: JSON.stringify(corpo) }), env, { waitUntil() {} })).json();
    await api7('/api/ideias', { ideias: [{ texto: 'Ideia para qualquer hora', momento: 'sempre', porque: 'Porque o fim do dia pede calma', opcoes: { arco: 'desce' } }, { texto: 'Ideia de dia', momento: 'dia' }, { texto: 'Ideia de noite', momento: 'noite' }] });
    await nav(1);
    await nav(3);
    await page.getByRole('button', { name: 'Ideia para qualquer hora' }).click();
    assert.equal(await page.locator('[data-onda="ptx"]').inputValue(), 'Ideia para qualquer hora', 'o porquê não vai para o pedido');
    assert.equal(await page.locator('.mu-chip.ideia span').first().textContent(), 'Porque o fim do dia pede calma', 'o porquê aparece por baixo da ideia');
    const dia = new Date().getUTCHours() >= 7 && new Date().getUTCHours() < 20;
    assert.equal(await page.getByRole('button', { name: dia ? 'Ideia de dia' : 'Ideia de noite' }).count(), 1);
    assert.equal(await page.getByRole('button', { name: dia ? 'Ideia de noite' : 'Ideia de dia' }).count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Jazz para um domingo de manhã' }).count(), 0, 'com ideias do Maestro, as de sempre saem');
    const bmw = JSON.parse(await env.KV.get('playlist:' + JSON.parse(await env.KV.get('playlists')).find((x) => x.nome === 'Som do BMW').id));
    for (const v of ['Mais conhecida', 'Mais descoberta']) {
        await api7('/api/playlists', { nome: `Noite · ${v}`, pedido: 'Para conduzir à noite', faixas: bmw.faixas, candidatas: bmw.candidatas, opcoes: bmw.opcoes, rascunho: true, grupo: 'qgrupo1', variante: v, tidal: true });
    }
    await nav(1);
    await page.getByRole('heading', { name: 'Propostas para escolher' }).waitFor();
    const grupo = page.locator('details.mu-grupo');
    await grupo.getByText('«Para conduzir à noite»').waitFor();
    assert.equal(await grupo.locator('.mu-pl').count(), 2);
    await grupo.locator('.mu-pl-a', { hasText: 'Mais descoberta' }).click();
    await page.getByRole('button', { name: 'Abrir' }).click();
    await page.getByText(/Proposta «Mais descoberta»/).waitFor();
    const nCriadas = sim.criadas.length;
    await page.getByRole('button', { name: 'Enviar para o Tidal' }).click();
    await page.locator('#mu-aviso').getByText('Criada no Tidal').waitFor();
    assert.equal(sim.criadas.length, nCriadas + 1);
    await page.locator('#faixas .mu-faixa-a').first().click();
    await page.getByRole('button', { name: 'Não esta' }).click();
    await page.locator('#faixas .mu-faixa.fora').first().waitFor();
    await page.locator('[data-onda="af-tx"]').fill('Mais vozes, menos jazz');
    await page.getByRole('button', { name: 'Pedir para afinar' }).click();
    await page.locator('#mu-aviso').getByText(/Pedido de afinação enviado/).waitFor();
    const af = JSON.parse(await env.KV.get('pedidos'))[0];
    assert.deepEqual([af.texto, af.afinar.rejeitadas.length], ['Mais vozes, menos jazz', 1]);
    await nav(1);
    await page.getByRole('heading', { name: 'Propostas para escolher' }).waitFor();
    assert.equal(await page.locator('details.mu-grupo .mu-pl').count(), 1, 'a escolhida sai das propostas');
    // agrupar por: data (por omissão), tipo, género, Tidal, avaliação — e fica escolhido
    await page.getByRole('heading', { name: /^Esta semana/ }).waitFor();
    await page.getByRole('button', { name: 'Tidal', exact: true }).click();
    await page.getByRole('heading', { name: /^No Tidal/ }).waitFor();
    assert.equal(await page.getByRole('heading', { name: /^Esta semana/ }).count(), 0);
    await page.getByRole('button', { name: 'Tipo', exact: true }).click();
    await page.getByRole('heading', { name: /^Do Maestro|^Feitas por ti|^Dos teus pedidos|^Atualizam-se sozinhas/ }).first().waitFor();
    assert.equal(await page.evaluate(() => localStorage.getItem('musica:agrupar')), '1');
    await page.getByRole('button', { name: 'Data', exact: true }).click();
    await foto('5-pedir');

    // 7) voltar a abrir: a chave fica, a app abre ligada
    await page.reload();
    await page.locator('.mu-pl').nth(1).waitFor();
    assert.deepEqual(erros, [], 'sem erros na consola');
    await ctx.close();
});

test('outro aparelho (a app no ecrã principal do iOS tem o seu armazém): cola o código e fica com acesso', { skip: !chromium && 'sem Playwright' }, async () => {
    await env.KV.put('codigo:ligacao', createHash('sha256').update('NOVO-789').digest('hex'));
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    const page = await ctx.newPage();
    const erros = [];
    page.on('pageerror', (e) => erros.push(String(e)));
    await page.goto(`${APP}?proxy=${encodeURIComponent(WORKER)}`);
    await page.getByRole('heading', { name: 'Liga este aparelho' }).waitFor();
    await page.locator('[data-onda="cod"]').fill('NOVO-789');
    await page.getByRole('button', { name: 'Usar este código' }).click();
    await page.locator('.mu-pl').first().waitFor();
    await page.locator('#mu-aviso').getByText('Este aparelho fica com acesso').waitFor();
    assert.ok(await page.evaluate(() => localStorage.getItem('musica:chave')), 'guarda a chave deste aparelho');
    assert.equal(await env.KV.get('codigo:ligacao'), null, 'o código gasta-se');
    assert.deepEqual(erros, []);
    await ctx.close();
});

test('convidar: o dono cria o convite nos Ajustes; a convidada liga o seu Tidal e tem a sua app', { skip: !chromium && 'sem Playwright' }, async () => {
    const erros = [];
    // o dono, noutro aparelho (com o código de ligação)
    await env.KV.put('codigo:ligacao', createHash('sha256').update('DONO-321').digest('hex'));
    const a = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    const pa = await a.newPage();
    pa.on('pageerror', (e) => erros.push(String(e)));
    await pa.goto(`${APP}?proxy=${encodeURIComponent(WORKER)}`);
    await pa.locator('[data-onda="cod"]').fill('DONO-321');
    await pa.getByRole('button', { name: 'Usar este código' }).click();
    await pa.locator('.mu-pl').first().waitFor();
    await pa.locator('#mu-nav [data-onda="ir\t5"]').click();
    await pa.getByRole('button', { name: 'Convidar alguém' }).click();
    await pa.getByRole('link', { name: 'Enviar por WhatsApp' }).waitFor();
    const link = await pa.locator('input[readonly]').inputValue();
    assert.match(link, /\?ligar=/);
    const wa = await pa.getByRole('link', { name: 'Enviar por WhatsApp' }).getAttribute('href');
    assert.ok(decodeURIComponent(wa.split('text=')[1]).endsWith(link), 'a mensagem leva o link');
    await a.close();
    // a convidada abre o link e liga o seu Tidal
    const b = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    const pb = await b.newPage();
    pb.on('pageerror', (e) => erros.push(String(e)));
    await pb.route('https://login.tidal.com/**', (route) => {
        const u = new URL(route.request().url());
        route.fulfill({ status: 302, headers: { location: `${WORKER}/tidal/retorno?code=CODIGO-BOM&state=${u.searchParams.get('state')}` } });
    });
    await pb.goto(`${link.replace(APP, APP)}&proxy=${encodeURIComponent(WORKER)}`);
    await pb.getByRole('button', { name: 'Ligar ao Tidal' }).click();
    await pb.getByText('Ainda não há playlists').waitFor();
    assert.equal(JSON.parse(await env.KV.get('utilizadores')).length, 1, 'uma pessoa nova');
    await pb.locator('#mu-nav [data-onda="ir\t5"]').click();
    await pb.getByText('Este aparelho').waitFor();
    assert.equal(await pb.getByText('Partilhar a Música').count(), 0, 'só o dono convida');
    // a app do ecrã principal do iOS tem outro armazém: a convidada cria um código aqui e usa-o lá
    await pb.getByRole('button', { name: 'Ligar outro aparelho' }).click();
    const codigo = (await pb.locator('.mu-codigo').textContent()).trim();
    assert.match(codigo, /^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    const waCod = await pb.getByRole('link', { name: 'Enviar por WhatsApp' }).getAttribute('href');
    assert.ok(decodeURIComponent(waCod.split('?text=')[1]).includes(codigo), 'a mensagem pronta leva o código');
    const c = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    const pc = await c.newPage();
    pc.on('pageerror', (e) => erros.push(String(e)));
    await pc.goto(`${APP}?proxy=${encodeURIComponent(WORKER)}`);
    await pc.locator('[data-onda="cod"]').fill(codigo);
    await pc.getByRole('button', { name: 'Usar este código' }).click();
    await pc.locator('#mu-aviso').getByText('Este aparelho fica com acesso').waitFor();
    await pc.getByText('Ainda não há playlists').waitFor();
    assert.ok(await pc.evaluate(() => localStorage.getItem('musica:chave')), 'a app do ecrã principal fica com a chave dela');
    await c.close();
    assert.deepEqual(erros, []);
    await b.close();
});
