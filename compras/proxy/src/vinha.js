// O Vinha (vinha.pt), a loja online de vinhos (volta 13): o robots.txt deixa ler os vinhos (/vinho/…). Cada página traz
// nos dados (JSON-LD) o preço, o EAN e a nota da Vivino (aggregateRating: «4.1» de 903 votos), e no texto as notas
// dos críticos com o ano («93/100 Wine Enthusiast (2019)»). O Ecónomo (economo/vinha.mjs) lê os vinhos que também se
// vendem nos supermercados: o preço vai para produtor_artigo (a loja «vinha»), as notas dos críticos para vinho_nota.
import { palavras } from './sugerir.js';

// o tipo pelo início do nome no endereço («/vinho/vinho-tinto-…» no Vinha, «/vinhos/vinho-tinto-…» na Soares; o vinho
// verde conta como branco, como nos supermercados; «porto-…» é vinho do Porto)
const TIPOS = [['vinho-tinto-', 'vinho-tinto'], ['vinho-branco-', 'vinho-branco'], ['vinho-verde-', 'vinho-branco'], ['vinho-rose-', 'vinho-rose'],
    ['vinho-do-porto-', 'vinho-do-porto'], ['porto-', 'vinho-do-porto'], ['espumante-', 'espumante']];
export const slugDe = (url) => String(url).replace(/\/(item_\d+\.html)?$/, '').split('/').pop() ?? '';
export const tipoDoSlug = (url) => {
    const s = slugDe(url);
    return TIPOS.find(([p]) => s.startsWith(p))?.[1] ?? null;
};

const html = (s) => String(s ?? '').replace(/&#8211;|&#8212;/g, '–').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
    .replace(/&#8217;|&#039;|´/g, "'").replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
// os críticos (o resto é concurso)
const CRITICOS = /parker|wine advocate|spectator|enthusiast|suckling|jancis|vinous|falstaff|tim atkin|revista de vinhos|grandes escolhas|wine & soul|essencia do vinho|descorchados|decanter(?! world)/i;

// as notas da secção «Prémios»: uma por linha («Editor's Choice – 93/100 Wine Enthusiast (2021)», «Medalha de Ouro –
// Concurso X 2023»): [{ fonte, tipo, valor, colheita }]
export function premiosDoTexto(t) {
    const r = [];
    for (const l0 of String(t).split(/\n|<br\s*\/?>/i)) {
        const l = html(l0);
        if (!l) continue;
        const ano = l.match(/\((\d{4})\)/)?.[1] ?? l.match(/\b(20\d{2}|19\d{2})\b/)?.[1] ?? null;
        const pts = l.match(/(\d{2,3})\s*\/\s*100\b/) ?? l.match(/(\d{1,2}(?:[.,]5)?)\s*\/\s*20\b/);
        const med = l.match(/grande ouro|duplo ouro|double gold|grand gold|platina|platinum|ouro|gold|prata|silver|bronze/i);
        let fonte, valor;
        if (pts) {
            valor = pts[0].replace(/\s+/g, '');
            if (/\/100/.test(valor) && (Number(pts[1]) < 70 || Number(pts[1]) > 100)) continue;
            fonte = l.slice(l.indexOf(pts[0]) + pts[0].length).replace(/\(\d{4}\)/, '').replace(/^[\s–-]+|[\s–-]+$/g, '').trim();
            if (!fonte) fonte = l.slice(0, l.indexOf(pts[0])).replace(/[\s–-]+$/, '').trim();
        } else if (med) {
            valor = med[0];
            fonte = l.replace(/medalha( de)?/i, '').replace(med[0], '').replace(/\(\d{4}\)/, '').replace(/^[\s–-]+|[\s–-]+$/g, '').trim();
        } else continue;
        if (!fonte || fonte.length > 80) continue;
        r.push({ fonte, tipo: pts && CRITICOS.test(fonte) ? 'critico' : 'concurso', valor, colheita: ano ? Number(ano) : null });
    }
    return r;
}

// o produto nos dados da página (JSON-LD, Product solto ou dentro de @graph): { nome, sku, ean, cent, disponivel, p }
export function produtoJsonLd(h) {
    let p = null;
    for (const m of String(h).matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
        try {
            const j = JSON.parse(m[1]);
            p = [].concat(j['@graph'] ?? j).find((g) => g?.['@type'] === 'Product') ?? p;
        } catch { /* outro bloco */ }
    }
    if (!p) return null;
    const of = [].concat(p.offers ?? [])[0];
    const preco = Number([].concat(of?.priceSpecification ?? [])[0]?.price ?? of?.price);
    if (!(preco > 0)) return null;
    return { nome: html(p.name), sku: p.sku ?? p.productID ?? null, ean: p.gtin13 ?? p.gtin ?? null, cent: Math.round(preco * 100),
        disponivel: /InStock/i.test(of?.availability ?? '') ? 1 : 0, p };
}
// o tamanho em cl pelo nome («75cl», «75 Cl», «1,5 L»)
export function clDoNome(nome) {
    const c = String(nome).match(/(\d+(?:[.,]\d+)?)\s*cl\b/i), l = String(nome).match(/(\d+(?:[.,]\d+)?)\s*l\b/i);
    return c ? Number(c[1].replace(',', '.')) : l ? Math.round(Number(l[1].replace(',', '.')) * 100) : null;
}
// uma página de vinho da Garrafeira Soares → { id, nome, url, tipo, cent, cl, ean, disponivel } ou null (o preço e o EAN nos
// dados da página; as avaliações dos clientes são poucas e não contam)
export function lerSoares(h, url) {
    const x = produtoJsonLd(h);
    if (!x) return null;
    // a região (additionalProperty «Região»), no fim do nome, para o filtro da região da app («… Colheita Alentejo»)
    const prop = (n) => [].concat(x.p.additionalProperty ?? []).find((a) => a?.name === n)?.value;
    const regiao = prop('Região') ? html(prop('Região')) : null;
    const nome = x.nome.replace(/\s+\d+(?:[.,]\d+)?\s*c?l$/i, '').trim();
    return { id: String(x.sku ?? url.match(/item_(\d+)/)?.[1]), nome: regiao && !nome.toLowerCase().includes(regiao.toLowerCase()) ? `${nome} ${regiao}` : nome, nomeCompleto: x.nome, url,
        tipo: tipoDoSlug(url), cent: x.cent, cl: clDoNome(x.nome) ?? (x.p.size ? Math.round(parseFloat(x.p.size) * 100) : null), colheita: null, ean: x.ean,
        disponivel: x.disponivel, vivino: null, votos: null, fontes: [] };
}

// uma página de vinho → { id, nome, url, tipo, cent, cl, ean, disponivel, vivino, votos, fontes } ou null
export function lerVinho(h, url) {
    h = String(h);
    let p = null;
    for (const m of h.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
        try {
            const j = JSON.parse(m[1]);
            p = (j['@graph'] ?? [j]).find((g) => g['@type'] === 'Product') ?? p;
        } catch { /* outro bloco */ }
    }
    if (!p) return null;
    const of = [].concat(p.offers ?? [])[0];
    const preco = Number([].concat(of?.priceSpecification ?? [])[0]?.price ?? of?.price);
    if (!(preco > 0)) return null;
    const nome = html(p.name);
    const cl = nome.match(/(\d+(?:[.,]\d+)?)\s*cl\b/i) ? Number(nome.match(/(\d+(?:[.,]\d+)?)\s*cl\b/i)[1].replace(',', '.'))
        : nome.match(/(\d+(?:[.,]\d+)?)\s*l\b/i) ? Number(nome.match(/(\d+(?:[.,]\d+)?)\s*l\b/i)[1].replace(',', '.')) * 100 : null;
    const colheita = Number(nome.match(/\b(19|20)\d{2}\b/)?.[0]) || null;
    const ar = p.aggregateRating;
    const vivino = ar && Number(ar.ratingValue) > 0 && Number(ar.ratingCount) > 0 ? Number(ar.ratingValue) : null;
    // as notas: a da colheita à venda (o destaque, «90/100 Wine Spectator») e as da secção «Prémios»
    const fontes = [];
    for (const m of h.matchAll(/class="round_rating text-bordeaux[^"]*"[^>]*>(\d{2,3})<\/span><span[^>]*>\/(100|20)<\/span>([^<]*)/g)) {
        const fonte = html(m[3]);
        if (fonte) fontes.push({ fonte, tipo: CRITICOS.test(fonte) ? 'critico' : 'concurso', valor: `${m[1]}/${m[2]}`, colheita });
    }
    const pr = h.match(/<h3>\s*Pr[ée]mios\s*<\/h3>\s*<p>([\s\S]*?)<\/p>/i);
    if (pr) fontes.push(...premiosDoTexto(pr[1]));
    const vistas = new Set();
    return {
        id: String(p.sku ?? url.split('/vinho/')[1]?.replace(/\/$/, '')), nome: nome.replace(/,\s*\d+(?:[.,]\d+)?\s*c?l\b/i, '').replace(/\s+/g, ' ').trim(), // com a região («… 2023 Alentejo»), para o filtro da região
        nomeCompleto: nome, url, tipo: tipoDoSlug(url), cent: Math.round(preco * 100), cl, colheita, ean: p.gtin13 ?? null,
        disponivel: /InStock/i.test(of?.availability ?? '') ? 1 : 0, vivino, votos: vivino ? Number(ar.ratingCount) : null,
        fontes: fontes.filter((f) => { const k = `${f.fonte}|${f.valor}|${f.colheita}`.toLowerCase(); if (vistas.has(k)) return false; vistas.add(k); return true; }),
    };
}

// o núcleo do nome de um vinho: as palavras que o distinguem (sem «vinho», a região, o ano, a garrafa)
const GENERICAS = new Set(['vinho', 'porto', 'doc', 'igp', 'dop', 'regional', 'garrafa', 'cl', 'ml', 'lt', 'l', 'douro', 'alentejo', 'alentejano',
    'dao', 'bairrada', 'lisboa', 'tejo', 'setubal', 'peninsula', 'verde', 'verdes', 'minho', 'beira', 'interior', 'tras',
    'algarve', 'portugal', 'duriense', 'palmela', 'colares', 'bucelas', 'tavora', 'varosa', 'transmontano', 'madeira', 'acores']);
const CORES = new Set(['tinto', 'branco', 'rose']);
// palavras que mudam o vinho: um nome só condiz com outro que também as tenha
const MUDAM = new Set(['reserva', 'grande', 'garrafeira', 'privado', 'especial', 'superior', 'escolha', 'selecionada', 'seleccionada', 'velha',
    'velho', 'vinha', 'old', 'vine', 'single', 'colheita', 'tardia', 'magnum', 'touriga', 'nacional', 'franca', 'alvarinho', 'arinto', 'encruzado',
    'baga', 'syrah', 'alicante', 'bouschet', 'aragone', 'trincadeira', 'castelao', 'loureiro', 'avesso', 'antao', 'vaz', 'viosinho', 'rabigato',
    'sauvignon', 'chardonnay', 'cabernet', 'merlot', 'pinot', 'moscatel', 'sousao', 'jaen', 'bical', 'fernao', 'pire', 'verdelho', 'gouveio',
    'branco', 'tinto', 'rose', 'super', 'extra', 'bruto', 'seco', 'meio', 'doce', 'vintage', 'selecao', 'ano', 'erro', 'bio', 'biologico', 'organic', 'lote', 'edicao', 'limitada', 'premium', 'signature', 'icon', 'tawny', 'ruby', 'lbv']);
export const nucleo = (s) => new Set(palavras(s).filter((w) => !/\d/.test(w) && !GENERICAS.has(w)));

// o nome de um supermercado condiz com o do Vinha (o mesmo vinho): todas as palavras do supermercado estão no Vinha,
// pelo menos duas que distinguem (além da cor), e o Vinha não tem a mais palavras que mudam o vinho (a casta, a gama)
// nem mais de 3 a mais (o nome do produtor). Devolve { chave (as palavras: a chave da nota), amais } ou null.
export function condiz(nomeSuper, nomeVinha) {
    const s = nucleo(nomeSuper), v = nucleo(nomeVinha);
    const dist = [...s].filter((w) => !CORES.has(w));
    if (dist.length < 2 || ![...s].every((w) => v.has(w))) return null;
    const amais = [...v].filter((w) => !s.has(w));
    if (amais.length > 3 || amais.some((w) => MUDAM.has(w))) return null;
    // o Porto Vintage ou Colheita de um ano não é o de outro
    const ano = (x) => String(x).match(/\b(19|20)\d{2}\b/)?.[0];
    if ((v.has('vintage') || v.has('colheita')) && ano(nomeSuper) && ano(nomeVinha) && ano(nomeSuper) !== ano(nomeVinha)) return null;
    return { chave: [...s].join(' '), amais: amais.length };
}

// o mesmo vinho num supermercado (garrafa de 75 cl), pela chave que o Ecónomo guardou (as palavras do nome, as mesmas),
// o mais barato: { c, cent, nome } ou null
export function mesmoVinho(produtos, chave) {
    if (!chave) return null;
    const k = new Set(String(chave).split(' '));
    const igual = (n) => { const s = nucleo(n); return s.size === k.size && [...s].every((w) => k.has(w)); };
    const ms = produtos.filter((p) => p.cent > 0 && (p.q == null || Math.abs(p.q - 0.75) < 0.01) && igual(p.nome)).sort((a, b) => a.cent - b.cent);
    return ms.length ? { c: ms[0].c, cent: ms[0].cent, nome: ms[0].nome } : null;
}
