-- Volta 6: a localidade da casa e as lojas onde se compra (as cadeias e, no SPAR, a loja), para as comparações só
-- contarem com elas. Ficam na casa, como a lista: só as vê quem tem o código.
ALTER TABLE casa ADD COLUMN local TEXT;
ALTER TABLE casa ADD COLUMN lojas TEXT;
