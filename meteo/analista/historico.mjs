// Histórico (D1 meteo-historico): o resumo do que lá está e a recuperação do arquivo do KV.
//   NODE_USE_ENV_PROXY=1 node meteo/analista/historico.mjs              → quantas análises, dias previstos e observados por local
//   NODE_USE_ENV_PROXY=1 node meteo/analista/historico.mjs --recuperar  → copia para o D1 as análises que ainda estão no KV
//     (analysis:<id> e o arquivo analysis:<id>:<data-hora>, de 30 dias); pode correr-se mais de uma vez (não duplica).
//   ... --observado → o que as estações mediram nos últimos 14 dias em cada local (sem esperar pela próxima análise)
import { kvGet, kvList, d1Run, WORKER, ACCOUNT, D1_ID } from './comum.mjs';
import { analysisRows, observedRows } from '../lib/historico.js';
import { loadForecast } from '../lib/data.js';

async function query(sql, params = []) {
    const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/d1/database/${D1_ID}/query`, {
        method: 'POST', headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN || 'proxy-injected'}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql, params }) });
    const b = await r.json().catch(() => null);
    if (!r.ok || !b?.success) throw new Error(`Cloudflare D1: HTTP ${r.status} ${JSON.stringify(b?.errors)}`);
    return b.result[0].results;
}

if (process.argv.includes('--recuperar')) {
    const keys = (await kvList('analysis:')).filter((k) => /^analysis:[^:]+(:\d{4}-\d{2}-\d{2}T\d{2})?$/.test(k));
    let n = 0, rows = [];
    for (const k of keys) {
        const doc = await kvGet(k).catch(() => null);
        const r = doc && typeof doc === 'object' ? analysisRows(doc) : [];
        if (r.length) { rows.push(...r); n++; }
        if (rows.length >= 40) { await d1Run(rows); rows = []; }
    }
    await d1Run(rows);
    console.log(`Recuperadas ${n} análises de ${keys.length} chaves do KV.`);
}
if (process.argv.includes('--observado')) {
    const places = ((await kvGet('places')) || []).filter((p) => !p.off);
    for (const [i, p] of places.entries()) {
        if (i) await new Promise((ok) => setTimeout(ok, 3000)); // o Open-Meteo limita pedidos por minuto
        try {
            const { fc } = await loadForecast({ lat: p.lat, lon: p.lon, name: p.name, base: WORKER, preferProxy: true, withRaw: true, prevDays: 14 });
            const today = new Date(Date.parse(fc.generatedAt) + (fc.location?.utcOffsetSeconds || 0) * 1000).toISOString().slice(0, 10);
            console.log(`${p.id}: ${await d1Run(observedRows(p.id, fc.observed?.days, { today }))} dias observados`);
        } catch (e) { console.error(`${p.id}: ${e.message}`); }
    }
}
const por = await query(`SELECT a.local, a.nome, count(*) AS analises, min(a.gerada_em) AS primeira, max(a.gerada_em) AS ultima,
    (SELECT count(*) FROM observado o WHERE o.local = a.local) AS dias_observados FROM analises a GROUP BY a.local ORDER BY a.local`);
console.log(por.length ? por.map((r) => `${r.local} (${r.nome}): ${r.analises} análises de ${r.primeira.slice(0, 16)} a ${r.ultima.slice(0, 16)}; ${r.dias_observados} dias observados`).join('\n') : 'Histórico vazio.');
