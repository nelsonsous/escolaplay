// node --test historico/exportar.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toCsv, EXPORTS } from './exportar.mjs';

test('CSV à portuguesa: «;», vírgula decimal, aspas quando é preciso, vazio para nulo', () => {
    const rows = [{ data: '2026-11-16', valor: 1834.27, nota: 'Ouro; abaixo da MM200 "fraco"', n: null }];
    assert.equal(toCsv(rows), 'data;valor;nota;n\r\n2026-11-16;1834,27;"Ouro; abaixo da MM200 ""fraco""";\r\n');
    assert.equal(toCsv(rows, { dot: true }).split('\r\n')[1].split(';')[1], '1834.27');
    assert.equal(toCsv([]), '');
});

test('as exportações cobrem as três bases e só leem (SELECT)', () => {
    assert.deepEqual(Object.keys(EXPORTS), ['meteo', 'mercados', 'musica']);
    for (const q of Object.values(EXPORTS).flatMap((x) => Object.values(x))) assert.match(q.trim(), /^SELECT /);
});
