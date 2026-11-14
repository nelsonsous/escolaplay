# Música no iPhone — a app nativa

Esta pasta é a Música como app nativa (Capacitor 8). **Os ficheiros da app vão dentro dela**: abre sem rede e não
depende do site, como a loja da Apple pede (uma app que só abre um site é recusada). Os dados — as playlists, os
pedidos — continuam a vir do conector, por isso para os ver é precisa Internet.

Serve para experimentar no simulador e no teu iPhone, sem pagar nada, e é a base do que vai para a App Store.

## No Mac (só precisas do Xcode)

1. Instala o **Xcode** (grátis, na App Store do Mac).
2. Traz o repositório para o Mac: no GitHub, **Code → Download ZIP** (ou `git clone https://github.com/nelsonsous/escolaplay.git`).
3. Abre `musica/nativo/ios/App/App.xcodeproj` com duplo clique. Da primeira vez, o Xcode descarrega o Capacitor
   (aparece «Resolving packages» em baixo; espera que acabe).
4. Em cima, ao lado de «App», escolhe um iPhone do simulador e carrega em **▶**.

O projeto iOS do repositório já traz a app montada: não é preciso correr mais nada.

## No teu iPhone (grátis, com o teu Apple ID)

1. Liga o iPhone ao Mac por cabo.
2. No Xcode: **Xcode → Settings → Accounts → +** e entra com o teu Apple ID.
3. Clica em «App» (à esquerda) → separador **Signing & Capabilities** → em **Team**, escolhe o teu nome (Personal Team).
4. Em cima, escolhe o teu iPhone e carrega em **▶**.
5. Da primeira vez, no iPhone:
   - **Definições → Privacidade e segurança → Modo de programador** → ligar (o iPhone reinicia);
   - **Definições → Geral → VPN e gestão de dispositivos** → confiar no teu Apple ID.

A app instalada assim dura **7 dias**; depois, carrega outra vez em ▶ no Xcode.

## Novidades da app

Como os ficheiros vão dentro da app, uma versão nova da Música só chega à app nativa quando a voltas a instalar:
traz o repositório outra vez (ou `git pull`) e carrega em ▶ no Xcode. A app do ecrã principal (a do Safari)
continua a atualizar-se sozinha.

## Entrar na tua conta

- **Ligar ao Tidal**: o login abre dentro da app e volta a ela (o conector sabe que o pedido veio da app nativa).
  Entra com o email e a palavra-passe do Tidal: os botões «Continuar com Apple/Google» podem sair para o Safari
  e, nesse caso, não voltam à app.
- Ou, na app do ecrã principal (onde já entraste): **Ajustes → Ligar outro aparelho**, e cola o código aqui.

## O que já tem para a App Store

- A app vai dentro da app (sem depender do site) e abre sem rede.
- **Apagar a minha conta**, nos Ajustes (a loja exige que se possa apagar a conta dentro da app).
- Páginas de **privacidade** e de **apoio**, dentro da app e no site:
  `https://nelsonsous.github.io/escolaplay/musica/privacidade.html` e `…/apoio.html` (são os endereços a dar à loja).
- Os textos da app não usam marcas de terceiros para se descrever (o Maestro é «uma IA»; quem a faz está na
  página de privacidade).
- A loja não pergunta pela cifra em cada envio (`ITSAppUsesNonExemptEncryption`), e a versão é a da app.

## O que ainda falta (precisa do programa pago da Apple, 99 USD/ano)

- **Avisos nativos** (APNs) e o envio para a loja: ficam para a volta seguinte do plano (`../PLANO.md`).
- Experimentar o login no iPhone a sério: aqui só foi testado com o simulador do conector.

## Para quem mexe na app

Depois de mudar a app (`npm run onda`, em `musica/`), os ficheiros desta pasta montam-se sozinhos
(`nativo/montar.mjs`: copia a app para `www/` e para o projeto iOS, com a configuração e a versão). Os testes
(`tests/nativo.test.mjs`) falham se o que está montado não for a app de agora.

Para mudar a configuração do Capacitor (`capacitor.config.json`) ou juntar um plugin, num Mac, nesta pasta:

```sh
npm install
npm run ios      # monta, copia a configuração para o projeto iOS e abre o Xcode
```
