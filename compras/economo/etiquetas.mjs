// A revisão das etiquetas do talho e da peixaria (proxy/src/etiquetas.js), para o Ecónomo correr de semana a semana:
// lista os produtos que ficaram sem corte nem animal, ou sem uso, para se acrescentarem regras (os nomes novos que as
// cadeias inventam). Uso: node economo/etiquetas.mjs
import { d1 } from './comum.mjs';
import { etiquetas, TALHO } from '../proxy/src/etiquetas.js';

const linhas = await d1(`SELECT tipo, nome FROM preco WHERE cent IS NOT NULL AND tipo IN (${[...TALHO].map(() => '?').join(', ')})`, [...TALHO]);
const falta = new Map();
let com = 0;
for (const { tipo, nome } of linhas) {
    const e = etiquetas(nome, tipo);
    if (e && (e.corte || e.animal) && e.usos.length) { com++; continue; }
    falta.set(nome, `${tipo}: ${nome} → ${e?.corte ?? '-'} / ${e?.animal ?? '-'} / ${e?.usos?.join(',') || '-'}`);
}
console.log(`${linhas.length} produtos; ${com} com corte ou animal e uso; por rever: ${falta.size}`);
for (const l of [...falta.values()].sort()) console.log(l);
