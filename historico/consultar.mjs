// Uma pergunta ao histórico (bases D1), só de leitura: para as tarefas agendadas (o analista da Meteo, o conselheiro dos
// Mercados) e para quem quiser ver à mão.
//   NODE_USE_ENV_PROXY=1 node historico/consultar.mjs <meteo|mercados|musica> "SELECT …" [--json]
//   NODE_USE_ENV_PROXY=1 node historico/consultar.mjs <app> --esquema     → as tabelas e as colunas
// Só uma instrução SELECT (ou WITH … SELECT); até 200 linhas (mais: «… e mais N»). O token da Cloudflare é injetado
// pelo proxy do ambiente, ou vem de CLOUDFLARE_API_TOKEN.
import { readFileSync } from 'node:fs';

const ROOT = new URL('../', import.meta.url);
const ACCOUNT = process.env.CF_ACCOUNT_ID || 'e5f9f94050228b1fa9f74443667b20a6';
const AUTH = { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN || 'proxy-injected'}`, 'Content-Type': 'application/json' };
export const APPS = ['meteo', 'mercados', 'musica'];
export const MAX_ROWS = 200;

/** Só leitura: uma instrução, que começa por SELECT ou WITH e não escreve. Devolve o motivo da recusa, ou null. */
export function refuse(sql) {
    const s = String(sql || '').trim().replace(/;\s*$/, '');
    if (!s) return 'falta a consulta';
    const semComentarios = s.replace(/--[^\n]*/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ');
    const semTexto = semComentarios.replace(/'(?:[^']|'')*'/g, "''");
    if (semTexto.includes(';')) return 'só uma instrução';
    if (!/^\s*(SELECT|WITH)\b/i.test(semTexto)) return 'só SELECT (ou WITH … SELECT)';
    if (/\b(INSERT|UPDATE|DELETE|REPLACE|CREATE|DROP|ALTER|ATTACH|DETACH|PRAGMA|VACUUM|REINDEX)\b/i.test(semTexto)) return 'só leitura';
    return null;
}

const dbId = (app) => {
    const toml = readFileSync(new URL(`${app}/proxy/wrangler.toml`, ROOT), 'utf8');
    return (toml.match(/binding = "HIST"[\s\S]*?database_id = "([0-9a-f-]+)"/) || [])[1];
};
async function query(app, sql) {
    const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/d1/database/${dbId(app)}/query`, { method: 'POST', headers: AUTH, body: JSON.stringify({ sql }) });
    const b = await r.json().catch(() => null);
    if (!r.ok || !b?.success) throw new Error(`D1: HTTP ${r.status} ${JSON.stringify(b?.errors)}`);
    return b.result[0].results || [];
}

/** As linhas numa tabela de texto (colunas separadas por « | »), para ler no terminal. */
export function table(rows) {
    if (!rows.length) return '(nenhuma linha)';
    const cols = Object.keys(rows[0]);
    const cell = (v) => (v == null ? '' : String(v).replace(/\s+/g, ' ').slice(0, 160));
    return [cols.join(' | '), ...rows.map((r) => cols.map((c) => cell(r[c])).join(' | '))].join('\n');
}

const isMain = process.argv[1] && new URL(import.meta.url).pathname === process.argv[1];
if (isMain) {
    const [app, sql] = process.argv.slice(2);
    if (!APPS.includes(app)) { console.error(`uso: consultar.mjs <${APPS.join('|')}> "SELECT …" [--json] | --esquema`); process.exit(2); }
    try {
        if (sql === '--esquema') {
            const t = await query(app, "SELECT name, type, sql FROM sqlite_master WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' ORDER BY type, name");
            console.log(t.map((x) => `-- ${x.type} ${x.name}\n${x.sql}`).join('\n\n'));
        } else {
            const why = refuse(sql);
            if (why) { console.error(`Consulta recusada: ${why}.`); process.exit(2); }
            const rows = await query(app, sql);
            const shown = rows.slice(0, MAX_ROWS);
            console.log(process.argv.includes('--json') ? JSON.stringify(shown) : table(shown));
            if (rows.length > MAX_ROWS) console.log(`… e mais ${rows.length - MAX_ROWS} linhas (usa GROUP BY, LIMIT ou um WHERE mais estreito).`);
        }
    } catch (e) { console.error(e.message); process.exit(1); }
}
