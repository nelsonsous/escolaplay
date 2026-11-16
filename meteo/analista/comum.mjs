// Utilitários da tarefa agendada: Worker, base de dados (KV) e histórico (D1) pela API da Cloudflare.
import { readFileSync } from 'node:fs';

const toml = readFileSync(new URL('../proxy/wrangler.toml', import.meta.url), 'utf8');
export const WORKER = process.env.METEO_WORKER || 'https://meteo.mercados-proxy.workers.dev';
export const ACCOUNT = process.env.CF_ACCOUNT_ID || 'e5f9f94050228b1fa9f74443667b20a6';
export const KV_NS = (toml.match(/binding = "KV"\s*\nid = "([0-9a-f]+)"/) || [])[1];
export const D1_ID = (toml.match(/binding = "HIST"[\s\S]*?database_id = "([0-9a-f-]+)"/) || [])[1];
// O token é injetado pelo proxy do ambiente (ou vem de CLOUDFLARE_API_TOKEN)
const CF_AUTH = { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN || 'proxy-injected'}` };
const KV = () => `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/storage/kv/namespaces/${KV_NS}`;

export async function getJSON(url, ms = 30000, headers = {}) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), ms);
    try {
        const r = await fetch(url, { signal: ctl.signal, headers });
        const b = await r.json().catch(() => null);
        if (!r.ok) throw new Error((b && (b.message || b.error)) || `HTTP ${r.status} ${url}`);
        return b;
    } finally { clearTimeout(t); }
}

export async function kvGet(key) {
    const r = await fetch(`${KV()}/values/${encodeURIComponent(key)}`, { headers: CF_AUTH });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`Cloudflare: HTTP ${r.status} a ler ${key}`);
    const t = await r.text();
    try { return JSON.parse(t); } catch { return t; }
}

export async function kvPut(key, value, { ttl } = {}) {
    const q = ttl ? `?expiration_ttl=${ttl}` : '';
    const r = await fetch(`${KV()}/values/${encodeURIComponent(key)}${q}`, { method: 'PUT', headers: { ...CF_AUTH, 'Content-Type': 'text/plain' }, body: JSON.stringify(value) });
    const b = await r.json().catch(() => null);
    if (!r.ok || !b || !b.success) throw new Error(`Cloudflare: HTTP ${r.status} a gravar ${key} ${JSON.stringify(b && b.errors)}`);
}

export async function kvDelete(key) {
    const r = await fetch(`${KV()}/values/${encodeURIComponent(key)}`, { method: 'DELETE', headers: CF_AUTH });
    if (!r.ok && r.status !== 404) throw new Error(`Cloudflare: HTTP ${r.status} a apagar ${key}`);
}

/** Os nomes das chaves com este início (até 1000). */
export async function kvList(prefix) {
    const r = await fetch(`${KV()}/keys?limit=1000&prefix=${encodeURIComponent(prefix)}`, { headers: CF_AUTH });
    const b = await r.json().catch(() => null);
    if (!r.ok || !b || !b.success) throw new Error(`Cloudflare: HTTP ${r.status} a listar ${prefix}`);
    return (b.result || []).map((k) => k.name);
}

/** Corre instruções no histórico (D1), todas num pedido: [{ sql, params }] (lib/historico.js). Devolve quantas. */
export async function d1Run(stmts) {
    if (!stmts.length) return 0;
    if (!D1_ID) throw new Error('sem a base D1 (binding HIST) no wrangler.toml');
    const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/d1/database/${D1_ID}/query`, {
        method: 'POST', headers: { ...CF_AUTH, 'Content-Type': 'application/json' }, body: JSON.stringify({ batch: stmts }) });
    const b = await r.json().catch(() => null);
    if (!r.ok || !b || !b.success) throw new Error(`Cloudflare D1: HTTP ${r.status} ${JSON.stringify(b && b.errors)}`);
    return stmts.length;
}

/** Uma consulta de leitura no histórico (D1): as linhas. */
export async function d1Query(sql, params = []) {
    if (!D1_ID) throw new Error('sem a base D1 (binding HIST) no wrangler.toml');
    const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/d1/database/${D1_ID}/query`, {
        method: 'POST', headers: { ...CF_AUTH, 'Content-Type': 'application/json' }, body: JSON.stringify({ sql, params }) });
    const b = await r.json().catch(() => null);
    if (!r.ok || !b || !b.success) throw new Error(`Cloudflare D1: HTTP ${r.status} ${JSON.stringify(b && b.errors)}`);
    return b.result[0].results || [];
}
const parse = (t) => { try { return JSON.parse(t); } catch { return null; } };
const at = (a) => Date.parse(a?.generatedAt || '') || 0;

/**
 * As análises de um local, as mais recentes primeiro (desde: ISO; até n). A caixa de correio é a D1 (desde o conector
 * 1.11); juntam-se as do KV (as de antes e as que lá ficaram quando a D1 falhou), sem repetir.
 */
export async function analysesOf(id, { since = '', n = 12 } = {}) {
    const [d1, kv] = await Promise.all([
        d1Query('SELECT doc FROM analises WHERE local = ? AND gerada_em >= ? ORDER BY gerada_em DESC LIMIT ?', [id, since, n])
            .then((rows) => rows.map((r) => parse(r.doc)).filter(Boolean)).catch(() => []),
        (async () => {
            const keys = [`analysis:${id}`, ...(await kvList(`analysis:${id}:`).catch(() => [])).filter((k) => k.slice(-13) >= since.slice(0, 13)).sort().slice(-n)];
            return (await Promise.all(keys.map((k) => kvGet(k).catch(() => null)))).filter((a) => a && typeof a === 'object' && at(a) && (!since || a.generatedAt >= since));
        })(),
    ]);
    const seen = new Set();
    return [...d1, ...kv].sort((a, b) => at(b) - at(a)).filter((a) => !seen.has(a.generatedAt) && seen.add(a.generatedAt)).slice(0, n);
}

export const arg = (name, def = null) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : def; };
