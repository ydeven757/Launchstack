"use client";

import { useState, useTransition } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Sparkles, Check } from "lucide-react";
import { promoteOfferAction } from "@/server/actions/marketplace";

export function PromoteOfferButton({ productId, title }: { productId: string; title: string }) {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ linkSlug: string; funnelId: string | null } | null>(null);
  const [affId, setAffId] = useState("");

  if (success) {
    return (
      <div className="rounded-md border border-success/40 bg-success/5 p-3 space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-success">
          <Check className="h-4 w-4" /> Promoted
        </div>
        <div className="text-xs text-muted">Your /go link: <code>/go/{success.linkSlug}</code></div>
        <div className="flex gap-2">
          {success.funnelId && (
            <Button size="sm" onClick={() => router.push(`/t/${params.slug}/funnels/${success.funnelId}`)}>
              Open funnel
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => router.push(`/t/${params.slug}/offers`)}>
            View offer
          </Button>
        </div>
      </div>
    );
  }

  if (!open) {
    return (
      <Button size="sm" className="w-full" onClick={() => setOpen(true)}>
        <Sparkles className="h-3.5 w-3.5" />Promote into funnel
      </Button>
    );
  }

  return (
    <div className="rounded-md border border-border p-3 space-y-2">
      <Label>Your affiliate / nickname (optional)</Label>
      <Input value={affId} onChange={(e) => setAffId(e.target.value)} placeholder="e.g. your ClickBank nickname" />
      <p className="text-xs text-muted">If blank, we&apos;ll use the placeholder hop URL. You can edit the link in Offers after.</p>
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
        <Button size="sm" disabled={pending}
          onClick={() => {
            setError(null);
            start(async () => {
              const r = await promoteOfferAction({ productId, affiliateId: affId || undefined });
              if ("error" in r && r.error) { setError(r.error); return; }
              if ("ok" in r && r.ok) setSuccess({ linkSlug: r.linkSlug, funnelId: r.funnelId });
            });
          }}>
          {pending ? "Promoting…" : `Promote "${title.slice(0, 18)}…"`}
        </Button>
      </div>
    </div>
  );
}
