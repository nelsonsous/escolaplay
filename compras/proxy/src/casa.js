// A casa e a lista (volta 2; na D1 desde a volta 3). Cada telemóvel é um aparelho com uma chave (só o hash do segredo
// fica guardado, como na Meteo). Cada aparelho está numa casa: a primeira vez cria-se uma casa só dele, com um código
// para convidar; com o código de outra casa, o aparelho passa para lá e leva o que tinha na lista. A lista é da casa.
// As tabelas estão em migrations/0001_casa_lista_precos.sql.
//
// A lista muda por operações pequenas, que a app manda (e guarda enquanto não há rede):
//   {o:'j', id, t, q, e?}  juntar (e: o que é, vindo da escolha: { k: o tipo, emb: o tamanho, m: a marca ou 'branca'})
//   {o:'r', id, f}  riscar (f 1) ou voltar (f 0)    {o:'x', id}  tirar    {o:'q', id, q}  quantidade
//   {o:'p', id, c, p, a?}  o produto da cadeia c ({id, nome, url}; null tira); a: escolhido pela app (não pela mão).
//                      Escolher à mão uma coisa com e fixa-a (e.mao): o conector deixa de trocar o produto sozinho.
//   {o:'l'}            tirar os riscados
// Valem aplicadas mais do que uma vez (juntar um id que já lá está não faz nada), por isso a app pode reenviar.
// Cada pedido grava a lista uma vez, e só se mudou; se outro telemóvel a gravou entretanto (a versão já não é a
// mesma), lê-se outra vez e aplica-se por cima.
import { CADEIAS } from './indice.js';

export const MAX_ITENS = 200, MAX_OPS = 100, MAX_APARELHOS = 12;
const DOMINIO = { continente: 'www.continente.pt', pingodoce: 'www.pingodoce.pt', auchan: 'www.auchan.pt', lidl: 'www.lidl.pt' };
const ID = /^[a-z0-9]{4,16}$/;

export class Erro extends Error {
    constructor(status, mensagem) { super(mensagem); this.status = status; }
}

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
export const hash = async (s) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(s))));
const aleatorio = (n) => hex(crypto.getRandomValues(new Uint8Array(n)));
// o código de uma casa: 8 letras e algarismos sem os que se confundem (0/O, 1/I/L), «ABCD-2345» ao mostrar
const LETRAS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const novoCodigo = () => [...crypto.getRandomValues(new Uint8Array(8))].map((b) => LETRAS[b % LETRAS.length]).join('');
export const codigoLimpo = (s) => String(s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');

const um = (db, sql, ...args) => db.prepare(sql).bind(...args).first();

// um aparelho novo, numa casa nova só dele: { chave, casa: { codigo } }
export async function novoAparelho(db, agora = new Date()) {
    const id = aleatorio(8), segredo = aleatorio(16), casa = aleatorio(8);
    let codigo = novoCodigo();
    while (await um(db, 'SELECT 1 FROM casa WHERE codigo = ?', codigo)) codigo = novoCodigo();
    const quando = agora.toISOString();
    await db.batch([
        db.prepare('INSERT INTO casa (id, codigo, criada) VALUES (?, ?, ?)').bind(casa, codigo, quando),
        db.prepare('INSERT INTO aparelho (id, h, casa, criado) VALUES (?, ?, ?, ?)').bind(id, await hash(segredo), casa, quando),
    ]);
    return { chave: `${id}.${segredo}`, casa: { codigo } };
}

// o aparelho da chave (Authorization: Bearer <id>.<segredo>), ou um Erro 401
export async function aparelhoDe(db, request) {
    const auth = request.headers.get('authorization') || '';
    const m = auth.match(/^Bearer ([a-f0-9]{16})\.([a-f0-9]{32})$/);
    if (!m) throw new Erro(401, 'sem chave');
    const ap = await um(db, 'SELECT id, h, casa FROM aparelho WHERE id = ?', m[1]);
    if (!ap || ap.h !== await hash(m[2])) throw new Erro(401, 'chave desconhecida');
    return ap;
}

// { codigo, aparelhos } (quantos telemóveis tem a casa)
export async function casaDe(db, ap) {
    const c = await um(db, 'SELECT codigo, local, lojas, cp, zona, pessoas, (SELECT count(*) FROM aparelho WHERE casa = casa.id) AS aparelhos FROM casa WHERE id = ?', ap.casa);
    if (!c) throw new Erro(404, 'casa desconhecida');
    const r = { codigo: c.codigo, aparelhos: Number(c.aparelhos) };
    if (c.local) r.local = c.local;
    if (c.lojas) r.lojas = JSON.parse(c.lojas);
    if (c.cp) { r.cp = c.cp; if (c.zona) r.zona = c.zona; }
    if (c.pessoas) r.pessoas = Number(c.pessoas);
    return r;
}
// o código postal da casa (para o stock do Continente na zona: zona.js) e o nome da loja online que o serve; null tira
export async function gravarCp(db, ap, cp, zona) {
    await db.prepare('UPDATE casa SET cp = ?, zona = ? WHERE id = ?').bind(cp, zona, ap.casa).run();
    if (!cp) await db.prepare('DELETE FROM zona_stock WHERE casa = ?').bind(ap.casa).run();
    return casaDe(db, ap);
}
// quantas pessoas há em casa (porcoes.js): 1 a 12, ou null para não contar
export async function gravarPessoas(db, ap, n) {
    const v = n == null || n === '' ? null : Math.round(Number(n));
    if (v != null && !(v >= 1 && v <= 12)) throw new Erro(400, 'entre 1 e 12 pessoas');
    await db.prepare('UPDATE casa SET pessoas = ? WHERE id = ?').bind(v, ap.casa).run();
    return casaDe(db, ap);
}
// a localidade e as lojas da casa (lojas.js); null nas lojas: todas
export async function gravarLojas(db, ap, { local, lojas }) {
    await db.prepare('UPDATE casa SET local = ?, lojas = ? WHERE id = ?').bind(local, lojas ? JSON.stringify(lojas) : null, ap.casa).run();
    return casaDe(db, ap);
}

export const listaVazia = () => ({ versao: 0, itens: [] });
export async function lerLista(db, casa) {
    const r = await um(db, 'SELECT versao, itens FROM casa WHERE id = ?', casa);
    return r ? { versao: Number(r.versao), itens: JSON.parse(r.itens) } : listaVazia();
}
// grava a lista se ninguém a mudou desde que se leu (a versão de então é «antes»); diz se gravou
async function gravarLista(db, casa, lista, antes) {
    const r = await db.prepare('UPDATE casa SET versao = ?, itens = ? WHERE id = ? AND versao = ?')
        .bind(lista.versao, JSON.stringify(lista.itens), casa, antes).run();
    return r.meta.changes > 0;
}

const texto = (s, max) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
// o que é uma coisa (da escolha da volta 5): o tipo, o tamanho e a marca
function especie(e) {
    if (!e || typeof e !== 'object') return null;
    const k = texto(e.k, 60);
    if (!/^[a-z0-9-]{2,60}$/.test(k)) return null;
    const x = { k };
    if (e.emb) x.emb = texto(e.emb, 20);
    if (e.m) x.m = texto(e.m, 40);
    if (e.w) x.w = texto(e.w, 60).toLowerCase().trim();
    // o nome do tipo (para o caminho na lista: «Carne picada»)
    if (e.n) x.n = texto(e.n, 60);
    return x;
}
const quantidade = (q) => Math.min(99, Math.max(1, Math.round(Number(q)) || 1));

export function produto(c, p) {
    if (p == null) return null;
    let u;
    try { u = new URL(String(p.url)); } catch { throw new Erro(400, 'produto sem endereço'); }
    if (u.protocol !== 'https:' || u.hostname !== DOMINIO[c]) throw new Erro(400, `o produto não é do site da cadeia ${c}`);
    return { id: texto(p.id, 40), nome: texto(p.nome, 120), url: u.toString().slice(0, 300) };
}

// aplica as operações à lista (muda-a) e diz se mudou
export const NAO_HAVIA_DIAS = 3;
// o que está em falta numa cadeia e ainda conta (não passou o prazo): o id, ou null
export const emFalta = (i, c, agora = new Date()) => (i.nh?.[c] && i.nh[c].ate > agora.toISOString() ? i.nh[c].id : null);
export function aplicar(lista, ops) {
    if (!Array.isArray(ops)) throw new Erro(400, 'ops tem de ser uma lista');
    if (ops.length > MAX_OPS) throw new Erro(400, `no máximo ${MAX_OPS} operações por pedido`);
    const antes = JSON.stringify(lista.itens);
    for (const op of ops) {
        if (!op || typeof op !== 'object') throw new Erro(400, 'operação inválida');
        if (op.o === 'l') { lista.itens = lista.itens.filter((i) => !i.f); continue; }
        if (!ID.test(String(op.id))) throw new Erro(400, 'id inválido');
        const i = lista.itens.findIndex((x) => x.id === op.id);
        const item = lista.itens[i];
        switch (op.o) {
            case 'j': {
                if (item) break;
                const t = texto(op.t, 80);
                if (!t) throw new Erro(400, 'falta o texto');
                if (lista.itens.length >= MAX_ITENS) throw new Erro(400, `a lista tem no máximo ${MAX_ITENS} coisas`);
                const e = especie(op.e);
                lista.itens.push({ id: op.id, t, q: quantidade(op.q), f: 0, p: {}, ...(e ? { e } : {}) });
                break;
            }
            case 'r': if (item) item.f = op.f ? 1 : 0; break;
            case 'x': if (item) lista.itens.splice(i, 1); break;
            case 'q': if (item) item.q = quantidade(op.q); break;
            case 'p': {
                if (!CADEIAS.includes(op.c)) throw new Erro(400, 'cadeia desconhecida');
                const p = produto(op.c, op.p);
                if (!item) break;
                if (p) item.p[op.c] = p; else delete item.p[op.c];
                if (item.e && !op.a) item.e.mao = 1;
                break;
            }
            case 'n': {
                // «não havia na loja»: o produto dessa cadeia fica em falta 3 dias (a troca de hora a hora passa ao
                // seguinte, o «Mais barato» conta-o como esgotado); f: 0 desfaz («afinal havia»)
                if (!CADEIAS.includes(op.c)) throw new Erro(400, 'cadeia desconhecida');
                if (!item) break;
                if (op.f === 0) { if (item.nh) { delete item.nh[op.c]; if (!Object.keys(item.nh).length) delete item.nh; } break; }
                const id = item.p[op.c]?.id;
                if (!id) break;
                item.nh = { ...(item.nh ?? {}), [op.c]: { id, ate: new Date(Date.now() + NAO_HAVIA_DIAS * 24 * 3600e3).toISOString() } };
                if (item.e) delete item.e.mao; // escolhida à mão ou não, passa a poder trocar-se
                break;
            }
            default: throw new Erro(400, `operação desconhecida: ${String(op.o).slice(0, 10)}`);
        }
    }
    const mudou = JSON.stringify(lista.itens) !== antes;
    if (mudou) lista.versao++;
    return mudou;
}

export async function mudarLista(db, ap, ops) {
    for (let tentativa = 0; tentativa < 5; tentativa++) {
        const lista = await lerLista(db, ap.casa);
        const antes = lista.versao;
        if (!aplicar(lista, ops) || await gravarLista(db, ap.casa, lista, antes)) return lista;
    }
    throw new Erro(409, 'a lista está a mudar noutro telemóvel: tenta outra vez');
}

// o aparelho passa para a casa do código, e leva o que tinha na lista; a casa de antes, se fica vazia, apaga-se
export async function entrarNaCasa(db, ap, codigo) {
    const nova = await um(db, 'SELECT id, codigo, (SELECT count(*) FROM aparelho WHERE casa = casa.id) AS n FROM casa WHERE codigo = ?', codigoLimpo(codigo));
    if (!nova) throw new Erro(404, 'não há nenhuma casa com esse código');
    if (nova.id === ap.casa) return { codigo: nova.codigo, casa: nova.id, mudou: false };
    if (Number(nova.n) >= MAX_APARELHOS) throw new Erro(400, `uma casa tem no máximo ${MAX_APARELHOS} telemóveis`);
    // o que estava na lista de antes junta-se à da casa nova
    const velha = await lerLista(db, ap.casa);
    for (let tentativa = 0; velha.itens.length && tentativa < 5; tentativa++) {
        const lista = await lerLista(db, nova.id);
        const antes = lista.versao;
        const ids = new Set(lista.itens.map((i) => i.id));
        const novos = velha.itens.filter((i) => !ids.has(i.id)).slice(0, Math.max(0, MAX_ITENS - lista.itens.length));
        if (!novos.length) break;
        lista.itens.push(...novos);
        lista.versao++;
        if (await gravarLista(db, nova.id, lista, antes)) break;
    }
    await db.batch([
        db.prepare('UPDATE aparelho SET casa = ? WHERE id = ?').bind(nova.id, ap.id),
        db.prepare('DELETE FROM casa WHERE id = ? AND NOT EXISTS (SELECT 1 FROM aparelho WHERE casa = ?)').bind(ap.casa, ap.casa),
    ]);
    return { codigo: nova.codigo, casa: nova.id, mudou: true };
}
