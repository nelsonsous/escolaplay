// O que costumas comprar (volta 6): dos talões da casa (dos últimos 120 dias) tira-se o que se compra e de quanto em
// quanto tempo, e sugere-se o que já devia estar a acabar e ainda não está na lista. Com um só talão de uma coisa não há
// ritmo: entra como «costumas comprar» (depois das que estão a acabar).
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
export function costume(taloes, itens, agora = new Date()) {
    const g = new Map();
    for (const tl of taloes) {
        const quando = Date.parse(tl.dia ? tl.dia + 'T12:00:00Z' : tl.criado);
        for (const l of tl.linhas) {
            if (!(l.cent > 0)) continue; // descontos
            const k = chave(l.t);
            if (!k) continue;
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
    return costume(results.map((r) => ({ ...r, linhas: JSON.parse(r.linhas) })), lista.itens, agora);
}
