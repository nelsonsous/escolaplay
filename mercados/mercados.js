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
        decisao: (d) => (aoOk ? AO.decisao(d) : null),
    };
    const VERSION = '4.51.1';
    // as decisões dos gestos (que gesto é, quanto segue o dedo, se se confirma) são do motor comum às apps, em Onda
    const OG = window.OndaGestos || null;

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
        // os futuros negoceiam quase 24 h: antes de as bolsas abrirem já dizem para onde vão (e a estimativa da abertura usa-os)
        { sym: 'ES=F', name: 'Futuros S&P 500', points: true },
        { sym: 'NQ=F', name: 'Futuros Nasdaq', points: true },
        { sym: 'NIY=F', name: 'Futuros Nikkei', points: true },
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
    // depois do fecho da Xetra (17:30), o preço vem da bolsa alemã com o negócio mais recente: Munique (gettex) ou Düsseldorf,
    // abertas até às 22 h (a TR negoceia até às 23 h na Lang & Schwarz, que o Yahoo não tem)
    const LIVE = { 'VWCE.DE': ['VWCE.MU', 'VWCE.DU'], 'EUNL.DE': ['EUNL.MU', 'EUNL.DU'], 'SXR8.DE': ['SXR8.MU', 'SXR8.DU'], 'SXRV.DE': ['SXRV.MU', 'SXRV.DU'], 'IS3N.DE': ['IS3N.MU', 'IS3N.DU'] };
    const VENUE = { MU: 'Munique (gettex)', DU: 'Düsseldorf' };
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

    // os gémeos dos fundos da Xetra: o mesmo índice em Nova Iorque (ou, no ouro, os futuros), que negoceia quando cá está fechado
    const TWIN = { 'VWCE.DE': 'VT', 'EUNL.DE': 'URTH', 'SXR8.DE': 'IVV', 'SXRV.DE': 'QQQ', 'IS3N.DE': 'IEMG', 'EXSA.DE': 'VGK', '4GLD.DE': 'GC=F' };
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
        for (const a of Object.values(REG)) for (const s of [].concat(a.live || [])) if (!REG[s]) REG[s] = { key: s, kind: 'aux', sym: s, name: s };
        for (const c of fxNeeded) { const k = 'EUR' + c + '=X'; if (!REG[k]) REG[k] = { key: k, kind: 'aux', sym: k, name: k }; }
        // a estimativa da abertura: o Nikkei (a sensibilidade) e os gémeos dos fundos que sigo (VT, …)
        for (const k of ['^N225', ...cfg.funds.map((f) => TWIN[f]).filter(Boolean)]) if (!REG[k]) REG[k] = { key: k, kind: 'aux', sym: k, name: k };
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
    const EXT = {};     // chave → o preço antes da abertura ou depois do fecho (ações dos EUA, pelo /ext do conector 1.13.0)
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
        if (s && s.D && typeof s.D === 'object') for (const [k, v] of Object.entries(s.D)) if (Array.isArray(v) && v.length > 1) D[k] = v;
        st.snapLH = s && s.LH && typeof s.LH === 'object' ? s.LH : null; // o histórico longo e as séries do período (repostos mais abaixo)
        st.snapPS = s && s.PS && typeof s.PS === 'object' ? s.PS : null;
    }
    let snapT = 0;
    function saveSnap() {
        if (now() - snapT < 15000) return;
        snapT = now();
        const q = {};
        for (const [k, v] of Object.entries(Q)) if (REG[k] && !REG[k].temp) q[k] = { ...v, series: (v.series || []).slice(-120), stale: undefined };
        // e o ano de fechos diários do que tenho (e do S&P 500): a análise dos meus ativos aparece logo ao abrir
        const dk = [...new Set(cfg.holdings.concat(cfg.coreFund, '^GSPC'))].filter((k) => D[k] && D[k].length > 1);
        // o histórico longo (5 anos, para as contas da carteira) e as séries do período (a linha do cartão) do que tenho
        const lk = dk.filter((k) => LH[k] && LH[k].length > 1), per = (p) => Object.fromEntries(dk.filter((k) => PS[p][k]).map((k) => [k, PS[p][k]]));
        store.set(SNAP, { Q: q, FUEL, yahooAt: st.yahooAt, D: Object.fromEntries(dk.map((k) => [k, D[k]])),
            LH: Object.fromEntries(lk.map((k) => [k, { at: lhAt[k] || 0, v: LH[k] }])), PS: { '1w': per('1w'), '1m': per('1m') } });
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
    // o negócio mais recente das outras bolsas alemãs do fundo (na mesma moeda), com o símbolo
    function liveOf(k) {
        const a = REG[k], q0 = Q[k];
        let best = null;
        if (a && q0) for (const s of [].concat(a.live || [])) {
            const q = Q[s];
            if (q && fin(q.price) && (q.currency || q0.currency) === q0.currency && (!best || (q.time || 0) > (best.time || 0))) best = { ...q, sym: s };
        }
        return best;
    }
    function qv(k) {
        const q0 = Q[k];
        const a = REG[k];
        if (!q0 || !a || !isHolding(k) || a.temp) return q0 || {};
        let q = q0;
        const lv = liveOf(k);
        if (lv && (lv.time || 0) > (q0.time || 0)) {
            const series = mergeDay(q0.series, lv.series);
            if (lv.time && (!series.length || series[series.length - 1][0] < lv.time)) series.push([lv.time, lv.price]);
            // a variação do dia é face ao fecho da véspera na Xetra: o «fecho anterior» que o Yahoo dá para Munique e
            // Düsseldorf é muitas vezes um negócio solto (ex.: 168,44 € em Munique com a Xetra a fechar a 167,42 €)
            const pcl = fin(q0.prevClose) ? q0.prevClose : lv.prevClose;
            q = { ...q0, price: lv.price, time: lv.time, open: lv.open, series, venue: VENUE[lv.sym.split('.').pop()] || lv.sym, prevClose: pcl,
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

    // ---------- fora de horas: antes da abertura, depois do fecho e a estimativa para a abertura ----------
    // As ações dos EUA negoceiam antes da abertura (9:00–14:30 em Lisboa) e depois do fecho (21:00–1:00): o conector dá esses
    // preços à parte (/ext). Com a bolsa fechada e sem eles, a estimativa para a abertura:
    //  1. o gémeo, se o ativo tem um (o FTSE All-World: o VT, o mesmo índice em Nova Iorque): o que ele fez desde o último
    //     preço de cá até ao último negócio dele (até à 1:00 de Lisboa), em euros (com o EUR/USD);
    //  2. depois, os futuros do S&P 500 e do Nikkei (quase 24 h), vezes a sensibilidade do ativo a cada um;
    //  3. corrigida pelo que falhou nas aberturas anteriores (guardado neste aparelho). A margem é o erro médio dessas
    //     aberturas; até haver 5 do ativo, a que a história dele dá.
    const usKey = (k) => isHolding(k) && /^[A-Z][A-Z0-9-]{0,6}$/.test(k);
    const twinOf = (k) => (TWIN[k] && REG[TWIN[k]] ? TWIN[k] : null);
    const twinTxt = (s) => (s === 'GC=F' ? 'Futuros do ouro' : `${s} (o mesmo índice, em Nova Iorque)`);
    function extOf(k) {
        const e = EXT[k], q = Q[k];
        if (!e || !q || q.open === true || now() / 1000 - e.time > 4 * 86400) return null;
        const s = q.series, tr = s && s.length ? s[s.length - 1][0] : q.time || 0; // o último negócio da sessão normal
        return e.time > tr ? e : null;
    }
    let extAt = 0;
    const S5 = {};      // símbolo → os últimos 5 dias de 30 em 30 min (os futuros, o EUR/USD e os gémeos): o preço a uma hora T
    async function loadExt(force) {
        loadDerivs();
        if (!cfg.proxy || document.hidden || (!force && now() - extAt < 110000)) return;
        extAt = now();
        const tw = [...new Set(cfg.funds.map(twinOf).filter(Boolean))], US = /^[A-Z][A-Z0-9-]{0,6}$/;
        const keys = [...new Set(Object.keys(REG).filter((k) => listed(k) && usKey(k)).concat(tw.filter((s) => US.test(s))))];
        const jobs = [px(`/quotes?symbols=${encodeURIComponent(['ES=F', 'NIY=F', 'EURUSD=X', ...tw].join(','))}&range=5d`, 20000).then((r) => {
            for (const q of r.quotes || []) if (!q.error && q.series && q.series.length) S5[q.symbol] = q.series;
        }).catch(() => {})];
        for (let i = 0; i < keys.length; i += 40) jobs.push(px(`/ext?symbols=${encodeURIComponent(keys.slice(i, i + 40).join(','))}`, 30000).then((r) => {
            for (const it of r.items || []) {
                const k = keys.find((x) => x.toUpperCase() === String(it.symbol).toUpperCase());
                if (k && it.kind && fin(it.price) && fin(it.changePct)) EXT[k] = it; else if (k) delete EXT[k];
            }
        }).catch(() => {})); // o conector antes da 1.13.0 não tem o /ext: fica a estimativa
        await Promise.all(jobs);
        scheduleRender();
        if (sheetKey && !$('#mk-sheet').hidden) { renderSheetExt(); drawSheetChart(); }
    }
    // o preço de um símbolo à hora T (o último negócio antes, até 4 dias: os fins de semana) e o último que há, dos 5 dias,
    // do dia e do fora de horas
    const ptsOf = (s) => [].concat(S5[s] || [], (Q[s] && Q[s].series) || [], (EXT[s] && EXT[s].series) || []);
    function pxAt(s, T) {
        let best = null;
        for (const p of ptsOf(s)) if (p[0] <= T && (!best || p[0] > best[0])) best = p;
        return best && T - best[0] < 4 * 86400 ? best : null;
    }
    function pxNow(s) {
        let best = Q[s] && fin(Q[s].price) && Q[s].time ? [Q[s].time, Q[s].price] : null;
        for (const p of ptsOf(s)) if (!best || p[0] > best[0]) best = p;
        return best;
    }
    // mínimos quadrados com constante (as colunas centradas, Gauss com pivô): os coeficientes e o desvio dos resíduos
    function ols(y, X) {
        const n = y.length, k = X.length, mean = (v) => v.reduce((s, x) => s + x, 0) / n, my = mean(y), mx = X.map(mean);
        const A = X.map((xi, i) => X.map((xj, j) => { let s = 0; for (let t = 0; t < n; t++) s += (xi[t] - mx[i]) * (xj[t] - mx[j]); return s; }));
        const c = X.map((xi, i) => { let s = 0; for (let t = 0; t < n; t++) s += (xi[t] - mx[i]) * (y[t] - my); return s; });
        for (let col = 0; col < k; col++) {
            let pv = col;
            for (let r = col + 1; r < k; r++) if (Math.abs(A[r][col]) > Math.abs(A[pv][col])) pv = r;
            if (Math.abs(A[pv][col]) < 1e-14) return null;
            [A[col], A[pv]] = [A[pv], A[col]]; [c[col], c[pv]] = [c[pv], c[col]];
            for (let r = 0; r < k; r++) if (r !== col) { const f = A[r][col] / A[col][col]; for (let j = col; j < k; j++) A[r][j] -= f * A[col][j]; c[r] -= f * c[col]; }
        }
        const b = c.map((v, i) => v / A[i][i]);
        let ss = 0;
        for (let t = 0; t < n; t++) { let r = y[t] - my; for (let i = 0; i < k; i++) r -= b[i] * (X[i][t] - mx[i]); ss += r * r; }
        return { b, sd: Math.sqrt(ss / Math.max(1, n - k - 1)) };
    }
    // a sensibilidade ao S&P 500 e ao Nikkei: a regressão dos retornos diários dos últimos 120 dias (e o desvio do que ela
    // não explica). Fora dos EUA a bolsa fecha antes de Nova Iorque e o que lá se passa depois só se vê no dia seguinte:
    // conta também o dia anterior do S&P 500 (o beta de Dimson). O Nikkei é o do mesmo dia (Tóquio fecha antes de cá abrir).
    const BETA = {};
    function betaOf(k) {
        const d = D[k], e = D['^GSPC'], nk = D['^N225'] && D['^N225'].length >= 60 ? D['^N225'] : null;
        if (!d || !e || d.length < 60 || e.length < 60) return null;
        const key = d.length + '|' + d[d.length - 1][0] + '|' + e[e.length - 1][0] + '|' + (nk ? nk[nk.length - 1][0] : 0);
        if (BETA[k] && BETA[k].key === key) return BETA[k].us == null ? null : BETA[k];
        const day = (t) => new Date(t * 1000).toISOString().slice(0, 10), ix = (s) => new Map(s.map((p, i) => [day(p[0]), i]));
        const ei = ix(e), ni = nk ? ix(nk) : null, lag = !usKey(k);
        const y = [], x0 = [], x1 = [], x2 = [];
        for (let i = 1; i < d.length; i++) {
            const j = ei.get(day(d[i][0])), jp = ei.get(day(d[i - 1][0]));
            if (j == null || jp == null || jp < 1 || j <= jp || !(d[i - 1][1] > 0)) continue;
            if (ni) { const m = ni.get(day(d[i][0])), mp = ni.get(day(d[i - 1][0])); if (m == null || mp == null || m <= mp) continue; x2.push(nk[m][1] / nk[mp][1] - 1); }
            y.push(d[i][1] / d[i - 1][1] - 1); x0.push(e[j][1] / e[jp][1] - 1); x1.push(e[jp][1] / e[jp - 1][1] - 1);
        }
        const n = Math.min(120, y.length), sl = (v) => v.slice(-n);
        const X = [sl(x0)].concat(lag ? [sl(x1)] : [], ni ? [sl(x2)] : []);
        const r = n >= 40 ? ols(sl(y), X) : null;
        if (!r) { BETA[k] = { key, us: null }; return null; }
        const lim = (v, a, b) => Math.max(a, Math.min(b, v));
        return (BETA[k] = { key, us: lim(r.b[0] + (lag ? r.b[1] : 0), 0, 3), jp: ni ? lim(r.b[X.length - 1], -0.5, 1.5) : 0, sd: r.sd * 100, n });
    }
    // o que aprende: cada estimativa feita antes de uma abertura fica à espera (pend) do primeiro preço da sessão seguinte;
    // as últimas 80 (done: estimado p, aconteceu a) dão a correção (a regressão sem constante, de 0,3 a 1,6 vezes) e o erro
    const PJ_LS = 'mercados:aberturas';
    let PJ = null;
    function pjLoad() {
        if (!PJ) { try { PJ = JSON.parse(localStorage.getItem(PJ_LS)) || {}; } catch { PJ = {}; } }
        if (!PJ.pend || typeof PJ.pend !== 'object') PJ.pend = {};
        if (!Array.isArray(PJ.done)) PJ.done = [];
        return PJ;
    }
    const pjSave = () => { try { localStorage.setItem(PJ_LS, JSON.stringify(PJ)); } catch { /* sem armazenamento */ } };
    function pjFactor() {
        const d = pjLoad().done;
        if (d.length < 8) return 1;
        let sap = 0, spp = 0;
        for (const x of d) { sap += x.a * x.p; spp += x.p * x.p; }
        return spp > 0 ? Math.max(0.3, Math.min(1.6, sap / spp)) : 1;
    }
    function projOf(k) {
        if (!isHolding(k) || extOf(k)) return null;
        const q = qv(k), T = q.time;
        if (!fin(q.price) || !T || q.open === true || now() / 1000 - T < 15 * 60) return null;
        const b = betaOf(k);
        if (!b) return null;
        // 1. o gémeo, do último preço de cá até ao último negócio dele (em euros: com o EUR/USD de cada hora)
        let tw = null;
        const s = twinOf(k);
        if (s) {
            const a0 = pxAt(s, T), a1 = pxNow(s);
            if (a0 && a1 && a1[0] - T >= 10 * 60) {
                let m = a1[1] / a0[1];
                if (((Q[k] && Q[k].currency) || 'EUR') === 'EUR' && Q[s] && Q[s].currency === 'USD') {
                    const f0 = pxAt('EURUSD=X', T), f1 = pxAt('EURUSD=X', a1[0]);
                    if (f0 && f1) m *= f0[1] / f1[1];
                }
                tw = { s, pct: (m - 1) * 100, t1: a1[0] };
            }
        }
        // 2. depois, os futuros do S&P 500 e do Nikkei
        const from = tw ? tw.t1 : T;
        const mv = (sym) => { const a = pxAt(sym, from), z = pxNow(sym); return a && z && z[0] - from >= 30 * 60 ? (z[1] / a[1] - 1) * 100 : null; };
        const fes = mv('ES=F'), fnk = mv('NIY=F');
        if (!tw && fes == null) return null;
        const raw = (tw ? tw.pct : 0) + b.us * (fes || 0) + b.jp * (fnk || 0), fac = pjFactor();
        const mine = pjLoad().done.filter((x) => x.k === k);
        const err = mine.length >= 5 ? mine.reduce((sm, x) => sm + Math.abs(x.a - fac * x.p), 0) / mine.length : null;
        return { p: raw * fac, raw, tw, fes, fnk, us: b.us, jp: b.jp, fac, err, band: err ?? (tw ? 0.35 : 0.5) * b.sd, n: mine.length, T, base: q.price };
    }
    function pjNote(k, pr) {
        const P = pjLoad(), o = P.pend[k], t = Math.floor(now() / 1000);
        if (o && o.T === pr.T && t - o.at < 600) return;
        P.pend[k] = { T: pr.T, base: pr.base, p: +pr.raw.toFixed(3), at: t };
        pjSave();
    }
    // a abertura chegou: o primeiro preço da sessão nova face ao último antes da estimativa (só conta a estimativa vista
    // nas 20 h antes de abrir)
    function pjResolve() {
        const P = pjLoad(), t = now() / 1000;
        let mud = false;
        for (const k of Object.keys(P.pend)) {
            const o = P.pend[k], s = REG[k] ? qv(k).series : null, p0 = s && s.find((x) => x[0] > o.T + 1800);
            if (!p0 && t - o.at < 5 * 86400) continue;
            if (p0 && fin(p0[1]) && o.base > 0 && p0[0] - o.at < 20 * 3600 && p0[0] - o.T < 4 * 86400) P.done.push({ k, p: o.p, a: +((p0[1] / o.base - 1) * 100).toFixed(3), d: p0[0] });
            delete P.pend[k]; mud = true;
        }
        if (mud) { P.done = P.done.slice(-80); pjSave(); }
    }
    // a etiqueta da linha (no lugar da hora do último preço): antes da abertura / depois do fecho, a estimativa, ou a hora
    function pxTag(k, q) {
        const tt = (v) => (Math.abs(v) < 0.05 ? '' : v > 0 ? 'up' : 'down');
        const e = extOf(k);
        if (e) return { t: `${e.kind === 'pre' ? 'pré' : 'pós'} ${fmtPct1(e.changePct)}`, tt: tt(e.changePct) };
        const pr = projOf(k);
        if (pr) { pjNote(k, pr); return { t: `abre ≈ ${fmtPct1(pr.p)}`, tt: tt(pr.p) }; }
        return { t: pxWhen(k, q) };
    }

    // ---------- o intervalo provável e os derivados da cripto ----------
    let DERIV = null, derivAt = 0; // o /derivs do conector (1.14.0): moeda → { dvol, funding8h, basis: { days, pct, ann } }
    async function loadDerivs() {
        if (!cfg.proxy || document.hidden || now() - derivAt < 5 * 60000) return;
        derivAt = now();
        try {
            const r = await px('/derivs', 20000), o = {};
            for (const x of (r && r.items) || []) if (x && !x.error && x.c) o[x.c] = x;
            DERIV = o;
            if (sheetKey && !$('#mk-sheet').hidden) renderSheetExt();
        } catch { /* o conector antes da 1.14.0: sem os derivados */ }
    }
    // ---------- o PPR Evoluir da Fidelidade (4.47): os valores diários das duas componentes, pelo conector (/ppr) ----------
    // O teu PPR (desde, € por mês e % no Dinâmico: cfg.ppr) fica só aqui; do conector vêm só os valores públicos das unidades.
    const PPR_F = [['7614', 'Proteção', 0], ['7615', 'Dinâmico (ações)', 1]];
    let PPRD = null, pprVai = false, pprErr = '', pprTry = 0;
    try { PPRD = JSON.parse(localStorage.getItem('mk:ppr') || 'null'); } catch { PPRD = null; }
    const pprDe = () => (cfg.ppr && ISO_D.test(cfg.ppr.de || '') ? isoMais(cfg.ppr.de, -10) : '');
    async function loadPPR(force) {
        const de = pprDe();
        if (!cfg.proxy || !de || pprVai) return;
        if (PPRD && PPRD.f && PPRD.de <= de && now() - PPRD.at < 3 * 3600e3) return;
        // (depois de uma falha, só volta a tentar 5 min depois — salvo quando mudas o PPR: force)
        if (!force && now() - pprTry < 5 * 60e3) return;
        pprVai = true; pprTry = now();
        try {
            const r = await px(`/ppr?f=${PPR_F.map((x) => x[0]).join(',')}&de=${de}`, 20000), f = {};
            for (const [c] of PPR_F) { const x = r && r.f && r.f[c]; if (x && Array.isArray(x.d) && x.d.length) f[c] = x.d; }
            if (!Object.keys(f).length) throw new Error('sem valores');
            PPRD = { at: now(), de, f }; pprErr = '';
            try { localStorage.setItem('mk:ppr', JSON.stringify(PPRD)); } catch { /* sem espaço: fica só em memória */ }
        } catch { pprErr = 'Não consegui ler os valores da Fidelidade agora. Tenta mais tarde.'; }
        pprVai = false;
        if (cfg.tab === 'carteira') render();
    }
    // ---------- o Fundo Viva (Futuro, 4.51): o valor da UP de cada dia útil, pelo conector (/futuro) ----------
    // As tuas UP (cfg.fut.up) ficam só aqui; do conector vem o valor público da UP (o PDF da Futuro) e o histórico.
    const FUT_N = 'FUNDO VIVA';
    let FUTD = null, futVai = false, futErr = '', futTry = 0;
    try { FUTD = JSON.parse(localStorage.getItem('mk:fut') || 'null'); } catch { FUTD = null; }
    async function loadFUT(force) {
        if (!cfg.proxy || !(+(cfg.fut || {}).up > 0) || futVai) return;
        if (FUTD && Array.isArray(FUTD.d) && now() - FUTD.at < 3 * 3600e3) return;
        if (!force && now() - futTry < 5 * 60e3) return;
        futVai = true; futTry = now();
        try {
            const r = await px(`/futuro?f=${encodeURIComponent(FUT_N)}`, 25000), x = r && r.f && r.f[FUT_N];
            if (!x || !Array.isArray(x.d) || !x.d.length) throw new Error('sem valores');
            FUTD = { at: now(), dia: r.dia, d: x.d }; futErr = '';
            try { localStorage.setItem('mk:fut', JSON.stringify(FUTD)); } catch { /* sem espaço: fica só em memória */ }
        } catch { futErr = 'Não consegui ler os valores da Futuro agora. Tenta mais tarde.'; }
        futVai = false;
        if (cfg.tab === 'carteira') render();
    }
    // o desvio dos retornos diários (em log) dos últimos 120 dias
    function sdDaily(k) {
        const d = D[k];
        if (!d || d.length < 40) return null;
        const r = [];
        for (let i = Math.max(1, d.length - 120); i < d.length; i++) if (d[i - 1][1] > 0 && d[i][1] > 0) r.push(Math.log(d[i][1] / d[i - 1][1]));
        if (r.length < 30) return null;
        const m = r.reduce((s, v) => s + v, 0) / r.length;
        return Math.sqrt(r.reduce((s, v) => s + (v - m) ** 2, 0) / (r.length - 1));
    }
    const f2 = (v) => NF({ minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
    // a volatilidade ao ano que o mercado dá: a das opções (o DVOL da Deribit no Bitcoin e no Ether; nas ações e nos fundos,
    // o VIX — as opções do S&P 500 — vezes o quanto o ativo mexe face ao S&P 500) ou, sem elas, a dos últimos 120 dias
    function volOf(k) {
        const a = REG[k];
        if (!a || k === '^VIX') return null;
        const s = sdDaily(k);
        if (a.kind === 'crypto') {
            const dv = DERIV && DERIV[a.sym] && DERIV[a.sym].dvol;
            if (fin(dv) && dv > 0) return { v: dv, src: `das opções (Deribit): ${pct1(dv)} ao ano` };
            return s ? { v: s * Math.sqrt(365) * 100, src: `dos últimos 120 dias: ${pct1(s * Math.sqrt(365) * 100)} ao ano` } : null;
        }
        const sx = sdDaily('^GSPC'), vix = Q['^VIX'] && Q['^VIX'].price;
        if (s && sx && fin(vix) && vix > 0) return { v: vix * (s / sx), src: `das opções: o VIX ${NF({ maximumFractionDigits: 1 }).format(vix)} × ${f2(s / sx)} (o quanto mexe face ao S&P 500)` };
        return s ? { v: s * Math.sqrt(252) * 100, src: `dos últimos 120 dias: ${pct1(s * Math.sqrt(252) * 100)} ao ano` } : null;
    }
    // o intervalo provável (2 em cada 3 vezes: ±1 desvio, em log) para amanhã, 1 semana e 1 mês
    function rangeOf(k) {
        const q = qv(k), v = volOf(k);
        if (!v || !fin(q.price) || q.price <= 0) return null;
        const cr = REG[k].kind === 'crypto', B = cr ? 365 : 252;
        const H = cr ? [[1, 'amanhã'], [7, '1 semana'], [30, '1 mês']] : [[1, 'amanhã'], [5, '1 semana'], [21, '1 mês']];
        return { src: v.src, v: v.v, h: H.map(([d, l]) => { const sg = (v.v / 100) * Math.sqrt(d / B); return { l, lo: q.price * Math.exp(-sg), hi: q.price * Math.exp(sg) }; }) };
    }
    const pctF = (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + NF({ minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(Math.abs(v)) + '%';
    const pct1 = (v) => NF({ minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(v) + '%';
    // na ficha, por baixo do preço: fora de horas, a abertura estimada ou os derivados da cripto; e o intervalo provável
    function renderSheetExt() {
        const el = $('#d-ext'), rg = $('#d-rng'), k = sheetKey;
        if (!el || !k || !REG[k]) return;
        const a = REG[k], e = extOf(k), pr = !e ? projOf(k) : null, q = qv(k), dv = a.kind === 'crypto' && DERIV ? DERIV[a.sym] : null;
        const tn = (v) => `<span class="${toneOf(v)}-t">${fmtPct1(v)}</span>`;
        if (e) el.innerHTML = `${e.kind === 'pre' ? 'Antes da abertura' : 'Depois do fecho'}, às ${esc(hhmm(e.time))}: <b class="num">${fmtPx(e.price * (q.fx || 1), a, q.currency)}</b> ${tn(e.changePct)}`
            + `<small>face ao último fecho, ${fmtPx(e.ref * (q.fx || 1), a, q.currency)} (no gráfico de hoje, a linha mais clara)</small>`;
        else if (pr) {
            const ps = [];
            if (pr.tw) ps.push(`${twinTxt(pr.tw.s)}: ${fmtPct1(pr.tw.pct)} desde o último preço daqui, até às ${hhmm(pr.tw.t1)}${pr.tw.s === 'GC=F' ? '' : ' (em euros)'}`);
            if (pr.fes != null) ps.push(`${pr.tw ? 'depois, ' : ''}futuros do S&P 500 ${fmtPct1(pr.fes)} × ${f2(pr.us * pr.fac)}${pr.fnk != null && Math.abs(pr.jp) >= 0.005 ? ` e do Nikkei ${fmtPct1(pr.fnk)} × ${f2(pr.jp * pr.fac)}` : ''}`);
            ps.push(`${pr.fac !== 1 ? `corrigida com ${pjLoad().done.length} aberturas; ` : ''}${pr.err != null ? `erro médio nas últimas ${pr.n} aberturas: ±${pct1(pr.err)}` : 'margem pela história do ativo; aprende com cada abertura'}`);
            el.innerHTML = `Abertura estimada: ${tn(pr.p)} <span class="alt">(±${pct1(pr.band)})</span><small>${esc(ps.join(' · '))}</small>`;
        } else if (dv && (fin(dv.funding8h) || dv.basis)) {
            const ps = [];
            if (dv.basis) ps.push(`futuros a ${dv.basis.days} dias ${fmtPct1(dv.basis.pct)} sobre o preço à vista (${fmtPct1(dv.basis.ann)} ao ano)`);
            if (fin(dv.funding8h)) ps.push(`funding ${pctF(dv.funding8h)} por 8 h (${dv.funding8h > 0.002 ? 'mais alavancados a apostar na subida' : dv.funding8h < -0.002 ? 'mais alavancados a apostar na descida' : 'equilibrado'})`);
            el.innerHTML = `Derivados (Deribit)<small>${esc(ps.join(' · '))}</small>`;
        }
        el.hidden = !e && !pr && !(dv && (fin(dv.funding8h) || dv.basis));
        const x = rangeOf(k);
        if (rg) rg.hidden = !x;
        if (rg && x) rg.innerHTML = `Intervalo provável (2 em cada 3 vezes): ${x.h.map((h) => `${h.l} <b class="num">${fmtPx(h.lo, a, q.currency)}–${fmtPx(h.hi, a, q.currency)}</b>`).join(' · ')}`
            + `<small>pela volatilidade ${esc(x.src)}</small>`;
    }
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
            pjResolve();
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
        const yk = yahooKeys(), pri = [...new Set(cfg.holdings.concat(cfg.coreFund, '^GSPC'))].filter((k) => yk.includes(k));
        const guarda = (list) => { for (const q of list) if (!q.error && q.series && q.series.length) D[q.symbol] = q.series; };
        const vista = () => { analyseAll(); scheduleRender(); };
        const jobs = [loadCryptoDaily().then(vista)];
        // primeiro o que tenho (a análise dos meus ativos aparece logo), depois o resto
        if (cfg.proxy) jobs.push(quotesBatch(pri, '1y').then(guarda).catch(() => {}).then(vista).then(() => quotesBatch(yk.filter((k) => !pri.includes(k)), '1y')).then(guarda).catch(() => {}));
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
        // 4.28.0: e o total da Carteira em € (o conector guarda, só da app do dono, a evolução dia a dia no histórico)
        let carteira;
        try { const ch = carteiraHoje(); if (fin(ch.v) && ch.v > 0) carteira = { v: Math.round(ch.v * 100) / 100, cp: Math.round(ch.cp * 1000) / 1000 }; } catch { /* sem o total: o diário vai na mesma */ }
        try { await pxPost('/journal', { id: cfg.jid, date: day, items, lots: lotsEnvio(), plano: planoEnvio(), saveDays: cfg.saveDays, claude: !!cfg.claude, my: myList(), carteira }); cfg.jLast = day; saveCfg(); JOURNAL = null; } catch { /* tenta noutra altura */ }
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
    // as compras e os dias vão para o conector 4 s depois da última mudança (uma escrita, não uma por campo:
    // o KV grátis tem 1000 escritas por dia na conta toda)
    let lotsT = 0;
    function postLotsSoon() {
        clearTimeout(lotsT);
        lotsT = setTimeout(() => { if (cfg.proxy && cfg.jid) pxPost('/journal', { id: cfg.jid, lots: lotsEnvio(), plano: planoEnvio(), saveDays: cfg.saveDays }).catch(() => {}); }, 4000);
    }
    function setLots(k, L) {
        if (!L.plan && !(L.buys || []).length && !(+L.pm > 0) && !(+L.qty > 0) && !(+L.cost > 0) && !(+L.avg > 0) && !L.qd && !L.hz) delete cfg.lots[k]; else cfg.lots[k] = L;
        saveCfg();
        postLotsSoon();
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
            const ticket = Math.max(50, (budgetOf() || 900) * Math.max(0.05, (+cfg.cryptoPct || 10) / 100));
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
            st.naHora = !!m.naHora; // a análise faz-se quando se abre a app (conector com o gatilho do Claude)
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
        // a análise nova chegou: acabou a corrida pedida
        if (st.runAt && CLAUDE && Date.parse(CLAUDE.generatedAt || '') > st.runAt) st.runAt = null;
        scheduleRender();
        loadClaudeHistory();
        pedirAnalise('abrir');
    }
    // a análise na hora (conector 1.10.0): ao abrir a app, se a última tem 4 horas ou mais; ao puxar para atualizar,
    // 30 minutos ou mais. O conector tem os travões (uma corrida de cada vez, no máximo 6 por dia); aqui só se evita
    // perguntar à toa. Com a app aberta, vai ver se já acabou
    async function pedirAnalise(quando) {
        if (!cfg.owner || !st.naHora || !cfg.proxy || !claudeOn()) return;
        const g = CLAUDE && CLAUDE.generatedAt ? Date.parse(CLAUDE.generatedAt) : NaN;
        if (Number.isFinite(g) && now() - g < (quando === 'pedido' ? 30 : 240) * 60000) return;
        if (st.runAt && now() - st.runAt < 25 * 60000) return;
        try {
            const r = await pxPost(`/advice/run?id=${encodeURIComponent(cfg.jid)}`, { quando });
            if (!r || !r.naHora) return;
            st.runAt = Date.parse(r.pedidaEm) || now();
            toast('O Claude está a fazer a análise nova: fica pronta em poucos minutos.');
            for (const m of [6, 12, 20]) setTimeout(() => { if (st.runAt) { st.meAt = 0; loadClaude(); } }, m * 60000);
            scheduleRender();
        } catch { /* fica a de antes */ }
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
        // na hora: a próxima faz-se quando se abre a app (ou já vem a caminho)
        if (st.runAt) return `${made} · a nova vem a caminho (pedida às ${new Date(st.runAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })})`;
        if (st.naHora && cfg.owner) return `${made} · atualiza-se quando abres a app`;
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
        for (const n of ['up', 'down', 'flat', 'line', 'muted', 'text', 'accent', 'bg2']) COL[n] = cs.getPropertyValue('--' + n).trim();
        COL.theme = document.documentElement.dataset.theme || 'dark';
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
    // 4.41: o período dos meus ativos, à parte do do cartão da carteira
    // (4.46: nos ativos, 5A em vez de «Tudo» — desde a compra enganava: o FTSE eram 3 semanas)
    const perA = () => (cfg.perA === 'all' ? '5y' : cfg.perA || '1d');
    // 1S e 1M: as mesmas séries da ficha (de 30 min / 1 h; cripto 1 h / 4 h), para o gráfico pequeno e a % baterem certo
    const PS = { '1w': {}, '1m': {} }, psAt = { '1w': 0, '1m': 0 };
    async function loadPerSeries(per) {
        if (!PS[per] || now() - psAt[per] < 5 * 60 * 1000) return;
        psAt[per] = now();
        const range = per === '1w' ? '5d' : '1mo';
        const jobs = CRYPTO.map(async (c) => { try { PS[per]['c:' + c.id] = await klines(c.id, range); } catch { /* fica o diário */ } });
        if (cfg.proxy) jobs.push(quotesBatch(yahooKeys().filter(listed), range).then((list) => { for (const q of list) if (!q.error && q.series && q.series.length > 1) PS[per][q.symbol] = q.series; }).catch(() => {}));
        await Promise.all(jobs);
        drawSparks(); scheduleRender();
    }
    // 4.41: o período vem de quem pede — o cartão da carteira (cfg.per) ou os meus ativos (cfg.perA)
    function perData(k, per) {
        const q = qv(k);
        const days = PER_DAYS[per];
        const day = { pct: q.changePct, series: q.series, base: REG[k] && REG[k].kind === 'crypto' ? null : q.prevClose };
        // 4.39: «Tudo» — desde a 1.ª compra deste ativo (sem compras com data, desde o início da carteira; sem nenhuma, 1 ano);
        // 4.46: 5A — os últimos 5 anos (os ativos de baixo); os dois pelos fechos de 5 anos e do último ano, como na Carteira
        if (per === 'all' || per === '5y') {
            const b = buysOf(k), t0 = per === '5y' ? now() / 1000 - 5 * 365.25 * 86400 : b.length ? b[0][0] : pfInicio() || now() / 1000 - 365 * 86400;
            if (per === '5y' && !LH[k]) loadLong([k]);
            const w = LH[k] || [], d = D[k] || [], cut = d.length ? d[0][0] : Infinity;
            const h = w.filter((p) => p[0] < cut).concat(d).filter((p) => fin(p[1]) && p[1] > 0);
            if (h.length < 2 || !fin(q.price)) return day;
            const f = q.fx || 1;
            let i = h.findIndex((p) => p[0] > t0);
            if (i < 0) i = h.length;
            const ref = h[Math.max(0, i - 1)][1] * f, series = h.slice(Math.max(0, i - 1)).map(([t, v]) => [t, v * f]);
            const tq = q.time || now() / 1000;
            if (tq > series[series.length - 1][0]) series.push([tq, q.price]);
            return { pct: (q.price / ref - 1) * 100, series, base: ref };
        }
        const ps = PS[per] && PS[per][k];
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
    // ---------- a carteira no Painel (como na TR, mal se abre) ----------
    // as mesmas contas da Carteira (o cr_prep da Onda: as compras do plano, as avulsas e o que tem hoje): o valor de hoje, o
    // ganho face ao investido, o de hoje (ch, a variação de cada ativo) e o do período escolhido, e a linha do valor no
    // período (as unidades de hoje × o preço em cada instante: s, a série do período em euros). null sem nada na Carteira.
    // o início da carteira: a 1.ª compra com data (0 sem nenhuma) — onde começa o «Tudo»
    function pfInicio() {
        const ts = cfg.holdings.filter((k) => REG[k]).map((k) => buysOf(k)).filter((b) => b.length).map((b) => b[0][0]);
        return ts.length ? Math.min(...ts) : 0;
    }
    function pfSnap() {
        const keys = cfg.holdings.filter((k) => REG[k]), comp = keys.filter((k) => buysOf(k).length || temHoje(lotOf(k)));
        if (!comp.length) return null;
        loadLong(comp);
        const ti = pfInicio();
        return { now: now() / 1000, t0: ti, dl: ti ? dmy(new Date(ti * 1000).toISOString().slice(0, 10)) : '', ativos: keys.map((k) => {
            const P = posOf(k), q = qv(k), f = fxPara(q), pd = perData(k, cfg.per);
            // o nome curto (o símbolo na cripto; sem a moeda, o «(Acc)» e o «UCITS ETF» nos fundos)
            const nm = REG[k].kind === 'crypto' ? REG[k].sym : nameOf(k).replace(/\s*\(.*\)\s*$/, '').replace(/\s+(USD|EUR|UCITS|ETF|Acc|Dist)\b.*$/i, '').trim() || k;
            return { k, nm, cr: REG[k].kind === 'crypto', px: pxEur(k), h: buysOf(k).length ? histOf(k) : [], b: buysOf(k), q: P.q, cost: P.c, ch: q.changePct,
                s: (pd.series || []).filter((x) => fin(x[1])).map(([t, v]) => [t, v * f]) };
        }) };
    }
    // a carteira ao vivo: com os preços a mudar (a cripto a cada segundo), o cartão redesenha-se sozinho (pela Onda, no
    // máximo a cada 2 s), sem redesenhar o Painel todo
    let pfT = 0;
    // o cartão redesenhado já (sem o Painel todo), com os grupos da tabela abertos ou fechados como o utilizador os deixou
    function pfAgora() {
        const el = $('#mk-body > section.pf');
        if (!el || !aoOk || !AO.ecra || !AO.ecra.pf) return;
        try { const h = AO.ecra.pf({ pf: pfSnap(), per: cfg.per, foldPfc: !!st.fold['pf-cripto'], foldPff: !!st.fold['pf-fundos'] }).trim(); if (h) el.outerHTML = h; } catch (e) { console.error('ecrã Onda:', e); }
    }
    function pfSoon() {
        if (pfT) return;
        pfT = setTimeout(() => { pfT = 0; if (!st.touching) pfAgora(); }, 2000);
    }
    function drawSparks() {
        for (const pe of [cfg.per, perA()]) if (PS[pe]) loadPerSeries(pe);
        for (const cv of $$('canvas.spark')) {
            const k = cv.dataset.key;
            const p = perData(k, perA());
            if (!p.series || p.series.length < 2) continue;
            // poucos pontos: por ordem, para não desenhar retas longas
            drawLine(cv, p.series, { tone: toneOf(p.pct), base: p.base, pad: 3, width: 1.5, byIndex: perA() !== '1d' || p.series.length < 12 });
        }
    }

    // ---------- atualização ao vivo de um cartão ----------
    function patchLive(k, prev) {
        if (cfg.tab === 'painel' && cfg.holdings.includes(k) && $('#mk-body > section.pf')) pfSoon();
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
            if (c) { const pc = el.dataset.chg === 'day' ? q.changePct : perData(k, perA()).pct; c.className = 'chg ' + toneOf(pc); c.textContent = fmtPct(pc); }
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

    // os três modos das cores: o nome (no aviso) e o ícone do botão do Painel (desenhado: nítido, na cor do texto)
    const TEMA_NOME = { auto: 'automático (como o iPhone)', light: 'dia', dark: 'noite' };
    const TEMA_ICO = {
        auto: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path class="ch" d="M12 4a8 8 0 0 0 0 16z"/></svg>',
        light: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/></svg>',
        dark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>',
    };
    function render() {
        $$('#mk-nav button').forEach((b) => b.classList.toggle('on', b.dataset.tab === cfg.tab));
        const body = $('#mk-body');
        if (st.touching) { st.renderLater = true; return; }
        // não destruir o campo onde se está a escrever
        const act = document.activeElement;
        if (act && body.contains(act) && act.matches('input, select, textarea')) { renderStatus(); return; }
        if (st.pulling) return;
        const html = cfg.tab === 'destaques' ? highlightsHtml() : cfg.tab === 'analise' ? analysisHtml() : cfg.tab === 'carteira' ? walletHtml() : cfg.tab === 'ajustes' ? settingsHtml() : panelHtml();
        const title = { destaques: 'Destaques', analise: 'Análise', carteira: 'Carteira', ajustes: 'Ajustes' }[cfg.tab] || 'Painel';
        // 4.38.3: o botão do topo do Painel mostra o modo das cores (◐ automático, ☀ dia, ☾ noite); tocar passa ao seguinte
        const modo = cfg.theme === 'light' || cfg.theme === 'dark' ? cfg.theme : 'auto', seg = { auto: 'light', light: 'dark', dark: 'auto' }[modo];
        const tema = cfg.tab === 'painel' ? `<button type="button" class="pg-tema" data-thm="${seg}" data-modo="${modo}" aria-label="Cores: ${TEMA_NOME[modo]}. Tocar passa a ${TEMA_NOME[seg]}">${TEMA_ICO[modo]}</button>` : '';
        body.innerHTML = `<h1 class="pg-t">${title}</h1>${tema}<div class="pg-st" id="mk-status" aria-live="polite"></div>` + html;
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
    // o que se tem hoje, pelas quantidades da Carteira: o valor e a parte em cripto (o ponto de partida do simulador)
    // a carteira conta sempre em euros (o preço médio da TR é em euros), também com «Moeda local» nos Ajustes
    const fxPara = (q) => (q.currency && q.currency !== 'EUR' ? fxFactor(q.currency) || NaN : 1);
    const pxEur = (k) => { const q = qv(k); return q.price * fxPara(q); };
    function carteiraHoje() {
        let v = 0, vc = 0;
        for (const k of cfg.holdings) {
            const L = lotOf(k), p = pxEur(k);
            if (!REG[k] || !temHoje(L) || !fin(p) || p <= 0) continue;
            const x = posOf(k).q * p; v += x; if (REG[k].kind === 'crypto') vc += x;
        }
        return { v, cp: v > 0 ? vc / v : 0 };
    }
    // o «Por mês» do simulador é só dele (mexer nele não muda o plano dos Ajustes); sem valor próprio, segue o plano
    // (4.42: por omissão, o plano mais o round up e o saveback habituais)
    const simBudget = () => (Number.isFinite(cfg.simBudget) ? cfg.simBudget : poupMes());
    function walletSnap() {
        const ch = carteiraHoje(), real = ch.v > 0 && !cfg.simStartManual;
        const mexido = (ch.v > 0 && !!cfg.simStartManual) || (Number.isFinite(cfg.simBudget) && cfg.simBudget !== poupMes());
        return { budget: simBudget(), mexido, cp: etfCrypto() ? +cfg.cryptoPct || 0 : 0, core: nameOf(cfg.coreFund),
            start: real ? Math.round(ch.v) : +cfg.simStart || 0, ...(real ? { c0: ch.cp, startReal: true } : {}), temReal: ch.v > 0, years: +cfg.simYears || 20, goal: +cfg.simGoal || 0, hoje: !!cfg.simHoje, howOpen: !!st.fold['sim-how'], real: realSnap(), ppr: pprSnap(), fut: futSnap() };
    }
    // ---- o rendimento real (4.13): as compras (plano e avulsas) com os preços de 5 anos (semanais) e do último (diários) ----
    const LH = {}, lhAt = {}, lhVai = new Set();
    // ao abrir: o que ficou do histórico longo (com a hora: só se volta a pedir 6 h depois) e das séries do período
    if (st.snapLH) for (const [k, o] of Object.entries(st.snapLH)) if (o && Array.isArray(o.v) && o.v.length > 1) { LH[k] = o.v; lhAt[k] = +o.at || 0; }
    if (st.snapPS) for (const p of ['1w', '1m']) for (const [k, v] of Object.entries(st.snapPS[p] || {})) if (Array.isArray(v) && v.length > 1) PS[p][k] = v;
    st.snapLH = st.snapPS = null;
    // o valor por mês do plano de cada ativo, pela divisão dos Ajustes (o fundo núcleo e a cripto)
    // quanto investe por mês: a soma do «€ por mês» de cada ativo na Carteira (é o que a TR executa); sem nenhum, o
    // valor dos Ajustes (que então se divide pela estratégia)
    function pmSum() { let s = 0; for (const L of Object.values(cfg.lots)) if (+L.pm > 0) s += +L.pm; return Math.round(s * 100) / 100; }
    const budgetOf = () => pmSum() || +cfg.budget || 0;
    function pmDefault(k) {
        if (pmSum() > 0) return 0; // com o valor de cada ativo na Carteira, o que não o tem não entra no plano
        const b = +cfg.budget || 0, cp = etfCrypto() ? (+cfg.cryptoPct || 0) / 100 : 0;
        if (k === cfg.coreFund) return Math.round(b * (1 - cp));
        if (k === 'c:BTC') return Math.round(b * cp * (cfg.cryptoMix === 'btceth' ? 0.7 : 1));
        if (k === 'c:ETH' && cfg.cryptoMix === 'btceth') return Math.round(b * cp * 0.3);
        return 0;
    }
    const isoT = (iso) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10), 12) / 1000;
    // colar de uma vez: «VWCE.DE 5,486463 169,86» por linha (também BTC, c:BTC, Bitcoin); devolve { ok, bad }
    const numPt = (t) => { t = String(t).replace(/\s/g, ''); if (t.includes(',') && t.includes('.')) t = t.replace(/\./g, ''); return +t.replace(',', '.'); };
    function importLots(txt) {
        let ok = 0; const bad = [];
        // o símbolo sem a bolsa (VWCE → VWCE.DE): primeiro nos ativos que já tem
        const semBolsa = (x) => x.replace(/\.[A-Z]{1,3}$/i, '').toUpperCase();
        const chaves = [...new Set([...cfg.holdings, ...Object.keys(REG)])].filter((x) => REG[x]);
        // como vem da TR ou de uma folha de cálculo: «€», «EUR», «@», «;», tabulações e espaços duros contam como espaço
        for (let linha of String(txt).split(/\n+/).map((x) => x.replace(/[€@;|]|\bEUR\b/gi, ' ').replace(/\s+/g, ' ').trim()).filter(Boolean)) {
            // a data no fim, opcional: 02/11/2026 ou 2026-11-02 (desde quando o tem: o gráfico e o rendimento por ano)
            let qd = '';
            const dm = linha.match(/\s+(?:(\d{1,2})\/(\d{1,2})\/(\d{4})|(\d{4})-(\d{2})-(\d{2}))$/);
            if (dm) {
                const iso = dm[4] ? `${dm[4]}-${dm[5]}-${dm[6]}` : `${dm[3]}-${dm[2].padStart(2, '0')}-${dm[1].padStart(2, '0')}`;
                if (iso <= todayLocal() && !Number.isNaN(Date.parse(iso))) qd = iso;
                linha = linha.slice(0, dm.index).trim();
            }
            const m = linha.match(/^(\S+(?:\s+\S+)*?)\s+([\d.,]+)\s+([\d][\d.,\s]*)$/);
            const tok = m ? m[1].trim() : '', T = tok.toUpperCase();
            const k = m && (REG[tok] ? tok : REG['c:' + T] ? 'c:' + T : chaves.find((x) => (REG[x].sym || '').toUpperCase() === T || nameOf(x).toUpperCase() === T) || chaves.find((x) => semBolsa(x) === T));
            const q = m ? numPt(m[2]) : NaN, a = m ? numPt(m[3]) : NaN;
            if (!k || !(q > 0) || !(a > 0)) { bad.push(tok || linha.slice(0, 12)); continue; }
            cfg.lots[k] = { ...lotOf(k), qty: q, avg: a, cost: Math.round(q * a * 100) / 100, at: todayLocal(), compras: [], ...(qd ? { qd } : {}) };
            if (!cfg.holdings.includes(k)) cfg.holdings = cfg.holdings.concat(k);
            ok++;
        }
        if (ok) { const ks = Object.keys(cfg.lots); setLots(ks[0], cfg.lots[ks[0]]); }
        return { ok, bad };
    }
    // o que tem hoje (quantidade e investido, como na TR): manda sobre o plano; com a data, é uma compra só nesse dia
    const temHoje = (L) => +L.qty > 0 && +L.cost > 0;
    // ---- o que veio depois do que copiaste da TR (4.20) ----
    // L.at é o dia em que puseste a quantidade. Depois dele, o plano mensal junta-se sozinho nos dias de execução (ao
    // preço de fecho de cada dia, estimado) e juntam-se as compras e os acertos que registas (L.compras: {d, e, q, cb}).
    const isoMais = (iso, n) => new Date(Date.parse(iso + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
    const ISO_D = /^\d{4}-\d\d-\d\d$/;
    const pmOf = (k) => { const L = lotOf(k); return +L.pm > 0 ? +L.pm : pmDefault(k); };
    // o preço em euros nesse dia (o último fecho até lá; hoje, o de agora)
    function pxEm(k, iso) {
        if (iso >= todayLocal()) return pxEur(k);
        const t = isoT(iso) + 43200; let p = NaN;
        for (const [tt, v] of histOf(k)) { if (tt <= t) p = v; else break; }
        return fin(p) && p > 0 ? p : pxEur(k);
    }
    // 4.42: a poupança periódica — o plano (o valor por mês, repartido pelos dias do plano), o round up (dias 2, 9, 16 e 23)
    // e o saveback (dia 2). Cada execução conta por volta das 15h45 desse dia (a hora a que a TR executa: o plano de 2/11
    // entrou às 15:42), ao preço desse dia, com o valor habitual;
    // ajusta-se data a data com −/+/0 (lots.pa, lots.ra, lots.sa: {dia: €}); um registado nesse dia (o «Registar») ganha
    const HORA_PLANO = 15 * 60 + 45; // 15h45, em minutos
    const feito = (iso) => { if (iso < todayLocal()) return true; const a = new Date(); return iso === todayLocal() && a.getHours() * 60 + a.getMinutes() >= HORA_PLANO; };
    const PP_MAPA = { pl: 'pa', ru: 'ra', sb: 'sa' };
    // o habitual do round up (€ por semana) e do saveback (€ por mês): o escolhido, senão a média dos últimos 4 registados
    // os valores inseridos do round up ou do saveback (pelo «Registar» ou acertados com −/+/0): [[dia, €]], por ordem
    function entradas(k, tp) {
        const m = lotOf(k)[PP_MAPA[tp]] || {};
        return Object.keys(m).filter((d) => ISO_D.test(d) && m[d] !== null && m[d] !== '' && fin(+m[d])).sort().map((d) => [d, +m[d]]);
    }
    // 4.43: o habitual do round up (por execução, 4 por mês) e do saveback (por mês) é a média dos últimos inseridos (8 round
    // ups, 2 meses; 3 saveback), e vai-se ajustando; sem nenhum, o escolhido com −/+ (L.ruS, L.sbM)
    function habitual(k, tp) {
        const v = entradas(k, tp).slice(tp === 'ru' ? -8 : -3);
        if (v.length) return Math.round((v.reduce((s, x) => s + x[1], 0) / v.length) * 100) / 100;
        const L = lotOf(k), b = tp === 'ru' ? L.ruS : L.sbM;
        return b !== undefined && b !== null && b !== '' && fin(+b) && +b >= 0 ? +b : 0;
    }
    // 4.43: o saveback e o round up registados como compras (4.40) passam para os valores por data (lots.sa, lots.ra)
    function migraSbRu() {
        let mudou = false;
        for (const L of Object.values(cfg.lots || {})) {
            const cs = Array.isArray(L.compras) ? L.compras : [], fica = [];
            for (const c of cs) {
                const tp = c && c.sb ? 'sb' : c && c.ru ? 'ru' : '';
                if (!tp || !ISO_D.test(c.d || '')) { fica.push(c); continue; }
                const m = (L[PP_MAPA[tp]] = { ...(L[PP_MAPA[tp]] || {}) });
                m[c.d] = Math.round(((+m[c.d] || 0) + (+c.e || 0)) * 100) / 100;
                mudou = true;
            }
            if (fica.length !== cs.length) L.compras = fica;
        }
        if (mudou) saveCfg();
    }
    // as datas de cada um entre de (exclusive) e ate (inclusive): o plano pelos dias dele; o round up e o saveback pelos da TR
    function agendaPP(k, tp, de, ate) {
        if (tp === 'pl') return pmOf(k) > 0 || Object.keys(lotOf(k).pa || {}).length ? A.planLots(isoMais(de, 1), cfg.saveDays, ate).map((x) => x.d) : [];
        const dias = tp === 'ru' ? [2, 9, 16, 23] : [2], out = [];
        let [y, m] = de.split('-').map(Number);
        for (let n = 0; n < 240; n++) {
            const mm = String(m).padStart(2, '0');
            if (`${y}-${mm}-01` > ate) break;
            for (const d of dias) { const iso = `${y}-${mm}-${String(d).padStart(2, '0')}`; if (iso > de && iso <= ate) out.push(iso); }
            m++; if (m > 12) { m = 1; y++; }
        }
        return out;
    }
    // o valor de uma execução: o ajustado nesse dia, senão o habitual (o plano: o valor por mês a dividir pelos dias)
    function valorPP(k, tp, d) {
        const aj = (lotOf(k)[PP_MAPA[tp]] || {})[d];
        if (aj !== undefined && aj !== null && fin(+aj)) return { e: +aj, aj: 1 };
        return { e: tp === 'pl' ? pmOf(k) / Math.max(1, (cfg.saveDays || []).length) : habitual(k, tp), aj: 0 };
    }
    // o round up e o saveback habituais num mês (para as contas do futuro: o simulador e a análise do Claude)
    // (4 round ups por mês: dias 2, 9, 16 e 23)
    const extrasMes = (k) => (temHoje(lotOf(k)) ? habitual(k, 'ru') * 4 + habitual(k, 'sb') : 0);
    const poupMes = () => budgetOf() + cfg.holdings.filter((k) => REG[k]).reduce((s, k) => s + extrasMes(k), 0);
    function extrasOf(k) {
        const L = lotOf(k), out = [];
        if (!temHoje(L) || !ISO_D.test(L.at || '')) return out;
        (L.compras || []).forEach((c, i) => { if (fin(+c.q) && +c.q !== 0 && ISO_D.test(c.d || '')) out.push({ d: c.d, e: +c.e || 0, q: +c.q, t: c.cb ? 2 : c.sb ? 3 : c.ru ? 4 : 1, i }); });
        // a poupança periódica, nos dias já feitos (por volta das 15h45): o inserido nesse dia, senão o habitual (4.42/4.43)
        for (const tp of ['pl', 'ru', 'sb']) {
            for (const d of agendaPP(k, tp, L.at, todayLocal())) {
                if (!feito(d)) continue;
                const v = valorPP(k, tp, d), p = pxEm(k, d);
                if (v.e > 0 && fin(p) && p > 0) out.push({ d, e: v.e, q: v.e / p, t: tp === 'pl' ? 0 : tp === 'sb' ? (v.aj ? 3 : 5) : v.aj ? 4 : 6, aj: v.aj });
            }
        }
        return out.sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0));
    }
    // a posição de hoje: o que copiaste da TR mais o que veio depois
    function posOf(k) {
        const L = lotOf(k); let q = +L.qty || 0, c = +L.cost || 0;
        for (const x of extrasOf(k)) { q += x.q; c += x.e; }
        return { q, c, avg: q > 0 ? c / q : 0 };
    }
    // o que vai para o conector (e daí para a análise do Claude): a posição de hoje
    // o que vai para o conector: as compras, o que se tem, o valor por mês e o prazo de cada ativo (o que tem e não
    // mexeu na Carteira vai com o prazo por omissão, longo, para o Claude saber)
    const lotsEnvio = () => {
        const o = Object.fromEntries(Object.entries(cfg.lots).map(([k, L]) => {
            const hz = owns(k) || L.hz ? hzOf(k) : undefined;
            if (!REG[k] || !temHoje(L)) return [k, { ...L, ...(hz ? { hz } : {}) }];
            // (4.42: o valor por mês deste ativo com o round up e o saveback habituais)
            const P = posOf(k), ex = extrasMes(k);
            return [k, { ...L, qty: Math.round(P.q * 1e8) / 1e8, cost: Math.round(P.c * 100) / 100, ...(ex > 0 ? { pm: Math.round((pmOf(k) + ex) * 100) / 100 } : {}), ...(hz ? { hz } : {}) }];
        }));
        for (const k of cfg.holdings) if (!o[k] && REG[k]) o[k] = { plan: '', buys: [], hz: hzOf(k) };
        // o que tem primeiro (o conector guarda até 60 ativos)
        const ks = Object.keys(o).sort((a, b) => (owns(b) ? 1 : 0) - (owns(a) ? 1 : 0));
        return Object.fromEntries(ks.map((k) => [k, o[k]]));
    };
    // o plano dos Ajustes: quanto investe por mês e a parte da cripto (o Claude parte daqui, não de um valor fixo)
    // (4.42: com o round up e o saveback habituais, a contar para o plano do Claude; em cêntimos só quando os há)
    const planoEnvio = () => { const b = poupMes(); return { budget: b === budgetOf() ? b : Math.round(b * 100) / 100, cryptoPct: etfCrypto() ? +cfg.cryptoPct || 0 : 0 }; };
    // em que prazo tem o ativo (curto, médio ou longo; escolhe-se na Carteira): o que tem, por omissão, longo
    const HZ_OK = ['short', 'mid', 'long'];
    const hzOf = (k) => { const h = (cfg.lots[k] || {}).hz; return HZ_OK.includes(h) ? h : owns(k) ? 'long' : ''; };
    const fmtQ = (x) => x.toLocaleString('pt-PT', { maximumFractionDigits: 6 });
    function buysOf(k) {
        const L = lotOf(k);
        if (temHoje(L)) return ISO_D.test(L.qd || '') ? [[isoT(L.qd), +L.cost, +L.qty]].concat(extrasOf(k).map((x) => [isoT(x.d), x.e, x.q])) : [];
        const pm = +L.pm > 0 ? +L.pm : pmDefault(k), n = Math.max(1, (cfg.saveDays || []).length);
        const plan = pm > 0 ? A.planLots(L.plan, cfg.saveDays, todayLocal()).map((x) => [isoT(x.d), pm / n]) : [];
        return plan.concat((L.buys || []).filter((x) => +x.e > 0 && /^\d{4}-\d\d-\d\d$/.test(x.d || '')).map((x) => [isoT(x.d), +x.e])).sort((a, b) => a[0] - b[0]);
    }
    // os preços em euros: os semanais antes do primeiro dia do ano diário, e o diário
    function histOf(k) {
        const q = qv(k), w = LH[k] || [], d = D[k] || [], f = (q.fx || 1) * fxPara(q);
        if (!fin(f)) return [];
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
        if (cfg.tab === 'carteira' || cfg.tab === 'painel') scheduleRender();
    }
    function realSnap() {
        const keys = cfg.holdings.filter((k) => REG[k]);
        const comp = keys.filter((k) => buysOf(k).length || temHoje(lotOf(k)));
        if (comp.length) loadLong(comp.concat([cfg.coreFund]));
        const ts = comp.map((k) => buysOf(k)).filter((b) => b.length).map((b) => b[0][0]);
        const t0 = ts.length === comp.length && ts.length ? Math.min(...ts) : 0;
        return {
            edOpen: !!st.fold['real-ed'], now: now() / 1000, desde: t0 ? dmy(new Date(t0 * 1000).toISOString().slice(0, 10)) : null, loading: lhVai.size > 0,
            bench: { name: nameOf(cfg.coreFund), px: pxEur(cfg.coreFund), h: histOf(cfg.coreFund) },
            ativos: keys.map((k) => {
                const L = lotOf(k), P = posOf(k), mais = extrasOf(k).length > 0;
                return { k, name: nameOf(k), px: pxEur(k), h: buysOf(k).length ? histOf(k) : [], b: buysOf(k), plan: L.plan || '', pm: +L.pm || 0, pmDef: pmDefault(k), hz: hzOf(k), q: P.q, cost: P.c,
                    avg: mais ? Math.round(P.avg * 1e4) / 1e4 : +L.avg || (+L.qty > 0 && +L.cost > 0 ? Math.round((+L.cost / +L.qty) * 1e4) / 1e4 : 0), qd: L.qd || '' };
            }),
            reg: regSnap(),
        };
    }
    // as duas componentes do PPR como dois ativos da Carteira: em cada mês, no dia de «Desde», o prémio divide-se pelas duas e
    // compra unidades ao valor do dia útil seguinte (como a Fidelidade fez com o 1.º prémio: o de 07/07/2025 ao valor de 08/07)
    function pprAtivos() {
        const P = cfg.ppr || {}, pm = +P.pm || 0, din = Math.min(100, Math.max(0, +P.din || 0)) / 100;
        if (!ISO_D.test(P.de || '') || !(pm > 0) || !PPRD || !PPRD.f) return [];
        const hj = todayLocal(), [y0, m0, d0] = P.de.split('-').map(Number), datas = [];
        for (let i = 0; i < 1200; i++) {
            const y = y0 + Math.floor((m0 - 1 + i) / 12), m = (m0 - 1 + i) % 12, ult = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
            const d = `${y}-${String(m + 1).padStart(2, '0')}-${String(Math.min(d0, ult)).padStart(2, '0')}`;
            if (d > hj) break;
            datas.push(d);
        }
        // 4.48: as entregas extra (além do mensal): com a divisão do plano ou, com as unidades da MyFidelidade, com a que as faz
        // bater (uma entrega extra pode ter outra divisão: a parte de uma componente é o que sobra depois dos prémios do mês)
        const ex = (Array.isArray(P.ex) ? P.ex : []).filter((x) => Array.isArray(x) && ISO_D.test(x[0] || '') && x[0] <= hj && +x[1] > 0);
        const prem = datas.map((d) => [d, pm, 0]).concat(ex.map((x) => [x[0], +x[1], 1])).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
        const vu = (s, d) => (s.find((r) => r[0] > d) || s[s.length - 1])[1];
        let dx = din;
        for (const [c, dyn, real] of [['7614', 0, +P.ur], ['7615', 1, +P.uc]]) {
            const s = PPRD.f[c], pa = dyn ? din : 1 - din;
            if (!(real > 0) || !ex.length || !Array.isArray(s) || !s.length) continue;
            const uMes = datas.reduce((a, d) => a + (pm * pa) / vu(s, d), 0), uEx = ex.reduce((a, x) => a + +x[1] / vu(s, x[0]), 0);
            const q = Math.min(1, Math.max(0, (real - uMes) / uEx));
            dx = dyn ? q : 1 - q;
            break;
        }
        const ts = (iso) => Date.parse(iso + 'T12:00:00Z') / 1000;
        return PPR_F.map(([c, name, dyn]) => {
            const s = PPRD.f[c];
            if (!Array.isArray(s) || !s.length || !prem.length) return null;
            const b = prem.map(([d, e, x]) => { const pa = dyn ? (x ? dx : din) : 1 - (x ? dx : din); return [ts(d), e * pa, (e * pa) / vu(s, d)]; }).filter((r) => r[1] > 0);
            if (!b.length) return null;
            // acertar com a Fidelidade: as unidades de hoje (as da MyFidelidade) corrigem a conta, na mesma proporção (u0: as da conta)
            const real = +(dyn ? P.uc : P.ur), u = b.reduce((a, r) => a + r[2], 0);
            if (real > 0 && u > 0) for (const r of b) r[2] *= real / u;
            return { k: 'ppr:' + c, name, px: s[s.length - 1][1], h: s.map((r) => [ts(r[0]), r[1]]), b, u0: u };
        }).filter(Boolean);
    }
    function pprSnap() {
        loadPPR();
        const P = cfg.ppr || {}, l = pprAtivos(), s = PPRD && PPRD.f && (PPRD.f['7615'] || PPRD.f['7614']), ed = st.fold['ppr-ed'];
        // 4.48: com as unidades da MyFidelidade longe das dos prémios registados (4.51.1: mais de 2 % no valor; com tudo certo,
        // a diferença fica abaixo de 0,1 % — 5 % deixava passar uma entrega de 100 € esquecida), falta (ou sobra)
        // alguma entrega: o ganho ficava errado — diz-se o que falta e o ganho não se mostra
        let aviso = '';
        if (+P.ur > 0 || +P.uc > 0) {
            const vr = l.reduce((a, x) => a + x.px * x.b.reduce((q, r) => q + r[2], 0), 0), vc = l.reduce((a, x) => a + x.px * x.u0, 0), dv = vr - vc;
            if (vc > 0 && Math.abs(dv) > 0.02 * vc) aviso = dv > 0
                ? `As unidades que escreveste valem mais ${fmtPx(dv, { decimals: 0 }, 'EUR')} do que dão os prémios registados: falta alguma entrega extra? Junta-a em «O teu PPR» para veres o investido e o ganho certos.`
                : `As unidades que escreveste valem menos ${fmtPx(-dv, { decimals: 0 }, 'EUR')} do que dão os prémios registados: confirma-as na MyFidelidade («Carteira do seguro», as UP de cada componente) — ou falhou algum prémio.`;
        }
        const x = st.pprx || {};
        return { now: now() / 1000, ativos: l, at: l.length && s ? dmy(s[s.length - 1][0]) : '', loading: pprVai && !l.length ? 1 : 0, erro: l.length ? '' : pprErr, aviso,
            ed: (ed === undefined ? !l.length : ed) ? 1 : 0, cfg: { de: P.de || '', pm: +P.pm || 0, din: +P.din || 0, ur: +P.ur || 0, uc: +P.uc || 0 },
            ex: (Array.isArray(P.ex) ? P.ex : []).map((e) => ({ d: String(e[0] || ''), l: ISO_D.test(e[0] || '') ? dmy(e[0]) : '?', e: +e[1] || 0 })), xd: x.d || '', xe: x.e || '' };
    }
    // 4.51: o Fundo Viva — as tuas UP × o valor da UP de cada data (os fins de ano dos relatórios e os dias guardados): vale
    // hoje, este ano, o ano passado e o gráfico (já em coordenadas do desenho: 34..330 × 186..14)
    function futSnap() {
        loadFUT();
        const P = cfg.fut || {}, u = +P.up || 0, d = FUTD && Array.isArray(FUTD.d) ? FUTD.d : [], ed = st.fold['fut-ed'];
        const base = { at: '', loading: futVai && !d.length ? 1 : 0, erro: d.length ? '' : futErr, ed: (ed === undefined ? !(u > 0 && d.length) : ed) ? 1 : 0, cfg: { up: u }, vv: 0 };
        if (!(u > 0) || !d.length) return base;
        const ts = (iso) => Date.parse(iso + 'T12:00:00Z') / 1000, up = d[d.length - 1][1], ult = d[d.length - 1][0], ano = +ult.slice(0, 4);
        const fimAno = (y) => { const x = d.filter((r) => r[0] <= `${y}-12-31`).pop(); return x && x[0] >= `${y}-12-01` ? x[1] : null; };
        const f1 = fimAno(ano - 1), f2 = fimAno(ano - 2);
        const vs = d.map((r) => r[1] * u), lo0 = Math.min(...vs), hi0 = Math.max(...vs), pad = (hi0 - lo0) * 0.08 || hi0 * 0.02, lo = lo0 - pad, hi = hi0 + pad;
        const t0 = ts(d[0][0]), tf = ts(ult), X = (t) => 34 + 296 * (tf > t0 ? (t - t0) / (tf - t0) : 1), Y = (v) => 186 - (172 * (v - lo)) / (hi - lo);
        const pts = d.map((r, i) => ({ x: Math.round(X(ts(r[0])) * 10) / 10, y: Math.round(Y(vs[i]) * 10) / 10 }));
        // o dedo: um quadro por data, até a meio da vizinha
        const hits = pts.map((p, i) => { const a = i ? (pts[i - 1].x + p.x) / 2 : 34, b = i < pts.length - 1 ? (p.x + pts[i + 1].x) / 2 : 330; return { x: Math.round(a * 10) / 10, w: Math.max(0.5, Math.round((b - a) * 10) / 10), cx: p.x, tx: `${i === d.length - 1 ? 'Hoje' : dmy(d[i][0])}: ${fmtPx(vs[i], { decimals: 0 }, 'EUR')}` }; });
        return { ...base, at: dmy(ult), vv: u * up, up, ytd: f1 ? up / f1 - 1 : 0, anoL: f1 && f2 ? `Em ${ano - 1}` : '', ano: f1 && f2 ? f1 / f2 - 1 : 0, pts, hits, lo, hi, d0: dmy(d[0][0]).slice(3) };
    }
    // o «Registar» da Carteira: os ativos com quantidade, o rascunho (st.reg) e o que entrou depois do que copiaste
    function regSnap() {
        st.reg = st.reg || {};
        const ks = cfg.holdings.filter((k) => REG[k] && temHoje(lotOf(k)));
        if (!ks.length) return null;
        const k = ks.includes(st.reg.k) ? st.reg.k : ks.includes(cfg.coreFund) ? cfg.coreFund : ks[0];
        st.reg.k = k;
        const lista = ks.flatMap((x) => extrasOf(x).map((e) => ({ ...e, k: x }))).sort((a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : 0)).filter((e) => !(e.t >= 3 && e.t <= 6)).slice(0, 8)
            .map((e) => ({ k: e.k, name: nameOf(e.k), d: dmy(e.d), e: Math.round(e.e * 100) / 100, q: e.q, t: e.t, aj: e.aj || 0, i: e.i ?? -1 }));
        // 4.45: a poupança periódica deste ativo — o plano, o round up e o saveback em listas: a próxima data e as feitas desde
        // que copiaste da TR (a mais recente primeiro); em cada uma, o valor escrito (ou a sugestão, a cinzento)
        const hjP = todayLocal(), L1 = lotOf(k), deP = ISO_D.test(L1.at || '') ? L1.at : isoMais(hjP, -45), nPl = Math.max(1, (cfg.saveDays || []).length);
        const eurP = (x, dd) => fmtPx(x, { decimals: dd }, 'EUR');
        const lst = (tp) => {
            const ds = agendaPP(k, tp, deP, isoMais(hjP, tp === 'ru' ? 8 : 31)), sug = tp === 'pl' ? pmOf(k) / nPl : habitual(k, tp);
            // 4.49: à vista, a próxima e as últimas (o round up: um mês; o plano e o saveback: 2); as mais antigas numa dobra fechada
            const linha = (dd) => { const v = valorPP(k, tp, dd); return { d: dd, l: dmy(dd), ins: v.aj, e: v.aj ? Math.round(v.e * 100) / 100 : 0, sug: Math.round(sug * 100) / 100, feito: feito(dd) ? 1 : 0 }; };
            const feitas = ds.filter((x) => feito(x)).reverse().slice(0, tp === 'ru' ? 48 : 12), ver = tp === 'ru' ? 4 : 2;
            const linhas = ds.filter((x) => !feito(x)).slice(0, 1).concat(feitas.slice(0, ver)).map(linha), mais = feitas.slice(ver).map(linha);
            const ent = entradas(k, tp);
            const info = tp === 'pl' ? `${eurP(pmOf(k), 0)} por mês${(cfg.saveDays || []).length ? ' · dia ' + cfg.saveDays.join(' e ') : ''}`
                : ent.length ? `média ${eurP(sug, 2)} · ~${eurP(Math.round(sug * (tp === 'ru' ? 48 : 12)), 0)} por ano` : 'escreve o valor da TR em cada data';
            return { tp, nome: tp === 'pl' ? 'Plano' : tp === 'ru' ? 'Round up · dias 2, 9, 16 e 23' : 'Saveback · dia 2', info, aberto: st.fold['pp-' + tp] === false ? 0 : 1, linhas, mais, maisAberto: st.fold['ppm-' + tp] ? 1 : 0 };
        };
        const pp = { desde: dmy(deP), pl: pmOf(k) > 0 ? lst('pl') : null, ru: lst('ru'), sb: lst('sb') };
        return { ks: ks.map((x) => ({ k: x, name: nameOf(x) })), k, e: st.reg.e || '', d: st.reg.d || todayLocal(), q: st.reg.q || '', hoje: todayLocal(), pm: pmOf(k), qApp: posOf(k).q, lista, pp };
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
            proxy: cfg.proxy, fiat: cfg.fiat, per: cfg.per, perA: perA(), sort: cfg.sort, swipe: st.swipe,
            mine, watch: cfg.watch, funds: cfg.funds, hidden: cfg.hidden,
            crypto: CRYPTO.map((c) => 'c:' + c.id), energy: ENERGY.map((e) => e.sym), indices: INDICES.map((i) => i.sym), mktOrder: MKT_ORDER,
            foldHoje: fold('hoje'), foldIdx: fold('pn-idx'), foldEn: fold('pn-en'), foldFuel: fold('pn-fuel'), foldPfc: fold('pf-cripto'), foldPff: fold('pf-fundos'),
            assets: Object.keys(REG).map((k) => {
                const a = REG[k], q = qv(k), r = AN[k], h = r && r.horizons, d = r && r.discount, ad = r && r.advice;
                // sem o Claude, a etiqueta dos meus ativos é a da decisão consolidada (a mesma da ficha)
                const my = mine.includes(k), cl = my ? claudeFor(k) : null, dec = my && !cl && ad ? decOf(k) : null, tg = pxTag(k, q);
                return { k, kind: a.kind, temp: a.temp, sym: a.sym, name: nameOf(k), unit: a.unit, dec: a.decimals, pts: a.points,
                    px: q.price, cur: q.currency, qc: Q[k] && Q[k].currency, chg: q.changePct, pc: perData(k, perA()).pct, t: tg.t, tt: tg.tt,
                    pl: a.perLitre && Q[k] ? A.usdGalToEurL(Q[k].price, eu) : undefined, mkt: mktOf(k), nr: rank ? rank.get(nameOf(k)) : undefined,
                    an: r ? { d: d ? { dd: d.dd, score: d.score } : d, adv: ad ? { key: ad.key, action: ad.action } : ad, L: h ? (h.long || h.mid || {}).score : undefined } : r,
                    cl: cl ? { key: cl.key, action: cl.action } : cl, dk: dec ? dec.key : undefined, tax: my && a.kind === 'crypto' ? taxLine(k) : undefined };
            }),
            hoje: hojeSnap(), pf: pfSnap(),
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
            profile: cfg.profile, strategy: cfg.strategy, budget: budgetOf(), cryptoPct: +cfg.cryptoPct, cryptoMix: cfg.cryptoMix, coreFund: cfg.coreFund, saveDays: cfg.saveDays,
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
        try { CG = await px('/cryptoglobal', 20000); scheduleRender(); if (sheetKey && REG[sheetKey] && REG[sheetKey].kind === 'crypto') renderSheet(); } catch { /* sem dados */ }
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
    // o tipo de ETF e os impostos em Portugal (nos pormenores, por baixo da decisão)
    function factsHtml(k) {
        if (!buyable(k)) return '';
        const kind = REG[k].ut === 'crypto' ? 'crypto' : REG[k].kind;
        return `${kind === 'fund' && FUND_TYPE[k] ? `<div class="adv-meta"><b>${{ acc: 'Acumulação', dist: 'Distribuição', etc: 'ETC (sem dividendos)' }[FUND_TYPE[k]]}</b> — ${{ acc: 'não paga dividendos: nada a declarar no IRS até venderes.', dist: 'paga dividendos: 28% e declaração no IRS (Anexo J) todos os anos. Para o plano, a versão de acumulação poupa essa declaração.', etc: 'não paga dividendos; só declaras quando venderes.' }[FUND_TYPE[k]]}</div>` : ''}
            ${kind === 'stock' ? '<div class="adv-meta"><b>Dividendos</b> — se a empresa pagar, são 28% e entram na declaração de IRS (Anexo J) todos os anos.</div>' : ''}
            <div class="adv-meta">Impostos (PT): ${kind === 'crypto' ? 'vender ao fim de 365 dias ou mais está isento de IRS; antes disso paga 28%.' : kind === 'fund' ? 'só pagas quando venderes, e menos quanto mais tempo o tiveres: 28% até 2 anos, 25,2% de 2 a 5, 22,4% de 5 a 8 e 19,6% com 8 anos ou mais. Um ETF de acumulação não paga nada enquanto o tiveres.' : 'ao vender, 28% até 2 anos, 25,2% de 2 a 5, 22,4% de 5 a 8 e 19,6% com 8 anos ou mais; os dividendos pagam 28%.'}</div>`;
    }
    // a leitura do Claude do que não se compra (índices, câmbio, futuros): os ativos têm o cartão «Decisão»
    function claudeBox(k, q) {
        const c = claudeFor(k);
        if (!c) return '';
        const A_ = REG[k], tone = CL_TONE[c.key] || 'flat';
        const lbl = rotulo(c.key, owns(k)) || c.action || '';
        const dist = (v) => { const p = clPx(k, q, v); return fin(p) && fin(q.price) && q.price ? fmtPct((p / q.price - 1) * 100) : ''; };
        const conv = HZ.filter(([h]) => fin(c[h])).map(([h, l]) => `<div class="cv"><small>${l} prazo</small>${scoreBar({ score: c[h], tone: scoreTone(c[h]) })}</div>`).join('');
        const lv = [['entry', 'Entrada'], ['target', 'Alvo'], ['stop', 'Stop']].filter(([f]) => fin(clPx(k, q, c[f])))
            .map(([f, l]) => `<li class="${f}"><small>${l}</small><b class="num">${fmtPx(clPx(k, q, c[f]), A_, q.currency)}</b><span class="num">${dist(c[f])}</span></li>`).join('');
        return `<div class="box advice cl-adv ${tone}"><h3>Leitura do Claude</h3>
            <div class="adv-src">${c.old ? `Análise do Claude de ${esc(dmy(c.date).slice(0, 5))} · último comentário a este ativo` : `Análise do Claude · ${esc(clWhen())}`}</div>
            <div class="adv-act ${tone}-t">${esc(lbl)}</div>${nuance(lbl, c.action)}
            ${conv ? `<div class="cl-conv" role="group" aria-label="Convicção do Claude por prazo">${conv}</div>` : ''}
            ${lv ? `<ul class="cl-lv">${lv}</ul>` : ''}
            ${whyToday(k, q)}
            <div class="adv-txt">${esc(c.why || '')}</div>
            ${c.plan ? `<div class="adv-txt"><b>Plano:</b> ${esc(c.plan)}</div>` : ''}</div>`;
    }
    // ---- o consenso dos analistas (Yahoo, pelo conector: /consensus) — a segunda opinião de fora, nas ações ----
    const CONS = {}, consAt = {};
    const CONS_LBL = { strong_buy: 'Compra forte', buy: 'Comprar', hold: 'Manter', underperform: 'Abaixo do mercado', sell: 'Vender', strong_sell: 'Venda forte' };
    const CONS_FAM = { strong_buy: 1, buy: 1, hold: 0, underperform: -1, sell: -1, strong_sell: -1 };
    async function loadConsensus(k) {
        // as ações (analistas, fundamentos, revisões) e os fundos (o P/E, o custo e as maiores posições)
        if (!REG[k] || !['stock', 'fund'].includes(REG[k].kind) || !cfg.proxy || now() - (consAt[k] || 0) < 6 * 3600 * 1000) return;
        consAt[k] = now();
        try {
            // &f=2: um endereço novo a cada versão do conector que junta dados ao consenso (1.7.0: fundamentos; 1.8.0:
            // revisões, surpresas, fundos), para não vir da cache da Cloudflare uma resposta antiga, sem eles
            const r = await px(`/consensus?symbols=${encodeURIComponent(k)}&f=2`, 15000);
            CONS[k] = (r.items || []).find((x) => x.symbol === k) || null;
        } catch { CONS[k] = null; }
        if (sheetKey === k) renderSheet(true);
    }
    // ---- a decisão consolidada (decisao.onda): o que o Claude, os analistas, a técnica e as notícias dizem de um
    // ativo, numa só. Aqui só se junta o que cada fonte já deu; as regras e os pesos estão na Onda ----
    // o tom das notícias de um ativo, calculado uma vez por cada lista que chega
    const tomNoticias = (n) => { if (!('tom' in n) && aoOk) n.tom = AO.newsTone(n.items); return 'tom' in n ? n.tom : null; };
    // o Claude leu as notícias deste ativo? (só conta a análise de agora: um tom antigo já não diz nada)
    const clNews = (c) => !!c && !c.old && fin(c.news);
    function decIn(k) {
        const cl = claudeFor(k), c = CONS[k], r = AN[k], n = NEWS[k], h = (r && r.horizons) || {};
        const sc = (x) => (x ? x.score : null);
        // os fundamentos vêm com o consenso (frações do Yahoo → %); o sentimento é o Fear & Greed na cripto e o VIX no resto
        const f = c && !c.error ? c.f : null, vix = Q['^VIX'] && Q['^VIX'].price, fg = CG && CG.fng ? CG.fng.v : null;
        return {
            cl: cl ? { key: cl.key, short: cl.short, mid: cl.mid, long: cl.long, old: !!cl.old } : null,
            an: c && !c.none && !c.error ? { key: c.key, mean: c.mean, n: c.n, target: c.target, price: c.price, ...(c.rev ? { up: c.rev.up, down: c.rev.down } : {}) } : null,
            fun: f ? { pe: f.pe, cr: fin(f.cr) ? Math.round(f.cr * 1000) / 10 : null, mg: fin(f.mg) ? Math.round(f.mg * 1000) / 10 : null } : null,
            tec: r && r.advice ? { key: r.advice.key, short: sc(h.short), mid: sc(h.mid), long: sc(h.long) } : null,
            // as notícias: o tom que o Claude leu na análise de agora (news, 0–100); sem ele, o dos títulos
            news: clNews(cl) ? (cl.news - 50) / 50 : n ? tomNoticias(n) : null,
            sent: REG[k] && REG[k].kind === 'crypto' ? (fin(fg) ? { fg } : null) : fin(vix) ? { vix } : null,
            // o prazo em que tem o ativo pesa as convicções por prazo (no longo prazo, uma queda de dias quase não conta)
            hz: hzOf(k) || null,
        };
    }
    const decOf = (k) => (buyable(k) ? A.decisao(decIn(k)) : null);
    // o cartão «Decisão» da ficha (ecra-decisao.onda): as fontes e o que só o JS sabe (de quando é a análise, os
    // níveis já na moeda do ecrã, a agenda). dec é a decisão (decOf): diz quem manda e o veredicto
    // o IRS no prazo escolhido (ou no que tem) e, com o alvo do Claude, o que fica de 1 000 € depois do imposto
    function irsTxt(k, q, c, hz) {
        const cr = REG[k] && REG[k].kind === 'crypto';
        const regra = cr ? (hz === 'long' ? 'IRS: ao fim de 365 dias, o ganho fica isento.' : hz ? 'IRS: vender antes de 365 dias paga 28 % sobre o ganho.' : 'IRS: 28 % sobre o ganho antes de 365 dias; isento depois.')
            : hz === 'long' ? 'IRS: 28 % até 2 anos, 25,2 % de 2 a 5, 22,4 % de 5 a 8 e 19,6 % com 8 anos ou mais.' : hz ? 'IRS: vender antes de 2 anos paga 28 % sobre o ganho.' : 'IRS: 28 % até 2 anos, a descer até 19,6 % com 8 anos ou mais.';
        const tg = c && fin(c.target) ? clPx(k, q, c.target) : null;
        if (!(fin(tg) && fin(q.price) && q.price > 0 && tg > q.price)) return regra;
        const g = (tg / q.price - 1) * 1000, eur = (x) => `+${Math.round(x)} €`;
        return `${regra} No alvo (${fmtPct((tg / q.price - 1) * 100)}), 1 000 € ganham ${eur(g)}`
            + (cr && hz === 'long' ? ', sem imposto.' : !cr && hz === 'long' ? `: ${eur(g * 0.72)} a ${eur(g * 0.804)} depois do imposto, conforme os anos.` : `: ${eur(g * 0.72)} depois do imposto.`);
    }
    function decSnap(k, q, dec) {
        const c = claudeFor(k), cons = CONS[k], n = NEWS[k], alg = AN[k] && AN[k].advice, manda = dec.manda === 'claude', lbl = rotulo(dec.key, owns(k));
        const de = c && c.date ? dmy(c.date).slice(0, 5) : '';
        const dist = (v) => { const p = clPx(k, q, v); return fin(p) && fin(q.price) && q.price ? fmtPct((p / q.price - 1) * 100) : ''; };
        // desde quando o Claude mantém esta decisão (since, do publicar) e o que dizia antes (was)
        const iso = manda && /^\d{4}-\d{2}-\d{2}$/.test(c.since || '') ? c.since : '', hj = todayLocal();
        const dias = iso ? Math.max(0, Math.round((Date.parse(hj) - Date.parse(iso)) / DAY)) : null;
        return {
            d: decIn(k), own: owns(k),
            desde: iso ? (dias === 0 ? 'hoje' : dias === 1 ? 'ontem' : `${iso.slice(8, 10)}/${iso.slice(5, 7)}${iso.slice(0, 4) !== hj.slice(0, 4) ? '/' + iso.slice(0, 4) : ''}`) : '',
            dias, era: iso && typeof c.was === 'string' && Object.prototype.hasOwnProperty.call(FAMS, c.was) ? c.was : '',
            cat: manda ? c.cat : '', risk: manda ? c.risk : '', nc: clNews(c), irs: irsTxt(k, q, manda ? c : null, hzOf(k)),
            src: manda ? (c.old ? `Análise do Claude de ${de} · último comentário a este ativo` : `Análise do Claude · ${clWhen()}`) : `Média das fontes · ${clDoc() ? 'o Claude não analisou este ativo' : claudeOn() ? 'ainda sem análise do Claude' : 'a análise do Claude liga-se em Ajustes'}`,
            act: manda && c.action && c.action.trim().toLowerCase() !== lbl.toLowerCase() ? c.action : '',
            // o porquê: o do Claude; sem ele, o da regra automática quando é ela que aponta para o mesmo lado
            why: manda ? c.why : alg && FAMS[alg.key] === dec.fam ? alg.text : '', plan: manda ? c.plan : '', algWhy: manda ? c.algWhy : '',
            // no que já tem, a entrada é onde reforçar
            lv: manda ? [['entry', owns(k) ? 'Reforçar' : 'Entrada'], ['target', 'Alvo'], ['stop', 'Stop']].filter(([f]) => fin(clPx(k, q, c[f]))).map(([f, l]) => ({ f, l, px: fmtPx(clPx(k, q, c[f]), REG[k], q.currency), d: dist(c[f]) })) : [],
            anD: cons && fin(cons.target) && fin(cons.price) && cons.price > 0 ? (cons.target / cons.price - 1) * 100 : null,
            nn: n && n.items ? Math.min(8, n.items.length) : 0,
            hoje: moverWhy(k), desce: fin(q.changePct) && q.changePct < 0,
            ev: eventsOf(k).filter((e) => inDays(e.ms) <= 21).map((e) => ({ t: e.type, q: whenTxt(inDays(e.ms)), d: dm(e.ms) })),
        };
    }
    // os pormenores de cada fonte, dobrados por baixo da decisão: a convicção do Claude por prazo, os analistas, os
    // sinais automáticos (o sinal, as pontuações por prazo com as razões, o desconto) e os impostos
    function decFold(k, q) {
        const c = claudeFor(k), facts = factsHtml(k);
        const conv = c ? HZ.filter(([h]) => fin(c[h])).map(([h, l]) => `<div class="cv"><small>${l} prazo</small>${scoreBar({ score: c[h], tone: scoreTone(c[h]) })}</div>`).join('') : '';
        return `<details class="auto sh-auto" data-fold="sheet-auto" ${foldAttr('sheet-auto')}><summary>Pormenores de cada fonte<small>o que cada uma viu, e os impostos</small></summary>
            ${conv ? `<div class="box cl-box"><h3>Claude <small>convicção por prazo</small></h3><div class="cl-conv" role="group" aria-label="Convicção do Claude por prazo">${conv}</div></div>` : ''}
            ${consBox(k)}${fundBox(k)}${algoAdvice(k, q)}${techBox(k)}${discountBox(k, q)}
            ${facts.trim() ? `<div class="box fx-box"><h3>Impostos e dividendos</h3>${facts}</div>` : ''}</details>`;
    }
    function consBox(k) {
        const c = CONS[k];
        if (!c || c.none || c.error || !CONS_LBL[c.key] || !(c.n > 0)) return '';
        const f = CONS_FAM[c.key], tone = f > 0 ? 'up' : f < 0 ? 'down' : 'flat', q = qv(k);
        const v = Array.isArray(c.votes) ? c.votes.map((x) => Math.max(0, +x || 0)) : null, tot = v ? v.reduce((a, b) => a + b, 0) : 0;
        const cp = tot ? v[0] + v[1] : 0, mt = tot ? v[2] : 0, vd = tot ? v[3] + v[4] : 0;
        const pc = (x) => `${Math.round((x / tot) * 100)} %`;
        // a barra (as recomendações deste mês, das cinco categorias) e a legenda com as mesmas cores, uma por categoria
        const CAT = ['compra forte', 'comprar', 'manter', 'vender', 'venda forte'];
        const bar = tot ? `<div class="cons-bar" role="img" aria-label="${cp} compram, ${mt} mantêm, ${vd} vendem">${v.map((x, i) => x ? `<i class="c${i}" style="flex:${x}"></i>` : '').join('')}</div>
            <div class="cons-leg">${v.map((x, i) => x ? `<span><i class="c${i}"></i>${x} ${CAT[i]} · ${pc(x)}</span>` : '').join('')}${vd ? '' : '<small>ninguém diz vender</small>'}</div>
            ${fin(c.mean) ? `<div class="adv-meta">Nota média <b>${String(Math.round(c.mean * 10) / 10).replace('.', ',')}</b>, numa escala de 1 (compra forte) a 5 (venda forte).</div>` : ''}` : '';
        // o preço-alvo a 12 meses: na moeda deles e, se a app mostra noutra, convertido pelo preço de hoje
        let alvo = '';
        if (fin(c.target) && fin(c.price) && c.price > 0) {
            const d = (c.target / c.price - 1) * 100, conv = q.currency && c.currency && q.currency !== c.currency && fin(q.price) && q.price > 0 ? q.price / c.price : null;
            const em = (x) => (conv ? `${fmtPx(x * conv, REG[k], q.currency)} <small>(${fmtPx(x, REG[k], c.currency)})</small>` : fmtPx(x, REG[k], c.currency));
            alvo = `<div class="adv-meta">Preço-alvo médio a 12 meses${c.n > 0 ? `, de ${c.n} ${c.n === 1 ? 'analista' : 'analistas'}` : ''}: <b class="num">${em(c.target)}</b> <span class="${toneOf(d)}-t">${fmtPct(d)}</span> face a hoje${fin(c.low) && fin(c.high) ? ` · o mais baixo ${em(c.low)}, o mais alto ${em(c.high)}` : ''}.</div>`
                + (f > 0 && d < 0 ? '<div class="adv-meta cons-av">Dizem comprar, mas o preço já passou o alvo médio deles: a subida que esperavam já aconteceu.</div>'
                    : f < 0 && d > 0 ? '<div class="adv-meta cons-av">Dizem vender, mas o alvo médio está acima do preço de hoje.</div>' : '');
        }
        // desde o conector 1.8.0: para onde vão as recomendações, as revisões das estimativas e as surpresas dos resultados
        const v3 = Array.isArray(c.votes3) ? c.votes3.map((x) => Math.max(0, +x || 0)) : null, t3 = v3 ? v3.reduce((a, b) => a + b, 0) : 0;
        const tend = tot && t3 ? `<div class="adv-meta">Há 3 meses, <b>${Math.round(((v3[0] + v3[1]) / t3) * 100)} %</b> diziam comprar; agora <b>${Math.round((cp / tot) * 100)} %</b>.</div>` : '';
        const rv = c.rev && fin(c.rev.up) && fin(c.rev.down) ? c.rev : null, su = c.sur && c.sur.n > 0 ? c.sur : null;
        const rev = rv && (rv.up + rv.down > 0 || fin(rv.chg)) ? `<div class="adv-meta">Estimativas de lucro deste ano: ${rv.up + rv.down > 0 ? `<b>${rv.up}</b> ${rv.up === 1 ? 'analista subiu' : 'analistas subiram'} e <b>${rv.down}</b> ${rv.down === 1 ? 'desceu' : 'desceram'} em 30 dias` : 'ninguém as mexeu em 30 dias'}${fin(rv.chg) ? `; em 90 dias a estimativa mudou <span class="${toneOf(rv.chg * 100)}-t">${fmtPct1(rv.chg * 100)}</span>` : ''}.</div>` : '';
        const sur = su ? `<div class="adv-meta">Resultados: acima do esperado em <b>${su.beats} de ${su.n}</b> ${su.n === 1 ? 'trimestre' : 'trimestres'}${fin(su.avg) ? `, em média <span class="${toneOf(su.avg * 100)}-t">${fmtPct1(su.avg * 100)}</span>` : ''}.</div>` : '';
        return `<div class="box cons-box"><h3>Analistas <small>Yahoo Finance</small></h3>
            <div class="adv-act ${tone}-t">${CONS_LBL[c.key]} <small class="cons-n">${tot ? `${tot} ${tot === 1 ? 'recomendação' : 'recomendações'} este mês` : `consenso de ${c.n} ${c.n === 1 ? 'analista' : 'analistas'}`}</small></div>
            ${bar}${tend}${alvo}${rev}${sur}</div>`;
    }
    // um fundo por dentro (o conector 1.8.0): quanto valem as empresas que tem, o custo por ano e as maiores posições
    function fundBox(k) {
        const fd = CONS[k] && !CONS[k].error ? CONS[k].fund : null;
        if (!fd) return '';
        const n1 = (x) => NF({ maximumFractionDigits: 1 }).format(x), top = Array.isArray(fd.top) ? fd.top.filter((x) => Array.isArray(x) && fin(x[1])) : [];
        return `<div class="box fund-box"><h3>O fundo por dentro <small>Yahoo Finance</small></h3>
            ${fin(fd.pe) ? `<div class="adv-meta">As empresas do fundo valem <b>${n1(fd.pe)}</b> vezes os lucros (P/E)${fin(fd.pb) ? ` e <b>${n1(fd.pb)}</b> vezes o valor contabilístico` : ''}.</div>` : ''}
            ${fin(fd.ter) ? `<div class="adv-meta">Custo: <b>${NF({ minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(fd.ter * 100)} %</b> por ano.</div>` : ''}
            ${top.length ? `<div class="adv-meta">Maiores posições: ${top.map(([n, w]) => `${esc(n)} ${n1(w * 100)} %`).join(' · ')}.</div>` : ''}</div>`;
    }
    // o sinal automático (regras fixas de analise.js), nos pormenores: a ação, o plano em preços e quando a ideia falha
    function algoAdvice(k, q) {
        const r = AN[k];
        if (!r || !r.advice || !buyable(k)) return '';
        const a = r.advice;
        const fmt = (price) => fmtPx(lvPx(k, q, price), REG[k], q.currency);
        const al = rotulo(a.key, owns(k)) || a.action;
        return `<div class="box algo-box"><h3>Sinal automático</h3><div class="adv-act ${a.tone}-t">${esc(al)}</div>${nuance(al, a.action)}
            <div class="adv-txt">${esc(a.text)}</div>
            ${a.plan.length ? `<ul class="adv-plan">${a.plan.map((x) => `<li><span>${esc(x.t)}</span><b class="num">${fmt(x.price)}</b></li>`).join('')}</ul>` : ''}
            ${a.invalid ? `<div class="adv-meta">A ideia falha se fechar abaixo de <b class="num">${fmt(a.invalid)}</b></div>` : ''}
            ${a.size ? `<div class="adv-meta">Tamanho: ${esc(a.size)}</div>` : ''}
            <div class="adv-meta faint">Regras fixas: tendência, desconto e níveis.</div></div>`;
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
            budget: +cfg.budget, pmSum: pmSum(), strategy: cfg.strategy, funds: cfg.funds.map(nm), coreFund: cfg.coreFund, cryptoPct: +cfg.cryptoPct, cryptoMix: cfg.cryptoMix,
            crypto: CRYPTO.map((c) => nm('c:' + c.id)), holdings: cfg.holdings, profile: cfg.profile, saveDays: cfg.saveDays, jid: cfg.jid,
            owner: cfg.owner, claude: cfg.claude, others: st.others, stats: STATS, runAt: r && r.at ? dtLbl(r.at) : '', share: shareLink(), meus: myList().map(nameOf),
            fs: cfg.fs, theme: cfg.theme, eur: cfg.eur, fiat: cfg.fiat, alertPct: +cfg.alertPct, alertScope: cfg.alertScope,
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
                    ${pmSum() > 0 ? `<div id="f-budget" class="inp ro num">${pmSum()} €</div><div class="hint">É a soma do «€ por mês» de cada ativo na Carteira (O que tens e as tuas compras): muda-se lá.</div>` : `<input id="f-budget" class="inp" type="number" inputmode="decimal" min="0" step="50" data-cfg="budget" value="${+cfg.budget || ''}" placeholder="ex.: 900">`}</div>
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
                    <div class="hint">A TR executa os planos de poupança nos dias 2, 9, 16 e 23 (sem custos; dá para alterar até à véspera). Com 2 dias, o valor do mês divide-se a meio${budgetOf() ? ` (${fmtPx(budgetOf() / cfg.saveDays.length, { decimals: 0 }, 'EUR')} por execução)` : ''}. Na véspera, o Resumo do dia diz quanto pôr em cada plano.</div></div>
                <div><label>Diário das sugestões</label><div class="hint">Guardado no teu conector com o código <code class="sel">${esc(cfg.jid)}</code>. Se reinstalares a app, cola aqui o código para recuperar o histórico.${cfg.owner ? ' É também a chave da tua app de dono: não o mostres a ninguém.' : ''}</div>
                    <div class="inl" style="margin-top:6px"><input id="f-jid" class="inp" type="text" autocomplete="off" spellcheck="false" placeholder="código do diário"><button type="button" class="btn sm" data-act="jid">Usar</button></div></div>
            </div></section>
        ${claudeSection()}
        <section class="sec"><div class="sec-h"><h2>Preferências</h2></div>
            <div class="form">
                <div><label>Tamanho da letra</label><div class="seg prof">${[['n', 'Normal'], ['l', 'Grande'], ['xl', 'Muito grande']].map(([v, l]) => `<button type="button" data-fs="${v}" class="${(cfg.fs || 'n') === v ? 'on' : ''}"><b>${l}</b></button>`).join('')}</div>
                    <div class="hint">Segue também o tamanho de texto do iPhone (Definições → Ecrã e brilho → Tamanho do texto).</div></div>
                <div><label>Cores</label><div class="seg prof">${[['auto', 'Automático'], ['light', 'Dia'], ['dark', 'Noite']].map(([v, l]) => `<button type="button" data-thm="${v}" class="${(cfg.theme || 'auto') === v ? 'on' : ''}"><b>${l}</b></button>`).join('')}</div>
                    <div class="hint">Automático: claro de dia e escuro à noite, como o iPhone (Definições → Ecrã e brilho → Automático).</div></div>
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
        sheetKey = k; sheetRange = { '1w': '5d', '1m': '1mo', '1y': '1y', '5y': '5y', all: '5y' }[perA()] || '1d'; sheetPts = null;
        loadConsensus(k);
        if (REG[k] && REG[k].kind === 'crypto') loadCryptoGlobal(); // o Fear & Greed, para o sentimento da decisão
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
    // Em qualquer parte, como na TR: no gráfico (para baixo puxa; para o lado é o dedo nos preços), no fundo escuro e,
    // com o conteúdo descido, ao subir até ao topo e continuar a puxar no mesmo gesto.
    (function swipeToClose() {
        const sh = $('#mk-sheet'), c = $('#mk-sheet-card'), bg = $('.mk-sheet-bg');
        // o gesto: null (ainda não se sabe), 'x' (para o lado), 'ler' (a deslizar o conteúdo) ou 'puxa'
        let y0 = null, x0 = 0, yAnt = 0, dy = 0, t0 = 0, modo = null, naFolha = true;
        sh.addEventListener('touchstart', (e) => {
            if (e.touches.length !== 1) { y0 = null; return; }
            y0 = yAnt = e.touches[0].clientY; x0 = e.touches[0].clientX; dy = 0; t0 = e.timeStamp; modo = null; naFolha = c.contains(e.target);
        }, { passive: true });
        sh.addEventListener('touchmove', (e) => {
            if (y0 == null) return;
            const y = e.touches[0].clientY, mx = e.touches[0].clientX - x0, desce = y > yAnt;
            yAnt = y; dy = y - y0;
            if (modo == null) {
                if (Math.abs(dy) < 7 && Math.abs(mx) < 7) return;
                modo = Math.abs(mx) > Math.abs(dy) ? 'x' : dy > 0 && (!naFolha || c.scrollTop <= 0) ? 'puxa' : 'ler';
            }
            if (modo === 'x') return;
            // a subir o conteúdo até ao topo e a continuar a puxar: passa a fechar, a contar daqui
            if (modo === 'ler') { if (!(desce && c.scrollTop <= 0)) return; modo = 'puxa'; y0 = y; t0 = e.timeStamp; dy = 0; }
            st.puxaFolha = true;
            if (e.cancelable) e.preventDefault();
            const d = OG ? OG.segue(OG.FECHAR, dy) : Math.max(0, dy);
            c.style.transition = 'none'; c.style.transform = `translateY(${d}px)`;
            bg.style.transition = 'none'; bg.style.opacity = String(OG ? OG.opac(d) : 1);
        }, { passive: false });
        const end = (e) => {
            if (y0 == null) return;
            const era = modo === 'puxa'; y0 = null; modo = null; st.puxaFolha = false;
            if (!era) return;
            if (OG && OG.fim(OG.FECHAR, dy, e.timeStamp - t0)) { closeSheet(true); return; }
            c.style.transition = 'transform .2s ease-out'; c.style.transform = '';
            bg.style.transition = 'opacity .2s'; bg.style.opacity = '';
        };
        sh.addEventListener('touchend', end);
        sh.addEventListener('touchcancel', end);
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
    // série do dia sem conversão de moeda: a da bolsa com o negócio mais recente (Munique ou Düsseldorf), como no Painel
    function daySeries(k) {
        const q0 = Q[k], lv = liveOf(k);
        if (lv && lv.series && lv.series.length > 1 && (lv.time || 0) > (q0.time || 0)) return mergeDay(q0.series, lv.series);
        return q0.series;
    }
    const SC = new Map(); // os gráficos da ficha já pedidos nesta sessão (ativo|período → { t, pts })
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
            else if (range === '1d' && Q[k] && Q[k].series && Q[k].series.length > 1) {
                pts = daySeries(k);
                // o do instantâneo (da última vez) aparece logo; o de agora vem a seguir
                if (Q[k].stale && cfg.proxy) px(`/quotes?symbols=${encodeURIComponent(k)}&range=1d`, 20000).then((r) => {
                    const q = r.quotes && r.quotes[0];
                    if (id === sheetLoadId && q && !q.error && q.series && q.series.length > 1) { sheetPts = q.series; renderSheetPrice(); drawSheetChart(); }
                }).catch(() => {});
            }
            else if (range === '1y' && D[k]) pts = D[k];
            // o que o Painel já tem (as séries da semana e do mês) ou o que se pediu há menos de 10 min: aparece logo
            else if (range === '5d' && PS['1w'][k] && PS['1w'][k].length > 1) pts = PS['1w'][k];
            else if (range === '1mo' && PS['1m'][k] && PS['1m'][k].length > 1) pts = PS['1m'][k];
            else if (SC.has(k + '|' + range) && now() - SC.get(k + '|' + range).t < 10 * 60000) pts = SC.get(k + '|' + range).pts;
            else { const r = await px(`/quotes?symbols=${encodeURIComponent(k)}&range=${range}`, 20000); const q = r.quotes && r.quotes[0]; if (!q || q.error) throw new Error(q && q.error || 'sem dados'); pts = q.series; SC.set(k + '|' + range, { t: now(), pts }); }
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
        const n = pts.length, t0 = pts[0][0], t1 = pts[n - 1][0], porT = !o.byIdx && t1 > t0, ef = o.extFrom;
        const geo = viva.geo();
        const X = (i) => (porT ? (pts[i][0] - t0) / (t1 - t0) : i / (n - 1)) * geo.xr;
        const Y = (v, gg = viva.geo()) => gg.topo + (gg.hi - v) / Math.max(1e-12, gg.hi - gg.lo) * gg.alt;
        sheetDraw = { X, Y, w: geo.w, h: geo.h };
        const vals = pts.map((p) => p[1]), mx = Math.max(...vals), mn = Math.min(...vals), a = REG[sheetKey], cur = o.q.currency, hv = o.hover, tone = o.tone;
        viva.sobre = (g, gg) => {
            if (ef) extVeil(g, (X(ef - 1) + X(ef)) / 2, gg.w, gg.h, o.extKind);
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
    // a parte fora de horas do gráfico: mais clara (o fundo da ficha por cima, a 55%), a tracejado o fim da sessão e o nome
    function extVeil(g, x, w, h, kind) {
        g.save();
        g.globalAlpha = 0.55; g.fillStyle = COL.bg2 || '#111823'; g.fillRect(x, 0, w - x, h);
        g.globalAlpha = 1; g.strokeStyle = COL.muted; g.lineWidth = 1; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke();
        const lbl = kind === 'pre' ? 'pré-abertura' : 'pós-fecho';
        g.font = '600 10px system-ui, -apple-system, sans-serif'; g.fillStyle = COL.muted; g.textAlign = 'left'; g.textBaseline = 'top';
        g.fillText(lbl, Math.min(x + 4, w - g.measureText(lbl).width - 2), 2);
        g.restore();
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
        // hoje, com a bolsa fechada: o que se negociou antes da abertura ou depois do fecho vem a seguir (os pontos lado a lado,
        // sem o buraco da noite)
        const ext = sheetRange === '1d' && REG[sheetKey].kind !== 'crypto' ? extOf(sheetKey) : null, n0 = pts.length;
        if (ext) for (const [t, v] of ext.series) if (t > pts[pts.length - 1][0]) pts.push([t, v * f]);
        const extFrom = ext && pts.length > n0 ? n0 : 0;
        const first = pts[0][1], lastv = pts[pts.length - 1][1];
        const base = sheetRange === '1d' && REG[sheetKey].kind !== 'crypto' ? q.prevClose : first;
        const tone = toneOf(sheetRange === '1d' ? q.changePct ?? (lastv / first - 1) * 100 : (lastv / first - 1) * 100);
        const byIdx = (sheetRange !== '1d' && !SHORT_R[sheetRange]) || !!extFrom;
        const viva = window.GraficoOnda && GraficoOnda.ok ? GraficoOnda.ligar(cv) : null;
        if (viva) desenhaViva(viva, cv, pts, { base, tone, byIdx, hover, q, extFrom, extKind: ext && ext.kind });
        else {
            sheetDraw = drawLine(cv, pts, { tone, base, width: 2, pad: 14, byIndex: byIdx });
            if (sheetDraw && extFrom) extVeil(sheetDraw.g, (sheetDraw.X(extFrom - 1) + sheetDraw.X(extFrom)) / 2, sheetDraw.w, sheetDraw.h, ext.kind);
        }
        if (sheetDraw) sheetDraw.n = pts.length;
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
            const b = extFrom && hover >= extFrom ? ext.ref * f : base; // fora de horas: face ao último fecho
            if (tip) tip.innerHTML = `<b class="num">${fmtPx(p[1], REG[sheetKey], q.currency)}</b> · ${esc(dateLbl(p[0], ['15m', '1h', '4h', '1d', '5d', '1mo'].includes(sheetRange)))}${extFrom && hover >= extFrom ? (ext.kind === 'pre' ? ' · pré-abertura' : ' · pós-fecho') : ''} · <span class="${toneOf((p[1] / b - 1) * 100)}-t">${fmtPct((p[1] / b - 1) * 100)}</span>`;
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
        const a = REG[k], q = qv(k), r = AN[k], n = NEWS[k], cl = claudeFor(k), dec = decOf(k);
        const fu = CONS[k] && !CONS[k].error ? CONS[k].f : null; // os fundamentos da empresa (vêm com o consenso)
        const following = cfg.watch.includes(k) || cfg.funds.includes(k);
        const stat = (l, v) => `<div><small>${l}</small><b class="num">${v}</b></div>`;
        const box = $('#mk-sheet-card');
        const scroll = box.scrollTop;
        box.innerHTML = `<div class="grab"></div>
            <div class="d-head"><div><h2 id="mk-sheet-title">${esc(nameOf(k))}</h2><div class="d-sub">${esc([a.kind === 'crypto' ? a.sym + '/' + cfg.fiat : a.sym, q.venue || q.exchange, q.open === false ? 'mercado fechado' : q.open ? 'mercado aberto' : ''].filter(Boolean).join(' · '))}</div></div>
                <button type="button" class="mk-ibtn" data-act="close" aria-label="Fechar"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
            <div class="d-px" id="d-px"></div>
            <div class="d-ext" id="d-ext" hidden></div>
            <div class="d-tip" id="d-tip"></div>
            <div class="d-chart"><canvas id="d-cv"></canvas><div class="d-axis num" id="d-axis"></div><div class="loading" id="d-load">A carregar…</div></div>
            <div class="ranges">${RANGE_LBL.map(([v, l]) => `<button type="button" data-range="${v}" class="${sheetRange === v ? 'on' : ''}">${l}</button>`).join('')}</div>
            <div class="d-ext d-rng" id="d-rng" hidden></div>
            ${perfRow(k, q)}
            ${dec ? AO.ecra.decisao(decSnap(k, q, dec)) + decFold(k, q) : cl ? `${claudeBox(k, q)}<details class="auto sh-auto" data-fold="sheet-auto" ${foldAttr('sheet-auto')}><summary>Sinais automáticos (algoritmo)<small>regras fixas: tendência, momento, desconto</small></summary>
                ${techBox(k)}${discountBox(k, q)}</details>` : ''}
            <div class="stats">
                ${stat('Máx. do dia', fmtPx(q.dayHigh, a, q.currency))}${stat('Mín. do dia', fmtPx(q.dayLow, a, q.currency))}
                ${a.kind === 'crypto' ? stat('Volume 24 h', fmtBig(q.volume) + ' ' + cfg.fiat) : stat('Fecho anterior', fmtPx(q.prevClose, a, q.currency))}
                ${a.kind === 'crypto' ? stat('Variação 24 h', fmtPct(q.changePct)) : stat('Volume', fmtBig(q.volume))}
                ${fin(q.high52) ? stat('Máx. 52 sem.', fmtPx(q.high52, a, q.currency)) + stat('Mín. 52 sem.', fmtPx(q.low52, a, q.currency)) : ''}
                ${r ? stat('RSI (14)', fin(r.metrics.rsi) ? Math.round(r.metrics.rsi) : '—') + stat('Volatilidade', fin(r.metrics.vol) ? Math.round(r.metrics.vol * 100) + '%/ano' : '—') : ''}
                ${fu && fin(fu.pe) && fu.pe > 0 ? stat('P/E esperado', NF({ maximumFractionDigits: 1 }).format(fu.pe)) : ''}${fu && fin(fu.cr) ? stat('Vendas num ano', fmtPct1(fu.cr * 100)) : ''}${fu && fin(fu.mg) ? stat('Margem de lucro', fmtPct1(fu.mg * 100).replace('+', '')) : ''}
            </div>
            ${cl || dec ? '' : techBox(k)}
            ${a.kind === 'energy' || k === 'GC=F' ? '<p class="note" style="margin:-4px 2px 14px">Contrato de futuros (referência). Na Trade Republic não se compra diretamente; existem ETC, com custos de rolagem a prazo.</p>' : ''}
            ${levelsBox(k, q)}
            ${cl || dec ? '' : discountBox(k, q)}
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
        renderSheetExt();
        requestAnimationFrame(() => drawSheetChart());
        bindChartHover();
    }
    function bindChartHover() {
        const cv = $('#d-cv');
        if (!cv) return;
        const at = (ev) => {
            if (st.puxaFolha || !sheetPts || sheetPts.length < 2 || !sheetDraw) return;
            const x = ev.clientX - cv.getBoundingClientRect().left;
            let best = 0, bd = Infinity;
            for (let i = 0; i < (sheetDraw.n || sheetPts.length); i++) { const d = Math.abs(sheetDraw.X(i) - x); if (d < bd) { bd = d; best = i; } }
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
            const el = OG && e.target.closest && e.target.closest('.sw-wrap');
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
            dx = Math.max(-w.clientWidth, OG.segue(OG.APAGAR, base + mx, w.clientWidth));
            const r = w.querySelector('.row'); r.style.transition = 'none'; r.style.transform = `translateX(${dx}px)`;
            // o botão vermelho cresce com o arrasto; passado o limite, largar apaga
            const del = w.querySelector('.sw-del'); del.style.width = Math.max(W, -dx) + 'px'; del.classList.toggle('vai', -dx > limite(w));
        }, { passive: true });
        // estas linhas mostram primeiro o botão (como no Mail do iPhone): só arrastar até mais de metade retira logo,
        // com "Desfazer" (as outras linhas das apps apagam a 35 %, o ponto do motor comum)
        const limite = (el) => Math.min(220, el.clientWidth * 0.55);
        document.addEventListener('touchend', () => {
            if (!w) return;
            const r = w.querySelector('.row'), del = w.querySelector('.sw-del');
            if (mode === 'h') {
                st.noClick = now() + 400; // o arrasto não abre a ficha
                if (-dx > limite(w)) { const b = del.dataset; w = null; mode = ''; st.touching = false; hideAsset(b.hide, b.grp); return; }
                const open = dx < -W / 2;
                r.style.transition = ''; r.style.transform = ''; del.style.width = ''; del.classList.remove('vai');
                w.classList.toggle('open', open); st.swipe = open ? w.dataset.swk : null;
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

    // a lista dos Ajustes: arrastar uma linha para a esquerda retira-a (com "Desfazer"); a pega ≡ continua a reordenar
    (() => {
        let w = null, x0 = 0, y0 = 0, t0 = 0, dx = 0, mode = '';
        document.addEventListener('touchstart', (e) => {
            const el = OG && e.target.closest && e.target.closest('.wl-i');
            if (!el || e.target.closest('.wl-h') || e.touches.length !== 1) { w = null; return; }
            w = el; x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; t0 = e.timeStamp; dx = 0; mode = '';
        }, { passive: true });
        document.addEventListener('touchmove', (e) => {
            if (!w) return;
            const mx = e.touches[0].clientX - x0, my = e.touches[0].clientY - y0;
            if (!mode && (Math.abs(mx) > 8 || Math.abs(my) > 8)) mode = Math.abs(mx) > Math.abs(my) && mx < 0 ? 'h' : 'v';
            if (mode !== 'h') return;
            dx = OG.segue(OG.APAGAR, mx, w.clientWidth);
            w.classList.add('sw'); w.classList.toggle('vai', OG.arma(dx, w.clientWidth));
            w.style.transition = 'none'; w.style.transform = `translateX(${dx}px)`;
        }, { passive: true });
        const fim = (e) => {
            if (!w) return;
            const el = w; w = null;
            if (mode !== 'h') return;
            st.noTap = now() + 400;
            if (OG.fim(OG.APAGAR, dx, e.timeStamp - t0, el.clientWidth)) { hideAsset(el.dataset.wk, 'list'); return; }
            el.style.transition = 'transform .2s ease-out'; el.style.transform = '';
            setTimeout(() => el.classList.remove('sw', 'vai'), 200);
        };
        document.addEventListener('touchend', fim, { passive: true });
        document.addEventListener('touchcancel', fim, { passive: true });
    })();

    // ---------- mudar de separador ----------
    const TABS = ['painel', 'destaques', 'analise', 'carteira', 'ajustes'];
    function irPara(tab) {
        cfg.tab = tab; saveCfg(); window.scrollTo(0, 0);
        if (tab === 'destaques' && !MOVERS) loadMovers();
        render();
    }
    // arrastar para a esquerda ou para a direita em qualquer parte do ecrã: o separador ao lado (como nas apps do iPhone).
    // Ficam de fora o que já usa o gesto para o lado: as linhas que se apagam (para a esquerda), os gráficos com o dedo,
    // as barras de deslizar, os campos e o que desliza para o lado (as tabelas largas).
    (() => {
        const body = $('#mk-body');
        let x0 = null, y0 = 0, t0 = 0, dx = 0, mode = '', linha = null, vai = false;
        const deslizaX = (el) => { for (let a = el; a && a !== body; a = a.parentElement) { const o = getComputedStyle(a).overflowX; if ((o === 'auto' || o === 'scroll') && a.scrollWidth > a.clientWidth + 1) return true; } return false; };
        document.addEventListener('touchstart', (e) => {
            x0 = null;
            const t = e.target;
            if (vai || e.touches.length !== 1 || !$('#mk-sheet').hidden || !body.contains(t) || !t.closest) return;
            if (t.closest('input, select, textarea, canvas, .sim-g, .wl-h, .sw-wrap.open') || deslizaX(t)) return;
            linha = t.closest('.sw-wrap, .wl-i');
            x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; t0 = e.timeStamp; dx = 0; mode = '';
        }, { passive: true });
        document.addEventListener('touchmove', (e) => {
            if (x0 == null) return;
            const mx = e.touches[0].clientX - x0, my = e.touches[0].clientY - y0;
            if (!mode) {
                if (Math.abs(mx) < 10 && Math.abs(my) < 10) return;
                // o motor comum decide: para o lado (bem mais do que para baixo); numa linha que se apaga, para a esquerda é dela
                const c = OG ? OG.SEPARADORES | (linha ? OG.LINHA : 0) | (st.pulling ? OG.A_PUXAR : 0) : 0;
                mode = OG && OG.modo(c, mx, my) === OG.SEPARADOR ? 'h' : 'v';
            }
            if (mode !== 'h') return;
            const i = TABS.indexOf(cfg.tab), tem = mx < 0 ? i < TABS.length - 1 : i > 0;
            dx = mx; // (a decisão no fim conta o dedo; o ecrã segue-o com resistência)
            body.style.transition = 'none'; body.style.transform = `translateX(${OG.segue(OG.SEPARADOR, mx, 0, tem)}px)`;
        }, { passive: true });
        const fim = (e) => {
            if (x0 == null) return;
            x0 = null;
            if (mode !== 'h') return;
            st.noTap = now() + 400;
            const i = TABS.indexOf(cfg.tab), j = i + (dx < 0 ? 1 : -1);
            if (j < 0 || j >= TABS.length || !OG.fim(OG.SEPARADOR, dx, e.timeStamp - t0)) {
                body.style.transition = 'transform .2s ease-out'; body.style.transform = ''; return;
            }
            // sai para o lado do dedo e o novo entra do outro lado
            const lado = dx < 0 ? -1 : 1;
            vai = true;
            body.style.transition = 'transform .14s ease-in'; body.style.transform = `translateX(${lado * innerWidth}px)`;
            setTimeout(() => {
                irPara(TABS[j]);
                body.style.transition = 'none'; body.style.transform = `translateX(${-lado * innerWidth * 0.35}px)`;
                requestAnimationFrame(() => requestAnimationFrame(() => {
                    body.style.transition = 'transform .2s cubic-bezier(.2, .8, .2, 1)'; body.style.transform = '';
                    setTimeout(() => { body.style.transition = ''; vai = false; }, 220);
                }));
            }, 140);
        };
        document.addEventListener('touchend', fim, { passive: true });
        document.addEventListener('touchcancel', fim, { passive: true });
        // o arrasto não carrega no que estava debaixo do dedo
        document.addEventListener('click', (e) => { if (st.noTap && now() < st.noTap && body.contains(e.target)) { e.stopPropagation(); e.preventDefault(); } }, true);
    })();

    // ---------- ações do utilizador ----------
    function refreshAll() {
        st.lastRefresh = now();
        if (holdingKeys().some((k) => REG[k] && REG[k].kind === 'crypto')) loadCryptoGlobal(); // o Fear & Greed, para a decisão da cripto que tenho
        return Promise.all([pollYahoo(), loadExt(true), loadCryptoSeries(), ws ? null : cryptoREST(), cfg.tab === 'destaques' ? loadMovers() : null, loadClaude().then(() => pedirAnalise('pedido'))])
            .finally(() => scheduleRender());
    }
    // puxar para baixo no topo da página → atualizar (como nas apps do iPhone)
    (() => {
        const ptr = $('#mk-ptr'), body = $('#mk-body');
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
            st.pulling = true; dy = OG ? OG.segue(OG.ATUALIZAR, my) : 0;
            body.style.transition = 'none'; ptr.style.transition = 'none';
            set(dy, OG && OG.fim(OG.ATUALIZAR, dy, 0) ? 'Larga para atualizar' : 'Puxa para atualizar');
        }, { passive: true });
        document.addEventListener('touchend', () => {
            if (y0 == null) return;
            y0 = null;
            if (!st.pulling) return;
            body.style.transition = ''; ptr.style.transition = '';
            if (OG && OG.fim(OG.ATUALIZAR, dy, 0)) {
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
        const t = ev.target.closest('[data-act],[data-open],[data-tab],[data-sort],[data-range],[data-fiat],[data-filter],[data-lim],[data-rm],[data-add],[data-eur],[data-hz],[data-prof],[data-sday],[data-strat],[data-cpct],[data-cmix],[data-hold],[data-lotrm],[data-fs],[data-thm],[data-others],[data-claude],[data-hide],[data-unhide],[data-per],[data-pera],[data-fuel],[data-mv],[data-hzset]');
        if (!t) return;
        const d = t.dataset;
        if (d.tab) { irPara(d.tab); return; }
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
        if (d.strat) { cfg.strategy = d.strat; saveCfg(); postLotsSoon(); render(); return; }
        // o prazo de um ativo, no cartão «Decisão»: no que tem, fica sempre um (por omissão, longo); no que não tem,
        // tocar outra vez no mesmo tira-o
        if (d.hzset && sheetKey && HZ_OK.includes(d.hzset)) { const k = sheetKey, L = { ...lotOf(k) }; L.hz = !owns(k) && L.hz === d.hzset ? undefined : d.hzset; setLots(k, L); return; }
        if (d.cpct != null) { cfg.cryptoPct = +d.cpct; saveCfg(); postLotsSoon(); render(); return; }
        if (d.cmix) { cfg.cryptoMix = d.cmix; saveCfg(); render(); return; }
        if (d.lotrm != null && sheetKey) { const L = lotOf(sheetKey); setLots(sheetKey, { plan: L.plan || '', buys: (L.buys || []).filter((_, i) => i !== +d.lotrm) }); toast('Compra apagada'); return; }
        if (d.mv) {
            const arr = cfg.watch.includes(d.mv) ? cfg.watch : cfg.funds, i = arr.indexOf(d.mv);
            moveTo(arr, i, d.dir === 'top' ? 0 : i + (+d.dir));
            return;
        }
        if (d.fuel) { openFuelSheet(+d.fuel); return; }
        if (d.per) { cfg.per = d.per; saveCfg(); render(); return; }
        if (d.pera) { cfg.perA = d.pera; saveCfg(); render(); return; }
        if (d.hide) { hideAsset(d.hide, d.grp); return; }
        if (d.unhide) { const set = { crypto: CRYPTO.map((c) => 'c:' + c.id), energy: ENERGY.map((e) => e.sym), index: INDICES.map((i) => i.sym) }[d.unhide] || []; cfg.hidden = cfg.hidden.filter((k) => !set.includes(k)); saveCfg(); render(); toast('Lista reposta'); return; }
        if (d.fs) { cfg.fs = d.fs; applyFs(); saveCfg(); render(); return; }
        if (d.thm) {
            // 4.38.3: o aviso do modo escolhido; se a app se reabrir para mudar a barra das horas, aparece depois de abrir
            const aviso = 'Cores: ' + TEMA_NOME[d.thm in TEMA_NOME ? d.thm : 'auto'];
            cfg.theme = d.thm;
            try { sessionStorage.setItem('mk:aviso', aviso); } catch { /* sem onde guardar: fica o aviso de agora */ }
            const reabre = applyTheme(); saveCfg(); render();
            if (!reabre) { try { sessionStorage.removeItem('mk:aviso'); } catch { /* idem */ } toast(aviso); }
            return;
        }
        if (d.hold) { cfg.holdings = cfg.holdings.includes(d.hold) ? cfg.holdings.filter((x) => x !== d.hold) : cfg.holdings.concat(d.hold); saveCfg(); render(); return; }
        if (d.sday) {
            const n = +d.sday;
            cfg.saveDays = cfg.saveDays.includes(n) ? cfg.saveDays.filter((x) => x !== n) : cfg.saveDays.concat(n).sort((a, b) => a - b);
            if (!cfg.saveDays.length) cfg.saveDays = [n];
            // o Claude lê os dias do diário: manda-os já, para a análise seguinte não usar os antigos
            postLotsSoon();
            saveCfg(); render(); return;
        }
        switch (d.act) {
            case 'refresh': refreshAll(); break;
            case 'close': closeSheet(true); break;
            // 4.38.2: a soma da cripto (ou dos fundos) na tabela da carteira abre e fecha os ativos dela
            case 'pf-g': if (d.g === 'cripto' || d.g === 'fundos') { st.fold['pf-' + d.g] = !st.fold['pf-' + d.g]; pfAgora(); } break;
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
            // Carteira: abre «O que tens e as tuas compras» e leva-o à vista
            case 'reg-compra': {
                st.reg = st.reg || {};
                const k = st.reg.k, L0 = lotOf(k), e = numPt(st.reg.e || '');
                let dia = st.reg.d || todayLocal(); if (!ISO_D.test(dia) || dia > todayLocal()) dia = todayLocal();
                if (!REG[k] || !temHoje(L0)) break;
                if (!(e > 0)) { toast('Escreve quantos euros investiste.'); break; }
                const p = pxEm(k, dia);
                if (!fin(p) || p <= 0) { toast('Ainda sem o preço desse dia: tenta daqui a pouco.'); break; }
                const antes = L0.compras || [];
                st.reg.e = ''; st.reg.d = ''; { const i = $('.reg [data-reg="e"]'); if (i) i.value = ''; }
                setLots(k, { ...L0, compras: antes.concat({ d: dia, e: Math.round(e * 100) / 100, q: e / p }) });
                toast(`Compra juntada: ${fmtPx(e, { decimals: 2 }, 'EUR')} de ${nameOf(k)} (${fmtQ(e / p)})`, () => setLots(k, { ...lotOf(k), compras: antes }));
                break;
            }
            // 4.45: ✕ apaga o valor escrito nessa data (volta à sugestão)
            // 4.48: uma entrega extra do PPR (além do mensal): a data e o valor; ✕ apaga
            case 'ppr-add': {
                const x = { ...(st.pprx || {}) }, fd = $('[data-pprx="d"]'), fe = $('[data-pprx="e"]');
                if (fd && fd.value) x.d = fd.value;
                if (fe && String(fe.value).trim()) x.e = fe.value;
                const dia = String(x.d || ''), v = numPt(String(x.e || '').trim() || 'x');
                if (!(ISO_D.test(dia) && dia <= todayLocal())) { toast('Escolhe a data da entrega (até hoje).'); break; }
                if (!(v > 0)) { toast('Escreve o valor da entrega em euros.'); break; }
                const antes = (cfg.ppr || {}).ex;
                cfg.ppr = { ...(cfg.ppr || {}), ex: [...(antes || []), [dia, Math.round(v * 100) / 100]].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)) };
                st.pprx = {}; saveCfg();
                if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
                render();
                toast(`Entrega extra de ${fmtPx(v, { decimals: 2 }, 'EUR')} a ${dmy(dia)}`, () => { cfg.ppr = { ...(cfg.ppr || {}), ex: antes }; saveCfg(); render(); });
                break;
            }
            case 'ppr-rm': {
                const antes = (cfg.ppr || {}).ex || [], i = +d.i;
                if (!(i >= 0 && i < antes.length)) break;
                const [dia, v] = antes[i];
                cfg.ppr = { ...(cfg.ppr || {}), ex: antes.filter((_, j) => j !== i) }; saveCfg(); render();
                toast(`Apagada a entrega de ${fmtPx(+v, { decimals: 2 }, 'EUR')} a ${dmy(dia)}`, () => { cfg.ppr = { ...(cfg.ppr || {}), ex: antes }; saveCfg(); render(); });
                break;
            }
            case 'pp-rm': {
                const k = (st.reg || {}).k, L0 = lotOf(k), tp = d.tp, dia = d.d;
                if (!REG[k] || !temHoje(L0) || !PP_MAPA[tp] || !ISO_D.test(dia || '')) break;
                const antes = L0[PP_MAPA[tp]], m = { ...(antes || {}) };
                delete m[dia];
                setLots(k, { ...L0, [PP_MAPA[tp]]: m });
                toast(`Apagado: ${tp === 'pl' ? 'o plano' : tp === 'ru' ? 'o round up' : 'o saveback'} de ${dmy(dia)} (fica a sugestão)`, () => setLots(k, { ...lotOf(k), [PP_MAPA[tp]]: antes }));
                break;
            }
            case 'reg-acerto': {
                st.reg = st.reg || {};
                const k = st.reg.k, L0 = lotOf(k), txt = String(st.reg.q || '').trim(), qt = numPt(txt);
                if (!REG[k] || !temHoje(L0)) break;
                if (!txt || !(qt >= 0)) { toast('Escreve a quantidade que a TR mostra.'); break; }
                const P = posOf(k), dq = qt - P.q, p = pxEur(k);
                if (Math.abs(dq) < 1e-9) { toast('Já está igual à TR.'); break; }
                if (dq > 0 && !(fin(p) && p > 0)) { toast('Ainda sem o preço de hoje: tenta daqui a pouco.'); break; }
                // o que entrou a mais (arredondamentos, cashback) conta ao preço de hoje, como a TR faz; a menos sai ao preço médio
                const e = dq > 0 ? dq * p : dq * P.avg, antes = L0.compras || [];
                st.reg.q = ''; { const i = $('.reg [data-reg="q"]'); if (i) i.value = ''; }
                setLots(k, { ...L0, compras: antes.concat({ d: todayLocal(), e: Math.round(e * 100) / 100, q: dq, cb: 1 }) });
                toast(`Acertado com a TR: ${dq > 0 ? '+' : '−'}${fmtQ(Math.abs(dq))} de ${nameOf(k)} (${fmtPx(Math.abs(e), { decimals: 2 }, 'EUR')})`, () => setLots(k, { ...lotOf(k), compras: antes }));
                break;
            }
            case 'reg-rm': {
                const L0 = lotOf(d.k), antes = L0.compras || [], i = +d.i;
                if (!REG[d.k] || !(i >= 0) || !antes[i]) break;
                setLots(d.k, { ...L0, compras: antes.filter((_, j) => j !== i) });
                toast('Registo apagado', () => setLots(d.k, { ...lotOf(d.k), compras: antes }));
                break;
            }
            case 'lot-clear': {
                const L = { ...lotOf(d.k) }; if (d.f === 'plan') L.plan = ''; else delete L.qd;
                const i = t.closest('.dt') && t.closest('.dt').querySelector('input'); if (i) i.value = '';
                if (REG[d.k]) setLots(d.k, L); break;
            }
            case 'real-ed': { const d = $('details.real-ed'); if (d) { d.open = true; st.fold['real-ed'] = true; d.scrollIntoView({ behavior: 'smooth', block: 'start' }); } break; }
            // Carteira: colar de uma vez (uma linha por ativo: símbolo, quantidade, preço médio de compra)
            case 'lot-import': {
                const ta = $('#lot-imp'), n = importLots(ta ? ta.value : '');
                toast(n.ok ? `${n.ok} ${n.ok === 1 ? 'posição importada' : 'posições importadas'}${n.bad.length ? ` · não percebi: ${n.bad.join(', ')}` : ''}` : 'Nada importado: uma linha por ativo, ex.: VWCE.DE 5,486463 169,86');
                break;
            }
            case 'sim-hoje': cfg.simHoje = t.dataset.v === '1'; saveCfg(); render(); break;
            case 'sim-carteira': cfg.simStartManual = false; cfg.simBudget = null; saveCfg(); render(); break;
            case 'sim-step': {
                const k = t.dataset.k, d = +t.dataset.d || 0, rg = t.parentElement && t.parentElement.querySelector('.sim-rg'), mn = rg ? +rg.min : 0;
                // o «Já tens» parte do valor da carteira; mexer nele passa a valor à mão
                if (k === 'simStart' && !cfg.simStartManual) { cfg.simStart = Math.round(carteiraHoje().v) || +cfg.simStart || 0; cfg.simStartManual = true; }
                if (k === 'simBudget' && !Number.isFinite(cfg.simBudget)) cfg.simBudget = poupMes();
                const v = (+cfg[k] || 0) + d;
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
        // 4.45: o valor de uma data da poupança periódica (o plano, o round up ou o saveback): grava ao sair do campo
        if (t.dataset && t.dataset.ppv) {
            const k = (st.reg || {}).k, L0 = lotOf(k), tp = t.dataset.ppv, dia = t.dataset.d, txt = String(t.value || '').trim();
            if (!REG[k] || !temHoje(L0) || !PP_MAPA[tp] || !ISO_D.test(dia || '')) return;
            const antes = L0[PP_MAPA[tp]], m = { ...(antes || {}) };
            if (!txt) delete m[dia];
            else { const v = numPt(txt); if (!(v >= 0)) { toast('Escreve um valor em euros.'); return; } m[dia] = Math.round(v * 100) / 100; }
            setLots(k, { ...L0, [PP_MAPA[tp]]: m });
            toast(`${tp === 'pl' ? 'Plano' : tp === 'ru' ? 'Round up' : 'Saveback'} a ${dmy(dia)}: ${txt ? fmtPx(m[dia], { decimals: 2 }, 'EUR') : 'a sugestão'}`, () => setLots(k, { ...lotOf(k), [PP_MAPA[tp]]: antes }));
            return;
        }
        // 4.47: o PPR Evoluir — desde, € por mês, % no Dinâmico e, para acertar com a Fidelidade, as unidades de hoje
        // 4.51: o Fundo Viva — as tuas UP (vazio tira a secção dos números)
        if (t.dataset && t.dataset.fut) {
            const txt = String(t.value || '').trim(), P = { ...(cfg.fut || {}) };
            if (!txt) delete P.up;
            else { const v = numPt(txt); if (!(v > 0)) { toast('Escreve as UP (unidades) do Fundo Viva.'); return; } P.up = v; }
            cfg.fut = P; saveCfg(); loadFUT(true); render(); return;
        }
        if (t.dataset && t.dataset.pprx) { st.pprx = { ...(st.pprx || {}), [t.dataset.pprx]: t.value }; return; }
        if (t.dataset && t.dataset.ppr) {
            const f = t.dataset.ppr, P = { ...(cfg.ppr || {}) }, txt = String(t.value || '').trim();
            if (!['de', 'pm', 'din', 'ur', 'uc'].includes(f)) return;
            if (f === 'de') {
                if (txt && !(ISO_D.test(txt) && txt <= todayLocal())) { toast('Escolhe uma data até hoje.'); return; }
                if (txt) P.de = txt; else delete P.de;
            } else if (!txt) delete P[f];
            else {
                const v = numPt(txt);
                if (!(v >= 0) || (f === 'din' && v > 100)) { toast(f === 'din' ? 'Escreve uma percentagem de 0 a 100.' : 'Escreve um número.'); return; }
                P[f] = v;
            }
            // a data: o campo larga o foco (com ele focado, render() não redesenha) e os valores pedem-se logo
            cfg.ppr = P; saveCfg(); if (t.type === 'date') t.blur(); loadPPR(true); render(); return;
        }
        if (t.dataset && t.dataset.reg) { st.reg = st.reg || {}; st.reg[t.dataset.reg] = t.value; if (t.dataset.reg === 'k') render(); return; }
        if (t.dataset && t.dataset.lot && t.dataset.k && REG[t.dataset.k]) {
            const k = t.dataset.k, L = { ...lotOf(k) };
            const data = /^\d{4}-\d\d-\d\d$/.test(t.value) && t.value <= todayLocal() ? t.value : '';
            if (['qty', 'avg'].includes(t.dataset.lot)) {
                if (extrasOf(k).length) { const P = posOf(k); L.qty = P.q; L.cost = Math.round(P.c * 100) / 100; L.avg = Math.round(P.avg * 1e4) / 1e4; }
                L.at = todayLocal(); L.compras = [];
            }
            if (t.dataset.lot === 'hz') L.hz = HZ_OK.includes(t.value) ? t.value : undefined;
            else if (t.dataset.lot === 'plan') L.plan = data;
            else if (t.dataset.lot === 'qd') L.qd = data || undefined;
            // o teclado do iPhone em português escreve a vírgula: 0,0412 → 0.0412 (e tira os espaços dos milhares)
            else L[t.dataset.lot === 'pm' ? 'pm' : t.dataset.lot === 'qty' ? 'qty' : t.dataset.lot === 'avg' ? 'avg' : 'cost'] = Math.max(0, +String(t.value).replace(/\s/g, '').replace(',', '.') || 0) || undefined;
            // o investido é a quantidade × o preço médio de compra (o que a TR mostra na posição)
            if (['qty', 'avg'].includes(t.dataset.lot)) L.cost = +L.qty > 0 && +L.avg > 0 ? Math.round(+L.qty * +L.avg * 100) / 100 : t.dataset.lot === 'avg' ? undefined : L.cost;
            setLots(k, L); return;
        }
        if (t.dataset && t.dataset.cfg) {
            if (t.dataset.cfg === 'simStart') cfg.simStartManual = true; // mexeu à mão: deixa de seguir a carteira
            if (['budget', 'cryptoPct'].includes(t.dataset.cfg)) postLotsSoon(); // o Claude parte do valor do plano
            cfg[t.dataset.cfg] = ['alertPct', 'budget', 'simBudget', 'simStart', 'simGoal'].includes(t.dataset.cfg) ? Math.max(0, +t.value || 0) : t.dataset.cfg === 'simYears' ? Math.min(60, Math.max(1, Math.round(+t.value || 20))) : t.value;
            saveCfg();
            if (t.dataset.cfg === 'distrito') { cfg.municipio = ''; saveCfg(); FUEL = null; loadFuel(); render(); }
            if (t.dataset.cfg === 'municipio') { FUEL = null; loadFuel(); }
            t.blur(); render();
        }
    });
    document.addEventListener('input', (ev) => {
        if (ev.target.dataset && ev.target.dataset.reg) { st.reg = st.reg || {}; st.reg[ev.target.dataset.reg] = ev.target.value; }
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
    setInterval(() => { if (!document.hidden) loadExt(); }, 2 * 60000);
    setInterval(() => { if (!document.hidden && cfg.tab === 'destaques') loadMovers(); }, 3 * 60000);
    setInterval(() => { if (!document.hidden) loadFuel(); }, 60 * 60000);
    setInterval(() => { if (!document.hidden) loadCalendar(); }, 6 * 60 * 60000);
    setInterval(() => { if (!document.hidden) loadClaude(); }, 60 * 60000);

    // o dia e a noite: claro ou escuro, escolhido em Ajustes ou, em automático, como o iPhone (o index.html já o põe antes
    // do primeiro desenho, para não piscar)
    const mqClaro = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;
    function applyTheme() {
        const t = cfg.theme === 'light' || cfg.theme === 'dark' ? cfg.theme : mqClaro && mqClaro.matches ? 'light' : 'dark', el = document.documentElement;
        if (el.dataset.theme === t && COL.bg2) return;
        el.dataset.theme = t;
        colors(); vivaCores = false;
        const m = document.querySelector('meta[name="theme-color"]');
        if (m) m.setAttribute('content', getComputedStyle(el).getPropertyValue('--bg').trim() || (t === 'light' ? '#ffffff' : '#000000'));
        // 4.37.3: a barra das horas do iPhone também clara de dia — «default» (horas a escuro, sobre claro) no dia e
        // «black-translucent» (horas a branco, sobre a faixa preta) à noite. O iPhone só a lê ao abrir a página: na app
        // instalada, mudar o dia e a noite volta a abri-la (a escolha fica guardada antes); ao arrancar, o index.html já a acertou
        const bar = t === 'light' ? 'default' : 'black-translucent', sb = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
        if (sb && sb.getAttribute('content') !== bar) {
            sb.setAttribute('content', bar);
            if (themeOn && navigator.standalone === true) { saveCfg(); location.reload(); return true; }
        }
        themeOn = true;
    }
    let themeOn = false; // o primeiro applyTheme (ao arrancar) nunca recarrega
    if (mqClaro && mqClaro.addEventListener) mqClaro.addEventListener('change', () => { if (cfg.theme !== 'light' && cfg.theme !== 'dark') { applyTheme(); render(); if (sheetKey && !$('#mk-sheet').hidden) renderSheet(); } });
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
        { let mudou = false; for (const [k, L] of Object.entries(cfg.lots)) if (temHoje(L) && !ISO_D.test(L.at || '')) { L.at = todayLocal(); mudou = true; void k; } if (mudou) saveCfg(); }
        // como a Música: ao abrir outra vez, começa no topo (o iOS repunha o scroll e o título ficava por baixo das horas)
        if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
        if (AO) AO.ready.then(() => { aoOk = true; analyseAll(); scheduleRender(); }).catch((e) => { aoFalhou = true; scheduleRender(); console.error('motor Onda:', e); });
        cfg.tab = 'painel';
        applyFs();
        applyTheme();
        colors();
        migraSbRu();
        render();
        // o aviso das cores que ficou de antes de a app se reabrir (a mudar a barra das horas)
        try { const a = sessionStorage.getItem('mk:aviso'); if (a) { sessionStorage.removeItem('mk:aviso'); setTimeout(() => toast(a), 400); } } catch { /* nada */ }
        startWS();
        startFinnhub();
        // se o WebSocket demorar, mostra logo um preço por REST
        sleep(2500).then(() => { if (st.ws !== 'on' && !st.cryptoAt) cryptoREST(); });
        loadCryptoSeries();
        loadDaily(); // ao mesmo tempo que os preços: a análise não espera por eles
        if (cfg.proxy) { loadClaude(); await pollYahoo(); loadExt(true); loadFuel(); loadCalendar(); if (cfg.tab === 'destaques') loadMovers(); }
        schedule();
    }

    if ('serviceWorker' in navigator && location.protocol === 'https:') {
        // a versão nova chega à primeira: ao voltar à app procura-se uma; quando ela toma conta, a app recarrega-se se
        // acabou de abrir ou de voltar (nos primeiros 20 s), senão na próxima vez que voltar
        const tinha = !!navigator.serviceWorker.controller;
        let reg = null, voltou = now(), falta = false;
        const recarrega = () => { if (now() - voltou < 20000 && !st.touching) location.reload(); else falta = true; };
        navigator.serviceWorker.addEventListener('controllerchange', () => { if (tinha) recarrega(); });
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) return;
            voltou = now();
            if (falta) { location.reload(); return; }
            if (reg) reg.update().catch(() => {});
        });
        window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').then((r) => { reg = r; }).catch(() => {}));
    }

    // para os testes
    window.__mk = { cfg, Q, D, AN, NEWS, st, REG, render, pprAtivos, analyseAll, checkAlerts, mergeDay, PS, version: VERSION, get journal() { return JOURNAL; }, get bt() { return BT; },
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
        panelSnap, panelHtml, perData, claudeFor, taxLine, decIn, decOf, pedirAnalise, clWhen, decSnapOf: (k) => { const d = decOf(k); return d ? decSnap(k, qv(k), d) : null; }, get fuel() { return FUEL; }, set fuel(v) { FUEL = v; },
        // fora de horas (antes da abertura, depois do fecho) e a estimativa para a abertura, com o que aprende
        EXT, S5, extOf, betaOf, projOf, pxTag, pjResolve, rangeOf, volOf, pollYahoo, pfSnap, get pj() { return pjLoad(); }, get deriv() { return DERIV; } };
    boot();
})();
