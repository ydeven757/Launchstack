import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { requireTenant, tenantDb } from "@/server/tenant";
import { createClickBankIntegrationAction } from "@/server/actions/integrations";
import { DeleteIntegrationButton, ToggleIntegrationButton, CopyWebhookButton } from "./actions";
import { safeJsonParse } from "@/lib/utils";

export default async function IntegrationsPage({ params }: { params: { slug: string } }) {
  const ctx = await requireTenant();
  const db = tenantDb(ctx.tenant.id);
  const integrations = await db.integration.findMany({ orderBy: { createdAt: "desc" } });

  const base = `${process.env.APP_PROTOCOL || "http"}://${process.env.APP_BASE_DOMAIN || "localhost:3000"}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/t/${params.slug}/settings`} className="text-sm text-muted hover:text-fg">← Settings</Link>
          <h1 className="text-2xl font-semibold mt-2">Integrations</h1>
          <p className="text-sm text-muted">Connect affiliate networks &amp; ad platforms. Credentials are encrypted at rest (AES-256-GCM).</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add ClickBank</CardTitle>
          <CardDescription>
            Your INS Secret Key is required (Settings → My Account → Account Settings → Notifications → Secret Key inside ClickBank).
            REST API keys are optional but unlock auto-import of products + historical sync.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={async (fd) => { "use server"; await createClickBankIntegrationAction(fd); }} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><Label>Label</Label><Input name="label" defaultValue="ClickBank" /></div>
              <div><Label>INS Secret Key</Label><Input name="insSecretKey" required placeholder="from ClickBank → Notifications" /></div>
              <div><Label>Clerk API Key (optional)</Label><Input name="apiClerkKey" /></div>
              <div><Label>Developer Key (optional)</Label><Input name="apiDeveloperKey" /></div>
            </div>
            <Button type="submit">Connect ClickBank</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Connected integrations</CardTitle></CardHeader>
        <CardContent>
          {integrations.length === 0 ? (
            <EmptyState title="No integrations yet" description="Add ClickBank above to start receiving sale notifications." />
          ) : (
            <ul className="divide-y divide-border">
              {integrations.map((it) => {
                const cfg = safeJsonParse<{ webhookId?: string }>(it.config, {});
                const webhookUrl = `${base}/api/webhooks/clickbank/${ctx.tenant.id}`;
                return (
                  <li key={it.id} className="py-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{it.label || it.type}</span>
                      <Badge variant="outline">{it.type}</Badge>
                      <Badge variant={it.status === "ACTIVE" ? "success" : it.status === "ERROR" ? "danger" : "secondary"}>{it.status}</Badge>
                      {it.lastEventAt && <span className="text-xs text-muted">last event: {new Date(it.lastEventAt).toLocaleString()}</span>}
                    </div>
                    {it.lastError && <p className="text-xs text-danger">Last error: {it.lastError}</p>}
                    {it.type === "clickbank" && (
                      <div className="rounded-md bg-bg/60 border border-border p-3 text-xs space-y-1">
                        <div className="font-medium">Webhook URL (paste this in ClickBank → Account Settings → Notifications):</div>
                        <code className="block p-2 bg-bg rounded text-fg break-all select-all">{webhookUrl}</code>
                        <CopyWebhookButton url={webhookUrl} />
                        <p className="text-muted mt-1">Webhook ID: <code>{cfg.webhookId}</code></p>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <ToggleIntegrationButton integrationId={it.id} enabled={it.status === "ACTIVE"} />
                      <DeleteIntegrationButton integrationId={it.id} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
          <CardDescription>The same pattern wires up: Digistore24, Meta CAPI, Google Ads Enhanced Conversions, TikTok Events API.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted">
          Adapter stubs already live in <code>src/server/integrations/</code>. Wire each by adding credentials UI + webhook receiver (~3-4 hours per network).
        </CardContent>
      </Card>
    </div>
  );
}
