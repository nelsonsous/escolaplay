// A análise das compras (voltas 15 e 16). Os dados de uma casa: a lista com o que se pesquisou, os filtros e as
// escolhas (à mão ou pela app), os preços de cada cadeia com a variação recente, os totais, as lojas online e as
// promoções do folheto do Lidl. A tarefa «Compras — análise a pedido» usa-o assim:
//   SONDA_TOKEN_FILE=… node economo/analise.mjs pendentes              os pedidos à espera: [{ id, codigo, pergunta }]
//   SONDA_TOKEN_FILE=… node economo/analise.mjs dados <pedido>         os dados da casa do pedido, com a pergunta
//   SONDA_TOKEN_FILE=… node economo/analise.mjs gravar <pedido> <f>   grava o resultado (JSON, o formato em README)
//   SONDA_TOKEN_FILE=… node economo/analise.mjs <código> [--resumo]   os dados de uma casa pelo código
import { readFileSync } from 'node:fs';
import { analise, sondaJson } from './comum.mjs';

const [acao, a1, a2] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const eur = (c) => (c / 100).toFixed(2).replace('.', ',') + ' €';
if (!acao) { console.error('uso: node economo/analise.mjs pendentes | dados <pedido> | gravar <pedido> <ficheiro.json> | <código> [--resumo]'); process.exit(2); }
if (acao === 'pendentes') {
    console.log(JSON.stringify((await sondaJson('/sonda/analise/pendentes')).pendentes, null, 1));
} else if (acao === 'dados' && a1) {
    console.log(JSON.stringify(await sondaJson(`/sonda/analise?pedido=${encodeURIComponent(a1)}`), null, 1));
} else if (acao === 'gravar' && a1 && a2) {
    const r = await sondaJson('/sonda/analise/resultado', { id: a1, resultado: JSON.parse(readFileSync(a2, 'utf8')) });
    console.log('gravado:', JSON.stringify(r.resultado).slice(0, 300));
} else {
    const d = await analise(acao);
    if (!process.argv.includes('--resumo')) { console.log(JSON.stringify(d, null, 1)); process.exit(0); }
    console.log(`Casa: ${d.casa.pessoas ?? '?'} pessoas · ${d.casa.local ?? d.casa.cp ?? 'sem local'} · ${d.coisas} coisas`);
    for (const [, t] of Object.entries(d.totais)) console.log(`  ${t.nome}: ${eur(t.cent)} (${t.coisas} coisas)`);
    for (const i of d.itens) {
        const ps = Object.entries(i.produtos).map(([c, p]) => `${c} ${eur(p.cent)}${p.mudou ? ` (${p.mudou.para < p.mudou.de ? '↓' : '↑'} de ${eur(p.mudou.de)})` : ''}`).join(' · ');
        console.log(`- ${i.quantidade}× ${i.texto} [${i.escolha}${i.pesquisa ? `, pesquisou «${i.pesquisa}»` : ''}${i.filtros.length ? `, filtros: ${i.filtros.join(', ')}` : ''}] ${ps}${i.online ? ` · online: ${i.online.map((o) => `${o.loja} ${eur(o.cent)}`).join(', ')}` : ''}${i.lidl_folheto ? ` · folheto Lidl: ${i.lidl_folheto.length}` : ''}`);
    }
}
