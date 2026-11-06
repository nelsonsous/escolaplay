# Analista do tempo (tarefa agendada do Claude)

Procedimento que a tarefa agendada segue **três vezes por dia: 07:34, 13:34 e 20:34 (hora de Lisboa)**, a seguir
às corridas das 00, 06 e 12 UTC dos modelos. Para mudar o comportamento muda-se este ficheiro, os scripts em
`meteo/analista/` e as regras em `meteo/lib/analysis.js`, e faz-se merge — o agendamento usa sempre o `main`.

Só os dados mudam (base de dados KV do Worker `meteo`). Não alteres código nem abras PR nesta tarefa.

## Passos

1. Na raiz do repositório:

   ```bash
   NODE_USE_ENV_PROXY=1 node meteo/analista/dados.mjs
   ```

   Mostra as **regras da análise** e, para cada local registado na app: o que se observou nas últimas 24 h, a
   análise anterior, as lições aprendidas sobre o local, o resumo numérico completo (consenso de 9 modelos,
   212 cenários de ensemble, verificação local, avisos IPMA, incêndios) e a lista de imagens de satélite gravadas em
   `/tmp/meteo/`. Se disser **"Sem locais registados"**, termina aqui.

2. Para cada local:

   1. **Satélite** — abre cada imagem com a ferramenta Read **com `limit: 1`** (o plugin Token Optimizer bloqueia
      imagens lidas sem `limit`). O local está sempre no centro; costa e fronteiras a branco.
      - `geocolour` (~1200 km): nuvens de dia/noite — bandas frontais, células convectivas, nevoeiro, céu limpo.
      - `airmass` (~2500 km): vermelho/laranja = ar seco de altitude, intrusões estratosféricas, frentes e jato;
        verde = massa de ar quente e húmida; azul/violeta = ar frio polar.
      - `rain` (~800 km): precipitação estimada por satélite (H SAF).
      - `lightning` (~1200 km): áreas de relâmpagos detetadas pelo MTG (se não houver, fica igual à cor natural).
      - `ir` (~1200 km): topos das nuvens — quanto mais brancos, mais frios e altos (convecção).
   2. **Pensa como meteorologista de serviço**: começa por verificar a análise anterior contra o observado; usa a
      verificação local para pesar os modelos; liga o que o satélite mostra (o que vem a caminho e a que
      velocidade) às próximas horas; no médio prazo fala em probabilidades; respeita os avisos do IPMA.
   3. **Escreve** `/tmp/meteo/analise-<id>.json` com os campos de `meteo/docs/API.md` → "Análise"
      (titulo, resumo, agora, hoje, amanha, dias, tendencia, alertas, incendios, satelite, conselhos, fiabilidade,
      tecnica, verificacao, licoes). `dias` começa depois de amanhã. Em `licoes` mantém as lições anteriores que
      continuem certas e junta o que aprendeste (ex.: "o GFS aquece 1 °C a mais nas tardes de sol").
   4. **Publica**:

      ```bash
      NODE_USE_ENV_PROXY=1 node meteo/analista/publicar.mjs /tmp/meteo/analise-<id>.json --model <o teu id de modelo>
      ```

      Se der erros de validação, corrige o JSON e repete.

3. Termina com uma linha por local: `<nome>: <título publicado>`.

## Notas

- A app mostra a análise do local registado mais próximo (até 10 km) no cartão **Análise do Claude**.
- Os locais registam-se na própria app (máx. 5). Sem locais, a tarefa não faz nada.
- O `dados.mjs` também guarda no KV as ocorrências da Proteção Civil (o fogos.pt recusa pedidos do Worker) e o
  histórico horário da estação IPMA de cada local (a fonte só dá 24 h), que a app usa na verificação local.
- Se uma fonte falhar, o resumo diz qual (`Fontes: …`); analisa com o que houver e diz-o em `fiabilidade`.
