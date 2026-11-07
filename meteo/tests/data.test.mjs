// Pedidos de lib/data.js com fetch simulado (sem rede).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reverseGeocode, RETRY_429_MS, pointTerrain, loadRadar } from '../lib/data.js';
import { RAINVIEWER, analyzeRadar } from '../lib/radar.js';
import { synthFrames, framePng, coveragePng, mapsJson } from './fixtures/radar.mjs';

test('HTTP 429 (limite por minuto do Open-Meteo): tenta de novo 2 vezes, ~1,5 s e ~4 s depois', async () => {
    assert.deepEqual(RETRY_429_MS, [1500, 4000]);
    const saved = [...RETRY_429_MS], realFetch = globalThis.fetch;
    RETRY_429_MS.splice(0, 2, 5, 10); // mais rápido no teste
    try {
        let n = 0;
        globalThis.fetch = async () => (++n <= 2 ? new Response('{"error":"limite"}', { status: 429 })
            : new Response(JSON.stringify({ address: { town: 'Santo Tirso', municipality: 'Santo Tirso', county: 'Porto', country_code: 'pt' } }), { status: 200 }));
        const r = await reverseGeocode(41.3354, -8.4745);
        assert.equal(n, 3, 'dois 429 e depois a resposta');
        assert.equal(r.name, 'Santo Tirso');
        // sempre 429: desiste ao fim de 3 tentativas
        n = 0;
        globalThis.fetch = async () => { n++; return new Response('{}', { status: 429 }); };
        await assert.rejects(reverseGeocode(40.1, -8.1), /HTTP 429/);
        assert.equal(n, 3);
        // outros erros não se repetem
        n = 0;
        globalThis.fetch = async () => { n++; return new Response('{}', { status: 502 }); };
        await assert.rejects(reverseGeocode(40.2, -8.2), /HTTP 502/);
        assert.equal(n, 1);
    } finally {
        RETRY_429_MS.splice(0, 2, ...saved);
        globalThis.fetch = realFetch;
    }
});

test('relevo à volta do ponto: um só pedido de altitudes (o ponto + 24), pelo conector, guardado para sempre', async () => {
    const realFetch = globalThis.fetch, urls = [];
    try {
        const elev = [66, ...Array(12).fill(100), ...Array(12).fill(180)];
        globalThis.fetch = async (u) => { urls.push(String(u)); return new Response(JSON.stringify({ elevation: elev }), { status: 200 }); };
        const ctx = { base: 'https://conector.test', preferProxy: true };
        const t = await pointTerrain(41.3354, -8.4745, ctx);
        assert.deepEqual(t.elevation, elev);
        assert.equal(urls.length, 1);
        const u = new URL(urls[0]);
        assert.equal(u.origin + u.pathname, 'https://conector.test/api/raw/om/elevation', 'no Node vai pelo conector (o Open-Meteo limita o IP)');
        const la = u.searchParams.get('latitude').split(','), lo = u.searchParams.get('longitude').split(',');
        assert.equal(la.length, 25);
        assert.equal(lo.length, 25);
        assert.deepEqual([la[0], lo[0]], ['41.3354', '-8.4745'], 'o ponto primeiro');
        assert.deepEqual(await pointTerrain(41.3354, -8.4745, ctx), t);
        assert.equal(urls.length, 1, 'da segunda vez vem da memória (o terreno não muda)');
        // resposta incompleta: erro e nada guardado
        globalThis.fetch = async (u) => { urls.push(String(u)); return new Response(JSON.stringify({ elevation: [66, 70] }), { status: 200 }); };
        await assert.rejects(pointTerrain(40.1, -8.1, ctx), /altitudes à volta em falta/);
        const n = urls.length;
        await assert.rejects(pointTerrain(40.1, -8.1, ctx));
        assert.ok(urls.length > n, 'pede de novo');
    } finally { globalThis.fetch = realFetch; }
});

test('radar no Node: lista das imagens, cobertura (guardada 7 dias) e 13 imagens centradas no ponto lidas pelo descodificador PNG', async () => {
    const realFetch = globalThis.fetch, urls = [];
    try {
        const last = Date.now() - 6 * 6e4;
        const { frames } = synthFrames(41.3354, -8.4745, (t) => (t >= -20 ? [{ e: 0, n: 0, r: 10, dbz: 23 }] : []), { lastMs: last });
        const maps = mapsJson(frames);
        const pngs = new Map(maps.radar.past.map((f, i) => [f.path, framePng(frames[i].dbz)]));
        let broken = null, covered = true;
        globalThis.fetch = async (u) => {
            u = String(u); urls.push(u);
            if (u === RAINVIEWER.maps) return new Response(JSON.stringify(maps), { status: 200 });
            if (u.startsWith('https://tilecache.rainviewer.com/v2/coverage/0/256/7/')) return new Response(coveragePng(covered), { status: 200 });
            const m = /^https:\/\/tilecache\.rainviewer\.com(\/v2\/radar\/\w+)\/256\/7\/-?[\d.]+\/-?[\d.]+\/2\/0_0\.png$/.exec(u);
            return m && pngs.has(m[1]) && m[1] !== broken ? new Response(pngs.get(m[1]), { status: 200 }) : new Response('não há', { status: 404 });
        };
        const r = await loadRadar(41.3354, -8.4745);
        assert.deepEqual([r.frames.length, r.covered, r.host], [13, true, 'https://tilecache.rainviewer.com']);
        const tiles = urls.filter((u) => u.includes('/v2/radar/'));
        assert.equal(tiles.length, 13);
        assert.ok(tiles.every((u) => u.endsWith('/256/7/41.3354/-8.4745/2/0_0.png')), 'imagens de 256 px centradas no ponto, cores exatas (sem suavizar)');
        const R = analyzeRadar({ ...r, nowMs: Date.now() });
        assert.deepEqual([R.atPoint.mmh, R.atPoint.raining, R.ageMin], [1, true, 6]);
        // de novo: a lista vem da memória (1 min) e a cobertura também (7 dias); uma imagem que falha fica de fora
        urls.length = 0; broken = maps.radar.past[3].path;
        const r2 = await loadRadar(41.3354, -8.4745);
        assert.equal(r2.frames.length, 12);
        assert.ok(!urls.some((u) => u === RAINVIEWER.maps || u.includes('/v2/coverage/')));
        // outro ponto, sem radar (cobertura preta)
        covered = false;
        assert.equal((await loadRadar(36.9, -25.1)).covered, false);
        // sem nenhuma imagem: erro (a previsão segue sem radar)
        globalThis.fetch = async (u) => (String(u) === RAINVIEWER.maps ? new Response(JSON.stringify(maps)) : new Response('x', { status: 500 }));
        await assert.rejects(loadRadar(40.5, -8.2), /imagens do radar indisponíveis/);
    } finally { globalThis.fetch = realFetch; }
});
