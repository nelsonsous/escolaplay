// Aprendizagem acumulada (lib/learn.js): verificação dia a dia, memória de 90 dias e pesos que crescem com os dias.
import test from 'node:test';
import assert from 'node:assert/strict';
import { metarWet, hourlyObs, reportObs, scoreDays, combineDays, learnWindow, mergeMemory, skillOf, factorsOf, factorAt,
    memoryInfo, learnHistory, LEARN } from '../lib/learn.js';

const HOUR = 36e5;
// corridas anteriores sintéticas: 3 dias em UTC (offset 0), modelos com erros conhecidos
function prevRuns({ days = 3, start = '2026-11-01', models = {}, rain = {} } = {}) {
    const time = [];
    const t0 = Date.parse(start + 'T00:00:00Z');
    for (let i = 0; i < days * 24; i++) time.push(new Date(t0 + i * HOUR).toISOString().slice(0, 16));
    const hourly = { time };
    for (const [id, f] of Object.entries(models)) for (const [suf] of [[''], ['_previous_day1'], ['_previous_day2']]) {
        hourly[`temperature_2m${suf}_${id}`] = time.map((t, i) => 12 + 5 * Math.sin((i / 24) * 2 * Math.PI) + f(i));
        hourly[`wind_speed_10m${suf}_${id}`] = time.map((t, i) => 15 + f(i));
        hourly[`precipitation${suf}_${id}`] = time.map((t, i) => (rain[id]?.includes(i) ? 1.2 : 0));
    }
    return { utc_offset_seconds: 0, hourly };
}
const obsSeries = (days = 3, start = '2026-11-01', wet = []) => {
    const t0 = Date.parse(start + 'T00:00:00Z');
    return Array.from({ length: days * 24 }, (_, i) => ({ ms: t0 + i * HOUR, temp: 12 + 5 * Math.sin((i / 24) * 2 * Math.PI), wind: 15, precip1h: wet.includes(i) ? 0.6 : 0 }));
};
const NOW = Date.parse('2026-11-04T00:00:00Z');

test('METAR: chuva no tempo presente (sem VC, sem nevoeiro)', () => {
    for (const wx of ['-RA', 'RA', '+TSRA', '-SHRA BR', 'DZ', 'FZDZ', 'SN', '-RADZ']) assert.equal(metarWet(wx), true, wx);
    for (const wx of ['VCSH', 'BR', 'FG', 'TS', 'HZ', '', null, undefined]) assert.equal(metarWet(wx), false, String(wx));
});

test('observações por hora: IPMA (precipitação da hora) e METAR (tempo presente na hora)', () => {
    const t = Date.parse('2026-11-01T10:00:00Z');
    const o = hourlyObs([
        { ms: t, temp: 14, wind: 10, precip1h: 0.4 },
        { ms: t + HOUR, temp: 15, wind: 12, precip1h: 0 },
    ], { adjT: -1 });
    assert.equal(o.get(t / HOUR).t, 13);
    assert.equal(o.get(t / HOUR).wet, true);
    assert.equal(o.get(t / HOUR + 1).wet, false);
    const m = hourlyObs([{ ms: t + 30 * 6e4, temp: 14, wet: true }, { ms: t + HOUR, temp: 14, wet: false }, { ms: t + 2 * HOUR, wet: false }]);
    assert.equal(m.get(t / HOUR + 1).wet, true, 'o relatório das 10h30 conta para a hora que acaba às 11h');
    assert.equal(m.get(t / HOUR + 2).wet, false);
    const r = reportObs([{ kind: 'chuva', time: '2026-11-01T10:20:00Z' }, { kind: 'nao-chove', time: '2026-11-01T13:00:00Z' }, { kind: 'nevoeiro', time: '2026-11-01T14:00:00Z' }]);
    assert.equal(r.get(t / HOUR + 1).wet, true);
    assert.equal(r.get(t / HOUR + 3).wet, false);
    assert.equal(r.size, 2);
});

test('temperatura e vento: o modelo certo tem o menor erro; o vento compara-se sem o erro comum', () => {
    const prev = prevRuns({ models: { a: () => 0, b: (i) => 2 + (i % 2 ? 0.5 : -0.5), c: (i) => (i % 3) - 1 } });
    const days = scoreDays(prev, hourlyObs(obsSeries()), { nowMs: NOW });
    const d = days['2026-11-02'];
    assert.ok(d.a.t[1][1] < d.c.t[1][1] && d.c.t[1][1] < d.b.t[1][1], JSON.stringify([d.a.t[1], d.b.t[1], d.c.t[1]]));
    assert.equal(d.a.t[1][0], 24);
    assert.ok(Math.abs(d.b.t[1][2] - 2) < 0.05, 'viés bruto do B');
    // vento: o B sopra 2 km/h a mais; sem o erro comum (mediana dos modelos) fica igual à exposição da estação
    const shifted = scoreDays(prev, hourlyObs(obsSeries().map((o) => ({ ...o, wind: o.wind + 2 }))), { nowMs: NOW });
    assert.ok(Math.abs(shifted['2026-11-02'].a.w[1][1] - d.a.w[1][1]) < 0.05, 'a exposição da estação não muda a ordem');
    // temperatura numa estação pouco representativa: também sem o erro comum
    const c = scoreDays(prev, hourlyObs(obsSeries().map((o) => ({ ...o, temp: o.temp + 3 }))), { nowMs: NOW, centerT: true });
    assert.ok(c['2026-11-02'].a.t[1][1] < c['2026-11-02'].b.t[1][1]);
});

test('chuva: acertos com tolerância de 1 h, falhas, falsos alarmes e atraso típico', () => {
    const base = 24 + 10; // dia 2, 10h
    const wet = [base, base + 1, base + 2];
    const prev = prevRuns({ models: { a: () => 0, b: () => 0, c: () => 0 }, rain: { a: wet, b: [base + 3, base + 4, base + 5] } });
    const days = scoreDays(prev, hourlyObs(obsSeries(3, '2026-11-01', wet)), { nowMs: NOW, vars: 'r' });
    const d = days['2026-11-02'];
    assert.deepEqual(d.a.r[0], [6, 0, 0], 'A acerta tudo (6 horas com chuva observada ou prevista)');
    assert.equal(d.b.r[0][1], 0.67, 'B: 2 falhas + 2 falsos alarmes em 6 horas');
    assert.equal(d.c.r[0][1], 0.5, 'C: 3 falhas');
    assert.equal(d.c.r[0][2], -0.5, 'C dá chuva a menos');
    assert.equal(d.b.g[0], 3, 'B chega 3 h tarde');
    assert.equal(d.a.g[0], 0);
    assert.equal(days['2026-11-01'], undefined, 'dia seco sem previsão de chuva: sem prova');
});

test('várias estações e avisos: junta pesando a confiança e as horas', () => {
    const prev = prevRuns({ models: { a: () => 0, b: () => 1 } });
    const w = learnWindow(prev, {
        stations: [{ w: 1, series: obsSeries() }, { w: 0.5, series: obsSeries().map((o) => ({ ...o, temp: o.temp + 1 })) }],
        reports: [{ kind: 'chuva', time: '2026-11-02T12:00:00Z' }], nowMs: NOW, src: 'IPMA',
    });
    const d = w['2026-11-02'];
    assert.equal(d.h, 24);
    assert.equal(d.src, 'IPMA');
    assert.ok(d.m.a.t[1][1] < d.m.b.t[1][1]);
    assert.equal(d.hr, 1, 'o aviso de chuva conta uma hora com chuva');
    assert.equal(d.m.a.r[0][1], 1, 'ninguém previu a chuva do aviso');
    const c = combineDays([{ w: 1, days: { '2026-11-02': { a: { t: [[10, 1, 0], null, null], r: [null, null, null], w: [null, null, null], g: [null, null, null] } } } },
        { w: 3, days: { '2026-11-02': { a: { t: [[10, 2, 1], null, null], r: [null, null, null], w: [null, null, null], g: [null, null, null] } } } }]);
    assert.deepEqual(c['2026-11-02'].a.t[0], [10, 1.8, 0.8], 'temperatura e vento com 1 casa decimal');
    assert.deepEqual(Object.keys(c['2026-11-02'].a), ['t'], 'sem as listas vazias');
});

// memória sintética: n dias em que A erra 0,8 °C, B 1,6 e C 1,2 (amanhã) — o fator de A cresce com os dias
function memoryOf(n, today = '2026-11-30', maes = { a: 0.8, b: 1.6, c: 1.2 }) {
    const days = {};
    for (let k = 0; k < n; k++) {
        const date = new Date(Date.parse(today + 'T00:00:00Z') - k * 864e5).toISOString().slice(0, 10);
        days[date] = { h: 24, hr: 0, m: Object.fromEntries(Object.entries(maes).map(([id, e]) => [id, { t: [[24, e, 0], [24, e, 0.2], [24, e, 0]], r: [null, null, null], w: [[24, e * 2, 0], null, null], g: [null, null, null] }])) };
    }
    return { v: 1, lat: 41.3, lon: -8.5, days };
}

test('pesos: quem acerta mais ganha peso a cada dia que passa, quem falha perde', () => {
    const ids = ['a', 'b', 'c'];
    const f = (n) => factorsOf(skillOf(memoryOf(n), { today: '2026-11-30' }), ids).fx;
    const f7 = f(7), f30 = f(30), f90 = f(90);
    assert.ok(f7.a.t[1] > 1.4 && f7.a.t[1] < f30.a.t[1] && f30.a.t[1] < f90.a.t[1], `${f7.a.t[1]} < ${f30.a.t[1]} < ${f90.a.t[1]}`);
    assert.ok(f7.b.t[1] < 0.8 && f30.b.t[1] < f7.b.t[1], 'o que falha perde peso');
    assert.ok(Math.abs(f30.c.t[1] - 1) < 1e-9, 'o mediano fica igual');
    assert.ok(f90.a.t[1] <= LEARN.fMax && f90.b.t[1] >= LEARN.fMin);
    // chuva sem prova: parte do fator da temperatura (como antes da aprendizagem); vento com prova própria
    assert.ok(Math.abs(f30.a.r[1] - f30.a.t[1]) < 1e-9);
    assert.ok(f30.a.w[0] > 1);
    // prazo sem verificação no vento (amanhã): o mais perto, a meio caminho
    assert.ok(Math.abs(f30.a.w[1] - Math.sqrt(f30.a.w[0])) < 1e-9);
    // um modelo sem verificação quando os outros a têm fica com 0,7; o IPMA mantém o peso oficial
    const g = factorsOf(skillOf(memoryOf(30), { today: '2026-11-30' }), ['a', 'b', 'c', 'x', 'ipma']).fx;
    assert.equal(g.x.t[1], 0.7);
    assert.equal(g.ipma.t[1], 1);
});

test('dias recentes pesam mais: um modelo que piorou perde peso depressa', () => {
    const mem = memoryOf(60);
    for (const [date, d] of Object.entries(mem.days)) if (date >= '2026-11-24') d.m.a.t[1] = [24, 2.4, 0];
    const s = skillOf(mem, { today: '2026-11-30' });
    const plain = (0.8 * 53 + 2.4 * 7) / 60;
    assert.ok(s.a.t[1].mae > plain, 'a média pesa mais os últimos dias');
    const { fx } = factorsOf(s, ['a', 'b', 'c']);
    assert.ok(fx.a.t[1] < factorsOf(skillOf(memoryOf(60), { today: '2026-11-30' }), ['a', 'b', 'c']).fx.a.t[1]);
});

test('memória: junta por dia (fica o mais completo), corta aos 90 dias e ignora outro ponto', () => {
    const base = memoryOf(95);
    const win = { '2026-11-30': { h: 10, hr: 0, m: { a: { t: [[10, 5, 0], null, null], r: [null, null, null], w: [null, null, null], g: [null, null, null] } } },
        '2026-12-01': { h: 6, hr: 0, m: { a: { t: [[6, 1, 0], null, null], r: [null, null, null], w: [null, null, null], g: [null, null, null] } } } };
    const m = mergeMemory(base, win, { lat: 41.3, lon: -8.5, today: '2026-12-01' });
    assert.equal(Object.keys(m.days).length, 90);
    assert.equal(m.days['2026-11-30'].h, 24, 'o dia mais completo fica');
    assert.equal(m.days['2026-12-01'].h, 6);
    assert.ok(!m.days['2026-09-02'], 'mais de 90 dias sai');
    const far = mergeMemory(base, win, { lat: 38.7, lon: -9.1, today: '2026-12-01' });
    assert.equal(Object.keys(far.days).length, 2, 'memória de outro sítio não entra');
    assert.deepEqual(memoryInfo(m), { days: 90, since: '2026-09-03', rainDays: 0 });
    // juntar duas vezes a mesma janela não muda nada
    assert.deepEqual(mergeMemory(m, win, { lat: 41.3, lon: -8.5, today: '2026-12-01', now: 0 }).days, mergeMemory(m, [win, win], { lat: 41.3, lon: -8.5, today: '2026-12-01', now: 0 }).days);
});

test('fator por antecedência: transição suave entre prazos e perde força depois de 3 dias', () => {
    const arr = [2, 1.5, 1.2];
    assert.equal(factorAt(arr, 0), 2);
    assert.equal(factorAt(arr, 36), 1.5);
    assert.equal(factorAt(arr, 60), 1.2);
    assert.ok(factorAt(arr, 24) < 2 && factorAt(arr, 24) > 1.5);
    assert.ok(factorAt(arr, 240) < 1.2 && factorAt(arr, 240) >= Math.sqrt(1.2));
    assert.equal(factorAt(null, 10), 1);
});

test('evolução: o peso do melhor sobe dia a dia', () => {
    const h = learnHistory(memoryOf(20), ['a', 'b', 'c']);
    assert.equal(h.length, 20);
    assert.ok(h[19].f.a > h[5].f.a && h[5].f.a > h[0].f.a, h.map((x) => x.f.a).join(','));
});

test('evolução: o último dia dá o mesmo fator que o consenso usa hoje (mesma referência: todos os modelos)', () => {
    const mem = memoryOf(30);
    const ids = ['a', 'b', 'c'];
    const last = learnHistory(mem, ids).at(-1);
    const { fx } = factorsOf(skillOf(mem, { today: '2026-11-30' }), ids);
    for (const id of ids) assert.equal(last.f[id], Math.round(fx[id].t[1] * 100) / 100);
});
