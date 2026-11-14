// A app — uma app em Onda (app/musica.onda + onda/lib + motor.onda, corrida por onda/rt/anfitriao.js) — no
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
const naFolha = (page) => page.$$eval('.mu-folha .mu-xf li[data-esq]', (ls) => ls.map((l) => l.dataset.esq.split('\t')[1]));
const heap = (page) => page.evaluate(() => Number(new BigInt64Array(window.app.exports.memory.buffer, 15 * 8, 1)[0]));
// as imagens não piscam: marca os nós <img> que estão no ecrã e, depois de uma ação, conta os que são os mesmos nós
const marcarImgs = (page, sel = '.mu-folha img') => page.evaluate((sel) => { const l = document.querySelectorAll(sel); for (const i of l) i.__marca = 1; return l.length; }, sel);
const mesmasImgs = (page, sel = '.mu-folha img') => page.evaluate((sel) => { const l = [...document.querySelectorAll(sel)]; return [l.length, l.filter((i) => i.__marca).length]; }, sel);
// o mesmo para as linhas das faixas: a Onda só mexe na linha que mudou (as outras são os mesmos nós)
const marcarLinhas = (page) => page.$$eval('.mu-folha .mu-xf li[data-esq]', (ls) => { for (const l of ls) l.__no = 1; return ls.length; });
const mesmasLinhas = (page) => page.$$eval('.mu-folha .mu-xf li[data-esq]', (ls) => ls.map((l) => l.__no === 1));

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
    // a troca de separador acabou: está no separador v e a espreita já desapareceu
    const assente = (v) => page.waitForFunction((v) => document.querySelector('#mu-nav [aria-current="page"]').dataset.onda === v && document.getElementById('mu-espreita').hidden, `ir\t${v}`);
    // arrastar com o dedo (toques sintéticos) de x=de até x=ate, no primeiro elemento de sel
    // (trocar: a meio do gesto, o elemento sai da página, como quando a Onda redesenha o ecrã)
    const deslizarEm = (sel, de, ate, trocar = false) => page.evaluate(async ([sel, de, ate, trocar]) => {
        const el = document.querySelector(sel);
        const r = el.getBoundingClientRect(), y = r.top + Math.min(30, r.height / 2);
        const toque = (x) => new Touch({ identifier: 3, target: el, clientX: x, clientY: y });
        el.dispatchEvent(new TouchEvent('touchstart', { touches: [toque(de)], bubbles: true, cancelable: true }));
        let n = 0;
        for (const x of [de + Math.sign(ate - de) * 20, (de + ate) / 2, ate]) {
            el.dispatchEvent(new TouchEvent('touchmove', { touches: [toque(x)], bubbles: true, cancelable: true }));
            if (trocar && ++n === 1) el.replaceWith(el.cloneNode(true));
        }
        await new Promise((ok) => setTimeout(ok, 150));
        el.dispatchEvent(new TouchEvent('touchend', { touches: [], bubbles: true, cancelable: true }));
    }, [sel, de, ate, trocar]);
    const separador = () => page.locator('#mu-nav [aria-current="page"]').getAttribute('data-onda');

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
    // antes de ligar, a app diz que o Maestro é uma IA de terceiros e o que ela lê; quem liga, autoriza (fica registado)
    await page.getByText('O Maestro é uma inteligência artificial (o Claude, da Anthropic). Para escolher música para ti, lê as tuas favoritas, os artistas que segues, as tuas playlists e o teu nome de utilizador do Tidal.').waitFor();
    await page.getByRole('button', { name: 'Concordo e ligar ao Tidal', exact: true }).click();
    await page.getByText('Ainda não há playlists').waitFor();
    await page.locator('#mu-aviso').getByText('Tidal ligado').waitFor();
    assert.match(JSON.parse(await env.KV.get('tidal:tokens')).iaConsentidaEm, /^\d{4}-\d\d-\d\dT/, 'a autorização fica registada, com a data');
    assert.ok(await page.evaluate(() => localStorage.getItem('musica:chave')), 'guarda a chave');
    assert.equal(await page.evaluate(() => localStorage.getItem('musica:codigo')), null, 'esquece o código');
    assert.match(await page.locator('.mu-pill').textContent(), /nelson/);

    // 2) o Maestro publica; a lista e a playlist
    const doc = await publicarComoCurador();
    assert.equal(doc.candidatas.length, 6);
    await nav(1);
    await page.locator('.mu-pl').getByText('Som para o carro').waitFor();
    // ao abrir, vê-se a página: nada a tapa (a espreita dos separadores só aparece durante a troca)
    assert.equal(await page.evaluate(() => document.getElementById('mu-espreita').hidden), true);
    assert.ok(await page.evaluate(() => { const b = document.querySelector('.mu-pl').getBoundingClientRect(); const el = document.elementsFromPoint(b.left + b.width / 2, b.top + b.height / 2)[0]; return !!el.closest('#mu-body'); }), 'a lista vê-se (nada por cima)');
    // o cartão abre-se ali mesmo: as faixas, ouvir 30 s (as que têm pré-escuta), «não esta» e afinar; «Abrir» leva à playlist
    assert.ok(await page.locator('.mu-pl .chev').first().isVisible(), 'a seta mostra que o cartão abre');
    await page.locator('.mu-pl-a').click();
    // o cartão abre logo com o tamanho certo; as faixas e as pré-escutas chegam depois só para dentro dele (não treme)
    await page.locator('.mu-folha').waitFor();
    assert.ok(await page.evaluate(() => document.activeElement.classList.contains('mu-fechar')), 'ao abrir, o foco vai para o «fechar»');
    await page.locator('.mu-pl.aberta .mu-xf li:not(.sk)').first().waitFor();
    assert.equal(await page.locator('.mu-pl.aberta .mu-xf li').count(), doc.faixas.length);
    await page.locator('.mu-pl.aberta [data-onda^="ouvir"]').first().waitFor();
    assert.equal(await page.locator('.mu-folha [data-onda="af-tx"]').count(), 0, 'a caixa do Maestro já não está no fundo da folha: é dentro do «Afinar»');
    assert.equal(await page.getAttribute('.mu-pl.aberta .mu-pl-a', 'aria-expanded'), 'true');
    const previa = (await page.locator('.mu-pl.aberta [data-onda^="ouvir"]').first().getAttribute('data-onda')).split('\t')[1];
    assert.match(previa, /^https:\/\/(audio|cdn\.deezer)\.example\//);
    await page.evaluate(() => { window.musicaLeitor.play = () => Promise.resolve(); }); // (sem ir à rede no teste)
    // as imagens não piscam: a Onda muda só o que mudou (porta 119), as capas ficam as mesmas (não voltam a carregar)
    const nImg = await marcarImgs(page);
    assert.ok(nImg > 4, `há capas na folha (${nImg})`);
    await page.locator('.mu-pl.aberta [data-onda^="ouvir"]').first().click();
    assert.equal(await page.evaluate(() => window.musicaLeitor.src), previa, 'toca a pré-escuta (o leitor do anfitrião da Onda)');
    // a Onda sabe o que está a tocar: o ▶ dessa faixa fica marcado
    await page.locator('.mu-pl.aberta .mu-ouvir.a-tocar[aria-pressed="true"]').waitFor();
    assert.equal(await page.locator('.mu-pl.aberta .mu-ouvir.a-tocar').count(), 1);
    assert.deepEqual(await mesmasImgs(page), [nImg, nImg], 'tocar no ▶ não mexe nas imagens');
    // quando o som acaba, a Onda sabe-o (porta 112) e o ▶ desmarca-se
    await page.evaluate(() => window.musicaLeitor.dispatchEvent(new Event('ended')));
    await page.locator('.mu-pl.aberta .mu-ouvir.a-tocar').waitFor({ state: 'detached' });
    assert.deepEqual(await mesmasImgs(page), [nImg, nImg], 'nem quando o som acaba');
    // as capas dos álbuns nas faixas: do Tidal, e do Deezer quando o Tidal não tem (as outras ficam com o quadrado cinzento)
    const srcs = await page.locator('.mu-pl.aberta .mu-xf .cp img').evaluateAll((l) => l.map((i) => i.getAttribute('src')));
    assert.ok(srcs.some((u) => /^https:\/\/resources\.tidal\.com\/images\/[0-9a-f/]+\/160x160\.jpg$/.test(u)), 'capas do Tidal');
    assert.ok(srcs.every((u) => /^https:\/\/(resources\.tidal\.com|cdn-images\.dzcdn\.net)\//.test(u)));
    assert.equal(await page.locator('.mu-pl.aberta .mu-xf .cp').count(), doc.faixas.length);
    // a folha ocupa o ecrã (por cima da barra de baixo), com a capa grande: as 4 primeiras capas diferentes, em 160 px
    const ecra = await page.evaluate(() => { const r = document.querySelector('.mu-folha').getBoundingClientRect(); return [r.top, r.left, r.width - innerWidth, r.height - innerHeight]; });
    assert.deepEqual(ecra.map(Math.round), [0, 0, 0, 0], 'a folha ocupa o ecrã');
    assert.ok(await page.evaluate(() => !!document.elementFromPoint(innerWidth / 2, innerHeight - 10).closest('.mu-folha')), 'por cima da barra de baixo');
    assert.equal(await page.locator('.mu-folha-capa.m4 img').count(), 4);
    assert.match(await page.locator('.mu-folha-capa img').first().getAttribute('src'), /160x160\.jpg$/);
    // fechar: desce e volta à lista onde estava; abrir outra vez é imediato (as faixas e as pré-escutas vêm da memória)
    await page.locator('.mu-fechar').click();
    await page.locator('.mu-pl.aberta').waitFor({ state: 'detached' });
    const pedidos = [];
    page.on('request', (r) => { if (r.url().includes('/api/playlists/')) pedidos.push(r.url()); });
    await page.locator('.mu-pl-a').click();
    await page.locator('.mu-pl.aberta .mu-xf [data-onda^="ouvir"]').first().waitFor();
    assert.deepEqual(pedidos, [], 'abrir outra vez não vai à rede');
    // o Esc fecha, e o foco volta ao cartão
    await page.keyboard.press('Escape');
    await page.locator('.mu-pl.aberta').waitFor({ state: 'detached' });
    assert.ok(await page.evaluate(() => document.activeElement.classList.contains('mu-pl-a')), 'ao fechar, o foco volta ao cartão');
    // arrastar para baixo: pouco volta ao sítio; mais de um quarto do ecrã fecha
    await page.locator('.mu-pl-a').click();
    await page.locator('.mu-folha').waitFor();
    await page.waitForTimeout(400); // (o fim da animação de subir)
    // (devagar: o motor de gestos conta a rapidez — um puxão curto mas rápido também fecha)
    const arrastar = (ate, ms = 120) => page.evaluate(async ([ate, ms]) => {
        const f = document.querySelector('.mu-folha');
        const toque = (y) => new Touch({ identifier: 1, target: f, clientX: 200, clientY: y });
        f.dispatchEvent(new TouchEvent('touchstart', { touches: [toque(150)], bubbles: true, cancelable: true }));
        for (const y of [170, (150 + ate) / 2, ate]) f.dispatchEvent(new TouchEvent('touchmove', { touches: [toque(y)], bubbles: true, cancelable: true }));
        const durante = f.style.transform;
        await new Promise((ok) => setTimeout(ok, ms));
        f.dispatchEvent(new TouchEvent('touchend', { touches: [], bubbles: true, cancelable: true }));
        return durante;
    }, [ate, ms]);
    assert.equal(await arrastar(230, 500), 'translateY(80px)', 'a folha segue o dedo');
    await page.waitForTimeout(300);
    assert.equal(await page.locator('.mu-pl.aberta').count(), 1, 'arrastar pouco não fecha');
    assert.equal(await page.evaluate(() => document.querySelector('.mu-folha').style.transform), '');
    await arrastar(600);
    await page.locator('.mu-pl.aberta').waitFor({ state: 'detached' });
    // puxar para baixo também fecha quando a faixa debaixo do dedo é redesenhada a meio do gesto
    await page.locator('.mu-pl-a').click();
    await page.locator('.mu-folha .mu-xf li[data-esq]').first().waitFor();
    await page.waitForTimeout(400);
    await page.evaluate(async () => {
        const el = document.querySelector('.mu-folha .mu-xf li');
        const toque = (y) => new Touch({ identifier: 4, target: el, clientX: 200, clientY: y });
        el.dispatchEvent(new TouchEvent('touchstart', { touches: [toque(150)], bubbles: true, cancelable: true }));
        el.dispatchEvent(new TouchEvent('touchmove', { touches: [toque(170)], bubbles: true, cancelable: true }));
        el.replaceWith(el.cloneNode(true));
        for (const y of [380, 600]) el.dispatchEvent(new TouchEvent('touchmove', { touches: [toque(y)], bubbles: true, cancelable: true }));
        await new Promise((ok) => setTimeout(ok, 120));
        el.dispatchEvent(new TouchEvent('touchend', { touches: [], bubbles: true, cancelable: true }));
    });
    await page.locator('.mu-pl.aberta').waitFor({ state: 'detached' });
    await page.locator('.mu-pl-a').click();
    // arrastar uma faixa para a esquerda tira-a (logo: a playlist fica com menos uma); «Repor» devolve-a ao sítio
    await page.locator('.mu-folha .mu-xf li[data-esq]').first().waitFor();
    await page.waitForTimeout(400);
    assert.equal(await page.locator('.mu-folha .mu-xf li[data-esq]').first().getAttribute('data-esq-rotulo'), 'Tirar');
    await deslizarEm('.mu-folha .mu-xf li[data-esq]', 330, 60);
    await page.locator('.mu-folha .mu-xf-nota').getByText(`Tiraste «${doc.faixas[0].titulo}».`).waitFor();
    assert.deepEqual(await naFolha(page), doc.faixas.slice(1).map((f) => f.id));
    assert.match(await page.locator('.mu-folha .mu-fo-tx p').textContent(), /^3 faixas · /, 'o cabeçalho acompanha');
    assert.deepEqual(JSON.parse(await env.KV.get('playlist:' + doc.id)).rejeitadas, [doc.faixas[0].id]);
    await page.locator('.mu-folha .mu-xf-nota').getByRole('button', { name: 'Repor' }).click();
    await page.locator('.mu-folha .mu-xf-nota').waitFor({ state: 'detached' });
    assert.deepEqual(JSON.parse(await env.KV.get('playlist:' + doc.id)).rejeitadas, []);
    // a folha é a playlist toda (já não há outra vista para «abrir»): as faixas pela ordem guardada, simples — capa,
    // título, artista, ouvir e trocar —, e o porquê e a mistura em «Sobre esta playlist», fechado até se querer ver
    assert.equal(await page.getByRole('button', { name: 'Abrir' }).count(), 0);
    assert.deepEqual(await naFolha(page), doc.faixas.map((f) => f.id), 'a ordem guardada');
    assert.equal(await page.locator('.mu-folha .mu-xf .why, .mu-folha .mu-xf .m, .mu-folha .mu-xf .mot').count(), 0, 'sem pormenores por faixa');
    assert.match(await page.locator('.mu-folha .mu-fo-tx p').textContent(), /^4 faixas · .* · ✦ Maestro$/);
    assert.equal(await page.locator('.mu-folha .mu-resumo').isVisible(), false);
    await foto('1-folha');
    // (a folha cabe no ecrã: nada sai pelos lados)
    assert.equal(await page.locator('.mu-folha').evaluate((f) => f.scrollWidth <= f.clientWidth), true, 'a folha não transborda para os lados');
    await page.locator('.mu-folha .mu-sobre summary').click();
    assert.match(await page.locator('.mu-folha .mu-resumo').textContent(), /sistema de som/);
    assert.ok(await page.locator('.mu-folha .mu-sobre .mu-barra').count() >= 2, 'a mistura: géneros e décadas');
    // tocar no título de uma faixa abre a linha (e fecha a que estava aberta); o «Sobre» continua aberto
    await page.locator('.mu-folha .mu-xf button.tx').first().click();
    await page.locator('.mu-folha .mu-xf li').first().getByRole('button', { name: 'Mais como esta' }).waitFor();
    await page.locator('.mu-folha .mu-xf li').first().scrollIntoViewIfNeeded();
    await foto('1-faixa-aberta');
    // a linha aberta ocupa a largura toda da faixa, por baixo dela
    assert.deepEqual(await page.locator('.mu-folha .mu-xf li').first().evaluate((li) => { const m = li.querySelector('.mu-xf-mais').getBoundingClientRect(), t = li.querySelector('.tx').getBoundingClientRect(), l = li.getBoundingClientRect(); return [m.top >= t.bottom - 1, Math.round(m.right) === Math.round(l.right)]; }), [true, true]);
    await page.locator('.mu-folha .mu-xf button.tx').nth(1).click();
    assert.equal(await page.getByRole('button', { name: 'Mais como esta' }).count(), 1);
    assert.equal(await page.locator('.mu-folha .mu-xf button.tx[aria-expanded="true"]').count(), 1);
    assert.equal(await page.locator('.mu-folha .mu-sobre').getAttribute('open'), '', 'redesenhar as faixas não fecha o resto da folha');
    await page.locator('.mu-folha .mu-xf button.tx').nth(1).click();
    assert.equal(await page.getByRole('button', { name: 'Mais como esta' }).count(), 0);
    await page.locator('.mu-folha').evaluate((f) => { f.scrollTop = f.scrollHeight; });
    await foto('1-sobre');
    await page.locator('.mu-folha').evaluate((f) => { f.scrollTop = 0; });

    // 3) afinar na folha: o motor Onda dentro da app, e o juiz em cada mudança
    // antes: tira-se uma faixa (fica de fora do afinar) e acrescenta-se outra do Tidal (fica segura)
    await page.locator('.mu-folha .mu-xf button.tx').first().click();
    await page.locator('.mu-folha .mu-xf-mais').getByRole('button', { name: 'Tirar' }).click();
    await page.locator('.mu-folha .mu-xf-nota').getByText(`Tiraste «${doc.faixas[0].titulo}».`).waitFor();
    assert.equal(await page.locator('.mu-junta').count(), 0, 'a procura começa fechada');
    await page.getByRole('button', { name: 'Acrescentar uma faixa' }).click();
    await page.locator('[data-onda="q"]').fill('Amália Barco Negro');
    await page.getByRole('button', { name: 'Procurar no Tidal' }).click();
    await page.locator('[data-onda="juntar\t0"]').click();
    await page.locator('#mu-aviso').getByText('Faixa acrescentada.').waitFor();
    const barco = (await worker.fetch(new Request(WORKER + '/api/pesquisa?q=barco%20negro', { headers: { authorization: `Bearer ${await env.KV.get('agente:chave')}` } }), env, {}).then((r) => r.json())).faixas[0];
    const docA = JSON.parse(await env.KV.get('playlist:' + doc.id));
    assert.deepEqual(docA.faixas.map((f) => f.id), [...doc.faixas.slice(1).map((f) => f.id), barco.id], 'entra no fim');
    assert.deepEqual(await naFolha(page), docA.faixas.map((f) => f.id));
    assert.equal(await page.locator('.mu-junta').count(), 0, 'acrescentada, a procura fecha');
    assert.deepEqual([docA.candidatas.length, docA.candidatas.at(-1).faixa.id, docA.candidatas.at(-1).sinais.fixa], [7, barco.id, true]);
    const op = { faixas: 5, maxArtista: 1, estilo: 'equilibrado', arco: 'onda' };
    const tiradas = new Set([docA.candidatas.findIndex((c) => c.faixa.id === doc.faixas[0].id)]), fixas = new Set();
    const afinadas = () => page.$$eval('.mu-folha .mu-xf li.af', (ls) => ls.map((l) => l.dataset.id));
    const conta = page.locator('.mu-af-graf .mu-nota');
    const juiz = async (msg) => {
        const esp = await esperado(docA, op, { tiradas, fixas });
        await conta.filter({ hasText: new RegExp(`^${esp.length} faixa`) }).waitFor();
        assert.deepEqual(await afinadas(), esp, msg);
    };
    await page.evaluate(() => {
        window.__folhas = 0;
        new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1 && (n.matches('.mu-folha') || n.querySelector('.mu-folha'))) window.__folhas++; })
            .observe(document.getElementById('mu-body'), { childList: true, subtree: true });
    });
    await page.getByRole('button', { name: 'Afinar', exact: true }).click();
    // aberto: ainda se vê a playlist como está, com o gráfico da energia (a linha, a área e o arco pedido a tracejado)
    await page.locator('.mu-afina .mu-graf path.linha').waitFor();
    // o afinar abre em cima, antes das faixas; a primeira coisa é a caixa para dizer ao Maestro o que mudar, e só
    // depois as regras
    const ordemAf = await page.evaluate(() => { const y = (q) => document.querySelector(q).getBoundingClientRect().top;
        return [y('.mu-folha .mu-afina'), y('.mu-folha [data-onda="af-tx"]'), y('.mu-folha .mu-graf'), y('.mu-folha .mu-xf li')]; });
    assert.deepEqual(ordemAf, [...ordemAf].sort((a, b) => a - b), `a caixa do Maestro, depois o gráfico, depois as faixas: ${ordemAf.map(Math.round)}`);
    await page.locator('.mu-afina').getByText('Diz ao Maestro o que mudar').waitFor();
    assert.equal(await page.locator('.mu-afina').getByRole('button', { name: 'Pedir ao Maestro' }).count(), 1);
    const caixa = await page.locator('.mu-afina [data-onda="af-tx"]').elementHandle();
    await caixa.focus();
    await page.keyboard.type('mais vozes');
    assert.deepEqual(await afinadas(), docA.faixas.map((f) => f.id));
    assert.equal(await page.locator('[data-onda="af-guardar"]').isDisabled(), true, 'sem mudanças não há nada para guardar');
    assert.match(await page.locator('.mu-afina .mu-graf path.linha').getAttribute('d'), /^M8 [\d.]+(C[\d. ]+){3}$/, 'uma curva por 4 faixas');
    assert.match(await page.locator('.mu-afina .mu-graf path.area').getAttribute('d'), /Z$/);
    assert.equal(await page.locator('.mu-afina .mu-graf path.alvo').count(), 1);
    assert.match(await conta.textContent(), /^4 faixas · \d+ min$/);
    assert.equal(await page.locator('.mu-folha .mu-trocar, .mu-folha [data-onda="enviar"]').count(), 0, 'a afinar, a folha é só o afinar');
    // cada mudança corre o motor: o juiz (o curador.wasm com as mesmas entradas) tem de dar a mesma ordem
    await page.locator('[data-onda="af-mx\t2"]').click(); op.maxArtista = 2;
    await juiz('máximo 2 por artista');
    assert.deepEqual(await caixa.evaluate((el) => [el.isConnected, el.value]), [true, 'mais vozes'], 'mudar uma regra redesenha o afinar, mas a caixa do Maestro é a mesma e o que lá se escreveu fica');
    assert.match(await conta.textContent(), /^5 faixas · .+ · \d+ entram?, \d+ sa(i|em)$/);
    assert.equal(await page.locator('[data-onda="af-guardar"]').isDisabled(), false);
    assert.ok(await page.locator('.mu-folha .mu-xf li.af.nova').count() >= 1, 'as que entram vêm marcadas');
    assert.ok((await afinadas()).includes(barco.id), 'a que acrescentaste fica (está segura)');
    await page.locator('[data-onda="af-es\t4"]').click(); op.estilo = 'audiofilo';
    await page.locator('[data-onda="af-ar\t2"]').click(); op.arco = 'desce';
    await juiz('audiófilo, a acalmar');
    // sem arco, o tracejado sai do gráfico
    await page.locator('[data-onda="af-ar\t3"]').click();
    await page.locator('.mu-afina .mu-graf path.alvo').waitFor({ state: 'detached' });
    await page.locator('[data-onda="af-ar\t2"]').click();
    await page.locator('.mu-afina .mu-graf path.alvo').waitFor();
    // o alfinete segura uma faixa
    const ultima = await page.locator('.mu-folha .mu-xf [data-onda^="fixar"]').last().getAttribute('data-onda');
    await page.locator(`.mu-folha .mu-xf [data-onda="${ultima}"]`).click(); fixas.add(Number(ultima.split('\t')[1]));
    await page.locator('.mu-folha .mu-xf li.af.fixa').first().waitFor();
    await juiz('com uma fixada');
    // o deslizador (eventos "input"): o motor corre a cada passo, o deslizador não é redesenhado e o monte não cresce
    await page.locator('[data-onda="af-n"]').evaluate((e) => { e.__marca = 1; });
    const h0 = await heap(page);
    for (let i = 0; i < 60; i++) await page.evaluate((v) => { const e = document.querySelector('[data-onda="af-n"]'); e.value = String(v); e.dispatchEvent(new Event('input', { bubbles: true })); }, 6 - (i % 2));
    await page.evaluate(() => { const e = document.querySelector('[data-onda="af-n"]'); e.value = '5'; e.dispatchEvent(new Event('input', { bubbles: true })); });
    op.faixas = 5;
    await juiz('5 faixas pelo deslizador');
    assert.equal(await page.locator('#af-nv').textContent(), '5');
    assert.equal(await page.locator('[data-onda="af-n"]').evaluate((e) => e.__marca), 1, 'o deslizador é o mesmo (não se perde o dedo)');
    assert.ok((await heap(page)) - h0 < 200, `o monte cresceu ${(await heap(page)) - h0} palavras em 61 eventos`);
    await foto('2-afinar');

    // 4) guardar: a app manda a decisão e o Worker monta a versão; depois envia-se para o Tidal
    const ordemFinal = await afinadas();
    await page.locator('[data-onda="af-guardar"]').click();
    await page.locator('#mu-aviso').getByText('Guardada.').waitFor();
    await page.locator('.mu-afina').waitFor({ state: 'detached' });
    assert.deepEqual(await naFolha(page), ordemFinal, 'a folha fica com a playlist nova');
    assert.equal(sim.criadas.length, 0, 'ainda só na app');
    await page.getByRole('button', { name: 'Pôr no Tidal' }).click();
    await page.locator('#mu-aviso').getByText('Criada no Tidal').waitFor();
    await page.locator('.mu-folha').getByRole('link', { name: 'Ouvir no Tidal', exact: true }).waitFor();
    assert.equal(sim.criadas.length, 1);
    assert.equal(sim.criadas[0].name, 'Som para o carro', 'a mesma playlist, sem «· afinada»');
    assert.deepEqual(sim.itens, ordemFinal, 'o Tidal recebe a ordem do motor Onda');
    await page.locator('.mu-folha .mu-xf [data-onda^="ouvir"]').first().waitFor();
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => window.__folhas), 0, 'nada disto fez a folha subir outra vez');
    const idx = JSON.parse(await env.KV.get('playlists'));
    const nova = JSON.parse(await env.KV.get('playlist:' + idx[0].id));
    assert.equal(idx.length, 1, 'sem cópias na biblioteca');
    assert.ok(nova.afinadaEm);
    assert.deepEqual(nova.opcoes, { faixas: 5, maxArtista: 2, estilo: 'audiofilo', arco: 'desce' });
    assert.equal(nova.faixas.find((f) => f.id === barco.id).motivo, 'Escolhida por ti.');
    assert.equal(nova.candidatas.length, 7, 'as candidatas da original e a acrescentada');
    // fechar o afinar sem guardar deixa tudo como estava
    await page.getByRole('button', { name: 'Afinar', exact: true }).click();
    await page.locator('[data-onda="af-es\t1"]').click();
    await page.locator('.mu-af-guarda').getByRole('button', { name: 'Cancelar' }).click();
    await page.locator('.mu-afina').waitFor({ state: 'detached' });
    assert.deepEqual(await naFolha(page), ordemFinal);

    // 5) a biblioteca, o gosto e os ajustes — com uma vista descida, a vista nova abre no topo
    await page.locator('.mu-folha .mu-fechar').click();
    await page.locator('.mu-folha').waitFor({ state: 'detached' });
    await nav(5);
    await page.getByRole('heading', { name: 'Este aparelho' }).waitFor();
    assert.ok(await page.evaluate(() => document.documentElement.scrollHeight - innerHeight >= 300), 'os Ajustes dão para descer');
    await assente(5);
    await page.evaluate(() => window.scrollTo(0, 300));
    assert.ok((await page.evaluate(() => window.scrollY)) > 0);
    await nav(3);
    await assente(3);
    assert.equal(await page.evaluate(() => window.scrollY), 0, 'a vista nova abre no topo');
    await nav(1);
    await page.locator('#mu-body .mu-pl').first().waitFor();
    assert.deepEqual(await page.locator('#mu-body .mu-pl .nm').allTextContents(), ['Som para o carro']);
    // depois de aberta uma vez, a playlist tem capa: o mosaico de 4 capas pequenas
    assert.equal(await page.locator('#mu-body .mu-pl .mu-pl-capa.m4 img').count(), 4);
    assert.match(await page.locator('#mu-body .mu-pl .mu-pl-capa img').first().getAttribute('src'), /\/80x80\.jpg$|\/56x56-/);
    // como correu (o conector avalia-a: ainda é cedo) e atualizar sozinha (liga-se aqui; o Maestro renova-a)
    const agente = await env.KV.get('agente:chave');
    assert.equal((await worker.fetch(new Request(WORKER + '/api/avaliacoes', { headers: { authorization: `Bearer ${agente}` } }), env, { waitUntil() {} })).status, 200);
    // (a folha guarda a playlist 10 minutos em memória; tocar outra vez no separador vai buscar tudo de novo)
    await nav(1);
    await page.locator('#mu-body .mu-pl .mu-pl-a').first().waitFor();
    await page.locator('#mu-body .mu-pl').first().locator('.mu-pl-a').click();
    await page.locator('.mu-folha .mu-xf li[data-esq]').first().waitFor();
    await page.locator('.mu-folha .mu-sobre summary').click();
    await page.getByRole('heading', { name: 'Como correu' }).waitFor();
    await page.getByText('Ainda é cedo.').waitFor();
    // o «⋯» da folha: atualizar sozinha, mudar o nome e apagar — a folha fica onde estava (não volta a subir)
    await page.locator('.mu-folha').evaluate((f) => { f.scrollTop = 120; f.__marca = 1; });
    assert.equal(await page.getByRole('button', { name: 'Mudar o nome' }).count(), 0, 'o menu começa fechado');
    await page.getByRole('button', { name: 'Mais opções' }).click();
    await page.getByRole('button', { name: 'Desligado' }).waitFor();
    await page.locator('.mu-folha').evaluate((f) => { f.scrollTop = 0; });
    await foto('3-menu');
    await page.locator('.mu-folha').evaluate((f) => { f.scrollTop = 120; });
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
    await page.locator('.mu-folha').getByRole('heading', { name: 'Som do BMW' }).waitFor();
    assert.equal(await page.locator('.mu-renomear').count(), 0, 'depois de guardar, o campo do nome fecha');
    const renomeada = JSON.parse(await env.KV.get('playlist:' + JSON.parse(await env.KV.get('playlists'))[0].id));
    assert.deepEqual([renomeada.nome, renomeada.descricao], ['Som do BMW', 'Para testar o carro.']);
    if (renomeada.tidal) assert.equal(sim.renomeadas.at(-1).name, 'Som do BMW');
    assert.deepEqual(await page.locator('.mu-folha').evaluate((f) => [f.__marca, f.scrollTop > 0]), [1, true], 'a folha é a mesma e ficou onde estava');
    // apagar pergunta primeiro; «Não» volta atrás
    await page.getByRole('button', { name: 'Mais opções' }).click();
    await page.locator('.mu-menu').getByRole('button', { name: 'Apagar' }).click();
    await page.getByRole('heading', { name: 'Apagar esta playlist?' }).waitFor();
    await page.getByText('Também está no teu Tidal.').waitFor();
    await page.locator('.mu-confirma').getByRole('button', { name: 'Não', exact: true }).click();
    await page.locator('.mu-confirma').waitFor({ state: 'detached' });
    // ao fechar a folha, a lista já tem o nome novo e o ↻ de «atualizar sozinha»
    await page.locator('.mu-folha .mu-fechar').click();
    await page.locator('.mu-folha').waitFor({ state: 'detached' });
    await page.locator('#mu-body .mu-pl').first().getByText('↻').waitFor();
    assert.deepEqual(await page.locator('#mu-body .mu-pl .nm').allTextContents(), ['Som do BMW']);
    // mais como esta: toca-se no título de uma faixa e cria-se logo no Tidal uma playlist de parecidas, que abre a seguir
    await page.locator('#mu-body .mu-pl').first().locator('.mu-pl-a').click();
    await page.locator('.mu-folha .mu-xf button.tx').first().click();
    await page.getByRole('button', { name: 'Mais como esta' }).click();
    await page.locator('#mu-aviso').getByText('Criada no Tidal com as parecidas. O Maestro vai revê-la.').waitFor();
    await page.locator('.mu-folha').getByRole('heading', { name: /^Parecidas com / }).waitFor();
    assert.equal(sim.criadas.length, 2);
    assert.match(sim.criadas[1].name, /^Parecidas com /);
    // quem escolheu foi o Tidal: a folha di-lo, e fica à espera da revisão do Maestro (que se pode cancelar)
    assert.match(await page.locator('.mu-folha .mu-fo-tx p').textContent(), / · parecidas do Tidal/);
    await page.locator('.mu-folha .mu-hist li.espera').getByText('Rever as parecidas do Tidal').waitFor();
    assert.match(await page.locator('.mu-folha .mu-hist li.espera').textContent(), /Revisão · à espera do Maestro · Cancelar$/);
    await foto('6-parecidas');
    // «Afinar» numa playlist de parecidas (todas as candidatas já lá estão): abre o afinador, como nas outras
    await page.locator('.mu-folha').getByRole('button', { name: 'Afinar', exact: true }).click();
    await page.locator('.mu-folha .mu-afina').waitFor({ timeout: 5000 });
    await page.locator('.mu-afina').getByRole('button', { name: 'Fechar' }).click();
    await page.locator('.mu-folha .mu-afina').waitFor({ state: 'detached' });
    await page.locator('.mu-folha .mu-fechar').click();
    await page.locator('.mu-folha').waitFor({ state: 'detached' });
    await page.locator('#mu-body .mu-pl').nth(1).waitFor();
    const parecidas = page.locator('#mu-body .mu-pl', { hasText: 'Parecidas com' });
    await parecidas.locator('.mu-pedida').getByText('o Maestro vai revê-la').waitFor();
    await foto('6-lista');
    assert.equal(await page.locator('#mu-body .mu-espera').count(), 0, 'a revisão não é um pedido novo: não vai para o cimo da lista');
    // o Maestro revê-a (na mesma playlist, no mesmo link): passa a ser dele — o cartão e a folha dizem-no
    {
        const ag = await env.KV.get('agente:chave');
        const rev = JSON.parse(await env.KV.get('pedidos')).find((x) => x.afinar?.rever);
        const r = await worker.fetch(new Request(`${WORKER}/api/pedidos/${rev.id}?playlist=${rev.afinar.playlist}`, { method: 'DELETE', headers: { authorization: `Bearer ${ag}` } }), env, { waitUntil() {} });
        assert.equal(r.status, 200);
    }
    await nav(1);
    await parecidas.locator('.mu-afinada').getByText(/^✓ revista a /).waitFor();
    assert.equal(await parecidas.locator('.mu-pedida').count(), 0);
    await parecidas.locator('.mu-pl-a').click();
    await page.locator('.mu-folha .mu-hist li').getByText('Rever as parecidas do Tidal').waitFor();
    assert.match(await page.locator('.mu-folha .mu-hist li').last().textContent(), /Revisão · feita a /);
    assert.match(await page.locator('.mu-folha .mu-fo-tx p').textContent(), / · ✦ Maestro/);
    await page.locator('.mu-folha .mu-fechar').click();
    await page.locator('.mu-folha').waitFor({ state: 'detached' });
    // as tendências: 9 dias de tabelas (a Nina Simone, que segues, a subir em Portugal)
    const { recolher } = await import('../proxy/src/tendencias.js');
    for (let d = 0; d < 9; d++) {
        const lista = Array.from({ length: 30 }, (_, i) => [`Artista ${i}`, `Canção ${i}`, 'Pop']);
        lista.splice(d < 2 ? 25 : 25 - (d - 1) * 3, 0, ['Nina Simone', 'Feeling Good', 'Jazz']);
        sim.tabelas.pt = lista;
        await recolher(env, Date.parse('2026-11-01T04:23:00Z') + d * 864e5);
    }
    // o teu gosto: já não é um separador (são três: Música, Pedir e Ajustes) — é um cartão dos Ajustes, fechado até se
    // querer ver; só ao abrir se pedem o perfil e as tendências ao conector
    assert.deepEqual(await page.locator('#mu-nav button span').allTextContents(), ['Música', 'Pedir', 'Ajustes']);
    assert.deepEqual(await page.evaluate(() => { const n = document.getElementById('mu-nav').getBoundingClientRect(); return [...document.querySelectorAll('#mu-nav button')].map((b) => Math.round(b.getBoundingClientRect().width * 3 / n.width)); }), [1, 1, 1], 'cada separador ocupa um terço da barra');
    const pedidosGosto = [];
    const ouvirGosto = (r) => { if (/\/api\/(perfil|tendencias)$/.test(new URL(r.url()).pathname)) pedidosGosto.push(new URL(r.url()).pathname); };
    page.on('request', ouvirGosto);
    await nav(5);
    const gosto = page.getByRole('button', { name: /^O teu gosto/ });
    await gosto.waitFor();
    assert.equal(await gosto.getAttribute('aria-expanded'), 'false');
    assert.equal(await page.getByRole('heading', { name: 'Artistas que mais aparecem' }).count(), 0);
    await page.waitForLoadState('networkidle');
    assert.deepEqual(pedidosGosto, [], 'fechado, não pede nada');
    await gosto.click();
    await page.getByRole('heading', { name: 'Artistas que mais aparecem' }).waitFor();
    assert.equal(await gosto.getAttribute('aria-expanded'), 'true');
    assert.deepEqual(pedidosGosto.sort(), ['/api/perfil', '/api/tendencias']);
    page.off('request', ouvirGosto);
    assert.match(await gosto.textContent(), /^O teu gosto\d+ favoritas · atualizado /);
    assert.ok(await page.getByText('So What').count());
    await page.getByRole('heading', { name: 'O que se está a ouvir' }).waitFor();
    const paraTi = page.locator('.mu-card', { has: page.getByRole('heading', { name: 'Para ti' }) });
    assert.match(await paraTi.locator('.mu-faixa').first().innerText(), /Feeling Good[\s\S]*Nina Simone[\s\S]*Portugal \(Apple Music\) · n\.º 5 · a subir \(era 26\.º\) · segues/);
    assert.equal(await paraTi.locator('.mu-tocar').first().getAttribute('href'), 'https://tidal.com/search?q=Nina%20Simone+Feeling%20Good');
    assert.ok(await page.getByRole('heading', { name: 'Mundo (Deezer)' }).count());
    await foto('3-gosto');
    // os ajustes continuam por baixo; fechar o cartão esconde o gosto
    await page.getByRole('heading', { name: 'As tuas playlists no Tidal' }).waitFor();
    await gosto.click();
    await page.getByRole('heading', { name: 'Artistas que mais aparecem' }).waitFor({ state: 'detached' });
    assert.equal(await gosto.getAttribute('aria-expanded'), 'false');
    await page.locator('#mu-body').getByText('nelson (PT)').waitFor();
    // se o perfil não vier (o conector em baixo), diz porquê e o cartão fecha-se em vez de ficar «A carregar…»
    await nav(5); // (tocar outra vez no separador esquece o que estava em memória: o perfil volta a pedir-se)
    await gosto.waitFor();
    await page.route('**/api/perfil', (r) => r.fulfill({ status: 503, contentType: 'application/json', body: '{"erro":"indisponivel","mensagem":"O conector está em baixo."}' }));
    await gosto.click();
    await page.locator('#mu-aviso').getByText(/.+/).waitFor();
    await page.waitForFunction(() => document.querySelector('.mu-gosto-a').getAttribute('aria-expanded') === 'false');
    assert.equal(await page.locator('#mu-body .mu-a-carregar').count(), 0);
    await page.unroute('**/api/perfil');
    for (let i = erros.length - 1; i >= 0; i--) if (/status of 503/.test(erros[i])) erros.splice(i, 1); // (o 503 deste passo é o esperado)
    await page.getByRole('button', { name: 'Testar o motor' }).click();
    await page.locator('#aj-motor-r').filter({ hasText: 'faixas escolhidas de 60' }).waitFor();
    await foto('4-ajustes');
    // a tua conta (apagar tudo pede-se aqui; ao dono avisa que é quem montou a app) — «Não» não apaga nada
    await page.locator('#mu-body .mu-conta').getByRole('button', { name: 'Apagar a minha conta', exact: true }).click();
    await page.locator('#mu-body .mu-conta').getByText(/És quem montou a app: para voltares a entrar vais precisar de um código de ligação novo\.$/).waitFor();
    await foto('8-conta');
    await page.locator('#mu-body .mu-conta').getByRole('button', { name: 'Não', exact: true }).click();
    await page.locator('#mu-body .mu-conta').getByRole('button', { name: 'Apagar a minha conta', exact: true }).waitFor();
    assert.ok(await env.KV.get('tidal:tokens'), 'o Tidal continua ligado');
    // a autorização para a IA: quem ligou pelo botão «Concordo e ligar» já a deu; quem estava ligado de antes dá-a aqui
    await page.locator('#mu-body .mu-conta').getByText('Autorizaste o Maestro (uma IA) a ler o teu perfil de gosto.').waitFor();
    { const t = JSON.parse(await env.KV.get('tidal:tokens')); delete t.iaConsentidaEm; await env.KV.put('tidal:tokens', JSON.stringify(t)); }
    await nav(5);
    await page.locator('#mu-body .mu-conta').getByText(/^O Maestro é uma inteligência artificial \(o Claude, da Anthropic\)\./).waitFor();
    await page.locator('#mu-body .mu-conta').getByRole('button', { name: 'Concordo', exact: true }).click();
    await page.locator('#mu-aviso').getByText('Autorização guardada.').waitFor();
    await page.locator('#mu-body .mu-conta').getByText('Autorizaste o Maestro (uma IA) a ler o teu perfil de gosto.').waitFor();
    assert.ok(JSON.parse(await env.KV.get('tidal:tokens')).iaConsentidaEm);

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
    // pedido feito: vai-se para a lista das playlists, onde ele fica à espera, no cimo (o «Pedir» só pede)
    await page.locator('#mu-aviso').getByText(/^Pedido feito/).waitFor();
    await assente(1);
    const espera = page.locator('#mu-body .mu-espera');
    await espera.getByRole('heading', { name: /^À espera do Maestro 1$/ }).waitFor();
    await foto('5c-espera');
    const pedido = JSON.parse(await env.KV.get('pedidos'))[0];
    assert.equal(pedido.texto, 'Faixas bem gravadas para testar o som do carro');
    assert.equal(pedido.opcoes.limpa, true);
    assert.match(await espera.locator('.mu-pedido').first().textContent(), /^«Faixas bem gravadas para testar o som do carro»pedido a \d+\/\d+ · \d+ faixas · \S+.*Cancelar$/);
    await page.locator('#mu-body .mu-pl').first().waitFor();
    assert.ok(await page.evaluate(() => document.querySelector('#mu-body .mu-espera').compareDocumentPosition(document.querySelector('#mu-body .mu-pl')) & Node.DOCUMENT_POSITION_FOLLOWING), 'os pedidos à espera ficam antes das playlists');
    await nav(3);
    await assente(3);
    assert.equal(await page.locator('#mu-body .mu-pedido').count(), 0, 'o «Pedir» já não tem lista de pedidos');
    assert.equal(await page.locator('[data-onda="ptx"]').inputValue(), '', 'feito o pedido, o campo fica limpo');
    // mudar de separador a arrastar: para a direita, o anterior (Playlists); para a esquerda, o seguinte (Pedir)
    assert.equal(await separador(), 'ir\t3');
    await deslizarEm('#mu-body h1', 60, 330);
    await page.waitForFunction(() => document.querySelector('#mu-nav [aria-current="page"]').dataset.onda === 'ir\t1');
    await page.locator('.mu-pl').first().waitFor();
    await page.waitForLoadState('networkidle');
    await deslizarEm('#mu-body h1', 330, 60, true); // (com o ecrã redesenhado a meio do gesto)
    await page.waitForFunction(() => document.querySelector('#mu-nav [aria-current="page"]').dataset.onda === 'ir\t3');
    // a meio do arrasto: a página segue o dedo (85 %), o separador seguinte espreita colado a ela e a marca da barra
    // vai a caminho dele; ao desistir, tudo volta ao sítio
    const meio = await page.evaluate(async () => {
        const el = document.querySelector('#mu-body h1');
        const toque = (x) => new Touch({ identifier: 6, target: el, clientX: x, clientY: 200 });
        el.dispatchEvent(new TouchEvent('touchstart', { touches: [toque(330)], bubbles: true, cancelable: true }));
        for (const x of [310, 290, 270]) el.dispatchEvent(new TouchEvent('touchmove', { touches: [toque(x)], bubbles: true, cancelable: true }));
        const esp = document.getElementById('mu-espreita'), nav = document.getElementById('mu-nav');
        const r = { tf: document.getElementById('mu-body').style.transform, visivel: !esp.hidden, nome: esp.querySelector('h1')?.textContent, ids: esp.querySelectorAll('[id], [data-onda]').length, i: Number(nav.style.getPropertyValue('--i')) };
        await new Promise((ok) => setTimeout(ok, 600));
        el.dispatchEvent(new TouchEvent('touchend', { touches: [], bubbles: true, cancelable: true }));
        return r;
    });
    assert.match(meio.tf, /^translateX\(-51px\)/, 'segue o dedo a 85 % (60 px → 51 px)');
    // o que espreita é a página dos Ajustes como vai aparecer (o título verdadeiro), só para ver: sem ids nem ações
    assert.deepEqual([meio.visivel, meio.nome, meio.ids], [true, 'Ajustes', 0]);
    assert.ok(meio.i > 1 && meio.i < 2, `a marca a caminho dos Ajustes (${meio.i})`);
    await page.waitForFunction(() => document.getElementById('mu-espreita').hidden && document.querySelector('#mu-nav').style.getPropertyValue('--i') === '1');
    assert.equal(await separador(), 'ir\t3', 'arrastar pouco e devagar não muda');
    // para a direita, as Playlists (já vistas): espreita a página verdadeira, com o título «Música» e os cartões
    const volta = await page.evaluate(async () => {
        const el = document.querySelector('#mu-body h1');
        const toque = (x) => new Touch({ identifier: 7, target: el, clientX: x, clientY: 200 });
        el.dispatchEvent(new TouchEvent('touchstart', { touches: [toque(60)], bubbles: true, cancelable: true }));
        for (const x of [80, 100, 120]) el.dispatchEvent(new TouchEvent('touchmove', { touches: [toque(x)], bubbles: true, cancelable: true }));
        const esp = document.getElementById('mu-espreita');
        const r = { nome: esp.querySelector('h1')?.textContent, cartoes: esp.querySelectorAll('.mu-pl').length, capas: esp.querySelectorAll('.mu-pl-capa img').length };
        await new Promise((ok) => setTimeout(ok, 600));
        el.dispatchEvent(new TouchEvent('touchend', { touches: [], bubbles: true, cancelable: true }));
        return r;
    });
    assert.equal(volta.nome, 'Música');
    assert.ok(volta.cartoes > 0 && volta.capas > 0, `a lista verdadeira, com as capas: ${JSON.stringify(volta)}`);
    await page.waitForFunction(() => document.getElementById('mu-espreita').hidden);
    // voltar a um separador visto há pouco não vai à rede (a Onda guarda as respostas 30 s; sem «A carregar…» a piscar)
    const rede = [];
    const ouvirRede = (r) => { if (/\/api\/(playlists|pedidos|estado)$/.test(new URL(r.url()).pathname)) rede.push(new URL(r.url()).pathname); };
    page.on('request', ouvirRede);
    const em = (v) => page.waitForFunction((v) => document.querySelector('#mu-nav [aria-current="page"]').dataset.onda === v, `ir\t${v}`);
    await nav(1);
    await em(1);
    await page.locator('#mu-body .mu-pl').first().waitFor();
    await nav(3);
    await em(3);
    await page.locator('#mu-body').getByRole('heading', { name: 'Pedir' }).waitFor();
    await page.waitForFunction(() => document.getElementById('mu-espreita').hidden);
    page.off('request', ouvirRede);
    assert.deepEqual(rede, [], 'tudo da memória');
    // tocar outra vez no separador em que se está atualiza (vai à rede)
    await nav(1);
    await em(1);
    await page.waitForFunction(() => document.getElementById('mu-espreita').hidden);
    const pediu = page.waitForRequest((r) => new URL(r.url()).pathname === '/api/pedidos', { timeout: 5000 });
    await nav(1);
    await pediu;
    // arrastar um pedido à espera para a esquerda cancela-o (e a secção desaparece com o último)
    await page.locator('#mu-body .mu-pedido[data-esq]').first().waitFor();
    await page.waitForLoadState('networkidle');
    await deslizarEm('#mu-body .mu-pedido[data-esq]', 330, 60);
    await page.locator('#mu-aviso').getByText('Pedido cancelado.').waitFor();
    await page.locator('#mu-body .mu-espera').waitFor({ state: 'detached' });
    assert.equal(JSON.parse(await env.KV.get('pedidos')).some((x) => x.id === pedido.id), false, 'o pedido foi cancelado');
    // no topo da página, puxar para baixo atualiza (o motor de gestos decide; a Onda volta a pedir os dados)
    await page.waitForLoadState('networkidle');
    const nLista = await marcarImgs(page, '#mu-body .mu-pl, #mu-body .mu-pl img');
    assert.ok(nLista > 2, `há cartões com capa na lista (${nLista})`);
    const atualizou = page.waitForRequest((r) => r.url().includes('/api/pedidos'));
    await page.evaluate(async () => {
        const el = document.querySelector('#mu-body h1');
        const toque = (y) => new Touch({ identifier: 5, target: el, clientX: 200, clientY: y });
        el.dispatchEvent(new TouchEvent('touchstart', { touches: [toque(120)], bubbles: true, cancelable: true }));
        for (const y of [140, 220, 300]) el.dispatchEvent(new TouchEvent('touchmove', { touches: [toque(y)], bubbles: true, cancelable: true }));
        await new Promise((ok) => setTimeout(ok, 300));
        el.dispatchEvent(new TouchEvent('touchend', { touches: [], bubbles: true, cancelable: true }));
    });
    assert.equal(await page.locator('#mu-ptr').textContent(), 'A atualizar…');
    const tAtu = Date.now();
    await atualizou;
    await page.waitForFunction(() => document.querySelector('#mu-ptr').textContent === '');
    assert.ok(Date.now() - tAtu < 2500, `o «A atualizar…» acaba quando a app volta a desenhar, mesmo que nada tenha mudado (${Date.now() - tAtu} ms)`);
    assert.deepEqual(await mesmasImgs(page, '#mu-body .mu-pl, #mu-body .mu-pl img'), [nLista, nLista], 'atualizar não mexe nos cartões nem nas capas da lista (não piscam)');

    // 7) as ideias do Maestro (as do momento), as propostas para escolher, «não esta» e afinar com o Maestro
    const agente7 = await env.KV.get('agente:chave');
    const api7 = async (p, corpo) => (await worker.fetch(new Request(WORKER + p, { method: 'POST', headers: { authorization: `Bearer ${agente7}`, 'content-type': 'application/json' }, body: JSON.stringify(corpo) }), env, { waitUntil() {} })).json();
    await api7('/api/ideias', { ideias: [{ texto: 'Ideia para qualquer hora', momento: 'sempre', porque: 'Porque o fim do dia pede calma', opcoes: { arco: 'desce' } }, { texto: 'Ideia de dia', momento: 'dia' }, { texto: 'Ideia de noite', momento: 'noite' }] });
    await nav(1);
    await nav(3); // um toque a meio da troca não se perde: vai-se para lá a seguir
    await assente(3);
    await nav(3); // as ideias ficam 5 min em memória: tocar outra vez no separador vai buscar as novas
    await page.getByRole('button', { name: 'Ideia para qualquer hora' }).click();
    assert.equal(await page.locator('[data-onda="ptx"]').inputValue(), 'Ideia para qualquer hora', 'o porquê não vai para o pedido');
    assert.equal(await page.locator('.mu-chip.ideia span').first().textContent(), 'Porque o fim do dia pede calma', 'o porquê aparece por baixo da ideia');
    const dia = new Date().getUTCHours() >= 7 && new Date().getUTCHours() < 20;
    assert.equal(await page.getByRole('button', { name: dia ? 'Ideia de dia' : 'Ideia de noite' }).count(), 1);
    assert.equal(await page.getByRole('button', { name: dia ? 'Ideia de noite' : 'Ideia de dia' }).count(), 0);
    // pela hora local: com o fuso a +10 h, as ideias trocam se for preciso
    await page.evaluate(() => localStorage.setItem('musica:fuso', '600'));
    await nav(1);
    await nav(3);
    await assente(3);
    await page.getByRole('button', { name: 'Ideia para qualquer hora' }).waitFor();
    const h10 = (new Date().getUTCHours() + 10) % 24;
    assert.equal(await page.getByRole('button', { name: h10 >= 7 && h10 < 20 ? 'Ideia de dia' : 'Ideia de noite' }).count(), 1, 'o dia e a noite pela hora local');
    await page.evaluate(() => localStorage.setItem('musica:fuso', '0'));
    assert.equal(await page.getByRole('button', { name: 'Jazz para um domingo de manhã' }).count(), 0, 'com ideias do Maestro, as de sempre saem');
    const bmw = JSON.parse(await env.KV.get('playlist:' + JSON.parse(await env.KV.get('playlists')).find((x) => x.nome === 'Som do BMW').id));
    for (const v of ['Mais conhecida', 'Mais descoberta']) {
        await api7('/api/playlists', { nome: `Noite · ${v}`, pedido: 'Para conduzir à noite', faixas: bmw.faixas, candidatas: bmw.candidatas, opcoes: bmw.opcoes, rascunho: true, grupo: 'qgrupo1', variante: v, tidal: true });
    }
    await nav(1);
    // as propostas à antiga (o Maestro já não as faz: cada pedido dá uma playlist, logo no Tidal) ficam juntas no cimo,
    // em «Propostas por escolher», e não na lista: fica-se com uma (vai para o Tidal; as outras saem) ou apagam-se
    const props = page.locator('#mu-body .mu-propostas');
    await props.getByText('«Para conduzir à noite»').waitFor();
    assert.deepEqual(await props.locator('li b').allInnerTexts(), ['Noite · Mais descoberta', 'Noite · Mais conhecida']);
    assert.equal(await page.locator('#mu-body .mu-grp .mu-pl', { hasText: 'Noite · Mais' }).count(), 0, 'as propostas não estão na lista');
    const nCriadas = sim.criadas.length;
    await props.locator('li', { hasText: 'Noite · Mais descoberta' }).getByRole('button', { name: 'Ficar com esta' }).click();
    await page.locator('#mu-aviso').getByText('«Noite · Mais descoberta» foi para o teu Tidal; as outras propostas saíram.').waitFor();
    assert.equal(sim.criadas.length, nCriadas + 1);
    await props.waitFor({ state: 'detached' });
    const escolhida = page.locator('#mu-body .mu-grp .mu-pl', { hasText: 'Noite · Mais descoberta' });
    await escolhida.waitFor();
    assert.equal(await page.locator('#mu-body .mu-pl', { hasText: 'Noite · Mais conhecida' }).count(), 0, 'a outra proposta saiu');
    assert.match(await escolhida.locator('.or').innerText(), /^O teu pedido: «Para conduzir à noite»$/);
    await escolhida.locator('.mu-pl-a').click();
    // no Tidal: a folha tem «Ouvir no Tidal» e não o aviso de «só na app»
    await page.locator('.mu-folha').getByRole('link', { name: 'Ouvir no Tidal', exact: true }).waitFor();
    assert.equal(await page.locator('.mu-folha').getByText(/^Só está na app/).count(), 0);
    await page.locator('.mu-folha .mu-xf li[data-esq]').first().waitFor();
    const nAntes = (await naFolha(page)).length;
    await page.locator('.mu-folha .mu-xf button.tx').first().click();
    await page.locator('.mu-folha .mu-xf-mais').getByRole('button', { name: 'Tirar' }).click();
    await page.locator('.mu-folha .mu-xf-nota').getByText(/^Tiraste «/).waitFor();
    assert.equal((await naFolha(page)).length, nAntes - 1, 'tirar é na hora');
    // afinar por palavras: «Afinar» abre em cima a caixa do Maestro; enviado o pedido, o afinar fecha e fica limpo
    await page.locator('.mu-folha').getByRole('button', { name: 'Afinar', exact: true }).click();
    await page.locator('.mu-afina [data-onda="af-tx"]').fill('Mais vozes, menos jazz');
    await page.locator('.mu-afina').getByRole('button', { name: 'Pedir ao Maestro' }).click();
    await page.locator('#mu-aviso').getByText(/Pedido de afinação enviado/).waitFor();
    await page.locator('.mu-folha .mu-afina').waitFor({ state: 'detached' });
    await page.locator('.mu-folha .mu-xf li[data-esq]').first().waitFor();
    await page.locator('.mu-folha').getByRole('button', { name: 'Afinar', exact: true }).click();
    assert.equal(await page.locator('.mu-afina [data-onda="af-tx"]').inputValue(), '', 'enviado, o campo fica limpo');
    await page.locator('.mu-afina').getByRole('button', { name: 'Fechar' }).click();
    await page.locator('.mu-folha .mu-afina').waitFor({ state: 'detached' });
    const af = JSON.parse(await env.KV.get('pedidos'))[0];
    assert.deepEqual([af.texto, af.afinar.rejeitadas.length], ['Mais vozes, menos jazz', 1]);
    // a playlist mostra o pedido original e a afinação, à espera do Maestro
    const hist = page.locator('#mu-body .mu-hist');
    await hist.getByText('«Mais vozes, menos jazz»').waitFor();
    assert.equal(await hist.locator('h3').textContent(), 'Pedidos desta playlist');
    assert.match(await hist.locator('li').first().textContent(), /^«.+»O pedido · /);
    assert.match(await hist.locator('li.espera').textContent(), /Afinação · à espera do Maestro · sem 1 que tiraste · Cancelar$/);
    assert.ok(af.afinar.rejeitadas[0].titulo, 'o Maestro recebe o nome da faixa que saiu (já não está na playlist)');
    // o Maestro afina-a (refá-la com menos uma e dá o pedido por feito): a lista mostra «afinada» e a playlist o que mudou
    const agAf = await env.KV.get('agente:chave');
    const apiAf = (p, init = {}) => worker.fetch(new Request(WORKER + p, { ...init, headers: { authorization: `Bearer ${agAf}`, 'content-type': 'application/json' } }), env, { waitUntil() {} });
    const docAf = await (await apiAf(`/api/playlists/${af.afinar.playlist}`)).json();
    assert.ok(!docAf.faixas.some((f) => docAf.rejeitadas.includes(f.id)), 'a faixa tirada já não está na playlist');
    await apiAf(`/api/playlists/${docAf.id}/renovacoes`, { method: 'POST', body: JSON.stringify({ faixas: docAf.faixas.slice(1) }) });
    await apiAf(`/api/pedidos/${af.id}?playlist=${docAf.id}`, { method: 'DELETE' });
    await page.locator('.mu-folha .mu-fechar').click();
    await page.locator('.mu-folha').waitFor({ state: 'detached' });
    await nav(1);
    const afinada = page.locator('#mu-body .mu-grp .mu-pl', { hasText: docAf.nome });
    await afinada.locator('.mu-afinada').getByText(/^✓ afinada a /).waitFor();
    await afinada.locator('.mu-pl-a').click();
    await page.locator('.mu-folha .mu-hist .mu-mudou').getByText('0 novas, 1 saiu').waitFor();
    assert.match(await page.locator('.mu-folha .mu-hist li').last().textContent(), /Afinação · feita a /);
    // outra afinação pedida: o cartão da playlist diz «afinação pedida», e cancela-se na folha, na linha dela
    await page.locator('.mu-folha').getByRole('button', { name: 'Afinar', exact: true }).click();
    await page.locator('.mu-afina [data-onda="af-tx"]').fill('Mais calma');
    await page.locator('.mu-afina').getByRole('button', { name: 'Pedir ao Maestro' }).click();
    await page.locator('.mu-folha .mu-hist li.espera').getByText('«Mais calma»').waitFor();
    await page.locator('.mu-folha .mu-fechar').click();
    await page.waitForFunction(() => !document.querySelector('.mu-folha'));
    await afinada.locator('.mu-pedida').getByText('afinação pedida').waitFor();
    assert.equal(await page.locator('#mu-body .mu-espera').count(), 0, 'uma afinação não é um pedido novo: não vai para o cimo da lista');
    await afinada.locator('.mu-pl-a').click();
    await page.locator('.mu-folha .mu-hist li.espera').getByRole('button', { name: 'Cancelar' }).click();
    await page.locator('#mu-aviso').getByText('Pedido cancelado.').waitFor();
    await page.locator('.mu-folha .mu-hist li.espera').waitFor({ state: 'detached' });
    assert.equal(JSON.parse(await env.KV.get('pedidos')).some((x) => x.texto === 'Mais calma'), false);
    await page.locator('.mu-folha .mu-fechar').click();
    await page.waitForFunction(() => !document.querySelector('.mu-folha'));
    assert.equal(await afinada.locator('.mu-pedida').count(), 0, 'cancelada, o selo sai do cartão');
    await afinada.locator('.mu-pl-a').click();
    await page.locator('.mu-folha .mu-hist').waitFor();
    await page.locator('.mu-folha .mu-fechar').click();
    await page.waitForFunction(() => !document.querySelector('.mu-folha'));
    // a escolhida já não diz «só na app»
    assert.equal(await escolhida.locator('.mt').getByText(/só na app/).count(), 0);
    // uma playlist só na app (não é uma proposta), para arrastar e apagar
    await api7('/api/playlists', { nome: 'Para apagar', pedido: 'Para conduzir à noite', faixas: bmw.faixas, opcoes: bmw.opcoes });
    await nav(1);
    const proposta = () => page.locator('#mu-body .mu-grp .mu-pl', { hasText: 'Para apagar' });
    await proposta().locator('.mt').getByText(/ · só na app$/).waitFor();
    // arrastar o cartão para a esquerda: pouco volta ao sítio; mais de um terço pergunta se é para apagar
    const deslizar = (ate) => page.evaluate(async (ate) => {
        const c = [...document.querySelectorAll('#mu-body .mu-grp .mu-pl')].find((x) => x.textContent.includes('Para apagar'));
        const toque = (x) => new Touch({ identifier: 2, target: c, clientX: x, clientY: c.getBoundingClientRect().top + 30 });
        c.dispatchEvent(new TouchEvent('touchstart', { touches: [toque(330)], bubbles: true, cancelable: true }));
        for (const x of [310, (330 + ate) / 2, ate]) c.dispatchEvent(new TouchEvent('touchmove', { touches: [toque(x)], bubbles: true, cancelable: true }));
        const durante = [c.style.transform, getComputedStyle(c, '::after').content];
        await new Promise((ok) => setTimeout(ok, 150));
        c.dispatchEvent(new TouchEvent('touchend', { touches: [], bubbles: true, cancelable: true }));
        return durante;
    }, ate);
    assert.deepEqual(await deslizar(290), ['translateX(-40px)', '"Apagar"'], 'o cartão segue o dedo e mostra o vermelho');
    await page.waitForTimeout(300);
    assert.equal(await page.locator('.mu-pl-apagar').count(), 0, 'arrastar pouco não pergunta');
    await deslizar(60);
    await page.locator('.mu-pl-apagar').getByText(/^Apagar «.*»\?$/).waitFor();
    await page.locator('.mu-pl-apagar').getByText('Sai da app.').waitFor();
    await page.getByRole('button', { name: 'Não', exact: true }).click();
    await proposta().locator('.mu-pl-a').waitFor();
    // se o apagar falhar (ex.: o Cloudflare sem gravações), diz porquê e o cartão volta ao normal
    env.KV.cheia = true;
    await deslizar(60);
    await page.locator('.mu-pl-apagar').getByRole('button', { name: 'Apagar' }).click();
    await page.locator('#mu-aviso').getByText(/gravações grátis do Cloudflare/).waitFor();
    await proposta().locator('.mu-pl-a').waitFor();
    assert.equal(await page.locator('.mu-pl-apagar').count(), 0, 'depois do erro, o cartão volta ao normal');
    env.KV.cheia = false;
    for (let i = erros.length - 1; i >= 0; i--) if (/status of 503/.test(erros[i])) erros.splice(i, 1); // (o 503 deste passo é o esperado)
    await deslizar(60);
    await page.locator('.mu-pl-apagar').getByRole('button', { name: 'Apagar' }).click();
    await page.locator('#mu-aviso').getByText('Apagada da app.').waitFor();
    await proposta().waitFor({ state: 'detached' });
    // filtrar: «Todas» e um botão por valor que existe (Tidal, tipo, avaliação, género); tocar outra vez tira o filtro
    await page.getByRole('heading', { name: /^Esta semana/ }).waitFor();
    const nCartoes = () => page.locator('#mu-body .mu-grp .mu-pl').count();
    const todas = Number(await page.locator('#mu-body .mu-filtros .mu-chip-f').first().locator('span').textContent());
    assert.equal(await nCartoes(), todas);
    const chip = page.locator('#mu-body .mu-filtros .mu-chip-f').nth(1);
    const nChip = Number(await chip.locator('span').textContent());
    assert.ok(nChip < todas, 'um filtro mostra menos');
    await foto('5a-filtros');
    await chip.click();
    await page.waitForFunction((n) => document.querySelectorAll('#mu-body .mu-grp .mu-pl').length === n, nChip);
    assert.equal(await chip.getAttribute('aria-pressed'), 'true');
    await chip.click();
    await page.waitForFunction((n) => document.querySelectorAll('#mu-body .mu-grp .mu-pl').length === n, todas);
    // juntar: escolher 2 playlists; o conector junta-as numa nova, logo no Tidal
    await page.locator('#mu-body .mu-lista-topo').getByRole('button', { name: 'Juntar', exact: true }).click();
    const barra = page.locator('#mu-body .mu-juntar-barra');
    await barra.getByText('Escolhe 2 ou mais').waitFor();
    assert.ok(await barra.getByRole('button', { name: 'Juntar', exact: true }).isDisabled());
    const esc = page.locator('#mu-body .mu-pl-esc');
    const nome1 = await esc.nth(0).locator('.nm').textContent();
    await esc.nth(0).click();
    await barra.getByText('1 escolhida').waitFor();
    await esc.nth(1).click();
    await barra.getByText('2 escolhidas').waitFor();
    await foto('5b-juntar');
    assert.equal(await esc.nth(0).getAttribute('aria-pressed'), 'true');
    const nJuntar = sim.criadas.length;
    await barra.getByRole('button', { name: 'Juntar', exact: true }).click();
    await page.locator('#mu-aviso').getByText(/^Juntas em «.+» — \d+ faixas, já no teu Tidal\.$/).waitFor();
    await page.locator('#mu-body .mu-pl-a .nm', { hasText: `${nome1} + ` }).first().waitFor();
    assert.equal(sim.criadas.length, nJuntar + 1, 'a juntada vai logo para o Tidal');
    assert.match(sim.criadas.at(-1).name, / \+ /);
    assert.equal(await page.locator('#mu-body .mu-pl', { hasText: `${nome1} + ` }).first().locator('.mt').getByText(/só na app/).count(), 0);
    assert.equal(await page.locator('#mu-body .mu-juntar-barra').count(), 0, 'sai do modo de juntar');
    // cancelar também sai
    await page.locator('#mu-body .mu-lista-topo').getByRole('button', { name: 'Juntar', exact: true }).click();
    await barra.getByRole('button', { name: 'Cancelar' }).click();
    await page.locator('#mu-body .mu-pl-a').first().waitFor();
    assert.equal(await page.locator('#mu-body .mu-pl-esc').count(), 0);
    await foto('5-pedir');

    // 7) voltar a abrir: a chave fica, a app abre ligada
    await page.reload();
    await page.locator('.mu-pl').nth(1).waitFor();
    assert.deepEqual(erros, [], 'sem erros na consola');
    await ctx.close();
});

test('um convite já usado: ao ligar diz porquê e aparece o campo para colar um código novo', { skip: !chromium && 'sem Playwright' }, async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    const page = await ctx.newPage();
    await page.addInitScript(() => { if (!sessionStorage.getItem('feito')) { sessionStorage.setItem('feito', '1'); localStorage.clear(); localStorage.setItem('musica:codigo', 'CONVITE-GASTO'); } });
    await page.goto(`${APP}?proxy=${encodeURIComponent(WORKER)}`);
    await page.getByRole('button', { name: 'Ligar ao Tidal' }).click();
    await page.locator('#mu-aviso').getByText(/inválido ou já usado/).waitFor();
    await page.locator('[data-onda="cod"]').waitFor();
    assert.equal(await page.evaluate(() => localStorage.getItem('musica:codigo')), null, 'esquece o código que não serve');
    await ctx.close();
});

test('trocar uma faixa (⇄): o motor escolhe a substituta no telemóvel, vê-se logo e grava-se no Tidal; a que sai não volta; desfazer', { skip: !chromium && 'sem Playwright' }, async () => {
    // uma playlist do Maestro já no Tidal: 4 faixas, 6 candidatas (2 livres)
    const base = await publicarComoCurador();
    const agente = await env.KV.get('agente:chave');
    const api = (p, init = {}) => worker.fetch(new Request(WORKER + p, { ...init, headers: { authorization: `Bearer ${agente}`, 'content-type': 'application/json' } }), env, { waitUntil() {} });
    sim.listas['uuid-nova'] = []; // (o simulador dá o mesmo id a todas as playlists que cria: começa-se com ela vazia)
    const d0 = await (await api(`/api/playlists/${base.id}/tidal`, { method: 'POST', body: '{}' })).json();
    const pid = d0.tidal.id;
    const noTidal = () => sim.listas[pid].map((x) => x.id);
    const kvDoc = async () => JSON.parse(await env.KV.get('playlist:' + base.id));
    assert.deepEqual(noTidal(), d0.faixas.map((f) => f.id));
    const livres = d0.candidatas.map((c) => c.faixa.id).filter((x) => !d0.faixas.some((f) => f.id === x));
    assert.equal(livres.length, 2);
    // a playlist deixa uma faixa por artista e as duas livres são do Miles Davis: só entram no lugar da dele
    const q = d0.faixas.findIndex((f) => f.artistas[0] === 'Miles Davis'), o = q === 2 ? 1 : 2;
    assert.ok(q >= 0 && d0.opcoes.maxArtista === 1);
    await env.KV.put('codigo:ligacao', createHash('sha256').update('TROCA-456').digest('hex'));
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', hasTouch: true });
    const page = await ctx.newPage();
    const erros = [];
    page.on('pageerror', (e) => erros.push(String(e)));
    await page.goto(`${APP}?proxy=${encodeURIComponent(WORKER)}`);
    await page.locator('[data-onda="cod"]').fill('TROCA-456');
    await page.getByRole('button', { name: 'Usar este código' }).click();
    const cartao = page.locator('#mu-body .mu-pl', { has: page.locator(`[data-onda="exp\t${base.id}"]`) });
    await cartao.locator('.mu-pl-a').click();
    await page.locator('.mu-folha .mu-xf li[data-esq]').first().waitFor();
    await page.evaluate(() => {
        window.__folhas = 0;
        new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1 && (n.matches('.mu-folha') || n.querySelector('.mu-folha'))) window.__folhas++; })
            .observe(document.getElementById('mu-body'), { childList: true, subtree: true });
    });
    const linhas = page.locator('.mu-folha .mu-xf li[data-esq]');
    const gravada = () => page.locator('.mu-folha .mu-xf li.a-trocar').waitFor({ state: 'detached' });
    // cada faixa tem ouvir e trocar; o ✕ saiu da linha
    assert.equal(await linhas.nth(q).locator('.mu-trocar').count(), 1);
    assert.equal(await page.locator('.mu-folha .mu-nao').count(), 0);
    // 1) ⇄ na do Miles Davis: a que entra vê-se logo (antes de o conector responder), no mesmo sítio
    const sai1 = d0.faixas[q];
    let segurar; const espera = new Promise((ok) => { segurar = ok; });
    await page.route('**/api/playlists/*/trocar', async (r) => { await espera; await r.continue(); }); // (as seguintes passam logo)
    const outras = (await naFolha(page)).map((_, i) => i !== q);
    assert.equal(await marcarLinhas(page), d0.faixas.length);
    const nImgT = await marcarImgs(page);
    await linhas.nth(q).locator('.mu-trocar').click();
    await page.locator('.mu-folha .mu-xf li.a-trocar').waitFor();
    assert.deepEqual(await mesmasLinhas(page), outras, 'só a linha trocada é nova: as outras não se mexem (não piscam)');
    const mostra1 = await linhas.nth(q).locator('.tx b').textContent();
    assert.notEqual(mostra1, sai1.titulo, 'a linha já mostra a que entra');
    assert.deepEqual((await kvDoc()).faixas.map((f) => f.id), d0.faixas.map((f) => f.id), 'ainda não foi gravada');
    segurar();
    await gravada();
    const d1 = await kvDoc();
    const entra1 = d1.faixas[q];
    assert.ok(livres.includes(entra1.id), 'entra uma candidata livre, escolhida pelo motor no telemóvel');
    assert.equal(entra1.titulo, mostra1, 'a que se viu é a que ficou');
    assert.deepEqual(d1.faixas.map((f) => f.id), d0.faixas.map((f, i) => (i === q ? entra1.id : f.id)), 'no mesmo sítio; as outras não mexem');
    assert.deepEqual(noTidal(), d1.faixas.map((f) => f.id), 'o Tidal fica igual, na mesma playlist');
    assert.deepEqual(d1.rejeitadas, [sai1.id]);
    assert.deepEqual(await naFolha(page), d1.faixas.map((f) => f.id));
    assert.deepEqual(await mesmasLinhas(page), outras, 'depois de gravada, também');
    const [tImg, mImg] = await mesmasImgs(page);
    assert.ok(nImgT >= 5 && mImg >= nImgT - 1 && tImg - mImg <= 1, `só a capa da faixa que entrou é nova (${nImgT} antes; ${tImg} agora, ${mImg} as mesmas)`);
    assert.equal(await page.locator('.mu-folha .mu-xf-nota').textContent(), `Trocaste «${sai1.titulo}» por «${entra1.titulo}». Desfazer`);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, '6-trocada.png') });
    // 2) outra vez na mesma: vem a outra candidata livre (a que saiu não volta)
    await linhas.nth(q).locator('.mu-trocar').click();
    await page.locator('.mu-folha .mu-xf-nota').getByText(`Trocaste «${entra1.titulo}» por`).waitFor();
    await gravada();
    const d2 = await kvDoc();
    assert.equal(d2.faixas[q].id, livres.find((x) => x !== entra1.id));
    assert.deepEqual(d2.rejeitadas.sort(), [sai1.id, entra1.id].sort());
    // 3) já sem candidatas livres: o conector vai buscar uma faixa parecida ao Tidal
    const antes3 = d2.faixas[q];
    const previas = page.waitForRequest((r) => r.url().includes('/previas'));
    await linhas.nth(q).locator('.mu-trocar').click();
    await page.locator('.mu-folha .mu-xf-nota').getByText(`Trocaste «${antes3.titulo}» por`).waitFor();
    await gravada();
    const d3 = await kvDoc();
    assert.ok(!d0.candidatas.some((c) => c.faixa.id === d3.faixas[q].id), 'uma faixa nova, do Tidal');
    assert.match(d3.faixas[q].motivo, /^Parecida com «/);
    assert.equal(d3.candidatas.length, d0.candidatas.length + 1);
    assert.deepEqual(noTidal(), d3.faixas.map((f) => f.id));
    assert.ok(sim.chamadas.some((c) => c.includes(`/tracks/${antes3.id}/relationships/similarTracks`)));
    await previas; // (as capas e as pré-escutas pedem-se outra vez depois de cada troca, para a faixa nova)
    // 4) desfazer: fica como estava antes da última troca (e a nota passa a ser a da troca anterior)
    await page.locator('.mu-folha .mu-xf-nota').getByRole('button', { name: 'Desfazer' }).click();
    await page.locator('.mu-folha .mu-xf-nota').getByText(`Trocaste «${entra1.titulo}» por «${antes3.titulo}».`).waitFor();
    const d4 = await kvDoc();
    assert.equal(d4.faixas[q].id, antes3.id);
    assert.deepEqual(d4.rejeitadas.sort(), d2.rejeitadas.sort(), 'as que saíram são as de antes: a parecida do Tidal não fica marcada');
    assert.equal(d4.trocas.length, 2);
    assert.deepEqual(noTidal(), d4.faixas.map((f) => f.id));
    // 5) tirar (na linha aberta) e repor
    await marcarLinhas(page);
    await linhas.nth(o).locator('button.tx').click();
    await page.locator('.mu-folha .mu-xf-mais').getByRole('button', { name: 'Tirar' }).click();
    await page.locator('.mu-folha .mu-xf-nota').getByText(`Tiraste «${d4.faixas[o].titulo}».`).waitFor();
    assert.deepEqual(noTidal(), d4.faixas.filter((_, i) => i !== o).map((f) => f.id));
    assert.match(await page.locator('.mu-folha .mu-fo-tx p').textContent(), /^3 faixas · /);
    assert.deepEqual(await mesmasLinhas(page), [true, true, true], 'tirar uma faixa não mexe nas outras linhas');
    await page.locator('.mu-folha .mu-xf-nota').getByRole('button', { name: 'Repor' }).click();
    await page.locator('.mu-folha .mu-xf-nota').getByText(/^Trocaste «/).waitFor();
    assert.deepEqual(noTidal(), d4.faixas.map((f) => f.id), 'reposta no mesmo sítio');
    assert.deepEqual(await mesmasLinhas(page), d4.faixas.map((_, i) => i !== o), 'nem repô-la: só entra a linha dela');
    assert.equal(await page.evaluate(() => window.__folhas), 0, 'nada disto fez a folha subir outra vez');
    // 5b) no lugar de outro artista as candidatas livres não cabem (uma por artista): vem logo uma parecida do Tidal
    const d4b = await kvDoc();
    await linhas.nth(o).locator('.mu-trocar').click();
    await page.locator('.mu-folha .mu-xf-nota').getByText(`Trocaste «${d4b.faixas[o].titulo}» por`).waitFor();
    await gravada();
    assert.match((await kvDoc()).faixas[o].motivo, /^Parecida com «/);
    await page.locator('.mu-folha .mu-xf-nota').getByRole('button', { name: 'Desfazer' }).click();
    await page.locator('.mu-folha .mu-xf-nota').getByText(`por «${d4b.faixas[q].titulo}».`).waitFor();
    assert.deepEqual((await kvDoc()).faixas.map((f) => f.id), d4b.faixas.map((f) => f.id));
    // 6) se o conector falhar, a linha volta ao que era e diz porquê
    env.KV.cheia = true;
    await linhas.nth(0).locator('.mu-trocar').click();
    await page.locator('#mu-aviso').getByText(/.+/).waitFor();
    await gravada();
    env.KV.cheia = false;
    assert.deepEqual(await naFolha(page), (await kvDoc()).faixas.map((f) => f.id));
    // 7) afinar uma playlist que está no Tidal: as que saíram ficam de fora, e guardar grava lá (a mesma playlist)
    const d5 = await kvDoc();
    await page.getByRole('button', { name: 'Afinar', exact: true }).click();
    const usaveis = d5.candidatas.length - d5.candidatas.filter((c) => d5.rejeitadas.includes(c.faixa.id)).length;
    assert.equal(await page.locator('[data-onda="af-n"]').getAttribute('max'), String(usaveis));
    await page.locator('[data-onda="af-mx\t3"]').click();
    await page.locator('.mu-af-guarda').getByRole('button', { name: 'Guardar no Tidal' }).waitFor();
    const afinadas = await page.$$eval('.mu-folha .mu-xf li.af', (ls) => ls.map((l) => l.dataset.id));
    assert.ok(afinadas.length && afinadas.every((x) => !d5.rejeitadas.includes(x)), 'as que saíram não voltam');
    const criadas = sim.criadas.length;
    await page.locator('.mu-af-guarda').getByRole('button', { name: 'Guardar no Tidal' }).click();
    await page.locator('#mu-aviso').getByText('Guardada no Tidal.').waitFor();
    assert.deepEqual(noTidal(), afinadas);
    assert.equal(sim.criadas.length, criadas, 'sem playlists novas no Tidal');
    assert.deepEqual(await naFolha(page), afinadas);
    assert.deepEqual(erros, []);
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

test('avisos no telemóvel: ligar nos Ajustes, enviar um de teste e desligar; no iPhone fora do ecrã principal, explica como', { skip: !chromium && 'sem Playwright' }, async () => {
    // o telemóvel (simulado): a assinatura do serviço de notificações, com chaves válidas como as do browser
    const kp = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
    const b64 = (b) => Buffer.from(b).toString('base64url');
    const chaves = { p256dh: b64(new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey))), auth: b64(crypto.getRandomValues(new Uint8Array(16))) };
    await env.KV.put('codigo:ligacao', createHash('sha256').update('AVISOS-1').digest('hex'));
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    await ctx.addInitScript((keys) => {
        const sub = { endpoint: 'https://web.push.apple.com/QGui', toJSON() { return { endpoint: this.endpoint, keys }; }, unsubscribe: async () => true };
        let assinada = null;
        const pushManager = { getSubscription: async () => assinada, subscribe: async () => (assinada = sub) };
        Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { ready: Promise.resolve({ pushManager }), register: async () => ({}) } });
        window.PushManager = function PushManager() {};
        window.Notification = { permission: 'default', requestPermission: async () => 'granted' };
    }, chaves);
    const page = await ctx.newPage();
    const erros = [];
    page.on('pageerror', (e) => erros.push(String(e)));
    await page.goto(`${APP}?proxy=${encodeURIComponent(WORKER)}`);
    await page.locator('[data-onda="cod"]').fill('AVISOS-1');
    await page.getByRole('button', { name: 'Usar este código' }).click();
    await page.locator('.mu-pl').first().waitFor();
    await page.locator('#mu-nav [data-onda="ir\t5"]').click();
    const cartao = page.locator('#aj-avisos');
    await cartao.getByRole('button', { name: 'Ligar os avisos' }).click();
    await page.locator('#mu-aviso').getByText('Avisos ligados neste telemóvel.').waitFor();
    assert.equal(JSON.parse(await env.KV.get('push'))[0].endpoint, 'https://web.push.apple.com/QGui', 'o conector guarda a assinatura');
    const n = sim.pushes.length;
    await cartao.getByRole('button', { name: 'Enviar um de teste' }).click();
    await page.locator('#mu-aviso').getByText(/^Enviado/).waitFor();
    assert.equal(sim.pushes.length, n + 1);
    await cartao.getByRole('button', { name: 'Desligar' }).click();
    await page.locator('#mu-aviso').getByText('Avisos desligados.').waitFor();
    await cartao.getByRole('button', { name: 'Ligar os avisos' }).waitFor();
    assert.deepEqual(JSON.parse(await env.KV.get('push')), [], 'e sai do conector');
    assert.deepEqual(erros, []);
    await ctx.close();
    // no iPhone, no Safari (fora do ecrã principal) não há avisos: o cartão diz como pôr a app no ecrã principal
    await env.KV.put('codigo:ligacao', createHash('sha256').update('AVISOS-2').digest('hex'));
    const ios = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1' });
    await ios.addInitScript(() => { delete window.PushManager; });
    const p2 = await ios.newPage();
    await p2.goto(`${APP}?proxy=${encodeURIComponent(WORKER)}`);
    await p2.locator('[data-onda="cod"]').fill('AVISOS-2');
    await p2.getByRole('button', { name: 'Usar este código' }).click();
    await p2.locator('.mu-pl').first().waitFor();
    await p2.locator('#mu-nav [data-onda="ir\t5"]').click();
    await p2.locator('#aj-avisos').getByText(/Adicionar ao ecrã principal/).waitFor();
    assert.equal(await p2.locator('#aj-avisos button').count(), 0, 'sem botões: só a explicação');
    await ios.close();
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
        route.fulfill({ status: 302, headers: { location: `${WORKER}/tidal/retorno?code=CODIGO-ANA&state=${u.searchParams.get('state')}` } });
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
    // a tua conta: o que se guarda, as páginas de privacidade e de apoio, e apagar tudo (pede-se na app; pergunta primeiro)
    const uidAna = JSON.parse(await env.KV.get('utilizadores'))[0].uid;
    const daAna = () => [...env.KV.m.keys()].filter((k) => k.startsWith(`u:${uidAna}:`));
    assert.ok(daAna().length > 0);
    const conta = pb.locator('.mu-conta');
    await conta.getByRole('heading', { name: 'A tua conta' }).waitFor();
    assert.equal(await pb.locator('#mu-body').getByRole('link', { name: 'Privacidade' }).getAttribute('href'), 'privacidade.html');
    assert.equal(await pb.locator('#mu-body').getByRole('link', { name: 'Apoio' }).getAttribute('href'), 'apoio.html');
    await conta.getByRole('button', { name: 'Apagar a minha conta', exact: true }).click();
    await conta.getByText(/^Apagar tudo\? Sai a ligação ao Tidal, .* As playlists que já estão no teu Tidal ficam lá\. Não dá para desfazer\.$/).waitFor();
    assert.equal(await conta.getByText(/És quem montou a app/).count(), 0, 'o aviso de quem montou a app é só para o dono');
    await conta.getByRole('button', { name: 'Não', exact: true }).click();
    await conta.getByRole('button', { name: 'Apagar a minha conta', exact: true }).waitFor();
    assert.ok(daAna().length > 0, '«Não» não apaga nada');
    await conta.getByRole('button', { name: 'Apagar a minha conta', exact: true }).click();
    await conta.getByRole('button', { name: 'Sim, apagar a minha conta' }).click();
    await pb.locator('#mu-aviso').getByText('Conta apagada: o conector já não guarda nada sobre ti.').waitFor();
    // fica como quem nunca entrou: sem chave no aparelho, sem nada no conector; a outra app dela também perde o acesso
    await pb.locator('[data-onda="cod"]').waitFor();
    assert.equal(await pb.evaluate(() => localStorage.getItem('musica:chave')), null);
    assert.deepEqual(daAna(), []);
    assert.deepEqual(JSON.parse(await env.KV.get('utilizadores')), []);
    await pc.locator('#mu-nav [data-onda="ir\t1"]').click();
    await pc.getByRole('heading', { name: 'Este aparelho perdeu o acesso' }).waitFor();
    assert.ok(await env.KV.get('tidal:tokens'), 'o Tidal do dono continua ligado');
    for (let i = erros.length - 1; i >= 0; i--) if (/status of 401/.test(erros[i])) erros.splice(i, 1); // (o 401 da outra app dela é o esperado)
    await c.close();
    assert.deepEqual(erros, []);
    await b.close();
});

test('o Maestro na hora: o pedido chama-o, a app diz «uns minutos» e vai ver sozinha se ele já acabou', { skip: !chromium && 'sem Playwright' }, async () => {
    // (com os segredos do gatilho da tarefa agendada no conector; no simulador, a chamada fica em sim.maestro)
    Object.assign(env, { MAESTRO_FIRE_URL: 'https://api.anthropic.com/v1/claude_code/routines/trig_01UI/fire', MAESTRO_TOKEN: 'segredo-ui', MAESTRO_ESPERA_MS: 0 });
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', hasTouch: true });
    try {
        await env.KV.put('codigo:ligacao', createHash('sha256').update('HORA-789').digest('hex'));
        await env.KV.put('pedidos', '[]');
        const page = await ctx.newPage();
        await page.clock.install(); // (o tempo corre normalmente; mais abaixo salta-se 45 s de uma vez)
        const erros = [];
        page.on('pageerror', (e) => erros.push(String(e)));
        await page.goto(`${APP}?proxy=${encodeURIComponent(WORKER)}`);
        await page.locator('[data-onda="cod"]').fill('HORA-789');
        await page.getByRole('button', { name: 'Usar este código' }).click();
        await page.locator('#mu-body .mu-pl').first().waitFor();
        await page.locator('#mu-nav [data-onda="ir\t3"]').click();
        await page.getByText('O Maestro é chamado logo e cria a playlist em poucos minutos, no teu Tidal.').waitFor();
        await page.locator('[data-onda="ptx"]').fill('Bossa nova para o fim da tarde');
        const n = sim.maestro.length;
        await page.getByRole('button', { name: 'Pedir ao Maestro' }).click();
        await page.locator('#mu-aviso').getByText('Pedido feito — o Maestro já foi chamado: costuma demorar uns minutos.').waitFor();
        const espera = page.locator('#mu-body .mu-espera');
        await espera.getByText('«Bossa nova para o fim da tarde»').waitFor();
        await espera.getByText('O Maestro é chamado quando pedes: costuma demorar uns minutos. As playlists aparecem aqui e no teu Tidal.').waitFor();
        for (let i = 0; i < 50 && sim.maestro.length === n; i++) await new Promise((ok) => setTimeout(ok, 20));
        assert.equal(sim.maestro.length, n + 1, 'o conector chamou a tarefa agendada');
        assert.equal(sim.maestro.at(-1).authorization, 'Bearer segredo-ui');
        // ainda nada mudou: a app vai ver (45 s depois) e fica como está, sem piscar nem avisar
        const pedidos = [];
        page.on('request', (r) => { if (/\/api\/(pedidos|playlists)$/.test(new URL(r.url()).pathname)) pedidos.push(new URL(r.url()).pathname); });
        await page.clock.fastForward(46000);
        await page.waitForFunction(() => true);
        for (let i = 0; i < 50 && !pedidos.length; i++) await new Promise((ok) => setTimeout(ok, 20));
        assert.deepEqual(pedidos, ['/api/pedidos'], 'vai ver só os pedidos (as playlists só quando algum acaba)');
        assert.equal(await page.locator('#mu-aviso .mu-toast').filter({ hasText: 'O Maestro acabou' }).count(), 0);
        // o Maestro acaba: cria a playlist (logo no Tidal) e dá o pedido por feito
        const ag = await env.KV.get('agente:chave');
        const api = (p, init = {}) => worker.fetch(new Request(WORKER + p, { ...init, headers: { authorization: `Bearer ${ag}`, 'content-type': 'application/json' } }), env, { waitUntil() {} });
        const ped = JSON.parse(await env.KV.get('pedidos')).find((x) => x.texto === 'Bossa nova para o fim da tarde');
        const nova = await (await api('/api/playlists', { method: 'POST', body: JSON.stringify({ nome: 'Bossa ao fim da tarde', pedido: ped.texto, tidal: true, faixas: [{ id: '101', titulo: 'So What', artistas: ['Miles Davis'], duracao: 200 }] }) })).json();
        await api(`/api/pedidos/${ped.id}?playlist=${nova.id}`, { method: 'DELETE' });
        // sem tocar em nada: na vez seguinte a app dá por isso, avisa e mostra a playlist; o relógio pára
        await page.clock.fastForward(46000);
        await page.locator('#mu-aviso').getByText('O Maestro acabou: a playlist já está na lista.').waitFor();
        await page.locator('#mu-body .mu-pl', { hasText: 'Bossa ao fim da tarde' }).waitFor();
        await espera.waitFor({ state: 'detached' });
        pedidos.length = 0;
        await page.clock.fastForward(120000);
        await new Promise((ok) => setTimeout(ok, 300));
        assert.deepEqual(pedidos.filter((x) => x === '/api/pedidos'), [], 'sem pedidos à espera, a app deixa de ir ver');
        assert.deepEqual(erros, []);
    } finally {
        delete env.MAESTRO_FIRE_URL; delete env.MAESTRO_TOKEN; delete env.MAESTRO_ESPERA_MS;
        await ctx.close();
    }
});

test('afinar uma playlist de parecidas à antiga, com 30 faixas (as do Tidal: energias com casas decimais, nomes com apóstrofos, faixas sem capa)', { skip: !chromium && 'sem Playwright' }, async () => {
    // como as «Parecidas com …» criadas antes de haver revisão do Maestro: todas as candidatas estão na playlist
    const nomes = [['Hallelujah', 'Jeff Buckley'], ['Hallelujah', 'Leonard Cohen'], ['Hurt', 'Johnny Cash'], ['Angel', 'Sarah McLachlan'], ['Lilac Wine', 'Jeff Buckley'], ['Mike Koss - halleaugh', 'Mike'],
        ['Hallelujah', 'Rufus Wainwright'], ['Mad World', 'Gary Jules', 'Michael Andrews'], ['Suzanne', 'Leonard Cohen'], ['Everybody Hurts', 'R.E.M.'], ['Nothing Compares 2 U', "Sinéad O'Connor"],
        ['Streets of Philadelphia', 'Bruce Springsteen'], ['Comfortably Numb', 'Pink Floyd'], ['Hallelujah', 'John Cale'], ['Where Did You Sleep Last Night', 'Nirvana'], ['High and Dry', 'Radiohead'],
        ['Teardrop', 'Massive Attack', 'Elizabeth Fraser'], ['1979', 'Smashing Pumpkins'], ['Skinny Love', 'Bon Iver']];
    while (nomes.length < 30) nomes.push([`Faixa "${nomes.length}" <b>&`, `Artista ${nomes.length % 7}`]);
    const faixas = nomes.map(([titulo, ...artistas], i) => ({ id: String(700000 + i), titulo, versao: '', artistas, album: 'Álbum', ano: 1990 + (i % 30), duracao: 200 + i * 7, tags: i % 3 ? ['LOSSLESS'] : ['HIRES_LOSSLESS'],
        bpm: i === 5 ? 0 : 71.5 + i * 3.7, tom: (i % 24) + 1, genero: '', popularidade: 30 + i, motivo: i ? 'Parecida com «Hallelujah».' : 'A faixa de partida.', porque: '', pontos: 0, url: `https://tidal.com/browse/track/${700000 + i}` }));
    const candidatas = faixas.map((f, i) => ({ artista: f.artistas[0], titulo: f.titulo, motivo: f.motivo, fixa: !i, faixa: f,
        sinais: { artista: f.artistas[0], genero: '', ano: f.ano, gosto: 200, qualidade: 700, tendencia: f.popularidade, claude: 700, novidade: 1000, energia: f.bpm ? Math.min(950, Math.max(100, ((f.bpm - 60) * 1000) / 110)) : 500, bpm: f.bpm, tom: f.tom, fixa: !i } }));
    const doc = { id: 'pparecidas30', nome: 'Parecidas com Hallelujah', descricao: 'Faixas parecidas com «Hallelujah», de Jeff Buckley.', resumo: 'Pedi ao Tidal as faixas parecidas com «Hallelujah».', tendencias: [], pedido: '',
        opcoes: { faixas: 30, maxArtista: 3, estilo: 'equilibrado', arco: 'onda' }, faixas, candidatas, custo: 0, criadaEm: '2026-11-13T10:00:00.000Z', por: 'app', modelo: '',
        tidal: { id: 'uuid-nova', url: 'https://tidal.com/browse/playlist/uuid-nova', criadaEm: '2026-11-13T10:00:00.000Z', faixas: 30 } };
    await env.KV.put('playlist:' + doc.id, JSON.stringify(doc));
    const idx = JSON.parse(await env.KV.get('playlists'));
    idx.unshift({ id: doc.id, nome: doc.nome, criadaEm: doc.criadaEm, por: 'app', faixas: 30, duracao: faixas.reduce((t, f) => t + f.duracao, 0), tidal: doc.tidal.url });
    await env.KV.put('playlists', JSON.stringify(idx));
    await env.KV.put('codigo:ligacao', createHash('sha256').update('TRINTA-30').digest('hex'));
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', hasTouch: true });
    try {
        const page = await ctx.newPage();
        const erros = [];
        page.on('pageerror', (e) => erros.push(String(e)));
        page.on('console', (m) => { if (m.type() === 'error') erros.push('consola: ' + m.text()); });
        await page.goto(`${APP}?proxy=${encodeURIComponent(WORKER)}`);
        await page.locator('[data-onda="cod"]').fill('TRINTA-30');
        await page.getByRole('button', { name: 'Usar este código' }).click();
        const cartao = page.locator('#mu-body .mu-pl', { has: page.locator(`[data-onda="exp\t${doc.id}"]`) });
        await cartao.locator('.mu-pl-a').click();
        await page.locator('.mu-folha .mu-xf li[data-esq]').nth(29).waitFor();
        await page.waitForLoadState('networkidle');
        // um dedo nunca fica parado: com a folha no topo, um toque que mexe 2 px para baixo continua a ser um toque (se a
        // casca segurasse esse movimento, o iPhone desistia do toque e o «Afinar» não respondia); a partir de 4 px é puxar
        const mexer = (dy) => page.evaluate((dy) => {
            const b = document.querySelector('.mu-folha [data-onda="afinar"]'), r = b.getBoundingClientRect();
            const toque = (y) => new Touch({ identifier: 9, target: b, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 + y });
            b.dispatchEvent(new TouchEvent('touchstart', { touches: [toque(0)], bubbles: true, cancelable: true }));
            const m = new TouchEvent('touchmove', { touches: [toque(dy)], bubbles: true, cancelable: true });
            b.dispatchEvent(m);
            b.dispatchEvent(new TouchEvent('touchend', { touches: [], bubbles: true, cancelable: true }));
            return m.defaultPrevented;
        }, dy);
        assert.equal(await page.locator('.mu-folha').evaluate((f) => f.scrollTop), 0);
        assert.equal(await mexer(2), false, 'um toque que mexe 2 px para baixo não é segurado: o iPhone ainda dá o toque');
        assert.equal(await mexer(-3), false);
        assert.equal(await mexer(6), true, 'a partir de 4 px para baixo é puxar para fechar: a folha segura o movimento');
        await page.locator('.mu-folha').getByRole('button', { name: 'Afinar', exact: true }).tap();
        await page.locator('.mu-folha .mu-afina').waitFor({ timeout: 5000 });
        assert.equal(await page.locator('.mu-folha .mu-xf li.af').count(), 30);
        // em cima, logo depois do cabeçalho: a caixa do Maestro vê-se sem descer a folha
        const caixa = await page.locator('.mu-afina [data-onda="af-tx"]').boundingBox();
        assert.ok(caixa.y > 0 && caixa.y + caixa.height < 844, `a caixa do Maestro está à vista (${Math.round(caixa.y)})`);
        assert.deepEqual(erros.filter((x) => !/ERR_TUNNEL_CONNECTION_FAILED|ERR_NAME_NOT_RESOLVED|net::ERR_/.test(x)), [], 'sem erros (as capas de fora não se carregam neste teste)');
    } finally { await ctx.close(); }
});

// Tidal × Maestro: uma «Mais como esta» já revista pelo Maestro. A história da playlist diz quantas das do Tidal ficaram
// e quantas entraram, o que guardaste de cada lado, e deixa ouvir as do Tidal que saíram e voltar a pô-las
test('Tidal × Maestro: depois da revisão, a folha compara as duas listas; as do Tidal que saíram ouvem-se e voltam a entrar', { skip: !chromium && 'sem Playwright' }, async () => {
    const curta = (id, titulo, artista, extra = {}) => ({ id, titulo, artistas: [artista], album: 'Álbum', ano: 1960, duracao: 200, ...extra });
    const doTidal = [curta('101', 'So What', 'Miles Davis'), curta('102', 'Feeling Good', 'Nina Simone', { isrc: 'USAAA0000102' }), curta('106', 'Teardrop', 'Massive Attack'),
        curta('105', 'Barco Negro', 'Amália Rodrigues'), curta('103', 'Get Lucky', 'Daft Punk', { versao: 'Radio Edit' })];
    const linha = (f, motivo) => ({ ...f, versao: f.versao || '', tags: ['LOSSLESS'], bpm: 0, tom: 0, genero: '', popularidade: 50, motivo, porque: '', pontos: 0, url: `https://tidal.com/browse/track/${f.id}` });
    const faixas = [linha(doTidal[0], 'A faixa de partida.'), linha(doTidal[3], 'Fica: a mesma época.'), linha(curta('200', 'Faixa 0', 'Miles Davis'), 'Do mesmo sexteto.'), linha(curta('201', 'Faixa 1', 'Miles Davis'), 'Da mesma sessão.')];
    const em = '2026-11-13T10:00:00.000Z', revista = '2026-11-13T18:50:00.000Z';
    const doc = { id: 'pcmptidal', nome: 'Parecidas com So What', descricao: 'Faixas parecidas com «So What», de Miles Davis.', resumo: 'Revista pelo Maestro.', tendencias: [], pedido: '',
        opcoes: { faixas: 30, maxArtista: 3, estilo: 'equilibrado', arco: 'onda' }, faixas, candidatas: [], custo: 0, criadaEm: em, por: 'curador', modelo: 'm', origem: 'parecidas',
        doTidal: { em, faixas: doTidal }, revistaEm: revista, afinadaEm: revista,
        afinacoes: [{ pedido: 'qcmp1', texto: 'Rever as parecidas do Tidal', rejeitadas: 0, em, rever: true, feitoEm: revista, entraram: 2, sairam: 3, novas: ['Faixa 0 — Miles Davis'] }],
        avaliacao: { nota: 70, etiqueta: 'boa', guardadas: [{ id: '101', artista: 'Miles Davis', titulo: 'So What' }, { id: '200', artista: 'Miles Davis', titulo: 'Faixa 0' }, { id: '201', artista: 'Miles Davis', titulo: 'Faixa 1' }],
            tiradas: [], juntadas: 0, eco: [], apagada: false, em: revista },
        tidal: { id: 'uuid-nova', url: 'https://tidal.com/browse/playlist/uuid-nova', criadaEm: em, faixas: 4 } };
    await env.KV.put('playlist:' + doc.id, JSON.stringify(doc));
    const idx = JSON.parse(await env.KV.get('playlists'));
    idx.unshift({ id: doc.id, nome: doc.nome, criadaEm: em, por: 'curador', faixas: 4, duracao: 800, tidal: doc.tidal.url, origem: 'parecidas', revistaEm: revista });
    await env.KV.put('playlists', JSON.stringify(idx));
    await env.KV.put('codigo:ligacao', createHash('sha256').update('COMPARA-1').digest('hex'));
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', hasTouch: true });
    try {
        const page = await ctx.newPage();
        const erros = [];
        page.on('pageerror', (e) => erros.push(String(e)));
        page.on('console', (m) => { if (m.type() === 'error') erros.push('consola: ' + m.text()); });
        await page.goto(`${APP}?proxy=${encodeURIComponent(WORKER)}`);
        await page.locator('[data-onda="cod"]').fill('COMPARA-1');
        await page.getByRole('button', { name: 'Usar este código' }).click();
        await page.evaluate(() => { window.musicaLeitor.play = () => Promise.resolve(); }); // (sem ir à rede no teste)
        const cartao = page.locator('#mu-body .mu-pl', { has: page.locator(`[data-onda="exp\t${doc.id}"]`) });
        await cartao.locator('.mu-pl-a').click();
        const hist = page.locator('.mu-folha .mu-hist');
        await hist.locator('.mu-cmp-n').waitFor();
        assert.equal(await hist.locator('.mu-cmp-n').innerText(), 'Das 5 do Tidal ficaram 2 · entraram 2 novas');
        assert.equal(await hist.locator('.mu-mudou').nth(1).innerText(), 'Guardaste nas favoritas: 1 do Tidal · 2 das novas');
        const cmp = hist.locator('details.mu-cmp');
        assert.equal(await cmp.locator('summary').innerText(), 'Ouvir as 3 do Tidal que saíram');
        await cmp.locator('summary').click();
        // as que saíram, pela ordem do Tidal, cada uma com o ▶ (as pré-escutas chegam depois de abrir a folha) e o «+»
        await page.waitForFunction(() => document.querySelectorAll('.mu-folha .mu-cmp [data-onda^="ouvir"]').length === 3);
        assert.deepEqual(await cmp.locator('li .tx b').allInnerTexts(), ['Feeling Good', 'Teardrop', 'Get Lucky']);
        assert.equal(await cmp.locator('[data-onda^="repor_t"]').count(), 3);
        // cada uma numa linha como as da playlist (capa, título, ▶ e «+» lado a lado), sem o ponto da história e sem sair da folha
        const g = await cmp.locator('li').first().evaluate((li) => {
            const r = li.getBoundingClientRect(), t = li.querySelector('.tx').getBoundingClientRect(), b = li.querySelector('[data-onda^="repor_t"]').getBoundingClientRect();
            const f = document.querySelector('.mu-folha');
            return { h: Math.round(r.height), mesmaLinha: b.top < t.bottom && b.bottom > t.top, aDireita: b.left >= t.right - 1, dentro: b.right <= r.right + 1,
                ponto: getComputedStyle(li, '::before').content, larga: f.scrollWidth - f.clientWidth };
        });
        assert.ok(g.h < 80 && g.mesmaLinha && g.aDireita && g.dentro, JSON.stringify(g));
        assert.equal(g.ponto, 'none', 'as linhas de dentro não levam o ponto da história');
        assert.ok(g.larga <= 0, `a folha não fica mais larga que o ecrã (${g.larga})`);
        // ouvir uma das que saíram: o ▶ dela fica marcado
        await cmp.locator('li', { hasText: 'Teardrop' }).locator('[data-onda^="ouvir"]').click();
        await cmp.locator('li', { hasText: 'Teardrop' }).locator('.mu-ouvir.a-tocar[aria-pressed="true"]').waitFor();
        // voltar a pô-la: entra no fim (na app e no Tidal), sai das que saíram, e a lista continua aberta
        await cmp.locator('li', { hasText: 'Teardrop' }).getByRole('button', { name: 'Voltar a pôr «Teardrop»' }).click();
        await page.locator('#mu-aviso').getByText('Voltou a entrar, no fim da playlist.').waitFor();
        await page.waitForFunction(() => document.querySelectorAll('.mu-folha .mu-cmp li').length === 2);
        assert.equal(await hist.locator('.mu-cmp-n').innerText(), 'Das 5 do Tidal ficaram 3 · entraram 2 novas');
        assert.equal(await cmp.locator('summary').innerText(), 'Ouvir as 2 do Tidal que saíram');
        assert.equal(await cmp.evaluate((d) => d.open), true, 'a lista das que saíram continua aberta');
        assert.deepEqual(await naFolha(page), ['101', '105', '200', '201', '106']);
        assert.deepEqual(sim.listas['uuid-nova'].map((x) => x.id), ['101', '105', '200', '201', '106'], 'também no Tidal');
        // as linhas das que saíram não são linhas da playlist (sem arrastar para tirar, sem o ⇄)
        assert.equal(await cmp.locator('li[data-esq]').count(), 0);
        assert.deepEqual(erros.filter((x) => !/ERR_TUNNEL_CONNECTION_FAILED|ERR_NAME_NOT_RESOLVED|net::ERR_/.test(x)), [], 'sem erros');
        if (SHOTS) { await cmp.scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(SHOTS, 'tidal-maestro.png') }); }
    } finally { await ctx.close(); }
});

// Pedir com música de partida: procura-se no Tidal, escolhe-se, e a playlist nasce logo no Tidal com as parecidas; o
// pedido fica para o Maestro a rever com o texto. Sem música, «Pedir» fica como era
test('pedir com música de partida: procurar, escolher, criar já no Tidal; o Maestro revê-a com o pedido', { skip: !chromium && 'sem Playwright' }, async () => {
    await env.KV.put('codigo:ligacao', createHash('sha256').update('PARTIDA-1').digest('hex'));
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', hasTouch: true });
    try {
        const page = await ctx.newPage();
        const erros = [];
        page.on('pageerror', (e) => erros.push(String(e)));
        page.on('console', (m) => { if (m.type() === 'error') erros.push('consola: ' + m.text()); });
        await page.goto(`${APP}?proxy=${encodeURIComponent(WORKER)}`);
        await page.locator('[data-onda="cod"]').fill('PARTIDA-1');
        await page.getByRole('button', { name: 'Usar este código' }).click();
        await page.locator('#mu-body .mu-pl').first().waitFor();
        await page.evaluate(() => { window.musicaLeitor.play = () => Promise.resolve(); }); // (sem ir à rede no teste)
        const nav = (v) => page.locator(`#mu-nav [data-onda="ir\t${v}"]`).click();
        await nav(3);
        const corpo = page.locator('#mu-body');
        const texto = 'Jazz modal para a Carolina estudar';
        await corpo.locator('[data-onda="ptx"]').fill(texto);
        // sem música: o botão é o de sempre, logo a seguir ao texto
        assert.equal(await corpo.locator('[data-onda="pedir"]').innerText(), 'Pedir ao Maestro');
        const abrir = corpo.locator('details.mu-partida-d > summary');
        assert.equal(await abrir.innerText(), 'Começar por uma músicaopcional'.replace('músicaopcional', 'música\nopcional'));
        await abrir.click();
        await corpo.locator('details.mu-partida-d [data-onda="q"]').fill('So What');
        await corpo.locator('details.mu-partida-d').getByRole('button', { name: 'Procurar no Tidal' }).click();
        const resultado = corpo.locator('details.mu-partida-d .mu-xf li');
        await resultado.first().waitFor();
        assert.deepEqual(await resultado.locator('.tx b').allInnerTexts(), ['So What']);
        // cada resultado diz o álbum e o ano, e tem a capa e o ▶ (30 s), para se reconhecer a certa
        assert.match(await resultado.first().locator('.tx span').innerText(), /^Miles Davis · Álbum al1 · 1959$/);
        assert.equal(await resultado.first().locator('.cp img').count(), 1);
        await resultado.first().locator('[data-onda^="ouvir"]').click();
        await resultado.first().locator('.mu-ouvir.a-tocar[aria-pressed="true"]').waitFor();
        await resultado.first().getByRole('button', { name: 'Começar por «So What»' }).click();
        // a escolhida: um cartão com «Tirar»; o botão passa a criar já
        const escolhida = corpo.locator('.mu-partida');
        await escolhida.waitFor();
        assert.match(await escolhida.innerText(), /Começa por\s+«So What»\s+Miles Davis/);
        assert.equal(await corpo.locator('details.mu-partida-d').count(), 0);
        assert.equal(await corpo.locator('[data-onda="pedir"]').innerText(), 'Criar já no Tidal');
        assert.match(await corpo.locator('.mu-acoes + .mu-nota').first().innerText(), /^A playlist nasce já no teu Tidal com as parecidas da música de partida\./);
        assert.equal(await corpo.locator('[data-onda="ptx"]').inputValue(), texto, 'o texto fica');
        // «Tirar» volta à escolha; escolhe-se outra vez
        await escolhida.getByRole('button', { name: 'Não começar por «So What»' }).click();
        await corpo.locator('details.mu-partida-d').waitFor();
        assert.equal(await corpo.locator('[data-onda="pedir"]').innerText(), 'Pedir ao Maestro');
        await corpo.locator('details.mu-partida-d > summary').click();
        // «Pesquisar» no teclado (Enter) também procura
        await corpo.locator('details.mu-partida-d [data-onda="q"]').press('Enter');
        await resultado.first().getByRole('button', { name: 'Começar por «So What»' }).click();
        await escolhida.waitFor();
        const antes = sim.criadas.length;
        await corpo.locator('[data-onda="pedir"]').click();
        await page.locator('#mu-aviso').getByText(/^Já está no teu Tidal\. O Maestro/).waitFor();
        // a playlist está no Tidal e no cimo da lista, à espera da revisão; o pedido leva o texto
        assert.equal(sim.criadas.length, antes + 1);
        const ped = JSON.parse(await env.KV.get('pedidos')).find((x) => x.texto === texto);
        assert.ok(ped?.afinar?.rever, 'o pedido é uma revisão');
        const cartao = page.locator('#mu-body .mu-pl', { has: page.locator(`[data-onda="exp\t${ped.afinar.playlist}"]`) });
        await cartao.waitFor();
        assert.match(await cartao.innerText(), /Parecidas com So What[\s\S]*o Maestro vai revê-la/);
        const doc = JSON.parse(await env.KV.get('playlist:' + ped.afinar.playlist));
        assert.deepEqual([doc.pedido, doc.origem, doc.faixas[0].id], [texto, 'parecidas', '101']);
        // voltar a «Pedir»: a escolha e a procura ficaram esquecidas
        await nav(3);
        await corpo.locator('details.mu-partida-d').waitFor();
        assert.equal(await corpo.locator('.mu-partida').count(), 0);
        assert.equal(await corpo.locator('details.mu-partida-d').evaluate((d) => d.open), false);
        await corpo.locator('details.mu-partida-d > summary').click();
        assert.equal(await corpo.locator('details.mu-partida-d [data-onda="q"]').inputValue(), '');
        assert.deepEqual(erros.filter((x) => !/ERR_TUNNEL_CONNECTION_FAILED|ERR_NAME_NOT_RESOLVED|net::ERR_/.test(x)), [], 'sem erros');
        if (SHOTS) { await nav(3); await corpo.locator('details.mu-partida-d > summary').click(); await page.screenshot({ path: path.join(SHOTS, 'pedir-partida.png') }); }
    } finally { await ctx.close(); }
});

// A playlist na hora: a IA da Cloudflare escolhe as músicas de partida e a playlist nasce já. Liga-se em «Pedir» (ou nos
// Ajustes, onde também se desliga); sem ela, «Pedir» fica como era
test('playlist na hora: ligar em «Pedir», criar já com a IA da Cloudflare, desligar nos Ajustes', { skip: !chromium && 'sem Playwright' }, async () => {
    const t = JSON.parse(await env.KV.get('tidal:tokens'));
    delete t.iaCfEm;
    await env.KV.put('tidal:tokens', JSON.stringify(t));
    let pedidosIA = 0;
    env.AI = { run: async () => { pedidosIA++; return { response: '{"nome": "Modal ao fim do dia", "musicas": [{"artista": "Miles Davis", "titulo": "So What"}, {"artista": "Nina Simone", "titulo": "Feeling Good"}]}' }; } };
    await env.KV.put('codigo:ligacao', createHash('sha256').update('NAHORA-1').digest('hex'));
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', hasTouch: true });
    try {
        const page = await ctx.newPage();
        const erros = [];
        page.on('pageerror', (e) => erros.push(String(e)));
        page.on('console', (m) => { if (m.type() === 'error') erros.push('consola: ' + m.text()); });
        await page.goto(`${APP}?proxy=${encodeURIComponent(WORKER)}`);
        await page.locator('[data-onda="cod"]').fill('NAHORA-1');
        await page.getByRole('button', { name: 'Usar este código' }).click();
        await page.locator('#mu-body .mu-pl').first().waitFor();
        const nav = (v) => page.locator(`#mu-nav [data-onda="ir\t${v}"]`).click();
        const corpo = page.locator('#mu-body');
        await nav(3);
        const texto = 'Jazz modal para o fim do dia';
        await corpo.locator('[data-onda="ptx"]').fill(texto);
        assert.equal(await corpo.locator('[data-onda="pedir"]').innerText(), 'Pedir ao Maestro');
        // ligar em «Pedir»
        await corpo.getByRole('button', { name: 'Ligar a playlist na hora' }).click();
        await page.locator('#mu-aviso').getByText('Autorização guardada.').waitFor();
        await page.waitForFunction(() => document.querySelector('#mu-body [data-onda="pedir"]')?.innerText === 'Criar já no Tidal');
        assert.match(await corpo.locator('.mu-acoes + .mu-nota').first().innerText(), /^«Criar já»: a IA \(Mistral, na Cloudflare\) escolhe as músicas de partida e a playlist nasce já no teu Tidal; o Maestro \(Claude\) revê-a/);
        assert.equal(await corpo.getByRole('button', { name: 'Só o Maestro' }).count(), 1, 'e dá para escolher só o Maestro');
        assert.equal(await corpo.getByRole('button', { name: 'Ligar a playlist na hora' }).count(), 0);
        assert.equal(await corpo.locator('[data-onda="ptx"]').inputValue(), texto, 'o texto fica');
        assert.ok(JSON.parse(await env.KV.get('tidal:tokens')).iaCfEm, 'a autorização fica registada');
        // criar já: a playlist está no cimo da lista, com o nome que a IA deu, à espera da revisão do Maestro
        await corpo.locator('[data-onda="pedir"]').click();
        await page.locator('#mu-aviso').getByText(/^Já está no teu Tidal\. O Maestro/).waitFor();
        assert.equal(pedidosIA, 1);
        const ped = JSON.parse(await env.KV.get('pedidos')).find((x) => x.texto === texto);
        const cartao = page.locator('#mu-body .mu-pl', { has: page.locator(`[data-onda="exp\t${ped.afinar.playlist}"]`) });
        await cartao.waitFor();
        assert.match(await cartao.innerText(), /Modal ao fim do dia[\s\S]*o Maestro vai revê-la/);
        // desligar nos Ajustes
        await nav(5);
        const linha = corpo.locator('.mu-iacf');
        await linha.waitFor();
        assert.match(await linha.innerText(), /^Playlist na hora: ligada/);
        await linha.getByRole('button', { name: 'Desligar' }).click();
        await page.locator('#mu-aviso').getByText('A playlist na hora ficou desligada.').waitFor();
        await page.waitForFunction(() => /^Playlist na hora: desligada/.test(document.querySelector('#mu-body .mu-iacf')?.innerText || ''));
        assert.equal(JSON.parse(await env.KV.get('tidal:tokens')).iaCfEm, undefined);
        // desligada: «Pedir» volta a ser como era
        await nav(3);
        assert.equal(await corpo.locator('[data-onda="pedir"]').innerText(), 'Pedir ao Maestro');
        assert.deepEqual(erros.filter((x) => !/ERR_TUNNEL_CONNECTION_FAILED|ERR_NAME_NOT_RESOLVED|net::ERR_/.test(x)), [], 'sem erros');
        if (SHOTS) { await page.screenshot({ path: path.join(SHOTS, 'pedir-na-hora.png') }); }
    } finally { await ctx.close(); delete env.AI; }
});

// Arrumar a lista: pôr uma playlist numa pasta (no «⋯»), a IA sugerir as pastas das outras, o guia para fazer o mesmo
// no Tidal (à mão: o Tidal não deixa as apps de fora mexer nas pastas) e juntar apagando as originais
test('pastas: pôr numa pasta, a IA sugere as outras, o guia para o Tidal; juntar e apagar as originais', { skip: !chromium && 'sem Playwright' }, async () => {
    const t = JSON.parse(await env.KV.get('tidal:tokens'));
    t.iaCfEm = new Date().toISOString();
    await env.KV.put('tidal:tokens', JSON.stringify(t));
    // a IA de faz-de-conta: as playlists alternadas entre «Carro» e «Dormir»
    env.AI = { run: async (modelo, entrada) => {
        const ids = entrada.messages[1].content.split('\n').map((l) => l.split(' | ')[0]);
        return { response: JSON.stringify({ pastas: [{ nome: 'Carro', ids: ids.filter((x, i) => i % 2) }, { nome: 'Dormir', ids: ids.filter((x, i) => !(i % 2)) }] }) };
    } };
    await env.KV.put('codigo:ligacao', createHash('sha256').update('PASTAS-1').digest('hex'));
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', hasTouch: true });
    try {
        const page = await ctx.newPage();
        const erros = [];
        page.on('pageerror', (e) => erros.push(String(e)));
        page.on('console', (m) => { if (m.type() === 'error') erros.push('consola: ' + m.text()); });
        await page.goto(`${APP}?proxy=${encodeURIComponent(WORKER)}`);
        await page.locator('[data-onda="cod"]').fill('PASTAS-1');
        await page.getByRole('button', { name: 'Usar este código' }).click();
        const corpo = page.locator('#mu-body');
        await corpo.locator('.mu-grp .mu-pl').first().waitFor();
        // cada cartão diz o que é
        const origens = await corpo.locator('.mu-grp .mu-pl .or').allInnerTexts();
        assert.ok(origens.length > 3 && origens.every((x) => x.length > 5), 'todos os cartões dizem de onde vêm');
        // as tuas pastas: criam-se no painel, mesmo vazias
        const painel = corpo.locator('details.mu-pastas-ed');
        await painel.locator('summary').click();
        for (const p of ['Carro', 'Dormir']) {
            await painel.locator('[data-onda="pa-nome"]').fill(p);
            await painel.getByRole('button', { name: 'Criar', exact: true }).click();
            await page.locator('#mu-aviso').getByText(`Pasta «${p}» criada.`).waitFor();
        }
        await page.waitForFunction(() => document.querySelectorAll('#mu-body .mu-pastas-ed .mu-pasta-x').length === 2);
        assert.deepEqual((await painel.locator('.mu-pasta-x').allInnerTexts()).map((x) => x.replace(/\s+/g, ' ').trim()), ['Carro 0 ×', 'Dormir 0 ×'], 'as duas, vazias');
        // pôr a primeira numa delas (no «⋯»: as tuas pastas)
        const primeira = corpo.locator('.mu-grp .mu-pl').first();
        const nome = (await primeira.locator('.nm').innerText()).trim();
        await primeira.locator('.mu-pl-a').click();
        await page.locator('.mu-folha [data-onda="menu"]').click();
        await page.locator('.mu-folha').getByRole('button', { name: 'Pôr numa pasta' }).click();
        assert.deepEqual(await page.locator('.mu-folha .mu-pasta-l .mu-chip-f').allInnerTexts(), ['Carro', 'Dormir']);
        await page.locator('.mu-folha .mu-pasta-l').getByRole('button', { name: 'Carro' }).click();
        await page.locator('#mu-aviso').getByText('Na pasta «Carro».').waitFor();
        await page.locator('.mu-folha .mu-fechar').click();
        await page.waitForFunction(() => !document.querySelector('.mu-folha'));
        // a lista arruma-se: as pastas primeiro; e há o filtro da pasta
        await page.waitForFunction(() => /^Carro 1$/.test(document.querySelector('#mu-body .mu-grp h2')?.innerText || ''));
        assert.equal((await corpo.locator('.mu-grp').first().locator('.mu-pl .nm').innerText()).trim(), nome);
        assert.equal(await corpo.locator('.mu-filtros .mu-chip-f', { hasText: /^Carro 1$/ }).count(), 1);
        // a IA arruma as outras nas minhas pastas (a que já tinha pasta fica onde estava)
        if (!(await painel.evaluate((d) => d.open))) await painel.locator('summary').click();
        await painel.getByRole('button', { name: 'Arrumar nas minhas pastas' }).click();
        await page.locator('#mu-aviso').getByText(/^Arrumei \d+ playlists em pastas\.$/).waitFor();
        await page.waitForFunction(() => [...document.querySelectorAll('#mu-body .mu-grp h2')].every((h) => /^(Carro|Dormir) \d+$/.test(h.innerText)));
        assert.equal(await painel.getByRole('button', { name: 'Arrumar nas minhas pastas' }).count(), 0, 'já está tudo em pastas');
        assert.equal(await corpo.locator('.mu-grp').first().locator('.mu-pl .nm').first().innerText(), nome, 'a que tinha pasta ficou em «Carro»');
        // tudo arrumado: o guia para fazer o mesmo no Tidal (sem as que só estão na app)
        const guia = corpo.locator('details.mu-tidal-pastas');
        await guia.locator('summary').click();
        assert.equal(await guia.locator('summary').innerText(), 'Fazer as mesmas pastas no Tidal');
        const linhas = await guia.locator('li').allInnerTexts();
        assert.deepEqual(linhas.map((l) => l.split(':')[0]).sort(), ['Carro', 'Dormir']);
        assert.ok(linhas.find((l) => l.startsWith('Carro:')).includes(nome));
        // tirar da pasta
        await corpo.locator('.mu-grp').first().locator('.mu-pl-a').first().click();
        await page.locator('.mu-folha [data-onda="menu"]').click();
        await page.locator('.mu-folha').getByRole('button', { name: 'Pasta: Carro' }).click();
        await page.locator('.mu-folha').getByRole('button', { name: 'Tirar da pasta' }).click();
        await page.locator('#mu-aviso').getByText('Saiu da pasta.').waitFor();
        await page.locator('.mu-folha .mu-fechar').click();
        await page.waitForFunction(() => !document.querySelector('.mu-folha'));
        // apagar uma pasta (no painel): as playlists dela ficam sem pasta
        if (!(await painel.evaluate((d) => d.open))) await painel.locator('summary').click();
        await painel.getByRole('button', { name: 'Apagar a pasta «Dormir»' }).click();
        await page.locator('#mu-aviso').getByText('Pasta apagada; as playlists dela ficaram sem pasta.').waitFor();
        await page.waitForFunction(() => ![...document.querySelectorAll('#mu-body .mu-grp h2')].some((h) => /^Dormir /.test(h.innerText)));
        // juntar e apagar as originais: a nova fica, as duas escolhidas saem
        await corpo.locator('.mu-lista-topo').getByRole('button', { name: 'Juntar', exact: true }).click();
        const esc = corpo.locator('.mu-pl-esc');
        const n1 = (await esc.nth(0).locator('.nm').innerText()).trim(), n2 = (await esc.nth(1).locator('.nm').innerText()).trim();
        const id1 = (await esc.nth(0).getAttribute('data-onda')).split('\t')[1], id2 = (await esc.nth(1).getAttribute('data-onda')).split('\t')[1];
        await esc.nth(0).click();
        await esc.nth(1).click();
        await corpo.locator('.mu-juntar-barra').getByRole('button', { name: 'Juntar e apagar as originais' }).click();
        await page.locator('#mu-aviso').getByText(/As originais foram apagadas\.$/).waitFor();
        // (pelo id: pode haver outras com o mesmo nome)
        await page.waitForFunction(([a, b]) => !document.querySelector(`#mu-body [data-onda="exp\t${a}"], #mu-body [data-onda="exp\t${b}"]`), [id1, id2]);
        assert.equal(JSON.parse(await env.KV.get('playlists')).filter((x) => x.id === id1 || x.id === id2).length, 0, 'saíram da app');
        assert.equal(await corpo.locator('.mu-pl .nm', { hasText: `${n1} + ${n2}`.slice(0, 40) }).count() >= 1, true, 'a nova está na lista');
        assert.deepEqual(erros.filter((x) => !/ERR_TUNNEL_CONNECTION_FAILED|ERR_NAME_NOT_RESOLVED|net::ERR_/.test(x)), [], 'sem erros');
        if (SHOTS) { await page.evaluate(() => window.scrollTo(0, 0)); await page.screenshot({ path: path.join(SHOTS, 'pastas.png') }); }
    } finally { await ctx.close(); delete env.AI; }
});

// A IA da playlist na hora, escolhida por cada pessoa nos Ajustes: a Mistral da Cloudflare ou a Mistral avançada (a
// conta Mistral da própria pessoa: a chave cola-se uma vez, confirma-se na Mistral e nunca volta a aparecer)
test('a IA de cada pessoa: ligar a conta Mistral nos Ajustes (chave errada, chave boa), escolher, voltar à da Cloudflare e desligar', { skip: !chromium && 'sem Playwright' }, async () => {
    const t = JSON.parse(await env.KV.get('tidal:tokens'));
    t.iaCfEm = new Date().toISOString();
    delete t.iaMistralEm;
    await env.KV.put('tidal:tokens', JSON.stringify(t));
    await env.KV.delete('mistral:chave');
    env.AI = { run: async () => ({ response: '{"nome": "X", "musicas": [{"artista": "Miles Davis", "titulo": "So What"}]}' }) };
    sim.mistralBoas = ['mkUiBoaChave1234567890ab'];
    await env.KV.put('codigo:ligacao', createHash('sha256').update('MISTRAL-1').digest('hex'));
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', hasTouch: true });
    try {
        const page = await ctx.newPage();
        const erros = [];
        page.on('pageerror', (e) => erros.push(String(e)));
        page.on('console', (m) => { if (m.type() === 'error') erros.push('consola: ' + m.text()); });
        await page.goto(`${APP}?proxy=${encodeURIComponent(WORKER)}`);
        await page.locator('[data-onda="cod"]').fill('MISTRAL-1');
        await page.getByRole('button', { name: 'Usar este código' }).click();
        await page.locator('#mu-body .mu-pl').first().waitFor();
        const nav = (v) => page.locator(`#mu-nav [data-onda="ir\t${v}"]`).click();
        const corpo = page.locator('#mu-body');
        await nav(5);
        const esc = corpo.locator('.mu-ia-esc');
        await esc.waitFor();
        assert.equal(await esc.getByRole('button', { name: 'Mistral da Cloudflare' }).getAttribute('aria-pressed'), 'true', 'por omissão, a da Cloudflare');
        // a avançada, sem a conta ligada: aparece o «Liga a tua conta Mistral»
        await esc.getByRole('button', { name: 'Mistral avançada' }).click();
        const liga = corpo.locator('.mu-mistral');
        await liga.waitFor();
        await liga.locator('[data-onda="mi-chave"]').fill('mkErradaChave1234567890');
        await liga.getByRole('button', { name: 'Ligar' }).click();
        await page.locator('#mu-aviso').getByText('A Mistral não aceitou esta chave. Confirma que a copiaste toda.').waitFor();
        await liga.locator('[data-onda="mi-chave"]').fill('mkUiBoaChave1234567890ab');
        await liga.getByRole('button', { name: 'Ligar' }).click();
        await page.locator('#mu-aviso').getByText('Conta Mistral ligada: a playlist na hora passa a usá-la.').waitFor();
        await page.waitForFunction(() => document.querySelector('#mu-body .mu-ia-esc [data-onda="ia_mi\t1"]')?.getAttribute('aria-pressed') === 'true');
        await corpo.getByRole('button', { name: 'Desligar a conta Mistral' }).waitFor();
        assert.equal(await env.KV.get('mistral:chave'), 'mkUiBoaChave1234567890ab');
        assert.ok(!(await page.content()).includes('mkUiBoaChave'), 'a chave nunca volta à app');
        // «Pedir» diz que IA vai começar
        await nav(3);
        await corpo.locator('[data-onda="ptx"]').fill('Jazz modal');
        assert.match(await corpo.locator('.mu-acoes + .mu-nota').first().innerText(), /^«Criar já»: a IA \(Mistral avançada, a tua conta\)/);
        // voltar à da Cloudflare (a conta fica ligada) e desligar a conta
        await nav(5);
        await corpo.locator('.mu-ia-esc').getByRole('button', { name: 'Mistral da Cloudflare' }).click();
        await page.locator('#mu-aviso').getByText('A playlist na hora passa a usar a Mistral da Cloudflare.').waitFor();
        await corpo.getByRole('button', { name: 'Desligar a conta Mistral' }).click();
        await page.locator('#mu-aviso').getByText('Conta Mistral desligada.').waitFor();
        await page.waitForFunction(() => ![...document.querySelectorAll('#mu-body button')].some((b) => b.innerText === 'Desligar a conta Mistral'));
        assert.equal(await env.KV.get('mistral:chave'), null);
        for (let i = erros.length - 1; i >= 0; i--) if (/status of 400/.test(erros[i])) erros.splice(i, 1); // (o 400 da chave errada é o esperado)
        assert.deepEqual(erros.filter((x) => !/ERR_TUNNEL_CONNECTION_FAILED|ERR_NAME_NOT_RESOLVED|net::ERR_/.test(x)), [], 'sem erros');
    } finally { await ctx.close(); delete env.AI; }
});
