// O histórico do que se compra (16/11/2026): riscar uma coisa na lista guarda-a (migrations/0015_compra.sql) com a loja,
// o produto e o preço desse dia; desriscar no mesmo dia apaga-a. GET /api/gastos dá a semana, o mês, o que se poupou
// (face à loja mais cara de cada coisa), o gasto por loja e o que se compra mais vezes.
import { CADEIAS } from './indice.js';

const NOMES = { continente: 'Continente', pingodoce: 'Pingo Doce', auchan: 'Auchan', lidl: 'Lidl' };

// a linha de uma coisa riscada: na loja c (se a casa disse a que loja vai e há lá o produto), senão na mais barata
export function linhaDaCompra(i, c, agora = new Date()) {
    const ps = Object.entries(i.p ?? {}).filter(([, p]) => p?.cent > 0 && !p.esgotado);
    const mx = ps.length ? Math.max(...ps.map(([, p]) => p.cent)) : null;
    let escolha = c && CADEIAS.includes(c) && i.p?.[c]?.cent > 0 && !i.p[c].esgotado ? [c, i.p[c]] : null;
    const estimada = !escolha;
    if (!escolha && ps.length) escolha = ps.reduce((a, b) => (b[1].cent < a[1].cent ? b : a));
    return { item: i.id, dia: agora.toISOString().slice(0, 10), quando: agora.toISOString(), texto: i.t, tipo: i.e?.k ?? null, q: i.q ?? 1,
        cadeia: escolha?.[0] ?? null, nome: escolha?.[1].nome ?? null, cent: escolha?.[1].cent ?? null, mx, estimada: estimada ? 1 : 0 };
}

// as operações «r» (riscar) de um pedido à lista: guardar as riscadas, apagar as desriscadas hoje
export async function registarCompras(db, casa, lista, agora = new Date()) {
    // só as que mudaram (casa.js marca-as em lista.riscou): reenviar o mesmo pedido não grava outra vez
    const rs = lista.riscou ?? [];
    if (!rs.length) return 0;
    const dia = agora.toISOString().slice(0, 10);
    const fs = [];
    for (const o of rs) {
        const i = lista.itens.find((x) => x.id === o.id);
        if (o.f && i) {
            const l = linhaDaCompra(i, o.c, agora);
            fs.push(db.prepare(`INSERT OR REPLACE INTO compra (casa, item, dia, quando, texto, tipo, q, cadeia, nome, cent, mx, estimada)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(casa, l.item, l.dia, l.quando, l.texto, l.tipo, l.q, l.cadeia, l.nome, l.cent, l.mx, l.estimada));
        } else if (!o.f) fs.push(db.prepare('DELETE FROM compra WHERE casa = ? AND item = ? AND dia = ?').bind(casa, String(o.id), dia));
    }
    if (fs.length) await db.batch(fs);
    return fs.length;
}

// os gastos da casa: { semana, mes, poupado_mes, coisas_mes, lojas: [{ c, nome, cent }], mais: [{ t, vezes }], ultimas }
export async function gastos(db, casa, agora = new Date()) {
    const d = (n) => new Date(agora.getTime() - n * 24 * 3600e3).toISOString().slice(0, 10);
    const { results } = await db.prepare('SELECT dia, texto, tipo, q, cadeia, nome, cent, mx, estimada FROM compra WHERE casa = ? AND dia >= ? ORDER BY quando DESC')
        .bind(casa, d(90)).all();
    const total = (l) => l.reduce((a, x) => a + (x.cent ?? 0) * (x.q ?? 1), 0);
    const semana = results.filter((x) => x.dia >= d(6)), mes = results.filter((x) => x.dia >= d(29));
    const lojas = new Map();
    for (const x of mes) if (x.cadeia) lojas.set(x.cadeia, (lojas.get(x.cadeia) ?? 0) + (x.cent ?? 0) * (x.q ?? 1));
    const vezes = new Map();
    for (const x of results) { const k = x.tipo ?? x.texto.toLowerCase(); const v = vezes.get(k) ?? { t: x.texto, vezes: 0 }; v.vezes++; vezes.set(k, v); }
    return {
        semana: total(semana), mes: total(mes), coisas_mes: mes.length,
        poupado_mes: mes.reduce((a, x) => a + (x.mx != null && x.cent != null ? (x.mx - x.cent) * (x.q ?? 1) : 0), 0),
        estimadas: mes.filter((x) => x.estimada).length,
        lojas: [...lojas].sort((a, b) => b[1] - a[1]).map(([c, cent]) => ({ c, nome: NOMES[c] ?? c, cent })),
        mais: [...vezes.values()].filter((v) => v.vezes > 1).sort((a, b) => b.vezes - a.vezes).slice(0, 5),
        ultimas: results.slice(0, 8).map((x) => ({ dia: x.dia, t: x.texto, ...(x.cadeia ? { c: NOMES[x.cadeia] ?? x.cadeia } : {}), ...(x.cent != null ? { cent: x.cent * (x.q ?? 1) } : {}) })),
    };
}
