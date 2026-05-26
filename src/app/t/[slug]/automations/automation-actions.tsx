"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toggleAutomationAction, deleteAutomationAction } from "@/server/actions/automations";

export function ToggleAutomationButton({ automationId, enabled }: { automationId: string; enabled: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button size="sm" variant="outline" disabled={pending}
      onClick={() => start(async () => { await toggleAutomationAction(automationId, !enabled); router.refresh(); })}>
      {enabled ? "Pause" : "Enable"}
    </Button>
  );
}

export function DeleteAutomationButton({ automationId }: { automationId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button size="sm" variant="danger" disabled={pending}
      onClick={() => { if (!confirm("Delete this automation?")) return; start(async () => { await deleteAutomationAction(automationId); router.refresh(); }); }}>
      Delete
    </Button>
  );
}
