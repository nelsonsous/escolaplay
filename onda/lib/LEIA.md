# A biblioteca da Onda (`onda/lib`)

O que o JavaScript traz de origem, em Onda, para qualquer app: textos, números (`String`, `Number`, `toFixed`,
`toPrecision`, o `Intl` pt-PT), JSON, valores do JS, datas (com Lisboa), o `sort` do V8, HTML e as portas dos
anfitriões. Tudo o que diz ser igual ao JS está conferido contra o próprio JS (Node 22 e Chromium 153) em
`onda/test/biblioteca-*.test.js`. Feita a partir do código das apps que já estava provado (a Mercados: a análise, o
ecrã e o conselheiro).

## Como usar

Uma app em Onda é um só texto: junta-se a biblioteca **antes** da app, por esta ordem (cada módulo só usa os de cima):

```
cat onda/lib/{memoria,texto,numero,valor,json,arvore,data,ordenar,html,anfitriao}.onda app.onda | onda/build/ondac -w > app.wasm
```

Pode-se juntar a biblioteca toda: os nomes dela começam por `_`, que no `-w` são privados — só entram as funções que a
app usa, e o módulo sai **igual ao byte** ao que se faz juntando só os módulos precisos (`test/biblioteca-poda.test.js`).
Com a biblioteca toda viva seriam ~122 KB (252 funções); uma app que só escreve números paga ~12 KB (o `String(x)`), uma
que só usa o `Intl` ~9 KB, o JSON ~36 KB, as datas ~3 KB, o sort ~18 KB (`test/biblioteca-poda.test.js` mede-os).

Para o `-w` (apps e scripts) e também o `-x`/`-a`; no C (`./onda run`) não, porque usa o topo do monte do runtime
(`M[-1]`), o `Oc` e o `_ow`.

## Nomes

Uma só tabela de funções e sem módulos: cada nome da biblioteca é `_` + o prefixo do módulo + `_` + o nome. As apps não
começam nomes por `_` (são do runtime e das bibliotecas), por isso nunca colidem; o runtime não usa um segundo `_`.

| módulo | prefixo | o quê |
|---|---|---|
| `memoria.onda` | `_me_` | o bloco da biblioteca, regiões (`_me_marca`/`_me_solta`), listas que crescem |
| `texto.onda` | `_tx_` | textos: fazer, comparar, procurar, partir, UTF-8 ⇄ códigos, vistas UTF-16, maiúsculas, URI, HTML, JSON de um texto |
| `numero.onda` | `_nu_` | `String(x)`, `Number(t)`, `toFixed`, `toPrecision`, `Math.round/max/min`, o `Intl.NumberFormat('pt-PT')` |
| `valor.onda` | `_js_` | os valores do JS (listas, objetos com a ordem das chaves do JS), `String(v)`, `Number(v)`, `===`, `includes`, `<`, `join` |
| `json.onda` | `_js_`, `_jp_` | `JSON.parse` e `JSON.stringify` ao byte |
| `arvore.onda` | `_ar_` | JSON só de leitura em árvore (o que a ponte de uma app escreve na memória), com a semântica do JS |
| `data.onda` | `_dt_` | dia civil ⇄ dias, `toISOString`, dia da semana, Lisboa (`Europe/Lisbon`) |
| `ordenar.onda` | `_or_` | o `sort` do V8: o PowerSort do Chromium (`_or_power`) e o TimSort do Node 22 (`_or_tim`) |
| `html.onda` | `_ht_` | pedaços de HTML para o ecrã, atributos e textos escapados |
| `anfitriao.onda` | `_an_` | as portas dos anfitriões: apps (`rt/anfitriao.js`, `Y 100–110`) e scripts (`rt/anfitriao-node.js`, `Y 200–214`) |

Cada ficheiro começa com a lista das suas funções, o que fazem e a que função do JS são iguais.

## Globais

A Onda tem 64 globais (`M[0..63]`). A biblioteca só usa **`M[63]`**: aponta para o seu bloco (1 200 palavras, reservado
na primeira vez que uma função precisa dele: os inteiros grandes e os algarismos dos números, a data civil, o leitor de
JSON, os cursores dos textos). A app fica com `M[0..62]`. O bloco é de trabalho (vale durante uma chamada); a lista do
que está onde vem no início de `memoria.onda`.

**Regiões:** o monte da Onda só cresce. Marca-se antes de um evento e solta-se no fim (`= m _me_marca … _me_solta m`): o
que se reservou depois volta a zero e fica livre. O `_me_marca` reserva antes o bloco da biblioteca, para ele ficar
abaixo de todas as marcas; quem repõe o monte de outra maneira (a ponte da Mercados repõe o `M[-1]` do lado do JS)
chama o `_me_lb` no `main`, antes de marcar.

## Textos

O formato é o do `O t`: `M[t]` = fim e os bytes (UTF-8, um por palavra) em `M[t+1 .. M[t]-1]`. Escrever um texto é
imprimir para ele. `_tx_abre n` / `_tx_fecha t` fazem um texto novo de até `n` bytes (com a guarda do `Oc`) e, ao
contrário do `O t … O 0`, **repõem a saída de antes**: abrem-se uns dentro dos outros, e uma função da biblioteca que
faz um texto (o `String(v)` de um valor, por exemplo) pode ser chamada a meio de outra saída.

```
= t _tx_abre 200  "Total: " _nu_moeda 1234.5 2 $"EUR"  _tx_fecha t     -> "Total: 1234,50 €"
= v _js_parse $"{\"a\": [1, 2.5]}"  _js_pj _js_get v $"a" 0 0          -> [1,2.5]
_dt_pquando 1762588800000                                             -> "sábado, 08:00"
```

## O que não é igual ao JS, e porquê

- **Maiúsculas e minúsculas:** só o ASCII e o Latim-1 (U+0000–U+00FF: todos conferidos, `ß` → `SS`, `ÿ` → `Ÿ`,
  `µ` → `Μ`); fora disso o código fica como está.
- **Lisboa:** as regras da UE, que Portugal segue desde 31 de março de 1996; antes disso o JS sabe outras.
- **`_ar_json`:** a árvore guarda a ordem do texto e as chaves repetidas (o `_ar_get` dá a primeira); o `JSON.parse` põe
  primeiro as chaves de índice e fica com a última. Para isso há o `_js_parse`, que é igual.
- **`_ar_vnum`:** o `Number(v)` só dos primitivos (um texto dá NaN; no JS `'12'` dá 12): para isso, `_nu_s2n`.
- **NaN:** o JS não deixa ver os bits de um NaN; a Onda guarda os que vierem (os testes comparam com o `Object.is`).
- **`_tx_pj16`:** JSON válido de um texto UTF-16 (o `JSON.parse` dá o mesmo texto), mas não o texto do `JSON.stringify`
  (escreve o não-ASCII em `\uXXXX`). O `_tx_pj` é o do `JSON.stringify`.
- **O `Intl` e as moedas** são os do CLDR do Chromium 153 e do Node 22 (ICU 78): os 21 símbolos que não são o código.
- **Ordenar:** só por chaves reais (o comparador vem num código, `md`); uma ordem por texto ou outra faz-se com as
  chaves (a posição numa ordem já feita). Não há funções como valores, e a biblioteca não chama funções da app.

## Vindo do `app.onda`

O `lib/app.onda` (it.137) fica tal e qual para quem ainda o usa (a Música). Os nomes correspondem assim:
`tnovo` `_tx_novo`, `tlen` `_tx_len`, `tbyte` `_tx_b`, `tpor` `_tx_p`, `tigual` `_tx_igual`, `tcomeca` `_tx_comeca`,
`tcampo t i` `_tx_campo t i 9`, `tint` `_tx_int`, `thtml` `_tx_html`, `pint n` `_nu_intl F n 0`, `pdec x d`
`_nu_intl x d` (agora o do `Intl`, ao decimal mais curto: `1.005` com 2 casas dá `1,01`), `json` `_ar_json` (a mesma
árvore; um texto que não é JSON dá 0), `jtipo jnum jtxt jn jget jidx` `_ar_tipo _ar_num _ar_txt _ar_n _ar_get _ar_idx`,
`marca`/`solta` `_me_marca`/`_me_solta`. O `app.onda` usa `M[60..62]`; a biblioteca nova só o `M[63]`.

## Testes

`node --test test/biblioteca-*.test.js` (a partir de `onda/`): números (`String`, `JSON.stringify`, `toFixed` 0–100,
`toPrecision` 1–100, `Number(texto)`, `Math`, o `Intl` pt-PT e as moedas) em ~120 000 reais de toda a espécie; JSON e
valores; textos (UTF-16, URI, `TextDecoder`, `trim`, maiúsculas); datas (todos os dias de 1600 a 2400, `toISOString`,
Lisboa em todas as mudanças de hora de 1996 a 2099); o `sort` contra o Node e contra o Chromium (Playwright); a poda; e o
exemplo `ex/carteira/carteira.onda` (um script com sete módulos) contra o mesmo em JS. `test/lib/sonda.onda` põe a
biblioteca à vista do JS.
