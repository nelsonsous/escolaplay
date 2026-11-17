// «🔥 Promoções da semana para ti» (17/11/2026): as promoções dos tipos que a casa compra — os da lista, os do histórico
// do que se riscou (compra) e os das linhas dos talões —, nas cadeias da casa: o preço riscado (antes > cent) ou o rótulo
// «Promoção» (promo = 1), e o folheto do Lidl. As maiores descidas primeiro, duas por tipo, oito ao todo. GET /api/promos;
// guardado 3 h por casa na KV (cada pedido lê os produtos dos tipos da casa).
import { lerLista } from './casa.js';
import { tipoDaLinha } from './sugerir.js';

const NOMES = { continente: 'Continente', pingodoce: 'Pingo Doce', auchan: 'Auchan', lidl: 'Lidl' };
const DIA = 86400e3;
// a semana (segunda a domingo) como «2026-W47»: o cartão fechado volta na semana seguinte
export function semanaDe(d) {
    const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const dia = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - dia);
    const ini = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return `${t.getUTCFullYear()}-W${String(Math.ceil(((t - ini) / DIA + 1) / 7)).padStart(2, '0')}`;
}

// os tipos que a casa compra: a lista, o histórico (90 dias) e as linhas dos talões (60 dias)
async function tiposDaCasa(db, casa, agora) {
    const ks = new Set();
    for (const i of (await lerLista(db, casa)).itens) if (i.e?.k) ks.add(i.e.k);
    const { results: cs } = await db.prepare('SELECT DISTINCT tipo FROM compra WHERE casa = ? AND tipo IS NOT NULL AND dia >= ?')
        .bind(casa, new Date(agora - 90 * DIA).toISOString().slice(0, 10)).all();
    for (const c of cs) ks.add(c.tipo);
    const { results: ts } = await db.prepare('SELECT linhas FROM talao WHERE casa = ? AND criado >= ? ORDER BY criado DESC LIMIT 10')
        .bind(casa, new Date(agora - 60 * DIA).toISOString()).all();
    for (const t of ts) for (const l of JSON.parse(t.linhas)) {
        if (!(l.cent > 0) || ks.size >= 40) continue;
        const x = await tipoDaLinha(db, l.t).catch(() => null);
        if (x) ks.add(x.k);
    }
    return [...ks].slice(0, 40);
}

export async function promosDaCasa(db, kv, casa, agora = new Date()) {
    // a chave leva os tipos da lista: juntar um tipo novo refaz o cartão logo, e não daqui a 3 h
    const daLista = [...new Set((await lerLista(db, casa)).itens.map((i) => i.e?.k).filter(Boolean))].sort().join(',');
    let h = 5381; for (const ch of daLista) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0;
    const chave = `promos:${casa}:${h.toString(36)}`;
    const guardado = kv ? await kv.get(chave, 'json').catch(() => null) : null;
    if (guardado && agora - Date.parse(guardado.quando) < 3 * 3600e3) return guardado.r;
    const semana = semanaDe(agora);
    const ks = await tiposDaCasa(db, casa, agora);
    let promos = [];
    if (ks.length) {
        const c = await db.prepare('SELECT lojas FROM casa WHERE id = ?').bind(casa).first();
        const minhas = c?.lojas ? JSON.parse(c.lojas).cadeias : null;
        const cadeias = Object.keys(NOMES).filter((x) => !minhas || minhas.includes(x));
        const hoje = agora.toISOString().slice(0, 10);
        const { results } = await db.prepare(`SELECT p.cadeia, p.id, p.nome, p.url, p.cent, p.antes, p.promo, p.emb, p.ate, p.tipo, t.nome AS tn FROM preco p
            JOIN tipo t ON t.k = p.tipo
            WHERE p.tipo IN (SELECT value FROM json_each(?1)) AND p.cadeia IN (SELECT value FROM json_each(?2))
              AND p.cent > 0 AND p.suspeito IS NULL AND p.visto > ?3 AND (p.antes > p.cent OR p.promo = 1)
              AND (p.ate IS NULL OR p.ate >= ?4)`).bind(JSON.stringify(ks), JSON.stringify(cadeias), new Date(agora - 4 * DIA).toISOString(), hoje).all();
        const pct = (p) => (p.antes > p.cent ? Math.round(((p.antes - p.cent) / p.antes) * 100) : 0);
        // as maiores descidas primeiro (o rótulo sem preço riscado no fim); três por tipo, trinta ao todo (a app mostra
        // três e, em «Ver mais», todas com os filtros por loja e por produto)
        const porTipo = new Map();
        for (const p of results.sort((a, b) => pct(b) - pct(a) || a.cent - b.cent)) {
            const n = porTipo.get(p.tipo) ?? 0;
            if (n >= 3 || promos.length >= 30) continue;
            porTipo.set(p.tipo, n + 1);
            promos.push({ k: p.tipo, tn: p.tn, c: p.cadeia, cn: NOMES[p.cadeia], id: p.id, nome: p.nome, url: p.url, cent: p.cent,
                ...(p.antes > p.cent ? { antes: p.antes, pct: pct(p) } : {}), ...(p.emb ? { emb: p.emb } : {}), ...(p.ate ? { ate: `${p.ate.slice(8, 10)}/${p.ate.slice(5, 7)}` } : {}) });
        }
    }
    // os filtros: as lojas e os produtos (tipos) que há nestas promoções, com quantas cada um, os de mais primeiro
    const conta = (chave, nome) => [...promos.reduce((m, p) => m.set(p[chave], { [chave]: p[chave], [nome]: p[nome], n: (m.get(p[chave])?.n ?? 0) + 1 }), new Map()).values()]
        .sort((a, b) => b.n - a.n || String(a[nome]).localeCompare(String(b[nome]), 'pt'));
    const r = { semana, promos, lojas: conta('c', 'cn'), tipos: conta('k', 'tn') };
    if (kv) await kv.put(chave, JSON.stringify({ quando: agora.toISOString(), r }), { expirationTtl: 4 * 3600 }).catch(() => {});
    return r;
}
