// Tidal simulado (API v2 + OAuth) e KV em memória, partilhados pelos testes do Worker e do Curador.
import assert from 'node:assert/strict';

export function kv() {
    const m = new Map();
    return { m, get: async (k, t) => (m.has(k) ? (t === 'json' ? JSON.parse(m.get(k)) : m.get(k)) : null), put: async (k, v) => { m.set(k, String(v)); }, delete: async (k) => { m.delete(k); } };
}

export const ARTISTAS = { a1: 'Miles Davis', a2: 'Nina Simone', a3: 'Daft Punk', a4: 'Amália Rodrigues', a5: 'Massive Attack' };
export const FAIXAS = {
    '101': { title: 'So What', artists: ['a1'], album: ['al1', '1959-08-17', ['HIRES_LOSSLESS']], key: 'D', keyScale: 'DORIAN', bpm: 136.2, popularity: 0.81, duration: 'PT9M22S' },
    '102': { title: 'Feeling Good', artists: ['a2'], album: ['al2', '1965-01-01', ['LOSSLESS']], key: 'G', keyScale: 'MINOR', popularity: 0.86, duration: 'PT2M53S' },
    '103': { title: 'Get Lucky', version: 'Radio Edit', artists: ['a3'], album: ['al3', '2013-05-17', ['LOSSLESS']], key: 'FSharp', keyScale: 'MINOR', bpm: 116, popularity: 0.93, duration: 'PT4M08S' },
    '104': { title: 'Get Lucky (Live)', artists: ['a3'], album: ['al4', '2014-01-01', []], popularity: 0.4, duration: 'PT5M00S' },
    '106': { title: 'Teardrop', artists: ['a5'], album: ['al6', '1998-04-20', ['HIRES_LOSSLESS']], key: 'A', keyScale: 'MAJOR', bpm: 77, popularity: 0.7, duration: 'PT5M30S' },
    '105': { title: 'Barco Negro', artists: ['a4'], album: ['al5', '1955-01-01', ['LOSSLESS']], popularity: 0.5, duration: 'PT3M10S' },
};
for (let i = 0; i < 60; i++) FAIXAS[String(200 + i)] = { title: `Faixa ${i}`, artists: ['a1'], album: ['al1', '1959-08-17', ['LOSSLESS']], popularity: 0.3, duration: 'PT3M' };
function recursoFaixa(id) {
    const f = FAIXAS[id];
    return { id, type: 'tracks', attributes: { title: f.title, version: f.version, isrc: `USAAA${id.padStart(7, '0')}`, duration: f.duration, explicit: false, popularity: f.popularity,
        mediaTags: [], key: f.key || 'UNKNOWN', keyScale: f.keyScale || 'UNKNOWN', ...(f.bpm ? { bpm: f.bpm } : {}) },
        relationships: { artists: { data: f.artists.map((a) => ({ id: a, type: 'artists' })) }, albums: { data: [{ id: f.album[0], type: 'albums' }] }, genres: { data: id === '101' ? [{ id: 'g1', type: 'genres' }] : [] } } };
}
export function simulador() {
    const sim = { criadas: [], itens: [], recusar401: false, chamadas: [], tokenBodies: [] };
    sim.fetch = async (u, init = {}) => tidalSimulado(sim, u, init);
    return sim;
}

function tidalSimulado(sim, u, init = {}) {
    const url = new URL(String(u));
    const metodo = init.method || 'GET';
    sim.chamadas.push(`${metodo} ${url.pathname}${url.search}`);
    const resp = (body, status = 200) => new Response(body == null ? null : JSON.stringify(body), { status, headers: { 'content-type': 'application/vnd.api+json' } });
    if (url.href === 'https://auth.tidal.com/v1/oauth2/token') {
        const b = Object.fromEntries(new URLSearchParams(init.body));
        sim.tokenBodies.push(b);
        if (b.grant_type === 'authorization_code' && b.code === 'CODIGO-BOM') return resp({ access_token: 'AT1', refresh_token: 'RT1', expires_in: 3600, scope: b.scope, user_id: 42 });
        if (b.grant_type === 'refresh_token' && b.refresh_token === 'RT1') return resp({ access_token: 'AT2', expires_in: 3600 });
        return resp({ error: 'invalid_grant' }, 400);
    }
    assert.equal(url.origin, 'https://openapi.tidal.com', `pedido inesperado: ${url.href}`);
    const auth = new Headers(init.headers).get('authorization');
    if (sim.recusar401 && auth === 'Bearer AT1') return resp({ errors: [{ title: 'expired' }] }, 401);
    if (!['Bearer AT1', 'Bearer AT2'].includes(auth)) return resp({ errors: [{ title: 'unauthorized' }] }, 401);
    const p = url.pathname.replace(/^\/v2/, '');
    if (p === '/users/me') return resp({ data: { id: '42', type: 'users', attributes: { username: 'nelson', country: 'PT' } } });
    if (p === '/userCollectionTracks/me/relationships/items') {
        const pag = url.searchParams.get('page[cursor]');
        return resp(pag ? { data: [{ id: '105', type: 'tracks', meta: { addedAt: '2026-01-01T00:00:00Z' } }], links: { self: '/x' } }
            : { data: [{ id: '101', type: 'tracks', meta: { addedAt: '2026-10-01T00:00:00Z' } }, { id: '102', type: 'tracks' }], links: { self: '/x', next: '/userCollectionTracks/me/relationships/items?page[cursor]=c2&sort=-addedAt' } });
    }
    if (p === '/userCollectionArtists/me/relationships/items') return resp({ data: [{ id: 'a2', type: 'artists' }], included: [{ id: 'a2', type: 'artists', attributes: { name: 'Nina Simone' } }], links: { self: '/x' } });
    if (p === '/playlists' && metodo === 'GET') return resp({ data: [{ id: 'pl-velha', type: 'playlists', attributes: { name: 'Jazz de domingo', numberOfItems: 12 } }], links: { self: '/x' } });
    if (p === '/tracks') {
        const ids = url.searchParams.getAll('filter[id]');
        assert.ok(ids.length <= 20, 'no máximo 20 ids por pedido');
        assert.deepEqual(url.searchParams.getAll('include'), ['artists', 'albums', 'genres']);
        const data = ids.filter((id) => FAIXAS[id]).map(recursoFaixa);
        const inc = [];
        for (const d of data) {
            const f = FAIXAS[d.id];
            for (const a of f.artists) inc.push({ id: a, type: 'artists', attributes: { name: ARTISTAS[a] } });
            inc.push({ id: f.album[0], type: 'albums', attributes: { title: 'Álbum ' + f.album[0], releaseDate: f.album[1], mediaTags: f.album[2] } });
        }
        inc.push({ id: 'g1', type: 'genres', attributes: { genreName: 'Jazz' } });
        return resp({ data, included: inc, links: { self: '/x' } });
    }
    // a pesquisa como o Tidal a faz hoje: a frase em filter[query]; as faixas em data[0].relationships.tracks
    if (p === '/searchResults') {
        const q = (url.searchParams.get('filter[query]') || '').toLowerCase();
        assert.ok(q, 'a pesquisa vai em filter[query]');
        assert.deepEqual(url.searchParams.getAll('include'), ['tracks']);
        const ids = Object.keys(FAIXAS).filter((id) => q.includes(FAIXAS[id].title.toLowerCase().replace(/ \(live\)/, '')));
        if (!ids.length) return resp({ data: [], links: { self: '/x' } });
        return resp({ data: [{ id: q, type: 'searchResults', attributes: { trackingId: 't' }, relationships: { tracks: { data: ids.map((id) => ({ id, type: 'tracks' })), links: { self: '/x' } } } }],
            included: ids.map(recursoFaixa), links: { self: '/x' } });
    }
    // o formato antigo (a frase no caminho) já não existe
    if (p.startsWith('/searchResults/')) return resp({ errors: [{ status: '400', code: 'INVALID_REQUEST', detail: 'Invalid resource ID' }] }, 400);
    if (p === '/playlists' && metodo === 'POST') {
        const b = JSON.parse(init.body);
        assert.equal(b.data.type, 'playlists');
        sim.criadas.push(b.data.attributes);
        return resp({ data: { id: 'uuid-nova', type: 'playlists', attributes: b.data.attributes } }, 201);
    }
    const it = /^\/playlists\/([^/]+)\/relationships\/items$/.exec(p);
    if (it && metodo === 'POST') {
        const b = JSON.parse(init.body);
        assert.ok(b.data.length <= 50, 'no máximo 50 faixas por pedido');
        sim.itens.push(...b.data.map((x) => x.id));
        return resp(null, 204);
    }
    return resp({ errors: [{ title: 'not found ' + p }] }, 404);
}

