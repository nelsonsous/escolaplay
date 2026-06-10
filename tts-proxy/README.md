# EscolaPlay TTS proxy

Cloudflare Worker que reembala o Microsoft Edge Read-Aloud TTS num GET HTTPS
que devolve um MP3. Resolve o silêncio em iOS Safari (a Apple estrangula o
WebSocket para a Microsoft em modo PWA).

## Deploy (1ª vez)

```bash
cd tts-proxy
npx wrangler login        # abre o browser para login Cloudflare
npx wrangler deploy       # publica o worker
```

No fim do deploy o `wrangler` imprime o URL, algo como:

```
https://escolaplay-tts.<TEU-USER>.workers.dev
```

Copia esse URL.

## Configurar a app

1. Abre a EscolaPlay → Perfil → "Voz neural grátis (Edge)"
2. Cola o URL no campo "Proxy TTS (iOS)"
3. Carrega "Guardar"

A partir daí, o iPhone passa a tocar as vozes neurais (Raquel/Duarte/Fernanda
em PT; Aria/Guy/Jenny/Sonia/Ryan em EN) como em desktop.

## Quota grátis

- 100 000 requests/dia no plano Free do Cloudflare.
- O Worker faz cache no CDN, por isso a mesma frase só vai à Microsoft uma vez
  por região por mês.

## Endpoint

```
GET /?text=<texto>&voice=<voz>&lang=<pt-PT|en-US>
```

Devolve `audio/mpeg`. CORS aberto.

## Atualizar

```bash
npx wrangler deploy
```
