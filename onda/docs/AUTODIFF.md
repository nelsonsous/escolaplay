# Autodiff na Onda — desenho e plano

Objetivo declarado pelo utilizador: **melhor que o PyTorch/JAX**. O que a Onda já tem (um só código-fonte que
compila para AVX, NEON, WebAssembly SIMD e GPU, igual ao bit onde é determinista) não chega para essa liga sem
a peça central de um sistema de IA: **diferenciação automática** (autodiff), o motor que calcula gradientes
para treinar modelos. Este documento fixa o desenho e o plano.

## 1. O que o autodiff precisa

Dado um programa que calcula uma perda escalar `L` a partir de parâmetros `θ`, o autodiff em **modo reverso**
(o backprop) calcula `∂L/∂θ` com um custo da mesma ordem do forward — independentemente de quantos parâmetros
houver. Faz-se em dois passos:

1. **Forward**: corre o cálculo, guardando os valores intermédios de que o backward precisa.
2. **Backward**: propaga o *adjunto* `v̄ = ∂L/∂v` de trás para a frente, aplicando a cada primitiva a sua regra
   adjunta (o *VJP*, vector-Jacobian product), acumulando em `θ̄`.

## 2. As regras adjuntas das primitivas da Onda

Para a aritmética e a matemática escalar (um valor `y = f(…)`, adjunto de saída `ȳ`, acumula nos adjuntos das
entradas):

| primitiva      | forward            | adjunto (VJP)                                  |
|----------------|--------------------|------------------------------------------------|
| soma           | `y = a + b`        | `ā += ȳ`,  `b̄ += ȳ`                            |
| subtração      | `y = a - b`        | `ā += ȳ`,  `b̄ -= ȳ`                            |
| produto        | `y = a * b`        | `ā += ȳ·b`,  `b̄ += ȳ·a`                        |
| divisão        | `y = a / b`        | `ā += ȳ/b`,  `b̄ -= ȳ·a/b²`                     |
| `sqrt`         | `y = √a`           | `ā += ȳ/(2y)`                                  |
| `exp`          | `y = eᵃ`           | `ā += ȳ·y`                                     |
| `log`          | `y = ln a`         | `ā += ȳ/a`                                     |
| `sin` / `cos`  | `y = sin a`        | `ā += ȳ·cos a`  (e `-sin a` para o `cos`)      |

Para as **operações de campo** (as que dão paralelismo, e onde está a velocidade) vale a dualidade central:

| operação de campo        | forward                     | adjunto                                            |
|--------------------------|-----------------------------|----------------------------------------------------|
| **mapa**  `E`            | `y[i] = f(x[i])`            | `x̄[i] += f'(x[i])·ȳ[i]`  — **é outro mapa**        |
| **redução-soma** `S`     | `s = Σ x[i]`               | `x̄[i] += s̄`  — **é um broadcast** (um mapa)        |
| **broadcast**            | `y[i] = c` (c escalar)     | `c̄ += Σ ȳ[i]`  — **é uma redução-soma**            |

Em resumo: **o adjunto de um mapa é um mapa; o adjunto de uma soma é um broadcast, e vice-versa.** O backward
é feito das *mesmas* operações de campo que o forward.

## 3. A tese que separa a Onda do PyTorch/JAX

No PyTorch/JAX, o passo backward de cada operação é um **kernel separado**, escrito à mão (CUDA/cuDNN) ou gerado
por um compilador próprio (XLA). As reduções na GPU usam somas atómicas → a ordem muda entre corridas → **o
gradiente não é determinista ao bit**. E o backward só é rápido onde existe esse kernel.

Na Onda, como o adjunto de um mapa é um mapa e o de uma soma é um broadcast, **o backward passa pelo mesmo
emissor que o forward**: herda de graça o AVX (x86), o NEON (Apple Silicon, it.68), o f64x2 (WASM/Safari) e a
GPU (WebGL2) — e é **determinista ao bit** onde o forward é (reduções em série ou com ordem fixa). Uma só fonte,
o mesmo gradiente em qualquer máquina. É aqui que uma linguagem desenhada de raiz para IA pode ganhar à
biblioteca: não em TFLOPs brutos num A100 (onde o CUDA ganha), mas em **portabilidade + determinismo + edge/browser**.

## 4. O desenho: source-to-source, não fita

Há duas formas de implementar autodiff:
- **Fita (tape / eager)**: grava as operações em runtime e reproduz-nas ao contrário. É o que o PyTorch faz.
  Simples, mas o backward é interpretado (lento) e aloca a fita a cada corrida.
- **Source-to-source**: transforma o *programa* forward no *programa* backward, em tempo de compilação. É o que
  o JAX/Zygote fazem. O backward é código compilado (rápido), sem fita.

A Onda vai de **source-to-source**, e tem uma vantagem rara para o fazer de forma simples: o analisador `xvan`
(it.58+) já reconhece e valida a árvore exata do elemento de um mapa — uma expressão de `+ - * /` sobre a
variável `x` e constantes. **Diferenciar essa árvore é mecânico** (as regras da secção 2 aplicadas à árvore),
e o resultado é outra árvore de `+ - * /` sobre `x` — ou seja, **outro elemento de mapa vetorizável**. O
gradiente de um mapa da Onda é, literalmente, um mapa da Onda que corre em AVX/NEON/WASM/GPU.

## 5. Estado e plano

- **it.69 (feito)** — fundação verificada. `ex/autodiff.onda`: gradiente de uma regressão linear por modo
  reverso, escrito com as operações de campo (forward = mapa `pred` + redução da perda; backward = reduções
  que são os adjuntos). Conferido contra diferenças finitas centradas (bate a ~10 dígitos) e **bit a bit igual
  em C, x86 e WASM** (`test/autodiff.test.js`). Prova que a matemática e a dualidade mapa/redução estão certas.
- **it.70 (próxima)** — diferenciação simbólica automática da árvore do elemento do mapa: dado `f` validado por
  `xvan`, gerar o elemento adjunto `λx,ȳ. f'(x)·ȳ` e emiti-lo como um novo mapa. Verificar contra diferenças
  finitas e contra o gradiente escrito à mão desta iteração.
- **depois** — acumulação de adjuntos em arrays de parâmetros (pesos), um grafo de operações de campo
  encadeadas, e treinar um modelo pequeno (regressão → uma camada → MLP minúsculo) de ponta a ponta, medindo o
  determinismo entre backends.
