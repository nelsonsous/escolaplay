-- Mercados — histórico (base D1 «mercados-historico», binding HIST do Worker).
-- Aplicar (pode repetir-se): cd mercados/proxy && npx wrangler d1 execute mercados-historico --remote --file historico.sql
-- O KV continua a ser o que a app lê; aqui fica a evolução: cada conselho do Claude (o do dono e os das outras apps),
-- o que dizia de cada ativo, as sugestões automáticas que a app regista uma vez por dia e a Carteira do dono, uma
-- fotografia por dia. Quem grava é o Worker (src/historico.js).

CREATE TABLE IF NOT EXISTS conselhos (
    para TEXT NOT NULL,           -- 'dono' ou o código anónimo da app de outra pessoa
    gerado_em TEXT NOT NULL,      -- ISO, UTC
    data TEXT,                    -- o dia do conselho
    titulo TEXT,                  -- headline
    doc TEXT NOT NULL,            -- o conselho inteiro (JSON), como a app o recebeu
    PRIMARY KEY (para, gerado_em)
);

CREATE TABLE IF NOT EXISTS acoes (
    para TEXT NOT NULL,
    gerado_em TEXT NOT NULL,
    data TEXT,
    ativo TEXT NOT NULL,
    chave TEXT,                   -- buy | scale | hold | reduce | avoid ...
    acao TEXT,                    -- o texto da ação («Plano 900 €; extra 100 € a 166 €»)
    porque TEXT,
    preco REAL,                   -- o preço nesse conselho (moeda do ativo)
    PRIMARY KEY (para, gerado_em, ativo)
);
CREATE INDEX IF NOT EXISTS acoes_ativo ON acoes (ativo, data);

CREATE TABLE IF NOT EXISTS sugestoes (
    app TEXT NOT NULL,            -- o código da app do dono (o diário; desde a 1.11.1 só a dele)
    data TEXT NOT NULL,
    ativo TEXT NOT NULL,
    preco REAL,                   -- moeda do ativo
    sugestao TEXT,                -- a sugestão automática (chave)
    longo REAL, medio REAL, curto REAL,  -- pontuações por prazo
    oportunidade INTEGER,         -- 1 = em desconto
    PRIMARY KEY (app, data, ativo)
);
CREATE INDEX IF NOT EXISTS sugestoes_ativo ON sugestoes (ativo, data);

-- só a Carteira do dono (cfg:owner), uma fotografia por dia: o que tinha de cada ativo
CREATE TABLE IF NOT EXISTS carteira (
    data TEXT NOT NULL,
    ativo TEXT NOT NULL,
    quantidade REAL,
    investido REAL,               -- €
    preco REAL,                   -- o preço desse dia (moeda do ativo), do diário
    por_mes REAL,                 -- € por mês no plano
    prazo TEXT,                   -- short | mid | long (curto, médio, longo)
    PRIMARY KEY (data, ativo)
);

-- e o total desse dia, em euros, como a app o calcula
CREATE TABLE IF NOT EXISTS carteira_dia (
    data TEXT PRIMARY KEY,
    valor REAL,                   -- €
    investido REAL,               -- €
    cripto REAL                   -- parte em cripto (0 a 1)
);
