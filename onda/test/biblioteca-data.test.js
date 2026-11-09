// A biblioteca (onda/lib/data.onda) contra o Date e o Intl do Node: dia civil ⇄ dias (todos os dias de 1600 a 2400 e
// ao acaso até ±275 760 anos), o dia da semana, o toISOString (ms ao acaso em toda a gama do Date), o
// toISOString().slice(0, 10), o último domingo do mês, e a hora de Lisboa (Europe/Lisbon) em todas as mudanças de
// hora de 1996 a 2099, minuto a minuto à volta delas, e a horas ao acaso nesses anos.
const { test } = require('node:test');
const assert = require('node:assert');
const { criar, gerador } = require('./lib/sonda.js');

const S = criar();
const G = gerador(1996);
const DIA = 86400000;

test('dias ⇄ data civil e o dia da semana: todos os dias de 1600 a 2400, e 100 000 ao acaso em toda a gama do Date', () => {
  const zs = [];
  for (let z = Date.UTC(1600, 0, 1) / DIA; z <= Date.UTC(2400, 11, 31) / DIA; z++) zs.push(z);
  for (let i = 0; i < 100000; i++) zs.push(G.int(2 * 100000000) - 100000000);
  for (let k = 0; k < zs.length; k += 50000) {
    const p = zs.slice(k, k + 50000), r = S.li(0, p);
    p.forEach((z, i) => {
      const d = new Date(z * DIA);
      assert.strictEqual(r[i], `${d.getUTCFullYear()} ${d.getUTCMonth() + 1} ${d.getUTCDate()} ${d.getUTCDay()} ${z}`, `dia ${z}`);
    });
  }
  // o dia pode passar do fim do mês, e o mês do fim do ano não (o mês é 1..12), como no Date.UTC
  for (let i = 0; i < 20000; i++) {
    const y = G.int(4000) - 1000, m = 1 + G.int(12), d = G.int(70) - 5;
    const u = new Date(0); u.setUTCFullYear(y, m - 1, d); // o setUTCFullYear não soma 1900 aos anos 0..99, como o Date.UTC
    assert.strictEqual(S.chamar('t_dias', BigInt(y), BigInt(m), BigInt(d)), String(u.getTime() / DIA), `${y}-${m}-${d}`);
  }
});

test('o toISOString e o toISOString().slice(0, 10): ms ao acaso em toda a gama do Date (anos negativos e de 6 algarismos)', () => {
  const ts = [0, -1, 1, 8.64e15, -8.64e15, Date.UTC(9999, 11, 31, 23, 59, 59, 999), Date.UTC(10000, 0, 1), Date.UTC(0, 0, 1) - 1];
  for (let i = 0; i < 200000; i++) ts.push(G.R() < 0.5 ? Math.floor((G.R() * 2 - 1) * 8.64e15) : Math.floor((G.R() * 2 - 1) * 4e12));
  const r = S.li(1, ts);
  ts.forEach((t, i) => assert.strictEqual(r[i], new Date(t).toISOString(), `toISOString(${t})`));
  const zs = ts.map((t) => Math.floor(t / DIA)), r10 = S.li(3, zs);
  zs.forEach((z, i) => assert.strictEqual(r10[i], new Date(z * DIA).toISOString().slice(0, 10), `slice(0, 10) do dia ${z}`));
});

test('Lisboa: o dia e "dia-da-semana, HH:MM" iguais ao Intl em todas as mudanças de hora de 1996 a 2099 e ao acaso', () => {
  const dia = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon' });
  const quando = new Intl.DateTimeFormat('pt-PT', { timeZone: 'Europe/Lisbon', weekday: 'long', hour: '2-digit', minute: '2-digit' });
  const ts = [];
  for (let y = 1996; y < 2100; y++) for (const mes of [2, 9]) {
    // o último domingo de março e de outubro, à 01:00 UTC
    const ult = new Date(Date.UTC(y, mes + 1, 0)), d = ult.getUTCDate() - ult.getUTCDay();
    assert.strictEqual(S.chamar('t_ult', BigInt(y), BigInt(mes + 1)), String(Date.UTC(y, mes, d) / DIA), `último domingo ${y}-${mes + 1}`);
    const t0 = Date.UTC(y, mes, d, 1, 0);
    // as regras da UE em Portugal começam a 31 de março de 1996, 01:00 UTC (antes era a hora da Europa Central)
    for (const t of [...Array.from({ length: 181 }, (_, k) => t0 + (k - 90) * 60000), t0 - 1, t0 + 1, t0 + 3600000 - 1, t0 - 3600000]) if (t >= 828234000000) ts.push(t);
  }
  for (let i = 0; i < 100000; i++) ts.push(828234000000 + G.int(4102444800000 - 828234000000));
  const r = S.li(2, ts);
  ts.forEach((t, i) => assert.strictEqual(r[i], dia.format(t) + ' ' + quando.format(t), new Date(t).toISOString()));
  // e o tempo local de Lisboa: o offset da hora de verão
  const lr = S.li(7, ts.slice(0, 20000));
  ts.slice(0, 20000).forEach((t, i) => {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Lisbon', hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' }).formatToParts(t).map((x) => [x.type, x.value]));
    assert.strictEqual(+lr[i], Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) + (t % 1000 + 1000) % 1000, 'Lisboa ' + new Date(t).toISOString());
  });
});
