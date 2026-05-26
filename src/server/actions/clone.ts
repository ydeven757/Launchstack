"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../db";
import { requireUser } from "../auth";
import { audit } from "../audit";
import { slugify } from "@/lib/utils";

/**
 * Clone a funnel from one tenant to another.
 *
 * This is the multi-tenant superpower CBA fundamentally can't do:
 * promote a winning funnel from one of your sites to a sibling brand
 * with a single action. Structural assets only — contacts/leads NEVER
 * cross tenant boundaries.
 *
 * Caller must be an OWNER/ADMIN/EDITOR on BOTH source AND target tenants.
 */
export async function cloneFunnelToTenantAction(input: {
  sourceFunnelId: string;
  targetTenantId: string;
  newName?: string;
}) {
  const user = await requireUser();

  // Source funnel + permission check on source
  const source = await prisma.funnel.findUnique({
    where: { id: input.sourceFunnelId },
    include: { pages: { orderBy: { position: "asc" } } },
  });
  if (!source) return { error: "Source funnel not found" };

  const sourceMember = await prisma.membership.findUnique({
    where: { userId_tenantId: { userId: user.id, tenantId: source.tenantId } },
  });
  if (!sourceMember && !user.isSuperAdmin) return { error: "You don't have access to the source workspace" };

  // Permission check on target
  const targetMember = await prisma.membership.findUnique({
    where: { userId_tenantId: { userId: user.id, tenantId: input.targetTenantId } },
  });
  if (!targetMember && !user.isSuperAdmin) return { error: "You don't have access to the target workspace" };
  if (targetMember && targetMember.role === "ANALYST") return { error: "Analysts cannot create funnels" };

  const targetTenant = await prisma.tenant.findUnique({ where: { id: input.targetTenantId } });
  if (!targetTenant) return { error: "Target workspace not found" };

  // Generate unique slug in target
  const baseName = input.newName || `${source.name} (cloned)`;
  let funnelSlug = slugify(baseName);
  let n = 1;
  while (await prisma.funnel.findFirst({ where: { tenantId: input.targetTenantId, slug: funnelSlug } })) {
    n += 1;
    funnelSlug = `${slugify(baseName)}-${n}`;
  }

  const cloned = await prisma.funnel.create({
    data: {
      tenantId: input.targetTenantId,
      name: baseName,
      description: source.description,
      slug: funnelSlug,
      state: "DRAFT",
    },
  });

  for (let i = 0; i < source.pages.length; i++) {
    const p = source.pages[i];
    let pageSlug = slugify(p.name);
    let k = 1;
    while (await prisma.page.findFirst({ where: { tenantId: input.targetTenantId, slug: pageSlug } })) {
      k += 1;
      pageSlug = `${slugify(p.name)}-${k}`;
    }
    await prisma.page.create({
      data: {
        tenantId: input.targetTenantId,
        funnelId: cloned.id,
        type: p.type,
        name: p.name,
        slug: pageSlug,
        position: i,
        blocksJson: p.blocksJson,
        seoTitle: p.seoTitle,
        seoDescription: p.seoDescription,
        requiresDisclosure: p.requiresDisclosure,
        state: "DRAFT",
      },
    });
  }

  await audit({
    tenantId: input.targetTenantId,
    actorUserId: user.id,
    action: "funnel.clone_cross_tenant",
    resourceType: "Funnel",
    resourceId: cloned.id,
    after: { sourceTenantId: source.tenantId, sourceFunnelId: source.id, pages: source.pages.length },
  });

  revalidatePath(`/t/${targetTenant.slug}/funnels`);
  return { ok: true, funnelId: cloned.id, targetSlug: targetTenant.slug };
}
