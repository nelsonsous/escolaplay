# Música — plano das dez voltas

O pedido: rever a app a fundo, em dez voltas seguidas. Primeiro planear, depois executar. Tudo simples, fluido e
fácil de usar e de afinar; sem perder o que já faz; em Onda, com a biblioteca nova; pronta para a App Store; para já
com o Claude e o Worker, mas a pensar em ter isto mais ágil.

Cada volta é um pedaço que se pode usar: um PR com testes, a versão sobe, e a app continua a funcionar.

## A revisão: o que está mal hoje e o que passa a ser

| O que perguntaste | Como está hoje | Como fica |
|---|---|---|
| «Em vez de apanhar uma música, ser substituir» | «Mais como esta» cria **outra** playlist. O ✕ («Não esta») só marca a faixa: o Maestro refaz a playlist horas depois. Não há maneira de trocar uma faixa na hora. | **Trocar (⇄)** em cada faixa: a app escolhe a melhor substituta (das candidatas que o Maestro deixou e das parecidas do Tidal), mostra-a no mesmo sítio e grava logo no Tidal. Se não gostares, tocas outra vez e vem a seguinte. |
| «Porque não envia sempre para o Tidal e é revisto depois?» | O Maestro deixa duas ou três propostas na app. Tens de as abrir, escolher uma e enviá-la. | **Uma playlist por pedido, logo no Tidal.** Rever é depois, na app: trocar faixas, mudar o estilo, afinar. As «variantes» deixam de ser playlists à parte e passam a ser o botão **Estilo** da playlist. O que nasce sem o Maestro («Mais como esta», com as parecidas do Tidal) também vai logo para lá, e ele revê-o depois. |
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
| **2** ✔ | Uma só folha por playlist: mudar o nome, apagar e «atualizar sozinha» no «⋯»; o porquê, como correu e a mistura em «Sobre esta playlist»; faixas simples (tocar no título dá «Mais como esta»). «Afinar no telemóvel» fica num ecrã seu até à volta 4. Cada separador abre no topo. | A folha em pedaços que se redesenham sozinhos (`refolha`); a vista 2 fica só com o afinador; porta `_an_rolar` no anfitrião da Onda. |
| **3** ✔ | **Trocar (⇄)** uma faixa: a nova aparece logo no mesmo sítio e fica gravada no Tidal. Tocar outra vez traz a seguinte; a que sai não volta. Arrastar para a esquerda (ou «Tirar») tira a faixa na hora. «Desfazer» volta atrás, vários passos. | O motor escolhe a substituta no telemóvel entre as candidatas (pontos do estilo, repetição e encaixe com as vizinhas); sem candidatas livres, o Worker traz uma parecida do Tidal (`/trocar`, Worker 1.20.0). |
| **4** ✔ | **Afinar** dentro da folha: o gráfico da energia (a linha das faixas e o arco pedido) e quatro escolhas — estilo, energia, quantas faixas, quantas por artista. Vê-se logo o que entra e sai; o alfinete segura uma faixa; «Guardar» grava no Tidal. «Acrescentar uma faixa» (procurar no Tidal) fica por baixo da lista. Já não há ecrã à parte. | O afinador usa o mesmo contexto do motor que a troca (`ctx_cands`); a vista 2 saiu. Módulo novo na biblioteca da Onda: `lib/grafico.onda` (caminhos SVG, em linha e em curva suave). Worker 1.20.1. |
| **5** ✔ | Os pedidos à espera aparecem no cimo da lista das playlists, com cancelar (o botão, ou arrastar). Depois de pedir vai-se para lá. Uma afinação pedida vê-se no cartão da playlist e cancela-se na folha dela. «Pedir» só pede. | Sai a lista de pedidos do «Pedir» (e o cartão «N pedidos à espera» que levava até ela); os pedidos só se pedem ao conector na lista. |
| **6** ✔ | Cada pedido dá **uma** playlist, logo no Tidal (o aviso diz «já está no teu Tidal»). Juntar playlists também vai logo para lá. As antigas que só estão na app (propostas, juntadas) são cartões como os outros, com «só na app» e o botão «Pôr no Tidal». **«Mais como esta»** continua a aparecer na hora, com as parecidas do Tidal, e fica um pedido para o Maestro a rever na corrida seguinte, na mesma playlist e no mesmo link: o cartão diz «o Maestro vai revê-la» e depois «✓ revista». | `CURADOR.md`: uma decisão por pedido (as candidatas dos outros ângulos ficam guardadas para o ⇄ e o estilo) e os pedidos de revisão; sai o `--variante` dos scripts e o grupo «Propostas para escolher» da app. Worker 1.21.0. |
| **7** ✔ | **Três separadores: Música · Pedir · Ajustes.** «O teu gosto» é o primeiro cartão dos Ajustes, fechado até se querer ver: aberto, mostra o mesmo que o separador mostrava (o que se está a ouvir, artistas, décadas, géneros, qualidade, favoritas, as tuas playlists no Tidal e «Atualizar do Tidal»). | Sai a vista 4 como separador (`cartao_gosto`); o perfil e as tendências só se pedem ao conector quando o cartão se abre; a barra e os gestos passam a três. |
| **8** ✔ | App Store (1): a app nativa leva a app lá dentro (abre sem rede, não depende do site) e o login do Tidal volta a ela. Nos Ajustes, **«A tua conta»**: o que se guarda e **«Apagar a minha conta»** (pergunta primeiro; as playlists do Tidal ficam). Páginas de **privacidade** e de **apoio**. Os textos dizem «uma IA» em vez de marcas de terceiros. | `nativo/montar.mjs` monta a app em `www/` e no projeto iOS (o «npm run onda» chama-o; os testes conferem que está em dia e que a app montada abre sozinha). Worker 1.22.0: `DELETE /api/conta` e o regresso do login à app (`capacitor://localhost`). Não foi experimentado num iPhone. |
| **9** ✔ | **O Maestro na hora**: com o gatilho da tarefa agendada ligado ao conector, um pedido chama-o logo e a playlist fica pronta em minutos; a app diz «uns minutos» e vai ver sozinha se já acabou. **Autorização para a IA** antes de ligar o Tidal («Concordo e ligar»). **O que a loja pede** está em [`loja/LEIA.md`](loja/LEIA.md): textos, formulário de privacidade, notas para a revisão, ecrãs. Os **avisos nativos não foram feitos** (precisam do programa pago e de um Mac). | Worker 1.23.0: chama o gatilho «API» da tarefa (segredos `MAESTRO_FIRE_URL` e `MAESTRO_TOKEN`), sem corridas a dobrar; `POST /api/consentir`. Os scripts recusam um pedido já tratado. O caminho para a API está em «Agilidade», mais abaixo. |
| **10** ✔ | Nada à vista: auditoria e limpeza. | Sem funções por usar na app (conferido pelo código, não pelo texto); saíram um ícone e cinco regras de estilo sem uso; os textos da app e do manifesto deixaram de nomear marcas onde não é preciso; a documentação foi conferida com o que a app faz. **Não foi feito:** passar os scripts do Maestro para a Onda fluida e a biblioteca nova (ver «O que ficou por fazer»). |

## O que ficou por fazer

As dez voltas estão feitas e publicadas (hoje: Música 2.42.0, conector 1.34.0). Fica isto, por ordem do que mais importa:

| O quê | Porquê ficou | O que é preciso |
|---|---|---|
| **Experimentar a app nativa** no simulador e num iPhone | aqui não há Mac nem Xcode: o projeto iOS foi montado e conferido só por testes | abrir `nativo/ios/App/App.xcodeproj` no Xcode e experimentar «Ligar ao Tidal» |
| **Ligar o Maestro na hora** | o token do gatilho só tu o podes criar | os três passos de «Agilidade», mais abaixo |
| **Confirmar os termos do TIDAL** para uma app pública | é uma decisão e uma leitura tuas | developer.tidal.com (primeiro ponto de [`loja/LEIA.md`](loja/LEIA.md)) |
| **Avisos nativos** (dentro da app do iPhone) | precisam do programa pago da Apple e de mexer no projeto no Xcode | um plugin de notificações no projeto e uma chave da Apple guardada no conector |
| **Os scripts do Maestro na biblioteca nova da Onda** (`curador/onda/`, 1200 linhas) | é uma reescrita grande, com as suas próprias funções de JSON e de texto, e a ferramenta de conversão não conhece tudo o que eles usam; feita à pressa punha em risco as playlists de todos os dias | uma sessão só para isso, com os testes de paridade (a versão em JavaScript) como juiz |
| **Testar com o Tidal a sério** o que só correu no simulador: trocar, juntar, «Mais como esta» com revisão, apagar a conta | os testes usam um Tidal simulado | usar a app uns dias e dizer o que falhar |

## O que o Tidal deixa (e não deixa) fazer a uma app de fora

A referência da API do Tidal (`tidal-api-oas.json`) marca cada operação com um nível de acesso
(`x-path-item-properties.required-access-tier`): `THIRD_PARTY` é o que uma app como a Música pode usar; `INTERNAL` é
só para as apps do próprio Tidal. **Antes de contar com uma operação, vê o nível dela.** Em novembro de 2026 eram 101
operações abertas e 363 internas.

| O quê | Nível | Na Música |
|---|---|---|
| Favoritas, artistas seguidos, playlists (criar, mudar, apagar, as faixas), pesquisa de faixas, faixas parecidas, as tuas mixes | aberto | já usa. As parecidas fazem o «Mais como esta» e o «Pedir» com música de partida (a playlist nasce logo; o Maestro revê-a com o pedido e dá-lhe nome): a lista do Tidal fica guardada e, depois da revisão do Maestro, a folha compara as duas (quantas ficaram, quantas entraram, o que guardaste de cada lado; as que saíram ouvem-se e voltam a entrar) |
| Pesquisar **playlists** por tema (`/searchResults/{id}/relationships/playlists`) e a **rádio** de uma faixa ou de um artista (`/tracks/{id}/relationships/radio`) | aberto | não usa (nunca foi experimentado) |
| **Playlists feitas por IA a partir de um texto** (`/playlistGenerations`: o texto, «fica / tira / mais como esta» por faixa, voltar a gerar e renovar todas as semanas) | interno | **não dá.** Experimentado com a conta real a 14/11/2026 (conector 1.24.0, que saiu a seguir): o Tidal respondeu `403 Access tier is insufficient` |
| O que se ouviu (`userPlaybackStates`) | interno | não dá |
| As pastas (`folders`, `userCollectionFolders`: criar, ler, pôr playlists lá) | interno | não dá. A app tem as suas pastas (no «⋯» de cada playlist, ou sugeridas pela IA) e, no fim da lista, o guia «Fazer as mesmas pastas no Tidal» para as repetir lá à mão |

Uma playlist que a pessoa faça com a IA **na app do Tidal** fica na conta dela como as outras: essa a Música pode ler
(as playlists têm o atributo `hasGenerations`). O código da experiência está no histórico do repositório
(«Conector 1.24.0 (por experimentar…)»), se um dia o Tidal abrir este nível.

## Agilidade: três degraus

**Já ligado (2.38.0): a playlist na hora.** Com autorização da pessoa, a IA grátis da Cloudflare (Workers AI, no
conector; Mistral Small 3.1, com outros modelos de reserva) lê o pedido e sugere as músicas de partida; o Tidal
confirma-as e a playlist nasce em segundos, com as parecidas delas. O Maestro revê-a depois (e dá-lhe nome). Com os
8 pedidos reais deu 31 de 32 músicas confirmadas; falha nos pedidos para crianças, que a revisão do Maestro corrige.
Grátis até 10 000 «Neurons» por dia; passado isso, o pedido fica para o Maestro, como antes.
Em «Pedir» escolhe-se «Criar já» (a IA e depois o Maestro) ou «Só o Maestro». A IA escolhe-se por pessoa, nos
Ajustes: a Mistral da Cloudflare (por omissão; não treina), a Mistral avançada (Mistral Large), com a conta Mistral
da própria pessoa, ou o Gemini (3.8 Flash; o 3.5 Flash-Lite de reserva), com a conta Google dela (para quem está na
UE, a Google segue as regras do plano pago: não usa os pedidos). Nas duas: a chave cola-se uma vez na app, confirma-se na Mistral, fica no conector e nunca volta (quem montou
a app pode, em vez disso, pô-la no Cloudflare, `MISTRAL_API_KEY`). No plano grátis, a Mistral pode usar os pedidos para
treinar os modelos dela: é uma escolha de cada um.

O Maestro é uma tarefa agendada do Claude. Um pedido pode ser tratado de três maneiras, da mais simples à mais rápida:

| Degrau | Como | Quanto demora | Quem paga | Estado |
|---|---|---|---|---|
| **1. À hora marcada** | A tarefa corre às 07:44 e às 18:44 e trata do que estiver à espera. | até 12 horas | a tua subscrição do Claude | sempre ligado |
| **2. Na hora** | O conector chama a mesma tarefa logo depois de um pedido (o gatilho «API» da tarefa). | uns minutos | a tua subscrição (cada corrida conta; no máximo 6 por hora) | feito; falta ligar (ver abaixo) |
| **3. Pela API** | O conector fala diretamente com o Claude pela API, sem tarefa agendada: um agente alojado pela Anthropic (Managed Agents) com as mesmas instruções e ferramentas, ou o conector a conduzir a conversa (API de mensagens com pesquisa na web). | um a poucos minutos | paga-se por utilização, por cada playlist — com uma chave de API guardada no conector | por fazer; só vale a pena se a app for para o público |

**Para ligar o degrau 2** (uma vez, e nada disto passa pelo código nem por esta conversa):

1. Em `claude.ai/code/routines`, abre a tarefa do Maestro → **Edit** → na linha **Trigger** carrega em **+** → **API** →
   **Generate token**. Copia o endereço («Fire URL») e o token (só aparece uma vez).
2. No painel do Cloudflare: **Workers** → `musica` → **Settings** → **Variables and Secrets** → junta dois, do tipo
   **Secret**: `MAESTRO_FIRE_URL` (o endereço) e `MAESTRO_TOKEN` (o token). Como «Secret» ficam guardados entre
   publicações; como texto simples desapareciam na seguinte.
3. Abre a app: no separador Pedir passa a dizer «O Maestro é chamado logo».

Para desligar, apaga os dois segredos (ou o token, na página da tarefa).

**Quando passar ao degrau 3.** A subscrição serve para ti e para quem convidas. Se a app for para a loja e para
desconhecidos, cada pedido deles gastaria da tua subscrição, e as tarefas agendadas têm limites por hora: aí é
preciso a API, onde cada playlist tem um custo que se mede antes de decidir (depende do modelo e de quanta pesquisa
faz) e alguém o paga. O que já existe serve na mesma: as instruções (`CURADOR.md`), os scripts, o motor e o conector.

## Regras de cada volta

- **Nada se perde.** O que sai de um sítio fica noutro, e a tabela de cima diz onde.
- **Testes primeiro.** O que muda no ecrã tem um teste de interface que o usa; os 54 de hoje continuam a passar ou
  mudam com a razão escrita.
- **O Tidal é sempre de cada pessoa.** Ninguém usa a conta nem o código de outra pessoa.
- **Segredos só no Worker** (como segredos do Cloudflare): nunca no código nem na app.
- **Publicar e juntar ao `main` só com o teu OK.**
