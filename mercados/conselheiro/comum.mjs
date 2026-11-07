// Conselheiro — peças comuns aos scripts da tarefa agendada (Node 18+, sem dependências).
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const A = createRequire(import.meta.url)('../analise.js');
// motor de análise escrito em Onda (WebAssembly gerado de onda/analise.onda): o mesmo resultado que o A.analyse
export const AO = createRequire(import.meta.url)('../analise-onda.js');
await AO.ready;

// Conector e base de dados (KV) — valores do wrangler.toml
const toml = readFileSync(path.join(here, '../proxy/wrangler.toml'), 'utf8');
export const WORKER = process.env.MERCADOS_PROXY || 'https://mercados-proxy.mercados-proxy.workers.dev';
export const ACCOUNT = process.env.CF_ACCOUNT_ID || 'e5f9f94050228b1fa9f74443667b20a6';
export const KV_NS = (toml.match(/binding = "JOURNAL"\s*\nid = "([0-9a-f]+)"/) || [])[1];
// O proxy da sessão injeta o token guardado no ambiente; fora dele, usa CLOUDFLARE_API_TOKEN.
const CF_AUTH = { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN || 'proxy-injected'}` };

export async function getJSON(url, ms = 30000) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), ms);
    try {
        const r = await fetch(url, { signal: ctl.signal });
        const b = await r.json().catch(() => null);
        if (!r.ok) throw new Error((b && b.error) || `HTTP ${r.status} ${url}`);
        return b;
    } finally { clearTimeout(t); }
}
export const px = (p, ms) => getJSON(WORKER + p, ms);

const KV = () => `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/storage/kv/namespaces/${KV_NS}`;
export async function kvList(prefix) {
    const out = [];
    let cursor = '';
    do {
        const r = await getJSONauth(`${KV()}/keys?prefix=${encodeURIComponent(prefix)}${cursor ? '&cursor=' + cursor : ''}`);
        out.push(...(r.result || []));
        cursor = r.result_info && r.result_info.cursor;
    } while (cursor);
    return out; // [{ name, metadata }]
}
export const kvKeys = async (prefix) => (await kvList(prefix)).map((k) => k.name);
async function getJSONauth(url) {
    const r = await fetch(url, { headers: CF_AUTH });
    const b = await r.json().catch(() => null);
    if (!r.ok || (b && b.success === false)) throw new Error(`Cloudflare: HTTP ${r.status} ${JSON.stringify(b && b.errors)}`);
    return b;
}
export async function kvGet(key) {
    const r = await fetch(`${KV()}/values/${encodeURIComponent(key)}`, { headers: CF_AUTH });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`Cloudflare: HTTP ${r.status} a ler ${key}`);
    const t = await r.text();
    try { return JSON.parse(t); } catch { return t; }
}
export async function kvPut(key, value) {
    const r = await fetch(`${KV()}/values/${encodeURIComponent(key)}`, { method: 'PUT', headers: { ...CF_AUTH, 'Content-Type': 'text/plain' }, body: JSON.stringify(value) });
    const b = await r.json().catch(() => null);
    if (!r.ok || !b || !b.success) throw new Error(`Cloudflare: HTTP ${r.status} a gravar ${key} ${JSON.stringify(b && b.errors)}`);
}

// Data de hoje em Lisboa (AAAA-MM-DD)
export const todayLisbon = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon' }).format(new Date());

// Universo seguido (as mesmas listas da app; a chave é a da app)
// Só ativos que se compram na Trade Republic: grandes empresas mundiais (as mesmas da app).
// Ações portuguesas não entram por omissão (não confirmado que estejam na TR).
export const STOCKS = {
    AAPL: 'Apple', MSFT: 'Microsoft', NVDA: 'Nvidia', AMZN: 'Amazon', GOOGL: 'Alphabet (Google)', META: 'Meta', TSLA: 'Tesla',
    AVGO: 'Broadcom', JPM: 'JPMorgan', V: 'Visa', LLY: 'Eli Lilly', 'BRK-B': 'Berkshire Hathaway', PLTR: 'Palantir', AMD: 'AMD',
    'ASML.AS': 'ASML', 'SAP.DE': 'SAP', 'MC.PA': 'LVMH', 'SIE.DE': 'Siemens', 'NOVO-B.CO': 'Novo Nordisk', 'ALV.DE': 'Allianz',
    'TTE.PA': 'TotalEnergies', 'RHM.DE': 'Rheinmetall', TSM: 'TSMC (Taiwan)',
};
export const FUNDS = {
    'VWCE.DE': 'FTSE All-World USD (Acc) · VWCE', 'EUNL.DE': 'MSCI World (iShares)', 'SXR8.DE': 'S&P 500 (iShares)', 'SXRV.DE': 'Nasdaq-100 (iShares)',
    'IS3N.DE': 'Mercados emergentes (iShares)', 'EXSA.DE': 'Europa 600 (iShares)', '4GLD.DE': 'Ouro físico (Xetra-Gold)',
};
export const CRYPTO = { 'c:BTC': ['BTC-EUR', 'Bitcoin'], 'c:ETH': ['ETH-EUR', 'Ether'], 'c:SOL': ['SOL-EUR', 'Solana'], 'c:XRP': ['XRP-EUR', 'XRP'] };
export const MARKET = { '^GSPC': 'S&P 500', '^IXIC': 'Nasdaq', '^STOXX50E': 'Euro Stoxx 50', 'PSI20.LS': 'PSI', '^VIX': 'VIX', 'EURUSD=X': 'EUR/USD', 'BZ=F': 'Brent', 'GC=F': 'Ouro (futuros)' };
export const ACTION_KEYS = ['buy', 'scale', 'hold', 'wait', 'neutral', 'turn', 'avoid', 'sell'];

// chave da app → símbolo do Yahoo
export const yahooOf = (k) => (CRYPTO[k] ? CRYPTO[k][0] : k);
export const kindOf = (k) => (CRYPTO[k] ? 'crypto' : FUNDS[k] ? 'fund' : MARKET[k] ? 'market' : 'stock');
export const nameOf = (k) => STOCKS[k] || FUNDS[k] || (CRYPTO[k] && CRYPTO[k][1]) || MARKET[k] || k;
