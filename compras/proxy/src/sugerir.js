// Escrever e encontrar (volta 5). Enquanto se escreve, a app pergunta /api/sugerir?q=… e recebe os tipos que
// começam pelo que se escreveu («ág» → Água sem gás, Água com gás…). Tocar num tipo pede /api/tipo?k=… e recebe os
// produtos desse tipo nas cadeias (os do catálogo, lidos há menos de 10 dias), com os tamanhos e as marcas que há,
// para a app afinar (botões) e escolher o mais barato de cada cadeia.
import { porExtenso, palavras as palavrasTalao } from './talao.js';
import { seccaoDoTipo, nomeSeccao, seccoesPorNome } from './seccoes.js';
import { medida, pecaAoPeso } from './precos.js';
import { familiaDe, atributos, palavrasAtributos, filasDaFamilia, candidatosMelhores, maisCotados, formatoGrande } from './atributos.js';
import { prepararNotas, notaDoProduto } from './notas.js';
import { limiteGramas, gramasDe } from './porcoes.js';
import { sinais } from './qualidade.js';
import { etiquetas, palavrasEtiquetas, nomeEtiqueta, TALHO, USOS, ORDEM_CALIBRE } from './etiquetas.js';

const HORA = 3600e3;
const TIPOS = { lista: null, quando: 0 };
export const esquecerTipos = () => { TIPOS.lista = null; CORTES.clear(); RAMOS_CACHE.m = null; };

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

// outros nomes por que se procura um tipo (as cadeias juntam todo o bovino numa categoria: a picanha é de vaca)
const OUTROS = { 'carne-novilho': 'bovino vitelao angus', 'borrego-cabrito': 'cordeiro', 'polvo-lulas': 'choco pota' };
async function tipos(db) {
    if (TIPOS.lista && Date.now() - TIPOS.quando < HORA) return TIPOS.lista;
    const { results } = await db.prepare('SELECT k, nome, n, casa FROM tipo WHERE n > 0').all();
    TIPOS.lista = results.map((t) => ({ ...t, w: palavras(`${t.nome} ${t.k.replace(/-/g, ' ')} ${OUTROS[t.k] ?? ''}`), s: seccaoDoTipo(t) }));
    TIPOS.quando = Date.now();
    return TIPOS.lista;
}

// palavras que são um grupo de tipos e não um tipo: «carne» é o talho todo (frango, peru, porco…), «peixe» a peixaria.
// Mostram a secção, os tipos do grupo e os cortes mais comuns nos nomes dos produtos («picanha», «para estufar»…), cada
// um no tipo onde há mais produtos com ele (tocar abre esse tipo com o corte já escolhido)
const PARA = new Set(['estufar', 'grelhar', 'assar', 'cozer', 'fritar']);
// o talho e a peixaria em ramos (a árvore: secção › ramo › tipo › espécie › corte ou uso); os tipos cruzados
// automaticamente desta secção não entram (repetiam os da casa ou tinham nomes trocados)
export const RAMOS = [
    ['Carne', ['carne-novilho', 'porco', 'frango', 'peru', 'borrego-cabrito']],
    ['Picada e preparados', ['carne-picada', 'hamburguer', 'espetada', 'salsicha']],
    ['Peixe', ['peixe-fresco', 'peixe-congelado', 'bacalhau', 'pescada']],
    ['Marisco', ['marisco', 'polvo-lulas']],
];
export const GRUPOS = {
    carne: { s: 2, ramos: ['Carne', 'Picada e preparados'] },
    peixe: { s: 2, ramos: ['Peixe', 'Marisco'], especie: true },
};
// os tipos dos ramos (os que têm produtos), por ordem, com o ramo (gr)
async function dosRamos(db, ramos) {
    const porK = new Map((await tipos(db)).map((t) => [t.k, t]));
    return RAMOS.filter(([r]) => ramos.includes(r)).flatMap(([gr, ks]) => ks.filter((k) => porK.has(k)).map((k) => ({ ...porK.get(k), gr })));
}
const CORTES = new Map(); // o grupo → { quando, lista } (uma hora)
async function grupo(db, g, nome) {
    // um grupo («carne»: os ramos todos) ou um tipo só («bacalhau»: g.ks), com os cortes e os usos dele
    const ts = g.ks ? (await dosRamos(db, RAMOS.map(([r]) => r))).filter((t) => g.ks.includes(t.k)) : await dosRamos(db, g.ramos);
    let c = CORTES.get(nome);
    if (!c || Date.now() - c.quando > HORA) {
        const ks = ts.map((t) => t.k);
        const { results } = ks.length ? await db.prepare(`SELECT tipo, nome FROM preco WHERE cent IS NOT NULL AND suspeito IS NULL AND tipo IN (${ks.map(() => '?').join(', ')})`).bind(...ks).all() : { results: [] };
        const conta = new Map(); // corte → tipo → n
        const animais = new Set();
        for (const r of results) {
            // as etiquetas do Ecónomo (etiquetas.js): os usos e o corte (e, na peixaria, a espécie)
            const e = etiquetas(r.nome, r.tipo);
            const ws = e ? [...e.usos, e.corte, e.cal, ...(g.especie ? [e.animal] : [])].filter(Boolean) : [];
            if (g.especie && e?.animal) animais.add(e.animal);
            for (const w of ws) { const m = conta.get(w) ?? new Map(); m.set(r.tipo, (m.get(r.tipo) ?? 0) + 1); conta.set(w, m); }
        }
        const porK = new Map(ts.map((t) => [t.k, t]));
        const lista = [...conta].map(([w, m]) => { const [k, n] = [...m].sort((a, b) => b[1] - a[1])[0]; return { w, k, n }; })
            // os usos («para estufar») primeiro, que as cadeias quase não os escrevem; depois os cortes com mais produtos
            .filter((x) => x.n >= 3 && porK.has(x.k)).sort((a, b) => (PARA.has(b.w) ? 1 : 0) - (PARA.has(a.w) ? 1 : 0) || b.n - a.n).slice(0, 14)
            // a espécie (ga) escolhe-se no nível do animal; o corte e o uso no seguinte
            .map((x) => ({ k: x.k, nome: porK.get(x.k).nome, w: x.w, corte: nomeEtiqueta(x.w), s: g.s, ...(animais.has(x.w) ? { ga: 1 } : {}) }));
        c = { quando: Date.now(), lista };
        CORTES.set(nome, c);
    }
    return [{ sec: g.s, nome: nomeSeccao(g.s) }, ...ts.map((t) => ({ k: t.k, nome: t.nome, n: Number(t.n), s: t.s, gr: t.gr })), ...c.lista];
}

// os tipos que correspondem ao que se escreveu: cada palavra escrita é o início de uma palavra do tipo
export async function sugerir(db, q, max = 8) {
    const ws = palavras(q).slice(0, 4);
    if (!ws.length) return [];
    if (ws.length === 1 && GRUPOS[ws[0]]) return grupo(db, GRUPOS[ws[0]], ws[0]);
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
    // um tipo só do talho ou da peixaria («bacalhau»): a secção, o tipo e os cortes dele (o calibre, as postas…)
    const sos = out.filter((t) => !t.w);
    if (ws.length === 1 && sos.length === 1 && RAMOS.some(([, ks]) => ks.includes(sos[0].k))) return grupo(db, { s: 2, ks: [sos[0].k], especie: true }, 'tipo:' + sos[0].k);
    return [...[...secs].map((sx) => ({ sec: sx, nome: nomeSeccao(sx) })), ...out];
}

// os tipos de uma secção (os que têm produtos), os com mais produtos primeiro
export async function tiposDaSeccao(db, sx) {
    if (sx === 2) return (await dosRamos(db, RAMOS.map(([r]) => r))).map((t) => ({ k: t.k, nome: t.nome, n: Number(t.n), s: 2, gr: t.gr }));
    // nas outras secções, os ramos vêm da arrumação das próprias cadeias (o segundo nível das categorias do Continente,
    // ou do Auchan: «Arroz, massa e farinha», «Conservas», «Bolachas e biscoitos»): os tipos de cada ramo juntos
    const ramos = await ramosDosTipos(db);
    const ts = (await tipos(db)).filter((t) => t.s === sx).map((t) => ({ k: t.k, nome: t.nome, n: Number(t.n), s: t.s, gr: ramos.get(t.k) ?? 'Outros' }));
    const peso = new Map();
    for (const t of ts) peso.set(t.gr, (peso.get(t.gr) ?? 0) + t.n);
    return ts.sort((a, b) => (a.gr === 'Outros') - (b.gr === 'Outros') || peso.get(b.gr) - peso.get(a.gr) || (a.gr < b.gr ? -1 : a.gr > b.gr ? 1 : 0) || b.n - a.n);
}
const ACENTOS_RAMO = { laticinios: 'laticínios', cafe: 'café', cha: 'chá', acucar: 'açúcar', pao: 'pão', agua: 'água', aguas: 'águas', bebes: 'bebés', bebe: 'bebé',
    refeicoes: 'refeições', oleos: 'óleos', champo: 'champô', champos: 'champôs', depilacao: 'depilação', protecao: 'proteção', loica: 'loiça', cao: 'cão', caes: 'cães',
    higienico: 'higiénico', infusoes: 'infusões', liquidos: 'líquidos', acessorios: 'acessórios', organicos: 'orgânicos', biologicos: 'biológicos', pates: 'patês',
    graos: 'grãos', feijao: 'feijão', mercearia: 'mercearia', lacteos: 'lácteos', salgados: 'salgados', congelados: 'congelados', gelados: 'gelados', vegetais: 'vegetais',
    pastelaria: 'pastelaria', frutos: 'frutos', saude: 'saúde', bem: 'bem', estar: 'estar', maos: 'mãos', facial: 'facial', solares: 'solares', higiene: 'higiene' };
export const nomeRamo = (slug) => {
    const ws = String(slug).split('-').map((w) => ACENTOS_RAMO[w] ?? w);
    // «arroz massa e farinha» → «Arroz, massa e farinha»
    const e = ws.lastIndexOf('e');
    const t = e > 1 ? `${ws.slice(0, e).join(', ')} e ${ws.slice(e + 1).join(' ')}` : ws.join(' ');
    return t[0].toUpperCase() + t.slice(1);
};
const RAMOS_CACHE = { m: null, quando: 0 };
async function ramosDosTipos(db) {
    if (RAMOS_CACHE.m && Date.now() - RAMOS_CACHE.quando < HORA) return RAMOS_CACHE.m;
    const { results } = await db.prepare(`SELECT tipo, cadeia, url FROM pagina WHERE marca = 0 AND cadeia IN ('continente', 'auchan')`).all();
    const conta = new Map(); // tipo → slug → [n, cadeia]
    for (const r of results) {
        const caminho = r.cadeia === 'continente' ? r.url.split('/supermercado/')[1] : r.url.split('/pt/')[1];
        const partes = String(caminho ?? '').split('/').filter(Boolean);
        const slug = partes.length >= 3 ? partes[1] : partes[0];
        if (!slug) continue;
        if (!conta.has(r.tipo)) conta.set(r.tipo, new Map());
        const m = conta.get(r.tipo);
        const v = m.get(slug) ?? [0, r.cadeia];
        v[0] += r.cadeia === 'continente' ? 2 : 1; // o Continente primeiro (as categorias dele são as mais arrumadas)
        m.set(slug, v);
    }
    const m = new Map([...conta].map(([k, s]) => [k, nomeRamo([...s].sort((a, b) => b[1][0] - a[1][0])[0][0])]));
    RAMOS_CACHE.m = m; RAMOS_CACHE.quando = Date.now();
    return m;
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

// no talho e na peixaria, as escolhas vêm das etiquetas do Ecónomo, por níveis (g): primeiro o animal ou a espécie (só
// se há mais de um: o carapau, a pescada), depois o corte e o uso (grelhar…). r é o nome para ler, w a palavra para
// filtrar; no corte e no uso, a: os animais onde há produtos com ele (escolhido o carapau, só aparecem os do carapau)
export function palavrasDoTalho(k, produtos) {
    const conta = { uso: new Map(), corte: new Map(), animal: new Map(), prod: new Map(), cal: new Map() };
    const com = new Map(); // corte ou uso → animais
    const mais = (m, w) => m.set(w, (m.get(w) ?? 0) + 1);
    for (const p of produtos) {
        const e = etiquetas(p.nome, k);
        if (!e) continue;
        for (const w of [...e.usos, e.corte].filter(Boolean)) {
            mais(e.usos.includes(w) ? conta.uso : conta.corte, w);
            if (e.animal) { if (!com.has(w)) com.set(w, new Set()); com.get(w).add(e.animal); }
        }
        if (e.animal) mais(conta.animal, e.animal);
        if (e.cal) mais(conta.cal, e.cal);
        // a origem: o modo de produção, o país e a preparação (salgado seco ou demolhado), na mesma fila
        for (const w of [e.prod, e.pais, e.prep].filter(Boolean)) { mais(conta.prod, w); if (e.animal) { if (!com.has(w)) com.set(w, new Set()); com.get(w).add(e.animal); } }
    }
    // (os usos que todos os produtos têm também aparecem: o bacalhau é todo para cozer, e é isso que se procura)
    const lista = (g, max) => [...conta[g]].filter(([, n]) => n >= 2 && n <= produtos.length)
        .sort((a, b) => (g === 'uso' ? USOS.indexOf(a[0]) - USOS.indexOf(b[0]) : g === 'cal' ? ORDEM_CALIBRE.indexOf(a[0]) - ORDEM_CALIBRE.indexOf(b[0]) : b[1] - a[1])).slice(0, max)
        .map(([w, n]) => ({ w, r: nomeEtiqueta(w), n, g }));
    const animais = lista('animal', 12);
    const comA = (x) => (animais.length > 1 && com.has(x.w) ? { ...x, a: [...com.get(x.w)] } : x);
    // a origem (selvagem ou aquacultura; biológico, do campo, DOP…) logo a seguir ao animal
    return [...(animais.length > 1 ? animais : []), ...lista('prod', 12).map(comA), ...lista('cal', 4), ...lista('corte', 14).map(comA), ...lista('uso', 5).map(comA)];
}

// as peças inteiras vendidas ao peso (uma picanha de 1,8 kg) vêm com o preço do quilo onde devia estar o da peça, e o
// «por quilo» sai a metade (17,99 € ÷ 1,8 kg = 9,99 €/kg); e as embalagens pequenas ao peso lidas antes de se perceber o
// «€/kg» (bife da vazia a 27,99 €/kg em 340 g: o «por quilo» saía 82,32 €/kg). O Ecónomo reconhece-as pelos vizinhos do mesmo corte: com
// 1 kg ou mais, o «por quilo» muito abaixo dos das embalagens pequenas (menos de 75% da mediana) e o preço parecido com
// esse quilo. Então o preço é o do quilo e paga-se ≈ preço × peso (aq: ao quilo, o que se paga é aproximado).
function aoQuilo(produtos, k) {
    const grupo = new Map();
    for (const p of produtos) {
        if (p.ub !== 'kg' || p.uc == null) continue;
        const c = etiquetas(p.nome, k)?.corte ?? '-';
        if (!grupo.has(c)) grupo.set(c, []);
        grupo.get(c).push(p);
    }
    for (const ps of grupo.values()) {
        const peq = ps.filter((p) => (medida(p.emb)?.q ?? 0) < 1).map((p) => p.uc);
        const med = mediana(peq.length >= 2 ? peq : ps.map((p) => p.uc));
        if (!med) continue;
        for (const p of ps) {
            const q = medida(p.emb)?.q ?? 0;
            // a peça grande com o preço do quilo (o «por quilo» sai a metade), ou a embalagem pequena com o preço do quilo
            // (27,99 €/kg em 340 g: o «por quilo» sai 82 €/kg): nos dois casos o preço parece-se com o quilo dos vizinhos
            const pareceQuilo = p.cent >= med * 0.75 && p.cent <= med * 1.6;
            if (pareceQuilo && ((q >= 1 && p.uc < med * 0.75) || (q > 0 && q < 1 && p.uc > med * 2.5))) {
                p.uc = p.cent; p.cent = Math.round(p.cent * q); p.aq = 1;
            }
        }
    }
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

// com um corte ou uma variante escolhida («carapau»), a estimativa é a desses produtos (por quilo ou litro), e não a do
// tipo todo (o peixe fresco inteiro, com o salmão e o robalo): { w, merc, spar } em cêntimos por unidade
function estimativasPorPalavra(produtos, palavras, ub) {
    return palavras.map(({ w }) => {
        const ps = produtos.filter((p) => p.ub === ub && p.uc != null && ` ${p.nk} `.includes(` ${w} `));
        return { w, merc: mediana(ps.filter((p) => p.pr).map((p) => p.uc)), spar: mediana(ps.filter((p) => !p.pr).map((p) => p.uc)) };
    }).filter((x) => x.merc != null || x.spar != null);
}

// os preços reais de vários tipos de uma vez (para a lista): Map k → { mercadona, spar }
export async function reaisDaCasa(db, casa, ks) {
    const r = new Map();
    for (const k of new Set(ks)) { const x = await reaisDoTipo(db, casa, k); if (x.mercadona || x.spar) r.set(k, x); }
    return r;
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

// os portes das lojas de produtores (dos termos e condições de cada uma), em cêntimos
export const PORTES = {
    lugrade: { cent: 750, gratis: 10000, nota: 'só Portugal continental' },
    // a Riberalves (FAQ da loja): entrega grátis, encomenda mínima de 50 €, só em algumas zonas (vê-se pelo código postal)
    riberalves: { cent: 0, gratis: 0, nota: 'encomenda mínima 50 €, só algumas zonas' },
};
// o produto da mesma marca (a loja) num supermercado, com o mesmo calibre e a mesma origem: { c, uc, ub, nome }
// a linha do produto (a «Seleção do Chef Diogo Rocha», a gourmet): o artigo de linha só se compara com o da mesma
// linha, e o normal só com o normal (o Especial da Lugrade não é a Seleção do Chef do Continente)
const LINHA = /\bsele[cç][aã]o\b|\bchef\b|\bgourmet\b|\bpremium\b|\breserva\b/i;
// o peso da peça: o intervalo do produtor («3.25 a 3.5kg», «2.6kg a 3kg») e o do supermercado («3 kg», «≈ 3 kg»)
export function intervaloPeso(s) {
    const m = String(s ?? '').match(/(\d+(?:[.,]\d+)?)\s*(?:kg)?\s*a\s*(\d+(?:[.,]\d+)?)\s*kg/i);
    return m ? [Number(m[1].replace(',', '.')), Number(m[2].replace(',', '.'))] : null;
}
const pesoKg = (emb) => { const m = String(emb ?? '').match(/(\d+(?:[.,]\d+)?)\s*kg\b/i); return m ? Number(m[1].replace(',', '.')) : null; };
// a mesma marca no supermercado: com o mesmo peso de peça (cada marca chama «especial» ou «graúdo» a pesos diferentes:
// a Lugrade vende o Especial de 3,25 a 3,5 kg, o Continente o Especial de ≈ 3 kg), ou, sem pesos, o mesmo calibre;
// e sempre a mesma origem, o mesmo corte e a mesma linha
export function mesmaMarca(produtos, loja, et, k, nome = '') {
    const re = new RegExp('\\b' + loja + '\\b', 'i');
    const linha = LINHA.test(nome);
    const iv = intervaloPeso(nome);
    const ms = produtos.filter((p) => re.test(`${p.marca ?? ''} ${p.nome}`) && p.uc && p.ub === 'kg').filter((p) => {
        const e = etiquetas(p.nome, k);
        const w = pesoKg(p.emb);
        const peso = iv && w ? w >= iv[0] - 0.15 && w <= iv[1] + 0.15 : (!et?.cal || e?.cal === et.cal);
        return peso && (!et?.pais || e?.pais === et.pais) && (!et?.corte || e?.corte === et.corte) && LINHA.test(p.nome) === linha;
    }).sort((a, b) => a.uc - b.uc);
    return ms.length ? { c: ms[0].c, uc: ms[0].uc, ub: 'kg', nome: ms[0].nome, ...(pesoKg(ms[0].emb) ? { kg: String(pesoKg(ms[0].emb)).replace('.', ',') } : {}) } : null;
}
export async function produtosDoTipo(db, k, agora = new Date(), casa = null) {
    const t = await db.prepare('SELECT k, nome FROM tipo WHERE k = ?').bind(k).first();
    if (!t) return null;
    const fam = familiaDe(t.k, seccaoDoTipo(t)); // vinho, azeite, queijo, presunto, fruta, padaria (atributos.js)
    const desde = new Date(agora.getTime() - 10 * 24 * HORA).toISOString();
    const { results } = await db.prepare(`SELECT cadeia AS c, id, nome, marca, propria AS pr, url, cent, antes, uc, ub, emb, q
        FROM preco WHERE tipo = ? AND cent IS NOT NULL AND suspeito IS NULL AND visto > ? ORDER BY uc IS NULL, uc, cent, cadeia, id LIMIT 400`).bind(k, desde).all();
    // as peças do Continente ao quilo guardadas antes de se perceber (o «por unidade» é a peça): corrigem-se ao ler
    for (const p of results) { const pc = pecaAoPeso({ ...p, cadeia: p.c }); if (pc) Object.assign(p, pc); }
    for (const p of results) if (String(p.emb ?? '').startsWith('≈')) { p.emb = p.emb.replace(/^≈\s*/, ''); p.aq = 1; }
    results.sort((a, b) => (a.uc == null) - (b.uc == null) || (a.uc ?? 0) - (b.uc ?? 0) || a.cent - b.cent);
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
        if (p.aq) x.aq = 1; // a peça ao quilo: paga-se ≈
        if (p.uc != null && p.ub) { x.uc = Number(p.uc); x.ub = p.ub; }
        if (p.antes != null) x.antes = Number(p.antes);
        // o peso da embalagem em gramas (porcoes.js), no talho e na peixaria: para o tamanho certo para a casa
        if (TALHO.has(t.k)) { const g = gramasDe(p); if (g) x.g = g; }
        // o nome sem acentos nem maiúsculas, para filtrar pelas palavras; no talho e na peixaria, com as etiquetas
        // do Ecónomo (o uso, o corte, o animal: «grelhar picanha vaca»)
        const et = TALHO.has(t.k) ? etiquetas(p.nome, t.k) : null;
        x.nk = palavras(`${p.nome} ${palavrasEtiquetas(et).join(' ')} ${fam ? palavrasAtributos(atributos(fam, p.nome, p.cent)).join(' ') : ''}`).join(' ');
        if (et?.corte) x.cr = nomeEtiqueta(et.corte); // o corte, para arrumar as outras opções
        // os sinais de qualidade pelo nome (qualidade.js): massa mãe, biológico, congelado…
        const sq = sinais(p.nome);
        if (sq.length) x.sq = sq;
        return x;
    });
    // no vinho, a nota dos críticos e dos concursos (notas.js; a tabela vinho_nota, do Ecónomo)
    if (fam === 'vinho') {
        const notas = prepararNotas((await db.prepare('SELECT palavras, fora, nota, resumo, fontes FROM vinho_nota').all()).results);
        if (notas.length) for (const x of produtos) { const r = notaDoProduto(notas, x.nome); if (r) { x.nt = r.nota; x.nr = r.resumo; if (r.url) x.nu = r.url; } }
    }
    // a unidade de medida do tipo (a mais comum: kg, l ou un): só se comparam os preços por unidade nessa
    const nu = new Map();
    for (const p of results) if (p.uc != null && p.ub) nu.set(p.ub, (nu.get(p.ub) ?? 0) + 1);
    const ub = [...nu].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const tamanhos = conta((p) => (p.aq ? null : p.emb)).slice(0, 8).map(([e, n]) => ({ e, n }));
    const ff = !TALHO.has(t.k) && fam ? filasDaFamilia(fam, results) : null;
    const escolhas = TALHO.has(t.k) ? palavrasDoTalho(t.k, results) : ff?.filas.length ? ff.palavras : palavrasDoTipo(t.k, produtos);
    if (TALHO.has(t.k)) aoQuilo(produtos, t.k);
    // o mais barato primeiro: na unidade do tipo, por esse preço; os outros depois, pelo que se paga
    produtos.sort((a, b) => (a.ub === ub ? 0 : 1) - (b.ub === ub ? 0 : 1) || (a.ub === ub ? a.uc - b.uc : a.cent - b.cent));
    // no vinho, as garrafas primeiro: o bag-in-box e o garrafão (2 L ou mais) são sempre os mais baratos por litro e
    // não se comparam com uma garrafa (o mais barato de cada loja é uma garrafa, a não ser que se escolha o tamanho)
    if (fam === 'vinho') produtos.sort((a, b) => formatoGrande(a) - formatoGrande(b));
    // as pessoas da casa: no talho e na peixaria, o limite das embalagens para o mais barato (porcoes.js)
    const pes = casa ? (await db.prepare('SELECT pessoas FROM casa WHERE id = ?').bind(casa).first())?.pessoas : null;
    const lim = limiteGramas(t.k, pes);
    return {
        ...(lim ? { lim, pes: Number(pes) } : {}),
        // a secção (o primeiro nível da árvore: o caminho na escolha volta a ela)
        k: t.k, nome: t.nome, s: seccaoDoTipo(t), sn: nomeSeccao(seccaoDoTipo(t)),
        tamanhos,
        marcas: conta((p) => (p.pr || !p.marca ? null : nomeMarca(p.marca))).slice(0, 10).map(([m, n]) => ({ m, n })),
        brancas: results.filter((p) => p.pr).length,
        palavras: escolhas,
        // as filas da família (vinho: região, gama, casta; azeite; queijo), por ordem: a app usa-as com os filtros fa, fp, fc
        ...(ff?.filas.length ? { filas: ff.filas, fam } : fam ? { fam } : {}),
        // as melhores compras pelo rótulo (atributos.js): a fronteira preço-rótulo
        // os candidatos às melhores compras pelo rótulo (atributos.js): os produtos com pontos, do mais barato para o
        // mais caro, pelo índice na lista; a app tira deles a fronteira preço-rótulo só com os que passam nos filtros
        // escolhidos (a região, o preço, a casta, o tamanho, a marca)
        ...(fam ? { bcc: candidatosMelhores(fam, produtos) } : {}),
        // no vinho, os mais bem cotados pela crítica (os índices, do melhor para o pior): as sugestões
        ...(fam === 'vinho' ? { bnt: maisCotados(produtos) } : {}),
        ub,
        est: { ...estimativasDoTipo(results, ub, tamanhos), w: estimativasPorPalavra(produtos, escolhas, ub) },
        reais: await reaisDoTipo(db, casa, k),
        // as lojas online de produtores (economo/produtores.mjs): à parte, com as etiquetas e os sinais, para filtrar
        pd: (await db.prepare(`SELECT loja, nome, url, variante, cent, emb, uc, ub, disponivel FROM produtor_artigo WHERE tipo = ?
            ORDER BY disponivel DESC, uc IS NULL, uc LIMIT 40`).bind(k).all()).results.map((a) => {
            const nome = a.variante ? `${a.nome} (${a.variante})` : a.nome;
            const et = TALHO.has(k) ? etiquetas(`${k === 'bacalhau' && !/bacalhau|paloco/i.test(a.nome) ? 'Bacalhau ' : ''}${nome}`, k) : null;
            const x = { loja: a.loja, nome, url: a.url, cent: a.cent, ...(a.emb ? { emb: a.emb } : {}), ...(a.uc ? { uc: a.uc, ub: a.ub } : {}),
                nk: palavras(`${nome} ${palavrasEtiquetas(et).join(' ')}`).join(' '), ...(a.disponivel ? {} : { esg: 1 }) };
            const sq = sinais(nome);
            if (sq.length) x.sq = sq;
            // os portes (dos termos da loja): grátis acima de um valor
            const po = PORTES[a.loja];
            if (po) { x.po = a.cent >= po.gratis ? 0 : po.cent; if (po.nota) x.pn = po.nota; }
            // a mesma marca num supermercado, com o mesmo calibre e a mesma origem (a Lugrade também se vende no Continente)
            const mc = et ? mesmaMarca(results, a.loja, et, k, nome) : null;
            if (mc) x.mc = mc;
            return x;
        }),
        // os artigos que o SPAR vende deste tipo (da lista do site), com a estimativa de cada um (economo/spar.mjs)
        sa: (await db.prepare(`SELECT nome AS n, emb, propria AS pr, eq_cent AS eq, eq_como AS como FROM spar_artigo WHERE tipo = ?
            ORDER BY propria DESC, eq_cent IS NULL, eq_cent LIMIT 30`).bind(k).all()).results,
        produtos,
    };
}
