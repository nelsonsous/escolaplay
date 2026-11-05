// node --test mercados/tests — o Worker com fetch simulado (sem rede)
import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { parseChart, parseRSS, fuelStats, parsePrice } from '../proxy/src/worker.js';

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
