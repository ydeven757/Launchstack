import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const campaignId = url.searchParams.get("c");
  const contactId = url.searchParams.get("u");
  const target = url.searchParams.get("t");

  if (campaignId && contactId) {
    try {
      const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
      const delivery = await prisma.emailDelivery.findUnique({
        where: { campaignId_contactId: { campaignId, contactId } },
      });
      if (delivery) {
        await Promise.all([
          prisma.emailDelivery.update({
            where: { campaignId_contactId: { campaignId, contactId } },
            data: { clickedAt: delivery.clickedAt ?? new Date(), status: "clicked" },
          }),
          prisma.campaign.update({ where: { id: campaignId }, data: { clicks: { increment: 1 } } }),
          campaign && prisma.event.create({
            data: { tenantId: campaign.tenantId, contactId, type: "email_click", payload: JSON.stringify({ campaignId, target }) },
          }),
          campaign && prisma.activity.create({
            data: { tenantId: campaign.tenantId, contactId, type: "email_click", payload: JSON.stringify({ campaignId, target }) },
          }),
        ]);
      }
    } catch (e) {
      console.error("[track/click]", e);
    }
  }

  // Safe redirect
  const fallback = "/";
  const dest = (() => {
    if (!target) return fallback;
    try { return new URL(target).toString(); } catch { return fallback; }
  })();
  return NextResponse.redirect(dest, 302);
}
