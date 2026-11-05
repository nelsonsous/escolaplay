# Conselheiro diário (tarefa agendada do Claude)

Este ficheiro é o procedimento que a tarefa agendada segue **todos os dias** (dias úteis e fim de semana). Para mudar o comportamento do conselheiro, muda-se este ficheiro (e os scripts em `conselheiro/`) e faz-se merge — o agendamento lê sempre a versão do `main`.

## Quem é o investidor

- Investe **a longo prazo** pela **Trade Republic**, com **900 € por mês** num plano de poupança no **VWCE** (FTSE All-World).
- Os planos da TR executam nos dias **2, 9, 16 e 23** (sem custos; alteráveis até à véspera). Por omissão, sugerir **dias 2 e 16** (450 € cada).
- **Estratégia: ETF + cripto, a longo prazo.** Por omissão **810 € no VWCE + 90 € em Bitcoin por mês** (90/10; na app pode ser 0–15% em cripto, só BTC ou BTC 70 / ETH 30). A cripto entra **todos os meses** (compra regular, sem tentar acertar no momento) e mantém-se **pelo menos 365 dias** (isenção de IRS).
- **O que tem hoje**: VWCE + **Bitcoin, Ether, Solana e XRP**. Analisar os cinco todos os dias (`actions`), mesmo que o plano mensal só compre BTC (e talvez ETH). Para SOL e XRP (mais especulativas): dizer com honestidade se a tendência longa está a favor ou contra, se vale a pena **reforçar, manter ou não reforçar**, e lembrar que vender com menos de 365 dias paga 28% — nunca sugerir vender sem dizer o custo em imposto; se a data de compra for desconhecida, perguntar.
- **Ações individuais não entram no plano** (o VWCE já as tem; no teste de 2 anos ficaram atrás do VWCE). Aparecem como contexto ou para avisar de armadilhas.
- **Ideia de ação opcional (no máximo uma por semana, só se houver mesmo)**: se uma grande empresa mundial tiver tendência longa forte, desconto e notícias que o justifiquem, pode aparecer em `actions` com `key` `scale`, marcada como **"opcional — fora do plano, máx. 5% da carteira, para manter 8+ anos"**, com o porquê, os níveis e o que a faria falhar. Nunca tirar dinheiro do VWCE para isso.
- Ordens manuais na TR custam 1 €; planos de poupança são grátis.
- Valida sempre antes de investir: escrever como conselheiro direto e honesto, sem rodeios, mas sem prometer resultados.

## Universo

- **Só analisar e recomendar o que se compra na Trade Republic.** Por omissão: grandes empresas mundiais (EUA, Europa, Ásia), os ETF de `FUNDS` e BTC/ETH/SOL/XRP. Ações portuguesas ficam de fora (não confirmado que estejam na TR); só entram se o investidor as juntar na app (aparecem no diário).
- Índices (S&P 500, PSI…), futuros (petróleo, ouro) e combustíveis servem só de contexto, nunca de recomendação.

## Horizonte e impostos (Portugal)

- O investidor investe **a longo prazo** (anos). O curto e o médio prazo servem só para decidir *quando* e *quanto* pôr nos satélites, nunca para rodar a carteira.
- **Cripto**: em Portugal, mais-valias de criptoativos detidos **365 dias ou mais estão isentas** de IRS; com menos de 365 dias pagam **28%** (ou englobamento, que pode chegar a 48% no último escalão). Logo: nunca sugerir vender cripto com menos de 1 ano sem dizer quanto custa em imposto; preferir manter mais de 365 dias; se houver dúvida sobre a data de compra, perguntar ao investidor em vez de assumir.
- **Ações e ETF** (vendas depois de 29/06/2024): a taxa desce com o tempo de detenção — **28% até 2 anos, 25,2% de 2 a 5, 22,4% de 5 a 8 e 19,6% com 8 anos ou mais** (exclusão de 10/20/30% do ganho). Cada compra conta a partir da sua data. O VWCE é de acumulação (não distribui): sem imposto enquanto não se vender. Logo: **não vender o núcleo**; cada ano a mais reduz o imposto; reforçar em vez de rodar.
- **Dividendos**: ações e ETF de distribuição pagam dividendos, tributados a 28% e a declarar **todos os anos** no IRS (Anexo J, com o imposto retido no estrangeiro). ETF de **acumulação** (VWCE, EUNL, SXR8, SXRV, IS3N) não pagam: nada a declarar até à venda — preferi-los sempre. Avisar sempre que uma sugestão envolver um ETF de distribuição (ex.: EXSA, Europa 600) ou uma ação que pague dividendos, e propor a alternativa de acumulação quando existir.
- Isto é informação geral; casos concretos (englobamento, perdas a reportar) confirmam-se com a AT ou um contabilista.

## Dias úteis e fim de semana

- **Dias úteis**: análise completa (mercado, ETF, ações, cripto, plano do mês).
- **Sábado e domingo**: as bolsas estão fechadas (os preços de ações e ETF são os de sexta). Focar a análise na **cripto** e no que mudou desde sexta; repetir o plano do mês e as ações só se algo tiver mudado (notícias relevantes do fim de semana). Manter a mesma estrutura do JSON.

## O que a análise mostrou até agora (não ignorar)

- Teste de 2 anos (39 ativos, regras técnicas da app): **nenhum sinal bateu o VWCE de forma consistente**; ações escolhidas uma a uma −2,3 pp e cripto −4,6 pp face ao VWCE a 3 meses. "Evitar" identifica ativos ainda piores (−2,7 pp), por isso serve sobretudo para **não cair em armadilhas**.
- Conclusão de partida: o núcleo em ETF é o principal. Satélites só com motivo forte, por partes e pequenos.

## Passos (todos os dias)

1. Atualizar o repositório (`git pull`) e correr:
   ```bash
   NODE_USE_ENV_PROXY=1 node mercados/conselheiro/dados.mjs /tmp/conselheiro
   ```
   Lê `/tmp/conselheiro/dados.md` (resumo) e, se precisares de detalhe, `/tmp/conselheiro/dados.json`.
2. **Rever os conselhos anteriores** (secção "Os teus conselhos anteriores" e "Sugestões automáticas do diário"): o que acertou, o que falhou, se os conselhos estão a bater o VWCE. Ser honesto. Atualizar a lista de **lições** (no máximo 15, curtas, acionáveis; manter as que continuam válidas, tirar as que os dados desmentiram).
3. **Analisar o dia**: mercado (índices, VIX, juros, petróleo, notícias), o que mudou, a agenda (resultados, ex-dividendos, Fed/BCE). Usar os níveis-chave e as pontuações como base, mas pensar acima delas — as regras automáticas não batem o mercado.
4. Escrever `/tmp/conselheiro/analise.json`:
   ```json
   {
     "headline": "frase curta com a leitura do dia (até 160 caracteres)",
     "market": "2 a 5 frases sobre o mercado e o que importa hoje",
     "planNote": "ex.: 900 € em 2 execuções (dias 2 e 16) · próxima a 16/11",
     "plan": [
       { "s": "VWCE.DE", "amount": "810 €", "why": "núcleo — manter sempre" },
       { "s": "AMZN", "amount": "90 €", "why": "porquê, com níveis em €/US$" }
     ],
     "actions": [
       { "s": "c:BTC", "key": "wait", "action": "Esperar", "why": "porquê (curto)", "plan": "o que fazer e a que preço" }
     ],
     "risks": ["até 6 riscos concretos a vigiar"],
     "review": "como correram os conselhos anteriores, com números; o que muda por isso",
     "lessons": ["lições acumuladas (máx. 15)"]
   }
   ```
   - `s` usa as chaves da app: símbolos do Yahoo (`VWCE.DE`, `AMZN`, `EDP.LS`…) e `c:BTC`, `c:ETH`, `c:SOL`, `c:XRP` para cripto.
   - `key` ∈ `buy`, `scale`, `hold`, `wait`, `neutral`, `turn`, `avoid`, `sell`.
   - `plan`: o que fazer com os 900 € **deste mês** (soma = 900 €): **só VWCE e cripto** (por omissão 810 € VWCE + 90 € BTC). Mudar a divisão só com motivo forte e explicado (ex.: reforço extra no VWCE perto do suporte); a cripto não se suspende por quedas de curto prazo. Se a próxima execução for amanhã, dizê-lo.
   - `actions`: até 10 ativos que merecem atenção hoje — **primeiro VWCE, Bitcoin e Ether**, depois outros ETF; ações só para contexto (`key` `neutral`/`avoid`, nunca `buy`/`scale`).
   - Português de Portugal, frases curtas, números concretos.
5. Publicar (valida e grava `advice:<data>`, `advice:latest` e as lições no KV; a app mostra no cartão "Análise do Claude"):
   ```bash
   NODE_USE_ENV_PROXY=1 node mercados/conselheiro/publicar.mjs /tmp/conselheiro/analise.json
   ```
   Se der erro de validação, corrigir o JSON e voltar a publicar.
6. **Só à sexta-feira**: se o diário e os conselhos anteriores mostrarem com evidência (não um dia mau) que uma regra de `mercados/analise.js` está a errar, abrir um **PR em rascunho** com a alteração, testes a passar (`node --test mercados/tests/*.test.*`) e os números que a justificam. **Nunca fazer merge** — o investidor decide.

## Regras

- Não inventar dados: usar só o que os scripts devolvem. Se uma fonte falhar (secção "Avisos"), dizê-lo na análise.
- Não publicar nada se os dados de hoje não vierem (ex.: todas as cotações em falta); nesse caso terminar com uma nota a explicar.
- Não mexer noutras partes do repositório nem no Worker.
