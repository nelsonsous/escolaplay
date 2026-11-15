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
];
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
    for (const p of PRODUTORES) {
        const { estado, corpo } = await sonda(p.base + p.lista);
        if (estado !== 200) { console.log(p.nome, 'HTTP', estado); continue; }
        const h = corpo.toString('utf8');
        const prods = [...new Map([...h.matchAll(/href="(https?:\/\/[^"]+\/produto\/[^"]+)"[^>]*aria-label="([^"]+)"/g)].map((m) => [m[1], html(m[2])])).entries()];
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
        await d1('DELETE FROM produtor_artigo WHERE loja = ?', [p.loja]);
        await d1Linhas('INSERT INTO produtor_artigo (loja, id, nome, url, variante, cent, emb, uc, ub, tipo, disponivel, visto)', linhas);
        console.log(p.nome, 'gravados:', linhas.length);
    }
}
if (process.argv[1]?.endsWith('produtores.mjs')) main().catch((e) => { console.error(e); process.exit(1); });
