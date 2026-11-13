# Música no iPhone — a app nativa de teste

Esta pasta é a Música como app nativa (Capacitor 8). A app abre a Música do site em ecrã inteiro, por isso as
novidades chegam sozinhas, sem reinstalar. Serve para experimentar no simulador e no teu iPhone, sem pagar nada.

## No Mac (só precisas do Xcode)

1. Instala o **Xcode** (grátis, na App Store do Mac).
2. Traz o repositório para o Mac: no GitHub, **Code → Download ZIP** (ou `git clone https://github.com/nelsonsous/escolaplay.git`).
3. Abre `musica/nativo/ios/App/App.xcodeproj` com duplo clique. Da primeira vez, o Xcode descarrega o Capacitor
   (aparece «Resolving packages» em baixo; espera que acabe).
4. Em cima, ao lado de «App», escolhe um iPhone do simulador e carrega em **▶**.

## No teu iPhone (grátis, com o teu Apple ID)

1. Liga o iPhone ao Mac por cabo.
2. No Xcode: **Xcode → Settings → Accounts → +** e entra com o teu Apple ID.
3. Clica em «App» (à esquerda) → separador **Signing & Capabilities** → em **Team**, escolhe o teu nome (Personal Team).
4. Em cima, escolhe o teu iPhone e carrega em **▶**.
5. Da primeira vez, no iPhone:
   - **Definições → Privacidade e segurança → Modo de programador** → ligar (o iPhone reinicia);
   - **Definições → Geral → VPN e gestão de dispositivos** → confiar no teu Apple ID.

A app instalada assim dura **7 dias**; depois, carrega outra vez em ▶ no Xcode.

## Entrar na tua conta

- **Ligar ao Tidal**: o login abre dentro da app e volta a ela.
- Ou, na app do ecrã principal (onde já entraste): **Ajustes → Ligar outro aparelho**, e cola o código aqui.

## O que esta versão de teste não faz

- **Avisos**: numa app nativa precisam do programa pago da Apple (99 USD/ano). Os avisos funcionam já na app do
  ecrã principal (Safari → Partilhar → Adicionar ao ecrã principal → Ajustes → Avisos).
- **Sem Internet** mostra «Sem ligação».
- **App Store**: para lá, os ficheiros passam para dentro da app (sem depender do site) e junta-se o que a Apple pede.
  Fica para quando decidires.

## Para mudar a configuração

A configuração está em `capacitor.config.json`. Depois de a mudar, num terminal nesta pasta:

```sh
npm install
npm run ios      # copia a configuração para o projeto iOS e abre o Xcode
```
