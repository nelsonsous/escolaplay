// Os dados da análise de uma casa (volta 15): a lista com o que se pesquisou, os filtros e as escolhas (à mão ou pela
// app), os preços de cada cadeia com a variação recente, os totais, as lojas online e as promoções do folheto do Lidl.
// É o que o Claude lê para dizer como fazer as compras (a análise a pedido, na volta 16).
//   SONDA_TOKEN_FILE=… node economo/analise.mjs <código da casa> [--resumo]
import { analise } from './comum.mjs';

const [codigo] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!codigo) { console.error('uso: node economo/analise.mjs <código da casa> [--resumo]'); process.exit(2); }
const d = await analise(codigo);
if (!process.argv.includes('--resumo')) { console.log(JSON.stringify(d, null, 1)); process.exit(0); }
const eur = (c) => (c / 100).toFixed(2).replace('.', ',') + ' €';
console.log(`Casa: ${d.casa.pessoas ?? '?'} pessoas · ${d.casa.local ?? d.casa.cp ?? 'sem local'} · ${d.coisas} coisas`);
for (const [c, t] of Object.entries(d.totais)) console.log(`  ${t.nome}: ${eur(t.cent)} (${t.coisas} coisas)`);
for (const i of d.itens) {
    const ps = Object.entries(i.produtos).map(([c, p]) => `${c} ${eur(p.cent)}${p.mudou ? ` (${p.mudou.para < p.mudou.de ? '↓' : '↑'} de ${eur(p.mudou.de)})` : ''}`).join(' · ');
    console.log(`- ${i.quantidade}× ${i.texto} [${i.escolha}${i.pesquisa ? `, pesquisou «${i.pesquisa}»` : ''}${i.filtros.length ? `, filtros: ${i.filtros.join(', ')}` : ''}] ${ps}${i.online ? ` · online: ${i.online.map((o) => `${o.loja} ${eur(o.cent)}`).join(', ')}` : ''}${i.lidl_folheto ? ` · folheto Lidl: ${i.lidl_folheto.length}` : ''}`);
}
