// Conselheiro — junta tudo o que o Claude precisa para a análise do dia: TODOS os ativos que a app mostra.
//   node mercados/conselheiro/dados.mjs [pasta]
//     → <pasta>/dados.json (tudo), dados.md (resumo compacto, uma linha por ativo) e modelo.json (esqueleto da análise)
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { A, px, kvKeys, kvGet, todayLisbon, isMain, STOCKS, FUNDS, CRYPTO, MARKET, MINE, ACTION_LABEL, HZ, LEVELS, yahooOf, kindOf, nameOf } from './comum.mjs';

const SYM = /^(c:[A-Z0-9]{2,10}|[A-Z0-9^][A-Z0-9.=^-]{0,19})$/;
const pc = (x) => (x == null || !Number.isFinite(x) ? '—' : (x > 0 ? '+' : '') + (x * 100).toFixed(1) + '%');
const r2 = (x) => (x == null || !Number.isFinite(x) ? null : Number(x.toPrecision(6)));
const n0 = (x) => (Number.isFinite(x) ? Math.round(x) : '—');
const cut = (t, n) => { const s = String(t || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

// ---------- 1) que ativos: tudo o que a app mostra ----------
// listas da app (ETF, cripto, ações), o que o investidor juntou (último dia do diário e a lista "my") e a referência
// (índices, câmbio, futuros). groups: mine (o que tem), fund, crypto, stock, extra (juntado por ele), ref.
export function pickAssets(journals = []) {
    const base = new Set([...Object.keys(FUNDS), ...Object.keys(STOCKS), ...Object.keys(CRYPTO), ...Object.keys(MARKET)]);
    const extra = [];
    for (const j of journals) {
        const last = Object.keys(j.days || {}).sort().pop();
        const syms = (last && Array.isArray(j.days[last]) ? j.days[last].map((it) => it && it.s) : []).concat(Array.isArray(j.my) ? j.my : []);
        for (const s of syms) if (typeof s === 'string' && SYM.test(s) && !base.has(s) && !extra.includes(s)) extra.push(s);
    }
    const keys = [...new Set([...MINE, ...Object.keys(FUNDS), ...Object.keys(CRYPTO), ...Object.keys(STOCKS), ...extra, ...Object.keys(MARKET)])];
    const groups = Object.fromEntries(keys.map((k) => [k, MINE.includes(k) ? 'mine' : MARKET[k] ? 'ref' : extra.includes(k) ? 'extra' : CRYPTO[k] ? 'crypto' : FUNDS[k] ? 'fund' : 'stock']));
    return { keys, extra, groups };
}
// tipo de um ativo juntado pelo investidor: pelo tipo que o Yahoo indica
export const kindFromQuote = (k, q) => (MARKET[k] ? 'ref' : FUNDS[k] ? 'fund' : kindOf(k) === 'crypto' || (q && q.type === 'CRYPTOCURRENCY') ? 'crypto' : q && /^(ETF|MUTUALFUND)$/.test(q.type || '') ? 'fund' : 'stock');

// ---------- 2) uma linha compacta por ativo (o contexto da sessão é curto) ----------
const LV = { 'Média de 20 dias': 'MM20', 'Média de 50 dias': 'MM50', 'Média de 200 dias': 'MM200', 'Máximo do ano': 'máx.ano', 'Mínimo do ano': 'mín.ano', 'Topo recente': 'topo', 'Fundo recente': 'fundo', 'Antigo fundo, já perdido': 'ex-fundo', 'Antigo topo, já ultrapassado': 'ex-topo' };
export const lvTxt = (l) => `${r2(l.price)} ${LV[l.label] || l.label}${l.strong ? '*' : ''} (${pc(l.dist)})`;
const KIND_PT = { fund: 'ETF', stock: 'ação', crypto: 'cripto', ref: 'ref' };
export function lineOf(r) {
    const eur = r.cur && r.cur !== 'EUR' && r.priceEur != null ? ` (≈${r.priceEur}€)` : '';
    const day = r.day == null ? '—' : (r.day > 0 ? '+' : '') + r.day.toFixed(1) + '%';
    const prev = r.prev ? ` | antes ${r.prev.action || r.prev.key}${HZ.every((h) => Number.isFinite(r.prev[h])) ? ' ' + HZ.map((h) => r.prev[h]).join('/') : ''}` : '';
    return `- ${r.s} ${r.name} [${KIND_PT[r.kind] || r.kind}] ${r.price ?? '—'}${r.cur ? ' ' + r.cur : ''}${eur} | dia ${day} · 1M ${pc(r.r1m)} · 3M ${pc(r.r3m)} · 1A ${pc(r.r1y)}`
        + ` | alg C${n0(r.short)} M${n0(r.mid)} L${n0(r.long)} · RSI ${n0(r.rsi)} · vol ${r.vol == null ? '—' : Math.round(r.vol * 100) + '%'}`
        + ` | máx ${pc(r.dd)}${r.ma200 != null ? ` · MM200 ${pc(r.ma200)}${r.longUp === true ? '↑' : r.longUp === false ? '↓' : ''}` : ''}`
        + ` | S ${r.sup.length ? r.sup.join(' · ') : '—'} | R ${r.res.length ? r.res.join(' · ') : '—'}`
        + `${r.ruleAction ? ' | regra ' + r.ruleAction : ''}${prev}${r.events && r.events.length ? ' | AGENDA ' + r.events.join(', ') : ''}`;
}

// ---------- 3) os veredictos anteriores: por veredicto e por convicção, face ao VWCE no mesmo período ----------
const SELLISH = ['sell', 'reduce', 'avoid'];
export function evalPast(advices, priceNow) {
    const byKey = {}, byConv = {};
    const vNow = priceNow['VWCE.DE'];
    const add = (o, k, ret, ex, hit) => {
        const E = o[k] || (o[k] = { n: 0, s: 0, ex: 0, nex: 0, hit: 0, nhit: 0 });
        E.n++; E.s += ret;
        if (ex != null) { E.ex += ex; E.nex++; }
        if (hit != null) { E.nhit++; if (hit) E.hit++; }
    };
    for (const a of advices || []) {
        const v0 = a.prices && a.prices['VWCE.DE'];
        const bench = v0 && vNow ? vNow / v0 - 1 : null;
        for (const x of a.actions || []) {
            if (!x || !x.key) continue;
            const p0 = a.prices && a.prices[x.s], p1 = priceNow[x.s];
            if (!(p0 > 0) || !(p1 > 0)) continue;
            const ref = !!MARKET[x.s];
            const ret = p1 / p0 - 1, ex = bench != null && !ref && x.s !== 'VWCE.DE' ? ret - bench : null;
            const base = ex ?? ret;
            const hit = ['buy', 'scale'].includes(x.key) ? base > 0 : SELLISH.includes(x.key) ? base < 0 : x.key === 'up' ? ret > 0 : x.key === 'down' ? ret < 0 : null;
            add(byKey, x.key, ret, ex, hit);
            if (!ref && Number.isFinite(x.mid)) add(byConv, x.mid >= 70 ? '≥70' : x.mid >= 58 ? '58–69' : x.mid > 42 ? '43–57' : x.mid > 30 ? '31–42' : '≤30', ret, ex, null);
        }
    }
    return { byKey, byConv };
}
const CONV = ['≥70', '58–69', '43–57', '31–42', '≤30'];
export function pastLines(ev) {
    const f = (E) => `n=${E.n} ${pc(E.s / E.n)}${E.nex ? ` (vs VWCE ${pc(E.ex / E.nex)})` : ''}${E.nhit ? ` acerto ${Math.round((E.hit / E.nhit) * 100)}%` : ''}`;
    const keys = Object.keys(ev.byKey).sort((a, b) => ev.byKey[b].n - ev.byKey[a].n);
    const L = ['- Por veredicto: ' + (keys.length ? keys.map((k) => `${ACTION_LABEL[k] || k} ${f(ev.byKey[k])}`).join(' · ') : '(ainda nenhum)')];
    const conv = CONV.filter((k) => ev.byConv[k]);
    if (conv.length) L.push('- Por convicção a médio prazo: ' + conv.map((k) => `${k} ${f(ev.byConv[k])}`).join(' · '));
    return L;
}
// o último veredicto de cada ativo (para dar continuidade; o da manhã conta na análise da tarde)
export function lastVerdicts(advices) {
    const out = {};
    for (const a of (advices || []).slice().sort((x, y) => (x.date < y.date ? 1 : x.date > y.date ? -1 : 0))) {
        for (const x of a.actions || []) {
            if (!x || !x.s || out[x.s]) continue;
            out[x.s] = { date: a.date, key: x.key, action: x.action || ACTION_LABEL[x.key] || x.key };
            for (const h of HZ.concat(LEVELS)) if (Number.isFinite(x[h])) out[x.s][h] = x[h];
        }
    }
    return out;
}

// ---------- 4) esqueleto da análise: todos os ativos, com o último veredicto para partir dele ----------
export function modelOf(rows, prev, { last = null, lessons = [], movers = [] } = {}) {
    const plan = last && Array.isArray(last.plan) && last.plan.length ? last.plan : [{ s: 'VWCE.DE', amount: '810 €' }, { s: 'c:BTC', amount: '90 €' }];
    return {
        headline: '', tldr: ['Mercado: ', 'Plano: ', 'Atenção: '], market: '',
        planNote: (last && last.planNote) || '', plan: plan.map((x) => ({ s: x.s, amount: x.amount, why: '' })),
        actions: rows.map((r) => {
            const p = prev[r.s] || {};
            const o = { s: r.s, key: p.key || '', action: p.action || '' };
            for (const k of HZ.concat(LEVELS)) o[k] = Number.isFinite(p[k]) ? p[k] : null;
            return { ...o, why: '', plan: '' };
        }),
        rank: { short: [], mid: [], long: [] },
        movers: movers.map((m) => ({ s: m.s, why: '' })),
        risks: [], review: '', lessons: Array.isArray(lessons) ? lessons : [],
    };
}

// ---------- recolha (rede) ----------
async function main() {
    const OUT = process.argv[2] || '/tmp/conselheiro';
    mkdirSync(OUT, { recursive: true });
    const today = todayLisbon();
    const warn = [];
    const tryOr = async (f, fb, what) => { try { return await f(); } catch (e) { warn.push(`${what}: ${e.message}`); return fb; } };
    async function quotes(keys, range) {
        const out = {};
        for (let i = 0; i < keys.length; i += 40) {
            const part = keys.slice(i, i + 40);
            const r = await px(`/quotes?symbols=${encodeURIComponent(part.map(yahooOf).join(','))}&range=${range}`, 60000);
            for (const q of r.quotes || []) { const k = part.find((x) => yahooOf(x) === q.symbol) || q.symbol; out[k] = q; }
        }
        return out;
    }

    // diário do dono (o que juntou na app, datas de compra de cripto); as outras apps têm análise à parte (outros.mjs)
    const owner = await tryOr(() => kvGet('cfg:owner'), null, 'dono');
    const jKeys = owner ? ['j:' + owner] : await tryOr(() => kvKeys('j:'), [], 'diário (lista)');
    const journals = [];
    for (const k of jKeys) { const d = await tryOr(() => kvGet(k), null, 'diário ' + k); if (d && d.days) journals.push({ id: k.slice(2), days: d.days, lots: d.lots, saveDays: d.saveDays, my: d.my }); }
    const { keys, extra, groups } = pickAssets(journals);

    // preços de hoje, 1 ano de fechos e câmbios para euros
    const q1d = await tryOr(() => quotes(keys, '1d'), {}, 'cotações de hoje');
    const q1y = await tryOr(() => quotes(keys, '1y'), {}, 'histórico 1 ano');
    const fx = { EUR: 1 };
    if (q1d['EURUSD=X'] && q1d['EURUSD=X'].price) fx.USD = 1 / q1d['EURUSD=X'].price;
    const curs = [...new Set(keys.filter((k) => groups[k] !== 'ref').map((k) => q1d[k] && q1d[k].currency).filter(Boolean).map((c) => (c === 'GBp' || c === 'GBX' ? 'GBP' : c)))].filter((c) => !fx[c]);
    if (curs.length) {
        const r = await tryOr(() => px(`/quotes?symbols=${encodeURIComponent(curs.map((c) => `EUR${c}=X`).join(','))}&range=1d`), { quotes: [] }, 'câmbios');
        for (const q of r.quotes || []) if (q && q.price) fx[String(q.symbol).slice(3, 6)] = 1 / q.price;
    }
    const toEur = (v, cur) => (v == null ? null : cur === 'GBp' || cur === 'GBX' ? (v / 100) * (fx.GBP || NaN) : v * (fx[cur] || (cur ? NaN : 1)));

    // agenda (resultados e dividendos) das ações
    const kinds = Object.fromEntries(keys.map((k) => [k, kindFromQuote(k, q1d[k] || q1y[k])]));
    const stockKeys = keys.filter((k) => kinds[k] === 'stock');
    const cal = {};
    for (let i = 0; i < stockKeys.length; i += 40) {
        const r = await tryOr(() => px(`/calendar?symbols=${encodeURIComponent(stockKeys.slice(i, i + 40).join(','))}`, 60000), { items: [] }, 'agenda');
        for (const it of r.items || []) if (!it.error) cal[it.symbol] = it;
    }
    const nowS = Date.now() / 1000;
    const upcoming = (k) => {
        const c = cal[k]; if (!c) return [];
        const out = [];
        if (c.earnings && c.earnings > nowS - 86400 && c.earnings < nowS + 30 * 86400) out.push(`resultados ${new Date(c.earnings * 1000).toISOString().slice(0, 10)}`);
        if (c.exDividend && c.exDividend > nowS - 86400 && c.exDividend < nowS + 30 * 86400) out.push(`ex-dividendo ${new Date(c.exDividend * 1000).toISOString().slice(0, 10)}`);
        return out;
    };

    // conselhos anteriores (KV): para a continuidade (antes) e a avaliação (sem os de hoje)
    const advKeys = (await tryOr(() => kvKeys('advice:2'), [], 'conselhos anteriores')).sort().slice(-45);
    const advices = [];
    for (const k of advKeys) { const a = await tryOr(() => kvGet(k), null, k); if (a && a.date) advices.push(a); }
    const prev = lastVerdicts(advices);

    // análise técnica de cada ativo (o mesmo motor da app)
    const rows = [];
    for (const k of keys) {
        const d = q1y[k], t = q1d[k];
        if (!d || d.error || !d.series || d.series.length < 60) { warn.push(`sem histórico: ${k}`); continue; }
        const closes = d.series.map((x) => x[1]);
        if (t && Number.isFinite(t.price)) closes[closes.length - 1] = t.price;
        const kind = kinds[k], ref = kind === 'ref';
        const r = A.analyse(closes, { crypto: kind === 'crypto', kind: ref ? undefined : kind });
        if (!r) { warn.push(`sem análise: ${k}`); continue; }
        const cur = (t && t.currency) || d.currency;
        const price = closes[closes.length - 1];
        rows.push({
            s: k, name: nameOf(k) !== k ? nameOf(k) : cut((t && (t.longName || t.name)) || d.name || k, 40), kind, group: groups[k], cur,
            price: r2(price), priceEur: ref ? null : r2(toEur(price, cur)), day: r2(t && t.changePct),
            short: r.horizons.short.score, mid: r.horizons.mid.score, long: r.horizons.long ? r.horizons.long.score : null,
            rsi: r2(r.metrics.rsi), vol: r2(r.metrics.vol), r1m: r2(r.metrics.ret1m), r3m: r2(r.metrics.ret3m), r1y: r2(price / closes[0] - 1),
            dd: r2(r.discount.dd), ma200: r.metrics.sma200 ? r2(price / r.metrics.sma200 - 1) : null, longUp: r.discount.longUp,
            rule: ref ? null : r.advice.key, ruleAction: ref ? null : r.advice.action,
            sup: r.levels.supports.slice(0, 2).map(lvTxt), res: r.levels.resistances.slice(0, 2).map(lvTxt),
            events: upcoming(k), prev: prev[k] || null,
        });
    }

    // movimentos fortes e notícias (gerais, dos movimentos fortes e do que o investidor tem ou juntou)
    const inv = rows.filter((r) => r.kind !== 'ref' && r.day != null);
    const top5 = inv.slice().sort((a, b) => Math.abs(b.day) - Math.abs(a.day)).slice(0, 5);
    const strong = rows.filter((r) => r.day != null && Math.abs(r.day) >= 3 && (['mine', 'extra'].includes(r.group) || (r.kind === 'ref' && r.s !== '^VIX')));
    const movers = [...new Map(top5.concat(strong).map((r) => [r.s, r])).values()].slice(0, 10);
    const news = {};
    for (const [q, lang] of [['stock market today', 'en'], ['bolsa mercados hoje', 'pt'], ['bitcoin', 'en']]) {
        const r = await tryOr(() => px(`/news?q=${encodeURIComponent(q)}&lang=${lang}`), { items: [] }, 'notícias ' + q);
        news[q] = (r.items || []).slice(0, 5).map((i) => `${cut(i.title, 120)} (${i.source || ''})`);
    }
    const newsFor = movers.map((m) => [m, 3]).concat(rows.filter((r) => ['mine', 'extra'].includes(r.group) && !movers.includes(r)).map((r) => [r, 2]));
    for (const [m, n] of newsFor) {
        const r = await tryOr(() => px(`/news?q=${encodeURIComponent(m.name)}&lang=en&sym=${encodeURIComponent(yahooOf(m.s))}`), { items: [] }, 'notícias ' + m.s);
        news[`${m.s} ${m.name}`] = (r.items || []).slice(0, n).map((i) => `${cut(i.title, 120)} (${i.source || ''})`);
    }

    // avaliação: veredictos anteriores do Claude e sugestões automáticas do diário
    const priceNow = Object.fromEntries(rows.map((r) => [r.s, r.priceEur ?? r.price]));
    const vwceNow = priceNow['VWCE.DE'];
    const pastDocs = advices.filter((a) => a.date !== today);
    const past = { ...evalPast(pastDocs, priceNow), recent: pastDocs.slice(-5).map((a) => ({ date: a.date, headline: a.headline, vwce: r2(a.prices && a.prices['VWCE.DE'] && vwceNow ? vwceNow / a.prices['VWCE.DE'] - 1 : null) })) };
    const ruleEval = {};
    for (const j of journals) {
        for (const [d, items] of Object.entries(j.days)) {
            if (d === today) continue;
            const v = items.find((x) => x.s === 'VWCE.DE');
            const bench = v && vwceNow ? vwceNow / v.p - 1 : null;
            for (const it of items) {
                const p1 = priceNow[it.s]; if (!p1) continue;
                const f = p1 / it.p - 1;
                const E = ruleEval[it.a] || (ruleEval[it.a] = { n: 0, sum: 0, ex: 0, nex: 0 });
                E.n++; E.sum += f; if (bench != null && it.s !== 'VWCE.DE') { E.ex += f - bench; E.nex++; }
            }
        }
    }
    const lessons = (await tryOr(() => kvGet('advice:lessons'), null, 'lições')) || [];
    // datas de compra de cripto que o investidor pôs na app (isenção de IRS aos 365 dias)
    const cryptoTax = {};
    for (const j of journals) {
        const lots = j.lots || {}, sd = j.saveDays || [2];
        for (const k of Object.keys(CRYPTO)) {
            const L = lots[k] || {};
            const t = A.cryptoTax((L.buys || []).concat(A.planLots(L.plan, sd, today)), today);
            cryptoTax[k] = { ...t, lots: t.lots.filter((x) => !x.ok).slice(0, 12), plan: L.plan || '' };
        }
    }

    const data = { date: today, generatedAt: new Date().toISOString(), rows, movers: movers.map((m) => m.s), news, past, ruleEval, lessons, cryptoTax, extra, prefs: journals.map((j) => j.id), warnings: warn };
    writeFileSync(path.join(OUT, 'dados.json'), JSON.stringify(data, null, 1));
    const last = advices.length ? advices[advices.length - 1] : null;
    writeFileSync(path.join(OUT, 'modelo.json'), JSON.stringify(modelOf(rows, prev, { last, lessons, movers }), null, 1));

    // resumo para ler (dados.md)
    const L = [];
    const when = new Intl.DateTimeFormat('pt-PT', { timeZone: 'Europe/Lisbon', weekday: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date());
    L.push(`# Dados de ${today} (${when} em Lisboa)`);
    L.push(`Cobre em "actions" TODOS os ${rows.length} ativos abaixo (a app mostra o teu veredicto em cada um). Ponto de partida: modelo.json.`);
    L.push('Legenda: preço na moeda do ativo (≈ €) | dia · 1M · 3M · 1A | alg = pontuação automática C/M/L (curto/médio/longo), RSI, volatilidade anual | máx = distância ao máximo de 1 ano · MM200 (↑ a subir) | S/R = suportes/resistências (* forte) | regra = sinal automático | antes = o teu último veredicto e convicção C/M/L');
    const mk = ['^GSPC', '^IXIC', '^STOXX50E', 'PSI20.LS', '^VIX', 'EURUSD=X', 'BZ=F', 'GC=F'].map((k) => rows.find((r) => r.s === k)).filter(Boolean);
    L.push('## Mercado', mk.map((r) => `${MARKET[r.s]} ${r.price} (${r.day == null ? '—' : (r.day > 0 ? '+' : '') + r.day.toFixed(2) + '%'})`).join(' · '));
    const SECTIONS = [['mine', 'O que tens'], ['fund', 'ETF'], ['crypto', 'Cripto'], ['stock', 'Ações da lista da app'], ['extra', 'Juntadas por ti na app'], ['ref', 'Referência: índices, câmbio e futuros (key up/flat/down)']];
    for (const [g, title] of SECTIONS) { const rs = rows.filter((r) => r.group === g); if (rs.length) L.push(`## ${title} (${rs.length})`, ...rs.map(lineOf)); }
    L.push('## Movimentos fortes de hoje (explica o motivo em "movers")', ...(movers.length ? movers.map((m) => `- ${m.s} ${m.name}: ${m.day > 0 ? '+' : ''}${m.day.toFixed(1)}%`) : ['- (nenhum)']));
    L.push('## Notícias'); for (const [q, items] of Object.entries(news)) if (items.length) L.push(`### ${q}`, ...items.map((i) => `- ${i}`));
    L.push('## Os teus veredictos anteriores (retorno desde o dia de cada um; acerto = Comprar acima do VWCE, Vender/Reduzir/Evitar abaixo)', ...pastLines(past));
    for (const a of past.recent) L.push(`- ${a.date} "${a.headline}" | VWCE desde então ${pc(a.vwce)}`);
    L.push('## Sugestões automáticas do diário (média desde cada dia)');
    for (const [k, E] of Object.entries(ruleEval)) L.push(`- ${k}: n=${E.n} média ${pc(E.sum / E.n)} vs VWCE ${pc(E.nex ? E.ex / E.nex : null)}`);
    L.push('## Cripto: datas de compra e isenção de IRS (365 dias)');
    for (const [k, t] of Object.entries(cryptoTax)) {
        if (!t.n) { L.push(`- ${k}: data de compra por indicar na app → perguntar ao investidor antes de falar em vender`); continue; }
        L.push(`- ${k}: ${t.n} compras desde ${t.first}${t.plan ? ` (plano mensal desde ${t.plan})` : ''}; ${t.exempt} isentas${t.eur ? ` (${Math.round(t.eurExempt)} € de ${Math.round(t.eur)} €)` : ''}${t.next ? `; próxima isenta a ${t.next.free} (faltam ${t.next.days} dias)` : '; todas isentas'}`);
    }
    L.push('## Lições guardadas', ...lessons.map((l) => `- ${l}`));
    if (warn.length) L.push('## Avisos', ...warn.map((w) => `- ${w}`));
    writeFileSync(path.join(OUT, 'dados.md'), L.join('\n'));
    console.log(L.join('\n'));
}

if (isMain(import.meta.url)) await main();
