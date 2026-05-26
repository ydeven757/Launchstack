#!/usr/bin/env bash
# Swap prisma/schema.prisma back to SQLite for local development.
set -euo pipefail
cd "$(dirname "$0")/.."
if grep -q 'provider = "sqlite"' prisma/schema.prisma; then
  echo "schema.prisma is already on sqlite"
  exit 0
fi
perl -i -pe 's/provider = "postgresql"/provider = "sqlite"/' prisma/schema.prisma
echo "schema.prisma → sqlite"
