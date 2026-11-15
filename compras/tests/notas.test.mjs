// As notas dos vinhos (volta 11): os críticos e os concursos em pontos, a nota pesada e a correspondência com os nomes
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pontosDaFonte, notaDasFontes, prepararNotas, notaDoProduto } from '../proxy/src/notas.js';
import { candidatosMelhores, maisCotados } from '../proxy/src/atributos.js';

test('as fontes em pontos: a escala de 20, os pontos, as medalhas e os concursos generosos', () => {
    assert.equal(pontosDaFonte({ fonte: 'Revista de Vinhos', tipo: 'critico', valor: '17/20' }), 91);
    assert.equal(pontosDaFonte({ fonte: 'Revista de Vinhos', tipo: 'critico', valor: '16,5/20' }), 89.5);
    assert.equal(pontosDaFonte({ fonte: 'Wine Spectator', tipo: 'critico', valor: '88 pts' }), 88);
    assert.equal(pontosDaFonte({ fonte: 'Decanter World Wine Awards', tipo: 'concurso', valor: 'Prata 90 pts' }), 90);
    assert.equal(pontosDaFonte({ fonte: 'International Wine Challenge', tipo: 'concurso', valor: 'Bronze' }), 85);
    // os concursos que dão medalhas a quase todos contam menos
    assert.equal(pontosDaFonte({ fonte: 'Challenge International du Vin', tipo: 'concurso', valor: 'Ouro' }), 89);
    assert.equal(pontosDaFonte({ fonte: 'Prémios Uva de Ouro', tipo: 'concurso', valor: 'Medalha de Ouro' }), 89);
    assert.equal(pontosDaFonte({ fonte: 'Blog', tipo: 'critico', valor: 'muito bom' }), null);
});

test('a nota: um crítico vale mais do que uma medalha; colheitas velhas valem metade; sem fontes, nada', () => {
    const esporao = notaDasFontes([{ fonte: 'Revista de Vinhos', tipo: 'critico', valor: '17/20', colheita: 2016 },
        { fonte: 'Wine Spectator', tipo: 'critico', valor: '88 pts', colheita: 2016 }, { fonte: 'Falstaff', tipo: 'critico', valor: '90 pts', colheita: 2022 }], 2026);
    assert.equal(esporao.nota, 90);
    assert.equal(esporao.n, 3);
    assert.equal(esporao.resumo, 'Falstaff 90 pts · Revista de Vinhos 17/20');
    const coutada = notaDasFontes([{ fonte: 'International Wine Challenge', tipo: 'concurso', valor: 'Bronze' },
        { fonte: 'Challenge International du Vin', tipo: 'concurso', valor: 'Ouro', colheita: 2023 }, { fonte: 'Sommelier Wine Awards', tipo: 'concurso', valor: 'Bronze', colheita: 2020 }], 2026);
    assert.equal(coutada.nota, 86);
    assert.ok(coutada.nota < esporao.nota);
    assert.equal(notaDasFontes([]), null);
    // só uma colheita de 2007: 93 vale 91 hoje
    assert.equal(notaDasFontes([{ fonte: 'Wine Enthusiast', tipo: 'critico', valor: '93 pts', colheita: 2007 }], 2026).nota, 91);
});

test('a nota de um produto: todas as palavras, nenhuma de fora, a mais específica, e a gama tem de condizer', () => {
    const notas = prepararNotas([
        { palavras: 'esporao reserva tinto', fora: '', nota: 90, resumo: 'a' },
        { palavras: 'esporao grande reserva tinto', fora: '', nota: 93, resumo: 'b' },
        { palavras: 'cartuxa tinto', fora: '', nota: 89, resumo: 'c' },
        { palavras: 'monte velho tinto', fora: 'bag box', nota: 84, resumo: 'd' },
    ]);
    assert.equal(notaDoProduto(notas, 'Esporão Reserva Alentejo Vinho Tinto 75cl').nota, 90);
    assert.equal(notaDoProduto(notas, 'ESPORÃO GRANDE RESERVA TINTO').nota, 93);
    assert.equal(notaDoProduto(notas, 'Esporão Reserva Alentejo Vinho Branco'), null); // a cor
    assert.equal(notaDoProduto(notas, 'Cartuxa Reserva Alentejo Vinho Tinto'), null); // a gama que a nota não tem
    assert.equal(notaDoProduto(notas, 'Cartuxa Alentejo Vinho Tinto').nota, 89);
    assert.equal(notaDoProduto(notas, 'Monte Velho Vinho Tinto Bag in Box 5L'), null); // fora
});

test('as melhores compras no vinho seguem a nota, e os mais bem cotados vêm do melhor para o pior', () => {
    const ps = [{ nome: 'Coutada Velha Signature Tinto', cent: 1139 }, { nome: 'Tinto Reserva Barato', cent: 499 },
        { nome: 'Esporão Reserva Tinto', cent: 1599, nt: 90, nr: 'Revista de Vinhos 17/20' }, { nome: 'Bom Tinto', cent: 699, nt: 87, nr: 'x' }];
    const cs = candidatosMelhores('vinho', ps);
    // o Signature não tem pontos (marketing); o Reserva sem nota fica com 82; os com nota, com a nota
    assert.deepEqual(cs.map((x) => [x.i, x.p, x.ct ?? 0]), [[1, 82, 0], [3, 87, 1], [2, 90, 1]]);
    assert.deepEqual(maisCotados(ps), [2, 3]);
    // o Coutada Velha não se sugere (o utilizador não gosta), mesmo com nota
    const cv = [{ nome: 'Coutada Velha Signature Alentejano Vinho Tinto', cent: 659, nt: 95, nr: 'x' }, ...ps];
    assert.ok(!candidatosMelhores('vinho', cv).some((x) => x.i === 0));
    assert.deepEqual(maisCotados(cv), [3, 4]);
});
