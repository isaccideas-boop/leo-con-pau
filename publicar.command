#!/bin/zsh
# Doble clic para publicar los cambios en GitHub Pages.
cd "$(dirname "$0")" || exit 1

zsh scripts/publish.sh "$@"

echo ""
read -k 1 "?Pulsa una tecla para cerrar…"
