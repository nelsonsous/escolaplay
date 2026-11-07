// Conselheiro — junta tudo o que o Claude precisa para a análise do dia: TODOS os ativos que a app mostra.
//   node mercados/conselheiro/dados.mjs [pasta]
//     → <pasta>/dados.json (tudo), dados.md (resumo compacto, uma linha por ativo) e modelo.json (esqueleto da análise)
// O script é escrito em Onda (onda/dados.onda, com onda/comum.onda e onda/js.onda) e corre pelo correr.mjs; a
// versão em JavaScript (js/dados.mjs) fica só como referência dos testes de paridade.
import { correr, isMain } from './correr.mjs';

if (isMain(import.meta.url)) correr('dados', process.argv.slice(2));
