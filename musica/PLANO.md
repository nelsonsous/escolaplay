# Música — plano das dez voltas

O pedido: rever a app a fundo, em dez voltas seguidas. Primeiro planear, depois executar. Tudo simples, fluido e
fácil de usar e de afinar; sem perder o que já faz; em Onda, com a biblioteca nova; pronta para a App Store; para já
com o Claude e o Worker, mas a pensar em ter isto mais ágil.

Cada volta é um pedaço que se pode usar: um PR com testes, a versão sobe, e a app continua a funcionar.

## A revisão: o que está mal hoje e o que passa a ser

| O que perguntaste | Como está hoje | Como fica |
|---|---|---|
| «Em vez de apanhar uma música, ser substituir» | «Mais como esta» cria **outra** playlist. O ✕ («Não esta») só marca a faixa: o Maestro refaz a playlist horas depois. Não há maneira de trocar uma faixa na hora. | **Trocar (⇄)** em cada faixa: a app escolhe a melhor substituta (das candidatas que o Maestro deixou e das parecidas do Tidal), mostra-a no mesmo sítio e grava logo no Tidal. Se não gostares, tocas outra vez e vem a seguinte. |
| «Porque não envia sempre para o Tidal e é revisto depois?» | O Maestro deixa duas ou três propostas na app. Tens de as abrir, escolher uma e enviá-la. | **Uma playlist por pedido, logo no Tidal.** Rever é depois, na app: trocar faixas, mudar o estilo, afinar. As «variantes» deixam de ser playlists à parte e passam a ser o botão **Estilo** da playlist. |
| «Porque num lado da playlist dá para fazer uma coisa e nos pedidos outra?» | Há três sítios com coisas diferentes: a folha (ouvir 30 s, ✕, afinar com o Maestro), a vista «Abrir» (mudar o nome, apagar, fixar e tirar faixas, atualizar sozinha) e a lista dos pedidos (cancelar). | **Um só sítio: a folha da playlist**, com tudo. A vista «Abrir» desaparece. Os pedidos à espera aparecem na lista das playlists, como cartões, e o separador «Pedir» fica só para pedir. |
| «O separador do que há no Tidal não traz muito valor» | «Gosto» mostra tendências, barras do teu gosto, favoritas e as playlists do Tidal. Olha-se uma vez. | **Três separadores: Música · Pedir · Ajustes.** O teu gosto fica num cartão dos Ajustes, que se abre quando quiseres. |
| «Detalhe por música faz sentido?» | Cada faixa mostra ano, género, BPM, tom, duração, o porquê e os pontos. | Não faz. A linha fica com **capa, título, artista, ouvir e trocar**. Os números do motor ficam só para quem abrir o afinador. |
| «Fácil de afinar» | O afinador tem estilo, arco, n.º de faixas, máximo por artista, fixar, tirar, procurar e juntar, noutra vista. | **Afinar na folha, com quatro botões** (Estilo, Energia, N.º de faixas, Máx. por artista) e um **gráfico da energia** desenhado em Onda. O resultado vê-se na hora (o motor corre no telemóvel) e grava-se no Tidal. Afinar por palavras continua a ir ao Maestro. |
| «Em Onda, com as novas bibliotecas; melhora o Onda» | A app estava no estilo antigo, com a biblioteca antiga. | Volta 1 (feita): Onda fluida, biblioteca nova e uma melhoria da própria linguagem (o molde com nome). Os gráficos em Onda vêm na volta 4; os scripts do Maestro na 10. |
| «Preparar para a loja da Apple, sem perder funcionalidades» | A app nativa de teste abre o site. A Apple recusa apps que são só um site. | Voltas 8 e 9: a app vai **dentro** da app (abre sem rede), o login do Tidal volta à app, apagar a conta, privacidade e apoio, avisos nativos, e o que a loja pede (textos, ecrãs, respostas ao formulário). |
| «Para já com o Claude e o Worker, mas mais ágil» | O Maestro corre às 07:44 e às 18:44. Um pedido espera até 12 horas. | Volta 9: o Worker **chama o Maestro na hora** quando há um pedido (com um segredo guardado no Worker). Fica escrito o caminho para a API do Claude ou outra IA, se a app crescer. |

## As dez voltas

| # | O que muda para ti | Por dentro |
|---|---|---|
| **1** ✔ | Nada à vista. | `musica.onda` na Onda fluida e na biblioteca nova (1357 → 984 linhas). Na linguagem Onda: o molde com nome. Este plano. |
| **2** | Uma só folha por playlist. Mudar o nome, apagar e «atualizar sozinha» passam para a folha. As faixas ficam simples. | Sai a vista 2 (`v_playlist`) e o que só ela usava; a folha lê um só documento. |
| **3** | **Trocar (⇄)** uma faixa, na hora e logo no Tidal. O ✕ passa a tirar a faixa (também na hora). | O motor escolhe a substituta entre as candidatas; o Worker dá as parecidas do Tidal; grava com `/versoes`. |
| **4** | **Afinar** na folha com quatro botões e o gráfico da energia. | O afinador passa para a folha; o gráfico é SVG escrito pela Onda (uma função da app, depois da biblioteca). |
| **5** | Os pedidos à espera aparecem na lista das playlists (com cancelar). «Pedir» só pede. | Um só índice para a lista (playlists e pedidos); sai `lista_pedidos`. |
| **6** | Cada pedido dá **uma** playlist, logo no Tidal. As antigas que só estão na app ganham um botão «Pôr no Tidal». | `CURADOR.md` e os scripts do Maestro: uma decisão consolidada, mais candidatas guardadas (para trocar e mudar de estilo); o Worker publica ao receber. |
| **7** | Três separadores. O teu gosto num cartão dos Ajustes. | Sai a vista 4 (`v_gosto`) como separador; os gestos e a navegação passam a três. |
| **8** | App Store (1): a app abre sem rede, o login do Tidal volta à app, «Apagar a minha conta», páginas de privacidade e de apoio. | `musica/nativo` leva os ficheiros da app; o Worker ganha apagar a conta; sem marcas de terceiros nos textos. |
| **9** | App Store (2) e agilidade: avisos nativos, o que a loja pede (textos, ecrãs), e o Maestro a correr logo depois de um pedido. | APNs no Worker (com segredos); o Worker chama o Maestro; o caminho para a API fica escrito. |
| **10** | Nada à vista: limpeza. | Os scripts do Maestro na Onda fluida e na biblioteca nova (sai o `lib/app.onda`), o que ficou sem uso fora, documentação e auditoria. |

## Regras de cada volta

- **Nada se perde.** O que sai de um sítio fica noutro, e a tabela de cima diz onde.
- **Testes primeiro.** O que muda no ecrã tem um teste de interface que o usa; os 54 de hoje continuam a passar ou
  mudam com a razão escrita.
- **O Tidal é sempre de cada pessoa.** Ninguém usa a conta nem o código de outra pessoa.
- **Segredos só no Worker** (como segredos do Cloudflare): nunca no código nem na app.
- **Publicar e juntar ao `main` só com o teu OK.**
