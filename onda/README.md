# Onda

Uma linguagem de programação escrita por IAs, para IAs. Cada valor é um campo em sobreposição, e o compilador colapsa-o na CPU, na GPU ou em WebAssembly, à velocidade de C. O compilador está escrito em Onda e compila-se a si próprio, bit a bit.

A **Onda Viva** vai mais longe: um programa com o compilador embutido que gera versões mais rápidas de si próprio, verifica cada uma contra o seu significado e só usa as que passam.

- Página da linguagem, com o compilador a correr no browser: https://claude.ai/artifact/GRcUUwyG96GRcXnhxVtifN
- Onda Viva: https://claude.ai/artifact/3hu9z4r8JawUqm5fLWmXMp

## Começar

```sh
./build.sh                  # arranque 100% Onda: semente WASM (so Node) -> ponto fixo bit a bit, sem Rust nem C
./build.sh --semente-x86    # ainda mais puro: so a semente nativa x86-64, sem Node
./build.sh --c              # ponte C opcional: so para portar a um CPU sem backend nativo (seed/ondac.c)
./onda run ex/grover.onda   # compila e corre, com cache por hash
./onda c ex/fib.onda        # C portatil
./onda gpu ex/julia.onda px # GLSL para a GPU
build/ondac -x < ex/pi.onda > pi && chmod +x pi   # executavel x86-64 escrito pela Onda, sem C nem assembler
./onda circ ex/oraculo.onda alvo                  # a funcao vira um circuito (AIGER); -v da Verilog
build/ondac -q alvo < ex/oraculo.onda             # o mesmo predicado vira um programa de Grover em OpenQASM 3
./onda run ex/qasm.onda < f.qasm                   # simulador quantico escrito em Onda: corre esse programa
ONDA_ARM=kv.arm ./onda run ex/arm.onda poe 1000000 # armazem persistente: a memoria e o ficheiro
node --test test/*.test.js  # todos os testes (80): + integracao numerica e CRC-32
sh test/w/correr.sh         # o mesmo programa em C, WebAssembly e x86 da o mesmo resultado
node wasm/host.js seed/ondac.wasm < ex/fib.onda  # o compilador em WebAssembly escrito pela propria Onda
python3 web/montar.py       # monta as duas paginas em build/
```

## Estrutura

| Caminho | Conteúdo |
|---|---|
| `SPEC.md` | a linguagem inteira, escrita para IAs |
| `src/*.onda` | o compilador, em Onda: C, GLSL, JavaScript, WebAssembly e x86-64 escritos byte a byte, circuitos (AIGER, Verilog) e oráculos quânticos (OpenQASM 3) |
| `src/9mat.onda` | a matemática (seno, coseno, exp, log, atan2, pow) escrita em Onda, gerada por `tools/gerar_mat.py` |
| `seed/ondac.c`, `seed/ondac.wasm`, `seed/ondac-x86-64` | três sementes geradas pela própria Onda: C, WebAssembly e executável x86-64 (ELF) — a Onda arranca de qualquer uma, sem Rust nem C |
| `boot/` | arranque em Rust do estágio 0 — **desativado**, mantido só como histórico: a Onda já arranca das suas próprias sementes |
| `rt/prelude.c` | runtime C mínimo (só para o alvo C opcional) |
| `wasm/` | anfitrião WebAssembly de três portas (`host.js`) |
| `web/` | carregador WebAssembly, intérprete de referência (`significado.js`), núcleo da Onda Viva e as duas páginas |
| `ex/` | exemplos: fractal, ondas, Grover, π, fib, simulador de OpenQASM (`qasm.onda`), armazém chave-valor (`arm.onda`), `fib` memorizado (`memo.onda`) um interpretador de Brainfuck (`bf.onda`), matmul pelo paradigma de campo (`matmul.onda`), SHA-256 (`sha256.onda`), o Jogo da Vida (`life.onda`) um avaliador de expressões (`calc.onda`) e uma mini-linguagem Turing-completa (`mini.onda`) um crivo de Eratóstenes (`crivo.onda`) um armazém endereçado por conteúdo (`cas.onda`), base64 (`b64.onda`) um matcher de expressões regulares (`regex.onda`) aritmética de precisão arbitrária (`big.onda`) quicksort (`qsort.onda`) BFS num labirinto (`maze.onda`) integração de Simpson (`integra.onda`) e CRC-32 (`crc.onda`) |
| `bench/` | comparações com C, JavaScript e Python |
| `test/`, `tools/` | testes e ferramentas de verificação (GPU, WebAssembly, páginas) |

## O que está verificado

- **Ponto fixo:** `ondac1.c`, `ondac2.c` e `ondac3.c` são iguais bit a bit (81 581 bytes, SHA-256 `3d642bfb…4326`), e as três sementes da própria Onda (C, WebAssembly, x86-64) geram o mesmo C.
- **GPU igual à CPU:** o shader GLSL da Onda renderiza em WebGL2 (Chromium/SwiftShader) e dá a mesma imagem que a forma CPU — 100% dos píxeis dentro de ±8/255. Agora dentro do `node --test` (`test/gpu.test.js`), não só numa ferramenta à parte.
- **Velocidade (4 núcleos):** fib(35) em 15 ms (C: 16 ms); π com 200 milhões de termos em 68 ms (C sequencial: 246 ms, C com OpenMP à mão: 67 ms); fractal 960×540 em 13 ms (C sequencial: 31 ms).
- **Grover com 20 qubits:** o alvo fica com probabilidade 0,9999998.
- **Três pontos fixos:** em C, WebAssembly e x86-64, o compilador compila-se a si próprio bit a bit, e as três sementes geram o mesmo C.
- **x86 nativo** (sem C, assembler nem linker): π ao nível do `gcc -O2`, Grover a 2% dele, crivo de 10 M a ~1,3× do C.
- **Matemática igual ao bit:** `Sn Cs Ex Lg At Pw` dão os mesmos bits em C, WebAssembly, x86, JavaScript e no significado (`test/mat.test.js`). O `Pw` é o pow do fdlibm, conferido com o `StrictMath` do Java.
- **Circuitos:** cada circuito é simulado e comparado com a função compilada, e o Verilog com o AIGER (`test/circ.test.js`).
- **Oráculos quânticos:** são reversíveis e limpos (auxiliares a 0). O de Grover foi verificado nas 2²⁰ entradas de uma vez.
- **Armazém persistente (`K n`, `Kc`):** a memória é o armazenamento. Com `ONDA_ARM=ficheiro` o armazém é esse ficheiro mapeado em memória, e C, x86 e WebAssembly escrevem ficheiros iguais bit a bit. Cada `Kc` é atómico, por um diário de páginas: depois de um `kill -9` o armazém está sempre no último `Kc` (`test/arm.test.js`). Um milhão de chaves numa tabela de dispersão (`ex/arm.onda`), processo inteiro e já com o diário e o `fsync`: 213 ms a escrever e 30 ms a ler em C. O SQLite (WAL) leva cerca de 410 e 230 ms.
- **Onda Viva:**
  - a forma CPU dá os mesmos bits que o significado e é 17 a 20 vezes mais rápida;
  - a forma GPU cumpre a tolerância declarada;
  - o erro injetado é apanhado;
  - o compilador verifica-se a si próprio dentro do WebAssembly antes de ser usado.

## Limites

- A identidade bit a bit entre formas vale para código inteiro e determinístico (p. ex. o SHA-256). Uma **redução de floats** (`S`) paraleliza em C (OpenMP) e soma noutra ordem que o x86/WebAssembly (série); como a soma de vírgula flutuante não é associativa, os últimos bits podem diferir entre a forma paralela e a série (o valor concorda a ~15 dígitos). O x86 e o WebAssembly, ambos em série, batem ao bit.
- Na forma C, a velocidade é a do gcc. Na forma x86 própria, a Onda iguala o gcc em tempo nos ciclos numéricos **e** no código limitado pela memória (uma travessia de 400 milhões de nós: 1 486 ms contra 1 481 ms do gcc, apesar de executar 1,4× as instruções — a latência da memória esconde-as). A distância em tempo fica só no código limitado pelo cálculo com muitas chamadas: `fib` é 4× mais lento, por causa do protocolo de chamada (os argumentos vão à pilha), não da conta.
- "Quântico" tem dois sentidos: o modelo de paralelismo dos campos, e programas OpenQASM reais gerados a partir de funções Onda. Estes só ganham velocidade em hardware quântico, e aqui são verificados classicamente.
- Versão 0:
  - a memória só cresce;
  - na forma C, vários processos podem partilhar o armazém com segurança (trinco `flock` e confirmação por páginas: escritores em páginas diferentes não se apagam; na mesma página ganha o último); nas formas x86 e WebAssembly isto ainda é de um processo de cada vez (o formato é o mesmo);
  - cada `Kc` escreve as páginas mudadas duas vezes (diário e ficheiro);
  - não há verificação de limites nem módulos;
  - na GPU os números têm 32 bits;
  - em JavaScript os inteiros têm 53 bits e as operações de bits usam 32.
- A Onda Viva verifica por amostragem. Mudar o significado é sempre uma decisão de fora do sistema.
