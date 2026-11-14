// Conector da app Música (Cloudflare Worker), como o meteo/proxy e o mercados/proxy: fala com a API oficial do Tidal
// em nome do dono (OAuth com PKCE, tokens na KV), lê o teu gosto, encontra faixas e cria playlists na tua conta,
// e guarda a biblioteca de playlists do Maestro (tarefa agendada do Claude). A app em si está no GitHub Pages.
// Plano gratuito: 10 ms de CPU e 50 pedidos externos por pedido — o motor Onda corre no telemóvel e na tarefa
// agendada; aqui só se fala com o Tidal, em lotes pequenos.
import { API, LOGIN, TOKEN, SCOPES, JSONAPI, MAX_IDS, MAX_ITENS, faixas as lerFaixas, indexar, melhor, normal } from '../../lib/tidal.js';
import { normalizarOpcoes } from '../../lib/playlist.js';
import { perfilGosto, sinais } from '../../lib/sinais.js';
import { recolher, paraTi } from './tendencias.js';
import { validSubscription, newVapidKeys, sendPush } from './push.js';

const VERSION = '1.27.0';
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
const GLOBAL = /^(chaves$|config:|codigo:ligacao$|agente:chave$|utilizadores$|convite:|aparelho:|tidal:estado:|tendencias:|previa:|capa:|push:vapid$|maestro:)/;
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
        env = { ...env, espera: (p) => ctx?.waitUntil?.(p) }; // (trabalho que continua depois da resposta: chamar o Maestro)
        let res;
        try {
            if (url.pathname === '/tidal/retorno' && req.method === 'GET') res = await retorno(env, url);
            else if (url.pathname.startsWith('/api/')) res = await route(req, env, url);
            else res = json({ error: 'nao_encontrado', message: 'Pedido desconhecido.' }, 404);
        } catch (e) {
            if (e instanceof Erro) res = json({ error: e.codigo, message: e.message }, e.status);
            // o plano gratuito do Cloudflare dá 1000 escritas por dia na KV (para a conta toda); passado isso, recusa até
            // à meia-noite UTC: diz-se o que é, em vez de «erro interno»
            else if (/limit exceeded|free usage limit/i.test(String(e?.message || ''))) {
                res = json({ error: 'kv_limite', message: 'Hoje já se gastaram as gravações grátis do Cloudflare. Tenta outra vez depois da meia-noite (UTC).' }, 503);
            } else { console.error(e); res = json({ error: 'interno', message: 'Erro interno do conector.' }, 500); }
        }
        if (res.status === 302) return res;
        const out = new Response(res.body, res);
        for (const [k, v] of Object.entries(CORS)) out.headers.set(k, v);
        return out;
    },
    // uma vez por dia (wrangler.toml): o retrato das tabelas para as tendências
    async scheduled(event, env, ctx) {
        ctx.waitUntil(recolher(env, event?.scheduledTime || Date.now()).then((r) => { if (!r.ok || r.erros.length) console.error('tendências', r.erros); }));
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
    if (p === '/api/aparelho/codigo' && m === 'POST') return json(await codigoAparelho(env, quem), 201);
    const ue = deUtilizador(env, quem.uid);
    if (p === '/api/conta' && m === 'DELETE') return json(await apagarConta(env, quem));
    if (p === '/api/consentir' && m === 'POST') return json(await consentir(ue, quem));
    if (p === '/api/push/chave' && m === 'GET') return json({ chave: (await chavesPush(env)).publicKey });
    if (p === '/api/push' && m === 'POST') return json(await assinarPush(ue, await corpo(req)), 201);
    if (p === '/api/push' && m === 'DELETE') return json(await desassinarPush(ue, await corpo(req)));
    if (p === '/api/push/teste' && m === 'POST') return json(await testarPush(ue));
    if (p === '/api/desligar' && m === 'POST') { await ue.KV.delete('tidal:tokens'); await ue.KV.delete('perfil'); return json({ ok: true }); }
    if (p === '/api/perfil' && m === 'GET') return json(await perfil(ue, url.searchParams.has('fresco')));
    if (p === '/api/resolver' && m === 'POST') return json(await resolver(ue, await corpo(req)));
    if (p === '/api/pesquisa' && m === 'GET') return json(await pesquisa(ue, url.searchParams.get('q'), url.searchParams.has('unicas')));
    if (p === '/api/playlists' && m === 'GET') return json((await ue.KV.get('playlists', 'json')) || []);
    if (p === '/api/playlists' && m === 'POST') return json(await guardar(ue, await corpo(req), quem), 201);
    if (p === '/api/ideias' && m === 'GET') return json((await ue.KV.get('ideias', 'json')) || { ideias: [] });
    if (p === '/api/ideias' && m === 'POST') {
        if (quem.tipo !== 'agente') throw new Erro(403, 'so_maestro', 'As ideias são escritas pelo Maestro.');
        return json(await guardarIdeias(ue, await corpo(req)), 201);
    }
    if (p === '/api/avaliacoes' && m === 'GET') return json(await avaliacoes(ue));
    const pl = /^\/api\/playlists\/([a-z0-9_-]{4,40})(\/tidal|\/versoes|\/renovar|\/renovacoes|\/nome|\/rejeitar|\/trocar|\/afinar|\/previas)?$/.exec(p);
    if (pl && !pl[2] && m === 'GET') return json(await obter(ue, pl[1]));
    if (pl && !pl[2] && m === 'DELETE') return json(await apagar(ue, pl[1], url.searchParams.get('tidal') === '1'));
    if (pl && pl[2] === '/tidal' && m === 'POST') return json(await enviar(ue, pl[1], await corpo(req)));
    if (pl && pl[2] === '/versoes' && m === 'POST') return json(await versao(ue, pl[1], await corpo(req), quem), 201);
    if (pl && pl[2] === '/previas' && m === 'GET') return json(await previas(ue, pl[1]));
    if (pl && pl[2] === '/rejeitar' && m === 'POST') return json(await rejeitar(ue, pl[1], await corpo(req)));
    if (pl && pl[2] === '/trocar' && m === 'POST') return json(await trocar(ue, pl[1], await corpo(req)));
    if (pl && pl[2] === '/afinar' && m === 'POST') return json(await comMaestro(ue, await afinarPedido(ue, pl[1], await corpo(req))), 201);
    if (pl && pl[2] === '/nome' && m === 'POST') return json(await renomear(ue, pl[1], await corpo(req)));
    if (pl && pl[2] === '/renovar' && m === 'POST') return json(await renovar(ue, pl[1], await corpo(req)));
    if (pl && pl[2] === '/renovacoes' && m === 'POST') return json(await renovacao(ue, pl[1], await corpo(req)), 201);
    if (p === '/api/juntar' && m === 'POST') return json(await juntar(ue, await corpo(req), quem), 201);
    if (p === '/api/mais' && m === 'POST') { const d = await maisComoEsta(ue, await corpo(req), quem); return json(d.afinacoes ? await comMaestro(ue, d) : d, 201); }
    if (p === '/api/mixes' && m === 'GET') return json(await mixes(ue));
    if (p === '/api/novidades' && m === 'GET') return json(await novidades(ue, url.searchParams.get('dias')));
    if (p === '/api/tendencias' && m === 'GET') return json(await tendencias(ue));
    if (p === '/api/tendencias/recolher' && m === 'POST') {
        if (quem.tipo !== 'agente' && quem.uid !== DONO) throw new Erro(403, 'so_dono', 'Só o dono (ou o Maestro) recolhe as tendências.');
        return json(await recolher(env));
    }
    if (p === '/api/pedidos' && m === 'GET') { if (quem.tipo !== 'agente') await vigiar(ue); return json(await pedidos(ue)); }
    if (p === '/api/pedidos' && m === 'POST') return json(await comMaestro(ue, await pedir(ue, await corpo(req), quem)), 201);
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
    // o código de ligação do dono (o da primeira ligação)
    if (await codigoValido(env, c.codigo)) {
        await env.KV.delete('codigo:ligacao');
        return { chave: await novaChave(env, 'aparelho', txt(c.nome, 60) || 'aparelho') };
    }
    // um código criado num aparelho que já tem acesso: dá a chave da mesma pessoa
    const n = normalizarCodigo(c.codigo);
    const k = 'aparelho:' + (await sha256(n));
    const a = n.length === 8 ? await env.KV.get(k, 'json') : null;
    if (!a) throw new Erro(401, 'sem_acesso', 'Código inválido ou já usado. Cria um novo num aparelho onde já entraste: Ajustes → «Ligar outro aparelho».');
    await env.KV.delete(k);
    return { chave: await novaChave(env, 'aparelho', txt(c.nome, 60) || 'aparelho', a.uid) };
}

// ligar outro aparelho da mesma pessoa (a app do ecrã principal do iOS tem o seu armazém): um código de 8 letras e
// algarismos fáceis de ler (sem 0/O/1/I), de uma só vez, válido 24 h. O agente cria-o para uma pessoa com ?u=.
const LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const normalizarCodigo = (c) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
async function codigoAparelho(env, quem) {
    const codigo = [...crypto.getRandomValues(new Uint8Array(8))].map((x) => LETRAS[x % LETRAS.length]).join('');
    await env.KV.put('aparelho:' + (await sha256(codigo)), JSON.stringify({ uid: quem.uid, criadoEm: new Date().toISOString() }), { expirationTtl: 86400 });
    return { codigo: `${codigo.slice(0, 4)}-${codigo.slice(4)}`, horas: 24 };
}

async function estado(req, env, url) {
    const quem = await autenticar(req, env, url).catch(() => null);
    const ue = deUtilizador(env, quem?.uid);
    const t = await ue.KV.get('tidal:tokens', 'json');
    const out = { versao: VERSION, clientId: !!(await clientId(env)), ligado: !!t, retorno: new URL('/tidal/retorno', url.origin).href };
    if (quem) {
        const [pls, peds] = await Promise.all([ue.KV.get('playlists', 'json'), ue.KV.get('pedidos', 'json')]);
        Object.assign(out, { tu: quem.tipo, dono: quem.uid === DONO, utilizador: t?.utilizador || null, pais: t?.pais || null, ligadoEm: t?.ligadoEm || null,
            playlists: (pls || []).length, pedidos: (peds || []).filter((x) => x.estado === 'pendente').length,
            ia: !!t?.iaConsentidaEm, ...(naHora(env) ? { naHora: true } : {}) });
    }
    return out;
}

// convites: só o dono (ou o Maestro) convida; o código serve uma vez e dura 14 dias
async function convidar(env, quem) {
    if (quem.tipo !== 'agente' && quem.uid !== DONO) throw new Erro(403, 'so_o_dono', 'Só quem montou a app pode convidar.');
    const codigo = aleatorio(12);
    await env.KV.put('convite:' + (await sha256(codigo)), JSON.stringify({ criadoEm: new Date().toISOString() }), { expirationTtl: 14 * 86400 });
    return { codigo, url: `${appUrl(env)}?ligar=${encodeURIComponent(codigo)}`, dias: 14 };
}

// as pessoas da app, para o Maestro tratar os pedidos de cada uma (com ?u=<uid>)
async function utilizadores(env, quem) {
    if (quem.tipo !== 'agente') throw new Erro(403, 'so_o_curador', 'A lista de pessoas é só para o Maestro.');
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
    // a app nativa (com os ficheiros lá dentro) pede para o login voltar a ela e não ao site: o estado diz para onde
    const verifier = aleatorio(48), state = (c.voltar === 'app' ? 'app-' : '') + aleatorio(24);
    await env.KV.put('tidal:estado:' + state, JSON.stringify({ verifier, novo, convite, uid: quem?.uid || DONO, nome: txt(c.nome, 60), ...(c.consente === true ? { consente: true } : {}) }), { expirationTtl: 600 });
    const q = new URLSearchParams({
        client_id: cid, code_challenge: await desafio(verifier), code_challenge_method: 'S256',
        redirect_uri: new URL('/tidal/retorno', url.origin).href, response_type: 'code', scope: SCOPES.join(' '), state,
    });
    return { url: `${LOGIN}?${q}` };
}

const APP_NATIVA = 'capacitor://localhost/'; // a app do iPhone, quando leva os ficheiros dentro (nativo/)
async function retorno(env, url) {
    const state = url.searchParams.get('state') || '', code = url.searchParams.get('code') || '';
    const voltar = (hash) => new Response(null, { status: 302, headers: { location: (state.startsWith('app-') ? APP_NATIVA : appUrl(env)) + hash } });
    const erro = url.searchParams.get('error');
    if (erro) return voltar('#erro=' + encodeURIComponent(url.searchParams.get('error_description') || erro));
    const est = state && (await env.KV.get('tidal:estado:' + state, 'json'));
    if (!est || !code) return voltar('#erro=' + encodeURIComponent('A ligação expirou. Tenta outra vez.'));
    await env.KV.delete('tidal:estado:' + state);
    let uid = est.uid || DONO;
    if (est.convite && !(await env.KV.get('convite:' + est.convite))) return voltar('#erro=' + encodeURIComponent('Este convite já foi usado.'));
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
    let jaExiste = false;
    if (est.convite) {
        // cada pessoa entra com a sua conta do Tidal: a de quem montou a app não serve num convite; e quem já está na app
        // (a mesma conta do Tidal) volta à sua biblioteca em vez de ficar com uma nova, vazia
        const dono = await env.KV.get('tidal:tokens', 'json');
        if (t.userId && dono?.userId === t.userId) return voltar('#erro=' + encodeURIComponent('Essa é a conta do Tidal de quem montou a app. Entra com a tua própria conta do Tidal.'));
        const us = (await env.KV.get('utilizadores', 'json')) || [];
        for (const x of us) {
            const tt = t.userId && (await deUtilizador(env, x.uid).KV.get('tidal:tokens', 'json'));
            if (tt?.userId === t.userId) { uid = x.uid; jaExiste = true; break; }
        }
        if (!jaExiste) uid = novoId('u');
    }
    const ue = deUtilizador(env, uid);
    // a autorização para o Maestro (uma IA de terceiros) ler o perfil de gosto: dada no botão de ligar, ou já de antes
    const ia = est.consente ? t.ligadoEm : (await ue.KV.get('tidal:tokens', 'json'))?.iaConsentidaEm;
    if (ia) t.iaConsentidaEm = ia;
    await ue.KV.put('tidal:tokens', JSON.stringify(t));
    await ue.KV.delete('perfil');
    if (est.convite) {
        await env.KV.delete('convite:' + est.convite);
        if (!jaExiste) {
            const us = (await env.KV.get('utilizadores', 'json')) || [];
            us.push({ uid, nome: t.utilizador, criadoEm: t.ligadoEm });
            await env.KV.put('utilizadores', JSON.stringify(us));
        }
    }
    if (!(await env.KV.get('agente:chave'))) await env.KV.put('agente:chave', await novaChave(env, 'agente', 'Maestro (tarefa agendada)'));
    if (!est.novo) return voltar('#ligado=1');
    if (!est.convite) await env.KV.delete('codigo:ligacao');
    return voltar('#chave=' + (await novaChave(env, 'aparelho', est.nome || 'telemóvel', uid)));
}

// ---------- o Maestro é uma IA de terceiros: a pessoa autoriza que leia o seu perfil de gosto ----------
// Quem liga o Tidal pela app autoriza no botão («Concordo e ligar»); quem já estava ligado de antes autoriza nos Ajustes.
async function consentir(env, quem) {
    if (quem.tipo === 'agente') throw new Erro(403, 'so_a_pessoa', 'Só a própria pessoa autoriza, na app.');
    const t = await env.KV.get('tidal:tokens', 'json');
    if (!t) throw new Erro(409, 'tidal_desligado', 'O Tidal não está ligado: liga-o na app.');
    if (!t.iaConsentidaEm) { t.iaConsentidaEm = new Date().toISOString(); await env.KV.put('tidal:tokens', JSON.stringify(t)); }
    return { ok: true, em: t.iaConsentidaEm };
}

// ---------- o Maestro na hora ----------
// Com os segredos MAESTRO_FIRE_URL e MAESTRO_TOKEN no Worker (o endereço e o token do gatilho «API» da tarefa
// agendada, criados em claude.ai/code/routines — nunca no código), um pedido novo chama o Maestro em vez de
// esperar pela corrida seguinte. Sem os segredos, nada muda. Regras, para não haver duas corridas no mesmo pedido
// nem chamadas à toa (cada corrida gasta da subscrição do Claude):
//   - espera uns segundos e só chama se entretanto não chegou outro pedido (vários seguidos dão uma só corrida);
//   - não chama se há uma corrida a decorrer: uma chamada há menos de 15 min, ou à volta das corridas agendadas
//     (07:44 e 18:44, hora de Lisboa) — essa corrida vê os pedidos novos antes de acabar (CURADOR.md);
//   - um pedido que mesmo assim fique para trás é chamado quando a app volta a pedir a lista (a vigia), e cada
//     pedido conta no máximo 2 chamadas; no total, no máximo MAX_CHAMADAS por hora.
// O texto que vai na chamada é fixo: nada do que as pessoas escrevem segue no pedido.
const MAX_CHAMADAS = 6, CORRIDA_MS = 15 * 60000;
const FIRE = /^https:\/\/api\.anthropic\.com\/v1\/claude_code\/routines\/[A-Za-z0-9_-]+\/fire$/;
const naHora = (env) => !!(env.MAESTRO_TOKEN && FIRE.test(env.MAESTRO_FIRE_URL || ''));
function emCorridaAgendada(env, agora) {
    const horas = String(env.MAESTRO_AGENDADAS ?? '07:44,18:44').split(',').map((x) => /^(\d\d):(\d\d)$/.exec(x.trim())).filter(Boolean).map((m) => Number(m[1]) * 60 + Number(m[2]));
    if (!horas.length) return false;
    const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Lisbon', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(agora));
    const min = Number(p.find((x) => x.type === 'hour').value) * 60 + Number(p.find((x) => x.type === 'minute').value);
    return horas.some((a) => min >= a - 3 && min <= a + 15);
}
async function estadoMaestro(env, agora) {
    const chamadas = ((await env.KV.get('maestro:chamadas', 'json')) || []).filter((x) => agora - x < 3600000);
    return { chamadas, cheio: chamadas.length >= MAX_CHAMADAS, ocupado: chamadas.some((x) => agora - x < CORRIDA_MS) || emCorridaAgendada(env, agora) };
}
// regista primeiro e chama depois (duas chamadas quase ao mesmo tempo não passam as duas; um token revogado não é
// martelado); os pedidos à espera desta pessoa ficam com mais uma chamada
async function disparar(env) {
    const agora = Date.now();
    const e = await estadoMaestro(env, agora);
    if (e.cheio || e.ocupado) return false;
    await env.KV.put('maestro:chamadas', JSON.stringify([...e.chamadas, agora]));
    const l = (await env.KV.get('pedidos', 'json')) || [];
    if (l.some((x) => x.estado === 'pendente')) await env.KV.put('pedidos', JSON.stringify(l.map((x) => (x.estado === 'pendente' ? { ...x, chamadas: (x.chamadas || 0) + 1 } : x))));
    const r = await fetch(env.MAESTRO_FIRE_URL, { method: 'POST', headers: { authorization: `Bearer ${env.MAESTRO_TOKEN}`,
        'anthropic-beta': 'experimental-cc-routine-2026-04-01', 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ text: 'Corrida pedida pela app Música: há pedidos à espera.' }) });
    if (!r.ok) console.error('maestro', r.status);
    return r.ok;
}
// um pedido novo: devolve true se o Maestro foi (ou vai ser) chamado, ou se já há uma corrida que o apanha
async function chamarMaestro(env) {
    if (!naHora(env) || !env.espera) return false;
    const e = await estadoMaestro(env, Date.now());
    if (e.cheio) return false;
    if (e.ocupado) return true;
    const marca = `${Date.now()}-${aleatorio(4)}`;
    await env.KV.put('maestro:ultimo', marca);
    env.espera((async () => {
        try {
            await new Promise((ok) => setTimeout(ok, Number(env.MAESTRO_ESPERA_MS ?? 20000)));
            if ((await env.KV.get('maestro:ultimo')) === marca) await disparar(env); // (senão chegou outro pedido: é esse que chama)
        } catch (err) { console.error('maestro', err); }
    })());
    return true;
}
// junta à resposta de um pedido novo se o Maestro foi chamado (a app diz «uns minutos» em vez de «na próxima corrida»)
const comMaestro = async (env, r) => ((await chamarMaestro(env)) ? { ...r, naHora: true } : r);
// a vigia: quando a app pede a lista, se esta pessoa tem pedidos à espera há mais de 90 s que ainda não tiveram as
// suas 2 chamadas e não há corrida a decorrer, chama (um pedido que chegou a meio de uma corrida não fica esquecido)
async function vigiar(env) {
    if (!naHora(env) || !env.espera) return;
    const agora = Date.now();
    const l = (await env.KV.get('pedidos', 'json')) || [];
    if (!l.some((x) => x.estado === 'pendente' && (x.chamadas || 0) < 2 && agora - Date.parse(x.criadoEm) > 90000)) return;
    env.espera(disparar(env).catch((err) => console.error('maestro', err)));
}

// ---------- apagar a conta: tudo o que o conector guarda de uma pessoa (pede-se na app, nos Ajustes) ----------
// Saem a ligação ao Tidal, o perfil, as playlists da biblioteca, os pedidos, as ideias, os avisos e, no fim, as chaves
// dos aparelhos dela (se as gravações do dia acabarem a meio, a chave ainda serve para pedir outra vez). As playlists
// que já estão no Tidal dela ficam lá: são dela. O que é de todos (o Client ID, as tabelas, a chave do Maestro) fica.
async function apagarConta(env, quem) {
    if (quem.tipo === 'agente') throw new Erro(403, 'so_a_pessoa', 'Só a própria pessoa apaga a sua conta, na app.');
    const uid = quem.uid || DONO;
    const todas = async (prefix) => {
        const out = [];
        for (let cursor; ;) {
            const r = await env.KV.list({ prefix, cursor });
            out.push(...r.keys.map((k) => k.name));
            if (r.list_complete || !r.cursor) return out;
            cursor = r.cursor;
        }
    };
    const pre = uid === DONO ? '' : `u:${uid}:`;
    const dela = (await todas(pre)).filter((k) => uid !== DONO || (!k.startsWith('u:') && !GLOBAL.test(k)));
    // primeiro o que mais importa: a ligação ao Tidal e o perfil
    const peso = (k) => (k.endsWith('tidal:tokens') ? 0 : k.endsWith('perfil') || k.endsWith('push') ? 1 : 2);
    dela.sort((a, b) => peso(a) - peso(b));
    for (const k of dela) await env.KV.delete(k);
    if (uid !== DONO) await env.KV.put('utilizadores', JSON.stringify(((await env.KV.get('utilizadores', 'json')) || []).filter((x) => x.uid !== uid)));
    const chaves = (await env.KV.get('chaves', 'json')) || {};
    for (const [h, q] of Object.entries(chaves)) if (q.tipo !== 'agente' && (q.uid || DONO) === uid) delete chaves[h];
    await env.KV.put('chaves', JSON.stringify(chaves));
    return { ok: true, apagadas: dela.length };
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
    // sem letras explícitas: vêem-se mais resultados da pesquisa, porque a versão limpa («Clean Edit») costuma vir abaixo
    const limpa = c.limpa === true, quantas = limpa ? 10 : 3;
    const procurar = async (p) => {
        const q = `${p.artista} ${p.titulo}`.replace(/[/\\?#]/g, ' ').replace(/\s+/g, ' ').trim();
        const ids = await pesquisar(env, q, pais).catch((e) => {
            if (e.status === 429) throw e;
            return [];
        });
        return ids.slice(0, quantas);
    };
    const opcoes = [];
    for (const p of pedidos) {
        if (p.tidalId) { opcoes.push([p.tidalId]); continue; }
        if (!p.titulo) { opcoes.push([]); continue; }
        if (p.isrc) {
            const doc = await tidal(env, '/tracks', { query: { 'filter[isrc]': p.isrc, countryCode: pais } }).catch(() => null);
            const ids = idsDe(doc);
            if (ids.length) { opcoes.push(ids.slice(0, quantas)); continue; }
        }
        opcoes.push(await procurar(p));
    }
    const detalhe = await porIds(env, opcoes.flat(), pais);
    const serve = (f) => f && !(limpa && f.explicita);
    if (limpa) {
        // dada pelo id ou pelo ISRC, e só explícita: procura-se pelo artista e título, à procura da versão limpa
        const outra = pedidos.map((p, i) => i).filter((i) => (pedidos[i].tidalId || pedidos[i].isrc) && pedidos[i].titulo && !opcoes[i].some((id) => serve(detalhe.get(id))));
        for (const i of outra) { pedidos[i].tidalId = ''; opcoes[i] = await procurar(pedidos[i]); }
        const novos = [...new Set(outra.flatMap((i) => opcoes[i]))].filter((id) => !detalhe.has(id));
        if (novos.length) for (const [k, f] of await porIds(env, novos, pais)) detalhe.set(k, f);
    }
    return {
        faixas: pedidos.map((p, i) => {
            const cands = opcoes[i].map((id) => detalhe.get(id)).filter(serve);
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

// a pesquisa de faixas da app (a música de partida e «Acrescentar uma faixa»): as do Tidal, pela relevância dele, cada
// uma com a capa e os 30 s de pré-escuta, para se reconhecer a certa. Com «unicas» (a música de partida), cada canção
// aparece uma vez, na melhor versão: a de estúdio mais ouvida — o Tidal dá a mesma canção em várias (ao vivo,
// remisturas, aceleradas, karaoke, só em Dolby Atmos…), e na lista pareciam repetidas
const VARIANTE = /\b(live|ao vivo|en vivo|remix|remixed|mix|sped up|slowed|extended|karaoke|instrumental|acoustic|acustica|piano version|demo|edit|sequence|take \d+|outtake|rehearsal|alternate|version|versao)\b/;
const variante = (f) => VARIANTE.test(`${f.titulo} ${f.versao || ''}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase())
    || ((f.tags || []).includes('DOLBY_ATMOS') && !(f.tags || []).some((x) => /LOSSLESS/.test(x)));
async function pesquisa(env, q, unicas = false) {
    q = txt(q, 200).replace(/[/\\?#]/g, ' ');
    if (q.length < 2) throw new Erro(400, 'pesquisa_curta', 'Escreve pelo menos 2 letras.');
    const t = await acesso(env);
    const pais = t.pais || 'PT';
    const ids = (await pesquisar(env, q, pais)).slice(0, unicas ? 20 : 10);
    const detalhe = await porIds(env, ids, pais);
    let faixas = ids.map((id) => detalhe.get(id)).filter(Boolean);
    if (unicas) {
        // (a canção: o título sem o que vem entre parênteses e o artista principal; pela ordem em que o Tidal a deu)
        const grupos = new Map();
        for (const f of faixas) { const k = `${normal(f.titulo)}|${normal(f.artistas[0] || '')}`; grupos.set(k, [...(grupos.get(k) || []), f]); }
        const peso = (f) => (variante(f) ? 0 : 1e6) + (Number(f.popularidade) || 0);
        faixas = [...grupos.values()].map((g) => g.reduce((a, b) => (peso(b) > peso(a) ? b : a))).slice(0, 8);
    }
    const capas = await capasTidal(env, faixas).catch(() => ({}));
    let n = 0;
    const pv = await Promise.all(faixas.map((f) => previaDeezer(f, () => ++n <= 12).catch(() => null)));
    return { faixas: faixas.map((f, i) => ({ ...f, capa: capas[f.id] || pv[i]?.c || '', previa: pv[i]?.p || '' })) };
}

// ---------- biblioteca de playlists ----------
function normalizarFaixa(f) {
    if (!f || !/^\d+$/.test(String(f.id || ''))) return null;
    return {
        id: String(f.id), titulo: txt(f.titulo, 200), versao: txt(f.versao, 100), artistas: (Array.isArray(f.artistas) ? f.artistas : []).map((a) => txt(a, 120)).filter(Boolean).slice(0, 6),
        album: txt(f.album, 200), ano: Number(f.ano) || 0, ...(/^[A-Z0-9]{12}$/i.test(f.isrc || '') ? { isrc: String(f.isrc).toUpperCase() } : {}), duracao: Number(f.duracao) || 0, tags: (Array.isArray(f.tags) ? f.tags : []).slice(0, 6).map((x) => txt(x, 30)),
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
        ...(Array.isArray(c.capas) && c.capas.some((u) => /^https:\/\//.test(u)) ? { capas: c.capas.filter((u) => /^https:\/\//.test(u)).slice(0, 4).map((u) => txt(u, 300)) } : {}),
        // de onde vem, quando não é do Maestro nem de um pedido: as parecidas do Tidal («Mais como esta») ou juntada
        ...(c.origem === 'parecidas' || c.origem === 'juntar' ? { origem: c.origem } : {}),
        // as parecidas: a lista tal como o Tidal a fez fica guardada, para se comparar com a revisão do Maestro
        ...(c.origem === 'parecidas' ? { doTidal: listaDoTidal(faixas) } : {}),
        // à antiga (o Maestro já não as faz: cada pedido dá uma playlist, logo no Tidal): uma de várias propostas para
        // o mesmo pedido, que fica só na app até a pessoa a pôr no Tidal
        ...(c.rascunho === true ? { rascunho: true, grupo: txt(c.grupo, 40), variante: txt(c.variante, 40) } : {}),
    };
    if (c.tidal && !doc.rascunho) doc.tidal = await criarNoTidal(env, doc);
    await env.KV.put('playlist:' + doc.id, JSON.stringify(doc));
    const idx = (await env.KV.get('playlists', 'json')) || [];
    idx.unshift(resumoDe(doc));
    await env.KV.put('playlists', JSON.stringify(idx.slice(0, MAX_PLAYLISTS)));
    return doc;
}
// juntar playlists numa nova, logo no Tidal (revê-se depois, na app): uma faixa de cada, à vez, sem repetidas
// (nem a mesma faixa, nem o mesmo título do mesmo artista noutra edição)
async function juntar(env, c, quem) {
    const ids = [...new Set((Array.isArray(c?.ids) ? c.ids : []).map((x) => txt(x, 40)).filter(Boolean))].slice(0, 10);
    if (ids.length < 2) throw new Erro(400, 'poucas', 'Escolhe pelo menos 2 playlists para juntar.');
    const docs = await Promise.all(ids.map((id) => obter(env, id)));
    const vistas = new Set(), faixas = [];
    const chave = (f) => `${(f.titulo || '').toLowerCase().replace(/\s*[([].*$/, '')}|${(f.artistas?.[0] || '').toLowerCase()}`;
    for (let i = 0, mais = true; mais && faixas.length < 200; i++) {
        mais = false;
        for (const d of docs) {
            const f = d.faixas[i];
            if (!f) continue;
            mais = true;
            if (vistas.has(f.id) || vistas.has(chave(f))) continue;
            vistas.add(f.id); vistas.add(chave(f)); faixas.push(f);
        }
    }
    const ja = new Set(), candidatas = [];
    for (const d of docs) for (const x of d.candidatas || []) { const id = x?.faixa?.id; if (id && !ja.has(id)) { ja.add(id); candidatas.push(x); } }
    const nomes = docs.map((d) => d.nome);
    const nome = nomes.join(' + ');
    return guardar(env, { nome: nome.length > 60 ? nome.slice(0, 59) + '…' : nome, descricao: txt(`Junta ${nomes.map((n) => `«${n}»`).join(', ')}.`, 300),
        resumo: 'Uma faixa de cada playlist, à vez, sem repetidas. Afina no telemóvel para mudar a ordem ou a escolha.', faixas, candidatas: candidatas.slice(0, 200),
        opcoes: { ...docs[0].opcoes, faixas: Math.min(faixas.length, 200) }, capas: docs.map((d) => d.capas?.[0]).filter(Boolean), origem: 'juntar', tidal: true }, quem);
}
// a lista do Tidal (as parecidas, pela ordem dele): o essencial de cada faixa, para a mostrar e ouvir depois de o Maestro
// a rever (a playlist passa a ser a dele, no mesmo link; as candidatas também)
const listaDoTidal = (faixas, em = new Date().toISOString()) => ({ em, faixas: faixas.slice(0, 60).map((f) => ({ id: String(f.id), titulo: f.titulo, ...(f.versao ? { versao: f.versao } : {}),
    artistas: f.artistas || [], album: f.album || '', ano: f.ano || 0, duracao: f.duracao || 0, ...(f.isrc ? { isrc: f.isrc } : {}) })) });
// as do Tidal que já não estão na playlist (as que o Maestro tirou ao rever, ou tu)
const foraDoTidal = (d) => { const ja = new Set(d.faixas.map((f) => String(f.id))); return (d.doTidal?.faixas || []).filter((f) => !ja.has(String(f.id))); };
const resumoDe = (d) => ({ id: d.id, nome: d.nome, criadaEm: d.criadaEm, por: d.por, faixas: d.faixas.length,
    duracao: d.faixas.reduce((s, f) => s + (f.duracao || 0), 0), tidal: d.tidal?.url || null,
    ...(d.renovar ? { renovar: true, renovadaEm: d.renovadaEm || null } : {}), ...(d.afinadaEm ? { afinadaEm: d.afinadaEm } : {}), ...(d.revistaEm ? { revistaEm: d.revistaEm } : {}),
    ...(d.rascunho ? { rascunho: true, grupo: d.grupo || '', variante: d.variante || '' } : {}),
    ...(d.origem ? { origem: d.origem } : {}),
    // para agrupar na app: o pedido (se houve) e o género que mais aparece
    ...(d.pedido ? { pedido: txt(d.pedido, 120) } : {}), ...(generoDe(d.faixas) ? { genero: generoDe(d.faixas) } : {}),
    ...(d.capas?.length ? { capas: d.capas } : {}),
    ...(d.avaliacao ? { avaliacao: { nota: d.avaliacao.nota, etiqueta: d.avaliacao.etiqueta, guardadas: d.avaliacao.guardadas.length, tiradas: d.avaliacao.tiradas.length } } : {}) });
function generoDe(faixas) {
    const n = new Map();
    for (const f of faixas) { const g = txt(f.genero || f.generos?.[0], 40); if (g) n.set(g, (n.get(g) || 0) + 1); }
    let best = '', bn = 0;
    for (const [g, k] of n) if (k > bn) { best = g; bn = k; }
    return best;
}
async function atualizarIndice(env, d) {
    const idx = (await env.KV.get('playlists', 'json')) || [];
    await env.KV.put('playlists', JSON.stringify(idx.map((x) => (x.id === d.id ? resumoDe(d) : x))));
}

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
    // as afinações à espera desta playlist já não têm onde ser feitas: saem dos pedidos
    const ped = (await env.KV.get('pedidos', 'json')) || [];
    const ficam = ped.filter((x) => !(x.estado === 'pendente' && x.afinar?.playlist === id));
    if (ficam.length !== ped.length) await env.KV.put('pedidos', JSON.stringify(ficam));
    return { ok: true };
}

// Envia (ou volta a enviar com outra ordem/escolha) uma playlist da biblioteca para o Tidal
async function enviar(env, id, c) {
    const d = await obter(env, id);
    if (Array.isArray(c?.faixas) && c.faixas.length) d.faixas = c.faixas.map(normalizarFaixa).filter(Boolean).slice(0, 200);
    if (txt(c?.nome, 60)) d.nome = txt(c.nome, 60);
    if (d.tidal && !c?.novaNoTidal) throw new Erro(409, 'ja_no_tidal', 'Já está no Tidal. Para outra versão, envia com "novaNoTidal": true.');
    d.tidal = await criarNoTidal(env, d);
    delete d.rascunho; // a proposta escolhida passa a ser uma playlist como as outras
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
    const op = normalizarOpcoes(c.opcoes || d.opcoes || {});
    if (d.opcoes?.limpa && c.opcoes?.limpa === undefined) op.limpa = true;
    Object.assign(d, { faixas, candidatas: todas.filter(Boolean), opcoes: op, custo: Number(c.custo) || d.custo || 0, afinadaEm: new Date().toISOString() });
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
async function itensNoTidal(env, pid) {
    const atuais = [];
    let cursor = null;
    for (let pag = 0; pag < 8; pag++) {
        const doc = await tidal(env, `/playlists/${pid}/relationships/items`, { query: { 'page[cursor]': cursor } });
        for (const x of doc?.data || []) if (x?.meta?.itemId) atuais.push({ id: String(x.id), type: x.type || 'tracks', meta: { itemId: String(x.meta.itemId) } });
        cursor = doc?.links?.meta?.nextCursor || null;
        if (!cursor) break;
    }
    return atuais;
}
async function substituirNoTidal(env, pid, ids) {
    const atuais = await itensNoTidal(env, pid);
    for (let i = 0; i < atuais.length; i += 50) await tidal(env, `/playlists/${pid}/relationships/items`, { method: 'DELETE', body: { data: atuais.slice(i, i + 50) } });
    for (let i = 0; i < ids.length; i += MAX_ITENS) {
        await tidal(env, `/playlists/${pid}/relationships/items`, { method: 'POST', body: { data: ids.slice(i, i + MAX_ITENS).map((x) => ({ id: x, type: 'tracks' })), meta: { onDuplicates: 'SKIP' } } });
    }
}

// ---------- como correram as playlists (automático) ----------
// A API do Tidal não diz o que ouviste (o estado de reprodução pede uma permissão que as apps de fora não têm). Os
// sinais que há: as faixas que guardaste nas favoritas depois de a playlist ser criada (ou renovada), as que tiraste
// ou juntaste à playlist no Tidal, a playlist apagada no Tidal, e os artistas dela que o Tidal pôs nas tuas mixes (que
// ele faz a partir do que ouves). Fica guardado em cada playlist (a app mostra-o; o Maestro usa-o).
const MAX_AVALIAR = 8;
async function avaliacoes(env) {
    const idx = (await env.KV.get('playlists', 'json')) || [];
    const pf = (await env.KV.get('perfil', 'json')) || (await perfil(env, false));
    const fav = new Map((pf.favoritas || []).map((f) => [String(f.id), f.adicionada || '']));
    const gostava = new Set((pf.favoritas || []).flatMap((f) => f.artistas || []).map(normal));
    const mx = await mixes(env).catch((e) => { if (e.codigo === 'tidal_desligado') throw e; return null; });
    const nasMixes = new Set((mx?.mixes || []).flatMap((x) => x.faixas || []).flatMap((f) => f.artistas || []).map(normal));
    // as mais recentes e as que se atualizam sozinhas
    const feitas = idx.filter((x) => !x.rascunho);
    const escolha = [...feitas.slice(0, MAX_AVALIAR), ...feitas.filter((x) => x.renovar)].filter((x, i, a) => a.findIndex((y) => y.id === x.id) === i).slice(0, 14);
    // só se escreve a playlist (e o índice) quando a avaliação mudou: a KV gratuita dá 1000 escritas por dia
    const out = [], docs = new Map();
    const semData = (a) => JSON.stringify({ ...(a || {}), em: '' });
    for (const x of escolha) {
        const d = await env.KV.get('playlist:' + x.id, 'json');
        if (!d) continue;
        const nova = await avaliar(env, d, fav, gostava, nasMixes);
        if (semData(nova) !== semData(d.avaliacao)) {
            d.avaliacao = nova;
            await env.KV.put('playlist:' + d.id, JSON.stringify(d));
            docs.set(d.id, d);
        }
        out.push({ id: d.id, nome: d.nome, criadaEm: d.criadaEm, renovadaEm: d.renovadaEm || null, renovar: !!d.renovar, por: d.por, pedido: d.pedido || '',
            opcoes: d.opcoes, faixas: d.faixas.length, tidal: d.tidal?.url || null, avaliacao: d.avaliacao });
    }
    if (docs.size) await env.KV.put('playlists', JSON.stringify(idx.map((x) => (docs.has(x.id) ? resumoDe(docs.get(x.id)) : x))));
    return { avaliadaEm: new Date().toISOString(), playlists: out };
}
async function avaliar(env, d, fav, gostava, nasMixes) {
    const desde = d.renovadaEm || d.criadaEm;
    const ids = new Set(d.faixas.map((f) => String(f.id)));
    let noTidal = null, apagada = false;
    if (d.tidal?.id) {
        try { noTidal = new Set((await itensNoTidal(env, d.tidal.id)).map((x) => x.id)); } catch (e) {
            if (e.status === 404) apagada = true;
            else if (e.codigo === 'tidal_desligado') throw e;
        }
    }
    const curta = (f) => ({ id: String(f.id), artista: f.artistas?.[0] || '', titulo: f.titulo || '' });
    const guardadas = d.faixas.filter((f) => { const a = fav.get(String(f.id)); return !!a && a >= desde; }).map(curta);
    const tiradas = noTidal ? d.faixas.filter((f) => !noTidal.has(String(f.id))).map(curta) : [];
    const juntadas = noTidal ? [...noTidal].filter((x) => !ids.has(x)).length : 0;
    // o eco conta os artistas que aparecem nas mixes depois da playlist (os que já lá estavam ficam na base, na 1.ª vez)
    const artistas = [...new Set(d.faixas.flatMap((f) => f.artistas || []))];
    if (!Array.isArray(d.ecoBase)) d.ecoBase = artistas.filter((a) => nasMixes.has(normal(a)));
    const base = new Set(d.ecoBase.map(normal));
    const eco = artistas.filter((a) => nasMixes.has(normal(a)) && !gostava.has(normal(a)) && !base.has(normal(a))).slice(0, 8);
    const sinais = guardadas.length + tiradas.length + juntadas + eco.length;
    const nota = apagada ? 5 : Math.max(0, Math.min(100, 50 + Math.min(36, 12 * guardadas.length) + Math.min(10, 5 * juntadas) + Math.min(15, 5 * eco.length) - Math.min(30, 6 * tiradas.length)));
    const etiqueta = apagada ? 'apagaste' : !sinais ? ((Date.now() - Date.parse(desde)) / 864e5 < 3 ? 'ainda cedo' : 'sem sinais')
        : nota >= 75 ? 'resultou' : nota >= 55 ? 'boa' : nota >= 40 ? 'morna' : 'não resultou';
    return { nota, etiqueta, guardadas, tiradas: tiradas.slice(0, 30), juntadas, eco, apagada, em: new Date().toISOString() };
}

// ---------- ouvir 30 s: a pré-escuta pública do Deezer (pelo ISRC, ou pela pesquisa do artista e do título). A da Apple
// não serve daqui: o iTunes limita o IP partilhado do Cloudflare (HTTP 429). O endereço do Deezer é assinado e caduca
// (exp=…): as da playlist ficam na KV até pouco antes do primeiro caducar. ----------
const MAX_PREVIAS = 40; // pedidos ao Deezer por chamada (o plano gratuito deixa 50; o Tidal leva até 6)
// ouvir 30 s e a capa. A capa vem do Tidal (a edição exata que está na playlist); o Deezer, que dá a pré-escuta e uma capa
// na mesma resposta, fica de reserva. Poucas escritas na KV (o plano gratuito dá 1000 por dia, para a conta toda):
//   - as capas ficam na própria playlist (capasF), escritas uma vez quando há faixas novas;
//   - as pré-escutas de uma playlist ficam numa só chave, até o primeiro link caducar.
// A playlist guarda também as primeiras capas para o mosaico da lista (4 pequenas, ou 1 se não houver 4 álbuns).
// Se a KV recusar escritas (limite do dia), responde na mesma: só não guarda.
async function previas(env, id) {
    const d = await obter(env, id);
    // as da playlist primeiro (o mosaico é só delas); depois as do Tidal que saíram
    const daLista = d.faixas.slice(0, 100), fx = [...daLista, ...foraDoTidal(d).slice(0, 40)];
    const agora = Math.floor(Date.now() / 1000);
    const guarda = (k, v, o) => env.KV.put(k, v, o).catch(() => {});
    // as capas: as da playlist; as que faltam, das chaves antigas por faixa (só leitura) e depois do Tidal
    const capasF = {};
    for (const f of fx) if (d.capasF?.[f.id] !== undefined) capasF[f.id] = d.capasF[f.id];
    const semCapa = fx.filter((f) => capasF[f.id] === undefined);
    await Promise.all(semCapa.map(async (f) => { const c = await env.KV.get('capa:t:' + f.id); if (c) capasF[f.id] = c; }));
    Object.assign(capasF, await capasTidal(env, fx.filter((f) => capasF[f.id] === undefined)).catch(() => ({})));
    // as pré-escutas: uma chave por playlist; vão ao Deezer só as que faltam (e as capas que o Tidal não tem)
    const kp = 'previas:p:' + d.id;
    const antes = (await env.KV.get(kp, 'json')) || {};
    const pv = { ...antes };
    let pedidos = 0;
    const falta = fx.filter((f) => pv[f.id] === undefined);
    for (let i = 0; i < falta.length && pedidos < MAX_PREVIAS; i += 10) {
        await Promise.all(falta.slice(i, i + 10).map(async (f) => {
            const r = await previaDeezer(f, () => ++pedidos <= MAX_PREVIAS).catch(() => null);
            if (!r) return;
            pv[f.id] = r.p;
            if (!capasF[f.id] && r.c) capasF[f.id] = r.c;
        }));
    }
    if (JSON.stringify(pv) !== JSON.stringify(antes)) {
        const exps = Object.values(pv).map((u) => Number((/exp=(\d+)/.exec(u) || [])[1]) || 0).filter(Boolean);
        const ttl = exps.length ? Math.min(...exps) - agora - 120 : 86400;
        if (ttl >= 60) await guarda(kp, JSON.stringify(pv), { expirationTtl: Math.min(ttl, 86400) });
    }
    const out = {}, capas = {};
    for (const f of fx) { if (pv[f.id]) out[f.id] = pv[f.id]; if (capasF[f.id]) capas[f.id] = capasF[f.id]; }
    // a playlist (e o índice, para o mosaico) só se escreve quando algo mudou
    const albuns = [...new Set(daLista.map((f) => capas[f.id]).filter(Boolean))];
    const mosaico = albuns.length >= 4 ? albuns.slice(0, 4).map(capaPequena) : albuns.slice(0, 1);
    const novoMosaico = mosaico.length && JSON.stringify(mosaico) !== JSON.stringify(d.capas || []);
    if (novoMosaico || JSON.stringify(capasF) !== JSON.stringify(d.capasF || {})) {
        d.capasF = capasF;
        if (novoMosaico) d.capas = mosaico;
        await guarda('playlist:' + d.id, JSON.stringify(d));
        if (novoMosaico) await atualizarIndice(env, d).catch(() => {});
    }
    return { previas: out, capas };
}
// as capas do Tidal: as faixas dão o álbum, o álbum dá a capa (160 px). Até 6 pedidos. Devolve a capa, '' quando o Tidal
// não a tem, e nada quando não se soube (fica para a próxima). Não escreve na KV: a playlist guarda-as.
const MAX_IDS_CAPAS = 20;
async function capasTidal(env, fx) {
    const out = {};
    if (!fx.length) return out;
    const t = await acesso(env);
    const pais = t.pais || 'PT';
    const albumDe = {}, arte = {}, vistas = new Set(), vistos = new Set();
    let pedidos = 0;
    const ids = fx.map((f) => String(f.id));
    for (let i = 0; i < ids.length && pedidos < 3; i += MAX_IDS_CAPAS, pedidos++) {
        const lote = ids.slice(i, i + MAX_IDS_CAPAS);
        const doc = await tidal(env, '/tracks', { query: { 'filter[id]': lote, include: ['artists', 'albums', 'genres'], countryCode: pais } });
        lote.forEach((id) => vistas.add(id));
        for (const x of doc?.data || []) { const a = x?.relationships?.albums?.data?.[0]?.id; if (a) albumDe[String(x.id)] = String(a); }
    }
    const albuns = [...new Set(Object.values(albumDe))];
    for (let i = 0; i < albuns.length && pedidos < 6; i += MAX_IDS_CAPAS, pedidos++) {
        const lote = albuns.slice(i, i + MAX_IDS_CAPAS);
        const doc = await tidal(env, '/albums', { query: { 'filter[id]': lote, include: 'coverArt', countryCode: pais } });
        lote.forEach((a) => vistos.add(a));
        const obras = new Map((doc?.included || []).filter((x) => x.type === 'artworks').map((x) => [String(x.id), x]));
        for (const a of doc?.data || []) { const u = ficheiroCapa(obras.get(String(a?.relationships?.coverArt?.data?.[0]?.id))); if (u) arte[String(a.id)] = u; }
    }
    for (const id of ids) if (vistas.has(id) && (!albumDe[id] || vistos.has(albumDe[id]))) out[id] = arte[albumDe[id]] || '';
    return out;
}
// o ficheiro de 160 px da capa (ou o mais pequeno acima disso), só do servidor de imagens do Tidal
function ficheiroCapa(obra) {
    const fs = (obra?.attributes?.files || []).filter((f) => /^https:\/\/resources\.tidal\.com\/images\/[0-9a-f/-]+\/\d+x\d+\.jpg$/.test(f?.href || ''));
    const w = (f) => Number(f?.meta?.width) || Number((/\/(\d+)x\d+\.jpg$/.exec(f.href) || [])[1]) || 0;
    const ord = fs.sort((a, b) => w(a) - w(b));
    return (ord.find((f) => w(f) >= 160) || ord[ord.length - 1])?.href || '';
}
// a versão pequena de uma capa, para o mosaico da playlist
const capaPequena = (u) => (/resources\.tidal\.com/.test(u) ? u.replace(/\/\d+x\d+\.jpg$/, '/80x80.jpg') : u.replace('/120x120-', '/56x56-'));
// a capa pequena do álbum no Deezer (120 px, uns 5 KB), só do CDN de imagens do Deezer (reserva)
const capaDeezer = (y) => {
    const u = String(y?.album?.cover_small || '');
    return /^https:\/\/[a-z0-9-]+\.dzcdn\.net\/images\/cover\/[0-9a-f]{32}\/\d+x\d+-[0-9a-z-]+\.jpg$/.test(u) ? u.replace(/\/\d+x\d+-/, '/120x120-') : '';
};
// { p: pré-escuta, c: capa } ('' se o Deezer não a tem); null se não deu para saber (sem folga de pedidos, ou o Deezer falhou)
async function previaDeezer(f, pode) {
    let c = '';
    if (f.isrc) {
        if (!pode()) return null;
        const r = await fetch(`https://api.deezer.com/track/isrc:${encodeURIComponent(f.isrc)}`);
        if (!r.ok) return null;
        const j = await r.json();
        c = capaDeezer(j);
        if (j?.preview) return { p: j.preview, c };
    }
    if (!pode()) return c ? { p: '', c } : null;
    const artista = f.artistas?.[0] || '';
    const r = await fetch(`https://api.deezer.com/search?${new URLSearchParams({ q: `${artista} ${f.titulo}`, limit: '5' })}`);
    if (!r.ok) return null;
    const a = normal(artista), t = normal(f.titulo);
    const x = ((await r.json())?.data || []).find((y) => y.preview && normal(y.title_short || y.title).startsWith(t.slice(0, 12)) && (!a || normal(y.artist?.name).includes(a.split(' ')[0])));
    return { p: x?.preview || '', c: c || capaDeezer(x) };
}

// ---------- mudar o nome (e a descrição): na app e no Tidal, no mesmo link; a renovação semanal mantém-no ----------
// o nome e a descrição da playlist no Tidal (se lá já não existir, segue)
async function nomeNoTidal(env, d) {
    if (!d.tidal?.id) return;
    await tidal(env, `/playlists/${encodeURIComponent(d.tidal.id)}`, { method: 'PATCH', body: { data: { id: d.tidal.id, type: 'playlists',
        attributes: { name: d.nome, description: d.descricao || 'Criada pelo Maestro da app Música.' } } } }).catch((e) => { if (e.status !== 404) throw e; });
}
async function renomear(env, id, c) {
    const d = await obter(env, id);
    const nome = txt(c?.nome, 60);
    if (!nome) throw new Erro(400, 'sem_nome', 'Escreve um nome para a playlist.');
    const descricao = c?.descricao === undefined ? d.descricao : txt(c.descricao, 300);
    Object.assign(d, { nome, descricao });
    await nomeNoTidal(env, d);
    await env.KV.put('playlist:' + d.id, JSON.stringify(d));
    await atualizarIndice(env, d);
    return d;
}

// ---------- atualizar sozinha: liga-se na app; o Maestro renova-a com o mesmo critério, no mesmo link do Tidal ----------
async function renovar(env, id, c) {
    const d = await obter(env, id);
    d.renovar = c?.ativo === true;
    await env.KV.put('playlist:' + d.id, JSON.stringify(d));
    await atualizarIndice(env, d);
    return d;
}
async function renovacao(env, id, c) {
    const d = await obter(env, id);
    const faixas = (Array.isArray(c?.faixas) ? c.faixas : []).map(normalizarFaixa).filter(Boolean).slice(0, 200);
    if (!faixas.length) throw new Erro(400, 'sem_faixas', 'A renovação precisa de "faixas" já encontradas no Tidal (com "id").');
    const agora = new Date().toISOString();
    if (d.origem === 'parecidas' && !d.doTidal) d.doTidal = listaDoTidal(d.faixas, d.criadaEm);
    // (a primeira revisão de uma que nasceu em «Pedir» com música de partida: o nome passa a ser o do Maestro, que diz o
    // pedido; nas de «Mais como esta» e nas outras renovações o nome fica)
    const novoNome = d.origem === 'parecidas' && d.pedido && !d.revistaEm && txt(c?.nome, 60) && txt(c.nome, 60) !== d.nome ? txt(c.nome, 60) : '';
    if (novoNome) Object.assign(d, { nome: novoNome, descricao: txt(c.descricao, 300) || d.descricao });
    // o que mudou (a app mostra-o na afinação que esta renovação cumpre)
    const antes = new Set(d.faixas.map((f) => String(f.id))), depois = new Set(faixas.map((f) => f.id));
    const novas = faixas.filter((f) => !antes.has(f.id));
    d.mudanca = { em: agora, entraram: novas.length, sairam: d.faixas.filter((f) => !depois.has(String(f.id))).length,
        novas: novas.slice(0, 3).map((f) => txt(`${f.titulo}${f.artistas[0] ? ` — ${f.artistas[0]}` : ''}`, 120)) };
    if (d.avaliacao) d.historico = [...(d.historico || []), { em: d.avaliacao.em, nota: d.avaliacao.nota, etiqueta: d.avaliacao.etiqueta }].slice(-10);
    delete d.avaliacao;
    delete d.ecoBase;
    delete d.rejeitadas;
    Object.assign(d, { faixas, candidatas: Array.isArray(c.candidatas) ? c.candidatas.slice(0, 200) : d.candidatas, custo: Number(c.custo) || 0,
        resumo: txt(c.resumo, 1200) || d.resumo, tendencias: (Array.isArray(c.tendencias) ? c.tendencias : d.tendencias || []).map((x) => txt(x, 200)).filter(Boolean).slice(0, 8),
        opcoes: normalizarOpcoes(c.opcoes || d.opcoes || {}), modelo: txt(c.modelo, 60) || d.modelo, renovadaEm: agora, renovacoes: (d.renovacoes || 0) + 1 });
    if (d.tidal?.id) {
        try {
            await substituirNoTidal(env, d.tidal.id, faixas.map((f) => f.id));
            if (novoNome) await nomeNoTidal(env, d);
            d.tidal = { ...d.tidal, faixas: faixas.length, atualizadaEm: agora };
        } catch (e) { if (e.status !== 404) throw e; d.tidal = await criarNoTidal(env, d); }
    } else if (c.tidal && !d.rascunho) d.tidal = await criarNoTidal(env, d);
    await env.KV.put('playlist:' + d.id, JSON.stringify(d));
    await atualizarIndice(env, d);
    return d;
}

// ---------- afinar com o Maestro: «não esta» em faixas e um pedido de afinação, que ele faz na mesma playlist ----------
async function rejeitar(env, id, c) {
    const d = await obter(env, id);
    const f = String(c?.faixa || '');
    if (!d.faixas.some((x) => String(x.id) === f)) throw new Erro(400, 'faixa_invalida', 'Essa faixa não está na playlist.');
    const fora = new Set(d.rejeitadas || []);
    if (c.fora === false) fora.delete(f); else fora.add(f);
    d.rejeitadas = [...fora];
    await env.KV.put('playlist:' + d.id, JSON.stringify(d));
    return d;
}
// Trocar ou tirar uma faixa, na hora (em vez de marcar e esperar pelo Maestro). A app diz qual sai e qual entra:
//   { sai, entra }            troca no mesmo sítio — «entra» é uma candidata guardada (o motor escolhe-a no telemóvel)
//                             ou outra faixa do Tidal, pelo id
//   { sai, parecida: true }   troca pela primeira faixa parecida que o Tidal der (quando já não há candidatas)
//   { sai }                   a faixa sai
//   { entra, pos }            põe uma faixa nesse sítio
//   { desfazer: true }        desfaz a última troca ou a última faixa tirada: fica tudo como estava antes dela
// A que sai fica em «rejeitadas» (não volta a entrar: nem nas trocas seguintes, nem quando o Maestro a afinar) e a
// playlist do Tidal fica igual à da app: as mesmas faixas, pela mesma ordem, no mesmo link. Cada mudança fica em
// «trocas» (as últimas 50; as 5 mais recentes guardam a faixa que saiu, para se poderem desfazer).
async function trocar(env, id, c) {
    const d = await obter(env, id);
    const trocas = Array.isArray(d.trocas) ? d.trocas : [];
    const gravar = async (faixas, mais) => {
        const em = new Date().toISOString();
        Object.assign(d, { faixas }, mais);
        if (d.tidal?.id) {
            await substituirNoTidal(env, d.tidal.id, faixas.map((f) => f.id));
            d.tidal = { ...d.tidal, faixas: faixas.length, atualizadaEm: em };
        }
        await env.KV.put('playlist:' + d.id, JSON.stringify(d));
        const idx = (await env.KV.get('playlists', 'json')) || [];
        await env.KV.put('playlists', JSON.stringify(idx.map((x) => (x.id === d.id ? resumoDe(d) : x))));
        return d;
    };
    if (c?.desfazer === true) {
        const u = trocas.at(-1);
        if (!u?.sai || !u.faixa) throw new Erro(400, 'nada_a_desfazer', 'Não há nada para desfazer.');
        const faixas = d.faixas.slice();
        const onde = u.entra ? faixas.findIndex((x) => String(x.id) === u.entra) : -1;
        if (onde >= 0) faixas[onde] = u.faixa; else faixas.splice(Math.min(faixas.length, u.pos), 0, u.faixa);
        return gravar(faixas, { rejeitadas: (d.rejeitadas || []).map(String).filter((x) => x !== u.sai), trocas: trocas.slice(0, -1) });
    }
    const sai = c?.sai ? String(c.sai) : '';
    let entra = c?.entra ? String(c.entra) : '';
    if (!sai && !entra) throw new Erro(400, 'troca_invalida', 'Indica "sai", "entra" ou as duas.');
    const p = sai ? d.faixas.findIndex((x) => String(x.id) === sai) : -1;
    if (sai && p < 0) throw new Erro(400, 'faixa_invalida', 'Essa faixa não está na playlist.');
    if (entra && !/^\d+$/.test(entra)) throw new Erro(400, 'faixa_invalida', '"entra" tem de ser um id do Tidal.');
    const na = new Set(d.faixas.map((x) => String(x.id)));
    if (entra && na.has(entra)) throw new Erro(409, 'ja_esta', 'Essa faixa já está na playlist.');
    const fora = new Set((d.rejeitadas || []).map(String));
    const cands = Array.isArray(d.candidatas) ? d.candidatas.filter(Boolean) : [];
    const daqui = (x) => cands.find((k) => String(k?.faixa?.id) === x);
    let nova = entra ? daqui(entra) : null;
    if ((entra && !nova) || (!entra && sai && c.parecida === true)) {
        const t = await acesso(env);
        const pais = t.pais || 'PT';
        let ids = [entra];
        if (!entra) {
            const doc = await tidal(env, `/tracks/${sai}/relationships/similarTracks`, { query: { countryCode: pais } });
            ids = idsDe(doc).filter((x) => x !== sai && !na.has(x) && !fora.has(x)).slice(0, 12);
        }
        const det = ids.length ? await porIds(env, ids, pais) : new Map();
        const escolhida = ids.map((x) => det.get(x)).find((f) => f && !(d.opcoes?.limpa && f.explicita));
        if (!escolhida) throw new Erro(404, entra ? 'nao_encontrada' : 'sem_parecidas', entra ? 'Essa faixa já não está no Tidal.' : 'Não encontrei outra faixa parecida com esta.');
        entra = String(escolhida.id);
        const de = sai ? d.faixas[p] : null;
        // (a que a pessoa escolheu pelo id fica fixa: quando afinar, o motor não a tira; a parecida do Tidal não)
        const q = c.parecida === true && de ? { artista: escolhida.artistas[0] || '', titulo: escolhida.titulo, motivo: `Parecida com «${de.titulo}».` }
            : { artista: escolhida.artistas[0] || '', titulo: escolhida.titulo, motivo: 'Escolhida por ti.', fixa: true };
        nova = daqui(entra) || { ...q, faixa: escolhida, sinais: sinais(q, escolhida, perfilGosto((await env.KV.get('perfil', 'json')) || {})) };
        if (!daqui(entra)) cands.push(nova);
    }
    const faixas = d.faixas.slice();
    const linha = nova ? { ...nova.faixa, genero: nova.sinais?.genero || '', motivo: nova.motivo || '' } : null;
    const registo = { em: new Date().toISOString() };
    if (sai) {
        Object.assign(registo, { sai, titulo: txt(d.faixas[p].titulo, 120), pos: p, faixa: d.faixas[p] });
        if (linha) faixas[p] = linha; else faixas.splice(p, 1);
        fora.add(sai);
    } else faixas.splice(Math.max(0, Math.min(faixas.length, Number.isInteger(c.pos) ? c.pos : faixas.length)), 0, linha);
    if (!faixas.length) throw new Erro(400, 'sem_faixas', 'A playlist não pode ficar sem faixas: apaga-a.');
    if (entra) { registo.entra = entra; fora.delete(entra); }
    // (só as 5 últimas guardam a faixa que saiu: chega para desfazer e a playlist não engorda)
    const todas = [...trocas, registo].slice(-50).map((r, i, l) => (i < l.length - 5 && r.faixa ? (({ faixa, ...resto }) => resto)(r) : r));
    return gravar(faixas, { candidatas: cands, rejeitadas: [...fora], trocas: todas });
}
async function afinarPedido(env, id, c) {
    const d = await obter(env, id);
    const texto = txt(c?.texto, 500);
    // as faixas que a pessoa tirou ou trocou (já não estão na playlist: o nome vem das candidatas) e as marcadas à
    // antiga (ainda lá estão): o Maestro não as volta a pôr
    const nomes = new Map([...(d.candidatas || []).map((x) => x?.faixa), ...d.faixas].filter(Boolean).map((f) => [String(f.id), f]));
    const rejeitadas = (d.rejeitadas || []).map(String).map((x) => ({ id: x, artista: nomes.get(x)?.artistas?.[0] || '', titulo: nomes.get(x)?.titulo || '' }));
    const marcadas = new Set(d.faixas.map((f) => String(f.id)).filter((x) => rejeitadas.some((r) => r.id === x)));
    if (!texto && !marcadas.size) throw new Erro(400, 'afinar_vazio', 'Diz o que mudar.');
    const lista = (await env.KV.get('pedidos', 'json')) || [];
    if (lista.filter((x) => x.estado === 'pendente').length >= MAX_PEDIDOS) throw new Erro(429, 'demasiados', `Já há ${MAX_PEDIDOS} pedidos à espera.`);
    const p = { id: novoId('q'), texto: texto || `Afinar «${d.nome}»`, opcoes: normalizarOpcoes(d.opcoes || {}), estado: 'pendente', criadoEm: new Date().toISOString(),
        afinar: { playlist: d.id, nome: d.nome, rejeitadas } };
    lista.unshift(p);
    await env.KV.put('pedidos', JSON.stringify(lista.slice(0, 60)));
    // a playlist guarda as afinações que lhe foram pedidas (a app mostra-as por baixo do pedido original)
    d.afinacoes = [...(d.afinacoes || []), { pedido: p.id, texto, rejeitadas: rejeitadas.length, em: p.criadoEm }].slice(-20);
    await env.KV.put('playlist:' + d.id, JSON.stringify(d));
    return p;
}

// ---------- as ideias de pedidos: o Maestro escreve-as em cada corrida (de dia, de noite ou sempre); a app mostra-as ----------
async function guardarIdeias(env, c) {
    const ideias = (Array.isArray(c?.ideias) ? c.ideias : []).map((x) => {
        const texto = txt(x?.texto, 120);
        if (texto.length < 3) return null;
        const o = normalizarOpcoes(x.opcoes || {});
        const porque = txt(x?.porque, 90);
        return { texto, momento: ['dia', 'noite'].includes(x.momento) ? x.momento : 'sempre', ...(porque ? { porque } : {}),
            ...(x.opcoes?.estilo ? { estilo: o.estilo } : {}), ...(x.opcoes?.arco ? { arco: o.arco } : {}) };
    }).filter(Boolean).slice(0, 12);
    if (!ideias.length) throw new Erro(400, 'sem_ideias', 'Indica "ideias": [{ "texto", "momento": "dia|noite|sempre" }].');
    await env.KV.put('ideias', JSON.stringify({ ideias, geradasEm: new Date().toISOString() }));
    return { ok: true, n: ideias.length, dia: ideias.filter((x) => x.momento === 'dia').length, noite: ideias.filter((x) => x.momento === 'noite').length };
}

// ---------- mais como esta: faixas parecidas (as do Tidal), numa playlist já no Tidal e pronta para afinar ----------
// Quem escolhe aqui é o Tidal (parecidas, pela ordem dele): ouve-se logo. Fica um pedido ao Maestro para a rever na
// corrida seguinte, na mesma playlist (o mesmo link): pesquisa, critério de qualidade e a ordem do motor.
async function maisComoEsta(env, c, quem) {
    return parecidasDe(env, String(c?.faixa || ''), { limpa: c?.limpa === true }, quem);
}
// as parecidas de uma faixa (as do Tidal, pela ordem dele), numa playlist logo no Tidal, e o pedido de revisão ao
// Maestro. Com «texto» (um pedido feito em «Pedir» com música de partida), o Maestro revê-a para responder a esse
// pedido, com as opções dele, e dá-lhe um nome seu; sem texto («Mais como esta»), revê-a à volta da faixa
async function parecidasDe(env, id, { limpa = false, opcoes = null, texto = '' } = {}, quem) {
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
        if (!f || (limpa && i && f.explicita)) return null;
        const p = { artista: f.artistas[0] || '', titulo: f.titulo, motivo: i ? `Parecida com «${semente.titulo}».` : texto ? 'A música de partida.' : 'A faixa de partida.', fixa: !i };
        return { ...p, faixa: f, sinais: sinais(p, f, g) };
    }).filter(Boolean);
    const faixas = candidatas.map((x) => ({ ...x.faixa, genero: x.sinais?.genero || '', motivo: x.motivo }));
    const de = `«${semente.titulo}»${semente.artistas[0] ? `, de ${semente.artistas[0]}` : ''}`;
    const d = await guardar(env, { nome: txt(`Parecidas com ${semente.titulo}`, 60), descricao: txt(`Faixas parecidas com «${semente.titulo}», de ${semente.artistas[0] || 'vários'}.`, 300),
        resumo: texto ? `Começou pelas faixas parecidas com ${de}: as do Tidal, pela ordem dele. O Maestro revê-a com o teu pedido na próxima corrida, aqui e no mesmo link do Tidal.`
            : `Pedi ao Tidal as faixas parecidas com «${semente.titulo}»: são as dele, pela ordem dele. O Maestro revê-a na próxima corrida (às 07:44 ou às 18:44), aqui e no mesmo link do Tidal.`,
        pedido: texto, faixas, candidatas, opcoes: opcoes || { faixas: Math.max(5, faixas.length), maxArtista: 3, limpa }, origem: 'parecidas', tidal: true }, quem);
    const lista = (await env.KV.get('pedidos', 'json')) || [];
    if (lista.filter((x) => x.estado === 'pendente').length < MAX_PEDIDOS) {
        const p = { id: novoId('q'), texto: texto || txt(`Mais como ${de}`, 500), opcoes: d.opcoes, estado: 'pendente', criadoEm: d.criadaEm,
            afinar: { playlist: d.id, nome: d.nome, rejeitadas: [], rever: true } };
        lista.unshift(p);
        await env.KV.put('pedidos', JSON.stringify(lista.slice(0, 60)));
        d.afinacoes = [{ pedido: p.id, texto: 'Rever as parecidas do Tidal', rejeitadas: 0, em: p.criadoEm, rever: true }];
        await env.KV.put('playlist:' + d.id, JSON.stringify(d));
    }
    return d;
}

// ---------- para o Maestro: as tuas mixes do Tidal ----------
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

// ---------- tendências: o que se está a ouvir (recolhido pelo cron) e o que disso é do teu gosto ----------
async function tendencias(env) {
    const resumo = await env.KV.get('tendencias:resumo', 'json');
    if (!resumo) return { dias: 0, fontes: [], paraTi: [] };
    return { ...resumo, paraTi: paraTi(resumo, await env.KV.get('perfil', 'json')) };
}

// ---------- para o Maestro: álbuns novos dos artistas que segues (os últimos `dias`) ----------
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
        attributes: { name: d.nome, description: d.descricao || 'Criada pelo Maestro da app Música.', accessType: 'UNLISTED' } } } });
    const pid = r?.data?.id;
    if (!pid) throw new Erro(502, 'tidal', 'O Tidal não devolveu a playlist criada.');
    const ids = d.faixas.map((f) => f.id);
    for (let i = 0; i < ids.length; i += MAX_ITENS) {
        await tidal(env, `/playlists/${pid}/relationships/items`, { method: 'POST', body: { data: ids.slice(i, i + MAX_ITENS).map((x) => ({ id: x, type: 'tracks' })), meta: { onDuplicates: 'SKIP' } } });
    }
    return { id: String(pid), url: `https://tidal.com/browse/playlist/${pid}`, criadaEm: new Date().toISOString(), faixas: ids.length };
}

// ---------- pedidos ao Maestro (feitos na app; a tarefa agendada trata-os) ----------
// os pedidos feitos levam a ligação do Tidal da playlist, para se abrir logo
async function pedidos(env) {
    const [lista, idx] = await Promise.all([env.KV.get('pedidos', 'json'), env.KV.get('playlists', 'json')]);
    const tidalDe = new Map((idx || []).map((x) => [x.id, x.tidal]));
    return (lista || []).map((x) => (x.playlist && tidalDe.get(x.playlist) ? { ...x, tidal: tidalDe.get(x.playlist) } : x));
}

async function pedir(env, c, quem) {
    const texto = txt(c?.texto, 500);
    if (texto.length < 3) throw new Erro(400, 'pedido_vazio', 'Escreve o que queres ouvir.');
    const lista = (await env.KV.get('pedidos', 'json')) || [];
    if (lista.filter((x) => x.estado === 'pendente').length >= MAX_PEDIDOS) throw new Erro(429, 'demasiados', `Já há ${MAX_PEDIDOS} pedidos à espera.`);
    // com uma música de partida: a playlist nasce já, com as parecidas dela; o pedido fica para o Maestro a rever
    if (c.partida != null) {
        const o = normalizarOpcoes(c.opcoes || {});
        const d = await parecidasDe(env, String(c.partida), { limpa: !!o.limpa, opcoes: o, texto }, quem);
        const ped = ((await env.KV.get('pedidos', 'json')) || []).find((x) => x.afinar?.playlist === d.id);
        return { ...ped, criada: { id: d.id, nome: d.nome, tidal: d.tidal?.url || null } };
    }
    const p = { id: novoId('q'), texto, opcoes: normalizarOpcoes(c.opcoes || {}), estado: 'pendente', criadoEm: new Date().toISOString() };
    lista.unshift(p);
    await env.KV.put('pedidos', JSON.stringify(lista.slice(0, 60)));
    return p;
}

// ---------- avisos no telemóvel (Web Push; a cifra e o VAPID estão em push.js, os mesmos da Meteo) ----------
// push:vapid = o par de chaves do conector (global, criado no primeiro uso); push = os telemóveis de cada pessoa (até 5)
async function chavesPush(env) {
    let k = await env.KV.get('push:vapid', 'json');
    if (!k?.publicKey || !k.privateJwk) { k = await newVapidKeys(); await env.KV.put('push:vapid', JSON.stringify(k)); }
    return k;
}
async function assinarPush(env, c) {
    const s = validSubscription(c?.subscription);
    if (!s) throw new Erro(400, 'assinatura_invalida', 'Este telemóvel não deu uma assinatura de notificações válida.');
    const l = ((await env.KV.get('push', 'json')) || []).filter((x) => x.endpoint !== s.endpoint);
    l.push({ ...s, criadoEm: new Date().toISOString() });
    await env.KV.put('push', JSON.stringify(l.slice(-5)));
    return { ok: true, aparelhos: Math.min(l.length, 5) };
}
async function desassinarPush(env, c) {
    const l = (await env.KV.get('push', 'json')) || [];
    const fica = l.filter((x) => x.endpoint !== c?.endpoint);
    if (fica.length !== l.length) await env.KV.put('push', JSON.stringify(fica));
    return { ok: true };
}
// envia a todos os telemóveis da pessoa; os que o serviço de notificações diz que já não existem (404/410) saem
async function avisar(env, msg) {
    const l = (await env.KV.get('push', 'json')) || [];
    if (!l.length) return { enviados: 0, falhados: 0 };
    const k = await chavesPush(env);
    const r = await Promise.all(l.map((s) => sendPush(s, msg, k, { subject: appUrl(env) })));
    const foram = new Set(l.filter((s, i) => r[i] === 404 || r[i] === 410).map((s) => s.endpoint));
    if (foram.size) await env.KV.put('push', JSON.stringify(l.filter((s) => !foram.has(s.endpoint))));
    const ok = r.filter((x) => x >= 200 && x < 300).length;
    return { enviados: ok, falhados: r.length - ok };
}
async function testarPush(env) {
    const r = await avisar(env, { title: 'Música', body: 'Os avisos estão ligados neste telemóvel.', url: appUrl(env), tag: 'musica-teste' });
    if (!r.enviados && !r.falhados) throw new Erro(409, 'sem_avisos', 'Este telemóvel ainda não ligou os avisos.');
    return r;
}

async function despachar(env, id, playlist) {
    const lista = (await env.KV.get('pedidos', 'json')) || [];
    const p = lista.find((x) => x.id === id);
    if (!p) throw new Erro(404, 'nao_encontrado', 'Esse pedido já não existe.');
    // com ?playlist=<id>: fica feito (e aponta para a playlist); sem: é cancelado
    // (com várias propostas, cada uma junta-se às playlists do pedido; a primeira fica como a playlist dele)
    const out = playlist ? lista.map((x) => (x.id === id ? { ...x, estado: 'feito', playlist: x.playlist || playlist,
        playlists: [...new Set([...(x.playlists || (x.playlist ? [x.playlist] : [])), playlist])], feitoEm: x.feitoEm || new Date().toISOString() } : x)) : lista.filter((x) => x.id !== id);
    await env.KV.put('pedidos', JSON.stringify(out));
    // uma afinação: fica feita (ou sai, se for cancelada) na lista da playlist
    if (p.afinar?.playlist) {
        const d = await env.KV.get('playlist:' + p.afinar.playlist, 'json');
        const a = d?.afinacoes?.find((x) => x.pedido === id);
        if (a && !a.feitoEm) {
            if (playlist) {
                const agora = new Date().toISOString(), m = d.mudanca && d.mudanca.em >= a.em ? d.mudanca : null;
                d.afinacoes = d.afinacoes.map((x) => (x.pedido === id ? { ...x, feitoEm: agora, ...(m ? { entraram: m.entraram, sairam: m.sairam, novas: m.novas } : {}) } : x));
                d.afinadaEm = agora;
                if (p.afinar.rever) { d.por = 'curador'; d.revistaEm = agora; } // as parecidas do Tidal, revistas: passa a ser do Maestro
            } else d.afinacoes = d.afinacoes.filter((x) => x.pedido !== id);
            await env.KV.put('playlist:' + d.id, JSON.stringify(d));
            if (playlist) await atualizarIndice(env, d); // a lista mostra «afinada»
        }
    }
    // o pedido acabou de ficar feito: avisa os telemóveis da pessoa (uma vez). A playlist de um pedido vai logo para o
    // Tidal; uma proposta à antiga (só na app) ainda se escolhe lá
    if (playlist && p.estado === 'pendente') {
        const feita = p.afinar ? null : await env.KV.get('playlist:' + playlist, 'json');
        const msg = p.afinar
            ? { title: p.afinar.rever ? 'Playlist revista' : 'Playlist afinada', body: `«${txt(p.afinar.nome, 80)}» foi ${p.afinar.rever ? 'revista' : 'afinada'} pelo Maestro.`, url: appUrl(env), tag: 'musica-afinar' }
            : feita?.rascunho ? { title: 'Propostas prontas', body: `«${txt(p.texto, 90)}»: escolhe a que vai para o Tidal.`, url: appUrl(env), tag: 'musica-pedido' }
                : { title: 'Playlist pronta', body: `«${txt(p.texto, 90)}»: ${feita?.tidal ? 'já está no teu Tidal.' : 'já está na app.'}`, url: appUrl(env), tag: 'musica-pedido' };
        try { await avisar(env, msg); } catch (e) { console.error('avisar', e); }
    }
    return { ok: true };
}
