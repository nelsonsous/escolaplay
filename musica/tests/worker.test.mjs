// Rotas do Worker com o Tidal e a KV simulados: ligação (código + PKCE), gosto, encontrar faixas,
// criar playlists no Tidal, renovar o token e pedidos ao Maestro.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import worker from '../proxy/src/worker.js';
import { simulador, kv } from './simulador.mjs';
import { b64u, b64uDecode } from '../proxy/src/push.js';

const ORIGIN = 'https://musica.example.workers.dev';
const sha = (s) => createHash('sha256').update(s).digest('hex');
const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

let env, sim;
// (o que o Worker deixa a correr depois de responder fica aqui: `await depois()` espera por tudo)
const pendentes = [];
const ctx = { waitUntil(p) { pendentes.push(Promise.resolve(p)); } };
const depois = async () => { while (pendentes.length) await pendentes.shift(); };
beforeEach(() => {
    env = { KV: kv(), TIDAL_CLIENT_ID: 'CLIENTE', APP_URL: 'https://nelsonsous.github.io/escolaplay/musica/' };
    sim = simulador();
    globalThis.fetch = sim.fetch;
});
const call = (path, init = {}) => worker.fetch(new Request(ORIGIN + path, init), env, ctx);
const post = (path, body, chave) => call(path, { method: 'POST', headers: { 'content-type': 'application/json', ...(chave ? { authorization: `Bearer ${chave}` } : {}) }, body: JSON.stringify(body) });
const get = (path, chave) => call(path, { headers: chave ? { authorization: `Bearer ${chave}` } : {} });

// liga o Tidal pela primeira vez (código de ligação) e devolve a chave do aparelho
async function ligarPrimeiraVez() {
    await env.KV.put('codigo:ligacao', sha('LIGAR-123'));
    const r = await post('/api/ligar', { codigo: 'LIGAR-123', nome: 'iPhone' });
    assert.equal(r.status, 200);
    const u = new URL((await r.json()).url);
    const state = u.searchParams.get('state');
    const ret = await call(`/tidal/retorno?code=CODIGO-BOM&state=${state}`);
    assert.equal(ret.status, 302);
    const loc = ret.headers.get('location');
    assert.match(loc, /^https:\/\/nelsonsous\.github\.io\/escolaplay\/musica\/#chave=/);
    return { chave: decodeURIComponent(loc.split('#chave=')[1]), u };
}

test('estado, CORS, raiz e pedidos sem chave', async () => {
    const r = await get('/api/estado');
    assert.equal(r.status, 200);
    assert.deepEqual(await r.json(), { versao: '1.24.0', clientId: true, ligado: false, retorno: ORIGIN + '/tidal/retorno' });
    assert.equal(r.headers.get('access-control-allow-origin'), '*');
    const pre = await call('/api/perfil', { method: 'OPTIONS' });
    assert.equal(pre.status, 204);
    assert.match(pre.headers.get('access-control-allow-headers'), /authorization/);
    const raiz = await call('/');
    assert.equal(raiz.status, 302);
    assert.equal(raiz.headers.get('location'), env.APP_URL);
    for (const p of ['/api/perfil', '/api/playlists', '/api/pedidos']) assert.equal((await get(p)).status, 401, p);
    assert.equal((await get('/api/perfil', 'chave-que-nao-existe-de-todo-1234')).status, 401);
    assert.equal((await get('/nada')).status, 404);
});

test('ligar: sem Client ID, sem código, código errado', async () => {
    delete env.TIDAL_CLIENT_ID;
    assert.equal((await post('/api/ligar', {})).status, 409);
    env.TIDAL_CLIENT_ID = 'CLIENTE';
    assert.equal((await post('/api/ligar', {})).status, 401);
    await env.KV.put('codigo:ligacao', sha('LIGAR-123'));
    assert.equal((await post('/api/ligar', { codigo: 'outro' })).status, 401);
});

test('Client ID: posto na app com o código de ligação (sem o gastar) ou com a chave do aparelho', async () => {
    delete env.TIDAL_CLIENT_ID;
    assert.equal((await (await get('/api/estado')).json()).clientId, false);
    await env.KV.put('codigo:ligacao', sha('LIGAR-123'));
    assert.equal((await post('/api/config', { clientId: 'ABCdef123456' })).status, 401);
    assert.equal((await post('/api/config', { codigo: 'outro', clientId: 'ABCdef123456' })).status, 401);
    assert.equal((await post('/api/config', { codigo: 'LIGAR-123', clientId: 'x y' })).status, 400);
    assert.equal((await post('/api/config', { codigo: 'LIGAR-123', clientId: 'ABCdef123456' })).status, 200);
    assert.equal((await (await get('/api/estado')).json()).clientId, true);
    assert.ok(await env.KV.get('codigo:ligacao'), 'o código continua a servir para ligar');
    const r = await post('/api/ligar', { codigo: 'LIGAR-123' });
    assert.equal(new URL((await r.json()).url).searchParams.get('client_id'), 'ABCdef123456');
});

test('ligar: PKCE S256, troca do código, chave do aparelho e do agente; o código só serve uma vez', async () => {
    const { chave, u } = await ligarPrimeiraVez();
    assert.equal(u.origin + u.pathname, 'https://login.tidal.com/authorize');
    assert.equal(u.searchParams.get('client_id'), 'CLIENTE');
    assert.equal(u.searchParams.get('response_type'), 'code');
    assert.equal(u.searchParams.get('code_challenge_method'), 'S256');
    assert.equal(u.searchParams.get('redirect_uri'), ORIGIN + '/tidal/retorno');
    assert.match(u.searchParams.get('scope'), /playlists\.write/);
    // o verificador enviado na troca corresponde ao desafio do pedido de autorização
    const troca = sim.tokenBodies.find((b) => b.grant_type === 'authorization_code');
    assert.equal(b64url(createHash('sha256').update(troca.code_verifier).digest()), u.searchParams.get('code_challenge'));
    assert.equal(troca.client_id, 'CLIENTE');
    assert.equal(troca.client_secret, undefined, 'PKCE: sem segredo');
    const t = await env.KV.get('tidal:tokens', 'json');
    assert.equal(t.access, 'AT1');
    assert.equal(t.utilizador, 'nelson');
    assert.equal(t.pais, 'PT');
    assert.ok(await env.KV.get('agente:chave'), 'cria a chave do agente');
    assert.equal(await env.KV.get('codigo:ligacao'), null, 'o código gasta-se');
    const e = await (await get('/api/estado', chave)).json();
    assert.equal(e.ligado, true);
    assert.equal(e.utilizador, 'nelson');
    assert.equal(e.tu, 'aparelho');
    const ag = await (await get('/api/estado', await env.KV.get('agente:chave'))).json();
    assert.equal(ag.tu, 'agente');
    // o mesmo código já não liga outra vez; com a chave do aparelho volta a ligar sem código
    assert.equal((await post('/api/ligar', { codigo: 'LIGAR-123' })).status, 401);
    const r2 = await post('/api/ligar', {}, chave);
    assert.equal(r2.status, 200);
    const st = new URL((await r2.json()).url).searchParams.get('state');
    const ret2 = await call(`/tidal/retorno?code=CODIGO-BOM&state=${st}`);
    assert.match(ret2.headers.get('location'), /#ligado=1$/);
    // estado desconhecido ou recusado
    assert.match((await call('/tidal/retorno?code=X&state=nao-existe')).headers.get('location'), /#erro=/);
    assert.match((await call('/tidal/retorno?error=access_denied')).headers.get('location'), /#erro=access_denied/);
});

test('perfil: favoritas com artistas, álbum, géneros e tom; artistas seguidos; playlists; resumo', async () => {
    const { chave } = await ligarPrimeiraVez();
    const p = await (await get('/api/perfil', chave)).json();
    assert.equal(p.favoritas.length, 3);
    const so = p.favoritas.find((f) => f.id === '101');
    assert.deepEqual(so.artistas, ['Miles Davis']);
    assert.equal(so.ano, 1959);
    assert.equal(so.bpm, 136);
    assert.equal(so.tom, 7, 'Ré dórico conta como Ré menor → 7A');
    assert.equal(so.duracao, 562);
    assert.deepEqual(so.generos, ['Jazz']);
    assert.ok(so.tags.includes('HIRES_LOSSLESS'));
    assert.equal(so.adicionada, '2026-10-01T00:00:00Z');
    assert.deepEqual(p.artistas, [{ id: 'a2', nome: 'Nina Simone' }]);
    assert.equal(p.playlists[0].nome, 'Jazz de domingo');
    assert.equal(p.resumo.decadas[0].decada, 1950);
    // fica em cache: o segundo pedido não vai ao Tidal
    const antes = sim.chamadas.length;
    await get('/api/perfil', chave);
    assert.equal(sim.chamadas.length, antes);
    await get('/api/perfil?fresco=1', chave);
    assert.ok(sim.chamadas.length > antes);
});

test('resolver: encontra a versão de estúdio, ignora o que não existe, respeita o lote', async () => {
    const { chave } = await ligarPrimeiraVez();
    const r = await post('/api/resolver', { faixas: [{ artista: 'Daft Punk', titulo: 'Get Lucky' }, { artista: 'Ninguém', titulo: 'Não existe' }, { artista: 'Nina Simone', titulo: 'Feeling Good' }] }, chave);
    assert.equal(r.status, 200);
    const { faixas } = await r.json();
    assert.equal(faixas[0].id, '103', 'a de estúdio, não a ao vivo');
    assert.equal(faixas[0].tom, 11, 'Fá# menor → 11A');
    assert.equal(faixas[1], null);
    assert.equal(faixas[2].id, '102');
    assert.equal(faixas[2].ano, 1965);
    const pesquisas = sim.chamadas.filter((c) => c.includes('/searchResults'));
    assert.equal(pesquisas.length, 3);
    assert.match(pesquisas[0], /^GET \/v2\/searchResults\?/);
    assert.match(pesquisas[0], /filter%5Bquery%5D=Daft\+Punk\+Get\+Lucky/);
    assert.match(pesquisas[0], /countryCode=PT/);
    // por id, sem pesquisar; e o limite do lote
    sim.chamadas = [];
    const porId = await (await post('/api/resolver', { faixas: [{ tidalId: '105' }] }, chave)).json();
    assert.equal(porId.faixas[0].titulo, 'Barco Negro');
    assert.equal(sim.chamadas.filter((c) => c.includes('/searchResults')).length, 0);
    assert.equal((await post('/api/resolver', { faixas: Array.from({ length: 11 }, () => ({ artista: 'a', titulo: 'b' })) }, chave)).status, 400);
    assert.equal((await post('/api/resolver', { faixas: [] }, chave)).status, 400);
    const ps = await (await get('/api/pesquisa?q=feeling%20good', chave)).json();
    assert.equal(ps.faixas[0].id, '102');
    assert.equal((await get('/api/pesquisa?q=a', chave)).status, 400);
});

test('playlists: guardar e criar no Tidal pela ordem, em lotes de 50; biblioteca; reenviar; apagar', async () => {
    const { chave } = await ligarPrimeiraVez();
    const agente = await env.KV.get('agente:chave');
    const faixas = Array.from({ length: 60 }, (_, i) => ({ id: String(200 + i), titulo: `Faixa ${i}`, artistas: ['Miles Davis'], duracao: 180, motivo: 'porque sim', porque: 'claude', pontos: 800 }));
    const r = await post('/api/playlists', { nome: 'Jazz de 59', descricao: 'Um ano de ouro.', resumo: 'Resumo.', faixas, tidal: true, opcoes: { faixas: 60 } }, agente);
    assert.equal(r.status, 201);
    const d = await r.json();
    assert.equal(d.por, 'curador');
    assert.equal(d.tidal.url, 'https://tidal.com/browse/playlist/uuid-nova');
    assert.deepEqual(sim.criadas[0], { name: 'Jazz de 59', description: 'Um ano de ouro.', accessType: 'UNLISTED' });
    assert.deepEqual(sim.itens, faixas.map((f) => f.id), 'todas, pela ordem');
    assert.equal(sim.chamadas.filter((c) => /relationships\/items$/.test(c) && c.startsWith('POST')).length, 2);
    const idx = await (await get('/api/playlists', chave)).json();
    assert.equal(idx[0].id, d.id);
    assert.equal(idx[0].faixas, 60);
    assert.equal(idx[0].duracao, 10800);
    assert.equal((await (await get('/api/playlists/' + d.id, chave)).json()).faixas.length, 60);
    assert.equal((await post(`/api/playlists/${d.id}/tidal`, {}, chave)).status, 409, 'já está no Tidal');
    // da app, só na biblioteca; depois para o Tidal
    const s = await (await post('/api/playlists', { nome: 'Só cá', faixas: faixas.slice(0, 3) }, chave)).json();
    assert.equal(s.por, 'app');
    assert.equal(s.tidal, null);
    const e = await (await post(`/api/playlists/${s.id}/tidal`, { faixas: faixas.slice(0, 2) }, chave)).json();
    assert.equal(e.tidal.faixas, 2);
    assert.equal((await call('/api/playlists/' + s.id, { method: 'DELETE', headers: { authorization: `Bearer ${chave}` } })).status, 200);
    assert.equal((await get('/api/playlists/' + s.id, chave)).status, 404);
    assert.deepEqual(sim.apagadas, [], 'sem ?tidal=1, o Tidal fica como está');
    // apagar também no Tidal
    assert.equal((await call(`/api/playlists/${d.id}?tidal=1`, { method: 'DELETE', headers: { authorization: `Bearer ${chave}` } })).status, 200);
    assert.deepEqual(sim.apagadas, ['uuid-nova']);
    assert.equal((await get('/api/playlists/' + d.id, chave)).status, 404);
    assert.ok(!(await (await get('/api/playlists', chave)).json()).some((x) => x.id === d.id));
    // validação
    assert.equal((await post('/api/playlists', { nome: 'x', faixas: [{ id: 'abc' }] }, chave)).status, 400);
    assert.equal((await post('/api/playlists', { faixas }, chave)).status, 400);
});

test('token: renova quando expira e quando o Tidal responde 401; sessão perdida pede nova ligação', async () => {
    const { chave } = await ligarPrimeiraVez();
    const t = await env.KV.get('tidal:tokens', 'json');
    await env.KV.put('tidal:tokens', JSON.stringify({ ...t, expira: Date.now() - 1000 }));
    assert.equal((await get('/api/perfil?fresco=1', chave)).status, 200);
    const ren = sim.tokenBodies.find((b) => b.grant_type === 'refresh_token');
    assert.equal(ren.refresh_token, 'RT1');
    assert.equal(ren.client_id, 'CLIENTE');
    const t2 = await env.KV.get('tidal:tokens', 'json');
    assert.equal(t2.access, 'AT2');
    assert.equal(t2.refresh, 'RT1', 'guarda o refresh token antigo se não vier outro');
    // 401 com um token ainda "válido" → renova e repete
    await env.KV.put('tidal:tokens', JSON.stringify({ ...t, expira: Date.now() + 3600e3 }));
    sim.recusar401 = true;
    sim.tokenBodies = [];
    assert.equal((await get('/api/pesquisa?q=feeling', chave)).status, 200);
    assert.equal(sim.tokenBodies.filter((b) => b.grant_type === 'refresh_token').length, 1);
    // refresh recusado → desliga e pede para ligar outra vez
    await env.KV.put('tidal:tokens', JSON.stringify({ ...t, refresh: 'RT-velho', expira: 0 }));
    const r = await get('/api/perfil?fresco=1', chave);
    assert.equal(r.status, 409);
    assert.equal((await r.json()).error, 'tidal_desligado');
    assert.equal(await env.KV.get('tidal:tokens'), null);
});

test('pedidos ao Maestro: criar, listar, marcar feito, cancelar', async () => {
    const { chave } = await ligarPrimeiraVez();
    assert.equal((await post('/api/pedidos', { texto: 'x' }, chave)).status, 400);
    const p = await (await post('/api/pedidos', { texto: 'Soul dos anos 70 bem gravado', opcoes: { faixas: 25, arco: 'sobe' } }, chave)).json();
    assert.equal(p.estado, 'pendente');
    assert.deepEqual(p.opcoes, { faixas: 25, maxArtista: 2, estilo: 'equilibrado', arco: 'sobe' });
    const p2 = await (await post('/api/pedidos', { texto: 'Fado para o carro' }, chave)).json();
    assert.equal((await (await get('/api/estado', chave)).json()).pedidos, 2);
    const ag = await env.KV.get('agente:chave');
    const pl = await (await post('/api/playlists', { nome: 'Soul 70', faixas: [{ id: '201', titulo: 'x', artistas: ['y'] }], tidal: true }, ag)).json();
    assert.equal((await call(`/api/pedidos/${p.id}?playlist=${pl.id}`, { method: 'DELETE', headers: { authorization: `Bearer ${ag}` } })).status, 200);
    const lista = await (await get('/api/pedidos', chave)).json();
    assert.equal(lista.find((x) => x.id === p.id).estado, 'feito');
    assert.equal(lista.find((x) => x.id === p.id).playlist, pl.id);
    assert.equal(lista.find((x) => x.id === p.id).tidal, pl.tidal.url, 'o pedido feito leva a ligação do Tidal');
    assert.equal(lista.find((x) => x.id === p2.id).tidal, undefined);
    await call(`/api/pedidos/${p2.id}`, { method: 'DELETE', headers: { authorization: `Bearer ${chave}` } });
    assert.equal((await (await get('/api/pedidos', chave)).json()).length, 1);
    assert.equal((await (await get('/api/estado', chave)).json()).pedidos, 0);
});

test('desligar apaga os tokens e o perfil', async () => {
    const { chave } = await ligarPrimeiraVez();
    await get('/api/perfil', chave);
    assert.equal((await post('/api/desligar', {}, chave)).status, 200);
    assert.equal(await env.KV.get('tidal:tokens'), null);
    assert.equal(await env.KV.get('perfil'), null);
    assert.equal((await get('/api/perfil', chave)).status, 409);
});

test('afinar na app: a ordem do motor, as faixas juntadas do Tidal (por id) e o envio — na mesma playlist', async () => {
    const { chave } = await ligarPrimeiraVez();
    const agente = await env.KV.get('agente:chave');
    const f = (id, titulo, artista) => ({ id, titulo, artistas: [artista], duracao: 200, tags: ['LOSSLESS'], generos: [], ano: 1960 });
    const s = (genero) => ({ artista: 'x', genero, ano: 1960, gosto: 500, qualidade: 750, tendencia: 500, claude: 800, novidade: 500, energia: 500, bpm: 0, tom: 0, fixa: false });
    const candidatas = [
        { artista: 'Miles Davis', titulo: 'So What', motivo: 'Referência.', faixa: f('101', 'So What', 'Miles Davis'), sinais: s('jazz') },
        { artista: 'Nina Simone', titulo: 'Feeling Good', motivo: 'Voz.', faixa: f('102', 'Feeling Good', 'Nina Simone'), sinais: s('soul') },
        { artista: 'Daft Punk', titulo: 'Get Lucky', motivo: 'Graves.', faixa: f('103', 'Get Lucky', 'Daft Punk'), sinais: s('disco') },
    ];
    const d = await (await post('/api/playlists', { nome: 'Original', descricao: 'd', resumo: 'r', faixas: candidatas.map((c) => c.faixa), candidatas, opcoes: { faixas: 3 } }, agente)).json();
    const r = await post(`/api/playlists/${d.id}/versoes`, { ordem: [2, 0, 3], porque: ['claude', 'gosto', 'fixa'], pontos: [800, 700, 600], extras: ['106'],
        opcoes: { faixas: 5, maxArtista: 1, estilo: 'audiofilo', arco: 'desce' }, custo: 1234, tidal: true }, chave);
    assert.equal(r.status, 201);
    const v = await r.json();
    assert.equal(v.id, d.id, 'a mesma playlist');
    assert.equal(v.nome, 'Original');
    assert.equal(v.por, 'curador', 'quem a fez continua a ser o Maestro');
    assert.ok(v.afinadaEm);
    assert.deepEqual(v.faixas.map((x) => x.id), ['103', '101', '106'], 'a ordem da app; o índice 3 é a faixa juntada');
    assert.deepEqual(v.faixas.map((x) => x.porque), ['claude', 'gosto', 'fixa']);
    assert.equal(v.faixas[0].motivo, 'Graves.');
    assert.equal(v.faixas[0].genero, 'disco');
    const juntada = v.faixas[2];
    assert.equal(juntada.titulo, 'Teardrop', 'os dados da juntada vêm do Tidal, não da app');
    assert.equal(juntada.motivo, 'Escolhida por ti.');
    assert.equal(v.candidatas.length, 4);
    assert.equal(v.candidatas[3].sinais.fixa, true);
    assert.deepEqual(v.opcoes, { faixas: 5, maxArtista: 1, estilo: 'audiofilo', arco: 'desce' });
    assert.equal(v.tidal.faixas, 3);
    assert.deepEqual(sim.itens, ['103', '101', '106']);
    // a playlist guardada é a afinada (sem cópia); erros
    assert.deepEqual((await (await get('/api/playlists/' + d.id, chave)).json()).faixas.map((x) => x.id), ['103', '101', '106']);
    assert.equal((await (await get('/api/playlists', chave)).json()).filter((x) => x.nome.startsWith('Original')).length, 1);
    assert.equal((await post(`/api/playlists/${d.id}/versoes`, { ordem: [0], extras: ['abc'] }, chave)).status, 400);
    assert.equal((await post(`/api/playlists/${d.id}/versoes`, { ordem: [] }, chave)).status, 400);
    assert.equal((await post(`/api/playlists/${d.id}/versoes`, { ordem: [9] }, chave)).status, 400);
    assert.equal((await post('/api/playlists/nao-existe/versoes', { ordem: [0] }, chave)).status, 404);
    assert.equal((await post(`/api/playlists/${d.id}/versoes`, { ordem: [0] })).status, 401);
});

test('aparelho novo com o código de ligação (sem novo login no Tidal)', async () => {
    await env.KV.put('codigo:ligacao', sha('OUTRO-456'));
    assert.equal((await post('/api/aparelho', { codigo: 'errado' })).status, 401);
    const r = await post('/api/aparelho', { codigo: 'OUTRO-456', nome: 'iPhone (ecrã principal)' });
    assert.equal(r.status, 201);
    const { chave } = await r.json();
    assert.equal(await env.KV.get('codigo:ligacao'), null, 'o código gasta-se');
    assert.equal((await (await get('/api/estado', chave)).json()).tu, 'aparelho');
    assert.equal((await post('/api/aparelho', { codigo: 'OUTRO-456' })).status, 401);
});

test('afinar na mesma playlist: no Tidal, troca as faixas da própria playlist (sem cópias)', async () => {
    const { chave } = await ligarPrimeiraVez();
    const agente = await env.KV.get('agente:chave');
    const f = (id, titulo) => ({ id, titulo, artistas: ['Miles Davis'], duracao: 180 });
    const candidatas = [f('101', 'So What'), f('102', 'Feeling Good'), f('106', 'Teardrop')].map((faixa) => ({ faixa, sinais: { genero: 'jazz' }, motivo: 'm' }));
    const d = await (await post('/api/playlists', { nome: 'Noite', faixas: candidatas.map((x) => x.faixa), candidatas, tidal: true }, agente)).json();
    const pid = d.tidal.id;
    assert.deepEqual(sim.listas[pid].map((x) => x.id), ['101', '102', '106']);
    const criadas = sim.criadas.length;
    const r = await post(`/api/playlists/${d.id}/versoes`, { ordem: [2, 0, 1], tidal: true, opcoes: { faixas: 5, maxArtista: 2 } }, chave);
    assert.equal(r.status, 201);
    const v = await r.json();
    assert.equal(v.id, d.id, 'a mesma playlist na app');
    assert.equal(v.nome, 'Noite', 'sem «· afinada»');
    assert.equal(sim.criadas.length, criadas, 'nenhuma playlist nova no Tidal');
    assert.deepEqual(sim.listas[pid].map((x) => x.id), ['106', '101', '102'], 'a mesma playlist do Tidal, pela ordem nova');
    assert.deepEqual(sim.removidos, ['101', '102', '106']);
    const idx = await (await get('/api/playlists', chave)).json();
    assert.equal(idx.filter((x) => x.nome.startsWith('Noite')).length, 1, 'sem cópias na biblioteca');
    // só na app: o Tidal fica como está
    await post(`/api/playlists/${d.id}/versoes`, { ordem: [0, 1], tidal: false }, chave);
    assert.deepEqual(sim.listas[pid].map((x) => x.id), ['106', '101', '102']);
    assert.deepEqual((await (await get('/api/playlists/' + d.id, chave)).json()).faixas.map((x) => x.id), ['101', '102']);
});

test('trocar e tirar uma faixa, na hora: no mesmo sítio, logo no Tidal; a que sai não volta; parecidas do Tidal; repor', async () => {
    const { chave } = await ligarPrimeiraVez();
    const agente = await env.KV.get('agente:chave');
    const f = (id, titulo) => ({ id, titulo, artistas: ['Miles Davis'], duracao: 180 });
    const candidatas = [f('101', 'So What'), f('102', 'Feeling Good'), f('106', 'Teardrop'), f('105', 'Blue in Green')].map((faixa) => ({ faixa, sinais: { genero: 'jazz' }, motivo: 'm' }));
    const d = await (await post('/api/playlists', { nome: 'Noite', faixas: candidatas.slice(0, 3).map((x) => x.faixa), candidatas, tidal: true }, agente)).json();
    const pid = d.tidal.id;
    const noTidal = () => sim.listas[pid].map((x) => x.id);
    assert.deepEqual(noTidal(), ['101', '102', '106']);
    // trocar a do meio por uma candidata guardada: fica no mesmo sítio, na app e no Tidal (a mesma playlist)
    const criadas = sim.criadas.length;
    const r = await post(`/api/playlists/${d.id}/trocar`, { sai: '102', entra: '105' }, chave);
    assert.equal(r.status, 200);
    const v = await r.json();
    assert.deepEqual(v.faixas.map((x) => x.id), ['101', '105', '106']);
    assert.deepEqual([v.faixas[1].titulo, v.faixas[1].genero, v.faixas[1].motivo], ['Blue in Green', 'jazz', 'm'], 'a faixa vem das candidatas guardadas');
    assert.deepEqual(noTidal(), ['101', '105', '106']);
    assert.equal(sim.criadas.length, criadas, 'nenhuma playlist nova no Tidal');
    assert.deepEqual(v.rejeitadas, ['102'], 'a que saiu não volta');
    assert.deepEqual([v.trocas.length, v.trocas[0].sai, v.trocas[0].titulo, v.trocas[0].pos, v.trocas[0].entra], [1, '102', 'Feeling Good', 1, '105']);
    assert.equal(v.candidatas.length, 4);
    // sem candidatas livres: a primeira parecida do Tidal que não está na playlist nem saiu de lá (102 e 106 ficam de fora)
    const r2 = await post(`/api/playlists/${d.id}/trocar`, { sai: '101', parecida: true }, chave);
    assert.equal(r2.status, 200);
    const v2 = await r2.json();
    assert.deepEqual(v2.faixas.map((x) => x.id), ['103', '105', '106']);
    assert.match(v2.faixas[0].motivo, /^Parecida com «So What»\.$/);
    assert.ok(sim.chamadas.some((c) => c.includes('/tracks/101/relationships/similarTracks')));
    assert.deepEqual(noTidal(), ['103', '105', '106']);
    assert.equal(v2.candidatas.length, 5, 'a faixa nova fica nas candidatas (com os sinais), para afinar depois');
    assert.ok(v2.candidatas[4].sinais);
    assert.deepEqual(v2.rejeitadas.sort(), ['101', '102']);
    // tirar: a playlist fica mais curta; o índice acompanha
    const v3 = await (await post(`/api/playlists/${d.id}/trocar`, { sai: '105' }, chave)).json();
    assert.deepEqual(v3.faixas.map((x) => x.id), ['103', '106']);
    assert.deepEqual(noTidal(), ['103', '106']);
    assert.equal((await (await get('/api/playlists', chave)).json()).find((x) => x.id === d.id).faixas, 2);
    assert.deepEqual([v3.trocas.at(-1).sai, v3.trocas.at(-1).pos, v3.trocas.at(-1).entra], ['105', 1, undefined]);
    // desfazer: a que saiu volta ao sítio, deixa de estar nas que saíram e o registo dessa mudança desaparece
    const v4 = await (await post(`/api/playlists/${d.id}/trocar`, { desfazer: true }, chave)).json();
    assert.deepEqual(v4.faixas.map((x) => x.id), ['103', '105', '106']);
    assert.deepEqual(noTidal(), ['103', '105', '106']);
    assert.ok(!v4.rejeitadas.includes('105'));
    assert.equal(v4.trocas.length, 2);
    // outra vez: desfaz a troca anterior (a 101 volta ao lugar da 103, que não fica nas que saíram)
    const v4b = await (await post(`/api/playlists/${d.id}/trocar`, { desfazer: true }, chave)).json();
    assert.deepEqual(v4b.faixas.map((x) => x.id), ['101', '105', '106']);
    assert.deepEqual(v4b.rejeitadas, ['102']);
    assert.deepEqual(noTidal(), ['101', '105', '106']);
    // pôr uma faixa num sítio (pelo id), e voltar a ter a 103 no início para o resto do teste
    await post(`/api/playlists/${d.id}/trocar`, { sai: '101', entra: '103' }, chave);
    assert.deepEqual((await (await post(`/api/playlists/${d.id}/trocar`, { sai: '105' }, chave)).json()).faixas.map((x) => x.id), ['103', '106']);
    assert.deepEqual((await (await post(`/api/playlists/${d.id}/trocar`, { entra: '105', pos: 1 }, chave)).json()).faixas.map((x) => x.id), ['103', '105', '106']);
    // o que não pode ser: uma faixa que não está, uma que já está, nada, um id que não é do Tidal, ficar sem faixas
    assert.equal((await post(`/api/playlists/${d.id}/trocar`, { sai: '999' }, chave)).status, 400);
    assert.equal((await post(`/api/playlists/${d.id}/trocar`, { sai: '103', entra: '106' }, chave)).status, 409);
    assert.equal((await post(`/api/playlists/${d.id}/trocar`, {}, chave)).status, 400);
    assert.equal((await post(`/api/playlists/${d.id}/trocar`, { sai: '103', entra: 'abc' }, chave)).status, 400);
    assert.equal((await post(`/api/playlists/${d.id}/trocar`, { sai: '103' }, chave)).status, 200);
    assert.equal((await post(`/api/playlists/${d.id}/trocar`, { sai: '105' }, chave)).status, 200);
    const ultimo = await post(`/api/playlists/${d.id}/trocar`, { sai: '106' }, chave);
    assert.deepEqual([ultimo.status, (await ultimo.json()).error], [400, 'sem_faixas']);
    // sem mais parecidas (todas já entraram ou saíram): diz que não encontrou
    const semMais = await post(`/api/playlists/${d.id}/trocar`, { sai: '106', parecida: true }, chave);
    assert.deepEqual([semMais.status, (await semMais.json()).error], [404, 'sem_parecidas']);
    // só na app (sem Tidal): troca na app e não toca no Tidal
    const so = await (await post('/api/playlists', { nome: 'Só app', faixas: candidatas.slice(0, 2).map((x) => x.faixa), candidatas }, agente)).json();
    const antes = sim.chamadas.length;
    const v5 = await (await post(`/api/playlists/${so.id}/trocar`, { sai: '101', entra: '106' }, chave)).json();
    assert.deepEqual(v5.faixas.map((x) => x.id), ['106', '102']);
    assert.equal(sim.chamadas.length, antes, 'sem chamadas ao Tidal');
    // acrescentar uma faixa pelo id (a pessoa procurou-a): entra no fim e fica segura nas candidatas — o afinar não a tira;
    // a parecida que o Tidal escolhe não fica segura
    const v5b = await (await post(`/api/playlists/${so.id}/trocar`, { entra: '103' }, chave)).json();
    assert.deepEqual(v5b.faixas.map((x) => x.id), ['106', '102', '103']);
    assert.deepEqual([v5b.candidatas.at(-1).faixa.id, v5b.candidatas.at(-1).sinais.fixa, v5b.candidatas.at(-1).motivo], ['103', true, 'Escolhida por ti.']);
    assert.ok(!v2.candidatas[4].sinais.fixa);
    // uma faixa acrescentada não se desfaz (não saiu nada): tira-se; e tirar desfaz-se
    assert.deepEqual([(await post(`/api/playlists/${so.id}/trocar`, { desfazer: true }, chave)).status], [400]);
    await post(`/api/playlists/${so.id}/trocar`, { sai: '103' }, chave);
    assert.deepEqual((await (await post(`/api/playlists/${so.id}/trocar`, { desfazer: true }, chave)).json()).faixas.map((x) => x.id), ['106', '102', '103']);
    // só as 5 últimas mudanças guardam a faixa que saiu
    await post(`/api/playlists/${so.id}/trocar`, { sai: '106', entra: '101' }, chave);
    for (let i = 0; i < 7; i++) await post(`/api/playlists/${so.id}/trocar`, i % 2 ? { sai: '106', entra: '101' } : { sai: '101', entra: '106' }, chave);
    const v6 = await (await get('/api/playlists/' + so.id, chave)).json();
    assert.deepEqual([v6.trocas.length, v6.trocas.filter((x) => x.faixa).length, !!v6.trocas.at(-1).faixa], [10, 5, true]);
});

test('mais como esta: as parecidas do Tidal, logo no Tidal; fica um pedido para o Maestro a rever, na mesma playlist', async () => {
    const { chave } = await ligarPrimeiraVez();
    const agente = await env.KV.get('agente:chave');
    const r = await post('/api/mais', { faixa: '101' }, chave);
    assert.equal(r.status, 201);
    const d = await r.json();
    assert.equal(d.nome, 'Parecidas com So What');
    assert.equal(d.faixas[0].id, '101', 'começa pela faixa de partida');
    assert.deepEqual(d.faixas.map((x) => x.id).slice(1), ['102', '106', '105', '103']);
    assert.equal(d.candidatas.length, 5, 'fica pronta para afinar');
    assert.match(d.tidal.url, /^https:\/\/tidal.com\/browse\/playlist\//);
    assert.ok(sim.chamadas.some((c) => c.includes('/tracks/101/relationships/similarTracks')));
    assert.equal((await post('/api/mais', { faixa: 'abc' }, chave)).status, 400);
    // quem escolheu foi o Tidal: diz-se de onde vem, e o Maestro tem um pedido para a rever (no mesmo sítio)
    assert.deepEqual([d.por, d.origem], ['app', 'parecidas']);
    assert.match(d.resumo, /O Maestro revê-a na próxima corrida/);
    const ped = (await (await get('/api/pedidos', chave)).json())[0];
    assert.deepEqual([ped.estado, ped.texto, ped.afinar], ['pendente', 'Mais como «So What», de Miles Davis', { playlist: d.id, nome: d.nome, rejeitadas: [], rever: true }]);
    assert.deepEqual(ped.opcoes, d.opcoes);
    assert.deepEqual(d.afinacoes, [{ pedido: ped.id, texto: 'Rever as parecidas do Tidal', rejeitadas: 0, em: ped.criadoEm, rever: true }]);
    assert.equal((await (await get('/api/playlists', chave)).json())[0].origem, 'parecidas');
    // o Maestro revê-a: as faixas mudam na mesma playlist (o mesmo link do Tidal) e ela passa a ser dele
    const f = (id, titulo, artista) => ({ id, titulo, artistas: [artista], duracao: 200 });
    const ren = await post(`/api/playlists/${d.id}/renovacoes`, { faixas: [f('101', 'So What', 'Miles Davis'), f('107', 'Blue in Green', 'Miles Davis'), f('105', 'Naima', 'John Coltrane')], resumo: 'Revista: mais do sexteto de 1959.', modelo: 'm' }, agente);
    assert.equal(ren.status, 201);
    assert.equal((await call(`/api/pedidos/${ped.id}?playlist=${d.id}`, { method: 'DELETE', headers: { authorization: `Bearer ${agente}` } })).status, 200);
    const d2 = JSON.parse(await env.KV.get('playlist:' + d.id));
    assert.deepEqual([d2.por, d2.origem, d2.tidal.id, d2.resumo], ['curador', 'parecidas', d.tidal.id, 'Revista: mais do sexteto de 1959.']);
    assert.ok(d2.revistaEm && d2.revistaEm === d2.afinadaEm);
    assert.deepEqual(d2.faixas.map((x) => x.id), ['101', '107', '105']);
    assert.ok(d2.afinacoes[0].feitoEm && d2.afinacoes[0].rever);
    assert.deepEqual([d2.afinacoes[0].entraram, d2.afinacoes[0].sairam], [1, 3]);
    const i2 = (await (await get('/api/playlists', chave)).json())[0];
    assert.deepEqual([i2.por, i2.revistaEm], ['curador', d2.revistaEm]);
    // cancelar a revisão (na app): o pedido sai e a playlist fica como está, do Tidal
    const e = await (await post('/api/mais', { faixa: '102' }, chave)).json();
    const pe = (await (await get('/api/pedidos', chave)).json())[0];
    assert.equal(pe.afinar.playlist, e.id);
    assert.equal((await call(`/api/pedidos/${pe.id}`, { method: 'DELETE', headers: { authorization: `Bearer ${chave}` } })).status, 200);
    const e2 = JSON.parse(await env.KV.get('playlist:' + e.id));
    assert.deepEqual([e2.por, e2.afinacoes], ['app', []]);
    // com a fila de pedidos cheia, a playlist cria-se na mesma (sem pedido de revisão)
    const cheia = JSON.parse(await env.KV.get('pedidos')).filter((x) => x.estado !== 'pendente');
    for (let i = 0; i < 20; i++) cheia.unshift({ id: 'qcheia' + i, texto: 'x', estado: 'pendente', criadoEm: new Date().toISOString() });
    await env.KV.put('pedidos', JSON.stringify(cheia));
    const g = await post('/api/mais', { faixa: '103' }, chave);
    assert.equal(g.status, 201);
    assert.equal((await g.json()).afinacoes, undefined);
    assert.equal(JSON.parse(await env.KV.get('pedidos')).filter((x) => x.estado === 'pendente').length, 20);
});

test('a IA do Tidal: uma playlist a partir de um texto — criada vazia no Tidal, gerada, acompanhada e trazida para a biblioteca; o Maestro não a vê; recusas e falhas', async () => {
    const { chave } = await ligarPrimeiraVez();
    const agente = await env.KV.get('agente:chave');
    const texto = 'Jazz calmo para o fim da tarde';
    const apagarPedido = (id) => call(`/api/pedidos/${id}`, { method: 'DELETE', headers: { authorization: `Bearer ${chave}` } });
    assert.equal((await post('/api/pedidos', { texto: 'x', quem: 'tidal' }, chave)).status, 400);
    // o Tidal recusa (a conta ou a app não pode usar a IA): diz-se porquê, e a playlist vazia não fica no Tidal
    sim.ia = { recusa: { status: 403, detail: 'Feature not available' } };
    const rec = await post('/api/pedidos', { texto, quem: 'tidal' }, chave);
    assert.equal(rec.status, 502);
    const jr = await rec.json();
    assert.equal(jr.error, 'tidal_ia');
    assert.equal(jr.message, 'A IA do Tidal não aceitou o pedido (HTTP 403): Feature not available');
    assert.deepEqual(sim.apagadas, ['uuid-nova']);
    assert.deepEqual(await (await get('/api/pedidos', chave)).json(), []);
    // gerar: a playlist nasce vazia no Tidal (não listada), com o texto; o pedido fica «a gerar»
    sim.apagadas = [];
    sim.ia = { faixas: ['101', '102', '106', '200', '201', '202'], nome: 'Fim de tarde em azul', estados: ['PROCESSING', 'PROCESSING', 'OK'] };
    const r = await post('/api/pedidos', { texto, quem: 'tidal' }, chave);
    assert.equal(r.status, 201);
    const p = await r.json();
    assert.equal(p.estado, 'a gerar');
    assert.deepEqual(p.ia, { geracao: 'ger-1', playlist: 'uuid-nova' });
    assert.equal(p.naHora, undefined, 'não chama o Maestro');
    assert.deepEqual(sim.criadas.at(-1), { name: texto, description: texto, accessType: 'UNLISTED' });
    assert.deepEqual(sim.geracoes.map((x) => [x.texto, x.playlist]), [[texto, 'uuid-nova']]);
    assert.equal((await (await get('/api/estado', chave)).json()).pedidos, 0, 'não conta como pedido ao Maestro');
    // enquanto gera: a app vê a fase (sem gravar nada na KV); o Maestro não vê o pedido
    const escritas = env.KV.escritas;
    const l1 = await (await get('/api/pedidos', chave)).json();
    assert.equal(l1.length, 1);
    assert.equal(l1[0].estado, 'a gerar');
    assert.equal(l1[0].fase, 'a escolher · 1 de 6');
    assert.deepEqual(await (await get('/api/pedidos', agente)).json(), []);
    assert.equal(env.KV.escritas, escritas, 'ver como vai não gasta escritas');
    // pronta: entra na biblioteca com as faixas dela, pela ordem dela, na mesma playlist do Tidal (sem criar outra)
    const criadas = sim.criadas.length;
    const l2 = await (await get('/api/pedidos', chave)).json();
    assert.equal(l2[0].estado, 'feito');
    assert.equal(l2[0].fase, undefined);
    assert.equal(l2[0].tidal, 'https://tidal.com/browse/playlist/uuid-nova');
    const d = await (await get(`/api/playlists/${l2[0].playlist}`, chave)).json();
    assert.equal(d.id, 'p' + p.id.slice(1));
    assert.equal(d.nome, 'Fim de tarde em azul', 'o nome que o Tidal lhe deu');
    assert.equal(d.origem, 'tidal-ia');
    assert.equal(d.por, 'app');
    assert.equal(d.pedido, texto);
    assert.deepEqual(d.tidal, { id: 'uuid-nova', url: 'https://tidal.com/browse/playlist/uuid-nova', criadaEm: p.criadoEm, faixas: 6 });
    assert.deepEqual(d.faixas.map((f) => f.id), ['101', '102', '106', '200', '201', '202']);
    assert.equal(d.faixas[0].titulo, 'So What');
    assert.equal(d.faixas[0].motivo, 'Escolhida pela IA do Tidal.');
    assert.equal(d.candidatas.length, 6);
    assert.ok(d.candidatas.every((x) => x.sinais && x.faixa.id), 'com os sinais, para afinar');
    assert.deepEqual(d.opcoes, { faixas: 6, maxArtista: 4, estilo: 'equilibrado', arco: 'onda' }, 'o máximo por artista é o que ela usou (4 do Miles Davis)');
    assert.equal(sim.criadas.length, criadas, 'não cria outra playlist no Tidal');
    assert.deepEqual(sim.itens, [], 'nem lhe mexe nas faixas');
    // na lista da app está, com a origem e o pedido; o Maestro não a vê (nem nas avaliações): cada um escolhe por si
    const idx = await (await get('/api/playlists', chave)).json();
    assert.deepEqual(idx.map((x) => [x.id, x.origem, x.pedido, x.faixas, x.tidal]), [[d.id, 'tidal-ia', texto, 6, 'https://tidal.com/browse/playlist/uuid-nova']]);
    assert.deepEqual(await (await get('/api/playlists', agente)).json(), []);
    assert.deepEqual((await (await get('/api/avaliacoes', chave)).json()).playlists.map((x) => [x.id, x.origem]), [[d.id, 'tidal-ia']]);
    assert.deepEqual((await (await get('/api/avaliacoes', agente)).json()).playlists, []);
    // trazida duas vezes (dois aparelhos ao mesmo tempo): é a mesma playlist, uma só vez na lista
    await env.KV.put('pedidos', JSON.stringify((await env.KV.get('pedidos', 'json')).map((x) => ({ ...x, estado: 'a gerar' }))));
    assert.equal((await (await get('/api/pedidos', chave)).json())[0].playlist, d.id);
    assert.equal((await (await get('/api/playlists', chave)).json()).length, 1);
    // afinar com o Maestro uma playlist da IA do Tidal: o pedido de afinação é do Maestro (ele vê-o)
    const af = await (await post(`/api/playlists/${d.id}/afinar`, { texto: 'mais calma' }, chave)).json();
    assert.deepEqual((await (await get('/api/pedidos', agente)).json()).map((x) => x.id), [af.id]);
    await apagarPedido(af.id);
    // os dois com o mesmo texto: um pedido ao Maestro e uma geração do Tidal
    sim.ia = { faixas: ['103'], estados: ['PROCESSING'] };
    const amb = await (await post('/api/pedidos', { texto: 'Soul dos anos 70', quem: 'ambos', opcoes: { faixas: 20 } }, chave)).json();
    assert.equal(amb.estado, 'pendente');
    assert.equal(amb.opcoes.faixas, 20);
    assert.equal(amb.tidalIA.estado, 'a gerar');
    assert.deepEqual((await (await get('/api/pedidos', agente)).json()).map((x) => x.id), [amb.id], 'o Maestro só vê o dele');
    assert.deepEqual((await (await get('/api/pedidos', chave)).json()).map((x) => [x.id, x.estado]).slice(0, 2), [[amb.tidalIA.id, 'a gerar'], [amb.id, 'pendente']]);
    // cancelar a meio: a playlist sai do Tidal
    assert.equal((await apagarPedido(amb.tidalIA.id)).status, 200);
    assert.deepEqual(sim.apagadas, ['uuid-nova']);
    sim.apagadas = [];
    await apagarPedido(amb.id);
    // os dois, mas o Tidal recusa: o pedido ao Maestro fica feito e diz-se porquê
    sim.ia = { recusa: { status: 403, detail: 'Feature not available' } };
    const amb2 = await post('/api/pedidos', { texto: 'Soul dos anos 70', quem: 'ambos' }, chave);
    assert.equal(amb2.status, 201);
    const ja2 = await amb2.json();
    assert.equal(ja2.estado, 'pendente');
    assert.deepEqual(ja2.tidalIA, { erro: 'A IA do Tidal não aceitou o pedido (HTTP 403): Feature not available' });
    await apagarPedido(ja2.id);
    sim.apagadas = [];
    // a geração falha: o pedido fica «falhou» com o motivo, e a playlist vazia sai do Tidal
    sim.ia = { estados: ['ERROR'], falha: 'NO_MATCHING_TRACKS' };
    const f = await (await post('/api/pedidos', { texto: 'Uma coisa impossível', quem: 'tidal' }, chave)).json();
    const lf = (await (await get('/api/pedidos', chave)).json()).find((x) => x.id === f.id);
    assert.equal(lf.estado, 'falhou');
    assert.equal(lf.erro, 'A IA do Tidal não conseguiu fazer esta playlist (NO_MATCHING_TRACKS).');
    assert.deepEqual(sim.apagadas, ['uuid-nova']);
    assert.equal((await apagarPedido(f.id)).status, 200);
    assert.deepEqual(sim.apagadas, ['uuid-nova'], 'tirar um pedido que falhou já não mexe no Tidal');
    sim.apagadas = [];
    // dá-a por pronta mas vazia: falhou
    sim.ia = { estados: ['OK'], faixas: [] };
    const v = await (await post('/api/pedidos', { texto: 'Vazia', quem: 'tidal' }, chave)).json();
    const lv = (await (await get('/api/pedidos', chave)).json()).find((x) => x.id === v.id);
    assert.deepEqual([lv.estado, lv.erro], ['falhou', 'A IA do Tidal deu a playlist por pronta, mas sem faixas.']);
    await apagarPedido(v.id);
    sim.apagadas = [];
    // demora demais (20 minutos): falhou
    sim.ia = { estados: ['PROCESSING'], faixas: ['101'] };
    const lenta = await (await post('/api/pedidos', { texto: 'Lenta', quem: 'tidal' }, chave)).json();
    await env.KV.put('pedidos', JSON.stringify((await env.KV.get('pedidos', 'json')).map((x) => (x.id === lenta.id ? { ...x, criadoEm: new Date(Date.now() - 21 * 60000).toISOString() } : x))));
    const ll = (await (await get('/api/pedidos', chave)).json()).find((x) => x.id === lenta.id);
    assert.deepEqual([ll.estado, ll.erro], ['falhou', 'A IA do Tidal demorou demais.']);
    await apagarPedido(lenta.id);
    sim.apagadas = [];
    // no máximo 3 a gerar ao mesmo tempo
    for (let i = 0; i < 3; i++) assert.equal((await post('/api/pedidos', { texto: `Tema ${i}`, quem: 'tidal' }, chave)).status, 201);
    const cheio = await post('/api/pedidos', { texto: 'Mais uma', quem: 'tidal' }, chave);
    assert.equal(cheio.status, 429);
    assert.equal((await cheio.json()).error, 'demasiados');
    // se o Tidal estiver em baixo, a lista dos pedidos continua a vir
    const de = globalThis.fetch;
    globalThis.fetch = async (u, init) => (String(u).includes('/playlistGenerations/') ? new Response('{}', { status: 500 }) : de(u, init));
    assert.equal((await (await get('/api/pedidos', chave)).json()).filter((x) => x.estado === 'a gerar').length, 3);
    globalThis.fetch = de;
});

test('juntar playlists: uma faixa de cada, à vez, sem repetidas; vai logo para o Tidal; pelo menos 2', async () => {
    const { chave } = await ligarPrimeiraVez();
    const agente = await env.KV.get('agente:chave');
    const f = (id, titulo, artista) => ({ id, titulo, artistas: [artista], duracao: 200 });
    const a = await (await post('/api/playlists', { nome: 'Calma', faixas: [f('1', 'Um', 'A'), f('2', 'Dois', 'B'), f('3', 'Três', 'C')], capas: ['https://img/a.jpg'] }, agente)).json();
    const b = await (await post('/api/playlists', { nome: 'Noite', faixas: [f('2', 'Dois', 'B'), f('9', 'Um (Remastered)', 'A'), f('5', 'Cinco', 'E')] }, agente)).json();
    const r = await post('/api/juntar', { ids: [a.id, b.id] }, chave);
    assert.equal(r.status, 201);
    const d = await r.json();
    assert.equal(d.nome, 'Calma + Noite');
    assert.deepEqual(d.faixas.map((x) => x.id), ['1', '2', '3', '5'], 'alternadas, sem a mesma faixa nem outra edição dela');
    assert.match(d.tidal.url, /^https:\/\/tidal.com\/browse\/playlist\//, 'vai logo para o Tidal (revê-se depois, na app)');
    assert.deepEqual([d.por, d.origem], ['app', 'juntar']);
    assert.equal(sim.criadas.at(-1).name, 'Calma + Noite');
    const idx = await (await get('/api/playlists', chave)).json();
    assert.equal(idx[0].id, d.id);
    assert.equal(idx[0].origem, 'juntar');
    assert.deepEqual(idx[0].capas, ['https://img/a.jpg']);
    assert.equal((await post('/api/juntar', { ids: [a.id] }, chave)).status, 400);
    assert.equal((await post('/api/juntar', { ids: [a.id, 'pnaoexiste'] }, chave)).status, 404);
});

test('apagar a conta: sai tudo o que o conector guarda da pessoa (e só dela); as chaves dela deixam de servir; o que é de todos fica', async () => {
    const { chave } = await ligarPrimeiraVez(); // o dono
    const agente = await env.KV.get('agente:chave');
    const f = (id, titulo, artista) => ({ id, titulo, artistas: [artista], duracao: 200 });
    // a Ana, convidada, com a sua biblioteca
    const cv = await (await post('/api/convites', {}, chave)).json();
    const st = new URL((await (await post('/api/ligar', { codigo: cv.codigo, nome: 'telemóvel da Ana' })).json()).url).searchParams.get('state');
    const chaveAna = decodeURIComponent((await call(`/tidal/retorno?code=CODIGO-ANA&state=${st}`)).headers.get('location').split('#chave=')[1]);
    const uidAna = JSON.parse(await env.KV.get('utilizadores'))[0].uid;
    for (const [k, q] of [[chave, 'dono'], [chaveAna, 'Ana']]) {
        await post('/api/pedidos', { texto: `Pedido da ${q}` }, k);
        for (const n of ['Um', 'Dois']) assert.equal((await post('/api/playlists', { nome: `${n} (${q})`, faixas: [f('101', 'So What', 'Miles Davis')] }, k)).status, 201);
        assert.equal((await get('/api/perfil', k)).status, 200);
    }
    const dela = () => [...env.KV.m.keys()].filter((k) => k.startsWith(`u:${uidAna}:`));
    assert.ok(dela().length >= 6, `a Ana tem as suas coisas guardadas (${dela().length}: mais do que uma página da lista)`);
    const doDono = () => [...env.KV.m.keys()].filter((k) => !k.startsWith('u:') && /^(tidal:tokens|perfil|playlists|playlist:|pedidos|ideias|push)$|^playlist:/.test(k));
    const antes = doDono().length;
    // o Maestro não apaga contas; sem chave também não
    const apagar = (k) => call('/api/conta', { method: 'DELETE', headers: k ? { authorization: `Bearer ${k}` } : {} });
    assert.equal((await apagar(agente)).status, 403);
    assert.equal((await apagar()).status, 401);
    // a Ana apaga a sua conta
    const r = await apagar(chaveAna);
    assert.equal(r.status, 200);
    assert.equal((await r.json()).ok, true);
    assert.deepEqual(dela(), [], 'não fica nada dela');
    assert.deepEqual(JSON.parse(await env.KV.get('utilizadores')), []);
    assert.equal((await get('/api/playlists', chaveAna)).status, 401, 'a chave dela deixa de servir');
    assert.equal(doDono().length, antes, 'as coisas do dono não se mexem');
    assert.equal((await (await get('/api/playlists', chave)).json()).length, 2);
    assert.equal((await (await get('/api/utilizadores', agente)).json()).length, 1, 'o Maestro já não a vê');
    // o dono apaga a sua: fica só o que é de todos (o Client ID, a chave do Maestro, as tabelas)
    await env.KV.put('config:tidal_client_id', 'CLIENTE-KV');
    await env.KV.put('tendencias:resumo', '{}');
    assert.equal((await apagar(chave)).status, 200);
    assert.deepEqual(doDono(), []);
    assert.equal((await get('/api/playlists', chave)).status, 401);
    assert.deepEqual([...env.KV.m.keys()].sort(), ['agente:chave', 'chaves', 'config:tidal_client_id', 'tendencias:resumo', 'utilizadores']);
    assert.deepEqual(Object.values(JSON.parse(await env.KV.get('chaves'))).map((x) => x.tipo), ['agente'], 'só fica a chave do Maestro');
    assert.equal((await (await get('/api/estado')).json()).ligado, false);
});

test('a app nativa (os ficheiros vão dentro dela): o login do Tidal volta à app, não ao site', async () => {
    await env.KV.put('codigo:ligacao', sha('LIGAR-123'));
    const r = await post('/api/ligar', { codigo: 'LIGAR-123', nome: 'iPhone', voltar: 'app' });
    const state = new URL((await r.json()).url).searchParams.get('state');
    assert.match(state, /^app-.{20,}$/);
    const ret = await call(`/tidal/retorno?code=CODIGO-BOM&state=${state}`);
    assert.equal(ret.status, 302);
    assert.match(ret.headers.get('location'), /^capacitor:\/\/localhost\/#chave=.{20,}$/);
    const chave = decodeURIComponent(ret.headers.get('location').split('#chave=')[1]);
    assert.equal((await get('/api/playlists', chave)).status, 200, 'a chave que voltou para a app serve');
    // ligar outra vez (já com chave) e os erros também voltam à app
    const st2 = new URL((await (await post('/api/ligar', { voltar: 'app' }, chave)).json()).url).searchParams.get('state');
    assert.equal((await call(`/tidal/retorno?code=CODIGO-BOM&state=${st2}`)).headers.get('location'), 'capacitor://localhost/#ligado=1');
    assert.match((await call('/tidal/retorno?code=X&state=app-expirado')).headers.get('location'), /^capacitor:\/\/localhost\/#erro=/);
    assert.match((await call('/tidal/retorno?error=access_denied&state=app-qualquer')).headers.get('location'), /^capacitor:\/\/localhost\/#erro=access_denied$/);
    // sem o pedido da app, tudo como dantes: volta ao site
    const st3 = new URL((await (await post('/api/ligar', {}, chave)).json()).url).searchParams.get('state');
    assert.doesNotMatch(st3, /^app-/);
    assert.equal((await call(`/tidal/retorno?code=CODIGO-BOM&state=${st3}`)).headers.get('location'), 'https://nelsonsous.github.io/escolaplay/musica/#ligado=1');
    assert.match((await call('/tidal/retorno?code=X&state=expirado')).headers.get('location'), /^https:\/\/nelsonsous\.github\.io\/escolaplay\/musica\/#erro=/);
});

test('o Maestro na hora: com os segredos no Worker, um pedido novo chama a tarefa agendada — sem corridas a dobrar nem chamadas à toa; sem eles, nada muda', async () => {
    const { chave } = await ligarPrimeiraVez();
    const agente = await env.KV.get('agente:chave');
    const chamadas = async () => JSON.parse((await env.KV.get('maestro:chamadas')) || '[]');
    const peds = async () => JSON.parse(await env.KV.get('pedidos'));
    // sem os segredos: o pedido fica à espera da corrida seguinte, como sempre
    const p0 = await (await post('/api/pedidos', { texto: 'Jazz calmo' }, chave)).json();
    await depois();
    assert.equal(p0.naHora, undefined);
    assert.deepEqual(sim.maestro, []);
    assert.equal((await (await get('/api/estado', chave)).json()).naHora, undefined);
    await env.KV.put('pedidos', '[]');
    // com os segredos (postos no painel do Cloudflare, nunca no código); as horas agendadas ficam de fora deste teste
    Object.assign(env, { MAESTRO_FIRE_URL: 'https://api.anthropic.com/v1/claude_code/routines/trig_01TESTE/fire', MAESTRO_TOKEN: 'segredo-de-teste', MAESTRO_ESPERA_MS: 30, MAESTRO_AGENDADAS: '' });
    assert.equal((await (await get('/api/estado', chave)).json()).naHora, true);
    const p1 = await (await post('/api/pedidos', { texto: 'Fado para o jantar' }, chave)).json();
    assert.equal(p1.naHora, true, 'a app fica a saber que o Maestro foi chamado');
    await depois();
    assert.equal(sim.maestro.length, 1);
    assert.deepEqual(sim.maestro[0], { url: 'https://api.anthropic.com/v1/claude_code/routines/trig_01TESTE/fire', metodo: 'POST', authorization: 'Bearer segredo-de-teste',
        beta: 'experimental-cc-routine-2026-04-01', versao: '2023-06-01', corpo: { text: 'Corrida pedida pela app Música: há pedidos à espera.' } });
    assert.ok(!JSON.stringify(sim.maestro[0]).includes('Fado'), 'nada do que a pessoa escreveu segue na chamada');
    assert.deepEqual((await peds()).map((x) => x.chamadas), [1]);
    // outro pedido logo a seguir: há uma corrida a decorrer (a que acabou de ser chamada), que o vê antes de acabar
    const p2 = await (await post('/api/pedidos', { texto: 'Soul dos 70' }, chave)).json();
    await depois();
    assert.equal(p2.naHora, true);
    assert.equal(sim.maestro.length, 1, 'não se chama outra corrida por cima da que está a decorrer');
    // a app vai pedindo a lista (a espera viva): enquanto a corrida decorre, nada
    await get('/api/pedidos', chave);
    await depois();
    assert.equal(sim.maestro.length, 1);
    // 16 minutos depois o segundo pedido continua à espera (a corrida já tinha feito a última ronda): a vigia chama —
    // quando é a app a pedir a lista, não o Maestro
    const recuar = async (min) => { await env.KV.put('maestro:chamadas', JSON.stringify((await chamadas()).map((x) => x - min * 60000)));
        await env.KV.put('pedidos', JSON.stringify((await peds()).map((x) => ({ ...x, criadoEm: new Date(Date.parse(x.criadoEm) - min * 60000).toISOString() })))); };
    await recuar(16);
    await get('/api/pedidos', agente);
    await depois();
    assert.equal(sim.maestro.length, 1, 'os pedidos do Maestro à lista não o chamam a ele próprio');
    await get('/api/pedidos', chave);
    await depois();
    assert.equal(sim.maestro.length, 2);
    assert.deepEqual((await peds()).map((x) => [x.texto, x.chamadas]), [['Soul dos 70', 1], ['Fado para o jantar', 2]]);
    // cada pedido conta no máximo 2 chamadas: um pedido que o Maestro não consegue tratar não fica a chamá-lo para sempre
    await recuar(16);
    await get('/api/pedidos', chave);
    await depois();
    assert.equal(sim.maestro.length, 3, 'o segundo pedido ainda só tinha uma');
    await recuar(16);
    await get('/api/pedidos', chave);
    await depois();
    assert.equal(sim.maestro.length, 3, 'já tiveram as duas: fica para a corrida agendada');
    // três pedidos ao mesmo tempo (um pedido, uma afinação e um «Mais como esta»): uma só chamada, depois do último
    await env.KV.delete('maestro:chamadas');
    await env.KV.put('pedidos', '[]');
    const f = [{ id: '101', titulo: 'So What', artistas: ['Miles Davis'], duracao: 200 }];
    const pl = await (await post('/api/playlists', { nome: 'Base', faixas: f }, chave)).json();
    const [a, b, c] = await Promise.all([post('/api/pedidos', { texto: 'Bossa nova' }, chave), post(`/api/playlists/${pl.id}/afinar`, { texto: 'mais calma' }, chave), post('/api/mais', { faixa: '101' }, chave)]);
    assert.deepEqual([a.status, b.status, c.status], [201, 201, 201]);
    assert.equal((await c.json()).naHora, true);
    await depois();
    assert.equal(sim.maestro.length, 4, 'vários pedidos seguidos dão uma só corrida');
    // se o gatilho recusar (token revogado), o pedido fica feito na mesma; a tentativa conta (não se martela)
    await env.KV.delete('maestro:chamadas');
    sim.maestroStatus = 401;
    assert.equal((await post('/api/pedidos', { texto: 'Clássica' }, chave)).status, 201);
    await depois();
    assert.equal(sim.maestro.length, 5);
    assert.equal((await chamadas()).length, 1);
    sim.maestroStatus = 200;
    // no máximo 6 chamadas por hora: daí em diante os pedidos esperam pela corrida agendada
    await env.KV.put('maestro:chamadas', JSON.stringify(Array.from({ length: 6 }, (_, i) => Date.now() - (20 + i) * 60000)));
    const pz = await (await post('/api/pedidos', { texto: 'Mais um' }, chave)).json();
    await depois();
    assert.equal(pz.naHora, undefined);
    assert.equal(sim.maestro.length, 5, 'passado o limite, não chama');
    // à volta das corridas agendadas (de 3 min antes a 15 min depois) não se chama: é essa corrida que trata do pedido
    await env.KV.delete('maestro:chamadas');
    const lx = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Lisbon', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date());
    env.MAESTRO_AGENDADAS = `03:00,${lx}`;
    const pa = await (await post('/api/pedidos', { texto: 'À hora da corrida' }, chave)).json();
    await depois();
    assert.equal(pa.naHora, true);
    assert.equal(sim.maestro.length, 5);
    env.MAESTRO_AGENDADAS = '';
    // um endereço que não é o do gatilho não serve (não se chama outro sítio com o token)
    env.MAESTRO_FIRE_URL = 'https://exemplo.com/fire';
    assert.equal((await (await post('/api/pedidos', { texto: 'Outro' }, chave)).json()).naHora, undefined);
    await depois();
    assert.equal(sim.maestro.length, 5);
});

test('o Maestro é uma IA de terceiros: quem liga o Tidal autoriza no botão; quem já estava ligado autoriza nos Ajustes; renovar a sessão não a perde', async () => {
    // ligado à antiga (sem o botão novo): sem autorização registada
    const { chave } = await ligarPrimeiraVez();
    const agente = await env.KV.get('agente:chave');
    assert.equal((await (await get('/api/estado', chave)).json()).ia, false);
    assert.equal((await post('/api/consentir', {}, agente)).status, 403, 'só a própria pessoa autoriza');
    const r = await (await post('/api/consentir', {}, chave)).json();
    assert.ok(r.ok && /^\d{4}-\d\d-\d\dT/.test(r.em));
    assert.equal((await (await get('/api/estado', chave)).json()).ia, true);
    assert.equal((await (await post('/api/consentir', {}, chave)).json()).em, r.em, 'a data é a da primeira vez');
    // ligar outra vez (sem voltar a carregar no botão) mantém-na
    const st = new URL((await (await post('/api/ligar', {}, chave)).json()).url).searchParams.get('state');
    await call(`/tidal/retorno?code=CODIGO-BOM&state=${st}`);
    assert.equal(JSON.parse(await env.KV.get('tidal:tokens')).iaConsentidaEm, r.em);
    // renovar a sessão do Tidal também
    const t = JSON.parse(await env.KV.get('tidal:tokens'));
    await env.KV.put('tidal:tokens', JSON.stringify({ ...t, expira: Date.now() - 1000 }));
    assert.equal((await get('/api/perfil?fresco=1', chave)).status, 200);
    assert.equal(JSON.parse(await env.KV.get('tidal:tokens')).iaConsentidaEm, r.em);
    // uma convidada que liga pelo botão «Concordo e ligar»: fica logo registada
    const cv = await (await post('/api/convites', {}, chave)).json();
    const st2 = new URL((await (await post('/api/ligar', { codigo: cv.codigo, nome: 'Ana', consente: true })).json()).url).searchParams.get('state');
    const chaveAna = decodeURIComponent((await call(`/tidal/retorno?code=CODIGO-ANA&state=${st2}`)).headers.get('location').split('#chave=')[1]);
    assert.equal((await (await get('/api/estado', chaveAna)).json()).ia, true);
    // sem o Tidal ligado não há o que autorizar
    await post('/api/desligar', {}, chaveAna);
    assert.equal((await post('/api/consentir', {}, chaveAna)).status, 409);
});

test('para o Maestro: as tuas mixes do Tidal e as novidades dos artistas que segues', async () => {
    await ligarPrimeiraVez();
    const agente = await env.KV.get('agente:chave');
    const m = await (await get('/api/mixes', agente)).json();
    assert.deepEqual(m.mixes.map((x) => x.tipo), ['descoberta', 'diaria', 'lancamentos']);
    assert.deepEqual(m.mixes[0].faixas.map((x) => x.titulo), ['Teardrop', 'Barco Negro']);
    assert.equal(m.mixes[1].faixas[0].titulo, 'So What');
    const n = await (await get('/api/novidades?dias=7', agente)).json();
    assert.deepEqual(n.albuns.map((x) => `${x.artista} — ${x.titulo}`), ['Nina Simone — Disco novo'], 'só o álbum dos últimos 7 dias');
    assert.deepEqual(n.faixas.map((x) => x.id), ['102', '201']);
    assert.equal((await get('/api/mixes')).status, 401);
});

test('várias pessoas: convite, cada uma com o seu Tidal e a sua biblioteca; o Maestro vê todas', async () => {
    const { chave } = await ligarPrimeiraVez(); // o dono
    const agente = await env.KV.get('agente:chave');
    // o dono cria um convite (link com o código de uma só vez)
    const cv = await (await post('/api/convites', {}, chave)).json();
    assert.match(cv.url, /^https:\/\/nelsonsous\.github\.io\/escolaplay\/musica\/\?ligar=/);
    assert.equal((await post('/api/convites', {})).status, 401);
    // a convidada liga o seu Tidal com o código do convite
    const r = await post('/api/ligar', { codigo: cv.codigo, nome: 'telemóvel da Ana' });
    assert.equal(r.status, 200);
    const state = new URL((await r.json()).url).searchParams.get('state');
    // com a conta do Tidal do dono, não: cada pessoa entra com a sua (e o convite não se gasta)
    const comDono = await call(`/tidal/retorno?code=CODIGO-BOM&state=${state}`);
    assert.match(decodeURIComponent(comDono.headers.get('location')), /#erro=Essa é a conta do Tidal de quem montou a app/);
    const state2 = new URL((await (await post('/api/ligar', { codigo: cv.codigo, nome: 'telemóvel da Ana' })).json()).url).searchParams.get('state');
    const volta = await call(`/tidal/retorno?code=CODIGO-ANA&state=${state2}`);
    const chaveAna = decodeURIComponent(volta.headers.get('location').split('#chave=')[1] || '');
    assert.ok(chaveAna.length > 20, 'a convidada recebe a chave do seu aparelho');
    assert.equal((await post('/api/ligar', { codigo: cv.codigo })).status, 401, 'o convite gasta-se');
    // cada uma com a sua biblioteca e os seus pedidos
    await post('/api/pedidos', { texto: 'Fado para a Ana' }, chaveAna);
    assert.deepEqual((await (await get('/api/pedidos', chaveAna)).json()).map((x) => x.texto), ['Fado para a Ana']);
    assert.deepEqual(await (await get('/api/pedidos', chave)).json(), [], 'o dono não vê os pedidos da Ana');
    const est = await (await get('/api/estado', chaveAna)).json();
    assert.equal(est.dono, false);
    assert.equal(est.ligado, true);
    assert.equal(est.pedidos, 1);
    assert.equal((await (await get('/api/estado', chave)).json()).dono, true);
    assert.equal((await post('/api/convites', {}, chaveAna)).status, 403, 'só o dono convida');
    // os dados da Ana ficam no espaço dela; os do dono onde sempre estiveram
    const us = await (await get('/api/utilizadores', agente)).json();
    assert.equal(us.length, 2);
    const ana = us.find((u) => u.uid !== 'dono');
    assert.equal(ana.pedidos, 1);
    assert.equal(ana.ligado, true);
    assert.ok(await env.KV.get(`u:${ana.uid}:tidal:tokens`));
    assert.ok(await env.KV.get('tidal:tokens'));
    // o Maestro trata os pedidos de cada pessoa com ?u=
    assert.equal((await (await get(`/api/pedidos?u=${ana.uid}`, agente)).json())[0].texto, 'Fado para a Ana');
    assert.deepEqual(await (await get('/api/pedidos', agente)).json(), [], 'sem ?u= é o dono');
    assert.equal((await get('/api/utilizadores', chave)).status, 403, 'a lista de pessoas é só para o Maestro');
    assert.equal((await get('/api/pedidos?u=u-nao-existe', agente)).status, 404);
    // um convite novo com a mesma conta do Tidal da Ana volta à biblioteca dela (não cria outra pessoa, vazia)
    const cv2 = await (await post('/api/convites', {}, chave)).json();
    const st3 = new URL((await (await post('/api/ligar', { codigo: cv2.codigo })).json()).url).searchParams.get('state');
    const chaveAna2 = decodeURIComponent((await call(`/tidal/retorno?code=CODIGO-ANA&state=${st3}`)).headers.get('location').split('#chave=')[1] || '');
    assert.deepEqual((await (await get('/api/pedidos', chaveAna2)).json()).map((x) => x.texto), ['Fado para a Ana']);
    assert.equal((await (await get('/api/utilizadores', agente)).json()).length, 2, 'continuam a ser 2 pessoas');
    // desligar o Tidal da Ana não mexe no do dono
    await post('/api/desligar', {}, chaveAna);
    assert.equal(await env.KV.get(`u:${ana.uid}:tidal:tokens`), null);
    assert.ok(await env.KV.get('tidal:tokens'));
});

test('ligar outro aparelho: cada pessoa cria um código de uma vez; o aparelho novo fica com a biblioteca dela', async () => {
    const { chave } = await ligarPrimeiraVez();
    const agente = await env.KV.get('agente:chave');
    // uma convidada entra pelo convite (no Safari)
    const cv = await (await post('/api/convites', {}, chave)).json();
    const state = new URL((await (await post('/api/ligar', { codigo: cv.codigo })).json()).url).searchParams.get('state');
    const volta = await call(`/tidal/retorno?code=CODIGO-ANA&state=${state}`);
    const chaveAna = decodeURIComponent(volta.headers.get('location').split('#chave=')[1]);
    await post('/api/pedidos', { texto: 'Fado para a Ana' }, chaveAna);
    // a app do ecrã principal tem outro armazém: o convite já não serve lá
    assert.equal((await post('/api/aparelho', { codigo: cv.codigo })).status, 401);
    // no aparelho onde entrou, cria um código; no outro, escreve-o (à mão, em minúsculas, com um espaço)
    const cod = await (await post('/api/aparelho/codigo', {}, chaveAna)).json();
    assert.match(cod.codigo, /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    const novo = await post('/api/aparelho', { codigo: cod.codigo.toLowerCase().replace('-', ' ') });
    assert.equal(novo.status, 201);
    const chave2 = (await novo.json()).chave;
    assert.deepEqual((await (await get('/api/pedidos', chave2)).json()).map((x) => x.texto), ['Fado para a Ana'], 'a biblioteca dela, não a do dono');
    assert.equal((await post('/api/aparelho', { codigo: cod.codigo })).status, 401, 'o código gasta-se');
    // o Maestro (agente) também o cria para uma pessoa (?u=); sem chave, não
    const uid = (await (await get('/api/utilizadores', agente)).json()).find((u) => u.uid !== 'dono').uid;
    const c2 = await (await post(`/api/aparelho/codigo?u=${uid}`, {}, agente)).json();
    const chave3 = (await (await post('/api/aparelho', { codigo: c2.codigo })).json()).chave;
    assert.equal((await (await get('/api/pedidos', chave3)).json()).length, 1);
    assert.equal((await post('/api/aparelho/codigo', {})).status, 401);
    // e o dono também liga outro aparelho seu assim
    const c3 = await (await post('/api/aparelho/codigo', {}, chave)).json();
    const chave4 = (await (await post('/api/aparelho', { codigo: c3.codigo })).json()).chave;
    assert.equal((await (await get('/api/estado', chave4)).json()).dono, true);
});

test('tendências: o retrato de cada dia, o que sobe, o que é novo, o que dura, e o que é do teu gosto', async () => {
    const { recolher } = await import('../proxy/src/tendencias.js');
    const { chave } = await ligarPrimeiraVez();
    await get('/api/perfil', chave); // o perfil fica guardado (segue a Nina Simone; favoritas de Miles Davis, ...)
    assert.deepEqual(await (await get('/api/tendencias', chave)).json(), { dias: 0, fontes: [], paraTi: [] }, 'antes da primeira recolha');
    const enche = (n, pre) => Array.from({ length: n }, (_, i) => [`${pre} ${i}`, `Canção ${i}`, 'Pop']);
    const D = Date.parse('2026-10-01T04:23:00Z');
    sim.tabelas.mundo = [['Artista Mundo', 'Global', ''], ['NINA SIMONE', 'Feeling Good', '']];
    sim.tabelas.eua = [['Nina Simone & Convidado', 'Feeling Good (feat. Convidado)', 'Jazz']];
    // 25 dias: «Feeling Good» sempre lá (dura); «Subida» de 40.º a 5.º na última semana; «Estreia» entra no dia 22
    for (let d = 0; d < 25; d++) {
        const lista = enche(60, 'Enchimento');
        lista.splice(10, 0, ['Nina Simone', 'Feeling Good', 'Jazz']);
        const sub = d < 18 ? 40 : 40 - (d - 17) * 5;
        lista.splice(sub - 1, 0, ['Alguém', 'Subida', 'Pop']);
        if (d >= 21) lista.splice(2, 0, ['Miles Davis', 'Estreia (feat. Alguém)', 'Jazz']);
        sim.tabelas.pt = lista;
        sim.tabelaFalha = d === 3 ? 'mundo' : null; // uma tabela pode falhar num dia: as outras guardam-se
        const r = await recolher(env, D + d * 864e5);
        assert.equal(r.ok, true);
        if (d === 3) assert.deepEqual(r.erros, ['mundo: HTTP 503']);
    }
    const t = await (await get('/api/tendencias', chave)).json();
    assert.equal(t.dias, 25);
    assert.equal(t.desde, '2026-10-01');
    assert.deepEqual(t.fontes.map((f) => f.id), ['pt', 'mundo', 'eua']);
    const pt = t.fontes[0].itens, de = (titulo) => pt.find((x) => x.titulo === titulo);
    assert.equal(de('Subida').estado, 'sobe');
    assert.ok(de('Subida').semana - de('Subida').pos >= 10);
    assert.equal(de('Estreia (feat. Alguém)').estado, 'nova');
    assert.equal(de('Feeling Good').estado, 'dura');
    assert.equal(de('Feeling Good').dias, 25);
    assert.equal(de('Canção 50').estado, 'dura');
    // para ti: a Nina Simone (segues), o Miles Davis (nas favoritas), sem repetir a mesma canção noutras tabelas
    assert.deepEqual(t.paraTi.slice(0, 2).map((x) => `${x.artista} — ${x.titulo} · ${x.porque}`),
        ['Miles Davis — Estreia (feat. Alguém) · nas favoritas', 'Nina Simone — Feeling Good · segues']);
    assert.equal(t.paraTi.filter((x) => x.titulo === 'Feeling Good').length, 1, 'está em três tabelas (uma com convidado): aparece uma vez');
    // recolher à mão: só o dono e o Maestro
    const agente = await env.KV.get('agente:chave');
    assert.equal((await post('/api/tendencias/recolher', {}, agente)).status, 200);
    assert.equal((await post('/api/tendencias/recolher', {})).status, 401);
});

test('sem letras explícitas: o resolver procura a versão limpa (também quando vem pelo id ou pelo ISRC); o pedido guarda a opção', async () => {
    const { chave } = await ligarPrimeiraVez();
    const faixas = [{ artista: 'Pop Teste', titulo: 'Canção Forte' }, { artista: 'Pop Teste', titulo: 'Canção Forte', tidalId: '107' }, { artista: 'Pop Teste', titulo: 'Canção Forte', isrc: 'USAAA0000107' }];
    const normal = await (await post('/api/resolver', { faixas }, chave)).json();
    assert.deepEqual(normal.faixas.map((f) => f.id), ['107', '107', '107'], 'sem a opção: a mais popular, que é a explícita');
    assert.equal(normal.faixas[0].explicita, true);
    const limpa = await (await post('/api/resolver', { faixas, limpa: true }, chave)).json();
    assert.deepEqual(limpa.faixas.map((f) => f.id), ['108', '108', '108']);
    assert.ok(limpa.faixas.every((f) => !f.explicita));
    // só explícita, sem versão limpa: não serve
    const so = await (await post('/api/resolver', { faixas: [{ artista: 'Pop Teste', titulo: 'Só Explícita', tidalId: '109' }, { artista: 'Miles Davis', titulo: 'So What' }], limpa: true }, chave)).json();
    assert.deepEqual(so.faixas.map((f) => f?.id ?? null), [null, '101']);
    const ped = await (await post('/api/pedidos', { texto: 'Para a Eduarda, no carro', opcoes: { faixas: 20, limpa: true } }, chave)).json();
    assert.equal(ped.opcoes.limpa, true);
    const ped2 = await (await post('/api/pedidos', { texto: 'Para mim', opcoes: { faixas: 20 } }, chave)).json();
    assert.equal('limpa' in ped2.opcoes, false);
});

test('como correu: guardadas nas favoritas, tiradas e juntadas no Tidal, eco nas mixes, apagada; atualizar sozinha e renovar', async () => {
    const { chave } = await ligarPrimeiraVez();
    const agente = await env.KV.get('agente:chave');
    const res = await (await post('/api/resolver', { faixas: ['Get Lucky', 'Teardrop', 'Barco Negro', 'Faixa 0', 'Faixa 1', 'Só Explícita'].map((titulo) => ({ artista: titulo.startsWith('Faixa') ? 'Miles Davis' : '', titulo })) }, chave)).json();
    const doc = await (await post('/api/playlists', { nome: 'Para o carro', pedido: 'Faixas para o carro', opcoes: { faixas: 5, limpa: true }, faixas: res.faixas, tidal: true }, agente)).json();
    assert.equal((await (await get('/api/avaliacoes', agente)).json()).playlists[0].avaliacao.etiqueta, 'ainda cedo');
    // avaliar outra vez sem nada de novo não escreve na KV (a gratuita dá 1000 escritas por dia)
    const e0 = env.KV.escritas;
    assert.equal((await (await get('/api/avaliacoes', agente)).json()).playlists[0].avaliacao.etiqueta, 'ainda cedo');
    assert.equal(env.KV.escritas - e0, 0, 'avaliar sem mudanças não escreve');
    // o que a pessoa fez: guardou o «Get Lucky», tirou a «Faixa 0» e juntou outra no Tidal; e o Tidal pôs a Pop Teste
    // nas mixes (o Massive Attack já lá estava antes: não conta)
    sim.listas['mix-dia'].push({ id: '109', itemId: 'm9' });
    sim.favoritasNovas = [{ id: '103', addedAt: new Date(Date.now() + 1000).toISOString() }];
    const pid = doc.tidal.id;
    sim.listas[pid] = sim.listas[pid].filter((x) => x.id !== '200');
    sim.listas[pid].push({ id: '210', itemId: 'it-juntada' });
    await get('/api/perfil?fresco=1', chave);
    const a = (await (await get('/api/avaliacoes', agente)).json()).playlists[0];
    assert.equal(a.id, doc.id);
    assert.deepEqual(a.avaliacao.guardadas.map((x) => x.titulo), ['Get Lucky']);
    assert.deepEqual(a.avaliacao.tiradas.map((x) => x.titulo), ['Faixa 0']);
    assert.equal(a.avaliacao.juntadas, 1);
    assert.deepEqual(a.avaliacao.eco, ['Pop Teste'], 'apareceu nas mixes depois da playlist, e não está nas favoritas');
    assert.equal(a.avaliacao.nota, 66);
    assert.equal(a.avaliacao.etiqueta, 'boa');
    assert.equal(a.opcoes.limpa, true);
    const idx = await (await get('/api/playlists', chave)).json();
    assert.deepEqual(idx[0].avaliacao, { nota: 66, etiqueta: 'boa', guardadas: 1, tiradas: 1 });
    // atualizar sozinha: liga-se na app; o Maestro renova-a no mesmo link do Tidal
    assert.equal((await (await post(`/api/playlists/${doc.id}/renovar`, { ativo: true }, chave)).json()).renovar, true);
    assert.equal((await (await get('/api/playlists', chave)).json())[0].renovar, true);
    const nova = (await (await post('/api/resolver', { faixas: [{ titulo: 'Get Lucky' }, { titulo: 'So What' }, { artista: 'Miles Davis', titulo: 'Faixa 4' }] }, agente)).json()).faixas;
    const ren = await (await post(`/api/playlists/${doc.id}/renovacoes`, { faixas: nova, custo: 7, resumo: 'Renovada: fica o que guardaste.', opcoes: { faixas: 3, limpa: true }, tidal: true, modelo: 'm' }, agente)).json();
    assert.equal(ren.id, doc.id);
    assert.equal(ren.tidal.id, pid, 'a mesma playlist no Tidal');
    assert.deepEqual(sim.listas[pid].map((x) => x.id), ['103', '101', '204']);
    assert.ok(ren.renovadaEm && ren.renovacoes === 1 && !ren.avaliacao && ren.historico[0].etiqueta === 'boa');
    assert.equal(ren.renovar, true);
    // apagada no Tidal
    sim.apagadas.push(pid);
    const ap = (await (await get('/api/avaliacoes', agente)).json()).playlists[0].avaliacao;
    assert.deepEqual([ap.etiqueta, ap.nota], ['apagaste', 5]);
    assert.equal((await post(`/api/playlists/${doc.id}/renovar`, { ativo: false }, chave)).status, 200);
    assert.equal('renovar' in (await (await get('/api/playlists', chave)).json())[0], false);
});

test('mudar o nome: na app e no Tidal (o mesmo link); sem nome, não; a renovação mantém o nome', async () => {
    const { chave } = await ligarPrimeiraVez();
    const agente = await env.KV.get('agente:chave');
    const res = await (await post('/api/resolver', { faixas: [{ titulo: 'So What' }, { titulo: 'Teardrop' }] }, chave)).json();
    const doc = await (await post('/api/playlists', { nome: 'Nome do Maestro', descricao: 'A do Maestro.', faixas: res.faixas, tidal: true }, agente)).json();
    assert.equal((await post(`/api/playlists/${doc.id}/nome`, { nome: '   ' }, chave)).status, 400);
    const r = await (await post(`/api/playlists/${doc.id}/nome`, { nome: '  Jazz  do   carro ', descricao: 'Para o BMW.' }, chave)).json();
    assert.deepEqual([r.nome, r.descricao, r.tidal.id], ['Jazz do carro', 'Para o BMW.', doc.tidal.id]);
    assert.deepEqual(sim.renomeadas, [{ id: doc.tidal.id, name: 'Jazz do carro', description: 'Para o BMW.', accessType: undefined }].map(({ accessType, ...x }) => x));
    assert.equal((await (await get('/api/playlists', chave)).json())[0].nome, 'Jazz do carro');
    // só o nome: a descrição fica
    assert.equal((await (await post(`/api/playlists/${doc.id}/nome`, { nome: 'Jazz do carro 2' }, chave)).json()).descricao, 'Para o BMW.');
    // o Maestro renova-a: o nome que a pessoa deu fica
    const ren = await (await post(`/api/playlists/${doc.id}/renovacoes`, { nome: 'Outro nome do Maestro', faixas: res.faixas, tidal: true }, agente)).json();
    assert.equal(ren.nome, 'Jazz do carro 2');
});

test('propostas, ideias e afinar: várias versões só na app, escolher uma para o Tidal, «não esta» e o pedido de afinação', async () => {
    const { chave } = await ligarPrimeiraVez();
    const agente = await env.KV.get('agente:chave');
    const ped = await (await post('/api/pedidos', { texto: 'Para o carro, de noite', opcoes: { faixas: 5 } }, chave)).json();
    const res = (await (await post('/api/resolver', { faixas: [{ titulo: 'So What' }, { titulo: 'Teardrop' }, { titulo: 'Barco Negro' }] }, chave)).json()).faixas;
    // duas propostas para o mesmo pedido: só na app, agrupadas pelo pedido
    const a = await (await post('/api/playlists', { nome: 'Noite A', pedido: ped.texto, faixas: res, tidal: true, rascunho: true, grupo: ped.id, variante: 'Mais conhecida' }, agente)).json();
    const b = await (await post('/api/playlists', { nome: 'Noite B', pedido: ped.texto, faixas: res.slice(1), tidal: true, rascunho: true, grupo: ped.id, variante: 'Mais descoberta' }, agente)).json();
    assert.equal(a.tidal, null);
    assert.equal(sim.criadas.length, 0, 'as propostas não vão para o Tidal');
    await call(`/api/pedidos/${ped.id}?playlist=${a.id}`, { method: 'DELETE', headers: { authorization: `Bearer ${agente}` } });
    await call(`/api/pedidos/${ped.id}?playlist=${b.id}`, { method: 'DELETE', headers: { authorization: `Bearer ${agente}` } });
    const pf = (await (await get('/api/pedidos', chave)).json()).find((x) => x.id === ped.id);
    assert.deepEqual([pf.estado, pf.playlist, pf.playlists], ['feito', a.id, [a.id, b.id]]);
    const idx = await (await get('/api/playlists', chave)).json();
    assert.deepEqual(idx.slice(0, 2).map((x) => [x.variante, x.grupo, x.rascunho, x.pedido]), [['Mais descoberta', ped.id, true, ped.texto], ['Mais conhecida', ped.id, true, ped.texto]]);
    assert.equal((await (await get('/api/avaliacoes', agente)).json()).playlists.length, 0, 'as propostas por escolher não se avaliam');
    // escolher uma: vai para o Tidal e deixa de ser proposta
    const e = await (await post(`/api/playlists/${a.id}/tidal`, {}, chave)).json();
    assert.equal(e.tidal.id, 'uuid-nova');
    assert.equal(e.rascunho, undefined);
    assert.equal((await (await get('/api/playlists', chave)).json()).find((x) => x.id === a.id).rascunho, undefined);
    // não esta + afinar: um pedido ligado à playlist, com as rejeitadas
    assert.equal((await post(`/api/playlists/${a.id}/afinar`, { texto: '' }, chave)).status, 400);
    assert.deepEqual((await (await post(`/api/playlists/${a.id}/rejeitar`, { faixa: '106' }, chave)).json()).rejeitadas, ['106']);
    assert.deepEqual((await (await post(`/api/playlists/${a.id}/rejeitar`, { faixa: '105' }, chave)).json()).rejeitadas, ['106', '105']);
    assert.deepEqual((await (await post(`/api/playlists/${a.id}/rejeitar`, { faixa: '105', fora: false }, chave)).json()).rejeitadas, ['106']);
    assert.equal((await post(`/api/playlists/${a.id}/rejeitar`, { faixa: '999' }, chave)).status, 400);
    const af = await (await post(`/api/playlists/${a.id}/afinar`, { texto: 'menos eletrónica' }, chave)).json();
    assert.deepEqual([af.texto, af.estado, af.afinar.playlist, af.afinar.rejeitadas.map((x) => x.titulo)], ['menos eletrónica', 'pendente', a.id, ['Teardrop']]);
    // a playlist guarda as afinações pedidas: à espera, depois feita; uma cancelada sai
    const afs = async () => (await (await get(`/api/playlists/${a.id}`, chave)).json()).afinacoes.map((x) => [x.texto, x.rejeitadas, !!x.feitoEm]);
    assert.deepEqual(await afs(), [['menos eletrónica', 1, false]]);
    const af2 = await (await post(`/api/playlists/${a.id}/afinar`, { texto: 'mais curta' }, chave)).json();
    assert.equal((await call(`/api/pedidos/${af2.id}`, { method: 'DELETE', headers: { authorization: `Bearer ${chave}` } })).status, 200);
    assert.deepEqual(await afs(), [['menos eletrónica', 1, false]], 'a cancelada sai');
    // o Maestro refá-la no mesmo sítio: as rejeitadas ficam aplicadas; a proposta B continua só na app
    const ren = await (await post(`/api/playlists/${a.id}/renovacoes`, { faixas: res.filter((f) => f.id !== '106'), tidal: true }, agente)).json();
    assert.equal(ren.rejeitadas, undefined);
    await call(`/api/pedidos/${af.id}?playlist=${a.id}`, { method: 'DELETE', headers: { authorization: `Bearer ${agente}` } });
    assert.deepEqual(await afs(), [['menos eletrónica', 1, true]], 'feita');
    const feita = (await (await get(`/api/playlists/${a.id}`, chave)).json()).afinacoes[0];
    assert.deepEqual([feita.entraram, feita.sairam, feita.novas], [0, 1, []], 'o que mudou: saiu a «Não esta»');
    assert.ok((await (await get('/api/playlists', chave)).json()).find((x) => x.id === a.id).afinadaEm, 'a lista sabe que foi afinada');
    assert.equal((await (await post(`/api/playlists/${b.id}/renovacoes`, { faixas: res, tidal: true }, agente)).json()).tidal, null);
    // apagar uma playlist tira as afinações dela que estavam à espera (o Maestro já não tem onde as fazer)
    const afB = await (await post(`/api/playlists/${b.id}/afinar`, { texto: 'mais calma' }, chave)).json();
    await call(`/api/playlists/${b.id}`, { method: 'DELETE', headers: { authorization: `Bearer ${chave}` } });
    assert.equal((await (await get('/api/pedidos', chave)).json()).some((x) => x.id === afB.id), false);
    // as ideias: só o Maestro as escreve
    assert.deepEqual(await (await get('/api/ideias', chave)).json(), { ideias: [] });
    assert.equal((await post('/api/ideias', { ideias: [{ texto: 'x x x' }] }, chave)).status, 403);
    const id = await (await post('/api/ideias', { ideias: [{ texto: 'Estrada ao sol', momento: 'dia', porque: 'Sexta à tarde e o Get Lucky resultou: mais funk para a estrada', opcoes: { arco: 'sobe' } }, { texto: 'Condução à noite', momento: 'noite', opcoes: { estilo: 'audiofilo' } }, { texto: 'ok' }, { texto: 'Sempre bom', momento: 'tarde' }] }, agente)).json();
    assert.deepEqual([id.n, id.dia, id.noite], [3, 1, 1]);
    assert.deepEqual((await (await get('/api/ideias', chave)).json()).ideias, [{ texto: 'Estrada ao sol', momento: 'dia', porque: 'Sexta à tarde e o Get Lucky resultou: mais funk para a estrada', arco: 'sobe' }, { texto: 'Condução à noite', momento: 'noite', estilo: 'audiofilo' }, { texto: 'Sempre bom', momento: 'sempre' }]);
});

test('ouvir 30 s e capas: a pré-escuta e a capa do Deezer (pelo ISRC ou pela pesquisa), guardadas; o género e a capa da playlist no índice', async () => {
    const { chave } = await ligarPrimeiraVez();
    const res = (await (await post('/api/resolver', { faixas: [{ titulo: 'So What' }, { titulo: 'Feeling Good' }, { titulo: 'Barco Negro' }, { titulo: 'Teardrop' }] }, chave)).json()).faixas;
    const doc = await (await post('/api/playlists', { nome: 'Ouvir', faixas: res.map((f, i) => ({ ...f, genero: i < 3 ? 'jazz' : 'trip-hop' })) }, chave)).json();
    assert.equal(doc.faixas[0].isrc, 'USAAA0000101', 'a faixa guarda o ISRC');
    const e0 = env.KV.escritas;
    const p = (await (await get(`/api/playlists/${doc.id}/previas`, chave)).json()).previas;
    assert.ok(env.KV.escritas - e0 <= 3, `poucas escritas na KV (a 1.ª vez: as pré-escutas, a playlist e o índice): ${env.KV.escritas - e0}`);
    assert.deepEqual(Object.keys(p).sort(), ['101', '102', '106']);
    assert.match(p[101], /^https:\/\/cdn\.deezer\.example\/So%20What\.mp3\?hdnea=exp=\d+/);
    assert.match(p[102], /feeling-good\.mp3/, 'pelo ISRC');
    // a segunda vez vem tudo da KV (também o «não há» da «Barco Negro»)
    const antes = sim.chamadas.length;
    assert.deepEqual((await (await get(`/api/playlists/${doc.id}/previas`, chave)).json()).previas, p);
    assert.equal(sim.chamadas.slice(antes).filter((x) => /deezer/.test(x)).length, 0);
    assert.equal((await (await get('/api/playlists', chave)).json())[0].genero, 'jazz');
    // a capa de cada faixa vem do Tidal (160 px, a edição que está na playlist); a «Teardrop», sem capa no Tidal, vem do
    // Deezer (120 px). Para a lista, o mosaico de 4 em pequeno. A segunda vez, nada vai ao Tidal nem ao Deezer
    const c = (await (await get(`/api/playlists/${doc.id}/previas`, chave)).json()).capas;
    assert.deepEqual(Object.keys(c).sort(), ['101', '102', '105', '106']);
    assert.match(c[101], /^https:\/\/resources\.tidal\.com\/images\/[0-9a-f/]+\/160x160\.jpg$/);
    assert.match(c[106], /^https:\/\/cdn-images\.dzcdn\.net\/images\/cover\/[0-9a-f]{32}\/120x120-000000-80-0-0\.jpg$/, 'reserva: o Deezer');
    assert.deepEqual((await (await get('/api/playlists', chave)).json())[0].capas,
        [c[101].replace('160x160', '80x80'), c[102].replace('160x160', '80x80'), c[105].replace('160x160', '80x80'), c[106].replace('/120x120-', '/56x56-')]);
    const antes2 = sim.chamadas.length, e1 = env.KV.escritas;
    assert.deepEqual((await (await get(`/api/playlists/${doc.id}/previas`, chave)).json()).capas, c);
    assert.equal(sim.chamadas.slice(antes2).filter((x) => /deezer|\/albums|\/tracks/.test(x)).length, 0);
    assert.equal(env.KV.escritas - e1, 0, 'abrir outra vez não escreve nada');
    // com a KV cheia (limite do dia), responde na mesma
    const doc2 = await (await post('/api/playlists', { nome: 'Cheia', faixas: res }, chave)).json();
    env.KV.cheia = true;
    const r2 = await get(`/api/playlists/${doc2.id}/previas`, chave);
    // e o que tem mesmo de gravar (um pedido) diz porquê, em vez de «erro interno»
    const r3 = await post('/api/pedidos', { texto: 'Jazz para domingo' }, chave);
    env.KV.cheia = false;
    assert.equal(r3.status, 503);
    assert.match((await r3.json()).message, /gravações grátis do Cloudflare.*meia-noite/);
    assert.equal(r2.status, 200);
    assert.deepEqual(Object.keys((await r2.json()).previas).sort(), ['101', '102', '106']);
});

// ---------- avisos no telemóvel (Web Push) ----------
// o lado do telemóvel: chave ECDH P-256 e segredo de 16 bytes, como o browser cria; decifra como o browser (RFC 8291)
const te = new TextEncoder(), td = new TextDecoder();
async function telemovel(endpoint) {
    const kp = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
    const pub = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey));
    const auth = crypto.getRandomValues(new Uint8Array(16));
    return { sub: { endpoint, keys: { p256dh: b64u(pub), auth: b64u(auth) } }, kp, pub, auth };
}
async function hkdf(salt, ikm, info, n) {
    const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
    return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, k, n * 8));
}
async function decifrar(body, { kp, pub, auth }) {
    const salt = body.slice(0, 16), idlen = body[20], asPub = body.slice(21, 21 + idlen);
    const asKey = await crypto.subtle.importKey('raw', asPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
    const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: asKey }, kp.privateKey, 256));
    const ikm = await hkdf(auth, shared, new Uint8Array([...te.encode('WebPush: info\0'), ...pub, ...asPub]), 32);
    const cek = await hkdf(salt, ikm, te.encode('Content-Encoding: aes128gcm\0'), 16), nonce = await hkdf(salt, ikm, te.encode('Content-Encoding: nonce\0'), 12);
    const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']);
    const plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, key, body.slice(21 + idlen)));
    return JSON.parse(td.decode(plain.slice(0, -1)));
}

test('avisos no telemóvel: ligar, teste, «propostas prontas» uma vez por pedido, «afinada», «pronta», «revista», assinatura caducada sai, desligar', async () => {
    const { chave } = await ligarPrimeiraVez();
    const agente = await env.KV.get('agente:chave');
    const { chave: vapid } = await (await get('/api/push/chave', chave)).json();
    assert.equal(b64uDecode(vapid).length, 65, 'a chave pública VAPID (P-256)');
    assert.equal((await (await get('/api/push/chave', chave)).json()).chave, vapid, 'criada uma vez');
    const tel = await telemovel('https://web.push.apple.com/QGtelemovel');
    assert.equal((await post('/api/push', { subscription: { endpoint: 'https://exemplo.com/x', keys: tel.sub.keys } }, chave)).status, 400, 'só serviços de notificações conhecidos');
    assert.equal((await post('/api/push/teste', {}, chave)).status, 409, 'ainda sem avisos');
    assert.equal((await post('/api/push', { subscription: tel.sub }, chave)).status, 201);
    assert.deepEqual(await (await post('/api/push/teste', {}, chave)).json(), { enviados: 1, falhados: 0 });
    const ultimo = () => sim.pushes[sim.pushes.length - 1];
    assert.equal(ultimo().encoding, 'aes128gcm');
    assert.match(ultimo().authorization, /^vapid t=.+, k=/);
    assert.equal((await decifrar(ultimo().body, tel)).body, 'Os avisos estão ligados neste telemóvel.');
    // um pedido com duas propostas: um só aviso, quando fica feito
    const ped = await (await post('/api/pedidos', { texto: 'Fado para o jantar' }, chave)).json();
    const faixas = [{ id: '101', titulo: 'So What', artistas: ['Miles Davis'], duracao: 200 }];
    const a = await (await post('/api/playlists', { nome: 'Fado A', faixas, rascunho: true, grupo: ped.id, variante: 'A' }, agente)).json();
    const b = await (await post('/api/playlists', { nome: 'Fado B', faixas, rascunho: true, grupo: ped.id, variante: 'B' }, agente)).json();
    const n = sim.pushes.length;
    const feito = (pid, pl) => call(`/api/pedidos/${pid}?playlist=${pl}`, { method: 'DELETE', headers: { authorization: `Bearer ${agente}` } });
    await feito(ped.id, a.id);
    await feito(ped.id, b.id);
    assert.equal(sim.pushes.length, n + 1, 'um aviso por pedido, não por proposta');
    assert.deepEqual(await decifrar(ultimo().body, tel), { title: 'Propostas prontas', body: '«Fado para o jantar»: escolhe a que vai para o Tidal.',
        url: 'https://nelsonsous.github.io/escolaplay/musica/', tag: 'musica-pedido' });
    // a afinação feita: «foi afinada»
    const af = await (await post(`/api/playlists/${a.id}/afinar`, { texto: 'mais guitarra' }, chave)).json();
    await feito(af.id, a.id);
    assert.deepEqual(await decifrar(ultimo().body, tel), { title: 'Playlist afinada', body: '«Fado A» foi afinada pelo Maestro.',
        url: 'https://nelsonsous.github.io/escolaplay/musica/', tag: 'musica-afinar' });
    // um pedido dá uma playlist, logo no Tidal: «Playlist pronta»
    const ped2 = await (await post('/api/pedidos', { texto: 'Jazz para a estrada' }, chave)).json();
    const c = await (await post('/api/playlists', { nome: 'Estrada', pedido: ped2.texto, faixas, tidal: true }, agente)).json();
    assert.ok(c.tidal);
    await feito(ped2.id, c.id);
    assert.deepEqual(await decifrar(ultimo().body, tel), { title: 'Playlist pronta', body: '«Jazz para a estrada»: já está no teu Tidal.',
        url: 'https://nelsonsous.github.io/escolaplay/musica/', tag: 'musica-pedido' });
    // as parecidas do Tidal revistas pelo Maestro: «foi revista»
    const m = await (await post('/api/mais', { faixa: '101' }, chave)).json();
    await feito(m.afinacoes[0].pedido, m.id);
    assert.deepEqual(await decifrar(ultimo().body, tel), { title: 'Playlist revista', body: '«Parecidas com So What» foi revista pelo Maestro.',
        url: 'https://nelsonsous.github.io/escolaplay/musica/', tag: 'musica-afinar' });
    // o serviço diz que a assinatura caducou (410): sai, e deixa de haver avisos
    sim.pushStatus['https://web.push.apple.com/QGtelemovel'] = 410;
    assert.deepEqual(await (await post('/api/push/teste', {}, chave)).json(), { enviados: 0, falhados: 1 });
    assert.equal((await post('/api/push/teste', {}, chave)).status, 409);
    // ligar outra vez e desligar
    delete sim.pushStatus['https://web.push.apple.com/QGtelemovel'];
    await post('/api/push', { subscription: tel.sub }, chave);
    const des = await call('/api/push', { method: 'DELETE', headers: { authorization: `Bearer ${chave}`, 'content-type': 'application/json' }, body: JSON.stringify({ endpoint: tel.sub.endpoint }) });
    assert.equal(des.status, 200);
    assert.equal((await post('/api/push/teste', {}, chave)).status, 409, 'desligados');
});
