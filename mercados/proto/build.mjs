// Monta o protótipo: compila campo.onda para WebAssembly (os campos na CPU) e a função `fundo` para GLSL (placa
// gráfica), e junta os dados do mapa. Tudo fica em gerado/proto-dados.js, para a página abrir sem mais pedidos.
//   node mercados/proto/build.mjs
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const onda = path.join(aqui, '../../onda');
const ondac = path.join(onda, 'build/ondac');
if (!existsSync(ondac)) execFileSync('sh', [path.join(onda, 'build.sh')], { stdio: 'inherit' });
const fonte = readFileSync(path.join(aqui, 'campo.onda'));
const compila = (args) => {
    const out = execFileSync(ondac, args, { input: fonte, maxBuffer: 1 << 26 });
    if (out.subarray(0, 12).toString().startsWith('#error')) throw new Error(out.toString());
    return out;
};
const wasm = compila(['-w']);
const glsl = compila(['-g', 'fundo']).toString();

// mapa: só o que o ecrã usa (símbolo, nome, tipo, variação do dia, 1 ano)
const U = JSON.parse(readFileSync(path.join(aqui, 'dados/universo.json'), 'utf8'));
const T = { etf: 0, crypto: 1, stock: 2 };
const uni = { data: U.date, s: [], n: [], t: [], d: [], y: [] };
for (const r of U.rows) {
    if (!Number.isFinite(r.d)) continue;
    uni.s.push(r.s); uni.n.push(r.n); uni.t.push(T[r.t] ?? 2); uni.d.push(r.d); uni.y.push(Number.isFinite(r.y) ? r.y : null);
}
mkdirSync(path.join(aqui, 'gerado'), { recursive: true });
writeFileSync(path.join(aqui, 'gerado/proto-dados.js'),
    `// GERADO por node mercados/proto/build.mjs a partir de campo.onda (${fonte.toString().split('\n').length} linhas de Onda) — não editar à mão.\n`
    + `window.PROTO = { wasm: ${JSON.stringify(wasm.toString('base64'))},\n glsl: ${JSON.stringify(glsl)},\n uni: ${JSON.stringify(uni)} };\n`);
console.log(`campo.onda → ${wasm.length} bytes de WASM, ${glsl.length} de GLSL; mapa com ${uni.s.length} ativos (${uni.data})`);
