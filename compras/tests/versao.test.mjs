// a versão é a mesma em todo o lado: o Worker, o wasm que a página pede, a página e o que o service worker guarda para
// abrir sem rede (se o SW guardasse outra versão, sem rede a app não abria com os ficheiros certos)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = (f) => readFileSync(path.join(aqui, f), 'utf8');

test('versões alinhadas: Worker, página, compras.js e service worker', () => {
    const v = ler('proxy/src/worker.js').match(/VERSION = '([\d.]+)'/)[1];
    assert.match(ler('compras.js'), new RegExp(`compras\\.wasm\\?v=${v.replace(/\./g, '\\.')}'`));
    const html = ler('index.html'), sw = ler('sw.js');
    for (const f of ['compras.css', 'compras.js']) {
        assert.ok(html.includes(`${f}?v=${v}`), `index.html pede ${f}?v=${v}`);
        assert.ok(sw.includes(`./${f}?v=${v}`), `sw.js guarda ${f}?v=${v}`);
    }
    assert.ok(sw.includes(`./app/compras.wasm?v=${v}`), 'sw.js guarda o wasm desta versão');
    assert.match(sw, /const CACHE = 'compras-v\d+'; \/\/ ([\d.]+)/);
    assert.equal(sw.match(/const CACHE = 'compras-v\d+'; \/\/ ([\d.]+)/)[1], v, 'o comentário da CACHE diz a versão');
});
