// A análise do Claude a pedido (volta 16), como o Maestro da Música: a app pede, o Worker guarda o pedido (tabela
// analise, migração 0014) e, com os segredos ANALISE_FIRE_URL e ANALISE_TOKEN (o endereço e o token do gatilho «API»
// da tarefa, criados em claude.ai/code/routines — nunca no código), chama logo a tarefa; sem eles, o pedido espera pela
// corrida agendada seguinte. A tarefa (economo/analise.mjs) lê os pendentes e os dados de cada casa e grava o resultado.
// Regras, para não haver corridas à toa (cada uma gasta da subscrição do Claude): um pedido à espera por casa; no
// máximo 6 pedidos por casa por dia; cada pedido é chamado no máximo 2 vezes (a 2.ª 15 min depois da 1.ª, quando a
// app volta a ver); no total, no máximo 6 chamadas por hora. O texto da chamada é fixo, com o id do pedido.
import { Erro } from './casa.js';

const MAX_DIA = 6, MAX_HORA = 6, CORRIDA_MS = 15 * 60e3;
const FIRE = /^https:\/\/api\.anthropic\.com\/v1\/claude_code\/routines\/[A-Za-z0-9_-]+\/fire$/;
export const naHora = (env) => !!(env.ANALISE_TOKEN && FIRE.test(env.ANALISE_FIRE_URL || ''));
const novoId = () => [...crypto.getRandomValues(new Uint8Array(8))].map((b) => b.toString(16).padStart(2, '0')).join('');

// o resultado como a app o mostra (o que o Claude gravou, já validado)
const ler = (r) => (r ? { id: r.id, estado: r.estado, criado: r.criado, ...(r.pergunta ? { pergunta: r.pergunta } : {}),
    ...(r.feita ? { feita: r.feita } : {}), ...(r.resultado ? { resultado: JSON.parse(r.resultado) } : {}) } : null);

// o último pedido da casa (para a app): { id, estado, pergunta, resultado } ou null; se está à espera há mais de 15 min
// e ainda pode, chama outra vez a tarefa
export async function ultimaAnalise(db, env, casa, espera = null) {
    const r = await db.prepare('SELECT * FROM analise WHERE casa = ? ORDER BY criado DESC LIMIT 1').bind(casa).first();
    if (r?.estado === 'pendente' && naHora(env) && espera) espera(disparar(db, env, r.id).catch((e) => console.error('analise', e)));
    return { ...(r ? { analise: ler(r) } : {}), naHora: naHora(env) }; // sem análise, sem o campo (a app não lê null)
}

// um pedido novo: a pergunta (opcional, até 200 letras); um à espera por casa (devolve esse), 6 por dia
export async function pedirAnalise(db, env, casa, pergunta, espera = null, agora = new Date()) {
    const p = String(pergunta ?? '').replace(/\s+/g, ' ').trim().slice(0, 200) || null;
    const ja = await db.prepare("SELECT * FROM analise WHERE casa = ? AND estado = 'pendente'").bind(casa).first();
    if (ja) return { analise: ler(ja), naHora: naHora(env) };
    const desde = new Date(agora.getTime() - 24 * 3600e3).toISOString();
    const { n } = await db.prepare('SELECT count(*) AS n FROM analise WHERE casa = ? AND criado > ?').bind(casa, desde).first();
    if (Number(n) >= MAX_DIA) throw new Erro(429, `no máximo ${MAX_DIA} análises por dia: volta a pedir amanhã`);
    const id = novoId();
    await db.prepare('INSERT INTO analise (id, casa, pergunta, estado, criado) VALUES (?, ?, ?, ?, ?)').bind(id, casa, p, 'pendente', agora.toISOString()).run();
    if (naHora(env) && espera) espera(disparar(db, env, id).catch((e) => console.error('analise', e)));
    return { analise: ler({ id, estado: 'pendente', criado: agora.toISOString(), pergunta: p }), naHora: naHora(env) };
}

// chama a tarefa para um pedido (regista primeiro e chama depois; nunca mais de 2 vezes por pedido nem 6 por hora)
export async function disparar(db, env, id, agora = Date.now()) {
    const r = await db.prepare('SELECT estado, chamadas, chamado FROM analise WHERE id = ?').bind(id).first();
    if (!r || r.estado !== 'pendente' || r.chamadas >= 2 || (r.chamado && agora - Date.parse(r.chamado) < CORRIDA_MS)) return false;
    const hora = new Date(agora - 3600e3).toISOString();
    const { n } = await db.prepare('SELECT count(*) AS n FROM analise WHERE chamado > ?').bind(hora).first();
    if (Number(n) >= MAX_HORA) return false;
    await db.prepare('UPDATE analise SET chamadas = chamadas + 1, chamado = ? WHERE id = ?').bind(new Date(agora).toISOString(), id).run();
    const res = await fetch(env.ANALISE_FIRE_URL, { method: 'POST', headers: { authorization: `Bearer ${env.ANALISE_TOKEN}`,
        'anthropic-beta': 'experimental-cc-routine-2026-04-01', 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ text: `Corrida pedida pela app Compras: trata o pedido de análise ${id}.` }) });
    if (!res.ok) console.error('analise', res.status);
    return res.ok;
}

// ---------- para a tarefa (com o segredo da sonda) ----------
// os pedidos à espera: [{ id, codigo, pergunta, criado }]
export async function pendentes(db) {
    const { results } = await db.prepare(`SELECT a.id, c.codigo, a.pergunta, a.criado FROM analise a JOIN casa c ON c.id = a.casa
        WHERE a.estado = 'pendente' ORDER BY a.criado LIMIT 10`).all();
    return results;
}
const curto = (s, n) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const lista = (a, n) => (Array.isArray(a) ? a.slice(0, n) : []);
// o resultado do Claude, validado: { resumo, lojas: [{ loja, porque, coisas: [] }], online: [{ loja, o_que, porque, url }],
// avisos: [], perguntas: [] } (o texto todo é texto: a app escapa-o)
export function validarResultado(x) {
    if (!x || typeof x !== 'object' || !curto(x.resumo, 10)) throw new Erro(400, 'falta o resumo');
    const url = (u) => (/^https:\/\/[^\s"<>]+$/.test(String(u ?? '')) ? String(u).slice(0, 300) : null);
    return {
        resumo: curto(x.resumo, 800),
        lojas: lista(x.lojas, 5).map((l) => ({ loja: curto(l?.loja, 40), porque: curto(l?.porque, 300), coisas: lista(l?.coisas, 40).map((c) => curto(c, 80)) })).filter((l) => l.loja),
        online: lista(x.online, 6).map((o) => ({ loja: curto(o?.loja, 40), o_que: curto(o?.o_que, 120), porque: curto(o?.porque, 300), ...(url(o?.url) ? { url: url(o.url) } : {}) })).filter((o) => o.loja),
        avisos: lista(x.avisos, 6).map((a) => curto(a, 300)).filter(Boolean),
        perguntas: lista(x.perguntas, 4).map((p) => curto(p, 160)).filter(Boolean),
        ...(x.total_estimado ? { total_estimado: Math.round(Number(x.total_estimado)) || null } : {}),
    };
}
export async function gravarResultado(db, id, x, agora = new Date()) {
    const r = await db.prepare('SELECT estado FROM analise WHERE id = ?').bind(id).first();
    if (!r) throw new Erro(404, 'pedido desconhecido');
    if (r.estado !== 'pendente') throw new Erro(409, 'o pedido já foi tratado');
    const v = validarResultado(x);
    await db.prepare("UPDATE analise SET estado = 'feita', feita = ?, resultado = ? WHERE id = ?").bind(agora.toISOString(), JSON.stringify(v), id).run();
    return v;
}
