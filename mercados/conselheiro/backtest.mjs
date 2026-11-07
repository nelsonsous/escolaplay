// Conselheiro — teste no passado das regras da análise (para afinar com evidência).
//   NODE_USE_ENV_PROXY=1 node mercados/conselheiro/backtest.mjs [anos=5] [euros_por_compra=90]
// O script é escrito em Onda (onda/backtest.onda) e corre pelo correr.mjs; js/backtest.mjs fica só como referência.
import { correr, isMain } from './correr.mjs';

if (isMain(import.meta.url)) correr('backtest', process.argv.slice(2));
