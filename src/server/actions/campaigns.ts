"use server";

import { revalidatePath } from "next/cache";
import { requireTenant, tenantDb } from "../tenant";
import { requirePermission } from "../permissions";
import { audit } from "../audit";
import { campaignSchema } from "@/lib/validators";
import { sendEmail } from "../services/email-sender";
import { safeJsonParse } from "@/lib/utils";

export async function createCampaignAction(formData: FormData) {
  const ctx = await requireTenant();
  requirePermission(ctx.role, "campaign.create");
  const segmentTagIdsRaw = formData.get("segmentTagIds");
  const parsed = campaignSchema.safeParse({
    name: formData.get("name"),
    subject: formData.get("subject"),
    fromName: formData.get("fromName"),
    fromEmail: formData.get("fromEmail"),
    bodyHtml: formData.get("bodyHtml"),
    segmentTagIds: segmentTagIdsRaw ? safeJsonParse<string[]>(String(segmentTagIdsRaw), []) : [],
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Invalid input" };

  const db = tenantDb(ctx.tenant.id);
  const campaign = await db.campaign.create({
    data: {
      tenantId: ctx.tenant.id,
      name: parsed.data.name,
      subject: parsed.data.subject,
      fromName: parsed.data.fromName,
      fromEmail: parsed.data.fromEmail,
      bodyHtml: parsed.data.bodyHtml,
      segmentTagIds: JSON.stringify(parsed.data.segmentTagIds ?? []),
    },
  });
  await audit({ tenantId: ctx.tenant.id, actorUserId: ctx.userId, action: "campaign.create", resourceType: "Campaign", resourceId: campaign.id });
  revalidatePath(`/t/${ctx.tenant.slug}/emails`);
  return { ok: true, campaignId: campaign.id };
}

export async function sendCampaignAction(campaignId: string) {
  const ctx = await requireTenant();
  requirePermission(ctx.role, "campaign.send");
  const db = tenantDb(ctx.tenant.id);
  const campaign = await db.campaign.findFirst({ where: { id: campaignId } });
  if (!campaign) return { error: "Campaign not found" };
  if (campaign.status === "SENT" || campaign.status === "SENDING") return { error: "Already sent or in progress" };

  const segmentTagIds = safeJsonParse<string[]>(campaign.segmentTagIds, []);

  // Build recipient list
  const where: { status: { in: ("LEAD"|"ENGAGED"|"CUSTOMER")[] }; contactTags?: { some: { tagId: { in: string[] } } } } = {
    status: { in: ["LEAD", "ENGAGED", "CUSTOMER"] },
  };
  if (segmentTagIds.length > 0) {
    where.contactTags = { some: { tagId: { in: segmentTagIds } } };
  }
  const recipients = await db.contact.findMany({ where });

  await db.campaign.update({ where: { id: campaignId }, data: { status: "SENDING", recipients: recipients.length } });

  let delivered = 0, failed = 0;
  for (const contact of recipients) {
    // Idempotency
    await db.emailDelivery.upsert({
      where: { campaignId_contactId: { campaignId, contactId: contact.id } },
      create: { tenantId: ctx.tenant.id, campaignId, contactId: contact.id, status: "queued" },
      update: {},
    });

    const res = await sendEmail({
      tenantId: ctx.tenant.id,
      contactId: contact.id,
      to: contact.email,
      from: campaign.fromEmail,
      fromName: campaign.fromName,
      subject: campaign.subject,
      bodyHtml: injectTracking(campaign.bodyHtml, { campaignId, contactId: contact.id, tenantSlug: ctx.tenant.slug }),
      source: "broadcast",
      sourceId: campaignId,
    });
    if (res.ok) {
      delivered += 1;
      await db.emailDelivery.update({ where: { campaignId_contactId: { campaignId, contactId: contact.id } }, data: { status: "sent" } });
    } else {
      failed += 1;
    }
  }

  await db.campaign.update({
    where: { id: campaignId },
    data: { status: "SENT", sentAt: new Date(), delivered, bounces: failed },
  });
  await audit({ tenantId: ctx.tenant.id, actorUserId: ctx.userId, action: "campaign.send", resourceType: "Campaign", resourceId: campaignId, after: { delivered, failed } });
  revalidatePath(`/t/${ctx.tenant.slug}/emails`);
  return { ok: true, delivered, failed };
}

function injectTracking(html: string, p: { campaignId: string; contactId: string; tenantSlug: string }): string {
  const base = `${process.env.APP_PROTOCOL || "http"}://${process.env.APP_BASE_DOMAIN || "localhost:3000"}`;
  const pixel = `<img src="${base}/api/track/open?c=${p.campaignId}&u=${p.contactId}" width="1" height="1" alt="" style="display:none" />`;
  // Wrap links with click tracker
  const wrapped = html.replace(/<a\s+href="([^"]+)"/g, (_m, href) => {
    const target = encodeURIComponent(href);
    return `<a href="${base}/api/track/click?c=${p.campaignId}&u=${p.contactId}&t=${target}"`;
  });
  return `${wrapped}${pixel}`;
}

export async function deleteCampaignAction(campaignId: string) {
  const ctx = await requireTenant();
  requirePermission(ctx.role, "campaign.delete");
  const db = tenantDb(ctx.tenant.id);
  await db.campaign.delete({ where: { id: campaignId } });
  await audit({ tenantId: ctx.tenant.id, actorUserId: ctx.userId, action: "campaign.delete", resourceType: "Campaign", resourceId: campaignId });
  revalidatePath(`/t/${ctx.tenant.slug}/emails`);
  return { ok: true };
}
