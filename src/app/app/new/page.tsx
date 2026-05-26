import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/server/auth";
import { prisma } from "@/server/db";
import { CreateTenantForm } from "./create-tenant-form";

export default async function NewTenantPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const templates = await prisma.template.findMany({
    where: { isBuiltIn: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <Link href="/app" className="text-sm text-muted hover:text-fg">← Back to workspaces</Link>
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Create a workspace</CardTitle>
            <CardDescription>
              Each workspace is a fully isolated site or brand. Tell us what it&apos;s for, and we&apos;ll seed a starter funnel.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateTenantForm
              templates={templates.map((t) => ({
                id: t.id,
                name: t.name,
                description: t.description,
                niche: t.niche,
                trafficSource: t.trafficSource,
                funnelType: t.funnelType,
              }))}
            />
            <p className="text-xs text-muted mt-6">
              Want to start from scratch? Choose &quot;no template&quot; — you can apply one later from the Templates page.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
