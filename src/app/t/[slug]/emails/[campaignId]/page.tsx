import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Stat } from "@/components/ui/stat";
import { requireTenant, tenantDb } from "@/server/tenant";
import { SendCampaignButton, DeleteCampaignButton } from "./actions";
import { formatNumber, pct, safeJsonParse } from "@/lib/utils";

export default async function CampaignDetail({ params }: { params: { slug: string; campaignId: string } }) {
  const { slug, campaignId } = params;
  const ctx = await requireTenant();
  const db = tenantDb(ctx.tenant.id);
  const campaign = await db.campaign.findFirst({ where: { id: campaignId } });
  if (!campaign) notFound();

  const segmentTagIds = safeJsonParse<string[]>(campaign.segmentTagIds, []);
  const tags = segmentTagIds.length > 0
    ? await db.tag.findMany({ where: { id: { in: segmentTagIds } } })
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/t/${slug}/emails`} className="text-sm text-muted hover:text-fg">← Back</Link>
          <h1 className="text-2xl font-semibold mt-2">{campaign.name}</h1>
          <p className="text-sm text-muted mt-1">{campaign.subject}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={campaign.status === "SENT" ? "success" : campaign.status === "FAILED" ? "danger" : "secondary"}>{campaign.status}</Badge>
          {campaign.status === "DRAFT" && <SendCampaignButton campaignId={campaignId} />}
          <DeleteCampaignButton campaignId={campaignId} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Recipients" value={formatNumber(campaign.recipients)} />
        <Stat label="Delivered" value={formatNumber(campaign.delivered)} hint={pct(campaign.delivered, campaign.recipients)} />
        <Stat label="Opens" value={formatNumber(campaign.opens)} hint={pct(campaign.opens, campaign.delivered)} />
        <Stat label="Clicks" value={formatNumber(campaign.clicks)} hint={pct(campaign.clicks, campaign.delivered)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>From</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex justify-between"><span className="text-muted">From name</span><span>{campaign.fromName}</span></div>
            <div className="flex justify-between"><span className="text-muted">From email</span><span>{campaign.fromEmail}</span></div>
            {campaign.sentAt && <div className="flex justify-between"><span className="text-muted">Sent at</span><span>{new Date(campaign.sentAt).toLocaleString()}</span></div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Segment</CardTitle></CardHeader>
          <CardContent className="text-sm">
            {tags.length === 0 ? (
              <p className="text-muted">All contacts (LEAD / ENGAGED / CUSTOMER).</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <Badge key={t.id} style={{ background: `${t.color}22`, borderColor: `${t.color}44`, color: t.color }} variant="outline">{t.name}</Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Body preview</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded-md border border-border bg-bg p-4 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: campaign.bodyHtml }} />
        </CardContent>
      </Card>
    </div>
  );
}
