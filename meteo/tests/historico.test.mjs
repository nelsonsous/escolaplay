// Histórico (D1): as instruções de lib/historico.js corridas no esquema real (proxy/historico.sql), em SQLite.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fakeD1 } from './fixtures/d1.mjs';
import { analysisRows, observedRows, runD1, readHistory, latestAnalysis, newest } from '../lib/historico.js';

const SCHEMA = new URL('../proxy/historico.sql', import.meta.url);
const doc = (at, over = {}) => ({
    titulo: 'Chuva no domingo', resumo: 'Tarde seca; domingo chuva forte.', generatedAt: at, by: 'claude-agendado', model: 'claude',
    place: { id: 'casa', name: 'Santo Tirso', lat: 41.34, lon: -8.47 },
    numeros: [{ data: '2026-11-14', tmax: 17.5, tmin: 9, chuva: 0, rajada: 30 }, { data: '2026-11-15', tmax: 15, tmin: 11, chuva: 25, rajada: 55 }],
    consenso: [{ data: '2026-11-14', tmax: 17, tmin: 9.4, chuva: 0.2, rajada: 28 }, { data: '2026-11-15', tmax: 14.6, tmin: 11.2, chuva: 31, rajada: 60 }],
    pesos: { tmax: 0.5, tmin: 0.5, chuva: 0.4, rajada: 0.5 }, ...over,
});

test('cada análise fica guardada com os números dia a dia e o consenso da mesma corrida; publicar de novo não duplica', async () => {
    const db = fakeD1(SCHEMA);
    const rows = analysisRows(doc('2026-11-14T14:20:00.000Z'));
    assert.equal(rows.length, 3);
    assert.equal(await runD1(db, rows), 3);
    await runD1(db, analysisRows(doc('2026-11-14T14:20:00.000Z')));
    assert.equal(db.rows('SELECT count(*) AS n FROM analises')[0].n, 1);
    const n = db.rows('SELECT dia, prazo, tmax, c_tmax, chuva, c_chuva FROM numeros ORDER BY dia');
    assert.deepEqual(n, [{ dia: '2026-11-14', prazo: 0, tmax: 17.5, c_tmax: 17, chuva: 0, c_chuva: 0.2 }, { dia: '2026-11-15', prazo: 1, tmax: 15, c_tmax: 14.6, chuva: 25, c_chuva: 31 }]);
    const a = db.rows('SELECT nome, por, titulo, pesos, doc FROM analises')[0];
    assert.equal(a.nome, 'Santo Tirso');
    assert.equal(JSON.parse(a.pesos).chuva, 0.4);
    assert.equal(JSON.parse(a.doc).resumo, 'Tarde seca; domingo chuva forte.');
    // uma análise nova não substitui a anterior (é isto que o KV não guardava)
    await runD1(db, analysisRows(doc('2026-11-14T20:05:00.000Z')));
    assert.equal(db.rows('SELECT count(*) AS n FROM analises')[0].n, 2);
    // o prazo conta-se no dia de Lisboa: às 23:30 de 14/11 (UTC) em Lisboa ainda é 14/11 no inverno
    assert.equal(analysisRows(doc('2026-11-14T23:30:00.000Z'))[1].params[3], 0);
    // sem local ou sem hora, nada
    assert.deepEqual(analysisRows({ ...doc('2026-11-14T14:20:00.000Z'), place: { id: null } }), []);
    assert.deepEqual(analysisRows({ place: { id: 'casa' } }), []);
});

test('o observado: só dias acabados e com medições; volta a gravar-se com mais estações; a vista acertos dá o erro', async () => {
    const db = fakeD1(SCHEMA);
    await runD1(db, analysisRows(doc('2026-11-14T07:40:00.000Z')));
    const days = [
        { date: '2026-11-14', tmax: 17.1, tmin: 9.2, nT: 3, rain: 0, rainLo: 0, rainHi: 0.2, nR: 4, model: { tmax: 16.8, tmin: 9.5, rain: 0.4 } },
        { date: '2026-11-15', tmax: 14, tmin: 10.8, nT: 3, rain: 22.4, rainLo: 18, rainHi: 27, nR: 2, model: { tmax: 14.9, tmin: 11, rain: 30 } },
        { date: '2026-11-16', tmax: 12, tmin: 8, nT: 1, rain: 3, nR: 1 },          // hoje: ainda não acabou
        { date: '2026-11-13', tmax: null, tmin: null, rain: null },              // sem medições
    ];
    const rows = observedRows('casa', days, { today: '2026-11-16', at: '2026-11-16T08:00:00Z' });
    assert.equal(rows.length, 2);
    await runD1(db, rows);
    // mais um pluviómetro chegou: o 15/11 fica com o valor novo (uma linha por dia)
    await runD1(db, observedRows('casa', [{ ...days[1], rain: 24, nR: 3 }], { today: '2026-11-16' }));
    assert.deepEqual(db.rows("SELECT dia, chuva, n_chuva, v_chuva FROM observado WHERE dia = '2026-11-15'"), [{ dia: '2026-11-15', chuva: 24, n_chuva: 3, v_chuva: 30 }]);
    const ac = db.rows('SELECT dia, prazo, erro_tmax, erro_c_tmax, erro_chuva, erro_c_chuva FROM acertos ORDER BY dia');
    assert.deepEqual(ac, [
        { dia: '2026-11-14', prazo: 0, erro_tmax: 0.4, erro_c_tmax: -0.1, erro_chuva: 0, erro_c_chuva: 0.2 },
        { dia: '2026-11-15', prazo: 1, erro_tmax: 1, erro_c_tmax: 0.6, erro_chuva: 1, erro_c_chuva: 7 },
    ]);
});

test('a leitura do histórico: análises recentes primeiro e, por dia, o previsto e o medido', async () => {
    const db = fakeD1(SCHEMA);
    await runD1(db, [...analysisRows(doc('2026-11-14T07:40:00.000Z')), ...analysisRows(doc('2026-11-14T14:20:00.000Z')),
        ...analysisRows({ ...doc('2026-11-14T08:00:00.000Z'), place: { id: 'outro', name: 'Outro' } }),
        ...observedRows('casa', [{ date: '2026-11-14', tmax: 17.1, tmin: 9.2, rain: 0 }, { date: '2026-11-12', tmax: 19, tmin: 8, rain: 0 }], { today: '2026-11-16' })]);
    const h = await readHistory(db, 'casa', { days: 30, now: Date.parse('2026-11-16T10:00:00Z') });
    assert.deepEqual(h.analises.map((a) => a.gerada_em), ['2026-11-14T14:20:00.000Z', '2026-11-14T07:40:00.000Z']);
    assert.deepEqual(h.dias.map((d) => [d.dia, d.previsto.length, d.observado?.tmax ?? null]), [['2026-11-12', 0, 19], ['2026-11-14', 2, 17.1], ['2026-11-15', 2, null]]);
    // só os últimos N dias
    assert.equal((await readHistory(db, 'casa', { days: 1, now: Date.parse('2026-11-16T10:00:00Z') })).analises.length, 0);
});

test('caixa de correio: a última análise do local (o documento inteiro) e a mais recente de duas', async () => {
    const db = fakeD1(SCHEMA);
    assert.equal(await latestAnalysis(db, 'casa'), null);
    await runD1(db, [...analysisRows(doc('2026-11-14T07:40:00.000Z')), ...analysisRows(doc('2026-11-14T14:20:00.000Z', { titulo: 'A última' }))]);
    const a = await latestAnalysis(db, 'casa');
    assert.equal(a.titulo, 'A última');
    assert.deepEqual(a.numeros, doc('x').numeros, 'o documento volta tal como foi publicado');
    assert.equal(await latestAnalysis(null, 'casa'), null);
    const kv = { titulo: 'KV', generatedAt: '2026-11-14T15:00:00.000Z' };
    assert.equal(newest(a, kv).titulo, 'KV');
    assert.equal(newest(a, { ...kv, generatedAt: '2026-11-13T00:00:00Z' }).titulo, 'A última');
    assert.equal(newest(null, kv).titulo, 'KV');
    assert.equal(newest(a, null).titulo, 'A última');
    assert.equal(newest(null, null), null);
});
