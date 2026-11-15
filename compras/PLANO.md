# Compras — plano das dez voltas

O pedido: analisar melhor a PlanMyMeals (a app portuguesa de ementas e preços que, segundo a CNN Portugal de
14/11/2026, esteve uma semana à frente do ChatGPT nas instalações) e fazer melhor, como a Mercados, a Meteo e a
Música: a app em Onda, o conector no Worker da Cloudflare e o Claude a fazer o trabalho que precisa de cabeça.
Primeiro planear, depois executar.

Cada volta é um pedaço que se pode usar: um PR com testes, a versão sobe, e a app continua a funcionar.

**Nome provisório: Compras**, o nome do assunto, como nas outras três. «Cabaz» fica de fora porque é quase igual ao
Kabaz, do KuantoKusta.

**O formato:** tudo na app, como nas outras três: a app, o conector no Worker e o Claude pela tua subscrição. Não há
API paga nem bot. O WhatsApp só entra para partilhar a lista ou a ementa no grupo da família.

**O foco** (pedido de quem a vai usar, 14/11/2026): para as compras que se vão fazer, saber em que supermercado fica
mais barato. As receitas são um bónus e ficam para o fim, porque comprar os ingredientes de uma receita pode sair mais
caro.

## A PlanMyMeals a fundo

Pesquisa de 14/11/2026. «Diz o site» quer dizer que a afirmação é da própria app, sem confirmação independente.

| | O que se sabe |
|---|---|
| O que faz | Faz a ementa da semana para o agregado, com preferências, tempo de cozinha e orçamento por refeição. Se o orçamento não chega, faz a semana mais barata possível. Ajusta porções, sugere receitas com o que há em casa, importa receitas, faz a lista e diz qual é o supermercado mais barato. |
| Preços | Vêm de «catálogos públicos» dos supermercados (as lojas online), normalizados e com data. O total **mistura preços reais com estimativas** para o que não tem preço. Não se conhece parceria com as cadeias. |
| Cadeias | Continente, Pingo Doce e Auchan. O site junta o Lidl, que não tem loja online em Portugal: deve ser só uma parte. |
| Preço | **Grátis:** até 2 pessoas, 4 semanas por mês, 1 receita importada por semana e **preços de 1 supermercado**. **Plus**, 6,99 €/mês ou 49,99 €/ano: vários supermercados. **Pro**, 14,99 €/mês ou 99,99 €/ano: a lista dividida por supermercado e o histórico de gastos (diz o site). |
| Números | Os fundadores falam em cerca de 25 mil utilizadores e 150 mil refeições planeadas. No Google Play tem 5 mil+ downloads. As avaliações são 30 no total, escolhidas pelo site. O «à frente do ChatGPT» foi o ranking de instalações durante cerca de uma semana. |
| Quem | Dois fundadores portugueses (Duarte Cruz e Lucas Vicente). É recente: a PC Guia destacou-a em outubro de 2026. Financiamento: não encontrado. |

**O que faz bem, e a Compras não pode perder:**
- começa pela ementa e pelo orçamento, porque a pessoa pensa em refeições e não em produtos;
- faz a «semana mais barata possível» quando o orçamento não chega;
- importa receitas;
- aproveita o que há em casa;
- dá a data de cada preço.

**Onde fica aquém:**
- **A comparação, que é a razão para poupar, é paga.** O plano grátis mostra 1 supermercado e dividir a lista entre
  lojas só existe no Pro (14,99 €/mês). O Super Save e o Kabaz comparam de graça.
- **Mistura preços reais com estimativas** no mesmo total.
- **Os preços são os das lojas online.** Não encontrámos leitura de talões. O Lidl, o Aldi e a Mercadona, que não
  vendem online, ficam de fora ou ficam pela metade. O preço na loja física pode ser outro.
- **Não encontrámos nada que diga se a promoção é verdadeira** (a regra dos 30 dias do Decreto-Lei 109-G/2021).
- **Não sabe quanto se gastou de facto**, por isso não consegue provar a poupança.
- **O agregado grátis é de 2 pessoas.**

## Os outros em Portugal

| App | O que faz | O que lhe falta |
|---|---|---|
| **Super Save** | Compara de graça por nome, marca ou código de barras, com histórico, listas, alertas e folhetos. No Google Play tem 100 mil+ downloads e cerca de 4,0 a 4,4 (4 mil avaliações). | Não tem ementas nem planeamento. Há queixas de instabilidade e de ecrã carregado. |
| **Kabaz** (KuantoKusta, 2024) | A partir de uma lista, diz onde o cabaz fica mais barato, dividido por mais de uma loja. | Em 2024 não tinha o Pingo Doce. Não tem ementas nem talões. |
| **DECO PROteste «Saber Poupar»** | Diz qual é o supermercado online mais barato por concelho e acompanha um cabaz de 63 produtos desde 2022. | Só cobre lojas online, não tem lista própria nem ementas e pede registo. |

Ninguém junta as quatro coisas: **ementa, preços de todas as cadeias, talões e prova da poupança.** É aí que entra a
Compras.

## O que a Compras faz melhor

| O que falta lá fora | Como fica na Compras |
|---|---|
| Comparar é pago (PlanMyMeals) | Tudo é grátis, para a casa toda e para quem convidares. Sem planos e sem anúncios. |
| 3 ou 4 cadeias, só com preços online | Continente, Pingo Doce e Auchan pelas lojas online, mais uns 500 produtos do Lidl. O resto do Lidl e o Aldi pelos **folhetos, lidos pelo Ecónomo** (o Claude lê imagens, como lê o satélite na Meteo). A Mercadona, o Intermarché e o preço real de cada loja pelos **talões**. Foi isto que a volta 1 provou. |
| Preços estimados no meio dos reais | Cada preço diz **de onde vem e de quando** (online, folheto ou talão). Um cabaz só é «o mais barato» quando há preço para quase tudo, e o que falta é indicado. |
| Dividir por lojas, sem mais nada | **Onde compro:** a melhor combinação de 1, 2 ou 3 das tuas lojas, contando o custo de ir a mais uma, os cartões e as promoções válidas no dia em que vais. Corre no telemóvel, sem rede. |
| Não se sabe se a promoção é verdadeira | **Promoção verdadeira?** Mostra o preço mais baixo dos últimos 30 dias, tirado do nosso histórico, ao lado do «antes» da loja (a regra do Decreto-Lei 109-G/2021). Fica fiável ao fim de 30 dias de recolha. |
| Não se sabe quanto se gastou | **Talões:** com uma fotografia, a app fica a saber o que compraste, quanto pagaste e onde. A despensa e o gasto do mês atualizam-se sozinhos. |
| A poupança contada pelo «preço antes da promoção» | **Poupança honesta:** compara o que pagaste com o que o mesmo cabaz custaria na tua loja de sempre, no mesmo dia. |
| Ementas de molde | **A Semana com o Ecónomo** (bónus, na última volta): a ementa nasce das promoções desta semana nas tuas lojas e do que tens na despensa, e respeita quem come e o tempo que há para cozinhar. Trocar um prato é na hora (⇄), como trocar uma faixa na Música. Aprende com o que gostas e com o que compras. |
| Uma lista para uma pessoa | **Lista da casa:** partilhada entre telemóveis, abre sem rede na loja e fica arrumada por loja e por corredor. O botão «Partilhar no WhatsApp» manda-a para o grupo da família. |

## O formato: tudo na app

A interação é toda na app, como na Mercados, na Meteo e na Música. Não há bot no WhatsApp, porque precisava de uma
conta na Meta e de um número próprio, os avisos pagavam-se à mensagem e as mensagens passavam pelos servidores da Meta.

| Momento | Na app |
|---|---|
| «Acabou o azeite» | A app abre do ecrã principal direto na lista. Escreve-se, ou dita-se pelo microfone do teclado, e a IA arruma. No iPhone, um Atalho da Siri («junta azeite à lista») manda o texto ao conector sem abrir a app. No Android, carregar no ícone da app dá «Juntar à lista». |
| O talão depois das compras | Fotografa-se com a câmara na app. No Android, a fotografia também se pode partilhar da galeria para a app. |
| Pedir a ementa (bónus) | Pede-se na Semana, e a app avisa quando o Ecónomo acabar. |
| Avisos de promoções | Chegam como notificações da app, como na Meteo. No iPhone, só com a app adicionada ao ecrã principal. |
| O grupo da família no WhatsApp | O botão «Partilhar no WhatsApp» manda a lista ou a ementa como texto, pelo WhatsApp de cada pessoa, sem API e sem custo. |

Se um dia o bot fizer falta, liga-se ao mesmo conector sem mexer no resto.

## Como fica feita (igual às outras três)

| Peça | O que faz | Onde corre |
|---|---|---|
| **A app** (`compras/`) | Três separadores: Lista, Semana e Casa. É uma PWA instalável que abre sem rede, com a lógica em Onda, feita a partir do `onda/molde`. | GitHub Pages (`…/escolaplay/compras/`) |
| **O motor** (`compras/onda/`) | Faz as contas: preço por kg e por litro, que embalagens chegam, onde compro, o ritmo da despensa e a poupança. São as mesmas contas na app e nos scripts, com testes de paridade como na Música. | no telemóvel (wasm) e no Node |
| **O conector** (`compras/proxy/`, Worker `compras`) | Lê os sites das cadeias e os folhetos, aos poucos e pelo cron, como a Meteo lê pelo conector o que o browser não pode ler. Guarda a casa e os telemóveis (só o hash do segredo de cada um), a lista partilhada, os talões, os pedidos e as notificações. Não faz contas: guarda e passa dados. | Cloudflare (plano grátis) |
| **A IA na hora** (Workers AI, no conector) | Lê uma lista escrita à pressa («2 leites, pão, fruta p/ semana»), lê um talão e faz o rascunho de uma ementa. | Cloudflare (grátis até 10 000 «Neurons» por dia, partilhados com a Música) |
| **O Ecónomo** (tarefa do Claude, `ECONOMO.md`, scripts em `compras/economo/`) | Revê os preços que o conector recolheu, lê os folhetos, decide que produtos são o mesmo entre cadeias, revê os talões duvidosos e faz as ementas pedidas. | a tua subscrição do Claude, uma corrida de cada vez |
| **A base de dados** | Guarda os preços e o histórico, a casa, a lista e os talões. A D1 é a recomendada (explicação abaixo). | Cloudflare |

**O Claude escolhe e o motor faz as contas.** O Ecónomo decide os pratos, os produtos e as equivalências. Os totais,
os preços por kg e a poupança vêm sempre do motor. O `publicar.mjs` recusa um preço que não esteja na base ou uma
conta que não bata, como o da Meteo recusa frases sobre a região.

**Porquê a D1 e não só a KV.** As 1000 gravações por dia da KV grátis são **da conta toda**, e a Mercados, a Meteo e a
Música já as partilham. Uma lista riscada na loja grava muitas vezes. A D1, a base de dados SQL da Cloudflare, também é
grátis, aceita muitas mais gravações por dia (a confirmar na volta 1) e guarda o histórico de preços em tabelas.
Precisa de uma permissão nova no token da Cloudflare (D1 → Edit), que só tu podes dar. Hoje o token não a tem. Sem ela,
a volta 2 começa na KV, com as gravações juntas, e passa para a D1 depois. **Feito na volta 3:** a permissão foi dada a 14/11/2026 e a KV ficou só com o índice de cada cadeia.

## De onde vêm os preços

**O universo, não o catálogo todo.** Tal como a Mercados tem o seu universo de ativos, a Compras acompanha só os
produtos que interessam: os que estão nas listas, nas ementas e nos talões das casas, mais os essenciais de cada
categoria. O cabaz de 63 produtos da DECO é um bom ponto de partida para os testes. São uns poucos milhares de
produtos, que cabem inteiros no telemóvel (umas centenas de KB por dia). Por isso a pesquisa e o «onde compro»
funcionam na loja sem rede. Como se recolhe só uma parte pequena de cada catálogo, também baixa o risco legal.

**O índice vem dos mapas do site; os preços, só do que está nas listas.** Os mapas do site do Continente, do Pingo
Doce, do Auchan e do Lidl trazem o nome de cada produto no endereço («leite-uht-meio-gordo-mimosa-4421406»), e o
robots.txt deixa lê-los. Chegam para procurar sem a pesquisa dos sites, que o robots.txt fecha. Os preços pedem-se uma
vez por dia, só para os produtos que estão nas listas das casas.

| Cadeia | De onde | O que a volta 1 provou (14/11/2026) |
|---|---|---|
| Continente, Pingo Doce, Auchan | as páginas de produto (no Auchan, o JSON do produto), lidas pelo conector aos poucos, ao longo do dia | ✔ deixam ler (ver «O que cada cadeia deixa») |
| Lidl | uns 500 produtos com preço no site; o resto pelos folhetos da semana (lidos pelo Ecónomo) e pelos talões | ✔ o site lê-se; os folhetos ficam para a volta 6 |
| Aldi | os folhetos da semana e os talões | ✔ as páginas de produto abrem, mas não têm preço |
| Mercadona, Intermarché, Minipreço | só os talões | a Mercadona recusa o Worker, o Intermarché fecha tudo no robots.txt e o site do Minipreço não responde |
| Todas | os **talões** das casas: o preço real daquela loja, naquele dia | se cada cadeia tem um talão que se lê bem (volta 5) |
| Nomes, marcas, códigos de barras, fotografias | o Open Food Facts (base aberta, com atribuição) | ✔ tem 23 976 produtos de Portugal |

O QR code das faturas (Portaria 195/2020) traz quem vendeu (o NIF), a data e os totais, mas não os produtos. Serve
para confirmar o talão lido, não para o ler (a confirmar no PDF da AT).

## O que cada cadeia deixa (volta 1, 14/11/2026)

Experimentado a partir do Worker `compras`, que se identifica como é, não tenta passar proteções contra robôs e só
pede o que o robots.txt de cada cadeia deixa. Foram umas dezenas de pedidos, um de cada vez.

| Cadeia | O que o robots.txt deixa | O que o Worker conseguiu | Como se lê | O que fica por ver |
|---|---|---|---|---|
| **Continente** | as páginas de produto e os mapas do site (20 000 produtos só no primeiro); a pesquisa não | 3 produtos em 3 (páginas de 1,7 MB, 0,6 a 1,6 s) | JSON-LD: nome, marca, código de barras, preço, validade e disponibilidade. O bloco do preço traz o PVPR e o preço por unidade, e a embalagem vem em «emb. 6 x 1 lt» | a marcação de um preço riscado. A validade vem um ano à frente quando não há promoção |
| **Pingo Doce** | as páginas de produto e os mapas do site (11 469 no primeiro); os controladores (`/on/demandware.store/`) e a pesquisa não | 2 em 2, um em promoção (1,16 €, antes 1,79 €) | o preço e o preço riscado no HTML, e a embalagem com o preço por unidade («0.5 Kg \| 2,52 €/Kg»). Não há código de barras | juntá-lo aos outros pelo nome e pela embalagem |
| **Auchan** | as páginas de produto, os mapas do site (34 370 no primeiro) e o JSON do produto; a pesquisa e os filtros não | 2 em 2 | o JSON do produto (`Product-Variation`): nome, marca, código de barras, preço, preço riscado, validade e preço por kg. A página não mostra o preço sem uma loja escolhida | a disponibilidade, que depende da loja (o Auchan escolhe uma por omissão) |
| **Lidl** | as páginas de produto (532 no mapa do site) e os folhetos | 2 em 2 | o preço e o dia na descrição da página; o nome e a marca no JSON-LD. Não há código de barras | o resto do sortido, pelos folhetos (servidos por `leaflets.schwarz`) e pelos talões |
| **Aldi** | quase tudo (491 produtos no mapa do site) | as páginas abrem, mas não têm preço | — | os folhetos (não aparecem na página inicial) e os talões |
| **Mercadona** | o site institucional | recusa o Worker (403), na página inicial e no mapa do site | — | só os talões; não tem loja online em Portugal |
| **Intermarché** | **nada**: o robots.txt fecha o site todo (`Disallow: /`) | não se tentou | — | só os talões |
| **Minipreço** | — | o site não responde (erro 1016 da Cloudflare: o servidor de origem não existe) | — | só os talões |
| **Open Food Facts** | uma API aberta | 23 976 produtos de Portugal. O código de barras do leite Mimosa dá «Leite Meio-Gordo, 6 x 1 l» | nomes, marcas, embalagens e fotografias por código de barras | a atribuição que a licença (ODbL) pede |

Os folhetos estão em `folhetos.continente.pt`, `folhetos.pingodoce.pt`, `leaflets.schwarz` (Lidl) e no visualizador
do Auchan (que também tem os produtos do folheto como categoria). A página de 1,7 MB do Continente lê-se em cerca de
1,5 ms, porque as fontes procuram o marcador e só leem esse pedaço. No Worker grátis não houve erros de CPU.

## O motor: onde compro

O motor experimenta todas as combinações das tuas lojas, de 1 a 3. Com 8 lojas são 92 combinações. Em cada combinação:
- cada produto vai para a loja mais barata dessa combinação, com a promoção válida no dia, o cartão e a embalagem que
  chega para a quantidade pedida;
- soma-se o custo de ir a mais uma loja (escolhes tu; por omissão, 3 €).

Ganha a combinação mais barata. É uma conta exata, sem adivinhar, e faz-se num instante no telemóvel. Por exemplo:

> Continente + Lidl: **63,40 €** (14 produtos no Continente e 9 no Lidl). Poupas 8,20 € face a fazer tudo no
> Continente. 2 produtos não têm preço no Lidl: estão estimados e marcados.

## O Ecónomo (o Claude)

Segue o `ECONOMO.md`, como o Analista segue o `ANALISTA.md`:

1. `NODE_USE_ENV_PROXY=1 node compras/economo/dados.mjs` lê do conector os preços do dia, descarrega por ele os
   folhetos novos e mostra o que precisa de cabeça: produtos novos sem par, linhas de talão duvidosas e pedidos de
   ementa (com a casa, a despensa e as promoções nas lojas dela).
2. O Claude lê os folhetos (imagens, com `limit: 1`), decide os pares, revê as linhas e escreve as ementas em
   `/tmp/compras/*.json`.
3. `node compras/economo/publicar.mjs` valida (preços que existem, datas, restrições da casa, contas do motor) e grava.

Corre uma vez por dia, de madrugada, para os preços e os folhetos. Corre também **na hora** quando alguém pede uma
ementa, pelo gatilho «API» da tarefa, como o Maestro e a Meteo. Esse gatilho é um endereço da própria tarefa agendada e
corre na tua subscrição: não é a API paga do Claude. Faz uma corrida de cada vez, no máximo 4 por hora e 12
por dia. Guarda **lições** sobre cada casa (o que se come, o que se deita fora, a marca que não se troca), como a Meteo
guarda lições sobre cada local.

## As dez voltas

| # | O que muda para ti | Por dentro |
|---|---|---|
| **1** ✔ | Nada à vista: ficou a saber-se que cadeias entram (tabela «O que cada cadeia deixa»). | O Worker `compras` 0.2.0, publicado em teste, tem `/sonda` e `/sonda/produto`: só com o segredo, só nos domínios das cadeias e só onde o robots.txt deixa. Tem quatro fontes em `proxy/src/fontes/` (Continente, Pingo Doce, Auchan e Lidl), testadas com excertos reais das páginas (23 testes). O ambiente do Claude chega ao Worker (aprovado a 14/11/2026). Nenhuma cadeia que interessava recusou o Worker, por isso não foi preciso abrir sites no ambiente. |
| **2** ✔ | **A lista da casa:** escreves como te sai («2 leites, pão de forma e ovos») e a app separa as coisas e a quantidade. Tocar numa coisa abre a folha com os produtos parecidos em cada supermercado, e escolhes o de cada um. A lista partilha-se com o código da casa (ou com o link «Convidar pelo WhatsApp») e abre sem rede: o que se muda sem rede segue quando a rede voltar. «Partilhar no WhatsApp» manda a lista para o grupo da família. Separadores **Lista · Mais barato · Casa**. | A app é `app/compras.onda` (382 linhas, 70 KB em WebAssembly), montada com `compilar.mjs`. O conector 0.3.0 tem `/api/aparelho`, `/api/casa`, `/api/casa/entrar`, `/api/lista` (mudanças que se podem reenviar sem estragar nada) e `/api/procurar` (uma cadeia por pedido; o índice fica na memória do Worker). O Ecónomo fez o índice a partir dos mapas do site (`economo/indice.mjs`): Continente 59 852 produtos de supermercado (de 105 399), Auchan 26 730, Pingo Doce 13 349, Lidl 532. A procura demora no máximo 5 a 8 ms por cadeia. Há 42 testes; o da interface corre no Chromium com o conector a sério. **Diferente do previsto:** separar o texto não precisou da IA (é na app, na hora e sem rede); a lista está na KV porque falta a permissão D1; «qualquer marca» e «marca branca serve» passam para a volta 4; o Atalho da Siri fica para depois. |
| **3** ✔ | **Mais barato:** o total da tua lista em cada supermercado (Continente, Pingo Doce, Auchan e, onde houver preço, Lidl), com o que falta em cada um à vista. Por baixo, diz se compensa dividir por duas lojas e quanto se poupa. A lista arruma-se pela loja escolhida. | O cron do conector pede uma vez por dia os preços dos produtos que estão nas listas, com as quatro fontes da volta 1. O motor em Onda (`onde.onda`) faz as contas no telemóvel, com testes de paridade em JavaScript. Um cabaz só é «o mais barato» quando há preço para quase tudo. **Feito a 15/11/2026:** a casa, a lista e os preços estão na D1 (`compras`, `migrations/0001_casa_lista_precos.sql`); a lista grava-se só se ninguém a mudou entretanto (a versão), senão aplica-se outra vez por cima. O preço lê-se logo quando se escolhe o produto (até dois por pedido; ao vivo, cerca de 3 s com dois) e o cron de dez em dez minutos lê os que têm mais de 20 h, um por cadeia de cada vez (cada site recebe no máximo um pedido a cada dez minutos). Um pedido falhado espera meia hora, depois uma, duas… até um dia. A lista vem para a app com o preço em cêntimos ao lado de cada produto; a folha mostra o preço, o riscado das promoções e o preço por unidade; a lista mostra o preço de cada supermercado para a quantidade. O motor está em `app/onde.onda` (a app tem 473 linhas e 77 KB) e o `tests/ui.test.mjs` confere as contas com as mesmas em JavaScript. Conector 0.4.0, app 0.2.0, 49 testes. **Diferente do previsto:** só se comparam os supermercados com preço para *tudo* (não «quase tudo»): um total com coisas a menos parecia sempre mais barato; dividir por duas lojas só aparece quando se poupa pelo menos 2 € (ou quando nenhuma loja sozinha tem tudo); arrumar a lista pela loja passa para a volta 4; as lojas e os cartões ficam para quando disseres quais são. |
| **4** ✔ | **Trocas que poupam:** para cada produto, o equivalente mais barato noutra marca ou na marca branca («a marca branca do Pingo Doce custa menos 0,40 €»), e o preço por kg ou por litro para comparar embalagens diferentes. | O Ecónomo junta os produtos iguais e os equivalentes entre cadeias: pelo código de barras quando há, pelo nome e pela embalagem no resto. Sai o primeiro `ECONOMO.md`. **Feito a 15/11/2026:** o preço por quilo, por litro ou por unidade de cada produto (o que a cadeia mostra ou, se não mostra, pela embalagem e pelo nome: «emb. 6 x 1 lt», «4x125g», «75cl»), guardado na D1 (`migrations/0002`). A folha de cada coisa mostra o preço dos produtos parecidos de cada supermercado (`/api/precos`: os conhecidos logo e, dos que faltam, no máximo dois por pedido) e marca «o mais barato por litro» (ou por quilo), para trocar de marca ou de embalagem. «Vou a este» no «Mais barato» arruma a lista por essa loja: o total lá, primeiro o que tem preço e no fim o que lá não tem. Ao vivo, os preços de uma procura chegam em cerca de 1,5 s por cadeia. Um preço de 0 € (o Pingo Doce mostra-o assim) conta como sem preço. Conector 0.5.0, app 0.3.0, 52 testes. **Diferente do previsto:** a troca é dentro de cada supermercado, entre os produtos parecidos da procura; juntar os produtos iguais entre cadeias pelo código de barras (o Ecónomo e o `ECONOMO.md`) fica para a volta 5, com as promoções; os cartões ficam para quando disseres quais tens. |
| **5** ✔ | **Catálogo e escrita:** escreves «ág» e aparece «Água sem gás»; tocas e escolhes o tamanho (os que há em mais supermercados primeiro), a marca ou «🏷 Marca branca», e vês o mais barato de cada supermercado, por litro ou por quilo, com o melhor marcado. «Juntar à lista» põe a coisa na lista já com o produto de cada um. Na lista, o 🏷 diz que é a marca própria da loja. | **Feito a 15/11/2026 (por publicar):** as páginas de categoria do Continente, do Pingo Doce e do Auchan trazem dezenas de produtos de uma vez (nome, marca, preço, embalagem e preço por unidade); o robots.txt deixa-as (sem paginar) e, no Continente, as páginas de cada marca, que estão no mapa do site. `src/catalogo.js` lê-as (2 ms para os 2,5 MB do Continente) e guarda os produtos na tabela preco com o tipo (`migrations/0003`). Os tipos: 38 feitos à mão para o cabaz da casa (`economo/tipos-casa.json`: as cadeias não arrumam as categorias da mesma maneira) e mais 128 cruzados pelo nome da categoria (`economo/tipos.mjs`): 1 697 páginas. O cron passa a ser de dois em dois minutos: aos minutos redondos os preços das listas, nos outros uma página de uma cadeia, à vez (cada site recebe um pedido a cada seis minutos; as páginas de categoria releem-se todos os dias, as de marca uma vez por semana). `/api/sugerir` e `/api/tipo` (`src/sugerir.js`). Conector 0.6.0, app 0.4.0, 61 testes. **Diferente do previsto:** a «regra» de cada coisa (esta marca, equivalente, o mais barato) e a escolha automática da melhor forma de comprar a quantidade (packs) ficam para a volta 6. |
| **6** (em parte) | **Talões e Mercadona:** tiras uma fotografia do talão, revês o que a app leu, e ficam o gasto, a loja e o preço real; o que compraste risca-se sozinho. A Mercadona entra com uma estimativa portuguesa (a marca branca equivalente nas outras lojas), marcada «≈», que os teus talões da Mercadona corrigem por categoria. E a melhor forma de comprar a quantidade (6 leites: pack ou soltos). | `/api/talao` no conector, com uma IA que lê imagens (a da Cloudflare); o Ecónomo revê o que ficou por ler. O site da Mercadona só deixa ler o nome dos produtos (a API do preço está fechada no robots.txt). **Feito a 15/11/2026:** cada coisa juntada pela escolha guarda o que é (o tipo, o tamanho e a marca, ou a marca branca) e o conector, uma vez por hora (ao minuto 30 do cron), troca o produto de cada cadeia pelo que passou a ser o mais barato por unidade de medida (`src/escolhas.js`); o que se escolhe à mão na folha fica como está. A Mercadona aparece com a estimativa «≈» (a mediana da marca branca do mesmo tipo e tamanho nas outras cadeias), na lista e numa caixa à parte no «Mais barato», que nunca a dá como a mais barata. Conector 0.7.0, app 0.5.0, 64 testes. **Talões (15/11/2026):** «📷 Talão» na lista: a fotografia reduz-se no telemóvel (1600 px, JPEG) e a IA da Cloudflare (`llama-4-scout`, que lê imagens) devolve a loja, o dia, o total e as linhas; o talão fica guardado na casa (`migrations/0004`, sem a fotografia) e o que vem nele risca-se na lista (as abreviaturas «S/GAS» e «C/GAS» percebem-se; nas coisas da escolha conta o tipo). Ao vivo, um talão de teste leu-se certo em 5,6 s. Conector 0.8.0, app 0.6.0, 67 testes. **As tuas lojas (15/11/2026):** no separador Casa escreve-se onde se mora e escolhem-se as lojas (Continente, Pingo Doce, Auchan, Lidl, Mercadona, SPAR); o «Mais barato», o «dividir por duas lojas» e as estimativas só contam com elas (`migrations/0005`, `src/lojas.js`). O SPAR não tem loja online (o site tem os folhetos e a lista das 176 lojas, que `economo/lojas.mjs` guarda na KV): entra com uma estimativa «≈» (a mediana das marcas de fabricante do mesmo tipo e tamanho), com o nome da loja escolhida. Conector 0.9.0, app 0.7.0, 69 testes. **O que costumas comprar (15/11/2026):** dos talões dos últimos 120 dias tira-se o que se compra e de quanto em quanto tempo (`src/costume.js`, `/api/costume`); na lista aparece «Costumas comprar», com o que está a acabar primeiro (a amarelo) e sem o que já lá está, e um toque junta. Cada coisa da lista tem um ✕ para a tirar. Conector 0.10.0, app 0.8.0, 73 testes. **A lista arrumada (15/11/2026):** a lista agrupa-se por secções, pela ordem em que se anda na loja (fruta e legumes, padaria, charcutaria, talho, laticínios, mercearia, bebidas, congelados, limpeza, higiene, animais, outros: `src/seccoes.js`, pelo tipo da escolha ou pelas palavras); cada secção diz quantas coisas tem e fecha-se com um toque; o que se risca desce para «No carrinho», fechado no fundo. Cada linha mostra só o mais barato das tuas lojas e em quantas mais há, com − e + para a quantidade. Com 100 coisas, desenhar a lista leva cerca de 4 ms. Conector 0.11.0, app 0.9.0, 73 testes. **Estimativas explicadas (15/11/2026):** na escolha, depois das cadeias, aparecem a Mercadona e o SPAR (se estão nas tuas lojas): o preço do teu talão mais recente dessa loja com uma linha do mesmo tipo (a azul, com o dia e a linha) ou, sem talão, a estimativa «≈» do tamanho escolhido (ou por litro/quilo), com o porquê: a Mercadona não vende online em Portugal e não usamos preços de Espanha; o SPAR não tem loja online e é franquiado, cada loja com os seus preços. Conector 0.12.0, app 0.10.0, 73 testes. **Talho e palavras (15/11/2026):** tipos da casa para o talho (carne picada, novilho e vitela, frango, porco, peru, borrego e cabrito); a escrita procura também nos nomes dos produtos («picanha», «estufar», «carne»: os tipos onde há produtos com essas palavras, já com a palavra escolhida); na escolha, uma fila «Corte ou variante» com as palavras que distinguem os produtos do tipo (as mais comuns, sem as do tipo, das marcas e das medidas), que fica no que a coisa é e conta na troca de hora a hora. Conector 0.13.0, app 0.11.0, 73 testes. **A árvore (15/11/2026):** Secção › Tipo › Variante › Tamanho › Marca. Escrever «pão» mostra primeiro «Padaria ›» e os tipos de pão; tocar na secção mostra todos os tipos dela (`/api/seccao`); com o campo vazio, «☰ Ver por secções». Duas palavras («pão milho») dão o tipo com a variante já escolhida. Tipos da casa novos para a padaria (pão do dia e broa, pão de hambúrguer e cachorro, croissants e pães de leite, tostas). A procura pelos nomes só conta os tipos onde a palavra é comum. Conector 0.14.0, app 0.12.0, 73 testes. **O caminho na árvore (15/11/2026):** no topo da escolha, o caminho com uma cor por nível: Todas › secção (azul) › tipo (verde) › variante (amarelo) › tamanho (lilás) › marca (cinzento); tocar num nível volta a ele (a secção mostra os tipos irmãos, «Todas» as 12 secções). Os botões das sugestões têm as mesmas cores, e na lista cada coisa mostra o tipo a verde (e a secção, quando a lista está por loja). Peixaria: peixe fresco, peixe congelado, bacalhau, marisco e polvo, lulas e choco. Conector 0.15.0, app 0.13.0, 73 testes. **Preços comparáveis (15/11/2026):** na escolha, todas as linhas na mesma unidade (a do tipo: €/kg ou €/L) em grande, e por baixo «Pagas 1,81 € por 150 g» (o que se paga conta, a comparação fica à vista); o «mais barato» e o «+X%» só entre preços na mesma unidade. Ao balcão e ao peso, as cadeias dão o preço do quilo onde se esperava o da embalagem (o Continente com o «por unidade» da porção, o Pingo Doce com «2,49 €/Kg» na fruta, o Auchan com «… KG» sem peso): `normaliza` (precos.js) passa a pagar a porção e a comparar ao quilo, no catálogo e no cron; `economo/normalizar.mjs` corrigiu uma vez as 2 271 linhas já guardadas. As embalagens escrevem-se igual («150 g», não «0,15 kg»). A Mercadona e o SPAR: a estimativa na mesma unidade, «Pagarias ≈ 1,49 € por 150 g», quanto fica acima ou abaixo do mais barato, e a base (o mais barato de cada cadeia nesse tamanho). Conector 0.16.0, app 0.14.0, 75 testes. **Carne e peixe como grupos (15/11/2026):** «carne» não é um tipo, é o talho todo: escrever «carne» mostra a secção, todos os tipos do talho (também o frango, o peru e o borrego, que não têm «carne» no nome; sem os cruzados que repetem um da casa) e, numa linha à parte a amarelo, os cortes e os usos mais comuns nos nomes dos produtos (para estufar, para cozer, para assar, bife, entrecosto, lombo, picanha, costeleta, peito…), cada um no tipo onde há mais produtos com ele; tocar abre esse tipo com o corte já escolhido. «peixe» faz o mesmo com a peixaria (posta, filete, lombo, para cozer…). Conector 0.17.0, app 0.15.0, 76 testes. O tipo do bovino chama-se «Carne de vaca, novilho e vitela» (as cadeias juntam tudo numa categoria: a picanha é de vaca) e encontra-se também por «vaca», «bovino», «vitelão» e «angus» (conector 0.17.1, 77 testes). **As etiquetas do Ecónomo (15/11/2026):** o talho e a peixaria estruturados pelo Claude a partir dos nomes reais dos 1 384 produtos: o animal ou a espécie (vaca, novilho, vitela, porco preto, frango, pescada, salmão, camarão…), o corte (picanha, vazia, acém, cachaço, entrecosto, secretos, postas, lombos, filetes…) e os usos que as cadeias não escrevem (a picanha é de grelhar e assar, o acém de estufar e cozer, a perna de assar). `src/etiquetas.js` é conhecimento, não estatística: corre no Worker em cada pedido (microssegundos), sem IA paga; 1 360 dos 1 407 produtos ficam com corte ou animal e uso, e `economo/etiquetas.mjs` lista os que faltam para o Ecónomo rever de semana a semana. Na escolha, três filas: «Para quê» (grelhar, assar, estufar, cozer, fritar), «Corte» e «Animal ou espécie»; o caminho e a lista mostram o nome legível («para grelhar»). «carne» e «peixe» dão os usos primeiro. A troca de hora a hora também filtra pelas etiquetas. Conector 0.18.0, app 0.16.0, 78 testes. **Peças inteiras ao quilo (15/11/2026):** uma picanha inteira de 1,8 kg vem com «17,99 €» que é o preço do quilo, e o «por quilo» saía a metade (9,99 €/kg). O Ecónomo reconhece-as pelos vizinhos do mesmo corte (com 1 kg ou mais, o «por quilo» abaixo de 75% da mediana das embalagens pequenas e o preço parecido com esse quilo): passa a 17,99 €/kg e «Pagas ≈ 32,38 € por ≈ 1,8 kg · vende-se ao quilo». No Pingo Doce, o «€/Kg» do preço vale também para as peças de mais de 1 kg. Conector 0.18.1, app 0.16.1, 79 testes. **Carapau (15/11/2026):** o Continente escreve «4,49 €/kg» no preço do peixe fresco, da fruta e da carne ao peso, com o peso médio na quantidade («Quant. Mínima = 630 gr»): passa a contar como ao quilo (paga-se ≈ 2,83 €). Com um corte ou variante escolhida («carapau»), a estimativa da Mercadona e do SPAR é a desses produtos e não a do tipo todo (antes dava ≈ 19,95 €/kg, a do salmão). Conector 0.18.2, app 0.16.2, 80 testes. **A árvore do talho e da peixaria (15/11/2026):** a secção tinha os tipos todos ao mesmo nível (carne, peixe e picada misturados, repetidos e com nomes trocados pelo cruzamento automático: «Peru» que eram espetadas, «Massas e gnocchis» que eram refeições de peixe). Agora vai por ramos: Talho e peixaria › Carne (vaca, porco, frango, peru, borrego) · Picada e preparados (picada, hambúrgueres, espetadas, salsichas) · Peixe (fresco, congelado, bacalhau, pescada) · Marisco (marisco; polvo, lulas e choco); cada ramo com o título, na secção e ao escrever «carne» ou «peixe». Dentro do tipo, os níveis por ordem: espécie ou animal (carapau, pescada…), depois o corte e o uso; escolhe-se a espécie e o corte ao mesmo tempo («carapau» e «para grelhar»), e escolhida a espécie só aparecem os cortes e usos dela. O caminho mostra os dois níveis. Conector 0.19.0, app 0.17.0, 80 testes. No talho e na peixaria, o tamanho vem depois da espécie, do corte e do uso; um peixe inteiro tem também os usos da espécie (carapau inteiro: de grelhar); um teste da app percorre «peixe» › Peixe fresco › carapau › para grelhar (conector 0.19.1, app 0.17.1, 81 testes). **Volta 7, a base revista (15/11/2026):** o Worker valida a sua base. Sempre que lê uma página de categoria revê o tipo dela (`src/revisao.js`; de uma vez com `/sonda/revisao`): marca como suspeitos (`migrations/0006`, coluna `preco.suspeito`) os produtos que não podem entrar nas comparações — «tipo» (no talho, o animal do nome não é o do tipo: costela de porco no tipo da vaca) e «unidade» (o preço por quilo ou litro não bate com o preço e a embalagem por mais de três vezes: um dos dois está mal lido) — e os suspeitos saem da escolha, da troca de hora a hora e das estimativas. Não se marca um preço só por ser diferente (o sal grosso a 0,29 €/kg e o wagyu a 139 €/kg são verdadeiros). Dá nome aos tipos cruzados que não condizem com a chave, e o nome vem da categoria mais comum da página (antes vinha do primeiro produto: «Massas e gnocchis» no tipo «peixe»). A leitura das embalagens percebe os packs do Auchan sem vírgula («4X150L» é 4 × 1,5 L, «6X33L» é 6 × 0,33 L) e o «&times;». Na base: 46 suspeitos em 14 562 produtos. Conector 0.20.3, 84 testes. **O que distingue cada produto (15/11/2026):** na comparação, cada supermercado mostra a marca (ou «🏷 marca branca») e os sinais do nome (`src/qualidade.js`): a verde o que o põe acima (massa mãe, biológico, DOP/IGP, do campo, tradicional, gama superior, maturado, produção local, nacional, fresco), a vermelho o que o põe abaixo (congelado, gama económica, preparado), a cinzento o resto (sem glúten, sem lactose, magro): vê-se que não se compara o mesmo. Conector 0.21.0, app 0.18.0, 85 testes. **A origem (15/11/2026):** no talho e na peixaria, uma fila «Origem» a seguir à espécie, quando o nome o diz (não se adivinha): peixe selvagem (pesca: da costa, de anzol, MSC) ou de aquacultura (viveiro, ASC); carne biológica, do campo (ao ar livre), DOP/IGP e raças autóctones (Carnalentejana, Mertolengo, Barrosã, Maronesa), montanheira (bolota). Escolhe-se com a espécie e o corte («dourada › selvagem › para grelhar»), e os sinais de qualidade mostram-na. Conector 0.22.0, app 0.19.0, 86 testes. **Vários tamanhos (15/11/2026):** no «Tamanho» escolhem-se vários (6 L e 5 L): a comparação é por litro entre eles e vê-se qual compensa em cada supermercado; o caminho diz «6 L + 5 L» e tocar outra vez tira. Fora do talho e da peixaria, a fila chama-se «Variante» (e não «Corte ou variante»). App 0.20.0, 86 testes. **Os artigos do SPAR (15/11/2026):** o SPAR não publica preços, mas a «lista de compras» do site traz os 5 490 artigos que vende (930 da marca SPAR), com a marca e o tamanho. `economo/spar.mjs` liga cada um ao mesmo produto nas outras cadeias (a mesma marca, o mesmo tamanho e as mesmas palavras que distinguem: o risotto Bom Sucesso não é o agulha) ou, nos da marca SPAR, à marca branca equivalente do mesmo tipo e tamanho (o basmati com basmati), e grava-os na D1 (`migrations/0007`, tabela spar_artigo): 1 551 ligados a um tipo, 419 ao mesmo produto e 194 à marca branca equivalente. Na escolha, a linha do SPAR diz o que lá há dos tamanhos escolhidos, com a marca SPAR primeiro e a estimativa de cada um («Arroz SPAR Basmati 1kg — ≈ 1,89 € (a marca branca equivalente)»). Conector 0.23.0, app 0.21.0, 86 testes. **O modo simples (15/11/2026):** para quem tem dificuldade em escrever no teclado do telemóvel. Liga-se no separador Casa e fica só nesse telemóvel (a lista é a mesma da casa): letra e botões maiores; no topo o que costumas comprar (um toque junta); as secções numa grelha de botões grandes com ícones (🥬 🥖 🥩 🧀 🥛 🥫 🧃 🧊 🧽 🧴 🐾), que mostram os tipos da secção e a escolha por toques; o campo de escrever fica por baixo, com a dica do 🎤 do teclado (falar «leite, pão, ovos» entra na lista como se se escrevesse). App 0.22.0, 87 testes. O bife da vazia a «82,32 €/kg» era 27,99 €/kg numa embalagem de 340 g lida antes de se perceber o «€/kg» do Continente: o conector percebe também as embalagens pequenas com o preço do quilo (o «por quilo» mais de 2,5 vezes o dos vizinhos do mesmo corte e o preço parecido com o quilo deles), e as páginas de marca do talho, da peixaria, da fruta e da charcutaria do Continente releram-se (conector 0.23.1, 87 testes). **Outras opções em cada supermercado (15/11/2026):** na escolha, cada supermercado tem «Outras opções no Continente (N) ▾»: os outros produtos desse supermercado que passam nos filtros (até 12, os mais baratos por unidade primeiro), com o preço por unidade, o que se paga e os sinais; tocar num escolhe-o para esse supermercado («✋ escolhido por ti») e vai para a lista como escolha à mão (a troca de hora a hora não o muda). App 0.23.0, 87 testes. **Talões e o mesmo tamanho no «Mais barato» (15/11/2026):** na lista e no «Mais barato», o preço do talão da casa na Mercadona e no SPAR (o mais recente com uma linha do mesmo tipo) passa à frente da estimativa: aparece sem «≈», com «(talão)», e as caixas da Mercadona e do SPAR dizem quantas coisas vêm do talão. Com embalagens diferentes de loja para loja (7 L num, 6 L noutro), o conector manda o preço de cada cadeia para o mesmo tamanho (`comparavel`: o preço por unidade × o tamanho da escolha ou o mais comum); a ordem dos supermercados e o «dividir por duas lojas» comparam por ele, e o total continua a ser o que se paga (uma nota diz quantas coisas se compararam assim). Conector 0.24.0, app 0.24.0, 88 testes. As outras opções ficam arrumadas numa lista compacta a toda a largura: o nome à esquerda, o €/kg em destaque à direita, por baixo o que se paga e os sinais; a escolhida com uma barra azul (app 0.24.1). As marcas da casa do Pingo Doce nos frescos (Nosso Talho, Nossa Peixaria, Nossa Padaria, Nossa Fruta e Legumes) contam como marca branca (221 produtos corrigidos; conector 0.24.1, app 0.24.2). **Ramos em todas as secções (15/11/2026):** fora do talho e da peixaria, os tipos de cada secção agrupam-se em ramos tirados da arrumação das próprias cadeias (o segundo nível das categorias do Continente, ou do Auchan): Mercearia › «Arroz, massa e farinha», «Conservas», «Bolachas e biscoitos»…; Laticínios › «Leites», «Iogurtes e outros lácteos»…, os maiores primeiro. No talho e na peixaria, as «Outras opções» de cada supermercado arrumam-se por corte (com o título; os sem corte em «Outros»). Conector 0.25.0, app 0.25.0, 89 testes. Escolher outra opção já não fecha a lista: a barra azul muda para a tocada, um aviso diz o que ficou («✓ No Continente: …»), e «↺ Voltar ao mais barato» desfaz (app 0.25.1). **A saúde da base (15/11/2026):** `src/saude.js`: por cadeia, as páginas de categoria lidas nas últimas 26 h e as que falham, os produtos e o preço mais recente; os suspeitos; os tipos sem produtos; os artigos do SPAR. Uma cadeia fica «aviso» se se leu menos de 80% das páginas ou mais de 20% falham. Pela sonda (`/sonda/saude`, completo) e pela app (`/api/saude`: no separador Casa, «Os preços» diz há quanto tempo cada supermercado foi lido, com ⚠ se o site mudou). `economo/saude.mjs` escreve o relatório (sai com 1 se há avisos). O README tem o guia «Como manter». Ao vivo: as três cadeias bem (221/224, 181/185 e 191/196 páginas em 26 h), 46 suspeitos, 177 tipos com produtos, 1 551 artigos do SPAR. Conector 0.26.0, app 0.26.0, 90 testes. **Stock do Continente na tua zona (15/11/2026, com a autorização do utilizador para usar o código postal):** o Continente escolhe a loja online pelo código postal com dois pedidos que o robots.txt deixa (`Stores-GetCoverageArea` e `Stores-SetStoreContext`); `src/zona.js` faz o mesmo, guarda os cookies da sessão e lê a página do produto nessa zona. No separador Casa grava-se o código postal (`/api/casa/cp`, `migrations/0008`: casa.cp e casa.zona) e mostra-se a zona («Valongo – WEB – Zn 2» para 4780-521); ao minuto 50 de cada hora, o cron lê na zona os produtos do Continente da lista de uma casa (até 8) e guarda a disponibilidade (tabela zona_stock); os esgotados na zona ficam esgotados na lista e no «Mais barato», com «esgotado na tua zona». O stock das lojas físicas continua a não ser público. Conector 0.27.0, app 0.27.0, 91 testes. **O bacalhau (15/11/2026):** o calibre passa a ser o corte do bacalhau inteiro (corrente, crescido, graúdo, especial; antes era um corte «seco» e as caras de bacalhau «seco» entravam nele); a fila «Origem e preparação» junta o modo de produção, o país (Noruega, Islândia, Pacífico, América do Sul, nacional…) e a preparação (salgado seco ou demolhado); o paloco é outra espécie; os sinais de qualidade dizem «calibre grande», «1.ª qualidade» e «cura longa», e «corrente» já não é «gama económica» (no bacalhau é um calibre). Escrever o nome de um tipo do talho ou da peixaria («bacalhau») mostra a secção, o tipo e os cortes e usos dele. A marca «Asa Branca» deixou de passar por «asas». Conector 0.28.1, app 0.28.0, 92 testes. **Falta:** dar nome certo aos tipos cruzados automaticamente (o nome vem de uma das categorias e às vezes é a errada);  os talões a corrigirem também as estimativas da lista e do «Mais barato», o «Mais barato» por preço unitário, os folhetos do SPAR e a melhor forma de comprar a quantidade. |
| **7** | **Promoções, cartões e avisos:** o que da tua lista está em promoção, em que loja e até quando; o preço com cartão quando a cadeia o publica; o resumo à quinta-feira e o aviso quando um produto que segues baixa. | As promoções vêm das páginas de categoria (já trazem o preço riscado) e dos folhetos do Lidl e do Aldi, lidos pelo Ecónomo. Os avisos usam o `push.js`, como na Meteo. |
| **8** | **Promoção verdadeira?** e o gráfico do preço de cada produto. Podes pedir um aviso quando o azeite baixar de X. | Histórico na base (só as mudanças), que o catálogo já enche todos os dias. |
| **9** | **A poupança honesta e a despensa:** o que pagaste contra o que a mesma lista custaria na tua loja de sempre; o que está a acabar entra sozinho na lista. | O painel e o ritmo de cada produto saem dos talões e das listas. |
| **10** | **Receitas, o bónus:** ementas feitas com o que está mais barato nessa semana e com o que já há em casa, com o custo de cada prato à vista, para não sair mais caro. E tudo revisto. | Pedido → rascunho na hora (Workers AI) → revisão do Ecónomo (gatilho «API»). O Ecónomo escolhe os pratos pelos preços da semana e o motor soma o custo. Auditoria e limpeza: sem funções por usar, documentação conferida com o que a app faz. |

## O que precisa de ti

| O quê | Quando |
|---|---|
| ✔ O nome: Compras | volta 2 |
| ✔ Feito a 14/11/2026: o OK para publicar o Worker `compras` em teste, e o acesso do ambiente ao endereço dele (`compras.mercados-proxy.workers.dev`) | volta 1 |
| ✔ Feito a 14/11/2026: a permissão D1 (Edit) no token da Cloudflare; a casa, a lista e os preços passaram para a D1 | volta 3 |
| Juntar ao `main` o PR desta volta: a app só aparece em `nelsonsous.github.io/escolaplay/compras/` depois disso | já |
| Criar a tarefa do Ecónomo em `claude.ai/code/routines`, que refaz o índice uma vez por semana (crio-a eu, depois de juntar ao `main`), e o gatilho «API» (só na volta 10). Por agora, o índice refaz-se à mão com `node compras/economo/indice.mjs`; o catálogo mantém-se sozinho pelo cron | volta 6 |
| ✔ 15/11/2026: tens os cartões todos (Continente, Pingo Doce Poupa Mais, Auchan, Lidl Plus) | volta 7 |
| Dar uns talões reais para os testes | volta 7 |
| Decidir se a app fica para a casa e os convidados ou vai para o público. Para o público é preciso um parecer jurídico sobre a recolha de preços e, provavelmente, a API do Claude | antes de abrir |

## Riscos

| Risco | O que se faz |
|---|---|
| Uma cadeia bloqueia a leitura do site (proteção contra robôs), ou os termos de uso proíbem-na | A volta 1 diz quem deixa o Worker ler. Quem não deixa experimenta-se a partir da tarefa do Claude e, se também recusar, fica pelos folhetos e pelos talões. Recolhe-se pouco (o universo) e devagar. Antes de abrir ao público, parecer jurídico: no caso Ryanair c. PR Aviation (C-30/14) o tribunal da UE decidiu que os termos de uso podem proibir a recolha. |
| O Worker grátis só dá 10 ms de CPU e 50 pedidos de fora por chamada | A recolha faz-se em lotes pequenos pelo cron, ao longo do dia, como a Música fala com o Tidal em lotes pequenos. |
| O preço online não é o da loja | Os talões dizem a diferença, loja a loja, e a app mostra de onde vem cada preço. |
| Erros ao juntar o mesmo produto entre cadeias | Usa-se o código de barras quando existe. O resto junta-se pelo nome e pela embalagem, e o Ecónomo decide os casos duvidosos. Testa-se com o cabaz da DECO. |
| As gravações da KV (1000 por dia, da conta toda) acabarem e pararem as outras apps | A lista e os preços vão para a D1; a KV fica só com o pouco do costume. |
| A IA grátis da Cloudflare não ler bem os talões | O talão vai ao Ecónomo (o Claude lê imagens). |
| Cada pedido de ementa gasta da tua subscrição | Faz-se um rascunho na hora pela IA grátis, o Ecónomo só entra quando se pede, e há limites por hora e por dia. Para o público, usa-se a API, paga por utilização. |

## Agilidade: três degraus

| Degrau | Como | Quanto demora | Quem paga |
|---|---|---|---|
| **1. A IA grátis, na hora** | Workers AI no conector: ler a lista, o talão e o rascunho da ementa | segundos | grátis até ao limite diário |
| **2. O Ecónomo na hora** | o conector chama a tarefa pelo gatilho «API» | uns minutos | a tua subscrição do Claude |
| **3. Pela API do Claude** | o conector fala diretamente com o Claude | um a poucos minutos | paga-se por utilização (só se a app for para o público) |

**Para a casa não é precisa a API do Claude.** Os degraus 1 e 2 chegam, como na Música e na Meteo. O degrau 3 só entra
se a app for para o público, porque aí cada pedido de um desconhecido gastaria da tua subscrição.

## Quanto custa

| O quê | Custo |
|---|---|
| A app (GitHub Pages), o conector (Worker), a base de dados (D1 ou KV), a IA da Cloudflare e as notificações | **Grátis**, dentro dos limites do plano grátis. Passado o limite, o serviço recusa em vez de cobrar. A KV e a IA são partilhadas com as outras apps. |
| O Ecónomo (o Claude) | **Já pago:** usa a tua subscrição, sem custo extra, e conta para os limites de uso dela. |
| Preços das lojas e Open Food Facts | **Grátis.** |
| «Partilhar no WhatsApp» | **Grátis:** é o WhatsApp de cada pessoa. |

Para a casa e os convidados: **0 €**. Só se a app for para o público aparecem custos: a API do Claude (paga por
utilização), talvez o plano pago da Cloudflare (5 $/mês), o parecer jurídico sobre a recolha de preços e, para a App
Store, o programa de programador da Apple.

## Regras de cada volta

- **Nada se perde.** O que sai de um sítio fica noutro, e o plano diz onde.
- **Testes primeiro.** As fontes testam-se com respostas gravadas, para os testes não dependerem das lojas. O motor tem
  testes de paridade. O ecrã tem testes no Chromium com a rede simulada.
- **Preço sem fonte não entra.** Cada preço tem cadeia, data e origem, e o que é estimado é indicado.
- **Os dados de cada casa são dela.** Os talões perdem o NIF. O preço que um talão ensina entra na base sem dizer de
  quem veio.
- **Segredos só no Worker** (como segredos do Cloudflare): nunca no código nem na app.
- **Poucas gravações.** A KV da conta é partilhada com as outras três apps.
- **Publicar e juntar ao `main` só com o teu OK.**

## Fontes

- CNN Portugal, 14/11/2026: [Esta aplicação portuguesa ajuda-o a poupar no supermercado e superou o ChatGPT](https://cnnportugal.iol.pt/poupar/compras/esta-aplicacao-portuguesa-ajuda-o-a-poupar-no-supermercado-e-superou-o-chatgpt/20261114/6af31c55d34e9ce6f1b43cfc)
- PlanMyMeals: [site](https://www.planmymeals.ai/), [App Store](https://apps.apple.com/pt/app/planmymeals-ementa-semanal/id6803866194), [Google Play](https://play.google.com/store/apps/details?id=com.felllabs.planmymeals&hl=pt_PT), [Tek](https://tek.sapo.pt/mobile/apps/artigos/planmymeals-aplicacao-portuguesa-nasceu-de-uma-necessidade-pessoal-e-transformou-se-num-negocio/), [Postal](https://postal.pt/nacional/nova-aplicacao-desenvolvida-por-portugueses-ajuda-a-organizar-as-refeicoes-da-semana-e-compara-precos-entre-supermercados/), [PC Guia](https://www.pcguia.pt/2026/10/app-do-dia-planmymeals-ementa-semanal/)
- Super Save: [site](https://supersave.pt/), [Google Play](https://play.google.com/store/apps/details?id=com.savecook.save.wallet&hl=en_AU&gl=PT)
- Kabaz: [Observador, 29/01/2024](https://observador.pt/2024/01/29/kuantokusta-lanca-plataforma-kabaz-para-comparar-precos-nos-supermercados/)
- DECO PROteste: [ranking dos supermercados online](https://www.deco.proteste.pt/familia-consumo/supermercado/noticias/supermercado-online-lidera-ranking-precos-baixos)
- Decreto-Lei 109-G/2021 (Omnibus): [Diário da República](https://diariodarepublica.pt/dr/detalhe/decreto-lei/109-g-2021-175744207)
- QR code das faturas: [Portaria 195/2020](https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/legislacao/diplomas_legislativos/Documents/Portaria_195_2020.pdf), [especificações técnicas da AT](https://info.portaldasfinancas.gov.pt/pt/apoio_contribuinte/Novas_regras_faturacao/Documents/Especificacoes_Tecnicas_Codigo_QR.pdf)
- Ryanair c. PR Aviation (C-30/14): [Pinsent Masons](https://www.pinsentmasons.com/out-law/news/website-operators-can-prohibit-screen-scraping-of-unprotected-data-via-terms-and-conditions-says-eu-court-in-ryanair-case)
- Open Food Facts em Portugal: [wiki](https://wiki.openfoodfacts.org/Country_Support_-_Portugal)
