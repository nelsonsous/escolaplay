// Os preços (volta 3). O conector lê o preço de cada produto escolhido numa lista no site da cadeia (com as fontes
// da volta 1) e guarda-o na D1 (a tabela preco). Lê-se:
//   - logo, quando se escolhe um produto (no pedido que muda a lista; no máximo POR_PEDIDO de cada vez);
//   - de dez em dez minutos, pelo cron do Worker: os preços com mais de VALE_H horas dos produtos que estão em alguma
//     lista, no máximo um por cadeia de cada vez (cada site recebe no máximo um pedido a cada dez minutos).
// Um pedido que falha espera antes de se repetir (meia hora, uma hora, duas… até um dia).
// A lista vai para a app com o preço ao lado de cada produto escolhido (juntarPrecos): em cêntimos.
// Volta 4: também o preço por quilo, por litro ou por unidade (porUnidade), para comparar embalagens; e os preços dos
// produtos parecidos de uma procura (precosDe), para a app mostrar o mais barato por quilo ou por litro.
import { FONTES } from './fontes/index.js';
import { pedir } from './rede.js';
import { estimativas } from './escolhas.js';
import { seccao } from './seccoes.js';
import { reaisDaCasa } from './sugerir.js';

export const VALE_H = 20, POR_PEDIDO = 2, POR_CRON = 4;
const HORA = 3600e3;

const cent = (v) => (v == null || !Number.isFinite(Number(v)) ? null : Math.round(Number(v) * 100));
const unid = (u) => (u && u.valor != null ? `${u.valor.toFixed(2).replace('.', ',')} €/${u.unidade}` : null);

// as medidas em quilos, litros ou unidades
const MEDIDA = { kg: ['kg', 1], g: ['kg', 1e-3], gr: ['kg', 1e-3], l: ['l', 1], lt: ['l', 1], ml: ['l', 1e-3], cl: ['l', 1e-2], un: ['un', 1], uni: ['un', 1], unid: ['un', 1], unidades: ['un', 1] };
const NUM = '(\\d+(?:[.,]\\d+)?)';
const VEZES = new RegExp(`(\\d+)\\s*[x×]\\s*${NUM}\\s*(kg|gr?|lt?|ml|cl)\\b`, 'i');
const UMA = new RegExp(`${NUM}\\s*(kg|gr?|lt?|ml|cl|unid(?:ades)?|uni?)\\b\\.?`, 'i');
const n = (s) => Number(String(s).replace(',', '.'));
// quanto tem uma embalagem («emb. 6 x 1 lt», «500 g», «12 un»): { q, ub } em quilos, litros ou unidades
// o texto da embalagem arrumado: «&times;» é ×; nos packs de litros sem vírgula, o Auchan escreve «4X150L» (4 × 1,50 L),
// «6X050L» (6 × 0,50 L) e «4X15L» (4 × 1,5 L), sem espaços: ninguém vende garrafas de 150 litros («2 x 10 L» fica)
export const limpaMedida = (s) => String(s ?? '').replace(/&times;/gi, '×')
    // o calibre do Auchan antes do «KG» («LOMBO DE BACALHAU … 200/300 KG», «SAPATEIRA 600/800 KG»): não é o peso, é ao quilo
    .replace(/\b\d+\s?\/\s?\d+\s*(kg)\s*$/i, '$1')
    .replace(/(\d+)[x×](\d)(\d{2})(lt?)\b/gi, '$1×$2,$3 $4')
    // com dois algarismos: «15» é 1,5 L (garrafas), «33» é 0,33 L (latas): acima de 20 é de centilitros
    .replace(/(\d+)[x×](\d)(\d)(lt?)\b/gi, (_, n, a, b, u) => (Number(a + b) > 20 ? `${n}×0,${a}${b} ${u}` : `${n}×${a},${b} ${u}`));
export function medida(s) {
    const t = limpaMedida(s);
    let m = t.match(VEZES);
    if (m) { const [b, f] = MEDIDA[m[3].toLowerCase()]; return { q: n(m[1]) * n(m[2]) * f, ub: b }; }
    m = t.match(UMA);
    if (m && MEDIDA[m[2].toLowerCase()]) { const [b, f] = MEDIDA[m[2].toLowerCase()]; return { q: n(m[1]) * f, ub: b }; }
    return null;
}
// a embalagem como se escreve, igual em todas as cadeias: «6 × 1,5 L», «500 g», «12 un» (null se não se percebe)
export function rotulo(s) {
    const t = limpaMedida(s);
    const u = (x) => ({ kg: 'kg', g: 'g', gr: 'g', l: 'L', lt: 'L', ml: 'ml', cl: 'cl', un: 'un', uni: 'un', unid: 'un', unidades: 'un' })[x.toLowerCase()];
    const v = (x) => String(n(x)).replace('.', ',');
    let m = t.match(VEZES);
    if (m) return `${n(m[1])} × ${v(m[2])} ${u(m[3])}`;
    m = t.match(UMA);
    if (!m || !u(m[2])) return null;
    const x = n(m[1]), un = u(m[2]);
    if (un === 'kg' && x < 1) return `${Math.round(x * 1000)} g`;
    if (un === 'L' && x < 1) return `${Math.round(x * 1000)} ml`;
    return `${v(m[1])} ${un}`;
}
// o preço por quilo, por litro ou por unidade, em cêntimos: { uc, ub } (ou nulos). Usa o que a cadeia mostra; se
// não mostra, a embalagem ou o nome do produto.
export function porUnidade(produto) {
    const preco = cent(produto?.preco);
    const pu = produto?.precoUnidade;
    if (pu && pu.valor != null && MEDIDA[pu.unidade]) {
        const [b, f] = MEDIDA[pu.unidade];
        return { uc: Math.round((pu.valor * 100) / f), ub: b };
    }
    const m = medida(produto?.embalagem) ?? medida(produto?.nome);
    if (preco == null || !m || !(m.q > 0)) return { uc: null, ub: null };
    return { uc: Math.round(preco / m.q), ub: m.ub };
}
// o que se paga e o preço por quilo ou por litro, iguais em todas as cadeias (m: a medida da embalagem):
// - ao balcão (fiambre, queijo fatiado…), ao peso no Pingo Doce («2,49 €/Kg»: aoPeso) e, no Continente, nos
//   produtos de peso variável (carne, fruta), o preço que a cadeia mostra é o do quilo e o «por unidade» é o da porção (≈ preço × peso): paga-se a porção;
// - com a embalagem em peso ou volume, o preço por quilo ou por litro (nunca «por unidade»).
// as peças inteiras do Continente vendidas ao quilo sem o peso no nome (o bacalhau seco inteiro): o preço é o do quilo e
// o «por unidade» é o da peça (34,99 € e «104,97 €/un»: uma peça de ≈ 3 kg). Num produto normal o «por unidade» nunca
// passa o preço; aqui passa (de 1,3 a 12 vezes). Paga-se ≈ a peça e compara-se ao quilo.
export function pecaAoPeso({ cadeia, cent: c, uc, ub, emb }) {
    if (cadeia !== 'continente' || ub !== 'un' || !(c > 0) || !(uc > c * 1.3) || uc > c * 12) return null;
    if (emb && !/^1\s*un/i.test(emb)) return null;
    const kg = Math.round((uc / c) * 100) / 100;
    return { cent: uc, uc: c, ub: 'kg', emb: `≈ ${String(kg).replace('.', ',')} kg`, aq: 1 };
}
export function normaliza({ cadeia, nome, cent: c, uc, ub, m, aoPeso = false }) {
    const pc = (!m || (m.ub === 'un' && m.q === 1)) ? pecaAoPeso({ cadeia, cent: c, uc, ub, emb: null }) : null;
    if (pc) return { cent: pc.cent, uc: pc.uc, ub: pc.ub, emb: pc.emb };
    // vendido ao quilo, sem peso («FIAMBRE … FATIADO NO BALCÃO KG», no Auchan): o preço é o de um quilo
    if (c != null && !m && /\bkg\.?\s*$/i.test(nome ?? '')) return { cent: c, uc: c, ub: 'kg', emb: '1 kg' };
    if (c == null || !m || !(m.q > 0) || m.ub === 'un') return { cent: c, uc, ub };
    const porcao = Math.round(c * m.q);
    if (m.ub === 'kg' && (aoPeso || (m.q < 1 && /balc[aã]o/i.test(nome ?? '')))) return { cent: porcao, uc: c, ub: 'kg' };
    if (m.ub === 'kg' && cadeia === 'continente' && ub === 'un' && m.q >= 0.05 && uc != null && Math.abs(uc - porcao) <= Math.max(2, porcao * 0.03)) {
        return { cent: porcao, uc: c, ub: 'kg' };
    }
    if (ub !== m.ub || uc == null) return { cent: c, uc: Math.round(c / m.q), ub: m.ub };
    return { cent: c, uc, ub };
}
// quanto se espera depois de f pedidos falhados seguidos
const espera = (f) => (f > 0 ? Math.min(24 * HORA, HORA / 2 * 2 ** (f - 1)) : 0);

// precisa de ser lido? (r: a linha da tabela preco, ou null)
export function precisa(r, agora = new Date()) {
    if (!r) return true;
    const t = agora.getTime();
    if (r.tentado && t - Date.parse(r.tentado) < espera(Number(r.falhas) || 0)) return false;
    return !r.visto || t - Date.parse(r.visto) > VALE_H * HORA;
}

// lê o produto p ({id, url}) no site da cadeia: { estado, produto } (produto null se não se conseguiu ler)
export async function lerPreco(cadeia, p, ms) {
    const fonte = FONTES[cadeia];
    const url = fonte.urlProduto ? fonte.urlProduto(p.id) : p.url;
    let r;
    try { r = await pedir(new URL(url), fonte.urlProduto ? 'application/json' : 'text/html,application/xhtml+xml', ms); } catch {
        return { estado: 0, produto: null };
    }
    if (r.status !== 200) { await r.body?.cancel(); return { estado: r.status, produto: null }; }
    let produto = null;
    try { produto = fonte.lerProduto(await r.text(), url); } catch { produto = null; }
    // um preço de 0 € é um produto sem preço (o Pingo Doce mostra-o assim quando não o vende)
    return { estado: 200, produto: produto && produto.preco > 0 ? produto : null };
}

export function guardarPreco(db, cadeia, p, { produto }, agora = new Date()) {
    const quando = agora.toISOString();
    if (!produto) {
        return db.prepare(`INSERT INTO preco (cadeia, id, url, nome, tentado, falhas) VALUES (?, ?, ?, ?, ?, 1)
            ON CONFLICT (cadeia, id) DO UPDATE SET tentado = excluded.tentado, falhas = preco.falhas + 1`)
            .bind(cadeia, p.id, p.url, p.nome ?? null, quando).run();
    }
    const nome = produto.nome ?? p.nome;
    const pu = porUnidade({ ...produto, nome });
    // o que se paga e o preço por quilo ou litro, como no catálogo (normaliza)
    const { cent: c, uc, ub, emb: embKg } = normaliza({ cadeia, nome, cent: cent(produto.preco), uc: pu.uc, ub: pu.ub, m: medida(produto.embalagem) ?? medida(nome) });
    let antes = cent(produto.antes);
    if (antes != null && c != null && c !== cent(produto.preco)) antes = Math.round(antes * c / cent(produto.preco));
    return db.prepare(`INSERT INTO preco (cadeia, id, url, nome, marca, cent, antes, unid, emb, esgotado, ate, visto, tentado, falhas, uc, ub)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
        ON CONFLICT (cadeia, id) DO UPDATE SET url = excluded.url, nome = excluded.nome, marca = excluded.marca,
            cent = excluded.cent, antes = excluded.antes, unid = excluded.unid, emb = excluded.emb, esgotado = excluded.esgotado,
            ate = excluded.ate, visto = excluded.visto, tentado = excluded.tentado, falhas = 0, uc = excluded.uc, ub = excluded.ub`)
        .bind(cadeia, p.id, p.url, (produto.nome ?? p.nome ?? '').slice(0, 160) || null, produto.marca ?? null,
            c, antes != null && antes > c ? antes : null, unid(produto.precoUnidade),
            rotulo(produto.embalagem) ?? produto.embalagem ?? embKg ?? null, produto.disponivel === false ? 1 : 0, produto.ate ?? null, quando, quando, uc, ub)
        .run();
}

// lê e guarda os produtos (cada um { cadeia, id, url, nome }) em paralelo
export async function lerEGuardar(db, produtos, agora = new Date(), ms) {
    const lidos = await Promise.all(produtos.map((p) => lerPreco(p.cadeia, p, ms)));
    await Promise.all(produtos.map((p, i) => guardarPreco(db, p.cadeia, p, lidos[i], agora)));
    return lidos;
}

// os produtos escolhidos numa lista: [{ cadeia, id, url, nome }]
export const produtosDe = (itens) => itens.flatMap((i) => Object.entries(i.p ?? {}).map(([cadeia, p]) => ({ cadeia, ...p })));

// as linhas da tabela preco destes produtos, por «cadeia id»
async function linhas(db, produtos) {
    if (!produtos.length) return new Map();
    const { results } = await db.prepare(`SELECT preco.* FROM preco JOIN json_each(?) j
        ON preco.cadeia = json_extract(j.value, '$[0]') AND preco.id = json_extract(j.value, '$[1]')`)
        .bind(JSON.stringify(produtos.map((p) => [p.cadeia, p.id]))).all();
    return new Map(results.map((r) => [r.cadeia + ' ' + r.id, r]));
}

// a lista com o preço de cada produto escolhido: cent, antes (o riscado), unid, esgotado (1) e visto (o dia)
export async function juntarPrecos(db, lista0, casa = null) {
    // cada coisa com a sua secção (seccoes.js), para a app agrupar a lista
    const lista = { ...lista0, itens: lista0.itens.map((i) => ({ ...i, s: seccao(i) })) };
    const m = await linhas(db, produtosDe(lista.itens));
    const est = await estimativas(db, lista.itens);
    // os talões da casa passam à frente das estimativas (o preço que se pagou na Mercadona e no SPAR)
    const reais = casa ? await reaisDaCasa(db, casa, lista.itens.filter((i) => i.e?.k).map((i) => i.e.k)) : new Map();
    // o stock na zona da casa (zona.js): os esgotados na zona contam como esgotados (ez: «na tua zona»)
    const zona = casa ? new Set((await db.prepare("SELECT cadeia, id FROM zona_stock WHERE casa = ? AND disponivel = 0").bind(casa).all()).results.map((r) => r.cadeia + ' ' + r.id)) : new Set();
    if (!m.size && !est.size && !reais.size && !zona.size) return lista;
    return {
        ...lista,
        itens: lista.itens.map((i) => {
            const e = i.e?.emb ? est.get(i.e.k + '|' + i.e.emb) : null;
            const r = i.e?.k ? reais.get(i.e.k) : null;
            const x = {
                ...i,
                ...(e?.merc != null ? { est: e.merc } : {}),
                ...(e?.spar != null ? { ests: e.spar } : {}),
                ...(r?.mercadona ? { est: r.mercadona.cent, estr: r.mercadona.dia } : {}),
                ...(r?.spar ? { ests: r.spar.cent, estsr: r.spar.dia } : {}),
                p: Object.fromEntries(Object.entries(i.p).map(([c, p]) => {
                    const r = m.get(c + ' ' + p.id);
                    const ez = zona.has(c + ' ' + p.id) ? { esgotado: 1, ez: 1 } : {};
                    if (!r || r.cent == null) return [c, { ...p, ...ez }];
                    const x = { ...p, cent: Number(r.cent) };
                    if (r.antes != null) x.antes = Number(r.antes);
                    if (r.unid) x.unid = r.unid;
                    if (r.esgotado) x.esgotado = 1;
                    Object.assign(x, ez);
                    if (r.visto) x.visto = r.visto.slice(0, 10);
                    if (r.uc != null && r.ub) { x.uc = Number(r.uc); x.ub = r.ub; }
                    if (r.propria) x.pr = 1;
                    if (r.emb) x.emb = r.emb;
                    return [c, x];
                })),
            };
            return comparavel(x);
        }),
    };
}

// embalagens diferentes (7 L num, 6 L noutro): para comparar, o preço de cada cadeia para o mesmo tamanho (cn: o
// preço por unidade × o tamanho de referência, cmp: esse tamanho, o da escolha ou o mais comum). O total que se
// mostra continua a ser o que se paga; o cn só decide qual é o mais barato.
export function comparavel(i) {
    const ps = Object.values(i.p ?? {}).filter((p) => p.cent != null && p.uc != null && p.ub && p.emb);
    const qs = ps.map((p) => medida(p.emb)?.q).filter((q) => q > 0);
    if (ps.length < 2 || new Set(ps.map((p) => p.ub)).size > 1 || new Set(qs).size < 2) return i;
    const ref = medida(i.e?.emb)?.q > 0 ? i.e.emb : (() => { const c = new Map(); for (const p of ps) c.set(p.emb, (c.get(p.emb) ?? 0) + 1); return [...c].sort((a, b) => b[1] - a[1])[0][0]; })();
    const q = medida(ref).q;
    for (const p of ps) p.cn = Math.round(p.uc * q);
    return { ...i, cmp: ref };
}

// os preços dos produtos de uma procura numa cadeia ({ id, url, nome }, já verificados): os que se conhecem e, dos que
// faltam ou estão velhos, lê-se no máximo POR_PEDIDO; [{ id, cent, antes, uc, ub, esgotado }] dos que têm preço
export async function precosDe(db, cadeia, produtos, agora = new Date()) {
    const lista = produtos.map((p) => ({ cadeia, ...p }));
    let m = await linhas(db, lista);
    const ler = lista.filter((p) => precisa(m.get(cadeia + ' ' + p.id), agora)).slice(0, POR_PEDIDO);
    if (ler.length) { await lerEGuardar(db, ler, agora, 6000); m = await linhas(db, lista); }
    return lista.map((p) => m.get(cadeia + ' ' + p.id)).filter((r) => r && r.cent != null).map((r) => {
        const x = { id: r.id, cent: Number(r.cent) };
        if (r.antes != null) x.antes = Number(r.antes);
        if (r.uc != null && r.ub) { x.uc = Number(r.uc); x.ub = r.ub; }
        if (r.esgotado) x.esgotado = 1;
        return x;
    });
}

// lê já os produtos escolhidos agora (nas operações 'p') que ainda não têm preço recente
export async function precosNovos(db, ops, agora = new Date()) {
    const escolhidos = ops.filter((o) => o && o.o === 'p' && o.p && FONTES[o.c]).map((o) => ({ cadeia: o.c, ...o.p }));
    if (!escolhidos.length) return;
    const m = await linhas(db, escolhidos);
    const vistos = new Set();
    const ler = escolhidos.filter((p) => {
        const k = p.cadeia + ' ' + p.id;
        if (vistos.has(k) || !precisa(m.get(k), agora)) return false;
        vistos.add(k);
        return true;
    }).slice(0, POR_PEDIDO);
    if (ler.length) await lerEGuardar(db, ler, agora, 6000);
}

// o cron: os preços velhos (ou que faltam) dos produtos que estão em alguma lista, um por cadeia
export async function refrescar(db, agora = new Date()) {
    const { results } = await db.prepare(`SELECT p.key AS cadeia, json_extract(p.value, '$.id') AS id,
            json_extract(p.value, '$.url') AS url, json_extract(p.value, '$.nome') AS nome, preco.visto, preco.tentado, preco.falhas
        FROM casa, json_each(casa.itens) i, json_each(i.value, '$.p') p
        LEFT JOIN preco ON preco.cadeia = p.key AND preco.id = json_extract(p.value, '$.id')
        WHERE preco.visto IS NULL OR preco.visto < ?
        ORDER BY preco.visto IS NOT NULL, preco.visto LIMIT 200`)
        .bind(new Date(agora.getTime() - VALE_H * HORA).toISOString()).all();
    const porCadeia = new Map();
    for (const r of results) {
        if (!FONTES[r.cadeia] || porCadeia.has(r.cadeia) || !r.id || !r.url || !precisa(r, agora)) continue;
        porCadeia.set(r.cadeia, { cadeia: r.cadeia, id: r.id, url: r.url, nome: r.nome });
    }
    const ler = [...porCadeia.values()].slice(0, POR_CRON);
    const lidos = ler.length ? await lerEGuardar(db, ler, agora) : [];
    return { lidos: ler.length, comPreco: lidos.filter((l) => l.produto).length };
}
