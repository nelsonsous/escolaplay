// Analista do tempo — recolhe tudo o que o Claude precisa para cada local registado.
//   NODE_USE_ENV_PROXY=1 node meteo/analista/dados.mjs [--out /tmp/meteo]
// Mostra as regras, o resumo numérico (a começar por "## O ponto", com o radar no ponto e os avisos do utilizador),
// a análise anterior, as lições e o observado; grava imagens de satélite centradas no ponto (de perto, ~280 km, e largas).
// Também guarda no KV o histórico horário das estações IPMA usadas e as previsões do IPMA de cada concelho
// (para a verificação local, que precisa de previsões feitas na véspera).
import { mkdirSync, writeFileSync } from 'node:fs';
import { loadForecast, buildSummary, perModelTable } from '../lib/data.js';
import { satUrl, FOGOS_URL, IPMA } from '../lib/sources.js';
import { ipmaSeries, nearestIpmaLocal, ipmaRunRecord, ipmaPrevFromRuns } from '../lib/engine.js';
import { SYSTEM_PROMPT } from '../lib/analysis.js';
import { WORKER, getJSON, kvGet, kvPut, arg } from './comum.mjs';

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const savedStations = new Set(); // estações já gravadas nesta corrida (locais perto partilham estações)
let ipmaLocs = null;

const OUT = arg('--out', '/tmp/meteo');
mkdirSync(OUT, { recursive: true });
// Imagens de satélite (720×540, norte para cima, píxeis quadrados, o ponto no centro exato): primeiro as de perto
// (~280 km: o que está a chegar ao ponto), depois as largas (o sistema todo)
const W = 720, Hpx = 540;
const SAT = [
    ['geocolour', 280, 'perto', 'cor natural MTG, de perto'], ['rain', 280, 'perto', 'chuva por satélite H SAF, de perto'],
    ['lightning', 280, 'perto', 'relâmpagos MTG LI, de perto'],
    ['geocolour', 1200, '', 'cor natural MTG'], ['airmass', 2500, '', 'massas de ar (frentes, jato)'], ['rain', 800, '', 'precipitação por satélite H SAF'],
    ['lightning', 1200, '', 'relâmpagos MTG LI'], ['ir', 1200, '', 'infravermelho 10,5 µm'],
];
const kmPx = (km) => String(Math.round((km / W) * 100) / 100).replace('.', ',');

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

for (const [i, place] of places.entries()) {
    const out = [];
    if (i) await sleep(3000); // o Open-Meteo limita pedidos por minuto (HTTP 429): espaçar os locais
    try {
        // previsões do IPMA de há ~1 dia para este concelho (guardadas aqui nas corridas anteriores)
        const local = await ipmaLocalOf(place).catch(() => null);
        const runs = local ? (await kvGet('ipma:runs:' + local.id).catch(() => null)) || [] : [];
        const { fc, raw } = await loadForecast({ lat: place.lat, lon: place.lon, name: place.name, base: WORKER, preferProxy: true, withRaw: true,
            ipmaPrev: ipmaPrevFromRuns(runs) });
        await saveObsHistories(raw, fc).catch((e) => out.push(`(histórico IPMA não gravado: ${e.message})`));
        if (raw.ipma?.forecast) await saveIpmaRun(raw.ipma.forecast, runs).catch((e) => out.push(`(previsão IPMA não arquivada: ${e.message})`));
        const prev = await kvGet('analysis:' + place.id).catch(() => null);
        const lessons = (await kvGet('lessons:' + place.id).catch(() => null)) || [];
        // avisos do utilizador ("Está a chover?") perto do ponto nas últimas 48 h: o que se via lá, para o "agora" e a verificação
        let reports = [];
        try { reports = (await getJSON(`${WORKER}/api/reports?lat=${place.lat}&lon=${place.lon}&hours=48`, 15000)).reports || []; }
        catch (e) { out.push(`(avisos do utilizador indisponíveis: ${e.message})`); }
        out.push(`\n==================== LOCAL ${place.id} — ${place.name} (${place.lat}, ${place.lon}) ====================`);
        const T = fc.location.terrain;
        out.push(`Ponto exato: ${place.lat}, ${place.lon} · ${fc.location.elevation} m${T ? ` · ${T.label.toLowerCase()} (${T.text})` : ''}. Escreve sobre este ponto, não sobre a região.`);
        out.push(`Fontes: ${Object.entries(fc.status).map(([k, v]) => `${k}=${v}`).join(' ')}`);
        out.push(observed(raw, fc));
        out.push(fc.radar ? `Radar no ponto: ${fc.radar.text}${fc.radar.compare ? ` ${fc.radar.compare.text}` : ''}` : `Radar no ponto: indisponível (${fc.status.radar || 'sem dados'}).`);
        out.push(reports.length ? `Avisos do utilizador (48 h): ${reports.length}, o último «${reports[0].kind}» há ${reports[0].ageMin} min (lista em "## Avisos do utilizador").` : 'Avisos do utilizador (48 h): nenhum.');
        if (prev) out.push(`\n## Análise anterior (${prev.generatedAt})\nTítulo: ${prev.titulo}\nResumo: ${prev.resumo}\nHoje: ${prev.hoje}\nAmanhã: ${prev.amanha}`);
        else out.push('\n## Análise anterior: nenhuma (primeira análise deste local).');
        out.push(lessons.length ? `\n## Lições sobre este local\n- ${lessons.join('\n- ')}` : '\n## Lições: ainda nenhuma.');
        out.push('\n' + buildSummary(fc, { perModel: perModelTable(raw.det), reports }));
        const imgs = [];
        for (const [layer, km, tag, what] of SAT) {
            try {
                const r = await fetch(satUrl(layer, place.lat, place.lon, { km, w: W, h: Hpx }));
                if (!r.ok || !String(r.headers.get('content-type')).includes('image')) throw new Error(`HTTP ${r.status}`);
                const file = `${OUT}/sat-${place.id}-${tag ? tag + '-' : ''}${layer}.png`;
                writeFileSync(file, Buffer.from(await r.arrayBuffer()));
                imgs.push(`- ${file} — ${what}, ~${km} km de largura (1 píxel ≈ ${kmPx(km)} km; 100 píxeis ≈ ${Math.round((km / W) * 100)} km)`);
            } catch (e) { imgs.push(`- ${layer}${tag ? ' (perto)' : ''}: indisponível (${e.message})`); }
        }
        out.push(`\n## Imagens de satélite (ver com Read e limit: 1; ${W}×${Hpx}, norte para cima, o ponto no centro exato — píxel ${W / 2}, ${Hpx / 2})\n` +
            `As de perto primeiro: mede a distância e o rumo do que vem a caminho a partir do centro e diz quando chega ao ponto.\n${imgs.join('\n')}`);
        out.push(`\nEscreve a análise em: ${OUT}/analise-${place.id}.json  e publica com:\nNODE_USE_ENV_PROXY=1 node meteo/analista/publicar.mjs ${OUT}/analise-${place.id}.json`);
        writeFileSync(`${OUT}/dados-${place.id}.txt`, out.join('\n'));
    } catch (e) {
        out.push(`\n=== LOCAL ${place.id} — ${place.name}: ERRO a obter a previsão (${e.message}). Salta este local. ===`);
    }
    console.log(out.join('\n'));
}

// O que se observou nas últimas 24 h nas estações com mais peso (para verificar a análise anterior)
function observed(raw, fc) {
    const used = (fc.now.obs?.stations || []).filter((x) => x.used && x.source === 'IPMA').slice(0, 3);
    const lines = [];
    const since = Date.now() - 24 * 36e5;
    for (const x of used) {
        const s = ipmaSeries(raw.ipma?.obs, x.id).filter((o) => o.ms >= since);
        const t = s.map((o) => o.temp).filter(Number.isFinite), w = s.map((o) => o.wind).filter(Number.isFinite);
        const rain = s.map((o) => o.precip1h).filter(Number.isFinite).reduce((a, b) => a + b, 0);
        if (t.length) lines.push(`${x.name} (IPMA, ${x.distanceKm} km, ${x.elev ?? '?'} m, peso ${x.weight}%): máx ${Math.max(...t).toFixed(1)}°C, mín ${Math.min(...t).toFixed(1)}°C, ` +
            `chuva ${rain.toFixed(1)} mm, vento máx ${w.length ? Math.round(Math.max(...w)) : '—'} km/h (${s.length} registos)`);
    }
    if (!lines.length && raw.station?.series?.length) {
        const s = raw.station.series.filter((o) => o.ms >= since), t = s.map((o) => o.temp).filter(Number.isFinite);
        if (t.length) lines.push(`${raw.station.name} (${raw.station.source}): máx ${Math.max(...t).toFixed(1)}°C, mín ${Math.min(...t).toFixed(1)}°C (${s.length} registos)`);
    }
    return lines.length ? `\n## Observado nas últimas 24 h (valores medidos, sem ajuste de altitude)\n- ${lines.join('\n- ')}` : '\n## Observado nas últimas 24 h: sem estação próxima.';
}

// Acumula as observações horárias das estações IPMA usadas no ponto (a fonte só dá 24 h) — 14 dias, até 6 por local
async function saveObsHistories(raw, fc) {
    const ids = (fc.now.obs?.stations || []).filter((x) => x.source === 'IPMA' && x.used).slice(0, 6).map((x) => x.id);
    if (raw.station?.source === 'IPMA' && !ids.includes(raw.station.id)) ids.push(raw.station.id);
    for (const id of ids) {
        if (savedStations.has(id)) continue;
        savedStations.add(id);
        const series = ipmaSeries(raw.ipma?.obs, id);
        if (!series.length) continue;
        const key = 'obs:' + id;
        const old = (await kvGet(key)) || [];
        const map = new Map((Array.isArray(old) ? old : []).map((o) => [o.ms, o]));
        for (const o of series) if (Number.isFinite(o.temp)) map.set(o.ms, { ms: o.ms, temp: o.temp, rh: o.rh, wind: o.wind, precip1h: o.precip1h });
        const keep = [...map.values()].filter((o) => o.ms >= Date.now() - 14 * 864e5).sort((a, b) => a.ms - b.ms);
        await kvPut(key, keep);
    }
}

// ---------- previsões anteriores do IPMA (a API só dá a atual) ----------
async function ipmaLocalOf(place) {
    if (!ipmaLocs) ipmaLocs = await getJSON(IPMA.locations, 20000);
    return nearestIpmaLocal(ipmaLocs, place.lat, place.lon);
}
// Guarda a corrida atual (temperatura hora a hora e de 3 em 3 h) — 9 dias de corridas
async function saveIpmaRun(forecast, runs) {
    const rec = ipmaRunRecord(forecast.data);
    if (!rec || runs.some((r) => r.u === rec.u)) return;
    const keep = [...runs, rec].filter((r) => Date.parse(r.u + ':00Z') >= Date.now() - 9 * 864e5).sort((a, b) => a.u.localeCompare(b.u));
    await kvPut('ipma:runs:' + forecast.local.id, keep);
}
