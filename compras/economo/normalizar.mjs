// Uma vez (volta 6, preços comparáveis): corrige os preços já guardados na D1 com as regras de normaliza (precos.js):
// ao balcão e ao peso paga-se a porção; com a embalagem em peso ou volume, o preço é por quilo ou por litro; as
// embalagens escrevem-se igual («150 g», não «0,15 kg»). Daqui em diante o catálogo e o cron já guardam assim.
// Não se corre duas vezes: ao balcão, a segunda vez dividiria outra vez a porção. Uso: node economo/normalizar.mjs [--sem-gravar]
import { d1 } from './comum.mjs';
import { normaliza, medida, rotulo } from '../proxy/src/precos.js';

const gravar = !process.argv.includes('--sem-gravar');
// só as linhas guardadas antes de o conector novo estar publicado (as outras já vêm certas)
const antes = process.argv[process.argv.indexOf('--antes') + 1] ?? new Date().toISOString();
let depois = 0, vistos = 0;
const mudar = [];
for (;;) {
    const linhas = await d1('SELECT rowid AS r, cadeia, nome, cent, antes, emb, uc, ub FROM preco WHERE rowid > ? AND cent IS NOT NULL AND (visto IS NULL OR visto < ?) ORDER BY rowid LIMIT 2000', [depois, antes]);
    if (!linhas.length) break;
    for (const l of linhas) {
        vistos++;
        const m = medida(l.emb) ?? medida(l.nome);
        const n = normaliza({ cadeia: l.cadeia, nome: l.nome, cent: l.cent, uc: l.uc, ub: l.ub, m });
        const emb = rotulo(l.emb) ?? l.emb ?? n.emb ?? null;
        const antes = l.antes != null && n.cent !== l.cent ? Math.round(l.antes * n.cent / l.cent) : l.antes;
        if (n.cent !== l.cent || n.uc !== l.uc || n.ub !== l.ub || emb !== l.emb) mudar.push([n.cent, antes, n.uc, n.ub, emb, l.r, l]);
    }
    depois = linhas.at(-1).r;
}
console.log(`vistos ${vistos}, a mudar ${mudar.length}`);
for (const x of mudar.slice(0, 6)) console.log(x[6].cadeia, x[6].nome, `${x[6].cent}→${x[0]}`, `${x[6].uc}/${x[6].ub}→${x[2]}/${x[3]}`, `${x[6].emb}→${x[4]}`);
if (gravar) {
    for (let i = 0; i < mudar.length; i += 1) {
        const [c, a, uc, ub, emb, r] = mudar[i];
        await d1('UPDATE preco SET cent = ?, antes = ?, uc = ?, ub = ?, emb = ? WHERE rowid = ?', [c, a, uc, ub, emb, r]);
        if (i % 500 === 499) console.log(i + 1);
    }
    console.log('gravado');
}
