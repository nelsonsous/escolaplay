// tools/fluir.mjs: passa codigo Onda do estilo antigo para a Onda fluida sem lhe mudar o significado. O programa
// convertido tem de escrever exatamente o mesmo, a conversao tem de se ver no texto, e converter outra vez nao muda nada.
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const R = path.join(__dirname, '..');
const ondac = path.join(R, 'build/ondac');
const t = fs.mkdtempSync(path.join(os.tmpdir(), 'onda-fluir-'));
const LIB = ['memoria', 'texto', 'numero', 'valor', 'json', 'arvore', 'fala'].map((m) => path.join(R, 'lib', m + '.onda'));
const corre = (app) => {
  const src = LIB.map((f) => fs.readFileSync(f, 'utf8')).join('\n') + '\n' + fs.readFileSync(app, 'utf8');
  const w = path.join(t, 'p.wasm');
  fs.writeFileSync(w, execFileSync(ondac, ['-w', 'main'], { input: src, maxBuffer: 1 << 26 }));
  return execFileSync('node', [path.join(R, 'wasm/host.js'), w]).toString();
};

const ANTIGO = `# uma lista, no estilo de antes
: sg i>i k _ar_get @ 5 k
: es >i @ 5
: cls i>i n ? > n 1 "grande" "pequeno"
: linha ii>i c j {
  "<li class=\\"" cls j "\\" data-id=\\"" _ar_ps _ar_get c $"id" 1 "\\">"
  ? _ar_verd _ar_get c $"fav" { "<i>★</i> " 0 } 0
  "<b>" _ar_ps _ar_get c $"nome" 1 "</b> " _nu_intl _ar_vnum _ar_get c $"valor" 0
  ? _ar_eqt _ar_get c $"grupo" $"Norte" " (N)" 0
  "</li>" 0 }
: soma i>f l { = s 0. = c _ar_prim l W c { = s + s _ar_vnum _ar_get c $"valor" = c _ar_prox c } s }
: main >i {
  ! 5 _ar_json $"{\\"titulo\\":\\"A {lista} & <mais>\\",\\"itens\\":[{\\"id\\":\\"a1\\",\\"nome\\":\\"Porto\\",\\"valor\\":231800,\\"grupo\\":\\"Norte\\",\\"fav\\":true},{\\"id\\":\\"b2\\",\\"nome\\":\\"Faro <sul>\\",\\"valor\\":67650.5,\\"grupo\\":\\"Sul\\",\\"fav\\":false},{\\"id\\":\\"c3\\",\\"nome\\":\\"Braga\\",\\"valor\\":193333,\\"grupo\\":\\"Norte\\"}]}"
  = l sg $"itens"
  "<h1 title=\\"" _ar_ps sg $"titulo" 1 "\\">" _ar_ps _ar_get es $"titulo" 0 "</h1><ul>" P 10
  = j 0
  = c _ar_prim l
  W c { linha c j P 10 = j + j 1 = c _ar_prox c }
  "</ul>" P 10
  # um ciclo contado, com o limite num local que o corpo nao muda
  = n _ar_n l
  = i 0 W < i n { ? == i 1 { "[um]" 0 } 0 N i P 32 = i + i 1 }
  P 10
  # este fica como esta: o limite e uma leitura de memoria
  = k 0 W < k @ 6 { N k = k + k 1 }
  ? > n 2 { "muitos: " N n P 10 0 } 0
  "total " _nu_intl soma l 0 " {chavetas} e \`crase\`" P 10
  ? _tx_igual _ar_txt sg $"titulo" $"x" "igual" "diferente" P 10
  0 }
`;

test('fluir: o programa convertido escreve o mesmo, a conversao ve-se e e estavel', () => {
  const antigo = path.join(t, 'antigo.onda'), novo = path.join(t, 'novo.onda');
  fs.writeFileSync(antigo, ANTIGO);
  fs.writeFileSync(novo, ANTIGO);
  const antes = corre(antigo);
  assert.match(antes, /<li class="pequeno" data-id="a1"><i>★<\/i> <b>Porto<\/b> 231\s800 \(N\)<\/li>/u);
  const out = execFileSync('node', [path.join(R, 'tools/fluir.mjs'), '--atalho=sg=es', ...LIB, '--', novo]).toString();
  assert.match(out, /1 de 1 ficheiros mudados/);
  const fonte = fs.readFileSync(novo, 'utf8');
  // o mesmo resultado, byte a byte
  assert.strictEqual(corre(novo), antes);
  // moldes com o codigo no sitio, o ponto, a fala, o Se e o L
  assert.ok(fonte.includes('`<li class="{ cls j }" data-id="{ esc c.id }">`'), fonte);
  assert.ok(fonte.includes('Se ha c.fav "<i>★</i> "'), fonte);
  assert.ok(fonte.includes('`<b>{ esc c.nome }</b> { _nu_intl num c.valor 0 }`'), fonte);
  assert.ok(fonte.includes('Se eh c.grupo $"Norte" " (N)"'), fonte);
  assert.ok(fonte.includes('= l es.itens'), fonte);
  assert.ok(fonte.includes('`<h1 title="{ esc es.titulo }">{ cru es.titulo }</h1><ul>`'), fonte);
  assert.ok(fonte.includes('L i n { Se == i 1 "[um]" N i P 32 }'), fonte);
  assert.ok(fonte.includes('= k 0 W < k @ 6 { N k = k + k 1 }'), 'o limite que le a memoria fica como estava');
  assert.ok(fonte.includes('`total { _nu_intl soma l 0 } \\{chavetas\\} e \\`crase\\``'), fonte);
  assert.ok(fonte.includes('= s + s num c.valor = c seg c'), fonte);
  assert.ok(fonte.includes('$`{"titulo":'), 'o JSON passa a texto constante cru');
  assert.ok(fonte.includes('# uma lista, no estilo de antes') && fonte.includes('# este fica como esta'), 'os comentarios ficam');
  // converter outra vez nao muda nada
  assert.match(execFileSync('node', [path.join(R, 'tools/fluir.mjs'), '--ver', '--atalho=sg=es', ...LIB, '--', novo]).toString(), /0 de 1 ficheiros mudariam/);
});

test('fluir: sem a fala e sem a arvore no contexto so entram os moldes, o Se e o L; um nome repetido e um erro', () => {
  const f = path.join(t, 'so.onda');
  fs.writeFileSync(f, ': main >i { = s 0 = i 0 W < i 4 { ? > i 1 { = s + s i 0 } 0 = i + i 1 } "s=\\"" N s "\\"" P 10 0 }\n');
  execFileSync('node', [path.join(R, 'tools/fluir.mjs'), '--', f]);
  assert.strictEqual(fs.readFileSync(f, 'utf8'), ': main >i { = s 0 L i 4 Se > i 1 = s + s i `s="{ N s }"` P 10 0 }\n');
  const w = path.join(t, 'so.wasm');
  fs.writeFileSync(w, execFileSync(ondac, ['-w'], { input: fs.readFileSync(f) }));
  assert.strictEqual(execFileSync('node', [path.join(R, 'wasm/host.js'), w]).toString(), 's="5"\n');
  const g = path.join(t, 'rep.onda');
  fs.writeFileSync(g, ': esc i>i n n\n: main >i 0\n');
  assert.throws(() => execFileSync('node', [path.join(R, 'tools/fluir.mjs'), ...LIB, '--', g], { stdio: 'pipe' }), /função repetida esc/);
});
