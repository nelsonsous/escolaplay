// Mercados — motor de análise (sem dependências).
//
// Indicadores técnicos clássicos sobre fechos diários, uma pontuação 0–100
// com as razões em português simples, o "tom" das notícias por palavras-chave
// e o sentimento geral do mercado.
//
// Corre no browser (window.Analise) e em Node (module.exports) para os testes.
// Nada disto prevê o futuro: descreve a tendência e o momento recentes.
(function (root) {
    'use strict';

    const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
    const last = (a) => a[a.length - 1];

    function sma(v, n) {
        if (v.length < n) return null;
        let s = 0;
        for (let i = v.length - n; i < v.length; i++) s += v[i];
        return s / n;
    }

    // Série completa da EMA (o primeiro valor é a SMA dos n primeiros)
    function emaSeries(v, n) {
        if (v.length < n) return [];
        const k = 2 / (n + 1);
        let e = 0;
        for (let i = 0; i < n; i++) e += v[i];
        e /= n;
        const out = [e];
        for (let i = n; i < v.length; i++) { e = v[i] * k + e * (1 - k); out.push(e); }
        return out;
    }

    // RSI de Wilder
    function rsi(v, n = 14) {
        if (v.length < n + 1) return null;
        let g = 0, l = 0;
        for (let i = 1; i <= n; i++) {
            const d = v[i] - v[i - 1];
            if (d >= 0) g += d; else l -= d;
        }
        g /= n; l /= n;
        for (let i = n + 1; i < v.length; i++) {
            const d = v[i] - v[i - 1];
            g = (g * (n - 1) + Math.max(d, 0)) / n;
            l = (l * (n - 1) + Math.max(-d, 0)) / n;
        }
        if (l === 0) return g === 0 ? 50 : 100;
        return 100 - 100 / (1 + g / l);
    }

    function macd(v) {
        const e12 = emaSeries(v, 12), e26 = emaSeries(v, 26);
        if (!e26.length) return null;
        const off = e12.length - e26.length;
        const line = e26.map((x, i) => e12[i + off] - x);
        const sig = emaSeries(line, 9);
        if (sig.length < 2) return null;
        const h = line[line.length - 1] - last(sig);
        const hPrev = line[line.length - 2] - sig[sig.length - 2];
        return { line: last(line), signal: last(sig), hist: h, histPrev: hPrev };
    }

    // Volatilidade anualizada (desvio-padrão dos retornos diários)
    function volatility(v, days = 252, lookback = 60) {
        const s = v.slice(-lookback - 1);
        if (s.length < 10) return null;
        const r = [];
        for (let i = 1; i < s.length; i++) if (s[i - 1] > 0) r.push(Math.log(s[i] / s[i - 1]));
        const m = r.reduce((a, b) => a + b, 0) / r.length;
        const varc = r.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, r.length - 1);
        return Math.sqrt(varc) * Math.sqrt(days);
    }

    const ret = (v, n) => (v.length > n && v[v.length - 1 - n] > 0) ? v[v.length - 1] / v[v.length - 1 - n] - 1 : null;
    const pct = (x) => (x >= 0 ? '+' : '') + (x * 100).toFixed(1).replace('.', ',') + '%';

    function riskOf(vol) {
        if (vol == null) return { key: 'na', label: '—' };
        if (vol < 0.2) return { key: 'low', label: 'Risco baixo' };
        if (vol < 0.4) return { key: 'mid', label: 'Risco médio' };
        if (vol < 0.7) return { key: 'high', label: 'Risco alto' };
        return { key: 'xhigh', label: 'Risco muito alto' };
    }

    const LABELS = {
        mid: ['Sinal forte de subida', 'Positivo', 'Neutro', 'Negativo', 'Fraco — evitar por agora'],
        short: ['Bom momento no curto prazo', 'Positivo', 'Neutro', 'Negativo', 'Pressão de venda'],
        long: ['Favorável para investir a prazo', 'Positivo', 'Neutro', 'Cautela', 'Desfavorável a prazo'],
    };
    function labelOf(score, hz = 'mid') {
        const L = LABELS[hz] || LABELS.mid;
        if (score >= 70) return { key: 'strong', tone: 'up', label: L[0] };
        if (score >= 58) return { key: 'pos', tone: 'up', label: L[1] };
        if (score > 42) return { key: 'neutral', tone: 'flat', label: L[2] };
        if (score > 30) return { key: 'neg', tone: 'down', label: L[3] };
        return { key: 'weak', tone: 'down', label: L[4] };
    }

    // closes: fechos diários do mais antigo para o mais recente.
    // opts.crypto: anualiza com 365 dias; opts.news: -1..1 (tom das notícias).
    function analyse(closes, opts = {}) {
        const v = (closes || []).filter((x) => Number.isFinite(x) && x > 0);
        if (v.length < 30) return null;
        const p = last(v);
        const s20 = sma(v, 20);
        const s50 = sma(v, 50);
        const s50prev = v.length >= 60 ? sma(v.slice(0, -10), 50) : null;
        const r = rsi(v);
        const m = macd(v);
        const r1m = ret(v, 21);
        const r3m = ret(v, 63);
        const vol = volatility(v, opts.crypto ? 365 : 252);
        const hi = Math.max(...v.slice(-126));
        const dd = p / hi - 1;

        let s = 50;
        const reasons = [];
        const add = (pts, txt) => { s += pts; reasons.push({ pts: Math.round(pts), txt }); };

        add(p > s20 ? 8 : -8, p > s20 ? 'Preço acima da média de 20 dias' : 'Preço abaixo da média de 20 dias');
        if (s50 != null) {
            add(p > s50 ? 10 : -10, p > s50 ? 'Acima da média de 50 dias (tendência de fundo positiva)' : 'Abaixo da média de 50 dias (tendência de fundo negativa)');
            add(s20 > s50 ? 7 : -7, s20 > s50 ? 'Média curta acima da longa (tendência a subir)' : 'Média curta abaixo da longa (tendência a descer)');
        }
        if (s50 != null && s50prev != null) {
            const slope = s50 / s50prev - 1;
            add(slope > 0 ? 5 : -5, slope > 0 ? 'Média de 50 dias a inclinar para cima' : 'Média de 50 dias a inclinar para baixo');
        }
        if (r1m != null) add(clamp(r1m * 100 * 0.6, -10, 10), `Último mês: ${pct(r1m)}`);
        if (r3m != null) add(clamp(r3m * 100 * 0.25, -8, 8), `Últimos 3 meses: ${pct(r3m)}`);
        if (r != null) {
            const rr = Math.round(r);
            if (r >= 80) add(-12, `RSI ${rr}: muito esticado, risco de correção`);
            else if (r >= 70) add(-7, `RSI ${rr}: sobrecomprado`);
            else if (r >= 50) add(4, `RSI ${rr}: momento saudável`);
            else if (r >= 30) add(-2, `RSI ${rr}: momento fraco`);
            else add(7, `RSI ${rr}: sobrevendido, pode ressaltar`);
        }
        if (m) {
            if (m.hist > 0 && m.hist > m.histPrev) add(6, 'MACD positivo e a acelerar');
            else if (m.hist > 0) add(3, 'MACD positivo');
            else if (m.hist < m.histPrev) add(-6, 'MACD negativo e a piorar');
            else add(-3, 'MACD negativo mas a melhorar');
        }
        if (dd < -0.3 && s50 != null && p < s50) add(-5, `${pct(dd)} abaixo do máximo de 6 meses`);
        else if (dd > -0.03) reasons.push({ pts: 0, txt: 'Perto do máximo de 6 meses' });
        if (opts.news != null && Math.abs(opts.news) >= 0.2) {
            add(clamp(opts.news * 8, -6, 6), opts.news > 0 ? 'Notícias recentes com tom positivo' : 'Notícias recentes com tom negativo');
        }

        const score = Math.round(clamp(s, 0, 100));
        const sorted = reasons.sort((a, b) => Math.abs(b.pts) - Math.abs(a.pts));
        const mid = { score, ...labelOf(score, 'mid'), reasons: sorted };
        const metrics = { price: p, sma20: s20, sma50: s50, rsi: r, macd: m, ret1m: r1m, ret3m: r3m, vol, drawdown: dd };
        return {
            score,
            ...labelOf(score),
            risk: riskOf(vol),
            reasons: sorted,
            metrics,
            horizons: { short: shortTerm(v, metrics), mid, long: longTerm(v, metrics) },
            discount: discountOf(v, metrics, score),
        };
    }

    // ---- Desconto: quanto está abaixo do máximo do ano e se a descida é oportunidade ----
    function discountOf(v, mt, midScore) {
        const p = mt.price;
        const yr = v.slice(-252);
        const hi = Math.max(...yr, p), lo = Math.min(...yr, p);
        const dd = p / hi - 1;
        const pos = hi > lo ? (p - lo) / (hi - lo) : 1;
        const n = Math.min(200, v.length - 20);
        const sL = v.length >= 120 ? sma(v, n) : null;
        const sLp = v.length >= 120 ? sma(v.slice(0, -20), n) : null;
        const longUp = sL != null && sLp != null ? sL > sLp : null;
        const r = mt.rsi;
        const level = dd > -0.05 ? 'none' : dd > -0.15 ? 'small' : dd > -0.3 ? 'good' : 'deep';
        const LV = { none: 'Sem desconto', small: 'Desconto pequeno', good: 'Bom desconto', deep: 'Desconto grande' };
        const notes = [`${pct(dd)} face ao máximo do último ano`];
        if (sL != null) notes.push(p < sL ? `${pct(p / sL - 1)} abaixo da média de ${n} dias` : `Acima da média de ${n} dias`);
        if (r != null) {
            const rr = Math.round(r);
            notes.push(r < 30 ? `RSI ${rr}: sobrevendido (vendeu-se demais)` : r < 40 ? `RSI ${rr}: perto de sobrevendido` : r > 70 ? `RSI ${rr}: sobrecomprado` : `RSI ${rr}: normal`);
        }
        if (longUp != null) notes.push(longUp ? 'Tendência longa ainda a subir' : 'Tendência longa a descer');
        let verdict, tone, tag, opp = false;
        if (level === 'none') {
            verdict = 'Perto do máximo do ano: sem desconto especial agora (num plano mensal não faz mal, conta a média)'; tone = 'flat'; tag = 'Sem desconto';
        } else if (longUp === false && dd <= -0.15) {
            verdict = 'Está barato, mas continua a cair: melhor esperar que pare (risco de apanhar a faca a cair)'; tone = 'down'; tag = 'Barato, mas a cair';
        } else if (longUp !== false && (dd <= -0.08 || (r != null && r < 35))) {
            opp = true; tone = 'up'; tag = 'Oportunidade';
            verdict = r != null && r < 30 ? 'Oportunidade: com desconto e sobrevendido — bom para ir comprando aos poucos' : 'Oportunidade para ir comprando aos poucos';
            if (midScore != null && midScore < 25) {
                tag = 'Oportunidade (com cautela)'; tone = 'flat';
                verdict = 'Desconto com a tendência longa a subir, mas a queda ainda está forte: comprar só aos bocadinhos ou esperar que estabilize';
                notes.push('Médio prazo ainda muito fraco');
            }
        } else {
            verdict = longUp ? 'Pequena correção dentro de uma tendência positiva' : 'Pequeno desconto, sem pressa'; tone = 'flat'; tag = LV[level];
        }
        // 0–100: quanto maior, melhor a oportunidade (desconto + sobrevenda, com a tendência longa a favor)
        const score = Math.round(clamp(clamp(-dd * 200, 0, 60) + (r != null ? clamp((50 - r) * 1.2, -15, 25) : 0) + (longUp === true ? 15 : longUp === false ? -20 : 0) - (midScore != null && midScore < 25 ? 15 : 0), 0, 100));
        return { dd, pos, hi, lo, level, levelLabel: LV[level], verdict, tone, tag, opp, score, notes, longUp };
    }

    // ---- Curto prazo (dias a 2 semanas): momento e excessos ----
    function shortTerm(v, mt) {
        const p = mt.price;
        let s = 50;
        const reasons = [];
        const add = (pts, txt) => { s += pts; reasons.push({ pts: Math.round(pts), txt }); };
        const r = mt.rsi;
        if (r != null) {
            const rr = Math.round(r);
            if (r < 30) add(10, `RSI ${rr}: sobrevendido, ressalto provável`);
            else if (r < 45) add(-2, `RSI ${rr}: sem força`);
            else if (r <= 65) add(4, `RSI ${rr}: momento saudável`);
            else if (r <= 75) add(-4, `RSI ${rr}: a ficar esticado`);
            else add(-10, `RSI ${rr}: sobrecomprado, correção provável`);
        }
        const m = mt.macd;
        if (m) {
            if (m.hist > 0 && m.hist > m.histPrev) add(8, 'MACD positivo e a acelerar');
            else if (m.hist > 0) add(3, 'MACD positivo mas a abrandar');
            else if (m.hist < m.histPrev) add(-8, 'MACD negativo e a piorar');
            else add(2, 'MACD negativo mas a melhorar (pode virar)');
        }
        if (mt.sma20 != null) {
            const gap = p / mt.sma20 - 1;
            if (gap < -0.08) add(4, `${pct(gap)} abaixo da média de 20 dias: muito esticado para baixo`);
            else if (gap > 0.1) add(-4, `${pct(gap)} acima da média de 20 dias: muito esticado para cima`);
            else add(gap > 0 ? 6 : -6, gap > 0 ? 'Acima da média de 20 dias' : 'Abaixo da média de 20 dias');
        }
        const r5 = ret(v, 5);
        if (r5 != null) add(clamp(r5 * 100 * 0.8, -8, 8), `Últimos 5 dias: ${pct(r5)}`);
        const sc = Math.round(clamp(s, 0, 100));
        return { score: sc, ...labelOf(sc, 'short'), reasons: reasons.sort((a, b) => Math.abs(b.pts) - Math.abs(a.pts)) };
    }

    // ---- Longo prazo (anos): tendência de fundo e desconto ----
    function longTerm(v, mt) {
        if (v.length < 120) return null;
        const p = mt.price;
        const n = Math.min(200, v.length - 20);
        const sL = sma(v, n), sLprev = sma(v.slice(0, -20), n);
        const nm = n >= 200 ? 'média de 200 dias' : `média de ${n} dias`;
        let s = 50;
        const reasons = [];
        const add = (pts, txt) => { s += pts; reasons.push({ pts: Math.round(pts), txt }); };
        const up = sLprev != null && sL > sLprev;
        add(p > sL ? 12 : -12, p > sL ? `Acima da ${nm}: tendência longa positiva` : `Abaixo da ${nm}: tendência longa negativa`);
        if (sLprev != null) add(up ? 8 : -8, up ? `A ${nm} continua a subir` : `A ${nm} está a descer`);
        const r1y = ret(v, Math.min(252, v.length - 1));
        if (r1y != null) add(clamp(r1y * 100 * 0.15, -10, 10), `Último ano: ${pct(r1y)}`);
        const hi = Math.max(...v.slice(-252));
        const dd = p / hi - 1;
        if (dd <= -0.1 && up) add(8, `${pct(dd)} abaixo do máximo do ano com a tendência longa a subir: desconto para ir comprando aos poucos`);
        else if (dd <= -0.25 && !up) add(-6, `${pct(dd)} abaixo do máximo do ano e ainda em queda prolongada`);
        else if (dd > -0.03) reasons.push({ pts: 0, txt: 'Perto do máximo do ano (sem desconto)' });
        else reasons.push({ pts: 0, txt: `${pct(dd)} abaixo do máximo do ano` });
        const sc = Math.round(clamp(s, 0, 100));
        return { score: sc, ...labelOf(sc, 'long'), reasons: reasons.sort((a, b) => Math.abs(b.pts) - Math.abs(a.pts)), discount: dd };
    }

    // ---- Tom das notícias por palavras-chave (PT + EN) ----
    const norm = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const POS = [
        'sobe', 'subida', 'subir', 'dispara', 'disparam', 'recorde', 'maximo historico', 'lucro', 'lucros', 'supera', 'acima das expectativas',
        'melhora', 'melhoria', 'aprovado', 'aprovacao', 'parceria', 'acordo', 'cresce', 'crescimento', 'ganha', 'ganhos', 'valoriza', 'recupera',
        'eleva', 'aumenta dividendo', 'recompra', 'otimis', 'upgrade', 'beat', 'beats', 'surge', 'surges', 'soar', 'jump', 'rally', 'rallies',
        'record high', 'all-time high', 'profit', 'gains', 'soars', 'jumps', 'raises guidance', 'raises forecast', 'approval', 'approved', 'wins', 'gain', 'rises', 'rise',
        'bullish', 'buyback', 'outperform', 'strong demand', 'partnership', 'deal', 'tops estimates', 'rebound', 'climbs', 'upbeat',
    ];
    const NEG = [
        'cai', 'caem', 'queda', 'afunda', 'tomba', 'derrapa', 'prejuizo', 'perdas', 'abaixo das expectativas', 'corta', 'corte', 'despedimento',
        'investigacao', 'multa', 'processo judicial', 'falencia', 'insolvencia', 'alerta', 'recua', 'crise', 'desvaloriza', 'pessimis', 'tarifas',
        'downgrade', 'plunge', 'plunges', 'falls', 'fall', 'drop', 'drops', 'slump', 'tumble', 'tumbles', 'sinks', 'miss', 'misses', 'loss',
        'losses', 'lawsuit', 'probe', 'fined', 'layoffs', 'cuts', 'bankruptcy', 'recall', 'warning', 'warns', 'bearish', 'hack', 'hacked',
        'sell-off', 'selloff', 'crash', 'slides', 'lowers guidance', 'underperform', 'weak demand', 'fraud', 'tariff',
    ].map(norm);
    const POSN = POS.map(norm);
    // Palavras longas: basta começar a palavra ("otimis" apanha "otimista").
    // Palavras curtas: palavra inteira ("cai" não apanha "caixa").
    const esc = (w) => w.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&');
    const hitWord = (t, w) => new RegExp('(^|[^a-z0-9])' + esc(w) + (w.length > 4 ? '' : '($|[^a-z0-9])')).test(t);

    function sentiment(text) {
        const t = norm(text);
        let p = 0, n = 0;
        for (const w of POSN) if (hitWord(t, w)) p++;
        for (const w of NEG) if (hitWord(t, w)) n++;
        const score = (p + n) ? (p - n) / (p + n) : 0;
        return { score, tone: score > 0.15 ? 'up' : score < -0.15 ? 'down' : 'flat', label: score > 0.15 ? 'Boa notícia' : score < -0.15 ? 'Má notícia' : 'Neutra' };
    }

    function newsTone(items) {
        if (!items || !items.length) return null;
        const s = items.slice(0, 8).map((i) => sentiment(i.title).score);
        return s.reduce((a, b) => a + b, 0) / s.length;
    }

    // ---- Sentimento geral ----
    // ctx: { spx, stoxx, btc } = resultados de analyse(); vix = nível; breadth = fração 0..1 com score >= 58
    function marketMood(ctx) {
        let s = 0;
        const reasons = [];
        const idx = (a, name) => {
            if (!a || a.metrics.sma50 == null) return;
            const up = a.metrics.price > a.metrics.sma50;
            s += up ? 1 : -1;
            reasons.push({ tone: up ? 'up' : 'down', txt: `${name} ${up ? 'acima' : 'abaixo'} da média de 50 dias` });
        };
        idx(ctx.spx, 'S&P 500');
        idx(ctx.stoxx, 'Euro Stoxx 50');
        idx(ctx.btc, 'Bitcoin');
        if (Number.isFinite(ctx.vix)) {
            const v = Math.round(ctx.vix);
            if (ctx.vix < 16) { s += 1; reasons.push({ tone: 'up', txt: `VIX ${v}: mercado calmo` }); }
            else if (ctx.vix > 25) { s -= 1.5; reasons.push({ tone: 'down', txt: `VIX ${v}: medo elevado` }); }
            else reasons.push({ tone: 'flat', txt: `VIX ${v}: nervosismo normal` });
        }
        if (Number.isFinite(ctx.breadth)) {
            const b = Math.round(ctx.breadth * 100);
            if (ctx.breadth >= 0.55) { s += 1; reasons.push({ tone: 'up', txt: `${b}% dos ativos seguidos com sinal positivo` }); }
            else if (ctx.breadth <= 0.3) { s -= 1; reasons.push({ tone: 'down', txt: `Só ${b}% dos ativos seguidos com sinal positivo` }); }
            else reasons.push({ tone: 'flat', txt: `${b}% dos ativos seguidos com sinal positivo` });
        }
        if (!reasons.length) return null;
        const tone = s >= 1.5 ? 'up' : s <= -1.5 ? 'down' : 'flat';
        const label = tone === 'up' ? 'Otimista' : tone === 'down' ? 'Pessimista' : 'Misto';
        const hint = tone === 'up' ? 'Apetite pelo risco: a maioria dos mercados está em tendência de subida.'
            : tone === 'down' ? 'Aversão ao risco: muitos mercados em tendência de descida — cautela.'
                : 'Sinais contraditórios: escolher com cuidado e não arriscar tudo de uma vez.';
        return { tone, label, hint, reasons };
    }

    // Futuros em USD por galão americano → € por litro
    const GALLON_L = 3.785411784;
    function usdGalToEurL(usdGal, eurusd) {
        if (!Number.isFinite(usdGal) || !Number.isFinite(eurusd) || eurusd <= 0) return null;
        return usdGal / GALLON_L / eurusd;
    }

    const api = { sma, emaSeries, rsi, macd, volatility, analyse, sentiment, newsTone, marketMood, usdGalToEurL, labelOf, riskOf };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.Analise = api;
})(typeof self !== 'undefined' ? self : this);
