# Meteo — contrato dos dados

A app (GitHub Pages) calcula a previsão no telemóvel com `lib/data.js` e usa o conector (Worker `meteo`,
`https://meteo.mercados-proxy.workers.dev`, configurável) para o resto. Tudo JSON (UTF-8), exceto `/api/sat` (PNG).
O conector responde com CORS aberto para leitura; gravar só a partir de `ALLOWED_ORIGINS`.
Horas locais em ISO sem fuso (`2026-11-06T15:00`), no fuso do local (`location.timezone`).
Unidades: °C, mm, km/h, hPa, %, m. Números arredondados a 1 casa (temp), inteiros (%, km/h).
`null` = sem dado. Erros: `{ "error": "codigo", "message": "texto PT" }` com HTTP 4xx/5xx.

## Previsão — `await loadForecast({ lat, lon, name })` em `lib/data.js`

Calculada no telemóvel (não é um pedido ao conector). Formato:

```jsonc
{
  "v": 1,
  "generatedAt": "2026-11-06T15:40:00Z",
  "location": { "lat": 38.7223, "lon": -9.1393, "elevation": 66, "timezone": "Europe/Lisbon",
                "utcOffsetSeconds": 0, "name": "Lisboa", "region": "Lisboa", "country": "PT" },
  "models": [ // modelos determinísticos usados (ordenados por peso)
    { "id": "ecmwf_ifs", "name": "ECMWF IFS", "org": "ECMWF", "resKm": 9, "weight": 1.6, "hours": 361,
      "skill": { "mae": 1.1, "bias": -0.3, "n": 48 } } // skill = verificação local recente (pode ser null)
  ],
  "ensemble": { "members": 212, "models": [ { "id": "ecmwf_ifs025", "name": "ECMWF ENS", "members": 51, "days": 15 } ] },
  "now": {
    "time": "2026-11-06T15:00", "temp": 14.6, "feels": 13.2, "dew": 10.9, "rh": 78,
    "wind": 11, "gust": 22, "dir": 80, "pressure": 1019.2, "pressureTrend3h": -0.8,
    "cloud": 25, "precip": 0, "code": 2, "isDay": true, "uv": 1.2, "visibility": 24000,
    "obs": { "source": "IPMA", "station": "Lisboa (Geofísico)", "distanceKm": 2.1, "time": "2026-11-06T15:00",
             "ageMin": 40, "temp": 14.2, "rh": 80, "wind": 9, "gust": null, "dir": 90, "pressure": 1019.0, "precip1h": 0 },
    "correction": { "temp": -0.4, "dew": 0.3, "decayHours": 6 } // correção aplicada às próximas horas (ou null)
  },
  "nowcast": { "steps": [ { "time": "2026-11-06T15:15", "precip": 0.0 } ], // 8 passos de 15 min (2 h)
               "text": "Sem chuva nas próximas 2 horas." },
  "hourly": [ // 72 entradas a partir da hora atual (consenso ponderado dos modelos)
    { "time": "2026-11-06T15:00", "temp": 14.6, "tempLo": 13.9, "tempHi": 15.3, "feels": 13.2, "dew": 10.9, "rh": 78,
      "precip": 0.0, "precipHi": 0.2, "pop": 10, "wind": 11, "gust": 22, "dir": 80, "cloud": 25, "cloudLow": 10,
      "pressure": 1019.2, "visibility": 24000, "cape": 50, "uv": 1.2, "code": 2, "isDay": true,
      "spread": 0.7,  // desvio-padrão da temperatura entre modelos
      "agree": 0.9 }  // 0..1 concordância chuva/sem chuva entre modelos
  ],
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
  "verification": { "station": "Lisboa (Geofísico)", "days": 7, "n": 120, "best": "ecmwf_ifs",
                    "models": [ { "id": "ecmwf_ifs", "mae": 1.1, "bias": -0.3 } ] }, // ou null
  "analysis": { "available": true, "ageMin": 95, "placeId": "lisboa" }, // atalho: há análise do Claude perto?
  "sources": ["Open-Meteo (CC BY 4.0)", "IPMA", "NOAA AWC (METAR)", "NASA FIRMS", "ANEPC via fogos.pt", "EUMETSAT"]
}
```

Códigos `code` = WMO (Open-Meteo): 0 limpo, 1 pouco nublado, 2 parcialmente nublado, 3 encoberto,
45/48 nevoeiro, 51-57 chuvisco, 61-67 chuva, 71-77 neve, 80-82 aguaceiros, 85/86 aguaceiros de neve, 95-99 trovoada.

## GET /api/sat?layer=geocolour&lat=38.72&lon=-9.14[&km=600&w=720&h=540]

PNG do satélite (EUMETSAT WMS), centrado no local (o local fica no centro exato da imagem).
`layer`: `geocolour` (MTG cor natural/IR de noite), `ir` (infravermelho 10.5 µm), `lightning` (relâmpagos MTG LI),
`fire` (temperatura do fogo RGB), `rain` (precipitação por satélite H SAF), `airmass` (massas de ar / frentes).
Cabeçalhos: `x-sat-layer`, `x-sat-bbox` (`oeste,sul,este,norte`), `cache-control: max-age=600`.

## GET /api/analysis?lat=..&lon=..

```jsonc
{ "analysis": { /* ver "Análise" abaixo */ } | null,
  "place": { "id": "casa", "name": "Casa", "lat": 38.72, "lon": -9.14, "distanceKm": 0.3 } | null, // local registado mais próximo (≤ 10 km)
  "ageMin": 95, "schedule": ["07:12", "13:12", "19:42"], "onDemand": false } // onDemand = há chave da API configurada
```

### Análise (escrita pelo Claude; mesmo formato pela tarefa agendada ou pela API)

```jsonc
{ "generatedAt": "2026-11-06T13:20:00Z", "by": "claude-agendado", "model": "<id do modelo>",
  "place": { "id": "casa", "name": "Casa", "lat": 38.72, "lon": -9.14 },
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

## Locais com análise agendada

- `GET /api/places` → `[ { "id": "casa", "name": "Casa", "lat": 38.72, "lon": -9.14, "createdAt": "…" } ]`
- `POST /api/places` body `{ "name": "Casa", "lat": 38.72, "lon": -9.14 }` → `201 { place }` (máx. 5; só da própria origem)
- `DELETE /api/places/<id>` → `204`

## GET /api/geocode?q=Ericeira

`[ { "name": "Ericeira", "admin1": "Lisboa", "country": "Portugal", "lat": 38.96, "lon": -9.42, "elevation": 35 } ]`

## GET /api/status

`{ "version": "1.0.0", "onDemand": false, "places": 1, "schedule": ["07:12","13:12","19:42"] }`

## Fontes em bruto (passagem com cache)

`/api/raw/om/<forecast|ensemble|previous|archive|elevation|geocoding>?…` (Open-Meteo), `/api/raw/metar?lat&lon`,
`/api/raw/metar-history?id=LPPT`, `/api/raw/firms?sat=n20|n21|snpp|modis`, `/api/raw/fogos` (com cópia da tarefa agendada
quando o fogos.pt recusa o Worker), `/api/obs-history?station=<id IPMA>`.

O resumo para o Claude é `buildSummary(fc)` em `lib/engine.js`.
