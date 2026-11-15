-- O Vinha (volta 13): os vinhos da loja online vinha.pt em produtor_artigo, com a nota da Vivino (de 0 a 5, e os
-- votos) e a chave do vinho dos supermercados que é o mesmo (as palavras do nome), para comparar o preço da garrafa.
ALTER TABLE produtor_artigo ADD COLUMN vivino REAL;
ALTER TABLE produtor_artigo ADD COLUMN votos INTEGER;
ALTER TABLE produtor_artigo ADD COLUMN chave TEXT;
