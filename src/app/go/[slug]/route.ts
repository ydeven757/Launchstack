import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentVisitor } from "@/server/services/visitor";
import { shortToken } from "@/server/crypto";

/**
 * Cloaked affiliate redirect.
 *
 * - Resolves /go/<slug> → the offer's target URL
 * - Generates a short TID (≤24 chars, alphanumeric+hyphen — ClickBank-compatible)
 *   and appends `?tid=<tid>` to the destination
 * - Persists a ClickEvent so when ClickBank INS fires later with that TID, we
 *   can attribute the sale back to the original visitor + contact + funnel
 * - Increments link click counter; logs event
 */
export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const { slug } = params;
  const link = await prisma.affiliateLink.findFirst({ where: { slug }, include: { offer: true } });
  if (!link) return NextResponse.redirect(new URL("/", req.url), 302);

  const visitor = await getCurrentVisitor().catch(() => null);
  const tid = shortToken(20); // 20 chars, well under ClickBank's 24-char limit

  // Compose target with TID + propagate click IDs the network may need
  const targetUrl = new URL(link.target);
  targetUrl.searchParams.set("tid", tid);
  if (visitor?.fbclid) targetUrl.searchParams.set("fbclid", visitor.fbclid);
  if (visitor?.gclid) targetUrl.searchParams.set("gclid", visitor.gclid);
  if (visitor?.ttclid) targetUrl.searchParams.set("ttclid", visitor.ttclid);

  // Persist click event for later INS resolution (best-effort)
  Promise.all([
    prisma.clickEvent.create({
      data: {
        tenantId: link.tenantId,
        tid,
        visitorId: visitor?.id ?? null,
        contactId: visitor?.contactId ?? null,
        linkId: link.id,
        offerId: link.offerId,
        utmJson: JSON.stringify({
          source: visitor?.utmSource,
          medium: visitor?.utmMedium,
          campaign: visitor?.utmCampaign,
        }),
      },
    }),
    prisma.affiliateLink.update({ where: { id: link.id }, data: { clicks: { increment: 1 } } }),
    prisma.event.create({
      data: {
        tenantId: link.tenantId,
        type: "go_click",
        contactId: visitor?.contactId ?? null,
        utmSource: visitor?.utmSource,
        utmMedium: visitor?.utmMedium,
        utmCampaign: visitor?.utmCampaign,
        payload: JSON.stringify({ linkId: link.id, offerId: link.offerId, slug, tid }),
      },
    }),
  ]).catch((e) => console.error("[go]", e));

  return NextResponse.redirect(targetUrl.toString(), 302);
}
