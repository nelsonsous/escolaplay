# Imagens vivas em Onda (campos) — o que o protótipo da Mercados ensinou

Guia para pôr gráficos, fundos e ícones animados calculados em Onda numa app qualquer (Mercados, Meteo, Música…).
Exemplo completo e testado: `mercados/proto/` (`campo.onda`, `proto.js`, `build.mjs`, `testes/proto.test.mjs`).

## A ideia

Uma imagem é uma **função de cada píxel**: `cor = f(x, y, t, dados)`. Escreve-se uma vez em Onda e corre:

| Onde | Como | Quando usar |
|---|---|---|
| CPU (WebAssembly) | `E buf np f a b c` corre `f` em todos os píxeis; a casca copia para um `canvas` 2D | quando a função lê dados da memória (séries, listas, estado) |
| Placa gráfica (GLSL) | `ondac -g f` gera o shader; a casca desenha um retângulo em WebGL2 | quando a função só depende de `x, y, t` e de alguns números (uniforms): fundos, céus, ícones |

O alvo `-g` **não lê memória**: tudo o que a função precisa entra pelos argumentos (até 8 números, `u[0..7]` no
protótipo: tempo, largura, altura, humor…). Uma série inteira só lá chega com uma textura de dados (ainda não existe).

## Padrão do lado da Onda

```
# cor empacotada numa palavra: R + G·256 + B·65536 + alfa (a casca copia os 32 bits de baixo para o ImageData)
: cor fff>i r g b + + + I * 255.0 lim r 0.0 1.0 * 256 I * 255.0 lim g 0.0 1.0 * 65536 I * 255.0 lim b 0.0 1.0 4278190080
# campo da placa gráfica: x y em píxeis, t em segundos, w h o tamanho, e os parâmetros da app
: fundo ffffff>i x y t w h hu { … cor r g b }
```

- **O estado da animação vive na Onda** (alvo, valor mostrado, fase); a casca só chama `passo dt` e `desenha` em cada
  `requestAnimationFrame`. Movimento suave: o valor mostrado aproxima-se do alvo (`m = m + (alvo − m)·k·dt`).
- **Barato por píxel:** onda triangular em vez de seno (`tri`), cortes por intervalo antes de contas caras.
- **Linhas finas:** distância verdadeira do píxel ao segmento (`gseg`), não só a diferença vertical — senão aparecem
  riscos verticais de brilho nos troços a pique.
- **Tipos:** um bloco que acaba numa atribuição de real dentro de `? c { … } 0` precisa de um `0` no fim.
- **Exportar** só o que a casca chama (`ondac -w f g …`); o resto fica privado e o que não se usa não entra.

## Padrão da casca (JS, ~100 linhas)

- Copiar os píxeis: `Uint32Array` sobre a memória, os 32 bits de baixo de cada palavra → `ImageData`.
- **Resolução adaptativa:** começar com 2 píxeis por píxel de ecrã (retina) e descer 0,5 de cada vez se a média
  passar de 13 ms por imagem (medir de 45 em 45 imagens). Resultado medido: 57–60 imagens/s sem placa gráfica.
- Só desenhar o que está visível (`IntersectionObserver`); o que muda devagar pode ir a 30 imagens/s.
- WebGL2: `antialias: false`; os parâmetros num `uniform1fv` de 8 números.
- Sem dados ao vivo, uma **demonstração** com passos aleatórios do tamanho real — a página nunca fica parada.
- `prefers-reduced-motion`: parar a animação (ou só o brilho).

## Testar (Playwright, sem olhar para imagens)

- Chromium com placa gráfica por software: `--use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist`.
- Em ESM o Playwright entra com `createRequire(import.meta.url)('playwright')`.
- Contar píxeis por cor (`getImageData`) e verificar que a linha passa onde os dados mandam (o brilho na altura
  esperada, não a posição do máximo).
- Um canvas WebGL lê-se com `gl.readPixels` logo a seguir a desenhar (o `drawImage` dá preto).
- Vídeo e imagens para mostrar: `recordVideo` no contexto (`GRAVAR=pasta` no teste do protótipo).

## Um campo por cima de HTML (ex.: o céu da Meteo, `meteo/onda/ceu.onda`)

- O alvo `-g` escreve sempre píxeis **opacos** (`alfa = 255`). Para pôr luz por cima de um cartão (sol, chuva, neve),
  o campo sai **preto onde não há nada** e o elemento que leva o canvas mistura-se com `mix-blend-mode: screen` (só
  acrescenta luz). O pai precisa de `isolation: isolate`, e a mistura vai no elemento que fica no mesmo contexto de
  empilhamento do fundo (o `.sky`), não no canvas lá dentro.
- **Um só contexto WebGL** para a app inteira: quando a página se redesenha, muda-se o mesmo canvas para o elemento
  novo. Um contexto por desenho é lento e o browser limita-os.
- **Acaso sem seno** (`h2`, o hash de Dave Hoskins): igual na CPU (64 bits) e na placa gráfica (32 bits). O tempo dá a
  volta (`t % 600`) para não perder precisão nos 32 bits.
- Cada efeito dentro de um `?` que depende só dos parâmetros: na placa gráfica vira um `if` igual em todos os píxeis,
  por isso o que está desligado não custa.
- Guardar o caminho antigo (CSS) para quando não há WebGL2 ou a placa gráfica tira o contexto (`webglcontextlost`);
  nos testes, `WEBGL_lose_context` força esse caminho.
- Testar a mesma função na CPU (`ondac -w ceu`, imagens pequenas no `node --test`) e, no browser, ler os píxeis com
  `gl.readPixels` logo a seguir a desenhar.

## Para um ícone (ex.: a Meteo)

- O ícone do ecrã principal do iPhone é **sempre uma imagem fixa** (PNG do `apple-touch-icon` e do manifesto): não
  anima. O que se pode fazer em Onda:
  1. **Gerar os PNG do ícone** a partir de um campo (`ícone x y` com o céu, o sol, a chuva) num script Node: o
     mesmo desenho em 180, 192 e 512 píxeis, e a versão `maskable` com margem de segurança (80 % ao centro).
  2. **Animar o ícone dentro da app** (cabeçalho, ecrã de abertura, estado do tempo): o mesmo campo no alvo `-g`,
     com o tempo `t` e o estado do tempo como parâmetros (nuvens, chuva, vento, dia/noite) — em vez de um vídeo, que
     pesa megabytes, não muda com o tempo real e não se adapta ao tamanho.
- Um campo destes cabe em poucas dezenas de linhas de Onda e o shader em poucos KB.
