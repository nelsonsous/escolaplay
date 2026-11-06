// node --test mercados/tests — o Worker com fetch simulado (sem rede)
import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { parseChart, parseRSS, fuelStats, parsePrice, parseCalendar, upsertJournal, cleanLots } from '../proxy/src/worker.js';

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

test('/advice lê a análise do Claude do KV', async () => {
    const store = new Map([['advice:latest', JSON.stringify({ date: '2026-11-06', headline: 'Teste' })], ['advice:2026-11-05', JSON.stringify({ date: '2026-11-05' })]]);
    const env = { JOURNAL: { get: async (k) => (store.has(k) ? JSON.parse(store.get(k)) : null) } };
    let r = await worker.fetch(new Request('https://w.test/advice'), env);
    assert.equal((await r.json()).headline, 'Teste');
    r = await worker.fetch(new Request('https://w.test/advice?date=2026-11-05'), env);
    assert.equal((await r.json()).date, '2026-11-05');
    assert.equal((await worker.fetch(new Request('https://w.test/advice?date=2026-01-01'), env)).status, 404);
    assert.equal((await worker.fetch(new Request('https://w.test/advice?date=x'), env)).status, 400);
    assert.equal((await worker.fetch(new Request('https://w.test/advice', { method: 'POST', body: '{}' }), env)).status, 405, 'só leitura');
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
