-- Meteo — histórico (base D1 «meteo-historico», binding HIST do Worker).
-- Aplicar (pode repetir-se): cd meteo/proxy && npx wrangler d1 execute meteo-historico --remote --file historico.sql
-- O KV guarda só a última análise de cada local (é a cache que a app lê); aqui fica tudo, para ver a evolução:
-- cada análise publicada, os números que deu dia a dia (com o consenso dos modelos da mesma corrida) e o que as
-- estações mediram em cada dia. Quem grava: o publicar.mjs e o dados.mjs (tarefa, pela API da Cloudflare) e o Worker
-- (análise imediata, com chave da API). As instruções estão em lib/historico.js.

CREATE TABLE IF NOT EXISTS analises (
    local TEXT NOT NULL,          -- id do local (places no KV)
    gerada_em TEXT NOT NULL,      -- ISO, UTC
    nome TEXT, lat REAL, lon REAL,
    por TEXT,                     -- claude-agendado | claude-api
    modelo TEXT,
    titulo TEXT,
    resumo TEXT,
    pesos TEXT,                   -- JSON: o peso dos números da análise na previsão da app, nessa altura
    doc TEXT NOT NULL,            -- a análise inteira (JSON), como a app a recebeu
    PRIMARY KEY (local, gerada_em)
);

CREATE TABLE IF NOT EXISTS numeros (
    local TEXT NOT NULL,
    gerada_em TEXT NOT NULL,
    dia TEXT NOT NULL,            -- AAAA-MM-DD
    prazo INTEGER,                -- dias entre a análise e o dia (0 = o próprio dia, 1 = amanhã, 2 = depois)
    tmax REAL, tmin REAL, chuva REAL, rajada REAL,         -- o que a análise deu (°C, mm, km/h)
    c_tmax REAL, c_tmin REAL, c_chuva REAL, c_rajada REAL, -- o consenso dos modelos na mesma corrida
    PRIMARY KEY (local, gerada_em, dia)
);
CREATE INDEX IF NOT EXISTS numeros_dia ON numeros (local, dia);

CREATE TABLE IF NOT EXISTS observado (
    local TEXT NOT NULL,
    dia TEXT NOT NULL,
    tmax REAL, tmin REAL,         -- mediana das estações perto do ponto (°C)
    chuva REAL, chuva_min REAL, chuva_max REAL,            -- mm (mediana, a mais baixa e a mais alta)
    n_temp INTEGER, n_chuva INTEGER,                       -- quantas estações
    v_tmax REAL, v_tmin REAL, v_chuva REAL,                -- o que o consenso dos modelos dava na véspera
    atualizado TEXT,
    PRIMARY KEY (local, dia)
);

-- o que cada análise deu para cada dia, ao lado do consenso e do medido (erro = previsto − observado)
CREATE VIEW IF NOT EXISTS acertos AS
SELECT n.local, n.dia, n.prazo, n.gerada_em,
       n.tmax, n.c_tmax, o.tmax AS obs_tmax, ROUND(n.tmax - o.tmax, 1) AS erro_tmax, ROUND(n.c_tmax - o.tmax, 1) AS erro_c_tmax,
       n.tmin, n.c_tmin, o.tmin AS obs_tmin, ROUND(n.tmin - o.tmin, 1) AS erro_tmin, ROUND(n.c_tmin - o.tmin, 1) AS erro_c_tmin,
       n.chuva, n.c_chuva, o.chuva AS obs_chuva, ROUND(n.chuva - o.chuva, 1) AS erro_chuva, ROUND(n.c_chuva - o.chuva, 1) AS erro_c_chuva
FROM numeros n JOIN observado o ON o.local = n.local AND o.dia = n.dia;

-- 1.12: cada aviso «Está a chover?» com o que a previsão dizia na hora; contradiz = 'seco' (dava chuva e não chovia),
-- 'chuva' (não dava e chovia) ou NULL. É daqui que se vê quantas vezes a previsão falhou no próprio ponto.
CREATE TABLE IF NOT EXISTS avisos (
    hora TEXT NOT NULL,           -- ISO, UTC
    lat REAL NOT NULL, lon REAL NOT NULL,
    local TEXT,                   -- o local do telemóvel (places), se o aviso foi num dos seus
    tipo TEXT NOT NULL,           -- chuva | chuva-forte | nao-chove | nevoeiro | granizo | trovoada
    prev_pop REAL, prev_mm REAL, prev_radar TEXT,
    contradiz TEXT,
    PRIMARY KEY (hora, lat, lon)
);
CREATE INDEX IF NOT EXISTS avisos_local ON avisos (local, hora);
