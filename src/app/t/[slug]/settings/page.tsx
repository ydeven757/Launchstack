import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { requireTenant } from "@/server/tenant";
import { updateTenantAction, deleteTenantAction } from "@/server/actions/tenants";
import { prisma } from "@/server/db";

export default async function SettingsPage() {
  const ctx = await requireTenant();
  async function update(fd: FormData) { "use server"; await updateTenantAction(ctx.tenant.id, fd); }
  async function del() { "use server"; await deleteTenantAction(ctx.tenant.id); }

  const members = await prisma.membership.findMany({
    where: { tenantId: ctx.tenant.id },
    include: { user: { select: { id: true, email: true, name: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted">Workspace, branding, members.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Workspace</CardTitle></CardHeader>
        <CardContent>
          <form action={update} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><Label>Name</Label><Input name="name" defaultValue={ctx.tenant.name} /></div>
              <div><Label>Timezone</Label><Input name="timezone" defaultValue={ctx.tenant.timezone} /></div>
              <div><Label>Brand primary</Label><Input name="brandPrimary" type="color" defaultValue={ctx.tenant.brandPrimary} className="h-9 w-20 p-0.5" /></div>
              <div><Label>Brand secondary</Label><Input name="brandSecondary" type="color" defaultValue={ctx.tenant.brandSecondary} className="h-9 w-20 p-0.5" /></div>
            </div>
            <Button type="submit">Save</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Compliance &amp; disclosure</CardTitle>
          <CardDescription>
            Shown as a banner above advertorial / review pages and in the footer of every public page.
            FTC + ASA require affiliate disclosure on monetized content.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={update} className="space-y-3">
            <div>
              <Label>Disclosure banner text</Label>
              <textarea name="disclosureText" defaultValue={ctx.tenant.disclosureText ?? ""}
                className="flex w-full rounded-md border border-border bg-card px-3 py-2 text-sm min-h-[80px]"
                placeholder="Advertorial. This page contains affiliate links — we may earn a commission at no extra cost to you." />
            </div>
            <div>
              <Label>Legal footer HTML</Label>
              <textarea name="legalFooterHtml" defaultValue={ctx.tenant.legalFooterHtml ?? ""}
                className="flex w-full rounded-md border border-border bg-card px-3 py-2 text-sm font-mono text-xs min-h-[100px]"
                placeholder="<p>&copy; 2026 [Brand]. <a href='/privacy'>Privacy</a> · <a href='/terms'>Terms</a></p>" />
            </div>
            <Button type="submit">Save compliance settings</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
          <CardDescription>Connect ClickBank and other affiliate networks.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href={`/t/${ctx.tenant.slug}/settings/integrations`}>
            <Button variant="outline">Open integrations →</Button>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>Per-workspace roles. Members can be added via the API in this MVP.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border">
            {members.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-2 text-sm">
                <span>{m.user.email}</span>
                <Badge variant="outline">{m.role}</Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-danger">Danger zone</CardTitle></CardHeader>
        <CardContent>
          <form action={del}>
            <Button type="submit" variant="danger">Archive workspace</Button>
          </form>
          <p className="text-xs text-muted mt-2">Archived workspaces are hidden but can be restored by support.</p>
        </CardContent>
      </Card>
    </div>
  );
}
