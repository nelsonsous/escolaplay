// Servidor de desenvolvimento da app: serve meteo/ em /escolaplay/meteo/ (como no GitHub Pages)
// e simula o conector (/api/*) com dados fictícios de tests/fixtures/mock.mjs.
//   NODE_USE_ENV_PROXY=1 node meteo/scripts/dev-static.mjs
//   → http://localhost:8790/escolaplay/meteo/?mock=1&proxy=http://localhost:8790
//   PORT=8791 MOCK_ONDEMAND=1 …   → com o botão "Analisar agora"
//   node meteo/scripts/dev-static.mjs --write-fixtures   → grava tests/fixtures/*.json e sai
// A imagem de satélite vem do WMS da EUMETSAT (precisa de rede); sem rede devolve uma imagem de reserva.
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, extname, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mockForecast, MOCK_ANALYSIS, searchPlaces, variantFor } from '../tests/fixtures/mock.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const FIX = fileURLToPath(new URL('../tests/fixtures/', import.meta.url));
const PORT = Number(process.env.PORT || 8790);
const ON_DEMAND = process.env.MOCK_ONDEMAND === '1';
const SCHEDULE = ['07:12', '13:12', '19:42'];
let places = [{ id: 'lisboa', name: 'Lisboa', lat: 38.7223, lon: -9.1393, createdAt: '2026-11-01T10:00:00Z' }];

function analysisResponse(lat, lon) {
  const near = places.find((p) => Math.abs(p.lat - lat) < 0.09 && Math.abs(p.lon - lon) < 0.09);
  const has = near && near.id === 'lisboa' && variantFor(lat, lon) === 'lisboa';
  return { analysis: has ? MOCK_ANALYSIS : null, place: near ? { ...near, distanceKm: 0 } : null, ageMin: has ? 140 : null, schedule: SCHEDULE, onDemand: ON_DEMAND };
}

if (process.argv.includes('--write-fixtures')) {
  await writeFile(join(FIX, 'forecast-lisboa.json'), JSON.stringify(mockForecast({}), null, 1));
  await writeFile(join(FIX, 'analysis-lisboa.json'), JSON.stringify(analysisResponse(38.7223, -9.1393), null, 1));
  console.log('fixtures gravadas em', FIX);
  process.exit(0);
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const WMS = { geocolour: 'mtg_fd:rgb_geocolour', ir: 'mtg_fd:ir105_hrfi', lightning: 'mtg_fd:ir105_hrfi,mtg_fd:li_afa', fire: 'mtg_fd:rgb_firetemperature', rain: 'mtg_fd:ir105_hrfi,msg_fes:h60b', airmass: 'msg_fes:rgb_airmass' };
const SAT_DIR = join(tmpdir(), 'meteo-sat-cache');

async function satellite(url) {
  const layer = WMS[url.searchParams.get('layer')] ? url.searchParams.get('layer') : 'geocolour';
  const lat = Number(url.searchParams.get('lat')) || 38.72, lon = Number(url.searchParams.get('lon')) || -9.14;
  const km = Math.min(2000, Math.max(100, Number(url.searchParams.get('km')) || 600));
  const w = Math.min(1024, Number(url.searchParams.get('w')) || 720), h = Math.min(1024, Number(url.searchParams.get('h')) || 540);
  const halfW = km / 2, halfH = (halfW * h) / w;
  const dLat = halfH / 111.32, dLon = halfW / (111.32 * Math.cos((lat * Math.PI) / 180));
  const bbox = [lat - dLat, lon - dLon, lat + dLat, lon + dLon].map((v) => v.toFixed(3)).join(',');
  const key = join(SAT_DIR, `${layer}_${bbox}_${w}x${h}.png`);
  try { if (Date.now() - (await stat(key)).mtimeMs < 30 * 60e3) return { body: await readFile(key), type: 'image/png' }; } catch { /* sem cache */ }
  const wms = `https://view.eumetsat.int/geoserver/ows?service=WMS&request=GetMap&version=1.3.0&layers=${encodeURIComponent(WMS[layer] + ',backgrounds:ne_10m_coastline')}&styles=&format=image/png&crs=EPSG:4326&bbox=${bbox}&width=${w}&height=${h}`;
  try {
    const res = await fetch(wms, { signal: AbortSignal.timeout(25000) });
    const type = res.headers.get('content-type') || '';
    if (!res.ok || !type.startsWith('image/')) throw new Error(`WMS ${res.status} ${type}`);
    const body = Buffer.from(await res.arrayBuffer());
    await mkdir(SAT_DIR, { recursive: true });
    await writeFile(key, body);
    return { body, type };
  } catch (e) {
    console.warn('satélite indisponível:', e.message);
    return { body: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#16212e"/><text x="50%" y="50%" fill="#8fa0b3" font-family="system-ui" font-size="20" text-anchor="middle">Imagem de reserva (sem rede) · ${layer}</text></svg>`), type: 'image/svg+xml' };
  }
}

const json = (res, status, data) => { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'access-control-allow-origin': '*' }); res.end(JSON.stringify(data)); };
async function readBody(req) { let s = ''; for await (const c of req) s += c; try { return JSON.parse(s || '{}'); } catch { return {}; } }

async function apiRoute(req, res, url, p) {
  const lat = Number(url.searchParams.get('lat')), lon = Number(url.searchParams.get('lon'));
  if (p === '/api/forecast') return Number.isFinite(lat) && Number.isFinite(lon) ? json(res, 200, mockForecast({ lat, lon, name: url.searchParams.get('name') || undefined })) : json(res, 400, { error: 'coordenadas', message: 'Coordenadas inválidas.' });
  if (p === '/api/analysis') return json(res, 200, analysisResponse(lat, lon));
  if (p === '/api/analysis/refresh' && req.method === 'POST') {
    await readBody(req);
    if (!ON_DEMAND) return json(res, 503, { error: 'sem_chave', message: 'A análise imediata não está ativa: falta a chave da API do Claude no conector.' });
    await new Promise((r) => setTimeout(r, 1200));
    return json(res, 200, { analysis: { ...MOCK_ANALYSIS, by: 'claude-api', generatedAt: new Date().toISOString() } });
  }
  if (p === '/api/places' && req.method === 'GET') return json(res, 200, places);
  if (p === '/api/places' && req.method === 'POST') {
    const b = await readBody(req);
    if (!b.name || !Number.isFinite(b.lat) || !Number.isFinite(b.lon)) return json(res, 400, { error: 'dados', message: 'Faltam o nome ou as coordenadas.' });
    if (places.length >= 5) return json(res, 409, { error: 'limite', message: 'Já há 5 locais com análise diária. Desliga um primeiro.' });
    const place = { id: `${b.name.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-')}-${places.length + 1}`, name: b.name, lat: b.lat, lon: b.lon, createdAt: new Date().toISOString() };
    places.push(place);
    return json(res, 201, place);
  }
  if (p.startsWith('/api/places/') && req.method === 'DELETE') { places = places.filter((x) => x.id !== decodeURIComponent(p.slice(12))); res.writeHead(204, { 'access-control-allow-origin': '*' }); return res.end(); }
  if (p.startsWith('/api/places/') && req.method === 'PATCH') { // mudar de ponto (mesmo id)
    const b = await readBody(req), id = decodeURIComponent(p.slice(12)), cur = places.find((x) => x.id === id);
    if (!cur) return json(res, 404, { error: 'nao_encontrado', message: 'Local não encontrado.' });
    if (!Number.isFinite(b.lat) || !Number.isFinite(b.lon)) return json(res, 400, { error: 'pedido_invalido', message: 'Coordenadas inválidas.' });
    const place = { ...cur, lat: b.lat, lon: b.lon, ...(b.name ? { name: b.name } : {}), movedAt: new Date().toISOString() };
    places = places.map((x) => (x.id === id ? place : x));
    return json(res, 200, place);
  }
  if (p === '/api/geocode') return json(res, 200, searchPlaces(url.searchParams.get('q') || '').slice(0, 8));
  if (p === '/api/status') return json(res, 200, { version: '1.0.0', onDemand: ON_DEMAND, places: places.length, schedule: SCHEDULE });
  if (p === '/api/sat') { const { body, type } = await satellite(url); res.writeHead(200, { 'content-type': type, 'cache-control': 'max-age=600', 'access-control-allow-origin': '*' }); return res.end(body); }
  return json(res, 404, { error: 'nao_existe', message: 'Endpoint desconhecido no servidor de teste.' });
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  let p = url.pathname.replace(/^\/escolaplay\/meteo(?=\/|$)/, '') || '/';
  try {
    if (req.method === 'OPTIONS') { res.writeHead(204, { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,PATCH,DELETE', 'access-control-allow-headers': 'content-type' }); return res.end(); }
    if (p.startsWith('/api/')) return await apiRoute(req, res, url, p);
    if (p === '/' && !url.pathname.endsWith('/')) { res.writeHead(301, { location: url.pathname + '/' + url.search }); return res.end(); }
    if (/^\/(proxy|node_modules|analista|docs)\//.test(p)) { res.writeHead(403); return res.end(); }
    const file = normalize(join(ROOT, p === '/' ? 'index.html' : decodeURIComponent(p)));
    if (!file.startsWith(ROOT) || file.includes(`${sep}..${sep}`)) { res.writeHead(403); return res.end(); }
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' });
    res.end(body);
  } catch (e) {
    if (e.code === 'ENOENT' || e.code === 'EISDIR') { res.writeHead(404, { 'content-type': 'text/plain' }); return res.end('não encontrado'); }
    console.error(e);
    json(res, 500, { error: 'interno', message: e.message });
  }
}).listen(PORT, () => console.log(`Meteo (simulado) em http://localhost:${PORT}/escolaplay/meteo/?mock=1&proxy=http://localhost:${PORT}`));
