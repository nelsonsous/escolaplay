-- As lojas online de produtores (volta 7): o bacalhau da Lugrade e outras que se juntem. Não entram nas comparações
-- dos supermercados (compra-se no site do produtor, com portes): aparecem na escolha, à parte, com o preço por quilo.
-- Lidas pelo Ecónomo (economo/produtores.mjs), uma vez por semana.
CREATE TABLE produtor_artigo (
    loja       TEXT NOT NULL,
    id         TEXT NOT NULL,
    nome       TEXT NOT NULL,
    url        TEXT NOT NULL,
    variante   TEXT,
    cent       INTEGER,
    emb        TEXT,
    uc         INTEGER,
    ub         TEXT,
    tipo       TEXT,
    disponivel INTEGER NOT NULL DEFAULT 1,
    visto      TEXT NOT NULL,
    PRIMARY KEY (loja, id)
);
CREATE INDEX produtor_artigo_tipo ON produtor_artigo (tipo);
