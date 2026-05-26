"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { enableABAction, disableABAction, declareVariantWinnerAction } from "@/server/actions/variants";

export function ABControls({ pageId, enabled, variantCount }: { pageId: string; enabled: boolean; variantCount: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-3">
      {enabled ? (
        <Button variant="outline" disabled={pending}
          onClick={() => start(async () => { await disableABAction(pageId); router.refresh(); })}>
          Disable A/B
        </Button>
      ) : (
        <Button disabled={pending}
          onClick={() => start(async () => { await enableABAction(pageId); router.refresh(); })}>
          {variantCount > 0 ? "Re-enable A/B" : "Enable A/B testing"}
        </Button>
      )}
      <p className="text-xs text-muted">
        {enabled ? "Traffic is being split based on cookie hash." : "Page renders normally; no split is active."}
      </p>
    </div>
  );
}

export function DeclareWinnerButton({ variantId, disabled }: { variantId: string; disabled?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button size="sm" variant="outline" disabled={pending || disabled}
      onClick={() => {
        if (!confirm("Promote this variant to the live page and disable A/B? Current page is snapshotted first.")) return;
        start(async () => { await declareVariantWinnerAction(variantId); router.refresh(); });
      }}>
      {pending ? "Promoting…" : "Declare winner"}
    </Button>
  );
}
