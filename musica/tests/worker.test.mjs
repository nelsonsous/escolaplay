// Rotas do Worker com o Tidal e a KV simulados: ligação (código + PKCE), gosto, encontrar faixas,
// criar playlists no Tidal, renovar o token e pedidos ao Curador.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import worker from '../proxy/src/worker.js';
import { simulador, kv } from './simulador.mjs';

const ORIGIN = 'https://musica.example.workers.dev';
const sha = (s) => createHash('sha256').update(s).digest('hex');
const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

let env, sim;
const ctx = { waitUntil() {} };
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
    assert.deepEqual(await r.json(), { versao: '1.4.1', clientId: true, ligado: false, retorno: ORIGIN + '/tidal/retorno' });
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

test('pedidos ao Curador: criar, listar, marcar feito, cancelar', async () => {
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
    assert.equal(v.por, 'curador', 'quem a fez continua a ser o Curador');
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

test('mais como esta: uma playlist de faixas parecidas, logo no Tidal', async () => {
    const { chave } = await ligarPrimeiraVez();
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
});

test('para o Curador: as tuas mixes do Tidal e as novidades dos artistas que segues', async () => {
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
