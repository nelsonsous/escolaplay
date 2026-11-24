// 1.31 (pedido do dono): «Próximas 2 horas» e «Próximas horas» diziam coisas diferentes para a mesma hora (0,6 mm em 15 min,
// ~2,4 mm/h com o radar, e 3,6 mm na hora só dos modelos). As horas cobertas pelos passos de 15 min passam a ter a soma deles.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { alignHourly, buildForecast, withReport } from '../lib/engine.js';

const off = 0;
const loc = { lat: 41.7759, lon: -8.3739, utcOffsetSeconds: off };
// passos de 15 min das 08:45 às 10:30 (cada um é o período que acaba à sua hora, como no Open-Meteo), 0,6 mm e 90%
const steps = ['08:45', '09:00', '09:15', '09:30', '09:45', '10:00', '10:15', '10:30'].map((t) => ({ time: `2026-11-24T${t}`, precip: 0.6, prob: 90 }));
const hour = (t, precip, precipHi, pop) => ({ time: `2026-11-24T${t}`, precip, precipHi, pop, code: 61 });
const fc0 = () => ({ location: loc, nowcast: { steps }, hourly: [hour('08:00', 0.2, 0.5, 40), hour('09:00', 3.6, 5.0, 83), hour('10:00', 2.0, 3.0, 70), hour('11:00', 1.6, 2.4, 60), hour('12:00', 1.0, 2.0, 50)] });

test('as horas cobertas pelas próximas 2 horas: a soma dos passos; a parte por cobrir fica com os modelos', () => {
    const fc = alignHourly(fc0());
    const by = Object.fromEntries(fc.hourly.map((h) => [h.time.slice(11), h]));
    assert.deepEqual([by['08:00'].precip, by['08:00'].nc], [0.2, undefined], 'antes dos passos: como estava');
    // 09:00 = das 08:00 às 09:00: os passos das 08:45 e 09:00 (2 de 4) + metade da hora dos modelos (1,8)
    assert.deepEqual([by['09:00'].precip, by['09:00'].precipHi, by['09:00'].pop, by['09:00'].nc], [3, 4.2, 90, 2]);
    // 10:00 = das 09:00 às 10:00: os 4 passos (2,4 mm); o «até» na mesma proporção (×1,2)
    assert.deepEqual([by['10:00'].precip, by['10:00'].precipHi, by['10:00'].pop, by['10:00'].nc], [2.4, 3.6, 90, 4]);
    // 11:00: os passos das 10:15 e 10:30 + metade dos modelos (0,8)
    assert.deepEqual([by['11:00'].precip, by['11:00'].nc], [2, 2]);
    assert.deepEqual([by['12:00'].precip, by['12:00'].nc], [1, undefined], 'depois dos passos: como estava');
    // guarda o dos modelos: alinhar outra vez (por exemplo, com o aviso de quem lá está) parte dele, não do já alinhado
    assert.deepEqual(by['09:00'].model, { precip: 3.6, precipHi: 5.0, pop: 83 });
    const again = alignHourly({ ...fc, nowcast: { steps: steps.map((s) => ({ ...s, precip: 0, prob: 3 })) } });
    const h9 = again.hourly.find((h) => h.time.endsWith('09:00'));
    assert.deepEqual([h9.precip, h9.pop], [1.8, 42], '«Não chove» nos passos: só fica a metade dos modelos');
    assert.equal(alignHourly({ hourly: fc0().hourly }).hourly[1].precip, 3.6, 'sem passos: nada muda');
});

test('na previsão: as horas que as próximas 2 horas cobrem por inteiro somam os passos (radar e modelos, ou o aviso)', () => {
    const raw = JSON.parse(readFileSync(new URL('./fixtures/lisboa-2026-11-06.json', import.meta.url), 'utf8'));
    const fc = buildForecast(raw, { lat: 38.7223, lon: -9.1393, now: '2026-11-06T15:45:00Z' });
    const ms = (t) => Date.parse(t + ':00Z') - (fc.location.utcOffsetSeconds || 0) * 1000;
    const full = fc.hourly.filter((h) => h.nc === 4);
    assert.ok(full.length >= 1, 'pelo menos uma hora inteira coberta');
    for (const h of full) {
        const sum = fc.nowcast.steps.filter((s) => ms(s.time) > ms(h.time) - 36e5 && ms(s.time) <= ms(h.time)).reduce((a, s) => a + s.precip, 0);
        assert.equal(h.precip, Math.round(sum * 10) / 10, h.time);
    }
    // o aviso «Não chove» de agora: as horas cobertas pelos passos ficam sem a chuva desses passos
    const rep = withReport(fc, { kind: 'nao-chove', time: '2026-11-06T15:40:00Z', lat: 38.7223, lon: -9.1393 }, Date.parse('2026-11-06T15:45:00Z'));
    const first = rep.hourly.find((h) => h.nc);
    assert.ok(first.precip <= fc.hourly.find((h) => h.time === first.time).precip, 'com «Não chove», nunca mais chuva do que antes');
});
