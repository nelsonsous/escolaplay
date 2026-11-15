-- A zona do Continente (volta 7): o código postal que a casa deu (e autorizou a usar para isto), o nome da loja online
-- que o serve, e a disponibilidade nessa zona dos produtos do Continente que estão na lista (lida de hora a hora).
ALTER TABLE casa ADD COLUMN cp TEXT;
ALTER TABLE casa ADD COLUMN zona TEXT;
CREATE TABLE zona_stock (
    casa       TEXT NOT NULL,
    cadeia     TEXT NOT NULL,
    id         TEXT NOT NULL,
    disponivel INTEGER NOT NULL,
    visto      TEXT NOT NULL,
    PRIMARY KEY (casa, cadeia, id)
);
