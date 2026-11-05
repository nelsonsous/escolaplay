// node --test mercados/tests
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('../analise.js');

const walk = (n, drift, start = 100, seed = 7) => {
    let x = start, s = seed; const out = [];
    for (let i = 0; i < n; i++) { s = (s * 16807) % 2147483647; const noise = (s / 2147483647 - 0.5) * 0.02; x *= 1 + drift + noise; out.push(x); }
    return out;
};

test('RSI fica entre 0 e 100 e reage à direção', () => {
    assert.ok(A.rsi(walk(100, 0.01)) > 70);
    assert.ok(A.rsi(walk(100, -0.01)) < 30);
    assert.equal(A.rsi([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]), 50);
    assert.equal(A.rsi([1, 2, 3]), null);
});

test('SMA e EMA', () => {
    assert.equal(A.sma([1, 2, 3, 4], 2), 3.5);
    assert.equal(A.sma([1], 2), null);
    const e = A.emaSeries([1, 2, 3, 4, 5], 3);
    assert.equal(e.length, 3);
    assert.equal(e[0], 2);
});

test('tendência de subida dá pontuação alta; descida dá baixa', () => {
    const up = A.analyse(walk(250, 0.004));
    const down = A.analyse(walk(250, -0.004));
    assert.ok(up.score >= 58, 'subida ' + up.score);
    assert.ok(down.score <= 42, 'descida ' + down.score);
    assert.equal(up.tone, 'up');
    assert.equal(down.tone, 'down');
    assert.ok(up.reasons.length >= 5);
    assert.ok(up.score <= 100 && down.score >= 0);
});

test('sobrecomprado extremo perde pontos face a subida moderada', () => {
    const steady = A.analyse(walk(250, 0.002));
    assert.ok(steady.reasons.some((r) => /RSI/.test(r.txt)));
    const parabolic = A.analyse([...walk(200, 0.001), ...walk(50, 0.03, 120)]);
    assert.ok(parabolic.reasons.some((r) => /esticado|sobrecomprado/.test(r.txt)));
});

test('poucos dados não dão análise', () => {
    assert.equal(A.analyse([1, 2, 3]), null);
    assert.equal(A.analyse(null), null);
});

test('risco pela volatilidade', () => {
    assert.equal(A.riskOf(0.1).key, 'low');
    assert.equal(A.riskOf(0.9).key, 'xhigh');
});

test('tom das notícias (PT e EN)', () => {
    assert.equal(A.sentiment('Ações da Galp disparam após lucros recorde').tone, 'up');
    assert.equal(A.sentiment('Tesla shares plunge after earnings miss').tone, 'down');
    assert.equal(A.sentiment('BCP cai 6% com investigação da CMVM').tone, 'down');
    assert.equal(A.sentiment('Caixa Geral apresenta resultados').tone, 'flat'); // "cai" não apanha "Caixa"
    assert.equal(A.sentiment('Nvidia beats estimates and raises guidance').tone, 'up');
    assert.ok(A.newsTone([{ title: 'Apple sobe' }, { title: 'Apple surges' }]) > 0);
    assert.equal(A.newsTone([]), null);
});

test('sentimento geral do mercado', () => {
    const up = A.analyse(walk(250, 0.003));
    const m = A.marketMood({ spx: up, stoxx: up, btc: up, vix: 13, breadth: 0.7 });
    assert.equal(m.tone, 'up');
    const down = A.analyse(walk(250, -0.003));
    assert.equal(A.marketMood({ spx: down, stoxx: down, vix: 32, breadth: 0.1 }).tone, 'down');
    assert.equal(A.marketMood({}), null);
});

test('USD/galão → €/litro', () => {
    // 2,50 USD/gal com EUR/USD 1,10 ≈ 0,600 €/L
    assert.ok(Math.abs(A.usdGalToEurL(2.5, 1.1) - 0.6004) < 0.001);
    assert.equal(A.usdGalToEurL(2.5, null), null);
});

test('três prazos: curto, médio e longo', () => {
    const up = A.analyse(walk(300, 0.003));
    assert.ok(up.horizons.short && up.horizons.mid && up.horizons.long);
    assert.equal(up.horizons.mid.score, up.score, 'médio = pontuação geral');
    assert.ok(up.horizons.long.score >= 70, 'subida longa: favorável');
    const down = A.analyse(walk(300, -0.003));
    assert.ok(down.horizons.long.score <= 30, 'descida longa: desfavorável');
    // queda de um mês dentro de uma subida longa: médio fraco, longo positivo com desconto
    const base = walk(270, 0.003);
    const dip = A.analyse(base.concat(walk(30, -0.008, base[base.length - 1], 9)));
    assert.ok(dip.horizons.mid.score < 42, 'médio prazo fraco');
    assert.ok(dip.horizons.long.score >= 58, 'longo prazo positivo: ' + dip.horizons.long.score);
    assert.ok(dip.horizons.long.reasons.some((r) => /desconto/.test(r.txt)));
    // pouco histórico: sem longo prazo
    assert.equal(A.analyse(walk(80, 0.002)).horizons.long, null);
});

test('desconto: oportunidade, sem desconto e barato mas a cair', () => {
    const top = A.analyse(walk(300, 0.003)).discount;
    assert.equal(top.level, 'none');
    assert.equal(top.opp, false);
    const base = walk(270, 0.003);
    const dip = A.analyse(base.concat(walk(30, -0.008, base[base.length - 1], 9))).discount;
    assert.ok(dip.dd < -0.15, 'queda de ' + dip.dd);
    assert.equal(dip.opp, true);
    assert.match(dip.tag, /^Oportunidade/);
    assert.ok(dip.pos >= 0 && dip.pos <= 1);
    const falling = A.analyse(walk(300, -0.004)).discount;
    assert.equal(falling.opp, false);
    assert.equal(falling.tag, 'Barato, mas a cair');
    assert.ok(dip.score > falling.score && dip.score > top.score, 'a oportunidade fica à frente');
});

test('desconto em queda livre a médio prazo: oportunidade com cautela', () => {
    const base = walk(270, 0.004);
    const crash = A.analyse(base.concat(walk(30, -0.012, base[base.length - 1], 11)));
    assert.ok(crash.horizons.mid.score < 25);
    if (crash.discount.opp) assert.equal(crash.discount.tag, 'Oportunidade (com cautela)');
});
