# Música

App à parte (PWA instalável) para **playlists de qualidade no Tidal**: o Claude analisa o que ouves e o que está a
dar (de vários géneros e épocas), e um **motor de curadoria escrito na Onda** escolhe e ordena as faixas. As playlists
são criadas **na tua conta do Tidal**, pela API oficial.

Endereço: **https://nelsonsous.github.io/escolaplay/musica/** (no iPhone: *Partilhar → Adicionar ao ecrã principal*).

## Como funciona

```
 app (telemóvel)  ─┐                                  ┌─ Tidal (API oficial v2, OAuth com PKCE)
                   ├─►  Worker "musica" (Cloudflare) ──┤
 Curador (Claude) ─┘     tokens, chaves, biblioteca    └─ a tua conta: favoritas, playlists, pesquisa
        │                (KV)
        └─ motor Onda (curador.wasm) — corre no telemóvel e na tarefa agendada
```

- **Curador** — como o Conselheiro dos Mercados e o Analista do Meteo, uma **tarefa agendada do Claude** segue
  [`CURADOR.md`](CURADOR.md) às 07:44 e às 18:44: lê o teu gosto (favoritas, artistas seguidos, playlists), pesquisa
  na web o que está a dar e tem qualidade (crítica, tabelas, cena portuguesa, jazz, clássica, reedições, gravações de
  referência), escreve uma proposta com 1,5× a 2× as faixas necessárias, e publica: os pedidos que fizeste na app e,
  uma vez por semana, a **«Onda da semana»**.
- **Motor de curadoria em Onda** — [`onda/curador.onda`](onda/curador.onda): da proposta, escolhe K faixas pela
  pontuação (gosto, qualidade do som, tendência, nota do Claude, novidade) com diversidade (máximo por artista, géneros
  e décadas espalhados), e ordena-as para uma audição seguida — bpm (com meio e dobro do tempo), tom na roda de
  Camelot, época, energia ao longo de um arco (*onda*, *sobe*, *acalma*) — com vizinho mais próximo e 2-opt. Só
  inteiros: o **WASM** (app, tarefa agendada) e o **binário nativo** (C gerado pela Onda) dão o mesmo, ao bit — o
  juiz confirma-o nos testes.
- **Worker** ([`proxy/`](proxy/)) — fala com o Tidal em teu nome: login com PKCE (sem segredo, só o Client ID), tokens
  renovados sozinhos, o teu gosto (cache de 6 h), encontrar faixas (pesquisa + verificação de artista e título,
  versão de estúdio antes de ao vivo, preferência por Hi-Res), criar playlists (lotes de 50) e a biblioteca da app.
  Só aceita pedidos com a **chave do aparelho** (criada quando ligas o Tidal) ou a **chave do agente** (o Curador).
- **App** — playlists com o porquê de cada faixa e a mistura (géneros, décadas, qualidade); **Afinar no telemóvel**
  (o motor Onda corre ali, em ~1 ms: muda o estilo, o arco, o número de faixas, fixa ou tira faixas, junta do Tidal)
  e enviar a versão afinada para o Tidal; **Pedir** ao Curador (ou colar uma proposta feita numa conversa com o Claude
  e montar na hora); **Gosto** (artistas, décadas, géneros, qualidade das favoritas); **Ajustes**.

## Ligar (uma vez)

1. Em **developer.tidal.com** cria uma app (grátis). Redirect URI: `https://musica.mercados-proxy.workers.dev/tidal/retorno`.
   Scopes: `user.read collection.read playlists.read playlists.write search.read recommendations.read`.
2. Abre no iPhone o **link de ligação** (`…/musica/?ligar=<código>`) que o Claude te deu: colas o Client ID, carregas
   em **Ligar ao Tidal**, autorizas e voltas à app. O código só serve uma vez; o aparelho fica com a sua chave.
3. Para outro aparelho: pede ao Claude um código novo (grava o hash em `codigo:ligacao` na KV).

## Desenvolvimento

```bash
cd musica
npm test                 # motor Onda (com o juiz WASM = nativo), Worker, biblioteca, Curador de ponta a ponta, app no Chromium
npm run onda             # recompila onda/curador.onda → curador.wasm + curador.c (precisa do compilador Onda)
cd proxy && npm install && npx wrangler deploy
node scripts/make-icons.mjs
```

O compilador Onda (`ondac.wasm`, escrito na própria Onda) **não está no repositório** (é público): está embutido no
artefacto «Onda · Editor». Para recompilar: `ONDAC=/caminho/ondac.wasm npm run onda` (ou guarda-o em
`~/.onda/ondac.wasm`). Sem ele, os testes usam o `curador.wasm` e o `curador.c` já compilados.

Estrutura: `onda/` (motor e anfitrião das três portas da Onda), `lib/` (Tidal, sinais, proposta, curadoria — partilhado
pela app, pelo Worker e pela tarefa agendada), `proxy/` (Worker), `curador/` (scripts da tarefa agendada), `tests/`.
