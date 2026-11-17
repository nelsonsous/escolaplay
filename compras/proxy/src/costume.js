// O que costumas comprar (volta 6): dos talões da casa (dos últimos 120 dias) tira-se o que se compra e de quanto em
// quanto tempo, e sugere-se o que já devia estar a acabar e ainda não está na lista. Com um só talão de uma coisa não há
// ritmo: entra como «costumas comprar» (depois das que estão a acabar).
import { NAO_ARTIGO, limpaLinha } from './talao.js';
import { tiposDoTexto } from './sugerir.js';

const DIA = 86400e3;
const sem = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
// o texto de uma linha sem a conta («6 X 0,95»), os códigos e os pesos soltos
export function limpa(t) {
    return String(t ?? '').replace(/\s+\d+([.,]\d+)?\s*[xX×]\s*\d+([.,]\d+)?\s*$/, '').replace(/\s+/g, ' ').trim();
}
// a chave de uma coisa: as palavras com letras (sem números nem tamanhos)
export const chave = (t) => sem(limpa(t)).split(/[^a-z]+/).filter((w) => w.length > 2 && !/^(kg|gr|lt|cl|ml|un)$/.test(w)).join(' ');
const bonito = (t) => { const s = limpa(t).toLowerCase(); return s ? s[0].toUpperCase() + s.slice(1) : s; };

// talões: [{ dia, criado, linhas: [{ t, cent }] }]; itens: a lista; agora: Date → [{ t, k, vezes, ha, cada, falta }]
export function costume(taloes, itens, agora = new Date(), esquecidos = new Set()) {
    const g = new Map();
    for (const tl of taloes) {
        const quando = Date.parse(tl.dia ? tl.dia + 'T12:00:00Z' : tl.criado);
        // os totais e o pagamento não são artigos; uma linha que junta duas outras do mesmo talão (o modelo às vezes junta) sai
        const ls = tl.linhas.filter((l) => l.cent > 0 && !NAO_ARTIGO.test(String(l.t))).map((l) => ({ ...l, t: limpaLinha(l.t) }));
        const ks = ls.map((l) => chave(l.t));
        for (const [j, l] of ls.entries()) {
            const k = ks[j];
            if (!k || esquecidos.has(k)) continue;
            const ws = k.split(' ');
            // (todas as palavras dela estão em duas ou mais outras linhas do talão: «mini pizza cheddar pao chourico»)
            const outras = ks.filter((o, m) => m !== j && o && o !== k && o.split(' ').some((w) => ws.includes(w)));
            if (outras.length >= 2 && ws.every((w) => outras.some((o) => o.split(' ').includes(w)))) continue;
            if (!g.has(k)) g.set(k, { k, t: bonito(l.t), dias: new Set() });
            g.get(k).dias.add(Math.floor(quando / DIA));
        }
    }
    const naLista = itens.filter((i) => !i.f).map((i) => chave(i.t).split(' ').filter(Boolean));
    const hoje = Math.floor(agora.getTime() / DIA);
    const out = [];
    for (const x of g.values()) {
        const ws = x.k.split(' ');
        // já está na lista (as palavras da coisa da lista estão na do talão)
        if (naLista.some((w) => w.length && w.every((p) => ws.some((q) => q.startsWith(p.slice(0, 5)))))) continue;
        const ds = [...x.dias].sort((a, b) => a - b);
        const ha = hoje - ds[ds.length - 1];
        const cada = ds.length > 1 ? Math.round((ds[ds.length - 1] - ds[0]) / (ds.length - 1)) : null;
        out.push({ t: x.t, k: x.k, vezes: ds.length, ha, cada, falta: cada != null && ha >= Math.max(1, Math.round(cada * 0.9)) ? 1 : 0 });
    }
    return out.sort((a, b) => b.falta - a.falta || b.vezes - a.vezes || a.ha - b.ha).slice(0, 12);
}

export async function sugestoes(db, ap, lista, agora = new Date()) {
    const desde = new Date(agora.getTime() - 120 * DIA).toISOString();
    const { results } = await db.prepare('SELECT dia, criado, linhas FROM talao WHERE casa = ? AND criado > ? ORDER BY criado').bind(ap.casa, desde).all();
    const c = await db.prepare('SELECT esquecidos FROM casa WHERE id = ?').bind(ap.casa).first();
    const coisas = costume(results.map((r) => ({ ...r, linhas: JSON.parse(r.linhas) })), lista.itens, agora, new Set(JSON.parse(c?.esquecidos || '[]')));
    // o tipo de cada coisa (para comparar nos supermercados): pelas palavras, sem as das lojas e das quantidades
    for (const x of coisas) {
        const q = x.k.split(' ').filter((w) => !LOJAS_PALAVRAS.has(w) && w.length > 2).join(' ');
        // (guardado 6 h por chave: cada procura lê os nomes dos produtos dos tipos candidatos)
        let r = TIPO_DA_CHAVE.get(q);
        if (!r || Date.now() - r.quando > 6 * 3600e3) { r = { quando: Date.now(), t: q ? (await tiposDoTexto(db, q).catch(() => []))[0] ?? null : null }; TIPO_DA_CHAVE.set(q, r); }
        if (r.t) { x.tk = r.t.k; x.tn = r.t.nome; if (r.t.w) x.tw = r.t.w; }
    }
    return coisas;
}
const TIPO_DA_CHAVE = new Map();
// as palavras das lojas e das unidades, que não dizem o que é («Água SPAR Nascente 6 lt»)
const LOJAS_PALAVRAS = new Set(['spar', 'continente', 'auchan', 'pingo', 'doce', 'lidl', 'mercadona', 'minipreco', 'intermarche', 'aldi', 'und', 'uni', 'unid']);

// tirar uma sugestão (✕): a chave fica nos esquecidos da casa e não volta
export async function esquecer(db, ap, k) {
    const c = await db.prepare('SELECT esquecidos FROM casa WHERE id = ?').bind(ap.casa).first();
    const es = new Set(JSON.parse(c?.esquecidos || '[]'));
    if (typeof k === 'string' && k.length <= 120) es.add(k);
    await db.prepare('UPDATE casa SET esquecidos = ? WHERE id = ?').bind(JSON.stringify([...es].slice(-200)), ap.casa).run();
    return { ok: 1 };
}
