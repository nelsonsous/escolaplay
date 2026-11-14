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
| 3 ou 4 cadeias, só com preços online | Continente, Pingo Doce, Auchan, Intermarché e Minipreço pelas lojas online. Lidl e Aldi pelos **folhetos, lidos pelo Ecónomo** (o Claude lê imagens, como lê o satélite na Meteo). A Mercadona e o preço real de cada loja pelos **talões**. As cadeias que entram de facto decidem-se na volta 1. |
| Preços estimados no meio dos reais | Cada preço diz **de onde vem e de quando** (online, folheto ou talão). Um cabaz só é «o mais barato» quando há preço para quase tudo, e o que falta é indicado. |
| Dividir por lojas, sem mais nada | **Onde compro:** a melhor combinação de 1, 2 ou 3 das tuas lojas, contando o custo de ir a mais uma, os cartões e as promoções válidas no dia em que vais. Corre no telemóvel, sem rede. |
| Não se sabe se a promoção é verdadeira | **Promoção verdadeira?** Mostra o preço mais baixo dos últimos 30 dias, tirado do nosso histórico, ao lado do «antes» da loja (a regra do Decreto-Lei 109-G/2021). Fica fiável ao fim de 30 dias de recolha. |
| Não se sabe quanto se gastou | **Talões:** com uma fotografia, a app fica a saber o que compraste, quanto pagaste e onde. A despensa e o gasto do mês atualizam-se sozinhos. |
| A poupança contada pelo «preço antes da promoção» | **Poupança honesta:** compara o que pagaste com o que o mesmo cabaz custaria na tua loja de sempre, no mesmo dia. |
| Ementas de molde | **A Semana com o Ecónomo:** a ementa nasce das promoções desta semana nas tuas lojas e do que tens na despensa, e respeita quem come e o tempo que há para cozinhar. Trocar um prato é na hora (⇄), como trocar uma faixa na Música. Aprende com o que gostas e com o que compras. |
| Uma lista para uma pessoa | **Lista da casa:** partilhada entre telemóveis, abre sem rede na loja e fica arrumada por loja e por corredor. O botão «Partilhar no WhatsApp» manda-a para o grupo da família. |

## O formato: tudo na app

A interação é toda na app, como na Mercados, na Meteo e na Música. Não há bot no WhatsApp, porque precisava de uma
conta na Meta e de um número próprio, os avisos pagavam-se à mensagem e as mensagens passavam pelos servidores da Meta.

| Momento | Na app |
|---|---|
| «Acabou o azeite» | A app abre do ecrã principal direto na lista. Escreve-se, ou dita-se pelo microfone do teclado, e a IA arruma. No iPhone, um Atalho da Siri («junta azeite à lista») manda o texto ao conector sem abrir a app. No Android, carregar no ícone da app dá «Juntar à lista». |
| O talão depois das compras | Fotografa-se com a câmara na app. No Android, a fotografia também se pode partilhar da galeria para a app. |
| Pedir a ementa | Pede-se na Semana, e a app avisa quando o Ecónomo acabar. |
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
a volta 2 começa na KV, com as gravações juntas, e passa para a D1 depois.

## De onde vêm os preços

**O universo, não o catálogo todo.** Tal como a Mercados tem o seu universo de ativos, a Compras acompanha só os
produtos que interessam: os que estão nas listas, nas ementas e nos talões das casas, mais os essenciais de cada
categoria. O cabaz de 63 produtos da DECO é um bom ponto de partida para os testes. São uns poucos milhares de
produtos, que cabem inteiros no telemóvel (umas centenas de KB por dia). Por isso a pesquisa e o «onde compro»
funcionam na loja sem rede. Como se recolhe só uma parte pequena de cada catálogo, também baixa o risco legal.

| Cadeia | De onde | O que a volta 1 tem de provar |
|---|---|---|
| Continente, Pingo Doce, Auchan, Intermarché, Minipreço | a loja online de cada uma, lida pelo conector aos poucos, ao longo do dia | se os sites deixam ler (proteção contra robôs), os termos de uso e o tamanho de cada pedido |
| Lidl, Aldi | os folhetos da semana (imagens ou PDF), lidos pelo Ecónomo; o resto vem dos talões | onde estão os folhetos e quando saem |
| Mercadona | só os talões (tanto quanto se sabe, não faz folhetos nem promoções) | quantos talões são precisos para haver preço |
| Todas | os **talões** das casas: o preço real daquela loja, naquele dia | se cada cadeia tem um talão que se lê bem |
| Nomes, marcas, códigos de barras, fotografias | o Open Food Facts (base aberta, com atribuição) | quantos produtos portugueses tem |

O QR code das faturas (Portaria 195/2020) traz quem vendeu (o NIF), a data e os totais, mas não os produtos. Serve
para confirmar o talão lido, não para o ler (a confirmar no PDF da AT).

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
| **1** | Nada à vista: fica a saber-se que cadeias entram. | O Worker `compras`, publicado em teste com o teu OK, com uma fonte por cadeia (`proxy/src/fontes/*.js`). As respostas ficam gravadas para os testes. Este plano ganha a tabela «O que cada cadeia deixa», como na Música há «O que o Tidal deixa». O ambiente do Claude só precisa de chegar ao endereço do Worker (um pedido de aprovação, uma vez). Se uma cadeia recusar o Worker, experimenta-se a partir da tarefa do Claude, e essa cadeia tem de ser aprovada no ambiente. |
| **2** | **A lista da casa:** escreves ou ditas como te sai («2 leites, pão») e a IA arruma. Partilha-se com um código e abre sem rede. «Partilhar no WhatsApp» manda a lista para o grupo da família. No iPhone, o Atalho da Siri junta à lista sem abrir a app. Separadores **Lista · Semana · Casa**. | `onda/molde` → `compras/`. Conector 1.0.0: casa, telemóveis e lista com as gravações juntas. Workers AI para ler o texto. O Atalho fala com o conector com a chave do telemóvel. Os atalhos do ícone (Android) ficam no manifesto. Testes de interface no Chromium. |
| **3** | Cada produto da lista mostra **o preço em cada cadeia**, por kg ou por litro, com a origem e a data. Escolhes «qualquer marca», «marca branca serve» ou «esta marca». | A recolha fica no cron do conector (o universo, aos poucos) e sai o primeiro `ECONOMO.md` (só pares e revisão). O universo fica na base e no telemóvel. Os pares entre cadeias fazem-se pelo código de barras e pelo nome; o resto decide o Ecónomo. |
| **4** | **Onde compro:** a melhor combinação das tuas lojas, com a deslocação e os cartões. A lista arruma-se por loja e por corredor para ires às compras. | O motor em Onda (`onde.onda`), com testes de paridade em JavaScript. As tuas lojas e os teus cartões ficam na Casa. |
| **5** | **Talões:** tiras uma fotografia, revês o que a app leu, e ficam o gasto, a loja e o preço real. Os produtos riscam-se da lista e entram na despensa. | `/api/talao` no conector, com uma IA que lê imagens; se não chegar, o talão vai ao Ecónomo. O QR da fatura confere a loja, a data e o total, onde o telemóvel o lê. O NIF de quem compra nunca se guarda. Cada linha confirmada ensina um nome de talão («LT UHT MG MIM 1L»). |
| **6** | **Folhetos e promoções para ti:** o que está em promoção nas tuas lojas, entre o que costumas comprar, com avisos no telemóvel. | O Ecónomo lê os folhetos do Lidl e do Aldi (e os das outras, se as lojas online não chegarem). As promoções têm validade. Os avisos usam o `push.js` como na Meteo e o cron do conector. |
| **7** | **Promoção verdadeira?** e o gráfico do preço de cada produto. Podes pedir um aviso quando o azeite baixar de X. | Histórico na base (só as mudanças). A regra dos 30 dias fica no motor. O gráfico usa o `onda/lib/grafico.onda`. |
| **8** | **A Semana:** dizes quem come, o orçamento e o tempo, e a ementa nasce das promoções e da despensa. ⇄ troca um prato na hora e a lista sai feita, com as quantidades certas. Podes importar uma receita por link ou por fotografia. | Pedido → rascunho na hora (Workers AI) → revisão do Ecónomo, também na hora (gatilho «API»). A app avisa quando a ementa estiver pronta, e «Partilhar no WhatsApp» manda-a para o grupo da família. O Ecónomo deixa 2 ou 3 pratos de reserva por refeição, para o ⇄ não precisar dele. Cada 👍/👎 num prato vira lição. |
| **9** | **A despensa:** o que tens, o que está a acabar (entra sozinho na lista) e o que está a passar do prazo, mais «o que faço com o que tenho». | O ritmo de cada produto sai dos talões (motor). Os prazos são opcionais. O pedido «com o que tenho» vai ao Ecónomo. |
| **10** | **A poupança honesta** do mês, e tudo revisto. | O painel compara o que pagaste com o mesmo cabaz na tua loja de sempre. Auditoria e limpeza: sem funções por usar, sem marcas nos textos onde não é preciso, documentação conferida com o que a app faz. Notas para a loja da Apple, se a app for para o público. |

## O que precisa de ti

| O quê | Quando |
|---|---|
| Escolher o nome (Compras?) | antes da volta 2 |
| Dar o OK para publicar o Worker `compras` em teste, e aprovar que o ambiente do Claude chegue ao endereço dele (`compras.mercados-proxy.workers.dev`; o pedido aparece-te aqui) | volta 1 |
| Dar ao token da Cloudflare a permissão D1 (Edit) | volta 2 ou 3 |
| Criar a tarefa do Ecónomo em `claude.ai/code/routines` e o gatilho «API». Os segredos `ECONOMO_FIRE_URL` e `ECONOMO_TOKEN` ficam no Worker, como na Música | volta 3 |
| Dizer as tuas lojas e os teus cartões, e dar uns talões reais para os testes | voltas 4 e 5 |
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
