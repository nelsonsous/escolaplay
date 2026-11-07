// Descodificador PNG mínimo (sem dependências), para ler as imagens do radar píxel a píxel.
// Corre no Node (tarefa agendada) e no browser; descomprime com DecompressionStream (browser e Node ≥ 18)
// e, sem ele, com o zlib do Node. Suporta 8 bits (RGBA, RGB, cinzento, paleta) e paletas de 1, 2 e 4 bits;
// sem entrelaçado (as imagens do radar não o usam).
const SIG = [137, 80, 78, 71, 13, 10, 26, 10];
const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

async function inflate(bytes) {
    if (typeof DecompressionStream === 'function') {
        const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
        return new Uint8Array(await new Response(stream).arrayBuffer());
    }
    const { inflateSync } = await import('node:zlib');
    return new Uint8Array(inflateSync(bytes));
}

const paeth = (a, b, c) => {
    const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
};

/** PNG → { width, height, data: Uint8ClampedArray RGBA } (como o getImageData do canvas, sem pré-multiplicar). */
export async function decodePng(input) {
    const b = input instanceof Uint8Array ? input : new Uint8Array(input);
    if (b.length < 33 || SIG.some((x, i) => b[i] !== x)) throw new Error('imagem PNG inválida');
    const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
    let width = 0, height = 0, depth = 0, type = -1, interlace = 0, plte = null, trns = null, size = 0;
    const parts = [];
    for (let p = 8; p + 12 <= b.length;) {
        const len = dv.getUint32(p), kind = String.fromCharCode(b[p + 4], b[p + 5], b[p + 6], b[p + 7]);
        if (p + 12 + len > b.length) throw new Error('PNG truncado');
        const data = b.subarray(p + 8, p + 8 + len);
        if (kind === 'IHDR') { width = dv.getUint32(p + 8); height = dv.getUint32(p + 12); depth = b[p + 16]; type = b[p + 17]; interlace = b[p + 20]; }
        else if (kind === 'PLTE') plte = data;
        else if (kind === 'tRNS') trns = data;
        else if (kind === 'IDAT') { parts.push(data); size += len; }
        else if (kind === 'IEND') break;
        p += 12 + len;
    }
    const ch = CHANNELS[type];
    if (!ch || !width || !height || width * height > 4e6) throw new Error('PNG não suportado');
    if (interlace) throw new Error('PNG entrelaçado não suportado');
    if (!(depth === 8 || ((type === 3 || type === 0) && [1, 2, 4].includes(depth)))) throw new Error(`PNG com ${depth} bits não suportado`);
    const z = new Uint8Array(size);
    let o = 0;
    for (const x of parts) { z.set(x, o); o += x.length; }
    const raw = await inflate(z);
    const stride = Math.ceil((width * ch * depth) / 8), bpp = Math.max(1, (ch * depth) >> 3);
    if (raw.length < height * (stride + 1)) throw new Error('PNG com dados em falta');
    // desfazer os filtros linha a linha (None, Sub, Up, Average, Paeth)
    const px = new Uint8Array(height * stride);
    for (let y = 0; y < height; y++) {
        const f = raw[y * (stride + 1)], src = y * (stride + 1) + 1, dst = y * stride, up = dst - stride;
        for (let i = 0; i < stride; i++) {
            const x = raw[src + i], a = i >= bpp ? px[dst + i - bpp] : 0, u = y ? px[up + i] : 0, c = y && i >= bpp ? px[up + i - bpp] : 0;
            px[dst + i] = f === 0 ? x : f === 1 ? x + a : f === 2 ? x + u : f === 3 ? x + ((a + u) >> 1) : f === 4 ? x + paeth(a, u, c) : 0;
        }
        if (f > 4) throw new Error('filtro PNG desconhecido');
    }
    const out = new Uint8ClampedArray(width * height * 4);
    const sample = (row, x) => { // valor do píxel x (paleta ou cinzento com menos de 8 bits)
        const bit = x * depth, v = px[row + (bit >> 3)];
        return (v >> (8 - depth - (bit & 7))) & ((1 << depth) - 1);
    };
    for (let y = 0; y < height; y++) {
        const row = y * stride;
        for (let x = 0; x < width; x++) {
            const k = (y * width + x) * 4;
            if (type === 6) { const s = row + x * 4; out[k] = px[s]; out[k + 1] = px[s + 1]; out[k + 2] = px[s + 2]; out[k + 3] = px[s + 3]; }
            else if (type === 2) { const s = row + x * 3; out[k] = px[s]; out[k + 1] = px[s + 1]; out[k + 2] = px[s + 2]; out[k + 3] = 255; }
            else if (type === 3) {
                const i = depth === 8 ? px[row + x] : sample(row, x);
                out[k] = plte?.[i * 3] ?? 0; out[k + 1] = plte?.[i * 3 + 1] ?? 0; out[k + 2] = plte?.[i * 3 + 2] ?? 0; out[k + 3] = trns && i < trns.length ? trns[i] : 255;
            } else if (type === 0) {
                const g = depth === 8 ? px[row + x] : Math.round((sample(row, x) * 255) / ((1 << depth) - 1));
                out[k] = out[k + 1] = out[k + 2] = g; out[k + 3] = 255;
            } else { const s = row + x * 2; out[k] = out[k + 1] = out[k + 2] = px[s]; out[k + 3] = px[s + 1]; }
        }
    }
    return { width, height, data: out };
}
