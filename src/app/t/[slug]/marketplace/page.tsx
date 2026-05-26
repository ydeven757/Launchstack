import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { prisma } from "@/server/db";
import { requireTenant } from "@/server/tenant";
import { PromoteOfferButton } from "./promote-button";
import { formatNumber, safeJsonParse } from "@/lib/utils";

type SearchParams = { niche?: string; q?: string };

export default async function MarketplacePage({ searchParams }: { searchParams: SearchParams }) {
  const ctx = await requireTenant();

  const products = await prisma.marketplaceProduct.findMany({
    where: {
      active: true,
      ...(searchParams.niche ? { niche: searchParams.niche } : {}),
      ...(searchParams.q
        ? { OR: [
            { title: { contains: searchParams.q } },
            { description: { contains: searchParams.q } },
          ] }
        : {}),
    },
    orderBy: [{ gravity: "desc" }, { syncedAt: "desc" }],
    take: 50,
  });

  const niches = Array.from(new Set(products.map((p) => p.niche).filter(Boolean))) as string[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Marketplace</h1>
        <p className="text-sm text-muted">
          {products.length > 0
            ? `${products.length} curated offers across ${niches.length} niche${niches.length === 1 ? "" : "s"}.`
            : "No offers in the catalog yet — superadmins can sync from /admin."}
        </p>
        <p className="text-xs text-muted mt-1">
          Each &quot;Promote&quot; click creates: an Offer + a cloaked <code>/go/</code> link + a matching funnel template wired to the link. Takes ~3 seconds.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter</CardTitle>
          <CardDescription>Browse by niche, or search title/description.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-wrap gap-2 items-end" method="get">
            <div className="flex-1 min-w-[200px]">
              <Input name="q" defaultValue={searchParams.q ?? ""} placeholder="Search…" />
            </div>
            <select name="niche" defaultValue={searchParams.niche ?? ""} className="h-9 rounded-md border border-border bg-card px-2 text-sm">
              <option value="">All niches</option>
              {niches.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <button type="submit" className="h-9 rounded-md bg-primary text-primary-fg px-4 text-sm font-medium">Filter</button>
          </form>
        </CardContent>
      </Card>

      {products.length === 0 ? (
        <EmptyState
          title="No offers in the catalog yet"
          description="A superadmin can seed the curated catalog from the admin panel."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {products.map((p) => {
            const tags = safeJsonParse<string[]>(p.tags, []);
            return (
              <Card key={p.id}>
                <CardHeader>
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant="outline">{p.network}</Badge>
                    {p.gravity && <Badge variant="secondary">Gravity {Math.round(p.gravity)}</Badge>}
                  </div>
                  <CardTitle className="text-base">{p.title}</CardTitle>
                  <CardDescription className="line-clamp-2">{p.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-xs grid grid-cols-2 gap-y-1">
                    <span className="text-muted">Niche</span><span>{p.niche}</span>
                    <span className="text-muted">Avg payout</span><span>{p.currency} {p.avgPayout?.toFixed(2) ?? "—"}</span>
                    <span className="text-muted">Initial</span><span>{p.currency} {p.initialPayout?.toFixed(2) ?? "—"}</span>
                    <span className="text-muted">Rebill</span><span>{p.rebillPayout ? `${p.currency} ${p.rebillPayout.toFixed(2)}` : "—"}</span>
                    <span className="text-muted">Commission</span><span>{p.commission ? `${p.commission}%` : "—"}</span>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {tags.map((t) => <Badge key={t} variant="outline">{t}</Badge>)}
                    </div>
                  )}
                  <PromoteOfferButton productId={p.id} title={p.title} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
