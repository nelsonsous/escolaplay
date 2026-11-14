// node --test mercados/tests/ecra-onda.test.mjs        (MK_ROOT=dist/mercados: a mesma coisa na pasta minificada)
// Os Ajustes desenhados pela Onda (AnaliseOnda.ecra.ajustes, de mercados/onda/ajustes.onda) têm de dar o mesmo HTML,
// byte a byte, que o viewSettings do mercados.js, com a app a correr no Chromium (o Intl, as datas e as notificações
// do browser): centenas de estados variados, os dois desenhos para cada um, e a primeira diferença com contexto.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(process.env.MK_ROOT || path.join(here, '..'));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const ESTADOS = +process.env.ESTADOS || 600;

let browser, server, page;
const erros = [];
before(async () => {
    server = http.createServer((req, res) => {
        let f = decodeURIComponent(req.url.split('?')[0]).replace(/^\/escolaplay\/mercados\/?/, '/');
        if (f === '/') f = '/index.html';
        const fp = path.join(ROOT, f);
        if (!fp.startsWith(ROOT) || !fs.existsSync(fp)) { res.writeHead(404); return res.end(); }
        res.writeHead(200, { 'Content-Type': TYPES[path.extname(fp)] || 'application/octet-stream' });
        fs.createReadStream(fp).pipe(res);
    }).listen(0);
    browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'pt-PT', timezoneId: 'Europe/Lisbon' });
    // sem rede: o conector, a Binance e o resto falham (os pedidos dos Ajustes também; o teste põe o estado à mão)
    await ctx.route((u) => !u.href.startsWith('http://127.0.0.1'), (r) => r.abort());
    await ctx.routeWebSocket(/./, (ws) => ws.close());
    page = await ctx.newPage();
    page.on('pageerror', (e) => erros.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/escolaplay/mercados/`);
    await page.waitForFunction(() => window.__mk && window.AnaliseOnda);
    await page.evaluate(() => window.AnaliseOnda.ready);
});
after(async () => { if (browser) await browser.close(); if (server) server.close(); });

// Corre na página: monta o estado n.º i (pseudo-aleatório, o mesmo em todas as corridas), desenha com o JS e com a
// Onda e compara. Devolve as diferenças (no máximo 5, com contexto) e quantos estados de cada tipo houve.
function correr({ de, ate, seed }) {
    const mk = window.__mk, AO = window.AnaliseOnda;
    const rng = (s) => () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const DEFAULT_PROXY = 'https://mercados-proxy.mercados-proxy.workers.dev';
    const ODD = ['<b>&amp;</b>', '"aspas"', "o'neil", 'Ação & Cª', '😀 emoji 🇵🇹', 'tab\tnova\nlinha', '  espaços  ', '', 'ÇÃÕ ñ ü ß', ' nbsp ', '<script>alert(1)</script>', 'a"b\'c<d>e&f', '—…→×≡⤒', '&#39;&lt;', 'nul\u0000 c1\u0085 del\u007f', 'Muito comprido '.repeat(200)];
    const NOMES = ['Apple', 'Microsoft', 'FTSE All-World USD (Acc)', 'Mota-Engil', 'LVMH Moët Hennessy', 'Novo Nordisk A/S', 'Bitcoin'];
    const FUNDS = ['VWCE.DE', 'EUNL.DE', 'SXR8.DE', 'SXRV.DE', 'IS3N.DE', 'EXSA.DE', '4GLD.DE'];
    const WATCH = ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'TSLA', 'AVGO', 'JPM', 'V', 'LLY', 'BRK-B', 'PLTR', 'AMD', 'ASML.AS', 'SAP.DE', 'MC.PA', 'SIE.DE', 'NOVO-B.CO', 'ALV.DE', 'TTE.PA', 'RHM.DE', 'TSM'];
    const SYMS = ['A&B', '<X>', '"Q"', "S'", 'ÇA.LS', 'EGL.LS', 'RACE.MI', '^GSPC', 'c:BTC', '😀', 'X Y', 'a<b>"c"&d\'e', 7, null, 'VWCE.DE'];
    const CRYPTO = ['c:BTC', 'c:ETH', 'c:SOL', 'c:XRP'];
    const ISO = ['2026-11-07T07:20:00Z', '2026-01-01T00:00:00Z', '2026-03-29T01:30:00Z', '2026-10-25T01:30:00Z', 'lixo', '', 1762500000000];
    const real = { now: Date.now, N: window.Notification, cfg: JSON.parse(JSON.stringify(mk.cfg)), st: JSON.parse(JSON.stringify(mk.st)), stats: mk.stats, dist: mk.distritos, Q: { ...mk.Q } };
    const out = { iguais: 0, dif: [], ndif: 0, tipos: { dono: 0, outro: 0, proxy: 0, semProxy: 0, distrito: 0, listaLonga: 0, contas: 0 }, bytes: 0 };
    const desc = (o) => JSON.stringify(o, (k, v) => (typeof v === 'number' && !Number.isFinite(v) ? String(v) : v === undefined ? '«undefined»' : Object.is(v, -0) ? '-0' : v));
    try {
        for (let i = de; i < ate; i++) {
            const R = rng(seed + i * 7919), pick = (a) => a[Math.floor(R() * a.length)], sim = (p) => R() < p;
            const sub = (a, n) => { const b = a.slice(); for (let j = b.length - 1; j > 0; j--) { const k = Math.floor(R() * (j + 1)); [b[j], b[k]] = [b[k], b[j]]; } return b.slice(0, n); };
            const agora = 1762500000000 + Math.floor(R() * 4e9);
            // ---- a configuração ----
            const c = mk.cfg;
            for (const k of Object.keys(c)) delete c[k];
            Object.assign(c, real.cfg);
            const set = (k, v) => { if (v === undefined) delete c[k]; else c[k] = v; };
            set('owner', pick([false, true, true, undefined, 1, 0, '']));
            set('claude', pick([false, true, undefined, 1]));
            set('proxy', pick(['', 'https://proxy.test', 'https://proxy.test', DEFAULT_PROXY, 'https://a.test/x?y=<z>&w="1"', 'https://ç.test/ñ😀', undefined]));
            set('finnhub', pick(['', '', 'chave', '<&>"\'', undefined, 0, 123]));
            set('budget', pick([0, 900, 900, 1234.5, 0.5, 2.5, 1e21, 2 ** 60, 2 ** 53, 2 ** 53 + 2, -100, -0.3, NaN, Infinity, -Infinity, 1 / 3, 0.1 + 0.2, 99999.5, 49999.5, '900', '', null, undefined, 1e-7, 123456789.49, 5e-324, 1.7976931348623157e308, 12345678901234567890, 7.5, 13.5, 30000, 19999.5]));
            set('strategy', pick(['etfcrypto', 'etfcrypto', 'mix', undefined, 'outra', '']));
            // o «€ por mês» de cada ativo na Carteira (com ele, o valor por mês é a soma e os Ajustes só o mostram)
            c.lots = pick([{}, {}, { 'VWCE.DE': { pm: 900 } }, { 'VWCE.DE': { pm: 810 }, 'c:BTC': { pm: 90.5 } }, { 'c:BTC': { pm: 0.1 }, 'c:ETH': { pm: 0.2 } }, { 'VWCE.DE': { pm: -5, qty: 1 } }]);
            const nf = pick([0, 1, 3, 7, 7, 10]);
            const funds = sub(FUNDS.concat(sim(0.3) ? SYMS : []), nf);
            c.funds = funds;
            set('coreFund', pick(funds.concat(['X', undefined, 'VWCE.DE'])));
            set('cryptoPct', pick([0, 5, 10, 15, '10', '5', 7, NaN, undefined, null, -0, ' 15 ']));
            set('cryptoMix', pick(['btc', 'btceth', undefined, 'x']));
            c.holdings = sub(funds.concat(CRYPTO, sim(0.2) ? ['X', 'c:DOGE'] : []), Math.floor(R() * 8));
            set('profile', pick(['prud', 'bal', 'dyn', undefined, 'x', '']));
            c.saveDays = pick([[2], [2], [2, 16], [9, 23], [2, 9, 16, 23], [16], [], ['2'], [2, '9'], [NaN], [23, 2], [2, 9, 16]]);
            set('jid', pick(['j-abc123', '3f2c9a10-1b2c-4d5e-8f90-1234567890ab', '<x>&"\'', '']));
            set('fs', pick(['n', 'l', 'xl', undefined, '', 'q']));
            set('eur', pick([true, false, undefined, 1, 0]));
            set('fiat', pick(['EUR', 'USD', undefined, 'GBP']));
            set('alertPct', pick([0, 2, 3, 4, 4, 5, 8, 10, '4', 7, NaN, undefined, -0, '', null, '10']));
            set('alertScope', pick(['mine', 'mineAdded', 'all', undefined, '', 'x']));
            set('notify', pick([true, false, undefined]));
            set('quiet', pick([true, false, undefined, 0, null]));
            set('distrito', pick(['', '', '11', '13', 13, '99', undefined, 'null']));
            set('municipio', pick(['', '1316', 1316, '1312', undefined, '1']));
            const nw = pick([0, 1, 3, 23, 23, 40]);
            const watch = sub(WATCH.concat(SYMS, Array.from({ length: 20 }, (_, j) => 'T' + j + pick(['', '.LS', '&', '<', '"', "'"]))), nw);
            c.watch = watch;
            // os nomes (nameOf): o da cotação do Yahoo, quando o símbolo não tem nome na app
            for (const k of watch.concat(funds)) if (sim(0.5)) mk.Q[k] = { ...(mk.Q[k] || {}), name: pick(ODD.concat(NOMES, [undefined, 0])) };
            // ---- o estado ----
            const s = mk.st;
            for (const k of Object.keys(s)) delete s[k];
            Object.assign(s, real.st);
            const sset = (k, v) => { if (v === undefined) delete s[k]; else s[k] = v; };
            sset('fh', pick(['', 'on', 'erro: <b>', undefined, 'erro: ', 5, ['a', 'b']]));
            sset('yahooErr', pick(['', '', 'HTTP 500', '<b>x</b>&', undefined]));
            sset('yahooAt', pick([0, 0, agora - 1000, agora - 4999, agora - 5000, agora - 5500, agora - 59000, agora - 59499, agora - 59500, agora - 60000, agora - 89999, agora - 3599000,
                agora - 3599499, agora - 3599500, agora - 3600000, agora - 86400000 * 3, agora + 10000, agora - 1e10, agora - 123456]));
            sset('others', pick([undefined, true, false]));
            // as contas do dono (o /stats do conector)
            const cnt = () => pick([0, 2, 2.5, NaN, null, undefined, '3', 1e21, -0, Infinity, 12345, 0.1 + 0.2]);
            const num = () => pick([0, 1, 1, 2, 3, 20, 2.5, null, undefined, NaN]);
            // (o Worker escreve números no run; um texto só onde a vista o escreve tal e qual: o Number('3') do JS não está
            // na Onda — ver vnum em ecra.onda)
            const run = pick([null, undefined, { at: pick(ISO), queued: num(), done: num(), max: num() }, { at: pick(ISO), queued: num(), done: num(), max: num() },
                { queued: 3, done: 1 }, { at: pick(ISO), done: '10', max: '20' }, { at: pick(ISO), queued: num(), done: num(), max: pick(['20', '<20>', null]) },
                { at: pick(ISO), done: 1, queued: 1, max: 20 }]);
            mk.stats = pick([null, null, { at: agora }, { at: agora, error: pick(['HTTP 500 <x>', 'só para a app do dono', '']) },
                { at: agora - pick([0, 1e9]), d1: cnt(), d7: cnt(), d30: cnt(), claude: cnt(), others: pick([true, false, undefined]), run },
                { at: agora, total: 5, d1: 2, d7: 4, d30: 5, claude: 1, others: true, run: { at: '2026-11-07T07:20:00Z', queued: 1, done: 1, max: 20 } }]);
            // as zonas dos combustíveis
            mk.distritos = pick([null, null, [], [{ id: 11, name: 'Lisboa' }, { id: 13, name: 'Porto' }], [{ id: '11', name: '<Lx>&' }, { id: 13 }, { id: null, name: null }, { name: 'sem id' }, { id: 'null', name: 0 }],
                Array.from({ length: 20 }, (_, j) => ({ id: j + 1, name: pick(ODD.concat(NOMES)) }))]);
            for (const k of Object.keys(mk.MUNIC)) delete mk.MUNIC[k];
            const mun = pick([undefined, undefined, [], [{ id: 1316, name: 'Santo Tirso' }, { id: '1312', name: 'Porto' }], [{ id: 1, name: '<a&b>' }, { id: 1316, name: pick(ODD) }, {}]]);
            if (mun !== undefined && c.distrito !== undefined) mk.MUNIC[c.distrito] = mun;
            // as notificações do browser
            const nt = pick(['none', 'default', 'granted', 'denied']);
            if (nt === 'none') delete window.Notification; else window.Notification = { permission: nt };
            // ---- os dois desenhos (às vezes a Onda primeiro: o que os Ajustes pedem à rede muda o estado) ----
            Date.now = () => agora;
            let js, onda;
            if (i % 2) { onda = AO.ecra.ajustes(mk.settingsSnap()); js = mk.viewSettings(); } else { js = mk.viewSettings(); onda = AO.ecra.ajustes(mk.settingsSnap()); }
            Date.now = real.now;
            const T = out.tipos;
            if (c.owner) T.dono++; else T.outro++;
            if (c.proxy) T.proxy++; else T.semProxy++;
            if (c.distrito) T.distrito++;
            if (nw >= 23) T.listaLonga++;
            if (mk.stats && 'd1' in mk.stats) T.contas++;
            out.bytes += js.length;
            if (js === onda) { out.iguais++; continue; }
            out.ndif++;
            if (out.dif.length < 5) {
                let j = 0;
                while (j < js.length && js[j] === onda[j]) j++;
                out.dif.push({ estado: i, offset: j, js: js.slice(Math.max(0, j - 80), j + 80), onda: onda.slice(Math.max(0, j - 80), j + 80),
                    cfg: desc({ ...c, watch: c.watch.length, funds: c.funds }), st: desc(s), stats: desc(mk.stats), distritos: desc(mk.distritos), munic: desc(mun), nt });
            }
        }
    } finally {
        Date.now = real.now;
        window.Notification = real.N;
        for (const k of Object.keys(mk.cfg)) delete mk.cfg[k];
        Object.assign(mk.cfg, real.cfg);
        for (const k of Object.keys(mk.st)) delete mk.st[k];
        Object.assign(mk.st, real.st);
        mk.stats = real.stats; mk.distritos = real.dist;
        for (const k of Object.keys(mk.Q)) if (!(k in real.Q)) delete mk.Q[k]; else mk.Q[k] = real.Q[k];
    }
    return out;
}

test(`Ajustes: a Onda dá o HTML do JS, byte a byte, em ${ESTADOS} estados`, async () => {
    const tot = { iguais: 0, ndif: 0, dif: [], tipos: {}, bytes: 0 };
    for (let de = 0; de < ESTADOS; de += 100) {
        const r = await page.evaluate(correr, { de, ate: Math.min(ESTADOS, de + 100), seed: 4242 });
        tot.iguais += r.iguais; tot.ndif += r.ndif; tot.bytes += r.bytes;
        for (const [k, v] of Object.entries(r.tipos)) tot.tipos[k] = (tot.tipos[k] || 0) + v;
        tot.dif.push(...r.dif);
    }
    for (const d of tot.dif.slice(0, 3)) {
        console.log(`estado ${d.estado}: primeira diferença no carácter ${d.offset}\n  JS:   ${JSON.stringify(d.js)}\n  Onda: ${JSON.stringify(d.onda)}`);
        console.log(`  cfg ${d.cfg}\n  st ${d.st}\n  stats ${d.stats}\n  distritos ${d.distritos} munic ${d.munic} notificações ${d.nt}`);
    }
    console.log(`# ${tot.iguais}/${ESTADOS} estados iguais (${(tot.bytes / ESTADOS / 1024).toFixed(1)} KB de HTML em média) — ${JSON.stringify(tot.tipos)}`);
    assert.equal(tot.ndif, 0, `${tot.ndif} estados com HTML diferente`);
    assert.equal(tot.iguais, ESTADOS);
    // cobertura: os ramos todos apareceram muitas vezes
    for (const [k, v] of Object.entries(tot.tipos)) assert.ok(v >= ESTADOS / 20, `poucos estados do tipo ${k}: ${v}`);
    assert.deepEqual(erros, []);
});

test('Ajustes: a app desenha-os com a Onda (e com o JS se a Onda falhar)', async () => {
    const r = await page.evaluate(() => {
        const mk = window.__mk, ecra = window.AnaliseOnda.ecra, orig = ecra.ajustes;
        let n = 0;
        ecra.ajustes = (s) => { n++; return orig(s); };
        mk.cfg.tab = 'ajustes'; mk.render();
        const html = document.querySelector('#mk-body').innerHTML, usou = n;
        const viaApp = mk.settingsHtml(), js = mk.viewSettings();
        // se a Onda falhar, os Ajustes não ficam vazios: desenha-os o JS (e fica o erro na consola)
        ecra.ajustes = () => { throw new Error('teste'); };
        const ce = console.error; let logs = 0; console.error = () => { logs++; };
        const recurso = mk.settingsHtml();
        console.error = ce; ecra.ajustes = orig;
        mk.cfg.tab = 'painel'; mk.render();
        return { usou, temWl: html.includes('class="wl-i"'), igual: viaApp === js, recurso: recurso === js, logs };
    });
    assert.ok(r.usou >= 1, 'o render dos Ajustes chamou a Onda');
    assert.ok(r.temWl, 'a lista que sigo está no ecrã');
    assert.ok(r.igual, 'settingsHtml (Onda) === viewSettings (JS)');
    assert.ok(r.recurso && r.logs === 1, 'sem Onda, desenha o JS');
});

test('Ajustes: desempenho (mediana de 50 desenhos no Chromium)', async () => {
    const r = await page.evaluate(() => {
        const mk = window.__mk, AO = window.AnaliseOnda;
        // mediana de 50 medidas (depois de 10 de aquecimento); cada medida é a média de 10 desenhos, porque o
        // performance.now() do Chromium só tem 0,1 ms de resolução
        const med = (f) => { const t = []; for (let i = 0; i < 60; i++) { const a = performance.now(); for (let j = 0; j < 10; j++) f(); t.push((performance.now() - a) / 10); } t.splice(0, 10); t.sort((x, y) => x - y); return t[25]; };
        // o estado de uma instalação normal (a lista toda por omissão: 23 ações e 7 fundos), com as zonas dos
        // combustíveis e as contas do dono já carregadas (18 distritos, 18 concelhos), na app do dono e noutra
        const zonas = (n, d) => Array.from({ length: n }, (_, j) => ({ id: d * 100 + j, name: 'Zona ' + j + ' de Évora' }));
        const antes = { cfg: { ...mk.cfg }, stats: mk.stats, dist: mk.distritos };
        Object.assign(mk.cfg, { proxy: 'https://proxy.test', distrito: '13', municipio: '1305', budget: 900, saveDays: [2, 16] });
        mk.distritos = zonas(18, 0); mk.MUNIC['13'] = zonas(18, 13);
        mk.stats = { at: Date.now(), total: 5, d1: 2, d7: 4, d30: 5, claude: 1, others: true, run: { at: '2026-11-07T07:20:00Z', queued: 3, done: 1, max: 20 } };
        mk.st.yahooAt = Date.now() - 20000;
        const res = {};
        for (const dono of [false, true]) {
            mk.cfg.owner = dono;
            const snap = mk.settingsSnap();
            res[dono ? 'dono' : 'outra'] = {
                js: med(() => mk.viewSettings()), onda: med(() => AO.ecra.ajustes(mk.settingsSnap())),
                instantaneo: med(() => mk.settingsSnap()), soOnda: med(() => AO.ecra.ajustes(snap)), kb: mk.viewSettings().length / 1024,
                igual: mk.viewSettings() === AO.ecra.ajustes(mk.settingsSnap()),
            };
        }
        Object.assign(mk.cfg, antes.cfg); mk.stats = antes.stats; mk.distritos = antes.dist; delete mk.MUNIC['13'];
        return res;
    });
    for (const [k, v] of Object.entries(r)) {
        console.log(`# ${k} (${v.kb.toFixed(1)} KB): JS ${v.js.toFixed(3)} ms · Onda ${v.onda.toFixed(3)} ms (instantâneo ${v.instantaneo.toFixed(3)} ms + desenho ${v.soOnda.toFixed(3)} ms)`);
        assert.ok(v.igual, `${k}: o mesmo HTML`);
        assert.ok(v.onda < 25, `a Onda demora ${v.onda} ms`);
    }
});
