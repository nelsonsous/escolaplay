// O céu animado do cartão «Agora» (sky.js) e os ícones com peças que mexem (icons.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { skyScene, skyHtml } from '../sky.js';
import { weatherIcon, weatherIconInner } from '../icons.js';

const count = (h, cls) => (h.match(new RegExp(`class="${cls}[ "]`, 'g')) || []).length;

test('céu: o que se mostra para cada tempo (mais chuva, mais gotas; noite limpa com estrelas; trovoada com relâmpago)', () => {
    assert.deepEqual([skyScene(0, true).glow, skyScene(0, true).stars, skyScene(0, false).stars], [true, 0, 24]);
    assert.deepEqual([61, 63, 65].map((c) => skyScene(c).rain), [95, 150, 230]);
    assert.deepEqual([71, 73, 75].map((c) => skyScene(c).snow), [12, 18, 26]);
    assert.deepEqual([skyScene(3).clouds, skyScene(3).rain, skyScene(45).fog], [3, 0, 3]);
    const st = skyScene(95);
    assert.deepEqual([st.flash, st.dark, st.rain > 0, skyScene(96).hail > 0], [true, true, true, true]);
    const h = skyHtml(65, true, { wind: 20 });
    assert.match(h, /^<div class="sky" aria-hidden="true" data-sky="rain"/, 'decorativo: fora da leitura de ecrã');
    assert.deepEqual([count(h, 'sky-rain'), count(h, 'sky-c'), count(h, 'sky-st')], [1, 3, 0]);
    assert.match(h, /<canvas class="sky-rain" data-n="230" data-dz="0" data-a="[\d.]+"><\/canvas>/, 'a chuva vai para o canvas (gotas com profundidade e salpicos)');
    assert.equal(count(skyHtml(0, false), 'sky-st'), 24);
    assert.equal(count(skyHtml(95, true), 'sky-fl'), 1);
    assert.equal(skyHtml(NaN), '', 'sem código de tempo: nada');
});

test('céu: sempre igual para o mesmo tempo, o vento inclina a chuva e apressa as nuvens, e a fase segue o relógio', () => {
    assert.equal(skyHtml(63, true, { wind: 10, t: 5 }), skyHtml(63, true, { wind: 10, t: 5 }), 'sem acaso: redesenhar não muda nada');
    const a = (h) => Number(/--a:([\d.]+)deg/.exec(h)[1]);
    assert.ok(a(skyHtml(63, true, { wind: 50 })) > a(skyHtml(63, true, { wind: 5 })), 'mais vento, chuva mais inclinada');
    assert.ok(a(skyHtml(63, true, { wind: 500 })) <= 24 && a(skyHtml(63, true, { wind: -3 })) >= 5);
    const cloudDur = (h) => Number(/class="sky-c[^>]*animation-duration:([\d.]+)s/.exec(h)[1]);
    assert.ok(cloudDur(skyHtml(3, true, { wind: 40 })) < cloudDur(skyHtml(3, true, { wind: 0 })), 'mais vento, nuvens mais rápidas');
    // a fase: atrasos negativos, dentro da duração; avançam com o relógio
    const h0 = skyHtml(63, true, { t: 0 }), h1 = skyHtml(63, true, { t: 0.3 });
    assert.notEqual(h0, h1);
    for (const m of h1.matchAll(/animation-duration:([\d.]+)s;animation-delay:-([\d.]+)s/g)) assert.ok(Number(m[2]) <= Number(m[1]) + 0.05, m[0]);
    assert.ok(!/NaN|undefined|Infinity/.test(h0 + h1 + skyHtml(96, false, { wind: 33, t: 1e6 })));
});

test('ícones: as peças têm classe para mexer, mas só o ícone com anim se anima (os dos gráficos ficam parados)', () => {
    assert.match(weatherIcon(63, true, 96, 'Chuva', true), /^<svg class="wx anim" /);
    assert.match(weatherIcon(63, true, 30), /^<svg class="wx" /);
    assert.equal((weatherIconInner(65).match(/class="wx-drop"/g) || []).length, 3);
    assert.match(weatherIconInner(0, true), /class="wx-rays" style="transform-origin:32px 32px"/);
    assert.match(weatherIconInner(95), /class="wx-bolt"/);
    assert.equal((weatherIconInner(73).match(/class="wx-flake"/g) || []).length, 3);
    // a nuvem e a lua: o transform fica dentro (a animação CSS mexe o grupo de fora sem o estragar)
    assert.match(weatherIconInner(3), /<g class="wx-cloud"><g transform="translate\(/);
    assert.match(weatherIconInner(0, false), /<g class="wx-moon"><path transform=/);
});

test('ícone animado com chuva: traços a cair sem parar (dois por pista), não uma gota; parado fica com as gotas', () => {
    const st = (h) => (h.match(/class="wx-st"/g) || []).length, dr = (h) => (h.match(/class="wx-drop"/g) || []).length;
    assert.deepEqual([st(weatherIcon(61, true, 96, '', true)), st(weatherIcon(63, true, 96, '', true)), st(weatherIcon(65, true, 96, '', true))], [6, 8, 10]);
    assert.equal(dr(weatherIcon(61, true, 96, '', true)), 0);
    assert.deepEqual([st(weatherIcon(61, true, 30)), dr(weatherIcon(61, true, 30))], [0, 1], 'os pequenos (listas, gráficos) ficam com as gotas paradas');
});
