// Gráfico da chuva das próximas 2 horas (SVG, sem a Onda): escala, linhas de intensidade e o resumo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderNowcast, rainWord } from '../charts.js';

const steps = (v) => v.map((p, i) => ({ time: `2026-11-10T21:${String(i * 15 % 60).padStart(2, '0')}`, precip: p }));
const draw = (v) => { const root = { textContent: '', innerHTML: '' }; renderNowcast(root, { steps: steps(v) }); return root.innerHTML; };

test('próximas 2 horas: os nomes das linhas vão para o lado onde não está o valor máximo', () => {
    const fim = draw([0, 0, 0, 0, 0, 0.05, 0.08, 0.1]);
    assert.match(fim, /class="guide-l" x="2" text-anchor="start"[^>]*>moderada/, 'máximo no fim: nomes à esquerda');
    const inicio = draw([0.7, 0.1, 0.1, 0, 0, 0, 0, 0]);
    assert.match(inicio, /class="guide-l" x="318" text-anchor="end"[^>]*>moderada/, 'máximo no início: nomes à direita');
    assert.match(inicio, /Máx\. <b>0,7 mm<\/b> em 15 min \(≈ 2,8 mm\/h\): <b>chuva moderada<\/b>/);
    assert.equal(draw([0, 0, 0, 0, 0, 0, 0, 0]).includes('nc-sum'), false, 'sem chuva, sem resumo');
});

test('intensidade da chuva por hora: fraca até 2,5 mm/h, moderada até 10, forte a partir de 10', () => {
    assert.deepEqual([0, 0.4, 2.5, 9.9, 10, 30].map(rainWord), ['sem chuva', 'fraca', 'moderada', 'moderada', 'forte', 'forte']);
});
