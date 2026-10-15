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
