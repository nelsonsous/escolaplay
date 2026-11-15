// Continente — página de produto (https://www.continente.pt/produto/…-<id>.html; o robots.txt deixa, a pesquisa não).
// O JSON-LD traz o nome, a marca, o código de barras, o preço, até quando vale e a disponibilidade; o bloco do preço
// traz o PVPR (o preço recomendado, quando o mostram) e o preço por unidade; a embalagem vem em «emb. 6 x 1 lt».
// Promoções: a marcação de um preço riscado está por ver (volta 3, com um produto em promoção).
import { ldProduto, oferta, marca, disponivel, numero, precoUnidade, texto, depois, pedaco, ean, produto } from './comum.js';

export const CADEIA = 'continente';

export function lerProduto(html, url = null) {
    const p = ldProduto(html);
    if (!p) return null;
    const o = oferta(p);
    const bloco = depois(html, '<div class="prices-wrapper">', 2000);
    const pvpr = bloco.match(/class="pvpr-info">\s*PVPR\s*<\/span>\s*([\d.,]+)/);
    const secundario = depois(html, 'pwc-tile--price-secondary', 500).split('</div>')[0];
    const emb = pedaco(html, 'class="ct-pdp--unit', /^class="ct-pdp--unit[^"]*">\s*([^<]+?)\s*<\/span>/);
    return produto({
        cadeia: CADEIA,
        id: String(p.sku ?? p.mpn ?? '') || null,
        url: o.url ?? p.url ?? url,
        nome: p.name ?? null,
        marca: marca(p),
        ean: ean(p.gtin13 ?? p.gtin),
        preco: numero(o.price),
        pvpr: pvpr ? numero(pvpr[1]) : null,
        ate: o.priceValidUntil ?? null,
        precoUnidade: precoUnidade(secundario),
        embalagem: emb ? texto(emb).replace(/^emb\.\s*/i, '') : null,
        disponivel: disponivel(o.availability),
    });
}
