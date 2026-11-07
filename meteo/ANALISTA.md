# Analista do tempo (tarefa agendada do Claude)

Procedimento que a tarefa agendada segue **três vezes por dia: 07:34, 13:34 e 20:34 (hora de Lisboa)**, a seguir
às corridas das 00, 06 e 12 UTC dos modelos. Para mudar o comportamento muda-se este ficheiro, os scripts em
`meteo/analista/` e as regras em `meteo/lib/analysis.js`, e faz-se merge — o agendamento usa sempre o `main`.

Só os dados mudam (base de dados KV do Worker `meteo`). Não alteres código nem abras PR nesta tarefa.

**A análise é para o PONTO EXATO de cada local registado** (coordenadas, altitude e relevo no bloco `## O ponto` do
resumo), não para a região à volta.

## Passos

1. Na raiz do repositório:

   ```bash
   NODE_USE_ENV_PROXY=1 node meteo/analista/dados.mjs
   ```

   Mostra as **regras da análise** e, para cada local registado na app: o ponto exato, o que se observou nas últimas
   24 h, a análise anterior, as lições aprendidas sobre o local e o resumo numérico completo, que **começa por
   `## O ponto`** (nome, coordenadas, altitude, relevo — vale, encosta, topo ou planície, quanto abaixo ou acima do
   relevo à volta — e o efeito local já aplicado, o ponto da previsão oficial do IPMA e as estações usadas com distância,
   rumo e altitude) e pela tabela **hora a hora das próximas 12 h no ponto**; depois o consenso de 9 modelos e da
   previsão oficial do IPMA, 212 cenários de ensemble, o **radar no ponto** (`## Radar no ponto`: RainViewer, a chuva no
   ponto agora e nas últimas 2 h de 10 em 10 min, os anéis à volta, a chuva mais perto, o deslocamento dos ecos, a hora
   de chegada ou de fim e **Radar vs modelos** — quando os modelos estão atrasados ou adiantados), os **avisos do
   utilizador** (`## Avisos do utilizador`: o que se via no ponto, «Está a chover?», últimas 48 h), verificação local,
   **Fontes lado a lado**, avisos IPMA e incêndios.
   No fim, a lista de imagens de satélite gravadas em `/tmp/meteo/` (as de perto primeiro). Se disser **"Sem locais
   registados"**, termina aqui. Os locais são processados com 3 s de intervalo (o Open-Meteo limita pedidos por minuto).

2. Para cada local:

   1. **Satélite** — abre cada imagem com a ferramenta Read **com `limit: 1`** (o plugin Token Optimizer bloqueia
      imagens lidas sem `limit`). Todas têm 720×540 píxeis, norte para cima e **o ponto no centro exato** (píxel
      360, 270); costa e fronteiras a branco. Começa pelas de perto:
      - `perto-geocolour`, `perto-rain`, `perto-lightning` (~280 × 210 km; 100 píxeis ≈ 39 km): o que está sobre o ponto ou a
        menos de ~100 km — nuvens, chuva, relâmpagos, nevoeiro no vale, céu limpo.
      - `geocolour` (~1200 km): nuvens de dia/noite — bandas frontais, células convectivas, nevoeiro, céu limpo.
      - `airmass` (~2500 km): vermelho/laranja = ar seco de altitude, intrusões estratosféricas, frentes e jato;
        verde = massa de ar quente e húmida; azul/violeta = ar frio polar.
      - `rain` (~800 km): precipitação estimada por satélite (H SAF).
      - `lightning` (~1200 km): áreas de relâmpagos detetadas pelo MTG (se não houver, fica igual à cor natural).
      - `ir` (~1200 km): topos das nuvens — quanto mais brancos, mais frios e altos (convecção).

      Para cada coisa que vai afetar o ponto, mede a **distância e o rumo a partir do centro** e estima **a hora de
      chegada** pelo deslocamento (imagens largas, vento, modelos).
   2. **Pensa como meteorologista de serviço para aquele ponto**: começa por verificar a análise anterior contra o
      observado — os avisos do utilizador e o radar dizem a que horas choveu de facto no ponto; o **«agora»** vem primeiro
      dos avisos do utilizador (alguém no sítio, o mais forte) e do radar no ponto (imagem de há poucos minutos), depois
      das estações, só depois dos modelos; para as próximas 1–2 h usa o deslocamento dos ecos e a hora de chegada do radar
      («a chuva a 12 km a sudoeste chega ao ponto por volta das 21h10»); usa a verificação local para pesar os modelos; **cruza a previsão oficial do IPMA com os modelos** e
      explica as divergências (Fontes lado a lado); liga o que o satélite mostra às próximas horas **no ponto**; no médio
      prazo fala em probabilidades; respeita os avisos do IPMA.
   3. **Escreve sobre o ponto** (regras abaixo) em `/tmp/meteo/analise-<id>.json` com os campos de `meteo/docs/API.md` →
      "Análise" (titulo, resumo, agora, hoje, amanha, dias, tendencia, alertas, incendios, satelite, conselhos,
      fiabilidade, tecnica, verificacao, licoes). `dias` começa depois de amanhã. Em `verificacao` diz o **erro de tempo
      dos modelos** visto no radar e nos avisos («os modelos davam chuva às 22h15; o radar já a tinha no ponto às 20h10:
      ~2 h de atraso»). Em `licoes` mantém as lições anteriores que continuem certas e junta o que aprendeste sobre o ponto
      (ex.: "o GFS aquece 1 °C a mais nas tardes de sol"; "nas noites limpas o vale fica 2 °C abaixo de Pedras Rubras";
      "os modelos atrasam ~2 h a chuva das frentes de sudoeste").
   4. **Publica**:

      ```bash
      NODE_USE_ENV_PROXY=1 node meteo/analista/publicar.mjs /tmp/meteo/analise-<id>.json --model <o teu id de modelo>
      ```

      Se der erros de validação, corrige o JSON e repete. O `publicar.mjs` **recusa frases genéricas sobre a região**
      («no distrito do Porto», «no Minho e Douro Litoral», «no interior norte», «em toda a região»…): reescreve-as sobre o
      ponto e publica de novo. Só se a menção for mesmo indispensável junta `--regiao-ok`.

3. Termina com uma linha por local: `<nome>: <título publicado>`.

## Escrever sobre o ponto

- **Agora**: o que se vê no ponto — o aviso do utilizador e o radar («a chover agora, fraca, 0,6 mm/h, desde as 20h10»;
  «sem chuva no radar; a chuva a 12 km a sudoeste chega por volta das 21h10»); se os modelos discordam, diz-o com o erro
  de tempo. As manchas em cunha paradas perto dos radares (ecos fixos) não são chuva.
- **O que acontece aqui**, hora a hora nas próximas horas, em números no ponto: «chuva fraca a partir das 21h, 2 a 4 mm
  até às 3h; mínima de 6 °C às 7h; rajadas de 40 km/h entre as 14h e as 17h».
- **Sistemas regionais só como causa**, com distância, direção e hora de chegada: «a banda de chuva a 80 km a sudoeste
  deve chegar ao ponto por volta das 21h»; «as células a 40 km a norte afastam-se para nordeste e não devem passar aqui».
- **Nunca** frases genéricas sobre o distrito, a região ou o país («chuva no distrito do Porto», «aguaceiros no Minho e
  Douro Litoral», «mais frio no interior norte»). Os avisos do IPMA são por distrito: diz o que significam **para o
  ponto** («o aviso amarelo de chuva até às 18h aplica-se aqui: 10 a 15 mm entre as 12h e as 16h»).
- **Efeitos locais do relevo** (bloco `O ponto` → Relevo e Efeito local):
  - **vale** — nas noites limpas e calmas o ar frio acumula-se no fundo: mínimas mais baixas, geada, nevoeiro de
    irradiação e inversão térmica de manhã; o vento é mais fraco. Diz a hora provável do nevoeiro e quando levanta.
  - **topo** — mais vento e rajadas, menos geada e menos nevoeiro de vale; nuvens baixas podem tocar o topo.
  - **encosta** — conta a orientação: virada a sul aquece mais ao sol; virada ao vento dominante, mais exposta.
  - **planície** — sem efeitos de relevo a destacar.
  A previsão já inclui um ajuste pequeno e conservador (até −1,5 °C nas noites limpas e calmas de um vale; +15% no
  vento de um topo): diz quando faz diferença e se achas que fica aquém (as lições servem para isso).
- **Estações**: diz quanto valem para o ponto (distância, rumo, altitude; se estão no mesmo vale ou num alto).
- **Incêndios** e **satélite** também com distância e rumo ao ponto.

## Notas

- A app mostra a análise do local registado mais próximo (até 10 km) no cartão **Análise do Claude**, sempre com o ponto
  a que se refere («Para Santo Tirso · 41,3354, −8,4745 · a 0,1 km do ponto selecionado»). Se o ponto selecionado estiver
  a mais de 2 km, a app avisa e oferece **«Mudar a análise diária para este ponto»** (`PATCH /api/places/<id>`): o local
  fica com o mesmo id, por isso a última análise e as lições continuam; a próxima análise já é do ponto novo — revê as
  lições que dependam do sítio antigo.
- Os locais registam-se na própria app (máx. 5). Sem locais, a tarefa não faz nada.
- Os avisos do utilizador («Está a chover?» na app) ficam no KV em `reports:<id>` (os últimos 50 de cada local, 30
  dias); o `dados.mjs` só os lê (`GET /api/reports`).
- O `dados.mjs` também guarda no KV as ocorrências da Proteção Civil (o fogos.pt recusa pedidos do Worker), o
  histórico horário das estações IPMA usadas em cada local (até 6; a fonte só dá 24 h), que a app usa na verificação
  local, e as corridas da previsão do IPMA de cada concelho (`ipma:runs:<id>`, 9 dias), para verificar também o IPMA.
- Se uma fonte falhar, o resumo diz qual (`Fontes: …`); analisa com o que houver e diz-o em `fiabilidade`.
