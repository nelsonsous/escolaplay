// REFERÊNCIA em JavaScript, só para os testes de paridade (mercados/tests/conselheiro-onda.test.mjs): o script que a
// tarefa agendada corre é o de Onda (mercados/conselheiro/onda/*.onda), lançado por mercados/conselheiro/outros.mjs.
// Conselheiro — análises curtas para as outras apps que ligaram a análise do Claude (cada uma só dos seus ativos).
//   node mercados/conselheiro/outros.mjs dados [pasta]      → <pasta>/outros.json e outros.md (uma secção por app: A1, A2…)
//   node mercados/conselheiro/outros.mjs publicar <ficheiro> → valida e grava ua:<id> de cada app e cfg:lastRun (contas para o dono)
// Das outras apps só se leem símbolos (validados) e números: nunca texto escrito por elas.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { AO, px, kvGet, kvPut, kvList, todayLisbon, normVerdict, textCheck } from './comum.mjs';

const MAX_APPS = 20; // por corrida (as que se ligaram há menos tempo primeiro); o dono vê quantas ficaram de fora
const MAX_ASSETS = 12;
const SYM = /^(c:[A-Z0-9]{2,10}|[A-Z0-9^][A-Z0-9.=^-]{0,19})$/;
const yahoo = (k) => (k.startsWith('c:') ? k.slice(2) + '-EUR' : k);
const r1 = (x) => (Number.isFinite(x) ? Math.round(x * 10) / 10 : null);
const [cmd, arg] = process.argv.slice(2);

if (cmd === 'dados') {
    const OUT = arg || '/tmp/conselheiro';
    mkdirSync(OUT, { recursive: true });
    const at = new Date().toISOString();
    const others = await kvGet('cfg:others');
    if (others && others.claude === false) {
        writeFileSync(path.join(OUT, 'outros.json'), JSON.stringify({ date: todayLisbon(), off: true, users: [] }));
        console.log('Análise para as outras apps desligada pelo dono: nada a fazer.');
        process.exit(0);
    }
    const owner = await kvGet('cfg:owner');
    const since = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10);
    const asked = (await kvList('j:')).filter((k) => k.metadata && k.metadata.c && (k.metadata.s || '') >= since && k.name !== 'j:' + owner)
        .sort((a, b) => (a.metadata.s < b.metadata.s ? 1 : -1));
    const users = [];
    for (const k of asked.slice(0, MAX_APPS)) {
        const doc = await kvGet(k.name).catch(() => null);
        const assets = [...new Set(((doc && doc.my) || []).map(String).filter((s) => SYM.test(s)))].slice(0, MAX_ASSETS);
        if (assets.length) users.push({ ref: 'A' + (users.length + 1), id: k.name.slice(2), assets });
    }
    const syms = [...new Set(users.flatMap((u) => u.assets))];
    const q1d = {}, q1y = {};
    for (let i = 0; i < syms.length; i += 40) {
        const part = syms.slice(i, i + 40);
        for (const [range, dst] of [['1d', q1d], ['1y', q1y]]) {
            try {
                const r = await px(`/quotes?symbols=${encodeURIComponent(part.map(yahoo).join(','))}&range=${range}`, 60000);
                for (const q of r.quotes || []) { const s = part.find((x) => yahoo(x) === q.symbol); if (s && !q.error) dst[s] = q; }
            } catch { /* fica sem dados */ }
        }
    }
    const rows = {};
    for (const s of syms) {
        const d = q1y[s], t = q1d[s];
        if (!d || !d.series || d.series.length < 60) continue;
        const closes = d.series.map((x) => x[1]);
        if (t && t.price) closes[closes.length - 1] = t.price;
        const kind = s.startsWith('c:') ? 'crypto' : /ETF|ETC|ETN/i.test(String(d.longName || d.name || '')) ? 'fund' : 'stock';
        const r = AO.analyse(closes, { crypto: kind === 'crypto', kind });
        if (!r) continue;
        rows[s] = {
            name: String((t && (t.longName || t.name)) || d.longName || d.name || s).slice(0, 60), kind, cur: (t && t.currency) || d.currency || '',
            price: t && Number.isFinite(t.price) ? Number(t.price.toPrecision(6)) : null, day: r1(t && t.changePct),
            m1: Number.isFinite(r.metrics.ret1m) ? r1(r.metrics.ret1m * 100) : null, long: r.horizons.long ? r.horizons.long.score : null, mid: r.horizons.mid.score,
            dd: r1(r.discount.dd * 100), risk: r.risk.label, rule: r.advice.action,
        };
    }
    // motivo dos movimentos fortes: 2 notícias
    const news = {};
    for (const [s, r] of Object.entries(rows)) {
        if (r.day == null || Math.abs(r.day) < 3) continue;
        try {
            const n = await px(`/news?q=${encodeURIComponent(r.name)}&lang=en&sym=${encodeURIComponent(yahoo(s))}`);
            news[s] = (n.items || []).slice(0, 2).map((i) => `${i.title} (${i.source || ''})`);
        } catch { /* sem notícias */ }
    }
    const doc = { date: todayLisbon(), at, queued: asked.length, max: MAX_APPS, users, rows, news };
    writeFileSync(path.join(OUT, 'outros.json'), JSON.stringify(doc, null, 1));
    if (!users.length) await kvPut('cfg:lastRun', { at, queued: asked.length, done: 0, max: MAX_APPS });
    const L = [`# Outras apps: ${users.length} a analisar${asked.length > users.length ? ` (${asked.length} pediram; limite ${MAX_APPS})` : ''}`];
    for (const u of users) {
        L.push(`## ${u.ref} (${u.assets.length} ativos)`);
        for (const s of u.assets) {
            const r = rows[s];
            L.push(r ? `- ${s} ${r.name} [${r.kind}] ${r.price} ${r.cur} | hoje ${r.day ?? '—'}% | 1 mês ${r.m1 ?? '—'}% | L${r.long ?? '—'}/M${r.mid} | do máximo ${r.dd}% | ${r.risk} | regra: ${r.rule}${news[s] ? ' | NOTÍCIAS: ' + news[s].join(' · ') : ''}` : `- ${s}: sem dados (dizer "sem dados hoje")`);
        }
    }
    writeFileSync(path.join(OUT, 'outros.md'), L.join('\n'));
    console.log(L.join('\n'));
} else if (cmd === 'publicar') {
    if (!arg) { console.error('uso: outros.mjs publicar outros-analise.json'); process.exit(2); }
    const a = JSON.parse(readFileSync(arg, 'utf8'));
    const d = JSON.parse(readFileSync(path.join(path.dirname(arg), 'outros.json'), 'utf8'));
    const errs = [];
    const str = textCheck(errs);
    const out = [];
    for (const u of d.users) {
        const x = a[u.ref];
        if (!x) { errs.push(`falta a análise de ${u.ref}`); continue; }
        const p = u.ref;
        const doc = {
            date: d.date, generatedAt: new Date().toISOString(), short: true,
            headline: str(x.headline, 160, `${p}.headline`, true),
            tldr: (Array.isArray(x.tldr) ? x.tldr : []).slice(0, 3).map((r, i) => str(r, 120, `${p}.tldr[${i}]`, true)),
            // o mesmo veredicto da análise principal; a convicção por prazo e os níveis são opcionais aqui
            actions: (Array.isArray(x.actions) ? x.actions : []).slice(0, MAX_ASSETS).map((y, i) => {
                const q = `${p}.actions[${i}]`;
                if (!y || !u.assets.includes(y.s)) errs.push(`${q}.s não é desta app: ${y && y.s}`);
                const r = y && d.rows[y.s];
                return normVerdict(y, errs, { p: q, price: r ? r.price : null, scores: 'opt', plan: false });
            }),
            movers: (Array.isArray(x.movers) ? x.movers : []).slice(0, 6).map((y, i) => {
                if (!u.assets.includes(y.s)) errs.push(`${p}.movers[${i}].s não é desta app: ${y.s}`);
                return { s: y.s, why: str(y.why, 260, `${p}.movers[${i}].why`, true) };
            }),
        };
        if (!doc.tldr.length) errs.push(`${p}.tldr vazio`);
        for (const s of u.assets) if (d.rows[s] && !doc.actions.some((y) => y.s === s)) errs.push(`${p}.actions sem ${s}: comenta todos os ativos da app`);
        out.push([u.id, doc]);
    }
    if (errs.length) { console.error('Análises inválidas:\n- ' + errs.join('\n- ')); process.exit(1); }
    for (const [id, doc] of out) await kvPut('ua:' + id, doc);
    await kvPut('cfg:lastRun', { at: new Date().toISOString(), queued: d.queued, done: out.length, max: d.max });
    console.log(`Publicadas ${out.length} análises (${d.queued} apps pediram).`);
} else {
    console.error('uso: outros.mjs dados [pasta] | publicar <ficheiro>');
    process.exit(2);
}
