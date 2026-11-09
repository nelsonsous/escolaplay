// Compila os campos da Meteo em Onda (chuva.onda → WebAssembly) para onda/chuva-wasm.js, um módulo que a app importa
// (e que o service worker guarda), sem mais pedidos.   node meteo/onda/build.mjs
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const onda = path.join(aqui, '../../onda');
const ondac = path.join(onda, 'build/ondac');
if (!existsSync(ondac)) execFileSync('sh', [path.join(onda, 'build.sh')], { stdio: 'inherit' });
const fonte = readFileSync(path.join(aqui, 'chuva.onda'));
const wasm = execFileSync(ondac, ['-w', 'calvo', 'cfixa', 'cpasso', 'cdesenha', 'chuva'], { input: fonte, maxBuffer: 1 << 26 });
if (wasm.subarray(0, 12).toString().startsWith('#error')) throw new Error(wasm.toString());
writeFileSync(path.join(aqui, 'chuva-wasm.js'),
    `// GERADO por node meteo/onda/build.mjs a partir de chuva.onda (${fonte.toString().split('\n').length} linhas de Onda) — não editar à mão.\n`
    + `export const CHUVA_WASM = ${JSON.stringify(wasm.toString('base64'))};\n`);
console.log(`chuva.onda → ${wasm.length} bytes de WASM`);
