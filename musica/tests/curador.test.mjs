// A tarefa agendada de ponta a ponta: o Worker num servidor local (Tidal simulado, KV em memória) e os scripts
// dados.mjs e publicar.mjs a correr a sério contra ele, como na tarefa agendada.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import worker from '../proxy/src/worker.js';
import { simulador, kv } from './simulador.mjs';

const correr = promisify(execFile);
const RAIZ = new URL('..', import.meta.url).pathname;
let servidor, base, env, sim;
const CHAVE = 'chave-do-agente-para-os-testes-0123456789';

before(async () => {
    sim = simulador();
    globalThis.fetch = sim.fetch; // o Worker fala com o Tidal simulado; os scripts (outros processos) falam com o Worker
    env = { KV: kv(), TIDAL_CLIENT_ID: 'CLIENTE' };
    servidor = createServer(async (req, res) => {
        const corpo = await new Promise((ok) => { const b = []; req.on('data', (c) => b.push(c)); req.on('end', () => ok(Buffer.concat(b))); });
        const r = await worker.fetch(new Request(base + req.url, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : corpo }), env, { waitUntil() {} });
        res.writeHead(r.status, Object.fromEntries(r.headers));
        res.end(Buffer.from(await r.arrayBuffer()));
    });
    await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
    base = `http://127.0.0.1:${servidor.address().port}`;
});
after(() => servidor.close());

const script = (nome, args, { semChave = false } = {}) => correr(process.execPath, [join(RAIZ, 'curador', nome), ...args],
    // sem chave: e uma conta Cloudflare que não existe, para nunca ir à KV verdadeira
    { env: { ...process.env, MUSICA_WORKER: base, ...(semChave ? { MUSICA_CHAVE: '', CF_ACCOUNT_ID: 'conta-de-teste' } : { MUSICA_CHAVE: CHAVE }) }, timeout: 60000 })
    .catch((e) => ({ stdout: e.stdout, stderr: e.stderr, code: e.code }));

test('sem Tidal ligado (e ainda sem chave do agente): os dados dizem para terminar', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'musica-'));
    const r = await script('dados.mjs', [dir], { semChave: true });
    assert.equal(r.code, undefined, r.stderr);
    assert.match(r.stdout, /Tidal não ligado/);
    assert.match(readFileSync(join(dir, 'dados.md'), 'utf8'), /Termina aqui/);
});

test('dados → proposta → ensaio → publicar com pedido', async () => {
    const { createHash } = await import('node:crypto');
    await env.KV.put('tidal:tokens', JSON.stringify({ access: 'AT1', refresh: 'RT1', expira: Date.now() + 3600e3, utilizador: 'nelson', pais: 'PT' }));
    await env.KV.put('chaves', JSON.stringify({ [createHash('sha256').update(CHAVE).digest('hex')]: { tipo: 'agente', nome: 'Curador' } }));
    await env.KV.put('pedidos', JSON.stringify([{ id: 'q1abc', texto: 'Jazz e soul para o carro', opcoes: { faixas: 5, maxArtista: 1, estilo: 'audiofilo', arco: 'onda' }, estado: 'pendente', criadoEm: new Date().toISOString() }]));
    const dir = mkdtempSync(join(tmpdir(), 'musica-'));

    const d = await script('dados.mjs', [dir]);
    assert.equal(d.code, undefined, d.stderr);
    const md = readFileSync(join(dir, 'dados.md'), 'utf8');
    assert.match(md, /Conta Tidal: \*\*nelson\*\* \(PT\)/);
    assert.match(md, /`q1abc` — «Jazz e soul para o carro» · 5 faixas, máx\. 1 por artista, estilo audiofilo/);
    assert.match(md, /Miles Davis — So What · 1959 · Hi-Res · 136 bpm · 7A · Jazz/);
    assert.match(md, /Ainda não há nenhuma — \*\*cria a primeira\*\*/);
    // as novidades dos artistas que segues e as tuas mixes do Tidal, com o id do Tidal
    assert.match(md, /- \d{4}-\d{2}-\d{2} · Nina Simone — «Disco novo»/);
    assert.match(md, /- `102` Nina Simone — Feeling Good/);
    assert.match(md, /### Descoberta\n- `106` Massive Attack — Teardrop/);
    assert.match(md, /### Diária\n- `101` Miles Davis — So What/);
    assert.ok(JSON.parse(readFileSync(join(dir, 'perfil.json'), 'utf8')).favoritas.length >= 3);

    const proposta = {
        nome: 'Jazz e soul para o carro', descricao: 'Gravações que mostram o som.', resumo: 'Tens ouvido jazz modal e soul dos anos 60; aqui vai uma seleção com gravações de referência, para o carro.',
        tendencias: ['Reedição de Kind of Blue em Hi-Res'], opcoes: { faixas: 5, maxArtista: 1, estilo: 'audiofilo', arco: 'onda' },
        candidatas: [
            { artista: 'Miles Davis', titulo: 'So What', ano: 1959, genero: 'jazz', nota: 98, energia: 40, motivo: 'Referência de gravação: Kind of Blue.' },
            { artista: 'Nina Simone', titulo: 'Feeling Good', ano: 1965, genero: 'soul', nota: 95, energia: 50, motivo: 'A voz e os metais, sem truques.' },
            { artista: 'Daft Punk', titulo: 'Get Lucky', ano: 2013, genero: 'disco', nota: 88, energia: 80, motivo: 'Produção impecável, ótima para testar graves.' },
            { artista: 'Amália Rodrigues', titulo: 'Barco Negro', ano: 1955, genero: 'fado', nota: 93, energia: 35, motivo: 'Fado essencial.' },
            { artista: 'Miles Davis', titulo: 'Faixa 3', ano: 1959, genero: 'jazz', nota: 80, energia: 45, motivo: 'Mais Miles.' },
            { artista: 'Ninguém', titulo: 'Não existe', ano: 2020, genero: 'pop', nota: 70, energia: 50, motivo: 'Não está no Tidal.' },
            { artista: 'Faixa Fantasma', titulo: 'Também não', ano: 2021, genero: 'rock', nota: 60, energia: 50, motivo: 'Também não.' },
        ],
    };
    writeFileSync(join(dir, 'proposta.json'), JSON.stringify(proposta));
    // só 4 artistas encontrados para 5 faixas com máx. 1 por artista → recusa e explica
    const curto = await script('publicar.mjs', [join(dir, 'proposta.json'), '--ensaio']);
    assert.match(curto.stderr, /só conseguiu 4 de 5/);
    assert.match(curto.stdout, /Encontradas no Tidal: 5 de 7 · não encontradas: Ninguém — Não existe; Faixa Fantasma — Também não/);

    proposta.candidatas.push({ artista: 'Massive Attack', titulo: 'Teardrop', ano: 1998, genero: 'trip-hop', nota: 94, energia: 30, motivo: 'Graves profundos e espaço: teste de som clássico.' });
    writeFileSync(join(dir, 'proposta.json'), JSON.stringify(proposta));
    const ensaio = await script('publicar.mjs', [join(dir, 'proposta.json'), '--ensaio']);
    assert.equal(ensaio.code, undefined, ensaio.stderr);
    assert.match(ensaio.stdout, /«Jazz e soul para o carro» — 5 faixas/);
    assert.match(ensaio.stdout, /ensaio: nada gravado/);
    assert.equal(sim.criadas.length, 0);

    const pub = await script('publicar.mjs', [join(dir, 'proposta.json'), '--pedido', 'q1abc', '--modelo', 'modelo-teste']);
    assert.equal(pub.code, undefined, pub.stderr);
    assert.match(pub.stdout, /no Tidal: https:\/\/tidal\.com\/browse\/playlist\/uuid-nova · pedido q1abc feito/);
    assert.equal(sim.criadas.length, 1);
    assert.equal(sim.criadas[0].name, 'Jazz e soul para o carro');
    assert.equal(sim.itens.length, 5);
    assert.equal(new Set(sim.itens).size, 5);
    const idx = JSON.parse(await env.KV.get('playlists'));
    const doc = JSON.parse(await env.KV.get('playlist:' + idx[0].id));
    assert.equal(doc.por, 'curador');
    assert.equal(doc.modelo, 'modelo-teste');
    assert.deepEqual(doc.faixas.map((f) => f.id), sim.itens, 'a ordem do motor é a do Tidal');
    assert.ok(doc.faixas.every((f) => f.motivo && f.porque && f.pontos > 0));
    assert.equal(doc.candidatas.length, 6, 'as candidatas encontradas ficam para afinar na app');
    assert.ok(doc.candidatas[0].sinais && doc.candidatas[0].faixa);
    assert.equal(JSON.parse(await env.KV.get('pedidos'))[0].estado, 'feito');
    assert.equal(JSON.parse(await env.KV.get('pedidos'))[0].playlist, doc.id);
});
