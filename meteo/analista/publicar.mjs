// Analista do tempo — valida a análise escrita pelo Claude e grava-a na base de dados (KV).
//   NODE_USE_ENV_PROXY=1 node meteo/analista/publicar.mjs /tmp/meteo/analise-<id>.json [--model <id do modelo>] [--regiao-ok]
// Recusa frases genéricas sobre a região (a análise é para o ponto exato), salvo --regiao-ok.
// Grava analysis:<id> (a app lê-a em /api/analysis, só o telemóvel do local e o dono), o arquivo
// analysis:<id>:<data-hora> (30 dias), lessons:<id> e conta a análise no dia (stats:<data de Lisboa>, painel "Utilização").
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { validateAnalysis, regionalPhrases } from '../lib/analysis.js';
import { isOwnerPlace, placeKind, bumpStats, lisbon, STATS_TTL, KIND_PT } from '../lib/places.js';
import { kvGet, kvPut, arg } from './comum.mjs';

const file = process.argv[2];
if (!file || file.startsWith('--')) { console.error('uso: publicar.mjs /tmp/meteo/analise-<id>.json'); process.exit(2); }
const id = basename(file).replace(/^analise-/, '').replace(/\.json$/, '');
// os locais como o conector os guarda (KV): a lista pública só mostra a cada telemóvel os seus
const stored = await kvGet('places');
const places = Array.isArray(stored) ? stored : [];
const place = places.find((p) => p.id === id);
if (!place) { console.error(`Local "${id}" não está registado (${places.map((p) => p.id).join(', ') || 'nenhum'}).`); process.exit(1); }
if (place.off) { console.error(`Local "${id}" (${place.name}) foi desligado entretanto: não publiques.`); process.exit(1); }

let a;
try { a = JSON.parse(readFileSync(file, 'utf8')); } catch (e) { console.error(`JSON inválido em ${file}: ${e.message}`); process.exit(1); }
const { ok, errors, value } = validateAnalysis(a, { strict: true });
const today = new Date().toISOString().slice(0, 10);
if (value?.dias?.some((d) => d.data <= today)) errors.push('"dias" deve começar depois de amanhã (hoje e amanhã têm campos próprios)');
if (!ok || errors.length) { console.error('Análise inválida:\n- ' + errors.join('\n- ')); process.exit(1); }
// a análise é para o ponto exato: frases genéricas sobre a região não passam (salvo --regiao-ok, quando são mesmo precisas)
const regional = regionalPhrases(value, { place: place.name });
if (regional.length && !process.argv.includes('--regiao-ok')) {
    console.error(`Frases sobre a região em vez do ponto (${place.name}, ${place.lat}, ${place.lon}):\n- ${regional.map((r) => `${r.campo}: «${r.frase}»`).join('\n- ')}\n` +
        'Reescreve-as sobre o ponto: o que acontece aqui (mm, km/h, °C, horas); um sistema regional só com distância, direção e hora de chegada ao ponto. ' +
        'Se a menção for mesmo necessária, publica com --regiao-ok.');
    process.exit(1);
}

const doc = { ...value, generatedAt: new Date().toISOString(), by: 'claude-agendado', model: arg('--model', 'claude'),
    place: { id: place.id, name: place.name, lat: place.lat, lon: place.lon } };
await kvPut('analysis:' + id, doc);
await kvPut(`analysis:${id}:${doc.generatedAt.slice(0, 13)}`, doc, { ttl: 30 * 86400 });
if (value.licoes.length) await kvPut('lessons:' + id, value.licoes);
// contador do dia (painel "Utilização" do dono): agendadas e quantas foram para locais de outros telemóveis
const day = 'stats:' + lisbon().date;
try { await kvPut(day, bumpStats(await kvGet(day), { kind: 'scheduled', guest: !isOwnerPlace(place) }), { ttl: STATS_TTL }); }
catch (e) { console.error(`(contador do dia não gravado: ${e.message})`); }
console.log(`Publicado: ${place.name} (${KIND_PT[placeKind(place)]}) — "${doc.titulo}" (${value.alertas.length} alertas, ${value.licoes.length} lições).`);
