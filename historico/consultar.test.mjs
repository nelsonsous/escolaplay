// node --test historico/consultar.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { refuse, table } from './consultar.mjs';

test('só leitura: um SELECT (ou WITH), sem instruções que escrevam', () => {
    for (const ok of ['SELECT * FROM acertos', "select dia from observado where local = 'casa';", 'WITH x AS (SELECT 1) SELECT * FROM x',
        "SELECT * FROM acoes WHERE acao LIKE '%delete; drop%'"]) assert.equal(refuse(ok), null, ok);
    for (const [bad, why] of [['', 'falta a consulta'], ['DELETE FROM analises', 'só SELECT (ou WITH … SELECT)'], ['SELECT 1; DROP TABLE analises', 'só uma instrução'],
        ['WITH x AS (DELETE FROM analises RETURNING *) SELECT * FROM x', 'só leitura'], ['PRAGMA table_info(analises)', 'só SELECT (ou WITH … SELECT)'],
        ['SELECT 1 /* ; */; UPDATE carteira SET valor = 0', 'só uma instrução']]) assert.equal(refuse(bad), why, bad);
});

test('tabela de texto para o terminal', () => {
    assert.equal(table([]), '(nenhuma linha)');
    assert.equal(table([{ dia: '2026-11-15', erro: 1.4, nota: null }, { dia: '2026-11-16', erro: 0.3, nota: 'a\nb' }]), 'dia | erro | nota\n2026-11-15 | 1.4 | \n2026-11-16 | 0.3 | a b');
});
