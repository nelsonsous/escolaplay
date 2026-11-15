-- O histórico dos preços (volta 13): uma linha cada vez que o preço de um produto muda (e a primeira vez que se vê),
-- escrita por um gatilho na própria D1 — o catálogo, a lista, o Lidl e o folheto escrevem na tabela preco e o
-- histórico vem sozinho. Só quando o preço muda: poucas centenas de linhas por dia.
CREATE TABLE preco_historico (
    cadeia TEXT NOT NULL,
    id     TEXT NOT NULL,
    cent   INTEGER NOT NULL,
    uc     INTEGER,
    quando TEXT NOT NULL
);
CREATE INDEX preco_historico_produto ON preco_historico (cadeia, id, quando);
CREATE TRIGGER preco_historico_novo AFTER INSERT ON preco WHEN new.cent IS NOT NULL
BEGIN
    INSERT INTO preco_historico (cadeia, id, cent, uc, quando) VALUES (new.cadeia, new.id, new.cent, new.uc, coalesce(new.visto, datetime('now')));
END;
CREATE TRIGGER preco_historico_muda AFTER UPDATE OF cent ON preco WHEN new.cent IS NOT NULL AND old.cent IS NOT new.cent
BEGIN
    INSERT INTO preco_historico (cadeia, id, cent, uc, quando) VALUES (new.cadeia, new.id, new.cent, new.uc, coalesce(new.visto, datetime('now')));
END;
-- o ponto de partida: os preços de hoje
INSERT INTO preco_historico (cadeia, id, cent, uc, quando) SELECT cadeia, id, cent, uc, coalesce(visto, datetime('now')) FROM preco WHERE cent IS NOT NULL;
