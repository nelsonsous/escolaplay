// O que as fontes das cadeias partilham: números à portuguesa, unidades, o JSON-LD do produto, as entidades de HTML
// e a forma comum de um produto lido. Sem DOM (o Worker não tem): procura-se por marcadores e lê-se só o pedaço.

const ENT = {
    euro: '€', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ordm: 'º', ordf: 'ª',
    aacute: 'á', agrave: 'à', acirc: 'â', atilde: 'ã', eacute: 'é', ecirc: 'ê', iacute: 'í', oacute: 'ó', ocirc: 'ô',
    otilde: 'õ', uacute: 'ú', ccedil: 'ç', Aacute: 'Á', Agrave: 'À', Acirc: 'Â', Atilde: 'Ã', Eacute: 'É', Ecirc: 'Ê',
    Iacute: 'Í', Oacute: 'Ó', Ocirc: 'Ô', Otilde: 'Õ', Uacute: 'Ú', Ccedil: 'Ç',
};
export const entidades = (s) => String(s ?? '').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] !== '#') return ENT[e] ?? m;
    return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1)));
});
// o texto à vista: sem etiquetas, com as entidades trocadas e os espaços juntos
export const texto = (s) => entidades(String(s ?? '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();

// «1,26», «5.40», «6,00 €» → número (null se não houver)
export function numero(s) {
    const m = String(s ?? '').replace(/\s/g, '').match(/-?\d+(?:[.,]\d+)?/);
    return m ? Number(m[0].replace(',', '.')) : null;
}

const UNIDADES = { kg: 'kg', g: 'g', gr: 'g', l: 'l', lt: 'l', ml: 'ml', cl: 'cl', un: 'un', uni: 'un', unid: 'un' };
export const unidade = (u) => UNIDADES[String(u ?? '').toLowerCase().replace(/\./g, '')] ?? null;

// «0,90€/lt», «2,52 €/Kg», «1.55 €/Kg» → { valor: 0.9, unidade: 'l' }
export function precoUnidade(s) {
    const m = texto(s).match(/(\d+(?:[.,]\d+)?)\s*€\s*\/\s*([a-z.]+)/i);
    return m && unidade(m[2]) ? { valor: numero(m[1]), unidade: unidade(m[2]) } : null;
}

// código de barras (EAN-8 ou EAN-13) só se o dígito de controlo bater; o resto (números internos) fica de fora
export function ean(s) {
    const d = String(s ?? '').trim();
    if (!/^(\d{8}|\d{13})$/.test(d)) return null;
    const n = [...d].map(Number), ctl = n.pop();
    const soma = n.reverse().reduce((t, x, i) => t + x * (i % 2 === 0 ? 3 : 1), 0);
    return (10 - (soma % 10)) % 10 === ctl ? d : null;
}

// o primeiro JSON-LD com @type Product (também dentro de listas e de @graph)
export function ldProduto(html) {
    const abre = '<script type="application/ld+json">';
    for (let i = html.indexOf(abre); i >= 0; i = html.indexOf(abre, i + abre.length)) {
        const fim = html.indexOf('</script>', i);
        let d;
        try { d = JSON.parse(html.slice(i + abre.length, fim)); } catch { continue; }
        const lista = Array.isArray(d) ? d : Array.isArray(d?.['@graph']) ? d['@graph'] : [d];
        const p = lista.find((x) => x && (x['@type'] === 'Product' || (Array.isArray(x['@type']) && x['@type'].includes('Product'))));
        if (p) return p;
    }
    return null;
}
export const oferta = (p) => (Array.isArray(p?.offers) ? p.offers[0] : p?.offers) ?? {};
export const marca = (p) => (typeof p?.brand === 'string' ? p.brand : p?.brand?.name) ?? null;
export const disponivel = (a) => (a == null ? null : /InStock/i.test(String(a)));

// o pedaço do HTML a seguir a um marcador (vazio se não houver)
export function depois(html, marcador, tamanho = 600) {
    const i = html.indexOf(marcador);
    return i < 0 ? '' : html.slice(i, i + tamanho);
}

// o primeiro grupo de `re` (ancorada em ^) no pedaço a seguir a cada ocorrência do marcador, pela ordem da página.
// Procurar o marcador com indexOf e só depois a expressão num pedaço curto poupa CPU nas páginas grandes (1,7 MB no
// Continente): o Worker grátis só tem 10 ms por pedido.
export function pedaco(html, marcador, re, tamanho = 400) {
    for (let i = html.indexOf(marcador); i >= 0; i = html.indexOf(marcador, i + marcador.length)) {
        const m = html.slice(i, i + tamanho).match(re);
        if (m) return m[1];
    }
    return null;
}

// «Promoção até 16/11» → '2026-11-16' (o ano é o de hoje; uma data muito para trás é do ano seguinte)
export function dataCurta(s, hoje = new Date()) {
    const m = String(s ?? '').match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/);
    if (!m) return null;
    let ano = m[3] ? Number(m[3]) : hoje.getUTCFullYear();
    const dia = (a) => Date.UTC(a, Number(m[2]) - 1, Number(m[1]));
    if (!m[3] && dia(ano) < hoje.getTime() - 60 * 86400e3) ano++;
    return new Date(dia(ano)).toISOString().slice(0, 10);
}

// a forma comum de um produto lido numa cadeia (preços em euros; null quando a cadeia não diz)
//   antes: o preço riscado de uma promoção · pvpr: o preço recomendado que a cadeia mostra ao lado
//   ate: até quando vale o preço ou a promoção · data: o dia do preço, quando a cadeia o diz
export function produto(campos) {
    return {
        cadeia: null, id: null, url: null, nome: null, marca: null, ean: null, preco: null, antes: null, pvpr: null,
        ate: null, precoUnidade: null, embalagem: null, disponivel: null, data: null, ...campos,
    };
}
