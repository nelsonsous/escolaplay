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
        const metrics = { price: p, sma20: s20, sma50: s50, sma200: v.length >= 200 ? sma(v, 200) : null, rsi: r, macd: m, ret1m: r1m, ret3m: r3m, vol, drawdown: dd };
        const res = {
            score,
            ...labelOf(score),
            risk: riskOf(vol),
            reasons: sorted,
            metrics,
            horizons: { short: shortTerm(v, metrics), mid, long: longTerm(v, metrics, opts.kind) },
            discount: discountOf(v, metrics, score),
            levels: levels(v, p),
        };
        res.advice = advise(res, opts.kind);
        return res;
    }

    // ---- Níveis-chave: suportes (abaixo do preço) e resistências (acima) ----
    function levels(v, p) {
        const raw = [];
        const add = (price, label, w) => { if (Number.isFinite(price) && price > 0) raw.push({ price, label, w }); };
        if (v.length >= 20) add(sma(v, 20), 'Média de 20 dias', 1);
        if (v.length >= 50) add(sma(v, 50), 'Média de 50 dias', 2);
        if (v.length >= 200) add(sma(v, 200), 'Média de 200 dias', 3);
        const yr = v.slice(-252);
        add(Math.max(...yr), 'Máximo do ano', 3);
        add(Math.min(...yr), 'Mínimo do ano', 3);
        // topos e fundos recentes: extremos locais (±5 sessões) nos últimos ~6 meses
        for (let i = Math.max(5, v.length - 130); i < v.length - 5; i++) {
            const w = v.slice(i - 5, i + 6);
            if (v[i] === Math.max(...w)) add(v[i], 'Topo recente', 1);
            if (v[i] === Math.min(...w)) add(v[i], 'Fundo recente', 1);
        }
        // juntar níveis a menos de 1,5% uns dos outros (fica o mais importante)
        raw.sort((a, b) => a.price - b.price);
        const merged = [];
        for (const l of raw) {
            const m = merged[merged.length - 1];
            if (m && Math.abs(l.price / m.price - 1) < 0.015) {
                if (l.w > m.top) { m.price = l.price; m.label = l.label; m.top = l.w; }
                m.w += l.w;
            } else merged.push({ ...l, top: l.w });
        }
        // um fundo que ficou acima do preço já foi perdido (agora trava a subida); um topo abaixo já foi ultrapassado (agora trava a descida)
        const name = (l) => (l.label === 'Fundo recente' && l.price > p ? 'Antigo fundo, já perdido' : l.label === 'Topo recente' && l.price < p ? 'Antigo topo, já ultrapassado' : l.label);
        const out = (l) => ({ price: l.price, label: name(l), strong: l.w >= 4, dist: l.price / p - 1 });
        return {
            supports: merged.filter((l) => l.price < p * 0.995).sort((a, b) => b.price - a.price).slice(0, 3).map(out),
            resistances: merged.filter((l) => l.price > p * 1.005).sort((a, b) => a.price - b.price).slice(0, 3).map(out),
        };
    }

    // ---- O que fazer na Trade Republic: ação, plano em preços, quando a ideia falha e tamanho ----
    const SIZE = { low: 'Pode ser o núcleo da carteira', mid: 'Até ~10% da carteira', high: 'Até ~5% da carteira', xhigh: 'Até ~2–3% da carteira' };
    function advise(r, kind) {
        const L = r.horizons.long ? r.horizons.long.score : r.score;
        const M = r.horizons.mid.score;
        const d = r.discount, mt = r.metrics, lv = r.levels;
        const p = mt.price, rsi = mt.rsi;
        const s1 = lv.supports[0], s2 = lv.supports[1], r1 = lv.resistances[0];
        const fund = kind === 'fund';
        let key, action, tone, text, plan = [], invalid = null;
        if (L >= 58 && M >= 58) {
            if (rsi != null && rsi > 72) {
                key = 'hold'; action = 'Manter — não perseguir'; tone = 'flat';
                text = `Tendência forte, mas esticado (RSI ${Math.round(rsi)}). Melhor comprar num recuo.`;
                if (s1) plan.push({ t: 'Comprar num recuo para', price: s1.price });
            } else {
                key = 'buy'; action = 'Comprar'; tone = 'up';
                text = 'Tendência a favor no médio e no longo prazo.';
                plan.push({ t: 'Compra agora', price: p });
                if (s1) plan.push({ t: 'Reforçar se recuar para', price: s1.price });
            }
            invalid = s2 || s1;
        } else if (L >= 58 && d.opp && M >= 25) {
            key = 'scale'; action = 'Comprar aos poucos'; tone = 'up';
            text = `Desconto de ${pct(d.dd)} face ao máximo com a tendência longa a subir.`;
            plan.push({ t: '⅓ agora', price: p });
            if (s1) plan.push({ t: '⅓ se descer para', price: s1.price });
            if (s2) plan.push({ t: '⅓ se descer para', price: s2.price });
            else if (r1) plan.push({ t: '⅓ quando passar', price: r1.price });
            invalid = lv.supports[2] || s2 || s1;
        } else if (L >= 58) {
            key = 'wait'; action = M < 25 ? 'Esperar que estabilize' : 'Manter, reforçar nos suportes'; tone = 'flat';
            text = M < 25 ? 'A tendência longa sobe, mas a queda atual ainda é forte.' : 'Tendência longa positiva, médio prazo indeciso.';
            if (s1) plan.push({ t: M < 25 ? 'Só um bocadinho perto de' : 'Reforçar perto de', price: s1.price });
            if (mt.sma20 && mt.sma20 > p) plan.push({ t: 'Entrar a sério quando voltar acima de', price: mt.sma20 });
            invalid = s2 || s1;
        } else if (L >= 42) {
            key = 'neutral'; action = 'Manter, sem reforçar'; tone = 'flat';
            text = 'Sem tendência clara a longo prazo.';
            if (s1) plan.push({ t: 'Rever se perder', price: s1.price });
            if (r1) plan.push({ t: 'Mais interessante se passar', price: r1.price });
        } else if (M >= 42) {
            key = 'turn'; action = 'Esperar confirmação'; tone = 'flat';
            text = 'Tendência longa negativa, mas o médio prazo pode estar a virar.';
            const conf = mt.sma200 && mt.sma200 > p ? mt.sma200 : r1 && r1.price;
            if (conf) plan.push({ t: 'Comprar só se passar', price: conf });
        } else {
            key = 'avoid'; action = 'Evitar'; tone = 'down';
            text = 'A descer a médio e a longo prazo: está barato porque continua a cair.';
            const conf = mt.sma50 && mt.sma50 > p ? mt.sma50 : r1 && r1.price;
            if (conf) plan.push({ t: 'Só reconsiderar acima de', price: conf });
            if (s1) plan.push({ t: 'Se já tens: considerar reduzir se perder', price: s1.price });
        }
        if (fund && L >= 50) text += ' Bom para plano de poupança mensal na TR.';
        return { key, action, tone, text, plan, invalid: invalid ? invalid.price : null, size: SIZE[r.risk.key] || '' };
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
    function longTerm(v, mt, kind) {
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
        // a prazo, o risco conta: quanto mais oscila, mais difícil é aguentar anos (e pior foi no teste de 2 anos)
        if (mt.vol != null) {
            const vp = Math.round(mt.vol * 100);
            if (mt.vol < 0.2) add(6, `Pouco volátil (${vp}%/ano): fácil de manter anos`);
            else if (mt.vol > 0.7) add(-14, `Muito volátil (${vp}%/ano): difícil de aguentar a prazo`);
            else if (mt.vol > 0.4) add(-8, `Volátil (${vp}%/ano): exige estômago a prazo`);
        }
        // diversificação: um ETF reparte o risco; uma empresa ou uma cripto não (no teste: ações −2,3 pp e cripto −4,6 pp face ao VWCE)
        if (kind === 'fund') add(4, 'Diversificado (ETF): sem risco de uma só empresa');
        else if (kind === 'stock') add(-4, 'Uma só empresa: risco específico a prazo');
        else if (kind === 'crypto') add(-4, 'Especulativo: sem lucros nem dividendos por trás');
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
            : tone === 'down' ? 'Aversão ao risco: muitos mercados em tendência de descida.'
                : 'Sinais contraditórios: uns mercados sobem, outros descem.';
        return { tone, label, hint, reasons };
    }

    // Futuros em USD por galão americano → € por litro
    const GALLON_L = 3.785411784;
    function usdGalToEurL(usdGal, eurusd) {
        if (!Number.isFinite(usdGal) || !Number.isFinite(eurusd) || eurusd <= 0) return null;
        return usdGal / GALLON_L / eurusd;
    }

    // ---- Teste no passado: o que as regras atuais teriam dito em cada dia e o que aconteceu depois ----
    // assets: [{ key, kind, closes: [...], days: ['AAAA-MM-DD', ...] }]; bench: key do ativo de referência (ex.: VWCE)
    const BUYISH = { buy: 1, scale: 1 };
    function newAcc() { return { n21: 0, s21: 0, h21: 0, x21: 0, nx21: 0, n63: 0, s63: 0, h63: 0, x63: 0, nx63: 0 }; }
    function backtestAsset(a, benchByDay, acc, opt = {}) {
        const c = a.closes, n = c.length, warm = opt.warm || 200, step = opt.step || 5;
        const per = { key: a.key, n: 0, s63: 0, buyN: 0, buyS: 0, avoidN: 0, avoidS: 0 };
        for (let i = warm; i < n - 21; i += step) {
            const r = analyse(c.slice(0, i + 1), { crypto: a.kind === 'crypto', kind: a.kind });
            if (!r || !r.advice) continue;
            const k = r.advice.key;
            const A = acc[k] || (acc[k] = newAcc());
            for (const h of [21, 63]) {
                if (i + h >= n) continue;
                // retorno líquido: preço ajustado (dividendos incluídos) menos o custo de comprar
                const f = c[i + h] / c[i] - 1 - (opt.cost || 0);
                A['n' + h]++; A['s' + h] += f;
                if ((BUYISH[k] && f > 0) || (k === 'avoid' && f < 0)) A['h' + h]++;
                const b = benchByDay && a.days && benchByDay(a.days[i], a.days[i + h]);
                if (b != null) { A['x' + h] += f - b; A['nx' + h]++; }
                if (h === 63) {
                    if (BUYISH[k]) { per.buyN++; per.buyS += f; }
                    if (k === 'avoid') { per.avoidN++; per.avoidS += f; }
                }
            }
        }
        return per;
    }
    function summarize(acc) {
        const out = {};
        for (const [k, A] of Object.entries(acc)) {
            out[k] = {
                n: A.n21, avg21: A.n21 ? A.s21 / A.n21 : null, hit21: A.n21 ? A.h21 / A.n21 : null, ex21: A.nx21 ? A.x21 / A.nx21 : null,
                n63: A.n63, avg63: A.n63 ? A.s63 / A.n63 : null, hit63: A.n63 ? A.h63 / A.n63 : null, ex63: A.nx63 ? A.x63 / A.nx63 : null,
            };
        }
        return out;
    }
    // índice data → fecho do ativo de referência
    function benchFn(bench) {
        if (!bench) return null;
        const m = new Map(bench.days.map((d, i) => [d, bench.closes[i]]));
        const near = (d) => { if (m.has(d)) return m.get(d); let best = null; for (const [k, v] of m) { if (k <= d) best = v; else break; } return best; };
        return (d0, d1) => { const a = near(d0), b = near(d1); return a && b ? b / a - 1 : null; };
    }

    // ---------- Cripto em Portugal: mais-valias isentas com 365 dias ou mais (cada compra conta da sua data) ----------
    const ISO = /^\d{4}-\d{2}-\d{2}$/;
    const addDaysISO = (iso, n) => new Date(Date.parse(iso + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
    // compras do plano de poupança: uma em cada dia de execução, desde `since` até hoje
    function planLots(since, days, today) {
        const out = [];
        if (!ISO.test(since || '') || !ISO.test(today || '')) return out;
        const dd = (days || []).map(Number).filter((d) => d >= 1 && d <= 28).sort((a, b) => a - b);
        let y = +since.slice(0, 4), m = +since.slice(5, 7);
        for (let i = 0; i < 360 && dd.length; i++) {
            const ym = `${y}-${String(m).padStart(2, '0')}`;
            if (ym > today.slice(0, 7)) break;
            for (const d of dd) { const iso = `${ym}-${String(d).padStart(2, '0')}`; if (iso >= since && iso <= today) out.push({ d: iso, plan: 1 }); }
            if (++m > 12) { m = 1; y++; }
        }
        return out;
    }
    function cryptoTax(lots, today) {
        const L = (lots || []).filter((x) => x && ISO.test(x.d) && x.d <= today).sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0));
        const res = { n: L.length, exempt: 0, eur: 0, eurExempt: 0, first: L.length ? L[0].d : null, next: null, all: false, lots: [] };
        for (const x of L) {
            const free = addDaysISO(x.d, 365);
            const days = Math.round((Date.parse(free) - Date.parse(today)) / 864e5);
            const ok = days <= 0, e = +x.e > 0 ? +x.e : 0;
            res.eur += e;
            if (ok) { res.exempt++; res.eurExempt += e; } else if (!res.next) res.next = { d: x.d, free, days };
            res.lots.push({ d: x.d, e, free, days: Math.max(0, days), ok, plan: !!x.plan });
        }
        res.all = res.n > 0 && res.exempt === res.n;
        return res;
    }

    // ---------- avisos: vários movimentos numa só notificação; à noite esperam pela manhã ----------
    // items: [{ name, pct, pctTxt, px }]
    function groupAlert(items, held) {
        const L = (items || []).slice().sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
        if (!L.length) return null;
        const pre = held ? 'Durante a noite: ' : '';
        if (L.length === 1) {
            const x = L[0];
            return { title: `${pre}${x.name} ${x.pct > 0 ? 'sobe' : 'cai'} ${x.pctTxt}${held ? '' : ' hoje'}`, body: `${x.px} · toca para ver` };
        }
        const up = L.filter((x) => x.pct > 0).length, dn = L.length - up;
        const what = !up ? 'a cair' : !dn ? 'a subir' : 'com movimentos fortes';
        const list = L.slice(0, 6).map((x) => `${x.name} ${x.pctTxt}`).join(' · ') + (L.length > 6 ? ` · +${L.length - 6}` : '');
        return { title: `${pre}${L.length} ativos ${what}${held ? '' : ' hoje'}`, body: `${list} · toca para ver` };
    }
    // silêncio entre `from` e `to` horas (ex.: 22 → 10, atravessa a meia-noite)
    const isQuiet = (h, from = 22, to = 10) => (from > to ? h >= from || h < to : h >= from && h < to);

    const api = { groupAlert, isQuiet, sma, emaSeries, rsi, macd, volatility, analyse, sentiment, newsTone, marketMood, usdGalToEurL, labelOf, riskOf, backtestAsset, summarize, benchFn, newAcc, planLots, cryptoTax };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.Analise = api;
})(typeof self !== 'undefined' ? self : this);
