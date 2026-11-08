#!/bin/zsh
# Publica la app en GitHub Pages.
# Sube la versión del service worker, hace commit y empuja a main.
set -e

cd "$(dirname "$0")/.." || exit 1

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Esta carpeta no es un repositorio git."
  exit 1
fi

if [ -z "$(git status --porcelain)" ]; then
  echo "Sin cambios para publicar."
  echo "https://isaccideas-boop.github.io/leo-con-pau/"
  exit 0
fi

CURRENT=$(sed -n 's/^const CACHE = "leo-con-pau-v\([0-9][0-9]*\)";$/\1/p' sw.js)
if [ -z "$CURRENT" ]; then
  echo "No se pudo leer la versión de caché en sw.js."
  exit 1
fi

NEXT=$((CURRENT + 1))
sed -i '' "s/^const CACHE = \"leo-con-pau-v$CURRENT\";$/const CACHE = \"leo-con-pau-v$NEXT\";/" sw.js
echo "Caché del service worker: v$CURRENT → v$NEXT"

git add -A
MESSAGE="${1:-Actualizar Leo con Pau $(date '+%Y-%m-%d %H:%M')}"
git commit -m "$MESSAGE"
git push origin main

echo ""
echo "Publicado: https://isaccideas-boop.github.io/leo-con-pau/"
echo "GitHub Pages tarda alrededor de un minuto en mostrar los cambios."
