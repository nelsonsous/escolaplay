// Os preços (volta 3): lidos no site da cadeia quando se escolhe um produto e pelo cron, guardados na D1 e mandados
// para a app ao lado de cada produto escolhido. Os sites das cadeias são a fingir (cadeias.mjs).
import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import worker, { UA } from '../proxy/src/worker.js';
import { precisa, refrescar, medida, porUnidade, normaliza, rotulo, VALE_H } from '../proxy/src/precos.js';
import { kv } from './kv.mjs';
import { d1 } from './d1.mjs';
import { PRECOS, instalar, desinstalar } from './cadeias.mjs';

const APP = 'https://nelsonsous.github.io';
let env, pedidos;
beforeEach(() => { env = { KV: kv(), DB: d1(), ALLOWED_ORIGINS: APP }; PRECOS.clear(); pedidos = instalar(); });
after(desinstalar);
const call = (path, { metodo = 'GET', chave, corpo } = {}) => worker.fetch(new Request('https://x' + path, {
    method: metodo, headers: { origin: APP, ...(chave ? { authorization: 'Bearer ' + chave } : {}) }, body: corpo ? JSON.stringify(corpo) : undefined,
}), env);
const novo = async () => (await call('/api/aparelho', { metodo: 'POST' })).json();
const ops = async (chave, l) => (await call('/api/lista', { metodo: 'POST', chave, corpo: { ops: l } })).json();
const P = {
    continente: { id: '4421406', nome: 'Leite uht meio gordo mimosa', url: 'https://www.continente.pt/produto/leite-uht-meio-gordo-mimosa-4421406.html' },
    pingodoce: { id: '501', nome: 'Leite uht meio gordo mimosa', url: 'https://www.pingodoce.pt/home/produtos/laticinios/leite/leite-uht-meio-gordo-mimosa-501.html' },
    auchan: { id: '601', nome: 'Leite mimosa uht meio gordo 1l', url: 'https://www.auchan.pt/pt/alimentacao/leite/leite-mimosa-uht-meio-gordo-1l/601.html' },
    lidl: { id: '701', nome: 'Mimosa leite meio gordo', url: 'https://www.lidl.pt/p/mimosa-leite-meio-gordo/p701' },
};
const escolher = (id, c) => ({ o: 'p', id, c, p: P[c] });

test('escolher um produto lê logo o preço no site da cadeia, e a lista vem com ele (em cêntimos)', async () => {
    PRECOS.set('continente 4421406', { preco: 0.95 });
    PRECOS.set('pingodoce 501', { preco: 0.89, antes: 1.05 });
    const { chave } = await novo();
    const l = await ops(chave, [{ o: 'j', id: 'aaaa', t: 'leite', q: 6 }, escolher('aaaa', 'continente'), escolher('aaaa', 'pingodoce')]);
    assert.deepEqual(l.itens[0].p.continente, { ...P.continente, cent: 95, visto: new Date().toISOString().slice(0, 10) });
    assert.equal(l.itens[0].p.pingodoce.cent, 89);
    assert.equal(l.itens[0].p.pingodoce.antes, 105); // o preço riscado da promoção
    assert.equal(pedidos.length, 2);
    assert.equal(pedidos[0].init.headers['user-agent'], UA); // identifica-se como é
    assert.equal(pedidos[0].init.redirect, 'manual');
    // ler a lista não volta aos sites: o preço vem da D1
    const g = await (await call('/api/lista', { chave })).json();
    assert.equal(g.itens[0].p.continente.cent, 95);
    assert.equal(pedidos.length, 2);
    // escolher outra vez o mesmo produto (noutra coisa) também não: o preço é recente
    await ops(chave, [{ o: 'j', id: 'bbbb', t: 'leite magro' }, escolher('bbbb', 'continente')]);
    assert.equal(pedidos.length, 2);
    // o preço guardado não leva nada da casa (é de todos)
    assert.deepEqual(Object.keys(env.DB.linhas('SELECT * FROM preco')[0]).sort(),
        ['antes', 'ate', 'cadeia', 'cent', 'emb', 'esgotado', 'falhas', 'id', 'marca', 'nome', 'propria', 'q', 'suspeito', 'tentado', 'tipo', 'ub', 'uc', 'unid', 'url', 'visto']);
});

test('o Auchan lê-se pelo JSON do produto (pelo número); no máximo dois produtos novos por pedido', async () => {
    PRECOS.set('auchan 601', { preco: 0.99 });
    PRECOS.set('lidl 701', { preco: 0.85 });
    PRECOS.set('continente 4421406', { preco: 0.95 });
    const { chave } = await novo();
    const l = await ops(chave, [{ o: 'j', id: 'aaaa', t: 'leite' }, escolher('aaaa', 'auchan'), escolher('aaaa', 'lidl'), escolher('aaaa', 'continente')]);
    assert.match(pedidos[0].url, /Product-Variation\?pid=601&quantity=1$/);
    assert.equal(l.itens[0].p.auchan.cent, 99);
    assert.equal(l.itens[0].p.lidl.cent, 85);
    assert.equal(l.itens[0].p.continente.cent, undefined); // fica para o cron
    assert.equal(pedidos.length, 2);
});

test('um preço de 0 € conta como sem preço', async () => {
    PRECOS.set('pingodoce 501', { preco: 0 });
    const { chave } = await novo();
    const l = await ops(chave, [{ o: 'j', id: 'aaaa', t: 'leite' }, escolher('aaaa', 'pingodoce')]);
    assert.equal(l.itens[0].p.pingodoce.cent, undefined);
    assert.deepEqual(env.DB.linhas('SELECT cent, falhas FROM preco'), [{ cent: null, falhas: 1 }]);
});

test('um produto que a cadeia já não tem: fica sem preço e não se volta a pedir logo', async () => {
    const { chave } = await novo();
    const l = await ops(chave, [{ o: 'j', id: 'aaaa', t: 'leite' }, escolher('aaaa', 'lidl')]);
    assert.equal(l.itens[0].p.lidl.cent, undefined);
    assert.deepEqual(env.DB.linhas('SELECT cadeia, falhas, cent FROM preco'), [{ cadeia: 'lidl', falhas: 1, cent: null }]);
    assert.equal(pedidos.length, 1);
    assert.equal((await refrescar(env.DB)).lidos, 0);
    assert.equal(pedidos.length, 1);
});

test('quando se volta a pedir: preço com mais de 20 h, e depois de uma falha espera-se cada vez mais', () => {
    const agora = new Date('2026-11-15T12:00:00Z');
    const h = (n) => new Date(agora.getTime() - n * 3600e3).toISOString();
    assert.equal(precisa(null, agora), true);
    assert.equal(precisa({ visto: h(VALE_H - 1), tentado: h(VALE_H - 1), falhas: 0 }, agora), false);
    assert.equal(precisa({ visto: h(VALE_H + 1), tentado: h(VALE_H + 1), falhas: 0 }, agora), true);
    assert.equal(precisa({ visto: null, tentado: h(0.4), falhas: 1 }, agora), false); // meia hora
    assert.equal(precisa({ visto: null, tentado: h(0.6), falhas: 1 }, agora), true);
    assert.equal(precisa({ visto: null, tentado: h(3), falhas: 4 }, agora), false); // quatro horas
    assert.equal(precisa({ visto: null, tentado: h(23), falhas: 20 }, agora), false); // no máximo um dia
    assert.equal(precisa({ visto: null, tentado: h(25), falhas: 20 }, agora), true);
});

test('o cron: os preços velhos dos produtos que estão nas listas, um por cadeia de cada vez', async () => {
    for (const [c, p] of Object.entries(P)) PRECOS.set(c + ' ' + p.id, { preco: 1 });
    PRECOS.set('continente 12', { preco: 2.5 });
    const { chave } = await novo();
    const arroz = { id: '12', nome: 'Arroz agulha', url: 'https://www.continente.pt/produto/arroz-agulha-cigala-12.html' };
    // sem rede quando se escolheram: ficam sem preço
    globalThis.fetch = async () => { throw new Error('sem rede'); };
    await ops(chave, [{ o: 'j', id: 'aaaa', t: 'leite' }, { o: 'j', id: 'bbbb', t: 'arroz' }, escolher('aaaa', 'continente'), escolher('aaaa', 'lidl'),
        { o: 'p', id: 'bbbb', c: 'continente', p: arroz }, escolher('aaaa', 'auchan')]);
    pedidos = instalar();
    // uma hora depois (a espera de meia hora de uma falha já passou)
    const depois = new Date(Date.now() + 3600e3);
    let r = await refrescar(env.DB, depois);
    assert.deepEqual(r, { lidos: 3, comPreco: 3 }); // continente, lidl, auchan: um de cada
    assert.equal(pedidos.filter((p) => p.url.includes('continente')).length, 1);
    r = await refrescar(env.DB, depois);
    assert.deepEqual(r, { lidos: 1, comPreco: 1 }); // o outro do Continente
    assert.deepEqual(await refrescar(env.DB, depois), { lidos: 0, comPreco: 0 }); // tudo em dia
    const l = await (await call('/api/lista', { chave })).json();
    assert.equal(l.itens[1].p.continente.cent, 250);
    // um dia depois volta a ler; um produto que saiu das listas já não se lê
    await ops(chave, [{ o: 'x', id: 'bbbb' }]);
    const amanha = new Date(depois.getTime() + 21 * 3600e3);
    pedidos.length = 0;
    assert.deepEqual(await refrescar(env.DB, amanha), { lidos: 3, comPreco: 3 });
    assert.deepEqual(await refrescar(env.DB, amanha), { lidos: 0, comPreco: 0 });
    assert.ok(!pedidos.some((p) => p.url.includes('arroz')));
});

test('o cron do Worker chama o refrescar', async () => {
    PRECOS.set('lidl 701', { preco: 0.85 });
    const { chave } = await novo();
    globalThis.fetch = async () => new Response('', { status: 503 });
    await ops(chave, [{ o: 'j', id: 'aaaa', t: 'leite' }, escolher('aaaa', 'lidl')]);
    pedidos = instalar();
    const espera = [];
    // aos minutos redondos (0, 10, 20…) o cron lê os preços das listas
    await worker.scheduled({ scheduledTime: Math.ceil((Date.now() + 3600e3) / 3600e3) * 3600e3 }, env, { waitUntil: (p) => espera.push(p) }); // minuto 0 (o 30 é das escolhas)
    await Promise.all(espera);
    assert.equal(env.DB.linhas('SELECT cent FROM preco')[0].cent, 85);
});

test('o preço por quilo, por litro ou por unidade: o que a cadeia mostra, ou pela embalagem e pelo nome', () => {
    assert.deepEqual(medida('emb. 6 x 1 lt'), { q: 6, ub: 'l' });
    assert.deepEqual(medida('Iogurte natural 4x125g'), { q: 0.5, ub: 'kg' });
    assert.deepEqual(medida('Azeite virgem extra 75cl'), { q: 0.75, ub: 'l' });
    assert.deepEqual(medida('Ovos classe M 12 un'), { q: 12, ub: 'un' });
    assert.deepEqual(medida('Leite agros uht meio gordo 1l'), { q: 1, ub: 'l' });
    assert.equal(medida('Mimosa leite meio gordo'), null);
    assert.deepEqual(porUnidade({ preco: 2.5, precoUnidade: { valor: 2.52, unidade: 'kg' } }), { uc: 252, ub: 'kg' });
    assert.deepEqual(porUnidade({ preco: 1.2, precoUnidade: { valor: 0.24, unidade: 'g' } }), { uc: 24000, ub: 'kg' }); // €/g → €/kg
    assert.deepEqual(porUnidade({ preco: 1, embalagem: '1 lt', nome: 'Leite 6 x 1 l' }), { uc: 100, ub: 'l' }); // a embalagem primeiro
    assert.deepEqual(porUnidade({ preco: 5.4, nome: 'Leite meio gordo 6 x 1 l' }), { uc: 90, ub: 'l' });
    assert.deepEqual(porUnidade({ preco: 6.89, nome: 'Mimosa leite meio gordo' }), { uc: null, ub: null });
});

test('os preços de uma procura: os conhecidos logo, e dos que faltam lê-se no máximo dois', async () => {
    PRECOS.set('continente 1', { preco: 0.79, nome: 'Leite meio gordo Continente 1 l' });
    PRECOS.set('continente 2', { preco: 5.4, nome: 'Leite meio gordo Mimosa 6 x 1 l' });
    PRECOS.set('continente 3', { preco: 0.95, nome: 'Leite meio gordo Mimosa 1 l' });
    const { chave } = await novo();
    const prods = [1, 2, 3, 4].map((i) => ({ id: String(i), nome: `Leite ${i}`, url: `https://www.continente.pt/produto/leite-${i}.html` }));
    const pedir = async (produtos) => (await call('/api/precos', { metodo: 'POST', chave, corpo: { cadeia: 'continente', produtos } })).json();
    let r = await pedir(prods);
    assert.deepEqual(r, { cadeia: 'continente', produtos: [{ id: '1', cent: 79, uc: 79, ub: 'l' }, { id: '2', cent: 540, uc: 90, ub: 'l' }] });
    assert.equal(pedidos.length, 2);
    r = await pedir(prods);
    assert.deepEqual(r.produtos.map((p) => p.id), ['1', '2', '3']); // o 4 não existe no site: falha e fica à espera
    assert.equal(pedidos.length, 4);
    r = await pedir(prods);
    assert.equal(pedidos.length, 4);
    for (const mau of [{ cadeia: 'mercadona', produtos: [] }, { cadeia: 'continente', produtos: Array(9).fill(prods[0]) },
        { cadeia: 'continente', produtos: [{ id: '1', nome: 'x', url: 'https://exemplo.com/1' }] }]) {
        assert.equal((await call('/api/precos', { metodo: 'POST', chave, corpo: mau })).status, 400);
    }
    assert.equal((await call('/api/precos', { metodo: 'POST', corpo: { cadeia: 'continente', produtos: [] } })).status, 401);
});

test('preços comparáveis: ao balcão e ao peso paga-se a porção; com peso ou volume, sempre por quilo ou litro', () => {
    // Continente, fiambre ao balcão: 12,09 €/kg e «1,81 €/un» (a porção de 150 g)
    assert.deepEqual(normaliza({ cadeia: 'continente', nome: 'Fiambre de Peito de Frango Fatiado no Balcão', cent: 1209, uc: 181, ub: 'un', m: medida('0,15 kg') }), { cent: 181, uc: 1209, ub: 'kg' });
    // Pingo Doce, ao balcão: o preço é o do quilo (e não 60,45 €/kg)
    assert.deepEqual(normaliza({ cadeia: 'pingodoce', nome: 'Fiambre Peito de Frango (fatiado ao Balcão)', cent: 1209, uc: 6045, ub: 'kg', m: medida('0,2 kg') }), { cent: 242, uc: 1209, ub: 'kg' });
    // Continente, peso variável (espetadas de 580 g a 7,89 €/kg)
    assert.deepEqual(normaliza({ cadeia: 'continente', nome: 'Espetadas de Peru', cent: 789, uc: 458, ub: 'un', m: medida('580 g') }), { cent: 458, uc: 789, ub: 'kg' });
    // «por unidade» com a embalagem em gramas: passa a por quilo
    assert.deepEqual(normaliza({ cadeia: 'auchan', nome: 'QUEIJO RICOTTA 250G', cent: 169, uc: 169, ub: 'un', m: medida('250G') }), { cent: 169, uc: 676, ub: 'kg' });
    // Auchan, «… FATIADO NO BALCÃO KG» sem peso: o preço é o de um quilo
    assert.deepEqual(normaliza({ cadeia: 'auchan', nome: 'FIAMBRE DE PEITO FRANGO AUCHAN FATIADO NO BALCÃO KG', cent: 1209, uc: null, ub: null, m: null }), { cent: 1209, uc: 1209, ub: 'kg', emb: '1 kg' });
    // e com o calibre antes do «KG» («200/300 KG», «600/800 KG»): não é o peso (antes dava 0,09 €/kg)
    const nm = 'LOMBO DE BACALHAU NORDFISH ULTRACONGELADO HIGIENIZADO 200/300 KG';
    assert.equal(medida(nm), null);
    assert.deepEqual(normaliza({ cadeia: 'auchan', nome: nm, cent: 2599, uc: null, ub: null, m: medida(nm) }), { cent: 2599, uc: 2599, ub: 'kg', emb: '1 kg' });
    assert.deepEqual(medida('6 x 1,5 L'), { q: 9, ub: 'l' });
    // o resto fica igual
    assert.deepEqual(normaliza({ cadeia: 'pingodoce', nome: 'Água', cent: 96, uc: 16, ub: 'l', m: medida('6 L') }), { cent: 96, uc: 16, ub: 'l' });
    assert.deepEqual(normaliza({ cadeia: 'continente', nome: 'Ovos', cent: 249, uc: 21, ub: 'un', m: medida('12 un') }), { cent: 249, uc: 21, ub: 'un' });
    // as embalagens escrevem-se igual: menos de um quilo em gramas
    assert.deepEqual([rotulo('0,15 kg'), rotulo('0,75 L'), rotulo('1,5 L'), rotulo('6 x 1,5 L')], ['150 g', '750 ml', '1,5 L', '6 × 1,5 L']);
    // os packs de litros do Auchan sem vírgula, e o «&times;»
    assert.deepEqual(['AGUA C/ GÁS VIMEIRO 4X150L', '6X050L', '4X15L', '6&times;1.5L', '2 x 10 L', '7UP LATA 6X33L', '6X033L'].map(rotulo), ['4 × 1,5 L', '6 × 0,5 L', '4 × 1,5 L', '6 × 1,5 L', '2 × 10 L', '6 × 0,33 L', '6 × 0,33 L']);
});

test('embalagens diferentes: o preço de cada cadeia para o mesmo tamanho (cn), e o talão passa à frente da estimativa', async () => {
    const { comparavel, juntarPrecos } = await import('../proxy/src/precos.js');
    const { d1 } = await import('./d1.mjs');
    // 7 L a 1,99 € (0,28 €/l) e 6 L a 0,96 € (0,16 €/l): comparados por 6 L (o tamanho da escolha)
    const i = comparavel({ e: { k: 'agua-sem-gas', emb: '6 L' }, p: { continente: { cent: 199, uc: 28, ub: 'l', emb: '7 L' }, pingodoce: { cent: 96, uc: 16, ub: 'l', emb: '6 L' } } });
    assert.equal(i.cmp, '6 L');
    assert.deepEqual([i.p.continente.cn, i.p.pingodoce.cn], [168, 96]);
    // o mesmo tamanho em todas: nada muda
    assert.equal(comparavel({ p: { a: { cent: 96, uc: 16, ub: 'l', emb: '6 L' }, b: { cent: 99, uc: 17, ub: 'l', emb: '6 L' } } }).cmp, undefined);
    // o talão da Mercadona dá o preço real à coisa da lista (est sem «≈», com o dia)
    const db = d1();
    db.sql.prepare('INSERT INTO talao (id, casa, loja, dia, total, linhas, criado) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run('t1', 'c1', 'mercadona', '2026-11-14', 99, JSON.stringify([{ t: 'AGUA S/GAS 6L', q: 1, cent: 99 }]), '2026-11-14T10:00:00Z');
    const l = await juntarPrecos(db, { itens: [{ id: 'x', t: 'Água sem gás 6 L', q: 1, e: { k: 'agua-sem-gas', emb: '6 L' }, p: {} }] }, 'c1');
    assert.deepEqual([l.itens[0].est, l.itens[0].estr], [99, '2026-11-14']);
});
