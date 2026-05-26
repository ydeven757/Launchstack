import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { requireTenant, tenantDb } from "@/server/tenant";
import { createOfferAction, createAffiliateLinkAction } from "@/server/actions/offers";
import { formatNumber } from "@/lib/utils";

export default async function OffersPage() {
  const ctx = await requireTenant();
  const db = tenantDb(ctx.tenant.id);

  const offers = await db.offer.findMany({
    orderBy: { createdAt: "desc" },
    include: { links: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Offers &amp; affiliate links</h1>
        <p className="text-sm text-muted">Track offers across any network. Cloak links via <code>/go/&lt;slug&gt;</code>.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>New offer</CardTitle><CardDescription>An offer you promote — direct or via any affiliate network.</CardDescription></CardHeader>
          <CardContent>
            <form action={async (fd) => { "use server"; await createOfferAction(fd); }} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2"><Label>Offer name</Label><Input name="name" required /></div>
                <div><Label>Network</Label><Input name="network" placeholder="ClickBank / Direct / …" /></div>
                <div><Label>Payout</Label><Input name="payout" type="number" step="0.01" /></div>
                <div>
                  <Label>Currency</Label>
                  <Select name="currency" defaultValue="USD">
                    <option>USD</option><option>EUR</option><option>GBP</option><option>CAD</option><option>AUD</option>
                  </Select>
                </div>
                <div className="col-span-2"><Label>Landing URL</Label><Input name="landingUrl" type="url" required placeholder="https://offer.example.com?aff=abc" /></div>
                <div className="col-span-2"><Label>Notes</Label><Textarea name="notes" rows={2} /></div>
              </div>
              <Button type="submit">Add offer</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>New affiliate link</CardTitle><CardDescription>Creates a <code>/go/&lt;slug&gt;</code> redirect with UTM params.</CardDescription></CardHeader>
          <CardContent>
            <form action={async (fd) => { "use server"; await createAffiliateLinkAction(fd); }} className="space-y-3">
              <div>
                <Label>Offer</Label>
                <Select name="offerId" required>
                  {offers.length === 0 && <option value="">No offers yet</option>}
                  {offers.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </Select>
              </div>
              <div><Label>Slug</Label><Input name="slug" required placeholder="my-favorite" pattern="[a-z0-9-]+" /></div>
              <div className="grid grid-cols-3 gap-2">
                <div><Label>utm_source</Label><Input name="utmSource" placeholder="email" /></div>
                <div><Label>utm_medium</Label><Input name="utmMedium" placeholder="newsletter" /></div>
                <div><Label>utm_campaign</Label><Input name="utmCampaign" placeholder="dec-promo" /></div>
              </div>
              <Button type="submit">Create link</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>All offers</CardTitle></CardHeader>
        <CardContent>
          {offers.length === 0 ? (
            <EmptyState title="No offers yet" description="Add your first offer above." />
          ) : (
            <ul className="divide-y divide-border">
              {offers.map((o) => (
                <li key={o.id} className="py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{o.name}</span>
                    {o.network && <Badge variant="outline">{o.network}</Badge>}
                    {o.payout && <span className="text-xs text-muted">{o.currency} {o.payout}</span>}
                  </div>
                  <div className="text-xs text-muted truncate mt-1">{o.landingUrl}</div>
                  {o.links.length > 0 && (
                    <ul className="mt-2 space-y-0.5">
                      {o.links.map((l) => (
                        <li key={l.id} className="text-xs flex items-center gap-2">
                          <code>/go/{l.slug}</code>
                          <span className="text-muted">→ {l.target}</span>
                          <span className="ml-auto text-muted">{formatNumber(l.clicks)} clicks</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
