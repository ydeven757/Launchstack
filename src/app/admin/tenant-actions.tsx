"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { suspendTenantAction, unsuspendTenantAction } from "@/server/actions/admin";

export function SuspendTenantButton({ tenantId }: { tenantId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button size="sm" variant="outline" disabled={pending}
      onClick={() => { if (!confirm("Suspend this tenant? Public pages will 503 and dashboard goes read-only.")) return; start(async () => { await suspendTenantAction(tenantId); router.refresh(); }); }}>
      Suspend
    </Button>
  );
}

export function UnsuspendTenantButton({ tenantId }: { tenantId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button size="sm" disabled={pending}
      onClick={() => start(async () => { await unsuspendTenantAction(tenantId); router.refresh(); })}>
      Unsuspend
    </Button>
  );
}
