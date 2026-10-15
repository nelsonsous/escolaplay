# A Onda a meio: estado às 49 iterações (de 100)

Um resumo honesto do que a Onda é hoje, o que está provado, e o que falta. Para orientação — a história detalhada está em `ITERACOES.md`.

## O que a Onda é

Uma linguagem de programação escrita por IAs, para IAs. Cada valor é um campo em sobreposição; os operadores `E`, `S` e `D` colapsam-no em paralelo (CPU multinúcleo via OpenMP, ou GPU). O compilador está escrito na própria Onda e compila-se a si mesmo.

## O que está provado (65 dos 68 testes verificam isto a cada corrida; os outros 3 são a Onda Viva)

- **Compila-se a si própria, bit a bit, em três formas.** O compilador em C, em WebAssembly e em x86-64 nativo gera-se a si mesmo, e as três sementes dão o mesmo C. O x86 e o WebAssembly são escritos byte a byte pela Onda, sem C, assembler nem linker.
- **A mesma máquina em todas as formas.** Todos os programas — incluindo o SHA-256 — dão o mesmo resultado, bit a bit, em C, x86 e WebAssembly. Se um só operador de bits divergisse numa forma, o SHA-256 não bateria certo.
- **Rápida onde interessa.** Igual ao `gcc -O2` em tempo nos ciclos numéricos (π) e no código limitado pela memória (travessia de 400 M de nós: 1 486 vs 1 481 ms). ~1,3× num misto compute+memória (crivo de 10 M). A distância fica só na recursão com muitas chamadas (`fib`, 4×), por causa do protocolo de chamada — e aí a memoização persistente torna-a irrelevante.
- **Matemática ao bit.** `Sn Cs Ex Lg At Pw` (fdlibm) dão os mesmos bits em todas as formas e no significado.
- **Gráfica.** O mesmo código corre na CPU e na GPU (GLSL/WebGL2), dentro da tolerância de 32 bits, conferido no `node --test`.
- **Quântica, por dentro.** `ondac -q` gera programas de Grover em OpenQASM 3; um simulador de vetor de estado escrito em Onda corre-os e mede o alvo com a probabilidade teórica.
- **Circuitos.** Qualquer função vira um circuito (AIGER, Verilog), com o fim dos ciclos provado por simulação exaustiva.
- **Armazenamento.** A memória é o armazenamento (`K`): com `ONDA_ARM=ficheiro`, um ficheiro mapeado em memória. Cada confirmação (`Kc`) é atómica (diário de páginas, sobrevive a `kill -9`); na forma C, vários processos partilham-no em segurança. Escreve 1 M de chaves em 213 ms, contra ~406 ms do SQLite.
- **É uma linguagem de uso geral.** Em Onda correm, iguais nas três formas: um interpretador de Brainfuck, o SHA-256, a multiplicação de matrizes pelo paradigma de campo, o Jogo da Vida, um avaliador de expressões, uma mini-linguagem imperativa Turing-completa (variáveis, `?`, `W`, blocos, **funções recursivas**), um crivo de Eratóstenes, um armazém endereçado por conteúdo, base64, um matcher de expressões regulares, aritmética de precisão arbitrária, quicksort e BFS num labirinto.
- **Diagnósticos.** Os erros mostram a linha, apontam a coluna com `^` e sugerem o nome mais próximo.
- **Onda Viva.** O intérprete de referência (o significado) e o núcleo que gera, verifica e promove formas rápidas — integrado no `node --test`.

## Gotchas úteis para quem escreve Onda

- O valor de `: main >i` é o código de saída. Um programa que acaba com `P ...` (imprimir) sai com esse byte; termina o `main` com `0` para sair limpo.
- `~` é o **não lógico** (0/1); o complemento de bits faz-se com `^ x mascara`.
- `&&` e `||` são binários: três condições precisam de dois deles (`&& && a b c`), senão a terceira fica solta como outro argumento — um erro que apanhou três programas desta sessão.
- Num campo (`E`/`S`/`D`), em C e WebAssembly a função de elemento é **chamada** por índice; para um produto interno quente, um laço explícito dentro do elemento chega à velocidade do C.
- Uma redução de **floats** com `S` paraleliza em C e soma noutra ordem que o x86/WebAssembly (série); como `+` de floats não é associativo, os últimos bits diferem entre paralelo e série (o valor concorda a ~15 dígitos). A identidade ao bit entre formas vale para código inteiro/determinístico.

## O que falta (ideias para 50–100)

- Meter em linha a função de um `S`/`E`/`D` no emissor de C, para as reduções chegarem ao C justo sem um laço à mão.
- Reduzir o custo do protocolo de chamada no x86 (a recursão a 4×).
- Uma redução de floats determinística (soma de ordem fixa no emissor) para o campo bater ao bit também com floats, não só ao valor.
- Levar o trinco e a confirmação por páginas do armazém ao x86 e ao WebAssembly (hoje só em C).
- Redução de argumento de Payne–Hanek para `sin`/`cos` de argumentos enormes.
