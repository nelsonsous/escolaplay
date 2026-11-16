// A revisão (volta 6): o Worker valida a sua própria base, tipo a tipo, sempre que lê uma página de categoria (e de
// uma vez, pela sonda). Marca como suspeitos (preco.suspeito) os produtos que não devem entrar nas comparações:
//   - «unidade»: o preço por quilo ou litro não bate com o preço e a embalagem (um dos dois está mal lido);
//   - «tipo»: no talho, o animal do nome não é o do tipo («Costela de porco» no tipo da vaca).
// E dá nome aos tipos cruzados automaticamente cujo nome não tem nada a ver com a chave (o nome vinha da categoria
// de um produto qualquer da página: «Massas e gnocchis» no tipo «peixe»).
import { etiquetas } from './etiquetas.js';
import { medida } from './precos.js';

const ANIMAIS_DO_TIPO = { 'carne-novilho': ['vaca', 'novilho', 'vitela', 'vitelao'], porco: ['porco', 'preto'], frango: ['frango', 'galinha'],
    peru: ['peru'], 'borrego-cabrito': ['borrego', 'cabrito'] };
const sem = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// o nome tem a ver com a chave? (todas as palavras da chave, pelo começo, no nome: «Bebida aveia» não é o tipo
// «bebida-soja»; os plurais em «-ães» e «-ões» contam como o singular: «pães» é «pão»)
const singular = (w) => w.replace(/(?:aes|oes)$/, 'ao');
export const nomeCondiz = (k, nome) => {
    const ws = sem(nome).split(/[^a-z0-9]+/).filter((w) => w.length > 2).map(singular);
    return String(k).split('-').filter((x) => x.length > 2).every((x) => ws.some((w) => w.startsWith(x.slice(0, 5)) || x.startsWith(w.slice(0, 5))));
};
// os acentos que faltam nos nomes que vêm sem eles (os endereços do Auchan e do Pingo Doce, as chaves): «Tampao» → «Tampão»
const ACENTOS = new Map(Object.entries({ agua: 'água', aguas: 'águas', tonica: 'tónica', tonicas: 'tónicas', tampao: 'tampão', tampoes: 'tampões',
    pure: 'puré', hidratacao: 'hidratação', protecao: 'proteção', intima: 'íntima', higienico: 'higiénico', higienicos: 'higiénicos',
    epoca: 'época', tremoco: 'tremoço', tremocos: 'tremoços', pate: 'paté', pates: 'patés', pas: 'pás', refeicao: 'refeição',
    refeicoes: 'refeições', depilatorio: 'depilatório', depilatorios: 'depilatórios', multisuperficie: 'multisuperfície',
    multisuperficies: 'multisuperfícies', pao: 'pão', paes: 'pães', feijao: 'feijão', grao: 'grão', acucar: 'açúcar', cafe: 'café',
    cha: 'chá', chas: 'chás', loica: 'loiça', oleo: 'óleo', salmao: 'salmão', camarao: 'camarão', leitao: 'leitão', limao: 'limão',
    mexilhao: 'mexilhão', bebe: 'bebé', bebes: 'bebés', sabao: 'sabão', champo: 'champô', lixivia: 'lixívia', higiene: 'higiene',
    infusao: 'infusão', infusoes: 'infusões', acessorios: 'acessórios', liquido: 'líquido', liquidos: 'líquidos', soluvel: 'solúvel',
    cereal: 'cereal', lacteo: 'lácteo', lacteos: 'lácteos', lactea: 'láctea', lacteas: 'lácteas', bolacha: 'bolacha', proteses: 'próteses',
    protese: 'prótese', eletrico: 'elétrico', eletricos: 'elétricos', automatico: 'automático', automaticos: 'automáticos', fogao: 'fogão',
    frigorifico: 'frigorífico', especifica: 'específica', pessego: 'pêssego', pessegos: 'pêssegos', maca: 'maçã', macas: 'maçãs' }));
export const acentua = (nome) => String(nome ?? '').replace(/[A-Za-zÀ-ÿ]+/g, (w) => {
    const a = ACENTOS.get(w.toLowerCase());
    if (!a || w !== w.toLowerCase() && w !== w[0] + w.slice(1).toLowerCase()) return w;
    return w[0] === w[0].toUpperCase() && w[0] !== w[0].toLowerCase() ? a[0].toUpperCase() + a.slice(1) : a;
});
export const nomeDaChave = (k) => { const t = acentua(String(k).replace(/-/g, ' ')); return t[0].toUpperCase() + t.slice(1); };

// o que não é deste tipo, embora venha na página da categoria (revisão de 16/11/2026 às 181 categorias): a página da
// «carne picada» do Auchan traz almôndegas e hambúrgueres, a dos vinhos tintos traz brancos e conjuntos… Estes ficam
// «tipo» (fora das comparações); os do tipo certo vêm da página desse tipo.
const PREPARADOS = /hamburg|almondeg|salsich|espetad|panad|rolo de carne|confitad|desfiad|nugget|croquete|lasanha|empada/;
export const FORA_DO_TIPO = {
    'carne-picada': [PREPARADOS, /\bpato\b|bifinhos|bifes/],
    'carne-novilho': [PREPARADOS], porco: [PREPARADOS], frango: [PREPARADOS, /canja/], peru: [PREPARADOS], 'borrego-cabrito': [PREPARADOS],
    'vinho-tinto': [/vinho branco|vinho rose|\bconjunto\b|\bpack\b.*\+|espumante/], 'vinho-branco': [/vinho tinto|vinho rose|\bconjunto\b|espumante/],
    'vinho-rose': [/espumante|\bbebida\b/], espumante: [/frisante|aromatizad|aperitivo|bellini/], 'vinho-do-porto': [/moscatel|vermute/],
    'agua-sem-gas': [/agua de coco|com gas|gaseific|aromatiz|sabor/], 'agua-com-gas': [/mocktail/], refrigerantes: [/^agua|concentrado/],
    manteiga: [/creme vegetal|meenteiga|margarina|amendoim/], sal: [/bicarbonato/], acucar: [/adocante|xarope|stevia/], mel: [/maple|agave|polen/],
    atum: [/proteina vegetal|\bvuna\b|\bpate\b|sardinha|cavala/], arroz: [/pronto a comer|cozinhad/], salsicha: [/tofu|vegetal|vegan/],
    fiambre: [/chourica|vegetarian|vegan|\bsabor a\b/], leite: [/\blatte\b|macchiato|infantil|\bnan\b|cappuccino/],
    iogurtes: [/meal to go|refeicao|\bbebida lactea\b/], vinagre: [/biscoito|nectar/], 'peixe-fresco': [/congelad|descongelad/],
    bacalhau: [/paloco/], 'queijo-fresco': [/ralado/], cerveja: [/panache/], lixivia: [/bloco sanitario/], 'gel-de-banho': [/esponja|puff/],
    ovos: [/codorniz|chocolate|pascoa|liquid/], azeite: [/aromatiz/],
};
export const foraDoTipo = (k, nome) => (FORA_DO_TIPO[k] ?? []).some((r) => r.test(sem(nome)));

// a razão para um produto ser suspeito (null se não é):
//   - «tipo»: o nome diz que é outra coisa (FORA_DO_TIPO);
//   - «tipo»: no talho, o animal do nome não é o do tipo;
//   - «unidade»: o preço por quilo ou litro não bate com o preço e a embalagem (mais de três vezes: um dos dois está mal
//     lido, «leite 6 × 1 L a 6,42 €/l»; menos do que isso pode ser o peso escorrido do atum, que é verdadeiro). O «por
//     unidade» não se confere: cada cadeia conta a unidade à sua maneira (a folha, a cápsula). E não se marca um preço só
//     por ser muito diferente dos outros: o sal grosso a 0,29 €/kg e o wagyu a 139 €/kg são verdadeiros.
export function suspeitos(k, produtos) {
    return produtos.map((p) => {
        if (foraDoTipo(k, p.nome)) return 'tipo';
        const a = ANIMAIS_DO_TIPO[k] && etiquetas(p.nome, k)?.animal;
        if (a && !ANIMAIS_DO_TIPO[k].includes(a)) return 'tipo';
        const m = medida(p.emb);
        if (m && m.q > 0 && m.ub === p.ub && p.ub !== 'un' && p.uc > 0 && p.cent > 0) {
            const r = p.uc / (p.cent / m.q);
            if (r > 3 || r < 1 / 3) return 'unidade';
        }
        return null;
    });
}

// revê um tipo: marca e desmarca os suspeitos; corrige o nome de um tipo cruzado que não condiz com a chave
export async function revisarTipo(db, k) {
    const t = await db.prepare('SELECT k, nome, casa FROM tipo WHERE k = ?').bind(k).first();
    if (!t) return null;
    const { results } = await db.prepare('SELECT cadeia, id, nome, cent, emb, uc, ub, suspeito FROM preco WHERE tipo = ? AND cent IS NOT NULL').bind(k).all();
    const r = suspeitos(k, results);
    const mudar = results.map((p, i) => [p, r[i]]).filter(([p, s]) => (p.suspeito ?? null) !== s);
    const frases = mudar.map(([p, s]) => db.prepare('UPDATE preco SET suspeito = ? WHERE cadeia = ? AND id = ?').bind(s, p.cadeia, p.id));
    // o nome de um tipo automático: o que condiz com a chave (senão o da chave), com os acentos
    const nome = t.casa ? t.nome : nomeCondiz(k, t.nome) ? acentua(t.nome) : nomeDaChave(k);
    if (nome !== t.nome) frases.push(db.prepare('UPDATE tipo SET nome = ? WHERE k = ?').bind(nome, k));
    if (frases.length) await db.batch(frases);
    return { k, produtos: results.length, suspeitos: r.filter(Boolean).length, mudados: mudar.length };
}
