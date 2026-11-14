// Auchan — o JSON do produto (…/Product-Variation?pid=<id>&quantity=1; o robots.txt deixa, a pesquisa não). A página
// do produto não traz o preço sem uma loja escolhida; este JSON traz: nome, marca, código de barras, preço, preço
// riscado e validade de uma promoção, preço por unidade e disponibilidade (na loja que o Auchan escolhe por omissão).
import { ean, precoUnidade, produto } from './comum.js';

export const CADEIA = 'auchan';
export const urlProduto = (id) =>
    `https://www.auchan.pt/on/demandware.store/Sites-AuchanPT-Site/pt_PT/Product-Variation?pid=${encodeURIComponent(id)}&quantity=1`;

export function lerProduto(json) {
    let d = json;
    if (typeof json === 'string') {
        try { d = JSON.parse(json); } catch { return null; }
    }
    const p = d?.product;
    if (!p?.id) return null;
    const pr = p.price ?? {};
    const preco = pr.sales?.value ?? null;
    const lista = pr.list?.value ?? null;
    return produto({
        cadeia: CADEIA,
        id: String(p.id),
        url: p.selectedProductUrl ? 'https://www.auchan.pt' + p.selectedProductUrl.split('?')[0] : null,
        nome: p.productName ?? null,
        marca: p.brand ?? null,
        ean: ean(p.EAN),
        preco,
        antes: lista != null && preco != null && lista > preco ? lista : null,
        ate: pr.sales?.validUntil ?? null,
        precoUnidade: p.unitPerPrice?.available ? precoUnidade(p.unitPerPrice.value) : null,
        disponivel: typeof p.available === 'boolean' ? p.available : null,
    });
}
