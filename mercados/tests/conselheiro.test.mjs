// node --test mercados/tests — scripts da tarefa agendada (sem rede: só as funções puras), na referência em JS
// (mercados/conselheiro/js/); o conselheiro-onda.test.mjs confirma que a Onda (o que a tarefa corre) dá o mesmo
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAdvice, MAX_EXTRA } from '../conselheiro/js/publicar.mjs';
import { pickAssets, kindFromQuote, lineOf, evalPast, pastLines, lastVerdicts, modelOf } from '../conselheiro/js/dados.mjs';
import { normVerdict, FUNDS, STOCKS, CRYPTO, MARKET, MINE } from '../conselheiro/js/comum.mjs';

// dados.json mínimo: dois ativos que se compram, um da referência
const DADOS = { rows: [
    { s: 'VWCE.DE', kind: 'fund', price: 165.84, priceEur: 165.84 },
    { s: 'NVDA', kind: 'stock', price: 196, priceEur: 170.14 },
    { s: 'c:BTC', kind: 'crypto', price: 68000, priceEur: 68000 },
    { s: 'BZ=F', kind: 'ref', price: 98.3, priceEur: null },
] };
const BASE = { headline: 'Leitura do dia', market: 'Mercado.', plan: [{ s: 'VWCE.DE', amount: '810 €' }, { s: 'c:BTC', amount: '90 €' }], tldr: ['Mercado: x', 'Plano: y', 'Atenção: z'] };
const V = {
    'VWCE.DE': { key: 'hold', action: 'Manter e reforçar', short: 40, mid: 62, long: 85, why: 'Núcleo; tendência longa a favor (L82).' },
    NVDA: { key: 'scale', short: 48, mid: 70, long: 75, entry: 190, target: 230, stop: 172, why: 'Desconto de 22% (RSI 31); resultados a 17/11.', plan: 'Metade agora.' },
    'c:BTC': { key: 'wait', short: 40, mid: 45, long: 62, why: 'Abaixo da MM20; suporte 66 700 €.' },
    'BZ=F': { key: 'up', short: 60, mid: 55, long: 45, why: 'Acima da MM200.' },
};
const analise = (over = {}) => ({ ...BASE, actions: Object.entries(V).map(([s, x]) => ({ s, ...x })), ...over });
const errsOf = (a, uni) => buildAdvice(a, DADOS, uni).errs;

test('publicar: a análise nova (todos os ativos, convicção por prazo, níveis) passa e fica no formato 2', () => {
    const { out, errs } = buildAdvice(analise(), DADOS);
    assert.deepEqual(errs, []);
    assert.equal(out.v, 2);
    assert.equal(out.actions.length, 4);
    const nv = out.actions.find((x) => x.s === 'NVDA');
    assert.deepEqual([nv.short, nv.mid, nv.long, nv.entry, nv.target, nv.stop], [48, 70, 75, 190, 230, 172]);
    assert.equal(nv.action, 'Comprar aos poucos', 'sem action, fica o rótulo da key');
    assert.equal(nv.plan, 'Metade agora.');
    // classificação por prazo derivada da convicção, só com o que se compra (sem a referência)
    assert.deepEqual(out.rank.mid, ['NVDA', 'VWCE.DE', 'c:BTC']);
    assert.deepEqual(out.rank.long, ['VWCE.DE', 'NVDA', 'c:BTC']);
    assert.ok(!Object.values(out.rank).flat().includes('BZ=F'));
    // preços do dia (em euros; a referência na sua unidade) para avaliar depois
    assert.deepEqual(out.prices, { 'VWCE.DE': 165.84, NVDA: 170.14, 'c:BTC': 68000, 'BZ=F': 98.3 });
    assert.match(out.date, /^\d{4}-\d{2}-\d{2}$/);
});

test('publicar: tem de cobrir todos os ativos do dados.json, sem repetidos nem desconhecidos', () => {
    const a = analise();
    a.actions = a.actions.filter((x) => x.s !== 'c:BTC' && x.s !== 'BZ=F');
    assert.ok(errsOf(a).some((e) => /faltam 2 ativos.*c:BTC, BZ=F/.test(e)));
    const b = analise();
    b.actions.push({ ...b.actions[0] }, { s: 'ZZZ', key: 'buy', short: 60, mid: 60, long: 60, why: 'x' });
    const e = errsOf(b);
    assert.ok(e.some((x) => /VWCE\.DE: repetido/.test(x)) && e.some((x) => /ZZZ: ativo desconhecido/.test(x)), e.join(' | '));
});

test('publicar: o formato antigo (sem convicção) é recusado — a app continua a lê-lo, a tarefa já não o escreve', () => {
    const old = { ...BASE, actions: Object.keys(V).map((s) => ({ s, key: s === 'BZ=F' ? 'up' : 'hold', action: 'Manter', why: 'porquê' })) };
    const e = errsOf(old);
    assert.ok(e.some((x) => /falta actions\[1\] NVDA\.mid \(convicção 0–100\)/.test(x)), e.join(' | '));
    assert.equal(e.filter((x) => /convicção 0–100/.test(x)).length, 12, '3 prazos × 4 ativos');
});

test('publicar: veredictos, convicção e níveis validados', () => {
    const bad = (s, patch) => { const a = analise(); Object.assign(a.actions.find((x) => x.s === s), patch); return errsOf(a); };
    assert.ok(bad('BZ=F', { key: 'buy' }).some((e) => /BZ=F\.key inválido: buy \(referência: up, flat, down\)/.test(e)), 'referência: só direção');
    assert.ok(bad('NVDA', { key: 'up' }).some((e) => /NVDA\.key inválido: up/.test(e)));
    assert.deepEqual(bad('NVDA', { key: 'reduce' }), [], 'reduzir é um veredicto válido');
    assert.ok(bad('NVDA', { mid: 120 }).some((e) => /NVDA\.mid: a convicção é de 0 a 100/.test(e)));
    assert.ok(bad('NVDA', { short: 'alta' }).some((e) => /NVDA\.short: a convicção é de 0 a 100/.test(e)));
    assert.ok(bad('NVDA', { key: 'buy', short: 10, mid: 20, long: 30 }).some((e) => /convicção contra nos três prazos/.test(e)), 'escala ao contrário');
    assert.ok(bad('c:BTC', { key: 'sell', short: 70, mid: 80, long: 90 }).some((e) => /convicção a favor nos três prazos/.test(e)));
    assert.ok(bad('NVDA', { stop: 195 }).some((e) => /stop \(195\) tem de ficar abaixo da entrada \(190\)/.test(e)));
    assert.ok(bad('NVDA', { target: 185 }).some((e) => /alvo \(185\) tem de ficar acima da entrada/.test(e)));
    assert.ok(bad('NVDA', { entry: 1900, target: 2300, stop: 1720 }).some((e) => /longe do preço de hoje \(196\): está na moeda do ativo\?/.test(e)), 'unidade errada');
    assert.ok(bad('NVDA', { entry: 'x' }).some((e) => /entry tem de ser um número/.test(e)));
    assert.ok(bad('NVDA', { why: '' }).some((e) => /falta actions\[1\] NVDA\.why/.test(e)));
    assert.ok(bad('NVDA', { why: 'x'.repeat(281) }).some((e) => /why com mais de 280/.test(e)));
});

test('publicar: classificação do Claude por prazo e ativos da lista toda da TR', () => {
    const ok = buildAdvice(analise({ rank: { mid: ['NVDA', 'VWCE.DE'] } }), DADOS);
    assert.deepEqual(ok.errs, []);
    assert.deepEqual(ok.out.rank.mid, ['NVDA', 'VWCE.DE'], 'a dada pelo Claude fica');
    assert.equal(ok.out.rank.short.length, 3, 'os outros prazos derivam da convicção');
    const e = errsOf(analise({ rank: { mid: ['VWCE.DE', 'NVDA', 'NVDA', 'BZ=F'], long: 'x' } }));
    assert.ok(e.some((x) => /rank\.mid: NVDA \(70\) atrás de VWCE\.DE \(62\)/.test(x)), e.join(' | '));
    assert.ok(e.some((x) => /rank\.mid: NVDA repetido/.test(x)));
    assert.ok(e.some((x) => /rank\.mid\[3\]: BZ=F não está em actions \(ou é referência\)/.test(x)));
    assert.ok(e.some((x) => /rank\.long tem de ser uma lista/.test(x)));
    // até MAX_EXTRA ativos de "Toda a Trade Republic" (universo.json)
    const uni = Array.from({ length: MAX_EXTRA + 1 }, (_, i) => ({ s: `X${i}.DE` }));
    const extra = (n) => analise({ actions: analise().actions.concat(uni.slice(0, n).map((u) => ({ s: u.s, key: 'buy', short: 60, mid: 65, long: 70, why: 'tendência forte' }))) });
    assert.deepEqual(errsOf(extra(MAX_EXTRA), uni), []);
    assert.ok(errsOf(extra(MAX_EXTRA + 1), uni).some((x) => /no máximo 8 ativos de fora/.test(x)));
    assert.ok(errsOf(extra(1), []).some((x) => /X0\.DE: ativo desconhecido/.test(x)), 'sem o universo.json não se conhece');
});

test('publicar: plano do mês e resumo continuam obrigatórios', () => {
    const e = errsOf(analise({ plan: [], tldr: [], headline: '' }));
    assert.ok(e.includes('plan vazio: diz sempre o que fazer com o plano do mês'));
    assert.ok(e.some((x) => /^tldr vazio/.test(x)) && e.includes('falta headline'));
    assert.deepEqual(buildAdvice(null, DADOS).errs, ['a análise tem de ser um objeto JSON']);
});

test('veredicto das outras apps: convicção e níveis opcionais', () => {
    const errs = [];
    const o = normVerdict({ s: 'AAPL', key: 'buy', why: 'tendência a favor' }, errs, { p: 'A1.actions[0]', scores: 'opt', plan: false, price: 300 });
    assert.deepEqual(errs, []);
    assert.deepEqual(o, { s: 'AAPL', key: 'buy', action: 'Comprar', why: 'tendência a favor' });
    normVerdict({ s: 'AAPL', key: 'buy', mid: 70, entry: 3000, why: 'x' }, errs, { p: 'A1', scores: 'opt', price: 300 });
    assert.ok(errs.some((e) => /A1\.entry = 3000 longe do preço/.test(e)));
});

test('dados: todos os ativos que a app mostra — listas, o que o investidor juntou e a referência', () => {
    const journals = [{ days: {
        '2026-11-05': [{ s: 'OLD.LS' }],
        '2026-11-07': [{ s: 'VWCE.DE' }, { s: 'BCP.LS' }, { s: 'IWDA.AS' }, { s: 'GC=F' }, { s: 'bad sym' }, { s: 'c:BTC' }],
    }, my: ['VWCE.DE', 'c:ETH', 'EGL.LS', 'BCP.LS'] }];
    const { keys, extra, groups } = pickAssets(journals);
    assert.deepEqual(extra, ['BCP.LS', 'IWDA.AS', 'EGL.LS'], 'só o último dia do diário e a lista "my"; sem as das listas, a referência ou símbolos inválidos');
    assert.ok(!keys.includes('OLD.LS'), 'o que já tirou da app não entra');
    const all = [...Object.keys(FUNDS), ...Object.keys(STOCKS), ...Object.keys(CRYPTO), ...Object.keys(MARKET)];
    assert.ok(all.every((k) => keys.includes(k)), 'listas da app e referência (índices, câmbio, futuros)');
    assert.equal(keys.length, all.length + 3);
    assert.equal(new Set(keys).size, keys.length, 'sem repetidos');
    assert.deepEqual(keys.slice(0, 5), MINE, 'primeiro o que tem');
    assert.deepEqual([groups['VWCE.DE'], groups['c:ETH'], groups['EUNL.DE'], groups['c:SOL'], groups.NVDA, groups['BCP.LS'], groups['BZ=F'], groups['^VIX']], ['mine', 'mine', 'fund', 'mine', 'stock', 'extra', 'ref', 'ref']);
    assert.equal(pickAssets([]).extra.length, 0);
    // tipo do que juntou: pelo tipo que o Yahoo indica
    assert.equal(kindFromQuote('IWDA.AS', { type: 'ETF' }), 'fund');
    assert.equal(kindFromQuote('ADA-EUR', { type: 'CRYPTOCURRENCY' }), 'crypto');
    assert.equal(kindFromQuote('EGL.LS', { type: 'EQUITY' }), 'stock');
    assert.equal(kindFromQuote('BZ=F', { type: 'FUTURE' }), 'ref');
    assert.equal(kindFromQuote('c:BTC', null), 'crypto');
});

test('dados: uma linha compacta por ativo, com o veredicto anterior', () => {
    const r = { s: 'NVDA', name: 'Nvidia', kind: 'stock', cur: 'USD', price: 196, priceEur: 170.14, day: 2.83, r1m: -0.19, r3m: -0.142, r1y: -0.008, short: 37, mid: 0, long: 42, rsi: 31.2, vol: 0.4,
        dd: -0.22, ma200: -0.088, longUp: true, ruleAction: 'Manter, sem reforçar', sup: ['165.17 mín.ano* (-11.5%)'], res: ['200 MM50 (+2.0%)'], events: ['resultados 2026-11-17'], prev: { action: 'Esperar', short: 40, mid: 45, long: 50 } };
    const l = lineOf(r);
    assert.equal(l, '- NVDA Nvidia [ação] 196 USD (≈170.14€) | dia +2.8% · 1M -19.0% · 3M -14.2% · 1A -0.8% | alg C37 M0 L42 · RSI 31 · vol 40% | máx -22.0% · MM200 -8.8%↑ | S 165.17 mín.ano* (-11.5%) | R 200 MM50 (+2.0%) | regra Manter, sem reforçar | antes Esperar 40/45/50 | AGENDA resultados 2026-11-17');
    const ref = lineOf({ ...r, s: 'BZ=F', name: 'Petróleo Brent', kind: 'ref', priceEur: null, ruleAction: null, prev: null, events: [], sup: [], res: [] });
    assert.match(ref, /^- BZ=F Petróleo Brent \[ref\] 196 USD \| dia/);
    assert.ok(!/regra|antes|AGENDA|≈/.test(ref), ref);
    assert.ok(l.length < 330, 'curta: ' + l.length);
});

test('dados: avaliação dos veredictos anteriores (formato antigo e novo), face ao VWCE', () => {
    const now = { 'VWCE.DE': 110, NVDA: 120, 'c:BTC': 90, TSLA: 80, 'BZ=F': 105 };
    const advices = [
        { date: '2026-11-05', prices: { 'VWCE.DE': 100, NVDA: 100, TSLA: 100, 'c:BTC': 100 }, actions: [{ s: 'NVDA', key: 'buy', action: 'Comprar' }, { s: 'TSLA', key: 'avoid' }, { s: 'c:BTC', key: 'wait' }] },
        { date: '2026-11-06', v: 2, prices: { 'VWCE.DE': 100, NVDA: 100, 'BZ=F': 100 }, actions: [{ s: 'NVDA', key: 'scale', action: 'Comprar aos poucos', short: 50, mid: 75, long: 80, entry: 95 }, { s: 'BZ=F', key: 'up', mid: 60 }, { s: 'SEMPRECO', key: 'buy', mid: 90 }] },
    ];
    const ev = evalPast(advices, now);
    assert.equal(ev.byKey.buy.n, 1);
    assert.ok(Math.abs(ev.byKey.buy.ex / ev.byKey.buy.nex - 0.1) < 1e-9, 'NVDA +20% vs VWCE +10% = +10 pp');
    assert.deepEqual([ev.byKey.buy.hit, ev.byKey.avoid.hit, ev.byKey.wait.nhit], [1, 1, 0], 'Comprar acima do VWCE e Evitar abaixo acertam; Esperar não conta');
    assert.equal(ev.byKey.up.nex, 0, 'referência não se compara com o VWCE');
    assert.equal(ev.byKey.up.hit, 1, 'em alta e subiu');
    assert.equal(ev.byConv['≥70'].n, 1, 'por convicção (só o formato novo e só o que se compra)');
    assert.equal(Object.values(ev.byConv).reduce((a, x) => a + x.n, 0), 1);
    const L = pastLines(ev);
    assert.match(L[0], /^- Por veredicto: .*Comprar n=1 \+20\.0% \(vs VWCE \+10\.0%\) acerto 100%/);
    assert.match(L[1], /^- Por convicção a médio prazo: ≥70 n=1 \+20\.0%/);
    assert.deepEqual(pastLines(evalPast([], now)), ['- Por veredicto: (ainda nenhum)']);
    // o último veredicto de cada ativo, para dar continuidade (o da manhã conta à tarde)
    const last = lastVerdicts(advices);
    assert.deepEqual(last.NVDA, { date: '2026-11-06', key: 'scale', action: 'Comprar aos poucos', short: 50, mid: 75, long: 80, entry: 95 });
    assert.deepEqual(last.TSLA, { date: '2026-11-05', key: 'avoid', action: 'Evitar' });
});

test('dados: modelo.json com todos os ativos e o último veredicto, porquê sempre por escrever', () => {
    const rows = [{ s: 'VWCE.DE' }, { s: 'NVDA' }, { s: 'BZ=F' }];
    const prev = { NVDA: { key: 'scale', action: 'Comprar aos poucos', short: 50, mid: 75, long: 80, entry: 95 } };
    const m = modelOf(rows, prev, { last: { plan: [{ s: 'VWCE.DE', amount: '810 €', name: '' }], planNote: '900 € em 2 execuções' }, lessons: ['l1'], movers: [{ s: 'NVDA' }] });
    assert.deepEqual(m.actions.map((x) => x.s), ['VWCE.DE', 'NVDA', 'BZ=F']);
    assert.deepEqual(m.actions[1], { s: 'NVDA', key: 'scale', action: 'Comprar aos poucos', short: 50, mid: 75, long: 80, entry: 95, target: null, stop: null, why: '', plan: '', algWhy: '' });
    assert.deepEqual(m.actions[2], { s: 'BZ=F', key: '', action: '', short: null, mid: null, long: null, entry: null, target: null, stop: null, why: '', plan: '', algWhy: '' });
    assert.deepEqual(m.plan, [{ s: 'VWCE.DE', amount: '810 €', why: '' }]);
    assert.deepEqual([m.planNote, m.lessons, m.movers], ['900 € em 2 execuções', ['l1'], [{ s: 'NVDA', why: '' }]]);
    // por preencher, o publicar recusa (nunca se publica um porquê antigo por engano)
    const e = buildAdvice({ ...m, headline: 'x', market: 'y', tldr: ['a'] }, { rows }).errs;
    assert.ok(e.some((x) => /falta actions\[1\] NVDA\.why/.test(x)) && e.some((x) => /BZ=F\.key inválido/.test(x)), e.join(' | '));
    assert.deepEqual(modelOf([{ s: 'c:BTC' }], {}).plan.map((x) => x.amount), ['810 €', '90 €'], 'sem análise anterior: o plano por omissão');
});

test('publicar: segunda opinião — discordar do sinal automático exige o porquê (algWhy)', () => {
    const D2 = { rows: DADOS.rows.map((r) => ({ ...r, rule: { 'VWCE.DE': 'wait', NVDA: 'avoid', 'c:BTC': 'buy' }[r.s] || null, ruleAction: { NVDA: 'Evitar', 'c:BTC': 'Comprar' }[r.s] })) };
    // VWCE: hold vs wait (mesma família: ficar) → passa sem porquê; NVDA: scale vs avoid; BTC: wait vs buy → precisam
    let r = buildAdvice(analise(), D2);
    assert.equal(r.errs.length, 2);
    assert.match(r.errs.join(' | '), /NVDA: o teu veredicto \(Comprar aos poucos\) discorda do sinal automático \(Evitar\)/);
    assert.match(r.errs.join(' | '), /c:BTC: .*discorda do sinal automático \(Comprar\)/);
    const a = analise();
    a.actions.find((x) => x.s === 'NVDA').algWhy = 'A regra vê a queda; os resultados de 17/11 e o desconto pesam mais.';
    a.actions.find((x) => x.s === 'c:BTC').algWhy = 'Abaixo da MM20: esperar pelo suporte.';
    r = buildAdvice(a, D2);
    assert.deepEqual(r.errs, []);
    const nv = r.out.actions.find((x) => x.s === 'NVDA');
    assert.equal(nv.alg, 'avoid');
    assert.match(nv.algWhy, /resultados/);
    assert.equal(r.out.actions.find((x) => x.s === 'VWCE.DE').alg, 'wait');
    assert.equal(r.out.actions.find((x) => x.s === 'BZ=F').alg, undefined, 'a referência não tem regra');
    a.actions.find((x) => x.s === 'NVDA').algWhy = 'x'.repeat(201);
    assert.match(buildAdvice(a, D2).errs.join(' '), /algWhy com mais de 200/);
});
