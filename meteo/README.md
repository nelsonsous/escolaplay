# Meteo

App à parte (PWA instalável) com a previsão do tempo mais exata possível para um local preciso, a curto prazo
(próximas horas e dias) e a médio prazo (até 16 dias), com análise escrita pelo Claude.

Endereço: **https://nelsonsous.github.io/escolaplay/meteo/** (no telemóvel: iPhone *Partilhar → Adicionar ao ecrã
principal*; Android *⋮ → Instalar app*).

## O que junta

- **9 modelos de previsão** — ECMWF IFS (9 km), Met Office, Météo-France AROME (1,3 km) e ARPEGE, DWD ICON,
  ECMWF AIFS (IA), NOAA GFS, GEM, JMA e CMA, combinados num consenso ponderado que ignora o modelo que se afasta
  demasiado dos outros. Os modelos regionais de alta resolução entram sozinhos quando o local está no domínio.
- **212 cenários de 6 ensembles** — ECMWF ENS, AIFS ENS, Met Office MOGREPS-G, ICON-EPS, GEFS e GEPS, para as
  probabilidades (chuva ≥ 1 mm e ≥ 10 mm), intervalos P10–P90, confiança de cada dia e até quando a previsão é fiável.
- **Previsão oficial do IPMA** para o concelho mais próximo (até 15 km; 423 locais): hora a hora nos primeiros 3 dias
  e diária a 10 dias (AROME 2,5 km revista pelos meteorologistas). Entra no consenso como mais uma fonte, com peso alto
  nos primeiros dias (1,6, como o ECMWF), e aparece em **Fontes lado a lado**: hoje, amanhã e depois em cada modelo, no
  IPMA e no ensemble (P50 com P10–P90), com quem discorda e quanto.
- **Observações de várias estações** — todas as estações IPMA e METAR até 30 km, cada uma levada à altitude do ponto
  (0,65 °C por 100 m) e pesada pela distância, pela altitude parecida e por ser recente; as que destoam ficam de fora.
  A combinação corrige as próximas horas (a correção vai-se desvanecendo) e diz quanto se pode confiar nela.
- **Radar no ponto** ([RainViewer](https://www.rainviewer.com/api.html), que junta os radares meteorológicos, incluindo os
  do IPMA) — as 13 imagens das últimas 2 h (de 10 em 10 min), centradas no ponto (~0,9 km por píxel), lidas píxel a píxel:
  a cor de cada píxel dá os dBZ (tabela "Universal Blue") e os dBZ dão os mm/h (Marshall-Palmer, Z = 200·R^1,6). No ponto
  (média de 3×3 píxeis, ~2,8 km), em anéis à volta, o eco mais próximo até 40 km, o **deslocamento dos ecos** (o padrão
  de imagem para imagem numa caixa de ±60 km) e a **hora de chegada** ao ponto (a chuva que vai estar aqui daqui a t min
  está agora a v·t para montante). Com a imagem com ≤ 20 min, o radar manda no «agora» e nos primeiros 30–45 min das
  próximas 2 horas («A chover agora (fraca, 0,6 mm/h); …», «Sem chuva no radar; chuva a 12 km a sudoeste, deve chegar
  por volta das 21:10»), e depois volta aos modelos; diz também quando os modelos estão atrasados ou adiantados
  («o radar tem chuva no ponto desde as 20:10; os modelos só a dão às 22:15»). Os ecos parados (as cunhas fixas perto
  dos radares) não contam para a chegada. Sem radar, como antes.
- **«Está a chover?»** — no Agora, um toque diz o que se vê aí (chuva, chuva forte, não chove, nevoeiro, granizo,
  trovoada): o aviso manda no «agora» durante 45 min (guardado no telemóvel) e vai para o conector, onde a análise do
  Claude o compara com os modelos.
- **Relevo do ponto** — um só pedido de altitudes (o ponto e 12 rumos a 1,5 km e a 4 km, guardado para sempre) diz se o
  ponto está num **vale**, numa **encosta**, num **topo** ou numa **planície**, e quanto abaixo ou acima do relevo à volta
  (em Santo Tirso: *Vale · 70 m abaixo do relevo à volta*). Daí um ajuste local pequeno e sempre indicado: num vale, nas
  noites limpas (nuvens < 30%) e calmas (vento < 8 km/h), até −1,5 °C por cada 100 m de desnível (máx. 1,5 °C), também
  na mínima; num topo, vento e rajadas até +15%.
- **Verificação local** — compara as previsões a 1 dia dos últimos 7 dias com o que se mediu (METAR perto, ou várias
  estações com o histórico guardado) e corrige os vieses (ex.: em Lisboa o GFS estava 1,2 °C quente). O IPMA entra também,
  com as corridas anteriores guardadas pela tarefa agendada.
- **Aprendizagem acumulada** (1.5) — **o modelo que mais acerta no teu ponto ganha peso a cada dia que passa; o que falha
  perde.** Cada um dos 9 modelos é verificado dia a dia em três variáveis — **temperatura**, **chuva** (horas com chuva
  certas, com 1 h de tolerância, contra a chuva das estações, o tempo presente dos aeroportos e os teus avisos «Está a
  chover?») e **vento** — e em três prazos (**hoje**, **amanhã**, **3+ dias**), com as corridas de hoje, de ontem e de
  anteontem. A memória guarda até **90 dias** e os dias recentes contam mais (meia-vida de 21 dias). O peso de cada modelo
  no consenso é o de base × um fator que vai de ×¼ a ×4: (erro mediano ÷ erro do modelo)³, com uma força que cresce com os
  dias de prova — com 7 dias já conta, com 30 conta bem mais. A chuva e o vento partem do fator da temperatura e afastam-se
  dele com a sua própria prova. A memória fica no telemóvel (até 4 sítios) e, no local com a análise diária, também no
  conector (a tarefa agendada atualiza-a 4× por dia, por isso continua a aprender mesmo sem abrires a app). Em **Análise →
  Aprendizagem**: o fator e o erro de cada modelo por variável e prazo, quem é o mais certeiro, o atraso típico da chuva
  de cada modelo e a evolução dos pesos dia a dia. O Claude recebe o mesmo na análise.
- **Quando o IPMA falha** — se o IPMA publica as horas sem valores, o estado das fontes diz desde quando
  («em atraso: última observação …») e o histórico guardado dessas estações continua a servir para a verificação.
- **Mudança face a ontem**, **normais de 10 anos** (anomalia), **próximas 2 horas** de 15 em 15 minutos (radar e modelos).
- **Indicadores** — trovoada (CAPE), nevoeiro, geada, calor, vento, chuva forte, neve, UV, tendência da pressão.
- **Avisos oficiais do IPMA** do distrito.
- **Incêndios e satélite** — risco de incêndio do IPMA (RCM) do concelho, focos de calor por satélite (NASA FIRMS,
  VIIRS/MODIS, últimas 24 h, 50 km), ocorrências ativas da Proteção Civil (fogos.pt), regra 30-30-30, condições de
  propagação, e imagens Meteosat MTG (EUMETSAT): cor natural, infravermelho, relâmpagos, fogo, chuva e massas de ar; e a
  camada **Radar**: a última imagem do RainViewer sobre as nuvens, com o ponto ao centro (~240 ou ~470 km), e as últimas
  2 h a andar.

## Análise do Claude

Como o conselheiro dos Mercados, uma **tarefa agendada do Claude** segue [`ANALISTA.md`](ANALISTA.md) quatro vezes por
dia (07:34, 13:34, 17:34 e 20:34): para cada local registado lê a previsão, **vê as imagens de satélite** (de perto, ~280 km
com o ponto ao centro, e largas), lê o **radar no ponto** e os **avisos do utilizador** (o «agora» começa por eles; o erro
de tempo dos modelos vai para a verificação e as lições), verifica a análise anterior contra o que se observou, escreve a análise (título,
agora, hoje, amanhã, próximos dias, tendência, alertas, satélite, incêndios, conselhos, fiabilidade, análise técnica) e
guarda lições sobre o local para as seguintes.

A análise é **sobre o ponto exato**: o resumo que o Claude recebe começa por `## O ponto` (coordenadas, altitude, relevo,
o ponto do IPMA e as estações com distância, rumo e altitude) e pela tabela hora a hora das próximas 12 h ali; as regras
pedem o que acontece no ponto, em mm, km/h e °C, com os sistemas regionais só como causa («a banda de chuva a 80 km a
sudoeste deve chegar ao ponto por volta das 21h») e os efeitos do relevo (vale: geada, nevoeiro, inversões; topo:
vento). O `publicar.mjs` recusa frases genéricas sobre o distrito ou a região.

Na app a análise diária está **desligada por omissão**: o cartão «Análise do Claude» de um local sem análise oferece
**Ativar a análise diária do Claude para este local**. Cada telemóvel (cada instalação da app) tem **1 local**, e a análise
desse local só aparece nesse telemóvel (nunca a de outras pessoas por estar perto); ligar noutro sítio muda o local para
lá, com a última análise e as lições. Se o telemóvel não abrir a app durante **14 dias**, o local fica em pausa (não é
analisado) e volta quando a app for aberta. No máximo **15 locais** por corrida; os do dono nunca ficam de fora. O cartão e
o separador Análise dizem para que ponto é («Para Santo Tirso · 41,3354, −8,4745 · a 0,1 km do ponto selecionado»); a mais
de 2 km avisam e oferecem **Mudar a análise diária para este ponto** (o local muda de sítio e fica com a última análise e
as lições).

Opcional — análise imediata para qualquer local, pela API do Claude (paga à parte):

```bash
cd meteo/proxy && npx wrangler secret put ANTHROPIC_API_KEY
```

Ou no painel da Cloudflare: *Workers & Pages → meteo → Settings → Variables and Secrets → Add → Secret*.

O código do dono (para o painel "Utilização" e para gerir os locais de todos) é outro segredo, longo e ao acaso:

```bash
openssl rand -hex 16                               # gera um código
cd meteo/proxy && npx wrangler secret put OWNER_CODE
```

Sem ele a app funciona na mesma, mas ninguém é o dono (os locais de antes, sem dono, ficam à espera dele).

## Simples (1.7)

Como a app da Trade Republic: o essencial à vista e o resto em «Ver mais», que fica aberto enquanto a app está aberta.
- **Agora**: a temperatura, o que vem nas próximas 2 horas, os avisos que contam e o Claude com «Amanhã» (e o que
  vestir). Depois as próximas horas e os próximos 5 dias. O radar, as estações e o relevo ficam em «Detalhes» e os
  indicadores em «Indicadores». O gráfico das 2 horas só aparece com chuva a caminho.
- **Análise**: o essencial do Claude (resumo, alertas, amanhã, o que vestir); o resto em «Ver a análise completa». As
  fontes lado a lado, a fiabilidade, a aprendizagem, as observações e os modelos ficam em «Detalhes técnicos».
- **Ajustes**: Local, Notificações, Análise diária, Partilhar, Este telemóvel; o conector, o código do dono, a letra,
  o estado das fontes e as licenças em «Avançado».

## Quem usa a app (1.6.1)

Cada telemóvel tem um **código curto** (os primeiros 6 caracteres do seu id aleatório, ex.: `a1b2c3`) e, se a pessoa
quiser, um **nome** (Ajustes → Este telemóvel; até 40 caracteres, apaga-se deixando vazio), com o aviso de que só o dono
o vê. No painel **Utilização** o dono vê a lista: nome ou código, quando abriu a app, os locais com análise diária (só o
nome) e se tem notificações. A localização de quem usa a app não é registada.

## Notificações do fim do dia (1.6)

Em **Ajustes → Notificações**: «Resumo ao fim do dia», **às 19:00 por omissão** (a hora escolhe-se de 15 em 15 min, das
16:00 às 23:45). Traz a análise do Claude das **17:34** para o teu local: **como vai estar amanhã e o que vestir** (de manhã,
à tarde e à noite). **Ao domingo** (desligável) a notificação é **a semana que vem**. «Enviar uma agora» mostra já como fica.
Na própria análise há também as secções «O que vestir amanhã» e «A semana em resumo».

- Precisa da análise diária ligada para o local (é dela que vem o texto).
- No iPhone só funciona com a app **instalada no ecrã principal** (iOS 16.4 ou mais recente): Partilhar → «Adicionar ao
  ecrã principal», abrir a Meteo de lá e ligar em Ajustes. No Android e no computador, no browser ou instalada.
- Como funciona: o browser cria uma assinatura Web Push para o conector (chave pública VAPID do conector); o conector
  acorda de 15 em 15 min (Cron Trigger da Cloudflare), vê quem chegou à hora (no fuso do telemóvel) e envia a
  notificação **cifrada para o telemóvel** (RFC 8291: a Apple, a Google ou a Mozilla só a entregam, não a leem). As chaves
  VAPID são criadas no primeiro uso e ficam no KV do conector — nada para configurar.

## Partilhar

Em **Ajustes → Partilhar a Meteo** a app abre a partilha do telemóvel (ou copia o texto) com uma frase sobre a app, o
endereço e como a instalar:

- **iPhone**: abrir **https://nelsonsous.github.io/escolaplay/meteo/** no **Safari** → **Partilhar** → **«Adicionar ao ecrã
  principal»**.
- **Android**: abrir no **Chrome** → **⋮** → **«Instalar app»**.

É grátis, sem conta e sem publicidade. Cada instalação ganha uma identidade anónima (um id e um segredo ao acaso, só no
telemóvel); quem a recebe tem tudo, menos a análise do Claude, que é opcional e liga para 1 local.

**O dono** (eu) escreve o código uma vez em cada telemóvel seu, em **Ajustes → Conector de dados → «Sou o dono desta
app»** (no iPhone é o único caminho para a app do ecrã principal, que não partilha a memória com o Safari), ou abre
`https://nelsonsous.github.io/escolaplay/meteo/?dono=<código>` no browser — o código fica só nesse telemóvel e sai logo do
endereço (`?dono=` vazio ou «Esquecer o código» esquece-o). O código é o segredo `OWNER_CODE` do
conector (ver abaixo; nunca no repositório). O dono não tem limite de locais, vê os de todos (dos outros só o nome e a zona,
~1 km, nunca o ponto exato), pode desligá-los, e tem **Ajustes → Utilização**: telemóveis que abriram a app hoje, em 7 e em
30 dias; locais (os seus e os dos outros, em uso, em pausa, desligados — dos outros só o nome); análises do Claude por dia
nos últimos 7 dias (agendadas, imediatas, e quantas para os outros); e **Análise dos outros: ligada / só 1× por dia (07:34)
/ desligada**, para cortar as análises dos outros se for preciso.

## Conector

Como nos Mercados, a app é estática (GitHub Pages) e o que o browser não pode ler diretamente (METAR, NASA FIRMS,
fogos.pt, imagens EUMETSAT) passa por um Cloudflare Worker próprio, grátis, na pasta `proxy/` — que também guarda os
telemóveis (só o hash do segredo de cada um, e o dia em que abriu a app pela última vez), os locais (criar, mudar de ponto,
desligar), os avisos do utilizador («Está a chover?», os últimos 50 de cada local ou telemóvel, 30 dias), as análises do
Claude e os contadores do dia (KV). Grava pouco (o plano gratuito dá 1000 gravações por dia): cada telemóvel no máximo 1×
por dia. O radar (RainViewer) é lido diretamente pela app (CORS aberto). Já está publicado em
`https://meteo.mercados-proxy.workers.dev` e a app usa-o por omissão; para usar outro: **Ajustes → Conector de dados**,
ou abrir a app com `…/meteo/?proxy=https://…`.

```bash
cd meteo/proxy
npm install
npx wrangler deploy
```

## Como está feito

- `index.html`, `meteo.css`, `meteo.js` (+ módulos) — a PWA, sem dependências.
- `lib/` — o **motor**: junta as fontes e calcula tudo. Corre no telemóvel e na tarefa agendada (o plano gratuito
  da Cloudflare só dá 10 ms de CPU por pedido, por isso o Worker não faz contas). `lib/radar.js` lê o radar (cores →
  dBZ → mm/h, deslocamento, chegada); `lib/png.js` descodifica as imagens no Node (no browser, o canvas);
  `lib/places.js` diz de quem é cada local, quando fica em pausa e que locais entram em cada corrida (conector e tarefa).
- `proxy/` — o conector (Worker). `analista/` — scripts da tarefa agendada (`dados.mjs` recolhe, `publicar.mjs`
  valida e grava). `docs/API.md` — formato de todas as respostas.
- `tests/` — motor com dados reais de Lisboa (e o relevo real de Santo Tirso, Beja, Covilhã, Pinhão…), o radar com
  imagens sintéticas e 13 imagens reais de Santo Tirso, rotas do conector (identidade, dono, privacidade, pausa,
  contadores), a escolha dos locais de cada corrida e a app no Chromium com a rede simulada:

```bash
node --test meteo/tests/*.test.mjs
```

## Fontes e licenças

Dados de previsão: [Open-Meteo](https://open-meteo.com) (CC BY 4.0), com modelos do ECMWF, DWD, Météo-France,
Met Office, NOAA, ECCC, JMA e CMA, e a previsão oficial do [IPMA](https://api.ipma.pt) por concelho. Observações e
avisos: IPMA e NOAA Aviation Weather Center (METAR). Radar: [RainViewer](https://www.rainviewer.com) (API pública,
uso pessoal com atribuição). Altitudes: Open-Meteo (Copernicus DEM). Focos de calor: NASA FIRMS. Ocorrências: ANEPC via [fogos.pt](https://fogos.pt). Imagens: EUMETSAT.
Nomes de locais: OpenStreetMap/Nominatim.

> A previsão é automática e pode falhar; em situações de risco seguem-se sempre os avisos do IPMA e da Proteção Civil.
