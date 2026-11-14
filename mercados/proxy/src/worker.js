// Mercados — conector de dados (Cloudflare Worker)
//
// O browser não pode ler o Yahoo Finance, o Google Notícias nem a DGEG
// diretamente (não mandam cabeçalhos CORS). Este Worker vai buscar os dados,
// devolve JSON compacto com CORS aberto e guarda cada resposta uns segundos
// no CDN da Cloudflare (muitos pedidos iguais = uma ida à fonte).
//
//   GET /health                               → { ok, version }
//   GET /consensus?symbols=NVDA,ALV.DE,VWCE.DE → ações: consenso dos analistas, fundamentos, revisões das estimativas e surpresas dos resultados; fundos: P/E, custo e maiores posições
//   GET /quotes?symbols=BZ=F,AAPL&range=1d    → cotações + série (até 40 símbolos)
//   GET /news?q=Galp&lang=pt&sym=GALP.LS      → notícias (Google, Bing ou Yahoo, por esta ordem)
//   GET /movers                               → maiores subidas/descidas/volume nos EUA (Yahoo)
//   GET /search?q=tesla                       → procurar símbolos
//   GET /calendar?symbols=AAPL,GALP.LS        → próximos resultados e dividendos (Yahoo)
//   GET /fuel?distrito=11                     → preços médios em Portugal (DGEG)
//   GET /fuel/distritos                       → lista de distritos (DGEG)
//   GET /fuel?…&tipos=3201&list=1             → também a lista de postos (até 300, mais baratos primeiro)
//   GET /cryptoglobal                         → mercado cripto: capitalização, dominância BTC, volume, medo e ganância
//   GET /fuel/municipios?distrito=13          → concelhos de um distrito (DGEG); /fuel?municipio=… filtra por concelho
//   GET  /journal?id=…                        → diário de sugestões (KV)
//   POST /journal  { id, date, items, lots, plano }  → guardar as sugestões do dia, o que se tem (com o valor por mês e o
//                  prazo de cada ativo, desde a 1.9.0) e o valor do plano mensal
//   GET  /advice?id=…[&date=AAAA-MM-DD]       → análise do Claude (KV, só leitura; a tarefa agendada escreve-a
//                                               pela API da Cloudflare): a completa só para o dono, as outras
//                                               apps recebem a sua (a dos seus ativos), se a ligarem
//   GET  /me?id=…                             → { owner, others }: se é a app do dono e se a análise para as outras está ligada
//   GET  /stats?id=<dono>                     → quantas apps se ligam e quantas pedem a análise do Claude
//   POST /owner { id, others }                → o dono liga/desliga a análise do Claude para as outras apps
//   GET  /universe?id=<dono>                  → classificação de toda a lista da Trade Republic (escrita pela tarefa)
//
// Sem segredos. Opcional em [vars]: ALLOWED_ORIGINS="https://x.github.io,..."
// para só aceitar pedidos vindos da tua app.

const VERSION = '1.9.1';
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

// Tenta query1 e, se falhar, query2. Se os dois recusarem por excesso de pedidos ou falha do servidor (429, 5xx),
// espera um pouco e dá mais uma volta — enquanto houver tentativas em orc.n (cada pedido à app tem o seu orçamento,
// para não passar o limite de pedidos de saída da Cloudflare quando o Yahoo está em baixo para todos os símbolos).
async function yahoo(path, init, orc) {
    let err;
    for (let volta = 0; volta < 2; volta++) {
        for (const base of YH) {
            try { return await getJSON(base + path, init); } catch (e) { err = e; }
        }
        if (!orc || orc.n <= 0 || !/HTTP (429|5\d\d)/.test(String(err && err.message))) break;
        orc.n--;
        await new Promise((r) => setTimeout(r, 300));
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
    const orc = { n: 4 }; // segundas tentativas deste pedido (cada uma são mais dois pedidos ao Yahoo)
    const out = await Promise.all(symbols.map(async (s) => {
        try {
            const d = await yahoo(`/v8/finance/chart/${encodeURIComponent(s)}?range=${range}&interval=${interval}&includePrePost=false`, undefined, orc);
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

// ---------- /consensus (o que os analistas dizem de uma ação; precisa de cookie + crumb) ----------
// recomendação (strong_buy, buy, hold, underperform, sell), a média (1 = compra forte … 5 = venda), quantos
// analistas, o preço-alvo (médio, mínimo, máximo) e os votos do mês. ETF, índices e cripto não têm: none.
// Desde a 1.7.0 também os fundamentos da empresa, em f (só se o Yahoo os dá): o P/E esperado (sem ele, o dos últimos
// 12 meses), o crescimento das vendas num ano e a margem de lucro (frações: 0,12 = 12 %).
// Desde a 1.8.0, no mesmo pedido ao Yahoo:
//   f      mais fundamentos, só os que há: roe (rentabilidade do capital), de (dívida / capital, em %), eg (crescimento
//          dos lucros), peg, pb (preço / valor contabilístico), beta, short (parte das ações vendidas a descoberto),
//          dy (dividendo)
//   rev    as estimativas de lucro deste ano: up e down (quantos analistas as subiram e desceram em 30 dias) e chg
//          (quanto a estimativa mudou em 90 dias, em fração)
//   sur    os últimos resultados (até 4 trimestres): n, beats (acima do esperado) e avg (a surpresa média, em fração)
//   votes3 os votos de há 3 meses, para ver para onde vão as recomendações
// E, para os fundos (um segundo pedido, só para o que não tem analistas nem fundamentos):
//   fund   pe e pb (os das empresas que o fundo tem), ter (o custo por ano, em fração) e top (as 5 maiores posições:
//          [nome, peso em fração])
const numY = (x) => { const v = rawTs(x); return Number.isFinite(v) ? v : null; };
export function parseConsensus(d, symbol) {
    const r = d && d.quoteSummary && d.quoteSummary.result && d.quoteSummary.result[0];
    const f = r && r.financialData, sd = (r && r.summaryDetail) || {}, ks = (r && r.defaultKeyStatistics) || {}, num = numY;
    const tr = r && r.recommendationTrend && Array.isArray(r.recommendationTrend.trend) ? r.recommendationTrend.trend : [];
    const votos = (per) => { const t = tr.find((x) => x && x.period === per); return t ? [t.strongBuy, t.buy, t.hold, t.sell, t.strongSell].map((v) => (Number.isFinite(v) ? v : 0)) : null; };
    const fu = { pe: num(sd.forwardPE) ?? num(ks.forwardPE) ?? num(sd.trailingPE), cr: f ? num(f.revenueGrowth) : null, mg: f ? num(f.profitMargins) : null };
    const mais = { roe: f ? num(f.returnOnEquity) : null, de: f ? num(f.debtToEquity) : null, eg: f ? num(f.earningsGrowth) : null,
        peg: num(ks.pegRatio), pb: num(ks.priceToBook), beta: num(sd.beta) ?? num(ks.beta), short: num(ks.shortPercentOfFloat), dy: num(sd.dividendYield) };
    const temF = fu.pe != null || fu.cr != null || fu.mg != null || Object.values(mais).some((v) => v != null);
    for (const [k, v] of Object.entries(mais)) if (v != null) fu[k] = v;
    // as estimativas de lucro do ano em curso (sem ele, do próximo)
    const et = r && r.earningsTrend && Array.isArray(r.earningsTrend.trend) ? r.earningsTrend.trend : [];
    const ano = et.find((x) => x && x.period === '0y') || et.find((x) => x && x.period === '+1y');
    let rev = null;
    if (ano) {
        // o Yahoo não escreve estas chaves sempre da mesma maneira (downLast30days, downLast30Days): sem olhar a maiúsculas
        const sem = (o, nome) => { const k = Object.keys(o).find((x) => x.toLowerCase() === nome); return k ? o[k] : undefined; };
        const er = ano.epsRevisions || {}, tt = ano.epsTrend || {};
        const up = num(sem(er, 'uplast30days')), down = num(sem(er, 'downlast30days')), agora = num(tt.current), antes = num(sem(tt, '90daysago'));
        const chg = agora != null && antes != null && antes > 0 ? round(agora / antes - 1) : null;
        if (up != null || down != null || chg != null) rev = { up: up ?? 0, down: down ?? 0, chg };
    }
    const eh = r && r.earningsHistory && Array.isArray(r.earningsHistory.history) ? r.earningsHistory.history : [];
    const ss = eh.map((x) => num(x && x.surprisePercent)).filter((v) => v != null).slice(-4);
    const sur = ss.length ? { n: ss.length, beats: ss.filter((v) => v > 0).length, avg: round(ss.reduce((a, b) => a + b, 0) / ss.length) } : null;
    const extra = { ...(temF ? { f: fu } : {}), ...(rev ? { rev } : {}), ...(sur ? { sur } : {}) };
    const n = f ? rawTs(f.numberOfAnalystOpinions) : null;
    if (!f || !n || !f.recommendationKey || f.recommendationKey === 'none') return { symbol, none: true, ...extra };
    const v3 = votos('-3m');
    return {
        symbol, key: String(f.recommendationKey).slice(0, 20), mean: num(f.recommendationMean), n,
        target: num(f.targetMeanPrice), low: num(f.targetLowPrice), high: num(f.targetHighPrice), price: num(f.currentPrice),
        currency: typeof f.financialCurrency === 'string' ? f.financialCurrency.slice(0, 5) : null,
        votes: votos('0m'), ...(v3 ? { votes3: v3 } : {}),
        ...extra,
    };
}
// os dados de um fundo (ETF): o Yahoo dá o P/E e o P/B das empresas do fundo ao contrário (lucros / preço), por
// isso um valor entre 0 e 1 inverte-se
export function parseFund(d) {
    const r = d && d.quoteSummary && d.quoteSummary.result && d.quoteSummary.result[0];
    const th = r && r.topHoldings, fp = r && r.fundProfile, num = numY;
    if (!th && !fp) return null;
    const eq = (th && th.equityHoldings) || {}, inv = (v) => (v == null || v <= 0 ? null : round(v < 1 ? 1 / v : v));
    const top = th && Array.isArray(th.holdings) ? th.holdings.slice(0, 5).map((h) => [String((h && (h.holdingName || h.symbol)) || '').slice(0, 40), num(h && h.holdingPercent)]).filter((x) => x[0] && x[1] != null) : [];
    const fees = fp && fp.feesExpensesInvestment;
    const out = { pe: inv(num(eq.priceToEarnings)), pb: inv(num(eq.priceToBook)), ter: fees ? num(fees.annualReportExpenseRatio) : null, top };
    return out.pe == null && out.pb == null && out.ter == null && !top.length ? null : out;
}

const CONS_MOD = 'financialData,recommendationTrend,summaryDetail', CONS_MAIS = ',defaultKeyStatistics,earningsTrend,earningsHistory';
async function consensus(url) {
    const symbols = [...new Set((url.searchParams.get('symbols') || '').split(',').map((s) => s.trim()).filter(Boolean))];
    if (!symbols.length) return { status: 400, body: { error: 'falta symbols' } };
    if (symbols.length > MAX_SYMBOLS) return { status: 400, body: { error: `máximo ${MAX_SYMBOLS} símbolos por pedido` } };
    let auth = null;
    try { auth = await getCrumb(); } catch { /* tenta sem */ }
    const pede = (s, modulos) => fetch(`${YH[1]}/v10/finance/quoteSummary/${encodeURIComponent(s)}?modules=${modulos}${auth ? '&crumb=' + encodeURIComponent(auth.crumb) : ''}`, { headers: { 'User-Agent': UA, ...(auth ? { Cookie: auth.cookie } : {}) } });
    // a Cloudflare dá 50 pedidos de saída por pedido: os dos símbolos, os do crumb e uma folga para os segundos pedidos
    const orc = { n: Math.max(0, 46 - symbols.length) };
    const items = await Promise.all(symbols.map(async (s) => {
        try {
            let r = await pede(s, CONS_MOD + CONS_MAIS);
            // se o Yahoo recusar o pedido maior, o de sempre: o consenso não se perde por causa dos módulos novos
            if (!r.ok && r.status !== 404 && orc.n > 0) { orc.n--; r = await pede(s, CONS_MOD); }
            if (r.status === 404) return { symbol: s, none: true };
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return parseConsensus(await r.json(), s);
        } catch (e) {
            return { symbol: s, error: String(e.message || e) };
        }
    }));
    // os fundos: o que não tem analistas nem fundamentos pode ser um ETF
    await Promise.all(items.map(async (it) => {
        if (!it.none || it.f || orc.n <= 0) return;
        orc.n--;
        try { const r = await pede(it.symbol, 'topHoldings,fundProfile'); if (r.ok) { const fd = parseFund(await r.json()); if (fd) it.fund = fd; } } catch { /* fica sem os dados do fundo */ }
    }));
    if (items.every((i) => i.error)) { crumbCache = null; return { status: 502, body: { error: 'Yahoo recusou o consenso', items } }; }
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

export function fuelStats(rows, withList) {
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
        // lista de postos (mais baratos primeiro), só quando pedida
        ...(withList ? { stations: list.slice(0, 300).map((x) => ({ ...station(x),
            addr: [x.s.Morada, x.s.Localidade].map((v) => String(v || '').trim()).filter(Boolean).join(', ') || null,
            lat: Number.isFinite(+x.s.Latitude) && +x.s.Latitude ? +x.s.Latitude : null, lon: Number.isFinite(+x.s.Longitude) && +x.s.Longitude ? +x.s.Longitude : null,
            upd: x.s.DataAtualizacao ? String(x.s.DataAtualizacao) : null })) } : {}),
    };
}

async function dgeg(path) {
    const d = await getJSON(`${DGEG}/${path}`);
    if (!d || d.status === false) throw new Error((d && d.mensagem) || 'DGEG sem resposta');
    return d.resultado;
}

async function fuel(url) {
    const distrito = /^\d{1,3}$/.test(url.searchParams.get('distrito') || '') ? url.searchParams.get('distrito') : '';
    const municipio = /^\d{1,5}$/.test(url.searchParams.get('municipio') || '') ? url.searchParams.get('municipio') : '';
    const ids = (url.searchParams.get('tipos') || '2101,3201').split(',').filter((i) => FUELS[i]).slice(0, 4);
    const out = await Promise.all(ids.map(async (id) => {
        try {
            const rows = await dgeg(`PesquisarPostos?idsTiposComb=${id}&idMarca=&idTipoPosto=&idDistrito=${distrito}&idsMunicipios=${municipio}&qtdPorPagina=9999&pagina=1`);
            return { id: Number(id), name: FUELS[id], ...(fuelStats(rows, url.searchParams.get('list') === '1') || { error: 'sem preços' }) };
        } catch (e) {
            return { id: Number(id), name: FUELS[id], error: String(e.message || e) };
        }
    }));
    return { body: { distrito: distrito || null, municipio: municipio || null, source: 'DGEG — Preços dos Combustíveis Online', at: Math.floor(Date.now() / 1000), fuels: out }, ttl: 3600 };
}

// ---------- /cryptoglobal: o que as apps de cripto mostram (CoinGecko + alternative.me) ----------
export function parseCryptoGlobal(g, f) {
    const d = g && g.data;
    const fg = f && Array.isArray(f.data) ? f.data : [];
    return {
        mcap: d && d.total_market_cap ? d.total_market_cap.eur ?? null : null,
        mcapChg: d && Number.isFinite(d.market_cap_change_percentage_24h_usd) ? d.market_cap_change_percentage_24h_usd : null,
        vol: d && d.total_volume ? d.total_volume.eur ?? null : null,
        btcDom: d && d.market_cap_percentage ? d.market_cap_percentage.btc ?? null : null,
        ethDom: d && d.market_cap_percentage ? d.market_cap_percentage.eth ?? null : null,
        fng: fg[0] ? { v: Number(fg[0].value), label: fg[0].value_classification || '', prev: fg[1] ? Number(fg[1].value) : null } : null,
    };
}
async function cryptoGlobal() {
    const [g, f] = await Promise.all([
        getJSON('https://api.coingecko.com/api/v3/global').catch(() => null),
        getJSON('https://api.alternative.me/fng/?limit=2').catch(() => null),
    ]);
    const out = parseCryptoGlobal(g, f);
    // a CoinGecko às vezes recusa pedidos do Cloudflare: a CoinPaprika (em USD) serve de alternativa
    if (out.mcap == null) {
        // CoinLore (grátis, sem chave): [{ total_mcap, total_volume, btc_d, eth_d, mcap_change }] em USD
        const l = await getJSON('https://api.coinlore.net/api/global/').catch(() => null);
        const x = Array.isArray(l) ? l[0] : null;
        if (x) Object.assign(out, { mcapUsd: +x.total_mcap || null, volUsd: +x.total_volume || null, mcapChg: Number.isFinite(+x.mcap_change) ? +x.mcap_change : out.mcapChg, btcDom: +x.btc_d || out.btcDom, ethDom: +x.eth_d || out.ethDom });
    }
    if (out.mcap == null && out.mcapUsd == null) {
        const p = await getJSON('https://api.coinpaprika.com/v1/global').catch(() => null);
        if (p) Object.assign(out, { mcapUsd: p.market_cap_usd ?? null, volUsd: p.volume_24h_usd ?? null, mcapChg: Number.isFinite(p.market_cap_change_24h) ? p.market_cap_change_24h : out.mcapChg, btcDom: p.bitcoin_dominance_percentage ?? out.btcDom });
    }
    if (out.mcap == null && out.mcapUsd == null && !out.fng) return { status: 502, body: { error: 'sem dados do mercado cripto' } };
    return { body: out, ttl: 600 };
}

async function distritos() {
    const rows = await dgeg('GetDistritos');
    return { body: { items: (rows || []).map((r) => ({ id: r.Id, name: r.Descritivo })).sort((a, b) => a.name.localeCompare(b.name, 'pt')) }, ttl: 86400 };
}
async function municipios(url) {
    const d = url.searchParams.get('distrito') || '';
    if (!/^\d{1,3}$/.test(d)) return { status: 400, body: { error: 'distrito inválido' } };
    const rows = await dgeg(`GetMunicipios?idDistrito=${d}`);
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
    if (doc && doc.claude) out.claude = true;
    if (doc && doc.my) out.my = doc.my;
    return out;
}
// símbolos da app (Yahoo ou c:BTC): só letras maiúsculas, números e . - = ^ (nada de texto livre)
const SYM = /^(c:[A-Z0-9]{2,10}|[A-Z0-9^][A-Z0-9.=^-]{0,19})$/;
export const cleanSyms = (a) => (Array.isArray(a) ? [...new Set(a.map(String).filter((s) => SYM.test(s)))].slice(0, 20) : null);
// compras de cripto (para a isenção de 365 dias): { 'c:BTC': { plan: 'AAAA-MM-DD', buys: [{ d, e }] } }
const HZS = ['short', 'mid', 'long'];
// o plano mensal dos Ajustes da app (1.9.0): quanto investe por mês e a parte da cripto
export function cleanPlano(p) {
    if (!p || typeof p !== 'object' || Array.isArray(p)) return null;
    const b = +p.budget, c = +p.cryptoPct;
    if (!(Number.isFinite(b) && b >= 0 && b < 1e6)) return null;
    return { budget: Math.round(b * 100) / 100, ...(Number.isFinite(c) && c >= 0 && c <= 100 ? { cryptoPct: Math.round(c * 10) / 10 } : {}) };
}
export function cleanLots(l) {
    if (!l || typeof l !== 'object' || Array.isArray(l)) return null;
    const out = {};
    // até 60 ativos (1.9.1; eram 12, do tempo em que só se guardavam as compras da cripto): um prazo ou um valor por
    // mês são poucos bytes, e o pedido inteiro já tem o teto de 40 KB
    for (const k of Object.keys(l).slice(0, 60)) {
        // a cripto (c:BTC) e, desde a 1.6.0, os outros ativos da carteira (VWCE.DE): o que se tem, em quantidade e investido
        if (!/^(c:[A-Z0-9]{2,8}|[A-Z0-9][A-Z0-9.\-=^]{0,14})$/.test(k) || !l[k] || typeof l[k] !== 'object') continue;
        const buys = (k.startsWith('c:') && Array.isArray(l[k].buys) ? l[k].buys : []).slice(0, 400)
            .filter((x) => x && JDATE.test(x.d || '')).map((x) => ({ d: x.d, e: Number.isFinite(+x.e) && +x.e > 0 ? Math.round(+x.e * 100) / 100 : 0 }));
        const plan = JDATE.test(l[k].plan || '') ? l[k].plan : '';
        const num = (v) => (Number.isFinite(+v) && +v > 0 && +v < 1e12 ? Math.round(+v * 1e8) / 1e8 : 0);
        const qty = num(l[k].qty), cost = num(l[k].cost), qd = JDATE.test(l[k].qd || '') ? l[k].qd : '';
        // 1.9.0: o valor por mês do plano deste ativo e o prazo em que ele o tem (curto, médio ou longo)
        const pm = +l[k].pm > 0 && +l[k].pm < 1e6 ? Math.round(+l[k].pm * 100) / 100 : 0, hz = HZS.includes(l[k].hz) ? l[k].hz : '';
        if (buys.length || plan || (qty && cost) || pm || hz) out[k] = { plan, buys, ...(qty && cost ? { qty, cost, ...(qd ? { qd } : {}) } : {}), ...(pm ? { pm } : {}), ...(hz ? { hz } : {}) };
    }
    return out;
}
export function cleanItems(items) {
    if (!Array.isArray(items)) return null;
    return items.slice(0, 120).map((x) => ({
        s: SYM.test(String(x.s || '')) ? String(x.s) : '', p: Number(x.p), a: String(x.a || '').slice(0, 12),
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
    const plano = cleanPlano(b && b.plano);
    const hasItems = items && items.length && JDATE.test((b && b.date) || '');
    const hasClaude = b && typeof b.claude === 'boolean';
    if (!b || !JID.test(b.id || '') || (!hasItems && !lots && !hasClaude && !plano)) return { status: 400, body: { error: 'dados inválidos' } };
    const old = await env.JOURNAL.get('j:' + b.id, 'json');
    const doc = upsertJournal(old, hasItems ? b.date : null, hasItems ? items : null);
    if (lots) doc.lots = lots;
    if (plano) doc.plano = plano;
    if (Array.isArray(b.saveDays)) doc.saveDays = b.saveDays.map(Number).filter((d) => [2, 9, 16, 23].includes(d)).slice(0, 4);
    if (hasClaude) { if (b.claude) doc.claude = true; else delete doc.claude; }
    const my = cleanSyms(b.my);
    if (my) doc.my = my;
    // metadados: último dia em que a app se ligou e se pediu a análise (o /stats conta sem abrir os diários)
    const seen = JDATE.test(b.date || '') ? b.date : new Date().toISOString().slice(0, 10);
    // o plano grátis dá 1000 escritas por dia na conta toda (e a Meteo também escreve): sem mudanças e sem o dia novo
    // (só compras ou dias de execução iguais aos que já lá estão), não se grava
    if (!hasItems && old && JSON.stringify(doc) === JSON.stringify(old)) return { body: { ok: true, days: Object.keys(doc.days).length, same: true } };
    await env.JOURNAL.put('j:' + b.id, JSON.stringify(doc), { metadata: { s: seen, c: doc.claude ? 1 : 0 } });
    return { body: { ok: true, days: Object.keys(doc.days).length } };
}

// ---------- /advice: análise do Claude (escrita pela tarefa agendada, aqui só se lê) ----------
// cfg:owner → id do diário da app do dono (só no KV, nunca no repositório)
// cfg:others → { claude: true|false }: a análise do Claude para as outras apps
async function ownerOf(env) { return (await env.JOURNAL.get('cfg:owner', 'json')) || ''; }
async function isOwner(env, id) { return !!id && JID.test(id) && id === (await ownerOf(env)); }
async function othersOn(env) { const o = await env.JOURNAL.get('cfg:others', 'json'); return !(o && o.claude === false); }
async function advice(url, env) {
    if (!env.JOURNAL) return { status: 501, body: { error: 'KV por configurar' } };
    const date = url.searchParams.get('date') || '';
    const id = url.searchParams.get('id') || '';
    if (date && !JDATE.test(date)) return { status: 400, body: { error: 'data inválida' } };
    if (id && !JID.test(id)) return { status: 400, body: { error: 'id inválido' } };
    if (!(await isOwner(env, id))) {
        if (!id || date) return { status: 404, body: { error: 'ainda sem análise' } };
        if (!(await othersOn(env))) return { status: 404, body: { error: 'análise do Claude desligada pelo autor da app', off: true } };
        const mine = await env.JOURNAL.get('ua:' + id, 'json');
        return mine ? { body: mine } : { status: 404, body: { error: 'ainda sem análise' } };
    }
    const doc = await env.JOURNAL.get(date ? 'advice:' + date : 'advice:latest', 'json');
    if (!doc) return { status: 404, body: { error: 'ainda sem análise' } };
    return { body: doc };
}

async function me(url, env) {
    if (!env.JOURNAL) return { status: 501, body: { error: 'KV por configurar' } };
    const id = url.searchParams.get('id') || '';
    if (!JID.test(id)) return { status: 400, body: { error: 'id inválido' } };
    const [owner, others] = await Promise.all([isOwner(env, id), othersOn(env)]);
    return { body: { owner, others } };
}
const dayAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
// quantas apps se ligam (gravam o diário) e quantas pediram a análise do Claude — só para o dono
async function stats(url, env) {
    if (!env.JOURNAL) return { status: 501, body: { error: 'KV por configurar' } };
    const id = url.searchParams.get('id') || '';
    if (!(await isOwner(env, id))) return { status: 403, body: { error: 'só para a app do dono' } };
    const keys = [];
    let cursor;
    do {
        const r = await env.JOURNAL.list({ prefix: 'j:', cursor });
        keys.push(...r.keys);
        cursor = r.list_complete ? null : r.cursor;
    } while (cursor && keys.length < 20000);
    const out = { total: 0, d1: 0, d7: 0, d30: 0, claude: 0 };
    const [t1, t7, t30] = [dayAgo(1), dayAgo(7), dayAgo(30)];
    for (const k of keys) {
        if (k.name === 'j:' + id) continue;
        const m = k.metadata || {}, s = m.s || '';
        out.total++;
        if (s >= t1) out.d1++;
        if (s >= t7) out.d7++;
        if (s >= t30) out.d30++;
        if (m.c && s >= t7) out.claude++;
    }
    out.others = await othersOn(env);
    out.run = await env.JOURNAL.get('cfg:lastRun', 'json');
    return { body: out };
}
async function ownerSet(request, env) {
    if (!env.JOURNAL) return { status: 501, body: { error: 'KV por configurar' } };
    let b;
    try { b = JSON.parse(await request.text()); } catch { return { status: 400, body: { error: 'JSON inválido' } }; }
    if (!b || !(await isOwner(env, b.id || ''))) return { status: 403, body: { error: 'só para a app do dono' } };
    if (typeof b.others !== 'boolean') return { status: 400, body: { error: 'dados inválidos' } };
    await env.JOURNAL.put('cfg:others', JSON.stringify({ claude: b.others }));
    return { body: { ok: true, others: b.others } };
}
async function universe(url, env) {
    if (!env.JOURNAL) return { status: 501, body: { error: 'KV por configurar' } };
    if (!(await isOwner(env, url.searchParams.get('id') || ''))) return { status: 403, body: { error: 'só para a app do dono' } };
    const doc = await env.JOURNAL.get('uni:latest', 'json');
    return doc ? { body: doc } : { status: 404, body: { error: 'ainda sem classificação' } };
}

// ---------- router ----------
const ROUTES = { '/quotes': quotes, '/news': news, '/movers': movers, '/calendar': calendar, '/consensus': consensus, '/search': search, '/fuel': fuel, '/fuel/distritos': distritos, '/fuel/municipios': municipios, '/cryptoglobal': cryptoGlobal };

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
        if (path === '/owner' && request.method === 'POST') {
            try { const { status = 200, body } = await ownerSet(request, env); return json(body, status, 0, origin); } catch (e) { return json({ error: String(e.message || e) }, 502, 0, origin); }
        }
        if (request.method !== 'GET') return json({ error: 'só GET' }, 405, 0, origin);
        // dados de cada app: sem cache partilhado (dependem do id)
        const OWN = { '/advice': [advice, 60], '/me': [me, 0], '/stats': [stats, 0], '/universe': [universe, 300] };
        if (OWN[path]) {
            const [fn, ttl] = OWN[path];
            try { const { status = 200, body } = await fn(url, env); return json(body, status, status === 200 ? ttl : 0, origin); } catch (e) { return json({ error: String(e.message || e) }, 502, 0, origin); }
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
