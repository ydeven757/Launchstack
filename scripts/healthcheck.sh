#!/bin/sh
# Health probe — runs every 2 minutes via cron. Three consecutive failures
# trigger an alert. Self-contained, no Kuma dependency.
#
# Install (root):
#   cp /opt/launchstack/scripts/healthcheck.sh /opt/launchstack/scripts/healthcheck.sh
#   ( crontab -l 2>/dev/null | grep -v healthcheck.sh; \
#     echo "*/2 * * * * /opt/launchstack/scripts/healthcheck.sh" ) | crontab -
#
# Alert channel: writes to /var/log/launchstack-health.log + flips a sentinel
# file when 3 consecutive checks fail. Hook anything that watches the sentinel
# (e.g. a separate cron that emails the user, or just `tail -f` while debugging).
set -u

URL="${LAUNCHSTACK_HEALTH_URL:-https://launchstack.opspocket.com/api/health}"
LOG=/var/log/launchstack-health.log
STATE=/var/run/launchstack-health.state
SENTINEL=/var/run/launchstack-health.down

# How many consecutive failures before tripping the sentinel
THRESHOLD=3

NOW=$(date -u +%FT%TZ)
CODE=$(curl -sS -m 8 -o /dev/null -w "%{http_code}" "$URL" 2>/dev/null || echo "000")
BODY=$(curl -sS -m 8 "$URL" 2>/dev/null | head -c 200)

# Track consecutive failures
FAILS=0
if [ -f "$STATE" ]; then FAILS=$(cat "$STATE" 2>/dev/null || echo 0); fi

if [ "$CODE" = "200" ] && echo "$BODY" | grep -q "\"ok\":true"; then
  # OK — reset
  echo "0" > "$STATE"
  if [ -f "$SENTINEL" ]; then
    rm -f "$SENTINEL"
    echo "[$NOW] RECOVERED ($URL → 200)" >> "$LOG"
  fi
  # Only log every 30 mins on success to keep the log tidy
  MIN=$(date +%M)
  if [ "$MIN" = "00" ] || [ "$MIN" = "30" ]; then
    echo "[$NOW] OK ($URL → 200)" >> "$LOG"
  fi
else
  FAILS=$((FAILS + 1))
  echo "$FAILS" > "$STATE"
  echo "[$NOW] FAIL #$FAILS ($URL → $CODE)  body=$(echo "$BODY" | tr "\n" " " | cut -c1-100)" >> "$LOG"
  if [ "$FAILS" -ge "$THRESHOLD" ] && [ ! -f "$SENTINEL" ]; then
    touch "$SENTINEL"
    echo "[$NOW] ALERT — $FAILS consecutive failures, sentinel created at $SENTINEL" >> "$LOG"
    # Add notification channels here. Examples:
    #   curl -X POST https://hooks.slack.com/services/... -d "{\"text\": \"Launchstack DOWN\"}"
    #   echo "Launchstack health check failing" | mail -s "Launchstack DOWN" findgriff@gmail.com
  fi
fi
