// As notas dos vinhos (volta 11): grava na D1 (tabela vinho_nota) o que o Ecónomo recolheu na web — as notas dos
// críticos e as medalhas dos concursos, com a fonte e a ligação — e mostra os vinhos que ainda não têm nota.
//   node economo/notas.mjs gravar <ficheiro.json> [...]   um array [{ palavras, fora, nome, fontes: [{ fonte, tipo, valor, colheita, url }] }]
//   node economo/notas.mjs falta [--n 40]                 os rótulos à venda (4,50 € a 35 €) sem nota, das cadeias com mais
// A nota calcula-se em proxy/src/notas.js (um crítico vale mais do que uma medalha); sem fontes, não se grava nada.
import { readFileSync } from 'node:fs';
import { d1, d1Linhas } from './comum.mjs';
import { notaDasFontes, prepararNotas, notaDoProduto } from '../proxy/src/notas.js';
import { palavras } from '../proxy/src/sugerir.js';

const [acao, ...resto] = process.argv.slice(2);

if (acao === 'gravar') {
    const agora = new Date().toISOString();
    const linhas = [];
    for (const f of resto) {
        for (const v of JSON.parse(readFileSync(f, 'utf8'))) {
            const fontes = (v.fontes ?? []).filter((x) => x && x.fonte && x.valor && /^https?:\/\//.test(String(x.url ?? '')));
            const n = notaDasFontes(fontes);
            const chave = palavras(v.palavras).join(' ');
            if (!n || !chave) continue;
            linhas.push([chave, palavras(v.fora ?? '').join(' '), String(v.nome ?? v.palavras).slice(0, 120), n.nota, n.n, n.resumo.slice(0, 160),
                JSON.stringify(fontes.map(({ fonte, tipo, valor, colheita, url }) => ({ fonte, tipo, valor, colheita: colheita ?? null, url }))), agora]);
        }
    }
    await d1Linhas('INSERT INTO vinho_nota (palavras, fora, nome, nota, n, resumo, fontes, visto)', linhas,
        'ON CONFLICT (palavras) DO UPDATE SET fora = excluded.fora, nome = excluded.nome, nota = excluded.nota, n = excluded.n, resumo = excluded.resumo, fontes = excluded.fontes, visto = excluded.visto');
    console.log(`gravadas ${linhas.length} notas`);
    for (const l of linhas.sort((a, b) => b[3] - a[3])) console.log(`  ${l[3]}  ${l[2]}  (${l[5]})`);
} else if (acao === 'falta') {
    const max = Number(resto[resto.indexOf('--n') + 1]) || 40;
    const notas = prepararNotas(await d1('SELECT palavras, fora, nota, resumo FROM vinho_nota'));
    const ps = await d1(`SELECT cadeia, nome, cent FROM preco WHERE tipo IN ('vinho-tinto', 'vinho-branco') AND suspeito IS NULL AND cent BETWEEN 450 AND 3500`);
    const sem = new Map();
    for (const p of ps) {
        if (notaDoProduto(notas, p.nome)) continue;
        const k = palavras(p.nome).filter((w) => !/^\d/.test(w) && !['vinho', 'cl', 'ml'].includes(w)).join(' ');
        const x = sem.get(k) ?? { exemplo: p.nome, cent: p.cent, cadeias: new Set() };
        x.cadeias.add(p.cadeia); sem.set(k, x);
    }
    const lista = [...sem.values()].sort((a, b) => b.cadeias.size - a.cadeias.size || b.cent - a.cent).slice(0, max);
    console.log(JSON.stringify(lista.map((x) => ({ exemplo: x.exemplo, cent: x.cent, cadeias: x.cadeias.size })), null, 1));
    console.log(`${sem.size} rótulos sem nota; ${notas.length} notas na base`);
} else {
    console.error('uso: node economo/notas.mjs gravar <ficheiro.json> | falta [--n 40]');
    process.exit(2);
}
