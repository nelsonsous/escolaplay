# A arquitetura da Onda e das apps feitas com ela

O mapa de tudo: o que existe, onde está, o que depende de quê e o que falta. Para fazer uma app nova, o ponto de
partida é o molde (`onda/molde/`); este documento explica o que está por baixo.

## As cinco camadas

Cada camada só usa as de baixo.

```
5  APPS            mercados/ (app, tarefa do Claude, protótipo visual) · musica/ · onda/molde/ (o ponto de partida)
4  BIBLIOTECA      onda/lib/*.onda — textos, números, JSON, datas, ordenar, HTML, portas (o que o JS traz de origem)
3  ANFITRIÕES      onda/rt/anfitriao.js (browser) · anfitriao-node.js (scripts) · wasm/host.js (linha de comandos)
2  ALVOS           WebAssembly · x86-64 · arm64 · C · GLSL (placa gráfica) · JavaScript · circuitos
1  LINGUAGEM       onda/SPEC.md e o compilador onda/src/*.onda, escrito em Onda, que se compila a si próprio
```

| Camada | O que garante | Onde se prova |
|---|---|---|
| 1 Linguagem | o compilador compila-se a si próprio e dá o mesmo resultado, bit a bit, partindo de qualquer semente | `onda/build.sh` (ponto fixo) |
| 2 Alvos | o mesmo programa dá o mesmo resultado em todos os alvos, incluindo a matemática (seno, exp, potência…) | `onda/test/it140.test.js`, `test/w/correr.sh`, `test/gpu.test.js` |
| 3 Anfitriões | a única ponte entre a Onda e o mundo: ecrã, eventos, rede, armazém, relógio, ficheiros | `onda/test/app.test.js` |
| 4 Biblioteca | o que diz ser igual ao JavaScript é igual ao byte (números, JSON, datas de Lisboa, ordenação) | `onda/test/biblioteca-*.test.js` |
| 5 Apps | cada ecrã e cada script em Onda dá o mesmo que a versão em JavaScript que substituiu | `mercados/tests/`, `onda/test/molde.test.js` |

## O modelo de uma app

Uma app em Onda é um módulo WebAssembly com memória própria. O anfitrião corre o `main` uma vez e depois chama uma
função da Onda em cada evento. A memória fica viva entre chamadas: é o estado da app.

```
toque / tecla / resposta da rede / relógio
        │  o anfitrião escreve o texto do evento na memória e chama a função
        ▼
   função de evento em Onda ──► muda o estado (globais M[0..62])
        │                  ──► escreve HTML para um lugar do ecrã   (Y 100)
        │                  ──► pede à rede, guarda no armazém        (Y 102, 105, 106)
        ▼
   solta a memória que reservou (_me_solta): o monte volta ao sítio
```

Regras que as apps seguem (o molde mostra-as todas em 143 linhas):

1. **Um evento, uma função**; os botões são elementos com `data-onda="ação:número"`.
2. **O estado são globais com lugar fixo**, listados no topo do ficheiro. A biblioteca só usa o `M[63]`.
3. **Cada evento solta o que reservou.** O monte não cresce com o uso (os testes medem-no).
4. **Desenhar é escrever HTML para um elemento**; cada pedaço do ecrã tem a sua função e só se refaz o que mudou.
5. **Tudo o que vem de fora é escapado** antes de ir para o ecrã, e validado antes de entrar no estado.
6. **Só as funções dos eventos são exportadas**; o que a app não usa da biblioteca não entra no módulo.
7. **Os nomes das apps não começam por `_`** (são do runtime e da biblioteca) nem por maiúscula (são operadores).

## Os três tipos de programa

| Tipo | Anfitrião | Como se monta | Exemplo |
|---|---|---|---|
| **App com ecrã** (PWA) | `rt/anfitriao.js` | biblioteca + `app.onda` → `ondac -w main clique …` | `onda/molde/`, a Música |
| **Script** (Node, tarefas agendadas) | `rt/anfitriao-node.js` | biblioteca + scripts → `ondac -w` | `mercados/conselheiro/`, `onda/ex/carteira/` |
| **Campo** (imagens, animação) | uma casca pequena com um `canvas`; na placa gráfica, WebGL | `ondac -w` (CPU) ou `ondac -g função` (GLSL) | `mercados/proto/` |

Uma app grande que já existia em JavaScript (a Mercados) passa para a Onda aos poucos, com um quarto modo:
**a ponte**. O JavaScript escreve um instantâneo do seu estado na memória da Onda (uma árvore, sem JSON pelo meio) e a
Onda devolve o HTML do ecrã ou o resultado do cálculo. Serve para migrar com testes de paridade; o destino é o modelo
de cima, com o estado dentro da Onda.

## Onde está cada coisa

| Pasta | O quê | Tamanho |
|---|---|---|
| `onda/src/` | o compilador (leitor, tipos, alvos, otimizações, matemática) | 6 117 linhas de Onda |
| `onda/seed/` | as sementes de arranque: WebAssembly (512 KB), x86-64 (362 KB), arm64, C | geradas pela Onda |
| `onda/lib/` | a biblioteca: 10 módulos, 252 funções (`lib/LEIA.md`) | 1 385 linhas |
| `onda/rt/`, `onda/wasm/` | os anfitriões | 146 + 143 + 114 linhas de JS |
| `onda/molde/` | o ponto de partida de uma app nova | 143 linhas de Onda, módulo de 45 KB |
| `mercados/onda/` | a análise e os quatro separadores da Mercados | 2 827 linhas, módulo de 327 KB |
| `mercados/conselheiro/onda/` | os scripts da tarefa do Claude | 1 948 linhas, módulo de 363 KB |
| `mercados/proto/` | gráficos vivos e o mapa do mercado (o guia: `docs/CAMPOS.md`) | 265 linhas, módulo de 27 KB |
| `musica/onda/` | o motor e o curador da Música (de outra sessão; usa ainda o `lib/app.onda`) | 231 linhas |

## Estado de cada app

| App | Em Onda | Ainda em JavaScript |
|---|---|---|
| Molde | tudo (estado, ecrã, eventos, rede, armazém) | a casca de 16 linhas e o service worker |
| Música | o motor e o curador | uma casca de 57 linhas |
| Mercados — tarefa do Claude | tudo | lançadores de uma linha |
| Mercados — app | a análise toda e os separadores Painel, Destaques, Análise e Ajustes (pela ponte) | a ficha do ativo e os gráficos, os dados ao vivo, o estado e os gestos (`mercados.js`, 2 168 linhas) |
| Mercados — conector (Cloudflare) | nada | tudo |

O HTML, o CSS e o service worker ficam sempre fora: os dois primeiros não são linguagens de programação e o browser
exige o terceiro em JavaScript.

## O que falta, por ordem

1. **Portas novas no anfitrião** — `canvas` (os píxeis de um campo), WebGL (um campo `-g`), ponteiros com coordenadas
   (arrastar, puxar para fechar), WebSocket e o relógio de animação. Hoje o protótipo visual e a Mercados fazem-nas à
   mão no JavaScript. Com elas, o molde ganha gráficos e gestos, e a casca da Mercados encolhe.
2. **A ficha do ativo e os gráficos da Mercados em Onda**, com o gráfico vivo do protótipo.
3. **O estado e os dados ao vivo da Mercados dentro da Onda** — acaba a ponte; o `mercados.js` fica uma casca como a
   da Música.
4. **Textura de dados no alvo `-g`** — o GLSL não lê memória; com uma textura, os gráficos e o mapa correm na placa
   gráfica em qualquer resolução.
5. **Leitor de JSON em fluxo** — o conector da Cloudflare tem 10 ms de CPU por pedido; a árvore da biblioteca demora
   20 ms em 645 KB (o `JSON.parse` 3 ms). Só com um leitor que tire os valores sem montar a árvore é que o conector
   pode passar para a Onda.
6. **A Música na biblioteca nova** (`onda/lib` em vez do `lib/app.onda`) — pertence a outra sessão.

## Limites, com honestidade

- A Onda ganha no cálculo (rápida, igual ao bit em todos os alvos, verificável) e no tamanho (uma app inteira em
  45 KB, sem dependências). Perde em leitura humana: notação prefixa, sem objetos nem textos nativos. É pensada para
  ser escrita e lida por IAs.
- Uma app em Onda tem mais linhas do que em JavaScript, e sem WebAssembly não corre.
- Ler JSON grande é mais lento do que o `JSON.parse` do browser (ponto 5).
- Não há funções como valores nem módulos: uma só tabela de nomes, com prefixos.
