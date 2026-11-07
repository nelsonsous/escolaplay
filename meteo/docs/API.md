# Meteo — contrato dos dados

A app (GitHub Pages) calcula a previsão no telemóvel com `lib/data.js` e usa o conector (Worker `meteo`,
`https://meteo.mercados-proxy.workers.dev`, configurável) para o resto. Tudo JSON (UTF-8), exceto `/api/sat` (PNG).
O conector responde com CORS aberto para leitura; gravar só a partir de `ALLOWED_ORIGINS`.
Horas locais em ISO sem fuso (`2026-11-06T15:00`), no fuso do local (`location.timezone`).
Unidades: °C, mm, km/h, hPa, %, m. Números arredondados a 1 casa (temp), inteiros (%, km/h).
`null` = sem dado. Erros: `{ "error": "codigo", "message": "texto PT" }` com HTTP 4xx/5xx.

## Previsão — `await loadForecast({ lat, lon, name })` em `lib/data.js`

Calculada no telemóvel (não é um pedido ao conector). Pedidos: Open-Meteo (direto ou pelo conector; HTTP 429 → tenta de
novo ao fim de ~1,5 s e ~4 s), IPMA (observações, avisos, risco de incêndio, e a **previsão oficial do concelho mais
próximo até 15 km**: `public-data/forecast/locations.json`, guardada 7 dias, e `public-data/forecast/aggregate/<id>.json`,
30 min), METAR, histórico guardado das estações IPMA perto (`/api/obs-history`, até 6), as **altitudes de todas as
estações até 30 km num só pedido** ao Open-Meteo (`elevation?latitude=a,b,c&longitude=x,y,z`, guardadas 1 ano) e o
**relevo à volta do ponto**: outro pedido `elevation` com o ponto e 12 rumos (0°, 30°, …) a 1,5 km e a 4 km (25 pontos,
`terrainPoints` em `lib/engine.js`), guardado para sempre (`pointTerrain` em `lib/data.js`; o terreno não muda).
**Radar** (`loadRadar` em `lib/data.js`, direto ao RainViewer, CORS aberto): `api.rainviewer.com/public/weather-maps.json`
(1 min em memória), a cobertura no ponto (`/v2/coverage/0/256/7/<lat>/<lon>/0/0_0.png`, 7 dias) e as 13 imagens das
últimas 2 h centradas no ponto (`<host><path>/256/7/<lat>/<lon>/2/0_0.png`: z7 ≈ 0,92 km por píxel a 41° N, ±117 km;
`0_0` = cores exatas, sem suavizar, e toda a precipitação na escala da chuva). As imagens gratuitas vêm sempre no esquema
"Universal Blue" (qualquer cor pedida dá o mesmo): uma cor por dBZ de −10 a 64 (os níveis −10 a 14 semitransparentes,
cada um com a sua opacidade), 65–74 a branco, ≥ 75 a verde (ignorado). No browser lêem-se pelo canvas
(`crossOrigin = 'anonymous'`; se aparecerem cores fora da tabela, pelo PNG original); no Node, por `lib/png.js`.
A imagem centrada começa no píxel global `round(X − 128)` da grelha normal (verificado contra as imagens x/y/z).
Na tarefa agendada, `ipmaPrev` (`{ times, temp }`) traz as previsões do IPMA feitas na véspera, para a verificação local.
Formato:

```jsonc
{
  "v": 1,
  "generatedAt": "2026-11-06T15:40:00Z",
  "location": { "lat": 41.3354, "lon": -8.4745, "elevation": 66, "timezone": "Europe/Lisbon",
                "utcOffsetSeconds": 0, "name": "Santo Tirso", "region": "Porto", "country": "PT",
    // relevo à volta do ponto (null sem o pedido das altitudes). relM = ponto − média das altitudes a 1,5 e a 4 km;
    // reliefM = |relM|. vale: ≥ 20 m abaixo e rodeado de terreno mais alto; topo: ≥ 20 m acima e com terreno mais baixo
    // à volta; encosta: declive ≥ 3,5% ou mais alto de um lado e mais baixo do outro; planície: o resto.
    // A água (0 m: mar, estuário) não entra nas médias. aspect = para onde a encosta desce; lowestDir = rumo do ponto
    // mais baixo a 4 km (por onde o ar frio escoa); water = rumo da água, se houver
    "terrain": { "type": "vale", "label": "Vale", "elevation": 66, "aroundM": 139, "relM": -73, "reliefM": 73,
                 "slopePct": 2.4, "aspect": "NO", "lowestDir": "NO", "highestDir": "E", "water": null,
                 "rings": [ { "km": 1.5, "mean": 98, "min": 36, "max": 192 }, { "km": 4, "mean": 180, "min": 40, "max": 404 } ],
                 "text": "70 m abaixo do relevo à volta", // a app mostra "Vale · 70 m abaixo do relevo à volta"
                 "description": "vale, ~70 m abaixo do relevo à volta; o terreno desce para noroeste" } },
  "models": [ // fontes do consenso (ordenadas por peso): modelos determinísticos e a previsão oficial do IPMA
    { "id": "ecmwf_ifs", "name": "ECMWF IFS", "org": "ECMWF", "resKm": 9, "weight": 1.6, "hours": 361,
      "skill": { "mae": 1.1, "bias": -0.3, "n": 48 } }, // skill = verificação local recente (pode ser null)
    { "id": "ipma", "name": "IPMA (oficial)", "org": "IPMA (Portugal)", "resKm": 2.5, "weight": 1.6, "days": 10, "hours": 240, "skill": null,
      "official": true, "local": "Santo Tirso", "localId": 1131400, "distanceKm": 0.7, "updated": "2026-11-06T08:39" }
      // peso 1,6 nos dias 0–2, 1,2 no dia 3, 1,0 nos dias 4–5, 0,8 nos dias 6–9; sem verificação não é penalizado
  ],
  "ensemble": { "members": 212, "models": [ { "id": "ecmwf_ifs025", "name": "ECMWF ENS", "members": 51, "days": 15 } ] },
  "now": {
    "time": "2026-11-06T15:00", "temp": 14.6, "feels": 13.2, "dew": 10.9, "rh": 78,
    "wind": 11, "gust": 22, "dir": 80, "pressure": 1019.2, "pressureTrend3h": -0.8,
    "cloud": 25, "precip": 0, "code": 2, "isDay": true, "uv": 1.2, "visibility": 24000,
    // observação combinada no ponto: estações IPMA e METAR até 30 km, cada uma levada à altitude do ponto
    // (0,0065 °C/m; orvalho 0,0018 °C/m) e pesada por 1/(d+2)² × exp(−|Δz|/150) × frescura; as discrepantes ficam de fora.
    // temp/rh = valor combinado à altitude do ponto; distanceKm = distância efetiva (média pesada); repr = confiança 0..1
    "obs": { "source": "IPMA", "sources": ["IPMA", "METAR"], "station": "Lisboa (Geofísico), Lisboa, Amoreiras (LFCL) e mais 9",
             "n": 11, "distanceKm": 3.3, "nearestKm": 1.0, "time": "2026-11-06T15:02", "ageMin": 43, "temp": 15.3, "rh": 79,
             "wind": 7, "gust": null, "dir": 52, "pressure": 1019.5, "precip1h": 0, "elevation": 66, "repr": 0.92, "spread": 0.4,
             "stations": [ // até 12, por peso
               { "id": "1200535", "name": "Lisboa (Geofísico)", "source": "IPMA", "distanceKm": 1.0, "dir": "O", "elev": 77, "time": "2026-11-06T15:00",
                 "ageMin": 45, "temp": 15.1, "tempAdj": 15.2, "anomaly": -2.1, "weight": 43, "used": true } ] }, // dir = rumo do ponto para a estação; sameSite = METAR no mesmo aeroporto
    "correction": { "temp": -1.6, "dew": 1.7, "decayHours": 5, "stations": 11, "repr": 0.92 }, // correção aplicada às próximas horas (ou null)
    "rainSource": "radar" // só quando o radar (imagem ≤ 20 min) mandou em precip/code: precip = mm/h no ponto; "aviso" com o aviso do utilizador
  },
  // 8 passos de 15 min (2 h): precip = mm nesses 15 min, prob = %. Com o radar (imagem ≤ 20 min), cada passo mistura o
  // radar (mm/h no intervalo: o observado até à última imagem, depois a persistência; prob. 95% se chove) com os modelos
  // pelo peso radar (0..1): inteiro até 30 min depois da imagem (15 sem deslocamento fiável), a cair até 0 aos 120 min
  // (75); sem chuva no ponto o radar só abafa 90% da chuva dos modelos. source: "radar+modelos" | "aviso" (sem: só modelos)
  "nowcast": { "steps": [ { "time": "2026-11-06T15:15", "precip": 0.14, "prob": 95, "radar": 1 } ],
               "text": "A chover agora (fraca, 0,6 mm/h); os modelos só a davam a partir das 18:00.", // ou "Sem chuva no radar; chuva a 12 km a sudoeste, deve chegar por volta das 21:10."
               "source": "radar+modelos", "modelText": "Sem chuva prevista nas próximas 2 horas." }, // modelText = a frase só dos modelos
  // radar no ponto (RainViewer; null sem radar). Tudo na última imagem, salvo last2h. No ponto = média de 3×3 píxeis
  // (~2,8 km); chove a partir de 0,1 mm/h (≈ 7 dBZ). Ecos parados (eco no mesmo píxel em ≥ 50% das imagens: fixos —
  // relevo, interferência, as cunhas perto dos radares — ou chuva que não se mexe) não contam para o eco mais próximo nem
  // para a chegada e pesam pouco no deslocamento; contam no ponto e nos anéis.
  "radar": { "source": "RainViewer", "time": "2026-11-06T20:30", "ageMin": 8, "fresh": true, // fresh = imagem ≤ 20 min (só então mexe no "agora")
             "frames": 13, "stepMin": 10, "kmPx": 0.92, "covered": true, // covered = false: ponto fora da cobertura (só text)
             "atPoint": { "mmh": 0.56, "dbz": 19, "wet": 0.89, "raining": true, "label": "fraca", "trend": "estável" }, // wet = fração dos 9 píxeis; label OMM (fraca < 2,5 mm/h, moderada < 10, forte < 50, muito forte); trend: a aumentar | a diminuir | estável (vs 30 min)
             "last2h": [ { "time": "2026-11-06T18:30", "mmh": 0 } ], // as 13 imagens, no ponto
             "rings": [ { "km": 5, "wet": 0.9, "max": 0.9 }, { "km": 15, "wet": 0.4, "max": 2.1 }, { "km": 30, "wet": 0.2, "max": 6.3 }, { "km": 60, "wet": 0.1, "max": 11.5 } ], // anéis 0–5, 5–15, 15–30, 30–60 km: fração com chuva e máximo (mm/h)
             "nearest": { "distanceKm": 12.3, "deg": 225, "dir": "SO", "mmh": 1.2 }, // só sem chuva no ponto: eco (3×3 ≥ 0,1 mm/h) mais perto até 40 km, sem os parados (ou null)
             // deslocamento: correlação do padrão dos ecos entre a última imagem e as de há 10, 20 e 30 min, numa caixa de
             // ±60 km (grelha de ~1,8 km, ecos ≥ 12 dBZ, cada píxel a pesar menos quanto mais tempo teve eco). corr = confiança
             // (0..1, cai se as três estimativas discordam); used = corr ≥ 0,4 e ≥ 5 km/h (senão a chuva fica parada)
             "motion": { "speedKmh": 35, "deg": 45, "toDir": "NE", "fromDir": "SO", "corr": 0.82, "used": true, "vx": 0.45, "vy": -0.45 },
             // persistência lagrangiana: a chuva que vai estar no ponto daqui a t min está agora a v·t para montante
             "approach": { "etaMin": 37, "time": "2026-11-06T21:10", "distanceKm": 21, "speedKmh": 35, "fromDir": "SO", "mmh": 1.4 }, // sem chuva no ponto: chegada (ou null)
             "ends": { "etaMin": 50, "time": "2026-11-06T21:20" }, // a chover: fim pelo deslocamento (ou null)
             "fixedKm2": 0, // área de ecos parados até 40 km
             "ahead": { "stepMin": 5, "moving": true, "mmh": [0.56, 0.6] }, // mm/h no ponto de 5 em 5 min desde a imagem (25 valores; sem deslocamento: o valor de agora)
             // início da chuva no radar (episódio atual ou chegada) e nos modelos (sem radar): lagMin > 0 = modelos atrasados
             "compare": { "radar": "2026-11-06T20:10", "models": "2026-11-06T22:15", "modelsNow": false, "lagMin": 125,
                          "text": "O radar tem chuva no ponto desde as 20:10; os modelos só a dão às 22:15 (~2 h de atraso)." },
             "text": "A chover agora (fraca, 0,6 mm/h)." }, // frase só do radar
  "hourly": [ // 72 entradas a partir da hora atual (consenso ponderado dos modelos)
    { "time": "2026-11-06T15:00", "temp": 14.6, "tempLo": 13.9, "tempHi": 15.3, "feels": 13.2, "dew": 10.9, "rh": 78,
      "precip": 0.0, "precipHi": 0.2, "pop": 10, "wind": 11, "gust": 22, "dir": 80, "cloud": 25, "cloudLow": 10,
      "pressure": 1019.2, "visibility": 24000, "cape": 50, "uv": 1.2, "code": 2, "isDay": true,
      "spread": 0.7,  // desvio-padrão da temperatura entre modelos
      "agree": 0.9,   // 0..1 concordância chuva/sem chuva entre modelos
      "local": -0.6 } // só quando há: ajuste do relevo (°C) já incluído em temp, tempLo, tempHi e feels (ver "local")
  ],
  // efeito local do relevo (null sem location.terrain), sempre pequeno e só em condições claras:
  // vale: noite limpa (nuvens < 30%; inteiro ≤ 20%), calma (vento < 8 km/h; inteiro ≤ 5) e sem chuva → até −1,5 °C por
  //   100 m abaixo do relevo à volta (máx. 1,5 °C), a crescer nas primeiras 4 h de noite e com metade na 1.ª hora depois
  //   do nascer do sol; não se soma ao que a correção das estações já arrefece nessa hora. A mínima dos dias com horas
  //   (até ~3 dias; hoje pelas horas que faltam) desce o mesmo que o mínimo das horas.
  // topo: vento e rajadas (horas e 16 dias) +0,15% por metro acima do relevo à volta (máx. +15%).
  // encosta e planície: sem ajuste. Constantes em LOCAL_RULES (lib/engine.js).
  "local": { "type": "vale", "rule": "vale — em noite limpa (…)", "potential": -1.1, "windFactor": null,
             "now": 0, "hours": 9, "max": -1.1, "peak": "2026-11-07T07:00", // próximas 72 h: horas ajustadas, maior ajuste e quando
             "tmin": [ { "date": "2026-11-07", "delta": -0.8 } ],
             "text": "Vale: 9 h de noite limpa e calma nas próximas 72 h, até 1,1° mais frio do que o consenso (sáb 7 07:00)." },
  "daily": [ // 16 dias (índice 0 = hoje)
    { "date": "2026-11-06", "code": 2, "tmax": 18.2, "tmin": 11.4,
      "tmaxP10": 17.5, "tmaxP90": 19.0, "tminP10": 10.8, "tminP90": 12.0,
      "precip": 0.0, "precipP90": 0.5, "pop": 10, "popHeavy": 0, // % cenários ≥1 mm e ≥10 mm
      "windMax": 20, "gustMax": 35, "dir": 80, "uvMax": 3.1, "sunrise": "07:23", "sunset": "17:31",
      "confidence": "alta", "confScore": 0.86, "spread": 1.5,
      "change24h": { "tmax": 0.4, "precip": -2.1 }, // vs corrida de há 24 h (null se não houver)
      "normal": { "tmax": 19.1, "tmin": 11.9 }, "anomaly": -0.9, // vs normal recente (null se não houver)
      "source": "multimodelo" } // "multimodelo" (dias 0-6) ou "ensemble" (dias 7-15)
  ],
  "indicators": { // nível 0..4 → label: 0 nenhum, 1 baixo, 2 moderado, 3 elevado, 4 muito elevado
    "thunder": { "level": 1, "label": "baixo", "peak": "2026-11-07T15:00", "text": "CAPE até 600 J/kg à tarde" },
    "fog":     { "level": 0, "label": "nenhum", "peak": null, "text": "" },
    "frost":   { "level": 0, "label": "nenhum", "peak": null, "text": "" },
    "heat":    { "level": 0, "label": "nenhum", "peak": null, "text": "" },
    "wind":    { "level": 1, "label": "baixo", "peak": "2026-11-07T18:00", "text": "Rajadas até 45 km/h" },
    "rain":    { "level": 2, "label": "moderado", "peak": "2026-11-08T09:00", "text": "Até 6 mm/h" },
    "snow":    { "level": 0, "label": "nenhum", "peak": null, "text": "" },
    "uv":      { "level": 1, "label": "baixo", "peak": "2026-11-06T13:00", "text": "UV máx. 3" },
    "pressure": { "trend": "a descer", "delta3h": -1.2, "delta24h": -5.0 },
    "predictability": { "days": 7, "text": "Fiável até sexta-feira (13 nov)" },
    "agreement": 0.82 // 0..1 concordância geral entre modelos nas próximas 48 h
  },
  "warnings": [ // avisos oficiais IPMA (só Portugal; vazio se nenhum)
    { "source": "IPMA", "type": "Agitação Marítima", "level": "yellow", "start": "2026-11-07T06:00", "end": "2026-11-07T18:00", "text": "Ondas de noroeste com 4 a 5 metros." }
  ],
  "fire": {
    "risk": { "today": 3, "tomorrow": 2, "label": "Elevado", "labelTomorrow": "Moderado", "concelho": "Lisboa", "dico": "1106" }, // IPMA RCM 1..5 (null fora de PT)
    "hotspots": { "count": 2, "radiusKm": 50, "nearestKm": 18.4,
      "items": [ { "lat": 38.9, "lon": -9.3, "distanceKm": 18.4, "bearing": "NO", "frp": 12.5, "time": "2026-11-06T13:42", "sat": "VIIRS NOAA-20", "confidence": "nominal" } ] },
    "incidents": { "count": 1, "radiusKm": 50,
      "items": [ { "id": "20261576011", "natureza": "Mato", "status": "Em Curso", "distanceKm": 22.0, "bearing": "N",
                   "man": 24, "terrain": 7, "aerial": 1, "time": "2026-11-06T15:20", "location": "Mafra, Ericeira" } ] },
    "rule30": { "hours": 0, "first": null, "text": "Regra 30-30-30 não atingida nas próximas 72 h" },
    "spread": { "dir": 80, "wind": 11, "gust": 22, "rh": 78, "text": "Vento de leste fraco; humidade alta" }
  },
  // verificação local (previsões a 1 dia vs observado): METAR até 12 km com 7 dias → só ele; senão várias estações
  // (IPMA: 24 h + histórico guardado; METAR mais longe: 7 dias), pesadas pela distância e altitude. O IPMA entra quando
  // há corridas anteriores guardadas (tarefa agendada). source: "METAR" | "IPMA" | "IPMA+METAR"; n = comparações
  "verification": { "station": "Lisbon Arpt, LI, PT", "source": "METAR", "distanceKm": 6.5, "stations": 1, "names": ["Lisbon Arpt, LI, PT"],
                    "days": 7, "n": 166, "biasApplied": true, "best": "ecmwf_ifs",
                    "models": [ { "id": "ecmwf_ifs", "name": "ECMWF IFS", "mae": 0.9, "bias": 0.3, "n": 166 } ] }, // ou null
  // previsão oficial do IPMA para o concelho mais próximo (≤ 15 km), tal como publicada (ou null fora de Portugal)
  "official": { "source": "IPMA", "local": "Santo Tirso", "id": 1131400, "distanceKm": 0.7, "dir": "N", "updated": "2026-11-06T08:39", // dir = rumo do ponto do IPMA
                "hours": 79, "days": 10, "weight": 1.6, "skill": null,
                "daily": [ { "date": "2026-11-06", "tmax": 14.9, "tmin": 6.0, "pop": 98, "code": 63, "type": 9, "text": "Chuva/aguaceiros",
                             "uv": 0.5, "wind": "fraco", "dir": "E" } ],          // 10 dias; type = idTipoTempo do IPMA, code = WMO
                "hourly": { "times": ["2026-11-06T17:00"], "temp": [11.3], "pop": [96] } }, // alinhado com "hourly" (prob. do período de 3 h)
  // fontes lado a lado: hoje, amanhã e depois, cada fonte com os seus valores (sem correções)
  "compare": {
    "dates": ["2026-11-06", "2026-11-07", "2026-11-08"],
    "rows": [ // kind: consenso (final) | oficial (IPMA) | modelo | ensemble (P50 com P10–P90)
      { "id": "consenso", "name": "Consenso", "short": "Consenso", "kind": "consenso", "days": [ { "tmax": 15.7, "tmin": 5.6, "precip": 2.8, "pop": 68, "code": 61 } ] },
      { "id": "ipma", "short": "IPMA", "kind": "oficial", "local": "Santo Tirso", "distanceKm": 0.7, "weight": 1.6,
        "days": [ { "tmax": 14.9, "tmin": 6.0, "precip": null, "pop": 98, "code": 63, "text": "Chuva/aguaceiros" } ] },
      { "id": "ecmwf_ifs", "short": "ECMWF", "kind": "modelo", "weight": 2.26, "days": [ { "tmax": 16.2, "tmin": 6.9, "precip": 2.5, "pop": null, "code": 61 } ] },
      { "id": "ensemble", "short": "Ensemble", "kind": "ensemble", "days": [ { "tmax": 16.0, "tmaxP10": 14.1, "tmaxP90": 17.9, "tmin": 6.4,
        "tminP10": 4.6, "tminP90": 9.2, "precip": 1.9, "precipP90": 8.8, "pop": 61 } ] }
    ],
    "days": [ { "date": "2026-11-06", "tmax": { "spread": 2.7, "lo": { "id": "ipma", "name": "IPMA", "v": 14.9 }, "hi": { "id": "meteofrance_seamless", "name": "Météo-France", "v": 17.6 },
                "far": { "id": "ipma", "name": "IPMA", "dev": -0.8 }, "ipma": -0.8 }, "tmin": { /* igual */ }, "rain": { "wet": 9, "of": 11, "pop": 68, "ipma": 98 } } ],
    "notes": ["Hoje: máx. 14,9° (IPMA) a 17,6° (Météo-France); IPMA −0,8° na máx. e +0,4° na mín. face ao consenso; chuva em 9 de 11 fontes (IPMA 98%)."],
    "agreement": "media", "spreadMax": 4.2, // alta (≤ 2 °C entre fontes) | media (≤ 4 °C) | baixa
    "farthest": [ { "id": "gem_seamless", "name": "GEM", "meanDev": 1.9 } ], // fontes mais afastadas do consenso (média dos 3 dias)
    "summary": "…" // as notas numa frase só
  },
  "analysis": { "available": true, "ageMin": 95, "placeId": "lisboa" }, // atalho: há análise do Claude perto?
  // só na app, com um aviso do utilizador ativo (withReport em lib/engine.js; ver "Avisos do utilizador")
  "report": { "kind": "chuva", "label": "Chuva", "time": "2026-11-06T20:33:00.000Z", "local": "2026-11-06T20:33", "ageMin": 3 },
  "sources": ["Open-Meteo (CC BY 4.0)", "IPMA", "NOAA AWC (METAR)", "NASA FIRMS", "ANEPC via fogos.pt", "EUMETSAT"],
  "status": { "det": "ok", "ipmaFc": "ok", "elev": "ok", "terrain": "ok", "obsHist": "ok", "radar": "ok", "fogos": "HTTP 502" } // cada fonte: "ok" ou o erro
}
```

Códigos `code` = WMO (Open-Meteo): 0 limpo, 1 pouco nublado, 2 parcialmente nublado, 3 encoberto,
45/48 nevoeiro, 51-57 chuvisco, 61-67 chuva, 71-77 neve, 80-82 aguaceiros, 85/86 aguaceiros de neve, 89 granizo (só com
o aviso do utilizador), 95-99 trovoada. Com o radar a chover no ponto, `now.code` tem a intensidade do radar e a família
dos modelos (aguaceiros, trovoada, neve; senão chuva 61/63/65); sem chuva no radar, o código das nuvens.

### Avisos do utilizador — `withReport(fc, report, now)` em `lib/engine.js`

`report = { kind, time, lat, lon }` (`kind`: `chuva`, `chuva-forte`, `nao-chove`, `nevoeiro`, `granizo`, `trovoada`;
`REPORT_KINDS` em `lib/sources.js`). Vale 45 min e a ≤ 2 km de onde foi dado; é o sinal mais forte do «agora»:
`now.code`/`now.precip` (chuva ≥ 0,5 mm/h, chuva forte ≥ 10, granizo 89, trovoada 95, nevoeiro 45, não chove: o código
das nuvens) e, nos passos de 15 min, por inteiro até 15 min depois do aviso e a perder peso até aos 45 (`report` = peso).
`nowcast.text`: «Está a chover (o teu aviso das 20:33); deve continuar nas próximas 2 horas.» Devolve uma cópia (a app
guarda a previsão sem o aviso); o aviso fica no telemóvel (`meteo:report`) e vai para `POST /api/reports`.

## GET /api/sat?layer=geocolour&lat=38.72&lon=-9.14[&km=600&w=720&h=540]

PNG do satélite (EUMETSAT WMS), centrado no local (o local fica no centro exato da imagem).
`layer`: `geocolour` (MTG cor natural/IR de noite), `ir` (infravermelho 10.5 µm), `lightning` (relâmpagos MTG LI),
`fire` (temperatura do fogo RGB), `rain` (precipitação por satélite H SAF), `airmass` (massas de ar / frentes).
Cabeçalhos: `x-sat-layer`, `x-sat-bbox` (`oeste,sul,este,norte`), `cache-control: max-age=600`.

## GET /api/analysis?lat=..&lon=..

```jsonc
{ "analysis": { /* ver "Análise" abaixo */ } | null,
  "place": { "id": "casa", "name": "Casa", "lat": 38.72, "lon": -9.14, "distanceKm": 0.3 } | null, // local registado mais próximo (≤ 10 km)
  "ageMin": 95, "schedule": ["07:34", "13:34", "20:34"], "onDemand": false } // onDemand = há chave da API configurada
```

### Análise (escrita pelo Claude; mesmo formato pela tarefa agendada ou pela API)

Escrita sobre o **ponto exato** (`place`, as coordenadas do local registado quando foi feita): o que acontece ali, hora a
hora, em mm, km/h e °C; sistemas regionais só com distância, direção e hora de chegada ao ponto. A app mostra para que
ponto é («Para Santo Tirso · 41,3354, −8,4745 · a 0,1 km do ponto selecionado») e, se estiver a mais de 2 km do ponto
selecionado, avisa e oferece «Mudar a análise diária para este ponto» (`PATCH /api/places/<id>`).

```jsonc
{ "generatedAt": "2026-11-06T13:20:00Z", "by": "claude-agendado", "model": "<id do modelo>",
  "place": { "id": "casa", "name": "Casa", "lat": 38.72, "lon": -9.14 }, // o ponto analisado
  "titulo": "Tarde amena; chuva a chegar sábado de manhã",            // ≤ 90
  "resumo": "…",                                                     // ≤ 600
  "agora": "…",          // próximas 6 h, ≤ 400
  "hoje": "…", "amanha": "…",                                        // ≤ 500 cada
  "dias": [ { "data": "2026-11-08", "texto": "…", "confianca": "alta" } ], // até 7 (alta|media|baixa)
  "tendencia": "…",      // dias 7-15, ≤ 500
  "alertas": [ { "tipo": "chuva", "nivel": "amarelo", "quando": "sáb 06h–12h", "texto": "…" } ],
     // tipo: chuva|vento|trovoada|nevoeiro|geada|calor|frio|neve|uv|incendio|mar|outro ; nivel: info|amarelo|laranja|vermelho
  "incendios": "…",      // ≤ 500 ("" se irrelevante)
  "satelite": "…",       // o que as imagens de satélite mostram, ≤ 500 ("" se não viu)
  "conselhos": ["Leva guarda-chuva sábado de manhã"],               // até 5, ≤ 140 cada
  "fiabilidade": { "curto": "alta", "medio": "media", "texto": "…" }, // ≤ 400
  "tecnica": "…",        // análise sinóptica/técnica, ≤ 1200
  "verificacao": "…" }   // como correu a previsão anterior, ≤ 400 (opcional)
```

## POST /api/analysis/refresh?lat=..&lon=..

Análise imediata pela API do Claude (só se o Worker tiver `ANTHROPIC_API_KEY`). 200 `{ "analysis": {…} }`,
503 `{ "error": "sem_chave" }`, 429 `{ "error": "limite" }` (máx. 1 por local a cada 30 min, 20/dia).
Recebe o resumo do ponto e 3 imagens (cor natural de perto ~280 km e a ~1200 km, massas de ar). Fica como análise do
local registado só se houver um a ≤ 2 km (como na app); senão fica à parte para este ponto (24 h), e `GET /api/analysis`
mostra-a enquanto for mais recente do que a do local registado. `place.lat/lon` = o ponto analisado.

## Locais com análise agendada

- `GET /api/places` → `[ { "id": "casa", "name": "Casa", "lat": 38.72, "lon": -9.14, "createdAt": "…" } ]`
- `POST /api/places` body `{ "name": "Casa", "lat": 38.72, "lon": -9.14 }` → `201 { place }` (máx. 5; só da própria origem)
- `PATCH /api/places/<id>` body `{ "lat": 41.3612, "lon": -8.4877, "name": "…" }` (`name` opcional) → `200 place` com o
  mesmo `id` (e `movedAt`): muda o local para outro ponto. A última análise (`analysis:<id>`) e as lições (`lessons:<id>`)
  ficam; a próxima análise já é do ponto novo. Só da própria origem (como o `POST`): `403`; `404` se não existir; `400`
  com coordenadas inválidas; `409` se ficar a menos de 0,5 km de outro local registado. Na app: «Mudar a análise diária
  para este ponto», com «Desfazer» (volta às coordenadas anteriores).
- `DELETE /api/places/<id>` → `204` (a análise e as lições ficam guardadas: ao voltar a ligar o mesmo local, com o mesmo
  nome, aparece de novo a última análise; na app, desligar pede confirmação e o aviso tem «Desfazer»)

## Avisos do utilizador («Está a chover?»)

- `POST /api/reports` body `{ "kind": "chuva", "time": "2026-11-06T20:33:00Z", "lat": 41.3354, "lon": -8.4745 }` →
  `201 { "report": { "kind", "time", "lat", "lon", "receivedAt" }, "place": { "id", "name" } | null, "count": 12 }`.
  Só da própria origem (como `/api/places`): `403`; `400` com tipo ou coordenadas inválidas. `time` = a hora do telemóvel
  (até 3 h para trás; senão a do conector). Fica em `reports:<id>` do local registado a ≤ 2 km, ou em
  `reports:@41.34,-8.47` (quadrícula de ~1 km); os últimos 50 (o mais recente primeiro), 30 dias (TTL do KV);
  coordenadas com 3 casas (~100 m).
- `GET /api/reports?lat=..&lon=..[&hours=24]` → `{ "place": { "id", "name" } | null, "reports": [ { "kind", "time", "lat",
  "lon", "receivedAt", "ageMin": 3, "distanceKm": 0.1 } ] }` (leitura livre; `hours` 1–720, por omissão 30 dias). A app
  usa os das últimas 24 h (um aviso de outro telemóvel no mesmo sítio também vale 45 min); a tarefa agendada mostra ao
  Claude os das últimas 48 h.

## GET /api/geocode?q=Ericeira

`[ { "name": "Ericeira", "admin1": "Lisboa", "country": "Portugal", "lat": 38.96, "lon": -9.42, "elevation": 35 } ]`

## GET /api/status

`{ "version": "1.3.0", "onDemand": false, "places": 1, "schedule": ["07:34","13:34","20:34"] }`

## Fontes em bruto (passagem com cache)

`/api/raw/om/<forecast|ensemble|previous|archive|elevation|geocoding>?…` (Open-Meteo), `/api/raw/metar?lat&lon`,
`/api/raw/metar-history?id=LPPT`, `/api/raw/firms?sat=n20|n21|snpp|modis`, `/api/raw/fogos` (com cópia da tarefa agendada
quando o fogos.pt recusa o Worker), `/api/obs-history?station=<id IPMA>` (histórico horário de 14 dias que a tarefa agendada
guarda para as estações IPMA usadas em cada local registado; `[]` se não houver).

## Resumo para o Claude — `buildSummary(fc)` em `lib/engine.js`

Texto que a tarefa agendada e a análise imediata dão ao Claude, **a começar pelo ponto**:

1. `## O ponto` — nome, coordenadas exatas, altitude, fuso e hora local; relevo (`location.terrain.description` e as
   altitudes à volta); o efeito local já aplicado (`local.text`, mínimas e a regra); a previsão oficial do IPMA (ponto
   do IPMA, distância e rumo); as estações da observação combinada (nome, fonte, distância, rumo, altitude e peso); e o
   pedido explícito: «Analisa este ponto; a região só interessa quando afeta o ponto (com distância, direção e hora de
   chegada).»
2. `## Próximas 12 h no ponto, hora a hora` — T [faixa], sensação, chuva (prob.), vento/rajada, nuvens, HR, orvalho,
   visibilidade, código, ajuste local e IPMA.
3. `## Fontes`, `## Agora` (com o aviso do utilizador ativo e as próximas 2 h, o peso do radar em cada passo e a frase
   só dos modelos), `## Radar no ponto` (última imagem e idade, o ponto agora e nas últimas 2 h, anéis, chuva mais perto,
   ecos parados, deslocamento, chegada ou fim, **Radar vs modelos** e a frase do radar), `## Avisos do utilizador`
   (`extra.reports`: os do conector, com a hora local e a distância), `## Das 12 às 48 h no ponto` (de 3 em 3 h),
   `## 16 dias`, indicadores, avisos, incêndios, verificação local, IPMA (10 dias) e fontes lado a lado.

A análise que volta passa por `validateAnalysis` e, na tarefa agendada, por `regionalPhrases` (`lib/analysis.js`): o
`publicar.mjs` recusa frases genéricas sobre a região («no distrito do Porto», «no Minho e Douro Litoral», «no interior
norte»…), salvo `--regiao-ok`.
