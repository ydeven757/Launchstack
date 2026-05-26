import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Stat } from "@/components/ui/stat";
import { prisma } from "@/server/db";
import { SuspendTenantButton, UnsuspendTenantButton } from "./tenant-actions";
import { formatNumber } from "@/lib/utils";

export default async function AdminHome() {
  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      owner: { select: { email: true } },
      _count: { select: { contacts: true, funnels: true, pages: true, campaigns: true } },
    },
  });

  const totals = {
    tenants: tenants.length,
    active: tenants.filter((t) => t.status === "ACTIVE").length,
    suspended: tenants.filter((t) => t.status === "SUSPENDED").length,
    contacts: tenants.reduce((acc, t) => acc + t._count.contacts, 0),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Platform admin</h1>
        <p className="text-sm text-muted">Cross-tenant view. Superadmin only.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Tenants" value={formatNumber(totals.tenants)} />
        <Stat label="Active" value={formatNumber(totals.active)} />
        <Stat label="Suspended" value={formatNumber(totals.suspended)} />
        <Stat label="Total contacts" value={formatNumber(totals.contacts)} />
      </div>

      <Card>
        <CardHeader><CardTitle>All tenants</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted text-left bg-bg/50">
              <tr>
                <th className="font-medium px-4 py-2.5">Name</th>
                <th className="font-medium px-4 py-2.5">Owner</th>
                <th className="font-medium px-4 py-2.5">Plan</th>
                <th className="font-medium px-4 py-2.5">Status</th>
                <th className="font-medium px-4 py-2.5 text-right">Funnels</th>
                <th className="font-medium px-4 py-2.5 text-right">Contacts</th>
                <th className="font-medium px-4 py-2.5 text-right">Campaigns</th>
                <th className="font-medium px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id} className="border-t border-border">
                  <td className="px-4 py-2.5"><span className="font-medium">{t.name}</span> <span className="text-muted">/{t.slug}</span></td>
                  <td className="px-4 py-2.5">{t.owner.email}</td>
                  <td className="px-4 py-2.5"><Badge variant="outline">{t.plan}</Badge></td>
                  <td className="px-4 py-2.5">
                    <Badge variant={t.status === "ACTIVE" ? "success" : t.status === "SUSPENDED" ? "warning" : "secondary"}>{t.status}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-right">{t._count.funnels}</td>
                  <td className="px-4 py-2.5 text-right">{formatNumber(t._count.contacts)}</td>
                  <td className="px-4 py-2.5 text-right">{t._count.campaigns}</td>
                  <td className="px-4 py-2.5 text-right">
                    {t.status === "ACTIVE" ? <SuspendTenantButton tenantId={t.id} /> : t.status === "SUSPENDED" ? <UnsuspendTenantButton tenantId={t.id} /> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
