// Os artigos do SPAR (volta 7). O SPAR não tem loja online, mas a página «lista de compras» do site traz a lista dos
// artigos que vende (5 490, dos quais uns 930 da marca SPAR), sem preços. O Ecónomo liga cada artigo:
//   - ao mesmo produto nas outras cadeias (a mesma marca e o mesmo tamanho, e as palavras do nome): o tipo e o preço
//     mais baixo desse produto (a estimativa do SPAR, que é franquiado: cada loja tem os seus preços);
//   - nos da marca SPAR, ao tipo dos produtos mais parecidos e à marca branca do mesmo tipo e tamanho (a mediana);
// e grava-os na tabela spar_artigo (migrations/0007). Uso: node economo/spar.mjs [--sem-gravar]
import { sonda, d1, d1Linhas } from './comum.mjs';
import { rotulo } from '../proxy/src/precos.js';
import { palavras } from '../proxy/src/sugerir.js';

const UNIDADES = new Set(['KG', 'GR', 'G', 'LT', 'L', 'ML', 'CL', 'UN', 'UNID', 'X', 'C', 'S', 'P', 'BIB', 'DOP', 'IGP', 'MSC', 'ASC', 'UHT', 'XL', 'XXL', 'II', 'III']);
// a marca: as palavras em maiúsculas seguidas («BOM SUCESSO»), tirando as medidas
export function marcaSpar(nome) {
    const ws = String(nome).split(/\s+/);
    let melhor = [], atual = [];
    for (const w of ws) {
        const l = w.replace(/[^A-ZÁÉÍÓÚÂÊÔÃÕÇÀ&'.-]/g, '');
        if (l.length >= 2 && l === w.replace(/[,;:()]/g, '') && l === l.toUpperCase() && !UNIDADES.has(l) && !/\d/.test(w)) atual.push(l);
        else { if (atual.length > melhor.length) melhor = atual; atual = []; }
    }
    if (atual.length > melhor.length) melhor = atual;
    return melhor.length ? melhor.join(' ') : null;
}
const ENFEITE = new Set(['extra', 'longo', 'emb', 'pack', 'cong', 'gr', 'kg', 'lt', 'un', 'unid', 'com', 'sem', 'tipo', 'novo', 'nova', 'pet']);
const mediana = (v) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor((s.length - 1) / 2)] : null; };
const sem = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

async function main() {
    const gravar = !process.argv.includes('--sem-gravar');
    const { estado, corpo } = await sonda('https://www.spar.pt/lista-de-compras');
    if (estado !== 200) throw new Error(`SPAR: HTTP ${estado}`);
    const h = corpo.toString('utf8');
    const i = h.indexOf('<script id="listaArtigos" type="application/json">');
    const artigos = JSON.parse(h.slice(h.indexOf('[', i), h.indexOf('</script>', i)));
    console.log('artigos do SPAR:', artigos.length);
    // o catálogo das outras cadeias (sem os suspeitos), por tamanho
    const produtos = [];
    for (let depois = 0; ;) {
        const r = await d1(`SELECT rowid AS r, tipo, cadeia, nome, marca, cent, emb, propria FROM preco WHERE rowid > ? AND tipo IS NOT NULL AND cent IS NOT NULL AND suspeito IS NULL ORDER BY rowid LIMIT 3000`, [depois]);
        if (!r.length) break;
        produtos.push(...r); depois = r.at(-1).r;
    }
    const porEmb = new Map();
    for (const p of produtos) { p.ws = new Set(palavras(p.nome)); p.mk = sem(p.marca); if (p.emb) { if (!porEmb.has(p.emb)) porEmb.set(p.emb, []); porEmb.get(p.emb).push(p); } }
    console.log('produtos das cadeias:', produtos.length);
    const linhas = [], agora = new Date().toISOString();
    const conta = { mesmo: 0, branca: 0, tipo: 0, nada: 0 };
    for (const a of artigos) {
        const marca = marcaSpar(a.n);
        const propria = marca === 'SPAR' ? 1 : 0;
        const emb = rotulo(a.n);
        // as palavras que distinguem (sem medidas nem as de enfeite): «risotto» não é «agulha»
        const ws = palavras(a.n.replace(marca ?? '\u0000', ' ')).filter((w) => w.length > 2 && !/\d/.test(w) && !ENFEITE.has(w));
        const cands = (emb && porEmb.get(emb)) || [];
        const pontos = (p) => ws.filter((w) => p.ws.has(w)).length;
        let tipo = null, eq = null, como = null;
        // o mesmo produto: a mesma marca, o mesmo tamanho e pelo menos metade das palavras
        if (!propria && marca) {
            const m = sem(marca);
            const iguais = cands.filter((p) => p.mk && (p.mk.includes(m) || m.includes(p.mk)) && ws.length && pontos(p) === ws.length);
            if (iguais.length) {
                const b = iguais.sort((x, y) => x.cent - y.cent)[0];
                tipo = b.tipo; eq = b.cent; como = `o mesmo no ${b.cadeia === 'pingodoce' ? 'Pingo Doce' : b.cadeia[0].toUpperCase() + b.cadeia.slice(1)}`; conta.mesmo++;
            }
        }
        // senão: o tipo dos mais parecidos do mesmo tamanho (e, na marca SPAR, a marca branca desse tipo e tamanho)
        if (!tipo && cands.length && ws.length) {
            const melhores = cands.map((p) => [p, pontos(p)]).filter(([, n]) => n >= Math.max(1, Math.ceil(ws.length * 0.6))).sort((x, y) => y[1] - x[1]).slice(0, 12);
            if (melhores.length) {
                const votos = new Map();
                for (const [p, n] of melhores) votos.set(p.tipo, (votos.get(p.tipo) ?? 0) + n);
                tipo = [...votos].sort((x, y) => y[1] - x[1])[0][0];
                if (propria) {
                    // a marca branca com as mesmas palavras (basmati com basmati); senão, com todas menos uma
                    const doTipo = cands.filter((p) => p.tipo === tipo && p.propria);
                    let brancas = doTipo.filter((p) => pontos(p) === ws.length).map((p) => p.cent);
                    if (!brancas.length && ws.length >= 2) brancas = doTipo.filter((p) => pontos(p) >= ws.length - 1).map((p) => p.cent);
                    if (brancas.length) { eq = mediana(brancas); como = 'a marca branca equivalente'; conta.branca++; }
                }
                if (!eq) conta.tipo++;
            }
        }
        if (!tipo) conta.nada++;
        linhas.push([String(a.c), a.n.slice(0, 160), marca, emb, propria, tipo, eq, como, agora]);
    }
    console.log(JSON.stringify(conta));
    for (const l of linhas.filter((l) => /^Arroz/.test(l[1])).slice(0, 12)) console.log(l[1], '→', l[5], l[6], l[7]);
    if (!gravar) return;
    await d1Linhas('INSERT INTO spar_artigo (c, nome, marca, emb, propria, tipo, eq_cent, eq_como, visto)', linhas.filter((l) => l[5]),
        'ON CONFLICT (c) DO UPDATE SET nome = excluded.nome, marca = excluded.marca, emb = excluded.emb, propria = excluded.propria, tipo = excluded.tipo, eq_cent = excluded.eq_cent, eq_como = excluded.eq_como, visto = excluded.visto');
    console.log('gravados:', linhas.filter((l) => l[5]).length);
}
if (process.argv[1]?.endsWith('spar.mjs')) main().catch((e) => { console.error(e); process.exit(1); });
