# Inglês com o Claude

Tutor de conversação em inglês, por voz, e app à parte da EscolaPlay.
Complementa o *English for PMs*: a EscolaPlay treina com exercícios e roleplays
guiados; aqui conversas livremente numa cena de trabalho, recebes correções na
hora e uma avaliação no fim.

## Duas maneiras de a usar (o mesmo ficheiro)

| | No claude.ai | Só com a chave Mistral |
|---|---|---|
| Endereço | <https://claude.ai/artifact/58FpZ6waEprze6M8zgMgwD> | <https://nelsonsous.github.io/escolaplay/tutor-ingles/> |
| Tutor | Claude, com a tua conta (plano Max) | Mistral (`mistral-small`; avaliação com `mistral-medium`) |
| Voz do tutor | do dispositivo, ou Mistral pelo conector [«Voz Mistral»](voz-mistral/README.md) | Mistral Voxtral, com a chave |
| Como respondes | ditado do teclado ou do sistema | microfone, transcrito pelo Voxtral, com mãos-livres |
| Configurar | nada (aceitar o pedido de acesso) | colar a chave Mistral, a mesma da EscolaPlay |
| Caderno e sessões | na base de dados da página, sincronizados entre dispositivos | só no dispositivo |
| Custo | 0 €: gasta a quota do plano Max | 0 €: plano grátis do Mistral |

Há duas versões por duas limitações:

- **A chave não serve no claude.ai.** As páginas publicadas no claude.ai não
  podem ligar-se a outros sites nem usar o microfone. Por isso não funciona lá
  como na EscolaPlay. A voz Mistral só lá chega pelo conector.
- **Fora do claude.ai não há Claude grátis.** Sem ele, a versão com a chave
  usa o Mistral como tutor, como a EscolaPlay já faz.

Em ambas, a primeira vez pede autorização: no claude.ai para usar o Claude (e o
conector), fora dele para usar o microfone.

## Custo

- **No claude.ai:** cada resposta é um pedido ao Claude da conta de quem abre a
  página (capacidade `sample`) e gasta a quota do plano, como uma conversa
  normal. Não usa a API da Anthropic nem chaves.
- **Com a chave:** os pedidos vão diretamente para `api.mistral.ai` com a tua
  chave, no plano grátis. A chave fica só no dispositivo (`localStorage`), como
  na EscolaPlay.

| Pedido | No claude.ai | Com a chave | Tempo típico |
|---|---|---|---|
| Resposta do tutor | `quick` | `mistral-small-latest` | 1–3 s |
| «Ideias» | `quick` | `mistral-small-latest` | 1–3 s |
| Avaliação no fim | `default` | `mistral-medium-latest` | 5–60 s |
| Voz do tutor | conector ou dispositivo | `voxtral-mini-tts-2603` | 1–2 s |
| O teu microfone | — (ditado) | `voxtral-mini-latest` | 1–2 s |

A opção «Profundo» nas definições usa o modelo maior em todas as respostas:
corrige melhor, mas é mais lenta. Se a conta Mistral não tiver o
`mistral-medium`, a app volta sozinha ao `mistral-small`.

## Voz

- **Voz Mistral:** vozes britânicas e americanas (Oliver, Jane, Paul…).
  «Carregar vozes da conta» junta as restantes, e cada frase fica em cache,
  por isso repetir não faz novo pedido.
  - Com a chave: pedido direto, com os mesmos campos da EscolaPlay (`model`,
    `input`, `voice_id`/`voice`, `response_format`).
  - No claude.ai: pelo conector «Voz Mistral», um Cloudflare Worker teu com a
    chave guardada como segredo.
- **Sem Mistral, ou se ele falhar**, a app usa o sintetizador do dispositivo
  (`speechSynthesis`) e diz o motivo nas definições. Para uma voz do
  dispositivo mais natural:
  - **iPhone e Mac:** descarrega uma voz inglesa «Melhorada» ou «Premium» em
    Acessibilidade › Conteúdo falado › Vozes;
  - **Windows:** usa o Microsoft Edge, que tem vozes «Natural».
- **Microfone (versão com a chave):**
  - toca no micro, fala e faz uma pausa: a gravação pára sozinha depois de
    1,4 s de silêncio;
  - o Voxtral transcreve em inglês e a resposta segue;
  - sem voz, não manda nada, para o Voxtral não inventar texto sobre o
    silêncio;
  - com «Conversa mãos-livres», o micro volta a ouvir sempre que o tutor acaba
    de falar.
- **Ditado (claude.ai):** com o cursor na caixa de resposta, usa o ditado do
  sistema:
  - **iPhone:** microfone do teclado, com o teclado English ativo;
  - **Android:** microfone do Gboard;
  - **Mac:** duas vezes a tecla do microfone (ou Fn);
  - **Windows:** Win + H.

  «Enviar sozinho» envia 3 segundos depois de parares de falar.
- **A voz do próprio Claude:** «Com a voz do Claude» copia o guião da cena e
  abre uma conversa nova no Claude. Continua-a com o botão de voz da app Claude.

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

- **No claude.ai:** o caderno e as sessões ficam na base de dados da página
  (capacidade `db`), com a regra *só o dono lê e escreve*, e sincronizam entre
  dispositivos. Se a página for partilhada, quem a abrir usa o Claude da sua
  própria conta e guarda os dados só no seu dispositivo.
- **Com a chave:** ficam no dispositivo. Para passar o caderno de uma versão
  para a outra, usa **Caderno › Importar e exportar** («Copiar tudo» numa,
  colar na outra).
- **Definições** (nível, vozes, velocidade, chave): ficam em cada dispositivo.
- **Importar** aceita:
  - uma frase por linha (`inglês = português`);
  - o JSON exportado por esta app;
  - o ficheiro `escolaplay-backup-….json` da EscolaPlay (Perfil › Backup do
    progresso › Exportar). Lê só as frases do phrasebook (`max.srs`, flashcards
    incluídas), com a tradução e a origem; os perfis e as chaves de API do
    ficheiro ficam de fora, e as frases repetidas não se duplicam.

## Técnica

- **Ficheiro:** um único `index.html`, em HTML, CSS e JavaScript simples, sem
  dependências. Só carrega as fontes Newsreader e Schibsted Grotesk do Google
  Fonts.
- **Modo:** decide-se pelo `window.claude`. Com ele, a página corre no
  claude.ai; sem ele, corre com a chave Mistral.
- **Tutor:** as mesmas instruções servem os dois modos. No Mistral, a primeira
  mensagem passa a `system` e as respostas pedem-se em modo JSON.
- **Capacidades declaradas no claude.ai:**
  - `sample`: o Claude;
  - `db`: só o dono lê e escreve;
  - `user`;
  - `mcp`: o servidor `Voz Mistral`, com as ferramentas `speak` e `voices`.
- **Áudio:** toca num elemento `<audio>` (com `preservesPitch` para a
  velocidade 0,75×) ou, se a página não o deixar, por Web Audio. No iPhone é
  desbloqueado no primeiro toque.
- **Conector:** `voz-mistral/` é o Worker, com deploy próprio (`wrangler`).
- **Build:** o `build.mjs` da EscolaPlay deixa de fora `voz-mistral/`, como o
  `tts-proxy`; a página entra no `dist` como as Damas.

### Atualizar

- **Versão com a chave (GitHub Pages):** sai com cada merge no `main`.
- **Versão do claude.ai:** edita `index.html` e volta a publicar a partir de
  uma sessão do Claude Code com o URL da app. Assim mantém o mesmo endereço, os
  dados e as capacidades (`sample`, `db` só do dono, `user`, `mcp` com o
  servidor `Voz Mistral`). Publicar sem o URL cria uma app nova e vazia.
