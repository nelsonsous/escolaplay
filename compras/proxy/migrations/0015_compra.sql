-- O histórico do que se compra (16/11/2026): cada coisa riscada na lista fica aqui, com a loja (a escolhida em «Vou a
-- este»; sem loja, a mais barata das que têm o produto, marcada estimada), o produto e o preço desse dia, e o que
-- custaria na loja mais cara (para contar o que se poupou). Desriscar no mesmo dia apaga-a.
CREATE TABLE compra (
    casa     TEXT NOT NULL,
    item     TEXT NOT NULL,
    dia      TEXT NOT NULL,            -- AAAA-MM-DD
    quando   TEXT NOT NULL,
    texto    TEXT NOT NULL,
    tipo     TEXT,
    q        INTEGER NOT NULL DEFAULT 1,
    cadeia   TEXT,
    nome     TEXT,
    cent     INTEGER,                  -- o preço de uma (vezes q no total)
    mx       INTEGER,                  -- o preço de uma na loja mais cara com o produto
    estimada INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (casa, item, dia)
);
CREATE INDEX compra_casa ON compra (casa, dia);
