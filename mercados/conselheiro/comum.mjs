// Conselheiro — peças comuns aos scripts da tarefa agendada (Node 18+, sem dependências).
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const A = createRequire(import.meta.url)('../analise.js');

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
export async function kvKeys(prefix) {
    const out = [];
    let cursor = '';
    do {
        const r = await getJSONauth(`${KV()}/keys?prefix=${encodeURIComponent(prefix)}${cursor ? '&cursor=' + cursor : ''}`);
        out.push(...(r.result || []).map((k) => k.name));
        cursor = r.result_info && r.result_info.cursor;
    } while (cursor);
    return out;
}
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
export const STOCKS = {
    'EDP.LS': 'EDP', 'GALP.LS': 'Galp', 'JMT.LS': 'Jerónimo Martins', 'BCP.LS': 'BCP', 'EDPR.LS': 'EDP Renováveis', 'NOS.LS': 'NOS',
    'NVG.LS': 'Navigator', 'SON.LS': 'Sonae', 'CTT.LS': 'CTT', 'ASML.AS': 'ASML', 'SAP.DE': 'SAP', 'MC.PA': 'LVMH', 'SIE.DE': 'Siemens',
    'NOVO-B.CO': 'Novo Nordisk', 'RHM.DE': 'Rheinmetall', NVDA: 'Nvidia', AAPL: 'Apple', MSFT: 'Microsoft', AMZN: 'Amazon',
    GOOGL: 'Alphabet (Google)', META: 'Meta', TSLA: 'Tesla', AMD: 'AMD', PLTR: 'Palantir', NFLX: 'Netflix', AVGO: 'Broadcom',
    COIN: 'Coinbase', MSTR: 'Strategy',
};
export const FUNDS = {
    'VWCE.DE': 'FTSE All-World (VWCE)', 'EUNL.DE': 'MSCI World (iShares)', 'SXR8.DE': 'S&P 500 (iShares)', 'SXRV.DE': 'Nasdaq-100 (iShares)',
    'IS3N.DE': 'Mercados emergentes (iShares)', 'EXSA.DE': 'Europa 600 (iShares)', '4GLD.DE': 'Ouro físico (Xetra-Gold)',
};
export const CRYPTO = { 'c:BTC': ['BTC-EUR', 'Bitcoin'], 'c:ETH': ['ETH-EUR', 'Ether'], 'c:SOL': ['SOL-EUR', 'Solana'], 'c:XRP': ['XRP-EUR', 'XRP'] };
export const MARKET = { '^GSPC': 'S&P 500', '^IXIC': 'Nasdaq', '^STOXX50E': 'Euro Stoxx 50', 'PSI20.LS': 'PSI', '^VIX': 'VIX', 'EURUSD=X': 'EUR/USD', 'BZ=F': 'Brent', 'GC=F': 'Ouro (futuros)' };
export const ACTION_KEYS = ['buy', 'scale', 'hold', 'wait', 'neutral', 'turn', 'avoid', 'sell'];

// chave da app → símbolo do Yahoo
export const yahooOf = (k) => (CRYPTO[k] ? CRYPTO[k][0] : k);
export const kindOf = (k) => (CRYPTO[k] ? 'crypto' : FUNDS[k] ? 'fund' : MARKET[k] ? 'market' : 'stock');
export const nameOf = (k) => STOCKS[k] || FUNDS[k] || (CRYPTO[k] && CRYPTO[k][1]) || MARKET[k] || k;
