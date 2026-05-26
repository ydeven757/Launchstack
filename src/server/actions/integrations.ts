"use server";

import { revalidatePath } from "next/cache";
import { requireTenant, tenantDb } from "../tenant";
import { requirePermission } from "../permissions";
import { audit } from "../audit";
import { encryptJson, decryptJson, shortToken } from "../crypto";

export type ClickBankCreds = {
  insSecretKey: string;       // ClickBank account-level "Secret Key" used for INS HMAC
  apiClerkKey?: string;       // (Optional) developer Clerk Key for REST API
  apiDeveloperKey?: string;   // (Optional) developer key
};

export async function createClickBankIntegrationAction(formData: FormData) {
  const ctx = await requireTenant();
  requirePermission(ctx.role, "tenant.update");

  const insSecretKey = String(formData.get("insSecretKey") || "").trim();
  const apiClerkKey = String(formData.get("apiClerkKey") || "").trim();
  const apiDeveloperKey = String(formData.get("apiDeveloperKey") || "").trim();
  const label = String(formData.get("label") || "ClickBank").trim();

  if (!insSecretKey) return { error: "INS Secret Key is required" };

  const db = tenantDb(ctx.tenant.id);
  const creds: ClickBankCreds = {
    insSecretKey,
    apiClerkKey: apiClerkKey || undefined,
    apiDeveloperKey: apiDeveloperKey || undefined,
  };

  const integration = await db.integration.create({
    data: {
      tenantId: ctx.tenant.id,
      type: "clickbank",
      label,
      credentials: encryptJson(creds),
      config: JSON.stringify({ webhookId: shortToken(12) }),
      status: "ACTIVE",
    },
  });

  await audit({ tenantId: ctx.tenant.id, actorUserId: ctx.userId, action: "integration.create", resourceType: "Integration", resourceId: integration.id, after: { type: "clickbank", label } });
  revalidatePath(`/t/${ctx.tenant.slug}/settings/integrations`);
  return { ok: true, integrationId: integration.id };
}

export async function deleteIntegrationAction(integrationId: string) {
  const ctx = await requireTenant();
  requirePermission(ctx.role, "tenant.update");
  const db = tenantDb(ctx.tenant.id);
  await db.integration.delete({ where: { id: integrationId } });
  await audit({ tenantId: ctx.tenant.id, actorUserId: ctx.userId, action: "integration.delete", resourceType: "Integration", resourceId: integrationId });
  revalidatePath(`/t/${ctx.tenant.slug}/settings/integrations`);
  return { ok: true };
}

export async function toggleIntegrationAction(integrationId: string, enabled: boolean) {
  const ctx = await requireTenant();
  requirePermission(ctx.role, "tenant.update");
  const db = tenantDb(ctx.tenant.id);
  await db.integration.update({
    where: { id: integrationId },
    data: { status: enabled ? "ACTIVE" : "DISABLED" },
  });
  await audit({ tenantId: ctx.tenant.id, actorUserId: ctx.userId, action: enabled ? "integration.enable" : "integration.disable", resourceType: "Integration", resourceId: integrationId });
  revalidatePath(`/t/${ctx.tenant.slug}/settings/integrations`);
  return { ok: true };
}

/** Retrieve + decrypt credentials. Server-only callers (webhooks, sync jobs). */
export async function loadIntegrationCreds<T = unknown>(integrationId: string): Promise<T | null> {
  const ctx = await requireTenant();
  const db = tenantDb(ctx.tenant.id);
  const integration = await db.integration.findFirst({ where: { id: integrationId } });
  if (!integration) return null;
  return decryptJson<T>(integration.credentials);
}
