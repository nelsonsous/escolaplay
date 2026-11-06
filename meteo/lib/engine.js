// Motor de previsão: junta modelos, ensembles e observações num só resultado (formato em docs/API.md).
// Funções puras: corre no browser (PWA) e no Node (tarefa agendada do Claude). Sem acesso à rede.
import { DET_MODELS, ENS_MODELS, inPortugal, FIRMS, IPMA_MODEL, IPMA_MAX_KM, OBS_RADIUS_KM } from './sources.js';
import {
    isNum, clamp, r1, r0, wmean, wstd, wquantile, wmedian, robustMean, robustKeep, wfrac, haversine, bearing, compass,
    WIND_FROM, vecDir, dewPoint, relHum,
} from './stats.js';

export const LEVEL_LABELS = ['nenhum', 'baixo', 'moderado', 'elevado', 'muito elevado'];
export const RCM_LABELS = [null, 'Reduzido', 'Moderado', 'Elevado', 'Muito elevado', 'Máximo'];
const DOW = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const MON = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const LAPSE = 0.0065; // °C por metro
const DEW_LAPSE = 0.0018; // o ponto de orvalho desce menos com a altitude

const HV = { temp: 'temperature_2m', feels: 'apparent_temperature', dew: 'dew_point_2m', rh: 'relative_humidity_2m', precip: 'precipitation',
    snow: 'snowfall', code: 'weather_code', cloud: 'cloud_cover', cloudLow: 'cloud_cover_low', wind: 'wind_speed_10m', dir: 'wind_direction_10m',
    gust: 'wind_gusts_10m', pressure: 'pressure_msl', vis: 'visibility', cape: 'cape', uv: 'uv_index', isDay: 'is_day', frz: 'freezing_level_height' };
const DV = { code: 'weather_code', tmax: 'temperature_2m_max', tmin: 'temperature_2m_min', feelsMax: 'apparent_temperature_max',
    precip: 'precipitation_sum', windMax: 'wind_speed_10m_max', gustMax: 'wind_gusts_10m_max', dir: 'wind_direction_10m_dominant',
    uvMax: 'uv_index_max', sunrise: 'sunrise', sunset: 'sunset' };

// ---------- tempo ----------
const localToMs = (iso, off) => Date.parse(iso.length === 16 ? iso + ':00Z' : iso + 'Z') - off * 1000;
const msToLocal = (ms, off) => new Date(ms + off * 1000).toISOString().slice(0, 16);
const hourOf = (iso) => Number(iso.slice(11, 13));
export function dayLabel(date, todayDate) {
    const [y, m, d] = date.split('-').map(Number);
    const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    if (todayDate && date === todayDate) return 'hoje';
    return `${DOW[wd]} (${d} ${MON[m - 1]})`;
}
const shortDay = (date) => { const [y, m, d] = date.split('-').map(Number); return `${DOW[new Date(Date.UTC(y, m - 1, d)).getUTCDay()].slice(0, 3)} ${d}`; };

// ---------- leitura das respostas ----------
export function parseDet(det) {
    const H = det?.hourly || {}, D = det?.daily || {}, M = det?.minutely_15 || {};
    const ec = H.temperature_2m_ecmwf_ifs;
    const models = [];
    for (const meta of DET_MODELS) {
        const t = H[`temperature_2m_${meta.id}`];
        if (!t || t.filter(isNum).length < 6) continue;
        if (meta.dupOf && ec && sameSeries(t, ec)) continue; // regional fora do domínio = cópia do ECMWF
        const h = {}, d = {};
        for (const [k, v] of Object.entries(HV)) h[k] = H[`${v}_${meta.id}`] || [];
        for (const [k, v] of Object.entries(DV)) d[k] = D[`${v}_${meta.id}`] || [];
        models.push({ id: meta.id, meta, h, d, m15: M[`precipitation_${meta.id}`] || [], skill: null, factor: 1, corrDay: 0, corrNight: 0 });
    }
    return { times: H.time || [], dates: D.time || [], m15: M.time || [], models, elevation: det?.elevation,
        timezone: det?.timezone || 'UTC', offset: det?.utc_offset_seconds || 0 };
}
function sameSeries(a, b) {
    let n = 0, same = 0;
    for (let i = 0; i < a.length; i++) if (isNum(a[i]) && isNum(b[i])) { n++; if (Math.abs(a[i] - b[i]) < 0.05) same++; }
    return n > 0 && same / n > 0.9;
}

export function parseEns(ens) {
    if (!ens || ens.error || !ens.daily) return null;
    const D = ens.daily, H = ens.hourly || {};
    const sys = new Map();
    const KEY = { temperature_2m_max: 'tmax', temperature_2m_min: 'tmin', precipitation_sum: 'precip', wind_gusts_10m_max: 'gust' };
    const re = /^(temperature_2m_max|temperature_2m_min|precipitation_sum|wind_gusts_10m_max)(?:_member(\d+))?_(.+)$/;
    for (const [k, arr] of Object.entries(D)) {
        const m = re.exec(k);
        if (!m || !Array.isArray(arr) || !arr.some(isNum)) continue;
        const meta = ENS_MODELS.find((e) => m[3].startsWith(e.id));
        if (!meta) continue;
        if (!sys.has(meta.id)) sys.set(meta.id, { meta, members: new Map() });
        const g = sys.get(meta.id), mk = m[2] || '00';
        if (!g.members.has(mk)) g.members.set(mk, {});
        g.members.get(mk)[KEY[m[1]]] = arr;
    }
    const reH = /^precipitation(?:_member(\d+))?_(.+)$/;
    for (const [k, arr] of Object.entries(H)) {
        const m = reH.exec(k);
        if (!m) continue;
        const meta = ENS_MODELS.find((e) => m[2].startsWith(e.id));
        const mem = meta && sys.get(meta.id)?.members.get(m[1] || '00');
        if (mem) mem.hp = arr;
    }
    const members = [], systems = [];
    for (const g of sys.values()) {
        const list = [...g.members.values()].filter((x) => x.tmax);
        if (!list.length) continue;
        const w = g.meta.w / list.length;
        for (const x of list) members.push({ ...x, w, sys: g.meta.id });
        systems.push({ id: g.meta.id, name: g.meta.name, members: list.length, days: list[0].tmax.filter(isNum).length });
    }
    if (!members.length) return null;
    return { dates: D.time || [], hours: H.time || [], members, systems };
}

// ---------- observações ----------
const IPMA_DIR = [null, 0, 45, 90, 135, 180, 225, 270, 315, 0];
const okv = (x) => (isNum(x) && x > -90 ? x : null);

// Série horária de uma estação IPMA (observations.json: { hora UTC: { id: registo } })
export function ipmaSeries(obs, id) {
    const out = [];
    for (const [t, recs] of Object.entries(obs || {})) {
        const r = recs && recs[id];
        if (!r) continue;
        const temp = okv(r.temperatura), rh = okv(r.humidade);
        out.push({ ms: Date.parse(t + ':00Z'), temp, rh, dew: dewPoint(temp, rh), wind: okv(r.intensidadeVentoKM),
            dir: IPMA_DIR[r.idDireccVento] ?? null, gust: null, pressure: okv(r.pressao), precip1h: okv(r.precAcumulada) });
    }
    return out.sort((a, b) => a.ms - b.ms);
}

function metarRows(list) {
    return (Array.isArray(list) ? list : []).map((x) => {
        const vis = x.visib == null ? null : String(x.visib).includes('+') ? 16 : Number(x.visib) * 1.609;
        return { id: x.icaoId, name: x.name || x.icaoId, lat: x.lat, lon: x.lon, elev: x.elev, ms: Date.parse(x.reportTime),
            temp: okv(x.temp), dew: okv(x.dewp), rh: relHum(x.temp, x.dewp), wind: isNum(x.wspd) ? x.wspd * 1.852 : null,
            gust: isNum(x.wgst) ? x.wgst * 1.852 : null, dir: isNum(x.wdir) ? x.wdir : null, pressure: isNum(x.altim) ? x.altim : null,
            vis: isNum(vis) ? vis : null, precip1h: null };
    }).filter((r) => isNum(r.ms));
}

// Escolhe a estação mais representativa com observação recente (≤ 2,5 h)
export function pickStation({ ipmaStations, ipmaObs, metar, lat, lon, nowMs }) {
    const cands = [];
    const feats = Array.isArray(ipmaStations) ? ipmaStations : ipmaStations?.features || [];
    if (ipmaObs && feats.length) {
        const near = feats.map((f) => ({ id: String(f.properties.idEstacao), name: f.properties.localEstacao,
            lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0] }))
            .map((s) => ({ ...s, distanceKm: haversine(lat, lon, s.lat, s.lon) })).filter((s) => s.distanceKm <= 25)
            .sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 6);
        for (const s of near) {
            const series = ipmaSeries(ipmaObs, s.id);
            const last = [...series].reverse().find((o) => isNum(o.temp));
            if (last && nowMs - last.ms <= 2.5 * 36e5) cands.push({ source: 'IPMA', ...s, elev: null, last, series });
        }
    }
    const rows = metarRows(metar);
    const byId = new Map();
    for (const r of rows) { if (!byId.has(r.id)) byId.set(r.id, []); byId.get(r.id).push(r); }
    for (const [id, list] of byId) {
        list.sort((a, b) => a.ms - b.ms);
        const last = [...list].reverse().find((o) => isNum(o.temp));
        const d = haversine(lat, lon, list[0].lat, list[0].lon);
        if (last && d <= 30 && nowMs - last.ms <= 2.5 * 36e5) cands.push({ source: 'METAR', id, name: list[0].name, lat: list[0].lat, lon: list[0].lon, elev: list[0].elev, distanceKm: d, last, series: list });
    }
    if (!cands.length) return null;
    const score = (c) => c.distanceKm + (c.source === 'METAR' ? 2 : 0) + (nowMs - c.last.ms) / 36e5 * 3;
    cands.sort((a, b) => score(a) - score(b));
    return cands[0];
}

// Todas as estações IPMA e METAR até radiusKm com observação recente (≤ 2,5 h), da mais próxima para a mais longe
export function nearStations({ ipmaStations, ipmaObs, metar, lat, lon, nowMs, radiusKm = OBS_RADIUS_KM, maxAgeH = 2.5 }) {
    const out = [];
    const lastOf = (series) => { for (let i = series.length - 1; i >= 0; i--) if (isNum(series[i].temp)) return series[i]; return null; };
    const feats = Array.isArray(ipmaStations) ? ipmaStations : ipmaStations?.features || [];
    if (ipmaObs && feats.length) {
        for (const f of feats) {
            const c = f?.geometry?.coordinates;
            if (!Array.isArray(c) || !isNum(c[0]) || !isNum(c[1])) continue;
            const d = haversine(lat, lon, c[1], c[0]);
            if (d > radiusKm) continue;
            const id = String(f.properties.idEstacao), series = ipmaSeries(ipmaObs, id), last = lastOf(series);
            if (last && nowMs - last.ms <= maxAgeH * 36e5) out.push({ source: 'IPMA', id, name: f.properties.localEstacao, lat: c[1], lon: c[0], elev: null, distanceKm: d, last, series });
        }
    }
    const byId = new Map();
    for (const r of metarRows(metar)) { if (!byId.has(r.id)) byId.set(r.id, []); byId.get(r.id).push(r); }
    for (const [id, list] of byId) {
        list.sort((a, b) => a.ms - b.ms);
        const d = haversine(lat, lon, list[0].lat, list[0].lon), last = lastOf(list);
        if (last && d <= radiusKm && nowMs - last.ms <= maxAgeH * 36e5) out.push({ source: 'METAR', id, name: list[0].name, lat: list[0].lat, lon: list[0].lon, elev: isNum(list[0].elev) ? list[0].elev : null, distanceKm: d, last, series: list });
    }
    return out.sort((a, b) => a.distanceKm - b.distanceKm);
}

// Peso de cada estação para o ponto: distância 1/(d+2)², semelhança de altitude exp(−|Δz|/150) e frescura.
// v = variância do erro de representatividade (°C²), usada para saber quanto confiar na observação combinada.
const freshOf = (ageMin) => (ageMin <= 75 ? 1 : Math.exp(-(ageMin - 75) / 60));
function weighStations(cands, { elevs = {}, targetElev, nowMs }) {
    const rows = cands.map((c) => {
        const elev = isNum(c.elev) ? c.elev : isNum(elevs[c.id]) ? elevs[c.id] : null;
        const dz = isNum(elev) && isNum(targetElev) ? elev - targetElev : null;
        const ageMin = (nowMs - c.last.ms) / 6e4, fresh = freshOf(ageMin);
        const geo = (1 / (c.distanceKm + 2) ** 2) * (dz == null ? 0.5 : Math.exp(-Math.abs(dz) / 150));
        const v = (0.4 + 0.06 * c.distanceKm) ** 2 + ((dz == null ? 100 : dz) / 250) ** 2;
        return { ...c, elev, dz, ageMin, fresh, geo, w: geo * fresh, v: v / fresh, twin: null };
    });
    // METAR e estação IPMA no mesmo sítio (aeroportos): contam como um só local
    for (const r of rows) {
        if (r.source !== 'METAR') continue;
        const t = rows.find((x) => x.source === 'IPMA' && haversine(r.lat, r.lon, x.lat, x.lon) <= 2);
        if (t) { for (const x of [r, t]) { x.geo *= 0.5; x.w *= 0.5; x.v *= 2; } r.twin = t.name; t.twin = r.name; }
    }
    return rows;
}

// Observação combinada no ponto: anomalias (observado ajustado à altitude − consenso à mesma hora), sem as discrepantes
function blendObs(rows, { cAt, nowMs }) {
    for (const r of rows) {
        const o = r.last, adjT = (r.dz ?? 0) * LAPSE, adjD = (r.dz ?? 0) * DEW_LAPSE;
        r.tAdj = isNum(o.temp) ? o.temp + adjT : null;
        r.dAdj = isNum(o.dew) ? o.dew + adjD : null;
        const cT = cAt(o.ms, 'temp'), cD = cAt(o.ms, 'dew');
        r.aT = isNum(r.tAdj) && isNum(cT) ? r.tAdj - cT : null;
        r.aD = isNum(r.dAdj) && isNum(cD) ? r.dAdj - cD : null;
    }
    const keep = robustKeep(rows.map((r) => r.aT), rows.map((r) => r.w), 1.5);
    rows.forEach((r, i) => { r.used = !!keep[i]; });
    const U = rows.filter((r) => r.used);
    if (!U.length) return null;
    const W = U.reduce((s, r) => s + r.w, 0);
    if (!(W > 0)) return null;
    const ws = U.map((r) => r.w);
    const A = wmean(U.map((r) => r.aT), ws), AD = wmean(U.map((r) => r.aD), ws);
    const ms = U.reduce((s, r) => s + r.w * r.last.ms, 0) / W;
    const dEff = U.reduce((s, r) => s + r.w * r.distanceKm, 0) / W;
    const zEff = U.reduce((s, r) => s + r.w * Math.abs(r.dz ?? 100), 0) / W;
    // confiança na observação combinada: inversa da variância, sem descer abaixo de 60% da melhor estação
    // (os erros das estações estão correlacionados) e pior quando as estações discordam entre si
    const info = U.reduce((s, r) => s + 1 / r.v, 0);
    const sd = U.length >= 3 ? wstd(U.map((r) => r.aT), ws) : 0;
    const varB = Math.max(1 / info, 0.6 * Math.min(...U.map((r) => r.v)), 0.5 * sd * sd);
    const repr = clamp(1.5 / (1.5 + varB), 0, 0.95);
    for (const r of rows) r.share = r.used ? r.w / W : 0;
    return { A, AD, ms, dEff, zEff, repr, sd, n: U.length, rows };
}
// O que já se mediu hoje no ponto: média hora a hora das estações usadas (ajustadas à altitude), só nas horas
// em que reportaram estações com pelo menos 40% do peso
function seenSeries(rows, date, off) {
    const U = rows.filter((r) => r.used);
    const G = U.reduce((s, r) => s + r.geo, 0);
    const byHour = new Map();
    for (const r of U) {
        for (const o of r.series || []) {
            if (!isNum(o.temp)) continue;
            const h = Math.round(o.ms / 36e5);
            if (Math.abs(o.ms - h * 36e5) > 10 * 6e4 || !msToLocal(h * 36e5, off).startsWith(date)) continue;
            if (!byHour.has(h)) byHour.set(h, new Map());
            byHour.get(h).set(r, o.temp + (r.dz ?? 0) * LAPSE);
        }
    }
    const out = [];
    for (const m of byHour.values()) {
        let s = 0, w = 0;
        for (const [r, t] of m) { s += r.geo * t; w += r.geo; }
        if (G > 0 && w >= 0.4 * G) out.push(s / w);
    }
    return out;
}
// Observação combinada sem o resto do motor (testes e diagnóstico): consensus = número ou função (ms, chave) → valor
export function stationBlend({ ipmaStations, ipmaObs, metar, lat, lon, nowMs, elevs = {}, targetElev, consensus }) {
    const cands = nearStations({ ipmaStations, ipmaObs, metar, lat, lon, nowMs });
    if (!cands.length) return null;
    const cAt = typeof consensus === 'function' ? consensus : () => consensus;
    const b = blendObs(weighStations(cands, { elevs, targetElev, nowMs }), { cAt, nowMs });
    if (!b) return null;
    const U = b.rows.filter((r) => r.used);
    return { ...b, label: stationLabel(U), used: U, temp: isNum(b.A) ? cAt(b.ms, 'temp') + b.A : null };
}
const stationLabel = (U) => {
    const names = U.slice().sort((a, b) => b.w - a.w).map((r) => r.name);
    return names.length <= 3 ? names.join(', ') : `${names.slice(0, 2).join(', ')} e mais ${names.length - 2}`;
};

// ---------- previsão oficial do IPMA (por concelho) ----------
const IPMA_COMPASS = { N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, SO: 225, W: 270, O: 270, NW: 315, NO: 315 };
// tipo de tempo IPMA (weather-type-classe.json) → código WMO do resto do motor
const IPMA_WX = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 2, 6: 81, 7: 80, 8: 82, 9: 63, 10: 61, 11: 65, 12: 61, 13: 61, 14: 65, 15: 53, 16: 45, 17: 45,
    18: 73, 19: 95, 20: 95, 21: 96, 22: 0, 23: 95, 24: 2, 25: 2, 26: 45, 27: 3, 28: 85, 29: 71, 30: 71 };
const IPMA_TXT = { 1: 'Céu limpo', 2: 'Céu pouco nublado', 3: 'Céu parcialmente nublado', 4: 'Céu muito nublado ou encoberto', 5: 'Céu nublado por nuvens altas',
    6: 'Aguaceiros/chuva', 7: 'Aguaceiros/chuva fracos', 8: 'Aguaceiros/chuva fortes', 9: 'Chuva/aguaceiros', 10: 'Chuva fraca ou chuvisco', 11: 'Chuva/aguaceiros fortes',
    12: 'Períodos de chuva', 13: 'Períodos de chuva fraca', 14: 'Períodos de chuva forte', 15: 'Chuvisco', 16: 'Neblina', 17: 'Nevoeiro ou nuvens baixas', 18: 'Neve',
    19: 'Trovoada', 20: 'Aguaceiros e possibilidade de trovoada', 21: 'Granizo', 22: 'Geada', 23: 'Chuva e possibilidade de trovoada', 24: 'Nebulosidade convectiva',
    25: 'Céu com períodos de muito nublado', 26: 'Nevoeiro', 27: 'Céu nublado', 28: 'Aguaceiros de neve', 29: 'Chuva e neve', 30: 'Chuva e neve' };
const WIND_CLS = [null, 'fraco', 'moderado', 'forte', 'muito forte'];
const ipNum = (s) => { const x = typeof s === 'number' ? s : parseFloat(s); return Number.isFinite(x) && x > -90 ? x : null; };

// Concelho (ou local) da previsão do IPMA mais próximo, até maxKm
export function nearestIpmaLocal(locations, lat, lon, maxKm = IPMA_MAX_KM) {
    let best = null;
    for (const x of Array.isArray(locations) ? locations : []) {
        const la = Number(x.latitude), lo = Number(x.longitude);
        if (!isNum(la) || !isNum(lo)) continue;
        const d = haversine(lat, lon, la, lo);
        if (!best || d < best.distanceKm) best = { id: x.globalIdLocal, name: x.local, lat: la, lon: lo, distanceKm: d, idAreaAviso: x.idAreaAviso || null, idDistrito: x.idDistrito ?? null };
    }
    return best && best.distanceKm <= maxKm ? best : null;
}

// Previsão agregada do IPMA → "modelo" alinhado com as horas e os dias dos outros (hora local nos dois lados)
export function ipmaModel(forecast, P) {
    const data = Array.isArray(forecast?.data) ? forecast.data : null;
    const local = forecast?.local;
    if (!data?.length || !local) return null;
    const pts = [], D = new Map();
    let updated = null;
    for (const r of data) {
        const t = String(r?.dataPrev || '').slice(0, 16);
        if (t.length !== 16) continue;
        if (!updated && r.dataUpdate) updated = String(r.dataUpdate).slice(0, 16);
        if (r.idPeriodo === 24) { D.set(t.slice(0, 10), r); continue; }
        if (r.idPeriodo !== 1 && r.idPeriodo !== 3) continue;
        const temp = ipNum(r.tMed), rh = ipNum(r.hR);
        pts.push({ t, ms: Date.parse(t + ':00Z'), step: r.idPeriodo, temp, rh, wind: ipNum(r.ffVento), dir: IPMA_COMPASS[r.ddVento] ?? null,
            pop: ipNum(r.probabilidadePrecipita), code: IPMA_WX[r.idTipoTempo] ?? null, dew: dewPoint(temp, rh) });
    }
    pts.sort((a, b) => a.ms - b.ms);
    const H = Object.fromEntries(['temp', 'feels', 'dew', 'rh', 'precip', 'snow', 'code', 'cloud', 'cloudLow', 'wind', 'dir', 'gust', 'pressure', 'vis', 'cape', 'uv', 'isDay', 'frz'].map((k) => [k, []]));
    const hp = [];
    let j = 0, nH = 0;
    for (let i = 0; i < P.times.length; i++) {
        const ms = Date.parse(P.times[i] + ':00Z');
        while (j < pts.length && pts[j].ms < ms) j++;
        const nx = pts[j], pv = pts[j - 1];
        const exact = nx && nx.ms === ms ? nx : null;
        // entre pontos de 3 em 3 h: interpolação linear (temperatura, humidade, vento); tipo e direção do período que acaba a seguir
        const near = !exact && nx && pv && nx.ms - pv.ms <= 3 * 36e5 ? [pv, nx, (ms - pv.ms) / (nx.ms - pv.ms)] : null;
        const val = (k) => (exact ? exact[k] : near && isNum(near[0][k]) && isNum(near[1][k]) ? near[0][k] + near[2] * (near[1][k] - near[0][k]) : null);
        for (const k of ['temp', 'rh', 'wind', 'dew']) H[k][i] = val(k);
        H.dir[i] = exact ? exact.dir : near ? near[1].dir : null;
        H.code[i] = exact ? exact.code : near ? near[1].code : null;
        if (isNum(H.temp[i])) nH++;
        // probabilidade de 3 em 3 h (nas horas intermédias vem −99): vale para o período que acaba nesse ponto
        let p = null;
        for (let k = j; k < pts.length && pts[k].ms - ms < 3 * 36e5; k++) if (isNum(pts[k].pop)) { p = pts[k].pop; break; }
        if (p == null && (exact || near)) for (let k = j - 1; k >= 0 && ms - pts[k].ms < 3 * 36e5; k--) if (isNum(pts[k].pop)) { p = pts[k].pop; break; }
        hp[i] = isNum(p) ? p / 100 : null;
    }
    const dkeys = ['code', 'tmax', 'tmin', 'feelsMax', 'precip', 'windMax', 'gustMax', 'dir', 'uvMax', 'sunrise', 'sunset'];
    const d = Object.fromEntries(dkeys.map((k) => [k, []]));
    const dp = [], wcls = [], types = [];
    P.dates.forEach((date, k) => {
        const r = D.get(date);
        d.tmax[k] = r ? ipNum(r.tMax) : null; d.tmin[k] = r ? ipNum(r.tMin) : null;
        d.code[k] = r ? IPMA_WX[r.idTipoTempo] ?? null : null; d.dir[k] = r ? IPMA_COMPASS[r.ddVento] ?? null : null;
        d.uvMax[k] = r ? ipNum(r.iUv) : null;
        const p = r ? ipNum(r.probabilidadePrecipita) : null;
        dp[k] = isNum(p) ? p / 100 : null; wcls[k] = r ? ipNum(r.idFfxVento) : null; types[k] = r ? r.idTipoTempo ?? null : null;
    });
    if (nH < 6 && !d.tmax.some(isNum)) return null;
    // os 10 dias tal como o IPMA os publica (para o resumo e a app)
    const daily = [...D.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, r]) => {
        const p = ipNum(r.probabilidadePrecipita);
        return { date, tmax: ipNum(r.tMax), tmin: ipNum(r.tMin), pop: isNum(p) ? Math.round(p) : null, code: IPMA_WX[r.idTipoTempo] ?? null, type: r.idTipoTempo ?? null,
            text: IPMA_TXT[r.idTipoTempo] || null, uv: ipNum(r.iUv), wind: WIND_CLS[ipNum(r.idFfxVento)] || null, dir: r.ddVento || null };
    });
    return { id: IPMA_MODEL.id, meta: IPMA_MODEL, h: H, d, m15: [], hp, dp, wcls, types, skill: null, factor: 1, corrDay: 0, corrNight: 0,
        ipma: { id: local.id, name: local.name, distanceKm: local.distanceKm, updated, hours: nH, days: d.tmax.filter(isNum).length, daily } };
}
// Arquivo das corridas do IPMA (a API só dá a atual; a tarefa agendada guarda-as no KV):
// registo compacto de uma corrida { u: atualização, h: [[hora local, temperatura], …] }
export function ipmaRunRecord(data) {
    if (!Array.isArray(data)) return null;
    const u = String(data.find((r) => r?.dataUpdate)?.dataUpdate || '').slice(0, 16);
    const h = data.filter((r) => r && (r.idPeriodo === 1 || r.idPeriodo === 3) && isNum(ipNum(r.tMed))).map((r) => [String(r.dataPrev).slice(0, 16), ipNum(r.tMed)]);
    return u.length === 16 && h.length ? { u, h } : null;
}
// Para cada hora, a previsão da corrida mais recente feita 18 a 42 h antes (como as "previsões a 1 dia" dos modelos)
export function ipmaPrevFromRuns(runs) {
    if (!Array.isArray(runs) || !runs.length) return null;
    const best = new Map();
    for (const r of runs) {
        const u = Date.parse(r?.u + ':00Z');
        if (!isNum(u)) continue;
        for (const [t, v] of r.h || []) {
            const lead = (Date.parse(t + ':00Z') - u) / 36e5;
            if (!(lead >= 18 && lead <= 42) || !isNum(v)) continue;
            const b = best.get(t);
            if (!b || u > b.u) best.set(t, { u, v });
        }
    }
    if (best.size < 6) return null;
    const times = [...best.keys()].sort();
    return { times, temp: times.map((t) => best.get(t).v) };
}
// Corridas anteriores do IPMA guardadas pela tarefa agendada (previsão a ~1 dia) → coluna para a verificação local
function withIpmaPrev(prev, ipmaPrev) {
    const H = prev?.hourly;
    if (!H?.time || !Array.isArray(ipmaPrev?.times) || !Array.isArray(ipmaPrev?.temp)) return prev;
    const map = new Map(ipmaPrev.times.map((t, i) => [String(t).slice(0, 16), ipmaPrev.temp[i]]));
    return { ...prev, hourly: { ...H, temperature_2m_previous_day1_ipma: H.time.map((t) => (isNum(map.get(t)) ? map.get(t) : null)) } };
}

// ---------- verificação local (erro de cada modelo a 1 dia contra a estação) ----------
function verify(prev, series, ctx) {
    const H = prev?.hourly;
    if (!H?.time || !series?.length) return null;
    const obsByHour = new Map();
    for (const o of series) {
        if (!isNum(o.temp)) continue;
        const h = Math.round(o.ms / 36e5);
        if (Math.abs(o.ms - h * 36e5) <= 20 * 60e3 && !obsByHour.has(h)) obsByHour.set(h, o.temp);
    }
    const adj = isNum(ctx.stationElev) && isNum(ctx.targetElev) ? (ctx.stationElev - ctx.targetElev) * LAPSE : 0;
    const res = {};
    for (const k of Object.keys(H)) {
        const m = /^temperature_2m_previous_day1_(.+)$/.exec(k);
        if (!m) continue;
        const arr = H[k];
        let n = 0, se = 0, sa = 0, nd = 0, sd = 0, nn = 0, sn = 0;
        for (let i = 0; i < H.time.length; i++) {
            const ms = localToMs(H.time[i], ctx.offset);
            if (ms > ctx.nowMs - 36e5) break;
            const o = obsByHour.get(Math.round(ms / 36e5));
            if (!isNum(arr[i]) || !isNum(o)) continue;
            const e = arr[i] - (o + adj);
            n++; se += e; sa += Math.abs(e);
            const hr = hourOf(H.time[i]);
            if (hr >= 10 && hr <= 18) { nd++; sd += e; } else if (hr >= 21 || hr <= 7) { nn++; sn += e; }
        }
        if (n >= 6) res[m[1]] = { n, bias: se / n, mae: sa / n, nDay: nd, biasDay: nd >= 6 ? sd / nd : null, nNight: nn, biasNight: nn >= 6 ? sn / nn : null };
    }
    return Object.keys(res).length ? res : null;
}
// Junta a verificação de várias estações: peso = distância/altitude × horas (até 72 h por estação, para uma série
// longa não abafar as outras). n = total de comparações; nMax = a série mais longa (para não exagerar a confiança no viés).
function combineVer(parts) {
    const res = {};
    for (const id of new Set(parts.flatMap((p) => Object.keys(p.ver)))) {
        let n = 0, nMax = 0, sw = 0, sb = 0, sa = 0, swd = 0, sbd = 0, nd = 0, swn = 0, sbn = 0, nn = 0;
        for (const p of parts) {
            const v = p.ver[id];
            if (!v) continue;
            const w = p.w * Math.min(v.n, 72);
            n += v.n; nMax = Math.max(nMax, v.n); sw += w; sb += w * v.bias; sa += w * v.mae;
            if (isNum(v.biasDay)) { const x = p.w * Math.min(v.nDay, 36); swd += x; sbd += x * v.biasDay; nd = Math.max(nd, v.nDay); }
            if (isNum(v.biasNight)) { const x = p.w * Math.min(v.nNight, 36); swn += x; sbn += x * v.biasNight; nn = Math.max(nn, v.nNight); }
        }
        if (sw > 0) res[id] = { n, nMax, bias: sb / sw, mae: sa / sw, nDay: nd, biasDay: swd > 0 ? sbd / swd : null, nNight: nn, biasNight: swn > 0 ? sbn / swn : null };
    }
    return Object.keys(res).length ? res : null;
}
function mergeSeries(...lists) {
    const map = new Map();
    for (const l of lists) for (const o of Array.isArray(l) ? l : []) if (o && isNum(o.ms) && isNum(o.temp)) map.set(o.ms, o);
    return [...map.values()].sort((a, b) => a.ms - b.ms);
}
const spanDays = (s) => {
    let a = Infinity, b = -Infinity;
    for (const o of s || []) if (isNum(o?.ms)) { a = Math.min(a, o.ms); b = Math.max(b, o.ms); }
    return b > a ? Math.max(1, Math.round((b - a) / 864e5)) : 1;
};
const shrink = (b, n) => (isNum(b) ? clamp((-b * n) / (n + 36), -2.5, 2.5) : 0);
// Fração "dia" da correção por hora local (tarde = erro de dia; madrugada = erro de noite)
const dayFrac = (h) => (h <= 5 ? 0 : h < 11 ? (h - 5) / 6 : h <= 17 ? 1 : h < 23 ? (23 - h) / 6 : 0);
const corrAt = (m, h) => m.corrDay * dayFrac(h) + m.corrNight * (1 - dayFrac(h));

// ---------- códigos de tempo ----------
function hourCode(x) {
    const wet = x.precip >= 0.1 && (x.pop ?? 0) >= 0.35;
    if (wet) {
        const snow = (x.snow ?? 0) > 0.05 || x.temp <= 1;
        if (x.thunderVote >= 0.3 || (x.cape >= 800 && x.pop >= 0.5 && x.precip >= 0.5)) return 95;
        if (snow) return x.showerVote >= 0.5 ? (x.precip >= 1 ? 86 : 85) : x.precip >= 2 ? 75 : x.precip >= 0.7 ? 73 : 71;
        if (x.showerVote >= 0.5 || x.cape >= 400) return x.precip >= 4 ? 82 : x.precip >= 1 ? 81 : 80;
        if (x.precip < 0.3 && (x.cloudLow ?? 0) >= 70) return 51;
        return x.precip >= 4 ? 65 : x.precip >= 1 ? 63 : 61;
    }
    if (x.fog >= 0.6) return 45;
    const c = x.cloud ?? 50;
    return c < 15 ? 0 : c < 40 ? 1 : c < 75 ? 2 : 3;
}
function codeClass(c) { // agrupa códigos WMO para votação
    if (!isNum(c)) return null;
    if (c >= 95) return 95; if (c >= 85) return 85; if (c >= 80) return 80; if (c >= 71) return 71; if (c >= 61) return 61;
    if (c >= 51) return 51; if (c >= 45) return 45; return c;
}
function dayCode({ pop, precip, thunder, showerVote, snowy, cloudDay, vote }) {
    if (pop >= 50 && precip >= 1) {
        if (thunder >= 0.35) return 95;
        if (snowy) return precip >= 5 ? 75 : 73;
        if (showerVote >= 0.5) return precip >= 10 ? 82 : 81;
        return precip >= 10 ? 65 : precip >= 3 ? 63 : 61;
    }
    if (pop >= 30 && precip >= 0.3) return snowy ? 85 : 80;
    if (isNum(cloudDay)) return cloudDay < 15 ? 0 : cloudDay < 40 ? 1 : cloudDay < 75 ? 2 : 3;
    if (isNum(vote) && vote <= 45) return vote;
    return 2;
}

// ---------- incêndios ----------
function parseFirmsCsv(text, satName, lat, lon, radiusKm, off) {
    if (typeof text !== 'string' || !text.includes('latitude')) return [];
    const lines = text.split('\n');
    const head = lines[0].split(',');
    const ix = (n) => head.indexOf(n);
    const iLat = ix('latitude'), iLon = ix('longitude'), iD = ix('acq_date'), iT = ix('acq_time'), iC = ix('confidence'), iF = ix('frp');
    const dLat = radiusKm / 111 + 0.05, dLon = radiusKm / (111 * Math.cos((lat * Math.PI) / 180)) + 0.05;
    const out = [];
    for (let i = 1; i < lines.length; i++) {
        const l = lines[i];
        if (!l) continue;
        const c = l.split(',');
        const y = Number(c[iLat]), x = Number(c[iLon]);
        if (Math.abs(y - lat) > dLat || Math.abs(x - lon) > dLon) continue;
        const d = haversine(lat, lon, y, x);
        if (d > radiusKm) continue;
        const t = String(c[iT]).padStart(4, '0');
        const ms = Date.parse(`${c[iD]}T${t.slice(0, 2)}:${t.slice(2)}:00Z`);
        const conf = c[iC];
        out.push({ lat: y, lon: x, distanceKm: r1(d), bearing: compass(bearing(lat, lon, y, x)), frp: r1(Number(c[iF])),
            time: isNum(ms) ? msToLocal(ms, off) : null, sat: satName,
            confidence: conf === 'h' ? 'alta' : conf === 'l' ? 'baixa' : conf === 'n' ? 'nominal' : isNum(Number(conf)) ? (Number(conf) >= 80 ? 'alta' : Number(conf) >= 30 ? 'nominal' : 'baixa') : conf });
    }
    return out;
}

// ---------- normais (ERA5) ----------
function climateNormals(clim, dates) {
    const list = Array.isArray(clim) ? clim : [];
    const rows = [];
    for (const j of list) {
        const D = j?.daily;
        if (!D?.time) continue;
        D.time.forEach((t, i) => rows.push([t.slice(5), D.temperature_2m_max?.[i], D.temperature_2m_min?.[i]]));
    }
    if (rows.length < 100) return null;
    const md = (s) => { const [m, d] = s.split('-').map(Number); return Date.UTC(2001, m - 1, d) / 864e5; };
    return dates.map((date) => {
        const c = md(date.slice(5));
        const near = rows.filter(([s]) => { const dd = Math.abs(md(s) - c); return Math.min(dd, 365 - dd) <= 7; });
        const tx = near.map((r) => r[1]).filter(isNum), tn = near.map((r) => r[2]).filter(isNum);
        return tx.length >= 30 ? { tmax: r1(wmean(tx)), tmin: r1(wmean(tn)) } : null;
    });
}

// ---------- relevo à volta do ponto ----------
// Um só pedido de altitudes (Open-Meteo, Copernicus DEM 90 m): o ponto e 12 rumos (de 30 em 30°) a 1,5 km e a 4 km.
export const TERRAIN = { rings: [1.5, 4], dirs: 12 };
const TERRAIN_LABEL = { vale: 'Vale', encosta: 'Encosta', topo: 'Topo', 'planície': 'Planície' };
/** Pontos do pedido de altitudes, pela ordem que buildTerrain espera: [lat, lon] do ponto e depois cada anel de N para E. */
export function terrainPoints(lat, lon) {
    const out = [[lat, lon]];
    const kx = 111.32 * Math.cos((lat * Math.PI) / 180);
    for (const km of TERRAIN.rings) {
        for (let i = 0; i < TERRAIN.dirs; i++) {
            const b = ((i * 360) / TERRAIN.dirs) * (Math.PI / 180);
            out.push([lat + (km / 111.32) * Math.cos(b), lon + (km / kx) * Math.sin(b)]);
        }
    }
    return out;
}
// Plano por mínimos quadrados z = a + gx·x + gy·y (x para leste, y para norte, em m) → [gx, gy]
function planeFit(P) {
    let n = 0, sx = 0, sy = 0, sz = 0, sxx = 0, syy = 0, sxy = 0, sxz = 0, syz = 0;
    for (const p of P) { n++; sx += p.x; sy += p.y; sz += p.z; sxx += p.x * p.x; syy += p.y * p.y; sxy += p.x * p.y; sxz += p.x * p.z; syz += p.y * p.z; }
    const M = [[n, sx, sy], [sx, sxx, sxy], [sy, sxy, syy]], b = [sz, sxz, syz];
    const det = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
    const D = det(M);
    if (!D) return [0, 0];
    const col = (k) => M.map((row, i) => row.map((v, j) => (j === k ? b[i] : v)));
    return [det(col(1)) / D, det(col(2)) / D];
}
/**
 * Relevo do ponto a partir das altitudes de terrainPoints (o ponto + 2 anéis): posição face ao relevo à volta
 * (média das diferenças para os anéis de 1,5 e 4 km), declive e orientação (plano pelo anel de 1,5 km), para onde desce.
 * vale: ≥ 20 m abaixo e rodeado de terreno mais alto; topo: ≥ 20 m acima e com terreno mais baixo à volta;
 * encosta: declive ≥ 3,5% ou terreno mais alto de um lado e mais baixo do outro; planície: o resto.
 * A água (0 m no modelo de terreno: mar, estuário) não entra nas médias quando o ponto está acima de 10 m.
 */
export function buildTerrain(t) {
    const e = Array.isArray(t) ? t : t?.elevation;
    const { rings: RK, dirs: N } = TERRAIN;
    if (!Array.isArray(e) || e.length !== 1 + RK.length * N || !isNum(e[0])) return null;
    const z0 = e[0];
    const isWater = (z) => z0 > 10 && z <= 0.5;
    const rings = RK.map((km, r) => {
        const pts = [];
        for (let i = 0; i < N; i++) { const z = e[1 + r * N + i]; if (isNum(z)) pts.push({ km, deg: (i * 360) / N, z, water: isWater(z) }); }
        const land = pts.filter((p) => !p.water), zs = land.map((p) => p.z);
        if (land.length < N / 2) return { km, pts, ok: false };
        const frac = (f) => land.filter(f).length / land.length;
        return { km, pts, land, ok: true, mean: wmean(zs), min: Math.min(...zs), max: Math.max(...zs), hi: frac((p) => p.z > z0 + 10), lo: frac((p) => p.z < z0 - 10) };
    });
    if (!rings.some((r) => r.ok)) return null; // quase só água à volta (ilhéu, molhe)
    const S = rings[0].ok ? rings[0] : rings[1], Lr = rings[1].ok ? rings[1] : rings[0];
    const relS = z0 - S.mean, relL = z0 - Lr.mean, rel = (relS + relL) / 2;
    const xy = (p) => ({ x: Math.sin((p.deg * Math.PI) / 180) * p.km * 1000, y: Math.cos((p.deg * Math.PI) / 180) * p.km * 1000, z: p.z });
    const [gx, gy] = planeFit([{ x: 0, y: 0, z: z0 }, ...S.land.map(xy)]);
    const slopePct = Math.hypot(gx, gy) * 100;
    const aspect = compass((Math.atan2(-gx, -gy) * 180) / Math.PI); // para onde o terreno desce
    const outer = rings[1].pts.length ? rings[1].pts : rings[0].pts;
    const lowest = outer.reduce((a, p) => (p.z < a.z ? p : a)), highest = outer.reduce((a, p) => (p.z > a.z ? p : a));
    const wet = rings.flatMap((r) => r.pts.filter((p) => p.water));
    const waterDir = wet.length >= 2 ? compass(vecDir(wet.map((p) => p.deg))) : null;
    let type;
    if (rel <= -20 && relS <= 0 && Lr.hi >= 0.6 && (S.hi >= 0.4 || relL <= -40)) type = 'vale';
    else if (rel >= 20 && relS >= 0 && Lr.lo >= 0.6 && (S.lo >= 0.4 || relL >= 40)) type = 'topo';
    else if (slopePct >= 3.5 || (S.hi >= 0.25 && S.lo >= 0.25 && S.max - S.min >= 50)) type = 'encosta';
    else type = 'planície';
    const reliefM = Math.round(Math.abs(rel));
    const approx = reliefM >= 20 ? Math.round(reliefM / 10) * 10 : reliefM;
    const where = (d) => WIND_FROM[d] || d; // 'NO' → 'noroeste'
    const side = `${approx} m ${rel < 0 ? 'abaixo' : 'acima'} do relevo à volta`;
    const sideApprox = reliefM < 10 ? 'à altura do relevo à volta' : `~${side}`;
    const text = type === 'vale' || type === 'topo' ? side
        : type === 'encosta' ? `virada a ${where(aspect)} · declive ${r0(slopePct)}%` : 'sem grandes desníveis à volta';
    let description = type === 'vale' ? `vale, ~${side}; o terreno desce para ${where(compass(lowest.deg))}`
        : type === 'topo' ? `topo, ~${side}; mais exposto ao vento do que o terreno à volta`
            : type === 'encosta' ? `encosta virada a ${where(aspect)} (declive ~${r0(slopePct)}%), ${sideApprox}`
                : `terreno plano ou suave (declive ~${r0(slopePct)}%, ${sideApprox})`;
    if (waterDir) description += `; água (mar, rio largo ou estuário) para ${where(waterDir)}`;
    return {
        type, label: TERRAIN_LABEL[type], elevation: r0(z0), aroundM: r0(z0 - rel), relM: r0(rel), reliefM,
        slopePct: r1(slopePct), aspect, lowestDir: compass(lowest.deg), highestDir: compass(highest.deg), water: waterDir,
        rings: rings.filter((r) => r.ok).map((r) => ({ km: r.km, mean: r0(r.mean), min: r0(r.min), max: r0(r.max) })),
        text, description,
    };
}

// ---------- efeito local do relevo: ajuste pequeno, só em condições claras, sempre indicado (fc.local) ----------
// vale: noite limpa (nuvens < 30%, efeito inteiro ≤ 20%), calma (vento < 8 km/h, inteiro ≤ 5) e sem chuva → o ar frio
//   acumula-se no fundo: até −1,5 °C por cada 100 m abaixo do relevo à volta (máx. 1,5 °C), a crescer nas primeiras 4 h
//   de noite e com metade na primeira hora depois do nascer do sol. A parte que a correção das estações já arrefece
//   nessa hora não se soma (não contar duas vezes).
//   A mínima dos dias com previsão hora a hora desce o mesmo que o mínimo das horas.
// topo: vento e rajadas +0,15% por metro acima do relevo à volta (máx. +15%), a toda a hora e nos 16 dias.
export const LOCAL_RULES = { valleyPer100m: 1.5, valleyMax: 1.5, cloud: [20, 30], wind: [5, 8], rampH: 4, topPerM: 0.0015, topMax: 0.15 };
const RULE_TXT = {
    vale: 'vale — em noite limpa (nuvens < 30%) e calma (vento < 8 km/h), sem chuva, a temperatura desce até 1,5 °C por cada 100 m abaixo do relevo à volta (máx. 1,5 °C), a crescer nas primeiras 4 h de noite; sem somar ao que a correção das estações já arrefece',
    topo: 'topo — vento e rajadas +0,15% por metro acima do relevo à volta (máx. +15%)',
};
function terrainAdjust(H, terrain) {
    const R = LOCAL_RULES;
    for (const x of H) { x.tempPre = x.temp; x.localT = 0; }
    if (terrain?.type === 'vale') {
        const pot = Math.min(R.valleyMax, (R.valleyPer100m * terrain.reliefM) / 100);
        // cresce nas primeiras horas de noite; na primeira hora depois do nascer do sol fica metade (a inversão demora a desfazer-se)
        let nightH = H[0] && !H[0].isDay ? R.rampH : 0, sinceDawn = 0, lastRamp = nightH ? 1 : 0; // a série pode começar já de noite
        for (const x of H) {
            let ramp;
            if (!x.isDay) { if (sinceDawn) { nightH = 0; sinceDawn = 0; } nightH++; ramp = lastRamp = clamp(nightH / R.rampH, 0, 1); }
            else { sinceDawn++; ramp = sinceDawn === 1 ? 0.5 * lastRamp : 0; }
            const f = clamp((R.cloud[1] - (x.cloud ?? 100)) / (R.cloud[1] - R.cloud[0]), 0, 1)
                * clamp((R.wind[1] - (x.wind ?? 99)) / (R.wind[1] - R.wind[0]), 0, 1)
                * ((x.precip ?? 0) >= 0.2 ? 0 : 1) * ramp;
            const cool = Math.max(0, pot * f - Math.max(0, -(x.obsT || 0)));
            if (cool < 0.01 || !isNum(x.temp)) continue;
            x.localT = -cool;
            for (const k of ['temp', 'tempLo', 'tempHi', 'feels']) if (isNum(x[k])) x[k] -= cool;
            if (isNum(x.dew)) { x.dew = Math.min(x.dew, x.temp); x.rh = relHum(x.temp, x.dew); }
        }
        return { pot, windFactor: 1 };
    }
    if (terrain?.type === 'topo') {
        const wf = 1 + Math.min(R.topMax, R.topPerM * terrain.reliefM);
        for (const x of H) { if (isNum(x.wind)) x.wind *= wf; if (isNum(x.gust)) x.gust *= wf; }
        return { pot: 0, windFactor: wf };
    }
    return { pot: 0, windFactor: 1 };
}
// Mínima de cada dia com horas de madrugada na série: quanto desceu o mínimo das horas com o ajuste do vale
function tminShifts(H) {
    const byDate = new Map();
    for (const x of H) { const d = x.time.slice(0, 10); if (!byDate.has(d)) byDate.set(d, []); byDate.get(d).push(x); }
    const out = new Map();
    for (const [d, xs] of byDate) {
        if (xs.filter((x) => hourOf(x.time) < 10).length < 6 || !xs.some((x) => x.localT)) continue;
        const a = Math.min(...xs.map((x) => x.temp).filter(isNum)), b = Math.min(...xs.map((x) => x.tempPre).filter(isNum));
        if (isNum(a) && isNum(b) && a < b - 0.05) out.set(d, a - b);
    }
    return out;
}
function localSummary(terrain, adj, next, nowX, shifts) {
    if (!terrain) return null;
    const fmt = (x) => String(r1(Math.abs(x))).replace('.', ',');
    const base = { type: terrain.type, rule: RULE_TXT[terrain.type] || null, potential: null, windFactor: null, now: 0, hours: 0, max: 0, peak: null, tmin: [] };
    if (terrain.type === 'vale') {
        const hit = next.filter((x) => x.localT <= -0.05);
        const top = hit.reduce((a, x) => (!a || x.localT < a.localT ? x : a), null);
        const tmin = [...shifts.entries()].map(([date, d]) => ({ date, delta: r1(d) }));
        return { ...base, potential: -r1(adj.pot), now: r1(nowX?.localT || 0) || 0, hours: hit.length, max: top ? r1(top.localT) : 0, peak: top?.time || null, tmin,
            text: hit.length ? `Vale: ${hit.length} h de noite limpa e calma nas próximas 72 h, até ${fmt(top.localT)}° mais frio do que o consenso (${hm(top.time)}).`
                : `Vale: sem noites limpas e calmas nas próximas 72 h, por isso sem ajuste (até −${fmt(adj.pot)}° quando houver).` };
    }
    if (terrain.type === 'topo') {
        const pct = Math.round((adj.windFactor - 1) * 100);
        return { ...base, windFactor: Math.round(adj.windFactor * 100) / 100,
            text: `Topo: vento e rajadas +${pct}% face ao consenso (mais exposto do que o terreno suavizado dos modelos).` };
    }
    return { ...base, text: `${terrain.label} (${terrain.text}): sem ajuste automático.` };
}

// ---------- previsão completa ----------
export function buildForecast(raw, opts = {}) {
    const nowMs = (opts.now ? new Date(opts.now) : new Date()).getTime();
    const P = parseDet(raw.det);
    if (!P.models.length || !P.times.length) throw new Error('Sem dados dos modelos para este local.');
    const lat = opts.lat, lon = opts.lon, off = P.offset;
    const nowLocal = msToLocal(nowMs, off);
    const todayDate = nowLocal.slice(0, 10);
    const tMs = P.times.map((t) => localToMs(t, off));
    let nowIdx = tMs.findIndex((ms) => ms > nowMs) - 1;
    if (nowIdx < 0) nowIdx = 0;
    const targetElev = isNum(opts.elevation) ? opts.elevation : P.elevation;
    const kOf = (date) => Math.round((Date.parse(date + 'T00:00:00Z') - Date.parse(todayDate + 'T00:00:00Z')) / 864e5);

    // 0) Previsão oficial do IPMA para o concelho: mais uma fonte, com peso alto nos primeiros dias
    const ipmaM = ipmaModel(raw.ipma?.forecast, P);
    if (ipmaM) P.models.push(ipmaM);
    // peso de base de cada fonte para o dia k (0 = hoje) e a antecedência em horas
    const wBase = (m, k, lead) => (m.meta.wDay ? m.meta.wDay[Math.max(0, k)] ?? 0
        : (lead != null ? lead > 48 : k >= 2) && m.meta.wAfter48 != null ? m.meta.wAfter48 : m.meta.w);

    // 1) Estações perto (IPMA e METAR até 30 km) e verificação local
    const st = raw.station || pickStation({ ipmaStations: raw.ipma?.stations, ipmaObs: raw.ipma?.obs, metar: raw.metar, lat, lon, nowMs });
    const elevs = { ...(raw.stationElevs || {}) };
    if (st && isNum(raw.stationElev) && !isNum(elevs[st.id])) elevs[st.id] = raw.stationElev;
    const cands = nearStations({ ipmaStations: raw.ipma?.stations, ipmaObs: raw.ipma?.obs, metar: raw.metar, lat, lon, nowMs });
    if (st && !cands.some((c) => c.id === st.id)) cands.push({ ...st, elev: isNum(st.elev) ? st.elev : null });
    const SW = weighStations(cands, { elevs, targetElev, nowMs });
    // verificação: METAR perto (≤ 12 km) com 7 dias → só ele; senão várias estações (IPMA 24 h + histórico guardado,
    // METAR mais longe com 7 dias), pesadas pela distância e pela altitude
    const prevV = ipmaM ? withIpmaPrev(raw.prev, raw.ipmaPrev) : raw.prev;
    const mh = metarRows(raw.metarHistory).sort((a, b) => a.ms - b.ms); // a fonte vem da mais recente para a mais antiga
    const mhS = mh.length >= 48 ? { id: mh[0].id, name: mh[0].name, lat: mh[0].lat, lon: mh[0].lon, elev: isNum(mh[0].elev) ? mh[0].elev : null, distanceKm: haversine(lat, lon, mh[0].lat, mh[0].lon) } : null;
    const mhDz = mhS && isNum(mhS.elev) && isNum(targetElev) ? Math.abs(mhS.elev - targetElev) : null;
    let vset = null;
    if (mhS && mhS.distanceKm <= 12 && (mhDz == null || mhDz <= 150)) {
        const ver = verify(prevV, mh, { stationElev: mhS.elev, targetElev, nowMs, offset: off });
        if (ver) vset = { ver, source: 'METAR', label: mhS.name, names: [mhS.name], distanceKm: mhS.distanceKm, days: 7, stations: 1, biasOk: mhDz == null || mhDz <= 150 };
    }
    if (!vset) {
        const parts = [];
        const vrows = SW.filter((s) => s.distanceKm <= 25 && (s.dz == null || Math.abs(s.dz) <= 250));
        if (mhS && mhS.distanceKm <= 25 && !vrows.some((s) => s.id === mhS.id)) vrows.push(...weighStations([{ source: 'METAR', ...mhS, last: mh[mh.length - 1], series: mh }], { elevs, targetElev, nowMs }));
        for (const s of vrows) {
            const series = s.source === 'METAR' ? (mhS && s.id === mhS.id ? mh : s.series)
                : mergeSeries(raw.obsHistories?.[s.id], st && s.id === st.id ? raw.obsHistory : null, s.series);
            const ver = verify(prevV, series, { stationElev: s.elev, targetElev, nowMs, offset: off });
            if (ver) parts.push({ s, w: s.geo, ver, days: spanDays(series) });
        }
        const ver = parts.length ? combineVer(parts) : null;
        if (ver) {
            const W = parts.reduce((a, p) => a + p.w, 0);
            const dEff = parts.reduce((a, p) => a + p.w * p.s.distanceKm, 0) / W, zEff = parts.reduce((a, p) => a + p.w * Math.abs(p.s.dz ?? 100), 0) / W;
            const srcs = ['IPMA', 'METAR'].filter((x) => parts.some((p) => p.s.source === x));
            const top = parts.slice().sort((a, b) => b.w - a.w).map((p) => p.s.name);
            // as corridas anteriores só cobrem os últimos 7 dias
            vset = { ver, source: srcs.join('+'), label: stationLabel(parts.map((p) => p.s)), names: top, distanceKm: dEff, days: Math.min(7, Math.max(...parts.map((p) => p.days))),
                stations: parts.length, biasOk: dEff <= 15 && zEff <= 150 };
        }
    }
    const ver = vset?.ver || null;
    if (ver) {
        const maes = Object.entries(ver).filter(([id, v]) => v.n >= 24 && id !== 'ipma').map(([, v]) => v.mae);
        const med = maes.length ? wmedian(maes) : null;
        for (const m of P.models) {
            const v = ver[m.id];
            if (v && v.n >= 24 && med) {
                m.skill = { mae: r1(v.mae), bias: r1(v.bias), n: v.n };
                m.factor = clamp((med / Math.max(v.mae, 0.3)) ** 2, 0.4, 2.5);
                const nb = v.nMax ?? v.n;
                if (vset.biasOk) { m.corrDay = shrink(v.biasDay ?? v.bias, Math.min(v.nDay || nb, nb)); m.corrNight = shrink(v.biasNight ?? v.bias, Math.min(v.nNight || nb, nb)); }
            } else if (maes.length && !m.meta.official) m.factor = 0.7; // sem verificação (o IPMA mantém o peso oficial)
        }
    }

    // 2) Consenso hora a hora
    const ensP = parseEns(raw.ens);
    const ensHourIdx = new Map((ensP?.hours || []).map((t, i) => [t, i]));
    const H = P.times.map((time, i) => {
        const lead = (tMs[i] - nowMs) / 36e5, hr = hourOf(time), kd = kOf(time.slice(0, 10));
        const ms = P.models;
        const wT = ms.map((m) => wBase(m, kd, lead) * m.factor);
        const wP = ms.map((m, k) => wT[k] * (m.meta.wPrecip || 1));
        const col = (k, corr) => ms.map((m) => { const v = m.h[k][i]; return isNum(v) ? v + (corr ? corrAt(m, hr) : 0) : null; });
        const temps = col('temp', true), precs = col('precip');
        const codes = col('code');
        const okW = (arr, w) => w.map((x, k) => (isNum(arr[k]) ? x : 0));
        const cw = okW(codes, wT), cwSum = cw.reduce((a, b) => a + b, 0) || 1;
        const vote = (f) => codes.reduce((s, c, k) => s + (isNum(c) && f(c) ? cw[k] : 0), 0) / cwSum;
        const wetW = codes.reduce((s, c, k) => s + (isNum(c) && c >= 50 ? cw[k] : 0), 0);
        // chuva ≥ 0,1 mm: voto de cada modelo; o IPMA vota com a sua probabilidade
        let pHit = 0, pW = 0;
        ms.forEach((m, k) => {
            if (!(wP[k] > 0)) return;
            if (isNum(precs[k])) { pW += wP[k]; if (precs[k] >= 0.1) pHit += wP[k]; } else if (isNum(m.hp?.[i])) { pW += wP[k]; pHit += wP[k] * m.hp[i]; }
        });
        const popDet = pW > 0 ? pHit / pW : null;
        let pop = popDet;
        const ei = ensHourIdx.get(time);
        if (ensP && ei != null) {
            const vals = ensP.members.map((m) => m.hp?.[ei]);
            const pe = wfrac(vals, ensP.members.map((m) => m.w), 0.1);
            if (pe != null) pop = popDet == null ? pe : 0.6 * pe + 0.4 * popDet;
        }
        const x = {
            time, ms: tMs[i], lead,
            temp: robustMean(temps, wT, 2.0), tempLo: wquantile(temps, wT, 0.1), tempHi: wquantile(temps, wT, 0.9), spread: wstd(temps, wT),
            feels: robustMean(col('feels', true), wT, 2.5), dew: robustMean(col('dew'), wT, 2.5), rh: wmean(col('rh'), wT),
            precip: wmean(precs, wP), precipHi: wquantile(precs, wP, 0.9), popDet, pop,
            wind: robustMean(col('wind'), wT, 8), gust: robustMean(col('gust'), wT, 12), dir: vecDir(col('dir'), col('wind'), wT),
            cloud: wmean(col('cloud'), wT), cloudLow: wmean(col('cloudLow'), wT), pressure: robustMean(col('pressure'), wT, 3),
            vis: wmedian(col('vis'), wT), cape: wmedian(col('cape'), wT), uv: wmean(col('uv'), wT), snow: wmean(col('snow'), wP),
            frz: wmean(col('frz'), wT), isDay: ms.map((m) => m.h.isDay[i]).find(isNum) ?? (hr >= 7 && hr <= 18 ? 1 : 0),
            thunderVote: vote((c) => c >= 95), showerVote: wetW > 0 ? codes.reduce((s, c, k) => s + (isNum(c) && ((c >= 80 && c <= 82) || c === 85 || c === 86) ? cw[k] : 0), 0) / wetW : 0,
            fogVote: vote((c) => c === 45 || c === 48),
            agree: popDet == null ? null : Math.abs(2 * popDet - 1),
        };
        return x;
    });

    // 3) Correção pela observação combinada das estações perto (decai em ~5 h; ponto de orvalho ~8 h)
    let correction = null, obsOut = null, reprW = 0, blend = null;
    // consenso (ainda sem correção) num instante qualquer, interpolado entre horas
    const cAt = (ms, k) => {
        const i0 = tMs.findIndex((t) => t > ms) - 1;
        if (i0 < 0 || i0 + 1 >= H.length) return null;
        const a = H[i0][k], b = H[i0 + 1][k];
        return isNum(a) && isNum(b) ? a + ((ms - tMs[i0]) / 36e5) * (b - a) : null;
    };
    if (SW.length) blend = blendObs(SW, { cAt, nowMs });
    if (blend) {
        reprW = blend.repr;
        const aT = isNum(blend.A) ? clamp(blend.A, -6, 6) : null, aD = isNum(blend.AD) ? clamp(blend.AD, -6, 6) : null;
        const i0 = tMs.findIndex((ms) => ms > blend.ms) - 1;
        const cT = cAt(blend.ms, 'temp'), cD = cAt(blend.ms, 'dew');
        if (i0 >= 0 && reprW > 0 && (isNum(aT) || isNum(aD))) {
            for (let i = i0; i < H.length; i++) {
                const h = Math.max(0, (tMs[i] - blend.ms) / 36e5);
                if (isNum(aT)) {
                    const d = reprW * aT * Math.exp(-h / 5);
                    for (const k of ['temp', 'tempLo', 'tempHi', 'feels']) if (isNum(H[i][k])) H[i][k] += d;
                    H[i].obsT = d;
                }
                if (isNum(aD) && isNum(H[i].dew)) H[i].dew += reprW * aD * Math.exp(-h / 8);
                if (isNum(H[i].dew) && isNum(H[i].temp)) { H[i].dew = Math.min(H[i].dew, H[i].temp); H[i].rh = relHum(H[i].temp, H[i].dew); }
            }
            correction = { temp: r1(isNum(aT) ? reprW * aT : 0), dew: r1(isNum(aD) ? reprW * aD : 0), decayHours: 5, stations: blend.n, repr: Math.round(reprW * 100) / 100 };
        }
        const U = blend.rows.filter((r) => r.used);
        const uw = U.map((r) => r.w);
        const srcs = ['IPMA', 'METAR'].filter((s) => U.some((r) => r.source === s));
        const wSrc = (s) => U.filter((r) => r.source === s).reduce((a, r) => a + r.w, 0);
        const tObs = isNum(cT) && isNum(aT) ? cT + aT : wmean(U.map((r) => r.tAdj), uw);
        const dObs = isNum(cD) && isNum(aD) ? cD + aD : wmean(U.map((r) => r.dAdj), uw);
        obsOut = {
            source: wSrc('METAR') > wSrc('IPMA') ? 'METAR' : 'IPMA', sources: srcs, station: stationLabel(U), n: U.length,
            distanceKm: r1(blend.dEff), nearestKm: r1(Math.min(...U.map((r) => r.distanceKm))), time: msToLocal(blend.ms, off), ageMin: r0((nowMs - blend.ms) / 6e4),
            temp: r1(tObs), rh: r0(isNum(tObs) && isNum(dObs) ? relHum(tObs, Math.min(dObs, tObs)) : wmean(U.map((r) => r.last.rh), uw)),
            wind: r0(wmedian(U.map((r) => r.last.wind), uw)), gust: r0(wmedian(U.map((r) => r.last.gust), uw)), dir: r0(vecDir(U.map((r) => r.last.dir), U.map((r) => r.last.wind), uw)),
            pressure: r1(wmean(U.map((r) => r.last.pressure), uw)), precip1h: r1(wmean(U.map((r) => r.last.precip1h), uw)),
            elevation: r0(targetElev), repr: Math.round(reprW * 100) / 100, spread: r1(blend.sd),
            stations: blend.rows.slice().sort((a, b) => b.share - a.share || a.distanceKm - b.distanceKm).slice(0, 12).map((r) => ({
                id: r.id, name: r.name, source: r.source, distanceKm: r1(r.distanceKm), elev: r0(r.elev), time: msToLocal(r.last.ms, off), ageMin: r0(r.ageMin),
                temp: r1(r.last.temp), tempAdj: r1(r.tAdj), anomaly: r1(r.aT), weight: r0(r.share * 100), used: r.used,
                dir: isNum(r.lat) && isNum(r.lon) ? compass(bearing(lat, lon, r.lat, r.lon)) : null, ...(r.twin ? { sameSite: r.twin } : {}) })),
        };
    }

    // 3b) Efeito local do relevo à volta do ponto (vale: noites limpas e calmas mais frias; topo: mais vento)
    const terrain = buildTerrain(raw.terrain);
    const tAdj = terrainAdjust(H, terrain);
    const wf = tAdj.windFactor;

    // nevoeiro e código (depois da correção)
    for (const x of H) {
        const dd = isNum(x.temp) && isNum(x.dew) ? x.temp - x.dew : null;
        let fog = 0;
        if (isNum(dd) && isNum(x.wind)) fog = (dd <= 1 ? 1 : dd <= 2 ? 0.5 : 0) * (x.wind <= 8 ? 1 : x.wind <= 15 ? 0.5 : 0) * (x.isDay ? 0.6 : 1);
        // a visibilidade dos modelos confirma ou desmente; com chuva, o ar saturado é chuva e não nevoeiro
        fog *= isNum(x.vis) ? (x.vis < 1000 ? 1 : x.vis < 3000 ? 0.8 : x.vis < 8000 ? 0.5 : 0.25) : 0.7;
        if ((x.precip ?? 0) >= 0.2) fog *= 0.3;
        if (isNum(x.vis) && x.vis < 1000) fog = Math.max(fog, 0.8);
        x.fog = Math.max(fog, x.fogVote >= 0.4 ? 0.7 : x.fogVote >= 0.2 ? 0.45 : 0);
        x.code = hourCode(x);
    }

    // 4) Saída horária (72 h a partir da hora atual)
    const hourly = H.slice(nowIdx, nowIdx + 72).map((x) => ({
        time: x.time, temp: r1(x.temp), tempLo: r1(x.tempLo), tempHi: r1(x.tempHi), feels: r1(x.feels), dew: r1(x.dew), rh: r0(x.rh),
        precip: r1(x.precip), precipHi: r1(x.precipHi), pop: r0(x.pop == null ? null : x.pop * 100), wind: r0(x.wind), gust: r0(x.gust), dir: r0(x.dir),
        cloud: r0(x.cloud), cloudLow: r0(x.cloudLow), pressure: r1(x.pressure), visibility: r0(x.vis), cape: r0(x.cape), uv: r1(x.uv),
        code: x.code, isDay: !!x.isDay, spread: r1(x.spread), agree: x.agree == null ? null : Math.round(x.agree * 100) / 100,
        ...(x.localT <= -0.05 ? { local: r1(x.localT) } : {}),
    }));

    // 5) Próximas 2 horas (minuto a minuto de 15 em 15)
    const m15 = P.m15.map((time, j) => ({ time, ms: localToMs(time, off), j })).filter((s) => s.ms > nowMs - 15 * 6e4).slice(0, 8);
    const steps = m15.map(({ time, j }) => {
        const v = P.models.map((m) => m.m15[j]), w = P.models.map((m) => m.meta.w * m.factor * (m.meta.wPrecip || 1));
        return { time, precip: r1(wmean(v, w)) ?? 0, prob: r0((wfrac(v, w, 0.05) ?? 0) * 100) };
    });
    const nowcast = { steps, text: nowcastText(steps) };

    // 6) Diário (16 dias): multimodelo nos primeiros dias, ensemble depois
    const ensDateIdx = new Map((ensP?.dates || []).map((d, i) => [d, i]));
    const shiftDay = wmean(P.models.map((m) => m.corrDay), P.models.map((m) => m.meta.w)) || 0;
    const shiftNight = wmean(P.models.map((m) => m.corrNight), P.models.map((m) => m.meta.w)) || 0;
    const normals = climateNormals(raw.clim, P.dates);
    const change = runChanges(raw.prev, P.dates, off);
    const shifts = terrain?.type === 'vale' ? tminShifts(H) : new Map();
    const ensDays = [];
    const daily = P.dates.map((date, k) => {
        const ms = P.models;
        const wD = ms.map((m) => wBase(m, k) * m.factor);
        const dv = (key, corr) => ms.map((m) => { const v = m.d[key][k]; return isNum(v) ? v + corr(m) : null; });
        const tmaxM = dv('tmax', (m) => m.corrDay), tminM = dv('tmin', (m) => m.corrNight);
        const nDet = tmaxM.filter(isNum).length;
        const pM = dv('precip', () => 0), wPD = wD.map((w, i) => w * (ms[i].meta.wPrecip || 1));
        // chuva ≥ 1 mm: voto de cada modelo; o IPMA (sem quantidades) vota com a sua probabilidade
        let pHit = 0, pW = 0;
        ms.forEach((m, i) => {
            if (!(wPD[i] > 0)) return;
            if (isNum(pM[i])) { pW += wPD[i]; if (pM[i] >= 1) pHit += wPD[i]; } else if (isNum(m.dp?.[k])) { pW += wPD[i]; pHit += wPD[i] * m.dp[k]; }
        });
        const det = nDet ? {
            tmax: robustMean(tmaxM, wD, 2), tmin: robustMean(tminM, wD, 2), sd: wstd(tmaxM, wD), precip: wmean(pM, wPD),
            pop: pW > 0 ? pHit / pW : null, pop10: wfrac(pM, wPD, 10), p90: wquantile(pM, wPD, 0.9),
            wind: robustMean(dv('windMax', () => 0), wD, 8), gust: robustMean(dv('gustMax', () => 0), wD, 12),
            dir: vecDir(dv('dir', () => 0), dv('windMax', () => 0), wD), uv: wmean(dv('uvMax', () => 0), wD),
        } : null;
        const ei = ensDateIdx.get(date);
        let ens = null;
        if (ensP && ei != null) {
            const mem = ensP.members, w = mem.map((m) => m.w);
            const tx = mem.map((m) => m.tmax?.[ei]), tn = mem.map((m) => m.tmin?.[ei]), pr = mem.map((m) => m.precip?.[ei]), gu = mem.map((m) => m.gust?.[ei]);
            if (tx.some(isNum)) ens = {
                n: tx.filter(isNum).length, tmax: [0.1, 0.5, 0.9].map((q) => wquantile(tx, w, q)), tmin: [0.1, 0.5, 0.9].map((q) => wquantile(tn, w, q)),
                precipMean: wmean(pr, w), p50: wquantile(pr, w, 0.5), p90: wquantile(pr, w, 0.9), pop: wfrac(pr, w, 1), pop10: wfrac(pr, w, 10),
                gust: wquantile(gu, w, 0.5),
            };
        }
        ensDays[k] = ens;
        const wDet = !det ? 0 : !ens ? 1 : clamp((k <= 2 ? 0.75 : k <= 4 ? 0.6 : k <= 6 ? 0.45 : k <= 9 ? 0.3 : 0.2) * (nDet >= 4 ? 1 : nDet >= 2 ? 0.7 : 0.4), 0, 1);
        const mix = (a, b) => (isNum(a) && isNum(b) ? wDet * a + (1 - wDet) * b : isNum(a) ? a : b);
        let tmax = mix(det?.tmax, ens && ens.tmax[1] + shiftDay), tmin = mix(det?.tmin, ens && ens.tmin[1] + shiftNight);
        // hoje: o que já se observou + horas que faltam (já corrigidas)
        if (k === 0) {
            const rest = H.filter((x) => x.time.startsWith(date) && x.ms >= nowMs).map((x) => x.temp).filter(isNum);
            const seen = blend && reprW >= 0.5 ? seenSeries(blend.rows, date, off) : [];
            if (seen.length >= 3) {
                // estação representativa: o dia é o que já se mediu + o que falta (já corrigido)
                const all = [...seen, ...rest];
                tmax = Math.max(...all); tmin = Math.min(...all);
            } else if (rest.length) {
                // sem estação: as horas que faltam só podem alargar os extremos dos modelos
                if (isNum(tmax)) tmax = Math.max(tmax, ...rest);
                if (isNum(tmin)) tmin = Math.min(tmin, ...rest);
            }
        } else if (shifts.has(date) && isNum(tmin)) tmin += shifts.get(date); // vale: noite limpa e calma (hoje já entra pelas horas)
        const sd = det?.sd ?? 1;
        const qx = ens ? ens.tmax.map((v) => v - ens.tmax[1] + tmax) : [tmax - 1.28 * Math.max(sd, 0.6), tmax, tmax + 1.28 * Math.max(sd, 0.6)];
        const qn = ens ? ens.tmin.map((v) => v - ens.tmin[1] + tmin) : [tmin - 1.28 * Math.max(sd, 0.6), tmin, tmin + 1.28 * Math.max(sd, 0.6)];
        const precip = mix(det?.precip, ens?.precipMean);
        const pop = mix(det?.pop, ens?.pop);
        const popHeavy = mix(det?.pop10, ens?.pop10);
        const precipP90 = Math.max(ens?.p90 ?? 0, det?.p90 ?? 0);
        // códigos e nebulosidade de dia
        const dayH = H.filter((x) => x.time.startsWith(date) && hourOf(x.time) >= 8 && hourOf(x.time) <= 18);
        const cloudDay = dayH.length >= 6 ? wmean(dayH.map((x) => x.cloud)) : null;
        const codesD = dv('code', () => 0).map(codeClass);
        const cw = wD.map((w, i) => (isNum(codesD[i]) ? w : 0)), cs = cw.reduce((a, b) => a + b, 0) || 1;
        const thunder = codesD.reduce((s, c, i) => s + (c === 95 ? cw[i] : 0), 0) / cs;
        const wetS = codesD.reduce((s, c, i) => s + (isNum(c) && c >= 50 ? cw[i] : 0), 0);
        const showerVote = wetS ? codesD.reduce((s, c, i) => s + (c === 80 || c === 85 ? cw[i] : 0), 0) / wetS : 0;
        const tally = {};
        codesD.forEach((c, i) => { if (isNum(c)) tally[c] = (tally[c] || 0) + cw[i]; });
        const vote = Number(Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0]);
        const code = dayCode({ pop: (pop ?? 0) * 100, precip: precip ?? 0, thunder, showerVote, snowy: isNum(tmax) && tmax <= 2, cloudDay, vote });
        // confiança
        const spread = qx[2] - qx[0];
        const tS = clamp(1 - (spread - 1.5) / 5, 0, 1);
        let pS = isNum(pop) ? Math.abs(2 * pop - 1) : 0.5;
        if (precipP90 < 1) pS = Math.max(pS, 0.8);
        const dS = det && nDet >= 2 ? clamp(1 - ((det.sd ?? 0) - 0.7) / 2.5, 0, 1) : null;
        // a fiabilidade cai com a antecedência mesmo quando os cenários concordam
        const leadF = clamp(1 - (k - 4) * 0.045, 0.55, 1);
        const confScore = (dS == null ? 0.5 * tS + 0.5 * pS : 0.4 * tS + 0.4 * pS + 0.2 * dS) * leadF;
        const nrm = normals?.[k] || null;
        const sun = (key) => { const v = ms.map((m) => m.d[key][k]).find((s) => typeof s === 'string'); return v ? v.slice(11, 16) : null; };
        return {
            date, code, tmax: r1(tmax), tmin: r1(tmin), tmaxP10: r1(qx[0]), tmaxP90: r1(qx[2]), tminP10: r1(qn[0]), tminP90: r1(qn[2]),
            precip: r1(precip), precipP90: r1(precipP90), pop: r0(isNum(pop) ? pop * 100 : null), popHeavy: r0(isNum(popHeavy) ? popHeavy * 100 : null),
            windMax: r0(isNum(det?.wind) ? det.wind * wf : null), gustMax: r0(isNum(det?.gust ?? ens?.gust) ? (det?.gust ?? ens.gust) * wf : null),
            dir: r0(det?.dir), uvMax: r1(det?.uv), sunrise: sun('sunrise'), sunset: sun('sunset'),
            confidence: confScore >= 0.7 ? 'alta' : confScore >= 0.45 ? 'media' : 'baixa', confScore: Math.round(confScore * 100) / 100, spread: r1(spread),
            change24h: change?.[k] || null, normal: nrm, anomaly: nrm && isNum(tmax) ? r1(tmax - nrm.tmax) : null,
            source: wDet >= 0.5 ? 'multimodelo' : 'ensemble', models: nDet, members: ens?.n || 0,
            _thunder: thunder,
        };
    });

    // 7) Indicadores e avisos
    const next72 = H.slice(nowIdx, nowIdx + 72);
    const indicators = buildIndicators(next72, H, nowIdx, daily, todayDate);
    const area = ipmaArea(raw.ipma, lat, lon);
    const warnings = ipmaWarnings(raw.ipma?.warnings, area?.idAreaAviso, nowLocal);
    const fire = buildFire(raw, { lat, lon, off, next: next72, now: H[nowIdx], area, place: raw.place });

    // 8) Agora
    const n = H[nowIdx], n2 = H[nowIdx + 1];
    // interpolação para o minuto atual (a hora cheia pode estar até 59 min desatualizada)
    const fr = n2 ? clamp((nowMs - tMs[nowIdx]) / 36e5, 0, 1) : 0;
    const at = (k) => (n2 && isNum(n[k]) && isNum(n2[k]) ? n[k] + fr * (n2[k] - n[k]) : n[k]);
    const now = {
        time: msToLocal(nowMs, off), temp: r1(at('temp')), feels: r1(at('feels')), dew: r1(at('dew')), rh: r0(at('rh')), wind: r0(at('wind')), gust: r0(at('gust')), dir: r0(n.dir),
        pressure: r1(n.pressure), pressureTrend3h: nowIdx >= 3 && isNum(n.pressure) && isNum(H[nowIdx - 3].pressure) ? r1(n.pressure - H[nowIdx - 3].pressure) : null,
        cloud: r0(n.cloud), precip: r1(n.precip), code: n.code, isDay: !!n.isDay, uv: r1(n.uv), visibility: r0(n.vis),
        obs: obsOut, correction,
    };

    const models = P.models.map((m) => ({ id: m.id, name: m.meta.name, org: m.meta.org, resKm: m.meta.resKm,
        weight: Math.round(m.meta.w * m.factor * 100) / 100, days: m.d.tmax.filter(isNum).length, hours: m.d.tmax.filter(isNum).length * 24, skill: m.skill,
        ...(m.ipma ? { official: true, local: m.ipma.name, localId: m.ipma.id, distanceKm: r1(m.ipma.distanceKm), updated: m.ipma.updated } : {}) }))
        .sort((a, b) => b.weight - a.weight);
    const nameOf = (id) => (id === IPMA_MODEL.id ? IPMA_MODEL.name : DET_MODELS.find((m) => m.id === id)?.name || id);
    const verification = ver ? {
        station: vset.label, source: vset.source, distanceKm: r1(vset.distanceKm), stations: vset.stations, names: vset.names.slice(0, 8), days: vset.days,
        n: Math.max(...Object.values(ver).map((v) => v.n)),
        biasApplied: P.models.some((m) => m.corrDay || m.corrNight),
        best: Object.entries(ver).filter(([, v]) => v.n >= 24).sort((a, b) => a[1].mae - b[1].mae)[0]?.[0] || null,
        models: Object.entries(ver).map(([id, v]) => ({ id, name: nameOf(id), mae: r1(v.mae), bias: r1(v.bias), n: v.n })).sort((a, b) => a.mae - b.mae),
    } : null;
    const hIdx = H.slice(nowIdx, nowIdx + 72).map((_, j) => nowIdx + j);
    const ipLoc = raw.ipma?.forecast?.local;
    const official = ipmaM ? { source: 'IPMA', local: ipmaM.ipma.name, id: ipmaM.ipma.id, distanceKm: r1(ipmaM.ipma.distanceKm),
        dir: isNum(ipLoc?.lat) && isNum(ipLoc?.lon) && ipmaM.ipma.distanceKm >= 0.05 ? compass(bearing(lat, lon, ipLoc.lat, ipLoc.lon)) : null, updated: ipmaM.ipma.updated,
        hours: ipmaM.ipma.hours, days: ipmaM.ipma.days, weight: Math.round(IPMA_MODEL.w * ipmaM.factor * 100) / 100, skill: ipmaM.skill,
        daily: ipmaM.ipma.daily.filter((x) => x.date >= todayDate),
        // hora a hora alinhado com "hourly" (temperatura e probabilidade de chuva do período de 3 h)
        hourly: { times: hIdx.map((i) => P.times[i]), temp: hIdx.map((i) => r1(ipmaM.h.temp[i])), pop: hIdx.map((i) => (isNum(ipmaM.hp[i]) ? r0(ipmaM.hp[i] * 100) : null)) } } : null;
    const compare = buildCompare({ P, daily, ensDays, ensP, ipmaM, todayDate });

    for (const d of daily) delete d._thunder;
    const usedMetar = (obsOut?.sources || []).includes('METAR') || /METAR/.test(vset?.source || '');
    return {
        v: 1, generatedAt: new Date(nowMs).toISOString(),
        location: { lat, lon, elevation: r0(targetElev), timezone: P.timezone, utcOffsetSeconds: off,
            name: opts.name || raw.place?.name || null, region: raw.place?.region || null, country: raw.place?.country || null, terrain },
        models, ensemble: ensP ? { members: ensP.members.length, models: ensP.systems } : { members: 0, models: [] },
        now, nowcast, hourly, daily: daily.map(stripInternal), indicators, warnings, fire, verification, official, compare,
        local: localSummary(terrain, tAdj, H.slice(nowIdx, nowIdx + 72), H[nowIdx], shifts),
        analysis: raw.analysisMeta || null,
        sources: ['Open-Meteo (CC BY 4.0)', 'ECMWF, DWD, Météo-France, Met Office, NOAA, ECCC, JMA, CMA', ...(area || official ? ['IPMA'] : []),
            ...(usedMetar ? ['NOAA AWC (METAR)'] : []), ...(fire.hotspots ? ['NASA FIRMS'] : []), ...(fire.incidents ? ['ANEPC via fogos.pt'] : []), 'EUMETSAT'],
    };
}

// ---------- fontes lado a lado (hoje, amanhã e depois) ----------
// Cada fonte com os seus valores (sem correções), o consenso final e o ensemble (P50 com P10–P90),
// e um resumo de quem discorda e quanto.
function buildCompare({ P, daily, ensDays, ensP, ipmaM, todayDate }) {
    const K = Math.min(3, daily.length);
    if (!K) return null;
    const dates = daily.slice(0, K).map((d) => d.date);
    const rows = [{ id: 'consenso', name: 'Consenso', short: 'Consenso', kind: 'consenso',
        days: daily.slice(0, K).map((d) => ({ tmax: d.tmax, tmin: d.tmin, precip: d.precip, pop: d.pop, code: d.code })) }];
    if (ipmaM) {
        rows.push({ id: 'ipma', name: IPMA_MODEL.name, short: 'IPMA', kind: 'oficial', local: ipmaM.ipma.name, distanceKm: r1(ipmaM.ipma.distanceKm), weight: Math.round(IPMA_MODEL.w * ipmaM.factor * 100) / 100,
            days: dates.map((_, k) => ({ tmax: r1(ipmaM.d.tmax[k]), tmin: r1(ipmaM.d.tmin[k]), precip: null, pop: isNum(ipmaM.dp[k]) ? r0(ipmaM.dp[k] * 100) : null,
                code: ipmaM.d.code[k] ?? null, text: IPMA_TXT[ipmaM.types[k]] || null })) });
    }
    for (const m of P.models) {
        if (m === ipmaM) continue;
        rows.push({ id: m.id, name: m.meta.name, short: m.meta.short || m.meta.name, kind: 'modelo', weight: Math.round(m.meta.w * m.factor * 100) / 100,
            days: dates.map((_, k) => ({ tmax: r1(m.d.tmax[k]), tmin: r1(m.d.tmin[k]), precip: r1(m.d.precip[k]), pop: null, code: isNum(m.d.code[k]) ? m.d.code[k] : null })) });
    }
    if (ensP && ensDays.slice(0, K).some(Boolean)) {
        rows.push({ id: 'ensemble', name: `Ensemble (P50 de ${ensP.members.length} cenários)`, short: 'Ensemble', kind: 'ensemble',
            days: dates.map((_, k) => { const e = ensDays[k]; return e ? { tmax: r1(e.tmax[1]), tmaxP10: r1(e.tmax[0]), tmaxP90: r1(e.tmax[2]), tmin: r1(e.tmin[1]), tminP10: r1(e.tmin[0]), tminP90: r1(e.tmin[2]),
                precip: r1(e.p50), precipP90: r1(e.p90), pop: isNum(e.pop) ? r0(e.pop * 100) : null } : null; }) });
    }
    // divergências: cada fonte face ao consenso, por dia (máxima, mínima e chuva)
    const src = rows.filter((r) => r.kind !== 'consenso');
    const lab = (date) => dayLabel(date, todayDate).replace(/ \(.*\)$/, '');
    const days = dates.map((date, k) => {
        const ref = rows[0].days[k];
        const out = { date };
        for (const key of ['tmax', 'tmin']) {
            const vals = src.map((r) => ({ id: r.id, name: r.short, v: r.days[k]?.[key] })).filter((x) => isNum(x.v));
            if (vals.length < 2 || !isNum(ref[key])) continue;
            const lo = vals.reduce((a, b) => (b.v < a.v ? b : a)), hi = vals.reduce((a, b) => (b.v > a.v ? b : a));
            const far = vals.reduce((a, b) => (Math.abs(b.v - ref[key]) > Math.abs(a.v - ref[key]) ? b : a));
            const ip = vals.find((x) => x.id === 'ipma');
            out[key] = { spread: r1(hi.v - lo.v), lo: { id: lo.id, name: lo.name, v: lo.v }, hi: { id: hi.id, name: hi.name, v: hi.v },
                far: { id: far.id, name: far.name, dev: r1(far.v - ref[key]) }, ipma: ip ? r1(ip.v - ref[key]) : null };
        }
        // chuva: fontes com ≥ 1 mm (modelos) ou probabilidade ≥ 50% (IPMA, ensemble)
        const wet = src.map((r) => { const x = r.days[k]; if (!x) return null; return r.kind === 'modelo' ? (isNum(x.precip) ? x.precip >= 1 : null) : isNum(x.pop) ? x.pop >= 50 : null; }).filter((x) => x != null);
        out.rain = { wet: wet.filter(Boolean).length, of: wet.length, pop: ref.pop, ipma: rows.find((r) => r.id === 'ipma')?.days[k]?.pop ?? null };
        return out;
    });
    // notas curtas (PT-PT)
    const f1 = (x) => String(r1(x)).replace('.', ','), sg = (x) => `${x > 0 ? '+' : x < 0 ? '−' : '±'}${f1(Math.abs(x))}`;
    const notes = [];
    days.forEach((d, k) => {
        const parts = [];
        if (d.tmax) parts.push(`máx. ${f1(d.tmax.lo.v)}° (${d.tmax.lo.name}) a ${f1(d.tmax.hi.v)}° (${d.tmax.hi.name})`);
        if (d.tmax && isNum(d.tmax.ipma)) parts.push(`IPMA ${sg(d.tmax.ipma)}° na máx.${d.tmin && isNum(d.tmin.ipma) ? ` e ${sg(d.tmin.ipma)}° na mín.` : ''} face ao consenso`);
        if (d.rain.of) parts.push(`chuva em ${d.rain.wet} de ${d.rain.of} fontes${isNum(d.rain.ipma) ? ` (IPMA ${d.rain.ipma}%)` : ''}`);
        if (parts.length) notes.push(`${cap1(lab(d.date))}: ${parts.join('; ')}.`);
    });
    // a maior divergência e a fonte mais afastada em média
    let worst = null;
    days.forEach((d) => { for (const key of ['tmax', 'tmin']) if (d[key] && (!worst || Math.abs(d[key].far.dev) > Math.abs(worst.dev))) worst = { date: d.date, key, ...d[key].far }; });
    const dev = new Map();
    for (const r of src) {
        const xs = [];
        rows[0].days.forEach((ref, k) => { for (const key of ['tmax', 'tmin']) if (isNum(ref[key]) && isNum(r.days[k]?.[key])) xs.push(Math.abs(r.days[k][key] - ref[key])); });
        if (xs.length >= 3) dev.set(r, xs.reduce((a, b) => a + b, 0) / xs.length);
    }
    const ranked = [...dev.entries()].sort((a, b) => b[1] - a[1]);
    if (worst && Math.abs(worst.dev) >= 1) notes.push(`Maior divergência: ${worst.name} ${sg(worst.dev)}° na ${worst.key === 'tmax' ? 'máxima' : 'mínima'} de ${lab(worst.date)}.`);
    const spreadMax = Math.max(0, ...days.flatMap((d) => [d.tmax?.spread, d.tmin?.spread].filter(isNum)));
    const level = spreadMax <= 2 ? 'alta' : spreadMax <= 4 ? 'media' : 'baixa';
    return {
        dates, rows, days, notes, agreement: level, spreadMax: r1(spreadMax),
        farthest: ranked.slice(0, 3).map(([r, x]) => ({ id: r.id, name: r.short, meanDev: r1(x) })),
        summary: notes.join(' '),
    };
}
const cap1 = (s) => (s ? s[0].toUpperCase() + s.slice(1) : '');
const stripInternal = (d) => { const { models, members, ...rest } = d; return { ...rest, models, members }; };

// Frase para as próximas 2 h (passos de 15 min: chuva em mm/15 min e % de modelos com chuva)
export function nowcastText(steps) {
    if (!steps.length) return '';
    const t = (s) => s.time.slice(11, 16);
    const kind = steps.map((s) => (s.prob >= 50 && s.precip >= 0.05 ? 'sim' : s.prob >= 25 || s.precip >= 0.1 ? 'talvez' : 'nao'));
    const inten = (list) => { const m = Math.max(...list.map((s) => s.precip)) * 4; return m >= 4 ? 'forte' : m >= 1 ? 'moderada' : 'fraca'; };
    const maxProb = Math.max(...steps.map((s) => s.prob));
    if (kind.every((k) => k === 'nao')) return 'Sem chuva prevista nas próximas 2 horas.';
    if (!kind.includes('sim')) return `Possibilidade de chuva ${inten(steps)} nas próximas 2 horas (até ${maxProb}% dos modelos).`;
    if (kind[0] === 'sim') {
        const i = kind.findIndex((k) => k !== 'sim');
        if (i < 0) return `Chuva ${inten(steps)} durante as próximas 2 horas.`;
        return `Chuva ${inten(steps.slice(0, i))} a ${kind[i] === 'nao' ? 'parar' : 'enfraquecer'} por volta das ${t(steps[i])}.`;
    }
    const i = kind.indexOf('sim');
    return `Chuva ${inten(steps.slice(i))} a partir das ${t(steps[i])}.`;
}

// Diferença face à corrida de há 24 h (máx. e chuva por dia), média dos modelos
function runChanges(prev, dates, off) {
    const H = prev?.hourly;
    if (!H?.time) return null;
    const ids = Object.keys(H).map((k) => /^temperature_2m_previous_day1_(.+)$/.exec(k)?.[1]).filter(Boolean);
    return dates.map((date) => {
        const idx = H.time.map((t, i) => (t.startsWith(date) ? i : -1)).filter((i) => i >= 0);
        if (idx.length < 24) return null;
        const dT = [], dP = [], w = [];
        for (const id of ids) {
            const a = idx.map((i) => H[`temperature_2m_${id}`]?.[i]), b = idx.map((i) => H[`temperature_2m_previous_day1_${id}`]?.[i]);
            const pa = idx.map((i) => H[`precipitation_${id}`]?.[i]), pb = idx.map((i) => H[`precipitation_previous_day1_${id}`]?.[i]);
            if (a.every(isNum) && b.every(isNum)) {
                dT.push(Math.max(...a) - Math.max(...b));
                dP.push(pa.every(isNum) && pb.every(isNum) ? pa.reduce((s, x) => s + x, 0) - pb.reduce((s, x) => s + x, 0) : null);
                w.push(DET_MODELS.find((m) => m.id === id)?.w || 1);
            }
        }
        if (!dT.length) return null;
        return { tmax: r1(wmean(dT, w)), precip: r1(wmean(dP, w)) };
    });
}

function level(v, thr) { let l = 0; thr.forEach((t, i) => { if (isNum(v) && v >= t) l = i + 1; }); return l; }
function ind(lvl, peak, text) { return { level: lvl, label: LEVEL_LABELS[lvl], peak: lvl ? peak : null, text: lvl ? text : '' }; }
function peakOf(list, key) { let best = null; for (const x of list) if (isNum(x[key]) && (!best || x[key] > best[key])) best = x; return best; }
const hm = (t) => t ? `${shortDay(t.slice(0, 10))} ${t.slice(11, 16)}` : '';

function buildIndicators(next, H, nowIdx, daily, todayDate) {
    // trovoada
    for (const x of next) x.thunder = Math.max(x.thunderVote, clamp((x.cape - 150) / 1200, 0, 1) * clamp(x.pop ?? 0, 0, 1));
    const th = peakOf(next, 'thunder');
    const thunder = ind(level(th?.thunder, [0.12, 0.25, 0.45, 0.65]), th?.time, `${th?.thunder >= 0.12 ? `Risco máximo ${hm(th?.time)}` : ''}${isNum(th?.cape) && th.cape >= 100 ? ` · CAPE ${Math.round(th.cape)} J/kg` : ''}`);
    // nevoeiro
    const fg = peakOf(next, 'fog');
    const fog = ind(level(fg?.fog, [0.3, 0.5, 0.7, 0.9]), fg?.time, `Mais provável ${hm(fg?.time)}${isNum(fg?.vis) ? ` · visibilidade ${fg.vis < 1000 ? Math.round(fg.vis) + ' m' : Math.round(fg.vis / 1000) + ' km'}` : ''}`);
    // geada
    for (const x of next) {
        const clear = (x.cloud ?? 100) < 30, calm = (x.wind ?? 99) < 10;
        x.frost = isNum(x.temp) ? (x.temp <= -2 ? 4 : x.temp <= 0 ? 3 : x.temp <= 2 && clear && calm ? 2 : x.temp <= 3.5 && clear && calm ? 1 : 0) : 0;
    }
    const fr = peakOf(next, 'frost');
    const minT = Math.min(...next.map((x) => x.temp).filter(isNum));
    const frost = ind(fr?.frost || 0, fr?.time, `Mínima ${r1(minT)}°C${fr?.frost >= 2 ? ' com céu limpo e vento fraco' : ''}`);
    // calor
    const hf = peakOf(next, 'feels');
    const heat = ind(level(hf?.feels, [32, 35, 38, 41]), hf?.time, `Sensação até ${r0(hf?.feels)}°C ${hm(hf?.time)}`);
    // vento
    const gu = peakOf(next, 'gust');
    const wind = ind(level(gu?.gust, [45, 60, 80, 100]), gu?.time, `Rajadas até ${r0(gu?.gust)} km/h de ${WIND_FROM[compass(gu?.dir)] || '—'} ${hm(gu?.time)}`);
    // chuva (intensidade horária e acumulado em 24 h)
    const pr = peakOf(next, 'precip');
    let acc = 0, accMax = 0;
    next.forEach((x, i) => { acc += x.precip || 0; if (i >= 24) acc -= next[i - 24].precip || 0; accMax = Math.max(accMax, acc); });
    const rl = Math.max(level(pr?.precip, [1, 4, 10, 20]), level(accMax, [10, 20, 40, 60]));
    const rain = ind(rl, pr?.time, `Até ${r1(pr?.precip)} mm/h ${hm(pr?.time)} · ${r0(accMax)} mm em 24 h`);
    // neve
    const snowSum = next.reduce((s, x) => s + (x.snow || 0), 0);
    const sn = peakOf(next, 'snow');
    const snow = ind(snowSum > 0.2 ? level(snowSum, [0.2, 1, 5, 10]) : 0, sn?.time, `${r1(snowSum)} cm em 72 h${isNum(sn?.frz) ? ` · cota 0°C ${Math.round(sn.frz)} m` : ''}`);
    // UV
    const uvp = peakOf(next.filter((x) => x.time.startsWith(todayDate) || true).slice(0, 36), 'uv');
    const uv = ind(level(uvp?.uv, [3, 6, 8, 11]), uvp?.time, `UV máximo ${r1(uvp?.uv)} ${hm(uvp?.time)}`);
    // pressão
    const p0 = H[nowIdx]?.pressure, p3 = H[nowIdx - 3]?.pressure, p24 = H[nowIdx + 24]?.pressure;
    const d3 = isNum(p0) && isNum(p3) ? p0 - p3 : null, d24 = isNum(p0) && isNum(p24) ? p24 - p0 : null;
    const trend = !isNum(d3) ? 'estável' : d3 <= -3 ? 'a descer rapidamente' : d3 <= -1 ? 'a descer' : d3 >= 3 ? 'a subir rapidamente' : d3 >= 1 ? 'a subir' : 'estável';
    // previsibilidade
    let days = daily.length - 1;
    for (let k = 1; k < daily.length; k++) if (daily[k].confScore < 0.45) { days = k - 1; break; }
    const lastGood = daily[Math.max(0, days)];
    const predictability = { days, text: days >= 10 ? 'Boa previsibilidade para mais de 10 dias' : days <= 0 ? 'Previsibilidade baixa já a partir de amanhã' : `Fiável até ${dayLabel(lastGood.date, todayDate)}` };
    const h48 = next.slice(0, 48);
    const agreement = wmean(h48.map((x) => (isNum(x.agree) ? x.agree * clamp(1 - ((x.spread ?? 0) - 0.5) / 3, 0, 1) : null)));
    return { thunder, fog, frost, heat, wind, rain, snow, uv, pressure: { trend, delta3h: r1(d3), delta24h: r1(d24) }, predictability,
        agreement: agreement == null ? null : Math.round(agreement * 100) / 100 };
}

// Área de aviso IPMA e concelho (via risco de incêndio, que tem coordenadas por concelho)
function ipmaArea(ipma, lat, lon) {
    if (!ipma || !inPortugal(lat, lon)) return null;
    const muni = Object.values(ipma.rcm0?.local || {}).map((m) => ({ ...m, d: haversine(lat, lon, m.latitude, m.longitude) })).sort((a, b) => a.d - b.d)[0];
    const dist = ipma.districts?.data || [];
    let area = null;
    if (muni && muni.d <= 40) {
        const id = Number(String(muni.dico).slice(0, 2));
        area = id <= 18 ? dist.find((x) => x.idDistrito === id) : null;
    }
    if (!area && dist.length) area = dist.map((x) => ({ ...x, d: haversine(lat, lon, Number(x.latitude), Number(x.longitude)) })).sort((a, b) => a.d - b.d)[0];
    return { idAreaAviso: area?.idAreaAviso || null, district: area?.local || null, dico: muni && muni.d <= 40 ? muni.dico : null };
}

function ipmaWarnings(list, areaId, nowLocal) {
    if (!Array.isArray(list) || !areaId) return [];
    return list.filter((w) => w.idAreaAviso === areaId && w.awarenessLevelID !== 'green' && String(w.endTime).slice(0, 16) >= nowLocal)
        .sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)))
        .map((w) => ({ source: 'IPMA', type: w.awarenessTypeName, level: w.awarenessLevelID, start: String(w.startTime).slice(0, 16), end: String(w.endTime).slice(0, 16), text: w.text || '' }));
}

function buildFire(raw, { lat, lon, off, next, now, area, place }) {
    const RADIUS = 50;
    let risk = null;
    if (area?.dico) {
        const a = raw.ipma?.rcm0?.local?.[area.dico]?.data?.rcm, b = raw.ipma?.rcm1?.local?.[area.dico]?.data?.rcm;
        if (isNum(a) || isNum(b)) risk = { today: a ?? null, tomorrow: b ?? null, label: RCM_LABELS[a] || null, labelTomorrow: RCM_LABELS[b] || null,
            concelho: place?.municipality || place?.name || null, dico: area.dico };
    }
    let hotspots = null;
    if (raw.firms) {
        const items = [];
        for (const [k, text] of Object.entries(raw.firms)) items.push(...parseFirmsCsv(text, FIRMS[k]?.name || k, lat, lon, RADIUS, off));
        items.sort((a, b) => a.distanceKm - b.distanceKm);
        hotspots = { count: items.length, radiusKm: RADIUS, nearestKm: items[0]?.distanceKm ?? null, items: items.slice(0, 12) };
    }
    let incidents = null;
    if (raw.fogos) {
        const data = Array.isArray(raw.fogos?.data) ? raw.fogos.data : [];
        const items = data.filter((x) => isNum(x.lat) && isNum(x.lng)).map((x) => {
            const d = haversine(lat, lon, x.lat, x.lng);
            const ms = isNum(x.dateTime?.sec) ? x.dateTime.sec * 1000 : null;
            return { id: String(x.id), natureza: x.natureza || null, status: x.status || null, distanceKm: r1(d), bearing: compass(bearing(lat, lon, x.lat, x.lng)),
                man: x.man ?? null, terrain: x.terrain ?? null, aerial: x.aerial ?? null, time: ms ? msToLocal(ms, off) : null, location: x.location || null, important: !!x.important };
        }).filter((x) => x.distanceKm <= RADIUS).sort((a, b) => a.distanceKm - b.distanceKm);
        incidents = { count: items.length, radiusKm: RADIUS, updated: raw.fogos.savedAt ? msToLocal(Date.parse(raw.fogos.savedAt), off) : null, items: items.slice(0, 12) };
    }
    const hits = next.filter((x) => x.temp >= 30 && x.rh <= 30 && x.wind >= 30);
    const rule30 = { hours: hits.length, first: hits[0]?.time || null,
        text: hits.length ? `Regra 30-30-30 atingida em ${hits.length} h (a partir de ${hm(hits[0].time)})` : 'Regra 30-30-30 não atingida nas próximas 72 h' };
    const dirTxt = WIND_FROM[compass(now?.dir)];
    const windTxt = !isNum(now?.wind) ? '' : now.wind < 10 ? 'Vento fraco' : now.wind < 25 ? 'Vento moderado' : now.wind < 40 ? 'Vento forte' : 'Vento muito forte';
    const rhTxt = !isNum(now?.rh) ? '' : now.rh < 30 ? 'humidade muito baixa' : now.rh < 50 ? 'humidade baixa' : now.rh < 75 ? 'humidade moderada' : 'humidade alta';
    const spread = { dir: r0(now?.dir), wind: r0(now?.wind), gust: r0(now?.gust), rh: r0(now?.rh),
        text: [windTxt && dirTxt ? `${windTxt} de ${dirTxt}` : windTxt, rhTxt].filter(Boolean).join('; ') };
    return { risk, hotspots, incidents, rule30, spread };
}

// ---------- resumo em texto para o Claude ----------
export function buildSummary(fc, extra = {}) {
    const L = [];
    const f1 = (x) => (isNum(x) ? x.toFixed(1) : '—'), f0 = (x) => (isNum(x) ? String(Math.round(x)) : '—');
    const loc = fc.location, T = loc.terrain, LA = fc.local;
    const n = fc.now, o = n.obs, OF = fc.official;
    // 1) o ponto: onde é, o relevo, de onde vêm os dados — e o pedido explícito de falar só dele
    L.push('## O ponto');
    L.push(`${loc.name || 'Local sem nome'} — ${loc.lat?.toFixed(4)}, ${loc.lon?.toFixed(4)} · ${loc.elevation} m · fuso ${loc.timezone} · hora local agora ${String(n.time).replace('T', ' ')}.`);
    L.push(T ? `Relevo: ${T.description} (altitude média à volta: ${T.rings.map((r) => `${r.mean} m a ${String(r.km).replace('.', ',')} km [${r.min}–${r.max} m]`).join(', ')}).`
        : 'Relevo: desconhecido (sem as altitudes à volta do ponto).');
    if (LA) L.push(`Efeito local já incluído na previsão: ${LA.text}${LA.tmin?.length ? ` Mínimas: ${LA.tmin.map((t) => `${t.date} ${f1(t.delta)}°C`).join(', ')}.` : ''}${LA.rule ? ` Regra: ${LA.rule}.` : ''}`);
    if (OF) L.push(`Previsão oficial do IPMA: ${OF.local} (a ${OF.distanceKm} km do ponto${OF.dir ? `, para ${OF.dir}` : ''}), atualizada ${OF.updated || '?'}, entra no consenso com peso ${OF.weight} nos dias 0–2 (menos depois)${OF.skill ? ` [erro local ${OF.skill.mae}°C, viés ${OF.skill.bias}]` : ' (ainda sem verificação local)'}.`);
    const used = (o?.stations || []).filter((s) => s.used);
    L.push(used.length ? `Estações na observação combinada (${used.length}, a ${o.distanceKm} km em média, levadas à altitude do ponto): ${used.slice(0, 8).map((s) => `${s.name} (${s.source}, ${s.distanceKm} km${s.dir ? ` para ${s.dir}` : ''}, ${isNum(s.elev) ? s.elev + ' m' : 'alt. ?'}, peso ${s.weight}%)`).join('; ')}${used.length > 8 ? `; e mais ${used.length - 8}` : ''}.`
        : 'Estações: nenhuma com observação recente até 30 km — a previsão do ponto vem só dos modelos.');
    L.push('Analisa este ponto; a região só interessa quando afeta o ponto (com distância, direção e hora de chegada). Diz o que acontece aqui, hora a hora, em mm, km/h e °C; nada de frases genéricas sobre o distrito ou a região.');
    const ipH = OF?.hourly ? new Map(OF.hourly.times.map((t, i) => [t, [OF.hourly.temp[i], OF.hourly.pop[i]]])) : null;
    const ipCell = (h) => { const ip = ipH?.get(h.time); return ip && isNum(ip[0]) ? `${f1(ip[0])} (${f0(ip[1])}%)` : '—'; };
    L.push(`\n## Próximas 12 h no ponto, hora a hora (T = consenso corrigido [faixa entre modelos]; local = ajuste do relevo já incluído${ipH ? '; IPMA = previsão oficial T (prob. 3 h)' : ''})`);
    L.push(`hora | T [faixa] | sens | chuva mm/h (prob) | vento/rajada dir | nuvens (baixas) | HR | orvalho | visib. km | código | local${ipH ? ' | IPMA' : ''}`);
    fc.hourly.slice(0, 13).forEach((h) => {
        L.push(`${h.time.slice(5).replace('T', ' ')} | ${f1(h.temp)} [${f1(h.tempLo)}–${f1(h.tempHi)}] | ${f1(h.feels)} | ${f1(h.precip)} (${f0(h.pop)}%) | ${f0(h.wind)}/${f0(h.gust)} ${compass(h.dir) || ''} | ${f0(h.cloud)} (${f0(h.cloudLow)}) | ${f0(h.rh)} | ${f1(h.dew)} | ${isNum(h.visibility) ? f1(h.visibility / 1000) : '—'} | ${h.code} | ${isNum(h.local) ? f1(h.local) : '0'}${ipH ? ` | ${ipCell(h)}` : ''}`);
    });
    L.push('\n## Fontes');
    L.push(`Gerado: ${fc.generatedAt}. Modelos: ${fc.models.map((m) => `${m.name} p=${m.weight}${m.skill ? ` [erro local ${m.skill.mae}°C, viés ${m.skill.bias}]` : ''}`).join('; ')}.`);
    L.push(`Ensembles: ${fc.ensemble.members} cenários (${fc.ensemble.models.map((m) => `${m.name} ${m.members}×${m.days}d`).join(', ')}).`);
    L.push('\n## Agora');
    L.push(`Consenso: ${f1(n.temp)}°C (sensação ${f1(n.feels)}), HR ${f0(n.rh)}%, orvalho ${f1(n.dew)}, vento ${f0(n.wind)} km/h de ${compass(n.dir) || '—'} rajadas ${f0(n.gust)}, pressão ${f1(n.pressure)} hPa (3 h: ${f1(n.pressureTrend3h)}), nuvens ${f0(n.cloud)}%, código ${n.code}.`);
    if (o) {
        L.push(`Observação combinada no ponto (${o.n ?? 1} estação(ões) ${(o.sources || [o.source]).join('+')}, a ${o.distanceKm} km em média${isNum(o.nearestKm) ? `, a mais próxima a ${o.nearestKm} km` : ''}, ajustada à altitude de ${o.elevation ?? loc.elevation} m, há ${o.ageMin} min): ${f1(o.temp)}°C, HR ${f0(o.rh)}%, vento ${f0(o.wind)} km/h de ${compass(o.dir) || '—'}, pressão ${f1(o.pressure)}.${isNum(o.repr) ? ` Confiança na observação ${o.repr} (0–1; dispersão entre estações ${f1(o.spread)}°C).` : ''}${n.correction ? ` Correção aplicada: ${n.correction.temp}°C (decai em ~5 h).` : ''}`);
        if (o.stations?.length) L.push(`Estações: ${o.stations.map((s) => `${s.name} (${s.source}, ${s.distanceKm} km, ${isNum(s.elev) ? s.elev + ' m' : 'alt. ?'}, ${String(s.time).slice(11)}): ${f1(s.temp)}→${f1(s.tempAdj)}°C, desvio ${f1(s.anomaly)}, peso ${s.weight}%${s.used ? '' : ' [rejeitada]'}`).join('; ')}.`);
    }
    if (fc.nowcast?.text) L.push(`Próximas 2 h: ${fc.nowcast.text} (${fc.nowcast.steps.map((s) => `${s.time.slice(11)} ${f1(s.precip)}mm/${s.prob}%`).join(', ')})`);
    L.push(`\n## Das 12 às 48 h no ponto (de 3 em 3 h; T = consenso [faixa entre modelos], chuva mm/h e prob.${ipH ? '; IPMA = previsão oficial T (prob. 3 h)' : ''})`);
    L.push(`hora | T [faixa] | sens | chuva (prob) | vento/rajada dir | nuvens (baixas) | CAPE | HR | código | local${ipH ? ' | IPMA' : ''}`);
    fc.hourly.filter((_, i) => i >= 12 && i % 3 === 0).slice(0, 13).forEach((h) => {
        L.push(`${h.time.slice(5).replace('T', ' ')} | ${f1(h.temp)} [${f1(h.tempLo)}–${f1(h.tempHi)}] | ${f1(h.feels)} | ${f1(h.precip)} (${f0(h.pop)}%) | ${f0(h.wind)}/${f0(h.gust)} ${compass(h.dir) || ''} | ${f0(h.cloud)} (${f0(h.cloudLow)}) | ${f0(h.cape)} | ${f0(h.rh)} | ${h.code} | ${isNum(h.local) ? f1(h.local) : '0'}${ipH ? ` | ${ipCell(h)}` : ''}`);
    });
    L.push('\n## 16 dias (T máx/mín com P10–P90 do ensemble; chuva = média e P90; prob. ≥1 mm e ≥10 mm)');
    L.push('dia | código | máx [P10–P90] | mín [P10–P90] | chuva (P90) | prob | ≥10mm | rajada | conf. | Δ24h máx/chuva | anomalia | fonte');
    fc.daily.forEach((d) => {
        L.push(`${d.date} | ${d.code} | ${f1(d.tmax)} [${f1(d.tmaxP10)}–${f1(d.tmaxP90)}] | ${f1(d.tmin)} [${f1(d.tminP10)}–${f1(d.tminP90)}] | ${f1(d.precip)} (${f1(d.precipP90)}) | ${f0(d.pop)}% | ${f0(d.popHeavy)}% | ${f0(d.gustMax)} | ${d.confidence} ${d.confScore} | ${d.change24h ? `${f1(d.change24h.tmax)}/${f1(d.change24h.precip)}` : '—'} | ${isNum(d.anomaly) ? f1(d.anomaly) : '—'} | ${d.source} (${d.models} mod., ${d.members} cen.)`);
    });
    L.push('\n## Indicadores');
    const I = fc.indicators;
    for (const k of ['thunder', 'fog', 'frost', 'heat', 'wind', 'rain', 'snow', 'uv']) L.push(`${k}: nível ${I[k].level} (${I[k].label})${I[k].text ? ' — ' + I[k].text : ''}`);
    L.push(`pressão: ${I.pressure.trend} (3 h ${f1(I.pressure.delta3h)}, próximas 24 h ${f1(I.pressure.delta24h)} hPa). Previsibilidade: ${I.predictability.text}. Concordância 48 h: ${I.agreement}.`);
    L.push('\n## Avisos oficiais IPMA');
    L.push(fc.warnings.length ? fc.warnings.map((w) => `${w.level} ${w.type} ${w.start}→${w.end}: ${w.text}`).join('\n') : 'Nenhum.');
    const F = fc.fire;
    L.push('\n## Incêndios');
    L.push(F.risk ? `Risco IPMA (RCM) concelho ${F.risk.concelho || F.risk.dico}: hoje ${F.risk.today} ${F.risk.label || ''}, amanhã ${F.risk.tomorrow} ${F.risk.labelTomorrow || ''}.` : 'Risco IPMA: n/d.');
    L.push(F.hotspots ? `Focos de calor por satélite (24 h, ${F.hotspots.radiusKm} km): ${F.hotspots.count}${F.hotspots.items.slice(0, 5).map((h) => ` | ${h.distanceKm} km ${h.bearing}, FRP ${h.frp} MW, ${h.time}, ${h.sat}, conf. ${h.confidence}`).join('')}` : 'Focos FIRMS: n/d.');
    L.push(F.incidents ? `Ocorrências ANEPC ativas (${F.incidents.radiusKm} km): ${F.incidents.count}${F.incidents.items.slice(0, 5).map((x) => ` | ${x.natureza} ${x.status}, ${x.distanceKm} km ${x.bearing}, ${x.man} operacionais/${x.terrain} terrestres/${x.aerial} aéreos, ${x.location}`).join('')}` : 'Ocorrências ANEPC: n/d.');
    L.push(`${F.rule30.text}. Propagação agora: ${F.spread.text || '—'}.`);
    if (fc.verification) {
        const v = fc.verification;
        const where = (v.stations || 1) > 1 ? `${v.stations} estações (${(v.names || []).slice(0, 5).join(', ')}), a ${v.distanceKm} km em média` : `${v.station}, ${v.distanceKm} km`;
        L.push(`\n## Verificação local (últimos ${v.days} dia(s), ${where}, previsões a 1 dia)`);
        L.push(v.models.map((m) => `${m.name}: erro médio ${m.mae}°C, viés ${m.bias} (n=${m.n})`).join('; ') + (v.biasApplied ? '. Viés corrigido nos modelos.' : '.'));
    }
    if (OF?.daily?.length) {
        L.push(`\n## Previsão oficial IPMA — ${OF.local} (10 dias, como publicada)`);
        L.push('dia | máx/mín | prob. chuva | tempo | vento | UV');
        OF.daily.forEach((d) => L.push(`${d.date} | ${f1(d.tmax)}/${f1(d.tmin)} | ${f0(d.pop)}% | ${d.text || d.code} | ${d.wind || '—'} ${d.dir || ''} | ${isNum(d.uv) ? f1(d.uv) : '—'}`));
    }
    const C = fc.compare;
    if (C?.rows?.length) {
        L.push(`\n## Fontes lado a lado (valores de cada fonte sem correções; consenso = final; concordância ${C.agreement}, maior diferença ${f1(C.spreadMax)}°C)`);
        L.push(`fonte | ${C.dates.join(' | ')} (máx/mín, chuva mm ou prob.)`);
        for (const r of C.rows) {
            L.push(`${r.short}${r.kind === 'modelo' ? ` p=${r.weight}` : r.kind === 'oficial' ? ` (oficial, p=${r.weight})` : ''} | ${r.days.map((x) => (!x ? '—'
                : `${f1(x.tmax)}${isNum(x.tmaxP10) ? ` [${f1(x.tmaxP10)}–${f1(x.tmaxP90)}]` : ''}/${f1(x.tmin)}${isNum(x.tminP10) ? ` [${f1(x.tminP10)}–${f1(x.tminP90)}]` : ''} ${isNum(x.precip) ? `${f1(x.precip)}mm` : ''}${isNum(x.pop) ? ` ${f0(x.pop)}%` : ''}${x.text ? ` ${x.text}` : ''}`.trim())).join(' | ')}`);
        }
        if (C.notes?.length) L.push(`Divergências: ${C.notes.join(' ')}`);
        if (C.farthest?.length) L.push(`Fontes mais afastadas do consenso (média dos 3 dias): ${C.farthest.map((x) => `${x.name} ${f1(x.meanDev)}°C`).join(', ')}.`);
    }
    if (extra.perModel) {
        L.push('\n## Modelos lado a lado (máx/mín/chuva, 4 dias)');
        L.push(extra.perModel);
    }
    return L.join('\n');
}

// Tabela por modelo (dias 0-3) para o Claude ver desacordos
export function perModelTable(det, days = 4) {
    const P = parseDet(det);
    const rows = [];
    for (const m of P.models) {
        const cells = [];
        for (let k = 0; k < Math.min(days, P.dates.length); k++) cells.push(`${P.dates[k].slice(5)} ${m.d.tmax[k] ?? '—'}/${m.d.tmin[k] ?? '—'}/${m.d.precip[k] ?? '—'}mm`);
        rows.push(`${m.meta.name}: ${cells.join(' · ')}`);
    }
    return rows.join('\n');
}
