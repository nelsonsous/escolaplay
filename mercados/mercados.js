// Mercados — app (sem dependências)
//
// Fontes:
//  - Cripto: Binance (WebSocket em tempo real; REST e CoinGecko de recurso).
//    Funciona logo, sem configurar nada.
//  - Petróleo, combustíveis, índices, ações e notícias: o conector próprio
//    (Cloudflare Worker em proxy/), que lê o Yahoo Finance, o Google Notícias
//    e a DGEG. O endereço do conector fica nos Ajustes (ou ?proxy=URL).
(() => {
    'use strict';
    const A = window.Analise;
    const VERSION = '3.7.0';

    // ---------- utilitários ----------
    const $ = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => [...r.querySelectorAll(s)];
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const fin = (x) => typeof x === 'number' && Number.isFinite(x);
    const now = () => Date.now();
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const safeUrl = (u) => /^https?:\/\//i.test(String(u || '')) ? String(u) : '#';

    // ---------- ativos ----------
    const CRYPTO = [
        { id: 'BTC', name: 'Bitcoin', cg: 'bitcoin' },
        { id: 'ETH', name: 'Ether', cg: 'ethereum' },
        { id: 'SOL', name: 'Solana', cg: 'solana' },
        { id: 'XRP', name: 'XRP', cg: 'ripple' },
    ];
    const ENERGY = [
        { sym: 'BZ=F', name: 'Petróleo Brent', unit: 'barril', news: ['petróleo Brent preço', 'oil prices Brent'] },
        { sym: 'CL=F', name: 'Petróleo WTI', unit: 'barril', news: ['petróleo WTI preço', 'WTI crude oil'] },
        { sym: 'RB=F', name: 'Gasolina (RBOB)', unit: 'galão', perLitre: true, news: ['preço gasolina', 'gasoline futures'] },
        { sym: 'HO=F', name: 'Gasóleo (ULSD)', unit: 'galão', perLitre: true, news: ['preço gasóleo', 'diesel prices'] },
        { sym: 'NG=F', name: 'Gás natural', unit: 'MMBtu', news: ['gás natural preço', 'natural gas prices'] },
    ];
    const INDICES = [
        { sym: '^GSPC', name: 'S&P 500', points: true },
        { sym: '^IXIC', name: 'Nasdaq', points: true },
        { sym: '^STOXX50E', name: 'Euro Stoxx 50', points: true },
        { sym: 'PSI20.LS', name: 'PSI (Lisboa)', points: true },
        { sym: '^VIX', name: 'VIX (medo)', points: true },
        { sym: 'EURUSD=X', name: 'EUR/USD', points: true, decimals: 4 },
        { sym: 'GC=F', name: 'Ouro', unit: 'onça' },
    ];
    // Universo por omissão: grandes empresas mundiais que se compram na Trade Republic (EUA, Europa, Ásia).
    // Ações portuguesas ficam de fora até se confirmar que estão na TR (o utilizador pode juntá-las em Ajustes).
    const NAMES = {
        AAPL: 'Apple', MSFT: 'Microsoft', NVDA: 'Nvidia', AMZN: 'Amazon', GOOGL: 'Alphabet (Google)', META: 'Meta', TSLA: 'Tesla',
        AVGO: 'Broadcom', JPM: 'JPMorgan', V: 'Visa', LLY: 'Eli Lilly', 'BRK-B': 'Berkshire Hathaway', PLTR: 'Palantir', AMD: 'AMD',
        'ASML.AS': 'ASML', 'SAP.DE': 'SAP', 'MC.PA': 'LVMH', 'SIE.DE': 'Siemens', 'NOVO-B.CO': 'Novo Nordisk', 'ALV.DE': 'Allianz',
        'TTE.PA': 'TotalEnergies', 'RHM.DE': 'Rheinmetall', TSM: 'TSMC (Taiwan)',
    };
    const DEFAULT_WATCH = Object.keys(NAMES);
    // lista antiga (até à 1.7): ao migrar, saem as que não estão na nova; ficam as que o utilizador juntou
    const OLD_DEFAULT = ['EDP.LS', 'GALP.LS', 'JMT.LS', 'BCP.LS', 'EDPR.LS', 'NOS.LS', 'NVG.LS', 'SON.LS', 'CTT.LS', 'ASML.AS', 'SAP.DE', 'MC.PA', 'SIE.DE',
        'NOVO-B.CO', 'RHM.DE', 'NVDA', 'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'META', 'TSLA', 'AMD', 'PLTR', 'NFLX', 'AVGO', 'COIN', 'MSTR'];
    Object.assign(NAMES, { 'EDP.LS': 'EDP', 'GALP.LS': 'Galp', 'JMT.LS': 'Jerónimo Martins', 'BCP.LS': 'BCP', 'EDPR.LS': 'EDP Renováveis', 'NOS.LS': 'NOS',
        'NVG.LS': 'Navigator', 'SON.LS': 'Sonae', 'CTT.LS': 'CTT', NFLX: 'Netflix', COIN: 'Coinbase', MSTR: 'Strategy' });
    // Fundos/ETF: histórico da bolsa principal; preço da noite de Munique (gettex, até às 22 h),
    // que fica perto do que a Trade Republic mostra (LS Exchange, até às 23 h)
    // ETF muito usados na Trade Republic (planos de poupança), cotados na Xetra em euros
    const FUND_NAMES = {
        'VWCE.DE': 'FTSE All-World (VWCE)', 'EUNL.DE': 'MSCI World (iShares)', 'SXR8.DE': 'S&P 500 (iShares)',
        'SXRV.DE': 'Nasdaq-100 (iShares)', 'IS3N.DE': 'Mercados emergentes (iShares)', 'EXSA.DE': 'Europa 600 (iShares)',
        '4GLD.DE': 'Ouro físico (Xetra-Gold)',
    };
    // Acumulação: sem dividendos (nada a declarar até vender). Distribuição: dividendos a declarar todos os anos.
    const FUND_TYPE = { 'VWCE.DE': 'acc', 'EUNL.DE': 'acc', 'SXR8.DE': 'acc', 'SXRV.DE': 'acc', 'IS3N.DE': 'acc', 'EXSA.DE': 'dist', '4GLD.DE': 'etc' };
    const LIVE = { 'VWCE.DE': 'VWCE.MU', 'EUNL.DE': 'EUNL.MU', 'SXR8.DE': 'SXR8.MU', 'SXRV.DE': 'SXRV.MU', 'IS3N.DE': 'IS3N.MU' };
    const DEFAULT_FUNDS = Object.keys(FUND_NAMES);

    // ---------- configuração ----------
    const KEY = 'mercados:v1', SNAP = 'mercados:snap';
    const DEFAULTS = { proxy: '', fiat: 'EUR', watch: DEFAULT_WATCH, funds: DEFAULT_FUNDS, eur: true, alertPct: 4, notify: false, distrito: '', municipio: '', sort: 'chg', tab: 'painel', filter: 'all', hz: 'mid', budget: 0, profile: 'bal', brief: true, saveDays: [2], jid: '', jLast: '', strategy: 'etfcrypto', cryptoPct: 10, cryptoMix: 'btc', coreFund: 'VWCE.DE', holdings: ['VWCE.DE', 'c:BTC', 'c:ETH', 'c:SOL', 'c:XRP'], lots: {}, seen: {}, fs: 'n', quiet: true, hidden: [] };
    const store = {
        get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } },
        set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sem armazenamento */ } },
    };
    const cfg = { ...DEFAULTS, ...(store.get(KEY) || {}) };
    if (!Array.isArray(cfg.watch)) cfg.watch = DEFAULT_WATCH.slice();
    if (!Array.isArray(cfg.funds)) cfg.funds = DEFAULT_FUNDS.slice();
    if (!cfg.jid) { cfg.jid = (crypto.randomUUID ? crypto.randomUUID() : 'j' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10)).toLowerCase(); store.set(KEY, cfg); }
    if (!Array.isArray(cfg.saveDays) || !cfg.saveDays.length) cfg.saveDays = [2];
    // 1.9: a estratégia passa a ETF + cripto a longo prazo (o que o teste de 2 anos e o investidor indicaram)
    if (!Array.isArray(cfg.holdings) || !cfg.holdings.length) cfg.holdings = ['VWCE.DE', 'c:BTC', 'c:ETH', 'c:SOL', 'c:XRP'];
    if (!cfg.lots || typeof cfg.lots !== 'object' || Array.isArray(cfg.lots)) cfg.lots = {};
    if (!cfg.seen || typeof cfg.seen !== 'object') cfg.seen = {};
    if (!Array.isArray(cfg.hidden)) cfg.hidden = [];
    if ((cfg.stratVer || 0) < 1) { cfg.hz = 'long'; cfg.filter = 'plan'; cfg.stratVer = 1; store.set(KEY, cfg); }
    if ((cfg.watchVer || 1) < 3) {
        const mine = (cfg.watch || []).filter((x) => !OLD_DEFAULT.includes(x));
        cfg.watch = DEFAULT_WATCH.concat(mine.filter((x) => !DEFAULT_WATCH.includes(x)));
        cfg.watchVer = 3;
    }
    if ((cfg.fundsVer || 1) < 2) { for (const f of DEFAULT_FUNDS) if (!cfg.funds.includes(f)) cfg.funds.push(f); cfg.fundsVer = 2; }
    const saveCfg = () => store.set(KEY, cfg);
    {
        const p = new URLSearchParams(location.search).get('proxy');
        if (p && /^https:\/\//.test(p)) { cfg.proxy = p.replace(/\/+$/, ''); saveCfg(); history.replaceState(null, '', location.pathname); }
    }

    // registo de ativos: chave → definição
    const REG = {};
    function buildReg() {
        for (const k of Object.keys(REG)) if (!REG[k].temp) delete REG[k];
        CRYPTO.forEach((c) => { REG['c:' + c.id] = { key: 'c:' + c.id, kind: 'crypto', sym: c.id, name: c.name, cg: c.cg }; });
        ENERGY.forEach((e) => { REG[e.sym] = { key: e.sym, kind: 'energy', ...e }; });
        INDICES.forEach((e) => { REG[e.sym] = { key: e.sym, kind: 'index', ...e }; });
        cfg.watch.forEach((s) => { if (!REG[s] || REG[s].temp) REG[s] = { key: s, kind: 'stock', sym: s, name: NAMES[s] || s }; });
        cfg.funds.forEach((s) => { if (!REG[s] || REG[s].temp || REG[s].kind !== 'fund') REG[s] = { key: s, kind: 'fund', sym: s, name: FUND_NAMES[s] || NAMES[s] || s, live: LIVE[s] }; });
        // auxiliares (não aparecem nas listas): preço da noite e câmbios para euros
        for (const a of Object.values(REG)) if (a.live && !REG[a.live]) REG[a.live] = { key: a.live, kind: 'aux', sym: a.live, name: a.live };
        for (const c of fxNeeded) { const k = 'EUR' + c + '=X'; if (!REG[k]) REG[k] = { key: k, kind: 'aux', sym: k, name: k }; }
    }
    const fxNeeded = new Set();
    const isHolding = (k) => !!REG[k] && (REG[k].kind === 'stock' || REG[k].kind === 'fund');
    const listed = (k) => !!REG[k] && !REG[k].temp && REG[k].kind !== 'aux';
    // o que se compra diretamente numa corretora como a Trade Republic (futuros e índices não)
    const investable = (k) => listed(k) && ['stock', 'fund', 'crypto'].includes(REG[k].kind);
    const etfCrypto = () => cfg.strategy !== 'mix';
    // ativos do plano: o fundo núcleo e a cripto escolhida
    const planKeys = () => [cfg.coreFund].concat(cfg.cryptoMix === 'btceth' ? ['c:BTC', 'c:ETH'] : ['c:BTC']).filter((k) => REG[k]);
    // o que o investidor tem (acompanhar e avisar), além do que compra todos os meses (planKeys)
    const holdingKeys = () => cfg.holdings.filter((k) => REG[k]);
    const inPlan = (k) => REG[k] && (REG[k].kind === 'fund' || REG[k].kind === 'crypto');
    const yahooKeys = () => Object.values(REG).filter((a) => a.kind !== 'crypto' && !a.temp).map((a) => a.key);
    const nameOf = (k) => (REG[k] && REG[k].name !== REG[k].sym ? REG[k].name : null) || (Q[k] && Q[k].name) || (REG[k] && REG[k].name) || k;

    // ---------- estado ----------
    const Q = {};       // chave → cotação ao vivo + série do dia
    const D = {};       // chave → fechos diários [[t, v]]
    const AN = {};      // chave → análise
    const NEWS = {};    // chave → { at, items }
    let FUEL = null, MOVERS = null, DISTRITOS = null;
    const MUNIC = {};
    const CAL = {};     // símbolo → { earnings, exDividend, dividend } (segundos)
    // Decisões de juros (dia do anúncio). Atualizar uma vez por ano: federalreserve.gov e ecb.europa.eu
    const MACRO = [
        ...['2026-01-28', '2026-03-18', '2026-04-29', '2026-06-17', '2026-07-29', '2026-09-16', '2026-10-28', '2026-12-09'].map((d) => ({ d, t: 'Fed decide os juros (EUA)' })),
        ...['2026-02-05', '2026-03-19', '2026-04-30', '2026-06-11', '2026-07-23', '2026-09-10', '2026-10-29', '2026-12-17'].map((d) => ({ d, t: 'BCE decide os juros (zona euro)' })),
    ];
    const st = { ws: 'off', wsSince: 0, cryptoAt: 0, cryptoSrc: '', yahooAt: 0, yahooErr: '', fuelErr: '', moversErr: '', firstPoll: true };
    const fired = new Set(store.get('mercados:fired') || []);

    buildReg();

    // instantâneo: mostrar logo os últimos valores ao abrir
    {
        const s = store.get(SNAP);
        if (s && s.Q) {
            for (const [k, v] of Object.entries(s.Q)) Q[k] = { ...v, stale: true };
            FUEL = s.FUEL || null;
            st.yahooAt = s.yahooAt || 0;
        }
    }
    let snapT = 0;
    function saveSnap() {
        if (now() - snapT < 15000) return;
        snapT = now();
        const q = {};
        for (const [k, v] of Object.entries(Q)) if (REG[k] && !REG[k].temp) q[k] = { ...v, series: (v.series || []).slice(-120), stale: undefined };
        store.set(SNAP, { Q: q, FUEL, yahooAt: st.yahooAt });
    }

    // ---------- vista da cotação: preço da noite e conversão para euros ----------
    function fxFactor(cur, prev) {
        if (!cur || cur === 'EUR') return 1;
        let c = cur, div = 1;
        if (c === 'GBp' || c === 'GBX') { c = 'GBP'; div = 100; }
        const fx = Q['EUR' + c + '=X'];
        const r = fx && (prev ? fx.prevClose || fx.price : fx.price);
        return fin(r) && r > 0 ? 1 / (r * div) : null;
    }
    function qv(k) {
        const q0 = Q[k];
        const a = REG[k];
        if (!q0 || !a || !isHolding(k) || a.temp) return q0 || {};
        let q = q0;
        const lv = a.live && Q[a.live];
        if (lv && fin(lv.price) && (lv.time || 0) > (q0.time || 0) && (lv.currency || q0.currency) === q0.currency) {
            const series = lv.series && lv.series.length > 1 ? lv.series.slice() : (q0.series || []).slice();
            if (lv.time && (!series.length || series[series.length - 1][0] < lv.time)) series.push([lv.time, lv.price]);
            q = { ...q0, price: lv.price, time: lv.time, open: lv.open, series, venue: 'Munique (gettex)',
                change: fin(q0.prevClose) ? lv.price - q0.prevClose : null, changePct: fin(q0.prevClose) ? (lv.price / q0.prevClose - 1) * 100 : q0.changePct };
        }
        if (!cfg.eur || !q.currency || q.currency === 'EUR') return q;
        const f = fxFactor(q.currency), fp = fxFactor(q.currency, true);
        if (!f || !fp) return q;
        const m = (v) => fin(v) ? v * f : v;
        const price = q.price * f, prev = fin(q.prevClose) ? q.prevClose * fp : null;
        return { ...q, price, prevClose: prev, change: prev ? price - prev : null, changePct: prev ? (price / prev - 1) * 100 : q.changePct,
            dayHigh: m(q.dayHigh), dayLow: m(q.dayLow), high52: m(q.high52), low52: m(q.low52),
            series: q.series && q.series.map(([t, v]) => [t, v * f]), currency: 'EUR', origCurrency: q.currency, origPrice: q.price, fx: f };
    }

    // ---------- formatação ----------
    const nf = {};
    const NF = (o) => { const k = JSON.stringify(o); return nf[k] || (nf[k] = new Intl.NumberFormat('pt-PT', o)); };
    function decimalsFor(v, a) {
        if (a && a.decimals != null) return a.decimals;
        const x = Math.abs(v);
        return x < 1 ? 4 : x < 10 ? 3 : x >= 10000 ? 0 : 2;
    }
    function fmtPx(v, a, cur) {
        if (!fin(v)) return '—';
        const d = decimalsFor(v, a);
        const c = a && a.points ? null : (cur || (Q[a && a.key] && Q[a.key].currency) || (a && a.kind === 'crypto' ? cfg.fiat : null));
        const o = { minimumFractionDigits: d, maximumFractionDigits: d };
        if (c && /^[A-Z]{3}$/.test(c)) { o.style = 'currency'; o.currency = c; }
        try { return NF(o).format(v) + (c === 'GBp' ? ' p' : ''); } catch { return v.toFixed(d); }
    }
    const fmtPct1 = (v) => fin(v) ? (v > 0.05 ? '+' : v < -0.05 ? '−' : '') + NF({ minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(Math.abs(v)) + '%' : '—';
    const fmtPct = (v) => fin(v) ? (v > 0 ? '+' : v < 0 ? '−' : '') + NF({ minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(v)) + '%' : '—';
    const fmtBig = (v) => fin(v) ? NF({ notation: 'compact', maximumFractionDigits: 1 }).format(v) : '—';
    const toneOf = (v) => !fin(v) ? 'flat' : v > 0.005 ? 'up' : v < -0.005 ? 'down' : 'flat';
    const chg = (v) => `<span class="chg ${toneOf(v)}">${fmtPct(v)}</span>`;
    function ago(ms) {
        if (!ms) return '—';
        const s = Math.round((now() - ms) / 1000);
        if (s < 5) return 'agora';
        if (s < 60) return `há ${s} s`;
        if (s < 3600) return `há ${Math.round(s / 60)} min`;
        return new Date(ms).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    }
    const hhmm = (sec) => sec ? new Date(sec * 1000).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : '';
    const dateLbl = (sec, withTime) => new Date(sec * 1000).toLocaleString('pt-PT', withTime ? { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' } : { day: '2-digit', month: 'short', year: 'numeric' });

    // ---------- rede ----------
    async function getJSON(url, ms = 12000) {
        const ctl = new AbortController();
        const t = setTimeout(() => ctl.abort(), ms);
        try {
            const r = await fetch(url, { signal: ctl.signal, cache: 'no-store' });
            const body = await r.json().catch(() => null);
            if (!r.ok) throw new Error((body && body.error) || `HTTP ${r.status}`);
            return body;
        } finally { clearTimeout(t); }
    }
    async function pxPost(path, body) {
        if (!cfg.proxy) throw new Error('Conector por configurar');
        const r = await fetch(cfg.proxy.replace(/\/+$/, '') + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const b = await r.json().catch(() => null);
        if (!r.ok) throw new Error((b && b.error) || `HTTP ${r.status}`);
        return b;
    }
    const px = (path, ms) => {
        if (!cfg.proxy) return Promise.reject(new Error('Conector por configurar'));
        return getJSON(cfg.proxy.replace(/\/+$/, '') + path, ms);
    };

    // ---------- cripto (Binance) ----------
    const BN_REST = ['https://data-api.binance.vision', 'https://api.binance.com'];
    const BN_WS = ['wss://data-stream.binance.vision/stream', 'wss://stream.binance.com:9443/stream'];
    const quoteCur = () => cfg.fiat === 'EUR' ? 'EUR' : 'USDT';
    const pairOf = (id) => id + quoteCur();
    const idOfPair = (p) => p.replace(/(EUR|USDT)$/, '');
    let ws = null, wsTry = 0, wsHost = 0, restTimer = null, wsOpened = false;

    async function bnGet(path) {
        let err;
        for (const b of BN_REST) { try { return await getJSON(b + path, 10000); } catch (e) { err = e; } }
        throw err;
    }

    function applyCrypto(id, d) {
        const k = 'c:' + id;
        const q = Q[k] || (Q[k] = { series: [] });
        const prev = q.price;
        Object.assign(q, d, { currency: cfg.fiat, stale: false, open: true });
        const t = Math.floor(now() / 1000);
        const s = q.series || (q.series = []);
        if (s.length && t - s[s.length - 1][0] < 900) s[s.length - 1][1] = q.price; else s.push([t, q.price]);
        if (s.length > 200) s.splice(0, s.length - 200);
        st.cryptoAt = now();
        patchLive(k, prev);
    }

    function startWS() {
        if (ws) { try { ws.onclose = null; ws.close(); } catch { /* já fechado */ } ws = null; }
        if (!('WebSocket' in window)) { startCryptoREST(); return; }
        const streams = CRYPTO.map((c) => pairOf(c.id).toLowerCase() + '@ticker').join('/');
        const sock = new WebSocket(`${BN_WS[wsHost % BN_WS.length]}?streams=${streams}`);
        ws = sock;
        st.ws = 'connecting';
        sock.onopen = () => { wsTry = 0; wsOpened = true; st.ws = 'on'; st.wsSince = now(); st.cryptoSrc = 'Binance (tempo real)'; stopCryptoREST(); renderStatus(); };
        sock.onmessage = (ev) => {
            let m; try { m = JSON.parse(ev.data); } catch { return; }
            const d = m && m.data;
            if (!d || !d.s) return;
            applyCrypto(idOfPair(d.s), {
                price: +d.c, changePct: +d.P, change: +d.p, prevClose: +d.x || null, dayHigh: +d.h, dayLow: +d.l, volume: +d.q, time: Math.floor(d.E / 1000),
            });
        };
        sock.onclose = () => {
            if (ws !== sock) return;
            ws = null; st.ws = 'off'; renderStatus();
            wsTry++; wsHost++;
            if (wsTry >= 2) startCryptoREST(); // enquanto o WebSocket não volta, preço por REST a cada 10 s
            setTimeout(() => { if (!ws) startWS(); }, Math.min(30000, 2000 * 2 ** Math.min(wsTry, 4)));
        };
        sock.onerror = () => { try { sock.close(); } catch { /* ignora */ } };
    }

    async function cryptoREST() {
        try {
            const pairs = CRYPTO.map((c) => pairOf(c.id));
            const arr = await bnGet(`/api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(pairs))}`);
            for (const t of arr) applyCrypto(idOfPair(t.symbol), { price: +t.lastPrice, changePct: +t.priceChangePercent, change: +t.priceChange, prevClose: +t.prevClosePrice || null, dayHigh: +t.highPrice, dayLow: +t.lowPrice, volume: +t.quoteVolume, time: Math.floor(t.closeTime / 1000) });
            st.cryptoSrc = 'Binance (a cada 10 s)';
        } catch {
            try { // último recurso: CoinGecko
                const cur = cfg.fiat.toLowerCase();
                const d = await getJSON(`https://api.coingecko.com/api/v3/simple/price?ids=${CRYPTO.map((c) => c.cg).join(',')}&vs_currencies=${cur}&include_24hr_change=true&include_24hr_vol=true`);
                for (const c of CRYPTO) {
                    const x = d[c.cg];
                    if (x && fin(x[cur])) applyCrypto(c.id, { price: x[cur], changePct: x[cur + '_24h_change'], volume: x[cur + '_24h_vol'] });
                }
                st.cryptoSrc = 'CoinGecko';
            } catch { st.cryptoSrc = ''; }
        }
        renderStatus();
    }
    function startCryptoREST() { if (!restTimer) { cryptoREST(); restTimer = setInterval(cryptoREST, 10000); } }
    function stopCryptoREST() { if (restTimer) { clearInterval(restTimer); restTimer = null; } }

    // ---------- ações dos EUA em tempo real (Finnhub, WebSocket grátis com chave do utilizador) ----------
    let fws = null, fwsTry = 0;
    const fhSym = (k) => k.replace('-', '.'); // BRK-B → BRK.B
    const usStocks = () => Object.keys(REG).filter((k) => REG[k].kind === 'stock' && !REG[k].temp && /^[A-Z]{1,5}(-[A-Z])?$/.test(k));
    function startFinnhub() {
        if (fws) { try { fws.onclose = null; fws.close(); } catch { /* já fechado */ } fws = null; }
        st.fh = '';
        if (!cfg.finnhub || !('WebSocket' in window)) return;
        const sock = new WebSocket('wss://ws.finnhub.io?token=' + encodeURIComponent(cfg.finnhub));
        fws = sock;
        sock.onopen = () => { fwsTry = 0; st.fh = 'on'; for (const k of usStocks()) sock.send(JSON.stringify({ type: 'subscribe', symbol: fhSym(k) })); renderStatus(); };
        sock.onmessage = (ev) => {
            let m; try { m = JSON.parse(ev.data); } catch { return; }
            if (m.type === 'error') { st.fh = 'erro: ' + (m.msg || ''); renderStatus(); return; }
            if (m.type !== 'trade' || !Array.isArray(m.data)) return;
            const last = {};
            for (const t of m.data) last[t.s] = t;
            for (const t of Object.values(last)) {
                const k = usStocks().find((x) => fhSym(x) === t.s);
                const q = k && Q[k];
                if (!q || !fin(t.p)) continue;
                const prev = q.price;
                q.price = t.p; q.time = Math.floor(t.t / 1000); q.live = true;
                if (fin(q.prevClose) && q.prevClose) { q.change = t.p - q.prevClose; q.changePct = (t.p / q.prevClose - 1) * 100; }
                if (prev !== t.p) patchLive(k, prev);
            }
            st.fhAt = now();
        };
        sock.onclose = () => {
            if (fws !== sock) return;
            fws = null; if (st.fh === 'on') st.fh = ''; renderStatus();
            fwsTry++;
            setTimeout(() => { if (!fws && cfg.finnhub) startFinnhub(); }, Math.min(60000, 3000 * 2 ** Math.min(fwsTry, 4)));
        };
        sock.onerror = () => { try { sock.close(); } catch { /* ignora */ } };
    }

    const KL = { '1d': ['15m', 96], '5d': ['1h', 120], '1mo': ['4h', 180], '6mo': ['1d', 183], '1y': ['1d', 365], '5y': ['1w', 260] };
    async function klines(id, range) {
        const [iv, n] = KL[range];
        const arr = await bnGet(`/api/v3/klines?symbol=${pairOf(id)}&interval=${iv}&limit=${n}`);
        return arr.map((k) => [Math.floor(k[0] / 1000), +k[4]]);
    }
    async function loadCryptoSeries() {
        await Promise.all(CRYPTO.map(async (c) => {
            try {
                const s = await klines(c.id, '1d');
                const k = 'c:' + c.id;
                Q[k] = Q[k] || {};
                Q[k].series = s;
                if (!fin(Q[k].price) || Q[k].stale) { Q[k].price = s[s.length - 1][1]; Q[k].currency = cfg.fiat; }
            } catch { /* sem série */ }
        }));
        drawSparks();
    }
    async function loadCryptoDaily() {
        await Promise.all(CRYPTO.map(async (c) => { try { D['c:' + c.id] = await klines(c.id, '1y'); } catch { /* sem histórico */ } }));
    }

    // ---------- Yahoo via conector ----------
    async function quotesBatch(keys, range, extra = '') {
        const out = [];
        for (let i = 0; i < keys.length; i += 40) {
            const part = keys.slice(i, i + 40);
            out.push(px(`/quotes?symbols=${encodeURIComponent(part.join(','))}&range=${range}${extra}`, 30000));
        }
        const res = await Promise.all(out);
        return res.flatMap((r) => r.quotes || []);
    }

    let pollBusy = false;
    async function pollYahoo() {
        if (!cfg.proxy || pollBusy) return;
        pollBusy = true;
        try {
            const list = await quotesBatch(yahooKeys(), '1d');
            let ok = 0;
            for (const q of list) {
                if (q.error || !fin(q.price)) continue;
                ok++;
                const k = q.symbol in REG ? q.symbol : (yahooKeys().find((x) => x.toUpperCase() === String(q.symbol).toUpperCase()) || q.symbol);
                const prev = Q[k] && Q[k].price;
                const o = Q[k];
                // preço em tempo real (Finnhub) mais recente do que o do Yahoo: fica o mais recente
                if (o && o.live && (o.time || 0) > (q.time || 0)) {
                    const pc = q.prevClose;
                    Q[k] = { ...q, price: o.price, time: o.time, live: true, stale: false, change: fin(pc) ? o.price - pc : q.change, changePct: fin(pc) && pc ? (o.price / pc - 1) * 100 : q.changePct };
                } else Q[k] = { ...q, stale: false };
                if (prev != null && prev !== q.price && listed(k)) patchLive(k, prev);
            }
            if (!ok) throw new Error('O conector não devolveu cotações');
            st.yahooAt = now(); st.yahooErr = '';
            const nfx = fxNeeded.size;
            for (const k of Object.keys(REG)) { const c = isHolding(k) && Q[k] && Q[k].currency; if (c && c !== 'EUR') fxNeeded.add(c === 'GBp' || c === 'GBX' ? 'GBP' : c); }
            if (fxNeeded.size > nfx) { buildReg(); setTimeout(() => { pollBusy = false; pollYahoo(); }, 50); }
            checkAlerts();
            saveSnap();
        } catch (e) {
            st.yahooErr = e.message || String(e);
        } finally {
            pollBusy = false;
            scheduleRender();
        }
    }

    async function loadDaily() {
        const jobs = [loadCryptoDaily()];
        if (cfg.proxy) {
            jobs.push(quotesBatch(yahooKeys(), '1y').then((list) => {
                for (const q of list) if (!q.error && q.series && q.series.length) D[q.symbol] = q.series;
            }).catch(() => {}));
        }
        await Promise.all(jobs);
        analyseAll();
        scheduleRender();
        saveJournal();
    }

    function closesFor(k) {
        const d = D[k];
        if (!d || !d.length) return null;
        const c = d.map((x) => x[1]);
        const live = Q[k] && Q[k].price;
        if (fin(live) && !Q[k].stale) c[c.length - 1] = live; // a última vela diária é o dia de hoje
        return c;
    }
    function analyseAll() {
        for (const k of Object.keys(REG)) {
            const c = closesFor(k);
            if (!c) continue;
            const r = A.analyse(c, { crypto: REG[k].kind === 'crypto', kind: REG[k].kind, news: NEWS[k] ? A.newsTone(NEWS[k].items) : null });
            if (r) AN[k] = r;
        }
    }

    // ---------- diário das sugestões ----------
    const todayLocal = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
    let JOURNAL = null, BT = null, btBusy = false;
    async function saveJournal() {
        const day = todayLocal();
        if (!cfg.proxy || !st.yahooAt || cfg.jLast === day) return;
        const keys = Object.keys(AN).filter((k) => investable(k) && AN[k].advice && fin(qv(k).price));
        if (keys.length < 5) return;
        const items = keys.map((k) => { const r = AN[k]; return { s: k, p: +qv(k).price.toPrecision(8), a: r.advice.key, l: r.horizons.long ? r.horizons.long.score : null, m: r.horizons.mid.score, sh: r.horizons.short.score, o: r.discount && r.discount.opp ? 1 : 0 }; });
        try { await pxPost('/journal', { id: cfg.jid, date: day, items, lots: cfg.lots, saveDays: cfg.saveDays }); cfg.jLast = day; saveCfg(); JOURNAL = null; } catch { /* tenta noutra altura */ }
    }
    // ---------- datas de compra de cripto (isenção de IRS aos 365 dias) ----------
    const lotOf = (k) => cfg.lots[k] || { plan: '', buys: [] };
    const lotsOf = (k) => { const L = lotOf(k); return (L.buys || []).concat(A.planLots(L.plan, cfg.saveDays, todayLocal())); };
    const taxOf = (k) => A.cryptoTax(lotsOf(k), todayLocal());
    const dmy = (iso) => iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : '';
    function taxLine(k) {
        const t = taxOf(k);
        if (!t.n) return ''; // sem datas: não ocupa espaço
        if (t.all) return 'isenta de IRS';
        return t.exempt ? `${t.exempt}/${t.n} isentas · próxima em ${t.next.days} d` : `isenta em ${t.next.days} d`;
    }
    function setLots(k, L) {
        if (!L.plan && !(L.buys || []).length) delete cfg.lots[k]; else cfg.lots[k] = L;
        saveCfg();
        if (cfg.proxy) pxPost('/journal', { id: cfg.jid, lots: cfg.lots, saveDays: cfg.saveDays }).catch(() => {});
        if (sheetKey === k) renderSheet();
        scheduleRender();
    }
    function taxBox(k) {
        if (!REG[k] || REG[k].kind !== 'crypto') return '';
        const L = lotOf(k), t = taxOf(k);
        const plan = t.lots.filter((x) => x.plan);
        const planFree = plan.filter((x) => x.ok).length;
        const eurOk = t.eur > 0 && t.lots.every((x) => x.e > 0);
        const head = !t.n ? 'Indica quando compraste para saberes a partir de que dia vender fica isento de IRS.'
            : t.all ? `Todas as ${t.n} compras têm 1 ano ou mais: uma venda hoje fica isenta de IRS${eurOk ? ` (${fmtPx(t.eur, { decimals: 0 }, 'EUR')} investidos)` : ''}.`
            : `${t.exempt} de ${t.n} compras já isentas${eurOk ? ` (${fmtPx(t.eurExempt, { decimals: 0 }, 'EUR')} de ${fmtPx(t.eur, { decimals: 0 }, 'EUR')})` : ''}. A próxima fica isenta a <b>${dmy(t.next.free)}</b> — faltam ${t.next.days} dias.`;
        const manual = (L.buys || []).map((x, i) => ({ ...x, i })).sort((a, b) => (a.d < b.d ? -1 : 1));
        return `<div class="box tax-box"><h3>Imposto — regra dos 365 dias ${t.n ? `<span class="chip-s">${t.all ? 'isenta' : t.exempt ? 'em parte' : 'ainda não'}</span>` : ''}</h3>
            <p class="tx-head">${head}</p>
            ${manual.length ? `<ul class="lots">${manual.map((x) => { const r = t.lots.find((y) => y.d === x.d && !y.plan); const ok = r ? r.ok : false; return `<li><span class="num">${dmy(x.d)}</span><span class="num">${+x.e > 0 ? fmtPx(+x.e, { decimals: 0 }, 'EUR') : ''}</span><span class="${ok ? 'up' : 'flat'}-t">${ok ? 'isenta' : r ? `isenta a ${dmy(r.free)}` : ''}</span><button type="button" class="mk-ibtn sm" data-lotrm="${x.i}" aria-label="Apagar compra de ${dmy(x.d)}"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></li>`; }).join('')}</ul>` : ''}
            ${plan.length ? `<p class="note">Plano mensal desde ${dmy(L.plan)}: ${plan.length} compras nos dias ${cfg.saveDays.join(' e ')}, ${planFree} já isentas.</p>` : ''}
            <div class="lot-add"><input id="lot-d" class="inp" type="date" max="${todayLocal()}" aria-label="Data da compra"><input id="lot-e" class="inp" type="number" inputmode="decimal" min="0" step="10" placeholder="€ (opcional)" aria-label="Valor em euros"><button type="button" class="btn sm" data-act="lot-add">Juntar compra</button></div>
            <div class="lot-add"><label for="lot-plan">Compro todos os meses pelo plano desde</label><input id="lot-plan" class="inp" type="date" max="${todayLocal()}" value="${esc(L.plan || '')}"><button type="button" class="btn sm" data-act="lot-plan">${L.plan ? 'Mudar' : 'Guardar'}</button></div>
            <p class="note">Com menos de 365 dias, o ganho paga 28%. Cada compra conta a partir da sua data e, numa venda, contam primeiro as compras mais antigas. Os dados ficam no teu iPhone e no teu conector, para o Claude ter em conta. Informação geral: casos concretos confirmam-se com a AT ou um contabilista.</p></div>`;
    }
    async function loadJournal() {
        if (!cfg.proxy) return;
        try { JOURNAL = await px(`/journal?id=${encodeURIComponent(cfg.jid)}`); } catch { JOURNAL = { days: {} }; }
        scheduleRender();
    }
    const ACT = { buy: 'Comprar', scale: 'Comprar aos poucos', hold: 'Manter (não perseguir)', wait: 'Esperar / reforçar', neutral: 'Manter, sem reforçar', turn: 'Esperar confirmação', avoid: 'Evitar' };
    function evalJournal() {
        if (!JOURNAL || !JOURNAL.days) return null;
        const days = Object.keys(JOURNAL.days).sort();
        if (!days.length) return { days: 0 };
        const acc = {};
        const nowDay = todayLocal();
        for (const d of days) {
            if (d === nowDay) continue;
            const items = JOURNAL.days[d];
            const v = items.find((x) => x.s === 'VWCE.DE'), vNow = qv('VWCE.DE').price;
            const bench = v && fin(vNow) ? vNow / v.p - 1 : null;
            for (const x of items) {
                const cur = qv(x.s).price;
                if (!fin(cur) || !x.a) continue;
                const f = cur / x.p - 1;
                const A_ = acc[x.a] || (acc[x.a] = { n: 0, s: 0, h: 0, xs: 0, xn: 0 });
                A_.n++; A_.s += f;
                if ((x.a === 'buy' || x.a === 'scale') ? f > 0 : x.a === 'avoid' ? f < 0 : false) A_.h++;
                if (bench != null && x.s !== 'VWCE.DE') { A_.xs += f - bench; A_.xn++; }
            }
        }
        return { days: days.length, since: days[0], acc };
    }

    // ---------- teste no passado (2 anos) ----------
    async function runBacktest() {
        if (btBusy) return;
        btBusy = true; BT = { running: true }; render();
        try {
            const keys = Object.keys(REG).filter(investable);
            const ykeys = keys.filter((k) => REG[k].kind !== 'crypto');
            const day = (t) => new Date(t * 1000).toISOString().slice(0, 10);
            const assets = [];
            // 5 anos de fechos diários ajustados (dividendos incluídos); cripto pelo Yahoo em EUR
            const cmap = Object.fromEntries(CRYPTO.map((c) => [c.id + '-EUR', 'c:' + c.id]));
            const list = await quotesBatch(ykeys.concat(Object.keys(cmap)), '5y', '&interval=1d&adj=1');
            for (const q of list) {
                if (q.error || !q.series || q.series.length < 300) continue;
                const key = cmap[q.symbol] || q.symbol;
                assets.push({ key, kind: REG[key] ? REG[key].kind : 'stock', closes: q.series.map((x) => x[1]), days: q.series.map((x) => day(x[0])) });
            }
            const bench = assets.find((a) => a.key === 'VWCE.DE');
            const bf = A.benchFn(bench), acc = {}, per = [];
            // comissão: 1 € por ordem manual (ações e cripto) num valor típico de satélite; ETF por plano de poupança = 0
            const ticket = Math.max(50, (+cfg.budget || 900) * Math.max(0.05, (+cfg.cryptoPct || 10) / 100));
            const cost = (k) => (REG[k] && REG[k].kind === 'fund' ? 0 : 1 / ticket);
            for (const a of assets) { per.push(A.backtestAsset(a, bf, acc, { cost: cost(a.key) })); await sleep(0); }
            const byKind = {};
            for (const a of assets) {
                if (!bf || a.key === 'VWCE.DE') continue;
                const K = byKind[a.kind] || (byKind[a.kind] = { s: 0, n: 0 });
                for (let i = 200; i + 63 < a.closes.length; i += 5) { const b = bf(a.days[i], a.days[i + 63]); if (b != null) { K.s += a.closes[i + 63] / a.closes[i] - 1 - b; K.n++; } }
            }
            const buys = per.filter((x) => x.buyN >= 3).map((x) => ({ k: x.key, a: x.buyS / x.buyN })).sort((a, b) => a.a - b.a);
            const yrs = bench ? Math.round(bench.closes.length / 252 * 10) / 10 : null;
            BT = { at: now(), n: assets.length, yrs, ticket, sum: A.summarize(acc), worst: buys.slice(0, 3), best: buys.slice(-3).reverse(), byKind };
        } catch (e) { BT = { error: e.message || String(e) }; }
        btBusy = false; render();
    }

    // ---------- análise diária escrita pelo Claude (tarefa agendada → KV → /advice) ----------
    let CLAUDE = null;
    async function loadClaude() {
        if (!cfg.proxy) return;
        try { CLAUDE = await px('/advice'); } catch (e) { CLAUDE = { missing: true, error: e.message }; }
        // guarda o último conselho do Claude de cada ativo (se num dia não o comentar, fica o anterior)
        if (CLAUDE && Array.isArray(CLAUDE.actions) && CLAUDE.date) {
            const mem = store.get('mercados:clmem') || {};
            for (const x of CLAUDE.actions) if (x && x.s && (!mem[x.s] || mem[x.s].date <= CLAUDE.date)) mem[x.s] = { ...x, date: CLAUDE.date };
            store.set('mercados:clmem', mem);
        }
        scheduleRender();
    }
    // "feita às 07:16 de 06/11 · próxima amanhã às 07:14" (a tarefa corre todos os dias às 07:14 de Lisboa)
    const CL_HOUR = 7, CL_MIN = 14;
    function clWhen() {
        const c = CLAUDE || {};
        const g = c.generatedAt ? new Date(c.generatedAt) : null;
        const made = g && !isNaN(g) ? `feita às ${g.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })} de ${g.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })}` : (c.date || '');
        const n = new Date(), next = new Date(n.getFullYear(), n.getMonth(), n.getDate(), CL_HOUR, CL_MIN);
        if (next <= n) next.setDate(next.getDate() + 1);
        const day = next.getDate() === n.getDate() ? 'hoje' : 'amanhã';
        return `${made} · próxima ${day} às ${String(CL_HOUR).padStart(2, '0')}:${String(CL_MIN).padStart(2, '0')}`;
    }
    // Cartão "Hoje": aberto na primeira vez (dia novo / análise nova do Claude); depois condensado numa linha
    function firstView(name, parts) {
        const key = parts.join('|');
        st.open = st.open || {};
        const o = st.open[name];
        if (o && o.key === key) return o.v;
        const unread = parts.some((x, i) => x && cfg.seen[name + i] !== x);
        const v = unread || !!(o && o.v); // se já estava aberto nesta sessão, não fecha sozinho
        st.open[name] = { key, v };
        if (unread && document.visibilityState !== 'hidden') { parts.forEach((x, i) => { if (x) cfg.seen[name + i] = x; }); saveCfg(); }
        return v;
    }
    function claudeFor(k) {
        const now1 = CLAUDE && Array.isArray(CLAUDE.actions) ? CLAUDE.actions.find((a) => a.s === k) : null;
        if (now1) return now1;
        const m = (store.get('mercados:clmem') || {})[k];
        // conselho anterior, até 14 dias
        return m && m.date && (Date.parse(todayLocal()) - Date.parse(m.date)) / DAY <= 14 ? { ...m, old: true } : null;
    }
    async function loadFuel() {
        if (!cfg.proxy) return;
        try {
            FUEL = await px(`/fuel?distrito=${encodeURIComponent(cfg.distrito || '')}${cfg.distrito && cfg.municipio ? '&municipio=' + encodeURIComponent(cfg.municipio) : ''}`, 30000);
            st.fuelErr = '';
            saveSnap();
        } catch (e) { st.fuelErr = e.message; }
        scheduleRender();
    }

    async function loadCalendar() {
        if (!cfg.proxy) return;
        const syms = Object.keys(REG).filter((k) => listed(k) && REG[k].kind === 'stock');
        for (let i = 0; i < syms.length; i += 40) {
            try {
                const r = await px(`/calendar?symbols=${encodeURIComponent(syms.slice(i, i + 40).join(','))}`, 30000);
                for (const it of r.items || []) if (!it.error) CAL[it.symbol] = it;
            } catch { /* sem agenda */ }
        }
        scheduleRender();
    }
    const DAY = 86400000;
    const dm = (ms) => new Date(ms).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
    const inDays = (ms) => Math.ceil((ms - now()) / DAY);
    const whenTxt = (n) => n <= 0 ? 'hoje' : n === 1 ? 'amanhã' : `daqui a ${n} dias`;
    function eventsOf(k) {
        const c = CAL[k];
        if (!c) return [];
        const out = [];
        if (c.earnings && c.earnings * 1000 > now() - DAY) out.push({ type: 'earnings', ms: c.earnings * 1000 });
        if (c.exDividend && c.exDividend * 1000 > now() - DAY) out.push({ type: 'exdiv', ms: c.exDividend * 1000 });
        return out;
    }
    function agenda(days) {
        const lim = now() + days * DAY, out = [];
        for (const m of MACRO) { const ms = Date.parse(m.d + 'T12:00:00Z'); if (ms > now() - DAY && ms <= lim) out.push({ ms, txt: m.t }); }
        for (const k of Object.keys(CAL)) {
            if (!listed(k)) continue;
            for (const e of eventsOf(k)) if (e.ms <= lim) out.push({ ms: e.ms, k, txt: `${nameOf(k)}: ${e.type === 'earnings' ? 'apresenta resultados' : 'ex-dividendo'}` });
        }
        return out.sort((a, b) => a.ms - b.ms);
    }

    async function loadMovers() {
        if (!cfg.proxy) return;
        try { MOVERS = await px('/movers', 20000); st.moversErr = ''; } catch (e) { st.moversErr = e.message; }
        scheduleRender();
    }

    // notícias: pesquisa em PT e em EN, junta, tira repetidas
    function newsQueries(k) {
        const a = REG[k] || {};
        const n = nameOf(k).replace(/,?\s+(Inc\.?|Corp(oration)?\.?|S\.?A\.?|SGPS|plc|N\.?V\.?|SE|AG|Ltd\.?|Holdings?|Class [A-C])\b\.?/gi, '').trim();
        if (a.news) return [[a.news[0], 'pt'], [a.news[1], 'en']];
        if (a.kind === 'crypto') return [[`${n} criptomoeda`, 'pt'], [`${n} crypto`, 'en']];
        if (a.kind === 'index') return [[n, 'pt'], [`${n} index`, 'en']];
        if (/\.LS$/.test(k)) return [[`${n} ações`, 'pt'], [`${n} bolsa`, 'pt']];
        return [[`${n} ações`, 'pt'], [`${n} stock`, 'en']];
    }
    const newsBusy = {};
    async function loadNews(k, force) {
        if (!cfg.proxy) return null;
        if (!force && NEWS[k] && now() - NEWS[k].at < 10 * 60 * 1000) return NEWS[k];
        if (newsBusy[k]) return newsBusy[k];
        newsBusy[k] = (async () => {
            const a = REG[k] || {};
            const sym = a.kind === 'stock' ? k : a.kind === 'crypto' ? a.sym + '-USD' : '';
            const res = await Promise.all(newsQueries(k).map(([q, lang]) => px(`/news?q=${encodeURIComponent(q)}&lang=${lang}${sym ? '&sym=' + encodeURIComponent(sym) : ''}`).catch(() => ({ items: [] }))));
            const seen = new Set();
            const items = [];
            for (const it of res.flatMap((r) => r.items || [])) {
                const key = String(it.title || '').toLowerCase().replace(/[^a-z0-9à-ú]+/g, ' ').slice(0, 60);
                if (!it.title || seen.has(key)) continue;
                seen.add(key);
                items.push({ ...it, tone: A.sentiment(it.title) });
            }
            items.sort((a, b) => (b.time || 0) - (a.time || 0));
            NEWS[k] = { at: now(), items: items.slice(0, 12) };
            delete newsBusy[k];
            return NEWS[k];
        })();
        return newsBusy[k];
    }

    // ---------- alertas ----------
    // dia local (antes era UTC: à meia-noite os mesmos movimentos da cripto voltavam a ser avisados)
    const today = () => todayLocal();
    const QUIET_FROM = 22, QUIET_TO = 10;
    function sendNote(t, tag) {
        if (!t || !cfg.notify || !('Notification' in window) || Notification.permission !== 'granted') return;
        const opts = { body: t.body, tag, icon: 'icon-192.png' };
        navigator.serviceWorker && navigator.serviceWorker.ready
            ? navigator.serviceWorker.ready.then((r) => r.showNotification(t.title, opts)).catch(() => {})
            : new Notification(t.title, opts);
    }
    const alertItem = (k) => { const q = qv(k); return { k, name: nameOf(k), pct: q.changePct, pctTxt: fmtPct(q.changePct), px: fmtPx(q.price, REG[k], q.currency) }; };
    function checkAlerts() {
        const lim = +cfg.alertPct || 0;
        if (!lim) return;
        const hits = [];
        for (let [k, q] of Object.entries(Q)) {
            if (!listed(k)) continue;
            q = qv(k);
            if (!fin(q.changePct) || Math.abs(q.changePct) < lim) continue;
            const id = `${today()}|${k}|${q.changePct > 0 ? '+' : '-'}`;
            if (fired.has(id)) continue;
            fired.add(id);
            if (!st.firstPoll) hits.push({ k, q });
        }
        st.firstPoll = false;
        store.set('mercados:fired', [...fired].filter((x) => x.startsWith(today())));
        const quiet = cfg.quiet !== false && A.isQuiet(new Date().getHours(), QUIET_FROM, QUIET_TO);
        let held = store.get('mercados:held', []);
        if (!Array.isArray(held)) held = [];
        if (hits.length) {
            const t = A.groupAlert(hits.map(({ k }) => alertItem(k)));
            toast(t.title);
            // à noite: guarda para a manhã; de dia: uma só notificação com todos
            if (quiet) { held = [...new Set(held.concat(hits.map((h) => h.k)))]; store.set('mercados:held', held); } else sendNote(t, 'mk-alerts');
        }
        // de manhã: um só resumo do que mexeu durante a noite (com os valores de agora)
        if (!quiet && held.length) {
            const items = held.filter((k) => REG[k] && fin(qv(k).changePct)).map(alertItem);
            store.set('mercados:held', []);
            sendNote(A.groupAlert(items, true), 'mk-noite');
        }
    }

    // ---------- gráficos (canvas) ----------
    const COL = {};
    function colors() {
        const cs = getComputedStyle(document.documentElement);
        for (const n of ['up', 'down', 'flat', 'line', 'muted', 'text', 'accent']) COL[n] = cs.getPropertyValue('--' + n).trim();
    }
    function setupCanvas(cv) {
        const dpr = Math.min(window.devicePixelRatio || 1, 3);
        const w = cv.clientWidth, h = cv.clientHeight;
        if (!w || !h) return null;
        if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
        const g = cv.getContext('2d');
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.clearRect(0, 0, w, h);
        return { g, w, h };
    }
    function drawLine(cv, pts, opt = {}) {
        const c = setupCanvas(cv);
        if (!c || !pts || pts.length < 2) return null;
        const { g, w, h } = c;
        const vals = pts.map((p) => p[1]);
        let lo = Math.min(...vals), hi = Math.max(...vals);
        if (fin(opt.base)) { lo = Math.min(lo, opt.base); hi = Math.max(hi, opt.base); }
        if (hi === lo) { hi += 1; lo -= 1; }
        const padT = opt.pad ?? 3, padB = opt.pad ?? 3;
        const t0 = pts[0][0], t1 = pts[pts.length - 1][0];
        const X = opt.byIndex || t1 === t0 ? (i) => (i / (pts.length - 1)) * w : (i) => ((pts[i][0] - t0) / (t1 - t0)) * w;
        const Y = (v) => padT + (1 - (v - lo) / (hi - lo)) * (h - padT - padB);
        const col = COL[opt.tone || 'flat'];
        if (fin(opt.base)) {
            g.setLineDash([3, 3]); g.strokeStyle = COL.line; g.lineWidth = 1;
            g.beginPath(); g.moveTo(0, Y(opt.base)); g.lineTo(w, Y(opt.base)); g.stroke(); g.setLineDash([]);
        }
        g.beginPath();
        pts.forEach((p, i) => (i ? g.lineTo(X(i), Y(p[1])) : g.moveTo(X(i), Y(p[1]))));
        g.strokeStyle = col; g.lineWidth = opt.width || 1.6; g.lineJoin = 'round'; g.stroke();
        if (opt.fill !== false) {
            const gr = g.createLinearGradient(0, 0, 0, h);
            gr.addColorStop(0, col + '40'); gr.addColorStop(1, col + '00');
            g.lineTo(X(pts.length - 1), h); g.lineTo(0, h); g.closePath(); g.fillStyle = gr; g.fill();
        }
        return { X, Y, w, h, g, lo, hi };
    }
    function drawSparks() {
        for (const cv of $$('canvas.spark')) {
            const k = cv.dataset.key;
            const q = qv(k);
            if (!q || !q.series || q.series.length < 2) continue;
            drawLine(cv, q.series, { tone: toneOf(q.changePct), base: REG[k] && REG[k].kind === 'crypto' ? null : q.prevClose, pad: 3 });
        }
    }

    // ---------- atualização ao vivo de um cartão ----------
    function patchLive(k, prev) {
        const raw = Q[k];
        const q = qv(k);
        for (const el of $$(`[data-key="${CSS.escape(k)}"]`)) {
            const p = el.querySelector('.px');
            if (p) {
                p.textContent = fmtPx(q.price, REG[k], q.currency);
                if (fin(prev) && prev !== raw.price) {
                    const cls = raw.price > prev ? 'flash-up' : 'flash-down';
                    p.classList.remove('flash-up', 'flash-down'); void p.offsetWidth; p.classList.add(cls);
                    clearTimeout(p._t); p._t = setTimeout(() => p.classList.remove(cls), 700);
                }
            }
            const c = el.querySelector('.chg');
            if (c) { c.className = 'chg ' + toneOf(q.changePct); c.textContent = fmtPct(q.changePct); }
        }
        if (sheetKey === k) renderSheetPrice();
        sparkSoon();
    }
    let sparkT = 0;
    function sparkSoon() { if (!sparkT) sparkT = setTimeout(() => { sparkT = 0; drawSparks(); }, 3000); }

    // ---------- render ----------
    let renderPending = false;
    function scheduleRender() {
        if (renderPending) return;
        renderPending = true;
        requestAnimationFrame(() => { renderPending = false; render(); });
    }

    function render() {
        renderStatus();
        $$('#mk-nav button').forEach((b) => b.classList.toggle('on', b.dataset.tab === cfg.tab));
        const body = $('#mk-body');
        if (st.touching) { st.renderLater = true; return; }
        // não destruir o campo onde se está a escrever
        const act = document.activeElement;
        if (act && body.contains(act) && act.matches('input, select')) { renderStatus(); return; }
        const html = cfg.tab === 'destaques' ? viewHighlights() : cfg.tab === 'analise' ? viewAnalysis() : cfg.tab === 'ajustes' ? viewSettings() : viewDashboard();
        const title = { destaques: 'Destaques', analise: 'Análise', ajustes: 'Ajustes' }[cfg.tab] || 'Painel';
        body.innerHTML = `<h1 class="pg-t">${title}</h1>` + html;
        drawSparks();
    }

    function renderStatus() {
        const el = $('#mk-status');
        if (!el) return;
        const live = st.ws === 'on';
        const cTxt = live ? '<span class="dot on"></span><b>Cripto ao vivo</b>' : st.cryptoAt ? `<span class="dot warn"></span>Cripto ${esc(ago(st.cryptoAt))}` : '<span class="dot"></span>Cripto a ligar…';
        let yTxt;
        if (!cfg.proxy) yTxt = '<span class="dot off"></span>Ações: sem conector';
        else if (st.yahooErr && !st.yahooAt) yTxt = '<span class="dot off"></span>Ações: erro';
        else yTxt = `<span class="dot ${st.yahooErr ? 'warn' : 'on'}"></span>Ações ${esc(ago(st.yahooAt))}`;
        if (st.fh === 'on' && st.fhAt && now() - st.fhAt < 120000) yTxt = '<span class="dot on"></span><b>Ações EUA ao vivo</b>';
        el.innerHTML = `<span>${cTxt}</span><span>${yTxt}</span>`;
    }

    // ativo numa linha da lista (com o subtítulo do tipo de ativo)
    function card(k, extra = '', badge = null) {
        const a = REG[k] || { key: k, name: k };
        const q = qv(k);
        // como na Trade Republic: só nome, preço e variação (a unidade fica quando é por litro, por barril…)
        const sub = a.unit ? 'por ' + a.unit : '';
        return row(k, { sub, note: extra, badge, swipe: 'fixed' });
    }
    // ícone redondo com as iniciais (cor fixa por ativo)
    function ico(k) {
        const a = REG[k] || {};
        const t = a.kind === 'crypto' ? a.sym : nameOf(k).replace(/[^A-Za-zÀ-ÿ0-9 ]/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('') || '?';
        let h = 0; for (const ch of k) h = (h * 31 + ch.charCodeAt(0)) % 360;
        return `<span class="r-ico" style="--h:${h}" aria-hidden="true">${esc(t.slice(0, 4).toUpperCase())}</span>`;
    }

    // linha (lista)
    function row(k, opt = {}) {
        const a = REG[k] || { key: k, name: k, sym: k };
        const q = qv(k);
        const sub = opt.sub ?? '';
        const html = `<button type="button" class="row" data-open="${esc(k)}" data-key="${esc(k)}">
            ${ico(k)}<div class="r-main"><div class="r-name">${esc(nameOf(k))}</div>${(Array.isArray(sub) ? sub.length : sub) || opt.badge ? `<div class="r-sub">${opt.badge ? `<span class="badge ${opt.badge[1]}">${esc(opt.badge[0])}</span>` : ''}${Array.isArray(sub) ? sub.map((x) => `<span class="nb">${esc(x)}</span>`).join('<span class="dotsep"> · </span>') : esc(sub)}</div>` : ''}${opt.note ? `<div class="r-note">${esc(opt.note)}</div>` : ''}</div>
            ${opt.spark === false ? '' : `<canvas class="spark" data-key="${esc(k)}"></canvas>`}
            <div class="r-px num"><span class="px${q.price == null ? ' skel' : ''}">${q.price == null ? '0000,00' : fmtPx(q.price, a, q.currency)}</span>${chg(q.changePct)}</div>
        </button>`;
        // arrastar para a esquerda mostra "Retirar" (só no Painel)
        return opt.swipe ? `<div class="sw-wrap${st.swipe === k ? ' open' : ''}" data-swk="${esc(k)}" data-grp="${opt.swipe}"><button type="button" class="sw-del" data-hide="${esc(k)}" data-grp="${opt.swipe}" tabindex="-1">Retirar</button>${html}</div>` : html;
    }

    function setupBanner() {
        return `<div class="banner">
            <h3>Falta ligar o conector de dados</h3>
            <p>As cripto já estão em tempo real. Para o petróleo, combustíveis, índices, ações e notícias, a app precisa do teu conector (um Cloudflare Worker grátis, 2 minutos a publicar).</p>
            <div class="btns"><button type="button" class="btn pri" data-tab="ajustes">Configurar</button>
            <a class="btn" href="https://github.com/nelsonsous/escolaplay/tree/main/mercados#conector" target="_blank" rel="noopener">Como publicar</a></div>
        </div>`;
    }

    function viewDashboard() {
        const eurusd = Q['EURUSD=X'] && Q['EURUSD=X'].price;
        const energy = ENERGY.filter((e) => !cfg.hidden.includes(e.sym)).map((e) => {
            const q = Q[e.sym];
            const l = e.perLitre && q ? A.usdGalToEurL(q.price, eurusd) : null;
            return card(e.sym, l ? `≈ ${fmtPx(l, { decimals: 3 }, 'EUR')}/L sem impostos` : '');
        }).join('');
        const hold = holdingKeys();
        const hid = (k) => cfg.hidden.includes(k);
        const crypt = CRYPTO.map((c) => 'c:' + c.id).filter((k) => !hold.includes(k) && !hid(k));
        const funds = cfg.funds.filter((k) => !hold.includes(k));
        const nHid = (keys) => keys.filter(hid).length;
        const foot = (add, restore) => add || restore ? `<div class="sec-f">${add ? `<button type="button" class="lnk" data-act="${add}">+ Juntar</button>` : ''}${restore ? `<button type="button" class="lnk" data-unhide="${restore[0]}">Repor ${restore[1]}</button>` : ''}</div>` : '';
        const cryAll = CRYPTO.map((c) => 'c:' + c.id), idxAll = INDICES.map((i) => i.sym), enAll = ENERGY.map((e) => e.sym);
        const stocks = cfg.watch.slice();
        if (cfg.sort === 'chg') stocks.sort((a, b) => (qv(b).changePct ?? -999) - (qv(a).changePct ?? -999));
        else if (cfg.sort === 'name') stocks.sort((a, b) => nameOf(a).localeCompare(nameOf(b), 'pt'));
        return `${cfg.proxy ? '' : setupBanner()}
        <section class="sec"><div class="sec-h"><h2>Os meus ativos</h2><span class="sub">${CLAUDE && !CLAUDE.missing && CLAUDE.headline ? 'com o conselho do Claude' : 'o que tenho'}</span></div>
            ${hold.length ? `<div class="list sw-list">${hold.map((k) => { const cl = claudeFor(k); return row(k, { swipe: 'hold', sub: [AN[k] && AN[k].discount ? `${fmtPct1(AN[k].discount.dd * 100)} do máximo` : '', REG[k].kind === 'crypto' ? taxLine(k) : ''].filter(Boolean), badge: cl && cl.action ? [cl.action, CL_TONE[cl.key] || 'flat'] : null }); }).join('')}</div>` : '<div class="empty">Escolhe em Ajustes → O que tenho.</div>'}${foot('go-hold')}</section>
        ${todayCard()}
        ${crypt.length || nHid(cryAll) ? `<section class="sec"><div class="sec-h"><h2>Cripto</h2><span class="sub">${esc(st.cryptoSrc || 'Binance')} · ${esc(cfg.fiat)}</span></div>
            <div class="list sw-list">${crypt.map((k) => card(k)).join('')}</div>${foot('', nHid(cryAll) ? ['crypto', nHid(cryAll)] : null)}</section>` : ''}
        ${funds.length || !cfg.funds.length ? `<section class="sec"><div class="sec-h"><h2>Fundos e ETF</h2><span class="sub">${cfg.eur ? 'em euros' : ''}</span></div>
            ${funds.length ? `<div class="list sw-list">${funds.map((s) => card(s).replace('data-grp="fixed"', 'data-grp="list"').replace('data-grp="fixed"', 'data-grp="list"')).join('')}</div>` : '<div class="empty">Sem fundos. Junta em Ajustes (ex.: VWCE, IWDA).</div>'}${foot('go-add')}</section>` : ''}
        <section class="sec"><div class="sec-h"><h2>Petróleo e energia</h2><span class="sub">futuros, USD</span></div>
            <div class="list sw-list">${energy}</div>${foot('', nHid(enAll) ? ['energy', nHid(enAll)] : null)}</section>
        ${viewFuel()}
        <section class="sec"><div class="sec-h"><h2>Índices, câmbio e ouro</h2></div>
            <div class="list sw-list">${INDICES.filter((i) => !hid(i.sym)).map((i) => row(i.sym, { swipe: 'fixed' })).join('')}</div>${foot('', nHid(idxAll) ? ['index', nHid(idxAll)] : null)}</section>
        ${etfCrypto() ? `<details class="stocks-fold"><summary>Ações (só informação — não fazem parte do plano) <span class="sub">${cfg.watch.length}</span></summary>` : ''}
        <section class="sec"><div class="sec-h"><h2>Ações que sigo</h2><span class="sub">${cfg.watch.length}</span>
            <div class="right seg" role="group" aria-label="Ordenar">
                <button type="button" data-sort="chg" class="${cfg.sort === 'chg' ? 'on' : ''}">Variação</button>
                <button type="button" data-sort="name" class="${cfg.sort === 'name' ? 'on' : ''}">Nome</button>
                <button type="button" data-sort="mine" class="${cfg.sort === 'mine' ? 'on' : ''}">Minha</button></div></div>
            ${stocks.length ? `<div class="list sw-list">${stocks.map((s) => row(s, { swipe: 'list' })).join('')}</div>` : '<div class="empty">Sem ações na lista. Junta em Ajustes.</div>'}${foot('go-add')}
            </section>${etfCrypto() ? '</details>' : ''}
            <p class="note">Cripto em tempo real. Ações, índices e petróleo: dados gratuitos do Yahoo Finance, que podem ter até 15 min de atraso nalgumas bolsas. Atualiza a cada 30 s.</p>`;
    }

    function viewFuel() {
        if (!cfg.proxy) return '';
        const dname = cfg.distrito && DISTRITOS ? (DISTRITOS.find((d) => String(d.id) === String(cfg.distrito)) || {}).name : '';
        const mname = cfg.municipio && MUNIC[cfg.distrito] ? (MUNIC[cfg.distrito].find((m) => String(m.id) === String(cfg.municipio)) || {}).name : '';
        let inner;
        if (!FUEL || !FUEL.fuels) inner = st.fuelErr ? `<div class="empty">Não deu para ler a DGEG: ${esc(st.fuelErr)}</div>` : '<div class="empty">A carregar os preços da DGEG…</div>';
        else {
            inner = `<div class="grid g3" style="grid-template-columns:repeat(2,minmax(0,1fr))">${FUEL.fuels.map((f) => f.error ? `<div class="card fuel"><div class="c-name">${esc(f.name)}</div><div class="c-sub">${esc(f.error)}</div></div>` : `
                <div class="card fuel" style="cursor:default">
                    <div class="c-top"><span class="c-name">${esc(f.name)}</span></div>
                    <div class="f-avg num">${fmtPx(f.median, { decimals: 3 }, 'EUR')}<span class="c-unit">/L</span></div>
                    <div class="c-note">mediana · média ${fmtPx(f.avg, { decimals: 3 }, 'EUR')}<br>${NF({}).format(f.n)} postos · máx. ${fmtPx(f.max, { decimals: 3 }, 'EUR')}</div>
                    ${f.cheapest && f.cheapest[0] ? `<div class="f-min">Mais barato: <b class="num">${fmtPx(f.cheapest[0].price, { decimals: 3 }, 'EUR')}</b><br>${esc([f.cheapest[0].brand, f.cheapest[0].name].filter(Boolean).join(' — '))}${f.cheapest[0].place ? '<br>' + esc(f.cheapest[0].place) : ''}</div>` : ''}
                </div>`).join('')}</div>
                <p class="note">Fonte: DGEG — Preços dos Combustíveis Online. Preço mediano por litro${mname ? ' no concelho de ' + esc(mname) : dname ? ' no distrito de ' + esc(dname) : ' em Portugal'}${FUEL.fuels[0] && FUEL.fuels[0].updated ? ' · última atualização ' + esc(FUEL.fuels[0].updated) : ''}.</p>`;
        }
        return `<section class="sec"><div class="sec-h"><h2>Combustíveis${mname ? ' em ' + esc(mname) : dname ? ' em ' + esc(dname) : ' em Portugal'}</h2><span class="sub">bombas, com impostos</span></div>${inner}</section>`;
    }

    function moverRow(k, q, isTemp) {
        const n = NEWS[k] && NEWS[k].items && NEWS[k].items[0];
        const nt = NEWS[k] ? A.newsTone(NEWS[k].items) : null;
        let why = '';
        if (nt != null && fin(q.changePct)) {
            const up = q.changePct > 0, good = nt > 0.15, bad = nt < -0.15;
            why = up ? (good ? 'Sobe com boas notícias' : bad ? 'Sobe apesar de notícias negativas' : 'Sobe sem notícia clara')
                : (bad ? 'Cai com más notícias' : good ? 'Cai apesar de notícias positivas' : 'Cai sem notícia clara');
        }
        const a = REG[k] || { sym: k };
        return `<button type="button" class="row" data-open="${esc(k)}" data-key="${esc(k)}" ${isTemp ? `data-name="${esc(q.name || '')}"` : ''}>
            <div class="r-main mv-main">
                <div class="r-name">${esc(isTemp ? (q.name || k) : nameOf(k))}</div>
                <div class="r-sub">${esc([a.sym || k, q.exchange || (isTemp ? 'EUA' : '')].filter(Boolean).join(' · '))}${fin(q.volume) ? ' · vol. ' + fmtBig(q.volume) : ''}</div>
                ${n ? `<div class="news1"><span class="tone ${n.tone.tone}">${esc(n.tone.label)}</span>${esc(n.title)}</div>` : ''}
                ${why ? `<div class="mv-why">${esc(why)}</div>` : ''}
            </div>
            <div class="r-px num"><span class="px">${fmtPx(q.price, REG[k] || { key: k }, q.currency)}</span>${chg(q.changePct)}</div>
        </button>`;
    }

    function moodBox() {
        const inv = Object.keys(AN).filter((k) => listed(k) && investable(k));
        const breadth = inv.length ? inv.filter((k) => AN[k].score >= 58).length / inv.length : NaN;
        const mood = A.marketMood({ spx: AN['^GSPC'], stoxx: AN['^STOXX50E'], btc: AN['c:BTC'], vix: Q['^VIX'] && Q['^VIX'].price, breadth });
        return mood ? `<div class="mood ${mood.tone}"><div class="m-l">Sentimento do mercado agora</div><div class="m-v ${mood.tone}-t">${esc(mood.label)}</div>
            <div class="m-h">${esc(mood.hint)}</div><ul>${mood.reasons.map((r) => `<li class="${r.tone}">${esc(r.txt)}</li>`).join('')}</ul></div>` : '';
    }
    function viewHighlights() {
        const V = {};
        const all = Object.keys(REG).filter((k) => listed(k) && REG[k].kind !== 'index' && fin((V[k] = qv(k)).changePct));
        const mine = holdingKeys().filter((k) => V[k] || fin((V[k] = qv(k)).changePct));
        const rest = all.filter((k) => !mine.includes(k));
        const ups = rest.filter((k) => V[k].changePct > 0).sort((a, b) => V[b].changePct - V[a].changePct).slice(0, 6);
        const downs = rest.filter((k) => V[k].changePct < 0).sort((a, b) => V[a].changePct - V[b].changePct).slice(0, 6);
        // notícias: os meus ativos e os maiores movimentos
        mine.concat(ups.slice(0, 3), downs.slice(0, 3)).forEach((k) => { if (!NEWS[k] && cfg.proxy) loadNews(k).then(scheduleRender).catch(() => {}); });
        const block = (title, sub, keys, emptyTxt) => `<section class="sec"><div class="sec-h"><h2>${title}</h2><span class="sub">${sub}</span></div>
            ${keys.length ? `<div class="list">${keys.map((k) => moverRow(k, V[k])).join('')}</div>` : `<div class="empty">${emptyTxt}</div>`}</section>`;
        const usBlock = (title, arr) => arr && arr.length ? `<section class="sec"><div class="sec-h"><h2>${title}</h2><span class="sub">bolsa dos EUA · informação</span></div>
            <div class="list">${arr.slice(0, 6).map((q) => moverRow(q.symbol, q, true)).join('')}</div></section>` : '';
        return `${cfg.proxy ? '' : setupBanner()}
        ${moodBox()}
        ${block('Os meus ativos hoje', 'o que tenho', mine, 'A carregar…')}
        ${block('Mais sobem hoje', 'do que sigo · informação', ups, 'Nada a subir hoje.')}
        ${block('Mais caem hoje', 'do que sigo · informação', downs, 'Nada a cair hoje.')}
        ${MOVERS ? usBlock('Mais sobem — mercado todo', MOVERS.gainers) + usBlock('Mais caem — mercado todo', MOVERS.losers) : (cfg.proxy ? `<p class="note">${st.moversErr ? 'Lista global indisponível: ' + esc(st.moversErr) : 'A carregar a lista global…'}</p>` : '')}
        <p class="note">${etfCrypto() ? 'A longo prazo, os movimentos de um dia não mudam o plano: servem para perceber o mercado. ' : ''}O tom das notícias (boa / má) é calculado por palavras-chave nos títulos. Toca numa linha para ver o gráfico e todas as notícias. Os avisos de subidas/descidas fortes configuram-se em Ajustes.</p>`;
    }

    const HZ = [['short', 'Curto', 'dias a 2 semanas'], ['mid', 'Médio', 'semanas a 3 meses'], ['long', 'Longo', 'anos']];
    const MODES = HZ.concat([['disc', 'Desconto', 'face ao máximo']]);
    function hzOf(k, hz) {
        const r = AN[k];
        if (!r) return null;
        const h = hz || cfg.hz;
        if (h !== 'disc') return r.horizons && r.horizons[h];
        const d = r.discount;
        return d && { score: d.score, tone: d.tone, label: d.tag, reasons: [{ pts: 1, txt: d.verdict }] };
    }
    // preço na mesma moeda/escala do que se mostra (euros, preço da noite)
    const lvPx = (k, q, price) => price * (q.fx || 1);
    function adviceBox(k, q) {
        const r = AN[k];
        if (!r || !r.advice || !investable(k)) return '';
        const a = r.advice, A_ = REG[k];
        const fmt = (price) => fmtPx(lvPx(k, q, price), A_, q.currency);
        const c = claudeFor(k);
        const cTone = c ? (CL_TONE[c.key] || 'flat') : a.tone;
        const algoPlan = a.plan.length ? `<ul class="adv-plan">${a.plan.map((x) => `<li><span>${esc(x.t)}</span><b class="num">${fmt(x.price)}</b></li>`).join('')}</ul>` : '';
        return `<div class="box advice ${cTone}"><h3>O que fazer na Trade Republic</h3>
            ${c ? `<div class="adv-src">${c.old ? `Análise do Claude de ${esc(dmy(c.date).slice(0, 5))} · último comentário a este ativo` : `Análise do Claude · ${esc(clWhen().split(' · ')[0])}`}</div>
            <div class="adv-act ${cTone}-t">${esc(c.action || '')}</div>
            <div class="adv-txt">${esc(c.why || '')}</div>
            ${c.plan ? `<div class="adv-txt"><b>Plano:</b> ${esc(c.plan)}</div>` : ''}
            <details class="algo"><summary>Sinal automático (algoritmo): <b class="${a.tone}-t">${esc(a.action)}</b></summary><div class="adv-txt">${esc(a.text)}</div>${algoPlan}</details>`
            : `<div class="adv-src">Sinal automático (algoritmo) — ${CLAUDE && !CLAUDE.missing ? 'o Claude não comentou este ativo hoje' : 'ainda sem análise do Claude'}</div>
            <div class="adv-act ${a.tone}-t">${esc(a.action)}</div>
            <div class="adv-txt">${esc(a.text)}</div>${algoPlan}`}
            ${eventsOf(k).filter((e) => inDays(e.ms) <= 21).map((e) => `<div class="adv-ev">${e.type === 'earnings'
                ? `<b>Resultados ${whenTxt(inDays(e.ms))} (${dm(e.ms)}).</b> Nesses dias a ação costuma mexer ±5–10%. Se fores comprar, compra só metade antes e o resto depois.`
                : `<b>Ex-dividendo ${whenTxt(inDays(e.ms))} (${dm(e.ms)}).</b> Para receber este dividendo tens de ter a ação antes dessa data.`}</div>`).join('')}
            ${a.invalid ? `<div class="adv-meta">A ideia falha se fechar abaixo de <b class="num">${fmt(a.invalid)}</b></div>` : ''}
            ${a.size ? `<div class="adv-meta">Tamanho: ${esc(a.size)}</div>` : ''}
            ${REG[k].kind === 'fund' && FUND_TYPE[k] ? `<div class="adv-meta"><b>${{ acc: 'Acumulação', dist: 'Distribuição', etc: 'ETC (sem dividendos)' }[FUND_TYPE[k]]}</b> — ${{ acc: 'não paga dividendos: nada a declarar no IRS até venderes.', dist: 'paga dividendos: 28% e declaração no IRS (Anexo J) todos os anos. Para o plano, prefere a versão de acumulação.', etc: 'não paga dividendos; só declaras quando venderes.' }[FUND_TYPE[k]]}</div>` : ''}
            ${REG[k].kind === 'stock' ? '<div class="adv-meta"><b>Dividendos</b> — se a empresa pagar, são 28% e entram na declaração de IRS (Anexo J) todos os anos.</div>' : ''}
            <div class="adv-meta">Impostos (PT): ${REG[k].kind === 'crypto' ? 'vender ao fim de 365 dias ou mais está isento de IRS; antes disso paga 28%. A prazo, manter mais de 1 ano.' : REG[k].kind === 'fund' ? 'só pagas quando venderes, e menos quanto mais tempo o tiveres: 28% até 2 anos, 25,2% de 2 a 5, 22,4% de 5 a 8 e 19,6% com 8 anos ou mais. Um ETF de acumulação não paga nada enquanto o tiveres.' : 'ao vender, 28% até 2 anos, 25,2% de 2 a 5, 22,4% de 5 a 8 e 19,6% com 8 anos ou mais; os dividendos pagam 28%.'}</div>
            <div class="adv-meta faint">Automático, a partir da tendência, do desconto e dos níveis — valida antes de comprar.</div></div>`;
    }
    function levelsBox(k, q) {
        const r = AN[k];
        if (!r || !r.levels) return '';
        const A_ = REG[k], cur = fin(q.price) ? q.price : null;
        const row = (l, kind) => {
            const px = lvPx(k, q, l.price);
            const dist = cur ? (px / cur - 1) * 100 : l.dist * 100;
            return `<li><span class="lv-k ${kind}">${kind === 'res' ? 'R' : 'S'}</span><span class="lv-n">${esc(l.label)}${l.strong ? ' <small>forte</small>' : ''}</span><b class="num">${fmtPx(px, A_, q.currency)}</b><span class="lv-d num ${kind === 'res' ? 'up' : 'down'}-t">${fmtPct(dist)}</span></li>`;
        };
        const res = r.levels.resistances.slice().reverse(), sup = r.levels.supports;
        return `<div class="box"><h3>Níveis-chave</h3>
            <ul class="levels">${res.map((l) => row(l, 'res')).join('')}
            <li class="lv-now"><span class="lv-k now">•</span><span class="lv-n">Preço agora</span><b class="num">${fmtPx(q.price, A_, q.currency)}</b><span class="lv-d"></span></li>
            ${sup.map((l) => row(l, 'sup')).join('')}</ul>
            <p class="note">R = resistência (onde costuma travar a subir) · S = suporte (onde costuma travar a descer). Calculados das médias, máximos/mínimos do ano e topos/fundos recentes.</p></div>`;
    }

    // ---------- Resumo do dia (Painel) ----------
    const PROFILES = { prud: ['Prudente', 0.9, 0.1, 0], bal: ['Equilibrado', 0.7, 0.2, 0.1], dyn: ['Dinâmico', 0.55, 0.3, 0.15] };
    // próxima execução dos planos de poupança na TR (dias 2, 9, 16, 23)
    function nextExec() {
        const days = cfg.saveDays.slice().sort((a, b) => a - b);
        const t0 = new Date(); t0.setHours(0, 0, 0, 0);
        let next = null;
        for (let m = 0; m < 2 && !next; m++) for (const d of days) { const dt = new Date(t0.getFullYear(), t0.getMonth() + m, d); if (dt >= t0) { next = dt; break; } }
        const dl = next ? new Date(next.getTime() - DAY) : null;
        return { days, next, dl, isExec: !!next && next.getTime() === t0.getTime(), isDeadline: !!dl && dl.getTime() === t0.getTime() };
    }
    // dados do dia (mercado, plano automático, agenda) para o cartão "Hoje"
    function briefParts() {
        const inv = Object.keys(AN).filter(investable);
        if (!inv.length) return null;
        const V = (k) => qv(k);
        const idx = [['^GSPC', 'S&P 500'], ['^IXIC', 'Nasdaq'], ['^STOXX50E', 'Euro Stoxx 50'], ['PSI20.LS', 'PSI']]
            .filter(([k]) => Q[k] && fin(Q[k].changePct)).map(([k, n]) => `${n} <span class="${toneOf(Q[k].changePct)}-t">${fmtPct(Q[k].changePct)}</span>`);
        const vix = Q['^VIX'] && Q['^VIX'].price;
        const breadth = inv.filter((k) => AN[k].score >= 58).length / inv.length;
        const mood = A.marketMood({ spx: AN['^GSPC'], stoxx: AN['^STOXX50E'], btc: AN['c:BTC'], vix, breadth });
        const movers = inv.filter((k) => fin(V(k).changePct)).sort((a, b) => V(b).changePct - V(a).changePct);
        const up = movers.slice(0, 2).filter((k) => V(k).changePct > 1), dn = movers.slice(-2).reverse().filter((k) => V(k).changePct < -1);
        const adv = (k) => (AN[k] && AN[k].advice) || { key: '', action: '' };
        // plano do mês automático (enquanto não há análise do Claude)
        const [pName, , pSat, pCry] = PROFILES[cfg.profile] || PROFILES.bal;
        const L = (k) => (AN[k].horizons.long || AN[k].horizons.mid).score;
        const funds = inv.filter((k) => REG[k].kind === 'fund' && L(k) >= 50).sort((a, b) => (b === 'VWCE.DE') - (a === 'VWCE.DE') || L(b) - L(a));
        let core = funds[0];
        const sats = inv.filter((k) => k !== core && REG[k].kind !== 'crypto' && ['buy', 'scale'].includes(adv(k).key))
            .sort((a, b) => (adv(b).key === 'scale' ? AN[b].discount.score : L(b)) - (adv(a).key === 'scale' ? AN[a].discount.score : L(a))).slice(0, 2);
        const cryp = ['c:BTC', 'c:ETH'].filter((k) => AN[k] && ['buy', 'scale'].includes(adv(k).key));
        const avoid = inv.filter((k) => adv(k).key === 'avoid').sort((a, b) => L(a) - L(b)).slice(0, 4);
        let cS = sats.length ? pSat : 0, cC = cryp.length ? pCry : 0;
        let cCore = 1 - cS - cC;
        if (etfCrypto()) {
            // ETF + cripto: o núcleo e a cripto entram todos os meses (sem tentar acertar no momento); ações não entram
            core = REG[cfg.coreFund] ? cfg.coreFund : core;
            sats.length = 0; cS = 0;
            cryp.length = 0; cryp.push(...(cfg.cryptoMix === 'btceth' ? ['c:BTC', 'c:ETH'] : ['c:BTC']));
            cC = (+cfg.cryptoPct || 0) / 100; cCore = 1 - cC;
            if (!cC) cryp.length = 0;
        }
        const B = +cfg.budget || 0;
        const nE = Math.max(1, cfg.saveDays.length);
        const amt = (f) => B ? fmtPx(B * f, { decimals: 0 }, 'EUR') : Math.round(f * 100) + '%';
        const amtX = (f) => B ? fmtPx(B / nE * f, { decimals: 0 }, 'EUR') : Math.round(f * 100) + '%';
        const cShare = (k) => cfg.cryptoMix === 'btceth' && cryp.length === 2 ? cC * (k === 'c:BTC' ? 0.7 : 0.3) : cC / cryp.length;
        const lines = [];
        if (core) lines.push([core, cCore, `núcleo · ${adv(core).action.toLowerCase()}`]);
        sats.forEach((k) => lines.push([k, cS / sats.length, `satélite · ${adv(k).action.toLowerCase()}`]));
        cryp.forEach((k) => lines.push([k, cShare(k), etfCrypto() ? 'cripto · todos os meses, manter ≥ 1 ano' : `cripto · ${adv(k).action.toLowerCase()}`]));
        const plan = lines.map(([k, f, extra]) => `<button type="button" class="idea" data-open="${esc(k)}"><span class="i-n">${esc(nameOf(k))}<small>${esc(extra)}</small></span><span class="i-t num">${amt(f)}</span></button>`);
        const exec = lines.map(([k, f]) => `${amtX(f)} ${nameOf(k)}`).join(' + ');
        const notes = [];
        if (!etfCrypto()) {
            if (!sats.length && pSat) notes.push('Sem ações em boa altura: a parte dos satélites fica no núcleo este mês.');
            if (!cryp.length && pCry) notes.push('Cripto sem sinal de compra: essa parte fica no núcleo este mês.');
        }
        const planSub = `${etfCrypto() ? `ETF + cripto (${100 - (+cfg.cryptoPct || 0)}/${+cfg.cryptoPct || 0})` : 'perfil ' + esc(pName.toLowerCase())}${B ? ` · ${fmtPx(B, { decimals: 0 }, 'EUR')}/mês` : ' · define o valor em Ajustes'}`;
        return { idx, vix, mood, up, dn, V, plan, exec, notes, avoid, planSub, cC };
    }
    const eurNum = (s) => { const m = String(s || '').replace(/[\s  ]/g, '').replace(/\./g, '').match(/(\d+(?:,\d+)?)€/); return m ? +m[1].replace(',', '.') : NaN; };
    // ---------- Hoje: a análise do Claude e o resumo do dia num só cartão ----------
    function todayCard() {
        const b = briefParts();
        const c = CLAUDE && !CLAUDE.missing && CLAUDE.headline ? CLAUDE : null;
        if (!b && !c) return '';
        const x = nextExec();
        const nw = new Date(), late = nw.getHours() * 60 + nw.getMinutes() > CL_HOUR * 60 + CL_MIN + 30;
        const old = c && c.date && c.date < todayLocal() && late;
        const nE = Math.max(1, x.days.length);
        // plano do mês: o do Claude; o automático só enquanto não há análise
        const cplan = c && Array.isArray(c.plan) && c.plan.length ? c.plan : null;
        let planHtml = '', execTxt = '';
        if (cplan) {
            planHtml = cplan.map((p) => `<${REG[p.s] ? `button type="button" data-open="${esc(p.s)}"` : 'div'} class="idea"><span class="i-n">${esc(p.name || nameOf(p.s))}<small>${esc(p.why || '')}</small></span><span class="i-t num">${esc(p.amount || '')}</span></${REG[p.s] ? 'button' : 'div'}>`).join('');
            const per = cplan.map((p) => [p.s, eurNum(p.amount) / nE]).filter(([, v]) => fin(v) && v > 0);
            execTxt = per.map(([s, v]) => `${fmtPx(v, { decimals: 0 }, 'EUR')} ${nameOf(s)}`).join(' + ');
        } else if (b) { planHtml = b.plan.join(''); execTxt = b.exec; }
        const when = x.next ? x.next.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' }) : '';
        const exTitle = x.isExec ? 'Hoje executam os planos' : x.isDeadline ? 'Hoje é o último dia para ajustar os planos' : 'Próxima execução';
        const ex = x.next ? `<div class="exec ${x.isDeadline ? 'hot' : ''}"><div class="ex-t">${exTitle}: <b>${esc(when)}</b>${x.isExec || x.isDeadline ? '' : ` · ajustar até ${dm(x.dl.getTime())}`}</div>
            ${execTxt ? `<div class="ex-a num">${esc(execTxt)}${nE > 1 ? `<small>por execução · ${nE} por mês</small>` : ''}</div>` : ''}
            <div class="ex-btns"><button type="button" class="btn sm" data-act="ics">Lembretes no calendário</button></div></div>` : '';
        const hold = holdingKeys();
        const others = c && Array.isArray(c.actions) ? c.actions.filter((a) => REG[a.s] && !hold.includes(a.s)).slice(0, 6) : [];
        const head = b ? b.idx.concat(fin(b.vix) ? [`VIX ${Math.round(b.vix)}${b.vix > 25 ? ' (medo)' : b.vix < 16 ? ' (calma)' : ''}`] : []).join(' · ') : '';
        const ag = agenda(14).slice(0, 7);
        const teaser = c ? c.headline : x.next ? `${exTitle}: ${when}${execTxt ? ' · ' + execTxt : ''}` : '';
        const open = firstView('hoje', [todayLocal(), c ? (c.generatedAt || c.date || '') : '']);
        return `<details class="today fold" data-fold="hoje" ${open ? 'open' : ''}><summary><span>Hoje</span>${b && b.mood ? `<b class="${b.mood.tone}-t">${esc(b.mood.label)}</b>` : ''}
                <small>${c ? `Análise do Claude · ${esc(clWhen())}${old ? ' · atrasada' : ''}` : 'Resumo automático · a análise do Claude chega às 07:14'}</small>${teaser ? `<em class="teaser">${esc(teaser)}</em>` : ''}</summary>
            ${head ? `<p class="t-mk">${head}</p>` : ''}
            ${c ? `<div class="cl-head">${esc(c.headline)}</div>${c.market ? `<p>${esc(c.market)}</p>` : ''}` : b && b.mood ? `<p class="muted">${esc(b.mood.hint)}</p>` : ''}
            ${!c && b && (b.up.length || b.dn.length) ? `<p>${b.up.length ? 'Sobem: ' + b.up.map((k) => `${esc(nameOf(k))} <span class="up-t">${fmtPct(b.V(k).changePct)}</span>`).join(', ') : ''}${b.up.length && b.dn.length ? '<br>' : ''}${b.dn.length ? 'Caem: ' + b.dn.map((k) => `${esc(nameOf(k))} <span class="down-t">${fmtPct(b.V(k).changePct)}</span>`).join(', ') : ''}</p>` : ''}
            <div class="i-blk plan-blk"><div class="i-h">Plano do mês na Trade Republic<small>${c && c.planNote ? esc(c.planNote) : b ? b.planSub : ''}</small></div>${planHtml}${ex}</div>
            ${others.length ? `<div class="i-blk"><div class="i-h">Também a seguir<small>fora do que tens</small></div>${others.map((a) => `<button type="button" class="idea" data-open="${esc(a.s)}"><span class="i-n">${esc(nameOf(a.s))}<small>${esc(a.why || '')}</small></span><span class="i-t ${CL_TONE[a.key] || 'flat'}-t">${esc(a.action || '')}</span></button>`).join('')}</div>` : ''}
            ${c && Array.isArray(c.risks) && c.risks.length ? `<div class="i-blk"><div class="i-h">Riscos a vigiar</div><ul class="dnotes">${c.risks.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></div>` : ''}
            ${ag.length ? `<div class="i-blk"><div class="i-h">Agenda — próximos 14 dias<small>resultados, dividendos e juros</small></div>${ag.map((e) => `<${e.k ? `button type="button" data-open="${esc(e.k)}"` : 'div'} class="idea"><span class="i-n">${esc(e.txt)}</span><span class="i-t muted num">${dm(e.ms)} · ${esc(whenTxt(inDays(e.ms)))}</span></${e.k ? 'button' : 'div'}>`).join('')}</div>` : ''}
            ${b ? b.notes.map((n) => `<p class="note">${esc(n)}</p>`).join('') : ''}
            ${!c && b && b.avoid.length ? `<p class="note">Evitar por agora: ${b.avoid.map((k) => esc(nameOf(k))).join(', ')}.</p>` : ''}
            <p class="note">${c ? 'Escrita todos os dias às 07:14 por uma tarefa agendada do Claude, com os teus dados e o diário de sugestões. Como têm corrido os conselhos: Análise → Resultados.' : 'Plano automático até chegar a análise do Claude.'} Toca num nome para ver o detalhe. Valida antes de investir.</p></details>`;
    }

    function discountBox(k, q) {
        const d = AN[k] && AN[k].discount;
        if (!d) return '';
        const a = REG[k], f = q.fx || 1;
        return `<div class="box disc-box"><h3>Desconto <span class="chip-s">${esc(d.levelLabel)}</span></h3>
            <div class="dd-big num ${d.dd <= -0.05 ? 'down' : 'flat'}-t">${fmtPct(d.dd * 100)}<small>face ao máximo do ano</small></div>
            <div class="range52" aria-label="Posição entre o mínimo e o máximo do ano"><div class="bar"><i style="left:${(d.pos * 100).toFixed(1)}%"></i></div>
                <div class="ends num"><span>mín. ${fmtPx(d.lo * f, a, q.currency)}</span><span>máx. ${fmtPx(d.hi * f, a, q.currency)}</span></div></div>
            <div class="verdict ${d.tone}-t">${esc(d.verdict)}</div>
            <ul class="dnotes">${d.notes.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>`;
    }
    function reasonList(list) {
        return `<ul class="reasons">${list.map((x) => `<li><span class="p ${x.pts > 0 ? 'up' : x.pts < 0 ? 'down' : 'flat'}-t">${x.pts > 0 ? '+' : ''}${x.pts || '·'}</span><span>${esc(x.txt)}</span></li>`).join('')}</ul>`;
    }

    function scoreBar(r) {
        return `<div class="score"><div class="bar"><i class="${r.tone}" style="width:${r.score}%"></i></div><span class="val num ${r.tone}-t">${r.score}</span></div>`;
    }

    const CL_TONE = { buy: 'up', scale: 'up', hold: 'flat', wait: 'flat', neutral: 'flat', turn: 'flat', avoid: 'down', sell: 'down' };
    function ideasCard(inv) {
        const L = (k) => hzOf(k, 'long'), M = (k) => hzOf(k, 'mid'), D = (k) => AN[k] && AN[k].discount;
        const base = inv.filter((k) => REG[k].kind === 'fund' && L(k)).sort((a, b) => L(b).score - L(a).score).slice(0, 3);
        const pool = etfCrypto() ? inv.filter(inPlan) : inv;
        const opps = pool.filter((k) => D(k) && D(k).opp).sort((a, b) => D(b).score - D(a).score).slice(0, 5);
        const avoid = pool.filter((k) => L(k) && L(k).score < 42 && M(k) && M(k).score < 42).sort((a, b) => L(a).score - L(b).score).slice(0, 4);
        if (!base.length && !opps.length && !avoid.length) return '';
        const item = (k, txt, tone) => `<button type="button" class="idea" data-open="${esc(k)}"><span class="i-n">${esc(nameOf(k))}</span><span class="i-t ${tone}-t">${esc(txt)}</span></button>`;
        const blk = (title, sub, items) => items.length ? `<div class="i-blk"><div class="i-h">${title}<small>${sub}</small></div>${items.join('')}</div>` : '';
        return `<div class="ideas"><div class="m-l">Sinais automáticos</div>
            ${blk('Base de longo prazo', 'ETF para o plano mensal', base.map((k) => item(k, `${L(k).score} · ${D(k) ? D(k).tag.toLowerCase() : ''}`, L(k).tone)))}
            ${blk('Oportunidades agora', 'desconto com a tendência longa a subir — comprar aos poucos', opps.map((k) => item(k, `${fmtPct(D(k).dd * 100)} do máx.`, 'up')))}
            ${blk('Evitar por agora', 'a descer a médio e a longo prazo', avoid.map((k) => item(k, `${L(k).score} · ${L(k).label.toLowerCase()}`, 'down')))}
            <p class="note">Regras fixas (tendência, desconto, RSI). No teste de 2 anos não bateram o VWCE: servem de referência e de dado para o Claude, não de recomendação.</p></div>`;
    }

    function trackSection() {
        if (cfg.proxy && !JOURNAL) loadJournal();
        const pc = (x) => (x == null || !fin(x) ? '—' : fmtPct(x * 100));
        const tone = (x) => (x == null ? 'flat' : toneOf(x * 100));
        const order = ['buy', 'scale', 'hold', 'wait', 'neutral', 'turn', 'avoid'];
        const ev = evalJournal();
        const jrows = ev && ev.acc ? order.filter((k) => ev.acc[k]).map((k) => { const a = ev.acc[k]; return `<tr><td>${esc(ACT[k])}</td><td class="num">${a.n}</td><td class="num ${tone(a.s / a.n)}-t">${pc(a.s / a.n)}</td><td class="num">${k === 'buy' || k === 'scale' || k === 'avoid' ? pc(a.h / a.n) : '—'}</td><td class="num ${tone(a.xn ? a.xs / a.xn : null)}-t">${pc(a.xn ? a.xs / a.xn : null)}</td></tr>`; }).join('') : '';
        let bt = '';
        if (BT && BT.running) bt = '<div class="note">A testar as regras atuais nos últimos 2 anos…</div>';
        else if (BT && BT.error) bt = `<div class="note">Não deu: ${esc(BT.error)}</div>`;
        else if (BT && BT.sum) {
            const rows = order.filter((k) => BT.sum[k]).map((k) => { const a = BT.sum[k]; return `<tr><td>${esc(ACT[k])}</td><td class="num">${a.n63}</td><td class="num ${tone(a.avg63)}-t">${pc(a.avg63)}</td><td class="num">${k === 'buy' || k === 'scale' || k === 'avoid' ? pc(a.hit63) : '—'}</td><td class="num ${tone(a.ex63)}-t">${pc(a.ex63)}</td></tr>`; }).join('');
            const kinds = Object.entries(BT.byKind || {}).filter(([, v]) => v.n).map(([k, v]) => `${{ stock: 'ações', fund: 'outros ETF', crypto: 'cripto' }[k] || k} <span class="${tone(v.s / v.n)}-t">${pc(v.s / v.n)}</span>`).join(' · ');
            bt = `<table class="tt"><thead><tr><th>Sugestão</th><th>Casos</th><th>3 meses</th><th>Acerto</th><th>vs VWCE</th></tr></thead><tbody>${rows}</tbody></table>
                ${kinds ? `<p class="note">Em média, face ao VWCE a 3 meses: ${kinds}.</p>` : ''}
                ${BT.worst.length ? `<p class="note">Onde "comprar" correu pior: ${BT.worst.map((x) => `${esc(nameOf(x.k))} <span class="${tone(x.a)}-t">${pc(x.a)}</span>`).join(', ')}. Melhor: ${BT.best.map((x) => `${esc(nameOf(x.k))} <span class="${tone(x.a)}-t">${pc(x.a)}</span>`).join(', ')}.</p>` : ''}
                <p class="note"><b>Leitura:</b> a lista são as empresas que hoje são grandes (viés de sobrevivência), por isso quase tudo parece bater o VWCE a olhar para trás. O que conta é a diferença entre sugestões: se "Evitar" corre tão bem ou melhor do que "Comprar", as regras não preveem nada. Por isso o núcleo é o VWCE e as decisões são do Claude, com o diário real a medir se acerta.</p>`;
        } else bt = `<button type="button" class="btn" data-act="backtest" ${cfg.proxy ? '' : 'disabled'}>Testar as regras nos últimos 5 anos</button>`;
        const c = CLAUDE && !CLAUDE.missing ? CLAUDE : null;
        return `<section class="sec res-sec">
            <div class="box cl-box"><h3>Conselhos do Claude</h3>
                ${c && c.review ? `<p class="muted">${esc(c.review)}</p>` : `<div class="note">${cfg.proxy ? 'Ainda sem revisão: o Claude compara os conselhos com o que aconteceu a partir do segundo dia.' : 'Liga o conector para ver a análise do Claude.'}</div>`}
                ${c && Array.isArray(c.lessons) && c.lessons.length ? `<details class="how in"><summary>O que o Claude aprendeu até agora (${c.lessons.length})</summary><ul>${c.lessons.map((l) => `<li>${esc(l)}</li>`).join('')}</ul></details>` : ''}
            </div>
            <div class="box"><h3>Diário real (regras automáticas)</h3>
                ${!cfg.proxy ? '<div class="note">Liga o conector para guardar o diário.</div>' : !ev ? '<div class="note">A ler o diário…</div>'
                : !jrows ? `<div class="note">A app guarda as sugestões de cada dia em que a abres (${ev.days || 0} dia${ev.days === 1 ? '' : 's'} até agora). Os primeiros resultados aparecem a partir de amanhã; ao fim de 1–3 meses ficam significativos.</div>`
                : `<table class="tt"><thead><tr><th>Sugestão</th><th>Casos</th><th>Desde então</th><th>Acerto</th><th>vs VWCE</th></tr></thead><tbody>${jrows}</tbody></table><p class="note">Desde ${esc(ev.since)} · ${ev.days} dias guardados. "Acerto": comprar → subiu; evitar → desceu.</p>`}
            </div>
            <div class="box"><h3>Teste no passado (regras atuais)</h3>${BT && BT.sum ? `<p class="note" style="margin-top:0">${BT.n} ativos · ${BT.yrs || 5} anos · preços ajustados (dividendos incluídos) · comissão de 1 € por compra manual de ${fmtPx(BT.ticket, { decimals: 0 }, 'EUR')} (${(100 / BT.ticket).toFixed(1).replace('.', ',')}%); ETF por plano de poupança, sem comissão. Não inclui impostos.</p>` : ''}${bt}</div></section>`;
    }

    function viewAnalysis() {
        const keys = Object.keys(AN).filter((k) => listed(k) && (REG[k].kind !== 'index' || k === 'GC=F'));
        const inv = keys.filter(investable);
        const f = cfg.filter;
        const hz = cfg.hz;
        const shown = keys.filter((k) => hzOf(k, hz) && (f === 'all' ? investable(k) : f === 'plan' ? investable(k) && inPlan(k) : REG[k].kind === f || (f === 'energy' && k === 'GC=F'))).sort((a, b) => hzOf(b, hz).score - hzOf(a, hz).score);
        const top = shown.slice(0, 3);
        const chips = [['plan', 'ETF + cripto'], ['all', 'Tudo'], ['fund', 'ETF'], ['crypto', 'Cripto'], ['stock', 'Ações'], ['energy', 'Futuros (referência)']];
        return `<h2 class="grp">Comparar ativos</h2>
        <p class="note grp-n">Pontuações automáticas (tendência, momento, desconto): servem para comparar, não dizem o que comprar. O conselho para o que tens está no Painel.</p>
        <div class="seg hz" role="group" aria-label="Prazo">${MODES.map(([v, l, d]) => `<button type="button" data-hz="${v}" class="${hz === v ? 'on' : ''}"><b>${l}${v === 'disc' ? '' : ' prazo'}</b><small>${d}</small></button>`).join('')}</div>
        <div class="chips" role="group" aria-label="Filtro">${chips.map(([v, l]) => `<button type="button" data-filter="${v}" class="${f === v ? 'on' : ''}">${l}</button>`).join('')}</div>
        ${f === 'energy' ? '<p class="note" style="margin:0 2px 12px">Petróleo, gasóleo, gás e ouro aparecem aqui como contratos de futuros, só para referência. Na Trade Republic não se compram futuros: há ETC, que ao fim de anos perdem com os custos de rolagem. Para ouro, o ETC físico (Xetra-Gold, nos ETF) é a forma habitual.</p>' : ''}
        ${!shown.length ? `<div class="empty">${cfg.proxy || f === 'crypto' || f === 'all' ? 'A calcular com o histórico de 1 ano…' : 'Liga o conector para analisar ações e energia.'}</div>` : `
        <section class="sec"><div class="sec-h"><h2>${hz === 'disc' ? 'Maiores oportunidades (desconto)' : `Mais fortes a ${{ short: 'curto', mid: 'médio', long: 'longo' }[hz]} prazo`}</h2></div>
            <div class="top3">${top.map((k, i) => `<button type="button" class="card" data-open="${esc(k)}" data-key="${esc(k)}">
                <div class="medal">${['1.º', '2.º', '3.º'][i]} lugar</div>
                <div class="c-top" style="margin-top:4px"><span class="c-name">${esc(nameOf(k))}</span><span class="c-sym">${esc(REG[k].sym)}</span></div>
                <div class="c-row" style="margin-top:8px">${scoreBar(hzOf(k, hz))}</div>
                <div class="c-sub ${hzOf(k, hz).tone}-t" style="margin-top:6px;white-space:normal">${esc(hzOf(k, hz).label)} · ${esc(AN[k].risk.label)}</div>
                <div class="c-sub" style="white-space:normal;margin-top:4px">${esc((hzOf(k, hz).reasons.find((r) => r.pts > 0) || {}).txt || '')}</div>
            </button>`).join('')}</div></section>
        <section class="sec"><div class="sec-h"><h2>Classificação</h2><span class="sub">${shown.length} ativos · 0 a 100</span></div>
            <p class="note" style="margin:-4px 2px 10px">Mede só a tendência e o momento de cada ativo: no teste no passado, comprar os primeiros desta lista não bateu o VWCE.</p>
            <div class="list">${shown.map((k, i) => `<button type="button" class="row" data-open="${esc(k)}" data-key="${esc(k)}">
                <span class="rk">${i + 1}</span>
                <div class="r-main"><div class="r-name">${esc(nameOf(k))}</div><div class="r-sub">${hz === 'disc' && AN[k].discount ? esc(fmtPct(AN[k].discount.dd * 100) + ' do máx. · ') : ''}${esc(AN[k].risk.label)} · ${fmtPct(qv(k).changePct)} hoje · RSI ${fin(AN[k].metrics.rsi) ? Math.round(AN[k].metrics.rsi) : '—'}</div></div>
                <div class="r-score">${scoreBar(hzOf(k, hz))}<div class="lbl ${hzOf(k, hz).tone}-t">${esc(hzOf(k, hz).label)}</div></div>
            </button>`).join('')}</div></section>`}
        <details class="auto"><summary>Sinais automáticos (algoritmo) — referência</summary>${ideasCard(inv)}</details>
        <details class="how"><summary>Como é calculada a pontuação?</summary><ul>
            <li><b>Curto prazo</b> (dias a 2 semanas): RSI, MACD, últimos 5 dias e distância à média de 20 dias. Uma queda muito forte pode dar ressalto.</li>
            <li><b>Médio prazo</b> (semanas a 3 meses): médias de 20 e 50 dias, variação de 1 e 3 meses, MACD e RSI.</li>
            <li><b>Longo prazo</b> (anos): média de 200 dias e se está a subir, variação de 1 ano e desconto face ao máximo. Uma descida com a tendência longa a subir conta como oportunidade para ir comprando aos poucos.</li>
            <li><b>Desconto</b>: quanto o preço está abaixo do máximo do último ano, com o RSI e a tendência longa. "Oportunidade" quando há desconto e a tendência longa ainda sobe; "Barato, mas a cair" quando a tendência longa desce (melhor esperar).</li>
            <li><b>RSI</b>: acima de 70 está "esticado" (risco de correção); abaixo de 30 está muito castigado (pode ressaltar).</li>
            <li><b>Notícias</b>: tom dos títulos recentes, quando já foram carregados.</li>
            <li><b>Risco</b>: volatilidade dos últimos 60 dias (quanto oscila).</li>
            <li>50 = neutro. Acima de 58 a tendência é positiva; acima de 70 é forte.</li></ul></details>
        <h2 class="grp">Resultados</h2>
        <p class="note grp-n">Como têm corrido os conselhos do Claude e as regras automáticas.</p>
        ${trackSection()}
        <div class="disc"><b>Isto não é aconselhamento financeiro.</b> A pontuação mede a tendência e o momento recentes — o que já aconteceu. Ninguém consegue garantir o que vai subir. Antes de investir: diversifica, não ponhas dinheiro de que precisas, prefere investir aos poucos, e lembra-te que cripto e ações pequenas podem cair 50% ou mais.</div>`;
    }

    function viewSettings() {
        const lim = +cfg.alertPct || 0;
        const notifState = !('Notification' in window) ? 'não suportado neste browser' : Notification.permission === 'denied' ? 'bloqueado nas definições do browser' : '';
        if (cfg.proxy && cfg.distrito && !MUNIC[cfg.distrito]) { MUNIC[cfg.distrito] = []; px(`/fuel/municipios?distrito=${encodeURIComponent(cfg.distrito)}`).then((d) => { MUNIC[cfg.distrito] = d.items || []; scheduleRender(); }).catch(() => { delete MUNIC[cfg.distrito]; }); }
        if (cfg.proxy && !DISTRITOS) px('/fuel/distritos').then((d) => { DISTRITOS = d.items || []; scheduleRender(); }).catch(() => { DISTRITOS = []; });
        const fhState = !cfg.finnhub ? '' : st.fh === 'on' ? 'Ligado: ações dos EUA em tempo real.' : st.fh ? 'Finnhub: ' + st.fh : 'A ligar…';
        return `<section class="sec"><div class="sec-h"><h2>Ações dos EUA em tempo real</h2></div>
            <div class="form"><div><label for="f-fh">Chave Finnhub (grátis)</label>
                <div class="inl"><input id="f-fh" class="inp" type="password" autocomplete="off" spellcheck="false" placeholder="cola aqui a chave" value="${esc(cfg.finnhub || '')}"><button type="button" class="btn pri" data-act="save-fh">Guardar</button></div>
                <div class="hint">${fhState ? esc(fhState) + ' ' : ''}Cria uma conta grátis em finnhub.io e copia a "API key". Fica só neste telemóvel. Cobre ações dos EUA (Apple, Nvidia…); ETF europeus e o VWCE continuam pelo conector, com até 15 min de atraso. Cripto já é em tempo real.</div></div></div></section>
        <section class="sec" id="conector"><div class="sec-h"><h2>Conector de dados</h2></div>
            <div class="form">
                <div><label for="f-proxy">Endereço do teu Worker</label>
                    <div class="inl"><input id="f-proxy" class="inp" type="url" inputmode="url" autocomplete="off" spellcheck="false" placeholder="https://mercados-proxy.<conta>.workers.dev" value="${esc(cfg.proxy)}">
                    <button type="button" class="btn pri" data-act="save-proxy">Guardar</button></div>
                    <div class="hint" id="f-proxy-msg">${cfg.proxy ? (st.yahooErr ? 'Último erro: ' + esc(st.yahooErr) : st.yahooAt ? 'Ligado. Última leitura ' + esc(ago(st.yahooAt)) + '.' : 'A testar…') : 'Publica o Worker da pasta <code>mercados/proxy</code> (<code>npx wrangler deploy</code>) e cola aqui o URL.'}</div></div>
            </div></section>
        <section class="sec"><div class="sec-h"><h2>O teu plano na Trade Republic</h2></div>
            <div class="form">
                <div><label for="f-budget">Quanto investes por mês (€)</label>
                    <input id="f-budget" class="inp" type="number" inputmode="decimal" min="0" step="50" data-cfg="budget" value="${+cfg.budget || ''}" placeholder="ex.: 900"></div>
                <div><label>Estratégia</label><div class="seg prof two"><button type="button" data-strat="etfcrypto" class="${etfCrypto() ? 'on' : ''}"><b>ETF + cripto</b><small>recomendado</small></button><button type="button" data-strat="mix" class="${etfCrypto() ? '' : 'on'}"><b>ETF + ações + cripto</b><small>com satélites</small></button></div>
                    <div class="hint">${etfCrypto() ? 'O plano do mês vai todo para o ETF núcleo e para a cripto, todos os meses. As ações ficam só como informação (o VWCE já as tem).' : 'O plano inclui ações como satélites, conforme os sinais.'}</div></div>
                ${etfCrypto() ? `<div><label>Fundo núcleo</label><select class="inp" data-cfg="coreFund">${cfg.funds.map((f) => `<option value="${esc(f)}" ${cfg.coreFund === f ? 'selected' : ''}>${esc(nameOf(f))}</option>`).join('')}</select></div>
                <div><label>Parte em cripto</label><div class="chips days">${[0, 5, 10, 15].map((v) => `<button type="button" data-cpct="${v}" class="${+cfg.cryptoPct === v ? 'on' : ''}">${v}%</button>`).join('')}</div>
                    <div class="seg prof two" style="margin-top:8px"><button type="button" data-cmix="btc" class="${cfg.cryptoMix !== 'btceth' ? 'on' : ''}"><b>Só Bitcoin</b></button><button type="button" data-cmix="btceth" class="${cfg.cryptoMix === 'btceth' ? 'on' : ''}"><b>Bitcoin 70 / Ether 30</b></button></div>
                    <div class="hint">Cripto entra todos os meses (sem tentar acertar no momento). Em Portugal, vender ao fim de 365 dias ou mais está isento de IRS.</div></div>` : ''}
                <div><label>O que tenho</label><div class="chips days">${cfg.funds.concat(CRYPTO.map((c) => 'c:' + c.id)).map((k) => `<button type="button" data-hold="${esc(k)}" class="${cfg.holdings.includes(k) ? 'on' : ''}">${esc(nameOf(k))}</button>`).join('')}</div>
                    <div class="hint">A app acompanha e avisa sobre estes; o conselheiro analisa-os todos os dias.</div></div>
                <div ${etfCrypto() ? 'hidden' : ''}><label>Perfil de risco</label><div class="seg prof">${Object.entries(PROFILES).map(([v, [n, c, s, cr]]) => `<button type="button" data-prof="${v}" class="${cfg.profile === v ? 'on' : ''}"><b>${n}</b><small>${Math.round(c * 100)}/${Math.round(s * 100)}/${Math.round(cr * 100)}</small></button>`).join('')}</div>
                    <div class="hint">Núcleo (ETF) / satélites (ações) / cripto. O Resumo do dia divide o valor do mês por estas partes, conforme os sinais de cada ativo. No teste de 2 anos, as ações escolhidas uma a uma ficaram em média atrás do VWCE: quanto mais núcleo, menos risco de ficar para trás.</div></div>
                <div><label>Dias de execução dos planos na TR</label><div class="chips days">${[2, 9, 16, 23].map((d) => `<button type="button" data-sday="${d}" class="${cfg.saveDays.includes(d) ? 'on' : ''}">dia ${d}</button>`).join('')}</div>
                    <div class="hint">A TR executa os planos de poupança nos dias 2, 9, 16 e 23 (sem custos; dá para alterar até à véspera). Com 2 dias, o valor do mês divide-se a meio${+cfg.budget ? ` (${fmtPx(+cfg.budget / cfg.saveDays.length, { decimals: 0 }, 'EUR')} por execução)` : ''}. Na véspera, o Resumo do dia diz quanto pôr em cada plano.</div></div>
                <div><label>Diário das sugestões</label><div class="hint">Guardado no teu conector com o código <code class="sel">${esc(cfg.jid)}</code>. Se reinstalares a app, cola aqui o código para recuperar o histórico.</div>
                    <div class="inl" style="margin-top:6px"><input id="f-jid" class="inp" type="text" autocomplete="off" spellcheck="false" placeholder="código do diário"><button type="button" class="btn sm" data-act="jid">Usar</button></div></div>
            </div></section>
        <section class="sec"><div class="sec-h"><h2>Preferências</h2></div>
            <div class="form">
                <div><label>Tamanho da letra</label><div class="seg prof">${[['n', 'Normal'], ['l', 'Grande'], ['xl', 'Muito grande']].map(([v, l]) => `<button type="button" data-fs="${v}" class="${(cfg.fs || 'n') === v ? 'on' : ''}"><b>${l}</b></button>`).join('')}</div>
                    <div class="hint">Segue também o tamanho de texto do iPhone (Definições → Ecrã e brilho → Tamanho do texto).</div></div>
                <div class="sw"><span>Ações e fundos em euros<br><small class="hint">como na Trade Republic</small></span><div class="seg"><button type="button" data-eur="1" class="${cfg.eur ? 'on' : ''}">EUR</button><button type="button" data-eur="0" class="${cfg.eur ? '' : 'on'}">Moeda local</button></div></div>
                <div class="sw"><span>Moeda das cripto</span><div class="seg"><button type="button" data-fiat="EUR" class="${cfg.fiat === 'EUR' ? 'on' : ''}">EUR</button><button type="button" data-fiat="USD" class="${cfg.fiat === 'USD' ? 'on' : ''}">USD</button></div></div>
                <div><label for="f-lim">Avisar quando algo sobe ou cai mais de</label>
                    <select id="f-lim" class="inp" data-cfg="alertPct">${[0, 2, 3, 4, 5, 8, 10].map((p) => `<option value="${p}" ${lim === p ? 'selected' : ''}>${p ? '±' + p + '% no dia' : 'Não avisar'}</option>`).join('')}</select></div>
                <div class="sw"><span>Notificações no telemóvel${notifState ? ` <small class="hint">(${notifState})</small>` : ''}</span><button type="button" class="btn sm" data-act="notify">${cfg.notify && 'Notification' in window && Notification.permission === 'granted' ? 'Ligadas' : 'Ligar'}</button></div>
                <div class="sw"><span>Silêncio à noite (22h às 10h)<br><small class="hint">os avisos da noite chegam juntos de manhã, numa só notificação</small></span><div class="seg"><button type="button" data-act="quiet" data-v="1" class="${cfg.quiet !== false ? 'on' : ''}">Sim</button><button type="button" data-act="quiet" data-v="0" class="${cfg.quiet === false ? 'on' : ''}">Não</button></div></div>
                <div><label for="f-dist">Combustíveis: zona</label>
                    <select id="f-dist" class="inp" data-cfg="distrito"><option value="">Portugal (todos os postos)</option>${(DISTRITOS || []).map((d) => `<option value="${esc(d.id)}" ${String(d.id) === String(cfg.distrito) ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}</select>
                    ${cfg.distrito ? `<select id="f-mun" class="inp" data-cfg="municipio" style="margin-top:8px" aria-label="Concelho"><option value="">Todo o distrito</option>${(MUNIC[cfg.distrito] || []).map((m) => `<option value="${esc(m.id)}" ${String(m.id) === String(cfg.municipio) ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}</select>` : ''}</div>
            </div></section>
        <section class="sec"><div class="sec-h"><h2>Ações e fundos que sigo</h2><span class="sub">${cfg.watch.length + cfg.funds.length}</span><button type="button" class="right btn sm" data-act="reset-watch">Repor lista</button></div>
            <div class="form">
                <div><label for="f-add">Juntar ação ou fundo/ETF</label>
                    <input id="f-add" class="inp" type="search" autocomplete="off" placeholder="ex.: Mota-Engil, Ferrari, IWDA, AAPL…" ${cfg.proxy ? '' : 'disabled'}>
                    <div class="res" id="f-res"></div>
                    <div class="hint">Também podes escrever o símbolo do Yahoo Finance (ex.: <code>EGL.LS</code>, <code>RACE.MI</code>) e carregar Enter.</div></div>
                <div class="wl">${cfg.funds.concat(cfg.watch).map((s) => `<div class="wl-i"><span>${esc(nameOf(s))} <small>${esc(s)}</small></span><button type="button" class="xbtn" data-rm="${esc(s)}" aria-label="Tirar ${esc(nameOf(s))}">×</button></div>`).join('')}</div>
            </div></section>
        <div class="disc"><b>Mercados ${VERSION}.</b> Cripto: Binance. Ações, índices, petróleo e notícias: Yahoo Finance e Google Notícias, através do teu conector. Combustíveis: DGEG. Os dados podem ter atrasos ou falhas; confirma sempre na tua corretora antes de comprar ou vender. Não é aconselhamento financeiro.</div>`;
    }

    // ---------- folha de detalhe ----------
    let sheetKey = null, sheetRange = '1d', sheetPts = null, sheetDraw = null, sheetLoadId = 0;
    const RANGE_LBL = [['1d', '1D'], ['5d', '5D'], ['1mo', '1M'], ['6mo', '6M'], ['1y', '1A'], ['5y', '5A']];

    function openSheet(k, tempName) {
        if (!REG[k]) REG[k] = { key: k, kind: 'stock', sym: k, name: tempName || k, temp: true };
        sheetKey = k; sheetRange = '1d'; sheetPts = null;
        const sh = $('#mk-sheet');
        const cardEl = $('#mk-sheet-card');
        cardEl.style.transition = ''; cardEl.style.transform = ''; $('.mk-sheet-bg').style.opacity = '';
        sh.hidden = false;
        document.body.style.overflow = 'hidden';
        renderSheet();
        loadSheetChart();
        if (!AN[k]) ensureAnalysis(k);
        loadNews(k).then(() => { if (sheetKey === k) { analyseOne(k); renderSheet(true); } }).catch(() => {});
        if (!Q[k] || Q[k].stale) {
            const a = REG[k];
            if (a.kind !== 'crypto' && cfg.proxy) px(`/quotes?symbols=${encodeURIComponent(k)}&range=1d`).then((r) => { const q = r.quotes && r.quotes[0]; if (q && !q.error) { Q[k] = { ...q, stale: false }; if (sheetKey === k) renderSheet(true); } }).catch(() => {});
        }
    }
    function closeSheet(animated) {
        const done = () => { $('#mk-sheet').hidden = true; document.body.style.overflow = ''; sheetKey = null; scheduleRender(); };
        if (!animated) { done(); return; }
        const c = $('#mk-sheet-card');
        c.style.transition = 'transform .22s ease-in'; c.style.transform = 'translateY(105%)';
        $('.mk-sheet-bg').style.transition = 'opacity .22s'; $('.mk-sheet-bg').style.opacity = '0';
        setTimeout(done, 220);
    }
    // puxar a folha para baixo para fechar (como nas apps de bolsa)
    (function swipeToClose() {
        const c = $('#mk-sheet-card'), bg = $('.mk-sheet-bg');
        let y0 = null, dy = 0, t0 = 0, drag = false;
        c.addEventListener('touchstart', (e) => {
            if (e.touches.length !== 1 || e.target.closest('#d-cv')) { y0 = null; return; }
            y0 = e.touches[0].clientY; dy = 0; t0 = Date.now(); drag = false;
        }, { passive: true });
        c.addEventListener('touchmove', (e) => {
            if (y0 == null) return;
            dy = e.touches[0].clientY - y0;
            if (!drag) {
                if (dy > 6 && c.scrollTop <= 0) drag = true;
                else if (dy < -6 || c.scrollTop > 0) { y0 = null; return; }
                else return;
            }
            e.preventDefault();
            const d = Math.max(0, dy);
            c.style.transition = 'none'; c.style.transform = `translateY(${d}px)`;
            bg.style.transition = 'none'; bg.style.opacity = String(Math.max(0.15, 1 - d / 500));
        }, { passive: false });
        const end = () => {
            if (y0 == null) return;
            const was = drag; y0 = null; drag = false;
            if (!was) return;
            const v = dy / Math.max(1, Date.now() - t0);
            if (dy > 110 || (dy > 30 && v > 0.5)) { closeSheet(true); return; }
            c.style.transition = 'transform .2s ease-out'; c.style.transform = '';
            bg.style.transition = 'opacity .2s'; bg.style.opacity = '';
        };
        c.addEventListener('touchend', end);
        c.addEventListener('touchcancel', end);
    })();
    function analyseOne(k) {
        const c = closesFor(k);
        if (!c) return;
        const r = A.analyse(c, { crypto: REG[k].kind === 'crypto', kind: REG[k].kind, news: NEWS[k] ? A.newsTone(NEWS[k].items) : null });
        if (r) AN[k] = r;
    }
    async function ensureAnalysis(k) {
        try {
            if (REG[k].kind === 'crypto') D[k] = await klines(REG[k].sym, '1y');
            else { const r = await px(`/quotes?symbols=${encodeURIComponent(k)}&range=1y`); const q = r.quotes && r.quotes[0]; if (q && q.series) D[k] = q.series; }
            analyseOne(k);
            if (sheetKey === k) renderSheet(true);
        } catch { /* sem análise */ }
    }
    // série do dia sem conversão de moeda: a de Munique (gettex) quando é a mais recente, como no Painel
    function daySeries(k) {
        const a = REG[k], q0 = Q[k], lv = a && a.live && Q[a.live];
        if (lv && lv.series && lv.series.length > 1 && (lv.time || 0) > (q0.time || 0) && (lv.currency || q0.currency) === q0.currency) return lv.series;
        return q0.series;
    }
    async function loadSheetChart() {
        const k = sheetKey, range = sheetRange, id = ++sheetLoadId;
        const a = REG[k];
        sheetPts = null; drawSheetChart();
        try {
            let pts;
            if (a.kind === 'crypto') pts = range === '1d' && Q[k] && Q[k].series && Q[k].series.length > 20 ? Q[k].series : await klines(a.sym, range);
            else if (range === '1d' && Q[k] && Q[k].series && Q[k].series.length > 1 && !Q[k].stale) pts = daySeries(k);
            else if (range === '1y' && D[k]) pts = D[k];
            else { const r = await px(`/quotes?symbols=${encodeURIComponent(k)}&range=${range}`, 20000); const q = r.quotes && r.quotes[0]; if (!q || q.error) throw new Error(q && q.error || 'sem dados'); pts = q.series; }
            if (id !== sheetLoadId) return;
            sheetPts = pts;
            renderSheetPrice();
        } catch (e) {
            if (id !== sheetLoadId) return;
            sheetPts = [];
            const l = $('#d-load'); if (l) l.textContent = cfg.proxy || a.kind === 'crypto' ? 'Sem dados para este período' : 'Liga o conector para ver o gráfico';
            return;
        }
        drawSheetChart();
    }
    function drawSheetChart(hover) {
        const cv = $('#d-cv');
        if (!cv || !sheetKey || !REG[sheetKey]) return;
        const l = $('#d-load');
        if (!sheetPts) { if (l) { l.hidden = false; l.textContent = 'A carregar…'; } setupCanvas(cv); return; }
        if (sheetPts.length < 2) return;
        if (l) l.hidden = true;
        const q = qv(sheetKey);
        const f = q.fx || 1;
        const pts = f === 1 ? sheetPts.slice() : sheetPts.map(([t, v]) => [t, v * f]);
        if (sheetRange !== '1d' && fin(q.price) && q.time && q.time > pts[pts.length - 1][0] + 60) pts.push([q.time, q.price]);
        const first = pts[0][1], lastv = pts[pts.length - 1][1];
        const base = sheetRange === '1d' && REG[sheetKey].kind !== 'crypto' ? q.prevClose : first;
        const tone = toneOf(sheetRange === '1d' ? q.changePct ?? (lastv / first - 1) * 100 : (lastv / first - 1) * 100);
        sheetDraw = drawLine(cv, pts, { tone, base, width: 2, pad: 10, byIndex: sheetRange !== '1d' });
        const tip = $('#d-tip');
        if (hover != null && sheetDraw) {
            const { g, X, Y, h } = sheetDraw;
            const p = pts[hover];
            g.strokeStyle = COL.muted; g.lineWidth = 1; g.beginPath(); g.moveTo(X(hover), 0); g.lineTo(X(hover), h); g.stroke();
            g.fillStyle = COL[tone]; g.beginPath(); g.arc(X(hover), Y(p[1]), 4, 0, 7); g.fill();
            if (tip) tip.innerHTML = `<b class="num">${fmtPx(p[1], REG[sheetKey], q.currency)}</b> · ${esc(dateLbl(p[0], ['1d', '5d', '1mo'].includes(sheetRange)))} · <span class="${toneOf((p[1] / base - 1) * 100)}-t">${fmtPct((p[1] / base - 1) * 100)}</span>`;
        } else if (tip) {
            const ch = (lastv / first - 1) * 100;
            tip.innerHTML = sheetRange === '1d' ? 'Hoje · arrasta no gráfico para ver valores' : `No período: <span class="${toneOf(ch)}-t">${fmtPct(ch)}</span> · arrasta no gráfico`;
        }
    }
    const PERIOD = { '1d': 'hoje', '5d': '5 dias', '1mo': '1 mês', '6mo': '6 meses', '1y': '1 ano', '5y': '5 anos' };
    function renderSheetPrice() {
        const k = sheetKey; const q = qv(k); const a = REG[k];
        const el = $('#d-px'); if (!el) return;
        const eurusd = Q['EURUSD=X'] && Q['EURUSD=X'].price;
        const l = a.perLitre ? A.usdGalToEurL(q.price, eurusd) : null;
        let pct = q.changePct, diff = q.change, lbl = a.kind === 'crypto' ? '24 h' : 'hoje';
        if (sheetRange !== '1d' && sheetPts && sheetPts.length > 1 && fin(q.price)) {
            const f = q.fx || 1;
            const first = sheetPts[0][1] * f;
            pct = (q.price / first - 1) * 100; diff = q.price - first; lbl = PERIOD[sheetRange];
        }
        const orig = q.origCurrency ? ` · ${fmtPx(q.origPrice, a, q.origCurrency)}` : '';
        const dd = fin(diff) ? (diff > 0 ? '+' : diff < 0 ? '−' : '') + fmtPx(Math.abs(diff), { decimals: Math.abs(diff) >= 1 || !fin(diff) ? 2 : 4 }, q.currency) : '';
        el.innerHTML = `<span class="px num">${fmtPx(q.price, a, q.currency)}</span>${chg(pct)}<span class="alt num">${dd} ${esc(lbl)}${orig}${l ? ` · ≈ ${fmtPx(l, { decimals: 3 }, 'EUR')}/L` : ''}</span>`;
    }
    function renderSheet() {
        const k = sheetKey; if (!k) return;
        const a = REG[k], q = qv(k), r = AN[k], n = NEWS[k];
        const following = cfg.watch.includes(k) || cfg.funds.includes(k);
        const stat = (l, v) => `<div><small>${l}</small><b class="num">${v}</b></div>`;
        const box = $('#mk-sheet-card');
        const scroll = box.scrollTop;
        box.innerHTML = `<div class="grab"></div>
            <div class="d-head"><div><h2 id="mk-sheet-title">${esc(nameOf(k))}</h2><div class="d-sub">${esc([a.kind === 'crypto' ? a.sym + '/' + cfg.fiat : a.sym, q.venue || q.exchange, q.open === false ? 'mercado fechado' : q.open ? 'mercado aberto' : ''].filter(Boolean).join(' · '))}</div></div>
                <button type="button" class="mk-ibtn" data-act="close" aria-label="Fechar"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
            <div class="d-px" id="d-px"></div>
            <div class="d-tip" id="d-tip"></div>
            <div class="d-chart"><canvas id="d-cv"></canvas><div class="loading" id="d-load">A carregar…</div></div>
            <div class="ranges">${RANGE_LBL.map(([v, l]) => `<button type="button" data-range="${v}" class="${sheetRange === v ? 'on' : ''}">${l}</button>`).join('')}</div>
            ${adviceBox(k, q)}
            <div class="stats">
                ${stat('Máx. do dia', fmtPx(q.dayHigh, a, q.currency))}${stat('Mín. do dia', fmtPx(q.dayLow, a, q.currency))}
                ${a.kind === 'crypto' ? stat('Volume 24 h', fmtBig(q.volume) + ' ' + cfg.fiat) : stat('Fecho anterior', fmtPx(q.prevClose, a, q.currency))}
                ${a.kind === 'crypto' ? stat('Variação 24 h', fmtPct(q.changePct)) : stat('Volume', fmtBig(q.volume))}
                ${fin(q.high52) ? stat('Máx. 52 sem.', fmtPx(q.high52, a, q.currency)) + stat('Mín. 52 sem.', fmtPx(q.low52, a, q.currency)) : ''}
                ${r ? stat('RSI (14)', fin(r.metrics.rsi) ? Math.round(r.metrics.rsi) : '—') + stat('Volatilidade', fin(r.metrics.vol) ? Math.round(r.metrics.vol * 100) + '%/ano' : '—') : ''}
            </div>
            <div class="box"><h3>Análise técnica ${r ? `<span class="chip-s">${esc(r.risk.label)}</span>` : ''}</h3>
                ${r ? `${HZ.map(([hz, l, d]) => { const h = r.horizons && r.horizons[hz]; return h ? `<details class="hzb" ${hz === cfg.hz ? 'open' : ''}><summary>
                    <div class="hz-t"><b>${l} prazo</b><small>${d}</small></div>
                    <div class="hz-s">${scoreBar(h)}<div class="lbl ${h.tone}-t">${esc(h.label)}</div></div></summary>
                    ${reasonList(h.reasons)}</details>` : `<div class="hzb na"><div class="hz-t"><b>${l} prazo</b><small>${d}</small></div><div class="note">Histórico curto demais.</div></div>`; }).join('')}
                <p class="note">Toca num prazo para ver as razões. Descreve o passado recente, não garante o futuro.</p>` : `<div class="note">${cfg.proxy || a.kind === 'crypto' ? 'A calcular com o histórico de 1 ano…' : 'Liga o conector para ver a análise.'}</div>`}
            </div>
            ${a.kind === 'energy' || k === 'GC=F' ? '<p class="note" style="margin:-4px 2px 14px">Contrato de futuros (referência). Na Trade Republic não se compra diretamente; existem ETC, com custos de rolagem a prazo.</p>' : ''}
            ${levelsBox(k, q)}
            ${discountBox(k, q)}
            ${taxBox(k)}
            <div class="box"><h3>Notícias</h3>
                ${!cfg.proxy ? '<div class="note">Liga o conector para ver notícias.</div>' : !n ? '<div class="note">A procurar notícias…</div>' : !n.items.length ? '<div class="note">Sem notícias nos últimos 3 dias.</div>'
                : `<ul class="news">${n.items.map((it) => `<li><a href="${esc(safeUrl(it.link))}" target="_blank" rel="noopener noreferrer"><span class="tone ${it.tone.tone}">${esc(it.tone.label)}</span>${esc(it.title)}</a>
                    <div class="meta">${esc([it.source, it.time ? ago(it.time * 1000) : ''].filter(Boolean).join(' · '))}</div></li>`).join('')}</ul>`}
            </div>
            <div class="d-actions">
                ${isHolding(k) ? `<button type="button" class="btn ${following ? '' : 'pri'}" data-act="follow">${following ? 'Deixar de seguir' : '+ Seguir'}</button>` : ''}
                <a class="btn" href="${a.kind === 'crypto' ? `https://www.binance.com/pt/trade/${esc(a.sym)}_${cfg.fiat === 'EUR' ? 'EUR' : 'USDT'}` : `https://finance.yahoo.com/quote/${encodeURIComponent(k)}`}" target="_blank" rel="noopener">Ver na ${a.kind === 'crypto' ? 'Binance' : 'Yahoo Finance'}</a>
            </div>`;
        box.scrollTop = scroll;
        renderSheetPrice();
        requestAnimationFrame(() => drawSheetChart());
        bindChartHover();
    }
    function bindChartHover() {
        const cv = $('#d-cv');
        if (!cv) return;
        const at = (ev) => {
            if (!sheetPts || sheetPts.length < 2 || !sheetDraw) return;
            const x = ev.clientX - cv.getBoundingClientRect().left;
            let best = 0, bd = Infinity;
            for (let i = 0; i < sheetPts.length; i++) { const d = Math.abs(sheetDraw.X(i) - x); if (d < bd) { bd = d; best = i; } }
            drawSheetChart(best);
        };
        cv.addEventListener('pointermove', at);
        cv.addEventListener('pointerdown', at);
        cv.addEventListener('pointerleave', () => drawSheetChart());
    }

    // ---------- lembretes no calendário (.ics) ----------
    function downloadIcs() {
        const pad = (n) => String(n).padStart(2, '0');
        const t = new Date();
        const stamp = `${t.getUTCFullYear()}${pad(t.getUTCMonth() + 1)}${pad(t.getUTCDate())}T${pad(t.getUTCHours())}${pad(t.getUTCMinutes())}00Z`;
        const url = location.origin + location.pathname;
        const ev = cfg.saveDays.map((d) => {
            const day = d - 1; // véspera: último dia para alterar o plano
            let first = new Date(t.getFullYear(), t.getMonth(), day);
            if (first < new Date(t.getFullYear(), t.getMonth(), t.getDate())) first = new Date(t.getFullYear(), t.getMonth() + 1, day);
            const ds = `${first.getFullYear()}${pad(first.getMonth() + 1)}${pad(first.getDate())}`;
            return ['BEGIN:VEVENT', `UID:mercados-poupanca-dia${d}@escolaplay`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${ds}`, `RRULE:FREQ=MONTHLY;BYMONTHDAY=${day}`,
                'SUMMARY:Ajustar planos de poupança (Trade Republic)', `DESCRIPTION:Amanhã (dia ${d}) a TR executa os planos. Abre a app Mercados para ver quanto pôr em cada plano.`,
                `URL:${url}`, 'BEGIN:VALARM', 'TRIGGER:PT9H', 'ACTION:DISPLAY', 'DESCRIPTION:Ajustar planos da Trade Republic', 'END:VALARM', 'END:VEVENT'].join('\r\n');
        });
        const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Mercados//PT', 'CALSCALE:GREGORIAN', ...ev, 'END:VCALENDAR'].join('\r\n');
        const a = document.createElement('a');
        a.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics);
        a.download = 'mercados-poupanca.ics';
        document.body.appendChild(a); a.click(); a.remove();
        toast('Abre o ficheiro para juntar os lembretes ao calendário');
    }

    // ---------- avisos ----------
    let toastT = 0;
    function toast(msg, undo) {
        const t = $('#mk-toast');
        t.textContent = msg; t.classList.toggle('act', !!undo);
        if (undo) { const b = document.createElement('button'); b.type = 'button'; b.className = 't-undo'; b.textContent = 'Desfazer'; b.onclick = () => { t.classList.remove('show'); undo(); }; t.append(' ', b); }
        t.classList.add('show');
        clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), undo ? 5000 : 3200);
    }
    // retirar da lista (arrastar para a esquerda → Retirar), com "Desfazer"
    function hideAsset(k, grp) {
        const snap = { holdings: cfg.holdings.slice(), watch: cfg.watch.slice(), funds: cfg.funds.slice(), hidden: cfg.hidden.slice() };
        st.swipe = null;
        if (grp === 'hold') cfg.holdings = cfg.holdings.filter((x) => x !== k);
        else if (grp === 'list') { cfg.watch = cfg.watch.filter((x) => x !== k); cfg.funds = cfg.funds.filter((x) => x !== k); }
        else if (!cfg.hidden.includes(k)) cfg.hidden = cfg.hidden.concat(k);
        saveCfg(); grp === 'list' ? watchChanged() : render();
        toast(`${nameOf(k)} retirado${grp === 'hold' ? ' de Os meus ativos' : ''}`, () => { Object.assign(cfg, snap); saveCfg(); grp === 'list' ? watchChanged() : render(); });
    }
    // gesto: arrastar uma linha para a esquerda
    (() => {
        let w = null, x0 = 0, y0 = 0, dx = 0, mode = '';
        const W = 92;
        document.addEventListener('touchstart', (e) => {
            const el = e.target.closest && e.target.closest('.sw-wrap');
            if (!el || e.target.closest('.sw-del')) return;
            if (st.swipe && st.swipe !== el.dataset.swk) { $$('.sw-wrap.open').forEach((o) => o.classList.remove('open')); st.swipe = null; }
            w = el; x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; dx = 0; mode = ''; st.touching = true;
        }, { passive: true });
        document.addEventListener('touchmove', (e) => {
            if (!w) return;
            const mx = e.touches[0].clientX - x0, my = e.touches[0].clientY - y0;
            if (!mode && (Math.abs(mx) > 8 || Math.abs(my) > 8)) mode = Math.abs(mx) > Math.abs(my) ? 'h' : 'v';
            if (mode !== 'h') return;
            const base = w.classList.contains('open') ? -W : 0;
            dx = Math.max(-W * 1.4, Math.min(0, base + mx));
            const r = w.querySelector('.row'); r.style.transition = 'none'; r.style.transform = `translateX(${dx}px)`;
        }, { passive: true });
        document.addEventListener('touchend', () => {
            if (!w) return;
            const r = w.querySelector('.row');
            if (mode === 'h') {
                const open = dx < -W / 2;
                r.style.transition = ''; r.style.transform = '';
                w.classList.toggle('open', open); st.swipe = open ? w.dataset.swk : null;
                st.noClick = now() + 400; // o arrasto não abre a ficha
            }
            w = null; mode = ''; st.touching = false;
            if (st.renderLater) { st.renderLater = false; scheduleRender(); }
        }, { passive: true });
        document.addEventListener('click', (e) => {
            if (st.noClick && now() < st.noClick && e.target.closest('.sw-wrap') && !e.target.closest('.sw-del')) { e.stopPropagation(); e.preventDefault(); return; }
            const op = e.target.closest && e.target.closest('.sw-wrap.open');
            if (op && !e.target.closest('.sw-del')) { op.classList.remove('open'); st.swipe = null; e.stopPropagation(); e.preventDefault(); }
        }, true);
    })();

    // ---------- ações do utilizador ----------
    function refreshAll() {
        const b = $('[data-act="refresh"]');
        b.classList.add('spin');
        Promise.all([pollYahoo(), loadCryptoSeries(), ws ? null : cryptoREST(), cfg.tab === 'destaques' ? loadMovers() : null])
            .finally(() => { b.classList.remove('spin'); scheduleRender(); });
    }

    function watchChanged() {
        saveCfg(); buildReg(); loadCalendar();
        pollYahoo();
        loadDaily();
        scheduleRender();
    }

    let searchT = 0;
    async function doSearch(q) {
        const res = $('#f-res');
        if (!res) return;
        if (q.length < 2) { res.innerHTML = ''; return; }
        try {
            const d = await px(`/search?q=${encodeURIComponent(q)}`);
            if (($('#f-add') || {}).value !== q) return;
            res.innerHTML = (d.items || []).slice(0, 8).map((i) => `<button type="button" data-add="${esc(i.symbol)}" data-name="${esc(i.name)}" data-type="${esc(i.type || '')}">${esc(i.name)} <small>${esc([i.symbol, i.exchange, i.type].filter(Boolean).join(' · '))}</small></button>`).join('') || '<div class="hint">Sem resultados.</div>';
        } catch (e) { res.innerHTML = `<div class="hint">Erro: ${esc(e.message)}</div>`; }
    }
    function addWatch(sym, name, type) {
        sym = String(sym || '').trim().toUpperCase();
        if (!sym) return;
        const fund = /etf|fund|fundo/i.test(type || '');
        if (!cfg.watch.includes(sym) && !cfg.funds.includes(sym)) (fund ? cfg.funds : cfg.watch).push(sym);
        if (name && !NAMES[sym]) NAMES[sym] = name;
        if (REG[sym] && REG[sym].temp) delete REG[sym];
        toast(`${name || sym} junto à lista`);
        watchChanged();
    }

    document.addEventListener('click', (ev) => {
        const t = ev.target.closest('[data-act],[data-open],[data-tab],[data-sort],[data-range],[data-fiat],[data-filter],[data-lim],[data-rm],[data-add],[data-eur],[data-hz],[data-prof],[data-sday],[data-strat],[data-cpct],[data-cmix],[data-hold],[data-lotrm],[data-fs],[data-hide],[data-unhide]');
        if (!t) return;
        const d = t.dataset;
        if (d.tab) { cfg.tab = d.tab; saveCfg(); window.scrollTo(0, 0); if (d.tab === 'destaques' && !MOVERS) loadMovers(); render(); return; }
        if (d.open) { openSheet(d.open, d.name); return; }
        if (d.sort) { cfg.sort = d.sort; saveCfg(); render(); return; }
        if (d.filter) { cfg.filter = d.filter; saveCfg(); render(); return; }
        if (d.lim) { cfg.alertPct = +d.lim; saveCfg(); render(); return; }
        if (d.range) { sheetRange = d.range; $$('.ranges button').forEach((b) => b.classList.toggle('on', b.dataset.range === d.range)); loadSheetChart(); return; }
        if (d.fiat) {
            if (cfg.fiat === d.fiat) return;
            cfg.fiat = d.fiat; saveCfg();
            CRYPTO.forEach((c) => { delete Q['c:' + c.id]; delete D['c:' + c.id]; delete AN['c:' + c.id]; });
            wsTry = 0; startWS(); loadCryptoSeries(); loadCryptoDaily().then(() => { analyseAll(); scheduleRender(); });
            render(); return;
        }
        if (d.rm) { cfg.watch = cfg.watch.filter((s) => s !== d.rm); cfg.funds = cfg.funds.filter((s) => s !== d.rm); delete REG[d.rm]; delete Q[d.rm]; delete AN[d.rm]; watchChanged(); return; }
        if (d.add) { addWatch(d.add, d.name, d.type); return; }
        if (d.eur) { cfg.eur = d.eur === '1'; saveCfg(); render(); return; }
        if (d.hz) { cfg.hz = d.hz; saveCfg(); render(); return; }
        if (d.prof) { cfg.profile = d.prof; saveCfg(); render(); return; }
        if (d.strat) { cfg.strategy = d.strat; saveCfg(); render(); return; }
        if (d.cpct != null) { cfg.cryptoPct = +d.cpct; saveCfg(); render(); return; }
        if (d.cmix) { cfg.cryptoMix = d.cmix; saveCfg(); render(); return; }
        if (d.lotrm != null && sheetKey) { const L = lotOf(sheetKey); setLots(sheetKey, { plan: L.plan || '', buys: (L.buys || []).filter((_, i) => i !== +d.lotrm) }); toast('Compra apagada'); return; }
        if (d.hide) { hideAsset(d.hide, d.grp); return; }
        if (d.unhide) { const set = { crypto: CRYPTO.map((c) => 'c:' + c.id), energy: ENERGY.map((e) => e.sym), index: INDICES.map((i) => i.sym) }[d.unhide] || []; cfg.hidden = cfg.hidden.filter((k) => !set.includes(k)); saveCfg(); render(); toast('Lista reposta'); return; }
        if (d.fs) { cfg.fs = d.fs; applyFs(); saveCfg(); render(); return; }
        if (d.hold) { cfg.holdings = cfg.holdings.includes(d.hold) ? cfg.holdings.filter((x) => x !== d.hold) : cfg.holdings.concat(d.hold); saveCfg(); render(); return; }
        if (d.sday) {
            const n = +d.sday;
            cfg.saveDays = cfg.saveDays.includes(n) ? cfg.saveDays.filter((x) => x !== n) : cfg.saveDays.concat(n).sort((a, b) => a - b);
            if (!cfg.saveDays.length) cfg.saveDays = [n];
            saveCfg(); render(); return;
        }
        switch (d.act) {
            case 'refresh': refreshAll(); break;
            case 'close': closeSheet(true); break;
            case 'follow': {
                const k = sheetKey;
                if (cfg.watch.includes(k) || cfg.funds.includes(k)) { cfg.watch = cfg.watch.filter((s) => s !== k); cfg.funds = cfg.funds.filter((s) => s !== k); toast('Retirado da lista'); }
                else { (REG[k] && REG[k].kind === 'fund' ? cfg.funds : cfg.watch).push(k); if (REG[k]) delete REG[k].temp; toast('Junto à lista'); }
                watchChanged(); renderSheet(true); break;
            }
            case 'save-proxy': {
                const v = ($('#f-proxy').value || '').trim().replace(/\/+$/, '');
                if (v && !/^https:\/\/[^\s/]+/.test(v)) { toast('O endereço tem de começar por https://'); return; }
                cfg.proxy = v; saveCfg(); st.yahooErr = ''; st.yahooAt = 0; DISTRITOS = null;
                $('#f-proxy').blur();
                if (!v) { render(); return; }
                const msg = $('#f-proxy-msg'); if (msg) msg.textContent = 'A testar…';
                px('/health').then(() => { toast('Conector ligado ✓'); pollYahoo(); loadDaily(); loadFuel(); loadMovers(); loadCalendar(); loadClaude(); })
                    .catch((e) => { st.yahooErr = e.message; toast('Não respondeu: ' + e.message); scheduleRender(); });
                break;
            }
            case 'notify': {
                if (!('Notification' in window)) { toast('Este browser não suporta notificações'); return; }
                Notification.requestPermission().then((p) => { cfg.notify = p === 'granted'; saveCfg(); toast(cfg.notify ? 'Notificações ligadas' : 'Notificações não autorizadas'); render(); });
                break;
            }
            case 'save-fh': {
                cfg.finnhub = ($('#f-fh').value || '').trim(); saveCfg(); $('#f-fh').blur();
                fwsTry = 0; startFinnhub(); toast(cfg.finnhub ? 'A ligar à Finnhub…' : 'Tempo real das ações desligado');
                setTimeout(render, 2500); break;
            }
            case 'backtest': runBacktest(); break;
            case 'ics': downloadIcs(); break;
            case 'go-add': cfg.tab = 'ajustes'; saveCfg(); render(); setTimeout(() => { const i = $('#f-add'); if (i) { i.scrollIntoView({ block: 'center' }); i.focus(); } }, 50); break;
            case 'go-hold': cfg.tab = 'ajustes'; saveCfg(); render(); setTimeout(() => { const h = $('[data-hold]'); if (h) h.scrollIntoView({ block: 'center' }); }, 50); break;
            case 'quiet': cfg.quiet = t.dataset.v === '1'; saveCfg(); render(); break;
            case 'lot-add': {
                const k = sheetKey, dt = ($('#lot-d') || {}).value || '', e = +(($('#lot-e') || {}).value || 0);
                if (!k || !/^\d{4}-\d{2}-\d{2}$/.test(dt) || dt > todayLocal()) { toast('Escolhe a data da compra'); break; }
                const L = lotOf(k);
                setLots(k, { plan: L.plan || '', buys: (L.buys || []).concat({ d: dt, e: e > 0 ? e : 0 }) });
                toast('Compra guardada'); break;
            }
            case 'lot-plan': {
                const k = sheetKey, dt = ($('#lot-plan') || {}).value || '';
                if (!k || (dt && (!/^\d{4}-\d{2}-\d{2}$/.test(dt) || dt > todayLocal()))) { toast('Data inválida'); break; }
                const L = lotOf(k);
                setLots(k, { plan: dt, buys: L.buys || [] });
                toast(dt ? 'Plano mensal guardado' : 'Plano mensal apagado'); break;
            }
            case 'jid': {
                const v = ($('#f-jid').value || '').trim().toLowerCase();
                if (!/^[a-z0-9-]{8,40}$/.test(v)) { toast('Código inválido'); return; }
                cfg.jid = v; cfg.jLast = ''; saveCfg(); JOURNAL = null; toast('Diário recuperado'); loadJournal(); render(); break;
            }
            case 'reset-watch': cfg.watch = DEFAULT_WATCH.slice(); cfg.funds = DEFAULT_FUNDS.slice(); watchChanged(); break;
        }
    });

    document.addEventListener('change', (ev) => {
        const t = ev.target;
        if (t.dataset && t.dataset.cfg) {
            cfg[t.dataset.cfg] = ['alertPct', 'budget'].includes(t.dataset.cfg) ? Math.max(0, +t.value || 0) : t.value;
            saveCfg();
            if (t.dataset.cfg === 'distrito') { cfg.municipio = ''; saveCfg(); FUEL = null; loadFuel(); render(); }
            if (t.dataset.cfg === 'municipio') { FUEL = null; loadFuel(); }
            t.blur(); render();
        }
    });
    document.addEventListener('input', (ev) => {
        if (ev.target.id === 'f-add') { clearTimeout(searchT); const v = ev.target.value.trim(); searchT = setTimeout(() => doSearch(v), 300); }
    });
    document.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape' && sheetKey) closeSheet(true);
        if (ev.key === 'Enter' && ev.target.id === 'f-add') {
            const v = ev.target.value.trim();
            if (/^[\^A-Za-z0-9.=\-]{1,15}$/.test(v)) { ev.target.value = ''; ev.target.blur(); addWatch(v); }
        }
        if (ev.key === 'Enter' && ev.target.id === 'f-proxy') { ev.preventDefault(); $('[data-act="save-proxy"]').click(); }
    });
    window.addEventListener('resize', () => { drawSparks(); drawSheetChart(); });
    // lembra na sessão o que abriste ou fechaste (para não mudar a cada atualização)
    document.addEventListener('toggle', (ev) => { const f = ev.target.dataset && ev.target.dataset.fold; if (f && st.open && st.open[f]) st.open[f].v = ev.target.open; }, true);
    // o toque fica registado logo (o evento "toggle" chega depois e perde-se se os preços ao vivo redesenharem o ecrã antes)
    document.addEventListener('click', (ev) => { const sm = ev.target.closest && ev.target.closest('details[data-fold] > summary'); if (!sm) return; const d = sm.parentElement, f = d.dataset.fold; if (st.open && st.open[f]) st.open[f].v = !d.open; }, true);

    // ---------- ciclo ----------
    let yTimer = 0;
    function schedule() {
        clearInterval(yTimer);
        yTimer = setInterval(() => { if (!document.hidden) { pollYahoo(); if (!cfg.proxy) checkAlerts(); } }, 30000);
    }
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) { pollYahoo(); if (!ws) startWS(); renderStatus(); }
    });
    setInterval(renderStatus, 5000);
    setInterval(() => { if (!document.hidden) { analyseAll(); if (cfg.tab === 'analise') scheduleRender(); } }, 60000);
    setInterval(() => { if (!document.hidden) loadCryptoSeries(); }, 5 * 60000);
    setInterval(() => { if (!document.hidden) loadDaily(); }, 15 * 60000);
    setInterval(() => { if (!document.hidden && cfg.tab === 'destaques') loadMovers(); }, 3 * 60000);
    setInterval(() => { if (!document.hidden) loadFuel(); }, 60 * 60000);
    setInterval(() => { if (!document.hidden) loadCalendar(); }, 6 * 60 * 60000);
    setInterval(() => { if (!document.hidden) loadClaude(); }, 60 * 60000);

    function applyFs() { document.documentElement.dataset.fs = ['n', 'l', 'xl'].includes(cfg.fs) ? cfg.fs : 'n'; }
    async function boot() {
        cfg.tab = 'painel';
        applyFs();
        colors();
        render();
        startWS();
        startFinnhub();
        // se o WebSocket demorar, mostra logo um preço por REST
        sleep(2500).then(() => { if (st.ws !== 'on' && !st.cryptoAt) cryptoREST(); });
        loadCryptoSeries();
        if (cfg.proxy) { loadClaude(); await pollYahoo(); loadFuel(); loadCalendar(); if (cfg.tab === 'destaques') loadMovers(); }
        schedule();
        loadDaily();
    }

    if ('serviceWorker' in navigator && location.protocol === 'https:') {
        window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
    }

    // para os testes
    window.__mk = { cfg, Q, D, AN, NEWS, st, REG, render, analyseAll, checkAlerts, version: VERSION, get journal() { return JOURNAL; }, get bt() { return BT; } };
    boot();
})();
