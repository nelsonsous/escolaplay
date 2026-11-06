// Analista do tempo — recolhe tudo o que o Claude precisa para cada local registado.
//   NODE_USE_ENV_PROXY=1 node meteo/analista/dados.mjs [--out /tmp/meteo]
// Mostra as regras, o resumo numérico, a análise anterior, as lições e o observado; grava imagens de satélite.
import { mkdirSync, writeFileSync } from 'node:fs';
import { loadForecast, buildSummary, perModelTable } from '../lib/data.js';
import { satUrl, FOGOS_URL } from '../lib/sources.js';
import { SYSTEM_PROMPT } from '../lib/analysis.js';
import { WORKER, getJSON, kvGet, kvPut, arg } from './comum.mjs';

const OUT = arg('--out', '/tmp/meteo');
mkdirSync(OUT, { recursive: true });
const SAT = [['geocolour', 1200, 'cor natural MTG'], ['airmass', 2500, 'massas de ar (frentes, jato)'], ['rain', 800, 'precipitação por satélite H SAF'],
    ['lightning', 1200, 'relâmpagos MTG LI'], ['ir', 1200, 'infravermelho 10,5 µm']];

const places = await getJSON(`${WORKER}/api/places`);
if (!places.length) { console.log('Sem locais registados — nada a analisar.'); process.exit(0); }

// Ocorrências da Proteção Civil: o fogos.pt recusa o Worker, por isso guardamos aqui uma cópia para a app (válida 6 h)
try {
    const f = await getJSON(FOGOS_URL, 20000, { 'user-agent': 'meteo-preciso/1.0 (app pessoal)' });
    await kvPut('fogos:latest', { savedAt: new Date().toISOString(), data: f }, { ttl: 6 * 3600 });
    console.log(`fogos.pt: ${Array.isArray(f.data) ? f.data.length : 0} ocorrências ativas guardadas.`);
} catch (e) { console.log(`fogos.pt indisponível (${e.message}).`); }

console.log(`\n# REGRAS DA ANÁLISE\n${SYSTEM_PROMPT}\n`);
console.log(`Locais: ${places.map((p) => `${p.id} (${p.name})`).join(', ')}. Pasta: ${OUT}\n`);

for (const place of places) {
    const out = [];
    try {
        const { fc, raw } = await loadForecast({ lat: place.lat, lon: place.lon, name: place.name, base: WORKER, preferProxy: true, withRaw: true });
        if (raw.station?.source === 'IPMA') await saveObsHistory(raw.station).catch((e) => out.push(`(histórico IPMA não gravado: ${e.message})`));
        const prev = await kvGet('analysis:' + place.id).catch(() => null);
        const lessons = (await kvGet('lessons:' + place.id).catch(() => null)) || [];
        out.push(`\n==================== LOCAL ${place.id} — ${place.name} (${place.lat}, ${place.lon}) ====================`);
        out.push(`Fontes: ${Object.entries(fc.status).map(([k, v]) => `${k}=${v}`).join(' ')}`);
        out.push(observed(raw, fc));
        if (prev) out.push(`\n## Análise anterior (${prev.generatedAt})\nTítulo: ${prev.titulo}\nResumo: ${prev.resumo}\nHoje: ${prev.hoje}\nAmanhã: ${prev.amanha}`);
        else out.push('\n## Análise anterior: nenhuma (primeira análise deste local).');
        out.push(lessons.length ? `\n## Lições sobre este local\n- ${lessons.join('\n- ')}` : '\n## Lições: ainda nenhuma.');
        out.push('\n' + buildSummary(fc, { perModel: perModelTable(raw.det) }));
        const imgs = [];
        for (const [layer, km, what] of SAT) {
            try {
                const r = await fetch(satUrl(layer, place.lat, place.lon, { km }));
                if (!r.ok || !String(r.headers.get('content-type')).includes('image')) throw new Error(`HTTP ${r.status}`);
                const file = `${OUT}/sat-${place.id}-${layer}.png`;
                writeFileSync(file, Buffer.from(await r.arrayBuffer()));
                imgs.push(`- ${file} — ${what}, ~${km} km de largura, local ao centro`);
            } catch (e) { imgs.push(`- ${layer}: indisponível (${e.message})`); }
        }
        out.push(`\n## Imagens de satélite (ver com Read e limit: 1)\n${imgs.join('\n')}`);
        out.push(`\nEscreve a análise em: ${OUT}/analise-${place.id}.json  e publica com:\nNODE_USE_ENV_PROXY=1 node meteo/analista/publicar.mjs ${OUT}/analise-${place.id}.json`);
        writeFileSync(`${OUT}/dados-${place.id}.txt`, out.join('\n'));
    } catch (e) {
        out.push(`\n=== LOCAL ${place.id} — ${place.name}: ERRO a obter a previsão (${e.message}). Salta este local. ===`);
    }
    console.log(out.join('\n'));
}

// O que se observou nas últimas 24 h na estação (para verificar a análise anterior)
function observed(raw, fc) {
    const st = raw.station;
    if (!st?.series?.length) return '\n## Observado nas últimas 24 h: sem estação próxima.';
    const since = Date.now() - 24 * 36e5;
    const s = st.series.filter((o) => o.ms >= since);
    const t = s.map((o) => o.temp).filter(Number.isFinite), w = s.map((o) => o.wind).filter(Number.isFinite);
    const rain = st.source === 'IPMA' ? s.map((o) => o.precip1h).filter(Number.isFinite).reduce((a, b) => a + b, 0) : null;
    return `\n## Observado nas últimas 24 h em ${st.name} (${st.source}, ${fc.now.obs?.distanceKm ?? '?'} km)\n` +
        `máx ${t.length ? Math.max(...t).toFixed(1) : '—'}°C, mín ${t.length ? Math.min(...t).toFixed(1) : '—'}°C, ` +
        `chuva ${rain == null ? 'n/d (METAR)' : rain.toFixed(1) + ' mm'}, vento máx ${w.length ? Math.round(Math.max(...w)) : '—'} km/h (${s.length} registos).`;
}

// Acumula as observações horárias IPMA (só há 24 h na fonte) para a verificação local na app — 14 dias
async function saveObsHistory(st) {
    const key = 'obs:' + st.id;
    const old = (await kvGet(key)) || [];
    const map = new Map(old.map((o) => [o.ms, o]));
    for (const o of st.series) if (Number.isFinite(o.temp)) map.set(o.ms, { ms: o.ms, temp: o.temp, rh: o.rh, wind: o.wind, precip1h: o.precip1h });
    const keep = [...map.values()].filter((o) => o.ms >= Date.now() - 14 * 864e5).sort((a, b) => a.ms - b.ms);
    await kvPut(key, keep);
}
