import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { tenantDb } from "@/server/tenant";
import { formSubmissionSchema } from "@/lib/validators";
import { triggerAutomations } from "@/server/services/automation-engine";
import { getCurrentVisitor, stitchVisitorToContact, VISITOR_COOKIE } from "@/server/services/visitor";
import { rateLimit } from "@/server/rate-limit";
import { resolvePageForVisitor } from "@/server/services/ab";
import { isSuppressed } from "@/server/actions/privacy";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  // Rate limit by IP (best-effort — reverse proxy should set x-forwarded-for)
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "unknown";
  const rl = rateLimit(`form-submit:${ip}`, { capacity: 6, refillPerSec: 0.2 });
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: "Too many requests" }, {
      status: 429,
      headers: { "Retry-After": String(rl.retryAfterSec) },
    });
  }

  const contentType = req.headers.get("content-type") ?? "";
  let body: Record<string, unknown>;
  if (contentType.includes("application/json")) {
    body = await req.json();
  } else {
    const fd = await req.formData();
    body = Object.fromEntries(fd.entries());
  }

  // Find the page first to resolve tenant
  const pageId = String(body.pageId || "");
  const page = await prisma.page.findUnique({ where: { id: pageId } });
  if (!page) return NextResponse.json({ ok: false, error: "Unknown page" }, { status: 404 });

  const parsed = formSubmissionSchema.safeParse({
    pageId,
    email: body.email,
    firstName: body.firstName || undefined,
    lastName: body.lastName || undefined,
    phone: body.phone || undefined,
    utm: {
      source: typeof body.utm_source === "string" ? body.utm_source : undefined,
      medium: typeof body.utm_medium === "string" ? body.utm_medium : undefined,
      campaign: typeof body.utm_campaign === "string" ? body.utm_campaign : undefined,
    },
  });
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.errors[0]?.message }, { status: 400 });
  }

  const db = tenantDb(page.tenantId);

  // GDPR/CCPA suppression — if this email was previously erased, return success
  // but do NOT recreate the contact. The subject explicitly asked to be removed.
  if (await isSuppressed(page.tenantId, parsed.data.email)) {
    return NextResponse.json({ ok: true, suppressed: true });
  }

  // Upsert contact (idempotent by email per tenant)
  const existing = await db.contact.findFirst({ where: { email: parsed.data.email } });
  const contact = existing
    ? await db.contact.update({
        where: { id: existing.id },
        data: {
          firstName: parsed.data.firstName ?? existing.firstName,
          lastName: parsed.data.lastName ?? existing.lastName,
          phone: parsed.data.phone ?? existing.phone,
          status: existing.status === "UNSUBSCRIBED" || existing.status === "BOUNCED" ? existing.status : "ENGAGED",
          sourcePageId: existing.sourcePageId ?? page.id,
          sourceFunnelId: existing.sourceFunnelId ?? page.funnelId,
          utmSource: existing.utmSource ?? parsed.data.utm?.source ?? null,
          utmMedium: existing.utmMedium ?? parsed.data.utm?.medium ?? null,
          utmCampaign: existing.utmCampaign ?? parsed.data.utm?.campaign ?? null,
        },
      })
    : await db.contact.create({
        data: {
          tenantId: page.tenantId,
          email: parsed.data.email,
          firstName: parsed.data.firstName ?? null,
          lastName: parsed.data.lastName ?? null,
          phone: parsed.data.phone ?? null,
          status: "LEAD",
          sourcePageId: page.id,
          sourceFunnelId: page.funnelId,
          utmSource: parsed.data.utm?.source ?? null,
          utmMedium: parsed.data.utm?.medium ?? null,
          utmCampaign: parsed.data.utm?.campaign ?? null,
        },
      });

  // Stitch visitor → contact (so all prior anonymous events tie to this person)
  const visitor = await getCurrentVisitor().catch(() => null);
  if (visitor && visitor.tenantId === page.tenantId) {
    await stitchVisitorToContact(visitor.id, contact.id).catch(() => {});
  }

  // Resolve A/B variant the visitor is currently on (sticky)
  const cookieId = cookies().get(VISITOR_COOKIE)?.value ?? null;
  const resolvedAB = await resolvePageForVisitor({ pageId: page.id, cookieId }).catch(() => null);

  // Activity + event
  await Promise.all([
    db.activity.create({ data: { tenantId: page.tenantId, contactId: contact.id, type: "form_submit", payload: JSON.stringify({ pageId: page.id, variantId: resolvedAB?.variantId ?? null }) } }),
    db.event.create({
      data: {
        tenantId: page.tenantId,
        pageId: page.id,
        funnelId: page.funnelId,
        contactId: contact.id,
        type: "form_submit",
        utmSource: parsed.data.utm?.source ?? null,
        utmMedium: parsed.data.utm?.medium ?? null,
        utmCampaign: parsed.data.utm?.campaign ?? null,
        payload: JSON.stringify({ visitorId: visitor?.id ?? null, variantId: resolvedAB?.variantId ?? null }),
      },
    }),
  ]);

  // Fire automations
  triggerAutomations({
    tenantId: page.tenantId,
    contactId: contact.id,
    trigger: "FORM_SUBMITTED",
    triggerRef: page.id,
  }).catch((err) => console.error("[automation]", err));

  // Redirect to next page in funnel if one exists
  if (page.funnelId) {
    const next = await db.page.findFirst({
      where: { funnelId: page.funnelId, position: { gt: page.position }, state: "PUBLISHED" },
      orderBy: { position: "asc" },
    });
    if (next) {
      const tenant = await prisma.tenant.findUnique({ where: { id: page.tenantId } });
      // Build absolute URL from the inbound Host header (set by Caddy) so the
      // redirect doesn't leak the internal docker bind address (0.0.0.0:3000).
      const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || process.env.APP_BASE_DOMAIN || "";
      const proto = req.headers.get("x-forwarded-proto") || process.env.APP_PROTOCOL || "https";
      const base = host ? `${proto}://${host}` : req.url;
      return NextResponse.redirect(new URL(`/p/${tenant!.slug}/${next.slug}?email=${encodeURIComponent(contact.email)}`, base), 303);
    }
  }

  // Otherwise return a simple success page
  return new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"><title>Thank you</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:system-ui;background:#fafafa;color:#0f172a;min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center}</style></head><body><div><h1>Thank you</h1><p>We&apos;ll be in touch shortly.</p></div></body></html>`,
    { headers: { "content-type": "text/html" } }
  );
}
