# Compras

A lista das compras da casa, e em que supermercado fica mais barata. O plano das dez voltas está em
[`PLANO.md`](PLANO.md).

Endereço (depois de juntar ao `main`): **https://nelsonsous.github.io/escolaplay/compras/**. No telemóvel:
iPhone *Partilhar → Adicionar ao ecrã principal*; Android *⋮ → Instalar app*.

## O que já faz (voltas 2 a 6)

- **A lista da casa.** Escreve-se como sai («2 leites, pão de forma e ovos»): a app separa por vírgulas e por « e »
  e lê a quantidade à frente. Riscar, tirar os riscados, mudar a quantidade, tirar uma coisa.
- **Escrever e encontrar.** Enquanto se escreve aparecem os tipos do catálogo («ág» → Água sem gás). Tocar num abre a
  escolha: o tamanho, a marca ou «🏷 Marca branca», e o mais barato de cada supermercado (por litro ou por quilo).
  «Juntar à lista» põe a coisa já com o produto de cada um, e o conector mantém-no o mais barato (revê de hora a hora;
  o que se escolhe à mão fica). A Mercadona aparece com uma estimativa «≈»: a marca branca do mesmo tipo e tamanho nas
  outras lojas (a Mercadona não publica os preços).
- **O produto de cada supermercado, com o preço.** Tocar numa coisa abre a folha com os produtos parecidos no
  Continente, no Pingo Doce, no Auchan e no Lidl, e escolhe-se o de cada um. O preço é o do site da cadeia (com o
  riscado das promoções e o preço por quilo ou por litro), lido quando se escolhe o produto e depois uma vez por dia.
  Os produtos parecidos também mostram o preço, e o mais barato por quilo ou por litro fica marcado, para trocar de
  marca ou de embalagem.
- **Mais barato.** O total da lista em cada supermercado. Só se comparam os que têm preço para tudo; os outros dizem
  quantas coisas lhes faltam. Por baixo, se compensa ir a duas lojas (poupando pelo menos 2 €), e o que comprar em cada.
  «Vou a este» arruma a lista por essa loja, com o total lá.
- **A casa.** Cada telemóvel fica numa casa com um código. «Convidar pelo WhatsApp» manda um link que põe o outro
  telemóvel na mesma casa, e o que ele tinha na lista junta-se à lista da casa.
- **Talões.** «📷 Talão» lê a fotografia com a IA da Cloudflare: a loja, o total e as linhas ficam guardados, e o que
  vem no talão risca-se na lista.
- **As tuas lojas.** No separador Casa, a localidade e as lojas onde compras (também a Mercadona e o SPAR, com a tua
  loja): as comparações só contam com elas. A Mercadona e o SPAR entram com estimativas «≈».
- **O que costumas comprar.** Dos talões, a app sabe o que compras e de quanto em quanto tempo, e sugere o que está a
  acabar. Cada coisa tem um ✕ para a tirar da lista.
- **A lista arrumada.** Por secções, pela ordem da loja (cada uma fecha-se com um toque); o que se risca desce para
  «No carrinho». Cada linha: o mais barato das tuas lojas, − e + para a quantidade e ✕ para tirar.
- **Sem rede.** A lista abre sem rede, e o que se muda sem ela segue quando a rede voltar.
- **Partilhar no WhatsApp** a lista do que falta, como texto, para o grupo da família.

## Como está feita

- `app/compras.onda` e `app/onde.onda` (as contas do «Mais barato») — a app, toda em Onda; `compilar.mjs` monta-a em
  `app/compras.wasm`. `compras.js` é a casca:
  a chave do aparelho nos pedidos ao conector e o Enter nos campos. `index.html`, `compras.css`, `sw.js`, o manifesto
  e os ícones completam a PWA.
- `proxy/` — o conector (Worker `compras` 0.42.0, na conta Cloudflare própria, em `https://compras.compras-nelson.workers.dev`; até 15/11/2026 esteve em `compras.mercados-proxy.workers.dev`, que fica de reserva):
  - a casa e a lista (`src/casa.js`), na D1 `compras` (as tabelas em `migrations/`);
  - os preços (`src/precos.js`): lidos no site da cadeia quando se escolhe um produto e pelo cron de dez em dez
    minutos (os que têm mais de 20 h, um por cadeia de cada vez), guardados na D1, com o preço por quilo ou litro;
    e os preços dos produtos de uma procura (`/api/precos`);
  - a escolha que se mantém e a estimativa da Mercadona (`src/escolhas.js`);
  - o catálogo (`src/catalogo.js`): as páginas de categoria das cadeias, lidas pelo cron (uma a cada dois minutos, à
    vez por cadeia), com o tipo de cada produto; e a escrita (`src/sugerir.js`: `/api/sugerir` e `/api/tipo`);
  - a procura no índice de cada cadeia (`src/indice.js`; o índice está na KV);
  - a sonda das cadeias e as fontes que leem um produto (`src/fontes/`, da volta 1). A sonda só funciona com o
    segredo `SONDA_TOKEN`, só nos domínios das cadeias e só onde o robots.txt deixa.
- `economo/` — os scripts do Ecónomo (a tarefa do Claude). `indice.mjs` refaz o índice a partir dos mapas do site das
  cadeias, lidos pelo conector. `tipos.mjs` cruza as categorias das cadeias (com os tipos da casa, `tipos-casa.json`,
  feitos à mão) e grava os tipos e as páginas na D1; `catalogo.mjs` enche o catálogo de uma vez.
- `tests/` — o conector, as fontes (com excertos reais das páginas), o índice, os preços e a app no Chromium com o
  conector a sério (`servidor.mjs`), sobre uma D1 simulada em SQLite (`d1.mjs`) e os sites das cadeias a fingir
  (`cadeias.mjs`).

```bash
cd compras && npm test                                         # 73 testes (a app precisa do Playwright)
node compras/compilar.mjs                                      # app/compras.onda → app/compras.wasm
cd compras/proxy && npx wrangler d1 migrations apply compras --remote   # as tabelas da D1 (uma vez por migração)
cd compras/proxy && npx wrangler deploy                        # publicar o conector (e o cron)
openssl rand -hex 24 | npx wrangler secret put SONDA_TOKEN     # o segredo da sonda (sem ele, a sonda fica desligada)
SONDA_TOKEN_FILE=… NODE_USE_ENV_PROXY=1 node compras/economo/indice.mjs   # refazer o índice (4 gravações na KV)
SONDA_TOKEN_FILE=… NODE_USE_ENV_PROXY=1 node compras/economo/tipos.mjs    # os tipos e as páginas do catálogo (D1)
SONDA_TOKEN_FILE=… NODE_USE_ENV_PROXY=1 node compras/economo/catalogo.mjs # encher o catálogo de uma vez
```

## Como manter

O conector mantém-se quase sozinho: o cron relê as páginas de categoria das três cadeias ao longo do dia (cada site
recebe no máximo um pedido a cada seis minutos), os preços das listas de dez em dez minutos e as escolhas de hora a
hora; cada página lida é revista (`src/revisao.js`: os produtos suspeitos saem das comparações). O que pode precisar
de mão, e como (os comandos correm na pasta `compras`, com `SONDA_TOKEN_FILE` a apontar para o ficheiro do segredo
da sonda e, para o wrangler, `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID`):

| Sinal | O que fazer |
|---|---|
| Ver a saúde da base | `node economo/saude.mjs` (sai com 1 se há avisos); na app, separador Casa › «Os preços» |
| Uma cadeia com ⚠ (páginas a falhar, preços velhos) | o site mudou: guardar uma página nova em `tests/fontes/`, ajustar o leitor em `src/catalogo.js` (`continente`, `pingodoce`, `auchan`) até `npm test` passar, publicar |
| Categorias novas nas cadeias | `node economo/tipos.mjs` (refaz os tipos e as páginas) e `node economo/catalogo.mjs` (lê as páginas novas) |
| Produtos do talho/peixaria sem corte ou animal | `node economo/etiquetas.mjs` lista-os; acrescentar regras em `src/etiquetas.js` |
| Os artigos do SPAR | `node economo/spar.mjs` (uma vez por mês chega) |
| Um preço estranho | `curl -H "authorization: Bearer $(cat …)" …/sonda/revisao?k=TIPO` mostra os suspeitos desse tipo |
| «exceeded D1's free tier daily row write limit» | a D1 grátis escreve no máximo 100 mil linhas por dia (volta a zero à meia-noite UTC); o catálogo só escreve o que mudou, por isso basta não correr `economo/normalizar.mjs`, `spar.mjs` ou `tipos.mjs` várias vezes no mesmo dia |
| Mudar o esquema da D1 | uma migração nova em `proxy/migrations/`, `npx wrangler d1 migrations apply compras --remote`, publicar |
| Publicar o conector | `cd proxy && npx wrangler deploy` (depois de `npm test`) |
| Publicar a app | juntar ao `main` (o GitHub Pages serve a pasta); subir a versão em `compras.js` (`?v=`) e em `sw.js` (`CACHE`) |

A tarefa semanal do Ecónomo (uma tarefa agendada no claude.ai) faz isto por ti: corre o relatório de saúde, revê os
produtos novos sem etiqueta e as cadeias com aviso, corrige o que for preciso e abre um PR para aprovares.
