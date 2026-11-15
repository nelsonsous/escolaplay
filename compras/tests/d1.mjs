// A D1 simulada dos testes: SQLite na memória (node:sqlite), com as tabelas de proxy/migrations, e a mesma forma da
// D1 dos Workers (prepare/bind/first/all/run, batch numa transação). Conta as escritas que mudam alguma coisa.
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';

const PASTA = new URL('../proxy/migrations/', import.meta.url);
const linha = (r) => (r ? { ...r } : null);

export function d1() {
    const sql = new DatabaseSync(':memory:');
    for (const f of readdirSync(PASTA).filter((f) => f.endsWith('.sql')).sort()) sql.exec(readFileSync(new URL(f, PASTA), 'utf8'));
    const db = { sql, escritas: 0 };
    const correr = (q, args) => {
        const r = sql.prepare(q).run(...args);
        db.escritas += Number(r.changes) > 0 ? 1 : 0;
        return { success: true, meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } };
    };
    const frase = (q, args = []) => ({
        bind: (...a) => frase(q, a.map((v) => (v === undefined ? (() => { throw new Error('D1_TYPE_ERROR: undefined') })() : v))),
        first: async (col) => { const r = linha(sql.prepare(q).get(...args)); return r && col ? r[col] : r; },
        all: async () => ({ success: true, results: sql.prepare(q).all(...args).map(linha) }),
        run: async () => correr(q, args),
        _q: q, _args: args,
    });
    db.prepare = (q) => frase(q);
    db.batch = async (frases) => {
        sql.exec('BEGIN');
        try {
            const r = frases.map((f) => (/^\s*select/i.test(f._q) ? { success: true, results: sql.prepare(f._q).all(...f._args).map(linha) } : correr(f._q, f._args)));
            sql.exec('COMMIT');
            return r;
        } catch (e) { sql.exec('ROLLBACK'); throw e; }
    };
    db.linhas = (q, ...a) => sql.prepare(q).all(...a).map(linha);
    return db;
}
