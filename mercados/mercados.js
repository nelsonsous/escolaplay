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
    // A análise toda (pontuações, tom das notícias, sentimento do mercado, avisos, imposto da cripto, teste no passado)
    // é escrita em Onda e compilada para WebAssembly (analise-onda.js, gerado de onda/*.onda). Compila em fundo: até
    // estar pronta (ou se o browser não tiver WebAssembly) não há pontuações; o resto da app funciona e o ecrã volta a
    // desenhar-se quando o motor fica pronto.
    const AO = window.AnaliseOnda || null;
    let aoOk = false, aoFalhou = false;
    // A: as funções da análise que o ecrã usa; antes de o motor estar pronto respondem "sem dados" (null, [] ou false)
    // em vez de falharem. As notícias e os avisos esperam pelo motor; o teste no passado usa o AO diretamente.
    const A = {
        newsTone: (items) => (aoOk ? AO.newsTone(items) : null),
        sentiment: (t) => (aoOk ? AO.sentiment(t) : null),
        marketMood: (ctx) => (aoOk ? AO.marketMood(ctx) : null),
        usdGalToEurL: (usd, fx) => (aoOk ? AO.usdGalToEurL(usd, fx) : null),
        planLots: (since, days, today) => (aoOk ? AO.planLots(since, days, today) : []),
        cryptoTax: (lots, today) => (aoOk ? AO.cryptoTax(lots, today) : null),
        groupAlert: (items, held) => (aoOk ? AO.groupAlert(items, held) : null),
        isQuiet: (h, from, to) => aoOk && AO.isQuiet(h, from, to),
    };
    const VERSION = '4.16.0';

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
        'VWCE.DE': 'FTSE All-World USD (Acc)', 'EUNL.DE': 'MSCI World (iShares)', 'SXR8.DE': 'S&P 500 (iShares)',
        'SXRV.DE': 'Nasdaq-100 (iShares)', 'IS3N.DE': 'Mercados emergentes (iShares)', 'EXSA.DE': 'Europa 600 (iShares)',
        '4GLD.DE': 'Ouro físico (Xetra-Gold)',
    };
    // Acumulação: sem dividendos (nada a declarar até vender). Distribuição: dividendos a declarar todos os anos.
    const FUND_TYPE = { 'VWCE.DE': 'acc', 'EUNL.DE': 'acc', 'SXR8.DE': 'acc', 'SXRV.DE': 'acc', 'IS3N.DE': 'acc', 'EXSA.DE': 'dist', '4GLD.DE': 'etc' };
    const LIVE = { 'VWCE.DE': 'VWCE.MU', 'EUNL.DE': 'EUNL.MU', 'SXR8.DE': 'SXR8.MU', 'SXRV.DE': 'SXRV.MU', 'IS3N.DE': 'IS3N.MU' };
    const DEFAULT_FUNDS = Object.keys(FUND_NAMES);

    // ---------- configuração ----------
    const KEY = 'mercados:v1', SNAP = 'mercados:snap';
    // conector do autor: uma instalação nova já vem ligada (no iPhone, a app do ecrã principal não vê o que o Safari guardou)
    const DEFAULT_PROXY = 'https://mercados-proxy.mercados-proxy.workers.dev';
    const DEFAULTS = { proxy: DEFAULT_PROXY, claude: false, owner: false, fiat: 'EUR', watch: DEFAULT_WATCH, funds: DEFAULT_FUNDS, eur: true, alertPct: 4, notify: false, distrito: '', municipio: '', sort: 'chg', tab: 'painel', filter: 'all', hz: 'mid', budget: 0, profile: 'bal', brief: true, saveDays: [2], jid: '', jLast: '', strategy: 'etfcrypto', cryptoPct: 10, cryptoMix: 'btc', coreFund: 'VWCE.DE', holdings: ['VWCE.DE', 'c:BTC', 'c:ETH', 'c:SOL', 'c:XRP'], lots: {}, simStart: 0, simYears: 20, simGoal: 0, fs: 'n', quiet: true, hidden: [], per: '1d', alertScope: 'mineAdded' };
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
    if (!Array.isArray(cfg.hidden)) cfg.hidden = [];
    if ((cfg.stratVer || 0) < 1) { cfg.hz = 'long'; cfg.filter = 'plan'; cfg.stratVer = 1; store.set(KEY, cfg); }
    // 4.7: a Análise já não tem o filtro dos futuros (só o que se compra na TR)
    if (cfg.filter === 'energy') { cfg.filter = 'all'; store.set(KEY, cfg); }
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
    const st = { ws: 'off', wsSince: 0, cryptoAt: 0, cryptoSrc: '', yahooAt: 0, yahooErr: '', fuelErr: '', moversErr: '', firstPoll: true, fold: {} };
    // secções que se abrem e fecham (data-fold): ficam como o utilizador as deixou enquanto a app está aberta
    const foldAttr = (f, def = false) => (f in st.fold ? st.fold[f] : def) ? 'open' : '';
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
    // gráfico do dia dos fundos: Xetra (muitos negócios, até às 17h30) e depois Munique (poucos negócios, até às 22h)
    function mergeDay(xetra, gettex) {
        const x = Array.isArray(xetra) ? xetra : [], g = Array.isArray(gettex) ? gettex : [];
        if (!g.length) return x.slice();
        if (x.length < 5) return g.slice();
        const day = (p) => new Date(p[0] * 1000).toDateString();
        if (day(x[x.length - 1]) !== day(g[g.length - 1])) return g.slice(); // Xetra ainda com o dia anterior
        const lx = x[x.length - 1][0];
        return x.concat(g.filter((p) => p[0] > lx));
    }
    function qv(k) {
        const q0 = Q[k];
        const a = REG[k];
        if (!q0 || !a || !isHolding(k) || a.temp) return q0 || {};
        let q = q0;
        const lv = a.live && Q[a.live];
        if (lv && fin(lv.price) && (lv.time || 0) > (q0.time || 0) && (lv.currency || q0.currency) === q0.currency) {
            const series = mergeDay(q0.series, lv.series);
            if (lv.time && (!series.length || series[series.length - 1][0] < lv.time)) series.push([lv.time, lv.price]);
            // variação face ao fecho da véspera na mesma bolsa (como a Trade Republic), não ao fecho da Xetra
            const pcl = fin(lv.prevClose) ? lv.prevClose : q0.prevClose;
            q = { ...q0, price: lv.price, time: lv.time, open: lv.open, series, venue: 'Munique (gettex)', prevClose: pcl,
                change: fin(pcl) ? lv.price - pcl : null, changePct: fin(pcl) ? (lv.price / pcl - 1) * 100 : q0.changePct };
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
    const fmtPct = (v) => fin(v) ? (v >= 0.005 ? '+' : v <= -0.005 ? '−' : '') + NF({ minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(v)) + '%' : '—';
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
    // hora do último preço quando não é ao vivo (mais de 15 min): "22:00" hoje, "5/11" noutro dia
    function pxWhen(k, q) {
        if (!q || !q.time || (REG[k] && REG[k].kind === 'crypto')) return '';
        if (now() / 1000 - q.time < 15 * 60) return '';
        const d = new Date(q.time * 1000), t = new Date();
        const y = new Date(t); y.setDate(t.getDate() - 1);
        return d.toDateString() === t.toDateString() ? hhmm(q.time) : d.toDateString() === y.toDateString() ? 'ontem' : `${d.getDate()}/${d.getMonth() + 1}`;
    }
    function pxWhenLong(k, q) {
        if (!q || !q.time || (REG[k] && REG[k].kind === 'crypto')) return '';
        const d = new Date(q.time * 1000), t = new Date();
        const y = new Date(t); y.setDate(t.getDate() - 1);
        const when = d.toDateString() === t.toDateString() ? `às ${hhmm(q.time)}` : d.toDateString() === y.toDateString() ? `de ontem às ${hhmm(q.time)}` : `às ${hhmm(q.time)} de ${d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })}`;
        return `Último preço ${when}${q.open === false ? ' · mercado fechado' : now() / 1000 - q.time < 15 * 60 ? ' · atualiza a cada 30 s' : ''}`;
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

    const SHORT_R = { '15m': 15 * 60, '1h': 3600, '4h': 4 * 3600 };
    const KL = { '15m': ['1m', 15], '1h': ['1m', 60], '4h': ['5m', 48], '1d': ['15m', 96], '5d': ['1h', 168], '1mo': ['4h', 180], '6mo': ['1d', 183], '1y': ['1d', 365], '5y': ['1w', 260] };
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
    const anOpts = (k) => ({ crypto: REG[k].kind === 'crypto', kind: REG[k].kind, news: NEWS[k] ? A.newsTone(NEWS[k].items) : null });
    function analyseAll() {
        if (!aoOk) return;
        const ks = [], list = [];
        for (const k of Object.keys(REG)) { const c = closesFor(k); if (c) { ks.push(k); list.push({ closes: c, opts: anOpts(k) }); } }
        const out = AO.analyseMany(list);
        ks.forEach((k, i) => { if (out[i]) AN[k] = out[i]; });
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
        try { await pxPost('/journal', { id: cfg.jid, date: day, items, lots: cfg.lots, saveDays: cfg.saveDays, claude: !!cfg.claude, my: myList() }); cfg.jLast = day; saveCfg(); JOURNAL = null; } catch { /* tenta noutra altura */ }
    }
    // ---------- datas de compra de cripto (isenção de IRS aos 365 dias) ----------
    const lotOf = (k) => cfg.lots[k] || { plan: '', buys: [] };
    const lotsOf = (k) => { const L = lotOf(k); return (L.buys || []).concat(A.planLots(L.plan, cfg.saveDays, todayLocal())); };
    const taxOf = (k) => A.cryptoTax(lotsOf(k), todayLocal());
    const dmy = (iso) => iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : '';
    function taxLine(k) {
        const t = taxOf(k);
        if (!t || !t.n) return ''; // sem datas (ou o motor ainda a compilar): não ocupa espaço
        if (t.all) return 'isenta de IRS';
        return t.exempt ? `${t.exempt}/${t.n} isentas · próxima em ${t.next.days} d` : `isenta em ${t.next.days} d`;
    }
    function setLots(k, L) {
        if (!L.plan && !(L.buys || []).length && !(+L.pm > 0) && !(+L.qty > 0) && !(+L.cost > 0) && !L.qd) delete cfg.lots[k]; else cfg.lots[k] = L;
        saveCfg();
        if (cfg.proxy) pxPost('/journal', { id: cfg.jid, lots: cfg.lots, saveDays: cfg.saveDays }).catch(() => {});
        if (sheetKey === k) renderSheet();
        scheduleRender();
    }
    function taxBox(k) {
        if (!REG[k] || REG[k].kind !== 'crypto') return '';
        const L = lotOf(k), t = taxOf(k);
        if (!t) return '';
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
            <p class="note">Com menos de 365 dias, o ganho paga 28%. Cada compra conta a partir da sua data e, numa venda, contam primeiro as compras mais antigas. Os dados ficam no teu iPhone e no teu conector, para o Claude ter em conta.</p></div>`;
    }
    async function loadJournal() {
        if (!cfg.proxy) return;
        try { JOURNAL = await px(`/journal?id=${encodeURIComponent(cfg.jid)}`); } catch { JOURNAL = { days: {} }; }
        scheduleRender();
    }
    // etiquetas curtas dos veredictos (do Claude e dos sinais automáticos); up/flat/down: referência (índices, futuros)
    // o rótulo do veredicto (4.11): três famílias — entrar, ficar, sair — e a palavra depende de já ter o ativo
    const FAMS = { buy: 1, scale: 1, hold: 0, wait: 0, neutral: 0, turn: 0, reduce: -1, sell: -1, avoid: -1 };
    const REF_LBL = { up: 'Em alta', flat: 'Lateral', down: 'Em queda' };
    const owns = (k) => cfg.holdings.includes(k);
    function rotulo(key, own) {
        const f = FAMS[key];
        if (f === 1) return own ? 'Reforçar' : 'Comprar';
        if (f === 0) return own ? 'Manter' : 'Aguardar';
        if (f === -1) return own ? (key === 'reduce' ? 'Vender parte' : 'Vender') : 'Evitar';
        return REF_LBL[key] || '';
    }
    // o pormenor por baixo do rótulo: a frase do Claude ou do algoritmo, se diz mais do que o rótulo
    const nuance = (lbl, txt) => (txt && txt.trim().toLowerCase() !== lbl.toLowerCase() ? `<div class="adv-nu">${esc(txt)}</div>` : '');
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
            if (!AO) throw new Error('o motor de análise não carregou');
            await AO.ready;
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
            const bf = AO.benchFn(bench), acc = {}, per = [];
            // comissão: 1 € por ordem manual (ações e cripto) num valor típico de satélite; ETF por plano de poupança = 0
            const ticket = Math.max(50, (+cfg.budget || 900) * Math.max(0.05, (+cfg.cryptoPct || 10) / 100));
            const cost = (k) => (REG[k] && REG[k].kind === 'fund' ? 0 : 1 / ticket);
            for (const a of assets) { per.push(AO.backtestAsset(a, bf, acc, { cost: cost(a.key) })); await sleep(0); }
            const byKind = {};
            for (const a of assets) {
                if (!bf || a.key === 'VWCE.DE') continue;
                const K = byKind[a.kind] || (byKind[a.kind] = { s: 0, n: 0 });
                for (let i = 200; i + 63 < a.closes.length; i += 5) { const b = bf(a.days[i], a.days[i + 63]); if (b != null) { K.s += a.closes[i + 63] / a.closes[i] - 1 - b; K.n++; } }
            }
            const buys = per.filter((x) => x.buyN >= 3).map((x) => ({ k: x.key, a: x.buyS / x.buyN })).sort((a, b) => a.a - b.a);
            const yrs = bench ? Math.round(bench.closes.length / 252 * 10) / 10 : null;
            BT = { at: now(), n: assets.length, yrs, ticket, sum: AO.summarize(acc), worst: buys.slice(0, 3), best: buys.slice(-3).reverse(), byKind };
        } catch (e) { BT = { error: e.message || String(e) }; }
        btBusy = false; render();
    }

    // ---------- dono da app e partilha ----------
    // A app do dono tem a análise completa do Claude e a de toda a Trade Republic. As outras apps
    // começam sem a análise do Claude; podem pedi-la em Ajustes (uma análise curta dos seus ativos).
    const claudeOn = () => !!(cfg.owner || cfg.claude);
    async function loadMe() {
        if (!cfg.proxy || (st.meAt && now() - st.meAt < 30 * 60000)) return;
        st.meAt = now();
        try {
            const m = await px(`/me?id=${encodeURIComponent(cfg.jid)}`);
            st.others = m.others !== false;
            if (!!m.owner !== !!cfg.owner) { cfg.owner = !!m.owner; saveCfg(); scheduleRender(); }
        } catch { /* fica o que se sabia */ }
    }
    // a lista desta app (o que tem + o que juntou): é o que cobre a análise do Claude das outras apps
    const myList = () => [...new Set([...holdingKeys(), ...cfg.watch.filter((k) => !DEFAULT_WATCH.includes(k)), ...cfg.funds.filter((k) => !DEFAULT_FUNDS.includes(k))])].slice(0, 12);
    function setClaude(on) {
        cfg.claude = on; saveCfg();
        if (cfg.proxy) pxPost('/journal', { id: cfg.jid, claude: on, my: myList(), date: todayLocal() }).catch(() => toast('Sem ligação ao conector: tenta outra vez'));
        CLAUDE = null; loadClaude(); render();
    }
    let STATS = null;
    async function loadStats() {
        if (!cfg.owner || !cfg.proxy || (STATS && now() - STATS.at < 5 * 60000)) return;
        STATS = { ...(STATS || {}), at: now() };
        try { STATS = { ...(await px(`/stats?id=${encodeURIComponent(cfg.jid)}`)), at: now() }; } catch (e) { STATS = { at: now(), error: e.message }; }
        scheduleRender();
    }
    const shareLink = () => location.origin + location.pathname + (cfg.proxy && cfg.proxy !== DEFAULT_PROXY ? '?proxy=' + encodeURIComponent(cfg.proxy) : '');
    function claudeSection() {
        if (cfg.owner) {
            const S = STATS || {}, r = S.run;
            const cell = (v, l) => `<div><b class="num">${fin(v) ? v : '—'}</b><small>${l}</small></div>`;
            const runTxt = r && r.at ? ` Última corrida: ${new Date(r.at).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} — ${r.done} analisada${r.done === 1 ? '' : 's'}${r.queued > r.done ? `, ${r.queued - r.done} ficaram de fora (limite de ${r.max} por corrida)` : ''}.` : '';
            const on = S.others !== false && st.others !== false;
            return `<section class="sec"><div class="sec-h"><h2>Partilha da app</h2></div><div class="form">
                <div><label>Outras apps ligadas ao teu conector</label><div class="share-st">${cell(S.d1, 'hoje')}${cell(S.d7, '7 dias')}${cell(S.d30, '30 dias')}${cell(S.claude, 'com o Claude')}</div>
                    <div class="hint">${S.error ? 'Não deu para contar: ' + esc(S.error) + '. ' : ''}Não conta a tua. "Com o Claude": pediram a análise nos últimos 7 dias.${runTxt}</div></div>
                <div><label>Análise do Claude para as outras apps</label><div class="seg prof two"><button type="button" data-others="1" class="${on ? 'on' : ''}"><b>Ligada</b><small>para quem a pedir</small></button><button type="button" data-others="0" class="${on ? '' : 'on'}"><b>Desligada</b><small>só para ti</small></button></div>
                    <div class="hint">Cada app analisada torna a tarefa das ${CL_LBL} mais longa e gasta mais do teu plano Claude (até 20 por corrida). Se forem muitas, desliga aqui.</div></div>
                <div><label for="f-share">Link para partilhar</label><div class="inl"><input id="f-share" class="inp" type="text" readonly value="${esc(shareLink())}"><button type="button" class="btn sm" data-act="share-link">Copiar</button></div>
                    <div class="hint">A app já vem ligada ao teu conector. Cada pessoa fica com os seus ativos e a análise do Claude vem desligada. A tua análise, o teu plano e toda a lista da Trade Republic ficam só nesta app.</div></div>
            </div></section>`;
        }
        const names = myList().map((k) => nameOf(k)).join(', ');
        return `<section class="sec"><div class="sec-h"><h2>Análise do Claude</h2></div><div class="form"><div>
            <div class="seg prof two"><button type="button" data-claude="0" class="${cfg.claude ? '' : 'on'}"><b>Desligada</b><small>só o resumo automático</small></button><button type="button" data-claude="1" class="${cfg.claude ? 'on' : ''}"><b>Ligada</b><small>às ${CL_LBL}</small></button></div>
            <div class="hint">${st.others === false ? 'Pausada pelo autor da app. ' : ''}Uma análise curta dos teus ativos e dos que juntaste${names ? ` (${esc(names)})` : ''}, escrita pelo Claude duas vezes por dia. Para isso, a lista de símbolos desta app é enviada ao autor da app.</div>
        </div></div></section>`;
    }

    // ---------- toda a lista da Trade Republic (só na app do dono; classificada pela tarefa agendada) ----------
    let UNI = null;
    async function loadUni() {
        if (!cfg.owner || !cfg.proxy || (UNI && now() - UNI.at < 30 * 60000)) return;
        UNI = { ...(UNI || {}), at: now() };
        try { UNI = { ...(await px(`/universe?id=${encodeURIComponent(cfg.jid)}`, 30000)), at: now() }; } catch (e) { UNI = { ...UNI, error: e.message }; }
        scheduleRender();
    }
    // a linha de cada símbolo (a primeira, como o find): um Map feito uma vez por lista
    let uniIx = null;
    const uniRow = (s) => {
        if (!UNI || !Array.isArray(UNI.rows)) return {};
        if (!uniIx || uniIx.rows !== UNI.rows) { uniIx = { rows: UNI.rows, m: new Map() }; for (const x of UNI.rows) if (x && !uniIx.m.has(x.s)) uniIx.m.set(x.s, x); }
        return uniIx.m.get(s) || {};
    };
    const uniName = (s) => uniRow(s).n || '';

    // ---------- análise diária escrita pelo Claude (tarefa agendada → KV → /advice) ----------
    let CLAUDE = null;
    async function loadClaude() {
        if (!cfg.proxy) return;
        await loadMe();
        if (!claudeOn()) { CLAUDE = null; scheduleRender(); return; }
        try { CLAUDE = await px(`/advice?id=${encodeURIComponent(cfg.jid)}`); } catch (e) { CLAUDE = { missing: true, error: e.message, off: /desligada/.test(e.message) }; }
        // guarda o último conselho do Claude de cada ativo (se num dia não o comentar, fica o anterior)
        if (CLAUDE && Array.isArray(CLAUDE.actions) && CLAUDE.date) {
            const mem = store.get('mercados:clmem') || {};
            for (const x of CLAUDE.actions) if (x && x.s && (!mem[x.s] || mem[x.s].date <= CLAUDE.date)) mem[x.s] = { ...x, date: CLAUDE.date };
            store.set('mercados:clmem', mem);
        }
        scheduleRender();
        loadClaudeHistory();
    }
    async function loadClaudeHistory() {
        if (st.clHist || !cfg.owner || !CLAUDE || CLAUDE.missing) return;
        st.clHist = true;
        const mem = store.get('mercados:clmem') || {};
        let miss = holdingKeys().filter((k) => !claudeFor(k));
        for (let d = 1; d <= 7 && miss.length; d++) {
            const dt = new Date(); dt.setDate(dt.getDate() - d);
            const iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
            let a = null;
            try { a = await px(`/advice?id=${encodeURIComponent(cfg.jid)}&date=${iso}`); } catch { continue; }
            for (const x of (a && a.actions) || []) if (miss.includes(x.s) && (!mem[x.s] || mem[x.s].date < (a.date || iso))) mem[x.s] = { ...x, date: a.date || iso };
            store.set('mercados:clmem', mem);
            miss = miss.filter((k) => !claudeFor(k));
        }
        scheduleRender();
    }
    // "feita às 07:16 de 06/11 · próxima hoje às 15:14" (a tarefa corre às 07:14 e às 15:14 de Lisboa)
    const CL_TIMES = [[7, 14], [15, 14]];
    const CL_LBL = CL_TIMES.map(([h, m]) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`).join(' e ');
    // hora da última corrida que já devia ter acontecido (para o aviso "atrasada")
    function clLastDue(n) {
        const t = n.getHours() * 60 + n.getMinutes();
        const past = CL_TIMES.filter(([h, m]) => h * 60 + m + 30 <= t);
        return past.length ? past[past.length - 1] : null;
    }
    function clWhen() {
        const c = CLAUDE || {};
        const g = c.generatedAt ? new Date(c.generatedAt) : null;
        const made = g && !isNaN(g) ? `feita às ${g.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })} de ${g.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })}` : (c.date || '');
        const n = new Date();
        let next = CL_TIMES.map(([h, m]) => new Date(n.getFullYear(), n.getMonth(), n.getDate(), h, m)).find((d) => d > n);
        if (!next) { next = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1, CL_TIMES[0][0], CL_TIMES[0][1]); }
        const day = next.getDate() === n.getDate() ? 'hoje' : 'amanhã';
        return `${made} · próxima ${day} às ${next.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`;
    }
    const moverWhy = (k) => { const m = CLAUDE && Array.isArray(CLAUDE.movers) ? CLAUDE.movers.find((x) => x.s === k) : null; return m ? m.why : ''; };
    function claudeFor(k) {
        if (!claudeOn()) return null;
        const now1 = clNow(k);
        if (now1) return now1;
        const m = (store.get('mercados:clmem') || {})[k];
        // conselho anterior, até 14 dias
        return m && m.date && (Date.parse(todayLocal()) - Date.parse(m.date)) / DAY <= 14 ? { ...m, old: true } : null;
    }
    // a análise do Claude que veio agora do conector. Desde a 4.0 traz todos os ativos, cada um com a convicção
    // 0–100 por prazo (short/mid/long), níveis e o porquê; a antiga (só o veredicto de alguns) continua a funcionar.
    const clDoc = () => (claudeOn() && CLAUDE && !CLAUDE.missing && Array.isArray(CLAUDE.actions) ? CLAUDE : null);
    const clNow = (k) => { const c = clDoc(); return c ? c.actions.find((a) => a && a.s === k) || null : null; };
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
            if (AO && !aoOk) await AO.ready.catch(() => {}); // o tom de cada notícia é do motor: espera por ele
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
        if (!lim || !aoOk) return; // os avisos (agrupar, silêncio à noite) são do motor: sem ele, esperam
        const hits = [];
        // só os ativos que interessam: os meus, os que juntei (fora da lista de origem) ou tudo o que sigo
        const scope = cfg.alertScope || 'mineAdded';
        const wanted = (k) => holdingKeys().includes(k) || (scope === 'all' ? true : scope === 'mineAdded' && (cfg.watch.includes(k) || cfg.funds.includes(k)) && !DEFAULT_WATCH.includes(k) && !DEFAULT_FUNDS.includes(k));
        for (let [k, q] of Object.entries(Q)) {
            if (!listed(k) || !wanted(k)) continue;
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
            gr.addColorStop(0, col + (opt.width === 1.5 ? '2a' : '40')); gr.addColorStop(1, col + '00');
            g.lineTo(X(pts.length - 1), h); g.lineTo(0, h); g.closePath(); g.fillStyle = gr; g.fill();
        }
        return { X, Y, w, h, g, lo, hi };
    }
    const PER_DAYS = { '1w': 7, '1m': 30, '1y': 365 };
    // 1S e 1M: as mesmas séries da ficha (de 30 min / 1 h; cripto 1 h / 4 h), para o gráfico pequeno e a % baterem certo
    const PS = { '1w': {}, '1m': {} }, psAt = { '1w': 0, '1m': 0 };
    async function loadPerSeries() {
        const per = cfg.per;
        if (!PS[per] || now() - psAt[per] < 5 * 60 * 1000) return;
        psAt[per] = now();
        const range = per === '1w' ? '5d' : '1mo';
        const jobs = CRYPTO.map(async (c) => { try { PS[per]['c:' + c.id] = await klines(c.id, range); } catch { /* fica o diário */ } });
        if (cfg.proxy) jobs.push(quotesBatch(yahooKeys().filter(listed), range).then((list) => { for (const q of list) if (!q.error && q.series && q.series.length > 1) PS[per][q.symbol] = q.series; }).catch(() => {}));
        await Promise.all(jobs);
        drawSparks(); scheduleRender();
    }
    function perData(k) {
        const q = qv(k);
        const days = PER_DAYS[cfg.per];
        const day = { pct: q.changePct, series: q.series, base: REG[k] && REG[k].kind === 'crypto' ? null : q.prevClose };
        const ps = PS[cfg.per] && PS[cfg.per][k];
        if (days && ps && ps.length > 1 && fin(q.price)) {
            const f = q.fx || 1, series = ps.map(([t, v]) => [t, v * f]), tq = q.time || now() / 1000;
            if (tq > series[series.length - 1][0]) series.push([tq, q.price]);
            return { pct: (q.price / series[0][1] - 1) * 100, series, base: series[0][1] };
        }
        if (!days || !D[k] || D[k].length < 2 || !fin(q.price)) return day;
        const f = q.fx || 1, from = now() / 1000 - days * 86400;
        let i = D[k].findIndex((p) => p[0] > from);
        if (i < 0) i = D[k].length;
        const ref = D[k][Math.max(0, i - 1)][1] * f;
        const series = D[k].slice(Math.max(0, i - 1)).map(([t, v]) => [t, v * f]);
        const tq = q.time || now() / 1000;
        if (!series.length || tq > series[series.length - 1][0]) series.push([tq, q.price]);
        return { pct: (q.price / ref - 1) * 100, series, base: ref };
    }
    function drawSparks() {
        if (PS[cfg.per]) loadPerSeries();
        for (const cv of $$('canvas.spark')) {
            const k = cv.dataset.key;
            const p = perData(k);
            if (!p.series || p.series.length < 2) continue;
            // poucos pontos: por ordem, para não desenhar retas longas
            drawLine(cv, p.series, { tone: toneOf(p.pct), base: p.base, pad: 3, width: 1.5, byIndex: cfg.per !== '1d' || p.series.length < 12 });
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
            if (c) { const pc = el.dataset.chg === 'day' ? q.changePct : perData(k).pct; c.className = 'chg ' + toneOf(pc); c.textContent = fmtPct(pc); }
        }
        liveTail(k);
        if (sheetKey === k && SHORT_R[sheetRange] && sheetPts && sheetPts.length && fin(raw.price)) {
            const t = raw.time || Math.floor(now() / 1000), l = sheetPts[sheetPts.length - 1];
            if (t >= l[0]) { if (t - l[0] < 5) l[1] = raw.price; else sheetPts.push([t, raw.price]); }
            while (sheetPts.length > 2 && sheetPts[0][0] < t - SHORT_R[sheetRange]) sheetPts.shift();
        }
        if (sheetKey === k) { renderSheetPrice(); sheetSoon(); }
        sparkSoon();
    }
    // cada preço novo entra no gráfico do dia (ao vivo: cripto e ações dos EUA com Finnhub)
    const liveT = {};
    function liveTail(k) {
        const raw = Q[k];
        if (!raw || !fin(raw.price) || !Array.isArray(raw.series) || raw.series.length < 2) return;
        const s = raw.series, last = s[s.length - 1], t = raw.time || Math.floor(now() / 1000);
        if (t < last[0]) return;
        if (liveT[k] === last[0] && t - last[0] < 5) { last[0] = t; last[1] = raw.price; } else s.push([t, raw.price]);
        liveT[k] = s[s.length - 1][0];
        if (s.length > 2000) s.splice(0, s.length - 2000);
    }
    let sparkT = 0, sheetT = 0;
    function sparkSoon() { if (!sparkT) sparkT = setTimeout(() => { sparkT = 0; drawSparks(); }, 1000); }
    // gráfico da ficha: redesenha ao segundo no 1D, exceto enquanto se arrasta o dedo nele
    function sheetSoon() {
        if (sheetT || (sheetRange !== '1d' && !SHORT_R[sheetRange])) return;
        sheetT = setTimeout(() => { sheetT = 0; if (sheetKey && now() - (st.chartHover || 0) > 2500) drawSheetChart(); }, 1000);
    }

    // ---------- render ----------
    let renderPending = false;
    function scheduleRender() {
        if (renderPending) return;
        renderPending = true;
        requestAnimationFrame(() => { renderPending = false; render(); });
    }

    function render() {
        $$('#mk-nav button').forEach((b) => b.classList.toggle('on', b.dataset.tab === cfg.tab));
        const body = $('#mk-body');
        if (st.touching) { st.renderLater = true; return; }
        // não destruir o campo onde se está a escrever
        const act = document.activeElement;
        if (act && body.contains(act) && act.matches('input, select')) { renderStatus(); return; }
        if (st.pulling) return;
        const html = cfg.tab === 'destaques' ? highlightsHtml() : cfg.tab === 'analise' ? analysisHtml() : cfg.tab === 'carteira' ? walletHtml() : cfg.tab === 'ajustes' ? settingsHtml() : panelHtml();
        const title = { destaques: 'Destaques', analise: 'Análise', ajustes: 'Ajustes' }[cfg.tab] || 'Painel';
        body.innerHTML = `<h1 class="pg-t">${title}</h1><div class="pg-st" id="mk-status" aria-live="polite"></div>` + html;
        renderStatus();
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

    // bolsa de cotação (aproximação do índice pelo mercado onde a ação cota)
    const MKT = { LS: 'Portugal · PSI', DE: 'Alemanha · DAX', F: 'Alemanha · DAX', PA: 'França · CAC 40', AS: 'Países Baixos · AEX', MI: 'Itália · FTSE MIB', MC: 'Espanha · IBEX 35', L: 'Reino Unido · FTSE 100', CO: 'Dinamarca · OMX', SW: 'Suíça · SMI', BR: 'Bélgica · BEL 20', HE: 'Finlândia', ST: 'Suécia', OL: 'Noruega', T: 'Japão · Nikkei', HK: 'Hong Kong' };
    const MKT_ORDER = ['Portugal · PSI', 'EUA · S&P 500 / Nasdaq', 'Alemanha · DAX', 'França · CAC 40', 'Países Baixos · AEX', 'Espanha · IBEX 35', 'Itália · FTSE MIB', 'Reino Unido · FTSE 100', 'Suíça · SMI', 'Dinamarca · OMX'];
    const mktOf = (k) => { const m = /\.([A-Z]{1,3})$/.exec(k); return m ? MKT[m[1]] || 'Outras bolsas' : 'EUA · S&P 500 / Nasdaq'; };
    // ícone redondo com as iniciais (cor fixa por ativo): o ln_ico de ecra.onda faz o mesmo nas vistas; este fica como a
    // referência dos testes
    function ico(k) {
        const a = REG[k] || {};
        const t = a.kind === 'crypto' ? a.sym : nameOf(k).replace(/[^A-Za-zÀ-ÿ0-9 ]/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('') || '?';
        let h = 0; for (const ch of k) h = (h * 31 + ch.charCodeAt(0)) % 360;
        return `<span class="r-ico" style="--h:${h}" aria-hidden="true">${esc(t.slice(0, 4).toUpperCase())}</span>`;
    }

    function setupBanner() {
        return `<div class="banner">
            <h3>Falta ligar o conector de dados</h3>
            <p>As cripto já estão em tempo real. Para o petróleo, combustíveis, índices, ações e notícias, a app precisa do teu conector (um Cloudflare Worker grátis, 2 minutos a publicar).</p>
            <div class="btns"><button type="button" class="btn pri" data-tab="ajustes">Configurar</button>
            <a class="btn" href="https://github.com/nelsonsous/escolaplay/tree/main/mercados#conector" target="_blank" rel="noopener">Como publicar</a></div>
        </div>`;
    }

    // ---------- o Painel ----------
    // O Painel é desenhado pela Onda (mercados/onda/ecra-painel.onda, no módulo da análise): desde a 4.9.0 é ela a
    // referência desta vista. Os eventos, os gestos (arrastar para retirar, puxar para atualizar) e os preços ao vivo
    // (patchLive) continuam aqui, e os gráficos pequenos desenha-os o drawSparks depois. Até o módulo estar pronto fica o
    // aviso "A calcular…" (as pontuações, o plano automático e os avisos também são da Onda).
    // A Carteira (4.12) é toda da Onda (mercados/onda/ecra-carteira.onda): o simulador do plano e do objetivo, com o
    // valor por mês, a divisão e o fundo núcleo dos Ajustes. Sem o módulo (sem WebAssembly) diz só que não dá.
    function walletSnap() {
        return { budget: +cfg.budget || 0, cp: etfCrypto() ? +cfg.cryptoPct || 0 : 0, core: nameOf(cfg.coreFund), start: +cfg.simStart || 0, years: +cfg.simYears || 20, goal: +cfg.simGoal || 0, hoje: !!cfg.simHoje, real: realSnap() };
    }
    // ---- o rendimento real (4.13): as compras (plano e avulsas) com os preços de 5 anos (semanais) e do último (diários) ----
    const LH = {}, lhAt = {}, lhVai = new Set();
    // o valor por mês do plano de cada ativo, pela divisão dos Ajustes (o fundo núcleo e a cripto)
    function pmDefault(k) {
        const b = +cfg.budget || 0, cp = etfCrypto() ? (+cfg.cryptoPct || 0) / 100 : 0;
        if (k === cfg.coreFund) return Math.round(b * (1 - cp));
        if (k === 'c:BTC') return Math.round(b * cp * (cfg.cryptoMix === 'btceth' ? 0.7 : 1));
        if (k === 'c:ETH' && cfg.cryptoMix === 'btceth') return Math.round(b * cp * 0.3);
        return 0;
    }
    const isoT = (iso) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10), 12) / 1000;
    // o que tem hoje (quantidade e investido, como na TR): manda sobre o plano; com a data, é uma compra só nesse dia
    const temHoje = (L) => +L.qty > 0 && +L.cost > 0;
    function buysOf(k) {
        const L = lotOf(k);
        if (temHoje(L)) return /^\d{4}-\d\d-\d\d$/.test(L.qd || '') ? [[isoT(L.qd), +L.cost, +L.qty]] : [];
        const pm = +L.pm > 0 ? +L.pm : pmDefault(k), n = Math.max(1, (cfg.saveDays || []).length);
        const plan = pm > 0 ? A.planLots(L.plan, cfg.saveDays, todayLocal()).map((x) => [isoT(x.d), pm / n]) : [];
        return plan.concat((L.buys || []).filter((x) => +x.e > 0 && /^\d{4}-\d\d-\d\d$/.test(x.d || '')).map((x) => [isoT(x.d), +x.e])).sort((a, b) => a[0] - b[0]);
    }
    // os preços em euros: os semanais antes do primeiro dia do ano diário, e o diário
    function histOf(k) {
        const w = LH[k] || [], d = D[k] || [], f = qv(k).fx || 1;
        const cut = d.length ? d[0][0] : Infinity;
        return w.filter((p) => p[0] < cut).concat(d).filter((p) => fin(p[1]) && p[1] > 0).map(([t, v]) => [t, v * f]);
    }
    async function loadLong(keys) {
        // uma vez a cada 6 h por ativo (também quando falha: sem pedidos repetidos a cada desenho)
        const novos = keys.filter((k) => REG[k] && !lhVai.has(k) && now() - (lhAt[k] || 0) > 6 * 3600 * 1000 && (REG[k].kind === 'crypto' || cfg.proxy));
        if (!novos.length) return;
        await Promise.all(novos.map(async (k) => {
            lhAt[k] = now(); lhVai.add(k);
            try {
                if (REG[k].kind === 'crypto') LH[k] = await klines(REG[k].sym, '5y');
                else { const r = await px(`/quotes?symbols=${encodeURIComponent(k)}&range=5y`, 20000); const q = r.quotes && r.quotes[0]; if (q && q.series) LH[k] = q.series; }
            } catch { /* fica o histórico de 1 ano */ }
            lhVai.delete(k);
        }));
        if (cfg.tab === 'carteira') scheduleRender();
    }
    function realSnap() {
        const keys = cfg.holdings.filter((k) => REG[k]);
        const comp = keys.filter((k) => buysOf(k).length || temHoje(lotOf(k)));
        if (comp.length) loadLong(comp.concat([cfg.coreFund]));
        const ts = comp.map((k) => buysOf(k)).filter((b) => b.length).map((b) => b[0][0]);
        const t0 = ts.length === comp.length && ts.length ? Math.min(...ts) : 0;
        return {
            now: now() / 1000, desde: t0 ? dmy(new Date(t0 * 1000).toISOString().slice(0, 10)) : null, loading: lhVai.size > 0,
            bench: { name: nameOf(cfg.coreFund), px: qv(cfg.coreFund).price, h: histOf(cfg.coreFund) },
            ativos: keys.map((k) => { const L = lotOf(k); return { k, name: nameOf(k), px: qv(k).price, h: buysOf(k).length ? histOf(k) : [], b: buysOf(k), plan: L.plan || '', pm: +L.pm || 0, pmDef: pmDefault(k), q: +L.qty || 0, cost: +L.cost || 0, qd: L.qd || '' }; }),
        };
    }
    function walletHtml() {
        if (aoOk && AO.ecra && AO.ecra.carteira) try { return AO.ecra.carteira(walletSnap()); } catch (e) { console.error('ecrã Onda:', e); }
        return `<div class="empty">${aoFalhou || !AO ? 'O simulador precisa de WebAssembly, que este browser não tem.' : 'A carregar…'}</div>`;
    }
    function panelHtml() {
        const top = cfg.proxy ? '' : setupBanner();
        if (aoOk && AO.ecra) try { return top + AO.ecra.painel(panelSnap()); } catch (e) { console.error('ecrã Onda:', e); }
        panelLoad();
        return top + `<div class="empty">${aoOk ? 'Não deu para mostrar o painel.' : 'A calcular…'}</div>`;
    }
    // o que o Painel pede à rede: na app do dono, toda a Trade Republic (o nome das ideias do Claude fora das listas)
    function panelLoad() {
        if (cfg.owner) loadUni();
    }
    // a ordem dos nomes pelo localeCompare('pt') do browser (o "Nome" das ações): nomes que o browser dá como iguais, a
    // mesma ordem
    const COLL = new Intl.Collator('pt');
    function nameRank(keys) {
        const nm = [...new Set(keys.map(nameOf))].sort(COLL.compare), r = new Map();
        nm.forEach((n, i) => r.set(n, i && !COLL.compare(nm[i - 1], n) ? r.get(nm[i - 1]) : i));
        return r;
    }
    // O instantâneo para a Onda: o que o Painel lê, cru (a Onda filtra, ordena — o sort do V8 — e escreve). Vai já feito o
    // que é do browser ou de outras partes da app: os nomes (nameOf), a cotação (qv: preço da noite, euros), a variação no
    // período (perData, a mesma dos gráficos pequenos), a hora do último preço (pxWhen), o conselho do Claude de cada ativo
    // que tenho (claudeFor: o de hoje ou o último, até 14 dias), o imposto da cripto (taxLine), o €/L (usdGalToEurL), a
    // bolsa (mktOf), a ordem dos nomes (nameRank) e a zona dos combustíveis; do cartão Hoje, ver o hojeSnap.
    function panelSnap() {
        panelLoad();
        const fold = (f) => (f in st.fold ? st.fold[f] : false);
        const mine = holdingKeys(), eu = Q['EURUSD=X'] && Q['EURUSD=X'].price;
        const rank = (cfg.sort === 'chg' ? 'up' : cfg.sort) === 'name' ? nameRank(cfg.watch) : null;
        const dname = cfg.distrito && DISTRITOS ? (DISTRITOS.find((d) => String(d.id) === String(cfg.distrito)) || {}).name : '';
        const mname = cfg.municipio && MUNIC[cfg.distrito] ? (MUNIC[cfg.distrito].find((m) => String(m.id) === String(cfg.municipio)) || {}).name : '';
        return {
            proxy: cfg.proxy, fiat: cfg.fiat, per: cfg.per, sort: cfg.sort, swipe: st.swipe,
            mine, watch: cfg.watch, funds: cfg.funds, hidden: cfg.hidden,
            crypto: CRYPTO.map((c) => 'c:' + c.id), energy: ENERGY.map((e) => e.sym), indices: INDICES.map((i) => i.sym), mktOrder: MKT_ORDER,
            foldHoje: fold('hoje'), foldIdx: fold('pn-idx'), foldEn: fold('pn-en'), foldFuel: fold('pn-fuel'),
            assets: Object.keys(REG).map((k) => {
                const a = REG[k], q = qv(k), r = AN[k], h = r && r.horizons, d = r && r.discount, ad = r && r.advice;
                const my = mine.includes(k), cl = my ? claudeFor(k) : null;
                return { k, kind: a.kind, temp: a.temp, sym: a.sym, name: nameOf(k), unit: a.unit, dec: a.decimals, pts: a.points,
                    px: q.price, cur: q.currency, qc: Q[k] && Q[k].currency, chg: q.changePct, pc: perData(k).pct, t: pxWhen(k, q),
                    pl: a.perLitre && Q[k] ? A.usdGalToEurL(Q[k].price, eu) : undefined, mkt: mktOf(k), nr: rank ? rank.get(nameOf(k)) : undefined,
                    an: r ? { d: d ? { dd: d.dd, score: d.score } : d, adv: ad ? { key: ad.key, action: ad.action } : ad, L: h ? (h.long || h.mid || {}).score : undefined } : r,
                    cl: cl ? { key: cl.key, action: cl.action } : cl, tax: my && a.kind === 'crypto' ? taxLine(k) : undefined };
            }),
            hoje: hojeSnap(),
            fuel: FUEL ? { fuels: FUEL.fuels } : FUEL, fuelErr: st.fuelErr, dname, mname,
        };
    }
    // o que o cartão Hoje lê: a análise do Claude (só com o título), o que o resumo automático usa (os ativos analisados que
    // se compram na TR, pela ordem de Object.keys(AN), o sentimento do mercado — o marketMood do motor —, o dia nos índices,
    // a configuração do plano) e o que é do browser: as datas (a próxima execução, a agenda, a hora da análise e se está
    // atrasada), os valores em euros do plano do Claude (eurNum) e os nomes (o da app, ou o de toda a TR, e o tipo)
    function hojeSnap() {
        const c = CLAUDE && !CLAUDE.missing && CLAUDE.headline ? CLAUDE : null, x = nextExec(), inv = Object.keys(AN).filter(investable);
        // atrasada: já passou (com 30 min de folga) uma corrida de hoje e a análise é de antes dela
        const nw = new Date(), due = clLastDue(nw), dueAt = due ? new Date(nw.getFullYear(), nw.getMonth(), nw.getDate(), due[0], due[1]) : null;
        const gen = c && c.generatedAt ? new Date(c.generatedAt) : null, vix = Q['^VIX'] && Q['^VIX'].price;
        const lst = (l, f) => (Array.isArray(l) ? l.map((o) => (o && typeof o === 'object' ? f(o) : o)) : l);
        return {
            inv, horas: CL_LBL, claudeOn: claudeOn(), off: !!(CLAUDE && CLAUDE.off), vix, ind: ['^GSPC', '^IXIC', '^STOXX50E', 'PSI20.LS'].map((k) => Q[k] && Q[k].changePct),
            mood: inv.length ? A.marketMood({ spx: AN['^GSPC'], stoxx: AN['^STOXX50E'], btc: AN['c:BTC'], vix, breadth: inv.filter((k) => AN[k].score >= 58).length / inv.length }) : null,
            profile: cfg.profile, strategy: cfg.strategy, budget: +cfg.budget, cryptoPct: +cfg.cryptoPct, cryptoMix: cfg.cryptoMix, coreFund: cfg.coreFund, saveDays: cfg.saveDays,
            ex: x.next ? { quando: x.next.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' }), dl: dm(x.dl.getTime()), exec: x.isExec, prazo: x.isDeadline } : null,
            agenda: agenda(14).slice(0, 7).map((e) => ({ k: e.k, txt: e.txt, quando: `${dm(e.ms)} · ${whenTxt(inDays(e.ms))}` })),
            when: c ? clAt() || c.date : undefined, old: !!(c && dueAt && (gen && !isNaN(gen) ? gen < dueAt : c.date < todayLocal())),
            cl: c ? { headline: c.headline, market: c.market, planNote: c.planNote, tldr: c.tldr, risks: c.risks,
                plan: lst(c.plan, (p) => ({ s: p.s, name: p.name, why: p.why, amount: p.amount, eur: eurNum(p.amount), nm: nameOf(p.s), r: !!REG[p.s] })),
                movers: lst(c.movers, (m) => ({ s: m.s, why: m.why, r: !!REG[m.s], nm: REG[m.s] ? nameOf(m.s) : undefined, chg: REG[m.s] ? qv(m.s).changePct : undefined })),
                actions: lst(c.actions, (a) => ({ s: a.s, key: a.key, action: a.action, why: a.why, mid: a.mid, long: a.long, n: REG[a.s] ? nameOf(a.s) : uniName(a.s) || a.s, t: uniRow(a.s).t || '' })) } : null,
        };
    }

    // ---------- o mercado cripto todo (os Destaques) ----------
    let CG = null, cgAt = 0;
    async function loadCryptoGlobal() {
        if (!cfg.proxy || now() - cgAt < 10 * 60 * 1000) return;
        cgAt = now();
        try { CG = await px('/cryptoglobal', 20000); scheduleRender(); } catch { /* sem dados */ }
    }
    // Os Destaques são desenhados pela Onda (mercados/onda/ecra-destaques.onda, no módulo da análise): desde a 4.8.0 é ela
    // a referência desta vista. Os eventos continuam aqui; o aviso do conector é o do Painel. Até o módulo estar pronto
    // fica o aviso "A calcular…" (o sentimento do mercado e o tom das notícias também são da Onda).
    function highlightsHtml() {
        const top = cfg.proxy ? '' : setupBanner();
        if (aoOk && AO.ecra) try { return top + AO.ecra.destaques(highlightsSnap()); } catch (e) { console.error('ecrã Onda:', e); }
        highlightsLoad();
        return top + `<div class="empty">${aoOk ? 'Não deu para mostrar os destaques.' : 'A calcular…'}</div>`;
    }
    // o que os Destaques pedem à rede: o mercado cripto e as notícias dos meus ativos e dos 3 que mais sobem e mais caem do
    // que sigo (as mesmas regras da vista). A lista dos EUA pede-se ao abrir o separador, ao atualizar e de 3 em 3 min.
    function highlightsLoad() {
        if (!cfg.proxy) return;
        loadCryptoGlobal();
        const v = (k) => qv(k).changePct, mine = holdingKeys();
        const rest = Object.keys(REG).filter((k) => listed(k) && REG[k].kind !== 'index' && fin(v(k)) && !mine.includes(k));
        const top = (s) => rest.filter((k) => s * v(k) > 0).sort((a, b) => s * (v(b) - v(a))).slice(0, 3);
        for (const k of mine.concat(top(1), top(-1))) if (!NEWS[k]) loadNews(k).then(scheduleRender).catch(() => {});
    }
    // O instantâneo para a Onda: o que os Destaques leem, cru (a Onda filtra, ordena — o sort do V8 — e escreve). Vai já
    // feito o que é de outras partes da app: os nomes (nameOf), a cotação do dia (qv: preço da noite, euros), o sentimento
    // do mercado (o marketMood do motor) e, de cada ativo, só a 1.ª notícia (título e tom).
    function highlightsSnap() {
        highlightsLoad();
        const fold = (f) => (f in st.fold ? st.fold[f] : false);
        const inv = Object.keys(AN).filter((k) => listed(k) && investable(k));
        const breadth = inv.length ? inv.filter((k) => AN[k].score >= 58).length / inv.length : NaN;
        const n1 = (k) => { const n = NEWS[k] && NEWS[k].items && NEWS[k].items[0]; return n ? { title: n.title, tone: n.tone && n.tone.tone } : undefined; };
        const C = CLAUDE, M = MOVERS, G = CG;
        return {
            proxy: cfg.proxy, fiat: cfg.fiat, mine: holdingKeys(), err: st.moversErr, eu: Q['EURUSD=X'] && Q['EURUSD=X'].price,
            foldMood: fold('hl-mood'), foldEua: fold('hl-eua'), foldCg: fold('hl-cripto'),
            mood: A.marketMood({ spx: AN['^GSPC'], stoxx: AN['^STOXX50E'], btc: AN['c:BTC'], vix: Q['^VIX'] && Q['^VIX'].price, breadth }),
            assets: Object.keys(REG).map((k) => {
                const a = REG[k], q = qv(k);
                return { k, kind: a.kind, temp: a.temp, sym: a.sym, name: nameOf(k), dec: a.decimals, pts: a.points, px: q.price, cur: q.currency, qc: Q[k] && Q[k].currency, chg: q.changePct, n1: n1(k) };
            }),
            why: C && Array.isArray(C.movers) ? C.movers.map((x) => (x && typeof x === 'object' ? { s: x.s, why: x.why } : x)) : undefined,
            mv: M ? { gainers: M.gainers, losers: M.losers } : M,
            cg: G ? { fng: G.fng, mcap: G.mcap, mcapUsd: G.mcapUsd, mcapChg: G.mcapChg, vol: G.vol, volUsd: G.volUsd, btcDom: G.btcDom, ethDom: G.ethDom } : G,
        };
    }

    const HZ = [['short', 'Curto', 'dias a 2 semanas'], ['mid', 'Médio', 'semanas a 3 meses'], ['long', 'Longo', 'anos']];
    // preço na mesma moeda/escala do que se mostra (euros, preço da noite)
    const lvPx = (k, q, price) => price * (q.fx || 1);
    // ---------- ficha: primeiro o veredicto do Claude; o algoritmo fica em "Sinais automáticos" ----------
    // nível do Claude (na moeda do ativo, como no dados do conselheiro) → na moeda mostrada (euros, ou dólares na cripto em USD)
    function clPx(k, q, v) {
        if (!fin(v)) return null;
        if (REG[k] && REG[k].kind === 'crypto') { const eu = Q['EURUSD=X'] && Q['EURUSD=X'].price; return cfg.fiat === 'USD' ? (fin(eu) ? v * eu : null) : v; }
        return v * (q.fx || 1);
    }
    const whyToday = (k, q) => (moverWhy(k) ? `<div class="adv-why"><b>Porquê ${fin(q.changePct) && q.changePct < 0 ? 'desce' : 'sobe'} hoje:</b> ${esc(moverWhy(k))}</div>` : '');
    // compra-se na TR? (também o que se abre de "Toda a Trade Republic", que não está nas listas)
    const buyable = (k) => !!REG[k] && ['stock', 'fund', 'crypto'].includes(REG[k].kind);
    // factos que contam numa decisão: agenda, tipo de ETF e impostos em Portugal
    function factsHtml(k) {
        if (!buyable(k)) return '';
        const kind = REG[k].ut === 'crypto' ? 'crypto' : REG[k].kind;
        return `${eventsOf(k).filter((e) => inDays(e.ms) <= 21).map((e) => `<div class="adv-ev">${e.type === 'earnings'
                ? `<b>Resultados ${whenTxt(inDays(e.ms))} (${dm(e.ms)}).</b> Nesses dias a ação costuma mexer ±5–10%.`
                : `<b>Ex-dividendo ${whenTxt(inDays(e.ms))} (${dm(e.ms)}).</b> Para receber este dividendo tens de ter a ação antes dessa data.`}</div>`).join('')}
            ${kind === 'fund' && FUND_TYPE[k] ? `<div class="adv-meta"><b>${{ acc: 'Acumulação', dist: 'Distribuição', etc: 'ETC (sem dividendos)' }[FUND_TYPE[k]]}</b> — ${{ acc: 'não paga dividendos: nada a declarar no IRS até venderes.', dist: 'paga dividendos: 28% e declaração no IRS (Anexo J) todos os anos. Para o plano, a versão de acumulação poupa essa declaração.', etc: 'não paga dividendos; só declaras quando venderes.' }[FUND_TYPE[k]]}</div>` : ''}
            ${kind === 'stock' ? '<div class="adv-meta"><b>Dividendos</b> — se a empresa pagar, são 28% e entram na declaração de IRS (Anexo J) todos os anos.</div>' : ''}
            <div class="adv-meta">Impostos (PT): ${kind === 'crypto' ? 'vender ao fim de 365 dias ou mais está isento de IRS; antes disso paga 28%.' : kind === 'fund' ? 'só pagas quando venderes, e menos quanto mais tempo o tiveres: 28% até 2 anos, 25,2% de 2 a 5, 22,4% de 5 a 8 e 19,6% com 8 anos ou mais. Um ETF de acumulação não paga nada enquanto o tiveres.' : 'ao vender, 28% até 2 anos, 25,2% de 2 a 5, 22,4% de 5 a 8 e 19,6% com 8 anos ou mais; os dividendos pagam 28%.'}</div>`;
    }
    // segunda opinião: o sinal automático do mesmo ativo ao lado do veredicto do Claude (família: entrar / ficar / sair)
    const FAM = { buy: 1, scale: 1, hold: 0, wait: 0, neutral: 0, turn: 0, reduce: -1, sell: -1, avoid: -1 };
    const algDiff = (k, c) => { const a = AN[k] && AN[k].advice; return !!(c && a && FAM[c.key] != null && FAM[a.key] != null && FAM[c.key] !== FAM[a.key]); };
    function algLine(k, c) {
        const a = AN[k] && AN[k].advice;
        if (!a || !buyable(k) || FAM[c.key] == null) return '';
        const diff = algDiff(k, c), h = AN[k] && AN[k].horizons;
        // as pontuações da regra (curto, médio, longo): o que ela vê, em números
        const pts = h ? ['short', 'mid', 'long'].map((z, i) => (h[z] && fin(h[z].score) ? `${'CML'[i]}${Math.round(h[z].score)}` : '')).filter(Boolean).join(' · ') : '';
        return `<div class="adv-alg${diff ? ' diff' : ''}">
            <div><b>Algoritmo:</b> ${esc(rotulo(a.key, owns(k)) || a.action)}${a.text ? ` — ${esc(a.text)}` : ''}${pts ? ` <span class="alg-pts num">(${pts})</span>` : ''}</div>
            <div><b>Claude:</b> ${diff ? `<b>discorda</b>${c.algWhy ? ` — ${esc(c.algWhy)}` : ''}` : 'concorda'}</div></div>`;
    }
    function claudeBox(k, q) {
        const c = claudeFor(k);
        if (!c) return '';
        const A_ = REG[k], tone = CL_TONE[c.key] || 'flat';
        const lbl = rotulo(c.key, owns(k)) || c.action || '', cs = HZ.map(([h]) => c[h]).filter(fin);
        // forte: convicção de 70 ou mais nalgum prazo (entrar), ou de 30 ou menos (sair)
        const forte = cs.length && (FAMS[c.key] === 1 ? Math.max(...cs) >= 70 : FAMS[c.key] === -1 ? Math.min(...cs) <= 30 : false);
        const dist = (v) => { const p = clPx(k, q, v); return fin(p) && fin(q.price) && q.price ? fmtPct((p / q.price - 1) * 100) : ''; };
        const conv = HZ.filter(([h]) => fin(c[h])).map(([h, l]) => `<div class="cv"><small>${l} prazo</small>${scoreBar({ score: c[h], tone: scoreTone(c[h]) })}</div>`).join('');
        const lv = [['entry', 'Entrada'], ['target', 'Alvo'], ['stop', 'Stop']].filter(([f]) => fin(clPx(k, q, c[f])))
            .map(([f, l]) => `<li class="${f}"><small>${l}</small><b class="num">${fmtPx(clPx(k, q, c[f]), A_, q.currency)}</b><span class="num">${dist(c[f])}</span></li>`).join('');
        return `<div class="box advice cl-adv ${tone}"><h3>${buyable(k) ? 'O que fazer na Trade Republic' : 'Leitura do Claude'}</h3>
            <div class="adv-src">${c.old ? `Análise do Claude de ${esc(dmy(c.date).slice(0, 5))} · último comentário a este ativo` : `Análise do Claude · ${esc(clWhen())}`}</div>
            <div class="adv-act ${tone}-t">${esc(lbl)}${forte ? ' <small class="adv-forte">forte</small>' : ''}</div>${nuance(lbl, c.action)}
            ${conv ? `<div class="cl-conv" role="group" aria-label="Convicção do Claude por prazo">${conv}</div>` : ''}
            ${lv ? `<ul class="cl-lv">${lv}</ul>` : ''}
            ${algLine(k, c)}
            ${whyToday(k, q)}
            <div class="adv-txt">${esc(c.why || '')}</div>
            ${c.plan ? `<div class="adv-txt"><b>Plano:</b> ${esc(c.plan)}</div>` : ''}
            ${factsHtml(k)}</div>`;
    }
    // ---- o consenso dos analistas (Yahoo, pelo conector: /consensus) — a segunda opinião de fora, nas ações ----
    const CONS = {}, consAt = {};
    const CONS_LBL = { strong_buy: 'Compra forte', buy: 'Comprar', hold: 'Manter', underperform: 'Abaixo do mercado', sell: 'Vender', strong_sell: 'Venda forte' };
    const CONS_FAM = { strong_buy: 1, buy: 1, hold: 0, underperform: -1, sell: -1, strong_sell: -1 };
    async function loadConsensus(k) {
        if (!REG[k] || REG[k].kind !== 'stock' || !cfg.proxy || now() - (consAt[k] || 0) < 6 * 3600 * 1000) return;
        consAt[k] = now();
        try {
            const r = await px(`/consensus?symbols=${encodeURIComponent(k)}`, 15000);
            CONS[k] = (r.items || []).find((x) => x.symbol === k) || null;
        } catch { CONS[k] = null; }
        if (sheetKey === k) renderSheet(true);
    }
    function consBox(k, cl) {
        const c = CONS[k];
        if (!c || c.none || c.error || !CONS_LBL[c.key] || !(c.n > 0)) return '';
        const f = CONS_FAM[c.key], tone = f > 0 ? 'up' : f < 0 ? 'down' : 'flat';
        const v = Array.isArray(c.votes) ? c.votes.map((x) => Math.max(0, +x || 0)) : null, tot = v ? v.reduce((a, b) => a + b, 0) : 0;
        const bar = tot ? `<div class="cons-bar" role="img" aria-label="Votos: ${v.join(', ')}">${v.map((x, i) => x ? `<i class="c${i}" style="flex:${x}"></i>` : '').join('')}</div>
            <div class="cons-leg"><span>compra ${v[0] + v[1]}</span><span>manter ${v[2]}</span><span>venda ${v[3] + v[4]}</span></div>` : '';
        const alvo = fin(c.target) && fin(c.price) && c.price > 0 ? `<div class="adv-meta">Preço-alvo médio <b class="num">${fmtPx(c.target, REG[k], c.currency)}</b> <span class="${toneOf(c.target / c.price - 1)}-t">${fmtPct((c.target / c.price - 1) * 100)}</span>${fin(c.low) && fin(c.high) ? ` · entre ${fmtPx(c.low, REG[k], c.currency)} e ${fmtPx(c.high, REG[k], c.currency)}` : ''}</div>` : '';
        const fc = cl ? FAMS[cl.key] : null;
        const quem = fc == null ? '' : `<div class="adv-alg${fc !== f ? ' diff' : ''}"><b>Claude:</b> ${esc(rotulo(cl.key, owns(k)))} · ${fc === f ? 'concorda com os analistas' : '<b>discorda dos analistas</b> — o porquê está na leitura dele'}</div>`;
        return `<div class="box cons-box"><h3>Analistas <small>Yahoo Finance</small></h3>
            <div class="adv-act ${tone}-t">${CONS_LBL[c.key]} <small class="cons-n">${c.n} ${c.n === 1 ? 'analista' : 'analistas'}${fin(c.mean) ? ` · ${String(Math.round(c.mean * 10) / 10).replace('.', ',')} de 5` : ''}</small></div>
            ${bar}${alvo}${quem}</div>`;
    }
    // sinal automático (regras fixas de analise.js): em primeiro plano só quando o Claude não analisou o ativo
    function algoAdvice(k, q, primary) {
        const r = AN[k];
        if (!r || !r.advice || !buyable(k)) return '';
        const a = r.advice;
        const fmt = (price) => fmtPx(lvPx(k, q, price), REG[k], q.currency);
        const al = rotulo(a.key, owns(k)) || a.action;
        const body = `<div class="adv-act ${a.tone}-t">${esc(al)}</div>${nuance(al, a.action)}
            <div class="adv-txt">${esc(a.text)}</div>
            ${a.plan.length ? `<ul class="adv-plan">${a.plan.map((x) => `<li><span>${esc(x.t)}</span><b class="num">${fmt(x.price)}</b></li>`).join('')}</ul>` : ''}
            ${a.invalid ? `<div class="adv-meta">A ideia falha se fechar abaixo de <b class="num">${fmt(a.invalid)}</b></div>` : ''}
            ${a.size ? `<div class="adv-meta">Tamanho: ${esc(a.size)}</div>` : ''}`;
        if (!primary) return `<div class="box algo-box"><h3>Sinal automático</h3>${body}<div class="adv-meta faint">Regras fixas: tendência, desconto e níveis.</div></div>`;
        return `<div class="box advice ${a.tone}"><h3>O que fazer na Trade Republic</h3>
            <div class="adv-src">Sinal automático (algoritmo) · ${clDoc() ? 'o Claude não analisou este ativo' : claudeOn() ? 'ainda sem análise do Claude' : 'a análise do Claude liga-se em Ajustes'}</div>
            ${whyToday(k, q)}${body}${factsHtml(k)}</div>`;
    }
    // pontuações automáticas por prazo, com as razões
    function techBox(k) {
        const r = AN[k], a = REG[k];
        return `<div class="box"><h3>Análise técnica ${r ? `<span class="chip-s">${esc(r.risk.label)}</span>` : ''}</h3>
                ${r ? `${HZ.map(([hz, l, d]) => { const h = r.horizons && r.horizons[hz]; return h ? `<details class="hzb" ${hz === cfg.hz ? 'open' : ''}><summary>
                    <div class="hz-t"><b>${l} prazo</b><small>${d}</small></div>
                    <div class="hz-s">${scoreBar(h)}<div class="lbl ${h.tone}-t">${esc(h.label)}</div></div></summary>
                    ${reasonList(h.reasons)}</details>` : `<div class="hzb na"><div class="hz-t"><b>${l} prazo</b><small>${d}</small></div><div class="note">Histórico curto demais.</div></div>`; }).join('')}
                <p class="note">Toca num prazo para ver as razões.</p>` : `<div class="note">${cfg.proxy || a.kind === 'crypto' ? 'A calcular com o histórico de 1 ano…' : 'Liga o conector para ver a análise.'}</div>`}
            </div>`;
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
    // o valor em euros de um texto do Claude ("810 €", "1.234,50 €"): o Number() de um texto não está na Onda
    const eurNum = (s) => { const m = String(s || '').replace(/[\s  ]/g, '').replace(/\./g, '').match(/(\d+(?:,\d+)?)€/); return m ? +m[1].replace(',', '.') : NaN; };
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

    const CL_TONE = { buy: 'up', scale: 'up', hold: 'flat', wait: 'flat', neutral: 'flat', turn: 'flat', reduce: 'down', avoid: 'down', sell: 'down', up: 'up', flat: 'flat', down: 'down' };
    const scoreTone = (v) => (v >= 58 ? 'up' : v <= 42 ? 'down' : 'flat');
    // A Análise é desenhada pela Onda (mercados/onda/ecra-analise.onda, no módulo da análise): desde a 4.7.0 é ela a
    // referência desta vista. Os eventos continuam aqui. Até o módulo estar pronto não há pontuações (o motor também é a
    // Onda): fica o aviso.
    function analysisHtml() {
        if (aoOk && AO.ecra) try { return AO.ecra.analise(analysisSnap()); } catch (e) { console.error('ecrã Onda:', e); }
        analysisLoad();
        return `<div class="empty">${aoOk ? 'Não deu para mostrar a análise.' : 'A calcular…'}</div>`;
    }
    // o que a Análise pede à rede: toda a Trade Republic (na app do dono) e o diário
    function analysisLoad() {
        if (cfg.owner) loadUni();
        if (cfg.proxy && !JOURNAL) loadJournal();
    }
    // a hora da análise do Claude, para a linha pequena da Análise: "07:16" (de hoje) ou "06/11 07:16"
    const HM = new Intl.DateTimeFormat('pt-PT', { hour: '2-digit', minute: '2-digit' }), DM = new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit' });
    function clAt() {
        const g = CLAUDE && CLAUDE.generatedAt ? new Date(CLAUDE.generatedAt) : null;
        if (!g || isNaN(g)) return '';
        return (g.toDateString() === new Date().toDateString() ? '' : DM.format(g) + ' ') + HM.format(g);
    }
    // O instantâneo para a Onda: o que a Análise lê, cru (a Onda filtra, ordena — o sort do V8 — e escreve). Da análise
    // de cada ativo vão só os campos que a vista usa; toda a Trade Republic vai como lista fixa (escrita na memória da
    // Onda uma vez por cada lista nova). Vai já feito o que é do browser ou de outras partes da app: os nomes (nameOf), a
    // variação do dia (qv: preço da noite, euros), a hora da análise do Claude (clAt) e o diário avaliado (evalJournal,
    // com os preços de agora).
    function analysisSnap() {
        analysisLoad();
        const C = CLAUDE, U = cfg.owner ? UNI : null, B = BT, fold = (f) => (f in st.fold ? st.fold[f] : false);
        const H = (x) => (x ? { score: x.score, tone: x.tone, label: x.label } : x);
        const ac = (x) => (x && typeof x === 'object' ? { s: x.s, key: x.key, action: x.action, short: x.short, mid: x.mid, long: x.long } : x);
        const nm = (l) => (Array.isArray(l) ? l.map((x) => [nameOf(x.k), x.a]) : l);
        return {
            horas: CL_LBL, owner: cfg.owner, claude: cfg.claude, proxy: cfg.proxy, filter: cfg.filter, hz: cfg.hz, strategy: cfg.strategy,
            foldAn: fold('an-auto'), foldUni: fold('uni'), foldRes: fold('an-res'), foldSobre: fold('an-sobre'), uniN: st.uniN, when: clAt(),
            assets: Object.keys(REG).map((k) => {
                const a = REG[k], r = AN[k], h = r && r.horizons, d = r && r.discount;
                return { k, kind: a.kind, temp: a.temp, sym: a.sym, name: nameOf(k), chg: qv(k).changePct, own: owns(k),
                    an: r ? { h: h ? { short: H(h.short), mid: H(h.mid), long: H(h.long) } : h,
                        d: d ? { dd: d.dd, score: d.score, tone: d.tone, tag: d.tag, opp: d.opp } : d, adv: r.advice && r.advice.key } : r };
            }),
            cl: C ? { missing: C.missing, review: C.review, lessons: C.lessons, rank: C.rank ? { short: C.rank.short, mid: C.rank.mid, long: C.rank.long } : C.rank,
                actions: Array.isArray(C.actions) ? C.actions.map(ac) : C.actions } : C,
            uni: U ? { error: U.error, rows: Array.isArray(U.rows) ? AO.ecra.fixa(U.rows) : U.rows } : U,
            ev: evalJournal(),
            bt: B ? { running: B.running, error: B.error, sum: B.sum, n: B.n, yrs: B.yrs, ticket: B.ticket, byKind: B.byKind, worst: nm(B.worst), best: nm(B.best) } : B,
        };
    }

    // ---------- ajustes ----------
    // Os Ajustes são desenhados pela Onda (mercados/onda/ajustes.onda, no módulo da análise), com o mesmo HTML; os
    // eventos continuam aqui (o click/change delegado pelos data-*). Até o módulo estar pronto (ou se falhar),
    // desenha-os o viewSettings, que fica também como a referência do teste de paridade
    // (tests/ecra-onda.test.mjs) até todas as vistas passarem para a Onda; depois sai.
    function settingsHtml() {
        if (aoOk && AO.ecra) try { return AO.ecra.ajustes(settingsSnap()); } catch (e) { console.error('ecrã Onda:', e); }
        return viewSettings();
    }
    // o que os Ajustes pedem à rede: as zonas dos combustíveis e, na app do dono, as contas da partilha
    function settingsLoad() {
        if (cfg.proxy && cfg.distrito && !MUNIC[cfg.distrito]) { MUNIC[cfg.distrito] = []; px(`/fuel/municipios?distrito=${encodeURIComponent(cfg.distrito)}`).then((d) => { MUNIC[cfg.distrito] = d.items || []; scheduleRender(); }).catch(() => { delete MUNIC[cfg.distrito]; }); }
        if (cfg.proxy && !DISTRITOS) px('/fuel/distritos').then((d) => { DISTRITOS = d.items || []; scheduleRender(); }).catch(() => { DISTRITOS = []; });
        if (cfg.owner) loadStats();
    }
    // "07/11, 08:00": o texto do toLocaleString('pt-PT') com estas opções, sem criar um formatador a cada desenho
    // (~0,4 ms cada); fica com o fuso de quando a app abriu
    const DTF = new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    const dtLbl = (t) => { const d = new Date(t); return isNaN(d) ? 'Invalid Date' : DTF.format(d); };
    // O instantâneo para a Onda: o que o viewSettings lê, cru (a Onda faz com os valores o que o JS faz: String, esc,
    // ===, includes, verdade). Vai já feito só o que é do browser ou de outras partes da app: as datas (no fuso e na
    // língua do browser), o + dos números da configuração, as notificações do browser, os nomes (nameOf), a lista
    // desta app (myList) e o link de partilha.
    function settingsSnap() {
        settingsLoad();
        const r = (STATS || {}).run, nm = (k) => [k, nameOf(k)], nOk = 'Notification' in window;
        return {
            versao: VERSION, horas: CL_LBL, agora: now(),
            finnhub: cfg.finnhub, fh: st.fh, proxy: cfg.proxy, yErr: st.yahooErr, yAt: st.yahooAt, yAtTxt: st.yahooAt ? dtLbl(st.yahooAt) : '',
            budget: +cfg.budget, strategy: cfg.strategy, funds: cfg.funds.map(nm), coreFund: cfg.coreFund, cryptoPct: +cfg.cryptoPct, cryptoMix: cfg.cryptoMix,
            crypto: CRYPTO.map((c) => nm('c:' + c.id)), holdings: cfg.holdings, profile: cfg.profile, saveDays: cfg.saveDays, jid: cfg.jid,
            owner: cfg.owner, claude: cfg.claude, others: st.others, stats: STATS, runAt: r && r.at ? dtLbl(r.at) : '', share: shareLink(), meus: myList().map(nameOf),
            fs: cfg.fs, eur: cfg.eur, fiat: cfg.fiat, alertPct: +cfg.alertPct, alertScope: cfg.alertScope,
            notifOk: nOk, notifPerm: nOk ? Notification.permission : undefined, notify: cfg.notify, quiet: cfg.quiet,
            distritos: DISTRITOS, distrito: cfg.distrito, munic: MUNIC[cfg.distrito], municipio: cfg.municipio, watch: cfg.watch.map(nm),
        };
    }
    function viewSettings() {
        const lim = +cfg.alertPct || 0;
        const notifState = !('Notification' in window) ? 'não suportado neste browser' : Notification.permission === 'denied' ? 'bloqueado nas definições do browser' : '';
        settingsLoad();
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
                    <div class="hint">${etfCrypto() ? 'O plano do mês vai para o ETF núcleo e para a cripto, todos os meses. As ações e os outros ETF têm o veredicto do Claude em Análise e em cada ficha (compras fora do plano).' : 'O plano inclui ações como satélites, conforme os sinais.'}</div></div>
                ${etfCrypto() ? `<div><label>Fundo núcleo</label><select class="inp" data-cfg="coreFund">${cfg.funds.map((f) => `<option value="${esc(f)}" ${cfg.coreFund === f ? 'selected' : ''}>${esc(nameOf(f))}</option>`).join('')}</select></div>
                <div><label>Parte em cripto</label><div class="chips days">${[0, 5, 10, 15].map((v) => `<button type="button" data-cpct="${v}" class="${+cfg.cryptoPct === v ? 'on' : ''}">${v}%</button>`).join('')}</div>
                    <div class="seg prof two" style="margin-top:8px"><button type="button" data-cmix="btc" class="${cfg.cryptoMix !== 'btceth' ? 'on' : ''}"><b>Só Bitcoin</b></button><button type="button" data-cmix="btceth" class="${cfg.cryptoMix === 'btceth' ? 'on' : ''}"><b>Bitcoin 70 / Ether 30</b></button></div>
                    <div class="hint">Cripto entra todos os meses (sem tentar acertar no momento). Em Portugal, vender ao fim de 365 dias ou mais está isento de IRS.</div></div>` : ''}
                <div><label>O que tenho</label><div class="chips days">${cfg.funds.concat(CRYPTO.map((c) => 'c:' + c.id)).map((k) => `<button type="button" data-hold="${esc(k)}" class="${cfg.holdings.includes(k) ? 'on' : ''}">${esc(nameOf(k))}</button>`).join('')}</div>
                    <div class="hint">A app acompanha e avisa sobre estes; o conselheiro analisa-os todos os dias.</div></div>
                <div ${etfCrypto() ? 'hidden' : ''}><label>Perfil de risco</label><div class="seg prof">${Object.entries(PROFILES).map(([v, [n, c, s, cr]]) => `<button type="button" data-prof="${v}" class="${cfg.profile === v ? 'on' : ''}"><b>${n}</b><small>${Math.round(c * 100)}/${Math.round(s * 100)}/${Math.round(cr * 100)}</small></button>`).join('')}</div>
                    <div class="hint">Núcleo (ETF) / satélites (ações) / cripto. O Resumo do dia divide o valor do mês por estas partes, conforme os sinais de cada ativo.</div></div>
                <div><label>Dias de execução dos planos na TR</label><div class="chips days">${[2, 9, 16, 23].map((d) => `<button type="button" data-sday="${d}" class="${cfg.saveDays.includes(d) ? 'on' : ''}">dia ${d}</button>`).join('')}</div>
                    <div class="hint">A TR executa os planos de poupança nos dias 2, 9, 16 e 23 (sem custos; dá para alterar até à véspera). Com 2 dias, o valor do mês divide-se a meio${+cfg.budget ? ` (${fmtPx(+cfg.budget / cfg.saveDays.length, { decimals: 0 }, 'EUR')} por execução)` : ''}. Na véspera, o Resumo do dia diz quanto pôr em cada plano.</div></div>
                <div><label>Diário das sugestões</label><div class="hint">Guardado no teu conector com o código <code class="sel">${esc(cfg.jid)}</code>. Se reinstalares a app, cola aqui o código para recuperar o histórico.${cfg.owner ? ' É também a chave da tua app de dono: não o mostres a ninguém.' : ''}</div>
                    <div class="inl" style="margin-top:6px"><input id="f-jid" class="inp" type="text" autocomplete="off" spellcheck="false" placeholder="código do diário"><button type="button" class="btn sm" data-act="jid">Usar</button></div></div>
            </div></section>
        ${claudeSection()}
        <section class="sec"><div class="sec-h"><h2>Preferências</h2></div>
            <div class="form">
                <div><label>Tamanho da letra</label><div class="seg prof">${[['n', 'Normal'], ['l', 'Grande'], ['xl', 'Muito grande']].map(([v, l]) => `<button type="button" data-fs="${v}" class="${(cfg.fs || 'n') === v ? 'on' : ''}"><b>${l}</b></button>`).join('')}</div>
                    <div class="hint">Segue também o tamanho de texto do iPhone (Definições → Ecrã e brilho → Tamanho do texto).</div></div>
                <div class="sw"><span>Ações e fundos em euros<br><small class="hint">como na Trade Republic</small></span><div class="seg"><button type="button" data-eur="1" class="${cfg.eur ? 'on' : ''}">EUR</button><button type="button" data-eur="0" class="${cfg.eur ? '' : 'on'}">Moeda local</button></div></div>
                <div class="sw"><span>Moeda das cripto</span><div class="seg"><button type="button" data-fiat="EUR" class="${cfg.fiat === 'EUR' ? 'on' : ''}">EUR</button><button type="button" data-fiat="USD" class="${cfg.fiat === 'USD' ? 'on' : ''}">USD</button></div></div>
                <div><label for="f-lim">Avisar quando algo sobe ou cai mais de</label>
                    <select id="f-lim" class="inp" data-cfg="alertPct">${[0, 2, 3, 4, 5, 8, 10].map((p) => `<option value="${p}" ${lim === p ? 'selected' : ''}>${p ? '±' + p + '% no dia' : 'Não avisar'}</option>`).join('')}</select>
                    <select id="f-scope" class="inp" data-cfg="alertScope" style="margin-top:8px" aria-label="Sobre que ativos">${[['mine', 'Só os meus ativos'], ['mineAdded', 'Os meus e os que juntei'], ['all', 'Tudo o que sigo']].map(([v, l]) => `<option value="${v}" ${(cfg.alertScope || 'mineAdded') === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
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
                <div class="hint">Para ordenar: agarra na pega ≡ e arrasta (a página desliza sozinha perto das margens), ou ⤒ para pôr no topo.</div>
                <div class="wl">${[['f', cfg.funds], ['w', cfg.watch]].map(([g, arr]) => arr.map((s) => `<div class="wl-i" data-wk="${esc(s)}" data-grp="${g}"><button type="button" class="wl-h" aria-label="Arrastar ${esc(nameOf(s))}">≡</button><span>${esc(nameOf(s))} <small>${esc(s)}</small></span><button type="button" class="xbtn" data-mv="${esc(s)}" data-dir="top" aria-label="Pôr ${esc(nameOf(s))} no topo">⤒</button><button type="button" class="xbtn" data-rm="${esc(s)}" aria-label="Tirar ${esc(nameOf(s))}">×</button></div>`).join('')).join('')}</div>
            </div></section>
        <section class="sec" id="sobre"><div class="sec-h"><h2>Sobre</h2></div>
            <div class="disc"><b>Mercados ${VERSION}.</b> Cripto: Binance. Ações, índices, petróleo e notícias: Yahoo Finance e Google Notícias, através do teu conector. Combustíveis: DGEG. Análise de cada ativo: tarefa agendada do Claude, às ${CL_LBL}.
                <p class="about-own">Ferramenta pessoal; as decisões e a execução são tuas.</p></div></section>`;
    }

    // ---------- folha de detalhe ----------
    let sheetKey = null, sheetRange = '1d', sheetPts = null, sheetDraw = null, sheetLoadId = 0;
    const RANGE_LBL = [['15m', '15m'], ['1h', '1H'], ['4h', '4H'], ['1d', '1D'], ['5d', '1S'], ['1mo', '1M'], ['6mo', '6M'], ['1y', '1A'], ['5y', '5A']];

    // ut: tipo na lista toda da TR (etf, stock, crypto), para um ativo que não está nas listas da app
    function openSheet(k, tempName, ut) {
        if (!REG[k]) REG[k] = { key: k, kind: ut === 'etf' ? 'fund' : 'stock', ut, sym: k, name: tempName || k, temp: true };
        // abre no mesmo período escolhido no Painel (1D, 1S, 1M, 1A)
        sheetKey = k; sheetRange = { '1w': '5d', '1m': '1mo', '1y': '1y' }[cfg.per] || '1d'; sheetPts = null;
        loadConsensus(k);
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
    // lista de postos de um combustível (DGEG), do mais barato para o mais caro
    async function openFuelSheet(id) {
        const f0 = FUEL && FUEL.fuels && FUEL.fuels.find((x) => x.id === id);
        if (!f0) return;
        sheetKey = 'fuel:' + id;
        const sh = $('#mk-sheet'), box = $('#mk-sheet-card');
        box.style.transition = ''; box.style.transform = ''; $('.mk-sheet-bg').style.opacity = '';
        sh.hidden = false; document.body.style.overflow = 'hidden';
        const dname = cfg.distrito && DISTRITOS ? (DISTRITOS.find((d) => String(d.id) === String(cfg.distrito)) || {}).name : '';
        const mname = cfg.municipio && MUNIC[cfg.distrito] ? (MUNIC[cfg.distrito].find((m) => String(m.id) === String(cfg.municipio)) || {}).name : '';
        const zone = mname || dname || 'Portugal';
        const head = `<div class="grab"></div><div class="d-head"><div><h2 id="mk-sheet-title">${esc(f0.name)}</h2><div class="d-sub">${esc(zone)} · ${NF({}).format(f0.n)} postos · DGEG</div></div>
            <button type="button" class="mk-ibtn" data-act="close" aria-label="Fechar"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>`;
        box.innerHTML = head + '<div class="note" style="margin:16px 2px">A carregar os postos…</div>';
        box.scrollTop = 0;
        let f;
        try {
            const r = await px(`/fuel?distrito=${encodeURIComponent(cfg.distrito || '')}${cfg.distrito && cfg.municipio ? '&municipio=' + encodeURIComponent(cfg.municipio) : ''}&tipos=${id}&list=1`, 30000);
            f = r.fuels && r.fuels[0];
        } catch (e) { if (sheetKey === 'fuel:' + id) box.innerHTML = head + `<div class="empty" style="margin-top:14px">Não deu: ${esc(e.message)}</div>`; return; }
        if (sheetKey !== 'fuel:' + id) return;
        const st0 = (f && f.stations) || [];
        const min = st0.length ? st0[0].price : null;
        const maps = (s) => s.lat && s.lon ? `https://maps.apple.com/?ll=${s.lat},${s.lon}&q=${encodeURIComponent(s.name || 'Posto')}` : `https://maps.apple.com/?q=${encodeURIComponent([s.name, s.addr, s.place].filter(Boolean).join(', '))}`;
        const save = f && fin(f.median) && fin(min) ? (f.median - min) * 50 : null;
        box.innerHTML = head + `
            ${f ? `<div class="fu-sum"><div><small>Mais barato</small><b class="num up-t">${fmtPx(min, { decimals: 3 }, 'EUR')}</b></div><div><small>Mediana</small><b class="num">${fmtPx(f.median, { decimals: 3 }, 'EUR')}</b></div><div><small>Mais caro</small><b class="num">${fmtPx(f.max, { decimals: 3 }, 'EUR')}</b></div></div>
            ${save > 0.5 ? `<p class="note" style="margin:8px 2px 0">Num depósito de 50 L, o mais barato poupa cerca de <b>${fmtPx(save, { decimals: 2 }, 'EUR')}</b> face à mediana.</p>` : ''}` : ''}
            ${st0.length ? `<div class="list fu-list">${st0.map((s, i) => `<a class="row st-row" href="${esc(maps(s))}" target="_blank" rel="noopener">
                <span class="r-rank num">${i + 1}</span>
                <div class="r-main"><div class="r-name">${esc(s.name || s.brand || 'Posto')}</div><div class="r-sub">${esc([s.brand && s.brand !== s.name ? s.brand : '', s.addr || s.place].filter(Boolean).join(' · '))}</div></div>
                <div class="r-px num"><span class="px ${i === 0 ? 'up-t' : ''}">${fmtPx(s.price, { decimals: 3 }, 'EUR')}</span>${i ? `<span class="chg flat">+${NF({ minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(s.price - min)}</span>` : '<span class="chg up">o mais barato</span>'}</div></a>`).join('')}</div>
                ${f.n > st0.length ? `<p class="note">Mostra os ${st0.length} mais baratos de ${NF({}).format(f.n)}. Escolhe o concelho em Ajustes para ver só os da tua zona.</p>` : ''}`
            : '<div class="empty" style="margin-top:14px">Sem postos com preço.</div>'}
            <p class="note">Toca num posto para o abrir no Mapas. Preços comunicados pelos postos à DGEG${f && f.updated ? ' · última atualização ' + esc(f.updated) : ''}.</p>`;
    }
    function closeSheet(animated) {
        const done = () => { $('#mk-sheet').hidden = true; document.body.style.overflow = ''; sheetKey = null; if (window.GraficoOnda) GraficoOnda.parar(); scheduleRender(); };
        if (!animated) { done(); return; }
        const c = $('#mk-sheet-card');
        c.style.transition = 'transform .22s ease-in'; c.style.transform = 'translateY(105%)';
        $('.mk-sheet-bg').style.transition = 'opacity .22s'; $('.mk-sheet-bg').style.opacity = '0';
        setTimeout(done, 220);
    }
    // puxar a folha para baixo para fechar (como nas apps de bolsa); a velocidade conta pelo tempo dos próprios toques
    // (e.timeStamp), não pelo relógio de quando o browser os trata (com o telemóvel ocupado chegam todos de seguida)
    (function swipeToClose() {
        const c = $('#mk-sheet-card'), bg = $('.mk-sheet-bg');
        let y0 = null, dy = 0, t0 = 0, drag = false;
        c.addEventListener('touchstart', (e) => {
            if (e.touches.length !== 1 || e.target.closest('#d-cv')) { y0 = null; return; }
            y0 = e.touches[0].clientY; dy = 0; t0 = e.timeStamp; drag = false;
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
        const end = (e) => {
            if (y0 == null) return;
            const was = drag; y0 = null; drag = false;
            if (!was) return;
            const v = dy / Math.max(1, e.timeStamp - t0);
            if (dy > 110 || (dy > 30 && v > 0.5)) { closeSheet(true); return; }
            c.style.transition = 'transform .2s ease-out'; c.style.transform = '';
            bg.style.transition = 'opacity .2s'; bg.style.opacity = '';
        };
        c.addEventListener('touchend', end);
        c.addEventListener('touchcancel', end);
    })();
    function analyseOne(k) {
        const c = closesFor(k);
        if (!c || !aoOk) return;
        const r = AO.analyse(c, anOpts(k));
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
        if (lv && lv.series && lv.series.length > 1 && (lv.time || 0) > (q0.time || 0) && (lv.currency || q0.currency) === q0.currency) return mergeDay(q0.series, lv.series);
        return q0.series;
    }
    async function loadSheetChart() {
        const k = sheetKey, range = sheetRange, id = ++sheetLoadId;
        const a = REG[k];
        sheetPts = null; drawSheetChart();
        try {
            let pts;
            if (a.kind === 'crypto') pts = range === '1d' && Q[k] && Q[k].series && Q[k].series.length > 20 ? Q[k].series : await klines(a.sym, range);
            else if (SHORT_R[range]) {
                const r = await px(`/quotes?symbols=${encodeURIComponent(k)}&range=${range === '4h' ? '5d' : '1d'}&interval=${range === '4h' ? '5m' : '1m'}`, 20000);
                const q = r.quotes && r.quotes[0];
                if (!q || q.error || !q.series || !q.series.length) throw new Error(q && q.error || 'sem dados');
                const end = q.series[q.series.length - 1][0]; // mercado fechado: os últimos minutos da sessão
                pts = q.series.filter(([t]) => t >= end - SHORT_R[range]);
            }
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
    // ---------- o gráfico vivo da ficha (grafico-onda.js: cada píxel calculado pela Onda) ----------
    // A série vai igualmente espaçada: por ordem (períodos longos) ou reamostrada no tempo (1D e menos). A Onda desenha a
    // linha, o enchimento, a referência e o último preço, e só anima enquanto há mudança; por cima, aqui, as etiquetas
    // do máximo e do mínimo e o dedo.
    let vivaSig = '', vivaCores = false;
    function amostra(pts, byIdx) {
        const n0 = pts.length;
        const t0 = pts[0][0], t1 = pts[n0 - 1][0];
        if (byIdx || !(t1 > t0)) return Float64Array.from(pts, (p) => p[1]);
        const N = 480, out = new Float64Array(N);
        for (let j = 0, k = 0; j < N; j++) {
            const t = t0 + (t1 - t0) * j / (N - 1);
            while (k < n0 - 2 && pts[k + 1][0] < t) k++;
            const a = pts[k], b = pts[k + 1], f = b[0] > a[0] ? Math.min(1, Math.max(0, (t - a[0]) / (b[0] - a[0]))) : 1;
            out[j] = a[1] + (b[1] - a[1]) * f;
        }
        return out;
    }
    function desenhaViva(viva, cv, pts, o) {
        if (!vivaCores) { viva.cores({ sobe: COL.up, desce: COL.down, parado: COL.flat, ref: COL.muted, ponto: COL.text }); vivaCores = true; }
        const sig = sheetKey + '|' + sheetRange;
        viva.serie(amostra(pts, o.byIdx), { novo: sig !== vivaSig, base: fin(o.base) ? o.base : 0, tom: o.tone === 'up' ? 1 : o.tone === 'down' ? -1 : 0, vivo: true });
        vivaSig = sig;
        const n = pts.length, t0 = pts[0][0], t1 = pts[n - 1][0], porT = !o.byIdx && t1 > t0;
        const geo = viva.geo();
        const X = (i) => (porT ? (pts[i][0] - t0) / (t1 - t0) : i / (n - 1)) * geo.xr;
        const Y = (v, gg = viva.geo()) => gg.topo + (gg.hi - v) / Math.max(1e-12, gg.hi - gg.lo) * gg.alt;
        sheetDraw = { X, Y, w: geo.w, h: geo.h };
        const vals = pts.map((p) => p[1]), mx = Math.max(...vals), mn = Math.min(...vals), a = REG[sheetKey], cur = o.q.currency, hv = o.hover, tone = o.tone;
        viva.sobre = (g, gg) => {
            g.font = '600 10px system-ui, -apple-system, sans-serif'; g.fillStyle = COL.muted; g.textAlign = 'right';
            g.fillText(fmtPx(mx, a, cur), gg.w - 2, Math.max(10, Y(mx, gg) - 4));
            g.textBaseline = 'top'; g.fillText(fmtPx(mn, a, cur), gg.w - 2, Math.min(gg.h - 12, Y(mn, gg) + 4));
            g.textBaseline = 'alphabetic'; g.textAlign = 'left';
            if (hv != null && pts[hv]) {
                const x = X(hv), y = Y(pts[hv][1], gg);
                g.strokeStyle = COL.muted; g.lineWidth = 1; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, gg.h); g.stroke();
                g.fillStyle = COL[tone]; g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill();
            }
        };
        if (!viva.animando) viva.pinta();
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
        const byIdx = sheetRange !== '1d' && !SHORT_R[sheetRange];
        const viva = window.GraficoOnda && GraficoOnda.ok ? GraficoOnda.ligar(cv) : null;
        if (viva) desenhaViva(viva, cv, pts, { base, tone, byIdx, hover, q });
        else sheetDraw = drawLine(cv, pts, { tone, base, width: 2, pad: 14, byIndex: byIdx });
        // preço máximo e mínimo do período, à direita
        if (sheetDraw && !viva) {
            const { g, w, Y, lo, hi } = sheetDraw, vals = pts.map((p) => p[1]), mx = Math.max(...vals), mn = Math.min(...vals);
            g.font = '600 10px system-ui, -apple-system, sans-serif'; g.fillStyle = COL.muted; g.textAlign = 'right';
            g.fillText(fmtPx(mx, REG[sheetKey], q.currency), w - 2, Math.max(10, Y(mx) - 4));
            g.textBaseline = 'top'; g.fillText(fmtPx(mn, REG[sheetKey], q.currency), w - 2, Math.min(sheetDraw.h - 12, Y(mn) + 4));
            g.textBaseline = 'alphabetic'; g.textAlign = 'left';
        }
        // linha do tempo: 4 marcas por baixo do gráfico
        const ax = $('#d-axis');
        if (ax) {
            const t0 = pts[0][0], t1 = pts[pts.length - 1][0];
            const tAt = (f) => byIdx ? pts[Math.round(f * (pts.length - 1))][0] : t0 + f * (t1 - t0);
            const span = t1 - t0;
            const fmt = (t) => { const d = new Date(t * 1000);
                if (span <= 2 * 86400) return d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
                if (span <= 200 * 86400) return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
                return d.toLocaleDateString('pt-PT', { month: 'short', year: '2-digit' }); };
            ax.innerHTML = [0, 1 / 3, 2 / 3, 1].map((f) => `<span>${esc(fmt(tAt(f)))}</span>`).join('');
        }
        const tip = $('#d-tip');
        if (hover != null && sheetDraw) {
            const { g, X, Y, h } = sheetDraw;
            const p = pts[hover];
            if (!viva) { g.strokeStyle = COL.muted; g.lineWidth = 1; g.beginPath(); g.moveTo(X(hover), 0); g.lineTo(X(hover), h); g.stroke();
            g.fillStyle = COL[tone]; g.beginPath(); g.arc(X(hover), Y(p[1]), 4, 0, 7); g.fill(); }
            if (tip) tip.innerHTML = `<b class="num">${fmtPx(p[1], REG[sheetKey], q.currency)}</b> · ${esc(dateLbl(p[0], ['15m', '1h', '4h', '1d', '5d', '1mo'].includes(sheetRange)))} · <span class="${toneOf((p[1] / base - 1) * 100)}-t">${fmtPct((p[1] / base - 1) * 100)}</span>`;
        } else if (tip) {
            const ch = (lastv / first - 1) * 100;
            const lw = pxWhenLong(sheetKey, q);
            tip.innerHTML = sheetRange === '1d' ? (lw ? esc(lw) + ' · arrasta no gráfico' : 'Hoje · arrasta no gráfico para ver valores') : `No período: <span class="${toneOf(ch)}-t">${fmtPct(ch)}</span> · arrasta no gráfico`;
        }
    }
    const PERIOD = { '15m': '15 min', '1h': '1 hora', '4h': '4 horas', '1d': 'hoje', '5d': '1 semana', '1mo': '1 mês', '6mo': '6 meses', '1y': '1 ano', '5y': '5 anos' };
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
    // rendimento em vários períodos (dos fechos diários de 1 ano)
    function perfRow(k, q) {
        const d = D[k];
        if (!d || d.length < 5 || !fin(q.price)) return '';
        const f = q.fx || 1, nowS = now() / 1000;
        const at = (days) => { let i = d.findIndex((p) => p[0] > nowS - days * 86400); if (i < 0) i = d.length; if (i === 0 && d[0][0] > nowS - days * 86400 + 5 * 86400) return null; return d[Math.max(0, i - 1)][1] * f; };
        const cells = [['Hoje', q.changePct], ['7 dias', 7], ['30 dias', 30], ['90 dias', 90], ['180 dias', 180], ['1 ano', 365]].map(([l, v]) => {
            const pc = l === 'Hoje' ? v : (() => { const r = at(v); return fin(r) && r ? (q.price / r - 1) * 100 : null; })();
            return `<div><small>${l}</small><b class="num ${fin(pc) ? toneOf(pc) + '-t' : ''}">${fin(pc) ? fmtPct(pc) : '—'}</b></div>`;
        });
        return `<div class="perf">${cells.join('')}</div>`;
    }
    function renderSheet() {
        const k = sheetKey; if (!k) return;
        const a = REG[k], q = qv(k), r = AN[k], n = NEWS[k], cl = claudeFor(k);
        const following = cfg.watch.includes(k) || cfg.funds.includes(k);
        const stat = (l, v) => `<div><small>${l}</small><b class="num">${v}</b></div>`;
        const box = $('#mk-sheet-card');
        const scroll = box.scrollTop;
        box.innerHTML = `<div class="grab"></div>
            <div class="d-head"><div><h2 id="mk-sheet-title">${esc(nameOf(k))}</h2><div class="d-sub">${esc([a.kind === 'crypto' ? a.sym + '/' + cfg.fiat : a.sym, q.venue || q.exchange, q.open === false ? 'mercado fechado' : q.open ? 'mercado aberto' : ''].filter(Boolean).join(' · '))}</div></div>
                <button type="button" class="mk-ibtn" data-act="close" aria-label="Fechar"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
            <div class="d-px" id="d-px"></div>
            <div class="d-tip" id="d-tip"></div>
            <div class="d-chart"><canvas id="d-cv"></canvas><div class="d-axis num" id="d-axis"></div><div class="loading" id="d-load">A carregar…</div></div>
            <div class="ranges">${RANGE_LBL.map(([v, l]) => `<button type="button" data-range="${v}" class="${sheetRange === v ? 'on' : ''}">${l}</button>`).join('')}</div>
            ${perfRow(k, q)}
            ${cl ? claudeBox(k, q) : algoAdvice(k, q, true)}
            ${consBox(k, cl)}
            ${cl ? `<details class="auto sh-auto" data-fold="sheet-auto" ${foldAttr('sheet-auto')}><summary>Sinais automáticos (algoritmo)<small>regras fixas: tendência, momento, desconto</small></summary>
                ${algoAdvice(k, q, false)}${techBox(k)}${discountBox(k, q)}</details>` : ''}
            <div class="stats">
                ${stat('Máx. do dia', fmtPx(q.dayHigh, a, q.currency))}${stat('Mín. do dia', fmtPx(q.dayLow, a, q.currency))}
                ${a.kind === 'crypto' ? stat('Volume 24 h', fmtBig(q.volume) + ' ' + cfg.fiat) : stat('Fecho anterior', fmtPx(q.prevClose, a, q.currency))}
                ${a.kind === 'crypto' ? stat('Variação 24 h', fmtPct(q.changePct)) : stat('Volume', fmtBig(q.volume))}
                ${fin(q.high52) ? stat('Máx. 52 sem.', fmtPx(q.high52, a, q.currency)) + stat('Mín. 52 sem.', fmtPx(q.low52, a, q.currency)) : ''}
                ${r ? stat('RSI (14)', fin(r.metrics.rsi) ? Math.round(r.metrics.rsi) : '—') + stat('Volatilidade', fin(r.metrics.vol) ? Math.round(r.metrics.vol * 100) + '%/ano' : '—') : ''}
            </div>
            ${cl ? '' : techBox(k)}
            ${a.kind === 'energy' || k === 'GC=F' ? '<p class="note" style="margin:-4px 2px 14px">Contrato de futuros (referência). Na Trade Republic não se compra diretamente; existem ETC, com custos de rolagem a prazo.</p>' : ''}
            ${levelsBox(k, q)}
            ${cl ? '' : discountBox(k, q)}
            ${taxBox(k)}
            <div class="box"><h3>Notícias</h3>
                ${!cfg.proxy ? '<div class="note">Liga o conector para ver notícias.</div>' : !n ? '<div class="note">A procurar notícias…</div>' : !n.items.length ? '<div class="note">Sem notícias nos últimos 3 dias.</div>'
                : `<ul class="news">${n.items.map((it) => `<li><a href="${esc(safeUrl(it.link))}" target="_blank" rel="noopener noreferrer">${it.tone ? `<span class="tone ${it.tone.tone}">${esc(it.tone.label)}</span>` : ''}${esc(it.title)}</a>
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
            st.chartHover = now();
            drawSheetChart(best);
        };
        cv.addEventListener('pointermove', at);
        cv.addEventListener('pointerdown', at);
        cv.addEventListener('pointerleave', () => { st.chartHover = 0; drawSheetChart(); });
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
        st.lastRefresh = now();
        return Promise.all([pollYahoo(), loadCryptoSeries(), ws ? null : cryptoREST(), cfg.tab === 'destaques' ? loadMovers() : null, loadClaude()])
            .finally(() => scheduleRender());
    }
    // puxar para baixo no topo da página → atualizar (como nas apps do iPhone)
    (() => {
        const ptr = $('#mk-ptr'), body = $('#mk-body'), TH = 70;
        let y0 = null, x0 = 0, dy = 0, busy = false;
        const set = (h, txt) => { if (!ptr) return; ptr.style.height = h + 'px'; ptr.firstChild.textContent = txt; body.style.transform = h ? `translateY(${h}px)` : ''; };
        document.addEventListener('touchstart', (e) => {
            if (busy || window.scrollY > 0 || !$('#mk-sheet').hidden || e.target.closest('input, select')) { y0 = null; return; }
            y0 = e.touches[0].clientY; x0 = e.touches[0].clientX; dy = 0;
        }, { passive: true });
        document.addEventListener('touchmove', (e) => {
            if (y0 == null) return;
            const my = e.touches[0].clientY - y0, mx = e.touches[0].clientX - x0;
            if (my <= 0 || Math.abs(mx) > my) { if (st.pulling) { st.pulling = false; set(0, ''); } return; }
            st.pulling = true; dy = Math.min(120, my * 0.5);
            body.style.transition = 'none'; ptr.style.transition = 'none';
            set(dy, dy > TH * 0.7 ? 'Larga para atualizar' : 'Puxa para atualizar');
        }, { passive: true });
        document.addEventListener('touchend', () => {
            if (y0 == null) return;
            y0 = null;
            if (!st.pulling) return;
            body.style.transition = ''; ptr.style.transition = '';
            if (dy > TH * 0.7) {
                busy = true; set(44, 'A atualizar…');
                refreshAll().finally(() => { busy = false; st.pulling = false; set(0, ''); scheduleRender(); });
            } else { st.pulling = false; set(0, ''); }
        }, { passive: true });
    })();

    function watchChanged() {
        cfg.jLast = '';
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
        const t = ev.target.closest('[data-act],[data-open],[data-tab],[data-sort],[data-range],[data-fiat],[data-filter],[data-lim],[data-rm],[data-add],[data-eur],[data-hz],[data-prof],[data-sday],[data-strat],[data-cpct],[data-cmix],[data-hold],[data-lotrm],[data-fs],[data-others],[data-claude],[data-hide],[data-unhide],[data-per],[data-fuel],[data-mv]');
        if (!t) return;
        const d = t.dataset;
        if (d.tab) { cfg.tab = d.tab; saveCfg(); window.scrollTo(0, 0); if (d.tab === 'destaques' && !MOVERS) loadMovers(); render(); return; }
        if (d.open) { openSheet(d.open, d.name, d.ut); return; }
        if (d.claude) { setClaude(d.claude === '1'); return; }
        if (d.others) {
            const on = d.others === '1';
            pxPost('/owner', { id: cfg.jid, others: on }).then(() => { st.others = on; STATS = { ...(STATS || {}), others: on }; toast(on ? 'Análise do Claude ligada para as outras apps' : 'Análise do Claude desligada para as outras apps'); render(); }).catch((e) => toast('Não deu: ' + e.message));
            return;
        }
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
        if (d.mv) {
            const arr = cfg.watch.includes(d.mv) ? cfg.watch : cfg.funds, i = arr.indexOf(d.mv);
            moveTo(arr, i, d.dir === 'top' ? 0 : i + (+d.dir));
            return;
        }
        if (d.fuel) { openFuelSheet(+d.fuel); return; }
        if (d.per) { cfg.per = d.per; saveCfg(); render(); return; }
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
            case 'uni-more': st.uniN = (st.uniN || 25) + 50; render(); break;
            case 'share-link': {
                const l = shareLink();
                (navigator.clipboard ? navigator.clipboard.writeText(l) : Promise.reject()).then(() => toast('Link copiado')).catch(() => { const i = $('#f-share'); if (i) { i.select(); toast('Copia o link selecionado'); } });
                break;
            }
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
                cfg.jid = v; cfg.jLast = ''; saveCfg(); JOURNAL = null; st.meAt = 0; toast('Diário recuperado'); loadJournal(); loadClaude(); render(); break;
            }
            case 'reset-watch': cfg.watch = DEFAULT_WATCH.slice(); cfg.funds = DEFAULT_FUNDS.slice(); watchChanged(); break;
            // Carteira: valor no futuro ou em euros de hoje; − e + nos controlos do simulador
            case 'sim-hoje': cfg.simHoje = t.dataset.v === '1'; saveCfg(); render(); break;
            case 'sim-step': {
                const k = t.dataset.k, rg = t.parentElement && t.parentElement.querySelector('.sim-rg');
                const v = (+cfg[k] || 0) + (+t.dataset.d || 0), mn = rg ? +rg.min : 0;
                cfg[k] = k === 'simYears' ? Math.min(60, Math.max(1, Math.round(v || 20))) : Math.max(mn, v);
                saveCfg(); render(); break;
            }
        }
    });

    // Carteira: o dedo no gráfico do simulador mostra o ano por baixo dele (o texto vem feito da Onda, em data-tx)
    function simDedo(ev) {
        const g = ev.target.closest && ev.target.closest('svg.sim-g');
        if (!g) return;
        const pt = g.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
        const m = g.getScreenCTM(); if (!m) return;
        const x = pt.matrixTransform(m.inverse()).x;
        let best = null, bd = Infinity;
        for (const r of g.querySelectorAll('.sim-hit')) { const d = Math.abs(+r.dataset.x - x); if (d < bd) { bd = d; best = r; } }
        if (!best) return;
        const c = g.querySelector('.sim-cur'); c.setAttribute('x1', best.dataset.x); c.setAttribute('x2', best.dataset.x);
        const sec = g.closest('section'), tip = sec && sec.querySelector('.sim-tip'); if (tip) { tip.textContent = best.dataset.tx; tip.classList.add('on'); }
    }
    document.addEventListener('pointerdown', simDedo);
    document.addEventListener('pointermove', (ev) => { if (ev.buttons || ev.pointerType !== 'touch') simDedo(ev); });
    document.addEventListener('change', (ev) => {
        const t = ev.target;
        if (t.dataset && t.dataset.lot && t.dataset.k && REG[t.dataset.k]) {
            const k = t.dataset.k, L = { ...lotOf(k) };
            const data = /^\d{4}-\d\d-\d\d$/.test(t.value) && t.value <= todayLocal() ? t.value : '';
            if (t.dataset.lot === 'plan') L.plan = data;
            else if (t.dataset.lot === 'qd') L.qd = data || undefined;
            else L[t.dataset.lot === 'pm' ? 'pm' : t.dataset.lot === 'qty' ? 'qty' : 'cost'] = Math.max(0, +t.value || 0) || undefined;
            setLots(k, L); return;
        }
        if (t.dataset && t.dataset.cfg) {
            cfg[t.dataset.cfg] = ['alertPct', 'budget', 'simStart', 'simGoal'].includes(t.dataset.cfg) ? Math.max(0, +t.value || 0) : t.dataset.cfg === 'simYears' ? Math.min(60, Math.max(1, Math.round(+t.value || 20))) : t.value;
            saveCfg();
            if (t.dataset.cfg === 'distrito') { cfg.municipio = ''; saveCfg(); FUEL = null; loadFuel(); render(); }
            if (t.dataset.cfg === 'municipio') { FUEL = null; loadFuel(); }
            t.blur(); render();
        }
    });
    document.addEventListener('input', (ev) => {
        // a barra do simulador: o número muda enquanto se arrasta; grava e redesenha ao largar (change)
        if (ev.target.classList && ev.target.classList.contains('sim-rg')) {
            const t = ev.target, v = +t.value, o = document.querySelector(`[data-out="${t.dataset.cfg}"]`);
            if (o) o.textContent = t.dataset.fmt === '1' ? `${v} ${v === 1 ? 'ano' : 'anos'}` : t.dataset.fmt === '2' && v <= 0 ? 'sem objetivo' : fmtPx(v, { decimals: 0 }, 'EUR');
        }
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
    if (window.GraficoOnda) GraficoOnda.pronto.then(() => { if (sheetKey) drawSheetChart(); }, () => {});
    // lembra na sessão o que abriste ou fechaste (para não mudar a cada atualização)
    document.addEventListener('toggle', (ev) => { const f = ev.target.dataset && ev.target.dataset.fold; if (f) st.fold[f] = ev.target.open; if (ev.target.open && ev.target.querySelector && ev.target.querySelector('canvas.spark')) drawSparks(); }, true);
    // o toque fica registado logo (o evento "toggle" chega depois e perde-se se os preços ao vivo redesenharem o ecrã antes)
    document.addEventListener('click', (ev) => { const sm = ev.target.closest && ev.target.closest('details[data-fold] > summary'); if (!sm) return; st.fold[sm.parentElement.dataset.fold] = !sm.parentElement.open; }, true);

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
    // ---------- ordenar a lista que sigo: arrastar pela pega ≡ (ou ⤒ para o topo) ----------
    function moveTo(arr, i, j) {
        if (i < 0 || j < 0 || j >= arr.length || i === j) return;
        arr.splice(j, 0, arr.splice(i, 1)[0]);
        if (cfg.sort !== 'mine') { cfg.sort = 'mine'; toast('Ordem das ações: a tua'); }
        saveCfg(); render();
    }
    (() => {
        let dr = null;
        const fim = (ok) => {
            if (!dr) return;
            const { arr, from, to, rows } = dr;
            rows.forEach((r) => { r.style.transform = ''; r.classList.remove('drag', 'shift'); });
            dr = null; st.touching = false;
            if (ok && to !== from) moveTo(arr, from, to);
            else if (st.renderLater) { st.renderLater = false; scheduleRender(); }
        };
        document.addEventListener('pointerdown', (e) => {
            const h = e.target.closest && e.target.closest('.wl-h');
            if (!h) return;
            const row = h.closest('.wl-i'), g = row.dataset.grp;
            const rows = $$(`.wl-i[data-grp="${g}"]`), from = rows.indexOf(row);
            if (from < 0) return;
            e.preventDefault();
            const sy = window.scrollY;
            dr = { arr: g === 'f' ? cfg.funds : cfg.watch, rows, from, to: from, y0: e.clientY, sy, id: e.pointerId,
                mids: rows.map((r) => { const b = r.getBoundingClientRect(); return b.top + sy + b.height / 2; }), hgt: row.getBoundingClientRect().height };
            st.touching = true;
            row.classList.add('drag');
            rows.forEach((r) => { if (r !== row) r.classList.add('shift'); });
            try { h.setPointerCapture(e.pointerId); } catch { /* sem captura */ }
        });
        document.addEventListener('pointermove', (e) => {
            if (!dr || e.pointerId !== dr.id) return;
            e.preventDefault();
            // perto das margens a página desliza, para se poder levar a linha longe
            if (e.clientY < 90) window.scrollBy(0, -14); else if (e.clientY > window.innerHeight - 140) window.scrollBy(0, 14);
            const dy = e.clientY - dr.y0 + (window.scrollY - dr.sy);
            const { rows, from, mids, hgt } = dr;
            rows[from].style.transform = `translateY(${dy}px)`;
            const mid = mids[from] + dy;
            let to = 0;
            mids.forEach((m, i) => { if (i !== from && m < mid) to++; });
            dr.to = to;
            rows.forEach((r, i) => {
                if (i === from) return;
                const sh = from < to && i > from && i <= to ? -hgt : from > to && i >= to && i < from ? hgt : 0;
                r.style.transform = sh ? `translateY(${sh}px)` : '';
            });
        }, { passive: false });
        document.addEventListener('pointerup', (e) => { if (dr && e.pointerId === dr.id) fim(true); });
        document.addEventListener('pointercancel', (e) => { if (dr && e.pointerId === dr.id) fim(false); });
    })();

    async function boot() {
        // como a Música: ao abrir outra vez, começa no topo (o iOS repunha o scroll e o título ficava por baixo das horas)
        if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
        if (AO) AO.ready.then(() => { aoOk = true; analyseAll(); scheduleRender(); }).catch((e) => { aoFalhou = true; scheduleRender(); console.error('motor Onda:', e); });
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
    window.__mk = { cfg, Q, D, AN, NEWS, st, REG, render, analyseAll, checkAlerts, mergeDay, PS, version: VERSION, get journal() { return JOURNAL; }, get bt() { return BT; },
        // a paridade dos Ajustes (JS e Onda, mesmo HTML): as duas vistas, o instantâneo e o estado que leem
        viewSettings, settingsSnap, settingsHtml, MUNIC, get distritos() { return DISTRITOS; }, set distritos(v) { DISTRITOS = v; }, get stats() { return STATS; }, set stats(v) { STATS = v; },
        // a Análise (só em Onda: o instantâneo e o desenho), o ícone das linhas e a formatação dos números (os das vistas
        // em Onda são testados contra estes)
        analysisSnap, analysisHtml, ico, fmtPx, fmtPct, fmtPct1, set journal(v) { JOURNAL = v; }, set bt(v) { BT = v; },
        get claude() { return CLAUDE; }, set claude(v) { CLAUDE = v; }, get uni() { return UNI; }, set uni(v) { UNI = v; },
        // os Destaques (só em Onda): o instantâneo, o desenho, o compacto dos números e o que eles leem da rede
        highlightsSnap, highlightsHtml, fmtBig, get movers() { return MOVERS; }, set movers(v) { MOVERS = v; }, get cg() { return CG; }, set cg(v) { CG = v; },
        // o Painel (só em Onda): o instantâneo, o desenho e o que ele lê já feito (a variação no período, o conselho do Claude
        // de cada ativo, o imposto da cripto), e o estado dos combustíveis
        panelSnap, panelHtml, perData, claudeFor, taxLine, get fuel() { return FUEL; }, set fuel(v) { FUEL = v; } };
    boot();
})();
