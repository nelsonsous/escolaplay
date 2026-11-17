// O talão do SPAR (17/11/2026): o modelo devolveu «Qtd Total: 3.00» como linha, juntou duas linhas numa e leu «6lt»
// como «61t». Os totais saem, a linha junta não sugere nada, o «61t» é «6 lt», e as sugestões tiram-se com o ✕.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { arrumar, limpaLinha } from '../proxy/src/talao.js';
import { costume } from '../proxy/src/costume.js';

const LIDO = { loja: 'SPAR Santo Tirso', dia: '2026-11-17', total: 3.84, linhas: [
    { t: 'Agua SPAR Nascente 61t', q: 1, preco: 0.86 }, { t: 'Mini Pizza York Cheddar un', q: 1, preco: 1.99 },
    { t: 'Pao C/ Chourico un', q: 1, preco: 0.99 }, { t: 'Mini pizza cheddar un pao c/ chouriço 1un', q: 1, preco: 2.98 }, { t: 'Qtd Total: 3.00', q: 1, preco: 3 }] };

test('o talão: a loja SPAR, os totais fora e o «61t» é «6 lt»', () => {
    const t = arrumar(LIDO);
    assert.equal(t.loja, 'spar');
    assert.deepEqual(t.linhas.map((l) => l.t), ['Agua SPAR Nascente 6 lt', 'Mini Pizza York Cheddar un', 'Pao C/ Chourico un', 'Mini pizza cheddar un pao c/ chouriço 1un']);
    assert.equal(limpaLinha('Leite 1lt'), 'Leite 1 lt');
});

test('costumas comprar: sem os totais, sem a linha que junta duas, e sem as esquecidas', () => {
    const tl = [{ dia: '2026-11-17', linhas: LIDO.linhas.map((l) => ({ t: l.t, cent: Math.round(l.preco * 100) })) }];
    const agora = new Date('2026-11-17T15:00:00Z');
    const ts = costume(tl, [], agora).map((x) => x.t);
    assert.deepEqual(ts, ['Agua spar nascente 6 lt', 'Mini pizza york cheddar un', 'Pao c/ chourico un']);
    assert.ok(!ts.some((t) => /qtd/i.test(t)));
    assert.ok(!ts.some((t) => /pizza.*chouri/i.test(t)));
    const k = costume(tl, [], agora).find((x) => /agua/i.test(x.t)).k;
    assert.ok(!costume(tl, [], agora, new Set([k])).some((x) => /agua/i.test(x.t)));
});
