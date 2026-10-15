#!/bin/sh
# Arranque da Onda: estagio 0 (Rust) -> ondac1 -> ondac2 -> ondac3 (ponto fixo)
set -e
cd "$(dirname "$0")"
CC="${CC:-cc}"
mkdir -p build seed
{ printf ': prel >i "'; sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' rt/prelude.c; printf '"\n'; } > src/0prel.onda
cat src/*.onda > build/ondac.onda
if [ "$1" = "--semente" ] || ! command -v cargo >/dev/null; then
  echo "[0] a partir da semente C (sem Rust)"; cp seed/ondac.c build/ondac0.c
else
  echo "[0] estagio 0 em Rust"; cargo build --release -q --manifest-path boot/Cargo.toml
  boot/target/release/onda-boot < build/ondac.onda > build/ondac0.c
fi
$CC -O2 -w build/ondac0.c -o build/ondac1 -lm
build/ondac1 < build/ondac.onda > build/ondac1.c
$CC -O2 -w build/ondac1.c -o build/ondac2 -lm
build/ondac2 < build/ondac.onda > build/ondac2.c
$CC -O2 -w build/ondac2.c -o build/ondac3 -lm
build/ondac3 < build/ondac.onda > build/ondac3.c
cmp build/ondac1.c build/ondac2.c
cmp build/ondac2.c build/ondac3.c
echo "[ok] ponto fixo: a Onda compila-se a si propria, bit a bit ($(sha256sum build/ondac2.c | cut -c1-16))"
cp build/ondac2.c seed/ondac.c
cp build/ondac3 build/ondac
# ponto fixo em WebAssembly escrito pela propria Onda (sem C nem clang): w1 -> w2 -> w3
if command -v node >/dev/null; then
  build/ondac -w < build/ondac.onda > build/w1.wasm
  node wasm/host.js build/w1.wasm -w < build/ondac.onda > build/w2.wasm
  node wasm/host.js build/w2.wasm -w < build/ondac.onda > build/w3.wasm
  cmp build/w1.wasm build/w2.wasm
  cmp build/w2.wasm build/w3.wasm
  node wasm/host.js build/w2.wasm < build/ondac.onda | cmp - seed/ondac.c
  echo "[ok] ponto fixo em WebAssembly: $(wc -c < build/w2.wasm) bytes escritos pela Onda, e geram a semente C exata"
  cp build/w2.wasm seed/ondac.wasm
fi
