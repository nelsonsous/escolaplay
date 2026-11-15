// Lidl — página de produto (https://www.lidl.pt/p/…/p<id>; o robots.txt deixa). Só uns centos de produtos estão no
// site (532 no mapa do site a 14/11/2026): o resto vem dos folhetos e dos talões. O JSON-LD traz o nome, a marca e o
// sku (sem preço nem código de barras); o preço e o dia vêm na descrição da página («Iogurte Grego - 1.29 € (14.11.2026)»).
import { ldProduto, oferta, marca, disponivel, numero, entidades, pedaco, produto } from './comum.js';

export const CADEIA = 'lidl';

export function lerProduto(html, url = null) {
    const p = ldProduto(html);
    if (!p) return null;
    const desc = entidades(pedaco(html, '<meta name="description"', /^<meta name="description" content="([^"]*)"/, 600) ?? '');
    const m = desc.match(/(\d+(?:[.,]\d+)?)\s*€\s*\((\d{2})\.(\d{2})\.(\d{4})\)/);
    const link = p.url ?? url;
    return produto({
        cadeia: CADEIA,
        id: (link?.match(/\/p(\d+)(?:$|[/?#])/) || [])[1] ?? (p.sku != null ? String(p.sku) : null),
        url: link,
        nome: p.name ?? null,
        marca: marca(p),
        preco: m ? numero(m[1]) : null,
        data: m ? `${m[4]}-${m[3]}-${m[2]}` : null,
        disponivel: disponivel(oferta(p).availability), // a venda online; nas lojas pode haver
    });
}
