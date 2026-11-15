// A saúde da base (volta 7): o que o Worker sabe de si próprio, para se ver de relance se alguma cadeia deixou de dar
// preços (o site mudou), quantos produtos estão suspeitos e se o SPAR está ligado. Pela sonda (com o segredo), completo;
// pela app (/api/saude), só a hora do preço mais recente de cada cadeia. Uma cadeia fica «aviso» se menos de 80% das
// páginas de categoria se leram nas últimas 26 horas, ou se mais de 20% falham.
const HORA = 3600e3;

export async function saude(db, agora = new Date()) {
    const dia = new Date(agora.getTime() - 26 * HORA).toISOString();
    const dois = new Date(agora.getTime() - 48 * HORA).toISOString();
    const [pags, precos, susp, tipos, spar] = await Promise.all([
        db.prepare(`SELECT cadeia, count(*) AS n, sum(visto > ?1) AS lidas, sum(falhas > 0) AS falham, max(visto) AS ultima
            FROM pagina WHERE marca = 0 GROUP BY cadeia`).bind(dia).all(),
        db.prepare(`SELECT cadeia, count(*) AS n, sum(visto > ?1) AS recentes, max(visto) AS ultimo FROM preco
            WHERE cent IS NOT NULL AND tipo IS NOT NULL GROUP BY cadeia`).bind(dois).all(),
        db.prepare('SELECT suspeito, count(*) AS n FROM preco WHERE suspeito IS NOT NULL GROUP BY suspeito').all(),
        db.prepare(`SELECT count(*) AS n, sum(n > 0) AS com, sum(casa = 1 AND (n IS NULL OR n = 0)) AS casa_vazios FROM tipo`).first(),
        db.prepare('SELECT count(*) AS n, sum(eq_cent IS NOT NULL) AS com_preco, max(visto) AS visto FROM spar_artigo').first(),
    ]);
    const prod = new Map(precos.results.map((r) => [r.cadeia, r]));
    const cadeias = pags.results.map((p) => {
        const pr = prod.get(p.cadeia) ?? {};
        const lidas = Number(p.lidas ?? 0) / Math.max(1, Number(p.n));
        const falham = Number(p.falham ?? 0) / Math.max(1, Number(p.n));
        return {
            cadeia: p.cadeia, paginas: Number(p.n), lidas_26h: Number(p.lidas ?? 0), falham: Number(p.falham ?? 0), ultima_pagina: p.ultima,
            produtos: Number(pr.n ?? 0), recentes_48h: Number(pr.recentes ?? 0), ultimo_preco: pr.ultimo ?? null,
            estado: lidas >= 0.8 && falham <= 0.2 ? 'ok' : 'aviso',
        };
    });
    return {
        quando: agora.toISOString(),
        estado: cadeias.every((c) => c.estado === 'ok') ? 'ok' : 'aviso',
        cadeias,
        suspeitos: Object.fromEntries(susp.results.map((r) => [r.suspeito, Number(r.n)])),
        tipos: { total: Number(tipos?.n ?? 0), com_produtos: Number(tipos?.com ?? 0), da_casa_sem_produtos: Number(tipos?.casa_vazios ?? 0) },
        spar: { artigos: Number(spar?.n ?? 0), com_estimativa: Number(spar?.com_preco ?? 0), visto: spar?.visto ?? null },
    };
}
// para a app: só a hora do preço mais recente de cada cadeia (e o estado)
export async function saudeCurta(db, agora = new Date()) {
    const s = await saude(db, agora);
    return { estado: s.estado, cadeias: s.cadeias.map((c) => ({ cadeia: c.cadeia, ultimo_preco: c.ultimo_preco, estado: c.estado,
        ha: c.ultimo_preco ? Math.max(0, Math.round((agora - new Date(c.ultimo_preco)) / 60e3)) : null })) };
}
