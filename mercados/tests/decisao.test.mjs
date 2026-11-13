// node --test mercados/tests/decisao.test.mjs
// A decisão consolidada (AnaliseOnda.decisoes, de mercados/onda/decisao.onda): o que o Claude, os analistas, os
// fundamentos, a análise técnica, as notícias e o sentimento do mercado dizem de um ativo, numa só decisão. Aqui as regras estão escritas outra vez, em JS, a partir
// do que o cabeçalho do decisao.onda promete; a Onda tem de dar o mesmo em milhares de casos ao acaso (com valores
// que faltam, tipos errados e números nas fronteiras), em casos feitos à mão e nas propriedades que contam.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const O = require('../analise-onda.js');
await O.ready;
const CASOS = +process.env.CASOS || 20000;

// ---------- as regras, em JS ----------
const FAM = { buy: 1, scale: 1, hold: 0, wait: 0, neutral: 0, turn: 0, reduce: -1, sell: -1, avoid: -1 };
const NOTA = { strong_buy: 1.25, buy: 2, hold: 3, underperform: 4, sell: 4.5, strong_sell: 5 };
const e = Number.isFinite;
const obj = (x) => (x !== null && typeof x === 'object' && !Array.isArray(x) ? x : {});
const de = (t, k) => (typeof k === 'string' && Object.hasOwn(t, k) ? t[k] : null);
const c100 = (x) => Math.max(0, Math.min(100, x));
function prazos(x) {
    let a = 0, w = 0;
    if (e(x.short)) { a += 0.25 * c100(x.short); w += 0.25; }
    if (e(x.mid)) { a += 0.35 * c100(x.mid); w += 0.35; }
    if (e(x.long)) { a += 0.4 * c100(x.long); w += 0.4; }
    return w > 0 ? a / w : -1;
}
const reta = (x, x0, y0, x1, y1) => (x <= x0 ? y0 : x >= x1 ? y1 : y0 + (x - x0) * (y1 - y0) / (x1 - x0));
const tabela = (pts) => (x) => { for (let i = 1; i < pts.length; i++) if (x <= pts[i][0] || i === pts.length - 1) return reta(x, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]); };
const P_PE = tabela([[10, 85], [15, 70], [22, 50], [35, 30], [60, 15]]), P_CR = tabela([[-10, 25], [0, 45], [10, 62], [25, 80]]);
const P_MG = tabela([[0, 30], [10, 58], [25, 75]]), P_VIX = tabela([[12, 45], [20, 50], [28, 65], [35, 75]]);
const famP = (p) => (p >= 58 ? 1 : p <= 42 ? -1 : 0);
const fonte = (f, fam, key, p, w) => ({ f, p: Math.round(c100(p)), fam, w, ...(key === null ? {} : { key }) });
function decide(d0) {
    const d = obj(d0), fs = [];
    let manda = false;
    const cl = obj(d.cl), fc = de(FAM, cl.key);
    if (fc !== null) { const p = prazos(cl); fs.push(fonte('claude', fc, cl.key, p < 0 ? 50 + 20 * fc : p, cl.old ? 1.5 : 3)); manda = true; }
    const an = obj(d.an), nota = de(NOTA, an.key);
    if (nota !== null && e(an.n) && an.n > 0) {
        const f = nota <= 2 ? 1 : nota >= 4 ? -1 : 0, m = e(an.mean) ? Math.max(1, Math.min(5, an.mean)) : nota;
        let p = 100 - 25 * (m - 1);
        if (e(an.target) && e(an.price) && an.price > 0 && ((f > 0 && an.target < an.price) || (f < 0 && an.target > an.price))) p = 50 + (p - 50) / 2;
        fs.push(fonte('analistas', f, an.key, p, 2 * Math.min(1, an.n / 10)));
    }
    const fun = obj(d.fun);
    let soma = 0, quantos = 0;
    if (e(fun.pe) && fun.pe > 0) { soma += P_PE(fun.pe); quantos++; }
    if (e(fun.cr)) { soma += P_CR(fun.cr); quantos++; }
    if (e(fun.mg)) { soma += P_MG(fun.mg); quantos++; }
    if (quantos >= 2) { const p = Math.round(soma / quantos); fs.push(fonte('fundamentos', famP(p), null, p, 1)); }
    const tec = obj(d.tec), ft = de(FAM, tec.key), pt = prazos(tec);
    if (ft !== null && pt >= 0) fs.push(fonte('tecnica', ft, tec.key, pt, 1.5));
    if (e(d.news)) { const t = Math.max(-1, Math.min(1, d.news)); fs.push(fonte('noticias', t > 0.15 ? 1 : t < -0.15 ? -1 : 0, null, 50 + 50 * t, 0.75)); }
    const sent = obj(d.sent);
    let ps = -1;
    if (e(sent.fg)) ps = 50 + 0.6 * (50 - c100(sent.fg));
    if (ps < 0 && e(sent.vix) && sent.vix > 0) ps = P_VIX(sent.vix);
    if (ps >= 0) { ps = Math.round(ps); fs.push(fonte('sentimento', famP(ps), null, ps, 0.75)); }
    if (!fs.length) return null;
    let sw = 0, sp = 0;
    for (const x of fs) { sw += x.w; sp += x.w * x.p; }
    const p = Math.round(sp / sw), fam = manda ? fs[0].fam : famP(p);
    let wf = 0, wc = 0, favor = 0, contra = 0;
    for (const x of fs) {
        x.d = x.fam === fam ? 1 : fam !== 0 && x.fam === -fam ? -1 : 0;
        if (x.d === 1) { wf += x.w; favor++; }
        if (x.d === -1) { wc += x.w; contra++; }
    }
    const forte = fam !== 0 && contra === 0 && (fam > 0 ? p >= 70 : p <= 30) ? 1 : 0;
    // alta: ninguém contra e 4 ou mais de peso a favor; baixa: menos de 2 a favor, ou o contra passa de metade do favor
    const conf = contra === 0 && wf >= 4 ? 2 : wf < 2 || 2 * wc > wf ? 0 : 1;
    const key = manda ? fs[0].key : fam > 0 ? (forte ? 'buy' : 'scale') : fam < 0 ? (forte ? 'sell' : 'reduce') : 'hold';
    return { fam, forte, p, conf, manda: manda ? 'claude' : 'voto', key, n: fs.length, favor, contra, f: fs };
}

// ---------- casos ao acaso (sempre os mesmos) ----------
function rng(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
const KEYS = ['buy', 'scale', 'hold', 'wait', 'neutral', 'turn', 'reduce', 'sell', 'avoid'];
const KEYS_MAS = ['up', 'flat', 'down', '', 'BUY', 'constructor', 'toString', 7, null, true, ['buy'], { key: 'buy' }];
const AKEYS = ['strong_buy', 'buy', 'hold', 'underperform', 'sell', 'strong_sell'];
const AKEYS_MAS = ['none', '', 'hasOwnProperty', 3, null, false];
const MAUS = [NaN, Infinity, -Infinity, null, '7', true, false, '', [], {}];
const FRONTEIRAS = [0, 1, 29, 30, 31, 41, 42, 43, 49, 50, 51, 57, 58, 59, 69, 70, 71, 99, 100, -5, 140, -0];
function caso(r) {
    const um = (l) => l[Math.floor(r() * l.length)];
    const pt = () => (r() < 0.1 ? um(MAUS) : r() < 0.45 ? um(FRONTEIRAS) : r() < 0.8 ? Math.round(r() * 100) : r() * 120 - 10);
    const prazosDe = (o) => { for (const h of ['short', 'mid', 'long']) if (r() < 0.8) o[h] = pt(); return o; };
    const key = (boas, mas) => (r() < 0.9 ? um(boas) : um(mas));
    const d = {};
    if (r() < 0.75) d.cl = r() < 0.04 ? um([null, 'buy', 5, []]) : prazosDe({ key: key(KEYS, KEYS_MAS), ...(r() < 0.3 ? { old: um([true, true, true, 1, 'sim', false, 0, '', null]) } : {}) });
    if (r() < 0.5) {
        const price = r() < 0.1 ? um([0, -3, NaN, null, '100']) : 20 + r() * 300;
        d.an = r() < 0.04 ? um([null, 'buy', 2]) : {
            key: key(AKEYS, AKEYS_MAS), n: r() < 0.1 ? um([0, -2, NaN, null, '12', Infinity]) : um([1, 2, 3, 5, 9, 10, 11, 25, 60, 2.5]),
            ...(r() < 0.85 ? { mean: r() < 0.1 ? um(MAUS.concat(0, 9, -1)) : r() < 0.4 ? um([1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 2.32, 2.68]) : 1 + r() * 4 } : {}),
            ...(r() < 0.8 ? { target: r() < 0.08 ? um(MAUS) : price * (0.6 + r() * 0.9), price } : {}),
        };
    }
    if (r() < 0.8) d.tec = r() < 0.04 ? um([null, 'buy', 9]) : prazosDe({ key: key(KEYS.slice(0, 6).concat('avoid'), KEYS_MAS) });
    if (r() < 0.45) d.fun = r() < 0.04 ? um([null, 'x', 7]) : {
        ...(r() < 0.85 ? { pe: r() < 0.1 ? um(MAUS.concat(0, -8)) : r() < 0.4 ? um([5, 10, 15, 22, 35, 60, 90, 12.5, 28]) : r() * 70 } : {}),
        ...(r() < 0.8 ? { cr: r() < 0.1 ? um(MAUS) : r() < 0.4 ? um([-30, -10, 0, 10, 25, 60, 4.5]) : r() * 60 - 20 } : {}),
        ...(r() < 0.8 ? { mg: r() < 0.1 ? um(MAUS) : r() < 0.4 ? um([-15, 0, 10, 25, 55, 17.5]) : r() * 50 - 10 } : {}),
    };
    if (r() < 0.45) d.sent = r() < 0.04 ? um([null, 'x', 3]) : r() < 0.5 ? { fg: r() < 0.1 ? um(MAUS) : r() < 0.4 ? um([0, 10, 25, 36, 37, 50, 63, 64, 75, 100, 140, -5]) : Math.round(r() * 100), ...(r() < 0.2 ? { vix: 30 } : {}) }
        : { vix: r() < 0.1 ? um(MAUS.concat(0, -3)) : r() < 0.4 ? um([9, 12, 20, 24, 25, 28, 35, 80]) : 9 + r() * 40 };
    if (r() < 0.6) d.news = r() < 0.1 ? um(MAUS) : r() < 0.4 ? um([0, 0.15, -0.15, 0.16, -0.16, 1, -1, 2, -3, 0.5, -0.5]) : r() * 2 - 1;
    return r() < 0.01 ? um([null, undefined, 3, 'x', []]) : d;
}

test('a Onda decide como as regras, em casos ao acaso', () => {
    const r = rng(20261113), ds = Array.from({ length: CASOS }, () => caso(r));
    const conta = { nulo: 0, claude: 0, voto: 0, forte: 0, fam: { 1: 0, 0: 0, '-1': 0 }, conf: [0, 0, 0], n: [0, 0, 0, 0, 0, 0, 0], contra: 0, fundamentos: 0, sentimento: 0 };
    for (let i = 0; i < ds.length; i += 500) {
        const lote = ds.slice(i, i + 500), saiu = O.decisoes(lote);
        assert.equal(saiu.length, lote.length);
        lote.forEach((d, j) => {
            const quer = decide(d);
            assert.deepStrictEqual(saiu[j], quer, `caso ${i + j}: ${JSON.stringify(d)}`);
            if (!quer) { conta.nulo++; return; }
            conta[quer.manda]++; conta.forte += quer.forte; conta.fam[quer.fam]++; conta.conf[quer.conf]++; conta.n[quer.n]++; conta.contra += quer.contra > 0;
            for (const x of quer.f) if (x.f === 'fundamentos' || x.f === 'sentimento') conta[x.f]++;
        });
    }
    // os casos têm de chegar a todos os ramos (senão o teste não diz nada)
    const min = CASOS / 200;
    for (const [nome, v] of Object.entries({ ...conta, ...conta.fam, c0: conta.conf[0], c1: conta.conf[1], c2: conta.conf[2], n1: conta.n[1], n2: conta.n[2], n3: conta.n[3], n4: conta.n[4], n5: conta.n[5], n6: conta.n[6] })) {
        if (typeof v === 'number') assert.ok(v >= min, `poucos casos de ${nome}: ${v}`);
    }
});

test('casos feitos à mão', () => {
    const [a, b, c, d, f, g, h, i] = O.decisoes([
        // o Claude e a técnica dizem entrar, as notícias não dizem nada: confiança alta
        { cl: { key: 'scale', short: 45, mid: 62, long: 74 }, tec: { key: 'buy', short: 60, mid: 66, long: 70 }, news: 0.1 },
        // o Claude diz comprar contra todos: a decisão é a dele, com a confiança em baixo e três contra
        { cl: { key: 'buy', short: 45, mid: 62, long: 74 }, an: { key: 'sell', mean: 4.2, n: 22, target: 80, price: 100 }, tec: { key: 'avoid', short: 20, mid: 25, long: 30 }, news: -0.5 },
        // só a técnica: uma fonte sozinha nunca dá mais do que confiança baixa
        { tec: { key: 'buy', short: 80, mid: 80, long: 80 } },
        // sem o Claude: analistas (o preço já passou o alvo: 92,5 conta 71), técnica e notícias a favor
        { an: { key: 'strong_buy', mean: 1.3, n: 40, target: 90, price: 100 }, tec: { key: 'buy', mid: 75, long: 82 }, news: 0.4 },
        // o Claude de um dia anterior continua a mandar, com metade do peso: sozinho a favor, a confiança é baixa
        { cl: { key: 'hold', old: true }, tec: { key: 'avoid', short: 10, mid: 12, long: 20 } },
        // as referências (índices, câmbio: up, flat, down) não têm decisão
        { cl: { key: 'up', short: 60, mid: 60, long: 60 } },
        // uma ação com os fundamentos (P/E 28 → 41, vendas +60 % → 80, margem 55 % → 75: 65) e o VIX em 31 (69) a favor
        { cl: { key: 'buy', short: 60, mid: 70, long: 80 }, fun: { pe: 28, cr: 60, mg: 55 }, sent: { vix: 31 } },
        // cripto sem o Claude: o medo extremo (12 → 73) puxa a média para 58, mas sozinho a favor dá confiança baixa
        { tec: { key: 'neutral', short: 50, mid: 50, long: 50 }, sent: { fg: 12 } },
    ]);
    assert.deepStrictEqual({ fam: a.fam, forte: a.forte, p: a.p, conf: a.conf, manda: a.manda, key: a.key, favor: a.favor, contra: a.contra }, { fam: 1, forte: 0, p: 63, conf: 2, manda: 'claude', key: 'scale', favor: 2, contra: 0 });
    assert.deepStrictEqual(a.f, [{ f: 'claude', p: 63, fam: 1, w: 3, d: 1, key: 'scale' }, { f: 'tecnica', p: 66, fam: 1, w: 1.5, d: 1, key: 'buy' }, { f: 'noticias', p: 55, fam: 0, w: 0.75, d: 0 }]);
    assert.deepStrictEqual({ fam: b.fam, p: b.p, conf: b.conf, key: b.key, favor: b.favor, contra: b.contra }, { fam: 1, p: 40, conf: 0, key: 'buy', favor: 1, contra: 3 });
    assert.deepStrictEqual({ fam: c.fam, forte: c.forte, p: c.p, conf: c.conf, manda: c.manda, key: c.key }, { fam: 1, forte: 1, p: 80, conf: 0, manda: 'voto', key: 'buy' });
    assert.deepStrictEqual({ fam: d.fam, forte: d.forte, p: d.p, conf: d.conf, manda: d.manda }, { fam: 1, forte: 1, p: 74, conf: 2, manda: 'voto' });
    assert.equal(d.f[0].p, 71);
    assert.deepStrictEqual({ fam: f.fam, forte: f.forte, p: f.p, conf: f.conf, manda: f.manda, key: f.key, w: f.f[0].w }, { fam: 0, forte: 0, p: 33, conf: 0, manda: 'claude', key: 'hold', w: 1.5 });
    assert.deepStrictEqual({ fam: h.fam, forte: h.forte, p: h.p, conf: h.conf, favor: h.favor }, { fam: 1, forte: 1, p: 70, conf: 2, favor: 3 });
    assert.deepStrictEqual(h.f, [{ f: 'claude', p: 72, fam: 1, w: 3, d: 1, key: 'buy' }, { f: 'fundamentos', p: 65, fam: 1, w: 1, d: 1 }, { f: 'sentimento', p: 69, fam: 1, w: 0.75, d: 1 }]);
    assert.deepStrictEqual({ fam: i.fam, p: i.p, conf: i.conf, manda: i.manda, key: i.key, favor: i.favor, contra: i.contra }, { fam: 1, p: 58, conf: 0, manda: 'voto', key: 'scale', favor: 1, contra: 0 });
    assert.deepStrictEqual(i.f.map((x) => [x.f, x.p, x.d]), [['tecnica', 50, 0], ['sentimento', 73, 1]]);
    assert.equal(g, null);
    assert.deepStrictEqual(O.decisao({ tec: { key: 'buy', short: 80, mid: 80, long: 80 } }), c);
    assert.deepStrictEqual(O.decisoes([]), []);
    assert.deepStrictEqual(O.decisoes(null), []);
});

test('as propriedades que contam', () => {
    const r = rng(7), um = (l) => l[Math.floor(r() * l.length)];
    const ds = [], sobe = [];
    for (let i = 0; i < 3000; i++) {
        const d = caso(r);
        ds.push(d);
        // o mesmo caso com a técnica mais alta (sem o Claude a mandar, a decisão não pode piorar)
        const t = obj(obj(d).tec), mais = { ...obj(d), tec: { ...t } };
        for (const h of ['short', 'mid', 'long']) if (e(t[h])) mais.tec[h] = t[h] + um([1, 5, 20, 60]);
        sobe.push(mais);
    }
    const s1 = O.decisoes(ds), s2 = O.decisoes(sobe);
    let comClaude = 0, subiu = 0;
    ds.forEach((d, i) => {
        const x = s1[i], y = s2[i];
        if (!x) return;
        const cl = obj(obj(d).cl);
        // manda o Claude, se falou: a família e o veredicto são os dele
        if (de(FAM, cl.key) !== null) { comClaude++; assert.deepStrictEqual([x.manda, x.fam, x.key], ['claude', FAM[cl.key], cl.key]); }
        else { assert.equal(x.manda, 'voto'); assert.equal(x.fam, x.p >= 58 ? 1 : x.p <= 42 ? -1 : 0); assert.ok(y.p >= x.p && y.fam >= x.fam, `caso ${i}`); subiu += y.p > x.p; }
        // forte e confiança alta só sem ninguém contra; as contas das fontes batem certo
        if (x.forte || x.conf === 2) assert.equal(x.contra, 0);
        assert.equal(x.f.length, x.n);
        assert.equal(x.f.filter((q) => q.d === 1).length, x.favor);
        assert.equal(x.f.filter((q) => q.d === -1).length, x.contra);
        for (const q of x.f) assert.ok(Number.isInteger(q.p) && q.p >= 0 && q.p <= 100 && q.w > 0 && q.w <= 3);
        assert.ok(Number.isInteger(x.p) && x.p >= 0 && x.p <= 100);
    });
    assert.ok(comClaude > 500 && subiu > 300, `${comClaude} ${subiu}`);
});
