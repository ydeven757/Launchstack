import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/server/db";

export default async function AuditPage() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      actor: { select: { email: true } },
      tenant: { select: { slug: true, name: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Audit log</h1>
        <p className="text-sm text-muted">Last 200 events across all tenants.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Recent events</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted text-left bg-bg/50">
              <tr>
                <th className="font-medium px-4 py-2.5">When</th>
                <th className="font-medium px-4 py-2.5">Actor</th>
                <th className="font-medium px-4 py-2.5">Tenant</th>
                <th className="font-medium px-4 py-2.5">Action</th>
                <th className="font-medium px-4 py-2.5">Resource</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-t border-border">
                  <td className="px-4 py-2 text-xs text-muted whitespace-nowrap">{new Date(l.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-2">{l.actor?.email ?? "—"}</td>
                  <td className="px-4 py-2">{l.tenant ? <Badge variant="outline">{l.tenant.slug}</Badge> : <Badge variant="warning">platform</Badge>}</td>
                  <td className="px-4 py-2 font-mono text-xs">{l.action}</td>
                  <td className="px-4 py-2 text-xs text-muted">{l.resourceType ?? ""} {l.resourceId ? `· ${l.resourceId.slice(0, 8)}…` : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
