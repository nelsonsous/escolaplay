-- Volta 6: os talões. A fotografia do talão é lida pela IA da Cloudflare (src/talao.js); fica a loja, o dia, o total e as
-- linhas (o texto, a quantidade e o preço em cêntimos), da casa. A fotografia não se guarda.
CREATE TABLE talao (
    id     TEXT PRIMARY KEY,
    casa   TEXT NOT NULL,
    loja   TEXT,
    dia    TEXT,
    total  INTEGER,
    linhas TEXT NOT NULL,
    criado TEXT NOT NULL
);
CREATE INDEX talao_casa ON talao (casa, criado);
