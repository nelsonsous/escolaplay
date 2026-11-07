// Radar no ponto (RainViewer): as imagens de radar das últimas 2 h, lidas píxel a píxel à volta do ponto.
// Funções puras (sem rede; correm no browser e no Node): endereços das imagens, cor → dBZ (esquema "Universal
// Blue"), dBZ → mm/h (Marshall-Palmer, Z = 200·R^1,6), o ponto, os anéis à volta, o eco mais próximo, o deslocamento
// dos ecos entre imagens e a hora de chegada ao ponto (persistência lagrangiana). Formato em docs/API.md → "radar".
import { isNum, clamp, compass, WIND_FROM } from './stats.js';

export const RAINVIEWER = { maps: 'https://api.rainviewer.com/public/weather-maps.json', host: 'https://tilecache.rainviewer.com' };
export const RADAR = {
    z: 7, size: 256,          // uma imagem centrada no ponto por hora de radar: z7 ≈ 0,92 km por píxel a 41° N (±117 km)
    frames: 13, stepMin: 10,  // últimas 2 h, de 10 em 10 min
    maxAgeMin: 20,            // imagem mais velha do que isto não mexe no "agora"
    wetMmh: 0.1,              // chove a partir de 0,1 mm/h (≈ 7 dBZ), na média de 3×3 píxeis (~2,8 km) à volta do ponto
    nearKm: 40,               // eco mais próximo até 40 km
    boxKm: 60,                // deslocamento dos ecos: caixa de ±60 km à volta do ponto
    maxKmh: 90,               // deslocamento máximo procurado
    aheadMin: 120, aheadStep: 5,
    capDbz: 55,               // acima disto (granizo, ecos fixos) o mm/h deixa de crescer (~100 mm/h)
    rings: [5, 15, 30, 60],   // anéis à volta do ponto (km)
};
export const NO_ECHO = -128;

// ---------- endereços ----------
const c4 = (x) => String(Math.round(x * 1e4) / 1e4);
const HOST_RE = /^https:\/\/[a-z0-9.-]+\.rainviewer\.com$/;
/** Imagem centrada no ponto. smooth=0 e snow=0: cores exatas da tabela e toda a precipitação na escala da chuva. */
export const radarTileUrl = (host, path, lat, lon, { size = RADAR.size, z = RADAR.z, smooth = 0, snow = 0 } = {}) =>
    `${host}${path}/${size}/${z}/${c4(lat)}/${c4(lon)}/2/${smooth}_${snow}.png`;
/** Cobertura do radar (transparente = coberto; preto = sem radar). */
export const coverageUrl = (host, lat, lon, { size = RADAR.size, z = RADAR.z } = {}) => `${host}/v2/coverage/0/${size}/${z}/${c4(lat)}/${c4(lon)}/0/0_0.png`;
/** weather-maps.json → { host, frames: [{ ms, path }] } (as últimas 13, da mais antiga para a mais recente). */
export function radarFrames(maps, max = RADAR.frames) {
    const host = HOST_RE.test(maps?.host || '') ? maps.host : RAINVIEWER.host;
    const past = (Array.isArray(maps?.radar?.past) ? maps.radar.past : [])
        .filter((f) => isNum(f?.time) && typeof f.path === 'string' && /^\/v2\/radar\/[\w-]+$/.test(f.path))
        .map((f) => ({ ms: f.time * 1000, path: f.path })).sort((a, b) => a.ms - b.ms);
    return { host, frames: past.slice(-max) };
}

// ---------- cor → dBZ → mm/h ----------
// Esquema "Universal Blue": as imagens gratuitas vêm sempre nele, qualquer que seja a cor pedida. Uma cor por dBZ,
// de −10 a 64 dBZ (tabela oficial rainviewer_api_colors_table.csv, coluna Universal Blue, chuva); 65–74 dBZ a branco;
// ≥ 75 dBZ a verde (fora da escala da chuva: ignorado). Os níveis fracos (−10 a 14 dBZ) são semitransparentes e cada
// um tem a sua opacidade (20, 25, … 190), que o canvas guarda sem perdas mesmo quando arredonda as cores.
const UB = ('63615914 66635a19 69665c1e 6c685d24 6f6b5f29 726e612e 75706234 78736439 7c75653e 7f786744 827b6949 857d6a4e '
    + '88806c54 8b826d59 8e856f5e 92887164 9e93756e aa9e7978 b6a97e82 c2b4828c cec08796 d2c48ba0 d6c88faa dacc93b4 ded097be '
    + '88ddeeff 6cd1ebff 51c5e8ff 36bae5ff 1baee2ff 00a3e0ff 009ad5ff 0091caff 0088bfff 007fb4ff 0077aaff 0070a3ff 00699cff '
    + '006295ff 005b8eff 005588ff 005180ff 004e78ff 004a70ff 004768ff ffee00ff ffe000ff ffd200ff ffc500ff ffb700ff ffaa00ff '
    + 'ff9f00ff ff9500ff ff8b00ff ff8100ff ff4400ff f23600ff e62800ff d91b00ff cd0d00ff c10000ff a80000ff 8f0000ff 760000ff '
    + '5d0000ff ffaaffff ff9fffff ff95ffff ff8bffff ff81ffff ff77ffff ff6cffff ff62ffff ff58ffff ff4effff').split(' ');
const OPAQUE = new Map(), ALPHA = [];
UB.forEach((h, i) => {
    const v = parseInt(h, 16) >>> 0, a = v & 255;
    if (a === 255) OPAQUE.set(v >>> 8, i - 10); else ALPHA.push([a, i - 10]);
});
OPAQUE.set(0xffffff, 65);
const GREEN = 0x00ff00;
/** Cor da tabela (RGBA) de um dBZ, para os testes e a legenda: [r, g, b, a] ou null. */
export function dbzColor(dbz) {
    const h = UB[Math.round(dbz) + 10];
    return h ? [0, 2, 4, 6].map((k) => parseInt(h.slice(k, k + 2), 16)) : dbz >= 65 && dbz < 75 ? [255, 255, 255, 255] : null;
}
/** Cor de um píxel → dBZ (null = sem eco ou cor fora da tabela). Tolera o arredondamento do canvas e algum ruído. */
export function colorToDbz(r, g, b, a) {
    if (!(a >= 12)) return null;
    if (a < 236) {
        let best = null, d = 99;
        for (const [al, dbz] of ALPHA) { const x = Math.abs(al - a); if (x < d) { d = x; best = dbz; } }
        return d <= 2 ? best : null;
    }
    const k = (r << 16) | (g << 8) | b;
    const hit = OPAQUE.get(k);
    if (hit != null) return hit;
    if (k === GREEN) return null;
    let best = null, d = 1e9;
    for (const [c, dbz] of OPAQUE) {
        const dr = r - (c >> 16), dg = g - ((c >> 8) & 255), db = b - (c & 255), x = dr * dr + dg * dg + db * db;
        if (x < d) { d = x; best = dbz; }
    }
    return d <= 300 ? best : null;
}
/** Píxeis RGBA → { dbz: Int8Array (NO_ECHO = sem eco), echoes, unknown } (unknown = cores fora da tabela). */
export function decodeFrame(rgba, n = rgba.length / 4) {
    const dbz = new Int8Array(n), memo = new Map();
    let echoes = 0, unknown = 0;
    for (let i = 0; i < n; i++) {
        const k = i * 4, a = rgba[k + 3];
        if (a < 12) { dbz[i] = NO_ECHO; continue; }
        const key = ((rgba[k] << 24) | (rgba[k + 1] << 16) | (rgba[k + 2] << 8) | a) >>> 0;
        let v = memo.get(key);
        if (v === undefined) { v = colorToDbz(rgba[k], rgba[k + 1], rgba[k + 2], a); memo.set(key, v); }
        if (v != null) { dbz[i] = v; echoes++; continue; }
        dbz[i] = NO_ECHO;
        if (!(a === 255 && rgba[k] === 0 && rgba[k + 1] === 255 && rgba[k + 2] === 0)) unknown++; // o verde (≥ 75 dBZ) é conhecido
    }
    return { dbz, echoes, unknown };
}
/** Marshall-Palmer: Z = 200·R^1,6 → R (mm/h). Acima de 55 dBZ fica nos ~100 mm/h. */
export const dbzToMmh = (dbz) => (isNum(dbz) && dbz > NO_ECHO ? (10 ** (Math.min(dbz, RADAR.capDbz) / 10) / 200) ** (1 / 1.6) : 0);
export const mmhToDbz = (mmh) => (isNum(mmh) && mmh > 0 ? 10 * Math.log10(200 * mmh ** 1.6) : null);
/** Intensidade (OMM): fraca < 2,5 mm/h, moderada < 10, forte < 50, muito forte. */
export const rainLabel = (mmh) => (mmh >= 50 ? 'muito forte' : mmh >= 10 ? 'forte' : mmh >= 2.5 ? 'moderada' : 'fraca');
const RATE = new Float32Array(256);
for (let d = -128; d < 128; d++) RATE[d & 255] = d === NO_ECHO ? 0 : dbzToMmh(d);
function rates(dbz) { const out = new Float32Array(dbz.length); for (let i = 0; i < dbz.length; i++) out[i] = RATE[dbz[i] & 255]; return out; }

// ---------- geometria da imagem centrada no ponto (Web Mercator) ----------
/** cx, cy = o ponto em píxeis da imagem; kmPx = km por píxel. A imagem centrada começa no píxel global
 *  round(X − size/2) da grelha normal (verificado contra as imagens x/y/z do mesmo instante). */
export function tileGeo(lat, lon, { size = RADAR.size, z = RADAR.z } = {}) {
    const n = 256 * 2 ** z * (size / 256), r = (lat * Math.PI) / 180;
    const X = ((lon + 180) / 360) * n, Y = ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n;
    return { w: size, h: size, z, size, lat, lon, cx: X - Math.round(X - size / 2), cy: Y - Math.round(Y - size / 2), kmPx: (40075.016686 * Math.cos(r)) / n };
}
/** Coberto pelo radar no ponto? (imagem de cobertura: transparente = coberto) */
export function coveredAt(rgba, geo) {
    const i = Math.floor(geo.cy) * geo.w + Math.floor(geo.cx);
    return !(rgba[i * 4 + 3] > 127);
}
// média de 3×3 píxeis (~2,8 km) à volta do píxel (i, j); null fora da imagem
function mean3(R, w, h, i, j) {
    if (i < 1 || j < 1 || i > w - 2 || j > h - 2) return null;
    let s = 0;
    for (let y = j - 1; y <= j + 1; y++) for (let x = i - 1; x <= i + 1; x++) s += R[y * w + x];
    return s / 9;
}
function wet3(R, w, i, j) { let n = 0; for (let y = j - 1; y <= j + 1; y++) for (let x = i - 1; x <= i + 1; x++) if (R[y * w + x] >= RADAR.wetMmh) n++; return n / 9; }

// ---------- deslocamento dos ecos ----------
// Campo grosseiro (2×2 píxeis, ~1,8 km): só ecos de chuva (≥ 12 dBZ), para o ruído fraco pesar pouco. Cada píxel pesa
// menos quanto mais tempo teve eco nas últimas 2 h (fx.cnt): os ecos fixos (relevo, interferência, mar) quase não contam
// e o que se mexe manda na correlação.
function coarse(dbz, w, h, fx, minDbz = 12) {
    const W = w >> 1, H = h >> 1, out = new Float32Array(W * H);
    const kf = fx ? 1 / fx.n : 0;
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            let s = 0;
            const k = 2 * y * w + 2 * x;
            for (const i of [k, k + 1, k + w, k + w + 1]) if (dbz[i] >= minDbz) s += (Math.min(dbz[i], 50) - minDbz + 3) * (fx ? Math.max(0, 1 - fx.cnt[i] * kf) : 1);
            out[y * W + x] = s / 4;
        }
    }
    return { v: out, W, H };
}
/** Ecos parados: com eco (≥ 7 dBZ) no mesmo píxel em metade ou mais das imagens das últimas 2 h. A chuva desloca-se e
 *  muda de forma; o que fica tanto tempo no mesmo sítio não vai chegar ao ponto e é muitas vezes eco fixo (relevo,
 *  interferência, mar; perto de Santo Tirso, as cunhas radiais do radar de Arouca, em 9 a 13 das 13 imagens).
 *  Só com ≥ 10 imagens. → { cnt: imagens com eco por píxel, n: imagens, mask: 1 nos ecos parados } */
export function fixedEchoes(frames, n, share = 0.5) {
    const F = frames.filter((f) => f?.dbz?.length === n);
    if (F.length < 10) return null;
    const cnt = new Uint8Array(n), need = Math.ceil(F.length * share);
    for (const f of F) for (let i = 0; i < n; i++) if (f.dbz[i] >= 7) cnt[i]++;
    const mask = new Uint8Array(n);
    for (let i = 0; i < n; i++) if (cnt[i] >= need) mask[i] = 1;
    return { cnt, n: F.length, mask };
}
function integral(v, W, H, sq) {
    const I = new Float64Array((W + 1) * (H + 1));
    for (let y = 0; y < H; y++) {
        let row = 0;
        for (let x = 0; x < W; x++) { const a = v[y * W + x]; row += sq ? a * a : a; I[(y + 1) * (W + 1) + x + 1] = I[y * (W + 1) + x + 1] + row; }
    }
    return I;
}
const rect = (I, W, x0, y0, x1, y1) => I[(y1 + 1) * (W + 1) + x1 + 1] - I[y0 * (W + 1) + x1 + 1] - I[(y1 + 1) * (W + 1) + x0] + I[y0 * (W + 1) + x0];
// Deslocamento (dx, dy) que melhor leva o campo A (anterior) ao B (último): máximo da correlação na caixa
function bestShift(A, B, c, half, S) {
    const { W, H } = B, x0 = c.x - half, x1 = c.x + half, y0 = c.y - half, y1 = c.y + half;
    let n = 0, sb = 0, sbb = 0;
    const nz = [];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const b = B.v[y * W + x]; n++; sb += b; sbb += b * b; if (b > 0) nz.push(y * W + x); }
    const vb = sbb - (sb * sb) / n;
    if (nz.length < 12 || vb <= 0) return null;
    const IA = integral(A.v, W, H, false), IA2 = integral(A.v, W, H, true);
    const grid = new Map();
    let best = null;
    for (let dy = -S; dy <= S; dy++) {
        if (y0 - dy < 0 || y1 - dy >= H) continue;
        for (let dx = -S; dx <= S; dx++) {
            if (x0 - dx < 0 || x1 - dx >= W) continue;
            const sa = rect(IA, W, x0 - dx, y0 - dy, x1 - dx, y1 - dy), va = rect(IA2, W, x0 - dx, y0 - dy, x1 - dx, y1 - dy) - (sa * sa) / n;
            if (va <= 0) continue;
            const off = dy * W + dx;
            let sab = 0;
            for (const p of nz) sab += A.v[p - off] * B.v[p];
            const corr = (sab - (sa * sb) / n) / Math.sqrt(va * vb);
            grid.set(`${dx},${dy}`, corr);
            if (!best || corr > best.corr) best = { dx, dy, corr };
        }
    }
    if (!best) return null;
    // fração de píxel: parábola pelos vizinhos
    const sub = (m, z, p) => { if (!isNum(m) || !isNum(p)) return 0; const den = m - 2 * z + p; return den < 0 ? clamp((m - p) / (2 * den), -0.5, 0.5) : 0; };
    const g = (dx, dy) => grid.get(`${dx},${dy}`);
    return { dx: best.dx + sub(g(best.dx - 1, best.dy), best.corr, g(best.dx + 1, best.dy)), dy: best.dy + sub(g(best.dx, best.dy - 1), best.corr, g(best.dx, best.dy + 1)), corr: best.corr, n: nz.length };
}
const same = (a, b) => { if (a.length !== b.length) return false; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; };
/** Deslocamento dos ecos na caixa de ±60 km à volta do ponto, comparando a última imagem com as de há ~10, 20 e 30 min
 *  (o padrão dos ecos de imagem para imagem). → { vx, vy (píxeis/min, y para baixo), speedKmh, deg (para onde vão), corr } ou null */
export function radarMotion(frames, geo, { boxKm = RADAR.boxKm, maxKmh = RADAR.maxKmh, fixed = null, minDbz = 12, debug = null } = {}) {
    const F = frames.filter((f) => f?.dbz);
    if (F.length < 2) return null;
    const last = F[F.length - 1], B = coarse(last.dbz, geo.w, geo.h, fixed, minDbz), kmC = 2 * geo.kmPx;
    const c = { x: Math.floor(geo.cx / 2), y: Math.floor(geo.cy / 2) };
    const half = Math.min(Math.round(boxKm / kmC), Math.floor(B.W / 2) - 4);
    const est = [];
    for (const lag of [10, 20, 30]) {
        const prev = F.slice(0, -1).reverse().find((f) => Math.abs((last.ms - f.ms) / 6e4 - lag) <= 4 && !same(f.dbz, last.dbz));
        if (!prev) continue;
        const dt = (last.ms - prev.ms) / 6e4;
        const S = Math.min(Math.ceil((dt * maxKmh) / 60 / kmC), Math.floor(B.W / 2) - half - 2);
        const r = bestShift(coarse(prev.dbz, geo.w, geo.h, fixed, minDbz), B, c, half, S);
        debug?.push({ dt, ...r });
        if (r && r.corr >= 0.3) est.push({ vx: r.dx / dt, vy: r.dy / dt, corr: r.corr, w: dt * (r.corr - 0.25) });
    }
    if (!est.length) return null;
    const W = est.reduce((s, e) => s + e.w, 0);
    const vx = est.reduce((s, e) => s + e.w * e.vx, 0) / W, vy = est.reduce((s, e) => s + e.w * e.vy, 0) / W;
    const corr = est.reduce((s, e) => s + e.w * e.corr, 0) / W;
    // as estimativas (10, 20 e 30 min) têm de concordar; senão a confiança cai
    const spread = Math.max(...est.map((e) => Math.hypot(e.vx - vx, e.vy - vy)));
    const speed = Math.hypot(vx, vy);
    const quality = clamp(corr * (est.length >= 2 && spread > 0.35 * speed + 0.08 ? 0.6 : 1), 0, 1);
    const kmh = speed * kmC * 60;
    return { vx: 2 * vx, vy: 2 * vy, speedKmh: kmh, deg: kmh >= 3 ? ((Math.atan2(vx, -vy) * 180) / Math.PI + 360) % 360 : null, corr: quality, n: est.length };
}

// ---------- leitura completa ----------
const msToLocal = (ms, off) => new Date(ms + off * 1000).toISOString().slice(0, 16);
const r1 = (x) => Math.round(x * 10) / 10, r2 = (x) => Math.round(x * 100) / 100;
const dirName = (deg) => WIND_FROM[compass(deg)] || '';
const fmtMmh = (x) => (x >= 10 ? String(Math.round(x)) : x.toFixed(1).replace('.', ','));
const fmtKm = (x) => (x >= 10 ? String(Math.round(x)) : x.toFixed(1).replace('.', ','));

/**
 * Radar à volta do ponto. frames: [{ ms, dbz: Int8Array }] (as imagens centradas no ponto, mesma geometria);
 * geo = tileGeo(lat, lon); off = desvio da hora local (s). → objeto "radar" de docs/API.md (ou null sem imagens).
 */
export function analyzeRadar({ frames, geo, nowMs = Date.now(), off = 0, covered = true }) {
    const F = (frames || []).filter((f) => f?.dbz?.length === geo.w * geo.h && isNum(f.ms)).sort((a, b) => a.ms - b.ms);
    if (!F.length) return null;
    const last = F[F.length - 1], { w, h, kmPx } = geo, W = RADAR.wetMmh;
    const ageMin = Math.max(0, Math.round((nowMs - last.ms) / 6e4));
    const base = { source: 'RainViewer', time: msToLocal(last.ms, off), ageMin, fresh: ageMin <= RADAR.maxAgeMin, frames: F.length, stepMin: RADAR.stepMin, kmPx: r2(kmPx) };
    if (!covered) return { ...base, covered: false, text: 'Este ponto está fora da cobertura do radar.' };
    const pi = Math.floor(geo.cx), pj = Math.floor(geo.cy);
    const RL = rates(last.dbz);
    // 1) no ponto: média de 3×3 píxeis (~2,8 km), nas 13 imagens
    const last2h = F.map((f) => ({ time: msToLocal(f.ms, off), mmh: r2(mean3(f === last ? RL : rates(f.dbz), w, h, pi, pj) ?? 0) }));
    const mmh = mean3(RL, w, h, pi, pj) ?? 0;
    const raining = mmh >= W;
    const prev = last2h.slice(-4, -1).map((x) => x.mmh), pm = prev.length ? prev.reduce((a, b) => a + b, 0) / prev.length : null;
    const trend = !raining || pm == null ? null : mmh > pm * 1.5 && mmh - pm >= 0.3 ? 'a aumentar' : mmh < pm / 1.5 && pm - mmh >= 0.3 ? 'a diminuir' : 'estável';
    const atPoint = { mmh: r2(mmh), dbz: mmh >= 0.01 ? Math.round(mmhToDbz(mmh)) : null, wet: r2(wet3(RL, w, pi, pj)), raining, label: raining ? rainLabel(mmh) : null, trend };
    // 2) ecos parados (no mesmo sítio em ≥ 50% das imagens: fixos ou chuva que não se mexe) não contam para o eco mais
    //    próximo nem para a chegada, e pesam pouco no deslocamento; contam no ponto (se chove ali, chove) e nos anéis
    const fx = fixedEchoes(F, w * h), mask = fx?.mask;
    const RM = mask ? RL.map((v, i) => (mask[i] ? 0 : v)) : RL;
    let fixedNear = 0;
    // 3) anéis à volta (fração de píxeis com chuva e máximo) e eco mais próximo (média 3×3 ≥ 0,1 mm/h) até 40 km
    const RG = RADAR.rings, maxR = RG[RG.length - 1], rp = Math.ceil(maxR / kmPx);
    const acc = RG.map(() => ({ n: 0, wet: 0, max: 0 }));
    let near = null;
    for (let j = Math.max(1, pj - rp); j <= Math.min(h - 2, pj + rp); j++) {
        for (let i = Math.max(1, pi - rp); i <= Math.min(w - 2, pi + rp); i++) {
            const e = (i + 0.5 - geo.cx) * kmPx, nn = -(j + 0.5 - geo.cy) * kmPx, d = Math.hypot(e, nn);
            if (d > maxR) continue;
            const k = RG.findIndex((x) => d <= x), v = RL[j * w + i];
            acc[k].n++; if (v >= W) acc[k].wet++; if (v > acc[k].max) acc[k].max = v;
            if (d <= RADAR.nearKm && v >= W && mask?.[j * w + i]) fixedNear++;
            if (!raining && d <= RADAR.nearKm && (!near || d < near.d) && RM[j * w + i] > 0) {
                const m3 = mean3(RM, w, h, i, j);
                if (m3 >= W) near = { d, e, n: nn, mmh: m3 };
            }
        }
    }
    const rings = RG.map((km, k) => ({ km, wet: acc[k].n ? r2(acc[k].wet / acc[k].n) : 0, max: r1(acc[k].max) }));
    const ndeg = near ? ((Math.atan2(near.e, near.n) * 180) / Math.PI + 360) % 360 : null;
    const nearest = near ? { distanceKm: r1(near.d), deg: Math.round(ndeg), dir: compass(ndeg), mmh: r1(near.mmh) } : null;
    // 4) deslocamento dos ecos e persistência lagrangiana: a chuva que vai estar no ponto daqui a t min está agora a v·t
    //    para montante (a chover: o campo todo; sem chuva: sem os ecos parados). Sem deslocamento fiável (ecos que mudam
    //    mais do que andam, ou nenhum) fica como está agora, e o motor confia nisso menos tempo.
    const mv = radarMotion(F, geo, { fixed: fx });
    const moving = mv && mv.corr >= 0.4 && mv.speedKmh >= 5 ? mv : null;
    const src = raining ? RL : RM, ahead = [];
    for (let t = 0; t <= RADAR.aheadMin; t += RADAR.aheadStep) {
        const v = t === 0 || !moving ? mmh : mean3(src, w, h, Math.floor(geo.cx - mv.vx * t), Math.floor(geo.cy - mv.vy * t));
        ahead.push(v == null ? null : r2(v));
    }
    const at = (k) => (k < ahead.length ? ahead[k] : null);
    const when = (k) => { const arr = last.ms + k * RADAR.aheadStep * 6e4; return { etaMin: Math.max(0, Math.round((arr - nowMs) / 6e4)), time: msToLocal(Math.round(arr / 3e5) * 3e5, off) }; };
    let approach = null, ends = null;
    for (let k = 1; moving && k < ahead.length && at(k) != null; k++) {
        const wetNow = at(k) >= W && (at(k + 1) ?? at(k)) >= W, dryNow = at(k) < W && (at(k + 1) ?? at(k)) < W;
        if (!raining && wetNow) {
            const t = k * RADAR.aheadStep, next = ahead.slice(k, k + 4).filter(isNum);
            approach = { ...when(k), distanceKm: r1((mv.speedKmh * t) / 60), speedKmh: Math.round(mv.speedKmh), fromDir: compass(mv.deg + 180), mmh: r1(Math.max(...next)) };
            break;
        }
        if (raining && dryNow) { ends = when(k); break; }
    }
    const motion = mv ? { speedKmh: Math.round(mv.speedKmh), deg: mv.deg == null ? null : Math.round(mv.deg), toDir: mv.deg == null ? null : compass(mv.deg),
        fromDir: mv.deg == null ? null : compass(mv.deg + 180), corr: r2(mv.corr), used: !!moving, vx: r2(mv.vx), vy: r2(mv.vy) } : null;
    const out = { ...base, covered: true, atPoint, last2h, rings, nearest, motion, approach, ends, fixedKm2: Math.round(fixedNear * kmPx * kmPx),
        ahead: { stepMin: RADAR.aheadStep, moving: !!moving, mmh: ahead } };
    out.text = radarText(out);
    return out;
}

/** Frase do radar no ponto (sem os modelos): "A chover agora (fraca, 0,6 mm/h)…" / "Sem chuva no radar; chuva a 12 km…" */
export function radarText(R) {
    if (!R) return '';
    if (R.covered === false) return 'Este ponto está fora da cobertura do radar.';
    const A = R.atPoint, old = R.fresh === false ? `Radar de há ${R.ageMin} min: ` : '';
    if (A?.raining) {
        let s = `${old}${old ? 'a chover' : 'A chover agora'} (${A.label}, ${fmtMmh(A.mmh)} mm/h${A.trend && A.trend !== 'estável' ? `, ${A.trend}` : ''})`;
        if (R.ends) s += `; pelo deslocamento dos ecos deve parar por volta das ${R.ends.time.slice(11, 16)}`;
        return s + '.';
    }
    let s = `${old}${old ? 'sem chuva' : 'Sem chuva no radar'}`;
    if (R.approach) s += `; chuva a ${fmtKm(R.approach.distanceKm)} km a ${WIND_FROM[R.approach.fromDir] || ''}, deve chegar por volta das ${R.approach.time.slice(11, 16)}`;
    else if (R.nearest) {
        const m = R.motion?.used ? R.motion : null;
        const away = m && R.nearest && angleDiff(m.deg, R.nearest.deg) <= 60;
        s += `; a chuva mais perto está a ${fmtKm(R.nearest.distanceKm)} km a ${dirName(R.nearest.deg)}${away ? ` e afasta-se para ${dirName(m.deg)}` : ''}`;
    } else s += ` até ${RADAR.nearKm} km`;
    return s + '.';
}
const angleDiff = (a, b) => Math.abs(((((a - b) % 360) + 540) % 360) - 180);
export { fmtMmh, fmtKm, dirName };
