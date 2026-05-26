"use server";

import { revalidatePath } from "next/cache";
import { requireTenant, tenantDb } from "../tenant";
import { requirePermission } from "../permissions";
import { audit } from "../audit";
import { applyTemplateToTenant, type StarterTemplate } from "../templates/starter-templates";
import { prisma } from "../db";

export async function applyBuiltinTemplateAction(templateId: string) {
  const ctx = await requireTenant();
  requirePermission(ctx.role, "template.manage");
  const tpl = await prisma.template.findFirst({ where: { id: templateId, isBuiltIn: true } });
  if (!tpl) return { error: "Template not found" };

  const payload = JSON.parse(tpl.payload) as { funnelName: string; pages: { name: string; type: string; blocks: unknown[] }[] };
  const parsed: StarterTemplate = {
    id: tpl.id,
    name: tpl.name,
    description: tpl.description ?? undefined,
    niche: tpl.niche ?? undefined,
    trafficSource: tpl.trafficSource ?? undefined,
    funnelType: tpl.funnelType ?? undefined,
    funnelName: payload.funnelName,
    pages: payload.pages.map((p) => ({
      name: p.name,
      type: p.type as StarterTemplate["pages"][number]["type"],
      blocks: p.blocks as StarterTemplate["pages"][number]["blocks"],
    })),
  };
  await applyTemplateToTenant(ctx.tenant.id, parsed);
  await audit({ tenantId: ctx.tenant.id, actorUserId: ctx.userId, action: "template.apply", resourceType: "Template", resourceId: tpl.id });
  revalidatePath(`/t/${ctx.tenant.slug}/funnels`);
  return { ok: true };
}

export async function saveAsTemplateAction(funnelId: string, name: string) {
  const ctx = await requireTenant();
  requirePermission(ctx.role, "template.manage");
  const db = tenantDb(ctx.tenant.id);
  const funnel = await db.funnel.findFirst({ where: { id: funnelId } });
  if (!funnel) return { error: "Funnel not found" };
  const pages = await db.page.findMany({ where: { funnelId }, orderBy: { position: "asc" } });
  const payload = {
    funnelName: funnel.name,
    pages: pages.map(p => ({ name: p.name, type: p.type, blocks: JSON.parse(p.blocksJson) })),
  };
  const tpl = await db.template.create({
    data: {
      tenantId: ctx.tenant.id,
      name,
      description: `Saved from ${funnel.name}`,
      funnelType: "custom",
      payload: JSON.stringify(payload),
      isBuiltIn: false,
    },
  });
  await audit({ tenantId: ctx.tenant.id, actorUserId: ctx.userId, action: "template.create", resourceType: "Template", resourceId: tpl.id });
  revalidatePath(`/t/${ctx.tenant.slug}/templates`);
  return { ok: true, templateId: tpl.id };
}
