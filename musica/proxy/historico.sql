-- Música — histórico (base D1 «musica-historico», binding HIST do Worker).
-- Aplicar (pode repetir-se): cd musica/proxy && npx wrangler d1 execute musica-historico --remote --file historico.sql
-- O KV guarda o retrato das tabelas de cada dia só 70 dias e reescreve o perfil a cada atualização; aqui fica a
-- evolução: as tabelas de cada dia (para sempre) e cada versão do perfil de gosto do dono, com as favoritas.
-- Quem grava é o Worker (src/historico.js).

-- o retrato diário das tabelas públicas (Apple Music PT e EUA, Deezer mundo), um lugar por linha
CREATE TABLE IF NOT EXISTS tendencias (
    dia TEXT NOT NULL,            -- AAAA-MM-DD (UTC, como o cron)
    fonte TEXT NOT NULL,          -- pt | mundo | eua
    lugar INTEGER NOT NULL,       -- 1 a 100
    artista TEXT,
    titulo TEXT,
    genero TEXT,
    PRIMARY KEY (dia, fonte, lugar)
);
CREATE INDEX IF NOT EXISTS tendencias_cancao ON tendencias (artista, titulo);

-- cada versão do perfil de gosto do dono (só quando muda): o resumo e as favoritas desse momento
CREATE TABLE IF NOT EXISTS perfis (
    gerado_em TEXT PRIMARY KEY,   -- ISO, UTC
    utilizador TEXT,
    favoritas INTEGER,            -- quantas (até 100, as mais recentes)
    artistas INTEGER,             -- artistas seguidos
    playlists INTEGER,
    resumo TEXT,                  -- JSON: artistas, géneros, décadas e qualidade mais frequentes nas favoritas
    ids TEXT                      -- as favoritas (ids do Tidal, por ordem), para ver o que entrou e saiu
);

-- cada favorita que já passou pelo perfil: quando foi adicionada no Tidal e entre que versões esteve lá
CREATE TABLE IF NOT EXISTS favoritas (
    id TEXT PRIMARY KEY,          -- id do Tidal
    artista TEXT,
    titulo TEXT,
    album TEXT,
    ano INTEGER,
    generos TEXT,
    adicionada TEXT,              -- quando a pôs nas favoritas (Tidal)
    primeira_vez TEXT,            -- a primeira versão do perfil em que apareceu
    ultima_vez TEXT               -- a última (se ficou para trás, saiu das favoritas ou das 100 mais recentes)
);
