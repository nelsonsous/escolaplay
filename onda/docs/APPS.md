# Mercados toda em Onda — plano

A app Mercados tem cerca de 4 000 linhas de JavaScript: a app (`mercados.js`, ~2 400), o motor de análise
(`analise.js`, ~550), o Worker da Cloudflare (`proxy/src/worker.js`, ~600) e os scripts da tarefa do Claude
(`conselheiro/*.mjs`, ~500). Passá-la para Onda faz-se por fases. Cada fase entra no main só quando dá exatamente o
mesmo resultado que o JavaScript, verificado por testes. A app nunca fica partida a meio.

## Fases

| # | O quê | Estado | Notas |
|---|---|---|---|
| A | Onda para apps: exportações, anfitrião (`rt/anfitriao.js`), biblioteca (`lib/app.onda`) | feito (it.137) | app de exemplo testada num browser |
| B | Motor de análise (`analyse`: médias, RSI, MACD, volatilidade, níveis, pontuações, conselho, textos) | feito (Mercados 3.23) | `mercados/onda/analise.onda` (701 linhas): 0 diferenças em 4 000 séries, números iguais ao bit; 40×400 em ~4 ms; corre em WebAssembly na app e nos scripts |
| C | O resto do `analise.js`: tom das notícias, sentimento do mercado, teste no passado, imposto da cripto (365 dias), agrupar avisos, horas de silêncio | feito (Mercados 4.3.0) | a API toda do `analise.js` em Onda: `mercados/onda/*.onda`, 7 ficheiros e 1 415 linhas (702 da fase C), um módulo de 163 962 bytes. 0 diferenças, ao bit, em 1 114 112 pontos de código (norm), 41 500 títulos, 20 000 casos por função (marketMood, labelOf, riskOf, €/L, planLots, cryptoTax, groupAlert, isQuiet), 36 000 indicadores e 120 testes no passado. Mais rápido: tom de 1 000 títulos 60–75 ms → 3–6 ms; teste no passado 40×500 110–155 ms → 14–18 ms, 40×1 260 0,7–0,8 s → 43–72 ms. A app e os scripts já só usam a Onda; o `analise.js` fica como referência dos testes |
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

## Aprendido com o motor (fase B)
- `Mx`/`Mn` comparam e escolhem: diferem do `Math.max/min` do JavaScript no `-0` e no `NaN` (o motor tem `jmax`/`jmin` exatos).
- Não há negação real: `- 0. x` dá `+0` quando x é `+0`; usar `* -1. x`.
- `I` satura em silêncio (`NaN` vira 0).
- A saída é o mais lento: cada byte de texto é uma chamada ao runtime e o buffer guarda um byte por palavra. Uma saída
  compactada (8 bytes por palavra) cortaria cerca de metade do tempo de um lote grande.
- Ler a entrada pelo stdin custa uma chamada por byte em WebAssembly: o motor recebe o lote direto na memória (`_oa` +
  função exportada `lote`), graças às exportações da it.137.

## Aprendido com o resto da análise (fase C)
- `!` e `!f` valem o valor guardado: um bloco que acaba num `!f` é real, e um `? c { ... !f p x } 0` dá "ramos com tipos
  diferentes" (o erro aponta o início da instrução, não o ramo). Acabar o bloco com `0`.
- Os nomes começam por minúscula: `L` é um operador (`= L 1` dá "= precisa de nome").
- Criar uma instância do módulo custa ~0,3 ms (2 MB de memória inicial e os textos): a ponte guarda uma e repõe o monte em
  cada chamada (o que foi reservado volta a zero). As tabelas fixas (palavras das notícias, normalização) e a área de
  trabalho do motor ficam abaixo dessa marca, feitas uma vez pelo `main`.
- Com a memória viva, o JS do chamador (getters, `valueOf`) pode voltar a chamar a API a meio: a ponte lê tudo primeiro e
  só depois escreve na memória da Onda.
- A saída de texto continua a ser o mais lento: um cryptoTax de 300 compras escreve 24 KB de JSON e fica ao nível do JS
  (0,4 ms); onde há contas (notícias, teste no passado) a Onda ganha por 10×.
- O NaN não tem forma em JSON: a Onda escreve-o como texto marcado e a ponte troca-o (±Infinity sai `±1e999`, -0 sai `-0`).
- O teste no passado analisa prefixos cada vez maiores: o RSI, o MACD e os logaritmos da volatilidade continuam de onde
  ficaram (as mesmas contas, pela mesma ordem: os mesmos bits).
- Encontrado e corrigido no motor da fase B: o `${x}` de inteiros entre 2^53 e 9·10^18 saía com os algarismos todos
  (o JS escreve o decimal mais curto, 2^60 → 1152921504606847000).

## Limites, com honestidade
- Nenhuma linguagem é a melhor em tudo. A Onda ganha no cálculo (rápida, igual ao bit em todos os alvos,
  verificável) e na portabilidade (o mesmo código em WebAssembly, x86, arm64, C e GPU). Perde em leitura humana
  (notação prefixa, sem objetos nem strings nativas): é pensada para ser escrita e lida por IAs.
- Uma app em Onda tem mais linhas do que em JavaScript. Mudar uma app grande demora mais.
