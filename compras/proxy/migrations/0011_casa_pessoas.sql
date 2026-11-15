-- Quantas pessoas há em casa (volta 12): no talho e na peixaria, o mais barato escolhe-se entre as embalagens do
-- tamanho certo para a casa (src/porcoes.js), e não o pacote de 2 kg só por ser o mais barato ao quilo.
ALTER TABLE casa ADD COLUMN pessoas INTEGER;
