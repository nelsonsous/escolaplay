// API oficial do Tidal (v2, JSON:API) — constantes e leitura das respostas. Sem rede: só funções puras,
// usadas pelo Worker (que fala com o Tidal), pela app e pelos testes.
// Referência: @tidal-music/api (tidal-api-oas.json) e @tidal-music/auth (PKCE).

export const API = 'https://openapi.tidal.com/v2';
export const LOGIN = 'https://login.tidal.com/authorize';
export const TOKEN = 'https://auth.tidal.com/v1/oauth2/token';
export const SCOPES = ['user.read', 'collection.read', 'playlists.read', 'playlists.write', 'search.read', 'recommendations.read'];
export const JSONAPI = 'application/vnd.api+json';
export const MAX_IDS = 20; // GET /tracks?filter[id]= aceita no máximo 20
export const MAX_ITENS = 50; // POST /playlists/{id}/relationships/items aceita no máximo 50

// "PT3M45S" → 225
export function segundos(iso) {
    const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:([\d.]+)S)?)?$/.exec(String(iso || ''));
    if (!m) return 0;
    return Math.round((+m[1] || 0) * 86400 + (+m[2] || 0) * 3600 + (+m[3] || 0) * 60 + (+m[4] || 0));
}

// Tom do Tidal → roda de Camelot: 1..12 (A, menor) ou 13..24 (B, maior); 0 = desconhecido.
const NOTA = { C: 0, CSharp: 1, D: 2, Eb: 3, E: 4, F: 5, FSharp: 6, G: 7, Ab: 8, A: 9, Bb: 10, B: 11 };
const CAMELOT_MAIOR = [8, 3, 10, 5, 12, 7, 2, 9, 4, 11, 6, 1];
const CAMELOT_MENOR = [5, 12, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10];
const MENORES = new Set(['MINOR', 'AEOLIAN', 'DORIAN', 'HARMONIC_MINOR', 'MELODIC_MINOR', 'PHRYGIAN', 'LOCRIAN', 'PENTATONIC_MINOR']);
const MAIORES = new Set(['MAJOR', 'LYDIAN', 'MIXOLYDIAN', 'PENTATONIC_MAJOR']);
export function camelot(key, escala) {
    const n = NOTA[key];
    if (n === undefined) return 0;
    if (MAIORES.has(escala)) return CAMELOT_MAIOR[n] + 12;
    if (MENORES.has(escala)) return CAMELOT_MENOR[n];
    return 0;
}
export function camelotTexto(t) { return t > 0 ? `${((t - 1) % 12) + 1}${t > 12 ? 'B' : 'A'}` : ''; }

// Qualidade do som pelas etiquetas do Tidal: 0..1000
export function qualidadeSom(tags = []) {
    const t = new Set(tags);
    let q = t.has('HIRES_LOSSLESS') ? 1000 : t.has('LOSSLESS') ? 750 : 350;
    if (t.has('DOLBY_ATMOS') || t.has('SONY_360RA')) q = Math.min(1000, q + 100);
    return q;
}
export function qualidadeTexto(tags = []) {
    const t = new Set(tags);
    return t.has('HIRES_LOSSLESS') ? 'Hi-Res' : t.has('LOSSLESS') ? 'Sem perdas' : 'Normal';
}

// Documento JSON:API → mapa "tipo:id" → recurso (data + included)
export function indexar(doc) {
    const m = new Map();
    for (const r of [...(Array.isArray(doc?.data) ? doc.data : doc?.data ? [doc.data] : []), ...(doc?.included || [])]) {
        if (r && r.id && r.type && (r.attributes || !m.has(`${r.type}:${r.id}`))) m.set(`${r.type}:${r.id}`, r);
    }
    return m;
}
const rel = (r, nome) => (r?.relationships?.[nome]?.data || []);

// Recurso "tracks" (com artists/albums/genres incluídos) → faixa normalizada
export function faixa(r, idx = new Map()) {
    const a = r?.attributes || {};
    const artistas = rel(r, 'artists').map((x) => idx.get(`artists:${x.id}`)?.attributes?.name).filter(Boolean);
    const album = idx.get(`albums:${rel(r, 'albums')[0]?.id}`)?.attributes || null;
    const generos = rel(r, 'genres').map((x) => idx.get(`genres:${x.id}`)?.attributes?.genreName).filter(Boolean);
    const ano = parseInt(String(album?.releaseDate || '').slice(0, 4), 10);
    const tags = [...new Set([...(a.mediaTags || []), ...(album?.mediaTags || [])])];
    return {
        id: String(r.id),
        titulo: a.title || '',
        versao: a.version || '',
        artistas,
        album: album?.title || '',
        ano: Number.isFinite(ano) ? ano : 0,
        isrc: a.isrc || '',
        duracao: segundos(a.duration),
        popularidade: typeof a.popularity === 'number' ? Math.round(a.popularity * 1000) : 0,
        bpm: typeof a.bpm === 'number' && a.bpm > 0 ? Math.round(a.bpm) : 0,
        tom: camelot(a.key, a.keyScale),
        tags,
        generos,
        explicita: !!a.explicit,
        url: `https://tidal.com/browse/track/${r.id}`,
    };
}

// Todas as faixas de um documento (data e included), já normalizadas, por id
export function faixas(doc) {
    const idx = indexar(doc);
    const out = new Map();
    for (const r of idx.values()) if (r.type === 'tracks' && r.attributes) out.set(String(r.id), faixa(r, idx));
    return out;
}

// Texto para comparar: sem acentos, minúsculas, sem pontuação nem ruído de edição
const RUIDO = /\b(remaster(ed)?|remasterizad[oa]|\d{4} remaster(ed)?|mono|stereo|version|versao|edit|single|mix|original|deluxe|bonus track)\b/g;
export function normal(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
        .replace(/\(.*?\)|\[.*?\]/g, ' ').replace(/\s+-\s+.*$/, ' ').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ')
        .replace(RUIDO, ' ').replace(/\s+/g, ' ').trim();
}
const VARIANTE = /\b(live|ao vivo|en vivo|remix|acoustic|acustic[oa]|karaoke|instrumental|cover|demo|sped up|slowed)\b/i;

// Quão bem uma faixa do Tidal corresponde ao pedido { artista, titulo }: 0 (não é) a ~10
export function correspondencia(pedido, f) {
    const tp = normal(pedido.titulo), ap = normal(pedido.artista);
    const tf = normal(f.titulo), artistas = f.artistas.map(normal);
    if (!tp || !tf) return 0;
    let s = 0;
    if (tf === tp) s += 5; else if (tf.startsWith(tp) || tp.startsWith(tf)) s += 3; else if (tf.includes(tp) || tp.includes(tf)) s += 2; else return 0;
    if (ap) {
        if (artistas.some((a) => a === ap)) s += 4;
        else if (artistas.some((a) => a.includes(ap) || ap.includes(a))) s += 2.5;
        else return 0;
    }
    // versões ao vivo, remisturas, etc. só quando pedidas (e, quando pedidas, a original fica atrás)
    if (VARIANTE.test(`${pedido.titulo} ${pedido.versao || ''}`) !== VARIANTE.test(`${f.titulo} ${f.versao || ''}`)) s -= 3;
    s += f.tags.includes('HIRES_LOSSLESS') ? 0.6 : f.tags.includes('LOSSLESS') ? 0.4 : 0;
    s += f.popularidade / 1000;
    return s;
}

// A melhor correspondência entre várias faixas (ou null se nenhuma servir)
export function melhor(pedido, lista, minimo = 5) {
    let best = null, bs = -1;
    for (const f of lista) {
        const s = correspondencia(pedido, f);
        if (s > bs) { bs = s; best = f; }
    }
    return bs >= minimo ? best : null;
}
