# Ginástica

A sessão de ginástica rítmica de hoje, guiada. A app propõe a sessão que se segue, leva a ginasta de exercício em
exercício (o nome, como se faz, o relógio, as vezes, os lados e os descansos, com voz e sinais) e dá a estrela do dia.
O plano, e o porquê de cada escolha, está no [`PLANO.md`](PLANO.md). Esta é a versão 0.1.0: a volta 1 desse plano.

- Depois de junta ao `main`, abre em `https://nelsonsous.github.io/escolaplay/ginastica/`. Instala-se no ecrã
  principal e abre sem rede.
- Tudo o que a app guarda fica no aparelho. Nada pessoal vai para o repositório, que é público.

## Como se usa

1. A casa mostra as estrelas, as sessões (A, B, C, D) e os exercícios da sessão que se segue. «Começar».
2. Cada exercício aparece com o nome, como se faz e quanto se faz. A voz diz o nome. «Vai» põe o relógio a contar; nos
   exercícios de contar, «Feito» passa ao seguinte.
3. A app trata das vezes, dos lados e dos descansos: a voz avisa («Troca. Perna esquerda à frente», «Descansa»,
   «Outra vez») e há um sinal aos 3, 2 e 1 e outro no fim.
4. «Pausa», «Saltar» e «Sair» estão sempre à mão. Se a página se esconde (outra app, o ecrã bloqueado), a sessão pára
   e só continua quando ela quiser.
5. No fim, a estrela: conta se pelo menos metade dos exercícios foram feitos (os saltados não contam).

O som e a voz desligam-se na casa. Durante a sessão o ecrã não apaga.

## Ficheiros

| Ficheiro | O que é | Mexe-se? |
|---|---|---|
| `app.onda` | a app toda, em Onda: o estado, o ecrã e o que cada toque e cada tique fazem (272 linhas) | sim: é aqui que se trabalha |
| `dados.json` | os exercícios e as sessões do plano | sim: mudar o plano não precisa de código |
| `index.html`, `app.css` | o lugar do ecrã (`#ecra`) e o aspeto | sim |
| `app.js` | a casca (18 linhas): carrega o módulo e avisa a app quando a página se esconde | quase nunca |
| `build.mjs` | junta a biblioteca da Onda e a app e compila | só a lista `EVENTOS` |
| `sw.js`, `manifest.webmanifest`, `icone.svg`, `icon-*.png`, `apple-touch-icon.png` | instalar e abrir sem rede | a versão da cache, em cada versão |
| `gerado/` | o que o `build.mjs` escreve (o módulo e o anfitrião da Onda) | nunca à mão |
| `tests/` | os testes, num Chromium com o relógio do teste | com cada mudança |

## Montar e testar

A partir da raiz do repositório:

```sh
node ginastica/build.mjs                  # app.onda + onda/lib → gerado/app.wasm (54 KB) e gerado/anfitriao.js
node ginastica/build.mjs --verificar      # não escreve nada: falha se o gerado/ não é o da app de agora
node --test ginastica/tests/*.test.mjs    # 7 testes (monta a app antes de começar)
npx serve .                               # e abrir /ginastica/
```

Um erro do compilador diz o ficheiro e a linha (`→ ginastica/app.onda, linha 197, coluna 36`).

## Mudar o plano sem mexer no código

Tudo está no `dados.json`:

- **Um exercício** tem `id`, `nome`, `como` (como se faz, até 170 letras) e um `tipo`:
  - `tempo`: um relógio de `seg` segundos;
  - `segura`: `vezes` × `seg` segundos, com `pausa` segundos de descanso entre vezes; com `lados` (uma lista de
    nomes), cada vez faz-se em todos, com 5 segundos de troca;
  - `conta`: ela conta e toca em «Feito»; `quanto` é o que o ecrã diz e `dura` quanto costuma levar, em segundos.
  - `quanto` também serve nos outros tipos, para dizer a dose por outras palavras.
- **Uma sessão** tem `id`, `nome` e `passos`. Um passo é o `id` de um exercício, `{ "ex": id, "vezes": n }` para
  mudar as vezes só nessa sessão, ou `{ "vez": [ids] }` para um de cada vez que a sessão se faz (o aparelho).

O primeiro teste confere os dados contra o `PLANO.md` (os 29 exercícios e as quatro sessões): quando o plano mudar,
mudam os dois. Um passo que aponte para um exercício que não existe é saltado.

## O que guarda no aparelho

| Chave | O quê |
|---|---|
| `ginastica:feitas` | as sessões que deram estrela: `AAAA-MM-DD:ID,` umas a seguir às outras (o dia é o de Lisboa) |
| `ginastica:som`, `ginastica:voz` | `0` se foram desligados |

## Publicar uma versão

Subir os `?v=` do `index.html` e do `app.js`, a lista e o nome da cache no `sw.js` (`ginastica-v2`…), montar, correr
os testes e dizer a versão no título do commit («Ginástica 0.2.0: …»). Juntar ao `main` só com o OK do dono.

## Limites

- A voz, o som e o ecrã acordado estão testados com o browser a fingir e num Chromium sem ecrã. Num telemóvel a sério
  ainda não foram experimentados.
- Com o telemóvel deitado é preciso rolar para chegar aos botões.
- As doses são as das semanas 1 a 4. As doze semanas, o calendário e as medidas são as voltas 2 e 3 do plano.
