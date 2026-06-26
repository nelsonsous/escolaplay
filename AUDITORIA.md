# Auditoria de Exercícios — EscolaPlay

> Loop de melhoria em 3 fases: **(1-10) identificar** · **(11-30) corrigir** · **(31-60) regenerar**.
> Total auditado: **2208 exercícios** (anos 2, 3, 5, 6, 7, 11).

## Fase 1 — Achados (em curso)

### ✅ Sem problemas (verificado por scan automático)
- **IDs duplicados:** 0
- **`ans` fora do intervalo das opções:** 0
- **MC com menos de 2 opções:** 0
- **`fill` com resposta vazia:** 0
- **Tautologias** ("X significa X"): 0 reais (corrigidas v508/v509; restantes são silabação legítima)
- **Opções duplicadas:** 0 reais — os 35 sinalizados são falsos positivos (exercícios de pontuação `. ! ? ,`, de maiúsculas, ou de notação matemática `3 × 6` vs `3 + 3` onde o normalizador apaga os símbolos que são o objetivo)

### 🟠 A corrigir (Fase 2: loops 11-30)
1. **51 exercícios de Matemática do 5.º ano sem explicação** (`EXERCISES_5/matematica`, ex.: `m200`, `m201`…).
   Uma criança que erra não recebe qualquer ajuda. Prioridade alta.
2. **120 explicações que só repetem a resposta** (valor pedagógico nulo). Concentração:
   - 3.º **Mat+**: 54
   - 3.º **Som+**: 34
   - 3.º Estudo do Meio: 7; 7.º Geografia: 5; 2.º Inglês: 5; 2.º Estudo do Meio: 4; restantes dispersos.
   Devem passar a explicar o *porquê* (regra, pista, mini-raciocínio), não só dizer o resultado.

### 🔵 A regenerar (Fase 3: loops 31-60)
- Substituir exercícios fracos por novos de alta qualidade, com mais texto e — onde fizer sentido — a lógica interativa do **Detetive Mental** (cofre, suspeitos, padrão, estimador, base-10) para serem mais fluidos e legíveis.
- Candidatos: tópicos com muitos MC secos de memorização (Som+, Mat+, vocabulário de línguas).

## Método
- Scanner node (`/tmp/audit.js`) corre sobre todos os `EXERCISES_*`; deteta tautologia, opções duplicadas (exato + normalizado), `ans` inválido, `exp` ausente/eco, `fill` vazio, IDs duplicados.
- Falsos positivos catalogados para não reincidirem (silabação, pontuação, notação matemática).

_Última atualização: Fase 1, volta 1._
