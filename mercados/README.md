# Mercados

App à parte (PWA instalável) para acompanhar, num só ecrã do telemóvel:

- **Cripto em tempo real** — Bitcoin, Ether, Solana e XRP (Binance, WebSocket; em EUR ou USD).
- **Petróleo e energia** — Brent, WTI, gasolina (RBOB), gasóleo (ULSD) e gás natural, com a conversão aproximada para €/litro.
- **Combustíveis em Portugal** — preço mediano do gasóleo simples e da gasolina 95 nas bombas e o posto mais barato (DGEG), no país ou por distrito.
- **Fundos e ETF** — vem com o Vanguard FTSE All-World (VWCE); à noite usa o preço de Munique (gettex, até às 22 h), perto do que a Trade Republic mostra. Ações e fundos em euros, como na TR.
- **Índices, câmbio e ouro** — S&P 500, Nasdaq, Euro Stoxx 50, PSI, VIX, EUR/USD.
- **Ações que segues** — lista editável (vem com PSI, Europa e EUA; procura e junta outras).
- **Painel** — simples, como a Trade Republic: no topo, **a minha carteira**, compacta e com as mesmas contas da Carteira (as compras do plano, as avulsas e o que tens hoje): o valor; o filtro do período do cartão (1D, 1S, 1M, 1A e Tudo — desde a 1.ª compra, como na Carteira); os meus ativos (e as listas de baixo) têm a sua barra, à parte (1D, 1S, 1M, 1A e 5A — os últimos 5 anos do preço); numa linha, o de hoje e o do período; o gráfico do período com o investido a tracejado (com o investido longe, só o valor, na escala dele); e a tabela da carteira — o investido, o valor e o ganho de cada ativo (em euros sem cêntimos), a soma da cripto numa linha, que se toca para abrir e fechar as moedas (fechada por omissão), e o total — ao vivo (tocar no valor ou no gráfico abre a Carteira); depois os meus ativos e o cartão **Hoje** (o sentimento do mercado e a análise do Claude) (a variação em 1D, 1S, 1M ou 1A) e o cartão **Hoje**, compacto — o resumo do Claude em 3 linhas e a próxima execução do plano; o plano, as ideias, o porquê dos movimentos, os riscos e a agenda numa dobra —; depois a cripto, os fundos e as ações que segues, e os índices, a energia e os combustíveis em linhas fechadas no fim.
- **Destaques** — simples, como a Análise: o sentimento do mercado com os índices do dia; os meus ativos e o que mais sobe e cai hoje, cada um com o porquê numa linha (o motivo do Claude ou a notícia do dia, com a cor de **boa ou má notícia**); as maiores subidas/descidas do mercado americano e o mercado cripto em linhas fechadas no fim.
- **Análise** — simples, como a Trade Republic: o prazo (curto, médio, longo ou desconto), o filtro e uma lista ordenada pela convicção 0–100 do Claude, com o veredicto de cada ativo (comprar, manter, reduzir, vender…); na ficha, os níveis (entrada, alvo, stop) e o porquê. Os sinais automáticos (tendência, momento, RSI, MACD, volatilidade, tom das notícias), toda a Trade Republic e os resultados ficam em linhas fechadas no fim.
- **Avisos** — notificação quando algo se mexe mais do que o limite escolhido.

Endereço: `https://nelsonsous.github.io/escolaplay/mercados/` (no telemóvel: *Partilhar → Adicionar ao ecrã principal*).

> Ferramenta pessoal: as decisões e a execução são tuas.

**Cores**: automático (segue o iPhone: Definições → Ecrã e brilho), dia (claro) ou noite (escuro) — no botão do topo do Painel, que mostra o modo (◐ automático, ☀ dia, ☾ noite) e passa ao seguinte a cada toque, com um aviso, ou em Ajustes → Cores. De dia a faixa das horas é branca (com o iPhone em claro as horas vêm a preto) e todos os textos ficam acima de 3:1 com o fundo (o teste da app mede-os).

**Registar** (Carteira): uma compra (só os euros) e o acerto com a TR para o que faltar. **Poupança periódica** (4.45): o plano, o round up (dias 2, 9, 16 e 23) e o saveback (dia 2) em listas, desde o dia em que copiaste da TR — em cada data escreve-se o valor como na TR (vazio fica a sugestão: o plano por mês; a média dos escritos, 8 round ups e 3 saveback), grava ao sair do campo e ✕ apaga; conta nesse dia às 15h45, ao preço desse dia; cada lista diz quanto dá por ano, e o simulador e a análise do Claude contam com isto.

**Abrir depressa**: o histórico do que tens (um ano de fechos, os 5 anos para as contas da carteira e as séries da semana e do mês) fica guardado no iPhone; os gráficos da ficha usam o que já há; e uma versão nova entra logo à primeira (a app recarrega-se sozinha quando acabou de abrir).

## Conector

As cripto funcionam logo. O resto (Yahoo Finance, Google Notícias, DGEG) não pode ser lido diretamente pelo browser, por isso a app usa um Cloudflare Worker teu, grátis, na pasta `proxy/` — igual ao `tts-proxy`.

```bash
cd mercados/proxy
npx wrangler login     # só da primeira vez
npx wrangler deploy
```

O `wrangler` imprime o URL, algo como `https://mercados-proxy.<conta>.workers.dev`. Na app: **Ajustes → Conector de dados → colar → Guardar**. Também dá para abrir a app já configurada: `…/mercados/?proxy=https://mercados-proxy.<conta>.workers.dev`.

Opcional: para só aceitar pedidos vindos da app, descomenta `ALLOWED_ORIGINS` no `wrangler.toml` e volta a fazer `deploy`.

### Endpoints

| Pedido | Devolve | Cache no CDN |
|---|---|---|
| `/quotes?symbols=BZ=F,AAPL&range=1d` | cotação, variação, máx./mín., série (até 40 símbolos; `range` = 1d, 5d, 1mo, 6mo, 1y, 5y) | 15 s a 1 h |
| `/news?q=Galp&lang=pt&sym=GALP.LS` | notícias dos últimos 3 dias (Google; Bing quando o Google recusa; Yahoo pelo símbolo) | 10 min |
| `/movers` | maiores subidas, descidas e mais negociadas nos EUA | 2 min |
| `/calendar?symbols=NVDA,EDP.LS` | próximos resultados e datas de dividendo (Yahoo) | 6 h |
| `/futuro?f=FUNDO VIVA` | o valor da UP dos fundos de pensões da Futuro, do PDF público das cotações (desencriptado: palavra-passe vazia), com o histórico guardado no KV (um valor por dia), os fins de ano desde 2015 e o início do fundo (1992), e o rendimento anual oficial (1.16.0; 1.17.0) | 3 h |
| `/ppr?f=7614,7615&de=AAAA-MM-DD` | o valor diário das unidades do PPR Evoluir da Fidelidade (7614 Proteção, 7615 Dinâmico), desde o dia `de` — públicos no site da Fidelidade (1.15.0) | 3 h |
| `/derivs?c=BTC,ETH,SOL,XRP` | derivados da cripto (Deribit): a volatilidade das opções a 30 dias (BTC, ETH), o funding dos perpétuos por 8 h e a base do futuro a ~3 meses, ao ano (1.14.0) | 5 min |
| `/ext?symbols=TSLA,NVDA` | antes da abertura e depois do fecho (ações dos EUA): `kind` (`pre`, `post` ou null com a bolsa aberta), preço, variação face ao fecho e a série de 5 min (1.13.0) | 2 min |
| `/search?q=mota` | procurar símbolos | 1 h |
| `/fuel?distrito=11` | mediana, média, mín./máx. e postos mais baratos (DGEG) | 1 h |
| `/fuel/distritos` | distritos da DGEG | 24 h |
| `GET/POST /journal` | diário das sugestões (KV `JOURNAL`) | — |
| `GET /advice[?date=]` | análise do Claude (só leitura) | 60 s |

O plano grátis da Cloudflare dá 100 000 pedidos/dia; com a app aberta a atualizar a cada 30 s são uns 3 000 por hora de uso.

## Conselheiro diário (Claude)

Duas vezes por dia (07:14 e 15:14), uma tarefa agendada do Claude segue [`CONSELHEIRO.md`](CONSELHEIRO.md): corre `conselheiro/dados.mjs` (todos os ativos que a app mostra — o que tens, ETF, cripto, ações da lista e as que juntaste, índices e futuros — numa linha compacta cada, com as outras fontes da decisão no fim da linha (analistas e revisões, fundamentos, sentimento, e a média delas sem o voto do Claude), o contexto do mercado (juros a 10 anos, dólar, Fear & Greed), notícias, agenda, diário e a avaliação dos veredictos anteriores; e um `modelo.json` com todos os ativos), escreve um veredicto por ativo (convicção 0–100 por prazo, entrada/alvo/stop, porquê), a sua classificação por prazo, o plano do mês e as lições, e publica com `conselheiro/publicar.mjs` no KV (os scripts são escritos em Onda: `conselheiro/onda/*.onda`) (`advice:<data>`, `advice:latest`, `advice:lessons`; o publicar recusa se faltar algum ativo). A app mostra-a no cartão **Hoje**, na **Análise** e na ficha de cada ativo (lida em `GET /advice`; a análise antiga, só com alguns veredictos, continua a ser lida). Não é preciso merge diário: só a base de dados muda; alterações às regras chegam como PR em rascunho, à sexta.

## A análise na hora (conector 1.10.0)

Em vez de correr a horas fixas, a análise do Claude pode fazer-se quando abres a app: se a última tem 4 horas ou mais,
a app pede-a ao conector, que chama a tarefa do Claude; fica pronta em poucos minutos (a app avisa e vai ver sozinha
se já acabou). Puxar para atualizar pede-a se a última tem 30 minutos ou mais. Se não abrires a app, não há análise.
Travões no conector: uma corrida de cada vez e no máximo 6 por dia (cada corrida gasta da subscrição do Claude).

**Para ligar** (uma vez; o token nunca passa pelo código nem pelo chat):

1. Em `claude.ai/code/routines`, abre a tarefa «Mercados — conselheiro» → **Edit** → na linha **Trigger** carrega em
   **+** → **API** → **Generate token**. Copia o endereço («Fire URL») e o token (só aparece uma vez).
2. No painel do Cloudflare: **Workers** → `mercados-proxy` → **Settings** → **Variables and Secrets** → junta dois,
   do tipo **Secret**: `CONSELHEIRO_FIRE_URL` (o endereço) e `CONSELHEIRO_TOKEN` (o token).
3. Abre a app: a linha da análise passa a dizer «atualiza-se quando abres a app».
4. Depois disso, as corridas a horas fixas podem sair da tarefa (ou ficar só uma, de reserva).

Para desligar, apaga os dois segredos (ou o token, na página da tarefa).

## Fora de horas, a abertura e o intervalo provável (conector 1.13.0 e 1.14.0)

- **Futuros**: o S&P 500, o Nasdaq e o Nikkei em futuros (`ES=F`, `NQ=F`, `NIY=F`) estão nos índices do Painel. Negoceiam quase 24 h, por isso antes de as bolsas abrirem já dizem para onde vão. Os futuros do próprio FTSE All-World (os FTAW da Eurex, 01:00–22:00) não têm dados grátis: o gémeo dele em Nova Iorque faz esse papel.
- **Antes da abertura e depois do fecho**: as ações dos EUA negoceiam das 9:00 às 14:30 e das 21:00 à 1:00 (hora de Lisboa). Com a bolsa fechada, a linha mostra `pré −20,1%` ou `pós +1,3%` (no lugar da hora), a ficha diz o preço e a hora, e o gráfico de hoje continua com esse bocado numa linha mais clara. O `/ext` dá estes preços à parte; o `/quotes` fica só com a sessão normal (as séries e a análise não mudam).
- **A estimativa para a abertura** (bolsas europeias, ETF, e as dos EUA sem negócio fora de horas):
  1. **o gémeo**, nos fundos da Xetra: o mesmo índice em Nova Iorque, que negoceia depois de cá fechar e até à 1:00 (o FTSE All-World → `VT`; MSCI World → `URTH`; S&P 500 → `IVV`; Nasdaq-100 → `QQQ`; emergentes → `IEMG`; Europa → `VGK`; ouro → os futuros `GC=F`). O que ele fez desde o último preço de cá, em euros (com o EUR/USD de cada hora);
  2. **depois, os futuros** do S&P 500 e do Nikkei, vezes a sensibilidade do ativo a cada um (a regressão dos retornos diários dos últimos 120 dias no S&P 500 e no Nikkei; fora dos EUA conta também o dia anterior do S&P 500, porque a bolsa fecha antes de Nova Iorque).

  A linha mostra `abre ≈ −0,8%`; a ficha mostra a margem e de onde vem cada parte.
- **O intervalo provável** (2 em cada 3 vezes), para amanhã, 1 semana e 1 mês, na ficha, por baixo dos períodos: pela volatilidade das opções (nas ações e nos fundos, o VIX vezes o quanto o ativo mexe face ao S&P 500; no Bitcoin e no Ether, o DVOL da Deribit) ou, sem elas, pela dos últimos 120 dias.
- **Os derivados da cripto** (Deribit, na ficha e para o Claude): a base dos futuros a ~3 meses (o prémio sobre o preço à vista, ao ano) e o funding dos perpétuos (positivo: mais alavancados a apostar na subida).
- **Aprende**: cada estimativa vista nas 20 h antes de uma abertura fica guardada neste aparelho e é comparada com o primeiro preço da sessão. Com 8 aberturas, corrige as estimativas pelo que se confirmou (de 0,3 a 1,6 vezes); com 5 de um ativo, a margem passa a ser o erro médio delas (até lá, a que a história do ativo dá).
- **O Claude vê o mesmo**: no `dados.md`, `dia -0.5% · pré-abertura -20.1%`; os que mexem 5% ou mais fora de horas vão para os movimentos fortes. Sem o conector 1.13.0 (sem o `/ext`) fica só a estimativa.

## Decisão consolidada

Na ficha de cada ativo que se compra há um só cartão, **Decisão**: o veredicto, a confiança e o que cada fonte diz. As regras estão em [`onda/decisao.onda`](onda/decisao.onda) e o cartão em [`onda/ecra-decisao.onda`](onda/ecra-decisao.onda).

| Fonte | Pontuação (0–100) | Peso |
|---|---|---|
| Claude | a convicção por prazo (25 % curto, 35 % médio, 40 % longo; no prazo que escolheste na Carteira, esse pesa mais: longo 5/25/70, médio 15/60/25, curto 60/30/10) | 3 (1,5 se a análise não é a última) |
| Analistas (Yahoo) | 100 − 25 × (nota − 1); metade do caminho até 50 se o preço já passou o alvo; mais até 10 pontos pelas revisões das estimativas de lucro em 30 dias (quem as sobe puxa para cima) | 2 com 10 analistas ou mais |
| Fundamentos (Yahoo) | a média do P/E esperado, do crescimento das vendas e da margem de lucro, cada um numa tabela (pelo menos dois) | 1 |
| Técnica | a pontuação por prazo, com os mesmos pesos; num ativo de médio ou longo prazo, o lado sai dessa pontuação e não do sinal de dias | 1,5 |
| Notícias | o tom que o Claude leu na análise de agora (`news`, 0–100); sem ele, 50 + 50 × tom dos títulos | 0,75 |
| Sentimento | ao contrário (com medo compra-se melhor): na cripto o Fear & Greed, 50 + 0,6 × (50 − índice); nas ações e fundos o VIX, numa tabela | 0,75 |

- **Quem manda:** o Claude, se falou do ativo. Sem ele, a média pelos pesos (≥ 58 entrar, ≤ 42 sair).
- **O que o Claude acrescenta ao cartão:** desde quando mantém a decisão e o que dizia antes ("Mudou hoje · antes: Aguardar", em destaque nos dois primeiros dias; o `publicar` calcula-o do veredicto anterior), o catalisador (`cat`) e o risco (`risk`: o que faria a decisão estar errada, obrigatório quando manda entrar ou sair).
- **Confiança:** alta com ninguém contra e peso a favor de 4 ou mais (o Claude e mais uma fonte de peso). Baixa com menos de 2 a favor, ou com o peso contra acima de metade do peso a favor. As fontes ao lado não contam.
- **Forte:** ninguém contra e a média em 70 ou mais (30 ou menos para sair).

As tabelas estão no cabeçalho do [`decisao.onda`](onda/decisao.onda). Os fundamentos vêm no `/consensus` do conector desde a 1.7.0, e as revisões das estimativas, as surpresas dos resultados e os dados dos fundos (P/E, custo, maiores posições) desde a 1.8.0; o Fear & Greed no `/cryptoglobal`; o VIX nas cotações.

Os pormenores de cada fonte (convicção por prazo, analistas, sinais automáticos, impostos) ficam dobrados por baixo do cartão.

## Diário e teste no passado

- A app guarda **uma vez por dia** as sugestões de cada ativo (ação, pontuações, preço) no KV `JOURNAL` do conector (`POST /journal`), com um código anónimo gerado no telemóvel (visível em Ajustes, para recuperar o histórico).
- **Análise → Como têm corrido as sugestões** compara cada sugestão guardada com o preço de hoje e com o VWCE no mesmo período.
- **Teste no passado**: aplica as regras atuais aos últimos 2 anos (a cada 5 sessões, a partir dos 200 dias de histórico) e mede o resultado a 1 e 3 meses face ao VWCE. Em novembro de 2026, nenhum sinal técnico bateu o VWCE de forma consistente (ações −2,3 pp e cripto −4,6 pp a 3 meses, em média); por isso o plano dá prioridade ao núcleo em ETF.

## Histórico em SQL (conector 1.11.0)

O KV continua a ser o que a app lê. A evolução fica numa base SQL **D1** da Cloudflare, `mercados-historico` (binding
`HIST`; esquema em [`proxy/historico.sql`](proxy/historico.sql); grava o Worker, em [`proxy/src/historico.js`](proxy/src/historico.js)):

| Tabela | O que guarda | Quando |
|---|---|---|
| `conselhos` | cada conselho do Claude (o do dono e os das outras apps, pelo código), com o documento inteiro | na primeira leitura em `/advice` (a tarefa, em Onda, só grava o KV) |
| `acoes` | o que cada conselho dizia de cada ativo (chave, ação, porquê, preço) | idem |
| `sugestoes` | as sugestões automáticas da app do dono, um dia por linha e por ativo (as das outras apps não: saem das mesmas regras e preços) | no registo diário (`POST /journal`) |
| `carteira` | **só a do dono**: quantidade, investido, preço, € por mês e prazo de cada ativo, uma fotografia por dia | no registo diário e quando o dono muda a Carteira |
| `carteira_dia` | **só a do dono**: o total em € (como a app o calcula, a partir da 4.28.0), o investido e a parte em cripto | idem |

- `GET /history?id=<dono>[&ativo=MSFT][&days=90]` (só o dono): a Carteira dia a dia, os conselhos e, com um ativo, o que
  o Claude e a app disseram dele e quanto se tinha.
- `node mercados/proxy/recuperar-historico.mjs` copia o que ainda está no KV (a 16/11: 13 conselhos desde 05/11 e o diário
  da app do dono). Pode correr-se mais de uma vez.
- Se a D1 falhar, a resposta segue na mesma (o KV já está gravado).

## O Fundo Viva: o que cresceu o teu dinheiro em cada ano (4.58.0)

Em «O teu Fundo Viva», além das UP, juntam-se os teus anos, da Declaração de Benefícios de Reforma: o valor a 31/12 e as
contribuições de cada ano (ficam só no iPhone). Com eles, «Ano a ano (o teu dinheiro)»: em cada ano, o valor a 31/12,
menos o do ano anterior, menos o que entrou, em € e em % (sobre o que lá tinhas, com o que entrou a meio do ano); este ano,
até hoje (as tuas UP × o valor da UP). Por cima, o ganho desde o 1.º desses anos e, por ano, o que cresceu (as % de cada
ano encadeadas). O gráfico passa a ter os teus valores a 31/12. Saem o «Desde 1992 (por ano)», o ano a ano do valor da UP e
a data de adesão (4.57.0): os teus anos dizem desde quando.

## O «Hoje» com a bolsa fechada (4.56.0)

O «Hoje» do cartão da carteira conta só o que mexeu hoje: ao fim de semana (ou antes de a bolsa abrir) o FTSE não mexeu, e
a variação do último dia de bolsa fica na linha do ativo, com o dia («sexta», «ontem»); o cartão diz «bolsa fechada».
Assim o «Hoje» bate certo com o gráfico das últimas 24 h.

## Simulador: os ativos, o PPR ou o Fundo Viva (4.52.0)

No Simulador da Carteira escolhe-se o que simular — os ativos, o PPR ou o Fundo Viva (estes dois quando estão
preenchidos). Cada um tem os seus valores (o que já tem hoje, por mês, anos, objetivo; os dos ativos ficam onde estavam),
os seus cenários por ano (PPR: Proteção 1/2/2,5 % e Dinâmico 2/5/8 %; Fundo Viva: 1/4/6 %) e o seu imposto (PPR: 8 % das
mais-valias no resgate nas condições legais; Fundo Viva: não entra, depende de como se recebe).

## Fundo Viva (Futuro, 4.51.0 e conector 1.16.0)

Na Carteira, abaixo do PPR: quanto valem hoje as tuas UP do Fundo Viva (o fundo de pensões da Futuro), quanto rendeu
este ano e, ano a ano, o que cresceu o teu dinheiro (4.58.0), e o gráfico desde 2021 (os fins de ano dos relatórios da Futuro e, daí em diante, um valor por
dia útil, guardado pelo conector). Em «O teu Fundo Viva» escrevem-se as UP (da NetFuturo, ou da Declaração de Benefícios
de Reforma: o valor acumulado a dividir pelo valor da UP a 31/12); ficam só no iPhone. O valor da UP vem do PDF público
das cotações da Futuro, que o conector desencripta (palavra-passe vazia) e lê (`/futuro`).

## Poupança periódica: as listas curtas (4.49.0)

No «Registar» da Carteira, cada lista (plano, round up, saveback) mostra só a próxima data e as últimas — o round up, um
mês (4); o plano e o saveback, 2. As mais antigas ficam numa dobra fechada, «Mais antigas · N», onde continuam a
editar-se e a contar.

## PPR Evoluir (Fidelidade, 4.47.0 e conector 1.15.0)

Na Carteira, abaixo de «A tua carteira»: quanto vale hoje o PPR Evoluir, o ganho, o rendimento por ano, o gráfico desde o
1.º prémio (o valor e o investido) e as duas componentes (Proteção e Dinâmico) com as unidades e o valor de cada uma. Em
«O teu PPR» escreve-se desde quando se paga, quanto por mês e quanto vai para o Dinâmico (fica só no iPhone). Em cada mês,
no dia de «Desde», o prémio divide-se pelas duas componentes e compra unidades ao valor do dia útil seguinte (como a
Fidelidade fez com o 1.º prémio); as entregas extra (além do mensal) juntam-se com a data e o valor (4.48.0) — com as unidades da MyFidelidade, a divisão
delas é a que as faz bater (pode não ser a do plano). Para acertar, as unidades de hoje da
MyFidelidade corrigem a conta na mesma proporção; se ficarem longe (mais de 2 % no valor; 4.51.1) dos prémios registados, falta
alguma entrega: a app di-lo e não mostra o ganho, que ficaria errado. As UP escrevem-se como a MyFidelidade as mostra
(«Carteira do seguro»), não as da conta da app (4.50.0).
Os valores diários das unidades vêm do site da Fidelidade pelo conector (`/ppr`, públicos, em cache 3 h). Por baixo das
componentes, «Ano a ano» (4.53.0): quanto rendeu cada uma (e o total) em cada ano, em € e na % da unidade.

## Dados e limites

- Ações, índices e futuros: dados gratuitos do Yahoo Finance, que podem ter **até 15 min de atraso** nalgumas bolsas. A app atualiza a cada 30 s.
- Gasolina e gasóleo "internacionais" são futuros de Nova Iorque em USD/galão; o €/L mostrado é sem impostos nem margens. O preço nas bombas vem da DGEG.
- O tom das notícias é calculado por palavras-chave nos títulos (PT e EN): é uma pista rápida.

## Testes

```bash
node --test mercados/tests/*.test.*      # análise, decisão consolidada, Worker (fetch simulado), scripts do conselheiro, a app e os ecrãs em Onda
node mercados/tests/ui.test.js            # app no Chromium com todas as fontes simuladas
```
