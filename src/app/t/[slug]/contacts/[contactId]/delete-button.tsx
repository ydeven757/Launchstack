"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";

export function DeleteContactButton({ action }: { action: () => Promise<void> }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="danger"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!confirm("Delete this contact? Activity and tag assignments will also be removed.")) return;
        start(async () => { await action(); });
      }}
    >
      {pending ? "Deleting…" : "Delete contact"}
    </Button>
  );
}
