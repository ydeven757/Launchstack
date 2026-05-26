"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { publishFunnelAction, deleteFunnelAction } from "@/server/actions/funnels";

export function PublishFunnelButton({ funnelId }: { funnelId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() => start(async () => { await publishFunnelAction(funnelId); router.refresh(); })}
    >
      {pending ? "Publishing…" : "Publish funnel"}
    </Button>
  );
}

export function DeleteFunnelButton({ funnelId }: { funnelId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="danger"
      disabled={pending}
      onClick={() => {
        if (!confirm("Delete this funnel and all its pages? This cannot be undone.")) return;
        start(async () => { await deleteFunnelAction(funnelId); });
      }}
    >
      Delete
    </Button>
  );
}
