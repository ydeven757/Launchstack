import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { requireTenant, tenantDb } from "@/server/tenant";
import { updateContactAction, deleteContactAction } from "@/server/actions/contacts";
import { TagAssign } from "./tag-assign";
import { DeleteContactButton } from "./delete-button";
import { PrivacyActions } from "./privacy-actions";

export default async function ContactDetail({ params }: { params: { slug: string; contactId: string } }) {
  const { slug, contactId } = params;
  const ctx = await requireTenant();
  const db = tenantDb(ctx.tenant.id);

  const contact = await db.contact.findFirst({
    where: { id: contactId },
    include: { contactTags: { include: { tag: true } }, activities: { orderBy: { createdAt: "desc" }, take: 50 } },
  });
  if (!contact) notFound();
  const tags = await db.tag.findMany({ orderBy: { name: "asc" } });

  async function update(fd: FormData) { "use server"; await updateContactAction(contactId, fd); }
  async function del() { "use server"; await deleteContactAction(contactId); }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/t/${slug}/contacts`} className="text-sm text-muted hover:text-fg">← All contacts</Link>
          <h1 className="text-2xl font-semibold mt-2">{contact.email}</h1>
        </div>
        <div className="flex flex-col gap-2 items-end">
          <DeleteContactButton action={del} />
          <PrivacyActions contactId={contactId} contactEmail={contact.email} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
          <CardContent>
            <form action={update} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div><Label>First name</Label><Input name="firstName" defaultValue={contact.firstName ?? ""} /></div>
                <div><Label>Last name</Label><Input name="lastName" defaultValue={contact.lastName ?? ""} /></div>
                <div><Label>Phone</Label><Input name="phone" defaultValue={contact.phone ?? ""} /></div>
                <div>
                  <Label>Status</Label>
                  <Select name="status" defaultValue={contact.status}>
                    <option value="LEAD">Lead</option><option value="ENGAGED">Engaged</option>
                    <option value="CUSTOMER">Customer</option><option value="UNSUBSCRIBED">Unsubscribed</option><option value="BOUNCED">Bounced</option>
                  </Select>
                </div>
                <div className="col-span-2"><Label>Notes</Label><Textarea name="notes" defaultValue={contact.notes ?? ""} rows={3} /></div>
              </div>
              <Button type="submit" size="sm">Save profile</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Tags</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {contact.contactTags.map((ct) => (
                <Badge key={ct.tagId} style={{ background: `${ct.tag.color}22`, borderColor: `${ct.tag.color}44`, color: ct.tag.color }} variant="outline">{ct.tag.name}</Badge>
              ))}
              {contact.contactTags.length === 0 && <span className="text-xs text-muted">No tags yet</span>}
            </div>
            <TagAssign
              contactId={contactId}
              allTags={tags.map((t) => ({ id: t.id, name: t.name, color: t.color }))}
              assignedTagIds={contact.contactTags.map((ct) => ct.tagId)}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Activity</CardTitle></CardHeader>
        <CardContent>
          {contact.activities.length === 0 ? (
            <p className="text-sm text-muted">No activity yet.</p>
          ) : (
            <ol className="space-y-2">
              {contact.activities.map((a) => (
                <li key={a.id} className="flex items-center gap-3 text-sm border-l-2 border-border pl-3">
                  <Badge variant="outline" className="capitalize">{a.type.replace(/_/g, " ")}</Badge>
                  <span className="flex-1 text-muted truncate">{a.payload && a.payload !== "{}" ? a.payload : ""}</span>
                  <span className="text-xs text-muted">{new Date(a.createdAt).toLocaleString()}</span>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
