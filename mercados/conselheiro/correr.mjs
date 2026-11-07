// Conselheiro — corre um dos scripts da tarefa agendada, escritos em Onda (onda/*.onda → conselheiro.wasm, com
// node mercados/conselheiro/onda/build.mjs), com o anfitrião Node da Onda (onda/rt/anfitriao-node.js).
//   NODE_USE_ENV_PROXY=1 node mercados/conselheiro/correr.mjs <dados|universo|outros|publicar|backtest> [argumentos]
// Os dados.mjs, universo.mjs, outros.mjs, publicar.mjs e backtest.mjs desta pasta chamam este (a CONSELHEIRO.md usa-os).
// Tudo o que o script faz (pedidos, contas, ficheiros, mensagens, código de saída) é da Onda; aqui só se carrega o
// módulo e se diz onde fica a pasta mercados (MERCADOS_DIR: o wrangler.toml e o universo.json).
import { createRequire } from 'node:module';
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const { correr: anfitriao } = createRequire(import.meta.url)('../../onda/rt/anfitriao-node.js');
export const WASM = path.join(here, 'conselheiro.wasm');

export function correr(script, args = [], opcoes = {}) {
    return anfitriao(readFileSync(WASM), { args: [script, ...args], env: { ...process.env, MERCADOS_DIR: path.resolve(here, '..') }, ...opcoes });
}

// o ficheiro corre como script (e não importado)? Caminhos reais: o Node resolve as ligações simbólicas no módulo
const real = (p) => { try { return realpathSync(p); } catch { return path.resolve(p); } };
export const isMain = (url) => !!process.argv[1] && real(process.argv[1]) === real(fileURLToPath(url));

if (isMain(import.meta.url)) correr(process.argv[2] || '', process.argv.slice(3));
