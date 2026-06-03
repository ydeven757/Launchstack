"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireTenant, tenantDb } from "../tenant";
import { requirePermission } from "../permissions";
import { audit } from "../audit";

function hashEmail(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

/**
 * DSAR (Data Subject Access Request) — gather all data we hold on this contact
 * and return it as a JSON payload the operator can deliver to the subject.
 *
 * Covers: Contact profile, all Activity entries, all Events tied to the contact,
 * all EmailMessages sent to them, and any tag assignments. Visitor rows are
 * included if a visitor → contact stitch exists.
 */
export async function exportContactDataAction(contactId: string) {
  const ctx = await requireTenant();
  requirePermission(ctx.role, "contact.export");
  const db = tenantDb(ctx.tenant.id);

  const contact = await db.contact.findFirst({
    where: { id: contactId },
    include: {
      contactTags: { include: { tag: true } },
      activities: { orderBy: { createdAt: "asc" } },
      emailDeliveries: { include: { campaign: { select: { id: true, name: true, subject: true } } } },
    },
  });
  if (!contact) return { error: "Contact not found" };

  const [events, emailMessages, visitors] = await Promise.all([
    db.event.findMany({ where: { contactId }, orderBy: { createdAt: "asc" } }),
    db.emailMessage.findMany({ where: { contactId }, orderBy: { createdAt: "asc" } }),
    // Visitors are tied via contactId after stitch
    (await import("../db")).prisma.visitor.findMany({ where: { contactId, tenantId: ctx.tenant.id } }),
  ]);

  const payload = {
    generatedAt: new Date().toISOString(),
    tenant: { id: ctx.tenant.id, slug: ctx.tenant.slug, name: ctx.tenant.name },
    subject: {
      contactId: contact.id,
      email: contact.email,
      firstName: contact.firstName,
      lastName: contact.lastName,
      phone: contact.phone,
      status: contact.status,
      customFields: contact.customFields,
      notes: contact.notes,
      tags: contact.contactTags.map((ct) => ct.tag.name),
      source: {
        pageId: contact.sourcePageId,
        funnelId: contact.sourceFunnelId,
        utmSource: contact.utmSource,
        utmMedium: contact.utmMedium,
        utmCampaign: contact.utmCampaign,
      },
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
    },
    activities: contact.activities,
    events,
    emailDeliveries: contact.emailDeliveries,
    emailMessages,
    visitors,
  };

  await audit({
    tenantId: ctx.tenant.id, actorUserId: ctx.userId,
    action: "privacy.export", resourceType: "Contact", resourceId: contactId,
    after: { sizeBytes: JSON.stringify(payload).length },
  });

  return { ok: true, payload };
}

/**
 * Right-to-erasure — hard-delete the contact + all tied data, then add a
 * Suppression row keyed on the SHA-256 hash of the email so re-submission
 * (e.g. via a public form) does NOT silently re-create the contact.
 *
 * What's deleted:
 *   - Contact row (cascade → ContactTag, Activity, EmailDelivery, Visitor.contactId nullified)
 *   - EmailMessage rows tied to this contact (we keep the campaign aggregate)
 *   - Event rows tied to this contact (the visitor/visit count stays aggregated;
 *     individual rows are removed because they're personal data)
 *
 * What's kept:
 *   - Aggregate campaign counters (delivered / opens / clicks)
 *   - Audit log of the erasure itself
 *   - Tenant-level analytics counts (no PII)
 *   - Suppression row (email hash only, no plaintext)
 */
export async function eraseContactAction(contactId: string) {
  const ctx = await requireTenant();
  requirePermission(ctx.role, "contact.delete");
  const db = tenantDb(ctx.tenant.id);

  const contact = await db.contact.findFirst({ where: { id: contactId } });
  if (!contact) return { error: "Contact not found" };

  const emailHash = hashEmail(contact.email);

  // Run as a transaction so partial deletion can't leave orphans
  const { prisma } = await import("../db");
  await prisma.$transaction(async (tx) => {
    // Detach visitor stitching (keeps anonymous visitor history intact)
    await tx.visitor.updateMany({
      where: { contactId, tenantId: ctx.tenant.id },
      data: { contactId: null },
    });
    // Personal-data event rows
    await tx.event.deleteMany({ where: { contactId, tenantId: ctx.tenant.id } });
    // Email messages to this contact
    await tx.emailMessage.deleteMany({ where: { contactId, tenantId: ctx.tenant.id } });
    // The contact itself — cascades to ContactTag, Activity, EmailDelivery
    await tx.contact.delete({ where: { id: contactId } });
    // Suppression entry (idempotent via the @@unique)
    await tx.suppression.upsert({
      where: { tenantId_emailHash: { tenantId: ctx.tenant.id, emailHash } },
      create: { tenantId: ctx.tenant.id, emailHash, reason: "erasure" },
      update: {},
    });
  });

  await audit({
    tenantId: ctx.tenant.id, actorUserId: ctx.userId,
    action: "privacy.erase", resourceType: "Contact", resourceId: contactId,
    after: { emailHash, suppressed: true },
  });

  revalidatePath(`/t/${ctx.tenant.slug}/contacts`);
  return { ok: true, emailHash };
}

/** Helper for the form-submit pipeline — returns true if the email is suppressed. */
export async function isSuppressed(tenantId: string, email: string): Promise<boolean> {
  const { prisma } = await import("../db");
  const row = await prisma.suppression.findUnique({
    where: { tenantId_emailHash: { tenantId, emailHash: hashEmail(email) } },
  });
  return row !== null;
}
