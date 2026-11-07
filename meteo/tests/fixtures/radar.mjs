// Radar sintético para os testes (sem rede): imagens centradas no ponto com células de chuva que se deslocam,
// ecos fixos, e PNG nas cores da tabela "Universal Blue" (como as do RainViewer).
import { deflateSync } from 'node:zlib';
import { tileGeo, NO_ECHO, dbzColor } from '../../lib/radar.js';

/**
 * 13 imagens (de 10 em 10 min, a última em lastMs) centradas no ponto. blobsAt(t) → ecos no instante t (min, ≤ 0 =
 * antes da última imagem): { e, n, r, dbz } (círculo, km a leste/norte do ponto) ou { e, n, box, dbz } (quadrado).
 */
export function synthFrames(lat, lon, blobsAt, { n = 13, lastMs, stepMin = 10 } = {}) {
    const geo = tileGeo(lat, lon), frames = [];
    for (let k = 0; k < n; k++) {
        const ms = lastMs - (n - 1 - k) * stepMin * 6e4, t = (ms - lastMs) / 6e4;
        const d = new Int8Array(geo.w * geo.h).fill(NO_ECHO);
        for (const b of blobsAt(t)) {
            for (let j = 0; j < geo.h; j++) {
                for (let i = 0; i < geo.w; i++) {
                    const e = (i + 0.5 - geo.cx) * geo.kmPx, nn = -(j + 0.5 - geo.cy) * geo.kmPx;
                    if (b.box ? Math.abs(e - b.e) <= b.box && Math.abs(nn - b.n) <= b.box : Math.hypot(e - b.e, nn - b.n) <= b.r) d[j * geo.w + i] = b.dbz;
                }
            }
        }
        frames.push({ ms, dbz: d });
    }
    return { frames, geo };
}

// ---------- PNG (RGBA de 8 bits, sem filtro) ----------
const CRC = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
function crc32(buf) { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
    const out = Buffer.alloc(12 + data.length);
    out.writeUInt32BE(data.length, 0);
    out.write(type, 4, 'latin1');
    data.copy(out, 8);
    out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
    return out;
}
export function encodePng(rgba, w, h) {
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
    const raw = Buffer.alloc(h * (w * 4 + 1));
    for (let y = 0; y < h; y++) Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
/** Grelha de dBZ → PNG nas cores do radar (transparente sem eco). */
export function framePng(dbz, w = 256, h = 256) {
    const rgba = new Uint8Array(w * h * 4);
    for (let i = 0; i < w * h; i++) {
        const c = dbz[i] === NO_ECHO ? null : dbzColor(dbz[i]);
        if (c) rgba.set(c, i * 4);
    }
    return encodePng(rgba, w, h);
}
/** Imagem de cobertura: transparente = há radar; preto = sem radar. */
export function coveragePng(covered = true, w = 256, h = 256) {
    const a = new Uint8Array(w * h * 4);
    if (!covered) for (let i = 3; i < a.length; i += 4) a[i] = 255;
    return encodePng(a, w, h);
}
/** weather-maps.json com as imagens dadas ({ ms }) */
export const mapsJson = (frames, host = 'https://tilecache.rainviewer.com') => ({ version: '2.0', generated: Math.round(frames.at(-1).ms / 1000), host,
    radar: { past: frames.map((f, i) => ({ time: Math.round(f.ms / 1000), path: `/v2/radar/t${String(i).padStart(2, '0')}${Math.round(f.ms / 1000).toString(16)}` })), nowcast: [] }, satellite: { infrared: [] } });
