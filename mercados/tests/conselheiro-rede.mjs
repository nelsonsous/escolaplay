// Rede e relógio simulados para os testes de paridade do conselheiro: carrega-se com `node --import` antes do script
// (o JS de referência ou o lançador da Onda) e responde aos pedidos ao conector (Worker) e à API do KV da Cloudflare.
//   CONSELHEIRO_CENA      cenário (JSON): agora, semente, kv, falhas, ajustes por símbolo (ver cenarios() no teste)
//   CONSELHEIRO_REGISTO   onde escrever, à saída, os pedidos feitos (método, URL, cabeçalhos, corpo) e o KV final
// As cotações saem do parseChart do próprio Worker (proxy/src/worker.js) sobre séries geradas por uma semente.
// O relógio fica parado em `agora` e as esperas (setTimeout/setInterval) passam a 1 ms: os pedidos respondem logo.
import { readFileSync, writeFileSync } from 'node:fs';
import { parseChart } from '../proxy/src/worker.js';

const cena = JSON.parse(readFileSync(process.env.CONSELHEIRO_CENA, 'utf8'));
const T = Date.parse(cena.agora);
const DataReal = Date;
globalThis.Date = class extends DataReal {
    constructor(...a) { if (a.length) super(...a); else super(T); }
    static now() { return T; }
};
const st = globalThis.setTimeout, si = globalThis.setInterval;
globalThis.setTimeout = (f, ms, ...a) => st(f, ms > 0 ? 1 : ms, ...a);
globalThis.setInterval = (f, ms, ...a) => si(f, ms > 0 ? 1 : ms, ...a);

// ---------- dados gerados ----------
const hash = (s) => { let h = 2166136261 >>> 0; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; };
const rng = (seed) => () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const aj = (s) => (cena.simbolos && cena.simbolos[s]) || {};
const moeda = (s) => aj(s).moeda ?? (/-EUR$|\.(DE|PA|AS|MI|MC|LS|BR|VI|HE|IR)$/.test(s) ? 'EUR' : /\.CO$/.test(s) ? 'DKK' : /\.L$/.test(s) ? 'GBp' : /\.SW$/.test(s) ? 'CHF' : /=X$/.test(s) ? (s.slice(3, 6) || 'USD') : 'USD');
const tipo = (s) => aj(s).tipo ?? (/-EUR$|-USD$/.test(s) ? 'CRYPTOCURRENCY' : /=F$/.test(s) ? 'FUTURE' : /^\^/.test(s) ? 'INDEX' : /=X$/.test(s) ? 'CURRENCY' : /\.DE$/.test(s) && hash(s) % 3 === 0 ? 'ETF' : 'EQUITY');
function grafico(s, range) {
    const r = rng(hash(s + '|' + (cena.semente || 1)));
    const p0 = aj(s).p0 ?? (/=X$/.test(s) ? 0.5 + r() : 5 + r() * (hash(s) % 7 === 0 ? 60000 : 400));
    const vol = aj(s).vol ?? 0.005 + r() * 0.04;
    const n = range === '1d' ? 90 : aj(s).n ?? (/^\d+y$/.test(range) ? 252 * parseInt(range, 10) : 252);
    const passo = range === '1d' ? 300 : 86400, t0 = Math.floor(T / 1000) - n * passo;
    const ts = [], close = [];
    let p = p0;
    for (let i = 0; i < n; i++) {
        p *= Math.exp((r() - 0.5) * 2 * vol + (aj(s).tendencia ?? 0));
        ts.push(t0 + i * passo);
        close.push(aj(s).nulos && i % 17 === 3 ? null : r() < 0.002 ? null : p);
    }
    const ult = close.filter((x) => x != null).pop() ?? null;
    const meta = {
        symbol: aj(s).simbolo ?? s, shortName: aj(s).nome ?? `${s} Inc`, longName: aj(s).nomeLongo ?? (hash(s) % 5 ? `${s} Holdings ${aj(s).nome || ''}`.trim() : null),
        currency: moeda(s), instrumentType: tipo(s), fullExchangeName: 'Bolsa', regularMarketTime: Math.floor(T / 1000) - 600,
        regularMarketPrice: aj(s).semPreco ? undefined : ult == null ? undefined : ult * (1 + (r() - 0.5) * (aj(s).dia ?? 0.04)),
        chartPreviousClose: ult == null ? undefined : ult * (1 + (r() - 0.5) * 0.01), previousClose: ult,
        regularMarketDayHigh: ult && ult * 1.01, regularMarketDayLow: ult && ult * 0.99, regularMarketVolume: Math.floor(r() * 1e7),
        fiftyTwoWeekHigh: p0 * 1.5, fiftyTwoWeekLow: p0 * 0.5,
    };
    return { chart: { result: [{ meta, timestamp: ts, indicators: { quote: [{ close }] } }] } };
}
function cotacao(s, range) {
    const a = aj(s);
    if (a.erro || (a.erroEm && a.erroEm.includes(range))) return { symbol: s, error: a.erro || 'Not Found' };
    const q = parseChart(grafico(s, range), range, false);
    if (a.curto && range !== '1d') q.series = q.series.slice(-a.curto);
    if (a.serie) q.series = a.serie;
    if (a.extra) Object.assign(q, a.extra);
    return q;
}
const TITULOS = ['Shares rally after strong quarterly results', 'Ações caem com receios de tarifas', 'Bitcoin sobe para máximo de três semanas 🚀',
    'Investors weigh rate cut odds as inflation cools — what it means for stocks this week and beyond, analysts say in a long report',
    'Mercados à espera da Fed: “cautela” domina a sessão', 'Tech giants lead gains; Nasdaq up 1.2%', '"Quotes" & <tags> in the title', 'Short'];
function noticias(q, sym) {
    const r = rng(hash('n|' + q + '|' + sym + '|' + (cena.semente || 1)));
    const n = cena.semNoticias ? 0 : Math.floor(r() * 7);
    return Array.from({ length: n }, (_, i) => {
        let title = TITULOS[Math.floor(r() * TITULOS.length)] + (i % 3 === 2 ? ' ' + 'x'.repeat(110) + '😀 fim' : '');
        if (cena.titulosEstranhos && i === 1) title = 'Emoji no corte: ' + 'a'.repeat(102) + '😀😀😀 resto';
        return { title, link: `https://x.test/${i}`, source: i % 4 === 3 ? null : ['Reuters', 'Público', 'ECO', 'CNBC'][i % 4], time: Math.floor(T / 1000) - i * 3600 };
    });
}
function agenda(s) {
    const r = rng(hash('c|' + s + '|' + (cena.semente || 1)));
    if (aj(s).agendaErro) return { symbol: s, error: 'Yahoo recusou' };
    const now = Math.floor(T / 1000), d = () => (r() < 0.5 ? null : now + Math.floor((r() - 0.2) * 45 * 86400));
    return { symbol: s, earnings: aj(s).resultados ?? d(), earningsEnd: null, exDividend: d(), dividend: null };
}

// o /consensus do conector (1.8.0): os analistas, os fundamentos, as revisões e as surpresas de uma ação; o fundo por
// dentro; e respostas estranhas à mistura (campos que faltam, tipos errados), como as que o Yahoo dá de vez em quando
function consenso(s) {
    const r = rng(hash('k|' + s + '|' + (cena.semente || 1))), a = aj(s);
    if (a.consErro) return { symbol: s, error: 'HTTP 500' };
    if ('cons' in a) return a.cons;
    if (tipo(s) === 'ETF' || /^(VWCE|EUNL|SXR8|SXRV|IS3N|EXSA|4GLD)\.DE$/.test(s)) {
        return r() < 0.3 ? { symbol: s, none: true } : { symbol: s, none: true, fund: { pe: r() < 0.2 ? null : 12 + r() * 14, pb: 1 + r() * 4, ter: r() < 0.2 ? null : 0.0005 + r() * 0.006, top: [['Empresa A', 0.05]] } };
    }
    if (r() < 0.1) return { symbol: s, none: true };
    const KEYS = ['strong_buy', 'buy', 'hold', 'underperform', 'sell', 'strong_sell', 'esquisito'], price = 20 + r() * 300;
    const o = { symbol: s, key: KEYS[Math.floor(r() * KEYS.length)], mean: r() < 0.1 ? null : 1 + r() * 4, n: r() < 0.1 ? 0 : Math.floor(1 + r() * 60),
        target: r() < 0.15 ? null : price * (0.7 + r() * 0.8), low: null, high: null, price: r() < 0.1 ? 0 : price, currency: 'USD', votes: null };
    if (r() < 0.7) o.f = { pe: r() < 0.15 ? null : r() < 0.1 ? -8 : 5 + r() * 60, cr: r() < 0.15 ? null : r() * 0.8 - 0.2, mg: r() < 0.15 ? null : r() * 0.6 - 0.1, ...(r() < 0.5 ? { roe: r() * 0.6 - 0.1, de: r() * 300 } : {}) };
    if (r() < 0.6) o.rev = { up: Math.floor(r() * 20), down: Math.floor(r() * 12), chg: r() < 0.3 ? null : r() * 0.4 - 0.2 };
    if (r() < 0.6) o.sur = { n: 4, beats: Math.floor(r() * 5), avg: r() * 0.2 - 0.05 };
    return o;
}
function criptoGlobal() {
    const r = rng(hash('g|' + (cena.semente || 1)));
    return { mcap: null, mcapChg: r() * 8 - 4, vol: null, btcDom: 40 + r() * 30, ethDom: 8 + r() * 10, fng: { v: Math.floor(r() * 101), label: ['Extreme Fear', 'Fear', 'Neutral', 'Greed', ''][Math.floor(r() * 5)], prev: r() < 0.3 ? null : Math.floor(r() * 101) } };
}

// ---------- KV ----------
const KV = new Map(Object.entries(cena.kv || {}).map(([k, v]) => [k, { v: typeof v === 'string' ? v : JSON.stringify(v.valor), m: v.meta ?? null }]));
for (const [k, v] of Object.entries(cena.kvTexto || {})) KV.set(k, { v, m: null });
for (const [k, m] of Object.entries(cena.kvMeta || {})) if (KV.has(k)) KV.get(k).m = m;
const registo = [];
const resp = (corpo, estado = 200) => new Response(typeof corpo === 'string' ? corpo : JSON.stringify(corpo), { status: estado, headers: { 'Content-Type': 'application/json' } });
const usadas = new Map();
function falha(u, init) {
    for (const [i, f] of (cena.falhas || []).entries()) {
        if (!new RegExp(f.url).test(u) || (f.metodo && f.metodo !== (init.method || 'GET'))) continue;
        const n = usadas.get(i) || 0;
        if (f.vezes != null && n >= f.vezes) continue;
        usadas.set(i, n + 1);
        return f;
    }
    return null;
}
globalThis.fetch = async (url, init = {}) => {
    const u = String(url), metodo = init.method || 'GET';
    const cab = init.headers ? Object.entries(init.headers) : [];
    const corpo = init.body == null ? null : typeof init.body === 'string' ? init.body : Buffer.from(init.body).toString('utf8');
    registo.push({ metodo, url: u, cab, corpo });
    const f = falha(u, init);
    if (f) {
        if (f.tipo === 'rede') throw new TypeError('fetch failed');
        if (f.tipo === 'tempo') return new Promise((_, rej) => { if (init.signal) init.signal.addEventListener('abort', () => rej(init.signal.reason)); });
        if (f.tipo === 'corpo') return new Response(new ReadableStream({ start(c) { c.error(new TypeError('terminated')); } }), { status: f.estado || 200 });
        return resp(f.corpo ?? { error: f.erro ?? undefined }, f.estado ?? 500);
    }
    const p = new URL(u);
    if (p.hostname === 'api.cloudflare.com') {
        const m = p.pathname.match(/\/storage\/kv\/namespaces\/[^/]+\/(keys|values\/(.*))$/);
        if (!m) return resp({ success: false, errors: [{ code: 7003, message: 'No route' }] }, 404);
        if (m[1] === 'keys') {
            const pre = p.searchParams.get('prefix') || '', cur = Number(p.searchParams.get('cursor') || 0), tam = cena.pagina || 1000;
            const todos = [...KV.keys()].filter((k) => k.startsWith(pre)).sort();
            const parte = todos.slice(cur, cur + tam).map((k) => (KV.get(k).m ? { name: k, metadata: KV.get(k).m } : { name: k }));
            const prox = cur + tam < todos.length ? String(cur + tam) : '';
            return resp({ result: parte, success: true, errors: [], messages: [], result_info: { count: parte.length, cursor: prox } });
        }
        const chave = decodeURIComponent(m[2]);
        if (metodo === 'PUT') { KV.set(chave, { v: corpo, m: null }); return resp({ success: true, errors: [], messages: [], result: null }); }
        return KV.has(chave) ? new Response(KV.get(chave).v, { status: 200 }) : resp({ success: false, errors: [{ code: 10009, message: 'get: key not found' }] }, 404);
    }
    if (p.pathname === '/quotes') {
        const range = p.searchParams.get('range') || '1d';
        const syms = [...new Set((p.searchParams.get('symbols') || '').split(',').map((s) => s.trim()).filter(Boolean))];
        return resp({ range, interval: range === '1d' ? '5m' : '1d', at: Math.floor(T / 1000), quotes: syms.map((s) => cotacao(s, range)) });
    }
    if (p.pathname === '/news') { const q = p.searchParams.get('q') || ''; return resp({ q, items: noticias(q, p.searchParams.get('sym') || '') }); }
    if (p.pathname === '/calendar') return resp({ at: Math.floor(T / 1000), items: (p.searchParams.get('symbols') || '').split(',').map(agenda) });
    // cena.consCorpo e cena.cg: o corpo inteiro, quando o cenário quer uma resposta estranha
    if (p.pathname === '/consensus') return resp('consCorpo' in cena ? JSON.stringify(cena.consCorpo) : { at: Math.floor(T / 1000), items: (p.searchParams.get('symbols') || '').split(',').map(consenso) });
    if (p.pathname === '/cryptoglobal') return resp('cg' in cena ? JSON.stringify(cena.cg) : criptoGlobal());
    return resp({ error: 'rota desconhecida' }, 404);
};
process.on('exit', () => {
    if (process.env.CONSELHEIRO_REGISTO) writeFileSync(process.env.CONSELHEIRO_REGISTO, JSON.stringify({ pedidos: registo, kv: Object.fromEntries([...KV].map(([k, x]) => [k, x.v])) }));
});
