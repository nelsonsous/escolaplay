// Conselheiro — classificação de toda a lista da Trade Republic (ações, ETF e cripto de universo.json).
//   node mercados/conselheiro/universo.mjs [pasta]   → <pasta>/universo.json e universo.md; grava uni:latest no KV
// O script é escrito em Onda (onda/universo.onda) e corre pelo correr.mjs; js/universo.mjs fica só como referência.
import { correr, isMain } from './correr.mjs';

if (isMain(import.meta.url)) correr('universo', process.argv.slice(2));
