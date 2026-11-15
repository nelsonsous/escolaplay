// O Ecónomo — as lojas SPAR (volta 6): lê a página das lojas do SPAR pelo conector (src/lojas.js, lerLojasSpar) e
// grava a lista na KV (lojas:spar), para a casa escolher a sua loja. Uma vez por mês chega.
//   SONDA_TOKEN_FILE=… NODE_USE_ENV_PROXY=1 node compras/economo/lojas.mjs [--sem-gravar]
import { lerLojasSpar } from '../proxy/src/lojas.js';
import { sonda, kvPutTexto } from './comum.mjs';

const { estado, corpo } = await sonda('https://www.spar.pt/loja/resumo');
if (estado !== 200) throw new Error(`HTTP ${estado}`);
const lojas = lerLojasSpar(corpo.toString('utf8'));
console.log(`${lojas.length} lojas SPAR; ex.: ${JSON.stringify(lojas[0])}`);
if (lojas.length < 50) throw new Error('poucas lojas: a página mudou?');
if (!process.argv.includes('--sem-gravar')) { await kvPutTexto('lojas:spar', JSON.stringify(lojas)); console.log('gravado em lojas:spar'); }
