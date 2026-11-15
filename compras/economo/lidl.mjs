// O Lidl no catálogo (volta 12): o site do Lidl não é uma loja online, mas tem umas centenas de produtos com preço
// (532 no mapa do site, no índice da KV «indice:lidl»). Este script dá a cada um o tipo da base (pelas palavras do
// nome, comparando com os produtos das outras cadeias), lê a página pelo conector (que respeita o robots.txt) e grava
// o preço, a embalagem e o preço por quilo ou litro na tabela preco, como o catálogo das outras cadeias.
//   SONDA_TOKEN_FILE=… NODE_USE_ENV_PROXY=1 node economo/lidl.mjs [--so-tipos] [--pausa 2000] [--max 600]
//   --so-tipos: só mostra o tipo que daria a cada produto (não pede nada ao Lidl)
// Corre uma vez por semana (os preços do Lidl mudam à semana; o que não se relê sai das comparações ao fim de 10 dias).
import { d1, kvGetTexto, sonda } from './comum.mjs';
import { palavras } from '../proxy/src/sugerir.js';
import { guardarCatalogo } from '../proxy/src/catalogo.js';
import { lerProduto } from '../proxy/src/fontes/lidl.js';

const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(n) ? Number(args[args.indexOf(n) + 1]) || d : d);
const pausa = opt('--pausa', 2000), max = opt('--max', 600);
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

// o tipo pelo nome: cada palavra vota nos tipos onde aparece nos produtos das outras cadeias (mais quanto mais rara é a
// palavra e quanto mais concentrada num tipo); ganha o tipo com mais votos, se tiver clara vantagem
export function classificador(linhas) {
    const porPalavra = new Map(), total = new Map();
    for (const { nome, tipo } of linhas) {
        for (const w of new Set(palavras(nome))) {
            if (w.length < 3 || /^\d/.test(w)) continue;
            const m = porPalavra.get(w) ?? new Map();
            m.set(tipo, (m.get(tipo) ?? 0) + 1); porPalavra.set(w, m);
            total.set(w, (total.get(w) ?? 0) + 1);
        }
    }
    return (nome) => {
        const votos = new Map();
        for (const w of new Set(palavras(nome))) {
            const m = porPalavra.get(w);
            if (!m) continue;
            const n = total.get(w), idf = Math.log(1 + 200 / n);
            for (const [t, c] of m) votos.set(t, (votos.get(t) ?? 0) + (c / n) * idf);
        }
        // só conta um tipo cujas palavras estão todas no nome (o «vinho-branco» precisa de «vinho» e «branco»; o
        // «iogurtes» de «iogurte»): sem isto, o kiwi ia para os iogurtes e o pão de Deus para o vinho branco
        const nw = palavras(nome);
        const tem = (k) => palavras(k.replace(/-/g, ' ')).every((kw) => nw.some((w) => w === kw || (kw.length > 4 && w.startsWith(kw.slice(0, kw.length - 2)))));
        const [a, b] = [...votos].filter(([t]) => tem(t)).sort((x, y) => y[1] - x[1]);
        if (!a || a[1] < 0.5 || (b && b[1] > a[1] * 0.8)) return null;
        return a[0];
    };
}
// o que o Lidl vende no site e não é de supermercado (bricolage, casa, roupa, animais, plantas): fica de fora
// (e os preparados: rissóis, croquetes, folhados, alheiras, pizzas, tábuas, que não são o tipo do ingrediente)
export const FORA = /^(parkside|livarno|esmara|crivit|lupilu|silvercrest|tronic|auriol|florabest|ultimate-speed|pepperts|ernesto|miomare|melinera|powerfix|meradiso|playtive|max-mila|max-s-world|zoofari|bellarom-maquina)|ramo-de|crisantemo|sansevieria|orquidea|planta|vaso|para-cao|para-gato|calendario|rosas|flores|maquina|limpeza|rissois|croquete|folhado|alheira|tabua|gratinado|massa-quebrada|farinha-lactea|bola-de|pizza-com/;

const titulo = (s) => String(s ?? '').toLowerCase().replace(/(^|\s)\S/g, (l) => l.toUpperCase());

async function main() {
    const texto = await kvGetTexto('indice:lidl');
    const lidl = texto.split('\n').filter((l) => l && !l.startsWith('#')).map((l) => { const [slug, id] = l.split('\t'); return { slug, id }; });
    const base = await d1(`SELECT nome, tipo FROM preco WHERE cadeia IN ('continente', 'pingodoce', 'auchan') AND tipo IS NOT NULL AND suspeito IS NULL`);
    const tipoDe = classificador(base);
    const comTipo = lidl.filter((p) => !FORA.test(p.slug)).map((p) => ({ ...p, tipo: tipoDe(p.slug.replace(/-/g, ' ')) })).filter((p) => p.tipo).slice(0, max);
    console.log(`${lidl.length} produtos no índice do Lidl; ${comTipo.length} com tipo`);
    if (args.includes('--so-tipos')) {
        for (const p of comTipo) console.log(`${p.tipo.padEnd(24)} ${p.slug}`);
        return;
    }
    // a D1 pela API, com a forma que o catálogo usa (prepare/bind e batch)
    const db = { prepare: (sql) => { const f = { sql, p: [], bind: (...a) => { f.p = a; return f; } }; return f; },
        batch: async (fs) => { for (const f of fs) await d1(f.sql, f.p); return []; } };
    let lidos = 0, falhas = 0;
    const porTipo = new Map();
    for (const p of comTipo) {
        const url = `https://www.lidl.pt/p/${p.slug}/p${p.id}`;
        try {
            const r = await sonda(url);
            const pr = r.estado === 200 ? lerProduto(r.corpo.toString('utf8'), url) : null;
            if (pr?.preco) {
                // o nome do Lidl vem sem a marca («Vinho Tinto»): junta-se a marca («Amigos De Pias Vinho Tinto»)
                const mc = /[a-z]/i.test(pr.marca ?? '') ? pr.marca : null; // («-» não é marca)
                const nome = mc && !palavras(pr.nome).includes(palavras(mc)[0]) ? `${titulo(mc)} ${pr.nome}` : pr.nome;
                const x = { id: pr.id ?? p.id, url, nome, marca: mc, preco: pr.preco, emb: pr.embalagem, precoUnidade: pr.precoUnidade };
                (porTipo.get(p.tipo) ?? porTipo.set(p.tipo, []).get(p.tipo)).push(x);
                lidos++;
            } else falhas++;
        } catch (e) { falhas++; console.log('falhou', url, e.message); }
        await espera(pausa);
    }
    for (const [k, ps] of porTipo) await guardarCatalogo(db, 'lidl', k, ps);
    console.log(JSON.stringify({ lidos, falhas, tipos: porTipo.size }));
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
