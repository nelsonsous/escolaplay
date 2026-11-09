// Tendências: o que se está a ouvir, pelas tabelas públicas (Apple Music e Deezer, sem chave). O Worker recolhe-as uma
// vez por dia (cron), guarda um retrato por dia na KV (60 dias) e vê, para cada tabela, o que sobe, o que é novo e o
// que dura. Cruzado com o gosto de cada pessoa dá o «para ti». A app mostra-o e o Maestro usa-o nas propostas.
import { normal } from '../../lib/tidal.js';

const txt = (v, max = 160) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const lerApple = (j) => (j?.feed?.results || []).map((r) => ({ artista: txt(r.artistName), titulo: txt(r.name),
    genero: txt((r.genres || []).map((g) => g?.name).find((g) => g && g !== 'Music'), 40) }));
const lerDeezer = (j) => (j?.data || []).map((r) => ({ artista: txt(r.artist?.name), titulo: txt(r.title_short || r.title), genero: '' }));

export const FONTES = [
    { id: 'pt', nome: 'Portugal (Apple Music)', url: 'https://rss.marketingtools.apple.com/api/v2/pt/music/most-played/100/songs.json', ler: lerApple },
    { id: 'mundo', nome: 'Mundo (Deezer)', url: 'https://api.deezer.com/chart/0/tracks?limit=100', ler: lerDeezer },
    { id: 'eua', nome: 'EUA (Apple Music)', url: 'https://rss.marketingtools.apple.com/api/v2/us/music/most-played/100/songs.json', ler: lerApple },
];
const DIAS = 60; // o histórico que se guarda
export const SOBE = 10; // lugares ganhos numa semana para «a subir»
export const DURA = 21; // dias na tabela para «sucesso que dura»

// a mesma canção de dia para dia e entre tabelas: o primeiro artista e o título (sem acentos, sem «(feat. …)», sem
// «remaster»): «Shakira & Burna Boy — Dai Dai» e «Shakira — Dai Dai» são a mesma
const primeiro = (a) => String(a || '').split(/\s*(?:,|&|\+|\bfeat\.?|\bft\.?|\bwith\b|\bx\b|\be\b)\s*/i)[0];
const chave = (x) => `${normal(primeiro(x.artista))}|${normal(x.titulo)}`;
const dia = (ms) => new Date(ms).toISOString().slice(0, 10);
const entre = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);

// O retrato de hoje: as tabelas (as que responderem), guardadas em [artista, título, género]
export async function recolher(env, agora = Date.now()) {
    const fontes = {}, erros = [];
    for (const f of FONTES) {
        try {
            const r = await fetch(f.url, { headers: { accept: 'application/json', 'user-agent': 'musica-app (Cloudflare Worker)' } });
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            const lista = f.ler(await r.json()).filter((x) => x.artista && x.titulo).slice(0, 100);
            if (!lista.length) throw new Error('tabela vazia');
            fontes[f.id] = lista.map((x) => [x.artista, x.titulo, x.genero]);
        } catch (e) { erros.push(`${f.id}: ${e.message}`); }
    }
    if (!Object.keys(fontes).length) return { ok: false, erros };
    const hoje = dia(agora);
    await env.KV.put(`tendencias:dia:${hoje}`, JSON.stringify({ fontes }), { expirationTtl: 70 * 86400 });
    const dias = [...new Set([...((await env.KV.get('tendencias:dias', 'json')) || []), hoje])].sort().slice(-DIAS);
    await env.KV.put('tendencias:dias', JSON.stringify(dias));
    const hist = await Promise.all(dias.map((d) => env.KV.get(`tendencias:dia:${d}`, 'json')));
    await env.KV.put('tendencias:resumo', JSON.stringify(resumir(dias, hist, agora)));
    return { ok: true, dia: hoje, fontes: Object.keys(fontes), erros };
}

// Para cada tabela de hoje: o lugar, o de ontem e o de há uma semana, os dias na tabela e o estado
//   sobe: ganhou 10 lugares ou mais numa semana · nova: entrou nos últimos 7 dias (com mais de uma semana de
//   histórico, para se saber) · dura: 21 dias ou mais na tabela
export function resumir(dias, hist, agora = Date.now()) {
    const h = dias.length - 1;
    const out = { atualizadoEm: new Date(agora).toISOString(), desde: dias[0], dias: dias.length, fontes: [] };
    for (const f of FONTES) {
        const atual = hist[h]?.fontes?.[f.id];
        if (!atual) continue;
        const lugares = hist.map((d) => {
            const m = new Map();
            (d?.fontes?.[f.id] || []).forEach(([artista, titulo], i) => { const k = chave({ artista, titulo }); if (!m.has(k)) m.set(k, i + 1); });
            return m;
        });
        // o dia de referência para «há uma semana»: o mais antigo dos últimos 7 (o histórico pode ter falhas)
        let ref = h;
        while (ref > 0 && entre(dias[ref - 1], dias[h]) <= 7) ref--;
        const itens = atual.map(([artista, titulo, genero], i) => {
            const k = chave({ artista, titulo }), pos = i + 1;
            const presentes = lugares.filter((m) => m.has(k)).length;
            const primeiro = dias[lugares.findIndex((m) => m.has(k))];
            const ontem = h > 0 ? lugares[h - 1].get(k) ?? null : null;
            const semana = ref < h ? lugares[ref].get(k) ?? null : null;
            const estado = semana != null && semana - pos >= SOBE ? 'sobe'
                : entre(dias[0], dias[h]) >= 7 && entre(primeiro, dias[h]) < 7 ? 'nova'
                    : presentes >= DURA ? 'dura' : '';
            return { pos, artista, titulo, genero, ontem, semana, dias: presentes, estado };
        });
        out.fontes.push({ id: f.id, nome: f.nome, itens });
    }
    return out;
}

// O que, das tabelas, encaixa no gosto de uma pessoa (o perfil que o Worker guardou): os artistas que segue ou que
// estão nas favoritas, e os géneros das favoritas (no máximo 5 só pelo género). Sem repetir canções entre tabelas; no máximo 15.
export function paraTi(resumo, perfil) {
    if (!resumo?.fontes?.length || !perfil) return [];
    const seguidos = new Set((perfil.artistas || []).map((a) => normal(a.nome)).filter((s) => s.length > 1));
    const favoritos = new Set((perfil.favoritas || []).flatMap((f) => f.artistas || []).map(normal).filter((s) => s.length > 1));
    const generos = new Set((perfil.resumo?.generos || []).slice(0, 6).map((g) => normal(g.nome)).filter(Boolean));
    const tem = (conj, a) => [...conj].some((s) => a === s || ` ${a} `.includes(` ${s} `));
    const vistos = new Set(), out = [];
    for (const f of resumo.fontes) {
        for (const x of f.itens) {
            const k = chave(x);
            if (vistos.has(k)) continue;
            const a = normal(x.artista);
            const porque = tem(seguidos, a) ? 'segues' : tem(favoritos, a) ? 'nas favoritas' : x.genero && generos.has(normal(x.genero)) ? 'no teu estilo' : '';
            if (!porque) continue;
            vistos.add(k);
            const peso = (porque === 'no teu estilo' ? 1 : 3) + (x.estado === 'sobe' ? 2 : x.estado ? 1 : 0) + (100 - x.pos) / 100;
            out.push({ artista: x.artista, titulo: x.titulo, genero: x.genero, fonte: f.nome, pos: x.pos, semana: x.semana, estado: x.estado, porque, peso });
        }
    }
    // pelo género só, no máximo 5 (as de artistas teus vêm primeiro)
    let estilo = 0;
    return out.sort((a, b) => b.peso - a.peso).filter((x) => x.porque !== 'no teu estilo' || ++estilo <= 5).slice(0, 15).map(({ peso, ...x }) => x);
}
