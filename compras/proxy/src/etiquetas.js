// As etiquetas do talho e da peixaria (volta 6), feitas pelo Ecónomo (o Claude) a partir dos nomes reais dos 1 384
// produtos das três cadeias: o animal ou a espécie, o corte e os usos (grelhar, assar, estufar, cozer, fritar). As
// cadeias arrumam a carne por animal (todo o bovino junto) e quase nunca escrevem para que serve cada corte; quem sabe
// de talho sabe que a picanha e a vazia são de grelhar, o acém e o cachaço de estufar, a perna de assar.
// É conhecimento, não estatística: corre no Worker em cada pedido (microssegundos) e o Ecónomo revê de semana a
// semana o que fica por etiquetar (economo/etiquetas.mjs).
// Cada etiqueta tem um id de uma palavra (para se filtrar pelo nome: «chadefora») e um nome para se ler («chã de fora»).

const sem = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&[a-z]+;/g, '');

// os usos, pela ordem em que aparecem
export const USOS = ['grelhar', 'assar', 'estufar', 'cozer', 'fritar'];
const G = 'grelhar', A = 'assar', E = 'estufar', C = 'cozer', F = 'fritar';

// os cortes e as formas: o primeiro que bate no nome ganha (os mais específicos primeiro)
// [expressão no nome sem acentos, id, nome, usos]
const CORTES = [
    // preparados (a forma pesa mais do que a peça: «Hambúrguer 100% Picanha» é um hambúrguer)
    [/\bhamburg(u)?er|\bsmash\b|fishburg/, 'hamburguer', 'hambúrguer', [G, F]],
    [/\balmondega/, 'almondega', 'almôndegas', [F, E]],
    [/\bpicad[ao]\b/, 'picada', 'picada', []],
    [/\bsalsicha/, 'salsicha', 'salsichas', [G, F]],
    [/\bespetad|\bespeto/, 'espetada', 'espetadas', [G]],
    [/\bpanad|douradinho|farinha e ovo|\bnugget/, 'panado', 'panados', [F]],
    [/\bstrogonoff|\bjardineira|\bcaril\b|\bguisad/, 'jardineira', 'jardineira e guisados', [E]],
    [/\bcaldeirada/, 'caldeirada', 'caldeirada', [E]],
    [/\bpreparado|\bdelicias do mar|\bcocktail|\brolo de carne|\bfondue/, 'preparado', 'preparados', []],
    [/\bcanj(inh)?a\b/, 'canja', 'canja', [C]],
    [/\bcarpaccio|\btartaro|\bsushi|\bsashimi|\bpoke\b/, 'cru', 'cru (carpaccio, sushi)', []],
    [/\bdesfiad|\bmigas\b/, 'desfiado', 'desfiado', [C]],
    [/\bmiud|\bfigad|\bmoela|\bcoracao|\bcoracoes|\blingua|\borelha|\bbochecha|\bpescoco|\bchispe|\bcaras?\b|\bovas\b/, 'miudezas', 'miudezas', [E, C]],
    // vaca
    [/\bpicanha/, 'picanha', 'picanha', [G, A]],
    [/\bmaminha/, 'maminha', 'maminha', [G, A]],
    [/\bfraldinha|\bbavette/, 'fraldinha', 'fraldinha', [G]],
    [/\bt-?bone|\btomahawk|\bchuleton|\bcowboy|\bclub steak|\bcosteletao/, 'tbone', 't-bone e costeletão', [G]],
    [/\bentrecote|\brib ?eye|\bchuck roll|\bdenver/, 'entrecote', 'entrecôte', [G]],
    [/\bvazi[ao]\b/, 'vazia', 'vazia', [G]],
    [/\balcatra|\brabadilha|\bbeijinho/, 'alcatra', 'alcatra', [G, A]],
    [/\bosso ?buco|\bchambao/, 'ossobuco', 'ossobuco e chambão', [E, C]],
    [/\bpojadouro/, 'pojadouro', 'pojadouro', [A, E]],
    [/\bcha de (fora|dentro)/, 'chadefora', 'chã de fora e de dentro', [A, E]],
    [/\bescalope/, 'escalope', 'escalopes', [G, F]],
    [/\bredondo\b/, 'redondo', 'redondo', [G, A]],
    [/\bacem\b/, 'acem', 'acém', [E, C]],
    // porco, borrego, aves (antes das partes gerais: «Costeletas do Lombo» são costeletas)
    [/\bcostelet|\bcostela|\bcarre\b|\bchuleta/, 'costeleta', 'costeletas', [G]],
    [/\bentrecosto/, 'entrecosto', 'entrecosto', [G, A]],
    [/\bentremeada|\btoucinho/, 'entremeada', 'entremeada', [G]],
    [/\bfebra/, 'febra', 'febras', [G]],
    [/\bsecreto|\bpluma|\bpresa\b|\babanico|\blagart|\bcapricho/, 'secreto', 'secretos, plumas e presas', [G]],
    [/\bbifana/, 'bifana', 'bifanas', [G, F]],
    [/\brojo(es|ao)\b/, 'rojoes', 'rojões', [F, E]],
    [/\bmedalh/, 'medalhao', 'medalhões', [G]],
    [/\btranche|\bporco(es|ao)\b|\bsuprem/, 'tranche', 'tranches e porções', [G, A]],
    [/\bpreguinho|\bbife|\bbifinho/, 'bife', 'bifes', [G, F]],
    [/\bposta/, 'posta', 'postas', [C, G]],
    [/\bfilete/, 'filete', 'filetes', [F, A]],
    [/\blombinho|\blombo|\blombito/, 'lombo', 'lombo', [A, G]],
    [/\bcachaco/, 'cachaco', 'cachaço', [E, A]],
    [/\bpeito/, 'peito', 'peito', [G, F]],
    [/\bcoxa|\bperna|\bperninha|\bpernil|\bcoto\b|\bmao\b|\bpa\b|\bpa e acem|\bpa\/mao/, 'perna', 'perna, coxa e pá', [A, E]],
    [/\basas?\b(?! branca)|\basinha/, 'asa', 'asas', [A, G]], // («Asa Branca» é uma marca de bacalhau)
    [/\btentacul|\bargola|\brodela|\btiras\b/, 'tentaculo', 'tentáculos e argolas', [F, G]],
    [/\bmiolo|\bcauda|\bboca/, 'miolo', 'miolo, caudas e bocas', [C]],
    [/\bleitao/, 'leitao', 'leitão', [A]],
    [/\brabos?\b|\bbarriga|\bbadana/, 'rabo', 'rabos, barrigas e badanas', [C]],
    [/\bcubos?\b/, 'cubos', 'cubos', [E]],
    [/\binteir|\bcompleto|\bmetade|\bquartos?\b|\bpartid|\bpedaco|\bmeio\b/, 'inteiro', 'inteiro ou aos pedaços', [A, C]],
];

// o animal ou a espécie (o primeiro que bate); no bovino, sem palavra, é vaca
const ANIMAIS = [
    [/\bvitelao/, 'vitelao', 'vitelão'], [/\bvitela/, 'vitela', 'vitela'], [/\bnovilho/, 'novilho', 'novilho'],
    [/\bwagyu|\bangus|\bbovino|\bvaca\b|\bnovilha\b|\bcarnalentejana|\bmertolengo|\bpicanha|\bmaminha/, 'vaca', 'vaca'],
    [/\bporco preto|\biberico|\bmiguel & miguel|\bvalbolota/, 'preto', 'porco preto'],
    [/\bporco\b|\bsuino|\bleitao|\bduroc/, 'porco', 'porco'],
    [/\bgalinha/, 'galinha', 'galinha'], [/\bfrango/, 'frango', 'frango'], [/\bperu\b|\bturkey/, 'peru', 'peru'],
    [/\bpato\b/, 'pato', 'pato'], [/\baves?\b/, 'aves', 'aves'], [/\bmist[oa]s?\b/, 'misto', 'misto'], [/\bcoelho/, 'coelho', 'coelho'],
    [/\bborrego|\bcordeiro/, 'borrego', 'borrego'], [/\bcabrito/, 'cabrito', 'cabrito'],
    [/\bpaloco|\bescamudo/, 'paloco', 'paloco (do Pacífico)'], [/\bbacalhau/, 'bacalhau', 'bacalhau'], [/\bpescada/, 'pescada', 'pescada'], [/\bsalmao/, 'salmao', 'salmão'],
    [/\batum\b/, 'atum', 'atum'], [/\bdourada/, 'dourada', 'dourada'], [/\brobalo/, 'robalo', 'robalo'],
    [/\bsardinha/, 'sardinha', 'sardinha'], [/\bcarapau|\bchicharro/, 'carapau', 'carapau'], [/\bcavala/, 'cavala', 'cavala'],
    [/\bpolvo/, 'polvo', 'polvo'], [/\blul(a|inha)/, 'lula', 'lulas'], [/\bchoco/, 'choco', 'choco'], [/\bpota|\bargolas do mar/, 'pota', 'pota'],
    [/\bcamarao|\bgamba|\blagostim|\bcarabineiro/, 'camarao', 'camarão'], [/\bameijoa|\bberbigao|\blongueirao|\blingueirao/, 'ameijoa', 'amêijoa e conchas'],
    [/\bmexilha/, 'mexilhao', 'mexilhão'], [/\bpercebe|\bbuzio|\blapa|\bvieira|\bnavalheira/, 'marisco', 'outros mariscos'], [/\bsapateira|\bsantola|\bcaranguejo|\blagosta|\blavagante|\bcavaco/, 'sapateira', 'sapateira e lagosta'],
    [/\bmaruca/, 'maruca', 'maruca'], [/\btamboril/, 'tamboril', 'tamboril'], [/\bsolha|\blinguado|\bpregado/, 'linguado', 'linguado e solha'],
    [/\bred ?fish|\bperca|\bpangasius|\bpanga\b|\btilapia|\bescamudo|\bgaroupa|\bpeixe galo|\bpeixe gato|\btintureira|\bcorvina|\bpargo|\braia\b|\bespada|\bcherne|\bpampo|\bcacao\b|\babrotea|\bcongro|\bsafio|\bfaneca|\bbesugo|\bsargo|\bcantaril|\bsalema|\bsalongo|\bsalmonete|\bcachucho|\bpalmeta|\bespadilha/, 'outros', 'outros peixes'],
];
// a origem ou o modo de produção, quando o nome o diz (não se adivinha: uma dourada sem nada pode ser das duas)
//   peixe: selvagem (pesca: do mar, da costa, de anzol; certificação MSC) ou aquacultura (viveiro; certificação ASC);
//   carne: biológico, do campo (ao ar livre), DOP/IGP e raças autóctones (Carnalentejana, Mertolengo, Barrosã,
//   Maronesa, porco alentejano), montanheira (porco preto de bolota)
const PRODUCAO = [
    [/\bselvage|\bda costa\b|\banzol|\balto mar|\bmsc\b|\bcapturad|\bpesca\b/, 'selvagem', 'selvagem (pesca)'],
    [/\baquacultura|\bviveiro|\basc\b|\bcultivad[oa]\b/, 'aquacultura', 'aquacultura (viveiro)'],
    [/\bbio\b|\bbiologic/, 'biologico', 'biológico'],
    [/\bcarnalentejana|\bmertolengo|\bbarros[ãa]|\bmaronesa|\bdop\b|\bigp\b|\bporco alentejano/, 'dop', 'DOP/IGP e raça autóctone'],
    [/\bmontanheira|\bbolota/, 'montanheira', 'montanheira (bolota)'],
    [/\bdo campo\b|\bar livre\b|\bcapoeira/, 'campo', 'do campo (ar livre)'],
];
// o calibre do bacalhau inteiro (do mais pequeno ao maior, e melhor): o corte dele quando o nome não diz outro
const CALIBRES = [
    [/\bsuper especial|\bespecial\b/, 'especial', 'especial (o maior)'], [/\bgraudo\b/, 'graudo', 'graúdo'],
    [/\bcrescido\b/, 'crescido', 'crescido'], [/\bcorrente\b|\bmiudo\b/, 'corrente', 'corrente (o mais pequeno)'],
];
// o país ou a zona de origem, quando o nome o diz (o bacalhau da Noruega ou da Islândia, a picanha da América do Sul)
const PAISES = [
    [/\bnoruega\b/, 'noruega', 'Noruega'], [/\bislandia\b/, 'islandia', 'Islândia'], [/\bfaroe|\bfaroes\b/, 'faroe', 'Ilhas Faroé'],
    [/\bacores\b/, 'acores', 'Açores'], [/\bnacional\b|\bportugal\b|\bportugues/, 'nacional', 'nacional'],
    [/\bespanha\b|\bgaliza\b/, 'espanha', 'Espanha'], [/\bargentin/, 'argentina', 'Argentina'], [/\bchile\b/, 'chile', 'Chile'],
    [/\bmocambique\b/, 'mocambique', 'Moçambique'], [/\bmadagascar\b/, 'madagascar', 'Madagáscar'], [/\bequador\b/, 'equador', 'Equador'],
    [/\bvietnam/, 'vietname', 'Vietname'], [/\bamerica do sul\b/, 'americasul', 'América do Sul'], [/\beuropa\b/, 'europa', 'Europa'],
    [/\bpacifico\b|\balasca\b/, 'pacifico', 'Pacífico'],
];
// a preparação do bacalhau (e do peixe): salgado seco (para demolhar) ou já demolhado
const PREPARO = [[/\bdemolhad/, 'demolhado', 'demolhado (pronto a cozinhar)'], [/\bseco\b|\bsalgado\b/, 'salgado', 'salgado seco (para demolhar)']];
// os usos de cada espécie, quando o nome não diz o corte
const USOS_ANIMAL = { sardinha: [G], carapau: [G, F], cavala: [G], dourada: [G, A], robalo: [G, A], salmao: [G, A], atum: [G],
    pescada: [C, F], bacalhau: [C, A], paloco: [C, F], polvo: [C, A], lula: [G, F], choco: [G, F], pota: [G, F], camarao: [C, G],
    ameijoa: [C], mexilhao: [C], marisco: [C], sapateira: [C], maruca: [C, F], tamboril: [E, G], linguado: [F, G], outros: [G, F] };
// o animal de cada tipo, quando o nome não o diz
const ANIMAL_TIPO = { 'carne-novilho': 'vaca', porco: 'porco', frango: 'frango', peru: 'peru' };
// as palavras dos usos nos nomes
const USOS_NOME = [[/\bgrelha|\bchurrasco|\bbbq\b|\bbarbecue/, G], [/\bassar|\bassado|\bforno\b/, A], [/\bestufar|\bguisar|\bensopado/, E], [/\bcozer|\bcozid/, C], [/\bfritar|\bfrito/, F]];

const NOMES = new Map([...CORTES.map(([, id, nome]) => [id, nome]), ...ANIMAIS.map(([, id, nome]) => [id, nome]), ...PRODUCAO.map(([, id, nome]) => [id, nome]),
    ...CALIBRES.map(([, id, nome]) => [id, nome]), ...PAISES.map(([, id, nome]) => [id, nome]), ...PREPARO.map(([, id, nome]) => [id, nome]), ...USOS.map((u) => [u, `para ${u}`])]);
export const nomeEtiqueta = (id) => NOMES.get(id) ?? id;

// { animal, corte, usos } de um produto (null se não é do talho nem da peixaria)
export function etiquetas(nome, tipo = null) {
    const t = sem(nome);
    const c = CORTES.find(([re]) => re.test(t));
    const a = ANIMAIS.find(([re]) => re.test(t));
    const animal = a?.[1] ?? ANIMAL_TIPO[tipo] ?? null;
    // os usos do corte e os da espécie (um carapau inteiro é de grelhar, como o carapau)
    const usos = new Set([...(c?.[3] ?? []), ...((animal && USOS_ANIMAL[animal]) ?? [])]);
    for (const [re, u] of USOS_NOME) if (re.test(t)) usos.add(u);
    const p = PRODUCAO.find(([re]) => re.test(t));
    const pa = PAISES.find(([re]) => re.test(t));
    const pr = (animal === 'bacalhau' || animal === 'paloco') ? PREPARO.find(([re]) => re.test(t)) : null;
    // o bacalhau inteiro: o corte é o calibre (corrente, crescido, graúdo, especial)
    let corte = c?.[1] ?? null;
    if (!corte && animal === 'bacalhau') { const k = CALIBRES.find(([re]) => re.test(t)); if (k) { corte = k[1]; for (const u of [C, A]) usos.add(u); } }
    if (!corte && !animal && !usos.size) return null;
    return { animal, corte, usos: USOS.filter((u) => usos.has(u)), ...(p ? { prod: p[1] } : {}), ...(pa ? { pais: pa[1] } : {}), ...(pr ? { prep: pr[1] } : {}) };
}
// as palavras das etiquetas, para juntar às do nome (o filtro da app procura palavras inteiras)
export const palavrasEtiquetas = (e) => (e ? [e.corte, e.animal, e.prod, e.pais, e.prep, ...e.usos].filter(Boolean) : []);

// os tipos do talho e da peixaria (onde as etiquetas valem)
export const TALHO = new Set(['carne-novilho', 'porco', 'frango', 'peru', 'borrego-cabrito', 'carne-picada', 'peixe-fresco', 'peixe-congelado',
    'bacalhau', 'marisco', 'polvo-lulas', 'pescada', 'hamburguer', 'espetada', 'salsicha']);
