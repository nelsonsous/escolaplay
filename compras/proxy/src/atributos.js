// As filas de qualidade de cada família (ciclo 3, volta 6): o que distingue os vinhos, os azeites e os queijos, tirado
// do nome como as etiquetas do talho (etiquetas.js), e não palavras soltas («setubal», «colecao»). Cada família tem
// até três filas, que a app mostra pela ordem (a região, a gama, a casta; o leite, a cura, a DOP…). É conhecimento do
// Ecónomo: corre no Worker, sem IA.
const sem = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&[a-z]+;/g, ' ');

const REGIOES_VINHO = [
    [/\bdouro\b/, 'douro', 'Douro'], [/\balentej/, 'alentejo', 'Alentejo'], [/\bdao\b/, 'dao', 'Dão'], [/\bbairrada\b/, 'bairrada', 'Bairrada'],
    [/\bvinho verde\b|\bverde\b|\bmon[cç]ao|\bmelgaco\b/, 'verde', 'Vinho Verde'], [/\btejo\b|\bribatejo\b/, 'tejo', 'Tejo'],
    [/\blisboa\b|\bcolares\b|\bbucelas\b|\balenquer\b/, 'lisboa', 'Lisboa'],
    [/\bsetubal\b|\bpeninsula\b|\bpalmela\b|\bazeitao\b/, 'setubal', 'Península de Setúbal'], [/\bbeira interior\b|\bbeiras?\b/, 'beira', 'Beira Interior'],
    [/\btras os montes\b|\btransmontano\b/, 'trasmontes', 'Trás-os-Montes'], [/\balgarve\b|\blagoa\b/, 'algarve', 'Algarve'],
    [/\bmadeira\b/, 'madeira', 'Madeira'], [/\bacores\b|\bpico\b/, 'acores', 'Açores'], [/\btavora|\bvarosa\b/, 'tavora', 'Távora-Varosa'],
    [/\brioja\b|\bribera\b|\brueda\b|\bespanh/, 'espanha', 'Espanha'], [/\bbordeaux\b|\bbourgogne\b|\bfranc[ea]s?\b|\bchampagne\b/, 'franca', 'França'],
    [/\bitalia|\bchianti\b|\bprosecco\b/, 'italia', 'Itália'], [/\bchile\b|\bargentin|\bmendoza\b/, 'americas', 'Chile e Argentina'],
];
const GAMAS_VINHO = [
    [/\bgrande reserva\b/, 'grandereserva', 'Grande Reserva'], [/\bgarrafeira\b/, 'garrafeira', 'Garrafeira'], [/\breserva\b/, 'reserva', 'Reserva'],
    [/\bcolheita selecionada\b|\bcolheita seleccionada\b/, 'colheitasel', 'Colheita Selecionada'],
    [/\bvinha velha|\bvinhas velhas/, 'vinhasvelhas', 'Vinhas Velhas'], [/\bpremium\b|\bsignature\b|\bselecao\b|\bselection\b|\bprestige\b/, 'premium', 'Premium / Seleção'],
    [/\bbio\b|\bbiologic/, 'bio', 'Biológico'],
];
const CASTAS = [
    [/\btouriga nacional\b/, 'touriganacional', 'Touriga Nacional'], [/\btouriga franca\b/, 'tourigafranca', 'Touriga Franca'],
    [/\btinta roriz\b|\baragon[eê]?z\b/, 'aragonez', 'Aragonez / Tinta Roriz'], [/\balicante bouschet\b/, 'alicante', 'Alicante Bouschet'],
    [/\btrincadeira\b/, 'trincadeira', 'Trincadeira'], [/\bcastelao\b/, 'castelao', 'Castelão'], [/\bbaga\b/, 'baga', 'Baga'],
    [/\bsyrah\b|\bshiraz\b/, 'syrah', 'Syrah'], [/\bcabernet\b/, 'cabernet', 'Cabernet Sauvignon'], [/\bmerlot\b/, 'merlot', 'Merlot'],
    [/\balvarinho\b/, 'alvarinho', 'Alvarinho'], [/\bloureiro\b/, 'loureiro', 'Loureiro'], [/\barinto\b/, 'arinto', 'Arinto'],
    [/\bencruzado\b/, 'encruzado', 'Encruzado'], [/\bantao vaz\b/, 'antaovaz', 'Antão Vaz'], [/\bfernao pires\b/, 'fernaopires', 'Fernão Pires'],
    [/\bmoscatel\b/, 'moscatel', 'Moscatel'], [/\bsauvignon blanc\b/, 'sauvignon', 'Sauvignon Blanc'], [/\bchardonnay\b/, 'chardonnay', 'Chardonnay'],
    [/\bverdelho\b/, 'verdelho', 'Verdelho'], [/\bavesso\b/, 'avesso', 'Avesso'],
];
const REGIOES_AZEITE = [
    [/\btras os montes\b|\btransmontano\b/, 'trasmontes', 'Trás-os-Montes'], [/\bmoura\b/, 'moura', 'Moura'], [/\balentej/, 'alentejo', 'Alentejo'],
    [/\bbeira interior\b|\bbeira\b/, 'beira', 'Beira Interior'], [/\bribatejo\b|\btejo\b/, 'tejo', 'Ribatejo'], [/\bdouro\b/, 'douro', 'Douro'],
    [/\bespanh|\bitalia|\bgreci/, 'estrangeiro', 'Estrangeiro'],
];
const CATEGORIA_AZEITE = [[/\bvirgem extra\b/, 'virgemextra', 'Virgem extra'], [/\bvirgem\b/, 'virgem', 'Virgem'], [/./, 'azeite', 'Azeite (refinado)']];
const MODO_AZEITE = [[/\bbio\b|\bbiologic/, 'bio', 'Biológico'], [/\bdop\b/, 'dop', 'DOP'], [/\bcolheita\b|\bprimeira\b|\bgourmet\b|\bpremium\b|\bselecao\b|\bselecionad/, 'premium', 'Colheita / Seleção'],
    [/\bbaixa acidez\b|\b0[,.][1-3]\s?%?/, 'acidez', 'Baixa acidez']];
const LEITE_QUEIJO = [[/\bovelha\b/, 'ovelha', 'Ovelha'], [/\bcabra\b/, 'cabra', 'Cabra'], [/\bmistura\b|\bmisto\b/, 'mistura', 'Mistura'], [/\bvaca\b/, 'vaca', 'Vaca']];
const CURA_QUEIJO = [[/\bfresco\b/, 'fresco', 'Fresco'], [/\bamanteigado\b/, 'amanteigado', 'Amanteigado'], [/\bmeia cura\b|\bmeio curado\b/, 'meiacura', 'Meia cura'],
    [/\bvelho\b|\bextra curado\b/, 'velho', 'Velho'], [/\bcurado\b|\bcura\b/, 'curado', 'Curado'], [/\bflamengo\b/, 'flamengo', 'Flamengo'], [/\bmozz?arella\b/, 'mozzarella', 'Mozzarella']];
const DOP_QUEIJO = [[/\bserra da estrela\b/, 'serraestrela', 'Serra da Estrela'], [/\bserpa\b/, 'serpa', 'Serpa'], [/\bazeitao\b/, 'azeitao', 'Azeitão'],
    [/\bnisa\b/, 'nisa', 'Nisa'], [/\bsao jorge\b/, 'saojorge', 'São Jorge'], [/\bevora\b/, 'evora', 'Évora'], [/\bcastelo branco\b/, 'castelobranco', 'Castelo Branco'],
    [/\brabacal\b/, 'rabacal', 'Rabaçal'], [/\bterrincho\b/, 'terrincho', 'Terrincho'], [/\bdop\b/, 'dop', 'Outra DOP']];

export const FAMILIAS = {
    vinho: { e: (k) => /^vinho|^espumante$/.test(k), filas: [['regiao', 'Região', REGIOES_VINHO], ['gama', 'Gama', GAMAS_VINHO], ['casta', 'Casta', CASTAS]] },
    azeite: { e: (k) => k === 'azeite', filas: [['categoria', 'Categoria', CATEGORIA_AZEITE], ['regiao', 'Região', REGIOES_AZEITE], ['modo', 'Qualidade', MODO_AZEITE]] },
    queijo: { e: (k) => /^queijo/.test(k), filas: [['leite', 'Leite', LEITE_QUEIJO], ['cura', 'Cura e tipo', CURA_QUEIJO], ['dop', 'DOP', DOP_QUEIJO]] },
};
const NOMES = new Map(Object.entries(FAMILIAS).flatMap(([fam, f]) => f.filas.flatMap(([g, , l]) => l.map(([, id, nome]) => [`${fam}:${g}:${id}`, nome]))));

// a família de um tipo (ou null)
export const familiaDe = (k) => Object.entries(FAMILIAS).find(([, f]) => f.e(k))?.[0] ?? null;

// os atributos de um produto da família: { g: id } (só o primeiro de cada fila que o nome diz)
export function atributos(fam, nome) {
    const f = FAMILIAS[fam];
    if (!f) return {};
    const t = sem(nome), r = {};
    for (const [g, , lista] of f.filas) { const m = lista.find(([re]) => re.test(t)); if (m) r[g] = m[1]; }
    return r;
}
// as palavras para o filtro da app (procura palavras inteiras no nome): «regiao-douro» não aparece em nenhum nome
export const palavrasAtributos = (a) => Object.entries(a).map(([g, id]) => `${g}x${id}`);

// as filas da família para um tipo: [{ w, r, n, g }] com os valores que aparecem em pelo menos dois produtos, e as
// filas ({ g, t }) que têm pelo menos dois valores
export function filasDaFamilia(fam, produtos) {
    const f = FAMILIAS[fam];
    const conta = new Map();
    for (const p of produtos) for (const [g, id] of Object.entries(atributos(fam, p.nome))) conta.set(g + ':' + id, (conta.get(g + ':' + id) ?? 0) + 1);
    const palavras = [], filas = [];
    for (const [g, t] of f.filas) {
        const vs = [...conta].filter(([k, n]) => k.startsWith(g + ':') && n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 14);
        if (vs.length < 2) continue;
        filas.push({ g, t });
        for (const [k, n] of vs) palavras.push({ w: `${g}x${k.slice(g.length + 1)}`, r: NOMES.get(`${fam}:${k}`), n, g });
    }
    return { palavras, filas };
}
