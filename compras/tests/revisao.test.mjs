// A revisão do Worker: os suspeitos (preço muito fora do grupo, animal que não é o do tipo) e os nomes dos tipos
// cruzados que não condizem com a chave.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { suspeitos, revisarTipo, nomeCondiz, acentua, nomeDaChave } from '../proxy/src/revisao.js';
import { guardarCatalogo } from '../proxy/src/catalogo.js';
import { produtosDoTipo } from '../proxy/src/sugerir.js';
import { d1 } from './d1.mjs';

test('suspeitos: o animal que não é o do tipo, e o preço por quilo que não bate com o preço e a embalagem', () => {
    const ps = [['Picanha de Bovino', 1999, '1 kg', 1999], ['Wagyu de Bovino', 13900, '1 kg', 13900], ['Bife de Bovino', 499, '250 g', 1996],
        ['Bife de Bovino Mal Lido', 499, '250 g', 99], ['COSTELA DE PORCO AUCHAN KG', 599, '1 kg', 599]].map(([nome, cent, emb, uc]) => ({ nome, cent, emb, uc, ub: 'kg' }));
    // o wagyu, caro mas verdadeiro, fica; 0,99 €/kg com 250 g a 4,99 € não bate (20×); o atum pelo peso escorrido (1,5×) fica
    assert.deepEqual(suspeitos('carne-novilho', ps), [null, null, null, 'unidade', 'tipo']);
    assert.deepEqual(suspeitos('atum', [{ nome: 'Atum Posta em Óleo', cent: 519, emb: '385 g', uc: 2068, ub: 'kg' }]), [null]);
});

test('o nome condiz com a chave? («Massas e gnocchis» no tipo «peixe» não)', () => {
    assert.equal(nomeCondiz('peixe', 'Massas e gnocchis'), false);
    assert.equal(nomeCondiz('espetada', 'Peru'), false);
    assert.equal(nomeCondiz('espetada', 'Espetadas'), true);
    assert.equal(nomeCondiz('feijao-grao', 'Feijão e grão'), true);
    // todas as palavras da chave: «Bebida aveia» não é a bebida de soja; «pães» é «pão»
    assert.equal(nomeCondiz('bebida-soja', 'Bebida aveia'), false);
    assert.equal(nomeCondiz('croissant-pao-leite', 'Croissants e pães de leite'), true);
});

test('os acentos que faltam nos nomes automáticos («Tampao», «Aguas tonicas»)', () => {
    assert.deepEqual(['Tampao', 'Aguas tonicas', 'Pure', 'Fruta da epoca', 'Pates e pastas', 'Higiene intima', 'Vassoura pas', 'Refeicao congelada'].map(acentua),
        ['Tampão', 'Águas tónicas', 'Puré', 'Fruta da época', 'Patés e pastas', 'Higiene íntima', 'Vassoura pás', 'Refeição congelada']);
    // o que já tem acento, ou está todo em maiúsculas (uma marca), fica
    assert.deepEqual(['Pão do dia', 'Café moído', 'PURE'].map(acentua), ['Pão do dia', 'Café moído', 'PURE']);
    assert.equal(nomeDaChave('bebida-soja'), 'Bebida soja');
    assert.equal(nomeDaChave('agua-tonica'), 'Água tónica');
});

test('revisarTipo: marca os suspeitos (que saem da escolha) e dá nome aos tipos cruzados que não condizem', async () => {
    const db = d1();
    db.sql.exec(`INSERT INTO tipo (k, nome, n, casa) VALUES ('carne-novilho', 'Carne de vaca', 7, 1), ('espetada', 'Peru', 2, 0)`);
    const p = (id, nome, preco) => ({ id, nome, preco, emb: '1 kg', url: 'https://www.auchan.pt/' + id });
    // (o preço muito diferente dos outros não é suspeito: só o animal trocado)
    const agora = new Date();
    await guardarCatalogo(db, 'auchan', 'carne-novilho', [p('1', 'Picanha de Bovino', 19.99), p('2', 'Vazia de Bovino', 18.99), p('3', 'Alcatra de Bovino', 15.99),
        p('4', 'Maminha de Bovino', 16.99), p('5', 'Acém de Bovino', 10.99), p('6', 'COSTELA DE PORCO', 5.99)], agora);
    const r = await revisarTipo(db, 'carne-novilho');
    assert.deepEqual([r.produtos, r.suspeitos], [6, 1]);
    assert.deepEqual(db.linhas("SELECT id, suspeito FROM preco WHERE suspeito IS NOT NULL"), [{ id: '6', suspeito: 'tipo' }]);
    const tp = await produtosDoTipo(db, 'carne-novilho', agora);
    assert.equal(tp.produtos.some((x) => x.id === '6'), false);
    // outra vez: nada muda
    assert.equal((await revisarTipo(db, 'carne-novilho')).mudados, 0);
    await revisarTipo(db, 'espetada');
    assert.equal(db.linhas("SELECT nome FROM tipo WHERE k = 'espetada'")[0].nome, 'Espetada');
});
