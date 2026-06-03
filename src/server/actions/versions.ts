"use server";

import { revalidatePath } from "next/cache";
import { requireTenant, tenantDb } from "../tenant";
import { requirePermission } from "../permissions";
import { audit } from "../audit";

/**
 * Restore a page to a previous published version.
 *
 * Captures the CURRENT page state into a fresh PageVersion before restoring,
 * so the restore itself is reversible. Marks the restored page as DRAFT so
 * the operator can review before re-publishing.
 */
export async function restorePageVersionAction(versionId: string) {
  const ctx = await requireTenant();
  requirePermission(ctx.role, "page.publish");
  const db = tenantDb(ctx.tenant.id);

  const version = await db.pageVersion.findFirst({ where: { id: versionId } });
  if (!version) return { error: "Version not found" };

  const page = await db.page.findFirst({ where: { id: version.pageId } });
  if (!page) return { error: "Page not found" };

  // Snapshot the current state first so the restore is itself reversible
  await db.pageVersion.create({
    data: {
      tenantId: ctx.tenant.id,
      pageId: page.id,
      blocksJson: page.blocksJson,
      seoTitle: page.seoTitle,
      seoDescription: page.seoDescription,
      publishedBy: ctx.userId,
      note: `Snapshot before restoring version ${versionId.slice(0, 8)}`,
    },
  });

  await db.page.update({
    where: { id: page.id },
    data: {
      blocksJson: version.blocksJson,
      seoTitle: version.seoTitle,
      seoDescription: version.seoDescription,
      state: "DRAFT",  // require explicit re-publish after restore
    },
  });

  await audit({
    tenantId: ctx.tenant.id,
    actorUserId: ctx.userId,
    action: "page.version.restore",
    resourceType: "PageVersion",
    resourceId: versionId,
    after: { pageId: page.id, restoredFrom: versionId },
  });

  revalidatePath(`/t/${ctx.tenant.slug}/pages/${page.id}/edit`);
  revalidatePath(`/t/${ctx.tenant.slug}/pages/${page.id}/versions`);
  return { ok: true, pageId: page.id };
}
