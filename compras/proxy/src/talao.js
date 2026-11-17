// Os talões (volta 6). A app manda a fotografia (JPEG, já reduzida no telemóvel) e a IA da Cloudflare (um modelo que lê
// imagens) devolve a loja, o dia, o total e as linhas. O conector guarda o talão na casa e risca na lista as coisas que
// aparecem no talão (as palavras da coisa estão numa linha). A fotografia não se guarda.
import { Erro, lerLista, mudarLista } from './casa.js';

// o Mistral Small 3.1 lê os talões letra a letra (17/11/2026: o mesmo talão do SPAR, três vezes igual e certo, em 4 s;
// o Llama 4 Scout leu «Azeite» em vez de «Água», 0,66 € em vez de 0,86 € e juntava linhas)
export const MODELO = '@cf/mistralai/mistral-small-3.1-24b-instruct';
export const MAX_IMAGEM = 1_500_000; // o data URL, em caracteres
const LOJAS = ['continente', 'pingo doce', 'auchan', 'lidl', 'mercadona', 'spar', 'intermarché', 'minipreço', 'aldi', 'el corte inglés'];
const PEDIDO = `És um leitor de talões de supermercado portugueses. Lê a fotografia e responde só com JSON, sem mais texto:
{"loja": "nome da cadeia", "dia": "AAAA-MM-DD", "total": 12.34, "doc": "número do documento (fatura)", "linhas": [{"t": "texto da linha como está no talão", "q": 1, "preco": 1.23}]}
"preco" é o valor total da linha em euros (o que se pagou por ela, com a quantidade). Não inventes linhas; descontos e
talões de desconto entram como linhas com preço negativo. Uma linha por artigo: não juntes dois artigos numa linha.
Não são linhas os totais («Total», «Qtd Total», «Subtotal»), o IVA, o pagamento (cartão, multibanco, troco) nem o
cabeçalho da loja. Copia o texto de cada artigo letra a letra, sem corrigir nem traduzir. Se não for um talão, responde {"linhas": []}.`;

const cent = (v) => (v == null || !Number.isFinite(Number(v)) ? null : Math.round(Number(v) * 100));
export const palavras = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);

// o JSON que vem na resposta do modelo (às vezes vem com texto à volta, ou já como objeto)
export function lerResposta(r) {
    const v = r?.response ?? r?.result?.response ?? r;
    if (v && typeof v === 'object') return v;
    const s = String(v ?? '');
    const i = s.indexOf('{'), f = s.lastIndexOf('}');
    if (i < 0 || f < i) return null;
    try { return JSON.parse(s.slice(i, f + 1)); } catch { return null; }
}

// as linhas que não são artigos (os totais, o IVA, o pagamento), que o modelo às vezes devolve
export const NAO_ARTIGO = /^(qtd|qt|quant\w*)\.?\s*total|^(sub)?total\b|^iva\b|^taxa\b|^troco|^multibanco|^cart[aã]o|^visa\b|^pagamento|^n\.?\s*art/i;
// o texto do talão limpo: os «lt» lidos como «1t» («Água 61t» é «6 lt»)
export const limpaLinha = (t) => String(t ?? '').replace(/\s+/g, ' ').trim().replace(/\b(\d+(?:[.,]\d+)?)1t\b/gi, '$1 lt').replace(/\b(\d+(?:[.,]\d+)?)lt\b/gi, '$1 lt');
// o talão arrumado: { loja, dia, total, linhas: [{ t, q, cent }] }
export function arrumar(d) {
    const linhas = (Array.isArray(d?.linhas) ? d.linhas : []).slice(0, 120).map((l) => ({
        t: limpaLinha(l?.t).slice(0, 80),
        q: Math.max(1, Math.min(99, Math.round(Number(l?.q)) || 1)),
        cent: cent(l?.preco),
    })).filter((l) => l.t && l.cent != null && !NAO_ARTIGO.test(l.t));
    const lojaTxt = String(d?.loja ?? '').toLowerCase();
    const loja = LOJAS.find((l) => lojaTxt.includes(l)) ?? (lojaTxt.trim().slice(0, 40) || null);
    const dia = /^\d{4}-\d{2}-\d{2}$/.test(String(d?.dia ?? '')) ? d.dia : null;
    const doc = String(d?.doc ?? '').replace(/\s+/g, '').slice(0, 40) || null;
    return { loja, dia, total: cent(d?.total), doc, linhas };
}

// as abreviaturas dos talões: «S/GAS» é sem gás, «C/GAS» com gás
export const porExtenso = (t) => String(t).replace(/\b([sc])\//gi, (m, l) => (l.toLowerCase() === 's' ? 'sem ' : 'com '));
// as coisas por riscar da lista que aparecem no talão: todas as palavras da coisa (com mais de 2 letras) numa linha; nas
// coisas da escolha, as palavras do tipo («agua-sem-gas»), que o texto pode ter mais coisas («marca branca», a marca)
export function noTalao(itens, linhas) {
    return itens.filter((i) => !i.f && linhaDaCoisa(i, linhas) >= 0).map((i) => i.id);
}
// a linha do talão de uma coisa da lista (o índice, ou -1)
export function linhaDaCoisa(i, linhas) {
    const ws = palavras(i.e?.k ? i.e.k.replace(/-/g, ' ') : i.t).map((w) => w.replace(/s$/, ''));
    if (!ws.length) return -1;
    return linhas.findIndex((l0) => {
        const l = new Set(palavras(porExtenso(l0.t)).flatMap((w) => [w, w.replace(/s$/, '')]));
        return ws.every((w) => l.has(w) || [...l].some((x) => x.startsWith(w.slice(0, 5)) && w.length >= 5));
    });
}

export async function lerTalao(env, ap, imagem, agora = new Date()) {
    if (typeof imagem !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/.test(imagem)) throw new Erro(400, 'falta a fotografia (JPEG)');
    if (imagem.length > MAX_IMAGEM) throw new Erro(413, 'fotografia grande demais');
    if (!env.AI) throw new Erro(503, 'a leitura de talões não está ligada');
    let r;
    try {
        r = await env.AI.run(MODELO, {
            messages: [{ role: 'user', content: [{ type: 'text', text: PEDIDO }, { type: 'image_url', image_url: { url: imagem } }] }],
            max_tokens: 2000, temperature: 0,
        });
    } catch (e) { throw new Erro(502, 'a IA não conseguiu ler o talão'); }
    const t = arrumar(lerResposta(r));
    if (!t.linhas.length) throw new Erro(422, 'não consegui ler nenhuma linha: tenta outra fotografia, com mais luz e o talão direito');
    const id = [...crypto.getRandomValues(new Uint8Array(8))].map((b) => b.toString(16).padStart(2, '0')).join('');
    // o mesmo talão outra vez (o mesmo número, ou a mesma loja, dia e total): a leitura nova fica no lugar da antiga
    const { results: antes } = await env.DB.prepare(`SELECT id FROM talao WHERE casa = ? AND ((doc IS NOT NULL AND doc = ?)
        OR (loja IS ? AND dia IS ? AND total IS ?))`).bind(ap.casa, t.doc, t.loja, t.dia, t.total).all();
    const fs = antes.map((x) => env.DB.prepare('DELETE FROM talao WHERE id = ?').bind(x.id));
    fs.push(env.DB.prepare('INSERT INTO talao (id, casa, loja, dia, total, doc, linhas, criado) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(id, ap.casa, t.loja, t.dia, t.total, t.doc, JSON.stringify(t.linhas), agora.toISOString()));
    await env.DB.batch(fs);
    const itens = (await lerLista(env.DB, ap.casa)).itens;
    const riscar = noTalao(itens, t.linhas);
    if (riscar.length) await mudarLista(env.DB, ap, riscar.map((id) => ({ o: 'r', id, f: 1 })));
    // o que se riscou fica no histórico com o preço do talão (o que se pagou mesmo, compras.js)
    await registarDoTalao(env.DB, ap.casa, itens.filter((i) => riscar.includes(i.id)), t, agora).catch(() => {});
    return { id, ...t, ...paraLer(t), riscadas: riscar.length, riscados: itens.filter((i) => riscar.includes(i.id)).map((i) => i.t), ...(antes.length ? { repetido: 1 } : {}) };
}

// para a app: a loja e o dia como se lêem («SPAR», «17/11»)
const NOMES_LOJA = { continente: 'Continente', 'pingo doce': 'Pingo Doce', auchan: 'Auchan', lidl: 'Lidl', mercadona: 'Mercadona', spar: 'SPAR',
    'intermarché': 'Intermarché', 'minipreço': 'Minipreço', aldi: 'Aldi', 'el corte inglés': 'El Corte Inglés' };
export const paraLer = (t) => ({ ...(t.loja ? { lojan: NOMES_LOJA[t.loja] ?? t.loja.replace(/(^|\s)\S/g, (l) => l.toUpperCase()) } : {}),
    ...(t.dia ? { diat: `${t.dia.slice(8, 10)}/${t.dia.slice(5, 7)}` } : {}) });
// os talões da casa (os 12 mais recentes), com as linhas, para os rever na Casa: GET /api/taloes
export async function taloesDaCasa(db, ap) {
    const { results } = await db.prepare('SELECT id, loja, dia, total, linhas, criado FROM talao WHERE casa = ? ORDER BY criado DESC LIMIT 12').bind(ap.casa).all();
    return results.map((t) => ({ id: t.id, ...(t.loja ? { loja: t.loja } : {}), ...(t.dia ? { dia: t.dia } : {}), ...(t.total != null ? { total: t.total } : {}),
        ...paraLer(t), linhas: JSON.parse(t.linhas), criado: t.criado }));
}
// apagar um talão da casa (um mal lido, ou de outra pessoa): sai também do «Costumas comprar», que se tira dos talões
export async function apagarTalao(db, ap, id) {
    if (!/^[0-9a-f]{16}$|^[a-z0-9]{1,32}$/.test(String(id ?? ''))) throw new Erro(400, 'talão desconhecido');
    const r = await db.prepare('DELETE FROM talao WHERE id = ? AND casa = ?').bind(String(id), ap.casa).run();
    if (!r.meta?.changes) throw new Erro(404, 'talão desconhecido');
    return { ok: 1 };
}

// as coisas riscadas pelo talão, no histórico do que se compra: a loja do talão e o preço da linha (por unidade)
async function registarDoTalao(db, casa, itens, t, agora) {
    const dia = agora.toISOString().slice(0, 10);
    const fs = itens.map((i) => {
        const l = t.linhas[linhaDaCoisa(i, t.linhas)];
        return db.prepare(`INSERT OR REPLACE INTO compra (casa, item, dia, quando, texto, tipo, q, cadeia, nome, cent, mx, estimada)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 0)`).bind(casa, i.id, dia, agora.toISOString(), i.t, i.e?.k ?? null, l?.q ?? i.q ?? 1,
            t.loja ?? null, l?.t ?? null, l ? Math.round(l.cent / (l.q || 1)) : null);
    });
    if (fs.length) await db.batch(fs);
}
