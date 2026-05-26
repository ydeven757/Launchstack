import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { requireTenant, tenantDb } from "@/server/tenant";
import { CreateFunnelForm } from "./create-funnel-form";
import { Workflow } from "lucide-react";

export default async function FunnelsPage() {
  const ctx = await requireTenant();
  const db = tenantDb(ctx.tenant.id);
  const funnels = await db.funnel.findMany({
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { pages: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Funnels</h1>
          <p className="text-sm text-muted">Sequences of pages a visitor moves through.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create a funnel</CardTitle>
          <CardDescription>Give it a name. You can rename and add pages afterwards.</CardDescription>
        </CardHeader>
        <CardContent>
          <CreateFunnelForm />
        </CardContent>
      </Card>

      {funnels.length === 0 ? (
        <EmptyState icon={<Workflow className="h-8 w-8" />} title="No funnels yet" description="Create your first funnel above, or apply a starter template." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {funnels.map((f) => (
            <Link key={f.id} href={`/t/${ctx.tenant.slug}/funnels/${f.id}`}>
              <Card className="hover:border-primary/40 transition-colors">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{f.name}</CardTitle>
                    <Badge variant={f.state === "PUBLISHED" ? "success" : "secondary"}>{f.state}</Badge>
                  </div>
                  <CardDescription>{f.description || `${f._count.pages} pages · /${f.slug}`}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted">Updated {new Date(f.updatedAt).toLocaleDateString()}</div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
