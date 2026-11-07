// Dados fictícios mas realistas (contrato docs/API.md) para desenvolver a interface sem rede.
// Só exporta funções: importar este módulo não faz nada.
const pad = (n) => String(n).padStart(2, '0');
const r1 = (v) => Math.round(v * 10) / 10;
const iso = (ms) => { const d = new Date(ms); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`; };
const rh = (t, td) => Math.round(100 * Math.exp((17.625 * td) / (243.04 + td)) / Math.exp((17.625 * t) / (243.04 + t)));

export const PLACES = [
  { name: 'Lisboa', admin1: 'Lisboa', country: 'Portugal', lat: 38.7223, lon: -9.1393, elevation: 66 },
  { name: 'Porto', admin1: 'Porto', country: 'Portugal', lat: 41.1496, lon: -8.611, elevation: 85 },
  { name: 'Ericeira', admin1: 'Lisboa', country: 'Portugal', lat: 38.9631, lon: -9.4151, elevation: 35 },
  { name: 'Sintra', admin1: 'Lisboa', country: 'Portugal', lat: 38.8029, lon: -9.3817, elevation: 200 },
  { name: 'Coimbra', admin1: 'Coimbra', country: 'Portugal', lat: 40.2033, lon: -8.4103, elevation: 75 },
  { name: 'Évora', admin1: 'Évora', country: 'Portugal', lat: 38.5714, lon: -7.9135, elevation: 300 },
  { name: 'Faro', admin1: 'Faro', country: 'Portugal', lat: 37.0194, lon: -7.9304, elevation: 8 },
  { name: 'Bragança', admin1: 'Bragança', country: 'Portugal', lat: 41.8061, lon: -6.7567, elevation: 690 },
  { name: 'Madrid', admin1: 'Madrid', country: 'Espanha', lat: 40.4168, lon: -3.7038, elevation: 667 },
];
const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const searchPlaces = (q) => PLACES.filter((p) => fold(p.name).includes(fold(q)) || fold(p.admin1).startsWith(fold(q)));

/** variante pelo sítio: Lisboa (completo), Porto (chuva, sem observação nem análise), Bragança (noite fria), Madrid (fora de PT) */
export function variantFor(lat, lon) {
  const near = (a, b) => Math.abs(lat - a) < 0.15 && Math.abs(lon - b) < 0.15;
  if (near(41.1496, -8.611)) return 'porto';
  if (near(41.8061, -6.7567)) return 'braganca';
  if (near(40.4168, -3.7038)) return 'madrid';
  return 'lisboa';
}

const MODELS = [
  ['meteofrance_seamless', 'Météo-France AROME/ARPEGE', 'Météo-France', 1.3, 1.5, 109, 0.9, -0.1],
  ['ecmwf_ifs', 'ECMWF IFS', 'ECMWF', 9, 1.6, 361, 1.1, -0.3],
  ['icon_seamless', 'DWD ICON', 'DWD', 7, 1.2, 181, 1.2, 0.4],
  ['ukmo_seamless', 'UK Met Office', 'Met Office', 10, 1.2, 169, 1.3, -0.5],
  ['ecmwf_aifs025_single', 'ECMWF AIFS (IA)', 'ECMWF', 28, 1.1, 372, 1.2, 0.2],
  ['gfs_seamless', 'NOAA GFS', 'NOAA', 13, 0.9, 384, 1.6, 0.8],
  ['gem_seamless', 'GEM Canadá', 'ECCC', 15, 0.8, 241, 1.7, -0.6],
  ['jma_seamless', 'JMA Japão', 'JMA', 55, 0.5, 270, 2.1, 0.9],
  ['cma_grapes_global', 'CMA GRAPES', 'CMA', 15, 0.5, 129, 2.3, -1.0],
].map(([id, name, org, resKm, weight, hours, mae, bias]) => ({ id, name, org, resKm, weight, hours, skill: { mae, bias, n: 120 } }));

const ENSEMBLE = {
  members: 212,
  models: [
    { id: 'ecmwf_ifs025', name: 'ECMWF ENS', members: 51, days: 15 },
    { id: 'ecmwf_aifs025', name: 'ECMWF AIFS ENS', members: 51, days: 15 },
    { id: 'icon_seamless', name: 'ICON-EPS', members: 40, days: 7 },
    { id: 'ncep_gefs_seamless', name: 'NOAA GEFS', members: 31, days: 16 },
    { id: 'gem_global', name: 'GEM ENS', members: 21, days: 16 },
    { id: 'ukmo_global_ensemble_20km', name: 'MOGREPS-G', members: 18, days: 10 },
  ],
};

// curva diária: −1 às 07h, +1 às 15h
const diurnal = (h) => (h >= 7 && h <= 15 ? -Math.cos((Math.PI * (h - 7)) / 8) : Math.cos((Math.PI * (((h - 15) + 24) % 24)) / 16));

function makeHourly(start, v) {
  const out = [];
  for (let i = 0; i < 72; i++) {
    const ms = start + i * 3600e3;
    const h = new Date(ms).getUTCHours();
    const day = Math.floor((i + new Date(start).getUTCHours()) / 24);
    const isDay = h >= 8 && h <= 17;
    let base = [15.0, 15.8, 14.4, 13.2][day] ?? 13, amp = [3.0, 2.8, 1.5, 3.0][day] ?? 3;
    if (v === 'braganca') { base = [7.5, 8.5, 9.0, 7.0][day] ?? 7; amp = [6.5, 5.5, 3.0, 5.0][day] ?? 5; }
    if (v === 'madrid') { base = [14.5, 15.5, 15.0, 13.0][day] ?? 13; amp = [5.5, 5.0, 3.5, 4.5][day] ?? 4; }
    let temp = base + amp * diurnal(h);
    if (day === 2 && h >= 12) temp -= 1.5;
    let precip = 0, pop = 5;
    const sunRain = day === 2 && h >= 4 && h <= 14 ? Math.exp(-((h - 9) ** 2) / (2 * 1.8 ** 2)) : 0;
    if (sunRain > 0.02) { precip = 6 * sunRain; pop = Math.round(72 + 24 * sunRain); }
    if (day === 1 && h >= 20) { precip = h >= 22 ? 0.2 : 0.1; pop = 25; }
    if (day === 3 && h >= 10 && h <= 15) { precip = [0.4, 1.2, 0.6, 1.4, 0.8, 0.3][h - 10]; pop = [42, 58, 50, 61, 52, 40][h - 10]; }
    if (v === 'porto' && i < 6) { precip = [0.6, 1.4, 2.2, 1.1, 0.5, 0.2][i]; pop = [80, 88, 92, 85, 70, 55][i]; }
    if (v === 'madrid') { precip = 0; pop = 3; }
    let wind = 11, gust = 22, dir = 80;
    if (day === 1) { const k = Math.min(1, (h + 1) / 24); wind = 12 + 12 * k; gust = wind * 1.8; dir = 120 + 70 * k; }
    if (day === 2) { const pk = Math.exp(-((h - 9) ** 2) / (2 * 3 ** 2)); wind = 20 + 12 * pk; gust = 38 + 17 * pk; dir = h < 11 ? 220 : 300; }
    if (day === 3) { wind = 18; gust = 34; dir = 320; }
    if (v === 'braganca') { wind = 4 + (isDay ? 6 : 0); gust = wind * 1.9; dir = 60; }
    let cloud = [25, 30][Math.min(day, 1)] ?? 0;
    if (day === 0) cloud = 25 + i;
    if (day === 1) cloud = 40 + (h / 23) * 45;
    if (day === 2) cloud = h <= 13 ? 100 : 60;
    if (day === 3) cloud = 50 + 20 * Math.sin(h);
    if (v === 'braganca' || v === 'madrid') cloud = v === 'madrid' ? 5 : (isDay ? 10 : 0);
    const pressure = i < 39 ? 1019.2 - (12.2 * i) / 39 : 1007 + (9 * (i - 39)) / 33;
    const fog = (v === 'lisboa' && day === 1 && h >= 6 && h <= 8) || (v === 'braganca' && day === 1 && h >= 5 && h <= 9);
    let dew = temp - (fog ? 0.3 : precip > 0.5 ? 0.6 : isDay ? 4.5 : 2.2);
    if (v === 'madrid') dew = temp - 9;
    const cape = day === 3 && h >= 10 && h <= 15 ? 300 + 220 * Math.sin((Math.PI * (h - 10)) / 5) : 40;
    const uvMax = v === 'braganca' ? 2.4 : [3.1, 2.6, 0.9, 2.7][day] ?? 2.5;
    const uv = isDay ? r1(Math.max(0, uvMax * Math.sin((Math.PI * (h - 8)) / 10))) : 0;
    const s = 0.4 + i * 0.022;
    let code = cloud < 20 ? 0 : cloud < 45 ? 1 : cloud < 75 ? 2 : 3;
    if (fog) code = 45;
    if (precip >= 4) code = 65; else if (precip >= 1.5) code = 63; else if (precip >= 0.3) code = day === 3 ? 81 : 61; else if (precip >= 0.1) code = 51;
    if (day === 3 && h === 13) code = 95;
    const T = r1(temp);
    out.push({
      time: iso(ms), temp: T, tempLo: r1(temp - s * 0.9), tempHi: r1(temp + s), feels: r1(temp - wind * 0.06 - (precip > 0 ? 0.6 : 0)),
      dew: r1(dew), rh: Math.min(100, rh(temp, dew)), precip: r1(precip), precipHi: r1(precip > 0 ? precip * 1.7 + (pop > 40 ? 0.4 : 0) : (day === 1 && h > 18 ? 0.6 : 0)),
      pop, wind: Math.round(wind), gust: Math.round(gust), dir: Math.round(dir), cloud: Math.round(cloud), cloudLow: Math.round(cloud * 0.4),
      pressure: r1(pressure), visibility: fog ? 800 : precip > 1 ? 7000 : 24000, cape: Math.round(cape), uv, code, isDay,
      spread: r1(s * 0.5), agree: day === 1 && h > 18 ? 0.6 : day === 3 && h >= 10 && h <= 15 ? 0.7 : 0.92,
    });
  }
  return out;
}

const DAYS = [
  [2, 18.2, 11.4, 0, 5, 0, 26, 12, 80, 3.1], [3, 18.6, 12.8, 0.2, 25, 0, 45, 24, 170, 2.6], [63, 16.4, 13.1, 14.2, 95, 55, 55, 32, 220, 0.9],
  [81, 15.9, 10.6, 3.1, 62, 6, 36, 20, 320, 2.7], [1, 16.8, 9.4, 0, 8, 0, 24, 14, 340, 3.0], [0, 17.9, 9.9, 0, 4, 0, 20, 10, 60, 3.0],
  [2, 18.3, 10.8, 0.4, 18, 0, 22, 12, 90, 2.8], [3, 17.6, 11.9, 1.6, 38, 8, 34, 18, 200, 2.4], [61, 16.9, 12.2, 3.8, 52, 14, 42, 22, 230, 1.8],
  [80, 16.2, 11.0, 2.4, 48, 10, 38, 20, 280, 2.2], [2, 16.5, 10.2, 0.8, 33, 4, 28, 15, 310, 2.6], [2, 16.9, 10.0, 0.6, 30, 3, 26, 14, 330, 2.6],
  [3, 16.4, 10.4, 1.2, 36, 6, 30, 16, 250, 2.3], [61, 15.8, 10.8, 2.6, 44, 9, 36, 19, 220, 2.0], [3, 15.9, 10.1, 1.4, 40, 7, 32, 17, 260, 2.2],
  [2, 16.2, 9.6, 0.9, 35, 5, 28, 15, 300, 2.4],
];
const CH_T = [0.3, -0.6, 1.8, -0.4, 0.2, 0.9, -2.1, 0.5, 1.2, -0.8];
const CH_P = [0, 3.4, -0.6, 0, 0, 0.3, 1.1, -2.0, 0.4, 0];

function makeDaily(startDayMs, v) {
  return DAYS.map(([code, tmax, tmin, precip, pop, popHeavy, gustMax, windMax, dir, uvMax], i) => {
    if (v === 'braganca') { tmax -= 4.5; tmin -= 9; }
    if (v === 'madrid') { tmax += 1.5; tmin -= 3.5; if (i < 3) { code = 0; precip = 0; pop = 3; popHeavy = 0; } }
    if (v === 'porto' && i === 0) { code = 61; precip = 6.2; pop = 92; }
    const sT = 0.5 + i * 0.25;
    const nT = 19.4 - i * 0.08;
    return {
      date: iso(startDayMs + i * 864e5).slice(0, 10), code, tmax: r1(tmax), tmin: r1(tmin),
      tmaxP10: r1(tmax - sT), tmaxP90: r1(tmax + sT * 1.1), tminP10: r1(tmin - sT * 1.1), tminP90: r1(tmin + sT),
      precip, precipP90: r1(precip * 1.6 + i * 0.4), pop, popHeavy, windMax, gustMax, dir, uvMax,
      sunrise: `07:${pad(23 + i)}`, sunset: `17:${pad(31 - i)}`,
      confidence: i <= 3 ? 'alta' : i <= 8 ? 'media' : 'baixa', confScore: r1(0.92 - i * 0.045), spread: r1(sT * 1.2),
      change24h: i >= 1 && i <= 10 ? { tmax: CH_T[i - 1], precip: CH_P[i - 1] } : null,
      normal: v === 'madrid' ? null : { tmax: r1(nT), tmin: r1(11.8 - i * 0.06) }, anomaly: v === 'madrid' ? null : r1(tmax - nT),
      source: i < 7 ? 'multimodelo' : 'ensemble',
    };
  });
}

export function mockForecast({ lat = 38.7223, lon = -9.1393, name } = {}) {
  const v = variantFor(lat, lon);
  const place = { lisboa: PLACES[0], porto: PLACES[1], braganca: PLACES[7], madrid: PLACES[8] }[v];
  const hourStart = v === 'braganca' ? Date.UTC(2026, 10, 6, 23) : Date.UTC(2026, 10, 6, 15);
  const hourly = makeHourly(hourStart, v);
  const daily = makeDaily(Date.UTC(2026, 10, 6), v);
  const h0 = hourly[0];
  const tz = v === 'madrid' ? { timezone: 'Europe/Madrid', utcOffsetSeconds: 3600 } : { timezone: 'Europe/Lisbon', utcOffsetSeconds: 0 };
  const obs = v === 'lisboa'
    ? { source: 'IPMA', station: 'Lisboa (Geofísico)', distanceKm: 2.1, time: '2026-11-06T15:00', ageMin: 40, temp: 17.6, rh: 66, wind: 9, gust: null, dir: 90, pressure: 1019.0, precip1h: 0 }
    : v === 'madrid' ? { source: 'METAR', station: 'Madrid-Barajas (LEMD)', distanceKm: 12.4, time: '2026-11-06T15:30', ageMin: 20, temp: 19.0, rh: 38, wind: 13, gust: null, dir: 40, pressure: 1022, precip1h: 0 }
      : v === 'braganca' ? { source: 'IPMA', station: 'Bragança', distanceKm: 1.2, time: '2026-11-06T23:00', ageMin: 25, temp: 1.6, rh: 93, wind: 2, gust: null, dir: 60, pressure: 1021, precip1h: 0 } : null;
  if (v === 'porto') { h0.code = 61; h0.precip = 0.6; h0.pop = 80; h0.cloud = 100; }
  const now = {
    time: h0.time, temp: h0.temp, feels: h0.feels, dew: h0.dew, rh: h0.rh, wind: h0.wind, gust: h0.gust, dir: h0.dir,
    pressure: h0.pressure, pressureTrend3h: -0.8, cloud: h0.cloud, precip: h0.precip, code: h0.code, isDay: h0.isDay, uv: h0.uv, visibility: h0.visibility,
    obs, correction: obs ? { temp: v === 'braganca' ? -0.9 : -0.4, dew: 0.3, decayHours: 6 } : null,
  };
  const ncRain = v === 'porto' ? [0.4, 0.6, 0.8, 0.5, 0.3, 0.2, 0.1, 0] : [0, 0, 0, 0, 0, 0, 0, 0];
  // radar no ponto (RainViewer): no Porto chove há 30 min; em Lisboa nada até 40 km; em Bragança e Madrid sem radar
  const radarOn = v === 'porto' || v === 'lisboa';
  const radar = radarOn ? {
    source: 'RainViewer', time: '2026-11-06T15:30', ageMin: 10, fresh: true, frames: 13, stepMin: 10, kmPx: v === 'porto' ? 0.92 : 0.95, covered: true,
    atPoint: v === 'porto' ? { mmh: 0.6, dbz: 19, wet: 0.89, raining: true, label: 'fraca', trend: 'estável' } : { mmh: 0, dbz: null, wet: 0, raining: false, label: null, trend: null },
    last2h: Array.from({ length: 13 }, (_, i) => ({ time: iso(Date.UTC(2026, 10, 6, 13, 30) + i * 10 * 60e3), mmh: v === 'porto' && i >= 10 ? 0.6 : 0 })),
    rings: [5, 15, 30, 60].map((km, i) => ({ km, wet: v === 'porto' ? [0.9, 0.7, 0.4, 0.2][i] : 0, max: v === 'porto' ? [0.9, 2.1, 6.3, 11.5][i] : 0 })),
    nearest: null, motion: v === 'porto' ? { speedKmh: 32, deg: 50, toDir: 'NE', fromDir: 'SO', corr: 0.78, used: true } : null, approach: null,
    ends: v === 'porto' ? { etaMin: 75, time: '2026-11-06T17:00' } : null, fixedKm2: 0,
    compare: v === 'porto' ? { radar: '2026-11-06T15:10', models: '2026-11-06T15:15', modelsNow: true, lagMin: null, text: 'Radar e modelos de acordo: chove agora no ponto (no radar desde as 15:10).' }
      : { radar: null, models: null, modelsNow: false, lagMin: null, text: 'Radar e modelos de acordo: sem chuva.' },
    text: v === 'porto' ? 'A chover agora (fraca, 0,6 mm/h); pelo deslocamento dos ecos deve parar por volta das 17:00.' : 'Sem chuva no radar até 40 km.',
  } : null;
  const nowcast = {
    steps: ncRain.map((p, i) => ({ time: iso(hourStart + (i + 1) * 15 * 60e3), precip: p })),
    text: v === 'porto' ? 'A chover agora (fraca, 0,6 mm/h); deve parar por volta das 17:00.' : v === 'lisboa' ? 'Sem chuva no radar até 40 km; sem chuva prevista nas próximas 2 horas.' : 'Sem chuva nas próximas 2 horas.',
    ...(radarOn ? { source: 'radar+modelos' } : {}),
  };
  const lvl = (level, label, peak, text) => ({ level, label, peak, text });
  const indicators = v === 'braganca'
    ? { thunder: lvl(0, 'nenhum', null, ''), fog: lvl(2, 'moderado', '2026-11-07T07:00', 'Nevoeiro no vale ao amanhecer'), frost: lvl(3, 'elevado', '2026-11-07T07:00', 'Mínima de −1 °C com céu limpo e vento fraco'), heat: lvl(0, 'nenhum', null, ''), wind: lvl(0, 'nenhum', null, ''), rain: lvl(1, 'baixo', '2026-11-08T10:00', 'Até 2 mm/h'), snow: lvl(0, 'nenhum', null, ''), uv: lvl(1, 'baixo', '2026-11-07T13:00', 'UV máx. 2'), pressure: { trend: 'estável', delta3h: 0.2, delta24h: -2.1 }, predictability: { days: 8, text: 'Fiável até sábado (14 nov)' }, agreement: 0.88 }
    : {
      thunder: lvl(1, 'baixo', '2026-11-09T13:00', 'CAPE até 520 J/kg na segunda à tarde'),
      fog: lvl(v === 'lisboa' ? 2 : 0, v === 'lisboa' ? 'moderado' : 'nenhum', v === 'lisboa' ? '2026-11-07T07:00' : null, v === 'lisboa' ? 'Visibilidade até 800 m ao amanhecer' : ''),
      frost: lvl(0, 'nenhum', null, ''), heat: lvl(0, 'nenhum', null, ''),
      wind: lvl(2, 'moderado', '2026-11-08T09:00', 'Rajadas até 55 km/h'),
      rain: lvl(v === 'madrid' ? 0 : 2, v === 'madrid' ? 'nenhum' : 'moderado', v === 'madrid' ? null : '2026-11-08T09:00', v === 'madrid' ? '' : 'Até 6 mm/h'),
      snow: lvl(0, 'nenhum', null, ''), uv: lvl(1, 'baixo', '2026-11-06T13:00', 'UV máx. 3'),
      pressure: { trend: 'a descer', delta3h: -1.2, delta24h: -5.0 }, predictability: { days: 7, text: 'Fiável até sexta-feira (13 nov)' }, agreement: 0.82,
    };
  const warnings = v === 'lisboa' ? [
    { source: 'IPMA', type: 'Agitação Marítima', level: 'yellow', start: '2026-11-07T18:00', end: '2026-11-08T21:00', text: 'Ondas de oeste/noroeste com 4 a 5 metros na costa ocidental.' },
    { source: 'IPMA', type: 'Vento', level: 'orange', start: '2026-11-08T06:00', end: '2026-11-08T15:00', text: 'Vento do quadrante sul, com rajadas até 80 km/h no litoral e nas terras altas.' },
  ] : [];
  const fire = {
    risk: v === 'madrid' ? null : { today: v === 'braganca' ? 1 : v === 'porto' ? 1 : 2, tomorrow: 1, label: v === 'lisboa' ? 'Moderado' : 'Reduzido', labelTomorrow: 'Reduzido', concelho: place.name, dico: '1106' },
    hotspots: v === 'lisboa' ? { count: 2, radiusKm: 50, nearestKm: 18.4, items: [
      { lat: 38.88, lon: -9.31, distanceKm: 18.4, bearing: 'NO', frp: 12.5, time: '2026-11-06T13:42', sat: 'VIIRS NOAA-20', confidence: 'nominal' },
      { lat: 38.79, lon: -8.66, distanceKm: 41.3, bearing: 'E', frp: 4.1, time: '2026-11-06T02:10', sat: 'VIIRS S-NPP', confidence: 'baixa' }] }
      : { count: 0, radiusKm: 50, nearestKm: null, items: [] },
    incidents: v === 'lisboa' ? { count: 1, radiusKm: 50, items: [
      { id: '20261576011', natureza: 'Mato', status: 'Em Curso', distanceKm: 22.0, bearing: 'N', man: 24, terrain: 7, aerial: 1, time: '2026-11-06T15:20', location: 'Mafra, Ericeira' }] }
      : { count: 0, radiusKm: 50, items: [] },
    rule30: { hours: 0, first: null, text: 'Regra 30-30-30 não atingida nas próximas 72 h' },
    spread: { dir: h0.dir, wind: h0.wind, gust: h0.gust, rh: h0.rh, text: v === 'braganca' ? 'Vento muito fraco e humidade alta' : 'Vento fraco de leste; humidade moderada' },
  };
  return {
    v: 1, generatedAt: v === 'braganca' ? '2026-11-06T23:20:00Z' : '2026-11-06T15:40:00Z',
    location: { lat, lon, elevation: place.elevation, ...tz, name: name || place.name, region: place.admin1, country: v === 'madrid' ? 'ES' : 'PT' },
    models: v === 'madrid' ? MODELS.slice(1, 8) : MODELS, ensemble: ENSEMBLE, now, nowcast, radar, hourly, daily, indicators, warnings, fire,
    verification: v === 'lisboa' ? { station: 'Lisboa (Geofísico)', days: 7, n: 120, best: 'meteofrance_seamless', models: MODELS.map((m) => ({ id: m.id, mae: m.skill.mae, bias: m.skill.bias })) } : null,
    analysis: v === 'lisboa' ? { available: true, ageMin: 140, placeId: 'lisboa' } : { available: false, ageMin: null, placeId: null },
    sources: ['Open-Meteo (CC BY 4.0)', 'IPMA', 'NOAA AWC (METAR)', ...(radarOn ? ['RainViewer (radar)'] : []), 'NASA FIRMS', 'ANEPC via fogos.pt', 'EUMETSAT'],
  };
}

export const MOCK_ANALYSIS = {
  generatedAt: '2026-11-06T13:20:00Z', by: 'claude-agendado', model: 'claude',
  place: { id: 'lisboa', name: 'Lisboa', lat: 38.7223, lon: -9.1393 },
  titulo: 'Tarde amena; frente fria traz chuva forte e vento no domingo de manhã',
  resumo: 'Sexta-feira termina com céu pouco nublado e vento fraco de leste. No sábado o vento roda para sul e as nuvens aumentam com a aproximação de uma superfície frontal fria, que atravessa Lisboa no domingo entre as 6h e as 12h com chuva por vezes forte (até 6 mm/h) e rajadas de 50 a 55 km/h. Segunda-feira fica mais fresca, com aguaceiros e possibilidade de trovoada isolada à tarde. A partir de terça volta o tempo seco.',
  agora: 'Até às 21h: céu pouco nublado, 18 °C a descer para 14 °C ao anoitecer. Vento fraco de leste (10 km/h). Sem chuva.',
  hoje: 'Resto do dia agradável, com a máxima de 18 °C já atingida. Noite com 12 a 13 °C e algumas nuvens altas a partir da meia-noite.',
  amanha: 'Sábado com nebulosidade a aumentar e vento de sul a intensificar-se à tarde (rajadas até 45 km/h). Nevoeiro possível ao amanhecer junto ao rio. Chuvisco fraco a partir das 21h.',
  dias: [
    { data: '2026-11-08', texto: 'Chuva forte entre as 6h e as 12h (10 a 20 mm) com rajadas de 55 km/h; tarde com abertas e mais fresco.', confianca: 'alta' },
    { data: '2026-11-09', texto: 'Aguaceiros à tarde, por vezes fortes, com trovoada isolada. Máxima de 16 °C.', confianca: 'alta' },
    { data: '2026-11-10', texto: 'Céu pouco nublado e seco. Manhã fresca (9 °C).', confianca: 'media' },
    { data: '2026-11-11', texto: 'Sol e temperaturas a subir ligeiramente.', confianca: 'media' },
  ],
  tendencia: 'Da próxima sexta em diante, metade dos cenários do ensemble traz nova perturbação atlântica com chuva moderada; a outra metade mantém o anticiclone. Temperaturas perto do normal para a época.',
  alertas: [
    { tipo: 'chuva', nivel: 'amarelo', quando: 'dom 06h–12h', texto: 'Chuva por vezes forte à passagem da frente.' },
    { tipo: 'vento', nivel: 'laranja', quando: 'dom 06h–15h', texto: 'Rajadas de 55 km/h na cidade, até 80 km/h no litoral.' },
    { tipo: 'mar', nivel: 'amarelo', quando: 'sáb 18h – dom 21h', texto: 'Ondas de 4 a 5 m na costa ocidental.' },
    { tipo: 'nevoeiro', nivel: 'info', quando: 'sáb 06h–09h', texto: 'Visibilidade reduzida junto ao Tejo.' },
  ],
  incendios: 'Risco de incêndio moderado hoje e reduzido amanhã. O satélite detetou 2 focos de calor nas últimas 24 h (o mais próximo a 18 km para noroeste, fraco) e há uma ocorrência de mato em curso em Mafra com 24 operacionais. A humidade a subir e a chuva de domingo limitam a propagação.',
  satelite: 'A imagem Meteosat mostra uma banda de nebulosidade frontal a cerca de 900 km a oeste, orientada de norte para sul, com topos frios a norte dos Açores. Sem relâmpagos perto do continente.',
  conselhos: ['Domingo de manhã: guarda-chuva e casaco impermeável.', 'Prende objetos soltos em varandas antes de sábado à noite.', 'Evita a orla costeira no domingo: ondas de 4 a 5 m.', 'Terça e quarta são os melhores dias para atividades ao ar livre.'],
  fiabilidade: { curto: 'alta', medio: 'media', texto: 'Os 9 modelos concordam na passagem da frente no domingo (diferença de ±2 h na hora de chegada); a quantidade de chuva varia entre 8 e 20 mm. Depois de quarta-feira os ensembles divergem.' },
  tecnica: 'Uma depressão profunda (980 hPa) a oeste da Irlanda arrasta uma superfície frontal fria que atravessa a Península no domingo. Antes dela, o fluxo roda de leste para sul, com advecção de ar quente e húmido (ponto de orvalho de 13 a 14 °C). A frente está bem definida nos modelos de alta resolução (AROME 1,3 km), com uma linha de precipitação mais intensa à passagem. Depois entra ar polar marítimo, mais fresco e instável (CAPE de 300 a 500 J/kg na segunda à tarde), com aguaceiros dispersos. A crista anticiclónica regressa a partir de terça.',
  verificacao: 'A previsão das 07:12 acertou a máxima (prevista 18 °C, observada 18,4 °C) e a ausência de chuva.',
};
