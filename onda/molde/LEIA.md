# Molde de uma app em Onda

Uma app pronta a copiar: abre no telemóvel como uma app (PWA), funciona sem rede, e a lógica está toda em Onda. O
exemplo é uma lista que vem da rede, com procura, filtro por grupo, folha de pormenor e favoritos que ficam guardados.
O estilo é o da Mercados e da Música: preto, letra grande, pouca coisa no ecrã.

```sh
node onda/molde/build.mjs               # app.onda + onda/lib → gerado/app.wasm (49 KB) e gerado/anfitriao.js
node onda/molde/build.mjs --verificar   # não escreve nada: falha se o gerado/ não é o da app de agora
npx serve onda/molde                    # ou qualquer servidor de ficheiros; abrir index.html
node --test onda/test/molde.test.js     # abre a app num Chromium e usa-a
```

## Ficheiros

| Ficheiro | O que é | Mexe-se? |
|---|---|---|
| `app.onda` | a app: o estado, o que se desenha e o que cada toque faz (141 linhas) | sim: é aqui que se trabalha |
| `index.html` | os lugares fixos do ecrã (`#filtros`, `#lista`, `#abas`, `#folha`) e o campo da procura | sim |
| `app.css` | o aspeto | sim |
| `dados.json` | os dados de exemplo | troca-se pelos da app (ou por um endereço na rede) |
| `app.js` | a casca (16 linhas): carrega o módulo e entrega-o ao anfitrião | quase nunca |
| `build.mjs` | junta a biblioteca toda e a app e compila; num erro diz o ficheiro e a linha (`→ minha-app/app.onda, linha 46`) | só a lista `EVENTOS`, ao criar uma função de evento nova |
| `sw.js`, `manifest.webmanifest`, `icone.svg` | instalar no ecrã principal e abrir sem rede | o nome, o ícone e a versão da cache |
| `gerado/` | o que o `build.mjs` escreve | nunca à mão |

## Fazer uma app nova

1. Copiar a pasta (`cp -r onda/molde minha-app`). Fora de `onda/`, o build precisa de saber onde ela está:
   `ONDA=onda node minha-app/build.mjs`.
2. Mudar o nome em `index.html`, `manifest.webmanifest`, `sw.js` (`CACHE`) e `app.js` (`prefixo`, o das chaves no
   armazém do browser).
3. Escrever a app em `app.onda`. A cada versão publicada, subir os `?v=` do `index.html`, do `app.js` e do `sw.js`, e
   o nome da cache.

## Como a app está feita (o padrão a seguir)

- **Um evento, uma função.** O anfitrião corre o `main` uma vez e depois chama `clique`, `escreve` ou `lido`. Um
  elemento com `data-onda="ação:número"` é um botão: o `clique` recebe esse texto e decide. Não há mais nada entre o
  toque e a Onda.
- **O estado são os globais.** Estão listados no topo do `app.onda` (`M[0..9]`). O que tem de durar entre eventos
  reserva-se uma vez (no `main` ou quando os dados chegam) e tem lugar fixo; o texto da procura, por exemplo, copia-se
  para 80 bytes reservados no início (`fixa`).
- **Cada evento solta o que reservou.** O texto do evento chega no topo do monte: `_me_solta t` no fim devolve tudo o
  que se fez depois. O teste confirma que 300 eventos deixam o monte exatamente onde estava.
- **Escreve-se como se lê (a Onda fluida).** O HTML vai em moldes (crases), com as aspas tal e qual e o código no
  sítio, entre chavetas; os campos leem-se com o ponto e as palavras da fala (`onda/lib/fala.onda`):
  `` `<b>{ esc c.nome }</b> { inteiro num c.valor }` ``. Um `Se` não precisa de ramo vazio (`Se fav i ` on` `), um
  ciclo contado é `L i n …`, e os parênteses conferem a aridade quando há dúvida. Um texto para dar a uma função
  (um aviso, o URL de um pedido) é um molde com o nome dela: `` _an_buscar`/api/itens/{ N id }` $"lido" ``.
- **Desenhar é escrever HTML para um lugar.** `= h _ht_ini n … _ht_poe $"#lista" h`: tudo o que se escreve pelo meio
  vai para esse elemento. Cada pedaço do ecrã tem a sua função (`dlista`, `dfiltros`, `dabas`, `dfolha`); um evento
  redesenha só o que mudou (escrever na procura só refaz a lista, por isso o campo não perde o cursor).
  Com `_ht_muda` em vez de `_ht_poe`, o anfitrião compara o HTML novo com o que lá está e mexe só no que é
  diferente: as imagens não piscam e a lista não salta. Os itens de uma lista levam `data-chave` (o id), para
  tirar ou trocar um não mexer nos outros.
- **O que vem de fora é sempre escapado** (`esc` para um nó, `esct` para um texto). O `esc` serve qualquer valor do JS e por isso traz o `String(x)` dos números; num ecrã só com textos, `esct txt c.nome` deixa o módulo uns 7 KB mais pequeno. O exemplo tem um `<` e um `&` nos dados para o teste o provar.
- **Números e datas como o utilizador os lê:** `inteiro x` e `casas x d` são o `Intl.NumberFormat('pt-PT')`, igual ao bit.
- **A rede pode falhar:** `lido` recebe o estado HTTP; o ecrã diz «Sem ligação» e deixa tentar outra vez.

## O que o molde não tem (e onde ir buscar)

| Preciso de… | Onde está |
|---|---|
| ordenar, datas, JSON para escrever, textos | `onda/lib/LEIA.md` (a biblioteca toda; só pesa o que se usa) |
| relógio (atualizar de x em x segundos) | `_an_relogio ms $"funcao"` |
| uma contagem (um relógio a andar para trás) | `onda/lib/tempo.onda`: guarda-se a hora do fim (`! 11 _tp_fim 20`) e em cada tique pergunta-se o que falta (`_tp_falta @ 11`); `_tp_mss` escreve `1:15`. Guia-se pela hora, não pelos tiques: um ecrã que adormece não a atrasa. Um tique redesenha só os algarismos (`_ht_muda`) e só quando mudam. Exemplo: `ginastica/app.onda` |
| o ecrã sempre aceso, um sinal sonoro, voz | `_an_acordado 1`, `_an_tom 880 120` e `_an_falar texto $"pt-PT"` (portas 120 a 122). O primeiro som e a primeira fala fazem-se num toque: `_an_tom 0 0` só prepara |
| testar uma app com relógio | o relógio do Playwright (`page.clock`): `runFor` anda tique a tique e `fastForward` salta como um telemóvel que adormeceu. Exemplo: `ginastica/tests/ginastica.test.mjs` |
| conferir o desenho sem olhar para ele | o `MEDE` do mesmo teste: o que sai do ecrã ou fica cortado, botões mais pequenos do que um dedo, pouco contraste, o botão principal à vista |
| gráficos e animações calculados em Onda | `mercados/proto/` (campos: cada píxel é uma função) |
| um script sem ecrã (Node) | `onda/ex/carteira/` e `onda/rt/anfitriao-node.js` |
| gestos (arrastar, puxar para fechar), ecrãs longos com estado no JS | ainda na casca: ver `mercados/mercados.js` e o que falta em `onda/docs/ARQUITETURA.md` |
