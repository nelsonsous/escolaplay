// Copia para o histórico (D1 mercados-historico) o que ainda está no KV: os conselhos de cada dia (advice:<data>,
// advice:latest), os das outras apps (ua:<id>), o diário de cada app (j:<id>: as sugestões de cada dia) e a Carteira
// atual do dono (a fotografia de hoje). Pode correr-se mais de uma vez (não duplica). Corre aqui, não no Worker:
//   NODE_USE_ENV_PROXY=1 node mercados/proxy/recuperar-historico.mjs
// (o token da Cloudflare é injetado pelo proxy do ambiente, ou vem de CLOUDFLARE_API_TOKEN)
import { readFileSync } from 'node:fs';
import { adviceRows, journalRows, walletRows } from './src/historico.js';
import { cleanItems, cleanLots } from './src/worker.js';

const toml = readFileSync(new URL('./wrangler.toml', import.meta.url), 'utf8');
const ACCOUNT = process.env.CF_ACCOUNT_ID || 'e5f9f94050228b1fa9f74443667b20a6';
const KV_NS = toml.match(/binding = "JOURNAL"\s*\nid = "([0-9a-f]+)"/)[1];
const D1_ID = toml.match(/binding = "HIST"[\s\S]*?database_id = "([0-9a-f-]+)"/)[1];
const AUTH = { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN || 'proxy-injected'}` };
const CF = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}`;

async function kvKeys(prefix) {
    const out = [];
    let cursor = '';
    do {
        const r = await fetch(`${CF}/storage/kv/namespaces/${KV_NS}/keys?limit=1000&prefix=${encodeURIComponent(prefix)}${cursor ? `&cursor=${cursor}` : ''}`, { headers: AUTH });
        const b = await r.json();
        if (!b.success) throw new Error(`KV: ${JSON.stringify(b.errors)}`);
        out.push(...b.result.map((k) => k.name));
        cursor = b.result_info?.cursor || '';
    } while (cursor);
    return out;
}
const kvGet = async (k) => { const r = await fetch(`${CF}/storage/kv/namespaces/${KV_NS}/values/${encodeURIComponent(k)}`, { headers: AUTH }); return r.ok ? r.json().catch(() => null) : null; };
async function d1(stmts) {
    for (let i = 0; i < stmts.length; i += 100) {
        const r = await fetch(`${CF}/d1/database/${D1_ID}/query`, { method: 'POST', headers: { ...AUTH, 'Content-Type': 'application/json' }, body: JSON.stringify({ batch: stmts.slice(i, i + 100) }) });
        const b = await r.json().catch(() => null);
        if (!r.ok || !b?.success) throw new Error(`D1: HTTP ${r.status} ${JSON.stringify(b?.errors)}`);
    }
    return stmts.length;
}

const owner = await kvGet('cfg:owner');
let conselhos = 0, dias = 0, linhas = 0;
for (const k of await kvKeys('advice:')) {
    if (k === 'advice:lessons') continue;
    const doc = await kvGet(k);
    const rows = adviceRows('dono', doc);
    if (rows.length) { linhas += await d1(rows); conselhos++; }
}
for (const k of await kvKeys('ua:')) {
    const rows = adviceRows(k.slice(3), await kvGet(k));
    if (rows.length) { linhas += await d1(rows); conselhos++; }
}
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon' }).format(new Date());
for (const k of await kvKeys('j:')) {
    const id = k.slice(2), doc = await kvGet(k);
    if (!doc?.days) continue;
    const rows = [];
    for (const [date, items] of Object.entries(doc.days)) { const it = cleanItems(items) || []; if (it.length) { rows.push(...journalRows(id, date, it)); dias++; } }
    const lots = id === owner ? cleanLots(doc.lots) : null;
    if (lots) rows.push(...walletRows(today, lots, { items: cleanItems(doc.days[today] || []) }));
    linhas += await d1(rows);
}
console.log(`Histórico dos Mercados: ${conselhos} conselhos, ${dias} dias de diário, ${linhas} linhas gravadas${owner ? '' : ' (sem cfg:owner: sem Carteira)'}.`);
