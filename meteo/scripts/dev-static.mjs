// Servidor de desenvolvimento da interface: serve public/ e simula a API do Worker com dados fictícios.
//   NODE_USE_ENV_PROXY=1 node meteo/scripts/dev-static.mjs        → http://localhost:8790/?mock=1
//   PORT=8791 MOCK_ONDEMAND=1 node meteo/scripts/dev-static.mjs   → com o botão "Analisar agora"
//   node meteo/scripts/dev-static.mjs --write-fixtures            → grava test/fixtures/*.json e sai
// A imagem de satélite vem do WMS da EUMETSAT (precisa de rede); sem rede devolve uma imagem de reserva.
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mockForecast, MOCK_ANALYSIS, searchPlaces, variantFor } from '../test/fixtures/mock.mjs';

const ROOT = fileURLToPath(new URL('../public/', import.meta.url));
const FIX = fileURLToPath(new URL('../test/fixtures/', import.meta.url));
const PORT = Number(process.env.PORT || 8790);
const ON_DEMAND = process.env.MOCK_ONDEMAND === '1';
const SCHEDULE = ['07:12', '13:12', '19:42'];

let places = [{ id: 'lisboa', name: 'Lisboa', lat: 38.7223, lon: -9.1393, createdAt: '2026-11-01T10:00:00Z' }];

if (process.argv.includes('--write-fixtures')) {
  await writeFile(join(FIX, 'forecast-lisboa.json'), JSON.stringify(mockForecast({}), null, 1));
  await writeFile(join(FIX, 'analysis-lisboa.json'), JSON.stringify(analysisResponse(38.7223, -9.1393), null, 1));
  console.log('fixtures gravadas em', FIX);
  process.exit(0);
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };

function analysisResponse(lat, lon) {
  const near = places.find((p) => Math.abs(p.lat - lat) < 0.09 && Math.abs(p.lon - lon) < 0.09);
  const hasAnalysis = near && variantFor(lat, lon) === 'lisboa' && near.id === 'lisboa';
  return {
    analysis: hasAnalysis ? MOCK_ANALYSIS : null,
    place: near ? { id: near.id, name: near.name, lat: near.lat, lon: near.lon, distanceKm: 0.0 } : null,
    ageMin: hasAnalysis ? 140 : null, schedule: SCHEDULE, onDemand: ON_DEMAND,
  };
}

// stub do motor quando public/lib/data.js ainda não existe (só o ramo ?mock=1)
const STUB_DATA_JS = `// stub do servidor de desenvolvimento (public/lib/data.js ainda não existe)
export async function loadForecast({ lat, lon, name } = {}) {
  await new Promise((r) => setTimeout(r, 600));
  const q = new URLSearchParams({ lat, lon }); if (name) q.set('name', name);
  const res = await fetch('/api/forecast?' + q);
  if (!res.ok) throw new Error('Não foi possível obter a previsão (servidor de teste).');
  return res.json();
}
export async function requestAnalysis(fc) {
  const res = await fetch('/api/analysis/refresh?lat=' + fc.location.lat + '&lon=' + fc.location.lon, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ summary: 'stub' }) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Análise indisponível.');
  return data.analysis;
}
`;

const WMS = {
  geocolour: 'mtg_fd:rgb_geocolour',
  ir: 'mtg_fd:ir105_hrfi',
  lightning: 'mtg_fd:ir105_hrfi,mtg_fd:li_afa',
  fire: 'mtg_fd:rgb_firetemperature',
  rain: 'mtg_fd:ir105_hrfi,msg_fes:h60b',
  airmass: 'msg_fes:rgb_airmass',
};
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
  try { if (Date.now() - (await stat(key)).mtimeMs < 30 * 60e3) return { body: await readFile(key), type: 'image/png', bbox }; } catch { /* sem cache */ }
  const wms = `https://view.eumetsat.int/geoserver/ows?service=WMS&request=GetMap&version=1.3.0&layers=${encodeURIComponent(WMS[layer] + ',backgrounds:ne_10m_coastline')}&styles=&format=image/png&crs=EPSG:4326&bbox=${bbox}&width=${w}&height=${h}`;
  try {
    const res = await fetch(wms, { signal: AbortSignal.timeout(25000) });
    const type = res.headers.get('content-type') || '';
    if (!res.ok || !type.startsWith('image/')) throw new Error(`WMS ${res.status} ${type}`);
    const body = Buffer.from(await res.arrayBuffer());
    await mkdir(SAT_DIR, { recursive: true });
    await writeFile(key, body);
    return { body, type, bbox };
  } catch (e) {
    console.warn('satélite indisponível:', e.message);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="#16212e"/><text x="50%" y="50%" fill="#8fa0b3" font-family="system-ui" font-size="20" text-anchor="middle">Imagem de reserva (sem rede) · ${layer}</text></svg>`;
    return { body: Buffer.from(svg), type: 'image/svg+xml', bbox };
  }
}

const json = (res, status, data) => { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(JSON.stringify(data)); };
async function readBody(req) { let s = ''; for await (const c of req) s += c; try { return JSON.parse(s || '{}'); } catch { return {}; } }

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const p = url.pathname;
  try {
    if (p === '/api/forecast') {
      const lat = Number(url.searchParams.get('lat')), lon = Number(url.searchParams.get('lon'));
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return json(res, 400, { error: 'coordenadas', message: 'Coordenadas inválidas.' });
      return json(res, 200, mockForecast({ lat, lon, name: url.searchParams.get('name') || undefined }));
    }
    if (p === '/api/analysis' && req.method === 'GET') return json(res, 200, analysisResponse(Number(url.searchParams.get('lat')), Number(url.searchParams.get('lon'))));
    if (p === '/api/analysis/refresh' && req.method === 'POST') {
      await readBody(req);
      if (!ON_DEMAND) return json(res, 503, { error: 'sem_chave', message: 'A análise imediata não está ativa: falta a chave da API do Claude no Worker.' });
      await new Promise((r) => setTimeout(r, 1500));
      return json(res, 200, { analysis: { ...MOCK_ANALYSIS, by: 'claude-api', generatedAt: new Date().toISOString() } });
    }
    if (p === '/api/places' && req.method === 'GET') return json(res, 200, places);
    if (p === '/api/places' && req.method === 'POST') {
      const b = await readBody(req);
      if (!b.name || !Number.isFinite(b.lat) || !Number.isFinite(b.lon)) return json(res, 400, { error: 'dados', message: 'Faltam o nome ou as coordenadas.' });
      if (places.length >= 5) return json(res, 409, { error: 'limite', message: 'Já há 5 locais com análise diária. Remove um primeiro.' });
      const place = { id: `${b.name.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-')}-${places.length + 1}`, name: b.name, lat: b.lat, lon: b.lon, createdAt: new Date().toISOString() };
      places.push(place);
      return json(res, 201, place);
    }
    if (p.startsWith('/api/places/') && req.method === 'DELETE') {
      places = places.filter((x) => x.id !== decodeURIComponent(p.slice(12)));
      res.writeHead(204); return res.end();
    }
    if (p === '/api/geocode') return json(res, 200, searchPlaces(url.searchParams.get('q') || '').slice(0, 8));
    if (p === '/api/status') return json(res, 200, { version: '1.0.0', onDemand: ON_DEMAND, places: places.length, schedule: SCHEDULE });
    if (p === '/api/sat') {
      const { body, type, bbox } = await satellite(url);
      res.writeHead(200, { 'content-type': type, 'cache-control': 'max-age=600', 'x-sat-layer': url.searchParams.get('layer') || 'geocolour', 'x-sat-bbox': bbox });
      return res.end(body);
    }
    if (p.startsWith('/api/')) return json(res, 404, { error: 'nao_existe', message: 'Endpoint desconhecido no servidor de teste.' });
    // estáticos
    let file = normalize(join(ROOT, p === '/' ? 'index.html' : decodeURIComponent(p)));
    if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    if (p === '/lib/data.js' && !existsSync(file)) {
      res.writeHead(200, { 'content-type': TYPES['.js'], 'cache-control': 'no-store' });
      return res.end(STUB_DATA_JS);
    }
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' });
    res.end(body);
  } catch (e) {
    if (e.code === 'ENOENT' || e.code === 'EISDIR') { res.writeHead(404, { 'content-type': 'text/plain' }); return res.end('não encontrado'); }
    console.error(e);
    json(res, 500, { error: 'interno', message: e.message });
  }
}).listen(PORT, () => console.log(`Meteo (simulado) em http://localhost:${PORT}/?mock=1`));
