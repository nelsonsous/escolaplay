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
  estações com o histórico guardado): o modelo mais certeiro no teu local pesa mais e os vieses são corrigidos (ex.: em
  Lisboa o GFS estava 1,2 °C quente). O IPMA entra também, com as corridas anteriores guardadas pela tarefa agendada.
- **Mudança face a ontem**, **normais de 10 anos** (anomalia), **próximas 2 horas** de 15 em 15 minutos (radar e modelos).
- **Indicadores** — trovoada (CAPE), nevoeiro, geada, calor, vento, chuva forte, neve, UV, tendência da pressão.
- **Avisos oficiais do IPMA** do distrito.
- **Incêndios e satélite** — risco de incêndio do IPMA (RCM) do concelho, focos de calor por satélite (NASA FIRMS,
  VIIRS/MODIS, últimas 24 h, 50 km), ocorrências ativas da Proteção Civil (fogos.pt), regra 30-30-30, condições de
  propagação, e imagens Meteosat MTG (EUMETSAT): cor natural, infravermelho, relâmpagos, fogo, chuva e massas de ar; e a
  camada **Radar**: a última imagem do RainViewer sobre as nuvens, com o ponto ao centro (~240 ou ~470 km), e as últimas
  2 h a andar.

## Análise do Claude

Como o conselheiro dos Mercados, uma **tarefa agendada do Claude** segue [`ANALISTA.md`](ANALISTA.md) três vezes por
dia (07:34, 13:34 e 20:34): para cada local registado lê a previsão, **vê as imagens de satélite** (de perto, ~280 km
com o ponto ao centro, e largas), lê o **radar no ponto** e os **avisos do utilizador** (o «agora» começa por eles; o erro
de tempo dos modelos vai para a verificação e as lições), verifica a análise anterior contra o que se observou, escreve a análise (título,
agora, hoje, amanhã, próximos dias, tendência, alertas, satélite, incêndios, conselhos, fiabilidade, análise técnica) e
guarda lições sobre o local para as seguintes.

A análise é **sobre o ponto exato**: o resumo que o Claude recebe começa por `## O ponto` (coordenadas, altitude, relevo,
o ponto do IPMA e as estações com distância, rumo e altitude) e pela tabela hora a hora das próximas 12 h ali; as regras
pedem o que acontece no ponto, em mm, km/h e °C, com os sistemas regionais só como causa («a banda de chuva a 80 km a
sudoeste deve chegar ao ponto por volta das 21h») e os efeitos do relevo (vale: geada, nevoeiro, inversões; topo:
vento). O `publicar.mjs` recusa frases genéricas sobre o distrito ou a região.

Na app, **Análise diária do Claude para este local** regista o local (máx. 5; a análise aparece num raio de 10 km). O
cartão e o separador Análise dizem para que ponto é («Para Santo Tirso · 41,3354, −8,4745 · a 0,1 km do ponto
selecionado»); a mais de 2 km avisam e oferecem **Mudar a análise diária para este ponto** (o local muda de sítio e fica
com a última análise e as lições).

Opcional — análise imediata para qualquer local, pela API do Claude (paga à parte):

```bash
cd meteo/proxy && npx wrangler secret put ANTHROPIC_API_KEY
```

Ou no painel da Cloudflare: *Workers & Pages → meteo → Settings → Variables and Secrets → Add → Secret*.

## Conector

Como nos Mercados, a app é estática (GitHub Pages) e o que o browser não pode ler diretamente (METAR, NASA FIRMS,
fogos.pt, imagens EUMETSAT) passa por um Cloudflare Worker próprio, grátis, na pasta `proxy/` — que também guarda os
locais (criar, mudar de ponto, desligar), os avisos do utilizador («Está a chover?», os últimos 50 de cada local, 30 dias)
e as análises do Claude (KV). O radar (RainViewer) é lido diretamente pela app (CORS aberto). Já está publicado em
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
  dBZ → mm/h, deslocamento, chegada); `lib/png.js` descodifica as imagens no Node (no browser, o canvas).
- `proxy/` — o conector (Worker). `analista/` — scripts da tarefa agendada (`dados.mjs` recolhe, `publicar.mjs`
  valida e grava). `docs/API.md` — formato de todas as respostas.
- `tests/` — motor com dados reais de Lisboa (e o relevo real de Santo Tirso, Beja, Covilhã, Pinhão…), o radar com
  imagens sintéticas e 13 imagens reais de Santo Tirso, rotas do conector e a app no Chromium com a rede simulada:

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
