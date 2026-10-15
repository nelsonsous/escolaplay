# Diário das 50 iterações

Estado: **iteração 13 de 100 concluída** (as 50 pedidas e mais 50 seguidas: o utilizador pediu para não parar). Próxima: 14 (invariantes fora dos ciclos e constantes reais na memória).

Regra de cada iteração: uma pergunta, o que já existe, o que foi feito, a prova (comando e resultado) e a próxima.

---

## Iteração 1: porquê C, e porque não mais abaixo?

**Porque a v0 usa C.** O C dá duas coisas de graça: corre em qualquer processador (há compilador de C para tudo) e traz décadas de otimização (gcc/clang com -O3). Foi por isso que a Onda ficou igual a C em velocidade logo na v0.

**O que o C custa.**
- É uma dependência: é preciso ter `cc` instalado.
- É lento a compilar: a Onda gera o C em 3 ms, mas o gcc demora centenas de milissegundos, ou seja, mais de 99% do tempo.
- No browser só corre através do clang.
- Não é nosso: não podemos verificar o que o otimizador faz.

**Os níveis abaixo, e o que já existe em cada um.**

| Nível | O que já existe | Custo |
|---|---|---|
| Binário próprio (x86-64, ARM64, WebAssembly) | TCC, QBE, Cranelift; copy-and-patch, que cola pedaços de máquina pré-compilados e gera código ~100× mais depressa do que o LLVM -O0 (é o que usa o JIT do CPython) | sem otimizador, o código fica mais lento até termos otimizações nossas |
| 0 e 1 (portas lógicas) | bit-blasting em verificação formal; bitslicing em criptografia, em que cada bit de uma palavra é uma execução independente (64 por instrução, 512 com AVX-512) | só serve bem para lógica inteira; os reais em portas são caros |
| Sinais elétricos (FPGA) | síntese de alto nível: Bambu, CIRCT/Calyx, Vitis HLS (C ou IR para Verilog) | exige uma FPGA e horas de síntese; aqui só dá para simular |
| Qubits | oráculos reversíveis pelo truque de Bennett (computar, copiar, descomputar); são o grosso dos circuitos de Grover e Shor | precisa de hardware quântico; aqui só dá para simular |

**A decisão (a invenção).** Em vez de escolher um nível, a Onda passa a ter uma única representação de baixo nível, um grafo de sinais (bits e palavras). Todos os alvos saem dela, e todos são julgados pelo mesmo significado, como na Onda Viva:
1. **Binário escrito pela própria Onda:** WebAssembly byte a byte e x86-64 com ELF, sem C, sem clang e sem assembler.
2. **Circuito:** as funções inteiras puras são achatadas em portas lógicas, das quais saem três coisas:
   - bitslicing na CPU, 64 entradas por instrução, que é sobreposição verdadeira em software;
   - Verilog, para sinais elétricos numa FPGA;
   - um oráculo reversível em OpenQASM, para hardware quântico.
3. **Juiz único:** cada forma, em cada nível, tem de concordar com o significado antes de ser usada.

As peças existem em separado. Que eu saiba, ninguém as juntou numa linguagem pequena que se compila a si própria, com um juiz comum do software ao circuito e ao qubit.

**Plano.**
- 2–9: WebAssembly binário escrito pela Onda (LEB128, módulo, memória, controlo, chamadas, runtime em Onda), terminando com o compilador a compilar-se a si próprio para WebAssembly sem clang.
- 10–19: x86-64 nativo com ELF, sem C: chamadas ao sistema, reais SSE2, ponto fixo nativo, medição contra o gcc e otimizações próprias.
- 20–28: circuitos: portas lógicas, simulação, bitslicing, Verilog, otimização do circuito, contagem de portas e profundidade.
- 29–35: quântico: circuito reversível, OpenQASM 3, verificação no simulador de Grover da Onda e Grover sobre um predicado escrito em Onda.
- 36–44: Onda Viva com todos os alvos, a medição a escolher e a vigilância.
- 45–50: página, documentação, medições finais e síntese.

**Prova.** Pesquisa feita (fontes abaixo); decisões registadas neste ficheiro.

**Fontes.**
- Copy-and-patch: https://mohakchugh.is-a.dev/blog/copy-and-patch-compilation-stencils-cpython-jit e https://pydevtools.com/handbook/explanation/what-is-cpythons-jit-compiler/
- Bambu: https://github.com/ferrandi/PandA-bambu/ · Calyx: https://www.cs.cornell.edu/~asampson/media/calyx-pose-proposal.pdf · CIRCT/Calyx num fluxo completo: https://accml.dcs.gla.ac.uk/papers/2026/8th_AccML_paper_7.pdf
- Bitslicing: https://timtaubert.de/blog/2018/08/bitslicing-an-introduction/ · https://arxiv.org/pdf/2302.10083
- Oráculos reversíveis: https://si2.epfl.ch/demichel/publications/archive/2021/DATE_2021_IBM.pdf · https://arxiv.org/html/2501.05237v1

---

## Iteração 2: o grafo de sinais (representação intermédia)

**Pergunta.** Como é que um só compilador gera C, GLSL e JavaScript hoje, e WebAssembly binário, x86 e circuitos amanhã, sem repetir a lógica em cada emissor?

**O que já existe.** O LLVM IR, o MLIR, o CLIF do Cranelift e o QBE. O próprio WebAssembly é uma representação intermédia com controlo estruturado.

**O que foi feito.** O compilador passou a gerar primeiro uma representação intermédia e só depois a emite:
- 41 tipos de instrução de 8 palavras cada;
- `if`/`else`/`loop` estruturados, como no WebAssembly;
- cada temporário com o seu tipo.

Há um único emissor de texto para C, GLSL e JavaScript. Os próximos emissores (WebAssembly binário, x86, portas lógicas) leem a mesma representação.

**Prova.**
- Ponto fixo atingido (SHA-256 `efc954ef…`). O C do arranque em Rust continua idêntico ao que a Onda gera para si própria.
- 11 saídas idênticas, bit a bit, às da versão anterior: o C dos 6 exemplos e do compilador, e o GLSL e o JavaScript dos 2 exemplos de GPU. As mensagens de erro também são as mesmas.
- O compilador ficou mais pequeno: 80 KB em WebAssembly (eram 114 KB) e 38 KB nativo.
- 6 de 6 testes da Onda Viva passaram.

**Problema encontrado e corrigido.** Com o novo buffer da representação intermédia, a versão WebAssembly ultrapassou a memória disponível (72 MB): a saída vinha vazia e 5 testes falharam. Reduzi o buffer de saída de 5 para 3 milhões de palavras, que continua com folga, e os testes voltaram a passar.

---

## Iteração 3: o primeiro binário escrito pela própria Onda

**Pergunta.** A Onda consegue produzir um executável sem passar por C, clang ou um assembler?

**O que já existe.** Compiladores que emitem WebAssembly diretamente, como o AssemblyScript e o Binaryen. Normalmente são programas grandes, com o runtime escrito noutra linguagem.

**O que foi feito.**
- **Emissor `ondac -w`:** lê a representação intermédia e escreve o módulo WebAssembly byte a byte (LEB128, tipos, importações, memória, exportações, código e dados).
- **Memória:** M[p] fica no byte (p+16)·8. As 16 palavras abaixo de zero guardam o estado do runtime.
- **Runtime em Onda:** saída com buffer, desvio para a memória (`O`), impressão de inteiros e alocação são funções Onda (`_op`, `_os`, `_on`, `_oa`, `_go`…), anexadas ao programa e compiladas juntamente com ele.
- **Nova operação `Y c a b`:** chamada ao sistema anfitrião. O anfitrião só oferece três portas: `sys`, `m1` e `m2`. A versão para Node está em `wasm/host.js`, com cerca de 30 linhas.

**Prova.**
- "Olá mundo" com 1 644 bytes de WebAssembly e fib(35) com 1 756 bytes, ambos corretos. O fib(35) demora 66 ms no V8, contra 15 ms em C -O3 e 110 ms em JavaScript.
- `test/w/inteiros.onda` exercita aritmética com negativos, operações de bits, comparações, curto-circuito com efeitos, recursão (Ackermann, MDC, primos), memória, desvio de saída, argumentos, entrada e código de saída. As 41 linhas de saída são idênticas às da versão em C, e o código de saída também (3). O teste corre com `test/w/correr.sh`.
- O ponto fixo mantém-se e o arranque em Rust continua a dar o mesmo C. Os 6 testes da Onda Viva passaram depois de reconstruir o `ondac.wasm`.

---

## Iteração 4: reais e campos no WebAssembly

**Pergunta.** O binário escrito pela Onda consegue fazer tudo o que a versão em C faz com números reais, funções matemáticas e campos?

**O que foi feito.**
- **Literais reais:** a própria Onda converte o texto decimal para os bits IEEE 754. A mantissa é acumulada em real e há uma única divisão por 10^k, o que dá arredondamento exato até 15 algarismos e 22 casas decimais (o caminho rápido de Clinger).
- **Operações:** reais, comparações e conversões `F`/`I` (com saturação, sem rebentar). `Sq`, `Fl` e `Ab` são instruções nativas; seno, cosseno, exp, log, pow e atan2 vêm pelas portas `m1`/`m2`.
- **Campos `E`, `S` e `D`:** são emitidos como ciclos com três locais extra por função. `D` escreve o PPM através do runtime em Onda (`_ph`, `_op`).
- **Impressão de reais:** `_og` formata através do anfitrião, que imita o `%.15g` do C.

**Prova.**
- **Testes exatos** (`test/w/`): `inteiros`, `reais` e `imagem` dão os mesmos bits em C e em WebAssembly. Inclui literais como 0.0035, 2. e 1000000000000000000000.0, a formatação 1e+21 e 1.5e-06, e uma imagem PPM.
- **Exemplos reais:** os fractais `julia` e `ondas` são iguais nos 1 555 215 bytes; o π dá 3.14159265359048 nos dois; Grover dá P(alvo) = 0.999999757396816 nos dois.
- **Erro encontrado e corrigido:** `I -3.99` dava 0 porque usei o código da conversão sem sinal (0xFC 07). O correto é com sinal (0xFC 06).

**Ponto fraco, para otimizar:** o WebAssembly está 3 a 7 vezes mais lento do que o C -O3 (π: 990 ms contra 260 ms; Grover muito mais). As causas prováveis são chamadas sem inlining nos ciclos de campo, o cálculo do endereço em cada acesso e muitas variáveis temporárias.

---

## Iteração 5: o compilador compila-se a si próprio para WebAssembly, sem C

**Pergunta.** O binário escrito pela Onda já é bom o suficiente para ser o próprio compilador?

**O que foi feito.**
- **Memória a crescer:** o runtime em Onda passou a pedir memória ao anfitrião (`Y 7`, que chama `memory.grow`). Assim o módulo arranca com 2 MB e cresce até onde o programa precisar; o compilador precisa de cerca de 60 MB.
- **Ponto fixo em WebAssembly no `build.sh`:** o compilador nativo gera `w1.wasm`; `w1` compila-se a si próprio e dá `w2`; `w2` dá `w3`.
- **Segunda semente:** `seed/ondac.wasm` é uma semente binária. Basta um motor de WebAssembly e o anfitrião de cerca de 30 linhas.

**Prova.**
- `w1 == w2 == w3`, bit a bit (99 278 bytes, SHA-256 `e6979ea4…`). Nenhum byte foi escrito por C, clang ou assembler.
- O compilador em WebAssembly gera a semente C exata, os 148 243 bytes, em 66 ms incluindo o arranque do Node.
- O GLSL e o JavaScript gerados por `w2` são idênticos aos da versão nativa.
- `test/w/correr.sh`: C igual a WebAssembly em todos os testes. Os 6 testes da Onda Viva passaram.

**O que isto muda.** A cadeia já não depende de C para chegar ao browser nem a qualquer motor de WebAssembly. O C passa a ser só uma das saídas possíveis, e não a base.

---

## Iteração 6: as páginas deixam o clang

**Pergunta.** Se o compilador já se gera a si próprio em WebAssembly, para que serve ainda o clang no browser?

**O que foi feito.**
- **Carregador novo:** o `web/ondac.js` passou a carregar a semente `seed/ondac.wasm`, escrita pela Onda, com o anfitrião de três portas. É o mesmo do Node, adaptado ao browser.
- **Páginas:** o `montar.py` usa essa semente nas duas páginas e passa a montá-las a partir de diretórios limpos.
- **Ficheiros mostrados:** a página da linguagem mostra o `host.js` em vez da libc para clang.

**Prova.**
- Os 6 testes da Onda Viva passaram com a semente da Onda.
- No Chromium (sem GPU física):
  - na página da linguagem, o compilador compila-se a si próprio em 37,8 ms e o SHA-256 bate certo (`1fc0bb26…a7ba`);
  - na Onda Viva, o compilador é verificado em 34,9 ms e a forma CPU é promovida (16×);
  - o erro injetado é rejeitado e a forma GPU é promovida (98% dentro da tolerância);
  - zero erros na consola e nenhum transbordo a 400 px.
- As duas páginas foram republicadas (versão 2) e já correm o compilador escrito pela Onda.

---

## Iteração 7: um executável x86-64 nativo escrito pela Onda

**Pergunta.** Dá para chegar ao processador sem C, sem assembler e sem linker?

**O que já existe.** O TCC e o chibicc geram código de máquina diretamente, mas são escritos em C. O Go tem assembler e linker próprios, mas é um projeto enorme.

**O que foi feito.**
- **Emissor `ondac -x`:** lê a representação intermédia e escreve as instruções x86-64 byte a byte. Cada temporário vive num lugar da pilha (`[rbp+d]`). Os saltos estruturados são corrigidos no fim com uma pilha de controlo, e as chamadas com uma lista de correções.
- **Executável ELF64 escrito pela Onda:**
  - dois segmentos: código (RX) e memória M (RW, 512 MB reservados de forma preguiçosa);
  - entrada em `0x4000b0`;
  - M[0] em `0x10000080`, guardado no registo r15.
- **Rotina do sistema** (cerca de 300 bytes de máquina escritos pela Onda), com chamadas diretas ao Linux:
  - escrever (convertendo palavras em bytes);
  - ler com buffer;
  - sair;
  - argc e argv a partir da pilha inicial;
  - relógio (`clock_gettime`);
  - capacidade da memória.
- **Runtime:** o mesmo runtime escrito em Onda do WebAssembly.

**Prova.**
- O "olá mundo" nativo tem 9 024 bytes. O `readelf` confirma um ELF64 x86-64 válido, e o programa corre e sai com 0.
- `test/w/inteiros.onda` dá a mesma saída que o C (41 linhas) e o mesmo código de saída (3). Corre com `test/w/correr.sh`.
- O ponto fixo em C e em WebAssembly mantém-se.

**Ponto fraco, para otimizar:** fib(35) demora 481 ms no nativo da Onda contra 15 ms em C -O3, porque guarda tudo na pilha e não atribui registos. Fica para as iterações de otimização.

---

## Iteração 8: reais, matemática e campos no x86 nativo

**Pergunta.** Sem libm nem printf, o executável nativo consegue fazer contas com reais como o C?

**O que foi feito.**
- **Reais em SSE2:** `addsd`/`subsd`/`mulsd`/`divsd`, `ucomisd` com o tratamento correto de NaN nas comparações (`seta`/`setae`, e `setnp`/`setp` para `==` e `!=`), `cvtsi2sd`/`cvttsd2si`, `sqrtsd`, `roundsd` para o chão, `btr` para o módulo, e `minsd`/`maxsd`.
- **Funções transcendentes em x87:** `fsin`, `fcos`, `fyl2x` para o log e `fpatan` para atan2. A exponencial e a potência usam `f2xm1` + `fscale`.
- **Campos `E`, `S` e `D`:** ciclos em código de máquina que usam lugares extra da pilha.
- **`%.15g` escrito em Onda** (`_of`, `_od`, `_om`): procura do expoente, mantissa de 15 algarismos com potências de 10 exatas e escolha entre notação fixa e exponencial como no C.

**Prova.**
- **Testes exatos:** `inteiros`, `reais` e `imagem` dão saída idêntica à do C, tanto no WebAssembly como no x86 nativo. Inclui 0.3, 1e+21 e 1.5e-06 formatados exatamente como o printf.
- **Exemplos reais:** os fractais `julia` e `ondas` são iguais nos 1 555 215 bytes, o que mostra que o x87 bateu certo com a libm nestes casos. O π dá 3.14159265359048 e Grover dá P(alvo) = 0.999999757396816, iguais ao C.
- **Erro do runtime apanhado pelo compilador:** um `?` com um ramo real e outro inteiro em `_of`.

**Ponto fraco (a seguir):** o código nativo é muito lento.

| Programa | Nativo da Onda | C -O3 sequencial |
|---|---|---|
| π | 7,9 s | 0,26 s |
| Grover | 23,7 s | — |
| fib(35) | 387 ms | 15 ms |
| fractal | 274 ms | 46 ms |

A causa é a geração ingénua: cada valor passa pela memória e cada chamada empilha todos os argumentos.

---

## Iteração 9: três pontos fixos e três sementes

**Pergunta.** O executável nativo é bom o suficiente para ser o próprio compilador?

**O que foi feito.**
- **Ponto fixo nativo no `build.sh`:** `ondac -x` gera `x1`; `x1` compila-se a si próprio e dá `x2`; `x2` dá `x3`.
- **Terceira semente:** `seed/ondac-x86-64`, um ELF de 258 240 bytes.
- **Novo arranque `./build.sh --semente-x86`:** usa só a semente nativa, sem Rust, sem compilador de C e sem Node.
- **Limpeza:** o `ondac.wasm` feito com clang e uma ferramenta antiga foram removidos, porque as páginas já usam a semente da Onda.

**Prova.**
- `x1 == x2 == x3`, bit a bit (SHA-256 `b44ebe9e…`).
- `x2` gera a semente C exata (em 37 ms) e a semente WebAssembly exata. O GLSL e o JavaScript são idênticos aos do compilador original.
- `./build.sh --semente-x86`: a semente nativa recompila-se a si própria, bit a bit.

**Estado da independência.** Há três caminhos fechados (C, WebAssembly e código de máquina), e cada um é capaz de reconstruir os outros. O C deixou de ser obrigatório.

---

## Iteração 10: inlining e ciclos explícitos, e uma descoberta sobre o V8

**Pergunta.** Onde se perde o tempo nas formas próprias, e o inlining resolve?

**O que foi feito.**
- **Inlining:** as funções pequenas (até 80 tokens) e não recursivas passam a ser expandidas no sítio, com ambitos próprios para os nomes. GETV e SETV guardam o índice do local, para que as expansões não se confundam.
- **Ciclos explícitos:** os campos `E`, `S` e `D` passam a ser ciclos escritos na representação intermédia, com a função de cada elemento expandida lá dentro (e o que ela chamar, até 4 níveis).
- **C, GLSL e JavaScript não mudam:** quem os otimiza é o gcc ou o motor de JavaScript. O C do arranque em Rust continua igual ao da Onda.

**Prova.**
- Os três pontos fixos continuam fechados. `inteiros`, `reais` e `imagem` dão o mesmo resultado em C, WebAssembly e x86, e os fractais continuam iguais ao C.
- **x86:** o π passou de 7,9 s para 5,1 s (1,56× mais rápido); o fractal de 274 ms para 256 ms.

**O que correu mal, e porquê.**
- **Inlining em todo o lado:** com inlining em todas as chamadas, as funções do compilador incharam e o compilador em WebAssembly rebentou a pilha. Por isso o inlining passou a fazer-se só dentro dos campos.
- **WebAssembly mais lento:** π de 990 para 1191 ms e Grover de 6,7 para 8,7 s. A causa: o V8 não faz substituição a meio da execução (OSR) em WebAssembly. Um ciclo dentro de uma função chamada uma só vez, como o `main`, fica no nível básico (Liftoff) do princípio ao fim. Antes, a função de cada elemento era chamada milhões de vezes e subia de nível depressa.
- **Decisão:** no WebAssembly, a função de cada elemento fica separada (π 1039 ms, Grover 6,9 s); o inlining e os ciclos explícitos ficam só no x86.

**Conclusão:** o x86 continua lento porque cada valor passa pela memória. A próxima peça é atribuir registos.

## Iteração 11: os valores passam a viver em registos

**Pergunta.** Se cada valor do x86 vai à memória e volta, quanto se ganha a guardá-los nos registos do processador?

**O que já existe.** Os compiladores clássicos usam coloração de grafos (Chaitin) ou varrimento linear (Poletto e Sarkar, usado nos JIT por ser rápido). Escolhi o varrimento linear, mas com uma ocupação exata por posição em vez de uma lista de intervalos ativos.

**O que foi feito** (`src/8xreg.onda`, 139 linhas em Onda):
- **Vida de cada valor:** cada temporário e cada variável tem um intervalo de posições. Os usos da instrução i ficam em 2i+2 e as definições em 2i+3, para que um valor que morre e outro que nasce na mesma instrução possam partilhar o registo.
- **Ciclos:** quem vive à entrada de um ciclo fica com o registo até ao fim do ciclo.
- **Variáveis lidas antes de escritas:** uma variável escrita num ramo e lida depois dele pode ser lida sem ter sido escrita. Deteto esse caso contando os fechos de cada nível de condição. Só essas variáveis são postas a zero no início da função; antes, a função zerava a moldura toda com `rep stosq`.
- **Prioridade:** os valores dos ciclos mais fundos escolhem registo primeiro.
- **Registos usados:** 10 inteiros (rbx, rsi, rdi, r8 a r14) e 14 reais (xmm2 a xmm15). Os registos rax, rcx, rdx, xmm0 e xmm1 ficam de rascunho, e o r15 é a memória.
- **Chamadas:** um valor que atravessa uma chamada fica na memória, porque nenhum registo é preservado. Assim a convenção de chamada continua simples.
- **Movimentos:** cada leitura e escrita escolhe o movimento certo (memória, registo inteiro, xmm, ou `movq` entre os dois). A matemática x87 passa por uma palavra de rascunho.
- **Limpeza:** o código antigo dos campos no x86 saiu, porque os campos já chegam como ciclos explícitos.

**Prova** (a mesma máquina, a iteração 10 contra a 11):

| programa | antes | depois | ganho |
|---|---|---|---|
| fib(35) | 407 ms | 72 ms | 5,6× |
| autocompilação do compilador nativo | 87 ms | 29 ms | 3,0× |
| fractal (julia) | 306 ms | 186 ms | 1,6× |
| Grover (20 qubits) | 9,6 s | 6,8 s | 1,4× |
| π (200 milhões de pontos) | 4,8 s | 3,5 s | 1,4× |

- Os três pontos fixos continuam fechados.
- O compilador nativo encolheu de 274 800 para 221 552 bytes.
- `inteiros`, `reais` e `imagem` dão o mesmo resultado em C, WebAssembly e x86.

**O que falta, e porquê.** O π continua 13× mais lento do que o C. O código ainda passa todos os operandos pelos registos de rascunho. Pior, cada leitura de uma variável real faz a ida e volta xmm → rax → xmm, e isso fica na cadeia do acumulador. A seguir: operandos diretos em registo, movimentos reais sem passar pelo rax, e comparação fundida com o salto.

## Iteração 12: operandos diretos, e o x86 da Onda passa o gcc no π

**Pergunta.** Com os valores em registos, porque é que o π continuava 13× mais lento do que o C?

**Diagnóstico** (desmontagem do ciclo com `objdump`). Cada operação passava pelos registos de rascunho: `mov rax,b; mov rcx,c; op; mov d,rax`. Pior, cada leitura de uma variável real fazia a ida e volta xmm → rax → xmm. São cerca de 6 ciclos a mais na cadeia do acumulador, em cada iteração.

**O que foi feito** (`src/9xsel.onda`, 128 linhas em Onda):
- **Operandos diretos:** as operações inteiras e reais são calculadas no registo do destino, com o segundo operando em registo, na moldura ou imediato (`add r, [rbp+m]`, `addsd x, x`, `imul r, r, imm`).
- **Imediatos:** um literal inteiro de 32 bits já não ocupa registo; cada leitura usa o valor (`cmp r, 200`, `push 72`, `mov [r15+8*9], r`).
- **Movimentos:** cópias entre variáveis e temporários vão direto entre registos (`mov`, `movaps`), sem passar pelo rax.
- **Comparação fundida:** uma comparação cujo único uso é o salto seguinte vira `cmp` + `jcc` (para os reais, `ucomisd` + `jbe`/`jb`, correto com NaN).
- **Memória:** `@`, `!`, `@f` e `!f` endereçam `[r15 + r*8]` ou `[r15 + 8*imediato]` diretamente.
- **Conversões:** `F`, `I` e `Sq` operam direto nos registos. O `xorps` antes de `cvtsi2sd` evita a falsa dependência.

**Prova** (a mesma máquina; C = gcc -O2 sem OpenMP):

| programa | it. 11 | it. 12 | C (gcc -O2) | WebAssembly (V8) |
|---|---|---|---|---|
| π (200 milhões de pontos) | 3 480 ms | **403 ms** | 478 ms | 919 ms |
| Grover (20 qubits) | 6 761 ms | **1 767 ms** | 1 224 ms | 7 051 ms |
| fractal (julia) | 186 ms | 162 ms | 43 ms | — |
| fib(35) | 72 ms | 75 ms | 17 ms | 55 ms |
| autocompilação nativa | 29 ms | **14 ms** | — | — |

- **O π nativo da Onda é mais rápido do que o gcc -O2:** é o mesmo programa, compilado pela Onda, sem C, sem assembler e sem linker.
- O compilador nativo desceu de 221 552 para 168 304 bytes.
- Os três pontos fixos continuam fechados, e as três provas dão o mesmo resultado em C, WebAssembly e x86. O fractal sai igual ao byte.

**O que falta.**
- **fib:** o resultado de um `?` fica na memória porque o seu intervalo atravessa as chamadas do outro ramo, mas ele nunca está vivo nesse ramo. A solução é a vida dividida.
- **Chamadas:** cada chamada ainda gasta um `add rsp` (o chamado pode retirar os argumentos com `ret n`).
- **julia:** o `&&` da condição do ciclo materializa 0/1 três vezes antes do salto.

## Iteração 13: saltos em cadeia, aliases e promoção nos ciclos (o Grover chega ao C)

**Pergunta.** O que resta entre o x86 da Onda e o gcc, depois dos registos e dos operandos diretos?

**O que foi feito.**
- **Saltos em cadeia:** um salto por corrigir guarda no seu rel32 o próximo salto da mesma cadeia. Assim, `&&` e `||` numa condição viram só saltos, sem materializar 0/1, e as comparações fundem-se com eles.
- **Vida dividida:** o resultado de `?`, `&&` ou `||` só ocupa o registo no instante em que é escrito antes do salto para o fim. Já não atravessa as chamadas do outro ramo.
- **O chamado retira os argumentos:** a função termina com `ret n`, e cada chamada poupa um `add rsp`.
- **Aliases (propagação de cópias):**
  - uma variável escrita uma só vez lê direto o valor que recebeu. No π, `n` passou a ser o imediato 200 000 000;
  - uma leitura de variável lê o local da própria variável, sem cópia;
  - um resultado cujo único uso é a escrita numa variável é calculado já no local dela, e `= i + i 1` vira `add rbx, 1`.
- **Promoção:** num ciclo sem chamadas, o que vive na memória (porque atravessa chamadas noutro sítio) é carregado num registo livre antes do ciclo e escrito depois.
- **Alinhamento:** ciclos e funções começam em múltiplos de 16 bytes. Na iteração 12, o mesmo ciclo do Grover, deslocado 5 bytes, ficou 12% mais lento.

**O que correu mal, e porquê.**
- As primeiras variáveis de estado da promoção ficaram nas células 64 a 68. No runtime C, o monte começa em 64 (`HP=64`), por isso essas variáveis escreviam por cima do texto do programa, e o compilador deixava de encontrar o `main`.
- Os testes não apanharam o erro, porque os programas de teste são maiores e o texto estragado caía noutro sítio.
- **Correção:** o estado passou para um bloco apontado pela célula 61. A regra fica escrita no código: as globais acabam em 63.
- **Novo teste `fluxo.onda`:** ciclos com variáveis na memória, `&&`/`||` nas condições, `?` que atravessa chamadas, `= x ? c 1 x`, variáveis lidas antes de escritas e divisões negativas.

**Prova** (mínimo de 5 a 10 corridas, a mesma máquina; C = gcc -O2 sem OpenMP):

| programa | it. 12 | it. 13 | C |
|---|---|---|---|
| Grover (20 qubits) | 1 742 ms | **1 209 ms** | 1 170 ms |
| fractal (julia) | 152 ms | 129 ms | 36 ms |
| π | 409–442 ms | 409–419 ms | 402 ms |
| fib(35) | 63–67 ms | 60–69 ms | 17 ms |

- **Grover:** o ciclo do `S` passou de 14 para 8 instruções, e fica a 3% do gcc.
- **π:** está ao nível do gcc. Ambos estão limitados pelas duas divisões por iteração.
- **fib:** o resto vem das chamadas. O gcc transforma a recursão.
- Os três pontos fixos continuam fechados, e o compilador nativo tem 147 824 bytes.
- `fluxo`, `inteiros`, `reais` e `imagem` dão o mesmo resultado em C, WebAssembly e x86. O fractal sai igual ao byte.
