// Armazem partilhado por varios processos: com o trinco (flock) e a confirmacao por instantaneo, dois escritores
// em paginas diferentes do mesmo ficheiro nao se apagam. Sem isso, cada mapa privado reescrevia o ficheiro inteiro.
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync, execFile } = require('node:child_process');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const R = path.join(__dirname, '..');
const ondac = path.join(R, 'build/ondac');
const t = fs.mkdtempSync(path.join(os.tmpdir(), 'onda-conc-'));

// escreve val na posicao slot do armazem e confirma (Kc), reps vezes. args: slot val reps
const prog = `
: numa i>i i { = v 0 = j 0 W && >= Av i j '0 <= Av i j '9 { = v - + * v 10 Av i j '0 = j + j 1 } v }
: main >i {
  = k K 2000000
  = slot numa 1
  = val numa 2
  = reps numa 3
  = i 0
  W < i reps { ! + k slot val Kc = i + i 1 }
  0 }
`;
fs.writeFileSync(path.join(t, 'w.c'), execFileSync(ondac, [], { input: prog }));
execFileSync('cc', ['-O2', '-fwrapv', '-w', path.join(t, 'w.c'), '-o', path.join(t, 'w'), '-lm']);

const N = 8, SPACE = 600;   // slots afastados 600 palavras (4800 bytes > 4096) -> paginas diferentes
const run = (slot, val, reps, env) => new Promise((res, rej) =>
  execFile(path.join(t, 'w'), [String(slot), String(val), String(reps)], { env }, e => e ? rej(e) : res()));

test('N escritores concorrentes em paginas diferentes do mesmo armazem: nenhum apaga o outro', async () => {
  const f = path.join(t, 'c.arm');
  const env = { ...process.env, ONDA_ARM: f };
  await Promise.all(Array.from({ length: N }, (_, p) => run(p * SPACE, p + 100, 200, env)));
  // ler os slots (num processo so, depois dos concorrentes)
  const lerSrc = `: main >i { = k K 2000000 = p 0 W < p ${N} { N @ + k * p ${SPACE} P 10 = p + p 1 } 0 }`;
  fs.writeFileSync(path.join(t, 'r.c'), execFileSync(ondac, [], { input: lerSrc }));
  execFileSync('cc', ['-O2', '-fwrapv', '-w', path.join(t, 'r.c'), '-o', path.join(t, 'r'), '-lm']);
  const vals = execFileSync(path.join(t, 'r'), [], { env }).toString().trim().split('\n').map(Number);
  for (let p = 0; p < N; p++) assert.strictEqual(vals[p], p + 100, 'slot ' + (p * SPACE) + ' perdido ou corrompido');
});
