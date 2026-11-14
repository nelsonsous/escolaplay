// Diagnosticos (it.138): um erro de tipo aponta o token onde comeca a expressao culpada (antes, o token a seguir), e
// diz os tipos; um nome que comeca por maiuscula avisa que isso e um operador.
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const ondac = path.join(__dirname, '..', 'build/ondac');

// a mensagem e a coluna do erro (o compilador sai com 1 e escreve o erro no stdout)
function erro(src) {
  let out = '';
  try { out = execFileSync(ondac, [], { input: src + '\n' }).toString(); } catch (e) { out = String(e.stdout); }
  const m = out.match(/#error onda: (.*) \(linha (\d+), coluna (\d+)\)/);
  assert.ok(m, 'sem erro para: ' + src);
  return [m[1], +m[3]];
}

test('erros de tipo apontam o operando culpado', () => {
  const casos = [
    // o exemplo das apps: o Ab recebe um inteiro; antes dava a coluna 22 (o = a seguir)
    [': f i>i x { = s Ab x = b + s 1 b } : main >i 0', 'esperava real', 20],
    [': main >i { = a A 2 ! a 1.5 0 }', 'esperava inteiro', 25],
    [': main >i + 1 2.0', 'tipos diferentes: inteiro e real', 15],
    [': main >i Mx 1 2.0', 'tipos diferentes: inteiro e real', 16],
    [': main >i % 1.0 2.0', 'operacao so para inteiros', 11],
    [': main >i W 1.0 0', 'condicao deve ser inteira', 13],
    [': main >i && 1 2.0', 'condicao deve ser inteira', 16],
    // o ? cujo primeiro ramo acaba num !f: aponta o segundo ramo e diz os dois tipos
    [': main >i ? 1 { 2 !f 0 1.5 } 0', 'ramos com tipos diferentes: o primeiro vale real, o segundo inteiro', 30],
    [': f i>i x x : main >i f 2.5', 'argumento com tipo errado: f espera inteiro', 25],
    [': main >i 1.5', 'tipo de retorno errado: o corpo vale real, a assinatura diz inteiro', 11],
    [': main >i { = x 1 = x 2.0 0 }', 'tipo de variavel mudou: x era inteiro, agora real', 21],
    [': g ii>i i a i : main >i { = d A 4 E d 4 g 1.0 0 }', 'argumento com tipo errado: g espera inteiro', 44],
  ];
  for (const [src, msg, col] of casos) assert.deepStrictEqual(erro(src), [msg, col], src);
});

test('um nome com maiuscula: diz que e um operador', () => {
  const [m1, c1] = erro(': main >i { = L 1 L }');
  assert.match(m1, /^= precisa de nome: L comeca por maiuscula, e o que comeca por maiuscula e um operador/);
  assert.strictEqual(c1, 15);
  const [m2] = erro(': main >i { = x 1 + x Total }');
  assert.match(m2, /^operacao desconhecida: Total comeca por maiuscula/);
  const [m3] = erro(': Foo >i 1 : main >i 0');
  assert.match(m3, /^nome invalido: Foo comeca por maiuscula/);
  // um operador que existe nao muda: = precisa de nome continua para os outros casos
  assert.deepStrictEqual(erro(': main >i { = 1 1 }'), ['= precisa de nome', 15]);
});

// it.158: a distância entre dois nomes deixava de contar o início do nome errado (um `0` a mais na conta), por isso
// um nome curto que acabasse como ele ganhava a todos: com a fala junta (`ha`, `eh`…), quase todos os enganos davam
// «quis dizer ha?». Agora é a distância de edição a sério.
test('nome desconhecido: sugere o nome mais parecido, e só se estiver mesmo perto', () => {
  const msg = (src) => erro(src)[0];
  // o nome parecido ganha a um nome curto que por acaso acaba como o errado, venha antes ou depois
  assert.strictEqual(msg(': ha i>i n n : entra i>i i i : main >i entraa 1'), 'nome desconhecido, quis dizer entra?');
  assert.strictEqual(msg(': entra i>i i i : ha i>i n n : main >i entraa 1'), 'nome desconhecido, quis dizer entra?');
  assert.strictEqual(msg(': main >i entraa 1 : entra i>i i i'), 'nome desconhecido, quis dizer entra?');
  // nada perto: não sugere nada
  assert.strictEqual(msg(': ha i>i n n : main >i entraa 1'), 'nome desconhecido');
  assert.strictEqual(msg(': soma ii>i a b + a b : main >i zzz 1 2'), 'nome desconhecido');
  assert.strictEqual(msg(': abc i>i n n : main >i xyc 1'), 'nome desconhecido');
  // a uma letra (a mais, a menos, trocada); num nome de 4 ou mais letras, até duas
  for (const errado of ['somma', 'som', 'sona']) assert.strictEqual(msg(`: soma ii>i a b + a b : main >i ${errado} 1 2`), 'nome desconhecido, quis dizer soma?', errado);
  assert.strictEqual(msg(': desenha >i 0 : main >i dezenhar'), 'nome desconhecido, quis dizer desenha?');
  assert.strictEqual(msg(': ha i>i n n : main >i he 1'), 'nome desconhecido, quis dizer ha?');
});
