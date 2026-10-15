# Onda

Uma linguagem de programação escrita por IAs, para IAs. Cada valor é um campo em sobreposição, e o compilador colapsa-o na CPU, na GPU ou em WebAssembly, à velocidade de C. O compilador está escrito em Onda e compila-se a si próprio, bit a bit.

A **Onda Viva** vai mais longe: um programa com o compilador embutido que gera versões mais rápidas de si próprio, verifica cada uma contra o seu significado e só usa as que passam.

- Página da linguagem, com o compilador a correr no browser: https://claude.ai/artifact/GRcUUwyG96GRcXnhxVtifN
- Onda Viva: https://claude.ai/artifact/3hu9z4r8JawUqm5fLWmXMp

## Começar

```sh
./build.sh                  # arranque: Rust -> ondac1 -> ondac2 -> ondac3, exige ponto fixo bit a bit
./build.sh --semente        # sem Rust: arranca so da semente C (seed/ondac.c)
./build.sh --semente-x86    # sem Rust, sem C e sem Node: so a semente nativa x86-64
./onda run ex/grover.onda   # compila e corre, com cache por hash
./onda c ex/fib.onda        # C portatil
./onda gpu ex/julia.onda px # GLSL para a GPU
node test/viva.test.js      # testes da Onda Viva
node wasm/host.js seed/ondac.wasm < ex/fib.onda  # o compilador em WebAssembly escrito pela propria Onda
python3 web/montar.py       # monta as duas paginas em build/
```

## Estrutura

| Caminho | Conteúdo |
|---|---|
| `SPEC.md` | a linguagem inteira, escrita para IAs |
| `src/*.onda` | o compilador, em Onda, com saída para C, GLSL e JavaScript |
| `seed/ondac.c`, `seed/ondac.wasm`, `seed/ondac-x86-64` | três sementes geradas pela própria Onda: C, WebAssembly e executável x86-64 (ELF) |
| `boot/` | arranque em Rust (estágio 0), usado uma vez |
| `rt/prelude.c` | runtime C mínimo |
| `wasm/` | anfitrião WebAssembly de três portas (`host.js`); a libc para o clang ficou só como alternativa |
| `web/` | carregador WebAssembly, intérprete de referência (`significado.js`), núcleo da Onda Viva e as duas páginas |
| `ex/` | exemplos: fractal, ondas, Grover, π, fib |
| `bench/` | comparações com C, JavaScript e Python |
| `test/`, `tools/` | testes e ferramentas de verificação (GPU, WebAssembly, páginas) |

## O que está verificado

- **Ponto fixo:** `ondac1.c`, `ondac2.c` e `ondac3.c` são iguais bit a bit (81 581 bytes, SHA-256 `3d642bfb…4326`), e o arranque em Rust gera o mesmo C.
- **GPU igual à CPU:** 100% dos píxeis dentro de ±8/255.
- **Velocidade (4 núcleos):** fib(35) em 15 ms (C: 16 ms); π com 200 milhões de termos em 68 ms (C sequencial: 246 ms, C com OpenMP à mão: 67 ms); fractal 960×540 em 13 ms (C sequencial: 31 ms).
- **Grover com 20 qubits:** o alvo fica com probabilidade 0,9999998.
- **Onda Viva:**
  - a forma CPU dá os mesmos bits que o significado e é 17 a 20 vezes mais rápida;
  - a forma GPU cumpre a tolerância declarada;
  - o erro injetado é apanhado;
  - o compilador verifica-se a si próprio dentro do WebAssembly antes de ser usado.

## Limites

- A Onda não é mais rápida do que C, porque gera C. O ganho vem do paralelismo automático (`E`, `S`, `D`) e da GPU.
- "Quântico" é o modelo de paralelismo. Aceleração quântica verdadeira só existe em hardware quântico.
- Versão 0:
  - a memória só cresce;
  - não há verificação de limites nem módulos;
  - na GPU os números têm 32 bits;
  - em JavaScript os inteiros têm 53 bits e as operações de bits usam 32.
- A Onda Viva verifica por amostragem. Mudar o significado é sempre uma decisão de fora do sistema.
