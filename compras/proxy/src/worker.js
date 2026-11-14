// Conector da app Compras (Cloudflare Worker), como o meteo/proxy e o musica/proxy. A app está no GitHub Pages.
//
// A app (com a chave do aparelho: Authorization: Bearer <id>.<segredo>)
//   POST /api/aparelho                 um aparelho novo, numa casa nova: { chave, casa: { codigo } } (só da origem da app)
//   GET  /api/casa                     { codigo, aparelhos }
//   POST /api/casa/entrar  {codigo}    passar para outra casa (leva o que tinha na lista)
//   GET  /api/lista                    { versao, itens }
//   POST /api/lista        {ops}       mudar a lista (ver casa.js) e recebê-la como ficou
//   GET  /api/procurar?cadeia=…&q=…    { cadeia, produtos: [{ id, nome, url }] } do índice dessa cadeia (indice.js)
// A sonda (volta 1; com o segredo SONDA_TOKEN)
//   GET /sonda?url=…                   a resposta da cadeia tal e qual (estado, tempo e cabeçalhos à parte)
//   GET /sonda/produto?cadeia=…&url=…  o produto lido pela fonte da cadeia (src/fontes/); ou &id=…, onde há endereço por número
// Regras da sonda: só GET, só https, só os domínios das cadeias (SONDA_HOSTS) e só com o segredo, para o conector não
// servir de passagem a mais ninguém. Identifica-se como é (UA), não tenta passar proteções contra robôs e só se usa
// em caminhos que o robots.txt de cada cadeia deixa.
// Plano gratuito: 10 ms de CPU por pedido — a sonda não lê o conteúdo; as fontes leem só pedaços; a procura é uma
// cadeia de cada vez (a app pede as quatro em paralelo) e o índice fica na memória do Worker uma hora.
import { FONTES } from './fontes/index.js';
import { CADEIAS, procurar } from './indice.js';
import { Erro, novoAparelho, aparelhoDe, casaDe, lerLista, mudarLista, entrarNaCasa } from './casa.js';

export const VERSION = '0.3.0';
export const UA = 'compras/0.3 (app pessoal de comparação de preços; Cloudflare Worker)';
export const SONDA_HOSTS = [
    'continente.pt', 'pingodoce.pt', 'auchan.pt', 'intermarche.pt', 'minipreco.pt', 'lidl.pt', 'aldi.pt',
    'mercadona.pt', 'mercadona.es', 'elcorteingles.pt', 'openfoodfacts.org',
];
const TIMEOUT_MS = 15000;
const MAX_CORPO = 64 * 1024;
// os cabeçalhos da resposta que dizem quem serve e se há proteção contra robôs (só os nomes dos cookies)
const CABECALHOS = ['server', 'content-type', 'content-length', 'location', 'cache-control', 'cf-ray', 'cf-cache-status',
    'cf-mitigated', 'x-cache', 'via', 'x-akamai-transformed', 'akamai-grn', 'x-datadome', 'retry-after', 'x-robots-tag'];
const CORS = {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'authorization, content-type',
    'access-control-max-age': '86400',
};

const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
    status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...CORS },
});
const ascii = (s) => String(s).replace(/[^\x20-\x7e]/g, '?');

export function hostPermitido(host) {
    const h = String(host || '').toLowerCase();
    return SONDA_HOSTS.some((d) => h === d || h.endsWith('.' + d));
}

// comparação em tempo constante (compara os hashes, que têm sempre o mesmo tamanho)
async function igual(a, b) {
    const te = new TextEncoder();
    const [x, y] = await Promise.all([a, b].map((s) => crypto.subtle.digest('SHA-256', te.encode(String(s)))));
    const u = new Uint8Array(x), v = new Uint8Array(y);
    let d = 0;
    for (let i = 0; i < u.length; i++) d |= u[i] ^ v[i];
    return d === 0;
}

// ---------- a sonda ----------

// null se pode seguir; senão a resposta de recusa
async function recusa(request, env) {
    if (!env.SONDA_TOKEN) return json({ erro: 'sonda desligada (falta o segredo SONDA_TOKEN)' }, 503);
    const auth = request.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token || !(await igual(token, env.SONDA_TOKEN))) return json({ erro: 'não autorizado' }, 401);
    return null;
}

// { u } se o endereço pode ser pedido; senão { erro } com a resposta de recusa
function alvo(s) {
    let u;
    try { u = new URL(s); } catch { return { erro: json({ erro: 'url inválido' }, 400) }; }
    if (u.protocol !== 'https:') return { erro: json({ erro: 'só https' }, 400) };
    if (!hostPermitido(u.hostname)) return { erro: json({ erro: `domínio fora da lista: ${u.hostname}` }, 400) };
    return { u };
}

const pedir = (u, accept) => fetch(u.toString(), {
    headers: { 'user-agent': UA, accept, 'accept-language': 'pt-PT,pt;q=0.9' },
    redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT_MS),
});

function cabecalhos(r) {
    const c = {};
    for (const k of CABECALHOS) {
        const v = r.headers.get(k);
        if (v != null) c[k] = ascii(v).slice(0, 200);
    }
    const cookies = typeof r.headers.getSetCookie === 'function' ? r.headers.getSetCookie() : [];
    if (cookies.length) c['set-cookie'] = cookies.map((s) => ascii(s.split('=')[0].trim()).slice(0, 60)).join(', ');
    return c;
}

async function sonda(request, env) {
    const nao = await recusa(request, env);
    if (nao) return nao;
    const { u, erro } = alvo(new URL(request.url).searchParams.get('url'));
    if (erro) return erro;
    const accept = request.headers.get('x-sonda-accept') || 'text/html,application/json;q=0.9,*/*;q=0.8';
    const t0 = Date.now();
    let r;
    try { r = await pedir(u, accept); } catch (e) {
        return json({ erro: 'a cadeia não respondeu', motivo: String((e && e.message) || e), ms: Date.now() - t0 }, 502);
    }
    return new Response(r.body, {
        status: 200,
        headers: {
            'content-type': r.headers.get('content-type') || 'application/octet-stream',
            'cache-control': 'no-store',
            'x-sonda-status': String(r.status),
            'x-sonda-ms': String(Date.now() - t0),
            'x-sonda-cabecalhos': JSON.stringify(cabecalhos(r)),
        },
    });
}

async function sondaProduto(request, env) {
    const nao = await recusa(request, env);
    if (nao) return nao;
    const q = new URL(request.url).searchParams;
    const cadeia = q.get('cadeia');
    const fonte = Object.hasOwn(FONTES, cadeia) ? FONTES[cadeia] : null;
    if (!fonte) return json({ erro: 'cadeia desconhecida', cadeias: Object.keys(FONTES) }, 400);
    const endereco = q.get('url') ?? (q.get('id') && fonte.urlProduto ? fonte.urlProduto(q.get('id')) : null);
    if (!endereco) return json({ erro: `falta o url (a fonte ${cadeia} não chega a um produto pelo número)` }, 400);
    const { u, erro } = alvo(endereco);
    if (erro) return erro;
    const t0 = Date.now();
    let r;
    try { r = await pedir(u, fonte.urlProduto ? 'application/json,text/html;q=0.9' : 'text/html,application/xhtml+xml'); } catch (e) {
        return json({ erro: 'a cadeia não respondeu', motivo: String((e && e.message) || e), ms: Date.now() - t0 }, 502);
    }
    const corpo = await r.text();
    const ms = Date.now() - t0;
    let produto = null;
    if (r.status === 200) {
        try { produto = fonte.lerProduto(corpo, u.toString()); } catch { produto = null; }
    }
    return json({ cadeia, url: u.toString(), estado: r.status, ms, bytes: corpo.length, cabecalhos: cabecalhos(r), produto });
}

// ---------- a app ----------

async function corpoJSON(request) {
    const t = await request.text();
    if (t.length > MAX_CORPO) throw new Erro(413, 'pedido grande demais');
    try { return t ? JSON.parse(t) : {}; } catch { throw new Erro(400, 'JSON inválido'); }
}

// só a app (a origem dela) cria aparelhos; sem ALLOWED_ORIGINS, qualquer uma (testes, desenvolvimento)
function origemPermitida(request, env) {
    const lista = String(env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
    return !lista.length || lista.includes(request.headers.get('origin') || '');
}

// o índice de uma cadeia fica na memória do Worker uma hora (descodificar 3 MB custa CPU)
const INDICES = new Map();
export const esquecerIndices = () => INDICES.clear();
async function indice(env, cadeia) {
    const c = INDICES.get(cadeia);
    if (c && Date.now() - c.quando < 3600e3) return c.texto;
    const texto = (await env.KV.get('indice:' + cadeia, { cacheTtl: 3600 })) ?? '';
    INDICES.set(cadeia, { texto, quando: Date.now() });
    return texto;
}

async function api(request, env, url) {
    const kv = env.KV;
    const caminho = url.pathname, metodo = request.method;
    if (caminho === '/api/aparelho' && metodo === 'POST') {
        if (!origemPermitida(request, env)) throw new Erro(403, 'só a app cria aparelhos');
        return json(await novoAparelho(kv), 201);
    }
    const ap = await aparelhoDe(kv, request);
    if (caminho === '/api/casa' && metodo === 'GET') {
        const casa = await casaDe(kv, ap);
        return json({ codigo: casa.codigo, aparelhos: casa.aparelhos.length });
    }
    if (caminho === '/api/casa/entrar' && metodo === 'POST') {
        const { codigo } = await corpoJSON(request);
        const r = await entrarNaCasa(kv, ap, codigo);
        return json({ codigo: r.codigo, lista: await lerLista(kv, r.casa) });
    }
    if (caminho === '/api/lista' && metodo === 'GET') return json(await lerLista(kv, ap.casa));
    if (caminho === '/api/lista' && metodo === 'POST') {
        const { ops } = await corpoJSON(request);
        return json(await mudarLista(kv, ap, ops ?? []));
    }
    if (caminho === '/api/procurar' && metodo === 'GET') {
        const cadeia = url.searchParams.get('cadeia');
        if (!CADEIAS.includes(cadeia)) throw new Erro(400, 'cadeia desconhecida');
        const q = String(url.searchParams.get('q') ?? '').slice(0, 80);
        return json({ cadeia, q, produtos: procurar(cadeia, await indice(env, cadeia), q, 6) });
    }
    throw new Erro(404, 'não existe');
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
        if (url.pathname.startsWith('/api/')) {
            try { return await api(request, env, url); } catch (e) {
                if (e instanceof Erro) return json({ erro: e.message }, e.status);
                return json({ erro: 'erro no conector' }, 500);
            }
        }
        if (request.method !== 'GET') return json({ erro: 'só GET' }, 405);
        if (url.pathname === '/') return json({ app: 'compras', conector: VERSION, fase: 'volta 2: a lista da casa' });
        if (url.pathname === '/sonda') return sonda(request, env);
        if (url.pathname === '/sonda/produto') return sondaProduto(request, env);
        return json({ erro: 'não existe' }, 404);
    },
};
