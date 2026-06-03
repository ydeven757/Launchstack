import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Stat } from "@/components/ui/stat";
import { requireTenant, tenantDb } from "@/server/tenant";
import { variantPerformance } from "@/server/services/ab";
import { ABControls, DeclareWinnerButton } from "./controls";
import { formatNumber, pct } from "@/lib/utils";
import { compareVariants } from "@/lib/stats";

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

          {/* Statistical significance — control vs each treatment */}
          {perf.length >= 2 && (() => {
            const control = perf.find((p) => p.isControl) ?? perf[0];
            const treatments = perf.filter((p) => p.variantId !== control.variantId);
            return (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Significance vs Control</CardTitle>
                  <CardDescription>Two-proportion z-test (95% confidence). Aim for ≥ 100 visits per variant before trusting the result.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {treatments.map((t) => {
                    const cmp = compareVariants(
                      { visits: control.visits, conversions: control.submits },
                      { visits: t.visits, conversions: t.submits },
                    );
                    const sigVariant = cmp.isSignificant ? (cmp.liftPct > 0 ? "success" : "danger") : "secondary";
                    const sigLabel = cmp.isSignificant
                      ? (cmp.liftPct > 0 ? `WINNER  +${(cmp.liftPct * 100).toFixed(1)}%` : `LOSER  ${(cmp.liftPct * 100).toFixed(1)}%`)
                      : "NOT YET SIGNIFICANT";
                    return (
                      <div key={t.variantId} className="flex items-center gap-3 text-sm border-t first:border-0 border-border py-2">
                        <span className="font-medium min-w-[160px] truncate">{t.name}</span>
                        <Badge variant={sigVariant}>{sigLabel}</Badge>
                        <div className="text-xs text-muted flex-1 flex flex-wrap gap-x-3 gap-y-0.5">
                          <span>p = <span className="font-mono">{cmp.pValue.toFixed(4)}</span></span>
                          <span>z = <span className="font-mono">{cmp.zScore.toFixed(2)}</span></span>
                          <span>95% CI on diff: <span className="font-mono">[{(cmp.ci95[0]*100).toFixed(2)}%, {(cmp.ci95[1]*100).toFixed(2)}%]</span></span>
                        </div>
                        {cmp.warning && <span className="text-xs text-warning">⚠ {cmp.warning}</span>}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })()}
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
