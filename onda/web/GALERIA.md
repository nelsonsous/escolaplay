# Galeria Onda — do código-máquina ao telemóvel

Sete peças construídas na série `/loop` (iterações 1–10), todas com **código da
Onda em execução** — GLSL na GPU ou JS compilado por `ondac`, **nenhuma passa
por C**. Cada `.html` é autónomo (shader/função embebidos) e corre no Safari do
telemóvel. Compila-se o campo com `./build/ondac -g <fn>` (GLSL) ou
`./build/ondac -j <fn>` (JS).

| Ficheiro | O que é | Camada |
|---|---|---|
| `onda-hub.html` | Vitrine: história baixo→alto + galeria viva | — |
| `escolaplay-gpu.html` | O mesmo campo na GPU vs 1 núcleo (fps lado a lado) | GPU + CPU |
| `onda-dash.html` | Jogo de nave: portões de neon, rasto, combos | GPU + jogo |
| `onda-fractal.html` | Julia tátil, 200 iterações/pixel | GPU |
| `onda-fluxo.html` | Enxame de partículas guiado por campo Onda→JS | JS (motor) |
| `onda-cromo.html` | Campo iluminado como superfície 3D (crómio) | GPU |
| `onda-pop.html` | Jogo de 30s: rebenta bolhas, combos | GPU + jogo |
| `onda-mandala.html` | Caleidoscópio de 8 eixos, zoom ao toque | GPU |

`gpu-safari.html`, `viva*.html` e `ondac.js` (o compilador Onda em WASM, que
compila Onda→JS/GLSL dentro do browser) são o harness pré-existente.

## Rede neuronal, GPU & editor (série autodiff, it.75–85)

O operador interno de autodiff (`J`) e o alvo GLSL, aplicados a IA que **treina e
infere com código da Onda**. Todos verificados (gradientes vs diferenças finitas;
GPU idêntica ao CPU ao bit; ponto-fixo da auto-compilação intacto).

| Ficheiro | O que é | Prova |
|---|---|---|
| `onda-editor.html` | Editor: a Onda compila **e corre/pinta** o teu código no browser (WASM) | self-hosting, 0 servidor |
| `gpu-multi.{onda,glsl,html}` | 3 classes de um espiral, argmax por pixel na GPU | GPU==CPU 100%, erro 0.00 |
| `gpu-flor.*` (gerador `gpu-multik.gen.js`) | 6 classes + sombreado por confiança, GPU | GPU==CPU 100% |
| `gpu-relu.*` | 5 classes, ocultos ReLU → fronteiras poligonais, GPU | GPU==CPU 100% |
| `ex/jrede.onda`, `ex/jmulti.onda`, `ex/jrelu-rede.onda` | redes (sigmoide/multi-classe/ReLU) treinadas **pelo operador interno `J`** | sobem a ~100% |
| `ex/jsqrt.onda`, `ex/jpow.onda`, `ex/jrelu.onda` | `J` a diferenciar sqrt/pow/min-max | batem dif. finitas, bit-idêntico C/x86/WASM |

O operador interno `J` cobre `+ − × ÷ sqrt pow exp log sin cos min max` (ReLU
incluída). O modo-reverso interno (uma passagem backward, para redes grandes)
fica para uma sessão supervisionada — o caminho escalável já existe via
source-to-source na GPU.
