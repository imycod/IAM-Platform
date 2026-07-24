#!/bin/sh
set -e

# 显式 OIDC RSA JWKS：未注入 OIDC_JWKS 时，确保持久化私钥文件存在（手动可替换该文件做轮换）
if [ -z "${OIDC_JWKS:-}" ]; then
  OIDC_JWKS_FILE="${OIDC_JWKS_FILE:-/app/secrets/oidc-jwks.json}"
  export OIDC_JWKS_FILE
  if [ ! -f "$OIDC_JWKS_FILE" ]; then
    echo "[iam-platform] Generating OIDC JWKS at $OIDC_JWKS_FILE ..."
    mkdir -p "$(dirname "$OIDC_JWKS_FILE")"
    node scripts/generate-oidc-jwks.js --out "$OIDC_JWKS_FILE"
  fi
fi

echo "[iam-platform] Running database migrations..."
node ./node_modules/typeorm/cli.js migration:run -d dist/apps/iam/src/database/data-source.js

echo "[iam-platform] Starting application..."
exec "$@"
