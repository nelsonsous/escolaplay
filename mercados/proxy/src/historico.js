// Histórico dos Mercados (base D1 «mercados-historico», binding HIST; esquema em historico.sql).
// O KV continua a ser o que a app lê; aqui fica a evolução, gravada pelo Worker:
//   - cada conselho do Claude, quando a app o vai buscar (/advice): a tarefa grava-o no KV, e o Worker copia-o para aqui
//     na primeira leitura (uma vez por conselho; isto não depende da tarefa, escrita em Onda);
//   - as sugestões automáticas que a app regista uma vez por dia (/journal);
//   - a Carteira do dono, uma fotografia por dia (as quantidades e o investido; o total em € como a app o calcula).
// Gravar aqui nunca impede a resposta: quem chama apanha o erro e segue.

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const txt = (v, n = 600) => (typeof v === 'string' && v ? v.slice(0, n) : null);
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Um conselho (advice:latest do dono, ou ua:<id> de outra app): a linha em «conselhos» e uma em «acoes» por ativo. */
export function adviceRows(para, doc) {
    const at = doc?.generatedAt;
    if (!para || typeof at !== 'string' || !Number.isFinite(Date.parse(at))) return [];
    const data = DAY.test(doc.date || '') ? doc.date : at.slice(0, 10);
    const prices = doc.prices && typeof doc.prices === 'object' ? doc.prices : {};
    const out = [{ sql: 'INSERT OR IGNORE INTO conselhos (para, gerado_em, data, titulo, doc) VALUES (?, ?, ?, ?, ?)',
        params: [para, at, data, txt(doc.headline, 400), JSON.stringify(doc)] }];
    const seen = new Set();
    for (const a of Array.isArray(doc.actions) ? doc.actions : []) {
        const s = txt(a?.s, 24);
        if (!s || seen.has(s)) continue;
        seen.add(s);
        out.push({ sql: 'INSERT OR IGNORE INTO acoes (para, gerado_em, data, ativo, chave, acao, porque, preco) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            params: [para, at, data, s, txt(a.key, 24), txt(a.action, 300), txt(a.why, 900), num(prices[s])] });
    }
    return out;
}

/** O diário de um dia de uma app: uma linha por ativo (itens já limpos por cleanItems). */
export function journalRows(app, date, items) {
    if (!app || !DAY.test(date || '') || !Array.isArray(items)) return [];
    return items.map((x) => ({
        sql: 'INSERT OR REPLACE INTO sugestoes (app, data, ativo, preco, sugestao, longo, medio, curto, oportunidade) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        params: [app, date, x.s, num(x.p), txt(x.a, 12), num(x.l), num(x.m), num(x.sh), x.o ? 1 : 0],
    }));
}

/** O que se investiu num ativo (€): o investido da Carteira ou, na cripto só com compras, a soma delas. */
const invested = (l) => (num(l.cost) ?? (Array.isArray(l.buys) && l.buys.length ? Math.round(l.buys.reduce((s, b) => s + (num(b.e) || 0), 0) * 100) / 100 : null));

/**
 * A Carteira do dono num dia (lots já limpos por cleanLots): o que tem de cada ativo e o total. O dia regrava-se
 * inteiro (um ativo tirado durante o dia sai da fotografia); o valor em € só vem no registo diário da app e,
 * sem ele, fica o que já lá estava.
 */
export function walletRows(date, lots, { items = null, carteira = null } = {}) {
    if (!DAY.test(date || '') || !lots || typeof lots !== 'object') return [];
    const px = new Map((items || []).map((x) => [x.s, x.p]));
    const out = [{ sql: 'DELETE FROM carteira WHERE data = ?', params: [date] }];
    let total = 0, any = false;
    for (const [k, l] of Object.entries(lots)) {
        const qty = num(l.qty), inv = invested(l);
        if (!qty && !inv && !num(l.pm)) continue;
        if (inv) { total += inv; any = true; }
        out.push({ sql: 'INSERT INTO carteira (data, ativo, quantidade, investido, preco, por_mes, prazo) VALUES (?, ?, ?, ?, ?, ?, ?)',
            params: [date, k, qty, inv, num(px.get(k)), num(l.pm), txt(l.hz, 8)] });
    }
    const v = num(carteira?.v), cp = num(carteira?.cp);
    out.push({ sql: `INSERT INTO carteira_dia (data, valor, investido, cripto) VALUES (?, ?, ?, ?)
        ON CONFLICT (data) DO UPDATE SET investido = excluded.investido, valor = COALESCE(excluded.valor, carteira_dia.valor), cripto = COALESCE(excluded.cripto, carteira_dia.cripto)`,
    params: [date, v != null && v >= 0 ? Math.round(v * 100) / 100 : null, any ? Math.round(total * 100) / 100 : null, cp != null && cp >= 0 && cp <= 1 ? cp : null] });
    return out;
}

/** O total da Carteira que a app manda no registo diário: { v: € , cp: parte em cripto, 0 a 1 }. */
export function cleanCarteira(c) {
    if (!c || typeof c !== 'object' || Array.isArray(c)) return null;
    const v = +c.v, cp = +c.cp;
    if (!(Number.isFinite(v) && v >= 0 && v < 1e9)) return null;
    return { v: Math.round(v * 100) / 100, ...(Number.isFinite(cp) && cp >= 0 && cp <= 1 ? { cp: Math.round(cp * 1000) / 1000 } : {}) };
}

/** Corre as instruções numa base D1, todas de uma vez (numa transação). */
export async function runD1(db, stmts) {
    if (!db || !stmts.length) return 0;
    await db.batch(stmts.map((s) => db.prepare(s.sql).bind(...s.params)));
    return stmts.length;
}

// o último conselho já copiado, por destinatário, neste isolate (as leituras seguintes não voltam a escrever)
const copied = new Map();
export async function copyAdvice(db, para, doc) {
    if (!db || !doc?.generatedAt || copied.get(para) === doc.generatedAt) return 0;
    const n = await runD1(db, adviceRows(para, doc));
    if (copied.size > 500) copied.clear();
    copied.set(para, doc.generatedAt);
    return n;
}
export const _resetCopied = () => copied.clear(); // testes

/** A leitura de /history (só o dono): a Carteira dia a dia, os conselhos e, com um ativo, o que se disse dele. */
export async function readHistory(db, { owner, ativo = '', days = 90, now = Date.now() } = {}) {
    const since = new Date(now - days * 864e5).toISOString().slice(0, 10);
    const q = [
        db.prepare('SELECT data, valor, investido, cripto FROM carteira_dia WHERE data >= ? ORDER BY data').bind(since),
        db.prepare("SELECT data, gerado_em, titulo FROM conselhos WHERE para = 'dono' AND data >= ? ORDER BY gerado_em DESC LIMIT 400").bind(since),
    ];
    if (ativo) q.push(
        db.prepare("SELECT data, gerado_em, chave, acao, porque, preco FROM acoes WHERE para = 'dono' AND ativo = ? AND data >= ? ORDER BY gerado_em").bind(ativo, since),
        db.prepare('SELECT data, preco, sugestao, longo, medio, curto, oportunidade FROM sugestoes WHERE app = ? AND ativo = ? AND data >= ? ORDER BY data').bind(owner, ativo, since),
        db.prepare('SELECT data, quantidade, investido, preco FROM carteira WHERE ativo = ? AND data >= ? ORDER BY data').bind(ativo, since));
    const [c, a, ac, sg, ct] = await db.batch(q);
    return { carteira: c.results || [], conselhos: a.results || [],
        ...(ativo ? { ativo: { s: ativo, conselhos: ac.results || [], sugestoes: sg.results || [], carteira: ct.results || [] } } : {}) };
}
