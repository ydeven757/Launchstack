import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { requireTenant, tenantDb } from "@/server/tenant";
import { formatNumber, pct } from "@/lib/utils";

export default async function EmailsPage() {
  const ctx = await requireTenant();
  const db = tenantDb(ctx.tenant.id);
  const campaigns = await db.campaign.findMany({ orderBy: { createdAt: "desc" } });
  const recentMessages = await db.emailMessage.findMany({ orderBy: { createdAt: "desc" }, take: 10 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Email broadcasts</h1>
          <p className="text-sm text-muted">{campaigns.length} campaign{campaigns.length === 1 ? "" : "s"}</p>
        </div>
        <Link href={`/t/${ctx.tenant.slug}/emails/new`}><Button>New campaign</Button></Link>
      </div>

      <Card>
        <CardHeader><CardTitle>Campaigns</CardTitle></CardHeader>
        <CardContent className="p-0">
          {campaigns.length === 0 ? (
            <EmptyState title="No campaigns yet" description="Compose your first broadcast to a tag segment." />
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs text-muted text-left bg-bg/50">
                <tr>
                  <th className="font-medium px-4 py-2.5">Name</th>
                  <th className="font-medium px-4 py-2.5">Subject</th>
                  <th className="font-medium px-4 py-2.5">Status</th>
                  <th className="font-medium px-4 py-2.5 text-right">Sent</th>
                  <th className="font-medium px-4 py-2.5 text-right">Opens</th>
                  <th className="font-medium px-4 py-2.5 text-right">Clicks</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id} className="border-t border-border">
                    <td className="px-4 py-2.5">
                      <Link href={`/t/${ctx.tenant.slug}/emails/${c.id}`} className="text-primary hover:underline">{c.name}</Link>
                    </td>
                    <td className="px-4 py-2.5 truncate max-w-[260px]">{c.subject}</td>
                    <td className="px-4 py-2.5"><Badge variant={c.status === "SENT" ? "success" : c.status === "FAILED" ? "danger" : "secondary"}>{c.status}</Badge></td>
                    <td className="px-4 py-2.5 text-right">{formatNumber(c.delivered)} / {formatNumber(c.recipients)}</td>
                    <td className="px-4 py-2.5 text-right">{formatNumber(c.opens)} <span className="text-xs text-muted">({pct(c.opens, c.delivered)})</span></td>
                    <td className="px-4 py-2.5 text-right">{formatNumber(c.clicks)} <span className="text-xs text-muted">({pct(c.clicks, c.delivered)})</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent messages (last 10)</CardTitle></CardHeader>
        <CardContent>
          {recentMessages.length === 0 ? (
            <p className="text-sm text-muted">No messages sent yet.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {recentMessages.map((m) => (
                <li key={m.id} className="flex items-center justify-between border-t first:border-0 border-border py-1.5">
                  <span className="truncate">→ {m.toEmail} <span className="text-muted">· {m.subject}</span></span>
                  <Badge variant={m.status === "sent" ? "success" : m.status === "failed" ? "danger" : "secondary"}>{m.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
