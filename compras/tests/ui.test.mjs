// A app no browser (Chromium), com o conector a sério sobre uma KV e uma D1 simuladas e os sites das cadeias a fingir
// (tests/servidor.mjs): o aparelho e a casa, juntar à lista, a folha com os produtos e os preços de cada supermercado,
// riscar e limpar, sem rede, um segundo telemóvel que entra na casa pelo link, partilhar no WhatsApp, o «Mais barato»
// (as contas da app conferidas com as mesmas em JavaScript) e a memória que não cresce com o uso.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { abrir } from './servidor.mjs';

const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = null; }

test('o app/compras.wasm está em dia com o app/compras.onda', () => {
    execFileSync('node', [new URL('../compilar.mjs', import.meta.url).pathname, '--verificar']);
});

test('a lista da casa no browser', { skip: !pw && 'sem playwright' }, async () => {
    const s = await abrir();
    const br = await pw.chromium.launch();
    try {
        const novo = async () => {
            const pg = await (await br.newContext({ viewport: { width: 390, height: 844 }, locale: 'pt-PT' })).newPage();
            pg.erros = [];
            pg.on('pageerror', (e) => pg.erros.push(e.message));
            return pg;
        };
        const a = await novo();
        const itens = (pg) => pg.locator('.item .texto b').allTextContents();
        const ls = (pg, k) => pg.evaluate((k) => localStorage.getItem('compras:' + k), k);
        const juntar = async (pg, t) => { await pg.fill('[data-onda="junta"]', t); await pg.press('[data-onda="junta"]', 'Enter'); };
        let codigo;
        const servidor = () => ({ itens: JSON.parse(s.env.DB.linhas('SELECT itens FROM casa WHERE codigo = ?', codigo)[0].itens) });

        await a.goto(s.url());
        await a.waitForSelector('.vazio:has-text("A lista está vazia")');
        // o aparelho fica registado numa casa nova, com código
        await a.waitForFunction(() => localStorage.getItem('compras:chave'));
        codigo = await ls(a, 'codigo');
        assert.match(codigo, /^[A-Z2-9]{8}$/);

        // juntar: vírgulas e « e », a quantidade à frente; o campo volta vazio
        await juntar(a, '2 leites, pão de forma e ovos');
        assert.deepEqual(await itens(a), ['2 × leites', 'pão de forma', 'ovos']);
        assert.equal(await a.inputValue('[data-onda="junta"]'), '');
        await a.waitForFunction(() => !localStorage.getItem('compras:pend') && !localStorage.getItem('compras:envio'));
        assert.deepEqual(servidor().itens.map((i) => [i.t, i.q]), [['leites', 2], ['pão de forma', 1], ['ovos', 1]]);

        // a folha: os produtos parecidos em cada supermercado; escolher o do Continente e o do Lidl
        await a.click('.item .texto >> nth=0');
        await a.waitForSelector('#folha .prods >> nth=3');
        await a.waitForFunction(() => document.querySelectorAll('#folha .prod').length >= 5);
        assert.deepEqual(await a.locator('#folha h3').allTextContents(), ['Continente', 'Pingo Doce', 'Auchan', 'Lidl']);
        assert.match(await a.textContent('#folha [data-onda="esc:0"]'), /^Leite uht meio gordo continente/);
        await a.click('#folha [data-onda="esc:0"]');
        await a.click('#folha [data-onda="esc:300"]');
        assert.match(await a.textContent('#folha .prod.on >> nth=0'), /✓ Leite uht meio gordo continente/);
        await a.click('#folha [data-onda="mais:0"]');
        assert.equal(await a.textContent('#folha .qtd b'), '3');
        // o preço lido no site da cadeia aparece ao lado do produto escolhido
        await a.waitForSelector('#folha .prod.on small:has-text("0,79 €")');
        // os produtos parecidos também com o preço, e o mais barato por litro à vista (o pack de 6 da Mimosa)
        await a.waitForSelector('#folha [data-onda="esc:1"] em');
        assert.equal(await a.textContent('#folha [data-onda="esc:1"] small'), '4,50 € · 0,75 €/l');
        assert.equal(await a.textContent('#folha [data-onda="esc:1"] em'), 'o mais barato por litro');
        assert.match(await a.textContent('#folha .prod.on small'), /^0,79 € · 0,79 €\/l · tocar para tirar$/);
        await a.keyboard.press('Escape');
        assert.equal(await a.locator('#folha .cartao').count(), 0);
        assert.deepEqual(await itens(a), ['3 × leites', 'pão de forma', 'ovos']);
        await a.waitForFunction(() => !localStorage.getItem('compras:pend') && !localStorage.getItem('compras:envio'));
        // na lista: o preço de cada supermercado para a quantidade (3 × 0,79 € e 3 × 0,75 €)
        await a.waitForSelector('.item .texto small:has-text("Lidl 2,25 €")');
        assert.equal(await a.textContent('.item .texto small >> nth=0'), 'Continente 2,37 € · Lidl 2,25 €');
        const leite = servidor().itens[0];
        assert.equal(leite.q, 3);
        assert.deepEqual(Object.keys(leite.p), ['continente', 'lidl']);
        assert.equal(leite.p.lidl.url, 'https://www.lidl.pt/p/mimosa-leite-meio-gordo/p701');

        // mais barato: nenhum supermercado tem preço para tudo; primeiro os que têm mais, e o mais barato desses
        await a.click('#abas button >> nth=1');
        assert.deepEqual(await a.locator('.cadeias li').evaluateAll((l) => l.map((x) => [x.className, x.querySelector('b').textContent, x.querySelector('.total').textContent, x.querySelector('small').textContent])), [
            ['parcial', 'Lidl', '2,25 €', 'só 1 de 3 coisas com preço'],
            ['parcial', 'Continente', '2,37 €', 'só 1 de 3 coisas com preço'],
            ['parcial', 'Pingo Doce', '—', 'sem produtos escolhidos'],
            ['parcial', 'Auchan', '—', 'sem produtos escolhidos'],
        ]);
        assert.equal(await a.locator('.dividir').count(), 0);
        await a.waitForSelector('.mais .nota:has-text("Para comparar")');
        await a.click('#abas button >> nth=0');

        // partilhar no WhatsApp: o que falta comprar
        assert.equal(await a.getAttribute('a.whats', 'href'), 'https://wa.me/?text=' + encodeURIComponent('Lista das compras:\n• 3 × leites\n• pão de forma\n• ovos'));

        // sem rede: riscar fica aqui e segue quando a rede voltar
        s.falhar(true);
        await a.click('.item .caixa >> nth=2');
        await a.waitForSelector('.rede');
        assert.equal(await a.locator('.item.feito').count(), 1);
        assert.match(await ls(a, 'pend'), /"o":"r"/);
        assert.equal(servidor().itens[2].f, 0);
        s.falhar(false);
        await juntar(a, 'azeite');
        await a.waitForFunction(() => !localStorage.getItem('compras:pend') && !localStorage.getItem('compras:envio'));
        assert.equal(await a.locator('.rede').count(), 0);
        assert.deepEqual(servidor().itens.map((i) => [i.t, i.f]), [['leites', 0], ['pão de forma', 0], ['ovos', 1], ['azeite', 0]]);

        // um segundo telemóvel entra pelo link do convite: a mesma lista; o que ele muda aparece no primeiro
        const conv = decodeURIComponent((await (async () => { await a.click('#abas button >> nth=2'); return a.getAttribute('a.whats', 'href'); })()).split('text=')[1]);
        assert.match(conv, new RegExp(`\\?casa=${codigo}$`));
        const b = await novo();
        await b.goto(s.url(`&casa=${codigo}`));
        await b.waitForFunction((c) => localStorage.getItem('compras:codigo') === c, codigo);
        await b.waitForFunction(() => document.querySelectorAll('.item').length === 4);
        assert.deepEqual(await itens(b), ['3 × leites', 'pão de forma', 'ovos', 'azeite']);
        await b.click('.item .caixa >> nth=0');
        await b.waitForFunction(() => !localStorage.getItem('compras:pend') && !localStorage.getItem('compras:envio'));
        await a.click('#abas button >> nth=0');
        await a.reload();
        await a.waitForFunction(() => document.querySelectorAll('.item.feito').length === 2);
        // tirar os riscados
        await a.click('[data-onda="limpar:0"]');
        assert.deepEqual(await itens(a), ['pão de forma', 'azeite']);
        // entrar com um código que não existe
        await a.click('#abas button >> nth=2');
        await a.fill('[data-onda="codigo"]', 'zzzz-zzzz');
        await a.press('[data-onda="codigo"]', 'Enter');
        await a.waitForSelector('.toast:has-text("Não há nenhuma casa com esse código")');

        // a memória: 200 eventos não fazem crescer o monte (cada evento solta o que reservou)
        await a.click('#abas button >> nth=0');
        await a.waitForFunction(() => !localStorage.getItem('compras:pend') && !localStorage.getItem('compras:envio'));
        const topo = () => a.evaluate(() => Number(new BigInt64Array(window.app.exports.memory.buffer, 15 * 8, 1)[0]));
        await a.click('.item .texto >> nth=0'); await a.keyboard.press('Escape');
        const h0 = await topo();
        await a.evaluate(() => {
            for (let i = 0; i < 50; i++) {
                document.querySelector('#abas button:nth-child(2)').click();
                document.querySelector('#abas button:nth-child(1)').click();
                document.querySelector('.item .texto').click();
                document.querySelector('#folha .veu').click();
            }
        });
        assert.equal(await topo(), h0);
        assert.deepEqual(a.erros, []);
        assert.deepEqual(b.erros, []);
    } finally { await br.close(); await s.fechar(); }
});

// As contas do «Mais barato» em JavaScript (as mesmas do app/onde.onda), para conferir as da app
const CAD = ['continente', 'pingodoce', 'auchan', 'lidl'];
const NOME = { continente: 'Continente', pingodoce: 'Pingo Doce', auchan: 'Auchan', lidl: 'Lidl' };
const eur = (c) => `${Math.trunc(c / 100)},${String(c % 100).padStart(2, '0')} €`;
function maisBarato(itens) {
    const por = itens.filter((i) => !i.f);
    const pc = (i, k) => { const m = i.p[k]; return m && m.cent != null && !m.esgotado ? Math.max(1, i.q) * m.cent : -1; };
    const m2 = (i, a, b) => { const x = pc(i, a), y = pc(i, b); return x < 0 ? y : y < 0 ? x : Math.min(x, y); };
    const soma = (f) => por.reduce((s, i) => s + Math.max(0, f(i)), 0);
    const conta = (f) => por.filter((i) => f(i) >= 0).length;
    const n = por.length;
    const lojas = CAD.map((k, ordem) => ({ k, ordem, c: conta((i) => pc(i, k)), t: soma((i) => pc(i, k)) }))
        .sort((x, y) => y.c - x.c || x.t - y.t || x.ordem - y.ordem);
    const completos = lojas.filter((l) => l.c === n);
    const pt = completos.length ? completos[0].t : -1;
    let par = null;
    for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) {
        if (conta((i) => m2(i, CAD[a], CAD[b])) !== n) continue;
        const t = soma((i) => m2(i, CAD[a], CAD[b]));
        if (!par || t < par.t) par = { a: CAD[a], b: CAD[b], t };
    }
    return {
        lojas: lojas.map((l) => l.c === n
            ? [l === completos[0] ? 'melhor' : 'tudo', NOME[l.k], eur(l.t), l === completos[0] ? (completos.length > 1 ? 'Mais barato' : 'O único com preço para tudo') : `mais ${eur(l.t - pt)}`]
            : ['parcial', NOME[l.k], l.c ? eur(l.t) : '—', l.c ? `só ${l.c} de ${n} coisas com preço` : 'sem produtos escolhidos']),
        dividir: par && (pt < 0 || pt - par.t >= 200) ? `${NOME[par.a]} e ${NOME[par.b]}: ${eur(par.t)}${pt >= 0 ? ` — poupas ${eur(pt - par.t)}` : ''}` : null,
    };
}

test('mais barato: o total em cada supermercado e quando compensa dividir por duas lojas', { skip: !pw && 'sem playwright' }, async () => {
    const s = await abrir();
    const br = await pw.chromium.launch();
    try {
        const a = await (await br.newContext({ viewport: { width: 390, height: 844 }, locale: 'pt-PT' })).newPage();
        const erros = [];
        a.on('pageerror', (e) => erros.push(e.message));
        const itens = (pg) => pg.locator('.item .texto b').allTextContents();
        await a.goto(s.url());
        const chave = await (await a.waitForFunction(() => localStorage.getItem('compras:chave'))).jsonValue();
        // a lista feita noutro telemóvel da casa: 6 leites, pão de forma e 2 dúzias de ovos, com os produtos escolhidos
        const prod = (c, id) => {
            const linha = { continente: (x) => `https://www.continente.pt/produto/p-${x}.html`, pingodoce: (x) => `https://www.pingodoce.pt/home/produtos/p-${x}.html`,
                auchan: (x) => `https://www.auchan.pt/pt/p/${x}.html`, lidl: (x) => `https://www.lidl.pt/p/p/p${x}` }[c];
            return { id, nome: `${c} ${id}`, url: linha(id) };
        };
        const p = (item, c, id) => ({ o: 'p', id: item, c, p: prod(c, id) });
        await s.api('/api/lista', chave, { ops: [{ o: 'j', id: 'leit', t: 'leite', q: 6 }, { o: 'j', id: 'paof', t: 'pão de forma' }, { o: 'j', id: 'ovos', t: 'ovos', q: 2 }] });
        for (const par of [[p('leit', 'continente', '8504295'), p('leit', 'pingodoce', '501')], [p('leit', 'auchan', '601'), p('leit', 'lidl', '701')],
            [p('paof', 'continente', '11'), p('paof', 'pingodoce', '502')], [p('ovos', 'continente', '12'), p('ovos', 'auchan', '602')]]) {
            await s.api('/api/lista', chave, { ops: par });
        }
        const lista = await s.api('/api/lista', chave);
        assert.equal(lista.itens[0].p.pingodoce.antes, 105);

        const ver = async () => {
            await a.click('#abas button >> nth=1');
            return {
                lojas: await a.locator('.cadeias li').evaluateAll((l) => l.map((x) => [x.className, x.querySelector('b').textContent, x.querySelector('.total').textContent, x.querySelector('small').textContent])),
                dividir: (await a.locator('.dividir p >> nth=0').count()) ? await a.textContent('.dividir p >> nth=0') : null,
            };
        };
        await a.reload();
        await a.waitForFunction(() => (JSON.parse(localStorage.getItem('compras:lista') || '{}').itens || []).length === 3);
        // só o Continente tem tudo (10,61 €); ir ao Continente e ao Auchan (os ovos) poupa 2,40 €
        let v = await ver();
        assert.deepEqual(v, maisBarato((await s.api('/api/lista', chave)).itens));
        assert.deepEqual(v.lojas[0], ['melhor', 'Continente', '10,61 €', 'O único com preço para tudo']);
        assert.deepEqual(v.lojas.map((l) => l[1]), ['Continente', 'Pingo Doce', 'Auchan', 'Lidl']);
        assert.equal(v.dividir, 'Continente e Auchan: 8,21 € — poupas 2,40 €');
        assert.deepEqual(await a.locator('.dividir .nota').allTextContents(), ['No Continente: leite, pão de forma.', 'No Auchan: ovos.']);

        // «Vou a este»: a lista arruma-se por essa loja (primeiro o que tem preço lá) e diz quanto fica
        await a.click('.cadeias li:has-text("Auchan") .ir');
        await a.waitForSelector('.loja');
        assert.equal(await a.textContent('.loja b'), 'Vais ao Auchan: 7,92 €');
        assert.equal(await a.textContent('.loja small'), '1 coisa sem preço aqui');
        assert.deepEqual(await a.locator('.item .texto').evaluateAll((l) => l.map((x) => x.textContent)),
            ['6 × leiteAuchan 5,94 €', '2 × ovosAuchan 1,98 €', 'pão de formaSem preço no Auchan: toca para escolher']);
        await a.click('[data-onda="loja:9"]');
        assert.equal(await a.locator('.loja').count(), 0);
        assert.deepEqual(await itens(a), ['6 × leite', 'pão de forma', '2 × ovos']);

        // a folha mostra o preço de cada um, e o riscado de uma promoção
        await a.click('#abas button >> nth=0');
        await a.click('.item .texto >> nth=0');
        assert.match(await a.textContent('#folha .prod.on >> nth=1'), /✓ pingodoce 501\s*1,05 € 0,89 € · tocar para tirar/);
        assert.equal(await a.textContent('#folha .prod.on >> nth=1 >> s'), '1,05 €');
        await a.keyboard.press('Escape');

        // riscados os ovos: o Continente e o Pingo Doce têm tudo; dividir já não compensa (poupava 0,10 €)
        await a.click('.item .caixa >> nth=2');
        await a.waitForFunction(() => !localStorage.getItem('compras:pend') && !localStorage.getItem('compras:envio'));
        v = await ver();
        assert.deepEqual(v, maisBarato((await s.api('/api/lista', chave)).itens));
        assert.deepEqual(v.lojas.slice(0, 2), [['melhor', 'Continente', '6,23 €', 'Mais barato'], ['tudo', 'Pingo Doce', '6,73 €', 'mais 0,50 €']]);
        assert.equal(v.dividir, null);

        // sem produto num supermercado nenhum: nada se compara
        await a.click('#abas button >> nth=0');
        await a.fill('[data-onda="junta"]', 'sal');
        await a.press('[data-onda="junta"]', 'Enter');
        v = await ver();
        assert.equal(v.lojas.filter((l) => l[0] !== 'parcial').length, 0);
        assert.equal(v.dividir, null);
        assert.deepEqual(erros, []);
    } finally { await br.close(); await s.fechar(); }
});
