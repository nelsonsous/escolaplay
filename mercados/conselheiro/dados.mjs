// Conselheiro — junta tudo o que o Claude precisa para a análise do dia.
//   node mercados/conselheiro/dados.mjs [pasta]   → escreve <pasta>/dados.json e imprime um resumo legível
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { A, px, kvKeys, kvGet, todayLisbon, STOCKS, FUNDS, CRYPTO, MARKET, yahooOf, kindOf, nameOf } from './comum.mjs';

const OUT = process.argv[2] || '/tmp/conselheiro';
mkdirSync(OUT, { recursive: true });
const pc = (x) => (x == null || !Number.isFinite(x) ? '—' : (x > 0 ? '+' : '') + (x * 100).toFixed(1) + '%');
const r2 = (x) => (x == null || !Number.isFinite(x) ? null : Number(x.toPrecision(6)));

async function quotes(keys, range) {
    const out = {};
    for (let i = 0; i < keys.length; i += 40) {
        const part = keys.slice(i, i + 40);
        const r = await px(`/quotes?symbols=${encodeURIComponent(part.map(yahooOf).join(','))}&range=${range}`, 60000);
        for (const q of r.quotes || []) {
            const k = part.find((x) => yahooOf(x) === q.symbol) || q.symbol;
            out[k] = q;
        }
    }
    return out;
}

const today = todayLisbon();
const warn = [];
const tryOr = async (f, fb, what) => { try { return await f(); } catch (e) { warn.push(`${what}: ${e.message}`); return fb; } };

// 1) Diário (para incluir ações que o utilizador juntou na app)
const jKeys = await tryOr(() => kvKeys('j:'), [], 'diário (lista)');
const journals = [];
for (const k of jKeys) { const d = await tryOr(() => kvGet(k), null, 'diário ' + k); if (d && d.days) journals.push({ id: k.slice(2), days: d.days }); }
// ações juntadas pelo utilizador: só as do dia mais recente de cada diário (a lista da app pode ter mudado)
const extra = new Set();
for (const j of journals) { const last = Object.keys(j.days).sort().pop(); for (const it of (last ? j.days[last] : [])) if (!CRYPTO[it.s] && !FUNDS[it.s] && !STOCKS[it.s]) extra.add(it.s); }

const assets = [...Object.keys(FUNDS), ...Object.keys(STOCKS), ...extra, ...Object.keys(CRYPTO)];
const all = [...assets, ...Object.keys(MARKET)];

// 2) Preços de hoje e histórico de 1 ano
const q1d = await tryOr(() => quotes(all, '1d'), {}, 'cotações de hoje');
const q1y = await tryOr(() => quotes(all, '1y'), {}, 'histórico 1 ano');
const fx = { EUR: 1 };
for (const c of ['USD', 'DKK', 'GBP', 'CHF']) {
    const k = c === 'USD' ? 'EURUSD=X' : `EUR${c}=X`;
    if (c !== 'USD') { const r = await tryOr(() => px(`/quotes?symbols=${encodeURIComponent(k)}&range=1d`), null, 'câmbio ' + c); if (r && r.quotes[0] && r.quotes[0].price) fx[c] = 1 / r.quotes[0].price; }
    else if (q1d[k] && q1d[k].price) fx.USD = 1 / q1d[k].price;
}
const toEur = (v, cur) => (v == null ? null : cur === 'GBp' ? v / 100 * (fx.GBP || NaN) : v * (fx[cur] || (cur ? NaN : 1)));

// 3) Agenda (resultados e dividendos) das ações
const stockKeys = assets.filter((k) => kindOf(k) === 'stock');
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

// 4) Análise técnica de cada ativo (o mesmo motor da app)
const rows = [];
for (const k of assets) {
    const d = q1y[k], t = q1d[k];
    if (!d || d.error || !d.series || d.series.length < 60) { warn.push(`sem histórico: ${k}`); continue; }
    const closes = d.series.map((x) => x[1]);
    if (t && t.price) closes[closes.length - 1] = t.price;
    const r = A.analyse(closes, { crypto: kindOf(k) === 'crypto', kind: kindOf(k) });
    const cur = (t && t.currency) || d.currency;
    rows.push({
        s: k, name: nameOf(k), kind: kindOf(k), cur, price: r2(t && t.price), priceEur: r2(toEur(t && t.price, cur)), day: r2(t && t.changePct),
        short: r.horizons.short.score, mid: r.horizons.mid.score, long: r.horizons.long ? r.horizons.long.score : null,
        rsi: r2(r.metrics.rsi), vol: r2(r.metrics.vol), ret1m: r2(r.metrics.ret1m), ret3m: r2(r.metrics.ret3m),
        discount: r2(r.discount.dd), discountTag: r.discount.tag, risk: r.risk.label,
        rule: r.advice.key, ruleAction: r.advice.action, rulePlan: r.advice.plan.map((x) => `${x.t} ${r2(x.price)}`),
        supports: r.levels.supports.map((l) => `${l.label} ${r2(l.price)} (${pc(l.dist)})`),
        resistances: r.levels.resistances.map((l) => `${l.label} ${r2(l.price)} (${pc(l.dist)})`),
        events: upcoming(k),
    });
}

// 5) Mercado e notícias
const market = Object.keys(MARKET).map((k) => ({ s: k, name: MARKET[k], price: r2(q1d[k] && q1d[k].price), day: r2(q1d[k] && q1d[k].changePct) }));
const news = {};
for (const [q, lang] of [['stock market today', 'en'], ['bolsa mercados hoje', 'pt'], ['bitcoin', 'en']]) {
    const r = await tryOr(() => px(`/news?q=${encodeURIComponent(q)}&lang=${lang}`), { items: [] }, 'notícias ' + q);
    news[q] = (r.items || []).slice(0, 6).map((i) => `${i.title} (${i.source || ''})`);
}
const movers = rows.filter((r) => r.day != null).sort((a, b) => Math.abs(b.day) - Math.abs(a.day)).slice(0, 5);
for (const m of movers) {
    const r = await tryOr(() => px(`/news?q=${encodeURIComponent(m.name)}&lang=en&sym=${encodeURIComponent(yahooOf(m.s))}`), { items: [] }, 'notícias ' + m.s);
    news[m.name] = (r.items || []).slice(0, 3).map((i) => `${i.title} (${i.source || ''})`);
}

// 6) Avaliação: conselhos anteriores do Claude e sugestões automáticas do diário
const priceNow = Object.fromEntries(rows.map((r) => [r.s, r.priceEur ?? r.price]));
const vwceNow = priceNow['VWCE.DE'];
const advKeys = (await tryOr(() => kvKeys('advice:2'), [], 'conselhos anteriores')).sort().slice(-45);
const pastAdvice = [];
for (const k of advKeys) {
    const a = await tryOr(() => kvGet(k), null, k);
    if (!a || a.date === today) continue;
    const v0 = a.prices && a.prices['VWCE.DE'];
    const bench = v0 && vwceNow ? vwceNow / v0 - 1 : null;
    const acts = (a.actions || []).map((x) => {
        const p0 = a.prices && a.prices[x.s], p1 = priceNow[x.s];
        const ret = p0 && p1 ? p1 / p0 - 1 : null;
        return { s: x.s, key: x.key, action: x.action, ret: r2(ret), vsVWCE: r2(ret != null && bench != null ? ret - bench : null) };
    });
    pastAdvice.push({ date: a.date, headline: a.headline, vwce: r2(bench), actions: acts });
}
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

const data = { date: today, generatedAt: new Date().toISOString(), market, rows, news, pastAdvice, ruleEval, lessons, prefs: journals.map((j) => j.id), warnings: warn };
writeFileSync(path.join(OUT, 'dados.json'), JSON.stringify(data, null, 1));

// Resumo legível
const L = [];
L.push(`# Dados de ${today}`);
L.push('## Mercado'); for (const m of market) L.push(`- ${m.name}: ${m.price} (${m.day == null ? '—' : m.day.toFixed(2) + '%'})`);
L.push('## Ativos (C/M/L = curto/médio/longo; regra = sugestão automática; suportes/resistências na moeda do ativo)');
for (const r of rows) L.push(`- ${r.s} ${r.name} [${r.kind}] ${r.price} ${r.cur || ''}${r.cur && r.cur !== 'EUR' ? ` (≈${r.priceEur}€)` : ''} hoje ${r.day == null ? '—' : r.day.toFixed(1) + '%'} | C${r.short}/M${r.mid}/L${r.long ?? '—'} RSI ${r.rsi?.toFixed?.(0)} | desconto ${pc(r.discount)} ${r.discountTag} | ${r.risk} | regra: ${r.ruleAction} | S: ${r.supports.join('; ')} | R: ${r.resistances.join('; ')}${r.events.length ? ' | AGENDA: ' + r.events.join(', ') : ''}`);
L.push('## Notícias'); for (const [q, items] of Object.entries(news)) { L.push(`### ${q}`); for (const i of items) L.push(`- ${i}`); }
L.push('## Os teus conselhos anteriores (retorno desde então, e face ao VWCE)');
if (!pastAdvice.length) L.push('- (ainda nenhum)');
for (const a of pastAdvice.slice(-15)) L.push(`- ${a.date} "${a.headline}" | VWCE ${pc(a.vwce)} | ` + a.actions.map((x) => `${x.s} ${x.action}: ${pc(x.ret)} (vs VWCE ${pc(x.vsVWCE)})`).join('; '));
L.push('## Sugestões automáticas do diário (média desde cada dia)');
for (const [k, E] of Object.entries(ruleEval)) L.push(`- ${k}: n=${E.n} média ${pc(E.sum / E.n)} vs VWCE ${pc(E.nex ? E.ex / E.nex : null)}`);
L.push('## Lições guardadas'); for (const l of lessons) L.push(`- ${l}`);
if (warn.length) { L.push('## Avisos'); for (const w of warn) L.push(`- ${w}`); }
writeFileSync(path.join(OUT, 'dados.md'), L.join('\n'));
console.log(L.join('\n'));
