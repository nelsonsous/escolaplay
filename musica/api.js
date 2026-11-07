// Pedidos ao conector (Cloudflare Worker `musica`) com a chave deste aparelho, e memória do telemóvel.
// O endereço do conector: por omissão o publicado; Ajustes ou ?proxy=URL para outro.
export const PROXY_PADRAO = 'https://musica.mercados-proxy.workers.dev';

// ---------- memória local (pode falhar: modo privado, armazenamento cheio) ----------
export const store = {
    get(key, fallback = null) {
        try { const v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); } catch { return fallback; }
    },
    set(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
    },
    del(key) { try { localStorage.removeItem(key); } catch { /* ignorar */ } },
};

export function getProxy() {
    return String(store.get('musica:proxy') || PROXY_PADRAO).replace(/\/+$/, '');
}
export function setProxy(url) {
    const u = String(url || '').trim().replace(/\/+$/, '');
    if (!u || u === PROXY_PADRAO) store.del('musica:proxy'); else store.set('musica:proxy', u);
}
export const chave = { get: () => store.get('musica:chave'), set: (k) => store.set('musica:chave', k), del: () => store.del('musica:chave') };

export class ApiError extends Error {
    constructor(message, { status = 0, code = '' } = {}) { super(message); this.status = status; this.code = code; }
}

async function call(path, { method = 'GET', body, timeout = 25000 } = {}) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeout);
    const headers = {};
    if (body) headers['content-type'] = 'application/json';
    const k = chave.get();
    if (k) headers.authorization = `Bearer ${k}`;
    let res;
    try {
        res = await fetch(getProxy() + path, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: ctl.signal });
    } catch (e) {
        throw new ApiError(e.name === 'AbortError' ? 'O conector demorou demasiado a responder.' : 'Sem ligação ao conector.', { code: 'rede' });
    } finally { clearTimeout(t); }
    let data = null;
    try { data = await res.json(); } catch { /* sem corpo JSON */ }
    if (!res.ok) throw new ApiError(data?.message || `Erro ${res.status} do conector.`, { status: res.status, code: data?.error || '' });
    return data;
}

const id = (x) => encodeURIComponent(x);
export const api = {
    estado: () => call('/api/estado', { timeout: 10000 }),
    ligar: (codigo, nome) => call('/api/ligar', { method: 'POST', body: { codigo, nome } }),
    configurar: (codigo, clientId) => call('/api/config', { method: 'POST', body: { codigo, clientId } }),
    desligar: () => call('/api/desligar', { method: 'POST', body: {} }),
    perfil: (fresco) => call('/api/perfil' + (fresco ? '?fresco=1' : ''), { timeout: 60000 }),
    resolver: async (faixas) => (await call('/api/resolver', { method: 'POST', body: { faixas }, timeout: 60000 })).faixas,
    pesquisa: async (q) => (await call('/api/pesquisa?q=' + id(q), { timeout: 30000 })).faixas,
    playlists: async () => (await call('/api/playlists')) || [],
    playlist: (pid) => call('/api/playlists/' + id(pid)),
    guardar: (doc) => call('/api/playlists', { method: 'POST', body: doc, timeout: 60000 }),
    enviar: (pid, body = {}) => call(`/api/playlists/${id(pid)}/tidal`, { method: 'POST', body, timeout: 60000 }),
    apagar: (pid) => call('/api/playlists/' + id(pid), { method: 'DELETE' }),
    pedidos: async () => (await call('/api/pedidos')) || [],
    pedir: (texto, opcoes) => call('/api/pedidos', { method: 'POST', body: { texto, opcoes } }),
    cancelar: (pid) => call('/api/pedidos/' + id(pid), { method: 'DELETE' }),
};
