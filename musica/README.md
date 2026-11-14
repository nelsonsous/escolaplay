# Música

App à parte (PWA instalável) para **playlists de qualidade no Tidal**: o Claude analisa o que ouves e o que está a
dar (de vários géneros e épocas), e a **app é escrita na Onda** — uma «app em Onda» (`onda/rt/anfitriao.js`), com o
motor de curadoria lá dentro a escolher e ordenar as faixas. As playlists são criadas **na tua conta do Tidal**, pela
API oficial.

Endereço: **https://nelsonsous.github.io/escolaplay/musica/** (no iPhone: *Partilhar → Adicionar ao ecrã principal*).

## Como funciona

```
 app em Onda (telemóvel) ─┐                                  ┌─ Tidal (API oficial v2, OAuth com PKCE)
   app/musica.onda        ├─►  Worker "musica" (Cloudflare) ──┤
 Maestro (Claude) ────────┘     tokens, chaves, biblioteca    └─ a tua conta: favoritas, playlists, pesquisa
        │                       (KV)
        └─ motor.onda — o mesmo motor na app (app/musica.wasm) e na tarefa agendada (onda/curador.wasm)
```

- **Maestro** — como o Conselheiro dos Mercados e o Analista do Meteo, uma **tarefa agendada do Claude** segue
  [`CURADOR.md`](CURADOR.md) às 07:44 e às 18:44: lê o teu gosto (favoritas, artistas seguidos, playlists), pesquisa
  na web o que está a dar e tem qualidade (crítica, tabelas, cena portuguesa, jazz, clássica, reedições, gravações de
  referência), escreve uma proposta com 2,5× a 3× as faixas necessárias, e publica: os pedidos que fizeste na app —
  **cada pedido dá uma playlist, logo no teu Tidal** (revês depois na app: trocar faixas, mudar o estilo, afinar; as
  candidatas que sobram ficam guardadas para isso) — e, uma vez por semana, a **«Onda da semana»**. Usa também as tuas **mixes do Tidal** e, às sextas de manhã, cria
  **«Novidades dos teus artistas»** com os álbuns novos dos artistas que segues.
- **Motor de curadoria em Onda** — [`onda/curador.onda`](onda/curador.onda): da proposta, escolhe K faixas pela
  pontuação (gosto, qualidade do som, tendência, nota do Claude, novidade) com diversidade (máximo por artista, géneros
  e décadas espalhados), e ordena-as para uma audição seguida — bpm (com meio e dobro do tempo), tom na roda de
  Camelot, época, energia ao longo de um arco (*onda*, *sobe*, *acalma*) — com vizinho mais próximo e 2-opt. Só
  inteiros: o **WASM** (app, tarefa agendada) e o **binário nativo** (C gerado pela Onda) dão o mesmo, ao bit — o
  juiz confirma-o nos testes.
- **Worker** ([`proxy/`](proxy/)) — fala com o Tidal em teu nome: login com PKCE (sem segredo, só o Client ID), tokens
  renovados sozinhos, o teu gosto (cache de 6 h), encontrar faixas (pesquisa + verificação de artista e título,
  versão de estúdio antes de ao vivo, preferência por Hi-Res), criar playlists (lotes de 50) e a biblioteca da app,
  afinar na **mesma** playlist (troca as faixas no Tidal, sem cópias), **trocar ou tirar uma faixa na hora**
  (`POST /api/playlists/:id/trocar`: a que entra é uma candidata guardada, escolhida pelo motor no telemóvel, ou uma
  parecida do Tidal; dá para desfazer), **«Mais como esta»** (as faixas parecidas do Tidal, logo numa playlist; fica um pedido para o Maestro a rever na corrida seguinte, na mesma playlist), juntar playlists (também logo no Tidal), apagar também no Tidal e, para o Maestro, as tuas mixes e os álbuns novos dos artistas que segues.
  Só aceita pedidos com a **chave do aparelho** (criada quando ligas o Tidal) ou a **chave do agente** (o Maestro).
- **App em Onda** ([`app/musica.onda`](app/musica.onda)) — na Onda fluida (moldes, o ponto, a fala e moldes com
  nome), monta-se com a biblioteca da Onda (`onda/lib`) e o motor (`node musica/onda/compilar.mjs`, que tira da fonte
  as funções que o anfitrião chama) e corre no anfitrião das apps Onda. O ecrã desenha-se com `_ht_muda`: a app
  escreve o HTML e o anfitrião mexe só no que é diferente (as capas não piscam, a lista não salta). O plano da
  revisão em dez voltas está em [`PLANO.md`](PLANO.md). Os ecrãs:
  Playlists (cada uma abre numa **folha** que é o único sítio onde se mexe nela: ouvir 30 s, **⇄ trocar uma faixa**
  por outra — vê-se logo e fica gravada no Tidal —, arrastar para a esquerda para a tirar, «Desfazer», o «⋯» para
  mudar o nome, atualizar sozinha e apagar, «Sobre esta playlist» com o porquê e a mistura, tocar no título de uma
  faixa para tirar ou **«Mais como esta»**, «Acrescentar uma faixa» do Tidal, pedir uma afinação ao Maestro; os pedidos à espera do Maestro ficam no cimo da lista, com cancelar; tudo o que se cria vai logo para o Tidal — as playlists antigas que só estão na app têm «Pôr no Tidal»),
  Pedir (só pedir: o texto, as opções e as ideias do Maestro) e Ajustes — três separadores; **«O teu gosto»** (as favoritas, o que se está a ouvir, as tuas playlists no Tidal) é um cartão dos Ajustes, que se abre quando se quer; o estado, a navegação e o motor de curadoria, tudo em Onda. **Afinar** é dentro da folha: o
  `motor.onda` corre na própria app a cada mudança (estilo, energia, número de faixas, máximo por artista, fixar) em
  menos de 1 ms, o gráfico da energia é SVG escrito pela Onda (`onda/lib/grafico.onda`), e o juiz dos testes confirma
  que dá a mesma ordem que o `curador.wasm`. Ao guardar, a app manda só a decisão (a ordem e o porquê, por índice das
  candidatas) e o Worker monta a versão (`POST /api/playlists/:id/versoes`), na app e no Tidal.
  A casca [`musica.js`](musica.js) só trata do que a Onda não tem como porta: a chave do aparelho nos pedidos, os
  pedidos que escrevem ("MÉTODO caminho" + corpo), sair para o login do Tidal ("IR url") e o regresso dele.

## Partilhar com outras pessoas

Nos **Ajustes**, «Convidar alguém» cria um link (serve uma vez, durante 14 dias) para enviar por WhatsApp ou email.
Quem o abre liga o **seu** Tidal e fica com a sua biblioteca, os seus pedidos e o seu gosto; o Maestro trata os pedidos
de todos (na tua conta do Claude). No Worker, os dados do dono ficam nas chaves de sempre e os de cada pessoa
convidada com o prefixo `u:<id>:`; o agente escolhe a pessoa com `?u=<id>` e vê a lista em `GET /api/utilizadores`.

## Ligar (uma vez)

1. Em **developer.tidal.com** cria uma app (grátis). Redirect URI: `https://musica.mercados-proxy.workers.dev/tidal/retorno`.
   Scopes: `user.read collection.read playlists.read playlists.write search.read recommendations.read`.
2. Abre no iPhone o **link de ligação** (`…/musica/?ligar=<código>`) que o Claude te deu: colas o Client ID, carregas
   em **Ligar ao Tidal**, autorizas e voltas à app. O código só serve uma vez; o aparelho fica com a sua chave.
3. Para outro aparelho (ex.: a app no ecrã principal do iOS, que tem o seu próprio armazém): pede ao Claude um código
   novo (grava o hash em `codigo:ligacao` na KV) e cola-o em «Código de ligação» — com o Tidal já ligado, o aparelho
   recebe a sua chave sem novo login (`POST /api/aparelho`).

## Desenvolvimento

```bash
cd musica
npm test                 # motor (juiz: app, anfitrião oficial e nativo), Worker, biblioteca, Maestro, a app em Onda no Chromium
npm run onda             # recompila com onda/seed/ondac.wasm: onda/curador.wasm + curador.c, app/musica.wasm e curador/maestro.wasm
cd proxy && npm install && npx wrangler deploy
node scripts/make-icons.mjs
```

O compilador é o da Onda deste repositório (`onda/seed/ondac.wasm`, escrito na própria Onda); `npm run onda`
recompila e `npm test` confirma que os compilados correspondem à fonte. O juiz corre o motor em três formas — o
anfitrião da app (`onda/onda.js`: browser, Worker e Node), o anfitrião oficial (`onda/wasm/host.js`) e o binário
nativo do C gerado — e exige o mesmo resultado, ao bit.

Estrutura: `app/` (a app em Onda), `onda/` (`motor.onda`, o programa de linha de comando `curador.onda` e o anfitrião
de três portas para o Node), `lib/` (Tidal, sinais, proposta, curadoria — partilhado pelo Worker e pela tarefa
agendada), `proxy/` (Worker), `curador/` (scripts da tarefa agendada, em Onda: `curador/onda/dados.onda` e `publicar.onda`, este com o
`motor.onda` chamado diretamente → `curador/maestro.wasm`, corrido pelo `correr.mjs` com o anfitrião Node da Onda; a
versão JavaScript fica em `curador/js/` como referência dos testes de paridade, ao byte), `tests/`.
