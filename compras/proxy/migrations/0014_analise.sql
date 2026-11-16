-- A análise do Claude a pedido (volta 16): a app pede (com uma pergunta opcional: «um tinto para o jantar de peixe»),
-- o Worker guarda o pedido e chama a tarefa do Claude (se tiver o gatilho «API»; senão, a corrida agendada seguinte),
-- o Claude lê os dados da casa (analise.js), escreve a análise e grava-a aqui; a app mostra-a.
CREATE TABLE analise (
    id        TEXT PRIMARY KEY,
    casa      TEXT NOT NULL,
    pergunta  TEXT,
    estado    TEXT NOT NULL DEFAULT 'pendente', -- pendente | feita | erro
    criado    TEXT NOT NULL,
    chamadas  INTEGER NOT NULL DEFAULT 0,
    chamado   TEXT,
    feita     TEXT,
    resultado TEXT                             -- JSON: { resumo, lojas: [{ loja, porque, coisas }], online, avisos, perguntas }
);
CREATE INDEX analise_casa ON analise (casa, criado);
CREATE INDEX analise_estado ON analise (estado);
