// As fontes das cadeias, com excertos reais das páginas (recolhidos pela sonda do conector a 14/11/2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FONTES } from '../proxy/src/fontes/index.js';
import { numero, precoUnidade, ean, dataCurta, entidades, texto, produto } from '../proxy/src/fontes/comum.js';

const fixture = (f) => readFileSync(new URL(`./fontes/${f}`, import.meta.url), 'utf8');
const HOJE = new Date('2026-11-14T12:00:00Z');

test('Continente: nome, marca, código de barras, preço, PVPR, validade, preço por litro e embalagem', () => {
    assert.deepEqual(FONTES.continente.lerProduto(fixture('continente-leite-mimosa.html')), produto({
        cadeia: 'continente', id: '4421406', url: 'https://www.continente.pt/produto/leite-uht-meio-gordo-mimosa-4421406.html',
        nome: 'Leite UHT Meio Gordo Mimosa', marca: 'Mimosa', ean: '5601049132988', preco: 5.4, pvpr: 6, ate: '2026-11-16',
        precoUnidade: { valor: 0.9, unidade: 'l' }, embalagem: '6 x 1 lt', disponivel: true,
    }));
});

test('Pingo Doce: página de produto (sem código de barras: o sku é o número da cadeia)', () => {
    const url = 'https://www.pingodoce.pt/home/produtos/mercearia/arroz-massa-e-leguminosas/massa/massa-esparguete-nacional-10756.html';
    assert.deepEqual(FONTES.pingodoce.lerProduto(fixture('pingodoce-esparguete.html'), url, { hoje: HOJE }), produto({
        cadeia: 'pingodoce', id: '10756', url, nome: 'Massa Esparguete', marca: 'Nacional', preco: 1.26,
        precoUnidade: { valor: 2.52, unidade: 'kg' }, embalagem: '0.5 Kg',
    }));
});

test('Pingo Doce: cartão em promoção — preço riscado e «Promoção até 16/11»', () => {
    assert.deepEqual(FONTES.pingodoce.lerProduto(fixture('pingodoce-cartao-promocao.html'), null, { hoje: HOJE }), produto({
        cadeia: 'pingodoce', id: '879922',
        url: 'https://www.pingodoce.pt/home/produtos/charcutaria-e-queijos/queijos/queijo-fatiado-e-bola%E2%80%8B/queijo-flamengo-fatiado-terra-nostra-879922.html',
        nome: 'Queijo Flamengo Fatiado', marca: 'Terra Nostra', preco: 4.29, antes: 5.09, ate: '2026-11-16',
        precoUnidade: { valor: 10.73, unidade: 'kg' }, embalagem: '0.4 Kg',
    }));
});

test('Auchan: o JSON do produto, com código de barras e preço por kg', () => {
    assert.deepEqual(FONTES.auchan.lerProduto(fixture('auchan-arroz-oriente.json')), produto({
        cadeia: 'auchan', id: '3350',
        url: 'https://www.auchan.pt/pt/alimentacao/mercearia/arroz-e-massa/arroz/arroz-agulha-oriente-extra-longo-1kg/3350.html',
        nome: 'ARROZ AGULHA ORIENTE EXTRA LONGO 1KG', marca: 'ORIENTE', ean: '5601228228013', preco: 1.55,
        precoUnidade: { valor: 1.55, unidade: 'kg' }, disponivel: false,
    }));
    assert.equal(FONTES.auchan.urlProduto('3350'),
        'https://www.auchan.pt/on/demandware.store/Sites-AuchanPT-Site/pt_PT/Product-Variation?pid=3350&quantity=1');
});

test('Auchan: numa promoção, o preço riscado é o da lista e a validade vem com ele', () => {
    const d = JSON.parse(fixture('auchan-arroz-oriente.json'));
    d.product.price = { sales: { value: 1.19, validUntil: '2026-11-20' }, list: { value: 1.55 }, isPromotion: true };
    const p = FONTES.auchan.lerProduto(d);
    assert.equal(p.preco, 1.19);
    assert.equal(p.antes, 1.55);
    assert.equal(p.ate, '2026-11-20');
});

test('Lidl: o preço e o dia vêm na descrição da página', () => {
    assert.deepEqual(FONTES.lidl.lerProduto(fixture('lidl-iogurte-grego.html')), produto({
        cadeia: 'lidl', id: '11041532', url: 'https://www.lidl.pt/p/milbona-iogurte-grego/p11041532',
        nome: 'Iogurte Grego', marca: 'MILBONA', preco: 1.29, data: '2026-11-14', disponivel: false,
    }));
});

test('Lidl: a embalagem e o preço por litro ou quilo vêm no rodapé do preço («Emb. 5 L», «1 L = 1,16», «Vendido ao kg»)', () => {
    const v = FONTES.lidl.lerProduto(fixture('lidl-vinho-5l.html'));
    assert.deepEqual([v.nome, v.marca, v.preco, v.embalagem, v.precoUnidade], ['Vinho Tinto', 'AMIGOS DE PIAS', 5.79, '5 L', { valor: 1.16, unidade: 'l' }]);
    const f = FONTES.lidl.lerProduto(fixture('lidl-frango-ao-kg.html'));
    assert.deepEqual([f.preco, f.embalagem, f.precoUnidade], [2.39, '1 kg', { valor: 2.39, unidade: 'kg' }]);
});

test('Lidl no catálogo: o tipo pelo nome, só com as palavras do tipo, e o que não é de supermercado fica de fora', async () => {
    const { classificador, FORA } = await import('../economo/lidl.mjs');
    const base = [['Leite UHT Meio Gordo Mimosa', 'leite'], ['Leite Meio-gordo Continente', 'leite'], ['Vinho Tinto Douro', 'vinho-tinto'], ['Vinho Branco Alentejo', 'vinho-branco'],
        ['Vinho Tinto Alentejo Reserva', 'vinho-tinto'], ['Iogurte Grego Natural', 'iogurtes'], ['Iogurte Kiwi', 'iogurtes'], ['Sal Marinho', 'sal'], ['Salmão Fumado', 'salmao-fumado']]
        .map(([nome, tipo]) => ({ nome, tipo }));
    const t = classificador(base);
    assert.equal(t('mimosa leite meio gordo sem lactose'), 'leite');
    assert.equal(t('amigos de pias vinho tinto'), 'vinho-tinto');
    assert.equal(t('kiwi amarelo nacional'), null); // sem «iogurte» no nome, não é iogurte
    assert.equal(t('ocean sea salmao fumado'), 'salmao-fumado'); // o «sal» não apanha o salmão
    assert.ok(FORA.test('parkside-conjunto-de-brocas') && FORA.test('max-mila-s-world-pate-para-cao') && FORA.test('deluxe-rissois-de-sapateira-para-forno'));
    assert.ok(!FORA.test('mimosa-leite-meio-gordo'));
    // quando o classificador não decide, os sinónimos (palavras inteiras): a fruta, o marisco, a massa…
    const { SINONIMOS } = await import('../economo/lidl.mjs');
    const sin = (slug) => SINONIMOS.find(([re]) => re.test(slug))?.[1] ?? null;
    assert.equal(sin('clementina-nacional'), 'fruta-epoca');
    assert.equal(sin('camarao-cozido-30-40'), 'marisco');
    assert.equal(sin('combino-lacos'), 'massa');
    assert.equal(sin('ocean-sea-pescada-do-chile-a-posta'), 'peixe-congelado');
    assert.equal(sin('sondey-bolacha-maria-dourada'), 'peixe-fresco'); // por isso só depois do classificador (que a dá às bolachas)
    assert.equal(sin('garnier-ultra-suave-champo-abacate'), null);
});

test('uma página que não é de produto não dá produto (e não rebenta)', () => {
    for (const [nome, f] of Object.entries(FONTES)) {
        for (const lixo of ['', '<html><body>Erro 403</body></html>', '{"erro":true}', '<script type="application/ld+json">{nada</script>']) {
            assert.equal(f.lerProduto(lixo), null, `${nome}: ${lixo}`);
        }
    }
});

test('números, preços por unidade e entidades à portuguesa', () => {
    assert.equal(numero('1,26 €'), 1.26);
    assert.equal(numero('5.40'), 5.4);
    assert.equal(numero(''), null);
    assert.deepEqual(precoUnidade('0,90&euro;/lt'), { valor: 0.9, unidade: 'l' });
    assert.deepEqual(precoUnidade('2,52 €/Kg'), { valor: 2.52, unidade: 'kg' });
    assert.deepEqual(precoUnidade('1.55 €/Kg'), { valor: 1.55, unidade: 'kg' });
    assert.deepEqual(precoUnidade('0,15 € / un.'), { valor: 0.15, unidade: 'un' });
    assert.equal(precoUnidade('1,26 €'), null);
    assert.equal(entidades('gr&aacute;tis &#8364; &#x20AC;'), 'grátis € €');
    assert.equal(texto(' <b>Promo&ccedil;&atilde;o</b>\n até 16/11 '), 'Promoção até 16/11');
});

test('o código de barras só conta com o dígito de controlo certo', () => {
    assert.equal(ean('5601049132988'), '5601049132988');
    assert.equal(ean('5601228228013'), '5601228228013');
    assert.equal(ean('5601049132989'), null); // um dígito trocado
    assert.equal(ean('10756'), null); // número interno do Pingo Doce
    assert.equal(ean(null), null);
});

test('«até 16/11» é deste ano; «até 05/01» lido em dezembro é do ano seguinte', () => {
    assert.equal(dataCurta('Promoção até 16/11', HOJE), '2026-11-16');
    assert.equal(dataCurta('Promoção até 05/01', new Date('2026-12-20T10:00:00Z')), '2027-01-05');
    assert.equal(dataCurta('até 02/11', HOJE), '2026-11-02'); // acabada há pouco: continua deste ano
    assert.equal(dataCurta('sem data'), null);
});

test('o folheto do Lidl: os folhetos de promoções da página, a promoção lida em linha da tabela e o fim da promoção', async () => {
    const { folhetosDaPagina, DE_PROMOCOES, linhaDaPromocao, idPromocao } = await import('../economo/lidl-folheto.mjs');
    const html = '<a href="https://www.lidl.pt/l/pt/folhetos/promocoes-semanais-a-partir-de-16-11/ar/0"></a><a href="/l/pt/folhetos/folheto-especial-natal/ar/0">'
        + '<a href="https://www.lidl.pt/l/pt/folhetos/promocoes-semanais-a-partir-de-16-11/view/flyer/page/3">';
    assert.deepEqual(folhetosDaPagina(html).filter((id) => DE_PROMOCOES.test(id)), ['promocoes-semanais-a-partir-de-16-11']);
    const p = { folheto: 'promocoes-semanais-a-partir-de-16-11', pagina: 2, nome: 'Uva Branca sem Grainha Selecionada', preco: 2.19, antes: 2.79,
        emb: '500 g', uc: 4.38, ub: 'kg', plus: true, numero: 'nº80533', ate: '2026-11-22' };
    assert.equal(idPromocao(p), 'f80533p'); // com Lidl Plus
    const l = linhaDaPromocao(p, 'fruta-epoca', '2026-11-15T22:00:00Z');
    assert.deepEqual([l.id, l.nome, l.cent, l.antes, l.uc, l.ub, l.ate], ['f80533p', 'Uva Branca sem Grainha Selecionada (Lidl Plus)', 219, 279, 438, 'kg', '2026-11-22']);
    assert.match(l.url, /folhetos\/promocoes-semanais-a-partir-de-16-11\/view\/flyer\/page\/2$/);
    // vendido ao quilo, sem preço riscado
    const k = linhaDaPromocao({ folheto: 'x', nome: 'Clementina Nacional', preco: 1.49, emb: '1 kg', uc: 1.49, ub: 'kg', ate: '2026-11-22' }, 'fruta-epoca', 'agora');
    assert.deepEqual([k.cent, k.uc, k.antes], [149, 149, null]);
    // acabada a promoção, sai da folha do tipo
    const { d1 } = await import('./d1.mjs');
    const { produtosDoTipo, esquecerTipos } = await import('../proxy/src/sugerir.js');
    const db = d1();
    db.sql.exec(`INSERT INTO tipo (k, nome, n, casa) VALUES ('fruta-epoca', 'Fruta da época', 1, 1);`);
    db.sql.prepare(`INSERT INTO preco (cadeia, id, url, nome, cent, uc, ub, emb, tipo, ate, visto, falhas) VALUES ('lidl', 'f80533', 'u', 'Uva', 219, 438, 'kg', '500 g', 'fruta-epoca', '2026-11-22', ?, 0)`).run(new Date('2026-11-16T10:00:00Z').toISOString());
    esquecerTipos();
    assert.equal((await produtosDoTipo(db, 'fruta-epoca', new Date('2026-11-20T10:00:00Z'))).produtos.length, 1);
    assert.equal((await produtosDoTipo(db, 'fruta-epoca', new Date('2026-11-23T10:00:00Z'))).produtos.length, 0);
});
