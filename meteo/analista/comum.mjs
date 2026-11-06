// Utilitários da tarefa agendada: Worker, base de dados (KV) pela API da Cloudflare.
import { readFileSync } from 'node:fs';

const toml = readFileSync(new URL('../wrangler.toml', import.meta.url), 'utf8');
export const WORKER = process.env.METEO_WORKER || 'https://meteo.mercados-proxy.workers.dev';
export const ACCOUNT = process.env.CF_ACCOUNT_ID || 'e5f9f94050228b1fa9f74443667b20a6';
export const KV_NS = (toml.match(/binding = "KV"\s*\nid = "([0-9a-f]+)"/) || [])[1];
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

export const arg = (name, def = null) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : def; };
