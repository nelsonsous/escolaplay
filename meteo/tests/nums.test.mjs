// Os números do Claude verificados contra o observado e contra o consenso da mesma altura; o peso de cada variável na
// mistura (lib/nums.js) e o que se observou em cada dia nas estações (lib/engine.js: observedDays).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verifyNumbers, numbersSkill, claudeWeights, numbersReport, NUMS } from '../lib/nums.js';
import { observedDays } from '../lib/engine.js';

const num = (data, tmax, tmin, chuva, rajada = 30) => ({ data, tmax, tmin, chuva, rajada });
const issue = (generatedAt, numeros, consenso) => ({ generatedAt, numeros, consenso });

test('verificação: cada dia observado fica com os números do Claude e os do consenso, por prazo (a última análise de cada um)', () => {
    const issues = [
        // véspera de manhã e à tarde: vale a da tarde (a última desse prazo)
        issue('2026-11-12T07:40:00Z', [num('2026-11-12', 17, 14, 20), num('2026-11-13', 18, 14, 10)], [num('2026-11-12', 16, 14, 30), num('2026-11-13', 16, 13, 20)]),
        issue('2026-11-12T17:40:00Z', [num('2026-11-13', 17.5, 14.5, 12), num('2026-11-14', 17, 13, 5)], [num('2026-11-13', 16.5, 14, 25), num('2026-11-14', 16, 13, 9)]),
        // no próprio dia: só a de antes do meio-dia conta
        issue('2026-11-13T07:40:00Z', [num('2026-11-13', 17, 14.6, 15)], [num('2026-11-13', 17.1, 14.6, 28)]),
        issue('2026-11-13T13:59:00Z', [num('2026-11-13', 30, 30, 99)], [num('2026-11-13', 30, 30, 99)]),
        // sem o consenso guardado (análises antigas): não dá para comparar
        issue('2026-11-11T17:40:00Z', [num('2026-11-13', 16, 13, 30)], null),
    ];
    const observed = [{ date: '2026-11-13', tmax: 17.4, tmin: 14.8, rain: 14, nR: 3 }, { date: '2026-11-12', tmax: 17.6, tmin: 15, rain: 15.2, nR: 1 }, { date: '2026-11-10', tmax: 19, tmin: 15, rain: 2, nR: 3 }];
    const mem = verifyNumbers(null, issues, observed, { today: '2026-11-14' });
    assert.deepEqual(Object.keys(mem.days), ['2026-11-12', '2026-11-13']);
    const d = mem.days['2026-11-13'];
    assert.deepEqual(d.o, { tmax: 17.4, tmin: 14.8, chuva: 14 });
    assert.deepEqual(Object.keys(d.f), ['0', '1']);
    assert.deepEqual(d.f[1], { at: '2026-11-12T17:40:00Z', c: { tmax: 17.5, tmin: 14.5, chuva: 12 }, m: { tmax: 16.5, tmin: 14, chuva: 25 } });
    assert.equal(d.f[0].at, '2026-11-13T07:40:00Z', 'a das 13:59 (depois do meio-dia) não conta para o próprio dia');
    // 12/11: a chuva só de 1 pluviómetro não verifica; a temperatura sim
    assert.deepEqual(mem.days['2026-11-12'].o, { tmax: 17.6, tmin: 15, chuva: null });
    // juntar mais tarde: o que já lá estava fica, o dia novo entra; mais de 90 dias sai
    const mem2 = verifyNumbers({ v: 1, days: { ...mem.days, '2026-07-01': { o: { tmax: 30 }, f: {} } } },
        [issue('2026-11-13T17:40:00Z', [num('2026-11-14', 17, 13.5, 6)], [num('2026-11-14', 16.8, 13.7, 9)])], [{ date: '2026-11-14', tmax: 17.2, tmin: 13.4, rain: 5, nR: 2 }], { today: '2026-11-15' });
    assert.deepEqual(Object.keys(mem2.days), ['2026-11-12', '2026-11-13', '2026-11-14']);
    assert.deepEqual(mem2.days['2026-11-13'], d);
    // fuso: uma análise às 23:30 UTC de dia 12 em UTC+1 já é dia 13 (prazo 0, antes do meio-dia)
    const tz = verifyNumbers(null, [issue('2026-11-12T23:30:00Z', [num('2026-11-13', 10, 5, 0)], [num('2026-11-13', 11, 5, 0)])], [{ date: '2026-11-13', tmax: 10, tmin: 5, rain: 0, nR: 2 }], { off: 3600 });
    assert.deepEqual(Object.keys(tz.days['2026-11-13'].f), ['0']);
});

test('peso do Claude: parte de 50%; sobe quando erra menos do que os modelos, desce quando erra mais; sempre entre 20% e 80%', () => {
    assert.deepEqual(claudeWeights(null), { rajada: 0.5, tmax: 0.5, tmin: 0.5, chuva: 0.5, n: 0 });
    const mem = (n, c, m, o = { tmax: 17, tmin: 14, chuva: 16 }) => ({ v: 1, days: Object.fromEntries(Array.from({ length: n }, (_, i) => [`2026-11-${String(10 + i).padStart(2, '0')}`, { o, f: { 1: { at: 'x', c, m } } }])) });
    // 6 dias (todos no mesmo dia de referência não: os mais antigos pesam um pouco menos) em que o Claude erra 0,5 °C e os modelos 1,5 °C
    const good = mem(6, { tmax: 17.5, tmin: 14, chuva: 16 }, { tmax: 18.5, tmin: 14, chuva: 16 });
    const sk = numbersSkill(good, { today: '2026-11-16' });
    assert.deepEqual([sk.tmax.claude, sk.tmax.modelos, sk.tmax.amostras], [0.5, 1.5, 6]);
    assert.deepEqual([sk.tmax.vies.claude, sk.tmax.vies.modelos], [0.5, 1.5]);
    const w = claudeWeights(good, { today: '2026-11-16' });
    assert.ok(w.tmax > 0.57 && w.tmax < 0.62, `com 6 dias vai a meio caminho de 69%: ${w.tmax}`);
    assert.deepEqual([w.tmin, w.chuva, w.rajada, w.n], [0.5, 0.5, 0.5, 6], 'iguais na mínima e na chuva: a meias; as rajadas não se verificam');
    // 1 dia só: quase não mexe; 40 dias: perto do valor dos dados, mas nunca fora de 20%–80%
    const one = claudeWeights(mem(1, { tmax: 17.5 }, { tmax: 18.5 }), { today: '2026-11-11' }).tmax;
    assert.ok(one > 0.5 && one < 0.54, String(one));
    const many = (c, m) => claudeWeights({ v: 1, days: Object.fromEntries(Array.from({ length: 40 }, (_, i) => [new Date(Date.UTC(2026, 9, 1 + i)).toISOString().slice(0, 10), { o: { tmax: 17, chuva: 16 }, f: { 1: { at: 'x', c, m } } }])) }, { today: '2026-11-10' });
    assert.equal(many({ tmax: 17 }, { tmax: 25 }).tmax, NUMS.wMax);
    assert.equal(many({ tmax: 25 }, { tmax: 17 }).tmax, NUMS.wMin);
    // a chuva compara-se na raiz: 4 mm de erro em 16 mm contam menos do que em 1 mm
    const rain = many({ chuva: 9 }, { chuva: 36 }); // raízes 3 e 6 contra 4: erro 1 e 2
    assert.ok(rain.chuva > 0.55 && rain.chuva < 0.64, String(rain.chuva));
    // o relatório para o Claude: uma linha por dia e prazo, e o peso atual
    const rep = numbersReport(good, { today: '2026-11-16' });
    assert.match(rep[0], /^dia \(prazo\) \| máxima: tu \/ modelos → observado/);
    assert.match(rep[1], /^2026-11-10 \(na véspera\) \| 17\.5 \/ 18\.5 → 17\.0 \| 14\.0 \/ 14\.0 → 14\.0 \| 16\.0 \/ 16\.0 → 16\.0$/);
    assert.match(rep.at(-1), /máxima: tu 0\.5 °C, modelos 1\.5 → peso (5[89]|6[01])%/);
    assert.match(numbersReport(null)[0], /^Ainda sem números verificados/);
});

test('observado em cada dia: máxima, mínima (à altitude do ponto) e chuva das estações; uma estação avariada não estraga', () => {
    const H = 36e5, day0 = Date.parse('2026-11-12T00:00:00Z');
    // 3 estações durante 2 dias: temperatura a oscilar entre 10° e 18°; chuva 0,5 mm/h (uma dá sempre 0: avariada)
    const series = (bias, mmh) => Array.from({ length: 48 }, (_, i) => ({ ms: day0 + i * H, temp: 14 + bias + 4 * Math.sin(((i % 24) - 9) / 24 * 2 * Math.PI), precip1h: mmh }));
    const st = [{ w: 3, series: series(0, 0.5), adjT: 0 }, { w: 2, series: series(-1, 0.6), adjT: 1 }, { w: 1, series: series(3, 0), adjT: 0 }];
    const d = observedDays(st, { nowMs: day0 + 48 * H });
    assert.deepEqual(d.map((x) => x.date), ['2026-11-12', '2026-11-13']);
    assert.deepEqual([d[0].tmax, d[0].tmin, d[0].nT], [18, 10, 3], 'a mediana: a estação 3 °C mais quente não puxa');
    assert.deepEqual([d[0].rainLo, d[0].rainHi, d[0].nR], [0, 14.4, 3], 'a avariada fica só no intervalo');
    assert.ok(d[0].rain >= 12 && d[0].rain <= 13, `a mediana ponderada das 3 (12 a 13 mm; a média seria 10,8): ${d[0].rain}`);
    // um dia com menos de 20 horas não conta; uma só estação longe (não representativa) não dá temperatura
    const part = observedDays([{ w: 1, series: series(0, 0.5).slice(0, 30), adjT: 0, centerT: true }], { nowMs: day0 + 48 * H });
    assert.deepEqual(part.map((x) => [x.date, x.tmax, x.rain]), [['2026-11-12', null, 12]]);
    assert.equal(observedDays([{ w: 1, series: series(0, 0.5), adjT: 0, centerT: false }], { nowMs: day0 + 48 * H })[0].tmax, 18, 'perto e à mesma altitude: conta');
    // o METAR (de meia em meia hora, sem pluviómetro) dá temperatura mas não chuva; fuso UTC+1: o dia local começa às 23:00 UTC
    const metar = Array.from({ length: 96 }, (_, i) => ({ ms: day0 + i * H / 2, temp: 15, wet: true }));
    const m = observedDays([{ w: 1, series: metar, adjT: 0, centerT: false }], { nowMs: day0 + 48 * H, off: 3600 });
    assert.deepEqual(m.map((x) => [x.date, x.tmax, x.rain, x.nR]), [['2026-11-12', 15, null, 0], ['2026-11-13', 15, null, 0]]);
    assert.deepEqual(observedDays([], {}), []);
});
