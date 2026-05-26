"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteIntegrationAction, toggleIntegrationAction } from "@/server/actions/integrations";

export function DeleteIntegrationButton({ integrationId }: { integrationId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button size="sm" variant="danger" disabled={pending}
      onClick={() => { if (!confirm("Disconnect this integration? Stored credentials will be deleted.")) return; start(async () => { await deleteIntegrationAction(integrationId); router.refresh(); }); }}>
      Disconnect
    </Button>
  );
}

export function ToggleIntegrationButton({ integrationId, enabled }: { integrationId: string; enabled: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button size="sm" variant="outline" disabled={pending}
      onClick={() => start(async () => { await toggleIntegrationAction(integrationId, !enabled); router.refresh(); })}>
      {enabled ? "Disable" : "Enable"}
    </Button>
  );
}

export function CopyWebhookButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button size="sm" variant="ghost" type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch { /* noop */ }
      }}>
      {copied ? "Copied!" : "Copy"}
    </Button>
  );
}
