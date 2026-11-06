// Motor de previsão: junta modelos, ensembles e observações num só resultado (formato em docs/API.md).
// Funções puras: corre no browser (PWA) e no Node (tarefa agendada do Claude). Sem acesso à rede.
import { DET_MODELS, ENS_MODELS, inPortugal, FIRMS } from './sources.js';
import {
    isNum, clamp, r1, r0, wmean, wstd, wquantile, wmedian, robustMean, wfrac, haversine, bearing, compass,
    WIND_FROM, vecDir, dewPoint, relHum,
} from './stats.js';

export const LEVEL_LABELS = ['nenhum', 'baixo', 'moderado', 'elevado', 'muito elevado'];
export const RCM_LABELS = [null, 'Reduzido', 'Moderado', 'Elevado', 'Muito elevado', 'Máximo'];
const DOW = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const MON = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const LAPSE = 0.0065; // °C por metro

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

function ipmaSeries(obs, id) {
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

    // 1) Estação e verificação local
    const st = raw.station || pickStation({ ipmaStations: raw.ipma?.stations, ipmaObs: raw.ipma?.obs, metar: raw.metar, lat, lon, nowMs });
    const stationElev = st ? (isNum(st.elev) ? st.elev : raw.stationElev ?? null) : null;
    const dElev = isNum(stationElev) && isNum(targetElev) ? Math.abs(stationElev - targetElev) : null;
    const reprW = st ? clamp(1 - (st.distanceKm - 3) / 20, 0, 1) * (dElev == null ? 0.6 : clamp(1 - dElev / 300, 0, 1)) : 0;
    // estação para verificação: a que tem mais histórico (METAR 7 dias > IPMA 24 h + histórico guardado)
    let vs = null;
    const mh = metarRows(raw.metarHistory);
    if (mh.length >= 48) {
        const r0w = mh[0];
        vs = { source: 'METAR', name: r0w.name, distanceKm: haversine(lat, lon, r0w.lat, r0w.lon), elev: r0w.elev, series: mh };
    } else if (st) vs = { source: st.source, name: st.name, distanceKm: st.distanceKm, elev: stationElev, series: [...(raw.obsHistory || []), ...st.series] };
    const vElev = vs && isNum(vs.elev) ? vs.elev : null;
    const vdElev = isNum(vElev) && isNum(targetElev) ? Math.abs(vElev - targetElev) : null;
    const ver = vs && vs.distanceKm <= 20 && (vdElev == null || vdElev <= 250) ? verify(raw.prev, vs.series, { stationElev: vElev, targetElev, nowMs, offset: off }) : null;
    if (ver) {
        const maes = Object.values(ver).filter((v) => v.n >= 24).map((v) => v.mae);
        const med = maes.length ? wmedian(maes) : null;
        const biasOk = vs.distanceKm <= 15 && (vdElev == null || vdElev <= 150);
        for (const m of P.models) {
            const v = ver[m.id];
            if (v && v.n >= 24 && med) {
                m.skill = { mae: r1(v.mae), bias: r1(v.bias), n: v.n };
                m.factor = clamp((med / Math.max(v.mae, 0.3)) ** 2, 0.4, 2.5);
                if (biasOk) { m.corrDay = shrink(v.biasDay ?? v.bias, v.nDay || v.n); m.corrNight = shrink(v.biasNight ?? v.bias, v.nNight || v.n); }
            } else if (maes.length) m.factor = 0.7;
        }
    }

    // 2) Consenso hora a hora
    const ensP = parseEns(raw.ens);
    const ensHourIdx = new Map((ensP?.hours || []).map((t, i) => [t, i]));
    const H = P.times.map((time, i) => {
        const lead = (tMs[i] - nowMs) / 36e5, hr = hourOf(time);
        const ms = P.models;
        const wT = ms.map((m) => (lead > 48 && m.meta.wAfter48 != null ? m.meta.wAfter48 : m.meta.w) * m.factor);
        const wP = ms.map((m, k) => wT[k] * (m.meta.wPrecip || 1));
        const col = (k, corr) => ms.map((m) => { const v = m.h[k][i]; return isNum(v) ? v + (corr ? corrAt(m, hr) : 0) : null; });
        const temps = col('temp', true), precs = col('precip');
        const codes = col('code');
        const okW = (arr, w) => w.map((x, k) => (isNum(arr[k]) ? x : 0));
        const cw = okW(codes, wT), cwSum = cw.reduce((a, b) => a + b, 0) || 1;
        const vote = (f) => codes.reduce((s, c, k) => s + (isNum(c) && f(c) ? cw[k] : 0), 0) / cwSum;
        const wetW = codes.reduce((s, c, k) => s + (isNum(c) && c >= 50 ? cw[k] : 0), 0);
        const popDet = wfrac(precs, wP, 0.1);
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

    // 3) Correção pela observação atual (decai em ~5 h; ponto de orvalho ~8 h)
    let correction = null, obsOut = null;
    if (st) {
        const o = st.last;
        const adj = isNum(stationElev) && isNum(targetElev) ? (stationElev - targetElev) * LAPSE : 0;
        const i0 = tMs.findIndex((ms) => ms > o.ms) - 1;
        if (i0 >= 0 && i0 + 1 < H.length && isNum(H[i0].temp) && isNum(H[i0 + 1].temp)) {
            const f = (o.ms - tMs[i0]) / 36e5;
            const cAt = (k) => (isNum(H[i0][k]) && isNum(H[i0 + 1][k]) ? H[i0][k] + f * (H[i0 + 1][k] - H[i0][k]) : null);
            const aT = isNum(o.temp) ? clamp(o.temp + adj - cAt('temp'), -6, 6) : null;
            const cDew = cAt('dew');
            const aD = isNum(o.dew) && isNum(cDew) ? clamp(o.dew + adj - cDew, -6, 6) : null;
            if (reprW > 0 && (isNum(aT) || isNum(aD))) {
                for (let i = i0; i < H.length; i++) {
                    const h = Math.max(0, (tMs[i] - o.ms) / 36e5);
                    if (isNum(aT)) {
                        const d = reprW * aT * Math.exp(-h / 5);
                        for (const k of ['temp', 'tempLo', 'tempHi', 'feels']) if (isNum(H[i][k])) H[i][k] += d;
                    }
                    if (isNum(aD) && isNum(H[i].dew)) H[i].dew += reprW * aD * Math.exp(-h / 8);
                    if (isNum(H[i].dew) && isNum(H[i].temp)) { H[i].dew = Math.min(H[i].dew, H[i].temp); H[i].rh = relHum(H[i].temp, H[i].dew); }
                }
                correction = { temp: r1(isNum(aT) ? reprW * aT : 0), dew: r1(isNum(aD) ? reprW * aD : 0), decayHours: 5 };
            }
        }
        obsOut = { source: st.source, station: st.name, distanceKm: r1(st.distanceKm), time: msToLocal(o.ms, off), ageMin: r0((nowMs - o.ms) / 6e4),
            temp: r1(o.temp), rh: r0(o.rh), wind: r0(o.wind), gust: r0(o.gust), dir: r0(o.dir), pressure: r1(o.pressure), precip1h: r1(o.precip1h) };
    }

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
    const daily = P.dates.map((date, k) => {
        const ms = P.models;
        const wD = ms.map((m) => (k >= 2 && m.meta.wAfter48 != null ? m.meta.wAfter48 : m.meta.w) * m.factor);
        const dv = (key, corr) => ms.map((m) => { const v = m.d[key][k]; return isNum(v) ? v + corr(m) : null; });
        const tmaxM = dv('tmax', (m) => m.corrDay), tminM = dv('tmin', (m) => m.corrNight);
        const nDet = tmaxM.filter(isNum).length;
        const pM = dv('precip', () => 0), wPD = wD.map((w, i) => w * (ms[i].meta.wPrecip || 1));
        const det = nDet ? {
            tmax: robustMean(tmaxM, wD, 2), tmin: robustMean(tminM, wD, 2), sd: wstd(tmaxM, wD), precip: wmean(pM, wPD),
            pop: wfrac(pM, wPD, 1), pop10: wfrac(pM, wPD, 10), p90: wquantile(pM, wPD, 0.9),
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
        const wDet = !det ? 0 : !ens ? 1 : clamp((k <= 2 ? 0.75 : k <= 4 ? 0.6 : k <= 6 ? 0.45 : k <= 9 ? 0.3 : 0.2) * (nDet >= 4 ? 1 : nDet >= 2 ? 0.7 : 0.4), 0, 1);
        const mix = (a, b) => (isNum(a) && isNum(b) ? wDet * a + (1 - wDet) * b : isNum(a) ? a : b);
        let tmax = mix(det?.tmax, ens && ens.tmax[1] + shiftDay), tmin = mix(det?.tmin, ens && ens.tmin[1] + shiftNight);
        // hoje: o que já se observou + horas que faltam (já corrigidas)
        if (k === 0) {
            const rest = H.filter((x) => x.time.startsWith(date) && x.ms >= nowMs).map((x) => x.temp).filter(isNum);
            const seen = st && reprW >= 0.5 ? st.series.filter((o) => isNum(o.temp) && msToLocal(o.ms, off).startsWith(date)).map((o) => o.temp + (isNum(stationElev) && isNum(targetElev) ? (stationElev - targetElev) * LAPSE : 0)) : [];
            const all = [...rest, ...seen];
            if (all.length >= 3) { tmax = Math.max(...all); if (seen.length >= 3 || rest.length >= 12) tmin = Math.min(...all, ...(seen.length ? [] : [tmin])); }
        }
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
            windMax: r0(det?.wind), gustMax: r0(det?.gust ?? ens?.gust), dir: r0(det?.dir), uvMax: r1(det?.uv), sunrise: sun('sunrise'), sunset: sun('sunset'),
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
    const n = H[nowIdx];
    const now = {
        time: n.time, temp: r1(n.temp), feels: r1(n.feels), dew: r1(n.dew), rh: r0(n.rh), wind: r0(n.wind), gust: r0(n.gust), dir: r0(n.dir),
        pressure: r1(n.pressure), pressureTrend3h: nowIdx >= 3 && isNum(n.pressure) && isNum(H[nowIdx - 3].pressure) ? r1(n.pressure - H[nowIdx - 3].pressure) : null,
        cloud: r0(n.cloud), precip: r1(n.precip), code: n.code, isDay: !!n.isDay, uv: r1(n.uv), visibility: r0(n.vis),
        obs: obsOut, correction,
    };

    const models = P.models.map((m) => ({ id: m.id, name: m.meta.name, org: m.meta.org, resKm: m.meta.resKm,
        weight: Math.round(m.meta.w * m.factor * 100) / 100, days: m.d.tmax.filter(isNum).length, hours: m.d.tmax.filter(isNum).length * 24, skill: m.skill }))
        .sort((a, b) => b.weight - a.weight);
    const verification = ver ? {
        station: vs.name, source: vs.source, distanceKm: r1(vs.distanceKm), days: vs.source === 'METAR' ? 7 : 1, n: Math.max(...Object.values(ver).map((v) => v.n)),
        biasApplied: P.models.some((m) => m.corrDay || m.corrNight),
        best: Object.entries(ver).filter(([, v]) => v.n >= 24).sort((a, b) => a[1].mae - b[1].mae)[0]?.[0] || null,
        models: Object.entries(ver).map(([id, v]) => ({ id, name: DET_MODELS.find((m) => m.id === id)?.name || id, mae: r1(v.mae), bias: r1(v.bias), n: v.n })).sort((a, b) => a.mae - b.mae),
    } : null;

    for (const d of daily) delete d._thunder;
    return {
        v: 1, generatedAt: new Date(nowMs).toISOString(),
        location: { lat, lon, elevation: r0(targetElev), timezone: P.timezone, utcOffsetSeconds: off,
            name: opts.name || raw.place?.name || null, region: raw.place?.region || null, country: raw.place?.country || null },
        models, ensemble: ensP ? { members: ensP.members.length, models: ensP.systems } : { members: 0, models: [] },
        now, nowcast, hourly, daily: daily.map(stripInternal), indicators, warnings, fire, verification,
        analysis: raw.analysisMeta || null,
        sources: ['Open-Meteo (CC BY 4.0)', 'ECMWF, DWD, Météo-France, Met Office, NOAA, ECCC, JMA, CMA', ...(area ? ['IPMA'] : []),
            ...(st?.source === 'METAR' ? ['NOAA AWC (METAR)'] : []), ...(fire.hotspots ? ['NASA FIRMS'] : []), ...(fire.incidents ? ['ANEPC via fogos.pt'] : []), 'EUMETSAT'],
    };
}
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
    const loc = fc.location;
    L.push(`# Previsão para ${loc.name || 'local'} (${loc.lat?.toFixed(4)}, ${loc.lon?.toFixed(4)}), ${loc.elevation} m, fuso ${loc.timezone}`);
    L.push(`Gerado: ${fc.generatedAt} (hora local agora: ${fc.now.time}). Modelos: ${fc.models.map((m) => `${m.name} p=${m.weight}${m.skill ? ` [erro local ${m.skill.mae}°C, viés ${m.skill.bias}]` : ''}`).join('; ')}.`);
    L.push(`Ensembles: ${fc.ensemble.members} cenários (${fc.ensemble.models.map((m) => `${m.name} ${m.members}×${m.days}d`).join(', ')}).`);
    const n = fc.now, o = n.obs;
    L.push('\n## Agora');
    L.push(`Consenso: ${f1(n.temp)}°C (sensação ${f1(n.feels)}), HR ${f0(n.rh)}%, orvalho ${f1(n.dew)}, vento ${f0(n.wind)} km/h de ${compass(n.dir) || '—'} rajadas ${f0(n.gust)}, pressão ${f1(n.pressure)} hPa (3 h: ${f1(n.pressureTrend3h)}), nuvens ${f0(n.cloud)}%, código ${n.code}.`);
    if (o) L.push(`Observado em ${o.station} (${o.source}, ${o.distanceKm} km, há ${o.ageMin} min): ${f1(o.temp)}°C, HR ${f0(o.rh)}%, vento ${f0(o.wind)} km/h de ${compass(o.dir) || '—'}, pressão ${f1(o.pressure)}.${n.correction ? ` Correção aplicada: ${n.correction.temp}°C (decai em ~5 h).` : ''}`);
    if (fc.nowcast?.text) L.push(`Próximas 2 h: ${fc.nowcast.text} (${fc.nowcast.steps.map((s) => `${s.time.slice(11)} ${f1(s.precip)}mm/${s.prob}%`).join(', ')})`);
    L.push('\n## Próximas 48 h (de 3 em 3 h; T = consenso [faixa entre modelos], chuva mm/h e prob.)');
    L.push('hora | T [faixa] | sens | chuva (prob) | vento/rajada dir | nuvens (baixas) | CAPE | HR | código');
    fc.hourly.filter((_, i) => i % 3 === 0).slice(0, 17).forEach((h) => {
        L.push(`${h.time.slice(5).replace('T', ' ')} | ${f1(h.temp)} [${f1(h.tempLo)}–${f1(h.tempHi)}] | ${f1(h.feels)} | ${f1(h.precip)} (${f0(h.pop)}%) | ${f0(h.wind)}/${f0(h.gust)} ${compass(h.dir) || ''} | ${f0(h.cloud)} (${f0(h.cloudLow)}) | ${f0(h.cape)} | ${f0(h.rh)} | ${h.code}`);
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
        L.push(`\n## Verificação local (últimos 7 dias, ${v.station}, ${v.distanceKm} km, previsões a 1 dia)`);
        L.push(v.models.map((m) => `${m.name}: erro médio ${m.mae}°C, viés ${m.bias} (n=${m.n})`).join('; ') + (v.biasApplied ? '. Viés corrigido nos modelos.' : '.'));
    }
    L.push('\n## Modelos lado a lado (máx/mín/chuva)');
    if (extra.perModel) L.push(extra.perModel);
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
