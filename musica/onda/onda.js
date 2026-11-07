// Anfitrião da Onda para o motor de curadoria (curador.onda → curador.wasm).
// O mesmo contrato do compilador Onda: só três portas — sys (sistema), m1 e m2 (matemática).
// Corre igual no browser (app), no Node (tarefa agendada e testes) e num Cloudflare Worker.

const cache = new WeakMap();

function cfmt(x) {
    if (Number.isNaN(x)) return 'nan';
    if (!Number.isFinite(x)) return x < 0 ? '-inf' : 'inf';
    if (x === 0) return Object.is(x, -0) ? '-0' : '0';
    const tira = (t) => (t.includes('.') ? t.replace(/0+$/, '').replace(/\.$/, '') : t);
    const [m, ex] = x.toExponential(14).split('e'), e = Number(ex);
    if (e >= -4 && e < 15) return tira(x.toFixed(14 - e));
    return tira(m) + 'e' + (e < 0 ? '-' : '+') + String(Math.abs(e)).padStart(2, '0');
}

async function modulo(wasm) {
    if (wasm instanceof WebAssembly.Module) return wasm;
    let m = cache.get(wasm);
    if (!m) { m = await WebAssembly.compile(wasm); cache.set(wasm, m); }
    return m;
}

const agora = () => (typeof performance !== 'undefined' && performance.timeOrigin ? performance.timeOrigin + performance.now() : Date.now());

// Corre um programa Onda compilado para WASM com `stdin` (texto) e devolve { code, text }.
export async function correr(wasm, stdin = '') {
    const input = new TextEncoder().encode(stdin);
    const out = [];
    let ip = 0, code = 0, mem = null, kb = -1n;
    const words = (a, n) => new BigInt64Array(mem.buffer, (Number(a) + 16) * 8, n);
    const sys = (c, a, b) => {
        switch (Number(c)) {
            case 0: { const n = Number(b), v = words(a, n), u = new Uint8Array(n); for (let i = 0; i < n; i++) u[i] = Number(v[i] & 255n); out.push(u); return 0n; }
            case 1: return ip < input.length ? BigInt(input[ip++]) : -1n;
            case 2: code = Number(a); throw { ondaExit: code };
            case 5: { const x = new Float64Array(new BigInt64Array([a]).buffer)[0], t = cfmt(x), v = words(b, t.length); for (let i = 0; i < t.length; i++) v[i] = BigInt(t.charCodeAt(i)); return BigInt(t.length); }
            case 6: return BigInt(Math.round(agora() * 1000));
            case 7: { const need = (Number(a) + 16) * 8, cur = mem.buffer.byteLength; if (need > cur) mem.grow(Math.ceil((need - cur) / 65536)); return BigInt(mem.buffer.byteLength / 8 - 16); }
            case 8: {
                if (kb < 0n) {
                    const z = Math.max(Number(a), 1);
                    kb = words(-1, 1)[0];
                    const top = Number(kb) + z, need = (top + 16) * 8, cur = mem.buffer.byteLength;
                    if (need > cur) mem.grow(Math.ceil((need - cur) / 65536));
                    words(-1, 1)[0] = BigInt(top);
                    words(-7, 1)[0] = BigInt(mem.buffer.byteLength / 8 - 16);
                }
                return kb;
            }
        }
        return 0n;
    };
    const m1 = (c, x) => [Math.sin, Math.cos, Math.exp, Math.log][Number(c)](x);
    const m2 = (c, x, y) => (c === 0n ? Math.pow(x, y) : Math.atan2(x, y));
    const inst = await WebAssembly.instantiate(await modulo(wasm), { env: { sys, m1, m2 } });
    mem = inst.exports.memory;
    try { inst.exports._start(); } catch (x) { if (x?.ondaExit === undefined) throw x; }
    let n = 0;
    for (const c of out) n += c.length;
    const all = new Uint8Array(n);
    let o = 0;
    for (const c of out) { all.set(c, o); o += c.length; }
    return { code, text: new TextDecoder().decode(all) };
}

export const MOTIVOS = { 1: 'gosto', 2: 'qualidade', 3: 'tendencia', 4: 'claude', 5: 'novidade', 6: 'fixa' };

// Pesos (0..1000) de cada sinal na pontuação, por estilo de playlist.
export const ESTILOS = {
    equilibrado: { gosto: 300, qualidade: 200, tendencia: 200, claude: 300, novidade: 100 },
    descoberta: { gosto: 150, qualidade: 200, tendencia: 150, claude: 350, novidade: 400 },
    moda: { gosto: 150, qualidade: 150, tendencia: 500, claude: 250, novidade: 150 },
    gosto: { gosto: 550, qualidade: 150, tendencia: 50, claude: 200, novidade: 0 },
    audiofilo: { gosto: 150, qualidade: 500, tendencia: 50, claude: 300, novidade: 100 },
};
export const PENALIZACOES = { artista: 300, genero: 250, decada: 200 };
export const ARCOS = { plano: 0, onda: 1, sobe: 2, desce: 3 };

const inteiro = (v, a, b, d = a) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(b, Math.max(a, n)) : d; };
const chave = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// Monta a entrada do motor. Cada candidata: { artista, genero?, ano?, gosto, qualidade, tendencia, claude,
// novidade, energia (0..1000), bpm?, tom? (Camelot 1..24), fixa? } — os sinais já em 0..1000.
export function entrada(op = {}, cands = []) {
    const n = cands.length;
    const k = inteiro(op.k ?? n, 0, n);
    const w = { ...ESTILOS.equilibrado, ...(typeof op.estilo === 'string' ? ESTILOS[op.estilo] : null), ...(op.pesos || {}) };
    const l = { ...PENALIZACOES, ...(op.penalizacoes || {}) };
    const arco = typeof op.arco === 'string' ? (ARCOS[op.arco] ?? 1) : inteiro(op.arco ?? 1, 0, 3);
    const artistas = new Map(), generos = new Map();
    const id = (mapa, s, base) => { const c = chave(s); if (!c) return 0; if (!mapa.has(c)) mapa.set(c, mapa.size + base); return mapa.get(c); };
    const linhas = [
        '1',
        `${n} ${k} ${inteiro(op.maxArtista ?? 2, 0, 1000)}`,
        [w.gosto, w.qualidade, w.tendencia, w.claude, w.novidade].map((x) => inteiro(x, 0, 1000)).join(' '),
        [l.artista, l.genero, l.decada].map((x) => inteiro(x, 0, 1000)).join(' '),
        String(arco),
    ];
    for (const c of cands) {
        // sem artista conhecido: cada faixa conta como um artista à parte (não se penalizam entre si)
        const a = chave(c.artista) ? id(artistas, c.artista, 0) : id(artistas, `\u0000${artistas.size}`, 0);
        linhas.push([
            Math.min(a, n), Math.min(id(generos, c.genero, 1), n), inteiro(c.ano, 0, 2100, 0),
            inteiro(c.gosto, 0, 1000), inteiro(c.qualidade, 0, 1000), inteiro(c.tendencia, 0, 1000),
            inteiro(c.claude, 0, 1000), inteiro(c.novidade, 0, 1000), inteiro(c.energia ?? 500, 0, 1000),
            inteiro(c.bpm, 0, 400, 0), inteiro(c.tom, 0, 24, 0), c.fixa ? 1 : 0,
        ].join(' '));
    }
    return linhas.join('\n') + '\n';
}

// Lê a saída do motor: { ordem: [{ i, motivo, pontos }], custo }.
export function saida(text) {
    const nums = String(text).trim().split(/\s+/).map(Number);
    if (!nums.length || !Number.isInteger(nums[0])) throw new Error('motor Onda: saída inválida');
    const m = nums[0];
    if (nums.length !== 2 + 3 * m) throw new Error(`motor Onda: esperava ${2 + 3 * m} números, veio ${nums.length}`);
    const ordem = [];
    for (let p = 0; p < m; p++) {
        const [i, mo, pts] = nums.slice(1 + 3 * p, 4 + 3 * p);
        ordem.push({ i, motivo: MOTIVOS[mo] || 'gosto', pontos: pts });
    }
    return { ordem, custo: nums[1 + 3 * m] };
}

// Escolhe e ordena: devolve { ordem: [{ i, motivo, pontos }], custo } (i = índice em `cands`).
export async function curar(wasm, op, cands) {
    if (!cands.length) return { ordem: [], custo: 0 };
    const r = await correr(wasm, entrada(op, cands));
    if (r.code !== 0) throw new Error(`motor Onda terminou com código ${r.code}: ${r.text.trim()}`);
    return saida(r.text);
}
