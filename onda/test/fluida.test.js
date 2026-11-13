// A Onda fluida (it.141): moldes de texto com crase e interpolacao, o ponto (a.b), Se, L e parenteses conferidos;
// e o molde com nome (it.151): f`...`, o texto de um molde como argumento.
// Tudo desce a representacao intermedia que ja havia, por isso tem de dar o mesmo em C, WebAssembly, x86 e arm64
// (-a, no qemu, quando ha); os erros dizem a linha e a coluna; o significado le a mesma sintaxe.
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const R = path.join(__dirname, '..');
const ondac = path.join(R, 'build/ondac');
const t = fs.mkdtempSync(path.join(os.tmpdir(), 'onda-fluida-'));
let qemu = null;
for (const q of ['qemu-aarch64-static', 'qemu-aarch64']) {
  try { execFileSync('sh', ['-c', 'command -v ' + q]); qemu = q; break; } catch (e) {}
}
const corre = (src) => {
  const out = {};
  fs.writeFileSync(path.join(t, 'p.c'), execFileSync(ondac, [], { input: src }));
  execFileSync('cc', ['-O2', '-fwrapv', '-w', path.join(t, 'p.c'), '-o', path.join(t, 'pc'), '-lm']);
  out.c = execFileSync(path.join(t, 'pc')).toString();
  fs.writeFileSync(path.join(t, 'p.wasm'), execFileSync(ondac, ['-w'], { input: src }));
  out.w = execFileSync('node', [path.join(R, 'wasm/host.js'), path.join(t, 'p.wasm')]).toString();
  fs.writeFileSync(path.join(t, 'px'), execFileSync(ondac, ['-x'], { input: src }), { mode: 0o755 });
  out.x = execFileSync(path.join(t, 'px')).toString();
  if (qemu) {
    fs.writeFileSync(path.join(t, 'pa'), execFileSync(ondac, ['-a'], { input: src }), { mode: 0o755 });
    out.a = execFileSync(qemu, [path.join(t, 'pa')]).toString();
  }
  return out;
};
const iguais = (o, msg) => { for (const k of Object.keys(o)) assert.strictEqual(o[k], o.c, `${msg}: ${k} difere do C`); };
// a mensagem de erro do compilador (a seguir a "#error onda: "), em qualquer forma
const erro = (src, modo = '-w') => {
  const r = spawnSync(ondac, [modo], { input: src });
  const m = /#error onda: ([^\n]*)/.exec(r.stdout.toString());
  return m ? m[1] : null;
};
const lib = (...ms) => ms.map((m) => fs.readFileSync(path.join(R, 'lib', m + '.onda'), 'utf8')).join('\n');

test('moldes: `texto { codigo } texto` imprime, com as aspas sem escape; igual em todas as formas', () => {
  const src = `
: cls i>i n ? > n 1 \`grande\` \`pequeno\`
: main >i {
  \`<div class="a" data-x='1'>ola</div>\` P 10
  = s 7
  \`s={N s}; dobro={ N * s 2 }; fim\` P 10
  \`{N 1}{N 2}\` P 10
  \`acaba num codigo: {N 9}\` P 10
  \`{ P 'a }começa num código\` P 10
  # dentro de uma interpolacao cabem blocos, outros moldes e textos de aspas
  = j 0 W < j 3 { \`<li class="{ cls j }">{ ? == j 1 { "um" 0 } { N j } }</li>\` = j + j 1 } P 10
  \`escapes: \\{ \\} \\\` \\\\ \\"aspas\\" tab[\\t] e uma } solta\` P 10
  \`duas
linhas\` P 10
  # um molde vale 0 e serve onde serve uma expressao
  N + \`a\` \`b{N 1}\` P 10
  = t A 40 ! t + t 1 O t \`x="{N 5}"\` O 0 N - - @ t t 1 P 10
  0 }`;
  const o = corre(src);
  assert.strictEqual(o.c, '<div class="a" data-x=\'1\'>ola</div>\ns=7; dobro=14; fim\n12\nacaba num codigo: 9\nacomeça num código\n'
    + '<li class="pequeno">0</li><li class="pequeno">um</li><li class="grande">2</li>\nescapes: { } ` \\ "aspas" tab[\t] e uma } solta\nduas\nlinhas\nab10\n5\n');
  iguais(o, 'moldes');
});

test('Se c b e L i n b: sem o ramo vazio nem o contador a mao; ( ) confere uma expressao', () => {
  const src = `
: dobro i>i x (* x 2)
: tri i>i n { = s 0 L i n { L j (+ i 1) = s + s 1 } s }
: main >i {
  = s 0
  L i 5 = s (+ s i)
  N s P 32 N i P 10
  # o corpo do Se pode ser de qualquer tipo, e o Se vale sempre 0
  = x 1.5
  Se > s 3 = x * x 2.0
  Se < s 3 { = x 0.0 }
  G x P 32 N Se 1 7.5 P 32 N + 1 Se 0 9 P 10
  # o limite do L calcula-se uma vez; a variavel pode ja existir e o corpo pode mexer-lhe
  = n 3
  L k n { = n + n 10 P 'k }
  P 32 N n P 32 N k P 10
  = k 100
  L k 6 { Se == k 1 = k 3 N k }
  P 32 N k P 10
  L z 0 P '!
  L z -3 P '!
  N tri 4 P 32 N dobro (dobro 5) P 32 N (+ (* 2 3) (- 10 4)) P 10
  # chavetas e parenteses sao tokens sozinhos, com ou sem espacos
  N {= q 4 (+ q 1)} P '( P ') P '{ P '} P 10
  0 }`;
  const o = corre(src);
  assert.strictEqual(o.c, '10 5\n3 0 1\nkkk 33 3\n0345 6\n10 20 12\n5(){}\n');
  iguais(o, 'Se, L e parenteses');
});

test('a.b: o leitor troca por _mb a $"b"; a.b.c encadeia; textos constantes iguais partilham o endereco', () => {
  // com uma _mb do proprio programa: um registo de 3 palavras, a chave escolhe a palavra pela primeira letra
  const src = `
: _mb ii>i r k @ + r - @ + k 1 'a
: eu >i @ 0
: main >i {
  = r A 3 = f A 3 ! r 11 ! + r 1 22 ! + r 2 f ! f 5 ! + f 2 7
  ! 0 r
  N r.a P 32 N r.b P 32 N r.c.a P 32 N r.c.c P 32 N eu.b P 32 N + r.a r.b P 10
  \`{N r.a}-{N r.c.c}\` P 10
  0 }
`;
  const o = corre(src);
  assert.strictEqual(o.c, '11 22 5 7 22 33\n11-7\n');
  iguais(o, 'a.b');
  // a chave do ponto, um $"..." e um $\`...\` com o mesmo texto sao o mesmo endereco
  const o2 = corre(': _mb ii>i r k k\n: main >i { = r 0 N == r.nome $"nome" N == $"nome" $`nome` N == r.nome r.outro N == r.nome\n r.nome P 10 0 }\n');
  assert.strictEqual(o2.c, '1101\n');
  iguais(o2, 'textos iguais');
  // com a biblioteca: o membro de um no da arvore (o que a ponte de uma app escreve, ou o _ar_json le)
  const src3 = lib('memoria', 'texto', 'numero', 'valor', 'json', 'arvore') + `
: main >i {
  = r _ar_json $\`{"nome":"A&B","preco":12.5,"dono":{"id":7,"tags":["x","y"]}}\`
  \`<b title="{ _ar_ps r.nome 1 }">{ _nu_ps _ar_num r.preco }</b> { N I _ar_num r.dono.id } { N _ar_n r.dono.tags } { N _ar_tipo r.falta }\` P 10
  0 }
`;
  for (const m of ['-w', '-x']) {
    const f = path.join(t, m === '-w' ? 'l.wasm' : 'lx');
    fs.writeFileSync(f, execFileSync(ondac, [m], { input: src3, maxBuffer: 1 << 26 }), { mode: 0o755 });
    const out = m === '-w' ? execFileSync('node', [path.join(R, 'wasm/host.js'), f]).toString() : execFileSync(f).toString();
    assert.strictEqual(out, '<b title="A&amp;B">12.5</b> 7 2 0\n', m);
  }
});

test('molde com nome (it.151): f`...` da o texto do molde como 1.o argumento de f; igual em todas as formas', () => {
  // com um _ta e um _tf do proprio programa (um texto de cada vez, guardado em M[0]): o compilador so os chama
  const src = `
: _ta >i { = t A 200 ! 0 t ! t + t 1 O t 0 }
: _tf >i { O 0 @ 0 }
: len i>i t - - @ t t 1
: mostra i>i t { P '[ = j 0 W < j len t { P @ + + t 1 j = j + j 1 } P '] N len t P 10 }
: dois ii>i t n { mostra t N n P 10 }
: main >i {
  mostra\`ola\`
  = n 7
  mostra\`Erro { N n } do "conector" \\{x\\}.\`
  dois\`a{ N * n 2 }\` 5
  mostra\`\`
  0 }
`;
  const o = corre(src);
  assert.strictEqual(o.c, '[ola]3\n[Erro 7 do "conector" {x}.]25\n[a14]3\n5\n[]0\n');
  iguais(o, 'molde com nome');
  // com a biblioteca (lib/texto.onda): abrem-se uns dentro dos outros, os outros argumentos vem a seguir, a saida
  // volta a ser a de antes, e o texto\`...\` da fala da so o texto
  const src2 = lib('memoria', 'texto', 'numero', 'valor', 'json', 'arvore', 'data', 'ordenar', 'html', 'anfitriao', 'fala') + `
: mostra i>i t { "[" _tx_p t "]" N _tx_len t P 10 }
: junta ii>i a b { _tx_p a P '+ _tx_p b P 10 }
: main >i {
  = n 7
  = u texto\`/api/itens/{ N n }?q={ _tx_uri $"á b" }\`
  mostra u
  mostra\`fora { crut texto\`dentro { N n }\` } fim\`
  junta\`x\` texto\`y{ N 1 }\`
  = g _tx_abre 50 \`antes { crut texto\`meio\` } depois\` _tx_fecha g mostra g
  = c A 1 L i 3000 P 'a = z texto\`{ L i 3000 P 'a }\` N _tx_len z P 10
  N @ -2 P 10
  0 }
`;
  for (const m of ['-w', '-x']) {
    const f = path.join(t, m === '-w' ? 'm.wasm' : 'mx');
    fs.writeFileSync(f, execFileSync(ondac, [m, 'main'], { input: src2, maxBuffer: 1 << 26 }), { mode: 0o755 });
    const out = m === '-w' ? execFileSync('node', [path.join(R, 'wasm/host.js'), f]).toString() : execFileSync(f).toString();
    assert.strictEqual(out, '[/api/itens/7?q=%C3%A1%20b]25\n[fora dentro 7 fim]17\nx+y1\n[antes meio depois]17\n' + 'a'.repeat(3000) + '2000\n0\n', m);
  }
  // no -w, o _ta e o _tf so entram num modulo que usa um molde com nome
  const base = lib('memoria', 'texto') + ': f i>i t _tx_len t\n';
  const sem = execFileSync(ondac, ['-w', 'main'], { input: base + ': main >i { N f $"ola" 0 }\n' });
  const com = execFileSync(ondac, ['-w', 'main'], { input: base + ': main >i { N f`ola` 0 }\n' });
  assert.ok(com.length > sem.length + 100, 'com o molde entram o _ta, o _tf e o _tx_abre');
  fs.writeFileSync(path.join(t, 'c.wasm'), com);
  assert.strictEqual(execFileSync('node', [path.join(R, 'wasm/host.js'), path.join(t, 'c.wasm')]).toString(), '3');
});

test('erros: a linha e a coluna do sitio, tambem dentro de um molde', () => {
  assert.strictEqual(erro(': main >i {\n  `sem fim\n 0 }\n'), 'molde sem fim (linha 2, coluna 3)');
  assert.strictEqual(erro(': main >i { `a{ N 1 ` 0 }\n'), 'molde sem fim (linha 1, coluna 21)');
  assert.strictEqual(erro(': main >i { "sem fim\n'), 'texto sem fim (linha 1, coluna 13)');
  assert.strictEqual(erro(': main >i {\n  `a{ N 1 \n'), 'falta a } que fecha a interpolacao do molde (linha 2, coluna 5)');
  assert.strictEqual(erro(': main >i { (+ 1 2 3) }\n'), 'falta ): o parentese leva uma so expressao (linha 1, coluna 20)');
  assert.strictEqual(erro(': main >i { + 1 2) }\n'), 'parentese a fechar sem abrir (linha 1, coluna 18)');
  assert.strictEqual(erro(': main >i { ) }\n'), 'parentese a fechar sem abrir (linha 1, coluna 13)');
  assert.strictEqual(erro(': main >i { = r 0 r.a }\n'), 'o ponto (a.b) precisa da funcao _mb: junta a lib/arvore.onda (linha 1, coluna 20)');
  assert.strictEqual(erro(': main >i { = r 0 r..a }\n'), 'ponto sem nome a seguir (linha 1, coluna 20)');
  assert.strictEqual(erro(': main >i { = r 0 r.a. }\n'), 'ponto sem nome a seguir (linha 1, coluna 22)');
  assert.strictEqual(erro(': main >i { L 3 0 }\n'), 'L precisa de nome (linha 1, coluna 15)');
  assert.strictEqual(erro(': main >i { = x 1.0 L x 3 0 }\n'), 'a variavel do L tem de ser inteira: x (linha 1, coluna 23)');
  assert.strictEqual(erro(': main >i { L i 2.0 0 }\n'), 'esperava inteiro (linha 1, coluna 17)');
  assert.strictEqual(erro(': main >i { Se 1.0 0 }\n'), 'condicao deve ser inteira (linha 1, coluna 16)');
  // o molde com nome: a funcao tem de existir e de levar o texto; o programa tem de ter o _ta e o _tf
  const tt = ': _ta >i 0\n: _tf >i 0\n: f i>i t t\n: g >i 1\n';
  assert.strictEqual(erro(tt + ': main >i { = x 1 x`ola` 0 }\n'), 'antes da crase de um molde com nome vem uma funcao que leva o texto: f`...` (linha 5, coluna 19)');
  assert.strictEqual(erro(tt + ': main >i { g`ola` 0 }\n'), 'antes da crase de um molde com nome vem uma funcao que leva o texto: f`...` (linha 5, coluna 13)');
  assert.strictEqual(erro(': f i>i t t\n: main >i { f`ola` 0 }\n'), 'o molde com nome precisa das funcoes _ta e _tf: junta a lib/texto.onda (linha 2, coluna 14)');
  assert.strictEqual(erro(tt + ': _mb ii>i a b a\n: main >i { = a 0 a.b`ola` 0 }\n'), 'o nome de um molde com nome nao leva pontos (linha 6, coluna 22)');
  assert.strictEqual(erro(tt + ': main >i { f`ola 0 }\n'), 'molde sem fim (linha 5, coluna 14)');
  assert.match(erro(tt + ': main >i { zzz`ola` 0 }\n'), /^nome desconhecido.* \(linha 5, coluna 13\)$/);
  // o codigo de uma interpolacao e codigo como o outro: os erros de la apontam para la
  assert.strictEqual(erro(': main >i {\n  `<b>{ N zzz }</b>` 0 }\n'), 'nome desconhecido (linha 2, coluna 11)');
});

test('na GPU e no JavaScript: Se, L e ( ) existem (sao puros); os moldes e o ponto precisam de memoria', () => {
  const src = ': soma ii>i n z { = s z L i n { Se (> i 1) = s (+ s i) } s }\n';
  const J = new Function(execFileSync(ondac, ['-j', 'soma'], { input: src }).toString())();
  assert.strictEqual(J(5, 0), 9);
  const g = execFileSync(ondac, ['-g', 'px'], { input: ': px ii>i x y { = s 0 L i 4 { Se (> i 1) = s (+ s i) } s }\n' }).toString();
  assert.doesNotMatch(g, /#error/);
  assert.match(execFileSync(ondac, ['-g', 'px'], { input: ': px ii>i x y { `a` 0 }\n' }).toString(), /texto so em CPU/);
  const S = require(path.join(R, 'web/significado.js'));
  assert.strictEqual(S.funcao(src, 'soma')(5, 0), 9);
  assert.strictEqual(S.funcao(src, 'soma')(0, 3), 3);
  assert.throws(() => S.funcao(': f i>i x { `a{N x}` x }\n', 'f'), /texto so existe na CPU/);
  assert.throws(() => S.funcao(': f i>i x x.a\n', 'f'), /operacao so de CPU/);
  assert.throws(() => S.funcao(': g i>i t t\n: f i>i x g`a{N x}`\n', 'f'), /operacao so de CPU: molde com nome/);
  assert.match(execFileSync(ondac, ['-g', 'px'], { input: ': _ta >i 0\n: _tf >i 0\n: g i>i t t\n: px ii>i x y g`a`\n' }).toString(), /#error onda/);
  assert.deepStrictEqual(S.tokens('f`a{N x}b` g`c` \'` h').map((k) => [k.k, k.x]),
    [[0, 'f'], [5, '`'], [5, '{'], [3, '`a{'], [5, 'N'], [0, 'x'], [3, '}b`'], [5, '}'], [0, 'g'], [5, '`'], [3, '`c`'], [4, "'`"], [0, 'h']]);
  // o leitor do significado da os mesmos tokens que o do compilador
  assert.deepStrictEqual(S.tokens('`a{N c.d}b` (+ 1 2) {x} \'{').map((k) => [k.k, k.x]),
    [[5, '{'], [3, '`a{'], [5, 'N'], [5, '.'], [0, 'c'], [6, '.d}'], [3, '}b`'], [5, '}'], [5, '('], [5, '+'], [1, '1'], [1, '2'], [5, ')'], [5, '{'], [0, 'x'], [5, '}'], [4, "'{"]]);
});

test('a matematica e o armazem continuam a entrar so quando se usam, tambem com moldes pelo meio', () => {
  // um Sn dentro de uma interpolacao conta; um "Sn" no texto de um molde ou depois de um # nao
  const com = corre(': main >i { `seno={ G Sn 0.0 } # isto nao e comentario` P 10 0 }\n');
  assert.strictEqual(com.c, 'seno=0 # isto nao e comentario\n');
  iguais(com, 'Sn num molde');
  const sem = execFileSync(ondac, ['-x'], { input: ': main >i { `Sn Cs K "` P 10 0 }\n' });
  const base = execFileSync(ondac, ['-x'], { input: ': main >i { "Sn Cs K \\"" P 10 0 }\n' });
  assert.strictEqual(sem.length, base.length, 'o texto de um molde nao puxa a matematica nem o armazem');
});
