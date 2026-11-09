# Protótipo visual da Mercados

Uma página à parte (não mexe na app) para experimentar um desenho novo: as imagens são **campos da Onda** — cada
píxel é uma função escrita em Onda (`campo.onda`), e todo o movimento vem dos dados.

Abrir: `https://nelsonsous.github.io/escolaplay/mercados/proto/` (depois de publicado) ou, localmente, servir a raiz do
repositório e abrir `mercados/proto/index.html`.

## O que mostra

| Peça | O que faz | Onde corre |
|---|---|---|
| Gráfico vivo (Bitcoin) | a linha desliza para cada preço novo, a escala acompanha, o brilho cresce com o tamanho do salto e apaga-se devagar; um anel abre-se no último preço enquanto há preços ao vivo; a linha tracejada é o preço de há 24 h | WebAssembly (`E` sobre os píxeis) |
| Gráfico (VWCE, 1 mês) | o mesmo campo sem preços ao vivo: linha, enchimento, ponto final | WebAssembly |
| Mapa do mercado | os 1 340 ativos da lista da Trade Republic, um ponto cada: ETF, cripto e ações, cada grupo da maior subida para a maior queda; cor = variação do dia, brilho = tamanho, cada ponto pulsa ao seu ritmo e dá um clarão quando o preço muda; tocar mostra o ativo, dois dedos (ou a roda) aproximam | WebAssembly |
| Fundo do «Hoje» | ondas lentas e escuras; a cor e a agitação seguem o humor do mercado (quantos ativos sobem) | placa gráfica (`ondac -g fundo` → GLSL) |

Dados: a série do Bitcoin (1 dia) e a do VWCE (1 mês) vêm do conector da app; os preços ao vivo, da Binance (a
transação do BTC/EUR e o resumo de 24 h de todas as criptomoedas, que acende os pontos do mapa). O mapa parte de uma
fotografia da classificação (`dados/universo.json`, com data). Sem ligação à Binance, a página diz «demonstração» e
anda com passos aleatórios do tamanho da volatilidade real do dia.

## Ficheiros

- `campo.onda` — os campos e o seu estado (265 linhas de Onda): `gpx` (gráfico), `mpx` (mapa), `fundo` (GLSL), e os
  passos de animação (`gpasso`, `mpasso`), os preços (`gtique`, `gjunta`, `mpoe`) e o toque (`mtoque`).
- `proto.js` — a casca: traz os dados, copia os píxeis para o ecrã, passa os gestos à Onda.
- `build.mjs` — compila (`node mercados/proto/build.mjs`) para `gerado/proto-dados.js` (WASM de 27 KB, GLSL e os dados
  do mapa).
- `testes/proto.test.mjs` — abre a página num Chromium com dados gravados e verifica o desenho (a linha passa onde os
  dados mandam, o mapa tem as duas cores, o toque e a aproximação funcionam, o fundo sai da placa gráfica).
  `GRAVAR=pasta node --test mercados/proto/testes/proto.test.mjs` grava também um vídeo e imagens.

## Ritmo medido

Num Chromium sem placa gráfica (o da máquina de testes, mais lenta do que um telemóvel recente): 57–60 imagens por
segundo, 7,5–10 ms por imagem com 1 píxel calculado por píxel de ecrã. A página começa com 2 píxeis por píxel (ecrãs
retina) e desce sozinha se a máquina não aguentar 13 ms por imagem. O mapa redesenha a 30 por segundo.

## O que falta para entrar na app

- O anfitrião da Onda (`onda/rt/anfitriao.js`) ganhar as portas que esta casca faz à mão: canvas (píxeis de um campo),
  WebGL (um campo `-g`), ponteiros com coordenadas, WebSocket e o relógio de animação.
- Os gráficos na placa gráfica: o alvo `-g` não lê memória, por isso a série tem de chegar ao shader por uma textura de
  dados (uma operação nova no compilador, com o mesmo significado na CPU). Com isso os gráficos e o mapa correm a 60
  imagens por segundo em qualquer resolução.
- Ligar o toque num ponto do mapa à ficha do ativo, e usar o gráfico vivo na ficha (com os períodos da app).
