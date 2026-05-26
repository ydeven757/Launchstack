#!/bin/sh
# Container entrypoint — runs migrations + optional seed before starting Next.
set -eu

if [ "${RUN_MIGRATIONS:-1}" = "1" ]; then
  echo "→ prisma migrate deploy"
  npx prisma migrate deploy
fi

if [ "${RUN_SEED:-0}" = "1" ]; then
  echo "→ prisma db seed"
  npx prisma db seed || echo "  seed already applied / no-op"
fi

echo "→ starting Next.js"
exec "$@"
