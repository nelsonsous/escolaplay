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
            // «No carrinho» (o que já se riscou) aberto, para se verem as coisas riscadas
            await pg.addInitScript(() => localStorage.setItem('compras:carrinho', '1'));
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
        assert.equal(await a.inputValue('[data-onda="junta"]'), '');
        await a.waitForFunction(() => !localStorage.getItem('compras:pend') && !localStorage.getItem('compras:envio'));
        // por secções (a secção vem do conector), pela ordem da loja: a padaria antes dos laticínios
        await a.waitForSelector('.sec button:has-text("Padaria")');
        assert.deepEqual(await itens(a), ['pão de forma', '2 × leites', 'ovos']);
        assert.deepEqual(await a.locator('.sec button').allTextContents(), ['Padaria 1', 'Laticínios e ovos 2']);
        assert.deepEqual(servidor().itens.map((i) => [i.t, i.q]), [['leites', 2], ['pão de forma', 1], ['ovos', 1]]);

        // a folha: os produtos parecidos em cada supermercado; escolher o do Continente e o do Lidl
        await a.click('.item:has-text("leites") .texto');
        await a.waitForSelector('#folha .prods >> nth=3');
        await a.waitForFunction(() => document.querySelectorAll('#folha .prod').length >= 5);
        assert.deepEqual(await a.locator('#folha h3').allTextContents(), ['Continente', 'Pingo Doce', 'Auchan', 'Lidl']);
        assert.match(await a.textContent('#folha [data-onda="esc:0"]'), /^Leite uht meio gordo continente/);
        await a.click('#folha [data-onda="esc:0"]');
        await a.click('#folha [data-onda="esc:300"]');
        assert.match(await a.textContent('#folha .prod.on >> nth=0'), /✓ Leite uht meio gordo continente/);
        // «não havia na loja»: o produto do Continente fica em falta (no conector), e «afinal havia» desfaz
        await a.waitForFunction(() => !localStorage.getItem('compras:pend') && !localStorage.getItem('compras:envio'));
        await a.click('#folha [data-onda="nhv:0"]');
        await a.waitForSelector('#folha [data-onda="nhv:0"]:has-text("Afinal havia")');
        assert.match(await a.textContent('#folha .prod.on >> nth=0'), /não havia na loja \(até \d{4}-\d\d-\d\d\)/);
        assert.equal(servidor().itens[0].nh.continente.id, '8504295');
        await a.click('#folha [data-onda="nhv:0"]');
        await a.waitForSelector('#folha [data-onda="nhv:0"]:has-text("Não havia na loja")');
        await a.waitForFunction(() => !localStorage.getItem('compras:pend') && !localStorage.getItem('compras:envio'));
        assert.equal(servidor().itens[0].nh, undefined);
        await a.click('#folha [data-onda="mais:0"]');
        assert.equal(await a.textContent('#folha .qtd b'), '3');
        // o ✕ no canto de cima fecha a folha (sempre à vista, mesmo com a folha a rolar)
        await a.evaluate(() => { document.querySelector('#folha .cartao').scrollTop = 9999; });
        assert.ok(await a.locator('#folha .fechar').isVisible());
        await a.click('#folha .fechar');
        assert.equal(await a.locator('#folha .cartao').count(), 0);
        await a.click('.item:has-text("leites") .texto');
        await a.waitForSelector('#folha .cartao');
        // o preço lido no site da cadeia aparece ao lado do produto escolhido
        await a.waitForSelector('#folha .prod.on small:has-text("0,79 €")');
        // os produtos parecidos também com o preço, e o mais barato por litro à vista (o pack de 6 da Mimosa)
        await a.waitForSelector('#folha [data-onda="esc:1"] em');
        assert.equal(await a.textContent('#folha [data-onda="esc:1"] small'), '4,50 € · 0,75 €/l');
        assert.equal(await a.textContent('#folha [data-onda="esc:1"] em'), 'o mais barato por litro');
        assert.match(await a.textContent('#folha .prod.on small'), /^0,79 € · 0,79 €\/l · tocar para tirar$/);
        await a.keyboard.press('Escape');
        assert.equal(await a.locator('#folha .cartao').count(), 0);
        assert.deepEqual(await itens(a), ['pão de forma', '3 × leites', 'ovos']);
        await a.waitForFunction(() => !localStorage.getItem('compras:pend') && !localStorage.getItem('compras:envio'));
        // na lista: o mais barato das lojas para a quantidade (3 × 0,75 € no Lidl), e em quantas mais há
        await a.waitForSelector('.item .texto small:has-text("Lidl 2,25 €")');
        assert.equal(await a.textContent('.item:has-text("leites") .texto small'), 'Lidl 2,25 € · mais 1 loja');
        // a quantidade muda-se na linha
        await a.click('.item:has-text("leites") [data-onda^="qp:"]');
        await a.waitForSelector('.item .texto b:has-text("4 × leites")');
        await a.click('.item:has-text("leites") [data-onda^="qm:"]');
        await a.waitForSelector('.item .texto b:has-text("3 × leites")');
        // uma secção fecha-se e abre-se
        await a.click('.sec button:has-text("Padaria")');
        assert.deepEqual(await itens(a), ['3 × leites', 'ovos']);
        await a.click('.sec button:has-text("Padaria")');
        const leite = servidor().itens[0];
        assert.equal(leite.q, 3);
        assert.deepEqual(Object.keys(leite.p), ['continente', 'lidl']);
        assert.equal(leite.p.lidl.url, 'https://www.lidl.pt/p/mimosa-leite-meio-gordo/p701');

        // mais barato: o pão e os ovos não têm preço em loja nenhuma (dito uma vez, por cima) e não contam contra
        // ninguém; o Lidl e o Continente têm tudo o que há, e o Lidl é o mais barato
        await a.click('#abas button >> nth=1');
        assert.match(await a.textContent('.falta.nenhuma'), /Sem preço em nenhuma das tuas lojas: pão de formaovos/);
        assert.deepEqual(await a.locator('.cadeias li').evaluateAll((l) => l.map((x) => [x.className, x.querySelector('b').textContent, x.querySelector('.total').textContent, x.querySelector('small').textContent])), [
            ['melhor', 'Lidl', '2,25 €', 'Mais barato'],
            ['tudo', 'Continente', '2,37 €', 'mais 0,12 €, mas fazes tudo aqui'],
            ['parcial', 'Pingo Doce', '—', 'sem produtos escolhidos'],
            ['parcial', 'Auchan', '—', 'sem produtos escolhidos'],
        ]);
        assert.equal(await a.locator('.dividir').count(), 0);
        // tocar numa coisa sem preço abre a escolha dela (para escolher o produto)
        await a.click('.falta.nenhuma button:has-text("ovos")');
        await a.waitForSelector('#folha .cartao');
        await a.click('#folha .fechar');
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
        assert.deepEqual(await itens(b), ['pão de forma', '3 × leites', 'azeite', 'ovos']);
        await b.click('.item .caixa >> nth=0');
        await b.waitForFunction(() => !localStorage.getItem('compras:pend') && !localStorage.getItem('compras:envio'));
        await a.click('#abas button >> nth=0');
        await a.reload();
        await a.waitForFunction(() => document.querySelectorAll('.item.feito').length === 2);
        // tirar os riscados
        await a.click('[data-onda="limpar:0"]');
        assert.deepEqual(await itens(a), ['3 × leites', 'azeite']);
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
    // as coisas sem preço em loja nenhuma não contam contra nenhuma (ne: as que têm preço nalguma)
    const ne = por.filter((i) => CAD.some((k) => pc(i, k) >= 0)).length;
    const lojas = CAD.map((k, ordem) => ({ k, ordem, c: conta((i) => pc(i, k)), t: soma((i) => pc(i, k)) }))
        .sort((x, y) => y.c - x.c || x.t - y.t || x.ordem - y.ordem);
    const completos = lojas.filter((l) => ne > 0 && l.c === ne);
    const pt = completos.length ? completos[0].t : -1;
    let par = null;
    for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) {
        if (conta((i) => m2(i, CAD[a], CAD[b])) !== ne) continue;
        const t = soma((i) => m2(i, CAD[a], CAD[b]));
        if (!par || t < par.t) par = { a: CAD[a], b: CAD[b], t };
    }
    return {
        lojas: lojas.map((l) => ne > 0 && l.c === ne
            ? [l === completos[0] ? 'melhor' : 'tudo', NOME[l.k], eur(l.t), l === completos[0] ? (completos.length > 1 ? 'Mais barato' : 'O único com preço para tudo') : `mais ${eur(l.t - pt)}, mas fazes tudo aqui`]
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
        assert.deepEqual(await itens(a), ['pão de forma', '6 × leite', '2 × ovos']);

        // a folha mostra o preço de cada um, e o riscado de uma promoção
        await a.click('#abas button >> nth=0');
        await a.click('.item:has-text("leite") .texto');
        assert.match(await a.textContent('#folha .prod.on >> nth=1'), /✓ pingodoce 501\s*1,05 € 0,89 € · tocar para tirar/);
        assert.equal(await a.textContent('#folha .prod.on >> nth=1 >> s'), '1,05 €');
        await a.keyboard.press('Escape');

        // riscados os ovos: o Continente e o Pingo Doce têm tudo; dividir já não compensa (poupava 0,10 €)
        await a.click('.item .caixa >> nth=2');
        await a.waitForFunction(() => !localStorage.getItem('compras:pend') && !localStorage.getItem('compras:envio'));
        v = await ver();
        assert.deepEqual(v, maisBarato((await s.api('/api/lista', chave)).itens));
        assert.deepEqual(v.lojas.slice(0, 2), [['melhor', 'Continente', '6,23 €', 'Mais barato'], ['tudo', 'Pingo Doce', '6,73 €', 'mais 0,50 €, mas fazes tudo aqui']]);
        assert.equal(v.dividir, null);

        // uma coisa sem produto em supermercado nenhum (o sal): diz-se por cima e não estraga a comparação do resto
        await a.click('#abas button >> nth=0');
        await a.fill('[data-onda="junta"]', 'sal');
        await a.press('[data-onda="junta"]', 'Enter');
        v = await ver();
        assert.deepEqual(v, maisBarato((await s.api('/api/lista', chave)).itens));
        assert.deepEqual(v.lojas.slice(0, 2).map((l) => l[0]), ['melhor', 'tudo']);
        assert.match(await a.textContent('.falta.nenhuma'), /sal/);
        assert.equal(v.dividir, null);
        assert.deepEqual(erros, []);
    } finally { await br.close(); await s.fechar(); }
});

test('escrever e encontrar: «água» → o tipo → o tamanho e a marca → o mais barato de cada supermercado na lista', { skip: !pw && 'sem playwright' }, async () => {
    const s = await abrir();
    // o que o SPAR vende (da lista do site), com a estimativa de cada artigo
    s.env.DB.sql.exec(`INSERT INTO spar_artigo (c, nome, marca, emb, propria, tipo, eq_cent, eq_como, visto) VALUES
        ('1', 'Água SPAR Garrafão 6lt', 'SPAR', '6 L', 1, 'agua-sem-gas', 95, 'a marca branca equivalente', '2026-11-15'),
        ('2', 'Água LUSO 5lt', 'LUSO', '5 L', 0, 'agua-sem-gas', 189, 'o mesmo no Continente', '2026-11-15')`);
    const br = await pw.chromium.launch();
    try {
        const a = await (await br.newContext({ viewport: { width: 390, height: 844 }, locale: 'pt-PT' })).newPage();
        const erros = [];
        a.on('pageerror', (e) => erros.push(e.message));
        await a.goto(s.url());
        const chave = await (await a.waitForFunction(() => localStorage.getItem('compras:chave'))).jsonValue();
        const linhas = () => a.locator('#folha .melhores li:not(.est)').evaluateAll((l) => l.map((x) => [x.className.trim(), x.querySelector('b').textContent, x.querySelector('.total').textContent, x.querySelector(':scope > small').textContent, x.querySelector('.pnome')?.textContent ?? ''].filter((v, i) => i < 4 || v)));

        // a árvore: com o campo vazio, «Ver por secções» → Bebidas › → os tipos dela → a escolha
        await a.click('#sug [data-onda="vsecs:1"]');
        assert.equal(await a.locator('#sug .sec-c').count(), 12);
        await a.click('#sug .sec-c:has-text("Bebidas")');
        await a.waitForSelector('#sug .chip:has-text("Água sem gás")');
        assert.equal(await a.textContent('#sug .sec-n'), 'Bebidas');
        await a.click('#sug .chip:has-text("Água sem gás")');
        await a.waitForSelector('#folha .escolha h2:has-text("Água sem gás")');
        // o veredicto: onde fica mais barato por litro
        assert.match(await a.textContent('#folha .veredicto'), /🏆 Mais barato por litro: \S+/);
        // o caminho no topo, uma cor por nível; tocar na secção volta aos tipos irmãos, «Todas» às secções
        const caminho = () => a.locator('#folha .caminho button, #folha .caminho b').evaluateAll((l) => l.map((x) => x.className + ' ' + x.textContent));
        assert.deepEqual(await caminho(), ['n0 Todas', 'n1 Bebidas', 'n2 Água sem gás']);
        await a.click('#folha .caminho .n1');
        await a.waitForSelector('#sug .chip.n2:has-text("Água sem gás")');
        assert.equal(await a.locator('#folha .cartao').count(), 0);
        assert.equal(await a.textContent('#sug .sec-n'), 'Bebidas');
        await a.click('#sug .chip:has-text("Água sem gás")');
        await a.waitForSelector('#folha .escolha h2:has-text("Água sem gás")');
        await a.click('#folha .caminho .n0');
        await a.waitForSelector('#sug .sec-c');
        assert.equal(await a.locator('#folha .cartao').count(), 0);
        assert.equal(await a.locator('#sug .sec-c').count(), 12);
                // escrever «ág» mostra o tipo; com vírgulas (várias coisas) não sugere nada
        await a.fill('[data-onda="junta"]', 'ovos, ág');
        await a.waitForTimeout(700);
        assert.equal(await a.locator('#sug .chip').count(), 0);
        await a.fill('[data-onda="junta"]', 'ág');
        await a.waitForSelector('#sug .chip:has-text("Água sem gás")');
        await a.click('#sug .chip:has-text("Água sem gás")');
        await a.waitForSelector('#folha .escolha h2:has-text("Água sem gás")');
        assert.deepEqual(await a.locator('#folha .chips >> nth=0 >> .chip').allTextContents(), ['Todos', '10 L', '6 L', '6 × 1,5 L', '7 L', '5 L', '5,4 L']);
        // o corte ou a variante: as palavras que distinguem os produtos («garrafao», «alcalina»…)
        assert.equal(await a.textContent('#folha .chips >> nth=1 >> .chip >> nth=0'), 'Todos');
        assert.ok((await a.locator('#folha .chips >> nth=1 >> .chip').allTextContents()).includes('garrafao'));
        assert.deepEqual((await a.locator('#folha .chips >> nth=2 >> .chip').allTextContents()).slice(0, 3), ['Qualquer', '🏷 Marca branca', 'Luso']);
        // sem filtro: o mais barato por litro de cada um; o melhor fica marcado
        // em grande o que se paga e, por baixo, o preço por litro (o que pesa com embalagens diferentes); por baixo a embalagem
        assert.deepEqual(await linhas(), [
            ['', 'Continente', '1,99 €0,28 €/l', 'Pagas 1,99 € por 7 L · +75% por litro', 'Água sem Gás Garrafão Luso'],
            ['melhor', 'Pingo Doce 🏷', '0,96 €0,16 €/l', 'Pagas 0,96 € por 6 L · o mais barato por litro', 'Água sem Gás Garrafão'],
            ['melhor', 'Auchan 🏷', '0,96 €0,16 €/l', 'Pagas 0,96 € por 6 L · o mais barato por litro', 'ÁGUA AUCHAN DA NASCENTE GARRAFÃO 6L'],
        ]);
        // 6 L: o Continente não tem
        await a.click('#folha .chip >> text="6 L"');
        assert.deepEqual((await linhas()).map((l) => l[2]), ['—', '0,96 €0,16 €/l', '0,96 €0,16 €/l']);
        // a Mercadona e o SPAR: a estimativa desse tamanho, com o porquê (sem loja online; não usamos preços de Espanha)
        const est = await a.locator('#folha .melhores li.est').evaluateAll((l) => l.map((x) => [x.querySelector('b').textContent, x.querySelector('.total').textContent, x.querySelector(':scope > small').textContent]));
        // o que se pagaria por esse tamanho e, por baixo, na mesma unidade das outras (por litro), com a base
        assert.deepEqual(est.map((e) => e.slice(0, 2)), [['Mercadona ≈', '≈ 0,96 €≈ 0,16 €/l'], ['SPAR ≈', '≈ 2,14 €≈ 0,36 €/l']]);
        assert.match(est[0][2], /^Pagarias ≈ 0,96 € por 6 L · com base em Auchan 🏷 0,96 €, Pingo Doce 🏷 0,96 €/);
        assert.match(est[1][2], /^Pagarias ≈ 2,14 € por 6 L · ≈ \+125% por litro · com base em /);
        assert.match(est[0][2], /não vende online em Portugal; não usamos preços de Espanha/);
        assert.match(est[1][2], /não tem loja online e é franquiado/);
        // escolhidos os 6 L, o SPAR mostra o que lá há desse tamanho: a água da marca SPAR, com a estimativa
        assert.deepEqual(await a.locator('#folha .spar-art p:not(.t)').allTextContents(), ['Água SPAR Garrafão 6lt marca SPAR — ≈ 0,95 € (a marca branca equivalente)']);
        assert.deepEqual((await caminho()).slice(3), ['n4 6 L']);
        // vários tamanhos ao mesmo tempo (6 L e 5 L): compara-se por litro entre eles; tocar outra vez tira
        await a.click('#folha .chip >> text="5 L"');
        assert.deepEqual((await caminho()).slice(3), ['n4 6 L + 5 L']);
        assert.deepEqual(await a.locator('#folha .chips.n4 .chip.on').allTextContents(), ['6 L', '5 L']);
        await a.click('#folha .chip >> text="5 L"');
        assert.deepEqual((await caminho()).slice(3), ['n4 6 L']);
        if (process.env.FOTO) await a.screenshot({ path: process.env.FOTO });
        // Luso, de qualquer tamanho, 2 unidades
        await a.click('#folha [data-onda="fe:99"]');
        await a.click('#folha .chip:has-text("Luso")');
        await a.click('#folha [data-onda="tmais:0"]');
        assert.equal(await a.textContent('#folha .qtd b'), '2');
        assert.deepEqual(await caminho(), ['n0 Todas', 'n1 Bebidas', 'n2 Água sem gás', 'n5 Luso']);
        assert.deepEqual((await linhas()).map((l) => l[1] + ' ' + l[3].split(' · ')[0].split(' por ')[0]), ['Continente Pagas 1,99 €', 'Pingo Doce Pagas 1,83 €', 'Auchan Pagas 1,99 €']);
        await a.click('#folha [data-onda="juntat:0"]');
        assert.equal(await a.locator('#folha .cartao').count(), 0);
        assert.equal(await a.inputValue('[data-onda="junta"]'), '');
        await a.waitForFunction(() => !localStorage.getItem('compras:pend') && !localStorage.getItem('compras:envio'));
        assert.deepEqual(await a.locator('.item .texto b').allTextContents(), ['2 × Água sem gás Luso']);
        await a.waitForSelector('.item .texto small:has-text("Pingo Doce 3,66 €")');
        assert.equal(await a.textContent('.item .texto small:not(.cam)'), 'Pingo Doce 3,66 € · mais 2 lojas');
        // na lista, o caminho do tipo (a secção já é o título do grupo)
        assert.equal(await a.textContent('.item .texto small.cam'), 'Água sem gás');
        const l = await s.api('/api/lista', chave);
        assert.deepEqual(Object.keys(l.itens[0].p), ['continente', 'pingodoce', 'auchan']);
        assert.equal(l.itens[0].p.pingodoce.cent, 183);
        // a marca branca: o ícone fica na lista
        await a.fill('[data-onda="junta"]', 'agua');
        await a.click('#sug .chip:has-text("Água sem gás")');
        await a.waitForSelector('#folha .escolha .chips');
        await a.click('#folha [data-onda="fm:98"]');
        await a.click('#folha [data-onda="juntat:0"]');
        await a.waitForSelector('.item >> nth=1');
        await a.waitForSelector('.item .texto small:has-text("Pingo Doce 🏷 0,96 €")');
        // com o tamanho escolhido, a Mercadona tem estimativa (a marca branca de 6 L nas outras lojas)
        await a.fill('[data-onda="junta"]', 'agua');
        await a.click('#sug .chip:has-text("Água sem gás")');
        await a.waitForSelector('#folha .escolha .chips');
        await a.click('#folha .chip >> text="6 L"');
        await a.click('#folha [data-onda="juntat:0"]');
        await a.waitForSelector('.item >> nth=2');
        await a.click('#abas button >> nth=1');
        await a.waitForSelector('.merc');
        assert.match(await a.textContent('.merc b'), /^Mercadona ≈ 0,96 €/);
        assert.match(await a.textContent('.merc small'), /só 1 de 3 coisas/);
        // o talão: a fotografia vai ao conector, a IA lê-a (a fingir) e o que lá vem risca-se na lista
        await a.click('#abas button >> nth=0');
        const jpeg = await a.evaluate(() => { const c = document.createElement('canvas'); c.width = 40; c.height = 60; c.getContext('2d').fillRect(0, 0, 10, 10); return c.toDataURL('image/jpeg').split(',')[1]; });
        await a.setInputFiles('[data-talao]', { name: 'talao.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(jpeg, 'base64') });
        // a folha «Talão lido»: as linhas com o preço e o que se riscou na lista
        await a.waitForSelector('.talao-lido h2:has-text("Talão do Pingo Doce")');
        assert.match(await a.textContent('.talao-lido .nota'), /15\/11 · 2 linhas · total 2,83 €/);
        // cada linha com o tipo (quando se percebe) e «+ Juntar» à lista
        assert.deepEqual(await a.locator('.talao-lido .linhas-t li').allTextContents(), ['AGUA S/GAS GARRAFAO 6LÁgua sem gás0,96 €+ Juntar', 'OVOS CLASSE M1,87 €+ Juntar']);
        assert.match(await a.textContent('.talao-lido .riscou'), /^✓ Riscado na lista: /);
        await a.click('.talao-lido [data-onda="talf:0"] >> nth=-1');
        await a.waitForSelector('.talao-lido', { state: 'detached' });
        await a.click('[data-onda="carr:0"]'); // abre «No carrinho»
        await a.waitForFunction(() => document.querySelectorAll('.item.feito').length >= 1);
        // o que costumas comprar (do talão): os ovos; tocar junta-os à lista; o ✕ tira-os
        await a.waitForSelector('.costume .chip:has-text("Ovos classe m")');
        await a.click('.costume .chip:has-text("Ovos classe m")');
        await a.waitForSelector('.item .texto b:has-text("Ovos classe m")');
        assert.equal(await a.locator('.costume .chip:has-text("Ovos classe m")').count(), 0);
        const n = await a.locator('.item').count();
        await a.click('.item:has-text("Ovos classe m") .tira');
        await a.waitForFunction((n) => document.querySelectorAll('.item').length === n - 1, n);

        // na Casa, os teus talões: abrir um mostra as linhas; apagá-lo tira-o (e ao «Costumas comprar»)
        await a.click('#abas button >> nth=2');
        await a.waitForSelector('.taloes li button:has-text("Pingo Doce")');
        assert.match(await a.textContent('.taloes li'), /15\/11 · 2 linhas · 2,83 €/);
        await a.click('.taloes li button');
        await a.waitForSelector('.talao-lido .linhas-t li >> nth=1');
        await a.click('.talao-lido [data-onda="tala:0"]');
        await a.waitForSelector('.toast:has-text("Talão apagado")');
        await a.waitForSelector('.casa .nota:has-text("Ainda não leste nenhum talão")');
        // onde moras e as tuas lojas: Portimão, só Pingo Doce, Auchan e SPAR (a loja de Portimão)
        await a.waitForSelector('[data-onda="local"]');
        await a.fill('[data-onda="local"]', 'Portimão');
        await a.click('[data-onda="glocal:0"]');
        await a.waitForSelector('.chip:has-text("SPAR Portimão")');
        for (const k of [0, 3, 4]) { await a.click(`[data-onda="cad:${k}"]`); await a.waitForFunction((k) => !document.querySelector(`[data-onda="cad:${k}"]`).classList.contains('on'), k); }
        await a.click('.chip:has-text("SPAR Portimão")');
        await a.waitForSelector('.chip.on:has-text("SPAR Portimão")');
        assert.deepEqual(await a.locator('.casa .chips >> nth=0 >> .chip.on').allTextContents(), ['Pingo Doce', 'Auchan', 'SPAR']);
        // o «Mais barato» só conta com elas; a Mercadona sai e entra o SPAR estimado, com o nome da loja
        // (o talão riscou a água toda: volta a pôr a última, a de 6 L)
        await a.click('#abas button >> nth=0');
        await a.click('.item.feito .caixa >> nth=-1');
        await a.waitForFunction(() => !localStorage.getItem('compras:pend') && !localStorage.getItem('compras:envio'));
        await a.click('#abas button >> nth=1');
        assert.deepEqual(await a.locator('.cadeias li b').allTextContents(), ['Pingo Doce', 'Auchan']);
        assert.deepEqual(await a.locator('.merc b').allTextContents().then((l) => l.map((x) => x.split(' ≈')[0])), ['SPAR Portimão (M.Albuquerque)']);
        assert.deepEqual(erros, []);
    } finally { await br.close(); await s.fechar(); }
});

test('a árvore do talho e da peixaria: «peixe» → ramos → Peixe fresco → carapau e para grelhar ao mesmo tempo', { skip: !pw && 'sem playwright' }, async () => {
    const s = await abrir();
    const { guardarCatalogo } = await import('../proxy/src/catalogo.js');
    const { esquecerTipos } = await import('../proxy/src/sugerir.js');
    s.env.DB.sql.exec("INSERT INTO tipo (k, nome, n, casa) VALUES ('peixe-fresco', 'Peixe fresco', 6, 1), ('marisco', 'Marisco', 2, 1)");
    const p = (c, id, nome, preco, emb) => ({ id, nome, preco, emb, url: `https://www.${c}.pt/p-${id}.html` });
    await guardarCatalogo(s.env.DB, 'continente', 'peixe-fresco', [p('continente', '1', 'Carapau Médio Fresco', 4.49, '1 kg'), p('continente', '2', 'Carapau Pequeno Fresco', 5.99, '1 kg'), p('continente', '9', 'Filetes de Carapau', 9.99, '1 kg'), p('continente', '3', 'Posta de Pescada Fresca', 9.99, '1 kg'), p('continente', '4', 'Pescada Inteira Fresca', 7.99, '1 kg')]);
    await guardarCatalogo(s.env.DB, 'auchan', 'peixe-fresco', [p('auchan', '5', 'CARAPAU MEDIO FRESCO INTEIRO KG', 1.99, '1 kg'), p('auchan', '6', 'POSTA SALMAO FRESCO', 14.99, '1 kg')]);
    await guardarCatalogo(s.env.DB, 'auchan', 'marisco', [p('auchan', '7', 'CAMARAO COZIDO 1KG', 9.99, '1 kg'), p('auchan', '8', 'AMEIJOA BRANCA 1KG', 8.99, '1 kg')]);
    esquecerTipos();
    const br = await pw.chromium.launch();
    try {
        const a = await (await br.newContext({ viewport: { width: 390, height: 844 }, locale: 'pt-PT' })).newPage();
        const erros = [];
        a.on('pageerror', (e) => erros.push(e.message));
        await a.goto(s.url());
        await a.waitForFunction(() => localStorage.getItem('compras:chave'));
        // «peixe»: a secção, os ramos com o título (Peixe, Marisco) e os tipos de cada um
        await a.fill('[data-onda="junta"]', 'peixe');
        await a.waitForSelector('#sug .sug-t');
        assert.deepEqual(await a.locator('#sug .sug-t').allTextContents(), ['Peixe', 'Marisco', 'Cortes']);
        await a.click('#sug .chip.n2:has-text("Peixe fresco")');
        await a.waitForSelector('#folha .escolha h2:has-text("Peixe fresco")');
        // os níveis por ordem: a espécie primeiro, depois o corte e o uso
        assert.deepEqual(await a.locator('#folha .escolha h3').allTextContents(), ['Espécie ou animal', 'Corte', 'Para quê', 'Tamanho (podes escolher vários)', 'Marca', 'O mais barato em cada supermercado']);
        await a.click('#folha [data-onda^="fa:"]:has-text("carapau")');
        // escolhido o carapau, só os usos do carapau (não há postas de carapau)
        assert.equal(await a.locator('#folha [data-onda^="fw:"]:has-text("postas")').count(), 0);
        await a.click('#folha [data-onda^="fw:"]:has-text("para grelhar")');
        const caminho = await a.locator('#folha .caminho button, #folha .caminho b').allTextContents();
        assert.deepEqual(caminho, ['Todas', 'Talho e peixaria', 'Peixe fresco', 'carapau', 'para grelhar']);
        const linhas = await a.locator('#folha .melhores li:not(.est)').evaluateAll((l) => l.map((x) => x.querySelector('.pnome')?.textContent ?? x.textContent));
        assert.match(linhas[0], /Carapau Médio Fresco/);
        // o nome em destaque e «✓ Escolher este» (mesmo com uma só opção) fica à mão
        await a.click('#folha #cad0 .pnome'); // tocar na caixa escolhe
        await a.waitForSelector('#folha #cad0 .mao');
        assert.match(await a.getAttribute('#folha #cad0', 'class'), /escolhido/); // a caixa em destaque, com «✓ Escolhido»
        assert.equal(await a.textContent('#folha #cad0 .tag-esc'), '✓ Escolhido');
        assert.equal(await a.getAttribute('#folha #cad0', 'data-onda'), null); // já escolhido: a caixa não volta a escolher
        // o que distingue cada produto: os sinais do nome (fresco) e a marca
        assert.match(await a.locator('#folha .melhores li >> nth=0 >> .sinais').textContent(), /✚ fresco/);
        assert.match(linhas[2], /CARAPAU MEDIO/);
        // outras opções no Continente: os dois carapaus; escolher o pequeno fica à mão («escolhido por ti»)
        await a.click('#folha [data-onda="opc:0"]');
        assert.equal(await a.locator('#folha .opcoes .op').count(), 3);
        // na peixaria, arrumadas por corte (os filetes), e os sem corte em «Outros»
        assert.deepEqual(await a.locator('#folha .opcoes .op-t').allTextContents(), ['filetes', 'Outros']);
        await a.click('#folha .opcoes .op:has-text("Carapau Pequeno")');
        // escolher fecha a lista e um aviso diz o que ficou; ao reabrir, a escolhida marcada e dá para voltar ao mais barato
        await a.waitForSelector('.toast:has-text("No Continente: Carapau Pequeno Fresco")');
        assert.equal(await a.locator('#folha .opcoes').count(), 0);
        await a.click('#folha [data-onda="opc:0"]');
        assert.match(await a.textContent('#folha .opcoes .op.on'), /Carapau Pequeno/);
        await a.click('#folha .opcoes .op-x:not(.op-f)');
        assert.match(await a.textContent('#folha .opcoes .op.on'), /Carapau Médio/);
        await a.click('#folha .opcoes .op:has-text("Carapau Pequeno")');
        assert.equal(await a.locator('#folha .opcoes').count(), 0);
        assert.match(await a.locator('#folha .melhores > li >> nth=0').textContent(), /Carapau Pequeno Fresco.*escolhido por ti/);
        await a.click('#folha [data-onda="juntat:0"]');
        await a.waitForSelector('.item');
        assert.deepEqual(await a.locator('.item .texto b').allTextContents(), ['Peixe fresco (carapau, para grelhar)']);
        const l = await s.api('/api/lista', await a.evaluate(() => localStorage.getItem('compras:chave')));
        assert.equal(l.itens[0].e.w, 'carapau grelhar');
        assert.equal(l.itens[0].p.continente.nome, 'Carapau Pequeno Fresco');
        assert.equal(l.itens[0].e.mao, 1); // escolhido à mão: a troca de hora a hora não o muda
        assert.deepEqual(erros, []);
    } finally { await br.close(); await s.fechar(); }
});

test('o modo simples: liga-se na Casa, só neste telemóvel; as secções em botões grandes e escolher sem escrever', { skip: !pw && 'sem playwright' }, async () => {
    const s = await abrir();
    const br = await pw.chromium.launch();
    try {
        const a = await (await br.newContext({ viewport: { width: 390, height: 844 }, locale: 'pt-PT' })).newPage();
        const erros = [];
        a.on('pageerror', (e) => erros.push(e.message));
        await a.goto(s.url());
        await a.waitForFunction(() => localStorage.getItem('compras:chave'));
        assert.equal(await a.locator('.grelha').count(), 0);
        await a.click('#abas button >> nth=2');
        await a.click('[data-onda="simples:0"]');
        assert.match(await a.textContent('[data-onda="simples:0"]'), /Modo simples ligado/);
        assert.equal(await a.evaluate(() => localStorage.getItem('compras:simples')), '1');
        await a.click('#abas button >> nth=0');
        // as 11 secções com ícone, antes do campo de escrever; tocar em Bebidas mostra os tipos dela
        assert.equal(await a.locator('.lista.simples .grelha button').count(), 11);
        assert.match(await a.getAttribute('[data-onda="junta"]', 'placeholder'), /🎤/);
        await a.click('.grelha button:has-text("Bebidas")');
        await a.waitForSelector('#sug .chip:has-text("Água sem gás")');
        await a.click('#sug .chip:has-text("Água sem gás")');
        await a.waitForSelector('#folha .escolha.simples h2:has-text("Água sem gás")');
        await a.click('#folha [data-onda="juntat:0"]');
        await a.waitForSelector('.item');
        assert.deepEqual(await a.locator('.item .texto b').allTextContents(), ['Água sem gás']);
        assert.deepEqual(erros, []);
    } finally { await br.close(); await s.fechar(); }
});

test('o Cabaz de Natal: as partes com 3 opções, o modo, escolher outra, tirar uma parte e juntar o cabaz à lista', { skip: !pw && 'sem playwright' }, async () => {
    const s = await abrir();
    const agora = new Date().toISOString();
    const ins = (cadeia, id, nome, tipo, cent, uc, ub) => s.env.DB.sql.prepare(`INSERT INTO preco (cadeia, id, url, nome, cent, uc, ub, tipo, visto, falhas)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`).run(cadeia, id, `https://www.${cadeia === 'pingodoce' ? 'pingodoce' : cadeia}.pt/produto/${id}.html`, nome, cent, uc, ub, tipo, agora);
    ins('continente', 'b1', 'Bacalhau Especial Noruega Cura Amarela', 'bacalhau', 1699, 1699, 'kg');
    ins('auchan', 'b2', 'Bacalhau Graúdo', 'bacalhau', 1299, 1299, 'kg');
    ins('pingodoce', 'b3', 'Bacalhau Corrente', 'bacalhau', 899, 899, 'kg');
    ins('continente', 'v1', 'Vinho do Porto Tawny 20 Anos', 'vinho-tinto', 2999, 3999, 'l');
    ins('auchan', 'v2', 'Vinho do Porto Ruby', 'vinho-tinto', 599, 799, 'l');
    s.env.DB.sql.prepare("INSERT INTO tipo (k, nome, n, casa) VALUES ('bacalhau', 'Bacalhau', 3, 1)").run();
    (await import('../proxy/src/sugerir.js')).esquecerTipos();
    const br = await pw.chromium.launch();
    try {
        const a = await (await br.newContext({ viewport: { width: 390, height: 844 }, locale: 'pt-PT' })).newPage();
        const erros = [];
        a.on('pageerror', (e) => erros.push(e.message));
        await a.goto(s.url());
        await a.waitForFunction(() => localStorage.getItem('compras:chave'));
        await a.click('[data-onda="natal:0"]');
        await a.waitForSelector('#folha .cartao.natal .parte h3:has-text("Bacalhau da consoada")');
        // equilíbrio: 3 opções de bacalhau, uma no cabaz; a qualidade põe o especial à frente e diz porquê
        assert.equal(await a.locator('#folha .parte:has-text("Bacalhau") .op').count(), 3);
        await a.click('[data-onda="ntm:0"]');
        await a.waitForSelector('[data-onda="ntm:0"].on');
        await a.waitForSelector('#folha .parte:has-text("Bacalhau") .op.on:has-text("Especial")');
        assert.match(await a.textContent('#folha .parte:has-text("Bacalhau") .op.on'), /\+ especial/);
        assert.match(await a.textContent('#folha .total'), /46,98/); // 16,99 + 29,99
        // o preço: o corrente e o ruby
        await a.click('[data-onda="ntm:2"]');
        await a.waitForSelector('#folha .parte:has-text("Bacalhau") .op.on:has-text("Corrente")');
        // escolher outro bacalhau à mão e tirar o Porto do cabaz
        await a.click('#folha .parte:has-text("Bacalhau") .op:has-text("Graúdo")');
        await a.waitForSelector('#folha .parte:has-text("Bacalhau") .op.on:has-text("Graúdo")');
        await a.click('#folha .parte:has-text("Vinho do Porto") [data-onda^="nto:"]');
        await a.waitForSelector('#folha .parte.fora:has-text("Vinho do Porto")');
        assert.match(await a.textContent('#folha .total'), /12,99/);
        // as partes sem nada nas lojas dizem-no
        assert.match(await a.textContent('#folha .parte:has-text("Bolo-rei")'), /Ainda não há/);
        await a.click('[data-onda="ntj:0"]');
        await a.waitForSelector('.item');
        assert.equal(await a.locator('#folha .cartao.natal').count(), 0);
        // junta-se como uma escolha do tipo («Bacalhau»), com o produto escolhido, para se poder ajustar
        assert.deepEqual(await a.locator('.item .texto b').allTextContents(), ['Bacalhau']);
        await a.waitForFunction(() => !localStorage.getItem('compras:pend') && !localStorage.getItem('compras:envio'));
        const it = JSON.parse(s.env.DB.linhas('SELECT itens FROM casa')[0].itens)[0];
        assert.equal(it.p.auchan.id, 'b2');
        assert.equal(it.e.k, 'bacalhau');
        // tocar na coisa abre logo a escolha do tipo (com os filtros dela); «Guardar» substitui a coisa
        await a.click('.item .texto');
        await a.waitForSelector('#folha .escolha h2:has-text("Bacalhau")');
        assert.equal(await a.locator('#folha [data-onda="tirars:0"]').count(), 1);
        await a.click('#folha [data-onda="juntat:0"]');
        await a.waitForFunction(() => !localStorage.getItem('compras:pend') && !localStorage.getItem('compras:envio'));
        assert.equal(await a.locator('.item').count(), 1);
        const it2 = JSON.parse(s.env.DB.linhas('SELECT itens FROM casa')[0].itens);
        assert.equal(it2.length, 1);
        assert.notEqual(it2[0].id, it.id);
        assert.deepEqual(erros, []);
    } finally { await br.close(); await s.fechar(); }
});

test('a receita: colar um link do TikTok abre a folha; sem legenda, cola-se o texto, tira-se o que há em casa e junta-se', { skip: !pw && 'sem playwright' }, async () => {
    const s = await abrir();
    const br = await pw.chromium.launch();
    try {
        const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, locale: 'pt-PT' });
        // o TikTok (no telemóvel e no conector) responde sem a legenda, como a um centro de dados
        await ctx.route('https://www.tiktok.com/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"version":"1.0","type":"video"}' }));
        const a = await ctx.newPage();
        const erros = [];
        a.on('pageerror', (e) => erros.push(e.message));
        await a.goto(s.url());
        await a.waitForFunction(() => localStorage.getItem('compras:chave'));
        await a.fill('[data-onda="junta"]', 'https://www.tiktok.com/@terapianofogo/video/7316138102043479329?is_from_webapp=1');
        await a.press('[data-onda="junta"]', 'Enter');
        await a.waitForSelector('#folha .cartao.receita');
        await a.waitForSelector('#folha .cartao.receita .nota:has-text("Cola"), #folha .cartao.receita .aviso');
        assert.equal(await a.locator('.item').count(), 0); // o link não entrou na lista como uma coisa
        await a.fill('#folha [data-onda="rctx"]', 'Bacalhau com natas\n- 2 postas de bacalhau\n- 1 L leite\n- 100 g manteiga\n- 200 ml natas');
        await a.click('#folha [data-onda="rct:0"]');
        await a.waitForSelector('#folha .chips.rc .chip >> nth=3');
        assert.deepEqual(await a.locator('#folha .chips.rc .chip').allTextContents(), ['✓ postas de bacalhau 2', '✓ leite 1 L', '✓ manteiga 100 g', '✓ natas 200 ml']);
        await a.click('#folha .chips.rc .chip:has-text("leite")'); // já há leite em casa
        await a.click('#folha [data-onda="rcj:0"]:has-text("Juntar 3")');
        await a.waitForSelector('.item >> nth=2');
        assert.equal(await a.locator('#folha .cartao.receita').count(), 0);
        assert.deepEqual((await a.locator('.item .texto b').allTextContents()).sort(), ['manteiga', 'natas', 'postas de bacalhau']);
        assert.deepEqual(erros, []);
    } finally { await br.close(); await s.fechar(); }
});

test('as lojas online: 3 de cada vez (com o botão para as outras) e só as que passam nos filtros', { skip: !pw && 'sem playwright' }, async () => {
    const s = await abrir();
    const { esquecerTipos } = await import('../proxy/src/sugerir.js');
    const agora = new Date().toISOString();
    s.env.DB.sql.prepare("INSERT INTO tipo (k, nome, n, casa) VALUES ('bacalhau', 'Bacalhau', 2, 1)").run();
    for (const [c, id, nome, cent] of [['continente', 'b1', 'Bacalhau Graúdo Noruega Seco', 1499], ['auchan', 'b2', 'Bacalhau Especial Islândia Seco', 1899],
        ['pingodoce', 'b3', 'Bacalhau Crescido Noruega Seco', 1299], ['continente', 'b4', 'Bacalhau Graúdo Islândia Seco', 1999]])
        s.env.DB.sql.prepare(`INSERT INTO preco (cadeia, id, url, nome, cent, uc, ub, emb, q, tipo, visto, falhas) VALUES (?, ?, ?, ?, ?, ?, 'kg', '1 kg', 1, 'bacalhau', ?, 0)`)
            .run(c, id, `https://www.${c}.pt/p/${id}.html`, nome, cent, cent, agora);
    for (let i = 0; i < 5; i++) s.env.DB.sql.prepare(`INSERT INTO produtor_artigo (loja, id, nome, url, variante, cent, emb, uc, ub, tipo, disponivel, visto)
        VALUES ('lugrade', ?, 'Especial', 'https://loja.lugrade.com/produto/especial/', ?, ?, '3,4 kg', ?, 'kg', 'bacalhau', 1, ?)`)
        .run('e#' + i, `${i < 4 ? 'noruega' : 'islandia'} · 3.25 a 3.5kg`, 11000 + i * 100, 3200 + i * 30, agora);
    esquecerTipos();
    const br = await pw.chromium.launch();
    try {
        const a = await (await br.newContext({ viewport: { width: 390, height: 844 }, locale: 'pt-PT' })).newPage();
        const erros = [];
        a.on('pageerror', (e) => erros.push(e.message));
        await a.goto(s.url());
        await a.waitForFunction(() => localStorage.getItem('compras:chave'));
        await a.fill('[data-onda="junta"]', 'bacalhau');
        await a.waitForSelector('#sug .chip:has-text("Bacalhau")');
        await a.click('#sug .chip:has-text("Bacalhau")');
        await a.waitForSelector('#folha .prod-t');
        assert.equal(await a.locator('#folha li.prod').count(), 3);
        await a.click('#folha .mais-op:has-text("Ver as 5 das lojas online")');
        await a.waitForSelector('#folha .mais-op:has-text("Mostrar só 3")');
        assert.equal(await a.locator('#folha li.prod').count(), 5);
        // a Islândia: só a da Islândia
        await a.click('#folha .chip:has-text("Islândia") >> nth=0');
        await a.waitForSelector('#folha .prod-t:has-text("com os teus filtros")');
        assert.equal(await a.locator('#folha li.prod').count(), 1);
        assert.match(await a.textContent('#folha li.prod'), /islandia/);
        assert.deepEqual(erros, []);
    } finally { await br.close(); await s.fechar(); }
});

test('o vinho: a fila «Nota» (críticos e Vivino) filtra os supermercados e as lojas online; o nome do vinho à vista', { skip: !pw && 'sem playwright' }, async () => {
    const s = await abrir();
    const { esquecerTipos } = await import('../proxy/src/sugerir.js');
    const agora = new Date().toISOString();
    s.env.DB.sql.prepare("INSERT INTO tipo (k, nome, n, casa) VALUES ('vinho-tinto', 'Vinho tinto', 4, 1)").run();
    const ins = (cadeia, id, nome, cent) => s.env.DB.sql.prepare(`INSERT INTO preco (cadeia, id, url, nome, cent, uc, ub, emb, q, tipo, visto, falhas)
        VALUES (?, ?, ?, ?, ?, ?, 'l', '75 cl', 0.75, 'vinho-tinto', ?, 0)`).run(cadeia, id, `https://www.${cadeia}.pt/p/${id}.html`, nome, cent, Math.round(cent / 0.75), agora);
    ins('continente', 'v1', 'Papa Figos Douro Vinho Tinto', 699); ins('continente', 'v2', 'Monte Velho Alentejo Vinho Tinto', 449);
    ins('auchan', 'v3', 'VINHO TINTO DOURO RESERVA 0.75L', 899); ins('pingodoce', 'v4', 'Vinho Tinto Alentejo Pingo Doce', 299);
    s.env.DB.sql.prepare(`INSERT INTO vinho_nota (palavras, fora, nome, nota, n, resumo, fontes, visto) VALUES ('papa figos tinto', '', 'Papa Figos', 91, 1, 'Revista de Vinhos 17/20', '[]', ?)`).run(agora);
    s.env.DB.sql.prepare(`INSERT INTO produtor_artigo (loja, id, nome, url, cent, emb, uc, ub, tipo, disponivel, visto, vivino, votos) VALUES
        ('vinha', 'w1', 'Vinho Tinto Quinta X Grande Reserva 2020 Douro', 'https://www.vinha.pt/vinho/x/', 2500, '75 cl', 3333, 'l', 'vinho-tinto', 1, ?, 4.3, 900),
        ('vinha', 'w2', 'Vinho Tinto Quinta Y 2022 Alentejo', 'https://www.vinha.pt/vinho/y/', 900, '75 cl', 1200, 'l', 'vinho-tinto', 1, ?, 3.6, 100)`).run(agora, agora);
    esquecerTipos();
    const br = await pw.chromium.launch();
    try {
        const a = await (await br.newContext({ viewport: { width: 390, height: 844 }, locale: 'pt-PT' })).newPage();
        const erros = [];
        a.on('pageerror', (e) => erros.push(e.message));
        await a.goto(s.url());
        await a.waitForFunction(() => localStorage.getItem('compras:chave'));
        await a.fill('[data-onda="junta"]', 'vinho');
        await a.waitForSelector('#sug .chip:has-text("Vinho tinto")');
        await a.click('#sug .chip:has-text("Vinho tinto")');
        await a.waitForSelector('#folha h3:has-text("Nota")');
        // o nome do vinho é o título do cartão da loja online, e a Vivino lê-se
        assert.equal(await a.locator('#folha li.prod b >> nth=0').textContent(), 'Vinho Tinto Quinta X Grande Reserva 2020 Douro');
        assert.match(await a.textContent('#folha li.prod >> nth=0'), /Vivino 4,3\/5 \(900 votos\)/);
        await a.click('#folha .chip:has-text("Críticos 87+")');
        await a.waitForSelector('#folha .caminho button:has-text("Críticos 87+")');
        const nomes = await a.locator('#folha .melhores > li:not(.est)').evaluateAll((l) => l.map((x) => (x.querySelector('.pnome')?.textContent ?? '') + ' ' + (x.querySelector(':scope > small')?.textContent ?? '')));
        assert.ok(nomes.some((t) => /Papa Figos.*o mais barato por litro/.test(t)) && !nomes.some((t) => /Monte Velho|RESERVA|Pingo Doce/.test(t)), nomes.join(' | '));
        assert.equal(await a.locator('#folha li.prod').count(), 0); // nenhum da loja online tem nota de crítico
        await a.click('#folha .chip:has-text("Vivino 4,2+")');
        await a.waitForSelector('#folha .caminho button:has-text("Vivino 4,2+")');
        assert.equal(await a.locator('#folha li.prod').count(), 1);
        assert.deepEqual(erros, []);
    } finally { await br.close(); await s.fechar(); }
});

test('a análise do Claude: pedir com uma pergunta, esperar, ver o resultado e tocar numa pergunta para afinar', { skip: !pw && 'sem playwright' }, async () => {
    const s = await abrir();
    const { gravarResultado } = await import('../proxy/src/pedidos.js');
    const br = await pw.chromium.launch();
    try {
        const a = await (await br.newContext({ viewport: { width: 390, height: 844 }, locale: 'pt-PT' })).newPage();
        const erros = [];
        a.on('pageerror', (e) => erros.push(e.message));
        await a.goto(s.url());
        await a.waitForFunction(() => localStorage.getItem('compras:chave'));
        assert.equal(await a.locator('[data-onda="anl:0"]').count(), 0); // com a lista vazia não há o que analisar
        await a.fill('[data-onda="junta"]', 'pão, leite');
        await a.click('[data-onda="juntar:0"]');
        await a.waitForSelector('[data-onda="anl:0"]');
        await a.click('[data-onda="anl:0"]');
        await a.waitForSelector('#folha .cartao.analise h3:has-text("Pedir a análise")');
        await a.fill('#folha [data-onda="anq"]', 'só uma loja');
        await a.click('#folha [data-onda="anpe:0"]');
        await a.waitForSelector('#folha .cartao.analise .espera');
        assert.match(await a.textContent('#folha .cartao.analise'), /Perguntaste: «só uma loja».*próxima corrida/s);
        // a tarefa do Claude grava o resultado
        const { id } = s.env.DB.sql.prepare('SELECT id FROM analise').get();
        await gravarResultado(s.env.DB, id, { resumo: 'Vai só ao Lidl: fica 2 € mais barato.', lojas: [{ loja: 'Lidl', porque: 'o mais barato no total', coisas: ['pão', 'leite'] }],
            online: [], perguntas: ['Precisas de leite sem lactose?'] });
        await a.click('#folha [data-onda="anv:0"]');
        await a.waitForSelector('#folha .cartao.analise .resumo');
        assert.equal(await a.textContent('#folha .cartao.analise .resumo'), 'Vai só ao Lidl: fica 2 € mais barato.');
        assert.match(await a.textContent('#folha .cartao.analise ul.an'), /Lidl.*pão, leite/s);
        await a.click('#folha .cartao.analise .chip:has-text("sem lactose")');
        await a.waitForFunction(() => document.querySelector('#folha [data-onda="anq"]').value.startsWith('«Precisas de leite sem lactose?» '));
        assert.deepEqual(erros, []);
    } finally { await br.close(); await s.fechar(); }
});

test('as descidas de preço: na lista, «↓ 20% no Continente (era …)», e um aviso ao abrir a app (uma vez)', { skip: !pw && 'sem playwright' }, async () => {
    const s = await abrir();
    const br = await pw.chromium.launch();
    try {
        const a = await (await br.newContext({ viewport: { width: 390, height: 844 }, locale: 'pt-PT' })).newPage();
        const erros = [];
        a.on('pageerror', (e) => erros.push(e.message));
        await a.goto(s.url());
        const chave = await (await a.waitForFunction(() => localStorage.getItem('compras:chave'))).jsonValue();
        await s.api('/api/lista', chave, { ops: [{ o: 'j', id: 'paof', t: 'pão de forma' }] });
        await s.api('/api/lista', chave, { ops: [{ o: 'p', id: 'paof', c: 'continente', p: { id: '11', nome: 'Pão de forma', url: 'https://www.continente.pt/produto/p-11.html' } }] });
        // o preço desce (o histórico regista-o)
        s.env.DB.sql.prepare("UPDATE preco SET cent = 119 WHERE cadeia = 'continente' AND id = '11'").run();
        const l = await s.api('/api/lista', chave);
        assert.deepEqual([l.itens[0].p.continente.vd, l.itens[0].p.continente.de], [20, 149]);
        assert.equal(l.descidas[0].t, 'pão de forma');
        await a.reload();
        await a.waitForSelector('.item small.desce');
        assert.equal(await a.textContent('.item small.desce'), '↓ 20% no Continente (era 1,49 €)');
        await a.waitForSelector('#aviso .toast:has-text("pão de forma: desceu 20% no Continente")');
        assert.deepEqual(erros, []);
    } finally { await br.close(); await s.fechar(); }
});

test('o Afinar: com muitos vinhos, uma pergunta de cada vez (para quê → o preço, depois a região) até ficarem poucos', { skip: !pw && 'sem playwright' }, async () => {
    const s = await abrir();
    const { esquecerTipos } = await import('../proxy/src/sugerir.js');
    const agora = new Date().toISOString();
    s.env.DB.sql.prepare("INSERT INTO tipo (k, nome, n, casa) VALUES ('vinho-tinto', 'Vinho tinto', 12, 1)").run();
    const ins = (cadeia, id, nome, cent) => s.env.DB.sql.prepare(`INSERT INTO preco (cadeia, id, url, nome, cent, uc, ub, emb, q, tipo, visto, falhas)
        VALUES (?, ?, ?, ?, ?, ?, 'l', '75 cl', 0.75, 'vinho-tinto', ?, 0)`).run(cadeia, id, `https://www.${cadeia}.pt/p/${id}.html`, nome, cent, Math.round(cent / 0.75), agora);
    const regioes = ['Douro', 'Alentejo', 'Dão'], cs = ['continente', 'pingodoce', 'auchan'];
    for (let i = 0; i < 12; i++) ins(cs[i % 3], 'w' + i, `Vinho Tinto ${regioes[i % 3]} Marca${i}${i % 2 ? ' Reserva' : ''}`, [399, 699, 899, 1299][i % 4]);
    esquecerTipos();
    const br = await pw.chromium.launch();
    try {
        const a = await (await br.newContext({ viewport: { width: 390, height: 844 }, locale: 'pt-PT' })).newPage();
        const erros = [];
        a.on('pageerror', (e) => erros.push(e.message));
        await a.goto(s.url());
        await a.waitForFunction(() => localStorage.getItem('compras:chave'));
        await a.fill('[data-onda="junta"]', 'vinho');
        await a.waitForSelector('#sug .chip:has-text("Vinho tinto")');
        await a.click('#sug .chip:has-text("Vinho tinto")');
        await a.waitForSelector('#folha .afinar');
        assert.match(await a.textContent('#folha .afinar'), /12 opções.*Para quê é o vinho/s);
        // «Tanto faz» no preço: passa à região (ainda 12)
        await a.click('#folha .afinar .chip:has-text("Tanto faz")');
        await a.waitForSelector('#folha .afinar .q:has-text("Região")');
        assert.match(await a.textContent('#folha .afinar .t'), /12 opções/);
        // o Douro: ficam 4 (8 ou menos): o Afinar dá lugar ao resumo, e o filtro fica no caminho
        await a.click('#folha .afinar .chip:has-text("Douro")');
        await a.waitForSelector('#folha .afinado');
        assert.equal(await a.locator('#folha .afinar').count(), 0);
        assert.match(await a.textContent('#folha .afinado'), /Ficam 4 nos supermercados/);
        assert.equal(await a.locator('#folha .caminho button:has-text("Douro")').count(), 1);
        assert.deepEqual(erros, []);
    } finally { await br.close(); await s.fechar(); }
});

test('o vinho: as filas Região e Gama (não palavras soltas), escolher «Douro» filtra, e a ligação para a nota no Vivino', { skip: !pw && 'sem playwright' }, async () => {
    const s = await abrir();
    const { esquecerTipos } = await import('../proxy/src/sugerir.js');
    const agora = new Date().toISOString();
    s.env.DB.sql.prepare("INSERT INTO tipo (k, nome, n, casa) VALUES ('vinho-tinto', 'Vinho tinto', 6, 1)").run();
    const ins = (cadeia, id, nome, cent) => s.env.DB.sql.prepare(`INSERT INTO preco (cadeia, id, url, nome, cent, uc, ub, emb, q, tipo, visto, falhas)
        VALUES (?, ?, ?, ?, ?, ?, 'l', '75 cl', 0.75, 'vinho-tinto', ?, 0)`).run(cadeia, id, `https://www.${cadeia}.pt/p/${id}.html`, nome, cent, Math.round(cent / 0.75), agora);
    ins('continente', 'v1', 'Papa Figos Douro Vinho Tinto Seleção', 699); ins('continente', 'v2', 'Monte Velho Alentejo Vinho Tinto Seleção', 449);
    ins('auchan', 'v3', 'VINHO TINTO DOURO RESERVA 0.75L', 899); ins('auchan', 'v4', 'VINHO TINTO ALENTEJO RESERVA 0.75L', 599);
    ins('pingodoce', 'v5', 'Vinho Tinto Douro Esteva', 599); ins('pingodoce', 'v6', 'Vinho Tinto Alentejo Pingo Doce', 299);
    // a nota dos críticos (economo/notas.mjs): o Papa Figos tem 88
    s.env.DB.sql.prepare(`INSERT INTO vinho_nota (palavras, fora, nome, nota, n, resumo, fontes, visto)
        VALUES ('papa figos tinto', '', 'Papa Figos tinto', 88, 2, 'Revista de Vinhos 16/20', '[{"fonte":"Revista de Vinhos","tipo":"critico","valor":"16/20","url":"https://www.revistadevinhos.pt/papa-figos"}]', ?)`).run(agora);
    esquecerTipos();
    const br = await pw.chromium.launch();
    try {
        const a = await (await br.newContext({ viewport: { width: 390, height: 844 }, locale: 'pt-PT' })).newPage();
        const erros = [];
        a.on('pageerror', (e) => erros.push(e.message));
        await a.goto(s.url());
        await a.waitForFunction(() => localStorage.getItem('compras:chave'));
        await a.fill('[data-onda="junta"]', 'vinho');
        await a.waitForSelector('#sug .chip:has-text("Vinho tinto")');
        await a.click('#sug .chip:has-text("Vinho tinto")');
        await a.waitForSelector('#folha .escolha h2:has-text("Vinho tinto")');
        assert.deepEqual(await a.locator('#folha .escolha h3').allTextContents().then((h) => h.filter((t) => /Região|Gama|Variante/.test(t))), ['Região', 'Gama']);
        // as melhores compras, sem filtro: o Reserva mais barato pelo rótulo («Seleção» é marketing: não conta),
        // depois o Papa Figos pela nota dos críticos (e quanto custa a mais); e, à parte, os mais bem cotados
        const bc0 = await a.locator('#folha .bc li').allTextContents();
        assert.equal(bc0.length, 3, bc0.join(' | '));
        assert.match(bc0[0], /ALENTEJO RESERVA.*o rótulo diz: Reserva/);
        assert.match(bc0[1], /Papa Figos.*★ 88 ↗ · Revista de Vinhos 16\/20.*para subir de gama/);
        assert.match(bc0[2], /Papa Figos.*★ 88/);
        assert.ok((await a.locator('#folha h3').allTextContents()).some((t) => /Os mais bem cotados/.test(t)));
        // a ★ abre a notícia (fora da app); tocar no vinho escolhe-o nesse supermercado
        assert.equal(await a.getAttribute('#folha .bc a.fonte >> nth=0', 'href'), 'https://www.revistadevinhos.pt/papa-figos');
        await a.click('#folha .bc li:has-text("Papa Figos") b >> nth=0');
        await a.waitForSelector('#aviso .toast:has-text("No Continente: Papa Figos")');
        // e a folha salta para a linha do Continente, onde o vinho ficou escolhido
        await a.waitForFunction(() => { const r = document.querySelector('#cad0')?.getBoundingClientRect(); return r && r.top >= -2 && r.top < 200; });
        await a.evaluate(() => window.app.chamar('clique', window.app.escrever('escx:0'))); // volta ao mais barato no Continente
        // «Escolher por: ⭐ Melhor nota»: no Continente passa a ser o Papa Figos (★ 88), não o Monte Velho (mais barato)
        const cont = async () => (await a.locator('#folha .melhores > li').allTextContents()).find((t) => /Continente/i.test(t)) ?? '';
        assert.match(await cont(), /Monte Velho/);
        assert.match(await cont(), /4,49 €5,99 €\/l/); // no vinho, em grande o preço da garrafa e por baixo o preço por litro
        await a.click('#folha .chip:has-text("Melhor nota")');
        await a.waitForSelector('#folha h3:has-text("O melhor cotado em cada supermercado")');
        assert.match(await cont(), /Papa Figos/);
        await a.click('#folha .chip:has-text("Mais barato")');
        await a.waitForSelector('#folha h3:has-text("O mais barato em cada supermercado")');
        await a.click('#folha .chip:has-text("Douro")');
        await a.waitForSelector('#folha .caminho button:has-text("Douro")');
        const nomes = await a.locator('#folha .melhores > li').evaluateAll((l) => l.map((x) => (x.querySelector('.pnome')?.textContent ?? '') + ' ' + (x.querySelector(':scope > small')?.textContent ?? '')));
        assert.ok(nomes.filter((t) => /Douro|DOURO/.test(t)).length >= 3 && !nomes.some((t) => /Alentejo|ALENTEJO/.test(t)), nomes.join(' | '));
        assert.match(await a.getAttribute('#folha a.vivino >> nth=0', 'href'), /^https:\/\/www\.vivino\.com\/search\/wines\?q=.*Douro/i);
        assert.match(await a.getAttribute('#folha a.vivino >> nth=1', 'href'), /^https:\/\/www\.wine-searcher\.com\/find\/.*\/1\/portugal$/);
        // escolhida a região, as melhores compras seguem-na: só os do Douro
        const bc = await a.locator('#folha .bc li').allTextContents();
        assert.equal(bc.length, 2, bc.join(' | '));
        // o Papa Figos (★ 88) é mais barato do que o Reserva sem nota: o Reserva já não vale a pena
        assert.match(bc[0], /Papa Figos.*★ 88/);
        assert.match(bc[1], /Papa Figos.*★ 88/); // e é o mais bem cotado
        assert.ok(!bc.some((t) => /DOURO RESERVA/.test(t)), bc.join(' | '));
        // puxar a folha para baixo fecha-a (como o ✕); um puxão pequeno não (um rápido de mais de 30 px já fecha)
        const puxar = (ate) => a.evaluate((ate) => {
            const c = document.querySelector('#folha .cartao');
            c.scrollTop = 0;
            const toque = (tipo, y) => { const t = new Touch({ identifier: 1, target: c, clientX: 100, clientY: y });
                c.dispatchEvent(new TouchEvent(tipo, { touches: tipo === 'touchend' ? [] : [t], changedTouches: [t], bubbles: true, cancelable: true })); };
            toque('touchstart', 100); toque('touchmove', 120); toque('touchmove', 100 + ate); toque('touchend', 100 + ate);
        }, ate);
        await puxar(25);
        await a.waitForTimeout(400);
        assert.equal(await a.locator('#folha .cartao.escolha').count(), 1);
        await puxar(200);
        await a.waitForSelector('#folha .cartao.escolha', { state: 'detached' });
        assert.deepEqual(erros, []);
    } finally { await br.close(); await s.fechar(); }
});

test('as pessoas da casa: na Casa escolhem-se 2, e no frango o mais barato é o de 500 g e não o pacote de 2 kg', { skip: !pw && 'sem playwright' }, async () => {
    const s = await abrir();
    const { esquecerTipos } = await import('../proxy/src/sugerir.js');
    const agora = new Date().toISOString();
    s.env.DB.sql.prepare("INSERT INTO tipo (k, nome, n, casa) VALUES ('frango', 'Frango', 2, 1)").run();
    const ins = (id, nome, cent, q, emb) => s.env.DB.sql.prepare(`INSERT INTO preco (cadeia, id, url, nome, cent, uc, ub, emb, q, tipo, visto, falhas)
        VALUES ('continente', ?, ?, ?, ?, ?, 'kg', ?, ?, 'frango', ?, 0)`).run(id, `https://www.continente.pt/p/${id}.html`, nome, cent, Math.round(cent / q), emb, q, agora);
    ins('g', 'Bife de Frango Pack Familiar', 1198, 2, '2 kg'); ins('m', 'Bife de Frango', 349, 0.5, '500 g');
    esquecerTipos();
    const br = await pw.chromium.launch();
    try {
        const a = await (await br.newContext({ viewport: { width: 390, height: 844 }, locale: 'pt-PT' })).newPage();
        const erros = [];
        a.on('pageerror', (e) => erros.push(e.message));
        await a.goto(s.url());
        await a.waitForFunction(() => localStorage.getItem('compras:chave'));
        const cont = async () => (await a.locator('#folha .melhores > li').allTextContents()).find((t) => /Continente/i.test(t)) ?? '';
        const abreFrango = async () => {
            await a.fill('[data-onda="junta"]', 'frango');
            await a.click('#sug .chip:has-text("Frango")');
            await a.waitForSelector('#folha .escolha h2:has-text("Frango")');
        };
        await abreFrango();
        assert.match(await cont(), /Pack Familiar/); // sem pessoas: o mais barato ao quilo
        await a.click('#folha .fechar');
        await a.click('#abas button >> nth=2');
        await a.waitForSelector('h3:has-text("Quantas pessoas em casa?")');
        await a.click('.casa .chip:text-is("2")');
        await a.waitForSelector('.casa .chip.on:text-is("2")');
        await a.click('#abas button >> nth=0');
        await abreFrango();
        assert.match(await a.locator('#folha').innerText(), /Para 2 pessoas: o mais barato em embalagens até 800 g/);
        assert.match(await cont(), /Bife de Frango/);
        assert.doesNotMatch(await cont(), /Pack Familiar/);
        assert.deepEqual(erros, []);
    } finally { await br.close(); await s.fechar(); }
});


test('juntar depressa: «bifes de frango» junta logo o mais barato; «frango» abre a escolha; o 🗑 e deslizar para a esquerda tiram', { skip: !pw && 'sem playwright' }, async () => {
    const s = await abrir();
    const { esquecerTipos } = await import('../proxy/src/sugerir.js');
    const agora = new Date().toISOString();
    s.env.DB.sql.prepare("INSERT INTO tipo (k, nome, n, casa) VALUES ('frango', 'Frango', 3, 1)").run();
    const ins = (cadeia, id, nome, cent, q, emb) => s.env.DB.sql.prepare(`INSERT INTO preco (cadeia, id, url, nome, cent, uc, ub, emb, q, tipo, visto, falhas)
        VALUES (?, ?, ?, ?, ?, ?, 'kg', ?, ?, 'frango', ?, 0)`).run(cadeia, id, `https://www.${cadeia}.pt/p/${id}.html`, nome, cent, Math.round(cent / q), emb, q, agora);
    ins('continente', 'b1', 'Bifes de Frango Continente', 475, 0.68, '680 g'); ins('continente', 'b2', 'Bifes de Frango Extrafino', 494, 0.55, '550 g');
    ins('pingodoce', 'p1', 'Bife de Frango a granel', 325, 0.5, '500 g'); ins('continente', 'c1', 'Coxas de Frango', 299, 1, '1 kg');
    esquecerTipos();
    const br = await pw.chromium.launch();
    try {
        const a = await (await br.newContext({ viewport: { width: 390, height: 844 }, locale: 'pt-PT' })).newPage();
        const erros = [];
        a.on('pageerror', (e) => erros.push(e.message));
        await a.goto(s.url());
        await a.waitForFunction(() => localStorage.getItem('compras:chave'));
        // concreto: junta logo, com o tipo e o mais barato de cada loja, e avisa
        await a.fill('[data-onda="junta"]', 'bifes de frango');
        await a.waitForSelector('#sug .chip:has-text("Frango")');
        await a.click('[data-onda="juntar:0"]');
        await a.waitForSelector('#aviso .toast:has-text("Juntei Frango")');
        assert.equal(await a.locator('#folha .cartao').count(), 0);
        await a.waitForFunction(() => !localStorage.getItem('compras:pend') && !localStorage.getItem('compras:envio'));
        const it = JSON.parse(s.env.DB.linhas('SELECT itens FROM casa')[0].itens)[0];
        assert.equal(it.e.k, 'frango');
        assert.equal(it.p.continente.id, 'b1');
        assert.equal(it.p.pingodoce.id, 'p1');
        // tocar abre a escolha do tipo, com o corte escolhido (os filtros guardados na coisa), e o Continente continua lá
        assert.equal(JSON.parse(s.env.DB.linhas('SELECT itens FROM casa')[0].itens)[0].e.f.fw, 'bife'); // (a palavra do tipo, «frango», sai do filtro)
        await a.click('.item .texto');
        await a.waitForSelector('#folha .escolha h2:has-text("Frango")');
        const cont = (await a.locator('#folha .melhores > li').allTextContents()).find((t) => /Continente/.test(t)) ?? '';
        assert.match(cont, /Bifes de Frango/);
        assert.doesNotMatch(cont, /Nada assim/);
        await a.click('#folha .fechar');
        await a.waitForSelector('#folha .cartao', { state: 'detached' });
        // geral: abre a escolha (não junta)
        await a.fill('[data-onda="junta"]', 'frango');
        await a.waitForTimeout(600);
        await a.click('[data-onda="juntar:0"]');
        await a.waitForSelector('#folha .escolha h2:has-text("Frango")');
        assert.equal(await a.locator('.item').count(), 1);
        await a.click('#folha .fechar');
        // deslizar para a esquerda tira da lista
        await a.evaluate(() => {
            const li = document.querySelector('.item');
            const toque = (tipo, x) => { const t = new Touch({ identifier: 2, target: li, clientX: x, clientY: 300 });
                li.dispatchEvent(new TouchEvent(tipo, { touches: tipo === 'touchend' ? [] : [t], changedTouches: [t], bubbles: true, cancelable: true })); };
            toque('touchstart', 300); toque('touchmove', 280); toque('touchmove', 150); toque('touchend', 150);
        });
        await a.waitForFunction(() => document.querySelectorAll('.item').length === 0);
        assert.deepEqual(erros, []);
    } finally { await br.close(); await s.fechar(); }
});
