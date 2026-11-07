// Conselheiro — valida a análise escrita pelo Claude e grava-a na base de dados (KV).
//   node mercados/conselheiro/publicar.mjs /tmp/conselheiro/analise.json [/tmp/conselheiro/dados.json]
// Grava advice:<data>, advice:latest e advice:lessons. A app lê-a em /advice.
// O script é escrito em Onda (onda/publicar.onda) e corre pelo correr.mjs; js/publicar.mjs fica só como referência
// (e dá o buildAdvice aos testes da app, que montam com ele uma análise de exemplo).
import { correr, isMain } from './correr.mjs';

export let buildAdvice, MAX_EXTRA;
if (isMain(import.meta.url)) correr('publicar', process.argv.slice(2));
else ({ buildAdvice, MAX_EXTRA } = await import('./js/publicar.mjs'));
