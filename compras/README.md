# Compras

App para poupar no supermercado, em construção. O plano das dez voltas está em [`PLANO.md`](PLANO.md).

## O que já existe (volta 1)

- `proxy/` — o conector: o Worker `compras` 0.2.0, publicado em teste em `https://compras.mercados-proxy.workers.dev`.
  - `GET /sonda?url=…` devolve a resposta de uma cadeia tal e qual, com o estado, o tempo e os cabeçalhos à parte.
  - `GET /sonda/produto?cadeia=…&url=…` devolve o produto lido pela fonte da cadeia. No Auchan também se pode dar
    `&id=…`, o número do produto.

  As duas rotas só funcionam com o segredo `SONDA_TOKEN`, só em https e só nos domínios das cadeias. O Worker
  identifica-se como é, não tenta passar proteções contra robôs e só se usa onde o robots.txt de cada cadeia deixa.
- `proxy/src/fontes/` — uma fonte por cadeia que deixa ler (Continente, Pingo Doce, Auchan, Lidl) e o que partilham
  (`comum.js`). Todas devolvem o produto na mesma forma: nome, marca, código de barras, preço, preço riscado, PVPR,
  validade, preço por unidade, embalagem, disponibilidade e data.
- `tests/` — o conector e as fontes, com excertos reais das páginas em `tests/fontes/`.

```bash
cd compras && npm test                                         # 23 testes
cd compras/proxy && npx wrangler deploy                        # publicar o conector
openssl rand -hex 24 | npx wrangler secret put SONDA_TOKEN     # o segredo da sonda (sem ele, a sonda fica desligada)
```
