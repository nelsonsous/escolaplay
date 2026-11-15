// As notas dos vinhos (volta 11): o que dizem os críticos (Revista de Vinhos, Grandes Escolhas, Wine Spectator…) e os
// concursos (Concurso Vinhos de Portugal, Decanter, IWC…), recolhidas pelo Ecónomo na web, com a fonte e a ligação
// (economo/notas.mjs grava-as na tabela vinho_nota). O rótulo diz o que o produtor quer («Signature», «Premium»);
// a nota diz o que outros acharam. Sem fonte não há nota: nunca se inventa.
import { palavras } from './sugerir.js';

// os concursos que dão medalhas a quase todos contam menos
const GENEROSOS = /challenge international du vin|uva de ouro|berliner|sakura|gilbert|awc|vienna|asia wine|frankfurt|china wine|catavinum|selections mondiales|mundus/i;
const MEDALHA = [[/grande? ouro|grand gold|platin|trof|trophy|best in show|double gold|duplo ouro/i, 94], [/ouro|gold|or\b/i, 91],
    [/prata|silver|argent/i, 88], [/bronze/i, 85], [/commended|mencao|menção|recomendad/i, 83]];

// uma fonte em pontos de 0 a 100: «17/20» (a Revista de Vinhos), «91 pts», «Ouro 92 pts», «Prata»
export function pontosDaFonte(f) {
    const v = String(f?.valor ?? '');
    let p = null;
    const vinte = v.match(/(\d{1,2}(?:[.,]\d)?)\s*\/\s*20\b/);
    const cem = v.match(/\b(\d{2,3})(?:[.,]\d)?\s*(?:\/\s*100|pts?|pontos|points|p\b)/i) ?? v.match(/^\s*(\d{2,3})\s*$/);
    if (vinte) p = Math.min(100, Number(vinte[1].replace(',', '.')) * 3 + 40); // 16 → 88, 17 → 91, 18 → 94
    else if (cem && Number(cem[1]) >= 70 && Number(cem[1]) <= 100) p = Number(cem[1]);
    else if (f?.tipo === 'concurso') p = MEDALHA.find(([r]) => r.test(v))?.[1] ?? null;
    if (p == null) return null;
    if (f.tipo === 'concurso' && GENEROSOS.test(String(f.fonte ?? ''))) p -= 2;
    return p;
}

// a nota de um vinho: a média pesada das fontes (um crítico vale mais do que uma medalha; uma colheita com mais de
// 6 anos vale metade; só colheitas com mais de 8 anos, 2 pontos a menos). { nota, n, resumo } ou null
export function notaDasFontes(fontes, ano = new Date().getFullYear()) {
    let soma = 0, pesos = 0;
    const usadas = [];
    for (const f of fontes ?? []) {
        const p = pontosDaFonte(f);
        if (p == null) continue;
        let w = f.tipo === 'critico' ? 1 : 0.6;
        if (f.colheita && ano - Number(f.colheita) > 6) w /= 2;
        soma += p * w; pesos += w;
        usadas.push({ f, w });
    }
    if (!pesos) return null;
    // só colheitas com mais de 8 anos: o vinho de hoje pode já não ser o mesmo (2 pontos a menos)
    const anos = usadas.map(({ f }) => Number(f.colheita)).filter(Boolean);
    const velha = anos.length === usadas.length && ano - Math.max(...anos) > 8 ? 2 : 0;
    usadas.sort((a, b) => b.w - a.w);
    const resumo = usadas.slice(0, 2).map(({ f }) => `${f.fonte} ${f.valor}`.trim()).join(' · ');
    return { nota: Math.round(soma / pesos) - velha, n: usadas.length, resumo };
}

// as palavras de gama: um produto com uma destas só condiz com uma nota que a tenha (o Reserva não herda a nota do
// vinho de entrada, nem o Grande Reserva a do Reserva)
const GAMAS = ['reserva', 'grande', 'garrafeira', 'privado', 'especial', 'superior', 'escolha', 'selecionada', 'seleccionada', 'velha', 'vinha'];
const conjunto = (s) => new Set(palavras(s));

// prepara as linhas da tabela vinho_nota para procurar: [{ w (palavras), fora, nota, n, resumo }]
export const prepararNotas = (linhas) => linhas.map((l) => ({ ...l, w: [...conjunto(l.palavras)], fora: [...conjunto(l.fora)] }))
    .filter((l) => l.w.length);

// a nota que condiz com o nome de um produto: a regra com mais palavras, todas no nome, nenhuma de fora, e sem
// palavras de gama no nome que a regra não tenha
export function notaDoProduto(notas, nome) {
    const n = conjunto(nome);
    let melhor = null;
    for (const r of notas) {
        if (!r.w.every((w) => n.has(w)) || r.fora.some((w) => n.has(w))) continue;
        if (GAMAS.some((g) => n.has(g) && !r.w.includes(g))) continue;
        if (!melhor || r.w.length > melhor.w.length) melhor = r;
    }
    return melhor;
}
