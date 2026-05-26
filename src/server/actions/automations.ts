"use server";

import { revalidatePath } from "next/cache";
import { requireTenant, tenantDb } from "../tenant";
import { requirePermission } from "../permissions";
import { audit } from "../audit";
import { automationSchema } from "@/lib/validators";

export async function createAutomationAction(input: {
  name: string;
  trigger: "FORM_SUBMITTED" | "TAG_ADDED" | "PAGE_VISITED" | "LINK_CLICKED";
  triggerRef?: string | null;
  steps: { type: string; config: Record<string, unknown> }[];
  enabled?: boolean;
}) {
  const ctx = await requireTenant();
  requirePermission(ctx.role, "automation.manage");
  const parsed = automationSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Invalid input" };

  const db = tenantDb(ctx.tenant.id);
  const auto = await db.automation.create({
    data: {
      tenantId: ctx.tenant.id,
      name: parsed.data.name,
      trigger: parsed.data.trigger,
      triggerRef: parsed.data.triggerRef ?? null,
      stepsJson: JSON.stringify(parsed.data.steps),
      enabled: parsed.data.enabled ?? true,
    },
  });
  await audit({ tenantId: ctx.tenant.id, actorUserId: ctx.userId, action: "automation.create", resourceType: "Automation", resourceId: auto.id });
  revalidatePath(`/t/${ctx.tenant.slug}/automations`);
  return { ok: true, automationId: auto.id };
}

export async function toggleAutomationAction(automationId: string, enabled: boolean) {
  const ctx = await requireTenant();
  requirePermission(ctx.role, "automation.manage");
  const db = tenantDb(ctx.tenant.id);
  await db.automation.update({ where: { id: automationId }, data: { enabled } });
  await audit({ tenantId: ctx.tenant.id, actorUserId: ctx.userId, action: enabled ? "automation.enable" : "automation.disable", resourceType: "Automation", resourceId: automationId });
  revalidatePath(`/t/${ctx.tenant.slug}/automations`);
  return { ok: true };
}

export async function deleteAutomationAction(automationId: string) {
  const ctx = await requireTenant();
  requirePermission(ctx.role, "automation.manage");
  const db = tenantDb(ctx.tenant.id);
  await db.automation.delete({ where: { id: automationId } });
  await audit({ tenantId: ctx.tenant.id, actorUserId: ctx.userId, action: "automation.delete", resourceType: "Automation", resourceId: automationId });
  revalidatePath(`/t/${ctx.tenant.slug}/automations`);
  return { ok: true };
}
