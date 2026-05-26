import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { requireTenant, tenantDb } from "@/server/tenant";
import { CreateContactForm, CreateTagForm } from "./forms";

export default async function ContactsPage() {
  const ctx = await requireTenant();
  const db = tenantDb(ctx.tenant.id);

  const [contacts, tags] = await Promise.all([
    db.contact.findMany({
      orderBy: { createdAt: "desc" },
      include: { contactTags: { include: { tag: true } } },
      take: 100,
    }),
    db.tag.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Contacts</h1>
        <p className="text-sm text-muted">{contacts.length} contact{contacts.length === 1 ? "" : "s"} in this workspace</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Add contact</CardTitle><CardDescription>Manually add a single contact.</CardDescription></CardHeader>
          <CardContent><CreateContactForm /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Tags</CardTitle><CardDescription>{tags.length} tag{tags.length === 1 ? "" : "s"} defined.</CardDescription></CardHeader>
          <CardContent>
            <CreateTagForm />
            <div className="flex flex-wrap gap-1.5 mt-3">
              {tags.map((t) => (
                <Badge key={t.id} style={{ background: `${t.color}22`, borderColor: `${t.color}44`, color: t.color }} variant="outline">{t.name}</Badge>
              ))}
              {tags.length === 0 && <span className="text-xs text-muted">No tags yet</span>}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>All contacts</CardTitle></CardHeader>
        <CardContent className="p-0">
          {contacts.length === 0 ? (
            <EmptyState title="No contacts yet" description="Publish a page with a form, or add a contact manually." />
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs text-muted text-left bg-bg/50">
                <tr>
                  <th className="font-medium px-4 py-2.5">Email</th>
                  <th className="font-medium px-4 py-2.5">Name</th>
                  <th className="font-medium px-4 py-2.5">Status</th>
                  <th className="font-medium px-4 py-2.5">Tags</th>
                  <th className="font-medium px-4 py-2.5">Added</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr key={c.id} className="border-t border-border hover:bg-bg/30">
                    <td className="px-4 py-2.5">
                      <Link href={`/t/${ctx.tenant.slug}/contacts/${c.id}`} className="text-primary hover:underline">{c.email}</Link>
                    </td>
                    <td className="px-4 py-2.5">{[c.firstName, c.lastName].filter(Boolean).join(" ") || "—"}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant={c.status === "CUSTOMER" ? "success" : c.status === "UNSUBSCRIBED" || c.status === "BOUNCED" ? "danger" : "secondary"}>{c.status}</Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {c.contactTags.map((ct) => (
                          <Badge key={ct.tagId} style={{ background: `${ct.tag.color}22`, borderColor: `${ct.tag.color}44`, color: ct.tag.color }} variant="outline">{ct.tag.name}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted">{new Date(c.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
