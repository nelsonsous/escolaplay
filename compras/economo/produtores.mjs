// As lojas online de produtores (volta 7): lojas WooCommerce de quem produz (o bacalhau da Lugrade…), que podem ter
// melhor qualidade ou melhor preço do que os supermercados. O robots.txt destas lojas deixa ler a loja e os produtos.
// De cada produto lê as variantes (data-product_variations: o calibre ou o peso, a origem e o preço), calcula o
// preço por quilo pelo peso (o meio do intervalo do calibre: «2Kg a 2.3Kg» → 2,15 kg) e liga-o a um tipo pelas
// etiquetas (o bacalhau e o paloco → «bacalhau»). Grava na tabela produtor_artigo. Uso: node economo/produtores.mjs
import { sonda, d1, d1Linhas, espera } from './comum.mjs';
import { etiquetas } from '../proxy/src/etiquetas.js';

export const PRODUTORES = [
    // uma loja de bacalhau: o que não diz a espécie no nome («Especial», «Lombos Extra») é bacalhau
    { loja: 'lugrade', nome: 'Lugrade', base: 'https://loja.lugrade.com', lista: '/loja/', especie: 'Bacalhau' },
    // a loja da Riberalves (WooCommerce; o robots.txt deixa): bacalhau demolhado ultracongelado, com a cura em meses
    // (9 ou 12); os pratos feitos (pastéis, rissóis, bacalhau com natas) não entram
    { loja: 'riberalves', nome: 'Riberalves', base: 'https://riberalves.pt', lista: '/lojaonline/', especie: 'Bacalhau',
        fora: /past[eé]is|rissois|rissóis|com natas|com broa|edi[cç][aã]o p[aá]scoa/i },
];
// os produtos da lista de uma loja WooCommerce: [url, nome] (o botão com aria-label, ou a ligação do cartão com o título)
export function produtosDaLista(h) {
    const a = [...h.matchAll(/href="(https?:\/\/[^"]+\/produto\/[^"]+)"[^>]*aria-label="([^"]+)"/g)].map((m) => [m[1], limparNome(m[2])]);
    const b = [...h.matchAll(/href="(https?:\/\/[^"]+\/produto\/[^"]+)"[^>]*woocommerce-LoopProduct-link[\s\S]{0,1500}?woocommerce-loop-product__title">([^<]+)</g)].map((m) => [m[1], limparNome(m[2])]);
    return [...b, ...a].filter(([u, n]) => n && !/\?add-to-cart/.test(u));
}
// o nome do produto como vem na lista da loja, limpo («Leia mais sobre “Ovas de Bacalhau 400g iva incluído ”»)
export const limparNome = (s) => html(s).replace(/^(Leia mais sobre|Adicionar ao carrinho:?|Selecionar opções para)\s*/i, '')
    .replace(/[“”"]/g, '').replace(/\s*iva inclu[ií]do\s*/i, ' ').replace(/\s+/g, ' ').trim();
const TIPO_ANIMAL = { bacalhau: 'bacalhau', paloco: 'bacalhau' };
const html = (s) => String(s).replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#8211;/g, '–').replace(/&#039;/g, "'");
const n = (s) => Number(String(s).replace(',', '.'));

// o peso de um calibre ou de uma caixa, em kg («2Kg a 2.3Kg» → 2,15; «1Kg» → 1; «500g» → 0,5), ou null
export function pesoKg(t) {
    const s = String(t ?? '').toLowerCase().replace(/\s+/g, '');
    const r = s.match(/(\d+(?:[.,]\d+)?)(kg|gr?)?a(\d+(?:[.,]\d+)?)(kg|gr?)/);
    if (r) { const g = (x) => (x && x.startsWith('g') ? 1e-3 : 1); const a = n(r[1]) * g(r[2] ?? r[4]), b = n(r[3]) * g(r[4]); return Math.round(((a + b) / 2) * 1000) / 1000; }
    const u = s.match(/(\d+(?:[.,]\d+)?)(kg|gr?)(?![a-z])/);
    return u ? n(u[1]) * (u[2].startsWith('g') ? 1e-3 : 1) : null;
}
const rotuloKg = (q) => (q == null ? null : q < 1 ? `${Math.round(q * 1000)} g` : `${String(Math.round(q * 100) / 100).replace('.', ',')} kg`);

// os artigos de um produto: um por variante (ou um só), com o preço, o peso e a disponibilidade
export function artigosDoProduto(p, h, nome, url) {
    // os pacotes de vários produtos (woosb) trazem as variantes dos outros: não se comparam
    if (/product-type-woosb|product-type-bundle|product-type-grouped/.test(h.slice(0, 200000).match(/<body[^>]*>/)?.[0] ?? '') || /\bpack\b/i.test(nome)) return [];
    const v = h.match(/data-product_variations="([^"]*)"/);
    const vars = v ? (() => { try { return JSON.parse(html(v[1])); } catch { return []; } })() : [];
    // o nome para as etiquetas: com a espécie da loja, se o nome não a diz
    const nomeE = p.especie && !etiquetas(nome)?.animal ? `${p.especie} ${nome}` : nome;
    const tipo = TIPO_ANIMAL[etiquetas(nomeE)?.animal];
    if (!tipo) return [];
    if (!vars.length) {
        const pr = h.match(/<p class="price">[\s\S]*?<bdi>([\d.,]+)/);
        if (!pr) return [];
        const q = pesoKg(h.replace(/<[^>]+>/g, ' ').match(/Caixa de [^.(]+|\d+(?:[.,]\d+)?\s?k?g\b/i)?.[0]);
        const cent = Math.round(n(pr[1].replace('.', '').replace(',', '.')) * 100);
        return [{ loja: p.loja, id: url.split('/produto/')[1].replace(/\/$/, ''), nome, url, variante: null, cent, q, tipo, disponivel: !/outofstock|Esgotado/.test(h.slice(0, 50000)) ? 1 : 0 }];
    }
    return vars.map((x) => {
        const at = x.attributes ?? {};
        const variante = Object.values(at).filter(Boolean).map((s) => String(s).replace(/-/g, ' ')).join(' · ');
        const q = pesoKg(at.attribute_calibre ?? at.attribute_pa_calibre ?? at.attribute_peso ?? at.attribute_pa_peso ?? variante);
        return { loja: p.loja, id: `${url.split('/produto/')[1].replace(/\/$/, '')}#${x.variation_id}`, nome, url, variante,
            cent: Math.round(Number(x.display_price) * 100), q, tipo, disponivel: x.is_in_stock === false ? 0 : 1 };
    }).filter((a) => a.cent > 0);
}

async function main() {
    const agora = new Date().toISOString();
    const so = process.argv.find((a) => a.startsWith('--loja='))?.slice(7);
    for (const p of PRODUTORES.filter((x) => !so || x.loja === so)) {
        const { estado, corpo } = await sonda(p.base + p.lista);
        if (estado !== 200) { console.log(p.nome, 'HTTP', estado); continue; }
        let h = corpo.toString('utf8');
        // as páginas seguintes da loja (/page/2/…), no máximo 5
        for (const u of [...new Set([...h.matchAll(/href="([^"]+\/page\/\d+\/)"/g)].map((m) => m[1]))].slice(0, 4)) {
            await espera(1500);
            const r = await sonda(u).catch(() => null);
            if (r?.estado === 200) h += r.corpo.toString('utf8');
        }
        const prods = [...new Map(produtosDaLista(h)).entries()].filter(([, nome]) => !p.fora || !p.fora.test(nome));
        console.log(p.nome, prods.length, 'produtos');
        const linhas = [];
        for (const [url, nome] of prods) {
            await espera(1500);
            const r = await sonda(url).catch(() => null);
            if (!r || r.estado !== 200) continue;
            for (const a of artigosDoProduto(p, r.corpo.toString('utf8'), nome, url)) {
                linhas.push([a.loja, a.id, a.nome, a.url, a.variante, a.cent, rotuloKg(a.q), a.q ? Math.round(a.cent / a.q) : null, a.q ? 'kg' : null, a.tipo, a.disponivel, agora]);
            }
        }
        for (const l of linhas.slice(0, 40)) console.log(' ', l[2], '|', l[4], '|', l[5] / 100, '€', l[6], l[7] ? (l[7] / 100) + ' €/kg' : '', l[10] ? '' : 'esgotado');
        if (process.argv.includes('--sem-gravar')) continue;
        await d1('DELETE FROM produtor_artigo WHERE loja = ?', [p.loja]);
        await d1Linhas('INSERT INTO produtor_artigo (loja, id, nome, url, variante, cent, emb, uc, ub, tipo, disponivel, visto)', linhas);
        console.log(p.nome, 'gravados:', linhas.length);
    }
}
if (process.argv[1]?.endsWith('produtores.mjs')) main().catch((e) => { console.error(e); process.exit(1); });
