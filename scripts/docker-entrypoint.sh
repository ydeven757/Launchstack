#!/bin/sh
# Container entrypoint — runs migrations / db push, optional seed, then Next.
# Pinned to Prisma CLI v5.22.0 (matches @prisma/client version); Prisma 7+
# changed flags (removed --skip-generate) and requires prisma.config.ts.
set -eu

PRISMA="npx -y -p prisma@5.22.0 prisma"

if [ -d prisma/migrations ] && [ -n "$(ls -A prisma/migrations 2>/dev/null)" ]; then
  echo "→ prisma migrate deploy"
  $PRISMA migrate deploy
else
  echo "→ prisma db push (no migrations directory present — initial sync)"
  $PRISMA db push --accept-data-loss --skip-generate
fi

if [ "${RUN_SEED:-0}" = "1" ]; then
  echo "→ prisma db seed (best-effort; idempotent)"
  $PRISMA db seed || echo "  seed skipped / already applied"
fi

echo "→ starting Next.js"
exec "$@"
