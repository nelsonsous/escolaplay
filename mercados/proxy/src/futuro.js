// Os fundos de pensões da Futuro (conector 1.16.0): o valor da UP de cada fundo, do PDF público das cotações
// (https://www.futuro-sa.pt/files/cotacoes.pdf, um por dia útil). O PDF vem «protegido» com a palavra-passe vazia (o
// tratamento normal do PDF 1.4: RC4 de 128 bits): desencripta-se, descomprime-se e lê-se o texto pelas tabelas das
// fontes (ToUnicode). Só valores públicos: as UP de cada um ficam na app.

// MD5 (RFC 1321) — a chave do PDF sai dele; o Web Crypto não o tem em todo o lado
export function md5(bytes) {
    const K = new Uint32Array(64), S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
    for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0;
    const n = bytes.length, len = (((n + 8) >>> 6) << 6) + 64, m = new Uint8Array(len);
    m.set(bytes); m[n] = 0x80;
    const dv = new DataView(m.buffer);
    dv.setUint32(len - 8, (n * 8) >>> 0, true); dv.setUint32(len - 4, Math.floor(n / 2 ** 29), true);
    let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
    for (let o = 0; o < len; o += 64) {
        let a = a0, b = b0, c = c0, d = d0;
        for (let i = 0; i < 64; i++) {
            let f, g;
            if (i < 16) { f = (b & c) | (~b & d); g = i; }
            else if (i < 32) { f = (d & b) | (~d & c); g = (5 * i + 1) % 16; }
            else if (i < 48) { f = b ^ c ^ d; g = (3 * i + 5) % 16; }
            else { f = c ^ (b | ~d); g = (7 * i) % 16; }
            const t = d; d = c; c = b;
            const x = (a + f + K[i] + dv.getUint32(o + g * 4, true)) | 0, s = S[(i >> 4) * 4 + (i & 3)];
            b = (b + ((x << s) | (x >>> (32 - s)))) | 0; a = t;
        }
        a0 = (a0 + a) | 0; b0 = (b0 + b) | 0; c0 = (c0 + c) | 0; d0 = (d0 + d) | 0;
    }
    const out = new Uint8Array(16), ov = new DataView(out.buffer);
    [a0, b0, c0, d0].forEach((v, i) => ov.setUint32(i * 4, v >>> 0, true));
    return out;
}
function rc4(k, d) {
    const s = new Uint8Array(256);
    for (let i = 0; i < 256; i++) s[i] = i;
    for (let i = 0, j = 0; i < 256; i++) { j = (j + s[i] + k[i % k.length]) & 255; const t = s[i]; s[i] = s[j]; s[j] = t; }
    const o = new Uint8Array(d.length);
    for (let n = 0, i = 0, j = 0; n < d.length; n++) {
        i = (i + 1) & 255; j = (j + s[i]) & 255; const t = s[i]; s[i] = s[j]; s[j] = t;
        o[n] = d[n] ^ s[(s[i] + s[j]) & 255];
    }
    return o;
}
async function inflar(b) {
    const r = new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream('deflate')));
    return new Uint8Array(await r.arrayBuffer());
}
const junta = (...ps) => { const o = new Uint8Array(ps.reduce((a, p) => a + p.length, 0)); let i = 0; for (const p of ps) { o.set(p, i); i += p.length; } return o; };
const latin1 = (b) => { let s = ''; for (let i = 0; i < b.length; i += 8192) s += String.fromCharCode.apply(null, b.subarray(i, i + 8192)); return s; };
// uma cadeia do PDF a partir de «(» ou «<» em i: [bytes, a posição a seguir]
function cadeia(b, i) {
    if (b[i] === 0x3c) { // <hex>
        let j = i + 1, h = '';
        while (b[j] !== 0x3e) { const c = String.fromCharCode(b[j++]); if (/[0-9a-f]/i.test(c)) h += c; }
        if (h.length % 2) h += '0';
        return [Uint8Array.from(h.match(/../g) || [], (x) => parseInt(x, 16)), j + 1];
    }
    const out = []; let d = 0; i++;
    for (;;) {
        const c = b[i];
        if (c === 0x5c) {
            const n = b[i + 1]; i += 2;
            if (n >= 0x30 && n <= 0x37) { let o = n - 0x30, k = 1; while (k < 3 && b[i] >= 0x30 && b[i] <= 0x37) { o = o * 8 + b[i] - 0x30; i++; k++; } out.push(o & 255); continue; }
            if (n === 0x0d || n === 0x0a) { if (n === 0x0d && b[i] === 0x0a) i++; continue; }
            out.push({ 0x6e: 10, 0x72: 13, 0x74: 9, 0x62: 8, 0x66: 12 }[n] ?? n); continue;
        }
        if (c === 0x28) d++;
        if (c === 0x29) { if (d === 0) return [Uint8Array.from(out), i + 1]; d--; }
        out.push(c); i++;
    }
}
// os objetos do PDF (num → { dic, dados }), já desencriptados e descomprimidos
async function objetosPdf(b) {
    const s = latin1(b), objs = new Map(), re = /(\d+)\s+(\d+)\s+obj\b/g;
    let chave = null;
    const enc = /\/Encrypt\s+(\d+)\s+0\s+R/.exec(s);
    if (enc) {
        const eo = new RegExp(`(?:^|[^\\d])${enc[1]}\\s+0\\s+obj`).exec(s), ini = eo.index + eo[0].length, ed = s.slice(ini, s.indexOf('endobj', ini));
        if (!/\/Filter\s*\/Standard/.test(ed) || +(/\/V\s+(\d)/.exec(ed) || [])[1] > 2) throw new Error('PDF com outra proteção');
        let p = ini + ed.search(/\/O\s*[(<]/) + 2; while (b[p] === 0x20) p++;
        const [O] = cadeia(b, p), P = +/\/P\s*(-?\d+)/.exec(ed)[1], R = +(/\/R\s+(\d)/.exec(ed) || [, 2])[1];
        const n = R >= 3 ? +(/\/Length\s+(\d+)/.exec(ed) || [, 40])[1] / 8 : 5;
        const id = /\/ID\s*\[\s*<([0-9A-Fa-f]+)>/.exec(s);
        const PAD = Uint8Array.from('28BF4E5E4E758A4164004E56FFFA01082E2E00B6D0683E802F0CA9FE6453697A'.match(/../g), (x) => parseInt(x, 16));
        const pb = new Uint8Array(4); new DataView(pb.buffer).setInt32(0, P, true);
        let h = md5(junta(PAD, O.subarray(0, 32), pb, id ? Uint8Array.from(id[1].match(/../g), (x) => parseInt(x, 16)) : new Uint8Array(0)));
        if (R >= 3) for (let k = 0; k < 50; k++) h = md5(h.subarray(0, n));
        chave = h.subarray(0, n);
    }
    let m;
    while ((m = re.exec(s))) {
        const num = +m[1], gen = +m[2], ini = re.lastIndex, st = s.indexOf('stream', ini), eo = s.indexOf('endobj', ini);
        if (eo < 0) break;
        if (st < 0 || st > eo) { objs.set(num, { dic: s.slice(ini, eo), dados: null }); re.lastIndex = eo + 6; continue; }
        const dic = s.slice(ini, st);
        let p = st + 6; if (s[p] === '\r') p++; if (s[p] === '\n') p++;
        const L = /\/Length\s+(\d+)(\s+\d+\s+R)?/.exec(dic);
        let fim = L && !L[2] ? p + +L[1] : -1;
        if (fim < 0) { const ref = L && new RegExp(`(?:^|[^\\d])${L[1]}\\s+0\\s+obj\\s*(\\d+)\\s*endobj`).exec(s); fim = ref ? p + +ref[1] : s.indexOf('endstream', p); }
        let dados = b.subarray(p, fim);
        if (chave) dados = rc4(md5(junta(chave, Uint8Array.of(num & 255, (num >> 8) & 255, (num >> 16) & 255, gen & 255, (gen >> 8) & 255))).subarray(0, Math.min(chave.length + 5, 16)), dados);
        if (/\/FlateDecode/.test(dic)) { try { dados = await inflar(dados); } catch { dados = null; } }
        objs.set(num, { dic, dados });
        const e2 = s.indexOf('endobj', fim);
        re.lastIndex = e2 < 0 ? s.length : e2 + 6;
    }
    return objs;
}
// a tabela de uma fonte: código → texto (bfchar e bfrange), e quantos bytes tem cada código
function tabela(d) {
    const s = latin1(d), m = new Map(), hx = (h) => parseInt(h, 16), u16 = (h) => String.fromCharCode(...(h.match(/..../g) || []).map(hx));
    const cs = /begincodespacerange\s*<([0-9A-Fa-f]+)>/.exec(s);
    for (const [, bl] of s.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) for (const [, a, u] of bl.matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) m.set(hx(a), u16(u));
    for (const [, bl] of s.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) for (const [, a, z, u] of bl.matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
        const u0 = hx(u);
        for (let c = hx(a); c <= hx(z); c++) m.set(c, String.fromCharCode(u0 + c - hx(a)));
    }
    return { m, w: cs ? cs[1].length / 2 : 1 };
}
// o texto de todas as páginas, pela ordem do desenho (as cadeias de cada Tj/TJ seguidas, sem separadores)
export async function pdfTexto(bytes) {
    const objs = await objetosPdf(bytes), out = [];
    const deRef = (dic, nome) => { const r = new RegExp(`/${nome}\\s+(\\d+)\\s+0\\s+R`).exec(dic); return r ? objs.get(+r[1]) : null; };
    for (const { dic } of objs.values()) {
        if (!/\/Type\s*\/Page\b(?!s)/.test(dic)) continue;
        let fd = deRef(dic, 'Font');
        fd = fd ? fd.dic : (/\/Font\s*<<([\s\S]*?)>>/.exec(dic) || [])[1] || '';
        const fontes = {};
        for (const [, nome, ref] of fd.matchAll(/\/([\w.+-]+)\s+(\d+)\s+0\s+R/g)) {
            const f = objs.get(+ref), tu = f && deRef(f.dic, 'ToUnicode');
            if (tu && tu.dados) fontes[nome] = tabela(tu.dados);
        }
        const cr = /\/Contents\s*(\[[^\]]*\]|\d+\s+0\s+R)/.exec(dic);
        const conts = cr ? [...cr[1].matchAll(/(\d+)\s+0\s+R/g)].map((x) => objs.get(+x[1])).filter((x) => x && x.dados) : [];
        for (const c of conts) {
            const b = c.dados, s = latin1(b);
            let f = { m: new Map(), w: 1 };
            // (os «<<» dos dicionários no meio do desenho não são cadeias)
            const re = /\/([\w.+-]+)\s+[-\d.]+\s+Tf|\(|(?<!<)<(?!<)/g;
            let t;
            while ((t = re.exec(s))) {
                if (t[1]) { f = fontes[t[1]] || { m: new Map(), w: 1 }; continue; }
                const [raw, prox] = cadeia(b, t.index);
                for (let i = 0; i + f.w <= raw.length; i += f.w) { let c2 = 0; for (let k = 0; k < f.w; k++) c2 = c2 * 256 + raw[i + k]; out.push(f.m.get(c2) ?? ''); }
                re.lastIndex = prox;
            }
        }
    }
    return out.join('');
}
// da lista: o dia («válidas para o dia») e, de cada fundo pedido, o valor da UP (depois do valor do fundo e do nº de UP)
export function parseFuturo(texto, nomes) {
    const s = String(texto || '').replace(/ /g, ' '), md = /DIA:\s*(\d{2})\/(\d{2})\/(\d{4})/.exec(s);
    const n = '\\d{1,3}(?: \\d{3})*,\\d{2}', f = {};
    for (const nome of nomes) {
        const i = s.indexOf(nome);
        if (i < 0) continue;
        const r = new RegExp(`\\s*(${n})\\s*(${n})\\s*(\\d{1,3},\\d{4})`, 'y');
        r.lastIndex = i + nome.length;
        const x = r.exec(s);
        if (x) f[nome] = { up: +x[3].replace(',', '.'), valor: +x[1].replace(/ /g, '').replace(',', '.'), unidades: +x[2].replace(/ /g, '').replace(',', '.') };
    }
    return { dia: md ? `${md[3]}-${md[2]}-${md[1]}` : null, f };
}
// os fins de ano dos relatórios anuais (o valor da UP a 31/12), para o gráfico ter história antes dos dias guardados
export const FUT_ANOS = { 'FUNDO VIVA': [['2021-12-31', 16.9157], ['2022-12-31', 15.0428], ['2023-12-31', 16.1857], ['2024-12-31', 17.0496], ['2025-12-31', 18.2705]] };
