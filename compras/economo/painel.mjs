// Os dados do painel «Preços da semana» (um artefacto Data no claude.ai): três ficheiros JSON { rows, meta } tirados da D1,
// que se anexam ao painel (upload_asset) e se refazem quando se quiser (a tarefa semanal pode fazê-lo):
//   cabaz.json     o mais barato por unidade (kg, l, un) de cada básico em cada cadeia, com a quantidade de referência
//   mudancas.json  os preços que mudaram nos últimos 7 dias (preco_historico): de, para, a %
//   vinhos.json    os vinhos com nota dos críticos (87 ou mais), o mais barato de cada um, em garrafa de 75 cl
//   NODE_USE_ENV_PROXY=1 node economo/painel.mjs <pasta>
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { d1 } from './comum.mjs';
import { prepararNotas, notaDoProduto } from '../proxy/src/notas.js';

const CADEIAS = { continente: 'Continente', pingodoce: 'Pingo Doce', auchan: 'Auchan', lidl: 'Lidl' };
// o cabaz de referência de uma semana: o tipo, a quantidade, a unidade em que se compara e o que conta como esse básico
// (o mesmo produto em todas as cadeias: ovos de galinha e não de codorniz, bacalhau seco e não caras nem paloco)
const sem = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const CABAZ = [
    ['leite', 6, 'l', /meio[ -]?gordo/, /chocolate|achocolatad|sem lactose|bebida|soja|aveia/],
    ['ovos', 12, 'un', /ovos/, /codorniz|cozid|liquid|clara|pascoa|chocolate/],
    ['pao-de-forma', 0.5, 'kg', /pao de forma/, /integral|sem gluten|cereais|brioche|sem codea/],
    ['manteiga', 0.25, 'kg', /manteiga/, /creme|vegetal|magra|light|amendoim|alho|ervas|-50/],
    ['iogurtes', 1, 'kg', /iogurte natural/, /grego|bifidus|magro|proteic|aroma|liquido/],
    ['arroz', 1, 'kg', /arroz carolino/, /integral|vaporiz|cozinhado|pronto/],
    ['massa', 1, 'kg', /esparguete/, /integral|sem gluten|fresca|ovo/],
    ['acucar', 1, 'kg', /acucar branco/, /amarelo|mascavado|gelo|acucarado|sticks|pacotes|doses/],
    ['azeite', 0.75, 'l', /virgem extra/, /aromatiz|spray|trufa|alho/],
    ['cafe-moido', 0.25, 'kg', /moid|moagem/, /descafeinad|capsula|soluvel/],
    ['frango', 1.5, 'kg', /frango inteiro/, /assado|campo|biologic|pato/],
    ['bacalhau', 1, 'kg', /bacalhau/, /caldeirada|caras|rabos?|barrigas?|cabeca|desfiad|paloco|lascas|migas|ultracongel|congelad|demolhad|pasteis|natas|posta|lombo|badana|aparas|bras/],
    ['fiambre', 0.2, 'kg', /fiambre/, /peru|frango|light|sem sal/],
    ['agua-sem-gas', 6, 'l', /agua/, /com gas|gaseific|sabor|aromatiz|tonica|coco|limao/],
];

// os preços em euros (a página mostra-os assim, e cada número tem de bater com a fonte)
const eur = (c) => Math.round(Number(c)) / 100;
const codigo = (f) => ({ label: path.basename(f), value: readFileSync(new URL(import.meta.url), 'utf8'), type: 'code', lang: 'javascript' });

async function main(pasta) {
    mkdirSync(pasta, { recursive: true });
    const agora = new Date();
    const recente = new Date(agora.getTime() - 10 * 24 * 3600e3).toISOString();
    const ks = CABAZ.map(([k]) => k);
    const nomes = Object.fromEntries((await d1(`SELECT k, nome FROM tipo WHERE k IN (${ks.map(() => '?').join(', ')})`, ks)).map((t) => [t.k, t.nome]));
    // o mais barato por unidade de cada básico em cada cadeia: só os que contam como esse básico (o filtro do CABAZ), vistos
    // nos últimos 10 dias, sem suspeitos e com um preço por unidade que faz sentido (a embalagem até 25 unidades)
    const linhas = await d1(`SELECT tipo, cadeia, nome, cent, uc, ub, emb FROM preco WHERE tipo IN (${ks.map(() => '?').join(', ')}) AND uc > 0 AND cent > 0
        AND suspeito IS NULL AND visto > ? AND cadeia IN ('continente', 'pingodoce', 'auchan', 'lidl')`, [...ks, recente]);
    const cabaz = [];
    for (const [k, qtd, ub, quer, fora] of CABAZ) {
        for (const c of Object.keys(CADEIAS)) {
            const l = linhas.filter((x) => x.tipo === k && x.cadeia === c && x.ub === ub && quer.test(sem(x.nome)) && !fora.test(sem(x.nome))
                && Number(x.uc) * 25 >= Number(x.cent)).sort((a, b) => a.uc - b.uc)[0];
            if (!l) continue;
            cabaz.push({ tipo: k, tipo_nome: nomes[k] ?? k, cadeia: c, cadeia_nome: CADEIAS[c], preco_unidade: eur(l.uc), ub, qtd,
                custo_semana: eur(Math.round(Number(l.uc) * qtd)), produto: l.nome, emb: l.emb ?? '', preco: eur(l.cent) });
        }
    }
    // os preços que mudaram nos últimos 7 dias: a última mudança de cada produto (de, para)
    const desde = new Date(agora.getTime() - 7 * 24 * 3600e3).toISOString();
    const hist = await d1(`SELECT h.cadeia, h.id, h.cent, h.quando, p.nome, p.tipo, t.nome AS tipo_nome FROM preco_historico h
        JOIN preco p ON p.cadeia = h.cadeia AND p.id = h.id LEFT JOIN tipo t ON t.k = p.tipo
        WHERE h.cadeia || ' ' || h.id IN (SELECT cadeia || ' ' || id FROM preco_historico WHERE quando > ?)
        ORDER BY h.cadeia, h.id, h.quando`, [desde]);
    const por = new Map();
    for (const h of hist) { const k = `${h.cadeia} ${h.id}`; (por.get(k) ?? por.set(k, []).get(k)).push(h); }
    const mudancas = [];
    for (const hs of por.values()) {
        if (hs.length < 2) continue;
        const a = hs[hs.length - 2], b = hs[hs.length - 1];
        if (!(a.cent > 0) || a.cent === b.cent || b.quando < desde) continue;
        mudancas.push({ cadeia_nome: CADEIAS[b.cadeia] ?? b.cadeia, produto: b.nome, tipo_nome: b.tipo_nome ?? '', antes: eur(a.cent), agora: eur(b.cent),
            pct: Math.round(((b.cent - a.cent) / a.cent) * 1000) / 10, dia: b.quando.slice(0, 10) });
    }
    mudancas.sort((x, y) => x.pct - y.pct);
    // os vinhos com nota dos críticos: o mais barato de cada nota, em garrafa de 75 cl
    const notas = prepararNotas(await d1('SELECT palavras, fora, nota, resumo, fontes FROM vinho_nota'));
    const vs = await d1(`SELECT cadeia, nome, cent, tipo FROM preco WHERE tipo IN ('vinho-tinto', 'vinho-branco') AND cent > 0 AND suspeito IS NULL
        AND visto > ? AND q BETWEEN 0.74 AND 0.76 AND cadeia IN ('continente', 'pingodoce', 'auchan', 'lidl')`, [recente]);
    const melhor = new Map();
    for (const v of vs) {
        const n = notaDoProduto(notas, v.nome);
        if (!n || n.nota < 87) continue;
        const k = `${n.palavras}`;
        const ant = melhor.get(k);
        if (!ant || eur(v.cent) < ant.preco) melhor.set(k, { vinho: v.nome, cor: v.tipo === 'vinho-tinto' ? 'Tinto' : 'Branco', nota: n.nota,
            fonte: String(n.resumo).split(' · ')[0], cadeia_nome: CADEIAS[v.cadeia], preco: eur(v.cent) });
    }
    const vinhos = [...melhor.values()].sort((a, b) => b.nota - a.nota || a.preco - b.preco).slice(0, 40);
    const meta = (o) => [{ label: 'Lido da base da Compras', value: agora.toISOString().slice(0, 16).replace('T', ' ') + ' UTC' }, { label: 'Como', value: o }, codigo('painel.mjs')];
    const grava = (f, rows, como) => writeFileSync(path.join(pasta, f), JSON.stringify({ rows, meta: meta(como) }));
    grava('cabaz.json', cabaz, 'O produto mais barato por unidade (kg, l, un) de cada básico em cada cadeia, visto nos últimos 10 dias; custo = preço por unidade × quantidade de referência.');
    grava('mudancas.json', mudancas, 'A última mudança de preço de cada produto nos últimos 7 dias (o histórico guarda cada mudança desde 15/11/2026).');
    grava('vinhos.json', vinhos, 'Vinhos tintos e brancos de 75 cl com nota dos críticos de 87 ou mais (Revista de Vinhos, Wine Spectator…); o mais barato de cada um.');
    console.log(JSON.stringify({ cabaz: cabaz.length, mudancas: mudancas.length, vinhos: vinhos.length }));
}
if (import.meta.url === `file://${process.argv[1]}`) await main(process.argv[2] ?? 'painel');
