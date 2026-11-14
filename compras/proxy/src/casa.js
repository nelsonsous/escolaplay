// A casa e a lista (volta 2). Cada telemóvel é um aparelho com uma chave (só o hash do segredo fica guardado, como
// na Meteo). Cada aparelho está numa casa: a primeira vez cria-se uma casa só dele, com um código para convidar; com
// o código de outra casa, o aparelho passa para lá e leva o que tinha na lista. A lista é da casa.
//
// A lista muda por operações pequenas, que a app manda (e guarda enquanto não há rede):
//   {o:'j', id, t, q}  juntar      {o:'r', id, f}  riscar (f 1) ou voltar (f 0)    {o:'x', id}  tirar
//   {o:'q', id, q}     quantidade  {o:'p', id, c, p}  o produto da cadeia c ({id, nome, url}; null tira)
//   {o:'l'}            tirar os riscados
// Valem aplicadas mais do que uma vez (juntar um id que já lá está não faz nada), por isso a app pode reenviar.
// Gravações: a KV grátis dá 1000 por dia à conta toda (as outras apps também). Cada pedido grava a lista uma vez,
// e só se mudou; a app junta as mudanças que se fazem seguidas num só pedido.
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

const lerJSON = async (kv, k) => { const v = await kv.get(k); return v ? JSON.parse(v) : null; };
const gravar = (kv, k, v) => kv.put(k, JSON.stringify(v));

// um aparelho novo, numa casa nova só dele: { chave, casa: { codigo } }
export async function novoAparelho(kv, agora = new Date()) {
    const id = aleatorio(8), segredo = aleatorio(16), casa = aleatorio(8);
    let codigo = novoCodigo();
    while (await kv.get('codigo:' + codigo)) codigo = novoCodigo();
    const quando = agora.toISOString();
    await gravar(kv, 'ap:' + id, { h: await hash(segredo), casa, criado: quando });
    await gravar(kv, 'casa:' + casa, { codigo, aparelhos: [id], criada: quando });
    await kv.put('codigo:' + codigo, casa);
    return { chave: `${id}.${segredo}`, casa: { codigo } };
}

// o aparelho da chave (Authorization: Bearer <id>.<segredo>), ou um Erro 401
export async function aparelhoDe(kv, request) {
    const auth = request.headers.get('authorization') || '';
    const m = auth.match(/^Bearer ([a-f0-9]{16})\.([a-f0-9]{32})$/);
    if (!m) throw new Erro(401, 'sem chave');
    const ap = await lerJSON(kv, 'ap:' + m[1]);
    if (!ap || ap.h !== await hash(m[2])) throw new Erro(401, 'chave desconhecida');
    return { id: m[1], ...ap };
}

export async function casaDe(kv, ap) {
    const casa = await lerJSON(kv, 'casa:' + ap.casa);
    if (!casa) throw new Erro(404, 'casa desconhecida');
    return casa;
}

export const listaVazia = () => ({ versao: 0, itens: [] });
export const lerLista = async (kv, casa) => (await lerJSON(kv, 'lista:' + casa)) ?? listaVazia();

const texto = (s, max) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const quantidade = (q) => Math.min(99, Math.max(1, Math.round(Number(q)) || 1));

function produto(c, p) {
    if (p == null) return null;
    let u;
    try { u = new URL(String(p.url)); } catch { throw new Erro(400, 'produto sem endereço'); }
    if (u.protocol !== 'https:' || u.hostname !== DOMINIO[c]) throw new Erro(400, `o produto não é do site da cadeia ${c}`);
    return { id: texto(p.id, 40), nome: texto(p.nome, 120), url: u.toString().slice(0, 300) };
}

// aplica as operações à lista (muda-a) e diz se mudou
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
                lista.itens.push({ id: op.id, t, q: quantidade(op.q), f: 0, p: {} });
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
                break;
            }
            default: throw new Erro(400, `operação desconhecida: ${String(op.o).slice(0, 10)}`);
        }
    }
    const mudou = JSON.stringify(lista.itens) !== antes;
    if (mudou) lista.versao++;
    return mudou;
}

export async function mudarLista(kv, ap, ops) {
    const lista = await lerLista(kv, ap.casa);
    if (aplicar(lista, ops)) await gravar(kv, 'lista:' + ap.casa, lista);
    return lista;
}

// o aparelho passa para a casa do código, e leva o que tinha na lista; a casa de antes, se fica vazia, apaga-se
export async function entrarNaCasa(kv, ap, codigo) {
    const nova = await kv.get('codigo:' + codigoLimpo(codigo));
    if (!nova) throw new Erro(404, 'não há nenhuma casa com esse código');
    if (nova === ap.casa) return { codigo: codigoLimpo(codigo), casa: nova, mudou: false };
    const casaNova = await lerJSON(kv, 'casa:' + nova);
    if (!casaNova) throw new Erro(404, 'não há nenhuma casa com esse código');
    if (casaNova.aparelhos.length >= MAX_APARELHOS) throw new Erro(400, `uma casa tem no máximo ${MAX_APARELHOS} telemóveis`);
    // o que estava na lista de antes junta-se à da casa nova
    const velha = await lerLista(kv, ap.casa);
    if (velha.itens.length) {
        const lista = await lerLista(kv, nova);
        const ids = new Set(lista.itens.map((i) => i.id));
        const novos = velha.itens.filter((i) => !ids.has(i.id)).slice(0, Math.max(0, MAX_ITENS - lista.itens.length));
        if (novos.length) { lista.itens.push(...novos); lista.versao++; await gravar(kv, 'lista:' + nova, lista); }
    }
    casaNova.aparelhos.push(ap.id);
    await gravar(kv, 'casa:' + nova, casaNova);
    await gravar(kv, 'ap:' + ap.id, { h: ap.h, casa: nova, criado: ap.criado });
    const casaVelha = await lerJSON(kv, 'casa:' + ap.casa);
    if (casaVelha) {
        casaVelha.aparelhos = casaVelha.aparelhos.filter((x) => x !== ap.id);
        if (casaVelha.aparelhos.length) await gravar(kv, 'casa:' + ap.casa, casaVelha);
        else await Promise.all([kv.delete('casa:' + ap.casa), kv.delete('codigo:' + casaVelha.codigo), kv.delete('lista:' + ap.casa)]);
    }
    return { codigo: casaNova.codigo, casa: nova, mudou: true };
}
