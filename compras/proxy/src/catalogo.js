// O catálogo (volta 5): as páginas de categoria das cadeias trazem dezenas de produtos de uma vez, cada um com o
// nome, a marca, o preço, a embalagem e o preço por unidade. O robots.txt deixa ler a primeira página de cada
// categoria (a paginação está fechada) e, no Continente, as páginas de cada marca dentro da categoria (estão no mapa
// do site). Cada produto lido fica na tabela preco com o tipo (tipos.js) e o que se sabe dele.
//   Continente  <div class="product-tile col-product-tile …" data-product-tile-impression='{name,id,price,brand,category}'>
//               «emb. 6 x 1,5 lt» em pwc-tile--quantity, «0,44€/lt» em pwc-tile--price-secondary, o PVPR riscado
//   Pingo Doce  <div class="product" data-pid> com data-gtm-info (item_name, item_id, price, item_brand, discount) e
//               «6 L | 0,16 €/L» em product-unit
//   Auchan      <div class="product-tile auc-product-tile …"> com data-gtm (name, id, price, brand, category),
//               data-urls (absoluteProductUrl) e «0.16 €/Lt» em auc-measures--price-per-unit
// Sem DOM e sem expressões regulares sobre a página toda (2,4 MB no Continente): corta-se por marcadores.
import { revisarTipo, nomeCondiz } from './revisao.js';
import { entidades, texto, numero, precoUnidade } from './fontes/comum.js';
import { porUnidade, medida, rotulo, normaliza } from './precos.js';
import { pedir } from './rede.js';

const BASE = { continente: 'https://www.continente.pt', pingodoce: 'https://www.pingodoce.pt', auchan: 'https://www.auchan.pt' };
const INICIO = {
    continente: '<div class="product-tile col-product-tile',
    pingodoce: '<div class="product" data-pid=',
    auchan: '<div class="product-tile auc-product-tile',
};

// o valor do atributo nome="…" (ou nome='…') no pedaço t, com as entidades trocadas
function atributo(t, nome) {
    const i = t.indexOf(' ' + nome + '=');
    if (i < 0) return null;
    const a = i + nome.length + 2, q = t[a];
    if (q !== '"' && q !== "'") return null;
    const f = t.indexOf(q, a + 1);
    return f < 0 ? null : entidades(t.slice(a + 1, f));
}
const json = (s) => { try { return s ? JSON.parse(s) : null; } catch { return null; } };
// o texto do elemento com a classe c (até ao fim do elemento seguinte que feche: </p>, </div> ou </span>)
function elemento(t, c, fim = '</') {
    const i = t.indexOf(c);
    if (i < 0) return null;
    const a = t.indexOf('>', i);
    const f = t.indexOf(fim, a);
    return a < 0 || f < 0 ? null : texto(t.slice(a + 1, f));
}
// o pedaço de t até ao fim do conteúdo do elemento com a classe c (para os que têm elementos dentro)
function bloco(t, c, tamanho = 300) {
    const i = t.indexOf(c);
    return i < 0 ? null : texto(t.slice(t.indexOf('>', i) + 1, i + tamanho).split('</div>')[0]);
}
const absoluto = (cadeia, h) => (h ? new URL(h, BASE[cadeia]).toString() : null);

function continente(t) {
    const d = json(atributo(t, 'data-product-tile-impression'));
    if (!d?.id) return null;
    const i = t.indexOf('href="https://www.continente.pt/produto/');
    const lista = bloco(t, '<div class="list');
    // o peixe fresco, a fruta, a carne ao peso: o preço principal diz «4,49 €/kg» e a quantidade é o peso médio
    const v = t.indexOf('pwc-tile--price-primary');
    const aoPeso = v >= 0 && /\/\s*kg/i.test(t.slice(v, v + 200));
    return {
        id: String(d.id), nome: d.name ?? null, marca: d.brand || null,
        ...(aoPeso ? { aoPeso } : {}),
        url: i < 0 ? null : t.slice(i + 6, t.indexOf('"', i + 6)),
        preco: numero(d.price), antes: lista && /\d/.test(lista) ? numero(lista.replace(/^\D+/, '')) : null,
        emb: (elemento(t, 'class="pwc-tile--quantity"') ?? '').replace(/^emb\.\s*/i, '') || null,
        precoUnidade: precoUnidade(bloco(t, 'class="pwc-tile--price-secondary') ?? ''),
        cat: d.category ?? null,
    };
}

function pingodoce(t) {
    const g = json(atributo(t, 'data-gtm-info'));
    const d = g?.items?.[0];
    if (!d?.item_id) return null;
    const h = t.indexOf('href="/home/produtos/');
    const unidade = elemento(t, 'class="product-unit"'); // «6 L | 0,16 €/L»
    const [emb, pu] = unidade ? unidade.split('|').map((s) => s.trim()) : [null, null];
    const preco = numero(d.price);
    // a fruta, os legumes e o balcão vendem-se ao quilo: o preço diz «2,49 €/Kg» e a embalagem é o peso médio
    const v = t.indexOf('class="sales');
    const aoPeso = v >= 0 && /(€|&euro;)\s*\/\s*kg/i.test(t.slice(v, v + 300));
    return {
        id: String(d.item_id), nome: d.item_name ?? null, marca: d.item_brand || null,
        ...(aoPeso ? { aoPeso } : {}),
        url: h < 0 ? null : absoluto('pingodoce', t.slice(h + 6, t.indexOf('"', h + 6))),
        preco, antes: d.discount > 0 && preco != null ? Math.round((preco + Number(d.discount)) * 100) / 100 : null,
        emb: emb || null, precoUnidade: pu ? precoUnidade(pu) : null,
        cat: [d.item_category2, d.item_category].filter(Boolean).join('/') || null,
    };
}

function auchan(t) {
    const d = json(atributo(t, 'data-gtm'));
    if (!d?.id) return null;
    const u = json(atributo(t, 'data-urls'));
    return {
        id: String(d.id), nome: d.name ?? null, marca: d.brand || null,
        url: u?.absoluteProductUrl ?? null,
        preco: numero(d.price), antes: null,
        emb: null, precoUnidade: precoUnidade((elemento(t, 'auc-measures--price-per-unit') ?? '').replace(/(\d)\.(\d)/, '$1,$2')),
        cat: d.category ?? null,
    };
}

const LER = { continente, pingodoce, auchan };

// os produtos de uma página de categoria: [{ id, nome, marca, url, preco, antes, emb, precoUnidade, cat }]
export function lerCategoria(cadeia, html) {
    const inicio = INICIO[cadeia];
    if (!inicio) return [];
    const out = [], vistos = new Set();
    for (let i = html.indexOf(inicio); i >= 0;) {
        const j = html.indexOf(inicio, i + inicio.length);
        // cada produto vai até ao seguinte (o último, até 40 000 caracteres: chega para um cartão)
        const p = LER[cadeia](html.slice(i, j < 0 ? i + 40000 : j));
        if (p && p.url && p.preco != null && !vistos.has(p.id)) { vistos.add(p.id); out.push(p); }
        i = j;
    }
    return out;
}

// ---------- guardar ----------

// as marcas próprias de cada cadeia (a «marca branca»); o resto são marcas de fabricante
const PROPRIAS = {
    continente: /^(continente|é$|é continente)/i,
    pingodoce: /^(pingo doce|amanhecer|pura vida|nosso talho|nossa peixaria|nossa padaria|nossa fruta|nossa charcutaria|nossa pastelaria)/i,
    auchan: /^(auchan|polegar)/i,
};
export const propria = (cadeia, marca) => (marca && PROPRIAS[cadeia]?.test(String(marca).trim()) ? 1 : 0);

// o nome do tipo a partir da categoria de um produto («Supermercado/Bebidas e Garrafeira/Água/Água sem Gás» →
// «Água sem gás»); na Auchan a categoria vem com hífens
export function nomeDoTipo(cat) {
    const ultimo = String(cat ?? '').split('/').pop().replace(/-/g, ' ').trim();
    return ultimo ? ultimo[0].toUpperCase() + ultimo.slice(1).toLowerCase() : null;
}

const cent = (v) => (v == null || !Number.isFinite(Number(v)) || Number(v) <= 0 ? null : Math.round(Number(v) * 100));

// grava os produtos de uma página do tipo k na tabela preco (um a um, numa só ida à base de dados)
// Só escreve o que mudou (preço, nome, tamanho, tipo…) ou o que não se vê há mais de 3 dias: a D1 grátis tem um limite
// de 100 mil linhas escritas por dia, e reescrever o catálogo inteiro a cada leitura passava-o (15/11).
export const REFRESCA_DIAS = 3;
export function guardarCatalogo(db, cadeia, k, produtos, agora = new Date()) {
    const quando = agora.toISOString(), limiar = new Date(agora.getTime() - REFRESCA_DIAS * 24 * HORA).toISOString();
    const frases = produtos.map((p) => {
        const pu = porUnidade({ preco: p.preco, precoUnidade: p.precoUnidade, embalagem: p.emb, nome: p.nome });
        const m = medida(p.emb) ?? medida(p.nome);
        const { cent: c, uc, ub, emb: embKg } = normaliza({ cadeia, nome: p.nome, cent: cent(p.preco), uc: pu.uc, ub: pu.ub, m, aoPeso: p.aoPeso });
        let a = cent(p.antes);
        if (a != null && c != null && cent(p.preco) !== c) a = Math.round(a * c / cent(p.preco)); // o «antes» da porção
        return db.prepare(`INSERT INTO preco (cadeia, id, url, nome, marca, cent, antes, emb, uc, ub, q, tipo, propria, visto, tentado, falhas)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
            ON CONFLICT (cadeia, id) DO UPDATE SET url = excluded.url, nome = excluded.nome, marca = excluded.marca,
                cent = excluded.cent, antes = excluded.antes, emb = excluded.emb, uc = excluded.uc, ub = excluded.ub,
                q = excluded.q, tipo = excluded.tipo, propria = excluded.propria, visto = excluded.visto,
                tentado = excluded.tentado, falhas = 0
            WHERE preco.cent IS NOT excluded.cent OR preco.antes IS NOT excluded.antes OR preco.nome IS NOT excluded.nome
                OR preco.uc IS NOT excluded.uc OR preco.emb IS NOT excluded.emb OR preco.tipo IS NOT excluded.tipo
                OR preco.marca IS NOT excluded.marca OR preco.url IS NOT excluded.url OR preco.falhas > 0
                OR preco.visto IS NULL OR preco.visto < ?`)
            .bind(cadeia, p.id, p.url, String(p.nome ?? '').slice(0, 160), p.marca ?? null, c, a != null && c != null && a > c ? a : null,
                rotulo(p.emb) ?? rotulo(p.nome) ?? embKg ?? null, uc, ub, m?.q ?? (embKg ? 1 : null), k, propria(cadeia, p.marca), quando, quando, limiar);
    });
    return frases.length ? db.batch(frases) : Promise.resolve([]);
}

// ---------- ler as páginas (o cron e a sonda) ----------

export const CADEIAS_CATALOGO = ['continente', 'pingodoce', 'auchan'];
const HORA = 3600e3;

// a próxima página a ler numa cadeia: a que nunca se leu, ou a mais velha (as de categoria com mais de 20 h, as de
// marca com mais de 6 dias); uma que falhou espera uma hora (e com 5 falhas seguidas fica de lado)
export async function proximaPagina(db, cadeia, agora = new Date()) {
    const t = agora.getTime(), iso = (h) => new Date(t - h * HORA).toISOString();
    return db.prepare(`SELECT url, cadeia, tipo FROM pagina
        WHERE cadeia = ?1 AND falhas < 5 AND (tentado IS NULL OR tentado < ?2)
          AND (visto IS NULL OR visto < CASE WHEN marca = 1 THEN ?4 ELSE ?3 END)
        ORDER BY visto IS NOT NULL, marca, visto LIMIT 1`).bind(cadeia, iso(1), iso(20), iso(144)).first();
}

// lê uma página de categoria e guarda o que lá está: { url, estado, n }
export async function lerPagina(db, pagina, agora = new Date()) {
    const quando = agora.toISOString();
    let estado = 0, produtos = [];
    try {
        const r = await pedir(new URL(pagina.url), 'text/html,application/xhtml+xml', 12000);
        estado = r.status;
        if (estado === 200) produtos = lerCategoria(pagina.cadeia, await r.text());
        else await r.body?.cancel();
    } catch { estado = 0; }
    if (!produtos.length) {
        await db.prepare('UPDATE pagina SET tentado = ?, falhas = falhas + 1 WHERE url = ?').bind(quando, pagina.url).run();
        return { url: pagina.url, estado, n: 0 };
    }
    await guardarCatalogo(db, pagina.cadeia, pagina.tipo, produtos, agora);
    // o nome de um tipo cruzado: a categoria mais comum dos produtos da página, só se condiz com a chave (antes vinha
    // do primeiro produto, que podia ser de outra categoria: «Massas e gnocchis» no tipo «peixe»)
    let nome = null;
    if (pagina.cadeia === 'continente') {
        const conta = new Map();
        for (const p of produtos) { const n = nomeDoTipo(p.cat); if (n) conta.set(n, (conta.get(n) ?? 0) + 1); }
        const [melhor] = [...conta].sort((a, b) => b[1] - a[1])[0] ?? [];
        if (melhor && nomeCondiz(pagina.tipo, melhor)) nome = melhor;
    }
    await db.batch([
        db.prepare('UPDATE pagina SET visto = ?1, tentado = ?1, falhas = 0, n = ?2 WHERE url = ?3').bind(quando, produtos.length, pagina.url),
        db.prepare(`UPDATE tipo SET n = (SELECT count(*) FROM preco WHERE tipo = ?1),
            nome = CASE WHEN casa = 0 AND ?2 IS NOT NULL THEN ?2 ELSE nome END
            WHERE k = ?1 AND (n IS NOT (SELECT count(*) FROM preco WHERE tipo = ?1) OR (casa = 0 AND ?2 IS NOT NULL AND nome IS NOT ?2))`).bind(pagina.tipo, nome),
    ]);
    // e revê o tipo: os suspeitos e o nome (revisao.js)
    await revisarTipo(db, pagina.tipo);
    return { url: pagina.url, estado, n: produtos.length };
}

// o cron: a próxima página de uma cadeia (null se está tudo em dia)
export async function cronCatalogo(db, cadeia, agora = new Date()) {
    const p = await proximaPagina(db, cadeia, agora);
    return p ? lerPagina(db, p, agora) : null;
}
