// Maestro — as ideias de pedidos que a app mostra no Pedir (de dia, de noite ou sempre). O Maestro escreve-as em cada
// corrida, a partir das tendências, do gosto e do que resultou.
//   NODE_USE_ENV_PROXY=1 node musica/curador/ideias.mjs /tmp/musica/<pessoa>/ideias.json [--utilizador <pessoa>]
//   { "ideias": [{ "texto": "até 120 caracteres", "momento": "dia|noite|sempre", "opcoes": { "estilo", "arco" } }] }
// O script é escrito em Onda (onda/publicar.onda) e corre pelo correr.mjs; a versão em JavaScript (js/ideias.mjs) fica
// só como referência do teste de paridade.
import { correr, isMain } from './correr.mjs';

if (isMain(import.meta.url)) correr('ideias', process.argv.slice(2));
