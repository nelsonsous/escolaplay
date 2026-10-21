#!/bin/sh
# Arranque da Onda, 100% escrito pela propria Onda: sem Rust e sem compilador de C.
# A Onda recompila-se a partir das suas proprias sementes (WASM e x86-64 nativo) ate ao
# ponto fixo bit a bit. A ponte C (--c) fica so para portar a um CPU ainda sem backend nativo.
set -e
cd "$(dirname "$0")"
mkdir -p build
# o runtime do alvo C e embebido como fonte Onda (nao invoca nenhum compilador de C).
{ printf ': prel >i "'; sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' rt/prelude.c; printf '"\n'; } > src/0prel.onda
cat src/*.onda > build/ondac.onda

# --- ponte C opcional: so para arrancar num CPU sem backend nativo ainda ---
if [ "$1" = "--c" ]; then
  CC="${CC:-cc}"
  echo "[0] ponte C a partir de seed/ondac.c"
  cp seed/ondac.c build/ondac0.c
  $CC -O2 -fwrapv -w build/ondac0.c -o build/ondac1 -lm
  build/ondac1 < build/ondac.onda > build/ondac1.c
  $CC -O2 -fwrapv -w build/ondac1.c -o build/ondac2 -lm
  build/ondac2 < build/ondac.onda > build/ondac2.c
  cmp build/ondac1.c build/ondac2.c
  cp build/ondac2.c seed/ondac.c
  cp build/ondac2 build/ondac
  echo "[ok] ponte C: ponto fixo ($(sha256sum build/ondac2.c | cut -c1-16))"
  exit 0
fi

# --- arranque puro a partir da semente NATIVA x86-64, sem sequer Node ---
if [ "$1" = "--semente-x86" ]; then
  echo "[0] a partir da semente nativa x86-64 (sem Rust, sem C, sem Node)"
  seed/ondac-x86-64 -x < build/ondac.onda > build/x1 && chmod +x build/x1
  build/x1 -x < build/ondac.onda > build/x2 && chmod +x build/x2
  build/x2 -x < build/ondac.onda > build/x3
  cmp build/x1 build/x2
  cmp build/x2 build/x3
  cp build/x2 build/ondac
  cp build/x2 seed/ondac-x86-64
  echo "[ok] ponto fixo nativo x86-64 (so Onda): $(wc -c < build/x2) bytes"
  exit 0
fi

# --- arranque a partir da semente NATIVA arm64 (Apple Silicon), sem Node: o codigo-maquina e todo da Onda,
# o clang so linka o objeto Mach-O (-m). Ponto fixo: a2 (feito por a1) e a3 (feito por a2) iguais ao byte.
if [ "$1" = "--semente-arm64" ]; then
  echo "[0] a partir da semente nativa arm64 (sem Rust, sem C, sem Node; o clang so linka)"
  LD="${CC:-cc}"
  seed/ondac-arm64 -m < build/ondac.onda > build/a1.o && $LD build/a1.o -o build/a1
  build/a1 -m < build/ondac.onda > build/a2.o && $LD build/a2.o -o build/a2
  build/a2 -m < build/ondac.onda > build/a3.o
  cmp build/a2.o build/a3.o
  cp build/a2 build/ondac
  cp build/a2 seed/ondac-arm64
  echo "[ok] ponto fixo nativo arm64 (so Onda): objeto de $(wc -c < build/a2.o) bytes"
  exit 0
fi

# --- arranque padrao: 100% Onda, sem C. Semente WASM a correr so com Node. ---
command -v node >/dev/null || { echo "preciso de Node para a semente WASM (ou: sh build.sh --semente-x86 / --c)"; exit 1; }
echo "[0] a partir da semente WASM escrita pela Onda (sem Rust, sem C)"
node wasm/host.js seed/ondac.wasm -w < build/ondac.onda > build/w1.wasm
node wasm/host.js build/w1.wasm   -w < build/ondac.onda > build/w2.wasm
node wasm/host.js build/w2.wasm   -w < build/ondac.onda > build/w3.wasm
# o ponto fixo e w2 == w3 (o w1 ainda leva o runtime embutido da semente anterior quando este muda)
cmp build/w2.wasm build/w3.wasm
cp build/w2.wasm seed/ondac.wasm
echo "[ok] ponto fixo WASM (so Onda, sem C): $(wc -c < build/w2.wasm) bytes"

# compilador nativo para uso local, a partir da semente nativa (sem C, assembler nem linker em x86-64)
if [ "$(uname -s)-$(uname -m)" = "Linux-x86_64" ]; then
  seed/ondac-x86-64 -x < build/ondac.onda > build/ondac && chmod +x build/ondac
  build/ondac -x < build/ondac.onda > build/x2 && chmod +x build/x2
  build/x2 -x < build/ondac.onda > build/x3
  cmp build/ondac build/x2
  cmp build/x2 build/x3
  cp build/x2 seed/ondac-x86-64
  echo "[ok] ponto fixo nativo x86-64 (so Onda): $(wc -c < build/x2) bytes"
elif [ "$(uname -s)-$(uname -m)" = "Darwin-arm64" ] && command -v "${CC:-cc}" >/dev/null; then
  # no Mac M1: compilador nativo arm64 escrito pela Onda (-m), a partir da semente WASM acabada de fechar
  LD="${CC:-cc}"
  node wasm/host.js seed/ondac.wasm -m < build/ondac.onda > build/a1.o && $LD build/a1.o -o build/a1
  build/a1 -m < build/ondac.onda > build/a2.o && $LD build/a2.o -o build/a2
  build/a2 -m < build/ondac.onda > build/a3.o
  cmp build/a1.o build/a2.o
  cmp build/a2.o build/a3.o
  cp build/a2 build/ondac
  cp build/a2 seed/ondac-arm64
  echo "[ok] ponto fixo nativo arm64 (so Onda; o clang so linka): objeto de $(wc -c < build/a2.o) bytes"
else
  printf '#!/bin/sh\nexec node "%s/wasm/host.js" "%s/seed/ondac.wasm" "$@"\n' "$PWD" "$PWD" > build/ondac && chmod +x build/ondac
  echo "[i] build/ondac corre a semente WASM via Node (plataforma nao-Linux-x86_64, p.ex. o M1)"
fi
