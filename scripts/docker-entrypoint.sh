#!/bin/sh
set -e

echo "[iam-platform] Running database migrations..."
node ./node_modules/typeorm/cli.js migration:run -d dist/apps/iam/src/database/data-source.js

echo "[iam-platform] Starting application..."
exec "$@"
