-- As notas dos vinhos (volta 11): o que dizem os críticos e os concursos, recolhido pelo Ecónomo na web
-- (economo/notas.mjs). palavras: as que têm de estar no nome do produto (sem acentos, com a cor); fora: as que o
-- excluem; nota: de 0 a 100 (src/notas.js); fontes: JSON [{ fonte, tipo, valor, colheita, url }].
CREATE TABLE vinho_nota (
    palavras TEXT PRIMARY KEY,
    fora     TEXT NOT NULL DEFAULT '',
    nome     TEXT NOT NULL,
    nota     INTEGER NOT NULL,
    n        INTEGER NOT NULL,
    resumo   TEXT NOT NULL,
    fontes   TEXT NOT NULL,
    visto    TEXT NOT NULL
);
