"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTenant, tenantDb } from "../tenant";
import { requirePermission } from "../permissions";
import { audit } from "../audit";
import { createFunnelSchema } from "@/lib/validators";
import { slugify } from "@/lib/utils";

async function uniqueFunnelSlug(tenantId: string, base: string): Promise<string> {
  const db = tenantDb(tenantId);
  let slug = slugify(base) || "funnel";
  let n = 1;
  while (await db.funnel.findFirst({ where: { slug } })) {
    n += 1;
    slug = `${slugify(base)}-${n}`;
  }
  return slug;
}

export async function createFunnelAction(formData: FormData) {
  const ctx = await requireTenant();
  requirePermission(ctx.role, "funnel.create");
  const parsed = createFunnelSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || null,
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Invalid input" };

  const slug = await uniqueFunnelSlug(ctx.tenant.id, parsed.data.name);
  const db = tenantDb(ctx.tenant.id);
  const funnel = await db.funnel.create({ data: { tenantId: ctx.tenant.id, name: parsed.data.name, description: parsed.data.description, slug } });

  await audit({ tenantId: ctx.tenant.id, actorUserId: ctx.userId, action: "funnel.create", resourceType: "Funnel", resourceId: funnel.id, after: funnel });
  revalidatePath(`/t/${ctx.tenant.slug}/funnels`);
  redirect(`/t/${ctx.tenant.slug}/funnels/${funnel.id}`);
}

export async function renameFunnelAction(funnelId: string, name: string) {
  const ctx = await requireTenant();
  requirePermission(ctx.role, "funnel.update");
  const db = tenantDb(ctx.tenant.id);
  const before = await db.funnel.findFirst({ where: { id: funnelId } });
  if (!before) return { error: "Funnel not found" };
  const slug = await uniqueFunnelSlug(ctx.tenant.id, name);
  const after = await db.funnel.update({ where: { id: funnelId }, data: { name, slug } });
  await audit({ tenantId: ctx.tenant.id, actorUserId: ctx.userId, action: "funnel.update", resourceType: "Funnel", resourceId: funnelId, before, after });
  revalidatePath(`/t/${ctx.tenant.slug}/funnels/${funnelId}`);
  return { ok: true };
}

export async function deleteFunnelAction(funnelId: string) {
  const ctx = await requireTenant();
  requirePermission(ctx.role, "funnel.delete");
  const db = tenantDb(ctx.tenant.id);
  const before = await db.funnel.findFirst({ where: { id: funnelId } });
  if (!before) return { error: "Funnel not found" };
  await db.funnel.delete({ where: { id: funnelId } });
  await audit({ tenantId: ctx.tenant.id, actorUserId: ctx.userId, action: "funnel.delete", resourceType: "Funnel", resourceId: funnelId, before });
  revalidatePath(`/t/${ctx.tenant.slug}/funnels`);
  redirect(`/t/${ctx.tenant.slug}/funnels`);
}

export async function publishFunnelAction(funnelId: string) {
  const ctx = await requireTenant();
  requirePermission(ctx.role, "page.publish");
  const db = tenantDb(ctx.tenant.id);
  await db.funnel.update({ where: { id: funnelId }, data: { state: "PUBLISHED" } });
  await db.page.updateMany({ where: { funnelId }, data: { state: "PUBLISHED", publishedAt: new Date() } });
  // Snapshot
  const pages = await db.page.findMany({ where: { funnelId } });
  for (const p of pages) {
    await db.page.update({ where: { id: p.id }, data: { publishedBlocks: p.blocksJson } });
  }
  await audit({ tenantId: ctx.tenant.id, actorUserId: ctx.userId, action: "funnel.publish", resourceType: "Funnel", resourceId: funnelId });
  revalidatePath(`/t/${ctx.tenant.slug}/funnels/${funnelId}`);
  return { ok: true };
}
