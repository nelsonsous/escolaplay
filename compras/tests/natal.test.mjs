// O Cabaz de Natal (volta 10): as partes, os pontos de qualidade de cada nome, os modos, o teto e a rota.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PARTES, pontosDe, ordenar, caberNoTeto, cabazDeNatal } from '../proxy/src/natal.js';
import worker from '../proxy/src/worker.js';
import { d1 } from './d1.mjs';
import { kv } from './kv.mjs';

const parte = (k) => PARTES.find((p) => p.k === k);
const AGORA = new Date('2026-11-15T12:00:00Z');

test('os pontos: o calibre e a cura do bacalhau, a idade do Porto (só a melhor conta), o congelado não conta no polvo', () => {
    const b = pontosDe(parte('bacalhau'), 'Bacalhau Especial Noruega Cura Amarela kg');
    assert.equal(b.q, 3 + 2 + 1);
    assert.deepEqual(b.porque, ['+ especial', '+ cura tradicional', '+ Noruega/Islândia']);
    assert.ok(pontosDe(parte('bacalhau'), 'Bacalhau Corrente kg').q < 0);
    assert.equal(pontosDe(parte('porto'), 'Vinho do Porto Tawny 20 Anos').q, 3);
    assert.equal(pontosDe(parte('polvo'), 'Polvo Congelado Inteiro Marrocos').q, 2);
    assert.equal(pontosDe(parte('espumante'), 'Espumante Bairrada Bruto Natural Reserva').q, 1 + 1 + 1 + 1); // reserva também dá «gama superior»
});

test('os modos: a qualidade põe o melhor à frente, o preço o mais barato, o equilíbrio fica no meio; o teto troca onde poupa mais', () => {
    const ops = [
        { cadeia: 'a', nome: 'Bom', cent: 3000, uc: 3000, q: 4 },
        { cadeia: 'b', nome: 'Médio', cent: 1800, uc: 1800, q: 3 },
        { cadeia: 'c', nome: 'Barato', cent: 900, uc: 900, q: 0 },
    ];
    assert.deepEqual(ordenar(ops, 'qualidade').map((o) => o.nome), ['Bom', 'Médio', 'Barato']);
    assert.deepEqual(ordenar(ops, 'preco').map((o) => o.nome), ['Barato', 'Médio', 'Bom']);
    assert.equal(ordenar(ops, 'equilibrio')[0].nome, 'Médio');
    const partes = [{ opcoes: ordenar(ops, 'qualidade') }, { opcoes: [{ cent: 1000, q: 2 }, { cent: 900, q: 0 }] }];
    assert.equal(caberNoTeto(partes, null).total, 4000);
    const r = caberNoTeto(partes, 3000);
    assert.ok(r.total <= 3000);
    assert.deepEqual(r.esc, [1, 0]); // desce o primeiro (poupa 12 € por 1 ponto), o segundo fica
});

test('o cabaz da base: só os do tipo e com o nome certo, as cadeias pedidas, os produtores, e a rota /api/natal', async () => {
    const db = d1();
    const ins = (cadeia, id, nome, tipo, cent, uc, ub = 'kg') => db.sql.prepare(`INSERT INTO preco (cadeia, id, url, nome, cent, uc, ub, tipo, visto, falhas)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`).run(cadeia, id, 'https://x/' + id, nome, cent, uc, ub, tipo, AGORA.toISOString());
    ins('continente', 'c1', 'Bacalhau Especial Noruega kg', 'bacalhau', 1599, 1599);
    ins('auchan', 'a1', 'Bacalhau Corrente kg', 'bacalhau', 899, 899);
    ins('pingodoce', 'p1', 'Pataniscas de Bacalhau', 'bacalhau', 399, 1330);
    ins('continente', 'c2', 'Vinho do Porto Tawny 10 Anos', 'vinho-tinto', 1299, 1732, 'l');
    ins('auchan', 'a2', 'Vinho Tinto Douro', 'vinho-tinto', 499, 665, 'l');
    db.sql.prepare(`INSERT INTO produtor_artigo (loja, id, nome, url, variante, cent, emb, uc, ub, tipo, disponivel, visto)
        VALUES ('lugrade', 'l1', 'Bacalhau Graúdo Cura Tradicional', 'https://lugrade/l1', '1 kg', 2860, '1 kg', 2860, 'kg', 'bacalhau', 1, ?)`).run(AGORA.toISOString());
    const c = await cabazDeNatal(db, { modo: 'qualidade' }, AGORA);
    const bac = c.partes.find((p) => p.k === 'bacalhau');
    assert.deepEqual(bac.opcoes.map((o) => o.id), ['l1', 'c1', 'a1']); // graúdo de cura tradicional (produtor) à frente // as pataniscas não são bacalhau da consoada
    assert.equal(bac.opcoes[0].produtor, 1);
    assert.deepEqual(c.partes.find((p) => p.k === 'porto').opcoes.map((o) => o.id), ['c2']); // pelo nome, noutro tipo
    assert.equal(c.partes.find((p) => p.k === 'bolo-rei').opcoes.length, 0);
    const so = await cabazDeNatal(db, { modo: 'preco', cadeias: ['auchan'] }, AGORA);
    assert.deepEqual(so.partes.find((p) => p.k === 'bacalhau').opcoes.map((o) => o.cadeia), ['auchan', 'lugrade']);
    // a rota
    const env = { KV: kv({}), DB: db };
    const { chave } = await (await worker.fetch(new Request('https://x/api/aparelho', { method: 'POST' }), env)).json();
    const r = await (await worker.fetch(new Request('https://x/api/natal?modo=preco&teto=25&partes=bacalhau,porto', { headers: { authorization: 'Bearer ' + chave } }), env)).json();
    assert.equal(r.modo, 'preco');
    assert.deepEqual(r.partes.map((p) => p.k), ['bacalhau', 'porto']);
    assert.equal(r.total, 899 + 1299);
    assert.equal(r.cabe, true);
    assert.equal((await cabazDeNatal(db, { modo: 'qualidade', teto: 15, partes: ['bacalhau', 'porto'] }, AGORA)).cabe, false); // não há como caber
});

test('o vinho da ceia e o Porto pela nota dos críticos e pela Vivino; o bacalhau da loja de produtor sem «bacalhau» no nome; o paloco desce', async () => {
    const db = d1();
    const ins = (cadeia, id, nome, tipo, cent, uc, ub = 'l') => db.sql.prepare(`INSERT INTO preco (cadeia, id, url, nome, cent, uc, ub, tipo, visto, falhas)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`).run(cadeia, id, 'https://x/' + id, nome, cent, uc, ub, tipo, AGORA.toISOString());
    ins('continente', 'v1', 'Papa Figos Douro Vinho Tinto', 'vinho-tinto', 699, 932);
    ins('auchan', 'v2', 'Vinho Tinto Alentejo Reserva Marca X', 'vinho-tinto', 599, 799);
    ins('auchan', 'v3', 'Vinho Tinto Coutada Velha Premium', 'vinho-tinto', 899, 1199);
    ins('pingodoce', 'v4', 'Vinho Tinto Bag-in-Box 5 L', 'vinho-tinto', 999, 200);
    ins('auchan', 'v5', 'Vinho Tinto Colheita Secular Tinto 1L', 'vinho-tinto', 99, 99); // o tinto de 0,99 € o litro
    ins('continente', 'v6', 'Nordeste Vinho Tinto', 'vinho-tinto', 519, 104); // 5 L (o nome não diz)
    ins('lidl', 'v7', 'Vinho Tinto Regional Lisboa', 'vinho-tinto', 249, 332); // garrafa, mas sem nota nem gama
    ins('auchan', 'b1', 'Paloco Seco Graúdo kg', 'bacalhau', 999, 999, 'kg');
    ins('continente', 'b2', 'Bacalhau Crescido Noruega kg', 'bacalhau', 1299, 1299, 'kg');
    db.sql.prepare(`INSERT INTO vinho_nota (palavras, fora, nome, nota, n, resumo, fontes, visto) VALUES ('papa figos tinto', '', 'Papa Figos', 92, 1, 'Revista de Vinhos 17/20', '[]', ?)`).run(AGORA.toISOString());
    db.sql.prepare(`INSERT INTO produtor_artigo (loja, id, nome, url, variante, cent, emb, uc, ub, tipo, disponivel, visto, vivino) VALUES
        ('lugrade', 'l1', 'Especial', 'https://lugrade/l1', 'islandia · 3.25 a 3.5kg', 11448, '3,38 kg', 3392, 'kg', 'bacalhau', 1, ?, NULL),
        ('vinha', 'w1', 'Vinho Tinto Quinta X Grande Reserva 2020', 'https://vinha/w1', NULL, 2500, '75 cl', 3333, 'l', 'vinho-tinto', 1, ?, 4.3)`).run(AGORA.toISOString(), AGORA.toISOString());
    const c = await cabazDeNatal(db, { modo: 'qualidade' }, AGORA);
    const v = c.partes.find((p) => p.k === 'vinho');
    assert.deepEqual(v.opcoes.map((o) => o.id), ['w1', 'v1', 'v2']); // Vivino 4,3 e Grande Reserva; o Papa Figos ★ 92; nem Coutada Velha nem bag-in-box
    assert.match(v.opcoes[1].porque[0], /★ 92 \(Revista de Vinhos 17\/20\)/);
    assert.equal(v.opcoes[0].uc, null); // compara-se a garrafa, não o litro
    // pelo preço, continua a ser só entre garrafas com nota ou gama: nada de litros, garrafões nem tintos sem nota
    const pv = (await cabazDeNatal(db, { modo: 'preco' }, AGORA)).partes.find((p) => p.k === 'vinho');
    assert.deepEqual(pv.opcoes.map((o) => o.id), ['v2', 'v1', 'w1']);
    assert.match(v.opcoes[0].porque.join(' '), /Vivino 4,3/);
    const b = c.partes.find((p) => p.k === 'bacalhau');
    assert.equal(b.opcoes[0].id, 'l1'); // o «Especial» da Lugrade é bacalhau
    assert.ok(!b.opcoes.some((o) => o.id === 'b1')); // o paloco não é bacalhau: fica de fora
});
