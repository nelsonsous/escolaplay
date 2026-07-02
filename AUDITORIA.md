# Auditoria de Exercícios — EscolaPlay

> Loop de melhoria contínua. Total: **2368 exercícios** (anos 2, 3, 5, 6, 7).

## Fase 1 — Achados iniciais (concluída)

### ✅ Sem problemas (scan automático)
- IDs duplicados: 0 · `ans` fora do intervalo: 0 · MC com <2 opções: 0 · `fill` vazio: 0
- Tautologias ("X significa X"): 0 · Opções duplicadas reais: 0

### Achados reais → todos resolvidos
1. ~~51 exercícios de Mat 5.º sem explicação~~ → **encerrado** (todos têm `exp`/`solution`/`material`)
2. ~~120 explicações que só repetiam a resposta~~ → **encerrado** (enriquecidas por ano)

## Loop de 50 voltas (analisar → planear → corrigir → testar)

Executado em 10 lotes de 5 voltas, cada um com release e PR próprios.

| Voltas | Versão | Melhoria principal |
|--------|--------|--------------------|
| 1–5 | v533 | 45 explicações de Mat+ e 38 de Som+ passam de número/palavra seca a **estratégia** (decompor, truque do 9, dígrafos, pares mínimos) |
| 6–10 | v534 | +4 puzzles fáceis no Detetive (entrada suave); pergunta duplicada corrigida; progressão adaptativa verificada |
| 11–15 | v535 | 16 explicações de Estudo do Meio/Inglês/Cidadania 3.º enriquecidas; dívida do Mat 5.º encerrada; 4 giveaways equilibrados |
| 16–20 | v536 | 12 opções "giveaway" equilibradas (anos 2/5/6/7); regressão de "vírus" apanhada e revertida |
| 21–25 | v537 | +6 frações **concretas** diff 1 (fração desenhada no enunciado) — o ponto mais duro da discalculia |
| 26–30 | v538 | `fill`/Leitura/Inglês verificados; +1 âncora concreta de divisão (repartir um a um) |
| 31–35 | v539 | Integridade dos jogos: **19 sudokus com solução única**, cruzados e cofres corretos; +3 níveis de subitizing |
| 36–40 | v540 | Ano 2 (Carolina): 30 explicações "Verdade." enriquecidas com o porquê |
| 41–50 | v541 | Verificação final de engines (estimador, quantos, cofre) e integridade da app; este relatório |

## Princípios que guiaram o loop

1. **Onde a criança erra, recebe ajuda real** — a explicação diz o *porquê* (regra, pista, mini-raciocínio), nunca só o resultado.
2. **Nada de adivinhar sem ler** — opções erradas equilibradas em comprimento com a certa.
3. **Discalculia primeiro** — cada tópico duro (frações, divisão, valor posicional) tem uma porta de entrada **concreta e visual** no nível 1.
4. **Jogos matematicamente sólidos** — sudokus com solução única, cofres e cruzados verificados por algoritmo.
5. **Testar antes de cada release** — scanner de duplicados/`ans`/tautologia/eco/unicidade + `node --check` + build.

## Método

- Scanner node sobre todos os `EXERCISES_*` via `EXERCISES_BY_YEAR` (deduplicado por identidade).
- Deteta: ids duplicados, `ans` inválido, tautologia, explicação-eco, `fill` vazio, contradições V/F, divergência exp↔resposta, giveaways por comprimento, unicidade de sudoku (backtracking), equações de cruzados, `afterParagraph` de Leitura.
- Falsos positivos catalogados (silabação, pontuação, notação matemática, passos intermédios nas explicações, exercícios de maiúsculas).

**Estado final:** conteúdo do 3.º ano (foco da Eduarda) convergiu para alta qualidade; anos 2/5/6/7 revistos; jogos verificados. 0 problemas sistémicos em aberto.

_Última atualização: loop de 50 voltas concluído._
