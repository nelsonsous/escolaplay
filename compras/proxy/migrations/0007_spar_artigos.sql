-- Os artigos do SPAR (volta 7): o SPAR não vende online nem publica preços, mas o site tem a lista dos artigos que
-- vende (a «lista de compras»), com a marca (SPAR é a marca própria) e o tamanho. O Ecónomo (economo/spar.mjs) liga cada
-- um a um tipo do catálogo e ao mesmo produto (marca e tamanho) nas outras cadeias, ou, nos da marca SPAR, à marca
-- branca do mesmo tipo e tamanho: eq_cent é esse preço (a estimativa), eq_como diz de onde vem.
CREATE TABLE spar_artigo (
    c        TEXT PRIMARY KEY,
    nome     TEXT NOT NULL,
    marca    TEXT,
    emb      TEXT,
    propria  INTEGER NOT NULL DEFAULT 0,
    tipo     TEXT,
    eq_cent  INTEGER,
    eq_como  TEXT,
    visto    TEXT NOT NULL
);
CREATE INDEX spar_artigo_tipo ON spar_artigo (tipo);
