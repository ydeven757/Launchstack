#!/usr/bin/env bash
# Swap prisma/schema.prisma to use Postgres for production deployment.
# Idempotent — safe to run multiple times.
#
# Usage:
#   ./scripts/use-postgres.sh          # one-time, before first prod migrate
#
# After running, set DATABASE_URL in your environment and run:
#   npx prisma migrate deploy
#
set -euo pipefail
cd "$(dirname "$0")/.."

if grep -q 'provider = "postgresql"' prisma/schema.prisma; then
  echo "schema.prisma is already on postgresql"
  exit 0
fi

# macOS sed vs GNU sed: use a perl one-liner for portability
perl -i -pe 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma
echo "schema.prisma → postgresql"
echo "Next: set DATABASE_URL=postgres://... and run: npx prisma migrate deploy"
