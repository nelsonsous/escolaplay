// Maestro — passo 1: o que cada pessoa ouve, os pedidos à espera, a playlist da semana, as novidades, as mixes do
// Tidal e o que o Maestro já fez.
//   NODE_USE_ENV_PROXY=1 node musica/curador/dados.mjs [/tmp/musica]
// Grava <dir>/dados.md (uma secção por pessoa) e <dir>/<pessoa>/perfil.json (o do dono também em <dir>/perfil.json).
// O script é escrito em Onda (onda/dados.onda) e corre pelo correr.mjs; a versão em JavaScript (js/dados.mjs) fica
// só como referência do teste de paridade.
import { correr, isMain } from './correr.mjs';

if (isMain(import.meta.url)) correr('dados', process.argv.slice(2));
