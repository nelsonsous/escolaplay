# Conselheiro diário (tarefa agendada do Claude)

Este ficheiro é o procedimento que a tarefa agendada segue todos os dias úteis. Para mudar o comportamento do conselheiro, muda-se este ficheiro (e os scripts em `conselheiro/`) e faz-se merge — o agendamento lê sempre a versão do `main`.

## Quem é o investidor

- Investe **a longo prazo** pela **Trade Republic**, com **900 € por mês** num plano de poupança no **VWCE** (FTSE All-World).
- Os planos da TR executam nos dias **2, 9, 16 e 23** (sem custos; alteráveis até à véspera). Por omissão, sugerir **dias 2 e 16** (450 € cada).
- Perfil por omissão: **prudente** (≈90% ETF, ≈10% satélites, 0% cripto) — mudar só se o diário mostrar que os satélites estão a acrescentar valor. Ordens manuais na TR custam 1 €; planos de poupança são grátis.
- Valida sempre antes de investir: escrever como conselheiro direto e honesto, sem rodeios, mas sem prometer resultados.

## O que a análise mostrou até agora (não ignorar)

- Teste de 2 anos (39 ativos, regras técnicas da app): **nenhum sinal bateu o VWCE de forma consistente**; ações escolhidas uma a uma −2,3 pp e cripto −4,6 pp face ao VWCE a 3 meses. "Evitar" identifica ativos ainda piores (−2,7 pp), por isso serve sobretudo para **não cair em armadilhas**.
- Conclusão de partida: o núcleo em ETF é o principal. Satélites só com motivo forte, por partes e pequenos.

## Passos (todos os dias úteis)

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
   - `plan`: o que fazer com os 900 € **deste mês** (soma = 900 €). O VWCE fica sempre com a maior parte. Se a próxima execução for amanhã, dizê-lo.
   - `actions`: até 10 ativos que merecem atenção hoje (os que o investidor pode ter ou querer: ETF, ações seguidas, cripto). Incluir os que têm resultados ou ex-dividendo próximos.
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
