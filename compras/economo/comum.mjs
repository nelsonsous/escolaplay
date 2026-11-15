// Utilitários do Ecónomo (a tarefa do Claude da app Compras): o conector e a base de dados (KV) pela API da Cloudflare,
// como em meteo/analista/comum.mjs. Os sites das cadeias leem-se sempre pelo conector (/sonda), que se identifica,
// respeita o robots.txt e é o único que lá chega: o ambiente do Claude só precisa de chegar ao conector.
import { readFileSync } from 'node:fs';

const toml = readFileSync(new URL('../proxy/wrangler.toml', import.meta.url), 'utf8');
export const WORKER = process.env.COMPRAS_WORKER || 'https://compras.mercados-proxy.workers.dev';
export const ACCOUNT = process.env.CF_ACCOUNT_ID || 'e5f9f94050228b1fa9f74443667b20a6';
export const KV_NS = (toml.match(/binding = "KV"\s*\nid = "([0-9a-f]+)"/) || [])[1];
// o token da Cloudflare é injetado pelo proxy do ambiente (ou vem de CLOUDFLARE_API_TOKEN)
const CF_AUTH = { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN || 'proxy-injected'}` };
const KV = () => `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/storage/kv/namespaces/${KV_NS}`;

// o segredo da sonda: SONDA_TOKEN, ou o ficheiro em SONDA_TOKEN_FILE
function segredo() {
    if (process.env.SONDA_TOKEN) return process.env.SONDA_TOKEN.trim();
    if (process.env.SONDA_TOKEN_FILE) return readFileSync(process.env.SONDA_TOKEN_FILE, 'utf8').trim();
    throw new Error('Falta o segredo da sonda (SONDA_TOKEN ou SONDA_TOKEN_FILE).');
}

// uma página de uma cadeia, pelo conector: { estado, corpo (Buffer) }
export async function sonda(url, { accept } = {}) {
    const headers = { authorization: `Bearer ${segredo()}` };
    if (accept) headers['x-sonda-accept'] = accept;
    const r = await fetch(`${WORKER}/sonda?url=${encodeURIComponent(url)}`, { headers });
    if (r.status !== 200) throw new Error(`conector: HTTP ${r.status} em ${url}: ${(await r.text()).slice(0, 200)}`);
    return { estado: Number(r.headers.get('x-sonda-status')), corpo: Buffer.from(await r.arrayBuffer()) };
}

export async function kvPutTexto(key, texto) {
    const r = await fetch(`${KV()}/values/${encodeURIComponent(key)}`, { method: 'PUT', headers: { ...CF_AUTH, 'Content-Type': 'text/plain' }, body: texto });
    const b = await r.json().catch(() => null);
    if (!r.ok || !b || !b.success) throw new Error(`Cloudflare: HTTP ${r.status} a gravar ${key} ${JSON.stringify(b && b.errors)}`);
}

export const espera = (ms) => new Promise((s) => setTimeout(s, ms));
