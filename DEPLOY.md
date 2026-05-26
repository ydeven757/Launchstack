# Launchstack — Deployment Guide

Target: any Ubuntu/Debian VPS with Docker. Has been designed assuming the host
also runs a reverse proxy (Caddy or nginx) for TLS termination. Steps below
assume Caddy (one-line auto-TLS) — substitute nginx easily.

## 1. Pre-flight (on your laptop)

```bash
# Extract Launchstack from the worktree to its own repo
cp -r launchstack /tmp/launchstack
cd /tmp/launchstack
git init && git add . && git commit -m "initial launchstack"

# Generate two strong secrets — KEEP THESE SAFE
openssl rand -hex 32   # → ENCRYPTION_KEY
openssl rand -hex 32   # → NEXTAUTH_SECRET

# Switch Prisma to Postgres for production
./scripts/use-postgres.sh

# Regenerate migration set for Postgres in a clean db (LOCAL test first)
# Optional but recommended: spin up local Postgres, run migrate dev, validate
```

## 2. VPS bootstrap (one-time, on the VPS)

Assumes Ubuntu 24.04 root SSH.

```bash
# Install Docker + Caddy
apt-get update && apt-get install -y docker.io docker-compose-plugin caddy
systemctl enable --now docker caddy

# Create app dir
mkdir -p /opt/launchstack
cd /opt/launchstack

# Copy code from your laptop (substitute your repo or rsync)
# Option A — git:
git clone https://github.com/you/launchstack.git .
# Option B — rsync from laptop:
#   rsync -avz --exclude node_modules --exclude .next /tmp/launchstack/ root@vps:/opt/launchstack/

# Configure environment
cp .env.production.example .env.production
nano .env.production        # paste the secrets you generated; set NEXTAUTH_URL and APP_BASE_DOMAIN

# Build + start
docker compose --env-file .env.production up -d --build

# First-time only: seed demo accounts (skip in production)
docker compose exec app npx prisma db seed
```

After `docker compose up`, the app listens on `127.0.0.1:3000` — not exposed publicly until the reverse proxy is configured.

## 3. Reverse proxy with Caddy (TLS auto-issued via Let's Encrypt)

`/etc/caddy/Caddyfile`:

```caddy
app.example.com {
    encode zstd gzip
    reverse_proxy 127.0.0.1:3000
}

# Wildcard for tenant subdomains (system fallback URLs like <tenant>.app.example.com)
# Optional — requires DNS-01 challenge with your DNS provider's API
# Comment out until you set up wildcard certs
# *.app.example.com {
#     tls {
#         dns cloudflare {env.CLOUDFLARE_API_TOKEN}
#     }
#     reverse_proxy 127.0.0.1:3000
# }

# Per-tenant custom domains — each one auto-issues its own cert
# Append entries here when tenants connect their domains
# fitsite.com, www.fitsite.com {
#     reverse_proxy 127.0.0.1:3000
# }
```

```bash
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy
```

DNS: point `app.example.com` A/AAAA to the VPS IP. Caddy will auto-issue.

## 4. First-time verification

```bash
# From your laptop
curl -fsS https://app.example.com/api/health
# → {"ok":true,"service":"launchstack",...}

# Sign in at https://app.example.com/login with your seeded admin user
```

## 5. Operational commands

```bash
# Tail logs
docker compose logs -f app

# Apply new migrations (after pulling new code)
docker compose exec app npx prisma migrate deploy

# Open a Postgres shell
docker compose exec db psql -U launchstack -d launchstack

# Backup
docker compose exec db pg_dump -U launchstack launchstack > backup-$(date +%F).sql

# Restart after pulling new code
git pull
docker compose --env-file .env.production up -d --build

# Stop everything
docker compose down

# Hard reset (DESTROYS DATA — only in dev/staging)
docker compose down -v
```

## 6. Daily snapshot

Add to `/etc/cron.d/launchstack-backup`:

```
0 4 * * * root cd /opt/launchstack && docker compose exec -T db pg_dump -U launchstack launchstack | gzip > /var/backups/launchstack-$(date +\%F).sql.gz
0 5 * * * root find /var/backups -name 'launchstack-*.sql.gz' -mtime +30 -delete
```

## 7. Custom domains workflow

When a tenant connects a custom domain in `/t/<slug>/domains`:

1. They add a CNAME at their DNS to `cname.app.example.com` (or A record to VPS IP)
2. They click "Verify" — the app marks it `VERIFIED` (MVP does mock verification; real implementation would lookup a `_launchstack-verify` TXT record matching the `verifyToken`)
3. You append the hostname to the Caddyfile and `systemctl reload caddy`
4. Caddy auto-issues TLS within seconds

For full automation, generate the Caddy config file from the `Domain` table via a daily cron — the schema is ready (`/var/www/launchstack/customdomains.caddy` imported by main Caddyfile).

## 8. Environment variables — full reference

| Name | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | `postgres://user:pass@host:5432/db` in prod; `file:./dev.db` locally |
| `NEXTAUTH_URL` | yes | Public URL e.g. `https://app.example.com` |
| `NEXTAUTH_SECRET` | yes | 64-char hex; `openssl rand -hex 32` |
| `ENCRYPTION_KEY` | yes | 64-char hex used for AES-256-GCM credential encryption |
| `APP_BASE_DOMAIN` | yes | e.g. `app.example.com` — used for tenant-subdomain resolution |
| `APP_PROTOCOL` | yes | `https` in prod, `http` locally |
| `RESEND_API_KEY` | no | Leave empty to mock-only |
| `DEFAULT_FROM_EMAIL` | no | Default sender for broadcasts |
| `DEFAULT_FROM_NAME` | no | Default sender display name |
| `RUN_MIGRATIONS` | no | `1` (default) — runs `prisma migrate deploy` on container start |
| `RUN_SEED` | no | `0` (default) — set `1` to run seed on first boot |

## 9. Pre-launch checklist

- [ ] `ENCRYPTION_KEY` set to a real 64-char hex value (NOT the dev fallback)
- [ ] `NEXTAUTH_SECRET` is a fresh random value, not the example
- [ ] Database password is strong
- [ ] Firewall: only 22, 80, 443 open externally; 3000 and 5432 bound to 127.0.0.1
- [ ] Caddy is running and issuing certs successfully
- [ ] `/api/health` returns 200 over HTTPS
- [ ] Demo accounts have been deleted OR passwords rotated
- [ ] Daily backup cron is installed
- [ ] DNS for `app.example.com` resolves correctly
- [ ] `RESEND_API_KEY` set if you intend to send real email (or accept mock-mode and use external ESP)
- [ ] Privacy policy + cookie/consent banner if you're targeting EU/UK traffic — see roadmap

## 10. Scaling notes

The MVP runs on one container. Scaling paths:

| Bottleneck | Solution |
|---|---|
| App CPU/memory | Add more app replicas behind Caddy (Docker swarm or k8s) — already stateless |
| In-memory rate limit | Swap `src/server/rate-limit.ts` for Upstash Redis adapter |
| Automation engine | Replace inline `triggerAutomations` with BullMQ enqueue → separate worker container |
| Postgres | Vertical first (more RAM); read replicas via Prisma read-replicas extension; PgBouncer in front |
| Public pages | Standalone Next can be deployed as static edge for published pages — `src/app/p/*` already has `force-dynamic` opt-out where needed |

## 11. ClickBank webhook setup

For each tenant that wants ClickBank sales pushed in:

1. The operator goes to `/t/<slug>/settings/integrations` in your app
2. Pastes their **INS Secret Key** (found inside ClickBank: Account Settings → Notifications → Secret Key)
3. The app shows a webhook URL like `https://app.example.com/api/webhooks/clickbank/<tenantId>`
4. The operator pastes that URL into ClickBank → Account Settings → Notifications → URL field
5. Optionally clicks "Send Test Notification" inside ClickBank — should appear in the integration's `lastEventAt`

Subsequent sales/refunds/rebills will flow in automatically.

---

You're ready to ship.
