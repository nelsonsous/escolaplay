// Os sinais de qualidade de um produto, pelo nome (volta 7): o que o põe acima (+1) ou abaixo (−1) dos outros do mesmo
// tipo, ou só o que o distingue (0). Na escolha, cada supermercado mostra os sinais do produto mais barato, para se
// ver que não se compara o mesmo: uma broa de milho com massa mãe, uma marca branca, um peixe congelado.
// É uma ajuda, não uma nota: diz o que o nome diz.
const sem = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&[a-z]+;/g, ' ');
const SINAIS = [
    [/\bmassa mae\b/, 1, 'massa mãe'],
    [/\bselvage|\bda costa\b|\banzol\b/, 1, 'selvagem'],
    [/\bmsc\b/, 1, 'pesca sustentável (MSC)'],
    [/\baquacultura|\bviveiro\b/, 0, 'aquacultura'],
    [/\basc\b/, 1, 'aquacultura responsável (ASC)'],
    [/\bcarnalentejana|\bmertolengo|\bbarros[ãa]|\bmaronesa|\bporco alentejano/, 1, 'raça autóctone'],
    [/\bmontanheira|\bbolota/, 1, 'montanheira'],
    [/\bbio\b|\bbiologic/, 1, 'biológico'],
    [/\bdop\b|\bigp\b|\bdenominacao de origem/, 1, 'DOP/IGP'],
    [/\bdo campo\b|\bcampo\b|\bcriado ao ar livre|\bar livre\b/, 1, 'do campo'],
    [/\bartesan|\btradicional|\bcaseir|\bforno a lenha|\bforno de lenha/, 1, 'tradicional'],
    [/\bselecionad|\bselecao\b|\bpremium|\bgourmet|\bextra\b|\breserva\b|\bsuper especial/, 1, 'gama superior'],
    [/\bmaturad|\bcura\b/, 1, 'maturado'],
    [/\bcultivamos o bom\b|\bproducao local|\bprodutos locais/, 1, 'produção local'],
    [/\bnacional\b|\bportugal\b|\bportugues|\bacores|\bmadeira\b/, 1, 'nacional'],
    [/\bfresc[oa]s?\b/, 1, 'fresco'],
    [/\bcongelad|\bultracongelad|\bdescongelad/, -1, 'congelado'],
    [/\bpoupanca\b|\beconomic|\bbasic|\bfamiliar\b/, -1, 'gama económica'],
    [/\bbacalhau\b.*\b(super especial|especial|graudo)\b|\b(super especial|especial|graudo)\b.*\bbacalhau\b/, 1, 'calibre grande'],
    [/1\.?\s?ª|\b1\s?a\b|\bprimeira\b/, 1, '1.ª qualidade'],
    [/\bcura amarela\b|\b(9|12|18) meses\b/, 1, 'cura longa'],
    [/\bpreparado\b|\bmistura\b/, -1, 'preparado'],
    [/\bsem gluten|\bisento de gluten/, 0, 'sem glúten'],
    [/\bsem lactose/, 0, 'sem lactose'],
    [/\bmeio gordo/, 0, 'meio-gordo'],
    [/\bmagro\b|\blight\b/, 0, 'magro'],
];
// [{ t, s }] pela ordem: primeiro o que é melhor, depois o que é pior, depois o resto
export function sinais(nome) {
    const n = sem(nome);
    const r = SINAIS.filter(([re]) => re.test(n)).map(([, s, t]) => ({ t, s }));
    const ordem = (x) => (x.s === 1 ? 0 : x.s === -1 ? 1 : 2);
    return r.sort((a, b) => ordem(a) - ordem(b)).slice(0, 4);
}
