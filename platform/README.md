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
| `@escolaplay/core` | ✅ funcional | `tsc` limpo + **15 testes passam** (`pnpm --filter @escolaplay/core test`) |
| `@escolaplay/ui` | ✅ typecheck | `tsc` limpo. **Não renderizado** (sem browser/simulador no ambiente) |
| `apps/mobile` | 🚧 scaffold | entrada escrita; precisa do toolchain Expo local para correr |
| `apps/web` | ⬜ por criar | mesma `<HomeScreen />`, via react-native-web |

> Honestidade: o `core` está provado por testes. O visual (`ui`/apps) está
> escrito e validado por tipos, mas **não foi renderizado aqui**. Para "ver
> com os olhos", correr localmente (abaixo).

## Comandos

```bash
cd platform
pnpm install

# core — o que está 100% verificado
pnpm --filter @escolaplay/core test
pnpm --filter @escolaplay/core typecheck

# ui
pnpm --filter @escolaplay/ui typecheck

# mobile (requer toolchain Expo na máquina local)
pnpm --filter @escolaplay/mobile start
```

## Próximos passos sugeridos

1. Correr o `apps/mobile` localmente e validar a Home no telemóvel.
2. Criar `apps/web` (react-native-web) consumindo a mesma `<HomeScreen />`.
3. Gerar packs reais a partir de `content_*.js` (script de conversão).
4. Migrar o próximo ecrã (exercício) para o `core` + `ui`.
