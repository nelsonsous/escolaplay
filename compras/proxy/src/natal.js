// O Cabaz de Natal (volta 10): para cada parte da consoada e do dia de Natal (o bacalhau, o polvo, o peru ou o cabrito,
// o marisco, o azeite, o bolo-rei, os frutos secos, o vinho do Porto, o espumante), as três melhores opções em todas as
// cadeias e nas lojas de produtor, pela qualidade, pelo preço ou pelo equilíbrio dos dois. Cada opção diz porquê (os
// sinais do nome: calibre especial, cura amarela, 20 anos, DOP…). Com um teto (€), o cabaz desce onde poupa mais e
// perde menos qualidade. É uma ajuda pelo que o nome diz, não uma prova: o rótulo na loja manda.
import { sinais } from './qualidade.js';
import { pecaAoPeso } from './precos.js';
import { prepararNotas, notaDoProduto } from './notas.js';
import { NAO_SUGERIR } from './atributos.js';

const sem = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&[a-z]+;/g, ' ');
const DIA = 24 * 3600e3;

// cada parte: os tipos do catálogo, as palavras que o nome tem de ter (quer), as que tiram (fora), os pontos de cada
// sinal próprio da parte, e se o «congelado» não conta contra (o polvo e o marisco são quase sempre congelados)
export const PARTES = [
    { k: 'bacalhau', nome: 'Bacalhau da consoada', icone: '🐟', tipos: ['bacalhau'], gelo: true,
        quer: /\bbacalhau\b/, fora: /\b(desfiad|pataniscas?|bolinhos?|pasteis|caras?|migas|lascas|natas|bras|com grao|caldeirada|cozinhar|sopa|rabos?|barrigas?|abas|aparas|badanas|cabecas|espinhas|samos|linguas|bochechas|meia cura|salada|gratinad|refeic)/,
        pontos: [[/\bsuper especial\b/, 4, 'super especial', 'cal'], [/\bespecial\b/, 3, 'especial', 'cal'], [/\bgraudo\b/, 2, 'graúdo', 'cal'], [/\bcrescido\b/, 1, 'crescido', 'cal'],
            [/\bcorrente\b|\bmiudo\b/, -1, 'calibre pequeno', 'cal'], [/\bcura amarela\b|\bcura tradicional\b/, 2, 'cura tradicional'],
            [/\bnoruega|\bislandia|\bgadus morhua\b/, 1, 'Noruega/Islândia'], [/\blombos?\b/, 1, 'lombo'], [/\bposta alta\b/, 1, 'posta alta'],
            [/\bdemolhado\b|\bultracongelado\b/, 0, 'já demolhado'], [/\bseco\b|\bsalgado seco\b/, 0, 'salgado seco'], [/\bpaloco\b|\bpolaca\b|\bsaithe\b|\bzarbo\b|\bljung/, -3, 'não é bacalhau (paloco, zarbo…)']] },
    { k: 'polvo', nome: 'Polvo', icone: '🐙', tipos: ['polvo-lulas'], gelo: true,
        quer: /\bpolvo\b/, fora: /\b(salada|lulas?|choco|conserva|em azeite|panad|cozinhado|lagareiro)/,
        pontos: [[/\binteiro\b/, 1, 'inteiro'], [/\bacores|\bmarroc|\bmauritan|\bsenegal/, 1, 'origem conhecida'], [/\bcozido\b/, 0, 'já cozido'], [/\b(t[1-3])\b/, 1, 'calibre grande']] },
    { k: 'assado', nome: 'Peru ou cabrito', icone: '🍗', tipos: ['peru', 'borrego-cabrito'],
        quer: /\b(peru|cabrito|borrego|leitao)\b/, peca: /\b(inteir[oa]|perna|pa|quarto|meio|rolo|recheado|lombo|peito de peru assar|assar|pernil)\b/, fora: /\b(fiambre|fatiad|salsich|hamb|picad|nuggets|panad|panado|bifes?|strogonoff|espetad|cubos|tiras|mortadela|chourico|asas?|pescoc|moelas|figados?|coxas?|sobrecoxas?|cachaco|costeletas?)/,
        pontos: [[/\binteiro\b|\bperna\b|\bpa\b|\bquarto\b/, 1, 'peça para assar'], [/\bdo campo\b|\bao ar livre\b/, 1, 'do campo'], [/\brecheado\b/, 0, 'recheado'],
            [/\bcabrito\b/, 1, 'cabrito'], [/\bmontanha|\bserrano|\btrasmontano|\btransmontano|\bbeira/, 1, 'de montanha']] },
    { k: 'marisco', nome: 'Marisco', icone: '🦐', tipos: ['marisco'], gelo: true,
        quer: /\b(camar[ao]|gamba|lagost|lavagante|sapateira|santola|ameijoa|mexilh|percebe|navalheira|lingueir|vieira)/, fora: /\b(surimi|delicias|sabor|croquete|rissol|salada|sopa|panad|cocktail)/,
        pontos: [[/\blavagante|\blagosta\b|\bsantola|\bsapateira|\bpercebe/, 2, 'marisco nobre'], [/\btigre\b|\bcarabineiro|\bgamba vermelha|\bgambas? da costa/, 1, 'camarão grande'],
            [/\b(\d+\/\d+)\b/, 0, 'calibre no nome'], [/\bcozid/, 0, 'já cozido']] },
    { k: 'azeite', nome: 'Azeite', icone: '🫒', tipos: ['azeite'],
        quer: /\bazeite\b/, fora: /\b(spray|aromatizad|com alho|piri|malagueta|oregaos|trufa|bagaco|refinado)/,
        pontos: [[/\bvirgem extra\b/, 2, 'virgem extra'], [/\bvirgem\b(?! extra)/, -1, 'só virgem'], [/\bcolheita\b/, 1, 'colheita'],
            [/\btras os montes|\bmoura\b|\balentejo|\bbeira interior|\bribatejo|\bdouro\b/, 1, 'região nacional'], [/\bbaixa acidez|\b0[,.][1-3]\b/, 1, 'baixa acidez']] },
    { k: 'bolo-rei', nome: 'Bolo-rei', icone: '👑', tipos: ['bolo-rei'], inicio: /^(bolo[ -]?(rei|rainha)|panet+one)/, like: ['%bolo rei%', '%bolo-rei%', '%bolo rainha%', '%panetone%', '%panettone%'],
        quer: /\b(bolo[ -]rei|bolo[ -]rainha|bolo[ -]rei escangalhado|panet+one)\b/, fora: /\b(fatia|aroma|mini)\b/,
        pontos: [[/\bbolo[ -]rei\b/, 1, 'bolo-rei'], [/\bescangalhado\b/, 0, 'escangalhado'], [/\bconfeitaria|\bpastelaria\b/, 1, 'de pastelaria']] },
    { k: 'frutos-secos', nome: 'Frutos secos', icone: '🌰', tipos: ['frutos-secos'],
        inicio: /^(miolo (de )?)?(noz|nozes|amendoas?|avelas?|pinhao|pinhoes|figos?|tamaras?|castanhas?|passas?|alperces?|ameixas?|mistura de frutos|frutos secos)\b/, like: ['%noz%', '%amendoa%', '%amêndoa%', '%pinhao%', '%pinhão%', '%figo seco%', '%tamara%', '%tâmara%'],
        quer: /\b(noz|nozes|amendoas?|avelas?|pinhao|pinhoes|figos? secos?|tamaras?|castanhas?|passas?|alperces?|frutos secos|ameixas? secas?)\b/, fora: /\b(moscada|manteiga|creme|bebida|leite|chocolate|bolacha|barra|cereais|amendoim|amendoins|iogurte|gelado)/,
        pontos: [[/\bnaciona|\bportug|\bdouro\b|\btras os montes/, 1, 'nacional'], [/\bmiolo\b/, 0, 'miolo'], [/\bsortid|\bmistura de natal|\bnatal\b/, 0, 'sortido de Natal'],
            [/\bcom casca\b/, 0, 'com casca'], [/\bmedjool\b/, 1, 'medjool']] },
    // o vinho da ceia: um tinto em garrafa (não bag-in-box nem garrafão); a gama conta pouco, a nota dos críticos e a
    // Vivino (notaVinho) contam muito
    { k: 'vinho', nome: 'Vinho tinto da ceia', icone: '🍷', tipos: ['vinho-tinto'], vinho: true,
        quer: /\b(vinho|tinto)\b/, fora: /\b(porto|bag|box|bib|garrafao|sangria|licor|sem alcool|0[,.]0|[2-9] ?l|1[,.]5 ?l|magnum)\b/,
        pontos: [[/\bgrande reserva\b|\bgarrafeira\b/, 2, 'grande reserva/garrafeira', 'gama'], [/\breserva\b/, 1, 'reserva', 'gama'],
            [/\bdouro\b|\bdao\b|\balentejo|\bbairrada\b/, 0, 'DOC', 'regiao']] },
    { k: 'porto', nome: 'Vinho do Porto', icone: '🥃', tipos: ['vinho-do-porto'], vinho: true, inicio: /^(vinho (do )?)?porto\b/, like: ['%vinho do porto%', '%porto tawny%', '%porto ruby%', '%porto lbv%', '%porto vintage%', '%porto branco%'],
        quer: /\bporto\b/, fora: /\b(vinagre|copo|gelado|bombon)/,
        pontos: [[/\b(30|40|50) anos\b/, 4, 'muito velho (30+ anos)', 'idade'], [/\b20 anos\b/, 3, '20 anos', 'idade'], [/\b10 anos\b/, 2, '10 anos', 'idade'], [/\bvintage\b/, 3, 'vintage', 'idade'],
            [/\bcolheita\b|\b(19|20)\d\d\b/, 2, 'colheita', 'idade'], [/\blbv\b|\blate bottled/, 2, 'LBV', 'idade'], [/\breserva\b/, 1, 'reserva', 'idade'],
            [/\btawny\b|\bruby\b|\bbranco\b/, 0, 'Porto de entrada', 'idade']] },
    { k: 'espumante', nome: 'Espumante', icone: '🥂', tipos: ['espumante'], vinho: true, inicio: /^(vinho )?(espumante|champanhe|champagne|cava|prosecco)\b/, like: ['%espumante%', '%champagne%', '%champanhe%'],
        quer: /\b(espumante|champagne|champanhe|cava|prosecco)\b/, fora: /\b(sem alcool|0[,.]0|sumo|bebida|copo|gaseificad)/,
        pontos: [[/\bchampagne|\bchampanhe/, 3, 'champanhe'], [/\bmetodo classico|\bmetodo tradicional/, 2, 'método clássico'], [/\bbairrada|\btavora|\bvarosa|\bdouro\b/, 1, 'região DOC'],
            [/\breserva\b|\bgrande reserva\b|\bvintage\b/, 1, 'reserva'], [/\bbruto natural|\bbrut nature|\bextra brut/, 1, 'bruto natural'], [/\bmeio seco|\bdoce\b|\bfrisante/, -1, 'doce/frisante']] },
];
export const MODOS = ['qualidade', 'equilibrio', 'preco'];

// os pontos de um nome numa parte: os sinais gerais (qualidade.js) e os da parte; { q, porque: [texto] }
export function pontosDe(parte, nome) {
    const n = sem(nome), porque = [];
    let q = 0;
    for (const s of sinais(nome)) {
        if (s.s === -1 && s.t === 'congelado' && parte.gelo) continue;
        if (parte.k === 'bacalhau' && /calibre grande|maturado|cura longa/.test(s.t)) continue; // a parte dá o calibre e a cura ao pormenor
        q += s.s;
        if (s.s) porque.push((s.s > 0 ? '+ ' : '− ') + s.t);
    }
    const vistos = new Set();
    for (const [re, p, t, grupo = t] of parte.pontos) {
        if (!re.test(n)) continue;
        // num grupo (o calibre, a idade do Porto) só conta o primeiro, que é o melhor: «20 anos» não soma «10 anos»
        if (vistos.has(grupo)) continue;
        vistos.add(grupo);
        q += p;
        porque.push((p > 0 ? '+ ' : p < 0 ? '− ' : '· ') + t);
    }
    return { q, porque: porque.slice(0, 5) };
}

// no vinho (o da ceia, o Porto, o espumante), a nota manda: a dos críticos e dos concursos (vinho_nota, notas.js;
// 92 → +3, 88 → +1, 84 → −1) e a da Vivino nas garrafeiras online (4,2 ou mais → +2; 3,9 → +1; abaixo de 3,5 → −1)
export function notaVinho(notas, nome, vivino = null) {
    let q = 0;
    const porque = [];
    const nt = notas?.length ? notaDoProduto(notas, nome) : null;
    if (nt) { q += Math.round((nt.nota - 86) / 2); porque.push(`★ ${nt.nota} (${String(nt.resumo).split(' · ')[0]})`); }
    if (vivino) { q += vivino >= 4.2 ? 2 : vivino >= 3.9 ? 1 : vivino < 3.5 ? -1 : 0; porque.push(`Vivino ${String(vivino).replace('.', ',')}`); }
    return { q, porque, nt: nt?.nota ?? null };
}

// os litros de uma linha: a quantidade da embalagem (preco.q), ou o preço sobre o preço por litro, ou o nome («75cl»)
export function litrosDe(r) {
    if (r.ql > 0 && r.ub === 'l') return r.ql;
    if (r.uc > 0 && r.ub === 'l') return Math.round((r.cent / r.uc) * 100) / 100;
    const m = sem(`${r.emb ?? ''} ${r.nome}`).match(/(\d+(?:[.,]\d+)?)\s*(cl|ml|lt?)\b/);
    if (!m) return null;
    const v = Number(m[1].replace(',', '.'));
    return m[2] === 'cl' ? v / 100 : m[2] === 'ml' ? v / 1000 : v;
}
// no Natal só garrafas: 75 cl no vinho e no espumante; no Porto de 50 a 100 cl (nada de litros, garrafões, bag-in-box)
export function garrafaBoa(p, r) {
    const l = litrosDe(r);
    if (l == null) return false;
    return p.k === 'porto' ? l >= 0.45 && l <= 1.05 : Math.abs(l - 0.75) <= 0.02;
}

// o preço para comparar: o do quilo ou do litro, se faz sentido (um «por quilo» que daria mais de 25 kg na embalagem
// é um calibre mal lido: «SAPATEIRA 600/800 KG» a 0,02 €/kg); senão, o que se paga
export const ucBom = (o) => o.uc > 0 && (o.ub === 'kg' || o.ub === 'l') && o.uc * 25 >= o.cent;
const preco1 = (o) => (ucBom(o) ? o.uc : o.cent);
const mediana = (xs) => { const s = xs.filter((x) => x > 0).sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };

// ordena as opções de uma parte pelo modo e tira as repetidas (o mesmo nome na mesma cadeia)
export function ordenar(ops, modo) {
    const med = mediana(ops.map(preco1));
    const valor = (o) => {
        if (modo === 'preco') return -preco1(o);
        if (modo === 'qualidade') return o.q * 1000 - preco1(o) / 1000;
        // equilíbrio: cada ponto de qualidade vale um preço 35% acima da mediana
        return o.q - Math.log((preco1(o) || 1) / (med || 1)) / Math.log(1.35);
    };
    const vistos = new Set();
    return ops.filter((o) => o.q > -2).sort((a, b) => valor(b) - valor(a)).filter((o) => {
        const k = o.cadeia + '|' + sem(o.nome).replace(/\d+([,.]\d+)?\s*(kg|g|l|cl|ml)\b/g, '').trim();
        if (vistos.has(k)) return false;
        vistos.add(k);
        return true;
    });
}

// com um teto (cêntimos): troca, uma a uma, a opção que poupa mais por ponto perdido, até caber (ou não haver troca)
export function caberNoTeto(partes, teto) {
    const esc = partes.map(() => 0);
    const total = () => partes.reduce((s, p, i) => s + (p.opcoes[esc[i]]?.cent ?? 0), 0);
    for (let volta = 0; teto && total() > teto && volta < 40; volta++) {
        let melhor = null;
        partes.forEach((p, i) => {
            const a = p.opcoes[esc[i]];
            p.opcoes.forEach((b, j) => {
                if (!a || b.cent >= a.cent) return;
                const r = (a.cent - b.cent) / (Math.max(0, a.q - b.q) + 0.5);
                if (!melhor || r > melhor.r) melhor = { i, j, r };
            });
        });
        if (!melhor) break;
        esc[melhor.i] = melhor.j;
    }
    return { esc, total: total() };
}

// GET /api/natal?modo=&cadeias=a,b&teto=60&partes=bacalhau,porto
// as linhas candidatas guardam-se 6 horas na KV (por partes): a procura pelos nomes (LIKE) lê a tabela preco inteira,
// e o Cabaz abria-se muitas vezes (4 milhões de linhas lidas num dia, o limite grátis da D1 é 5 milhões)
const GUARDA_NATAL = 6 * 3600;
export async function cabazDeNatal(db, { modo = 'equilibrio', cadeias = null, teto = null, partes = null } = {}, agora = new Date(), kv = null) {
    if (!MODOS.includes(modo)) modo = 'equilibrio';
    const ps = PARTES.filter((p) => !partes?.length || partes.includes(p.k));
    const tipos = [...new Set(ps.flatMap((p) => p.tipos))];
    const likes = [...new Set(ps.flatMap((p) => p.like ?? []))];
    const desde = new Date(agora.getTime() - 10 * DIA).toISOString();
    const chave = `natal:linhas2:${ps.map((p) => p.k).sort().join(',')}`;
    let guardado = null;
    try { guardado = kv ? await kv.get(chave, 'json') : null; } catch { guardado = null; }
    let cat, prod;
    let notasL;
    if (guardado) ({ cat, prod, notasL = [] } = guardado);
    else {
        // os do tipo pelo índice (preco_tipo); os de nome (LIKE) numa só passagem pela tabela, com as condições juntas
        const porNome = likes.length ? `UNION SELECT cadeia, id, url, nome, marca, cent, antes, emb, uc, ub, tipo, propria, q AS ql FROM preco
            WHERE cent IS NOT NULL AND suspeito IS NULL AND visto > ?1 AND (${likes.map((_, i) => `lower(nome) LIKE ?${i + 3}`).join(' OR ')})` : '';
        const [a, b] = await db.batch([
            db.prepare(`SELECT cadeia, id, url, nome, marca, cent, antes, emb, uc, ub, tipo, propria, q AS ql FROM preco
                WHERE tipo IN (SELECT value FROM json_each(?2)) AND cent IS NOT NULL AND suspeito IS NULL AND visto > ?1
                ${porNome} LIMIT 3000`).bind(desde, JSON.stringify(tipos), ...likes),
            db.prepare(`SELECT loja AS cadeia, id, url, nome || CASE WHEN variante IS NOT NULL THEN ' ' || variante ELSE '' END AS nome,
                    cent, emb, uc, ub, tipo, vivino FROM produtor_artigo
                WHERE disponivel = 1 AND cent IS NOT NULL AND tipo IN (SELECT value FROM json_each(?1))`).bind(JSON.stringify(tipos)),
        ]);
        cat = { results: a.results ?? [] }; prod = { results: b.results ?? [] };
        notasL = (await db.prepare('SELECT palavras, fora, nota, resumo FROM vinho_nota').all()).results ?? [];
        try { if (kv) await kv.put(chave, JSON.stringify({ cat, prod, notasL }), { expirationTtl: GUARDA_NATAL }); } catch { /* sem guardar */ }
    }
    for (const r of cat.results ?? []) { const pc = pecaAoPeso(r); if (pc) Object.assign(r, pc); }
    const notas = prepararNotas(notasL ?? []);
    // as lojas de bacalhau não dizem «bacalhau» no nome («Especial», «Lombos Gourmet»): junta-se, para a parte o achar
    const todos = [...(cat.results ?? []), ...(prod.results ?? []).map((r) => ({ ...r, produtor: 1,
        nome: r.tipo === 'bacalhau' && !/bacalhau|paloco/i.test(r.nome) ? `Bacalhau ${r.nome}` : r.nome }))]
        .filter((r) => !cadeias?.length || r.produtor || cadeias.includes(r.cadeia));
    const saida = ps.map((p) => {
        const ops = todos.filter((r) => {
            const n = sem(r.nome);
            const doTipo = p.tipos.includes(r.tipo);
            return (doTipo || (p.inicio && p.inicio.test(n))) && p.quer.test(n) && (!p.peca || p.peca.test(n)) && !p.fora.test(n)
                && !(p.vinho && (NAO_SUGERIR.test(n) || !garrafaBoa(p, r)));
        }).map((r) => {
            let { q, porque } = pontosDe(p, r.nome);
            if (p.vinho) {
                const v = notaVinho(notas, r.nome, r.vivino); q += v.q; porque = [...v.porque, ...porque].slice(0, 5);
                // o tinto da ceia: só com nota dos críticos, Vivino de 3,8 ou mais, ou Reserva e acima (um tinto de
                // 0,99 € o litro não é para o Natal)
                if (p.k === 'vinho' && !v.nt && !(r.vivino >= 3.8) && !/\b(reserva|garrafeira)\b/.test(sem(r.nome))) return null;
            }
            const o = { cadeia: r.cadeia, id: String(r.id), nome: r.nome, url: r.url, cent: r.cent, emb: r.emb ?? null, uc: r.uc ?? null, ub: r.ub ?? null, q, porque, tipo: r.tipo };
            if (o.uc && !ucBom(o) && o.ub !== 'un') { delete o.uc; delete o.ub; }
            for (const c of ['emb', 'uc', 'ub']) if (o[c] == null) delete o[c]; // a app lê null como 0
            if (r.marca) o.marca = r.marca;
            if (r.propria) o.propria = 1;
            if (r.produtor) o.produtor = 1;
            if (r.antes && r.antes > r.cent) o.antes = r.antes;
            // no vinho compara-se a garrafa, não o litro
            if (p.vinho) { delete o.uc; delete o.ub; } // (sem o campo: a app lê null como 0)
            return o;
        }).filter(Boolean);
        return { k: p.k, nome: p.nome, icone: p.icone, n: ops.length, opcoes: ordenar(ops, modo).slice(0, 3) };
    });
    const centTeto = teto > 0 ? Math.round(teto * 100) : null;
    const { esc, total } = caberNoTeto(saida.filter((p) => p.opcoes.length), centTeto);
    saida.filter((p) => p.opcoes.length).forEach((p, i) => { p.escolha = esc[i]; });
    // o nome de cada tipo (a app junta a parte à lista como uma escolha desse tipo, para se poder ajustar)
    const ks = [...new Set(saida.flatMap((p) => p.opcoes.map((o) => o.tipo)).filter(Boolean))];
    const nomes = ks.length ? (await db.prepare('SELECT k, nome FROM tipo WHERE k IN (SELECT value FROM json_each(?1))').bind(JSON.stringify(ks)).all()).results : [];
    const tn = Object.fromEntries(nomes.map((r) => [r.k, r.nome]));
    for (const p of saida) for (const o of p.opcoes) o.tn = tn[o.tipo] ?? p.nome;
    return { modo, teto: centTeto, total, cabe: !centTeto || total <= centTeto, partes: saida, aviso: 'Pelo que o nome diz (calibre, cura, idade, DOP…): confirma o rótulo na loja.' };
}
