import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { requireTenant, tenantDb } from "@/server/tenant";
import { RestoreVersionButton } from "./restore-button";
import { formatDateTime, safeJsonParse } from "@/lib/utils";

export default async function VersionsPage({ params }: { params: { slug: string; pageId: string } }) {
  const { slug, pageId } = params;
  const ctx = await requireTenant();
  const db = tenantDb(ctx.tenant.id);

  const page = await db.page.findFirst({ where: { id: pageId } });
  if (!page) notFound();

  const versions = await db.pageVersion.findMany({
    where: { pageId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/t/${slug}/pages/${pageId}/edit`} className="text-sm text-muted hover:text-fg">← Back to editor</Link>
          <h1 className="text-2xl font-semibold mt-2">Version history — {page.name}</h1>
          <p className="text-sm text-muted">A snapshot is created on every publish. Restore reverts the page to that snapshot as a DRAFT.</p>
        </div>
      </div>

      {versions.length === 0 ? (
        <EmptyState
          title="No published versions yet"
          description="When you publish this page, the published content is snapshotted here automatically."
        />
      ) : (
        <ul className="space-y-2">
          {versions.map((v, i) => {
            const blocks = safeJsonParse<{ type: string }[]>(v.blocksJson, []);
            const isCurrent = i === 0;
            return (
              <Card key={v.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <CardTitle className="text-base">{formatDateTime(v.createdAt)}</CardTitle>
                      {isCurrent && <Badge variant="success">Most recent</Badge>}
                      <Badge variant="outline">{blocks.length} block{blocks.length === 1 ? "" : "s"}</Badge>
                    </div>
                    <RestoreVersionButton versionId={v.id} pageId={pageId} />
                  </div>
                  <CardDescription>
                    {v.seoTitle ? `SEO: "${v.seoTitle}"` : "—"}
                    {v.note ? ` · ${v.note}` : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted hover:text-fg">Show block types</summary>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {blocks.map((b, idx) => <Badge key={idx} variant="outline">{b.type}</Badge>)}
                    </div>
                  </details>
                </CardContent>
              </Card>
            );
          })}
        </ul>
      )}
    </div>
  );
}
