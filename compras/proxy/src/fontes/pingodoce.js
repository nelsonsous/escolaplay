// Pingo Doce — página de produto (https://www.pingodoce.pt/home/produtos/…-<id>.html) e cartões de produto (listas,
// página inicial). O robots.txt deixa as páginas de produto e fecha os controladores (/on/demandware.store/).
// O preço está em <span class="sales"> (o valor no atributo content), o preço riscado de uma promoção em
// <span class="strike-through list">, a validade em <span class="promo-message"> («Promoção até 16/11») e a embalagem
// com o preço por unidade em «0.5 Kg | 2,52 €/Kg». Sem código de barras: o sku é o número do Pingo Doce.
import { ldProduto, marca, precoUnidade, texto, dataCurta, pedaco, produto } from './comum.js';

export const CADEIA = 'pingodoce';
const BASE = 'https://www.pingodoce.pt';

const valor = (html, classe) => {
    const v = pedaco(html, `class="${classe}`, new RegExp(`^class="${classe}[^"]*"[^>]*>\\s*<span class="value" content="([\\d.]+)"`));
    return v == null ? null : Number(v);
};

export function lerProduto(html, url = null, { hoje = new Date() } = {}) {
    const p = ldProduto(html);
    const preco = valor(html, 'sales');
    if (preco == null && !p) return null;
    const unidadeTxt = pedaco(html, 'class="product-unit', /^class="product-unit(?:-measure)?"[^>]*>\s*([^<]+?)\s*</); // «0.5 Kg | 2,52 €/Kg»
    const [emb, pu] = unidadeTxt ? unidadeTxt.split('|').map((s) => s.trim()) : [null, null];
    const promo = pedaco(html, 'class="promo-message"', /^class="promo-message"[^>]*>([^<]+)</);
    let id = p?.sku ?? null, nome = p?.name ?? null, marcaP = marca(p), link = null;
    if (!p) { // um cartão: o nome e a ligação estão no <a>, a marca à parte, o número em data-pid
        const a = html.match(/<a href="([^"]+\.html)"[^>]*>([^<]+)<\/a>/);
        link = a?.[1] ?? null;
        nome = a ? texto(a[2]) : null;
        const mc = pedaco(html, 'class="product-brand-name"', /^class="product-brand-name"[^>]*>\s*([^<]+?)\s*</);
        marcaP = mc ? texto(mc) : null;
        id = pedaco(html, 'data-pid="', /^data-pid="(\d+)"/) ?? (link ? (link.match(/-(\d+)\.html/) || [])[1] ?? null : null);
    }
    return produto({
        cadeia: CADEIA,
        id: id != null ? String(id) : null,
        url: url ?? (link ? new URL(link, BASE).toString() : null),
        nome,
        marca: marcaP,
        preco,
        antes: valor(html, 'strike-through list'),
        ate: promo ? dataCurta(texto(promo), hoje) : null,
        precoUnidade: pu ? precoUnidade(pu) : null,
        embalagem: emb ? texto(emb) : null,
    });
}
