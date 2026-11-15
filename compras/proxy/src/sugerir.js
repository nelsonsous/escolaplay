// Escrever e encontrar (volta 5). Enquanto se escreve, a app pergunta /api/sugerir?q=… e recebe os tipos que
// começam pelo que se escreveu («ág» → Água sem gás, Água com gás…). Tocar num tipo pede /api/tipo?k=… e recebe os
// produtos desse tipo nas cadeias (os do catálogo, lidos há menos de 10 dias), com os tamanhos e as marcas que há,
// para a app afinar (botões) e escolher o mais barato de cada cadeia.
import { porExtenso, palavras as palavrasTalao } from './talao.js';
import { seccaoDoTipo, nomeSeccao, seccoesPorNome } from './seccoes.js';
import { medida } from './precos.js';

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
    TIPOS.lista = results.map((t) => ({ ...t, w: palavras(t.nome + ' ' + t.k.replace(/-/g, ' ')), s: seccaoDoTipo(t) }));
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
    // também pelos nomes dos produtos («picanha», «estufar», «carne»): os tipos onde há produtos com essas palavras
    if (bons.length < max && ws.every((w) => w.length >= 3)) {
        const { results } = await db.prepare(`SELECT tipo, count(*) AS n FROM preco WHERE tipo IS NOT NULL AND cent IS NOT NULL
            AND ${ws.map(() => 'nome LIKE ?').join(' AND ')} GROUP BY tipo ORDER BY n DESC LIMIT ?`).bind(...ws.map((w) => `%${w}%`), max).all();
        const porK = new Map((await tipos(db)).map((t) => [t.k, t]));
        // só os tipos onde a palavra é comum (um produto solto noutro tipo é ruído: «farinha» com «carne»)
        const topo = Math.max(...results.map((r) => Number(r.n)), 0);
        for (const r of results.filter((r) => Number(r.n) >= Math.max(2, topo * 0.2))) {
            const t = porK.get(r.tipo);
            if (t && !bons.some((b) => b.k === t.k)) bons.push({ k: t.k, nome: t.nome, n: Number(t.n), pontos: -1e6 + Number(r.n), w: ws.join(' ') });
        }
    }
    // mais de uma palavra sem tipo que as tenha todas («pão milho»): o tipo pela primeira e as outras como variante
    if (!bons.length && ws.length > 1) {
        const resto = ws.slice(1).join(' ');
        for (const t of (await tipos(db)).filter((t) => t.w.some((x) => x.startsWith(ws[0])))) {
            const r = await db.prepare(`SELECT count(*) AS n FROM preco WHERE tipo = ? AND cent IS NOT NULL AND ${ws.slice(1).map(() => 'nome LIKE ?').join(' AND ')}`)
                .bind(t.k, ...ws.slice(1).map((w) => `%${w}%`)).first();
            if (Number(r?.n)) bons.push({ k: t.k, nome: t.nome, n: Number(t.n), pontos: Number(r.n), w: resto });
        }
    }
    // a secção primeiro, quando o que se escreveu é o nome dela ou a maior parte dos tipos encontrados é dela
    // um nome repetido (um tipo da casa e um cruzado com o mesmo nome) aparece uma vez
    const nomes = new Set();
    const out = bons.sort((a, b) => b.pontos - a.pontos).filter((t) => !nomes.has(t.nome) && nomes.add(t.nome)).slice(0, max).map(({ pontos, ...t }) => t);
    const porK = new Map((await tipos(db)).map((t) => [t.k, t.s]));
    for (const t of out) t.s = porK.get(t.k);
    const secs = new Set(ws.length === 1 ? seccoesPorNome(ws[0]) : []);
    const conta = new Map();
    for (const t of out) if (!t.w) conta.set(t.s, (conta.get(t.s) ?? 0) + 1); // os achados pelo nome não contam
    for (const [sx, n] of conta) if (n >= 2 && sx !== 11) secs.add(sx);
    return [...[...secs].map((sx) => ({ sec: sx, nome: nomeSeccao(sx) })), ...out];
}

// os tipos de uma secção (os que têm produtos), os com mais produtos primeiro
export async function tiposDaSeccao(db, sx) {
    return (await tipos(db)).filter((t) => t.s === sx).sort((a, b) => b.n - a.n).map((t) => ({ k: t.k, nome: t.nome, n: Number(t.n), s: t.s }));
}

// as palavras que distinguem os produtos de um tipo («picada», «bife», «estufar», «meio gordo»…): as mais comuns nos
// nomes, sem as do tipo, as das marcas e as das medidas, que apareçam em pelo menos dois produtos
const FORA = new Set(['producao', 'propria', 'com', 'sem', 'para', 'emb', 'embalagem', 'pack', 'kg', 'gr', 'lt', 'unid', 'cada', 'aprox', 'continente', 'pingo', 'doce', 'auchan', 'polegar', 'marca']);
export function palavrasDoTipo(k, produtos, max = 10) {
    const doTipo = new Set(palavras(k.replace(/-/g, ' ')));
    const marcas = new Set(produtos.flatMap((p) => palavras(p.mk ?? '')));
    const conta = new Map();
    for (const p of produtos) {
        for (const w of new Set(palavras(p.nome))) {
            if (w.length < 4 || /\d/.test(w) || FORA.has(w) || doTipo.has(w) || marcas.has(w)) continue;
            conta.set(w, (conta.get(w) ?? 0) + 1);
        }
    }
    return [...conta].filter(([, n]) => n >= 2 && n < produtos.length).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, max).map(([w, n]) => ({ w, n }));
}

// os produtos de um tipo, com os tamanhos e as marcas que há (os mais comuns primeiro)
const mediana = (v) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor((s.length - 1) / 2)] : null; };

// as estimativas da Mercadona e do SPAR para um tipo: a Mercadona pela marca branca das outras cadeias, o SPAR
// pelas marcas de fabricante. Por tamanho (merc, spar: o que se paga; umerc, uspar: por quilo ou litro, na unidade
// do tipo ub; bm, bs: a base, o mais barato de cada cadeia) e por unidade de medida (uc). mp e sp: a estimativa do
// tamanho mais comum que a tem, para quando não se escolheu tamanho.
function estimativasDoTipo(results, ub, tamanhos = []) {
    const g = new Map(), uc = { b: [], f: [] };
    for (const p of results) {
        const lado = p.pr ? 'b' : 'f';
        if (p.emb) { if (!g.has(p.emb)) g.set(p.emb, { b: [], f: [] }); g.get(p.emb)[lado].push(p); }
        if (p.uc != null && p.ub === ub) uc[lado].push(Number(p.uc));
    }
    const base = (ps) => {
        const m = new Map();
        for (const p of ps) if (!m.has(p.c) || Number(p.cent) < m.get(p.c)) m.set(p.c, Number(p.cent));
        return [...m].map(([c, cent]) => ({ c, cent }));
    };
    const tam = [...g].map(([e, v]) => {
        const x = { e, merc: mediana(v.b.map((p) => Number(p.cent))), spar: mediana(v.f.map((p) => Number(p.cent))), bm: base(v.b), bs: base(v.f) };
        const q = medida(e);
        if (q && q.ub === ub && q.q > 0) {
            if (x.merc != null) x.umerc = Math.round(x.merc / q.q);
            if (x.spar != null) x.uspar = Math.round(x.spar / q.q);
        }
        return x;
    });
    const ordem = [...tamanhos.map((t) => t.e), ...tam.map((t) => t.e)];
    const primeiro = (f) => ordem.map((e) => tam.find((t) => t.e === e)).find((t) => t && t[f] != null) ?? null;
    return { tam, uc: { merc: mediana(uc.b), spar: mediana(uc.f), ub }, mp: primeiro('merc')?.e ?? null, sp: primeiro('spar')?.e ?? null };
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
        x.nk = palavras(p.nome).join(' '); // o nome sem acentos nem maiúsculas, para filtrar pelas palavras
        return x;
    });
    // a unidade de medida do tipo (a mais comum: kg, l ou un): só se comparam os preços por unidade nessa
    const nu = new Map();
    for (const p of results) if (p.uc != null && p.ub) nu.set(p.ub, (nu.get(p.ub) ?? 0) + 1);
    const ub = [...nu].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const tamanhos = conta((p) => p.emb).slice(0, 8).map(([e, n]) => ({ e, n }));
    // o mais barato primeiro: na unidade do tipo, por esse preço; os outros depois, pelo que se paga
    produtos.sort((a, b) => (a.ub === ub ? 0 : 1) - (b.ub === ub ? 0 : 1) || (a.ub === ub ? a.uc - b.uc : a.cent - b.cent));
    return {
        // a secção (o primeiro nível da árvore: o caminho na escolha volta a ela)
        k: t.k, nome: t.nome, s: seccaoDoTipo(t), sn: nomeSeccao(seccaoDoTipo(t)),
        tamanhos,
        marcas: conta((p) => (p.pr || !p.marca ? null : nomeMarca(p.marca))).slice(0, 10).map(([m, n]) => ({ m, n })),
        brancas: results.filter((p) => p.pr).length,
        palavras: palavrasDoTipo(t.k, produtos),
        ub,
        est: estimativasDoTipo(results, ub, tamanhos),
        reais: await reaisDoTipo(db, casa, k),
        produtos,
    };
}
