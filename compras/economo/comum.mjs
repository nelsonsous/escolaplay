// Utilitários do Ecónomo (a tarefa do Claude da app Compras): o conector e as bases de dados (KV e D1) pela API da Cloudflare,
// como em meteo/analista/comum.mjs. Os sites das cadeias leem-se sempre pelo conector (/sonda), que se identifica,
// respeita o robots.txt e é o único que lá chega: o ambiente do Claude só precisa de chegar ao conector.
import { readFileSync } from 'node:fs';

const toml = readFileSync(new URL('../proxy/wrangler.toml', import.meta.url), 'utf8');
export const WORKER = process.env.COMPRAS_WORKER || 'https://compras.compras-nelson.workers.dev';
export const ACCOUNT = process.env.CF_ACCOUNT_ID || '24857c1703cd4aa76f382bccbeda2c3c';
export const KV_NS = (toml.match(/binding = "KV"\s*\nid = "([0-9a-f]+)"/) || [])[1];
// o token da Cloudflare é injetado pelo proxy do ambiente (ou vem de CLOUDFLARE_API_TOKEN)
const CF_AUTH = { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN || 'proxy-injected'}` };
const KV = () => `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/storage/kv/namespaces/${KV_NS}`;
export const D1_ID = (toml.match(/database_id = "([0-9a-f-]+)"/) || [])[1];

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

export async function kvGetTexto(key) {
    const r = await fetch(`${KV()}/values/${encodeURIComponent(key)}`, { headers: CF_AUTH });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`Cloudflare: HTTP ${r.status} a ler ${key}`);
    return r.text();
}

// uma pergunta à D1 pela API da Cloudflare: as linhas da resposta
export async function d1(sql, params = []) {
    const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/d1/database/${D1_ID}/query`, {
        method: 'POST', headers: { ...CF_AUTH, 'Content-Type': 'application/json' }, body: JSON.stringify({ sql, params }),
    });
    const b = await r.json().catch(() => null);
    if (!r.ok || !b?.success) throw new Error(`D1: HTTP ${r.status} ${JSON.stringify(b?.errors ?? b).slice(0, 300)}`);
    return b.result?.[0]?.results ?? [];
}
// muitas linhas de uma vez: «INSERT … VALUES (?, ?), (?, ?) …» aos bocados (a D1 aceita até 100 valores por pergunta)
export async function d1Linhas(inicio, linhas, fim = '') {
    if (!linhas.length) return;
    const porLinha = linhas[0].length, cabem = Math.max(1, Math.floor(100 / porLinha));
    const marca = `(${Array(porLinha).fill('?').join(', ')})`;
    for (let i = 0; i < linhas.length; i += cabem) {
        const lote = linhas.slice(i, i + cabem);
        await d1(`${inicio} VALUES ${lote.map(() => marca).join(', ')} ${fim}`, lote.flat());
    }
}

export const espera = (ms) => new Promise((s) => setTimeout(s, ms));
