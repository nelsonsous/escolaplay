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
| D | O ecrã: estado, vistas (Painel, Destaques, Análise, Ajustes, ficha), eventos e gestos | passos 1 a 4 feitos (Mercados 4.5.0, 4.6.0, 4.7.0 e 4.8.0): os Ajustes, a Análise e os Destaques; desde a 4.7.0 as vistas ficam simples e a Onda passa a ser a referência delas | `mercados/onda/ecra.onda` e `ajustes.onda` (306 linhas), no mesmo módulo da análise: o HTML do `viewSettings`, igual ao byte em 600 estados por corrida do teste (5 000 numa corrida longa, ~115 MB de HTML). Desenho em ~0,2 ms (0,1 ms de WASM) + 0,1 ms do instantâneo, contra 0,15–0,3 ms do JS. Passo 2: `ecra-analise.onda` (534 linhas) e, em `ecra.onda` (340 linhas), o que as vistas todas vão usar: os números do Intl pt-PT (`fmtPx`, `fmtPct`, `fmtPct1`) e o sort do V8. A Análise igual ao byte em 600 estados por corrida (5 000 numa longa, ~82 MB de HTML), os números em 249 166 casos (996 664), o sort em 4 000 listas; ~1,3–1,5 ms contra ~0,6–0,9 ms do JS; módulo de 305 445 bytes. Passo 4 (4.8.0): `ecra-destaques.onda` (168 linhas), módulo de 284 140 bytes. A seguir: o Painel; depois a ficha e os gráficos; por fim os dados ao vivo e o estado na Onda. Portas que vão faltar: WebSocket (preços ao vivo da Binance), canvas (gráficos), notificações, área de transferência, toque (arrastar para o lado), datas no fuso de Lisboa |
| E | O Worker da Cloudflare | com risco | o plano grátis dá 10 ms de CPU por pedido. Medido (Node, WASM): 645 KB de JSON do Yahoo (40 ações, 1 ano) → **20 ms** com o `json` da biblioteca, contra 3 ms do `JSON.parse`. Precisa de um leitor em fluxo que só tire os fechos, sem montar a árvore |
| F | Os scripts da tarefa do Claude (`dados`, `universo`, `outros`, `publicar`, `backtest`) | feito | `mercados/conselheiro/onda/*.onda`: 2 520 linhas (o modelo dos valores do JS — JSON exato, `String`, `Number`, `toFixed`, `toPrecision`, datas de Lisboa, textos UTF-16 — 573; o comum 417; `dados` 667, `universo` 223, `outros` 297, `publicar` 176, `backtest` 134), com a análise num módulo de 427 035 bytes (`conselheiro.wasm`). Anfitrião Node `rt/anfitriao-node.js` (portas 200–214: argumentos, ambiente, ficheiros, pastas, `fetch` com método/cabeçalhos/corpo/tempo, fluxos de saída, código de saída). Os `.mjs` de sempre são lançadores (a CONSELHEIRO.md não muda) e o JS fica em `conselheiro/js/` como referência. Paridade: 50 cenários com a rede e o relógio simulados, iguais ao byte nos ficheiros, nos 604 pedidos (17 gravações no KV), no stdout, no stderr e no código de saída; as corridas verdadeiras de `dados` e `universo` (1 340 ativos) gravadas e repostas nos dois lados: iguais. Tempos (processo inteiro, rede reposta): `dados` 125 ms (JS) / 186 ms (Onda), `universo` 438 / 422 ms |

O que fica sempre fora da Onda: o HTML e o CSS (não são linguagens de programação) e o service worker (o browser
exige-o em JavaScript; é genérico, só guarda a app em cache). O anfitrião (`rt/anfitriao.js`) é a ponte entre o
WebAssembly e o browser: qualquer linguagem que corra no browser (Rust, Go, C#) precisa de uma ponte assim.

## O que a Onda ganha com isto
- **Já ganhou (it.137):** apps com estado vivo, eventos, rede, armazém, JSON, textos e números pt-PT, e memória que
  se liberta por regiões.
- **Ganhou com as lições abaixo (it.138):** textos constantes (`$"chave"` — o fim das funções `k_*`), módulos só com o
  que se usa (a Mercados 300 696 → 262 439 bytes sem mudar nada, 248 364 com a lista do que a ponte chama:
  `ondac -w f g …`), saída de texto em bloco (para um texto do `O` 4× mais rápida; pelo `rt/anfitriao.js` 6×), o `Oc t n`
  (um `O t` que não passa de n bytes) e erros de tipo no token culpado, com os tipos.
- **Vai precisar:** portas para WebSocket, canvas e notificações (fase D); um JSON mais rápido para o Worker (fase E):
  bytes compactados 8 por palavra ou um leitor em fluxo.

## Aprendido com o motor (fase B)
- `Mx`/`Mn` comparam e escolhem: diferem do `Math.max/min` do JavaScript no `-0` e no `NaN` (o motor tem `jmax`/`jmin` exatos).
- Não há negação real: `- 0. x` dá `+0` quando x é `+0`; usar `* -1. x`.
- `I` satura em silêncio (`NaN` vira 0).
- A saída é o mais lento: cada byte de texto é uma chamada ao runtime e o buffer guarda um byte por palavra. Uma saída
  compactada (8 bytes por palavra) cortaria cerca de metade do tempo de um lote grande. **Em parte resolvido (it.138):**
  os textos literais, os números e os reais vão em bloco (8 bytes por palavra lida); o buffer continua com um byte por
  palavra, que é o protocolo dos anfitriões.
- Ler a entrada pelo stdin custa uma chamada por byte em WebAssembly: o motor recebe o lote direto na memória (`_oa` +
  função exportada `lote`), graças às exportações da it.137.

## Aprendido com o resto da análise (fase C)
- `!` e `!f` valem o valor guardado: um bloco que acaba num `!f` é real, e um `? c { ... !f p x } 0` dá "ramos com tipos
  diferentes" (o erro aponta o início da instrução, não o ramo). Acabar o bloco com `0`. **(it.138: o erro aponta o
  segundo ramo e diz "o primeiro vale real, o segundo inteiro".)**
- Os nomes começam por minúscula: `L` é um operador (`= L 1` dá "= precisa de nome"). **(it.138: a mensagem diz que `L`
  começa por maiúscula e que isso é um operador.)**
- Criar uma instância do módulo custa ~0,3 ms (2 MB de memória inicial e os textos): a ponte guarda uma e repõe o monte em
  cada chamada (o que foi reservado volta a zero). As tabelas fixas (palavras das notícias, normalização) e a área de
  trabalho do motor ficam abaixo dessa marca, feitas uma vez pelo `main`.
- Com a memória viva, o JS do chamador (getters, `valueOf`) pode voltar a chamar a API a meio: a ponte lê tudo primeiro e
  só depois escreve na memória da Onda.
- A saída de texto continua a ser o mais lento: um cryptoTax de 300 compras escreve 24 KB de JSON e fica ao nível do JS
  (0,4 ms); onde há contas (notícias, teste no passado) a Onda ganha por 10×. **(it.138: com a saída em bloco, 0,39 →
  0,34 ms; o JS 0,33.)**
- O NaN não tem forma em JSON: a Onda escreve-o como texto marcado e a ponte troca-o (±Infinity sai `±1e999`, -0 sai `-0`).
- O teste no passado analisa prefixos cada vez maiores: o RSI, o MACD e os logaritmos da volatilidade continuam de onde
  ficaram (as mesmas contas, pela mesma ordem: os mesmos bits).
- Encontrado e corrigido no motor da fase B: o `${x}` de inteiros entre 2^53 e 9·10^18 saía com os algarismos todos
  (o JS escreve o decimal mais curto, 2^60 → 1152921504606847000).

## O ecrã (fase D), passo 1: os Ajustes
- **A abordagem:** o mesmo HTML, feito pela Onda. Cada separador do `mercados.js` é uma função que devolve o HTML a
  partir do estado, e os eventos são um só ouvinte delegado pelos `data-*` (`data-act`, `data-cfg`, `data-mv`…). Por
  isso uma vista passa para a Onda sem mexer nos eventos, desde que dê o HTML igual ao byte. O JS monta um
  instantâneo (`settingsSnap`), a Onda escreve o HTML (`AnaliseOnda.ecra.ajustes`) e o `render` usa-o; até o módulo
  estar pronto (ou se falhar) desenha o `viewSettings`, que fica como a referência do teste de paridade
  (`mercados/tests/ecra-onda.test.mjs`, no Chromium) até as vistas todas passarem; depois sai.
- **O instantâneo não passa por JSON:** a ponte escreve-o direto na memória, já na árvore do `json` de
  `lib/app.onda` (nó `[tipo, valor, chave, irmão, filho, n]`, mais o tipo 0 para o `undefined`), e a vista lê-o com
  `jget`/`jidx`. Os números chegam ao bit (o leitor de JSON da biblioteca só é exato até 15 algarismos e não tem NaN,
  ±Infinity, -0 nem `undefined`). Primeira versão da escrita: 0,35 ms, mais do que a vista toda (um `TextEncoder` por
  texto e uma chamada por palavra); com o UTF-8 feito à mão direto na memória, 0,02 ms.
- **Os valores vão crus:** `ecra.onda` faz com um nó o que o JS faz com o valor — `String(v)`, o `esc` da app,
  `===`, `includes` (SameValueZero), a verdade de um `if` —, e o teste mete lá lixo de propósito (null, NaN, números
  em texto, listas, `<>&"'`, emojis, NUL). Vai já feito no JS só o que é do browser ou de outras partes da app: as
  datas (fuso e língua do browser), o `+` dos números da configuração, as notificações, os nomes (`nameOf`), a
  lista da app (`myList`) e o link de partilha.
- **O Intl em Onda:** o `Intl.NumberFormat('pt-PT')` em euros sem casas parte do decimal **mais curto** do real, não
  do valor exato (2^60 dá `1 152 921 504 606 847 000 €`, não `…846 976`; e `1.005` com 2 casas dá `1,01`). Sem
  casas, abaixo de 2^53 é o mesmo que arredondar o real (metades para longe do zero; `-0,3` dá `-0 €`); daí para
  cima são os algarismos do `pnz` da análise com zeros. Milhares e o espaço antes do € são U+00A0.
- **Cuidado com o invisível:** um espaço normal no lugar de um U+00A0 num texto fixo deu 147 diferenças em 200
  estados. Os caracteres invisíveis escrevem-se como bytes (`P 194 P 160`).
- **O `O t` não sabe a capacidade do texto:** um `tstr` (String(v) num texto novo, para comparar) reserva antes um
  máximo (`vcap`). **(it.138: `Oc t n` desvia como o `O t` mas corta o que passar de n bytes; o `O` continua sem
  guarda.)**
- **A saída de texto já não é o que pesa:** a Onda escreve 23 KB em 0,1 ms; a ponte (instantâneo, árvore, cópia da
  saída) pesa mais do que o WASM.
- **Tamanho:** o módulo passa de 163 962 para 216 004 bytes de WASM: 12,9 KB da biblioteca (sobretudo o leitor de
  JSON, que esta vista não usa — vai ser preciso nos dados ao vivo), 7 KB do `ecra.onda` e 32 KB dos Ajustes (15 KB
  são o próprio texto do HTML). **(it.138: o `-w` deixa de fora o que nada usa — a matemática que a app não chama, as
  rotinas do runtime que só o x86 e o arm64 usam —, e com `ondac -w f g …` também o leitor de JSON, se nenhuma das
  entradas o usar.)**
- **Limites conhecidos:** o `Number()` de um texto não está na Onda (`vnum` dá NaN; no JS `'3'` dá 3) — só se usa onde
  o Worker manda números; um substituto UTF-16 sozinho (que não aparece em dados reais) vira U+FFFD, como no
  `TextEncoder`; e a data feita por um `Intl.DateTimeFormat` guardado fica com o fuso de quando a app abriu.

## O ecrã (fase D), passo 2: a Análise
- **A lógica da vista também passou:** o JS manda os dados crus e a Onda filtra (as chaves, o `pool` de cada filtro,
  o que o Claude pontuou), classifica e escreve (`ecra-analise.onda`: cartões, linhas, o "≠ algoritmo", toda a Trade
  Republic, as ideias, o `algoRank`, o diário e o teste no passado). Vai já feito no JS o que é de outras partes da app
  ou do browser: os nomes (`nameOf`), a variação do dia (`qv`: preço da noite, euros), as datas (`clWhen`, a hora da
  lista toda) e o diário avaliado (`evalJournal`, com os preços de agora). Os pedidos à rede que o `viewAnalysis` fazia
  (`loadUni`, `loadJournal`) saíram para o `analysisLoad`, chamado nos mesmos momentos.
- **Os números do Intl, para todas as vistas** (`ecra.onda`): `fm_num x d` é o `Intl.NumberFormat('pt-PT')` com `d`
  casas — os algarismos do decimal mais curto (o `pnz` da análise) arredondados a `d` casas, metades para longe do
  zero, milhares com U+00A0 a partir de 10 000, "-" com o sinal do real (também o -0 e o que arredonda para 0) —;
  `fm_pct`/`fm_pct1` (o sinal à parte, com o − U+2212); `fm_px` (o `fmtPx` todo: as casas pela grandeza ou pelo
  `decimals`, os pontos sem moeda, qualquer código `/^[A-Z]{3}$/` com o símbolo do pt-PT — 21 diferem do código no
  Chromium 153: €, US$, £, JP¥, CA$, … e `F CFA` com U+202F —, e o `GBp` com " p"); `peur0` passa a usá-lo; `fm_fix1`
  é o `toFixed(1)`. Conferidos com as próprias funções da app e com o `Intl` do Chromium em 249 166 casos por corrida
  (996 664 numa longa): metades exatas no decimal e não no binário, um ulp ao lado, subnormais, 2^53…2^64, bits ao
  acaso. Cada número custa ~0,6 µs; ao princípio 84 µs, porque cada um deixava ~85 palavras no monte (a chamada
  inteira só o repõe no fim): `marca`/`solta` à volta de cada número.
- **O sort do V8 mudou:** o do Chromium 153 é o PowerSort (`array-sort.tq`, do `listobject.c` atual do CPython):
  inserção binária abaixo de 16 elementos; daí para cima as corridas naturais, estendidas até ao `minrun` do CPython
  (corridas de ⌊n/2^e⌋ ou ⌈n/2^e⌉), fundem-se pela "potência" da fronteira, com o galope do TimSort. O do Node 22 ainda é
  o TimSort clássico (o primeiro porte, que dava 0 diferenças no Node, dava 831 em 4 000 no Chromium). E o código
  otimizado (Maglev, Turbofan) troca o sort por uma inserção LINEAR até 16 elementos. Com um comparador que dá uma
  ordem, tudo isto dá o mesmo (são estáveis); com chaves NaN (que empatam com tudo), o resultado do próprio JS depende
  de a função já estar otimizada. O `ts_ordena` segue o builtin, comparação a comparação: 4 000 listas até 5 000
  elementos, com NaN e corridas, iguais às do Chromium (com uma lista com buracos, que o código otimizado não mete em
  linha). Na app as chaves nunca são NaN: as pontuações do motor são inteiros e as do Claude e de toda a TR passam pelo
  `fin`.
- **Uma lista fixa no instantâneo:** escrever as ~1 340 linhas de toda a Trade Republic custava 1,2 ms a cada desenho
  (~80 ns por nó). Com `AnaliseOnda.ecra.fixa(lista)` a ponte escreve-a uma vez abaixo da marca e as chamadas seguintes
  só ligam o nó a ela, enquanto o JS passar a mesma lista (o `UNI.rows` só muda de 30 em 30 min, e nunca no lugar).
  Com a lista toda: 4,9 ms no pior caso medido → ~1,9 ms (o JS ~1,2 ms).
- **O `esc` de um texto feito:** o ``esc(`${score} · …`)`` do JS escreve `null` para um null (o `${}` vem primeiro),
  e o `esc(score)` não escreve nada. O `pv` ganhou o modo 2 (o `String(v)` escapado).
- **Cuidado com as maiúsculas, outra vez:** `C`, `L`, `M`, `D` são operadores (`= C …` dá "= precisa de nome").
- **O que não é igual, e porquê:** com chaves NaN numa ordenação, a ordem do JS não é uma (ver acima); o
  `toLowerCase` só conhece o ASCII e o Latim-1 (os rótulos da análise); um texto com um número (`'50'`) numa conta
  continua a dar NaN (no JS dá 50; o motor e o Worker mandam números); as chaves do protótipo (`constructor`…) nas
  tabelas (`CL_TONE`, `SHORT`) não se imitam; os símbolos das moedas, o U+00A0 e o mínimo de 2 algarismos para os
  milhares são os do CLDR do Chromium 153 (o Safari usa o ICU da Apple: os mesmos para o pt-PT, mas não conferido lá).
- **Desempenho** (Chromium, mediana de 50; 59 linhas e 25 de toda a TR): JS ~0,6–0,9 ms; Onda ~1,3–1,5 ms = instantâneo
  0,33 ms (objetos JS) + árvore 0,37 ms + WASM e saída ~0,45 ms. Como no passo 1, a ponte pesa mais do que o WASM.
- **Tamanho:** 216 004 → 305 445 bytes de WASM: ~25 KB os números e o sort, ~64 KB a vista (o HTML fixo e o código).

## O ecrã (fase D), passo 3: a Análise simples (Mercados 4.7.0)
- **A Onda passa a ser a referência:** o dono pediu a Análise "simples como a Trade Republic" (e com o ar da Música), por
  isso o HTML mudou de propósito e deixou de haver um JS igual para comparar. O `viewAnalysis` (com o `uniSection`, o
  `ideasCard`, o `algoRank` e o `trackSection`) saiu do `mercados.js`; até o módulo estar pronto a Análise diz "A
  calcular…" (sem o motor também não há pontuações). O teste deixou de comparar bytes e confere no DOM, em 600 estados
  ao acaso (3 000 numa corrida longa), o que a vista promete: a ordem (as regras de antes — a convicção do Claude pelo
  prazo, nos empates a classificação dele, depois o algoritmo), o veredicto, a pontuação, a linha de baixo, o ícone igual
  ao `ico()` do Painel, toda a Trade Republic e as dobras. Os números do Intl e o sort continuam conferidos com o browser.
- **O desenho:** o prazo (sem subtítulos) e o filtro (sem os futuros), a escolha a branco como na Música; uma linha
  pequena com a fonte ("Claude · 07:16" ou "Algoritmo"); UMA lista com as linhas do Painel — o ícone redondo, o nome, o
  símbolo, a variação do dia (ao vivo, pelo `data-chg="day"`), a pontuação e o veredicto (o do Claude; o do algoritmo
  marcado "auto"; "≠ algoritmo" pequeno quando discordam). O resto em linhas fechadas no fim (`data-fold`), cada uma com
  uma linha de resumo: toda a Trade Republic (quantos), os sinais automáticos (as oportunidades), os resultados (o
  "comprar" das regras face ao VWCE, no diário) e "Sobre as pontuações" (três linhas).
- **O ícone em Onda:** a cor `h = (h·31 + charCodeAt) % 360` carácter a carácter (fora do BMP, a unidade alta) e as
  iniciais (sem o que não é `[A-Za-zÀ-ÿ0-9 ]`, a primeira letra das duas primeiras palavras, o `toUpperCase` do Latim-1:
  ß → SS, ÿ → Ÿ, µ → Μ grego — o µ foi apanhado pelo teste, num símbolo de cripto).
- **Mais leve:** 305 445 → 300 696 bytes de WASM; ~0,8 ms com 25 linhas da lista toda e ~1,3 ms com 1 340 (antes
  ~1,3–1,9 ms), sobretudo porque o instantâneo é mais pequeno (sem as razões, o risco, o RSI nem o porquê do Claude); o
  HTML só desce ~12% (os ícones e o que fica dentro das dobras).

## O ecrã (fase D), passo 4: os Destaques simples (Mercados 4.8.0)
- **Como a Análise:** a Onda é a referência (o `viewHighlights`, o `moverRow` e o `moodBox` saíram; até o módulo estar
  pronto, "A calcular…"). O sentimento do mercado numa linha que abre (o tom à direita, os índices do dia por baixo; lá
  dentro a frase e as razões); UMA lista por secção — os meus ativos hoje, mais sobem, mais caem (5 de cada lado) — com as
  linhas do Painel e o porquê numa linha pequena (o motivo do Claude, com o ponto laranja, ou o título da 1.ª notícia, com
  o ponto da cor do tom; sem porquê, o símbolo); a variação é sempre a do dia (`data-chg="day"`, também ao vivo). Em linhas
  fechadas no fim: o mercado dos EUA e a cripto hoje. Saíram o "Sobe sem notícia clara", a bolsa e o volume nas linhas da
  app e o rodapé a explicar; a página por omissão passa de 3 029 para 1 824 px.
- **A lógica também passou:** o JS manda os ativos crus (com o `qv`, o `nameOf` e a 1.ª notícia), os motivos do Claude, a
  lista dos EUA e o mercado cripto, e o sentimento já feito pelo motor; a Onda filtra (da lista, sem índices, variação
  finita, fora os meus), ordena (o sort do V8) e escreve. Os pedidos que a vista fazia (as notícias) e o do mercado cripto
  estão no `highlightsLoad`. É a primeira vista com os textos constantes da it.138 (`$"assets"`, `$"^GSPC"`): sem tabela
  de chaves.
- **Para todas as vistas (`ecra.onda`):** o `fmtBig` (`fm_big`, o compacto pt-PT do ICU: a grandeza do decimal mais curto
  escolhe a escala — mil, M, mM, Bi, e daí para cima continua em Bi, "10 000 Bi" —, até 1 casa, e o salto de escala quando
  o arredondamento chega à seguinte: 999,95 → "1 mil", 999 950 → "1 M") e o Intl com ATÉ d casas (`fm_numm`), iguais ao
  Chromium em 99 454 casos por corrida (397 825 numa longa). O ícone e a variação das linhas (`ln_ico`, `ln_chg`) saíram
  da Análise para aqui.
- **Teste** (`ecra-destaques.test.mjs`): 600 estados ao acaso por corrida (3 000 numa longa: 23 888 linhas e 22 787
  ícones), conferidos no DOM com os números do browser (`fmtPx`, `fmtPct`, `fmtBig`) e o `ico()` do Painel.
- **Desempenho e tamanho:** ~0,3–0,4 ms com 25 linhas (12,8 KB); na app, o separador inteiro (vista + DOM) 0,8 ms (JS) →
  1,2 ms, dos quais ~0,6 ms a vista (0,26 ms o instantâneo). Módulo 262 439 → 284 140 bytes.
- **O que não é igual:** um texto com um número (`'12'`) numa conta dá NaN (o JS converte-o); na lista dos EUA o ícone usa
  o nome que vem nela (o JS antigo não tinha ícone aí).
- **Da Música:** a zona das horas do iPhone passa a ser uma faixa preta fixa (`body::before`) e a app abre no topo
  (`scrollRestoration`), como na 2.7.0 da Música.

## Aprendido com os scripts (fase F)
- Ser igual ao JS ao byte obriga a ter o modelo dele: valores com tipo (undefined, null, números, textos, listas,
  objetos), as conversões (`String`, `Number`, o `<` de textos pela ordem UTF-16), a ordem das chaves dos objetos (as
  de índice primeiro, por ordem numérica: um símbolo `1234` muda o JSON) e as mensagens dos erros (`Cannot read
  properties of null (reading 'items')`, `fetch failed`, `URI malformed`…), porque vão parar aos avisos.
- Textos em WTF-8: UTF-8 em que um substituto sozinho (o que o `slice` do JS deixa ao cortar um emoji, ou um
  `\udxxx` do JSON) fica em 3 bytes. O `.length`, o `slice` e o `<` contam unidades UTF-16; o JSON escapa-o e um
  ficheiro leva U+FFFD, como o JS.
- JSON exato nos dois sentidos: o `JSON.parse` com o caminho rápido de Clinger (até 15 algarismos e 10^22) e inteiros
  grandes no resto (até 780 algarismos e o "há mais"); o `JSON.stringify` com o decimal mais curto que a análise já
  tinha. 537 000 comparações com o Node ao acaso, todas iguais.
- Os 64 globais são poucos: a análise usa-os todos. O build liga os nomes `g_*` (palavras) e `k_*` (textos
  constantes) a um bloco que o main reserva logo ao começar, num endereço que sai de uma 1.ª compilação. **(it.138: um
  texto constante é agora `$"price"`, já na zona dos dados: sem `k_*`, sem `k_ini`, sem build.)**
- `fetch` assíncrono em Onda é uma máquina de passos por script (`g_ph`): cada resposta chama uma função exportada, que
  continua onde ia. Um `encodeURIComponent` que lança antes do pedido "responde" logo, com o estado -1000.
- O `||` e o `&&` são em curto-circuito: `= st || st bdiv b m` deixava de dividir depois do primeiro resto (um erro
  meu, apanhado pelos testes ao acaso). `Ab` é só para reais (e o erro aponta o token a seguir; **na it.138 já aponta o operando**).
- Memória: 10 MB de JSON do universo por lotes de 40; de cada lote só fica um registo compacto por símbolo, que desce
  para a marca (o resto volta a zero). Os textos guardam o fim em absoluto: ao mover um texto, corrige-se o fim.
- O sort do V8 com um comparador incoerente (`a.s < b.s ? 1 : -1`, nunca 0) dá o mesmo que uma ordenação estável que
  compara (o de depois, o de antes): é o que o TimSort faz em todos os passos.
- Num pipe, um `process.exit` logo a seguir ao `write` pode cortar o stdout: o anfitrião espera que escoe.
- Lisboa: as regras da UE (o último domingo de março e de outubro, à 01:00 UTC), as de Portugal desde 31/3/1996;
  conferidas com o `Intl` em todas as mudanças de hora até 2099.
- O que não é igual: um erro que nenhum dos lados apanha sai numa linha (`TypeError: …`, com o código 1), sem a pilha
  do Node; num JSON inválido a mensagem é outra (`SyntaxError: <ficheiro>: JSON inválido`). As chaves do protótipo
  (`constructor`, `__proto__`) e o `for…of` de textos em dados malformados não se imitam.

## Limites, com honestidade
- Nenhuma linguagem é a melhor em tudo. A Onda ganha no cálculo (rápida, igual ao bit em todos os alvos,
  verificável) e na portabilidade (o mesmo código em WebAssembly, x86, arm64, C e GPU). Perde em leitura humana
  (notação prefixa, sem objetos nem strings nativas): é pensada para ser escrita e lida por IAs.
- Uma app em Onda tem mais linhas do que em JavaScript. Mudar uma app grande demora mais.
