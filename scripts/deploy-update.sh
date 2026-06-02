#!/bin/bash
# Script de déploiement OTA pour FitTogether+
# Usage: bash scripts/deploy-update.sh <version>
# Exemple: bash scripts/deploy-update.sh 1.0.1

set -e

VERSION="$1"
if [ -z "$VERSION" ]; then
  echo "Usage: bash scripts/deploy-update.sh <version>"
  echo "Exemple: bash scripts/deploy-update.sh 1.0.1"
  exit 1
fi

# Charger les variables d'environnement
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

SUPABASE_URL="${VITE_SUPABASE_URL}"
SUPABASE_SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
  echo "Erreur: Les variables VITE_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définies dans .env"
  exit 1
fi

ZIP_NAME="update-${VERSION}.zip"
STORAGE_PATH="updates/${ZIP_NAME}"

echo "=== Déploiement OTA v${VERSION} ==="

# 1. Build
echo "[1/4] Build de l'application..."
npm run build

# 2. Zip du dossier dist
echo "[2/4] Création du zip..."
cd dist
zip -r "../${ZIP_NAME}" . -x '*.map'
cd ..

# 3. Upload vers Supabase Storage
echo "[3/4] Upload vers Supabase Storage..."
curl -s -X POST \
  "${SUPABASE_URL}/storage/v1/object/app-updates/${STORAGE_PATH}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/zip" \
  -H "x-upsert: true" \
  --data-binary "@${ZIP_NAME}" \
  > /dev/null

DOWNLOAD_URL="${SUPABASE_URL}/storage/v1/object/public/app-updates/${STORAGE_PATH}"

# 4. Insérer le record de version
echo "[4/4] Enregistrement de la version..."
curl -s -X POST \
  "${SUPABASE_URL}/rest/v1/app_version" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"version\": \"${VERSION}\", \"url\": \"${DOWNLOAD_URL}\"}" \
  > /dev/null

# Nettoyage
rm -f "${ZIP_NAME}"

echo ""
echo "=== Déploiement terminé ==="
echo "Version: ${VERSION}"
echo "URL: ${DOWNLOAD_URL}"
echo "Les appareils recevront la mise à jour au prochain lancement."
