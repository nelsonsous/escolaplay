// Histórico da Meteo (base D1 «meteo-historico»; esquema em proxy/historico.sql).
// Aqui só se montam as instruções SQL ({ sql, params }); quem as corre é o Worker (binding HIST, runD1) ou a tarefa
// agendada (API da Cloudflare, analista/comum.mjs). Gravar no histórico nunca impede a publicação: quem chama apanha
// o erro e segue (o KV, que a app lê, já está gravado).

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const txt = (v, n = 4000) => (typeof v === 'string' && v ? v.slice(0, n) : null);
const DAY = /^\d{4}-\d{2}-\d{2}$/;
// o dia de Lisboa de um instante (os locais são em Portugal; o prazo conta-se no dia de lá)
const lisbonDay = (iso) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon' }).format(new Date(iso));
const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);

/** Uma análise publicada: a linha em «analises» e uma em «numeros» por cada dia que ela deu em números. */
export function analysisRows(doc) {
    const id = doc?.place?.id, at = doc?.generatedAt;
    if (typeof id !== 'string' || !id || typeof at !== 'string' || !Number.isFinite(Date.parse(at))) return [];
    const p = doc.place;
    const out = [{
        sql: 'INSERT OR REPLACE INTO analises (local, gerada_em, nome, lat, lon, por, modelo, titulo, resumo, pesos, doc) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        params: [id, at, txt(p.name, 80), num(p.lat), num(p.lon), txt(doc.by, 40), txt(doc.model, 80), txt(doc.titulo, 200), txt(doc.resumo, 1200),
            doc.pesos ? JSON.stringify(doc.pesos) : null, JSON.stringify(doc)],
    }];
    const day0 = lisbonDay(at);
    const cons = new Map((Array.isArray(doc.consenso) ? doc.consenso : []).filter((d) => DAY.test(d?.data || '')).map((d) => [d.data, d]));
    for (const n of Array.isArray(doc.numeros) ? doc.numeros : []) {
        if (!DAY.test(n?.data || '')) continue;
        const c = cons.get(n.data) || {};
        out.push({
            sql: 'INSERT OR REPLACE INTO numeros (local, gerada_em, dia, prazo, tmax, tmin, chuva, rajada, c_tmax, c_tmin, c_chuva, c_rajada) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            params: [id, at, n.data, daysBetween(day0, n.data), num(n.tmax), num(n.tmin), num(n.chuva), num(n.rajada),
                num(c.tmax), num(c.tmin), num(c.chuva), num(c.rajada)],
        });
    }
    return out;
}

/**
 * O que as estações mediram em cada dia já acabado (fc.observed.days do motor) e o que o consenso dava na véspera.
 * Os dias voltam a gravar-se nas corridas seguintes: com mais estações a chegar, o valor fica mais certo.
 */
export function observedRows(id, days, { today, at = new Date().toISOString() } = {}) {
    if (typeof id !== 'string' || !id) return [];
    return (Array.isArray(days) ? days : []).filter((d) => DAY.test(d?.date || '') && (!today || d.date < today)
        && (num(d.tmax) != null || num(d.tmin) != null || num(d.rain) != null)).map((d) => ({
        sql: 'INSERT OR REPLACE INTO observado (local, dia, tmax, tmin, chuva, chuva_min, chuva_max, n_temp, n_chuva, v_tmax, v_tmin, v_chuva, atualizado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        params: [id, d.date, num(d.tmax), num(d.tmin), num(d.rain), num(d.rainLo), num(d.rainHi), num(d.nT), num(d.nR),
            num(d.model?.tmax), num(d.model?.tmin), num(d.model?.rain), at],
    }));
}

/** Corre as instruções numa base D1 (binding do Worker), todas de uma vez. */
export async function runD1(db, stmts) {
    if (!db || !stmts.length) return 0;
    await db.batch(stmts.map((s) => db.prepare(s.sql).bind(...s.params)));
    return stmts.length;
}

/** A leitura de /api/history: as análises do local (as mais recentes primeiro) e, por dia, o previsto e o medido. */
export async function readHistory(db, id, { days = 30, now = Date.now() } = {}) {
    const since = new Date(now - days * 864e5).toISOString();
    const sinceDay = since.slice(0, 10);
    const [a, n, o] = await db.batch([
        db.prepare('SELECT gerada_em, por, titulo, resumo FROM analises WHERE local = ? AND gerada_em >= ? ORDER BY gerada_em DESC LIMIT 200').bind(id, since),
        db.prepare('SELECT gerada_em, dia, prazo, tmax, tmin, chuva, rajada, c_tmax, c_tmin, c_chuva, c_rajada FROM numeros WHERE local = ? AND dia >= ? ORDER BY dia, gerada_em').bind(id, sinceDay),
        db.prepare('SELECT dia, tmax, tmin, chuva, chuva_min, chuva_max, n_temp, n_chuva, v_tmax, v_tmin, v_chuva FROM observado WHERE local = ? AND dia >= ? ORDER BY dia').bind(id, sinceDay),
    ]);
    const obs = new Map((o.results || []).map((r) => [r.dia, r]));
    const byDay = new Map();
    for (const r of n.results || []) {
        const d = byDay.get(r.dia) || { dia: r.dia, previsto: [], observado: obs.get(r.dia) || null };
        d.previsto.push(r);
        byDay.set(r.dia, d);
    }
    for (const [dia, r] of obs) if (!byDay.has(dia)) byDay.set(dia, { dia, previsto: [], observado: r });
    return { analises: a.results || [], dias: [...byDay.values()].sort((x, y) => x.dia.localeCompare(y.dia)) };
}
