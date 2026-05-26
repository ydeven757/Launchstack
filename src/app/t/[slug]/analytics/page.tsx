import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Stat } from "@/components/ui/stat";
import { requireTenant, tenantDb } from "@/server/tenant";
import { getDashboardStats, getFunnelReport } from "@/server/actions/analytics";
import { DashboardChart } from "@/components/dashboard-chart";
import { formatNumber, pct } from "@/lib/utils";

export default async function AnalyticsPage() {
  const ctx = await requireTenant();
  const db = tenantDb(ctx.tenant.id);
  const stats = await getDashboardStats(30);

  const funnels = await db.funnel.findMany({ orderBy: { updatedAt: "desc" } });
  const reports = await Promise.all(funnels.map((f) => getFunnelReport(f.id).then((r) => ({ funnel: f, report: r }))));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="text-sm text-muted">Last 30 days · all data scoped to this workspace</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Visitors" value={formatNumber(stats.totalVisitors7d)} />
        <Stat label="Opt-ins" value={formatNumber(stats.totalFormSubmits7d)} />
        <Stat label="Opt-in rate" value={pct(stats.totalFormSubmits7d, stats.totalVisitors7d)} />
        <Stat label="New contacts" value={formatNumber(stats.newContacts7d)} />
      </div>

      <Card>
        <CardHeader><CardTitle>Traffic vs opt-ins</CardTitle></CardHeader>
        <CardContent><DashboardChart data={stats.daily} /></CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Funnel drop-off</h2>
        {reports.length === 0 ? (
          <Card><CardContent className="py-6 text-sm text-muted text-center">Create a funnel to see drop-off reporting.</CardContent></Card>
        ) : (
          reports.map(({ funnel, report }) => (
            <Card key={funnel.id}>
              <CardHeader><CardTitle className="text-base">{funnel.name}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {report.steps.length === 0 ? (
                  <p className="text-sm text-muted">No pages yet.</p>
                ) : report.steps.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-3">
                    <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center">{i + 1}</span>
                    <span className="flex-1 truncate text-sm">{s.name} <Badge variant="outline" className="ml-1">{s.type}</Badge></span>
                    <div className="text-xs text-muted text-right">
                      <div>{formatNumber(s.visits)} visits · {formatNumber(s.submits)} submits</div>
                      <div>conv {pct(s.submits, s.visits)} · drop {pct(Math.round(s.dropoff * 1000), 1000, 0)}</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
