// Do pedido (o que o Claude escolheu) + a faixa encontrada no Tidal + o teu gosto → os sinais (0..1000)
// que o motor Onda pesa. Partilhado pela app (afinar no telemóvel) e pela tarefa agendada.
import { normal, qualidadeSom } from './tidal.js';

// Perfil de gosto a partir das favoritas e dos artistas seguidos: contagens por artista, género e década.
export function perfilGosto(perfil = {}) {
    const artistas = new Map(), generos = new Map(), decadas = new Map(), ids = new Set(), isrcs = new Set();
    for (const f of perfil.favoritas || []) {
        ids.add(String(f.id));
        if (f.isrc) isrcs.add(f.isrc);
        for (const a of f.artistas || []) artistas.set(normal(a), (artistas.get(normal(a)) || 0) + 1);
        for (const g of f.generos || []) generos.set(normal(g), (generos.get(normal(g)) || 0) + 1);
        if (f.ano) decadas.set(Math.floor(f.ano / 10) * 10, (decadas.get(Math.floor(f.ano / 10) * 10) || 0) + 1);
    }
    for (const a of perfil.artistas || []) artistas.set(normal(a.nome || a), Math.max(2, artistas.get(normal(a.nome || a)) || 0));
    return { artistas, generos, decadas, ids, isrcs, n: (perfil.favoritas || []).length };
}

const decada = (ano) => (ano ? Math.floor(ano / 10) * 10 : 0);
const topo = (mapa, n) => new Set([...mapa.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map((x) => x[0]));

// Uma candidata pronta para o motor. `c` = pedido do Claude { artista, titulo, ano?, genero?, nota?, energia?,
// tendencia?, fixa? }; `f` = faixa do Tidal (lib/tidal.js → faixa) ou null; `g` = perfilGosto(...)
export function sinais(c, f, g) {
    const nomes = (f?.artistas?.length ? f.artistas : [c.artista]).map(normal);
    const vezes = Math.max(0, ...nomes.map((a) => g?.artistas.get(a) || 0));
    const ano = Number(c.ano) || f?.ano || 0; // o ano original (do Claude) vale mais do que o da remasterização
    const genero = c.genero || f?.generos?.[0] || '';
    let gosto = vezes >= 3 ? 1000 : vezes === 2 ? 850 : vezes === 1 ? 700 : 200;
    if (vezes === 0 && g) {
        if (genero && topo(g.generos, 5).has(normal(genero))) gosto = 450;
        else if (ano && topo(g.decadas, 3).has(decada(ano))) gosto = 350;
    }
    const favorita = !!f && (g?.ids.has(String(f.id)) || (f.isrc && g?.isrcs.has(f.isrc)));
    const bpm = f?.bpm || Math.round(Number(c.bpm) || 0);
    const energia = c.energia != null && c.energia !== '' ? Number(c.energia) * 10
        : bpm ? Math.min(950, Math.max(100, ((bpm - 60) * 1000) / 110)) : 500;
    return {
        artista: (f?.artistas?.[0]) || c.artista,
        genero,
        ano,
        gosto,
        qualidade: f ? qualidadeSom(f.tags) : 0,
        tendencia: Math.max(f?.popularidade || 0, Math.round(Number(c.tendencia) || 0) * 10),
        claude: c.nota != null && c.nota !== '' ? Math.round(Number(c.nota) * 10) : 700,
        novidade: favorita ? 150 : vezes ? 600 : 1000,
        energia: Math.round(energia),
        bpm,
        tom: f?.tom || 0,
        fixa: !!c.fixa,
    };
}
