// Compila os campos da Meteo em Onda, cada um num módulo que a app importa (e que o service worker guarda), sem mais
// pedidos:   node meteo/onda/build.mjs
//   chuva.onda → WebAssembly (onda/chuva-wasm.js): o gráfico da chuva das próximas 2 horas
//   ceu.onda   → GLSL para a placa gráfica (onda/ceu-glsl.js): o céu animado do cartão «Agora»
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

const ceu = readFileSync(path.join(aqui, 'ceu.onda'));
const glsl = execFileSync(ondac, ['-g', 'ceu'], { input: ceu, maxBuffer: 1 << 26 }).toString();
if (glsl.startsWith('#error')) throw new Error(glsl);
// o GLSL da Onda declara cada temporário numa linha («float t7=0.0;»): junta-se tudo numa só linha por bloco, mais leve
const min = glsl.split('\n').map((l) => l.trim()).filter(Boolean).reduce((a, l) => a + (l.startsWith('#') ? `\n${l}\n` : l), '').trim();
writeFileSync(path.join(aqui, 'ceu-glsl.js'),
    `// GERADO por node meteo/onda/build.mjs a partir de ceu.onda (${ceu.toString().split('\n').length} linhas de Onda) — não editar à mão.\n`
    + `export const CEU_GLSL = ${JSON.stringify(min)};\n`);
console.log(`ceu.onda → ${glsl.length} bytes de GLSL (${min.length} juntos)`);
