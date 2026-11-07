// Compila o motor de curadoria e a app com o compilador Onda do repositório (onda/seed/ondac.wasm) e grava:
//   curador.wasm — motor.onda + curador.onda: o programa de linha de comando (tarefa agendada, testes)
//   curador.c    — o mesmo em C, para o juiz (testes) compilar em nativo e comparar ao bit
//   ../app/musica.wasm — onda/lib/app.onda + motor.onda + ../app/musica.onda: a app, uma «app em Onda»
//
//   node musica/onda/compilar.mjs [--verificar]        (ONDAC=/caminho/ondac.wasm para usar outro compilador)
// --verificar: não grava; falha se algum compilado não corresponder às fontes.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const AQUI = new URL('.', import.meta.url).pathname;

export function procurarCompilador() {
    const c = [process.env.ONDAC, join(AQUI, '..', '..', 'onda', 'seed', 'ondac.wasm'), join(homedir(), '.onda', 'ondac.wasm')].filter(Boolean);
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

// As fontes de cada compilado (a Onda junta-se por concatenação, como a biblioteca de apps)
export function fontes() {
    const ler = (f) => readFileSync(join(AQUI, f), 'utf8');
    const motor = ler('motor.onda');
    const lib = join(AQUI, '..', '..', 'onda', 'lib', 'app.onda');
    const app = join(AQUI, '..', 'app', 'musica.onda');
    return {
        curador: motor + '\n' + ler('curador.onda'),
        app: existsSync(app) && existsSync(lib) ? readFileSync(lib, 'utf8') + '\n' + motor + '\n' + readFileSync(app, 'utf8') : null,
    };
}
export async function compilarTudo(compilador) {
    const f = fontes();
    return {
        'curador.wasm': await ondac(compilador, f.curador, ['-w']),
        'curador.c': await ondac(compilador, f.curador, []),
        ...(f.app ? { '../app/musica.wasm': await ondac(compilador, f.app, ['-w']) } : {}),
    };
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const compilador = procurarCompilador();
    if (!compilador) {
        console.error('Não encontrei o compilador Onda (onda/seed/ondac.wasm). Indica-o com ONDAC=/caminho/ondac.wasm.');
        process.exit(2);
    }
    const tudo = await compilarTudo(compilador);
    if (process.argv.includes('--verificar')) {
        let ok = true;
        for (const [nome, bytes] of Object.entries(tudo)) {
            const igual = existsSync(join(AQUI, nome)) && Buffer.compare(bytes, readFileSync(join(AQUI, nome))) === 0;
            ok &&= igual;
            console.log(`${nome.replace('../', '')} ${igual ? 'atualizado' : 'DESATUALIZADO'}`);
        }
        process.exit(ok ? 0 : 1);
    }
    for (const [nome, bytes] of Object.entries(tudo)) {
        writeFileSync(join(AQUI, nome), bytes);
        console.log(`${nome.replace('../', '')} ${bytes.length} B`);
    }
    console.log(`(compilador: ${compilador})`);
}
