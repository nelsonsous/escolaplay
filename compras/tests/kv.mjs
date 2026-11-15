// A KV simulada dos testes: valores, apagar, e quantas gravações se fizeram (a KV grátis dá 1000 por dia à conta).
export function kv(inicial = {}) {
    const m = new Map(Object.entries(inicial));
    const db = {
        m, gravacoes: 0,
        get: async (k, o) => {
            if (!m.has(k)) return null;
            const tipo = typeof o === 'string' ? o : o?.type;
            return tipo === 'json' ? JSON.parse(m.get(k)) : m.get(k);
        },
        put: async (k, v) => { db.gravacoes++; m.set(k, String(v)); },
        delete: async (k) => { m.delete(k); },
    };
    return db;
}
