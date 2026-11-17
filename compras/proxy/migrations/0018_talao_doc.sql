-- O número do documento do talão (17/11/2026: «FS FS261251/1110»): o mesmo talão lido outra vez substitui a leitura
-- anterior, em vez de se juntar a ela (com o dia, a loja e o total, quando o número não se lê).
ALTER TABLE talao ADD COLUMN doc TEXT;
