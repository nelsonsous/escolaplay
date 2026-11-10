// Maestro — as ideias de pedidos (a versão em JavaScript, só como referência do teste de paridade; a que corre é a Onda)
//   NODE_USE_ENV_PROXY=1 node musica/curador/ideias.mjs /tmp/musica/<pessoa>/ideias.json [--utilizador <pessoa>]
import { readFileSync } from 'node:fs';
import { api, pessoa, arg } from '../comum.mjs';

const file = process.argv[2];
if (!file || file.startsWith('--')) { console.error('uso: ideias.mjs /tmp/musica/<pessoa>/ideias.json [--utilizador <pessoa>]'); process.exit(2); }
let corpo;
try { corpo = JSON.parse(readFileSync(file, 'utf8')); } catch (e) { console.error(`JSON inválido em ${file}: ${e.message}`); process.exit(1); }
pessoa(arg('--utilizador'));
const r = await api('/api/ideias', { method: 'POST', body: corpo });
console.log(`Ideias guardadas: ${r.n} (de dia ${r.dia}, de noite ${r.noite})`);
