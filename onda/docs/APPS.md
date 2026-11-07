# Mercados toda em Onda — plano

A app Mercados tem cerca de 4 000 linhas de JavaScript: a app (`mercados.js`, ~2 400), o motor de análise
(`analise.js`, ~550), o Worker da Cloudflare (`proxy/src/worker.js`, ~600) e os scripts da tarefa do Claude
(`conselheiro/*.mjs`, ~500). Passá-la para Onda faz-se por fases. Cada fase entra no main só quando dá exatamente o
mesmo resultado que o JavaScript, verificado por testes. A app nunca fica partida a meio.

## Fases

| # | O quê | Estado | Notas |
|---|---|---|---|
| A | Onda para apps: exportações, anfitrião (`rt/anfitriao.js`), biblioteca (`lib/app.onda`) | feito (it.137) | app de exemplo testada num browser |
| B | Motor de análise (`analyse`: médias, RSI, MACD, volatilidade, níveis, pontuações, conselho, textos) | a fazer | paridade com o JS em milhares de séries; corre em WebAssembly na app e nos scripts |
| C | O resto do `analise.js`: tom das notícias, sentimento do mercado, teste no passado, imposto da cripto (365 dias), agrupar avisos, horas de silêncio | depois de B | pura lógica, sem ecrã |
| D | O ecrã: estado, vistas (Painel, Destaques, Análise, Ajustes, ficha), eventos e gestos | o maior | precisa de portas novas: WebSocket (preços ao vivo da Binance), canvas (gráficos), notificações, área de transferência, toque (arrastar para o lado), datas no fuso de Lisboa |
| E | O Worker da Cloudflare | com risco | o plano grátis dá 10 ms de CPU por pedido. Medido (Node, WASM): 645 KB de JSON do Yahoo (40 ações, 1 ano) → **20 ms** com o `json` da biblioteca, contra 3 ms do `JSON.parse`. Precisa de um leitor em fluxo que só tire os fechos, sem montar a árvore |
| F | Os scripts da tarefa do Claude (`dados`, `universo`, `outros`, `publicar`) | depois de B e C | anfitrião Node: ficheiros, `fetch`, API da Cloudflare |

O que fica sempre fora da Onda: o HTML e o CSS (não são linguagens de programação) e o service worker (o browser
exige-o em JavaScript; é genérico, só guarda a app em cache). O anfitrião (`rt/anfitriao.js`) é a ponte entre o
WebAssembly e o browser: qualquer linguagem que corra no browser (Rust, Go, C#) precisa de uma ponte assim.

## O que a Onda ganha com isto
- **Já ganhou (it.137):** apps com estado vivo, eventos, rede, armazém, JSON, textos e números pt-PT, e memória que
  se liberta por regiões.
- **Vai precisar:** portas para WebSocket, canvas e notificações (fase D); um JSON mais rápido para o Worker (fase E):
  bytes compactados 8 por palavra ou um leitor em fluxo.

## Limites, com honestidade
- Nenhuma linguagem é a melhor em tudo. A Onda ganha no cálculo (rápida, igual ao bit em todos os alvos,
  verificável) e na portabilidade (o mesmo código em WebAssembly, x86, arm64, C e GPU). Perde em leitura humana
  (notação prefixa, sem objetos nem strings nativas): é pensada para ser escrita e lida por IAs.
- Uma app em Onda tem mais linhas do que em JavaScript. Mudar uma app grande demora mais.
