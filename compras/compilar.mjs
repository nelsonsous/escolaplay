// Monta a app: junta a biblioteca da Onda (onda/lib) e app/compras.onda e compila para WebAssembly (app/compras.wasm),
// com o compilador do repositório (onda/build/ondac; o build.sh fá-lo se faltar). Só entram no módulo as funções que
// a app usa: as dos eventos (EVENTOS, que o anfitrião chama pelo nome) e o que elas alcançam.
//   node compras/compilar.mjs [--verificar]      (--verificar: não grava; falha se o app/compras.wasm não corresponder)
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const onda = path.join(aqui, '..', 'onda');
const ondac = path.join(onda, 'build/ondac');
if (!existsSync(ondac)) execFileSync('sh', [path.join(onda, 'build.sh')], { stdio: 'inherit' });

const MODULOS = ['memoria', 'texto', 'numero', 'valor', 'json', 'arvore', 'data', 'ordenar', 'html', 'anfitriao', 'fala'];
export const EVENTOS = ['main', 'clique', 'escreve', 'lido_lista', 'lido_ver', 'lido_ap', 'lido_entrar', 'lido_proc', 'tique', 'tira_aviso'];

const fonte = MODULOS.map((m) => readFileSync(path.join(onda, 'lib', m + '.onda'), 'utf8')).join('\n')
    + '\n' + readFileSync(path.join(aqui, 'app/compras.onda'), 'utf8');
const wasm = execFileSync(ondac, ['-w', ...EVENTOS], { input: fonte, maxBuffer: 1 << 26 });
if (wasm.subarray(0, 4).toString('latin1') !== '\0asm') { console.error(wasm.toString()); process.exit(1); }
const destino = path.join(aqui, 'app/compras.wasm');
if (process.argv.includes('--verificar')) {
    if (!existsSync(destino) || !readFileSync(destino).equals(wasm)) { console.error('app/compras.wasm não corresponde a app/compras.onda: corre node compras/compilar.mjs'); process.exit(1); }
    console.log('app/compras.wasm em dia');
} else {
    writeFileSync(destino, wasm);
    console.log(`app/compras.onda (${readFileSync(path.join(aqui, 'app/compras.onda'), 'utf8').split('\n').length} linhas) → app/compras.wasm, ${wasm.length} bytes`);
}
