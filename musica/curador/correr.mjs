// Maestro — corre um dos scripts da tarefa agendada, escritos em Onda (curador/onda/*.onda → curador/maestro.wasm,
// com node musica/onda/compilar.mjs), pelo anfitrião Node da Onda (onda/rt/anfitriao-node.js).
//   NODE_USE_ENV_PROXY=1 node musica/curador/correr.mjs dados [/tmp/musica]
// O dados.mjs desta pasta chama este. Tudo o que o script faz (pedidos, ficheiros, mensagens, código de saída) é da
// Onda; aqui só se carrega o módulo e se diz onde fica a pasta musica (MUSICA_DIR: o proxy/wrangler.toml).
import { createRequire } from 'node:module';
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const { correr: anfitriao } = createRequire(import.meta.url)('../../onda/rt/anfitriao-node.js');
export const WASM = path.join(here, 'maestro.wasm');

export function correr(script, args = [], opcoes = {}) {
    return anfitriao(readFileSync(WASM), { args: [script, ...args], env: { ...process.env, MUSICA_DIR: path.resolve(here, '..') }, ...opcoes });
}

// o ficheiro corre como script (e não importado)? Caminhos reais: o Node resolve as ligações simbólicas no módulo
const real = (p) => { try { return realpathSync(p); } catch { return path.resolve(p); } };
export const isMain = (url) => !!process.argv[1] && real(process.argv[1]) === real(fileURLToPath(url));

if (isMain(import.meta.url)) correr(process.argv[2] || '', process.argv.slice(3));
