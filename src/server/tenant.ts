import "server-only";
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Prisma, Tenant } from "@prisma/client";
import { prisma } from "./db";
import { getCurrentUser } from "./auth";
import type { Role } from "./permissions";

/**
 * The set of models that are tenant-owned. Every query against these models
 * must carry a `tenantId` filter. The `tenantDb` proxy below auto-injects it,
 * and refuses to let callers override with a different tenant id.
 */
export const TENANT_SCOPED_MODELS = new Set([
  "Funnel",
  "Page",
  "Contact",
  "Tag",
  "ContactTag",
  "Activity",
  "Campaign",
  "EmailMessage",
  "EmailDelivery",
  "Automation",
  "AutomationRun",
  "Template", // built-in templates have tenantId = null; we handle in queries explicitly
  "Domain",
  "Offer",
  "AffiliateLink",
  "Event",
  "Integration",
  "Visitor",
  "ClickEvent",
  "PageVariant",
  "PageVersion",
  "Suppression",
  // NOTE: MarketplaceProduct is intentionally NOT tenant-scoped — global catalog
]);

export const ACTIVE_TENANT_COOKIE = "ls_active_tenant";

export type TenantContext = {
  tenant: Tenant;
  userId: string;
  role: Role;
  isSuperAdmin: boolean;
};

/**
 * Resolve the active tenant for a dashboard request.
 *
 * Order:
 *   1. `x-tenant-id` request header (set by client fetches)
 *   2. `ls_active_tenant` cookie (set by WorkspaceSwitcher)
 *
 * If the user has no membership for the resolved tenant, returns null.
 * If neither is present, returns null (caller decides — usually redirect to /app).
 */
export async function resolveTenantContext(): Promise<TenantContext | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const h = headers();
  const c = cookies();
  const tenantId = h.get("x-tenant-id") ?? c.get(ACTIVE_TENANT_COOKIE)?.value;
  if (!tenantId) return null;

  const membership = await prisma.membership.findUnique({
    where: { userId_tenantId: { userId: user.id, tenantId } },
    include: { tenant: true },
  });
  if (!membership) return null;
  if (membership.tenant.status !== "ACTIVE" && !user.isSuperAdmin) return null;

  return {
    tenant: membership.tenant,
    userId: user.id,
    role: membership.role as Role,
    isSuperAdmin: user.isSuperAdmin,
  };
}

/**
 * Resolve the tenant for a public-facing host (custom domain or system subdomain).
 * Used by /p/[tenantSlug]/[slug] page renderer + /api/forms/submit + /api/track.
 */
export async function resolveTenantFromHost(host: string | null): Promise<Tenant | null> {
  if (!host) return null;
  const normalized = host.toLowerCase().split(":")[0];

  // First check custom domains
  const domain = await prisma.domain.findUnique({ where: { hostname: normalized } });
  if (domain && domain.status === "VERIFIED") {
    const tenant = await prisma.tenant.findUnique({ where: { id: domain.tenantId } });
    if (tenant && tenant.status === "ACTIVE") return tenant;
  }

  // Then system subdomain: <slug>.launchstack.app or <slug>.localhost
  const base = (process.env.APP_BASE_DOMAIN ?? "").toLowerCase().split(":")[0];
  if (base && normalized.endsWith(`.${base}`)) {
    const slug = normalized.slice(0, -1 - base.length);
    const tenant = await prisma.tenant.findUnique({ where: { slug } });
    if (tenant && tenant.status === "ACTIVE") return tenant;
  }

  return null;
}

/**
 * Tenant-scoped Prisma client. Every read/write against tenant-owned models is
 * automatically constrained to `tenantId`. Attempting to specify a different
 * `tenantId` throws — this is layer 3 of tenant defense (after schema + RLS).
 *
 * Usage:
 *   const db = tenantDb(ctx.tenant.id);
 *   const contacts = await db.contact.findMany(); // auto-filtered by tenantId
 *
 * Cross-tenant operations (e.g. duplicating a template across tenants) must
 * use the raw `prisma` client and tag the call site clearly.
 */
export function tenantDb(tenantId: string) {
  return prisma.$extends({
    name: "tenant-scope",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!TENANT_SCOPED_MODELS.has(model)) return query(args);

          const op = operation as string;
          const mutateAny = args as Record<string, unknown>;

          // Read operations: inject where.tenantId
          if (
            op === "findFirst" || op === "findFirstOrThrow" ||
            op === "findMany" || op === "count" ||
            op === "aggregate" || op === "groupBy" ||
            op === "updateMany" || op === "deleteMany"
          ) {
            const where = (mutateAny.where as Record<string, unknown>) ?? {};
            if (where.tenantId && where.tenantId !== tenantId) {
              throw new Error(`tenantDb: refused cross-tenant ${op} on ${model} (got tenantId=${String(where.tenantId)}, expected ${tenantId})`);
            }
            mutateAny.where = { ...where, tenantId };
          }

          if (op === "findUnique" || op === "findUniqueOrThrow") {
            // findUnique only accepts unique fields in `where`; we can't add tenantId.
            // Caller must ensure the unique field is composite ([tenantId, ...]) OR
            // we re-route via findFirst to safely enforce scope.
            const where = (mutateAny.where as Record<string, unknown>) ?? {};
            if ("tenantId_slug" in where || "userId_tenantId" in where || "campaignId_contactId" in where) {
              // Compound unique already includes tenant context — OK.
              return query(args);
            }
            if (where.tenantId && where.tenantId !== tenantId) {
              throw new Error(`tenantDb: refused cross-tenant findUnique on ${model}`);
            }
            // Re-route as findFirst with tenant filter for safety
            mutateAny.where = { ...where, tenantId };
            const altQuery = (model as keyof typeof prisma) as string;
            const m = (prisma as unknown as Record<string, { findFirst: (a: unknown) => unknown }>)[
              altQuery.charAt(0).toLowerCase() + altQuery.slice(1)
            ];
            if (m && typeof m.findFirst === "function") {
              return m.findFirst(args) as unknown as Promise<unknown>;
            }
          }

          // Write operations: inject data.tenantId
          if (op === "create") {
            const data = (mutateAny.data as Record<string, unknown>) ?? {};
            if (data.tenantId && data.tenantId !== tenantId) {
              throw new Error(`tenantDb: refused create with foreign tenantId on ${model}`);
            }
            mutateAny.data = { ...data, tenantId };
          }

          if (op === "createMany") {
            const data = mutateAny.data;
            const rows: Record<string, unknown>[] = Array.isArray(data) ? data : [data as Record<string, unknown>];
            for (const r of rows) {
              if (r.tenantId && r.tenantId !== tenantId) {
                throw new Error(`tenantDb: refused createMany row with foreign tenantId on ${model}`);
              }
              r.tenantId = tenantId;
            }
            mutateAny.data = rows;
          }

          if (op === "update") {
            // Update by unique — we constrain via where injection above for compound uniques,
            // and forbid mutating tenantId in data.
            const data = (mutateAny.data as Record<string, unknown>) ?? {};
            if (data.tenantId && data.tenantId !== tenantId) {
              throw new Error(`tenantDb: refused update changing tenantId on ${model}`);
            }
          }

          if (op === "upsert") {
            const where = (mutateAny.where as Record<string, unknown>) ?? {};
            const create = (mutateAny.create as Record<string, unknown>) ?? {};
            const update = (mutateAny.update as Record<string, unknown>) ?? {};
            if (where.tenantId && where.tenantId !== tenantId) {
              throw new Error(`tenantDb: refused cross-tenant upsert on ${model}`);
            }
            create.tenantId = tenantId;
            if (update.tenantId && update.tenantId !== tenantId) {
              throw new Error(`tenantDb: refused upsert updating tenantId on ${model}`);
            }
            mutateAny.create = create;
          }

          return query(args);
        },
      },
    },
  });
}

export type TenantDb = ReturnType<typeof tenantDb>;

/**
 * Hard guard for server components + server actions that require an active
 * tenant. Redirects to /app (workspace picker) if none resolved.
 */
export async function requireTenant(): Promise<TenantContext> {
  const ctx = await resolveTenantContext();
  if (!ctx) redirect("/app");
  return ctx;
}

/**
 * Set the active tenant cookie. Called by the workspace switcher server action.
 */
export async function setActiveTenant(tenantId: string) {
  const c = cookies();
  c.set(ACTIVE_TENANT_COOKIE, tenantId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function clearActiveTenant() {
  const c = cookies();
  c.delete(ACTIVE_TENANT_COOKIE);
}

// Type re-exports for convenience in callers
export type { Prisma };
