// Os sites das cadeias, a fingir (para os testes do preço): respondem a um pedido de produto com uma página (ou o JSON
// do Auchan) que a fonte da cadeia sabe ler, com o preço da tabela PRECOS; um produto que lá não está dá 404.
// instalar() troca o fetch global e devolve os pedidos que se fizeram; desinstalar() repõe-no.
export const PRECOS = new Map(); // «cadeia id» → { preco, antes, nome }

const ld = (o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`;
function pagina(cadeia, id, x) {
    const nome = x.nome ?? `Produto ${id}`;
    if (cadeia === 'auchan') {
        return JSON.stringify({ product: { id, productName: nome, available: true, price: { sales: { value: x.preco }, ...(x.antes ? { list: { value: x.antes } } : {}) } } });
    }
    if (cadeia === 'continente') return `<html>${ld({ '@type': 'Product', name: nome, sku: id, offers: { price: x.preco, availability: 'https://schema.org/InStock' } })}</html>`;
    if (cadeia === 'pingodoce') {
        return `<html>${ld({ '@type': 'Product', name: nome, sku: id })}<span class="sales"><span class="value" content="${x.preco}">${x.preco}</span></span>`
            + (x.antes ? `<span class="strike-through list"><span class="value" content="${x.antes}">${x.antes}</span></span>` : '') + '</html>';
    }
    return `<html><meta name="description" content="${nome} - ${x.preco} € (14.11.2026)">${ld({ '@type': 'Product', name: nome, sku: id })}</html>`;
}
function idDe(cadeia, u) {
    if (cadeia === 'auchan') return u.searchParams.get('pid');
    if (cadeia === 'lidl') return (u.pathname.match(/\/p(\d+)$/) || [])[1];
    return (u.pathname.match(/-(\d+)\.html$/) || [])[1];
}
const CADEIA = { 'www.continente.pt': 'continente', 'www.pingodoce.pt': 'pingodoce', 'www.auchan.pt': 'auchan', 'www.lidl.pt': 'lidl' };

let antigo = null;
export function instalar() {
    const pedidos = [];
    antigo = antigo ?? globalThis.fetch;
    globalThis.fetch = async (url, init) => {
        const u = new URL(String(url));
        const cadeia = CADEIA[u.hostname];
        pedidos.push({ url: String(url), init });
        const x = cadeia && PRECOS.get(cadeia + ' ' + idDe(cadeia, u));
        if (!x) return new Response('não há', { status: 404 });
        return new Response(pagina(cadeia, idDe(cadeia, u), x), { status: 200 });
    };
    return pedidos;
}
export function desinstalar() { if (antigo) globalThis.fetch = antigo; antigo = null; }
