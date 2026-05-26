"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hash } from "bcryptjs";
import { prisma } from "../db";
import { requireUser, getCurrentUser } from "../auth";
import { setActiveTenant, clearActiveTenant } from "../tenant";
import { audit } from "../audit";
import { createTenantSchema, signupSchema, updateTenantSchema } from "@/lib/validators";
import { slugify } from "@/lib/utils";
import { applyTemplateToTenant, BUILTIN_TEMPLATES } from "../templates/starter-templates";

export async function signupAction(formData: FormData) {
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    name: formData.get("name") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Invalid input" };

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return { error: "An account with that email already exists." };

  const passwordHash = await hash(parsed.data.password, 12);
  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      passwordHash,
    },
  });
  await audit({ actorUserId: user.id, action: "user.signup", resourceType: "User", resourceId: user.id });
  return { ok: true };
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = slugify(base) || "site";
  let n = 1;
  while (await prisma.tenant.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${slugify(base)}-${n}`;
  }
  return slug;
}

export async function createTenantAction(formData: FormData) {
  const user = await requireUser();
  const parsed = createTenantSchema.safeParse({
    name: formData.get("name"),
    niche: formData.get("niche") || null,
    trafficSource: formData.get("trafficSource") || null,
    conversionGoal: formData.get("conversionGoal") || null,
    starterTemplateId: formData.get("starterTemplateId") || null,
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Invalid input" };

  const slug = await uniqueSlug(parsed.data.name);

  const tenant = await prisma.tenant.create({
    data: {
      slug,
      name: parsed.data.name,
      niche: parsed.data.niche,
      trafficSource: parsed.data.trafficSource,
      conversionGoal: parsed.data.conversionGoal,
      ownerUserId: user.id,
      memberships: { create: { userId: user.id, role: "OWNER" } },
    },
  });

  // Apply starter template if chosen and publish immediately so the
  // operator sees a live URL on first load — "speed to first launched site"
  if (parsed.data.starterTemplateId) {
    const tpl = BUILTIN_TEMPLATES.find(t => t.id === parsed.data.starterTemplateId);
    if (tpl) {
      const funnel = await applyTemplateToTenant(tenant.id, tpl);
      // Auto-publish so /p/<slug>/<page-slug> works immediately
      await prisma.page.updateMany({
        where: { funnelId: funnel.id },
        data: { state: "PUBLISHED", publishedAt: new Date() },
      });
      const pages = await prisma.page.findMany({ where: { funnelId: funnel.id } });
      for (const p of pages) {
        await prisma.page.update({ where: { id: p.id }, data: { publishedBlocks: p.blocksJson } });
      }
      await prisma.funnel.update({ where: { id: funnel.id }, data: { state: "PUBLISHED" } });
    }
  }

  // Mark onboarding complete
  await prisma.tenant.update({ where: { id: tenant.id }, data: { onboardingDone: true } });

  await audit({ tenantId: tenant.id, actorUserId: user.id, action: "tenant.create", resourceType: "Tenant", resourceId: tenant.id, after: { name: tenant.name, slug: tenant.slug } });

  await setActiveTenant(tenant.id);
  redirect(`/t/${tenant.slug}`);
}

export async function switchTenantAction(tenantId: string) {
  const user = await requireUser();
  const m = await prisma.membership.findUnique({ where: { userId_tenantId: { userId: user.id, tenantId } } });
  if (!m) throw new Error("Not a member of that workspace");
  await setActiveTenant(tenantId);
  revalidatePath("/");
}

export async function leaveTenantAction(tenantId: string) {
  const user = await requireUser();
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return { error: "Workspace not found" };
  if (tenant.ownerUserId === user.id) return { error: "Owner cannot leave. Transfer ownership or delete the workspace." };
  await prisma.membership.delete({ where: { userId_tenantId: { userId: user.id, tenantId } } });
  await clearActiveTenant();
  revalidatePath("/app");
  return { ok: true };
}

export async function updateTenantAction(tenantId: string, formData: FormData) {
  const user = await requireUser();
  const m = await prisma.membership.findUnique({ where: { userId_tenantId: { userId: user.id, tenantId } } });
  if (!m || (m.role !== "OWNER" && m.role !== "ADMIN")) return { error: "Insufficient permissions" };

  const parsed = updateTenantSchema.safeParse({
    name: formData.get("name") || undefined,
    brandPrimary: formData.get("brandPrimary") || undefined,
    brandSecondary: formData.get("brandSecondary") || undefined,
    brandLogo: formData.get("brandLogo") || undefined,
    timezone: formData.get("timezone") || undefined,
    disclosureText: (formData.get("disclosureText") as string) ?? undefined,
    legalFooterHtml: (formData.get("legalFooterHtml") as string) ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Invalid input" };

  const before = await prisma.tenant.findUnique({ where: { id: tenantId } });
  const tenant = await prisma.tenant.update({ where: { id: tenantId }, data: parsed.data });
  await audit({ tenantId, actorUserId: user.id, action: "tenant.update", resourceType: "Tenant", resourceId: tenantId, before, after: tenant });
  revalidatePath(`/t/${tenant.slug}/settings`);
  return { ok: true };
}

export async function deleteTenantAction(tenantId: string) {
  const user = await requireUser();
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return { error: "Not found" };
  if (tenant.ownerUserId !== user.id && !user.isSuperAdmin) return { error: "Forbidden" };

  // Soft delete: archive
  await prisma.tenant.update({ where: { id: tenantId }, data: { status: "ARCHIVED" } });
  await audit({ tenantId, actorUserId: user.id, action: "tenant.archive", resourceType: "Tenant", resourceId: tenantId });
  await clearActiveTenant();
  redirect("/app");
}

export async function getUserTenants() {
  const user = await getCurrentUser();
  if (!user) return [];
  return prisma.tenant.findMany({
    where: {
      status: { not: "ARCHIVED" },
      memberships: { some: { userId: user.id } },
    },
    orderBy: { createdAt: "asc" },
  });
}
