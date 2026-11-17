// A escolha que se mantém (volta 6). Uma coisa juntada pela escolha (volta 5) guarda o que é (item.e: o tipo, o
// tamanho e a marca, ou 'branca'), e o conector mantém, em cada cadeia, o produto mais barato que lhe corresponde: uma
// vez por hora revê as listas e troca o produto quando outro passou a ser mais barato (por unidade de medida). Se o
// produto foi escolhido à mão (e.mao), fica como está.
// A Mercadona não deixa ler preços (a API está fechada no robots.txt): para ela, a estimativa é a mediana do preço da
// marca branca do mesmo tipo e tamanho nas outras cadeias, marcada «≈» na app (est, em cêntimos por unidade da coisa).
import { etiquetas, palavrasEtiquetas, TALHO } from './etiquetas.js';
import { palavras } from './sugerir.js';
import { emFalta } from './casa.js';
import { familiaDe, atributos, palavrasAtributos } from './atributos.js';
import { seccaoDoTipo } from './seccoes.js';
import { limiteGramas, cabe } from './porcoes.js';
import { tamanho } from './precos.js';

const DIA = 24 * 3600e3;
// o Lidl só com os produtos do site que o Ecónomo lê (economo/lidl.mjs)
export const CADEIAS_ESCOLHA = ['continente', 'pingodoce', 'auchan', 'lidl'];
const recente = (agora) => new Date(agora.getTime() - 10 * DIA).toISOString();

// o produto tem todas as palavras escolhidas (no nome ou, no talho e na peixaria, nas etiquetas do Ecónomo)?
export const temPalavras = (w, nome, k, cent = null) => {
    const fam = familiaDe(k, seccaoDoTipo({ k, nome: '' }));
    const n = ` ${palavras(`${nome} ${TALHO.has(k) ? palavrasEtiquetas(etiquetas(nome, k)).join(' ') : ''} ${fam ? palavrasAtributos(atributos(fam, nome, cent)).join(' ') : ''}`).join(' ')} `;
    return w.every((x) => n.includes(x));
};
// o mais barato de cada cadeia para o que a coisa é: { cadeia: { id, nome, url } }. Com as pessoas da casa, no talho e
// na peixaria, primeiro entre as embalagens do tamanho certo (porcoes.js); se nenhuma couber, o mais barato de todas
export async function melhores(db, e, agora = new Date(), excluir = new Set(), pessoas = null) {
    const lim = e.emb ? null : limiteGramas(e.k, pessoas);
    const { results } = await db.prepare(`SELECT cadeia, id, nome, url, cent, q, ub, emb FROM preco
        WHERE tipo = ?1 AND cent IS NOT NULL AND suspeito IS NULL AND visto > ?2
          AND NOT (cadeia = 'lidl' AND id LIKE 'f%' AND ate < ?5)
          AND (?4 IS NULL OR (?4 = 'branca' AND propria = 1) OR (?4 <> 'branca' AND lower(marca) = lower(?4)))
        ORDER BY uc IS NULL, uc, cent, id`).bind(e.k, recente(agora), null, e.m ?? null, agora.toISOString().slice(0, 10)).all();
    // o tamanho compara-se na forma canónica («75 cl» é «750 ml»: precos.js)
    const te = e.emb ? tamanho(e.emb) : null;
    const r = {};
    const w = e.w ? String(e.w).split(' ').filter(Boolean).map((x) => ` ${x} `) : null; // a espécie e o corte: todas
    for (const so of lim ? [true, false] : [false]) {
        for (const p of results) {
            if (!CADEIAS_ESCOLHA.includes(p.cadeia) || r[p.cadeia] || excluir.has(p.cadeia + ' ' + p.id)) continue;
            if (te && tamanho(p.emb) !== te) continue;
            if (so && !cabe(p, lim)) continue;
            // a palavra escolhida (o corte, a variante; no talho e na peixaria também as etiquetas do Ecónomo: «grelhar»)
            // (antes estava ao contrário: saltava os que tinham a palavra, e a «picanha» trocava-se por «para estufar»)
            if (w && !temPalavras(w, p.nome, e.k, p.cent)) continue;
            r[p.cadeia] = { id: p.id, nome: p.nome, url: p.url };
        }
    }
    return r;
}

// revê as escolhas de todas as listas; diz quantas coisas mudaram
export async function atualizarEscolhas(db, agora = new Date()) {
    const { results } = await db.prepare("SELECT id, versao, itens, pessoas FROM casa WHERE itens LIKE '%\"e\":{%'").all();
    let mudaram = 0;
    for (const c of results) {
        const itens = JSON.parse(c.itens);
        let mudou = false;
        for (const i of itens) {
            if (!i.e || i.e.mao || i.f) continue;
            // o que «não havia na loja» (casa.js) fica de fora enquanto conta
            const fora = new Set(CADEIAS_ESCOLHA.map((c) => emFalta(i, c, agora) && c + ' ' + emFalta(i, c, agora)).filter(Boolean));
            const m = await melhores(db, i.e, agora, fora, c.pessoas);
            for (const [cadeia, p] of Object.entries(m)) {
                if (i.p[cadeia]?.id !== p.id) { i.p[cadeia] = p; mudou = true; mudaram++; }
            }
        }
        if (mudou) {
            await db.prepare('UPDATE casa SET itens = ?, versao = versao + 1 WHERE id = ? AND versao = ?')
                .bind(JSON.stringify(itens), c.id, c.versao).run();
        }
    }
    return { listas: results.length, mudaram };
}

const mediana = (v) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor((s.length - 1) / 2)] : null; };

// as estimativas de cada coisa com tipo e tamanho: Map «tipo|tamanho» → { merc, spar } em cêntimos. A Mercadona: a
// mediana da marca branca nas outras cadeias (a dela é quase toda marca própria); o SPAR: a mediana das marcas de
// fabricante (é o que mais vende), que os talões da loja vão corrigir
export async function estimativas(db, itens, agora = new Date()) {
    const pares = [...new Set(itens.filter((i) => i.e?.emb).map((i) => i.e.k))];
    if (!pares.length) return new Map();
    const { results } = await db.prepare(`SELECT tipo, emb, cent, propria FROM preco JOIN json_each(?1) j ON preco.tipo = j.value
        WHERE cent IS NOT NULL AND suspeito IS NULL AND visto > ?2`).bind(JSON.stringify(pares), recente(agora)).all();
    const g = new Map();
    for (const r of results) {
        const k = r.tipo + '|' + tamanho(r.emb);
        if (!g.has(k)) g.set(k, { b: [], f: [] });
        g.get(k)[r.propria ? 'b' : 'f'].push(Number(r.cent));
    }
    return new Map([...g].map(([k, v]) => [k, { merc: mediana(v.b), spar: mediana(v.f) }]));
}
