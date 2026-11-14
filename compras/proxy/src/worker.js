// Conector da app Compras (Cloudflare Worker), como o meteo/proxy e o musica/proxy. Volta 1: a sonda — experimentar,
// a partir da Cloudflare, o que cada cadeia deixa ler (compras/PLANO.md, «O que cada cadeia deixa»).
//   GET /sonda?url=…                      a resposta da cadeia tal e qual (estado, tempo e cabeçalhos à parte)
//   GET /sonda/produto?cadeia=…&url=…     o produto lido pela fonte da cadeia (src/fontes/); ou &id=…, onde há endereço por número
// Regras da sonda: só GET, só https, só os domínios das cadeias (SONDA_HOSTS) e só com o segredo SONDA_TOKEN, para o
// conector não servir de passagem a mais ninguém. Identifica-se como é (UA), não tenta passar proteções contra robôs
// e só se usa em caminhos que o robots.txt de cada cadeia deixa: o que uma cadeia recusa fica escrito no plano.
// Plano gratuito: 10 ms de CPU por pedido — /sonda não lê o conteúdo; as fontes leem só pedaços (fontes/comum.js).
import { FONTES } from './fontes/index.js';

export const VERSION = '0.2.0';
export const UA = 'compras/0.2 (app pessoal de comparação de preços; Cloudflare Worker)';
export const SONDA_HOSTS = [
    'continente.pt', 'pingodoce.pt', 'auchan.pt', 'intermarche.pt', 'minipreco.pt', 'lidl.pt', 'aldi.pt',
    'mercadona.pt', 'mercadona.es', 'elcorteingles.pt', 'openfoodfacts.org',
];
const TIMEOUT_MS = 15000;
// os cabeçalhos da resposta que dizem quem serve e se há proteção contra robôs (só os nomes dos cookies)
const CABECALHOS = ['server', 'content-type', 'content-length', 'location', 'cache-control', 'cf-ray', 'cf-cache-status',
    'cf-mitigated', 'x-cache', 'via', 'x-akamai-transformed', 'akamai-grn', 'x-datadome', 'retry-after', 'x-robots-tag'];

const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
    status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
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

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        if (request.method !== 'GET') return json({ erro: 'só GET' }, 405);
        if (url.pathname === '/') return json({ app: 'compras', conector: VERSION, fase: 'sonda (volta 1)' });
        if (url.pathname === '/sonda') return sonda(request, env);
        if (url.pathname === '/sonda/produto') return sondaProduto(request, env);
        return json({ erro: 'não existe' }, 404);
    },
};
