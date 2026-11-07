// Compila curador.onda com o compilador Onda (ondac.wasm, ele próprio escrito na Onda) e grava:
//   curador.wasm — o que a app, o Worker e a tarefa agendada correm
//   curador.c    — a mesma coisa em C, para o juiz (testes) compilar em nativo e comparar ao bit
//
//   ONDAC=/caminho/ondac.wasm node musica/onda/compilar.mjs [--verificar]
//
// O compilador não está no repositório (é teu e o repositório é público). Por omissão procura-o em
// $ONDAC, ~/.onda/ondac.wasm ou musica/onda/ondac.wasm (este último está no .gitignore).
// --verificar: não grava; falha se curador.wasm ou curador.c não corresponderem à fonte.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const AQUI = new URL('.', import.meta.url).pathname;

export function procurarCompilador() {
    const c = [process.env.ONDAC, join(homedir(), '.onda', 'ondac.wasm'), join(AQUI, 'ondac.wasm')].filter(Boolean);
    return c.find((p) => existsSync(p)) || null;
}

// Corre o compilador: flags [] → C; ['-w'] → WASM. Devolve os bytes da saída.
export async function ondac(compilador, fonte, flags) {
    const input = new TextEncoder().encode(fonte);
    const args = ['ondac', ...flags].map((s) => new TextEncoder().encode(s));
    const out = [];
    let ip = 0, mem = null, kb = -1n, code = 0;
    const words = (a, n) => new BigInt64Array(mem.buffer, (Number(a) + 16) * 8, n);
    const sys = (c, a, b) => {
        switch (Number(c)) {
            case 0: { const n = Number(b), v = words(a, n), u = new Uint8Array(n); for (let i = 0; i < n; i++) u[i] = Number(v[i] & 255n); out.push(u); return 0n; }
            case 1: return ip < input.length ? BigInt(input[ip++]) : -1n;
            case 2: code = Number(a); throw { ondaExit: code };
            case 3: return BigInt(args.length);
            case 4: { const s = args[Number(a)], j = Number(b); return s && j >= 0 && j < s.length ? BigInt(s[j]) : 0n; }
            case 6: return BigInt(Date.now() * 1000);
            case 7: { const need = (Number(a) + 16) * 8, cur = mem.buffer.byteLength; if (need > cur) mem.grow(Math.ceil((need - cur) / 65536)); return BigInt(mem.buffer.byteLength / 8 - 16); }
            case 8: { if (kb < 0n) { const z = Math.max(Number(a), 1); kb = words(-1, 1)[0]; const top = Number(kb) + z, need = (top + 16) * 8, cur = mem.buffer.byteLength; if (need > cur) mem.grow(Math.ceil((need - cur) / 65536)); words(-1, 1)[0] = BigInt(top); words(-7, 1)[0] = BigInt(mem.buffer.byteLength / 8 - 16); } return kb; }
        }
        return 0n;
    };
    const m1 = (c, x) => [Math.sin, Math.cos, Math.exp, Math.log][Number(c)](x);
    const m2 = (c, x, y) => (c === 0n ? Math.pow(x, y) : Math.atan2(x, y));
    const inst = await WebAssembly.instantiate(await WebAssembly.compile(readFileSync(compilador)), { env: { sys, m1, m2 } });
    mem = inst.exports.memory;
    try { inst.exports._start(); } catch (x) { if (x?.ondaExit === undefined) throw x; }
    const all = Buffer.concat(out.map((u) => Buffer.from(u)));
    const texto = all.toString('utf8');
    if (flags.includes('-w') ? !(all[0] === 0 && all[1] === 0x61 && all[2] === 0x73 && all[3] === 0x6d) : /#error onda/.test(texto)) {
        throw new Error('erro de compilação: ' + texto.trim().split('\n').find((l) => /onda/.test(l)));
    }
    return all;
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const compilador = procurarCompilador();
    if (!compilador) {
        console.error('Não encontrei o compilador Onda (ondac.wasm). Indica-o com ONDAC=/caminho/ondac.wasm.\n' +
            'Está embutido no artefacto «Onda · Editor» (o WebAssembly do script principal).');
        process.exit(2);
    }
    const fonte = readFileSync(join(AQUI, 'curador.onda'), 'utf8');
    const wasm = await ondac(compilador, fonte, ['-w']);
    const c = await ondac(compilador, fonte, []);
    if (process.argv.includes('--verificar')) {
        const okW = Buffer.compare(wasm, readFileSync(join(AQUI, 'curador.wasm'))) === 0;
        const okC = Buffer.compare(c, readFileSync(join(AQUI, 'curador.c'))) === 0;
        console.log(`curador.wasm ${okW ? 'atualizado' : 'DESATUALIZADO'} · curador.c ${okC ? 'atualizado' : 'DESATUALIZADO'}`);
        process.exit(okW && okC ? 0 : 1);
    }
    writeFileSync(join(AQUI, 'curador.wasm'), wasm);
    writeFileSync(join(AQUI, 'curador.c'), c);
    console.log(`curador.wasm ${wasm.length} B · curador.c ${c.length} B (compilador: ${compilador})`);
}
