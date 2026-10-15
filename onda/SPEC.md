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
| **`E d n f a..`** | campo | M[d+i] = f(i, a..) para todo o i<n, em paralelo; vale d |
| **`S n f a..`** | campo | Σ f(i, a..) para i<n, redução paralela |
| **`D w h f a..`** | campo | imagem w×h com o píxel f(x, y, a..) = 0xRRGGBB (PPM no stdout) |

Matemática: `Sn Cs Ex Lg At Pw` são definidas por uma biblioteca escrita em Onda (`src/9mat.onda`, o algoritmo fdlibm). Em C, WebAssembly e x86 dão os mesmos bits, e os mesmos que o significado. `Sn Cs Ex Lg At` são iguais ao `Math` do JavaScript. `Pw` é o pow do fdlibm 5.3 (o `StrictMath.pow` do Java), também na forma JavaScript e no significado, que usam o mesmo `_pw`. Na GPU usam as funções nativas, com a tolerância declarada. Os nomes começados por `_` são do runtime.

Regra da sobreposição: uma função usada em `E`, `S` ou `D` não pode escrever na memória nem fazer E/S, porque a ordem dos índices não existe.

## GPU
`ondac -g px` gera GLSL ES 3.0 para a função `px` e para tudo o que ela chama.
Assinatura: `ii..>i` ou `ff..>i`. Os parâmetros extra recebem u[0]=tempo, u[1]=largura, u[2]=altura, u[3..4]=rato.
Na GPU, `i` é int32 e `f` é float32. Memória e E/S são só de CPU.

## Ferramentas
- `./build.sh` faz o arranque: Rust → ondac1 → ondac2 → ondac3. Exige `ondac1.c == ondac2.c == ondac3.c`. `--semente` arranca só a partir de `seed/ondac.c`.
- `./onda run f.onda`: compila e corre, com cache por hash. O que já foi compilado nunca se recompila.
- `./onda c f.onda` gera C portátil; `./onda gpu f.onda px` gera GLSL; `web/ondac.wasm` é o compilador para o browser.
