// Conselheiro — classificação de toda a lista da Trade Republic (ações, ETF e cripto de universo.json).
//   node mercados/conselheiro/universo.mjs [pasta]   → <pasta>/universo.json e universo.md; grava uni:latest no KV
// O mesmo motor da app (a análise em Onda, analise-onda.js). A app do dono mostra-a em Análise → "Toda a Trade Republic".
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AO, px, kvPut, todayLisbon } from './comum.mjs';

const OUT = process.argv[2] || '/tmp/conselheiro';
mkdirSync(OUT, { recursive: true });
const here = path.dirname(fileURLToPath(import.meta.url));
const U = JSON.parse(readFileSync(path.join(here, 'universo.json'), 'utf8'));
const KIND = { stock: 'stock', etf: 'fund', crypto: 'crypto' };
const list = Object.entries(U).flatMap(([t, o]) => Object.keys(o).map((s) => ({ s, t, n: o[s] })));
const r1 = (x) => (Number.isFinite(x) ? Math.round(x * 10) / 10 : null);

const warn = [];
const Q = {};
for (let i = 0; i < list.length; i += 40) {
    const part = list.slice(i, i + 40).map((x) => x.s);
    for (let a = 0; a < 3; a++) {
        try {
            const r = await px(`/quotes?symbols=${encodeURIComponent(part.join(','))}&range=1y`, 60000);
            for (const q of r.quotes || []) if (!q.error) Q[q.symbol] = q;
            break;
        } catch (e) { if (a === 2) warn.push(`lote ${i / 40 + 1}: ${e.message}`); await new Promise((z) => setTimeout(z, 3000)); }
    }
}

// todos de uma vez no motor em Onda
const com = list.filter((x) => { const q = Q[x.s]; return q && q.series && q.series.length >= 60 && Number.isFinite(q.price); });
const AN = AO.analyseMany(com.map((x) => ({ closes: Q[x.s].series.map((p) => p[1]), opts: { crypto: x.t === 'crypto', kind: KIND[x.t] } })));
const rows = [];
for (const [i, x] of com.entries()) {
    const q = Q[x.s];
    const closes = q.series.map((p) => p[1]);
    const r = AN[i];
    if (!r) continue;
    const y0 = closes[0];
    rows.push({
        s: x.s, n: x.n, t: x.t, c: q.currency || '',
        l: r.horizons.long ? r.horizons.long.score : null, m: r.horizons.mid.score,
        d: r1(q.changePct), m1: Number.isFinite(r.metrics.ret1m) ? r1(r.metrics.ret1m * 100) : null, y: r1(y0 ? (closes[closes.length - 1] / y0 - 1) * 100 : null),
        dd: r1(r.discount.dd * 100), o: r.discount.opp ? 1 : 0, k: r.advice.key, rk: r.risk.label,
    });
}
rows.sort((a, b) => (b.l ?? -1) - (a.l ?? -1) || (b.m ?? 0) - (a.m ?? 0));
const doc = { date: todayLisbon(), generatedAt: new Date().toISOString(), n: rows.length, of: list.length, rows };
writeFileSync(path.join(OUT, 'universo.json'), JSON.stringify(doc));
if (rows.length > list.length / 2) await kvPut('uni:latest', doc);
else warn.push(`só ${rows.length} de ${list.length} com dados: não gravei no KV`);

// Resumo para a análise do Claude (ideias e armadilhas fora da lista habitual)
const L = [`# Toda a Trade Republic — ${rows.length} de ${list.length} ativos com dados (${doc.date})`];
const fmt = (r) => `- ${r.s} ${r.n} [${r.t}] L${r.l ?? '—'}/M${r.m} | hoje ${r.d ?? '—'}% | 1 mês ${r.m1 ?? '—'}% | 1 ano ${r.y ?? '—'}% | do máximo ${r.dd}% | ${r.rk}`;
for (const [t, lbl] of [['etf', 'ETF'], ['stock', 'Ações'], ['crypto', 'Cripto']]) {
    const g = rows.filter((r) => r.t === t);
    L.push(`## ${lbl} (${g.length}): as 10 mais fortes a longo prazo`, ...g.slice(0, 10).map(fmt));
    L.push(`## ${lbl}: desconto com tendência longa a favor (até 8)`, ...g.filter((r) => r.o).sort((a, b) => a.dd - b.dd).slice(0, 8).map(fmt));
    L.push(`## ${lbl}: as 5 mais fracas (armadilhas)`, ...g.filter((r) => r.l != null).slice(-5).map(fmt));
}
L.push('## Maiores movimentos de hoje (toda a lista)', ...rows.filter((r) => r.d != null).sort((a, b) => Math.abs(b.d) - Math.abs(a.d)).slice(0, 12).map(fmt));
if (warn.length) L.push('## Avisos', ...warn.map((w) => `- ${w}`));
writeFileSync(path.join(OUT, 'universo.md'), L.join('\n'));
console.log(L.join('\n'));
