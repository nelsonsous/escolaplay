#!/usr/bin/env bash
# Configura um simulador iOS para a EscolaPlay. Corre no Mac:
#   bash setup-simulator.sh
# Verifica o Xcode, garante um runtime iOS, cria/arranca um iPhone e abre
# o Simulator. No fim, basta correr `pnpm mobile:ios`.
set -euo pipefail

DEVICE_NAME="iPhone (EscolaPlay)"

echo "==> EscolaPlay · configuracao do simulador iOS"

# 1) xcrun disponivel?
if ! command -v xcrun >/dev/null 2>&1; then
  echo "ERRO: 'xcrun' nao encontrado."
  echo "  Instala o Xcode pela App Store e depois corre:"
  echo "    sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer"
  exit 1
fi

# 2) ha runtime iOS instalado?
if ! xcrun simctl list runtimes available 2>/dev/null | grep -qi "iOS"; then
  echo "ERRO: nenhum runtime iOS instalado."
  echo "  Abre o Xcode > Settings > Platforms (ou Components) e instala um"
  echo "  'iOS Simulator'. Depois corre este script outra vez."
  exit 1
fi
echo "    runtime iOS encontrado."

# 3) reaproveita o iPhone da EscolaPlay, ou qualquer iPhone disponivel
UUID=$(xcrun simctl list devices available 2>/dev/null \
  | grep -F "$DEVICE_NAME" \
  | grep -oE "[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}" \
  | head -1 || true)

if [ -z "$UUID" ]; then
  UUID=$(xcrun simctl list devices available 2>/dev/null \
    | grep -E "iPhone" \
    | grep -oE "[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}" \
    | head -1 || true)
fi

# 4) se nao houver nenhum, cria um
if [ -z "$UUID" ]; then
  echo "    nenhum iPhone encontrado — a criar '$DEVICE_NAME'..."

  # tipo: prefere iPhone 16/15, senao o ultimo iPhone listado
  DEVTYPE=$(xcrun simctl list devicetypes 2>/dev/null \
    | grep -E "iPhone (16|15)" | head -1 \
    | grep -oE "com\.apple\.CoreSimulator\.SimDeviceType\.[^)]*" || true)
  if [ -z "$DEVTYPE" ]; then
    DEVTYPE=$(xcrun simctl list devicetypes 2>/dev/null \
      | grep "iPhone" | tail -1 \
      | grep -oE "com\.apple\.CoreSimulator\.SimDeviceType\.[^)]*" || true)
  fi

  # runtime iOS mais recente disponivel
  RUNTIME=$(xcrun simctl list runtimes available 2>/dev/null \
    | grep -i "iOS" | tail -1 \
    | grep -oE "com\.apple\.CoreSimulator\.SimRuntime\.[^ ]*" || true)

  if [ -z "$DEVTYPE" ] || [ -z "$RUNTIME" ]; then
    echo "ERRO: nao foi possivel determinar o tipo de dispositivo ou runtime."
    echo "  Verifica: xcrun simctl list devicetypes | grep iPhone"
    echo "            xcrun simctl list runtimes available"
    exit 1
  fi

  UUID=$(xcrun simctl create "$DEVICE_NAME" "$DEVTYPE" "$RUNTIME")
  echo "    criado: $UUID"
fi

# 5) arranca e abre o Simulator
xcrun simctl boot "$UUID" 2>/dev/null && echo "    simulador arrancado." || echo "    simulador ja estava a correr."
open -a Simulator

echo ""
echo "Simulador pronto (UUID: $UUID)."
echo "Agora arranca a app:"
echo "    pnpm mobile:ios"
echo "(ou 'pnpm mobile' e prime 'i' no terminal do Expo)"
