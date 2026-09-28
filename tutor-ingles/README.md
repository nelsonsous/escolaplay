# Inglês com o Claude

Tutor de conversação em inglês, por voz, com o Claude como professor. É uma
app à parte da EscolaPlay. Complementa o *English for PMs*: a EscolaPlay treina
com exercícios e roleplays guiados, aqui conversas livremente com o Claude
numa cena de trabalho, recebes correções na hora e uma avaliação no fim.

**App publicada:** <https://claude.ai/artifact/58FpZ6waEprze6M8zgMgwD>. Quem
pode abrir a página decide-se no menu Partilhar; o caderno e as sessões são
sempre só teus.

## Custo: zero além do plano Claude

A app é uma página publicada no claude.ai e usa a capacidade `sample`: cada
resposta do tutor é um pedido ao Claude **da conta de quem abre a página** e
gasta a quota do plano (Max), como uma conversa normal. Não usa a API da
Anthropic, não precisa de chaves e não tem custos extra.

| Pedido | Modelo | Tempo típico |
|---|---|---|
| Cada resposta do tutor | `quick` (rápido, sem pensar antes) | 1–3 s |
| «Ideias» (sugestões de resposta) | `quick` | 1–3 s |
| Avaliação no fim da sessão | `default` (mais cuidadoso) | 5–60 s |

Nas definições há a opção «Profundo», que usa o modelo `default` em todas as
respostas: dá correções mais finas, mas cada resposta demora mais.

## Voz

- **O tutor fala com a voz Voxtral do Mistral**, através do conector
  [«Voz Mistral»](voz-mistral/README.md). É um Cloudflare Worker teu, com a tua
  chave Mistral guardada como segredo. As páginas do claude.ai não podem chamar
  o Mistral diretamente, mas podem chamar os conectores da tua conta. O custo é
  zero, com o plano grátis da Cloudflare e o do Mistral. Tem vozes britânicas e
  americanas (Oliver, Jane, Paul…) e a mesma frase só é gerada uma vez (fica em
  cache).
- **Sem o conector, ou se ele falhar**, a app usa o sintetizador do próprio
  dispositivo (`speechSynthesis`), que é grátis. Nesse caso escolhe a melhor voz
  inglesa que encontrar (dá preferência às «Natural», «Premium», «Enhanced»,
  Siri e Google), a uma velocidade ajustada ao nível. O motivo da falha aparece
  nas definições. Para uma voz do dispositivo mais natural:
  - **iPhone e Mac:** descarrega uma voz inglesa «Melhorada» ou «Premium» em
    Acessibilidade › Conteúdo falado › Vozes;
  - **Windows:** abre o claude.ai no Microsoft Edge, que tem vozes «Natural».
- **Tu falas por ditado.** O claude.ai não dá acesso ao microfone às páginas
  publicadas, por isso usa-se o ditado do sistema com o cursor na caixa de
  resposta:
  - **iPhone:** microfone do teclado, com o teclado English ativo;
  - **Android:** microfone do Gboard;
  - **Mac:** duas vezes a tecla do microfone (ou Fn);
  - **Windows:** Win + H.

  Com «Enviar sozinho» ligado, a resposta segue 3 segundos depois de parares de
  falar.
- **A voz do próprio Claude:** o botão «Com a voz do Claude» de cada cena copia
  um guião e abre uma conversa nova no Claude. Cola-o (se não aparecer
  sozinho), envia e toca no botão de voz da app Claude. Assim usas o modo de voz
  real do Claude, com microfone, também incluído no plano.

## O que tem

- **Agenda de conversas**, com oito cenas de trabalho:

  | Cena | Com quem |
  |---|---|
  | Conversa livre | Alex, colega de Londres |
  | Daily stand-up | Sophie, delivery lead do rollout S/4HANA |
  | Steering committee | Mark, diretor de programa do cliente |
  | Pedido fora do âmbito | Laura, diretora financeira |
  | Anunciar um atraso | Daniel, IT manager |
  | Workshop fit-to-standard | Priya, key user de contas a pagar |
  | Café antes da reunião | Tom, consultor britânico |
  | Entrevista de emprego | Emma, hiring manager |

  Com 3 ou mais frases no caderno aparece também «Rever o meu caderno».
- **Nível A2–C1**: ajusta o vocabulário, a velocidade da voz e o rigor das
  correções.
- **Correção por mensagem**: a frase que disseste, com as palavras erradas
  riscadas e as certas destacadas, e o porquê em português de Portugal. A
  correção pode ser guardada no caderno.
- **Ideias**: três respostas possíveis, para ouvir e repetir quando ficas sem
  palavras.
- **Avaliação no fim**: o que correu bem, 3 a 5 correções, 5 frases para a
  próxima vez e um foco. As correções e as frases vão sozinhas para o caderno.
- **Caderno**: correções e expressões, para ouvir, rever numa conversa,
  acrescentar à mão (por exemplo, uma expressão ouvida numa reunião), importar
  e exportar.
- **Sessões**: histórico com transcrição e avaliação, e o número de dias
  seguidos a praticar.

## Dados

- O caderno e as sessões ficam na base de dados da própria página (capacidade
  `db`), com a regra *só o dono lê e escreve*, e sincronizam entre
  dispositivos. Se a página for partilhada, quem a abrir usa o Claude da sua
  própria conta e guarda os dados só no seu dispositivo.
- As definições (nível, voz, velocidade) ficam em cada dispositivo, porque as
  vozes disponíveis mudam de aparelho para aparelho.
- **Importar** aceita:
  - uma frase por linha (`inglês = português`);
  - o JSON exportado por esta app;
  - o ficheiro `escolaplay-backup-….json` da EscolaPlay (Perfil › Backup do
    progresso › Exportar). Lê só as frases do phrasebook (`max.srs`, flashcards
    incluídas), com a tradução e a origem; os perfis e as chaves de API do
    ficheiro ficam de fora, e as frases repetidas não se duplicam.

## Técnica

- Um único ficheiro, `index.html`, em HTML, CSS e JavaScript simples, sem build
  e sem dependências. Só carrega as fontes Newsreader e Schibsted Grotesk do
  Google Fonts.
- Capacidades declaradas na publicação:
  - `sample`: o Claude;
  - `db`: só o dono lê e escreve;
  - `user`;
  - `mcp`: o servidor `Voz Mistral`, com as ferramentas `speak` e `voices`.
- O áudio do conector chega em base64. Toca num elemento `<audio>` (com
  `preservesPitch` para a velocidade 0,75×) ou, se a página não o deixar, por
  Web Audio. No iPhone é desbloqueado no primeiro toque.
- `voz-mistral/` é o Worker do conector, com deploy próprio (`wrangler`).
- Aberto fora do claude.ai (por exemplo, pelo GitHub Pages), mostra um aviso a
  dizer que o tutor só responde no claude.ai. O caderno local continua a dar
  para ouvir.
- Fica de fora do `build.mjs` da EscolaPlay, tal como o `tts-proxy`.

### Atualizar a app publicada

Edita `index.html` e volta a publicar a partir de uma sessão do Claude Code com
o URL da app, para manter o mesmo endereço, os dados e as capacidades (`sample`,
`db` só do dono, `user`, `mcp` com o servidor `Voz Mistral`). Publicar sem o
URL cria uma app nova e vazia.
