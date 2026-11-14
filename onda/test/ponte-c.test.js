// A ponte C (sh build.sh --c): o compilador em C (seed/ondac.c), feito por um compilador de C, tem de escrever os
// mesmos bytes que o nativo (build/ondac) em todas as formas. No -a/-m (arm64) nao escrevia: o estado do arm64 vivia
// em M[63..68], e M[64..] e a zona dos dados. No nativo e no WebAssembly ai esta o preludio C, o primeiro texto do
// compilador, que o -a nao usa; no C os textos sao do C, o monte comeca logo em M[64] e la estava a fonte -- o -a
// apagava o nome do main ("nome desconhecido" no _go). Agora esse estado e o bloco 63 (aq/aqs, src/9arm64.onda).
const { test, before } = require('node:test');
const assert = require('node:assert');
const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const R = path.join(__dirname, '..');
const ondac = path.join(R, 'build/ondac');
const t = fs.mkdtempSync(path.join(os.tmpdir(), 'onda-ponte-c-'));
const ponte = path.join(t, 'ondac-c');

// como no build.sh --c
before(() => { execFileSync('cc', ['-O2', '-fwrapv', '-w', path.join(R, 'seed/ondac.c'), '-o', ponte, '-lm']); });

// o nativo tem de compilar (e dar um executavel ou objeto a serio, nao um #error igual nos dois); a ponte C, os
// mesmos bytes
const MAGIA = { '-x': '7f454c46', '-a': '7f454c46', '-m': 'cffaedfe', '-mx': 'cffaedfe', '-w': '0061736d' };
const igual = (src, flags, nome) => {
  const diz = nome + ' (' + (flags.join(' ') || 'C') + ')';
  const n = spawnSync(ondac, flags, { input: src, maxBuffer: 64 << 20 });
  const c = spawnSync(ponte, flags, { input: src, maxBuffer: 64 << 20 });
  assert.strictEqual(n.status, 0, diz + ': o nativo falhou: ' + n.stdout.toString().trim().slice(0, 200));
  if (MAGIA[flags[0]]) assert.strictEqual(n.stdout.subarray(0, 4).toString('hex'), MAGIA[flags[0]], diz + ': o nativo nao deu o formato certo');
  assert.strictEqual(c.status, 0, diz + ': a ponte C falhou: ' + c.stdout.toString().trim().slice(0, 200));
  assert.ok(c.stdout.equals(n.stdout), diz + ': a ponte C escreveu outros bytes');
};

test('ponte C: o -a e o -m de um programa pequeno dao os mesmos bytes que o nativo', () => {
  igual(': main >i 0\n', ['-a'], 'main vazio');
  igual(': main >i 0\n', ['-m'], 'main vazio');
});

// cada parte do bloco 63: ciclos (0), chamadas (1), ramos (2), chamadas a libSystem (3: threads e GPU no Mac),
// a entrada (4: R e Rb) e a GPU (5)
const PROGS = [
  ['Euclides', fs.readFileSync(path.join(R, 'ex/arm64.onda'))],
  ['ramos e chamadas', ': f i>i n ? < n 2 n + f - n 1 f - n 2\n' +
    ': main >i { = s 0 = i 0 W < i 25 { ? || == i 3 && > i 10 < i 20 { = s + s f i } 0 = i + i 1 } N s "\\n" s }\n'],
  ['threads', ': q ii>i i k * - i k + i 3\n: f ii>f i k { * Sn F + i k 0.001 }\n' +
    ': main >i { = n 100000 = a A n E a n q 5 N @ + a 777 " " N Bl S 300000 f 2 " " N S 200000 q 1 "\\n" 0 }\n'],
  ['entrada', ': nl ii>i i b == @ + b i 10\n: sb ii>i i b * + i 1 @ + b i\n' +
    ': main >i { = b A 1000 = n 0 = l 0 = h 0 = z 1 = c R W >= c 0 { = h + h c = k Rb b z = n + n k = l + l S k nl b' +
    ' = h + h S k sb b = z + % * z 7 997 1 = c ? > k 0 R -1 }\n  N n " " N l " " N h "\\n" 0 }\n'],
];

test('ponte C: ciclos, ramos, chamadas, entrada, threads e GPU dao os mesmos bytes no -a, -m e -mx (e no C, -x e -w)', () => {
  for (const [nome, src] of PROGS) for (const f of [[], ['-x'], ['-w'], ['-a'], ['-m'], ['-mx']]) igual(src, f, nome);
  igual(': main >i { = gs A 256 = d Gd gs ? d { ? @ + gs 7 { ? @ + gs 10 "ok\\n" "s\\n" } "q\\n" } "sem-gpu\\n" 0 }\n', ['-mx'], 'GPU');
});

test('ponte C: o proprio compilador (build/ondac.onda) sai igual ao nativo no -a, -m e -mx', () => {
  const src = fs.readFileSync(path.join(R, 'build/ondac.onda'));
  for (const f of [['-a'], ['-m'], ['-mx']]) igual(src, f, 'ondac.onda');
});
