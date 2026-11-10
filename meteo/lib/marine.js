// O mar perto do ponto (Open-Meteo Marine): temperatura da água e ondas, agora e nos próximos dias. Só conta se a célula
// de mar mais perto estiver a ≤ 12 km (um ponto na praia ou na costa); no interior, nada.
import { isNum } from './stats.js';

export const SEA_MAX_KM = 12;
const distKm = (a, b, c, d) => {
    const R = 6371, rad = Math.PI / 180;
    const x = Math.sin(((c - a) * rad) / 2) ** 2 + Math.cos(a * rad) * Math.cos(c * rad) * Math.sin(((d - b) * rad) / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
};
/** Como se sente a água (para um banho): muito fria … quente. */
export function waterFeel(t) {
    if (!isNum(t)) return '';
    return t < 14 ? 'muito fria' : t < 17 ? 'fria' : t < 19 ? 'fresca' : t < 22 ? 'agradável' : t < 25 ? 'amena' : 'quente';
}
/** Estado do mar pela altura das ondas (m), como os avisos do IPMA. */
export function seaState(h) {
    if (!isNum(h)) return '';
    return h < 0.5 ? 'mar calmo' : h < 1.25 ? 'ondas pequenas' : h < 2.5 ? 'ondulação moderada' : h < 4 ? 'mar agitado' : 'mar muito agitado';
}
const r1 = (x) => (isNum(x) ? Math.round(x * 10) / 10 : null);

/**
 * Resumo do mar: { distanceKm, cell, now: { sst, wave, period, dir, swell }, days: [{ date, sstMin, sstMax, waveMax, period, dir }] }
 * ou null (sem dados, ou mar longe). nowIso: a hora local atual 'AAAA-MM-DDTHH:MM' (como o hourly da Open-Meteo).
 */
export function marineSummary(raw, { lat, lon, nowIso } = {}) {
    const H = raw?.hourly;
    if (!H?.time?.length || !isNum(raw.latitude) || !isNum(raw.longitude)) return null;
    const d = distKm(lat, lon, raw.latitude, raw.longitude);
    if (!(d <= SEA_MAX_KM)) return null;
    const T = H.sea_surface_temperature || [];
    if (!T.some(isNum)) return null;
    // a hora atual (ou a primeira com dados a seguir)
    const key = (nowIso || '').slice(0, 13);
    let i = Math.max(0, H.time.findIndex((t) => t.slice(0, 13) >= key));
    while (i < H.time.length - 1 && !isNum(T[i])) i++;
    const now = { sst: r1(T[i]), wave: r1(H.wave_height?.[i]), period: r1(H.wave_period?.[i]), dir: H.wave_direction?.[i] ?? null, swell: r1(H.swell_wave_height?.[i]) };
    const byDay = new Map();
    H.time.forEach((t, k) => {
        const day = t.slice(0, 10);
        if (!byDay.has(day)) byDay.set(day, []);
        if (isNum(T[k])) byDay.get(day).push(T[k]);
    });
    const D = raw.daily || {};
    const days = [...byDay.entries()].filter(([, v]) => v.length).map(([date, v]) => {
        const j = (D.time || []).indexOf(date);
        return { date, sstMin: r1(Math.min(...v)), sstMax: r1(Math.max(...v)), waveMax: r1(D.wave_height_max?.[j]), period: r1(D.wave_period_max?.[j]), dir: D.wave_direction_dominant?.[j] ?? null };
    });
    return { distanceKm: r1(d), cell: { lat: raw.latitude, lon: raw.longitude }, now, days };
}
