import "server-only";
import { cookies, headers } from "next/headers";
import { prisma } from "../db";

export const VISITOR_COOKIE = "ls_vid";

/**
 * Resolve or create the Visitor for the current public-page request.
 *
 * The visitor COOKIE is set by middleware.ts (server components cannot set
 * cookies). This function reads the cookie (or the fresh value from the
 * x-ls-fresh-vid header set by middleware) and upserts the DB row.
 *
 * Captures fbclid / gclid / ttclid / msclkid + UTM on first hit; updates
 * lastSeenAt on subsequent hits.
 */
export async function getOrCreateVisitor(input: {
  tenantId: string;
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const cookieStore = cookies();
  const h = headers();

  // Cookie set by middleware on this same response, OR existing cookie.
  const cookieId = cookieStore.get(VISITOR_COOKIE)?.value ?? h.get("x-ls-fresh-vid");
  if (!cookieId) return null;

  const sp = input.searchParams ?? {};
  const get = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };

  const fbclid = get("fbclid") ?? null;
  const gclid = get("gclid") ?? null;
  const ttclid = get("ttclid") ?? null;
  const msclkid = get("msclkid") ?? null;
  const utmSource = get("utm_source") ?? null;
  const utmMedium = get("utm_medium") ?? null;
  const utmCampaign = get("utm_campaign") ?? null;
  const referrer = h.get("referer");
  const userAgent = h.get("user-agent");
  const country = h.get("cf-ipcountry") || h.get("x-vercel-ip-country") || null;

  const existing = await prisma.visitor.findUnique({ where: { cookieId } });
  if (existing && existing.tenantId === input.tenantId) {
    await prisma.visitor.update({
      where: { id: existing.id },
      data: {
        fbclid: fbclid ?? existing.fbclid,
        gclid: gclid ?? existing.gclid,
        ttclid: ttclid ?? existing.ttclid,
        msclkid: msclkid ?? existing.msclkid,
        utmSource: utmSource ?? existing.utmSource,
        utmMedium: utmMedium ?? existing.utmMedium,
        utmCampaign: utmCampaign ?? existing.utmCampaign,
      },
    });
    return existing;
  }

  if (existing) {
    // Cookie belongs to a different tenant — don't leak data; treat as fresh
    // but keep the same cookieId on this tenant by creating a separate row.
    return prisma.visitor.create({
      data: {
        tenantId: input.tenantId,
        cookieId: `${cookieId}_${input.tenantId.slice(0, 6)}`, // keep unique
        fbclid, gclid, ttclid, msclkid,
        utmSource, utmMedium, utmCampaign,
        referrer, userAgent, country,
      },
    });
  }

  return prisma.visitor.create({
    data: {
      tenantId: input.tenantId,
      cookieId,
      fbclid, gclid, ttclid, msclkid,
      utmSource, utmMedium, utmCampaign,
      referrer, userAgent, country,
    },
  });
}

/** Read the current visitor (if any) without creating one. Used by /api/forms/submit etc. */
export async function getCurrentVisitor() {
  const cookieStore = cookies();
  const cookieId = cookieStore.get(VISITOR_COOKIE)?.value;
  if (!cookieId) return null;
  return prisma.visitor.findUnique({ where: { cookieId } });
}

/** Stitch a visitor → contact once they convert. */
export async function stitchVisitorToContact(visitorId: string, contactId: string) {
  await prisma.visitor.update({
    where: { id: visitorId },
    data: { contactId },
  });
}
