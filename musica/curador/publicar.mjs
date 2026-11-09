// Maestro — último passo: valida a proposta do Claude, encontra as faixas no Tidal, deixa o motor escolher e ordenar,
// e cria a playlist na tua conta (e na biblioteca da app).
//   NODE_USE_ENV_PROXY=1 node musica/curador/publicar.mjs /tmp/musica/<pessoa>/proposta.json [--utilizador <pessoa>] [--pedido <id>] [--modelo <id>]
//        [--ensaio] (não grava nada) [--sem-tidal] (só na biblioteca da app) [--aceitar-menos]
// O script é escrito em Onda (onda/publicar.onda, com o motor de curadoria) e corre pelo correr.mjs; a versão em
// JavaScript (js/publicar.mjs) fica só como referência do teste de paridade.
import { correr, isMain } from './correr.mjs';

if (isMain(import.meta.url)) correr('publicar', process.argv.slice(2));
