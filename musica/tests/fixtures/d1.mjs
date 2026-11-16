// D1 simulado com o SQLite do Node (node:sqlite): o mesmo SQL que a base da Cloudflare, numa base em memória.
// Só o que os Workers usam: prepare().bind().run()/all()/first(), batch() e exec().
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

export function fakeD1(schemaFile) {
    const db = new DatabaseSync(':memory:');
    if (schemaFile) db.exec(readFileSync(schemaFile, 'utf8'));
    const stmt = (sql, params = []) => ({
        sql, params,
        bind: (...p) => stmt(sql, p),
        run: async () => { const r = db.prepare(sql).run(...params); return { success: true, meta: { changes: Number(r.changes) } }; },
        all: async () => ({ success: true, results: db.prepare(sql).all(...params).map((r) => ({ ...r })) }),
        first: async (col) => { const r = db.prepare(sql).get(...params); return r ? (col ? r[col] : { ...r }) : null; },
    });
    const d1 = {
        raw: db, calls: 0,
        prepare: (sql) => stmt(sql),
        // como na D1: tudo numa transação; um erro desfaz o lote inteiro
        batch: async (list) => {
            d1.calls++;
            db.exec('BEGIN');
            try {
                const out = [];
                for (const s of list) out.push(/^\s*(SELECT|WITH)/i.test(s.sql) ? await s.all() : await s.run());
                db.exec('COMMIT');
                return out;
            } catch (e) { db.exec('ROLLBACK'); throw e; }
        },
        exec: async (sql) => { db.exec(sql); return { count: 1 }; },
        rows: (sql, ...p) => db.prepare(sql).all(...p).map((r) => ({ ...r })),
    };
    return d1;
}
