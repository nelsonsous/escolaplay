// O Ecónomo — os tipos de produto (volta 5). Cruza as categorias das três cadeias pela última parte do endereço
// («agua-sem-gas» no Continente, «aguas-sem-gas» no Pingo Doce e no Auchan: o tipo agua-sem-gas) e grava na D1 os tipos
// que há em pelo menos duas cadeias, com as páginas de cada um: a página da categoria em cada cadeia e, no Continente,
// as páginas de cada marca dessa categoria (estão no mapa do site). O cron do conector lê-as depois, uma a uma.
//   SONDA_TOKEN_FILE=… NODE_USE_ENV_PROXY=1 node compras/economo/tipos.mjs [--sem-gravar] [--mostrar]
// De onde vêm as categorias: o mapa do site do Continente (category e categoryRefinements) e do Auchan (category); no
// Pingo Doce, os caminhos dos produtos do índice (indice:pingodoce, na KV), porque o mapa dele não lista categorias.
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { sonda, kvGetTexto, d1, d1Linhas, espera } from './comum.mjs';
import { acentua } from '../proxy/src/revisao.js';

// as palavras que não contam para o nome de um tipo; «com» e «sem» contam (água com gás não é água sem gás)
const PARAR = new Set(['e', 'de', 'do', 'da', 'dos', 'das', 'em', 'para', 'a', 'o', 'os', 'as', 'no', 'na', 'nos', 'nas', 'ao', 'ou']);
// categorias que não são tipos de produto
const GERAIS = new Set(['outro', 'outra', 'diverso', 'acessorio', 'novidade', 'promocao', 'oferta', 'pack', 'top', 'todo', 'sugestao', 'destaque', 'campanha']);
// no Auchan, só as secções de supermercado
const AUCHAN = ['alimentacao', 'produtos-frescos', 'bebidas-e-garrafeira', 'congelados', 'limpeza-e-cuidados-do-lar', 'beleza-e-higiene', 'o-mundo-do-bebe', 'animais'];
const FORA_PD = ['promocoes', 'pascoa', 'natal', 'as-nossas-marcas', 'take-away'];

export function singular(w) {
    if (w.length <= 3) return w;
    if (w.endsWith('oes') || w.endsWith('aes')) return w.slice(0, -3) + 'ao';
    if (w.endsWith('ais')) return w.slice(0, -3) + 'al';
    if (/[rzl]es$/.test(w)) return w.slice(0, -2);
    if (w.endsWith('ns')) return w.slice(0, -2) + 'm';
    return w.endsWith('s') ? w.slice(0, -1) : w;
}
// a chave de um tipo a partir da última parte do endereço de uma categoria
export function chave(slug) {
    const ws = String(slug).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split(/[^a-z0-9]+/)
        .filter((w) => w && !PARAR.has(w)).map(singular);
    return ws.join('-');
}
const ultima = (caminho) => caminho.replace(/\/+$/, '').split('/').pop();
// as categorias sem filhas (as folhas), de uma lista de endereços
function folhas(urls) {
    const limpos = [...new Set(urls.map((u) => u.replace(/\/+$/, '')))].sort();
    return limpos.filter((u, i) => !(limpos[i + 1] && limpos[i + 1].startsWith(u + '/')));
}

// os caminhos do Pingo Doce vêm com um espaço invisível codificado («leite-magro%E2%80%8B»): limpo para comparar,
// tal e qual para o endereço
const limpo = (p) => { try { return decodeURIComponent(p).replace(/\u200b/g, ''); } catch { return p; } };
const BASES = { continente: 'https://www.continente.pt/supermercado/', auchan: 'https://www.auchan.pt/pt/', pingodoce: 'https://www.pingodoce.pt/home/produtos/' };

// os tipos da casa (tipos-casa.json): cada caminho é uma categoria ou uma secção (entram as folhas de baixo, menos as
// de «fora»); no Continente entram também as páginas de marca dessas folhas
export function daCasa(curados, { cont = [], ref = [], auchan = [], pd = [] }) {
    const relativos = {
        continente: folhas(cont.filter((u) => u.includes('/supermercado/'))).map((u) => ({ rel: u.split('/supermercado/')[1], url: u + '/' })),
        auchan: folhas(auchan.filter((u) => u.includes('/pt/'))).map((u) => ({ rel: u.split('/pt/')[1], url: u + '/' })),
        pingodoce: pd.map((p) => ({ rel: limpo(p), url: BASES.pingodoce + p })),
    };
    const t = new Map();
    for (const d of curados) {
        const c = {};
        for (const cadeia of ['continente', 'pingodoce', 'auchan']) {
            const us = [];
            for (const pref of d[cadeia] ?? []) {
                for (const f of relativos[cadeia]) {
                    if ((f.rel === pref || f.rel.startsWith(pref + '/')) && !(d.fora ?? []).includes(ultima(f.rel))) us.push(f.url);
                }
            }
            if (cadeia === 'continente') {
                const folhasDoTipo = new Set(us.map((u) => u.replace(/\/+$/, '')));
                for (const r of ref) if (folhasDoTipo.has(r.replace(/\/+$/, '').split('/').slice(0, -1).join('/'))) us.push(r);
            }
            if (us.length) c[cadeia] = [...new Set(us)];
        }
        if (Object.keys(c).length >= 2) t.set(d.k, { nome: d.nome, c, casa: true });
    }
    return t;
}

// { k: { nome, c: { continente: [url], pingodoce: [url], auchan: [url] } } } dos tipos que há em pelo menos duas cadeias
// cont: endereços das categorias do Continente; ref: das páginas de marca do Continente; auchan: do Auchan;
// pd: caminhos das categorias do Pingo Doce («aguas-sumos-e-refrigerantes/aguas/aguas-sem-gas»)
export function cruzar({ cont = [], auchan = [], pd = [] }) {
    const t = new Map();
    const juntar = (cadeia, url, slug, nome) => {
        const k = chave(slug);
        if (!k || GERAIS.has(k) || GERAIS.has(k.split('-')[0])) return;
        if (!t.has(k)) t.set(k, { nome: nome ?? slug.replace(/-/g, ' '), c: {} });
        (t.get(k).c[cadeia] ??= []).push(url);
    };
    const contFolhas = folhas(cont.filter((u) => u.includes('/supermercado/')));
    for (const u of contFolhas) juntar('continente', u + '/', ultima(u));
    for (const u of folhas(auchan.filter((u) => AUCHAN.includes((u.split('/pt/')[1] ?? '').split('/')[0])))) juntar('auchan', u + '/', ultima(u));
    for (const p of pd) if (!FORA_PD.includes(p.split('/')[0])) juntar('pingodoce', BASES.pingodoce + p, ultima(limpo(p)));
    // (as páginas de marca do Continente só entram nos tipos da casa: são muitas)
    for (const [k, v] of t) if (Object.keys(v.c).length < 2) t.delete(k);
    return t;
}

// ---------- ler os mapas e gravar ----------
const locs = (xml) => [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, '&'));
async function xml(url) {
    const { estado, corpo } = await sonda(url, { accept: 'application/xml,text/xml;q=0.9,*/*;q=0.8' });
    if (estado !== 200) throw new Error(`HTTP ${estado} em ${url}`);
    return (corpo[0] === 0x1f && corpo[1] === 0x8b ? gunzipSync(corpo) : corpo).toString('utf8');
}

// as páginas seguintes das categorias de PAGINAR: [url, cadeia, tipo, 0]
export const PAGINAR = { 'vinho-tinto': 6, 'vinho-branco': 6, 'vinho-rose': 3, espumante: 3, 'vinho-do-porto': 3, azeite: 3 };
const POR_PAGINA = { continente: 36, auchan: 24 };
export function paginasSeguintes(paginas) {
    return paginas.filter(([u, c, k, marca]) => !marca && PAGINAR[k] && POR_PAGINA[c] && !u.includes('?'))
        .flatMap(([u, c, k]) => Array.from({ length: PAGINAR[k] - 1 }, (_, i) => [`${u}?start=${(i + 1) * POR_PAGINA[c]}&sz=${POR_PAGINA[c]}`, c, k, 0]));
}

async function main() {
    const args = process.argv.slice(2);
    const indiceCont = locs(await xml('https://www.continente.pt/sitemap_index.xml'));
    const cont = [], ref = [];
    for (const m of indiceCont.filter((u) => /-category(Refinements)?\.xml$/.test(u))) {
        await espera(1500);
        (m.includes('Refinements') ? ref : cont).push(...locs(await xml(m)));
    }
    await espera(1500);
    const indiceAuchan = locs(await xml('https://www.auchan.pt/sitemap_index.xml'));
    const auchan = [];
    for (const m of indiceAuchan.filter((u) => /-category\.xml$/.test(u))) { await espera(1500); auchan.push(...locs(await xml(m))); }
    const pd = ((await kvGetTexto('indice:pingodoce')) ?? '').split('\n').filter((l) => l.startsWith('#')).map((l) => l.split('\t')[1]).filter(Boolean);
    // os da casa (feitos à mão) por cima dos automáticos; uma página fica só no tipo da casa
    const listas = { cont, ref, auchan, pd };
    const casa = daCasa(JSON.parse(readFileSync(new URL('./tipos-casa.json', import.meta.url), 'utf8')).tipos, listas);
    const t = cruzar(listas);
    const daCasaUrls = new Set([...casa.values()].flatMap((v) => Object.values(v.c).flat()));
    for (const [k, v] of t) {
        for (const cadeia of Object.keys(v.c)) { v.c[cadeia] = v.c[cadeia].filter((u) => !daCasaUrls.has(u)); if (!v.c[cadeia].length) delete v.c[cadeia]; }
        if (Object.keys(v.c).length < 2) t.delete(k);
    }
    for (const [k, v] of casa) t.set(k, v);
    console.log(`tipos da casa: ${casa.size}`);
    const marcas = new Set(ref.map((r) => r));
    const paginas = [...t].flatMap(([k, v]) => Object.entries(v.c).flatMap(([c, us]) => us.map((u) => [u, c, k, marcas.has(u) ? 1 : 0])));
    // as categorias grandes (os vinhos: a Continente tem 2 334 tintos) leem-se também nas páginas seguintes (o robots.txt
    // deixa ?start=&sz=), pela ordem da cadeia (os mais vendidos primeiro)
    paginas.push(...paginasSeguintes(paginas));
    console.log(`categorias: Continente ${cont.length} (+${ref.length} de marca), Auchan ${auchan.length}, Pingo Doce ${pd.length}`);
    console.log(`tipos em pelo menos duas cadeias: ${t.size}; páginas: ${paginas.length}`);
    if (args.includes('--mostrar')) for (const [k, v] of t) console.log(k, JSON.stringify(Object.fromEntries(Object.entries(v.c).map(([c, us]) => [c, us.length]))));
    if (args.includes('--sem-gravar')) return;
    // os nomes da casa ficam; os automáticos só entram se o tipo é novo (o cron põe-lhes o nome com acentos)
    await d1Linhas('INSERT INTO tipo (k, nome, casa)', [...t].filter(([, v]) => v.casa).map(([k, v]) => [k, v.nome, 1]), 'ON CONFLICT (k) DO UPDATE SET nome = excluded.nome, casa = 1 WHERE tipo.nome IS NOT excluded.nome OR tipo.casa IS NOT 1');
    await d1Linhas('INSERT INTO tipo (k, nome)', [...t].filter(([, v]) => !v.casa).map(([k, v]) => [k, acentua(v.nome[0].toUpperCase() + v.nome.slice(1))]), 'ON CONFLICT (k) DO NOTHING');
    await d1Linhas('INSERT INTO pagina (url, cadeia, tipo, marca)', paginas, 'ON CONFLICT (url) DO UPDATE SET tipo = excluded.tipo, marca = excluded.marca WHERE pagina.tipo IS NOT excluded.tipo OR pagina.marca IS NOT excluded.marca');
    // as páginas que já não estão em nenhum tipo saem
    const agora = new Set(paginas.map((p) => p[0]));
    const velhas = (await d1('SELECT url FROM pagina')).map((r) => r.url).filter((u) => !agora.has(u));
    for (let i = 0; i < velhas.length; i += 90) await d1(`DELETE FROM pagina WHERE url IN (${velhas.slice(i, i + 90).map(() => '?').join(', ')})`, velhas.slice(i, i + 90));
    const [n] = await d1('SELECT (SELECT count(*) FROM tipo) AS tipos, (SELECT count(*) FROM pagina) AS paginas');
    console.log('na D1:', JSON.stringify(n));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e); process.exit(1); });
