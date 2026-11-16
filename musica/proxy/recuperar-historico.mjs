// Copia para o histórico (D1 musica-historico) o que ainda está no KV: o retrato das tabelas de cada dia
// (tendencias:dia:<data>, até 70 dias) e o perfil atual do dono. Pode correr-se mais de uma vez (não duplica):
//   NODE_USE_ENV_PROXY=1 node musica/proxy/recuperar-historico.mjs
// (o token da Cloudflare é injetado pelo proxy do ambiente, ou vem de CLOUDFLARE_API_TOKEN)
import { readFileSync } from 'node:fs';
import { trendRows, profileRows } from './src/historico.js';

const toml = readFileSync(new URL('./wrangler.toml', import.meta.url), 'utf8');
const ACCOUNT = process.env.CF_ACCOUNT_ID || 'e5f9f94050228b1fa9f74443667b20a6';
const KV_NS = toml.match(/binding = "KV"\s*\nid = "([0-9a-f]+)"/)[1];
const D1_ID = toml.match(/binding = "HIST"[\s\S]*?database_id = "([0-9a-f-]+)"/)[1];
const AUTH = { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN || 'proxy-injected'}` };
const CF = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}`;

const kvGet = async (k) => { const r = await fetch(`${CF}/storage/kv/namespaces/${KV_NS}/values/${encodeURIComponent(k)}`, { headers: AUTH }); return r.ok ? r.json().catch(() => null) : null; };
async function d1(stmts) {
    for (let i = 0; i < stmts.length; i += 100) {
        const r = await fetch(`${CF}/d1/database/${D1_ID}/query`, { method: 'POST', headers: { ...AUTH, 'Content-Type': 'application/json' }, body: JSON.stringify({ batch: stmts.slice(i, i + 100) }) });
        const b = await r.json().catch(() => null);
        if (!r.ok || !b?.success) throw new Error(`D1: HTTP ${r.status} ${JSON.stringify(b?.errors)}`);
    }
    return stmts.length;
}

let dias = 0, linhas = 0;
for (const d of (await kvGet('tendencias:dias')) || []) {
    const doc = await kvGet(`tendencias:dia:${d}`);
    const rows = trendRows(d, doc?.fontes);
    if (rows.length) { linhas += await d1(rows); dias++; }
}
const perfil = await kvGet('perfil'); // o do dono (os convidados têm o prefixo u:<id>:)
const pr = profileRows(perfil);
if (pr.length) linhas += await d1(pr);
console.log(`Histórico da Música: ${dias} dias de tabelas, ${pr.length ? `o perfil de ${perfil.geradoEm} (${perfil.favoritas?.length || 0} favoritas)` : 'sem perfil'}; ${linhas} linhas gravadas.`);
