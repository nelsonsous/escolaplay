// Frente de RI direta (-d): a Onda despe a sintaxe e expoe o GRAFO da RI (instrucoes [k d a b c x y]) -- a forma
// que uma IA emitiria diretamente, sem lexer nem parser. Este teste confere que o dump e bem formado (cabecalho
// com a contagem, uma linha de 7 numeros por instrucao, um retorno) e determinista. (Passo 1 da frente de RI; a
// ingestao -- a IA a emitir o grafo -- e o passo 2.)
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const R = path.join(__dirname, '..');
const ondac = path.join(R, 'build/ondac');
const dump = src => execFileSync(ondac, ['-d'], { input: Buffer.from(src) }).toString();

test('ri: -d expoe o grafo da RI, bem formado e determinista', () => {
  const src = ': main >i { = s 0 = i 0 W < i 10 { = s + s i = i + i 1 } s }\n';
  const d = dump(src);
  assert.match(d, /: main >i/, 'cabecalho da funcao');
  const m = d.match(/(\d+) instrucoes/);
  assert.ok(m, 'cabecalho com a contagem de instrucoes');
  const linhas = d.split('\n').filter(l => /^\d+ \d+ \d+ \d+ \d+ \d+ \d+/.test(l));
  assert.strictEqual(linhas.length, Number(m[1]), 'n de linhas de instrucao = contagem do cabecalho');
  assert.ok(linhas.some(l => l.startsWith('41 ')), 'tem a instrucao de retorno (kind 41)');
  assert.strictEqual(dump(src), d, 'o dump e determinista');
});

test('ri: os literais aparecem no grafo com o seu valor', () => {
  const d = dump(': main >f + 0.1 0.2\n');
  assert.match(d, /; lit 0\.1/, 'literal float 0.1 no grafo');
  assert.match(d, /; lit 0\.2/, 'literal float 0.2 no grafo');
});
