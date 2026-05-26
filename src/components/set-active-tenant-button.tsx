"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { switchTenantAction } from "@/server/actions/tenants";

export function SetActiveTenantButton({ tenantId, tenantSlug }: { tenantId: string; tenantSlug: string }) {
  const router = useRouter();
  const [isPending, start] = useTransition();
  return (
    <Button
      size="sm"
      disabled={isPending}
      onClick={() => start(async () => {
        await switchTenantAction(tenantId);
        router.push(`/t/${tenantSlug}`);
      })}
    >
      {isPending ? "Opening…" : "Open"}
    </Button>
  );
}
