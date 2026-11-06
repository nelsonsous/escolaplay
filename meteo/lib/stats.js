// Funções matemáticas e geográficas (sem dependências).
export const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const round = (x, d = 0) => (isNum(x) ? Math.round(x * 10 ** d) / 10 ** d : null);
export const r1 = (x) => round(x, 1);
export const r0 = (x) => round(x, 0);

export function wmean(vals, ws) {
    let s = 0, sw = 0;
    for (let i = 0; i < vals.length; i++) {
        const v = vals[i], w = ws ? ws[i] : 1;
        if (isNum(v) && w > 0) { s += v * w; sw += w; }
    }
    return sw > 0 ? s / sw : null;
}

export function wstd(vals, ws) {
    const m = wmean(vals, ws);
    if (m == null) return null;
    let s = 0, sw = 0;
    for (let i = 0; i < vals.length; i++) {
        const v = vals[i], w = ws ? ws[i] : 1;
        if (isNum(v) && w > 0) { s += w * (v - m) ** 2; sw += w; }
    }
    return Math.sqrt(s / sw);
}

// Quantil ponderado com interpolação entre os pontos médios de cada peso
export function wquantile(vals, ws, q) {
    const p = [];
    for (let i = 0; i < vals.length; i++) {
        const v = vals[i], w = ws ? ws[i] : 1;
        if (isNum(v) && w > 0) p.push([v, w]);
    }
    if (!p.length) return null;
    if (p.length === 1) return p[0][0];
    p.sort((a, b) => a[0] - b[0]);
    const total = p.reduce((s, x) => s + x[1], 0);
    const target = q * total;
    let cum = 0, prevPos = null, prevVal = null;
    for (const [v, w] of p) {
        const pos = cum + w / 2;
        if (pos >= target) {
            if (prevPos == null) return v;
            const f = (target - prevPos) / (pos - prevPos);
            return prevVal + f * (v - prevVal);
        }
        prevPos = pos; prevVal = v; cum += w;
    }
    return p[p.length - 1][0];
}

export const wmedian = (vals, ws) => wquantile(vals, ws, 0.5);

// Máscara robusta: rejeita valores a mais de max(minTol, 3·MAD) da mediana ponderada
export function robustKeep(vals, ws, minTol) {
    const m = wmedian(vals, ws);
    if (m == null) return vals.map(() => false);
    const dev = vals.map((v) => (isNum(v) ? Math.abs(v - m) : null));
    const mad = wmedian(dev, ws) || 0;
    const tol = Math.max(minTol, 3 * 1.4826 * mad);
    return vals.map((v, i) => isNum(v) && dev[i] <= tol);
}

export function robustMean(vals, ws, minTol) {
    const keep = robustKeep(vals, ws, minTol);
    return wmean(vals, ws.map((w, i) => (keep[i] ? w : 0)));
}

// Fração ponderada de valores ≥ limiar (0..1)
export function wfrac(vals, ws, thr) {
    let hit = 0, sw = 0;
    for (let i = 0; i < vals.length; i++) {
        const v = vals[i], w = ws ? ws[i] : 1;
        if (isNum(v) && w > 0) { sw += w; if (v >= thr) hit += w; }
    }
    return sw > 0 ? hit / sw : null;
}

export function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371, t = Math.PI / 180;
    const dLat = (lat2 - lat1) * t, dLon = (lon2 - lon1) * t;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * t) * Math.cos(lat2 * t) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
}

// Rumo do ponto 1 para o ponto 2 (graus, 0 = norte)
export function bearing(lat1, lon1, lat2, lon2) {
    const t = Math.PI / 180;
    const y = Math.sin((lon2 - lon1) * t) * Math.cos(lat2 * t);
    const x = Math.cos(lat1 * t) * Math.sin(lat2 * t) - Math.sin(lat1 * t) * Math.cos(lat2 * t) * Math.cos((lon2 - lon1) * t);
    return ((Math.atan2(y, x) / t) + 360) % 360;
}

export const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
export const compass = (deg) => (isNum(deg) ? COMPASS[Math.round((((deg % 360) + 360) % 360) / 45) % 8] : null);
// "de onde sopra" em português
export const WIND_FROM = { N: 'norte', NE: 'nordeste', E: 'leste', SE: 'sueste', S: 'sul', SO: 'sudoeste', O: 'oeste', NO: 'noroeste' };

// Direção média vetorial (ponderada pela intensidade)
export function vecDir(dirs, speeds, ws) {
    let u = 0, v = 0, n = 0;
    for (let i = 0; i < dirs.length; i++) {
        const d = dirs[i], s = speeds ? speeds[i] : 1, w = ws ? ws[i] : 1;
        if (!isNum(d) || !(w > 0)) continue;
        const k = (isNum(s) ? Math.max(s, 0.1) : 1) * w;
        u += k * Math.sin((d * Math.PI) / 180); v += k * Math.cos((d * Math.PI) / 180); n++;
    }
    if (!n) return null;
    return ((Math.atan2(u, v) * 180) / Math.PI + 360) % 360;
}

// Ponto de orvalho (Magnus) e humidade relativa
export function dewPoint(t, rh) {
    if (!isNum(t) || !isNum(rh) || rh <= 0) return null;
    const a = 17.625, b = 243.04;
    const g = Math.log(rh / 100) + (a * t) / (b + t);
    return (b * g) / (a - g);
}
export function relHum(t, td) {
    if (!isNum(t) || !isNum(td)) return null;
    const a = 17.625, b = 243.04;
    return clamp(100 * Math.exp((a * td) / (b + td) - (a * t) / (b + t)), 0, 100);
}
