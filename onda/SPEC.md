# Onda v0 — especificação (para IAs)

Onda é escrita e lida por IAs. Um humano que queira perceber uma linha pede a explicação a uma IA.
Paradigma: **campo + colapso**. Uma função de índice `f(i)` é um campo em sobreposição (todos os `i` ao mesmo tempo, sem ordem).
Os operadores `E`, `S` e `D` colapsam o campo e são o único sítio onde há paralelismo: CPU multinúcleo via OpenMP, ou GPU via GLSL.
Não há runtime, GC nem VM. O compilador gera C (e daí código nativo ou WebAssembly) ou GLSL para a GPU.

## Léxico
- Os tokens separam-se por espaço, tab ou mudança de linha. `#` no início de um token comenta até ao fim da linha.
- `123`, `-5`, `0xFF` são inteiros. `1.5`, `-0.25`, `2.` são reais (têm de ter `.`). `'c` é o código do carácter c (`'a` = 97).
- `"..."` imprime o texto e vale 0. Escapes: `\n \t \\ \"`; mudanças de linha literais são permitidas.
- Um nome é `[a-z_][a-zA-Z0-9_]*`. Qualquer outro token é um operador.

## Programa
`: nome ASSIN p1 .. pn CORPO`, onde ASSIN é `[if]*>[if]` (tipos dos parâmetros > tipo de retorno; `i` = int64, `f` = float64).
O CORPO é uma única expressão. O ponto de entrada é `: main >i`, cujo valor é o código de saída.
Exemplo: `: fib i>i n ? < n 2 n + fib - n 1 fib - n 2`

## Expressões (prefixas, aridade fixa, sem parênteses)
| op | aridade | efeito |
|---|---|---|
| `+ - * /` | 2 | aritmética (os dois operandos com o mesmo tipo) |
| `% & \| ^ << >>` | 2 | só inteiros |
| `< > <= >= == !=` | 2 | comparação → 0/1 |
| `&& \|\|` | 2 | lógica com curto-circuito → 0/1 |
| `~` | 1 | não lógico |
| `F` / `I` | 1 | int→real / real→int (sem conversões implícitas) |
| `Sq Sn Cs Ex Lg Fl Ab` | 1 | sqrt sin cos exp log floor abs (reais) |
| `Pw At` | 2 | pow, atan2 |
| `Mn Mx` | 2 | mínimo, máximo |
| `Bh` / `Bl` | 1 | palavra alta (com sinal) / baixa (0..2³²-1) dos 64 bits de um real |
| `Bw h l` | 2 | real com esses 64 bits (`Bw` de dois literais é uma constante exata) |
| `? c a b` | 3 | se c≠0 então a senão b (a e b do mesmo tipo) |
| `W c b` | 2 | enquanto c≠0 faz b; vale 0 |
| `{ e1 .. en }` | n | sequência; vale en (vazio vale 0) |
| `= x e` | 2 | atribui à local x (o tipo fica fixo na 1.ª atribuição); vale e |
| `nome a1..an` | n | chamada (a aridade vem da assinatura) |
| `@ p` / `! p v` | 1/2 | lê/escreve a palavra int64 M[p] |
| `@f p` / `!f p v` | 1/2 | lê/escreve um real em M[p] |
| `A n` | 1 | reserva n palavras a zero; devolve o endereço |
| `P x` `N x` `G x` | 1 | imprime um byte / um inteiro / um real |
| `R` | 0 | lê um byte (-1 no fim) |
| `O p` | 1 | desvia a saída para a memória (M[p] = cursor); `O 0` repõe o stdout |
| `Ac` / `Av i j` | 0/2 | número de argumentos / byte j do argumento i |
| `X c` | 1 | sai com o código c |
| `T` | 0 | relógio em microssegundos |
| **`K n`** | 1 | armazém: endereço-base de n palavras que sobrevivem entre execuções (o ficheiro de `ONDA_ARM`, mapeado em memória); sem `ONDA_ARM` é memória volátil |
| `Kc` | 0 | confirma o armazém de forma atómica (também à saída); vale o número de páginas escritas |
| **`E d n f a..`** | campo | M[d+i] = f(i, a..) para todo o i<n, em paralelo; vale d |
| **`S n f a..`** | campo | Σ f(i, a..) para i<n, redução paralela |
| **`D w h f a..`** | campo | imagem w×h com o píxel f(x, y, a..) = 0xRRGGBB (PPM no stdout) |

Matemática: `Sn Cs Ex Lg At Pw` são definidas por uma biblioteca escrita em Onda (`src/9mat.onda`, o algoritmo fdlibm). Em C, WebAssembly e x86 dão os mesmos bits, e os mesmos que o significado. `Sn Cs Ex Lg At` são iguais ao `Math` do JavaScript. `Pw` é o pow do fdlibm 5.3 (o `StrictMath.pow` do Java), também na forma JavaScript e no significado, que usam o mesmo `_pw`. Na GPU usam as funções nativas, com a tolerância declarada. Os nomes começados por `_` são do runtime.

Regra da sobreposição: uma função usada em `E`, `S` ou `D` não pode escrever na memória nem fazer E/S, porque a ordem dos índices não existe.

## Armazém
O ficheiro só muda num `Kc` (ou à saída), e sempre de forma atómica. As páginas de 4096 bytes que mudaram vão primeiro para `ficheiro.j`: índice e página, e um rodapé com o número de páginas, a soma FNV-1a das palavras e a marca `ONDAJRN1`. Depois há `fsync`, e só então as páginas são escritas no ficheiro, com outro `fsync`. Ao abrir, um diário completo é reaplicado e um incompleto é apagado. Uma queda deixa o armazém no último `Kc`. O formato (palavras de 64 bits em little-endian) é o mesmo em C, x86 e WebAssembly.

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
- `./build.sh` faz o arranque: Rust → ondac1 → ondac2 → ondac3. Exige `ondac1.c == ondac2.c == ondac3.c`. `--semente` arranca só a partir de `seed/ondac.c`.
- `./onda run f.onda`: compila e corre, com cache por hash. O que já foi compilado nunca se recompila.
- `./onda c f.onda` gera C portátil; `./onda gpu f.onda px` gera GLSL; `web/ondac.wasm` é o compilador para o browser.
- Os erros do compilador trazem a linha e a coluna, e mostram a linha da fonte com um sinal (`^`) sob o token, p. ex.:
  ```
  #error onda: nome desconhecido (linha 4, coluna 3)
    zzz x
    ^
  ```
  Num nome desconhecido perto de uma função existente, sugere: `nome desconhecido, quis dizer soma?`.
