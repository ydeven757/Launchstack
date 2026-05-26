import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireTenant, tenantDb } from "@/server/tenant";
import { CampaignComposer } from "./composer";

export default async function NewCampaignPage() {
  const ctx = await requireTenant();
  const db = tenantDb(ctx.tenant.id);
  const tags = await db.tag.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-4">
      <Link href={`/t/${ctx.tenant.slug}/emails`} className="text-sm text-muted hover:text-fg">← Back to campaigns</Link>
      <Card>
        <CardHeader>
          <CardTitle>New broadcast campaign</CardTitle>
          <CardDescription>Compose, segment, and queue for delivery.</CardDescription>
        </CardHeader>
        <CardContent>
          <CampaignComposer
            tenantSlug={ctx.tenant.slug}
            tags={tags.map((t) => ({ id: t.id, name: t.name, color: t.color }))}
            defaultFromName={ctx.tenant.name}
            defaultFromEmail={`hello@${ctx.tenant.slug}.launchstack.app`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
