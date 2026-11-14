// O Ecónomo — o índice para procurar produtos (volta 2): lê os mapas do site de cada cadeia pelo conector, faz o texto
// de cada uma (compras/proxy/src/indice.js) e grava-o na KV (indice:<cadeia>). Uma vez por semana chega: os produtos
// mudam devagar. Um pedido de cada vez, com uma pausa entre eles.
//   NODE_USE_ENV_PROXY=1 node compras/economo/indice.mjs [--sem-gravar] [--cadeia continente] [--pasta /tmp/indice]
// (--pasta: guarda também o texto de cada cadeia num ficheiro, para ver ou experimentar)
import { writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { montarIndice, vocabulario, CADEIAS } from '../proxy/src/indice.js';
import { sonda, kvPutTexto, espera } from './comum.mjs';

const MAPAS = {
    continente: 'https://www.continente.pt/sitemap_index.xml',
    pingodoce: 'https://www.pingodoce.pt/home/sitemap_index.xml',
    auchan: 'https://www.auchan.pt/sitemap_index.xml',
    lidl: 'https://www.lidl.pt/static/sitemap.xml',
};
// dos mapas que o índice lista, só os de produtos
const DE_PRODUTOS = /(-product\.xml|product_sitemap\.xml\.gz)$/;

const locs = (xml) => [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, '&'));
async function xml(url) {
    const { estado, corpo } = await sonda(url, { accept: 'application/xml,text/xml;q=0.9,*/*;q=0.8' });
    if (estado !== 200) throw new Error(`HTTP ${estado} em ${url}`);
    return (corpo[0] === 0x1f && corpo[1] === 0x8b ? gunzipSync(corpo) : corpo).toString('utf8');
}

const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const gravar = !process.argv.includes('--sem-gravar');
// o Continente no fim: fica só com os tipos de produto que o Pingo Doce e o Auchan vendem (o vocabulário)
const ORDEM = ['pingodoce', 'auchan', 'lidl', 'continente'];
const lista = arg('--cadeia') ? [arg('--cadeia')] : ORDEM.filter((c) => CADEIAS.includes(c));
const feitos = {};

async function urlsDe(cadeia) {
    const mapas = locs(await xml(MAPAS[cadeia])).filter((u) => DE_PRODUTOS.test(u));
    const urls = [];
    for (const m of mapas) {
        await espera(1500);
        const us = locs(await xml(m));
        urls.push(...us);
        console.log(`  ${cadeia}: ${m} → ${us.length} endereços`);
    }
    return urls;
}

for (const cadeia of lista) {
    const urls = await urlsDe(cadeia);
    let voc;
    if (cadeia === 'continente') {
        for (const c of ['pingodoce', 'auchan']) feitos[c] ??= montarIndice(c, await urlsDe(c));
        voc = vocabulario(feitos.pingodoce, feitos.auchan);
    }
    const texto = montarIndice(cadeia, urls, { vocabulario: voc });
    feitos[cadeia] = texto;
    const n = texto.split('\n').filter((l) => l && l[0] !== '#').length;
    console.log(`${cadeia}: ${n} produtos de ${urls.length} endereços, ${(Buffer.byteLength(texto) / 1e6).toFixed(2)} MB`);
    if (arg('--pasta')) writeFileSync(`${arg('--pasta')}/indice-${cadeia}.txt`, texto);
    if (gravar) { await kvPutTexto(`indice:${cadeia}`, texto); console.log(`  gravado em indice:${cadeia}`); }
    await espera(1500);
}
