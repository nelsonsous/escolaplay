#!/bin/sh
# Compila o compilador da Onda (semente C) para WebAssembly, com a libc minima deste diretorio.
set -e
cd "$(dirname "$0")/.."
clang --target=wasm32 -O2 -nostdlib -ffreestanding -w -I wasm/include -DONDA_MEM=9000000LL -Dmain=onda_main \
  seed/ondac.c wasm/libc.c -Wl,--no-entry -Wl,--allow-undefined -Wl,--export-dynamic -o web/ondac.wasm
echo "web/ondac.wasm: $(wc -c < web/ondac.wasm) bytes"
