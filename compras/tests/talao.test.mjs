// Os talões (volta 6): a IA lê a fotografia (aqui a fingir), o talão guarda-se na casa e o que vem nele risca-se.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../proxy/src/worker.js';
import { arrumar, lerResposta, noTalao, MODELO } from '../proxy/src/talao.js';
import { kv } from './kv.mjs';
import { d1 } from './d1.mjs';

const IMG = 'data:image/jpeg;base64,' + Buffer.from('fotografia').toString('base64');
export const RESPOSTA = { response: 'Aqui está:\n{"loja": "CONTINENTE MODELO", "dia": "2026-11-15", "total": 7.43, "linhas": [{"t": "LEITE UHT M/GORDO MIMOSA", "q": 6, "preco": 5.70}, {"t": "OVOS CLASSE M 12UN", "q": 1, "preco": 2.19}, {"t": "DESC. CARTAO", "q": 1, "preco": -0.46}, {"t": "", "preco": 1}]}' };

test('arrumar o que a IA leu: a cadeia, o dia, o total e as linhas em cêntimos', () => {
    const t = arrumar(lerResposta(RESPOSTA));
    assert.deepEqual(t, { loja: 'continente', dia: '2026-11-15', total: 743, doc: null, linhas: [
        { t: 'LEITE UHT M/GORDO MIMOSA', q: 6, cent: 570 }, { t: 'OVOS CLASSE M 12UN', q: 1, cent: 219 }, { t: 'DESC. CARTAO', q: 1, cent: -46 }] });
    assert.equal(lerResposta({ response: 'nada' }), null);
    assert.deepEqual(arrumar(null), { loja: null, dia: null, total: null, doc: null, linhas: [] });
});

test('o que se risca: as palavras da coisa estão numa linha do talão', () => {
    const itens = [{ id: 'a', t: 'leite', f: 0 }, { id: 'b', t: 'ovos', f: 0 }, { id: 'c', t: 'pão de forma', f: 0 }, { id: 'd', t: 'leite', f: 1 }];
    assert.deepEqual(noTalao(itens, arrumar(lerResposta(RESPOSTA)).linhas), ['a', 'b']);
    // as abreviaturas e as coisas da escolha (o tipo conta, não a marca branca)
    const agua = [{ id: 'e', t: 'Água sem gás marca branca', f: 0, e: { k: 'agua-sem-gas', m: 'branca' } }, { id: 'g', t: 'Água com gás', f: 0, e: { k: 'agua-com-gas' } }];
    assert.deepEqual(noTalao(agua, [{ t: 'AGUA S/GAS GARRAFAO 6L' }]), ['e']);
});

test('POST /api/talao: lê, guarda na casa e risca na lista', async () => {
    const pedidos = [];
    const env = { KV: kv(), DB: d1(), AI: { run: async (m, o) => { pedidos.push([m, o]); return RESPOSTA; } } };
    const { chave } = await (await worker.fetch(new Request('https://x/api/aparelho', { method: 'POST' }), env)).json();
    const api = (c, corpo) => worker.fetch(new Request('https://x' + c, { method: corpo ? 'POST' : 'GET', headers: { authorization: 'Bearer ' + chave }, body: corpo ? JSON.stringify(corpo) : undefined }), env);
    await api('/api/lista', { ops: [{ o: 'j', id: 'leit', t: 'leite' }, { o: 'j', id: 'ovos', t: 'ovos' }, { o: 'j', id: 'paof', t: 'pão de forma' }] });
    const r = await (await api('/api/talao', { imagem: IMG })).json();
    assert.equal(r.loja, 'continente');
    assert.equal(r.total, 743);
    assert.equal(r.riscadas, 2);
    assert.equal(pedidos[0][0], MODELO);
    assert.equal(pedidos[0][1].messages[0].content[1].image_url.url, IMG);
    const l = await (await api('/api/lista')).json();
    assert.deepEqual(l.itens.map((i) => [i.t, i.f]), [['leite', 1], ['ovos', 1], ['pão de forma', 0]]);
    assert.equal(env.DB.linhas('SELECT count(*) n FROM talao')[0].n, 1);
    assert.ok(!JSON.stringify(env.DB.linhas('SELECT * FROM talao')).includes('fotografia'));
    // sem imagem, imagem grande, sem IA, ou nada lido
    assert.equal((await api('/api/talao', { imagem: 'olá' })).status, 400);
    assert.equal((await api('/api/talao', { imagem: 'data:image/jpeg;base64,' + 'A'.repeat(1_600_000) })).status, 413);
    env.AI.run = async () => ({ response: '{"linhas": []}' });
    assert.equal((await api('/api/talao', { imagem: IMG })).status, 422);
    delete env.AI;
    assert.equal((await api('/api/talao', { imagem: IMG })).status, 503);
});
