// Compila o conselheiro em Onda — os scripts da tarefa agendada (mercados/conselheiro/onda/*.onda) com a análise
// (mercados/onda/*.onda, a mesma da app) — num só módulo WebAssembly: mercados/conselheiro/conselheiro.wasm.
//   node mercados/conselheiro/onda/build.mjs              → grava o módulo
//   node mercados/conselheiro/onda/build.mjs --verificar  → só confirma que o módulo gravado corresponde às fontes
// O correr.mjs corre-o com o anfitrião Node (onda/rt/anfitriao-node.js).
//
// Ligação (a Onda só tem M[0..63] de globais, e a análise usa-os todos): os nomes g_* são palavras num bloco que o
// main reserva logo ao começar (o primeiro A do programa, num endereço fixo); `#g g_nome n` dá-lhe n palavras. Os
// nomes k_* são textos constantes ("k_price" → "price"; `#k k_nome texto` para outro texto), feitos uma vez no
// k_ini. O endereço do bloco sai de uma primeira compilação (o topo do monte depois do _ini do runtime), e a segunda
// usa-o: só mudam números no código, não os dados, por isso o endereço não muda (confirma-se).
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(here, '../../..');
const ondac = path.join(raiz, 'onda/build/ondac');
export const DESTINO = path.join(raiz, 'mercados/conselheiro/conselheiro.wasm');
export const FONTES = ['js.onda', 'comum.onda', 'dados.onda', 'universo.onda', 'outros.onda', 'publicar.onda', 'backtest.onda', 'main.onda'];

// as fontes da análise, pela ordem do build da app (mercados/onda/build.mjs); o main dela não entra (o nosso é outro)
function analise() {
    const b = readFileSync(path.join(raiz, 'mercados/onda/build.mjs'), 'utf8');
    const lista = JSON.parse(b.match(/export const FONTES = (\[[^\]]*\])/)[1].replace(/'/g, '"'));
    return lista.map((f) => readFileSync(path.join(raiz, 'mercados/onda', f), 'utf8')).join('\n').replace(/^: main >i/m, ': amain >i');
}

// os tokens fora de comentários e de textos
function tokens(src) {
    const out = [];
    for (const linha of src.split('\n')) {
        let i = 0;
        while (i < linha.length) {
            while (i < linha.length && /\s/.test(linha[i])) i++;
            if (i >= linha.length || linha[i] === '#') break;
            if (linha[i] === '"') { i++; while (i < linha.length && linha[i] !== '"') i += linha[i] === '\\' ? 2 : 1; i++; continue; }
            const j = i; while (i < linha.length && !/\s/.test(linha[i])) i++;
            out.push(linha.slice(j, i));
        }
    }
    return out;
}

export function fonte(base = 0) {
    const src = FONTES.filter((f) => existsSync(path.join(here, f))).map((f) => readFileSync(path.join(here, f), 'utf8')).join('\n');
    const tam = {}, txt = {};
    for (const m of src.matchAll(/^#g (g_\w+) (\d+)\s*$/gm)) tam[m[1]] = Number(m[2]);
    for (const m of src.matchAll(/^#k (k_\w+) (.*)$/gm)) txt[m[1]] = m[2];
    const tk = tokens(src);
    const gs = [...new Set(tk.filter((t) => /^g_\w+$/.test(t)))].sort();
    const ks = [...new Set(tk.filter((t) => /^k_\w+$/.test(t)))].filter((k) => k !== 'k_ini').sort();
    let p = base;
    const L = [];
    for (const g of gs) { L.push(`: ${g} >i ${p}`); p += tam[g] || 1; }
    const k0 = p;
    ks.forEach((k, j) => L.push(`: ${k} >i @ ${k0 + j}`));
    p += ks.length;
    const esc = (s) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    L.push(`: k_ini >i { = t 0`, ...ks.map((k, j) => `  = t tx_ini "${esc(txt[k] ?? k.slice(2))}" ! ${k0 + j} tx_fim t`), '  0 }');
    L.push(`: gb >i ${base}`, `: gn >i ${p - base}`);
    return { texto: analise() + '\n' + src + '\n# ---------- gerado pelo build.mjs ----------\n' + L.join('\n') + '\n', globais: gs.length, constantes: ks.length, palavras: p - base };
}

function compilar(texto) {
    if (!existsSync(ondac)) execFileSync('sh', [path.join(raiz, 'onda/build.sh')], { stdio: 'inherit' });
    let w;
    try { w = execFileSync(ondac, ['-w'], { input: texto, maxBuffer: 64 << 20 }); } catch (e) { throw new Error(String(e.stdout || '') + String(e.stderr || '')); }
    if (w.subarray(0, 4).toString('latin1') !== '\0asm') throw new Error(w.toString().slice(0, 2000));
    return w;
}
// o topo do monte quando o main começa (depois do _ini do runtime): onde fica o primeiro A
function topo(w) {
    let mem;
    const sys = (c, a) => {
        if (Number(c) === 7) { const need = (Number(a) + 16) * 8, cur = mem.buffer.byteLength; if (need > cur) mem.grow(Math.ceil((need - cur) / 65536)); return BigInt(mem.buffer.byteLength / 8 - 16); }
        return 0n;
    };
    const ex = new WebAssembly.Instance(new WebAssembly.Module(w), { env: { sys, m1: Math.sin, m2: Math.pow } }).exports;
    mem = ex.memory;
    ex._ini();
    return Number(new BigInt64Array(mem.buffer, 0, 16)[15]);
}

export function construir() {
    const base = topo(compilar(fonte(0).texto));
    const f = fonte(base);
    const w = compilar(f.texto);
    if (topo(w) !== base) throw new Error('conselheiro: o endereço dos globais mudou entre as duas compilações');
    return { wasm: w, base, ...f };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    let r;
    try { r = construir(); } catch (e) { process.stderr.write(e.message + '\n'); process.exit(1); }
    const linhas = FONTES.filter((f) => existsSync(path.join(here, f))).reduce((a, f) => a + readFileSync(path.join(here, f), 'utf8').split('\n').length - 1, 0);
    if (process.argv.includes('--verificar')) {
        const ok = existsSync(DESTINO) && Buffer.compare(r.wasm, readFileSync(DESTINO)) === 0;
        console.log(`conselheiro.wasm ${ok ? 'atualizado' : 'DESATUALIZADO (correr node mercados/conselheiro/onda/build.mjs)'}`);
        process.exit(ok ? 0 : 1);
    }
    writeFileSync(DESTINO, r.wasm);
    console.log(`conselheiro.wasm: ${linhas} linhas de Onda (mais a análise), ${r.wasm.length} bytes; ${r.globais} globais, ${r.constantes} textos constantes, bloco de ${r.palavras} palavras em M[${r.base}]`);
}
