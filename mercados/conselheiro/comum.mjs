// Conselheiro — peças comuns aos scripts da tarefa agendada (Node 18+, sem dependências).
import { createRequire } from 'node:module';
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
// a análise (toda a API de analise.js) escrita em Onda e compilada para WebAssembly (analise-onda.js, gerado de
// onda/*.onda): os mesmos resultados que o analise.js, que fica só como referência dos testes
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
// o ficheiro corre como script (e não importado pelos testes)? Caminhos reais: o Node resolve as ligações simbólicas no módulo
const real = (p) => { try { return realpathSync(p); } catch { return path.resolve(p); } };
export const isMain = (url) => !!process.argv[1] && real(process.argv[1]) === real(fileURLToPath(url));

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
// Referência: o que a app mostra mas não se compra diretamente na TR (índices, câmbio, futuros de energia e ouro)
export const MARKET = {
    '^GSPC': 'S&P 500', '^IXIC': 'Nasdaq', '^STOXX50E': 'Euro Stoxx 50', 'PSI20.LS': 'PSI', '^VIX': 'VIX', 'EURUSD=X': 'EUR/USD',
    'BZ=F': 'Petróleo Brent', 'CL=F': 'Petróleo WTI', 'RB=F': 'Gasolina (RBOB)', 'HO=F': 'Gasóleo (ULSD)', 'NG=F': 'Gás natural', 'GC=F': 'Ouro (futuros)',
};
// o que o investidor tem (a app mostra-os em "Os meus ativos")
export const MINE = ['VWCE.DE', 'c:BTC', 'c:ETH', 'c:SOL', 'c:XRP'];

// chave da app → símbolo do Yahoo (c:ADA → ADA-EUR)
export const yahooOf = (k) => (CRYPTO[k] ? CRYPTO[k][0] : k.startsWith('c:') ? k.slice(2) + '-EUR' : k);
export const kindOf = (k) => (CRYPTO[k] || k.startsWith('c:') ? 'crypto' : FUNDS[k] ? 'fund' : MARKET[k] ? 'market' : 'stock');
export const nameOf = (k) => STOCKS[k] || FUNDS[k] || (CRYPTO[k] && CRYPTO[k][1]) || MARKET[k] || k;

// ---------- veredicto do Claude por ativo (publicar.mjs e outros.mjs) ----------
// ativos que se compram: comprar … evitar; referência (índices, câmbio, futuros): direção do preço
export const ACTION_KEYS = ['buy', 'scale', 'hold', 'wait', 'neutral', 'turn', 'reduce', 'sell', 'avoid'];
export const REF_KEYS = ['up', 'flat', 'down'];
export const ACTION_LABEL = {
    buy: 'Comprar', scale: 'Comprar aos poucos', hold: 'Manter', wait: 'Esperar', neutral: 'Manter, sem reforçar', turn: 'Esperar confirmação',
    reduce: 'Reduzir', sell: 'Vender', avoid: 'Evitar', up: 'Em alta', flat: 'Lateral', down: 'Em queda',
};
// família de cada veredicto: entrar (1), ficar (0), sair (-1) — para comparar com o sinal automático
export const FAM = { buy: 1, scale: 1, hold: 0, wait: 0, neutral: 0, turn: 0, reduce: -1, sell: -1, avoid: -1 };
export const HZ = ['short', 'mid', 'long']; // curto (dias a 2 semanas), médio (semanas a 3 meses), longo (anos)
export const LEVELS = ['entry', 'target', 'stop']; // entrada, alvo e stop, na moeda do ativo

// texto: obrigatório ou não, com tamanho máximo; os erros vão para errs
export const textCheck = (errs) => (v, max, name, req) => {
    if (v == null || v === '') { if (req) errs.push(`falta ${name}`); return ''; }
    if (typeof v !== 'string') { errs.push(`${name} tem de ser texto`); return ''; }
    if (v.length > max) errs.push(`${name} com mais de ${max} caracteres`);
    return v;
};

// Valida e normaliza o veredicto de um ativo. opt: p (prefixo dos erros), ref (índice/futuro), price (preço de hoje,
// na moeda do ativo, para apanhar níveis com a unidade errada), scores ('req' ou 'opt'), plan (aceita o campo plan)
export function normVerdict(x, errs, opt = {}) {
    const { p = 'ativo', ref = false, price = null, scores = 'req', plan = true } = opt;
    if (!x || typeof x !== 'object' || Array.isArray(x)) { errs.push(`${p}: tem de ser um objeto`); return { s: null }; }
    const str = textCheck(errs);
    const keys = ref ? REF_KEYS : ACTION_KEYS;
    if (!keys.includes(x.key)) errs.push(`${p}.key inválido: ${x.key} (${ref ? 'referência' : 'ativo que se compra'}: ${keys.join(', ')})`);
    const o = { s: x.s, key: x.key, action: str(x.action, 40, `${p}.action`) || ACTION_LABEL[x.key] || '', why: str(x.why, 280, `${p}.why`, true) };
    if (plan) { const t = str(x.plan, 280, `${p}.plan`); if (t) o.plan = t; }
    // convicção 0–100 por prazo (50 = neutro; como a pontuação da app)
    for (const h of HZ) {
        if (x[h] == null || x[h] === '') { if (scores === 'req') errs.push(`falta ${p}.${h} (convicção 0–100)`); continue; }
        const n = Number(x[h]);
        if (typeof x[h] === 'boolean' || !Number.isFinite(n) || n < 0 || n > 100) errs.push(`${p}.${h}: a convicção é de 0 a 100 (veio ${JSON.stringify(x[h])})`);
        else o[h] = Math.round(n);
    }
    // a escala ao contrário (100 = vender) é o erro mais provável: comprar pede convicção a favor nalgum prazo, vender/evitar contra
    const sc = HZ.map((h) => o[h]).filter(Number.isFinite);
    if (sc.length === 3 && ['buy', 'scale'].includes(x.key) && Math.max(...sc) < 50) errs.push(`${p}: "${o.action}" com convicção contra nos três prazos (${sc.join('/')}): 100 = muito a favor`);
    if (sc.length === 3 && ['sell', 'avoid'].includes(x.key) && Math.min(...sc) > 50) errs.push(`${p}: "${o.action}" com convicção a favor nos três prazos (${sc.join('/')}): 0 = muito contra`);
    // níveis (opcionais): números na moeda do ativo, perto do preço de hoje; stop < entrada < alvo
    for (const l of LEVELS) {
        if (x[l] == null || x[l] === '') continue;
        const n = Number(x[l]);
        if (typeof x[l] === 'boolean' || !Number.isFinite(n) || n <= 0) { errs.push(`${p}.${l} tem de ser um número (na moeda do ativo)`); continue; }
        if (Number.isFinite(price) && price > 0 && (n < price / 4 || n > price * 4)) errs.push(`${p}.${l} = ${n} longe do preço de hoje (${price}): está na moeda do ativo?`);
        o[l] = Number(n.toPrecision(6));
    }
    if (o.stop != null && o.entry != null && o.stop >= o.entry) errs.push(`${p}: o stop (${o.stop}) tem de ficar abaixo da entrada (${o.entry})`);
    if (o.entry != null && o.target != null && o.target <= o.entry) errs.push(`${p}: o alvo (${o.target}) tem de ficar acima da entrada (${o.entry})`);
    if (o.stop != null && o.target != null && o.target <= o.stop) errs.push(`${p}: o alvo (${o.target}) tem de ficar acima do stop (${o.stop})`);
    return o;
}
