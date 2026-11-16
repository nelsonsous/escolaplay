// Conector da app Compras (Cloudflare Worker), como o meteo/proxy e o musica/proxy. A app está no GitHub Pages.
//
// A app (com a chave do aparelho: Authorization: Bearer <id>.<segredo>)
//   POST /api/aparelho                 um aparelho novo, numa casa nova: { chave, casa: { codigo } } (só da origem da app)
//   GET  /api/casa                     { codigo, aparelhos, local, lojas }
//   POST /api/casa/cp {cp}             o código postal da casa (para o stock do Continente na zona; zona.js)
//   POST /api/casa/lojas {local, cadeias, spar}  a localidade e as lojas da casa (lojas.js)
//   GET  /api/lojas?q=…                as lojas SPAR de uma localidade ou código postal
//   POST /api/casa/entrar  {codigo}    passar para outra casa (leva o que tinha na lista)
//   GET  /api/lista                    { versao, itens } com o preço de cada produto escolhido (precos.js)
//   POST /api/lista        {ops}       mudar a lista (ver casa.js) e recebê-la como ficou; um produto escolhido
//                                      agora sem preço recente lê-se logo no site da cadeia
//   GET  /api/procurar?cadeia=…&q=…    { cadeia, produtos: [{ id, nome, url }] } do índice dessa cadeia (indice.js)
//   POST /api/precos  {cadeia, produtos}  os preços dos produtos de uma procura (no máximo 8; os que faltam lê-se no
//                                      máximo dois): { cadeia, produtos: [{ id, cent, antes, uc, ub, esgotado }] }
//   POST /api/talao   {imagem}         a fotografia de um talão (data URL JPEG): a IA lê-o, guarda-se e risca-se na lista
//                                      o que lá vem: { id, loja, dia, total, linhas, riscadas } (talao.js)
//   GET  /api/costume                  o que costumas comprar (dos talões) e não está na lista: { coisas } (costume.js)
//   POST /api/receita { url, legenda? } ou { texto }  a ligação de um vídeo de receita (TikTok, YouTube): { prato, ingredientes: [{ t, n }] }
//   GET  /api/natal?modo=qualidade|equilibrio|preco&teto=€&partes=…  o Cabaz de Natal: 3 opções por parte
//   GET  /api/sugerir?q=…              os tipos de produto que começam pelo que se escreveu: { tipos: [{ k, nome, n }] }
//   GET  /api/seccao?s=…              os tipos de uma secção (seccoes.js): { sec, tipos }
//   GET  /api/tipo?k=…                 os produtos de um tipo nas cadeias, com os tamanhos e as marcas (sugerir.js)
//   GET  /api/saude                    a hora do preço mais recente de cada cadeia (saude.js)
// O cron (de dois em dois minutos): aos minutos redondos (0, 10, 20…) lê os preços velhos dos produtos que estão nas
// listas (precos.js, refrescar), menos ao minuto 30, em que revê as escolhas das listas (escolhas.js); nos outros, uma
// página de categoria de uma cadeia, à vez (catalogo.js): cada cadeia recebe no máximo um pedido a cada seis minutos.
// A casa, a lista e os preços estão na D1 (env.DB; migrations/); a KV (env.KV) guarda o índice de cada cadeia.
// A sonda (volta 1; com o segredo SONDA_TOKEN)
//   GET /sonda?url=…                   a resposta da cadeia tal e qual (estado, tempo e cabeçalhos à parte)
//   GET /sonda/produto?cadeia=…&url=…  o produto lido pela fonte da cadeia (src/fontes/); ou &id=…, onde há endereço por número
//   GET /sonda/catalogo?url=…          lê já uma página do catálogo (só as da tabela pagina) e guarda os produtos
//   GET /sonda/receita?url=…            lê uma receita (o mesmo que /api/receita, para o Ecónomo experimentar)
//   GET /sonda/saude                    a saúde da base: páginas lidas e a falhar por cadeia, preços recentes, suspeitos…
//   GET /sonda/revisao?de=0&n=20        revê os tipos (os suspeitos e os nomes: revisao.js); ?k=… os suspeitos de um tipo
// Regras da sonda: só GET, só https, só os domínios das cadeias (SONDA_HOSTS) e só com o segredo, para o conector não
// servir de passagem a mais ninguém. Identifica-se como é (UA), não tenta passar proteções contra robôs e só se usa
// em caminhos que o robots.txt de cada cadeia deixa.
// Plano gratuito: 10 ms de CPU por pedido — a sonda não lê o conteúdo; as fontes leem só pedaços; a procura é uma
// cadeia de cada vez (a app pede as quatro em paralelo) e o índice fica na memória do Worker uma hora.
import { FONTES } from './fontes/index.js';
import { CADEIAS, procurar } from './indice.js';
import { cabazDeNatal } from './natal.js';
import { dadosDaAnalise } from './analise.js';
import { pedirAnalise, ultimaAnalise, pendentes, gravarResultado } from './pedidos.js';
import { lerReceita } from './receita.js';
import { Erro, codigoLimpo, novoAparelho, aparelhoDe, casaDe, gravarLojas, gravarPessoas, gravarCp, lerLista, mudarLista, entrarNaCasa, produto } from './casa.js';
import { lojasDaCasa, lojasDe } from './lojas.js';
import { juntarPrecos, precosNovos, precosDe, refrescar } from './precos.js';
import { CADEIAS_CATALOGO, cronCatalogo, lerPagina } from './catalogo.js';
import { sugerir, produtosDoTipo, tiposDaSeccao } from './sugerir.js';
import { revisarTipo } from './revisao.js';
import { saude, saudeCurta } from './saude.js';
import { zonaContinente, produtoNaZona, stockZonas, cpValido } from './zona.js';
import { atualizarEscolhas } from './escolhas.js';
import { lerTalao, MAX_IMAGEM } from './talao.js';
import { sugestoes } from './costume.js';
import { UA, pedir } from './rede.js';

export { UA };
export const VERSION = '0.55.0';
export const SONDA_HOSTS = [
    'continente.pt', 'pingodoce.pt', 'auchan.pt', 'intermarche.pt', 'minipreco.pt', 'lidl.pt', 'aldi.pt',
    'mercadona.pt', 'mercadona.es', 'elcorteingles.pt', 'openfoodfacts.org', 'spar.pt',
    // lojas online de produtores (volta 7): o bacalhau da Lugrade…
    'lugrade.com', 'riberalves.pt', 'merceariadeportugal.com',
    // os folhetos do Lidl (volta 12): a app do folheto lê-os do serviço de folhetos do grupo (economo/lidl-folheto.mjs)
    'leaflets.schwarz',
    // lojas online fora dos hipermercados (volta 13: a pesquisa por famílias; cada uma só se lê se o robots.txt deixar)
    'vinha.pt', 'garrafeirasoares.pt', 'onwine.pt', 'vinhoemcasa.pt', 'carnesdamontanha.pt', 'apolonia.com', 'nutritienda.com',
    'avidaportuguesa.com', 'deltacafes.com', 'bomsite.com', 'cascarija.pt', 'hortodocampogrande.pt', 'mariadopomar.pt',
    'mariagranel.com', 'makro.pt', 'recheio.pt', 'singular.shop', 'lugrade.pt',
    // garrafeiras online (ciclo 3), experimentadas a 15/11: a Garrafeira Nacional pede validação humana, a Portugal
    // Vineyards tem o desafio da Cloudflare e a Wine House devolve páginas vazias a robôs: não se leem (não se contornam)
    'garrafeiranacional.com', 'portugalvineyards.com', 'winehouseportugal.com',
];
const MAX_CORPO = 64 * 1024;
const MAX_TALAO = MAX_IMAGEM + 1024;
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

// lê já uma página do catálogo (para encher o catálogo de uma vez, em vez de esperar pelo cron)
async function sondaCatalogo(request, env) {
    const nao = await recusa(request, env);
    if (nao) return nao;
    const p = await env.DB.prepare('SELECT url, cadeia, tipo FROM pagina WHERE url = ?').bind(new URL(request.url).searchParams.get('url') ?? '').first();
    if (!p) return json({ erro: 'essa página não está no catálogo (tabela pagina)' }, 404);
    return json(await lerPagina(env.DB, p));
}

// a revisão de uma vez (revisao.js): ?de=0&n=20 revê n tipos a partir do de-ésimo; ?k=… lista os suspeitos de um tipo
async function sondaRevisao(request, env) {
    const nao = await recusa(request, env);
    if (nao) return nao;
    const q = new URL(request.url).searchParams;
    if (q.get('k')) {
        const { results } = await env.DB.prepare('SELECT cadeia, nome, cent, emb, uc, ub, suspeito FROM preco WHERE tipo = ? AND suspeito IS NOT NULL ORDER BY suspeito, uc').bind(q.get('k')).all();
        return json({ k: q.get('k'), suspeitos: results });
    }
    const de = Math.max(0, Number(q.get('de')) || 0), n = Math.min(40, Math.max(1, Number(q.get('n')) || 20));
    const { results } = await env.DB.prepare('SELECT k FROM tipo ORDER BY k LIMIT ? OFFSET ?').bind(n, de).all();
    const feitos = [];
    for (const t of results) feitos.push(await revisarTipo(env.DB, t.k));
    return json({ de, n: feitos.length, feitos });
}

// a zona do Continente de um código postal e um produto lido nela e sem ela (para comparar): ?cp=…&url=…
async function sondaZona(request, env) {
    const nao = await recusa(request, env);
    if (nao) return nao;
    const q = new URL(request.url).searchParams;
    const z = await zonaContinente(q.get('cp'));
    if (!z) return json({ erro: 'código postal sem zona' }, 404);
    const u = q.get('url');
    if (!u || !u.startsWith('https://www.continente.pt/produto/')) return json({ zona: { storeId: z.storeId, nome: z.nome, cookies: z.cookies.map((c) => c.split('=')[0]) } });
    const [naZona, semZona] = await Promise.all([produtoNaZona(z, u), produtoNaZona({ cookies: [] }, u)]);
    return json({ zona: { storeId: z.storeId, nome: z.nome, cookies: z.cookies.map((c) => c.split('=')[0]) }, naZona, semZona });
}

// ---------- a app ----------

async function corpoJSON(request, max = MAX_CORPO) {
    const t = await request.text();
    if (t.length > max) throw new Erro(413, 'pedido grande demais');
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
    const db = env.DB;
    const caminho = url.pathname, metodo = request.method;
    if (caminho === '/api/aparelho' && metodo === 'POST') {
        if (!origemPermitida(request, env)) throw new Erro(403, 'só a app cria aparelhos');
        return json(await novoAparelho(db), 201);
    }
    const ap = await aparelhoDe(db, request);
    if (caminho === '/api/casa' && metodo === 'GET') {
        // com o horário da loja SPAR escolhida (da lista das lojas, na KV)
        const c = await casaDe(db, ap);
        if (c.lojas?.spar) {
            const l = ((await env.KV.get('lojas:spar', { type: 'json', cacheTtl: 3600 })) ?? []).find((x) => x.n === c.lojas.spar);
            if (l?.h) c.lojas.sparh = l.h;
        }
        return json(c);
    }
    if (caminho === '/api/casa/cp' && metodo === 'POST') {
        // o código postal (autorizado pela casa): diz-se ao Continente para saber a zona; null tira
        const { cp } = await corpoJSON(request);
        if (cp == null || cp === '') return json(await gravarCp(db, ap, null, null));
        if (!cpValido(cp)) throw new Erro(400, 'código postal inválido (ex.: 4780-521)');
        const z = await zonaContinente(String(cp).trim());
        return json(await gravarCp(db, ap, String(cp).trim(), z?.nome ?? null));
    }
    if (caminho === '/api/casa/lojas' && metodo === 'POST') return json(await gravarLojas(db, ap, lojasDaCasa(await corpoJSON(request))));
    if (caminho === '/api/casa/pessoas' && metodo === 'POST') return json(await gravarPessoas(db, ap, (await corpoJSON(request)).n));
    if (caminho === '/api/lojas' && metodo === 'GET') {
        const todas = (await env.KV.get('lojas:spar', { type: 'json', cacheTtl: 3600 })) ?? [];
        return json({ lojas: lojasDe(todas, url.searchParams.get('q') ?? '') });
    }
    if (caminho === '/api/casa/entrar' && metodo === 'POST') {
        const { codigo } = await corpoJSON(request);
        const r = await entrarNaCasa(db, ap, codigo);
        return json({ codigo: r.codigo, lista: await juntarPrecos(db, await lerLista(db, r.casa), r.casa) });
    }
    if (caminho === '/api/lista' && metodo === 'GET') return json(await juntarPrecos(db, await lerLista(db, ap.casa), ap.casa));
    if (caminho === '/api/lista' && metodo === 'POST') {
        const { ops } = await corpoJSON(request);
        const lista = await mudarLista(db, ap, ops ?? []);
        await precosNovos(db, ops).catch(() => {}); // sem o preço agora, o cron lê-o depois
        return json(await juntarPrecos(db, lista, ap.casa));
    }
    if (caminho === '/api/precos' && metodo === 'POST') {
        const { cadeia, produtos } = await corpoJSON(request);
        if (!CADEIAS.includes(cadeia)) throw new Erro(400, 'cadeia desconhecida');
        if (!Array.isArray(produtos) || produtos.length > 8) throw new Erro(400, 'produtos: uma lista de no máximo 8');
        const lista = produtos.map((p) => produto(cadeia, p)).filter((p) => p && p.id);
        return json({ cadeia, produtos: await precosDe(db, cadeia, lista) });
    }
    if (caminho === '/api/talao' && metodo === 'POST') {
        const { imagem } = await corpoJSON(request, MAX_TALAO);
        return json(await lerTalao(env, ap, imagem));
    }
    if (caminho === '/api/costume' && metodo === 'GET') return json({ coisas: await sugestoes(db, ap, await lerLista(db, ap.casa)) });
    if (caminho === '/api/sugerir' && metodo === 'GET') {
        return json({ tipos: await sugerir(db, String(url.searchParams.get('q') ?? '').slice(0, 60)) });
    }
    if (caminho === '/api/saude' && metodo === 'GET') return json(await saudeCurta(db));
    // os dados da análise (analise.js): a lista com o que se pesquisou, os filtros e as escolhas, os preços e as lojas
    if (caminho === '/api/analise' && metodo === 'GET') return json(await dadosDaAnalise(db, ap));
    // a análise do Claude a pedido (pedidos.js): pedir (com uma pergunta opcional) e ver a última
    if (caminho === '/api/analise/pedir' && metodo === 'POST') return json(await pedirAnalise(db, env, ap.casa, (await corpoJSON(request)).pergunta, env.espera));
    if (caminho === '/api/analise/ultima' && metodo === 'GET') return json(await ultimaAnalise(db, env, ap.casa, env.espera));
    if (caminho === '/api/receita' && metodo === 'POST') {
        // a ligação de um vídeo de receita (TikTok, YouTube): os ingredientes para juntar à lista
        return json(await lerReceita(env, await corpoJSON(request)));
    }
    if (caminho === '/api/natal' && metodo === 'GET') {
        // o Cabaz de Natal: as cadeias da casa (ou as pedidas), o modo, o teto e as partes
        const lista = (n) => String(url.searchParams.get(n) ?? '').split(',').map((x) => x.trim()).filter(Boolean).slice(0, 12);
        let cadeias = lista('cadeias');
        if (!cadeias.length) cadeias = (await casaDe(db, ap)).lojas?.cadeias ?? [];
        return json(await cabazDeNatal(db, { modo: url.searchParams.get('modo') ?? 'equilibrio', cadeias,
            teto: Number(url.searchParams.get('teto')) || null, partes: lista('partes') }, new Date(), env.KV));
    }
    if (caminho === '/api/seccao' && metodo === 'GET') {
        const sx = Number(url.searchParams.get('s'));
        if (!(sx >= 0 && sx <= 11)) throw new Erro(400, 'secção desconhecida');
        return json({ sec: sx, tipos: await tiposDaSeccao(db, sx) });
    }
    if (caminho === '/api/tipo' && metodo === 'GET') {
        const t = await produtosDoTipo(db, String(url.searchParams.get('k') ?? '').slice(0, 60), new Date(), ap.casa);
        if (!t) throw new Erro(404, 'tipo desconhecido');
        return json(t);
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
    async fetch(request, env0, ctx) {
        // env.espera: o que corre depois da resposta (chamar a tarefa da análise)
        const env = { ...env0, espera: ctx?.waitUntil ? (p) => ctx.waitUntil(p) : null };
        const url = new URL(request.url);
        if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
        if (url.pathname.startsWith('/api/')) {
            try { return await api(request, env, url); } catch (e) {
                if (e instanceof Erro) return json({ erro: e.message }, e.status);
                return json({ erro: 'erro no conector' }, 500);
            }
        }
        // só GET, menos gravar o resultado da análise (com o segredo da sonda)
        if (request.method !== 'GET' && !(request.method === 'POST' && url.pathname === '/sonda/analise/resultado')) return json({ erro: 'só GET' }, 405);
        if (url.pathname === '/') return json({ app: 'compras', conector: VERSION, fase: 'ciclo 3: receitas de um link' });
        if (url.pathname === '/sonda') return sonda(request, env);
        if (url.pathname === '/sonda/produto') return sondaProduto(request, env);
        if (url.pathname === '/sonda/catalogo') return sondaCatalogo(request, env);
        if (url.pathname === '/sonda/revisao') return sondaRevisao(request, env);
        if (url.pathname === '/sonda/zona') return sondaZona(request, env);
        if (url.pathname === '/sonda/receita') {
            const nao = await recusa(request, env);
            if (nao) return nao;
            try { return json(await lerReceita(env, { url: url.searchParams.get('url'), texto: url.searchParams.get('texto') })); } catch (e) { return json({ erro: e.message }, e.status ?? 500); }
        }
        // os dados da análise de uma casa, pelo código da casa ou pelo pedido (para o Ecónomo: economo/analise.mjs); os
        // pedidos à espera; e gravar o resultado de um pedido
        if (url.pathname.startsWith('/sonda/analise')) {
            const nao = await recusa(request, env);
            if (nao) return nao;
            try {
                if (url.pathname === '/sonda/analise/pendentes') return json({ pendentes: await pendentes(env.DB) });
                if (url.pathname === '/sonda/analise/resultado' && request.method === 'POST') {
                    const b = await request.json().catch(() => ({}));
                    return json({ ok: true, resultado: await gravarResultado(env.DB, String(b.id ?? ''), b.resultado) });
                }
                const pid = url.searchParams.get('pedido');
                const c = pid ? await env.DB.prepare('SELECT a.casa AS id, a.pergunta FROM analise a WHERE a.id = ?').bind(pid).first()
                    : await env.DB.prepare('SELECT id FROM casa WHERE codigo = ?').bind(codigoLimpo(url.searchParams.get('codigo'))).first();
                return c ? json({ ...(await dadosDaAnalise(env.DB, { casa: c.id })), ...(pid ? { pedido: pid, pergunta: c.pergunta ?? null } : {}) })
                    : json({ erro: 'casa ou pedido desconhecido' }, 404);
            } catch (e) { return json({ erro: e.message }, e.status ?? 500); }
        }
        if (url.pathname === '/sonda/saude') { const nao = await recusa(request, env); return nao ?? json(await saude(env.DB)); }
        return json({ erro: 'não existe' }, 404);
    },
    async scheduled(evento, env, ctx) {
        const agora = new Date(evento.scheduledTime || Date.now());
        const m = agora.getUTCMinutes();
        const tarefa = m === 30
            ? atualizarEscolhas(env.DB, agora).then((r) => ['escolhas', r])
            : m === 50
            ? stockZonas(env.DB, agora).then((r) => ['zona', r])
            : m % 10 === 0
            ? refrescar(env.DB, agora).then((r) => ['preços', r])
            : cronCatalogo(env.DB, CADEIAS_CATALOGO[Math.floor(m / 2) % CADEIAS_CATALOGO.length], agora).then((r) => ['catálogo', r]);
        ctx.waitUntil(tarefa.then(([o, r]) => console.log(o, JSON.stringify(r))).catch((e) => console.log('cron falhou', String(e))));
    },
};
