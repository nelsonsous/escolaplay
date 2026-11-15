// As secções da lista (volta 6), pela ordem em que se anda numa loja: cada coisa vai para uma secção pelo tipo da
// escolha (item.e.k) ou pelas palavras do texto. A app agrupa a lista por elas; o que não se percebe fica em «Outros».
export const SECCOES = ['Fruta e legumes', 'Padaria', 'Talho e peixaria', 'Charcutaria e queijos', 'Laticínios e ovos',
    'Mercearia', 'Bebidas', 'Congelados', 'Limpeza', 'Higiene e bebé', 'Animais', 'Outros'];
const REGRAS = [
    [0, /\b(fruta|banana|maca|pera|laranja|limao|tangerina|uva|morango|kiwi|ananas|melao|melancia|abacate|legume|batata|cebola|alho|tomate fresco|alface|cenoura|courgette|abobora|pepino|pimento|brocolo|couve|espinafre|cogumelo fresco|salada|grelos|nabo|feijao verde)/],
    [1, /\b(pao|broa|bolo|croissant|tosta|bolacha de agua|baguete|regueifa|papo seco)/],
    [3, /\b(fiambre|presunto|chourico|salpicao|mortadela|queijo|bacon|paio)/],
    [2, /\b(carne|frango|peru|porco|vaca|novilho|bife|costeleta|febra|picada|hamburguer|salsicha fresca|peixe|bacalhau|pescada|salmao|dourada|robalo|sardinha|polvo|lula|camarao|marisco)/],
    [4, /\b(leite|iogurte|ovo|manteiga|natas|margarina|kefir|requeijao|nata)/],
    [7, /\b(congelad|gelado|pizza|douradinho|ervilha congelada)/],
    [6, /\b(agua|sumo|nectar|refrigerante|cola|cerveja|vinho|cafe soluvel|bebida|tonica|ice tea|leite de soja|bebida vegetal)/],
    [8, /\b(detergente|lixivia|amaciador|limpa|esfregao|esponja|saco do lixo|sacos do lixo|papel de cozinha|rolo de cozinha|guardanapo|tira nodoa|ambientador|desengordurante|pastilha|lava loica|loica)/],
    [9, /\b(champo|gel de banho|gel banho|sabonete|pasta de dentes|escova de dentes|desodorizante|papel higienico|fralda|toalhita|penso|tampao|creme|shampoo|condicionador|lamina|algodao|cotonete)/],
    [10, /\b(gato|cao|racao|areia|animal|petisco para)/],
    [5, /\b(arroz|massa|esparguete|farinha|acucar|sal|azeite|oleo|vinagre|atum|sardinha em lata|conserva|feijao|grao|lentilha|cereai|bolacha|biscoito|cafe|cha|chocolate|compota|mel|molho|ketchup|maionese|mostarda|tempero|especiaria|caldo|polpa|ervilha|milho|azeitona|snack|batata frita|frutos secos|aveia|granola)/],
];
const TIPOS = { 'agua-sem-gas': 6, 'agua-com-gas': 6, leite: 4, ovos: 4, 'pao-de-forma': 1, arroz: 5, massa: 5, azeite: 5, oleo: 5,
    acucar: 5, farinha: 5, sal: 5, 'cafe-moido': 5, 'cafe-capsulas': 5, manteiga: 4, iogurtes: 4, 'queijo-fatiado': 3,
    'queijo-fresco': 3, fiambre: 3, atum: 5, 'feijao-grao': 5, 'polpa-tomate': 5, cereais: 5, bolachas: 5, nectares: 6,
    refrigerantes: 6, cerveja: 6, 'papel-higienico': 9, 'rolos-de-cozinha': 8, 'detergente-roupa': 8, amaciador: 8,
    'detergente-loica': 8, 'detergente-maquina-loica': 8, lixivia: 8, 'sacos-do-lixo': 8, 'gel-de-banho': 9, champo: 9,
    'pasta-de-dentes': 9, 'carne-picada': 2, 'carne-novilho': 2, frango: 2, porco: 2, peru: 2, 'borrego-cabrito': 2,
    'pao-do-dia': 1, 'pao-hamburguer': 1, croissants: 1, tostas: 1, 'peixe-fresco': 2, 'peixe-congelado': 2, bacalhau: 2,
    marisco: 2, 'polvo-lulas': 2, pescada: 2, hamburguer: 2, espetada: 2, salsicha: 2, peixe: 7,
    'vinho-do-porto': 6, espumante: 6, 'frutos-secos': 5, 'bolo-rei': 1 };
const sem = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// as secções que se procuram por um nome («pao» → Padaria): a palavra está no nome da secção
const sem2 = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export const seccaoDoTipo = (t) => seccao({ t: t.nome, e: { k: t.k } });
export const nomeSeccao = (s) => SECCOES[s];
export const seccoesPorNome = (w) => SECCOES.map((n, i) => [n, i]).filter(([n]) => sem2(n).split(/[^a-z]+/).some((x) => x.startsWith(w))).map(([, i]) => i);

// a secção de uma coisa da lista (o índice em SECCOES)
export function seccao(item) {
    if (item?.e?.k && TIPOS[item.e.k] != null) return TIPOS[item.e.k];
    const t = sem(`${item?.t ?? ''} ${item?.e?.k?.replace(/-/g, ' ') ?? ''}`);
    for (const [s, re] of REGRAS) if (re.test(t)) return s;
    return SECCOES.length - 1;
}
