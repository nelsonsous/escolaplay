// A localidade e as lojas da casa (volta 6). A casa diz onde mora (texto: a localidade ou o código postal) e em que
// cadeias compra; no SPAR, que tem lojas de bairro com preços próprios, escolhe a loja (da lista das lojas SPAR, que o
// Ecónomo lê da página das lojas e guarda na KV: lojas:spar). As comparações da app só contam com estas lojas.
import { Erro } from './casa.js';

export const CADEIAS_CASA = ['continente', 'pingodoce', 'auchan', 'lidl', 'mercadona', 'spar'];
const sem = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// as lojas SPAR da página das lojas: [{ n: nome, r: rua, cp, l: localidade }]
export function lerLojasSpar(html) {
    const t = String(html).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, '\n')
        .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ');
    const ls = t.split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
    const out = [];
    for (let i = 0; i + 2 < ls.length; i++) {
        const m = ls[i + 2].match(/^(\d{4}-\d{3}) (.+)$/);
        if (ls[i].startsWith('SPAR') && m) out.push({ n: ls[i], r: ls[i + 1].replace(/,$/, ''), cp: m[1], l: m[2] });
    }
    return out;
}

// as lojas SPAR de uma localidade (ou código postal): as que a têm no nome, na localidade ou no código postal
export function lojasDe(lojas, q, max = 20) {
    const w = sem(q).trim();
    if (w.length < 2) return [];
    const cp = w.replace(/\D/g, '');
    return lojas.filter((l) => sem(`${l.n} ${l.l}`).includes(w) || (cp.length >= 4 && l.cp.replace('-', '').startsWith(cp.slice(0, 7)))).slice(0, max);
}

export function lojasDaCasa(corpo) {
    const local = String(corpo?.local ?? '').replace(/\s+/g, ' ').trim().slice(0, 60);
    const cadeias = Array.isArray(corpo?.cadeias) ? [...new Set(corpo.cadeias.filter((c) => CADEIAS_CASA.includes(c)))] : null;
    if (cadeias && !cadeias.length) throw new Erro(400, 'escolhe pelo menos uma loja');
    const spar = corpo?.spar ? String(corpo.spar).trim().slice(0, 80) : null;
    return { local: local || null, lojas: cadeias ? { cadeias, ...(spar ? { spar } : {}) } : null };
}
