# Onda v0 — especificação (para IAs)

Onda é escrita e lida por IAs. Um humano que queira perceber uma linha pede a explicação a uma IA.
Paradigma: **campo + colapso**. Uma função de índice `f(i)` é um campo em sobreposição (todos os `i` ao mesmo tempo, sem ordem).
Os operadores `E`, `S` e `D` colapsam o campo e são o único sítio onde há paralelismo: CPU multinúcleo via OpenMP, ou GPU via GLSL.
Não há runtime, GC nem VM. O compilador gera C (e daí código nativo ou WebAssembly) ou GLSL para a GPU.

## Léxico
- Os tokens separam-se por espaço, tab ou mudança de linha. `#` no início de um token comenta até ao fim da linha. As chavetas e os parênteses são sempre tokens sozinhos, com ou sem espaços: `{a}` lê-se `{ a }` e `(+ a b)` lê-se `( + a b )`.
- `123`, `-5`, `0xFF` são inteiros. `1.5`, `-0.25`, `2.` são reais (têm de ter `.`). `'c` é o código do carácter c (`'a` = 97).
- `"..."` imprime o texto e vale 0. Escapes: `\n \t \\ \"`; mudanças de linha literais são permitidas.
- `$"..."` (o `$` colado às aspas) é um **texto constante**: vale o endereço de um texto fixo no formato do `O t` (M[t] = fim, um byte por palavra em M[t+1 .. M[t]-1]), posto uma vez na zona dos dados (a partir de M[64]). Os mesmos escapes. É só de leitura (não se escreve nele) e textos iguais dão o mesmo endereço. Existe em C, WebAssembly, x86 e arm64; na GPU e no JavaScript não há memória (erro do texto).
- `` `...` `` (crases) é um **molde**: imprime o texto, como o `"..."`, mas as aspas não se escapam e cada `{ código }` corre nesse sítio — o que o código imprimir sai ali: `` `<b class="{ cls j }">{N j}</b>` ``. Vale 0, como o `"..."`. Dentro de uma interpolação cabe qualquer código (blocos, outros moldes). Uma chaveta ou uma crase a sério escrevem-se `\{`, `\}` e `` \` ``; os outros escapes são os do `"..."`. `` $`...` `` é um texto constante cru, sem interpolações (para JSON e seletores com aspas): `` $`{"a":1}` ``. Textos constantes com o mesmo conteúdo dão o mesmo endereço, seja qual for o delimitador.
- Um nome é `[a-z_][a-zA-Z0-9_]*`. Qualquer outro token é um operador.
- **O ponto:** `a.b` é o membro `b` de `a`. O leitor troca-o por `_mb a $"b"`, e `a.b.c` por `_mb _mb a $"b" $"c"`; a função `_mb` ("membro") é a da biblioteca que o programa juntou (a de `lib/arvore.onda` dá o membro de um nó da árvore). A base é um local ou uma função sem argumentos. Sem `_mb` no programa, o ponto é um erro.

## Programa
`: nome ASSIN p1 .. pn CORPO`, onde ASSIN é `[if]*>[if]` (tipos dos parâmetros > tipo de retorno; `i` = int64, `f` = float64).
O CORPO é uma única expressão. O ponto de entrada é `: main >i`, cujo valor é o código de saída (um programa que acaba com `P ...` sai com esse byte; termina o `main` com `0` para sair limpo).
Exemplo: `: fib i>i n ? < n 2 n + fib - n 1 fib - n 2`

## Expressões (prefixas, aridade fixa, sem parênteses)
| op | aridade | efeito |
|---|---|---|
| `+ - * /` | 2 | aritmética (os dois operandos com o mesmo tipo) |
| `% & \| ^ << >>` | 2 | só inteiros |
| `< > <= >= == !=` | 2 | comparação → 0/1 |
| `&& \|\|` | 2 | lógica com curto-circuito → 0/1 |
| `~` | 1 | não **lógico** (0/1); o complemento de bits de x em N bits faz-se com `^ x mascara` |
| `F` / `I` | 1 | int→real / real→int (sem conversões implícitas) |
| `Sq Sn Cs Ex Lg Fl Ab` | 1 | sqrt sin cos exp log floor abs (reais) |
| `Pw At` | 2 | pow, atan2 |
| `Mn Mx` | 2 | mínimo, máximo |
| `Bh` / `Bl` | 1 | palavra alta (com sinal) / baixa (0..2³²-1) dos 64 bits de um real |
| `Bw h l` | 2 | real com esses 64 bits (`Bw` de dois literais é uma constante exata) |
| `? c a b` | 3 | se c≠0 então a senão b (a e b do mesmo tipo) |
| **`Se c b`** | 2 | se c≠0 faz b (de qualquer tipo; o valor não conta); vale 0. É o `? c { b 0 } 0` sem o ramo vazio |
| `W c b` | 2 | enquanto c≠0 faz b; vale 0 |
| **`L i n b`** | nome + 2 | para i de 0 a n−1 faz b; vale 0. O limite n calcula-se uma vez; i é um local inteiro (novo ou já existente) e no fim vale n. É o `= i 0 W < i n { b = i + i 1 }` |
| **`( e )`** | 1 | vale e. O parêntese confere que lá dentro está uma só expressão completa: serve para não errar a aridade (`(+ (* 2 3) (f x))`) |
| `{ e1 .. en }` | n | sequência; vale en (vazio vale 0) |
| `= x e` | 2 | atribui à local x (o tipo fica fixo na 1.ª atribuição); vale e |
| `nome a1..an` | n | chamada (a aridade vem da assinatura) |
| `@ p` / `! p v` | 1/2 | lê/escreve a palavra int64 M[p] |
| `@f p` / `!f p v` | 1/2 | lê/escreve um real em M[p] |
| `A n` | 1 | reserva n palavras a zero; devolve o endereço |
| `P x` `N x` `G x` | 1 | imprime um byte / um inteiro / um real |
| `R` | 0 | lê um byte (-1 no fim) |
| `Rb p n` | 2 | lê até n bytes do stdin para M[p..] (um byte por palavra); vale quantos leu (menos de n só no fim) |
| `O p` | 1 | desvia a saída para a memória (M[p] = cursor); `O 0` repõe o stdout |
| `Oc t n` | 2 | como o `O t`, com guarda: o texto t leva no máximo n bytes e o resto fica de fora, até ao próximo `O` (só `-w`, `-x`, `-a/-m`); vale t |
| `Ac` / `Av i j` | 0/2 | número de argumentos / byte j do argumento i |
| `X c` | 1 | sai com o código c |
| `T` | 0 | relógio em microssegundos |
| **`K n`** | 1 | armazém: endereço-base de n palavras que sobrevivem entre execuções (o ficheiro de `ONDA_ARM`, mapeado em memória); sem `ONDA_ARM` é memória volátil |
| `Kc` | 0 | confirma o armazém de forma atómica (também à saída); vale o número de páginas escritas |
| **`E d n f a..`** | campo | M[d+i] = f(i, a..) para todo o i<n, em paralelo; vale d |
| **`S n f a..`** | campo | Σ f(i, a..) para i<n, redução paralela |
| **`D w h f a..`** | campo | imagem w×h com o píxel f(x, y, a..) = 0xRRGGBB (PPM no stdout) |

Matemática: `Sn Cs Ex Lg At Pw` são definidas por uma biblioteca escrita em Onda (`src/9mat.onda`, o algoritmo fdlibm). Em C, WebAssembly e x86 dão os mesmos bits, e os mesmos que o significado. `Sn Cs Ex Lg At` são iguais ao `Math` do JavaScript. `Pw` é o pow do fdlibm 5.3 (o `StrictMath.pow` do Java), também na forma JavaScript e no significado, que usam o mesmo `_pw`. Na GPU usam as funções nativas, com a tolerância declarada. Os nomes começados por `_` são do runtime e das bibliotecas: no `-w` são privados (ver "Apps").

Regra da sobreposição: uma função usada em `E`, `S` ou `D` não pode escrever na memória nem fazer E/S, porque a ordem dos índices não existe.

Desempenho: em C e WebAssembly, `E`/`S`/`D` colapsam em paralelo (OpenMP) mas **chamam** a função de elemento uma vez por índice. No x86 nativo, a função é metida em linha. Para um produto interno quente dentro de um elemento (p. ex. `S` dentro de `E`), escrever o laço à mão dentro do elemento evita a chamada por iteração e chega à velocidade do C — ver `ex/matmul.onda`.

## Armazém
O ficheiro só muda num `Kc` (ou à saída), e sempre de forma atómica. As páginas de 4096 bytes que mudaram vão primeiro para `ficheiro.j`: índice e página, e um rodapé com o número de páginas, a soma FNV-1a das palavras e a marca `ONDAJRN1`. Depois há `fsync`, e só então as páginas são escritas no ficheiro, com outro `fsync`. Ao abrir, um diário completo é reaplicado e um incompleto é apagado. Uma queda deixa o armazém no último `Kc`. O formato (palavras de 64 bits em little-endian) é o mesmo em C, x86 e WebAssembly. Na forma C, o `Kc` segura um trinco `flock` exclusivo e escreve só as páginas que o processo mudou desde que abriu, por isso vários processos partilham o mesmo ficheiro sem se apagarem (na mesma página ganha o último a confirmar).

## GPU
`ondac -g px` gera GLSL ES 3.0 para a função `px` e para tudo o que ela chama.
Assinatura: `ii..>i` ou `ff..>i`. Os parâmetros extra recebem u[0]=tempo, u[1]=largura, u[2]=altura, u[3..4]=rato.
Na GPU, `i` é int32 e `f` é float32. Memória e E/S são só de CPU.

## Circuitos
`ondac -c f` (ou `./onda circ f.onda f`) transforma a função inteira e pura `f` num circuito de portas E com inversores (AIG), escrito em AIGER (`aag`), o formato lido por ferramentas de síntese como o ABC e o Yosys.
- Cada inteiro é um vetor de W fios. W = 64 por omissão, ou o valor de `: bit >i N` (aritmética de W bits).
- `+ -` são somadores; `*` é um multiplicador de deslocamento e soma; os deslocamentos por constante são só fios, e os outros são um deslocador em barril.
- `& | ^`, as comparações, `Mn`/`Mx`, `&&`, `||`, `~` e `?` (multiplexador) também existem.
- `/ %` usam divisão com restauro sobre os valores absolutos, truncada como no C. A divisão por zero dá um valor não especificado.
- As chamadas são expandidas.
- Os ciclos são desenrolados com um predicado "vivo": a condição e o corpo só mudam o estado das entradas que ainda estão no ciclo. Em cada volta, o compilador tenta provar que o predicado já é 0: se depende de no máximo 16 bits de entrada, simula-o em todas as combinações. Se a prova sai, o ciclo acaba aí. Se não sai, um ciclo cujo número de voltas depende das entradas precisa de `: lim >i N`, o número máximo de voltas que o circuito cobre.
- `: rap >i 1` troca os somadores em cadeia por somadores de prefixos (Kogge-Stone): a soma de 64 bits passa de 568 portas e profundidade 128 para 1 327 portas e profundidade 15.
- `ondac -v f` escreve o mesmo circuito em Verilog estrutural (`module f(input [W-1:0] i_a, ..., output [W-1:0] o)`). Em `-v` e `-q` o circuito é um grafo E–ou-exclusivo (XAG): o multiplexador é `b ⊕ (s ∧ (a ⊕ b))` e o transporte do somador é `((a⊕c) ∧ (b⊕c)) ⊕ c`, com uma só porta E. No AIGER (`-c`) cada ou-exclusivo vale 3 portas E.
- O comentário final dá as portas úteis e a profundidade. `test/circ.test.js` simula cada circuito e compara-o com a função compilada.

## Quântico
`ondac -q f` escreve um oráculo reversível |x⟩|y⟩ → |x⟩|y ⊕ f(x)⟩ em OpenQASM 3, pelo método de Bennett:
1. cada porta E útil do circuito é um Toffoli num qubit auxiliar, e cada ou-exclusivo são dois CNOT;
2. as saídas são copiadas com CNOT;
3. os Toffoli repetem-se ao contrário, e os auxiliares voltam a |0⟩.

Com `: gro >i 1` e um predicado (resultado 0 ou 1), o programa é a busca de Grover completa: Hadamard, ⌊π/4·√2ⁿ⌋ iterações de oráculo (retrocesso de fase em `y[0]`) e difusão, e medição. Ver `ex/oraculo.onda`. O programa corre no simulador de vetor de estado escrito em Onda, `ex/qasm.onda` (até 23 qubits).

## Ferramentas
- `./build.sh` faz o arranque 100% em Onda, a partir da semente WASM (só Node) ou nativa (`--semente-x86`), e exige ponto fixo bit a bit. `--c` usa a ponte C (`seed/ondac.c`), só para portar a um CPU sem backend nativo.
- `./onda run f.onda`: compila e corre, com cache por hash. O que já foi compilado nunca se recompila.
- `./onda c f.onda` gera C portátil; `./onda gpu f.onda px` gera GLSL; `seed/ondac.wasm` é o compilador para o browser.
- Os erros do compilador trazem a linha e a coluna, e mostram a linha da fonte com um sinal (`^`) sob o token, p. ex.:
  ```
  #error onda: nome desconhecido (linha 4, coluna 3)
    zzz x
    ^
  ```
  Num nome desconhecido perto de uma função existente, sugere: `nome desconhecido, quis dizer soma?`.
- Um erro de tipo aponta o token onde começa a expressão culpada (o operando, o segundo ramo do `?`, o argumento) e diz os tipos: `tipos diferentes: inteiro e real`, `ramos com tipos diferentes: o primeiro vale real, o segundo inteiro`, `argumento com tipo errado: f espera inteiro`. Um nome que começa por maiúscula é um operador, e o erro di-lo (`= precisa de nome: L comeca por maiuscula, …`).

## Apps (WebAssembly + anfitrião)
Uma app em Onda é um módulo `ondac -w` corrido pelo anfitrião `rt/anfitriao.js` (browser ou Node). O `main` corre uma vez e prepara o estado; depois o anfitrião chama as funções da Onda em cada evento, e a memória fica viva entre chamadas (é o estado da app).
- **O que vai no módulo:** só as funções que as raízes alcançam (as outras nem se compilam). Raízes e exportações: as funções cujo nome **não** começa por `_` (com o seu nome; menos `memory` e `_start`), mais `_oa`, `_fl` e `_ini`, que os anfitriões chamam. As `_` são privadas: entram só se alguma função viva as usar, e não se exportam. Com `ondac -w f g …`, as raízes e exportações são só `f`, `g`, … (e as três do anfitrião): um módulo mais pequeno, quando se sabe o que o anfitrião chama. Por isso uma função que o anfitrião chama pelo nome (um evento, a ponte) não pode começar por `_`.
- **Funções de evento** recebem inteiros: `clique i>i t` (t = texto do evento), `lido ii>i t estado`, `tique i>i z`.
- **Texto:** um endereço `t` com `M[t]` = fim e os bytes (UTF-8, um por palavra) em `M[t+1 .. M[t]-1]` — o que o `O t` deixa. Escrever um texto é imprimir para ele: `= t tnovo 100 O t "Olá " N 42 O 0`. Um texto fixo é um texto constante: `Y 100 $"#app" h`, `jget r $"valor"`, `Y 101 $"click" $"clique"`. O `O t` não sabe a capacidade do texto; com `Oc t n` o que passar de n bytes fica de fora (`= t tnovo 100 Oc t 100 …`).
- **Portas** (`Y c a b`, além das do runtime 0–9):

| c | a b | efeito |
|---|---|---|
| 100 | sel txt | `innerHTML` do elemento `sel` (seletor CSS) = `txt`; vale 1 se existe |
| 101 | tipo fn | em cada evento `tipo` num elemento com `data-onda`, chama `fn(t)`; t = valor de `data-onda` (+ tab + valor do campo, fora do `click`) |
| 102 | url fn | `fetch(url)`; no fim chama `fn(t, estado)` com o corpo e o estado HTTP (0 = falhou) |
| 103 / 104 | ms fn / id | relógio: chama `fn(0)` a cada ms (devolve o id) / pára |
| 105 / 106 | chave / chave t | lê (texto ou 0) / grava (t = 0 apaga) no armazém do browser |
| 107 | t | `console.log` |
| 108 / 109 | – / n | milissegundos desde 1970 / inteiro aleatório em [0, n) |
| 110 | t | título do documento |

- **Scripts (Node):** `rt/anfitriao-node.js` corre um módulo como um programa de linha de comando, com as portas do runtime, as 103/104/108/109 de cima e estas (as mesmas regras: o `main` corre uma vez e cada resposta chama uma função da Onda):

| c | a b | efeito (só Node) |
|---|---|---|
| 200 | i | argumento i (texto; 0 se não há); i = -1: quantos |
| 201 | nome | variável de ambiente (texto; 0 se não há) |
| 202 | caminho | os bytes do ficheiro (texto; 0 se falhou: a mensagem fica na 213) |
| 204 / 205 | caminho | cria a pasta e as que faltam (1; 0 se falhou) / 1 se existe |
| 206 | p fn | `fetch`: p = `[método, url, cabeçalhos ("Nome: valor" por linha), corpo, ms]` (textos; 0 = GET, sem cabeçalhos, sem corpo, sem limite); no fim chama `fn(t, estado)`: o corpo e o estado HTTP; 0 = falhou (t = a mensagem do erro); -estado = o corpo não chegou |
| 208 | fd / 0 | a saída (`P`, `N`, `"..."`) passa para fd (1 stdout, 2 stderr) / volta à anterior |
| 209 / 210 | caminho / – | abre um fluxo e põe nele a saída: um ficheiro, ou com 0 um texto em memória / fecha o do topo: ficheiro → 1 (0 se falhou), memória → o texto |
| 211 | c | termina com o código c, depois de escrever tudo |
| 213 / 214 | – | a mensagem / o nome (TypeError, AbortError, Error…) do último erro |

- **Biblioteca:** a da Onda (ver "Biblioteca", abaixo), que se junta antes da app. O `lib/app.onda` da it.137 (textos, números pt-PT, um leitor de JSON e as regiões) fica para quem ainda o usa.
- **Globais:** `M[0..62]` são da app; a biblioteca usa só o `M[63]` (o `lib/app.onda` usava `M[60..62]`); os textos literais (`"..."` e `$"..."`) começam em `M[64]`, e o monte a seguir a eles.
- Exemplo completo, com teste no browser: `ex/app/contador.onda` (`test/app.test.js`).

## Biblioteca
`onda/lib`: o que o JavaScript traz de origem, para qualquer app, igual ao JS onde o diz (conferido contra o Node 22 e o
Chromium 153 em `test/biblioteca-*.test.js`). Junta-se antes da app, por esta ordem (cada módulo só usa os de cima):

```
cat lib/{memoria,texto,numero,valor,json,arvore,data,ordenar,html,anfitriao}.onda app.onda | ondac -w > app.wasm
```

| módulo | prefixo | o quê |
|---|---|---|
| `memoria` | `_me_` | o bloco da biblioteca, regiões (`_me_marca`/`_me_solta`), listas que crescem |
| `texto` | `_tx_` | o formato do `O t`; comparar, procurar, partir; UTF-8 ⇄ códigos; vistas UTF-16 (o `length`, o `slice` e o `<` do JS); maiúsculas (ASCII e Latim-1); `encodeURIComponent`, `TextDecoder`, HTML; `_tx_abre`/`_tx_fecha` (um texto com a guarda do `Oc` que repõe a saída de antes) |
| `numero` | `_nu_` | `String(x)` (o decimal mais curto), `Number(texto)` (arredondamento certo sempre), `toFixed` (0–100), `toPrecision` (1–100), `Math.round/max/min`; o `Intl.NumberFormat('pt-PT')` (d casas, até d casas, compacto, moedas: arredonda o decimal mais curto, como o ICU) |
| `valor` | `_js_` | os valores do JS (undefined, null, booleanos, números, textos, listas, objetos com a ordem das chaves do JS), `String(v)`, `Number(v)`, `===`, `includes`, `<`, `join` |
| `json` | `_js_` | `JSON.parse` (os números ao bit, `\u` e substitutos) e `JSON.stringify` (também indentado), ao byte |
| `arvore` | `_ar_` | JSON só de leitura em árvore — o que a ponte de uma app escreve na memória — com a semântica do JS |
| `data` | `_dt_` | dia civil ⇄ dias, `toISOString`, dia da semana, Lisboa (as regras da UE) |
| `ordenar` | `_or_` | o `sort` do V8, comparação a comparação: o PowerSort do Chromium e o TimSort do Node 22, com o comparador num código |
| `html` | `_ht_` | pedaços de HTML para o ecrã, atributos e textos escapados |
| `anfitriao` | `_an_` | as portas dos anfitriões (`Y 100–110` e `Y 200–214`) com nomes |

- **Nomes:** `_` + o prefixo do módulo + `_` + o nome. As apps não começam nomes por `_` e o runtime não usa um segundo `_`: não
  colidem. Como são privados no `-w`, só entra o que a app usa: com a biblioteca toda junta, o módulo sai igual ao byte
  ao que se faz só com os módulos precisos (`test/biblioteca-poda.test.js`).
- **Globais:** só o `M[63]`, que aponta para o bloco da biblioteca (1 200 palavras de trabalho, reservado na primeira vez).
  Quem repõe o monte por fora (uma ponte que mexe no `M[-1]`) chama o `_me_lb` no `main`, antes de marcar.
- **Para o `-w`, `-x` e `-a`** (usa o `M[-1]`, o `Oc` e o `_ow` do runtime); não para o C.
- O que não é igual ao JS, e como usar: `lib/LEIA.md`. Exemplo: `ex/carteira/carteira.onda` (um script com sete módulos).

