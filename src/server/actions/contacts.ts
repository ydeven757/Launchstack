"use server";

import { revalidatePath } from "next/cache";
import { requireTenant, tenantDb } from "../tenant";
import { requirePermission } from "../permissions";
import { audit } from "../audit";
import { contactSchema } from "@/lib/validators";

export async function createContactAction(formData: FormData) {
  const ctx = await requireTenant();
  requirePermission(ctx.role, "contact.create");
  const parsed = contactSchema.safeParse({
    email: formData.get("email"),
    firstName: formData.get("firstName") || null,
    lastName: formData.get("lastName") || null,
    phone: formData.get("phone") || null,
    status: formData.get("status") || "LEAD",
    notes: formData.get("notes") || null,
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Invalid input" };

  const db = tenantDb(ctx.tenant.id);
  const existing = await db.contact.findFirst({ where: { email: parsed.data.email } });
  if (existing) return { error: "Contact already exists for that email." };

  const contact = await db.contact.create({
    data: {
      tenantId: ctx.tenant.id,
      email: parsed.data.email,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      phone: parsed.data.phone,
      status: parsed.data.status ?? "LEAD",
      notes: parsed.data.notes,
    },
  });
  await audit({ tenantId: ctx.tenant.id, actorUserId: ctx.userId, action: "contact.create", resourceType: "Contact", resourceId: contact.id });
  revalidatePath(`/t/${ctx.tenant.slug}/contacts`);
  return { ok: true, contactId: contact.id };
}

export async function updateContactAction(contactId: string, formData: FormData) {
  const ctx = await requireTenant();
  requirePermission(ctx.role, "contact.update");
  const db = tenantDb(ctx.tenant.id);
  const before = await db.contact.findFirst({ where: { id: contactId } });
  if (!before) return { error: "Not found" };
  await db.contact.update({
    where: { id: contactId },
    data: {
      firstName: (formData.get("firstName") as string) || null,
      lastName: (formData.get("lastName") as string) || null,
      phone: (formData.get("phone") as string) || null,
      status: (formData.get("status") as "LEAD"|"ENGAGED"|"CUSTOMER"|"UNSUBSCRIBED"|"BOUNCED") || before.status,
      notes: (formData.get("notes") as string) || null,
    },
  });
  await audit({ tenantId: ctx.tenant.id, actorUserId: ctx.userId, action: "contact.update", resourceType: "Contact", resourceId: contactId });
  revalidatePath(`/t/${ctx.tenant.slug}/contacts/${contactId}`);
  return { ok: true };
}

export async function deleteContactAction(contactId: string) {
  const ctx = await requireTenant();
  requirePermission(ctx.role, "contact.delete");
  const db = tenantDb(ctx.tenant.id);
  await db.contact.delete({ where: { id: contactId } });
  await audit({ tenantId: ctx.tenant.id, actorUserId: ctx.userId, action: "contact.delete", resourceType: "Contact", resourceId: contactId });
  revalidatePath(`/t/${ctx.tenant.slug}/contacts`);
  return { ok: true };
}

export async function addTagAction(contactId: string, tagId: string) {
  const ctx = await requireTenant();
  requirePermission(ctx.role, "tag.manage");
  const db = tenantDb(ctx.tenant.id);
  await db.contactTag.upsert({
    where: { contactId_tagId: { contactId, tagId } },
    create: { tenantId: ctx.tenant.id, contactId, tagId },
    update: {},
  });
  await db.activity.create({ data: { tenantId: ctx.tenant.id, contactId, type: "tag_added", payload: JSON.stringify({ tagId }) } });
  revalidatePath(`/t/${ctx.tenant.slug}/contacts/${contactId}`);
  return { ok: true };
}

export async function removeTagAction(contactId: string, tagId: string) {
  const ctx = await requireTenant();
  requirePermission(ctx.role, "tag.manage");
  const db = tenantDb(ctx.tenant.id);
  await db.contactTag.deleteMany({ where: { contactId, tagId } });
  revalidatePath(`/t/${ctx.tenant.slug}/contacts/${contactId}`);
  return { ok: true };
}

export async function createTagAction(formData: FormData) {
  const ctx = await requireTenant();
  requirePermission(ctx.role, "tag.manage");
  const name = String(formData.get("name") || "").trim();
  const color = String(formData.get("color") || "#64748b");
  if (!name) return { error: "Name required" };
  const db = tenantDb(ctx.tenant.id);
  const existing = await db.tag.findFirst({ where: { name } });
  if (existing) return { error: "Tag with that name already exists" };
  const tag = await db.tag.create({ data: { tenantId: ctx.tenant.id, name, color } });
  await audit({ tenantId: ctx.tenant.id, actorUserId: ctx.userId, action: "tag.create", resourceType: "Tag", resourceId: tag.id });
  revalidatePath(`/t/${ctx.tenant.slug}/contacts`);
  return { ok: true };
}
