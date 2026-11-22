// Teste da app no Chromium com todas as fontes simuladas (sem rede).
//   node mercados/tests/ui.test.js [pasta-para-capturas]
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');

const ROOT = path.resolve(process.env.MK_ROOT || path.join(__dirname, '..'));
const SHOTS = process.argv[2];
// a ficha inteira numa imagem: o cartão tem deslize próprio, por isso solta-se só para a fotografia
async function fichaInteira(page, nome) {
    if (!SHOTS) return;
    const solta = (on) => page.evaluate((on) => {
        const f = document.querySelector('#mk-sheet'), c = document.querySelector('#mk-sheet-card');
        f.style.cssText = on ? 'position:absolute;inset:0 0 auto 0;overflow:visible' : '';
        c.style.cssText = on ? 'position:relative;max-height:none;animation:none' : '';
    }, on);
    await solta(true);
    await page.locator('#mk-sheet-card').screenshot({ path: path.join(SHOTS, nome) });
    await solta(false);
}
// lê-se bem? os textos à vista com contraste abaixo de `min` (a razão da WCAG) com o fundo opaco por baixo deles; em `dentro`
// (um seletor) só os dessa parte do ecrã
function contraste(page, min, dentro) {
    return page.evaluate(([min, dentro]) => {
        const cor = (s) => { const m = /rgba?\(([^)]+)\)/.exec(s || ''); if (!m) return null; const v = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat); return [v[0], v[1], v[2], v.length > 3 ? v[3] : 1]; };
        const lum = (c) => c.slice(0, 3).reduce((s, v, i) => { v /= 255; v = v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; return s + v * [0.2126, 0.7152, 0.0722][i]; }, 0);
        const sobre = (a, b) => [0, 1, 2].map((i) => a[i] * a[3] + b[i] * (1 - a[3])).concat(1);
        const hex = (c) => '#' + c.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
        const fundo = (el) => { const cs = []; for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const c = cor(getComputedStyle(e).backgroundColor); if (c && c[3] > 0) { cs.push(c); if (c[3] >= 1) break; } } return cs.reverse().reduce((b, c) => sobre(c, b), [255, 255, 255, 1]); };
        const opac = (el) => { let o = 1; for (let e = el; e && e.nodeType === 1; e = e.parentElement) o *= +getComputedStyle(e).opacity; return o; };
        const raiz = dentro ? document.querySelector(dentro) : document.body, vistos = new Set(), maus = new Map();
        const ver = (el, txt, cs) => {
            const svg = el instanceof SVGElement, f = cor(svg ? cs.fill : cs.color);
            if (!f || !txt) return;
            const b = fundo(svg ? el.closest('svg') : el), fg = sobre([f[0], f[1], f[2], f[3] * opac(el)], b);
            const [l1, l2] = [lum(fg), lum(b)].sort((x, y) => y - x), r = (l1 + 0.05) / (l2 + 0.05);
            const px = parseFloat(cs.fontSize), grande = px >= 24 || (px >= 18.6 && +cs.fontWeight >= 700);
            if (r < (grande ? Math.min(min, 3) : min)) {
                const k = el.tagName.toLowerCase() + (el.getAttribute('class') ? '.' + el.getAttribute('class').trim().split(/\s+/).join('.') : '') + ' ' + hex(fg) + '/' + hex(b);
                if (!maus.has(k)) maus.set(k, r.toFixed(2) + ' ' + k + ' «' + txt.slice(0, 28) + '»');
            }
        };
        const tw = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
        for (let n = tw.nextNode(); n; n = tw.nextNode()) {
            const el = n.parentElement;
            if (!el || vistos.has(el) || !n.textContent.trim() || /^(SCRIPT|STYLE|TITLE|OPTION)$/.test(el.tagName)) continue;
            vistos.add(el);
            const cs = getComputedStyle(el);
            if (cs.visibility === 'hidden' || !el.getClientRects().length || el.closest('[hidden]')) continue;
            ver(el, n.textContent.trim(), cs);
        }
        for (const el of raiz.querySelectorAll('*')) for (const ps of ['::before', '::after']) {
            const cs = getComputedStyle(el, ps), t = /^"(.+)"$/.exec(cs.content || '');
            if (t && el.getClientRects().length && !el.closest('[hidden]')) ver(el, t[1], cs);
        }
        return [...maus.values()].sort();
    }, [min, dentro || null]);
}
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

function rnd(seed) { let s = seed % 2147483647 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
const hash = (str) => [...str].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const BASE = { BTCEUR: 88000, ETHEUR: 3100, SOLEUR: 160, XRPEUR: 2.18, 'BZ=F': 64.2, 'CL=F': 60.1, 'RB=F': 1.98, 'HO=F': 2.31, 'NG=F': 3.4, '^GSPC': 6850, '^IXIC': 23500, '^STOXX50E': 5650, 'PSI20.LS': 8100, '^VIX': 17.2, 'EURUSD=X': 1.152, 'GC=F': 3980, 'ALV.DE': 17.4, 'NVDA': 196, 'TSLA': 455, 'VWCE.DE': 165.98, 'VWCE.MU': 163.8, 'EURDKK=X': 7.4742 };
// o servidor diz se esta app é a do dono (análise completa) ou outra (análise do Claude desligada por omissão)
const ME = { owner: true, others: true, advice: null };
const UNI = { date: '2026-11-07', generatedAt: '2026-11-07T07:20:00Z', n: 3, rows: [
    { s: 'SXRV.DE', n: 'iShares NASDAQ 100 ETF', t: 'etf', l: 90, m: 23, d: 0.5, y: 12.1, dd: -12.3, o: 0, rk: 'Risco baixo' },
    { s: 'PUM.DE', n: 'PUMA', t: 'stock', l: 84, m: 97, d: -1, y: 66, dd: -10.6, o: 0, rk: 'Risco médio' },
    { s: 'ADA-EUR', n: 'Cardano', t: 'crypto', l: 31, m: 40, d: 2.1, y: -35, dd: -60, o: 0, rk: 'Risco muito alto' },
] };
const DAYCHG = { 'VWCE.DE': -2.28, 'VWCE.MU': -3.9, 'EURUSD=X': 0, 'EURDKK=X': 0, 'ALV.DE': 6.8, 'NVDA': 5.2, 'TSLA': -7.4, 'TTE.PA': -4.6, 'BZ=F': 1.3 };

function series(sym, n, stepSec, drift) {
    const r = rnd(hash(sym) + n);
    const p0 = BASE[sym] || 20 + (hash(sym) % 400);
    let x = p0; const out = []; const t0 = 1762300000 - n * stepSec;
    for (let i = 0; i < n; i++) { x *= 1 + drift + (r() - 0.5) * 0.02; out.push([t0 + i * stepSec, +x.toFixed(4)]); }
    return out;
}
const T_FECHO = 1762300000; // a hora do último preço de todos (a SAP fechou aí; os futuros andaram depois)
const MOCK = { fechado: false }; // o teste fecha a bolsa do FTSE All-World (a Xetra e Munique) para ver a estimativa
function quote(sym, range) {
    const daily = range !== '1d';
    const drift = ((hash(sym) % 9) - 4) / 1500;
    let s = daily ? series(sym, range === '5y' ? 1260 : range === '2y' ? 505 : range === '1y' ? 252 : 126, 86400, drift) : series(sym, 78, 300, 0);
    // os retornos do S&P 500 vezes 1,2 na SAP e 0,7 no FTSE All-World (mais um ruído): a sensibilidade que a estimativa tem de achar
    if ((sym === 'SAP.DE' || sym === 'VWCE.DE') && daily) {
        const g = series('^GSPC', s.length, 86400, ((hash('^GSPC') % 9) - 4) / 1500), b = sym === 'SAP.DE' ? 1.2 : 0.7, rr = rnd(hash(sym + 'b'));
        s = g.map((p, i) => [p[0], i ? 0 : sym === 'SAP.DE' ? 200 : 150]);
        for (let i = 1; i < g.length; i++) s[i][1] = +(s[i - 1][1] * (1 + b * (g[i][1] / g[i - 1][1] - 1) + (sym === 'SAP.DE' ? 0 : (rr() - 0.5) * 0.002))).toFixed(4);
    }
    // o VT (o mesmo índice do FTSE All-World, em Nova Iorque): 140 até ao preço da noite do FTSE (Munique), depois −1,5% até 5 h depois do fecho
    if (sym === 'VT' && range === '5d') s = Array.from({ length: 17 }, (_, i) => { const t = T_FECHO - 3 * 3600 + i * 1800; return [t, t <= 1762309999 ? 140 : +(140 * (1 - 0.015 * Math.min(1, (t - 1762309999) / (T_FECHO + 5 * 3600 - 1762309999)))).toFixed(4)]; });
    // os futuros do S&P 500 nos últimos 5 dias: 6000 até ao fecho da SAP, depois a descer 1% em 10 h
    if (sym === 'ES=F' && range === '5d') s = Array.from({ length: 27 }, (_, i) => [T_FECHO - 3 * 3600 + i * 1800, i <= 6 ? 6000 : +(6000 * (1 - 0.01 * (i - 6) / 20)).toFixed(2)]);
    const chgPct = DAYCHG[sym] ?? (((hash(sym) % 600) - 300) / 100);
    const price = BASE[sym] || s[s.length - 1][1];
    if (!daily) { const k = price / s[s.length - 1][1]; s.forEach((p) => { p[1] = +(p[1] * k).toFixed(4); }); }
    const prev = +(price / (1 + chgPct / 100)).toFixed(4);
    return { symbol: sym, name: sym + ' Name', currency: /\.LS$|\.DE$|\.PA$|\.AS$|\.MU$|\.DU$/.test(sym) ? 'EUR' : /\.CO$/.test(sym) ? 'DKK' : 'USD', exchange: 'Test', price, prevClose: prev,
        change: +(price - prev).toFixed(4), changePct: chgPct, dayHigh: price * 1.01, dayLow: price * 0.97, volume: 1234567, high52: price * 1.4, low52: price * 0.6, time: sym === 'VWCE.MU' ? 1762309999 : T_FECHO, open: !['PLTR', 'SAP.DE'].includes(sym) && !(MOCK.fechado && /^VWCE/.test(sym)), series: s };
}
// análise do Claude do dono: o formato antigo (até à 3.x: o veredicto de alguns ativos) e o da 4.0, feito no arranque
// pelo publicar.mjs a partir de uma análise de teste (um veredicto por ativo, com convicção por prazo, níveis e porquê)
const ADV_BASE = { headline: 'Mercado nervoso: manter o plano no VWCE', market: 'Texto de mercado.', planNote: '900 € em 2 execuções', plan: [{ s: 'VWCE.DE', amount: '810 €', why: 'núcleo' }, { s: 'c:BTC', amount: '90 €', why: 'cripto · todos os meses' }], movers: [{ s: 'TSLA', why: 'Cai depois de resultados abaixo do esperado.' }], tldr: ['Mercado: venda em tecnologia, VIX 24.', 'Hoje: nada a fazer, o plano corre sozinho.', 'Atenção: XRP −9%, sem reforço.'], risks: ['S&P na média de 200 dias'], review: 'Primeiro dia.', lessons: ['Não perseguir subidas'] };
const ADV_V1 = { date: '2026-11-06', generatedAt: '2026-11-06T07:16:00Z', ...ADV_BASE, actions: [{ s: 'c:BTC', key: 'wait', action: 'Esperar', why: 'abaixo das médias', plan: 'entrar acima de 71 000 €' }] };
const ADV = { doc: null };
const WATCH = ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'TSLA', 'AVGO', 'JPM', 'V', 'LLY', 'BRK-B', 'PLTR', 'AMD', 'ASML.AS', 'SAP.DE', 'MC.PA', 'SIE.DE', 'NOVO-B.CO', 'ALV.DE', 'TTE.PA', 'RHM.DE', 'TSM'];
const FUNDS = ['VWCE.DE', 'EUNL.DE', 'SXR8.DE', 'SXRV.DE', 'IS3N.DE', 'EXSA.DE', '4GLD.DE'];
const REFS = ['BZ=F', 'CL=F', 'RB=F', 'HO=F', 'NG=F', 'GC=F', '^GSPC', '^IXIC', '^STOXX50E', 'PSI20.LS', '^VIX', 'EURUSD=X'];
// sem veredicto hoje (ex.: sem dados nesse dia): o Ether fica com o último conselho; o XRP, a TSMC e a Rheinmetall com o algoritmo
const SKIP = ['c:ETH', 'c:XRP', 'TSM', 'RHM.DE'];
const SPECIAL = {
    NVDA: { key: 'scale', action: 'Comprar aos poucos', short: 48, mid: 88, long: 81, entry: 190, target: 230, stop: 172, why: 'Desconto de 22% com a tendência longa a favor; resultados a 17/11.', plan: 'Metade agora, metade depois dos resultados.', algWhy: 'A regra vê L36 e o preço abaixo da MM200; não vê os resultados de 17/11; concordo se perder 149 €.',
        news: 72, cat: 'Resultados a 17/11: o guidance dos centros de dados', risk: 'Fecho abaixo de 172 $ ou corte do guidance' },
    'ALV.DE': { key: 'buy', action: 'Comprar', short: 70, mid: 84, long: 70, why: 'Sobe 6,8% com resultados acima do esperado.', risk: 'Perde os 300 € ou corta o dividendo' },
    'VWCE.DE': { key: 'hold', action: 'Manter e reforçar', short: 40, mid: 82, long: 90, why: 'Núcleo do plano.' },
    MSFT: { key: 'hold', action: 'Manter', short: 50, mid: 76, long: 70, why: 'Tendência longa a favor.' },
    AAPL: { key: 'hold', action: 'Manter', short: 50, mid: 76, long: 60, why: 'Perto do máximo do ano.' },
    'c:BTC': { key: 'wait', action: 'Esperar', short: 40, mid: 45, long: 62, entry: 86000, target: 99000, stop: 80000, why: 'abaixo das médias', plan: 'entrar acima de 71 000 €' },
    'BZ=F': { key: 'up', action: 'Em alta', short: 66, mid: 77, long: 45, why: 'Brent acima da média de 50 dias.' },
};
function verdictOf(s) {
    if (SPECIAL[s]) return SPECIAL[s];
    const sc = (h) => 25 + (hash(s + h) % 51); // 25 a 75
    const mid = sc('m');
    const key = REFS.includes(s) ? (mid >= 58 ? 'up' : mid <= 42 ? 'down' : 'flat') : mid >= 60 ? 'buy' : mid <= 35 ? 'avoid' : 'hold';
    // quem manda entrar ou sair diz o que faria a decisão estar errada (o publicar exige-o)
    return { key, short: sc('c'), mid, long: sc('l'), why: `${s}: leitura de teste.`, ...(key === 'buy' || key === 'avoid' ? { risk: `${s}: perde a média de 200 dias.` } : {}) };
}
const NEWS = (q) => ({ q, items: [
    { title: `${q}: ações disparam após lucros recorde`, link: 'https://news.example/1', source: 'Jornal de Negócios', time: 1762299000 },
    { title: `${q} shares fall on weak demand`, link: 'https://news.example/2', source: 'Reuters', time: 1762290000 },
    { title: `<img src=x onerror=alert(1)> ${q} apresenta plano`, link: 'javascript:alert(1)', source: 'Eco', time: 1762280000 },
] });

function proxyBody(u) {
    const p = u.pathname;
    if (p === '/health') return { ok: true };
    if (p === '/quotes') return { quotes: u.searchParams.get('symbols').split(',').map((s) => quote(s, u.searchParams.get('range'))) };
    if (p === '/news') return NEWS(u.searchParams.get('q'));
    // 4.51: o Fundo Viva — os fins de ano e o de «hoje»
    if (p === '/futuro') return { dia: '2026-11-23', f: { 'FUNDO VIVA': { up: 18.3484, d: [['2023-12-31', 16.1857], ['2024-12-31', 17.0496], ['2025-12-31', 18.2705], ['2026-11-23', 18.3484]], ini: ['1992-11-27', 4.99] } } };
    if (p === '/ppr') {
        // 4.47: os valores diários das unidades do PPR (só os dias úteis), desde o «de»: a Proteção devagar, o Dinâmico mais depressa
        const d = [];
        for (let t = Date.parse(u.searchParams.get('de') + 'T12:00:00Z'), i = 0; t <= Date.now(); t += 864e5) { const w = new Date(t).getUTCDay(); if (w > 0 && w < 6) d.push([new Date(t).toISOString().slice(0, 10), i++]); }
        return { f: { 7614: { n: 'Proteção (PPR)', d: d.map(([x, i]) => [x, Math.round((100 + 0.01 * i) * 1e5) / 1e5]) }, 7615: { n: 'Dinâmico (PPR ICAE Ações)', d: d.map(([x, i]) => [x, Math.round((110 + 0.05 * i) * 1e5) / 1e5]) } } };
    }
    if (p === '/derivs') return { at: 1, items: [
        { c: 'BTC', funding8h: -0.0043, index: 58882, dvol: 52.6, basis: { inst: 'BTC-29JAN27', days: 69, pct: 0.96, ann: 5.07 } },
        { c: 'ETH', funding8h: 0.0147, dvol: 65.6, basis: { inst: 'ETH-29JAN27', days: 69, pct: 0.7, ann: 3.7 } },
        { c: 'SOL', funding8h: -0.0005 }, { c: 'XRP', error: 'sem dados da Deribit' }] };
    if (p === '/ext') return { at: Math.floor(Date.now() / 1000), items: u.searchParams.get('symbols').split(',').map((s) => {
        if (s !== 'PLTR') return { symbol: s, kind: null };
        const q = quote(s, '1d'), t1 = Math.floor(Date.now() / 1000) - 600;
        const series = Array.from({ length: 12 }, (_, i) => [t1 - (11 - i) * 600, +(q.price * (1 - 0.2 * (i + 1) / 12)).toFixed(4)]);
        return { symbol: s, kind: 'pre', price: series[11][1], ref: q.price, changePct: -20, time: t1, series };
    }) };
    if (p === '/consensus') return { items: u.searchParams.get('symbols').split(',').map((s) => (s === 'NVDA' ? { symbol: s, key: 'strong_buy', mean: 1.4, n: 58, target: 230.5, low: 150, high: 300, price: 196, currency: 'USD', votes: [20, 30, 6, 1, 1], votes3: [14, 28, 12, 2, 2], f: { pe: 28.4, cr: 0.6, mg: 0.55, roe: 0.9 }, rev: { up: 12, down: 2, chg: 0.084 }, sur: { n: 4, beats: 4, avg: 0.062 } } : s === 'TSLA' ? { symbol: s, key: 'hold', mean: 2.8, n: 40, target: 300, low: 120, high: 500, price: 250, currency: 'USD', votes: [5, 10, 18, 5, 2] } : s === 'VWCE.DE' ? { symbol: s, none: true, fund: { pe: 21.5, pb: 3.2, ter: 0.0022, top: [['NVIDIA Corp', 0.051], ['Apple <b>Inc</b>', 0.043]] } } : { symbol: s, none: true })) };
    if (p === '/movers') return { gainers: [{ symbol: 'XYZ', name: 'Xyz Therapeutics', price: 12.3, changePct: 38.2, volume: 9e6, currency: 'USD' }], losers: [{ symbol: 'ABCD', name: 'Abcd Corp', price: 4.1, changePct: -22.5, volume: 3e6, currency: 'USD' }], actives: [] };
    if (p === '/fuel' && u.searchParams.get('list') === '1') return { fuels: [{ id: +u.searchParams.get('tipos'), name: 'Gasolina simples 95', n: 3, median: 1.739, max: 1.799, updated: '2026-11-05 09:30',
        stations: [{ price: 1.589, name: 'Prio Torres Novas', brand: 'Prio', addr: 'Rua A, Torres Novas', lat: 39.48, lon: -8.54 }, { price: 1.739, name: 'Galp Centro', brand: 'Galp', addr: 'Av. B', lat: null, lon: null }, { price: 1.799, name: 'BP Norte', brand: 'BP', place: 'Porto, Porto' }] }] };
    if (p === '/fuel') return { fuels: [
        { id: 2101, name: 'Gasóleo simples', n: 3012, avg: 1.611, median: 1.599, min: 1.449, max: 1.899, cheapest: [{ price: 1.449, name: 'Intermarché', brand: 'Intermarché', place: 'Leiria, Leiria' }], updated: '2026-11-05 09:30' },
        { id: 3201, name: 'Gasolina simples 95', n: 2987, avg: 1.751, median: 1.739, min: 1.589, max: 2.049, cheapest: [{ price: 1.589, name: 'Prio Torres Novas', brand: 'Prio', place: 'Torres Novas, Santarém' }], updated: '2026-11-05 09:30' }] };
    if (p === '/fuel/distritos') return { items: [{ id: 11, name: 'Lisboa' }, { id: 13, name: 'Porto' }] };
    if (p === '/cryptoglobal') return { mcap: 2.1e12, mcapChg: -3.2, vol: 9.5e10, btcDom: 58.4, ethDom: 11.2, fng: { v: 24, label: 'Extreme Fear', prev: 30, h: Array.from({ length: 90 }, (_, i) => Math.round(50 + 30 * Math.sin(i / 9))) } };
    if (p === '/fuel/municipios') return { items: [{ id: 1316, name: 'Santo Tirso' }, { id: 1312, name: 'Porto' }] };
    if (p === '/me') return { owner: ME.owner, others: ME.others, ...(ME.naHora ? { naHora: true } : {}) };
    if (p === '/stats') return ME.owner ? { total: 5, d1: 2, d7: 4, d30: 5, claude: 1, others: ME.others, run: { at: '2026-11-07T07:20:00Z', queued: 1, done: 1, max: 20 } } : null;
    if (p === '/universe') return ME.owner ? UNI : null;
    if (p === '/owner') { ME.others = JSON.parse(u.searchParams.get('_b') || '{}').others ?? ME.others; return { ok: true }; }
    if (p === '/advice' && !ME.owner) return ME.advice;
    if (p === '/advice') return ADV.doc;
    if (p === '/calendar') return { items: u.searchParams.get('symbols').split(',').map((s) => s === 'NVDA' ? { symbol: s, earnings: Math.floor(Date.now() / 1000) + 5 * 86400, exDividend: null } : { symbol: s, earnings: null, exDividend: null }) };
    if (p === '/search') return { items: [{ symbol: 'EGL.LS', name: 'Mota-Engil', exchange: 'Lisbon', type: 'Equity' }] };
    return null;
}

(async () => {
    // a análise do dono no formato 4.0, exatamente como o publicar.mjs a grava no KV
    const { buildAdvice } = await import(require('url').pathToFileURL(path.join(__dirname, '../conselheiro/publicar.mjs')).href);
    const covered = [...FUNDS, 'c:BTC', 'c:ETH', 'c:SOL', 'c:XRP', ...WATCH, ...REFS].filter((s) => !SKIP.includes(s));
    // a Nvidia leva a regra automática do dia (o publicar só guarda o algWhy de quem a tem; e exige-o a quem discorda dela)
    // e o veredicto anterior: a Nvidia mudou hoje (dizia esperar); a Allianz compra-se desde dia 1 (antes era manter)
    const PREV = { NVDA: { date: '2026-11-05', key: 'wait', since: '2026-11-01' }, 'ALV.DE': { date: '2026-11-05', key: 'scale', since: '2026-11-01', was: 'hold' } };
    const dadosRows = covered.map((s) => ({ s, kind: REFS.includes(s) ? 'ref' : 'x', price: s === 'NVDA' ? 196 : s === 'c:BTC' ? 88000 : null, ...(s === 'NVDA' ? { rule: 'turn' } : {}), ...(PREV[s] ? { prev: PREV[s] } : {}) }));
    // mais um da lista toda da TR (fora das listas da app): a PUMA
    const pick = { s: 'PUM.DE', key: 'buy', action: 'Comprar', short: 60, mid: 70, long: 72, why: 'PUMA: tendência forte na lista da TR.', risk: 'Perde a média de 200 dias.' };
    const built = buildAdvice({ ...ADV_BASE, actions: covered.map((s) => ({ s, ...verdictOf(s) })).concat(pick), rank: { mid: ['NVDA', 'ALV.DE', 'VWCE.DE', 'MSFT', 'AAPL'] } }, { rows: dadosRows }, [{ s: 'PUM.DE' }]);
    assert.deepEqual(built.errs, [], 'a análise de teste passa na validação do publicar.mjs');
    ADV.doc = { ...built.out, date: '2026-11-06', generatedAt: '2026-11-06T07:16:00Z' };
    console.log('✓ análise de teste (formato 4.0) validada pelo publicar.mjs:', ADV.doc.actions.length, 'ativos');

    const server = http.createServer((req, res) => {
        const u = decodeURIComponent(req.url.split('?')[0]);
        // o motor de gestos comum às apps (../onda/rt/gestos-onda.js) vem da pasta onda/ do repositório
        const ONDA_RT = path.resolve(ROOT, '..', 'onda', 'rt');
        const comum = /^\/escolaplay\/onda\/rt\//.test(u);
        let f = comum ? u.replace(/^\/escolaplay\/onda\/rt\//, '/') : u.replace(/^\/escolaplay\/mercados\/?/, '/');
        if (f === '/') f = '/index.html';
        const base = comum ? ONDA_RT : ROOT, fp = path.join(base, f);
        if (!fp.startsWith(base) || !fs.existsSync(fp)) { res.writeHead(404); return res.end(); }
        res.writeHead(200, { 'Content-Type': TYPES[path.extname(fp)] || 'application/octet-stream' });
        fs.createReadStream(fp).pipe(res);
    }).listen(0);
    const url = `http://127.0.0.1:${server.address().port}/escolaplay/mercados/`;
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: SHOTS ? 2 : 1, isMobile: true, hasTouch: true, locale: 'pt-PT', timezoneId: 'Europe/Lisbon', colorScheme: 'dark' });
    // com capturas: ao lado de cada imagem do ecrã fica o texto que lá está (um .txt), para se ler o ecrã sem a imagem
    if (SHOTS) ctx.on('page', (p) => { const tira = p.screenshot.bind(p); p.screenshot = async (o) => { if (o && o.path) fs.writeFileSync(o.path.replace(/\.png$/, '.txt'), await p.evaluate(() => document.body.innerText)); return tira(o); }; });
    const errors = [];
    let wsMsgs = 0;

    const JDOC = { v: 1, days: { '2026-10-01': [{ s: 'NVDA', p: 150, a: 'buy' }, { s: 'TSLA', p: 500, a: 'avoid' }, { s: 'VWCE.DE', p: 150, a: 'buy' }] } };
    let jPosts = 0;
    const lotPosts = [], claudePosts = [], ownerPosts = [], planoPosts = [], runPosts = [];
    await ctx.route(/proxy\.test/, (route) => {
        const u = new URL(route.request().url());
        if (u.pathname === '/journal') {
            if (route.request().method() === 'POST') { const b = JSON.parse(route.request().postData()); if ('claude' in b) claudePosts.push(b); if (b.date && b.items) { JDOC.days[b.date] = b.items; jPosts++; } if (b.lots) lotPosts.push(b.lots); if (b.plano) planoPosts.push(b.plano); return route.fulfill({ json: { ok: true }, headers: { 'Access-Control-Allow-Origin': '*' } }); }
            return route.fulfill({ json: JDOC, headers: { 'Access-Control-Allow-Origin': '*' } });
        }
        if (u.pathname === '/advice/run' && route.request().method() === 'POST') { runPosts.push(JSON.parse(route.request().postData())); return route.fulfill({ json: { naHora: true, pedidaEm: new Date().toISOString() }, headers: { 'Access-Control-Allow-Origin': '*' } }); }
        if (u.pathname === '/owner' && route.request().method() === 'POST') { const b = JSON.parse(route.request().postData()); ownerPosts.push(b); ME.others = b.others; return route.fulfill({ json: { ok: true }, headers: { 'Access-Control-Allow-Origin': '*' } }); }
        const body = proxyBody(u);
        return body ? route.fulfill({ json: body, headers: { 'Access-Control-Allow-Origin': '*' } }) : route.fulfill({ status: 404, json: { error: 'x' } });
    });
    await ctx.route(/binance\.(vision|com)\/api\/v3\/klines/, (route) => {
        const u = new URL(route.request().url());
        const n = +u.searchParams.get('limit');
        const sym = u.searchParams.get('symbol');
        const s = series(sym, n, 900, u.searchParams.get('interval') === '1d' ? 0.002 : 0);
        return route.fulfill({ json: s.map(([t, c]) => [t * 1000, String(c), String(c), String(c), String(c), '1000']), headers: { 'Access-Control-Allow-Origin': '*' } });
    });
    await ctx.route(/binance\.(vision|com)\/api\/v3\/ticker/, (route) => route.fulfill({ json: [], headers: { 'Access-Control-Allow-Origin': '*' } }));
    await ctx.route(/coingecko|fonts\./, (route) => route.abort());
    let fhSubs = 0;
    await ctx.routeWebSocket(/finnhub/, (ws) => {
        ws.onMessage((m) => { const d = JSON.parse(m); if (d.type === 'subscribe') { fhSubs++; if (d.symbol === 'NVDA') ws.send(JSON.stringify({ type: 'trade', data: [{ s: 'NVDA', p: 250, t: Date.now() + 60000, v: 10 }] })); } });
    });
    await ctx.routeWebSocket(/binance/, (ws) => {
        const px = { BTCEUR: 88123.45, ETHEUR: 3120.5, SOLEUR: 161.2, XRPEUR: 2.1873 };
        const send = () => { for (const [s, p] of Object.entries(px)) { const v = p * (1 + (Math.random() - 0.5) * 0.001); ws.send(JSON.stringify({ stream: s.toLowerCase() + '@ticker', data: { e: '24hrTicker', E: Date.now(), s, c: String(v), P: s === 'SOLEUR' ? '-5.12' : '2.31', p: '10', x: String(p * 0.98), h: String(p * 1.02), l: String(p * 0.97), q: '123456789' } })); wsMsgs++; } };
        send(); const t = setInterval(send, 400); ws.onClose(() => clearInterval(t));
    });

    // 0) instalação nova: já vem ligada ao conector do autor (no iPhone, a app do ecrã principal não vê o que o Safari guardou)
    await ctx.route(/mercados-proxy\.mercados-proxy\.workers\.dev/, (route) => route.fulfill({ status: 503, json: { error: 'teste' }, headers: { 'Access-Control-Allow-Origin': '*' } }));
    let page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/status of 503/.test(m.text())) errors.push('console: ' + m.text()); });
    await page.goto(url);
    await page.waitForFunction(() => { try { return JSON.parse(localStorage.getItem('mercados:v1')).proxy === 'https://mercados-proxy.mercados-proxy.workers.dev'; } catch { return false; } });
    console.log('✓ instalação nova: já ligada ao conector do autor');

    // 1) sem conector: cripto funciona e aparece o aviso
    await page.addInitScript(() => { const c = JSON.parse(localStorage.getItem('mercados:v1') || '{}'); c.proxy = ''; localStorage.setItem('mercados:v1', JSON.stringify(c)); });
    await page.reload();
    await page.waitForFunction(() => document.querySelector('[data-key="c:BTC"] .px') && /€/.test(document.querySelector('[data-key="c:BTC"] .px').textContent));
    assert.ok(await page.locator('.banner').isVisible(), 'aviso do conector');
    assert.match(await page.locator('#mk-status').textContent(), /Cripto ao vivo/);
    console.log('✓ sem conector: cripto ao vivo', await page.locator('[data-key="c:BTC"] .px').first().textContent());
    await page.close();

    // 2) com conector
    await ctx.addInitScript(() => { const c = JSON.parse(localStorage.getItem('mercados:v1') || '{}'); if (!c.proxySet) { c.proxy = 'https://proxy.test'; c.proxySet = 1; localStorage.setItem('mercados:v1', JSON.stringify(c)); } });
    page = await ctx.newPage();
    page.on('pageerror', (e) => { errors.push('pageerror: ' + e.message); if (process.env.STACK) console.log(e.stack); });
    page.on('console', (m) => { if (m.type() === 'error' && !/ERR_FAILED|net::/.test(m.text())) errors.push('console: ' + m.text()); });
    page.on('dialog', (d) => { errors.push('dialog (XSS?): ' + d.message()); d.dismiss(); });
    await page.goto(url);
    await page.waitForFunction(() => window.__mk && window.__mk.st.yahooAt > 0);
    await page.waitForFunction(() => document.body.textContent.includes('Gasóleo simples'));
    assert.equal(await page.locator('.banner').count(), 0);
    const brent = await page.locator('[data-key="BZ=F"] .px').first().textContent();
    assert.match(brent, /64,20/);
    assert.match(await page.locator('[data-key="RB=F"]').first().textContent(), /€.*\/L|\/L/);
    assert.equal(await page.locator('.sec:has(h2:text("Ações que sigo")) .row').count(), 23);
    const firstStock = await page.locator('.sec:has(h2:text("Ações que sigo")) .row .r-name').first().textContent();
    assert.equal(firstStock, 'Allianz', 'ordenado pela maior subida');
    assert.equal(await page.locator('.sec:has(h2:text("Ações que sigo")) .row[data-key$=".LS"]').count(), 0, 'sem ações portuguesas por omissão');
    // ordenar: desce → a maior descida primeiro; bolsa → grupos (EUA, Alemanha…); minha → setas em Ajustes
    const stockSec = '.sec:has(h2:text("Ações que sigo"))';
    await page.click(stockSec + ' [data-sort="down"]');
    assert.equal(await page.locator(stockSec + ' .row .r-name').first().textContent(), 'Tesla', 'maior descida primeiro');
    await page.click(stockSec + ' [data-sort="mkt"]');
    const grps = await page.locator(stockSec + ' .grp-h').allTextContents();
    assert.ok(grps.some((g) => /^EUA/.test(g)) && grps.some((g) => /^Alemanha/.test(g)), 'grupos por bolsa: ' + grps.join(' | '));
    // Carteira (4.12): o simulador do plano, desenhado pela Onda
    const orc0 = await page.evaluate(() => window.__mk.cfg.budget);
    await page.click('#mk-nav [data-tab="carteira"]');
    await page.waitForSelector('.sim');
    const campo = async (k, v) => { await page.evaluate(([k, v]) => { const i = document.querySelector(`.sim [data-cfg="${k}"]`); i.value = String(v); i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); }, [k, v]); };
    await page.evaluate(() => { window.__mk.cfg.budget = 900; }); // o plano dos Ajustes
    await campo('simBudget', 900);
    await page.waitForSelector('.sim-big b');
    assert.match(await page.locator('.sim-big b').textContent(), /^\d{1,3}(\s\d{3})*\s€$/, 'o valor no fim, em euros');
    assert.equal(await page.locator('.sim-meta').count(), 0, 'sem objetivo, sem caixa');
    await campo('simGoal', 300000);
    await page.waitForSelector('.sim-meta');
    assert.match(await page.locator('.sim-meta p').first().textContent(), /^Chegas lá em \d+ anos/);
    await campo('simYears', 10);
    assert.equal(await page.locator('.sim-tab tbody tr:last-child td').first().textContent(), '10 anos');
    // − e +: 10 → 11 anos; e de volta
    await page.click('.sim [data-act="sim-step"][data-k="simYears"][data-d="1"]');
    assert.equal(await page.locator('.sim [data-out="simYears"]').textContent(), '11 anos');
    await page.click('.sim [data-act="sim-step"][data-k="simYears"][data-d="-1"]');
    assert.equal(await page.locator('.sim [data-out="simYears"]').textContent(), '10 anos');
    // em euros de hoje: menos do que o valor no futuro
    const futuro = await page.locator('.sim-big b').textContent();
    await page.click('[data-act="sim-hoje"][data-v="1"]');
    if (SHOTS) { await page.locator('.sim').scrollIntoViewIfNeeded(); await page.locator('.sim').screenshot({ path: path.join(SHOTS, '8d-carteira-hoje.png') }); }
    const hoje = await page.locator('.sim-big b').textContent();
    const n = (x) => +x.replace(/[^\d]/g, '');
    assert.ok(n(hoje) < n(futuro) && Math.abs(n(hoje) * 1.02 ** 10 / n(futuro) - 1) < 0.001, `euros de hoje: ${hoje} vs ${futuro}`);
    assert.match(await page.locator('.sim-big small').textContent(), /em euros de hoje/);
    assert.match(await page.locator('.sim-infl').textContent(), /^Com 2 % de inflação por ano, 1000 € daqui a 10 anos compram o mesmo que 820\s€ hoje\.$/);
    await page.click('[data-act="sim-hoje"][data-v="0"]');
    await page.locator('.sim svg.sim-g').scrollIntoViewIfNeeded();
    const gb = await page.locator('.sim svg.sim-g').boundingBox();
    await page.mouse.move(gb.x + gb.width * 0.55, gb.y + gb.height / 2);
    assert.match(await page.locator('#sim-tip').textContent(), /^Em [56] anos: [\d\s]+€ · entre .+ · investido [\d\s]+€$/, 'o dedo no gráfico mostra o ano');
    await page.mouse.move(gb.x + gb.width * 0.99, gb.y + gb.height / 2);
    assert.match(await page.locator('#sim-tip').textContent(), /^Em 10 anos: /);
    if (SHOTS) { await page.mouse.move(gb.x + gb.width * 0.7, gb.y + gb.height / 2); await page.locator('.sim').screenshot({ path: path.join(SHOTS, '8b-carteira-dedo.png') }); }
    assert.equal(await page.locator('#mk-nav [data-tab="carteira"].on').count(), 1);
    console.log('✓ carteira:', (await page.locator('.sim-big').textContent()).replace(/\s+/g, ' ').trim(), '|', await page.locator('.sim-meta p').first().textContent());
    // o rendimento real (4.13): desde quando compra pelo plano
    // (o BTC já traz compras do teste das datas da cripto; o fundo ainda não)
    await page.click('.real [data-act="real-ed"]');
    assert.equal(await page.locator('details.real-ed[open]').count(), 1, 'Editar o que tenho abre o editor');
    await page.evaluate(() => window.__mk.render());
    assert.equal(await page.locator('details.real-ed[open]').count(), 1, 'continua aberto quando o ecrã se redesenha (preços novos)');
    assert.equal(await page.locator('.pg-t').textContent(), 'Carteira');
    await page.click('.sim details.how > summary');
    await page.evaluate(() => window.__mk.render());
    assert.equal(await page.locator('.sim details.how[open]').count(), 1, 'Como é feita a conta continua aberto');
    const desde = (k, iso) => page.evaluate(([k, iso]) => { const i = document.querySelector(`[data-lot="plan"][data-k="${k}"]`); i.value = iso; i.dispatchEvent(new Event('change', { bubbles: true })); }, [k, iso]);
    const isoAtras = (dias) => new Date(Date.now() - dias * 86400000).toISOString().slice(0, 10);
    await desde('VWCE.DE', isoAtras(300));
    await page.waitForSelector('.real .sim-big b', { timeout: 10000 });
    assert.match(await page.locator('.real .sim-big b').textContent(), /^\d[\d\s]*\s€$/, 'vale hoje (o pt-PT só agrupa a partir de 10 000)');
    assert.ok((await page.locator('.real .real-l .row').evaluateAll((rs) => rs.map((r) => r.dataset.open))).includes('VWCE.DE'), 'o fundo entra');
    assert.match(await page.locator('.real .sim-st div:first-child b').textContent(), /€$/, 'investido');
    assert.equal(await page.evaluate(() => window.__mk.cfg.lots['VWCE.DE'].plan), isoAtras(300), 'fica guardado');
    // apagar uma data: o ✕ no campo (no iPhone não há outra maneira); o campo vazio fica da altura dos outros
    await desde('c:BTC', isoAtras(200));
    await page.waitForSelector('.dt-x[data-k="c:BTC"][data-f="plan"]');
    await page.click('.dt-x[data-k="c:BTC"][data-f="plan"]');
    await page.waitForFunction(() => !(window.__mk.cfg.lots['c:BTC'] || {}).plan);
    assert.equal(await page.locator('[data-lot="plan"][data-k="c:BTC"]').inputValue(), '', 'o campo fica vazio logo');
    await page.waitForFunction(() => !document.querySelector('.dt-x[data-k="c:BTC"][data-f="plan"]'), null, { timeout: 3000 });
    const alturas = await page.evaluate(() => ['[data-lot="plan"][data-k="c:BTC"]', '[data-lot="pm"][data-k="c:BTC"]'].map((q) => Math.round(document.querySelector(q).getBoundingClientRect().height)));
    assert.ok(alturas[0] >= alturas[1] - 2, 'a data vazia não encolhe: ' + alturas.join(' vs '));
    // colar de uma vez: uma linha por ativo (símbolo, quantidade, preço médio)
    // como vem da TR ou de uma folha de cálculo: com €, espaços duros, «@», «;» e o símbolo sem a bolsa (VWCE)
    await page.fill('#lot-imp', 'VWCE 5,486463 @ 169,86 € 02/11/2026\nBTC 0,044679 73\u00a0722,55\u00a0€ 2026-10-08\nSolana;3,488363;102,03\nxpto 1 2');
    await page.click('[data-act="lot-import"]');
    assert.deepEqual(await page.evaluate(() => ['VWCE.DE', 'c:BTC', 'c:SOL'].map((k) => [window.__mk.cfg.lots[k].qty, window.__mk.cfg.lots[k].avg, window.__mk.cfg.lots[k].cost])),
        [[5.486463, 169.86, 931.93], [0.044679, 73722.55, 3293.85], [3.488363, 102.03, 355.92]], 'importadas, com o investido calculado');
    assert.deepEqual(await page.evaluate(() => [window.__mk.cfg.lots['VWCE.DE'].qd, window.__mk.cfg.lots['c:BTC'].qd, window.__mk.cfg.lots['c:SOL'].qd]), ['2026-11-02', '2026-10-08', undefined], 'a data no fim, nos dois formatos');
    assert.match(await page.locator('#mk-toast').textContent(), /3 posições importadas · não percebi: xpto/);
    // registar (4.20): uma compra só com os euros (a data e o preço do dia vêm feitos) e o acerto com a TR (cashback)
    const btcL = () => page.evaluate(() => window.__mk.cfg.lots['c:BTC']);
    assert.equal((await btcL()).at, isoAtras(0), 'colar marca o dia do ponto de partida');
    await page.waitForSelector('.reg select[data-reg="k"]');
    await page.selectOption('.reg select[data-reg="k"]', 'c:BTC');
    await page.fill('.reg [data-reg="e"]', '90');
    await page.evaluate(() => window.__mk.render()); // um redesenho (preços novos) não perde o que se escreveu
    assert.equal(await page.locator('.reg [data-reg="e"]').inputValue(), '90');
    const pxBtc = await page.evaluate(() => window.__mk.Q['c:BTC'].price);
    await page.click('[data-act="reg-compra"]');
    let bL = await btcL();
    assert.equal(bL.compras.length, 1, 'compra juntada');
    assert.deepEqual([bL.compras[0].d, bL.compras[0].e], [isoAtras(0), 90]);
    assert.ok(Math.abs(bL.compras[0].q * pxBtc / 90 - 1) < 0.01, 'as unidades pelo preço de hoje');
    assert.match(await page.locator('#mk-toast').textContent(), /Compra juntada: 90,00\s€ de Bitcoin.*Desfazer/);
    assert.equal(await page.locator('.reg [data-reg="e"]').inputValue(), '', 'o campo fica limpo');
    await page.waitForSelector('.reg-i', { timeout: 3000 }); // o redesenho vem logo a seguir
    assert.equal(await page.locator('.reg-i').count(), 1, 'aparece na lista');
    await page.waitForFunction(() => /investido 3384\s€/.test(document.querySelector('.real-l .row[data-open="c:BTC"] .r-sub').textContent), null, { timeout: 3000 });
    // a TR mostra mais 0,001 (arredondamentos e cashback): escreve-se a quantidade da TR e a app junta a diferença
    const qTr = 0.044679 + bL.compras[0].q + 0.001;
    await page.fill('.reg [data-reg="q"]', qTr.toFixed(8).replace('.', ','));
    await page.click('[data-act="reg-acerto"]');
    bL = await btcL();
    assert.equal(bL.compras.length, 2, 'acerto juntado');
    assert.ok(Math.abs(bL.compras[1].q - 0.001) < 1e-8 && bL.compras[1].cb === 1, 'a diferença, marcada como acerto');
    assert.match(await page.locator('#mk-toast').textContent(), /Acertado com a TR: \+0,001 de Bitcoin/);
    await page.click('.reg-i [data-act="reg-rm"][data-i="1"]');
    assert.equal((await btcL()).compras.length, 1, '✕ apaga o registo');
    // 4.45: a poupança periódica — o plano, o round up e o saveback em listas, desde o dia em que se copiou o que tens da TR (as
    // datas de antes já lá estão): em cada data escreve-se o valor como na TR (vazio fica a sugestão: o plano por mês; a média dos
    // escritos), grava ao sair do campo, e ✕ apaga; conta nesse dia às 15h45, ao preço desse dia
    const sd0 = await page.evaluate(() => window.__mk.cfg.saveDays);
    await page.evaluate(() => { const c = window.__mk.cfg, L = c.lots['VWCE.DE']; L.at = new Date(Date.now() - 40 * 864e5).toISOString().slice(0, 10); L.pm = 900; c.saveDays = [2]; window.__mk.render(); });
    await page.selectOption('.reg select[data-reg="k"]', 'VWCE.DE');
    await page.waitForSelector('.reg .pp .pp-f[data-fold="pp-ru"]');
    assert.equal(await page.locator('.reg [data-act="reg-sbru"], .reg [data-reg="sd"]').count(), 0, 'sem o formulário antigo');
    const fL = () => page.evaluate(() => window.__mk.cfg.lots['VWCE.DE']);
    const datasDe = (tp) => page.locator(`.reg .pp-f[data-fold="pp-${tp}"] input[data-ppv]`).evaluateAll((is) => is.map((x) => x.dataset.d));
    const ruD = await datasDe('ru'), sbD = await datasDe('sb'), plD = await datasDe('pl');
    assert.ok(ruD.length >= 5 && ruD.every((x) => ['02', '09', '16', '23'].includes(x.slice(8)) && x > isoAtras(40)), 'round up: os dias 2, 9, 16 e 23, depois do que copiaste: ' + ruD);
    assert.deepEqual([...ruD].sort().reverse(), ruD, 'a mais recente primeiro');
    assert.ok(ruD[0] > isoAtras(0) && ruD[1] <= isoAtras(0), 'a primeira é a próxima');
    assert.ok(sbD.length >= 2 && sbD.every((x) => x.endsWith('-02')) && plD.length >= 2 && plD.every((x) => x.endsWith('-02')), 'o saveback e o plano no dia 2');
    assert.equal(await page.locator(`.reg [data-ppv="pl"][data-d="${plD[1]}"]`).getAttribute('placeholder'), '900', 'o plano: vazio é o valor por mês');
    assert.match(await page.locator('.reg .pp-f[data-fold="pp-ru"] > summary').textContent(), /escreve o valor da TR em cada data/, 'sem nenhum escrito');
    const escreve = async (tp, d, v) => { const x = page.locator(`.reg [data-ppv="${tp}"][data-d="${d}"]`); await x.fill(v); await x.evaluate((e) => e.blur()); await page.waitForTimeout(150); };
    // dois round ups (2,24 € e 12 €): fica o valor de cada data, e a sugestão passa a ser a média — 7,12 €, ~342 € por ano
    await escreve('ru', ruD[2], '2,24');
    assert.equal((await fL()).ra[ruD[2]], 2.24, 'o round up dessa data');
    assert.match(await page.locator('#mk-toast').textContent(), /^Round up a \d\d\/\d\d\/\d{4}: 2,24\s€/);
    await escreve('ru', ruD[1], '12');
    await page.waitForFunction(() => /média 7,12\s€ · ~342\s€ por ano/.test(document.querySelector('.reg .pp-f[data-fold="pp-ru"] > summary').textContent), null, { timeout: 3000 });
    assert.equal(await page.locator(`.reg [data-ppv="ru"][data-d="${ruD[3]}"]`).getAttribute('placeholder'), '7,12', 'as datas vazias sugerem a média');
    // o pendente (a próxima) escreve-se já: só conta nesse dia, às 15h45; o saveback de 8,40 €; o plano de um dia em 600 €
    await escreve('ru', ruD[0], '2,31');
    await escreve('sb', sbD[sbD.length - 1], '8,40');
    await escreve('pl', plD[1], '600');
    const vL = await fL();
    assert.deepEqual([vL.ra[ruD[0]], vL.sa[sbD[sbD.length - 1]], vL.pa[plD[1]]], [2.31, 8.4, 600]);
    await page.waitForSelector('.reg-i:has-text("plano (ajustado)")', { timeout: 3000 });
    if (SHOTS) await page.locator('.reg').screenshot({ path: path.join(SHOTS, '8g-carteira-poupanca.png') });
    // ✕ apaga o escrito; e o campo vazio também volta à sugestão
    await page.locator(`.reg .pp-l:has([data-ppv="ru"][data-d="${ruD[2]}"]) [data-act="pp-rm"]`).click();
    assert.equal(ruD[2] in (await fL()).ra, false, '✕ apaga');
    await page.waitForFunction((d) => !document.querySelector(`.reg .pp-l:has([data-ppv="ru"][data-d="${d}"]) [data-act="pp-rm"]`), ruD[2], { timeout: 3000 });
    await escreve('pl', plD[1], '');
    assert.equal(plD[1] in (await fL()).pa, false, 'vazio volta à sugestão');
    await page.evaluate((sd) => { const c = window.__mk.cfg, L = c.lots['VWCE.DE']; for (const x of ['pm', 'pa', 'ra', 'sa']) delete L[x]; L.at = new Date().toISOString().slice(0, 10); c.saveDays = sd; window.__mk.render(); }, sd0);
    // 4.49: com meses de história, à vista só a próxima e as últimas (o round up: 4; o plano e o saveback: 2); as outras numa dobra fechada
    {
        await page.evaluate(() => { const c = window.__mk.cfg, L = c.lots['VWCE.DE']; L.at = new Date(Date.now() - 200 * 864e5).toISOString().slice(0, 10); L.pm = 900; c.saveDays = [2]; window.__mk.render(); });
        await page.waitForSelector('.reg .pp-f[data-fold="pp-ru"] .pp-mais');
        const vis = await page.evaluate(() => Object.fromEntries(['pl', 'ru', 'sb'].map((tp) => { const f = document.querySelector(`.reg .pp-f[data-fold="pp-${tp}"]`), m = f.querySelector('.pp-mais');
            return [tp, { fora: f.querySelectorAll(':scope > .pp-l').length, dentro: m ? m.querySelectorAll('.pp-l').length : 0, aberta: m ? m.open : null, txt: m ? m.querySelector('summary').textContent : '' }]; })));
        assert.deepEqual([vis.ru.fora, vis.pl.fora, vis.sb.fora], [5, 3, 3], 'à vista: a próxima e as últimas ' + JSON.stringify(vis));
        assert.ok(vis.ru.dentro >= 20 && vis.ru.aberta === false && vis.ru.txt === `Mais antigas · ${vis.ru.dentro}`, 'o round up: as outras na dobra, fechada');
        assert.ok(vis.pl.dentro >= 4 && vis.sb.dentro >= 4, 'o plano e o saveback também');
        await page.click('.reg .pp-f[data-fold="pp-ru"] .pp-mais > summary');
        await page.waitForFunction(() => window.__mk.st.fold['ppm-ru'] === true, null, { timeout: 3000 }); // aberta, fica aberta
        await page.click('.reg .pp-f[data-fold="pp-ru"] .pp-mais > summary');
        await page.evaluate((sd) => { const c = window.__mk.cfg, L = c.lots['VWCE.DE']; for (const x of ['pm', 'pa', 'ra', 'sa']) delete L[x]; L.at = new Date().toISOString().slice(0, 10); c.saveDays = sd; window.__mk.render(); }, sd0);
    }
    console.log('✓ poupança periódica: plano, round up e saveback em listas; escreve-se o valor de cada data; a sugestão é a média; as antigas numa dobra');
    // 4.47: o PPR Evoluir da Fidelidade — escreve-se quanto por mês, quanto vai para o Dinâmico e desde quando; os valores das
    // unidades vêm do conector (/ppr); em cada mês, no dia de «Desde», o prémio compra ao valor do dia útil seguinte
    {
        const de = isoAtras(200), hojeP = isoAtras(0);
        await page.evaluate(() => { delete window.__mk.cfg.ppr; window.__mk.render(); });
        await page.waitForSelector('section.ppr details.ppr-ed[open]');
        assert.match(await page.locator('section.ppr .empty').textContent(), /Põe desde quando pagas/, 'sem PPR: a frase e o editor aberto');
        const escP = async (f, v) => { const x = page.locator(`section.ppr [data-ppr="${f}"]`); await x.fill(v); await x.evaluate((e) => e.blur()); await page.waitForTimeout(150); };
        await escP('pm', '60');
        await escP('din', '70');
        await page.locator('section.ppr [data-ppr="de"]').fill(de);
        await page.waitForFunction((d) => (window.__mk.cfg.ppr || {}).de === d, de, { timeout: 3000 });
        assert.deepEqual(await page.evaluate(() => window.__mk.cfg.ppr), { pm: 60, din: 70, de }, 'o que escreveste, guardado');
        await page.waitForSelector('section.ppr .sim-big b', { timeout: 8000 });
        // a conta, à parte: os prémios de cada mês no dia de «Desde» (até hoje), cada um ao valor do 1.º dia útil depois dele
        const S = proxyBody(new URL('https://proxy.test/ppr?f=7614,7615&de=' + new Date(Date.parse(de + 'T12:00:00Z') - 10 * 864e5).toISOString().slice(0, 10))).f;
        const l = await page.evaluate(() => window.__mk.pprAtivos());
        assert.deepEqual(l.map((a) => [a.k, a.name, a.b.length === l[0].b.length]), [['ppr:7614', 'Proteção', true], ['ppr:7615', 'Dinâmico (ações)', true]]);
        const ds = l[0].b.map((b) => new Date(b[0] * 1000).toISOString().slice(0, 10));
        assert.equal(ds[0], de, 'o 1.º prémio no dia de «Desde»');
        assert.ok(ds.every((x, i) => x <= hojeP && (i === 0 || [28, 29, 30, 31].includes(Math.round((Date.parse(x) - Date.parse(ds[i - 1])) / 864e5)))), 'um por mês, até hoje: ' + ds);
        assert.ok(ds.length >= 6 && ds.length <= 8, 'uns 7 prémios em 200 dias: ' + ds.length);
        for (const [j, c, parte] of [[0, '7614', 0.3], [1, '7615', 0.7]]) for (const [i, b] of l[j].b.entries()) {
            const x = S[c].d.find((r) => r[0] > ds[i]);
            assert.ok(Math.abs(b[1] - 60 * parte) < 1e-9 && Math.abs(b[2] - (60 * parte) / x[1]) < 1e-9, `${c} ${ds[i]}: ${b[1]} € → ${b[2]} unidades`);
        }
        const un = (a) => a.b.reduce((s, b) => s + b[2], 0), V = l.reduce((s, a) => s + un(a) * a.px, 0);
        const eurT = (x) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(x);
        assert.equal(await page.locator('section.ppr .sim-big b').textContent(), eurT(V), 'vale hoje');
        assert.equal(await page.locator('section.ppr .sim-st b').first().textContent(), eurT(60 * ds.length), 'investido: os prémios');
        assert.equal(await page.locator('section.ppr .real-l .row').count(), 2);
        assert.match(await page.locator('section.ppr .sec-h .sub').textContent(), /^Fidelidade · valores de \d\d\/\d\d\/\d{4}$/);
        // 4.55: as comissões do PPR — se resgatasses hoje (−0,5 % nos primeiros 5 anos)
        assert.match(await page.locator('section.ppr .ppr-custos').textContent(), new RegExp(`se resgatasses hoje, recebias ${eurT(V * 0.995).replace(/\s/g, '\\s')}, antes do imposto`));
        if (SHOTS) await page.locator('section.ppr').screenshot({ path: path.join(SHOTS, '8h-carteira-ppr.png') });
        // 4.53: ano a ano — um ano por coluna (desde o do 1.º prémio) e, somados, os totais dão o ganho
        {
            const anos = await page.evaluate(() => { const r = document.querySelector('section.ppr .ppr-anos'); return { cab: [...r.querySelectorAll('thead th')].map((x) => x.textContent).slice(1), tot: [...r.querySelectorAll('tr.ppr-tot td')].slice(1).map((x) => x.textContent), ganho: document.querySelector('section.ppr .sim-st div:nth-child(2) b').textContent }; });
            const yy = [...new Set(ds.map((x) => x.slice(0, 4)).concat(isoAtras(0).slice(0, 4)))];
            assert.deepEqual(anos.cab, yy, 'um ano por coluna');
            const nEur = (t) => (t.trim().startsWith('−') ? -1 : 1) * +t.replace(/[^\d,]/g, '').replace(',', '.');
            assert.ok(Math.abs(anos.tot.reduce((q, x) => q + nEur(x), 0) - nEur(anos.ganho)) <= anos.tot.length, 'os anos somam o ganho: ' + anos.tot + ' / ' + anos.ganho);
        }
        // acertar com a Fidelidade: as unidades da MyFidelidade mandam (na mesma proporção em cada prémio); vazio volta à conta
        await page.locator('section.ppr details.ppr-ed').evaluate((d) => { d.open = true; });
        await escP('uc', '12,5');
        const l2 = await page.evaluate(() => window.__mk.pprAtivos());
        assert.ok(Math.abs(un(l2[1]) - 12.5) < 1e-9 && Math.abs(un(l2[0]) - un(l[0])) < 1e-12, 'o Dinâmico com 12,5 unidades; a Proteção como estava');
        assert.ok(l2[1].b.every((b, i) => Math.abs(b[2] / l[1].b[i][2] - 12.5 / un(l[1])) < 1e-9), 'na mesma proporção');
        // 4.48: tão longe dos prémios registados, falta alguma entrega: o aviso, e o ganho não se mostra
        await page.waitForSelector('section.ppr .ppr-av', { timeout: 3000 });
        assert.match(await page.locator('section.ppr .ppr-av').textContent(), /^As unidades que escreveste valem mais .+ do que dão os prémios registados: falta alguma entrega extra\?/);
        assert.equal(await page.locator('section.ppr .sim-st b').nth(1).textContent(), '—', 'sem o ganho');
        await escP('uc', '');
        assert.ok(Math.abs(un((await page.evaluate(() => window.__mk.pprAtivos()))[1]) - un(l[1])) < 1e-12, 'vazio: volta à conta');
        await page.waitForFunction(() => !document.querySelector('section.ppr .ppr-av'), null, { timeout: 3000 });
        // um acerto pequeno (1 % a mais no Dinâmico) é só acerto: sem aviso
        await escP('uc', String(Math.round(un(l[1]) * 1.01 * 1e4) / 1e4).replace('.', ','));
        assert.equal(await page.locator('section.ppr .ppr-av').count(), 0, 'sem aviso');
        assert.notEqual(await page.locator('section.ppr .sim-st b').nth(1).textContent(), '—');
        await escP('uc', '');
        // tudo no Dinâmico: só uma componente; uma percentagem acima de 100 não entra
        await escP('din', '100');
        assert.deepEqual((await page.evaluate(() => window.__mk.pprAtivos())).map((a) => a.k), ['ppr:7615']);
        await escP('din', '140');
        assert.equal(await page.evaluate(() => window.__mk.cfg.ppr.din), 100, '140 % não entra');
        await escP('din', '70');
        // 4.48: uma entrega extra (data e valor) entra como um prémio: o investido sobe, e as unidades ao valor do dia útil seguinte
        {
            const dx = isoAtras(50), n0 = (await page.evaluate(() => window.__mk.pprAtivos()))[0].b.length;
            await page.locator('section.ppr details.ppr-ed').evaluate((d) => { d.open = true; });
            await page.locator('section.ppr [data-pprx="d"]').fill(dx);
            await page.locator('section.ppr [data-pprx="e"]').fill('500');
            await page.click('section.ppr [data-act="ppr-add"]');
            await page.waitForFunction(() => ((window.__mk.cfg.ppr || {}).ex || []).length === 1, null, { timeout: 3000 });
            assert.deepEqual(await page.evaluate(() => window.__mk.cfg.ppr.ex), [[dx, 500]], 'a entrega guardada');
            const l3 = await page.evaluate(() => window.__mk.pprAtivos());
            assert.equal(l3[0].b.length, n0 + 1, 'mais um prémio');
            const bx = l3[1].b.find((b) => new Date(b[0] * 1000).toISOString().slice(0, 10) === dx && Math.abs(b[1] - 350) < 1e-9), qx = S['7615'].d.find((r) => r[0] > dx);
            assert.ok(bx && Math.abs(bx[2] - 350 / qx[1]) < 1e-9, 'o Dinâmico: 70 % dos 500 €, ao valor do dia útil seguinte');
            await page.waitForFunction((t) => document.querySelector('section.ppr .sim-st b').textContent === t, eurT(60 * ds.length + 500), { timeout: 3000 });
            assert.match(await page.locator('section.ppr .ppr-x').textContent(), /500,00\s€/);
            // 4.50: o ✕ na linha da entrega (não por cima dos números) e, com 3 quadros, o último a ocupar a linha toda
            const lx = await page.locator('section.ppr .ppr-x').boundingBox(), bx2 = await page.locator('section.ppr .ppr-x .dt-x').boundingBox();
            assert.ok(bx2.y >= lx.y - 1 && bx2.y + bx2.height <= lx.y + lx.height + 1 && bx2.x + bx2.width <= lx.x + lx.width + 1, 'o ✕ na linha da entrega');
            const gs = await page.locator('section.ppr .sim-st').boundingBox(), ul = await page.locator('section.ppr .sim-st > div:last-child').boundingBox();
            assert.ok(Math.abs(ul.width - gs.width) < 4, 'o último quadro ocupa a linha toda');
            // com as unidades da MyFidelidade, a divisão da entrega é a que as faz bater (aqui, a meias): o resto fica sem aviso
            const vuP = (d) => S['7614'].d.find((r) => r[0] > d)[1];
            await escP('ur', String(Math.round((ds.reduce((a, d) => a + 18 / vuP(d), 0) + 250 / vuP(dx)) * 1e6) / 1e6).replace('.', ','));
            const l4 = await page.evaluate(() => window.__mk.pprAtivos());
            const exDe = (a) => a.b.filter((b) => new Date(b[0] * 1000).toISOString().slice(0, 10) === dx && b[1] > 100).map((b) => b[1]);
            assert.ok(Math.abs(exDe(l4[0])[0] - 250) < 0.05 && Math.abs(exDe(l4[1])[0] - 250) < 0.05, 'a entrega a meias: ' + exDe(l4[0]) + ' / ' + exDe(l4[1]));
            assert.ok(l4[0].b.filter((b) => b[1] < 100).every((b) => Math.abs(b[1] - 18) < 1e-9), 'os prémios do mês com a divisão do plano');
            assert.equal(await page.locator('section.ppr .ppr-av').count(), 0, 'sem aviso');
            await escP('ur', '');
            if (SHOTS) await page.locator('section.ppr details.ppr-ed').screenshot({ path: path.join(SHOTS, '8i-carteira-ppr-entregas.png') });
            await page.click('section.ppr [data-act="ppr-rm"][data-i="0"]');
            await page.waitForFunction(() => ((window.__mk.cfg.ppr || {}).ex || []).length === 0, null, { timeout: 3000 });
            assert.equal(await page.locator('section.ppr .ppr-x').count(), 0, '✕ apaga');
        }
        console.log('✓ PPR Evoluir: escreve-se o PPR; os prémios de cada mês ao valor do dia útil seguinte; entregas extra; acerto e aviso');
    }
    // 4.51: o Fundo Viva — escrevem-se as UP; o valor da UP vem do conector (/futuro): vale hoje, este ano e o gráfico
    {
        await page.evaluate(() => { delete window.__mk.cfg.fut; window.__mk.render(); });
        await page.waitForSelector('section.fut details.fut-ed[open]');
        assert.match(await page.locator('section.fut .empty').textContent(), /Põe as tuas UP do Fundo Viva/);
        const x = page.locator('section.fut [data-fut="up"]');
        await x.fill('567,3069'); await x.evaluate((e) => e.blur());
        await page.waitForFunction(() => (window.__mk.cfg.fut || {}).up === 567.3069, null, { timeout: 3000 });
        await page.waitForSelector('section.fut .sim-big b', { timeout: 8000 });
        const eurT = (v) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(v);
        assert.equal(await page.locator('section.fut .sim-big b').textContent(), eurT(567.3069 * 18.3484), 'vale hoje');
        assert.match(await page.locator('section.fut .sim-rng').textContent(), /^\+0,4\s%\seste ano$/);
        assert.equal(await page.locator('section.fut .sim-hit').count(), 4, 'o dedo: uma data por ponto');
        assert.equal(await page.locator('section.fut .sim-hit').last().getAttribute('data-tx'), `Hoje: ${eurT(567.3069 * 18.3484)}`);
        // 4.58: o ano a ano é o do teu dinheiro — sem os teus anos, a frase para os juntar; e as comissões (4.55)
        assert.match(await page.locator('section.fut .fut-sem').textContent(), /junta os teus anos/);
        assert.equal(await page.locator('section.fut .fut-anos').count(), 0);
        assert.match(await page.locator('section.fut .fut-custos').textContent(), /1,82 % em 2025/);
        // 4.58: o teu dinheiro em cada ano — juntam-se os teus anos (da declaração: o valor a 31/12 e as contribuições); cada
        // ano é o valor no fim, menos o do início, menos o que entrou, e a % é sobre o que lá tinhas (o que entrou a meio do ano)
        {
            await page.evaluate(() => { window.__mk.st.fold['fut-ed'] = true; window.__mk.render(); });
            for (const [a, v, c] of [['2023', '9000', ''], ['2024', '9600', '90'], ['2025', '10300,00', '100']]) {
                await page.locator('section.fut [data-futx="a"]').fill(a);
                await page.locator('section.fut [data-futx="v"]').fill(v);
                await page.locator('section.fut [data-futx="c"]').fill(c);
                await page.click('section.fut [data-act="fut-add"]');
                await page.waitForFunction((y) => ((window.__mk.cfg.fut || {}).anos || []).some((r) => r[0] === y), +a, { timeout: 3000 });
            }
            assert.deepEqual(await page.evaluate(() => window.__mk.cfg.fut.anos), [[2023, 9000, null], [2024, 9600, 90], [2025, 10300, 100]]);
            await page.waitForSelector('section.fut .fut-anos');
            const vh = 567.3069 * 18.3484, lin = [['2026 (até hoje)', vh - 10300, 10300], ['2025', 600, 9650], ['2024', 510, 9045]];
            const sp = (x) => x.replace(/\s/g, ' '), eur0 = (x) => (x >= 0 ? '+' : '−') + eurT(Math.abs(x));
            const pc1 = (x) => (x >= 0 ? '+' : '−') + new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(Math.abs(x) * 100) + ' %';
            assert.deepEqual((await page.locator('section.fut .fut-anos tr').allTextContents()).map(sp), lin.map(([l, g, b]) => sp(l + eur0(g) + pc1(g / b))), 'o teu dinheiro, ano a ano');
            const pa = lin.reduce((q, [, g, b]) => q * (1 + g / b), 1) ** (365.25 / 1058) - 1, ganho = lin.reduce((q, [, g]) => q + Math.round(g * 100) / 100, 0);
            assert.deepEqual((await page.locator('section.fut .sim-st > div').allTextContents()).slice(2).map(sp), [sp(`Ganho desde 2024${eur0(ganho)}`), sp(`Por ano${pc1(pa)}`)]);
            assert.equal(sp(await page.locator('section.fut .sim-rng').textContent()), sp(`${pc1((vh - 10300) / 10300)} este ano`));
            assert.equal(await page.locator('section.fut .sim-hit').count(), 4, 'o gráfico: os teus 31/12 e, depois, as UP × o valor da UP');
            assert.equal(sp(await page.locator('section.fut .sim-hit').first().getAttribute('data-tx')), sp(`31/12/2023: ${eurT(9000)}`));
            assert.equal(await page.locator('section.fut .sim-t').nth(2).textContent(), '12/2023');
            assert.equal(await page.locator('section.fut .fut-x').count(), 3);
            if (SHOTS) await page.locator('section.fut').screenshot({ path: path.join(SHOTS, '8j2-fundo-viva-o-teu-dinheiro.png') });
            // apagar o 1.º ano: o ano a ano começa no seguinte
            await page.click('section.fut .fut-x [data-act="fut-rm"] >> nth=0');
            await page.waitForFunction(() => window.__mk.cfg.fut.anos.length === 2, null, { timeout: 3000 });
            assert.deepEqual(await page.locator('section.fut .fut-anos tr td:first-child').allTextContents(), ['2026 (até hoje)', '2025']);
            // 4.59: «Desde (ano)» — com 2024, o 2024 (sem o valor de 31/12/2023) estima-se (≈): as UP de 31/12/2024 × o que o
            // valor da UP subiu; o gráfico começa a 31/12/2023
            const ds = page.locator('section.fut [data-fut="desde"]');
            await ds.fill('2024'); await ds.evaluate((e) => e.blur());
            await page.waitForFunction(() => (window.__mk.cfg.fut || {}).desde === 2024, null, { timeout: 3000 });
            await page.waitForFunction(() => document.querySelectorAll('section.fut .fut-anos tr').length === 3, null, { timeout: 3000 });
            const g24 = (9600 / 17.0496) * (17.0496 - 16.1857);
            assert.equal(sp(await page.locator('section.fut .fut-anos tr').nth(2).textContent()), sp(`2024≈ ${eur0(g24)}${pc1(17.0496 / 16.1857 - 1)}`), '2024 estimado');
            assert.match(await page.locator('section.fut .fut-est').textContent(), /as de 31\/12\/2024/);
            assert.match(sp(await page.locator('section.fut .sim-st').textContent()), /Ganho desde 2024≈ \+/);
            assert.equal(await page.locator('section.fut .sim-t').nth(2).textContent(), '12/2023');
            if (SHOTS) await page.locator('section.fut').screenshot({ path: path.join(SHOTS, '8j3-fundo-viva-desde-ano.png') });
            await ds.fill(''); await ds.evaluate((e) => e.blur());
            await page.waitForFunction(() => !('desde' in (window.__mk.cfg.fut || {})), null, { timeout: 3000 });
            await page.waitForFunction(() => document.querySelectorAll('section.fut .fut-anos tr').length === 2, null, { timeout: 3000 });
            await page.evaluate(() => { delete window.__mk.cfg.fut.anos; window.__mk.render(); });
            await page.waitForSelector('section.fut .fut-sem');
            console.log('✓ Fundo Viva: o teu dinheiro ano a ano (os teus anos da declaração) e o ganho por ano');
        }
        if (SHOTS) await page.locator('section.fut').screenshot({ path: path.join(SHOTS, '8j-carteira-fundo-viva.png') });
        console.log('✓ Fundo Viva: as tuas UP × o valor da UP da Futuro; este ano, o ano passado e o gráfico');
        // 4.52: o simulador para o PPR ou o Fundo Viva — cada um com os seus valores; os dos ativos ficam como estavam
        const ativos0 = await page.evaluate(() => { const c = window.__mk.cfg; return [c.simBudget, c.simStart, c.simYears]; });
        await page.waitForSelector('.sim .sim-alvo [data-v="ppr"]');
        assert.deepEqual(await page.locator('.sim .sim-alvo button').allTextContents(), ['Ativos', 'PPR', 'Fundo Viva']);
        await page.click('.sim .sim-alvo [data-v="ppr"]');
        await page.waitForSelector('.sim .sim-alvo [data-v="ppr"].on');
        const vP = await page.evaluate(() => window.__mk.pprAtivos().reduce((a, x) => a + x.px * x.b.reduce((q, r) => q + r[2], 0), 0));
        assert.equal(await page.locator('.sim [data-out="simStart"]').textContent(), eurT(Math.round(vP)), 'já tens: o PPR de hoje');
        assert.equal(await page.locator('.sim [data-out="simBudget"]').textContent(), eurT(60), 'por mês: o prémio do PPR');
        assert.match(await page.locator('.sim .sim-split').textContent(), /30 % Proteção · 70 % Dinâmico/);
        assert.match(await page.locator('.sim .sim-st').textContent(), /Imposto no resgate \(8 %\)/);
        await page.click('.sim [data-act="sim-step"][data-k="simBudget"][data-d="50"]');
        await page.waitForFunction(() => ((window.__mk.cfg.simX || {}).ppr || {}).simBudget === 110, null, { timeout: 3000 });
        await page.click('.sim .sim-alvo [data-v="viva"]');
        await page.waitForSelector('.sim .sim-alvo [data-v="viva"].on');
        assert.equal(await page.locator('.sim [data-out="simStart"]').textContent(), eurT(Math.round(567.3069 * 18.3484)), 'já tens: o Fundo Viva de hoje');
        assert.equal(await page.locator('.sim .sim-st small').count(), 3, 'sem imposto');
        await page.click('.sim .sim-alvo [data-v="ativos"]');
        assert.deepEqual(await page.evaluate(() => { const c = window.__mk.cfg; return [c.simBudget, c.simStart, c.simYears]; }), ativos0, 'os dos ativos ficam como estavam');
        if (SHOTS) await page.locator('.sim').screenshot({ path: path.join(SHOTS, '8k-simulador-alvos.png') });
        console.log('✓ simulador: os ativos, o PPR ou o Fundo Viva, cada um com os seus valores');
    }
    // o plano mensal junta-se sozinho depois do ponto de partida (90 €/mês do Bitcoin, no dia 2)
    await page.evaluate(() => { const c = window.__mk.cfg; Object.assign(c, { cryptoPct: 10, cryptoMix: 'btc', saveDays: [2] }); c.lots['c:BTC'].at = new Date(Date.now() - 70 * 864e5).toISOString().slice(0, 10); window.__mk.render(); });
    await page.waitForSelector('.reg-i:has-text("plano (estimado)")');
    const nPlano = await page.locator('.reg-i:has-text("plano (estimado)")').count();
    assert.ok(nPlano >= 2 && nPlano <= 3, 'execuções do plano em 70 dias: ' + nPlano);
    if (SHOTS) { await page.locator('.reg').scrollIntoViewIfNeeded(); await page.locator('.reg').screenshot({ path: path.join(SHOTS, '8f-carteira-registar.png') }); }
    // mudar a quantidade à mão: é o novo ponto de partida (o que se juntou fica lá dentro)
    await page.evaluate(() => { const i = document.querySelector('[data-lot="qty"][data-k="c:BTC"]'); i.value = '0,05'; i.dispatchEvent(new Event('change', { bubbles: true })); });
    bL = await btcL();
    assert.deepEqual([bL.qty, bL.compras.length, bL.at], [0.05, 0, isoAtras(0)], 'a quantidade nova manda e recomeça hoje');
    console.log('✓ registar: compra só com os euros, acerto com a TR, ✕, o plano sozinho e a quantidade nova como ponto de partida');
    await page.evaluate(() => { for (const k of ['c:BTC', 'c:SOL']) { delete window.__mk.cfg.lots[k].qty; delete window.__mk.cfg.lots[k].avg; delete window.__mk.cfg.lots[k].cost; delete window.__mk.cfg.lots[k].qd; } delete window.__mk.cfg.lots['VWCE.DE']; window.__mk.render(); });
    // o simulador parte da carteira (com quantidades): «Já tens (a tua carteira)»; o − passa a valor à mão
    await page.fill('#lot-imp', 'VWCE.DE 2 150');
    await page.click('[data-act="lot-import"]');
    await page.evaluate(() => window.__mk.render());
    assert.match(await page.locator('.sim [data-out="simStart"]').evaluate((e) => e.previousElementSibling.textContent), /Já tens \(a tua carteira\)/);
    await page.click('.sim [data-act="sim-step"][data-k="simStart"][data-d="-1000"]');
    assert.equal(await page.evaluate(() => window.__mk.cfg.simStartManual), true);
    // o «Por mês» do simulador é só do simulador: não muda o plano dos Ajustes
    const planoAntes = await page.evaluate(() => window.__mk.cfg.budget);
    await page.click('.sim [data-act="sim-step"][data-k="simBudget"][data-d="50"]');
    assert.equal(await page.evaluate(() => window.__mk.cfg.budget), planoAntes, 'o plano fica como estava');
    assert.equal((await page.locator('.sim [data-out="simBudget"]').textContent()).replace(/\s/g, ' '), `${planoAntes + 50} €`, 'o simulador mexe no seu');
    // o botão repõe a carteira e o plano de uma vez
    assert.match(await page.locator('.sim [data-act="sim-carteira"]').textContent(), /Usar a tua carteira e o teu plano/);
    await page.click('[data-act="sim-carteira"]');
    assert.equal(await page.evaluate(() => window.__mk.cfg.simStartManual), false, 'volta a seguir a carteira');
    assert.equal((await page.locator('.sim [data-out="simBudget"]').textContent()).replace(/\s/g, ' '), `${planoAntes} €`, 'volta ao plano');
    assert.equal(await page.locator('.sim [data-act="sim-carteira"]').count(), 0, 'sem diferenças, sem botão');
    await page.evaluate(() => { delete window.__mk.cfg.lots['VWCE.DE']; window.__mk.cfg.simStart = 0; window.__mk.render(); });
    // a carteira conta sempre em euros (o preço médio da TR é em euros), também com «Moeda local» nos Ajustes
    await page.evaluate(() => { window.__mk.cfg.eur = false; });
    await page.fill('#lot-imp', 'NVDA 1 150');
    await page.click('[data-act="lot-import"]');
    await page.evaluate(() => window.__mk.render());
    const nvEur = await page.evaluate(() => Math.round(window.__mk.Q.NVDA.price / window.__mk.Q['EURUSD=X'].price));
    const nvJa = await page.locator('.sim [data-out="simStart"]').textContent();
    assert.equal(nvJa.replace(/\D/g, ''), String(nvEur), `a NVDA em euros na Carteira (${nvJa}; esperado ${nvEur} €)`);
    await page.evaluate(() => { const c = window.__mk.cfg; delete c.lots.NVDA; c.holdings = c.holdings.filter((k) => k !== 'NVDA'); c.eur = true; window.__mk.render(); });
    // o que tem hoje, sem plano: o Ether com quantidade e investido (sem data)
    const lot = (k, campo, v) => page.evaluate(([k, campo, v]) => { const i = document.querySelector(`[data-lot="${campo}"][data-k="${k}"]`); i.value = v; i.dispatchEvent(new Event('change', { bubbles: true })); }, [k, campo, v]);
    await lot('c:ETH', 'qty', '0,5'); await lot('c:ETH', 'avg', '2 400');
    assert.deepEqual(await page.evaluate(() => [window.__mk.cfg.lots['c:ETH'].qty, window.__mk.cfg.lots['c:ETH'].cost]), [0.5, 1200], 'a vírgula e o espaço do teclado do iPhone; o investido = quantidade × preço médio');
    await page.waitForSelector('.real .real-l .row[data-open="c:ETH"]');
    assert.equal(await page.locator('.real svg').count(), 0, 'sem data no Ether: sem gráfico');
    // o prazo de cada ativo (4.25): por omissão longo no que tem; muda a decisão e vai para o conector (para o Claude)
    assert.equal(await page.locator('select[data-lot="hz"][data-k="c:ETH"]').inputValue(), 'long');
    const n0 = lotPosts.length;
    await lot('c:ETH', 'hz', 'short');
    assert.deepEqual(await page.evaluate(() => [window.__mk.cfg.lots['c:ETH'].hz, window.__mk.decIn('c:ETH').hz, window.__mk.decIn('VWCE.DE').hz]), ['short', 'short', 'long']);
    for (let i = 0; i < 40 && !(lotPosts.length > n0 && lotPosts.at(-1)['c:ETH'] && lotPosts.at(-1)['c:ETH'].hz === 'short'); i++) await page.waitForTimeout(250);
    assert.equal(lotPosts.at(-1)['c:ETH'].hz, 'short', 'o prazo vai para o conector');
    assert.equal(lotPosts.at(-1)['VWCE.DE'].hz, 'long', 'o que tem e não mudou vai como longo');
    assert.ok(planoPosts.length && Number.isFinite(planoPosts.at(-1).budget), 'o valor do plano (Ajustes) vai com as compras');
    if (SHOTS) { await page.locator('.real-ed').evaluate((d) => { d.open = true; }); await page.locator('.real-ed').screenshot({ path: path.join(SHOTS, '8e-carteira-editor.png') }); }
    await lot('c:ETH', 'hz', 'long');
    await lot('c:ETH', 'qd', isoAtras(500));
    await page.waitForSelector('.real svg');
    if (SHOTS) await page.locator('.real').screenshot({ path: path.join(SHOTS, '8c-carteira-real.png') });
    console.log('✓ carteira real:', (await page.locator('.real .sim-big').textContent()).replace(/\s+/g, ' ').trim());
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, '8-carteira.png'), fullPage: true });
    await page.evaluate((b) => { Object.assign(window.__mk.cfg, { budget: b, simGoal: 0, simYears: 20 }); delete window.__mk.cfg.lots['VWCE.DE']; delete window.__mk.cfg.lots['c:ETH']; }, orc0);
    await page.click('#mk-nav [data-tab="ajustes"]');
    const firstW = await page.evaluate(() => window.__mk.cfg.watch[0]), secondW = await page.evaluate(() => window.__mk.cfg.watch[1]);
    await page.click(`[data-mv="${secondW}"][data-dir="top"]`);
    assert.deepEqual(await page.evaluate(() => window.__mk.cfg.watch.slice(0, 2)), [secondW, firstW], '⤒ põe no topo');
    // arrastar pela pega: a 4.ª linha de ações vai para o 1.º lugar
    const w4 = await page.evaluate(() => window.__mk.cfg.watch.slice(0, 4));
    const hb = await page.locator(`.wl-i[data-wk="${w4[3]}"] .wl-h`).boundingBox();
    const tb = await page.locator(`.wl-i[data-wk="${w4[0]}"]`).boundingBox();
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
    await page.mouse.down();
    for (let i = 1; i <= 8; i++) await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2 + (tb.y + 4 - hb.y - hb.height / 2) * i / 8);
    await page.mouse.up();
    assert.deepEqual(await page.evaluate(() => window.__mk.cfg.watch.slice(0, 4)), [w4[3], w4[0], w4[1], w4[2]], 'arrastar pela pega muda a ordem');
    await page.click(`[data-mv="${secondW}"][data-dir="top"]`);
    assert.equal(await page.evaluate(() => window.__mk.cfg.sort), 'mine');
    await page.click('#mk-nav [data-tab="painel"]');
    assert.equal(await page.locator(stockSec + ' .row').first().getAttribute('data-key'), secondW, 'Painel segue a minha ordem');
    await page.click(stockSec + ' [data-sort="up"]');
    console.log('✓ ordenar ações: desce, bolsa (' + grps.length + ' grupos), minha ordem');
    console.log('✓ painel: Brent', brent, '| 1.ª ação', firstStock);
    const firstSec = await page.locator('#mk-body .sec h2').first().textContent();
    assert.equal(firstSec, 'Os meus ativos', 'os meus ativos em primeiro');
    assert.equal(await page.locator('.sec:has(h2:text("Os meus ativos")) .row').count(), 5, 'VWCE + 4 cripto');
    // "Hoje": a análise do Claude e o resumo num só cartão, compacto: as 3 linhas do Claude e a próxima execução à vista;
    // o resto numa dobra, fechada até se tocar (como as outras linhas que abrem)
    await page.waitForSelector('.today .tldr', { timeout: 15000 });
    assert.equal(await page.locator('details.today[open]').count(), 0, 'compacto: fechado');
    assert.ok(await page.locator('.today > summary .tldr').isVisible(), 'as 3 linhas do Claude à vista');
    // a próxima execução: quando é e quanto leva; os valores por ativo só nos dias de agir (estão no plano, na dobra)
    assert.match(await page.locator('.today > summary .hj-ex').textContent(), /^(Próxima execução: .+ · 900\s€|(Hoje executam os planos|Hoje é o último dia para ajustar os planos): .+810\s€ FTSE All-World USD \(Acc\) \+ 90\s€ Bitcoin)$/, 'e a próxima execução, com o total');
    assert.equal(await page.locator('.claude, .brief, .ideas.cl').count(), 0, 'sem cartões repetidos');
    assert.match(await page.locator('.today > summary').textContent(), /Hoje/);
    assert.equal(await page.locator('.today .i-h:has-text("Plano do mês")').count(), 1, 'um só plano do mês');
    assert.equal(await page.locator('.today .note').count(), 0, 'sem parágrafos a explicar no cartão');
    await page.waitForSelector('.today .i-h:has-text("Agenda")', { state: 'attached' });
    await page.click('.today > summary');
    assert.equal(await page.locator('details.today[open]').count(), 1, 'abre ao tocar');
    assert.match(await page.locator('.today').textContent(), /Nvidia: apresenta resultados/);
    console.log('✓ agenda no Hoje:', (await page.locator('.today .i-blk:has-text("Agenda") .idea').allTextContents()).length, 'eventos');
    // fora do que tem: as ideias de maior convicção do Claude (compras e vendas)
    assert.match(await page.locator('.today .i-blk:has-text("Também a seguir") .idea').first().textContent(), /^Nvidia[\s\S]*Comprar aos poucos$/);
    await page.click('.today .i-blk:has-text("Agenda") button.idea:has-text("Nvidia")');
    await page.waitForSelector('.advice .adv-ev');
    assert.match(await page.locator('.advice .adv-ev').textContent(), /Resultados daqui a 5 dias/);
    await page.click('[data-act="close"] >> nth=-1');
    await page.waitForFunction(() => document.querySelector('#mk-sheet').hidden);
    console.log('✓ aviso de resultados no conselho');
    assert.match(await page.locator('.today').textContent(), /manter o plano no VWCE/);
    assert.match(await page.locator('.today > summary .hj-src').textContent(), /^Claude · (\d\d\/\d\d )?\d\d:\d\d( · atrasada)?$/, 'de onde vem: o Claude e a hora');
    assert.equal(await page.locator('.today .plan-blk .idea').count(), 2, 'plano do Claude');
    assert.match(await page.locator('.sec:has(h2:text("Os meus ativos")) .row[data-key="c:BTC"] .badge').textContent(), /^Manter$/, 'conselho do Claude no ativo: tenho-o, por isso Manter (e não Aguardar)');
    assert.equal(await page.locator('.sec:has(h2:text-is("Cripto"))').count(), 0, 'cripto que tenho não se repete');
    assert.equal(await page.locator('#mk-body h1.pg-t').textContent(), 'Painel');
    console.log('✓ Hoje: análise do Claude + plano | conselho nos meus ativos');
    assert.equal(await page.locator('.today .tldr .tl').count(), 3, 'resumo em 3 linhas');
    assert.match(await page.locator('.today .tldr').textContent(), /Hoje: nada a fazer/);
    assert.equal(await page.locator('.today .tldr .tl b').first().textContent(), 'Mercado:', 'a etiqueta de cada linha a negro');
    // o Cripto hoje e o Agora estão nos Destaques (conferidos lá), não no Painel
    assert.equal(await page.locator('#mk-body .sec:has(h2:text-is("Cripto hoje")), #mk-body .sec:has(h2:text-is("Agora")), #mk-body .cg, #mk-body .now-box').count(), 0, 'sem o Cripto hoje nem o Agora');
    console.log('✓ resumo em 3 linhas; o Cripto hoje e o Agora fora do Painel');
    // ao vivo: cada preço da Binance entra no gráfico do dia
    const tail0 = await page.evaluate(() => { const s = window.__mk.Q['c:BTC'].series; return s[s.length - 1][0]; });
    await page.waitForFunction((t0) => { const s = window.__mk.Q['c:BTC'].series; return s[s.length - 1][0] > t0; }, tail0, { timeout: 15000 });
    console.log('✓ gráfico do dia recebe os preços ao vivo');
    assert.match(await page.locator('.today .i-blk:has-text("Porque sobem ou descem")').textContent(), /Tesla[\s\S]*resultados abaixo do esperado/, 'motivo do movimento no Hoje');
    // letra: texto principal ≥ 16 px e notas ≥ 12,5 px (no iPhone a base é 17 px, aqui é 16 px)
    const fsz = await page.evaluate(() => Object.fromEntries([['nome', '.row .r-name'], ['nota', '.note'], ['título', 'h1.pg-t'], ['secção', '.sec-h h2']].map(([n, q]) => [n, parseFloat(getComputedStyle(document.querySelector(q)).fontSize)])));
    assert.ok(fsz.nome >= 16 && fsz.nota >= 12.5 && fsz['título'] >= 30, JSON.stringify(fsz));
    console.log('✓ tamanhos de letra (px):', JSON.stringify(fsz));
    const narrow = await page.evaluate(() => [...document.querySelectorAll('.sec .row')].filter((r) => r.offsetParent).map((r) => [r.dataset.key, Math.round(r.querySelector('.r-main').getBoundingClientRect().width)]).filter(([, w]) => w < 100));
    assert.deepEqual(narrow, [], 'nome com espaço suficiente nas linhas: ' + JSON.stringify(narrow));
    const fund = await page.locator('.row[data-key="VWCE.DE"] .px').first().textContent();
    assert.match(fund, /163,80\s*€/, 'fundo com o preço da noite (Munique): ' + fund);
    // a variação é face ao fecho da Xetra (165,98 € a −2,28 % → 169,85 €): o «fecho anterior» de Munique no Yahoo não é de fiar
    assert.match(await page.locator('.row[data-key="VWCE.DE"] .chg').first().textContent(), /−3,56%/, 'variação face ao fecho da Xetra');
    // mais tarde, Düsseldorf (aberta até às 22 h) tem o negócio mais recente: o preço passa a ser o dela
    await page.evaluate(() => { const Q = window.__mk.Q, m = Q['VWCE.MU']; Q['VWCE.DU'] = { ...m, symbol: 'VWCE.DU', price: 164.5, prevClose: 170.9, time: m.time + 600, series: m.series.concat([[m.time + 600, 164.5]]) }; window.__mk.render(); });
    assert.match(await page.locator('.row[data-key="VWCE.DE"] .px').first().textContent(), /164,50\s*€/, 'o negócio mais recente (Düsseldorf)');
    assert.match(await page.locator('.row[data-key="VWCE.DE"] .chg').first().textContent(), /−3,15%/, 'continua face ao fecho da Xetra');
    await page.evaluate(() => { delete window.__mk.Q['VWCE.DU']; window.__mk.render(); });
    // ficha do VWCE: gráfico do dia = o do Painel (Munique), e no mês o "no período" bate com o número de cima
    await page.locator('.row[data-open="VWCE.DE"]').first().click();
    await page.waitForFunction(() => document.querySelector('#d-load') && document.querySelector('#d-load').hidden);
    // a ficha refaz o HTML quando chega a análise: espera pela dica do desenho novo
    await page.waitForFunction(() => /Último preço/.test((document.querySelector('#d-tip') || {}).textContent || ''), null, { timeout: 5000 }).catch(() => {});
    assert.match(await page.locator('#d-tip').textContent(), /Último preço (de ontem )?às \d\d:\d\d/, 'ficha: hora do último preço');
    // gráfico do dia dos fundos: Xetra (denso) + Munique depois do fecho da Xetra
    const md = await page.evaluate(() => { const t0 = Math.floor(new Date().setHours(9, 0, 0, 0) / 1000); const x = Array.from({ length: 10 }, (_, i) => [t0 + i * 300, 160 + i]); const g = [[t0 + 600, 161], [t0 + 9 * 3600, 170], [t0 + 12 * 3600, 171]]; return window.__mk.mergeDay(x, g).map((p) => p[1]); });
    assert.deepEqual(md, [160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171], 'Xetra até ao fecho e depois Munique');
    const dayEnd = await page.evaluate(() => { const mk = window.__mk; const s = mk.Q['VWCE.MU'].series; return [s[s.length - 1][1], mk.Q['VWCE.MU'].price]; });
    assert.ok(Math.abs(dayEnd[0] - dayEnd[1]) < 0.01, 'gráfico do dia acaba no preço de Munique');
    await page.click('.ranges [data-range="1mo"]');
    await page.waitForFunction(() => /No período/.test(document.querySelector('#d-tip').textContent));
    const top = (await page.locator('#d-px .chg').textContent()).trim();
    const per = (await page.locator('#d-tip .up-t, #d-tip .down-t, #d-tip .flat-t').first().textContent()).trim();
    assert.equal(per, top, 'no período = variação de cima');
    assert.doesNotMatch(await page.locator('#d-px .alt').textContent(), /-\d|,\d{3}\s*€/, 'diferença com sinal − e 2 casas');
    console.log('✓ ficha VWCE: 1 mês', top, '| diferença', (await page.locator('#d-px .alt').textContent()).trim());
    await page.click('[data-act="close"] >> nth=-1');
    await page.waitForFunction(() => document.querySelector('#mk-sheet').hidden);
    // preço que não é ao vivo: mostra a hora (ou o dia) do último preço; a cripto ao vivo não
    assert.deepEqual(await page.locator('#mk-body > details.pn-f > summary .f-t').evaluateAll((els) => els.map((e) => e.firstChild.textContent)), ['Índices, câmbio e ouro', 'Petróleo e energia', 'Combustíveis em Portugal'], 'no fim, fechados');
    assert.equal(await page.locator('#mk-body > details.pn-f[open]').count(), 0, 'todos fechados');
    assert.match(await page.locator('details[data-fold="pn-idx"] > summary small').textContent(), /^S&P 500 [−+]\d+,\d\d% · Nasdaq [−+]\d+,\d\d% · Euro Stoxx 50 [−+]\d+,\d\d%$/, 'uma linha de resumo');
    assert.match(await page.locator('details[data-fold="pn-fuel"] > summary small').textContent(), /^Gasóleo simples 1,599\s€ · Gasolina simples 95 1,739\s€$/);
    assert.equal(await page.evaluate(() => [...document.querySelectorAll('#mk-body .note, #mk-body p')].filter((e) => !e.closest('details')).length), 0, 'sem parágrafos a explicar');
    const tIdx = await page.locator('details[data-fold="pn-idx"] .row .r-t').first().textContent();
    assert.match(tIdx, /^\d{1,2}:\d{2}$|^\d{1,2}\/\d{1,2}$|^ontem$/, 'hora do último preço: ' + tIdx);
    assert.equal(await page.locator('.row[data-key="c:BTC"] .r-t').count(), 0, 'cripto ao vivo sem hora');
    const nv = await page.locator('.row[data-key="NVDA"] .px').first().textContent();
    assert.match(nv, /€/, 'ações americanas em euros: ' + nv);
    assert.match(await page.locator('.row[data-key="NOVO-B.CO"] .px').first().textContent(), /€/, 'coroas dinamarquesas em euros');
    console.log('✓ fundos e euros: VWCE', fund, '| Nvidia', nv);
    // a carteira no topo do Painel (as quantidades registadas na Carteira): o valor, o ganho, o de hoje e a linha desenhada
    // (as quantidades de teste: o que tem no FTSE All-World, no Bitcoin e na Solana, com o investido)
    const lots0 = await page.evaluate(() => {
        const mk = window.__mk, o = mk.cfg.lots;
        mk.cfg.lots = { 'VWCE.DE': { plan: '', buys: [], qty: 25.31, cost: 3800, qd: '2025-06-02' }, 'c:BTC': { plan: '', buys: [], qty: 0.0412, cost: 3200, qd: '2025-07-01' }, 'c:SOL': { plan: '', buys: [], qty: 12, cost: 1500, qd: '2025-08-01' } };
        mk.render(); window.scrollTo(0, 0); return o;
    });
    await page.waitForSelector('.pf svg.pf-sv path.pf-l');
    // (desenhado e lido no mesmo instante: a cripto muda de preço a cada segundo)
    // (o que tem hoje, como na TR: as unidades × o preço de agora; o ganho face ao investido)
    const pfVal = () => { const mk = window.__mk, a = mk.pfSnap().ativos.filter((x) => x.q > 0 && x.cost > 0 && x.px > 0); const v = a.reduce((s, x) => s + x.px * x.q, 0), e = a.reduce((s, x) => s + x.cost, 0); return { v, g: v - e, txt: mk.fmtPx(v, { decimals: 2 }, 'EUR') }; };
    const pfS = await page.evaluate((f) => { window.__mk.render(); const r = new Function('return (' + f + ')()')(); return { ...r, ecra: document.querySelector('.pf .pf-v').textContent }; }, pfVal.toString());
    assert.equal((await page.locator('#mk-body > section').first().locator('h2').textContent()), 'A minha carteira', 'a carteira primeiro');
    assert.equal(pfS.ecra, pfS.txt);
    // e ao vivo: com o preço do Bitcoin a mudar, o cartão acompanha (redesenhado sozinho, até 2 s depois)
    await page.waitForFunction(([t0, f]) => { const t = document.querySelector('.pf .pf-v').textContent; return t === new Function('return (' + f + ')()')().txt && t !== t0; }, [pfS.txt, pfVal.toString()], { timeout: 8000 }).catch(() => {});
    const vivo = await page.evaluate((f) => [document.querySelector('.pf .pf-v').textContent, new Function('return (' + f + ')()')().txt], pfVal.toString());
    assert.ok(vivo[0] !== pfS.txt || vivo[1] === pfS.txt, 'o cartão acompanha os preços ao vivo: ' + JSON.stringify([pfS.txt, vivo]));
    // 4.38.4: em cima, numa linha, só o de hoje (no 1D, sem o período; o ganho no total está no Total da tabela)
    assert.deepEqual(await page.locator('.pf .pf-st .pf-c small').allTextContents(), ['Hoje'], 'em cima, só o de hoje');
    assert.match((await page.locator('.pf .pf-st .pf-c').allTextContents()).join(' | '), /^Hoje[+−][\d\s ]+,\d\d\s€[+−]?\d+,\d\d%$/);
    assert.ok(await page.locator('.pf .pf-st').evaluate((e) => e.getBoundingClientRect().height < 26), 'numa linha');
    // 4.56: com o último preço do FTSE de há 3 dias (a bolsa fechada), o «Hoje» é só o que mexeu (a cripto) e diz «bolsa
    // fechada»; a linha do FTSE diz o dia da variação
    {
        const t3 = Math.floor(Date.now() / 1000) - 3 * 86400;
        const antes = await page.evaluate((t) => { const mk = window.__mk, v = []; for (const s of ['VWCE.DE'].concat(mk.REG['VWCE.DE'].live || [])) if (mk.Q[s]) { v.push([s, mk.Q[s].time]); mk.Q[s].time = t; } mk.cfg.perA = '1d'; mk.render(); return v; }, t3);
        await page.waitForSelector('.pf .pf-fech');
        const r = await page.evaluate(() => { const p = window.__mk.pfSnap(), f = p.ativos.find((a) => a.k === 'VWCE.DE'), h = p.ativos.reduce((s, a) => (Number.isFinite(a.ch) && a.ch > -100 && a.q > 0 ? s + a.q * a.px - (a.q * a.px) / (1 + a.ch / 100) : s), 0);
            return { ch: f.ch, fech: p.fech, h, txt: document.querySelector('.pf .pf-st .pf-c b').textContent, dia: (document.querySelector('.row[data-key="VWCE.DE"] .chg-dia') || {}).textContent }; });
        assert.equal(r.ch, 0, 'o FTSE não mexeu hoje');
        assert.equal(r.fech, 1);
        const eurS = (x) => (x >= 0 ? '+' : '−') + new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(Math.abs(x));
        assert.equal(r.txt.replace(/\s/g, ' '), eurS(r.h).replace(/\s/g, ' '), 'o «Hoje» é a soma do que mexeu hoje');
        assert.equal(r.dia, ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'][new Date(t3 * 1000).getDay()], 'a linha diz o dia');
        // com o preço de agora (a bolsa aberta), volta a contar no «Hoje», sem «bolsa fechada» nem o dia na linha
        await page.evaluate(() => { const mk = window.__mk, t = Math.floor(Date.now() / 1000); for (const s of ['VWCE.DE'].concat(mk.REG['VWCE.DE'].live || [])) if (mk.Q[s]) mk.Q[s].time = t; mk.render(); });
        await page.waitForFunction(() => !document.querySelector('.pf .pf-fech'), null, { timeout: 3000 });
        assert.ok(await page.evaluate(() => { const f = window.__mk.pfSnap().ativos.find((a) => a.k === 'VWCE.DE'); return Number.isFinite(f.ch) && f.ch !== 0; }), 'o FTSE volta a contar');
        assert.equal(await page.locator('.row[data-key="VWCE.DE"] .chg-dia').count(), 0, 'sem o dia');
        await page.evaluate((v) => { const mk = window.__mk; for (const [s, t] of v) mk.Q[s].time = t; mk.render(); }, antes);
        console.log('✓ «Hoje» só com o que mexeu hoje (a bolsa fechada fica de fora) e o dia na linha');
    }
    // o ganho do FTSE e o da cripto numa linha; o gráfico desde a primeira compra com o investido
    // a tabela da carteira (4.38): o investido, o valor e o ganho de cada ativo (em euros sem cêntimos), a soma da cripto com
    // as moedas debaixo dela e o total — o investido total é a soma do que custou cada um
    assert.deepEqual(await page.locator('.pf .pf-gs .pf-gh').evaluate((h) => [...h.children].map((c) => c.textContent)), ['', 'Investido', 'Vale', 'Ganho']);
    // 4.38.2: a cripto fechada numa linha (a soma); tocar abre as moedas — e fica aberta com os preços ao vivo —; outra vez, fecha
    const linhasPf = () => page.locator('.pf .pf-gs .pf-gr').evaluateAll((rs) => rs.map((r) => [r.className, ...[...r.children].map((c) => c.textContent)]));
    assert.deepEqual((await linhasPf()).map((r) => [r[0], r[1]]), [['pf-gr', 'FTSE All-World'], ['pf-gr pf-gg', 'Cripto'], ['pf-gr pf-gt', 'Total']], 'a cripto fechada: uma linha');
    await page.click('.pf .pf-gg');
    const grs = await linhasPf();
    assert.deepEqual(grs.map((r) => [r[0], r[1]]), [['pf-gr', 'FTSE All-World'], ['pf-gr pf-gg on', 'Cripto'], ['pf-gr pf-ga', 'BTC'], ['pf-gr pf-ga', 'SOL'], ['pf-gr pf-gt', 'Total']], 'tocar abre as moedas');
    assert.equal(await page.evaluate(() => document.querySelector('#mk-nav [data-tab="painel"]').classList.contains('on')), true, 'tocar na tabela não sai do Painel');
    await page.evaluate(() => { document.querySelector('#mk-body > section.pf').dataset.antes = '1'; });
    await page.waitForFunction(() => { const s = document.querySelector('#mk-body > section.pf'); return s && !s.dataset.antes; }, null, { timeout: 8000 });
    assert.equal(await page.locator('.pf .pf-gg.on').count(), 1, 'e fica aberta quando o cartão se redesenha ao vivo');
    if (SHOTS) await page.locator('#mk-body > section.pf').screenshot({ path: path.join(SHOTS, '1d-carteira-aberta.png') });
    for (const r of grs) { assert.match(r[2], /^\d[\d\s ]*\s€$/, r.join(' | ')); assert.match(r[3], /^\d[\d\s ]*\s€$/); assert.match(r[4], /^[+−][\d\s ]+\s€ \([+−]?\d+,\d%\)$/); }
    const inv = await page.evaluate(() => { const mk = window.__mk, a = mk.pfSnap().ativos.filter((x) => x.q > 0 && x.cost > 0 && x.px > 0); return mk.fmtPx(a.reduce((t, x) => t + x.cost, 0), { decimals: 0 }, 'EUR'); });
    assert.equal(grs[grs.length - 1][2], inv, 'o investido total');
    assert.ok(await page.locator('.pf .pf-gs').evaluate((g) => g.scrollWidth <= g.clientWidth + 1 && g.getBoundingClientRect().right <= g.closest('.pf-cx').getBoundingClientRect().right), 'a tabela cabe no cartão (390 px)');
    await page.click('.pf .pf-gg');
    assert.deepEqual((await linhasPf()).map((r) => r[1]), ['FTSE All-World', 'Cripto', 'Total'], 'outra vez, fecha');
    console.log('✓ a tabela da carteira: investido, vale e ganho de cada um; investido total', inv, '| a cripto abre e fecha (e fica como a deixei, ao vivo)');
    // 4.39: «Tudo» — o cartão desde a 1.ª compra (como na Carteira), sem a casa do período (o ganho no total está no Total);
    // os meus ativos desde a 1.ª compra de cada um
    await page.click('.pf .pf-pe [data-per="all"]');
    await page.waitForFunction(() => /^(desde \d\d\/\d\d\/\d{4}|há 1 ano)(investido)?agora$/.test((document.querySelector('.pf .pf-cap') || {}).textContent || ''));
    const capTudo = await page.locator('.pf .pf-cap').textContent();
    assert.equal(await page.evaluate(() => window.__mk.cfg.per), 'all');
    assert.deepEqual(await page.locator('.pf .pf-st .pf-c small').allTextContents(), ['Hoje'], 'Tudo: sem a casa do período');
    assert.equal(await page.locator('.pf .pf-pe .seg.per button.on').textContent(), 'Tudo');
    assert.equal((await page.locator('.pf svg.pf-sv path.pf-l').getAttribute('d')).split('L').length, 60, 'a linha do valor desde o início: 60 pontos');
    assert.ok(await page.locator('.pf .pf-pe .seg.per').evaluate((e) => { const r = e.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && e.scrollWidth <= e.clientWidth + 1; }), 'os cinco botões cabem no ecrã');
    if (SHOTS) await page.locator('#mk-body > section.pf').screenshot({ path: path.join(SHOTS, '1e-carteira-tudo.png') });
    await page.click('.pf .pf-pe [data-per="1d"]');
    await page.waitForFunction(() => ((document.querySelector('.pf .pf-cap') || {}).textContent || '').startsWith('há 24 h'));
    console.log('✓ Tudo:', capTudo.replace(/(investido)?agora$/, ''));
    assert.equal(await page.locator('.pf .pf-ix').count(), 0, 'os índices ficam no Hoje e nas linhas fechadas');
    // ao abrir outra vez, a análise dos meus ativos aparece logo: o ano de fechos diários deles fica guardado no instantâneo
    const snapD = await page.evaluate(() => { const d = (JSON.parse(localStorage.getItem('mercados:snap') || '{}').D) || {}; return ['VWCE.DE', 'c:BTC', '^GSPC'].map((k) => (d[k] || []).length); });
    assert.ok(snapD.every((n) => n > 100), 'o histórico guardado: ' + snapD);
    // 4.44: no 1D o investido (8500 €) fica longe do valor (9711 €): a escala só com o valor, sem o tracejado
    assert.deepEqual(await page.locator('.pf svg.pf-sv').evaluate((sv) => [sv.dataset.esc, sv.querySelectorAll('path.pf-i').length]), ['valor', 0], 'o de hoje na escala dele');
    assert.equal(await page.locator('.pf .pf-cap').textContent(), 'há 24 hagora', 'o gráfico do período escolhido (1D)');
    assert.equal(await page.locator('.pf .pf-pe .seg.per button').count(), 5, 'o filtro do período no cartão (1D, 1S, 1M, 1A e Tudo)');
    // 4.41: os meus ativos com a sua barra (data-pera): mudá-la não mexe no cartão
    const barraA = '.sec:has(h2:text-is("Os meus ativos")) .sec-h .seg.per';
    assert.equal(await page.locator(barraA + ' button[data-pera]').count(), 5, 'a barra dos meus ativos (1D, 1S, 1M, 1A e 5A)');
    assert.equal(await page.locator(barraA + ' [data-pera="5y"]').textContent(), '5A', 'nos ativos, 5A (e não «Tudo»)');
    await page.click(barraA + ' [data-pera="1y"]');
    assert.deepEqual(await page.evaluate(() => [window.__mk.cfg.per || '1d', window.__mk.cfg.perA]), ['1d', '1y'], 'os meus ativos em 1A; o cartão fica no 1D');
    assert.equal(await page.locator('.pf .pf-cap').textContent(), 'há 24 hagora', 'o cartão continua no 1D');
    assert.equal(await page.locator(barraA + ' button.on').textContent(), '1A');
    await page.click(barraA + ' [data-pera="1d"]');
    assert.equal(await page.evaluate(() => window.__mk.cfg.perA), '1d');
    assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('#mk-body > section, #mk-body > details')].slice(0, 3).map((e) => (e.tagName === 'SECTION' ? e.querySelector('h2').textContent : e.dataset.fold))), ['A minha carteira', 'Os meus ativos', 'hoje'], 'a carteira, os meus ativos e depois a análise do Claude (o Hoje)');
    const pfLinha = await page.locator('.pf svg.pf-sv path.pf-l').getAttribute('d');
    assert.equal(pfLinha.split('L').length, 60, 'a linha do valor: 60 pontos');
    console.log('✓ a carteira no Painel:', pfS.txt, '| ganho', pfS.g.toFixed(2), '(as contas da Carteira)');
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, '1-painel.png') });
    // o dia e a noite: em Ajustes → Cores; em automático segue o iPhone (aqui, o modo do browser)
    const tema = () => page.evaluate(() => [document.documentElement.dataset.theme, getComputedStyle(document.body).backgroundColor, document.querySelector('meta[name="theme-color"]').getAttribute('content')]);
    assert.deepEqual(await tema(), ['dark', 'rgb(0, 0, 0)', '#000'], 'à noite (o iPhone em escuro): escuro');
    // o botão do topo do Painel: ☀︎ passa a dia, ☾ volta a noite
    // no iPhone a zona das horas (a faixa fixa do topo) tapa o que lá estiver: o botão fica logo abaixo dela
    const btTopo = await page.evaluate(() => { window.scrollTo(0, 0); const h = document.documentElement; h.style.setProperty('--safe-t', '54px'); const r = document.querySelector('#mk-body > .pg-tema').getBoundingClientRect(); h.style.removeProperty('--safe-t'); return Math.round(r.top); });
    assert.ok(btTopo >= 54, 'o botão do dia e da noite abaixo da zona das horas (no iPhone): começa em ' + btTopo + ' px');
    assert.equal(await page.locator('#mk-body > .pg-tema').getAttribute('data-thm'), 'light');
    // 4.38.2: e ao meio do título (com a faixa das horas de um iPhone, 47 px), dentro do ecrã
    const btLado = await page.evaluate(() => {
        document.documentElement.style.setProperty('--safe-t', '47px');
        const b = document.querySelector('#mk-body > .pg-tema').getBoundingClientRect(), t = document.querySelector('#mk-body > .pg-t').getBoundingClientRect();
        document.documentElement.style.removeProperty('--safe-t');
        return { desvio: Math.round(Math.abs((b.top + b.bottom) / 2 - (t.top + t.bottom) / 2)), dentro: b.right <= innerWidth };
    });
    assert.ok(btLado.desvio <= 8 && btLado.dentro, 'o botão do dia e da noite ao meio do título: ' + JSON.stringify(btLado));
    await page.click('#mk-body > .pg-tema');
    assert.deepEqual(await tema(), ['light', 'rgb(255, 255, 255)', '#fff'], 'o botão do Painel: dia');
    // 4.37.3: a barra das horas do iPhone também clara de dia («default», horas a escuro) e a faixa por trás dela clara
    const barra = () => page.evaluate(() => [document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]').getAttribute('content'), getComputedStyle(document.body, '::before').backgroundColor]);
    // (aqui o browser está em escuro, como o iPhone em escuro: se ficar a barra antiga, as horas vêm a branco — a faixa preta)
    assert.deepEqual(await barra(), ['default', 'rgb(0, 0, 0)'], 'a barra de cima clara de dia; com o iPhone em escuro, a faixa preta');
    assert.equal(await page.locator('#mk-body > .pg-tema').getAttribute('data-thm'), 'dark');
    await page.click('#mk-body > .pg-tema');
    assert.deepEqual(await tema(), ['dark', 'rgb(0, 0, 0)', '#000'], 'e volta a noite');
    assert.deepEqual(await barra(), ['black-translucent', 'rgb(0, 0, 0)'], 'à noite a faixa preta, com as horas a branco');
    // 4.38.3: o botão mostra o modo (◐ automático, ☀ dia, ☾ noite, desenhado e na cor do texto) e passa ao seguinte; um aviso
    // diz qual ficou; e fica alinhado com a coluna da direita (o cartão da carteira)
    assert.equal(await page.locator('#mk-toast').textContent(), 'Cores: noite', 'o aviso do modo');
    assert.deepEqual(await page.locator('#mk-body > .pg-tema').evaluate((b) => [b.dataset.modo, b.dataset.thm, !!b.querySelector('svg'), getComputedStyle(b).color]), ['dark', 'auto', true, 'rgb(255, 255, 255)'], 'à noite: a lua, a branco; tocar passa a automático');
    await page.click('#mk-body > .pg-tema');
    assert.equal(await page.locator('#mk-toast').textContent(), 'Cores: automático (como o iPhone)');
    assert.deepEqual(await page.locator('#mk-body > .pg-tema').evaluate((b) => [b.dataset.modo, b.dataset.thm]), ['auto', 'light'], 'automático; tocar passa a dia');
    assert.equal(await page.evaluate(() => window.__mk.cfg.theme), 'auto');
    const alin = await page.evaluate(() => [document.querySelector('#mk-body > .pg-tema').getBoundingClientRect().right, document.querySelector('.pf .pf-cx').getBoundingClientRect().right]);
    assert.ok(Math.abs(alin[0] - alin[1]) <= 1, 'o botão alinhado à direita com o cartão da carteira: ' + alin);
    await page.evaluate(() => { window.__mk.cfg.theme = 'auto'; window.__mk.render(); });
    await page.click('#mk-nav [data-tab="ajustes"]');
    assert.equal(await page.locator('[data-thm="auto"].on').count(), 1, 'por omissão, automático');
    await page.click('[data-thm="light"]');
    assert.deepEqual(await tema(), ['light', 'rgb(255, 255, 255)', '#fff'], 'Dia: claro');
    assert.equal(await page.evaluate(() => window.__mk.cfg.theme), 'light');
    await page.click('#mk-nav [data-tab="painel"]');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForSelector('.pf svg.pf-sv');
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, '1-painel-dia.png') });
    // de dia lê-se tudo: em todos os separadores e na ficha, nenhum texto abaixo de 3:1 com o fundo (com DIA_LISTA=1, a
    // lista dos que ficam abaixo de 4,5:1)
    const baixos = {}, MINIMO = process.env.DIA_LISTA ? 4.5 : 3, fold0 = await page.evaluate(() => JSON.stringify(window.__mk.st.fold));
    for (const tab of ['painel', 'analise', 'destaques', 'carteira', 'ajustes']) {
        await page.click(`#mk-nav [data-tab="${tab}"]`);
        await page.waitForTimeout(200);
        await page.evaluate(() => document.querySelectorAll('#mk-body details').forEach((d) => { d.open = true; }));
        await page.waitForTimeout(100);
        baixos[tab] = await contraste(page, MINIMO, '#mk-body');
    }
    await page.click('#mk-nav [data-tab="painel"]');
    await page.locator('.row[data-open="PLTR"]:visible').first().click();
    await page.waitForFunction(() => !document.querySelector('#mk-sheet').hidden && document.querySelector('#d-load').hidden);
    await page.evaluate(() => document.querySelectorAll('#mk-sheet details').forEach((d) => { d.open = true; }));
    await page.waitForTimeout(300);
    baixos.ficha = await contraste(page, MINIMO, '#mk-sheet-card');
    await page.click('[data-act="close"] >> nth=-1');
    await page.waitForFunction(() => document.querySelector('#mk-sheet').hidden);
    await page.waitForTimeout(100);
    await page.evaluate((f) => { const s = window.__mk.st; Object.keys(s.fold).forEach((k) => delete s.fold[k]); Object.assign(s.fold, JSON.parse(f)); window.__mk.render(); }, fold0);
    if (process.env.DIA_LISTA) console.log(JSON.stringify(baixos, null, 1));
    else assert.deepEqual(baixos, { painel: [], analise: [], destaques: [], carteira: [], ajustes: [], ficha: [] }, 'de dia, textos que se leem mal');
    await page.click('#mk-nav [data-tab="ajustes"]');
    await page.click('[data-thm="auto"]');
    assert.deepEqual(await tema(), ['dark', 'rgb(0, 0, 0)', '#000'], 'automático com o iPhone em escuro');
    await page.emulateMedia({ colorScheme: 'light' });
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'light');
    assert.deepEqual(await tema(), ['light', 'rgb(255, 255, 255)', '#fff'], 'o iPhone passa a claro: a app acompanha');
    if (SHOTS) {
        // o topo como no iPhone (simulado): a zona das horas com 54 px, o véu claro que o iPhone põe por baixo das horas e
        // as horas a preto, como no ecrã do dono
        await page.click('#mk-nav [data-tab="painel"]');
        await page.evaluate(() => {
            window.scrollTo(0, 0);
            document.documentElement.style.setProperty('--safe-t', '54px');
            const s = document.createElement('div');
            s.id = 'sim-horas';
            s.style.cssText = 'position:fixed;z-index:99;left:0;right:0;top:0;height:54px;background:rgba(255,255,255,.52);display:flex;justify-content:space-between;align-items:center;padding:4px 30px 0 50px;font:600 17px system-ui,sans-serif;color:#000;pointer-events:none';
            s.innerHTML = '<span>9:41</span><span>▂▄▆ ▭</span>';
            document.body.appendChild(s);
        });
        await page.waitForTimeout(200);
        await page.screenshot({ path: path.join(SHOTS, '1c-painel-dia-topo.png'), clip: { x: 0, y: 0, width: 390, height: 420 } });
        await page.evaluate(() => { document.documentElement.style.removeProperty('--safe-t'); document.getElementById('sim-horas').remove(); });
        await page.click('#mk-nav [data-tab="ajustes"]');
    }
    assert.deepEqual(await barra(), ['default', 'rgb(255, 255, 255)'], 'e com o iPhone em claro a faixa das horas fica branca (as horas a preto)');
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
    await page.click('#mk-nav [data-tab="painel"]');
    console.log('✓ o dia e a noite: Automático (como o iPhone), Dia e Noite');
    await page.evaluate((o) => { window.__mk.cfg.lots = o; window.__mk.render(); }, lots0);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, '1b-painel-completo.png'), fullPage: true });

    // fora de horas: a Palantir negoceia antes da abertura (−20%): na linha, na ficha e no gráfico de hoje, mais claro; a SAP
    // (bolsa fechada, sem negócio fora de horas) leva a estimativa para a abertura — os futuros do S&P 500 caíram 1% desde o
    // fecho e ela mexe 1,2 vezes o S&P 500 — e aprende com cada abertura
    await page.waitForFunction(() => window.__mk.EXT.PLTR && window.__mk.S5['ES=F'] && window.__mk.deriv);
    await page.evaluate(() => window.__mk.render());
    const tagP = page.locator('.row[data-key="PLTR"] .r-t').first(), tagS = page.locator('.row[data-key="SAP.DE"] .r-t').first();
    if (SHOTS) { await tagP.scrollIntoViewIfNeeded(); await page.locator('.row[data-key="PLTR"]').first().screenshot({ path: path.join(SHOTS, '9a-linha-pre.png') }); }
    if (SHOTS) { // os índices, com os futuros
        const ix = page.locator('details[data-fold="pn-idx"]');
        await ix.evaluate((d) => { d.open = true; }); await ix.scrollIntoViewIfNeeded(); await ix.screenshot({ path: path.join(SHOTS, '9d-indices.png') }); await ix.evaluate((d) => { d.open = false; });
    }
    assert.equal(await tagP.textContent(), 'pré −20,0%');
    assert.equal(await tagP.getAttribute('class'), 'r-t down', 'na cor da descida');
    const beta = await page.evaluate(() => window.__mk.betaOf('SAP.DE'));
    assert.ok(beta && beta.us > 1 && beta.us < 1.4 && Math.abs(beta.jp) < 0.5 && beta.n === 120, 'a sensibilidade ao S&P 500 (1,2) e ao Nikkei (nenhuma): ' + JSON.stringify(beta));
    const tS = await tagS.textContent();
    assert.match(tS, /^abre ≈ −1,[0-4]%$/, 'a estimativa da SAP: ' + tS);
    assert.ok(await page.evaluate(() => window.__mk.pj.pend['SAP.DE'] && window.__mk.pj.pend['SAP.DE'].T === 1762300000), 'fica à espera da abertura');
    assert.match(await page.locator('.row[data-key="NVDA"] .r-t').first().textContent(), /^\d{1,2}:\d{2}$|^\d{1,2}\/\d{1,2}$|^ontem$/, 'sem negócio fora de horas e com a bolsa aberta: a hora');
    await page.locator('.row[data-open="PLTR"]:visible').first().click();
    await page.waitForFunction(() => !document.querySelector('#mk-sheet').hidden && document.querySelector('#d-load').hidden);
    await page.waitForTimeout(400);
    if (SHOTS) { await page.locator('#mk-sheet-card').screenshot({ path: path.join(SHOTS, '9b-ficha-pre.png') }); await page.locator('#d-cv').screenshot({ path: path.join(SHOTS, '9e-grafico.png') }); }
    assert.match(await page.locator('#d-ext').textContent(), /^Antes da abertura, às \d\d:\d\d: .+ −20,0%face ao último fecho, .+\(no gráfico de hoje, a linha mais clara\)$/);
    const cvx = await page.locator('#d-cv').boundingBox();
    await page.mouse.move(cvx.x + cvx.width - 4, cvx.y + cvx.height / 2);
    assert.match(await page.locator('#d-tip').textContent(), /· pré-abertura · −\d/, 'o fim do gráfico é o antes da abertura');
    await page.mouse.move(cvx.x + 4, cvx.y + cvx.height / 2);
    assert.doesNotMatch(await page.locator('#d-tip').textContent(), /pré-abertura/, 'o princípio é a sessão');
    await page.click('[data-act="close"] >> nth=-1');
    await page.waitForFunction(() => document.querySelector('#mk-sheet').hidden);
    // a SAP abriu a −1,5%: a estimativa fica registada; com 8 aberturas em que se confirmou metade, a correção e o erro
    const pj = await page.evaluate(() => {
        const mk = window.__mk, o = mk.pj.pend['SAP.DE'], q = mk.Q['SAP.DE'], s0 = q.series;
        q.series = [[o.T + 3600, o.base * 0.985]]; mk.pjResolve(); q.series = s0;
        const d = mk.pj.done.slice(-1)[0];
        for (let i = 0; i < 8; i++) mk.pj.done.push({ k: 'SAP.DE', p: -1, a: i % 2 ? -0.4 : -0.6, d: o.T - i * 86400 });
        mk.render();
        return { d, pend: !!mk.pj.pend['SAP.DE'], tag: document.querySelector('.row[data-key="SAP.DE"] .r-t').textContent, pr: mk.projOf('SAP.DE') };
    });
    assert.deepEqual([pj.d.k, pj.d.a, pj.d.p < -1 && pj.d.p > -1.4], ['SAP.DE', -1.5, true], 'a abertura registada: ' + JSON.stringify(pj.d));
    assert.ok(pj.pr.fac > 0.5 && pj.pr.fac < 0.7 && pj.pr.n === 9 && pj.pr.err > 0.05 && pj.pr.err < 0.4, 'a correção e o erro: ' + JSON.stringify(pj.pr));
    assert.match(pj.tag, /^abre ≈ −0,[6-9]%$/, 'corrigida: ' + pj.tag);
    await page.locator('.row[data-open="SAP.DE"]:visible').first().click();
    await page.waitForFunction(() => !document.querySelector('#mk-sheet').hidden && !document.querySelector('#d-ext').hidden);
    if (SHOTS) await page.locator('#mk-sheet-card').screenshot({ path: path.join(SHOTS, '9c-ficha-estimativa.png') });
    assert.match(await page.locator('#d-ext').textContent(), /^Abertura estimada: −0,\d% \(±0,\d%\)futuros do S&P 500 −1,0% × 0,\d\d · corrigida com 9 aberturas; erro médio nas últimas 9 aberturas: ±0,\d%$/);
    assert.match(await page.locator('#d-rng').textContent(), /^Intervalo provável \(2 em cada 3 vezes\): amanhã .+–.+ · 1 semana .+–.+ · 1 mês .+–.+pela volatilidade das opções: o VIX 17,2 × \d,\d\d \(o quanto mexe face ao S&P 500\)$/);
    await page.click('[data-act="close"] >> nth=-1');
    await page.waitForFunction(() => document.querySelector('#mk-sheet').hidden);
    await page.evaluate(() => { const mk = window.__mk; mk.pj.done.length = 0; delete mk.pj.pend['SAP.DE']; });
    // o gémeo: o iShares MSCI World (EUNL) com o URTH (o mesmo índice em Nova Iorque) a subir 1% depois do fecho daqui, com o
    // euro parado; depois do último negócio dele, os futuros do S&P 500
    const gem = await page.evaluate((T) => {
        const mk = window.__mk, q = mk.Q['EUNL.DE'], o = { open: q.open, time: q.time }, s5 = [mk.S5.URTH, mk.S5['EURUSD=X']];
        q.open = false; q.time = T;
        // (às mesmas horas que as séries do dia simuladas, para serem estas as que contam)
        mk.S5.URTH = [[T, 100], [T + 3600, 101]]; mk.S5['EURUSD=X'] = [[T, 1.15], [T + 3600, 1.15]];
        const pr = mk.projOf('EUNL.DE');
        mk.S5['EURUSD=X'] = [[T, 1.15], [T + 3600, 1.1615]]; // o euro sobe 1%: em euros o URTH fica igual
        const pe = mk.projOf('EUNL.DE');
        Object.assign(q, o); [mk.S5.URTH, mk.S5['EURUSD=X']] = s5;
        return { s: pr.tw.s, tw: pr.tw.pct, t1: pr.tw.t1, fes: pr.fes, p: pr.p, us: pr.us, twe: pe.tw.pct };
    }, 1762300000);
    assert.deepEqual([gem.s, +gem.tw.toFixed(4), gem.t1, +gem.fes.toFixed(3), Math.abs(gem.twe) < 0.001], ['URTH', 1, 1762303600, -0.901, true], 'o gémeo e os futuros a seguir: ' + JSON.stringify(gem));
    assert.ok(Math.abs(gem.p - (1 + gem.us * gem.fes)) < 1e-9, 'a estimativa: o gémeo mais os futuros pela sensibilidade');
    // o intervalo provável: o VIX nas ações e nos fundos, as opções da Deribit no Bitcoin e no Ether, a história no XRP
    const rgs = await page.evaluate(() => ['VWCE.DE', 'c:BTC', 'c:XRP'].map((k) => { const r = window.__mk.rangeOf(k), p = window.__mk.Q[k] && window.__mk.Q[k].price; return { k, src: r.src, h: r.h.map((x) => [x.l, x.lo < p || k === 'VWCE.DE', x.hi > x.lo]) }; }));
    assert.match(rgs[0].src, /^das opções: o VIX 17,2 × \d,\d\d/);
    assert.equal(rgs[1].src, 'das opções (Deribit): 52,6% ao ano');
    assert.match(rgs[2].src, /^dos últimos 120 dias: \d+,\d% ao ano$/);
    assert.deepEqual(rgs[1].h.map((x) => x[0]), ['amanhã', '1 semana', '1 mês']);
    const bw = await page.evaluate(() => window.__mk.rangeOf('c:BTC').h.map((x) => x.hi / x.lo));
    assert.ok(bw[0] < bw[1] && bw[1] < bw[2] && Math.abs(Math.log(bw[2]) / 2 - 0.526 * Math.sqrt(30 / 365)) < 1e-9, 'a largura cresce com a raiz do tempo: ' + bw);
    // a ficha do Bitcoin: os derivados (a base dos futuros e o funding) e o intervalo
    await page.locator('.row[data-open="c:BTC"]:visible').first().click();
    await page.waitForFunction(() => !document.querySelector('#mk-sheet').hidden && !document.querySelector('#d-ext').hidden && !document.querySelector('#d-rng').hidden);
    await page.waitForTimeout(300);
    if (SHOTS) await page.locator('#mk-sheet-card').screenshot({ path: path.join(SHOTS, '9f-ficha-bitcoin.png') });
    assert.equal(await page.locator('#d-ext').textContent(), 'Derivados (Deribit)futuros a 69 dias +1,0% sobre o preço à vista (+5,1% ao ano) · funding −0,004% por 8 h (mais alavancados a apostar na descida)');
    assert.match(await page.locator('#d-rng').textContent(), /pela volatilidade das opções \(Deribit\): 52,6% ao ano$/);
    assert.equal(await page.locator('#d-fan').count(), 0, 'sem o gráfico do «Para onde pode ir» (só os números)');
    await page.click('[data-act="close"] >> nth=-1');
    await page.waitForFunction(() => document.querySelector('#mk-sheet').hidden);
    // o FTSE All-World com a bolsa fechada: o VT caiu 1,5% em Nova Iorque depois do preço da noite e, depois dele, os futuros
    MOCK.fechado = true;
    await page.evaluate(() => window.__mk.pollYahoo());
    await page.waitForFunction(() => window.__mk.Q['VWCE.DE'].open === false && window.__mk.projOf('VWCE.DE'));
    const ft = await page.evaluate(() => { const pr = window.__mk.projOf('VWCE.DE'); return { tw: pr.tw && [pr.tw.s, +pr.tw.pct.toFixed(3)], fes: pr.fes, us: pr.us, p: pr.p }; });
    assert.deepEqual(ft.tw, ['VT', -1.5], 'o VT desde o preço da noite: ' + JSON.stringify(ft));
    assert.ok(ft.us > 0.55 && ft.us < 0.85 && ft.fes < -0.4 && ft.fes > -0.6, 'os futuros depois do VT, pela sensibilidade (0,7): ' + JSON.stringify(ft));
    await page.evaluate(() => window.__mk.render());
    const tagF = await page.locator('.row[data-key="VWCE.DE"] .r-t').first().textContent();
    assert.equal(tagF, `abre ≈ −${String(Math.abs(ft.p).toFixed(1)).replace('.', ',')}%`);
    // 4.60: a abertura estimada também no cartão da carteira, em cima — a do FTSE (com o lote dele), em % e em euros
    {
        const lot0 = await page.evaluate(() => { const mk = window.__mk, l = mk.cfg.lots['VWCE.DE']; mk.cfg.lots['VWCE.DE'] = { qty: 5.5, avg: 170, cost: 935, at: '2026-11-10' }; mk.render(); return l === undefined ? null : JSON.stringify(l); });
        await page.waitForSelector('.pf .pf-abre');
        const ab = await page.evaluate(() => { const mk = window.__mk, s = mk.pfSnap(), ks = mk.cfg.holdings.filter((k) => mk.REG[k] && mk.REG[k].kind !== 'crypto' && mk.projOf(k));
            return { abL: s.abL, abP: s.abP, el: document.querySelector('.pf .pf-abre').textContent, cls: document.querySelector('.pf .pf-abre').className, ks, p: mk.projOf('VWCE.DE').p }; });
        assert.equal(ab.el, ab.abL, 'à vista no cartão');
        assert.match(ab.abL, /^Abertura estimada: [+−]?\d,\d% \([+−]\d+\s€\)$/);
        if (ab.ks.length === 1) assert.ok(Math.abs(ab.abP - ab.p) < 1e-9, 'só o FTSE: a mesma % da linha dele');
        assert.match(ab.cls, ab.abP >= 0 ? /up-t/ : /down-t/);
        if (SHOTS) await page.locator('section.pf').screenshot({ path: path.join(SHOTS, '9g0-carteira-abertura.png') });
        await page.evaluate((l) => { const mk = window.__mk; if (l) mk.cfg.lots['VWCE.DE'] = JSON.parse(l); else delete mk.cfg.lots['VWCE.DE']; mk.render(); }, lot0);
        console.log('✓ a abertura estimada no cartão da carteira:', ab.abL);
    }
    await page.locator('.row[data-open="VWCE.DE"]:visible').first().click();
    await page.waitForFunction(() => !document.querySelector('#mk-sheet').hidden && !document.querySelector('#d-ext').hidden);
    await page.waitForTimeout(300);
    if (SHOTS) await page.locator('#mk-sheet-card').screenshot({ path: path.join(SHOTS, '9g-ficha-ftse.png') });
    assert.match(await page.locator('#d-ext').textContent(), /^Abertura estimada: −\d,\d% \(±\d,\d%\)VT \(o mesmo índice, em Nova Iorque\): −1,5% desde o último preço daqui, até às \d\d:\d\d \(em euros\) · depois, futuros do S&P 500 −0,5% × 0,\d\d · margem pela história do ativo; aprende com cada abertura$/);
    await page.click('[data-act="close"] >> nth=-1');
    await page.waitForFunction(() => document.querySelector('#mk-sheet').hidden);
    MOCK.fechado = false;
    await page.evaluate(() => window.__mk.pollYahoo());
    await page.waitForFunction(() => window.__mk.Q['VWCE.DE'].open === true);
    await page.evaluate(() => { const mk = window.__mk; delete mk.pj.pend['VWCE.DE']; mk.render(); });
    // a ficha num ecrã ×3 (o iPhone): ao mudar de período o gráfico continua a ocupar a área toda, e os 9 períodos cabem
    await page.evaluate(() => Object.defineProperty(window, 'devicePixelRatio', { value: 3, configurable: true }));
    await page.locator('.row[data-open="VWCE.DE"]:visible').first().click();
    await page.waitForFunction(() => !document.querySelector('#mk-sheet').hidden && document.querySelector('#d-load').hidden);
    for (const r of ['6mo', '1mo', '5y']) {
        await page.click(`.ranges [data-range="${r}"]`);
        await page.waitForFunction(() => document.querySelector('#d-load').hidden);
        await page.waitForTimeout(300);
        const tam = await page.evaluate(() => { const c = document.querySelector('#d-cv'); return [c.width, Math.round(c.clientWidth * 2), c.height, Math.round(c.clientHeight * 2)]; });
        assert.deepEqual([tam[0], tam[2]], [tam[1], tam[3]], `${r}: o gráfico na escala dele (não fica em 2/3 do canvas)`);
    }
    const linha = await page.evaluate(() => { const r = document.querySelector('.ranges').getBoundingClientRect(), b = [...document.querySelectorAll('.ranges button')].map((x) => x.getBoundingClientRect()); return [b.length, b.every((x) => x.right <= r.right + 0.5 && x.left >= r.left - 0.5)]; });
    assert.deepEqual(linha, [9, true], 'os 9 períodos cabem (o 5A à vista)');
    if (SHOTS) await page.locator('#mk-sheet-card').screenshot({ path: path.join(SHOTS, '9j-ficha-5anos-x3.png') });
    await page.evaluate(() => { delete window.devicePixelRatio; }); // volta a escala verdadeira deste ecrã
    await page.click('[data-act="close"] >> nth=-1');
    await page.waitForFunction(() => document.querySelector('#mk-sheet').hidden);
    console.log('✓ fora de horas: Palantir', await tagP.textContent(), '| SAP', tS, '→', pj.tag, '(β', beta.us.toFixed(2) + ') | FTSE All-World', tagF, '(VT −1,5% e futuros) | intervalos e derivados');

    // destaques: simples como a Análise — o sentimento numa linha (com os índices do dia), uma lista por secção com as
    // linhas do Painel (o porquê numa linha pequena: o motivo do Claude ou a notícia) e o resto em linhas fechadas no fim
    await page.click('#mk-nav [data-tab="destaques"]');
    await page.waitForFunction(() => document.querySelectorAll('.hl-row .hl-w').length >= 4);
    assert.equal(await page.locator('[data-lim]').count(), 0, 'sem filtros de ±X%');
    assert.deepEqual(await page.locator('#mk-body .sec-h h2').allTextContents(), ['Os meus ativos hoje', 'Mais sobem', 'Mais caem'], 'uma lista por secção');
    const mineH = await page.locator('.sec:has(h2:text-is("Os meus ativos hoje")) .row .r-name').allTextContents();
    assert.deepEqual(mineH, ['FTSE All-World USD (Acc)', 'Bitcoin', 'Ether', 'Solana', 'XRP'], 'os meus ativos, pela ordem dos Ajustes');
    const ups = await page.locator('.sec:has(h2:text-is("Mais sobem")) .row .r-name').allTextContents();
    const downs = await page.locator('.sec:has(h2:text-is("Mais caem")) .row .r-name').allTextContents();
    assert.deepEqual(ups.slice(0, 2), ['Allianz', 'Nvidia'], 'subidas: ' + ups);
    assert.deepEqual(downs.slice(0, 2), ['Tesla', 'TotalEnergies'], 'descidas: ' + downs);
    assert.ok(ups.length === 5 && downs.length === 5, 'cinco de cada lado');
    // o porquê numa linha pequena: o motivo do Claude (Tesla), com o ponto dele, ou a notícia do dia, com o da cor do tom
    assert.equal(await page.locator('.row[data-key="TSLA"] .r-sub').textContent(), 'Cai depois de resultados abaixo do esperado.');
    assert.equal(await page.locator('.row[data-key="TSLA"] .hl-w.cl').count(), 1);
    assert.match(await page.locator('.row[data-key="ALV.DE"] .hl-w').getAttribute('class'), /^hl-w (up|down|flat)$/);
    assert.match(await page.locator('.row[data-key="VWCE.DE"] .px').textContent(), /^163,80\s€$/, 'o preço da noite (Munique), como no Painel');
    assert.equal(await page.locator('.row[data-key="VWCE.DE"] .chg').textContent(), '−3,56%', 'e a variação do dia face ao fecho da Xetra');
    assert.equal(await page.evaluate(() => [...document.querySelectorAll('#mk-body .note')].filter((e) => !e.closest('details')).length), 0, 'sem parágrafos a explicar');
    // em cima o sentimento do mercado, com os índices do dia; no fim, fechados: o mercado dos EUA e a cripto hoje
    assert.match(await page.locator('details.hl-mood > summary').textContent(), /^Sentimento do mercadoS&P 500 [−+]?\d+,\d\d% · Nasdaq [−+]?\d+,\d\d% · Euro Stoxx [−+]?\d+,\d\d%(Otimista|Pessimista|Misto)$/);
    await page.waitForSelector('details[data-fold="hl-eua"] .row[data-key="XYZ"]', { state: 'attached' });
    assert.equal(await page.locator('details[data-fold="hl-eua"] > summary small').textContent(), 'Xyz Therapeutics +38,20% · Abcd Corp −22,50%');
    assert.equal(await page.locator('details[data-fold="hl-cripto"] > summary').textContent(), 'Cripto hojeMedo extremo · mercado −3,20% em 24 h24');
    // o medo e ganância nos últimos 90 dias: um gráfico com os 90 pontos
    assert.equal(await page.locator('details[data-fold="hl-cripto"] .fg-h polyline').evaluate((p) => p.getAttribute('points').trim().split(' ').length), 90);
    assert.equal(await page.locator('#mk-body details[open]').count(), 0, 'as linhas do fim fechadas');
    console.log('✓ destaques: sobem', ups.join(', '), '| caem', downs.join(', '));
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, '2-destaques.png') });
    // abrir uma linha do fim: fica aberta quando o ecrã se atualiza (preços ao vivo); uma da lista dos EUA abre a ficha
    await page.click('details[data-fold="hl-eua"] > summary');
    await page.evaluate(() => window.__mk.render());
    assert.equal(await page.locator('details[data-fold="hl-eua"][open]').count(), 1, 'fica aberta ao atualizar');
    await page.click('details[data-fold="hl-eua"] .row[data-open="XYZ"]');
    await page.waitForFunction(() => !document.querySelector('#mk-sheet').hidden && /Xyz Therapeutics/.test(document.querySelector('#mk-sheet-card').textContent));
    await page.click('[data-act="close"] >> nth=-1');
    await page.waitForFunction(() => document.querySelector('#mk-sheet').hidden);
    await page.click('details[data-fold="hl-eua"] > summary');
    assert.equal(await page.locator('details[data-fold="hl-eua"][open]').count(), 0, 'e volta a fechar');
    console.log('✓ destaques: o sentimento numa linha, o porquê do Claude ou da notícia, os EUA e a cripto fechados');

    assert.ok(await page.locator('details.hl-mood').isVisible(), 'sentimento do mercado nos Destaques');
    // análise: simples como a Trade Republic — o prazo, o filtro e UMA lista (a convicção do Claude pelo prazo; o que ele
    // não analisou no fim, com o sinal automático, marcado "auto"); o resto em linhas fechadas no fim
    await page.click('#mk-nav [data-tab="analise"]');
    await page.waitForSelector('.chips [data-filter="plan"].on');
    const lst = '.an-list';
    const planRows = await page.locator(lst + ' .row').evaluateAll((els) => els.map((e) => e.dataset.open));
    assert.ok(planRows.length >= 8 && planRows.every((k) => /^c:|\.DE$/.test(k)), 'filtro ETF + cripto: ' + planRows);
    assert.deepEqual(await page.locator('.seg.hz button').allTextContents(), ['Curto', 'Médio', 'Longo', 'Desconto'], 'prazos, sem subtítulos');
    assert.deepEqual(await page.locator('.chips[aria-label="Filtro"] button').allTextContents(), ['ETF + cripto', 'Tudo', 'ETF', 'Cripto', 'Ações'], 'filtros, sem os futuros');
    await page.click('.chips [data-filter="all"]');
    await page.click('.seg.hz [data-hz="mid"]');
    await page.waitForFunction(() => document.querySelectorAll('.an-list .row').length > 20);
    assert.equal(await page.locator('.hl-mood').count(), 0, 'sentimento só nos Destaques');
    assert.match(await page.locator('.an-src').textContent(), /^Claude · (\d\d\/\d\d )?\d\d:\d\d$/, 'de onde vem a lista, numa linha pequena');
    assert.equal(await page.locator('#mk-body .top3, #mk-body .medal, #mk-body h2').count(), 0, 'sem pódio nem títulos repetidos');
    assert.equal(await page.evaluate(() => [...document.querySelectorAll('#mk-body .note')].filter((e) => !e.closest('details')).length), 0, 'sem parágrafos a explicar (só dentro das linhas que abrem)');
    const rowsOf = (sel) => page.locator(sel).evaluateAll((els) => els.map((e) => [e.dataset.open, +e.querySelector('.r-score .val').textContent, !!e.querySelector('.an-auto')]));
    const desc = (a) => a.every((x, i) => !i || a[i - 1][1] >= x[1]);
    const rows = await rowsOf(lst + ' .row'), rowsCl = rows.filter((x) => !x[2]), rowsAuto = rows.filter((x) => x[2]);
    assert.deepEqual(rows.slice(0, 3).map((x) => x[0]), ['NVDA', 'ALV.DE', 'VWCE.DE'], 'primeiro a convicção do Claude a médio prazo');
    assert.ok(desc(rowsCl) && desc(rowsAuto), 'ordenada pela convicção do Claude e depois pelo algoritmo');
    assert.deepEqual(rowsAuto.map((x) => x[0]).sort(), ['RHM.DE', 'TSM', 'c:ETH', 'c:XRP'], 'o que o Claude não analisou fica no fim, com o sinal automático (auto)');
    assert.equal(rows.findIndex((x) => x[2]), rowsCl.length, 'os automáticos todos no fim');
    const order = rowsCl.map((x) => x[0]);
    assert.equal(order.indexOf('MSFT') + 1, order.indexOf('AAPL'), 'empate (76): decide a classificação do Claude');
    assert.ok(rows.every(([, v]) => v >= 0 && v <= 100));
    // cada linha como as do Painel: o ícone redondo, o nome, o símbolo e a variação do dia; à direita a pontuação e o veredicto
    const nvr = lst + ' .row[data-open="NVDA"]';
    assert.equal(await page.locator(nvr + ' .r-ico').evaluate((e) => e.outerHTML), await page.evaluate(() => window.__mk.ico('NVDA')), 'o ícone do Painel');
    assert.equal(await page.locator(nvr + ' .r-name').textContent(), 'Nvidia');
    assert.match(await page.locator(nvr + ' .r-sub').textContent(), /^NVDA · \+5,20%/, 'símbolo e variação do dia');
    assert.equal(await page.locator(nvr + ' .r-score .val').textContent(), '88');
    assert.equal(await page.locator(nvr + ' .lbl').textContent(), 'Comprar', 'família entrar, sem o ativo: Comprar');
    assert.match(await page.locator(nvr + ' .lbl').getAttribute('class'), /\bup-t\b/, 'o veredicto com a cor do tom');
    // ≠ algoritmo: só onde o veredicto do Claude é de outra família (entrar, ficar, sair) que o do algoritmo
    const dif = await page.evaluate(() => {
        const mk = window.__mk, FAM = { buy: 1, scale: 1, hold: 0, wait: 0, neutral: 0, turn: 0, reduce: -1, sell: -1, avoid: -1 };
        const cl = Object.fromEntries(mk.claude.actions.map((a) => [a.s, a.key]));
        const rs = [...document.querySelectorAll('.an-list .row')];
        const want = rs.filter((r) => { const k = r.dataset.open, c = cl[k], a = mk.AN[k] && mk.AN[k].advice && mk.AN[k].advice.key; return c in FAM && a in FAM && FAM[c] !== FAM[a]; }).map((r) => r.dataset.open);
        const got = rs.filter((r) => r.querySelector('.alg-diff')).map((r) => r.dataset.open);
        return { want, got, txt: [...new Set(rs.map((r) => r.querySelector('.alg-diff')).filter(Boolean).map((e) => e.textContent))] };
    });
    assert.ok(dif.want.length >= 1, 'há discordâncias nos dados de teste');
    assert.deepEqual(dif.got, dif.want, '≠ algoritmo onde o Claude e o algoritmo discordam');
    assert.deepEqual(dif.txt, ['≠ algoritmo']);
    console.log('✓ análise: uma lista pela convicção do Claude, n =', rowsCl.length, '+', rowsAuto.length, 'automáticos;', dif.got.length, '≠ algoritmo');
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, '3-analise.png') });
    const allKeys = rows.map((x) => x[0]);
    assert.ok(!allKeys.some((k) => /=F$|^\^/.test(k)), '"Tudo" só com o que se compra na TR: ' + allKeys.filter((k) => /=F$|^\^/.test(k)));
    assert.ok(allKeys.includes('SXR8.DE') && allKeys.includes('c:BTC'));
    // o resto, em linhas fechadas no fim, cada uma com uma linha de resumo
    assert.deepEqual(await page.locator('details.an-f > summary .f-t').evaluateAll((els) => els.map((e) => e.firstChild.textContent)), ['Toda a Trade Republic', 'Sinais automáticos', 'Resultados', 'Sobre as pontuações']);
    assert.equal(await page.locator('details.an-f[open]').count(), 0, 'todas fechadas');
    const auto = 'details[data-fold="an-auto"]', res = 'details[data-fold="an-res"]';
    assert.match(await page.locator(auto + ' > summary small').textContent(), /^(Oportunidades: .+|Regras fixas, para comparar)$/);
    assert.match(await page.locator(auto).textContent(), /Pontuação automática a médio prazo/);
    await page.waitForFunction(() => window.__mk.journal);
    await page.evaluate(() => window.__mk.render());
    assert.match(await page.locator(res + ' > summary small').textContent(), /^Regras: comprar [+−]\d+,\d\d% vs VWCE · \d+ dias?$/, 'resultados: o "comprar" das regras face ao VWCE');
    // abrir "Sinais automáticos": fica aberto quando o ecrã se atualiza (preços ao vivo)
    await page.click(auto + ' > summary');
    await page.evaluate(() => window.__mk.render());
    assert.equal(await page.locator(auto + '[open]').count(), 1, 'fica aberto ao atualizar');
    await page.click(auto + ' > summary');
    // os resultados: lá dentro os conselhos do Claude, o diário e o teste no passado
    assert.match(await page.locator(res + ' .cl-box').textContent(), /Primeiro dia/);
    assert.match(await page.locator(res + ' .cl-box').textContent(), /aprendeu até agora \(1\)/);
    await page.click(res + ' > summary');
    assert.ok(await page.locator(res + ' .box:has-text("Diário real")').isVisible(), 'os resultados abrem ao tocar');
    await page.evaluate(() => window.__mk.render());
    assert.equal(await page.locator(res + '[open]').count(), 1, 'e ficam abertos ao atualizar');
    await page.click(res + ' > summary');
    console.log('✓ análise: o resto em linhas fechadas (toda a TR, sinais automáticos, resultados, sobre as pontuações)');
    await page.click('.chips [data-filter="crypto"]');
    assert.equal(await page.locator(lst + ' .row').count(), 4);
    assert.equal(await page.locator('details.uni .row').count(), 1, 'toda a TR filtrada: só cripto');
    assert.equal(await page.locator('details.uni .f-n').textContent(), '1');
    await page.click('.chips [data-filter="all"]');
    await page.click('.seg.hz [data-hz="long"]');
    await page.waitForSelector('.seg.hz [data-hz="long"].on');
    const longRows = await rowsOf(lst + ' .row'), longScores = longRows.filter((x) => !x[2]).map((x) => x[1]);
    assert.deepEqual(longScores, [...longScores].sort((a, b) => b - a), 'ordenado pela convicção a longo prazo');
    assert.equal(longRows[0][0], 'VWCE.DE', 'VWCE (90) à frente a longo prazo');
    console.log('✓ análise por prazo: longo, n =', longScores.length);
    await page.click('.seg.hz [data-hz="disc"]');
    await page.waitForSelector('.seg.hz [data-hz="disc"].on');
    const dScores = (await page.locator(lst + ' .r-score .val').allTextContents()).map(Number);
    assert.deepEqual(dScores, [...dScores].sort((a, b) => b - a), 'ordenado pela oportunidade');
    assert.match(await page.locator(lst + ' .row .r-sub').first().textContent(), /do máx\./);
    assert.equal(await page.locator('.an-src').textContent(), 'Algoritmo · veredicto do Claude');
    assert.equal(await page.locator(nvr + ' .lbl').textContent(), 'Comprar', 'o veredicto do Claude nas linhas');
    assert.equal(await page.locator(lst + ' .alg-diff').count(), 0, 'no desconto a lista já é a do algoritmo: sem ≠');
    console.log('✓ modo desconto: n =', dScores.length);
    await page.click('.seg.hz [data-hz="mid"]');
    // ficha a partir da lista (4.21): um só cartão «Decisão» — o veredicto, a confiança, a média das fontes, cada fonte
    // numa linha, os níveis, o porquê e o plano do Claude; os pormenores de cada fonte ficam dobrados por baixo
    await page.click(lst + ' .row[data-open="NVDA"]');
    await page.waitForSelector('#mk-sheet:not([hidden]) .dec-box');
    const adv = '#mk-sheet .advice.dec-box';
    await page.waitForSelector('#mk-sheet .cons-box', { state: 'attached' }); // o consenso chega da rede e entra na decisão
    assert.equal(await page.locator('#mk-sheet .advice').count(), 1, 'uma só caixa a dizer o que fazer');
    assert.equal(await page.locator(adv + ' h3').textContent(), 'Decisão');
    // a decisão consolidada (decisao.onda): o que a app já sabe de cada fonte, numa só decisão
    const dec = await page.evaluate(() => {
        const m = window.__mk, ref = Object.keys(m.REG).find((k) => m.REG[k].kind === 'index');
        return { e: m.decIn('NVDA'), d: m.decOf('NVDA'), ref: m.decOf(ref), fora: m.decOf('NAO-EXISTE') };
    });
    assert.deepEqual([dec.d.manda, dec.d.fam, dec.d.key], ['claude', 1, dec.e.cl.key], 'manda o Claude');
    assert.deepEqual(dec.d.f.map((x) => x.f), ['claude', 'analistas', 'fundamentos', 'tecnica', 'noticias', 'sentimento'], 'as seis fontes, pela ordem');
    const dAn = dec.d.f.find((x) => x.f === 'analistas');
    assert.deepEqual([dAn.p, dAn.fam, dAn.w, dAn.d, dAn.key], [97, 1, 2, 1, 'strong_buy'], 'nota 1,4 → 90, mais 7 das revisões (12 para cima, 2 para baixo); com 58 analistas, o peso inteiro');
    assert.deepEqual(dec.e.fun, { pe: 28.4, cr: 60, mg: 55 }, 'os fundamentos vêm com o consenso, em %');
    assert.ok(dec.d.n === dec.d.f.length && Number.isInteger(dec.d.p) && dec.d.conf === 2, 'o Claude e os analistas a favor, ninguém contra: confiança alta');
    assert.equal(await page.locator(adv + ' .adv-act').textContent(), 'Comprar' + (dec.d.forte ? ' forte' : ''), 'rótulo da família; forte: média de 70 ou mais e ninguém contra');
    assert.deepEqual([dec.ref, dec.fora], [null, null], 'um índice (ou o que a app não tem) não tem decisão');
    // o cartão mostra essa decisão: a confiança, a média, quantas a favor e cada fonte numa linha
    assert.equal(await page.locator(adv + ' .dec-conf').textContent(), 'confiança ' + ['baixa', 'média', 'alta'][dec.d.conf]);
    assert.equal(await page.locator(adv + ' .dec-p .val').textContent(), String(dec.d.p));
    const voz = await page.locator(adv + ' .dec-voz').textContent();
    assert.ok(voz.startsWith(dec.d.favor === dec.d.n ? `As ${dec.d.n} fontes de acordo.` : `${dec.d.favor} de ${dec.d.n} a favor`), voz);
    const fontes = await page.locator(adv + ' .dec-f li').evaluateAll((ls) => ls.map((l) => [...l.querySelectorAll('.dec-r b, .dec-r .dec-l, .dec-r em, .dec-s .val, .dec-s small')].map((x) => x.textContent)));
    assert.deepEqual(fontes.map((x) => x[0]), ['Claude', 'Analistas', 'Fundamentos', 'Técnica', 'Notícias', 'Sentimento']);
    assert.deepEqual(fontes[0].slice(1), ['Comprar', 'decide', String(dec.d.f[0].p), 'curto 48 · médio 88 · longo 81'], 'o Claude: o veredicto, quem decide e a convicção por prazo');
    assert.deepEqual(fontes[1].slice(1), ['Compra forte', 'a favor', '97', '58 analistas · alvo +17,60% · revisões 12↑ 2↓'], 'os analistas: a recomendação, quantos, o alvo e as revisões das estimativas');
    assert.deepEqual(fontes[2].slice(1), ['fortes', 'a favor', '65', 'P/E 28,4 · vendas +60% · margem 55%'], 'os fundamentos: o P/E, as vendas e a margem');
    assert.match(fontes[3][4], /^curto \d+ · médio \d+ · longo \d+$/, 'a técnica: as pontuações por prazo');
    assert.match(await page.locator(adv + ' .dec-leg').textContent(), /^Como ler este cartãoCada fonte dá uma nota de 0 \(vender\) a 100 \(comprar\)/, 'a legenda: como se lê o cartão');
    assert.equal(await page.locator(adv + ' details.dec-leg:not([open])').count(), 1, 'a legenda fechada: abre-se quando é preciso');
    assert.deepEqual(fontes.map((x) => x[2]), dec.d.f.map((x, i) => (i === 0 ? 'decide' : x.d > 0 ? 'a favor' : x.d < 0 ? 'contra' : 'ao lado')), 'de que lado fica cada uma');
    assert.deepEqual(fontes[4].slice(1), ['positivas', 'a favor', '72', 'lidas pelo Claude'], 'as notícias: o tom que o Claude leu (news 72), em vez do dos títulos');
    assert.equal(dec.e.news, (72 - 50) / 50, 'o tom do Claude entra na decisão de -1 a 1');
    assert.match(fontes[5].join('|'), /^Sentimento\|(calmo|nervoso|medo)\|.+\|\d+\|VIX \d+$/, 'o sentimento nas ações: o VIX');
    assert.match((await page.locator('#mk-sheet .stats').textContent()).replace(/\s+/g, ' '), /P\/E esperado\s*28,4\s*Vendas num ano\s*\+60,0%\s*Margem de lucro\s*55,0%/, 'os fundamentos nos números da ficha');
    // o desenho: nada sai do cartão, a confiança fica ao lado do veredicto e cada fonte ocupa duas linhas curtas
    const geo = await page.evaluate(() => {
        const b = document.querySelector('#mk-sheet .dec-box'), r = (el) => el.getBoundingClientRect(), bx = r(b);
        const act = r(b.querySelector('.dec-top .adv-act')), conf = r(b.querySelector('.dec-conf'));
        return { cabe: [...b.querySelectorAll('*')].every((el) => r(el).right <= bx.right + 0.5 && r(el).left >= bx.left - 0.5), aoLado: conf.top < act.bottom && conf.left >= act.right - 1, linhas: [...b.querySelectorAll('.dec-f li')].map((l) => Math.round(r(l).height)), alto: Math.round(bx.height) };
    });
    assert.ok(geo.cabe, 'nada sai do cartão');
    assert.ok(geo.aoLado, 'a confiança ao lado do veredicto');
    assert.ok(geo.linhas.every((h) => h >= 36 && h <= 84), 'cada fonte em duas linhas curtas (três, com um pormenor comprido): ' + geo.linhas);
    console.log('✓ cartão «Decisão»: fontes com', geo.linhas.join(', '), 'px de altura; o cartão todo', geo.alto, 'px');
    assert.equal(await page.locator(adv + ' .adv-nu').textContent(), 'Comprar aos poucos', 'o pormenor do Claude por baixo');
    assert.match(await page.locator(adv + ' .adv-src').textContent(), /^Análise do Claude · feita às \d\d:\d\d de \d\d\/\d\d · próxima (hoje|amanhã) às (07:14|15:14)$/);
    const lv = await page.locator(adv + ' .cl-lv li').allTextContents();
    assert.match(lv[0], /^Entrada\s*164,93\s€\s*−3,06%$/, 'entrada em euros e a distância ao preço: ' + lv[0]);
    assert.match(lv[1], /^Alvo\s*199,65\s€\s*\+17,35%$/, lv[1]);
    assert.match(lv[2], /^Stop\s*149,31\s€\s*−12,24%$/, lv[2]);
    assert.match(await page.locator(adv).textContent(), /Desconto de 22%[\s\S]*Plano:\s*Metade agora[\s\S]*Catalisador:\s*Resultados a 17\/11: o guidance dos centros de dados\s*Risco:\s*Fecho abaixo de 172 \$ ou corte do guidance/, 'o catalisador e o risco, por baixo do plano');
    // desde quando: a Nvidia mudou nesta análise (o publicar deu-lhe a data de hoje e o que dizia antes); em destaque
    assert.match(await page.locator(adv + ' .dec-desde.novo').textContent(), /^Mudou (hoje|ontem) · antes: Aguardar$/);
    const dg = await page.evaluate(() => { const b = document.querySelector('#mk-sheet .dec-box'), r = (s) => b.querySelector(s).getBoundingClientRect(); return [r('.dec-top').bottom, r('.adv-nu').bottom, r('.dec-desde').top, r('.dec-desde').bottom, r('.dec-p').top]; });
    assert.ok(dg[1] <= dg[2] + 0.5 && dg[3] <= dg[4] + 0.5 && dg[0] <= dg[2], 'entre o veredicto e a média das fontes: ' + dg.map(Math.round));
    // a Allianz mantém a compra desde dia 1 (a série gravada continua) e antes dizia manter: sem destaque
    const alv = await page.evaluate(() => { const s = window.__mk.decSnapOf('ALV.DE'); return [s.desde, s.dias >= 2, s.era, s.cat, s.risk, s.nc]; });
    assert.match(alv[0], /^01\/11(\/2026)?$/);
    assert.deepEqual(alv.slice(1), [true, 'hold', undefined, 'Perde os 300 € ou corta o dividendo', false]);
    assert.match(await page.locator(adv + ' .adv-ev').textContent(), /Resultados daqui a 5 dias/);
    assert.equal(await page.locator(adv + ' .adv-meta').count(), 0, 'os impostos saem do cartão');
    // porque o Claude discorda: de quem está contra; sem ninguém contra, da técnica, se ficou ao lado
    const tecD = dec.d.f.find((x) => x.f === 'tecnica').d;
    assert.equal(await page.locator(adv + ' .adv-alg').count(), dec.d.contra > 0 || tecD === 0 ? 1 : 0);
    if (dec.d.contra === 0 && tecD === 0) assert.equal(await page.locator(adv + ' .adv-alg').textContent(), 'Porque discorda da técnica: A regra vê L36 e o preço abaixo da MM200; não vê os resultados de 17/11; concordo se perder 149 €.');
    // o prazo também no que não tem (4.26): escolhe-se no cartão, muda a decisão e o IRS; tocar outra vez tira-o
    assert.equal(await page.locator(adv + ' .dec-hz button.on').count(), 0, 'a Nvidia não é dele: sem prazo');
    assert.match(await page.locator(adv + ' .dec-irs').textContent(), /^IRS: 28 % até 2 anos, a descer até 19,6 % com 8 anos ou mais\. No alvo \(\+17,35%\), 1 000 € ganham \+173 €: \+125 € depois do imposto\.$/);
    await page.click(adv + ' [data-hzset="short"]');
    await page.waitForSelector(adv + ' .dec-hz button.on[data-hzset="short"]');
    assert.deepEqual(await page.evaluate(() => [window.__mk.decIn('NVDA').hz, window.__mk.cfg.lots.NVDA.hz]), ['short', 'short']);
    assert.match(await page.locator(adv + ' .dec-irs').textContent(), /^IRS: vender antes de 2 anos paga 28 % sobre o ganho\. No alvo/);
    if (SHOTS) await page.locator(adv).screenshot({ path: path.join(SHOTS, '3f-decisao-curto.png') });
    await page.click(adv + ' [data-hzset="long"]');
    await page.waitForSelector(adv + ' .dec-hz button.on[data-hzset="long"]');
    assert.match(await page.locator(adv + ' .dec-irs').textContent(), /: \+125 € a \+139 € depois do imposto, conforme os anos\.$/);
    await page.click(adv + ' [data-hzset="long"]');
    await page.waitForFunction((s) => !document.querySelector(s + ' .dec-hz button.on'), adv);
    assert.equal(await page.evaluate(() => window.__mk.cfg.lots.NVDA), undefined, 'tocar outra vez tira o prazo (e o ativo sai da Carteira)');
    if (SHOTS) await page.locator(adv).screenshot({ path: path.join(SHOTS, '3c-decisao.png') });
    if (SHOTS) { await page.locator(adv).scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(SHOTS, '3b-ficha-claude.png') }); }
    await fichaInteira(page, '3d-ficha-inteira.png');
    // os pormenores de cada fonte, dobrados: a convicção por prazo, os analistas, os sinais automáticos e os impostos
    const shAuto = '#mk-sheet details.sh-auto';
    assert.equal(await page.locator(shAuto + ':not([open])').count(), 1, 'os pormenores fechados na ficha');
    assert.match(await page.locator(shAuto + ' > summary').textContent(), /^Pormenores de cada fonte/);
    assert.deepEqual(await page.locator(shAuto + ' .cl-conv .val').allTextContents(), ['48', '88', '81'], 'convicção curto/médio/longo');
    assert.deepEqual(await page.locator(shAuto + ' .cl-conv small').allTextContents(), ['Curto prazo', 'Médio prazo', 'Longo prazo']);
    // o consenso dos analistas (4.14): a recomendação, os votos do mês, a nota e o preço-alvo
    assert.match(await page.locator(shAuto + ' .cons-box .adv-act').textContent(), /^Compra forte\s+58 recomendações este mês$/);
    assert.equal(await page.locator(shAuto + ' .cons-box .cons-bar i').count(), 5, 'os votos');
    // a legenda com as cores da barra: um ponto por categoria (as que têm votos), com quantos e a %
    assert.deepEqual(await page.locator(shAuto + ' .cons-box .cons-leg span').allTextContents(), ['20 compra forte · 34 %', '30 comprar · 52 %', '6 manter · 10 %', '1 vender · 2 %', '1 venda forte · 2 %'], 'por extenso');
    assert.deepEqual(await page.locator(shAuto + ' .cons-box .cons-leg i').evaluateAll((is) => is.map((i) => i.className)), ['c0', 'c1', 'c2', 'c3', 'c4'], 'a cor de cada pedaço da barra');
    const cm = await page.locator(shAuto + ' .cons-box .adv-meta').allTextContents();
    assert.match(cm[0], /^Nota média 1,4, numa escala de 1 \(compra forte\) a 5 \(venda forte\)\.$/);
    assert.equal(cm[1], 'Há 3 meses, 72 % diziam comprar; agora 86 %.', 'para onde vão as recomendações');
    assert.match(cm[2], /^Preço-alvo médio a 12 meses, de 58 analistas: .+€ \(230,50\sUS\$\) \+17,60% face a hoje · o mais baixo .+€ \(150,00\sUS\$\), o mais alto .+€ \(300,00\sUS\$\)\.$/, 'em euros e em dólares: ' + cm[2]);
    assert.equal(cm[3], 'Estimativas de lucro deste ano: 12 analistas subiram e 2 desceram em 30 dias; em 90 dias a estimativa mudou +8,4%.', 'as revisões das estimativas');
    assert.equal(cm[4], 'Resultados: acima do esperado em 4 de 4 trimestres, em média +6,2%.', 'as surpresas dos resultados');
    assert.equal(await page.locator(shAuto + ' .cons-box .adv-alg').count(), 0, 'quem concorda com quem está no cartão');
    assert.equal(await page.locator(shAuto + ' .box:has-text("Análise técnica") .hzb').count(), 3, 'pontuações automáticas por prazo');
    assert.equal(await page.locator(shAuto + ' .algo-box .adv-act').count(), 1, 'sinal automático lá dentro');
    assert.equal(await page.locator(shAuto + ' .disc-box').count(), 1);
    assert.match(await page.locator(shAuto + ' .fx-box').textContent(), /Impostos e dividendos[\s\S]*28% até 2 anos/);
    await page.click(shAuto + ' > summary');
    assert.ok(await page.locator(shAuto + ' .algo-box').isVisible(), 'abre ao tocar');
    if (SHOTS) await page.locator(shAuto + ' .cons-box').screenshot({ path: path.join(SHOTS, '9-consenso.png') });
    await fichaInteira(page, '3e-ficha-pormenores.png');
    await page.click(shAuto + ' > summary');
    await page.click('[data-act="close"] >> nth=-1');
    await page.waitForFunction(() => document.querySelector('#mk-sheet').hidden);
    console.log('✓ ficha da Nvidia: Comprar aos poucos', lv.map((x) => x.replace(/\s+/g, ' ')).join(' | '));

    // um fundo por dentro (conector 1.8.0): o P/E das empresas que tem, o custo e as maiores posições, nos pormenores
    await page.click('#mk-nav [data-tab="painel"]');
    await page.locator('.row[data-open="VWCE.DE"]').first().click();
    await page.waitForSelector('#mk-sheet details.sh-auto .fund-box', { state: 'attached' });
    assert.equal((await page.locator('#mk-sheet .fund-box .adv-meta').allTextContents()).join(' | '), 'As empresas do fundo valem 21,5 vezes os lucros (P/E) e 3,2 vezes o valor contabilístico. | Custo: 0,22 % por ano. | Maiores posições: NVIDIA Corp 5,1 % · Apple <b>Inc</b> 4,3 %.');
    assert.equal(await page.locator('#mk-sheet .fund-box b:has-text("Inc")').count(), 0, 'o nome de uma posição sai escapado');
    await page.click('[data-act="close"] >> nth=-1');
    await page.waitForFunction(() => document.querySelector('#mk-sheet').hidden);
    console.log('✓ ficha de um fundo: o que tem por dentro');

    // detalhe da Bitcoin
    await page.click('#mk-nav [data-tab="painel"]');
    await page.locator('.row[data-open="c:BTC"]').first().click();
    await page.waitForSelector('#mk-sheet:not([hidden]) .news li');
    await page.waitForFunction(() => { const c = document.querySelector('#d-cv'); return c && c.width > 0 && document.querySelector('#d-load').hidden; });
    const inked = await page.evaluate(() => { const c = document.querySelector('#d-cv'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return n; });
    assert.ok(inked > 500, 'gráfico desenhado');
    assert.equal(await page.evaluate(() => !!(window.GraficoOnda && GraficoOnda.ok)), true, 'gráfico vivo (Onda)');
    await page.waitForFunction(() => GraficoOnda.animando, null, { timeout: 5000 }); // os preços da Binance mexem-no
    assert.equal(await page.locator('.news a[href^="javascript"]').count(), 0, 'links javascript: bloqueados');
    assert.equal(await page.locator('.news img').count(), 0, 'HTML das notícias escapado');
    assert.ok(await page.locator('.box:has-text("Análise técnica") .reasons li').count() >= 4);
    assert.equal(await page.locator('.box:has-text("Análise técnica") .hzb').count(), 3, 'três prazos na folha');
    assert.ok(await page.locator('.disc-box .range52 .bar i').count(), 'barra mínimo–máximo do ano');
    assert.ok(await page.locator('.advice .adv-act').count(), 'o que fazer na TR');
    assert.match(await page.locator('.advice .adv-src').textContent(), /Análise do Claude/);
    assert.equal(await page.locator('.advice .adv-act').textContent(), 'Manter', 'tenho BTC: ficar = Manter');
    assert.equal(await page.locator('.advice .adv-nu').textContent(), 'Esperar', 'e a frase do Claude por baixo');
    assert.equal(await page.locator('#mk-sheet details.sh-auto').count(), 1, 'algoritmo como referência, à parte');
    // o sentimento na cripto: o Fear & Greed (24: medo extremo), ao contrário — ao lado do «Manter» do Claude
    await page.waitForSelector('#mk-sheet .dec-f li:has-text("Sentimento")', { state: 'attached' });
    assert.equal((await page.locator('#mk-sheet .dec-f li:has-text("Sentimento")').textContent()).replace(/\s+/g, ' '), 'Sentimentomedo extremoao lado66Medo e ganância 24 (0 = pânico, 100 = euforia) · com medo os preços costumam estar em baixo: bom para comprar');
    assert.equal(await page.locator('.advice .cl-lv li').count(), 3, 'entrada, alvo e stop');
    assert.match(await page.locator('.advice').textContent(), /€/);
    assert.ok(await page.locator('.levels li').count() >= 2, 'níveis-chave');
    console.log('✓ conselho BTC:', await page.locator('.advice .adv-act').textContent(), '| níveis', await page.locator('.levels li').count());
    assert.match(await page.locator('.disc-box .dd-big').textContent(), /%/);
    assert.ok((await page.locator('.disc-box .verdict').textContent()).length > 10);
    const box = await page.locator('#d-cv').boundingBox();
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height / 2);
    await page.mouse.move(box.x + box.width * 0.6, box.y + box.height / 2, { steps: 3 });
    assert.match(await page.locator('#d-tip').textContent(), /€/);
    console.log('✓ detalhe: gráfico, análise e notícias; tooltip', await page.locator('#d-tip').textContent());
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, '4-detalhe-btc.png') });
    await fichaInteira(page, '4b-ficha-btc-inteira.png');
    await page.click('.ranges [data-range="6mo"]');
    await page.waitForFunction(() => document.querySelector('#d-load').hidden);
    assert.match(await page.locator('#d-px .alt').textContent(), /6 meses/, 'variação do período escolhido');
    await page.waitForFunction(() => !GraficoOnda.animando, null, { timeout: 5000 });
    console.log('✓ gráfico vivo: anima com os preços e pára quando assenta');

    // puxar para baixo fecha a folha
    const cdp = await ctx.newCDPSession(page);
    await page.evaluate(() => { document.querySelector('#mk-sheet-card').scrollTop = 0; });
    await page.waitForTimeout(100);
    const g = await page.locator('#mk-sheet-card .grab').boundingBox();
    const tp = (y) => [{ x: g.x + g.width / 2, y }];
    // um gesto: os pontos (y) e a hora de cada toque (ms desde o início), mandados ao Chromium com o timestamp deles
    const puxa = async (ys, ms) => {
        const t0 = Date.now() / 1000;
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: tp(ys[0]), timestamp: t0 });
        for (let i = 1; i < ys.length; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: tp(ys[i]), timestamp: t0 + ms[i] / 1000 });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [], timestamp: t0 + ms[ms.length - 1] / 1000 + 0.01 });
    };
    // longo (250 px em 300 ms): fecha
    await puxa(Array.from({ length: 11 }, (_, i) => g.y + 2 + i * 25), Array.from({ length: 11 }, (_, i) => i * 30));
    await page.waitForFunction(() => document.querySelector('#mk-sheet').hidden, null, { timeout: 2000 });
    console.log('✓ puxar para baixo fecha a folha');
    // puxar pouco e devagar (38 px em 400 ms) não fecha
    await page.locator('.row[data-open="c:ETH"]').first().click();
    await page.waitForSelector('#mk-sheet:not([hidden])');
    await page.waitForTimeout(300); // a folha acabou de abrir (a animação)
    await puxa([g.y + 2, g.y + 40], [0, 400]);
    await page.waitForTimeout(400);
    assert.equal(await page.locator('#mk-sheet').isHidden(), false, 'puxão curto não fecha');
    // … e um puxão curto mas rápido (38 px em 40 ms, como um gesto de fechar) fecha
    await puxa([g.y + 2, g.y + 40], [0, 30]);
    await page.waitForFunction(() => document.querySelector('#mk-sheet').hidden, null, { timeout: 2000 });
    console.log('✓ puxão curto e devagar não fecha; curto e rápido fecha');
    // em qualquer parte, como na TR: no gráfico (para baixo fecha; para o lado é o dedo), no fundo escuro por cima e,
    // com o conteúdo descido, ao subir até ao topo e continuar a puxar no mesmo gesto
    const gesto = async (x, ys, ms, xs) => {
        const t0 = Date.now() / 1000, pt = (i) => [{ x: xs ? xs[i] : x, y: ys[i] }];
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(0), timestamp: t0 });
        for (let i = 1; i < ys.length; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt(i), timestamp: t0 + ms[i] / 1000 });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [], timestamp: t0 + ms[ms.length - 1] / 1000 + 0.01 });
    };
    const abreEth = async () => { await page.locator('.row[data-open="c:ETH"]').first().click(); await page.waitForSelector('#mk-sheet:not([hidden]) #d-cv'); await page.waitForTimeout(300); };
    const desce = (y, n, passo) => Array.from({ length: n }, (_, i) => y + i * passo), tempos = (n) => Array.from({ length: n }, (_, i) => i * 30);
    await abreEth();
    let cvb = await page.locator('#d-cv').boundingBox();
    await gesto(cvb.x + cvb.width / 2, desce(cvb.y + 20, 9, 8), tempos(9), desce(cvb.x + 40, 9, 30));
    await page.waitForTimeout(400);
    assert.equal(await page.locator('#mk-sheet').isHidden(), false, 'para o lado no gráfico não fecha');
    await gesto(cvb.x + cvb.width / 2, desce(cvb.y + 20, 11, 25), tempos(11));
    await page.waitForFunction(() => document.querySelector('#mk-sheet').hidden, null, { timeout: 2000 });
    await abreEth();
    const topo = await page.locator('#mk-sheet-card').boundingBox();
    assert.ok(topo.y > 30, 'há fundo por cima da folha');
    await gesto(200, desce(Math.max(8, topo.y - 30), 11, 25), tempos(11));
    await page.waitForFunction(() => document.querySelector('#mk-sheet').hidden, null, { timeout: 2000 });
    await abreEth();
    await page.evaluate(() => { document.querySelector('#mk-sheet-card').scrollTop = 160; });
    await page.waitForTimeout(100);
    const meio = await page.locator('#mk-sheet-card').boundingBox();
    await gesto(200, desce(meio.y + 120, 21, 25), tempos(21));
    await page.waitForFunction(() => document.querySelector('#mk-sheet').hidden, null, { timeout: 2000 });
    console.log('✓ puxar para fechar em qualquer parte: no gráfico, no fundo e a seguir a subir o conteúdo');
    // índice (referência): a leitura do Claude, sem conselho de compra nem impostos; o algoritmo fechado
    await page.click('#mk-nav [data-tab="painel"]');
    await page.click('details[data-fold="pn-idx"] > summary');
    await page.locator('.row[data-open="^GSPC"]').first().click();
    await page.waitForSelector('#mk-sheet:not([hidden]) .cl-adv');
    assert.equal(await page.locator('#mk-sheet .cl-adv h3').textContent(), 'Leitura do Claude');
    assert.match(await page.locator('#mk-sheet .cl-adv .adv-act').textContent(), /^(Em alta|Lateral|Em queda)$/);
    assert.equal(await page.locator('#mk-sheet .cl-adv .cl-conv .cv').count(), 3);
    assert.equal(await page.locator('#mk-sheet .cl-adv .adv-meta').count(), 0, 'sem impostos num índice');
    assert.equal(await page.locator('#mk-sheet details.sh-auto:not([open]) .hzb').count(), 3);
    await page.click('[data-act="close"] >> nth=-1');
    await page.waitForFunction(() => document.querySelector('#mk-sheet').hidden);
    console.log('✓ índice: leitura do Claude (referência)');

    // arrastar uma linha para a esquerda → Retirar (com Desfazer e Repor)
    await page.click('#mk-nav [data-tab="painel"]');
    const idxSel = 'details[data-fold="pn-idx"][open] .sw-wrap';
    const nIdx = await page.locator(idxSel).count();
    // a caixa da linha: se a lista acabou de ser redesenhada (os preços chegam a cada 30 s), a de antes já não está na
    // página e a nova aparece logo a seguir
    const caixa = async (sel) => {
        for (let i = 0; i < 40; i++) { const b = await page.locator(sel).first().boundingBox(); if (b) return b; await page.waitForTimeout(50); }
        throw new Error('a linha não aparece: ' + sel);
    };
    const swipeLeft = async (sel) => {
        const b = await caixa(sel);
        const y = b.y + b.height / 2, p = (x) => [{ x, y }];
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: p(b.x + b.width - 30) });
        for (let i = 1; i <= 6; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: p(b.x + b.width - 30 - i * 25) });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await page.waitForTimeout(300);
    };
    await page.locator(idxSel).first().scrollIntoViewIfNeeded();
    const firstIdx = await page.locator(idxSel).first().getAttribute('data-swk');
    await swipeLeft(idxSel);
    assert.equal(await page.locator(idxSel + '.open').count(), 1, 'arrastar mostra Retirar');
    assert.equal(await page.locator('#mk-sheet').isHidden(), true, 'arrastar não abre a ficha');
    await page.locator(idxSel + '.open .sw-del').click();
    assert.equal(await page.locator(idxSel).count(), nIdx - 1, 'retirado da lista');
    assert.match(await page.locator('#mk-toast').textContent(), /retirado.*Desfazer/);
    await page.click('#mk-toast .t-undo');
    assert.equal(await page.locator(idxSel).count(), nIdx, 'desfazer repõe');
    await swipeLeft(idxSel); await page.locator(idxSel + '.open .sw-del').click();
    assert.ok(await page.evaluate((k) => window.__mk.cfg.hidden.includes(k), firstIdx));
    await page.click('details[data-fold="pn-idx"] [data-unhide="index"]');
    assert.equal(await page.locator(idxSel).count(), nIdx, 'Repor traz de volta');
    console.log('✓ arrastar para a esquerda: retirar, desfazer e repor (' + firstIdx + ')');
    // … e arrastar até ao fim retira logo, com Desfazer (como no Mail do iPhone), sem mudar de separador
    const tabAgora = () => page.evaluate(() => window.__mk.cfg.tab);
    const aoLado = async (y, x1, x2) => { await gesto(0, Array(9).fill(y), tempos(9), Array.from({ length: 9 }, (_, i) => x1 + (x2 - x1) * i / 8)); await page.waitForTimeout(500); };
    const ateAoFim = async (sel) => { const b = await caixa(sel); await aoLado(b.y + b.height / 2, b.x + b.width - 20, b.x + b.width - 300); };
    await page.locator(idxSel).first().scrollIntoViewIfNeeded(); // o Repor (no fim da lista) deixou a página mais abaixo
    await ateAoFim(idxSel);
    assert.equal(await page.locator(idxSel).count(), nIdx - 1, 'arrastar até ao fim retira');
    assert.match(await page.locator('#mk-toast').textContent(), /retirado.*Desfazer/);
    await page.click('#mk-toast .t-undo');
    assert.equal(await page.locator(idxSel).count(), nIdx, 'desfazer repõe');
    assert.equal(await tabAgora(), 'painel', 'apagar não muda de separador');
    // navegar: arrastar para o lado em qualquer parte muda de separador; no primeiro, para a direita resiste e fica
    await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(100);
    const yTit = async () => { const b = await page.locator('#mk-body .pg-t').first().boundingBox(); return b.y + b.height / 2; };
    await aoLado(await yTit(), 60, 330);
    assert.equal(await tabAgora(), 'painel', 'no primeiro separador, para a direita fica');
    await aoLado(await yTit(), 330, 60);
    assert.equal(await tabAgora(), 'destaques', 'para a esquerda: o separador seguinte');
    assert.equal(await page.locator('#mk-nav [data-tab="destaques"].on').count(), 1);
    await page.waitForSelector('#mk-body .hl-row');
    const hr = await page.locator('#mk-body .hl-row').first().boundingBox();
    await aoLado(hr.y + hr.height / 2, 330, 60);
    assert.equal(await tabAgora(), 'analise', 'também a partir de uma linha que não se apaga');
    assert.equal(await page.locator('#mk-sheet').isHidden(), true, 'arrastar não abre a ficha');
    await aoLado(await yTit(), 60, 330);
    assert.equal(await tabAgora(), 'destaques', 'para a direita: o anterior');
    // a lista dos Ajustes: arrastar uma linha para a esquerda retira-a (com Desfazer)
    await page.click('#mk-nav [data-tab="ajustes"]');
    const wlSel = '.wl-i[data-grp="w"]', nWl = await page.locator(wlSel).count();
    await page.locator(wlSel).first().scrollIntoViewIfNeeded();
    await ateAoFim(wlSel);
    assert.equal(await page.locator(wlSel).count(), nWl - 1, 'Ajustes: arrastar retira da lista');
    assert.match(await page.locator('#mk-toast').textContent(), /retirado.*Desfazer/);
    await page.click('#mk-toast .t-undo');
    assert.equal(await page.locator(wlSel).count(), nWl, 'Ajustes: desfazer repõe');
    assert.equal(await tabAgora(), 'ajustes');
    await page.click('#mk-nav [data-tab="painel"]');
    console.log('✓ navegar a arrastar: separadores para o lado; linhas do Painel e dos Ajustes apagam a arrastar até ao fim');

    // puxar para baixo no topo → atualizar
    await page.click('#mk-nav [data-tab="painel"]');
    await page.evaluate(() => window.scrollTo(0, 0));
    const r0 = await page.evaluate(() => window.__mk.st.lastRefresh || 0);
    const pt = (y) => [{ x: 200, y }];
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(160) });
    for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt(160 + i * 30) });
    assert.match(await page.locator('#mk-ptr').textContent(), /Larga para atualizar/);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForFunction((r) => (window.__mk.st.lastRefresh || 0) > r, r0);
    await page.waitForFunction(() => !window.__mk.st.pulling);
    assert.equal(await page.locator('.mk-top:visible').count(), 0, 'sem barra fixa');
    assert.match(await page.locator('#mk-body .pg-st').textContent(), /Cripto/);
    console.log('✓ puxar para baixo atualiza; estado por baixo do título');

    // letra mais larga (como a do iOS): nada pode passar da largura do ecrã
    await page.addStyleTag({ content: 'body *{letter-spacing:.07em !important}' });
    // e com a letra "Muito grande"
    await page.click('#mk-nav [data-tab="ajustes"]'); await page.click('[data-fs="xl"]');
    assert.equal(await page.evaluate(() => document.documentElement.dataset.fs), 'xl');
    const foraDoEcra = (sel) => page.evaluate((sel) => [...document.querySelectorAll(sel)].filter((e) => { const r = e.getBoundingClientRect(); if (!(r.width > 0 && r.height > 0 && (r.right > innerWidth + 0.5 || r.left < -0.5))) return false; for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) { const o = getComputedStyle(a).overflowX; if (o !== 'visible') { const ar = a.getBoundingClientRect(); if (ar.right <= innerWidth + 0.5 && ar.left >= -0.5) return false; } } return true; }).slice(0, 4).map((e) => e.tagName + '.' + e.className + ' ' + Math.round(e.getBoundingClientRect().right) + ' ' + (() => { const z = []; for (let a = e; a && a !== document.body; a = a.parentElement) z.push(a.tagName + '.' + a.className + ':' + Math.round(a.getBoundingClientRect().right) + ':' + getComputedStyle(a).display); return z.join(' < '); })()), sel);
    for (const tab of ['painel', 'destaques', 'analise', 'carteira', 'ajustes']) {
        await page.click(`#mk-nav [data-tab="${tab}"]`); await page.waitForTimeout(250);
        if (tab === 'carteira') await page.evaluate(() => document.querySelectorAll('#mk-body details').forEach((d) => { d.open = true; }));
        const wide = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        assert.ok(wide <= 0, `${tab}: página mais larga que o ecrã (${wide}px)`);
        // e nada visível sai do ecrã (o que tem overflow escondido também conta)
        const fora = await foraDoEcra('#mk-body *');
        assert.deepEqual(fora, [], `${tab}: elementos fora do ecrã`);
    }
    await page.click('#mk-nav [data-tab="painel"]');
    await page.locator('.row[data-open="c:BTC"]').first().click();
    await page.waitForSelector('#mk-sheet:not([hidden]) .news li');
    const sheetOver = await page.evaluate(() => { const c = document.querySelector('#mk-sheet-card').getBoundingClientRect(); const x = document.querySelector('#mk-sheet-card [data-act="close"]').getBoundingClientRect(); return { c: c.right - innerWidth, x: x.right - innerWidth }; });
    assert.ok(sheetOver.c <= 0 && sheetOver.x <= 0, 'folha e botão fechar dentro do ecrã ' + JSON.stringify(sheetOver));
    assert.deepEqual(await foraDoEcra('#mk-sheet-card *'), [], 'folha: elementos fora do ecrã');
    await page.click('[data-act="close"] >> nth=-1');
    await page.waitForFunction(() => document.querySelector('#mk-sheet').hidden);
    await page.click('#mk-nav [data-tab="ajustes"]'); await page.click('[data-fs="n"]');
    console.log('✓ letra larga e "Muito grande": nada sai do ecrã');

    // diário: guardou as sugestões de hoje e avalia as antigas
    await page.waitForFunction(() => window.__mk.cfg.jLast, null, { timeout: 15000 });
    assert.ok(jPosts >= 1, 'diário gravado');
    await page.click('#mk-nav [data-tab="analise"]');
    await page.click('details[data-fold="an-res"] > summary');
    await page.waitForSelector('.box:has-text("Diário real") .tt');
    const jt = await page.locator('.box:has-text("Diário real") .tt').textContent();
    assert.match(jt, /Comprar/); assert.match(jt, /Evitar/);
    console.log('✓ diário: gravado e avaliado');
    await page.click('[data-act="backtest"]');
    await page.waitForSelector('.box:has-text("Teste no passado") .tt', { timeout: 30000 });
    assert.match(await page.locator('.box:has-text("Teste no passado")').textContent(), /vs VWCE/);
    console.log('✓ teste no passado:', await page.locator('.box:has-text("Teste no passado") .tt tbody tr').count(), 'linhas');
    await page.click('details[data-fold="an-res"] > summary');

    // plano: orçamento mensal reparte-se em euros
    await page.click('#mk-nav [data-tab="ajustes"]');
    await page.fill('#f-budget', '900');
    await page.locator('#f-budget').dispatchEvent('change');
    // com o «€ por mês» de um ativo na Carteira, o valor do mês é a soma dela e os Ajustes só o mostram (4.25.1)
    const ajPm = await page.evaluate(() => { const m = window.__mk, L0 = m.cfg.lots['VWCE.DE']; m.cfg.lots['VWCE.DE'] = { ...(L0 || {}), pm: 700 }; m.render();
        const el = document.querySelector('#f-budget'), r = [el.tagName, el.textContent, m.panelSnap ? null : 0];
        if (L0) m.cfg.lots['VWCE.DE'] = L0; else delete m.cfg.lots['VWCE.DE']; m.render(); return r; });
    assert.deepEqual(ajPm.slice(0, 2), ['DIV', '700 €'], 'a soma da Carteira, só para ler');
    assert.equal(await page.locator('input#f-budget').count(), 1, 'sem valor na Carteira, volta o campo dos Ajustes');
    await page.click('#mk-nav [data-tab="painel"]');
    const amounts = await page.locator('.today .plan-blk .idea .i-t').allTextContents();
    const total = amounts.reduce((a, t) => a + Number(t.replace(/[^\d,]/g, '').replace(',', '.')), 0);
    assert.ok(Math.abs(total - 900) <= 3, 'plano soma 900 €: ' + amounts.join(' + '));
    assert.deepEqual(amounts.map((t) => t.replace(/\s/g, '')), ['810€', '90€'], 'VWCE 810 € + Bitcoin 90 €');
    assert.match(await page.locator('.today .plan-blk').textContent(), /Bitcoin/);
    assert.equal(await page.locator('details.stocks-fold').count(), 0, 'ações à vista no Painel (só informação)');
    console.log('✓ plano do mês 900 €:', amounts.join(' + '));
    // a análise na hora (4.27): sem gatilho no conector nada se pede; com ele, abrir a app pede-a (a de teste é antiga)
    assert.equal(runPosts.length, 0, 'sem naHora no /me, nunca se pede');
    const corrida = await page.evaluate(async () => { const m = window.__mk; m.st.naHora = true; m.cfg.owner = true; await m.pedirAnalise('abrir'); const a = m.st.runAt; await m.pedirAnalise('pedido'); return [!!a, m.clWhen(), document.querySelector('#mk-toast').textContent]; });
    assert.deepEqual(runPosts, [{ quando: 'abrir' }], 'uma só corrida: a segunda espera por esta');
    assert.ok(corrida[0]);
    assert.match(corrida[1], / · a nova vem a caminho \(pedida às \d\d:\d\d\)$/);
    assert.equal(corrida[2], 'O Claude está a fazer a análise nova: fica pronta em poucos minutos.');
    await page.evaluate(() => { const m = window.__mk; m.st.runAt = null; m.st.naHora = false; });
    // dias de execução: com 2 e 16, cada execução leva metade
    await page.click('#mk-nav [data-tab="ajustes"]');
    await page.click('[data-sday="16"]');
    await page.click('#mk-nav [data-tab="painel"]');
    const exTxt = await page.locator('.today > summary .hj-ex').textContent(); // o total (ou, num dia de agir, os valores por ativo)
    const ex = [...exTxt.matchAll(/(\d[\d\s\u00a0\u202f]*)\s*€/g)].map((m) => m[0].trim());
    const exTot = ex.reduce((a, t) => a + Number(t.replace(/[^\d,]/g, '').replace(',', '.')), 0);
    assert.ok(Math.abs(exTot - 450) <= 3, 'execução = 450 €: ' + ex.join(' + '));
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-act="ics"]')]);
    const icsPath = await dl.path(); const ics = fs.readFileSync(icsPath, 'utf8');
    assert.match(ics, /RRULE:FREQ=MONTHLY;BYMONTHDAY=1\r\n/); assert.match(ics, /BYMONTHDAY=15/);
    console.log('✓ execução', ex.join(' + '), '| lembretes .ics dias 1 e 15');

    // Finnhub: chave guardada → ações dos EUA em tempo real
    await page.click('#mk-nav [data-tab="ajustes"]');
    await page.fill('#f-fh', 'chave-teste');
    await page.click('[data-act="save-fh"]');
    await page.waitForFunction(() => window.__mk.Q.NVDA && window.__mk.Q.NVDA.price === 250, null, { timeout: 10000 });
    assert.ok(fhSubs >= 10, 'subscreveu as ações dos EUA: ' + fhSubs);
    console.log('✓ Finnhub: Nvidia em tempo real (', fhSubs, 'subscrições)');

    // ajustes: juntar uma ação
    await page.click('#mk-nav [data-tab="ajustes"]');
    await page.fill('#f-add', 'mota');
    await page.click('[data-add="EGL.LS"]');
    await page.waitForFunction(() => window.__mk.cfg.watch.includes('EGL.LS'));
    assert.ok(await page.locator('.wl-i:has-text("Mota-Engil")').count());
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, '5-ajustes.png') });
    console.log('✓ ajustes: Mota-Engil junta à lista');

    // ao vivo
    const before = wsMsgs; await page.waitForTimeout(1200);
    assert.ok(wsMsgs > before, 'WebSocket a mandar preços');

    // largura: sem scroll horizontal
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    assert.equal(overflow, false, 'sem scroll horizontal');

    // compras de cripto: isenção de IRS aos 365 dias
    await page.click('#mk-nav [data-tab="painel"]');
    await page.click('.sec:has(h2:text("Os meus ativos")) [data-open="c:SOL"]');
    await page.waitForSelector('.tax-box');
    assert.match(await page.locator('.tax-box').textContent(), /Indica quando compraste/);
    const iso = (n) => { const d = new Date(Date.now() - n * 864e5); return d.toISOString().slice(0, 10); };
    await page.fill('#lot-d', iso(400)); await page.fill('#lot-e', '200'); await page.click('[data-act="lot-add"]');
    await page.fill('#lot-d', iso(100)); await page.fill('#lot-e', '100'); await page.click('[data-act="lot-add"]');
    await page.waitForSelector('.tax-box .lots li >> nth=1');
    const tx = await page.locator('.tax-box .tx-head').textContent();
    assert.match(tx, /1 de 2 compras já isentas \(200\s€ de 300\s€\)\. A próxima fica isenta a \d\d\/\d\d\/\d{4} — faltam 26\d dias/, tx);
    // as compras vão juntas, 4 s depois da última mudança (uma escrita no KV, não uma por campo)
    for (let i = 0; i < 40 && !(lotPosts.length && lotPosts.at(-1)['c:SOL'] && lotPosts.at(-1)['c:SOL'].buys.length === 2); i++) await page.waitForTimeout(250);
    assert.ok(lotPosts.length >= 1 && lotPosts.at(-1)['c:SOL'].buys.length === 2, 'compras enviadas ao conector (para o Claude), de uma vez');
    await page.click('.tax-box [data-lotrm] >> nth=0');
    await page.waitForFunction(() => document.querySelectorAll('.tax-box .lots li').length === 1);
    await page.fill('#lot-plan', iso(500)); await page.click('[data-act="lot-plan"]');
    await page.waitForFunction(() => /Plano mensal desde/.test(document.querySelector('.tax-box').textContent));
    if (SHOTS) { await page.locator('.tax-box').scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(SHOTS, '6-compras-cripto.png') }); }
    console.log('✓ compras de cripto:', (await page.locator('.tax-box .tx-head').textContent()).trim());
    await page.click('[data-act="close"] >> nth=-1');
    await page.waitForFunction(() => document.querySelector('#mk-sheet').hidden);
    assert.match(await page.locator('.sec:has(h2:text("Os meus ativos")) [data-key="c:SOL"] .r-sub').textContent(), /isentas · próxima em \d+ d|isenta em \d+ d/);
    assert.match(await page.locator('.sec:has(h2:text("Os meus ativos")) [data-key="c:XRP"] .r-sub').textContent(), /[−+]?\d+,\d% do máximo$/, 'sem datas de compra: não há texto');
    // sem conselho do Claude: sinal automático marcado "auto"
    assert.equal(await page.locator('.sec:has(h2:text("Os meus ativos")) .row[data-key="c:XRP"] .badge.auto').count(), 1, 'XRP com sinal automático');
    assert.doesNotMatch(await page.locator('.sec:has(h2:text("Os meus ativos")) .row[data-key="c:XRP"] .badge.auto').textContent(), /\//, 'etiqueta curta');
    // ações (lista fechada): ao abrir, os gráficos pequenos aparecem
    const drawn = await page.evaluate(() => [...document.querySelectorAll('.sec:has(h2) .row canvas.spark')].filter((c) => c.closest('.sec').querySelector('h2').textContent === 'Ações que sigo').map((c) => { const g = c.getContext('2d'); if (!c.width) return 0; const d = g.getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) n += d[i] > 0; return n; }));
    assert.ok(drawn.length > 5 && drawn.filter((n) => n > 0).length === drawn.length, 'gráficos em todas as ações: ' + drawn.join(','));
    // período dos meus ativos (4.41, a barra deles): 1M muda a variação (dados diários) e volta a 1D
    const d1 = await page.locator('.sec:has(h2:text("Os meus ativos")) .row[data-key="c:BTC"] .chg').textContent();
    await page.click('[data-pera="1m"]');
    await page.waitForFunction(() => window.__mk.PS['1m']['c:BTC'], null, { timeout: 15000 });
    await page.evaluate(() => window.__mk.render());
    const m1 = await page.locator('.sec:has(h2:text("Os meus ativos")) .row[data-key="c:BTC"] .chg').textContent();
    assert.notEqual(m1, d1, '1M diferente de 1D');
    // a ficha abre no mesmo período do Painel
    await page.locator('.sec:has(h2:text("Os meus ativos")) .row[data-open="c:BTC"]').click();
    await page.waitForSelector('#mk-sheet:not([hidden]) .ranges button.on');
    assert.equal(await page.locator('.ranges button.on').textContent(), '1M', 'ficha no período do Painel');
    await page.waitForFunction(() => /1 mês/.test(document.querySelector('#d-px').textContent));
    const sheetM = await page.locator('#d-px .chg').textContent();
    const num = (t) => Number(t.replace('−', '-').replace('%', '').replace(',', '.'));
    assert.ok(Math.abs(num(sheetM) - num(m1)) < 0.2, `1M igual no Painel (${m1}) e na ficha (${sheetM})`);
    assert.deepEqual(await page.locator('.ranges button').allTextContents(), ['15m', '1H', '4H', '1D', '1S', '1M', '6M', '1A', '5A']);
    assert.match(await page.locator('.perf').textContent(), /Hoje[\s\S]*7 dias[\s\S]*30 dias[\s\S]*1 ano/, 'rendimentos por período');
    await page.click('.ranges [data-range="15m"]');
    await page.waitForFunction(() => /15 min/.test(document.querySelector('#d-px').textContent));
    await page.waitForFunction(() => document.querySelector('#d-load').hidden);
    await page.waitForFunction(() => [...document.querySelectorAll('#d-axis span')].every((e) => /^\d\d:\d\d$/.test(e.textContent)), null, { timeout: 10000 });
    const axis = await page.locator('#d-axis span').allTextContents();
    assert.equal(axis.length, 4, 'linha do tempo com 4 marcas');
    assert.ok(axis.every((t) => /^\d\d:\d\d$/.test(t)), '15 min: horas na linha do tempo ' + axis.join(' '));
    await page.click('[data-act="close"] >> nth=-1');
    await page.waitForFunction(() => document.querySelector('#mk-sheet').hidden);
    await page.click('[data-pera="1d"]');
    // com 1A no Painel, os Destaques continuam a mostrar a variação do dia, mesmo com preços ao vivo
    await page.click('[data-per="1y"]');
    await page.click('#mk-nav [data-tab="destaques"]');
    await page.waitForSelector('.sec:has(h2:text("Os meus ativos hoje")) .row[data-key="c:ETH"] .chg');
    await page.evaluate(() => { const mk = window.__mk; const q = mk.Q['c:ETH']; mk.Q['c:ETH'] = { ...q, price: q.price * 1.001, changePct: 0.45 }; });
    await page.waitForTimeout(1500);
    const ethDay = await page.evaluate(() => { const q = window.__mk.Q['c:ETH']; return q.changePct; });
    const ethTxt = await page.locator('.sec:has(h2:text("Os meus ativos hoje")) .row[data-key="c:ETH"] .chg').textContent();
    assert.ok(Math.abs(Number(ethTxt.replace('−', '-').replace('%', '').replace(',', '.')) - ethDay) < 0.05, `Destaques mostra o dia (${ethTxt} vs ${ethDay.toFixed(2)})`);
    await page.click('#mk-nav [data-tab="painel"]');
    await page.click('[data-per="1d"]');
    console.log('✓ período da variação: 1D', d1, '| 1M', m1);
    // os gráficos pequenos ficam todos na mesma coluna
    const sparkX = await page.evaluate(() => [...[...document.querySelectorAll('#mk-body > section.sec')].find((s) => s.querySelector('h2').textContent === 'Os meus ativos').querySelectorAll('.sw-list canvas.spark')].map((c) => Math.round(c.getBoundingClientRect().right)));
    assert.ok(sparkX.length >= 4 && new Set(sparkX).size === 1, 'gráficos alinhados: ' + sparkX);
    const wSpark = await page.evaluate(() => Math.round(document.querySelector('.row.wide canvas.spark').getBoundingClientRect().width));
    assert.equal(wSpark, 84, 'gráfico à direita, 84 px: ' + wSpark);
    assert.doesNotMatch(await page.locator('.sec:has(h2:text("Os meus ativos"))').textContent(), /24 h|Acc · sem dividendos/, 'sem texto que não interessa');
    assert.equal(await page.locator('details[data-fold="pn-idx"] .row .r-sub').count(), 0, 'listas só com nome, preço e variação');

    // migração: as portuguesas da lista antiga saem; as que o utilizador juntou ficam
    await page.evaluate(() => { const c = JSON.parse(localStorage.getItem('mercados:v1')); c.watch = ['EDP.LS', 'NVDA', 'EGL.LS']; delete c.watchVer; localStorage.setItem('mercados:v1', JSON.stringify(c)); });
    // conselho anterior do Claude para um ativo que hoje não comentou (Ether)
    await page.evaluate(() => { const d = new Date(Date.now() - 2 * 864e5); const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        localStorage.setItem('mercados:clmem', JSON.stringify({ 'c:ETH': { s: 'c:ETH', key: 'hold', action: 'Manter', why: 'tendência longa ainda a subir', date: iso } })); });
    await page.reload();
    await page.waitForFunction(() => window.__mk && window.__mk.cfg.watchVer === 3);
    await page.waitForSelector('.today .cl-head', { state: 'attached' });
    assert.equal(await page.locator('details.today[open]').count(), 0, 'ao abrir a app: compacto');
    assert.match(await page.locator('.today > summary .tldr').textContent(), /Hoje: nada a fazer/, 'compacto mostra o resumo em 3 linhas');
    if (SHOTS) { await page.evaluate(() => window.scrollTo(0, 0)); await page.screenshot({ path: path.join(SHOTS, '7-painel-condensado.png') }); }
    // tocar para abrir funciona mesmo com o ecrã a atualizar logo a seguir (preços ao vivo)
    await page.evaluate(() => { document.querySelector('.today > summary').click(); window.__mk.render(); });
    assert.equal(await page.locator('details.today[open]').count(), 1, 'Hoje abre ao tocar, mesmo já lido');
    await page.evaluate(() => { document.querySelector('.today > summary').click(); window.__mk.render(); });
    assert.equal(await page.locator('details.today[open]').count(), 0, 'e volta a fechar');
    console.log('✓ análise do Claude lida fica condensada');
    await page.click('#mk-nav [data-tab="painel"]');
    await page.waitForSelector('.sec:has(h2:text("Os meus ativos")) .row[data-key="c:ETH"] .badge');
    assert.match(await page.locator('.sec:has(h2:text("Os meus ativos")) .row[data-key="c:ETH"] .badge').textContent(), /Manter/);
    await page.locator('.row[data-open="c:ETH"]').first().click();
    await page.waitForSelector('.advice .adv-src');
    assert.match(await page.locator('.advice .adv-src').textContent(), /Análise do Claude de \d\d\/\d\d · último comentário/);
    await page.click('[data-act="close"] >> nth=-1');
    await page.waitForFunction(() => document.querySelector('#mk-sheet').hidden);
    console.log('✓ Ether sem comentário hoje: fica o último conselho do Claude');
    const w = await page.evaluate(() => window.__mk.cfg.watch);
    assert.ok(!w.includes('EDP.LS') && w.includes('EGL.LS') && w.includes('JPM'), 'migração: ' + w.join(','));
    console.log('✓ migração da lista: sai EDP, fica Mota-Engil, entra JPMorgan');

    // avisos: vários movimentos numa só notificação; à noite esperam pela manhã
    await page.click('#mk-nav [data-tab="ajustes"]');
    assert.equal(await page.locator('[data-act="quiet"][data-v="1"].on').count(), 1, 'silêncio à noite ligado por omissão');
    const notes = await page.evaluate(() => {
        const out = [];
        Object.defineProperty(navigator, 'serviceWorker', { value: undefined, configurable: true });
        window.Notification = function (t, o) { out.push(t + ' | ' + o.body); };
        window.Notification.permission = 'granted';
        const mk = window.__mk, A = window.AnaliseOnda, isQ = A.isQuiet;
        mk.cfg.notify = true; mk.cfg.alertPct = 4; mk.st.firstPoll = false;
        const set = (k, p) => { mk.Q[k] = { ...mk.Q[k], changePct: p }; };
        set('AMD', 12.3); mk.checkAlerts();
        const notMine = out.length; // AMD é da lista de origem: não avisa
        A.isQuiet = () => true; set('c:ETH', 9.1); set('c:SOL', 8.2); mk.checkAlerts();
        const night = out.length, held = JSON.parse(localStorage.getItem('mercados:held'));
        A.isQuiet = () => false; mk.checkAlerts();
        set('c:XRP', -12.5); mk.checkAlerts();
        A.isQuiet = isQ;
        return { night, held, out, notMine };
    });
    assert.equal(notes.notMine, 0, 'AMD (lista de origem) não gera aviso');
    assert.equal(notes.night, 0, 'nada à noite');
    assert.deepEqual(notes.held.sort(), ['c:ETH', 'c:SOL']);
    assert.match(notes.out[0], /^Durante a noite: 2 ativos a subir \| Ether \+9,1\d?% · Solana \+8,2\d?%/);
    assert.match(notes.out[1], /^XRP cai −12,5\d?% hoje \|/);
    assert.equal(notes.out.length, 2);
    console.log('✓ avisos:', notes.out.map((x) => x.split(' | ')[0]).join(' / '));

    // combustíveis por concelho (ex.: Santo Tirso)
    await page.click('#mk-nav [data-tab="ajustes"]');
    await page.waitForSelector('#f-dist option[value="13"]', { state: 'attached' });
    const fuelReq = page.waitForRequest((r) => /\/fuel\?distrito=13&municipio=1316/.test(r.url()), { timeout: 10000 });
    await page.selectOption('#f-dist', '13');
    await page.waitForSelector('#f-mun option[value="1316"]', { state: 'attached' });
    await page.selectOption('#f-mun', '1316');
    await fuelReq;
    await page.click('#mk-nav [data-tab="painel"]');
    await page.waitForSelector('details[data-fold="pn-fuel"] > summary:has-text("Combustíveis em Santo Tirso")');
    console.log('✓ combustíveis no concelho de Santo Tirso');
    // tocar no combustível → lista de postos, do mais barato
    await page.click('details[data-fold="pn-fuel"] > summary');
    await page.click('button.card.fuel[data-fuel="3201"]');
    await page.waitForSelector('.fu-list .st-row');
    assert.equal(await page.locator('.fu-list .st-row').count(), 3);
    assert.match(await page.locator('.fu-list .st-row').first().textContent(), /Prio Torres Novas[\s\S]*o mais barato/);
    assert.match(await page.locator('.fu-list .st-row').nth(1).textContent(), /\+0,150/);
    assert.match(await page.locator('.fu-list .st-row').first().getAttribute('href'), /maps\.apple\.com\/\?ll=39\.48,-8\.54/);
    assert.match(await page.locator('#mk-sheet-card').textContent(), /poupa cerca de 7,50/);
    await page.click('[data-act="close"] >> nth=-1');
    await page.waitForFunction(() => document.querySelector('#mk-sheet').hidden);
    console.log('✓ lista de postos ao tocar na gasolina');

    // app do dono: quantas apps se ligam, ligar/desligar o Claude para as outras, toda a Trade Republic
    await page.click('#mk-nav [data-tab="ajustes"]');
    await page.waitForSelector('.share-st');
    const shareTxt = await page.locator('.sec:has(h2:text("Partilha da app"))').textContent();
    assert.match(shareTxt, /2\s*hoje\s*4\s*7 dias\s*5\s*30 dias\s*1\s*com o Claude/);
    assert.match(shareTxt, /1 analisada/);
    assert.match(await page.locator('#f-share').inputValue(), /\?proxy=https%3A%2F%2Fproxy\.test$/);
    await page.click('[data-others="0"]');
    await page.waitForFunction(() => document.querySelector('[data-others="0"]').classList.contains('on'));
    assert.equal(ownerPosts.at(-1).others, false);
    await page.click('[data-others="1"]');
    await page.waitForFunction(() => document.querySelector('[data-others="1"]').classList.contains('on'));
    assert.equal(await page.locator('h2:text-is("Análise do Claude")').count(), 0, 'o dono não precisa de ligar');
    await page.click('#mk-nav [data-tab="analise"]');
    await page.click('[data-filter="all"]');
    await page.click('.seg.hz [data-hz="long"]');
    // toda a TR: classificação automática, fechada; abre ao tocar e fica aberta quando o ecrã se atualiza
    await page.waitForSelector('details.uni', { state: 'attached' });
    await page.click('details.uni > summary');
    await page.waitForSelector('details.uni[open] .row');
    await page.evaluate(() => window.__mk.render());
    assert.equal(await page.locator('details.uni[open]').count(), 1, 'toda a TR fica aberta ao atualizar');
    assert.deepEqual([await page.locator('details.uni .f-t').textContent(), await page.locator('details.uni .f-n').textContent()], ['Toda a Trade Republic', '3'], 'uma linha: toda a Trade Republic e quantos');
    const uniRows = await page.locator('details.uni .row .r-name').allTextContents();
    assert.deepEqual(uniRows, ['iShares NASDAQ 100 ETF', 'PUMA', 'Cardano'], 'ordenada pela pontuação a longo prazo');
    assert.equal(await page.locator('details.uni .row[data-open="PUM.DE"] .lbl').textContent(), 'Comprar', 'o que o Claude escolheu da lista toda traz o veredicto dele');
    assert.equal(await page.locator('details.uni .row[data-open="ADA-EUR"] .r-ico').textContent(), 'ADA', 'cripto: o símbolo no ícone');
    assert.equal(await page.locator('details.uni .row[data-open="ADA-EUR"] .r-sub').textContent(), 'ADA-EUR · +2,10%', 'símbolo e variação do dia');
    await page.click('details.uni .row[data-open="PUM.DE"]');
    await page.waitForFunction(() => !document.querySelector('#mk-sheet').hidden && /PUMA/.test(document.querySelector('#mk-sheet-card').textContent));
    assert.equal(await page.locator('#mk-sheet .dec-box h3').textContent(), 'Decisão');
    const dPum = await page.evaluate(() => window.__mk.decOf('PUM.DE'));
    assert.deepEqual([dPum.manda, dPum.fam], ['claude', 1], 'o veredicto do Claude para um ativo da lista toda');
    assert.equal(await page.locator('#mk-sheet .dec-box .adv-act').textContent(), 'Comprar' + (dPum.forte ? ' forte' : ''), 'forte só com a média das fontes em 70 ou mais e ninguém contra');
    assert.equal(await page.locator('#mk-sheet .dec-box .adv-nu').count(), 0, 'sem pormenor quando a frase é o próprio rótulo');
    await page.click('[data-act="close"] >> nth=-1');
    await page.waitForFunction(() => document.querySelector('#mk-sheet').hidden);
    // um da lista toda que o Claude não analisou: o sinal automático, marcado (e os impostos da cripto)
    await page.click('details.uni .row[data-open="ADA-EUR"]');
    await page.waitForSelector('#mk-sheet:not([hidden]) .advice .adv-src');
    assert.equal(await page.locator('#mk-sheet .advice .adv-src').textContent(), 'Média das fontes · o Claude não analisou este ativo');
    const dAda = await page.evaluate(() => window.__mk.decOf('ADA-EUR'));
    assert.equal(dAda.manda, 'voto', 'sem o Claude decide a média das fontes');
    assert.equal(await page.locator('#mk-sheet .dec-box .dec-f li .dec-r b').first().textContent(), 'Técnica');
    assert.equal(await page.locator('#mk-sheet .dec-box .cl-lv').count(), 0, 'sem níveis: são do Claude');
    assert.match(await page.locator('#mk-sheet details.sh-auto .fx-box').textContent(), /365 dias ou mais está isento/);
    await page.click('[data-act="close"] >> nth=-1');
    await page.waitForFunction(() => document.querySelector('#mk-sheet').hidden);
    console.log('✓ dono: partilha (apps ligadas) e toda a Trade Republic em Análise (com as escolhas do Claude)');

    // sem avisos: nada de "não é aconselhamento" e afins; em Ajustes → Sobre só uma linha neutra
    const BANNED = /aconselhamento|não dizem o que comprar|só informação|valida antes|não garante|contabilista|confirma sempre|informação geral/i;
    for (const tab of ['painel', 'destaques', 'analise', 'ajustes']) {
        await page.click(`#mk-nav [data-tab="${tab}"]`); await page.waitForTimeout(150);
        assert.doesNotMatch(await page.locator('#mk-body').textContent(), BANNED, `${tab}: sem avisos`);
    }
    assert.equal(await page.locator('#sobre .about-own').textContent(), 'Ferramenta pessoal; as decisões e a execução são tuas.');
    assert.equal((await page.locator('#mk-body').textContent()).split('Ferramenta pessoal').length, 2, 'uma só vez');
    await page.click('#mk-nav [data-tab="painel"]');
    for (const k of ['c:SOL', 'VWCE.DE']) {
        await page.locator(`.row[data-open="${k}"]`).first().click();
        await page.waitForSelector('#mk-sheet:not([hidden]) .advice');
        assert.doesNotMatch(await page.locator('#mk-sheet-card').textContent(), BANNED, `ficha ${k}: sem avisos`);
        await page.click('[data-act="close"] >> nth=-1');
        await page.waitForFunction(() => document.querySelector('#mk-sheet').hidden);
    }
    console.log('✓ sem avisos nem ressalvas; em Sobre: "Ferramenta pessoal; as decisões e a execução são tuas."');

    // análise antiga no KV (formato até à 3.x, antes da primeira corrida nova): a app continua a funcionar
    ADV.doc = ADV_V1;
    await page.evaluate(() => localStorage.removeItem('mercados:clmem'));
    await page.reload();
    await page.waitForFunction(() => window.__mk && window.__mk.st.yahooAt > 0);
    await page.click('#mk-nav [data-tab="analise"]');
    await page.click('[data-filter="all"]');
    await page.click('.seg.hz [data-hz="mid"]');
    await page.waitForFunction(() => /^Algoritmo/.test((document.querySelector('.an-src') || {}).textContent || '') && document.querySelectorAll('.an-list .row').length > 20, null, { timeout: 15000 });
    assert.equal(await page.locator('.an-src').textContent(), 'Algoritmo · veredicto do Claude');
    const oldNums = (await page.locator(lst + ' .r-score .val').allTextContents()).map(Number);
    assert.deepEqual(oldNums, [...oldNums].sort((a, b) => b - a), 'sem convicção do Claude: ordenada pelo algoritmo');
    assert.equal(await page.locator(lst + ' .row[data-open="c:BTC"] .lbl').textContent(), 'Manter', 'o veredicto antigo aparece na linha');
    await page.locator(lst + ' .row[data-open="c:BTC"]').click();
    await page.waitForSelector('#mk-sheet:not([hidden]) .advice .adv-act');
    assert.equal(await page.locator('#mk-sheet .advice .adv-act').textContent(), 'Manter');
    assert.equal(await page.locator('#mk-sheet .cl-conv').count(), 0, 'formato antigo: sem convicção por prazo');
    await page.click('[data-act="close"] >> nth=-1');
    await page.waitForFunction(() => document.querySelector('#mk-sheet').hidden);
    console.log('✓ formato antigo da análise: veredicto na ficha, classificação pelo algoritmo (marcada)');

    // outra app: a análise do Claude vem desligada; liga-se em Ajustes e chega só a dela
    ME.owner = false;
    await page.evaluate(() => { const c = JSON.parse(localStorage.getItem('mercados:v1')); c.owner = false; c.claude = false; localStorage.setItem('mercados:v1', JSON.stringify(c)); localStorage.removeItem('mercados:clmem'); });
    await page.reload();
    await page.click('#mk-nav [data-tab="painel"]');
    await page.waitForSelector('.today > summary');
    await page.waitForTimeout(800);
    assert.match(await page.locator('.today > summary').textContent(), /Resumo automático/);
    assert.equal(await page.locator('.today .cl-head').count(), 0, 'sem a análise do dono');
    await page.click('#mk-nav [data-tab="analise"]');
    await page.waitForSelector('.an-list');
    assert.equal(await page.locator('details.uni').count(), 0, 'toda a TR só na app do dono');
    await page.click('#mk-nav [data-tab="ajustes"]');
    assert.equal(await page.locator('h2:text("Partilha da app")').count(), 0);
    ME.advice = { date: '2026-11-07', generatedAt: '2026-11-07T07:21:00Z', short: true, headline: 'Só os teus ativos', tldr: ['Mercado: calmo.', 'Os teus ativos: manter.', 'Atenção: nada.'], actions: [{ s: 'c:BTC', key: 'hold', action: 'Manter', why: 'tendência longa a subir' }], movers: [] };
    await page.click('[data-claude="1"]');
    assert.equal(claudePosts.at(-1).claude, true);
    assert.ok(claudePosts.at(-1).my.includes('VWCE.DE'), 'envia a lista desta app');
    await page.click('#mk-nav [data-tab="painel"]');
    await page.waitForSelector('.today .cl-head', { state: 'attached' });
    assert.equal(await page.locator('.today .cl-head').textContent(), 'Só os teus ativos');
    assert.equal(await page.locator('.today .tldr .tl').count(), 3);
    await page.click('#mk-nav [data-tab="ajustes"]');
    await page.click('[data-claude="0"]');
    assert.equal(claudePosts.at(-1).claude, false);
    await page.click('#mk-nav [data-tab="painel"]');
    await page.waitForFunction(() => !document.querySelector('.today .cl-head'));
    console.log('✓ outra app: Claude desligado por omissão, liga em Ajustes e recebe a análise dos seus ativos');

    assert.deepEqual(errors, [], 'sem erros na consola');
    console.log('✓ sem erros na consola');
    await browser.close();
    server.close();
    console.log('UI OK');
})().catch((e) => { console.error('FALHOU:', e); process.exit(1); });
