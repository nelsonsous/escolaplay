// Histórico da Música (base D1 «musica-historico», binding HIST; esquema em historico.sql).
// O KV guarda as tabelas de cada dia só 70 dias e reescreve o perfil; aqui fica a evolução:
//   - o retrato diário das tabelas (o cron das tendências);
//   - cada versão do perfil de gosto do dono, quando muda (as favoritas que entram e saem).
// Gravar aqui nunca impede a resposta: quem chama apanha o erro e segue.

const txt = (v, n = 200) => (typeof v === 'string' && v ? v.slice(0, n) : null);
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** As tabelas de um dia ({ fonte: [[artista, título, género], …] }): uma linha por lugar. */
export function trendRows(dia, fontes) {
    if (!DAY.test(dia || '') || !fontes || typeof fontes !== 'object') return [];
    const out = [];
    for (const [fonte, lista] of Object.entries(fontes)) {
        if (!Array.isArray(lista)) continue;
        lista.slice(0, 100).forEach((x, i) => out.push({
            sql: 'INSERT OR REPLACE INTO tendencias (dia, fonte, lugar, artista, titulo, genero) VALUES (?, ?, ?, ?, ?, ?)',
            params: [dia, txt(fonte, 12), i + 1, txt(x?.[0]), txt(x?.[1]), txt(x?.[2], 40)],
        }));
    }
    return out;
}

const idsOf = (p) => (Array.isArray(p?.favoritas) ? p.favoritas : []).map((f) => String(f.id)).join(',');
const resumoOf = (p) => JSON.stringify(p?.resumo || {});

/**
 * Uma versão do perfil (o que perfil() grava no KV): a linha em «perfis» e as favoritas. Com a última versão gravada
 * (last = { ids, resumo }), só grava se as favoritas ou o resumo mudaram.
 */
export function profileRows(p, last = null) {
    const at = p?.geradoEm;
    if (typeof at !== 'string' || !Number.isFinite(Date.parse(at))) return [];
    const ids = idsOf(p), resumo = resumoOf(p);
    if (last && last.ids === ids && last.resumo === resumo) return [];
    const fav = Array.isArray(p.favoritas) ? p.favoritas : [];
    return [
        { sql: 'INSERT OR REPLACE INTO perfis (gerado_em, utilizador, favoritas, artistas, playlists, resumo, ids) VALUES (?, ?, ?, ?, ?, ?, ?)',
            params: [at, txt(p.utilizador, 80), fav.length, Array.isArray(p.artistas) ? p.artistas.length : null, Array.isArray(p.playlists) ? p.playlists.length : null, resumo, ids] },
        ...fav.filter((f) => f && f.id).map((f) => ({
            sql: `INSERT INTO favoritas (id, artista, titulo, album, ano, generos, adicionada, primeira_vez, ultima_vez) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (id) DO UPDATE SET ultima_vez = excluded.ultima_vez, adicionada = COALESCE(excluded.adicionada, favoritas.adicionada)`,
            params: [String(f.id), txt((f.artistas || []).join(', ')), txt(f.titulo), txt(f.album), Number.isFinite(f.ano) && f.ano > 0 ? f.ano : null,
                txt((f.generos || []).join(', ')), txt(f.adicionada, 40), at, at],
        })),
    ];
}

/** Corre as instruções numa base D1, todas de uma vez (numa transação). */
export async function runD1(db, stmts) {
    if (!db || !stmts.length) return 0;
    await db.batch(stmts.map((s) => db.prepare(s.sql).bind(...s.params)));
    return stmts.length;
}

/** Guarda a versão do perfil se mudou desde a última gravada. Devolve quantas instruções correu (0: igual). */
export async function saveProfile(db, p) {
    if (!db) return 0;
    const last = await db.prepare('SELECT ids, resumo FROM perfis ORDER BY gerado_em DESC LIMIT 1').first();
    return runD1(db, profileRows(p, last));
}
