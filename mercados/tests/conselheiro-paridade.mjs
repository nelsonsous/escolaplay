// Paridade do conselheiro: corre o mesmo cenário no JS de referência (mercados/conselheiro/js/*.mjs) e na Onda
// (mercados/conselheiro/*.mjs → correr.mjs → conselheiro.wasm), com a rede e o relógio simulados
// (conselheiro-rede.mjs), e compara tudo: os ficheiros escritos, os pedidos (com os PUT do KV), o stdout, o stderr e o
// código de saída. Um erro que nenhum dos dois apanha (o JS mostra a pilha) compara-se pela linha "Tipo: mensagem".
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(here, '../..');
const REDE = path.join(here, 'conselheiro-rede.mjs');

// corre um lado: { codigo, stdout, stderr, ficheiros: { nome: texto }, registo }
export function correr(lado, cena, pasta, ms = {}) {
    const dir = mkdtempSync(path.join(tmpdir(), 'cons-'));
    const fc = path.join(dir, 'cena.json'), fr = path.join(dir, 'registo.json');
    writeFileSync(fc, JSON.stringify(cena));
    rmSync(pasta, { recursive: true, force: true });
    mkdirSync(pasta, { recursive: true });
    for (const [n, t] of Object.entries(cena.ficheiros || {})) writeFileSync(path.join(pasta, n), typeof t === 'string' ? t : JSON.stringify(t, null, 1));
    const script = path.join(raiz, 'mercados/conselheiro', lado === 'js' ? 'js' : '', cena.script + '.mjs');
    const args = (cena.args || []).map((a) => a.replace('{pasta}', pasta));
    const env = { ...process.env, CONSELHEIRO_CENA: fc, CONSELHEIRO_REGISTO: fr, ...(cena.env || {}) };
    for (const k of ['MERCADOS_PROXY', 'CF_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN', 'NODE_USE_ENV_PROXY']) if (!(cena.env && k in cena.env)) delete env[k];
    const t0 = process.hrtime.bigint();
    const r = spawnSync(process.execPath, ['--import', REDE, script, ...args], { env, cwd: raiz, maxBuffer: 256 << 20 });
    const t = Number(process.hrtime.bigint() - t0) / 1e6;
    const ficheiros = {};
    for (const n of readdirSync(pasta).sort()) ficheiros[n] = readFileSync(path.join(pasta, n), 'utf8');
    let registo = null;
    try { registo = JSON.parse(readFileSync(fr, 'utf8')); } catch { /* sem registo */ }
    rmSync(dir, { recursive: true, force: true });
    if (ms) ms[lado] = t;
    return { codigo: r.status, stdout: r.stdout.toString('utf8'), stderr: r.stderr.toString('utf8'), ficheiros, registo };
}
// a linha "Tipo: mensagem" de um erro por apanhar (no JS, depois da pilha)
const erroDe = (s) => (s.match(/^(?:Uncaught )?([A-Z]\w*Error|Error): .*$/m) || [''])[0];
// as diferenças entre os dois lados (lista vazia = iguais)
export function comparar(a, b) {
    const d = [];
    if (a.codigo !== b.codigo) d.push(`código de saída: JS ${a.codigo}, Onda ${b.codigo}`);
    if (a.stdout !== b.stdout) d.push(`stdout difere${primeira(a.stdout, b.stdout)}`);
    // um erro por apanhar: compara-se a linha "Tipo: mensagem" (o JS tem a pilha); num JSON inválido, as mensagens do
    // JSON.parse do V8 não se copiam: basta o tipo (SyntaxError)
    const crash = a.codigo === 1 && /\n\s+at /.test(a.stderr);
    const sintaxe = crash && /^SyntaxError: /.test(erroDe(a.stderr)) && /^SyntaxError: /.test(erroDe(b.stderr));
    if (crash ? !sintaxe && erroDe(a.stderr) !== erroDe(b.stderr) : a.stderr !== b.stderr) d.push(`stderr difere${primeira(crash ? erroDe(a.stderr) : a.stderr, crash ? erroDe(b.stderr) : b.stderr)}`);
    const nomes = [...new Set([...Object.keys(a.ficheiros), ...Object.keys(b.ficheiros)])];
    for (const n of nomes) if (a.ficheiros[n] !== b.ficheiros[n]) d.push(`${n} difere${primeira(a.ficheiros[n] ?? '(não há)', b.ficheiros[n] ?? '(não há)')}`);
    const pa = JSON.stringify(a.registo && a.registo.pedidos), pb = JSON.stringify(b.registo && b.registo.pedidos);
    if (pa !== pb) d.push(`pedidos diferem${primeiroPedido(a.registo, b.registo)}`);
    if (JSON.stringify(a.registo && a.registo.kv) !== JSON.stringify(b.registo && b.registo.kv)) d.push('KV final difere');
    return d;
}
function primeira(x, y) {
    x = String(x); y = String(y);
    let i = 0; while (i < x.length && x[i] === y[i]) i++;
    const ini = Math.max(0, i - 80);
    return `\n    JS:   ${JSON.stringify(x.slice(ini, i + 120))}\n    Onda: ${JSON.stringify(y.slice(ini, i + 120))}`;
}
function primeiroPedido(a, b) {
    const pa = (a && a.pedidos) || [], pb = (b && b.pedidos) || [];
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) if (JSON.stringify(pa[i]) !== JSON.stringify(pb[i])) return `\n    #${i} JS:   ${JSON.stringify(pa[i])}\n    #${i} Onda: ${JSON.stringify(pb[i])}`;
    return ` (${pa.length} vs ${pb.length})`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) && process.argv[2] === '--lado') {
    // usado pelo teste: --lado js|onda --pasta P, o cenário no stdin, o resultado (JSON) no stdout
    const cena = JSON.parse(readFileSync(0, 'utf8'));
    const ms = {};
    const r = correr(process.argv[3], cena, process.argv[5], ms);
    process.stdout.write(JSON.stringify({ ...r, ms: ms[process.argv[3]] }));
} else if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    // node mercados/tests/conselheiro-paridade.mjs cena.json — corre um cenário e mostra as diferenças
    const cena = JSON.parse(readFileSync(process.argv[2], 'utf8'));
    const pasta = path.join(tmpdir(), 'cons-paridade');
    const ms = {};
    const a = correr('js', cena, pasta, ms), b = correr('onda', cena, pasta, ms);
    const d = comparar(a, b);
    console.log(d.length ? d.join('\n') : 'iguais', `\n(JS ${ms.js.toFixed(0)} ms, Onda ${ms.onda.toFixed(0)} ms; ${(a.registo && a.registo.pedidos.length) || 0} pedidos)`);
    if (process.argv.includes('--mostrar')) { console.log('--- JS stderr\n' + a.stderr + '\n--- Onda stderr\n' + b.stderr); }
}
