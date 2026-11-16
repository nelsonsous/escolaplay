// As garrafeiras online no catálogo (voltas 13 e 14): o Vinha (vinha.pt, 4 mil vinhos) e a Garrafeira Soares
// (garrafeirasoares.pt, 3 mil). De cada uma lê, do mapa do site, os vinhos que também se vendem nos supermercados (o
// mesmo nome: proxy/src/vinha.js condiz), para saber onde a garrafa fica mais barata, e grava:
//   • o preço (e no Vinha a nota da Vivino e os votos) em produtor_artigo, com a chave do vinho dos supermercados;
//   • as notas dos críticos da página do Vinha («93/100 Wine Enthusiast (2019)») em vinho_nota, juntas às que lá estão.
// O robots.txt de ambas deixa ler os vinhos (não deixam o carrinho, o checkout, a conta e, na Soares, /api/).
// No Vinha lê também até --extra vinhos portugueses de 75 cl que não há nos supermercados, de gama alta primeiro
// (Grande Reserva, Garrafeira, Reserva, Vinhas Velhas), para a app ter o Douro Grande Reserva acima de 20 € que os
// supermercados não têm.
//   SONDA_TOKEN_FILE=… NODE_USE_ENV_PROXY=1 node economo/vinha.mjs [--loja=vinha|soares] [--max 300] [--extra 400] [--pausa 1500] [--sem-gravar]
import { sonda, d1, d1Linhas, espera } from './comum.mjs';
import { lerVinho, lerSoares, condiz, tipoDoSlug, slugDe, nucleo } from '../proxy/src/vinha.js';
import { notaDasFontes } from '../proxy/src/notas.js';

const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(n) ? Number(args[args.indexOf(n) + 1]) || d : d);
const max = opt('--max', 300), pausa = opt('--pausa', 1500), extra = opt('--extra', 400);
const TIPOS = ['vinho-tinto', 'vinho-branco', 'vinho-rose', 'espumante', 'vinho-do-porto'];

// as garrafeiras: o índice dos mapas do site, os mapas dos produtos, os endereços dos vinhos e o leitor da página
export const GARRAFEIRAS = [
    { loja: 'vinha', indice: 'https://www.vinha.pt/sitemap_index.xml', mapas: /<loc>(https:\/\/www\.vinha\.pt\/product-sitemap\d*\.xml)<\/loc>/g,
        vinhos: /<loc>(https:\/\/www\.vinha\.pt\/vinho\/[^<]+)<\/loc>/g, ler: lerVinho, texto: 'utf8', extras: true },
    // a Soares: as páginas vêm em windows-1252 (os dados da página são ASCII); crawl-delay 1 no robots.txt
    { loja: 'soares', indice: 'https://www.garrafeirasoares.pt/sitemap.xml', mapas: /<loc>(https:\/\/www\.garrafeirasoares\.pt\/sitemaps\/sitemap_products_pt_\d+\.xml)<\/loc>/g,
        vinhos: /<loc>(https:\/\/www\.garrafeirasoares\.pt\/pt\/portugal\/(?:vinhos|portos-e-fortificados)\/[^<]+\/item_\d+\.html)<\/loc>/g, ler: lerSoares, texto: 'latin1' },
];
// os endereços dos vinhos num mapa do site (sem repetidos)
export const vinhosDoMapa = (xml, re = GARRAFEIRAS[0].vinhos) => [...new Set([...String(xml).matchAll(re)].map((m) => m[1]))];

// os vinhos do Vinha a ler: para cada produto dos supermercados (garrafa de 75 cl), os do Vinha do mesmo tipo que
// condizem com menos palavras a mais (o «Quinta do Mouro» é o Quinta do Mouro, não o «Erro»). Map url → chave
export function escolher(urls, sup) {
    const porTipo = new Map();
    for (const u of urls) {
        const t = tipoDoSlug(u), slug = slugDe(u);
        if (!t || !/(^|-)75-?cl(-|$)/.test(slug)) continue;
        (porTipo.get(t) ?? porTipo.set(t, []).get(t)).push([u, slug]);
    }
    const r = new Map();
    for (const p of sup) {
        if (p.q != null && Math.abs(p.q - 0.75) > 0.01) continue;
        const cs = (porTipo.get(p.tipo) ?? []).map(([u, slug]) => [u, condiz(p.nome, slug)]).filter(([, c]) => c);
        if (!cs.length) continue;
        const min = Math.min(...cs.map(([, c]) => c.amais));
        for (const [u, c] of cs) {
            if (c.amais !== min) continue;
            const ant = r.get(u);
            if (!ant || c.chave.split(' ').length > ant.split(' ').length) r.set(u, c.chave);
        }
    }
    return r;
}

// os vinhos portugueses de 75 cl que não condizem com nenhum do supermercado, de gama alta primeiro: até n endereços
const GAMA_ALTA = [/grande-reserva|garrafeira/, /(^|-)reserva(-|$)|vinhas-velhas|vinha-velha/, /./];
const PORTUGAL = /-(douro|alentejo|dao|bairrada|lisboa|tejo|setubal|peninsula-de-setubal|vinhos-verdes|verde|tras-os-montes|beira-interior|tavora-varosa|algarve|madeira|acores|portugal)(-\d+)?$/;
export function extras(urls, ja, n) {
    const ps = urls.filter((u) => !ja.has(u) && tipoDoSlug(u) && tipoDoSlug(u) !== 'espumante' && /(^|-)75-?cl(-|$)/.test(slugDe(u)) && PORTUGAL.test(slugDe(u)));
    return GAMA_ALTA.flatMap((re, i) => ps.filter((u) => re.test(slugDe(u)) && !GAMA_ALTA.slice(0, i).some((r) => r.test(slugDe(u))))).slice(0, n);
}

// junta as notas novas às que a regra já tem (a mesma fonte, valor e colheita não se repetem)
export function juntarFontes(antes, novas) {
    const k = (f) => `${f.fonte}|${f.valor}|${f.colheita ?? ''}`.toLowerCase();
    const vistas = new Set(antes.map(k));
    return [...antes, ...novas.filter((f) => !vistas.has(k(f)) && vistas.add(k(f)))];
}

async function main() {
    const so = args.find((a) => a.startsWith('--loja='))?.slice(7);
    const sup = await d1(`SELECT nome, tipo, q FROM preco WHERE tipo IN (${TIPOS.map(() => '?').join(', ')}) AND suspeito IS NULL AND cent IS NOT NULL`, TIPOS);
    for (const g of GARRAFEIRAS.filter((x) => !so || x.loja === so)) {
        try { await garrafeira(g, sup); } catch (e) { console.log(`${g.loja}: falhou (${e.message}); segue para a próxima`); }
    }
}

async function garrafeira(g, sup) {
    const agora = new Date().toISOString();
    const idx = await sonda(g.indice);
    const mapas = [...idx.corpo.toString('utf8').matchAll(g.mapas)].map((m) => m[1]);
    const urls = [];
    // cada mapa até 3 vezes (o mapa do Vinha às vezes demora mais do que os 15 s da sonda)
    for (const m of mapas) {
        for (let t = 0; t < 3; t++) {
            const r = await sonda(m).catch(() => null);
            if (r?.estado === 200) { urls.push(...vinhosDoMapa(r.corpo.toString('utf8'), g.vinhos)); break; }
            await espera(5000);
        }
        await espera(pausa);
    }
    const esc = [...escolher([...new Set(urls)], sup)].slice(0, max);
    if (g.extras) esc.push(...extras([...new Set(urls)], new Set(esc.map(([u]) => u)), extra).map((u) => [u, null]));
    console.log(`${g.loja}: ${urls.length} vinhos no mapa; ${esc.length} também nos supermercados`);
    const linhas = [], notas = new Map();
    let falhas = 0;
    for (const [url, chave] of esc) {
        await espera(pausa);
        const r = await sonda(url).catch(() => null);
        const v = r?.estado === 200 ? g.ler(r.corpo.toString(g.texto), url) : null;
        if (!v || !v.tipo) { falhas++; continue; }
        const litros = v.cl ? v.cl / 100 : 0.75;
        linhas.push([g.loja, v.id, v.nome, url, null, v.cent, `${v.cl ?? 75} cl`, Math.round(v.cent / litros), 'l', v.tipo, v.disponivel, agora, v.vivino, v.votos, chave]);
        // as notas: pela chave do vinho do supermercado; nos extras, pelas palavras do nome (o produtor, a gama, a cor)
        const cn = chave ?? (nucleo(v.nome).size >= 3 ? [...nucleo(v.nome)].join(' ') : null);
        if (v.fontes.length && cn) {
            const n = notas.get(cn) ?? { nome: v.nome.replace(/^(Vinho (Tinto|Branco|Rosé|do Porto)|Espumante)\s+/i, '').replace(/\s+(19|20)\d{2}$/, ''), fontes: [] };
            n.fontes = juntarFontes(n.fontes, v.fontes.map((f) => ({ ...f, url })));
            notas.set(cn, n);
        }
        console.log(`  ${(v.cent / 100).toFixed(2).padStart(7)} €  ${v.vivino ? `Vivino ${v.vivino} (${v.votos})` : ''.padEnd(18)}  ${v.fontes.length} notas  ${v.nome}`);
    }
    console.log(JSON.stringify({ loja: g.loja, lidos: linhas.length, falhas, com_notas: notas.size }));
    if (args.includes('--sem-gravar') || !linhas.length) return;
    await d1('DELETE FROM produtor_artigo WHERE loja = ?', [g.loja]);
    await d1Linhas('INSERT OR REPLACE INTO produtor_artigo (loja, id, nome, url, variante, cent, emb, uc, ub, tipo, disponivel, visto, vivino, votos, chave)', linhas);
    // as notas: juntas à regra com as mesmas palavras (por qualquer ordem), se já há; senão uma regra nova
    const regras = await d1('SELECT palavras, fora, nome, fontes FROM vinho_nota');
    const porConjunto = new Map(regras.map((x) => [x.palavras.split(' ').sort().join(' '), x]));
    const novas = [];
    for (const [chave, n] of notas) {
        const ant = porConjunto.get(chave.split(' ').sort().join(' '));
        let fa = [];
        try { fa = ant ? JSON.parse(ant.fontes) : []; } catch { fa = []; }
        const fontes = juntarFontes(fa, n.fontes);
        const nt = notaDasFontes(fontes);
        if (!nt) continue;
        novas.push([ant?.palavras ?? chave, ant?.fora ?? '', (ant?.nome ?? n.nome).slice(0, 120), nt.nota, nt.n, nt.resumo.slice(0, 160),
            JSON.stringify(fontes.map(({ fonte, tipo, valor, colheita, url }) => ({ fonte, tipo, valor, colheita: colheita ?? null, url }))), agora]);
    }
    await d1Linhas('INSERT INTO vinho_nota (palavras, fora, nome, nota, n, resumo, fontes, visto)', novas,
        'ON CONFLICT (palavras) DO UPDATE SET nome = excluded.nome, nota = excluded.nota, n = excluded.n, resumo = excluded.resumo, fontes = excluded.fontes, visto = excluded.visto');
    console.log(`${g.loja}: gravados ${linhas.length} vinhos e ${novas.length} notas`);
}
if (import.meta.url === `file://${process.argv[1]}`) await main();
