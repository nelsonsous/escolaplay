// Locais com análise diária (lib/places.js): a escolha de cada corrida da tarefa agendada (analista/dados.mjs), a pausa
// de 14 dias, a hora de Lisboa, os contadores do dia e o painel "Utilização". Funções puras, sem rede.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectPlaces, placeStatus, daysUnseen, lisbon, isMorningRun, bumpStats, usageSummary, recentReports, othersMode, placeOwner,
    ANALYSED_MAX, PAUSE_DAYS, GUEST_MAX } from '../lib/places.js';

const NOW = Date.parse('2026-11-07T13:34:00Z'); // sábado, 13:34 em Lisboa (inverno: UTC+0)
const daysAgo = (n, from = NOW) => new Date(from - n * 864e5).toISOString();
const owner = (id, extra = {}) => ({ id, name: id, lat: 41, lon: -8, owner: 'owner', createdAt: '2026-11-01T10:00:00Z', ...extra });
const guest = (id, dev, extra = {}) => ({ id, name: id, lat: 40, lon: -8, owner: dev, createdAt: '2026-11-02T10:00:00Z', ...extra });

test('hora de Lisboa (com a hora de verão) e corrida da manhã', () => {
    assert.deepEqual(lisbon(Date.parse('2026-11-07T11:30:00Z')), { date: '2026-11-07', hour: 11 });
    assert.deepEqual(lisbon(Date.parse('2026-07-01T11:30:00Z')), { date: '2026-07-01', hour: 12 }, 'verão: UTC+1');
    assert.deepEqual(lisbon(Date.parse('2026-07-01T23:30:00Z')), { date: '2026-07-02', hour: 0 });
    // as corridas são às 07:34, 13:34 e 20:34 de Lisboa
    assert.equal(isMorningRun(Date.parse('2026-11-07T07:34:00Z')), true);
    assert.equal(isMorningRun(Date.parse('2026-07-01T06:34:00Z')), true, '07:34 de verão');
    assert.equal(isMorningRun(Date.parse('2026-07-01T11:40:00Z')), false, '12:40 de verão (11:40 UTC) já não é de manhã');
    assert.equal(isMorningRun(Date.parse('2026-11-07T11:40:00Z')), true, 'a corrida da manhã atrasada (11:40 de inverno) ainda conta');
    assert.equal(isMorningRun(NOW), false);
    assert.equal(isMorningRun(Date.parse('2026-11-07T20:34:00Z')), false);
});

test('pausa: 14 dias (de Lisboa) sem abrir a app; os locais do dono nunca ficam em pausa', () => {
    assert.equal(PAUSE_DAYS, 14);
    assert.equal(daysUnseen(daysAgo(13), NOW), 13);
    assert.equal(daysUnseen('2026-10-24', NOW), 14, 'também com a data do dia (metadados)');
    assert.equal(daysUnseen(null, NOW), null);
    assert.equal(placeStatus(guest('a', 'x'), daysAgo(13), NOW), 'active');
    assert.equal(placeStatus(guest('a', 'x'), daysAgo(14), NOW), 'paused');
    assert.equal(placeStatus(guest('a', 'x'), null, NOW), 'paused', 'sem registo do telemóvel');
    assert.equal(placeStatus(owner('d'), null, NOW), 'active');
    assert.equal(placeStatus({ id: 'velho', lat: 1, lon: 1 }, null, NOW), 'active', 'migração: sem dono = do dono');
    assert.equal(placeOwner({ id: 'velho' }), 'owner');
    assert.equal(placeStatus(guest('a', 'x', { off: true }), daysAgo(0), NOW), 'off');
});

test('seleção da tarefa agendada (dados.mjs): os do dono sempre; os dos outros em uso, conforme a "análise dos outros", até 15', () => {
    const devices = { x: { lastSeen: daysAgo(1) }, y: { lastSeen: daysAgo(3) }, z: { lastSeen: daysAgo(20) }, w: { lastSeen: daysAgo(0.1) } };
    const places = [owner('casa'), { id: 'santo-tirso', name: 'Santo Tirso', lat: 41.3354, lon: -8.4745 }, owner('praia', { off: true }),
        guest('ana', 'x'), guest('rui', 'y'), guest('ze', 'z'), guest('eva', 'w', { off: true, offBy: 'owner' }), guest('sem-registo', 'q'),
        { id: 'estragado', lat: 'x' }, null];
    const s = selectPlaces(places, { devices, now: NOW });
    assert.equal(s.morning, false);
    assert.deepEqual(s.run.map((p) => [p.id, p.kind]), [['casa', 'owner'], ['santo-tirso', 'owner'], ['ana', 'guest'], ['rui', 'guest']]);
    assert.deepEqual(Object.fromEntries(s.skip.map((p) => [p.id, p.reason])), {
        praia: 'desligado', eva: 'desligado pelo dono', ze: 'em pausa (14 dias ou mais sem abrir a app)', 'sem-registo': 'em pausa (14 dias ou mais sem abrir a app)' });
    // análise dos outros desligada: só os do dono
    const off = selectPlaces(places, { devices, now: NOW, others: 'off' });
    assert.deepEqual(off.run.map((p) => p.id), ['casa', 'santo-tirso']);
    assert.ok(off.skip.filter((p) => ['ana', 'rui'].includes(p.id)).every((p) => p.reason === 'análise dos outros desligada'));
    // "1×": os outros só na corrida da manhã (hora de Lisboa)
    const pm = selectPlaces(places, { devices, now: NOW, others: '1x' });
    assert.deepEqual(pm.run.map((p) => p.id), ['casa', 'santo-tirso']);
    assert.equal(pm.skip.find((p) => p.id === 'ana').reason, 'só 1× por dia (na corrida da manhã)');
    const am = selectPlaces(places, { devices, now: Date.parse('2026-11-08T07:34:00Z'), others: '1x' });
    assert.deepEqual(am.run.map((p) => p.id), ['casa', 'santo-tirso', 'ana', 'rui']);
    assert.equal(othersMode({ others: 'xpto' }), 'on');
    assert.equal(selectPlaces(places, { devices, now: NOW, others: 'xpto' }).others, 'on');
});

test('limite de segurança (15): os do dono nunca são cortados; dos outros, primeiro quem abriu a app há menos tempo', () => {
    assert.equal(ANALYSED_MAX, 15);
    assert.equal(GUEST_MAX, 1);
    const devices = Object.fromEntries(Array.from({ length: 6 }, (_, i) => [`t${i}`, { lastSeen: daysAgo(i + 1) }]));
    const g = Array.from({ length: 6 }, (_, i) => guest(`g${i}`, `t${i}`));
    const s = selectPlaces([...Array.from({ length: 12 }, (_, i) => owner(`o${i}`)), ...g.slice().reverse()], { devices, now: NOW });
    assert.equal(s.run.length, 15);
    assert.deepEqual(s.run.filter((p) => p.kind === 'guest').map((p) => p.id), ['g0', 'g1', 'g2']);
    assert.deepEqual(s.skip.map((p) => [p.id, p.reason]), [['g3', 'limite de 15 locais analisados'], ['g4', 'limite de 15 locais analisados'], ['g5', 'limite de 15 locais analisados']]);
    // com mais de 15 do dono, todos os do dono entram e nenhum dos outros
    const many = selectPlaces([...Array.from({ length: 17 }, (_, i) => owner(`o${i}`)), guest('g0', 't0')], { devices, now: NOW });
    assert.deepEqual([many.run.length, many.run.every((p) => p.kind === 'owner'), many.skip[0].id], [17, true, 'g0']);
    // empate no dia: o mais antigo primeiro
    const tie = selectPlaces([...Array.from({ length: 14 }, (_, i) => owner(`o${i}`)), guest('novo', 'a', { createdAt: '2026-11-05T00:00:00Z' }), guest('antigo', 'b', { createdAt: '2026-11-01T00:00:00Z' })],
        { devices: { a: { lastSeen: '2026-11-07' }, b: { lastSeen: '2026-11-07' } }, now: NOW });
    assert.deepEqual(tie.run.at(-1).id, 'antigo');
});

test('contadores do dia (stats:<data>) e painel "Utilização"', () => {
    assert.deepEqual(bumpStats(null, { kind: 'scheduled' }), { scheduled: 1, instant: 0, guest: 0 });
    assert.deepEqual(bumpStats({ scheduled: 4, instant: 1, guest: 2 }, { kind: 'instant', guest: true }), { scheduled: 4, instant: 2, guest: 3 });
    assert.deepEqual(bumpStats({ scheduled: 'x', instant: -3, guest: 2.7, outro: 1 }), { scheduled: 0, instant: 0, guest: 2 }, 'valores estragados não contam');
    assert.deepEqual(bumpStats([], { kind: 'xpto' }), { scheduled: 0, instant: 0, guest: 0 });
    const devices = [{ id: 'dono1', s: '2026-11-07', o: 1 }, { id: 'a', s: '2026-11-07', o: 0 }, { id: 'b', s: '2026-11-01', o: 0 }, { id: 'c', s: '2026-10-20', o: 0 }, { id: 'd', s: '2026-09-01', o: 0 }, { id: 'e', s: null }];
    const places = [owner('Santo Tirso'), guest('Casa da Ana', 'a', { lat: 41.5454 }), guest('Praia', 'c'), guest('Velho', 'd', { off: true })];
    const u = usageSummary({ devices, places, stats: { '2026-11-07': { scheduled: 9, instant: 1, guest: 6 }, '2026-11-05': { scheduled: 3 } }, now: NOW });
    assert.equal(u.today, '2026-11-07');
    assert.deepEqual(u.devices, { today: 2, d7: 3, d30: 4, total: 6, owner: 1 });
    assert.deepEqual(u.places.list.map((p) => [p.name, p.kind, p.status, p.analysed, p.days ?? null]),
        [['Santo Tirso', 'owner', 'active', true, null], ['Casa da Ana', 'guest', 'active', true, 0], ['Praia', 'guest', 'paused', false, 18], ['Velho', 'guest', 'off', false, 67]]);
    assert.deepEqual([u.places.total, u.places.owner, u.places.guests, u.places.active, u.places.paused, u.places.off, u.places.analysed], [4, 1, 3, 2, 1, 1, 2]);
    assert.ok(!JSON.stringify(u).includes('41.5454'), 'sem coordenadas');
    assert.deepEqual(u.analyses.map((x) => x.date), ['2026-11-07', '2026-11-06', '2026-11-05', '2026-11-04', '2026-11-03', '2026-11-02', '2026-11-01']);
    assert.deepEqual(u.analyses[0], { date: '2026-11-07', scheduled: 9, instant: 1, guest: 6 });
    assert.deepEqual(u.analyses[2], { date: '2026-11-05', scheduled: 3, instant: 0, guest: 0 });
    // no painel conta a corrida da manhã (com "1×" os outros entram nela)
    assert.equal(usageSummary({ devices, places, others: '1x', now: NOW }).places.analysed, 2);
    assert.equal(usageSummary({ devices, places, others: 'off', now: NOW }).places.analysed, 1);
});

test('avisos recentes perto do ponto: idade, distância, horas e raio', () => {
    const now = Date.parse('2026-11-07T20:40:00Z');
    const list = [{ kind: 'chuva', time: '2026-11-07T20:33:00Z', lat: 41.338, lon: -8.472 }, { kind: 'nevoeiro', time: '2026-11-07T08:00:00Z', lat: 38.72, lon: -9.14 },
        { kind: 'granizo', time: '2026-11-04T10:00:00Z', lat: 41.335, lon: -8.475 }, { kind: 'x', time: 'ontem' }];
    const r = recentReports(list, 41.3354, -8.4745, { hours: 48, now });
    assert.deepEqual(r.map((x) => [x.kind, x.ageMin, x.distanceKm]), [['chuva', 7, 0.4], ['nevoeiro', 760, 296.3]]);
    assert.deepEqual(recentReports(list, 41.3354, -8.4745, { hours: 48, now, maxKm: 10 }).map((x) => x.kind), ['chuva']);
    assert.deepEqual(recentReports(null, 0, 0), []);
});
