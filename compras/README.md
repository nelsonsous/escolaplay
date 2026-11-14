# Compras

A lista das compras da casa, e em que supermercado fica mais barata. O plano das dez voltas está em
[`PLANO.md`](PLANO.md).

Endereço (depois de juntar ao `main`): **https://nelsonsous.github.io/escolaplay/compras/**. No telemóvel:
iPhone *Partilhar → Adicionar ao ecrã principal*; Android *⋮ → Instalar app*.

## O que já faz (volta 2)

- **A lista da casa.** Escreve-se como sai («2 leites, pão de forma e ovos»): a app separa por vírgulas e por « e »
  e lê a quantidade à frente. Riscar, tirar os riscados, mudar a quantidade, tirar uma coisa.
- **O produto de cada supermercado.** Tocar numa coisa abre a folha com os produtos parecidos no Continente, no Pingo
  Doce, no Auchan e no Lidl, e escolhe-se o de cada um. Os preços vêm na volta 3.
- **A casa.** Cada telemóvel fica numa casa com um código. «Convidar pelo WhatsApp» manda um link que põe o outro
  telemóvel na mesma casa, e o que ele tinha na lista junta-se à lista da casa.
- **Sem rede.** A lista abre sem rede, e o que se muda sem ela segue quando a rede voltar.
- **Partilhar no WhatsApp** a lista do que falta, como texto, para o grupo da família.

## Como está feita

- `app/compras.onda` — a app, toda em Onda; `compilar.mjs` monta-a em `app/compras.wasm`. `compras.js` é a casca:
  a chave do aparelho nos pedidos ao conector e o Enter nos campos. `index.html`, `compras.css`, `sw.js`, o manifesto
  e os ícones completam a PWA.
- `proxy/` — o conector (Worker `compras` 0.3.0, em `https://compras.mercados-proxy.workers.dev`):
  - a casa e a lista (`src/casa.js`);
  - a procura no índice de cada cadeia (`src/indice.js`);
  - a sonda das cadeias e as fontes que leem um produto (`src/fontes/`, da volta 1). A sonda só funciona com o
    segredo `SONDA_TOKEN`, só nos domínios das cadeias e só onde o robots.txt deixa.
- `economo/` — os scripts do Ecónomo (a tarefa do Claude). `indice.mjs` refaz o índice a partir dos mapas do site das
  cadeias, lidos pelo conector.
- `tests/` — o conector, as fontes (com excertos reais das páginas), o índice e a app no Chromium com o conector a
  sério (`servidor.mjs`).

```bash
cd compras && npm test                                         # 42 testes (a app precisa do Playwright)
node compras/compilar.mjs                                      # app/compras.onda → app/compras.wasm
cd compras/proxy && npx wrangler deploy                        # publicar o conector
openssl rand -hex 24 | npx wrangler secret put SONDA_TOKEN     # o segredo da sonda (sem ele, a sonda fica desligada)
SONDA_TOKEN_FILE=… NODE_USE_ENV_PROXY=1 node compras/economo/indice.mjs   # refazer o índice (4 gravações na KV)
```
