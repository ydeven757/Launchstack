"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { sendCampaignAction, deleteCampaignAction } from "@/server/actions/campaigns";

export function SendCampaignButton({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="flex items-center gap-2">
      {msg && <span className="text-xs text-muted">{msg}</span>}
      <Button
        disabled={pending}
        onClick={() => {
          if (!confirm("Send this campaign now? It will deliver to all matching contacts.")) return;
          start(async () => {
            const r = await sendCampaignAction(campaignId);
            if (r?.error) setMsg(r.error);
            else if (r?.ok) {
              setMsg(`Sent: ${r.delivered} / failed: ${r.failed}`);
              router.refresh();
            }
          });
        }}
      >
        {pending ? "Sending…" : "Send now"}
      </Button>
    </div>
  );
}

export function DeleteCampaignButton({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="danger"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!confirm("Delete this campaign?")) return;
        start(async () => { await deleteCampaignAction(campaignId); router.refresh(); });
      }}
    >
      Delete
    </Button>
  );
}
