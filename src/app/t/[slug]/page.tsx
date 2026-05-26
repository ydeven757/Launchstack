import Link from "next/link";
import { Stat } from "@/components/ui/stat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireTenant, tenantDb } from "@/server/tenant";
import { getDashboardStats } from "@/server/actions/analytics";
import { formatNumber, pct } from "@/lib/utils";
import { DashboardChart } from "@/components/dashboard-chart";

export default async function DashboardPage() {
  const ctx = await requireTenant();
  const db = tenantDb(ctx.tenant.id);
  const stats = await getDashboardStats(7);

  const [funnelCount, recentContacts] = await Promise.all([
    db.funnel.count(),
    db.contact.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{ctx.tenant.name}</h1>
          <p className="text-sm text-muted mt-1">Last 7 days · timezone {ctx.tenant.timezone}</p>
        </div>
        <Link href={`/t/${ctx.tenant.slug}/funnels`}>
          <Button>Open funnels</Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Visitors (7d)" value={formatNumber(stats.totalVisitors7d)} />
        <Stat label="Opt-ins (7d)" value={formatNumber(stats.totalFormSubmits7d)} />
        <Stat label="Opt-in rate" value={pct(stats.totalFormSubmits7d, stats.totalVisitors7d)} />
        <Stat label="Total contacts" value={formatNumber(stats.totalContacts)} hint={`+${stats.newContacts7d} this week`} />
      </div>

      <Card>
        <CardHeader><CardTitle>Visits vs opt-ins</CardTitle></CardHeader>
        <CardContent>
          <DashboardChart data={stats.daily} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Top pages</CardTitle></CardHeader>
          <CardContent>
            {stats.topPages.length === 0 ? (
              <EmptyState title="No page traffic yet" description="Publish a page and visit it to see data here." />
            ) : (
              <table className="w-full text-sm">
                <thead className="text-xs text-muted text-left">
                  <tr><th className="font-medium pb-2">Page</th><th className="font-medium pb-2 text-right">Visits</th><th className="font-medium pb-2 text-right">Opt-ins</th></tr>
                </thead>
                <tbody>
                  {stats.topPages.map((p) => (
                    <tr key={p.id} className="border-t border-border">
                      <td className="py-2 truncate max-w-[200px]">{p.name}</td>
                      <td className="py-2 text-right">{formatNumber(p.visits)}</td>
                      <td className="py-2 text-right">{formatNumber(p.submits)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent contacts</CardTitle></CardHeader>
          <CardContent>
            {recentContacts.length === 0 ? (
              <EmptyState title="No contacts yet" description="Capture leads via a form to populate your CRM." />
            ) : (
              <ul className="space-y-2">
                {recentContacts.map((c) => (
                  <li key={c.id} className="flex items-center justify-between text-sm">
                    <Link href={`/t/${ctx.tenant.slug}/contacts/${c.id}`} className="hover:underline truncate">{c.email}</Link>
                    <span className="text-xs text-muted">{new Date(c.createdAt).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Top traffic sources</CardTitle></CardHeader>
          <CardContent>
            {stats.topSources.length === 0 ? (
              <p className="text-sm text-muted">No source data yet.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {stats.topSources.map((s) => (
                  <li key={s.source} className="flex items-center justify-between border-t first:border-0 border-border py-1.5">
                    <span>{s.source}</span>
                    <span className="font-medium">{formatNumber(s.count)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Workspace summary</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex justify-between"><span className="text-muted">Funnels</span><span>{funnelCount}</span></div>
            <div className="flex justify-between"><span className="text-muted">Niche</span><span>{ctx.tenant.niche || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted">Traffic source</span><span>{ctx.tenant.trafficSource || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted">Plan</span><span>{ctx.tenant.plan}</span></div>
            <div className="flex justify-between"><span className="text-muted">Your role</span><span>{ctx.role}</span></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
