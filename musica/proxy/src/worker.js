// Conector da app Música (Cloudflare Worker), como o meteo/proxy e o mercados/proxy: fala com a API oficial do Tidal
// em nome do dono (OAuth com PKCE, tokens na KV), lê o teu gosto, encontra faixas e cria playlists na tua conta,
// e guarda a biblioteca de playlists do Curador (tarefa agendada do Claude). A app em si está no GitHub Pages.
// Plano gratuito: 10 ms de CPU e 50 pedidos externos por pedido — o motor Onda corre no telemóvel e na tarefa
// agendada; aqui só se fala com o Tidal, em lotes pequenos.
import { API, LOGIN, TOKEN, SCOPES, JSONAPI, MAX_IDS, MAX_ITENS, faixas as lerFaixas, indexar, melhor } from '../../lib/tidal.js';
import { normalizarOpcoes } from '../../lib/playlist.js';
import { perfilGosto, sinais } from '../../lib/sinais.js';

const VERSION = '1.5.0';
const CORS = { 'access-control-allow-origin': '*' };
const PERFIL_TTL = 6 * 3600 * 1000;
const MAX_RESOLVER = 10; // faixas por pedido a /api/resolver (cada uma é uma pesquisa no Tidal)
const MAX_PLAYLISTS = 200, MAX_PEDIDOS = 20;

class Erro extends Error {
    constructor(status, codigo, mensagem) { super(mensagem); this.status = status; this.codigo = codigo; }
}

// ---------- várias pessoas ----------
// O dono (quem montou a app) fica com as chaves de sempre; cada pessoa convidada tem as suas com o prefixo u:<id>:.
// As chaves globais (aparelhos, Client ID, códigos, convites, o estado do login) são as mesmas para todos.
const DONO = 'dono';
const GLOBAL = /^(chaves$|config:|codigo:ligacao$|agente:chave$|utilizadores$|convite:|tidal:estado:)/;
function deUtilizador(env, uid) {
    if (!uid || uid === DONO) return { ...env, UID: DONO };
    const k = (x) => (GLOBAL.test(x) ? x : `u:${uid}:${x}`);
    const kv = env.KV;
    return { ...env, UID: uid, KV: { get: (x, t) => kv.get(k(x), t), put: (x, v, o) => kv.put(k(x), v, o), delete: (x) => kv.delete(k(x)) } };
}

export default {
    async fetch(req, env, ctx) {
        const url = new URL(req.url);
        if (req.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: { ...CORS, 'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
                'access-control-allow-headers': 'authorization, content-type', 'access-control-max-age': '86400' } });
        }
        if (url.pathname === '/' && req.method === 'GET') return Response.redirect(appUrl(env), 302);
        let res;
        try {
            if (url.pathname === '/tidal/retorno' && req.method === 'GET') res = await retorno(env, url);
            else if (url.pathname.startsWith('/api/')) res = await route(req, env, url);
            else res = json({ error: 'nao_encontrado', message: 'Pedido desconhecido.' }, 404);
        } catch (e) {
            if (e instanceof Erro) res = json({ error: e.codigo, message: e.message }, e.status);
            else { console.error(e); res = json({ error: 'interno', message: 'Erro interno do conector.' }, 500); }
        }
        if (res.status === 302) return res;
        const out = new Response(res.body, res);
        for (const [k, v] of Object.entries(CORS)) out.headers.set(k, v);
        return out;
    },
};

async function route(req, env, url) {
    const p = url.pathname, m = req.method;
    if (p === '/api/estado' && m === 'GET') return json(await estado(req, env, url));
    if (p === '/api/ligar' && m === 'POST') return json(await ligar(req, env, url, await autenticar(req, env, url)));
    if (p === '/api/config' && m === 'POST') return json(await configurar(req, env, await autenticar(req, env, url)));
    if (p === '/api/aparelho' && m === 'POST') return json(await aparelho(req, env), 201);
    const quem = await autenticar(req, env, url);
    if (!quem) throw new Erro(401, 'sem_acesso', 'Falta a chave deste aparelho (liga o Tidal na app).');
    if (p === '/api/utilizadores' && m === 'GET') return json(await utilizadores(env, quem));
    if (p === '/api/convites' && m === 'POST') return json(await convidar(env, quem), 201);
    const ue = deUtilizador(env, quem.uid);
    if (p === '/api/desligar' && m === 'POST') { await ue.KV.delete('tidal:tokens'); await ue.KV.delete('perfil'); return json({ ok: true }); }
    if (p === '/api/perfil' && m === 'GET') return json(await perfil(ue, url.searchParams.has('fresco')));
    if (p === '/api/resolver' && m === 'POST') return json(await resolver(ue, await corpo(req)));
    if (p === '/api/pesquisa' && m === 'GET') return json(await pesquisa(ue, url.searchParams.get('q')));
    if (p === '/api/playlists' && m === 'GET') return json((await ue.KV.get('playlists', 'json')) || []);
    if (p === '/api/playlists' && m === 'POST') return json(await guardar(ue, await corpo(req), quem), 201);
    const pl = /^\/api\/playlists\/([a-z0-9_-]{4,40})(\/tidal|\/versoes)?$/.exec(p);
    if (pl && !pl[2] && m === 'GET') return json(await obter(ue, pl[1]));
    if (pl && !pl[2] && m === 'DELETE') return json(await apagar(ue, pl[1], url.searchParams.get('tidal') === '1'));
    if (pl && pl[2] === '/tidal' && m === 'POST') return json(await enviar(ue, pl[1], await corpo(req)));
    if (pl && pl[2] === '/versoes' && m === 'POST') return json(await versao(ue, pl[1], await corpo(req), quem), 201);
    if (p === '/api/mais' && m === 'POST') return json(await maisComoEsta(ue, await corpo(req), quem), 201);
    if (p === '/api/mixes' && m === 'GET') return json(await mixes(ue));
    if (p === '/api/novidades' && m === 'GET') return json(await novidades(ue, url.searchParams.get('dias')));
    if (p === '/api/pedidos' && m === 'GET') return json(await pedidos(ue));
    if (p === '/api/pedidos' && m === 'POST') return json(await pedir(ue, await corpo(req)), 201);
    const pd = /^\/api\/pedidos\/([a-z0-9_-]{4,40})$/.exec(p);
    if (pd && m === 'DELETE') return json(await despachar(ue, pd[1], url.searchParams.get('playlist')));
    throw new Erro(404, 'nao_encontrado', 'Pedido desconhecido.');
}

// ---------- utilitários ----------
function json(body, status = 200, headers = {}) {
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });
}
async function corpo(req) {
    try { return await req.json(); } catch { throw new Erro(400, 'json_invalido', 'O corpo do pedido não é JSON válido.'); }
}
const appUrl = (env) => env.APP_URL || 'https://nelsonsous.github.io/escolaplay/musica/';
const txt = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
function aleatorio(bytes = 32) {
    const b = crypto.getRandomValues(new Uint8Array(bytes));
    return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function sha256(s) {
    const d = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
    return [...d].map((x) => x.toString(16).padStart(2, '0')).join('');
}
async function desafio(verifier) {
    const d = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
    return btoa(String.fromCharCode(...d)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
const novoId = (pre) => `${pre}${Date.now().toString(36)}${aleatorio(4).toLowerCase().replace(/[^a-z0-9]/g, '')}`;

// Chaves: a de cada aparelho (criada ao ligar o Tidal) e a do agente (tarefa agendada). Só os hashes na KV.
async function autenticar(req, env, url) {
    const m = /^Bearer\s+(\S{20,})$/.exec(req.headers.get('authorization') || '');
    if (!m) return null;
    const chaves = (await env.KV.get('chaves', 'json')) || {};
    const q = chaves[await sha256(m[1])];
    if (!q) return null;
    if (q.tipo !== 'agente') return { ...q, uid: q.uid || DONO };
    const u = url?.searchParams.get('u') || DONO;
    if (u !== DONO && !((await env.KV.get('utilizadores', 'json')) || []).some((x) => x.uid === u)) throw new Erro(404, 'sem_pessoa', 'Essa pessoa não existe.');
    return { ...q, uid: u };
}
async function novaChave(env, tipo, nome, uid) {
    const chave = aleatorio(32);
    const chaves = (await env.KV.get('chaves', 'json')) || {};
    chaves[await sha256(chave)] = { tipo, nome: txt(nome, 60) || tipo, criada: new Date().toISOString(), ...(uid && uid !== DONO ? { uid } : {}) };
    await env.KV.put('chaves', JSON.stringify(chaves));
    return chave;
}

// ---------- estado e ligação ao Tidal ----------
// O Client ID (público: o fluxo é PKCE, sem segredo) vem da variável do Worker ou da KV (posto na app, com o código)
async function clientId(env) { return env.TIDAL_CLIENT_ID || (await env.KV.get('config:tidal_client_id')) || ''; }
async function codigoValido(env, codigo) {
    const h = await env.KV.get('codigo:ligacao');
    return !!(h && codigo && (await sha256(String(codigo))) === h);
}

async function configurar(req, env, quem) {
    const c = await req.json().catch(() => ({}));
    if (!quem && !(await codigoValido(env, c.codigo))) throw new Erro(401, 'sem_acesso', 'Código de ligação inválido ou já usado.');
    if (quem && quem.tipo !== 'agente' && quem.uid !== DONO) throw new Erro(403, 'so_o_dono', 'O Client ID é de quem montou a app.');
    const id = String(c.clientId || '').trim();
    if (!/^[A-Za-z0-9._-]{8,80}$/.test(id)) throw new Erro(400, 'client_id_invalido', 'Esse Client ID não parece válido (copia-o de developer.tidal.com).');
    await env.KV.put('config:tidal_client_id', id);
    return { ok: true };
}

// Um aparelho novo (ex.: a app no ecrã principal do iOS, que tem o seu próprio armazém) com o Tidal já ligado:
// troca o código de ligação por uma chave, sem voltar a passar pelo login do Tidal. O código gasta-se.
async function aparelho(req, env) {
    const c = await req.json().catch(() => ({}));
    if (!(await codigoValido(env, c.codigo))) throw new Erro(401, 'sem_acesso', 'Código de ligação inválido ou já usado.');
    await env.KV.delete('codigo:ligacao');
    return { chave: await novaChave(env, 'aparelho', txt(c.nome, 60) || 'aparelho') };
}

async function estado(req, env, url) {
    const quem = await autenticar(req, env, url).catch(() => null);
    const ue = deUtilizador(env, quem?.uid);
    const t = await ue.KV.get('tidal:tokens', 'json');
    const out = { versao: VERSION, clientId: !!(await clientId(env)), ligado: !!t, retorno: new URL('/tidal/retorno', url.origin).href };
    if (quem) {
        const [pls, peds] = await Promise.all([ue.KV.get('playlists', 'json'), ue.KV.get('pedidos', 'json')]);
        Object.assign(out, { tu: quem.tipo, dono: quem.uid === DONO, utilizador: t?.utilizador || null, pais: t?.pais || null, ligadoEm: t?.ligadoEm || null,
            playlists: (pls || []).length, pedidos: (peds || []).filter((x) => x.estado === 'pendente').length });
    }
    return out;
}

// convites: só o dono (ou o Curador) convida; o código serve uma vez e dura 14 dias
async function convidar(env, quem) {
    if (quem.tipo !== 'agente' && quem.uid !== DONO) throw new Erro(403, 'so_o_dono', 'Só quem montou a app pode convidar.');
    const codigo = aleatorio(12);
    await env.KV.put('convite:' + (await sha256(codigo)), JSON.stringify({ criadoEm: new Date().toISOString() }), { expirationTtl: 14 * 86400 });
    return { codigo, url: `${appUrl(env)}?ligar=${encodeURIComponent(codigo)}`, dias: 14 };
}

// as pessoas da app, para o Curador tratar os pedidos de cada uma (com ?u=<uid>)
async function utilizadores(env, quem) {
    if (quem.tipo !== 'agente') throw new Erro(403, 'so_o_curador', 'A lista de pessoas é só para o Curador.');
    const lista = [{ uid: DONO }, ...((await env.KV.get('utilizadores', 'json')) || [])];
    return Promise.all(lista.map(async (u) => {
        const ue = deUtilizador(env, u.uid);
        const [t, peds] = await Promise.all([ue.KV.get('tidal:tokens', 'json'), ue.KV.get('pedidos', 'json')]);
        return { uid: u.uid, nome: t?.utilizador || u.nome || '', ligado: !!t, pedidos: (peds || []).filter((x) => x.estado === 'pendente').length };
    }));
}

async function ligar(req, env, url, quem) {
    const cid = await clientId(env);
    if (!cid) throw new Erro(409, 'sem_client_id', 'Ainda falta o Client ID do Tidal no conector.');
    const c = await req.json().catch(() => ({}));
    let novo = false, convite = null;
    if (!quem) {
        // primeira ligação (ou um aparelho novo): com o código de ligação do dono ou com um convite (gastam-se ao ligar)
        if (await codigoValido(env, c.codigo)) novo = true;
        else if (c.codigo && (await env.KV.get('convite:' + (await sha256(String(c.codigo)))))) { novo = true; convite = await sha256(String(c.codigo)); }
        else throw new Erro(401, 'sem_acesso', 'Código de ligação inválido ou já usado.');
    }
    const verifier = aleatorio(48), state = aleatorio(24);
    await env.KV.put('tidal:estado:' + state, JSON.stringify({ verifier, novo, convite, uid: quem?.uid || DONO, nome: txt(c.nome, 60) }), { expirationTtl: 600 });
    const q = new URLSearchParams({
        client_id: cid, code_challenge: await desafio(verifier), code_challenge_method: 'S256',
        redirect_uri: new URL('/tidal/retorno', url.origin).href, response_type: 'code', scope: SCOPES.join(' '), state,
    });
    return { url: `${LOGIN}?${q}` };
}

async function retorno(env, url) {
    const voltar = (hash) => Response.redirect(appUrl(env) + hash, 302);
    const erro = url.searchParams.get('error');
    if (erro) return voltar('#erro=' + encodeURIComponent(url.searchParams.get('error_description') || erro));
    const state = url.searchParams.get('state') || '', code = url.searchParams.get('code') || '';
    const est = state && (await env.KV.get('tidal:estado:' + state, 'json'));
    if (!est || !code) return voltar('#erro=' + encodeURIComponent('A ligação expirou. Tenta outra vez.'));
    await env.KV.delete('tidal:estado:' + state);
    let uid = est.uid || DONO;
    if (est.convite) {
        if (!(await env.KV.get('convite:' + est.convite))) return voltar('#erro=' + encodeURIComponent('Este convite já foi usado.'));
        uid = novoId('u');
    }
    const ue = deUtilizador(env, uid);
    const r = await fetch(TOKEN, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({
        client_id: await clientId(env), code, code_verifier: est.verifier, grant_type: 'authorization_code',
        redirect_uri: new URL('/tidal/retorno', url.origin).href, scope: SCOPES.join(' '),
    }) });
    const j = await r.json().catch(() => null);
    if (!r.ok || !j?.access_token) return voltar('#erro=' + encodeURIComponent('O Tidal recusou a ligação: ' + (j?.error_description || j?.error || 'HTTP ' + r.status)));
    const t = { access: j.access_token, refresh: j.refresh_token || '', expira: Date.now() + (j.expires_in || 3600) * 1000, scope: j.scope || SCOPES.join(' '),
        userId: String(j.user_id || j.user?.userId || ''), ligadoEm: new Date().toISOString() };
    const eu = await fetch(`${API}/users/me`, { headers: { authorization: `Bearer ${t.access}`, accept: JSONAPI } }).then((x) => x.json()).catch(() => null);
    t.utilizador = eu?.data?.attributes?.username || eu?.data?.attributes?.firstName || '';
    t.pais = eu?.data?.attributes?.country || env.PAIS || 'PT';
    if (eu?.data?.id) t.userId = String(eu.data.id);
    await ue.KV.put('tidal:tokens', JSON.stringify(t));
    await ue.KV.delete('perfil');
    if (est.convite) {
        await env.KV.delete('convite:' + est.convite);
        const us = (await env.KV.get('utilizadores', 'json')) || [];
        us.push({ uid, nome: t.utilizador, criadoEm: t.ligadoEm });
        await env.KV.put('utilizadores', JSON.stringify(us));
    }
    if (!(await env.KV.get('agente:chave'))) await env.KV.put('agente:chave', await novaChave(env, 'agente', 'Curador (tarefa agendada)'));
    if (!est.novo) return voltar('#ligado=1');
    if (!est.convite) await env.KV.delete('codigo:ligacao');
    return voltar('#chave=' + (await novaChave(env, 'aparelho', est.nome || 'telemóvel', uid)));
}

// ---------- API do Tidal, com renovação do token ----------
async function acesso(env, forcar = false) {
    let t = await env.KV.get('tidal:tokens', 'json');
    if (!t) throw new Erro(409, 'tidal_desligado', 'O Tidal não está ligado: liga-o na app.');
    if (!forcar && Date.now() < t.expira - 60000) return t;
    if (!t.refresh) throw new Erro(409, 'tidal_desligado', 'A sessão do Tidal expirou: liga outra vez na app.');
    const r = await fetch(TOKEN, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({
        client_id: await clientId(env), grant_type: 'refresh_token', refresh_token: t.refresh, scope: t.scope || SCOPES.join(' '),
    }) });
    const j = await r.json().catch(() => null);
    if (!r.ok || !j?.access_token) {
        if (r.status === 400 || r.status === 401) { await env.KV.delete('tidal:tokens'); throw new Erro(409, 'tidal_desligado', 'A sessão do Tidal expirou: liga outra vez na app.'); }
        throw new Erro(502, 'tidal', 'O Tidal não renovou a sessão (HTTP ' + r.status + ').');
    }
    t = { ...t, access: j.access_token, refresh: j.refresh_token || t.refresh, expira: Date.now() + (j.expires_in || 3600) * 1000, scope: j.scope || t.scope };
    await env.KV.put('tidal:tokens', JSON.stringify(t));
    return t;
}

async function tidal(env, caminho, { method = 'GET', query = {}, body } = {}) {
    let t = await acesso(env);
    const url = new URL(caminho.startsWith('http') ? caminho : API + caminho);
    for (const [k, v] of Object.entries(query)) {
        if (v == null || v === '') continue;
        for (const x of Array.isArray(v) ? v : [v]) url.searchParams.append(k, x);
    }
    for (let tentativa = 0; tentativa < 3; tentativa++) {
        const r = await fetch(url, { method, headers: { authorization: `Bearer ${t.access}`, accept: JSONAPI, ...(body ? { 'content-type': JSONAPI } : {}) },
            body: body ? JSON.stringify(body) : undefined });
        if (r.status === 401 && tentativa === 0) { t = await acesso(env, true); continue; }
        if (r.status === 429 && tentativa < 2) { await new Promise((ok) => setTimeout(ok, Math.min(3, Number(r.headers.get('retry-after')) || 1) * 1000)); continue; }
        if (r.status === 204) return null;
        const j = await r.json().catch(() => null);
        if (r.ok) return j;
        const det = j?.errors?.[0]?.detail || j?.errors?.[0]?.title || 'HTTP ' + r.status;
        throw new Erro(r.status === 404 ? 404 : r.status === 429 ? 429 : 502, 'tidal', 'Tidal: ' + det);
    }
    throw new Erro(429, 'tidal', 'O Tidal está a limitar pedidos: tenta daqui a um minuto.');
}

// faixas por id (lotes de 20), com artistas, álbum e géneros
async function porIds(env, ids, pais) {
    const out = new Map();
    const unicos = [...new Set(ids.map(String))];
    for (let i = 0; i < unicos.length; i += MAX_IDS) {
        const doc = await tidal(env, '/tracks', { query: { 'filter[id]': unicos.slice(i, i + MAX_IDS), include: ['artists', 'albums', 'genres'], countryCode: pais } });
        for (const [id, f] of lerFaixas(doc)) out.set(id, f);
    }
    return out;
}
const idsDe = (doc, tipo = 'tracks') => (Array.isArray(doc?.data) ? doc.data : []).filter((d) => d.type === tipo).map((d) => String(d.id));

// ---------- o teu gosto ----------
async function perfil(env, fresco) {
    const cache = await env.KV.get('perfil', 'json');
    if (cache && !fresco && Date.now() - Date.parse(cache.geradoEm) < PERFIL_TTL) return cache;
    const t = await acesso(env);
    const pais = t.pais || 'PT';
    // favoritas, as mais recentes primeiro (até 5 páginas)
    const ids = [], adicionada = new Map();
    let next = '/userCollectionTracks/me/relationships/items?sort=-addedAt', paginas = 0;
    while (next && paginas < 5) {
        const doc = await tidal(env, next.startsWith('/v2/') ? next.slice(3) : next);
        for (const d of doc?.data || []) if (d.type === 'tracks') { ids.push(String(d.id)); if (d.meta?.addedAt) adicionada.set(String(d.id), d.meta.addedAt); }
        next = doc?.links?.next || null;
        paginas++;
    }
    const detalhe = await porIds(env, ids.slice(0, 100), pais);
    const favoritas = ids.slice(0, 100).map((id) => detalhe.get(id)).filter(Boolean).map((f) => ({ ...f, adicionada: adicionada.get(f.id) || null }));
    const art = await tidal(env, '/userCollectionArtists/me/relationships/items', { query: { include: 'items' } }).catch(() => null);
    const artistas = [...indexar(art).values()].filter((r) => r.type === 'artists' && r.attributes).map((r) => ({ id: String(r.id), nome: r.attributes.name })).slice(0, 100);
    const pls = await tidal(env, '/playlists', { query: { 'filter[owners.id]': 'me', sort: '-lastModifiedAt', countryCode: pais } }).catch(() => null);
    const playlists = (pls?.data || []).filter((r) => r.attributes).map((r) => ({ id: String(r.id), nome: r.attributes.name, faixas: r.attributes.numberOfItems ?? null,
        url: `https://tidal.com/browse/playlist/${r.id}` })).slice(0, 50);
    const conta = (lista) => [...lista.reduce((m, x) => m.set(x, (m.get(x) || 0) + 1), new Map())].sort((a, b) => b[1] - a[1]);
    const resumo = {
        artistas: conta(favoritas.flatMap((f) => f.artistas.slice(0, 1))).slice(0, 15).map(([nome, n]) => ({ nome, n })),
        generos: conta(favoritas.flatMap((f) => f.generos)).slice(0, 10).map(([nome, n]) => ({ nome, n })),
        decadas: conta(favoritas.filter((f) => f.ano).map((f) => Math.floor(f.ano / 10) * 10)).map(([decada, n]) => ({ decada, n })),
        qualidade: conta(favoritas.map((f) => (f.tags.includes('HIRES_LOSSLESS') ? 'Hi-Res' : f.tags.includes('LOSSLESS') ? 'Sem perdas' : 'Normal'))).map(([q, n]) => ({ q, n })),
    };
    const out = { geradoEm: new Date().toISOString(), utilizador: t.utilizador, pais, favoritas, artistas, playlists, resumo };
    await env.KV.put('perfil', JSON.stringify(out));
    return out;
}

// ---------- encontrar faixas no Tidal ----------
async function resolver(env, c) {
    const lista = Array.isArray(c?.faixas) ? c.faixas : [];
    if (!lista.length) throw new Erro(400, 'sem_faixas', 'Indica "faixas": [{ "artista", "titulo" }].');
    if (lista.length > MAX_RESOLVER) throw new Erro(400, 'demasiadas', `No máximo ${MAX_RESOLVER} faixas por pedido (o resto num pedido seguinte).`);
    const t = await acesso(env);
    const pais = t.pais || 'PT';
    const pedidos = lista.map((x) => ({ artista: txt(x.artista, 120), titulo: txt(x.titulo, 160), versao: txt(x.versao, 60), isrc: txt(x.isrc, 12), tidalId: /^\d+$/.test(String(x.tidalId || '')) ? String(x.tidalId) : '' }));
    const opcoes = [];
    for (const p of pedidos) {
        if (p.tidalId) { opcoes.push([p.tidalId]); continue; }
        if (!p.titulo) { opcoes.push([]); continue; }
        if (p.isrc) {
            const doc = await tidal(env, '/tracks', { query: { 'filter[isrc]': p.isrc, countryCode: pais } }).catch(() => null);
            const ids = idsDe(doc);
            if (ids.length) { opcoes.push(ids.slice(0, 3)); continue; }
        }
        const q = `${p.artista} ${p.titulo}`.replace(/[/\\?#]/g, ' ').replace(/\s+/g, ' ').trim();
        const ids = await pesquisar(env, q, pais).catch((e) => {
            if (e.status === 429) throw e;
            return [];
        });
        opcoes.push(ids.slice(0, 3));
    }
    const detalhe = await porIds(env, opcoes.flat(), pais);
    return {
        faixas: pedidos.map((p, i) => {
            const cands = opcoes[i].map((id) => detalhe.get(id)).filter(Boolean);
            if (p.tidalId) return cands[0] || null;
            return melhor(p, cands);
        }),
    };
}

// a pesquisa do Tidal: a frase vai em filter[query] (no caminho dá «Invalid resource ID»); as faixas vêm, das mais
// relevantes para as menos, em data[0].relationships.tracks
async function pesquisar(env, q, pais) {
    const doc = await tidal(env, '/searchResults', { query: { 'filter[query]': q, countryCode: pais, explicitFilter: 'INCLUDE', include: 'tracks' } });
    const r = (Array.isArray(doc?.data) ? doc.data : doc?.data ? [doc.data] : []).find((d) => d?.type === 'searchResults');
    return idsDe({ data: r?.relationships?.tracks?.data });
}

async function pesquisa(env, q) {
    q = txt(q, 200).replace(/[/\\?#]/g, ' ');
    if (q.length < 2) throw new Erro(400, 'pesquisa_curta', 'Escreve pelo menos 2 letras.');
    const t = await acesso(env);
    const ids = (await pesquisar(env, q, t.pais || 'PT')).slice(0, 10);
    const detalhe = await porIds(env, ids, t.pais || 'PT');
    return { faixas: ids.map((id) => detalhe.get(id)).filter(Boolean) };
}

// ---------- biblioteca de playlists ----------
function normalizarFaixa(f) {
    if (!f || !/^\d+$/.test(String(f.id || ''))) return null;
    return {
        id: String(f.id), titulo: txt(f.titulo, 200), versao: txt(f.versao, 100), artistas: (Array.isArray(f.artistas) ? f.artistas : []).map((a) => txt(a, 120)).filter(Boolean).slice(0, 6),
        album: txt(f.album, 200), ano: Number(f.ano) || 0, duracao: Number(f.duracao) || 0, tags: (Array.isArray(f.tags) ? f.tags : []).slice(0, 6).map((x) => txt(x, 30)),
        bpm: Number(f.bpm) || 0, tom: Number(f.tom) || 0, genero: txt(f.genero, 40), popularidade: Number(f.popularidade) || 0,
        motivo: txt(f.motivo, 160), porque: txt(f.porque, 20), pontos: Number(f.pontos) || 0, url: `https://tidal.com/browse/track/${f.id}`,
    };
}

async function guardar(env, c, quem) {
    const faixas = (Array.isArray(c?.faixas) ? c.faixas : []).map(normalizarFaixa).filter(Boolean).slice(0, 200);
    if (!txt(c?.nome, 60)) throw new Erro(400, 'sem_nome', 'A playlist precisa de "nome".');
    if (!faixas.length) throw new Erro(400, 'sem_faixas', 'A playlist precisa de "faixas" já encontradas no Tidal (com "id").');
    const doc = {
        id: novoId('p'), nome: txt(c.nome, 60), descricao: txt(c.descricao, 300), resumo: txt(c.resumo, 1200),
        tendencias: (Array.isArray(c.tendencias) ? c.tendencias : []).map((x) => txt(x, 200)).filter(Boolean).slice(0, 8),
        pedido: txt(c.pedido, 500), opcoes: normalizarOpcoes(c.opcoes || {}), faixas,
        // as candidatas (com os sinais) ficam para a app poder afinar a escolha no telemóvel
        candidatas: Array.isArray(c.candidatas) ? c.candidatas.slice(0, 200) : [],
        custo: Number(c.custo) || 0, criadaEm: new Date().toISOString(), por: quem.tipo === 'agente' ? 'curador' : 'app', modelo: txt(c.modelo, 60), tidal: null,
    };
    if (c.tidal) doc.tidal = await criarNoTidal(env, doc);
    await env.KV.put('playlist:' + doc.id, JSON.stringify(doc));
    const idx = (await env.KV.get('playlists', 'json')) || [];
    idx.unshift(resumoDe(doc));
    await env.KV.put('playlists', JSON.stringify(idx.slice(0, MAX_PLAYLISTS)));
    return doc;
}
const resumoDe = (d) => ({ id: d.id, nome: d.nome, criadaEm: d.criadaEm, por: d.por, faixas: d.faixas.length,
    duracao: d.faixas.reduce((s, f) => s + (f.duracao || 0), 0), tidal: d.tidal?.url || null });

async function obter(env, id) {
    const d = await env.KV.get('playlist:' + id, 'json');
    if (!d) throw new Erro(404, 'nao_encontrada', 'Essa playlist já não existe.');
    return d;
}

// com noTidal, apaga também a playlist no Tidal (se lá já não existir, segue)
async function apagar(env, id, noTidal) {
    if (noTidal) {
        const tid = (await env.KV.get('playlist:' + id, 'json'))?.tidal?.id;
        if (tid) await tidal(env, `/playlists/${encodeURIComponent(tid)}`, { method: 'DELETE' }).catch((e) => { if (e.status !== 404) throw e; });
    }
    await env.KV.delete('playlist:' + id);
    const idx = ((await env.KV.get('playlists', 'json')) || []).filter((x) => x.id !== id);
    await env.KV.put('playlists', JSON.stringify(idx));
    return { ok: true };
}

// Envia (ou volta a enviar com outra ordem/escolha) uma playlist da biblioteca para o Tidal
async function enviar(env, id, c) {
    const d = await obter(env, id);
    if (Array.isArray(c?.faixas) && c.faixas.length) d.faixas = c.faixas.map(normalizarFaixa).filter(Boolean).slice(0, 200);
    if (txt(c?.nome, 60)) d.nome = txt(c.nome, 60);
    if (d.tidal && !c?.novaNoTidal) throw new Erro(409, 'ja_no_tidal', 'Já está no Tidal. Para outra versão, envia com "novaNoTidal": true.');
    d.tidal = await criarNoTidal(env, d);
    await env.KV.put('playlist:' + d.id, JSON.stringify(d));
    const idx = ((await env.KV.get('playlists', 'json')) || []).map((x) => (x.id === d.id ? resumoDe(d) : x));
    await env.KV.put('playlists', JSON.stringify(idx));
    return d;
}

// Uma versão afinada na app (o motor Onda correu no telemóvel): a app manda só a decisão — a ordem (índices nas
// candidatas guardadas e, a seguir, nas faixas que juntou do Tidal), o porquê e os pontos — e aqui monta-se a
// playlist com as candidatas da original. As faixas juntadas vêm do Tidal por id (a app não manda dados de faixas).
async function versao(env, id, c, quem) {
    const d = await obter(env, id);
    const cands = Array.isArray(d.candidatas) ? d.candidatas : [];
    const ids = (Array.isArray(c?.extras) ? c.extras : []).slice(0, 20).map((x) => String(x));
    let extras = [];
    if (ids.length) {
        if (!ids.every((x) => /^\d+$/.test(x))) throw new Erro(400, 'extras_invalidos', 'As faixas juntadas têm de ser ids do Tidal.');
        const t = await acesso(env);
        const det = await porIds(env, ids, t.pais || 'PT');
        const g = perfilGosto((await env.KV.get('perfil', 'json')) || {});
        extras = ids.map((x) => {
            const f = det.get(x);
            if (!f) return null;
            const p = { artista: f.artistas[0] || '', titulo: f.titulo, motivo: 'Escolhida por ti.', fixa: true };
            return { ...p, faixa: f, sinais: sinais(p, f, g) };
        });
    }
    const todas = [...cands, ...extras];
    const ordem = Array.isArray(c?.ordem) ? c.ordem.slice(0, 200) : [];
    const vistas = new Set();
    const faixas = [];
    ordem.forEach((i, p) => {
        const x = Number.isInteger(i) ? todas[i] : null;
        if (!x?.faixa || vistas.has(x.faixa.id)) return;
        vistas.add(x.faixa.id);
        faixas.push({ ...x.faixa, genero: x.sinais?.genero || '', motivo: x.motivo || '', porque: txt(c.porque?.[p], 20), pontos: Number(c.pontos?.[p]) || 0 });
    });
    if (!faixas.length) throw new Erro(400, 'sem_faixas', 'A versão não tem faixas.');
    // a mesma playlist: na app e, se já estiver no Tidal, lá também (troca as faixas, sem criar cópias)
    Object.assign(d, { faixas, candidatas: todas.filter(Boolean), opcoes: normalizarOpcoes(c.opcoes || d.opcoes || {}), custo: Number(c.custo) || d.custo || 0, afinadaEm: new Date().toISOString() });
    if (c.tidal) {
        if (d.tidal?.id) {
            await substituirNoTidal(env, d.tidal.id, faixas.map((f) => f.id));
            d.tidal = { ...d.tidal, faixas: faixas.length, atualizadaEm: d.afinadaEm };
        } else d.tidal = await criarNoTidal(env, d);
    }
    await env.KV.put('playlist:' + d.id, JSON.stringify(d));
    const idx = (await env.KV.get('playlists', 'json')) || [];
    await env.KV.put('playlists', JSON.stringify(idx.map((x) => (x.id === d.id ? resumoDe(d) : x))));
    return d;
}

// troca as faixas de uma playlist do Tidal: tira as que lá estão (pelo itemId, lotes de 50) e põe as novas pela ordem
async function substituirNoTidal(env, pid, ids) {
    const atuais = [];
    let cursor = null;
    for (let pag = 0; pag < 8; pag++) {
        const doc = await tidal(env, `/playlists/${pid}/relationships/items`, { query: { 'page[cursor]': cursor } });
        for (const x of doc?.data || []) if (x?.meta?.itemId) atuais.push({ id: String(x.id), type: x.type || 'tracks', meta: { itemId: String(x.meta.itemId) } });
        cursor = doc?.links?.meta?.nextCursor || null;
        if (!cursor) break;
    }
    for (let i = 0; i < atuais.length; i += 50) await tidal(env, `/playlists/${pid}/relationships/items`, { method: 'DELETE', body: { data: atuais.slice(i, i + 50) } });
    for (let i = 0; i < ids.length; i += MAX_ITENS) {
        await tidal(env, `/playlists/${pid}/relationships/items`, { method: 'POST', body: { data: ids.slice(i, i + MAX_ITENS).map((x) => ({ id: x, type: 'tracks' })), meta: { onDuplicates: 'SKIP' } } });
    }
}

// ---------- mais como esta: faixas parecidas (as do Tidal), numa playlist já no Tidal e pronta para afinar ----------
async function maisComoEsta(env, c, quem) {
    const id = String(c?.faixa || '');
    if (!/^\d+$/.test(id)) throw new Erro(400, 'faixa_invalida', 'Indica "faixa": o id do Tidal.');
    const t = await acesso(env);
    const pais = t.pais || 'PT';
    const doc = await tidal(env, `/tracks/${id}/relationships/similarTracks`, { query: { countryCode: pais } });
    let ids = idsDe(doc);
    const cursor = doc?.links?.meta?.nextCursor;
    if (ids.length < 29 && cursor) ids.push(...idsDe(await tidal(env, `/tracks/${id}/relationships/similarTracks`, { query: { countryCode: pais, 'page[cursor]': cursor } }).catch(() => null)));
    ids = [id, ...new Set(ids.filter((x) => x !== id))].slice(0, 30);
    const det = await porIds(env, ids, pais);
    const semente = det.get(id);
    if (!semente) throw new Erro(404, 'nao_encontrada', 'Essa faixa já não está no Tidal.');
    const g = perfilGosto((await env.KV.get('perfil', 'json')) || {});
    const candidatas = ids.map((x, i) => {
        const f = det.get(x);
        if (!f) return null;
        const p = { artista: f.artistas[0] || '', titulo: f.titulo, motivo: i ? `Parecida com «${semente.titulo}».` : 'A faixa de partida.', fixa: !i };
        return { ...p, faixa: f, sinais: sinais(p, f, g) };
    }).filter(Boolean);
    const faixas = candidatas.map((x) => ({ ...x.faixa, genero: x.sinais?.genero || '', motivo: x.motivo }));
    return guardar(env, { nome: txt(`Parecidas com ${semente.titulo}`, 60), descricao: txt(`Faixas parecidas com «${semente.titulo}», de ${semente.artistas[0] || 'vários'}.`, 300),
        resumo: `Pedi ao Tidal as faixas parecidas com «${semente.titulo}». Afina no telemóvel para mudar a ordem ou a escolha.`, faixas, candidatas,
        opcoes: { faixas: Math.max(5, faixas.length), maxArtista: 3 }, tidal: true }, quem);
}

// ---------- para o Curador: as tuas mixes do Tidal ----------
const MIXES = [['descoberta', 'userDiscoveryMixes'], ['diaria', 'userDailyMixes'], ['lancamentos', 'userNewReleaseMixes']];
// cada tipo de mix é uma lista de playlists (a Discovery Mix, as Daily Mixes…); as faixas estão dentro de cada uma
async function mixes(env) {
    const t = await acesso(env);
    const pais = t.pais || 'PT';
    const falha = (e) => {
        if (e.status === 429) throw e;
        return null;
    };
    const listas = [];
    for (const [, r] of MIXES) {
        const pls = idsDe(await tidal(env, `/${r}/me/relationships/items`).catch(falha), 'playlists').slice(0, 2);
        const ids = [];
        for (const pid of pls) ids.push(...idsDe(await tidal(env, `/playlists/${encodeURIComponent(pid)}/relationships/items`, { query: { countryCode: pais } }).catch(falha)).slice(0, 15));
        listas.push([...new Set(ids)].slice(0, 25));
    }
    const det = await porIds(env, listas.flat(), pais);
    return { mixes: MIXES.map(([tipo], i) => ({ tipo, faixas: listas[i].map((id) => det.get(id)).filter(Boolean) })) };
}

// ---------- para o Curador: álbuns novos dos artistas que segues (os últimos `dias`) ----------
async function novidades(env, dias) {
    const t = await acesso(env);
    const pais = t.pais || 'PT';
    const desde = Date.now() - Math.min(Math.max(Number(dias) || 7, 1), 31) * 864e5;
    const p = await perfil(env);
    const albuns = [];
    for (const a of (p.artistas || []).slice(0, 15)) {
        const doc = await tidal(env, `/artists/${encodeURIComponent(a.id)}/relationships/albums`, { query: { countryCode: pais, include: 'albums' } }).catch((e) => {
            if (e.status === 429) throw e;
            return null;
        });
        for (const r of indexar(doc).values()) {
            // o mesmo álbum pode vir em várias edições (normal, explícita, deluxe…): fica uma
            const repetido = albuns.some((x) => x.artista === a.nome && x.titulo === r.attributes?.title);
            if (r.type === 'albums' && !repetido && Date.parse(r.attributes?.releaseDate || '') >= desde) albuns.push({ id: String(r.id), titulo: r.attributes.title, data: r.attributes.releaseDate, artista: a.nome });
        }
    }
    albuns.sort((x, y) => y.data.localeCompare(x.data));
    const escolhidos = albuns.slice(0, 8);
    const ids = [];
    for (const al of escolhidos) {
        ids.push(...idsDe(await tidal(env, `/albums/${encodeURIComponent(al.id)}/relationships/items`, { query: { countryCode: pais } }).catch(() => null)).slice(0, 4));
    }
    const det = await porIds(env, ids, pais);
    return { desde: new Date(desde).toISOString().slice(0, 10), albuns: escolhidos, faixas: [...new Set(ids)].map((id) => det.get(id)).filter(Boolean) };
}

async function criarNoTidal(env, d) {
    const r = await tidal(env, '/playlists', { method: 'POST', body: { data: { type: 'playlists',
        attributes: { name: d.nome, description: d.descricao || 'Criada pelo Curador da app Música.', accessType: 'UNLISTED' } } } });
    const pid = r?.data?.id;
    if (!pid) throw new Erro(502, 'tidal', 'O Tidal não devolveu a playlist criada.');
    const ids = d.faixas.map((f) => f.id);
    for (let i = 0; i < ids.length; i += MAX_ITENS) {
        await tidal(env, `/playlists/${pid}/relationships/items`, { method: 'POST', body: { data: ids.slice(i, i + MAX_ITENS).map((x) => ({ id: x, type: 'tracks' })), meta: { onDuplicates: 'SKIP' } } });
    }
    return { id: String(pid), url: `https://tidal.com/browse/playlist/${pid}`, criadaEm: new Date().toISOString(), faixas: ids.length };
}

// ---------- pedidos ao Curador (feitos na app; a tarefa agendada trata-os) ----------
// os pedidos feitos levam a ligação do Tidal da playlist, para se abrir logo
async function pedidos(env) {
    const [lista, idx] = await Promise.all([env.KV.get('pedidos', 'json'), env.KV.get('playlists', 'json')]);
    const tidalDe = new Map((idx || []).map((x) => [x.id, x.tidal]));
    return (lista || []).map((x) => (x.playlist && tidalDe.get(x.playlist) ? { ...x, tidal: tidalDe.get(x.playlist) } : x));
}

async function pedir(env, c) {
    const texto = txt(c?.texto, 500);
    if (texto.length < 3) throw new Erro(400, 'pedido_vazio', 'Escreve o que queres ouvir.');
    const lista = (await env.KV.get('pedidos', 'json')) || [];
    if (lista.filter((x) => x.estado === 'pendente').length >= MAX_PEDIDOS) throw new Erro(429, 'demasiados', `Já há ${MAX_PEDIDOS} pedidos à espera.`);
    const p = { id: novoId('q'), texto, opcoes: normalizarOpcoes(c.opcoes || {}), estado: 'pendente', criadoEm: new Date().toISOString() };
    lista.unshift(p);
    await env.KV.put('pedidos', JSON.stringify(lista.slice(0, 60)));
    return p;
}

async function despachar(env, id, playlist) {
    const lista = (await env.KV.get('pedidos', 'json')) || [];
    const p = lista.find((x) => x.id === id);
    if (!p) throw new Erro(404, 'nao_encontrado', 'Esse pedido já não existe.');
    // com ?playlist=<id>: fica feito (e aponta para a playlist); sem: é cancelado
    const out = playlist ? lista.map((x) => (x.id === id ? { ...x, estado: 'feito', playlist, feitoEm: new Date().toISOString() } : x)) : lista.filter((x) => x.id !== id);
    await env.KV.put('pedidos', JSON.stringify(out));
    return { ok: true };
}
