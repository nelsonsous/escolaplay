// Tidal simulado (API v2 + OAuth) e KV em memória, partilhados pelos testes do Worker e do Maestro.
import assert from 'node:assert/strict';

export function kv() {
    const m = new Map();
    // escritas: conta-as (o plano gratuito dá 1000 por dia); cheia: recusa-as, como quando se passa o limite
    const o = { m, escritas: 0, cheia: false, get: async (k, t) => (m.has(k) ? (t === 'json' ? JSON.parse(m.get(k)) : m.get(k)) : null),
        put: async (k, v) => { if (o.cheia) throw new Error('KV put() limit exceeded for the day.'); o.escritas++; m.set(k, String(v)); }, delete: async (k) => { m.delete(k); } };
    return o;
}

export const ARTISTAS = { a1: 'Miles Davis', a2: 'Nina Simone', a3: 'Daft Punk', a4: 'Amália Rodrigues', a5: 'Massive Attack', a6: 'Pop Teste' };
export const FAIXAS = {
    '101': { title: 'So What', artists: ['a1'], album: ['al1', '1959-08-17', ['HIRES_LOSSLESS']], key: 'D', keyScale: 'DORIAN', bpm: 136.2, popularity: 0.81, duration: 'PT9M22S' },
    '102': { title: 'Feeling Good', artists: ['a2'], album: ['al2', '1965-01-01', ['LOSSLESS']], key: 'G', keyScale: 'MINOR', popularity: 0.86, duration: 'PT2M53S' },
    '103': { title: 'Get Lucky', version: 'Radio Edit', artists: ['a3'], album: ['al3', '2013-05-17', ['LOSSLESS']], key: 'FSharp', keyScale: 'MINOR', bpm: 116, popularity: 0.93, duration: 'PT4M08S' },
    '104': { title: 'Get Lucky (Live)', artists: ['a3'], album: ['al4', '2014-01-01', []], popularity: 0.4, duration: 'PT5M00S' },
    '106': { title: 'Teardrop', artists: ['a5'], album: ['al6', '1998-04-20', ['HIRES_LOSSLESS']], key: 'A', keyScale: 'MAJOR', bpm: 77, popularity: 0.7, duration: 'PT5M30S' },
    '105': { title: 'Barco Negro', artists: ['a4'], album: ['al5', '1955-01-01', ['LOSSLESS']], popularity: 0.5, duration: 'PT3M10S' },
    // a mesma canção com letra explícita e na versão limpa (que a pesquisa dá abaixo)
    '107': { title: 'Canção Forte', artists: ['a6'], album: ['al7', '2025-03-01', ['LOSSLESS']], popularity: 0.9, duration: 'PT3M00S', explicit: true },
    '108': { title: 'Canção Forte', version: 'Clean Edit', artists: ['a6'], album: ['al8', '2025-03-01', ['LOSSLESS']], popularity: 0.5, duration: 'PT3M00S' },
    '109': { title: 'Só Explícita', artists: ['a6'], album: ['al7', '2025-03-01', ['LOSSLESS']], popularity: 0.6, duration: 'PT2M40S', explicit: true },
};
for (let i = 0; i < 60; i++) FAIXAS[String(200 + i)] = { title: `Faixa ${i}`, artists: ['a1'], album: ['al1', '1959-08-17', ['LOSSLESS']], popularity: 0.3, duration: 'PT3M' };
function recursoFaixa(id) {
    const f = FAIXAS[id];
    return { id, type: 'tracks', attributes: { title: f.title, version: f.version, isrc: `USAAA${id.padStart(7, '0')}`, duration: f.duration, explicit: !!f.explicit, popularity: f.popularity,
        mediaTags: [], key: f.key || 'UNKNOWN', keyScale: f.keyScale || 'UNKNOWN', ...(f.bpm ? { bpm: f.bpm } : {}) },
        relationships: { artists: { data: f.artists.map((a) => ({ id: a, type: 'artists' })) }, albums: { data: [{ id: f.album[0], type: 'albums' }] }, genres: { data: id === '101' ? [{ id: 'g1', type: 'genres' }] : [] } } };
}
export function simulador() {
    const sim = { criadas: [], itens: [], apagadas: [], removidos: [], nItem: 0, recusar401: false, chamadas: [], tokenBodies: [], favoritasNovas: [],
        // as mixes do Tidal são playlists com faixas
        listas: { 'mix-desc': [{ id: '106', itemId: 'm1' }, { id: '105', itemId: 'm2' }], 'mix-dia': [{ id: '101', itemId: 'm3' }] } };
    // as tabelas públicas das tendências (Apple Music PT e EUA, Deezer mundo): [artista, título, género]
    sim.tabelas = {
        pt: [['Daft Punk', 'Get Lucky', 'Dance'], ['Artista PT 1', 'Canção 1', 'Pop'], ['Nina Simone', 'Feeling Good', 'Jazz'], ['Artista PT 2', 'Canção 2', 'Pop']],
        eua: [['Artista EUA', 'Hit', 'Hip-Hop/Rap'], ['Daft Punk', 'Get Lucky (feat. Pharrell Williams)', 'Dance']],
        mundo: [['Daft Punk', 'Get Lucky', ''], ['Artista Mundo', 'Global', '']],
    };
    sim.tabelaFalha = null;
    // os serviços de notificações (Web Push): guarda o que chegou; sim.pushStatus[endpoint] simula uma assinatura caducada (410)
    sim.pushes = [];
    sim.pushStatus = {};
    sim.fetch = async (u, init = {}) => pushSimulado(sim, u, init) || tabelaSimulada(sim, u) || tidalSimulado(sim, u, init);
    return sim;
}

function pushSimulado(sim, u, init) {
    const h = String(u);
    if (!/^https:\/\/(web\.push\.apple\.com|fcm\.googleapis\.com)\//.test(h)) return null;
    const headers = new Headers(init.headers);
    sim.pushes.push({ endpoint: h, body: init.body, authorization: headers.get('authorization'), encoding: headers.get('content-encoding'), ttl: headers.get('ttl') });
    return new Response(null, { status: sim.pushStatus[h] || 201 });
}

function tabelaSimulada(sim, u) {
    const h = String(u);
    // as pré-escutas (e as capas) do Deezer: pela pesquisa, a do «So What», da «Get Lucky» e da «Teardrop»; pelo ISRC, a da «Feeling Good»
    const capa = (t) => ({ cover_small: `https://cdn-images.dzcdn.net/images/cover/${[...t].map((c) => c.charCodeAt(0).toString(16)).join('').padEnd(32, '0').slice(0, 32)}/56x56-000000-80-0-0.jpg` });
    const exp = Math.floor(Date.now() / 1000) + 3600;
    if (h.startsWith('https://api.deezer.com/search?')) {
        sim.chamadas.push(`GET ${h}`);
        const q = new URL(h).searchParams.get('q');
        const tem = [['Miles Davis', 'So What'], ['Daft Punk', 'Get Lucky'], ['Massive Attack', 'Teardrop']].filter(([, t]) => q.includes(t));
        return new Response(JSON.stringify({ data: tem.map(([a, t]) => ({ title: t, title_short: t, artist: { name: a }, album: capa(t), preview: `https://cdn.deezer.example/${encodeURIComponent(t)}.mp3?hdnea=exp=${exp}~acl=x` })) }), { status: 200 });
    }
    if (h.startsWith('https://api.deezer.com/track/isrc:')) {
        sim.chamadas.push(`GET ${h}`);
        return new Response(JSON.stringify(h.endsWith('USAAA0000102') ? { preview: `https://cdn.deezer.example/feeling-good.mp3?hdnea=exp=${exp}~acl=x`, album: capa('Feeling Good') } : { error: { type: 'DataException' } }), { status: 200 });
    }
    const fonte = h.startsWith('https://rss.marketingtools.apple.com/api/v2/pt/') ? 'pt' : h.startsWith('https://rss.marketingtools.apple.com/api/v2/us/') ? 'eua'
        : h.startsWith('https://api.deezer.com/chart/') ? 'mundo' : null;
    if (!fonte) return null;
    sim.chamadas.push(`GET ${h}`);
    if (sim.tabelaFalha === fonte) return new Response('indisponível', { status: 503 });
    const l = sim.tabelas[fonte];
    const body = fonte === 'mundo' ? { data: l.map(([a, t], i) => ({ position: i + 1, title: t, artist: { name: a } })) }
        : { feed: { results: l.map(([a, t, g]) => ({ artistName: a, name: t, genres: [{ name: g, genreId: '1' }, { name: 'Music', genreId: '34' }] })) } };
    return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
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
        if (b.grant_type === 'authorization_code' && b.code === 'CODIGO-ANA') return resp({ access_token: 'AT-ANA', refresh_token: 'RT-ANA', expires_in: 3600, scope: b.scope, user_id: 77 });
        if (b.grant_type === 'refresh_token' && b.refresh_token === 'RT1') return resp({ access_token: 'AT2', expires_in: 3600 });
        return resp({ error: 'invalid_grant' }, 400);
    }
    assert.equal(url.origin, 'https://openapi.tidal.com', `pedido inesperado: ${url.href}`);
    const auth = new Headers(init.headers).get('authorization');
    if (sim.recusar401 && auth === 'Bearer AT1') return resp({ errors: [{ title: 'expired' }] }, 401);
    if (!['Bearer AT1', 'Bearer AT2', 'Bearer AT-ANA'].includes(auth)) return resp({ errors: [{ title: 'unauthorized' }] }, 401);
    const p = url.pathname.replace(/^\/v2/, '');
    if (p === '/users/me' && auth === 'Bearer AT-ANA') return resp({ data: { id: '77', type: 'users', attributes: { username: 'ana', country: 'PT' } } });
    if (p === '/users/me') return resp({ data: { id: '42', type: 'users', attributes: { username: 'nelson', country: 'PT' } } });
    if (p === '/userCollectionTracks/me/relationships/items') {
        const pag = url.searchParams.get('page[cursor]');
        return resp(pag ? { data: [{ id: '105', type: 'tracks', meta: { addedAt: '2026-01-01T00:00:00Z' } }], links: { self: '/x' } }
            : { data: [...sim.favoritasNovas.map((x) => ({ id: x.id, type: 'tracks', meta: { addedAt: x.addedAt } })), { id: '101', type: 'tracks', meta: { addedAt: '2026-10-01T00:00:00Z' } }, { id: '102', type: 'tracks' }], links: { self: '/x', next: '/userCollectionTracks/me/relationships/items?page[cursor]=c2&sort=-addedAt' } });
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
    const del = /^\/playlists\/([^/]+)$/.exec(p);
    if (del && metodo === 'PATCH') {
        if (del[1] !== 'uuid-nova') return resp({ errors: [{ status: '404', detail: 'Playlist not found' }] }, 404);
        (sim.renomeadas ||= []).push({ id: del[1], ...JSON.parse(init.body).data.attributes });
        return resp(null, 204);
    }
    if (del && metodo === 'DELETE') {
        if (del[1] !== 'uuid-nova') return resp({ errors: [{ status: '404', detail: 'Playlist not found' }] }, 404);
        sim.apagadas.push(del[1]);
        return resp(null, 204);
    }
    const it = /^\/playlists\/([^/]+)\/relationships\/items$/.exec(p);
    if (it && metodo === 'POST') {
        const b = JSON.parse(init.body);
        assert.ok(b.data.length <= 50, 'no máximo 50 faixas por pedido');
        sim.itens.push(...b.data.map((x) => x.id));
        sim.listas[it[1]] = [...(sim.listas[it[1]] || []), ...b.data.map((x) => ({ id: x.id, itemId: 'it' + ++sim.nItem }))];
        return resp(null, 204);
    }
    // as faixas de uma playlist, com o itemId de cada uma; e tirar faixas (pelo itemId)
    if (it && metodo === 'GET' && sim.apagadas.includes(it[1])) return resp({ errors: [{ status: '404', detail: 'Playlist not found' }] }, 404);
    if (it && metodo === 'GET') return resp({ data: (sim.listas[it[1]] || []).map((x) => ({ id: x.id, type: 'tracks', meta: { itemId: x.itemId } })), links: { self: '/x' } });
    if (it && metodo === 'DELETE') {
        const b = JSON.parse(init.body);
        assert.ok(b.data.length >= 1 && b.data.length <= 50, 'tirar: entre 1 e 50 faixas por pedido');
        assert.ok(b.data.every((x) => x.meta?.itemId), 'tirar pelo itemId');
        const fora = new Set(b.data.map((x) => x.meta.itemId));
        sim.listas[it[1]] = (sim.listas[it[1]] || []).filter((x) => !fora.has(x.itemId));
        sim.removidos.push(...b.data.map((x) => x.id));
        return resp(null, 204);
    }
    // faixas parecidas
    const par = /^\/tracks\/([^/]+)\/relationships\/similarTracks$/.exec(p);
    if (par) return resp({ data: ['102', '106', '105', '103'].filter((x) => x !== par[1]).map((id) => ({ id, type: 'tracks' })), links: { self: '/x' } });
    // as mixes do utilizador
    const mix = /^\/(userDiscoveryMixes|userDailyMixes|userNewReleaseMixes)\/me\/relationships\/items$/.exec(p);
    if (mix) return resp({ data: ({ userDiscoveryMixes: ['mix-desc'], userDailyMixes: ['mix-dia'], userNewReleaseMixes: [] })[mix[1]].map((id) => ({ id, type: 'playlists' })), links: { self: '/x' } });
    // álbuns de um artista (um saído há 3 dias) e as faixas de um álbum
    const alb = /^\/artists\/([^/]+)\/relationships\/albums$/.exec(p);
    if (alb) {
        const dia = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
        const lista = alb[1] === 'a2' ? [{ id: 'al-novo', title: 'Disco novo', releaseDate: dia(3) }, { id: 'al-novo-x', title: 'Disco novo', releaseDate: dia(3) }, { id: 'al2', title: 'Pastel Blues', releaseDate: '1965-01-01' }] : [];
        return resp({ data: lista.map((x) => ({ id: x.id, type: 'albums' })), included: lista.map((x) => ({ id: x.id, type: 'albums', attributes: { title: x.title, releaseDate: x.releaseDate } })), links: { self: '/x' } });
    }
    // as capas: os álbuns com a capa (artworks com ficheiros de 80 a 1280 px); o da «Teardrop» não tem capa no Tidal
    if (p === '/albums') {
        const ids = url.searchParams.getAll('filter[id]');
        assert.ok(ids.length <= 20, 'no máximo 20 álbuns por pedido');
        assert.equal(url.searchParams.get('include'), 'coverArt');
        sim.chamadas.push(`GET /albums ${ids.join(',')}`);
        const COM = ['al1', 'al2', 'al3', 'al5'];
        const uuid = (id) => [...id].map((c) => c.charCodeAt(0).toString(16)).join('').padEnd(32, '0').slice(0, 32).replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1/$2/$3/$4/$5');
        return resp({ data: ids.map((id) => ({ id, type: 'albums', relationships: { coverArt: { data: COM.includes(id) ? [{ id: 'art-' + id, type: 'artworks' }] : [] } } })),
            included: ids.filter((id) => COM.includes(id)).map((id) => ({ id: 'art-' + id, type: 'artworks', attributes: { mediaType: 'IMAGE',
                files: [1280, 640, 320, 160, 80].map((w) => ({ href: `https://resources.tidal.com/images/${uuid(id)}/${w}x${w}.jpg`, meta: { width: w, height: w } })) } })), links: { self: '/x' } });
    }
    const ai = /^\/albums\/([^/]+)\/relationships\/items$/.exec(p);
    if (ai) return resp({ data: (ai[1] === 'al-novo' ? ['102', '201'] : []).map((id) => ({ id, type: 'tracks' })), links: { self: '/x' } });
    return resp({ errors: [{ title: 'not found ' + p }] }, 404);
}

