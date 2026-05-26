import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { requireTenant, tenantDb } from "@/server/tenant";
import { addDomainAction } from "@/server/actions/domains";
import { VerifyDomainButton, DeleteDomainButton } from "./domain-actions";

export default async function DomainsPage() {
  const ctx = await requireTenant();
  const db = tenantDb(ctx.tenant.id);
  const domains = await db.domain.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Domains</h1>
        <p className="text-sm text-muted">
          System URL: <code className="text-fg">{ctx.tenant.slug}.{process.env.APP_BASE_DOMAIN ?? "launchstack.app"}</code>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add a custom domain</CardTitle>
          <CardDescription>Point a CNAME at <code>cname.launchstack.app</code> then click verify.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={async (fd) => { "use server"; await addDomainAction(fd); }} className="flex gap-2 items-end">
            <div className="flex-1"><Label>Hostname</Label><Input name="hostname" placeholder="www.yoursite.com" required /></div>
            <div className="flex items-center gap-2 mb-1">
              <input id="isPrimary" name="isPrimary" type="checkbox" />
              <Label htmlFor="isPrimary" className="mb-0">Primary</Label>
            </div>
            <Button type="submit">Add</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Connected domains</CardTitle></CardHeader>
        <CardContent>
          {domains.length === 0 ? (
            <EmptyState title="No custom domains" description="Your pages are still reachable via the system subdomain." />
          ) : (
            <ul className="divide-y divide-border">
              {domains.map((d) => (
                <li key={d.id} className="flex items-center gap-3 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{d.hostname}</span>
                      {d.isPrimary && <Badge variant="default">Primary</Badge>}
                      <Badge variant={d.status === "VERIFIED" ? "success" : d.status === "FAILED" ? "danger" : "warning"}>{d.status}</Badge>
                    </div>
                    <div className="text-xs text-muted mt-0.5">Token: <code>{d.verifyToken}</code></div>
                  </div>
                  {d.status !== "VERIFIED" && <VerifyDomainButton domainId={d.id} />}
                  <DeleteDomainButton domainId={d.id} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
