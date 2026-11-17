// «Está a chover?» contra a previsão (Meteo 1.26). Quando a pessoa diz «Não chove» e a previsão dava chuva (ou o
// contrário), a app explica porque a previsão dizia aquilo (os modelos, o radar, as estações) e a aprendizagem ajusta:
//   - as horas do aviso contam contra os modelos que erraram (learn.js, como já contavam: o aviso pesa 2× uma estação);
//   - o próprio local: com «Não chove» repetido quando se previa chuva (≥ 2 em 30 dias, em metade ou mais das vezes),
//     a chuva fraca deste ponto passa a contar menos (rainCalib → applyRainCalib, até −40%).
// O aviso leva o que a previsão dizia na hora (prev), para a conta se poder fazer depois (e para a análise do Claude).
// Funções puras: correm no telemóvel e no Node (tarefa agendada).

export const RAIN_REPORT = {
    wetP: 45,      // % a partir da qual a previsão «dava chuva» (o mesmo do ícone de chuva, RAIN_HOUR_P)
    dryP: 35,      // % abaixo da qual «não dava chuva»
    wetMm: 0.1,    // mm/h no «agora» que contam como chuva prevista
    minMiss: 2,    // avisos «Não chove» com chuva prevista, em 30 dias, para o local começar a corrigir
    minShare: 0.5, // e em pelo menos metade das vezes em que se previa chuva (os outros avisos confirmaram-na)
    full: 5,       // com 5 ou mais avisos destes, a correção é inteira
    maxCut: 0.4,   // no máximo, a chuva fraca conta 40% menos
    lightMm: 1,    // só nas horas de chuva fraca (< 1 mm/h): a chuva a sério não se tira
    days: 30, maxKm: 3, hours: 48,
};
const WET_KINDS = new Set(['chuva', 'chuva-forte', 'granizo', 'trovoada']);
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const r0 = (x) => (isNum(x) ? Math.round(x) : null);
const r1 = (x) => (isNum(x) ? Math.round(x * 10) / 10 : null);
const dec = (x) => String(r1(x)).replace('.', ',');

/** O que a previsão dizia agora, antes do aviso (vai com o aviso): { pop, mm, radar: 'chuva'|'seco'|null, code } */
export function forecastAt(fc) {
    if (!fc?.now) return null;
    const h0 = fc.hourly?.[0], steps = (fc.nowcast?.steps || []).slice(0, 2);
    const probs = [...steps.map((s) => s.prob), h0?.pop].filter(isNum);
    const R = fc.radar?.fresh && fc.radar.covered !== false ? fc.radar : null;
    return {
        pop: probs.length ? r0(Math.max(...probs)) : null,
        mm: r1(Math.max(fc.now.precip ?? 0, ...steps.map((s) => (isNum(s.precip) ? s.precip * 4 : 0)))),
        radar: R?.atPoint ? (R.atPoint.raining ? 'chuva' : 'seco') : null,
        code: isNum(fc.now.code) ? fc.now.code : null,
    };
}

/** A previsão (prev) dava chuva? true / false / null (não se sabe ou ficava no meio) */
export function saidRain(prev) {
    if (!prev || typeof prev !== 'object') return null;
    if ((isNum(prev.pop) && prev.pop >= RAIN_REPORT.wetP) || (isNum(prev.mm) && prev.mm >= RAIN_REPORT.wetMm) || (isNum(prev.code) && prev.code >= 50)) return true;
    if (isNum(prev.pop) && prev.pop < RAIN_REPORT.dryP && prev.radar !== 'chuva') return false;
    return null;
}

/** O aviso contradiz a previsão? 'seco' (dava chuva e não chove), 'chuva' (não dava e chove) ou null */
export function contradiction(kind, prev) {
    const s = saidRain(prev);
    if (kind === 'nao-chove' && s === true) return 'seco';
    if (WET_KINDS.has(kind) && s === false) return 'chuva';
    return null;
}

/** Limpa o prev que vem do telemóvel (para o conector guardar só números e palavras conhecidas) */
export function cleanPrev(p) {
    if (!p || typeof p !== 'object') return null;
    const n = (x, lo, hi) => (isNum(+x) && +x >= lo && +x <= hi ? r1(+x) : null);
    const out = { pop: n(p.pop, 0, 100), mm: n(p.mm, 0, 300), radar: ['chuva', 'seco'].includes(p.radar) ? p.radar : null, code: n(p.code, 0, 99) };
    return Object.values(out).some((v) => v != null) ? out : null;
}

/**
 * A correção do local: dos avisos dos últimos 30 dias (≤ 3 km) com o que a previsão dizia, quantos «Não chove» vieram
 * quando se previa chuva. Avisos na mesma hora contam uma vez (o último). → { factor, dry, n, days } ou null
 */
export function rainCalib(reports, { nowMs = Date.now() } = {}) {
    const C = RAIN_REPORT, byHour = new Map();
    for (const r of Array.isArray(reports) ? reports : []) {
        const t = Date.parse(r?.time);
        if (!isNum(t) || nowMs - t > C.days * 864e5 || t > nowMs + 6e5 || (isNum(r.distanceKm) && r.distanceKm > C.maxKm)) continue;
        if (saidRain(r.prev) !== true) continue;
        const h = Math.floor(t / 36e5), o = byHour.get(h);
        if (!o || Date.parse(o.time) < t) byHour.set(h, r);
    }
    const n = byHour.size, dry = [...byHour.values()].filter((r) => r.kind === 'nao-chove').length;
    if (dry < C.minMiss || dry / n < C.minShare) return null;
    const share = dry / n;
    return { factor: Math.round(Math.max(1 - C.maxCut, 1 - C.maxCut * share * Math.min(1, n / C.full)) * 100) / 100, dry, n, days: C.days };
}

/**
 * Aplica a correção do local às próximas 48 h: nas horas de chuva fraca (< 1 mm/h) a probabilidade baixa pelo fator; no
 * agora a 2 h (nowcast) também, salvo com o radar a ver chuva no ponto. A chuva a sério e os dias ficam como estão.
 */
export function applyRainCalib(fc, calib) {
    if (!fc || !calib || !(calib.factor < 1)) return fc;
    const C = RAIN_REPORT, f = calib.factor;
    const hourly = (fc.hourly || []).map((h, i) => (i < C.hours && isNum(h.pop) && !(h.precip >= C.lightMm) ? { ...h, pop: Math.round(h.pop * f) } : h));
    const radarWet = !!(fc.radar?.fresh && fc.radar.atPoint?.raining);
    const nowcast = fc.nowcast && !radarWet ? { ...fc.nowcast, steps: (fc.nowcast.steps || []).map((s) => (isNum(s.prob) && !(s.precip * 4 >= C.lightMm) ? { ...s, prob: Math.round(s.prob * f) } : s)) } : fc.nowcast;
    return { ...fc, hourly, nowcast, rainCalib: { ...calib, text: calibText(calib) } };
}
export const calibText = (c) => `Nos últimos ${c.days} dias disseste «Não chove» ${c.dry} ${c.dry === 1 ? 'vez' : 'vezes'} em ${c.n} em que a previsão dava chuva: aqui a chuva fraca conta ${Math.round((1 - c.factor) * 100)}% menos.`;

/**
 * Porque a previsão dizia o contrário do aviso. fc = a previsão antes do aviso (sem o aviso aplicado); reports = os
 * avisos do local (30 dias, com o novo). → { kind: 'seco'|'chuva', title, lines } ou null (o aviso confirma a previsão)
 */
export function explainReport(fc, report, reports = []) {
    const prev = report?.prev || forecastAt(fc);
    const kind = contradiction(report?.kind, prev);
    if (!kind || !fc) return null;
    const lines = [];
    const h0 = fc.hourly?.[0], R = fc.radar?.fresh && fc.radar.covered !== false ? fc.radar : null, O = fc.now?.obs;
    if (kind === 'seco') {
        lines.push(`A previsão dava ${isNum(prev.pop) ? `${prev.pop}% de chuva` : 'chuva'} agora${prev.mm >= 0.1 ? ` (${dec(prev.mm)} mm/h)` : ''}.`);
        if (isNum(h0?.agree)) lines.push(h0.agree >= 0.6 ? 'Os modelos estavam quase todos de acordo.' : h0.agree < 0.3 ? 'Os modelos estavam divididos: uns davam chuva, outros não.' : 'A maior parte dos modelos dava chuva.');
    } else {
        lines.push(`A previsão não dava chuva agora (${isNum(prev.pop) ? `${prev.pop}%` : 'pouca probabilidade'}).`);
    }
    // o radar: no ponto e à volta (anéis de 5, 15, 30 e 60 km)
    let near = null;
    if (R?.atPoint) {
        const ring = (R.rings || []).findIndex((r) => (r.wet ?? 0) >= 0.05);
        const from = ring > 0 ? R.rings[ring - 1].km : 0, to = ring >= 0 ? R.rings[ring].km : null;
        if (R.atPoint.raining) lines.push(`O radar via chuva no ponto (${dec(R.atPoint.mmh)} mm/h, há ${R.ageMin ?? '?'} min).`);
        else if (to != null) { near = to; lines.push(`O radar não via chuva no ponto; a mais perto estava entre ${from} e ${to} km${R.approach ? (R.approach.passed ? ', e já devia ter chegado' : `, a chegar daqui a ~${R.approach.etaMin} min`) : ''}.`); }
        else lines.push('O radar não via chuva a menos de 60 km.');
    } else lines.push('Sem radar para este ponto agora.');
    // as estações perto (a última hora)
    if (isNum(O?.precip1h)) lines.push(O.precip1h > 0 ? `As estações perto mediram ${dec(O.precip1h)} mm na última hora.` : `As estações perto (${O.n || 1}) não mediram chuva na última hora.`);
    // o veredicto
    if (kind === 'seco') {
        const dryRadar = R?.atPoint && !R.atPoint.raining, dryObs = !(O?.precip1h > 0);
        lines.push(dryRadar && near != null && near <= 15 ? 'Havia chuva perto: passou ao lado do ponto.'
            : dryRadar && dryObs ? 'Os modelos deram chuva que não estava a cair: um falso alarme.'
                : 'Os modelos davam chuva fraca que aqui não chegou.');
        lines.push('Fica na aprendizagem: as horas de hoje contam contra os modelos que davam chuva, e esses perdem peso na chuva deste local.');
        const c = rainCalib(reports);
        lines.push(c ? calibText(c) : `Se voltar a acontecer (${RAIN_REPORT.minMiss} vezes em ${RAIN_REPORT.days} dias), a chuva fraca aqui passa a contar menos.`);
    } else {
        lines.push(R?.atPoint && !R.atPoint.raining ? 'O radar não a apanhava: chuva fraca ou de nuvens baixas, que o radar e os modelos falham.' : 'Os modelos não a davam.');
        lines.push('Fica na aprendizagem: as horas de hoje contam contra os modelos que não davam chuva.');
    }
    return { kind, title: kind === 'seco' ? 'Porque dizia chuva' : 'Porque não dizia chuva', lines };
}
