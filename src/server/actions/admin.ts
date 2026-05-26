"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../db";
import { requireUser } from "../auth";
import { audit } from "../audit";

async function requireSuperAdmin() {
  const user = await requireUser();
  if (!user.isSuperAdmin) throw new Error("FORBIDDEN");
  return user;
}

export async function suspendTenantAction(tenantId: string) {
  const user = await requireSuperAdmin();
  await prisma.tenant.update({ where: { id: tenantId }, data: { status: "SUSPENDED" } });
  await audit({ tenantId, actorUserId: user.id, action: "platform.suspend", resourceType: "Tenant", resourceId: tenantId });
  revalidatePath("/admin");
  return { ok: true };
}

export async function unsuspendTenantAction(tenantId: string) {
  const user = await requireSuperAdmin();
  await prisma.tenant.update({ where: { id: tenantId }, data: { status: "ACTIVE" } });
  await audit({ tenantId, actorUserId: user.id, action: "platform.unsuspend", resourceType: "Tenant", resourceId: tenantId });
  revalidatePath("/admin");
  return { ok: true };
}
