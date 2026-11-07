// Aprendizagem acumulada: cada modelo é verificado no ponto, dia a dia, em três variáveis (temperatura, horas de
// chuva, vento) e três prazos (hoje < 24 h, amanhã 24–48 h, 3+ dias ≥ 48 h). A memória guarda até 90 dias e os dias
// recentes pesam mais (meia-vida de 21 dias). O peso de cada modelo cresce com os dias em que acerta mais do que os
// outros e desce quando falha. Funções puras: correm no telemóvel (PWA) e no Node (tarefa agendada).
import { isNum, clamp, wmedian } from './stats.js';

export const LEARN = {
    keepDays: 90, halfLife: 21, gamma: 3, fMin: 0.25, fMax: 4, maxKm: 3,
    n0: { t: 3, r: 8, w: 3 }, // dias de prova para o peso chegar a meio caminho (a chuva é mais irregular: mais dias)
    ratio: [1 / 3, 2], // erro mediano / erro do modelo, limitado (um modelo perfeito em poucas horas não dispara)
    full: { t: 18, r: 6, w: 18 }, // horas (chuva: horas com chuva) para um dia contar inteiro
    floor: { t: 0.3, r: 0.05, w: 1 }, // erro mínimo considerado (°C, fração de horas, km/h)
};
export const LVARS = { t: 'Temperatura', r: 'Chuva', w: 'Vento' };
export const LEADS = ['hoje', 'amanhã', '3+ dias'];
const VARS = ['t', 'r', 'w'];
const SUF = ['', '_previous_day1', '_previous_day2'];
const HV = { t: 'temperature_2m', r: 'precipitation', w: 'wind_speed_10m' };
const WET_MM = 0.1;
const WET_REPORT = new Set(['chuva', 'chuva-forte', 'granizo', 'trovoada']);
const LAPSE = 0.0065;
const DAY = 864e5, HOUR = 36e5;
const localToMs = (iso, off) => Date.parse(iso.length === 16 ? iso + ':00Z' : iso + 'Z') - off * 1000;
const dateDiff = (a, b) => Math.round((Date.parse(a + 'T00:00:00Z') - Date.parse(b + 'T00:00:00Z')) / DAY);
const rd = (x, d = 2) => (isNum(x) ? Math.round(x * 10 ** d) / 10 ** d : null);
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);

/** Chuva no METAR (tempo presente): chuva, chuvisco, neve, granizo, aguaceiros — não conta "VC" (nas proximidades). */
export function metarWet(wx) {
    if (typeof wx !== 'string' || !wx.trim()) return false;
    return wx.trim().split(/\s+/).some((g) => !g.startsWith('VC') && /^[-+]?(TS|SH|FZ)?(RA|DZ|SN|GR|GS|PL|SG|UP)/.test(g));
}

/**
 * Observações de uma estação → horas (número da hora UTC = ms / 3 600 000).
 * Temperatura e vento: o valor mais perto da hora certa (≤ 20 min). Chuva: a hora T cobre (T − 1 h, T], como o
 * Open-Meteo; IPMA = precipitação da hora ≥ 0,1 mm; METAR = tempo presente (wet) em algum relatório dessa hora.
 * @param {Array<{ms:number, temp?:number, wind?:number, precip1h?:number, wet?:boolean}>} series
 */
export function hourlyObs(series, { adjT = 0 } = {}) {
    const out = new Map();
    const at = (h) => { let o = out.get(h); if (!o) out.set(h, (o = { t: null, w: null, wet: null, dt: Infinity })); return o; };
    for (const s of Array.isArray(series) ? series : []) {
        if (!s || !isNum(s.ms)) continue;
        const h = Math.round(s.ms / HOUR), d = Math.abs(s.ms - h * HOUR);
        if (d <= 20 * 6e4) {
            const o = at(h);
            if (d < o.dt && (isNum(s.temp) || isNum(s.wind))) {
                o.dt = d;
                if (isNum(s.temp)) o.t = s.temp + adjT;
                if (isNum(s.wind)) o.w = s.wind;
            }
        }
        if (isNum(s.precip1h) && s.precip1h >= 0 && d <= 5 * 6e4) at(h).wet = s.precip1h >= WET_MM;
        else if (typeof s.wet === 'boolean') {
            const o = at(Math.ceil(s.ms / HOUR - 1e-9));
            o.wet = o.wet === true || s.wet;
        }
    }
    return out;
}

/** Avisos do utilizador («Está a chover?») → horas com chuva / sem chuva no próprio ponto. */
export function reportObs(reports, { maxKm = 3 } = {}) {
    const out = new Map();
    for (const r of Array.isArray(reports) ? reports : []) {
        const ms = Date.parse(r?.time);
        if (!isNum(ms) || (isNum(r.distanceKm) && r.distanceKm > maxKm)) continue;
        const wet = WET_REPORT.has(r.kind) ? true : r.kind === 'nao-chove' ? false : null;
        if (wet == null) continue;
        const h = Math.ceil(ms / HOUR - 1e-9), o = out.get(h);
        out.set(h, { t: null, w: null, wet: o?.wet === true || wet });
    }
    return out;
}

const modelIds = (H) => {
    const ids = new Set();
    for (const k of Object.keys(H)) {
        const m = /^(?:temperature_2m|precipitation|wind_speed_10m)(?:_previous_day\d)?_(.+)$/.exec(k);
        if (m && !m[1].startsWith('previous_day')) ids.add(m[1]);
    }
    return [...ids];
};

/**
 * Verificação dia a dia de cada modelo contra as observações de uma estação (ou dos avisos no ponto).
 * Vento (e temperatura numa estação pouco representativa, centerT): erro médio depois de tirar o erro comum a todos os
 * modelos nesse dia — a exposição e o sítio da estação não decidem quem é melhor; o viés guardado é o bruto. Temperatura
 * numa estação representativa: erro bruto (já ajustado à altitude do ponto). Chuva: nas horas com chuva observada ou prevista,
 * falhas (chuva sem previsão a ±1 h) e falsos alarmes (previsão sem chuva a ±1 h); o viés é horas previstas − observadas.
 * @returns {Object<string, Object<string, {t:Array, r:Array, w:Array, g:Array}>>|null} dia → modelo → estatísticas
 */
export function scoreDays(prev, obs, { nowMs = Date.now(), vars = 'trw', centerT = false } = {}) {
    const H = prev?.hourly;
    if (!H?.time?.length || !obs?.size) return null;
    const off = prev.utc_offset_seconds || 0;
    const idx = [];
    for (let i = 0; i < H.time.length; i++) {
        const ms = localToMs(H.time[i], off);
        if (ms <= nowMs) idx.push({ i, h: Math.round(ms / HOUR), date: H.time[i].slice(0, 10) });
    }
    if (!idx.length) return null;
    const ids = modelIds(H);
    const days = {};
    const put = (date, id, v, L, val) => {
        const d = (days[date] ||= {}), m = (d[id] ||= { t: [null, null, null], r: [null, null, null], w: [null, null, null], g: [null, null, null] });
        m[v][L] = val;
    };
    const byDate = new Map();
    for (const x of idx) { if (!byDate.has(x.date)) byDate.set(x.date, []); byDate.get(x.date).push(x); }
    for (const v of ['t', 'w']) {
        if (!vars.includes(v)) continue;
        for (let L = 0; L < 3; L++) {
            const cols = ids.map((id) => [id, H[`${HV[v]}${SUF[L]}_${id}`]]).filter(([, a]) => Array.isArray(a));
            for (const [date, xs] of byDate) {
                const errs = cols.map(([id, a]) => [id, xs.map((x) => { const o = obs.get(x.h)?.[v]; return isNum(a[x.i]) && isNum(o) ? a[x.i] - o : null; }).filter(isNum)]);
                const biases = errs.filter(([, e]) => e.length >= 6).map(([, e]) => mean(e));
                if (!biases.length) continue;
                const common = v === 'w' || centerT ? wmedian(biases) : 0;
                for (const [id, e] of errs) {
                    if (e.length < 3) continue;
                    put(date, id, v, L, [e.length, rd(mean(e.map((x) => Math.abs(x - common))), 1), rd(mean(e), 1)]);
                }
            }
        }
    }
    if (vars.includes('r')) {
        const O = idx.map((x) => obs.get(x.h)?.wet ?? null);
        const hasWet = O.some((o) => o === true);
        for (let L = 0; L < 3; L++) {
            const cols = ids.map((id) => [id, H[`${HV.r}${SUF[L]}_${id}`]]).filter(([, a]) => Array.isArray(a))
                .map(([id, a]) => [id, idx.map((x) => (isNum(a[x.i]) ? a[x.i] >= WET_MM : null))]);
            if (!cols.length) continue;
            const ev = O.map((o, k) => o != null && (o === true || cols.some(([, F]) => F[k] === true)));
            for (const [id, F] of cols) {
                const acc = new Map();
                for (let k = 0; k < idx.length; k++) {
                    if (!ev[k] || F[k] == null) continue;
                    const err = O[k] ? !(F[k - 1] || F[k] || F[k + 1]) : F[k] && !(O[k - 1] === true || O[k + 1] === true);
                    const a = acc.get(idx[k].date) || { n: 0, e: 0, f: 0, o: 0 };
                    a.n++; a.e += err ? 1 : 0; a.f += F[k] ? 1 : 0; a.o += O[k] ? 1 : 0;
                    acc.set(idx[k].date, a);
                }
                for (const [date, a] of acc) put(date, id, 'r', L, [a.n, rd(a.e / a.n), rd((a.f - a.o) / a.n)]);
                // atraso típico da chuva neste dia (−3 a +3 h; positivo = o modelo chega tarde)
                if (!hasWet) continue;
                for (const [date, xs] of byDate) {
                    const ks = xs.map((x) => idx.indexOf(x));
                    if (ks.filter((k) => O[k] === true).length < 3) continue;
                    let best = null, bestM = 0;
                    for (const lag of [0, 1, -1, 2, -2, 3, -3]) {
                        let m = 0;
                        for (const k of ks) if (O[k] === true && F[k + lag] === true) m++;
                        if (m > bestM) { bestM = m; best = lag; }
                    }
                    if (best != null) put(date, id, 'g', L, best);
                }
            }
        }
    }
    return Object.keys(days).length ? days : null;
}

/** Junta a verificação de várias estações (peso × horas de cada uma). parts: [{ w, days }] */
export function combineDays(parts) {
    const out = {};
    const ok = parts.filter((p) => p?.days && p.w > 0);
    const dates = new Set(ok.flatMap((p) => Object.keys(p.days)));
    for (const date of dates) {
        const ids = new Set(ok.flatMap((p) => Object.keys(p.days[date] || {})));
        for (const id of ids) {
            const rec = { t: [null, null, null], r: [null, null, null], w: [null, null, null], g: [null, null, null] };
            let any = false;
            for (const v of VARS) for (let L = 0; L < 3; L++) {
                let su = 0, sm = 0, sb = 0, nMax = 0;
                for (const p of ok) {
                    const s = p.days[date]?.[id]?.[v]?.[L];
                    if (!s || !(s[0] > 0)) continue;
                    const u = p.w * s[0];
                    su += u; sm += u * s[1]; sb += u * s[2]; nMax = Math.max(nMax, s[0]);
                }
                if (su > 0) { rec[v][L] = [nMax, rd(sm / su, v === 'r' ? 2 : 1), rd(sb / su, v === 'r' ? 2 : 1)]; any = true; }
            }
            for (let L = 0; L < 3; L++) {
                let sw = 0, sg = 0;
                for (const p of ok) { const g = p.days[date]?.[id]?.g?.[L]; if (isNum(g)) { sw += p.w; sg += p.w * g; } }
                if (sw > 0) rec.g[L] = rd(sg / sw, 1);
            }
            // sem as listas vazias (a memória fica mais pequena)
            for (const k of Object.keys(rec)) if (rec[k].every((x) => x == null)) delete rec[k];
            if (any) (out[date] ||= {})[id] = rec;
        }
    }
    return Object.keys(out).length ? out : null;
}

/**
 * Verificação da janela atual (as corridas anteriores dão ~7 dias) em várias estações e nos avisos do utilizador.
 * stations: [{ w, series, adjT, centerT?, rainOnly? }] · reports: avisos perto do ponto · devolve dia → { h, hr, src, m } ou null
 */
export function learnWindow(prev, { stations = [], reports = [], nowMs = Date.now(), src = null } = {}) {
    const parts = [];
    for (const s of stations) {
        const days = scoreDays(prev, hourlyObs(s.series, { adjT: s.adjT || 0 }), { nowMs, vars: s.rainOnly ? 'r' : 'trw', centerT: !!s.centerT });
        if (days) parts.push({ w: s.w, days });
    }
    const rep = reportObs(reports);
    if (rep.size) {
        const days = scoreDays(prev, rep, { nowMs, vars: 'r' });
        if (days) parts.push({ w: 2 * Math.max(0.01, ...stations.map((s) => s.w || 0)), days });
    }
    const days = combineDays(parts);
    if (!days) return null;
    const out = {};
    for (const [date, ms] of Object.entries(days)) {
        const recs = Object.values(ms);
        const h = Math.max(0, ...recs.flatMap((m) => (m.t || []).map((s) => s?.[0] || 0)));
        const hr = Math.max(0, ...recs.flatMap((m) => (m.r || []).map((s) => s?.[0] || 0)));
        out[date] = { h, hr, ...(src ? { src } : {}), m: ms };
    }
    return out;
}

const km = (a, b, c, d) => {
    const R = 6371, toR = Math.PI / 180, dLat = (c - a) * toR, dLon = (d - b) * toR;
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(a * toR) * Math.cos(c * toR) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
};
const better = (a, b) => !b || a.h > b.h || (a.h === b.h && (a.hr || 0) >= (b.hr || 0));

/**
 * Junta memórias (a guardada e as novas: janela atual, a do conector). Dia a dia fica a mais completa; mais de
 * 90 dias sai. Uma memória de outro ponto (> 3 km) é ignorada.
 * @returns {{v:1, lat:number, lon:number, updated:string, days:Object}}
 */
export function mergeMemory(base, adds, { lat, lon, today, keepDays = LEARN.keepDays, maxKm = LEARN.maxKm, now = Date.now() } = {}) {
    const near = (m) => m && m.days && (!isNum(lat) || !isNum(m.lat) || km(lat, lon, m.lat, m.lon) <= maxKm);
    const days = {};
    const lists = [base, ...(Array.isArray(adds) ? adds : [adds])].map((x) => (x && !x.days && !x.v ? { days: x } : x)).filter(near);
    for (const m of lists) for (const [date, d] of Object.entries(m.days)) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !d?.m) continue;
        if (today && (dateDiff(today, date) >= keepDays || dateDiff(today, date) < 0)) continue;
        if (better(d, days[date])) days[date] = d;
    }
    const sorted = Object.fromEntries(Object.entries(days).sort(([a], [b]) => a.localeCompare(b)));
    // fica ancorada onde nasceu (um ponto a mais de 3 km começa outra memória)
    const anchor = base && near(base) && isNum(base.lat) && isNum(base.lon) ? base : { lat: isNum(lat) ? lat : null, lon: isNum(lon) ? lon : null };
    return { v: 1, lat: anchor.lat, lon: anchor.lon, updated: new Date(now).toISOString(), days: sorted };
}

/** Erro acumulado de cada modelo (dias recentes pesam mais): modelo → variável → prazo → { mae, bias, nEff, days, lag } */
export function skillOf(memory, { today, halfLife = LEARN.halfLife, upTo = null } = {}) {
    const out = {};
    const dates = Object.keys(memory?.days || {}).filter((d) => (!upTo || d <= upTo) && (!today || d <= today));
    const ref = upTo || today || dates[dates.length - 1];
    for (const date of dates) {
        const r = 0.5 ** (Math.max(0, dateDiff(ref, date)) / halfLife);
        for (const [id, m] of Object.entries(memory.days[date].m || {})) {
            const o = (out[id] ||= {});
            for (const v of VARS) for (let L = 0; L < 3; L++) {
                const s = m[v]?.[L];
                if (!s || !(s[0] > 0) || !isNum(s[1])) continue;
                const a = ((o[v] ||= [null, null, null])[L] ||= { su: 0, sm: 0, sb: 0, nEff: 0, days: 0, sg: 0, sgw: 0 });
                const u = r * s[0];
                a.su += u; a.sm += u * s[1]; a.sb += u * (s[2] || 0); a.nEff += r * Math.min(1, s[0] / LEARN.full[v]); a.days++;
                if (v === 'r' && isNum(m.g?.[L])) { a.sg += r * m.g[L]; a.sgw += r; }
            }
        }
    }
    for (const o of Object.values(out)) for (const v of VARS) o[v] = (o[v] || [null, null, null]).map((a) => (a && a.su > 0
        ? { mae: a.sm / a.su, bias: a.sb / a.su, nEff: a.nEff, days: a.days, lag: a.sgw >= 1.5 ? a.sg / a.sgw : null } : null));
    return out;
}

/**
 * Fatores de peso por variável e prazo: (erro mediano / erro do modelo)^3, com força que cresce com os dias de prova
 * (n / (n + n0)) — o modelo que acerta mais ganha peso a cada dia que passa; o que falha perde. A chuva e o vento partem
 * do fator da temperatura e afastam-se dele com a sua própria prova; um modelo sem verificação quando os outros a têm
 * fica com 0,7.
 * ids: modelos em uso · official: ids que mantêm o peso oficial quando não há verificação (IPMA)
 */
export function factorsOf(skill, ids, { official = ['ipma'] } = {}) {
    const fx = Object.fromEntries(ids.map((id) => [id, { t: [1, 1, 1], r: [1, 1, 1], w: [1, 1, 1] }]));
    const ref = {};
    for (const v of VARS) {
        ref[v] = [0, 1, 2].map((L) => {
            const maes = ids.filter((id) => !official.includes(id)).map((id) => skill?.[id]?.[v]?.[L]).filter((s) => s && s.nEff > 0).map((s) => s.mae);
            return maes.length ? wmedian(maes) : null;
        });
        for (const id of ids) {
            const raw = [0, 1, 2].map((L) => {
                const s = skill?.[id]?.[v]?.[L], med = ref[v][L];
                const prior = v === 't' ? 1 : fx[id].t[L];
                if (!s || !(s.nEff > 0) || !isNum(med)) return null;
                const lam = s.nEff / (s.nEff + LEARN.n0[v]);
                const data = clamp(Math.max(med, LEARN.floor[v]) / Math.max(s.mae, LEARN.floor[v]), ...LEARN.ratio) ** LEARN.gamma;
                return clamp(prior ** (1 - lam) * data ** lam, LEARN.fMin, LEARN.fMax);
            });
            const others = ref[v].some(isNum);
            fx[id][v] = raw.map((f, L) => {
                if (isNum(f)) return f;
                // prazo sem verificação: o mais perto com verificação (a meio caminho de 1); sem nenhuma, o ponto de partida
                const near = [L - 1, L + 1, L - 2, L + 2].map((k) => raw[k]).find(isNum);
                if (isNum(near)) return official.includes(id) ? near : Math.sqrt(near);
                const prior = v === 't' ? 1 : fx[id].t[L];
                return v === 't' && others && !official.includes(id) ? 0.7 : prior;
            });
        }
    }
    return { fx, ref };
}

/** Fator para uma antecedência em horas (entre prazos, transição suave; depois de 3 dias perde força até metade). */
export function factorAt(arr, leadH) {
    if (!Array.isArray(arr)) return 1;
    const g = (a, b, x) => a ** (1 - x) * b ** x;
    const L = Math.max(0, leadH ?? 0);
    if (L <= 12) return arr[0];
    if (L <= 36) return g(arr[0], arr[1], (L - 12) / 24);
    if (L <= 60) return g(arr[1], arr[2], (L - 36) / 24);
    return arr[2] ** clamp(1 - (L - 60) / 360, 0.5, 1);
}

/** Dias na memória com verificação (temperatura) e o primeiro. */
export function memoryInfo(memory) {
    const dates = Object.keys(memory?.days || {}).filter((d) => memory.days[d].h > 0 || memory.days[d].hr > 0).sort();
    return { days: dates.length, since: dates[0] || null, rainDays: dates.filter((d) => memory.days[d].hr > 0).length };
}

/** Evolução do peso (fator) de cada modelo dia a dia, para o gráfico da app: [{ date, f: { id: fator } }] */
export function learnHistory(memory, ids, { v = 't', lead = 1 } = {}) {
    const dates = Object.keys(memory?.days || {}).filter((d) => memory.days[d].h > 0 || memory.days[d].hr > 0).sort();
    return dates.map((date) => {
        const { fx } = factorsOf(skillOf(memory, { upTo: date }), ids);
        return { date, f: Object.fromEntries(ids.map((id) => [id, rd(fx[id][v][lead])])) };
    });
}
