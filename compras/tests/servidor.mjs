// Um servidor para experimentar a app no browser, sem rede: serve os ficheiros do repositório e responde a /api/* com o
// conector a sério (compras/proxy/src/worker.js) sobre uma KV simulada (um índice pequeno de cada cadeia), uma D1
// simulada (a casa, a lista e os preços) e os sites das cadeias a fingir (com os preços de PRECOS_TESTE).
// Com falhar(true), o conector «cai» (503), para ver a app sem ligação.
import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import worker, { esquecerIndices } from '../proxy/src/worker.js';
import { montarIndice } from '../proxy/src/indice.js';
import { kv } from './kv.mjs';
import { d1 } from './d1.mjs';
import { PRECOS, instalar, desinstalar } from './cadeias.mjs';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

export const INDICES = {
    continente: montarIndice('continente', ['leite-uht-meio-gordo-mimosa-4421406', 'leite-uht-meio-gordo-continente-8504295', 'pao-de-forma-bimbo-11', 'ovos-classe-m-12', 'chocolate-de-leite-milka-13']
        .map((s) => `https://www.continente.pt/produto/${s}.html`)),
    pingodoce: montarIndice('pingodoce', ['laticinios/leite/leite-uht-meio-gordo-mimosa-501', 'padaria/pao-de-forma-familiar-bimbo-502']
        .map((s) => `https://www.pingodoce.pt/home/produtos/${s}.html`)),
    auchan: montarIndice('auchan', ['alimentacao/leite/leite-mimosa-uht-meio-gordo-1l/601', 'alimentacao/ovos/ovos-classe-m-auchan-12un/602']
        .map((s) => `https://www.auchan.pt/pt/${s}.html`)),
    lidl: montarIndice('lidl', ['https://www.lidl.pt/p/mimosa-leite-meio-gordo/p701']),
};

// os preços nos sites a fingir (em euros), por «cadeia número»
export const PRECOS_TESTE = {
    'continente 8504295': { preco: 0.79 }, 'continente 4421406': { preco: 0.95 }, 'continente 11': { preco: 1.49 }, 'continente 12': { preco: 2.19 },
    'pingodoce 501': { preco: 0.89, antes: 1.05 }, 'pingodoce 502': { preco: 1.39 },
    'auchan 601': { preco: 0.99 }, 'auchan 602': { preco: 0.99 },
    'lidl 701': { preco: 0.75 },
};

export async function abrir() {
    const env = { KV: kv(Object.fromEntries(Object.entries(INDICES).map(([c, t]) => [`indice:${c}`, t]))), DB: d1() };
    esquecerIndices();
    PRECOS.clear();
    for (const [k, v] of Object.entries(PRECOS_TESTE)) PRECOS.set(k, v);
    instalar();
    let falha = false;
    const srv = http.createServer(async (req, res) => {
        const u = new URL(req.url, 'http://x');
        if (u.pathname.startsWith('/api/')) {
            if (falha) { res.writeHead(503, { 'access-control-allow-origin': '*' }); return res.end(); }
            const corpo = await new Promise((ok) => { let b = ''; req.on('data', (d) => { b += d; }); req.on('end', () => ok(b)); });
            const r = await worker.fetch(new Request('http://x' + req.url, { method: req.method, headers: req.headers, body: ['GET', 'HEAD', 'OPTIONS'].includes(req.method) ? undefined : corpo }), env);
            res.writeHead(r.status, Object.fromEntries(r.headers));
            return res.end(Buffer.from(await r.arrayBuffer()));
        }
        const f = path.join(RAIZ, decodeURIComponent(u.pathname));
        if (!f.startsWith(RAIZ) || !existsSync(f) || statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
        res.writeHead(200, { 'content-type': TIPOS[path.extname(f)] || 'application/octet-stream' });
        res.end(readFileSync(f));
    });
    await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
    const base = `http://127.0.0.1:${srv.address().port}`;
    return {
        env, base,
        url: (extra = '') => `${base}/compras/index.html?proxy=${encodeURIComponent(base)}${extra}`,
        falhar: (v) => { falha = v; },
        // um pedido ao conector, como a app o faz (com a chave de um aparelho)
        api: async (caminho, chave, corpo) => (await worker.fetch(new Request('http://x' + caminho, {
            method: corpo ? 'POST' : 'GET', headers: { authorization: 'Bearer ' + chave }, body: corpo ? JSON.stringify(corpo) : undefined,
        }), env)).json(),
        fechar: () => new Promise((ok) => srv.close(ok)).then(desinstalar),
    };
}
