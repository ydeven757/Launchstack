# Launchstack

Multi-tenant affiliate marketing operating system — funnels, pages, CRM, email broadcasts, visual automations, **A/B testing**, **AI copywriting**, **marketplace browse**, **ClickBank webhook integration**, custom domains.
One master account, many isolated workspaces — designed for operators running multiple niche affiliate sites in parallel.

Built with Next.js 14 (App Router) · TypeScript · Tailwind · Prisma · SQLite (Postgres-ready) · NextAuth · AES-256-GCM credential encryption · Anthropic API for AI copy.

## What's inside

- **21 starter templates** across 19 niches (Health, Weight Loss, Supplements, Finance, Credit, MMO, Crypto, Survival, Dating, Spirituality, Beauty, Pet, Gardening, SaaS, E-commerce, Coaching, Real Estate, Tech, Lifestyle)
- **15-product curated marketplace** with one-click "Promote into funnel" — creates an Offer + cloaked `/go/` link + clones a matching funnel template
- **A/B testing** on any page — sticky per-visitor split via cookie hash, full conversion + revenue attribution per variant, "declare winner" promotes the winner to live
- **AI copy assist** at every editable field — headlines, subheads, CTAs, bodies, advertorial openings, email subjects, email bodies — uses Anthropic Claude if `ANTHROPIC_API_KEY` set, otherwise a deterministic template fallback
- **Visual flow builder for automations** — trigger card → step cards in a vertical canvas
- **ClickBank INS webhook** with HMAC-SHA256 verification, idempotent on `receipt`, auto-tag buyers by product, fire automations on sale
- **Visitor tracking via middleware** — `fbclid`, `gclid`, `ttclid`, `msclkid` captured on first hit, UTM persisted, visitor→contact stitched on form submit
- **TID propagation** on `/go/<slug>` so ClickBank sales attribute back to the originating funnel/visitor
- **Cross-tenant funnel cloning** — promote a winning funnel from one workspace to another (the multi-tenant superpower CBA can't do)
- **Page versioning** — every publish creates a snapshot for rollback
- **Compliance** — per-tenant disclosure banner + legal footer HTML, auto-rendered on advertorial/review pages
- **Drag-and-drop block reordering** in the page editor
- **3-step onboarding wizard** with niche-aware template recommendations

## Quick start

```bash
cd launchstack
npm install
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

Open <http://localhost:3000>.

### Demo accounts

| Role | Email | Password |
|---|---|---|
| Owner + super-admin (consolidated) | `findgriff@gmail.com` | `Good45Gold` |

> The earlier `demo@launchstack.local` / `admin@launchstack.local` accounts were
> consolidated. If you re-run `npm run db:seed` they'll come back; edit
> `prisma/seed.ts` to set your preferred default credentials.

The seed creates two workspaces for the demo user:

- **FitCoach Studio** (`/fitcoach`) — fully populated: funnel, contacts, tags, automation, sample analytics over 7 days, an offer with a `/go/` link.
- **Money Review** (`/moneyreview`) — just the funnel from a finance advertorial template.

### Verify multi-tenant isolation

1. Sign in as `demo@…`.
2. Open FitCoach → note the contacts list.
3. Switch workspace via the top bar → Money Review → contacts is empty.
4. Try the public page: <http://localhost:3000/p/fitcoach/get-the-7-day-reset> — submit the form → a new contact appears in FitCoach only.

### Try the full loop

1. **Public form → contact + automation:** Visit <http://localhost:3000/p/fitcoach/get-the-7-day-reset>, submit the form. → New contact appears in CRM, automation runs (sends a mock email + adds the "engaged" tag).
2. **Broadcast email:** `/t/fitcoach/emails/new` → compose → send. → Delivered counts update, EmailMessage rows logged.
3. **Affiliate redirect:** Visit <http://localhost:3000/go/fitcoach-sample> → redirects to `example.com`, click is logged.
4. **Admin:** Sign in as admin → <http://localhost:3000/admin> → see both tenants, suspend one, see effect on public URLs.

## Architecture

See `src/server/tenant.ts` for the **tenant defense-in-depth** strategy:

1. **Schema**: every domain table has a non-null `tenantId` FK
2. **Application**: `requireTenant()` resolves the active tenant from cookie/header and validates membership
3. **DB client wrapper**: `tenantDb(tenantId)` auto-injects `where.tenantId` on every query and refuses cross-tenant writes
4. **(Production)**: enable Postgres RLS as layer 4 — DDL hint in code comments

Permissions matrix: `src/server/permissions.ts` (OWNER / ADMIN / EDITOR / ANALYST).

Audit log: every mutation through `audit()` in `src/server/audit.ts`.

## Scripts

```bash
npm run dev          # next dev
npm run build        # next build
npm run typecheck    # tsc --noEmit
npm run db:migrate   # prisma migrate dev
npm run db:reset     # wipe + recreate + seed
npm run db:seed      # re-run seed
npm run setup        # install + migrate + seed (first-time)
```

## Production swap-outs

| Concern | MVP | Production swap |
|---|---|---|
| Database | SQLite | Change `provider` in `prisma/schema.prisma` to `postgresql`, set `DATABASE_URL`, run `prisma migrate dev` |
| Email | Logged to console + DB | Set `RESEND_API_KEY` — `email-sender.ts` already routes through Resend if present |
| Queue | In-process automation engine | Replace `triggerAutomations()` body with a BullMQ enqueue; processor calls the same logic |
| Tenant isolation layer 4 | Application-level | Enable Postgres RLS — see `tenant.ts` comments |
| Domain hosting | Local subdomain fallback | Wildcard A/CNAME at the edge, host-based tenant resolution already in `resolveTenantFromHost()` |

## Deploy to a VPS

See [`DEPLOY.md`](./DEPLOY.md) — covers Docker, Postgres, Caddy reverse proxy with auto-TLS, ClickBank webhook setup, backups, and the pre-launch checklist.

Short version:

```bash
./scripts/use-postgres.sh
cp .env.production.example .env.production && nano .env.production
docker compose --env-file .env.production up -d --build
```

## ClickBank integration

Already wired. To activate per-tenant:

1. Sign in → open the workspace → **Settings → Integrations**
2. Paste the **INS Secret Key** from ClickBank (Account Settings → Notifications → Secret Key)
3. Copy the displayed webhook URL into ClickBank's Notifications config
4. Sales/refunds will flow in automatically: contacts created, tagged by product, revenue tracked, automations fired

Credentials are encrypted at rest with AES-256-GCM. The receiver verifies HMAC (SHA-256 first, SHA-1 fallback), is idempotent on `receipt`, and back-attributes the sale to the originating funnel via the TID injected by `/go/<slug>`.

## Roadmap (post-MVP)

- A/B variant testing on pages
- Visual workflow builder for automations
- Postback URLs for revenue attribution from affiliate networks
- Native network adapters (ClickBank, Digistore24, Impact, ShareASale)
- AI copy-fill for templates
- Stripe billing + plan enforcement
- TwoFactorAuth, SSO (agency tier)
- Real-time analytics view + anomaly alerts
- Cohort retention
- GDPR export/delete per contact
- Page versioning + revert
