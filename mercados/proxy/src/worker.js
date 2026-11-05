// Mercados — conector de dados (Cloudflare Worker)
//
// O browser não pode ler o Yahoo Finance, o Google Notícias nem a DGEG
// diretamente (não mandam cabeçalhos CORS). Este Worker vai buscar os dados,
// devolve JSON compacto com CORS aberto e guarda cada resposta uns segundos
// no CDN da Cloudflare (muitos pedidos iguais = uma ida à fonte).
//
//   GET /health                               → { ok, version }
//   GET /quotes?symbols=BZ=F,AAPL&range=1d    → cotações + série (até 40 símbolos)
//   GET /news?q=Galp&lang=pt&sym=GALP.LS      → notícias (Google, Bing ou Yahoo, por esta ordem)
//   GET /movers                               → maiores subidas/descidas/volume nos EUA (Yahoo)
//   GET /search?q=tesla                       → procurar símbolos
//   GET /calendar?symbols=AAPL,GALP.LS        → próximos resultados e dividendos (Yahoo)
//   GET /fuel?distrito=11                     → preços médios em Portugal (DGEG)
//   GET /fuel/distritos                       → lista de distritos (DGEG)
//   GET  /journal?id=…                        → diário de sugestões (KV)
//   POST /journal  { id, date, items, lots }  → guardar as sugestões do dia e as datas de compra de cripto
//   GET  /advice[?date=AAAA-MM-DD]            → análise diária escrita pelo Claude (KV, só leitura;
//                                               a tarefa agendada escreve-a pela API da Cloudflare)
//
// Sem segredos. Opcional em [vars]: ALLOWED_ORIGINS="https://x.github.io,..."
// para só aceitar pedidos vindos da tua app.

const VERSION = '1.3.0';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';
const MAX_SYMBOLS = 40;
const YH = ['https://query1.finance.yahoo.com', 'https://query2.finance.yahoo.com'];
const DGEG = 'https://precoscombustiveis.dgeg.gov.pt/api/PrecoComb';
const FUELS = { 2101: 'Gasóleo simples', 3201: 'Gasolina simples 95', 2105: 'Gasóleo especial', 3400: 'Gasolina 98' };

// intervalo de velas e tempo de cache (s) por período
const RANGES = {
    '1d': { interval: '5m', ttl: 15 },
    '5d': { interval: '30m', ttl: 60 },
    '1mo': { interval: '60m', ttl: 300 },
    '6mo': { interval: '1d', ttl: 900 },
    '1y': { interval: '1d', ttl: 1800 },
    '2y': { interval: '1d', ttl: 3600 },
    '5y': { interval: '1wk', ttl: 3600 },
};

const cors = (origin) => ({
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
});

function json(body, status = 200, ttl = 0, origin) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': ttl ? `public, max-age=${Math.min(ttl, 60)}, s-maxage=${ttl}` : 'no-store',
            ...cors(origin),
        },
    });
}

async function getJSON(url, init = {}) {
    const r = await fetch(url, { ...init, headers: { 'User-Agent': UA, 'Accept': 'application/json,text/plain,*/*', ...(init.headers || {}) } });
    if (!r.ok) throw new Error(`HTTP ${r.status} em ${new URL(url).host}`);
    return r.json();
}

// Tenta query1 e, se falhar, query2
async function yahoo(path, init) {
    let err;
    for (const base of YH) {
        try { return await getJSON(base + path, init); } catch (e) { err = e; }
    }
    throw err;
}

const round = (x) => (x == null || !Number.isFinite(x)) ? null : Number(x.toPrecision(7));

// ---------- /quotes ----------
export function parseChart(data, range, adj) {
    const res = data && data.chart && data.chart.result && data.chart.result[0];
    if (!res) throw new Error((data && data.chart && data.chart.error && data.chart.error.description) || 'sem dados');
    const m = res.meta || {};
    const ts = res.timestamp || [];
    const q = (res.indicators && res.indicators.quote && res.indicators.quote[0]) || {};
    // adj: preço ajustado a dividendos e desdobramentos (para o teste no passado)
    const ac = res.indicators && res.indicators.adjclose && res.indicators.adjclose[0] && res.indicators.adjclose[0].adjclose;
    const closes = (adj && ac && ac.length === ts.length ? ac : q.close) || [];
    const series = [];
    for (let i = 0; i < ts.length; i++) {
        const c = closes[i];
        if (c != null && Number.isFinite(c)) series.push([ts[i], round(c)]);
    }
    const price = Number.isFinite(m.regularMarketPrice) ? m.regularMarketPrice : (series.length ? series[series.length - 1][1] : null);
    let prev = null;
    if (range === '1d') prev = m.chartPreviousClose ?? m.previousClose ?? null;
    else if (RANGES[range] && RANGES[range].interval === '1d' && series.length > 1) prev = series[series.length - 2][1];
    else prev = m.previousClose ?? null;
    const reg = m.currentTradingPeriod && m.currentTradingPeriod.regular;
    const now = Date.now() / 1000;
    return {
        symbol: m.symbol,
        name: m.shortName || m.longName || m.symbol,
        longName: m.longName || null,
        currency: m.currency || null,
        exchange: m.fullExchangeName || m.exchangeName || null,
        type: m.instrumentType || null,
        price: round(price),
        prevClose: round(prev),
        change: price != null && prev ? round(price - prev) : null,
        changePct: price != null && prev ? round((price / prev - 1) * 100) : null,
        dayHigh: round(m.regularMarketDayHigh),
        dayLow: round(m.regularMarketDayLow),
        volume: m.regularMarketVolume ?? null,
        high52: round(m.fiftyTwoWeekHigh),
        low52: round(m.fiftyTwoWeekLow),
        time: m.regularMarketTime || (series.length ? series[series.length - 1][0] : null),
        open: reg ? now >= reg.start && now < reg.end : null,
        series,
    };
}

async function quotes(url) {
    const symbols = [...new Set((url.searchParams.get('symbols') || '').split(',').map((s) => s.trim()).filter(Boolean))];
    if (!symbols.length) return { status: 400, body: { error: 'falta symbols' } };
    if (symbols.length > MAX_SYMBOLS) return { status: 400, body: { error: `máximo ${MAX_SYMBOLS} símbolos por pedido` } };
    const range = RANGES[url.searchParams.get('range')] ? url.searchParams.get('range') : '1d';
    const interval = url.searchParams.get('interval') || RANGES[range].interval;
    const out = await Promise.all(symbols.map(async (s) => {
        try {
            const d = await yahoo(`/v8/finance/chart/${encodeURIComponent(s)}?range=${range}&interval=${interval}&includePrePost=false`);
            return parseChart(d, range, url.searchParams.get('adj') === '1');
        } catch (e) {
            return { symbol: s, error: String(e.message || e) };
        }
    }));
    return { body: { range, interval, at: Math.floor(Date.now() / 1000), quotes: out }, ttl: RANGES[range].ttl };
}

// ---------- /news ----------
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decode = (s) => String(s || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e) => {
        if (e[0] === '#') { const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isFinite(n) ? String.fromCodePoint(n) : m; }
        return ENT[e.toLowerCase()] ?? m;
    })
    .replace(/<[^>]+>/g, '')
    .trim();
const tag = (xml, t) => { const m = xml.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`, 'i')); return m ? decode(m[1]) : ''; };

export function parseRSS(xml, max = 12) {
    const items = [];
    const re = /<item>([\s\S]*?)<\/item>/gi;
    let m;
    while ((m = re.exec(xml)) && items.length < max) {
        const x = m[1];
        let title = tag(x, 'title');
        const source = tag(x, 'source') || tag(x, 'News:Source');
        let link = tag(x, 'link');
        // o Bing embrulha o link num redirecionamento: tirar o endereço verdadeiro
        const real = link.match(/[?&]url=([^&]+)/);
        if (real && /bing\.com/.test(link)) { try { link = decodeURIComponent(real[1]); } catch { /* fica o do Bing */ } }
        if (source && title.endsWith(' - ' + source)) title = title.slice(0, -(source.length + 3));
        const t = Date.parse(tag(x, 'pubDate'));
        items.push({ title, link, source: source || null, time: Number.isFinite(t) ? Math.floor(t / 1000) : null });
    }
    return items;
}

async function news(url) {
    const q = (url.searchParams.get('q') || '').trim().slice(0, 120);
    if (!q) return { status: 400, body: { error: 'falta q' } };
    const en = url.searchParams.get('lang') === 'en';
    const loc = en ? 'hl=en-US&gl=US&ceid=US:en' : 'hl=pt-PT&gl=PT&ceid=PT:pt-150';
    let items = [];
    const diag = {};
    try {
        const r = await fetch(`https://news.google.com/rss/search?q=${encodeURIComponent(q + ' when:3d')}&${loc}`, { headers: { 'User-Agent': UA } });
        const txt = await r.text();
        diag.google = `${r.status} ${txt.length}B`;
        if (r.ok) items = parseRSS(txt);
    } catch (e) { diag.google = String(e.message || e); }
    if (!items.length) {
        // o Google recusa pedidos vindos da Cloudflare: Bing Notícias (também em PT)
        const bloc = en ? 'setlang=en-US&cc=US' : 'setlang=pt-PT&cc=PT';
        try {
            const r = await fetch(`https://www.bing.com/news/search?q=${encodeURIComponent(q)}&format=rss&${bloc}`, { headers: { 'User-Agent': UA } });
            const txt = await r.text();
            diag.bing = `${r.status} ${txt.length}B`;
            if (r.ok) items = parseRSS(txt);
        } catch (e) { diag.bing = String(e.message || e); }
    }
    if (!items.length) {
        const sym = (url.searchParams.get('sym') || '').trim().slice(0, 20);
        try {
            const d = await yahoo(`/v1/finance/search?q=${encodeURIComponent(sym || q)}&quotesCount=0&newsCount=10`);
            items = (d.news || []).map((n) => ({ title: n.title, link: n.link, source: n.publisher || null, time: n.providerPublishTime || null }));
            diag.yahoo = `${items.length} notícias`;
        } catch (e) { diag.yahoo = String(e.message || e); }
    }
    items.sort((a, b) => (b.time || 0) - (a.time || 0));
    // sem notícias: cache curta e o motivo, para se perceber o que falhou
    return items.length ? { body: { q, items }, ttl: 600 } : { body: { q, items, diag }, ttl: 60 };
}

// ---------- /movers (precisa de cookie + crumb do Yahoo) ----------
let crumbCache = null; // { cookie, crumb, until } — vive enquanto o isolate viver
async function getCrumb() {
    if (crumbCache && crumbCache.until > Date.now()) return crumbCache;
    const r = await fetch('https://fc.yahoo.com/', { headers: { 'User-Agent': UA }, redirect: 'manual' });
    const raw = r.headers.get('set-cookie') || '';
    const cookie = raw.split(/,(?=\s*[A-Za-z0-9_]+=)/).map((c) => c.split(';')[0].trim()).filter(Boolean).join('; ');
    const c = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', { headers: { 'User-Agent': UA, Cookie: cookie } });
    const crumb = (await c.text()).trim();
    if (!c.ok || !crumb || crumb.length > 40 || crumb.includes('<')) throw new Error('sem crumb');
    crumbCache = { cookie, crumb, until: Date.now() + 25 * 60 * 1000 };
    return crumbCache;
}

const mapQuote = (q) => ({
    symbol: q.symbol,
    name: q.shortName || q.longName || q.symbol,
    price: round(q.regularMarketPrice),
    changePct: round(q.regularMarketChangePercent),
    volume: q.regularMarketVolume ?? null,
    marketCap: q.marketCap ?? null,
    currency: q.currency || null,
});

async function movers() {
    let auth = null;
    try { auth = await getCrumb(); } catch { /* tenta sem */ }
    const one = async (id) => {
        const qs = `scrIds=${id}&count=15&formatted=false&lang=en-US&region=US${auth ? '&crumb=' + encodeURIComponent(auth.crumb) : ''}`;
        const d = await yahoo(`/v1/finance/screener/predefined/saved?${qs}`, auth ? { headers: { Cookie: auth.cookie } } : {});
        const quotes = (d.finance && d.finance.result && d.finance.result[0] && d.finance.result[0].quotes) || [];
        return quotes.map(mapQuote).filter((q) => q.price != null);
    };
    const [gainers, losers, actives] = await Promise.all(['day_gainers', 'day_losers', 'most_actives'].map((id) => one(id).catch(() => null)));
    if (!gainers && !losers && !actives) { crumbCache = null; return { status: 502, body: { error: 'Yahoo recusou a lista de destaques' } }; }
    return { body: { at: Math.floor(Date.now() / 1000), gainers: gainers || [], losers: losers || [], actives: actives || [] }, ttl: 120 };
}

// ---------- /calendar (resultados e dividendos; precisa de cookie + crumb) ----------
const rawTs = (x) => (x && typeof x === 'object' ? x.raw : x) ?? null;
export function parseCalendar(d, symbol) {
    const c = d && d.quoteSummary && d.quoteSummary.result && d.quoteSummary.result[0] && d.quoteSummary.result[0].calendarEvents;
    if (!c) return { symbol, earnings: null, exDividend: null, dividend: null };
    const e = (c.earnings && c.earnings.earningsDate) || [];
    return {
        symbol,
        earnings: e.length ? rawTs(e[0]) : null,
        earningsEnd: e.length > 1 ? rawTs(e[1]) : null,
        exDividend: rawTs(c.exDividendDate),
        dividend: rawTs(c.dividendDate),
    };
}

async function calendar(url) {
    const symbols = [...new Set((url.searchParams.get('symbols') || '').split(',').map((s) => s.trim()).filter(Boolean))];
    if (!symbols.length) return { status: 400, body: { error: 'falta symbols' } };
    if (symbols.length > MAX_SYMBOLS) return { status: 400, body: { error: `máximo ${MAX_SYMBOLS} símbolos por pedido` } };
    let auth = null;
    try { auth = await getCrumb(); } catch { /* tenta sem */ }
    const items = await Promise.all(symbols.map(async (s) => {
        try {
            const qs = `modules=calendarEvents${auth ? '&crumb=' + encodeURIComponent(auth.crumb) : ''}`;
            const r = await fetch(`${YH[1]}/v10/finance/quoteSummary/${encodeURIComponent(s)}?${qs}`, { headers: { 'User-Agent': UA, ...(auth ? { Cookie: auth.cookie } : {}) } });
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return parseCalendar(await r.json(), s);
        } catch (e) {
            return { symbol: s, error: String(e.message || e) };
        }
    }));
    if (items.every((i) => i.error)) { crumbCache = null; return { status: 502, body: { error: 'Yahoo recusou a agenda', items } }; }
    return { body: { at: Math.floor(Date.now() / 1000), items }, ttl: 6 * 3600 };
}

// ---------- /search ----------
async function search(url) {
    const q = (url.searchParams.get('q') || '').trim().slice(0, 60);
    if (!q) return { status: 400, body: { error: 'falta q' } };
    const d = await yahoo(`/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=10&newsCount=0&enableFuzzyQuery=true`);
    const items = (d.quotes || []).filter((x) => x.symbol && x.quoteType !== 'OPTION').map((x) => ({
        symbol: x.symbol, name: x.shortname || x.longname || x.symbol, exchange: x.exchDisp || x.exchange || null, type: x.typeDisp || x.quoteType || null,
    }));
    return { body: { q, items }, ttl: 3600 };
}

// ---------- /fuel (DGEG) ----------
export const parsePrice = (raw) => {
    const m = String(raw ?? '').match(/\d+(?:[.,]\d+)?/);
    const v = m ? parseFloat(m[0].replace(',', '.')) : NaN;
    return v > 0 && v < 10 ? v : null;
};

export function fuelStats(rows) {
    const list = [];
    let latest = '';
    for (const s of rows || []) {
        const p = parsePrice(s.Preco);
        if (p == null) continue;
        list.push({ p, s });
        if (s.DataAtualizacao && String(s.DataAtualizacao) > latest) latest = String(s.DataAtualizacao);
    }
    if (!list.length) return null;
    list.sort((a, b) => a.p - b.p);
    const ps = list.map((x) => x.p);
    const mid = Math.floor(ps.length / 2);
    const median = ps.length % 2 ? ps[mid] : (ps[mid - 1] + ps[mid]) / 2;
    const avg = ps.reduce((a, b) => a + b, 0) / ps.length;
    const station = ({ p, s }) => ({ price: p, name: (s.Nome || '').trim(), brand: (s.Marca || '').trim() || null, place: [s.Municipio, s.Distrito].filter(Boolean).join(', ') || null });
    return {
        n: ps.length,
        avg: Math.round(avg * 1000) / 1000,
        median: Math.round(median * 1000) / 1000,
        min: ps[0],
        max: ps[ps.length - 1],
        cheapest: list.slice(0, 3).map(station),
        updated: latest || null,
    };
}

async function dgeg(path) {
    const d = await getJSON(`${DGEG}/${path}`);
    if (!d || d.status === false) throw new Error((d && d.mensagem) || 'DGEG sem resposta');
    return d.resultado;
}

async function fuel(url) {
    const distrito = /^\d{1,3}$/.test(url.searchParams.get('distrito') || '') ? url.searchParams.get('distrito') : '';
    const ids = (url.searchParams.get('tipos') || '2101,3201').split(',').filter((i) => FUELS[i]).slice(0, 4);
    const out = await Promise.all(ids.map(async (id) => {
        try {
            const rows = await dgeg(`PesquisarPostos?idsTiposComb=${id}&idMarca=&idTipoPosto=&idDistrito=${distrito}&idsMunicipios=&qtdPorPagina=9999&pagina=1`);
            return { id: Number(id), name: FUELS[id], ...(fuelStats(rows) || { error: 'sem preços' }) };
        } catch (e) {
            return { id: Number(id), name: FUELS[id], error: String(e.message || e) };
        }
    }));
    return { body: { distrito: distrito || null, source: 'DGEG — Preços dos Combustíveis Online', at: Math.floor(Date.now() / 1000), fuels: out }, ttl: 3600 };
}

async function distritos() {
    const rows = await dgeg('GetDistritos');
    return { body: { items: (rows || []).map((r) => ({ id: r.Id, name: r.Descritivo })).sort((a, b) => a.name.localeCompare(b.name, 'pt')) }, ttl: 86400 };
}

// ---------- /journal: diário das sugestões (um registo por id, um dia por chave) ----------
const JID = /^[a-z0-9-]{8,40}$/;
const JDATE = /^\d{4}-\d{2}-\d{2}$/;
const JMAX_DAYS = 800;
export function upsertJournal(doc, date, items) {
    const days = (doc && doc.days) || {};
    if (date && items) days[date] = items;
    const keys = Object.keys(days).sort();
    while (keys.length > JMAX_DAYS) delete days[keys.shift()];
    const out = { v: 1, days };
    if (doc && doc.lots) out.lots = doc.lots;
    if (doc && doc.saveDays) out.saveDays = doc.saveDays;
    return out;
}
// compras de cripto (para a isenção de 365 dias): { 'c:BTC': { plan: 'AAAA-MM-DD', buys: [{ d, e }] } }
export function cleanLots(l) {
    if (!l || typeof l !== 'object' || Array.isArray(l)) return null;
    const out = {};
    for (const k of Object.keys(l).slice(0, 12)) {
        if (!/^c:[A-Z0-9]{2,8}$/.test(k) || !l[k] || typeof l[k] !== 'object') continue;
        const buys = (Array.isArray(l[k].buys) ? l[k].buys : []).slice(0, 400)
            .filter((x) => x && JDATE.test(x.d || '')).map((x) => ({ d: x.d, e: Number.isFinite(+x.e) && +x.e > 0 ? Math.round(+x.e * 100) / 100 : 0 }));
        const plan = JDATE.test(l[k].plan || '') ? l[k].plan : '';
        if (buys.length || plan) out[k] = { plan, buys };
    }
    return out;
}
export function cleanItems(items) {
    if (!Array.isArray(items)) return null;
    return items.slice(0, 120).map((x) => ({
        s: String(x.s || '').slice(0, 24), p: Number(x.p), a: String(x.a || '').slice(0, 12),
        l: Number.isFinite(x.l) ? x.l : null, m: Number.isFinite(x.m) ? x.m : null, sh: Number.isFinite(x.sh) ? x.sh : null, o: x.o ? 1 : 0,
    })).filter((x) => x.s && Number.isFinite(x.p) && x.p > 0);
}
async function journal(request, url, env) {
    if (!env.JOURNAL) return { status: 501, body: { error: 'diário por configurar (KV JOURNAL)' } };
    if (request.method === 'GET') {
        const id = url.searchParams.get('id') || '';
        if (!JID.test(id)) return { status: 400, body: { error: 'id inválido' } };
        const doc = await env.JOURNAL.get('j:' + id, 'json');
        return { body: doc || { v: 1, days: {} } };
    }
    const text = await request.text();
    if (text.length > 40000) return { status: 413, body: { error: 'demasiado grande' } };
    let b;
    try { b = JSON.parse(text); } catch { return { status: 400, body: { error: 'JSON inválido' } }; }
    const items = cleanItems(b && b.items);
    const lots = cleanLots(b && b.lots);
    const hasItems = items && items.length && JDATE.test((b && b.date) || '');
    if (!b || !JID.test(b.id || '') || (!hasItems && !lots)) return { status: 400, body: { error: 'dados inválidos' } };
    const old = await env.JOURNAL.get('j:' + b.id, 'json');
    const doc = upsertJournal(old, hasItems ? b.date : null, hasItems ? items : null);
    if (lots) doc.lots = lots;
    if (Array.isArray(b.saveDays)) doc.saveDays = b.saveDays.map(Number).filter((d) => [2, 9, 16, 23].includes(d)).slice(0, 4);
    await env.JOURNAL.put('j:' + b.id, JSON.stringify(doc));
    return { body: { ok: true, days: Object.keys(doc.days).length } };
}

// ---------- /advice: análise do Claude (escrita pela tarefa agendada, aqui só se lê) ----------
async function advice(url, env) {
    if (!env.JOURNAL) return { status: 501, body: { error: 'KV por configurar' } };
    const date = url.searchParams.get('date') || '';
    if (date && !JDATE.test(date)) return { status: 400, body: { error: 'data inválida' } };
    const doc = await env.JOURNAL.get(date ? 'advice:' + date : 'advice:latest', 'json');
    if (!doc) return { status: 404, body: { error: 'ainda sem análise' } };
    return { body: doc };
}

// ---------- router ----------
const ROUTES = { '/quotes': quotes, '/news': news, '/movers': movers, '/calendar': calendar, '/search': search, '/fuel': fuel, '/fuel/distritos': distritos };

export default {
    async fetch(request, env = {}, ctx) {
        const reqOrigin = request.headers.get('Origin');
        const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
        const origin = allowed.length ? (allowed.includes(reqOrigin) ? reqOrigin : null) : '*';
        if (allowed.length && reqOrigin && !origin) return json({ error: 'origem não autorizada' }, 403, 0, allowed[0]);
        if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });
        const url = new URL(request.url);
        const path = url.pathname.replace(/\/+$/, '') || '/';
        if (path === '/journal' && (request.method === 'GET' || request.method === 'POST')) {
            try {
                const { status = 200, body } = await journal(request, url, env);
                return json(body, status, 0, origin);
            } catch (e) { return json({ error: String(e.message || e) }, 502, 0, origin); }
        }
        if (request.method !== 'GET') return json({ error: 'só GET' }, 405, 0, origin);
        if (path === '/advice') {
            try { const { status = 200, body } = await advice(url, env); return json(body, status, status === 200 ? 60 : 0, origin); } catch (e) { return json({ error: String(e.message || e) }, 502, 0, origin); }
        }
        if (path === '/' || path === '/health') return json({ ok: true, name: 'mercados-proxy', version: VERSION }, 200, 0, origin);
        const handler = ROUTES[path];
        if (!handler) return json({ error: 'não encontrado' }, 404, 0, origin);

        // Cache no CDN (por URL completo, sem a origem)
        const cache = typeof caches !== 'undefined' ? caches.default : null;
        const key = new Request(url.toString(), { method: 'GET' });
        if (cache) {
            const hitRes = await cache.match(key);
            if (hitRes) {
                const h = new Headers(hitRes.headers);
                for (const [k, v] of Object.entries(cors(origin))) h.set(k, v);
                return new Response(hitRes.body, { status: hitRes.status, headers: h });
            }
        }
        try {
            const { status = 200, body, ttl = 0 } = await handler(url, env);
            const res = json(body, status, status === 200 ? ttl : 0, origin);
            if (cache && status === 200 && ttl) {
                const p = cache.put(key, res.clone());
                if (ctx && ctx.waitUntil) ctx.waitUntil(p); else await p;
            }
            return res;
        } catch (e) {
            return json({ error: String(e.message || e) }, 502, 0, origin);
        }
    },
};
