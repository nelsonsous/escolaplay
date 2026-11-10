// node --test mercados/tests — o Worker com fetch simulado (sem rede)
import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { parseChart, parseRSS, fuelStats, parsePrice, parseCalendar, parseConsensus, upsertJournal, cleanLots, parseCryptoGlobal, cleanSyms } from '../proxy/src/worker.js';

const chart = (sym, price, prev, n = 10) => ({
    chart: { result: [{
        meta: { symbol: sym, shortName: sym + ' Co', currency: 'USD', regularMarketPrice: price, chartPreviousClose: prev, exchangeName: 'NMS',
            regularMarketDayHigh: price * 1.01, regularMarketDayLow: price * 0.98, regularMarketVolume: 12345, fiftyTwoWeekHigh: price * 1.5, fiftyTwoWeekLow: price * 0.5,
            regularMarketTime: 1762300000, currentTradingPeriod: { regular: { start: 0, end: 4102444800 } } },
        timestamp: Array.from({ length: n }, (_, i) => 1762300000 + i * 300),
        indicators: { quote: [{ close: Array.from({ length: n }, (_, i) => (i === 3 ? null : prev + (price - prev) * (i / (n - 1)))) }] },
    }], error: null },
});
const RSS = `<?xml version="1.0"?><rss><channel>
<item><title>Galp dispara 5% após resultados &amp; dividendos - Jornal de Negócios</title><link>https://news.example/a</link><pubDate>Wed, 05 Nov 2026 10:00:00 GMT</pubDate><source url="https://jn.pt">Jornal de Negócios</source></item>
<item><title><![CDATA[Petróleo cai com stocks]]></title><link>https://news.example/b</link><pubDate>Wed, 05 Nov 2026 12:00:00 GMT</pubDate><source url="x">Expresso</source></item>
</channel></rss>`;
const STATIONS = [
    { Nome: 'Posto A', Marca: 'Galp', Preco: '1,799 €', Municipio: 'Lisboa', Distrito: 'Lisboa', DataAtualizacao: '2026-11-05 08:00' },
    { Nome: 'Posto B', Marca: 'Prio', Preco: '1,649 €', Municipio: 'Sintra', Distrito: 'Lisboa', DataAtualizacao: '2026-11-05 09:30' },
    { Nome: 'Posto C', Marca: 'BP', Preco: '1,709 €', Municipio: 'Porto', Distrito: 'Porto', DataAtualizacao: '2026-11-04 18:00' },
    { Nome: 'Sem preço', Preco: '' },
];

function mockFetch(handler) {
    const calls = [];
    globalThis.fetch = async (url, init) => { calls.push(String(url)); return handler(String(url), init); };
    return calls;
}
const res = (body, status = 200, headers = {}) => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers });
const call = async (path, headers = {}) => {
    const r = await worker.fetch(new Request('https://w.test' + path, { headers }), {}, null);
    return { status: r.status, headers: r.headers, body: await r.json() };
};

test('parseChart calcula variação e limpa nulos', () => {
    const q = parseChart(chart('AAPL', 110, 100), '1d');
    assert.equal(q.price, 110);
    assert.equal(q.prevClose, 100);
    assert.equal(q.changePct, 10);
    assert.equal(q.series.length, 9);
    assert.equal(q.open, true);
    assert.throws(() => parseChart({ chart: { result: null, error: { description: 'No data found' } } }, '1d'), /No data/);
});

test('/quotes devolve várias cotações e erros por símbolo', async () => {
    const calls = mockFetch((u) => {
        if (u.includes('/v8/finance/chart/BAD')) return res({ chart: { result: null, error: { description: 'Not Found' } } }, 404);
        const sym = decodeURIComponent(u.split('/chart/')[1].split('?')[0]);
        return res(chart(sym, 80, 78));
    });
    const r = await call('/quotes?symbols=BZ%3DF,%5EGSPC,BAD&range=1d');
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('access-control-allow-origin'), '*');
    assert.equal(r.body.quotes.length, 3);
    assert.equal(r.body.quotes[0].symbol, 'BZ=F');
    assert.equal(r.body.quotes[1].symbol, '^GSPC');
    assert.ok(r.body.quotes[2].error);
    assert.ok(calls.some((c) => c.includes('query2')), 'tenta query2 quando query1 falha');
    assert.match(r.headers.get('cache-control'), /s-maxage=15/);
});

test('/quotes valida parâmetros', async () => {
    mockFetch(() => res({}));
    assert.equal((await call('/quotes')).status, 400);
    const many = Array.from({ length: 41 }, (_, i) => 'S' + i).join(',');
    assert.equal((await call('/quotes?symbols=' + many)).status, 400);
});

test('RSS do Google Notícias', () => {
    const items = parseRSS(RSS);
    assert.equal(items.length, 2);
    assert.equal(items[0].title, 'Galp dispara 5% após resultados & dividendos');
    assert.equal(items[0].source, 'Jornal de Negócios');
    assert.equal(items[1].title, 'Petróleo cai com stocks');
    assert.ok(items[0].time > 0);
});

test('/news usa Google e recorre ao Yahoo', async () => {
    mockFetch((u) => u.includes('news.google.com') ? res(RSS, 200, { 'Content-Type': 'application/rss+xml' }) : res({}));
    let r = await call('/news?q=Galp&lang=pt');
    assert.equal(r.body.items.length, 2);
    assert.equal(r.body.items[0].title, 'Petróleo cai com stocks', 'ordenado do mais recente');
    mockFetch((u) => u.includes('news.google.com') ? res('', 503) : res({ news: [{ title: 'Yahoo headline', link: 'https://y/1', publisher: 'Reuters', providerPublishTime: 1762300000 }] }));
    r = await call('/news?q=Galp&lang=en');
    assert.equal(r.body.items[0].source, 'Reuters');
});

test('/movers com cookie + crumb', async () => {
    mockFetch((u, init) => {
        if (u.startsWith('https://fc.yahoo.com')) return res('', 404, { 'Set-Cookie': 'A3=abc; Domain=.yahoo.com; Path=/' });
        if (u.includes('getcrumb')) return (init.headers.Cookie || '').includes('A3=abc') ? res('crumbXYZ') : res('Unauthorized', 401);
        if (u.includes('screener')) {
            assert.ok(u.includes('crumb=crumbXYZ'));
            return res({ finance: { result: [{ quotes: [{ symbol: 'XYZ', shortName: 'Xyz Inc', regularMarketPrice: 12.3, regularMarketChangePercent: 25.4, regularMarketVolume: 1e6 }] }] } });
        }
        return res({}, 404);
    });
    const r = await call('/movers');
    assert.equal(r.status, 200);
    assert.equal(r.body.gainers[0].symbol, 'XYZ');
    assert.equal(r.body.gainers[0].changePct, 25.4);
});

test('preços da DGEG: mediana, mínimo e postos mais baratos', () => {
    assert.equal(parsePrice('1,899 €'), 1.899);
    assert.equal(parsePrice(''), null);
    const s = fuelStats(STATIONS);
    assert.equal(s.n, 3);
    assert.equal(s.min, 1.649);
    assert.equal(s.median, 1.709);
    assert.equal(s.cheapest[0].name, 'Posto B');
    assert.equal(s.cheapest[0].place, 'Sintra, Lisboa');
    assert.equal(s.updated, '2026-11-05 09:30');
});

test('/fuel chama a DGEG por tipo de combustível', async () => {
    const calls = mockFetch((u) => u.includes('PesquisarPostos') ? res({ status: true, resultado: STATIONS }) : res({ status: false, mensagem: 'x' }));
    const r = await call('/fuel?distrito=11');
    assert.equal(r.body.fuels.length, 2);
    assert.equal(r.body.fuels[0].name, 'Gasóleo simples');
    assert.equal(r.body.fuels[0].median, 1.709);
    assert.ok(calls.every((c) => c.includes('idDistrito=11')));
    assert.ok(calls.some((c) => c.includes('idsTiposComb=2101')) && calls.some((c) => c.includes('idsTiposComb=3201')));
});

test('CORS, saúde, rotas e origens permitidas', async () => {
    assert.equal((await call('/health')).body.ok, true);
    assert.equal((await call('/nada')).status, 404);
    const pre = await worker.fetch(new Request('https://w.test/quotes', { method: 'OPTIONS' }), {});
    assert.equal(pre.status, 204);
    const env = { ALLOWED_ORIGINS: 'https://ok.example' };
    const bad = await worker.fetch(new Request('https://w.test/health', { headers: { Origin: 'https://evil.example' } }), env);
    assert.equal(bad.status, 403);
    const good = await worker.fetch(new Request('https://w.test/health', { headers: { Origin: 'https://ok.example' } }), env);
    assert.equal(good.status, 200);
    assert.equal(good.headers.get('access-control-allow-origin'), 'https://ok.example');
});

test('/news recorre ao Bing quando o Google recusa, e tira o link verdadeiro', async () => {
    const BING = `<rss><channel><item><title>Galp sobe em Lisboa</title><link>http://www.bing.com/news/apiclick.aspx?ref=FexRss&amp;aid=&amp;url=https%3a%2f%2fjornal.pt%2fgalp&amp;c=1</link><pubDate>Thu, 05 Nov 2026 10:00:00 GMT</pubDate><News:Source>Jornal</News:Source></item></channel></rss>`;
    const calls = mockFetch((u) => u.includes('news.google.com') ? res('blocked', 503) : u.includes('bing.com') ? res(BING) : res({ news: [] }));
    const r = await call('/news?q=Galp%20a%C3%A7%C3%B5es&lang=pt&sym=GALP.LS');
    assert.equal(r.body.items.length, 1);
    assert.equal(r.body.items[0].link, 'https://jornal.pt/galp');
    assert.equal(r.body.items[0].source, 'Jornal');
    assert.ok(calls.some((c) => c.includes('setlang=pt-PT')));
    mockFetch((u) => u.includes('finance/search') ? (u.includes('q=GALP.LS') ? res({ news: [{ title: 'Galp news', link: 'https://y/1' }] }) : res({ news: [] })) : res('', 503));
    const y = await call('/news?q=Galp%20a%C3%A7%C3%B5es&lang=en&sym=GALP.LS');
    assert.equal(y.body.items[0].title, 'Galp news', 'Yahoo pesquisa pelo símbolo');
});

test('/calendar: resultados e dividendos com crumb', async () => {
    assert.deepEqual(parseCalendar({}, 'X'), { symbol: 'X', earnings: null, exDividend: null, dividend: null });
    mockFetch((u, init) => {
        if (u.startsWith('https://fc.yahoo.com')) return res('', 404, { 'Set-Cookie': 'A3=abc; Path=/' });
        if (u.includes('getcrumb')) return res('crumb1');
        if (u.includes('quoteSummary/AAPL')) {
            assert.ok(u.includes('crumb=') && init.headers.Cookie.includes('A3=abc'), 'pedido com crumb e cookie');
            return res({ quoteSummary: { result: [{ calendarEvents: { earnings: { earningsDate: [{ raw: 1795000000 }, { raw: 1795100000 }] }, exDividendDate: { raw: 1794000000 }, dividendDate: { raw: 1794500000 } } }] } });
        }
        return res({ quoteSummary: { result: null, error: { description: 'Not Found' } } }, 404);
    });
    const r = await call('/calendar?symbols=AAPL,BAD');
    assert.equal(r.status, 200);
    assert.equal(r.body.items[0].earnings, 1795000000);
    assert.equal(r.body.items[0].exDividend, 1794000000);
    assert.ok(r.body.items[1].error);
});

test('/consensus: o consenso dos analistas com crumb', async () => {
    assert.deepEqual(parseConsensus({}, 'X'), { symbol: 'X', none: true });
    mockFetch((u, init) => {
        if (u.startsWith('https://fc.yahoo.com')) return res('', 404, { 'Set-Cookie': 'A3=abc; Path=/' });
        if (u.includes('getcrumb')) return res('crumb1');
        if (u.includes('quoteSummary/NVDA')) {
            assert.ok(u.includes('modules=financialData,recommendationTrend') && u.includes('crumb=') && init.headers.Cookie.includes('A3=abc'));
            return res({ quoteSummary: { result: [{ financialData: { recommendationKey: 'strong_buy', recommendationMean: { raw: 1.4 }, numberOfAnalystOpinions: { raw: 58 }, targetMeanPrice: { raw: 230.5 }, targetLowPrice: { raw: 150 }, targetHighPrice: { raw: 300 }, currentPrice: { raw: 196 }, financialCurrency: 'USD' },
                recommendationTrend: { trend: [{ period: '0m', strongBuy: 20, buy: 30, hold: 6, sell: 1, strongSell: 1 }, { period: '-1m', strongBuy: 1 }] } }] } });
        }
        if (u.includes('quoteSummary/VWCE.DE')) return res({ quoteSummary: { result: [{ financialData: { recommendationKey: 'none', numberOfAnalystOpinions: {} } }] } });
        return res({ quoteSummary: { result: null, error: { description: 'Not Found' } } }, 404);
    });
    const r = await call('/consensus?symbols=NVDA,VWCE.DE,BAD');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.items[0], { symbol: 'NVDA', key: 'strong_buy', mean: 1.4, n: 58, target: 230.5, low: 150, high: 300, price: 196, currency: 'USD', votes: [20, 30, 6, 1, 1] });
    assert.deepEqual(r.body.items[1], { symbol: 'VWCE.DE', none: true }, 'um ETF não tem consenso');
    assert.deepEqual(r.body.items[2], { symbol: 'BAD', none: true });
    assert.equal((await call('/consensus')).status, 400);
});

test('/journal guarda e lê o diário (KV simulado)', async () => {
    const store = new Map();
    const env = { JOURNAL: { get: async (k) => (store.has(k) ? JSON.parse(store.get(k)) : null), put: async (k, v) => { store.set(k, v); } } };
    const post = (body) => worker.fetch(new Request('https://w.test/journal', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }), env);
    const id = 'abc12345-test';
    let r = await post({ id, date: '2026-11-05', items: [{ s: 'NVDA', p: 181.6, a: 'neutral', l: 56, m: 6, sh: 48, o: 0 }, { s: '', p: 1 }] });
    assert.equal(r.status, 200);
    r = await post({ id, date: '2026-11-06', items: [{ s: 'NVDA', p: 185, a: 'scale', o: 1 }] });
    assert.equal((await r.json()).days, 2);
    assert.equal((await post({ id: 'x', date: '2026-11-06', items: [{ s: 'A', p: 1 }] })).status, 400, 'id inválido');
    assert.equal((await post({ id, date: 'ontem', items: [{ s: 'A', p: 1 }] })).status, 400, 'data inválida');
    const g = await worker.fetch(new Request('https://w.test/journal?id=' + id), env);
    const doc = await g.json();
    assert.deepEqual(Object.keys(doc.days), ['2026-11-05', '2026-11-06']);
    assert.equal(doc.days['2026-11-05'].length, 1, 'item sem símbolo descartado');
    assert.equal((await worker.fetch(new Request('https://w.test/journal?id=' + id), {})).status, 501, 'sem KV');
    // limite de dias
    let d = null;
    for (let i = 0; i < 805; i++) d = upsertJournal(d, `2026-01-01#${String(i).padStart(4, '0')}`, []);
    assert.equal(Object.keys(d.days).length, 800);
});

const OWNER = 'dono1234-abcd';
test('/advice: a análise completa só para o dono; as outras apps recebem a sua', async () => {
    const store = new Map([['cfg:owner', JSON.stringify(OWNER)], ['advice:latest', JSON.stringify({ date: '2026-11-06', headline: 'Teste' })], ['advice:2026-11-05', JSON.stringify({ date: '2026-11-05' })], ['ua:outra123-xyz', JSON.stringify({ date: '2026-11-06', headline: 'Só tua' })]]);
    const env = { JOURNAL: { get: async (k) => (store.has(k) ? JSON.parse(store.get(k)) : null), put: async (k, v) => { store.set(k, v); } } };
    const get = (q) => worker.fetch(new Request('https://w.test/advice' + q), env);
    let r = await get('?id=' + OWNER);
    assert.equal((await r.json()).headline, 'Teste');
    r = await get(`?id=${OWNER}&date=2026-11-05`);
    assert.equal((await r.json()).date, '2026-11-05');
    assert.equal((await get(`?id=${OWNER}&date=2026-01-01`)).status, 404);
    assert.equal((await get('?date=x')).status, 400);
    assert.equal((await get('')).status, 404, 'sem id não há análise do dono');
    assert.equal((await get('?date=2026-11-05')).status, 404);
    assert.equal((await get('?id=sem-analise-1')).status, 404);
    r = await get('?id=outra123-xyz');
    assert.equal((await r.json()).headline, 'Só tua');
    assert.equal((await worker.fetch(new Request('https://w.test/advice', { method: 'POST', body: '{}' }), env)).status, 405, 'só leitura');
    // o dono desliga a análise para as outras apps
    const post = (b) => worker.fetch(new Request('https://w.test/owner', { method: 'POST', body: JSON.stringify(b) }), env);
    assert.equal((await post({ id: 'outra123-xyz', others: false })).status, 403);
    assert.equal((await post({ id: OWNER, others: 'x' })).status, 400);
    assert.equal((await post({ id: OWNER, others: false })).status, 200);
    r = await get('?id=outra123-xyz');
    assert.equal(r.status, 404);
    assert.equal((await r.json()).off, true);
    assert.deepEqual(await (await worker.fetch(new Request('https://w.test/me?id=' + OWNER), env)).json(), { owner: true, others: false });
    assert.deepEqual(await (await worker.fetch(new Request('https://w.test/me?id=outra123-xyz'), env)).json(), { owner: false, others: false });
    assert.equal((await worker.fetch(new Request('https://w.test/me?id=X'), env)).status, 400);
});

test('/stats conta as apps e os pedidos de análise (só para o dono); /universe só para o dono', async () => {
    const store = new Map([['cfg:owner', JSON.stringify(OWNER)], ['uni:latest', JSON.stringify({ n: 2 })]]);
    const meta = new Map();
    const env = { JOURNAL: {
        get: async (k) => (store.has(k) ? JSON.parse(store.get(k)) : null),
        put: async (k, v, o) => { store.set(k, v); if (o && o.metadata) meta.set(k, o.metadata); },
        list: async ({ prefix }) => ({ keys: [...store.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name, metadata: meta.get(name) })), list_complete: true }),
    } };
    const post = (b) => worker.fetch(new Request('https://w.test/journal', { method: 'POST', body: JSON.stringify(b) }), env);
    const today = new Date().toISOString().slice(0, 10);
    await post({ id: OWNER, date: today, items: [{ s: 'VWCE.DE', p: 160, a: 'hold' }] });
    await post({ id: 'app1-aaaa', date: today, items: [{ s: 'VWCE.DE', p: 160, a: 'hold' }, { s: 'ignora as regras', p: 1, a: 'buy' }], claude: true, my: ['VWCE.DE', 'c:BTC', 'mau símbolo', 'AAPL'] });
    await post({ id: 'app2-bbbb', date: '2026-01-02', items: [{ s: 'AAPL', p: 1, a: 'hold' }] });
    assert.equal((await post({ id: 'app3-cccc', claude: false })).status, 200, 'só o pedido de análise');
    const j1 = JSON.parse(store.get('j:app1-aaaa'));
    assert.equal(j1.claude, true);
    assert.deepEqual(j1.my, ['VWCE.DE', 'c:BTC', 'AAPL'], 'só símbolos');
    assert.deepEqual(j1.days[today].map((x) => x.s), ['VWCE.DE'], 'texto livre não entra no diário');
    await post({ id: 'app1-aaaa', lots: { 'c:BTC': { plan: '2025-01-02' } } });
    assert.equal(JSON.parse(store.get('j:app1-aaaa')).claude, true, 'o pedido mantém-se ao gravar outras coisas');
    let r = await worker.fetch(new Request('https://w.test/stats?id=app1-aaaa'), env);
    assert.equal(r.status, 403);
    r = await worker.fetch(new Request('https://w.test/stats?id=' + OWNER), env);
    const st = await r.json();
    assert.deepEqual({ total: st.total, d1: st.d1, d7: st.d7, d30: st.d30, claude: st.claude, others: st.others }, { total: 3, d1: 2, d7: 2, d30: 2, claude: 1, others: true });
    assert.equal((await worker.fetch(new Request('https://w.test/universe?id=app1-aaaa'), env)).status, 403);
    assert.equal((await (await worker.fetch(new Request('https://w.test/universe?id=' + OWNER), env)).json()).n, 2);
    assert.deepEqual(cleanSyms(['BRK-B', 'NOVO-B.CO', '^GSPC', 'c:BTC', 'x', 'A B', 'BTC-EUR']), ['BRK-B', 'NOVO-B.CO', '^GSPC', 'c:BTC', 'BTC-EUR']);
});

test('/journal guarda as compras de cripto sem apagar o diário', async () => {
    const store = new Map();
    const env = { JOURNAL: { get: async (k) => (store.has(k) ? JSON.parse(store.get(k)) : null), put: async (k, v) => { store.set(k, v); } } };
    const id = 'abcdefgh-1234';
    const post = (b) => worker.fetch(new Request('https://w.test/journal', { method: 'POST', body: JSON.stringify(b) }), env);
    assert.equal((await post({ id, date: '2026-11-05', items: [{ s: 'VWCE.DE', p: 160, a: 'hold' }] })).status, 200);
    assert.equal((await post({ id, lots: { 'c:BTC': { plan: '2025-01-02', buys: [{ d: '2025-03-01', e: '90' }, { d: 'mau' }] }, 'x': {}, 'c:SOL': {} }, saveDays: [2, 16, 5] })).status, 200);
    const doc = JSON.parse(store.get('j:' + id));
    assert.deepEqual(Object.keys(doc.days), ['2026-11-05'], 'diário mantém-se');
    assert.deepEqual(doc.lots, { 'c:BTC': { plan: '2025-01-02', buys: [{ d: '2025-03-01', e: 90 }] } });
    assert.deepEqual(doc.saveDays, [2, 16]);
    await post({ id, date: '2026-11-06', items: [{ s: 'VWCE.DE', p: 161, a: 'hold' }] });
    assert.ok(JSON.parse(store.get('j:' + id)).lots['c:BTC'], 'compras mantêm-se ao gravar o dia seguinte');
    assert.equal((await post({ id })).status, 400);
    assert.equal(cleanLots([]), null);
    // 1.6.0: o que se tem (quantidade e investido) também para os fundos; as compras avulsas só na cripto
    assert.deepEqual(cleanLots({ 'VWCE.DE': { qty: '25.31', cost: 4200, qd: '2024-05-02', buys: [{ d: '2025-01-01', e: 9 }] }, 'c:BTC': { qty: 0.0412, cost: 3800.555 }, 'mau key!': { qty: 1, cost: 1 }, 'c:ETH': { qty: 1 } }),
        { 'VWCE.DE': { plan: '', buys: [], qty: 25.31, cost: 4200, qd: '2024-05-02' }, 'c:BTC': { plan: '', buys: [], qty: 0.0412, cost: 3800.555 } });
});

test('/fuel/municipios e /fuel?municipio=… (concelho)', async () => {
    const calls = mockFetch((u) => u.includes('GetMunicipios') ? res({ status: true, resultado: [{ Id: 1316, Descritivo: 'Santo Tirso' }, { Id: 1301, Descritivo: 'Amarante' }] }) : u.includes('PesquisarPostos') ? res({ status: true, resultado: STATIONS }) : res({ status: false, mensagem: 'x' }));
    let r = await worker.fetch(new Request('https://w.test/fuel/municipios?distrito=13'), {});
    assert.deepEqual((await r.json()).items.map((x) => x.name), ['Amarante', 'Santo Tirso']);
    assert.ok(calls.some((u) => u.includes('GetMunicipios?idDistrito=13')));
    assert.equal((await worker.fetch(new Request('https://w.test/fuel/municipios?distrito=x'), {})).status, 400);
    r = await worker.fetch(new Request('https://w.test/fuel?distrito=13&municipio=1316'), {});
    assert.equal((await r.json()).municipio, '1316');
    assert.ok(calls.some((u) => u.includes('idDistrito=13&idsMunicipios=1316')));
});

test('/fuel?list=1 devolve os postos, mais baratos primeiro', async () => {
    const ST = STATIONS.map((x, i) => ({ ...x, Morada: 'Rua ' + i, Localidade: 'Terra', Latitude: 39 + i / 10, Longitude: -8 }));
    mockFetch((u) => u.includes('PesquisarPostos') ? res({ status: true, resultado: ST }) : res({ status: false, mensagem: 'x' }));
    let r = await worker.fetch(new Request('https://w.test/fuel?tipos=3201&list=1'), {});
    const f = (await r.json()).fuels[0];
    assert.deepEqual(f.stations.map((x) => x.name), ['Posto B', 'Posto C', 'Posto A']);
    assert.equal(f.stations[0].addr, 'Rua 1, Terra');
    assert.equal(f.stations[0].lat, 39.1);
    r = await worker.fetch(new Request('https://w.test/fuel?tipos=3201'), {});
    assert.equal((await r.json()).fuels[0].stations, undefined, 'sem list=1 não manda a lista');
});

test('/cryptoglobal junta CoinGecko e o índice de medo e ganância', async () => {
    const g = { data: { total_market_cap: { eur: 2.1e12 }, total_volume: { eur: 9e10 }, market_cap_percentage: { btc: 58.4, eth: 11.2 }, market_cap_change_percentage_24h_usd: -3.2 } };
    const f = { data: [{ value: '24', value_classification: 'Extreme Fear' }, { value: '30', value_classification: 'Fear' }] };
    assert.deepEqual(parseCryptoGlobal(g, f), { mcap: 2.1e12, mcapChg: -3.2, vol: 9e10, btcDom: 58.4, ethDom: 11.2, fng: { v: 24, label: 'Extreme Fear', prev: 30 } });
    mockFetch((u) => u.includes('coingecko') ? res(g) : u.includes('alternative.me') ? res(f) : res({}, 404));
    const r = await worker.fetch(new Request('https://w.test/cryptoglobal'), {});
    assert.equal((await r.json()).fng.v, 24);
    mockFetch((u) => u.includes('coinpaprika') ? res({ market_cap_usd: 2.4e12, volume_24h_usd: 1e11, bitcoin_dominance_percentage: 58.9, market_cap_change_24h: -2.5 }) : u.includes('alternative.me') ? res(f) : res({}, 429));
    const r2 = await (await worker.fetch(new Request('https://w.test/cryptoglobal?y=1'), {})).json();
    assert.equal(r2.mcapUsd, 2.4e12, 'CoinGecko em baixo: usa a CoinPaprika');
    assert.equal(r2.btcDom, 58.9);
    mockFetch(() => res({}, 500));
    assert.equal((await worker.fetch(new Request('https://w.test/cryptoglobal?x=1'), {})).status, 502);
});
