// Catálogo de modelos e pedidos às fontes de dados.
// Partilhado pelo browser (PWA), pelo Node (tarefa agendada do Claude) e pelo Worker.

// Modelos determinísticos (Open-Meteo). w = peso de base (qualidade conhecida na Europa).
// "box" = domínio aproximado [sul, oeste, norte, este]; fora dele o modelo não é pedido.
export const DET_MODELS = [
    { id: 'ecmwf_ifs', short: 'ECMWF', name: 'ECMWF IFS', org: 'ECMWF (UE)', resKm: 9, w: 1.6 },
    { id: 'ukmo_seamless', short: 'Met Office', name: 'Met Office', org: 'Met Office (UK)', resKm: 10, w: 1.3 },
    { id: 'meteofrance_seamless', short: 'Météo-France', name: 'Météo-France AROME/ARPEGE', org: 'Météo-France', resKm: 1.3, w: 1.3, wAfter48: 1.0 },
    { id: 'icon_seamless', short: 'ICON', name: 'DWD ICON', org: 'DWD (Alemanha)', resKm: 7, w: 1.2 },
    { id: 'ecmwf_aifs025_single', short: 'AIFS', name: 'ECMWF AIFS (IA)', org: 'ECMWF (UE)', resKm: 25, w: 1.2, wPrecip: 0.7 },
    { id: 'gfs_seamless', short: 'GFS', name: 'NOAA GFS', org: 'NOAA (EUA)', resKm: 13, w: 1.0 },
    { id: 'gem_seamless', short: 'GEM', name: 'GEM', org: 'ECCC (Canadá)', resKm: 15, w: 0.8 },
    { id: 'jma_seamless', short: 'JMA', name: 'JMA', org: 'JMA (Japão)', resKm: 55, w: 0.5 },
    { id: 'cma_grapes_global', short: 'CMA', name: 'CMA GRAPES', org: 'CMA (China)', resKm: 15, w: 0.5 },
    // Regionais de alta resolução (fora do domínio caem para o ECMWF; são filtrados se duplicados)
    { id: 'knmi_seamless', short: 'KNMI', name: 'KNMI HARMONIE', org: 'KNMI (P. Baixos)', resKm: 2.5, w: 1.3, box: [45, -12, 62, 20], dupOf: 'ecmwf_ifs' },
    { id: 'dmi_seamless', short: 'DMI', name: 'DMI HARMONIE', org: 'DMI (Dinamarca)', resKm: 2.5, w: 1.3, box: [50, -30, 72, 40], dupOf: 'ecmwf_ifs' },
    { id: 'metno_seamless', short: 'MET Nordic', name: 'MET Nordic', org: 'MET Norway', resKm: 1, w: 1.3, box: [52, -2, 72, 32], dupOf: 'ecmwf_ifs' },
    { id: 'meteoswiss_icon_seamless', short: 'MeteoSwiss', name: 'MeteoSwiss ICON-CH', org: 'MeteoSwiss', resKm: 1, w: 1.3, box: [43.5, 3, 50, 16.5] },
    { id: 'italia_meteo_arpae_icon_2i', short: 'ItaliaMeteo', name: 'ItaliaMeteo ICON-2I', org: 'ItaliaMeteo', resKm: 2.2, w: 1.2, box: [35.5, 5, 47.5, 20] },
];

// Ensembles (cenários). w = peso de cada sistema (dividido pelos seus membros).
export const ENS_MODELS = [
    { id: 'ecmwf_ifs025', name: 'ECMWF ENS', w: 1.5 },
    { id: 'ecmwf_aifs025', name: 'ECMWF AIFS ENS (IA)', w: 1.2 },
    { id: 'ukmo_global_ensemble_20km', name: 'Met Office MOGREPS-G', w: 1.2 },
    { id: 'icon_seamless', name: 'DWD ICON-EPS', w: 1.1 },
    { id: 'ncep_gefs_seamless', name: 'NOAA GEFS', w: 1.0 },
    { id: 'gem_global', name: 'Canadá GEPS', w: 0.8 },
];

// Modelos usados na comparação com corridas anteriores, na verificação local e na aprendizagem (os 9 globais)
export const PREV_MODELS = DET_MODELS.filter((m) => !m.box).map((m) => m.id);
// Corridas anteriores: a mais recente (hoje), a de há 1 dia (amanhã) e a de há 2 dias (3+ dias), para cada variável aprendida
export const PREV_HOURLY = ['temperature_2m', 'precipitation', 'wind_speed_10m']
    .flatMap((v) => [v, `${v}_previous_day1`, `${v}_previous_day2`]);

export const DET_HOURLY = ['temperature_2m', 'apparent_temperature', 'dew_point_2m', 'relative_humidity_2m', 'precipitation', 'snowfall',
    'weather_code', 'cloud_cover', 'cloud_cover_low', 'wind_speed_10m', 'wind_direction_10m', 'wind_gusts_10m', 'pressure_msl',
    'visibility', 'cape', 'uv_index', 'is_day', 'freezing_level_height'];
export const DET_DAILY = ['weather_code', 'temperature_2m_max', 'temperature_2m_min', 'apparent_temperature_max', 'precipitation_sum',
    'wind_speed_10m_max', 'wind_gusts_10m_max', 'wind_direction_10m_dominant', 'uv_index_max', 'sunrise', 'sunset'];
export const ENS_DAILY = ['temperature_2m_max', 'temperature_2m_min', 'precipitation_sum', 'wind_gusts_10m_max'];

export const OM = {
    forecast: 'https://api.open-meteo.com/v1/forecast',
    ensemble: 'https://ensemble-api.open-meteo.com/v1/ensemble',
    previous: 'https://previous-runs-api.open-meteo.com/v1/forecast',
    archive: 'https://archive-api.open-meteo.com/v1/archive',
    elevation: 'https://api.open-meteo.com/v1/elevation',
    geocoding: 'https://geocoding-api.open-meteo.com/v1/search',
    // mar: temperatura da água e ondas (a célula de mar mais perto do ponto)
    marine: 'https://marine-api.open-meteo.com/v1/marine',
};
export const MARINE_HOURLY = ['sea_surface_temperature', 'wave_height', 'wave_period', 'wave_direction', 'swell_wave_height', 'swell_wave_period'];
export const MARINE_DAILY = ['wave_height_max', 'wave_period_max', 'wave_direction_dominant'];

export const IPMA = {
    stations: 'https://api.ipma.pt/open-data/observation/meteorology/stations/stations.json',
    obs: 'https://api.ipma.pt/open-data/observation/meteorology/stations/observations.json',
    warnings: 'https://api.ipma.pt/open-data/forecast/warnings/warnings_www.json',
    rcm0: 'https://api.ipma.pt/open-data/forecast/meteorology/rcm/rcm-d0.json',
    rcm1: 'https://api.ipma.pt/open-data/forecast/meteorology/rcm/rcm-d1.json',
    districts: 'https://api.ipma.pt/open-data/distrits-islands.json',
    // previsão oficial por concelho (AROME 2,5 km + meteorologista): 423 locais; hora a hora ~3 dias, de 3 em 3 h e diária (10 dias)
    locations: 'https://api.ipma.pt/public-data/forecast/locations.json',
};
export const ipmaAggregateUrl = (id) => `https://api.ipma.pt/public-data/forecast/aggregate/${encodeURIComponent(id)}.json`;

// A previsão oficial do IPMA entra no consenso como mais uma fonte. wDay = peso por dia (0 = hoje).
export const IPMA_MODEL = { id: 'ipma', short: 'IPMA', name: 'IPMA (oficial)', org: 'IPMA (Portugal)', resKm: 2.5, w: 1.6,
    wDay: [1.6, 1.6, 1.6, 1.2, 1.0, 1.0, 0.8, 0.8, 0.8, 0.8], official: true };
export const IPMA_MAX_KM = 15; // concelho mais próximo até 15 km

// Observações: estações IPMA e METAR até 30 km entram na observação combinada do ponto
export const OBS_RADIUS_KM = 30;

// Avisos do utilizador ("Está a chover?"): o que se vê no sítio. Na app, o "agora" mais forte de todos durante 45 min;
// no conector ficam os últimos 50 de cada local (30 dias) para a análise do Claude.
export const REPORT_KINDS = { chuva: 'Chuva', 'chuva-forte': 'Chuva forte', 'nao-chove': 'Não chove', nevoeiro: 'Nevoeiro', granizo: 'Granizo', trovoada: 'Trovoada' };
export const REPORT_MIN = 45;

// Focos de calor por satélite (NASA FIRMS, ficheiros abertos das últimas 24 h, região Europa)
export const FIRMS = {
    n20: { name: 'VIIRS NOAA-20', url: 'https://firms.modaps.eosdis.nasa.gov/data/active_fire/noaa-20-viirs-c2/csv/J1_VIIRS_C2_Europe_24h.csv' },
    n21: { name: 'VIIRS NOAA-21', url: 'https://firms.modaps.eosdis.nasa.gov/data/active_fire/noaa-21-viirs-c2/csv/J2_VIIRS_C2_Europe_24h.csv' },
    snpp: { name: 'VIIRS Suomi-NPP', url: 'https://firms.modaps.eosdis.nasa.gov/data/active_fire/suomi-npp-viirs-c2/csv/SUOMI_VIIRS_C2_Europe_24h.csv' },
    modis: { name: 'MODIS Aqua/Terra', url: 'https://firms.modaps.eosdis.nasa.gov/data/active_fire/modis-c6.1/csv/MODIS_C6_1_Europe_24h.csv' },
};
export const FOGOS_URL = 'https://api.fogos.pt/v2/incidents/active';

// Camadas de satélite (EUMETSAT WMS). Contornos de costa e fronteiras por cima.
const OVERLAY = 'backgrounds:ne_10m_coastline,backgrounds:ne_boundary_lines_land';
export const SAT_LAYERS = {
    geocolour: { name: 'Cor natural', layers: `mtg_fd:rgb_geocolour,${OVERLAY}` },
    ir: { name: 'Infravermelho', layers: `mtg_fd:ir105_hrfi,${OVERLAY}` },
    lightning: { name: 'Relâmpagos', layers: `mtg_fd:rgb_geocolour,mtg_fd:li_afa,${OVERLAY}` },
    fire: { name: 'Fogo', layers: `mtg_fd:rgb_firetemperature,mtg_fd:frp,${OVERLAY}` },
    rain: { name: 'Chuva (satélite)', layers: `mtg_fd:rgb_geocolour,msg_fes:h60b,${OVERLAY}` },
    airmass: { name: 'Massas de ar', layers: `msg_fes:rgb_airmass,${OVERLAY}` },
};
export const EUMETSAT_WMS = 'https://view.eumetsat.int/geoserver/ows';

export const inBox = (lat, lon, [s, w, n, e]) => lat >= s && lat <= n && lon >= w && lon <= e;
// Portugal continental + Madeira + Açores (para IPMA e fogos.pt)
export const inPortugal = (lat, lon) => inBox(lat, lon, [36.8, -9.7, 42.2, -6.1]) || inBox(lat, lon, [32.3, -17.4, 33.2, -16.2]) || inBox(lat, lon, [36.8, -31.4, 39.8, -24.9]);
export const inEuropeFirms = (lat, lon) => inBox(lat, lon, [34, -25, 72, 45]);

const qs = (o) => Object.entries(o).filter(([, v]) => v != null && v !== '').map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
const r4 = (x) => Math.round(x * 1e4) / 1e4;

export function detModelsFor(lat, lon) {
    return DET_MODELS.filter((m) => !m.box || inBox(lat, lon, m.box));
}

// Pedidos Open-Meteo (query strings; o anfitrião vem de OM[api])
export function omQueries(lat, lon, { models, prevDays = 7 } = {}) {
    const base = { latitude: r4(lat), longitude: r4(lon), timezone: 'auto' };
    const det = (models || detModelsFor(lat, lon)).map((m) => m.id || m);
    return {
        forecast: qs({ ...base, models: det.join(','), hourly: DET_HOURLY.join(','), daily: DET_DAILY.join(','),
            minutely_15: 'precipitation', past_hours: 6, forecast_hours: 73, past_minutely_15: 1, forecast_minutely_15: 9, forecast_days: 16 }),
        ensemble: qs({ ...base, models: ENS_MODELS.map((m) => m.id).join(','), daily: ENS_DAILY.join(','), hourly: 'precipitation',
            forecast_hours: 73, forecast_days: 16 }),
        previous: qs({ ...base, models: PREV_MODELS.join(','), hourly: PREV_HOURLY.join(','), past_days: Math.max(1, Math.min(31, Math.round(prevDays) || 7)), forecast_days: 7 }),
        marine: qs({ ...base, hourly: MARINE_HOURLY.join(','), daily: MARINE_DAILY.join(','), forecast_days: 7, cell_selection: 'sea' }),
    };
}

// Normais recentes: janela de ±40 dias em torno de hoje, em cada um dos últimos 10 anos (pedidos curtos e baratos)
export function climateQueries(lat, lon, today = new Date()) {
    const out = [];
    const y0 = today.getUTCFullYear();
    for (let y = y0 - 10; y < y0; y++) {
        const c = Date.UTC(y, today.getUTCMonth(), today.getUTCDate());
        const s = new Date(c - 30 * 864e5).toISOString().slice(0, 10);
        const e = new Date(c + 40 * 864e5).toISOString().slice(0, 10);
        out.push(qs({ latitude: r4(lat), longitude: r4(lon), timezone: 'auto', start_date: s, end_date: e, daily: 'temperature_2m_max,temperature_2m_min' }));
    }
    return out;
}

// Caixa para a imagem de satélite centrada no local (pixels quadrados em km)
export function satBbox(lat, lon, km = 600, w = 720, h = 540) {
    const cos = Math.cos((lat * Math.PI) / 180);
    const lonSpan = km / (111.32 * cos);
    const latSpan = (km * h) / (111.32 * w);
    const r = (x) => Math.round(x * 1000) / 1000;
    return { south: r(lat - latSpan / 2), west: r(lon - lonSpan / 2), north: r(lat + latSpan / 2), east: r(lon + lonSpan / 2) };
}

export function satUrl(layer, lat, lon, { km = 600, w = 720, h = 540 } = {}) {
    const L = SAT_LAYERS[layer] || SAT_LAYERS.geocolour;
    const b = satBbox(lat, lon, km, w, h);
    // WMS 1.3.0 + EPSG:4326 → bbox na ordem lat,lon
    return `${EUMETSAT_WMS}?${qs({ service: 'WMS', request: 'GetMap', version: '1.3.0', layers: L.layers, styles: '', format: 'image/png',
        crs: 'EPSG:4326', bbox: `${b.south},${b.west},${b.north},${b.east}`, width: w, height: h })}`;
}

export function metarBboxUrl(lat, lon, hours = 3) {
    const b = `${(lat - 0.45).toFixed(2)},${(lon - 0.6).toFixed(2)},${(lat + 0.45).toFixed(2)},${(lon + 0.6).toFixed(2)}`;
    return `https://aviationweather.gov/api/data/metar?bbox=${b}&format=json&hours=${hours}`;
}
export const metarHistoryUrl = (id) => `https://aviationweather.gov/api/data/metar?ids=${encodeURIComponent(id)}&format=json&hours=168`;
