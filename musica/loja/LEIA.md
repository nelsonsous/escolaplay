# Música — o que a App Store pede

O que é preciso para pôr a Música na loja da Apple, com os textos prontos a colar. A app (`../nativo/`) já leva o
que a revisão costuma exigir; o que falta está no fim, sem rodeios.

## 1. Antes de começar

- **Apple Developer Program** (99 USD/ano) e um **Mac com o Xcode**.
- A app criada em **App Store Connect**, com o identificador `io.github.nelsonsous.musica` (o do projeto).
- **Os termos do TIDAL para programadores**: confirma em developer.tidal.com se a tua aplicação pode ser distribuída
  ao público e quantas pessoas se podem ligar. É a primeira coisa a ver — sem isso a app não pode ir para a loja,
  por muito pronta que esteja.

## 2. A ficha da app

| Campo | Texto |
|---|---|
| Nome (até 30) | **Maestro — playlists à medida** («Música» sozinho é o nome da app da Apple; o nome também não pode ter marcas de outros) |
| Subtítulo (até 30) | Playlists de qualidade por IA |
| Categoria | Música |
| Texto promocional (até 170) | Diz o que queres ouvir. O Maestro pesquisa, escolhe gravações de qualidade pelo teu gosto e põe a playlist na tua conta de streaming. Depois afinas tu. |
| Palavras-chave (até 100) | playlist,curadoria,descobrir música,jazz,audiófilo,hi-res,recomendações,mix,gravações,maestro |
| URL de apoio | `https://nelsonsous.github.io/escolaplay/musica/apoio.html` |
| URL da política de privacidade | `https://nelsonsous.github.io/escolaplay/musica/privacidade.html` |
| Direitos | © 2026 (o teu nome, como está na conta de programador) |

As palavras-chave não levam marcas de terceiros (a Apple recusa-as). Na descrição, o TIDAL pode e deve ser dito:
é do que a app precisa para funcionar.

**Descrição**

> Diz o que queres ouvir — «jazz dos anos 60 bem gravado para a viagem de sábado» — e o Maestro trata do resto.
>
> O Maestro é uma inteligência artificial que pesquisa o que a crítica diz, escolhe gravações de qualidade a partir
> do teu gosto e cria a playlist diretamente na tua conta do TIDAL.
>
> Depois afinas tu, no telemóvel:
> • ouve 30 segundos de cada faixa
> • troca uma faixa por outra com um toque — fica logo gravado
> • muda o estilo, a energia e o número de faixas, e vê o resultado na hora
> • «Mais como esta» cria uma playlist a partir de uma faixa de que gostas
>
> Todas as semanas, uma playlist nova com o que está a dar e vale a pena, e clássicos que resistem ao tempo.
>
> Precisa de uma conta do TIDAL. A Música é uma app independente, sem ligação à TIDAL.
>
> Privacidade: sem publicidade e sem programas de análise. Podes apagar a tua conta na app, em Ajustes.

## 3. Privacidade da app (o formulário «App Privacy»)

A app **recolhe dados** e **não os usa para te seguir** (tracking: não).

| Tipo de dados | O que é | Ligado à pessoa | Para quê |
|---|---|---|---|
| Identificadores → ID de utilizador | o nome de utilizador do TIDAL | sim | funcionamento da app |
| Conteúdo do utilizador → Outro conteúdo | os pedidos escritos e as playlists | sim | funcionamento da app |
| Outros dados | o perfil de gosto (favoritas, artistas seguidos, nomes das playlists) | sim | funcionamento da app, personalização |

Não recolhe: contactos, localização, pagamentos, histórico de navegação, diagnósticos, publicidade.
Quando houver avisos nativos, junta-se o identificador do aparelho para notificações.

## 4. Notas para a revisão (campo «App Review Information»)

A revisão tem de conseguir usar a app. Como o login é do TIDAL, dá-lhes:

1. **Uma conta do TIDAL de teste** (utilizador e palavra-passe) — cria uma só para isto.
2. **Um convite da Música** para essa conta: na app, Ajustes → «Convidar alguém». Vale 14 dias: cria um novo antes de
   cada envio. Deixa a conta já com duas ou três playlists feitas, para verem a app com conteúdo.

Texto a colar (em inglês, é o que a revisão lê):

> Música creates playlists in the user's TIDAL account. A TIDAL account is required; a test account is provided
> above. To sign in: open the invite link below on the device, then tap "Concordo e ligar ao Tidal" and sign in
> with the test account (email and password).
>
> Invite link: (cola aqui o link do convite)
>
> How it works: the user writes a request ("Pedir"); an AI curator ("Maestro") researches and creates the playlist
> in the user's TIDAL account, usually within minutes. The test account already has playlists so every feature can
> be tried right away: open a playlist to preview tracks, swap a track (⇄), tune it ("Afinar"), or delete it.
>
> AI disclosure and consent (5.1.2): before connecting, the app states that the curator is a third-party AI
> (Claude, by Anthropic) and what it reads, and that request texts also go to Cloudflare's AI (Workers AI) so the
> playlist can start at once; connecting requires tapping "Concordo e ligar ao Tidal". The instant playlist
> (Cloudflare AI) can be switched on or off separately in Pedir and in Ajustes → A tua conta.
> Account deletion (5.1.1(v)): Ajustes → A tua conta → Apagar a minha conta.
> The app content is bundled in the binary; the network is only used for the user's data.

## 5. Os ecrãs

A loja pede capturas do **iPhone de 6,9"** (1320 × 2868 ou 1290 × 2796). Tiram-se no simulador do Xcode
(iPhone 16 Pro Max → ⌘S), com a conta de teste já com playlists. Cinco chegam:

1. A lista das playlists
2. Uma playlist aberta (ouvir e trocar)
3. Afinar, com o gráfico da energia
4. Pedir ao Maestro
5. Ajustes, com «O teu gosto» aberto

O projeto está só para iPhone (assim não são precisas capturas de iPad; o iPad pode juntar-se mais tarde, o
contrário não).

## 6. Enviar

No Xcode: **Signing & Capabilities** → a equipa da conta paga → **Product → Archive** → **Distribute App → App
Store Connect**. Primeiro para o **TestFlight** (experimenta no teu iPhone); só depois «Submit for Review».

## 7. O que a app já cumpre

| Regra da Apple | Como |
|---|---|
| Não ser só um site (4.2) | os ficheiros da app vão dentro dela; abre sem rede |
| Apagar a conta dentro da app (5.1.1) | Ajustes → A tua conta |
| Política de privacidade e apoio | as duas páginas, na app e no site |
| Dizer e pedir autorização antes de dar dados a uma IA de terceiros (5.1.2) | o botão «Concordo e ligar ao Tidal»; a data fica registada |
| Marcas de terceiros (5.2) | o nome e as palavras-chave não as usam; a app diz «uma IA» e só nomeia quem ela é onde pede a autorização e na privacidade |
| Cifra | só HTTPS (`ITSAppUsesNonExemptEncryption` = não) |

## 8. O que falta — e o que não foi testado

- **Nunca correu num iPhone nem no Xcode.** O projeto iOS foi montado e conferido por testes num computador sem
  Xcode. O primeiro passo é abri-lo, correr no simulador e experimentar «Ligar ao Tidal».
- **Avisos nativos.** Dentro da app nativa não há avisos (os do Safari não funcionam lá). Precisam do programa pago,
  de um plugin no projeto do Xcode e de uma chave da Apple guardada no conector. Não está feito.
- **O login do TIDAL** abre dentro da app. Se a revisão o recusar, passa-se para a folha de login do sistema
  (`ASWebAuthenticationSession`), com um endereço próprio da app.
- **Quem paga a IA.** Hoje o Maestro corre na tua subscrição do Claude: serve para ti e para quem convidas. Para o
  público em geral não serve — é preciso o caminho da API (ver «Agilidade» em `../PLANO.md`) e decidir quem paga.
