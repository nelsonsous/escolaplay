// O índice para procurar produtos: os endereços dos mapas do site, o texto de cada cadeia e a procura.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { produtoDoEndereco, endereco, montarIndice, procurar, palavras, legivel, vocabulario, tipoDoNome } from '../proxy/src/indice.js';

test('cada cadeia: o nome, o número e a categoria saem do endereço, e o endereço refaz-se', () => {
    const casos = [
        ['continente', 'https://www.continente.pt/produto/leite-uht-meio-gordo-mimosa-4421406.html', { nome: 'leite-uht-meio-gordo-mimosa', id: '4421406', cat: '' }],
        ['pingodoce', 'https://www.pingodoce.pt/home/produtos/mercearia/arroz-massa-e-leguminosas/massa/massa-esparguete-nacional-10756.html', { nome: 'massa-esparguete-nacional', id: '10756', cat: 'mercearia/arroz-massa-e-leguminosas/massa' }],
        ['auchan', 'https://www.auchan.pt/pt/alimentacao/mercearia/arroz-e-massa/arroz/arroz-agulha-oriente-extra-longo-1kg/3350.html', { nome: 'arroz-agulha-oriente-extra-longo-1kg', id: '3350', cat: 'alimentacao/mercearia/arroz-e-massa/arroz' }],
        ['lidl', 'https://www.lidl.pt/p/milbona-iogurte-grego/p11041532', { nome: 'milbona-iogurte-grego', id: '11041532', cat: '' }],
    ];
    for (const [c, u, p] of casos) {
        assert.deepEqual(produtoDoEndereco(c, u), p, c);
        assert.equal(endereco(c, p), u, c);
    }
});

test('fica de fora o que não é de supermercado, e o que não é página de produto', () => {
    assert.equal(produtoDoEndereco('auchan', 'https://www.auchan.pt/pt/tecnologia/telemoveis/smartphone-x/123.html'), null);
    assert.equal(produtoDoEndereco('pingodoce', 'https://www.pingodoce.pt/home/produtos/casa-e-eletrodomesticos/x/torradeira-9.html'), null);
    assert.equal(produtoDoEndereco('continente', 'https://www.continente.pt/pesquisa/?q=leite'), null);
    assert.equal(produtoDoEndereco('lidl', 'https://www.lidl.pt/c/folhetos/s10020672'), null);
});

test('o texto de uma cadeia: categorias primeiro, uma linha por produto, sem repetidos', () => {
    const t = montarIndice('pingodoce', [
        'https://www.pingodoce.pt/home/produtos/mercearia/massa/massa-esparguete-nacional-10756.html',
        'https://www.pingodoce.pt/home/produtos/mercearia/massa/massa-esparguete-nacional-10756.html',
        'https://www.pingodoce.pt/home/produtos/laticinios/leite/leite-uht-meio-gordo-mimosa-555.html',
    ]);
    assert.equal(t, '#0\tmercearia/massa\n#1\tlaticinios/leite\nmassa-esparguete-nacional\t10756\t0\nleite-uht-meio-gordo-mimosa\t555\t1\n');
});

test('com um vocabulário, ficam só os tipos de produto de supermercado (e os vinhos)', () => {
    const voc = vocabulario('leite-uht\t1\t\narroz-agulha\t2\t\n');
    assert.deepEqual([...voc].sort(), ['arroz', 'leite']);
    assert.equal(tipoDoNome('leite-uht-meio-gordo\t1\t'), 'leite');
    const t = montarIndice('continente', [
        'https://www.continente.pt/produto/leite-uht-meio-gordo-mimosa-1.html',
        'https://www.continente.pt/produto/lego-city-comboio-2.html',
        'https://www.continente.pt/produto/quinta-do-crasto-tinto-3.html',
    ], { vocabulario: voc });
    assert.equal(t, 'leite-uht-meio-gordo-mimosa\t1\t\nquinta-do-crasto-tinto\t3\t\n');
});

test('as palavras da consulta: minúsculas, sem acentos, sem números nem palavras curtas, no singular', () => {
    assert.deepEqual(palavras('2 Leites meio-gordo'), ['leite', 'meio', 'gordo']);
    assert.deepEqual(palavras('Pães de forma'), ['pao', 'forma']);
    assert.deepEqual(palavras('limões'), ['limao']);
    assert.deepEqual(palavras('ovos'), ['ovo']);
    assert.deepEqual(palavras('papel higiénico 1 kg'), ['papel', 'higienico']);
    assert.deepEqual(palavras(''), []);
    assert.equal(legivel('leite-uht-meio-gordo'), 'Leite uht meio gordo');
});

const TEXTO = montarIndice('continente', [
    'chocolate-de-leite-milka-1', 'leite-uht-meio-gordo-mimosa-2', 'leite-uht-meio-gordo-mimosa-pack-economico-3',
    'leite-uht-meio-gordo-mimosa-4', 'leite-achocolatado-agros-5', 'ovos-classe-m-6', 'bolo-novo-7', 'iogurte-leite-condensado-8',
].map((s) => `https://www.continente.pt/produto/${s}.html`));

test('procurar: primeiro os nomes que começam pela palavra pedida, e os mais curtos; o mesmo nome só uma vez', () => {
    const r = procurar('continente', TEXTO, 'leite meio gordo', 6);
    assert.deepEqual(r.map((p) => p.nome), ['Leite uht meio gordo mimosa', 'Leite uht meio gordo mimosa pack economico']);
    assert.deepEqual(r[0], { id: '2', nome: 'Leite uht meio gordo mimosa', url: 'https://www.continente.pt/produto/leite-uht-meio-gordo-mimosa-2.html' });
    assert.deepEqual(procurar('continente', TEXTO, '2 leites', 6).map((p) => p.id), ['5', '2', '3', '8', '1']);
});

test('procurar: a palavra tem de começar uma palavra do nome («ovo» não acha «novo»)', () => {
    assert.deepEqual(procurar('continente', TEXTO, 'ovos', 6).map((p) => p.id), ['6']);
    assert.deepEqual(procurar('continente', TEXTO, 'condensado', 6).map((p) => p.id), ['8']);
    assert.deepEqual(procurar('continente', TEXTO, 'xpto', 6), []);
    assert.deepEqual(procurar('continente', '', 'leite', 6), []);
    assert.deepEqual(procurar('continente', TEXTO, '', 6), []);
});
