// Conselheiro — análises curtas para as outras apps que ligaram a análise do Claude (cada uma só dos seus ativos).
//   node mercados/conselheiro/outros.mjs dados [pasta]      → <pasta>/outros.json e outros.md (uma secção por app: A1, A2…)
//   node mercados/conselheiro/outros.mjs publicar <ficheiro> → valida e grava ua:<id> de cada app e cfg:lastRun (contas para o dono)
// O script é escrito em Onda (onda/outros.onda) e corre pelo correr.mjs; js/outros.mjs fica só como referência.
import { correr, isMain } from './correr.mjs';

if (isMain(import.meta.url)) correr('outros', process.argv.slice(2));
