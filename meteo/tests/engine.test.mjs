// Motor de previsão com dados reais de Lisboa (6 nov 2026, 15:45 UTC).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildForecast, buildSummary, perModelTable, parseEns, nowcastText, pickStation, nearStations, stationBlend, nearestIpmaLocal, ipmaModel, parseDet, ipmaRunRecord, ipmaPrevFromRuns } from '../lib/engine.js';
import { wquantile, robustMean, vecDir, haversine, bearing, compass, dewPoint, relHum, wfrac } from '../lib/stats.js';

const fx = (f) => JSON.parse(readFileSync(new URL(`./fixtures/${f}`, import.meta.url), 'utf8'));
const raw = fx('lisboa-2026-11-06.json');
// previsão oficial do IPMA (6 nov 2026, atualizada às 08:39) e lista de locais, reduzidas
const IPMA_LOCS = fx('ipma-locations.json'), IPMA_LX = fx('ipma-lisboa.json'), IPMA_ST = fx('ipma-santo-tirso.json'), ST_OBS = fx('santo-tirso-obs.json');
const NOW = '2026-11-06T15:45:00Z';
const LAT = 38.7223, LON = -9.1393;
const fc = buildForecast(raw, { lat: LAT, lon: LON, now: NOW });

test('estatística: quantis, média robusta, direção, geo e humidade', () => {
    assert.equal(wquantile([1, 2, 3], [1, 1, 1], 0.5), 2);
    assert.equal(wquantile([5], [1], 0.9), 5);
    assert.ok(Math.abs(robustMean([17, 17.5, 18, 11.9], [1, 1, 1, 1.3], 2) - 17.5) < 0.01, 'rejeita o modelo discrepante');
    assert.ok(Math.abs(vecDir([350, 10], [10, 10]) - 0) < 1e-6 || Math.abs(vecDir([350, 10], [10, 10]) - 360) < 1e-6);
    assert.ok(Math.abs(haversine(38.7223, -9.1393, 41.1579, -8.6291) - 274) < 3, 'Lisboa-Porto ≈ 274 km');
    assert.equal(compass(bearing(38.7, -9.1, 41.1, -8.6)), 'N');
    const td = dewPoint(20, 50);
    assert.ok(Math.abs(td - 9.3) < 0.2);
    assert.ok(Math.abs(relHum(20, td) - 50) < 0.5);
    assert.equal(wfrac([0, 0.2, 1], [1, 1, 2], 0.1), 0.75);
});

test('previsão tem o formato do contrato', () => {
    assert.equal(fc.v, 1);
    assert.equal(fc.hourly.length, 72);
    assert.equal(fc.daily.length, 16);
    assert.equal(fc.hourly[0].time, '2026-11-06T15:00');
    assert.equal(fc.location.timezone, 'Europe/Lisbon');
    for (const k of ['now', 'nowcast', 'indicators', 'warnings', 'fire', 'models', 'ensemble', 'sources']) assert.ok(k in fc, `falta ${k}`);
    for (const h of fc.hourly) {
        assert.ok(h.pop == null || (h.pop >= 0 && h.pop <= 100));
        assert.ok(Number.isInteger(h.code));
        assert.ok(h.tempLo <= h.temp + 0.05 && h.temp <= h.tempHi + 0.05, `faixa incoerente às ${h.time}`);
    }
    for (const d of fc.daily) {
        assert.ok(d.tmin <= d.tmax, `mín > máx em ${d.date}`);
        assert.ok(d.tmaxP10 <= d.tmax && d.tmax <= d.tmaxP90);
        assert.ok(['alta', 'media', 'baixa'].includes(d.confidence));
    }
    assert.ok(JSON.stringify(fc).length < 60000, 'resposta compacta');
});

test('usa 9 modelos e 212 cenários de 6 ensembles', () => {
    assert.equal(fc.models.length, 9);
    assert.equal(fc.ensemble.members, 212);
    assert.equal(fc.ensemble.models.length, 6);
    const e = parseEns(raw.ens);
    assert.deepEqual(e.systems.map((s) => s.members).sort((a, b) => a - b), [18, 21, 31, 40, 51, 51]);
});

test('verificação local com 7 dias de METAR dá mais peso ao melhor modelo', () => {
    const v = fc.verification;
    assert.equal(v.source, 'METAR');
    assert.ok(v.n > 100);
    assert.equal(v.best, 'ecmwf_ifs');
    const ec = fc.models.find((m) => m.id === 'ecmwf_ifs'), gfs = fc.models.find((m) => m.id === 'gfs_seamless');
    assert.ok(ec.weight > 2 * gfs.weight, 'ECMWF (erro 0,9 °C) pesa mais do que o GFS (viés +1,1 °C)');
    assert.equal(v.biasApplied, true);
});

test('observação combinada: a estação IPMA a 1 km pesa mais e a correção decai', () => {
    const o = fc.now.obs;
    assert.equal(o.source, 'IPMA');
    assert.ok(o.nearestKm <= 2, 'estação mais próxima a ~1 km');
    assert.equal(o.stations[0].name, 'Lisboa (Geofísico)', 'a mais próxima tem o maior peso');
    assert.ok(o.n >= 5 && o.distanceKm < 5, `várias estações, distância efetiva ${o.distanceKm} km`);
    assert.deepEqual(o.sources, ['IPMA', 'METAR']);
    assert.ok(o.repr > 0.8, 'muito representativa com uma estação a 1 km');
    assert.ok(fc.now.correction && fc.now.correction.temp < 0, 'modelos estavam mais quentes do que o observado');
    assert.match(o.station, /^Lisboa \(Geofísico\), .+ e mais \d+$/);
    // com a altitude da estação conhecida, o "agora" fica quase igual ao observado
    const st = pickStation({ ipmaStations: raw.ipma.stations, ipmaObs: raw.ipma.obs, metar: raw.metar, lat: LAT, lon: LON, nowMs: Date.parse(NOW) });
    const fc2 = buildForecast({ ...raw, station: st, stationElev: 77 }, { lat: LAT, lon: LON, now: NOW });
    assert.ok(Math.abs(fc2.now.temp - o.temp) <= 0.6, `agora ${fc2.now.temp} vs observado ${o.temp}`);
});

test('avisos IPMA do distrito, risco de incêndio e focos de satélite', () => {
    assert.ok(fc.warnings.length >= 1);
    assert.ok(fc.warnings.every((w) => w.source === 'IPMA' && ['yellow', 'orange', 'red'].includes(w.level)));
    assert.equal(fc.fire.risk.dico, '1106');
    assert.equal(fc.fire.risk.label, 'Reduzido');
    assert.ok(fc.fire.hotspots.count >= 1 && fc.fire.hotspots.items.every((h) => h.distanceKm <= 50));
    assert.equal(fc.fire.rule30.hours, 0);
});

test('fora de Portugal não há IPMA nem incêndios PT, e o motor não falha', () => {
    const f = buildForecast({ det: raw.det, ens: raw.ens }, { lat: 48.85, lon: 2.35, now: NOW });
    assert.deepEqual(f.warnings, []);
    assert.equal(f.fire.risk, null);
    assert.equal(f.now.obs, null);
    assert.equal(f.verification, null);
});

test('sem ensemble usa só os modelos, com confiança pela dispersão entre eles', () => {
    const f = buildForecast({ det: raw.det }, { lat: LAT, lon: LON, now: NOW });
    assert.equal(f.ensemble.members, 0);
    assert.equal(f.daily.length, 16);
    assert.ok(f.daily.slice(0, 5).every((d) => d.source === 'multimodelo'));
});

test('frase das próximas 2 horas', () => {
    const s = (p, prob) => ({ time: '2026-11-06T16:00', precip: p, prob });
    assert.equal(nowcastText(Array(8).fill(s(0, 0))), 'Sem chuva prevista nas próximas 2 horas.');
    assert.match(nowcastText([s(0, 0), s(0, 0), s(0.5, 80), s(0.5, 80), s(0.5, 80), s(0.5, 80), s(0.5, 80), s(0.5, 80)]), /^Chuva moderada a partir das/);
    assert.match(nowcastText(Array(8).fill(s(0.05, 30))), /^Possibilidade de chuva fraca/);
});

test('resumo para o Claude inclui o essencial', () => {
    const txt = buildSummary(fc, { perModel: perModelTable(raw.det) });
    for (const s of ['## Agora', 'Lisboa (Geofísico)', '## 16 dias', '## Incêndios', '## Verificação local', 'ECMWF IFS', 'Precipitação']) assert.ok(txt.includes(s), `falta "${s}"`);
    assert.ok(txt.length < 20000);
});

test('IPMA oficial: concelho mais próximo e leitura da previsão agregada', () => {
    const st = nearestIpmaLocal(IPMA_LOCS, 41.3354, -8.4745);
    assert.equal(st.name, 'Santo Tirso');
    assert.equal(st.id, 1131400);
    assert.ok(Math.abs(st.distanceKm - 0.7) < 0.05, `Santo Tirso a ${st.distanceKm} km`);
    const lx = nearestIpmaLocal(IPMA_LOCS, LAT, LON);
    assert.equal(lx.id, 1110622, 'Lisboa - Jardim Botânico, a ~1 km');
    assert.equal(nearestIpmaLocal(IPMA_LOCS, 39.5, -11), null, 'no mar, a mais de 15 km: nada');
    const P = parseDet(raw.det);
    const m = ipmaModel({ local: lx, data: IPMA_LX }, P);
    const at = (t) => P.times.indexOf(t);
    assert.equal(m.h.temp[at('2026-11-06T15:00')], 16.2);
    assert.equal(m.h.rh[at('2026-11-06T15:00')], 85.7);
    assert.equal(m.h.dir[at('2026-11-06T15:00')], 180, 'vento de S');
    // probabilidade só de 3 em 3 h: as horas com −99 ficam com a do período que acaba a seguir
    assert.equal(m.hp[at('2026-11-06T13:00')], 0.82);
    assert.equal(m.hp[at('2026-11-06T11:00')], 0.35);
    assert.equal(m.h.code[at('2026-11-06T15:00')], 63, 'tipo 9 (chuva/aguaceiros) → código WMO 63');
    // dia: máx./mín. e probabilidade; de 3 em 3 h depois do 3.º dia, com interpolação
    assert.equal(m.d.tmax[0], 18.3);
    assert.equal(m.dp[1], 0.61);
    assert.ok(m.ipma.days === 10 && m.ipma.updated === '2026-11-06T08:39');
});

test('IPMA oficial entra no consenso, nos modelos e nas fontes lado a lado', () => {
    const lx = nearestIpmaLocal(IPMA_LOCS, LAT, LON);
    const f = buildForecast({ ...raw, ipma: { ...raw.ipma, forecast: { local: lx, data: IPMA_LX } } }, { lat: LAT, lon: LON, now: NOW });
    assert.equal(f.models.length, 10);
    const ip = f.models.find((m) => m.id === 'ipma');
    assert.equal(ip.weight, 1.6, 'peso 1,6 nos primeiros dias, sem penalização por não ter verificação');
    assert.equal(ip.official, true);
    assert.equal(ip.local, 'Lisboa - Jardim Botânico');
    assert.equal(f.official.local, 'Lisboa - Jardim Botânico');
    assert.ok(f.official.distanceKm <= 1.1);
    assert.equal(f.official.daily.length, 10);
    assert.equal(f.official.hourly.times.length, 72);
    // mexe no consenso, mas é uma fonte entre dez
    const d1 = f.daily[1].tmax, d1b = fc.daily[1].tmax;
    assert.ok(Math.abs(d1 - d1b) < 1.5 && d1 !== d1b, `amanhã ${d1b} → ${d1} com o IPMA`);
    assert.ok(f.daily[1].pop >= fc.daily[1].pop, 'o IPMA dá 61% de chuva amanhã e puxa a probabilidade para cima');
    // fontes lado a lado: consenso, IPMA, 9 modelos e ensemble, em 3 dias
    const C = f.compare;
    assert.deepEqual(C.dates, ['2026-11-06', '2026-11-07', '2026-11-08']);
    assert.deepEqual(C.rows.map((r) => r.kind).filter((k, i, a) => a.indexOf(k) === i), ['consenso', 'oficial', 'modelo', 'ensemble']);
    assert.equal(C.rows.length, 12);
    const ens = C.rows.at(-1).days[1];
    assert.ok(ens.tmaxP10 <= ens.tmax && ens.tmax <= ens.tmaxP90, 'ensemble com P10–P90');
    assert.equal(C.rows[1].days[0].tmax, 18.3);
    assert.ok(C.notes.length >= 3 && /^Hoje: máx\. .+IPMA [+−±]/.test(C.notes[0]), C.notes[0]);
    assert.ok(C.farthest.length && ['alta', 'media', 'baixa'].includes(C.agreement));
    assert.ok(f.sources.includes('IPMA'));
    // o resumo para o Claude cruza o IPMA com os modelos
    const txt = buildSummary(f, { perModel: perModelTable(raw.det) });
    for (const x of ['Previsão oficial do IPMA: Lisboa - Jardim Botânico', '## Fontes lado a lado', '## Previsão oficial IPMA', 'Divergências:', '| IPMA', 'Estações: Lisboa (Geofísico)']) assert.ok(txt.includes(x), `falta "${x}"`);
    assert.ok(txt.length < 24000, `resumo com ${txt.length} caracteres`);
    assert.ok(JSON.stringify(f).length < 60000);
});

test('várias estações perto de Santo Tirso: altitude, distância, aeroporto contado uma vez e discrepantes de fora', () => {
    const base = { ipmaStations: ST_OBS.stations, ipmaObs: ST_OBS.obs, metar: ST_OBS.metar, lat: ST_OBS.lat, lon: ST_OBS.lon, nowMs: Date.parse(ST_OBS.now), targetElev: 66 };
    const c = nearStations(base);
    assert.ok(c.length >= 10, `${c.length} estações até 30 km`);
    assert.ok(c.every((x) => x.distanceKm <= 30));
    assert.equal(c.find((x) => x.source === 'IPMA').name, 'Paços Ferreira', 'Famalicão (7 km) não tem observação recente');
    const b = stationBlend({ ...base, elevs: ST_OBS.elevations, consensus: 14.4 });
    const by = (n) => b.rows.find((r) => r.name.startsWith(n));
    // Paços de Ferreira (293 m): +1,5 °C para os 66 m do ponto, mas pesa menos por estar 227 m acima
    const pf = by('Paços Ferreira');
    assert.ok(Math.abs(pf.tAdj - (pf.last.temp + 227 * 0.0065)) < 0.01);
    const pr = by('Porto, Pedras Rubras'), lppr = b.rows.find((r) => r.id === 'LPPR');
    assert.ok(lppr && pr.twin && lppr.twin, 'METAR LPPR e IPMA Pedras Rubras são o mesmo aeroporto');
    assert.ok(pf.share < pr.share + lppr.share, 'o aeroporto (à mesma altitude) pesa mais do que Paços de Ferreira');
    assert.ok(b.n >= 9 && b.dEff > 12 && b.dEff < 25, `distância efetiva ${b.dEff}`);
    assert.ok(b.repr > 0.35 && b.repr < 0.8, `confiança ${b.repr}: várias estações a ~20 km valem mais do que uma a 10 km e 227 m acima`);
    assert.match(b.label, / e mais \d+$/);
    // uma estação avariada (30 °C) fica de fora
    const broken = JSON.parse(JSON.stringify(ST_OBS.obs));
    const last = Object.keys(broken).sort().at(-1);
    broken[last]['1210625'].temperatura = 30;
    const b2 = stationBlend({ ...base, ipmaObs: broken, elevs: ST_OBS.elevations, consensus: 14.4 });
    assert.equal(b2.rows.find((r) => r.name === 'Guimarães').used, false);
    assert.ok(Math.abs(b2.temp - b.temp) < 0.6, 'a combinação quase não muda');
});

test('sem METAR perto, a verificação usa várias estações IPMA (24 h + histórico guardado)', () => {
    const f = buildForecast({ ...raw, metarHistory: null }, { lat: LAT, lon: LON, now: NOW });
    const v = f.verification;
    assert.ok(v.stations >= 3, `${v.stations} estações`);
    assert.match(v.source, /IPMA/);
    assert.ok(v.n >= 48 && v.models.length === 5);
    assert.ok(v.names.includes('Lisboa (Geofísico)'));
    // histórico guardado da estação mais próxima (KV) alarga a verificação
    const st = pickStation({ ipmaStations: raw.ipma.stations, ipmaObs: raw.ipma.obs, metar: raw.metar, lat: LAT, lon: LON, nowMs: Date.parse(NOW) });
    const older = st.series.map((o) => ({ ...o, ms: o.ms - 864e5 })).concat(st.series.map((o) => ({ ...o, ms: o.ms - 2 * 864e5 })));
    const f2 = buildForecast({ ...raw, metarHistory: null, obsHistories: { [st.id]: older } }, { lat: LAT, lon: LON, now: NOW });
    assert.ok(f2.verification.n > v.n, 'mais comparações com o histórico');
    assert.ok(f2.verification.days >= 2);
    // METAR a mais de 12 km (aqui a ~19 km do aeroporto): entra como mais uma estação, com os seus 7 dias
    const far = buildForecast(raw, { lat: 38.65, lon: -9.0, now: NOW });
    assert.equal(far.verification.source, 'IPMA+METAR');
    assert.equal(far.verification.days, 7, 'histórico METAR vem do mais recente para o mais antigo');
    assert.ok(far.verification.names.includes('Lisbon Arpt, LI, PT'));
});

test('corridas anteriores do IPMA (guardadas pela tarefa agendada) entram na verificação', () => {
    const lx = nearestIpmaLocal(IPMA_LOCS, LAT, LON);
    const H = raw.prev.hourly;
    const ipmaPrev = { times: H.time, temp: H.temperature_2m_previous_day1_ecmwf_ifs.map((x) => (x == null ? null : x + 0.8)) };
    const f = buildForecast({ ...raw, ipma: { ...raw.ipma, forecast: { local: lx, data: IPMA_LX } }, ipmaPrev }, { lat: LAT, lon: LON, now: NOW });
    const vi = f.verification.models.find((m) => m.id === 'ipma');
    const ve = f.verification.models.find((m) => m.id === 'ecmwf_ifs');
    assert.ok(vi && vi.n === ve.n, 'IPMA verificado como os modelos');
    assert.ok(Math.abs(vi.bias - ve.bias - 0.8) < 0.15, `viés IPMA ${vi.bias} vs ECMWF ${ve.bias}`);
    assert.ok(f.models.find((m) => m.id === 'ipma').skill, 'com erro local');
    assert.ok(f.official.skill);
});

test('arquivo das corridas do IPMA: previsão feita 18 a 42 h antes de cada hora', () => {
    const r = ipmaRunRecord(IPMA_LX);
    assert.equal(r.u, '2026-11-06T08:39');
    assert.ok(r.h.length >= 90 && r.h.every(([t, v]) => t.length === 16 && Number.isFinite(v)));
    const p = ipmaPrevFromRuns([r]);
    assert.equal(p.times[0], '2026-11-07T03:00', 'primeira hora com 18 h de antecedência');
    assert.equal(p.times.at(-1), '2026-11-08T02:00');
    assert.equal(p.times.length, 24);
    // com duas corridas, fica a mais recente que ainda tenha pelo menos 18 h de antecedência
    const older = { u: '2026-11-05T20:00', h: r.h.map(([t, v]) => [t, v - 5]) };
    const p2 = ipmaPrevFromRuns([older, r]);
    assert.equal(p2.temp[p2.times.indexOf('2026-11-07T03:00')], r.h.find(([t]) => t === '2026-11-07T03:00')[1]);
    assert.equal(p2.temp[p2.times.indexOf('2026-11-06T15:00')], r.h.find(([t]) => t === '2026-11-06T15:00')[1] - 5, 'hora de hoje vem da corrida de ontem');
    assert.equal(ipmaPrevFromRuns([]), null);
});
