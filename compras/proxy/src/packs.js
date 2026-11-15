// A melhor forma de comprar a quantidade (ciclo 3, volta 3). Para uma coisa da lista com tamanho e quantidade («6 × leite
// 1 L»: 6 litros), em cada cadeia, a combinação mais barata das embalagens do mesmo tipo (e da mesma marca e
// variante, se escolhidas) que dá a quantidade: 6 soltos, 1 pack de 6, 2 packs de 3, 1 de 4 e 2 soltos. Não se
// compra muito mais do que se pediu (no máximo +25%), nem mais de 24 embalagens.
import { medida } from './precos.js';
import { temPalavras } from './escolhas.js';

const MAX_N = 24, FOLGA = 1.25;

// ops: [{ id, nome, url, cent, q }] (q: quanto tem a embalagem, na unidade); alvo: a quantidade pedida.
// { cent, q, itens: [{ id, nome, url, cent, q, n }] } ou null
export function melhorCombinacao(ops, alvo) {
    const boas = ops.filter((o) => o.cent > 0 && o.q > 0);
    let melhor = null;
    const ver = (partes) => {
        const q = partes.reduce((s, [o, n]) => s + o.q * n, 0), cent = partes.reduce((s, [o, n]) => s + o.cent * n, 0);
        const n = partes.reduce((s, [, k]) => s + k, 0);
        if (q < alvo - 1e-9 || q > alvo * FOLGA + 1e-9 || n > MAX_N) return;
        if (!melhor || cent < melhor.cent || (cent === melhor.cent && n < melhor.n)) melhor = { cent, q, n, partes };
    };
    for (const a of boas) {
        ver([[a, Math.ceil(alvo / a.q - 1e-9)]]);
        // uma embalagem grande (ou várias) e o resto em pequenas
        for (const b of boas) {
            if (b === a || b.q >= a.q) continue;
            for (let na = 1; na * a.q < alvo && na <= MAX_N; na++) ver([[a, na], [b, Math.ceil((alvo - na * a.q) / b.q - 1e-9)]]);
        }
    }
    if (!melhor) return null;
    return { cent: melhor.cent, q: Math.round(melhor.q * 1000) / 1000, itens: melhor.partes.filter(([, n]) => n > 0).map(([o, n]) => ({ id: o.id, nome: o.nome, url: o.url, cent: o.cent, q: o.q, n })) };
}

// para as coisas da lista com tipo, tamanho e quantidade 2 ou mais: { id da coisa: { cadeia: { cent, poupa, como, itens } } },
// só quando a combinação poupa (pelo menos 2% e 5 cêntimos) em relação a comprar a quantidade do produto escolhido
export async function packsDaLista(db, itens, agora = new Date()) {
    const alvo = (i) => (i.e?.k && i.e.emb && i.q >= 2 && !i.f ? (medida(i.e.emb)?.q ?? 0) * i.q : 0);
    const com = itens.filter((i) => alvo(i) > 0);
    if (!com.length) return {};
    const tipos = [...new Set(com.map((i) => i.e.k))];
    const desde = new Date(agora.getTime() - 10 * 24 * 3600e3).toISOString();
    const { results } = await db.prepare(`SELECT cadeia, id, nome, url, cent, q, ub, marca, propria, tipo FROM preco
        WHERE tipo IN (SELECT value FROM json_each(?1)) AND cent IS NOT NULL AND suspeito IS NULL AND visto > ?2 AND q > 0`)
        .bind(JSON.stringify(tipos), desde).all();
    const out = {};
    for (const i of com) {
        const m = medida(i.e.emb), w = i.e.w ? String(i.e.w).split(' ').filter(Boolean).map((x) => ` ${x} `) : null;
        for (const [c, p] of Object.entries(i.p ?? {})) {
            if (!p?.id) continue;
            const ops = results.filter((r) => r.cadeia === c && r.tipo === i.e.k && r.ub === m.ub
                && (!i.e.m || (i.e.m === 'branca' ? r.propria : String(r.marca ?? '').toLowerCase() === String(i.e.m).toLowerCase()))
                && (!w || temPalavras(w, r.nome, i.e.k, r.cent)))
                .map((r) => ({ id: r.id, nome: r.nome, url: r.url, cent: Number(r.cent), q: Number(r.q) }));
            const atual = ops.find((o) => o.id === String(p.id)) ?? results.find((r) => r.cadeia === c && r.id === String(p.id));
            if (!atual || !(atual.q > 0)) continue;
            const soltos = Math.ceil(alvo(i) / atual.q - 1e-9) * Number(atual.cent);
            const b = melhorCombinacao(ops, alvo(i));
            if (!b || soltos - b.cent < Math.max(5, soltos * 0.02)) continue;
            if (b.itens.length === 1 && b.itens[0].id === String(p.id)) continue;
            (out[i.id] ??= {})[c] = { cent: b.cent, poupa: soltos - b.cent, como: b.itens.map((x) => `${x.n} × ${x.nome}`).join(' + '), itens: b.itens };
        }
    }
    return out;
}
