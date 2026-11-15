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

// o nome tem a ver com a chave? (uma palavra da chave, pelo começo, no nome)
export const nomeCondiz = (k, nome) => {
    const ws = sem(nome).split(/[^a-z0-9]+/).filter((w) => w.length > 2);
    return String(k).split('-').filter((x) => x.length > 2).some((x) => ws.some((w) => w.startsWith(x.slice(0, 5)) || x.startsWith(w.slice(0, 5))));
};
export const nomeDaChave = (k) => { const t = String(k).replace(/-/g, ' '); return t[0].toUpperCase() + t.slice(1); };

// a razão para um produto ser suspeito (null se não é):
//   - «tipo»: no talho, o animal do nome não é o do tipo;
//   - «unidade»: o preço por quilo ou litro não bate com o preço e a embalagem (mais de três vezes: um dos dois está mal
//     lido, «leite 6 × 1 L a 6,42 €/l»; menos do que isso pode ser o peso escorrido do atum, que é verdadeiro). O «por
//     unidade» não se confere: cada cadeia conta a unidade à sua maneira (a folha, a cápsula). E não se marca um preço só
//     por ser muito diferente dos outros: o sal grosso a 0,29 €/kg e o wagyu a 139 €/kg são verdadeiros.
export function suspeitos(k, produtos) {
    return produtos.map((p) => {
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
    if (!t.casa && !nomeCondiz(k, t.nome)) frases.push(db.prepare('UPDATE tipo SET nome = ? WHERE k = ?').bind(nomeDaChave(k), k));
    if (frases.length) await db.batch(frases);
    return { k, produtos: results.length, suspeitos: r.filter(Boolean).length, mudados: mudar.length };
}
