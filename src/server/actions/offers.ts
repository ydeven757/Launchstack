"use server";

import { revalidatePath } from "next/cache";
import { requireTenant, tenantDb } from "../tenant";
import { requirePermission } from "../permissions";
import { audit } from "../audit";
import { affiliateLinkSchema, offerSchema } from "@/lib/validators";

export async function createOfferAction(formData: FormData) {
  const ctx = await requireTenant();
  requirePermission(ctx.role, "offer.manage");
  const parsed = offerSchema.safeParse({
    name: formData.get("name"),
    network: formData.get("network") || null,
    payout: formData.get("payout") ? Number(formData.get("payout")) : null,
    currency: (formData.get("currency") as string) || "USD",
    landingUrl: formData.get("landingUrl"),
    notes: formData.get("notes") || null,
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Invalid input" };

  const db = tenantDb(ctx.tenant.id);
  const offer = await db.offer.create({ data: { tenantId: ctx.tenant.id, ...parsed.data } });
  await audit({ tenantId: ctx.tenant.id, actorUserId: ctx.userId, action: "offer.create", resourceType: "Offer", resourceId: offer.id });
  revalidatePath(`/t/${ctx.tenant.slug}/offers`);
  return { ok: true, offerId: offer.id };
}

export async function createAffiliateLinkAction(formData: FormData) {
  const ctx = await requireTenant();
  requirePermission(ctx.role, "offer.manage");
  const parsed = affiliateLinkSchema.safeParse({
    offerId: formData.get("offerId"),
    slug: String(formData.get("slug") || "").toLowerCase(),
    utm: {
      source: (formData.get("utmSource") as string) || undefined,
      medium: (formData.get("utmMedium") as string) || undefined,
      campaign: (formData.get("utmCampaign") as string) || undefined,
    },
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Invalid input" };

  const db = tenantDb(ctx.tenant.id);
  const offer = await db.offer.findFirst({ where: { id: parsed.data.offerId } });
  if (!offer) return { error: "Offer not found" };
  const dup = await db.affiliateLink.findFirst({ where: { slug: parsed.data.slug } });
  if (dup) return { error: "Slug already used" };

  // Build target URL with UTM
  const u = new URL(offer.landingUrl);
  if (parsed.data.utm?.source) u.searchParams.set("utm_source", parsed.data.utm.source);
  if (parsed.data.utm?.medium) u.searchParams.set("utm_medium", parsed.data.utm.medium);
  if (parsed.data.utm?.campaign) u.searchParams.set("utm_campaign", parsed.data.utm.campaign);

  await db.affiliateLink.create({
    data: {
      tenantId: ctx.tenant.id,
      offerId: offer.id,
      slug: parsed.data.slug,
      target: u.toString(),
      utm: JSON.stringify(parsed.data.utm ?? {}),
    },
  });
  revalidatePath(`/t/${ctx.tenant.slug}/offers`);
  return { ok: true };
}

export async function deleteOfferAction(offerId: string) {
  const ctx = await requireTenant();
  requirePermission(ctx.role, "offer.manage");
  const db = tenantDb(ctx.tenant.id);
  await db.offer.delete({ where: { id: offerId } });
  await audit({ tenantId: ctx.tenant.id, actorUserId: ctx.userId, action: "offer.delete", resourceType: "Offer", resourceId: offerId });
  revalidatePath(`/t/${ctx.tenant.slug}/offers`);
  return { ok: true };
}
