"use server";

import { revalidatePath } from "next/cache";
import { requireTenant, tenantDb } from "../tenant";
import { requirePermission } from "../permissions";
import { audit } from "../audit";

export async function enableABAction(pageId: string) {
  const ctx = await requireTenant();
  requirePermission(ctx.role, "page.update");
  const db = tenantDb(ctx.tenant.id);

  const page = await db.page.findFirst({ where: { id: pageId } });
  if (!page) return { error: "Page not found" };

  // Create the control variant from the current page if no variants exist yet
  const variantCount = await db.pageVariant.count({ where: { pageId } });
  if (variantCount === 0) {
    await db.pageVariant.create({
      data: {
        tenantId: ctx.tenant.id,
        pageId, name: "A (Control)", weight: 50, isControl: true,
        blocksJson: page.blocksJson,
      },
    });
    // Create a "B" variant that operators can edit independently
    await db.pageVariant.create({
      data: {
        tenantId: ctx.tenant.id,
        pageId, name: "B (Variation)", weight: 50, isControl: false,
        blocksJson: page.blocksJson,
      },
    });
  }

  await db.page.update({ where: { id: pageId }, data: { abEnabled: true } });
  await audit({ tenantId: ctx.tenant.id, actorUserId: ctx.userId, action: "ab.enable", resourceType: "Page", resourceId: pageId });
  revalidatePath(`/t/${ctx.tenant.slug}/pages/${pageId}/edit`);
  return { ok: true };
}

export async function disableABAction(pageId: string) {
  const ctx = await requireTenant();
  requirePermission(ctx.role, "page.update");
  const db = tenantDb(ctx.tenant.id);
  await db.page.update({ where: { id: pageId }, data: { abEnabled: false } });
  await audit({ tenantId: ctx.tenant.id, actorUserId: ctx.userId, action: "ab.disable", resourceType: "Page", resourceId: pageId });
  revalidatePath(`/t/${ctx.tenant.slug}/pages/${pageId}/edit`);
  return { ok: true };
}

export async function updateVariantAction(variantId: string, patch: {
  name?: string;
  weight?: number;
  blocks?: unknown[];
}) {
  const ctx = await requireTenant();
  requirePermission(ctx.role, "page.update");
  const db = tenantDb(ctx.tenant.id);
  const data: { name?: string; weight?: number; blocksJson?: string } = {};
  if (patch.name) data.name = patch.name;
  if (typeof patch.weight === "number") data.weight = Math.max(0, Math.min(100, Math.round(patch.weight)));
  if (patch.blocks) data.blocksJson = JSON.stringify(patch.blocks);
  await db.pageVariant.update({ where: { id: variantId }, data });
  return { ok: true };
}

export async function addVariantAction(pageId: string, name: string) {
  const ctx = await requireTenant();
  requirePermission(ctx.role, "page.update");
  const db = tenantDb(ctx.tenant.id);
  const page = await db.page.findFirst({ where: { id: pageId } });
  if (!page) return { error: "Page not found" };
  const v = await db.pageVariant.create({
    data: {
      tenantId: ctx.tenant.id,
      pageId, name, weight: 50, isControl: false,
      blocksJson: page.blocksJson,
    },
  });
  revalidatePath(`/t/${ctx.tenant.slug}/pages/${pageId}/edit`);
  return { ok: true, variantId: v.id };
}

export async function deleteVariantAction(variantId: string) {
  const ctx = await requireTenant();
  requirePermission(ctx.role, "page.update");
  const db = tenantDb(ctx.tenant.id);
  await db.pageVariant.delete({ where: { id: variantId } });
  return { ok: true };
}

export async function declareVariantWinnerAction(variantId: string) {
  const ctx = await requireTenant();
  requirePermission(ctx.role, "page.publish");
  const db = tenantDb(ctx.tenant.id);
  const variant = await db.pageVariant.findFirst({ where: { id: variantId } });
  if (!variant) return { error: "Variant not found" };
  // Copy winner blocks into the page + disable A/B + snapshot to PageVersion
  const page = await db.page.findFirst({ where: { id: variant.pageId } });
  if (!page) return { error: "Page not found" };
  await db.pageVersion.create({
    data: {
      tenantId: ctx.tenant.id,
      pageId: page.id,
      blocksJson: page.blocksJson,
      seoTitle: page.seoTitle,
      seoDescription: page.seoDescription,
      publishedBy: ctx.userId,
      note: `Snapshot before declaring "${variant.name}" winner`,
    },
  });
  await db.page.update({
    where: { id: page.id },
    data: {
      blocksJson: variant.blocksJson,
      publishedBlocks: variant.blocksJson,
      abEnabled: false,
      publishedAt: new Date(),
    },
  });
  await audit({ tenantId: ctx.tenant.id, actorUserId: ctx.userId, action: "ab.declare_winner", resourceType: "PageVariant", resourceId: variantId });
  revalidatePath(`/t/${ctx.tenant.slug}/pages/${page.id}/edit`);
  return { ok: true };
}
