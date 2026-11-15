// A escolha que se mantém (volta 6): a coisa guarda o que é (tipo, tamanho, marca), o conector troca o produto quando
// outro fica mais barato (menos o escolhido à mão) e a Mercadona tem uma estimativa (a marca branca equivalente).
import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import worker from '../proxy/src/worker.js';
import { lerCategoria, guardarCatalogo } from '../proxy/src/catalogo.js';
import { atualizarEscolhas } from '../proxy/src/escolhas.js';
import { kv } from './kv.mjs';
import { d1 } from './d1.mjs';
import { instalar, desinstalar } from './cadeias.mjs';

let env, chave;
const pagina = (c) => lerCategoria(c, readFileSync(new URL(`./fontes/${c}-categoria-agua.html`, import.meta.url), 'utf8'));
beforeEach(async () => {
    instalar();
    env = { KV: kv(), DB: d1(), ALLOWED_ORIGINS: '' };
    for (const c of ['continente', 'pingodoce', 'auchan']) await guardarCatalogo(env.DB, c, 'agua-sem-gas', pagina(c));
    ({ chave } = await (await worker.fetch(new Request('https://x/api/aparelho', { method: 'POST' }), env)).json());
});
after(desinstalar);
const ops = async (l) => (await worker.fetch(new Request('https://x/api/lista', { method: 'POST', headers: { authorization: 'Bearer ' + chave }, body: JSON.stringify({ ops: l }) }), env)).json();
const lista = async () => (await worker.fetch(new Request('https://x/api/lista', { headers: { authorization: 'Bearer ' + chave } }), env)).json();
const PD = (id, nome = 'x') => ({ id, nome, url: `https://www.pingodoce.pt/home/produtos/aguas-sumos-e-refrigerantes/aguas/aguas-sem-gas/p-${id}.html` });

test('a coisa guarda o que é, e a lista traz a estimativa da Mercadona (a mediana da marca branca do mesmo tamanho)', async () => {
    const l = await ops([{ o: 'j', id: 'agua', t: 'Água sem gás 6 L', q: 2, e: { k: 'agua-sem-gas', emb: '6 L' } }, { o: 'p', id: 'agua', c: 'pingodoce', a: 1, p: PD('868788') }]);
    assert.deepEqual(l.itens[0].e, { k: 'agua-sem-gas', emb: '6 L' });
    assert.equal(l.itens[0].est, 96); // Pingo Doce 0,96 e Auchan 0,96 (as marcas brancas de 6 L)
    // sem tamanho, sem estimativa; um «e» inválido não entra
    const m = await ops([{ o: 'j', id: 'agu2', t: 'água', e: { k: 'agua-sem-gas' } }, { o: 'j', id: 'agu3', t: 'água', e: { k: 'Água!' } }]);
    assert.equal(m.itens[1].est, undefined);
    assert.equal(m.itens[2].e, undefined);
});

test('uma vez por hora o conector troca o produto pelo que ficou mais barato; o escolhido à mão fica', async () => {
    await ops([{ o: 'j', id: 'agua', t: 'Água sem gás Luso', e: { k: 'agua-sem-gas', m: 'Luso' } }, { o: 'p', id: 'agua', c: 'pingodoce', a: 1, p: PD('747773') },
        { o: 'j', id: 'mao1', t: 'Água à mão', e: { k: 'agua-sem-gas', m: 'Luso' } }, { o: 'p', id: 'mao1', c: 'pingodoce', p: PD('691908') }]);
    let r = await atualizarEscolhas(env.DB);
    // a primeira ganha o Luso mais barato por litro em cada cadeia; a segunda (escolhida à mão) fica como está
    assert.deepEqual(r, { listas: 1, mudaram: 2 });
    let l = await lista();
    assert.deepEqual(Object.fromEntries(Object.entries(l.itens[0].p).map(([c, p]) => [c, p.id])), { pingodoce: '747773', continente: '5096262', auchan: l.itens[0].p.auchan.id });
    assert.equal(l.itens[1].e.mao, 1);
    assert.deepEqual(Object.keys(l.itens[1].p), ['pingodoce']);
    // o Luso de 7 L do Continente sobe de preço: passa a ser outro
    env.DB.sql.exec("UPDATE preco SET cent = 900, uc = 129 WHERE cadeia = 'continente' AND id = '5096262'");
    r = await atualizarEscolhas(env.DB);
    assert.equal(r.mudaram, 1);
    l = await lista();
    assert.notEqual(l.itens[0].p.continente.id, '5096262');
    // sem mudanças, não grava
    const v = l.versao;
    assert.deepEqual(await atualizarEscolhas(env.DB), { listas: 1, mudaram: 0 });
    assert.equal((await lista()).versao, v);
});

test('o cron revê as escolhas ao minuto 30', async () => {
    await ops([{ o: 'j', id: 'agua', t: 'Água', e: { k: 'agua-sem-gas', emb: '6 L', m: 'branca' } }]);
    const espera = [];
    await worker.scheduled({ scheduledTime: Date.parse('2026-11-15T10:30:00Z') }, env, { waitUntil: (p) => espera.push(p) });
    await Promise.all(espera);
    const l = await lista();
    assert.deepEqual(Object.keys(l.itens[0].p).sort(), ['auchan', 'pingodoce']); // o Continente não tem 6 L de marca branca aqui
});
