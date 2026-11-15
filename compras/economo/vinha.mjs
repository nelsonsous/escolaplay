// O Vinha (vinha.pt) no catálogo (volta 13): dos 4 mil vinhos do mapa do site, lê os que também se vendem nos
// supermercados (o mesmo nome: proxy/src/vinha.js condiz), para saber onde a garrafa fica mais barata, e grava:
//   • o preço, a nota da Vivino e os votos em produtor_artigo (a loja «vinha»), com a chave do vinho dos supermercados;
//   • as notas dos críticos da página («93/100 Wine Enthusiast (2019)») em vinho_nota, juntas às que já lá estão.
// O robots.txt do Vinha deixa ler /vinho/ (só não deixa o carrinho, o checkout e a conta).
//   SONDA_TOKEN_FILE=… NODE_USE_ENV_PROXY=1 node economo/vinha.mjs [--max 300] [--pausa 1500] [--sem-gravar]
import { sonda, d1, d1Linhas, espera } from './comum.mjs';
import { lerVinho, condiz, tipoDoSlug } from '../proxy/src/vinha.js';
import { notaDasFontes } from '../proxy/src/notas.js';

const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(n) ? Number(args[args.indexOf(n) + 1]) || d : d);
const max = opt('--max', 300), pausa = opt('--pausa', 1500);
const TIPOS = ['vinho-tinto', 'vinho-branco', 'vinho-rose', 'espumante', 'vinho-do-porto'];

// os endereços dos vinhos no mapa do site (product-sitemap*.xml)
export const vinhosDoMapa = (xml) => [...String(xml).matchAll(/<loc>(https:\/\/www\.vinha\.pt\/vinho\/[^<]+)<\/loc>/g)].map((m) => m[1]);

// os vinhos do Vinha a ler: para cada produto dos supermercados (garrafa de 75 cl), os do Vinha do mesmo tipo que
// condizem com menos palavras a mais (o «Quinta do Mouro» é o Quinta do Mouro, não o «Erro»). Map url → chave
export function escolher(urls, sup) {
    const porTipo = new Map();
    for (const u of urls) {
        const t = tipoDoSlug(u), slug = u.split('/vinho/')[1] ?? '';
        if (!t || !/-75cl-/.test(slug)) continue;
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

// junta as notas novas às que a regra já tem (a mesma fonte, valor e colheita não se repetem)
export function juntarFontes(antes, novas) {
    const k = (f) => `${f.fonte}|${f.valor}|${f.colheita ?? ''}`.toLowerCase();
    const vistas = new Set(antes.map(k));
    return [...antes, ...novas.filter((f) => !vistas.has(k(f)) && vistas.add(k(f)))];
}

async function main() {
    const agora = new Date().toISOString();
    const sup = await d1(`SELECT nome, tipo, q FROM preco WHERE tipo IN (${TIPOS.map(() => '?').join(', ')}) AND suspeito IS NULL AND cent IS NOT NULL`, TIPOS);
    const idx = await sonda('https://www.vinha.pt/sitemap_index.xml');
    const mapas = [...idx.corpo.toString('utf8').matchAll(/<loc>(https:\/\/www\.vinha\.pt\/product-sitemap\d*\.xml)<\/loc>/g)].map((m) => m[1]);
    const urls = [];
    for (const m of mapas) { const r = await sonda(m); if (r.estado === 200) urls.push(...vinhosDoMapa(r.corpo.toString('utf8'))); await espera(pausa); }
    const esc = [...escolher(urls, sup)].slice(0, max);
    console.log(`${urls.length} vinhos no mapa do Vinha; ${esc.length} também nos supermercados`);
    const linhas = [], notas = new Map();
    let falhas = 0;
    for (const [url, chave] of esc) {
        await espera(pausa);
        const r = await sonda(url).catch(() => null);
        const v = r?.estado === 200 ? lerVinho(r.corpo.toString('utf8'), url) : null;
        if (!v || !v.tipo) { falhas++; continue; }
        const litros = v.cl ? v.cl / 100 : 0.75;
        linhas.push(['vinha', v.id, v.nome, url, null, v.cent, `${v.cl ?? 75} cl`, Math.round(v.cent / litros), 'l', v.tipo, v.disponivel, agora, v.vivino, v.votos, chave]);
        if (v.fontes.length) {
            const n = notas.get(chave) ?? { nome: v.nome.replace(/^(Vinho (Tinto|Branco|Rosé|do Porto)|Espumante)\s+/i, '').replace(/\s+(19|20)\d{2}$/, ''), fontes: [] };
            n.fontes = juntarFontes(n.fontes, v.fontes.map((f) => ({ ...f, url })));
            notas.set(chave, n);
        }
        console.log(`  ${(v.cent / 100).toFixed(2).padStart(7)} €  ${v.vivino ? `Vivino ${v.vivino} (${v.votos})` : 'sem Vivino'.padEnd(18)}  ${v.fontes.length} notas  ${v.nome}`);
    }
    console.log(JSON.stringify({ lidos: linhas.length, falhas, com_notas: notas.size }));
    if (args.includes('--sem-gravar')) return;
    await d1("DELETE FROM produtor_artigo WHERE loja = 'vinha'");
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
    console.log(`gravados ${linhas.length} vinhos do Vinha e ${novas.length} notas`);
}
if (import.meta.url === `file://${process.argv[1]}`) await main();
