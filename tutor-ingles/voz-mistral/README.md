# Voz Mistral — conector para a app «Inglês com o Claude»

Cloudflare Worker que dá à app [Inglês com o Claude](../README.md) a voz
Voxtral do Mistral. As páginas publicadas no claude.ai não podem chamar sites
externos, mas podem chamar os conectores MCP da tua conta. Este Worker é um
servidor MCP mínimo (Streamable HTTP, sem estado) com duas ferramentas:

| Ferramenta | Entrada | Devolve |
|---|---|---|
| `speak` | `{ text, voice? }` (até 1000 caracteres) | MP3 em base64 em `structuredContent.data` |
| `voices` | `{}` | vozes de síntese da tua conta Mistral |

- **Chave:** a chave Mistral fica num segredo do Worker e nunca chega ao
  browser.
- **Proteção:** o endereço leva um código secreto (`/mcp/<ACCESS_TOKEN>`).
- **Cache:** cada frase fica em cache no CDN da Cloudflare durante um mês, por
  isso a mesma frase só vai ao Mistral uma vez.
- **Custo:** zero. Chegam o plano grátis da Cloudflare (100 000 pedidos por
  dia) e o do Mistral.

## Publicar (uma vez)

```bash
cd tutor-ingles/voz-mistral
npx wrangler login                        # abre o browser para entrar na Cloudflare
npx wrangler secret put MISTRAL_API_KEY   # cola a tua chave Mistral (a mesma da EscolaPlay)
npx wrangler secret put ACCESS_TOKEN      # inventa um código longo, só letras e números
npx wrangler deploy
```

O `wrangler` imprime o endereço, algo como
`https://tutor-voz-mistral.<a-tua-conta>.workers.dev`. Abrir esse endereço no
browser mostra «o Worker está a funcionar».

## Ligar ao claude.ai

1. Em **Personalizar › Conectores**, escolhe **Adicionar conector
   personalizado**.
2. **Nome:** `Voz Mistral`. Tem de ser exatamente este, porque é o nome que a
   app procura.
3. **URL:** `https://tutor-voz-mistral.<a-tua-conta>.workers.dev/mcp/<ACCESS_TOKEN>`
4. **Autenticação:** sem início de sessão (*No sign-in*).
5. Abre a app, vai a **Definições › Voz do tutor › Ouvir exemplo** e aceita o
   pedido de acesso ao conector.

Se alguma coisa falhar (conector em falta, limite do Mistral, chave recusada),
a app mostra o motivo nas definições e usa a voz do dispositivo até lá.

## Vozes

A app traz estas vozes, e **Carregar vozes da conta** junta as restantes da
tua conta Mistral:

| Voz | Sotaque |
|---|---|
| `gb_oliver_neutral` | britânico (por omissão) |
| `gb_jane_neutral` | britânico |
| `gb_oliver_confident` | britânico |
| `en_paul_neutral` | americano |

A voz por omissão do Worker e o modelo (`voxtral-mini-tts-2603`) podem mudar-se
em `[vars]` no `wrangler.toml` (`DEFAULT_VOICE`, `MISTRAL_TTS_MODEL`).

## Atualizar

```bash
npx wrangler deploy
```

Para trocar a chave ou o código secreto, volta a correr o respetivo
`npx wrangler secret put`. Se mudares o `ACCESS_TOKEN`, corrige também o URL do
conector no claude.ai.
