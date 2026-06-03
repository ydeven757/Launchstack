import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTenant, tenantDb } from "@/server/tenant";
import { PageEditor } from "@/components/builder/page-editor";
import { safeJsonParse } from "@/lib/utils";

export default async function EditPagePage({ params }: { params: { slug: string; pageId: string } }) {
  const { slug, pageId } = params;
  const ctx = await requireTenant();
  const db = tenantDb(ctx.tenant.id);
  const page = await db.page.findFirst({ where: { id: pageId } });
  if (!page) notFound();

  const blocks = safeJsonParse<{ id: string; type: string; props?: Record<string, unknown> }[]>(page.blocksJson, []);
  const backHref = page.funnelId ? `/t/${slug}/funnels/${page.funnelId}` : `/t/${slug}/funnels`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href={backHref} className="text-sm text-muted hover:text-fg">← Back</Link>
        <div className="flex items-center gap-3 text-sm">
          <Link href={`/t/${slug}/pages/${page.id}/versions`} className="text-muted hover:text-fg">Versions</Link>
          <Link href={`/t/${slug}/pages/${page.id}/ab`} className="text-muted hover:text-fg">A/B test{page.abEnabled ? " (ON)" : ""}</Link>
          <a href={`/p/${ctx.tenant.slug}/${page.slug}`} target="_blank" rel="noopener noreferrer" className="text-muted hover:text-fg">
            Open public URL ↗
          </a>
        </div>
      </div>
      <PageEditor
        pageId={page.id}
        initialName={page.name}
        initialSlug={page.slug}
        initialType={page.type}
        initialState={(page.state === "PUBLISHED" ? "PUBLISHED" : "DRAFT") as "DRAFT" | "PUBLISHED"}
        initialBlocks={blocks}
        initialSeoTitle={page.seoTitle}
        initialSeoDescription={page.seoDescription}
        tenantSlug={ctx.tenant.slug}
        brandPrimary={ctx.tenant.brandPrimary}
      />
    </div>
  );
}
