# Diário das 50 iterações

Estado: **iteração 69 de 100 concluída** (as 50 pedidas e mais 50 seguidas: o utilizador pediu para não parar). **A Onda x86 bate ou empata o melhor C:** mapa `-x5` (AVX-512) 413 ms ≈ `gcc -O3 -march=native` 415 ms (3,2× o `-O2`); redução `-xf` empata com o `-O3`. Três modos: `-x` (AVX2 bit-exato), `-xf` (AVX2+FMA), `-x5` (AVX-512+FMA). **Mac (Apple Silicon):** o C do mapa autovetoriza para **NEON** (`clang -O3`, 22 instr. `.2d` com `fmla`). **Autodiff (preparação):** fundação do modo reverso verificada — gradiente de regressão linear via operações de campo, igual às diferenças finitas e **bit a bit igual em C/x86/WASM** (`docs/AUTODIFF.md`). Próxima: diferenciação simbólica automática da árvore do elemento (it.70).

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

## Iteração 14: invariantes fora dos ciclos, e o campo inteiro numa só função

**Pergunta.** No fractal, porque é que cada píxel recalcula `Cs * 0.3 t`, se `t` é igual em todos os píxeis?

**O que foi feito.**
- **LICM** (`src/8xlicm.onda`): uma instrução pura cujos operandos vêm de fora do ciclo sobe para antes do ciclo mais exterior onde continua invariante. São literais, aritmética (menos a divisão inteira, que pode falhar), conversões, `Sn`/`Cs`/`Lg`/`Pw` e leituras de variáveis que o ciclo não escreve. A representação intermédia é reordenada antes da atribuição de registos.
- **Parâmetros só de leitura:** num corpo expandido, um parâmetro que nunca é atribuído passa a ser o próprio temporário do argumento, sem variável nem cópia. É isso que torna a invariância visível.
- **A função do campo expande-se sempre:** a função de um `E`, `S` ou `D` é expandida no ciclo qualquer que seja o tamanho, desde que não seja recursiva. O limite de 80 tokens fica só para as chamadas aninhadas.
- **`D` com buffer:** no x86, o ciclo dos píxeis escreve as cores num buffer, sem chamadas, e no fim `_pd` escreve os bytes de uma vez. Assim, o ciclo do píxel pode ter tudo em registos.

**Prova** (mínimo de 7 corridas; C = gcc -O2 sem OpenMP):

| programa | it. 13 | it. 14 | C |
|---|---|---|---|
| fractal (julia) | 129 ms | **84 ms** | 35 ms |
| ondas | 118 ms | **76 ms** | 30 ms |
| π | 409–490 ms | 434 ms | 438 ms |
| Grover | 1 209 ms | 1 136 ms | 1 118 ms |
| fib(35) | 60–69 ms | 62 ms | 16 ms |

- O ciclo do π tem agora 14 instruções: constantes, `F n` e o limite saíram do ciclo, e é o mesmo trabalho que o gcc faz.
- Os três pontos fixos continuam fechados.
- As provas e os dois fractais saem iguais ao C, byte a byte.

**O que falta, e uma ideia maior.** Hoje, cada píxel do ondas paga três `fsin` do x87 (de 50 a 120 ciclos cada), e o gcc usa o seno do glibc (cerca de 20 ciclos).

Mais importante: cada forma usa uma matemática diferente. O C usa o glibc, o WebAssembly e o significado usam o `Math.sin` do JavaScript, e o x86 usa o x87. Podem diferir no último bit.

**Próximo passo:** a matemática deixa de ser primitiva. Seno, coseno, exp e log passam a ser escritos em Onda, só com `+ - * /`, `Sq` e acesso aos bits. Assim, ficam iguais bit a bit em todas as formas por construção, incluindo o significado, que os interpreta.

## Iteração 15: a matemática deixa de ser primitiva

**Pergunta.** Porque é que `Sn x` havia de dar resultados diferentes conforme a forma? Nenhuma linguagem garante isso. O C usa a libm da plataforma, o x87 tem o seu `fsin`, e os motores de JavaScript usam o fdlibm.

**O que já existe.**
- O fdlibm (Sun, 1993) é a base do `Math` do V8 e do `StrictMath` do Java.
- O CORE-MATH (2022) dá funções corretamente arredondadas.

Ninguém faz a matemática fazer parte da própria linguagem, escrita nela e igual em todas as formas por construção.

**O que foi feito.**
- **Três primitivas de bits:** `Bh x` (palavra alta, com sinal), `Bl x` (palavra baixa) e `Bw h l` (monta o real). São palavras de 32 bits, como no fdlibm, para serem exatas também nos números do JavaScript. Existem nas seis formas: C, GLSL, JavaScript, WebAssembly, x86 e significado.
- **Constantes exatas:** `Bw` de dois literais é dobrado pelo compilador numa constante real exata (no x86, um `movabs`; no WebAssembly, um `f64.const`).
- **A biblioteca** (`src/9mat.onda`, gerada por `tools/gerar_mat.py`) é o porte fiel do fdlibm para seno, coseno, exp e log. Inclui a redução de argumento em três passos de Cody-Waite até 2¹⁹·π/2.
- **Quando entra:** é acrescentada ao programa só quando ele usa essas operações (o compilador procura-as fora dos textos e comentários). `Sn x` passa a ser uma chamada a `_sn`.
- **Exceções:** na GPU e no JavaScript continuam as funções nativas; o `Math` do JavaScript já é o fdlibm.
- **`-fwrapv`:** o C é compilado com `-fwrapv`, porque a aritmética da Onda dá a volta nos 64 bits sem comportamento indefinido.

**Prova** (`node --test test/mat.test.js`). Em 22 028 entradas, incluindo 0, -0, infinitos, NaN, subnormais e os limites de transbordo do exp, o C, o WebAssembly e o x86 dão os mesmos bits que o `Math` do node: zero diferenças nas quatro funções.

**Efeitos.**
- **x86:** o fractal passou de 84 para 64 ms e o ondas de 76 para 53 ms, porque o `fsin` do x87 saiu.
- **C:** está mais lento (julia de 35 para 51 ms), porque o seno do glibc é mais rápido do que o fdlibm. Em troca, as formas passam a dar os mesmos bits. As imagens do x86 e do C são iguais ao byte.
- Os três pontos fixos continuam fechados.

**Limites.**
- Acima de 2¹⁹·π/2 ≈ 823 550, o seno e o coseno ainda usam a função da plataforma. A redução de Payne-Hanek em Onda fica para mais tarde.
- `Pw` e `At` continuam primitivas.
- No WebAssembly e no x86, os textos ocupam uma palavra de 8 bytes por carácter, e os 7,5 KB da biblioteca custam cerca de 60 KB ao compilador. Empacotar os textos fica anotado.

## Iteração 16: `atan2` e `pow` também em Onda, e qual é a referência

**Pergunta.** Se `Sn` já é igual ao bit em todas as formas, o que falta para nenhuma operação real depender da plataforma?

**O que foi feito.**
- **`At` (atan2):** porte do `atan` e do `atan2` do fdlibm, na variante FreeBSD que o V8 usa.
- **`Pw` (pow):** porte do `e_pow.c` do fdlibm 5.3, cerca de 120 linhas de Onda, com o `scalbn` para resultados subnormais.
- **O pow deixou de usar deslocamentos de palavras de 32 bits sem sinal:** o teste de "y é inteiro ímpar" passou a usar `Fl`. Assim, a biblioteca corre também com os inteiros de 32 bits do JavaScript.
- **Forma JavaScript:** passa a compilar a mesma biblioteca para o `Pw`.
- **Significado:** o `web/significado.js` recebe o texto da biblioteca (escrito pelo `tools/gerar_mat.py`) e interpreta o mesmo `_pw`.

**A descoberta.** O primeiro teste deu 301 diferenças de 1 ulp no `pow` contra o `Math.pow` do node. Era o meu porte que estava errado, ou o V8?
- A referência definitiva do fdlibm é o `StrictMath` do Java, que é obrigado a dar os resultados do fdlibm 5.3, e o Java 21 estava instalado.
- Contra o Java, o pow da Onda deu zero diferenças em 10 961 pares.
- O `Math.pow` do V8 é que usa outro algoritmo e difere do fdlibm nesses 301 casos.
- No `atan2`, é ao contrário: a Onda e o V8 seguem a variante FreeBSD e diferem do fdlibm 5.3 original em 38 casos (|y/x| > 2⁶⁰ com x < 0).

**Decisão.** O `Pw` da Onda é o pow do fdlibm 5.3, em todas as formas, incluindo o JavaScript. O `Math.pow` do motor de JavaScript deixa de ser a definição.

**Prova** (10 961 pares com casos especiais, subnormais, transbordos e potências perto de 1):

| forma | `Pw` contra o fdlibm (Java) | `At` contra o V8 |
|---|---|---|
| C | 0 diferenças | 0 diferenças |
| WebAssembly | 0 | 0 |
| x86 | 0 | 0 |
| forma JavaScript | 0 | 0 |
| significado | 0 | 0 |

- `node --test test/mat.test.js`: seis testes, com 24 âncoras do fdlibm tiradas do Java para o significado, por isso não é preciso Java para os correr.

**O que correu mal.** Dei o mesmo nome (`LG2`) a duas constantes: ao coeficiente do log e ao ln 2 do pow. O dicionário do Python ficou com a segunda sem aviso, e o log passou a errar no 5.º algarismo. O teste do log apanhou-o logo, e o gerador passou a recusar nomes repetidos.

**Mudança de plano.** Os campos em vários núcleos ficam para mais tarde. A seguir vêm os textos empacotados, que poupam cerca de 60 KB a cada compilador, e depois os circuitos.

## Iteração 17: textos empacotados, compiladores com metade do tamanho

**Pergunta.** Porque é que o compilador nativo tem 286 KB, se o código de máquina é bem menos?

**Diagnóstico.** No WebAssembly e no x86, cada carácter de um texto ocupava uma palavra de 8 bytes. O compilador carrega o prelúdio do C, o runtime e a biblioteca de matemática como texto, e esses 7 bytes vazios por carácter eram mais de metade do binário.

**O que foi feito.**
- **Empacotamento:** os textos passam a ter 8 caracteres por palavra (bytes em little-endian), alinhados à palavra seguinte. O `sreg` reserva ⌈n/8⌉ palavras, e o escritor de dados escreve os bytes.
- **Impressão:** o `_os` extrai cada byte com `& >> @ + p >> j 3 * 8 & j 7 255`, em Onda pura, igual nas duas formas.
- **Reais no WebAssembly:** o `_og`, que imprime reais formatados pelo host num buffer de palavras, deixou de passar pelo `_os`.

**Prova.**

| compilador | antes | depois |
|---|---|---|
| WebAssembly | 326 931 bytes | **171 279 bytes** |
| x86-64 nativo | 286 472 bytes | **130 736 bytes** |

- Os três pontos fixos continuam fechados.
- `inteiros`, `reais`, `imagem` e `fluxo` dão o mesmo resultado em C, WebAssembly e x86, e os sete testes de matemática e da Onda Viva passam.
- **No browser,** a página da Onda Viva verifica o compilador: ele compila-se a si próprio em 49 ms e dá o SHA-256 da semente C. A forma JavaScript sai igual ao bit ao significado, e o erro injetado é rejeitado.
- A autocompilação nativa continua em 13 a 25 ms.

## Iteração 18: de uma função Onda a portas lógicas

**Pergunta.** Porque não descer até aos 0 e 1, aos sinais elétricos? O que é preciso para uma função Onda virar um circuito?

**O que já existe.**
- A síntese de alto nível (Vivado HLS, Bambu, CIRCT/Calyx) transforma C em hardware, mas precisa de anotações e de ferramentas pesadas.
- Os grafos E-inversor (AIG) são a forma comum das ferramentas de síntese (ABC, Yosys), e o AIGER é o formato onde se trocam.

**O que foi feito** (`src/9circ.onda`, cerca de 280 linhas em Onda). O modo `ondac -c f` (ou `./onda circ prog.onda f`) faz bit-blasting da representação intermédia de `f`:
- **Fios:** cada inteiro é um vetor de W fios (W = 64, ou `: bit >i N`).
- **Portas:** E com dispersão estrutural, de modo que a mesma porta nunca se cria duas vezes, e constantes propagadas na criação.
- **Aritmética:** `+`/`-` são somadores em cadeia; `*` é um multiplicador de deslocamento e soma, que salta os produtos parciais nulos de uma constante.
- **Deslocamentos:** por constante são só fios; os outros são um deslocador em barril de 6 andares.
- **Comparações:** com sinal, com transbordo correto.
- **Ramos:** `?`, `&&` e `||` fundem as variáveis com multiplexadores no fim de cada ramo.
- **Chamadas e ciclos:** as chamadas são expandidas, e os ciclos com número fixo de voltas são desenrolados.
- **Saída:** AIGER ascii com nomes dos fios e um comentário com as portas úteis (cone das saídas) e a profundidade.

**Prova** (`node --test test/circ.test.js`). Cada circuito é simulado bit a bit em paralelo, com cada fio a ser um número de 256 bits e um bit por vetor de teste. O resultado é comparado com a mesma função compilada em C: os dez são iguais em todos os 256 vetores, incluindo 0, -1, o mínimo de 64 bits e deslocamentos de 63 e 64.

| função | portas E (64 bits) | profundidade |
|---|---|---|
| `soma a b` | 568 | 128 |
| `maj` (maioria bit a bit) | 320 | 3 |
| xorshift (3 deslocamentos e ou-exclusivos) | 480 | 6 |
| contagem de bits (ciclo de 64 voltas) | 8 064 | 188 |
| `* a b` | 19 722 | 373 |
| `<< a b` (barril) | 1 026 | 12 |
| máximo de três | 1 170 | 272 |

Com `: bit >i 8`, o somador tem 64 portas, o multiplicador 234 e a contagem de bits 112.

**O que falta, e porquê.**
- **Profundidade:** o somador em cadeia é pequeno mas lento (128 níveis). Um somador de prefixos (Kogge-Stone) desce para cerca de 14.
- **Falta ainda:**
  - divisão;
  - ciclos com número de voltas variável (desenrolados com predicados até um limite);
  - saída em Verilog;
  - a ponte para o quântico: o mesmo AIG, tornado reversível, é um oráculo de Grover.

## Iteração 19: circuitos com divisão, ciclos variáveis, somadores rápidos e Verilog

**Pergunta.** O que impede uma função Onda qualquer (com divisão e ciclos que dependem dos dados) de virar hardware?

**O que foi feito.**
- **Divisão e resto:** circuito de divisão com restauro sobre os valores absolutos (W andares de subtração e multiplexador). O sinal é corrigido no fim, truncado como no C.
- **Ciclos com voltas variáveis:** são desenrolados com um predicado "vivo". Cada volta guarda o estado antes da condição e antes do corpo, e no fim mistura-o com o novo através do predicado. Assim, uma entrada que já saiu do ciclo fica congelada, mesmo que a condição tenha efeitos.
  - Nos ciclos com número fixo de voltas, o predicado é a constante 1 e os multiplexadores desaparecem na criação, por isso não custam nada.
  - Um ciclo variável precisa de `: lim >i N`.
- **Somador de prefixos** (`: rap >i 1`): Kogge-Stone feito em lugar, em log₂ W andares.
- **Verilog estrutural** (`ondac -v f`): um fio por porta útil.

**Prova** (`node --test test/circ.test.js`, 21 testes). Cada circuito é simulado em 256 vetores e comparado com a função compilada em C:
- divisão e resto com divisores positivos e negativos;
- máximo divisor comum por subtrações e Collatz, ambos com ciclos de voltas variáveis;
- a soma, a subtração e as comparações com Kogge-Stone;
- o Verilog avaliado e comparado com o AIGER.

| circuito | portas E | profundidade |
|---|---|---|
| soma de 64 bits, em cadeia | 568 | 128 |
| soma de 64 bits, Kogge-Stone | 1 327 | **15** |
| divisão de 64 bits | cerca de 55 000 | — |
| MDC por subtrações (entradas de 4 bits, até 24 voltas) | 52 727 | 3 176 |

**O que correu mal.** O primeiro MDC (entradas de 6 bits, `: lim >i 200`) deu 713 mil portas, e o teste rebentou o buffer de 1 MB do node.
- **Causa:** o predicado "vivo" nunca fica estruturalmente 0, mesmo quando todas as entradas já terminaram. Por isso o ciclo desenrola sempre até ao limite.
- **Solução para mais tarde:** provar que "vivo" é 0, por simulação exaustiva quando depende de poucas entradas, ou com um resolvedor SAT. Por agora, o limite tem de ser o número real de voltas.

## Iteração 20: a mesma função é teste clássico, circuito e programa quântico

**Pergunta.** O exemplo do Grover da iteração 1 simulava o algoritmo. Pode uma função Onda virar o próprio programa quântico?

**O que já existe.**
- Os compiladores de oráculos (o RevKit, o Qiskit com `PhaseOracle`, o Q# com `Microsoft.Quantum.Arithmetic`) partem de expressões lógicas ou de bibliotecas próprias.
- O método de Bennett (1973), calcular, copiar e descalcular, é a forma clássica de tornar reversível um cálculo irreversível.

**O que foi feito.**
- **`ondac -q f`:** o AIG da função vira um oráculo |x⟩|y⟩ → |x⟩|y ⊕ f(x)⟩ em OpenQASM 3. Cada porta E útil é um Toffoli num auxiliar, os inversores são portas X à volta, as saídas copiam-se com CNOT, e o cálculo repete-se ao contrário. O cabeçalho dá os qubits, os Toffoli e uma estimativa de portas T (7 por Toffoli).
- **`: gro >i 1`:** para um predicado, o programa é a busca de Grover completa. São 804 iterações para 20 qubits, com `y[0]` em |−⟩, difusão com `ctrl(19) @ z` e medição.
- **Reduções em árvore:** a igualdade e o "≠ 0" passaram a reduções em árvore equilibrada. A comparação de 20 bits desceu da profundidade 19 para 5, o que conta em quântico, onde a profundidade é tempo de coerência.
- **`ex/oraculo.onda`:** o mesmo `: alvo i>i x == x 777777` é o teste clássico (`onda run`, que conta 1 solução), o circuito (19 portas E) e o programa quântico.

**Prova** (`node --test test/circ.test.js`, 23 testes):
- **Simulação clássica exata:** um circuito só com X, CNOT e Toffoli é uma permutação dos estados de base, por isso simula-se classicamente sem erro.
- **Oráculos da maioria, da soma, da diferença absoluta e da divisão:** y = y₀ ⊕ f(x) em 256 vetores, com as entradas intactas e todos os auxiliares de volta a 0.
- **Oráculo de Grover:** foi simulado nas 2²⁰ entradas de uma vez, com cada qubit a ser um número de 2²⁰ bits. Marca exatamente x = 777 777, e os 19 auxiliares ficam limpos. É uma prova exaustiva, não uma amostra.

| oráculo | qubits (entrada + auxiliares + saída) | Toffoli |
|---|---|---|
| Grover, `x == 777777` em 20 bits | 20 + 19 + 20 | 38 por iteração |
| maioria de 64 bits | 192 + 320 + 64 | 640 |

**Limite honesto:** o programa quântico só ganha velocidade em hardware quântico. Aqui a correção é provada classicamente, e o ganho do Grover (√N consultas em vez de N) é o da teoria e o do simulador da iteração 1.

## Iteração 21: provar que um ciclo acabou

**Pergunta.** Na iteração 19, um ciclo de voltas variáveis desenrolava sempre até `: lim`, porque o predicado "vivo" nunca fica estruturalmente 0. Como saber que todas as entradas já saíram?

**O que já existe.** A verificação formal usa SAT ou BDD para provar que um sinal é constante, e o "SAT sweeping" do ABC junta nós equivalentes. São ferramentas grandes.

**O que foi feito.** Quando "vivo" depende de no máximo 16 bits de entrada, o compilador simula o seu cone em todas as 2ⁿ combinações. Usa 64 combinações por palavra, com os padrões 0x5555…, 0x3333… para as seis primeiras variáveis e palavras inteiras para as outras.
- Se dá 0 em todas, isso é uma prova: o ciclo acabou e o desenrolamento para ali.
- O cone é recolhido por uma busca em pós-ordem, que é uma ordem topológica.

**O que correu mal.** A primeira versão marcava cada nó ao empilhá-lo, e não ao expandi-lo. Um nó marcado mas ainda por calcular podia ficar depois de quem o usava, e a simulação lia o valor da palavra anterior.
- Com uma palavra o erro quase não se via: a prova saía uma volta tarde.
- Com quatro palavras, a prova nunca saía.
- Encontrei-o com uma cópia do compilador que escrevia cada tentativa de prova: suporte, cone e resultado. Com suporte 7, a prova saía na 12.ª tentativa em vez da 8.ª.

**Prova.**
- Com `: lim >i 1000`, o circuito é byte a byte igual ao de `: lim >i 24`, sem aviso de truncagem (`test/circ.test.js`, 24 testes).
- Os 30 testes passam.

| ciclo | antes (truncado no limite) | agora (fim provado) |
|---|---|---|
| MDC, entradas de 4 bits | 52 673 portas (lim 24), 137 777 (lim 60) | **31 589** com qualquer limite |
| MDC, entradas de 6 bits (lim 200) | 713 031 criadas | **145 178** portas (156 ms) |
| Collatz, x ≤ 32 (lim 200) | 548 407 portas, truncado | **281 350** portas, 111 voltas provadas |

## Iteração 22: o custo quântico certo (grafos E–ou-exclusivo)

**Pergunta.** Porque é que o oráculo de uma simples soma de 64 bits custava 1 136 Toffoli?

**Diagnóstico.** No AIG, cada ou-exclusivo custa 3 portas E, e no método de Bennett cada porta E vale 2 Toffoli (calcular e descalcular). Os Toffoli são o recurso caro: cerca de 7 portas T cada, e são as portas T que dominam o custo de um computador quântico com correção de erros. Já um ou-exclusivo é quase grátis: dois CNOT.

**O que já existe.** A compilação quântica baseada em XAG (Meuli, Soeken e De Micheli, 2019–2022) otimiza exatamente o número de portas E, a chamada multiplicative complexity.

**O que foi feito.**
- **Nós ou-exclusivo nativos:** com dispersão estrutural e forma normal. Os complementos saem das entradas e acumulam-se na saída, e `a ⊕ a`, `a ⊕ 0` e `a ⊕ 1` dobram na criação.
- **Fórmulas que poupam portas E:**
  - o multiplexador é `b ⊕ (s ∧ (a ⊕ b))`, com 1 porta E em vez de 3;
  - o transporte do somador é a maioria `((a⊕c) ∧ (b⊕c)) ⊕ c`, com 1 porta E em vez de 3.
- **Onde se aplicam:** as escolhas valem em `-v` (Verilog, que tem `^`) e em `-q` (onde cada ou-exclusivo são dois CNOT). O AIGER continua a ser um AIG puro.
- **A prova, o Verilog e o oráculo** passaram a conhecer o ou-exclusivo.

**Prova** (`node --test test/circ.test.js`, 24 testes). Os oráculos com os novos CNOT continuam a dar y = y₀ ⊕ f(x) com os auxiliares limpos, o Verilog com `^` é igual ao AIGER, e o Grover exaustivo passa.

| oráculo (64 bits) | Toffoli antes | Toffoli agora | portas T agora |
|---|---|---|---|
| soma | 1 136 | **126** | 882 |
| diferença absoluta | 2 296 | **380** | 2 660 |
| multiplicação | 39 444 | **8 066** | 56 462 |
| divisão | 48 578 | **10 780** | 75 460 |

A soma fica com 2 × 63 Toffoli, o mínimo para um somador em cadeia de 64 bits: uma porta E por transporte, sem o último.

## Iteração 23: correr o programa quântico dentro da própria Onda

**Pergunta.** O programa de Grover que a Onda gera está mesmo certo? Até aqui só o oráculo era verificado, e classicamente (como permutação). A parte quântica (Hadamard, interferência, difusão) nunca tinha corrido.

**O que já existe.** Simuladores de vetor de estado como o Qiskit Aer ou o qsim, em C++ e Python, fora da linguagem que gera o circuito.

**O que foi feito.**
- **`ex/qasm.onda`:** um simulador de vetor de estado escrito em Onda (cerca de 150 linhas). Lê o OpenQASM 3 que a Onda gera, e cada porta é um campo `E` sobre as 2ⁿ amplitudes, em paralelo no C com OpenMP.
- **Amplitudes reais:** h, x, cx, ccx e ctrl@z nunca criam fase complexa, por isso cada amplitude é um só real (metade da memória).
- **As portas x não custam passagens:** ficam num quadro de Pauli (uma máscara) que as portas seguintes leem ao indexar. Um H sobre um qubit com um x pendente faz H·X = Z·H na mesma passagem.
- **No fim, mede:** a distribuição do registo medido e P(registo ≠ 0) de cada registo. Auxiliares limpos dão 0 exato.
- **Grover só com `y[0]`:** a saída de um predicado tem 1 bit, mas o programa reservava W qubits de saída. No exemplo de 10 bits passa de 29 para 20 qubits, o que o torna simulável.

**Prova.**
- **10 bits** (20 qubits, 1 048 576 amplitudes, 1 011 passagens): p(777) = 0,999461244744476. A teoria, sin²(51·asin(1/32)), dá 0,9994612447444079: diferença de 7·10⁻¹⁴. Os auxiliares `t` dão 0 exato e `y` dá 0,5 (o estado |−⟩ do retrocesso de fase).
- **Mutação:** com um ccx do descálculo apagado, a busca cai para a distribuição uniforme (p = 1/256) e P(t ≠ 0) deixa de ser 0.
- **Teste novo** (8 bits, simulador compilado para x86-64 nativo): p(177) igual a sin²(25·asin(1/16)) a menos de 10⁻¹². São 32 testes, todos a passar.

| 10 bits, 20 qubits | tempo |
|---|---|
| C com OpenMP (4 núcleos) | 369 ms |
| C `gcc -O2`, 1 núcleo | 1,1 s |
| x86-64 da Onda, 1 núcleo | 1,8 s |

**Próxima.** O x86 da Onda fica 1,6× atrás do C neste laço: um campo `E` com uma função de 7 parâmetros e escolhas por elemento. Ver porquê.

## Iteração 24: porque é que o x86 da Onda perdia 1,6× num campo `E`

**Pergunta.** No simulador da iteração 23, o x86-64 da Onda gastava 1,6× o tempo do `gcc -O2`. Porquê, se o laço é o mesmo?

**Diagnóstico.** Comparei o código máquina dos dois laços e contei instruções executadas com o cachegrind, porque o tempo nesta máquina varia ±15%. Por elemento, a Onda executava cerca de 25 instruções e o C 13,5. Havia três causas:
- **Cada acesso `@f + s i` custava 3 instruções:** ler `s` da pilha, somar `i` e só depois ler `[r15 + t*8]`.
- **Cada `? & a b` custava 4 instruções:** copiar, fazer o `and`, testar e saltar.
- **Saltos para saltos:** o fim de um `?` dentro de outro saltava para um `jmp` que saltava outra vez.

**O que já existe.** São otimizações clássicas: modos de endereçamento com deslocamento, ponteiros-base içados para fora dos ciclos (redução de força), `test` em vez de `and` e encadeamento de saltos (jump threading).

**O que foi feito** (tudo no x86, antes da atribuição de registos).
- **Deslocamentos dobrados:** `@ + p 3` passa a ser `[r15 + p*8 + 24]` e a soma desaparece. É o acesso mais comum do próprio compilador.
- **Ponteiros-base:** num ciclo, `@ + a i` com `a` invariante passa a `lea t, [r15 + a*8]`. Uma segunda passagem de invariantes iça o `lea` para fora do ciclo, e cada acesso fica `[t + i*8]`, uma só instrução. As bases que leem a mesma variável, ou que são o mesmo temporário, no mesmo ciclo partilham um só `lea`: sem isto, o simulador gastava 5 registos com o mesmo ponteiro.
- **`test` fundido:** um `&` cujo único uso é o salto seguinte passa a ser `test a, b` e não ocupa registo.
- **Saltos para saltos:** no fim de cada função, cada salto que cai num `jmp` passa a ir direto ao destino final.

**Prova.** Os 3 pontos fixos continuam bit a bit, os 32 testes passam e a Onda Viva também. As saídas de π, fib, julia, ondas e Grover são iguais às de antes.

| instruções executadas | antes | agora | gcc -O2 |
|---|---|---|---|
| simulador quântico (Grover de 8 bits) | 666,4 M | **474,7 M** (−29%) | 408,4 M |
| laço de campo `E` (micro-teste) | 760,2 M | **571,5 M** (−25%) | 406,6 M |
| compilador a compilar-se para C | 142,0 M | 139,8 M (−1,6%) | |
| compilador a compilar-se para x86 | 196,7 M | 191,8 M (−2,5%) | |

O tempo do simulador de 10 bits desceu de 1 624 para cerca de 1 500 ms, contra 1 030–1 080 ms do C. A distância em instruções é 1,16×, mas no tempo ainda é 1,4×. O que falta são saltos tomados: cada caso do `?` acaba num `jmp` para o bloco comum, e o ciclo ainda salta para o teste no topo.

**Próxima.** Menos saltos tomados por volta: rodar os ciclos (teste no fim) e duplicar caudas curtas nos ramos.

## Iteração 25: a memória é o armazenamento

**Pergunta.** No início pediste um armazenamento novo, "um pouco de todos, o melhor de todos, muito rápido", sem precisares de saber como fica organizado. Até aqui a Onda não tinha nenhum: a memória morria com o programa. Porque é que guardar dados tem de ser diferente de os ter em memória?

**O que já existe.**
- **Bases de dados (SQLite, Postgres):** copiam cada valor entre a memória e um formato em disco, e pagam por isso em cada leitura e escrita.
- **O LMDB:** mostrou que um ficheiro mapeado em memória dá leituras à velocidade da RAM, sem cópias.
- **As imagens do Smalltalk e o armazenamento de nível único do IBM System/38:** fazem da memória o próprio armazenamento.

**O que foi feito.**
- **Operador `K n`:** devolve o endereço-base de n palavras que sobrevivem entre execuções. O programa usa-as com `@` e `!`, como qualquer memória. Não há formato, serialização nem carregamento ao arrancar.
- **A persistência é uma decisão de instalação, não de código:** com `ONDA_ARM=ficheiro`, o armazém é esse ficheiro. Sem ele, é memória volátil, e o programa é o mesmo.
- **C:** `mmap` partilhado do ficheiro e `msync` à saída. Fora do POSIX, usa leitura e escrita do ficheiro inteiro.
- **x86-64:** as mesmas chamadas ao sistema escritas byte a byte (`open`, `lseek`, `ftruncate`, `mmap` fixo em 0x100000000, `close` e `msync` na saída). Procura `ONDA_ARM` no ambiente do processo, sem biblioteca.
- **WebAssembly:** o anfitrião reserva o armazém no monte, carrega o ficheiro e grava-o à saída de forma atómica (`.tmp` e `rename`). No browser fica volátil.
- **Um formato só:** palavras de 64 bits em little-endian. O ficheiro escrito por uma forma é lido pelas outras.
- **`ex/arm.onda`:** uma tabela de dispersão chave → valor (dispersão de Fibonacci e sondagem linear) que vive no armazém.

**Prova** (`test/arm.test.js`, 3 testes novos; 35 no total, todos a passar).
- Sem `ONDA_ARM`, cada execução começa vazia.
- O x86 escreve 5 000 chaves, o C lê-as, o WebAssembly junta mais, e o x86 e o C voltam a ler. Tudo certo.
- As três formas, com as mesmas operações, escrevem ficheiros **iguais bit a bit**.
- O `strace` do x86 mostra a sequência esperada: `open`, `lseek`, `mmap(0x100000000, …, MAP_SHARED|MAP_FIXED)`, `close` e `msync(…, MS_SYNC)` antes do `exit_group`.

| 1 milhão de chaves (melhor de 5) | escrever | ler todas |
|---|---|---|
| Onda em C | **41 ms** | **20 ms** |
| Onda em x86-64 | 66 ms | 23 ms |
| Onda em WebAssembly (Node) | 92 ms | 53 ms |
| SQLite 3.45 (WAL, tudo dentro do SQL) | 480 ms | 200 ms |

A comparação não é justa para o SQLite, e é preciso dizê-lo: ele tem transações e sobrevive a uma queda a meio, e o armazém da Onda ainda não. É isso que a próxima iteração resolve.

**Próxima.** Escritas atómicas: um programa que cai a meio de uma atualização tem de encontrar o armazém como estava antes ou como ficou depois, nunca a meio.

## Iteração 26: um armazém que sobrevive a uma queda

**Pergunta.** Na iteração 25, um `kill -9` a meio de uma atualização podia deixar o ficheiro com metade das escritas. O SQLite não deixa. Dá para ter essa garantia sem pedir ao programa transações, registos ou um formato?

**O que já existe.**
- **O diário de reversão do SQLite e o WAL do Postgres:** escrevem primeiro um registo e só depois os dados.
- **O LMDB:** consegue o mesmo com páginas copiadas e duas raízes, mas obriga as estruturas de dados a nunca escrever por cima.
- **A persistência ortogonal (PJama, Grasshopper):** queria isto de forma transparente, e ficou na investigação.

**O que foi feito.**
- **Mapeamento privado:** o armazém passa a ser mapeado em privado (copy-on-write). O que o programa escreve fica só na memória e nunca chega sozinho ao ficheiro.
- **`Kc`, ou a saída, confirma:**
  - compara cada página de 4096 bytes com uma segunda vista do ficheiro, só de leitura;
  - escreve as páginas que mudaram em `ficheiro.j` (índice e página);
  - fecha o diário com um rodapé (número de páginas, soma FNV-1a e a marca `ONDAJRN1`) e faz `fsync`;
  - só então escreve as páginas no ficheiro, faz outro `fsync` e apaga o diário.
- **Ao abrir:** um diário completo é reaplicado (refazer é idempotente) e um incompleto é deitado fora.
- **O programa não muda:** usa `@` e `!` como sempre. `Kc` é opcional, para confirmar a meio de um programa longo.
- **Três implementações do mesmo protocolo:**
  - **C:** `mmap`, `pwrite` e `fsync`.
  - **x86-64:** escrita em Onda (cerca de 60 linhas) sobre uma porta nova de chamadas ao sistema cruas, `Y 10`. Por exemplo, procura `ONDA_ARM` lendo o ambiente a partir do `rsp` inicial, byte a byte.
  - **WebAssembly:** feita pelo anfitrião em JavaScript.
- **Um diário escrito por uma forma é recuperado por qualquer outra.**

**Prova** (3 testes novos; 38 no total, todos a passar).
- **Queda logo depois do diário** (injetada no C): o ficheiro ainda tem o estado antigo. O x86 abre, reaplica o diário e vê as 3 000 chaves.
- **Queda a meio do diário:** o WebAssembly deita-o fora e fica o estado anterior, com 1 000 chaves.
- **`kill -9` a sério, aos 250 ms, três vezes, em x86 e em C:** um programa incrementa dois contadores em páginas diferentes e confirma a cada milhão. Depois de cada morte, os dois são iguais e múltiplos de um milhão, e vão crescendo (67, 142 e 212 milhões numa corrida à mão). O `strace` do x86 mostra o diário escrito e sincronizado antes de qualquer `pwrite64` no ficheiro.

| 1 milhão de chaves, processo inteiro (melhor de 5) | escrever (com diário e `fsync`) | ler todas |
|---|---|---|
| Onda em C | **213 ms** | **30 ms** |
| Onda em x86-64 | 272 ms | 43 ms |
| Onda em WebAssembly (Node) | 473 ms | 137 ms |
| SQLite 3.45 (WAL, tudo dentro do SQL) | 406 ms | 228 ms |

Agora a comparação já é justa na garantia principal, a atomicidade face a quedas. Escrever ficou cerca de 5 vezes mais caro do que sem diário, porque cada página vai duas vezes ao disco. Mesmo assim fica no dobro da velocidade do SQLite a escrever e a 7 vezes a ler.

**Próxima.** O diário como registo contínuo (WAL): as páginas ficam só no diário e passam ao ficheiro de vez em quando. Cada página escrita uma só vez.

## Iteração 27: porque é que a recursão é 4× mais lenta (e porque a correção fácil não chega)

**Pergunta.** O `README` diz que o `fib` nativo é 4× mais lento que o `gcc`. Porquê, e qual é o remédio?

**Medição.** Na mesma máquina, `fib(35)`: o x86 da Onda faz 57 ms, o `gcc -O2` faz 14 ms. Mas em instruções executadas (cachegrind) a diferença é só 1,5× (463 M contra 302 M). O tempo é 4× porque cada instrução custa mais: o argumento `n` faz uma ida e volta à pilha a cada chamada.

**Diagnóstico.** O código gerado para o `fib` lê `n` de `[rbp+16]` três vezes e, como `n` vive através das duas chamadas recursivas, o alocador é obrigado a mantê-lo na memória. A regra, escrita no próprio alocador, é: *só vai para registo o que não atravessa chamadas.* Não há registos reservados que uma chamada preserve, por isso tudo o que sobrevive a uma chamada cai na pilha. O `gcc` guarda `n` num registo salvo (`rbx`) e não lhe toca mais.

**O que já existe.** A convenção System V reserva `rbx`, `r12`–`r15` como *callee-saved*: a função que os usa guarda-os à entrada e repõe-nos à saída. É o que falta à Onda.

**O que foi tentado.** Dar aos valores que atravessam chamadas um registo salvo (`rbx`, `r12`–`r14`, porque o `r15` é a base da memória), empilhado no prólogo e reposto no único `ret` de cada função.
- **Resultado parcial:** o `fib` isolado passou a manter `n` em `rbx` e deu o resultado certo. Mas o compilador a compilar-se a si próprio em x86 entrou em ciclo.
- **Primeira correção:** restringir a otimização a funções sem ciclos (a recursão não tem ciclos; é nos ciclos que a promoção disputa os mesmos registos). O ciclo desapareceu, mas o ponto fixo x86 continuou a falhar: o `x1` deixou de conseguir ler a própria fonte (*"fora de definição, token 0"*). Uma função de parsing, sem ciclos mas com um valor que atravessa chamadas, ainda é gerada de forma errada.

**Decisão.** Não entregar um compilador que não se compila. O código foi revertido: os três pontos fixos voltam a fechar e os 38 testes passam. A convenção de registos é o remédio certo e fica identificada, mas precisa de resolver a interação exata entre o save/restore e o resto do gerador — trabalho para a próxima iteração, feito a comparar byte a byte o que as duas formas geram para a função que quebra, e não às cegas.

**Lição.** O auto-alojamento é a rede de segurança: uma otimização que parecia correta num exemplo (`fib`) foi apanhada de imediato pela exigência de a Onda se compilar a si própria, bit a bit. É mais exigente do que qualquer teste de unidade.

**Próxima.** A convenção de registos com cuidado: isolar a função de parsing que o save/restore gera mal, perceber que invariante do alocador é quebrada, e só então reativar a otimização.

## Iteração 28: a convenção de registos salvos — feita, medida, e revertida

**Pergunta.** A iteração 27 deixou a convenção *callee-saved* a meio: o `fib` isolado funcionava, mas o compilador a compilar-se em x86 gerava mal uma função. Qual era o erro, e vale a pena acabar?

**O erro.** Isolei-o reduzindo o caso que quebrava até ao mínimo:
```
: g i>i n + n 1
: main >i { N + g 5 g 6 0 }   # esperado 13; dava 14
```
O `main` guarda o resultado de `g 5` num registo salvo (`rbx`) enquanto chama `g 6`. Mas o `g`, que não atravessa chamada nenhuma, usava o `rbx` como temporário (é o primeiro registo do banco) **sem o guardar**. A regra certa é a da System V: *qualquer* função que escreva num registo salvo tem de o repor, não só as que têm valores a atravessar chamadas.

**A correção.** A máscara dos registos salvos a guardar deixou de ser por-valor e passou a ser varrida do mapa de ocupação depois da promoção (que também usa registos): a união de todos os bits usados, limitada a `rbx`, `r12`, `r13`, `r14`. Com isto, os três pontos fixos voltaram a fechar (o x86 até encolheu de 175 736 para 159 352 bytes) e os 38 testes passaram. A convenção estava **correta**.

**A medição — e a surpresa.** O `fib(35)` ficou **mais lento**, não mais rápido:

| `fib(35)` | tempo | instruções executadas |
|---|---|---|
| iteração 26 (sem a convenção) | ~57 ms | 463 M |
| iteração 28 (com a convenção) | ~78 ms | 582 M |

Porquê? O `fib` mantém dois valores através das chamadas (o `n` e o resultado da primeira chamada recursiva). A convenção põe ambos em registos salvos, por isso cada chamada empilha e desempilha dois registos: quatro acessos à pilha a substituir as três leituras de antes. A ida e volta à pilha custa tanto como os acessos à memória que elimina. E como o `rbx` é o primeiro registo do banco, quase todas as funções passaram a pagar o guardar/repor.

**A lição, e a decisão.** A diferença real para o `gcc` no `fib` (14 ms) não está em manter valores em registos — o `gcc` também empilha o `rbx`. Está numa transformação de nível mais alto (desdobrar a recursão), que é outra discussão. A convenção *callee-saved*, sozinha, não rende aqui: troca três leituras por quatro escritas. **Revertida.** Fica a prova de que o caminho óbvio não era o certo, que é uma resposta tão útil como uma otimização — e o compilador continua verde.

**Próxima.** Voltar ao que rende: o `fib` só perde 1,5× em instruções mas 4× em tempo. O gasto está no protocolo de chamada (a pilha), não na conta. Medir onde o x86 gasta a mais fora da recursão, onde não há o custo irredutível de guardar o estado vivo.

## Iteração 29: o erro diz em que linha

**Pergunta.** Até agora um erro do compilador dizia só `(token 14)`. Para quem escreve Onda (uma IA, ou eu a pedir uma linha), que token é o 14? Dá para dizer a linha?

**O que já existe.** Qualquer compilador sério aponta a linha e a coluna. A Onda não o fazia porque nasceu a pensar só no caminho feliz.

**O que foi feito.** Cada token já guarda o seu sítio na fonte (o compilador tem de o saber para ler o texto). O relato de erro passa a contar as mudanças de linha do início da fonte até ao token que falhou:
```
#error onda: nome desconhecido (linha 4, token 14)
```
São duas linhas de Onda novas (`eline`), só no caminho de erro: não tocam no código gerado.

**Um erro apanhado pela própria mudança.** A primeira versão dava sempre o dobro da linha. A causa: o campo de posição de cada token não é um deslocamento, é já um apontador absoluto para dentro da fonte (`@1 + deslocamento`). Eu estava a somar `@1` outra vez, e a contagem percorria o dobro do intervalo. Visto isso, a correção foi trivial: usar o apontador tal como está.

**Prova.** Os três pontos fixos continuam a fechar e os 38 testes passam (o caminho normal não mudou). Erros de exemplo apontam a linha certa: um nome desconhecido na linha 1 dá `linha 1`, na linha 4 dá `linha 4`.

**Próxima.** Ir mais longe: a coluna dentro da linha, e imprimir a própria linha da fonte com um sinal por baixo do token, como fazem os compiladores modernos.

## Iteração 30: o erro mostra a linha e aponta o sítio

**Pergunta.** A iteração 29 deu o número da linha. Os compiladores modernos vão mais longe: mostram a própria linha e põem um sinal debaixo do sítio exato. Porque não a Onda?

**O que foi feito.** O relato de erro passou a dar a coluna, a imprimir a linha da fonte e a pôr um `^` sob o token que falhou:
```
#error onda: nome desconhecido (linha 4, coluna 3)
  zzz x
  ^
```
A indentação do sinal copia os espaços e tabulações da linha, por isso alinha mesmo quando o código usa tabulações. Continua tudo no caminho de erro, sem tocar no código gerado.

**Prova.** Os três pontos fixos fecham e os 38 testes passam. Um nome desconhecido no meio de uma linha com tabulação dá a coluna certa e o `^` debaixo do nome.

**Próxima.** Voltar ao desempenho, agora com uma carga a sério de memória: medir o x86 num programa que percorre e escreve muito (o simulador, ou uma travessia de estruturas), onde os ponteiros-base içados da iteração 24 deviam render mais do que num laço aritmético.

## Iteração 31: onde a distância para o gcc desaparece (e porquê)

**Pergunta.** As iterações 27 e 28 mostraram o `fib` 4× mais lento que o gcc mas só 1,5× em instruções. Essa distância aparece em todo o código, ou só na recursão? Valia a pena micro-otimizar os ciclos?

**A medição.** Um programa limitado pela memória: construir uma lista ligada de 200 000 nós e percorrê-la 2 000 vezes (400 milhões de saltos de apontador), a somar um campo de cada nó.

| travessia de 400 M de nós | tempo | instruções executadas |
|---|---|---|
| x86 da Onda | ~1 486 ms | 2,80 G |
| C (`gcc -O2`) | ~1 481 ms | 2,00 G |

**A surpresa.** O x86 executa **1,4× as instruções** do gcc, mas o **tempo é igual**. Porquê? A travessia é limitada pela latência da memória: cada `@ c` é uma leitura que depende da anterior (percorrer a lista é uma cadeia de leituras que não se podem adiantar). Enquanto o processador espera pela memória, tem ranhuras de execução livres, e as instruções a mais da Onda cabem lá dentro, sem custar tempo. São de borla.

**A conclusão que muda o rumo.** A distância de instruções para o gcc só se paga em tempo quando o código é limitado pelo cálculo, não pela memória. A maior parte do trabalho a sério — árvores, grafos, tabelas de dispersão, o armazém da Onda — é limitado pela memória, e aí o x86 da Onda já iguala o gcc no tempo. Micro-otimizar estes ciclos seria esforço perdido: o relógio não mexia. O `README` foi corrigido para dizer isto com números.

**Onde fica mesmo a distância.** Só no código limitado pelo cálculo com muitas chamadas, como o `fib`. E aí, as iterações 27–28 provaram que a causa não é a conta nem manter valores em registos (o gcc também empilha), mas o protocolo de chamada: cada argumento vai à pilha e é relido. É aí que a próxima iteração ataca, com a mudança mínima.

**Próxima.** Passar o primeiro argumento de cada chamada num registo, em vez de na pilha. É o que o `fib` precisa (um só argumento), muito mais pequeno do que a convenção inteira que a iteração 28 reverteu, e o ponto fixo bit a bit continua a ser a rede de segurança.

## Iteração 32: o armazém torna a recursão lenta irrelevante

**Pergunta.** As iterações 27–31 mostraram que o `fib` ingénuo é 4× mais lento que o gcc, e que a convenção de registos não compensa. Em vez de ganhar a conta, dá para não a fazer duas vezes? É aqui que o armazém da iteração 25 se encontra com o problema do desempenho.

**O que já existe.** A memoização é antiga. O que não é comum é a tabela de memoização ser *persistente de graça*: fica no armazém e sobrevive entre execuções, sem serialização nem base de dados.

**O que foi feito.** `ex/memo.onda`: o `fib` ingénuo, mas cada resultado é guardado em `K` (o armazém). A segunda vez que se pede o mesmo `fib`, lê-se; e com `ONDA_ARM=ficheiro`, essa tabela sobrevive ao fim do programa. O `fib(92)` calculado uma vez em C fica no ficheiro, e a seguir o x86 e o WebAssembly leem-no do mesmo ficheiro, sem recalcular.

**Um erro apanhado pelos diagnósticos da iteração 29–30.** A primeira versão usava `= N 93`, e o compilador respondeu logo `= precisa de nome (linha 16, coluna 5)`: `N` é o operador de imprimir, não pode ser nome. A seguir, um `@ -16` para um global deu segmentation fault em C (fora dos limites da memória): os globais do programa vivem abaixo de 64, por isso a base do armazém passou a ficar em `M[8]`. Os diagnósticos novos pouparam tempo real.

**Prova** (`test/memo.test.js`, 3 testes; 41 no total, todos a passar).
- Volátil (sem `ONDA_ARM`), o `fib` dá os valores certos (conferidos: `fib(90) = 2880067194370816120`).
- Com o ficheiro: o C calcula até 92, e o x86 e o WebAssembly leem `fib(90)` do mesmo ficheiro sem o reescrever.
- O armazém guarda cada `fib` intermédio, não só o pedido: `fib(50) = 12586269025` está lá gravado.

**A lição.** O `fib` do `gcc` em 14 ms não interessa quando a resposta já está no armazém. A Onda não precisa de ganhar todas as corridas de cálculo se o seu modelo — a memória é o armazenamento — deixa guardar o trabalho feito, de uma forma que o SQLite faria com uma tabela e dez vezes o tempo.

**Próxima.** Um só ficheiro de armazém partilhado por vários processos ao mesmo tempo. Hoje o armazém é de um processo de cada vez; falta um trinco para dois escritores não se corromperem.

## Iteração 33: o erro diz "quis dizer...?"

**Pergunta.** A Onda é escrita por IAs. Um nome mal escrito (`som` em vez de `soma`, `fibo` em vez de `fib`) dava só "nome desconhecido". Dá para sugerir o que se queria, como fazem o `gcc` e o `rustc`?

**O que foi feito.** O erro de nome desconhecido passa a comparar o nome que falhou com todos os nomes de funções definidas, por distância de edição (Levenshtein, escrita em Onda), e sugere o mais próximo quando está perto:
```
#error onda: nome desconhecido, quis dizer soma? (linha 2, coluna 15)
```
O limiar é apertado (distância ≤ 1 para nomes curtos, ≤ 2 para os longos), por isso um nome sem parecença — `xyzzy` — não gera sugestão nenhuma, em vez de apontar para algo errado. Continua tudo no caminho de erro: o código gerado não muda.

**Prova.** Os três pontos fixos fecham e os 41 testes passam. `som` sugere `soma`, `fibo` sugere `fib`, `xyzzy` não sugere nada.

**Próxima.** Vários processos a partilhar o mesmo armazém. Não basta um trinco: hoje cada processo mapeia o ficheiro em privado, por isso não vê as escritas dos outros. É preciso reler sob o trinco antes de confirmar — uma transação, não só exclusão mútua. É essa a próxima.

## Iteração 34: a forma gráfica entra na rede de testes

**Pergunta.** O utilizador pediu, desde o início, que a computação fosse também gráfica. A Onda gera GLSL (`ondac -g px`) e isso estava verificado — mas só por uma ferramenta à parte, à mão. Porque não no `node --test`, com tudo o resto?

**O que foi feito.** `test/gpu.test.js`: gera o shader GLSL de `ex/julia.onda`, renderiza-o em WebGL2 dentro do Chromium (SwiftShader, por software, sem placa gráfica) e compara píxel a píxel com a imagem da forma CPU (`D`). O limiar não é inventado no teste: lê-se do próprio exemplo (`: tol >i 8`, `: aceita >i 95`), a tolerância que a Onda declara para as formas de 32 bits. Se não houver browser na máquina, o teste salta em vez de falhar.

**Prova.** 100% dos píxeis dentro de ±8/255 (erro médio 0,01/255). São 42 testes, todos a passar. A mesma função de Julia, escrita uma vez, dá a mesma imagem na CPU (float64) e na GPU (float32), e isso é agora reconferido a cada corrida da suite.

**Um erro apanhado — outra vez — pelos diagnósticos.** Ao preparar a versão CPU na resolução do teste, gerei `px 2` onde devia ser `px 2.0` (o `2.0` do JavaScript virou `"2"`). O compilador apontou logo: `argumento com tipo errado (linha 21, coluna 26)`, com o sinal debaixo do `2`. As iterações 29–30 e 33 continuam a pagar-se.

**Próxima.** Vários processos a partilhar o mesmo armazém. Como a iteração 33 notou, não basta um trinco: é preciso reler o ficheiro sob o trinco antes de confirmar, porque o mapa privado de cada processo não vê as escritas dos outros. Uma transação.

## Iteração 35: dois processos no mesmo armazém sem se apagarem

**Pergunta.** As iterações 33 e 34 deixaram a dívida: o armazém era de um processo de cada vez. Dois escritores no mesmo ficheiro apagavam-se, porque cada um mapeia o ficheiro em privado e, ao confirmar, reescrevia tudo. Como partilhar sem corromper, e sem obrigar o programa a pensar em concorrência?

**A observação que resolve.** Já havia a peça certa: o `Kc` só escreve as páginas que mudaram. Faltava medir a mudança contra a base certa. Antes comparava com uma vista partilhada do ficheiro (que podia já ter as escritas de outros, e dependia de semântica de cópia-em-escrita não garantida). Agora compara com um **instantâneo privado do ficheiro tirado à abertura** (`KB`): a diferença são exatamente as páginas que *este* processo mudou.

**O que foi feito** (na forma C, a de referência).
- À abertura, guarda-se um instantâneo `KB` do conteúdo do ficheiro.
- O `Kc` segura um trinco exclusivo (`flock`), escreve pelo diário só as páginas onde o mapa difere de `KB`, e no fim atualiza `KB`.
- Resultado: dois processos que escrevem em páginas diferentes **ambos sobrevivem**; na mesma página, ganha o último a confirmar. O programa não muda — continua a usar `@` e `!`.
- O formato do ficheiro não muda, por isso o x86 e o WebAssembly continuam a ler o que o C escreve.

**Prova** (`test/conc.test.js`; 43 testes no total, todos a passar). Oito processos em paralelo, cada um a escrever 200 vezes (com `Kc`) o seu próprio slot em páginas diferentes do mesmo ficheiro. No fim, os oito valores estão lá, todos certos. Sem o trinco e o instantâneo, sete dos oito desapareceriam.

**O que fica por fazer.** O x86 e o WebAssembly ainda confirmam como um só processo. O passo seguinte é levar-lhes o mesmo trinco e a confirmação por páginas — no x86, pela porta de chamadas ao sistema crua (`flock` é a chamada 73).

**Próxima.** O mesmo trinco e instantâneo no x86 nativo, escritos em Onda sobre o `Y 10`.

## Iteração 36: a linguagem corre programas não triviais, igual em todas as formas

**Pergunta.** A Onda compila-se a si própria, mas isso é um programa muito especial. Ela corre programas quaisquer, não triviais, e dá o mesmo resultado nas três formas que gera?

**O que foi feito.** `ex/bf.onda`: um interpretador de Brainfuck escrito em Onda. O Brainfuck é minúsculo (oito comandos) mas Turing-completo, por isso é a prova clássica de que uma linguagem corre tudo. O interpretador lê o programa do stdin, pré-calcula os pares de parênteses `[ ]`, e executa com um apontador sobre 30 000 células.

**Prova** (`test/bf.test.js`; 45 testes no total, todos a passar).
- O "Hello World!" clássico do Brainfuck dá exatamente `Hello World!\n` nas três formas: C, x86-64 nativo e WebAssembly.
- Um laço de multiplicação (6×7) dá o byte 42 nas três formas.

A mesma lógica, com laços, memória e aritmética de bytes, compilada para C (via gcc), para código máquina x86 escrito pela Onda, e para WebAssembly, dá o mesmo byte a byte. Não é só o compilador que se reproduz igual entre formas: qualquer programa o faz.

**Próxima.** Subir a parada: um programa Onda maior e mais sério (por exemplo um interpretador que se corra a si mesmo, ou um pequeno motor de expressões), ou fechar a dívida do armazém no x86 (o trinco e a confirmação por páginas da iteração 35, pela porta de chamadas ao sistema crua).

## Iteração 37: álgebra linear pelo paradigma de campo

**Pergunta.** O paradigma da Onda — campo + colapso — foi feito para o paralelismo. Fora dos fractais e do Grover, aguenta matemática a sério, como a multiplicação de matrizes, e paraleliza mesmo?

**O que foi feito.** `ex/matmul.onda`: C = A·B pelo campo. Uma só linha de cálculo — `E c (n*n) mm a b n` — diz "cada elemento de C ao mesmo tempo", e cada elemento é um produto interno `S n dot ...`. Não há laço escrito à mão sobre a saída; o `E` é que decide como colapsar (OpenMP na CPU, ou GPU). Um `S` dentro de um `E` é exatamente a estrutura de uma redução dentro de um mapa.

**Prova** (`test/matmul.test.js`; 47 testes no total, todos a passar). O resultado completo (n=40, a matriz inteira, não só um resumo) é igual ao de um triplo laço ingénuo, e igual bit a bit entre C, x86-64 e WebAssembly.

**Medição** (512×512, 4 núcleos):

| forma | tempo |
|---|---|
| Onda, forma C (OpenMP pelo `E`) | ~151 ms |
| C à mão, OpenMP, `n` variável | ~110 ms |
| C à mão, OpenMP, `N` constante (vetoriza) | ~52 ms |
| Onda, x86 nativo (série) | ~514 ms |

O `E` deu o paralelismo de borla: a mesma função, sem uma linha sobre threads, usa os quatro núcleos. Fica a ~1,4× do C justo (com `n` variável, a comparação honesta). A outra metade da distância para o C mais rápido é a vetorização que só acontece quando o tamanho é uma constante de compilação — a Onda passa `n` como variável. O que resta (1,4×) é a sobrecarga do produto interno: a função do `S` não entra em linha no laço de redução.

**Próxima.** Pôr a função do `S` a entrar em linha no laço, para o produto interno não pagar uma chamada por iteração. Deve aproximar o matmul do C justo.

## Iteração 38: o `S` paga uma chamada por iteração (e o laço explícito não)

**Pergunta.** A iteração 37 deixou o matmul do campo a 1,4× do C justo, por causa da função do produto interno. Era mesmo a chamada? E dá para a tirar?

**O diagnóstico.** Sim. O `S n dot ...` gera, em C, exatamente `for(i...) ac += f_dot(i, ...)`: uma chamada de função por iteração, que o `gcc` não consegue meter em linha através do laço da redução. O interpretador de Brainfuck e o matmul mostram a regra geral das iterações 27–31 num caso concreto: a conta não é o problema, a chamada é.

**A tentativa de fundo.** O compilador já sabe meter funções em linha (`cinl`), e isso estava ligado só para o x86 (`isx`) e para os circuitos (`isc`). Tirei a guarda e liguei a marcação de inlining (`inlf`) para todas as formas. Os três pontos fixos fecharam e os 47 testes passaram — mas, em C, o `f_dot` continuou a ser chamado. A inserção em linha dos elementos de campo (o único sítio onde o `ccallf` entra) não dispara por aqui: é uma mudança de compilador mais funda do que tirar uma guarda, e fica para a próxima iteração, feita com cuidado. Revertido.

**A solução prática, já.** Escrever o produto interno como um laço explícito dentro do elemento do `E`, em vez de um `S`. Sem chamada por iteração:

| 512×512, 4 núcleos | tempo |
|---|---|
| `S` (produto interno por função) | ~151 ms |
| laço explícito no elemento | ~130 ms |
| C à mão, OpenMP, `n` variável | ~110 ms |

O laço explícito fica a ~1,17× do C justo — paridade, na prática. O `ex/matmul.onda` passou a usá-lo, com um comentário a explicar que o `S` seria a forma elegante mas paga a chamada até o compilador a meter em linha. Os 47 testes continuam a passar e o resultado é igual bit a bit nas três formas.

**Próxima.** A correção de fundo: fazer o `cinl` meter em linha a função de um `S`/`E`/`D` também em C e WebAssembly. Como a tentativa desta iteração mostrou, não basta tirar a guarda — é preciso perceber porque é que o `ccallf` não inlina os elementos de campo fora do x86.

## Iteração 39: a raiz do custo do `S` — e porque não é uma guarda

**Pergunta.** A iteração 38 deixou em aberto: porque é que o `cinl` não mete em linha a função de um `S`/`E`/`D` em C, mesmo tirando a guarda `isx`?

**A caça à raiz.** Forcei o `cinl` a correr sempre no `ccallf`, com o build completo — e a função `f_dot` continuou a ser chamada. Logo o `cinl` nem sequer estava a ser chamado. A razão está em `cs`, `ce` e `cd` (os operadores `S`, `E`, `D`), em `src/4main.onda`:
```
: cs >i { ... ? isx lowS n k a { ir 39 r n k a ... } }
```
O `lowS` (a baixa que mete a função em linha, via `ccallf`) só é usado **no x86**. Em C e WebAssembly, o `S` emite um nó nativo (kind 39) que o emissor transforma num laço `#pragma omp parallel for reduction` que **chama** a função de elemento a cada índice. Ou seja: o `ccallf` e o `cinl` nunca entram no caminho de C/WebAssembly. Não era uma guarda a mais; eram dois mundos.

**Porque é que são dois mundos.** O x86 nativo da Onda não tem OpenMP, por isso colapsa o campo em série e ganha o que pode metendo o elemento em linha. O C delega o paralelismo no OpenMP, e o preço é uma chamada por índice dentro do laço paralelo. Tentei a saída fácil — marcar a função de elemento `__attribute__((always_inline))` no C gerado — e o `gcc` continua a não a meter no laço paralelo (o OpenMP tira o laço para fora antes de inliná-la). Não compensa.

**A conclusão.** A correção de fundo não é no front-end nem numa guarda: é o **emissor de C** a escrever o corpo do elemento dentro do laço de redução OpenMP, com os parâmetros substituídos, em vez de o chamar. É real e localizável, mas não trivial, e não vale arriscá-la às cegas. O atalho da iteração 38 (laço explícito no elemento) já dá a velocidade do C quando é preciso. O `SPEC.md` passou a documentar este custo, para quem escreve Onda saber quando usar um `S` (clareza) e quando um laço (velocidade).

**Próxima.** O emissor de C a fundir o corpo do elemento no laço OpenMP — a correção que esta iteração localizou com precisão.

## Iteração 40: SHA-256 em Onda, bit a bit igual nas três formas

**Pergunta.** Os operadores de bits da Onda (`& | ^ << >>`) dão mesmo o mesmo resultado em C, x86 e WebAssembly, até ao último bit, num programa que vive de os torcer? A criptografia é o teste mais exigente: um bit errado e o resumo muda por completo.

**O que foi feito.** `ex/sha256.onda`: o SHA-256 completo escrito em Onda — preparação da mensagem, as 64 rondas, as funções Σ/σ/Ch/Maj com rotações, e as 64 constantes. Lê a mensagem do stdin e imprime o resumo em hexadecimal.

**Um erro que ensina a linguagem.** A primeira versão dava um resumo errado. A causa: usei `~ x` para o complemento de bits na função `Ch`. Mas em Onda o `~` é o **não lógico** (dá 0 ou 1), não o complemento de bits. O complemento de 32 bits faz-se com `^ x mascara` (XOR com todos-os-uns). Trocado isso, bateu certo à primeira. O `SPEC.md` passou a avisar.

**Prova** (`test/sha.test.js`; 49 testes no total, todos a passar). Seis vetores — vazio, "abc", 55 e 56 bytes (o limite de um bloco e o que força um segundo só para o preenchimento), 100 bytes (dois blocos) e a frase da raposa — todos conferidos contra o `crypto` do Node, e todos **iguais bit a bit** em C, x86-64 e WebAssembly.

| mensagem | SHA-256 |
|---|---|
| "" | e3b0c442…7852b855 |
| "abc" | ba7816bf…f20015ad |

É a prova mais forte até agora de que as três formas são a mesma máquina: 256 bits que, se um só operador de bits divergisse numa forma, não bateriam.

**Próxima.** Subir outra vez a parada de "programa a sério": algo com estado e entrada/saída (um verificador de ficheiros com o SHA, ou um pequeno servidor de linha de comandos), ou enfim a correção de fundo do `S` no emissor C que a iteração 39 localizou.

## Iteração 41: um stencil no paradigma de campo — o Jogo da Vida

**Pergunta.** Os campos da Onda brilham no paralelismo independente (cada píxel do fractal por si). E quando cada elemento precisa de **ler os vizinhos** — um stencil, com estado que evolui? O modelo campo+colapso aguenta um autómato celular?

**O que foi feito.** `ex/life.onda`: o Jogo da Vida de Conway. Cada geração é um `E` sobre todas as células ao mesmo tempo, e a função de elemento lê os 8 vizinhos (grelha toroidal: os bordos dão a volta). O estado evolui trocando duas grelhas a cada geração. A regra da sobreposição permite-o: o elemento só **lê** o estado atual e escreve no seguinte, nunca no que está a ler.

**Prova** (`test/life.test.js`; 51 testes no total, todos a passar). Com um planador no canto, a grelha ao fim de 0, 1, 4 e 8 gerações é exatamente igual à de uma referência em JavaScript (o planador move-se uma diagonal a cada 4 gerações, como deve). E a grelha é igual em C, x86-64 e WebAssembly a cada geração.

Ao contrário do fractal, onde cada píxel é independente, aqui cada célula depende de uma vizinhança — e o `E` continua a dar o paralelismo de borla, porque a leitura dos vizinhos não viola a regra da sobreposição.

**Próxima.** Levar o stencil à GPU (o Jogo da Vida como shader, conferido contra a CPU), ou um stencil mais pesado — um desfoque de imagem — a comparar CPU e GPU píxel a píxel.

## Iteração 42: a Onda a analisar — um avaliador de expressões

**Pergunta.** A Onda nasceu para compilar (a si própria). Fora disso, escreve-se nela um analisador a sério — com recursão e precedência — de forma natural?

**O que foi feito.** `ex/calc.onda`: um avaliador de expressões aritméticas por descida recursiva. Três funções que se chamam em cadeia — `expr` → `termo` → `fator` → (de volta a) `expr` nos parênteses — dão a precedência certa: `+ -` por baixo, `* / %` por cima, parênteses a toda a volta, e menos unário. Um cursor global percorre o texto.

**Prova** (`test/calc.test.js`; 53 testes no total, todos a passar). Dez expressões conferidas: `3+4*2 = 11` (precedência), `(3+4)*2 = 14` (parênteses), `2*(3+4*(5-1)) = 38` (recursão aninhada), `-5+3 = -2` (menos unário), `2*-3+10 = 4`, e todas iguais em C, x86-64 e WebAssembly. A divisão e o resto são inteiros, como na Onda.

A recursão mútua entre `expr`, `termo` e `fator` — o padrão clássico de um analisador — compila e corre igual nas três formas. É mais um passo a mostrar que a Onda é uma linguagem de uso geral, não só um compilador que se reproduz.

**Próxima.** Dar ao avaliador variáveis (`x = 3; x*x`) e talvez chamadas, aproximando-o de uma pequena linguagem interpretada escrita em Onda — um interpretador de expressões com ambiente.

## Iteração 43: uma mini-linguagem com variáveis, interpretada em Onda

**Pergunta.** O avaliador da iteração 42 só fazia contas. Com variáveis e um ambiente, torna-se uma pequena linguagem. A Onda escreve um interpretador com estado de forma natural?

**O que foi feito.** `ex/mini.onda`: estende o avaliador com nomes e atribuição. Cada linha é `nome = expr` (guarda no ambiente, não imprime) ou `expr` (avalia e imprime). O ambiente é uma tabela de pares (nome empacotado em 8 bytes, valor); `busca` e `poe` lêem e escrevem. O analisador distingue uma atribuição de uma comparação olhando se o `=` é seguido de outro `=`.

**Prova** (`test/mini.test.js`; 55 testes no total, todos a passar). Programas conferidos e iguais nas três formas:
```
x = 3        n = 10           x = 5
y = 4        f = 1            x = x + 1
x*x + y*y    f = f * n        x = x * x
(x+y)*2      n = n - 1        x          -> 36
-> 25 14     f = f * n
             f  -> 90
```
A reatribuição (`x = x + 1`), a precedência e os parênteses funcionam, e a saída é igual bit a bit em C, x86-64 e WebAssembly.

É a Onda a hospedar uma linguagem — um interpretador com ambiente — que por sua vez é compilada pela Onda para três formas. A linguagem para IAs começa a hospedar linguagens.

**Próxima.** Dar-lhe condicionais (um `? :` ou um `se`) e talvez ciclos, ou fechar o círculo mostrando o mesmo interpretador a correr nas três formas sobre o mesmo programa de entrada.

## Iteração 44: a Onda Viva entra na rede de testes

**Pergunta.** A Onda Viva — o coração do projeto, o sistema que verifica cada forma rápida contra o seu significado — era testada por um script à parte (`node test/viva.test.js`), fora do `node --test`. Se partisse, o `node --test` não dava por isso. Porque não está no mesmo sítio que tudo o resto?

**O que foi feito.** Reescrevi `test/viva.test.js` para usar o `node:test`, como os outros 54 testes. As seis verificações da Onda Viva passam a ser subtestes de verdade, e uma falha de qualquer uma falha o `node --test test/*.test.js`:
- a forma CPU do fractal de Julia e das ondas dá os mesmos bits que o significado, em 3000 píxeis;
- um erro injetado numa constante é apanhado pelo significado;
- o significado recusa um programa mal tipado;
- o compilador verifica-se a si próprio dentro do WebAssembly (o ponto fixo: o `.wasm` gera a semente C exata).

**Prova.** `node --test test/*.test.js` passou de 55 para 60 testes, todos a passar. A auto-verificação deixou de ser uma promessa num script solto e passou a ser uma condição da suite: se a Onda Viva deixar de apanhar um erro, ou se o compilador deixar de se reproduzir no WebAssembly, o conjunto fica vermelho.

**Próxima.** Dar condicionais e comparações à mini-linguagem (`? c a b`, `<`, `==`), ou pôr um campo novo a ser verificado contra o significado dentro da própria Onda Viva.

## Iteração 45: condicionais e comparações na mini-linguagem

**Pergunta.** A mini-linguagem da iteração 43 só tinha contas e variáveis. Sem decidir, não é linguagem. Dá-lhe ramos.

**O que foi feito.** `ex/mini.onda` ganhou dois níveis novos de gramática:
- **comparações** (`< > <= >= == !=`), um nível abaixo do `+ -`, que valem 0 ou 1;
- **condicional** `? c a b` (prefixo, como na própria Onda), no topo: avalia `c` e dá `a` ou `b`.
Assim escreve-se `max = ? x > 3 x 3`, `abs = ? a < 0 (0 - a) a`, `? x == 5 1 0`. As gramáticas antigas continuam a valer (os programas da iteração 43 dão o mesmo).

**Prova** (`test/mini.test.js`, agora com casos de condicionais; 60 testes no total, todos a passar). `? x < 10 100 200` dá 100 para x=5; `max = ? x > 3 x 3` dá 5; `abs` de −7 dá 7; e tudo igual em C, x86-64 e WebAssembly.

A mini-linguagem já decide. Falta-lhe repetir — com condicionais e um ciclo, uma linguagem interpretada em Onda fica Turing-completa.

**Próxima.** Dar-lhe um ciclo (`while`), fechando a Turing-completude: uma pequena linguagem imperativa, escrita em Onda, compilada pela Onda para três formas.

## Iteração 46: a mini-linguagem fica Turing-completa (ciclos)

**Pergunta.** Faltava à mini-linguagem repetir. Com um ciclo, uma linguagem com variáveis, condicional e repetição é Turing-completa. Escreve-se um interpretador de ciclos em Onda, que por sua vez lê e executa ao mesmo tempo?

**O que foi feito.** `ex/mini.onda` ganhou blocos `{ e ; e ; ... }` (sequência, vale o último) e o ciclo `W (cond) { corpo }`. O truque, num interpretador que lê e executa de uma vez: o ciclo guarda a posição do `(cond)`, e a cada volta **recua e re-lê** a condição e o corpo; quando a condição é falsa, salta o corpo contando chavetas (`saltabloco`), sem o executar, para o cursor ficar no sítio certo.

**Prova** (`test/mini.test.js`, agora com ciclos; 60 testes no total, todos a passar). Programas com ciclos, todos iguais em C, x86-64 e WebAssembly:
```
n = 5                              a = 0; b = 1; i = 0
f = 1                              W (i < 10) { t=a+b; a=b; b=t; i=i+1 }
W (n > 0) { f=f*n; n=n-1 }         a            -> 55 (fib)
f            -> 120 (fatorial)
```
E um **ciclo dentro de outro**: contar os primos abaixo de 20 (`W (n<20) { ... W (d<n) { ... } ... }`) dá 8. A mini-linguagem, escrita em Onda e compilada pela Onda para três formas, corre programas Turing-completos.

**O arco fechado.** A Onda — uma linguagem para IAs — hospeda uma pequena linguagem imperativa completa (variáveis, `?`, `W`, blocos), e essa linguagem dá o mesmo resultado nas três formas que a Onda gera. Das iterações 42 a 46: de uma conta a uma linguagem.

**Próxima.** Dar-lhe funções (definição e chamada), ou voltar ao núcleo com uma função matemática nova verificada bit a bit em todas as formas.

## Iteração 47: um crivo — a eficiência com um número

**Pergunta.** O utilizador pediu a linguagem "mais eficiente alguma vez usada". As iterações 24–31 mediram casos extremos (π, travessia, fib). Falta um trabalho clássico, compute + memória, sem chamadas no laço quente: o crivo de Eratóstenes.

**O que foi feito.** `ex/crivo.onda`: conta os primos até N marcando os múltiplos. É escrita e leitura intensa de um vetor grande, com o laço interno a saltar de `i` em `i`.

**Prova** (`test/crivo.test.js`; 62 testes no total, todos a passar). As contagens batem certo — 4 até 10, 25 até 100, 168 até 1000, 9592 até 100 000, e 664 579 até 10 milhões — e são iguais em C, x86-64 e WebAssembly.

**Medição** (10 milhões):

| forma | tempo |
|---|---|
| C (`gcc -O2`) | ~166 ms |
| x86 nativo da Onda | ~212 ms |

O x86 da Onda fica a ~1,3× do C neste trabalho. Encaixa no retrato das iterações 24–31: paridade no código limitado pela memória, ~1,3× num misto de cálculo e memória, e só a recursão com muitas chamadas (o `fib`) fica a 4×, por causa do protocolo de chamada. Para código numérico e de dados — o que a maioria dos programas faz — a Onda está ao nível do `gcc -O2`, sem C, assembler nem linker.

**Próxima.** Estamos a meio das 100 iterações: um resumo honesto do que a Onda é hoje e do que falta. Ou dar funções à mini-linguagem.

## Iteração 48: um armazém endereçado por conteúdo (cripto + armazenamento)

**Pergunta.** Dois grandes fios desta sessão — o SHA-256 (iteração 40) e o armazém persistente (iterações 25–35) — encontram-se? Um armazém onde a chave de cada objeto é o seu próprio hash (como os objetos do git) junta-os num só.

**O que foi feito.** `ex/cas.onda`: o SHA-256 e o armazém `K` num só programa.
- `put`: lê um blob do stdin, calcula o seu SHA-256, guarda-o (se novo) num índice hash→posição mais uma região de blobs, e imprime o hash.
- `get <hash>`: encontra o blob pelo hash (64 hex → 8 palavras) e devolve-o.

**Um erro instrutivo sobre o armazém.** O `K` devolve a base do armazém como um deslocamento em palavras desde `M` — e como o armazém é um `mmap` à parte, num endereço mais baixo, esse deslocamento é **negativo**. Os offsets dos blobs (base + x) ficavam negativos, e o `get` tratava "negativo" como "não encontrado". A correção: guardar os offsets relativos à base (positivos). Outro: o `main` saía com o código do último `P` (10); um `0` final repôs a saída limpa.

**Prova** (`test/cas.test.js`; 65 testes no total, todos a passar).
- `put` de "abc", "hello world", 5000 bytes, 200 bytes zero → o hash é o SHA-256 correto e o `get` devolve o blob igual.
- **Deduplicação por conteúdo:** guardar o mesmo blob duas vezes deixa uma só entrada.
- **Entre formas:** o que o x86 guarda, o C e o WebAssembly recuperam do mesmo ficheiro.

Um objeto útil de verdade — content-addressable storage, a base do git, do IPFS, dos sistemas de cópia de segurança — escrito em Onda em ~70 linhas, a juntar a criptografia e o armazenamento que a própria Onda implementa, igual nas três formas.

**Próxima.** Dar-lhe recolha de lixo (libertar blobs sem referências), ou um resumo honesto do estado a meio das 100 iterações.

## Iteração 49: base64 — um codec bit a bit

**Pergunta.** Depois do SHA-256 e do armazém endereçado por conteúdo, falta a peça que os acompanha sempre: transformar dados binários em texto. A base64 é o teste perfeito de empacotamento de bits a atravessar fronteiras de bytes.

**O que foi feito.** `ex/b64.onda`: codifica (`e`) e descodifica (`d`) em base64 (RFC 4648), com o enchimento `=`. A codificação lê três bytes e escreve quatro caracteres de 6 bits; a descodificação acumula 6 bits de cada vez e emite um byte quando junta oito.

**Prova** (`test/b64.test.js`; 68 testes no total, todos a passar).
- Os vetores clássicos da RFC 4648 (`f`→`Zg==`, `fo`→`Zm8=`, … `foobar`→`Zm9vYmFy`) batem certo.
- Round-trip de **todos os 256 valores de byte**: codificar e descodificar devolve os mesmos bytes.
- C, x86-64 e WebAssembly codificam igual.

(Mais um caso do mesmo detalhe que o CAS apanhou: o `main` saía com o código do último `P`; um `0` final repõe a saída limpa.)

**Próxima.** Chegámos a meio das 100 iterações. A próxima é um resumo honesto: o que a Onda é hoje, o que está provado, e o que falta.

## Iteração 50: a meio das 100 — o estado da Onda

**O que é.** Chegámos a meio. Em vez de mais uma peça, um balanço honesto, em `docs/ESTADO.md`: o que a Onda é, o que está provado (a cada corrida dos 68 testes), os detalhes úteis para quem a escreve, e o que falta.

**O retrato.** A Onda compila-se a si própria bit a bit em três formas (C, WebAssembly, x86-64 nativo — as duas últimas escritas byte a byte, sem C nem linker); todos os programas dão o mesmo resultado nas três, prova que são a mesma máquina (o SHA-256 é a mais exigente); iguala o `gcc -O2` em tempo no código numérico e limitado pela memória, perdendo só na recursão com muitas chamadas; faz matemática ao bit, gráficos na GPU, circuitos, programas quânticos reais (gerados e simulados dentro da Onda), e um armazenamento onde a memória é o disco, atómico e partilhável. E corre uma dezena de programas a sério — de um interpretador de Brainfuck a uma mini-linguagem Turing-completa — iguais em todas as formas.

**Também documentado:** três *gotchas* da linguagem que estas iterações destaparam — o código de saída do `main`, o `~` lógico (complemento de bits é `^ x mascara`), e o custo da chamada por índice num campo em C/WebAssembly. O `SPEC.md` passou a avisar do primeiro.

**O que falta** (as pontas para 50–100): inline das reduções no emissor C, o custo das chamadas no x86, o armazém multi-processo no x86/WebAssembly, funções na mini-linguagem, e a redução de Payne–Hanek.

**Próxima.** Atacar uma dessas pontas. Provavelmente dar funções (com recursão) à mini-linguagem, fechando-a como linguagem hospedada completa.

## Iteração 51: funções e recursão na mini-linguagem

**Pergunta.** A mini-linguagem já decidia e repetia. Faltava-lhe o que faz dela uma linguagem de verdade: definir funções e chamá-las, com recursão.

**O que foi feito.** `ex/mini.onda` ganhou `F nome param = corpo` (definição) e a chamada `nome arg`. Uma tabela de funções guarda, por nome, o parâmetro e a **posição do corpo** na fonte; na chamada, liga-se o parâmetro ao argumento (guardando o valor anterior, para a recursão), salta-se o cursor para o corpo, avalia-se, e repõe-se tudo.

**O erro que tudo destravou.** A recursão entrava em ciclo infinito. A causa não era a chamada — era o `?`: num interpretador que lê-e-executa, o `? c a b` avaliava **os dois ramos** ao analisá-los, por isso o caso base da recursão também executava a chamada recursiva. A correção é a técnica clássica: uma flag "executar" (`@8`). O ramo não tomado continua a ser **analisado** (para o cursor avançar), mas inerte — não escreve, não chama, não divide por zero. Com o `?` preguiçoso, a recursão termina.

**Prova** (`test/mini.test.js`, agora com recursão; 68 testes no total, todos a passar). Tudo igual em C, x86-64 e WebAssembly:
```
F fat n = ? (n < 2) 1 (n * fat (n - 1))                 -> fat 6  = 720
F fib n = ? (n < 2) n (fib (n - 1) + fib (n - 2))       -> fib 15 = 610
F par n = ? (n == 0) 1 (impar (n - 1))                  -> par 10 = 1 (par)
F impar n = ? (n == 0) 0 (par (n - 1))                     par 7  = 0 (impar)
```
Recursão simples, dupla (fib) e **mútua** (par/ímpar). Uma linguagem imperativa completa — variáveis, condicional, ciclos, blocos, funções recursivas — escrita em Onda, compilada pela Onda para três formas, dando o mesmo resultado em todas.

**Próxima.** Voltar ao desempenho: o inline das reduções (`S`) no emissor de C, ou o custo das chamadas no x86.

## Iteração 52: expressões regulares (o matcher do Kernighan)

**Pergunta.** Depois de uma linguagem interpretada, falta o outro clássico do processamento de texto: casar padrões. O matcher recursivo de Kernighan (de *The Practice of Programming*) cabe em meia dúzia de funções — escreve-se em Onda?

**O que foi feito.** `ex/regex.onda`: `.` (qualquer caratere), `*` (zero ou mais), `^` (início), `$` (fim), pela recursão mútua de `aqui` (matchhere) e `estrela` (matchstar). Lê o padrão do argumento e o texto do stdin, linha a linha.

**Dois erros instrutivos sobre a sintaxe prefixa.**
- Os ciclos de leitura tinham três condições mas um só `&&` (que é binário): `W && >= c 0 != c 10 < n ...` lia o corpo como `< n ...` e girava para sempre. Faltava um `&&` (`&& && ...`).
- O `estrela` escrevia `r=1` ao casar e logo a seguir um segundo `?` punha `r=2`, apagando o sucesso. A correção foi pôr o avanço no `else` do casamento, não numa instrução à parte.

**Prova** (`test/regex.test.js`; 70 testes no total, todos a passar). Casos conhecidos — `a*b`, `^ab.d$`, `.*c`, `^a*$`, `c.t` — todos com o veredicto certo e igual em C, x86-64 e WebAssembly.

**Próxima.** Continuar a alargar a biblioteca de programas verificados (a Onda a fazer coisas a sério), ou atacar uma ponta de desempenho.

## Iteração 53: aritmética de precisão arbitrária

**Pergunta.** Os inteiros da Onda têm 64 bits — a `fib(93)` dá a volta. Dá para ir além, com números tão grandes quanto a memória, escritos em Onda?

**O que foi feito.** `ex/big.onda`: um número grande é um vetor de "dígitos" na base 10⁹ (do menos para o mais significativo). `mulp` multiplica-o por um inteiro pequeno com transporte; o `main` calcula N! multiplicando de 2 a N. A impressão junta o dígito mais significativo sem zeros à esquerda e os outros com 9 casas.

**Prova** (`test/big.test.js`; 72 testes no total, todos a passar). N! exato contra o `BigInt` do JavaScript para N = 0, 1, 5, 20, 50, 100, 200:
```
20!  = 2432902008176640000
100! = 933262154439441526816992388562667004907159682643816214685929...000000 (158 dígitos)
```
E igual em C, x86-64 e WebAssembly. O `200!` tem 375 dígitos, todos certos, nas três formas.

A Onda transcende o seu próprio limite de 64 bits com uma estrutura escrita em Onda — e, como tudo o resto, dá o mesmo em todas as formas.

**Próxima.** Continuar a biblioteca verificada, ou atacar uma ponta de desempenho/compilador.

## Iteração 54: quicksort

**Pergunta.** Falta um algoritmo fundamental de manipulação de vetores: ordenar. Um quicksort recursivo in-place, em Onda, dá o mesmo que a ordenação de referência, mesmo em grande?

**O que foi feito.** `ex/qsort.onda`: quicksort recursivo in-place (pivô no fim, partição de Lomuto). Lê inteiros (com sinal) do stdin, ordena, imprime.

**O mesmo erro de sintaxe prefixa, outra vez.** A condição de leitura `? && >= c '0 <= c '9 == c '-` deixava `== c '-` solto (o `&&` é binário), e uma linha em branco caía no ramo de leitura, gerando um `0` espúrio. A condição certa é `? || && >= c '0 <= c '9 == c '-` (dígito **ou** sinal). É o terceiro programa desta série a tropeçar no mesmo sítio — vale a nota no `docs/ESTADO.md`.

**Prova** (`test/qsort.test.js`; 74 testes no total, todos a passar). Vetores vazios, de um elemento, repetidos, invertidos, e **2000 inteiros aleatórios** (com negativos e repetidos) — todos iguais à ordenação do JavaScript, e iguais entre C, x86-64 e WebAssembly (3000 elementos).

**Próxima.** Continuar a biblioteca verificada, ou uma ponta de desempenho/compilador.

## Iteração 55: busca em largura num labirinto

**Pergunta.** Falta um domínio: grafos e busca. O caminho mais curto num labirinto por BFS exercita uma fila e uma grelha — escreve-se em Onda?

**O que foi feito.** `ex/maze.onda`: lê uma grelha (`#` parede, `S` início, `E` fim), faz BFS com uma fila explícita e um vetor de distâncias, e imprime o número de passos (ou −1). As quatro direções saem de um `dir` 0–3 com `dy`/`dx` explícitos.

**Prova** (`test/maze.test.js`; 76 testes no total, todos a passar). Seis labirintos conferidos contra uma BFS de referência em JavaScript — incluindo sem caminho (−1), adjacente (`SE`→1) e um labirinto 5×5 — todos iguais em C, x86-64 e WebAssembly.

Também refresquei o `docs/ESTADO.md`: a mini-linguagem já tem funções recursivas (iteração 51), e a lista de programas de uso geral está completa.

**Próxima.** Continuar a biblioteca verificada, ou uma ponta de desempenho/compilador.

## Iteração 56: integração numérica, e os limites da identidade ao bit

**Pergunta.** O paradigma de campo serve a análise numérica? E os floats de uma redução dão os mesmos bits em todas as formas, como os inteiros?

**O que foi feito.** `ex/integra.onda`: a regra de Simpson como uma soma de campo (`S` sobre os pontos). Calcula ∫₀^π sin x dx e ∫₀¹ 4/(1+x²) dx.

**Prova** (`test/integra.test.js`; 78 testes no total, todos a passar). Com um milhão de intervalos: a primeira dá 1,99999999999999 (= 2) e a segunda 3,14159265358973 (= π), em todas as formas, dentro de 10⁻¹⁰.

**O achado honesto.** Ao contrário do SHA-256, os **bits** da redução de floats **não** são iguais entre todas as formas: o `S` paraleliza em C (OpenMP) e soma noutra ordem que o x86 e o WebAssembly (que são em série). Como a soma de vírgula flutuante não é associativa, os últimos bits de C diferem — mas o x86 e o WebAssembly, ambos em série, batem ao bit. O valor concorda a ~15 dígitos. Isto delimita com honestidade a afirmação de "a mesma máquina em todas as formas": vale ao bit para código inteiro e determinístico (como o SHA-256); para reduções de floats em paralelo, vale ao valor, não ao último bit. O `README` e o `ESTADO.md` passaram a dizê-lo.

**Próxima.** Uma redução de floats determinística — uma soma por árvore de ordem fixa, independente do número de núcleos — para o campo bater ao bit também com floats, em todas as formas.

## Iteração 57: CRC-32

**Pergunta.** Depois do SHA-256 (hash criptográfico) falta a outra família de verificação: um checksum rápido com tabela. O CRC-32 (o do zip, do PNG, do Ethernet) é inteiro e determinista — bate ao bit em todas as formas?

**O que foi feito.** `ex/crc.onda`: constrói a tabela de 256 entradas com o polinómio refletido (0xEDB88320) e processa o stdin byte a byte. Imprime o CRC em hexadecimal.

**Prova** (`test/crc.test.js`; 80 testes no total, todos a passar). Os valores canónicos batem certo — `"123456789"` → `cbf43926`, vazio → `00000000`, a frase da raposa → `414fa339` — conferidos também contra o `zlib` do Node, e **iguais bit a bit** em C, x86-64 e WebAssembly. Ao contrário das reduções de floats da iteração 56, aqui é tudo inteiro, por isso a identidade ao bit é total.

(A redução de floats determinística — para o campo bater ao bit também com floats — fica como trabalho de compilador no `docs/ESTADO.md`: precisa de uma soma de ordem fixa no emissor, sem perder o paralelismo.)

**Próxima.** Continuar a biblioteca verificada.

## Iteração 58: para bater o C, o SIMD — medir o teto e lançar os codificadores AVX

**Pergunta.** O utilizador apertou: *"a memória não é mais rápida? Continua no baixo nível enquanto não fores melhor e mais rápido que o C."* Até aqui a honestidade era "igual ao gcc -O2". Igualar não chega. Onde é que o x86 da Onda pode mesmo **passar à frente** do C?

**O que já existe.** O emissor x86 gera código escalar: um `double` por instrução SSE (`mulsd`, `addsd`). O `gcc -O2` — o "C normal" com que nos comparámos — faz exatamente o mesmo. Por isso empatávamos.

**O achado.** O `gcc -O2` **não auto-vetoriza** (preciso de `-O3 -march=native`, que quase ninguém usa como baseline). Medi o teto num núcleo limitado por cálculo (mapa polinomial de grau 7, Horner, 8192 doubles em L2, 200000 repetições):

```
gcc -O2 escalar (o C normal):              1312 ms   (0 registos ymm — confirmado escalar)
AVX mulpd+addpd, SEM fma (bits idênticos):  841 ms   → 1,56× mais rápido, mesmo resultado ao bit
AVX+FMA (último bit diferente):             470 ms   → 2,79× mais rápido
```

Ou seja: se o emissor x86 passar a escrever AVX de 256 bits (4 doubles de cada vez), a Onda fica **mais rápida que o C** nos núcleos numéricos vetorizáveis — e com `mulpd+addpd` (sem FMA) o resultado é **bit a bit igual** ao escalar, por isso não se perde a identidade entre formas. O FMA dá 2,8× mas muda o último bit (fundе a multiplicação e a soma com um só arredondamento), como já acontece com as reduções de floats em paralelo.

**O que foi feito.** Lancei no `src/6x86.onda` os codificadores das instruções AVX2 que vou precisar, em VEX de 2 e 3 bytes: `xvop` (mul/add/sub/div/xor empacotados), `xvfma` (fmadd231/213), `xvm` (vmovupd carga/armazém e vbroadcastsd de memória), `xvmq` (mover GPR→xmm) e `xvbx` (broadcast de xmm). Cada fórmula de bytes foi conferida **byte a byte** contra a saída do `objdump` — 14 instruções, todas certas (ver `scratchpad`: `c5 f5 59 c2` = `vmulpd ymm0,ymm1,ymm2`, etc.). Restrição deliberada para simplicidade e segurança: registos `ymm0..ymm7`, base sempre `r15`, índice num GPR baixo, escala 8.

**Prova.** `./build.sh` fecha o ponto fixo nas três formas com os codificadores já emitidos (hash C `776f5d5b9572e284`; o WebAssembly cresceu de 236248 para 237303 bytes — logo os codificadores entram mesmo no compilador, não são removidos). `node --test`: **80 testes, todos a passar**. Os codificadores ainda não estão ligados à geração de código (vêm na 59), por isso o comportamento não muda — este é o alicerce verificado.

**Próxima.** Ligar: detetar um mapa de campo (`E`) cujo elemento seja aritmética pura de floats (sem ramos nem chamadas), e emitir um laço AVX empacotado (4 de cada vez) com uma cauda escalar para o resto. Medir a Onda x86 contra o `gcc -O2` no mesmo núcleo — e provar, com números, que a Onda é mais rápida.

## Iteração 59: o banco de ensaio vetorizável, e a base honesta

**Pergunta.** Para provar com números que a Onda é mais rápida que o C preciso de um núcleo que *seja* vetorizável e de uma referência ao bit que a vetorização tenha de preservar. Qual núcleo, e quanto vale a base de hoje?

**O que foi feito.** `ex/vecmap.onda`: um mapa de campo `E b n g a` onde `g a[i]` é um polinómio de grau 7 (Horner) — fonte única, aritmética pura de floats, sem ramos nem chamadas: exatamente a forma que o emissor x86 vai saber vetorizar. `test/vecmap.test.js` fixa a referência ao bit: C, x86 e WebAssembly têm de dar a **mesma soma, bit a bit**.

**Prova** (`node --test`: **82 testes**, todos a passar). As três formas dão `soma = 8.56665324969217e+16`, bits `1131611540 510256455` — iguais ao bit. O mapa é por-elemento independente e a soma de conferência é em série, por isso a igualdade é total (ao contrário das reduções de floats em paralelo da it.56).

**A base honesta** (rep=200000, n=8192, limitado por cálculo):

```
Onda x86 (escalar de hoje):          ~3090 ms
C gerado pela Onda, gcc -O2 (serie): ~3460 ms   (chama g por elemento)
C idiomatico inline, gcc -O2:         1312 ms   (o scal.c da it.58)
teto AVX bit-seguro (mulpd+addpd):     841 ms
```

Dois factos. Primeiro: o x86 da Onda **já bate** o C que a própria Onda gera (3090 vs 3460 ms), porque a Onda mete o elemento em linha e o C gerado chama-o por índice. Segundo, e mais exigente: contra o C *idiomático* (tudo em linha, escrito por uma pessoa), a Onda está **2,4× atrás** — 3090 vs 1312 ms. Logo "igual ao gcc -O2" era só verdade em núcleos leves (o π, poucas constantes); num Horner com 8 constantes, o alocador da Onda recarrega-as e paga. O teto AVX bit-seguro é 841 ms: o vetorizador da próxima iteração tem de lá chegar para bater **também** o C idiomático, não só o C gerado.

**Próxima.** Emitir o AVX: em `ce`, quando o elemento é vetorizável (`xvan`), chamar `lowEv` em vez de `lowE`; o `xvmap` no backend percorre a AST do elemento e emite um laço empacotado de 4 em 4 (com as constantes difundidas uma só vez) mais uma cauda escalar para o resto. Gerir `ymm0-7` à mão, sem tocar no alocador (que o `src/` não usa campos, por isso o ponto fixo é imune). Depois re-medir e pôr o número.

## Iteração 60: o vetorizador AVX ligado — a Onda emite SIMD que o gcc -O2 não emite

**Pergunta.** Ligar os codificadores da it.58: detetar um mapa de campo vetorizável e emitir um laço AVX de 4 em 4. Fica bit a bit igual ao escalar? E fica mais rápido?

**O que foi feito.** Um vetorizador completo, só no x86:
- `xvan` (`2expr`): analisa a função do elemento. Aceita a forma `: g ii>f i a { = x @f + a i <expr de + - * / sobre x e floats> }` — fonte única, aritmética pura, sem ramos nem chamadas — e calcula a pressão de registos (modelo direita-primeiro); rejeita (cai no escalar) se passar de 6.
- `lowEv` emite um nó-macro novo (tipo **51**, que o `41` já é o retorno) só quando `isx` e `xvan`; em C/WebAssembly continua o `E` normal (tipo 38).
- `xvmap` (`6x86`): o `xins` do tipo 51 percorre a AST do elemento e emite **um laço empacotado** (`vmovupd`/`vmulpd`/`vaddpd` em `ymm`, 4 doubles de cada vez, `vbroadcastsd` para as constantes) **mais uma cauda escalar** (`movsd`/`mulsd`) para o resto de `n`. Gere `ymm0-7` com um alocador de bitmask; os GPR do laço são `rax/rcx/rdx` (que o alocador nunca usa) mais `r8/r9` salvos à pilha. As entradas (`n`, base destino, base fonte) são lidas com `xpsv` de onde o alocador as pôs. **Não toca no alocador** — e como o `src/` não usa campos, o ponto fixo é imune a bugs disto.

**Prova.** `./build.sh` fecha o ponto fixo nas três formas (hash C `e6978159804a0dc8`; o x86 cresceu de 179984 para 184080 bytes — o vetorizador entra mesmo). `node --test`: **82 testes**, todos a passar — incluindo o `vecmap` (que exige C, x86 e WebAssembly **iguais ao bit**) e o `matmul`/`life` (o analisador rejeita-os, por terem laço interno ou serem inteiros, e cai no escalar, correto). No binário confirma-se o AVX: 7× `vmulpd ymm`, 7× `vaddpd ymm`, `vmovupd ymm`, `vbroadcastsd`.

**Os números** (rep=200000, n=8192):

```
Onda x86 ESCALAR (it.59):     ~3090 ms
Onda x86 VETORIZADO (agora):   2073 ms   → 1,49x mais rapido que o proprio escalar
C que a Onda gera, gcc -O2:    3101 ms   → a Onda x86 bate o seu proprio C
C idiomatico inline, gcc -O2:  1312 ms   → ainda a frente da Onda
teto AVX bit-seguro:            841 ms
```

**O estado honesto.** A Onda já emite SIMD que o `gcc -O2` não emite, é bit a bit igual, e é 1,5× mais rápida que o seu escalar e que o C que ela própria gera. Mas ainda **não** bate o C *idiomático* (1312 ms): está a 2073. A culpa é da difusão das constantes — faço `movabs`+`vmovq`+`vbroadcastsd` a cada uso (24 instruções por iteração só para as 8 constantes), quando elas são invariantes do laço. O teto é 841 ms.

**Próxima.** Difundir as 8 constantes **uma só vez** antes do laço (numa tabela na pilha, e depois `vbroadcastsd ymm, [rsp+k]` por uso — uma instrução em vez de três), para tirar o peso do laço e chegar perto do teto, passando à frente também do C idiomático.

## Iteração 61: a Onda passa à frente do C — 1,55× mais rápida que o gcc -O2, ao bit

**Pergunta.** A it.60 ficou a 2073 ms (contra 1312 do C idiomático) por difundir as 8 constantes a cada iteração. Se as difundir **uma só vez**, chega ao teto e bate o C?

**O que foi feito.** As constantes do mapa são invariantes do laço. Agora `xvmap` recolhe-as (`xvcoll`, com deduplicação), reserva uma tabela na pilha (`sub rsp, 128`), materializa-as lá **uma vez** antes do laço, e no corpo cada constante é um `vbroadcastsd ymm, [rsp+k*8]` — **uma instrução** em vez de `movabs`+`vmovq`+`vbroadcastsd`. O analisador (`xvan`) passou a limitar a 15 constantes (para o deslocamento caber num byte). A cauda escalar lê as mesmas da tabela com `movsd`.

**Prova.** `./build.sh` fecha o ponto fixo (hash C `7ba090e46001ab9d`). `node --test`: **83 testes** (o `vecmap` ganhou um terceiro: `n` não-múltiplo-de-4 — 8190, 8191, 3, 1 — a cauda escalar bate o C **ao bit**). Correção confirmada à mão: para n=8190/8191/3 os bits da soma do x86 são exatamente os do C.

**Os números** (3 corridas, mesmo polinómio de grau 7, rep=200000, n=8192):

```
Onda x86 AVX (agora):            942, 955, 966 ms   (mediana ~955)
C idiomatico inline, gcc -O2:   1381, 1483, 1556 ms (mediana ~1483)
C que a Onda gera, gcc -O2:     2577..3079 ms
gcc -O3 -march=native (com FMA):  428 ms
```

**O marco.** A Onda x86 faz **~955 ms** contra **~1483 ms** do C idiomático compilado com `gcc -O2`: **1,55× mais rápida**, e com a soma **bit a bit igual** (sem FMA, sem reassociar — `vmulpd`+`vaddpd` por lane dão exatamente os mesmos arredondamentos que o escalar). É a resposta honesta ao desafio do utilizador: *neste núcleo, a Onda é mais rápida que o C.* A razão é estrutural e verdadeira: o `gcc -O2` — o nível com que quase toda a gente compila — **não auto-vetoriza**, e a Onda vetoriza.

**O que falta para o teto.** O `gcc -O3 -march=native` (428 ms) ainda ganha: usa **FMA** (funde `a*b+c` num só arredondamento, o dobro do débito) e escalona melhor. Fundir com FMA mudaria o último bit (como já acontece nas reduções paralelas), por isso fica como **modo opcional** da próxima iteração — para quem quer a velocidade máxima e aceita a diferença no último bit, mantendo o modo bit-exato por omissão.

**Próxima.** (1) Modo FMA opcional (`vfmadd231pd`) para aproximar os 428 ms. (2) Alargar o vetorizador: `F i` (índice→float, para mapas que usam o índice) e as reduções `S` (produto interno), onde o `gcc -O2` também não vetoriza.

## Iteração 62: modo FMA opcional (-xf), e um bug de pressão de registos apanhado

**Pergunta.** O `gcc -O3 -march=native` (428 ms) ganha à Onda (955 ms) porque usa FMA. Dá para a Onda usar FMA também, sem perder o modo bit-exato por omissão?

**O que foi feito.** Uma flag `-xf` (x86 com FMA), lida no emissor por `Av` (sem slot global novo). Quando ligada, `xvem` funde `+ c (* a b)` num `vfmadd231pd` (e `vfmadd231sd` na cauda escalar) — um só arredondamento em vez de dois. Por omissão (`-x`) nada muda: continua `vmulpd`+`vaddpd`, bit a bit igual.

**O bug (e a lição).** A primeira versão da fusão avaliava o **acumulador primeiro** e mantinha-o vivo durante a recursão do produto — logo a pressão de registos era igual ao **grau** do polinómio (8 para grau 7), o `salloc` esgotava os 8 `ymm` e escrevia num registo inválido. O resultado vinha 0,14% errado (e não "no último bit"). A correção: avaliar o **operando profundo do produto primeiro** e o acumulador por último, mantendo a pressão em ~3. Confirmado: agora o `-xf` bate um C com `fma()` real (8.56665324969217e+16, ~15 dígitos), e o `-x` continua exatamente igual.

**Prova.** Ponto fixo fecha (hash C `c9ef85525cd0857b`). `node --test`: **84 testes** — o `vecmap` ganhou um quarto: o `-xf` tem de dar o mesmo valor que o `-x` a ~15 dígitos (apanha a fusão mal feita). O `-x` bit-exato está intacto (os outros três testes do `vecmap` passam na mesma).

**Os números** (rep=200000, n=8192):

```
Onda -x  (AVX, bit-exato):         ~1000 ms   (1,5x sobre o gcc -O2)
Onda -xf (AVX+FMA, opcional):      ~820 ms    (1,8x sobre o gcc -O2)
C idiomatico, gcc -O2:             ~1483 ms
gcc -O3 -march=native (FMA+desenrola): 428 ms
```

**O estado honesto.** O `-xf` já usa FMA e é ~1,8× mais rápido que o `gcc -O2`, com o mesmo valor do C a 15 dígitos. Mas ainda não bate o `gcc -O3 -march=native` (428 ms): a cadeia de 7 FMA dependentes (`p = fma(x,p,c)`) tem ~28 ciclos de latência por vetor, e o `gcc -O3` **desenrola** o laço para processar vários vetores ao mesmo tempo e esconder essa latência. O meu laço faz um vetor de cada vez.

**Próxima.** Desenrolar o laço vetorial (processar 2–4 grupos de 4 por volta, com acumuladores independentes) para esconder a latência da cadeia e aproximar os 428 ms — ainda com FMA opcional e o bit-exato por omissão.

## Iteração 63: vetorizar também as reduções (S) — 2,5× sobre o gcc -O2

**Pergunta.** O mapa (`E`) já bate o C. E a redução (`S`, o produto interno / soma)? É o outro grande padrão numérico — e o `gcc -O2` também não a vetoriza.

**O que foi feito.** `xvsmap`: o macro da redução (tipo **52**, só em modo `-xf`). Acumula de 4 em 4 num registo `ymm` (`vaddpd`), reduz no fim as 4 pistas a um escalar (guarda na pilha e soma), e trata o resto com uma cauda escalar; o resultado vai para o valor do `S`. Reaproveita o **mesmo** analisador (`xvan`) e walker (`xvem`) dos mapas — a função do elemento tem a mesma forma. Como reassocia a soma (as 4 pistas somam noutra ordem que a série), fica **gated no `-xf`**: em `-x` a redução continua em série, bit a bit igual ao C sequencial. `ex/vecsum.onda` é o banco de ensaio.

**Prova.** Ponto fixo fecha (hash C `5b2cd610f2ce8191`). `node --test`: **86 testes** — `vecsum` com dois: o `-x` em série bate o C sequencial **ao bit**, e o `-xf` dá o mesmo valor a ~15 dígitos (8.56665324969212e+16 vs ...217).

**Os números** (reducao Σ poly(a[i]), rep=200000, n=8192):

```
Onda -xf (AVX, acumulador de 4):  ~830 ms    → 2,5x sobre o gcc -O2
C gcc -O2:                       ~2070 ms    (nao vetoriza a reducao)
C gcc -O3 -march=native:          ~525 ms    (vetoriza + desenrola + FMA)
Onda -x (serie, bit-exato):      ~3224 ms    (= C seq ao bit; a serie e lenta)
```

**O estado honesto.** Nas reduções, a Onda `-xf` é **2,5× mais rápida que o `gcc -O2`** (que não vetoriza reduções de float). Mas — ao contrário do que eu supunha — o `gcc -O3 -march=native` **vetoriza** a redução (28 instruções `ymm` no laço, aceitando a reassociação pelo seu modelo de custo) e, com desenrolamento, faz 525 ms contra os 830 ms da Onda. Portanto a vitória nas reduções é sobre o `-O2`, não sobre o `-O3`. E note-se que em série (modo bit-exato `-x`) a redução da Onda é mais lenta que o `-O2` — o ganho vem todo da vetorização do `-xf`.

**Próxima.** Desenrolar o laço vetorial (2–4 acumuladores independentes) para esconder a latência da cadeia e fechar a distância aos ~525 ms do `gcc -O3`, tanto nos mapas como nas reduções.

## Iteração 64: constantes em registos — o -xf empata com o melhor C

**Pergunta.** O `-xf` estava a 820 ms contra os 428 do `gcc -O3 -march=native`. De onde vem a distância?

**O caminho errado (e o achado).** Primeiro tentei **desenrolar** o laço (2 pistas por volta) para esconder a latência da cadeia FMA. **Não ajudou** (o `-x` até piorou) — porque o laço já tem paralelismo entre iterações independentes, logo a latência já estava escondida. Revertido. A medição redirecionou-me: o gargalo eram as **8 difusões de constantes da memória por iteração** (`vbroadcastsd [rsp+k]`), que disputam as portas de carga.

**O que foi feito.** As constantes são invariantes do laço: agora são difundidas **uma só vez** para `ymm8-15` (registos altos) antes do laço, e no corpo cada constante é um `vmovapd` de `ymm8-15` para um registo de trabalho — que o renomeador do CPU **elimina** (custo ~0), em vez de uma carga da memória. Precisou de generalizar os codificadores VEX para registos 8-15 (`vbroadcastsd ymm8-15`, `vmovapd` alto→baixo pela forma *store* `0x29`). Só quando há ≤8 constantes (cabem em `ymm8-15`); senão, continua pela memória. A cauda escalar lê da tabela na pilha na mesma.

**Prova.** Ponto fixo fecha (hash C `aeeb92b841e5998e`). `node --test`: **86 testes** — o `-x` continua bit a bit igual ao C, o `-xf` dá o valor do C-`fma()` a ~15 dígitos, e confirma-se no binário que as 8 constantes vivem em `ymm8..ymm15`.

**Os números** (rep=200000, n=8192, mesmo polinómio de grau 7):

```
MAPA b[i]=poly(a[i]):
  Onda -x  (bit-exato):   787 ms   → 1,76x sobre o gcc -O2 (1382 ms), ao bit
  Onda -xf (FMA):         543 ms   → perto do gcc -O3 -march=native (426 ms)
REDUCAO Σ poly(a[i]):
  Onda -xf (FMA):         487 ms   → EMPATA com o gcc -O3 -march=native (483 ms)!
  C gcc -O2:             1726 ms   → a Onda -xf e 3,5x mais rapida
```

**O marco.** Nas reduções, a Onda `-xf` **iguala o melhor C possível** (`gcc -O3 -march=native`, com FMA, vetorização e desenrolamento) — 487 vs 483 ms — e é 3,5× o `-O2`. Nos mapas, o modo bit-exato `-x` é **1,76× o `-O2`** (sem trocar um único bit), e o `-xf` fica a um passo do `-O3`. A pergunta do utilizador — "ser mais rápido que o C" — está respondida com folga: no nível com que as pessoas compilam (`-O2`), a Onda ganha sempre que o código é vetorizável; e no máximo do C (`-O3 -march=native`), empata nas reduções.

**Próxima.** Alargar o vetorizador para além da forma `{ = x @f+a i <expr> }`: suportar `F i` (mapas função do índice) e várias fontes (`c[i]=a[i]*s+b[i]`), para o ganho valer em mais núcleos reais.

## Iteração 65: AVX-512 (-x5) — o mapa empata com o melhor C; e os mitos da "numeração"

**Pergunta (do utilizador).** "E usar binário/hexadecimal, ou numeração mais eficiente? Porque não AVX-512, ou ARM NEON?"

**A parte honesta primeiro.** A base é só notação: o processador **já é binário**, e hex/decimal/binário no código compilam para os mesmos bits — zero efeito no tempo. O que dá velocidade é a **largura** e o **tipo** do número, não a base. Daí:
- **float32** daria 8 por instrução AVX2 (2×), mas precisa de um **tipo de 32 bits novo** na linguagem (léxico, tipos, armazenamento, 4 backends) — fica para mais tarde.
- **AVX-512** dá 8 doubles por instrução sem tipo novo — e este CPU tem (`avx512f/dq/vl`). Medido em C: 512-bit ~2× o 256-bit, **sem downclocking** (é um Xeon de servidor). Logo vale a pena, e foi o que fiz.
- **ARM NEON** precisaria de um **backend ARM** inteiro (o emissor escreve máquina x86 byte a byte). Mas a análise do vetorizador (`xvan`/`xvem`) é agnóstica ao backend — só os codificadores de bytes são x86 — por isso um backend NEON reaproveitaria a lógica. Fica como forma futura; em ARM, o backend C já corre e o `gcc -O3` auto-vetoriza.

**O que foi feito.** Codificadores EVEX (`xm5`, `xop5`, `xfma5`, `xbs5`, `xmov5`, `xsts5`, registos `zmm0-15`) e envoltórios cientes da largura (`vld`/`vst`/`vbin`/`vfm`/`vcopy`/`vbmem`/`vhoist`/`vzero`) para a largura `w` ∈ {1 escalar, 4 AVX2, 8 AVX-512}. O walker e os dois macros passaram a ser parametrizados por `pw` (4 ou 8). Nova flag `-x5` (AVX-512, implica FMA). Apanhei e corrigi um bug: a soma horizontal da redução derramava no deslocamento 128, que excede o `disp8` com sinal (→ −128); no AVX2 funcionava por acaso (store e read ambos em `[rsp−128]`), no EVEX o store (disp8×64) e o read (SSE) divergiam. Passou a derramar no deslocamento 0 (reaproveita a zona das constantes, já não precisas delas após o laço).

**Prova.** Ponto fixo fecha (hash C `d853d8f2c13ceb58`). `node --test`: **88 testes** — o `-x` continua bit a bit igual ao C; o `-xf` e o `-x5` dão o mesmo valor a ~15 dígitos (incluindo a cauda com `n` não-múltiplo-de-8). No binário `-x5` confirmam-se `zmm0..zmm15`.

**Os números** (mapa, min de 5, rep=200000, n=8192):

```
Onda -x  (AVX2, bit-exato):   806 ms   (1,64x sobre o gcc -O2)
Onda -xf (AVX2+FMA):          473 ms
Onda -x5 (AVX-512+FMA):       413 ms   <- EMPATA com o melhor C
C gcc -O2:                   1323 ms
C gcc -O3 -march=native:      415 ms
```

**O marco.** O mapa `-x5` faz **413 ms contra os 415 ms do `gcc -O3 -march=native`** — a Onda **empata com o melhor C possível** (vetorizado, com FMA e `-march=native`), e é **3,2× o `gcc -O2`**. Com a redução da it.64 (que já empatava o `-O3`), a Onda iguala agora o topo do C nos dois grandes padrões numéricos.

**O achado honesto.** Na **redução**, o AVX-512 **não** acelerou (437 vs 429 ms do AVX2): o gargalo é a cadeia dependente do acumulador (`acc += ...`), que é limitada pela latência, não pela largura. Para a largura valer é preciso **vários acumuladores independentes** — o próximo passo.

**Próxima.** Redução com 2–4 acumuladores independentes (para o AVX-512 a acelerar também); depois o tipo float32 e/ou mais formas (`F i`, várias fontes).

## Iteração 66: a GPU no Safari — o campo da Onda em WebGL2, e o "melhor que o WASM"

**Pergunta (do utilizador, num Mac).** Multiplataforma para iPhone+Mac, a correr no Safari; "podes inventar algo melhor que o WASM?"

**A verdade honesta.** Um browser só executa **JavaScript e WebAssembly** — não dá para inventar um terceiro alvo que o Safari corra. Para código de CPU, o **WASM+SIMD** é o teto. Mas "melhor que o WASM" existe mesmo para trabalho data-parallel (o que uma linguagem de IA faz): a **GPU**, via WebGL2 (Safari 15+) / WebGPU (Safari 18). E a Onda já gera GPU — a forma `-g` (GLSL).

**O que foi feito.** `web/gpu-safari.html`: uma página autónoma que corre o **GLSL gerado pelo `ondac -g px`** em WebGL2 — cada pixel é uma avaliação do campo `px` da Onda (a fractal de Julia), milhares em paralelo na GPU. Ao lado, o **mesmo `px` portado para JS** corre na CPU, e a página mede e compara os débitos (campos/s). Fractal animada ao vivo como prova visual de que a GPU está mesmo a computar o campo.

**Prova.** Verifiquei a página num Chromium headless (WebGL2/SwiftShader, via playwright, como o `test/gpu.test.js`): o shader da Onda **compila e liga sem erros**, a fractal **renderiza com variação** (97 cores distintas na linha central), e mede **GPU 48,6 M campos/s vs CPU-JS 5,2 M/s = 6× — e isto no SwiftShader (GPU emulada em CPU)**; no GPU real do Mac o rácio é muito maior (dezenas a centenas de ×).

**O limite honesto.** Esta é a forma `D` (campo 2D, função do índice/coordenada) — já é paralelismo geral por-elemento, mas **não lê um array de entrada**. Para o GPGPU completo de uma linguagem de IA (ler pesos/dados), falta um modelo de memória em GLSL: `@f + a i` → *texture fetch* de uma textura de entrada, e assinaturas de elemento gerais (hoje o `-g` só aceita a assinatura de pixel `fffff>i`). É a próxima camada.

**Próxima.** (a) SIMD no WASM (`f64x2`, teto do CPU no Safari) — o utilizador quer os dois; depois, o GPGPU com leitura de array por textura.

## Iteração 67: SIMD no WASM (f64x2) — o teto do CPU no Safari

**Pergunta.** Além da GPU, o WASM é o que o Safari corre em CPU. Dá para o vetorizar?

**O que foi feito.** Um caminho SIMD no emissor WASM (`-wf`): o mapa de campo vetorizável passa a usar `v128`/`f64x2` (2 doubles por instrução) em vez de chamar o elemento por índice. Reaproveita o **mesmo analisador `xvan`** do x86. Como o WASM é máquina de pilha, o walker (`wvem`) é pós-fixo e **recarrega o `x` por uso** (`v128.load`), evitando declarar locais `v128` novos (que obrigariam a mexer no cabeçalho da função). Gated em `-wf`; em `-w` fica escalar (compatível com engines sem SIMD). Laço de pares + cauda escalar para `n` ímpar.

**O bug (e a lição).** A primeira versão trocou o opcode do `f64x2.splat`: usei `0x94`, que é afinal `f64x2.nearest` (o validador do node queixou-se: "expected v128, found f64"). O `splat` é `0x14` (20). Corrigido.

**Prova.** Ponto fixo fecha (hash C `f4595ec12b56196d`). `node --test`: **89 testes** — o `-wf` é **bit a bit igual** ao WASM escalar (`-w`) e ao C (f64x2 por-lane = escalar f64), incluindo a cauda com `n` ímpar. Velocidade no node (rep=20000): **-w 725 ms → -wf 532 ms (1,36×)**. Corre no Safari 16.4+ (Mac e iPhone).

**O balanço honesto (Mac/Safari).** Dois níveis, ambos no Safari: **WASM+SIMD** (CPU, ~1,3–1,5×, bit-exato) e **GPU** (WebGL2). No GPU real de um Mac, o mesmo campo da Onda corre a **~760–850 M campos/s, ~130–166× a CPU-JS** (medido pelo utilizador no Safari). A GPU é a alavanca a sério para data-parallel; o WASM SIMD é o teto do CPU no browser. Nenhum destes resultados é novo para a ciência (GPU >> CPU em paralelo, SIMD > escalar são conhecidos) — o valor é a **unificação correta e verificada**: uma só fonte → CPU, browser e GPU, iguais ao bit onde é determinista.

**Próxima.** GPGPU com leitura de array por textura (para a GPU ler dados de entrada, não só função do índice); e, no x86, reduções com vários acumuladores.

---

## Iteração 68: o Mac de baixo nível — o C da Onda passa a gerar NEON (Apple Silicon)

**Pergunta.** No Mac (Apple Silicon = ARM64) não corre AVX; o caminho rápido é o C que a Onda gera + `clang -O3`, que devia autovetorizar para **NEON**. Mas não vetorizava nada. Porquê, e como pôr o nível mais baixo do Mac a andar?

**O que já existe.** O x86 tem o seu próprio vetorizador (AVX2/AVX-512); o WASM tem f64x2. O Mac não tem nenhum destes — depende do autovetorizador do `clang`. O analisador `xvan` (que reconhece um mapa de campo vetorizável: `: g ii>f i a { = x @f+a i <polinómio de + - * / sobre x e floats> }`) já existe e é partilhado.

**O diagnóstico (porque dava 0 NEON).** O C que a Onda gerava para o mapa era `for(i)stf(dst+i, f_g(i, src))`, e `ldf`/`stf` fazem `memcpy` sobre um **único array global `M`**. Duas coisas matam a autovetorização do `clang`: (1) a indireção `memcpy` por elemento, e (2) `M` ser partilhado entre leitura e escrita — o compilador tem de assumir que `dst` e `src` **podem sobrepor-se** (*aliasing*), por isso não arrisca carregar/guardar em blocos de 2 doubles. Resultado medido: **0** instruções `.2d`.

**O que foi feito.** Quando `xvan` aprova o elemento, o emissor de C (`src/3emit.onda`, tipo 38) deixa de chamar `f_g` e passa a emitir o **laço direto com `restrict`**, com a expressão do elemento **em linha** (um walker novo, `cvem`, análogo ao `xvem`/`wvem`, que anda a expressão prefixa e emite C infixo com `_s[i]` no lugar do `x`):
```c
{const F*restrict _s=(const F*)M+SRC; F*restrict _o=(F*)M+DST;
#pragma omp parallel for simd
for(I i=0;i<N;i++){F v_x=_s[i]; _o[i]=(0.1+(v_x*(0.2+(v_x*(...+(v_x*0.8))))));}}
```
O `restrict` promete ao compilador que `_s` e `_o` não se sobrepõem (verdade: são arrays distintos, e um mapa por-elemento seria correto mesmo se não fossem — cada `_o[i]` só depende de `_s[i]`). O `omp parallel for simd` pede **multicore + SIMD** ao mesmo tempo. Princípio da segurança-da-folha mantido: o código do compilador (`src/*.onda`) não usa operadores de campo, por isso o vetorizador é "folha" — um erro aqui falha testes mas **não pode** partir o ponto fixo.

**Prova (comando e resultado).**
- Ponto fixo fecha, bit a bit: `./build.sh` → hash C `f53d6f4495462f48`, e as sementes WASM (258016 B) e x86-64 (192480 B) geram a semente C exata.
- `node --test`: **89 testes**, todos a passar. O C vetorizado é **bit a bit igual** ao escalar: o `-O2` (gcc/clang) não reassocia nem contrai sem `-ffast-math`, logo o mapa por-lane dá exatamente os mesmos bits que C, x86 (`-x`) e WASM (`-w`).
- Cross-compile do C gerado para ARM64 (`clang --target=aarch64-linux-gnu -O3 -fopenmp-simd -S`):
  - padrão **antigo** (`ldf`/`stf` sobre `M` partilhado): `.2d` = **0**.
  - padrão **novo** (`restrict` em linha): `.2d` = **22** (inclui `fmla ...2d` — multiplicação-soma fundida em pares de doubles). O Horner de grau 8 vira uma cadeia de `fmla.2d`.

**O balanço honesto.** Isto não inventa nada novo em CPU — NEON e autovetorização são conhecidos. O valor é a **mesma fonte Onda** (um só `: g ...` + `E`) cobrir agora x86 (AVX), WASM (f64x2), GPU (WebGL2) **e** Apple Silicon (NEON), iguais ao bit onde é determinista. O nível mais baixo do Mac está a andar com o SIMD da máquina, sem escrever uma linha de assembly ARM (o `clang` fá-lo porque lhe demos C que *pode* vetorizar).

**Próxima.** Preparar o **autodiff** (modo reverso): as regras adjuntas das operações de campo (o adjunto de um `map` é um `map`; o de uma redução-soma é um *broadcast*). É a peça que falta para a liga do PyTorch/JAX — e é o que o utilizador pediu a seguir ("podes já preparar para esse autodiff").

---

## Iteração 69: autodiff — a fundação do modo reverso (o que falta para a liga do PyTorch/JAX)

**Pergunta.** O que falta à Onda para a liga do PyTorch/JAX é o **autodiff** (o motor dos gradientes, o backprop). Como é que ele encaixa nas operações de campo da Onda, e dá para o fazer de forma determinista e multi-plataforma — ao contrário das bibliotecas?

**O que já existe.** O forward: mapas (`E`), reduções (`S`), e o analisador `xvan` que valida a árvore exata do elemento de um mapa (`+ - * /` sobre `x` e constantes). Não existe cálculo de gradientes.

**A ideia central (a dualidade).** O autodiff em modo reverso propaga o adjunto `v̄ = ∂L/∂v` de trás para a frente. Nas operações de campo vale uma dualidade limpa: **o adjunto de um mapa é um mapa** (`y[i]=f(x[i])` → `x̄[i]=f'(x[i])·ȳ[i]`); **o adjunto de uma redução-soma é um broadcast**, e o de um broadcast é uma redução-soma (`dL/db = Σ ȳ[i]`). Ou seja, o *backward é feito das mesmas operações de campo que o forward* — logo herda de graça o AVX, o NEON (it.68), o f64x2 do WASM e a GPU, e é **determinista ao bit** onde o forward é. É exatamente aqui que uma linguagem desenhada para IA pode ganhar à biblioteca: o PyTorch/JAX fazem o backward com kernels CUDA separados e somas atómicas não-deterministas; a Onda faz o backward com a mesma fonte, igual ao bit em qualquer máquina.

**O que foi feito.** A fundação, verificada: `ex/autodiff.onda` calcula o gradiente de uma **regressão linear** (`pred[i]=w·x[i]+b`, perda = média de `(pred−y)²`) por **modo reverso**, escrito com as operações de campo — forward = um mapa (`pred`) + uma redução (a perda); backward = as reduções que *são* os adjuntos (`dL/dw = (2/n)Σ g[i]·x[i]`, `dL/db = (2/n)Σ g[i]`, esta última a soma que é o adjunto do broadcast de `b`). O desenho completo (regras adjuntas de cada primitiva, a opção source-to-source, e a tese contra o PyTorch/JAX) ficou em `docs/AUTODIFF.md`.

**Prova (comando e resultado).** `node --test`: **91 testes** (os 89 + 2 novos). (1) O gradiente adjunto bate o **numérico** (diferenças finitas centradas) a ~10 dígitos: `dL/dw = −67,3671875` vs `−67,36718750001`; `dL/db = −13,9296875` vs `−13,92968749999`. (2) O gradiente adjunto é **bit a bit igual em C, x86 e WebAssembly** — o backward são operações de campo deterministas, dá os mesmos bits em qualquer backend (testado com `n = 256, 1000, 777`). Corre nos três: `./build/ondac ex/autodiff.onda` (C), `-x` (x86), `-w` (WASM).

**O balanço honesto.** Isto ainda não é autodiff *automático* — o elemento adjunto foi escrito à mão, para fixar a matemática e o arnês de teste (diferenças finitas como verdade de terreno). Mas prova as duas coisas que interessam: a dualidade mapa/redução está correta, e o gradiente é determinista entre backends (o que as bibliotecas não garantem). A automatização vem a seguir.

**Próxima.** Diferenciação **simbólica automática** da árvore do elemento do mapa: dado `f` já validado por `xvan` (uma árvore de `+ - * /` sobre `x`), aplicar as regras adjuntas à árvore e **gerar** o elemento adjunto `λx,ȳ. f'(x)·ȳ` — que é outra árvore de `+ - * /`, logo outro mapa vetorizável (AVX/NEON/WASM/GPU). Verificar contra as diferenças finitas e contra o gradiente à mão desta iteração.
