// O céu do cartão «Agora» como campo da Onda (onda/ceu.onda → GLSL na placa gráfica). Aqui: os números que a app lhe
// passa para cada tempo e, com o compilador da Onda (onda/build/ondac), a mesma função na CPU (WebAssembly) — o que cada
// cena desenha — e que o onda/ceu-glsl.js gerado está em dia com o ceu.onda.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { skyParams, skyHtml } from '../sky.js';
import { CEU_GLSL } from '../onda/ceu-glsl.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ONDAC = path.join(HERE, '../../onda/build/ondac');
const FONTE = path.join(HERE, '../onda/ceu.onda');
const semOndac = existsSync(ONDAC) ? false : 'sem onda/build/ondac (sh onda/build.sh)';

test('céu da Onda: os números de cada tempo (chuva, neve, nuvens, vento e os bits do modo)', () => {
    const bits = (m) => ['dia', 'brilho', 'nevoeiro', 'relampago', 'granizo', 'escuro', 'morrinha'].filter((_, k) => m & (1 << k));
    const [r, s, c, v, m] = skyParams(61, true, 20);
    assert.deepEqual([+r.toFixed(3), s, c, v], [0.413, 0, 1, 0.25]);
    assert.deepEqual(bits(m), ['dia']);
    assert.equal(skyParams(65, true, 0)[0], 1, 'chuva forte: o máximo');
    assert.ok(skyParams(63, true, 0)[0] > skyParams(61, true, 0)[0], 'mais chuva, mais gotas');
    assert.deepEqual(bits(skyParams(51, true, 0)[4]), ['dia', 'morrinha']);
    assert.equal(skyParams(51, true, 0)[0], 0.6, 'morrinha: muitas gotas curtas');
    assert.deepEqual(bits(skyParams(0, false, 0)[4]), ['brilho'], 'noite limpa: a lua (e as estrelas)');
    assert.deepEqual(bits(skyParams(95, false, 0)[4]), ['relampago', 'escuro']);
    assert.deepEqual(bits(skyParams(96, true, 0)[4]), ['dia', 'relampago', 'granizo', 'escuro']);
    assert.deepEqual(bits(skyParams(45, true, 0)[4]), ['dia', 'nevoeiro']);
    assert.ok(skyParams(75, true, 0)[1] === 1 && skyParams(71, true, 0)[1] < 1, 'neve forte: o máximo');
    assert.equal(skyParams(0, true, 200)[3], 1, 'vento: até 80 km/h');
    assert.equal(skyParams(0, true, NaN)[3], 0);
    // o HTML do céu leva os números (a casca lê-os de data-p)
    assert.match(skyHtml(61, true, { wind: 20 }), /data-p="0\.413,0,1,0\.25,1"/);
});

test('céu da Onda: o GLSL gerado está em dia com o ceu.onda e lê os 8 uniformes', { skip: semOndac }, () => {
    const glsl = execFileSync(ONDAC, ['-g', 'ceu'], { input: readFileSync(FONTE) }).toString();
    const min = glsl.split('\n').map((l) => l.trim()).filter(Boolean).reduce((a, l) => a + (l.startsWith('#') ? `\n${l}\n` : l), '').trim();
    assert.equal(CEU_GLSL, min, 'corre node meteo/onda/build.mjs');
    assert.match(CEU_GLSL, /^#version 300 es\n/);
    assert.match(CEU_GLSL, /f_ceu\(floor\(gl_FragCoord\.x\),u\[2\]-1\.0-floor\(gl_FragCoord\.y\),u\[0\],u\[1\],u\[2\],u\[3\],u\[4\],u\[5\],u\[6\],u\[7\]\)/);
});

// a mesma função na CPU: imagens pequenas (120 × 80) de cada cena
function campo() {
    const wasm = execFileSync(ONDAC, ['-w', 'ceu'], { input: readFileSync(FONTE) });
    let mem;
    const sys = (c, a) => {
        if (Number(c) === 2) throw { ondaExit: Number(a) };
        if (Number(c) === 7) { const need = (Number(a) + 16) * 8, cur = mem.buffer.byteLength; if (need > cur) mem.grow(Math.ceil((need - cur) / 65536)); return BigInt(mem.buffer.byteLength / 8 - 16); }
        return 0n;
    };
    const m1 = (c, x) => [Math.sin, Math.cos, Math.exp, Math.log][Number(c)](x);
    const m2 = (c, x, y) => (Number(c) === 0 ? Math.pow(x, y) : Math.atan2(x, y));
    const X = new WebAssembly.Instance(new WebAssembly.Module(wasm), { env: { sys, m1, m2 } }).exports;
    mem = X.memory;
    return (p, t = 3, W = 120, H = 80) => {
        const px = [];
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
            const c = Number(X.ceu(x, y, t, W, H, ...p));
            px.push([(c >> 16) & 255, (c >> 8) & 255, c & 255]);
        }
        return { px, W, H, at: (x, y) => px[y * W + x] };
    };
}
const conta = (img, f, y0 = 0, y1 = img.H) => { let n = 0; for (let y = y0; y < y1; y++) for (let x = 0; x < img.W; x++) if (f(img.at(x, y))) n++; return n; };
const azul = ([r, g, b]) => b > 60 && b > r + 30; // as gotas (o brilho da lua é azulado, mas fraco)
const soma = ([r, g, b]) => r + g + b;

test('céu da Onda na CPU: cada cena desenha o que deve, só com luz (preto onde não há nada)', { skip: semOndac }, () => {
    const ceu = campo();
    // noite sem nada (sem brilho, sem nuvens): tudo preto — o modo «screen» não mexe no cartão
    assert.equal(conta(ceu([0, 0, 0, 0, 0]), (c) => soma(c) > 0), 0);
    // sol: quente no canto de cima à direita, preto em baixo à esquerda
    const sol = ceu([0, 0, 0, 0, 1 | 2]);
    const [r, g, b] = sol.at(110, 2);
    assert.ok(r > 60 && r > b * 2 && g > b, `sol quente: ${[r, g, b]}`);
    assert.equal(soma(sol.at(5, 75)), 0);
    // lua e estrelas: pontos claros espalhados em cima, nada azul a cair
    const noite = ceu([0, 0, 0, 0, 2], 3, 360, 240);
    const estrelas = conta(noite, ([r, g, b]) => r > 120 && g > 120 && b > 120, 0, 150);
    assert.ok(estrelas >= 8, `estrelas: ${estrelas}`);
    assert.equal(conta(noite, azul), 0);
    // chuva forte: gotas azuis discretas (o ícone do tempo é o sinal principal), nenhuma por cima do ícone (canto de
    // cima à direita) e mais suaves por trás do texto de baixo
    const chuva = ceu([1, 0, 1, 0.5, 1], 3, 360, 240);
    const cima = conta(chuva, azul, 0, 110), baixo = conta(chuva, azul, 170, 240);
    assert.ok(cima > 50 && cima > baixo, `gotas: ${cima} em cima, ${baixo} em baixo`);
    let noIcone = 0, maxAzul = 0;
    for (let y = 0; y < 240; y++) for (let x = 0; x < 360; x++) {
        const c = chuva.at(x, y);
        maxAzul = Math.max(maxAzul, c[2]);
        if (azul(c) && Math.hypot(x - (360 - 62), y - 63) < 50) noIcone++;
    }
    assert.equal(noIcone, 0, 'à volta do ícone não chove');
    assert.ok(maxAzul < 180, `discretas: azul no máximo ${maxAzul}`);
    // o modo leva também os píxeis por ponto (×4, de 128 para cima): com 2 píxeis por ponto, o ícone fica no dobro
    const dobro = ceu([1, 0, 1, 0.5, 1 + 128 * 8], 3, 720, 480);
    let perto = 0;
    for (let y = 0; y < 480; y++) for (let x = 0; x < 720; x++) if (azul(dobro.at(x, y)) && Math.hypot(x - (720 - 124), y - 126) < 100) perto++;
    assert.equal(perto, 0);
    // a chuva cai: noutro instante, as gotas estão noutro sítio; no mesmo instante, a mesma imagem
    const chuva2 = ceu([1, 0, 1, 0.5, 1], 3.2, 360, 240);
    assert.deepEqual(ceu([1, 0, 1, 0.5, 1], 3, 360, 240).px, chuva.px);
    assert.ok(chuva.px.some((c, i) => azul(c) !== azul(chuva2.px[i])));
    // neve: flocos claros (não azuis)
    const neve = ceu([0, 1, 0, 0, 1], 3, 360, 240);
    assert.ok(conta(neve, ([r, g, b]) => r > 110 && b > 110, 0, 140) > 40);
    assert.equal(conta(neve, azul), 0);
    // relâmpago: um clarão por volta dos 91 % de cada 9 s
    const raio = (t) => soma(ceu([0, 0, 0, 0, 8], t).at(84, 3));
    assert.ok(raio(9 * 0.91) > 150 && raio(9 * 0.5) === 0, `${raio(9 * 0.91)} / ${raio(9 * 0.5)}`);
    // mais nuvens, mais céu tapado; o nevoeiro acende faixas
    const tapado = (n) => conta(ceu([0, 0, n, 0, 1]), (c) => soma(c) > 40);
    assert.ok(tapado(1) > tapado(1 / 3) && tapado(1 / 3) > 0, `${tapado(1)} > ${tapado(1 / 3)}`);
    assert.ok(conta(ceu([0, 0, 0, 0, 1 | 4]), (c) => soma(c) > 40) > 500);
});
