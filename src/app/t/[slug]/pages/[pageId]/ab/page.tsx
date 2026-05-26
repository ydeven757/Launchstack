import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Stat } from "@/components/ui/stat";
import { requireTenant, tenantDb } from "@/server/tenant";
import { variantPerformance } from "@/server/services/ab";
import { ABControls, DeclareWinnerButton } from "./controls";
import { formatNumber, pct } from "@/lib/utils";

export default async function ABTestingPage({ params }: { params: { slug: string; pageId: string } }) {
  const { slug, pageId } = params;
  const ctx = await requireTenant();
  const db = tenantDb(ctx.tenant.id);
  const page = await db.page.findFirst({ where: { id: pageId } });
  if (!page) notFound();

  const variants = await db.pageVariant.findMany({ where: { pageId }, orderBy: { createdAt: "asc" } });
  const perf = await variantPerformance(pageId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/t/${slug}/pages/${pageId}/edit`} className="text-sm text-muted hover:text-fg">← Back to editor</Link>
          <h1 className="text-2xl font-semibold mt-2">A/B testing — {page.name}</h1>
          <p className="text-sm text-muted">Sticky split by visitor cookie. The same visitor always sees the same variant.</p>
        </div>
        <Badge variant={page.abEnabled ? "success" : "secondary"}>{page.abEnabled ? "Enabled" : "Disabled"}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Setup</CardTitle>
          <CardDescription>Enable A/B to seed a Control + Variation, then edit either independently.</CardDescription>
        </CardHeader>
        <CardContent>
          <ABControls pageId={pageId} enabled={page.abEnabled} variantCount={variants.length} />
        </CardContent>
      </Card>

      {variants.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Performance</h2>
          {perf.map((p) => (
            <Card key={p.variantId}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{p.name}</span>
                    {p.isControl && <Badge variant="outline">Control</Badge>}
                    <Badge variant="secondary">{p.weight}%</Badge>
                  </div>
                </div>
                <div className="hidden md:grid grid-cols-4 gap-6 text-sm text-right">
                  <div><div className="text-fg font-medium">{formatNumber(p.visits)}</div><div className="text-xs text-muted">visits</div></div>
                  <div><div className="text-fg font-medium">{formatNumber(p.submits)}</div><div className="text-xs text-muted">opt-ins</div></div>
                  <div><div className="text-fg font-medium">{pct(p.submits, p.visits)}</div><div className="text-xs text-muted">conv</div></div>
                  <div><div className="text-fg font-medium">${formatNumber(Math.round(p.revenue))}</div><div className="text-xs text-muted">revenue</div></div>
                </div>
                <DeclareWinnerButton variantId={p.variantId} disabled={!page.abEnabled} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {variants.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted">
            Enable A/B testing above to start splitting traffic.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
