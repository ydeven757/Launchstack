"use server";

import { revalidatePath } from "next/cache";
import { requireTenant, tenantDb } from "../tenant";
import { requirePermission } from "../permissions";
import { audit } from "../audit";
import { domainSchema } from "@/lib/validators";
import { prisma } from "../db";

export async function addDomainAction(formData: FormData) {
  const ctx = await requireTenant();
  requirePermission(ctx.role, "domain.manage");
  const parsed = domainSchema.safeParse({
    hostname: String(formData.get("hostname") || "").toLowerCase().trim(),
    isPrimary: formData.get("isPrimary") === "on",
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Invalid input" };

  const existing = await prisma.domain.findUnique({ where: { hostname: parsed.data.hostname } });
  if (existing) return { error: "That hostname is already in use." };

  const db = tenantDb(ctx.tenant.id);
  if (parsed.data.isPrimary) {
    await db.domain.updateMany({ where: { isPrimary: true }, data: { isPrimary: false } });
  }
  const domain = await db.domain.create({
    data: {
      tenantId: ctx.tenant.id,
      hostname: parsed.data.hostname,
      isPrimary: parsed.data.isPrimary ?? false,
    },
  });
  await audit({ tenantId: ctx.tenant.id, actorUserId: ctx.userId, action: "domain.create", resourceType: "Domain", resourceId: domain.id });
  revalidatePath(`/t/${ctx.tenant.slug}/domains`);
  return { ok: true, domainId: domain.id };
}

export async function verifyDomainAction(domainId: string) {
  const ctx = await requireTenant();
  requirePermission(ctx.role, "domain.manage");
  const db = tenantDb(ctx.tenant.id);
  // MVP: mock verification — in production, would do DNS lookup against verifyToken.
  await db.domain.update({ where: { id: domainId }, data: { status: "VERIFIED", verifiedAt: new Date() } });
  await audit({ tenantId: ctx.tenant.id, actorUserId: ctx.userId, action: "domain.verify", resourceType: "Domain", resourceId: domainId });
  revalidatePath(`/t/${ctx.tenant.slug}/domains`);
  return { ok: true };
}

export async function deleteDomainAction(domainId: string) {
  const ctx = await requireTenant();
  requirePermission(ctx.role, "domain.manage");
  const db = tenantDb(ctx.tenant.id);
  await db.domain.delete({ where: { id: domainId } });
  await audit({ tenantId: ctx.tenant.id, actorUserId: ctx.userId, action: "domain.delete", resourceType: "Domain", resourceId: domainId });
  revalidatePath(`/t/${ctx.tenant.slug}/domains`);
  return { ok: true };
}
