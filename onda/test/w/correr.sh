#!/bin/sh
# Compara, programa a programa, a saida em C (via cc) com a saida em WebAssembly escrito pela propria Onda.
set -e
D=$(cd "$(dirname "$0")/../.." && pwd)
B="$D/build/tw"; mkdir -p "$B"; falhas=0
for f in "$D"/test/w/*.onda; do
  n=$(basename "$f" .onda)
  "$D/build/ondac" < "$f" > "$B/$n.c" && cc -O2 -w "$B/$n.c" -o "$B/$n" -lm
  "$D/build/ondac" -w < "$f" > "$B/$n.wasm"
  echo "abc" | "$B/$n" arg1 > "$B/$n.c.out" || true
  echo "abc" | node "$D/wasm/host.js" "$B/$n.wasm" arg1 > "$B/$n.w.out" || true
  if cmp -s "$B/$n.c.out" "$B/$n.w.out"; then echo "ok   $n ($(wc -c < "$B/$n.wasm") bytes de WebAssembly)"; else echo "FALHA $n"; falhas=$((falhas+1)); fi
done
[ $falhas -eq 0 ] && echo "C == WebAssembly em todos" || { echo "$falhas falha(s)"; exit 1; }
