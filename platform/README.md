# EscolaPlay — Plataforma (monorepo)

Base para evoluir a EscolaPlay de PWA para uma plataforma multiplataforma
(web + nativo) com um **núcleo partilhado**. A PWA atual (na raiz do repo)
**continua a funcionar sem alterações** — esta pasta é aditiva.

## Ideia central

Um só "cérebro" (`core`), várias cascas finas:

```
packages/core   conteúdo + motor (XP, níveis, packs de currículo). TS puro.
packages/ui     componentes Tamagui partilhados (web + nativo). Ex: HomeScreen.
apps/mobile     casca Expo (React Native). Importa o ui.
apps/web        (a criar) casca web via react-native-web. Importa o MESMO ui.
```

A costura que torna a app **global**: o conteúdo é exposto como
`CurriculumPack` (locale + ano). Trocar de país = trocar de pack. Os 35k de
conteúdo legado (`content_*.js`) são reutilizados via `buildPackFromLegacy`,
**sem reescrita**.

## Estado atual (o que está verificado)

| Pacote | Estado | Verificação |
|---|---|---|
| `@escolaplay/core` | ✅ funcional | `tsc` limpo + **15 testes passam** |
| `@escolaplay/ui` | ✅ build + typecheck | compila para `dist`; `tsc` limpo |
| `apps/mobile` | ✅ typecheck + configs | `tsc` limpo contra Expo/RN/Tamagui; Metro carrega |

> Honestidade: tudo acima foi verificado por compilação/tipos/testes neste
> ambiente. **Nada foi renderizado** — não há browser nem simulador iOS aqui.
> O "ver com os olhos" faz-se no Mac (abaixo).

## Matriz de versões

Alinhada com o ecossistema atual (mai/2026): **Expo SDK 56 · React 19 ·
React Native 0.85**. Fixada via `pnpm.overrides` na raiz para garantir uma
única versão de React/RN em todo o monorepo (requisito do RN).

## Correr no Mac

```bash
cd platform
pnpm install

# 1) confirmar o core (deve dar 15 testes verdes)
pnpm --filter @escolaplay/core test

# 2) arrancar a app (constroi core+ui e abre o Expo)
pnpm mobile
#   -> 'i' para o simulador iOS, ou ler o QR com a app Expo Go no iPhone

# Se o Expo se queixar de versoes, alinhar ao SDK instalado:
cd apps/mobile && npx expo install --fix
```

## Próximos passos sugeridos

1. Correr o `apps/mobile` localmente e validar a Home no telemóvel.
2. Criar `apps/web` (react-native-web) consumindo a mesma `<HomeScreen />`.
3. Gerar packs reais a partir de `content_*.js` (script de conversão).
4. Migrar o próximo ecrã (exercício) para o `core` + `ui`.
