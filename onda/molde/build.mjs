// Monta a app: junta a biblioteca da Onda (onda/lib) e o app.onda, compila para WebAssembly (gerado/app.wasm) e
// copia o anfitrião (gerado/anfitriao.js). Só entram no módulo as funções que a app usa.
//   node build.mjs            (ONDA=/caminho/para/onda se a pasta já não estiver dentro de onda/)
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const onda = process.env.ONDA ? path.resolve(process.env.ONDA) : path.join(aqui, '..');
const ondac = path.join(onda, 'build/ondac');
if (!existsSync(ondac)) execFileSync('sh', [path.join(onda, 'build.sh')], { stdio: 'inherit' });

const MODULOS = ['memoria', 'texto', 'numero', 'valor', 'json', 'arvore', 'data', 'ordenar', 'html', 'anfitriao', 'fala'];
// as funções que o anfitrião chama (o main e as dos eventos): o resto fica privado e o que não se usa não entra
const EVENTOS = ['main', 'clique', 'escreve', 'lido'];

const fonte = MODULOS.map((m) => readFileSync(path.join(onda, 'lib', m + '.onda'), 'utf8')).join('\n')
    + '\n' + readFileSync(path.join(aqui, 'app.onda'), 'utf8');
const wasm = execFileSync(ondac, ['-w', ...EVENTOS], { input: fonte, maxBuffer: 1 << 26 });
if (wasm.subarray(0, 4).toString('latin1') !== '\0asm') { console.error(wasm.toString()); process.exit(1); }
mkdirSync(path.join(aqui, 'gerado'), { recursive: true });
writeFileSync(path.join(aqui, 'gerado/app.wasm'), wasm);
copyFileSync(path.join(onda, 'rt/anfitriao.js'), path.join(aqui, 'gerado/anfitriao.js'));
console.log(`app.onda (${readFileSync(path.join(aqui, 'app.onda'), 'utf8').split('\n').length} linhas) → gerado/app.wasm, ${wasm.length} bytes`);
