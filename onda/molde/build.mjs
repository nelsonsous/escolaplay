// Monta a app: junta a biblioteca da Onda (onda/lib) e o app.onda, compila para WebAssembly (gerado/app.wasm) e
// copia o anfitrião (gerado/anfitriao.js). Só entram no módulo as funções que a app usa.
//   node build.mjs               (ONDA=/caminho/para/onda se a pasta já não estiver dentro de onda/)
//   node build.mjs --verificar   não escreve nada: falha se o que está em gerado/ não é o da app de agora
// Num erro do compilador, diz também em que ficheiro e em que linha dele está (o compilador conta as linhas do
// texto todo junto, a biblioteca e a app).
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const onda = process.env.ONDA ? path.resolve(process.env.ONDA) : path.join(aqui, '..');
const ondac = path.join(onda, 'build/ondac');
if (!existsSync(ondac)) execFileSync('sh', [path.join(onda, 'build.sh')], { stdio: 'inherit' });

// a biblioteca toda, pela ordem do onda/lib/LEIA.md: o que a app não usa não entra no módulo
const MODULOS = ['memoria', 'texto', 'numero', 'valor', 'json', 'arvore', 'data', 'ordenar', 'html', 'grafico', 'anfitriao', 'tempo', 'fala'];
// as funções que o anfitrião chama (o main e as dos eventos): o resto fica privado e o que não se usa não entra
const EVENTOS = ['main', 'clique', 'escreve', 'lido'];

const partes = [...MODULOS.map((m) => path.join(onda, 'lib', m + '.onda')), path.join(aqui, 'app.onda')];
const textos = partes.map((f) => readFileSync(f, 'utf8'));
// num erro o compilador sai com 1 e escreve-o na saída: apanha-se aqui, para se ler o erro e não a pilha do Node
let wasm;
try { wasm = execFileSync(ondac, ['-w', ...EVENTOS], { input: textos.join('\n'), maxBuffer: 1 << 26, stdio: ['pipe', 'pipe', 'pipe'] }); } catch (e) { wasm = e.stdout && e.stdout.length ? e.stdout : Buffer.from(String((e.stderr && e.stderr.length && e.stderr) || e.message)); }
if (wasm.subarray(0, 4).toString('latin1') !== '\0asm') {
    const erro = wasm.toString().trimEnd(), m = erro.match(/\(linha (\d+), coluna (\d+)\)/);
    let onde = '';
    for (let i = 0, n = m ? Number(m[1]) : 0; m && i < partes.length; i++) {
        const linhas = textos[i].split('\n').length;
        if (n <= linhas) { onde = `\n→ ${path.relative(process.cwd(), partes[i])}, linha ${n}, coluna ${m[2]}`; break; }
        n -= linhas;
    }
    console.error(erro + onde);
    process.exit(1);
}
const anfitriao = readFileSync(path.join(onda, 'rt/anfitriao.js'));
const linhas = textos[textos.length - 1].split('\n').length;
if (process.argv.includes('--verificar')) {
    const igual = (f, b) => existsSync(path.join(aqui, f)) && readFileSync(path.join(aqui, f)).equals(b);
    const velhos = [['gerado/app.wasm', wasm], ['gerado/anfitriao.js', anfitriao]].filter(([f, b]) => !igual(f, b)).map(([f]) => f);
    if (velhos.length) { console.error(`${velhos.join(' e ')} não ${velhos.length > 1 ? 'são os' : 'é o'} da app de agora: corre «node ${path.relative(process.cwd(), fileURLToPath(import.meta.url))}»`); process.exit(1); }
    console.log(`gerado/ em dia: app.onda (${linhas} linhas) → gerado/app.wasm, ${wasm.length} bytes`);
} else {
    mkdirSync(path.join(aqui, 'gerado'), { recursive: true });
    writeFileSync(path.join(aqui, 'gerado/app.wasm'), wasm);
    copyFileSync(path.join(onda, 'rt/anfitriao.js'), path.join(aqui, 'gerado/anfitriao.js'));
    console.log(`app.onda (${linhas} linhas) → gerado/app.wasm, ${wasm.length} bytes`);
}
