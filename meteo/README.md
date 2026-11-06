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
- **Observações** — a estação IPMA ou METAR mais próxima corrige as próximas horas (a correção vai-se desvanecendo).
- **Verificação local** — compara as previsões a 1 dia dos últimos 7 dias com o que a estação mediu: o modelo mais
  certeiro no teu local pesa mais e os vieses são corrigidos (ex.: em Lisboa o GFS estava 1,2 °C quente).
- **Mudança face a ontem**, **normais de 10 anos** (anomalia), **próximas 2 horas** de 15 em 15 minutos.
- **Indicadores** — trovoada (CAPE), nevoeiro, geada, calor, vento, chuva forte, neve, UV, tendência da pressão.
- **Avisos oficiais do IPMA** do distrito.
- **Incêndios e satélite** — risco de incêndio do IPMA (RCM) do concelho, focos de calor por satélite (NASA FIRMS,
  VIIRS/MODIS, últimas 24 h, 50 km), ocorrências ativas da Proteção Civil (fogos.pt), regra 30-30-30, condições de
  propagação, e imagens Meteosat MTG (EUMETSAT): cor natural, infravermelho, relâmpagos, fogo, chuva e massas de ar.

## Análise do Claude

Como o conselheiro dos Mercados, uma **tarefa agendada do Claude** segue [`ANALISTA.md`](ANALISTA.md) três vezes por
dia (07:34, 13:34 e 20:34): para cada local registado lê a previsão, **vê as imagens de satélite**, verifica a análise
anterior contra o que se observou, escreve a análise (título, agora, hoje, amanhã, próximos dias, tendência, alertas,
satélite, incêndios, conselhos, fiabilidade, análise técnica) e guarda lições sobre o local para as seguintes.

Na app, **Análise diária do Claude para este local** regista o local (máx. 5; a análise aparece num raio de 10 km).

Opcional — análise imediata para qualquer local, pela API do Claude (paga à parte):

```bash
cd meteo/proxy && npx wrangler secret put ANTHROPIC_API_KEY
```

Ou no painel da Cloudflare: *Workers & Pages → meteo → Settings → Variables and Secrets → Add → Secret*.

## Conector

Como nos Mercados, a app é estática (GitHub Pages) e o que o browser não pode ler diretamente (METAR, NASA FIRMS,
fogos.pt, imagens EUMETSAT) passa por um Cloudflare Worker próprio, grátis, na pasta `proxy/` — que também guarda os
locais e as análises do Claude (KV). Já está publicado em `https://meteo.mercados-proxy.workers.dev` e a app usa-o
por omissão; para usar outro: **Ajustes → Conector de dados**, ou abrir a app com `…/meteo/?proxy=https://…`.

```bash
cd meteo/proxy
npm install
npx wrangler deploy
```

## Como está feito

- `index.html`, `meteo.css`, `meteo.js` (+ módulos) — a PWA, sem dependências.
- `lib/` — o **motor**: junta as fontes e calcula tudo. Corre no telemóvel e na tarefa agendada (o plano gratuito
  da Cloudflare só dá 10 ms de CPU por pedido, por isso o Worker não faz contas).
- `proxy/` — o conector (Worker). `analista/` — scripts da tarefa agendada (`dados.mjs` recolhe, `publicar.mjs`
  valida e grava). `docs/API.md` — formato de todas as respostas.
- `tests/` — motor com dados reais de Lisboa, rotas do conector e a app no Chromium com a rede simulada:

```bash
node --test meteo/tests/*.test.mjs
```

## Fontes e licenças

Dados de previsão: [Open-Meteo](https://open-meteo.com) (CC BY 4.0), com modelos do ECMWF, DWD, Météo-France,
Met Office, NOAA, ECCC, JMA e CMA. Observações e avisos: [IPMA](https://api.ipma.pt) e NOAA Aviation Weather Center
(METAR). Focos de calor: NASA FIRMS. Ocorrências: ANEPC via [fogos.pt](https://fogos.pt). Imagens: EUMETSAT.
Nomes de locais: OpenStreetMap/Nominatim.

> A previsão é automática e pode falhar; em situações de risco seguem-se sempre os avisos do IPMA e da Proteção Civil.
