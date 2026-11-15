-- Volta 3: a casa e a lista passam da KV para a D1 (a KV grátis só dá 1000 gravações por dia à conta toda), e os
-- preços que o conector lê nos sites das cadeias ficam guardados aqui. Aplicar: npx wrangler d1 migrations apply compras --remote

-- cada telemóvel: o hash do segredo da chave (o segredo não se guarda) e a casa onde está
CREATE TABLE aparelho (
    id     TEXT PRIMARY KEY,
    h      TEXT NOT NULL,
    casa   TEXT NOT NULL,
    criado TEXT NOT NULL
);
CREATE INDEX aparelho_casa ON aparelho (casa);

-- cada casa: o código para convidar e a lista (as coisas em JSON, como em casa.js); a versão sobe a cada mudança e
-- serve para duas mudanças ao mesmo tempo não se apagarem uma à outra
CREATE TABLE casa (
    id     TEXT PRIMARY KEY,
    codigo TEXT NOT NULL UNIQUE,
    criada TEXT NOT NULL,
    versao INTEGER NOT NULL DEFAULT 0,
    itens  TEXT NOT NULL DEFAULT '[]'
);

-- o preço de cada produto escolhido numa lista, lido no site da cadeia (src/precos.js); em cêntimos
--   antes: o preço riscado de uma promoção · unid: o preço por unidade, como se lê («1,29 €/l»)
--   visto: quando se leu o preço · tentado: a última vez que se pediu · falhas: pedidos falhados seguidos
CREATE TABLE preco (
    cadeia   TEXT NOT NULL,
    id       TEXT NOT NULL,
    url      TEXT NOT NULL,
    nome     TEXT,
    marca    TEXT,
    cent     INTEGER,
    antes    INTEGER,
    unid     TEXT,
    emb      TEXT,
    esgotado INTEGER,
    ate      TEXT,
    visto    TEXT,
    tentado  TEXT,
    falhas   INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (cadeia, id)
);
