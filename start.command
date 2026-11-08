#!/bin/zsh
# Abre Leo con Pau con un servidor local.
# Se publica en la red Wi-Fi para que también se pueda abrir desde un iPad.
cd "$(dirname "$0")" || exit 1

PORT=4173
IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)

if lsof -nP -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Leo con Pau ya está abierto en el puerto $PORT."
else
  echo "Iniciando Leo con Pau…"
  echo "Deja esta ventana abierta mientras juegas. Para salir, ciérrala."
  python3 -m http.server $PORT --bind 0.0.0.0 &
  SERVER_PID=$!
  trap 'kill $SERVER_PID 2>/dev/null' EXIT INT TERM
  sleep 1
fi

echo ""
echo "En esta Mac:   http://127.0.0.1:$PORT/"
if [ -n "$IP" ]; then
  echo "En el iPad:    http://$IP:$PORT/"
  echo ""
  echo "El iPad y la Mac deben estar en la misma red Wi-Fi."
fi
echo ""

open "http://127.0.0.1:$PORT/"

if [ -n "$SERVER_PID" ]; then
  wait $SERVER_PID
fi
