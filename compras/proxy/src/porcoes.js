// O tamanho certo para a casa (volta 12). No talho e na peixaria, o mais barato ao quilo é muitas vezes o pacote de 2 kg:
// para 2 pessoas não faz sentido. Com o número de pessoas da casa, o mais barato escolhe-se entre as embalagens até
// um limite (2 refeições de 200 g por pessoa: 2 pessoas, 800 g); se nenhuma couber, o mais barato de todas. Escolher
// outra à mão continua a poder-se.
import { TALHO } from './etiquetas.js';

export const POR_PESSOA = 400; // gramas: duas refeições de 200 g

// o limite em gramas para o tipo k e a casa, ou null (sem pessoas, ou um tipo onde não conta)
export function limiteGramas(k, pessoas) {
    const n = Number(pessoas);
    if (!TALHO.has(k) || !(n >= 1)) return null;
    return Math.max(POR_PESSOA, Math.round(n) * POR_PESSOA);
}

// o peso de uma embalagem em gramas: pela quantidade na unidade (q em kg) ou pelo texto («500 g», «1,2 kg», «≈ 1,8 kg»)
export function gramasDe(p) {
    if (p.ub === 'kg' && Number(p.q) > 0 && !p.aq) return Math.round(Number(p.q) * 1000);
    const m = String(p.emb ?? '').match(/(\d+(?:[.,]\d+)?)\s*(kg|g)\b/i);
    if (!m) return null;
    const v = Number(m[1].replace(',', '.'));
    return Math.round(m[2].toLowerCase() === 'kg' ? v * 1000 : v);
}

// cabe no limite? (sem peso conhecido, cabe)
export const cabe = (p, lim) => !lim || !(gramasDe(p) > lim);
