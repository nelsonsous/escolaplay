// O Ecónomo — encher o catálogo de uma vez (volta 5). O cron do conector lê uma página de categoria a cada dois
// minutos (catalogo.js), o que chega para o manter em dia; para não esperar dias pelo primeiro, este script pede ao
// conector que leia já cada página da tabela pagina (/sonda/catalogo), as três cadeias em paralelo e com uma pausa
// entre pedidos à mesma cadeia. Primeiro as páginas de categoria, depois as de marca.
//   SONDA_TOKEN_FILE=… NODE_USE_ENV_PROXY=1 node compras/economo/catalogo.mjs [--so-categorias] [--pausa 2000]
import { readFileSync } from 'node:fs';
import { WORKER, d1, espera } from './comum.mjs';

const args = process.argv.slice(2);
const pausa = Number(args[args.indexOf('--pausa') + 1]) || 2000;
const segredo = (process.env.SONDA_TOKEN ?? readFileSync(process.env.SONDA_TOKEN_FILE, 'utf8')).trim();

const paginas = await d1(`SELECT url, cadeia FROM pagina WHERE visto IS NULL ${args.includes('--so-categorias') ? 'AND marca = 0' : ''} ORDER BY marca, tipo`);
const porCadeia = Object.groupBy(paginas, (p) => p.cadeia);
console.log('por ler:', Object.fromEntries(Object.entries(porCadeia).map(([c, ps]) => [c, ps.length])));
const total = { paginas: 0, produtos: 0, falhas: 0 };
await Promise.all(Object.values(porCadeia).map(async (ps) => {
    for (const p of ps) {
        const r = await fetch(`${WORKER}/sonda/catalogo?url=${encodeURIComponent(p.url)}`, { headers: { authorization: `Bearer ${segredo}` } });
        const b = await r.json().catch(() => ({}));
        total.paginas++;
        if (b.n) total.produtos += b.n; else { total.falhas++; console.log('sem produtos:', r.status, b.estado, p.url); }
        if (total.paginas % 50 === 0) console.log(JSON.stringify(total));
        await espera(pausa);
    }
}));
console.log('fim', JSON.stringify(total));
console.log(JSON.stringify(await d1('SELECT (SELECT count(*) FROM preco WHERE tipo IS NOT NULL) AS produtos, (SELECT count(*) FROM tipo WHERE n > 0) AS tipos')));
