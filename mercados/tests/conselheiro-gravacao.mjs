// Gravar e repor a rede verdadeira para comparar o conselheiro em JS e em Onda com dados reais (node --import).
//   CONSELHEIRO_GRAVAR=f  os GET vão à rede (o conector e o KV, pelo proxy da sessão: NODE_USE_ENV_PROXY=1) e ficam em
//                         f, com a hora; os PUT NÃO saem (nada se grava no KV verdadeiro: respondem { success: true })
//   CONSELHEIRO_REPOR=f   responde com o que se gravou em f (pela ordem, por método e URL) e para o relógio nessa hora
// Os pedidos e os PUT que os scripts quiseram fazer ficam em CONSELHEIRO_REGISTO (como no conselheiro-rede.mjs).
import { readFileSync, writeFileSync } from 'node:fs';

const gravar = process.env.CONSELHEIRO_GRAVAR, repor = process.env.CONSELHEIRO_REPOR;
const real = globalThis.fetch;
const registo = [];
const fita = repor ? JSON.parse(readFileSync(repor, 'utf8')) : { agora: Date.now(), respostas: [] };
if (repor) {
    const T = fita.agora, D = Date;
    globalThis.Date = class extends D { constructor(...a) { if (a.length) super(...a); else super(T); } static now() { return T; } };
    const st = globalThis.setTimeout, si = globalThis.setInterval;
    globalThis.setTimeout = (f, ms, ...a) => st(f, ms > 0 ? 1 : ms, ...a);
    globalThis.setInterval = (f, ms, ...a) => si(f, ms > 0 ? 1 : ms, ...a);
}
const fila = new Map();
for (const r of fita.respostas) { const k = r.metodo + ' ' + r.url; if (!fila.has(k)) fila.set(k, []); fila.get(k).push(r); }
globalThis.fetch = async (url, init = {}) => {
    const u = String(url), metodo = init.method || 'GET';
    const corpo = init.body == null ? null : typeof init.body === 'string' ? init.body : Buffer.from(init.body).toString('utf8');
    registo.push({ metodo, url: u, cab: init.headers ? Object.entries(init.headers) : [], corpo });
    if (metodo === 'PUT') return new Response(JSON.stringify({ success: true, errors: [], messages: [], result: null }), { status: 200 });
    if (repor) {
        const r = (fila.get(metodo + ' ' + u) || []).shift();
        if (!r) throw new TypeError('fetch failed');
        if (r.erro) { const e = new Error(r.erro); e.name = r.nome; throw e; }
        return new Response(Buffer.from(r.corpo, 'base64'), { status: r.estado });
    }
    let r;
    try { r = await real(u, init); } catch (e) { fita.respostas.push({ metodo, url: u, erro: e.message, nome: e.name }); throw e; }
    const b = Buffer.from(await r.arrayBuffer());
    fita.respostas.push({ metodo, url: u, estado: r.status, corpo: b.toString('base64') });
    return new Response(b, { status: r.status });
};
process.on('exit', () => {
    if (gravar) writeFileSync(gravar, JSON.stringify(fita));
    if (process.env.CONSELHEIRO_REGISTO) writeFileSync(process.env.CONSELHEIRO_REGISTO, JSON.stringify({ pedidos: registo, kv: null }));
});
