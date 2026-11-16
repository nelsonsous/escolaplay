# Histórico das apps (D1)

As apps leem o KV (a cache: a última análise, o último conselho, o retrato de hoje). A evolução fica em três bases SQL
**D1** da Cloudflare, na conta do dono (plano gratuito: 5 GB e 100 mil escritas por dia), cada uma ligada ao Worker
da sua app (binding `HIST`):

| Base | O que guarda | Esquema |
|---|---|---|
| `meteo-historico` | cada análise, o previsto dia a dia (com o consenso dos modelos), o medido nas estações e a vista `acertos` | [meteo/proxy/historico.sql](../meteo/proxy/historico.sql) |
| `mercados-historico` | os conselhos do Claude e o que diziam de cada ativo, as sugestões da app do dono e a **Carteira do dono** dia a dia | [mercados/proxy/historico.sql](../mercados/proxy/historico.sql) |
| `musica-historico` | as tabelas de cada dia (o KV apaga-as aos 70 dias) e as versões do perfil de gosto do dono | [musica/proxy/historico.sql](../musica/proxy/historico.sql) |

Triagem (16/11): guarda-se o que não se consegue voltar a obter — o que o Claude escreveu, os dados do dono e as
verificações. O que é público e se volta a buscar (previsões dos modelos, preços, playlists, capas) fica de fora.

## Levar os dados para o Excel ou o Google Sheets

    NODE_USE_ENV_PROXY=1 node historico/exportar.mjs [meteo|mercados|musica] [--pasta <dir>] [--ponto]

Um CSV por tabela (`;`, vírgula decimal, UTF-8 com BOM; `--ponto` para o Sheets em inglês) em `historico/export/<data>`
(fora do git: tem dados pessoais). Consultas à mão: `cd <app>/proxy && npx wrangler d1 execute <base> --remote
--command "SELECT …"`; cópia inteira: `npx wrangler d1 export <base> --remote --output copia.sql`.
