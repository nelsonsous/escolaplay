// O gráfico da chuva das próximas 2 horas desenhado pela Onda (onda/chuva.onda → WebAssembly): conta píxeis.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ondaPixels } from '../chuva.js';

const W = 320, H = 88, base = 62;
const alpha = (p) => p >>> 24, blue = (p) => (p >>> 16) & 255, red = (p) => p & 255;
// altura da água em cada coluna: píxeis azuis opacos no centro da barra, da base para cima
function agua(px, n) {
    const slot = W / n;
    return Array.from({ length: n }, (_, k) => {
        const x = Math.round(slot * (k + 0.5));
        let y = base - 1;
        while (y > 0 && alpha(px[y * W + x]) > 200 && blue(px[y * W + x]) > 200) y--;
        return base - 1 - y;
    });
}

test('chuva em Onda: a altura da água segue os mm, sem chuva não há nada, e é azul', () => {
    const v = [0, 0.25, 0.5, 1, 0.5, 0, 0, 0];
    const px = ondaPixels(v, 1, W, H);
    const h = agua(px, v.length);
    assert.equal(h[0], 0); assert.equal(h[5], 0);
    assert.ok(h[1] > 4 && h[2] > h[1] && h[3] > h[2], `alturas ${h}`);
    assert.ok(Math.abs(h[3] - (base - 16)) <= 3, `1 mm (o topo da escala) enche até ao topo: ${h[3]}`);
    assert.ok(Math.abs(h[2] - h[4]) <= 2, 'o mesmo valor, a mesma altura');
    // colunas sem chuva: transparentes de cima a baixo (o SVG por cima põe a linha de base)
    const slot = W / v.length;
    for (const k of [0, 5, 6, 7]) for (let y = 0; y < H; y++) for (let x = Math.ceil(slot * k + 2); x < slot * (k + 1) - 2; x++) assert.equal(alpha(px[y * W + x]), 0, `coluna ${k} (${x},${y})`);
    // a água é azul (mais azul do que vermelho)
    const meio = px[(base - 5) * W + Math.round(slot * 3.5)];
    assert.ok(blue(meio) > 230 && red(meio) < 200, meio.toString(16));
});

test('chuva em Onda: a animação começa vazia e enche; acima da água caem gotas (mais com mais chuva)', () => {
    const v = [0.2, 1, 0, 0];
    const cheio = agua(ondaPixels(v, 1, W, H, 1e6), 4);
    const inicio = agua(ondaPixels([0, 0, 0, 0], 1, W, H, 1e6), 4);
    assert.deepEqual(inicio, [0, 0, 0, 0]);
    const meio = agua(ondaPixels(v, 1, W, H, 120), 4);
    assert.ok(meio[1] > 0 && meio[1] < cheio[1], `a encher: ${meio[1]} < ${cheio[1]}`);
    // gotas: píxeis semitransparentes acima da água; a coluna de 1 mm tem mais do que a de 0,2 mm
    const px = ondaPixels(v, 1, W, H, 1e6), slot = W / 4;
    const gotas = (k, ytopo) => { let c = 0; for (let y = 0; y < ytopo; y++) for (let x = Math.ceil(slot * k); x < slot * (k + 1); x++) { const a = alpha(px[y * W + x]); if (a > 20 && a < 250) c++; } return c; };
    assert.ok(gotas(1, 14) > gotas(0, 14) && gotas(0, 14) >= 0, `${gotas(1, 14)} > ${gotas(0, 14)}`);
});
