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

# Check the ACTIVE provider — not just any mention of "postgresql" in comments.
ACTIVE_PROVIDER=$(awk '/^datasource db {/,/^}/' prisma/schema.prisma | grep -oE 'provider = "[a-z]+"' | head -1)

if [[ "$ACTIVE_PROVIDER" == 'provider = "postgresql"' ]]; then
  echo "schema.prisma is already on postgresql"
  exit 0
fi

# Only rewrite the provider line inside the datasource db block, not comments.
perl -i -pe 'BEGIN{$in=0} if (/^datasource db {/){$in=1} elsif (/^}/){$in=0} elsif ($in){s/provider = "sqlite"/provider = "postgresql"/}' prisma/schema.prisma

NEW=$(awk '/^datasource db {/,/^}/' prisma/schema.prisma | grep -oE 'provider = "[a-z]+"' | head -1)
echo "schema.prisma → $NEW"
echo "Next: set DATABASE_URL=postgres://... and run: npx prisma migrate deploy"
