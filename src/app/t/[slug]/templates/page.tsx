import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/server/db";
import { requireTenant, tenantDb } from "@/server/tenant";
import { ApplyTemplateButton } from "./apply-button";

export default async function TemplatesPage() {
  const ctx = await requireTenant();
  const db = tenantDb(ctx.tenant.id);

  const [builtIns, custom] = await Promise.all([
    prisma.template.findMany({ where: { isBuiltIn: true }, orderBy: { name: "asc" } }),
    db.template.findMany({ where: { isBuiltIn: false }, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Template library</h1>
        <p className="text-sm text-muted">Pre-built starter funnels. Apply one to seed a new funnel in this workspace.</p>
      </div>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted mb-3">Built-in templates</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {builtIns.map((t) => (
            <Card key={t.id}>
              <CardHeader>
                <CardTitle className="text-base">{t.name}</CardTitle>
                <CardDescription>{t.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {t.niche && <Badge variant="outline">{t.niche}</Badge>}
                  {t.trafficSource && <Badge variant="outline">{t.trafficSource}</Badge>}
                  {t.funnelType && <Badge variant="outline">{t.funnelType}</Badge>}
                </div>
                <ApplyTemplateButton templateId={t.id} />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted mb-3">Your saved templates</h2>
        {custom.length === 0 ? (
          <Card><CardContent className="py-8 text-sm text-muted text-center">You haven&apos;t saved any templates yet. Build a funnel and use &quot;Save as template&quot;.</CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {custom.map((t) => (
              <Card key={t.id}>
                <CardHeader>
                  <CardTitle className="text-base">{t.name}</CardTitle>
                  <CardDescription>{t.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button size="sm" variant="outline" disabled>Apply (coming)</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
