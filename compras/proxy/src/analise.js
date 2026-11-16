// Os dados da análise (volta 15): tudo o que o Claude precisa para dizer como fazer as compras da semana — a casa (as
// pessoas, a zona, as lojas que tem perto), a lista com o que escreveste na pesquisa (e.q), os filtros que escolheste
// (e.f), se escolheste o produto à mão (e.mao) ou se a app o juntou sozinha (e.au), a quantidade, o produto de cada
// cadeia com o preço e a variação recente (o histórico), os totais por cadeia, as lojas online de cada tipo (com os
// portes) e as promoções do folheto do Lidl que estão a decorrer. GET /api/analise (a casa) e /sonda/analise (o Ecónomo).
import { casaDe, lerLista } from './casa.js';
import { juntarPrecos } from './precos.js';
import { PORTES } from './sugerir.js';

const NOMES = { continente: 'Continente', pingodoce: 'Pingo Doce', auchan: 'Auchan', lidl: 'Lidl' };
const FILTROS = [['far', 'fa'], ['fpr', 'fp'], ['fcr', 'fc'], ['fwr', 'fw'], ['fnr', 'fn'], ['fer', 'fes']];

// os filtros escolhidos, legíveis («Islândia», «Especial», «1 kg»)
export function filtrosLegiveis(f) {
    if (!f) return [];
    return FILTROS.map(([r, w]) => f[r] ?? f[w]).filter(Boolean).map((s) => String(s).replace(/^\||\|$/g, '').replace(/\|/g, ' + '));
}
// como o produto ficou escolhido: «à mão» (tocaste nele), «automática» (juntado logo, o mais barato), «pela app» (o mais
// barato, quando juntaste o tipo), ou «só texto» (sem tipo: a app não sabe o que é)
export const comoEscolhido = (i) => (!i.e?.k ? 'só texto' : i.e.mao ? 'à mão' : i.e.au ? 'automática' : 'pela app');

// a variação de preço de cada produto escolhido: Map «cadeia id» → { de, para, quando } (a última mudança, 30 dias)
async function variacoes(db, produtos, desde) {
    if (!produtos.length) return new Map();
    const { results } = await db.prepare(`SELECT h.cadeia, h.id, h.cent, h.quando FROM preco_historico h
        JOIN json_each(?1) j ON h.cadeia = json_extract(j.value, '$[0]') AND h.id = json_extract(j.value, '$[1]')
        ORDER BY h.cadeia, h.id, h.quando`).bind(JSON.stringify(produtos)).all();
    const por = new Map();
    for (const h of results) { const k = `${h.cadeia} ${h.id}`; (por.get(k) ?? por.set(k, []).get(k)).push(h); }
    const r = new Map();
    for (const [k, hs] of por) {
        if (hs.length < 2) continue;
        const a = hs[hs.length - 2], b = hs[hs.length - 1];
        if (b.quando >= desde && a.cent > 0 && a.cent !== b.cent) r.set(k, { de: a.cent, para: b.cent, quando: b.quando.slice(0, 10) });
    }
    return r;
}

export async function dadosDaAnalise(db, ap, agora = new Date()) {
    const casa = await casaDe(db, ap);
    const lista = await juntarPrecos(db, await lerLista(db, ap.casa), ap.casa);
    const itens = lista.itens.filter((i) => !i.f);
    const desde = new Date(agora.getTime() - 30 * 24 * 3600e3).toISOString();
    const escolhidos = itens.flatMap((i) => Object.entries(i.p ?? {}).map(([c, p]) => [c, p.id]));
    const vars = await variacoes(db, escolhidos, desde);
    const ks = [...new Set(itens.map((i) => i.e?.k).filter(Boolean))].slice(0, 40);
    const hoje = agora.toISOString().slice(0, 10);
    const [online, promos] = ks.length ? await Promise.all([
        db.prepare(`SELECT loja, nome, variante, cent, emb, uc, ub, tipo, vivino, url FROM produtor_artigo
            WHERE disponivel = 1 AND tipo IN (SELECT value FROM json_each(?1))`).bind(JSON.stringify(ks)).all(),
        db.prepare(`SELECT nome, cent, antes, emb, uc, ub, tipo, ate FROM preco WHERE cadeia = 'lidl' AND id LIKE 'f%' AND (ate IS NULL OR ate >= ?2)
            AND tipo IN (SELECT value FROM json_each(?1))`).bind(JSON.stringify(ks), hoje).all(),
    ]) : [{ results: [] }, { results: [] }];
    // as lojas online de cada tipo: as 3 mais baratas por unidade (no vinho, as de melhor Vivino), com os portes
    const onlinePor = new Map();
    for (const a of online.results ?? []) (onlinePor.get(a.tipo) ?? onlinePor.set(a.tipo, []).get(a.tipo)).push(a);
    for (const [k, as] of onlinePor) {
        as.sort((x, y) => (y.vivino ?? 0) - (x.vivino ?? 0) || (x.uc ?? x.cent) - (y.uc ?? y.cent));
        onlinePor.set(k, as.slice(0, 3).map((a) => ({ loja: a.loja, nome: a.variante ? `${a.nome} (${a.variante})` : a.nome, cent: a.cent,
            ...(a.uc ? { uc: a.uc, ub: a.ub } : {}), ...(a.vivino ? { vivino: a.vivino } : {}),
            portes: PORTES[a.loja] ? (a.cent >= PORTES[a.loja].gratis ? 0 : PORTES[a.loja].cent) : null, url: a.url })));
    }
    const promosPor = new Map();
    for (const p of promos.results ?? []) (promosPor.get(p.tipo) ?? promosPor.set(p.tipo, []).get(p.tipo)).push({ nome: p.nome, cent: p.cent, ...(p.antes ? { antes: p.antes } : {}), ...(p.uc ? { uc: p.uc, ub: p.ub } : {}), ate: p.ate });
    // os totais de cada cadeia: o que custa a lista lá (os produtos escolhidos × a quantidade) e quantas coisas tem
    const totais = {};
    const saida = itens.map((i) => {
        const p = {};
        for (const [c, x] of Object.entries(i.p ?? {})) {
            if (x.cent == null) continue;
            const v = vars.get(`${c} ${x.id}`);
            p[c] = { nome: x.nome, cent: x.cent, ...(x.uc ? { uc: x.uc, ub: x.ub } : {}), ...(x.antes ? { antes: x.antes } : {}), ...(x.esgotado ? { esgotado: 1 } : {}),
                ...(x.pr ? { marca_branca: 1 } : {}), ...(v ? { mudou: v } : {}) };
            if (!x.esgotado) { const t = totais[c] ?? (totais[c] = { cent: 0, coisas: 0 }); t.cent += x.cent * (i.q ?? 1); t.coisas++; }
        }
        return {
            texto: i.t, quantidade: i.q ?? 1, tipo: i.e?.k ?? null, ...(i.e?.n ? { tipo_nome: i.e.n } : {}),
            ...(i.e?.q ? { pesquisa: i.e.q } : {}), filtros: filtrosLegiveis(i.e?.f), escolha: comoEscolhido(i),
            ...(i.e?.emb ? { tamanho: i.e.emb } : {}), ...(i.e?.m ? { marca: i.e.m } : {}),
            produtos: p, ...(i.est != null ? { mercadona_estimativa: i.est } : {}), ...(i.ests != null ? { spar_estimativa: i.ests } : {}),
            ...(i.e?.k && onlinePor.get(i.e.k)?.length ? { online: onlinePor.get(i.e.k) } : {}),
            ...(i.e?.k && promosPor.get(i.e.k)?.length ? { lidl_folheto: promosPor.get(i.e.k).slice(0, 4) } : {}),
        };
    });
    return {
        quando: agora.toISOString(),
        casa: { pessoas: casa.pessoas ?? null, local: casa.local ?? null, cp: casa.cp ?? null, zona: casa.zona ?? null, lojas: casa.lojas ?? null },
        itens: saida,
        totais: Object.fromEntries(Object.entries(totais).map(([c, t]) => [c, { nome: NOMES[c] ?? c, ...t }])),
        coisas: saida.length,
        notas: 'Preços em cêntimos; uc é o preço por unidade (ub: kg, l, un). «escolha»: à mão (o utilizador escolheu o produto), automática ou pela app (o mais barato quando juntou). «pesquisa» é o que escreveu; «filtros» o que escolheu. As lojas online têm portes (null: vê-se no checkout).',
    };
}
