-- Volta 4: o preço por unidade de medida, para comparar embalagens diferentes (src/precos.js, porUnidade):
--   uc: cêntimos por quilo, por litro ou por unidade · ub: 'kg', 'l' ou 'un'
ALTER TABLE preco ADD COLUMN uc INTEGER;
ALTER TABLE preco ADD COLUMN ub TEXT;
