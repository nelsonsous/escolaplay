// O que não é do tipo, embora venha na página da categoria (16/11/2026): as almôndegas e os hambúrgueres na carne picada,
// os brancos e os conjuntos no vinho tinto, o paloco no bacalhau… ficam suspeitos «tipo» e fora das comparações.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { suspeitos, foraDoTipo } from '../proxy/src/revisao.js';

test('fora do tipo: os preparados na carne picada, e os da própria carne picada ficam', () => {
    const nomes = ['ALMÔNDEGAS DE BOVINO / SUINO ISENTO DE GLUTEN AUCHAN 800GR', 'HAMBURGUERES DE BOVINO ISENTO DE GLÚTEN AUCHAN 4*100GR',
        'Preparado de Carne Picada de Bovino Continente', 'PREPARADO DE CARNE MISTO 500GR', 'Salsicha Fresca de Porco', 'Pato Desfiado com Calda Embalado'];
    assert.deepEqual(suspeitos('carne-picada', nomes.map((nome) => ({ nome }))), ['tipo', 'tipo', null, null, 'tipo', 'tipo']);
    assert.ok(foraDoTipo('vinho-tinto', 'Três Bagos Reserva Douro Vinho Branco'));
    assert.ok(foraDoTipo('bacalhau', 'Migas de Paloco Embalado'));
    assert.ok(!foraDoTipo('arroz', 'Arroz Risotto Cigala')); // o arroz para risotto é arroz
    assert.ok(foraDoTipo('arroz', 'Arroz Agulha Pronto a Comer Cigala'));
    assert.ok(!foraDoTipo('azeite', 'Azeite Virgem Extra Seleção Azeitonas Maduras Oliveira da Serra'));
});
