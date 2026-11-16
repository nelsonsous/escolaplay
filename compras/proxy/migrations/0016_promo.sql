-- A promoção (16/11/2026): o Auchan diz «Promoção» na página da categoria, às vezes sem o preço riscado; promo = 1
-- guarda-o (com o riscado, antes > cent já o diz).
ALTER TABLE preco ADD COLUMN promo INTEGER;
