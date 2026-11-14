# Mercados

App à parte (PWA instalável) para acompanhar, num só ecrã do telemóvel:

- **Cripto em tempo real** — Bitcoin, Ether, Solana e XRP (Binance, WebSocket; em EUR ou USD).
- **Petróleo e energia** — Brent, WTI, gasolina (RBOB), gasóleo (ULSD) e gás natural, com a conversão aproximada para €/litro.
- **Combustíveis em Portugal** — preço mediano do gasóleo simples e da gasolina 95 nas bombas e o posto mais barato (DGEG), no país ou por distrito.
- **Fundos e ETF** — vem com o Vanguard FTSE All-World (VWCE); à noite usa o preço de Munique (gettex, até às 22 h), perto do que a Trade Republic mostra. Ações e fundos em euros, como na TR.
- **Índices, câmbio e ouro** — S&P 500, Nasdaq, Euro Stoxx 50, PSI, VIX, EUR/USD.
- **Ações que segues** — lista editável (vem com PSI, Europa e EUA; procura e junta outras).
- **Painel** — simples, como a Trade Republic: os meus ativos (a variação em 1D, 1S, 1M ou 1A) e o cartão **Hoje**, compacto — o resumo do Claude em 3 linhas e a próxima execução do plano; o plano, as ideias, o porquê dos movimentos, os riscos e a agenda numa dobra —; depois a cripto, os fundos e as ações que segues, e os índices, a energia e os combustíveis em linhas fechadas no fim.
- **Destaques** — simples, como a Análise: o sentimento do mercado com os índices do dia; os meus ativos e o que mais sobe e cai hoje, cada um com o porquê numa linha (o motivo do Claude ou a notícia do dia, com a cor de **boa ou má notícia**); as maiores subidas/descidas do mercado americano e o mercado cripto em linhas fechadas no fim.
- **Análise** — simples, como a Trade Republic: o prazo (curto, médio, longo ou desconto), o filtro e uma lista ordenada pela convicção 0–100 do Claude, com o veredicto de cada ativo (comprar, manter, reduzir, vender…); na ficha, os níveis (entrada, alvo, stop) e o porquê. Os sinais automáticos (tendência, momento, RSI, MACD, volatilidade, tom das notícias), toda a Trade Republic e os resultados ficam em linhas fechadas no fim.
- **Avisos** — notificação quando algo se mexe mais do que o limite escolhido.

Endereço: `https://nelsonsous.github.io/escolaplay/mercados/` (no telemóvel: *Partilhar → Adicionar ao ecrã principal*).

> Ferramenta pessoal: as decisões e a execução são tuas.

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
| `/search?q=mota` | procurar símbolos | 1 h |
| `/fuel?distrito=11` | mediana, média, mín./máx. e postos mais baratos (DGEG) | 1 h |
| `/fuel/distritos` | distritos da DGEG | 24 h |
| `GET/POST /journal` | diário das sugestões (KV `JOURNAL`) | — |
| `GET /advice[?date=]` | análise do Claude (só leitura) | 60 s |

O plano grátis da Cloudflare dá 100 000 pedidos/dia; com a app aberta a atualizar a cada 30 s são uns 3 000 por hora de uso.

## Conselheiro diário (Claude)

Duas vezes por dia (07:14 e 15:14), uma tarefa agendada do Claude segue [`CONSELHEIRO.md`](CONSELHEIRO.md): corre `conselheiro/dados.mjs` (todos os ativos que a app mostra — o que tens, ETF, cripto, ações da lista e as que juntaste, índices e futuros — numa linha compacta cada, com as outras fontes da decisão no fim da linha (analistas e revisões, fundamentos, sentimento, e a média delas sem o voto do Claude), o contexto do mercado (juros a 10 anos, dólar, Fear & Greed), notícias, agenda, diário e a avaliação dos veredictos anteriores; e um `modelo.json` com todos os ativos), escreve um veredicto por ativo (convicção 0–100 por prazo, entrada/alvo/stop, porquê), a sua classificação por prazo, o plano do mês e as lições, e publica com `conselheiro/publicar.mjs` no KV (os scripts são escritos em Onda: `conselheiro/onda/*.onda`) (`advice:<data>`, `advice:latest`, `advice:lessons`; o publicar recusa se faltar algum ativo). A app mostra-a no cartão **Hoje**, na **Análise** e na ficha de cada ativo (lida em `GET /advice`; a análise antiga, só com alguns veredictos, continua a ser lida). Não é preciso merge diário: só a base de dados muda; alterações às regras chegam como PR em rascunho, à sexta.

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

## Dados e limites

- Ações, índices e futuros: dados gratuitos do Yahoo Finance, que podem ter **até 15 min de atraso** nalgumas bolsas. A app atualiza a cada 30 s.
- Gasolina e gasóleo "internacionais" são futuros de Nova Iorque em USD/galão; o €/L mostrado é sem impostos nem margens. O preço nas bombas vem da DGEG.
- O tom das notícias é calculado por palavras-chave nos títulos (PT e EN): é uma pista rápida.

## Testes

```bash
node --test mercados/tests/*.test.*      # análise, decisão consolidada, Worker (fetch simulado), scripts do conselheiro, a app e os ecrãs em Onda
node mercados/tests/ui.test.js            # app no Chromium com todas as fontes simuladas
```
