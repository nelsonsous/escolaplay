// juiz -- o juiz unico da Onda, como ferramenta: compila UM programa por TODAS as formas e verifica que
// concordam, bit a bit. E o principio do manifesto (it.1) tornado comando: cada forma tem de dar o mesmo
// significado antes de ser usada. "Melhor que o que ha": um so programa, varios geradores de codigo
// INDEPENDENTES -- C (via cc), x86-64 e ARM64 escritos byte a byte pela propria Onda (sem assembler nem
// linker), WebAssembly idem -- todos a produzir a mesma saida, ao bit.
//
// uso: node tools/juiz.mjs <programa.onda> [args...]
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const R = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const ondac = path.join(R, 'build', 'ondac');
const file = process.argv[2];
if (!file) { console.error('uso: node tools/juiz.mjs <programa.onda> [args...]'); process.exit(2); }
const args = process.argv.slice(3);
const src = fs.readFileSync(file);
const t = fs.mkdtempSync(path.join(os.tmpdir(), 'juiz-'));

const haveQemu = (() => { try { execFileSync('sh', ['-c', 'command -v qemu-aarch64-static']); return true; } catch { return false; } })();

// corre um comando e devolve {out, code}; um erro de execucao traz o codigo de saida
const exec = (cmd, a, opts = {}) => {
  try { return { out: execFileSync(cmd, a, { ...opts }).toString(), code: 0 }; }
  catch (e) { if (typeof e.status === 'number') return { out: (e.stdout || '').toString(), code: e.status }; throw e; }
};

// cada forma: compila e corre, ou devolve {skip} com o motivo (ex.: o -a ainda nao faz chamadas/impressao)
const formas = {
  'significado (C -O2)': () => {
    const c = path.join(t, 'p.c'); fs.writeFileSync(c, execFileSync(ondac, [], { input: src }));
    execFileSync('cc', ['-O2', '-fwrapv', '-w', '-fopenmp', c, '-o', path.join(t, 'pc'), '-lm']);
    return exec(path.join(t, 'pc'), args);
  },
  'x86-64 nativo (-x)': () => {
    fs.writeFileSync(path.join(t, 'px'), execFileSync(ondac, ['-x'], { input: src }), { mode: 0o755 });
    return exec(path.join(t, 'px'), args);
  },
  'WebAssembly (-w)': () => {
    fs.writeFileSync(path.join(t, 'p.wasm'), execFileSync(ondac, ['-w'], { input: src }));
    return exec('node', [path.join(R, 'wasm', 'host.js'), path.join(t, 'p.wasm'), ...args]);
  },
  'ARM64 nativo (-a)': () => {
    if (!haveQemu) return { skip: 'qemu-aarch64-static nao instalado' };
    let bin;
    try { bin = execFileSync(ondac, ['-a'], { input: src }); }
    catch (e) { return { skip: 'o -a ainda nao suporta este programa' }; }
    const s = bin.toString('latin1');
    if (s.startsWith('#error') || s.includes('#error onda')) return { skip: 'o -a ainda nao suporta este programa' };
    fs.writeFileSync(path.join(t, 'pa'), bin, { mode: 0o755 });
    return exec('qemu-aarch64-static', [path.join(t, 'pa'), ...args]);
  },
};

const res = {};
for (const [nome, run] of Object.entries(formas)) {
  try { res[nome] = run(); } catch (e) { res[nome] = { erro: (e.message || String(e)).split('\n')[0] }; }
}

// a referencia e o significado (C). As formas que correram tem de bater com ela, ao bit.
// (normaliza o tempo de parede "em N ms" -- convencao dos benchmarks -- que varia por corrida, nao por forma.)
const ref = res['significado (C -O2)'];
const norm = s => s.replace(/ em \d+ ms/g, ' em <t> ms');
const chave = r => JSON.stringify([norm(r.out), r.code]);
let todasOk = true, correram = 0;
console.log(`\njuiz: ${path.basename(file)}${args.length ? ' ' + args.join(' ') : ''}\n`);
for (const [nome, r] of Object.entries(res)) {
  if (r.skip) { console.log(`  —  ${nome.padEnd(22)} ${r.skip}`); continue; }
  if (r.erro) { console.log(`  ✗  ${nome.padEnd(22)} erro: ${r.erro}`); todasOk = false; continue; }
  correram++;
  const ok = ref && !ref.skip && !ref.erro && chave(r) === chave(ref);
  if (nome === 'significado (C -O2)') { console.log(`  ·  ${nome.padEnd(22)} referencia (saida ${r.out.length} bytes, codigo ${r.code})`); continue; }
  console.log(`  ${ok ? '✓' : '✗'}  ${nome.padEnd(22)} ${ok ? 'concorda com o significado, ao bit' : 'DIVERGE'}`);
  if (!ok) {
    todasOk = false;
    if (ref && ref.out !== undefined) {
      const a = norm(ref.out).split('\n'), b = norm(r.out).split('\n');
      const i = a.findIndex((l, k) => l !== b[k]);
      if (r.code !== ref.code) console.log(`         codigo ${r.code} vs ${ref.code} (referencia)`);
      if (i >= 0) { console.log(`         ref : ${JSON.stringify((a[i] || '').slice(0, 72))}`); console.log(`         esta: ${JSON.stringify((b[i] || '').slice(0, 72))}`); }
    }
  }
}
console.log('');
if (todasOk && correram >= 1) { console.log(`VEREDITO: todas as formas que correram concordam, ao bit.\n`); process.exit(0); }
console.log(`VEREDITO: ha divergencia entre formas.\n`); process.exit(1);
