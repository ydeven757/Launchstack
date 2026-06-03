#!/usr/bin/env bash
# Launchstack Postgres backup — runs nightly via cron.
#
# Usage on the host:
#   /opt/launchstack/scripts/backup.sh
#
# Cron (root crontab):
#   0 4 * * * /opt/launchstack/scripts/backup.sh >> /var/log/launchstack-backup.log 2>&1
#
# Retention: keeps the last 14 dumps + the last 8 weekly Sunday dumps.
#
# Restore (manual):
#   gunzip < /var/backups/launchstack/launchstack-2026-06-01.sql.gz \
#     | docker exec -i launchstack-db-1 psql -U launchstack -d launchstack
#
set -euo pipefail

BACKUP_DIR=/var/backups/launchstack
KEEP_DAILY=14
KEEP_WEEKLY=8
TIMESTAMP=$(date +%F)         # e.g. 2026-06-01
DAY_OF_WEEK=$(date +%u)        # 1-7, Mon-Sun
CONTAINER=launchstack-db-1
DB_USER=launchstack
DB_NAME=launchstack

mkdir -p "$BACKUP_DIR"

# Make sure the container is up before attempting a dump
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  echo "[$(date -u +%FT%TZ)] backup ABORTED — ${CONTAINER} not running" >&2
  exit 1
fi

OUT="$BACKUP_DIR/launchstack-${TIMESTAMP}.sql.gz"
echo "[$(date -u +%FT%TZ)] dumping → $OUT"
docker exec "$CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner --no-privileges \
  | gzip --best > "$OUT"

# Verify the dump is non-trivial (>1 KB) — pg_dump exit-0 on empty DB is still OK,
# but a 100-byte file usually means something went wrong (lock, permissions, etc.)
SIZE=$(stat -c %s "$OUT" 2>/dev/null || stat -f %z "$OUT")
if [ "$SIZE" -lt 1024 ]; then
  echo "[$(date -u +%FT%TZ)] backup SUSPICIOUS — only $SIZE bytes" >&2
  exit 2
fi
echo "[$(date -u +%FT%TZ)] ok — $SIZE bytes"

# Weekly snapshot on Sunday (day-of-week 7)
if [ "$DAY_OF_WEEK" = "7" ]; then
  WEEKLY="$BACKUP_DIR/weekly-${TIMESTAMP}.sql.gz"
  cp "$OUT" "$WEEKLY"
  echo "[$(date -u +%FT%TZ)] weekly snapshot → $WEEKLY"
fi

# Retention — daily
find "$BACKUP_DIR" -name "launchstack-*.sql.gz" -type f -printf '%T@ %p\n' 2>/dev/null \
  | sort -nr | tail -n +"$((KEEP_DAILY + 1))" | awk '{print $2}' | xargs -r rm -v

# Retention — weekly
find "$BACKUP_DIR" -name "weekly-*.sql.gz" -type f -printf '%T@ %p\n' 2>/dev/null \
  | sort -nr | tail -n +"$((KEEP_WEEKLY + 1))" | awk '{print $2}' | xargs -r rm -v

echo "[$(date -u +%FT%TZ)] done"
