import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";

// 1x1 transparent GIF
const PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const campaignId = url.searchParams.get("c");
  const contactId = url.searchParams.get("u");

  if (campaignId && contactId) {
    try {
      const delivery = await prisma.emailDelivery.findUnique({
        where: { campaignId_contactId: { campaignId, contactId } },
      });
      if (delivery && !delivery.openedAt) {
        const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
        await Promise.all([
          prisma.emailDelivery.update({
            where: { campaignId_contactId: { campaignId, contactId } },
            data: { openedAt: new Date(), status: "opened" },
          }),
          prisma.campaign.update({ where: { id: campaignId }, data: { opens: { increment: 1 } } }),
          campaign && prisma.event.create({
            data: { tenantId: campaign.tenantId, contactId, type: "email_open", payload: JSON.stringify({ campaignId }) },
          }),
          campaign && prisma.activity.create({
            data: { tenantId: campaign.tenantId, contactId, type: "email_open", payload: JSON.stringify({ campaignId }) },
          }),
        ]);
      }
    } catch (e) {
      console.error("[track/open]", e);
    }
  }

  return new NextResponse(PIXEL, {
    headers: { "content-type": "image/gif", "cache-control": "no-store" },
  });
}
