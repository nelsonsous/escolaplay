# Mercados

App à parte (PWA instalável) para acompanhar, num só ecrã do telemóvel:

- **Cripto em tempo real** — Bitcoin, Ether, Solana e XRP (Binance, WebSocket; em EUR ou USD).
- **Petróleo e energia** — Brent, WTI, gasolina (RBOB), gasóleo (ULSD) e gás natural, com a conversão aproximada para €/litro.
- **Combustíveis em Portugal** — preço mediano do gasóleo simples e da gasolina 95 nas bombas e o posto mais barato (DGEG), no país ou por distrito.
- **Índices, câmbio e ouro** — S&P 500, Nasdaq, Euro Stoxx 50, PSI, VIX, EUR/USD.
- **Ações que segues** — lista editável (vem com PSI, Europa e EUA; procura e junta outras).
- **Destaques** — o que sobe ou cai mais do que ±X % hoje, com a notícia do dia e se é **boa ou má notícia**; e as maiores subidas/descidas do mercado americano.
- **Análise** — sentimento geral do mercado e uma classificação 0–100 de cada ativo (tendência, momento, RSI, MACD, volatilidade, tom das notícias), com as razões explicadas.
- **Avisos** — notificação quando algo se mexe mais do que o limite escolhido.

Endereço: `https://nelsonsous.github.io/escolaplay/mercados/` (no telemóvel: *Partilhar → Adicionar ao ecrã principal*).

> A análise descreve a tendência recente; **não é aconselhamento financeiro** e não garante subidas.

## Conector

As cripto funcionam logo. O resto (Yahoo Finance, Google Notícias, DGEG) não pode ser lido diretamente pelo browser, por isso a app usa um Cloudflare Worker teu, grátis, na pasta `proxy/` — igual ao `tts-proxy`.

```bash
cd mercados/proxy
npx wrangler login     # só da primeira vez
npx wrangler deploy
```

O `wrangler` imprime o URL, algo como `https://mercados-proxy.<conta>.workers.dev`. Na app: **Ajustes → Conector de dados → colar → Guardar**. Também dá para abrir a app já configurada: `…/mercados/?proxy=https://mercados-proxy.<conta>.workers.dev`.

Opcional: para só aceitar pedidos vindos da app, descomenta `ALLOWED_ORIGINS` no `wrangler.toml` e volta a fazer `deploy`.

### Endpoints

| Pedido | Devolve | Cache no CDN |
|---|---|---|
| `/quotes?symbols=BZ=F,AAPL&range=1d` | cotação, variação, máx./mín., série (até 40 símbolos; `range` = 1d, 5d, 1mo, 6mo, 1y, 5y) | 15 s a 1 h |
| `/news?q=Galp&lang=pt` | notícias dos últimos 3 dias (Google Notícias; Yahoo de recurso) | 10 min |
| `/movers` | maiores subidas, descidas e mais negociadas nos EUA | 2 min |
| `/search?q=mota` | procurar símbolos | 1 h |
| `/fuel?distrito=11` | mediana, média, mín./máx. e postos mais baratos (DGEG) | 1 h |
| `/fuel/distritos` | distritos da DGEG | 24 h |

O plano grátis da Cloudflare dá 100 000 pedidos/dia; com a app aberta a atualizar a cada 30 s são uns 3 000 por hora de uso.

## Dados e limites

- Ações, índices e futuros: dados gratuitos do Yahoo Finance, que podem ter **até 15 min de atraso** nalgumas bolsas. A app atualiza a cada 30 s.
- Gasolina e gasóleo "internacionais" são futuros de Nova Iorque em USD/galão; o €/L mostrado é sem impostos nem margens. O preço nas bombas vem da DGEG.
- O tom das notícias é calculado por palavras-chave nos títulos (PT e EN): é uma pista rápida.

## Testes

```bash
node --test mercados/tests/*.test.*      # análise + Worker (fetch simulado)
node mercados/tests/ui.test.js            # app no Chromium com todas as fontes simuladas
```
