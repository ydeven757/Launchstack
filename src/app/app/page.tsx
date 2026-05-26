import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getCurrentUser } from "@/server/auth";
import { getUserTenants } from "@/server/actions/tenants";
import { SetActiveTenantButton } from "@/components/set-active-tenant-button";

export default async function AppHome() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const tenants = await getUserTenants();

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold">Your workspaces</h1>
            <p className="text-sm text-muted mt-1">Each workspace is an independent site or brand.</p>
          </div>
          <Link href="/app/new"><Button>New workspace</Button></Link>
        </div>

        {tenants.length === 0 ? (
          <EmptyState
            title="No workspaces yet"
            description="Create your first workspace to start building funnels, capturing contacts, and shipping pages."
            action={<Link href="/app/new"><Button>Create workspace</Button></Link>}
          />
        ) : (
          <div className="grid gap-3">
            {tenants.map((t) => (
              <Card key={t.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="inline-block h-9 w-9 rounded-md" style={{ background: t.brandPrimary }} />
                      <div>
                        <CardTitle>{t.name}</CardTitle>
                        <CardDescription>{t.niche || "—"} · /{t.slug}</CardDescription>
                      </div>
                    </div>
                    <SetActiveTenantButton tenantId={t.id} tenantSlug={t.slug} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>Plan: {t.plan}</span>
                    <span>Status: {t.status}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {user.isSuperAdmin && (
          <div className="mt-12">
            <Link href="/admin"><Button variant="outline" size="sm">Open platform admin →</Button></Link>
          </div>
        )}
      </div>
    </div>
  );
}
