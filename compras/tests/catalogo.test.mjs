// O catálogo (volta 5): ler as páginas de categoria das cadeias (com excertos reais, de 15/11/2026) e guardar os
// produtos na tabela preco com o tipo, a marca própria e a embalagem.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { lerCategoria, guardarCatalogo, nomeDoTipo, propria } from '../proxy/src/catalogo.js';
import { d1 } from './d1.mjs';

const pagina = (f) => readFileSync(new URL(`./fontes/${f}`, import.meta.url), 'utf8');

test('Continente: nome, marca, preço, embalagem, preço por litro e o PVPR riscado', () => {
    const ps = lerCategoria('continente', pagina('continente-categoria-agua.html'));
    assert.equal(ps.length, 4);
    assert.deepEqual(ps[0], {
        id: '5096262', nome: 'Água sem Gás Garrafão Luso', marca: 'Luso',
        url: 'https://www.continente.pt/produto/agua-sem-gas-garrafao-luso-5096262.html',
        preco: 1.99, antes: null, emb: '7 lt', precoUnidade: { valor: 0.28, unidade: 'l' },
        cat: 'Supermercado/Bebidas e Garrafeira/Água/Água sem Gás',
    });
    assert.equal(ps[3].emb, '6 x 1,5 lt');
});

test('Pingo Doce: os dados do cartão e «6 L | 0,16 €/L»', () => {
    const ps = lerCategoria('pingodoce', pagina('pingodoce-categoria-agua.html'));
    assert.ok(ps.length >= 2);
    assert.deepEqual(ps[0], {
        id: '868788', nome: 'Água sem Gás Garrafão', marca: 'Pingo Doce',
        url: 'https://www.pingodoce.pt/home/produtos/aguas-sumos-e-refrigerantes/aguas/aguas-sem-gas/agua-sem-gas-garrafao-pingo-doce-868788.html',
        preco: 0.96, antes: null, emb: '6 L', precoUnidade: { valor: 0.16, unidade: 'l' },
        cat: 'Águas, Sumos e Refrigerantes/Águas sem Gás',
    });
});

test('Auchan: os dados do cartão, a ligação e «0.16 €/Lt»', () => {
    const ps = lerCategoria('auchan', pagina('auchan-categoria-agua.html'));
    assert.equal(ps.length, 4);
    assert.deepEqual(ps[0], {
        id: '255397', nome: 'ÁGUA AUCHAN DA NASCENTE GARRAFÃO 6L', marca: 'AUCHAN',
        url: 'https://www.auchan.pt/pt/bebidas-e-garrafeira/aguas/aguas-sem-gas/agua-auchan-da-nascente-garrafao-6l/255397.html',
        preco: 0.96, antes: null, emb: null, precoUnidade: { valor: 0.16, unidade: 'l' },
        cat: 'bebidas-e-garrafeira/águas/águas-sem-gás',
    });
    assert.deepEqual(lerCategoria('auchan', '<html>nada</html>'), []);
    assert.deepEqual(lerCategoria('lidl', pagina('auchan-categoria-agua.html')), []);
});

test('o nome do tipo, e a marca própria de cada cadeia', () => {
    assert.equal(nomeDoTipo('Supermercado/Bebidas e Garrafeira/Água/Água sem Gás'), 'Água sem gás');
    assert.equal(nomeDoTipo('bebidas-e-garrafeira/águas/águas-sem-gás'), 'Águas sem gás');
    assert.equal(propria('continente', 'Continente Equilíbrio'), 1);
    assert.equal(propria('pingodoce', 'Pingo Doce'), 1);
    // as marcas da casa do Pingo Doce nos frescos também são marca própria
    assert.equal(propria('pingodoce', 'Nosso Talho'), 1);
    assert.equal(propria('pingodoce', 'Nossa Peixaria'), 1);
    assert.equal(propria('auchan', 'POLEGAR'), 1);
    assert.equal(propria('auchan', 'LUSO'), 0);
    assert.equal(propria('continente', null), 0);
});

test('guardar: na tabela preco, com o tipo, a embalagem igual em todas as cadeias e o preço por litro', async () => {
    const db = d1();
    const agora = new Date('2026-11-15T10:00:00Z');
    await guardarCatalogo(db, 'continente', 'agua-sem-gas', lerCategoria('continente', pagina('continente-categoria-agua.html')), agora);
    await guardarCatalogo(db, 'auchan', 'agua-sem-gas', lerCategoria('auchan', pagina('auchan-categoria-agua.html')), agora);
    const l = db.linhas("SELECT cadeia, id, emb, q, ub, uc, cent, propria, tipo FROM preco ORDER BY cadeia, id");
    assert.equal(l.length, 8);
    assert.deepEqual(l.find((r) => r.id === '5096262'), { cadeia: 'continente', id: '5096262', emb: '7 L', q: 7, ub: 'l', uc: 28, cent: 199, propria: 0, tipo: 'agua-sem-gas' });
    assert.deepEqual(l.find((r) => r.id === '4000753'), { cadeia: 'auchan', id: '4000753', emb: '6 × 1,5 L', q: 9, ub: 'l', uc: 21, cent: 192, propria: 1, tipo: 'agua-sem-gas' });
    // ler outra vez a mesma página atualiza (não duplica)
    await guardarCatalogo(db, 'auchan', 'agua-sem-gas', lerCategoria('auchan', pagina('auchan-categoria-agua.html')), agora);
    assert.equal(db.linhas('SELECT count(*) n FROM preco')[0].n, 8);
    // e só escreve o que mudou: a mesma página no dia seguinte não escreve nada (o limite diário da D1 grátis)…
    const prods = lerCategoria('auchan', pagina('auchan-categoria-agua.html'));
    let antes = db.escritas;
    await guardarCatalogo(db, 'auchan', 'agua-sem-gas', prods, new Date('2026-11-16T10:00:00Z'));
    assert.equal(db.escritas - antes, 0);
    // …um preço que muda escreve só esse produto…
    antes = db.escritas;
    await guardarCatalogo(db, 'auchan', 'agua-sem-gas', prods.map((p, i) => (i ? p : { ...p, preco: p.preco + 0.1 })), new Date('2026-11-16T12:00:00Z'));
    assert.equal(db.escritas - antes, 1);
    // …e passados 3 dias volta a gravar todos (o «visto» não fica velho)
    antes = db.escritas;
    await guardarCatalogo(db, 'auchan', 'agua-sem-gas', prods, new Date('2026-11-19T11:00:00Z'));
    assert.equal(db.escritas - antes, prods.length);
});

// ---------- o cron, a sonda e a escrita ----------
import worker from '../proxy/src/worker.js';
import { esquecerTipos } from '../proxy/src/sugerir.js';
import { kv } from './kv.mjs';
import { PAGINAS, instalar, desinstalar } from './cadeias.mjs';

const PD = 'https://www.pingodoce.pt/home/produtos/aguas-sumos-e-refrigerantes/aguas/aguas-sem-gas';
const AU = 'https://www.auchan.pt/pt/bebidas-e-garrafeira/aguas/aguas-sem-gas/';
const CO = 'https://www.continente.pt/supermercado/bebidas-e-garrafeira/agua/agua-sem-gas/';
function ambiente() {
    const env = { KV: kv(), DB: d1(), ALLOWED_ORIGINS: '', SONDA_TOKEN: 'segredo' };
    env.DB.sql.exec(`INSERT INTO tipo (k, nome, casa) VALUES ('agua-sem-gas', 'Água sem gás', 1), ('agua-com-gas', 'Água com gás', 1), ('leite', 'Leite', 1);
        INSERT INTO pagina (url, cadeia, tipo) VALUES ('${PD}', 'pingodoce', 'agua-sem-gas'), ('${AU}', 'auchan', 'agua-sem-gas'), ('${CO}', 'continente', 'agua-sem-gas');`);
    PAGINAS.clear();
    PAGINAS.set(PD, pagina('pingodoce-categoria-agua.html'));
    PAGINAS.set(AU, pagina('auchan-categoria-agua.html'));
    PAGINAS.set(CO, pagina('continente-categoria-agua.html'));
    esquecerTipos();
    return env;
}

test('o cron lê uma página de categoria de cada vez, à vez por cadeia; depois está tudo em dia', async (t) => {
    const pedidos = instalar();
    t.after(desinstalar);
    const env = ambiente();
    const correr = async (iso) => {
        const espera = [];
        await worker.scheduled({ scheduledTime: Date.parse(iso) }, env, { waitUntil: (p) => espera.push(p) });
        await Promise.all(espera);
    };
    await correr('2026-11-15T10:02:00Z'); // minuto 2: a 2.ª cadeia (Pingo Doce)
    assert.deepEqual(pedidos.map((p) => p.url), [PD]);
    assert.equal(pedidos[0].init.headers['user-agent'].startsWith('compras/'), true);
    await correr('2026-11-15T10:04:00Z'); // Auchan
    await correr('2026-11-15T10:06:00Z'); // Continente
    assert.equal(pedidos.length, 3);
    assert.equal(env.DB.linhas("SELECT count(*) n FROM preco WHERE tipo = 'agua-sem-gas'")[0].n, 12);
    assert.deepEqual(env.DB.linhas("SELECT n FROM tipo WHERE k = 'agua-sem-gas'"), [{ n: 12 }]);
    await correr('2026-11-15T10:08:00Z'); // o Pingo Doce já foi lido: nada
    assert.equal(pedidos.length, 3);
    // no dia seguinte volta a ler
    await correr('2026-11-16T10:02:00Z');
    assert.equal(pedidos.length, 4);
});

test('a sonda do catálogo só lê as páginas que estão no catálogo, e com o segredo', async (t) => {
    instalar();
    t.after(desinstalar);
    const env = ambiente();
    const pedir = (u, chave = 'segredo') => worker.fetch(new Request(`https://x/sonda/catalogo?url=${encodeURIComponent(u)}`, { headers: { authorization: 'Bearer ' + chave } }), env);
    assert.deepEqual(await (await pedir(AU)).json(), { url: AU, estado: 200, n: 4 });
    assert.equal((await pedir('https://www.auchan.pt/pt/outra/')).status, 404);
    assert.equal((await pedir(AU, 'errado')).status, 401);
});

test('escrever e encontrar: os tipos pelo que se escreve, e os produtos de um tipo com tamanhos e marcas', async (t) => {
    instalar();
    t.after(desinstalar);
    const env = ambiente();
    for (const u of [PD, AU, CO]) await lerPaginaDireta(env, u);
    const { chave } = await (await worker.fetch(new Request('https://x/api/aparelho', { method: 'POST' }), env)).json();
    const api = async (c) => (await worker.fetch(new Request('https://x' + c, { headers: { authorization: 'Bearer ' + chave } }), env)).json();
    // «ág», «agua», «AGUA s»: a água sem gás primeiro (só os tipos com produtos aparecem)
    assert.deepEqual((await api('/api/sugerir?q=%C3%A1g')).tipos, [{ k: 'agua-sem-gas', nome: 'Água sem gás', n: 12, s: 6 }]); // s: a secção (Bebidas)
    assert.deepEqual((await api('/api/sugerir?q=AGUA%20s')).tipos.map((x) => x.k), ['agua-sem-gas']);
    assert.deepEqual((await api('/api/sugerir?q=leite')).tipos, []);
    // a secção pelo nome («bebi» → Bebidas, à frente) e os tipos dela; duas palavras: o tipo e a variante
    assert.deepEqual((await api('/api/sugerir?q=bebi')).tipos.slice(0, 1), [{ sec: 6, nome: 'Bebidas' }]);
    assert.deepEqual((await api('/api/seccao?s=6')).tipos.map((t) => t.k), ['agua-sem-gas']);
    assert.deepEqual((await api('/api/sugerir?q=agua%20alcalina')).tipos.map((t) => [t.k, t.w]), [['agua-sem-gas', 'alcalina']]);
    // pelos nomes dos produtos: «alcalina» não é um tipo, mas há águas alcalinas (a palavra vem com o tipo)
    assert.deepEqual((await api('/api/sugerir?q=alcalina')).tipos, [{ k: 'agua-sem-gas', nome: 'Água sem gás', n: 12, w: 'alcalina', s: 6 }]);
    const tp = await api('/api/tipo?k=agua-sem-gas');
    assert.equal(tp.s, 6);
    assert.equal(tp.sn, 'Bebidas');
    assert.equal(tp.nome, 'Água sem gás');
    assert.equal(tp.produtos.length, 12);
    // o mais barato por litro primeiro (empate: pela cadeia)
    assert.deepEqual(tp.produtos[0], { c: 'auchan', id: '255397', nome: 'ÁGUA AUCHAN DA NASCENTE GARRAFÃO 6L', url: AU + 'agua-auchan-da-nascente-garrafao-6l/255397.html', cent: 96, mk: 'Auchan', pr: 1, emb: '6 L', uc: 16, ub: 'l', nk: 'agua auchan nascente garrafao 6l' });
    assert.deepEqual(tp.produtos[1].c + ' ' + tp.produtos[1].id, 'pingodoce 868788');
    // as palavras que distinguem os produtos (em pelo menos dois, e não em todos)
    assert.ok(tp.palavras.some((x) => x.w === 'garrafao'));
    assert.ok(!tp.palavras.some((x) => ['agua', 'gas', 'luso'].includes(x.w)));
    // primeiro os tamanhos que há em mais cadeias
    assert.deepEqual(tp.tamanhos.slice(0, 3), [{ e: '10 L', n: 3 }, { e: '6 L', n: 3 }, { e: '6 × 1,5 L', n: 2 }]);
    assert.ok(tp.marcas.some((m) => m.m === 'Luso'));
    assert.ok(!tp.marcas.some((m) => m.m === 'Auchan')); // a marca própria conta à parte
    assert.equal(tp.brancas, 3);
    // as estimativas (Mercadona: marca branca; SPAR: marcas de fabricante) e o preço real de um talão da Mercadona
    // a estimativa de cada tamanho: o que se pagaria, por litro (a unidade do tipo), e a base (o mais barato de cada cadeia)
    const seis = tp.est.tam.find((x) => x.e === '6 L');
    assert.deepEqual([seis.merc, seis.spar, seis.umerc, seis.uspar], [96, 214, 16, 36]);
    assert.deepEqual(seis.bm, [{ c: 'auchan', cent: 96 }, { c: 'pingodoce', cent: 96 }]);
    assert.equal(tp.ub, 'l');
    assert.ok(tp.est.mp && tp.est.sp);
    assert.equal(tp.est.uc.ub, 'l');
    assert.deepEqual(tp.reais, {});
    const casa = env.DB.linhas('SELECT casa FROM aparelho')[0].casa;
    env.DB.sql.prepare('INSERT INTO talao (id, casa, loja, dia, total, linhas, criado) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run('t1', casa, 'mercadona', '2026-11-12', 198, JSON.stringify([{ t: 'AGUA S/GAS 6L', q: 2, cent: 198 }]), new Date().toISOString());
    assert.deepEqual((await api('/api/tipo?k=agua-sem-gas')).reais, { mercadona: { cent: 99, dia: '2026-11-12', t: 'AGUA S/GAS 6L' } });
    assert.equal((await worker.fetch(new Request('https://x/api/tipo?k=nada', { headers: { authorization: 'Bearer ' + chave } }), env)).status, 404);
});

async function lerPaginaDireta(env, u) {
    await worker.fetch(new Request(`https://x/sonda/catalogo?url=${encodeURIComponent(u)}`, { headers: { authorization: 'Bearer segredo' } }), env);
}

test('Pingo Doce ao quilo: «2,49 €/Kg» e o peso médio; paga-se a peça (0,21 kg ≈ 0,52 €) e compara-se a 2,49 €/kg', async () => {
    const { normaliza, medida } = await import('../proxy/src/precos.js');
    const tile = '<div class="product" data-pid="32816" data-gtm-info="{&quot;items&quot;:[{&quot;item_id&quot;:&quot;32816&quot;,&quot;item_name&quot;:&quot;Tomate Redondo 70/95&quot;,&quot;price&quot;:2.49,&quot;item_brand&quot;:&quot;Nossa Fruta e Legumes&quot;}]}">'
        + '<a href="/home/produtos/frutas-e-vegetais/tomate-redondo-32816.html">Tomate</a><div class="product-unit"> 0.21 Kg </div>'
        + '<div class="product-price "><span class="prices-list"><span class="sales "><span class="value" content="2.49"></span> 2,49 &euro;/Kg </span></span></div></div>';
    const [p] = lerCategoria('pingodoce', tile + tile.replace(/32816/g, '1').replace('&euro;/Kg', '&euro;'));
    assert.equal(p.aoPeso, true);
    assert.deepEqual(normaliza({ cadeia: 'pingodoce', nome: p.nome, cent: 249, uc: 1186, ub: 'kg', m: medida(p.emb), aoPeso: p.aoPeso }), { cent: 52, uc: 249, ub: 'kg' });
    assert.equal(lerCategoria('pingodoce', tile.replace('&euro;/Kg', '&euro;'))[0].aoPeso, undefined);
});

test('«carne» é um grupo: o talho todo (também o frango e o peru) e os cortes mais comuns; «peixe» a peixaria', async () => {
    const { sugerir } = await import('../proxy/src/sugerir.js');
    const db = d1();
    db.sql.exec(`INSERT INTO tipo (k, nome, n, casa) VALUES ('frango', 'Frango', 5, 1), ('carne-novilho', 'Carne de novilho e vitela', 6, 1),
        ('porco', 'Carne de porco', 4, 1), ('peixe-fresco', 'Peixe fresco', 3, 1), ('noodles', 'Noodles', 9, 0),
        ('novilho-vitela-e-vitelao', 'Novilho, vitela e vitelão', 7, 0), ('massas-peixe', 'Massas e gnocchis', 2, 0);`);
    esquecerTipos();
    const p = (id, nome, preco = 5) => ({ id, nome, preco, emb: '500 g', url: 'https://www.continente.pt/' + id });
    await guardarCatalogo(db, 'continente', 'carne-novilho', [p('n1', 'Picanha de Novilho'), p('n2', 'Picanha Novilho Extra'), p('n3', 'Picanha de Vitela'), p('n4', 'Novilho para Estufar'), p('n5', 'Vitela para Estufar'), p('n6', 'Novilho Estufar Extra')]);
    await guardarCatalogo(db, 'continente', 'frango', [p('f1', 'Peito de Frango'), p('f2', 'Peito de Frango Fino'), p('f3', 'Peito Frango Campo'), p('f4', 'Coxas de Frango'), p('f5', 'Frango para Estufar')]);
    await guardarCatalogo(db, 'continente', 'noodles', [p('x1', 'Noodles sabor carne'), p('x2', 'Noodles carne picante'), p('x3', 'Noodles de carne')]);
    const r = await sugerir(db, 'Carnes');
    assert.deepEqual(r[0], { sec: 2, nome: 'Talho e peixaria' });
    // os tipos do talho (sem os da peixaria nem os «noodles» com carne no nome), os da casa primeiro
    // (e sem os cruzados que repetem um da casa: «Novilho, vitela e vitelão»)
    // os ramos da árvore, pela ordem: Carne (vaca, porco, frango…)
    assert.deepEqual(r.filter((t) => t.k && !t.corte).map((t) => [t.k, t.gr]), [['carne-novilho', 'Carne'], ['porco', 'Carne'], ['frango', 'Carne']]);
    // os cortes: cada um no tipo onde há mais produtos com ele
    // pelas etiquetas do Ecónomo: a picanha é de grelhar e assar, o peito de grelhar e fritar (os usos primeiro)
    const cortes = r.filter((t) => t.corte).map((t) => [t.corte, t.k, t.w]);
    assert.deepEqual(cortes.slice(0, 4), [['para grelhar', 'carne-novilho', 'grelhar'], ['para assar', 'carne-novilho', 'assar'], ['para estufar', 'carne-novilho', 'estufar'], ['para fritar', 'frango', 'fritar']]);
    assert.ok(cortes.some((c) => c[0] === 'picanha' && c[1] === 'carne-novilho'));
    assert.ok(cortes.some((c) => c[0] === 'peito' && c[1] === 'frango'));
    assert.deepEqual((await sugerir(db, 'peixe')).filter((t) => t.k).map((t) => t.k), ['peixe-fresco']);
});

test('o bovino procura-se por «vaca» e por «bovino» (a picanha é de vaca)', async () => {
    const { sugerir } = await import('../proxy/src/sugerir.js');
    const db = d1();
    db.sql.exec(`INSERT INTO tipo (k, nome, n, casa) VALUES ('carne-novilho', 'Carne de vaca, novilho e vitela', 6, 1);`);
    esquecerTipos();
    for (const q of ['vaca', 'bovino', 'vitelão']) assert.deepEqual((await sugerir(db, q)).filter((t) => t.k).map((t) => t.k), ['carne-novilho'], q);
});

test('as etiquetas do Ecónomo: animal, corte e usos pelo nome; no tipo, as escolhas em três filas', async () => {
    const { etiquetas } = await import('../proxy/src/etiquetas.js');
    const { palavrasDoTalho } = await import('../proxy/src/sugerir.js');
    assert.deepEqual(etiquetas('Picanha de Bovino América do Sul', 'carne-novilho'), { animal: 'vaca', corte: 'picanha', usos: ['grelhar', 'assar'], pais: 'americasul' });
    assert.deepEqual(etiquetas('Acém Comprido de Novilho Fatiado no Balcão Angus', 'carne-novilho'), { animal: 'novilho', corte: 'acem', usos: ['estufar', 'cozer'] });
    assert.deepEqual(etiquetas('Costeletas do Lombo de Porco Preto Miguel & Miguel', 'porco'), { animal: 'preto', corte: 'costeleta', usos: ['grelhar'] });
    assert.deepEqual(etiquetas('Hambúrguer 100% Picanha Congelado Deliciosa', 'carne-novilho'), { animal: 'vaca', corte: 'hamburguer', usos: ['grelhar', 'fritar'] });
    assert.deepEqual(etiquetas('Porções de Salmão Fresco', 'peixe-fresco'), { animal: 'salmao', corte: 'tranche', usos: ['grelhar', 'assar'] });
    assert.deepEqual(etiquetas('Novilho para Estufar Continente', 'carne-novilho'), { animal: 'novilho', corte: null, usos: ['estufar'] });
    assert.deepEqual(etiquetas('Dourada Média Fresca', 'peixe-fresco'), { animal: 'dourada', corte: null, usos: ['grelhar', 'assar'] });
    const ws = palavrasDoTalho('carne-novilho', ['Picanha de Bovino', 'Picanha Fatiada', 'Acém de Novilho', 'Acém de Vitela', 'Vazia de Bovino'].map((nome) => ({ nome })));
    // por níveis: o corte e depois o uso (o animal, primeiro, só se há mais de um)
    assert.deepEqual(ws.map((x) => [x.g, x.r]), [['corte', 'picanha'], ['corte', 'acém'], ['uso', 'para grelhar'], ['uso', 'para assar'], ['uso', 'para estufar'], ['uso', 'para cozer']]);
    // com dois animais, a fila do animal vem primeiro e cada corte diz em que animais há
    const ws2 = palavrasDoTalho('peixe-fresco', ['Carapau Fresco', 'Carapau Grande', 'Posta de Pescada', 'Pescada Inteira', 'Posta de Salmão'].map((nome) => ({ nome })));
    assert.deepEqual(ws2.slice(0, 2).map((x) => [x.g, x.w]), [['animal', 'carapau'], ['animal', 'pescada']]);
    assert.deepEqual(ws2.find((x) => x.w === 'posta').a.sort(), ['pescada', 'salmao']); // só um animal com dois ou mais: não há fila do animal
});

test('peças inteiras ao quilo: uma picanha de 1,8 kg a «17,99 €» é 17,99 €/kg e paga-se ≈ 32,38 €', async (t) => {
    const { produtosDoTipo } = await import('../proxy/src/sugerir.js');
    const db = d1();
    db.sql.exec(`INSERT INTO tipo (k, nome, n, casa) VALUES ('carne-novilho', 'Carne de vaca, novilho e vitela', 5, 1);`);
    const p = (id, nome, preco, emb) => ({ id, nome, preco, emb, url: 'https://www.continente.pt/' + id });
    const agora = new Date();
    await guardarCatalogo(db, 'continente', 'carne-novilho', [p('a', 'Picanha de Bovino Inteira Continente', 17.99, '1,8 kg'), p('b', 'Picanha Fatiada', 7.6, '400 g'),
        p('c', 'Picanha de Bovino Fatiada Angus', 7.83, '290 g'), p('d', 'Picanha Selecionada', 17.99, '900 g'), p('e', 'Bifes Pack Familiar', 9.99, '1,2 kg')], agora);
    const tp = await produtosDoTipo(db, 'carne-novilho', agora);
    const a = tp.produtos.find((x) => x.id === 'a');
    assert.deepEqual([a.uc, a.cent, a.aq], [1799, 3238, 1]);
    // o pack familiar de bifes (outro corte, sem vizinhos pequenos) fica como está
    assert.equal(tp.produtos.find((x) => x.id === 'e').aq, undefined);
    assert.deepEqual(tp.produtos.filter((x) => /picanha/i.test(x.nome)).map((x) => x.id), ['a', 'b', 'd', 'c']); // por quilo: 17,99 · 19,00 · 19,99 · 27,00
    // a embalagem pequena com o preço do quilo (27,99 € por 340 g: 82 €/kg) também se percebe
    await guardarCatalogo(db, 'continente', 'carne-novilho', [p('f', 'Picanha Seleção Continente', 27.99, '340 g')], agora);
    const f = (await produtosDoTipo(db, 'carne-novilho', agora)).produtos.find((x) => x.id === 'f');
    assert.deepEqual([f.uc, f.cent, f.aq], [2799, 952, 1]);
});

test('Continente ao quilo: «4,49 €/kg» no preço e o peso médio; com uma variante escolhida, a estimativa é a dela', async () => {
    const { normaliza, medida } = await import('../proxy/src/precos.js');
    const tile = `<div class="product-tile col-product-tile" data-product-tile-impression='{"name":"Carapau Pequeno Fresco","id":"2147745","price":4.49,"brand":"","category":"Peixaria"}'>`
        + '<a href="https://www.continente.pt/produto/carapau-pequeno-fresco-2147745.html">x</a><p class="pwc-tile--quantity"> Quant. M&iacute;nima = 630 gr (7 un) </p>'
        + '<span class="pwc-tile--price-primary"> 4<span class="decimalPrice">,49&euro;/kg</span> </span><div class="pwc-tile--price-secondary "> 0,40&euro;/un </div></div>';
    const [p] = lerCategoria('continente', tile + tile.replace(/2147745/g, '1'));
    assert.equal(p.aoPeso, true);
    assert.deepEqual(normaliza({ cadeia: 'continente', nome: p.nome, cent: 449, uc: 40, ub: 'un', m: medida(p.emb), aoPeso: true }), { cent: 283, uc: 449, ub: 'kg' });
    // a estimativa por variante: só os produtos com essa palavra
    const { produtosDoTipo } = await import('../proxy/src/sugerir.js');
    const db = d1();
    db.sql.exec(`INSERT INTO tipo (k, nome, n, casa) VALUES ('peixe-fresco', 'Peixe fresco', 3, 1);`);
    const q = (id, nome, preco, emb, marca) => ({ id, nome, preco, emb, marca, url: 'https://www.pingodoce.pt/' + id });
    await guardarCatalogo(db, 'pingodoce', 'peixe-fresco', [q('1', 'Carapau Fresco', 4.99, '1 kg', 'Pingo Doce'), q('4', 'Carapau Grande Fresco', 5.49, '1 kg', 'Pingo Doce'), q('2', 'Salmão Fresco', 19.99, '1 kg', 'Pingo Doce'), q('3', 'Salmão Posta', 9.99, '500 g', 'Pingo Doce')]);
    const tp = await produtosDoTipo(db, 'peixe-fresco', new Date());
    assert.deepEqual(tp.est.w.find((x) => x.w === 'carapau'), { w: 'carapau', merc: 499, spar: null });
    assert.equal(tp.est.w.find((x) => x.w === 'salmao').merc, 1998);
});

test('os sinais de qualidade pelo nome: o que é melhor primeiro, depois o pior, depois o resto', async () => {
    const { sinais } = await import('../proxy/src/qualidade.js');
    assert.deepEqual(sinais('Broa da Serra de Milho com Massa Mãe'), [{ t: 'massa mãe', s: 1 }]);
    assert.deepEqual(sinais('BROA MILHO AMARELA AUCHAN CULTIVAMOS O BOM 550G'), [{ t: 'produção local', s: 1 }]);
    assert.deepEqual(sinais('Picanha Fatiada Congelada Selecionada'), [{ t: 'gama superior', s: 1 }, { t: 'congelado', s: -1 }]);
    assert.deepEqual(sinais('Leite Meio Gordo Biológico Mimosa'), [{ t: 'biológico', s: 1 }, { t: 'meio-gordo', s: 0 }]);
    assert.deepEqual(sinais('Arroz Agulha'), []);
});

test('a origem: peixe selvagem ou de aquacultura, carne biológica, do campo, DOP; e a fila «Origem» na escolha', async () => {
    const { etiquetas } = await import('../proxy/src/etiquetas.js');
    const { palavrasDoTalho } = await import('../proxy/src/sugerir.js');
    assert.equal(etiquetas('Dourada Fresca da Costa').prod, 'selvagem');
    assert.equal(etiquetas('Filetes de Robalo ASC Congelado').prod, 'aquacultura');
    assert.equal(etiquetas('Lombos de Bacalhau MSC').prod, 'selvagem');
    assert.equal(etiquetas('Hambúrguer de Bovino Carnalentejana DOP').prod, 'dop');
    assert.equal(etiquetas('Frango do Campo Inteiro').prod, 'campo');
    assert.equal(etiquetas('Dourada Média Fresca').prod, undefined); // não se adivinha
    const ws = palavrasDoTalho('peixe-fresco', ['Dourada da Costa', 'Dourada Selvagem', 'Dourada de Aquacultura', 'Robalo de Aquacultura', 'Robalo Fresco'].map((nome) => ({ nome })));
    assert.deepEqual(ws.filter((x) => x.g === 'prod').map((x) => [x.r, x.a.sort()]), [['selvagem (pesca)', ['dourada']], ['aquacultura (viveiro)', ['dourada', 'robalo']]]);
});

test('os ramos das outras secções vêm da arrumação das cadeias («Arroz, massa e farinha», «Conservas»)', async () => {
    const { tiposDaSeccao, nomeRamo } = await import('../proxy/src/sugerir.js');
    assert.equal(nomeRamo('arroz-massa-e-farinha'), 'Arroz, massa e farinha');
    assert.equal(nomeRamo('cafe-cha-e-infusoes'), 'Café, chá e infusões');
    const db = d1();
    const C = 'https://www.continente.pt/supermercado/';
    db.sql.exec(`INSERT INTO tipo (k, nome, n, casa) VALUES ('arroz', 'Arroz', 30, 1), ('massa', 'Massa', 20, 1), ('atum', 'Atum', 25, 1);
        INSERT INTO pagina (url, cadeia, tipo, marca) VALUES ('${C}mercearia/arroz-massa-e-farinha/arroz/', 'continente', 'arroz', 0),
        ('${C}mercearia/arroz-massa-e-farinha/massa/', 'continente', 'massa', 0), ('${C}mercearia/conservas/atum/', 'continente', 'atum', 0);`);
    esquecerTipos();
    assert.deepEqual((await tiposDaSeccao(db, 5)).map((t) => [t.gr, t.k]), [['Arroz, massa e farinha', 'arroz'], ['Arroz, massa e farinha', 'massa'], ['Conservas', 'atum']]);
});

test('o bacalhau: o calibre numa fila à parte do corte (lombo especial), o país e a preparação na origem; escrever «bacalhau» dá os cortes', async () => {
    const { etiquetas } = await import('../proxy/src/etiquetas.js');
    const { sugerir } = await import('../proxy/src/sugerir.js');
    const { sinais } = await import('../proxy/src/qualidade.js');
    // as caras não são bacalhau inteiro (o nome diz «seco», que já não é o nome de um corte)
    assert.equal(etiquetas('Caras de Bacalhau Seco Continente').corte, 'miudezas');
    assert.deepEqual(etiquetas('Bacalhau Graúdo 1ª Noruega Seco'), { animal: 'bacalhau', corte: null, usos: ['assar', 'cozer'], cal: 'graudo', pais: 'noruega', prep: 'salgado' });
    assert.deepEqual(['corte', 'cal'].map((k) => etiquetas('Lombo de Bacalhau Especial Noruega')[k]), ['lombo', 'especial']);
    assert.equal(etiquetas('Bacalhau Especial 1ª Islândia Seco').cal, 'especial');
    assert.equal(etiquetas('Paloco do Pacífico Desfiado Seco').animal, 'paloco');
    assert.equal(etiquetas('BACALHAU GRAUDO NORUEGA ASA BRANCA KG').cal, 'graudo'); // a marca Asa Branca não é «asas»
    assert.equal(etiquetas('BACALHAU RIBERALVES DEMOLHADO POSTAS MSC 800G').prep, 'demolhado');
    assert.deepEqual(sinais('Bacalhau Graúdo 1ª Noruega Seco').map((x) => x.t), ['calibre grande', '1.ª qualidade']);
    const db = d1();
    db.sql.exec(`INSERT INTO tipo (k, nome, n, casa) VALUES ('bacalhau', 'Bacalhau', 6, 1);`);
    esquecerTipos();
    const p = (id, nome) => ({ id, nome, preco: 9.99, emb: '1 kg', url: 'https://www.continente.pt/' + id });
    await guardarCatalogo(db, 'continente', 'bacalhau', [p('1', 'Bacalhau Graúdo Noruega Seco'), p('2', 'Bacalhau Graúdo Islândia Seco'), p('3', 'Bacalhau Graúdo 1ª Seco'),
        p('4', 'Lombos de Bacalhau'), p('5', 'Lombos de Bacalhau Demolhado'), p('6', 'Lombo de Bacalhau MSC')]);
    const r = await sugerir(db, 'bacalhau');
    assert.deepEqual(r.slice(0, 2).map((x) => x.sec ?? x.k), [2, 'bacalhau']);
    const cortes = r.filter((x) => x.corte).map((x) => x.corte);
    assert.ok(cortes.includes('graúdo') && cortes.includes('lombo'), cortes.join());
    // no tipo: a fila do calibre (cal) à parte dos cortes, e «para cozer» mesmo sendo de todos
    const { palavrasDoTalho } = await import('../proxy/src/sugerir.js');
    const pal = palavrasDoTalho('bacalhau', [1, 2, 3, 4, 5, 6].map((i) => ({ nome: ['Bacalhau Graúdo Noruega Seco', 'Bacalhau Graúdo Islândia Seco', 'Bacalhau Especial 1ª Seco', 'Lombos de Bacalhau Especial', 'Lombos de Bacalhau Demolhado', 'Lombo de Bacalhau MSC'][i - 1] })));
    assert.deepEqual(pal.filter((x) => x.g === 'cal').map((x) => x.w), ['graudo', 'especial']);
    assert.deepEqual(pal.filter((x) => x.g === 'corte').map((x) => x.w), ['lombo']);
    assert.ok(pal.some((x) => x.g === 'uso' && x.w === 'cozer'));
});

test('as lojas de produtores: as variantes (calibre, origem, preço) dão o preço por quilo; aparecem no tipo, à parte', async () => {
    const { artigosDoProduto, pesoKg } = await import('../economo/produtores.mjs');
    const { produtosDoTipo } = await import('../proxy/src/sugerir.js');
    assert.deepEqual(['2Kg a 2.3Kg', '1.6 a 1.8kg', '400gr', '1Kg'].map(pesoKg), [2.15, 1.7, 0.4, 1]);
    const vars = JSON.stringify([{ attributes: { attribute_pa_origem: 'noruega', attribute_calibre: '2Kg a 2.3Kg' }, display_price: 61.53, variation_id: 7, is_in_stock: true }]).replace(/"/g, '&quot;');
    const h = `<body class="product-type-variable"><form data-product_variations="${vars}"></form>`;
    const p = { loja: 'lugrade', especie: 'Bacalhau' };
    const [a] = artigosDoProduto(p, h, 'Bacalhau Graúdo Noruega', 'https://loja.lugrade.com/produto/bacalhau-graudo-noruega/');
    assert.deepEqual([a.tipo, a.cent, a.q, a.variante], ['bacalhau', 6153, 2.15, 'noruega · 2Kg a 2.3Kg']);
    // «Especial» (sem a espécie no nome) é bacalhau numa loja de bacalhau; os packs não entram
    assert.equal(artigosDoProduto(p, h, 'Especial', 'https://loja.lugrade.com/produto/especial-islandia/')[0].tipo, 'bacalhau');
    assert.deepEqual(artigosDoProduto(p, h, 'Pack Derivados', 'https://loja.lugrade.com/produto/pack/'), []);
    const db = d1();
    db.sql.exec(`INSERT INTO tipo (k, nome, n, casa) VALUES ('bacalhau', 'Bacalhau', 1, 1);
        INSERT INTO produtor_artigo (loja, id, nome, url, variante, cent, emb, uc, ub, tipo, disponivel, visto) VALUES
        ('lugrade', 'g#7', 'Bacalhau Graúdo Noruega', 'https://loja.lugrade.com/produto/bacalhau-graudo-noruega/', 'noruega · 2Kg a 2.3Kg', 6153, '2,15 kg', 2862, 'kg', 'bacalhau', 1, '2026-11-15');`);
    const tp = await produtosDoTipo(db, 'bacalhau', new Date());
    assert.equal(tp.pd[0].uc, 2862);
    assert.match(tp.pd[0].nk, /\bnoruega\b/); // filtra-se pela origem como os outros
    assert.match(tp.pd[0].nk, /\bgraudo\b/);
});

test('as lojas de produtores: os portes (grátis acima de 100 € na Lugrade) e a mesma marca no supermercado com o mesmo calibre e origem', async () => {
    const { mesmaMarca, PORTES } = await import('../proxy/src/sugerir.js');
    const { etiquetas } = await import('../proxy/src/etiquetas.js');
    assert.deepEqual(PORTES.lugrade, { cent: 750, gratis: 10000, nota: 'só Portugal continental' });
    assert.equal(PORTES.riberalves.cent, 0);
    const { produtosDaLista, limparNome } = await import('../economo/produtores.mjs');
    assert.equal(limparNome('Leia mais sobre &ldquo;Ovas de Bacalhau 400g iva incluído &rdquo;'.replace(/&ldquo;|&rdquo;/g, '"')), 'Ovas de Bacalhau 400g');
    const h = '<a href="https://riberalves.pt/produto/lombos-gourmet-12meses/" class="woocommerce-LoopProduct-link"><img alt="x"><h2 class="woocommerce-loop-product__title">Lombos Gourmet +12Meses</h2></a>';
    assert.deepEqual(produtosDaLista(h), [['https://riberalves.pt/produto/lombos-gourmet-12meses/', 'Lombos Gourmet +12Meses']]);
    const ps = [
        { c: 'continente', nome: 'Bacalhau Especial Islândia Seco Seleção do Chef Diogo Rocha Lugrade', uc: 3499, ub: 'kg' },
        { c: 'continente', nome: 'Bacalhau Graúdo Noruega Seco Lugrade', uc: 2599, ub: 'kg' },
        { c: 'continente', nome: 'Bacalhau Especial Islândia Seco Continente', uc: 2799, ub: 'kg' },
    ];
    assert.equal(mesmaMarca(ps, 'lugrade', etiquetas('Bacalhau Especial Islândia', 'bacalhau'), 'bacalhau').uc, 3499);
    assert.equal(mesmaMarca(ps, 'lugrade', etiquetas('Bacalhau Graúdo Noruega', 'bacalhau'), 'bacalhau').uc, 2599);
    assert.equal(mesmaMarca(ps, 'lugrade', etiquetas('Bacalhau Crescido Noruega', 'bacalhau'), 'bacalhau'), null);
});

test('os vinhos: as páginas seguintes das categorias grandes, e as filas da família (região, gama, casta) em vez de palavras soltas', async () => {
    const { paginasSeguintes } = await import('../economo/tipos.mjs');
    const ps = paginasSeguintes([['https://www.continente.pt/supermercado/bebidas-e-garrafeira/vinhos/vinho-tinto/', 'continente', 'vinho-tinto', 0],
        ['https://www.pingodoce.pt/home/produtos/vinhos/vinho-tinto', 'pingodoce', 'vinho-tinto', 0], ['https://www.auchan.pt/pt/x/', 'auchan', 'leite', 0]]);
    assert.equal(ps.length, 5);
    assert.equal(ps[0][0], 'https://www.continente.pt/supermercado/bebidas-e-garrafeira/vinhos/vinho-tinto/?start=36&sz=36');
    const { atributos, filasDaFamilia, familiaDe } = await import('../proxy/src/atributos.js');
    assert.equal(familiaDe('vinho-tinto'), 'vinho');
    assert.equal(familiaDe('queijo-fatiado'), 'queijo');
    assert.equal(familiaDe('leite'), null);
    assert.deepEqual(atributos('vinho', 'Esporão Reserva Alentejo Vinho Tinto Touriga Nacional'), { regiao: 'alentejo', gama: 'reserva', casta: 'touriganacional' });
    assert.deepEqual(atributos('vinho', 'Periquita Península de Setúbal Vinho Tinto'), { regiao: 'setubal' });
    assert.deepEqual(atributos('azeite', 'Azeite Virgem Extra DOP Moura'), { categoria: 'virgemextra', regiao: 'moura', modo: 'dop' });
    assert.deepEqual(atributos('queijo', 'Queijo Serra da Estrela DOP Amanteigado Ovelha'), { leite: 'ovelha', cura: 'amanteigado', dop: 'serraestrela' });
    assert.equal(familiaDe('fruta', 0), 'fruta');
    assert.equal(familiaDe('pao-do-dia', 1), 'padaria');
    assert.deepEqual(atributos('fruta', 'Maçã Gala Nacional Categoria I'), { origem: 'nacional', variedade: 'gala', qualidade: 'extra' });
    assert.deepEqual(atributos('padaria', 'Pão de Centeio com Massa Mãe Fatiado'), { farinha: 'centeio', fermento: 'massamae', dieta: 'fatiado' });
    assert.deepEqual(atributos('presunto', 'Presunto Bolota 24 Meses Barrancos'), { cura: 'c24', origem: 'barrancos', raca: 'bolota' });
    assert.equal(atributos('vinho', 'Esporão Reserva Alentejo Vinho Tinto', 1599).preco, 'de10a20');
    const { temPalavras } = await import('../proxy/src/escolhas.js');
    assert.ok(temPalavras([' regiaoxdouro '], 'Papa Figos Douro Vinho Tinto', 'vinho-tinto', 699));
    assert.ok(temPalavras([' precoxde5a10 '], 'Papa Figos Douro Vinho Tinto', 'vinho-tinto', 699));
    assert.ok(!temPalavras([' precoxde5a10 '], 'Papa Figos Douro Vinho Tinto', 'vinho-tinto', 1299));
    const f = filasDaFamilia('vinho', ['Douro Reserva', 'Douro Colheita', 'Alentejo Reserva', 'Alentejo Tinto', 'Dão Tinto'].map((nome) => ({ nome })));
    assert.deepEqual(f.filas.map((x) => x.t), ['Região']); // a gama só tem um valor com 2 ou mais: não é fila
    assert.deepEqual(f.palavras.map((x) => [x.w, x.r]), [['regiaoxdouro', 'Douro'], ['regiaoxalentejo', 'Alentejo']]);
});

test('a melhor compra pelo rótulo: os pontos (Reserva, DOC, virgem extra, DOP) e a fronteira preço-rótulo', async () => {
    const { pontosRotulo, candidatosMelhores } = await import('../proxy/src/atributos.js');
    assert.deepEqual(pontosRotulo('vinho', 'Esporão Reserva Alentejo DOC Vinho Tinto'), { p: 3, porque: ['Reserva', 'DOC'] });
    assert.equal(pontosRotulo('azeite', 'Azeite Virgem Extra DOP Moura').p, 3);
    assert.equal(pontosRotulo('leite', 'Leite'), null);
    // os candidatos: só os com pontos, do mais barato para o mais caro, pelo índice (a app tira a fronteira deles)
    const ps = [{ c: 'a', nome: 'Tinto Alentejo', cent: 299 }, { c: 'b', nome: 'Esporão Reserva DOC', cent: 1599 }, { c: 'a', nome: 'Monte Velho Reserva', cent: 499 },
        { c: 'b', nome: 'Douro Grande Reserva', cent: 1299 }, { c: 'c', nome: 'Outro Reserva', cent: 899 }];
    const cs = candidatosMelhores('vinho', ps);
    assert.deepEqual(cs.map((x) => [x.i, x.p]), [[2, 2], [4, 2], [3, 3], [1, 3]]);
    // a fronteira, como a app a tira: cada um que promete mais do que todos os mais baratos
    let mx = 0;
    const fr = cs.filter((x) => x.p > mx && (mx = x.p));
    assert.deepEqual(fr.map((x) => ps[x.i].nome), ['Monte Velho Reserva', 'Douro Grande Reserva']);
});
