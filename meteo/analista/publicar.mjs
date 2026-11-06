// Analista do tempo — valida a análise escrita pelo Claude e grava-a na base de dados (KV).
//   NODE_USE_ENV_PROXY=1 node meteo/analista/publicar.mjs /tmp/meteo/analise-<id>.json [--model <id do modelo>]
// Grava analysis:<id> (a app lê-a em /api/analysis), o arquivo analysis:<id>:<data-hora> (30 dias) e lessons:<id>.
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { validateAnalysis } from '../lib/analysis.js';
import { WORKER, getJSON, kvPut, arg } from './comum.mjs';

const file = process.argv[2];
if (!file || file.startsWith('--')) { console.error('uso: publicar.mjs /tmp/meteo/analise-<id>.json'); process.exit(2); }
const id = basename(file).replace(/^analise-/, '').replace(/\.json$/, '');
const places = await getJSON(`${WORKER}/api/places`);
const place = places.find((p) => p.id === id);
if (!place) { console.error(`Local "${id}" não está registado (${places.map((p) => p.id).join(', ') || 'nenhum'}).`); process.exit(1); }

let a;
try { a = JSON.parse(readFileSync(file, 'utf8')); } catch (e) { console.error(`JSON inválido em ${file}: ${e.message}`); process.exit(1); }
const { ok, errors, value } = validateAnalysis(a, { strict: true });
const today = new Date().toISOString().slice(0, 10);
if (value?.dias?.some((d) => d.data <= today)) errors.push('"dias" deve começar depois de amanhã (hoje e amanhã têm campos próprios)');
if (!ok || errors.length) { console.error('Análise inválida:\n- ' + errors.join('\n- ')); process.exit(1); }

const doc = { ...value, generatedAt: new Date().toISOString(), by: 'claude-agendado', model: arg('--model', 'claude'),
    place: { id: place.id, name: place.name, lat: place.lat, lon: place.lon } };
await kvPut('analysis:' + id, doc);
await kvPut(`analysis:${id}:${doc.generatedAt.slice(0, 13)}`, doc, { ttl: 30 * 86400 });
if (value.licoes.length) await kvPut('lessons:' + id, value.licoes);
console.log(`Publicado: ${place.name} — "${doc.titulo}" (${value.alertas.length} alertas, ${value.licoes.length} lições).`);
