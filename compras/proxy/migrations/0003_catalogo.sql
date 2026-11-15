-- Volta 5: o catálogo. As páginas de categoria das cadeias (src/catalogo.js) enchem a tabela preco com dezenas de
-- produtos de cada vez, cada um com o tipo a que pertence (tipo.k: «agua-sem-gas»), se é marca própria da cadeia e
-- quanto tem a embalagem. A tabela pagina diz que páginas há e quando se leram (o cron lê a mais velha).
ALTER TABLE preco ADD COLUMN tipo TEXT;     -- o tipo do produto (vem da página de categoria onde apareceu)
ALTER TABLE preco ADD COLUMN propria INTEGER; -- 1: marca própria da cadeia (a «marca branca»)
ALTER TABLE preco ADD COLUMN q REAL;        -- quanto tem a embalagem, na unidade ub (9 para «6 x 1,5 l»)
CREATE INDEX preco_tipo ON preco (tipo);

-- os tipos de produto que as cadeias têm em comum: a chave, o nome como se escreve e quantos produtos há
CREATE TABLE tipo (
    k     TEXT PRIMARY KEY,
    nome  TEXT NOT NULL,
    n     INTEGER NOT NULL DEFAULT 0,
    casa  INTEGER NOT NULL DEFAULT 0  -- 1: feito à mão pelo Ecónomo (economo/tipos-casa.json); o nome não muda
);

-- as páginas de categoria de cada tipo em cada cadeia (no Continente, também as de cada marca: marca = 1, que se
-- leem com menos frequência)
CREATE TABLE pagina (
    url     TEXT PRIMARY KEY,
    cadeia  TEXT NOT NULL,
    tipo    TEXT NOT NULL,
    marca   INTEGER NOT NULL DEFAULT 0,
    visto   TEXT,
    tentado TEXT,
    falhas  INTEGER NOT NULL DEFAULT 0,
    n       INTEGER
);
CREATE INDEX pagina_cadeia ON pagina (cadeia, visto);
