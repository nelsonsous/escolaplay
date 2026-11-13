// Os números do Claude (máxima, mínima e chuva de cada dia) verificados contra o que se observou e contra o consenso dos
// modelos da mesma altura. Quem erra menos ganha peso na mistura (lib/engine.js: withClaude): parte de metade para cada
// um e afasta-se com os dias de prova, sem sair de 20%–80%. As rajadas não têm observação fiável: ficam a meias.
// Funções puras: correm na tarefa agendada (Node) e nos testes.
import { isNum, clamp } from './stats.js';

export const NUMS = {
    keepDays: 90, halfLife: 21, // memória e meia-vida (dias), como na aprendizagem dos modelos
    n0: 6, // dias de prova para o peso andar metade do caminho
    wMin: 0.2, wMax: 0.8, w0: 0.5,
    floor: { tmax: 0.3, tmin: 0.3, chuva: 0.2 }, // erro mínimo considerado (°C; chuva em raiz de mm)
    noonHour: 12, // os números para o próprio dia só contam se saíram antes do meio-dia
};
export const NUM_VARS = ['tmax', 'tmin', 'chuva'];
const DAY = 864e5;
const dateDiff = (a, b) => Math.round((Date.parse(a + 'T00:00:00Z') - Date.parse(b + 'T00:00:00Z')) / DAY);
const r2 = (x) => Math.round(x * 100) / 100;
// a chuva compara-se na raiz (um dia de 40 mm não manda em tudo)
const err = (v, a, b) => (v === 'chuva' ? Math.abs(Math.sqrt(Math.max(0, a)) - Math.sqrt(Math.max(0, b))) : Math.abs(a - b));
const pick = (list, date) => (Array.isArray(list) ? list.find((x) => x?.data === date) : null) || null;
const vals = (x) => (x ? { tmax: x.tmax ?? null, tmin: x.tmin ?? null, chuva: x.chuva ?? null } : null);

/**
 * Junta à memória os dias já observados: para cada dia e prazo (0 = o próprio dia, 1 = véspera, 2 = dois dias antes) ficam
 * os números do Claude, os do consenso guardados com essa análise e o observado. Vale a última análise de cada prazo.
 * issues: [{ generatedAt, numeros: [{ data, tmax, tmin, chuva }], consenso: [{ data, tmax, tmin, chuva }] }]
 * observed: [{ date, tmax, tmin, rain, nR }] (lib/engine.js: fc.observed.days)
 * → { v: 1, days: { 'AAAA-MM-DD': { o: { tmax, tmin, chuva }, f: { '1': { at, c: {...}, m: {...} } } } } }
 */
export function verifyNumbers(memory, issues, observed, { off = 0, today = null, keepDays = NUMS.keepDays } = {}) {
    const days = { ...(memory?.days || {}) };
    const local = (iso) => new Date(Date.parse(iso) + off * 1000).toISOString();
    for (const ob of Array.isArray(observed) ? observed : []) {
        if (!ob?.date) continue;
        const o = { tmax: isNum(ob.tmax) ? ob.tmax : null, tmin: isNum(ob.tmin) ? ob.tmin : null, chuva: isNum(ob.rain) && (ob.nR ?? 2) >= 2 ? ob.rain : null };
        if (!NUM_VARS.some((v) => isNum(o[v]))) continue;
        const f = { ...(days[ob.date]?.f || {}) };
        for (const is of Array.isArray(issues) ? issues : []) {
            if (!is?.generatedAt || !Number.isFinite(Date.parse(is.generatedAt))) continue;
            const c = vals(pick(is.numeros, ob.date)), m = vals(pick(is.consenso, ob.date));
            if (!c || !m) continue;
            const at = local(is.generatedAt), L = dateDiff(ob.date, at.slice(0, 10));
            if (L < 0 || L > 2 || (L === 0 && Number(at.slice(11, 13)) >= NUMS.noonHour)) continue;
            if (!f[L] || is.generatedAt > f[L].at) f[L] = { at: is.generatedAt, c, m };
        }
        if (Object.keys(f).length) days[ob.date] = { o, f };
    }
    const kept = Object.fromEntries(Object.entries(days).filter(([d]) => !today || (dateDiff(today, d) < keepDays && dateDiff(today, d) >= 0)).sort(([a], [b]) => a.localeCompare(b)));
    return { v: 1, days: kept };
}

/** Erro acumulado (dias recentes pesam mais) de cada variável: { n, days, claude, modelos, vies: { claude, modelos } } */
export function numbersSkill(memory, { today = null, halfLife = NUMS.halfLife } = {}) {
    const out = {};
    const dates = Object.keys(memory?.days || {}).sort();
    const ref = today || dates[dates.length - 1];
    for (const v of NUM_VARS) {
        let n = 0, sc = 0, sm = 0, bc = 0, bm = 0, k = 0;
        for (const date of dates) {
            const d = memory.days[date], o = d?.o?.[v];
            if (!isNum(o)) continue;
            const r = 0.5 ** (Math.max(0, dateDiff(ref, date)) / halfLife);
            for (const f of Object.values(d.f || {})) {
                const c = f?.c?.[v], m = f?.m?.[v];
                if (!isNum(c) || !isNum(m)) continue;
                n += r; k++; sc += r * err(v, c, o); sm += r * err(v, m, o); bc += r * (c - o); bm += r * (m - o);
            }
        }
        out[v] = n > 0 ? { n: r2(n), amostras: k, claude: r2(sc / n), modelos: r2(sm / n), vies: { claude: r2(bc / n), modelos: r2(bm / n) } } : null;
    }
    return out;
}

/**
 * O peso dos números do Claude em cada variável (0,2 a 0,8; 0,5 = a meias): erro dos modelos / (erro dos modelos + erro
 * do Claude), puxado para 0,5 enquanto há poucos dias de prova. → { tmax, tmin, chuva, rajada, n }
 */
export function claudeWeights(memory, opts = {}) {
    const sk = numbersSkill(memory, opts), w = { rajada: NUMS.w0 };
    let nMax = 0;
    for (const v of NUM_VARS) {
        const s = sk[v];
        if (!s) { w[v] = NUMS.w0; continue; }
        const fl = NUMS.floor[v], raw = (s.modelos + fl) / (s.modelos + s.claude + 2 * fl);
        w[v] = r2(clamp(NUMS.w0 + (raw - NUMS.w0) * (s.n / (s.n + NUMS.n0)), NUMS.wMin, NUMS.wMax));
        nMax = Math.max(nMax, s.amostras);
    }
    return { ...w, n: nMax };
}

/** Linhas para o resumo da tarefa: como correram os números anteriores do Claude e o peso que têm agora. */
export function numbersReport(memory, { today = null, last = 6 } = {}) {
    const dates = Object.keys(memory?.days || {}).sort().slice(-last);
    if (!dates.length) return ['Ainda sem números verificados: a primeira verificação faz-se quando um dia com números teus acabar e houver observações das estações.'];
    const f1 = (x) => (isNum(x) ? (Math.round(x * 10) / 10).toFixed(1) : '—');
    const L = ['dia (prazo) | máxima: tu / modelos → observado | mínima: tu / modelos → observado | chuva mm: tu / modelos → observado'];
    for (const date of dates) {
        const d = memory.days[date];
        for (const [lead, f] of Object.entries(d.f || {}).sort()) {
            L.push(`${date} (${['no próprio dia', 'na véspera', '2 dias antes'][lead] || lead}) | ${NUM_VARS.map((v) => `${f1(f.c[v])} / ${f1(f.m[v])} → ${f1(d.o[v])}`).join(' | ')}`);
        }
    }
    const sk = numbersSkill(memory, { today }), w = claudeWeights(memory, { today });
    const nm = { tmax: 'máxima', tmin: 'mínima', chuva: 'chuva' };
    const parts = NUM_VARS.filter((v) => sk[v]).map((v) => `${nm[v]}: tu ${f1(sk[v].claude)}${v === 'chuva' ? ' (raiz de mm)' : ' °C'}, modelos ${f1(sk[v].modelos)} → peso ${Math.round(w[v] * 100)}%`);
    if (parts.length) L.push(`Erro médio e o peso dos teus números na app (50% = a meias com os modelos; sobe quando erras menos do que eles): ${parts.join('; ')}.`);
    return L;
}
