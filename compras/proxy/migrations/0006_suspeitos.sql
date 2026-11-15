-- A revisão do Worker (volta 6): cada produto pode ficar marcado como suspeito, com a razão («preço»: o preço por
-- unidade muito fora dos do mesmo grupo; «tipo»: o animal não é o do tipo). Os suspeitos não entram nas comparações.
ALTER TABLE preco ADD COLUMN suspeito TEXT;
CREATE INDEX preco_suspeito ON preco (suspeito) WHERE suspeito IS NOT NULL;
