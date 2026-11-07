// Conector da app Música (Cloudflare Worker), como o meteo/proxy e o mercados/proxy: fala com a API oficial do Tidal
// em nome do dono (OAuth com PKCE, tokens na KV), lê o teu gosto, encontra faixas e cria playlists na tua conta,
// e guarda a biblioteca de playlists do Curador (tarefa agendada do Claude). A app em si está no GitHub Pages.
// Plano gratuito: 10 ms de CPU e 50 pedidos externos por pedido — o motor Onda corre no telemóvel e na tarefa
// agendada; aqui só se fala com o Tidal, em lotes pequenos.
import { API, LOGIN, TOKEN, SCOPES, JSONAPI, MAX_IDS, MAX_ITENS, faixas as lerFaixas, indexar, melhor } from '../../lib/tidal.js';
import { normalizarOpcoes } from '../../lib/playlist.js';

const VERSION = '1.0.0';
const CORS = { 'access-control-allow-origin': '*' };
const PERFIL_TTL = 6 * 3600 * 1000;
const MAX_RESOLVER = 10; // faixas por pedido a /api/resolver (cada uma é uma pesquisa no Tidal)
const MAX_PLAYLISTS = 200, MAX_PEDIDOS = 20;

class Erro extends Error {
    constructor(status, codigo, mensagem) { super(mensagem); this.status = status; this.codigo = codigo; }
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
    if (p === '/api/ligar' && m === 'POST') return json(await ligar(req, env, url, await autenticar(req, env)));
    if (p === '/api/config' && m === 'POST') return json(await configurar(req, env, await autenticar(req, env)));
    const quem = await autenticar(req, env);
    if (!quem) throw new Erro(401, 'sem_acesso', 'Falta a chave deste aparelho (liga o Tidal na app).');
    if (p === '/api/desligar' && m === 'POST') { await env.KV.delete('tidal:tokens'); await env.KV.delete('perfil'); return json({ ok: true }); }
    if (p === '/api/perfil' && m === 'GET') return json(await perfil(env, url.searchParams.has('fresco')));
    if (p === '/api/resolver' && m === 'POST') return json(await resolver(env, await corpo(req)));
    if (p === '/api/pesquisa' && m === 'GET') return json(await pesquisa(env, url.searchParams.get('q')));
    if (p === '/api/playlists' && m === 'GET') return json((await env.KV.get('playlists', 'json')) || []);
    if (p === '/api/playlists' && m === 'POST') return json(await guardar(env, await corpo(req), quem), 201);
    const pl = /^\/api\/playlists\/([a-z0-9_-]{4,40})(\/tidal)?$/.exec(p);
    if (pl && !pl[2] && m === 'GET') return json(await obter(env, pl[1]));
    if (pl && !pl[2] && m === 'DELETE') return json(await apagar(env, pl[1]));
    if (pl && pl[2] && m === 'POST') return json(await enviar(env, pl[1], await corpo(req)));
    if (p === '/api/pedidos' && m === 'GET') return json((await env.KV.get('pedidos', 'json')) || []);
    if (p === '/api/pedidos' && m === 'POST') return json(await pedir(env, await corpo(req)), 201);
    const pd = /^\/api\/pedidos\/([a-z0-9_-]{4,40})$/.exec(p);
    if (pd && m === 'DELETE') return json(await despachar(env, pd[1], url.searchParams.get('playlist')));
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
async function autenticar(req, env) {
    const m = /^Bearer\s+(\S{20,})$/.exec(req.headers.get('authorization') || '');
    if (!m) return null;
    const chaves = (await env.KV.get('chaves', 'json')) || {};
    return chaves[await sha256(m[1])] || null;
}
async function novaChave(env, tipo, nome) {
    const chave = aleatorio(32);
    const chaves = (await env.KV.get('chaves', 'json')) || {};
    chaves[await sha256(chave)] = { tipo, nome: txt(nome, 60) || tipo, criada: new Date().toISOString() };
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
    const id = String(c.clientId || '').trim();
    if (!/^[A-Za-z0-9._-]{8,80}$/.test(id)) throw new Erro(400, 'client_id_invalido', 'Esse Client ID não parece válido (copia-o de developer.tidal.com).');
    await env.KV.put('config:tidal_client_id', id);
    return { ok: true };
}

async function estado(req, env, url) {
    const t = await env.KV.get('tidal:tokens', 'json');
    const out = { versao: VERSION, clientId: !!(await clientId(env)), ligado: !!t, retorno: new URL('/tidal/retorno', url.origin).href };
    const quem = await autenticar(req, env);
    if (quem) {
        const [pls, peds] = await Promise.all([env.KV.get('playlists', 'json'), env.KV.get('pedidos', 'json')]);
        Object.assign(out, { tu: quem.tipo, utilizador: t?.utilizador || null, pais: t?.pais || null, ligadoEm: t?.ligadoEm || null,
            playlists: (pls || []).length, pedidos: (peds || []).filter((x) => x.estado === 'pendente').length });
    }
    return out;
}

async function ligar(req, env, url, quem) {
    const cid = await clientId(env);
    if (!cid) throw new Erro(409, 'sem_client_id', 'Ainda falta o Client ID do Tidal no conector.');
    const c = await req.json().catch(() => ({}));
    let novo = false;
    if (!quem) {
        // primeira ligação (ou um aparelho novo): só com o código de ligação, que se gasta ao ligar
        if (!(await codigoValido(env, c.codigo))) throw new Erro(401, 'sem_acesso', 'Código de ligação inválido ou já usado.');
        novo = true;
    }
    const verifier = aleatorio(48), state = aleatorio(24);
    await env.KV.put('tidal:estado:' + state, JSON.stringify({ verifier, novo, nome: txt(c.nome, 60) }), { expirationTtl: 600 });
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
    await env.KV.put('tidal:tokens', JSON.stringify(t));
    await env.KV.delete('perfil');
    if (!(await env.KV.get('agente:chave'))) await env.KV.put('agente:chave', await novaChave(env, 'agente', 'Curador (tarefa agendada)'));
    if (!est.novo) return voltar('#ligado=1');
    await env.KV.delete('codigo:ligacao');
    return voltar('#chave=' + (await novaChave(env, 'aparelho', est.nome || 'telemóvel')));
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
        const doc = await tidal(env, `/searchResults/${encodeURIComponent(q)}/relationships/tracks`, { query: { countryCode: pais, explicitFilter: 'INCLUDE' } }).catch((e) => {
            if (e.status === 429) throw e;
            return null;
        });
        opcoes.push(idsDe(doc).slice(0, 3));
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

async function pesquisa(env, q) {
    q = txt(q, 200).replace(/[/\\?#]/g, ' ');
    if (q.length < 2) throw new Erro(400, 'pesquisa_curta', 'Escreve pelo menos 2 letras.');
    const t = await acesso(env);
    const doc = await tidal(env, `/searchResults/${encodeURIComponent(q)}/relationships/tracks`, { query: { countryCode: t.pais || 'PT', explicitFilter: 'INCLUDE' } });
    const ids = idsDe(doc).slice(0, 10);
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

async function apagar(env, id) {
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
