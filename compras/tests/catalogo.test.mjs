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
    await guardarCatalogo(db, 'continente', 'frango', [p('f1', 'Peito de Frango'), p('f2', 'Peito de Frango Filetes'), p('f3', 'Peito Frango Campo'), p('f4', 'Coxas de Frango'), p('f5', 'Frango para Estufar')]);
    await guardarCatalogo(db, 'continente', 'noodles', [p('x1', 'Noodles sabor carne'), p('x2', 'Noodles carne picante'), p('x3', 'Noodles de carne')]);
    const r = await sugerir(db, 'Carnes');
    assert.deepEqual(r[0], { sec: 2, nome: 'Talho e peixaria' });
    // os tipos do talho (sem os da peixaria nem os «noodles» com carne no nome), os da casa primeiro
    // (e sem os cruzados que repetem um da casa: «Novilho, vitela e vitelão»)
    assert.deepEqual(r.filter((t) => t.k && !t.corte).map((t) => t.k), ['carne-novilho', 'frango', 'porco']);
    // os cortes: cada um no tipo onde há mais produtos com ele
    assert.deepEqual(r.filter((t) => t.corte).map((t) => [t.corte, t.k, t.w]), [['para estufar', 'carne-novilho', 'estufar'], ['picanha', 'carne-novilho', 'picanha'], ['peito', 'frango', 'peito']]);
    assert.deepEqual((await sugerir(db, 'peixe')).filter((t) => t.k).map((t) => t.k), ['peixe-fresco']);
});
