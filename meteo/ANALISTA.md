# Analista do tempo (tarefa agendada do Claude)

Procedimento que a tarefa agendada segue **duas vezes por dia: 07:34 e 17:34 (hora de Lisboa)**, a seguir às corridas
das 00 e 12 UTC dos modelos (2× por dia desde 13/11/2026, para gastar menos). A das **17:34** é a que vai nas **notificações do fim do dia** (19:00 por
omissão, cada telemóvel escolhe a hora): amanhã no ponto e o que vestir; ao domingo, a semana que vem. Para mudar o comportamento muda-se este ficheiro, os scripts em
`meteo/analista/` e as regras em `meteo/lib/analysis.js`, e faz-se merge — o agendamento usa sempre o `main`.

Só os dados mudam (base de dados KV do Worker `meteo`). Não alteres código nem abras PR nesta tarefa.

**A análise é para o PONTO EXATO de cada local registado** (coordenadas, altitude e relevo no bloco `## O ponto` do
resumo), não para a região à volta.

**Quem tem análise.** Na app a análise diária está desligada por omissão: liga-a quem quer, para 1 local por telemóvel (o
dono da app, sem limite). Cada análise só aparece no telemóvel dono do local (e ao dono da app). O `dados.mjs` já escolhe os
locais de cada corrida (`selectPlaces` em `meteo/lib/places.js`): todos os do **dono** — nunca são cortados — e os dos
**convidados** (os outros telemóveis) que estão em uso, conforme **Ajustes → Utilização → Análise dos outros**: ligada;
só 1× por dia (só na corrida da manhã, pela hora de Lisboa); desligada. Fica de fora o local desligado, o de um telemóvel
que não abre a app há 14 dias (em pausa: volta quando abrir) e, acima de 15 locais, os dos convidados que abriram a app há
mais tempo. Analisa só os locais que o `dados.mjs` lista.

## Passos

1. Na raiz do repositório:

   ```bash
   NODE_USE_ENV_PROXY=1 node meteo/analista/dados.mjs
   ```

   Começa por dizer a análise dos outros (ligada, 1× ou desligada), se é a corrida da manhã, os locais a analisar com o
   **tipo de dono** de cada um (`dono` ou `convidado`) e os que ficam de fora, com o motivo. Depois mostra as **regras da
   análise** e, para cada local a analisar: o ponto exato, o que se observou nas últimas
   24 h, a análise anterior, as lições aprendidas sobre o local e o resumo numérico completo, que **começa por
   `## O ponto`** (nome, coordenadas, altitude, relevo — vale, encosta, topo ou planície, quanto abaixo ou acima do
   relevo à volta — e o efeito local já aplicado, o ponto da previsão oficial do IPMA e as estações usadas com distância,
   rumo e altitude) e pela tabela **hora a hora das próximas 12 h no ponto**; depois o consenso de 9 modelos e da
   previsão oficial do IPMA, 212 cenários de ensemble, o **radar no ponto** (`## Radar no ponto`: RainViewer, a chuva no
   ponto agora e nas últimas 2 h de 10 em 10 min, os anéis à volta, a chuva mais perto, o deslocamento dos ecos, a hora
   de chegada ou de fim e **Radar vs modelos** — quando os modelos estão atrasados ou adiantados), os **avisos do
   utilizador** (`## Avisos do utilizador`: o que se via no ponto, «Está a chover?», últimas 48 h), verificação local,
   a **aprendizagem no ponto** (`## Aprendizagem no ponto`: até 90 dias de memória — quem mais acerta aqui na temperatura,
   na chuva e no vento, hoje, amanhã e a 3+ dias, o fator de peso de cada modelo e o atraso típico da chuva), **Fontes lado
   a lado**, avisos IPMA e incêndios.
   No fim, a lista de imagens de satélite gravadas em `/tmp/meteo/` (as de perto primeiro). Se disser **"Sem locais a
   analisar"**, termina aqui. Os locais são processados com 3 s de intervalo (o Open-Meteo limita pedidos por minuto).

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
      («a chuva a 12 km a sudoeste chega ao ponto por volta das 21h10»); usa a verificação local e a **aprendizagem no ponto**
      para pesar os modelos (o consenso já os pesa assim; quando um modelo que costuma acertar aqui discorda do consenso,
      diz-o; o atraso típico da chuva de cada modelo ajuda a acertar a hora de chegada); **cruza a previsão oficial do IPMA com os modelos** e
      explica as divergências (Fontes lado a lado); liga o que o satélite mostra às próximas horas **no ponto**; no médio
      prazo fala em probabilidades; respeita os avisos do IPMA.
   3. **Escreve sobre o ponto** (regras abaixo) em `/tmp/meteo/analise-<id>.json` com os campos de `meteo/docs/API.md` →
      "Análise" (titulo, resumo, agora, hoje, amanha, dias, tendencia, alertas, incendios, satelite, conselhos,
      fiabilidade, tecnica, verificacao, licoes, **vestir**, **semana**, **notificacao** { amanha, semana }, **numeros**). `dias` começa
      depois de amanhã. `vestir`: o que vestir **amanhã** no ponto, de manhã, à tarde e à noite (temperatura e sensação nessas
      horas, chuva a que horas, vento, UV). `semana`: os próximos 7 dias em poucas palavras por dia. `notificacao.amanha` e
      `notificacao.semana` (até 180 caracteres cada, sem o nome do sítio, que já vai no título) são o texto das notificações:
      amanhã com o que vestir, e a semana (a de domingo). Escreve-os sempre — são o que a pessoa lê no ecrã bloqueado. Em `verificacao` diz o **erro de tempo
      dos modelos** visto no radar e nos avisos («os modelos davam chuva às 22h15; o radar já a tinha no ponto às 20h10:
      ~2 h de atraso») e quem mais acerta aqui segundo a aprendizagem («nas últimas semanas o ECMWF é o que menos erra
      a temperatura de amanhã: 1,1 °C; o GFS 2,2 °C»). Em `licoes` mantém as lições anteriores que continuem certas e junta o que aprendeste sobre o ponto
      (ex.: "o GFS aquece 1 °C a mais nas tardes de sol"; "nas noites limpas o vale fica 2 °C abaixo de Pedras Rubras";
      "os modelos atrasam ~2 h a chuva das frentes de sudoeste").
      **`numeros`** (obrigatório): o teu prognóstico em números para o ponto, um objeto por dia — hoje (se ainda faltar boa
      parte do dia), amanhã e depois — com `data`, `tmax` e `tmin` (°C), `chuva` (mm no dia) e `rajada` (km/h, a máxima).
      Ex.: `[{ "data": "2026-11-14", "tmax": 15.5, "tmin": 7, "chuva": 9, "rajada": 45 }, …]`. Parte do consenso (tabela de
      16 dias) e **corrige-o com o que ele não sabe**: o erro recente (secção «Previsto na véspera vs observado»: o que o
      consenso dava e o que as estações mediram, dia a dia — se erra há dias para o mesmo lado, corrige nesse sentido), o
      observado agora (estações, radar, avisos do utilizador), o relevo do ponto, as tuas lições e o satélite. Repetir o
      consenso quando a verificação mostra um erro que se repete é errar com ele. Sem razão para um dia, repete o consenso.
      Diz em `tecnica`, numa frase, onde te afastas do consenso e porquê.
      **A app junta estes números à média ponderada dos modelos** (máxima, mínima, chuva e rajadas de cada dia, espalhadas
      pelas horas) com um peso por variável que começa em 50% e **se afina sozinho**: o `dados.mjs` verifica os teus
      números anteriores contra as estações e contra o consenso da mesma altura (secção «Os teus números anteriores») e o
      peso sobe quando erras menos do que os modelos, desce quando erras mais (20% a 80%; `lib/nums.js`). Não exageres
      para dar ênfase nem arredondes.
   4. **Publica**:

      ```bash
      NODE_USE_ENV_PROXY=1 node meteo/analista/publicar.mjs /tmp/meteo/analise-<id>.json --model <o teu id de modelo>
      ```

      Se der erros de validação, corrige o JSON e repete. O `publicar.mjs` **recusa frases genéricas sobre a região**
      («no distrito do Porto», «no Minho e Douro Litoral», «no interior norte», «em toda a região»…): reescreve-as sobre o
      ponto e publica de novo. Só se a menção for mesmo indispensável junta `--regiao-ok`. Também recusa um local que foi
      desligado entretanto (salta-o). Cada análise publicada conta no dia (`stats:<data>`, o painel «Utilização» do dono:
      agendadas e quantas para convidados).

3. Termina com uma linha por local: `<nome> (<dono|convidado>): <título publicado>`.

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

- A app mostra a análise só no telemóvel dono do local (e ao dono da app), no cartão **Análise do Claude**, sempre com o
  ponto a que se refere («Para Santo Tirso · 41,3354, −8,4745 · a 0,1 km do ponto selecionado»). Se o ponto selecionado
  estiver a mais de 2 km, a app avisa e oferece **«Mudar a análise diária para este ponto»** (`PATCH /api/places/<id>`);
  num convidado, ligar a análise noutro sítio também muda o seu único local. O local fica com o mesmo id, por isso a última
  análise e as lições continuam; a próxima análise já é do ponto novo — revê as lições que dependam do sítio antigo.
- Os locais ligam-se na própria app (desligada por omissão; 1 por telemóvel, o dono sem limite). A lista está no KV
  (`places`; cada local com `owner`: o id do telemóvel ou `owner`, o dono — os de antes, sem dono, são do dono). Sem locais
  a analisar, a tarefa não faz nada.
- **Privacidade**: cada análise é só para o telemóvel do local. Escreve só sobre o ponto; nunca menciones outros locais
  registados nem quem os registou, e não ponhas as coordenadas exatas no texto (a app mostra-as a quem é dono do local).
- Os avisos do utilizador («Está a chover?» na app) do telemóvel dono do local ficam no KV em `reports:<id>` (os últimos
  50, 30 dias); o `dados.mjs` só os lê (do KV).
- O `dados.mjs` também guarda no KV as ocorrências da Proteção Civil (o fogos.pt recusa pedidos do Worker), o
  histórico horário das estações IPMA usadas em cada local (até 6; a fonte só dá 24 h), que a app usa na verificação
  local, e as corridas da previsão do IPMA de cada concelho (`ipma:runs:<id>`, 9 dias), para verificar também o IPMA.
- **Aprendizagem**: o `dados.mjs` verifica cada modelo no ponto dia a dia (temperatura e vento contra as estações; chuva
  contra a chuva das estações, o tempo presente do METAR e os avisos do utilizador) e junta os dias à memória do local
  (`learn:<id>`, até 90 dias; os recentes pesam mais). O peso de cada modelo no consenso cresce com os dias em que acerta
  mais do que os outros e desce quando falha — por variável e por prazo. A app do telemóvel dono do local lê a mesma
  memória (`GET /api/learning`) e mostra-a em **Análise → Aprendizagem**. Não escrevas na memória à mão.
- Se uma fonte falhar, o resumo diz qual (`Fontes: …`); analisa com o que houver e diz-o em `fiabilidade`. Quando o IPMA
  publica as horas sem valores (`obs=em atraso: última observação …`), as estações IPMA ficam de fora do «agora», mas o
  histórico guardado continua a servir para a verificação.
