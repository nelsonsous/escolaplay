// Uma amostra dos dados reais da D1 (os tipos todos e os produtos de 20 tipos, as notas dos vinhos, as lojas online e o
// histórico), para as capturas da app (tests/capturas.mjs): NODE_USE_ENV_PROXY=1 node economo/amostra.mjs <ficheiro.json>
import { d1 } from './comum.mjs';
import { writeFileSync } from 'node:fs';
const out = process.argv[2];
const ks = ['agua-sem-gas', 'leite', 'vinho-tinto', 'carne-picada', 'rolos-de-cozinha', 'pizza', 'croissants', 'pao-do-dia', 'azeite', 'arroz', 'ovos', 'bacalhau', 'frango', 'cafe-capsulas', 'detergente-roupa', 'papel-higienico', 'manteiga', 'massa', 'atum', 'peixe-fresco'];
const tipo = await d1('SELECT * FROM tipo');
const preco = [];
for (const k of ks) preco.push(...await d1('SELECT * FROM preco WHERE tipo = ? AND cent IS NOT NULL', [k]));
const nota = await d1('SELECT * FROM vinho_nota');
const prod = await d1("SELECT * FROM produtor_artigo WHERE tipo IN ('vinho-tinto', 'bacalhau', 'azeite')");
const hist = await d1("SELECT h.* FROM preco_historico h JOIN preco p ON p.cadeia = h.cadeia AND p.id = h.id WHERE p.tipo IN ('leite', 'agua-sem-gas', 'azeite', 'arroz')");
writeFileSync(out, JSON.stringify({ tipo, preco, nota, prod, hist }));
console.log(tipo.length, preco.length, nota.length, prod.length, hist.length);
