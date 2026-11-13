// node --test mercados/tests/ecra-decisao.test.mjs
// O cartão «Decisão» da ficha (AnaliseOnda.ecra.decisao, de mercados/onda/ecra-decisao.onda). Para instantâneos ao
// acaso (fontes que faltam, textos com HTML, listas vazias), o cartão tem de dizer o que a decisão diz
// (AnaliseOnda.decisao, conferida à parte em decisao.test.mjs): o rótulo, a confiança, a média, quantas fontes estão
// a favor e quais ficam contra ou ao lado, e cada fonte numa linha. Tudo o que vem de fora sai escapado.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const O = require('../analise-onda.js');
await O.ready;
const CASOS = +process.env.CASOS || 4000;

// ---------- o que o cartão promete, em JS ----------
const FAM = { buy: 1, scale: 1, hold: 0, wait: 0, neutral: 0, turn: 0, reduce: -1, sell: -1, avoid: -1 };
const CONS = { strong_buy: 'Compra forte', buy: 'Comprar', hold: 'Manter', underperform: 'Abaixo do mercado', sell: 'Vender', strong_sell: 'Venda forte' };
const NOME = { claude: 'Claude', analistas: 'Analistas', tecnica: 'Técnica', noticias: 'Notícias' };
const ART = { claude: 'o Claude', analistas: 'os analistas', tecnica: 'a técnica', noticias: 'as notícias' };
const e = Number.isFinite;
const rot = (f, own, parte) => (f > 0 ? (own ? 'Reforçar' : 'Comprar') : f === 0 ? (own ? 'Manter' : 'Aguardar') : own ? (parte ? 'Vender parte' : 'Vender') : 'Evitar');
const tom = (f) => (f > 0 ? 'up' : f < 0 ? 'down' : 'flat');
const tomP = (p) => (p >= 58 ? 'up' : p <= 42 ? 'down' : 'flat');
const lista = (xs) => (xs.length < 2 ? xs.join('') : xs.slice(0, -1).join(', ') + ' e ' + xs[xs.length - 1]);
const pt2 = new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (x) => (x >= 0.005 ? '+' : x <= -0.005 ? '−' : '') + pt2.format(Math.abs(x)) + '%';
const prazos = (x) => [['short', 'C'], ['mid', 'M'], ['long', 'L']].filter(([h]) => e(x[h])).map(([h, l]) => l + String(Math.round(x[h]) || 0)).join(' · ');
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function voz(d) {
    if (d.n === 1) return `Uma só fonte: ${ART[d.f[0].f]}.`;
    if (d.favor === d.n) return `As ${d.n} fontes de acordo.`;
    let t = `${d.favor} de ${d.n} a favor`;
    if (d.contra) t += ' · contra: ' + lista(d.f.filter((x) => x.d === -1).map((x) => ART[x.f]));
    if (d.favor + d.contra < d.n) t += ' · ao lado: ' + lista(d.f.filter((x) => x.d === 0).map((x) => ART[x.f]));
    return t;
}
const barra = (p) => `<div class="score"><div class="bar"><i class="${tomP(p)}" style="width:${p}%"></i></div><span class="val num ${tomP(p)}-t">${p}</span></div>`;
function fonte(s, d, x, i) {
    const own = !!s.own, f = s.d;
    const diz = x.f === 'claude' ? rot(FAM[f.cl.key], own, f.cl.key === 'reduce') : x.f === 'analistas' ? CONS[f.an.key] : x.f === 'tecnica' ? rot(FAM[f.tec.key], own, f.tec.key === 'reduce')
        : x.fam > 0 ? 'positivas' : x.fam < 0 ? 'negativas' : 'neutras';
    const lado = i === 0 && d.manda === 'claude' ? 'decide' : x.d > 0 ? 'a favor' : x.d < 0 ? 'contra' : 'ao lado';
    let por = '';
    if (x.f === 'claude') por = prazos(f.cl);
    if (x.f === 'tecnica') por = prazos(f.tec);
    if (x.f === 'analistas') {
        const n = Math.trunc(f.an.n);
        por = `${n} ${n === 1 ? 'analista' : 'analistas'}`;
        if (e(s.anD)) por += ` · alvo ${pct(s.anD)}` + (x.fam > 0 && s.anD < 0 ? ' · o preço já passou o alvo' : x.fam < 0 && s.anD > 0 ? ' · o alvo está acima do preço' : '');
    }
    if (x.f === 'noticias' && e(s.nn)) por = `${Math.trunc(s.nn)} ${Math.trunc(s.nn) === 1 ? 'título' : 'títulos'} recentes`;
    return `<li class="d${x.d > 0 ? 1 : x.d < 0 ? 2 : 0}"><div class="dec-r"><b>${NOME[x.f]}</b><span class="dec-l ${tom(x.fam)}-t">${diz}</span><em>${lado}</em></div><div class="dec-s">${barra(x.p)}<small>${por}</small></div></li>`;
}
const arr = (x) => (Array.isArray(x) ? x : []), ob = (x) => (x !== null && typeof x === 'object' && !Array.isArray(x) ? x : {});
function cartao(s) {
    const d = O.decisao(s.d);
    if (!d) return '';
    const own = !!s.own, t = tom(d.fam);
    return `<div class="box advice dec-box ${t}"><h3>Decisão</h3>`
        + (s.src ? `<div class="adv-src">${esc(s.src)}</div>` : '')
        + `<div class="dec-top"><div class="adv-act ${t}-t">${rot(d.fam, own, d.key === 'reduce')}${d.forte ? ' <small class="adv-forte">forte</small>' : ''}</div>`
        + `<span class="dec-conf c${d.conf}">confiança ${['baixa', 'média', 'alta'][d.conf]}</span></div>`
        + (s.act ? `<div class="adv-nu">${esc(s.act)}</div>` : '')
        + `<div class="dec-p"><small>Média das fontes</small>${barra(d.p)}</div><div class="dec-voz">${voz(d)}</div>`
        + `<ul class="dec-f">${d.f.map((x, i) => fonte(s, d, x, i)).join('')}</ul>`
        + (arr(s.lv).length ? `<ul class="cl-lv">${arr(s.lv).map((l) => { const o = ob(l); return `<li class="${esc(o.f)}"><small>${esc(o.l)}</small><b class="num">${esc(o.px)}</b><span class="num">${esc(o.d)}</span></li>`; }).join('')}</ul>` : '')
        + (s.hoje ? `<div class="adv-why"><b>Porquê ${s.desce ? 'desce' : 'sobe'} hoje:</b> ${esc(s.hoje)}</div>` : '')
        + (s.why ? `<div class="adv-txt">${esc(s.why)}</div>` : '')
        + (s.plan ? `<div class="adv-txt"><b>Plano:</b> ${esc(s.plan)}</div>` : '')
        + (s.algWhy ? `<div class="adv-alg diff"><b>O Claude discorda da técnica:</b> ${esc(s.algWhy)}</div>` : '')
        + arr(s.ev).map((v) => { const o = ob(v); return `<div class="adv-ev">${o.t === 'earnings' ? `<b>Resultados ${esc(o.q)} (${esc(o.d)}).</b> Nesses dias a ação costuma mexer ±5–10%.` : `<b>Ex-dividendo ${esc(o.q)} (${esc(o.d)}).</b> Para receber este dividendo tens de ter a ação antes dessa data.`}</div>`; }).join('')
        + '</div>';
}

// ---------- instantâneos ao acaso (sempre os mesmos) ----------
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
const AKEYS = ['strong_buy', 'buy', 'hold', 'underperform', 'sell', 'strong_sell'];
const TXT = ['', 'Comprar aos poucos', 'Desconto de 22% com a tendência longa a favor.', '<img src=x onerror=alert(1)>', 'a & b < c > d', '"aspas" e \'plicas\'', 'Metade agora, metade depois.', null, undefined, 0, 12.5, 'ç ã € — ±'];
function caso(r) {
    const um = (l) => l[Math.floor(r() * l.length)];
    const pt = () => (r() < 0.08 ? um([NaN, null, '7', undefined]) : r() < 0.5 ? Math.round(r() * 100) : r() * 100);
    const pz = (o) => { for (const h of ['short', 'mid', 'long']) if (r() < 0.8) o[h] = pt(); return o; };
    const d = {};
    if (r() < 0.75) d.cl = pz({ key: r() < 0.93 ? um(KEYS) : um(['up', '', null, 3]), ...(r() < 0.25 ? { old: true } : {}) });
    if (r() < 0.5) d.an = { key: r() < 0.93 ? um(AKEYS) : um(['none', null]), n: r() < 0.06 ? um([0, null, NaN]) : um([1, 2, 5, 9, 10, 25, 58, 2.5]), ...(r() < 0.8 ? { mean: 1 + r() * 4 } : {}), ...(r() < 0.7 ? { target: 50 + r() * 100, price: 100 } : {}) };
    if (r() < 0.8) d.tec = pz({ key: r() < 0.93 ? um(KEYS.slice(0, 6).concat('avoid')) : um(['x', null]) });
    if (r() < 0.6) d.news = r() < 0.08 ? um([NaN, null, 'x']) : r() * 2 - 1;
    return {
        d: r() < 0.02 ? um([null, undefined, 4]) : d, own: um([true, false, false, 1, 0, null, undefined, 'sim']),
        src: um(TXT), act: um(TXT), why: um(TXT), plan: um(TXT), algWhy: r() < 0.3 ? um(TXT) : '', hoje: r() < 0.3 ? um(TXT) : '', desce: um([true, false, null]),
        lv: r() < 0.6 ? Array.from({ length: Math.floor(r() * 4) }, () => (r() < 0.05 ? um([null, 'x']) : { f: um(['entry', 'target', 'stop', '"><b']), l: um(['Entrada', 'Alvo', 'Stop']), px: um(['164,93 €', '<i>1</i>', 12]), d: um(['−3,06%', '', null]) })) : um([undefined, null, [], 'x']),
        anD: r() < 0.7 ? Math.round((r() * 150 - 60) * 100) / 100 : um([null, undefined, NaN, '5']),
        nn: r() < 0.85 ? 1 + Math.floor(r() * 8) : um([null, undefined, NaN]),
        ev: r() < 0.3 ? Array.from({ length: 1 + Math.floor(r() * 2) }, () => ({ t: um(['earnings', 'dividend']), q: um(['hoje', 'daqui a 5 dias', '<u>']), d: um(['18/11', '02/12']) })) : um([undefined, []]),
    };
}

// todas as etiquetas abrem e fecham pela ordem
function fechado(h) {
    const pilha = [];
    for (const m of h.matchAll(/<(\/?)([a-z0-9]+)[^>]*>/g)) {
        if (!m[1]) pilha.push(m[2]);
        else if (pilha.pop() !== m[2]) return false;
    }
    return pilha.length === 0;
}

test('o cartão diz o que a decisão diz, em instantâneos ao acaso', () => {
    const r = rng(421), conta = { vazio: 0, claude: 0, voto: 0, niveis: 0, agenda: 0, contra: 0, lado: 0, acordo: 0, uma: 0 };
    for (let i = 0; i < CASOS; i++) {
        const s = caso(r), h = O.ecra.decisao(s), quer = cartao(s);
        assert.equal(h, quer, `caso ${i}: ${JSON.stringify(s)}`);
        if (!h) { conta.vazio++; continue; }
        assert.ok(fechado(h), `caso ${i}: etiquetas por fechar`);
        assert.ok(!/<img|<u>|<i>1/.test(h), `caso ${i}: HTML de fora por escapar`);
        const d = O.decisao(s.d);
        conta[d.manda]++; conta.niveis += /cl-lv/.test(h); conta.agenda += /adv-ev/.test(h); conta.contra += d.contra > 0; conta.lado += d.favor + d.contra < d.n; conta.acordo += d.n > 1 && d.favor === d.n; conta.uma += d.n === 1;
    }
    for (const [nome, v] of Object.entries(conta)) assert.ok(v >= CASOS / 100, `poucos casos de ${nome}: ${v}`);
});

test('um caso lido à mão', () => {
    const h = O.ecra.decisao({
        d: { cl: { key: 'scale', short: 48, mid: 88, long: 81 }, an: { key: 'strong_buy', mean: 1.4, n: 58, target: 230.5, price: 196 }, tec: { key: 'turn', short: 52, mid: 68, long: 36 }, news: 0 },
        own: false, src: 'Análise do Claude · feita às 07:16', act: 'Comprar aos poucos', why: 'Desconto de 22%.', plan: 'Metade agora.', anD: 17.6, nn: 6,
        lv: [{ f: 'entry', l: 'Entrada', px: '164,93 €', d: '−3,06%' }], ev: [{ t: 'earnings', q: 'daqui a 5 dias', d: '18/11' }],
    });
    const txt = h.replace(/<[^>]+>/g, '|').replace(/\|+/g, '|');
    assert.equal(txt, '|Decisão|Análise do Claude · feita às 07:16|Comprar |forte|confiança média|Comprar aos poucos|Média das fontes|72|2 de 4 a favor · ao lado: a técnica e as notícias'
        + '|Claude|Comprar|decide|75|C48 · M88 · L81|Analistas|Compra forte|a favor|90|58 analistas · alvo +17,60%|Técnica|Aguardar|ao lado|51|C52 · M68 · L36|Notícias|neutras|ao lado|50|6 títulos recentes'
        + '|Entrada|164,93 €|−3,06%|Desconto de 22%.|Plano:| Metade agora.|Resultados daqui a 5 dias (18/11).| Nesses dias a ação costuma mexer ±5–10%.|');
    // tenho o ativo e o Claude diz reduzir contra todos: a decisão é a dele, com os contra à vista
    const g = O.ecra.decisao({ d: { cl: { key: 'reduce', short: 30, mid: 30, long: 35 }, an: { key: 'buy', mean: 2, n: 30 }, tec: { key: 'buy', short: 70, mid: 70, long: 70 }, news: 0.5 }, own: true });
    assert.match(g, /<div class="adv-act down-t">Vender parte<\/div><span class="dec-conf c0">confiança baixa<\/span>/);
    assert.match(g, /<div class="dec-voz">1 de 4 a favor · contra: os analistas, a técnica e as notícias<\/div>/);
    assert.equal(O.ecra.decisao({ d: {} }), '');
    assert.equal(O.ecra.decisao({}), '');
});
