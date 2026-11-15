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
        const linhas = () => a.locator('#folha .melhores li:not(.est)').evaluateAll((l) => l.map((x) => [x.className, x.querySelector('b').textContent, x.querySelector('.total').textContent, x.querySelector('small').textContent]));

        // a árvore: com o campo vazio, «Ver por secções» → Bebidas › → os tipos dela → a escolha
        await a.click('#sug [data-onda="vsecs:1"]');
        assert.equal(await a.locator('#sug .sec-c').count(), 12);
        await a.click('#sug .sec-c:has-text("Bebidas")');
        await a.waitForSelector('#sug .chip:has-text("Água sem gás")');
        assert.equal(await a.textContent('#sug .sec-n'), 'Bebidas');
        await a.click('#sug .chip:has-text("Água sem gás")');
        await a.waitForSelector('#folha .escolha h2:has-text("Água sem gás")');
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
        // em grande o preço por litro (o que pesa com embalagens diferentes); por baixo a embalagem e quanto mais caro fica
        assert.deepEqual(await linhas(), [
            ['', 'Continente', '0,28 €/l', 'Pagas 1,99 € por 7 L · +75% por litro · Água sem Gás Garrafão Luso'],
            ['melhor', 'Pingo Doce 🏷', '0,16 €/l', 'Pagas 0,96 € por 6 L · o mais barato por litro · Água sem Gás Garrafão'],
            ['melhor', 'Auchan 🏷', '0,16 €/l', 'Pagas 0,96 € por 6 L · o mais barato por litro · ÁGUA AUCHAN DA NASCENTE GARRAFÃO 6L'],
        ]);
        // 6 L: o Continente não tem
        await a.click('#folha .chip >> text="6 L"');
        assert.deepEqual((await linhas()).map((l) => l[2]), ['—', '0,16 €/l', '0,16 €/l']);
        // a Mercadona e o SPAR: a estimativa desse tamanho, com o porquê (sem loja online; não usamos preços de Espanha)
        const est = await a.locator('#folha .melhores li.est').evaluateAll((l) => l.map((x) => [x.querySelector('b').textContent, x.querySelector('.total').textContent, x.querySelector('small').textContent]));
        // na mesma unidade das outras (por litro), com o que se pagaria por esse tamanho e a base
        assert.deepEqual(est.map((e) => e.slice(0, 2)), [['Mercadona ≈', '≈ 0,16 €/l'], ['SPAR ≈', '≈ 0,36 €/l']]);
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
        await a.waitForSelector('.toast:has-text("Talão do pingo doce: 2,83 € · 2 linhas")');
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

        // onde moras e as tuas lojas: Portimão, só Pingo Doce, Auchan e SPAR (a loja de Portimão)
        await a.click('#abas button >> nth=2');
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
        const linhas = await a.locator('#folha .melhores li:not(.est)').evaluateAll((l) => l.map((x) => x.querySelector('small').textContent));
        assert.match(linhas[0], /Carapau Médio Fresco/);
        // o que distingue cada produto: os sinais do nome (fresco) e a marca
        assert.match(await a.locator('#folha .melhores li >> nth=0 >> .sinais').textContent(), /✚ fresco/);
        assert.match(linhas[2], /CARAPAU MEDIO/);
        // outras opções no Continente: os dois carapaus; escolher o pequeno fica à mão («escolhido por ti»)
        await a.click('#folha [data-onda="opc:0"]');
        assert.equal(await a.locator('#folha .opcoes .op').count(), 3);
        // na peixaria, arrumadas por corte (os filetes), e os sem corte em «Outros»
        assert.deepEqual(await a.locator('#folha .opcoes .op-t').allTextContents(), ['filetes', 'Outros']);
        await a.click('#folha .opcoes .op:has-text("Carapau Pequeno")');
        // a lista fica aberta, com a escolhida marcada, e um aviso diz o que ficou; dá para voltar ao mais barato
        assert.match(await a.textContent('#folha .opcoes .op.on'), /Carapau Pequeno/);
        await a.waitForSelector('.toast:has-text("No Continente: Carapau Pequeno Fresco")');
        await a.click('#folha .opcoes .op-x');
        assert.match(await a.textContent('#folha .opcoes .op.on'), /Carapau Médio/);
        await a.click('#folha .opcoes .op:has-text("Carapau Pequeno")');
        await a.click('#folha [data-onda="opc:0"]');
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
