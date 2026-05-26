import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireTenant, tenantDb } from "@/server/tenant";
import { getFunnelReport } from "@/server/actions/analytics";
import { CreatePageForm } from "./create-page-form";
import { PublishFunnelButton, DeleteFunnelButton } from "./funnel-actions";
import { CloneFunnelButton } from "./clone-button";
import { formatNumber, pct } from "@/lib/utils";
import { prisma } from "@/server/db";

export default async function FunnelDetailPage({ params }: { params: { slug: string; funnelId: string } }) {
  const { slug, funnelId } = params;
  const ctx = await requireTenant();
  const db = tenantDb(ctx.tenant.id);

  const funnel = await db.funnel.findFirst({ where: { id: funnelId } });
  if (!funnel) notFound();

  const pages = await db.page.findMany({ where: { funnelId }, orderBy: { position: "asc" } });
  const report = await getFunnelReport(funnelId);

  // For the cross-tenant cloner: load the other workspaces this user is a member of
  const allTenants = await prisma.tenant.findMany({
    where: {
      status: { not: "ARCHIVED" },
      memberships: { some: { userId: ctx.userId } },
    },
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href={`/t/${slug}/funnels`} className="text-sm text-muted hover:text-fg">← All funnels</Link>
          <h1 className="text-2xl font-semibold mt-2">{funnel.name}</h1>
          <p className="text-sm text-muted mt-1">/{funnel.slug} · {pages.length} pages</p>
        </div>
        <div className="flex gap-2 items-center">
          <Badge variant={funnel.state === "PUBLISHED" ? "success" : "secondary"}>{funnel.state}</Badge>
          <CloneFunnelButton funnelId={funnelId} sourceTenantId={ctx.tenant.id} allTenants={allTenants} />
          <PublishFunnelButton funnelId={funnelId} />
          <DeleteFunnelButton funnelId={funnelId} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add a page</CardTitle>
          <CardDescription>Choose a page type. We&apos;ll add it to the end of the funnel.</CardDescription>
        </CardHeader>
        <CardContent>
          <CreatePageForm funnelId={funnelId} />
        </CardContent>
      </Card>

      {pages.length === 0 ? (
        <EmptyState title="No pages in this funnel" description="Add an opt-in page above to get started." />
      ) : (
        <div className="space-y-2">
          {pages.map((p, idx) => {
            const step = report.steps.find((s) => s.id === p.id);
            return (
              <Card key={p.id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-8 w-8 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{p.name}</span>
                      <Badge variant="outline">{p.type}</Badge>
                      <Badge variant={p.state === "PUBLISHED" ? "success" : "secondary"}>{p.state}</Badge>
                    </div>
                    <div className="text-xs text-muted mt-1">/p/{ctx.tenant.slug}/{p.slug}</div>
                  </div>
                  {step && (
                    <div className="hidden md:flex gap-6 text-xs text-muted">
                      <div className="text-right"><div className="text-fg font-medium">{formatNumber(step.visits)}</div>visits</div>
                      <div className="text-right"><div className="text-fg font-medium">{formatNumber(step.submits)}</div>submits</div>
                      <div className="text-right"><div className="text-fg font-medium">{pct(step.submits, step.visits)}</div>conv</div>
                    </div>
                  )}
                  <Link href={`/t/${slug}/pages/${p.id}/edit`}>
                    <Button variant="outline" size="sm">Edit</Button>
                  </Link>
                  {p.state === "PUBLISHED" && (
                    <a href={`/p/${ctx.tenant.slug}/${p.slug}`} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="sm">View →</Button>
                    </a>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
