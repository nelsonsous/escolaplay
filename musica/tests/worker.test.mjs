// Rotas do Worker com o Tidal e a KV simulados: ligação (código + PKCE), gosto, encontrar faixas,
// criar playlists no Tidal, renovar o token e pedidos ao Maestro.
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
    assert.deepEqual(await r.json(), { versao: '1.16.0', clientId: true, ligado: false, retorno: ORIGIN + '/tidal/retorno' });
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

test('juntar playlists: uma faixa de cada, à vez, sem repetidas; fica só na app; pelo menos 2', async () => {
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
    assert.equal(d.tidal, null, 'fica só na app (envia-se depois)');
    assert.equal(d.por, 'app');
    const idx = await (await get('/api/playlists', chave)).json();
    assert.equal(idx[0].id, d.id);
    assert.deepEqual(idx[0].capas, ['https://img/a.jpg']);
    assert.equal((await post('/api/juntar', { ids: [a.id] }, chave)).status, 400);
    assert.equal((await post('/api/juntar', { ids: [a.id, 'pnaoexiste'] }, chave)).status, 404);
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
    const volta = await call(`/tidal/retorno?code=CODIGO-BOM&state=${state}`);
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
    const volta = await call(`/tidal/retorno?code=CODIGO-BOM&state=${state}`);
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
    assert.equal((await (await post(`/api/playlists/${b.id}/renovacoes`, { faixas: res, tidal: true }, agente)).json()).tidal, null);
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
