# Maestro de música (tarefa agendada do Claude)

Procedimento que a tarefa agendada segue **duas vezes por dia: 07:44 e 18:44 (hora de Lisboa)**. Para mudar o
comportamento, muda-se este ficheiro (e os scripts em `musica/curador/`) e faz-se merge — o agendamento usa sempre o
`main`.

Só os dados mudam (pelo Worker `musica`: playlists no Tidal e na biblioteca da app). Não alteres código nem abras PR
nesta tarefa.

## Quem ouve

- O Nelson ouve no **Tidal**, sem perdas, em casa e muito no **carro** (BMW, CarPlay). Gosta de **gravações
  excelentes** — faixas bem gravadas e bem masterizadas, que mostrem o som (qualidade de gravação é critério, não um
  extra).
- Quer **música de qualidade de vários géneros e de várias épocas**: o que está a dar agora e vale a pena, e clássicos
  que resistem ao tempo — sem ficar preso ao que já ouve, mas a partir do que ouve.
- A API do Tidal não dá o histórico de reprodução. O gosto lê-se das **favoritas** (as mais recentes pesam mais), dos
  **artistas seguidos** e das **playlists dele** — tudo no `dados.md`.
- Escreve sempre em **português de Portugal**.
- **Várias pessoas**: o Nelson pode convidar outras pessoas (cada uma liga o seu Tidal). O `dados.md` tem uma
  secção por pessoa (`# Pessoa: <nome> (`<id>`)`) — o gosto, os pedidos, a playlist da semana e as novidades de cada
  uma são **dela**: não mistures gostos entre pessoas. O dono é `dono`.

## Passos

1. Na raiz do repositório (`git pull` primeiro):

   ```bash
   NODE_USE_ENV_PROXY=1 node musica/curador/dados.mjs /tmp/musica
   ```

   Lê `/tmp/musica/dados.md`. Se disser **"Tidal não ligado"**, termina aqui (diz no resumo final que falta ligar o
   Tidal na app).

2. **Decide o que fazer nesta corrida**:
   - **Pedidos à espera** (feitos na app): trata até **2** por corrida, os mais antigos primeiro — uma playlist por
     pedido, a respeitar o texto e as opções do pedido.
   - **Playlist da semana**: se o `dados.md` disser *"está na altura de uma nova"* (ou que ainda não há nenhuma) e for
     a corrida da **manhã**, cria a **«Onda da semana · dd/mm»**.
   - **Novidades dos teus artistas**: se o `dados.md` disser *"É sexta de manhã: cria a playlist «Novidades dos teus
     artistas · dd/mm»"*, cria-a só com as faixas da secção *Novidades* (põe o `tidalId` de cada uma na proposta; não é
     preciso pesquisar na web). Com menos de 5 faixas, não a cries.
   - **Playlists que se atualizam sozinhas** (secção do `dados.md`, ligadas na app): renova as que disserem *"está na
     altura de a renovar"*, até **2** por corrida, com o mesmo critério (o pedido e as opções que lá estão). Mantém as
     que a pessoa guardou (põe-nas com o `tidalId` e `"fixa": true`), não voltes a pôr as que ela tirou, e troca pelo
     menos metade das outras por faixas novas. Publica com `--renovar <id>` (passo 6).
   - Se não houver nada disto, **termina aqui** (sem pesquisar nada).
   - **As tuas mixes do Tidal** (secção do `dados.md`): são faixas que o Tidal escolheu para o teu gosto. Quando
     encaixarem num pedido ou na playlist da semana, usa-as como candidatas, com o `tidalId` (não contam como
     pesquisa: junta-lhes sempre outras que tenhas encontrado na web).
   - **Tendências** (secção do `dados.md`): o que as tabelas do Apple Music (Portugal, EUA) e do Deezer (mundo) mostram,
     recolhido pelo conector todos os dias, com o que **sobe**, o que é **novo** e o que **dura**, e o «para ti» (o que
     disso encaixa no gosto da pessoa). Usa-as na playlist da semana (a parte recente) e para dar o `tendencia` das
     candidatas com dados reais: a subir ~80, nova ~70, no top 10 ~70, dura ~50. São um sinal do que se ouve, não de
     qualidade: só entram as que também passam no critério de qualidade.

3. **Pesquisa na web** (antes de escolher):
   - **Playlist da semana** — o que está na moda **e** tem qualidade: lançamentos recentes com boa crítica (Pitchfork
     *Best New Music*, The Guardian, NPR *New Music Friday*, Bandcamp Daily, The Quietus, Album of the Year/Metacritic),
     o que está a subir (Billboard, Official Charts, virais — como sinal, não como critério), a cena portuguesa (Antena
     3, Blitz, Rimas e Batidas), jazz (DownBeat, JazzTimes), clássica (Gramophone), eletrónica (Resident Advisor),
     reedições e remasterizações de referência, aniversários de discos marcantes, e gravações conhecidas pela qualidade
     do som (ex.: *Records to Die For* da Stereophile). Cruza com o gosto do `dados.md`.
   - **Pedido** — pesquisa o que o pedido pede (género, época, ambiente, artistas), com o mesmo cuidado com a qualidade.
   - Guarda as tendências que usares (o quê e onde se viu) para o campo `tendencias`.

4. **Escreve a proposta** em `/tmp/musica/proposta.json` (formato em `musica/lib/playlist.js`):

   ```json
   {
     "nome": "Onda da semana · 13/11",
     "descricao": "até 300 caracteres — vai para o Tidal",
     "resumo": "2 a 6 frases: o que tens ouvido (das favoritas), o que está a dar e porque estas escolhas",
     "tendencias": ["Álbum X — Melhor Música Nova na Pitchfork esta semana", "…"],
     "opcoes": { "faixas": 30, "maxArtista": 2, "estilo": "descoberta", "arco": "onda" },
     "candidatas": [
       { "artista": "…", "titulo": "…", "ano": 1972, "genero": "soul", "nota": 92, "energia": 55, "tendencia": 0,
         "motivo": "até 140 caracteres, concreto: porque esta faixa, nesta playlist" }
     ]
   }
   ```

   Regras:
   - **Só gravações reais e publicadas**, com artista e título como aparecem nos serviços de streaming (versão de
     estúdio original, salvo pedido em contrário). Nada inventado.
   - **Entre 1,5× e 2× o número de faixas** em candidatas: o motor Onda escolhe e ordena, e algumas podem não estar no
     Tidal. Vários artistas — o motor respeita o máximo por artista.
   - Em cada candidata: `ano` = ano **original** da gravação (não o da remasterização); `genero` = uma etiqueta curta,
     sempre a mesma para o mesmo género dentro da proposta (o motor usa-a para espalhar os géneros); `nota` 0–100 =
     quão boa e adequada é (composição, interpretação, **gravação**, encaixe no pedido); `energia` 0–100 (calma ~20,
     média ~50, dançável 80+); `tendencia` 0–100 **só** para o que está mesmo a dar agora, com base na pesquisa (o
     resto, 0 ou sem campo); `motivo` em português de Portugal, concreto.
   - **Playlist da semana**: ~40% recente (últimos 12 meses, com boa crítica ou a subir), ~35% de várias décadas
     (dos anos 50 aos 2010), ~25% perto do gosto dele (artistas e géneros de que gosta, **sem** repetir favoritas);
     pelo menos 5 géneros. Opções: `"faixas": 30, "maxArtista": 2, "estilo": "descoberta", "arco": "onda"`.
   - **Pedido**: as opções do pedido (faixas, máximo por artista, estilo, arco) — copia-as para `opcoes`. Se o pedido
     disser **sem letras explícitas**, põe também `"limpa": true`: o conector procura a versão limpa de cada faixa (as
     que só existem explícitas aparecem nas "não encontradas" do ensaio — troca-as por outras).
   - **Como correram as playlists** (secção do `dados.md`, automática): é o peso do que resultou. Puxa pelos artistas,
     géneros e ambientes das que *resultaram* ou ficaram *boas*, e das faixas que a pessoa guardou; vai menos por onde
     *não resultou* ou foi *apagada*; e **nunca** proponhas as faixas da lista *"Não voltes a propor"*.
   - Não repetir faixas das últimas playlists do Maestro (lista no `dados.md`) nem favoritas dele, salvo se o pedido
     pedir.
   - Estilos: `equilibrado`, `descoberta` (mais novidade), `moda` (mais tendência), `gosto` (mais perto do que ouve),
     `audiofilo` (mais qualidade de som). Arcos: `onda` (sobe até ~2/3 e acalma), `sobe` (treino, festa), `desce`
     (fim do dia), `plano`.

5. **Ensaio**, para ver quantas o Tidal encontra e como fica:

   ```bash
   NODE_USE_ENV_PROXY=1 node musica/curador/publicar.mjs /tmp/musica/proposta.json --ensaio
   ```

   Se faltarem muitas (lista "não encontradas"), troca-as por outras (ou corrige o título/artista) e repete. Se o motor
   disser que **só conseguiu X de Y** faixas, acrescenta candidatas de outros artistas. Vê a mistura de géneros,
   décadas e qualidade no fim — se estiver desequilibrada face às regras, ajusta a proposta.

6. **Publica** (cria a playlist no Tidal, pela ordem do motor, e guarda-a na biblioteca da app):

   ```bash
   NODE_USE_ENV_PROXY=1 node musica/curador/publicar.mjs /tmp/musica/proposta.json --modelo <id do modelo>
   ```

   Para um pedido, junta `--pedido <id>` (fica marcado como feito e ligado à playlist). Para renovar uma playlist que
   se atualiza sozinha, escreve a proposta noutro ficheiro (ex.: `/tmp/musica/renovar-<id>.json`, com o mesmo `nome`)
   e publica-a com `--renovar <id>` em vez de `--pedido`: fica no mesmo sítio da app e no mesmo link do Tidal. Se o Worker responder
   `tidal_desligado` (sessão expirada), termina e diz no resumo que é preciso **ligar o Tidal outra vez na app**.

   **Para outra pessoa** (não o dono): escreve a proposta na pasta dela, `/tmp/musica/<id>/proposta.json` (o
   `perfil.json` dela já lá está), e junta `--utilizador <id>` ao ensaio e à publicação — a playlist vai para o Tidal
   e para a biblioteca **dessa pessoa**. Em cada corrida trata no máximo **3 pedidos no total**, os mais antigos
   primeiro e alternando entre pessoas; os outros ficam para a corrida seguinte.

7. Termina com um resumo curto: o que criaste (para quem, nome, ligação do Tidal, número de faixas e duração), a mistura
   (géneros, décadas) e 2–3 destaques.
