// O folheto da semana do Lidl (volta 12). O site do Lidl só tem uns centos de produtos com preço; o resto do sortido
// em promoção está nos folhetos, que a app do folheto lê do serviço de folhetos do grupo (endpoints.leaflets.schwarz,
// sem robots.txt; a página dos folhetos do lidl.pt deixa). O folheto não traz os preços em dados: só as imagens das
// páginas (e as palavras de cada uma). O Ecónomo (o Claude) lê as imagens e escreve as promoções num JSON; este script
// descarrega as páginas e grava o que o Ecónomo leu.
//   SONDA_TOKEN_FILE=… NODE_USE_ENV_PROXY=1 node economo/lidl-folheto.mjs baixar <pasta>
//       os folhetos de promoções (semanais e de fim de semana) → <pasta>/<folheto>/pagina-NN.jpg e <pasta>/folhetos.json
//   NODE_USE_ENV_PROXY=1 node economo/lidl-folheto.mjs gravar <promocoes.json> [...]
//       [{ folheto, pagina, nome, preco, antes?, emb?, uc?, ub?, plus?, ate, desde? }] → a tabela preco (cadeia lidl)
// As promoções com Lidl Plus levam «(Lidl Plus)» no nome: o preço é com o cartão.
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { d1, sonda } from './comum.mjs';
import { classificador, porSinonimo, FORA } from './lidl.mjs';
import { porUnidade, medida, normaliza, rotulo } from '../proxy/src/precos.js';

const PAGINA_FOLHETOS = 'https://www.lidl.pt/c/folhetos/s10020672';
const API = (id) => `https://endpoints.leaflets.schwarz/v4/flyer?flyer_identifier=${encodeURIComponent(id)}&region_id=0`;
// só os folhetos de supermercado (os especiais são de bricolage, brinquedos, decoração…)
export const DE_PROMOCOES = /^promocoes-(semanais|fim-de-semana)-/;
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

// os identificadores dos folhetos na página dos folhetos do Lidl
export const folhetosDaPagina = (html) => [...new Set([...String(html).matchAll(/\/l\/pt\/folhetos\/([a-z0-9-]+)\//g)].map((m) => m[1]))];

// o id de uma promoção do folheto: o número do artigo («nº80533»), se o Ecónomo o leu; senão o nome
// (com Lidl Plus, «p» no fim: o mesmo artigo pode ter o preço normal e o do cartão)
export const idPromocao = (p) => `f${p.numero ? String(p.numero).replace(/\D/g, '') : createHash('sha1').update(`${p.folheto}|${p.nome}`).digest('hex').slice(0, 10)}${p.plus ? 'p' : ''}`;

// uma promoção lida → a linha da tabela preco (o preço em cêntimos, o preço por unidade, a embalagem)
export function linhaDaPromocao(p, tipo, agora) {
    const nome = `${String(p.nome).trim()}${p.plus ? ' (Lidl Plus)' : ''}`.slice(0, 160);
    const pu = p.uc && p.ub ? { uc: Math.round(p.uc * 100), ub: String(p.ub).toLowerCase() } : porUnidade({ preco: p.preco, embalagem: p.emb, nome: p.nome });
    const m = medida(p.emb) ?? medida(p.nome);
    const { cent, uc, ub } = normaliza({ cadeia: 'lidl', nome, cent: Math.round(p.preco * 100), uc: pu.uc, ub: pu.ub, m });
    const antes = p.antes ? Math.round(p.antes * 100) : null;
    return { id: idPromocao(p), nome, cent, antes: antes && antes > cent ? antes : null, emb: rotulo(p.emb) ?? p.emb ?? null, uc, ub, q: m?.q ?? null,
        tipo, url: `https://www.lidl.pt/l/pt/folhetos/${p.folheto}/view/flyer/page/${p.pagina ?? 1}`, ate: p.ate ?? null, visto: agora };
}

async function baixar(pasta) {
    const pag = await sonda(PAGINA_FOLHETOS);
    const ids = folhetosDaPagina(pag.corpo.toString('utf8')).filter((id) => DE_PROMOCOES.test(id));
    const lista = [];
    for (const id of ids) {
        const r = await sonda(API(id));
        const f = JSON.parse(r.corpo.toString('utf8')).flyer;
        if (!f) continue;
        const dir = path.join(pasta, id);
        mkdirSync(dir, { recursive: true });
        const paginas = [];
        for (const p of f.pages ?? []) {
            const ficheiro = path.join(dir, `pagina-${String(p.number).padStart(2, '0')}.jpg`);
            const img = await sonda(p.image);
            writeFileSync(ficheiro, img.corpo);
            paginas.push({ n: p.number, ficheiro, palavras: p.keyWords ?? '' });
            await espera(500);
        }
        lista.push({ folheto: id, titulo: `${f.name} ${f.title}`, desde: f.offerStartDate, ate: f.offerEndDate, paginas });
        console.log(`${id}: ${paginas.length} páginas (${f.offerStartDate} a ${f.offerEndDate})`);
    }
    writeFileSync(path.join(pasta, 'folhetos.json'), JSON.stringify(lista, null, 1));
}

async function gravar(ficheiros) {
    const base = await d1(`SELECT nome, tipo FROM preco WHERE cadeia IN ('continente', 'pingodoce', 'auchan') AND tipo IS NOT NULL AND suspeito IS NULL`);
    const tipoDe = classificador(base);
    const agora = new Date().toISOString();
    const linhas = [];
    let sem = 0;
    for (const f of ficheiros) {
        for (const p of JSON.parse(readFileSync(f, 'utf8'))) {
            if (!p?.nome || !(p.preco > 0)) continue;
            const slug = String(p.nome).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            if (FORA.test(slug)) continue;
            const tipo = tipoDe(slug.replace(/-/g, ' ')) ?? porSinonimo(slug);
            if (!tipo) { sem++; continue; }
            linhas.push(linhaDaPromocao(p, tipo, agora));
        }
    }
    for (const l of linhas) {
        await d1(`INSERT INTO preco (cadeia, id, url, nome, marca, cent, antes, emb, uc, ub, q, tipo, propria, ate, visto, tentado, falhas)
            VALUES ('lidl', ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 0)
            ON CONFLICT (cadeia, id) DO UPDATE SET url = excluded.url, nome = excluded.nome, cent = excluded.cent, antes = excluded.antes,
                emb = excluded.emb, uc = excluded.uc, ub = excluded.ub, q = excluded.q, tipo = excluded.tipo, ate = excluded.ate,
                visto = excluded.visto, tentado = excluded.tentado, falhas = 0`,
        [l.id, l.url, l.nome, l.cent, l.antes, l.emb, l.uc, l.ub, l.q, l.tipo, l.ate, l.visto, l.visto]);
    }
    console.log(JSON.stringify({ gravadas: linhas.length, sem_tipo: sem }));
    for (const l of linhas) console.log(`  ${l.tipo.padEnd(22)} ${(l.cent / 100).toFixed(2).padStart(6)} €${l.uc ? ` (${(l.uc / 100).toFixed(2)} €/${l.ub})` : ''}  ${l.nome}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const [acao, ...resto] = process.argv.slice(2);
    if (acao === 'baixar' && resto[0]) await baixar(resto[0]);
    else if (acao === 'gravar' && resto.length) await gravar(resto);
    else { console.error('uso: node economo/lidl-folheto.mjs baixar <pasta> | gravar <promocoes.json> [...]'); process.exit(2); }
}
