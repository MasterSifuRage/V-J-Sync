#!/bin/sh
set -e
cd /app/backend

echo "[V/J Sync] Waiting for PostgreSQL..."
tries=0
until node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.\$connect()
  .then(() => p.\$disconnect())
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
" 2>/dev/null; do
  tries=$((tries + 1))
  if [ "$tries" -ge 30 ]; then
    echo "[V/J Sync] Database not ready after 60s"
    exit 1
  fi
  sleep 2
done

echo "[V/J Sync] Applying Prisma schema..."
npx prisma db push --skip-generate

if [ "$RUN_SEED" = "true" ]; then
  echo "[V/J Sync] Seeding demo data..."
  npm run db:seed || echo "[V/J Sync] Seed skipped or failed"
fi

echo "[V/J Sync] Starting server on port ${PORT:-3001}..."
exec node dist/index.js
