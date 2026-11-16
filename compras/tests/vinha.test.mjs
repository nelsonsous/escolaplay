// O Vinha (volta 13): a página de um vinho (excerto real, de 15/11/2026) dá o preço, a Vivino e as notas dos críticos;
// o nome condiz com o do supermercado só quando é o mesmo vinho; e aparece nas lojas online do tipo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { lerVinho, condiz, premiosDoTexto, tipoDoSlug, mesmoVinho } from '../proxy/src/vinha.js';
import { escolher, juntarFontes, vinhosDoMapa } from '../economo/vinha.mjs';

const URL_ESP = 'https://www.vinha.pt/vinho/vinho-tinto-herdade-do-esporao-esporao-reserva-2023-75cl-alentejo/';

test('Vinha: o preço, o EAN, a Vivino e as notas dos críticos com o ano', () => {
    const v = lerVinho(readFileSync(new URL('./fontes/vinha-esporao-reserva.html', import.meta.url), 'utf8'), URL_ESP);
    assert.deepEqual([v.id, v.tipo, v.cent, v.cl, v.colheita, v.ean, v.disponivel, v.vivino, v.votos],
        ['100168', 'vinho-tinto', 1679, 75, 2023, '5601989980809', 1, 4.1, 903]);
    assert.equal(v.nome, 'Vinho Tinto Herdade do Esporão Esporão Reserva 2023 Alentejo');
    assert.deepEqual(v.fontes[0], { fonte: 'Wine Spectator', tipo: 'critico', valor: '90/100', colheita: 2023 });
    assert.ok(v.fontes.some((f) => f.fonte === 'Robert Parker' && f.colheita === 2016));
    assert.ok(!v.fontes.some((f) => f.valor === '90/00')); // a gralha da página não conta
});

test('Vinha: os prémios por linha (pontos e medalhas)', () => {
    assert.deepEqual(premiosDoTexto('Editor&#8217;s Choice &#8211; 93/100 Wine Enthusiast (2021)<br />\nMedalha de Ouro &#8211; Concurso Vinhos de Portugal 2023<br />17/20 Revista de Vinhos (2022)'), [
        { fonte: 'Wine Enthusiast', tipo: 'critico', valor: '93/100', colheita: 2021 },
        { fonte: 'Concurso Vinhos de Portugal 2023', tipo: 'concurso', valor: 'Ouro', colheita: 2023 },
        { fonte: 'Revista de Vinhos', tipo: 'critico', valor: '17/20', colheita: 2022 },
    ]);
});

test('Vinha: o mesmo vinho do supermercado (a gama, a casta e o Porto de outro ano não condizem)', () => {
    assert.equal(condiz('Monte Velho Alentejano Vinho Tinto', 'vinho-tinto-herdade-do-esporao-monte-velho-2025-75cl-alentejo').chave, 'monte velho tinto');
    assert.ok(condiz('Esporão Reserva Alentejo Vinho Tinto', 'Vinho Tinto Herdade do Esporão Esporão Reserva 2023, 75cl Alentejo'));
    assert.equal(condiz('Esporão Alentejo Vinho Tinto', 'Vinho Tinto Herdade do Esporão Esporão Reserva 2023'), null); // o Reserva não é o de entrada
    assert.equal(condiz('Vinho do Porto LBV', 'vinho-do-porto-niepoort-lbv-2021-75cl-douro'), null); // só «LBV»
    assert.equal(condiz('Murganheira Reserva Meio Seco', 'espumante-murganheira-super-reserva-meio-seco-75cl'), null);
    assert.equal(condiz('Quinta X Tinto Douro', 'vinho-tinto-quinta-x-touriga-nacional-2022-75cl-douro'), null);
    assert.equal(condiz('Vista Alegre Vinho do Porto Vintage 2006', 'vinho-do-porto-vista-alegre-vintage-1997-75cl-douro'), null);
    assert.equal(tipoDoSlug('https://www.vinha.pt/vinho/espumante-raposeira-reserva-doce-75cl/'), 'espumante');
    // entre vários do Vinha, o de menos palavras a mais (o Quinta do Mouro, não o «Erro»)
    const esc = escolher(['https://www.vinha.pt/vinho/vinho-tinto-quinta-do-mouro-erro-4-2017-75cl-alentejo/',
        'https://www.vinha.pt/vinho/vinho-tinto-quinta-do-mouro-2019-75cl-alentejo/'], [{ nome: 'Quinta do Mouro Alentejano Vinho Tinto', tipo: 'vinho-tinto', q: 0.75 }]);
    assert.deepEqual([...esc.keys()], ['https://www.vinha.pt/vinho/vinho-tinto-quinta-do-mouro-2019-75cl-alentejo/']);
    assert.deepEqual(vinhosDoMapa('<url><loc>https://www.vinha.pt/vinho/a/</loc></url><url><loc>https://www.vinha.pt/outro/</loc></url>'), ['https://www.vinha.pt/vinho/a/']);
    assert.equal(juntarFontes([{ fonte: 'A', valor: '90/100', colheita: 2020 }], [{ fonte: 'a', valor: '90/100', colheita: 2020 }, { fonte: 'B', valor: 'Ouro' }]).length, 2);
});

test('Vinha nas lojas online do tipo: a Vivino, os portes e o mesmo vinho no supermercado', async () => {
    const { d1 } = await import('./d1.mjs');
    const { guardarCatalogo } = await import('../proxy/src/catalogo.js');
    const { produtosDoTipo, esquecerTipos } = await import('../proxy/src/sugerir.js');
    const db = d1();
    db.sql.exec(`INSERT INTO tipo (k, nome, n, casa) VALUES ('vinho-tinto', 'Vinho tinto', 2, 1);
        INSERT INTO produtor_artigo (loja, id, nome, url, cent, emb, uc, ub, tipo, disponivel, visto, vivino, votos, chave) VALUES
        ('vinha', '1', 'Vinho Tinto Herdade do Esporão Monte Velho 2025', 'https://www.vinha.pt/vinho/m/', 549, '75 cl', 732, 'l', 'vinho-tinto', 1, '2026-11-15', 3.6, 2000, 'monte velho tinto'),
        ('vinha', '2', 'Vinho Tinto Herdade do Esporão Esporão Reserva 2023', 'https://www.vinha.pt/vinho/e/', 1679, '75 cl', 2239, 'l', 'vinho-tinto', 1, '2026-11-15', 4.1, 903, 'esporao reserva tinto');`);
    const agora = new Date();
    await guardarCatalogo(db, 'continente', 'vinho-tinto', [{ id: 'c', nome: 'Monte Velho Alentejano Vinho Tinto', preco: 4.49, emb: '75 cl', url: 'https://www.continente.pt/c' }], agora);
    esquecerTipos();
    const tp = await produtosDoTipo(db, 'vinho-tinto', agora);
    assert.deepEqual(tp.pd.map((x) => [x.loja, x.vv, x.po]), [['vinha', '4,1', 499], ['vinha', '3,6', 499]]); // a melhor Vivino primeiro
    assert.deepEqual(tp.pd[1].mv, { c: 'continente', cent: 449, nome: 'Monte Velho Alentejano Vinho Tinto' });
    assert.equal(tp.pd[0].mv, undefined);
    assert.deepEqual(mesmoVinho([{ c: 'auchan', cent: 399, q: 1.5, nome: 'Monte Velho Tinto' }], 'monte velho tinto'), null); // outra garrafa
});

test('Garrafeira Soares: o preço, o EAN e o tamanho dos dados da página; o tipo e a garrafa pelo endereço', async () => {
    const { lerSoares, tipoDoSlug, slugDe } = await import('../proxy/src/vinha.js');
    const u = 'https://www.garrafeirasoares.pt/pt/portugal/vinhos/vinho-tinto-esporao-colheita-75-cl/item_10015.html';
    const v = lerSoares(readFileSync(new URL('./fontes/soares-esporao-colheita.html', import.meta.url), 'latin1'), u);
    assert.deepEqual([v.id, v.nome, v.tipo, v.cent, v.cl, v.ean, v.disponivel], ['2013021', 'Vinho Tinto Esporao Colheita', 'vinho-tinto', 849, 75, '5601989976758', 1]);
    assert.equal(slugDe(u), 'vinho-tinto-esporao-colheita-75-cl');
    assert.equal(tipoDoSlug('https://www.garrafeirasoares.pt/pt/portugal/portos-e-fortificados/porto-ramos-pinto-lbv-75-cl/item_1.html'), 'vinho-do-porto');
    assert.equal(tipoDoSlug('https://www.garrafeirasoares.pt/pt/portugal/vinhos/vinho-verde-alvarinho-soalheiro-75-cl/item_2.html'), 'vinho-branco');
    // a garrafa de 75 cl e o mesmo vinho do supermercado (o «Colheita» não é o Reserva)
    const esc = escolher([u, 'https://www.garrafeirasoares.pt/pt/portugal/vinhos/vinho-tinto-esporao-reserva-1-5-l/item_10017.html'],
        [{ nome: 'Esporão Colheita Alentejo Vinho Tinto', tipo: 'vinho-tinto', q: 0.75 }, { nome: 'Esporão Reserva Alentejo Vinho Tinto', tipo: 'vinho-tinto', q: 0.75 }]);
    assert.deepEqual([...esc], [[u, 'esporao colheita tinto']]);
});

test('Vinha: os extras são portugueses de 75 cl, de gama alta primeiro, sem os já escolhidos', async () => {
    const { extras } = await import('../economo/vinha.mjs');
    const b = 'https://www.vinha.pt/vinho/';
    const urls = [b + 'vinho-tinto-x-2022-75cl-douro/', b + 'vinho-tinto-y-grande-reserva-2019-75cl-douro/', b + 'vinho-tinto-z-reserva-2021-75cl-alentejo/',
        b + 'vinho-tinto-w-grande-reserva-2018-75cl-bordeus-franca/', b + 'vinho-tinto-v-grande-reserva-2018-15l-douro/', b + 'vinho-tinto-u-reserva-2020-75cl-dao/'];
    assert.deepEqual(extras(urls, new Set([b + 'vinho-tinto-u-reserva-2020-75cl-dao/']), 3),
        [b + 'vinho-tinto-y-grande-reserva-2019-75cl-douro/', b + 'vinho-tinto-z-reserva-2021-75cl-alentejo/', b + 'vinho-tinto-x-2022-75cl-douro/']);
});
