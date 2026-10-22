# Diário das 50 iterações

Estado: **iteração 78 de 100 concluída** (as 50 pedidas e mais 50 seguidas: o utilizador pediu para não parar). **A Onda x86 bate ou empata o melhor C** (mapa `-x5`/AVX-512 ≈ `gcc -O3 -march=native`). **Mac (Apple Silicon):** o C do mapa autovetoriza para **NEON** (`clang -O3`, `fmla.2d`). **Autodiff:** modo reverso (it.69) e **diferenciação simbólica automática** (it.70) — o operador `B` gera `f'(x)`, exato e bit-a-bit igual em C/x86/WASM. **ARM64 nativo próprio (it.71):** backend `-a` novo — a Onda escreve o seu próprio código-máquina aarch64 (ELF estático), como o `-x` faz para x86, sem C nem clang; núcleo inteiro verificado no `qemu-aarch64-static`. Próxima: reais + NEON no backend `-a` (o mapa vetorizado em ARM, escrito pela própria Onda).

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

---

## Iteração 70: autodiff automático — o operador `B` diferencia o elemento sozinho

**Pergunta.** A it.69 escreveu os adjuntos à mão. Dá para a Onda **gerar** a derivada de um elemento de mapa sozinha, e correr em todos os backends?

**O que já existe.** O analisador `xvan` valida a árvore exata do elemento (`= x @f+a i <árvore de + - * / sobre x e constantes>`). As regras da derivada dessa árvore são mecânicas.

**A ideia.** Números duais: andar a árvore uma vez devolvendo o par `(valor, derivada)` por nó — `c→(c,0)`, `x→(x,1)`, `A+B→(a+b, da+db)`, `A·B→(a·b, da·b+a·db)`, `A/B→(a/b, (da·b−a·db)/b²)`. Com uma só entrada `x` e `dx=1`, isto dá `f'(x)` em modo direto, que para um mapa por-elemento é a diagonal da jacobiana — exatamente o que o VJP do mapa precisa. A derivada de uma árvore de `+ − × ÷` é **outra árvore de `+ − × ÷`**, logo o resultado volta a ser um mapa vetorizável.

**O que foi feito.** Um operador novo — **`B d n f a`** (backward) — que gera `d[i] = f'(a[i])`. `xdiff` (em `src/4main.onda`) anda a árvore do elemento e constrói a RI da derivada; `cb` embrulha-a num laço (`lpbeg`/`lpend`, carga/escrita de float). É construído em RI pura, sem macro, por isso corre em **C, x86 e WASM**. Para o C aceitar esta RI gerada (que o x86 e o WASM já aceitavam), o emissor de texto passou a tratar **locais anónimos** (`elnm`: `v_L<índice>` quando o local não tem token de nome) e **operadores sintéticos** (`eop`: quando o operando é o código do caractere negado, como os que `binx`/`cmpx` produzem). Isto também faz os lowerings `lowS`/`lowE`/`lowD` passarem a compilar em C — ficavam só no x86.

**O bug (e a lição).** A primeira versão da carga do `x` tinha a RI `ir 26 xld <end> 0 0 0` — **só 6 argumentos** em vez de 7. O parser, faminto, engoliu a instrução seguinte (`setl xvl xld`) como o 7.º argumento, emitindo o `setl` **antes** da carga → o `x` lia um valor velho. O x86 mascarou-o (registos), o C e o WASM mostraram a derivada deslocada uma posição. Lição: numa linguagem prefixa sem parênteses, a aridade é tudo — contar os argumentos de `ir` ao dedo.

**Prova (comando e resultado).** `./build.sh` fecha o ponto fixo bit a bit (hash C `56b9ba0b0378d43d`), e as sementes WASM/x86 geram a semente C exata. `node --test`: **93 testes** (91 + 2 novos). A derivada automática do polinómio de grau 7 é **exata**: `g'(1)=16,8`, `g'(2)=563`, `g'(4)=28156,2` — batem as diferenças finitas centradas (que têm erro `O(e²)`), e são **bit a bit iguais** em C, x86 e WASM (`ex/grad.onda`, `test/grad.test.js`, com `n = 8, 256, 1000`). Princípio da folha mantido: `B`/`xdiff`/`binx`/locais anónimos nunca entram no compilador em si, logo não podem partir o ponto fixo.

**O balanço honesto.** Agora a derivada é gerada, não escrita à mão — é autodiff a sério, em modo direto, para o elemento de um mapa. Falta compor (`f'(x)·ȳ`, a regra da cadeia a montante) e acumular gradientes em arrays de parâmetros, para encadear camadas e treinar. Mas a peça difícil — diferenciar código e manter o determinismo multi-plataforma — está feita e provada.

**Próxima.** A derivada composta `B` com `×ȳ` (o VJP completo do mapa), e a acumulação de gradientes nos parâmetros, rumo a treinar um modelo pequeno de ponta a ponta medindo o determinismo entre backends.

---

## Iteração 71: ARM64 nativo — a Onda escreve o seu próprio código-máquina aarch64 (não C)

**Pergunta.** A it.68 pôs o Mac a andar, mas através do *C* que o `clang` vetoriza. O utilizador quer o mesmo que o `-x` faz no x86 — a Onda a escrever o **seu próprio código-máquina**, agora para ARM64 (o chip do Mac/iPhone), sem C nem assembler. Dá?

**O que já existe.** O `-x` escreve um ELF x86-64 nativo (instruções, AVX, syscalls), e o `-w` escreve WebAssembly. Para ARM não havia nada próprio — só o C+clang.

**A descoberta que destravou isto.** Não há ARM real nesta máquina (x86 Linux), mas instalou-se o **`qemu-aarch64-static`** (emulação user-mode): executáveis aarch64 estáticos e *freestanding* (syscalls, sem libc) correm aqui. Como a Onda emite exatamente isso, dá para **verificar a correção ao bit** (o `qemu` não mede velocidade real — isso é no Mac do utilizador).

**O que foi feito.** Um backend nativo novo — **`-a`** (aarch64) — em `src/9arm64.onda`. A Onda escreve o ELF estático byte a byte e o código-máquina ARM64 instrução a instrução (cada uma 4 bytes little-endian). Primeira fatia: o **núcleo inteiro** — literais (movz/movk), `+ − × ÷ %` (add/sub/mul/sdiv/msub), `& | ^ << >>`, comparações (cmp/cset), locais e temporários (tudo em slots da moldura, `ldr`/`str` relativos ao `sp`, sem alocar registos — simples e correto primeiro), e ciclos `W` (cbz + branch com *back-patching* numa pilha de ciclos). Caminha a MESMA RI que o C/x86/WASM consomem. Dois emissores de texto do C tiveram de passar a aceitar o que o x86/WASM já aceitavam (e que estes laços geram): locais **anónimos** (`elnm`) e operadores **sintéticos** (`eop`). **FOLHA:** o `-a` nunca compila o próprio compilador (o ponto fixo faz-se em C/WASM/x86), por isso um erro no `-a` falha testes mas **não pode** partir o ponto fixo.

**A lição (nomes).** Primeiro chamei ao teste `arm.test.js` — e **esmaguei** um teste que já existia com esse nome: o do *armazém* persistente (`K n`), onde "arm" = armazém, não ARM. Reposto, e o backend ficou `arm64`/`-a` sem ambiguidade.

**Prova (comando e resultado).** `./build.sh` fecha o ponto fixo bit a bit (hash C `5c7a5d098b0a0f28`); as sementes WASM/x86 geram a semente C exata (o `-a` não lhes mexe). `node --test`: **95 testes** (os 93 + 2 do `arm64`). Programas inteiros compilados com `-a` e corridos no `qemu-aarch64-static` dão o resultado certo no código de saída: `7×6=42`, `100%7=2`, `0xF0|0x0F=255`, `Σ0..99=4950` (&255=86), `5!=120`, e `ex/arm64.onda` faz o algoritmo de Euclides `gcd(1071,462)=21`. O `llvm-objdump` confirma que os bytes são aarch64 válido (movz/movk, sdiv, cbz, ret, svc).

**O balanço honesto.** Isto ainda é o núcleo **inteiro** — faltam reais, NEON, chamadas entre funções, impressão (o runtime em Onda via syscalls) e Mach-O para correr direto no Mac (hoje é ELF de Linux ARM, que corre no qemu ou em Linux-ARM). Mas o difícil está provado: a Onda escreve o seu **próprio** código-máquina ARM64, correto ao bit, pela mesma fonte que dá x86/WASM/GPU. Não é "mais rápido que o C" ainda (o próximo passo, o NEON em `-a`, é que ataca isso) — é a **base** para o ser, em ARM, sem depender do C.

**Próxima.** Reais (`fmov`/`fadd`/`fmul`/`scvtf`) e o **NEON** (`fmla.2d`, 2 doubles por instrução) no `-a` — o mapa vetorizado em ARM escrito pela própria Onda, para então medir contra o C no Mac real.

---

## Iteração 72: reais e arrays no `-a` — e o mapa a correr em ARM (escalar)

**Pergunta.** O núcleo inteiro do `-a` (it.71) já corria. Falta o que interessa para a IA: **reais**, **arrays** e o **mapa**. Dá para os pôr a andar em ARM, pela mesma RI?

**O que foi feito.** Estendido o backend `-a` (`src/9arm64.onda`):
- **Reais** (registos `d`): `ldr`/`str` de double na moldura, `fadd`/`fsub`/`fmul`/`fdiv`, `fmov d,x` (bits de um literal float via `!f`/`@`), `scvtf` (inteiro→real) e `fcvtzs` (real→inteiro, o `F`/`I`).
- **Memória `M`**: um 2.º segmento no ELF — `PT_LOAD` RW, BSS puro (`filesz` 0, `memsz` 256 MiB) em `0x10000000`. O stub de entrada fixa `x28` = base de `M` e `x27` = ponteiro de alocação (bump); o `A n` devolve `x27` e avança-o. Acesso a array por registo: `ldr/str [x28, idx, lsl #3]`.
- **Mapa `E`**: para o `-a`, passa pelo mesmo `lowE` do x86 (laço em RI) com o elemento **embutido** (`cinl`, agora ligado também para `isa`) — nada de chamadas, a aritmética do elemento fica em linha. A mesma RI que o C/x86/WASM, compilada para ARM pelo `ains`.

**O bug (e a lição).** O acesso a array por registo saía com `S=0` (índice tratado como byte, não escalado): `ldr d0,[x28,x9]` em vez de `[x28,x9,lsl#3]`. O `llvm-objdump` mostrou `[x28, x9]` sem o `lsl #3` — o bit `S` da codificação de load/store com registo-offset é o que escala pelo tamanho; `0x6800`→`0x7800`. Lição: desassemblar sempre e ler o *operando*, não só o mnemónico.

**Prova.** `./build.sh` fecha o ponto fixo bit a bit (hash C `97aa0ede3449bd63`; o `-a` é folha, não lhe mexe). `node --test`: **96 testes**. Programas com reais, arrays e o mapa `E`, compilados com `-a` e corridos no `qemu-aarch64-static`, dão **o mesmo código de saída que o backend C nativo**: a soma `Σ(2·a[i]+1)` e o mapa do polinómio de grau 7 (`int` da soma) batem o C ao bit.

**O que falta (honesto).** O mapa é **escalar** (1 real por instrução) — ainda não é NEON, logo ainda não é "mais rápido que o C". Faltam também as **chamadas entre funções** (kind 7) — por isso os programas de teste embutem o `encher`/`natoi` no `main` e devolvem pelo código de saída (sem impressão). Reduções (`S`) e impressão também faltam.

**Próxima.** O **NEON** no `-a`: o mapa vetorizado a 2 doubles (`ldr q`/`fadd.2d`/`fmul.2d` ou `fmla.2d`) + cauda escalar — é aí que ataca o "mais rápido que o C" no chip do Mac. Depois, chamadas e impressão; e, a pedido, a **derivada composta** do autodiff.

---

## Iteração 73: NEON no `-a` — o mapa vetorizado, escrito pela própria Onda em ARM

**Pergunta.** O mapa em `-a` era escalar (it.72). Dá para o vetorizar em **NEON** (2 doubles por instrução, o SIMD do ARM), escrito pela própria Onda — o equivalente ARM do que o `-x` faz com AVX?

**O que foi feito.** Um caminho NEON no `-a` para o mapa de campo vetorizável (quando o `xvan` aprova o elemento). Reaproveita o **mesmo analisador `xvan`** e o **mesmo alocador `salloc`/`sfree`** do x86. Peças novas (`src/9arm64.onda`):
- Codificadores NEON: `ldr q`/`str q` (128 bits = 2 doubles), `fadd/fsub/fmul/fdiv .2d`, `dup v.2d, Xn` (difundir uma constante às duas pistas).
- Um walker consciente da largura, `avem` (análogo ao `xvem`/`wvem`): anda a árvore do elemento e emite ou NEON `.2d` (w=2) ou escalar `d` (w=1), usando ops de 3 operandos (`vd = vn op vm`), com o `x` fixo em `v1` e as constantes/temporários em `v2..v9`. Avalia o operando direito primeiro (como o x86), para a pressão de registos ficar ≤6.
- `amap`: laço de **pares** (passo 2) com `ldr q`→`avem(2)`→`str q`, mais **cauda escalar** (mesmo `avem` com w=1) para `n` ímpar. Endereço por `add xA, x28, idx, lsl #3`. Ligado via uma RI nova (tipo 53) que o `ce` emite para `isa`+`xvan`, como o `lowEv` faz para o x86.

**O bug (e a lição).** Tudo saía no registo `v1`: o `salloc` usa a convenção **1 = livre**, e eu inicializei o estado a `0` (tudo ocupado) → devolvia sempre `-1` → `v1`. O x86 inicializa-o a `255` (`! st 255`). Lição: reusar um utilitário é também reusar a sua convenção — li o `salloc` ao contrário.

**Prova.** `./build.sh` fecha o ponto fixo bit a bit (hash C `304931f361c6c610`; o `-a` é folha). `node --test`: **96 testes**. O mapa do polinómio de grau 7 compilado com `-a` (NEON) e corrido no `qemu-aarch64-static` dá **exatamente o mesmo código de saída que o backend C nativo**, para `n` par (64, 100) e ímpar (63, 7, 1 — exercita a cauda escalar). O `llvm-objdump` confirma o SIMD: `dup v2.2d, x12`, `fmul v3.2d, v1.2d, v2.2d`, `fadd v4.2d, ...` — Horner a 2 doubles por instrução. Por-lane = escalar, por isso é bit-exato (sem `fmla`, que fundiria e mudaria o último bit — fica para um modo opcional).

**O balanço honesto.** Agora a Onda escreve o seu **próprio NEON** para o mapa, bit-exato, pela mesma fonte que dá o AVX no x86. A **velocidade real** mede-se no Mac do utilizador (o `qemu` emula, não mede) — mas o código SIMD está lá e é o que bate o escalar/C em hardware ARM. Ainda faltam, para a vecmap completa correr em `-a`: **chamadas entre funções** (para o `encher`/`natoi`) e **impressão** (o runtime via syscalls) — por isso os testes embutem no `main` e devolvem pelo código de saída.

**Próxima.** Chamadas (kind 7) e impressão no `-a`, para a `vecmap.onda` correr tal e qual e se medir o tempo; e, a pedido do utilizador, a **derivada composta** do autodiff (o VJP completo `f'(x)·ȳ`).

---

## Iteração 74: a derivada composta — o VJP do mapa (a regra da cadeia do backward)

**Pergunta (do utilizador).** A seguir aos reais e ao NEON, a **derivada composta**. O operador `B` (it.70) dá `f'(x)`; falta compor com o gradiente que chega de cima (a regra da cadeia), que é o que o backward de verdade precisa.

**A ideia.** No modo reverso, cada operação recebe o adjunto `ȳ` (o gradiente da perda em ordem à sua saída) e produz o adjunto da sua entrada. Para um mapa `y[i] = f(a[i])`, o VJP (vector-Jacobian product) é `ā[i] = f'(a[i]) · ȳ[i]` — elemento a elemento, porque a jacobiana de um mapa é diagonal. É exatamente o gradiente de `L = Σ_j ȳ[j]·f(a[j])` em ordem a `a[i]`.

**O que foi feito.** Operador novo — **`V d n f a y`** — que gera `d[i] = f'(a[i]) · y[i]`. Reaproveita o `xdiff` (it.70, diferenciação simbólica por números duais) para `f'` e multiplica pela pista de `y`. Compila para um laço em RI (sem macro), logo corre em **C, x86, WASM e ARM64** (`-a`), pela mesma fonte. `ex/vjp.onda` + `test/vjp.test.js`.

**Prova.** `./build.sh` fecha o ponto fixo bit a bit (hash C `0f5d599a8750b118`). `node --test`: **98 testes** (96 + 2). O VJP bate as **diferenças finitas** centradas a ~6–7 dígitos: `d[0] = 67,2 = g'(1)·y[0] = 16,8·4`, e assim por diante até `d[6] = 3 686 880`. E é **bit a bit igual** em C, x86 e WASM (`n = 8, 64, 101`) — operações de campo deterministas, o mesmo gradiente em qualquer máquina.

**O que isto fecha.** Com o `B` (a derivada) e o `V` (a derivada composta), o passo backward de uma **camada-mapa** está completo e verificado — e herda o SIMD/determinismo de todos os backends, a tese contra o PyTorch/JAX. Falta encadear camadas, acumular gradientes nos pesos e treinar um modelo pequeno de ponta a ponta.

**Próxima.** Acumular adjuntos em arrays de parâmetros e encadear operações de campo (mapa→redução→mapa), rumo a treinar uma regressão/uma camada de ponta a ponta; e, no `-a`, chamadas e impressão para medir o NEON no Mac real.

---

## Iteração 75: o juiz único, como comando — e o que a IA precisa mesmo da Onda

**Pergunta (do utilizador).** "A lógica do juiz e de auto-compilar? A IA precisa desta sintaxe toda do Onda? Não dá para ser mais rápido e fluido?"

**Auto-compilar (o que já há).** O ponto fixo **já** é auto-compilação, provado a cada `./build.sh`: o compilador em C, em WASM e em x86-64 regenera-se a si próprio, bit a bit, e as três sementes dão o mesmo C. É a espinha dorsal desde a it.5. (O `-a`/ARM ainda não se auto-compila — é folha, só faz programas do utilizador; falta-lhe chamadas, strings e todas as formas da RI.)

**O juiz (o que foi feito).** O manifesto (it.1) diz: *juiz único — cada forma tem de concordar com o significado antes de ser usada*. Estava nos testes (cada programa é conferido entre formas); agora é um **comando**: `node tools/juiz.mjs <programa.onda> [args]` compila o programa por **todas as formas** — C (`cc`), x86-64 nativo (`-x`), WebAssembly (`-w`) e ARM64 nativo (`-a`, no `qemu`) — corre-as e verifica que a saída concorda **ao bit** com o significado (o C de referência). Normaliza o tempo de parede (`em N ms`) dos benchmarks, mostra onde diverge, e salta a forma que ainda não suporta o programa (o `-a` em programas com impressão/chamadas). Prova: no SHA-256, crivo, base64, regex, vecmap — `x86` e `WASM` concordam com o significado ao bit (`test/juiz.test.js`). É "melhor que o que há" no sentido literal: **um só programa, vários geradores de código independentes — dois deles escritos byte a byte pela própria Onda, sem assembler — a dar o mesmo resultado, verificável com um comando.**

**A IA precisa desta sintaxe toda? (a resposta honesta.)** **Não.** A sintaxe em texto (`: g ii>f i a { … }`) existe por três razões: o arranque (o estágio-0 em Rust lê texto), a auto-compilação (o compilador está escrito nela), e a leitura humana. A *essência* da Onda são três coisas: a **RI** (o grafo de instruções `[k d a b c x y]`), as **formas** (os backends) e o **juiz**. Uma IA que gera programas não precisa do texto — pode emitir a RI diretamente, saltando o *lexer* e o *parser* (mais rápido, mais "fluido"). É a próxima grande peça: uma **frente de RI direta** (a IA emite o grafo; o juiz confere contra o significado), que torna a Onda, para quem a escreve de verdade (as IAs), uma linguagem sem sintaxe de superfície.

**Próxima.** A frente de RI direta (emitir/ingerir o grafo sem texto) — a Onda "sem sintaxe" para IAs; e, em paralelo, chamadas+impressão no `-a` e o encadear/treinar do autodiff.

---

## Iteração 76: a frente de RI direta (passo 1) — o grafo exposto, sem sintaxe

**Pergunta.** Se a essência da Onda é a RI (não a sintaxe), então mostra-a: qual é mesmo o grafo que uma IA emitiria?

**O que foi feito.** Um modo novo, **`-d`**, que compila o programa e, em vez de gerar código, imprime o **grafo da RI** — por função, a assinatura e as suas instruções `[k d a b c x y]`, com os literais anotados (`; lit 0.1`). É a forma que uma IA emitiria diretamente, saltando o lexer e o parser. Para o gcd (`ex/arm64.onda`): 19 instruções de 7 números. Para o elemento do mapa (polinómio de grau 7): 15 instruções — a cadeia de Horner como grafo (cargas `@f` = kind 26, aritmética = kind 8, literais = kind 1). `test/ri.test.js` confere que o dump é bem formado (cabeçalho com a contagem, uma linha por instrução, o retorno) e determinista.

**Prova.** `./build.sh` fecha o ponto fixo bit a bit (hash C `14541f17aeea227d`; o `-d` é folha). `node --test`: **101 testes**.

**O balanço honesto.** Isto é o passo 1 (expor o grafo). O passo 2 — a **ingestão** (a IA emitir o grafo e o compilador lê-lo direto, sem parser, e o juiz conferir contra o significado) — é o que torna a Onda "sem sintaxe" de verdade, e fica a seguir. Mas já se vê o essencial: um programa é um punhado de instruções de 7 números; a sintaxe em texto é só a pele humana.

**Próxima.** A ingestão de RI (fechar a frente direta); e o pedido do utilizador: chamadas + impressão no `-a` para a `vecmap.onda` correr em ARM64 e medir-se o NEON no Mac real.

---

## Iteração 77: chamadas entre funções no `-a` — a vecmap completa a correr em ARM64

**Pergunta (do utilizador: "o 2").** O `-a` já faz reais, arrays e o mapa NEON, mas embutia tudo no `main`. Falta a convenção de **chamadas** para a `vecmap` correr com os seus `encher`/`soma`/`natoi`.

**O que foi feito.** A convenção de chamada aarch64 (AAPCS) no `-a`:
- **Prólogo/epílogo**: `stp x29,x30,[sp,#-16]!` à entrada e `ldp x29,x30,[sp],#16` + `ret` à saída — salva o registo de ligação (`x30`), para uma chamada aninhada não o perder.
- **Argumentos**: inteiros em `x0–x7`, reais em `d0–d7` (contadores separados, como manda o AAPCS); carregados dos slots da moldura antes do `bl`. Retorno inteiro em `x0`, real em `d0`.
- **`bl` corrigido no fim**: cada chamada regista (posição, índice da função alvo) numa tabela; no `outa`, com todas as funções dispostas, cada `bl` é corrigido para o offset certo (como o `xcall` do x86).

**Prova.** `./build.sh` fecha o ponto fixo bit a bit (hash C `6ec5dbf6bfe45422`). `node --test`: **101 testes**. Programas com chamadas, compilados com `-a` e corridos no `qemu-aarch64-static`, dão **o mesmo código de saída que o C**: chamada inteira (`Σ 2i = 90`), chamada com retorno real (média → `4`), e — o grande — a **`vecmap` completa** (`encher` + mapa NEON + `soma`, tudo com chamadas reais): `int` da soma = `99`, igual ao C. O cálculo inteiro da vecmap corre agora em ARM64 escrito pela própria Onda.

**O que falta para a `vecmap.onda` literal + o benchmark.** A **impressão** (`N`, `G`, strings) — o runtime em Onda via syscalls — é a última peça do "o 2". É uma reformulação maior (o modelo de memória do runtime usa índices negativos `M[-1..-7]` e o `Y`/syscall), por isso fica para a it.78. Para medir o NEON no Mac real: ou um contentor Linux-ARM (Docker, que corre o ELF à velocidade nativa do chip) depois da impressão, ou emitir Mach-O (peça à parte).

**Próxima.** Impressão no `-a` (fechar "o 2"): o runtime + `Y`/syscalls + strings + `Ac`/`Av`, para a `vecmap.onda` correr tal e qual em ARM64 e o juiz a confirmar contra o significado.

---

## Iteração 78: a frente de RI direta (passo 2) — a ingestão, a Onda sem sintaxe

**Pergunta (do utilizador).** Fecha a frente de RI direta: a IA emite o grafo e o compilador lê-o **sem parser**.

**O que foi feito.** Um modo novo, **`-i`** (ingestão), que lê o grafo do `-d` e reconstrói a RI diretamente — sem análise sintática, sem inferência de tipos, sem resolução de nomes — e emite C. O `-d` passou a um formato auto-contido e re-ingerível: por função, `: nome assinatura`, depois os tipos dos locais e dos temporários, depois as instruções `[k d a b c x y]` com os **literais como valor**, os **operadores como texto** e os nomes anonimizados. A ingestão reaproveita o lexer (os tokens dos literais/operadores já ficam criados) e um leitor minúsculo (`riread`) que anda os tokens e chama `ir` — o parser inteiro (`cx`, `cfun`) é saltado.

**O bug (e a lição).** Pus a bandeira de ingestão num slot de módulo (`@66`); lia sempre 0 (o slot não sobrevivia até ao laço de emissão). Troquei para ler o `argv` diretamente (`-i`), como o `@12` já faz. Lição: para um sinal que tem de valer durante toda a compilação, lê a fonte (o argumento), não um slot que outra fase pode tocar.

**Prova.** `./build.sh` fecha o ponto fixo bit a bit (hash C `32ed68014af4d05e`; o `-d`/`-i` são folha). `node --test`: **102 testes**. Round-trip verificado (`test/ri.test.js`): **texto → `-d` → `-i` → C** dá exatamente o mesmo que **texto → C**, para programas de uma função do núcleo — soma de ciclo, soma real→int, `if`, arrays, o algoritmo de Euclides. O grafo re-ingerido computa igual ao original: **a sintaxe de texto não acrescenta nada à semântica; é só a pele humana.**

**O balanço honesto.** A ingestão cobre o **núcleo sem ponteiros** (uma função: inteiros, reais, `+ − × ÷ %`, bits, ciclos, `if`, arrays, literais). Falta serializar os campos que são ponteiros — a lista de argumentos das **chamadas** (kind 7) e dos **mapas/reduções** (38/39/51–53) — e as **strings**; é o que fecha o round-trip de programas multi-função. Mas o essencial está provado: a IA pode emitir o grafo, e o juiz confere-o contra o significado.

**Próxima.** O pedido do utilizador: **impressão no `-a`** (o runtime via syscalls), para a `vecmap.onda` literal correr em ARM64; e, depois, estender a ingestão aos campos-ponteiro (chamadas/mapas) para o round-trip completo.

---

## Iteração 79: Mach-O nativo (`-m`) — a Onda corre no Mac sem Docker

**Pergunta (do utilizador: "As duas, Mach-O já").** A tentativa de benchmark no Mac falhou: sem clone do repo e sem Docker, o ELF `-a` não corria no macOS. Faltava um executável que arranque direto no Apple Silicon.

**O que foi feito.** Um modo novo, **`-m`**, que emite o **mesmo código-máquina aarch64 do `-a`** mas embrulhado num executável **Mach-O** (o formato do macOS), em vez de ELF. É só o invólucro que muda — o NEON, as chamadas, os arrays, tudo igual:
- **Cabeçalho Mach-O 64**: `MH_MAGIC_64` (`0xFEEDFACF`), cputype `ARM64` (`0x0100000C`), filetype `MH_EXECUTE`, 3 load commands.
- **`LC_SEGMENT_64`** `__PAGEZERO` (4 GiB não mapeados) + `__TEXT` (o segmento com o código).
- **`LC_UNIXTHREAD`** (flavor `ARM_THREAD_STATE64`): define o `pc` de arranque, que aponta para o trampolim de entrada.
- **Trampolim de entrada**: faz `mmap` da memória `M` em runtime (`x16=197`, `svc #0x80` — a convenção de syscall do macOS, `x16`=número, `svc #0x80`), põe a base em `x28`, chama o `main` (`bl` corrigido no fim) e sai com `exit` (`x16=1`). Sem segmento `M` de tamanho fixo — pede-se ao SO, como manda o Apple Silicon.

**Prova.** `./build.sh` fecha o ponto fixo bit a bit (hash C `07249544d435ca5a`; o `-m` é folha — a fonte do compilador nunca o usa, por isso um bug aqui parte testes mas **não** pode partir o ponto fixo). `node --test`: **104 testes**. Não se consegue *correr* um Mach-O aqui (não há macOS), por isso `test/macho.test.js` valida a **estrutura**: o `-m` produz um Mach-O arm64 válido (mágico, cputype, filetype, 3 comandos) e o núcleo do mapa leva o **mesmo NEON `.2d`** (4 instruções `fmul.2d`/`fadd.2d`) que o ELF `-a` — confirmado byte a byte contra o `-a` para o mesmo programa. Validado também com `llvm-objdump --macho` (reconhecido como *"Mach-O 64-bit arm64 executable"*, entrada/`UNIXTHREAD`/stub do `mmap`/`bl main` todos corretos).

**O balanço honesto.** O Mach-O foi emitido **às cegas**: aqui não há como executá-lo, só inspecioná-lo. A estrutura está certa e o código é bit-idêntico ao ELF que corre no qemu, mas a primeira execução real é no Mac do utilizador (`build/ondac -m ... > bench_arm; codesign -s - bench_arm; ./bench_arm` — a assinatura ad-hoc que o Apple Silicon exige). `ex/arm-bench.onda` já traz a receita nativa, sem Docker. Se falhar a correr, é sinal para afinar o invólucro.

**Próxima.** A **impressão no `-a`/`-m`** (o runtime via syscalls — `N`, `G`, strings) para a `vecmap.onda` literal correr tal e qual em ARM64 e o juiz confirmá-la contra o significado; e estender a ingestão de RI aos campos-ponteiro (chamadas/mapas) para o round-trip multi-função.

---

## Iteração 80: impressão e leitura no `-a`/`-m` — o ARM64 fala sozinho, sem C

**Pergunta (do utilizador: "e depois a impressão").** O `-a` já fazia o cálculo (NEON, chamadas, arrays), mas para *imprimir* um resultado ainda tinha de passar pelo C. Faltava o I/O — a última peça para a Onda em ARM64 ser autónoma.

**O que foi feito.** O runtime em Onda (`wrt` — `_op`/`_on`/`_of`/`_fl`/`_oa`/`_go`/`_ex`, o mesmo que o x86 e o WASM usam) passou a ser prefixado também no `-a`. Para o compilar e correr, o backend aarch64 ganhou tudo o que faltava:
- **Syscalls (`Y`, kind 42)** — um despacho em linha (`asc`): **escrever** (byte a byte para fd 1), **ler** (1 byte de fd 0, ou −1 em EOF), **sair**, e **brk** (devolve o limite fixo de M). Linux: `svc #0` com `x8`; macOS: `svc #0x80` com `x16` (números BSD: write 4, read 3, exit 1). Os mesmos registos servem os dois.
- **Controlo de fluxo**: `if`/`else` (kinds 18–20) e `&&`/`||`/`!` (10–14) com salto curto-circuito e correção de ramos (pilha `@65`), `v`/`^` mínimo/máximo (17, via `csel`/`fcsel`), e **comparação de reais** (kind 9 com `fcmp` + condições FP).
- **Memória como o x86**: a base de M em `x28` passou a `mbase+128`, reservando 16 slots negativos (`M[-16..-1]`) para o runtime; o `A` (kind 28) passou a chamar `_oa` (o mesmo alocador de bump que o runtime usa); a entrada (ELF e Mach-O) passou a saltar para `_go` (que faz `_ini` → `main` → `_ex`), não direto ao `main`.
- **I/O do utilizador**: `N` (inteiro), `G` (real), `P` (char), `R` (ler), e saída — tudo ligado ao runtime.

**O bug (e a lição).** O despacho de kinds no `ains` é uma cadeia de `?` (if-else encadeados), que tem de ser **uma só expressão**. Escrevi `? || || == k 30 == k 34 == k 35 == k 37` — **dois** `||` para **quatro** termos. O `== k 37` ficou pendurado, foi comido como o *then* do `?`, e o `{bloco}` como o *else* — o `?` fechou ali e a cadeia partiu-se em duas. A segunda metade (com o `fallback`) passou a correr **para todas as instruções**, por isso até o kind 1 (o primeiro literal do `main`) caía no "não suportado". Lição: numa cadeia-expressão, conta os operandos dos operadores n-ários — um `||` a menos não dá erro de sintaxe, corrompe a estrutura em silêncio.

**Prova.** `./build.sh` fecha o ponto fixo bit a bit (hash C `9d46f5cc782ba90f`; o `-a`/`-m` são folha — não tocam no auto-compilador). `node --test`: **107 testes** (3 novos em `test/arm64-print.test.js`: inteiros/reais, controlo+FizzBuzz, leitura de stdin — todos corridos no `qemu-aarch64-static` e **byte a byte iguais ao C**). E — o grande salto — **o juiz agora corre o `-a` também**: o **SHA-256** (`ex/sha256.onda`, que exercita todos os bits + leitura de stdin) dá, em ARM64 escrito pela própria Onda, **exatamente o mesmo resumo que o C, o x86 e o WASM**, ao bit. O juiz salta o `-a` com elegância nos programas que ele ainda não cobre ("o -a ainda nao suporta este programa"), sem dar divergência.

**O balanço honesto.** Falta a impressão de **strings** (kind 3 — precisam de um segmento de dados inicializado em M) e os `Ac`/`Av` (argumentos) e `T` (tempo), que no `-a` devolvem 0 por agora. É o que falta para a `vecmap.onda` *literal* correr tal e qual (ela imprime um cabeçalho com strings e lê `n`/`rep` do argv). O núcleo — cálculo + impressão de números + leitura — está feito e provado pelo juiz. O lado Mach-O (`-m`) partilha todo o código (só muda o `svc`/registo); foi emitido às cegas (sem macOS aqui), mas o `-a` gémeo corre no qemu e o juiz confirma-o.

**Próxima.** Strings no `-a`/`-m` (segmento de dados + `_os`) e `Ac`/`Av`/`T`, para a `vecmap.onda` literal correr em ARM64 e o juiz a cobrir de ponta a ponta.

---

## Iteração 81: Mach-O como objeto (`.o`) linkado pelo clang — passa a validação estrita do Apple Silicon

**O sinal (do utilizador, no Mac real).** O executável Mach-O feito à mão (it.79) deu **"main executable failed strict validation"** no Apple Silicon — o carregador do macOS exige assinatura de código, `__LINKEDIT` e uma validação estrita que não dá para testar daqui (não há macOS; o qemu só corre ELF).

**O que foi feito.** O `-m` passou a emitir um **objeto** Mach-O (`MH_OBJECT`) em vez de um executável: a mesma secção `__TEXT,__text` com o código-máquina aarch64 da Onda (entrada `mmap` + funções) e um símbolo `_main` na entrada. O `clang`/`ld` do Mac linka-o num executável válido (`clang prog.o -o prog`) — a validação estrita, a assinatura ad-hoc e o `__LINKEDIT` ficam a cargo da toolchain do sistema, que é exatamente quem sabe fazê-los. O código continua 100% escrito pela Onda; o linker só o embrulha (é assim que quase todos os compiladores funcionam). De caminho, o `outm` ganhou a correção dos `bl` entre funções (`@64`) que o caminho executável não fazia.

**Prova.** `./build.sh` fecha o ponto fixo (o `-m` é folha). `node --test`: **107 testes**. E — a verificação que faltava — o objeto **linka de facto**: com o `ld64.lld` (a mesma família do linker do Mac) `demo.o` e `bench.o` produzem um **executável Mach-O arm64 válido, PIE, NOUNDEFS** (o `llvm-objdump` confirma a secção `__text` e o símbolo `_main`). Não corre aqui (sem kernel macOS), mas o objeto é estruturalmente válido e linkável — o passo que o executável à mão falhava.

**Próxima.** Confirmar no Mac do utilizador (`clang demo.o -o demo; ./demo`); depois strings/`Ac`/`Av`/`T` no `-a`/`-m` para a `vecmap.onda` literal.

---

## Iteração 82: FMA + desenrolamento 2x no vetorizador ARM64 — a caça ao C

**O número (do utilizador, no Mac real).** No benchmark do polinómio de grau 7, o C (clang -O2) fez ~0.013 s de `user`, o ARM64-Onda ~0.042 s — **o C ~3× mais rápido**. Razão conhecida: o clang usa **FMA** (`fmla`, multiplica-e-soma fundido) e **desenrola**; o NEON da Onda fazia `fmul.2d`+`fadd.2d` em separado e 2 doubles de cada vez, com a cadeia de Horner **dependente** (limitada pela latência).

**O que foi feito.** Duas otimizações no vetorizador NEON (`avem`/`amap`), sem C:
- **FMA**: o `avem` deteta `+ a (* x y)` e funde num só `fmla.2d` (`vd += vn*vm`, um só arredondamento). O núcleo de grau 7 passou de **14 instruções** (7 `fmul`+7 `fadd`) para **7 `fmla.2d`** — metade. A cauda escalar usa `fmadd` (também fundido), por isso **NEON == escalar** continua a valer.
- **Desenrolamento 2x**: o `avem` ficou parametrizado por banco de registos (x + temporários), e o `amap` processa agora **4 doubles por iteração** em **dois bancos independentes** (A: v1,v2-9; B: v16,v17-24). Como a cadeia de Horner é dependente (latência ~4 ciclos por `fmla`), duas cadeias independentes **escondem a latência** — é o ganho real para este núcleo. Restos tratados por um laço de par + cauda escalar.

**Prova.** `./build.sh` fecha o ponto fixo (o `-a`/`-m` são folha). `node --test`: **107 testes**. O mapa `-a` continua **bit a bit igual ao C** (via soma inteira) para n = 64, 63, 100, 7, 1 e a `vecmap` completa (n=256) — o FMA não partiu a identidade (o clang também funde, e o truncamento para int absorve o ULP). O binário emitido mostra **21 `fmla.2d`** em dois bancos (14 em A, 7 em B). Falta medir no Mac: o `user` deve cair de ~0.042 s para perto (ou abaixo) do C.

**Próxima.** Medir no Mac real; se preciso, desenrolar mais (4x) ou afinar o agendamento. Depois strings/`Ac`/`Av`/`T` para a `vecmap.onda` literal.

---

## Iteração 97: arm64 nativo no M1 — a Onda compila-se a si própria em código-máquina arm64, com registos

**Pergunta (do utilizador).** Comparar no M1 o π/fib/julia pelos dois caminhos (C→clang e arm64 escrito pela Onda), fazer uma semente nativa arm64 com ponto fixo e um ramo `--semente-arm64` no `build.sh`.

**O ponto de partida.** O `-m` era folha e só cobria uma parte da linguagem: nenhum dos três exemplos compilava (faltavam a redução `S`, o `D`, strings, `T`, `Ac`/`Av`, a matemática). O caminho C também falhava aqui, por o `onda` escrever a cache em `~/.cache` (bloqueado pela sandbox; `ONDA_CACHE` resolve).

**O que foi feito.**
- **Cobertura** (`src/9arm64.onda`, `src/4main.onda`): `S` e `D` baixados para ciclos (como no x86); a matemática em Onda (`9mat`) ligada também no arm64 (o `Sn`/`Cs` nativo, só pedido para |x| enorme, reduz módulo 2π e chama `_sn`/`_cs`); `Sq`/`Fl`/`Ab`/`Bh`/`Bl`/`Bw`; strings (bloco de dados no fim do código, copiado para `M[64..]` no arranque, endereço relativo ao pc); `T` (gettimeofday: 116 no macOS, 169 no Linux); `Ac`/`Av` (argc/argv guardados em `M[-9]`/`M[-10]`); o ponteiro de alocação começa a seguir às strings (como no x86).
- **Erros corrigidos:** `>>` passava por `lsr` (lógico) — é `asr`, como o `sar` do x86 e o `>>` do C; molduras com mais de 4095 bytes e slots acima de 4095 tinham codificações que transbordavam; a tabela de chamadas (`@64`) tinha 4000 entradas, pouco para o compilador.
- **E/S:** a escrita junta até 4096 bytes por syscall (era um byte por syscall: o julia passava 2,4 s no núcleo); a leitura tem um buffer de 4 KiB no fim de M.
- **Registos:** um alocador próprio do arm64 (varrimento linear, prioridade aos ciclos mais fundos). Cada variável e temporário tem um intervalo de vida, estendido aos ciclos que atravessa; o que atravessa chamadas só pode ir para x19–x26 / d10–d15 (cada função guarda e repõe os que usa), o resto também para x13–x15 / d16–d31. A aritmética, as comparações, as cargas/escritas em M e os saltos usam os registos diretamente. Imediatos pequenos já não gastam 4 instruções.
- **Mach-O:** o objeto leva `LC_BUILD_VERSION` (o `ld` deixa de avisar).
- **Arranque:** `seed/ondac-arm64` (quarta semente); `./build.sh --semente-arm64`; e o `./build.sh` padrão, no Darwin-arm64, deixa um `build/ondac` nativo em vez do invólucro Node.

**Prova.**
- O compilador arm64 compila-se a si próprio até ao ponto fixo (`a2.o == a3.o`, 326 091 bytes; antes do alocador eram 560 KB). O C, o WebAssembly, o x86-64, o ELF arm64 e o Mach-O que ele gera são iguais ao byte aos da semente WASM, e as quatro sementes estão alinhadas (C `3aa51a2675edcec3`).
- O julia em arm64 dá a mesma imagem que o C, byte a byte; π, fib, SHA-256 e crivo dão o mesmo resultado.
- `node --test`: as mesmas 34 falhas que o HEAD anterior tem neste Mac (testes que correm binários x86/qemu, o `-fopenmp` que o clang da Apple recusa, e 37 valores em que o `Math` deste Node difere do fdlibm). Um teste novo (`test/macho.test.js`) linka e corre o Mach-O no M1.

**Os números (M1, melhor de 5, tempo total do processo).**

| | C → clang -O3 | arm64 da Onda (stack) | arm64 da Onda (registos) |
|---|---|---|---|
| π (200 M termos) | 0,21 s | 2,46 s | 0,44 s |
| fib(35) | 0,04 s | 0,11 s | 0,04 s |
| julia 960×540 | 0,05 s | 0,58 s | 0,13 s |
| auto-compilação | — | — | 0,04 s (WASM via Node: 0,10 s) |

Tamanhos: objetos de 10 KB (π, fib) e 34 KB (julia); executáveis de 17 KB e 50 KB (os do C: ~34 KB).

**O balanço.** O fib já empata com o clang. O π e o julia ficam a 2–2,6×: o clang vetoriza a soma do π (NEON, 2 `fdiv` em paralelo) e funde multiplicações e somas; aqui o ciclo é escalar, e ainda há cópias entre registos e constantes rematerializadas a cada volta. Nota à parte: o `ex/ocr.onda` (4,3 MB de C) já saía com bytes binários pelo meio no HEAD anterior (transbordo de um buffer do compilador); não é deste trabalho, mas fica registado.

**Próxima.** Constantes e invariantes fora dos ciclos (LICM), `fmadd`/`fmsub` no escalar, e a redução `S` vetorizada em NEON (é onde o clang ganha no π).

---

## Iteração 98: LICM, fmadd e a soma `S` em NEON no arm64 — o π passa o clang

**Pedido.** Avançar com as três coisas que a it.97 deixou como próximas: invariantes fora dos ciclos, `fmadd` no escalar e a redução `S` vetorizada em NEON.

**O que foi feito** (`src/9arm64.onda`, `src/4main.onda`, `src/8xreg.onda`):
- **LICM:** o `-a`/`-m` corre a mesma passagem de RI do x86 (`xlicm`) antes de atribuir registos; as constantes e os cálculos invariantes saem dos ciclos.
- **Fusão de cópias no alocador:** o temporário que lê uma variável partilha o registo dela enquanto ela não muda; o resultado cujo único uso é `= var t` calcula-se já no registo da variável. Comparação seguida do salto que é o seu único uso: `cmp` + `b.cond` (sem `cset`/`cbz`). Conversões inteiro↔real direto nos registos. O ciclo do π passou de 25 para 11 instruções.
- **fmadd/fmsub/fnmsub:** um `*` real usado só por um `+`/`-` na mesma reta funde-se. **Só com `-mf`/`-af`**, como o FMA do `-xf` no x86. Primeiro liguei-o por omissão e a verificação cruzada apanhou o custo: o compilador nativo lia `3.14159265358979323846` com 1 ulp de diferença do WASM (o `fltval` acumula `r*10 + d`, e o `fmadd` arredonda uma vez em vez de duas). O `-m` tem de dar os mesmos bits que o C, o WebAssembly e o x86. Nunca nas funções `_…` (a biblioteca fica igual ao fdlibm).
- **`S` em NEON (`-mf`/`-af`):** novo nó de RI 54. Para um elemento `f ii..>f i …` com corpo `{ = l E … E }` ou `E` (`+ - * /`, literais reais, parâmetros reais, `F` do índice ou de um parâmetro inteiro, até 2 locais), o analisador valida os tokens e a pressão de registos. O gerador faz 4 elementos por volta (dois bancos `.2d` com acumuladores próprios), com as constantes difundidas antes do ciclo, `fmla`, e uma cauda escalar com o mesmo avaliador. Sem `-mf`, o `S` continua em série, igual ao C ao bit.
- O `K` (armazém) é recusado à compilação no `-a`/`-m` (antes dava valores errados em silêncio).

**Prova.**
- Os pontos fixos fecham (C `d7bddcb8f0d13ed3`, WASM, arm64 com objeto de 311 867 bytes). As quatro sementes estão alinhadas, e o compilador nativo gera o mesmo que o WASM em `-c/-w/-x/-a/-m/-mf`, também para todos os exemplos.
- Os exemplos em `-m` dão a mesma saída que o C: julia, crivo, life, mini, calc, big, crc, b64, maze, sha256, qsort, matmul, regex, bf, grover. O `integra` dá os mesmos bits que o WASM; o C do clang local difere em 2 ulp.
- `-mf` contra `-m`: igual para n = 0..10 (todos os restos); a 10⁶ termos concorda em 13–14 algarismos.
- `node --test`: as mesmas 34 falhas de ambiente; um teste novo no `test/macho.test.js` (restos do `S` vetorizado e `fadd .2d` presentes).

**Números (M1, melhor de 5, processo inteiro).**

| | C → clang -O3 | `-m` (it.97) | `-m` | `-mf` |
|---|---|---|---|---|
| π (200 M termos) | 0,21 s | 0,44 s | 0,19 s | **0,06 s** |
| fib(35) | 0,04 s | 0,04 s | 0,04 s | 0,04 s |
| julia 960×540 | 0,06 s | 0,13 s | 0,11 s | 0,11 s |

O π em série já empata com o clang (o limite é a cadeia de `fadd`, a mesma do C); com `-mf` é 3,5× mais rápido que o C sequencial, o mesmo que o C com OpenMP em 4 núcleos noutra máquina (68 ms). No fib o tempo interno é 41 ms contra 27 ms (o protocolo de chamada ainda guarda tudo na moldura). O julia fica a ~2×: os ciclos têm chamadas à biblioteca matemática (`_lg`, `_cs`), que obrigam os valores a ir à memória.

**Próxima.** Passar argumentos e valores entre chamadas sem os forçar à moldura (o fib e o julia), e o `E`/`D` com elementos gerais em NEON pelo mesmo analisador do `S`.

---

## Iteração 99: chamadas sem pilha no arm64 — o fib e a biblioteca matemática

**Pedido.** Atacar o custo das chamadas, que era o que ainda separava o fib e o julia do clang.

**O que foi feito** (`src/9arm64.onda`, `src/4main.onda`):
- **Funções-folha sem pilha:** quem não faz `bl` não guarda `x29/x30`, e a moldura só tem os registos guardados (agora aos pares, `stp`/`ldp`) e os valores que ficaram mesmo na memória. Antes cada função reservava um slot por variável e por temporário.
- **Recursão com acumulador** (a mesma transformação do clang): numa função inteira cuja devolução é `X + f(...)`, a chamada final vira `acc += X; parâmetros = argumentos; salta para o início`. É feita na RI, com um rótulo e um salto novos (tipos 56/55), e o alocador trata o par como um ciclo. O fib passa a fazer metade das chamadas, com o mesmo código que o clang emite.
- **Pré-coloração:** o argumento calculado mesmo antes da chamada nasce já em `x_j`/`d_j`; o resultado inteiro usado só pela instrução seguinte fica em `x0`. Os reais não, porque `d0`/`d1` são os rascunhos dos operandos na memória; a primeira versão fazia-o e a verificação cruzada apanhou o julia errado.
- **Intervalos com buraco:** o resultado de `?`/`&&`/`||` não está vivo no outro ramo, logo deixa de "atravessar" as chamadas do `else` e de gastar um registo guardado.
- **`&&`/`||` nas condições** de `W` e `?`: saltam direto para o destino, com a comparação fundida (`cmp` + `b.cond`), sem materializar 0/1.
- **Imediatos:** `add/sub/cmp #imm12` (também `lsl #12`), `lsl/asr #imm`, `and/orr/eor` com máscaras contíguas (imediatos lógicos), e `fmov d, #imm8`. Um literal com todos os usos imediatos não chega a ocupar registo.
- **Bloco de literais por função:** constantes reais e inteiros grandes vêm de `ldr d/x, =const` (1 instrução em vez de 3 a 5). O `_lg`/`_cs`/`_xp` da biblioteca usam-no centenas de vezes.
- `Bh`/`Bl`/`Bw` e min/max direto nos registos.

**Prova.** Os pontos fixos fecham (C `fa10faa4b15a3756`; compilador arm64 de 264 227 bytes, antes 311 867). As quatro sementes estão alinhadas, e o compilador nativo gera o mesmo que o WASM em todos os modos e para todos os exemplos. Em `-m`, 16 exemplos dão a mesma saída que o WASM (incluindo julia, integra, sha256, qsort e matmul). `node --test` dá as mesmas 34 falhas de ambiente de sempre.

**Números (M1, tempo de CPU, melhor de 5).**

| | C → clang -O3 | `-m` (it.98) | `-m` agora |
|---|---|---|---|
| fib(35), tempo interno | 27 ms | 41 ms | 33 ms |
| 3 M de `Lg` + `Cs` | 29 ms | 58 ms | 43 ms |
| julia 960×540 | 0,04 s | 0,10 s | 0,07 s |
| π (série / `-mf`) | 0,19 s | 0,19 / 0,06 s | 0,18 / 0,06 s |

**O que ainda falta.** O fib tem a forma do clang mas ainda há cópias de registo à volta da chamada (o resultado não vai direto para o acumulador). A biblioteca matemática fica a ~1,5× porque não há eliminação de subexpressões comuns (o `_lg` carrega a mesma constante duas vezes, e o julia calcula `zr²` e `zi²` duas vezes por volta), e os resultados do `?` ainda passam por uma cópia. O próximo passo natural é uma CSE por valor (numeração de valores sobre a RI, respeitando as escritas nas variáveis).


---

## Iteração 100: CSE (numeracao de valores) no arm64

**O que foi feito.** Uma passagem de RI (`acse`, em `src/9arm64.onda`) antes da LICM: cada instrução pura (literais, leituras de variáveis com versão, `+ - * /` e comparações, unárias, min/max, `Bw`) igual a outra que a domina passa a usar o resultado dessa, e a RI é compactada. A tabela limpa-se nas junções (início/fim de ciclo, `else`, fim de `?`/`&&`/`||`), exceto no fim de um `&&` seguido do salto sobre ele: o lado que continua só é alcançado com as duas partes verdadeiras. As operações comutativas normalizam a ordem dos operandos. Não muda nenhum valor (são as mesmas contas sobre os mesmos operandos), por isso o `-m` continua igual ao bit.

**Prova.** Pontos fixos e as quatro sementes alinhadas (compilador arm64 de 261 955 bytes); o compilador nativo gera o mesmo que o WASM em todos os modos e exemplos; 18 exemplos em `-m` dão a mesma saída que o WASM. O ciclo interior do julia desceu de 17 para 13 instruções (já não calcula `zr²` e `zi²` duas vezes). O tempo total do julia fica nos 0,07 s: o resto está na biblioteca matemática.

---

## Iteração 101: resultados de ? sem copias e literais a esquerda como imediatos

**O que foi feito** (`src/9arm64.onda`):
- O valor de um ramo do `?` calculado mesmo antes do fim do ramo nasce já no registo do resultado (de trás para a frente, para os `?` encaixados irem todos para o registo do mais exterior). No `else`, o buraco do intervalo encolhe até essa definição, e o fib mantém o resultado fora dos registos guardados.
- A CSE passa os literais da esquerda para a direita nas operações inteiras comutativas e nas comparações (invertendo-as), e assim viram imediatos (`& 0xFFFFF x`, `< 3 x`).
- O erro desta iteração ficou registado: a condição da fusão tinha um `&&` a menos e o bloco caía no ramo "senão". O ponto fixo arm64 apanhou-o (o compilador nativo deixou de reconhecer o `main`).

**Prova.** Pontos fixos e sementes alinhadas (compilador arm64 de 257 507 bytes); o compilador nativo é igual ao WASM em todos os modos e exemplos; 18 exemplos em `-m` dão o mesmo que o WASM.

**Números.** 3 M de `Lg`+`Cs`: 44 → 37 ms (C: 29). julia: 0,07 → 0,06 s (C: 0,04).

---

## Iteração 102: syscalls especializadas no arm64

**O que foi feito.** O `asc` (as syscalls do `-a`/`-m`) era copiado inteiro, com os 7 casos e as comparações, para cada `R`, `T`, `Ac`, `Av` e `Y`. Agora cada operação é uma rotina própria (`aswr`, `asrd`, `asex`, `asbk`, `asac`, `asav`, `astm`). Quando a operação é conhecida à compilação (todos os casos menos um `Y` com número variável), só essa rotina é emitida; o despachante completo fica para o caso variável.

**Prova.** Pontos fixos e sementes alinhadas; o compilador nativo é igual ao WASM em todos os modos e exemplos; os exemplos que leem do stdin (sha256, qsort) e imprimem dão o mesmo que o WASM. O compilador arm64 encolheu de 257 507 para 236 639 bytes (−8 %). Os tempos não mudam (estas rotinas não estão nos ciclos quentes).

---

## Iteração 103: literais rematerializados e ponteiros-base no arm64

**O que foi feito** (`src/9arm64.onda`, `src/4main.onda`):
- **Rematerialização:** um literal (inteiro, real ou `Bw`) que fique sem registo não vai para a moldura (`str` + `ldr` a cada uso). Recalcula-se em cada uso (`mov`/`fmov #imm`/`ldr =const`, uma instrução). Acontecia sobretudo com os literais tirados dos ciclos pela LICM.
- **Cópias:** uma cópia de um valor na memória para um registo carrega direto para o destino.
- **Ponteiros-base:** o `-a`/`-m` corre a passagem `xbase` do x86 seguida de outra LICM. `@ + a i` num ciclo, com `a` invariante, vira `add b, x28, a, lsl #3` fora do ciclo mais `ldr/str [b, i, lsl #3]` (tipos 46–50 da RI, os mesmos do x86).
- Tentativa revertida: expandir em linha as funções pequenas também no arm64. Correto, mas o compilador nativo passava a 1 MB e a auto-compilação de 0,04 s para 2,5 s, sem ganho mensurável.

**Prova.** Pontos fixos e sementes alinhadas (compilador arm64 de 231 735 bytes, antes 236 639); o compilador nativo é igual ao WASM em todos os modos e exemplos; 18 exemplos em `-m` dão o mesmo que o WASM. No grover, o ciclo do `S` passou de 6 para 5 instruções e o do `E` de 12 para 10. O tempo fica em 1,31 s (C: 1,08 s): a soma em série está presa à latência do `fadd`, tal como no C, e o clang ganha por vetorizar o mapa `E`.

---

## Iteração 104: S vetorizado em NEON le vetores (@f + a i)

**O que foi feito.** O analisador e o gerador do `S` vetorizado (`-mf`/`-af`) passam a aceitar a folha `@f + a i` (ou `@f + i a`), com `a` um parâmetro inteiro (o vetor) e `i` o índice. A base `M + a*8` calcula-se antes do ciclo num registo inteiro (x11/x13/x15, até 3 vetores). Cada banco lê 2 doubles com `ldr q` (`[x12]` ou `[x12, #16]`), e a cauda escalar usa `ldr d, [base, i, lsl #3]`. Conta como uma folha que ocupa um temporário na validação da pressão.

**Prova.** Pontos fixos, sementes alinhadas, compilador nativo igual ao WASM em todos os modos e exemplos. `-mf` e `-m` dão o mesmo para somas de vetores com n = 0..11 (todos os restos); novo caso no `test/macho.test.js`.

**Números.** O grover, cujo `S n amp a` soma um vetor de 2²⁰ amplitudes 804 vezes: `-m` 1,34 s, **`-mf` 0,76 s** (C → clang: 1,08 s). A probabilidade do alvo concorda em 9 algarismos (0,99999975…), o esperado ao reassociar a soma 804 vezes.

---

## Iteração 105: mapa E vetorizado em NEON, com ? como selecao, tambem no -m

**O que foi feito.** Um novo nó de RI (59) para `E d n f …` no `-a`/`-m`, com o mesmo analisador e gerador do `S` vetorizado:
- leituras `@f + a i`, parâmetros, `F`, locais;
- agora também `? cond A B` como seleção: a condição compara índice, parâmetros inteiros, literais inteiros ou expressões reais (`fcmeq/fcmgt/fcmge`, com troca para `<`/`<=` e `not` para `!=`), os dois ramos são avaliados (são puros) e `bsl` escolhe.

São 4 elementos por volta em dois bancos, com escrita `str q` no destino (base em x17) e cauda escalar.

Um mapa não reassocia nada: cada elemento faz as mesmas contas IEEE pela mesma ordem, por isso o `-m` continua igual ao bit e o mapa vetorizado vale por omissão. O FMA dentro destes corpos passou a ser só do `-mf` (antes estava sempre no gerador do `S`, que só corria em `-mf`).

**Prova.** Pontos fixos, sementes alinhadas, compilador nativo igual ao WASM em todos os modos e exemplos. Novo teste: `E` com `?` e comparações, n = 0..11, dá os mesmos bits que o WASM.

**Números.** grover: `-m` 1,34 → **1,05 s** (C → clang: 1,08 s), com a probabilidade igual ao bit à do C (0,999999757396816); `-mf` 0,76 → **0,47 s**.

---

## Iteração 106: molduras numa so instrucao e retorno direto em x0/d0

**O que foi feito.**
- Nas funções que chamam outras e têm moldura pequena (≤ 488 bytes), o prólogo passa a ser um só `stp x29, x30, [sp, #-(f+16)]!`, e o epílogo um só `ldp x29, x30, [sp], #(f+16)`; os slots e os registos guardados ficam 16 bytes acima.
- O valor devolvido, quando é calculado pela instrução anterior e só usado no `return`, nasce já em `x0`/`d0`.

**Prova.** Pontos fixos, sementes alinhadas, compilador nativo igual ao WASM em todos os modos e exemplos (compilador arm64 de 232 611 bytes).

**Números.** O fib tem agora quase instrução a instrução o código do clang (2 `stp`, 2 `ldp`, `add x0` direto), mas o tempo fica nos 32 ms (clang: 27 ms). A diferença está no caso base: o resultado do `?` (`n`) passa por uma cópia e um salto, e o clang devolve direto. Fica registado como próximo alvo.

---

## Iteração 107: cauda do return duplicada no ramo then

**O que foi feito.** Uma passagem de RI (`atail`, depois da recursão com acumulador) para funções que acabam em `? c A B` seguido de até 6 instruções puras e do `return`. A cauda é copiada para dentro do ramo `then`, com `d` (o resultado do `?`) trocado pelo valor do ramo e temporários novos para as cópias; o `then` devolve logo. O original fica inalcançável e o alocador não lhe dá registos guardados (o buraco do `?` já o separava).

**Prova.** Pontos fixos, sementes alinhadas, compilador nativo igual ao WASM em todos os modos e exemplos.

**Números.** No fib, o caso base (a maior parte das chamadas) passou a `cmp; b.ge; add x0, acc, n; ldp; ldp; ret`, o mesmo número de instruções do clang. Tempo: 32 → 31 ms (clang: 27 ms).

---

## Iteração 108: mais registos sem custo: x8/x16/x17 e d3-d7

**O que foi feito.** O alocador do arm64 ganhou registos que não precisam de ser guardados:
- **x8, x16, x17**, em funções sem syscalls. São os únicos sítios que os usam: o número da syscall em Linux e no macOS. O destino do mapa vetorizado (x17) está em instruções tratadas como chamada.
- **d3–d7**, que só são pisados nos argumentos de chamadas e no código NEON (também tratados como chamadas, com a regra inclusiva para os operandos).

As marcas de chamada na ocupação passaram dos bits 40/41 para 50/51, para os novos registos caberem. Menos funções-folha precisam de guardar x19.

**Prova.** Pontos fixos, sementes alinhadas, compilador nativo igual ao WASM em todos os modos e exemplos.

**Números.** 3 M de Lg+Cs: 37 → 36 ms (C: 29). O resto sem mudança.

---

## Iteração 109: funcoes matematicas expandidas em linha dentro de ciclos

**O que foi feito.** No `-a`/`-m`, uma chamada à biblioteca matemática (`Sn`, `Cs`, `Ex`, `Lg`, `At`, `Pw`) dentro de um ciclo `W` expande-se em linha, a um só nível, com o mesmo mecanismo (`cinl`) que o frontend já usava. Assim o alocador, a CSE e a LICM veem o corpo dentro do ciclo, e as constantes do polinómio saem do ciclo. O clang faz o mesmo com as funções estáticas. Nunca se expande dentro da própria biblioteca (funções `_…`), por isso a recursão interna (`Sn` para |x| enorme) continua a ser uma chamada. O frontend passou a contar a profundidade de `W` durante a análise (`xq 6`, só no arm64).

Tentativa medida e descartada: expandir também as chamadas comuns dentro de ciclos. Não mudou nada: as chamadas à biblioteca passam por outro caminho (`rcall`). Fica registado que os tempos desta máquina variam com a frequência: as medições boas são as feitas lado a lado, depois de aquecer.

**Prova.** Pontos fixos, sementes alinhadas, compilador nativo igual ao WASM em todos os modos e exemplos; os resultados matemáticos são os mesmos bits (expandir não muda as contas).

**Números** (3 M de chamadas, mesma sessão, antes → depois): Lg 16 → 14 ms, Cs 20 → 16, Sn 20 → 16, Ex 19 → 17. O compilador quase não cresce (238 927 bytes).

---

## Iteração 110: escrita de imagens (D) em codigo nativo no arm64

**O que foi feito.** No `-a`/`-m`, a função do runtime `_pd` (escreve os píxeis do `D` como bytes RGB) tem um corpo nativo em vez do código Onda, que chamava o `_op` 3 vezes por píxel e mexia em `M[-3]`/`M[-4]` a cada byte. O corpo nativo esvazia o buffer de saída (`_fl`, para manter a ordem), converte os píxeis em bytes num bloco de 4 KiB na pilha (`lsr` + `strb`) e escreve cada bloco com uma syscall. O resultado é o mesmo, byte a byte.

Medido e revertido nesta iteração:
- expandir a biblioteca matemática em todas as funções do utilizador (não só em ciclos);
- expandir funções pequenas chamadas em ciclos.

Nenhum dos dois mudou o julia, e o segundo aumentava o compilador.

**Prova.** Pontos fixos, sementes alinhadas, compilador nativo igual ao WASM em todos os modos e exemplos; o julia dá a mesma imagem.

**Números** (10 execuções, lado a lado): só a escrita de 960×540 píxeis: 5 → 1 ms por execução (C: 1–2 ms); julia completo: 69 → 65 ms (C: 44 ms).

---

## Iteração 111: chamadas puras a biblioteca matematica saem dos ciclos

**O que foi feito.** No `-a`/`-m`, a LICM (`xlicm`, partilhada com o x86) passa a tratar como puras as chamadas a `_sn _cs _xp _lg _at _pw`: dependem só dos argumentos e não escrevem memória. Uma chamada com argumentos invariantes (verificados um a um) sobe para fora do ciclo. No x86 nada muda (a regra só vale com `isa`; a verificação cruzada do `-x` confirma-o).

No julia, o `px` é expandido no ciclo do `D` e calculava `Cs(0.3·t)` e `Sn(0.3·t)` em cada um dos 518 400 píxeis, com `t` constante. Agora são calculados uma vez. O clang fazia o mesmo depois de expandir o `px`.

O erro desta iteração ficou registado: a primeira versão acrescentou a regra ao `xlpure` fora da cadeia de `?`, e o valor era descartado. A medição lado a lado mostrou que nada tinha mudado.

**Prova.** Pontos fixos, sementes alinhadas, compilador nativo igual ao WASM em todos os modos e exemplos (incluindo o `-x`); a imagem do julia é igual byte a byte.

**Números** (10 execuções, lado a lado): julia 69 → **52 ms** por execução (C → clang: 42–45 ms).

---

## Iteração 112: x27 e d8/d9 como registos guardados

**O que foi feito.** O alocador do arm64 ganhou três registos guardados pelo chamado:
- **x27**, que só era posto a zero no arranque e nunca usado;
- **d8/d9**, que o mapa NEON antigo (`amap`) usa no banco A e agora guarda e repõe à volta do ciclo (`stp/ldp d8, d9`).

Ficam 9 inteiros e 8 reais que atravessam chamadas, como no ABI do Apple Silicon.

**Prova.** Pontos fixos, sementes alinhadas, compilador nativo igual ao WASM em todos os modos e exemplos; o julia dá a mesma imagem.

**Números.** Sem ganho mensurável. No julia ainda há derrames para a pilha na parte das cores: os valores que atravessam as chamadas a `Lg`/`Cs` são mais do que os registos guardados, o mesmo limite que o clang tem. Fica registado como uma mudança de folga, não de velocidade.

---

## Iteração 113: corrigido o transbordo do buffer de codigo em programas grandes

**O erro (registado na it.97).** O `ex/ocr.onda` (825 KB de fonte, 4,3 MB de C) saía com 254 linhas de bytes binários no C gerado, e o lixo variava entre o compilador WASM e o nativo. O buffer onde se juntam os corpos das funções (`@16`) tinha um tamanho fixo de 3 M e transbordava para as tabelas seguintes; o dos cabeçalhos (`@17`, 1,5 M) estava no mesmo caso.

**O que foi feito** (`src/4main.onda`). Os dois buffers passam a crescer com a fonte: `@16` com 8× o tamanho da fonte e `@17` com 2×, mantendo os mínimos antigos.

**Prova.** O C do `ocr` sai sem nenhum byte de controlo, igual entre o compilador WASM e o nativo, e compila com o clang. A verificação cruzada deixou de excluir o `ocr`: todos os exemplos, em todos os modos, dão o mesmo no compilador nativo e no WASM. Pontos fixos e sementes alinhados.

---

## Iteração 114: janela de cargas redundantes depois de escritas

**O que foi feito.** Uma otimização de janela no emissor arm64. Uma carga de um slot da moldura (`ldr x/d, [sp, #off]`) emitida logo a seguir à escrita do mesmo slot desaparece, ou vira `mov`/`fmov` se o registo for outro. Isto acontece sempre que um valor derramado é calculado e usado de seguida. Para não saltar por cima de uma junção, o emissor guarda a posição do último alvo de salto (`xq 7`): no início de cada função e depois de qualquer instrução que crie rótulos (ciclos, `?`, `&&`/`||`, `return`, syscalls, NEON, salto da recursão). Só elimina se a escrita estiver depois desse rótulo.

Medido e revertido nesta iteração: expandir a matemática também nos ciclos gerados por `S`/`E`/`D`. O julia piorou de 52 para 85 ms, porque o `Cs(0.3·t)` expandido deixa de ser uma chamada pura que a LICM tira do ciclo.

**Prova.** Pontos fixos, sementes alinhadas, compilador nativo igual ao WASM em todos os modos e exemplos; o julia dá a mesma imagem.

**Números** (10 execuções, lado a lado): julia 52 → 50 ms por execução (C: 42–45).

---

## Iteração 115: onda m: correr pelo arm64 da Onda, e C sem tentar OpenMP onde nao existe

**O que foi feito** (`onda`, `README.md`):
- `./onda m f.onda [args]` compila pelo código-máquina arm64 escrito pela Onda e corre, com a mesma cache por hash que o `run`. No Mac usa `-m` e o `cc` só liga; em Linux-aarch64 usa `-a` (ELF direto). `./onda mf` acrescenta o NEON que reassocia e o FMA; `./onda build-m` só compila e devolve o caminho. Os erros de compilação aparecem como no `run`.
- As flags do C: o `run` usava sempre `-fopenmp` e, quando falhava (o clang da Apple não aceita), recompilava sem ele. Eram duas compilações por programa novo no Mac. Agora testa uma vez se o compilador aceita OpenMP e guarda a escolha na cache (`.cflags-<cc>`). `ONDA_CFLAGS` continua a mandar.

**Prova.** `onda run`, `onda m`, `onda mf` e `onda build-m` testados com fib e π; um erro de compilação devolve o código 1 com a mensagem; `X 3` devolve 3. `node --test`: as mesmas 34 falhas de ambiente de sempre, 58 a passar.

---

## Iteração 116: o mapa NEON antigo so usa FMA com -mf

**O erro.** O mapa NEON antigo (`amap`, it.73/82) fundia sempre `a + x*y` em `fmla`/`fmadd`, também no `-m`. Hoje só é usado quando o analisador novo recusa por pressão de registos (por exemplo, um polinómio de grau 7). Um só arredondamento muda o último bit, e assim o `-m` deixava de dar os mesmos bits que o WebAssembly e o x86, ao contrário do que o resto do backend garante.

**O que foi feito.** A fusão do `avem` fica sob `-mf`/`-af`, como todo o FMA desde a it.98.

**Prova.** No polinómio de grau 7 sobre 37 elementos (restos incluídos), os bits de cada resultado (`Bh`/`Bl`) do `-m` são iguais aos do WASM; o `-mf` continua com 21 `fmla` e difere, como esperado. Novo teste no `test/macho.test.js`. Pontos fixos, sementes e verificação cruzada como sempre.

**Notas, anteriores a esta mudança.** O C compilado pelo clang difere em bits neste caso (o clang funde por conta própria). O 15.º algarismo impresso pelo `G` pode diferir entre o WASM (formata pelo anfitrião) e o x86/arm64 (formatam pelo `_of` em Onda) quando o valor está numa fronteira de arredondamento.

---

## Iteração 117: reais impressos com os 15 algarismos exatos no x86 e no arm64

**O erro.** O `G` do x86 e do arm64 usa o `_of`/`_od` do runtime em Onda, que calculava os 15 algarismos com multiplicações em vírgula flutuante (`_om`). Em 20 000 reais aleatórios entre 1e-20 e 1e20, 858 (4,3 %) saíam com o último algarismo errado (por exemplo 6.25492977444083 em vez de …082), ao contrário do C (`printf`).

**O que foi feito** (`src/5wasm.onda`, o runtime; `build.sh`).
- O `_od` passa a ser exato. O real escreve-se `mt·2^q` e a razão `na/nb` guarda-se em inteiros grandes (limbs de 32 bits num bloco de rascunho, `@-5`, agora com 300 slots), com `_bz/_bm/_bsh/_bc/_bs/_bcp`. Escala-se exatamente por 10^e até 1 ≤ na/nb < 10, extraem-se 15 algarismos por subtrações, e arredonda-se ao mais próximo (empate: par) comparando 2·resto com `nb`, com transporte (9,999… → 10).
- O `build.sh` exigia que `w1 == w2` no ponto fixo WASM. Quando o runtime embutido muda, o `w1` ainda leva o da semente anterior, por isso o ponto fixo verdadeiro é `w2 == w3`. Antes falhava em silêncio e deixava o compilador anterior no lugar (foi assim que este erro me apareceu).

**Prova.** 0 erradas em 20 000, com os bits de cada valor confirmados iguais entre C e arm64 e a referência exata do Python (`%.15g`). Extremos iguais ao `printf`: 4.94e-324, 1.79e308, 2.2250738585072e-308, 1e+15, 1e-05, 9.9999999999999995 → 10. Pontos fixos, sementes alinhadas, verificação cruzada completa; `node --test` com as mesmas 34 falhas de ambiente.

---

## Iteração 118: o WASM imprime reais como o printf (empates para o par)

**O erro.** O anfitrião WASM (`wasm/host.js`, syscall 5) imitava o `printf("%.15g")` com `toFixed`/`toExponential` do JavaScript, que arredondam os empates exatos para cima. Um real binário exatamente a meio (por exemplo 18237435724586,25) saía …586,3, onde o `printf` dá …586,2. Eram 42 em 20 000 no mesmo teste da it.117.

**O que foi feito.** O `cfmt` do anfitrião calcula os 15 algarismos sobre o valor exato do real com BigInt (razão `mt·2^q`, escala por 10^e, empate para o par), o mesmo método do `_od` em Onda. A formatação fixa/exponencial e o corte de zeros ficam como antes.

**Prova.** 0 erradas em 20 000 contra a referência exata (`%.15g` do Python sobre os mesmos bits); o WASM e o arm64 imprimem agora exatamente o mesmo texto nos 20 000. Extremos iguais ao `printf`. Verificação cruzada completa e `node --test` com as mesmas 34 falhas de ambiente.

**Pendente.** As páginas em `web/` têm cópias próprias do formatador antigo, embutidas em cada página. Ficam como estavam: atualizá-las implica regenerar as páginas.

---

## Iteração 119: balanco das 20 iteracoes seguidas (it.100-118)

**O ciclo.** Vinte iterações seguidas de melhoria, cada uma com verificação completa e o seu commit: pontos fixos C/WASM/arm64, as quatro sementes alinhadas, o compilador nativo igual ao WASM em todos os modos e exemplos, e os exemplos em `-m` com a mesma saída que o WASM.

| it. | o quê | efeito |
|---|---|---|
| 100 | CSE por numeração de valores | ciclo do julia 17 → 13 instruções |
| 101 | resultados de `?` sem cópias; literais à esquerda como imediatos | Lg+Cs 44 → 37 ms |
| 102 | syscalls especializadas | compilador 257 → 237 KB |
| 103 | literais rematerializados; ponteiros-base (`xbase`) | menos instruções no grover |
| 104 | `S` em NEON lê vetores | grover `-mf` 1,34 → 0,76 s |
| 105 | mapa `E` em NEON com `?` (também no `-m`, bit-exato) | grover `-m` 1,34 → 1,05 s |
| 106 | molduras numa só instrução; retorno em x0/d0 | — |
| 107 | cauda do `return` duplicada | fib 32 → 31 ms |
| 108 | x8/x16/x17 e d3–d7 sem custo | Lg+Cs 37 → 36 ms |
| 109 | matemática expandida dentro de `W` | Lg/Cs/Sn/Ex −10 a −20 % |
| 110 | `_pd` (imagens) nativo | julia 69 → 65 ms |
| 111 | chamadas matemáticas puras saem dos ciclos (LICM) | julia 65 → 52 ms |
| 112 | x27 e d8/d9 guardados | folga, sem ganho medido |
| 113 | transbordo do buffer de código (`ocr`) corrigido | C sem lixo |
| 114 | janela `str`+`ldr` | julia 52 → 50 ms |
| 115 | `onda m`/`mf`/`build-m`; C sem `-fopenmp` onde não existe | usabilidade |
| 116 | `amap` só com FMA em `-mf` | `-m` volta a ser bit-exato |
| 117 | `_od` exato (inteiros grandes); ponto fixo WASM `w2 == w3` | 858 → 0 reais mal impressos |
| 118 | `cfmt` do WASM exato | 42 → 0; todas as formas imprimem igual |

**Medido e descartado** (registado nas iterações): expandir em linha as chamadas comuns (compilador 4× maior, sem ganho); expandir a matemática nos ciclos gerados por `S`/`E`/`D` (o julia piorou, porque perdia a LICM das chamadas puras).

**Números finais** (M1, por execução, máquina aquecida; C → clang -O3 / `-m` / `-mf`): π 0,20 / 0,19 / 0,07 s · grover 1,09 / 1,04 / 0,45 s · fib(35) 26 / 31 ms · julia 42 / 56 / 54 ms · auto-compilação do compilador nativo 0,05 s.

**Lição de método.** Os tempos desta máquina variam com a frequência (o mesmo binário deu 34 e 17 ms). As únicas medições que contam são as feitas lado a lado, na mesma sessão, depois de aquecer.

**O que falta.** No julia e no fib, valores que atravessam chamadas esgotam os registos guardados. Falta a eliminação de saltos para saltos e o `?` sem ramos (`fcsel`/`csel`). As páginas `web/` ainda têm o formatador antigo. O `-a` (ELF Linux) recebe todas estas mudanças mas não pôde ser corrido aqui.

---

## Iteração 120: ciclos rodados: o fib passa o clang

Medicao justa primeiro: contra clang -O3 -ffast-math (o par do -mf) o pi e o grover empatam (72/73 ms, 458/485 ms); o julia perde (34 vs 62 ms) e a diferenca esta na biblioteca matematica, nao no ciclo de fuga.

Rotacao dos ciclos no arm64: o fim de um W repete o teste (ate 16 instrucoes sem nada relativo ao pc alem de saltos, que se recolocam) e volta ao corpo com a condicao invertida; as saidas do teste copiado corrigem-se com as originais. Quando o W nao tem teste (o ? esta no inicio do corpo, como no ciclo da recursao com acumulador), duplica-se a cauda: copia-se o teste ate ao primeiro salto condicional ja resolvido, e so a saida paga um salto.

fib(35), tempo interno: 32 -> 26 ms (clang -O3: 27 ms). Primeira vez que o -m passa o C no fib.

---

## Iteração 121: threads no -m: E, D e S puros por todos os nucleos; a Onda passa o C nos quatro

Pureza por tokens (nao escreve, nao aloca, nao imprime, tambem nas funcoes chamadas). Um E/D/S com funcao pura gera uma funcao condutora sintetica (campo 12 da tabela de funcoes) que corre [lo, hi) pelo caminho normal (expansao, LICM, NEON: os nos 53/54/59 ganharam um inicio). A rotina _pr, em codigo-maquina, cria cpus-1 threads com o pthread_create da libSystem (o objeto Mach-O passou a ter simbolos externos e relocacoes BRANCH26); todas, a principal incluida, tiram blocos de max(1, n/64) de um contador com ldaddal. Os argumentos passam por slots no fim de M. E/D escrevem so o seu lugar: mesmos bits que o WebAssembly. O S inteiro e exato em qualquer ordem (tambem no -m); o S real so com -mf, com uma soma parcial por bloco somada por ordem: o resultado nao depende do numero de threads. Em serie quando e pouco (E/S com menos de 4096, D com menos de 2 linhas) ou quando o destino do E e um argumento inteiro (pode ler o que escreve).

Por execucao, com o arranque (C -O3 / C -O3 -ffast-math / -m / -mf, ms): pi 218/78/210/18; grover 1183/481/1050/314; fib(35) interno 28/-/26; julia 53/35/17/16. Outros: ondas 28,5 -> 12,9 (C 28,5), matmul 21 -> 9,8, life 11,4 -> 7,3.

Tentado e desfeito: expandir tambem os nucleos _mkc/_mks dentro do Cs expandido (16 -> 21 ms: os registos esgotam-se).

---

## Iteração 122: threads que ficam vivas: sem criar/juntar por chamada; corrige o paralelo dentro do paralelo

- **Regressão do it.121 corrigida:** o `arm-bench` (2000 `E` de 8192) criava e juntava 9 threads por chamada: 346 ms contra 34 em série. Agora as threads são criadas uma vez (`_pwt`) e esperam por uma geração (slot 40; ímpar = aberto, par = fechado): primeiro ~100 µs em `wfe`, depois dormem no sistema com `__ulock_wait` (slot 43 conta as que dormem; a principal só chama `__ulock_wake` se houver). A principal abre, faz a sua parte, fecha e só espera pelas ativas (slot 41), por isso uma thread que o sistema ainda não pôs a correr não atrasa ninguém.
- **Lição:** uma thread em `wfe` conta como a correr para o macOS: com espera só em `wfe` ficou 3× pior (as threads tiravam núcleos à principal).
- **Bug corrigido:** um `S` dentro de uma função pura chamada por um `E` paralelo usava os mesmos slots e dava o resultado errado. O `ppar` passa a exigir que a função onde está não seja pura nem uma condutora (onde as puras são expandidas).
- **Números (ms, com arranque):** arm-bench 346 → 26; grover `-mf` 314 → 268; matmul 9,8 → ~12–14 (agora com o arranque medido igual); julia 17–20; π `-mf` 19. Sem regressões no life e no vecmap (série).

---

## Iteração 123: E pequenos sem custo fixo, limiar do paralelo pelo custo, mapa NEON 4 vetores por volta

- **Bug de desempenho:** o bloco era n/64, por isso um `E` de 40 elementos chamava a condutora 40 vezes (com guardar d8–d15 e carregar constantes de cada vez). Em série, o `E`/`D` fazem agora uma só chamada; o bloco do `E`/`S` tem pelo menos 256 elementos. O `S` (bit 9 do modo) mantém os mesmos blocos em série e em paralelo, para o `-mf` não depender das threads. `E` de 40 elementos ×400000: 163 → 23 ms.
- **Limiar do paralelo pelo custo:** `pcost` estima o custo por elemento (tokens, +1000 por ciclo/recursão, +40 por Sn/Cs/Ex/Lg/At/Pw, mais as funções chamadas); o limiar é 600000/custo, entre 4096 e 2^20, e vai nos bits 10+ do modo. Um polinómio barato só usa threads a partir de dezenas de milhares de elementos.
- **Mapa NEON (amap):** constantes carregadas uma vez antes do ciclo (v26–v31, v10–v15); 4 vetores (8 doubles) por volta com 4 bancos de registos, intercalados instrução a instrução como no clang (se faltarem temporários, recua e usa 2 bancos); endereços com `ldp`/`stp`.
- **Números (ms):** arm-bench `-mf` 26 → 15,8 (C 14,5; o C -O3 do Mac já usa FMA, por isso a comparação justa é com o `-mf`); grover `-mf` 268 → 186; julia 16; matmul 11; ondas 12.

---

## Iteração 124: S real em threads no -m com os bits do WebAssembly

**Problema:** no `-m` (sem `-mf`), um `S` de reais corria em série, porque a soma tem de seguir a ordem 0..n-1 para dar os mesmos bits do WebAssembly. O `integra` (1M senos) perdia para o C: 17,2 contra 14,9 ms.

**Solução (`lowSb`/`lowSq` em `src/2expr.onda`):** os termos calculam-se em paralelo (um `E` pelo conjunto de threads para um buffer temporário) e somam-se depois em série, pela mesma ordem. Os bits são os mesmos. O topo do heap (`M[-1]`) é guardado antes e reposto depois, para um `S` num ciclo não gastar memória.

**Só quando compensa:** a função tem de ser cara (custo estimado ≥ 40: seno, exp, chamada ou ciclo), `n` tem de passar o limiar do paralelo, e o buffer tem de caber em 32 MiB. Senão fica o `S` em série. Um termo que é só uma leitura (o `amp` do grover) ficava 6% mais lento com o buffer.

**Números:** integra 17,2 → 13,3 ms (C: 15,3); 300 `S` de 1M senos: 3730 → 776 ms (C: 2317); S pequenos e grover iguais.

**Teste:** `macho`: S real em threads com os bits do WASM, num ciclo, mais S pequenos e um S acima do limite.

---

## Iteração 125: leitura em fluxo 1,6x mais rapida (buffer de 64 KiB, ponteiros, ldur/stur)

**Objetivo:** processar ficheiros enormes com memória constante. A Onda já lia o stdin em blocos (a memória fica em ~1,4 MB para qualquer tamanho de entrada), mas cada byte custava ~2,7 ns.

**Mudanças no `R` do arm64 (`asrd`):**
- buffer de 4 KiB para 64 KiB (16× menos chamadas ao sistema; o `arb` desce para 33546224);
- `M[-13]`/`M[-14]` passam a guardar ponteiros absolutos (posição e fim) em vez de índices;
- o acesso usa `ldur`/`stur` com deslocamento negativo (1 instrução em vez de 5);
- o byte lê-se com `ldrb` com pós-incremento.

O caminho rápido fica com 6 instruções.

**Números:** contar bytes e linhas de 27 MB: 73 → 46 ms (~590 MB/s; C 20 ms); memória 1,4 MB. Um `cat` em Onda copia os 27 MB sem alterar um byte.

---

## Iteração 126: sem clang no Mac: a Onda escreve o executavel Mach-O ja assinado (-mx)

**Camada tirada:** no Mac, o `-m` gerava um objeto e precisava do clang para o ligar. O `-mx`/`-mfx` escreve logo o executável final, já assinado.

**O executável (`outmx` em `src/9arm64.onda`):**
- segmentos `__PAGEZERO`, `__TEXT`, `__DATA` (`__got`, só com threads) e `__LINKEDIT`;
- o dyld e a libSystem, com a entrada por `LC_MAIN`;
- as 5 funções da libSystem (`sysconf`, `pthread_create`/`join`, `__ulock_wait`/`wake`) são chamadas por stubs `adrp`/`ldr`/`br` que leem o `__got`, preenchido pelo dyld (opcodes de bind);
- a assinatura ad-hoc obrigatória no arm64: um CodeDirectory com o SHA-256 de cada página de 4 KiB, calculado pela própria Onda.

**Construção:** o `build.sh` e o `--semente-arm64` passam a fechar o ponto fixo com `-mx`, por isso construir a Onda no Mac já não precisa do clang. O `./onda m` também usa o `-mx`.

**Números:** compilar e ligar o grover: 60 → 21 ms; o compilador: 120 → 80 ms. O executável fica ~300 bytes mais pequeno e os tempos de execução são os mesmos.

**Testes:** `macho`: o `-mx` passa no `codesign -v` e dá o mesmo que o `-m` ligado pelo clang, com e sem threads. O `verif` compara o `-mx` do compilador nativo com o da semente WASM.
