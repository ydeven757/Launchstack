"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../db";
import { requireTenant, tenantDb } from "../tenant";
import { requirePermission } from "../permissions";
import { audit } from "../audit";
import { slugify } from "@/lib/utils";
import { CURATED_MARKETPLACE } from "../templates/marketplace-curated";
import { BUILTIN_TEMPLATES } from "../templates/builtin-data";
import { applyTemplateToTenant } from "../templates/starter-templates";

/**
 * Seed/refresh the global MarketplaceProduct catalog from the curated list
 * OR (in production with ClickBank REST API creds) from a live sync.
 *
 * Idempotent — re-running upserts by (network, externalId).
 */
export async function syncCuratedMarketplaceAction() {
  // No permission check — superadmin only via admin UI (we don't expose this to tenant ops)
  const ctx = await requireTenant();
  if (!ctx.isSuperAdmin) return { error: "Forbidden" };

  let inserted = 0;
  for (const p of CURATED_MARKETPLACE) {
    await prisma.marketplaceProduct.upsert({
      where: { network_externalId: { network: p.network, externalId: p.externalId } },
      update: {
        title: p.title, vendor: p.vendor, niche: p.niche, category: p.category,
        gravity: p.gravity, avgPayout: p.avgPayout, initialPayout: p.initialPayout, rebillPayout: p.rebillPayout,
        currency: p.currency, commission: p.commission, hopUrl: p.hopUrl, salesPageUrl: p.salesPageUrl,
        description: p.description, recommendedFunnel: p.recommendedFunnel,
        tags: JSON.stringify(p.tags), active: true, syncedAt: new Date(),
      },
      create: {
        network: p.network, externalId: p.externalId,
        title: p.title, vendor: p.vendor, niche: p.niche, category: p.category,
        gravity: p.gravity, avgPayout: p.avgPayout, initialPayout: p.initialPayout, rebillPayout: p.rebillPayout,
        currency: p.currency, commission: p.commission, hopUrl: p.hopUrl, salesPageUrl: p.salesPageUrl,
        description: p.description, recommendedFunnel: p.recommendedFunnel,
        tags: JSON.stringify(p.tags),
      },
    });
    inserted += 1;
  }
  await audit({ tenantId: ctx.tenant.id, actorUserId: ctx.userId, action: "marketplace.sync", resourceType: "MarketplaceProduct", after: { count: inserted } });
  revalidatePath(`/t/${ctx.tenant.slug}/marketplace`);
  return { ok: true, count: inserted };
}

/**
 * One-click "Promote into funnel" — creates an Offer + AffiliateLink + clones a
 * matching template, all wired up so the operator can publish in under a minute.
 */
export async function promoteOfferAction(input: {
  productId: string;
  affiliateId?: string; // ClickBank nickname or similar
}) {
  const ctx = await requireTenant();
  requirePermission(ctx.role, "offer.manage");

  const product = await prisma.marketplaceProduct.findUnique({ where: { id: input.productId } });
  if (!product) return { error: "Product not found" };

  const db = tenantDb(ctx.tenant.id);

  // Resolve final hop URL — substitute {AFF_ID} if affiliateId provided
  const hopUrl = input.affiliateId
    ? product.hopUrl.replace("{AFF_ID}", encodeURIComponent(input.affiliateId))
    : product.hopUrl;

  // 1. Offer
  const offer = await db.offer.create({
    data: {
      tenantId: ctx.tenant.id,
      name: product.title,
      network: product.network,
      payout: product.avgPayout,
      currency: product.currency,
      landingUrl: hopUrl,
      notes: product.description,
    },
  });

  // 2. Affiliate link with unique slug
  let linkSlug = slugify(product.title).slice(0, 40);
  let n = 1;
  while (await db.affiliateLink.findFirst({ where: { slug: linkSlug } })) {
    n += 1;
    linkSlug = `${slugify(product.title).slice(0, 35)}-${n}`;
  }
  const link = await db.affiliateLink.create({
    data: {
      tenantId: ctx.tenant.id,
      offerId: offer.id,
      slug: linkSlug,
      target: hopUrl,
      utm: JSON.stringify({ source: "launchstack", campaign: product.externalId }),
    },
  });

  // 3. Clone a matching template — find the one whose funnelType + niche fits
  const recommendedFt = product.recommendedFunnel;
  const matching =
    BUILTIN_TEMPLATES.find((t) => t.niche === product.niche && t.funnelType === recommendedFt) ??
    BUILTIN_TEMPLATES.find((t) => t.niche === product.niche) ??
    BUILTIN_TEMPLATES.find((t) => t.funnelType === recommendedFt) ??
    BUILTIN_TEMPLATES[0];

  let funnelId: string | null = null;
  if (matching) {
    const funnel = await applyTemplateToTenant(ctx.tenant.id, matching);
    funnelId = funnel.id;

    // Wire CTA buttons inside the template's pages to point at /go/<linkSlug>
    const pages = await db.page.findMany({ where: { funnelId: funnel.id } });
    for (const page of pages) {
      try {
        const blocks: { id: string; type: string; props?: Record<string, unknown> }[] = JSON.parse(page.blocksJson);
        const updated = blocks.map((b) => {
          if (b.type === "cta") {
            return { ...b, props: { ...(b.props ?? {}), href: `/go/${linkSlug}` } };
          }
          return b;
        });
        await db.page.update({ where: { id: page.id }, data: { blocksJson: JSON.stringify(updated) } });
      } catch {/* skip page on parse error */}
    }
  }

  await audit({
    tenantId: ctx.tenant.id,
    actorUserId: ctx.userId,
    action: "marketplace.promote",
    resourceType: "MarketplaceProduct",
    resourceId: product.id,
    after: { offerId: offer.id, linkId: link.id, funnelId },
  });

  revalidatePath(`/t/${ctx.tenant.slug}/offers`);
  revalidatePath(`/t/${ctx.tenant.slug}/funnels`);

  return { ok: true, offerId: offer.id, linkId: link.id, linkSlug, funnelId };
}
