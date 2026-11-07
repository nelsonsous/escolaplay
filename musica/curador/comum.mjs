// Utilitários da tarefa agendada do Curador: o Worker (com a chave do agente) e a KV pela API da Cloudflare.
import { readFileSync } from 'node:fs';

const toml = readFileSync(new URL('../proxy/wrangler.toml', import.meta.url), 'utf8');
export const WORKER = process.env.MUSICA_WORKER || 'https://musica.mercados-proxy.workers.dev';
export const ACCOUNT = process.env.CF_ACCOUNT_ID || 'e5f9f94050228b1fa9f74443667b20a6';
export const KV_NS = (toml.match(/binding = "KV"\s*\nid = "([0-9a-f]+)"/) || [])[1];
// O token é injetado pelo proxy do ambiente (ou vem de CLOUDFLARE_API_TOKEN)
const CF_AUTH = { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN || 'proxy-injected'}` };
const KV = () => `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/storage/kv/namespaces/${KV_NS}`;

export async function kvGet(key) {
    if (!KV_NS) throw new Error('Falta o id da KV em musica/proxy/wrangler.toml');
    const r = await fetch(`${KV()}/values/${encodeURIComponent(key)}`, { headers: CF_AUTH });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`Cloudflare: HTTP ${r.status} a ler ${key}`);
    return r.text();
}

let chave = process.env.MUSICA_CHAVE || null;
async function chaveAgente() {
    if (!chave) chave = await kvGet('agente:chave');
    if (!chave) throw new Error('Ainda não há chave do agente: o Tidal nunca foi ligado na app.');
    return chave;
}

// Pedido ao Worker com a chave do agente; devolve o JSON ou lança o erro com a mensagem do Worker
export async function api(caminho, { method = 'GET', body, semChave = false, ms = 60000 } = {}) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), ms);
    try {
        const headers = { accept: 'application/json', ...(body ? { 'content-type': 'application/json' } : {}) };
        if (!semChave) headers.authorization = `Bearer ${await chaveAgente()}`;
        const r = await fetch(WORKER + caminho, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: ctl.signal });
        const j = await r.json().catch(() => null);
        if (!r.ok) {
            const e = new Error((j && (j.message || j.error)) || `HTTP ${r.status} em ${caminho}`);
            e.status = r.status; e.codigo = j?.error;
            throw e;
        }
        return j;
    } finally { clearTimeout(t); }
}

export const arg = (name, def = null) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : def; };
export const flag = (name) => process.argv.includes(name);
export const lisboa = (d = new Date()) => d.toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
export const minutos = (s) => `${Math.floor(s / 60)} min`;
