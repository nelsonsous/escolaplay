// Exporta o histórico das apps (bases D1 da Cloudflare) para CSV, para abrir no Excel ou no Google Sheets.
//   NODE_USE_ENV_PROXY=1 node historico/exportar.mjs [meteo|mercados|musica …] [--pasta <dir>] [--ponto]
// Sem apps, exporta as três. Os ficheiros vão para <pasta>/<app>-<tabela>.csv (por omissão historico/export/<data>).
// Formato português: separador «;», vírgula decimal (--ponto: ponto decimal, para Sheets em inglês) e UTF-8 com BOM
// (o Excel lê os acentos). O token da Cloudflare é injetado pelo proxy do ambiente, ou vem de CLOUDFLARE_API_TOKEN.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';

const ROOT = new URL('../', import.meta.url);
const ACCOUNT = process.env.CF_ACCOUNT_ID || 'e5f9f94050228b1fa9f74443667b20a6';
const AUTH = { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN || 'proxy-injected'}`, 'Content-Type': 'application/json' };
const arg = (n, d = null) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const DOT = process.argv.includes('--ponto');

// o que se exporta de cada base: nome do ficheiro → consulta (legível, já com as contas mais úteis)
export const EXPORTS = {
    meteo: {
        analises: 'SELECT local, nome, gerada_em, por, titulo, resumo FROM analises ORDER BY local, gerada_em',
        acertos: `SELECT a.local, a.dia, a.prazo, a.gerada_em, a.tmax, a.c_tmax, a.obs_tmax, a.erro_tmax, a.erro_c_tmax,
            a.tmin, a.c_tmin, a.obs_tmin, a.erro_tmin, a.erro_c_tmin, a.chuva, a.c_chuva, a.obs_chuva, a.erro_chuva, a.erro_c_chuva
            FROM acertos a ORDER BY a.local, a.dia, a.prazo, a.gerada_em`,
        observado: 'SELECT local, dia, tmax, tmin, chuva, chuva_min, chuva_max, n_temp, n_chuva, v_tmax, v_tmin, v_chuva FROM observado ORDER BY local, dia',
    },
    mercados: {
        'carteira-dia': 'SELECT data, valor, investido, ROUND(valor - investido, 2) AS ganho, ROUND(100.0 * (valor - investido) / investido, 2) AS ganho_pct, cripto FROM carteira_dia ORDER BY data',
        carteira: 'SELECT data, ativo, quantidade, investido, preco, por_mes, prazo FROM carteira ORDER BY data, ativo',
        conselhos: "SELECT data, gerado_em, titulo FROM conselhos WHERE para = 'dono' ORDER BY gerado_em",
        acoes: "SELECT data, gerado_em, ativo, chave, acao, porque, preco FROM acoes WHERE para = 'dono' ORDER BY ativo, gerado_em",
        sugestoes: 'SELECT data, ativo, preco, sugestao, longo, medio, curto, oportunidade FROM sugestoes ORDER BY ativo, data',
    },
    musica: {
        tendencias: 'SELECT dia, fonte, lugar, artista, titulo, genero FROM tendencias ORDER BY dia, fonte, lugar',
        perfis: 'SELECT gerado_em, favoritas, artistas, playlists, resumo FROM perfis ORDER BY gerado_em',
        favoritas: 'SELECT id, artista, titulo, album, ano, generos, adicionada, primeira_vez, ultima_vez FROM favoritas ORDER BY adicionada DESC',
    },
};

const dbId = (app) => {
    const toml = readFileSync(new URL(`${app}/proxy/wrangler.toml`, ROOT), 'utf8');
    return (toml.match(/binding = "HIST"[\s\S]*?database_id = "([0-9a-f-]+)"/) || [])[1];
};
async function query(id, sql) {
    const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/d1/database/${id}/query`, { method: 'POST', headers: AUTH, body: JSON.stringify({ sql }) });
    const b = await r.json().catch(() => null);
    if (!r.ok || !b?.success) throw new Error(`D1: HTTP ${r.status} ${JSON.stringify(b?.errors)}`);
    return b.result[0].results;
}

/** Linhas → CSV (separador ;, aspas quando preciso; números com vírgula decimal, salvo dot). */
export function toCsv(rows, { dot = false } = {}) {
    if (!rows.length) return '';
    const cols = Object.keys(rows[0]);
    const cell = (v) => {
        if (v == null) return '';
        if (typeof v === 'number') return dot ? String(v) : String(v).replace('.', ',');
        const s = String(v);
        return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    return [cols.join(';'), ...rows.map((r) => cols.map((c) => cell(r[c])).join(';'))].join('\r\n') + '\r\n';
}

const isMain = process.argv[1] && new URL(import.meta.url).pathname === process.argv[1];
if (isMain) {
    const apps = process.argv.slice(2).filter((a) => EXPORTS[a]);
    const dir = arg('--pasta') || new URL(`historico/export/${new Date().toISOString().slice(0, 10)}`, ROOT).pathname;
    mkdirSync(dir, { recursive: true });
    for (const app of apps.length ? apps : Object.keys(EXPORTS)) {
        const id = dbId(app);
        if (!id) { console.error(`${app}: sem a base D1 (binding HIST) no wrangler.toml`); continue; }
        for (const [name, sql] of Object.entries(EXPORTS[app])) {
            const rows = await query(id, sql);
            writeFileSync(`${dir}/${app}-${name}.csv`, '﻿' + toCsv(rows, { dot: DOT }));
            console.log(`${app}-${name}.csv: ${rows.length} linhas`);
        }
    }
    console.log(`Pasta: ${dir}`);
}
