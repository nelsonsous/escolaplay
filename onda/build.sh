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

# --- arranque padrao: 100% Onda, sem C. Semente WASM a correr so com Node. ---
command -v node >/dev/null || { echo "preciso de Node para a semente WASM (ou: sh build.sh --semente-x86 / --c)"; exit 1; }
echo "[0] a partir da semente WASM escrita pela Onda (sem Rust, sem C)"
node wasm/host.js seed/ondac.wasm -w < build/ondac.onda > build/w1.wasm
node wasm/host.js build/w1.wasm   -w < build/ondac.onda > build/w2.wasm
node wasm/host.js build/w2.wasm   -w < build/ondac.onda > build/w3.wasm
cmp build/w1.wasm build/w2.wasm
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
else
  printf '#!/bin/sh\nexec node "%s/wasm/host.js" "%s/seed/ondac.wasm" "$@"\n' "$PWD" "$PWD" > build/ondac && chmod +x build/ondac
  echo "[i] build/ondac corre a semente WASM via Node (plataforma nao-Linux-x86_64, p.ex. o M1)"
fi
