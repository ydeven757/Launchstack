"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { verifyDomainAction, deleteDomainAction } from "@/server/actions/domains";

export function VerifyDomainButton({ domainId }: { domainId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button size="sm" variant="outline" disabled={pending}
      onClick={() => start(async () => { await verifyDomainAction(domainId); router.refresh(); })}>
      {pending ? "Verifying…" : "Verify"}
    </Button>
  );
}

export function DeleteDomainButton({ domainId }: { domainId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button size="sm" variant="danger" disabled={pending}
      onClick={() => { if (!confirm("Remove this domain?")) return; start(async () => { await deleteDomainAction(domainId); router.refresh(); }); }}>
      Remove
    </Button>
  );
}
