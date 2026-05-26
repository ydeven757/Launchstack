import { redirect, notFound } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { ACTIVE_TENANT_COOKIE } from "@/server/tenant";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/top-bar";

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  const { slug } = params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?callbackUrl=${encodeURIComponent(`/t/${slug}`)}`);

  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) notFound();

  const membership = await prisma.membership.findUnique({
    where: { userId_tenantId: { userId: user.id, tenantId: tenant.id } },
  });
  if (!membership && !user.isSuperAdmin) notFound();

  // Make sure the active-tenant cookie matches this slug. Server Components
  // can't write cookies, so we route through /api/tenants/select which sets
  // the cookie on the response and redirects back here.
  const c = cookies();
  if (c.get(ACTIVE_TENANT_COOKIE)?.value !== tenant.id) {
    redirect(`/api/tenants/select?id=${tenant.id}&next=${encodeURIComponent(`/t/${tenant.slug}`)}`);
  }

  const userTenants = await prisma.tenant.findMany({
    where: { status: { not: "ARCHIVED" }, memberships: { some: { userId: user.id } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="min-h-screen flex bg-bg">
      <Sidebar tenantSlug={tenant.slug} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          tenants={userTenants.map((t) => ({ id: t.id, slug: t.slug, name: t.name, brandPrimary: t.brandPrimary }))}
          currentTenantId={tenant.id}
          userName={user.name || user.email}
          isSuperAdmin={user.isSuperAdmin}
        />
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
