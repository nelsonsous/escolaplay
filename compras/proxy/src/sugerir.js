// Escrever e encontrar (volta 5). Enquanto se escreve, a app pergunta /api/sugerir?q=… e recebe os tipos que
// começam pelo que se escreveu («ág» → Água sem gás, Água com gás…). Tocar num tipo pede /api/tipo?k=… e recebe os
// produtos desse tipo nas cadeias (os do catálogo, lidos há menos de 10 dias), com os tamanhos e as marcas que há,
// para a app afinar (botões) e escolher o mais barato de cada cadeia.
import { porExtenso, palavras as palavrasTalao } from './talao.js';

const HORA = 3600e3;
const TIPOS = { lista: null, quando: 0 };
export const esquecerTipos = () => { TIPOS.lista = null; };

const PARAR = new Set(['e', 'de', 'do', 'da', 'dos', 'das', 'em', 'para', 'a', 'o', 'os', 'as', 'no', 'na', 'ou']);
function singular(w) {
    if (w.length <= 3) return w;
    if (w.endsWith('oes') || w.endsWith('aes')) return w.slice(0, -3) + 'ao';
    if (w.endsWith('ais')) return w.slice(0, -3) + 'al';
    if (/[rzl]es$/.test(w)) return w.slice(0, -2);
    return w.endsWith('s') ? w.slice(0, -1) : w;
}
export const palavras = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .split(/[^a-z0-9]+/).filter((w) => w && !PARAR.has(w)).map(singular);

async function tipos(db) {
    if (TIPOS.lista && Date.now() - TIPOS.quando < HORA) return TIPOS.lista;
    const { results } = await db.prepare('SELECT k, nome, n, casa FROM tipo WHERE n > 0').all();
    TIPOS.lista = results.map((t) => ({ ...t, w: palavras(t.nome + ' ' + t.k.replace(/-/g, ' ')) }));
    TIPOS.quando = Date.now();
    return TIPOS.lista;
}

// os tipos que correspondem ao que se escreveu: cada palavra escrita é o início de uma palavra do tipo
export async function sugerir(db, q, max = 8) {
    const ws = palavras(q).slice(0, 4);
    if (!ws.length) return [];
    const bons = [];
    for (const t of await tipos(db)) {
        if (!ws.every((w) => t.w.some((x) => x.startsWith(w)))) continue;
        // primeiro os que começam pela primeira palavra, os da casa e os que têm mais produtos
        const pontos = (t.w[0].startsWith(ws[0]) ? 1e6 : 0) + (t.casa ? 1e5 : 0) + Number(t.n);
        bons.push({ k: t.k, nome: t.nome, n: Number(t.n), pontos });
    }
    return bons.sort((a, b) => b.pontos - a.pontos).slice(0, max).map(({ pontos, ...t }) => t);
}

// os produtos de um tipo, com os tamanhos e as marcas que há (os mais comuns primeiro)
const mediana = (v) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor((s.length - 1) / 2)] : null; };

// as estimativas da Mercadona e do SPAR para um tipo (por tamanho, e por unidade de medida para «todos os tamanhos»):
// a Mercadona pela marca branca das outras cadeias, o SPAR pelas marcas de fabricante
function estimativasDoTipo(results) {
    const g = new Map(), uc = { b: [], f: [] };
    let ub = null;
    for (const p of results) {
        const lado = p.pr ? 'b' : 'f';
        if (p.emb) { if (!g.has(p.emb)) g.set(p.emb, { b: [], f: [] }); g.get(p.emb)[lado].push(Number(p.cent)); }
        if (p.uc != null && p.ub) { uc[lado].push(Number(p.uc)); ub = ub ?? p.ub; }
    }
    const tam = [...g].map(([e, v]) => ({ e, merc: mediana(v.b), spar: mediana(v.f) }));
    return { tam, uc: { merc: mediana(uc.b), spar: mediana(uc.f), ub } };
}

// o preço real na Mercadona e no SPAR, do talão mais recente da casa com uma linha deste tipo (as palavras do tipo
// todas na linha): { mercadona: { cent, dia, t }, spar: {…} }
async function reaisDoTipo(db, casa, k) {
    if (!casa) return {};
    const { results } = await db.prepare("SELECT loja, dia, criado, linhas FROM talao WHERE casa = ? AND loja IN ('mercadona', 'spar') ORDER BY criado DESC LIMIT 40").bind(casa).all();
    const ws = palavrasTalao(k.replace(/-/g, ' ')).map((w) => w.replace(/s$/, ''));
    const r = {};
    for (const tl of results) {
        if (r[tl.loja]) continue;
        for (const l of JSON.parse(tl.linhas)) {
            if (!(l.cent > 0)) continue;
            const lw = new Set(palavrasTalao(porExtenso(l.t)).flatMap((w) => [w, w.replace(/s$/, '')]));
            if (ws.length && ws.every((w) => lw.has(w))) { r[tl.loja] = { cent: Math.round(l.cent / Math.max(1, l.q || 1)), dia: (tl.dia ?? tl.criado).slice(0, 10), t: l.t }; break; }
        }
    }
    return r;
}

export async function produtosDoTipo(db, k, agora = new Date(), casa = null) {
    const t = await db.prepare('SELECT k, nome FROM tipo WHERE k = ?').bind(k).first();
    if (!t) return null;
    const desde = new Date(agora.getTime() - 10 * 24 * HORA).toISOString();
    const { results } = await db.prepare(`SELECT cadeia AS c, id, nome, marca, propria AS pr, url, cent, antes, uc, ub, emb
        FROM preco WHERE tipo = ? AND cent IS NOT NULL AND visto > ? ORDER BY uc IS NULL, uc, cent, cadeia, id LIMIT 400`).bind(k, desde).all();
    // os valores (tamanhos, marcas) por ordem: primeiro os que há em mais cadeias (são os que dão para comparar),
    // depois os que têm mais produtos, depois pelo nome
    const conta = (f) => {
        const m = new Map();
        for (const p of results) {
            const v = f(p);
            if (!v) continue;
            const x = m.get(v) ?? { n: 0, c: new Set() };
            x.n++; x.c.add(p.c); m.set(v, x);
        }
        return [...m].sort((a, b) => b[1].c.size - a[1].c.size || b[1].n - a[1].n || (a[0] < b[0] ? -1 : 1)).map(([v, x]) => [v, x.n]);
    };
    // as marcas juntam-se sem maiúsculas («AUCHAN» e «Auchan»); a marca própria de cada cadeia conta à parte
    const nomeMarca = (m) => String(m).toLowerCase().replace(/(^|\s)\S/g, (l) => l.toUpperCase());
    const produtos = results.map((p) => {
        const x = { c: p.c, id: p.id, nome: p.nome, url: p.url, cent: Number(p.cent) };
        if (p.marca) x.mk = nomeMarca(p.marca);
        if (p.pr) x.pr = 1;
        if (p.emb) x.emb = p.emb;
        if (p.uc != null && p.ub) { x.uc = Number(p.uc); x.ub = p.ub; }
        if (p.antes != null) x.antes = Number(p.antes);
        return x;
    });
    return {
        k: t.k, nome: t.nome,
        tamanhos: conta((p) => p.emb).slice(0, 8).map(([e, n]) => ({ e, n })),
        marcas: conta((p) => (p.pr || !p.marca ? null : nomeMarca(p.marca))).slice(0, 10).map(([m, n]) => ({ m, n })),
        brancas: results.filter((p) => p.pr).length,
        est: estimativasDoTipo(results),
        reais: await reaisDoTipo(db, casa, k),
        produtos,
    };
}
