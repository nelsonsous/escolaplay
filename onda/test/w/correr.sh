#!/bin/sh
# Compara, programa a programa, a saida em C (via cc) com a saida em WebAssembly escrito pela propria Onda.
set -e
D=$(cd "$(dirname "$0")/../.." && pwd)
B="$D/build/tw"; mkdir -p "$B"; falhas=0
for f in "$D"/test/w/*.onda; do
  n=$(basename "$f" .onda)
  if ! { "$D/build/ondac" < "$f" > "$B/$n.c" && cc -O2 -w "$B/$n.c" -o "$B/$n" -lm && "$D/build/ondac" -w < "$f" > "$B/$n.wasm"; }; then
    echo "FALHA $n (compilacao): $(grep -m1 error "$B/$n.c" "$B/$n.wasm" 2>/dev/null | head -1)"; falhas=$((falhas+1)); continue; fi
  echo "abc" | "$B/$n" arg1 > "$B/$n.c.out" || true
  echo "abc" | node "$D/wasm/host.js" "$B/$n.wasm" arg1 > "$B/$n.w.out" || true
  if cmp -s "$B/$n.c.out" "$B/$n.w.out"; then echo "ok   $n: WebAssembly igual ao C ($(wc -c < "$B/$n.wasm") bytes)"; else echo "FALHA $n (WebAssembly)"; falhas=$((falhas+1)); fi
  if grep -q nativo "$f" 2>/dev/null || [ "$n" = inteiros ]; then
    "$D/build/ondac" -x < "$f" > "$B/$n.x" && chmod +x "$B/$n.x"
    echo "abc" | "$B/$n.x" arg1 > "$B/$n.x.out" || true
    if cmp -s "$B/$n.c.out" "$B/$n.x.out"; then echo "ok   $n: x86 nativo igual ao C ($(wc -c < "$B/$n.x") bytes)"; else echo "FALHA $n (x86)"; falhas=$((falhas+1)); fi
  fi
done
[ $falhas -eq 0 ] && echo "C == WebAssembly em todos" || { echo "$falhas falha(s)"; exit 1; }
