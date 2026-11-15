// Os preços (volta 3). O conector lê o preço de cada produto escolhido numa lista no site da cadeia (com as fontes
// da volta 1) e guarda-o na D1 (a tabela preco). Lê-se:
//   - logo, quando se escolhe um produto (no pedido que muda a lista; no máximo POR_PEDIDO de cada vez);
//   - de dez em dez minutos, pelo cron do Worker: os preços com mais de VALE_H horas dos produtos que estão em alguma
//     lista, no máximo um por cadeia de cada vez (cada site recebe no máximo um pedido a cada dez minutos).
// Um pedido que falha espera antes de se repetir (meia hora, uma hora, duas… até um dia).
// A lista vai para a app com o preço ao lado de cada produto escolhido (juntarPrecos): em cêntimos.
import { FONTES } from './fontes/index.js';
import { pedir } from './rede.js';

export const VALE_H = 20, POR_PEDIDO = 2, POR_CRON = 4;
const HORA = 3600e3;

const cent = (v) => (v == null || !Number.isFinite(Number(v)) ? null : Math.round(Number(v) * 100));
const unid = (u) => (u && u.valor != null ? `${u.valor.toFixed(2).replace('.', ',')} €/${u.unidade}` : null);
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
    return { estado: 200, produto: produto && produto.preco != null ? produto : null };
}

export function guardarPreco(db, cadeia, p, { produto }, agora = new Date()) {
    const quando = agora.toISOString();
    if (!produto) {
        return db.prepare(`INSERT INTO preco (cadeia, id, url, nome, tentado, falhas) VALUES (?, ?, ?, ?, ?, 1)
            ON CONFLICT (cadeia, id) DO UPDATE SET tentado = excluded.tentado, falhas = preco.falhas + 1`)
            .bind(cadeia, p.id, p.url, p.nome ?? null, quando).run();
    }
    const antes = cent(produto.antes);
    return db.prepare(`INSERT INTO preco (cadeia, id, url, nome, marca, cent, antes, unid, emb, esgotado, ate, visto, tentado, falhas)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        ON CONFLICT (cadeia, id) DO UPDATE SET url = excluded.url, nome = excluded.nome, marca = excluded.marca,
            cent = excluded.cent, antes = excluded.antes, unid = excluded.unid, emb = excluded.emb, esgotado = excluded.esgotado,
            ate = excluded.ate, visto = excluded.visto, tentado = excluded.tentado, falhas = 0`)
        .bind(cadeia, p.id, p.url, (produto.nome ?? p.nome ?? '').slice(0, 160) || null, produto.marca ?? null,
            cent(produto.preco), antes != null && antes > cent(produto.preco) ? antes : null, unid(produto.precoUnidade),
            produto.embalagem ?? null, produto.disponivel === false ? 1 : 0, produto.ate ?? null, quando, quando)
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
export async function juntarPrecos(db, lista) {
    const m = await linhas(db, produtosDe(lista.itens));
    if (!m.size) return lista;
    return {
        ...lista,
        itens: lista.itens.map((i) => ({
            ...i,
            p: Object.fromEntries(Object.entries(i.p).map(([c, p]) => {
                const r = m.get(c + ' ' + p.id);
                if (!r || r.cent == null) return [c, p];
                const x = { ...p, cent: Number(r.cent) };
                if (r.antes != null) x.antes = Number(r.antes);
                if (r.unid) x.unid = r.unid;
                if (r.esgotado) x.esgotado = 1;
                if (r.visto) x.visto = r.visto.slice(0, 10);
                return [c, x];
            })),
        })),
    };
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
