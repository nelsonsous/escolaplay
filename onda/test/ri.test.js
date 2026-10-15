// Frente de RI direta: a Onda despe a sintaxe. -d imprime o GRAFO da RI (instrucoes [k d a b c x y]); -i volta
// a lê-lo e reconstroi a RI SEM parser, emitindo C. Prova que, para quem escreve de verdade (as IAs), basta o
// grafo -- a sintaxe de texto e so a pele humana. O teste faz o round-trip: texto -> -d -> -i -> C tem de dar o
// MESMO resultado que texto -> C, para programas de uma funcao do nucleo (inteiros, reais, ciclos, if, arrays).
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const R = path.join(__dirname, '..');
const ondac = path.join(R, 'build/ondac');
const t = fs.mkdtempSync(path.join(os.tmpdir(), 'onda-ri-'));

const gen = (flags, input) => execFileSync(ondac, flags, { input });              // texto -> C (ou RI, com -d)
const runExit = (cText, i) => {                                                    // compila e corre o C, devolve o exit
  const c = path.join(t, 'p' + i + '.c'), exe = path.join(t, 'p' + i);
  fs.writeFileSync(c, cText);
  execFileSync('cc', ['-O2', '-fwrapv', '-w', c, '-o', exe, '-lm']);
  try { execFileSync(exe); return 0; } catch (e) { if (typeof e.status === 'number') return e.status; throw e; }
};

const progs = [
  ': main >i { = s 0 = i 0 W < i 100 { = s + s i = i + i 1 } s }',           // soma 0..99
  ': main >i { = s 0.0 = i 0 W < i 10 { = s + s F i = i + i 1 } I s }',      // soma real -> int
  ': main >i { = a 100 = b 7 ? < a b a b }',                                 // if
  ': main >i { = n 20 = a A n = i 0 W < i n { ! + a i * i i = i + i 1 } @ + a 7 }', // array
  ': main >i { = a 1071 = b 462 W b { = r % a b = a b = b r } a }',          // Euclides
];

test('ri: -d expoe o grafo (cabecalho + instrucoes de 7 numeros)', () => {
  const d = gen(['-d'], Buffer.from(progs[0] + '\n')).toString();
  assert.match(d, /: main >i/, 'cabecalho da funcao');
  const linhas = d.split('\n').filter(l => /^\d+ \d+ /.test(l));
  assert.ok(linhas.length >= 5, 'tem linhas de instrucao');
  assert.ok(linhas.some(l => l.startsWith('41 ')), 'tem o retorno (kind 41)');
});

test('ri: round-trip -- o grafo re-ingerido (sem parser) da o mesmo que o texto', () => {
  let i = 0;
  for (const src of progs) {
    const input = Buffer.from(src + '\n');
    const direto = runExit(gen([], input).toString(), 'd' + i);
    const ri = gen(['-d'], input);
    const ingerido = runExit(gen(['-i'], ri).toString(), 'i' + i);
    assert.strictEqual(ingerido, direto, 'round-trip difere: ' + src.slice(0, 45));
    i++;
  }
});
