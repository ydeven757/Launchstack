"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTenant, tenantDb } from "../tenant";
import { requirePermission } from "../permissions";
import { audit } from "../audit";
import { createPageSchema, updatePageSchema } from "@/lib/validators";
import { slugify } from "@/lib/utils";

async function uniquePageSlug(tenantId: string, base: string): Promise<string> {
  const db = tenantDb(tenantId);
  let slug = slugify(base) || "page";
  let n = 1;
  while (await db.page.findFirst({ where: { slug } })) {
    n += 1;
    slug = `${slugify(base)}-${n}`;
  }
  return slug;
}

const STARTER_BLOCKS: Record<string, unknown[]> = {
  OPT_IN: [
    { id: "h1", type: "hero", props: { headline: "Your Headline Here", subhead: "A clear value statement that promises the next step.", align: "center" } },
    { id: "f1", type: "form", props: { fields: ["email"], submitLabel: "Get Instant Access", placeholder: "Enter your email" } },
    { id: "t1", type: "text", props: { body: "We respect your privacy. Unsubscribe at any time." } },
  ],
  BRIDGE: [
    { id: "h1", type: "hero", props: { headline: "Quick — read this before you continue", subhead: "Set up the offer in a single paragraph here.", align: "left" } },
    { id: "t1", type: "text", props: { body: "Explain why the visitor should click the next button. Bridge pages should be short and punchy." } },
    { id: "c1", type: "cta", props: { label: "Continue →", href: "#", style: "primary" } },
  ],
  THANK_YOU: [
    { id: "h1", type: "hero", props: { headline: "You're in.", subhead: "Check your inbox in the next few minutes.", align: "center" } },
    { id: "t1", type: "text", props: { body: "While you wait, take a look at this recommendation." } },
    { id: "c1", type: "cta", props: { label: "See the recommended offer", href: "#", style: "primary" } },
  ],
  ADVERTORIAL: [
    { id: "h1", type: "hero", props: { headline: "How [Specific Person] [Got Specific Result]", subhead: "An advertorial-style story headline.", align: "left" } },
    { id: "t1", type: "text", props: { body: "Open with a relatable story. 3-5 short paragraphs that lead to the offer." } },
    { id: "c1", type: "cta", props: { label: "Learn more →", href: "#", style: "primary" } },
  ],
  REVIEW: [
    { id: "h1", type: "hero", props: { headline: "[Product] Review — Is it worth it?", subhead: "Honest review structured for SEO + conversion.", align: "left" } },
    { id: "t1", type: "text", props: { body: "Pros, cons, who it's for, who it's not for." } },
    { id: "c1", type: "cta", props: { label: "Check the offer", href: "#", style: "primary" } },
  ],
  HOME: [
    { id: "h1", type: "hero", props: { headline: "Welcome to [Brand]", subhead: "What you do, for whom, and what to do next.", align: "center" } },
    { id: "c1", type: "cta", props: { label: "Browse the blog", href: "#", style: "primary" } },
  ],
  BLOG_POST: [
    { id: "h1", type: "hero", props: { headline: "Post title", subhead: "Author • date", align: "left" } },
    { id: "t1", type: "text", props: { body: "Write the post body here." } },
  ],
  CONFIRMATION: [
    { id: "h1", type: "hero", props: { headline: "Confirm your email", subhead: "We sent a link to your inbox.", align: "center" } },
  ],
  CUSTOM: [
    { id: "h1", type: "hero", props: { headline: "New page", subhead: "Start editing →", align: "center" } },
  ],
};

export async function createPageAction(formData: FormData) {
  const ctx = await requireTenant();
  requirePermission(ctx.role, "page.create");
  const parsed = createPageSchema.safeParse({
    funnelId: formData.get("funnelId") || null,
    type: formData.get("type"),
    name: formData.get("name"),
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Invalid input" };

  const db = tenantDb(ctx.tenant.id);
  const slug = await uniquePageSlug(ctx.tenant.id, parsed.data.name);
  const blocks = STARTER_BLOCKS[parsed.data.type] ?? STARTER_BLOCKS.CUSTOM;

  const position = parsed.data.funnelId
    ? await db.page.count({ where: { funnelId: parsed.data.funnelId } })
    : 0;

  const page = await db.page.create({
    data: {
      tenantId: ctx.tenant.id,
      funnelId: parsed.data.funnelId ?? null,
      type: parsed.data.type,
      name: parsed.data.name,
      slug,
      blocksJson: JSON.stringify(blocks),
      position,
    },
  });

  await audit({ tenantId: ctx.tenant.id, actorUserId: ctx.userId, action: "page.create", resourceType: "Page", resourceId: page.id, after: { name: page.name, type: page.type } });
  revalidatePath(`/t/${ctx.tenant.slug}/funnels`);
  redirect(`/t/${ctx.tenant.slug}/pages/${page.id}/edit`);
}

export async function updatePageAction(input: {
  pageId: string;
  name?: string;
  slug?: string;
  blocks?: unknown[];
  seoTitle?: string | null;
  seoDescription?: string | null;
}) {
  const ctx = await requireTenant();
  requirePermission(ctx.role, "page.update");
  const parsed = updatePageSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Invalid input" };

  const db = tenantDb(ctx.tenant.id);
  const before = await db.page.findFirst({ where: { id: parsed.data.pageId } });
  if (!before) return { error: "Page not found" };

  const after = await db.page.update({
    where: { id: parsed.data.pageId },
    data: {
      name: parsed.data.name ?? before.name,
      slug: parsed.data.slug ? (await uniquePageSlug(ctx.tenant.id, parsed.data.slug)) : before.slug,
      blocksJson: parsed.data.blocks ? JSON.stringify(parsed.data.blocks) : before.blocksJson,
      seoTitle: parsed.data.seoTitle ?? before.seoTitle,
      seoDescription: parsed.data.seoDescription ?? before.seoDescription,
      state: "DRAFT", // editing reverts to draft until republish
    },
  });

  await audit({ tenantId: ctx.tenant.id, actorUserId: ctx.userId, action: "page.update", resourceType: "Page", resourceId: parsed.data.pageId });
  revalidatePath(`/t/${ctx.tenant.slug}/pages/${parsed.data.pageId}/edit`);
  return { ok: true, page: after };
}

export async function publishPageAction(pageId: string) {
  const ctx = await requireTenant();
  requirePermission(ctx.role, "page.publish");
  const db = tenantDb(ctx.tenant.id);
  const page = await db.page.findFirst({ where: { id: pageId } });
  if (!page) return { error: "Page not found" };

  // Snapshot the version we're about to publish for rollback history
  await db.pageVersion.create({
    data: {
      tenantId: ctx.tenant.id,
      pageId,
      blocksJson: page.blocksJson,
      seoTitle: page.seoTitle,
      seoDescription: page.seoDescription,
      publishedBy: ctx.userId,
    },
  });

  await db.page.update({ where: { id: pageId }, data: { state: "PUBLISHED", publishedAt: new Date(), publishedBlocks: page.blocksJson } });
  await audit({ tenantId: ctx.tenant.id, actorUserId: ctx.userId, action: "page.publish", resourceType: "Page", resourceId: pageId });
  revalidatePath(`/t/${ctx.tenant.slug}/pages/${pageId}/edit`);
  return { ok: true };
}

export async function unpublishPageAction(pageId: string) {
  const ctx = await requireTenant();
  requirePermission(ctx.role, "page.publish");
  const db = tenantDb(ctx.tenant.id);
  await db.page.update({ where: { id: pageId }, data: { state: "DRAFT" } });
  await audit({ tenantId: ctx.tenant.id, actorUserId: ctx.userId, action: "page.unpublish", resourceType: "Page", resourceId: pageId });
  revalidatePath(`/t/${ctx.tenant.slug}/pages/${pageId}/edit`);
  return { ok: true };
}

export async function deletePageAction(pageId: string) {
  const ctx = await requireTenant();
  requirePermission(ctx.role, "page.delete");
  const db = tenantDb(ctx.tenant.id);
  const before = await db.page.findFirst({ where: { id: pageId } });
  if (!before) return { error: "Not found" };
  await db.page.delete({ where: { id: pageId } });
  await audit({ tenantId: ctx.tenant.id, actorUserId: ctx.userId, action: "page.delete", resourceType: "Page", resourceId: pageId, before });
  revalidatePath(`/t/${ctx.tenant.slug}/funnels`);
  return { ok: true };
}

export async function duplicatePageAction(pageId: string) {
  const ctx = await requireTenant();
  requirePermission(ctx.role, "page.create");
  const db = tenantDb(ctx.tenant.id);
  const src = await db.page.findFirst({ where: { id: pageId } });
  if (!src) return { error: "Not found" };
  const slug = await uniquePageSlug(ctx.tenant.id, `${src.name} copy`);
  const copy = await db.page.create({
    data: {
      tenantId: ctx.tenant.id,
      funnelId: src.funnelId,
      type: src.type,
      name: `${src.name} (copy)`,
      slug,
      blocksJson: src.blocksJson,
      seoTitle: src.seoTitle,
      seoDescription: src.seoDescription,
      position: src.position + 1,
    },
  });
  await audit({ tenantId: ctx.tenant.id, actorUserId: ctx.userId, action: "page.duplicate", resourceType: "Page", resourceId: copy.id });
  revalidatePath(`/t/${ctx.tenant.slug}/funnels`);
  return { ok: true, pageId: copy.id };
}
